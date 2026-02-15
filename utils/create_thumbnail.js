import {VectorTile} from '@mapbox/vector-tile';
import Protobuf from 'pbf';
import {GeoJSON2SVG} from 'geojson2svg';
import * as turf from '@turf/turf';
import { SphericalMercator } from '@mapbox/sphericalmercator';

// By default, precomputes up to z30
const merc = new SphericalMercator({
  size: 800,
  antimeridian: true
});

export function generateThumbnail(cityCode, cityConfig) {
const lon2tile = (lon, zoom) => {
    return Math.floor((lon + 180) / 360 * Math.pow(2, zoom));
}

const lat2tile = (lat, zoom) => {
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}

const bboxToUse = cityConfig.thumbnailBbox ? cityConfig.thumbnailBbox : cityConfig.bbox;

const minXTileCoord = lon2tile(bboxToUse[0], 12);
const maxYTileCoord = lat2tile(bboxToUse[1], 12);
const maxXTileCoord = lon2tile(bboxToUse[2], 12);
const minYTileCoord = lat2tile(bboxToUse[3], 12);

const allTiles = [];

async function fetchWithRetry(url, options = {}, retries = 5, delay = 200) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url, options);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res;
        } catch (err) {
            if (attempt === retries) throw err; // last attempt fails
            console.warn(`Fetch for ${url} failed (attempt ${attempt}): ${err.message}. Retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            delay *= 2; // exponential backoff (optional)
        }
    }
}

for(let x = minXTileCoord; x <= maxXTileCoord; x++) {
    for(let y = minYTileCoord; y <= maxYTileCoord; y++) {
        let req = fetchWithRetry(`http://127.0.0.1:8080/${cityCode}/12/${x}/${y}.mvt`)
        allTiles.push(new Promise((resolve) => {
            req.then(response => response.arrayBuffer()).then(buffer => {
                resolve({"x": x, "y": y, "buffer": buffer});
            })
            setTimeout(() => null, 500);
        }));
    }
};

return Promise.all(allTiles).then((tiles) => {
    let features = {"type":"FeatureCollection","features":[]};
    tiles.forEach(buffer => {
        const tile = new VectorTile(new Protobuf(buffer.buffer));
        const water = tile.layers['water'];
        if(water === undefined) {
            return;
        }
        for(let i = 0; i < water.length; i++) {
            const feature = water.feature(i).toGeoJSON(buffer.x, buffer.y, 12);
            features.features.push(feature);
        }
    });
    let newFeatures = [];
    features.features.forEach(feature => {
        if(feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString") {
            newFeatures.push(turf.buffer(feature, (feature.properties.min_zoom && feature.properties.min_zoom >= 10) ? 0.00025 : 0.0005, {units: 'degrees'}));
            return;
        }
        newFeatures.push(feature);
    });
    features.features = newFeatures;
    let converter = new GeoJSON2SVG({
        viewportSize: {width: 800, height: 800},
        coordinateConverter: merc.forward,
        precision: 2,
        fitTo: 'height'
    });
    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewbox="0 0 800 800" preserveAspectRatio="xMidYMid meet" stroke-linecap="round" stroke-linejoin="round">
    <defs>
    <style>

    :root {
        --water-color: #9FC9EA;
        --bg-color: #F2E7D3;
    }

    svg {
        background: var(--bg-color, #ffffff);
    }
    path, polygon, rect, circle {
        fill: var(--water-color, #3b82f6);
        stroke: none;
    }
    </style>
    </defs>
    <g id="water">`;
    converter.convert(features).forEach(svgEl => {
        svgString += svgEl + '\n';
    });
    svgString += `</g>\n</svg>`;
    return svgString;
});
}


