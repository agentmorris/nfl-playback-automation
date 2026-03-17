# NFL Playback Position Saver

A Chrome extension that remembers your playback position for NFL+ game replays. NFL+ does not natively save your position when watching replays, so this extension fills that gap.

## What it does

- Automatically detects when you're watching a game on `nfl.com/plus/games/*`
- Saves your playback position every 5 seconds, on pause, and before the page closes
- When you return to the same game, it restores your position automatically
- All data is stored locally in your browser (nothing is sent anywhere)

Click the extension icon to see all your saved games, their positions, and links to resume watching.

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing this repository

The extension is now active. Navigate to any NFL+ game replay and your position will be saved automatically.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Chrome extension manifest (Manifest V3) |
| `content.js` | Content script that saves/restores video position |
| `popup.html` | Extension popup UI |
| `popup.js` | Popup logic — lists saved games with positions |

## Publishing to the Chrome Web Store

If you want to publish this extension publicly:

### One-time setup

- Create a [Chrome Web Store Developer account](https://chrome.google.com/webstore/devconsole/) using a Google account
- Pay a one-time $5 registration fee

### Prepare assets

- **Icons** — The store requires a 128x128 icon (and ideally 16x16 and 48x48 for the extension toolbar). Add them to the project and update `manifest.json`.
- **Screenshots** — At least one 1280x800 or 640x400 screenshot showing the extension in action
- **Privacy policy** — Since the extension only uses local storage and does not collect or transmit any user data, a simple statement to that effect is sufficient

### Submit

1. Zip the extension folder (excluding `.claude/`, `.playwright-mcp/`, and `.git/`)
2. Upload the zip in the Developer Dashboard
3. Fill out the listing: description, category, screenshots, icons
4. Complete the privacy practices questionnaire (no remote code, no data collection, single purpose: saving playback position)
5. Submit for review

Google typically reviews submissions within 1-3 business days. A simple extension like this should pass without issues. Updates go through the same review process.
