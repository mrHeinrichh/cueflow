const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const entryFile = path.join(__dirname, '../dist/index.html');
const entryUrl = pathToFileURL(entryFile);
const allowedExternalHosts = new Set(['github.com']);
let mainWindow;

app.setName('CueFlow');
app.enableSandbox();

function isAppDocument(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === entryUrl.protocol && url.host === entryUrl.host && url.pathname === entryUrl.pathname;
  } catch {
    return false;
  }
}

function openApprovedExternal(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port && allowedExternalHosts.has(url.hostname)) {
      void shell.openExternal(url.href).catch(() => {});
    }
  } catch {
    // Ignore malformed URLs from renderer content.
  }
}

function requireTrustedSender(event) {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window || window !== mainWindow || event.senderFrame !== event.sender.mainFrame || !isAppDocument(event.senderFrame.url)) {
    throw new Error('Untrusted IPC sender');
  }
  return window;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: 'CueFlow',
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#101416',
    show: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      spellcheck: true,
    },
  });

  const contents = mainWindow.webContents;
  contents.setWindowOpenHandler(({ url }) => {
    openApprovedExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (!isAppDocument(url)) {
      event.preventDefault();
      openApprovedExternal(url);
    }
  });
  contents.on('will-redirect', (event) => event.preventDefault());
  contents.on('will-attach-webview', (event) => event.preventDefault());

  const allowedPermissions = new Set(['fullscreen', 'prevent-display-sleep']);
  contents.session.setPermissionRequestHandler((requestContents, permission, callback) => {
    callback(requestContents === contents && isAppDocument(requestContents.getURL()) && allowedPermissions.has(permission));
  });
  contents.session.setPermissionCheckHandler((requestContents, permission) => {
    return requestContents === contents && isAppDocument(requestContents.getURL()) && allowedPermissions.has(permission);
  });

  mainWindow.on('enter-full-screen', () => contents.send('cueflow:fullscreen-changed', true));
  mainWindow.on('leave-full-screen', () => contents.send('cueflow:fullscreen-changed', false));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  void mainWindow.loadFile(entryFile, { hash: '/studio' });
}

function installMenu() {
  const template = [
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : []),
      ],
    },
    { role: 'windowMenu' },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ipcMain.handle('cueflow:set-fullscreen', (event, enabled) => {
      const window = requireTrustedSender(event);
      if (typeof enabled !== 'boolean') throw new TypeError('Fullscreen value must be a boolean');
      window.setFullScreen(enabled);
      return enabled;
    });
    ipcMain.handle('cueflow:get-fullscreen', (event) => requireTrustedSender(event).isFullScreen());
    installMenu();
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
