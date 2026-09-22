#!/usr/bin/env python3
"""Gradient Creator: one command to run the studio.

    python3 start.py

1. First run only: sets up gifski, the encoder behind "Export best GIF". It
   downloads the official release from github.com/ImageOptim/gifski, checks it
   against a pinned SHA-256 and keeps it in bin/ next to this file.
2. Starts a small server on this Mac (127.0.0.1 only, nothing is uploaded).
3. Opens the studio in your default browser.

The online studio (GitHub Pages) can use this helper too: open it, click "Use
gifski on this Mac" and allow the browser's prompt. Only that page and the local
copy are let in; every other website is refused.

Options: --online to open the online studio instead of the local copy,
--port 5601 to use another port (the online studio only looks on 5600),
--no-open to skip opening the browser.

The server gives the page a one click GIF endpoint:
  GET  /api/health                      which encoders are installed
  POST /api/gif?fps=&quality=&target=&engine=
                                        body: zip of frame_*.png, returns the GIF
With a target (bytes), the encode starts at the requested quality and steps
down until the file fits, so one click returns the best quality that fits the
size budget. The frames are uploaded once and re-encoded from disk.

Encoders, best first:
  gifski  per-frame palettes and temporal dithering (AGPL, licence in bin/).
          Quality maps to its lossy setting; motion stays at 100.
  pillow  per-frame 256 colour palettes with Floyd-Steinberg dithering
"""
import argparse
import errno
import functools
import hashlib
import http.server
import io
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tarfile
import tempfile
import threading
import time
import urllib.parse
import urllib.request
import webbrowser
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('GIF_STUDIO_PORT', '5600'))
MAX_BODY = 400 * 1024 * 1024
ALLOWED_ORIGINS = set()
ALLOWED_HOSTS = set()
FRAME_NAME = re.compile(r'^frame_\d{3,6}\.png$')
JOB_PREFIX = 'gif-studio-job-'
JOB_LOCK = threading.Lock()
# Only the studio itself is served, never start.py, bin/ or .git.
STATIC = {'/': 'index.html', '/index.html': 'index.html', '/styles.css': 'styles.css'}
OLD_URLS = {'/gradient-gif-studio.html'}   # earlier address, sent on to /
HOSTED_ORIGIN = 'https://shubhamarya-uxnai.github.io'   # the online studio, on GitHub Pages
HOSTED_URL = HOSTED_ORIGIN + '/Gradient-Creator/'

GIFSKI_VERSION = '1.34.0'
GIFSKI_URL = f'https://github.com/ImageOptim/gifski/releases/download/{GIFSKI_VERSION}/gifski-{GIFSKI_VERSION}.tar.xz'
GIFSKI_SHA256 = 'b9b6591aa163123d737353d9c8581efdf3234d28eeaa45329b31da905cd5a996'
GIFSKI_BIN = os.path.join(ROOT, 'bin', 'gifski')


def set_port(port):
    global PORT, ALLOWED_ORIGINS, ALLOWED_HOSTS
    PORT = port
    ALLOWED_HOSTS = {f'localhost:{port}', f'127.0.0.1:{port}'}
    ALLOWED_ORIGINS = {'http://' + h for h in ALLOWED_HOSTS} | {HOSTED_ORIGIN}


def find_gifski():
    candidates = [GIFSKI_BIN, shutil.which('gifski'), '/opt/homebrew/bin/gifski', '/usr/local/bin/gifski']
    for p in candidates:
        if p and os.path.isfile(p) and os.access(p, os.X_OK):
            return p
    return None


