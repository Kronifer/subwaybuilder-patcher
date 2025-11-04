const config = {
  "subwaybuilderLocation": "C:\\Users\\runke\\AppData\\Local\\Programs\\Subway\ Builder\\", // appimage location image on linux or install directory on windows (something like C:\\Users\\[username]\\AppData\\Local\\Programs\\Subway\ Builder)
  "tile-zoom-level": 16, // zoom level for map tiles to download
  "protomaps-bucket": "https://build.protomaps.com/20251023.pmtiles",
  "places": [
    {
      "code": "YWG",
      "name": "Winnipeg",
      "description": "chicago if it was tiny",
      "bbox": [-97.334061,49.766631,-96.958466,49.977059], // -79.454498,43.624458,-79.310818,43.680412
      "population": 850000,
    },
    {
      "code": "YVR",
      "name": "Vancouver",
      "description": "coastal",
      "bbox": [-123.272095,49.104107,-122.728100,49.371643], // -123.224258,49.198579,-123.023438,49.316569
      "population": 2642825,
    },
    {
      "code": "HKG",
      "name": "Hong Kong",
      "description": "awesome",
      "bbox": [113.779221,22.096456,114.408531,22.561985],
      "population": 7500700,
    },
    {
      "name": "Singapore",
      "code": "SIN",
      "description": "tropical",
      "bbox": [103.595409,1.147308,104.091339,1.479128],
      "population": 6800000,
    }
  ],
  "platform": "windows" // either 'linux' or 'windows'
};

export default config;