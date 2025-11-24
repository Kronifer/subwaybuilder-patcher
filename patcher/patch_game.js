import fs from 'fs';
import config from '../config.js';
import { execSync } from 'child_process';

console.log("Subway Builder Patcher - Written by Kronifer");

if (fs.existsSync("../patching_working_directory/squashfs-root")) {
    fs.rmSync("../patching_working_directory/squashfs-root", { recursive: true, force: true });
}
if (fs.existsSync("../patching_working_directory/extracted-asar")) {
    fs.rmSync("../patching_working_directory/extracted-asar", { recursive: true, force: true });
}

if (config.platform === "windows") {
    console.log("Platform: Windows");
    console.log("Copying game directory");
    fs.cpSync(config.subwaybuilderLocation, `${import.meta.dirname}/../patching_working_directory/squashfs-root`, { recursive: true });
}
else if (config.platform === "linux") {
    console.log("Platform: Linux");
    console.log('Copying AppImage to working directory');
    fs.cpSync(config.subwaybuilderLocation, `${import.meta.dirname}/../patching_working_directory/SB.AppImage`);
    console.log('Extracting AppImage contents')
    fs.chmodSync(`${import.meta.dirname}/../patching_working_directory/SB.AppImage`, '777');
    execSync(`${import.meta.dirname}/../patching_working_directory/SB.AppImage --appimage-extract`, { cwd: `${import.meta.dirname}/../patching_working_directory` });
}
else if (config.platform === "macos") {
    console.log("Platform: MacOS");
    console.log("Copying app contents");
    fs.cpSync(`${config.subwaybuilderLocation}/Contents`, `${import.meta.dirname}../patching_working_directory/squashfs-root`, { recursive: true });
    fs.renameSync(`${import.meta.dirname}../patching_working_directory/squashfs-root/Resources`, `${import.meta.dirname}../patching_working_directory/squashfs-root/resources`);
}

console.log("Extracting app.asar");
execSync(`npx @electron/asar extract ${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/app.asar ${import.meta.dirname}/../patching_working_directory/extracted-asar`);