def install_gifski():
    """Fetch the official gifski release, verify it and unpack the Mac binary into bin/."""
    if sys.platform != 'darwin':
        print('  gifski: automatic setup is Mac only. Install it from https://gif.ski for the best GIFs.')
        return None
    print(f'  First run: setting up gifski {GIFSKI_VERSION} (14.7 MB from github.com/ImageOptim/gifski)...', flush=True)
    tmp = tempfile.mkdtemp(prefix='gifski-setup-')
    try:
        archive = os.path.join(tmp, 'gifski.tar.xz')
        if shutil.which('curl'):   # curl uses the Mac's own certificates
            subprocess.run(['curl', '-fsSL', '--max-time', '300', '-o', archive, GIFSKI_URL], check=True)
        else:
            urllib.request.urlretrieve(GIFSKI_URL, archive)
        with open(archive, 'rb') as f:
            digest = hashlib.sha256(f.read()).hexdigest()
        if digest != GIFSKI_SHA256:
            print('  The download did not match the expected checksum, so it was not installed.')
            return None
        os.makedirs(os.path.dirname(GIFSKI_BIN), exist_ok=True)
        with tarfile.open(archive, 'r:xz') as t:
            for member, dest, mode in (('mac/gifski', GIFSKI_BIN, 0o755),
                                       ('LICENSE', os.path.join(ROOT, 'bin', 'gifski-LICENSE.txt'), 0o644)):
                part = dest + '.part'
                with t.extractfile(member) as src, open(part, 'wb') as out:
                    shutil.copyfileobj(src, out)
                os.chmod(part, mode)
                os.replace(part, dest)
        print('  gifski is ready.')
        return GIFSKI_BIN
    except Exception as e:
        print(f'  Could not set up gifski ({e}). Everything else works, and it will try again next time.')
        return None
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def engines():
    g = find_gifski()
    gv = None
    if g:
        try:
            gv = subprocess.run([g, '--version'], capture_output=True, text=True, timeout=5).stdout.strip()
        except Exception:
            gv = 'unknown'
    try:
        import PIL
        pv = PIL.__version__
    except Exception:
        pv = None
    return {'gifski': {'available': bool(g), 'version': gv},
            'pillow': {'available': bool(pv), 'version': pv}}


def png_size(path):
    with open(path, 'rb') as f:
        head = f.read(24)
    if head[:8] != b'\x89PNG\r\n\x1a\n' or head[12:16] != b'IHDR':
        raise ValueError(f'{os.path.basename(path)} is not a PNG')
    return struct.unpack('>II', head[16:24])


def encode_gifski(binary, frames, out, fps, quality):
    # Without an explicit size gifski halves anything much over 800x600
    # (1000x1000 came out 500x500), so always pass the frame size.
    # Quality steers only the lossy setting. gifski's own --quality also lowers
    # its motion setting, which holds pixels still between frames and leaves
    # blotches and colour smudges on moving gradients, so that stays at 100.
    w, h = png_size(frames[0])
    cmd = [binary, '--fps', f'{fps:g}', '--quality', '100', '--motion-quality', '100',
           '--lossy-quality', str(quality), '--repeat', '0',
           '--width', str(w), '--height', str(h), '-o', out] + frames
    subprocess.run(cmd, check=True, capture_output=True, timeout=900)


def encode_pillow(frames, out, fps, quality):
    from PIL import Image
    colours = max(16, min(256, round(16 + quality / 100 * 240)))
    imgs = [Image.open(f).convert('RGB').quantize(colors=colours, method=Image.Quantize.MEDIANCUT,
                                                  dither=Image.Dither.FLOYDSTEINBERG) for f in frames]
    imgs[0].save(out, save_all=True, append_images=imgs[1:], duration=round(1000 / fps), loop=0)


