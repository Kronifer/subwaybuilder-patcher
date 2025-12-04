import fs from 'fs';
import path from 'path';
import https from 'https';
import os from 'os';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip'; // Requires npm install adm-zip
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Gzip (Windows only) - Using GnuWin32 from SourceForge
const GZIP_URL = "https://downloads.sourceforge.net/project/gnuwin32/gzip/1.3.12-1/gzip-1.3.12-1-bin.zip";

// Paths
const TILES_DIR = path.join(__dirname, 'map_tiles');
// We place gzip.exe two folders up (in /patcher root) because that's where patch_game.js runs
const PATCHER_ROOT = path.resolve(__dirname, '..', '..'); 

if (!fs.existsSync(TILES_DIR)) fs.mkdirSync(TILES_DIR);

// --- HELPER: Handle Redirects ---
async function downloadFileWithRedirects(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        const request = (currentUrl) => {
            https.get(currentUrl, (response) => {
                if (response.statusCode === 301 || response.statusCode === 302) {
                    if (response.headers.location) {
                        request(response.headers.location);
                        return;
                    } else {
                        reject(new Error("Redirect without location header"));
                        return;
                    }
                }
                if (response.statusCode !== 200) {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                    return;
                }
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve();
                });
            }).on('error', (err) => {
                fs.unlink(destPath, () => {});
                reject(err);
            });
        };
        request(url);
    });
}

// --- HELPER: Get latest pmtiles version ---
function getLatestPmtilesVersion() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/protomaps/go-pmtiles/releases/latest',
            method: 'GET',
            headers: { 'User-Agent': 'Node.js Script' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(data);
                        const version = json.tag_name.replace(/^v/, '');
                        resolve(version);
                    } catch (e) {
                        reject(new Error("Kunne ikke parse JSON fra GitHub"));
                    }
                } else {
                    reject(new Error(`GitHub API fejlede med status: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

// Dynamisk URL bygning baseret på system og version
function getPmtilesUrl(version) {
    const platform = os.platform();
    const arch = os.arch();
    console.log(`Detected System: ${platform} (${arch})`);

    let filename = "";
    if (platform === 'win32') {
        if (arch === 'x64') filename = `go-pmtiles_${version}_Windows_x86_64.zip`;
        else if (arch === 'arm64') filename = `go-pmtiles_${version}_Windows_arm64.zip`;
    } else if (platform === 'darwin') {
        if (arch === 'x64') filename = `go-pmtiles-${version}_Darwin_x86_64.zip`;
        else if (arch === 'arm64') filename = `go-pmtiles-${version}_Darwin_arm64.zip`;
    } else if (platform === 'linux') {
        if (arch === 'x64') filename = `go-pmtiles_${version}_Linux_x86_64.tar.gz`;
        else if (arch === 'arm64') filename = `go-pmtiles_${version}_Linux_arm64.tar.gz`;
    }

    if (!filename) {
        console.error("ERROR: Unsupported platform/arch for pmtiles.");
        process.exit(1);
    }

    const baseUrl = `https://github.com/protomaps/go-pmtiles/releases/download/v${version}/`;
    return { url: baseUrl + filename, filename: filename, isZip: filename.endsWith('.zip') };
}

// --- TASK 1: DOWNLOAD PMTILES TOOL ---
async function installPmtiles() {
    console.log("Checking for latest pmtiles version...");

    let version;
    try {
        version = await getLatestPmtilesVersion();
        console.log(`Latest version is: ${version}`);
    } catch (e) {
        console.error("Failed to check latest version:", e.message);
        process.exit(1);
    }

    const targetInfo = getPmtilesUrl(version);
    const downloadPath = path.join(TILES_DIR, targetInfo.filename);
    const finalExeName = os.platform() === 'win32' ? 'pmtiles.exe' : 'pmtiles';
    const finalExePath = path.join(TILES_DIR, finalExeName);

    if (fs.existsSync(finalExePath)) {
        console.log(`[OK] ${finalExeName} is already installed.`);
        return;
    }

    console.log(`Downloading ${targetInfo.filename}...`);
    await downloadFileWithRedirects(targetInfo.url, downloadPath);
    console.log("Extracting pmtiles...");

    if (targetInfo.isZip) {
        const zip = new AdmZip(downloadPath);
        zip.extractAllTo(TILES_DIR, true);
    } else {
        try {
            execSync(`tar -xzf "${downloadPath}" -C "${TILES_DIR}"`);
        } catch (e) {
            console.error("Error extracting tar.gz (requires tar in PATH).");
        }
    }

    // Cleanup
    try { fs.unlinkSync(downloadPath); } catch(e) {}
    if (fs.existsSync(path.join(TILES_DIR, 'LICENSE'))) fs.unlinkSync(path.join(TILES_DIR, 'LICENSE'));
    if (fs.existsSync(path.join(TILES_DIR, 'README.md'))) fs.unlinkSync(path.join(TILES_DIR, 'README.md'));

    if (os.platform() !== 'win32') fs.chmodSync(finalExePath, '755');
    console.log(`[SUCCESS] Installed ${finalExeName} (v${version})`);
}

// --- TASK 2: DOWNLOAD GZIP (WINDOWS ONLY) ---
async function installGzip() {
    if (os.platform() !== 'win32') {
        console.log("[SKIP] Gzip check skipped (not on Windows).");
        return;
    }

    const gzipDest = path.join(PATCHER_ROOT, 'gzip.exe');
    if (fs.existsSync(gzipDest)) {
        console.log(`[OK] gzip.exe is already installed in patcher root.`);
        return;
    }

    console.log("Downloading gzip for Windows (needed for patching)...");
    const zipPath = path.join(TILES_DIR, 'gzip_temp.zip');

    try {
        await downloadFileWithRedirects(GZIP_URL, zipPath);
        console.log("Extracting gzip.exe...");
        
        const zip = new AdmZip(zipPath);
        // GnuWin32 zips have a folder structure like bin/gzip.exe
        // We extract strictly the binary we need
        const zipEntries = zip.getEntries();
        let found = false;

        zipEntries.forEach((entry) => {
            if (entry.entryName.endsWith('bin/gzip.exe')) {
                // Extract directly to buffer
                const buffer = entry.getData();
                fs.writeFileSync(gzipDest, buffer);
                found = true;
            }
        });

        if (found) {
            console.log(`[SUCCESS] Installed gzip.exe to ${gzipDest}`);
        } else {
            console.error("[ERROR] Could not find bin/gzip.exe inside the downloaded archive.");
        }

        // Cleanup
        fs.unlinkSync(zipPath);

    } catch (e) {
        console.error("Error downloading gzip:", e.message);
    }
}

// --- MAIN EXECUTION ---
async function main() {
    try {
        await installPmtiles();
        console.log("--------------------------------");
        await installGzip();
        console.log("--------------------------------");
        console.log("Tool setup complete.");
		process.exit(0);
    } catch (err) {
        console.error("Setup failed:", err);
        process.exit(1);
    }
}

main();
