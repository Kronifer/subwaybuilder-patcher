import fs from 'fs';
import config from './config.js';
import { execSync } from 'child_process';

const stringReplaceAt = (string, startIndex, endIndex, replacement) => {
    return string.substring(0, startIndex) + replacement + string.substring(endIndex + 1);
};

const oldStrCoords =
`function strCoords(_0x1cd87d) {
  return _0x1cd87d[0] + "-" + _0x1cd87d[1];
}
function unStrCoords(_0xb4f974) {
  const _0x44c3ab = _0x2e04, _0x877670 = _0xb4f974["startsWith"]("-");
  _0x877670 && (_0xb4f974 = _0xb4f974[_0x44c3ab(316)](1));
  const [_0x2cadc8, _0x16a92b] = _0xb4f974[_0x44c3ab(309)]("-")[_0x44c3ab(301)](Number);
  return [_0x877670 ? -_0x2cadc8 : _0x2cadc8, _0x16a92b];
}`;
const newStrCoords =
`function strCoords(_0x1cd87d) {
  return _0x1cd87d[0].toFixed(8) + "," + _0x1cd87d[1].toFixed(8); // Should be lots of detail
}
function unStrCoords(_0xb4f974) {
  const _0x44c3ab = _0x2e04, _0x877670 = _0xb4f974["startsWith"](",");
  _0x877670 && (_0xb4f974 = _0xb4f974[_0x44c3ab(316)](1));
  const [_0x2cadc8, _0x16a92b] = _0xb4f974[_0x44c3ab(309)](",")[_0x44c3ab(301)](Number);
  return [_0x877670 ? -_0x2cadc8 : _0x2cadc8, _0x16a92b];
}
`

export function patcherExec(fileContents) {
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
    console.log("Modifying cities list");
    const startOfCitiesArea = fileContents.INDEX.indexOf('const cities = [{') + 'const cities = '.length; // will give us the start of the array
    const endOfCitiesArea = fileContents.INDEX.indexOf('}];', startOfCitiesArea) + 2;
    if (startOfCitiesArea == -1 || endOfCitiesArea == -1) throw new Error("Could not find cities array in index.js");
    let existingListOfCitiesRaw = fileContents.INDEX.substring(startOfCitiesArea, endOfCitiesArea - 1) + ", ";
    config.places.forEach(place => {
        fs.cpSync(`${import.meta.dirname}/placeholder_mapimage.svg`, `${fileContents.PATHS.RENDERERDIR}/city-maps/${place.code.toLowerCase()}.svg`);
        existingListOfCitiesRaw += JSON.stringify({
            name: place.name,
            code: place.code,
            description: place.description,
            population: place.population,
            initialViewState: {
                zoom: 13.5,
                latitude: (place.bbox[1] + place.bbox[3]) / 2,
                longitude: (place.bbox[0] + place.bbox[2]) / 2,
                bearing: 0,
            }
        }) + ", ";
    });
    const finalCitiesList = existingListOfCitiesRaw.slice(0, -2) + ']';
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
    console.log("Fixing pathfinding for negative longitudes");
    fileContents.INDEX = fileContents.INDEX.replace(oldStrCoords, newStrCoords);

    //gameMainAfterParksMapConfigMod = gameMainAfterParksMapConfigMod.replace('"source-layer": "buildings"', '"source-layer": "building"'); // Slight discrepency in naming convention
    fileContents.GAMEMAIN = fileContents.GAMEMAIN.replaceAll('"source-layer": "airports",', '"source-layer": "landuse",\n        filter: ["==", ["get", "kind"], "aerodrome"],').replaceAll("showOceanFoundations: layersToShow.oceanFoundations", "showOceanFoundations: !layersToShow.oceanFoundations");
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
    config.places.forEach(place => {
      if(!fs.existsSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`)) {
        fs.mkdirSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`);
      }
      fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/buildings_index.json`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/buildings_index.json`);
      fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/demand_data.json`);
      fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/roads.geojson`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/roads.geojson`);
      fs.cpSync(`${import.meta.dirname}/processed_data/${place.code}/runways_taxiways.geojson`, `${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/runways_taxiways.geojson`);
      const listOfPlaceFiles = fs.readdirSync(`${fileContents.PATHS.RESOURCESDIR}/data/${place.code}`);
      listOfPlaceFiles.forEach(fileName => {
        execSync(`gzip -f ${fileContents.PATHS.RESOURCESDIR}/data/${place.code}/${fileName}`);
      });
    });
    return fileContents;
}