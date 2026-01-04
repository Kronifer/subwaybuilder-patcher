import fs from 'fs';
import config from '../config.js';
import { execSync } from 'child_process';
import path from 'path';

console.log("Subway Builder Patcher - Written by Kronifer");

// FIX: Helper to ensure paths are safe for command line (wrap in quotes)
const q = (str) => `"${str}"`;
// Helpers for cleanup
const WORK_DIR = path.join(import.meta.dirname, '..', 'patching_working_directory');
const SQUASHFS_DIR = path.join(WORK_DIR, 'squashfs-root');
const EXTRACTED_DIR = path.join(WORK_DIR, 'extracted-asar');
const APP_IMAGE = path.join(WORK_DIR, 'SB.AppImage');

// CLEANUP
if (fs.existsSync(SQUASHFS_DIR)) {
    fs.rmSync(SQUASHFS_DIR, { recursive: true, force: true });
}
if (fs.existsSync(EXTRACTED_DIR)) {
    fs.rmSync(EXTRACTED_DIR, { recursive: true, force: true });
}

if (config.platform === "windows") {
    console.log("Platform: Windows");
    console.log("Copying game directory");
    fs.cpSync(config.subwaybuilderLocation, SQUASHFS_DIR, { recursive: true });
}
else if (config.platform === "linux") {
    console.log("Platform: Linux");
    console.log('Copying AppImage to working directory');
    fs.cpSync(config.subwaybuilderLocation, APP_IMAGE);
    console.log('Extracting AppImage contents')
    fs.chmodSync(APP_IMAGE, '777');
    // FIX: Use quotes for paths in execSync
    execSync(`${q(APP_IMAGE)} --appimage-extract`, { cwd: WORK_DIR });
}
else if (config.platform === "macos") {
    console.log("Platform: MacOS");
    console.log("Copying app contents");
    fs.cpSync(`${config.subwaybuilderLocation}/Contents`, SQUASHFS_DIR, { recursive: true });
    fs.renameSync(path.join(SQUASHFS_DIR, 'Resources'), path.join(SQUASHFS_DIR, 'resources'));
}

console.log("Extracting app.asar");
const asarPath = path.join(SQUASHFS_DIR, 'resources', 'app.asar');
// FIX: Added quotes around paths to handle spaces
execSync(`npx @electron/asar extract ${q(asarPath)} ${q(EXTRACTED_DIR)}`);

console.log('Locating files in public directory');
const rendererDir = path.join(EXTRACTED_DIR, 'dist', 'renderer');
const publicDir = path.join(rendererDir, 'public');
const filesInPublicDirectory = fs.readdirSync(publicDir);

const findFile = (prefix) => filesInPublicDirectory.find(f => f.startsWith(prefix) && f.endsWith('.js'));

const indexJS = findFile('index-');
const gameMainJS = findFile('GameMain-');
const interlinedRoutesJS = findFile('interlinedRoutes');
const popCommuteWorkerJS = findFile('popCommuteWorker');
const cityPopulationsJSON = path.join(rendererDir, 'cityPopulations.json');

if (!indexJS || !gameMainJS || !interlinedRoutesJS || !popCommuteWorkerJS) {
    console.error("CRITICAL ERROR: Could not locate index.js, GameMain.js, interlinedRoutes.js, and/or popCommuteworker.js in public directory!");
    process.exit(1);
}

let fileContents = {};
fileContents.INDEX = fs.readFileSync(path.join(publicDir, indexJS), 'utf-8');
fileContents.GAMEMAIN = fs.readFileSync(path.join(publicDir, gameMainJS), 'utf-8');
fileContents.INTERLINEDROUTES = fs.readFileSync(path.join(publicDir, interlinedRoutesJS), 'utf-8');
fileContents.POPCOMMUTEWORKER = fs.readFileSync(path.join(publicDir, popCommuteWorkerJS), 'utf-8');
fileContents.CITYPOPULATIONS = JSON.parse(fs.readFileSync(cityPopulationsJSON, "utf8"));

fileContents.PATHS = {};
fileContents.PATHS.RESOURCESDIR = path.join(SQUASHFS_DIR, 'resources') + path.sep;
fileContents.PATHS.RENDERERDIR = rendererDir + path.sep;

let promises = [];
for(const packageName of config.packagesToRun) {
    console.log(`Loading package: ${packageName}`);
    const mod = import(`./packages/${packageName}/patcherExec.js`);
    promises.push(mod);
}

