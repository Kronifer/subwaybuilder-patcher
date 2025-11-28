const socket = io();
const packageListEl = document.getElementById('package-list');
const startBtn = document.getElementById('start-btn');
const logContent = document.getElementById('log-content');
const terminal = document.getElementById('terminal');

const configFormDiv = document.getElementById('config-form');
const configTabs = document.querySelectorAll('.config-tab');

// --- OS DETECTION ---
function detectOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "windows";
    if (ua.indexOf("Mac") !== -1) return "macos";
    if (ua.indexOf("Linux") !== -1) return "linux";
    return "windows"; // Default fallback
}

// --- ROOT CONFIG LOGIC ---
document.getElementById('save-root-config').addEventListener('click', async () => {
    const platform = document.getElementById('platform-select').value;
    const sbPath = document.getElementById('sb-path').value;
    const btn = document.getElementById('save-root-config');

    // Validate if user has changed "YOUR_USERNAME"
    if (sbPath.includes("YOUR_USERNAME")) {
        alert("Please replace 'YOUR_USERNAME' in the path with your actual Windows username.");
        return;
    }

    if (!sbPath || sbPath.length < 3) {
        alert("Please enter a valid path.");
        return;
    }

    btn.textContent = "Saving...";
    btn.disabled = true;

    try {
        const res = await fetch('/api/root-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform: platform, path: sbPath })
        });

        const data = await res.json();
        
        if (data.success) {
            document.getElementById('root-config-section').style.display = 'none';
            document.getElementById('main-options-wrapper').style.display = 'flex';
            loadPackages();
        } else {
            alert("Error saving config: " + (data.error || "Unknown error"));
            btn.textContent = "Save patcher config";
            btn.disabled = false;
        }
    } catch (e) {
        alert("Network error: " + e.message);
        btn.textContent = "Save patcher config";
        btn.disabled = false;
    }
});

const friendlyNames = {
    'mapPatcher': 'Map Patcher(Kronifer)',
    'addTrains': 'New Trains (mhmoeller)',
    'subwaybuilder-addtrains': 'New Trains (mhmoeller)',
    'settingsTweaks': 'Settings Tweaks (slurry)',
    'subwaybuilder-patcher': 'Settings Tweaks (slurry)'
};

// --- TEMPLATES ---
const TRAIN_TEMPLATES = [
    { 
        name: "S-train", 
        description: "High-capacity commuter train. Modeled after Copenhagen S-train Litra SE", 
        canCrossRoads: false, 
        appearance: { color: "#C2122B" }, 
        stats: { maxAcceleration: 1.3, maxDeceleration: 1.2, maxSpeed: 33.3, maxSpeedLocalStation: 13, capacityPerCar: 250, carLength: 21, minCars: 4, maxCars: 8, carsPerCarSet: 4, carCost: 3000000, trainWidth: 3.6, minStationLength: 180, maxStationLength: 200, baseTrackCost: 50000, baseStationCost: 80000000, trainOperationalCostPerHour: 600, carOperationalCostPerHour: 60, scissorsCrossoverCost: 15000000 } 
    },
    { 
        name: "Regional Train", 
        description: "Regional diesel/electric unit for local services. Modeled after the LINT 41", 
        canCrossRoads: true, 
        appearance: { color: "#EBD768" }, 
        stats: { maxAcceleration: 0.6, maxDeceleration: 0.9, maxSpeed: 33.3, maxSpeedLocalStation: 12, capacityPerCar: 100, carLength: 20, minCars: 2, maxCars: 4, carsPerCarSet: 2, carCost: 2000000, trainWidth: 2.75, minStationLength: 82, maxStationLength: 120, baseTrackCost: 40000, baseStationCost: 60000000, trainOperationalCostPerHour: 300, carOperationalCostPerHour: 30, scissorsCrossoverCost: 10000000 } 
    },
    { 
        name: "Intercity Train", 
        description: "Fast long-distance train modeled after the Danish IR4.", 
        canCrossRoads: false, 
        appearance: { color: "#222222" }, 
        stats: { maxAcceleration: 0.8, maxDeceleration: 1.0, maxSpeed: 50.0, maxSpeedLocalStation: 15, capacityPerCar: 130, carLength: 26, minCars: 2, maxCars: 8, carsPerCarSet: 2, carCost: 4000000, trainWidth: 3.1, minStationLength: 210, maxStationLength: 275, baseTrackCost: 60000, baseStationCost: 90000000, trainOperationalCostPerHour: 700, carOperationalCostPerHour: 70, scissorsCrossoverCost: 20000000 } 
    },
    { 
        name: "Tram", 
        description: "City tram service modeled after Siemens Avenio.", 
        canCrossRoads: true, 
        appearance: { color: "#62B54E" }, 
        stats: { maxAcceleration: 1.2, maxDeceleration: 1.2, maxSpeed: 22.22, maxSpeedLocalStation: 8.0, capacityPerCar: 200, carLength: 30, minCars: 1, maxCars: 2, carsPerCarSet: 1, carCost: 1500000, trainWidth: 2.65, minStationLength: 62, maxStationLength: 80, baseTrackCost: 25000, baseStationCost: 20000000, trainOperationalCostPerHour: 200, carOperationalCostPerHour: 20, scissorsCrossoverCost: 5000000 } 
    }
];

