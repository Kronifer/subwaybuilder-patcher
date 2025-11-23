# SubwayBuilder Patcher

Does what it says on the tin. Patches the game using any packages put into patcher/packages (MAP PATCHER INCLUDED BY DEFAULT).

## Support
This tool will patch an appimage (linux) or create a modified version of the install directory. I would add support for macos, but i don't have a mac so the best i can do is give you what piemadd gave you from the original version of the mod (if someone who has a mac wants to improve support submit a PR please i dont have like 1200 dollars and im pretty sure macos VMs kinda suck)

## Downloading
Git, wow. You know the drill. Or maybe you don't. I am assuming you have some experience with git and nodejs to use this tool. I'm sorry if you dont (I'll try to make an in depth video tutorial at some point on how to install node and run this if you aren't *super* technical (new guy here a GUI would be nice but i really really hate html+css+js so don't get your hopes up)).

1. `git clone https://github.com/kronifer/subwaybuilder-patcher`
2. cd `subwaybuilder-patcher`
3. `npm install`

Additionally, the following tools are required to be installed:
- appimagetool (LINUX ONLY)
  - Go [here](https://github.com/AppImage/appimagetool/releases/tag/continuous)
  - Download the latest version for your chip type (most likely `appimagetool-x86_64.AppImage`)
  - Rename the file to `appimagetool.AppImage` and copy it here


## Config
The program needs to know what packages to run. For example, if you have the mapPatcher package installed, your config should look like this:

This is a valid `config.js`:
```js
const config = {
  "subwaybuilderLocation": "C:\\Users\\runke\\AppData\\Local\\Programs\\Subway\ Builder\\", // appimage location image on linux or install directory on windows (something like C:\\Users\\[username]\\AppData\\Local\\Programs\\Subway\ Builder)
  "platform": "windows", // either 'linux' or 'windows'
  "packagesToRun": ["mapPatcher"] // Order matters! This will run the map patcher first
};

export default config;
```

## Patching the Game
Run `node ./patcher/patch_game.js`. Make sure any installed packages under the patcher/packages directory have been configured and installed as well!

## For Developers
For your package to be loaded, it must contain a `patcherExec.js` file, exporting a `patcherExec(fileContents)` function that accepts a dictionary of fileContents. Currently, this provides access to index and GameMain.js, as well as paths to the renderer city-maps folder and the resources folder of the game. You must return this same dictionary for your changes to be made and so other packages function correctly.
