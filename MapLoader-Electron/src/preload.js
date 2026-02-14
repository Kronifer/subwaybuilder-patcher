const {contextBridge, ipcRenderer} = require('electron');

console.log("Preload script loaded");

contextBridge.exposeInMainWorld('electron', {
    openFolderDialog: () => ipcRenderer.sendSync("open-folder-dialog"),
    importNewMap: (appDataPath) => ipcRenderer.sendSync("import-new-map", [appDataPath])
})
