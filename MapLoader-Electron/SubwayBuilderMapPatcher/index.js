const config = ${REPLACE};

config.places.forEach(async place => {
    let publicDir = await window.electron.getModsFolder();
    publicDir = publicDir.replaceAll('\\', '/').replace("/mods", '/public/data/city-maps/');
    let newPlace = {
        code: place.code,
        name: place.name,
        population: place.population,
        description: place.description,
        mapImageUrl: `file:///${publicDir}${place.code}.svg` // Tries to pull this from the app.asar instead of public/
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
        tilesUrl: `http://127.0.0.1:8080/${place.code}/{z}/{x}/{y}.mvt`,
        foundationTilesUrl: `https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png`,
        maxZoom: config["tile-zoom-level"]
    })
    window.SubwayBuilderAPI.cities.setCityDataFiles(place.code, { // auto appends .gz, is this intended? if it is then its fine if not then that has to be removed so we can manually set the .gz file extension
        buildingsIndex: `/data/${place.code}/buildings_index.json`,
        demandData: `/data/${place.code}/demand_data.json`, // drivingPaths supplied in demand_data.json.gz still aren't used
        roads: `/data/${place.code}/roads.geojson`,
        runwaysTaxiways: `/data/${place.code}/runways_taxiways.geojson`,
    })
})