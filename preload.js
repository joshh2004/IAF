const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  importTrips: () => ipcRenderer.invoke('import-trips'),
  loadTripJson: (tripFolder) => ipcRenderer.invoke('load-trip-json', tripFolder),
  getTripVideo: (tripFolder) => ipcRenderer.invoke('get-trip-video', tripFolder),
  deleteTripFolder: (tripFolder) => ipcRenderer.invoke('delete-trip-folder', tripFolder)
});
