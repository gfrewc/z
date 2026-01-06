const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0a0a0f',
    show: false
  });

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Open URL in Edge browser
ipcMain.handle('open-in-edge', async (event, url) => {
  try {
    // Try to open in Microsoft Edge
    const edgePath = process.platform === 'win32' 
      ? 'start msedge'
      : process.platform === 'darwin'
      ? 'open -a "Microsoft Edge"'
      : 'microsoft-edge';
    
    exec(`${edgePath} "${url}"`, (error) => {
      if (error) {
        // Fallback to default browser
        shell.openExternal(url);
      }
    });
    
    return { success: true };
  } catch (error) {
    // Fallback to default browser
    shell.openExternal(url);
    return { success: true, fallback: true };
  }
});

// Open external URL
ipcMain.handle('open-external', async (event, url) => {
  shell.openExternal(url);
  return { success: true };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