// FIX: Made it sequential so we don't get race conditions
Promise.all(promises).then((mods) => {
    let sequence = Promise.resolve();
    
    mods.forEach((mod) => {
        sequence = sequence.then(() => {
            let result = mod.patcherExec(fileContents);
            return result instanceof Promise ? result.then(res => fileContents = res) : (fileContents = result);
        });
    });

    sequence.then(() => {
        console.log("Writing modified files back to disk");
        fs.writeFileSync(path.join(publicDir, indexJS), fileContents.INDEX, 'utf-8');
        fs.writeFileSync(path.join(publicDir, gameMainJS), fileContents.GAMEMAIN, 'utf-8');
        fs.writeFileSync(path.join(publicDir, interlinedRoutesJS), fileContents.INTERLINEDROUTES, 'utf-8');
        fs.writeFileSync(path.join(publicDir, popCommuteWorkerJS), fileContents.POPCOMMUTEWORKER, 'utf-8');
        fs.writeFileSync(cityPopulationsJSON, JSON.stringify(fileContents.CITYPOPULATIONS, null, 2));

        console.log("Repacking app.asar");
        // FIX: Added quotes around paths here too
        execSync(`npx @electron/asar pack ${q(EXTRACTED_DIR)} ${q(asarPath)} --unpack-dir=node_modules/{sharp,@rollup,@esbuild,@img,register-scheme}`);

        if (config.platform === "windows") {
            const dest = path.join(import.meta.dirname, '..', 'SubwayBuilderPatched');
            if (fs.existsSync(dest)) {
                fs.rmSync(dest, { recursive: true, force: true });
            }
            console.log("Writing patched game to disk");
            fs.cpSync(SQUASHFS_DIR, dest, { recursive: true });
        } 
        else if (config.platform === "linux") {
            const destAppImage = path.join(import.meta.dirname, '..', 'SubwayBuilderPatched.AppImage');
            if (fs.existsSync(destAppImage)) {
                fs.rmSync(destAppImage, { force: true });
            }
            console.log("Repacking AppImage");
            execSync(`appimagetool ${q(SQUASHFS_DIR)} ${q(destAppImage)}`);
        } 
        else if (config.platform === "macos") {
            const originalAppPath = '/Applications/Subway Builder.app';
            const patchedAppPath = path.join(import.meta.dirname, '..', 'SubwayBuilderPatched.app');
            
            if (fs.existsSync(patchedAppPath)) {
                fs.rmSync(patchedAppPath, { recursive: true, force: true });
            }
            console.log(`Copying 'Subway Builder.app' from /Applications using ditto...`);
            try {
                execSync(`ditto --norsrc "${originalAppPath}" "${patchedAppPath}"`);
            } catch (error) {
                console.error('ERROR: Failed to copy the application. Please ensure "Subway Builder.app" is in your /Applications folder.');
                console.error(error);
                process.exit(1);
            }

            console.log("Writing patched app to disk");
            const rsrc = path.join(patchedAppPath, 'Contents', 'Resources');
            fs.cpSync(path.join(SQUASHFS_DIR, 'resources', 'app.asar'), path.join(rsrc, 'app.asar'));
            fs.cpSync(path.join(SQUASHFS_DIR, 'resources', 'app.asar.unpacked'), path.join(rsrc, 'app.asar.unpacked'), { recursive: true });
            
            // FIX: libvips
            const libVipsSrc = path.join(rsrc, 'app.asar.unpacked', 'node_modules', '@img', 'sharp-libvips-darwin-arm64', 'lib', 'libvips-cpp.8.17.3.dylib');
            const libVipsDest = path.join(patchedAppPath, 'Contents', 'Frameworks', 'Electron Framework.framework', 'Versions', 'A', 'Libraries', 'libvips-cpp.8.17.3.dylib');
            if(fs.existsSync(libVipsSrc)) fs.copyFileSync(libVipsSrc, libVipsDest);

            // fs.cpSync(path.join(SQUASHFS_DIR, 'resources', 'data'), path.join(rsrc, 'data'), { recursive: true }); Not necessary?

            console.log('Signing app...');
            try {
                execSync(`dot_clean "${patchedAppPath}"`);
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
        console.log("Cleaning up...");
        fs.rmSync(SQUASHFS_DIR, { recursive: true, force: true });
        fs.rmSync(EXTRACTED_DIR, { recursive: true, force: true });
        console.log("Done!");
        process.exit(0); // FIX: exit because successful instead of error
    });

});
