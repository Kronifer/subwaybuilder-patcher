import fs from 'fs';
import config from './config.js';
import * as turf from '@turf/turf';
import { createParseStream } from 'big-json';

const optimizeBuilding = (unOptimizedBuilding) => {
  return {
    b: [unOptimizedBuilding.minX, unOptimizedBuilding.minY, unOptimizedBuilding.maxX, unOptimizedBuilding.maxY],
    f: unOptimizedBuilding.foundationDepth,
    p: unOptimizedBuilding.polygon,
  }
};

const CS = 0.0009; // This is what the cell size always is in the base game

const optimizeIndex = (unOptimizedIndex) => {
  return {
    cs: CS,
    bbox: [unOptimizedIndex.minLon, unOptimizedIndex.minLat, unOptimizedIndex.maxLon, unOptimizedIndex.maxLat],
    grid: [unOptimizedIndex.cols, unOptimizedIndex.rows],
    cells: Object.keys(unOptimizedIndex.cells).map((key) => [...key.split(',').map((n) => Number(n)), ...unOptimizedIndex.cells[key]]),
    buildings: unOptimizedIndex.buildings.map((unOptimizedBuilding) => optimizeBuilding(unOptimizedBuilding)),
    stats: {
      count: unOptimizedIndex.buildings.length,
      maxDepth: unOptimizedIndex.maxDepth,
    }
  }
};

// how much square footage we should probably expect per resident of this housing type
// later on ill calculate the cross section of the building's square footage, 
// then multiply that but the total number of floors to get an approximate full square footage number
// i can then divide by the below number to get a rough populaion stat
const squareFeetPerPopulation = {
  yes: 600, // most likely a SFH
  apartments: 240,
  barracks: 100, // google said 70-90, but imma bump it up a bit tbh
  bungalow: 600, // sfh
  cabin: 600, // sfh
  detached: 600, // sfh
  annexe: 240, // kinda like apartments
  dormitory: 125, // good lord
  farm: 600, // sfh
  ger: 240, // technically sfh, but generally usually smaller and more compact. honorary apartment. TIL "ger" is mongolian for the english word "yurt"
  hotel: 240, // gonna count these as apartments because hotel guests use transit too
  house: 600, // sfh
  houseboat: 600, // interdasting
  residential: 600, // could be anything, but im assuimg sfh here
  semidetached_house: 400, // duplex
  static_caravan: 500,
  stilt_house: 600,
  terrace: 500, // townhome
  tree_house: 240, // fuck it
  trullo: 240, // there is nothing scientific here, its all fucking vibes
};

const squareFeetPerJob = {
  commercial: 150, // non specific, restaraunts i guess?
  industrial: 500, // vibes vibes vibes vibes!!!!!,
  kiosk: 50, // its all vibes baby
  office: 150, // all of my vibes are 100% meat created
  retail: 300,
  supermarket: 300,
  warehouse: 500,
  // the following are all religious and im assuming ~100 square feet, not for job purposes, 
  // but for the fact that people go to religious institutions
  // might use a similar trick for sports stadiums
  religious: 100,
  cathedral: 100,
  chapel: 100,
  church: 100,
  kingdom_hall: 100,
  monastery: 100,
  mosque: 100,
  presbytery: 100,
  shrine: 100,
  synagogue: 100,
  temple: 100,
  // end of religious
  bakehouse: 300,
  college: 250, // collge/uni is a job
  fire_station: 500,
  government: 150,
  gatehouse: 150,
  hospital: 150,
  kindergarten: 100,
  museum: 300,
  public: 300,
  school: 100,
  train_station: 1000,
  transportation: 1000,
  university: 250,
  // sports time! im going to treat these like offices because i said so.
  // i think itll end up creating demand thats on average what stadiums see traffic wise. not sure
  grandstand: 150,
  pavilion: 150,
  riding_hall: 150,
  sports_hall: 150,
  sports_centre: 150,
  stadium: 150,
};

let terminalTicker = 0;
let uniTicker = 0;