const STANDARD_TRAINS_DEFAULTS = {
    "heavy-metro": {
        id: "heavy-metro", name: "Heavy Metro", description: "For higher capacity routes. Modeled after the NYC subway's R211 cars.",
        stats: { maxAcceleration: 1.1, maxDeceleration: 1.3, maxSpeed: 24.72, maxSpeedLocalStation: 13, capacityPerCar: 240, carLength: 15, minCars: 5, maxCars: 10, carsPerCarSet: 5, carCost: 2500000, trainWidth: 3.05, minStationLength: 160, maxStationLength: 227, baseTrackCost: 50000, baseStationCost: 75000000, trainOperationalCostPerHour: 500, carOperationalCostPerHour: 50, scissorsCrossoverCost: 15000000 },
        compatibleTrackTypes: ["heavy-metro"], appearance: { color: "#2563eb" }
    },
    "light-metro": {
        id: "light-metro", name: "Light Metro", description: "Lighter, more flexible transit for moderate capacity routes. Modeled after Copenhagen AnsaldoBreda.",
        stats: { maxAcceleration: 1.3, maxDeceleration: 1.3, maxSpeed: 25.0, maxSpeedLocalStation: 13.0, capacityPerCar: 120, carLength: 13, minCars: 3, maxCars: 6, carsPerCarSet: 3, carCost: 2500000, trainWidth: 2.65, minStationLength: 80, maxStationLength: 160, baseTrackCost: 30000, baseStationCost: 50000000, trainOperationalCostPerHour: 100, carOperationalCostPerHour: 10, scissorsCrossoverCost: 12000000 },
        compatibleTrackTypes: ["light-metro"], appearance: { color: "#10b981" }
    }
};

async function loadPackages() {
    try {
        const response = await fetch('/api/packages');
        const packages = await response.json();
        renderPackages(packages);
    } catch (error) {
        console.error("Error: Couldn't load package list.");
    }
}

function renderPackages(packages) {
    packageListEl.innerHTML = '';

    if (packages.length === 0) {
        packageListEl.innerHTML = '<p>No packages found in the /packages directory.</p>';
        return;
    }

    packages.forEach(pkg => {

        const div = document.createElement('div');
        div.className = 'package-item';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        
        const leftDiv = document.createElement('div');
        leftDiv.style.display = 'flex';
        leftDiv.style.alignItems = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = pkg;
        checkbox.id = `pkg-${pkg}`;
        checkbox.checked = true;

        const label = document.createElement('label');
        label.htmlFor = `pkg-${pkg}`;
        label.textContent = friendlyNames[pkg] || pkg;
        label.style.cursor = 'pointer';
        label.style.marginLeft = '10px';

        leftDiv.appendChild(checkbox);
        leftDiv.appendChild(label);

        const configBtn = document.createElement('button');
        configBtn.textContent = 'Config';
        configBtn.className = 'btn-secondary';
        configBtn.style.marginTop = '0';
        configBtn.style.padding = '5px 10px';
        configBtn.style.fontSize = '0.8rem';
        configBtn.addEventListener('click', () => openPackageConfig(pkg));
        div.appendChild(leftDiv);
        div.appendChild(configBtn);
        packageListEl.appendChild(div);
    });
}

