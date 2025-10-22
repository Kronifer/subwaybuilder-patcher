const config = {
  "subwaybuilderLocation": "C:\\Users\\runke\\AppData\\Local\\Programs\\Subway\ Builder\\", // appimage location image on linux or install directory on windows (something like C:\\Users\\[username]\\AppData\\Local\\Programs\\Subway\ Builder)
  "maptiler_key": "YOUR_MAPTILER_KEY", // your maptiler api key
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
      "description": "chinese",
      "bbox": [-123.272095,49.104107,-122.728100,49.371643], // -123.224258,49.198579,-123.023438,49.316569
      "population": 2642825,
    }
  ],
  "platform": "windows" // either 'linux' or 'windows'
};

export default config;