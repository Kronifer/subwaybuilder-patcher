const { contextBridge, ipcRenderer } = require("electron");

console.log("Preload script loaded");

contextBridge.exposeInMainWorld("electron", {
  openFolderDialog: () => ipcRenderer.sendSync("open-folder-dialog"),
  openFileDialog: () => ipcRenderer.sendSync("open-file-dialog"),
  importNewMap: async (appDataPath, mapCodeList) =>
    ipcRenderer.invoke("import-new-map", [appDataPath, mapCodeList]),
  deleteMap: (mapCode, appDataPath) =>
    ipcRenderer.sendSync("delete-map", [mapCode, appDataPath]),
  generateMod: (mapConfig, appDataPath) =>
    ipcRenderer.sendSync("generate-mod", [mapConfig, appDataPath]),
  startGame: (gamePath) => ipcRenderer.sendSync("start-game", [gamePath]),
});
