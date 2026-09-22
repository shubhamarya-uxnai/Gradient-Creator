# Gradient Creator

Animated gradient loops with glass, dot and halftone effects, exported as GIFs by gifski, the best GIF encoder around. Everything runs on your own device and nothing is uploaded.

## Use it online

**https://shubhamarya-uxnai.github.io/Gradient-Creator/**

Works in any modern browser with nothing to install: **Export GIF (gifski in browser)** runs gifski right in the page. For the smallest files, connect gifski on your Mac: see [Use gifski from the online studio](#use-gifski-from-the-online-studio).

## Run it on your Mac

```bash
python3 start.py
```

That one command:

1. **Sets up gifski on the first run.** This is the Mac version of gifski, behind *Export best GIF*. It is downloaded from its official release on github.com/ImageOptim/gifski (14.7 MB), checked against a pinned SHA-256 fingerprint and kept in `bin/`.
2. **Starts the studio** on this Mac at http://localhost:5600.
3. **Opens it** in your default browser.

Keep the Terminal window open while you work, and press Ctrl+C to stop. Running the command again while the studio is already running just opens it.

Options: `--online` to open the online studio instead of the local copy, `--port 5601` to use another port, `--no-open` to skip opening the browser.

Needs macOS with Python 3. Pillow is optional.

## Use gifski from the online studio

The online studio can use gifski on your own Mac, so the link gives you the lightest GIFs too.

1. **Get the helper.** In the online studio's Export panel, click **Download for Mac (.zip)**, or download this repository as a zip, and unzip it.
2. **Start it.** In Terminal, run the line below and keep the window open. The first run sets up gifski and opens the online studio. If your Mac has never used Python, macOS offers to install it first.

   ```bash
   cd ~/Downloads/Gradient-Creator-main && python3 start.py --online
   ```

3. **Connect.** In the Export panel, click **Use gifski on this Mac**. The first time, your browser asks whether the site may reach apps on this device. Allow it.

The same download also runs the whole studio offline on your Mac: `python3 start.py` opens it at http://localhost:5600.

From then on, the online studio shows **Export best GIF (gifski on your Mac)** whenever the helper is running. Your frames go from the browser straight to your Mac, and nothing is uploaded. The helper only answers this page and the local copy, and refuses every other website. It looks for the helper on port 5600.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The studio: layout and all behaviour |
| `styles.css` | The whole look. Colours, surfaces and lines are tokens at the top, in `:root` |
| `start.py` | The one command: gifski setup, local server, browser |
| `vendor/` | gifski for the browser (gifski-wasm 2.2.0) |
| `bin/` | gifski for the Mac, created on the first run and kept out of git |
| `LICENSE` | AGPL-3.0 |

To restyle, edit `styles.css` and reload the page. The local server switches browser caching off, so every change shows on the next reload.

## Exporting

Every export aims for the smallest file at top quality. There is no size target to set.

- **Export best GIF (gifski on your Mac)**: through the helper. The smallest file at top quality.
- **Export GIF (gifski in browser)**: nothing to install. Just as clean, but about 1.5 times the size of the Mac version on the loops we tested, because the browser build of gifski has no lossy compression step.
- **PNG still**, **WebM video** and **PNG frames (zip)** for other tools.

The **Estimate** panel shows the expected size and time for both, worked out by running gifski on an eight frame sample of your loop. Sizes landed within 10% of the real files in testing. Times are rougher, so treat them as a guide.

What makes a GIF lighter:

- **Fewer frames first.** Every frame costs about the same, so frame rate times loop length is the biggest lever.
- **Use WebM where video is allowed.** It came out 10 to 30 times lighter than the same loop as a GIF, with no banding.

## Notes

- The server listens on 127.0.0.1 only and serves nothing but the studio's own files.
- Gradient Creator is open source under the AGPL-3.0 licence (see `LICENSE`), because it ships gifski's browser build.
- gifski is made by Kornel Lesiński (gif.ski) and licensed AGPL-3.0. The Mac version is fetched from its official release on the first run, not stored in this repository. The browser version in `vendor/` is gifski-wasm by jamsinclair, also AGPL-3.0.