console.log('Locating index.js')
const filesInPublicDirectory = fs.readdirSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public`);
const shouldBeIndexJS = filesInPublicDirectory.filter((fileName) => fileName.startsWith('index-') && fileName.endsWith('.js'));
console.log('Locating GameMain.js')
const shouldBeGameMainJS = filesInPublicDirectory.filter((fileName) => fileName.startsWith('GameMain-') && fileName.endsWith('.js'));
console.log('Locating interlinedRoutes.js')
const shouldBeInterlinedRoutesJS = filesInPublicDirectory.filter((fileName) => fileName.startsWith('interlinedRoutes') && fileName.endsWith('.js'));
console.log('Locating popCommuteWorker.js')
const shouldBePopCommuteWorkerJS = filesInPublicDirectory.filter((fileName) => fileName.startsWith('popCommuteWorker') && fileName.endsWith('.js'));
if (shouldBeIndexJS.length == 0 || shouldBeGameMainJS.length == 0 || shouldBeInterlinedRoutesJS.length == 0 || shouldBePopCommuteWorkerJS.length == 0) {
    console.error("Could not locate index.js, GameMain.js, interlinedRoutes.js, and/or popCommuteWorker.js in the public directory!");
    process.exit(1);
}

let fileContents = {};
fileContents.INDEX = fs.readFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeIndexJS[0]}`, 'utf-8');
fileContents.GAMEMAIN = fs.readFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeGameMainJS[0]}`, 'utf-8');
fileContents.INTERLINEDROUTES = fs.readFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeInterlinedRoutesJS[0]}`, 'utf-8');
fileContents.POPCOMMUTEWORKER = fs.readFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBePopCommuteWorkerJS[0]}`, 'utf-8');
fileContents.PATHS = {};
fileContents.PATHS.RESOURCESDIR = `${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/`;
fileContents.PATHS.RENDERERDIR = `${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/`;

let promises = [];
for(const packageName of config.packagesToRun) {
    console.log(`Loading package: ${packageName}`);
    const mod = import(`./packages/${packageName}/patcherExec.js`);
    promises.push(mod);
}

Promise.all(promises).then((mods) => {
    mods.forEach(mod => {
        fileContents = mod.patcherExec(fileContents);
    });

    console.log("Writing modified files back to disk");
    fs.writeFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeIndexJS[0]}`, fileContents.INDEX, 'utf-8');
    fs.writeFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeGameMainJS[0]}`, fileContents.GAMEMAIN, 'utf-8');
    fs.writeFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBeInterlinedRoutesJS[0]}`, fileContents.INTERLINEDROUTES, 'utf-8');
    fs.writeFileSync(`${import.meta.dirname}/../patching_working_directory/extracted-asar/dist/renderer/public/${shouldBePopCommuteWorkerJS[0]}`, fileContents.POPCOMMUTEWORKER, 'utf-8');
    console.log("Repacking app.asar");
    execSync(`npx @electron/asar pack ${import.meta.dirname}/../patching_working_directory/extracted-asar ${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/app.asar --unpack-dir=node_modules/{sharp,@rollup,@esbuild,@img,register-scheme}`);
    if (config.platform === "windows") {
        if (fs.existsSync(`${import.meta.dirname}/../SubwayBuilderPatched`)) {
            fs.rmSync(`${import.meta.dirname}/../SubwayBuilderPatched`, { recursive: true, force: true });
        }
        console.log("Writing patched game to disk");
        fs.cpSync(`${import.meta.dirname}/../patching_working_directory/squashfs-root`, `${import.meta.dirname}/../SubwayBuilderPatched`, { recursive: true });
    } else if (config.platform === "linux") {
        if (fs.existsSync(`${import.meta.dirname}/../SubwayBuilderPatched.AppImage`)) {
            fs.rmSync(`${import.meta.dirname}/../SubwayBuilderPatched.AppImage`, { force: true });
        }
        console.log("Repacking AppImage");
        execSync(`appimagetool ${import.meta.dirname}/../patching_working_directory/squashfs-root ${import.meta.dirname}/../SubwayBuilderPatched.AppImage`);
    } else if (config.platform === "macos") {
        const originalAppPath = '/Applications/Subway Builder.app';
        const patchedAppPath = `${import.meta.dirname}/../SubwayBuilderPatched.app`;
        if (fs.existsSync(`${import.meta.dirname}/../SubwayBuilderPatched.app`)) {
            fs.rmSync(`${import.meta.dirname}/../SubwayBuilderPatched.app`, { recursive: true, force: true });
        }
        console.log(`Copying 'Subway Builder.app' from /Applications using ditto to not break signature...`);
        try {
            execSync(`ditto "${originalAppPath}" "${patchedAppPath}"`);
        } catch (error) {
            console.error('ERROR: Failed to copy the application. Please ensure "Subway Builder.app" is in your /Applications folder.');
            console.error(error);
            process.exit(1);
        }
        console.log("Writing patched app to disk");
        fs.cpSync(`${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/app.asar`, `${import.meta.dirname}/../SubwayBuilderPatched.app/Contents/Resources/app.asar`, { recursive: true });
        fs.cpSync(`${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/app.asar.unpacked`, `${import.meta.dirname}/../SubwayBuilderPatched.app/Contents/Resources/app.asar.unpacked`, { recursive: true });
        fs.cpSync(`${patchedAppPath}/Contents/Resources/app.asar.unpacked/node_modules/@img/sharp-libvips-darwin-arm64/lib/libvips-cpp.8.17.3.dylib`, `${patchedAppPath}/Contents/Frameworks/Electron Framework.framework/Versions/A/Libraries`, { recursive: true });
        config.places.forEach((place) => {
            const sourceMapDataPath = `${import.meta.dirname}/../patching_working_directory/squashfs-root/resources/data/${place.code}/`;
            const targetMapDataPath = `${patchedAppPath}/Contents/Resources/data/${place.code}/`;
            if (!fs.existsSync(`${patchedAppPath}/Contents/Resources/data/`)) {
                fs.mkdirSync(`${patchedAppPath}/Contents/Resources/data/`);
            }
            console.log(`Adding data for ${place.name}`);
            fs.cpSync(sourceMapDataPath, targetMapDataPath, { recursive: true });
        });
        console.log('Clearing extended attributes');
        try {
            execSync(`xattr -cr "${patchedAppPath}"`);
        } catch (error) {
            console.warn('Warning: Failed to clear extended attributes.');
            console.warn(error.message);
        }

        console.log('Applying ad-hoc signature to the app');
        try {
            execSync(`codesign --force --deep -s - "${patchedAppPath}"`);
        } catch (error) {
            console.error('ERROR: Failed to sign the application.');
            console.error('Please ensure Xcode Command Line Tools are installed (run: xcode-select --install)');
            console.error(error);
            process.exit(1);
        }

        console.log(`Patched Game is ready at: ${patchedAppPath}`);
        console.log('NOTE: The patched Game is no longer signed by a dev certificate. You may need to right-click > "Open" to run it the first time since you signed it "yourself" :)');
    }

    console.log("Patching complete!");
    console.log("Cleaning up working directory");
    fs.rmSync("../patching_working_directory/squashfs-root", { recursive: true, force: true });
    fs.rmSync("../patching_working_directory/extracted-asar", { recursive: true, force: true });
    console.log("Done!");
});
