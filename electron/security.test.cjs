const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

async function createShell() {
  const windows = [];
  const handlers = new Map();
  const external = [];
  const app = Object.assign(new EventEmitter(), {
    setName() {}, enableSandbox() {}, requestSingleInstanceLock: () => true,
    whenReady: () => Promise.resolve(), isPackaged: true,
  });
  class BrowserWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.fullscreen = false;
      this.webContents = Object.assign(new EventEmitter(), {
        session: {
          setPermissionRequestHandler: (handler) => { this.requestPermission = handler; },
          setPermissionCheckHandler: (handler) => { this.checkPermission = handler; },
        },
        setWindowOpenHandler: (handler) => { this.openWindow = handler; },
        getURL: () => this.webContents.mainFrame.url,
      });
      windows.push(this);
    }
    loadFile(file, options) {
      this.loadedFile = file;
      this.route = options.hash;
      this.webContents.mainFrame = { url: require('node:url').pathToFileURL(file).href + '#' + options.hash };
      return Promise.resolve();
    }
    setFullScreen(enabled) { this.fullscreen = enabled; }
    isFullScreen() { return this.fullscreen; }
    static fromWebContents(contents) { return windows.find((window) => window.webContents === contents); }
  }
  const electron = {
    app, BrowserWindow,
    Menu: { setApplicationMenu() {}, buildFromTemplate: (template) => template },
    ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) },
    shell: { openExternal: async (url) => { external.push(url); } },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'main.cjs'), 'utf8'), {
    require: (name) => name === 'electron' ? electron : require(name),
    __dirname, process: { platform: 'darwin' }, URL,
  });
  await new Promise((resolve) => setImmediate(resolve));
  return { window: windows[0], handlers, external };
}

test('desktop opens the local studio with an isolated, sandboxed renderer', async () => {
  const { window } = await createShell();
  assert.equal(window.route, '/studio');
  assert.equal(window.loadedFile, path.join(__dirname, '../dist/index.html'));
  for (const preference of ['contextIsolation', 'sandbox', 'webSecurity']) assert.equal(window.options.webPreferences[preference], true);
  for (const preference of ['nodeIntegration', 'allowRunningInsecureContent', 'webviewTag']) assert.equal(window.options.webPreferences[preference], false);
});

test('external links only open HTTPS URLs on the exact GitHub hostname', async () => {
  const { window, external } = await createShell();
  const denied = [
    'javascript:alert(1)', 'file:///etc/passwd', 'http://github.com',
    'https://github.com.attacker.example', 'https://github.com@attacker.example',
    'https://attacker@github.com', 'https://github.com:8443', 'not a url',
  ];
  for (const url of denied) assert.equal(window.openWindow({ url }).action, 'deny');
  assert.equal(external.length, 0);
  assert.equal(window.openWindow({ url: 'https://github.com/owner/cueflow/releases' }).action, 'deny');
  assert.deepEqual(external, ['https://github.com/owner/cueflow/releases']);
});

test('navigation and unrelated device permissions are blocked', async () => {
  const { window } = await createShell();
  let prevented = false;
  window.webContents.emit('will-navigate', { preventDefault() { prevented = true; } }, 'https://example.com');
  assert.equal(prevented, true);
  for (const permission of ['media', 'geolocation', 'notifications', 'clipboard-read']) {
    window.requestPermission(window.webContents, permission, (allowed) => assert.equal(allowed, false));
  }
  window.requestPermission(window.webContents, 'fullscreen', (allowed) => assert.equal(allowed, true));
  window.requestPermission({ getURL: () => 'https://example.com' }, 'fullscreen', (allowed) => assert.equal(allowed, false));
});

test('fullscreen IPC requires the known main frame and a boolean', async () => {
  const { window, handlers } = await createShell();
  const setFullscreen = handlers.get('cueflow:set-fullscreen');
  const sender = { sender: window.webContents, senderFrame: window.webContents.mainFrame };
  assert.equal(setFullscreen(sender, true), true);
  assert.equal(window.fullscreen, true);
  assert.throws(() => setFullscreen(sender, 'true'), /boolean/);
  assert.throws(() => setFullscreen({ ...sender, senderFrame: { url: window.webContents.mainFrame.url } }, false), /Untrusted IPC/);
  window.webContents.mainFrame.url = 'https://github.com';
  assert.throws(() => setFullscreen(sender, false), /Untrusted IPC/);
});