const processPlaceConnections = (place, rawBuildings, rawPlaces) => {
  let neighborhoods = {};
  let centersOfNeighborhoods = {};
  let calculatedBuildings = {};

  // finding areas of neighborhoods
  rawPlaces.forEach((place) => {
    if (place.tags.place && (place.tags.place == 'quarter' || place.tags.place == 'neighbourhood') || (place.tags.aeroway && place.tags.aeroway == 'terminal') || (place.tags.amenity && place.tags.amenity == 'university')) {
      neighborhoods[place.id] = place;
      if (place.type == 'node') {
        centersOfNeighborhoods[place.id] = [place.lon, place.lat];
      } else if (place.type == 'way' || place.type == 'relation') {
        const center = [(place.bounds.minlon + place.bounds.maxlon) / 2, (place.bounds.minlat + place.bounds.maxlat) / 2];
        centersOfNeighborhoods[place.id] = center;
      }
    }
  });

  const centersOfNeighborhoodsFeatureCollection = turf.featureCollection(
    Object.keys(centersOfNeighborhoods).map((placeID) =>
      turf.point(centersOfNeighborhoods[placeID], {
        placeID,
        name: neighborhoods[placeID].tags.name
      })
    )
  );

  // splitting everything into areas
  const voronoi = turf.voronoi(centersOfNeighborhoodsFeatureCollection, {
    bbox: place.bbox,
  })
  voronoi.features = voronoi.features.filter((feature) => feature);

  // sorting buildings between residential and commercial
  rawBuildings.forEach((building) => {
    if (building.tags.building) { // should always be true, but why not
      const __coords = building.geometry.map((point) => [point.lon, point.lat]);
      if (__coords.length < 3) return;
      if (__coords[0][0] !== __coords[__coords.length - 1][0] || __coords[0][1] !== __coords[__coords.length - 1][1]) __coords.push(__coords[0]);
      const buildingGeometry = turf.polygon([__coords]);
      let buildingAreaMultiplier = Math.max(Number(building.tags['building:levels']), 1); // assuming a single story if no level data
      if (isNaN(buildingAreaMultiplier)) buildingAreaMultiplier = 1;
      const buildingArea = turf.area(buildingGeometry) * buildingAreaMultiplier * 10.7639; // that magic number converts from square meters to square feet
      const buildingCenter = [(building.bounds.minlon + building.bounds.maxlon) / 2, (building.bounds.minlat + building.bounds.maxlat) / 2];

      if (squareFeetPerPopulation[building.tags.building]) { // residential
        const approxPop = Math.floor(buildingArea / squareFeetPerPopulation[building.tags.building]);
        calculatedBuildings[building.id] = {
          ...building,
          approxPop,
          buildingCenter,
        };
      } else if (squareFeetPerJob[building.tags.building]) { // commercial/jobs
        let approxJobs = Math.floor(buildingArea / squareFeetPerJob[building.tags.building]);

        if(building.tags.aeroway && building.tags.aeroway == 'terminal')
          approxJobs *= 20;

        calculatedBuildings[building.id] = {
          ...building,
          approxJobs,
          buildingCenter,
        };
      }
    }
  });

  // so we can do like, stuff with it
  const buildingsAsFeatureCollection = turf.featureCollection(
    Object.values(calculatedBuildings).map((building) =>
      turf.point(building.buildingCenter, { buildingID: building.id })
    )
  );

  let totalPopulation = 0;
  let totalJobs = 0;
  let finalVoronoiMembers = {}; // what buildings are in each voronoi
  let finalVoronoiMetadata = {}; // additional info on population and jobs

  voronoi.features.forEach((feature) => {
    const buildingsWhichExistWithinFeature = turf.pointsWithinPolygon(buildingsAsFeatureCollection, feature);
    finalVoronoiMembers[feature.properties.placeID] = buildingsWhichExistWithinFeature.features;

    const finalFeature = {
      ...feature.properties,
      totalPopulation: 0,
      totalJobs: 0,
      percentOfTotalPopulation: null,
      percentOfTotalJobs: null,
    };

    buildingsWhichExistWithinFeature.features.forEach((feature) => {
      const building = calculatedBuildings[feature.properties.buildingID];
      finalFeature.totalPopulation += (building.approxPop ?? 0);
      finalFeature.totalJobs += (building.approxJobs ?? 0);
      totalPopulation += (building.approxPop ?? 0);
      totalJobs += (building.approxJobs ?? 0);
    });

    finalVoronoiMetadata[feature.properties.placeID] = finalFeature;
  });

  let finalNeighborhoods = {};
  let neighborhoodConnections = [];

  // creating total percents and setting up final dicts
  Object.values(finalVoronoiMetadata).forEach((place) => {
    finalVoronoiMetadata[place.placeID].percentOfTotalPopulation = place.totalPopulation / totalPopulation;
    finalVoronoiMetadata[place.placeID].percentOfTotalJobs = place.totalJobs / totalJobs;

    let id = place.placeID;

    if(neighborhoods[id] && neighborhoods[id].tags && neighborhoods[id].tags.aeroway && neighborhoods[id].tags.aeroway == 'terminal'){
      id = "AIR_Terminal_" + terminalTicker;
      terminalTicker++;
      console.log("New terminal added:", id);
    }
    else if(neighborhoods[id] && neighborhoods[id].tags && neighborhoods[id].tags.amenity && neighborhoods[id].tags.amenity == 'university'){
      id = "UNI_" + uniTicker;
      uniTicker++;
      console.log("New university added:", id);
    }


    finalNeighborhoods[place.placeID] = {
      id: id,
      location: centersOfNeighborhoods[place.placeID],
      jobs: place.totalJobs,
      residents: place.totalPopulation,
      popIds: [],
    }
  });

  Object.values(finalVoronoiMetadata).forEach((outerPlace) => {
    // trust the process bro
    Object.values(finalVoronoiMetadata).forEach((innerPlace) => {
      //const connectionSizeBasedOnResidencePercent = outerPlace.percentOfTotalPopulation * innerPlace.totalJobs;
      let connectionSizeBasedOnJobsPercent = innerPlace.percentOfTotalJobs * outerPlace.totalPopulation;
      // prevent excessive no. of pops
      if(connectionSizeBasedOnJobsPercent <= 50){
        connectionSizeBasedOnJobsPercent = 0;
      }
      const connectionDistance = turf.length(turf.lineString([
        centersOfNeighborhoods[outerPlace.placeID],
        centersOfNeighborhoods[innerPlace.placeID],
      ]), { units: 'meters' });
      const conncetionSeconds = connectionDistance * 0.12; // very scientific (hey, this is something i got from the subwaybuilder data)

      // prevents excessively large pops, causing impossible-to-fit-in-metro groups
      let totalSize = Math.round(connectionSizeBasedOnJobsPercent);
      let splits = Math.ceil(totalSize / 400)

      for(let i = 0; i < splits; i++){
        neighborhoodConnections.push({
          residenceId: outerPlace.placeID,
          jobId: innerPlace.placeID,
          size: Math.round(totalSize / splits),
          drivingDistance: Math.round(connectionDistance),
          drivingSeconds: Math.round(conncetionSeconds),
        })
      }
    });
  });

  // need to populate popIds within finalNeighborhoods
  neighborhoodConnections = neighborhoodConnections
    .filter((connection) => {
      return connection.size > 0;
    })
    .map((connection, i) => {
      const id = i.toString();
      finalNeighborhoods[connection.jobId].popIds.push(id);
      finalNeighborhoods[connection.residenceId].popIds.push(id);
      return {
        ...connection,
        id,
      }
    });

    // handle airport terminals
  neighborhoodConnections.forEach((connection) =>{
    connection.residenceId = finalNeighborhoods[connection.residenceId].id;
    connection.jobId = finalNeighborhoods[connection.jobId].id;
  });

  return {
    points: Object.values(finalNeighborhoods),
    pops: neighborhoodConnections,
  }
};