async function openPackageConfig(pkgName) {
    configFormDiv.innerHTML = `<p>Loading config for <strong>${pkgName}</strong>...</p>`;
    try {
        const res = await fetch(`/api/package-config/${pkgName}`);
        const data = await res.json();
        if (!data.filename) {
            configFormDiv.innerHTML = `<p>No config file found for ${pkgName}</p>`;
            return;
        }
        let currentConfig = {};
        try {
            const cleanJs = data.content.replace(/export default/g, 'return');
            currentConfig = new Function(cleanJs)();
        } catch (parseError) {
            console.error(parseError);
            renderRawEditor(pkgName, data.filename, data.content, "Could not parse file automatically (syntax error).");
            return;
        }

        const normalizedName = pkgName.toLowerCase();
        if (normalizedName.includes('mappatcher')) {
            renderMapPatcherEditor(pkgName, data.filename, currentConfig);
        } else if (normalizedName.includes('settingstweaks') || normalizedName === 'subwaybuilder-patcher') {
            renderSettingsTweaksEditor(pkgName, data.filename, currentConfig);
        } else if (normalizedName.includes('addtrains')) {
            renderAddTrainsEditor(pkgName, data.filename, currentConfig);
        } else {
            renderRawEditor(pkgName, data.filename, data.content, "No specific editor for this package.");
        }
    } catch (e) {
        configFormDiv.innerHTML = `<p style="color:red">Error: ${e.message}</p>`;
    }
}

// --- EDITOR FUNCTIONS ---

function renderSettingsTweaksEditor(pkgName, filename, config) {
    let html = `<h3>Settings for: ${friendlyNames[pkgName] || pkgName}</h3>`;
    html += `<div style="display:flex; flex-direction:column; gap:15px; margin-top:20px;">`;

    const numInp = (key, val) => `<input type="number" id="inp-${key}" value="${val}" style="width:100px; padding:5px;">`;
    const speeds = config.gameSpeeds || [1, 25, 250, 500];
    
    html += `
    <div style="background:#333; padding:10px; border-radius:4px;">
        <label><input type="checkbox" id="chk-gameSpeed" ${config.changeGameSpeeds ? 'checked' : ''}> <strong>Change Game Speeds</strong></label>
        <div id="div-gameSpeed" style="margin-top:10px; display:${config.changeGameSpeeds ? 'block' : 'none'}; padding-left:20px;">
            <p style="font-size:0.8rem; color:#aaa;">Enter 4 speeds (factor):</p>
            <div style="display:flex; gap:10px;">
                ${speeds.map((s) => `<input type="number" class="inp-speed" value="${s}" style="width:70px;">`).join('')}
            </div>
        </div>
    </div>
    <div style="background:#333; padding:10px; border-radius:4px;">
        <label><input type="checkbox" id="chk-radius" ${config.changeMinTurnRadius ? 'checked' : ''}> <strong>Change Min Turn Radius</strong></label>
        <div id="div-radius" style="margin-top:10px; display:${config.changeMinTurnRadius ? 'block' : 'none'}; padding-left:20px;">
            <label>Radius (m): ${numInp('radius', config.minTurnRadius)}</label>
        </div>
    </div>
    <div style="background:#333; padding:10px; border-radius:4px;">
        <label><input type="checkbox" id="chk-slope" ${config.changeMaxSlope ? 'checked' : ''}> <strong>Change Max Slope</strong></label>
        <div id="div-slope" style="margin-top:10px; display:${config.changeMaxSlope ? 'block' : 'none'}; padding-left:20px;">
            <label>Max Slope (%): ${numInp('slope', config.maxSlope)}</label>
        </div>
    </div>
    <div style="background:#333; padding:10px; border-radius:4px;">
        <label><input type="checkbox" id="chk-money" ${config.changeStartingMoney ? 'checked' : ''}> <strong>Change Starting Money</strong></label>
        <div id="div-money" style="margin-top:10px; display:${config.changeStartingMoney ? 'block' : 'none'}; padding-left:20px;">
            <label>Billions: ${numInp('money', config.startingMoney)}</label>
        </div>
    </div>
    </div>
    <button id="save-tweaks-btn" class="btn-primary" style="margin-top:20px;">Save Settings</button>
    <p id="save-status" style="margin-top:5px;"></p>`;

    configFormDiv.innerHTML = html;

    const toggle = (chkId, divId) => {
        document.getElementById(chkId).addEventListener('change', (e) => {
            document.getElementById(divId).style.display = e.target.checked ? 'block' : 'none';
        });
    };
    toggle('chk-gameSpeed', 'div-gameSpeed');
    toggle('chk-radius', 'div-radius');
    toggle('chk-slope', 'div-slope');
    toggle('chk-money', 'div-money');

    document.getElementById('save-tweaks-btn').addEventListener('click', () => {
        const speeds = Array.from(document.querySelectorAll('.inp-speed')).map(i => parseInt(i.value));
        const newConfig = {
            changeGameSpeeds: document.getElementById('chk-gameSpeed').checked,
            gameSpeeds: speeds,
            changeMinTurnRadius: document.getElementById('chk-radius').checked,
            minTurnRadius: parseInt(document.getElementById('inp-radius').value),
            changeMaxSlope: document.getElementById('chk-slope').checked,
            maxSlope: parseInt(document.getElementById('inp-slope').value),
            changeStartingMoney: document.getElementById('chk-money').checked,
            startingMoney: parseInt(document.getElementById('inp-money').value)
        };
        const fileContent = `const config = ${JSON.stringify(newConfig, null, 4)};\n\nexport default config;`;
        saveFile(pkgName, filename, fileContent);
    });
}

