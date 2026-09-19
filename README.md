# CueFlow

A local-first teleprompter for the web, macOS, and Windows. Write your script, find a comfortable pace, and make every take your own.

**[Open the studio](https://cueflow-heinrich.netlify.app)** · **[Download desktop apps](https://github.com/mrHeinrichh/cueflow/releases/latest)**

## Features

- Script library with automatic device-local saving, search, duplication, and deletion
- Plain text and Markdown imports; text export and JSON library backups
- Smooth, timestamp-driven scrolling with pause, restart, progress, and elapsed time
- Adjustable speed, text size, line height, width, countdown, and reading guide
- Horizontal mirror mode, light/dark reading surfaces, and fullscreen
- Keyboard controls, mobile layout, and accessible dialogs
- Offline desktop use with bundled fonts and no script uploads or analytics

Browser and desktop libraries are separate. Export a library backup and import it on another device to move your scripts. Clearing browser data removes locally saved scripts. Keep backups of important work. Backgrounding the window pauses playback.

## Desktop downloads

| Platform | Package |
| --- | --- |
| macOS 12+ Apple Silicon | `CueFlow-1.0.0-mac-arm64.dmg` and ZIP |
| macOS 12+ Intel | `CueFlow-1.0.0-mac-x64.dmg` and ZIP |
| Windows 10+ x64 | `CueFlow-1.0.0-win-x64.exe` |

**Initial builds are unsigned and not notarized.** Operating systems may show publisher/security warnings. Publisher certificates and Apple notarization are not configured. Download only from this repository’s releases; compare against `SHA256SUMS.txt` if needed. The browser app is available without installing a package.

## Develop

Requires Node.js 22.12+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
npm run desktop
```

`npm run preview` serves the production build. Desktop opens the bundled studio at `#/studio`. The Vite base is relative so the same assets run over HTTPS and Electron's local file URL. All fonts are bundled.

## Package and release

```sh
npm run dist:mac
npm run dist:win
```

For reproducible native packages, push a tag matching `package.json` (for example `v1.0.0`). GitHub Actions tests and builds macOS ARM64, macOS x64, and Windows x64 on their native runners, then attaches packages and checksums to a GitHub release. Manual workflow runs build artifacts without publishing a release. See [desktop security and release details](electron/README.md).

## Netlify

The root `netlify.toml` builds `dist/`. Publish from this project with `npx netlify-cli deploy --prod --dir=dist --no-build`. The deployed project is `cueflow-heinrich`. All navigation uses hash routes, so direct links and refreshes work without server routing.

## Keyboard controls

| Key | Action |
| --- | --- |
| Space | Play / pause (outside form fields and focused buttons) |
| ↑ / ↓ | Faster / slower |
| R | Restart |
| M | Mirror |
| F | Fullscreen |
| Esc | Pause / cancel countdown |
| / | Search scripts |
| ? | Show shortcuts |

## Privacy and security

Scripts/settings live in localStorage. There is no account system or backend for scripts. Netlify and GitHub may keep ordinary request logs. Electron uses a sandboxed, isolated renderer with Node integration disabled. Only a narrow sender-validated fullscreen bridge is exposed; external navigation is restricted to HTTPS GitHub links. Website responses set a content security policy and deny embedding.

Optional WebMCP tools are feature-detected in supporting browsers: list local script summaries and open an existing script. Unsupported browsers retain the full visible UI.

MIT licensed.
