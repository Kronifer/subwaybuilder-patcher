const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const unzipper = require("unzipper");
const zlib = require("node:zlib");
const fs = require("node:fs");
const request = require("request");
const { spawn } = require("child_process");
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      devTools: false
    },
    title: "Map Manager",
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.removeMenu();
  mainWindow.maximize();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  switch (process.platform) {
    case "win32":
      if (!fs.existsSync(path.join(app.getPath("userData"), "pmtiles.exe"))) {
        fetch(
          `https://api.github.com/repos/protomaps/go-pmtiles/releases/latest`,
        )
          .then((res) => res.json())
          .then((data) => {
            let tag = data.tag_name;
            unzipper.Open.url(
              request,
              `https://github.com/protomaps/go-pmtiles/releases/download/${tag}/go-pmtiles_${tag.replace("v", "")}_Windows_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`,
            ).then((d) => {
              let file = d.files.find((f) => f.path.endsWith(".exe"));
              if (file) {
                file
                  .stream()
                  .pipe(
                    fs.createWriteStream(
                      path.join(app.getPath("userData"), "pmtiles.exe"),
                      {},
                    ),
                  )
                  .on("finish", () => {
                    console.log("Finished writing pmtiles.exe");
                  })
                  .on("error", (err) => {
                    console.error("Error writing pmtiles.exe:", err);
                  });
              }
            });
          });
      }
      break;
    case "darwin":
      if (!fs.existsSync(path.join(app.getPath("userData"), "pmtiles"))) {
        fetch(
          `https://api.github.com/repos/protomaps/go-pmtiles/releases/latest`,
        )
          .then((res) => res.json())
          .then((data) => {
            let tag = data.tag_name;
            unzipper.Open.url(
              request,
              `https://github.com/protomaps/go-pmtiles/releases/download/${tag}/go-pmtiles_${tag.replace("v", "")}_Darwin_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`,
            ).then((d) => {
              let file = d.files.find((f) => f.path === "pmtiles");
              if (file) {
                file
                  .stream()
                  .pipe(
                    fs.createWriteStream(
                      path.join(app.getPath("userData"), "pmtiles"),
                      {},
                    ),
                  )
                  .on("finish", () => {
                    console.log("Finished writing pmtiles");
                  })
                  .on("error", (err) => {
                    console.error("Error writing pmtiles:", err);
                  });
              }
            });
          });
      }
      break;
    case "linux":
      if (!fs.existsSync(path.join(app.getPath("userData"), "pmtiles"))) {
        fetch(
          `https://api.github.com/repos/protomaps/go-pmtiles/releases/latest`,
        )
          .then((res) => res.json())
          .then((data) => {
            let tag = data.tag_name;
            unzipper.Open.url(
              request,
              `https://github.com/protomaps/go-pmtiles/releases/download/${tag}/go-pmtiles_${tag.replace("v", "")}_Linux_${process.arch === "x64" ? "x86_64" : "arm64"}.zip`,
            ).then((d) => {
              let file = d.files.find((f) => f.path === "pmtiles");
              if (file) {
                file
                  .stream()
                  .pipe(
                    fs.createWriteStream(
                      path.join(app.getPath("userData"), "pmtiles"),
                      {},
                    ),
                  )
                  .on("finish", () => {
                    console.log("Finished writing pmtiles");
                  })
                  .on("error", (err) => {
                    console.error("Error writing pmtiles:", err);
                  });
              }
            });
          });
      }
      break;
    default:
      console.error("Unsupported platform: " + process.platform);
  }

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

