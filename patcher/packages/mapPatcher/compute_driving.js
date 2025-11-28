import fs from 'fs';
import config from './config.js';

config.places.forEach(async place => {
    console.log(`Processing driving paths for ${place.code}`);
    const demand = JSON.parse(fs.readFileSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`));
    let ticker = 0;
    const totalPops = demand.pops.length;
    for(let pop of demand.pops) {
        const residence = demand.points.find(point => point.id === pop.residenceId).location;
        const job = demand.points.find(point => point.id === pop.jobId).location;
        let a = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${job.toString()};${residence.toString()}?overview=false&alternatives=false&steps=true&geometries=geojson`);
        let j = await a.json();
        const points = [];
        if(j.routes === undefined) {
            continue;
        }
        j.routes[0].legs[0].steps.forEach(step => {
            step.geometry.coordinates.forEach(coord => {
                points.push(coord);
            })
        });
        pop.drivingPath = points;
        console.log(`Processed pop ${ticker++} of ${totalPops} for ${place.code}`);
    }
    fs.writeFileSync(`${import.meta.dirname}/processed_data/${place.code}/demand_data.json`, JSON.stringify(demand));
})
