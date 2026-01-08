const config = {
  "tile-zoom-level": 16, // zoom level for map tiles to download
  "places": [
    {
      "country": "US",
      "code": "YYZ",
      "name": "Toronto",
      "description": "sideways chicago. da windy city babayyyyy",
      "bbox": [-79.671478, 43.571686, -79.232368, 43.788693], // -79.454498,43.624458,-79.310818,43.680412
      "population": 2700000,
      "initialViewState": { // OPTIONAL: CUSTOM INITIAL VIEW STATE FOR THE CITY IN THE GAME
        "zoom": 12.5,
        "latitude": 43.70011,
        "longitude": -79.4163,
        "bearing": 0
      },
      "thumbnailBbox": [-79.630597,43.643208,-79.276123,43.772823] // OPTIONAL: CUSTOM BBOX FOR THUMBNAIL GENERATION (IF NOT SET, WILL USE bbox FIELD)
    },
  ],
};

export default config;