const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const unzipper = require('unzipper');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    title: "Subway Builder Map Loader"
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.maximize();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("open-folder-dialog", (event) => {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled) {
      event.returnValue = result.filePaths[0];
    }
  }).catch(err => {
    console.log(err);
  });
});

ipcMain.on("import-new-map", (event, args) => {
  if(args.length < 1) {
    event.returnValue = {"status": "err", "message": "No app data path provided"};
    return;
  }
  dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      {name: "Packaged Map", extensions: ["zip"]}
    ]
  }).then(result => {
    if(result.canceled) {
      event.returnValue = {"status": "err", "message": "User cancelled"};
      return;
    }
    else {
      let filePath = result.filePaths[0];
      unzipper.Open.file(filePath).then(d => {
        let filesFound = [];
        let tilesIncluded = false;
        for(let i = 0; i < d.files.length; i++) {
          let file = d.files[i];
          if(file.path === "config.json") {
            filesFound.push("config.json");
          }
          if(file.path == "roads.geojson") {
            filesFound.push("roads.geojson");
          }
          else if(file.path === "runways_taxiways.geojson") {
            filesFound.push("runways_taxiways.geojson");
          }
          else if(file.path === "demand_data.json") {
            filesFound.push("demand_data.json");
          }
          else if(file.path.endsWith(".pmtiles")) {
            tilesIncluded = true;
          }
          else if(file.path === "buildings_index.json") {
            filesFound.push("buildings_index.json");
          }
          if(filesFound.length == 4) {
            break;
          }
        }
        if(filesFound.length < 5) {
          event.returnValue = {"status": "err", "message": "The selected file is missing the following required files: " + ["roads.geojson", "runways_taxiways.geojson", "demand_data.json", "buildings_index.json", "config.json"].filter(f => !filesFound.includes(f)).join(", ")};
          return;
        }
        d.files.forEach(file => {
          if(file.path === "config.json") {
            file.buffer().then(buffer => {
              let config = JSON.parse(buffer.toString());
              if(config.name === undefined || config.creator === undefined || config.version === undefined || config.description === undefined || config.bbox === undefined || config.population === undefined || config.code === undefined || config.initialViewState === undefined) {
                event.returnValue = {"status": "err", "message": "The config.json file is missing the following required fields: " + ["name", "creator", "version", "description", "bbox", "population", "code", "initialViewState"].filter(f => config[f] === undefined).join(", ")};
                return;
              }
              let mapCode = config.code;
              let mapPath = path.join(args[0], "data", mapCode);
              d.extract({path: mapPath}).then(() => {
                event.returnValue = {"status": "success", "message": "Map imported successfully", "config": config};
              });
            });
          }
        });
      });
    }
  });
});