const processBuildings = (place, rawBuildings) => {
  // looking at the sample data, cells are approximately 100 meters long and wide, so thats what im gonna go with
  let minLon = 9999;
  let minLat = 9999;
  let maxLon = -999;
  let maxLat = -999;

  let processedBuildings = {};

  rawBuildings.forEach((building, i) => {
    let minBuildingLon = 9999;
    let minBuildingLat = 9999;
    let maxBuildingLon = -999;
    let maxBuildingLat = -999;

    const __points = building.geometry.map((coord) => {
      // overall bbox
      if (coord.lon < minLon) minLon = coord.lon;
      if (coord.lat < minLat) minLat = coord.lat;
      if (coord.lon > maxLon) maxLon = coord.lon;
      if (coord.lat > maxLat) maxLat = coord.lat;

      // building bbox
      if (coord.lon < minBuildingLon) minBuildingLon = coord.lon;
      if (coord.lat < minBuildingLat) minBuildingLat = coord.lat;
      if (coord.lon > maxBuildingLon) maxBuildingLon = coord.lon;
      if (coord.lat > maxBuildingLat) maxBuildingLat = coord.lat;

      return [coord.lon, coord.lat];
    });
    if (__points.length < 3) return;
    if (__points[0][0] !== __points[__points.length - 1][0] || __points[0][1] !== __points[__points.length - 1][1]) __points.push(__points[0]);
    const buildingPolygon = turf.polygon([__points]);
    const buildingCenter = turf.centerOfMass(buildingPolygon);

    processedBuildings[i] = {
      bbox: {
        minLon: minBuildingLon,
        minLat: minBuildingLat,
        maxLon: maxBuildingLon,
        maxLat: maxBuildingLat,
      },
      center: buildingCenter.geometry.coordinates,
      ...building,
      id: i,
      geometry: buildingPolygon.geometry.coordinates,
    }
  });

// === Cell size taken from R analysis ===
const cs  = 0.0009; // latitude (deg)
const latMid = (minLat + maxLat) / 2;
const distortionFactor = 1 / Math.cos(latMid * Math.PI / 180);
const cs_x = cs * distortionFactor;

// Compute grid dimensions
const grid_x = Math.ceil((maxLon - minLon) / cs_x);
const grid_y = Math.ceil((maxLat - minLat) / cs);

// Build boundary coordinate arrays
let columnCoords = [];
for (let i = 0; i <= grid_x; i++) {
  columnCoords.push(minLon + i * cs_x);
}

let rowCoords = [];
for (let j = 0; j <= grid_y; j++) {
  rowCoords.push(minLat + j * cs);
}

// Build cell dictionary with optimized assignment
let cellsDict = {};
Object.values(processedBuildings).forEach(b => {
  // Calculate which cells the building's bbox spans
  let start_col = Math.floor((b.bbox.minLon - minLon) / cs_x);
  let end_col = Math.floor((b.bbox.maxLon - minLon) / cs_x);
  let start_row = Math.floor((b.bbox.minLat - minLat) / cs);
  let end_row = Math.floor((b.bbox.maxLat - minLat) / cs);
  
  start_col = Math.max(0, start_col);
  end_col = Math.min(grid_x - 1, end_col);
  start_row = Math.max(0, start_row);
  end_row = Math.min(grid_y - 1, end_row);
  
  // Check if building spans multiple cells
  const spansMultipleCells = (end_col > start_col) || (end_row > start_row);
  
  if (spansMultipleCells) {
    // For multi-cell buildings, check actual intersection with each cell
    const buildingPoly = turf.polygon(b.geometry);
    
    for (let c = start_col; c <= end_col; c++) {
      for (let r = start_row; r <= end_row; r++) {
        // Create cell polygon
        const cellMinLon = columnCoords[c];
        const cellMaxLon = columnCoords[c + 1];
        const cellMinLat = rowCoords[r];
        const cellMaxLat = rowCoords[r + 1];
        
        const cellPoly = turf.polygon([[
          [cellMinLon, cellMinLat],
          [cellMaxLon, cellMinLat],
          [cellMaxLon, cellMaxLat],
          [cellMinLon, cellMaxLat],
          [cellMinLon, cellMinLat]
        ]]);
        
        // Check if building actually intersects this cell
        try {
          if (turf.booleanIntersects(buildingPoly, cellPoly)) {
            const key = `${c},${r}`;
            if (!cellsDict[key]) cellsDict[key] = [];
            cellsDict[key].push(b.id);
          }
        } catch (e) {
          // If intersection check fails, include it to be safe
          const key = `${c},${r}`;
          if (!cellsDict[key]) cellsDict[key] = [];
          cellsDict[key].push(b.id);
        }
      }
    }
  } else {
    // Single cell building - just add it directly using bbox
    const key = `${start_col},${start_row}`;
    if (!cellsDict[key]) cellsDict[key] = [];
    cellsDict[key].push(b.id);
  }
});

let maxDepth = 1; // Track the maximum depth

const optimizedIndex = optimizeIndex({
  cellHeightCoords: cs,
  minLon,
  minLat,
  maxLon,
  maxLat,
  cols: columnCoords.length,
  rows: rowCoords.length,
  cells: cellsDict,
  buildings: Object.values(processedBuildings).map((building) => {
const foundationDepth = (() => {
  // Try to get height in meters from tags
  const heightRaw = building.tags['building:height'] || building.tags.height;
  
  if (heightRaw) {
    // Strip out non-numeric characters (except decimal point and minus sign)
    const heightCleaned = String(heightRaw).replace(/[^\d.-]/g, '');
    const heightInMeters = Number(heightCleaned);
    
    if (heightInMeters && !isNaN(heightInMeters) && heightInMeters > 0) {
      // Use actual height divided by 10 (positive)
      return Math.max(1, Math.floor(heightInMeters / 10));
    }
  }
  
  // Fallback: estimate height from levels (assuming 3m per level)
  if (building.tags['building:levels']) {
    const levels = Number(building.tags['building:levels']);
    if (!isNaN(levels) && levels > 0) {
      const estimatedHeight = levels * 3;
      return Math.max(1, Math.floor(estimatedHeight / 10));
    }
  }
  
  // Final fallback if no height or levels data
  return 2;
})();

    // Track the maximum foundation depth
    if (foundationDepth > maxDepth) {
      maxDepth = foundationDepth;
    }

    return {
      minX: building.bbox.minLon,
      minY: building.bbox.minLat,
      maxX: building.bbox.maxLon,
      maxY: building.bbox.maxLat,
      foundationDepth,
      polygon: building.geometry,
    }
  }),
  maxDepth,
});

return optimizedIndex;
}

