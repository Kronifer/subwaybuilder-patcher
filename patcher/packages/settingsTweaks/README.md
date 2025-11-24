## Dependencies
- No additional dependencies beyond the patcher

## Available settings
- Change the game simulation speeds associated with 1, 2, 3, and 4 speed
- Change the minimum allowed turn radius
- Change the maximum allowed slope percentage
- Change the starting money amount

## Config
The configuration file will specify which settings you wish to change and what you wish to set them to.  Each setting can be independently controlled - so if you don't want to change the maximum slope percentage, then turn that off by setting it to `false`.  The `config_example.js` file should give you a good idea how to use it.  Here is an example `config.js` that changes all currently implemented settings:
```js
const config = {
    "changeGameSpeeds" : true, // true or false. Determines whether to change the simulation speeds
    "gameSpeeds" : [1, 100, 1000, 4000], // Simulation speed factor for each game speed - game default is [1, 25, 250, 500] - I recommend [1, 100, 1000, 4000]
    
    "changeMinTurnRadius" : true, // true or false. Determines whether to change the minimum allowed turn radius when building tracks
    "minTurnRadius" : 20, // Minimum allowed turn radius in meters - game default is 29
    
    "changeMaxSlope" : true, // true or false. Determines whether to change the maximum allowed slope percentage when building tracks
    "maxSlope" : 8, // Maximum allowed slope percentage - game default is 4
    
    "changeStartingMoney" : true, // true or false. Determines whether to change the starting money for new games
    "startingMoney" : 10, // Starting money in billions - game default is 3 billion
};

export default config;
```

## Usage
That's it.  To use these changed settings, in your patcher `config.js`, ensure you have `"settingsTweaks"` included in the `"packagesToRun"`.  For example, if you wanted to use this in addition to the `mapPatcher`, you'd have this in your patcher `config.js`:
```
js
const config = {
  "subwaybuilderLocation": "C:\\Users\\runke\\AppData\\Local\\Programs\\Subway\ Builder\\", // appimage location image on linux or install directory on windows (something like C:\\Users\\[username]\\AppData\\Local\\Programs\\Subway\ Builder)
  "platform": "windows", // either 'linux' or 'windows'
  "packagesToRun": ["mapPatcher", "settingsTweaks"]
};

export default config;
```

The order of the packages in `"packagesToRun"` does not matter.  Enjoy.
