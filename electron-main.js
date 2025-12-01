const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

const HARDCODED_FOLDER = 'C:\\Users\\224349\\Desktop\\Trip-Collection';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadURL('http://localhost:4200');
}

// 🔥 Register custom protocol BEFORE creating window
app.whenReady().then(() => {

  protocol.registerFileProtocol('localfile', (request, callback) => {
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.searchParams.get('path'));
  
    console.log('Serving media file:', filePath);
    callback({ path: filePath });
  });
  

  createWindow();
});

/* ---------------------------------------------------------
   1️⃣ IMPORT TRIPS
--------------------------------------------------------- */
ipcMain.handle('import-trips', async () => {
  const items = fs.readdirSync(HARDCODED_FOLDER, { withFileTypes: true });
  const trips = items.filter(item => item.isDirectory()).map(folder => folder.name);
  return { folderPath: HARDCODED_FOLDER, trips };
});

/* ---------------------------------------------------------
   2️⃣ LOAD JSON
--------------------------------------------------------- */
ipcMain.handle('load-trip-json', async (event, tripFolder) => {
  try {
    const tripPath = path.join(HARDCODED_FOLDER, tripFolder);
    if (!fs.existsSync(tripPath)) return { error: 'Trip folder does not exist' };

    const files = fs.readdirSync(tripPath);
    const jsonFile = files.find(f => f.toLowerCase().endsWith('.json'));
    if (!jsonFile) return { error: 'No JSON file found in trip folder' };

    const jsonPath = path.join(tripPath, jsonFile);
    const jsonData = fs.readFileSync(jsonPath, 'utf8');

    console.log(`Found JSON: ${jsonFile} in trip folder ${tripFolder}`);
    return { success: true, data: JSON.parse(jsonData) };
  } catch (err) {
    return { error: err.message };
  }
});

/* ---------------------------------------------------------
   3️⃣ LOAD VIDEO
--------------------------------------------------------- */
ipcMain.handle('get-trip-video', async (event, tripFolder) => {
  try {
    const videoExts = ['.mp4', '.mov', '.avi', '.mkv'];
    const tripPath = path.join(HARDCODED_FOLDER, tripFolder);
    const files = fs.readdirSync(tripPath);

    const videoFile = files.find(f => videoExts.includes(path.extname(f).toLowerCase()));
    if (!videoFile) return { error: 'No video file found in trip folder' };

    return { success: true, videoPath: path.join(tripPath, videoFile) };
  } catch (err) {
    return { error: err.message };
  }
});

/* ---------------------------------------------------------
   4️⃣ DELETE TRIP FOLDER
--------------------------------------------------------- */
ipcMain.handle('delete-trip-folder', async (event, tripFolder) => {
  try {
    const tripPath = path.join(HARDCODED_FOLDER, tripFolder);
    if (fs.existsSync(tripPath)) {
      fs.rmSync(tripPath, { recursive: true, force: true });
      console.log(`Deleted trip folder: ${tripFolder}`);
      return { success: true };
    }
    return { error: 'Folder not found' };
  } catch (err) {
    return { error: err.message };
  }
});
