const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electron", {
  openFolderDialog: () => ipcRenderer.sendSync("open-folder-dialog"),
  openFileDialog: () => ipcRenderer.sendSync("open-file-dialog"),
  importNewMap: async (appDataPath, mapCodeList, mapPackagePath) =>
    ipcRenderer.invoke("import-new-map", [appDataPath, mapCodeList, mapPackagePath]),
  selectMaps: async () => ipcRenderer.invoke("select-map-packages"),
  deleteMap: (mapCode, appDataPath) =>
    ipcRenderer.sendSync("delete-map", [mapCode, appDataPath]),
  startGame: (gamePath, appDataPath, mapConfig) => ipcRenderer.sendSync("start-game", [gamePath, appDataPath, mapConfig]),
  writeLogFile: (message, filename) =>
    ipcRenderer.sendSync("write-log-file", [message, filename]),
});