// Converts water.geojson to ocean_depth_index.json
const processWater = (place) => {

  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  const inputPath = `${import.meta.dirname}/raw_data/${place.code}/water.geojson`;
  if (!fs.existsSync(inputPath)) {
    console.warn(`No water.geojson found for ${place.code}`);
    return null;
  }
  const geojson = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  if (!geojson.features || geojson.features.length === 0) {
    console.warn(`No water features found in ${inputPath}`);
    return null;
  }

  // Calculate global bounds
  geojson.features.forEach(f => {
    const bbox = turf.bbox(f);
    if (bbox[0] < minLon) minLon = bbox[0];
    if (bbox[1] < minLat) minLat = bbox[1];
    if (bbox[2] > maxLon) maxLon = bbox[2];
    if (bbox[3] > maxLat) maxLat = bbox[3];
  });
  const bounds = [minLon, minLat, maxLon, maxLat];

  // Cell size (from ocean_depth.py, cs_y = 0.0027)
  const cs_y = 0.0027;
  const center_lat = (minLat + maxLat) / 2.0;
  const cs_x = cs_y / Math.cos(center_lat * Math.PI / 180);
  const width = maxLon - minLon;
  const height = maxLat - minLat;
  const cols = Math.ceil(width / cs_x);
  const rows = Math.ceil(height / cs_y);

  // Build polygons array
  const polygons = [];
  
  geojson.features.forEach(f => {
    const type = f.geometry.type;
    const coordinates = f.geometry.coordinates;

    if (type === 'Polygon') {
      const rings = coordinates;
      // Calculate bbox for this polygon (from exterior ring)
      const polyFeature = turf.polygon(rings);
      const bbox = turf.bbox(polyFeature);
      
      polygons.push({
        b: bbox,
        d: -4,
        p: rings
      });
    } else if (type === 'MultiPolygon') {
      // Flatten MultiPolygon into individual Polygons
      coordinates.forEach(polyCoords => {
        const rings = polyCoords;
        const polyFeature = turf.polygon(rings);
        const bbox = turf.bbox(polyFeature);
        
        polygons.push({
          b: bbox,
          d: -4,
          p: rings
        });
      });
    }
  });

  // Assign polygons to grid cells
  let cellsDict = {};
  polygons.forEach((poly, i) => {
    const bbox = poly.b;
    let start_col = Math.floor((bbox[0] - minLon) / cs_x);
    let end_col = Math.floor((bbox[2] - minLon) / cs_x);
    let start_row = Math.floor((bbox[1] - minLat) / cs_y);
    let end_row = Math.floor((bbox[3] - minLat) / cs_y);
    
    start_col = Math.max(0, start_col);
    end_col = Math.min(cols - 1, end_col);
    start_row = Math.max(0, start_row);
    end_row = Math.min(rows - 1, end_row);
    
    for (let c = start_col; c <= end_col; c++) {
      for (let r = start_row; r <= end_row; r++) {
        const key = `${c},${r}`;
        if (!cellsDict[key]) cellsDict[key] = [];
        cellsDict[key].push(i);
      }
    }
  });

  // Convert cellsDict to list
  const cells_list = Object.keys(cellsDict).map((key) => {
    const [c, r] = key.split(',').map(Number);
    return [c, r, ...cellsDict[key]];
  });

  // Stats
  const stats = {
    count: polygons.length,
    minDepth: -4,
    maxDepth: -4
  };

  // Output structure
  return {
    cs: cs_y,
    bbox: bounds,
    grid: [cols, rows],
    cells: cells_list,
    depths: polygons,
    stats
  };
};

