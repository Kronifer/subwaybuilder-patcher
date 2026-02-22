import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { SphericalMercator } from '@mapbox/sphericalmercator';
import { VectorTile } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import config from './config.js';

const mercator = new SphericalMercator({size: 256});
const pmtilesPath = path.join(import.meta.dirname, 'map_tiles', 'pmtiles');

const extractWater = (place) => {
    console.log(`Extracting water layer for ${place.name}`);
    
    const pmtilesFile = path.join(import.meta.dirname, 'map_tiles', `${place.code}.pmtiles`);
    const outputDir = path.join(import.meta.dirname, 'raw_data', place.code);
    if (!fs.existsSync(outputDir)) {fs.mkdirSync(outputDir);}

    const xyz = mercator.xyz(place.bbox, 13);
    const features = [];
    
    for (let x = xyz.minX; x <= xyz.maxX; x++) {
        for (let y = xyz.minY; y <= xyz.maxY; y++) {
            try {
                const buffer = execSync(`"${pmtilesPath}" tile "${pmtilesFile}" 13 ${x} ${y} | gzip -d -c`, { stdio: ['ignore', 'pipe', 'ignore'] });
                if (!buffer.length) continue;

                const tile = new VectorTile(new Pbf(buffer));
                if (tile.layers.water) {
                    for (let i = 0; i < tile.layers.water.length; i++) {
                        const feature = tile.layers.water.feature(i);
                        if (feature.properties.kind === 'ocean' || feature.properties.kind === 'basin' || feature.properties.kind === 'river' || feature.properties.kind === 'canal' || feature.properties.kind === 'lake' || feature.properties.kind === 'dock' || feature.properties.kind === 'water') {
                            features.push(feature.toGeoJSON(x, y, 13));
                        }
                    }
                }
            } catch (e) {}
        }
    }
    
    console.log(`Extracted ${features.length} water features.`);
    fs.writeFileSync(path.join(outputDir, 'water.geojson'), JSON.stringify({ type: "FeatureCollection", features }));
};

let date = new Date(Date.now() - 172800000); // Two days ago, in case today's and yesterday's builds haven't come out yet

let protomapsBucket = `https://build.protomaps.com/${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}.pmtiles`

console.log("Downloading map tiles");
for(var place of config.places) {
    console.log(`Fetching tiles for ${place.name} (${place.code})`);
    execSync(`${pmtilesPath} extract ${protomapsBucket} --maxzoom=${config['tile-zoom-level']} --bbox="${place.bbox.join(',')}" ${import.meta.dirname}/./map_tiles/${place.code}.pmtiles`);   
    extractWater(place);
}