function renderMapPatcherEditor(pkgName, filename, configObj) {
    let html = `<h3>Configure: ${friendlyNames[pkgName] || pkgName}</h3>`;
    html += `
    <div style="background: #2D3748; padding: 15px; border-radius: 5px; border-left: 5px solid #007acc; margin-bottom: 20px; font-size: 0.9rem; line-height: 1.5;">
        <h4 style="margin-top:0; color: #63B3ED;">Map Config Guide</h4>
        <div style="margin: 10px 0;">
            <strong>How to get a BBox:</strong>
            <ol style="margin-left: 20px; color: #CBD5E0;">
                <li>Go to <a href="http://bboxfinder.com" target="_blank" style="color:#63B3ED; text-decoration:underline;">bboxfinder.com</a></li>
                <li>Use the tool to draw a rectangle around your city area.</li>
                <li>Look at the bottom next to 'Box'. It should look like: <code style="background:#111; padding:2px;">-79.40,43.64,-79.36,43.66</code></li>
                <li>Copy and paste those numbers into the <strong>BBox</strong> field below.</li>
            </ol>
        </div>
        <p style="margin-bottom:0;">
            You also need to grab the latest protomaps bucket from <a href="https://maps.protomaps.com/builds/" target="_blank" style="color:#63B3ED; text-decoration:underline;">Protomaps</a>.
        </p>
        <p style="margin-top:5px; color:#aaa;">Just right click the download link, copy it, and paste it into the field below.</p>
    </div>
    
    <div style="margin-bottom: 15px; background: #333; padding: 10px; border-radius: 4px;">
        <label style="font-weight:bold; color:#fff;">Protomaps Bucket URL</label>
        <input type="text" id="inp-bucket" value="${configObj['protomaps-bucket'] || ''}" style="width:100%; padding:5px; margin-top:5px;">
        <small style="color:#aaa;">Link to the .pmtiles file</small>
    </div>
    
    <h4 style="margin-top:20px; border-bottom:1px solid #555; padding-bottom:5px;">Places</h4>
    <div id="places-container">`;

    if (configObj.places && Array.isArray(configObj.places)) {
        configObj.places.forEach((place, index) => {
            const bboxString = place.bbox ? place.bbox.join(', ') : '';
            html += `
            <div class="place-card" style="background: #2a2a2a; padding: 15px; margin-bottom: 15px; border-left: 3px solid #007acc; border-radius: 0 4px 4px 0;">
                <h5 style="margin-bottom:10px; color:#007acc;">City #${index + 1}</h5>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
                    <div><label>Code</label><input type="text" class="inp-place-code" value="${place.code || ''}"></div>
                    <div><label>Name</label><input type="text" class="inp-place-name" value="${place.name || ''}"></div>
                </div>
                <div style="margin-top:10px;"><label>Description</label><input type="text" class="inp-place-desc" value="${place.description || ''}"></div>
                <div style="margin-top:10px; display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
                    <div><label>BBox (4 numbers)</label><input type="text" class="inp-place-bbox" value="${bboxString}" placeholder="-79.4, 43.6, ..."></div>
                    <div><label>Population</label><input type="number" class="inp-place-pop" value="${place.population || 0}"></div>
                </div>
            </div>`;
        });
    } else { html += `<p>No places defined yet.</p>`; }
    html += `</div>
        <div style="margin-top: 20px; margin-bottom:30px; border-bottom:1px solid #444; padding-bottom:20px;">
            <button id="save-map-btn" class="btn-primary">Save Map Config</button>
            <p id="save-status" style="margin-top:5px;"></p>
        </div>
        
        <div style="background: #222; padding: 15px; border: 1px solid #444; border-radius: 5px; margin-bottom: 20px;">
            <h4 style="margin-top:0; color:#fff;">Map Actions</h4>
            <p style="font-size:0.9rem; color:#aaa; margin-bottom:10px;">
                First time? Click button 0 to install the helper tool. Then follow steps 1-3.
            </p>
            <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
                <button class="btn-secondary" id="btn-dl-tool" style="border:1px solid #e67e22; color:#e67e22;">0. Install Map Tool</button>
                <button class="btn-secondary" id="btn-dl-data">1. Download Data</button>
                <button class="btn-secondary" id="btn-process">2. Process Data</button>
                <button class="btn-secondary" id="btn-dl-tiles">3. Download Tiles</button>
            </div>
            
            <h4 style="margin-top:20px; color:#fff;">Automatic Setup</h4>
            <p style="font-size:0.9rem; color:#aaa; margin-bottom:10px;">
                <strong>IMPORTANT:</strong> Click "Save Map Config" above BEFORE running this!<br>
                This will download and process data for the saved cities automatically (Runs tool -> download -> process -> tiles).
            </p>
            <button class="btn-primary" id="btn-full-setup" style="background:#e67e22; width: 100%;">Run Full Map Setup</button>
        </div>
        `;

    configFormDiv.innerHTML = html;

    // EVENT LISTENERS
    document.getElementById('save-map-btn').addEventListener('click', () => {
        const bucket = document.getElementById('inp-bucket').value;
        const places = [];
        const placeCards = document.querySelectorAll('.place-card');
        placeCards.forEach(card => {
            const code = card.querySelector('.inp-place-code').value;
            const name = card.querySelector('.inp-place-name').value;
            const desc = card.querySelector('.inp-place-desc').value;
            const bboxStr = card.querySelector('.inp-place-bbox').value;
            const pop = card.querySelector('.inp-place-pop').value;
            let bboxArray = [];
            try { bboxArray = bboxStr.split(',').map(num => parseFloat(num.trim())); } catch(e) { bboxArray=[0,0,0,0]; }
            places.push({ code, name, description: desc, bbox: bboxArray, population: parseInt(pop) || 0 });
        });
        const newFileContent = `const config = {
    "tile-zoom-level": 16, 
    "protomaps-bucket": "${bucket}", 
    "places": ${JSON.stringify(places, null, 4)},
};
export default config;`;
        saveFile(pkgName, filename, newFileContent);
    });

    document.getElementById('btn-dl-tool').addEventListener('click', () => runPackageScript(pkgName, 'download_tool.js'));
    document.getElementById('btn-dl-data').addEventListener('click', () => runPackageScript(pkgName, 'download_data.js'));
    document.getElementById('btn-process').addEventListener('click', () => runPackageScript(pkgName, 'process_data.js'));
    document.getElementById('btn-dl-tiles').addEventListener('click', () => runPackageScript(pkgName, 'download_tiles.js'));

    document.getElementById('btn-full-setup').addEventListener('click', () => {
        if(confirm("Have you saved your map configuration? If not, click Cancel and save first.")) {
            startMapSetupSequence(pkgName);
        }
    });
}

