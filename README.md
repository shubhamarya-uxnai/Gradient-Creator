# Gradient Creator

Animated gradient loops with glass, dot and halftone effects, exported as light, high quality GIFs. Everything runs in your browser and nothing is uploaded.

## Use it online

**https://shubhamarya-uxnai.github.io/Gradient-Creator/**

Works in any modern browser with nothing to install. For *Export best GIF*, which uses gifski, connect it to your Mac: see [Use gifski from the online studio](#use-gifski-from-the-online-studio).

## Run it on your Mac

```bash
python3 start.py
```

That one command:

1. **Sets up gifski on the first run.** gifski is the encoder behind *Export best GIF*. It is downloaded from its official release on github.com/ImageOptim/gifski (14.7 MB), checked against a pinned SHA-256 fingerprint and kept in `bin/`.
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

From then on, the online studio shows **Export best GIF (gifski)** whenever the helper is running. Your frames go from the browser straight to your Mac, and nothing is uploaded. The helper only answers this page and the local copy, and refuses every other website. It looks for the helper on port 5600.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The studio: layout and all behaviour |
| `styles.css` | The whole look. Colours, surfaces and lines are tokens at the top, in `:root` |
| `start.py` | The one command: gifski setup, local server, browser |
| `bin/` | gifski, created on the first run and kept out of git |

To restyle, edit `styles.css` and reload the page. The local server switches browser caching off, so every change shows on the next reload.

## Exporting

- **Export best GIF**: one click, encoded by gifski on this Mac. It picks the highest quality that fits your *File size* target.
- **Export GIF (built in)**: needs nothing extra, and works even when `index.html` is opened on its own.
- **PNG still**, **WebM video** and **PNG frames (zip)** for other tools.

What makes a GIF lighter, measured on this studio's loops:

- **Fewer frames first.** Every frame costs about the same, so frame rate times duration is the biggest lever.
- **Lower the File size target.** On the 600 px loop we tested, gifski stayed clean at about 40% below the built-in encoder's size. Below that, fine specks started to show.
- **Use WebM where video is allowed.** It came out 10 to 30 times lighter than the same loop as a GIF, with no banding.

## Notes

- The server listens on 127.0.0.1 only and serves nothing but the studio's own files.
- gifski is made by Kornel Lesiński and licensed AGPL-3.0. Its licence is saved next to it in `bin/`. It is fetched from the official release, not stored in this repository.
