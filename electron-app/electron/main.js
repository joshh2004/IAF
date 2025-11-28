const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // IMPORTANT: Use loadFile for local dist files
  const indexPath = path.join(__dirname, "../dist/electron-app/browser/index.html");

  win.loadFile(indexPath);

  // Helps debug errors
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();
});