function runPackageScript(pkgName, scriptName) {
    logToTerminal(`\n>>> Requesting to run ${scriptName}...\n`);
    socket.emit('run-script', { pkgName, scriptName });
}

let setupQueue = [];
let currentPkg = "";

function startMapSetupSequence(pkgName) {
    currentPkg = pkgName;
    setupQueue = ['download_tool.js', 'download_data.js', 'process_data.js', 'download_tiles.js'];
    runNextScript();
}

function runNextScript() {
    if (setupQueue.length === 0) {
        logToTerminal("\n>>> All map setup scripts finished! You can now start patching.\n");
        return;
    }
    const script = setupQueue.shift();
    runPackageScript(currentPkg, script);
}

socket.on('script-done', ({ scriptName, code }) => {
    if (code === 0) {
        if (setupQueue.length > 0 || (currentPkg && setupQueue.length === 0)) {
             setTimeout(runNextScript, 1000);
        }
    } else {
        logToTerminal(`\n!!! Script ${scriptName} failed with code ${code}. Sequence stopped.\n`);
        setupQueue = []; 
        currentPkg = "";
    }
});

function renderAddTrainsEditor(pkgName, filename, config) {
    const allTrains = config.trains || {};
    const standards = ['heavy-metro', 'light-metro'];
    let html = `<h3>Edit Trains (${friendlyNames[pkgName] || pkgName})</h3>`;
    
    html += `<h4 style="margin-top:20px; border-bottom:1px solid #555;">Standard Trains</h4>`;
    html += `<div id="standard-trains-container">`;
    standards.forEach(key => { 
        const trainData = allTrains[key] || STANDARD_TRAINS_DEFAULTS[key];
        if (trainData) html += generateTrainCard(key, trainData, false); 
    });
    html += `</div>`;

    const customKeys = Object.keys(allTrains).filter(k => !standards.includes(k));
    const currentCount = customKeys.length;

    html += `<h4 style="margin-top:30px; border-bottom:1px solid #555;">New Trains</h4>`;
    html += `
    <div style="margin:15px 0; background:#222; padding:10px; border-radius:5px; border:1px solid #444;">
        <label>Number of new train types: </label>
        <input type="number" id="inp-train-count" value="${currentCount}" min="0" max="10" style="width:60px;">
        <button id="btn-update-trains" class="btn-secondary" style="margin-left:10px;">Update Form</button>
    </div>`;

    html += `<div id="custom-trains-container">`;
    customKeys.forEach((key, idx) => { html += generateTrainCard(key, allTrains[key], true, idx); });
    html += `</div>`;

    html += `<button id="save-trains-btn" class="btn-primary" style="margin-top:20px;">Save All Trains</button><p id="save-status" style="margin-top:5px;"></p>`;

    configFormDiv.innerHTML = html;

    document.getElementById('btn-update-trains').addEventListener('click', () => {
        const count = parseInt(document.getElementById('inp-train-count').value) || 0;
        const container = document.getElementById('custom-trains-container');
        let newHtml = '';
        for (let i = 0; i < count; i++) {
            let data = {};
            let key = `custom_train_${i}`;
            
            if (i < customKeys.length) { key = customKeys[i]; data = allTrains[key]; } 
            else if (i < 4) { 
                data = TRAIN_TEMPLATES[i];
                key = data.name.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
                data.id = key; data.compatibleTrackTypes = [key];
            } else {
                data = { name: "New Train", description: "", stats: {}, appearance: {color:"#ffffff"}, id: `train_${i}`, compatibleTrackTypes: [`train_${i}`] };
            }
            newHtml += generateTrainCard(key, data, true, i);
        }
        container.innerHTML = newHtml;
        attachAutoIdListeners();
    });

    attachAutoIdListeners();

    document.getElementById('save-trains-btn').addEventListener('click', () => {
        const resultTrains = {};
        document.querySelectorAll('.train-card[data-type="standard"]').forEach(card => {
            const train = scrapeTrainData(card); resultTrains[train.id] = train;
        });
        document.querySelectorAll('.train-card[data-type="custom"]').forEach(card => {
            const train = scrapeTrainData(card); if (train.id) resultTrains[train.id] = train;
        });
        const fileContent = `// config_trains.js\nexport default {\n  trains: ${JSON.stringify(resultTrains, null, 4)}\n};`;
        saveFile(pkgName, filename, fileContent);
    });
}