def new_job_dir():
    """One working folder per encode. Older ones are removed, the latest is kept."""
    tmp = tempfile.gettempdir()
    for name in os.listdir(tmp):
        if name.startswith(JOB_PREFIX):
            shutil.rmtree(os.path.join(tmp, name), ignore_errors=True)
    return tempfile.mkdtemp(prefix=JOB_PREFIX)


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Expires', '0')
        if self.headers.get('Origin') == HOSTED_ORIGIN:   # the online studio calls across origins
            self.send_header('Access-Control-Allow-Origin', HOSTED_ORIGIN)
            self.send_header('Vary', 'Origin')
        super().end_headers()

    def do_OPTIONS(self):
        """Preflight from the online studio. Anything else is refused."""
        path = urllib.parse.urlsplit(self.path).path
        if (self.headers.get('Origin') != HOSTED_ORIGIN or not path.startswith('/api/')
                or self.headers.get('Host') not in ALLOWED_HOSTS):
            return self._json(403, {'error': 'not allowed'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Private-Network', 'true')   # older Chromium preflights
        self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def _json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _route(self):
        """Map the request to a studio file, or answer it here. Returns False when handled."""
        if self.headers.get('Host') not in ALLOWED_HOSTS:
            self._json(403, {'error': 'open the studio at http://localhost:%d' % PORT})
            return False
        path = urllib.parse.urlsplit(self.path).path
        if path == '/api/health':
            self._json(200, {'ok': True, 'engines': engines()})
            return False
        if path in OLD_URLS:
            self.send_response(302)
            self.send_header('Location', '/')
            self.end_headers()
            return False
        if path not in STATIC:
            self.send_error(404)
            return False
        self.path = '/' + STATIC[path]
        return True

    def do_GET(self):
        if self._route():
            super().do_GET()

    def do_HEAD(self):
        if self._route():
            super().do_HEAD()

    def do_POST(self):
        path, _, query = self.path.partition('?')
        if path != '/api/gif':
            return self._json(404, {'error': 'not found'})
        if self.headers.get('Origin') not in ALLOWED_ORIGINS:
            return self._json(403, {'error': 'only the studio page may use this endpoint'})
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > MAX_BODY:
            return self._json(413, {'error': 'frames missing or larger than 400 MB'})
        body = self.rfile.read(length)

        q = urllib.parse.parse_qs(query)
        try:
            fps = min(60.0, max(1.0, float(q.get('fps', ['12.5'])[0])))
            quality = min(100, max(1, int(float(q.get('quality', ['90'])[0]))))
        except ValueError:
            return self._json(400, {'error': 'fps and quality must be numbers'})
        engine = q.get('engine', ['auto'])[0]
        try:
            target = max(0, int(float(q.get('target', ['0'])[0])))
        except ValueError:
            target = 0

        with JOB_LOCK:
            work = new_job_dir()
            try:
                with zipfile.ZipFile(io.BytesIO(body)) as z:
                    names = sorted(n for n in z.namelist() if FRAME_NAME.match(n))
                    if not names:
                        return self._json(400, {'error': 'no frame_NNN.png files in the zip'})
                    if sum(z.getinfo(n).file_size for n in names) > MAX_BODY * 2:
                        return self._json(413, {'error': 'frames too large once unpacked'})
                    frames = []
                    for n in names:
                        p = os.path.join(work, n)
                        with open(p, 'wb') as f:
                            f.write(z.read(n))
                        frames.append(p)
            except zipfile.BadZipFile:
                return self._json(400, {'error': 'body is not a zip'})

            gifski = find_gifski()
            if engine in ('auto', 'gifski') and gifski:
                used, run = 'gifski', lambda o, qual: encode_gifski(gifski, frames, o, fps, qual)
            elif engine in ('auto', 'pillow'):
                used, run = 'pillow', lambda o, qual: encode_pillow(frames, o, fps, qual)
            else:
                return self._json(400, {'error': f'encoder "{engine}" is not installed'})

            # Best quality first. If that is over the target, try the lowest quality
            # once: if even that misses, lowering quality cannot reach the target,
            # so return full quality untouched instead of degrading it for nothing.
            # If the floor fits, binary search for the highest quality that fits.
            QUALITY_FLOOR = 25
            t0 = time.time()
            attempts = 0
            reason = 'fits'

            def attempt(qual):
                nonlocal attempts
                attempts += 1
                out = os.path.join(work, f'out_q{qual}.gif')
                run(out, qual)
                return {'path': out, 'size': os.path.getsize(out), 'quality': qual}

            try:
                best = attempt(quality)
                if target and best['size'] > target:
                    low = attempt(QUALITY_FLOOR) if quality > QUALITY_FLOOR else best
                    if low['size'] > target:
                        reason = 'unreachable'
                    else:
                        lo, hi, best = QUALITY_FLOOR, quality, low
                        while hi - lo > 4 and attempts < 6:
                            mid = (lo + hi) // 2
                            r = attempt(mid)
                            if r['size'] <= target:
                                lo, best = mid, r
                            else:
                                hi = mid
                best['fits'] = not target or best['size'] <= target
            except subprocess.CalledProcessError as e:
                return self._json(500, {'error': 'gifski failed: ' + (e.stderr or b'').decode(errors='replace')[-400:]})
            except Exception as e:
                return self._json(500, {'error': f'{type(e).__name__}: {e}'})

            with open(best['path'], 'rb') as f:
                data = f.read()
            self.send_response(200)
            self.send_header('Content-Type', 'image/gif')
            self.send_header('Content-Length', str(len(data)))
            self.send_header('X-Engine', used)
            self.send_header('X-Frames', str(len(frames)))
            self.send_header('X-Encode-Ms', str(round((time.time() - t0) * 1000)))
            self.send_header('X-Quality', str(best['quality']))
            self.send_header('X-Attempts', str(attempts))
            self.send_header('X-Fits', '1' if best['fits'] else '0')
            self.send_header('X-Reason', reason)
            self.send_header('Access-Control-Expose-Headers', 'X-Engine, X-Frames, X-Encode-Ms, X-Quality, X-Attempts, X-Fits, X-Reason')
            self.end_headers()
            self.wfile.write(data)


def already_running():
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{PORT}/api/health', timeout=3) as r:
            return bool(json.load(r).get('ok'))
    except Exception:
        return False


def main():
    ap = argparse.ArgumentParser(description='Run Gradient Creator: sets up gifski, starts the studio, opens it.')
    ap.add_argument('--port', type=int, default=PORT, help='port to use (default %(default)s)')
    ap.add_argument('--no-open', action='store_true', help='do not open the browser')
    ap.add_argument('--online', action='store_true', help='open the online studio, which uses this helper for gifski')
    args = ap.parse_args()
    set_port(args.port)
    url = f'http://localhost:{PORT}/'
    target = HOSTED_URL if args.online else url

    def show():
        if not args.no_open:
            print(f'  Opening {target}', flush=True)
            webbrowser.open(target)

    handler = functools.partial(Handler, directory=ROOT)
    try:
        server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), handler)
    except OSError as e:
        if e.errno != errno.EADDRINUSE:
            raise
        if already_running():
            print(f'Gradient Creator is already running at {url}')
            show()
            raise SystemExit(0)
        print(f'Port {PORT} is in use by another app. Start the studio on another port with:\n'
              f'  python3 "{os.path.abspath(__file__)}" --port {PORT + 1}')
        raise SystemExit(1)

    print('Gradient Creator', flush=True)
    if not find_gifski():
        install_gifski()
    e = engines()
    if e['gifski']['available']:
        enc = f"{e['gifski']['version']}, for the best GIFs"
    elif e['pillow']['available']:
        enc = f"Pillow {e['pillow']['version']}, run again later to retry setting up gifski"
    else:
        enc = 'built-in only (Export GIF works, Export best GIF needs gifski)'
    online = (f'  Online studio: {HOSTED_URL} (click "Use gifski on this Mac" once)'
              if PORT == 5600 else '  The online studio only looks for the helper on port 5600.')
    print(f'  Running at {url}\n{online}\n  Encoder: {enc}\n'
          f'  Keep this window open while you work. Press Ctrl+C to stop.', flush=True)
    show()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nStopped.')


if __name__ == '__main__':
    main()
