# CueFlow desktop

The Electron shell loads the built Vite app from `dist/index.html#/studio`, so the desktop editor works without a server. The Vite build must use `base: './'`. The app runs in a sandboxed renderer with context isolation, no Node integration, denied arbitrary navigation, and a small validated fullscreen IPC bridge. Only HTTPS links on `github.com` may open in the default browser. Add an exact trusted hostname in `main.cjs` if the published website needs to open externally.

## Run and package

```sh
npm ci
npm run desktop
npm run dist:mac
npm run dist:win
```

Use macOS to build DMG and ZIP packages. The release workflow builds Apple Silicon on `macos-15`, Intel on `macos-15-intel`, and Windows on `windows-2025`. A `v1.0.0` tag must match version `1.0.0` in `package.json`. Tags trigger all three builds and publish release files plus SHA256 checksums after every platform succeeds. Manual workflow dispatch builds downloadable workflow artifacts without publishing a release.

The packaged icon assets are committed; CI needs no icon-generation dependencies. To regenerate on macOS, run `swift scripts/generate-icons.swift`, then `python3 scripts/package-icons.py`.

The packaged app requires macOS 13 or later (Electron 44), or 64-bit Windows 10/11.

## Distribution status

The initial release is unsigned and unnotarized. The build does not pretend to have an Apple Developer ID or Windows signing certificate. macOS and Windows can warn about or block unsigned downloads. A frictionless public distribution requires owner-provided signing credentials and Apple notarization; add these as encrypted CI secrets and configure electron-builder before claiming the application is signed.

This configuration uses electron-builder **26.x**. Version 27 changes the signing configuration schema. The app stores scripts in Electron's local browser storage; browser and desktop storage are separate. Uninstall does not deliberately delete user data.

## Desktop bridge

`window.cueflowDesktop` exists only inside the desktop app:

```js
await window.cueflowDesktop.setFullscreen(true);
const enabled = await window.cueflowDesktop.getFullscreen();
const unsubscribe = window.cueflowDesktop.onFullscreenChange((enabled) => {
  // Keep a fullscreen button in sync with native menu and keyboard actions.
});
```

The `platform` property is `darwin`, `win32`, or the current Node platform. The bridge exposes no filesystem, process execution, generic IPC, or raw Electron objects.

References: [Electron security recommendations](https://www.electronjs.org/docs/latest/tutorial/security), [electron-builder macOS signing](https://www.electron.build/v26/docs/features/code-signing/code-signing-mac/), [GitHub runner architectures](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
