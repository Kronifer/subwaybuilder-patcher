import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

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

        } catch (e) { console.error("Error reading config."); }
    }
    return data;
}

function writeFullConfig(platform, sbPath, packages) {
    const configPath = path.join(__dirname, 'config.js');
    const safePath = cleanPath(sbPath);

    // Using JSON.stringify for the path ensures correct escaping
    const packagesJson = JSON.stringify(packages, null, 2).replace(/\n/g, '\n  ');
    const fileContent = `const config = {
  "subwaybuilderLocation": ${JSON.stringify(safePath)}, 
  "platform": "${platform}", 
  "packagesToRun": ${packagesJson}
};

export default config;`;

    fs.writeFileSync(configPath, fileContent, 'utf-8');
    console.log(`> Config saved: ${safePath}`);
}

// --- API ROUTES ---

app.post('/api/root-config', (req, res) => {
    const { platform, path: sbPath } = req.body;
    const current = readCurrentConfig(); 
    try {
        writeFullConfig(platform, sbPath, current.packages);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/root-config', (req, res) => {
    const current = readCurrentConfig();
    res.json(current);
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

app.get('/api/default-paths', (req, res) => {
    res.json(readDefaultPaths());
});

// --- PACKAGE HANDLING ---

function normalizeFolderNames(packagesDir) {
    const corrections = { 'subwaybuilder-addtrains': 'addTrains', 'subwaybuilder-patcher': 'settingsTweaks' };
    for (const [bad, good] of Object.entries(corrections)) {
        const badPath = path.join(packagesDir, bad);
        const goodPath = path.join(packagesDir, good);
        if (fs.existsSync(badPath) && !fs.existsSync(goodPath)) try { fs.renameSync(badPath, goodPath); } catch (e) {}
    }
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

const PORT = 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});