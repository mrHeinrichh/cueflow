const { contextBridge, ipcRenderer } = require('electron');

// Expose one narrow capability per operation; never expose ipcRenderer itself.
contextBridge.exposeInMainWorld('cueflowDesktop', Object.freeze({
  platform: process.platform,
  setFullscreen: (enabled) => ipcRenderer.invoke('cueflow:set-fullscreen', Boolean(enabled)),
  getFullscreen: () => ipcRenderer.invoke('cueflow:get-fullscreen'),
  onFullscreenChange: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, enabled) => callback(Boolean(enabled));
    ipcRenderer.on('cueflow:fullscreen-changed', listener);
    return () => ipcRenderer.removeListener('cueflow:fullscreen-changed', listener);
  },
}));