function generateTrainCard(key, data, isCustom, idx) {
    const stats = data.stats || {};
    const color = data.appearance ? data.appearance.color : '#ffffff';
    const typeAttr = isCustom ? 'custom' : 'standard';
    const title = isCustom ? `New Train #${idx + 1}` : data.name;

    let html = `
    <div class="train-card" data-key="${key}" data-type="${typeAttr}" style="background:#2a2a2a; border-left:4px solid ${color}; padding:15px; margin-bottom:15px; border-radius:0 4px 4px 0;">
        <h5 style="color:${color}; margin-bottom:10px;">${title} <small style="color:#666;">(${data.id})</small></h5>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label>Name</label><input type="text" class="t-name" value="${data.name || ''}" ${!isCustom ? 'readonly' : ''}></div>
            <div><label>ID (Auto)</label><input type="text" class="t-id" value="${data.id || key}" readonly style="background:#111; color:#777;"></div>
        </div>
        <div style="margin-top:10px;"><label>Description</label><input type="text" class="t-desc" value="${data.description || ''}"></div>
        <div style="margin-top:10px; display:flex; gap:20px; align-items:center;">
             <label><input type="checkbox" class="t-cross" ${data.canCrossRoads ? 'checked' : ''}> Can Cross Roads</label>
             <label>Color: <input type="color" class="t-color" value="${color}"></label>
        </div>
        <div style="margin-top:15px; display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px; background:#222; padding:10px;">
            ${generateStatInput('Max Speed (m/s)', 'maxSpeed', stats.maxSpeed)}
            ${generateStatInput('Max Speed Station', 'maxSpeedLocalStation', stats.maxSpeedLocalStation)}
            ${generateStatInput('Acceleration', 'maxAcceleration', stats.maxAcceleration)}
            ${generateStatInput('Deceleration', 'maxDeceleration', stats.maxDeceleration)}
            ${generateStatInput('Capacity', 'capacityPerCar', stats.capacityPerCar)}
            ${generateStatInput('Car Length', 'carLength', stats.carLength)}
            ${generateStatInput('Min Cars', 'minCars', stats.minCars)}
            ${generateStatInput('Max Cars', 'maxCars', stats.maxCars)}
            ${generateStatInput('Cars/Set', 'carsPerCarSet', stats.carsPerCarSet)}
            ${generateStatInput('Train Width', 'trainWidth', stats.trainWidth)}
            ${generateStatInput('Min Station Len', 'minStationLength', stats.minStationLength)}
            ${generateStatInput('Max Station Len', 'maxStationLength', stats.maxStationLength)}
            ${generateStatInput('Car Cost', 'carCost', stats.carCost)}
            ${generateStatInput('Track Cost', 'baseTrackCost', stats.baseTrackCost)}
            ${generateStatInput('Station Cost', 'baseStationCost', stats.baseStationCost)}
            ${generateStatInput('Train Op Cost', 'trainOperationalCostPerHour', stats.trainOperationalCostPerHour)}
            ${generateStatInput('Car Op Cost', 'carOperationalCostPerHour', stats.carOperationalCostPerHour)}
            ${generateStatInput('Scissors Cost', 'scissorsCrossoverCost', stats.scissorsCrossoverCost)}
        </div>
    </div>`;
    return html;
}

