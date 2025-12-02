import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import AdmZip from 'adm-zip';
import os from 'os'; // Added for desktop path detection

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// --- HELPER: Clean Path ---
function cleanPath(inputPath) {
    if (!inputPath) return "";
    let p = inputPath.trim();
    p = p.replace(/^["']|["']$/g, ''); // Remove surrounding quotes
    p = p.replace(/\\ /g, ' '); // Unescape spaces
    return p;
}

// --- HELPER: Ensure Config Files Exist ---
// Checks if package config exists. If not, copies from example.
function ensurePackageConfigs(selectedPackages) {
    console.log("Checking package configurations...");
    selectedPackages.forEach(pkgName => {
        const pkgDir = path.join(__dirname, 'patcher', 'packages', pkgName);
        
        // Auto-fix: Rename legacy config.js to config_trains.js for addTrains
        if (pkgName === 'addTrains') {
            const wrongPath = path.join(pkgDir, 'config.js');
            const rightPath = path.join(pkgDir, 'config_trains.js');
            if (fs.existsSync(wrongPath) && !fs.existsSync(rightPath)) {
                try { 
                    fs.renameSync(wrongPath, rightPath);
                    console.log(`> Auto-fixed: Renamed config.js to config_trains.js for ${pkgName}`);
                } catch (e) { console.error(e); }
            }
        }

        let targetConfig = (pkgName === 'addTrains') ? 'config_trains.js' : 'config.js';
        let sourceConfig = 'config_example.js';
        const targetPath = path.join(pkgDir, targetConfig);
        const sourcePath = path.join(pkgDir, sourceConfig);

        // If config is missing but example exists -> Copy it
        if (!fs.existsSync(targetPath) && fs.existsSync(sourcePath)) {
            console.log(`> Auto-creating config for ${pkgName}`);
            try { fs.copyFileSync(sourcePath, targetPath); } catch (e) {}
        }
    });
}

// --- CONFIG MANAGEMENT ---

function readCurrentConfig() {
    const configPath = path.join(__dirname, 'config.js');
    let data = { platform: '', path: '', packages: [] };

    if (fs.existsSync(configPath)) {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            
            // FIX: Allow optional quotes around the key names (["']?)
            
            const platMatch = content.match(/["']?platform["']?:\s*["'](.*?)["']/);
            if (platMatch) data.platform = platMatch[1];

            // Match path handling both " and ' quotes
            const pathMatch = content.match(/["']?subwaybuilderLocation["']?:\s*(["'](?:[^"'\\]|\\.)*["'])/);
            if (pathMatch) {
                let rawPath = pathMatch[1].slice(1, -1);
                data.path = rawPath.replace(/\\\\/g, '\\');
            }

            const packMatch = content.match(/["']?packagesToRun["']?:\s*(\[.*?\])/s);
            if (packMatch) { try { data.packages = JSON.parse(packMatch[1]); } catch(e) {} }

        } catch (e) { console.error("Error reading config.js - starting with empty fields."); }
    }
    return data;
}

function writeFullConfig(platform, sbPath, packages) {
    const configPath = path.join(__dirname, 'config.js');
    const safePath = cleanPath(sbPath);

    // Using JSON.stringify for the path ensures correct escaping
    const packagesJson = JSON.stringify(packages, null, 2).replace(/\n/g, '\n  ');
    const fileContent = `// See config_macos, config_linux, config_linux for examples
const config = {
  "subwaybuilderLocation": ${JSON.stringify(safePath)}, 
  "platform": "${platform}", // 'macos', 'linux' or 'windows'
  "packagesToRun": ${JSON.stringify(packages, null, 2)}
};

export default config;`;

    fs.writeFileSync(configPath, fileContent, 'utf-8');
    console.log(`> Config saved: ${safePath}`);
}

// --- API ROUTES ---
// --- API: PREMADE MAPS ---
const PREMADE_DIR = path.join(__dirname, 'premade_maps');
if (!fs.existsSync(PREMADE_DIR)) fs.mkdirSync(PREMADE_DIR);

app.get('/api/premade-maps', (req, res) => {
    try {
        const files = fs.readdirSync(PREMADE_DIR).filter(f => f.endsWith('.zip'));
        res.json(files);
    } catch (e) { res.json([]); }
});

app.post('/api/install-premade-map', (req, res) => {
    const { filename } = req.body;
    const zipPath = path.join(PREMADE_DIR, filename);
    const mapPatcherDir = path.join(__dirname, 'patcher', 'packages', 'mapPatcher');
    const mapConfigPath = path.join(mapPatcherDir, 'config.js');

    if (!fs.existsSync(zipPath)) return res.status(404).json({ error: "Zip file not found" });

    console.log(`\n>>> Installing Premade Map: ${filename}`);
    
    try {
        const zip = new AdmZip(zipPath);
        const zipEntries = zip.getEntries();
        let config = {};
        let configFound = false;
        let processed_data = [];

        // 1. FIND AND PARSE CONFIG (places.txt or similar)
        // We look for a file that contains "bbox" and "code"
        for (const entry of zipEntries) {
            if(entry.entryName.toLowerCase().startsWith('city_config.json')) {
                config = JSON.parse(entry.getData().toString('utf-8'));
                configFound = true;
                break;
            }
        }

        if (!configFound) {
            return res.status(400).json({ error: "Could not find a valid places config (city_config.json) inside the zip." });
        }

        // 2. MERGE CONFIG
        let currentMapConfig = { "tile-zoom-level": 16, "places": [] };
        if (fs.existsSync(mapConfigPath)) {
            const existingContent = fs.readFileSync(mapConfigPath, 'utf-8');
            const cleanJs = existingContent.replace(/export default/g, 'return');
            try { currentMapConfig = new Function(cleanJs)(); } catch(e) {}
        }
        currentMapConfig.places.push(config);

        fs.mkdirSync(path.join(mapPatcherDir, "processed_data", config.code), { recursive: true });

        let wroteTiles = false;

        zipEntries.forEach(entry => {
            if(entry.entryName.startsWith('processed_data/') && !entry.isDirectory) {
                const dest = path.join(mapPatcherDir, 'processed_data', config.code, entry.entryName.replace('processed_data/', ''));
                fs.writeFileSync(dest, entry.getData());
            }
            else if(entry.entryName.endsWith('.pmtiles') && !entry.isDirectory) {
                const dest = path.join(mapPatcherDir, 'map_tiles', entry.entryName);
                fs.writeFileSync(dest, entry.getData());
                wroteTiles = true;
            }
        });

        console.log("> Extraction complete.");
        let resp = {success: true, message: `Installed ${config.code} from ${filename}.`};
        if(!wroteTiles) {
            resp.warning = "No .pmtiles files were found in the zip. Please run download_tiles.js to generate them.";
        }
        res.json(resp);

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

// --- NEW API: CREATE SHORTCUT ---
app.post('/api/create-shortcut', (req, res) => {
    try {
        const platform = process.platform;
        const desktopDir = path.join(os.homedir(), 'Desktop');
        
        // Paths relative to the patcher root (this directory)
        const rootDir = __dirname;
        const serveScriptWin = path.join(rootDir, 'patcher', 'packages', 'mapPatcher', 'serve.ps1');
        const serveScriptUnix = path.join(rootDir, 'patcher', 'packages', 'mapPatcher', 'serve.sh'); // Assuming sh logic if needed
        const gameDir = path.join(rootDir, 'SubwayBuilderPatched');
        
        // Check if mapPatcher server script exists
        const hasMapPatcher = fs.existsSync(serveScriptWin);

        if (platform === 'win32') {
            const batFile = path.join(desktopDir, 'Launch Patched Game.bat');
            let content = `@echo off\r\n`;
            
            // 1. Attempt to start Map Server (PowerShell)
            if (hasMapPatcher) {
                // Use Start to launch in new window
                content += `IF EXIST "${serveScriptWin}" (\r\n`;
                content += `    echo Starting Map Server...\r\n`;
                content += `    start "Subway Builder Map Server" powershell -ExecutionPolicy Bypass -NoExit -File "${serveScriptWin}"\r\n`;
                content += `)\r\n`;
            }

            // 2. Start Game
            content += `cd /d "${gameDir}"\r\n`;
            content += `echo Starting Game...\r\n`;
            content += `start "" "Subway Builder.exe"\r\n`;
            content += `exit\r\n`;

            fs.writeFileSync(batFile, content, 'utf8');
            res.json({ success: true, path: batFile });

        } else {
            // macOS / Linux (.sh)
            const shFile = path.join(desktopDir, 'launch_patched_game.sh');
            let content = `#!/bin/bash\n`;
            
            // Logic for Unix server? Usually node server or python. 
            // If serve.ps1 is the only thing provided, we might not be able to run it easily on unix without pwsh.
            // For now, we just launch the game.
            
            content += `echo "Starting Subway Builder Patched..."\n`;
            content += `cd "${gameDir}"\n`;
            
            // Detect Executable
            if (platform === 'darwin') {
                 content += `open "Subway Builder.app"\n`;
            } else {
                 content += `./SubwayBuilder.x86_64\n`; // Or whatever linux binary is named
            }

            fs.writeFileSync(shFile, content, 'utf8');
            try { fs.chmodSync(shFile, '755'); } catch(e){}
            
            res.json({ success: true, path: shFile });
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});


// --- STANDARD ROUTES ---
app.post('/api/root-config', (req, res) => {
    const { platform, path: sbPath } = req.body;
    if (!sbPath || sbPath.length < 3) {
        return res.status(400).json({ error: "Path is too short." });
    }
    if (!fs.existsSync(sbPath)) {
        return res.status(400).json({ error: "The path does not exist on your computer." });
    }
    try {
        const stats = fs.statSync(sbPath);
        if (!stats.isDirectory()) {
            return res.status(400).json({ error: "Please select the FOLDER, not the .exe file." });
        }
    } catch (e) {
        return res.status(400).json({ error: "Invalid path access." });
    }
    const current = readCurrentConfig(); 
    try {
        writeFullConfig(platform, sbPath, current.packages);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/root-config', (req, res) => {
    res.json(readCurrentConfig());
});

function readDefaultPaths() {
    const paths = {};
    const files = {
        'linux': 'config_linux.js',
        'macos': 'config_macos.js',
        'windows': 'config_windows.js'
    };

    for (const [platform, filename] of Object.entries(files)) {
        const filePath = path.join(__dirname, filename);
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf-8');
                const pathMatch = content.match(/["']?subwaybuilderLocation["']?:\s*(["'](?:[^"'\\]|\\.)*["'])/);
                if (pathMatch) {
                    let rawPath = pathMatch[1].slice(1, -1);
                    // Basic cleanup for Windows paths if they contain double backslashes
                    paths[platform] = rawPath.replace(/\\\\/g, '\\');
                }
            } catch (e) {
                console.error(`Error reading ${filename}:`, e);
            }
        }
    }
    return paths;
}

app.get('/api/package-config/:pkgName', (req, res) => {
    const pkgName = req.params.pkgName;
    const pkgDir = path.join(__dirname, 'patcher', 'packages', pkgName);
    if (!fs.existsSync(pkgDir)) return res.status(404).send("Package not found");

    const active = path.join(pkgDir, 'config.js');
    const example = path.join(pkgDir, 'config_example.js');
    const trains = path.join(pkgDir, 'config_trains.js');

    let content = '', filename = 'config.js', saved = false;

    if (pkgName === 'addTrains' && fs.existsSync(trains)) { 
        content = fs.readFileSync(trains, 'utf-8'); 
        filename = 'config_trains.js'; 
        saved = true;
    }
    else if (fs.existsSync(active)) { 
        content = fs.readFileSync(active, 'utf-8'); 
        saved = true;
    }
    else if (fs.existsSync(example)) { 
        content = fs.readFileSync(example, 'utf-8'); 
        filename = 'config.js'; 
        saved = false;
    }
    else {
        // Fallback if user has saved manually
        const files = fs.readdirSync(pkgDir);
        const rnd = files.find(f => f.startsWith('config') && f.endsWith('.js'));
        if (rnd) { 
            content = fs.readFileSync(path.join(pkgDir, rnd), 'utf-8'); 
            filename = rnd; 
            saved = true; 
        }
        else return res.json({ content: '// No config', filename: null, saved: false });
    }
    
    res.json({ content, filename, saved });
});

// --- PACKAGE HANDLING ---
// If user just unzips github-style download for packages
function normalizeFolderNames(packagesDir) {
    const corrections = { 
        'subwaybuilder-addtrains': 'addTrains', 
        'subwaybuilder-addtrains-main': 'addTrains',
        'subwaybuilder-patcher': 'settingsTweaks',
        'subwaybuilder-patcher-settingsTweaks-main': 'settingsTweaks'
    };
    
    try {
        const dirs = fs.readdirSync(packagesDir, { withFileTypes: true }).filter(d => d.isDirectory());

        for (const dir of dirs) {
            let currentPath = path.join(packagesDir, dir.name);
            let currentName = dir.name;

            // A. Rename known wrong folders
            for (const [bad, good] of Object.entries(corrections)) {
                if (currentName.includes(bad) && currentName !== good) {
                    const goodPath = path.join(packagesDir, good);
                    if (!fs.existsSync(goodPath)) {
                        try { 
                            fs.renameSync(currentPath, goodPath); 
                            currentPath = goodPath; 
                            currentName = good;
                            console.log(`> Renamed ${dir.name} to ${good}`);
                        } catch (e) { console.error(e); }
                    }
                }
            }

            // B. Flatten nested folders (pkg/pkg-main/)
            try {
                const contents = fs.readdirSync(currentPath, { withFileTypes: true });
                const subDirs = contents.filter(c => c.isDirectory());
                const hasPatcherExec = fs.existsSync(path.join(currentPath, 'patcherExec.js'));

                if (!hasPatcherExec && subDirs.length === 1) {
                    const nestedDir = path.join(currentPath, subDirs[0].name);
                    const nestedHasExec = fs.existsSync(path.join(nestedDir, 'patcherExec.js'));
                    
                    if (nestedHasExec) {
                        console.log(`> Fixing nested folder structure in ${currentName}...`);
                        fs.cpSync(nestedDir, currentPath, { recursive: true });
                        fs.rmSync(nestedDir, { recursive: true, force: true });
                    }
                }
            } catch (e) {}
        }
    } catch(e) {}
}

app.get('/api/packages', (req, res) => {
    const packagesDir = path.join(__dirname, 'patcher', 'packages');
    if (!fs.existsSync(packagesDir)) return res.json([]);
    normalizeFolderNames(packagesDir);
    try {
        const pkgs = fs.readdirSync(packagesDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
        res.json(pkgs);
    } catch (e) { res.status(500).json([]); }
});

app.get('/api/package-config/:pkgName', (req, res) => {
    const pkgName = req.params.pkgName;
    const pkgDir = path.join(__dirname, 'patcher', 'packages', pkgName);
    if (!fs.existsSync(pkgDir)) return res.status(404).send("Package not found");

    const active = path.join(pkgDir, 'config.js');
    const example = path.join(pkgDir, 'config_example.js');
    const trains = path.join(pkgDir, 'config_trains.js');

    let content = '', filename = 'config.js';

    if (pkgName === 'addTrains' && fs.existsSync(trains)) { content = fs.readFileSync(trains, 'utf-8'); filename = 'config_trains.js'; }
    else if (fs.existsSync(active)) { content = fs.readFileSync(active, 'utf-8'); }
    else if (fs.existsSync(example)) { content = fs.readFileSync(example, 'utf-8'); filename = 'config.js'; }
    else {
        const files = fs.readdirSync(pkgDir);
        const rnd = files.find(f => f.startsWith('config') && f.endsWith('.js'));
        if (rnd) { content = fs.readFileSync(path.join(pkgDir, rnd), 'utf-8'); filename = rnd; }
        else return res.json({ content: '// No config', filename: null });
    }
    res.json({ content, filename });
});

app.post('/api/package-config/:pkgName', (req, res) => {
    const pkgDir = path.join(__dirname, 'patcher', 'packages', req.params.pkgName);
    try {
        fs.writeFileSync(path.join(pkgDir, req.body.filename), req.body.content, 'utf-8');
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SOCKETS ---

io.on('connection', (socket) => {
    console.log('GUI connected');

    // Run Patcher
    socket.on('run-patcher', (selectedPackages) => {
        const current = readCurrentConfig();

        if (!current.path || current.path.length < 2) {
            socket.emit('log', 'CRITICAL ERROR: Game path not set. Save config first.\n');
            socket.emit('process-finished');
            return;
        }

        // Write config again to ensure packagesToRun is updated
		ensurePackageConfigs(selectedPackages);
        writeFullConfig(current.platform, current.path, selectedPackages);
        
        socket.emit('log', `Starting patcher...\nPlatform: ${current.platform}\nPath: ${current.path}\nPackages: ${selectedPackages.join(', ')}\n\n`);

        const patcherScript = path.join(__dirname, 'patcher', 'patch_game.js');
        const child = spawn('node', [patcherScript], { cwd: path.join(__dirname, 'patcher') });

        child.stdout.on('data', d => socket.emit('log', d.toString()));
        child.stderr.on('data', d => socket.emit('log', `ERR: ${d.toString()}`));
        child.on('close', c => {
            socket.emit('log', `\nDone (Exit code: ${c})`);
            socket.emit('process-finished');
        });
    });

    // Run Helper Scripts (No ERR prefix)
    socket.on('run-script', ({ pkgName, scriptName }) => {
        const packageDir = path.join(__dirname, 'patcher', 'packages', pkgName);
        const scriptPath = path.join(packageDir, scriptName);

        if (!fs.existsSync(scriptPath)) {
            socket.emit('log', `ERROR: Script not found: ${scriptName}\n`);
            socket.emit('script-done', { scriptName, code: 404 });
            return;
        }

        socket.emit('log', `\n>>> Running ${scriptName}...\n`);

        const child = spawn('node', [scriptName], { cwd: packageDir });

        child.stdout.on('data', (data) => socket.emit('log', data.toString()));
        child.stderr.on('data', (data) => socket.emit('log', data.toString()));
        
        child.on('close', (code) => {
            socket.emit('log', `<<< ${scriptName} finished (Code: ${code})\n`);
            socket.emit('script-done', { scriptName, code });
        });
    });
});

app.get('/api/map-tools-status', (req, res) => {
    const isWin = process.platform === 'win32';
    const exeName = isWin ? 'pmtiles.exe' : 'pmtiles';
    const toolPath = path.join(__dirname, 'patcher', 'packages', 'mapPatcher', 'map_tiles', exeName);
    let gzipMissing = false;
    if (isWin) {
        if (!fs.existsSync(path.join(__dirname, 'patcher', 'gzip.exe'))) gzipMissing = true;
    }
    res.json({ installed: fs.existsSync(toolPath) && !gzipMissing });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});