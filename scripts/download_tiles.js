import { execSync } from 'child_process';
import config from '../config.js';

console.log("Downloading map tiles");
for(var place of config.places) {
    console.log(`Fetching tiles for ${place.name} (${place.code})`);
    if(config.platform === 'windows')
        execSync(`${import.meta.dirname}\\..\\map_tiles\\pmtiles.exe extract ${config['protomaps-bucket']} --maxzoom=${config['tile-zoom-level']} --bbox="${place.bbox.join(',')}" ./map_tiles/${place.code}.pmtiles`);
    else if(config.platform === 'linux' || config.platform === 'macos') 
        execSync(`${import.meta.dirname}/../map_tiles/pmtiles extract ${config['protomaps-bucket']} --maxzoom=${config['tile-zoom-level']} --bbox="${place.bbox.join(',')}" ./map_tiles/${place.code}.pmtiles`);
    
}