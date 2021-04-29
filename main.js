const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron');
const path = require('path');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let tray = undefined;
let win = undefined;

if (app.dock) {
  app.dock.hide();
}

let closeTime = +new Date();

const createTray = () => {
  tray = new Tray(path.join(__dirname, 'jira.png'));
  tray.on('click', function (event) {
    if (+new Date() - closeTime > 200) {
      showWindow();
    }
  });

  const contextMenu = Menu.buildFromTemplate([{ label: 'Exit', type: 'normal', role: 'quit' }]);
  tray.setContextMenu(contextMenu);
};

const getWindowPosition = () => {
  const windowBounds = win.getBounds();
  const trayBounds = tray.getBounds();

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);

  const screenWidth = screen.getPrimaryDisplay().workAreaSize.width;
  const screenHeight = screen.getPrimaryDisplay().workAreaSize.height;

  x = Math.max(3, Math.min(x, screenWidth - windowBounds.width - 3));

  let y;

  if (trayBounds.y > screenHeight / 2) {
    y = Math.round(trayBounds.y - windowBounds.height - 3);
  } else {
    y = Math.round(trayBounds.y + trayBounds.height + 3);
  }

  return { x: x, y: y };
};

function createWindow() {
  win = new BrowserWindow({
    width: 700,
    height: 602,
    show: false,
    frame: false,
    fullscreenable: false,
    resizable: false,
    transparent: false,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
      // nodeIntegrationInSubFrames: true,
      webviewTag: true,
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'jira.png'),
  });

  win.setMenuBarVisibility(false);

  win.loadURL(`file://${__dirname}/index.html`);
  // win.webContents.openDevTools();

  win.on('blur', () => {
    win.hide();
  });

  win.on('hide', () => {
    closeTime = +new Date();
  });

  win.on('closed', () => {
    win = null;
  });
}

const showWindow = () => {
  const position = getWindowPosition();
  win.setPosition(position.x, position.y, false);
  win.show();
  win.focus();
};

ipcMain.on('show-window', () => {
  showWindow();
});

let hasActiveNotify = false;
ipcMain.on('updateCounter', async (event, data) => {
  if (data !== 0) {
    hasActiveNotify = true;
    console.info('+ new message!');
  }

  if (hasActiveNotify) {
    tray.setImage(path.join(__dirname, 'jira-alarm.png'));
  } else {
    tray.setImage(path.join(__dirname, 'jira.png'));
  }
});

app.on('ready', () => {
  createTray();
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('browser-window-focus', (event, win) => {
  win.webContents.send('focus');
  hasActiveNotify = false;

  tray.setImage(path.join(__dirname, 'jira.png'));
});

app.on('browser-window-blur', (event, win) => {
  win.webContents.send('blur');
});
