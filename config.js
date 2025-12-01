// See config_macos, config_linux, config_linux for examples
const config = {
  "subwaybuilderLocation": "/Applications/Subway Builder.app", // app location (or something like /Users/[username]/Applications/Subway Builder.app')
  "platform": "macos", // 'macos', 'linux' or 'windows'
  "packagesToRun": [
    "mapPatcher",
    "addTrains"
  ]
};

export default config;