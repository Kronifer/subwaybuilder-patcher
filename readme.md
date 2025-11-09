# SubwayBuilder Patcher

Does what it says on the tin. Currently just adds new cities into the game, but I'm hoping to (eventually) make other aspects of the game more accessible to mod. But also the codebase changes with every update to the game and we don't have unobfuscated bindings or any unobfuscated code so uhhhh who knows whats gonna happen

## Support
This tool will patch an appimage (linux) or create a modified version of the install directory. I would add support for macos, but i don't have a mac so the best i can do is give you what piemadd gave you from the original version of the mod (if someone who has a mac wants to improve support submit a PR please i dont have like 1200 dollars and im pretty sure macos VMs kinda suck)

## Limitations
All of the data is fetched from OpenStreetMap, so population data and distribution data and pretty much literally everything but the actual physical layout of the cities being added (sometimes even that isnt fully right) is very basic. i literally havent touched process_data.js since i forked this but maybe (hopefully) ill make it better eventually

## Downloading
Git, wow. You know the drill. Or maybe you don't. I am assuming you have some experience with git and nodejs to use this tool. I'm sorry if you dont (I'll try to make an in depth video tutorial at some point on how to install node and run this if you aren't *super* technical (new guy here a GUI would be nice but i really really hate html+css+js so don't get your hopes up)).

1. `git clone https://github.com/kronifer/subwaybuilder-patcher`
2. cd `subwaybuilder-patcher`
3. `npm install`

Additionally, the following tools are required to be installed:
- gzip (if you're on windows try [this](https://gnuwin32.sourceforge.net/packages/gzip.htm), but the installers might be a little cooked)
- [PMTiles](https://github.com/protomaps/go-pmtiles/releases/latest) (put executable in the map_tiles directory)
- appimagetool (LINUX ONLY)
  - Go [here](https://github.com/AppImage/appimagetool/releases/tag/continuous)
  - Download the latest version for your chip type (most likely `appimagetool-x86_64.AppImage`)
  - Rename the file to `appimagetool.AppImage` and copy it here


## Config
Well, the program needs to know what cities you want to download and patch in. Gotta configure that. To do so, you can modify `config.js`. Within this file, you need to add `places`. Most of this is self explanatory I want to say. Code (ie the city's main airport code), Name, Description, and Bounding Box. To get a valid bounding box:

1. Go to [bboxfinder.com](https://bboxfinder.com/).
2. Select your city with the tools in the top left.  
  a. For the simplest, just press the rectangle and drag.  
  b. You can have multiple combined shapes and arbitrary polygons. Go fucking wild.
3. Select the text next to 'Box' at the bottom.  
  a. Should look like this: `-79.405575,43.641169,-79.363003,43.663029`
4. Paste that into the `bbox` field for this `place` in your `config.js`.

Additionally, you need to insert the location of your SubwayBuilder install (if on linux, the appimage location, if on windows, the install directory) and you need to specify what operating system you're using (either windows or linux).

also new step you need to grab the latest protomaps bucket from [maps.protomaps.com/builds](https://maps.protomaps.com/builds/) and paste the latest download link into the `protomaps-bucket` field

There are valid sample configurations for windows and linux at `config_windows.js` and `config_linux.js` respectively.

This is a valid `config.js`:
```js
const config = {
  "subwaybuilderLocation": "C:\\Users\\username\\AppData\\Local\\Programs\\Subway\ Builder\\", // appimage location image on linux or install directory on windows (something like C:\\Users\\[username]\\AppData\\Local\\Programs\\Subway\ Builder)
  "tile-zoom-level": 16, // zoom level for map tiles to download (16 is the max)
  "protomaps-bucket": "https://build.protomaps.com/20251104.pmtiles", // Grab the latest download link from https://maps.protomaps.com/builds/
  "places": [
    {
      "code": "YWG",
      "name": "Winnipeg",
      "description": "chicago if it was tiny",
      "bbox": [-97.334061,49.766631,-96.958466,49.977059], // -79.454498,43.624458,-79.310818,43.680412
      "population": 850000,
    }
  ],
  "platform": "windows" // either 'linux' or 'windows'
};

export default config;
```

## Running Scripts
There are many scripts. Great scripts. Wonderful scripts. You don't need to run them all, but you certainly can.

### AHHHHHH I DONT KNOW WHAT IM DOING JUST GIVE ME EVERYTHING PLEASE
> `npm run all`

Will run every script (downloading data, tiles, parsing them, and patching the game.) Make sure you are running it in the patcher directory, not the scripts!

### Download Tiles (REQUIRES PMTILES CLI EXECUTABLE TO BE IN "map_tiles" DIRECTORY)
> `node ./scripts/download_tiles.js`

Downloads map tiles for places specified in `config.js` to be served by `pmtiles`. To play the game with map tiles, run `scripts/serve.ps1` or `scripts/serve.sh` from a terminal or file manager.


### Download Data
> `node ./scripts/download_data.js`

Takes the array of places within `config.js` and downloads OSM data from the [Overpass API](https://overpass-api.de/).

### Process Data
> `node ./scripts/process_data.js`

Processes the previously downloaded data into folders that SubwayBuilder can understand. These will be located in the folder named `processed_data/`. (THIS IS ALSO SOMETHING I REALLY REALLY SHOULD REWRITE)

### Patch Game
> `node ./scripts/patch_game.js`

Patches the places into an appimage (linux) or the install folder (windows). In both cases, the patched version of the game will appear here under a folder named `subwaybuilder-patched-sbp/`. Your original installation will not be overwritten, so you can still use it for vanilla saves if you want (but vanilla saves are now fully supported after some bullshit patching)

**NOTE**: If you already have a built map (from the discord or if you generated your own map with better scripts or with actual census data instead of random guesswork), you can skip the first two scripts and place your built map within `processed_data/`. You ***will still need to*** create a valid configuration for this map within `config.js`, but can avoid having to run the downloading and processing scripts. After doing so, you can run the Patch Game script as normal.

### Serve Map Tiles
**For Windows**: 
```
cd scripts
.\serve.ps1
```
**For Linux/MacOS(Mac untested)**
```
cd scripts
./serve
```

---

ok thats all thanks for reading this readme
