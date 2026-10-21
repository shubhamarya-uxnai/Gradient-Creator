# Gradient Creator

Animated gradient loops with glass, dot and halftone effects, exported as GIFs by gifski, the best GIF encoder around. Everything runs on your own device and nothing is uploaded.

## Use it online

**https://shubhamarya-uxnai.github.io/Gradient-Creator/**

Works in any modern browser with nothing to install: **Export GIF (gifski in browser)** runs gifski right in the page. For the smallest files, connect gifski on your Mac: see [Use gifski from the online studio](#use-gifski-from-the-online-studio).

## Use it in Framer

The studio can live on a Framer page while everything still comes from this repo. `framer/GradientCreator.tsx` loads the compiled React app and its shared BA design-system components from one immutable GitHub release through jsDelivr.

1. In Framer, add a new code file named `GradientCreator` and paste in `framer/GradientCreator.tsx`.
2. Put the component on a page, for example `/gradient-creator`, and make it fill the page.
3. Set it up in the right-hand panel:
   - **Release:** set this to `v1.7.0` to use the React rebuild, or a later published tag.
   - **Dark mode:** adds the `dark` class, shadcn's switch for dark values.
   - **Mode switches:** any other `class` or `data-` attributes your design system switches on, for example `data-contrast="high"`.
4. Publish.

The React app imports BA components through `react-app/src/ui/components.tsx`. Product controls use semantic props; that file maps those props to the current BA implementation and is the one place to switch a local select to a future BA Dropdown.

The build bundles BA's React component code, component styles, tokens and the app together. A Framer instance needs only its **Release** field changed; it does not load a second design-system stylesheet.

**Updating.** Publish a new release on GitHub (a new tag), then put its tag in **Release**. A release never changes once published, so nothing reaches your page until you choose it.

**gifski on your Mac** works from the Framer page too: the helper trusts `https://bunnyarya.framer.website`.

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
| `index.html` | Compiled React entry page served by GitHub Pages and Framer |
| `react-app/src/` | React application, feature controls and design-system adapter |
| `react-app/src/engine/legacy-engine.js` | Generated gradient and export engine extracted from the preserved legacy source |
| `legacy.html` | Previous single-file implementation, retained as the engine source and migration reference |
| `styles.css` | Existing studio layout and theme tokens used by the React app |
| `type.css` | Type scale and local font faces used by the React app |
| `fonts/` | Instrument Sans, one variable file per subset, self-hosted so the studio still has its type with no network. SIL Open Font Licence, text in `fonts/OFL.txt` |
| `start.py` | The one command: gifski setup, local server, browser |
| `framer/GradientCreator.tsx` | The Framer code component that loads the studio from GitHub |
| `vendor/` | gifski for the browser (gifski-wasm 2.2.0) |
| `bin/` | gifski for the Mac, created on the first run and kept out of git |
| `LICENSE` | AGPL-3.0 |

To develop the React app, install dependencies in `react-app` and make the BA design-system checkout available at `../../../va-design-system` (or set `BA_DESIGN_SYSTEM_DIR`). Then run `npm run dev` from `react-app`. `npm run build` typechecks, regenerates the engine module from `legacy.html`, and writes the static release files to the repository root. The local server switches browser caching off, so changes show on reload.

## Settings

The gear at the top right opens a panel with two tabs.

- **Appearance** holds the design system's switches: theme, contrast, colour temperature, text size and screen size. The choice is remembered and restored before the page paints, so it never flashes the old look.
- **Updates** is the release log. The newest release carries a **Live** tag, worked out on its own from the list, and the row above it is what is being built next, tagged **Coming soon**.

The Updates tab describes the current React release. Keep its displayed version in step with the Framer Release field when publishing a later release.

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
- The text is set in Instrument Sans by the Instrument Sans project authors, under the SIL Open Font Licence, with headings in Georgia. The font files are copied into `fonts/` rather than loaded from Google, so nothing about a visitor reaches a third party.
- The icons are Phosphor by Tobias Fried, regular weight, used under the MIT licence. They are copied into `index.html` as path data rather than loaded from a CDN, so they still draw with no network.
- gifski is made by Kornel Lesiński (gif.ski) and licensed AGPL-3.0. The Mac version is fetched from its official release on the first run, not stored in this repository. The browser version in `vendor/` is gifski-wasm by jamsinclair, also AGPL-3.0.