const processAllData = async (place) => {
  const readJsonFile = (filePath) => {
    return new Promise((resolve, reject) => {
      const parseStream = createParseStream();
      let jsonData;

      parseStream.on('data', (data) => {
        jsonData = data;
      });

      parseStream.on('end', () => {
        resolve(jsonData);
      });

      parseStream.on('error', (err) => {
        reject(err);
      });

      fs.createReadStream(filePath).pipe(parseStream);
    });
  };

  console.log('Reading raw data for', place.code);
  const rawBuildings = await readJsonFile(`${import.meta.dirname}/raw_data/${place.code}/buildings.json`);
  const rawPlaces = await readJsonFile(`${import.meta.dirname}/raw_data/${place.code}/places.json`);

  console.log('Processing Buildings for', place.code)
  const processedBuildings = processBuildings(place, rawBuildings);
  console.log('Processing Connections/Demand for', place.code)
  const processedConnections = processPlaceConnections(place, rawBuildings, rawPlaces);
  console.log('Processing Water for', place.code)
  const processedWater = processWater(place);

  console.log('Writing finished data for', place.code)
  fs.writeFileSync(`${import.meta.dirname}/processed_data/${place.code}/buildings_index.json`, JSON.stringify(processedBuildings), { encoding: 'utf8' });
  fs.cpSync(`${import.meta.dirname}/raw_data/${place.code}/roads.geojson`, `${import.meta.dirname}/processed_data/${place.code}/roads.geojson`);
  fs.cpSync(`${import.meta.dirname}/raw_data/${place.code}/runways_taxiways.geojson`, `${import.meta.dirname}/processed_data/${place.code}/runways_taxiways.geojson`);
  fs.writeFileSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`, JSON.stringify(processedConnections), { encoding: 'utf8' });
  if (processedWater) {fs.writeFileSync(`${import.meta.dirname}/processed_data/${place.code}/ocean_depth_index.json`, JSON.stringify(processedWater), { encoding: 'utf8' });}
};

if (!fs.existsSync(`${import.meta.dirname}/processed_data`)) fs.mkdirSync(`${import.meta.dirname}/processed_data`);
config.places.forEach((place) => {
  (async () => {
    if (fs.existsSync(`${import.meta.dirname}/processed_data/${place.code}`)) fs.rmSync(`${import.meta.dirname}/processed_data/${place.code}`, { recursive: true, force: true });
    fs.mkdirSync(`${import.meta.dirname}/processed_data/${place.code}`)
    await processAllData(place);
    console.log(`Finished processing ${place.code}.`);
  })();
});
