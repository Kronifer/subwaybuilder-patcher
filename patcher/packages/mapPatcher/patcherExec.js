import fs from 'fs';
import config from './config.js';
import config2 from '../../../config.js'
import { spawn, execSync } from 'child_process';
import { generateThumbnail } from './utils/create_thumbnail.js';

const stringReplaceAt = (string, startIndex, endIndex, replacement) => {
    return string.substring(0, startIndex) + replacement + string.substring(endIndex + 1);
};

export async function patcherExec(fileContents) {
    let allFilesExist = true;
    config.places.forEach(place => {
        if (!fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/buildings_index.json`) || !fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`) || !fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/roads.geojson`) || !fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/runways_taxiways.geojson`)) {
            console.error(`Processed data for ${place.name} (${place.code}) is missing! If you've downloaded a map, extract it into processed_data, otherwise please run download_data and process_data.`);
            allFilesExist = false;
        }
    });
    if(!allFilesExist) {
        process.exit(1);
    }
    console.log("Starting local tile server for thumbnail generation");
    let childProcess;
    if (config2.platform === 'windows')
      childProcess = spawn('./pmtiles.exe', ["serve", "."], {cwd: `${import.meta.dirname}/map_tiles`});
    else
      childProcess = spawn('./pmtiles', ["serve", "."], {cwd: `${import.meta.dirname}/map_tiles`});

    childProcess.stdout.on('data', (d) => console.log(`pmtiles stdout: ${d.toString()}`));
    childProcess.stderr.on('data', (d) => console.error(`pmtiles stderr: ${d.toString()}`));

    childProcess.on('exit', (code, sig) => console.error(`pmtiles exited with code=${code}, signal=${sig}`));

    
    console.log("Started pmtiles with PID: " + childProcess.pid);
    
    // Poll for server readiness instead of fixed delay
    let serverReady = false;
    for(let i = 0; i < 50; i++) { // Max 5 seconds
        try {
            await fetch('http://127.0.0.1:8080');
            serverReady = true;
            break;
        } catch(e) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    if (!serverReady) console.warn("Warning: Tile server did not respond within 5s, proceeding anyway...");
    console.log("Modifying cities list");
    const startOfCitiesArea = fileContents.INDEX.indexOf('const cities = [{') + 'const cities = '.length; // will give us the start of the array
    const endOfCitiesArea = fileContents.INDEX.indexOf('}];', startOfCitiesArea) + 2;
    if (startOfCitiesArea == -1 || endOfCitiesArea == -1) throw new Error("Could not find cities array in index.js");
    let existingListOfCitiesRaw = fileContents.INDEX.substring(startOfCitiesArea, endOfCitiesArea - 1) + ", ";
    config.places.forEach(place => {
        existingListOfCitiesRaw += JSON.stringify({
            name: place.name,
            code: place.code,
            description: place.description,
            population: place.population,
            initialViewState: place.initialViewState ? place.initialViewState : {
                zoom: 13.5,
                latitude: (place.bbox[1] + place.bbox[3]) / 2,
                longitude: (place.bbox[0] + place.bbox[2]) / 2,
                bearing: 0,
            }
        }) + ", ";
    });
    const finalCitiesList = existingListOfCitiesRaw.slice(0, -2) + '];';
    fileContents.INDEX = stringReplaceAt(fileContents.INDEX, startOfCitiesArea, endOfCitiesArea, finalCitiesList);
    console.log('Extracting existing map config')
    const startOfMapConfig = fileContents.GAMEMAIN.indexOf('const sources = {') + 'const sources = '.length; // will give us the start of the config
    const endOfMapConfig = fileContents.GAMEMAIN.indexOf('const layers', startOfMapConfig) - 1;
    if (startOfMapConfig == -1 || endOfMapConfig == -1) triggerError('code-not-found', 'The original map config could not be located.');
    const existingMapConfig = fileContents.GAMEMAIN.substring(startOfMapConfig, endOfMapConfig);
    console.log('Modifying map config');
    const newMapConfig = existingMapConfig
        .replaceAll(/\[tilesUrl\]/g, "[['ATL', 'AUS', 'BAL', 'BOS', 'CHI', 'CIN', 'CLE', 'CLT', 'DAL', 'DC', 'DEN', 'DET', 'HNL', 'HOU', 'IND', 'MIA', 'MSP', 'NYC', 'PDX', 'PHL', 'PIT', 'SAN', 'SEA', 'SF', 'SLC', 'STL'].indexOf(cityCode) == -1 ? \`http://127.0.0.1:8080/${cityCode}/{z}/{x}/{y}.mvt\` : tilesUrl]")
        .replaceAll(/\[foundationTilesUrl\]/g, "[['ATL', 'AUS', 'BAL', 'BOS', 'CHI', 'CIN', 'CLE', 'CLT', 'DAL', 'DC', 'DEN', 'DET', 'HNL', 'HOU', 'IND', 'MIA', 'MSP', 'NYC', 'PDX', 'PHL', 'PIT', 'SAN', 'SEA', 'SF', 'SLC', 'STL'].indexOf(cityCode) == -1 ? \`http://127.0.0.1:8080/${cityCode}/{z}/{x}/{y}.mvt\` : foundationTilesUrl]")
        .replaceAll('maxzoom: 16', `maxzoom: ${config['tile-zoom-level'] - 1}`);
    fileContents.GAMEMAIN = stringReplaceAt(fileContents.GAMEMAIN, startOfMapConfig, endOfMapConfig, newMapConfig);
    console.log('Modifying map layers')
    // doing parks coloring
    const startOfParksMapConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"parks-large",/);
    const endOfParksMapConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"airports/, startOfParksMapConfig) - 1;
    const startOfWaterConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"water",/);
    const endOfWaterConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"parks-large"/, startOfWaterConfig) - 1;
    const startOfBuildingsConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"buildings-3d",/);
    const endOfBuildingsConfig = startOfWaterConfig - 1;
    let buildingsMapConfig = fileContents.GAMEMAIN.substring(startOfBuildingsConfig, endOfBuildingsConfig);
    buildingsMapConfig = buildingsMapConfig.replace('] : 0.2', '] : 1.5');
    if (startOfWaterConfig == -1 || endOfWaterConfig == -1) triggerError('code-not-found', 'The map styling for water could not be located.');
    let waterMapConfig = fileContents.GAMEMAIN.substring(startOfWaterConfig, endOfWaterConfig);
    waterMapConfig = waterMapConfig.replace('"fill-extrusion-height": 0', '"fill-extrusion-height": 0.1');
    if (startOfParksMapConfig == -1 || endOfParksMapConfig == -1) triggerError('code-not-found', 'The map styling for parks could not be located.');
    let parksMapConfig = fileContents.GAMEMAIN.substring(startOfParksMapConfig, endOfParksMapConfig);
    const originalFilters = parksMapConfig.match(/\["[<>=]{1,2}",\s+\["get",\s+"area"\],\s+[0-9e]+\]/g);
    originalFilters.forEach((filter) => {
        if (''.includes('<')) return; // we're only doing the big park, dont @ me (the data for park sizes isnt in my tiles)
        parksMapConfig = parksMapConfig.replace(filter, `["==", ["get", "kind"], "park"]`);
    });
    parksMapConfig = parksMapConfig.replace(`"source-layer": "parks"`, `"source-layer": "landuse"`).replaceAll(/"source-layer": "parks",\n *filter:.*/g, '"source-layer": "parks",');
    fileContents.GAMEMAIN = stringReplaceAt(fileContents.GAMEMAIN, startOfParksMapConfig, endOfParksMapConfig, parksMapConfig);
    fileContents.GAMEMAIN = stringReplaceAt(fileContents.GAMEMAIN, startOfWaterConfig, endOfWaterConfig, waterMapConfig);
    fileContents.GAMEMAIN = stringReplaceAt(fileContents.GAMEMAIN, startOfBuildingsConfig, endOfBuildingsConfig, buildingsMapConfig);
    //console.log("Fixing pathfinding for negative longitudes");
    //const obfuscatedLabel = /strCoords\((_[a-zA-Z0-9]{8})\)/gm.exec(fileContents.INDEX)[1];
    //const findFunctionContents = /function strCoords\(_[a-zA-Z0-9]{8}\) {(.|\n)*;\n}/gm;
    //const match = findFunctionContents.exec(fileContents.INDEX);
    //const startInd = match.index;
    //const endInd = startInd + match[0].length;
    //let functionContents = fileContents.INDEX.substring(startInd, endInd);
    //functionContents = functionContents.replaceAll('"-"', '","');
    //functionContents = functionContents.replace(`${obfuscatedLabel}[0]`, `${obfuscatedLabel}[0].toFixed(8)`);
    //functionContents = functionContents.replace(`${obfuscatedLabel}[1]`, `${obfuscatedLabel}[1].toFixed(8)`);
    //fileContents.INDEX = stringReplaceAt(fileContents.INDEX, startInd, endInd, functionContents);
    console.log("Modifying airport layers");

    //gameMainAfterParksMapConfigMod = gameMainAfterParksMapConfigMod.replace('"source-layer": "buildings"', '"source-layer": "building"'); // Slight discrepency in naming convention
    fileContents.GAMEMAIN = fileContents.GAMEMAIN.replaceAll('"source-layer": "airports",', '"source-layer": "landuse",\n        filter: ["==", ["get", "kind"], "aerodrome"],');
    const startOfAirportsConfig = fileContents.GAMEMAIN.search(/{\n\s*id:\s*"airports",/);
    const endOfAirportsConfig = fileContents.GAMEMAIN.search(/}\n\s*\);\n\s*layers\.push\({\n\s*id: "general-tiles",/);
    const newAirportsConfig = `
      {
        id: "airports",
        type: "fill-extrusion",
        source: "general-tiles",
        "source-layer": "landuse",
        filter: ["==", ["get", "kind"], "aerodrome"],
        paint: {
          "fill-extrusion-color": mapColors.airports,
          "fill-extrusion-height": 0,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 1
        },
        layout: {
          visibility: showFoundations ? "none" : "visible"
        }
      },
      {
        id: "airports-vanilla",
        type: "fill-extrusion",
        source: "general-tiles",
        "source-layer": "airports",
        paint: {
          "fill-extrusion-color": mapColors.airports,
          "fill-extrusion-height": 0,
          "fill-extrusion-base": 0,
          "fill-extrusion-opacity": 1
        },
        layout: {
          visibility: showFoundations ? "none" : "visible"
        }
      }`;
    fileContents.GAMEMAIN = stringReplaceAt(fileContents.GAMEMAIN, startOfAirportsConfig, endOfAirportsConfig, newAirportsConfig);

    
    console.log("Modifying ocean depth layers");
    const citiesWithOcean = config.places.filter(place => fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/ocean_depth_index.json`)).map(p => p.code);
    const citiesWithOceanList = JSON.stringify(citiesWithOcean);
    const vanillaCitiesList = "['ATL', 'AUS', 'BAL', 'BOS', 'CHI', 'CIN', 'CLE', 'CLT', 'DAL', 'DC', 'DEN', 'DET', 'HNL', 'HOU', 'IND', 'MIA', 'MSP', 'NYC', 'PDX', 'PHL', 'PIT', 'SAN', 'SEA', 'SF', 'SLC', 'STL']";

    // Warn about cities without ocean data
    config.places.forEach(place => {if (!citiesWithOcean.includes(place.code)) {console.log(`No ocean depth data found for ${place.name} (${place.code}). Ocean layers will be disabled.`);}});

    fileContents.GAMEMAIN = fileContents.GAMEMAIN.replace(/const sources\s*=\s*\{/, `const sources = {...(${citiesWithOceanList}.indexOf(cityCode) > -1 ? { "ocean-depth-source": { type: "geojson", data: \`data/\${cityCode}_ocean.geojson\`, tolerance: 0 } } : {}),`);
    fileContents.GAMEMAIN = fileContents.GAMEMAIN.replaceAll("showOceanFoundations: layersToShow.oceanFoundations", `showOceanFoundations: (${citiesWithOceanList}.indexOf(cityCode) > -1 || ${vanillaCitiesList}.indexOf(cityCode) > -1) ? layersToShow.oceanFoundations : !layersToShow.oceanFoundations`);

    const oceanLayerBlock = `
      "source-layer": "ocean_foundations",
      paint: {
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["abs", ["get", "depth_min"]],
          ...OCEAN_FOUNDATION_DEPTHS.flatMap((depth) => {
            const color2 = depth.colors[isDark ? "dark" : "light"];
            return [depth.maxDepth, color2];
          })
        ],
        "fill-extrusion-opacity": 1,
        "fill-extrusion-height": 0,
        "fill-extrusion-base": 0
      },
      layout: {
        visibility: showOceanFoundations ? "visible" : "none"
      }
    });`;

    const customOceanLayer = `
    if (${citiesWithOceanList}.indexOf(cityCode) > -1) {
        layers.push({
            id: "ocean-depth-layer",
            type: "fill-extrusion",
            source: "ocean-depth-source",
            paint: {
                "fill-extrusion-color": ["interpolate", ["linear"], ["abs", ["get", "depth_min"]], ...OCEAN_FOUNDATION_DEPTHS.flatMap(d => [d.maxDepth, d.colors[isDark ? "dark" : "light"]])],
                "fill-extrusion-opacity": 1,
                "fill-extrusion-height": 0.1,
                "fill-extrusion-base": 0.1
            },
            layout: { visibility: showOceanFoundations ? "visible" : "none" }
        });
        layers.push({
            id: "ocean-depth-labels-custom",
            type: "symbol",
            source: "ocean-depth-source",
            layout: {
                "text-field": ["concat", ["get", "depth_min"], "m"],
                "text-font": ["Noto Sans Medium"],
                "text-size": ["interpolate", ["linear"], ["zoom"], 12.75, 12, 18, 20],
                "text-rotation-alignment": "viewport",
                "text-pitch-alignment": "viewport",
                "text-padding": 50,
                "text-letter-spacing": 0.1,
                "text-anchor": "center",
                "text-allow-overlap": false,
                "text-ignore-placement": false,
                "symbol-placement": "point",
                visibility: isConstruction && showOceanFoundations ? "visible" : "none"
            },
            paint: {
                "text-color": mapColors.roadLabel,
                "text-halo-color": mapColors.roadLabelHalo,
                "text-halo-width": 0.75,
                "text-halo-blur": 0.25,
                "text-opacity": ["interpolate", ["linear"], ["zoom"], 12.75, 0, 13, 1]
            }
        });
    }`;

    fileContents.GAMEMAIN = fileContents.GAMEMAIN.replace(oceanLayerBlock, oceanLayerBlock + customOceanLayer);

    // Generate geojson for the ocean layer if data exists
    config.places.forEach(place => {
        const oceanPath = `${import.meta.dirname}/processed_data/${place.code}/ocean_depth_index.json`;
        if (fs.existsSync(oceanPath)) {
            const oceanData = JSON.parse(fs.readFileSync(oceanPath, 'utf-8'));
            const features = oceanData.depths.map(d => {
                let coords = d.p;
                if (coords?.[0]?.[0]?.[0] && Math.abs(coords[0][0][0]) > 180) {
                    coords = coords.map(ring => ring.map(([x, y]) => [
                        (x / 20037508.3427892) * 180.0,
                        (Math.atan(Math.exp(y / 20037508.3427892 * Math.PI)) * 360.0 / Math.PI) - 90.0
                    ]));
                }
                return { type: "Feature", properties: { depth_min: d.d }, geometry: { type: "Polygon", coordinates: coords } };
            });
            
            const publicDataDir = `${fileContents.PATHS.RENDERERDIR}data`;
            if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
            fs.writeFileSync(`${publicDataDir}/${place.code}_ocean.geojson`, JSON.stringify({ type: "FeatureCollection", features }));
        }
    });

    let counter = 0;
    let promises = [];
    console.log("Copying processed data into build directory and generating thumbnails");
    config.places.forEach(place => {
      promises.push(new Promise((resolve) => {
        generateThumbnail(place.code).then((svgString) => {
          fs.rmSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`, { recursive: true, force: true });
          fs.mkdirSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`);
          fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/buildings_index.json`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/buildings_index.json`);
          fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/demand_data.json`);
          fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/roads.geojson`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/roads.geojson`);
          fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/runways_taxiways.geojson`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/runways_taxiways.geojson`);
          if (fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}/ocean_depth_index.json`)) {fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/ocean_depth_index.json`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/ocean_depth_index.json`);}
          fs.writeFileSync(`${fileContents.PATHS.RENDERERDIR}/city-maps/${place.code.toLowerCase()}.svg`, svgString);
          const listOfPlaceFiles = fs.readdirSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`);
          listOfPlaceFiles.forEach(fileName => {
            execSync(`gzip -f ${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/${fileName}`);
          });
          console.log(`Finished copying amd compressing data for ${place.code} (${++counter} of ${config.places.length})`);
          resolve();
        });
      }));
    });
    return Promise.all(promises).then(() => {
      console.log("Killing tile server process");
      childProcess.kill();
      console.log("Finished adding maps!");
      return fileContents;
    });
}