function generateStatInput(label, key, val) {
    return `<div><label style="font-size:0.75rem; display:block; color:#aaa;">${label}</label><input type="number" class="t-stat" data-stat="${key}" value="${val !== undefined ? val : 0}" step="0.1" style="width:100%;"></div>`;
}

function scrapeTrainData(cardElement) {
    const name = cardElement.querySelector('.t-name').value;
    const id = cardElement.querySelector('.t-id').value;
    const desc = cardElement.querySelector('.t-desc').value;
    const canCross = cardElement.querySelector('.t-cross').checked;
    const color = cardElement.querySelector('.t-color').value;
    const stats = {};
    cardElement.querySelectorAll('.t-stat').forEach(inp => { stats[inp.dataset.stat] = parseFloat(inp.value); });
    return { id, name, description: desc, canCrossRoads: canCross, stats, compatibleTrackTypes: [id], appearance: { color } };
}

function attachAutoIdListeners() {
    document.querySelectorAll('.train-card[data-type="custom"]').forEach(card => {
        card.querySelector('.t-name').addEventListener('input', (e) => {
            const val = e.target.value;
            card.querySelector('.t-id').value = val.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        });
    });
}

// --- GENERIC SAVE & INIT ---
async function saveFile(pkgName, filename, content) {
    const statusEl = document.getElementById('save-status');
    statusEl.textContent = "Saving...";
    try {
        const saveRes = await fetch(`/api/package-config/${pkgName}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, content })
        });
        const saveJson = await saveRes.json();
        if (saveJson.success) {
            statusEl.textContent = "Saved!"; statusEl.style.color = "#0f0";
            setTimeout(() => statusEl.textContent = "", 3000);
        } else {
            statusEl.textContent = "Error: " + saveJson.error; statusEl.style.color = "red";
        }
    } catch (e) { statusEl.textContent = "Network error: " + e.message; statusEl.style.color = "red"; }
}

function renderRawEditor(pkgName, filename, content, msg) {
    configFormDiv.innerHTML = `<h3>Editing (RAW): ${filename}</h3><p style="color:orange; font-size:0.8rem;">${msg || ''}</p><textarea id="config-editor" style="width:100%; height:300px; background:#111; color:#0f0; font-family:monospace; border:1px solid #444; padding:10px;">${content}</textarea><button id="save-raw-btn" class="btn-primary" style="margin-top:10px;">Save Raw Config</button><p id="save-status"></p>`;
    document.getElementById('save-raw-btn').addEventListener('click', () => saveFile(pkgName, filename, document.getElementById('config-editor').value));
}

startBtn.addEventListener('click', () => {
    const selected = [];
    document.querySelectorAll('.package-item input[type="checkbox"]').forEach(cb => { if (cb.checked) selected.push(cb.value); });
    if (selected.length === 0) { alert("Select at least one package."); return; }
    startBtn.disabled = true; startBtn.textContent = "Running..."; logContent.textContent = "";
    socket.emit('run-patcher', selected);
});

// --- UPDATED LOG FUNCTION ---
function logToTerminal(text) {
    const cleanText = text.replace(/\r/g, ''); 

    const currentText = logContent.textContent;
    const lastNewlineIndex = currentText.lastIndexOf('\n');
    let lastLine = "";
    
    if (lastNewlineIndex !== -1) {
        lastLine = currentText.substring(lastNewlineIndex + 1);
    } else {
        lastLine = currentText;
    }

    if (cleanText.includes("fetching chunks") || cleanText.includes("% |")) {
        if (lastLine.includes("fetching chunks") || lastLine.includes("% |")) {
            logContent.textContent = currentText.substring(0, lastNewlineIndex + 1) + cleanText.trim();
        } else {
            logContent.textContent += (currentText.endsWith('\n') ? '' : '\n') + cleanText.trim();
        }
    } else {
        if (lastLine.includes("fetching chunks") || lastLine.includes("% |")) {
            logContent.textContent += '\n' + cleanText;
        } else {
            logContent.textContent += cleanText;
        }
    }
    
    terminal.scrollTop = terminal.scrollHeight;
}

socket.on('log', (msg) => logToTerminal(msg));
socket.on('process-finished', () => { startBtn.disabled = false; startBtn.textContent = "START PATCHING"; logContent.textContent += "\n--- DONE ---"; terminal.scrollTop = terminal.scrollHeight; });

async function loadRootConfig() {
    try {
        const res = await fetch('/api/root-config');
        const conf = await res.json();
        
        if (conf.path) {
            document.getElementById('sb-path').value = conf.path;
        }
        
        if (conf.platform) {
            document.getElementById('platform-select').value = conf.platform;
        } else {
            // AUTO-DETECT IF NO CONFIG EXISTS
            const detected = detectOS();
            if (detected) document.getElementById('platform-select').value = detected;
            
            // PRE-FILL PATH SUGGESTION
            let suggestion = "";
            if (detected === "windows") suggestion = "C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Programs\\Subway Builder\\";
            else if (detected === "macos") suggestion = "/Applications/Subway Builder.app/";
            else if (detected === "linux") suggestion = "/path/to/SubwayBuilder.AppImage";
            
            document.getElementById('sb-path').value = suggestion;
        }
    } catch(e) { console.log("No existing config found."); }
}

loadRootConfig();