ipcMain.on("open-folder-dialog", (event) => {
  dialog
    .showOpenDialog({
      properties: ["openDirectory"],
    })
    .then((result) => {
      if (!result.canceled) {
        event.returnValue = result.filePaths[0];
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.on("open-file-dialog", (event) => {
  dialog
    .showOpenDialog({
      properties: ["openFile"],
    })
    .then((result) => {
      if (!result.canceled) {
        event.returnValue = result.filePaths[0];
      }
    })
    .catch((err) => {
      console.log(err);
    });
});

ipcMain.handle("import-new-map", async (event, args) => {
  if (args.length < 2) {
    return Promise.resolve({
      status: "err",
      message: "Must supply app data path and list of map codes",
    });
  }
  let result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Packaged Map", extensions: ["zip"] }],
  });
  if (result.canceled) {
    return Promise.resolve({ status: "err", message: "User cancelled" });
  } else {
    let filePath = result.filePaths[0];
    let d = await unzipper.Open.file(filePath);
    let filesFound = [];
    let config = null;
    for (let i = 0; i < d.files.length; i++) {
      let file = d.files[i];
      if (file.path === "config.json") {
        filesFound.push("config.json");
        config = file;
      }
      if (file.path == "roads.geojson") {
        filesFound.push("roads.geojson");
      } else if (file.path === "runways_taxiways.geojson") {
        filesFound.push("runways_taxiways.geojson");
      } else if (file.path === "demand_data.json") {
        filesFound.push("demand_data.json");
      } else if (file.path.endsWith(".pmtiles")) {
        filesFound.push("tiles");
      } else if (file.path === "buildings_index.json") {
        filesFound.push("buildings_index.json");
      }
      if (filesFound.length == 6) {
        break;
      }
    }
    if (filesFound.length < 6) {
      console.log(filesFound);
      return Promise.resolve({
        status: "err",
        message:
          "The selected map package is missing the following required files: " +
          [
            "roads.geojson",
            "runways_taxiways.geojson",
            "demand_data.json",
            "buildings_index.json",
            "config.json",
            "tiles",
          ]
            .filter((f) => !filesFound.includes(f))
            .join(", "),
      });
    }
    let buffer = await config.buffer();
    config = JSON.parse(buffer.toString());
    if (
      config.name === undefined ||
      config.creator === undefined ||
      config.version === undefined ||
      config.description === undefined ||
      config.population === undefined ||
      config.code === undefined ||
      config.initialViewState === undefined
    ) {
      return Promise.resolve({
        status: "err",
        message:
          "The config.json file is missing the following required fields: " +
          [
            "name",
            "creator",
            "version",
            "description",
            "population",
            "code",
            "initialViewState",
          ]
            .filter((f) => config[f] === undefined)
            .join(", "),
      });
    }
    let mapCode = config.code;
    if (args[1].includes(mapCode)) {
      return Promise.resolve({
        status: "err",
        message:
          "A map with the code " +
          mapCode +
          " already exists. Please choose a different map code or delete the existing map.",
      });
    }
    let mapPath = path.join(args[0], "cities", "data", mapCode);
    if (!fs.existsSync(mapPath)) {
      fs.mkdirSync(mapPath, { recursive: true });
    }
    let wroteSuccessfully = true;
    let promises = [];
    d.files.forEach((f) => {
      if (f.path === "config.json") {
        return;
      }
      let s = f.stream();
      if (f.path.endsWith(".pmtiles")) {
        if (!fs.existsSync(path.join(app.getPath("userData"), "tiles"))) {
          fs.mkdirSync(path.join(app.getPath("userData"), "tiles"));
        }
        let writeStream = s.pipe(
          fs.createWriteStream(
            path.join(app.getPath("userData"), "tiles", f.path),
            {},
          ),
        );
        promises.push(
          new Promise((resolve, reject) => {
            writeStream.on("finish", () => {
              console.log(`Finished writing ${f.path}`);
              resolve();
            });
            writeStream.on("error", (err) => {
              console.error(`Error writing ${f.path}:`, err);
              wroteSuccessfully = false;
              reject(err);
            });
          }),
        );
        writeStream.on("finish", () => {
          console.log(`Finished writing ${f.path}`);
        });
        writeStream.on("error", (err) => {
          console.error(`Error writing ${f.path}:`, err);
          wroteSuccessfully = false;
        });
      } else if (f.path.endsWith(".svg")) {
        if (
          !fs.existsSync(path.join(appDataPath, "public", "data", "city-maps"))
        ) {
          fs.mkdirSync(path.join(appDataPath, "public", "data", "city-maps"), {
            recursive: true,
          });
        }
        let writeStream = s.pipe(
          fs.createWriteStream(
            path.join(
              path.join(appDataPath, "public", "data", "city-maps"),
              `${config.code}.svg`,
            ),
            {},
          ),
        );
        writeStream.on("finish", () => {
          console.log(`Finished writing ${f.path}`);
        });
        writeStream.on("error", (err) => {
          console.error(`Error writing ${f.path}:`, err);
          wroteSuccessfully = false;
        });
      }
      let writeStream = s
        .pipe(zlib.createGzip())
        .pipe(fs.createWriteStream(path.join(mapPath, f.path + ".gz"), {}));
      writeStream.on("finish", () => {
        console.log(`Finished writing ${f.path}`);
      });
      writeStream.on("error", (err) => {
        console.error(`Error writing ${f.path}:`, err);
        wroteSuccessfully = false;
      });
    });
    return Promise.all(promises).then(() => {
      return Promise.resolve({
        status: "success",
        message: "Map imported successfully!",
        config: config,
      });
    });
  }
});

ipcMain.on("delete-map", (event, args) => {
  if (args.length < 2) {
    event.returnValue = {
      status: "err",
      message: "Not enough arguments provided",
    };
    return;
  }
  let mapCode = args[0];
  let appDataPath = args[1];
  let mapPath = path.join(appDataPath, "cities", "data", mapCode);
  let tilesPath = path.join(
    app.getPath("userData"),
    "tiles",
    mapCode + ".pmtiles",
  );
  fs.rmSync(tilesPath, { force: true });
  if (fs.existsSync(mapPath)) {
    fs.rmSync(mapPath, { recursive: true });
    event.returnValue = {
      status: "success",
      message: "Map deleted successfully!",
    };
  } else {
    event.returnValue = { status: "err", message: "Map not found" };
  }
});

const MOD_CONTENTS = `
const config = \${REPLACE};

config.places.forEach(async place => {
    let publicDir = await window.electron.getModsFolder();
    publicDir = publicDir.replaceAll('\\\\', '/').replace("/mods", '/public/data/city-maps/');
    let newPlace = {
        code: place.code,
        name: place.name,
        population: place.population,
        description: place.description,
        mapImageUrl: \`file:///\${publicDir}\${place.code}.svg\` // Tries to pull this from the app.asar instead of public/
    };
    if (place.initialViewState) {
        newPlace.initialViewState = place.initialViewState;
    } else {
        newPlace.initialViewState = {
            longitude: (place.bbox[0] + place.bbox[2]) / 2,
            latitude: (place.bbox[1] + place.bbox[3]) / 2,
            zoom: 12,
            bearing: 0,
        };
    }
    window.SubwayBuilderAPI.registerCity(newPlace);
    window.SubwayBuilderAPI.map.setDefaultLayerVisibility(place.code, {
        oceanFoundations: false,
        trackElevations: false
    });
    // 3. Fix layer schemas for custom tiles
    window.SubwayBuilderAPI.map.setLayerOverride({
        layerId: 'parks-large',
        sourceLayer: 'landuse',
        filter: ['==', ['get', 'kind'], 'park'],
    });

    window.SubwayBuilderAPI.map.setLayerOverride({
        layerId: 'airports',
        sourceLayer: 'landuse',
        filter: ['==', ['get', 'kind'], 'aerodrome'],
    });

    window.SubwayBuilderAPI.map.setTileURLOverride({
        cityCode: place.code,
        tilesUrl: \`http://127.0.0.1:8080/\${place.code}/{z}/{x}/{y}.mvt\`,
        foundationTilesUrl: \`https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png\`,
        maxZoom: config["tile-zoom-level"]
    });

    window.SubwayBuilderAPI.cities.setCityDataFiles(place.code, { // auto appends .gz, is this intended? if it is then its fine if not then that has to be removed so we can manually set the .gz file extension
        buildingsIndex: \`/data/\${place.code}/buildings_index.json\`,
        demandData: \`/data/\${place.code}/demand_data.json\`, // drivingPaths supplied in demand_data.json.gz still aren't used
        roads: \`/data/\${place.code}/roads.geojson\`,
        runwaysTaxiways: \`/data/\${place.code}/runways_taxiways.geojson\`,
    })
})`;

const manifest = {
  id: "com.kronifer.maploader",
  name: "Map Loader",
  description: "Patcher-like mod that allows easy loading of custom maps.",
  version: "1.0.0",
  author: { name: "Kronifer" },
  main: "index.js",
};

ipcMain.on("generate-mod", (event, args) => {
  if (args.length < 2) {
    event.returnValue = {
      status: "err",
      message: "Not enough arguments provided",
    };
    return;
  }
  if (!fs.existsSync(path.join(args[1], "mods", "mapLoader"))) {
    fs.mkdirSync(path.join(args[1], "mods", "mapLoader"), { recursive: true });
  }
  let mapConfig = args[0];
  let appDataPath = args[1];
  let modContents = MOD_CONTENTS.replace(
    "${REPLACE}",
    JSON.stringify({ places: mapConfig, "tile-zoom-level": 15 }, null, 2),
  );
  let modPath = path.join(appDataPath, "mods", "mapLoader", `index.js`);
  fs.writeFileSync(modPath, modContents);
  fs.writeFileSync(
    path.join(appDataPath, "mods", "mapLoader", `manifest.json`),
    JSON.stringify(manifest, null, 2),
  );
  event.returnValue = {
    status: "success",
    message: "Mod generated successfully!",
  };
});

ipcMain.on("start-game", (event, args) => {
  if (args.length < 1) {
    event.returnValue = {
      status: "err",
      message: "Not enough arguments provided",
    };
    return;
  }
  let gamePath = args[0];
  let pmtilesExecPath = path.join(
    app.getPath("userData"),
    process.platform == "win32" ? "pmtiles.exe" : "pmtiles",
  );
  let game = spawn(gamePath);
  let pmtiles = spawn(pmtilesExecPath, [
    "serve",
    path.join(app.getPath("userData"), "tiles"),
    "--port",
    "8080",
    "--cors=*",
  ]);
  console.log(
    `Started game with PID ${game.pid} and pmtiles with PID ${pmtiles.pid}`,
  );
  pmtiles.stdout.on("data", (data) => {
    console.log(`pmtiles: ${data}`);
  });
  pmtiles.stderr.on("data", (data) => {
    console.error(`pmtiles error: ${data}`);
  });
  game.on("close", () => {
    pmtiles.kill();
  });
  event.returnValue = {
    status: "success",
    message: "Game started successfully!",
  };
});
