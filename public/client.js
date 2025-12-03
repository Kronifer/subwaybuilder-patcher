const socket = io();

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

// --- STATE MANAGEMENT ---
let wizardState = {
    currentStepIndex: 0,
    steps: [],
    rootConfig: {},
    availablePackages: [],
    selectedPackages: [],
    configs: {}
};

const wizardContent = document.getElementById('wizard-content');
const progressBarFill = document.getElementById('progress-bar-fill');
const stepIndicator = document.getElementById('step-indicator');
const btnBack = document.getElementById('btn-back');
const btnNext = document.getElementById('btn-next');
const statusMsg = document.getElementById('status-message');
const logContent = document.getElementById('log-content');
const terminalWrapper = document.getElementById('terminal-wrapper');
const terminal = document.getElementById('terminal');

// --- HELPER: LOGGING ---
function logToTerminal(text) {
    const cleanText = text.replace(/\r/g, ''); 
    const currentText = logContent.textContent;
    if (currentText === "_") logContent.textContent = "";
    logContent.textContent += cleanText;
    terminal.scrollTop = terminal.scrollHeight;
}

socket.on('log', (msg) => logToTerminal(msg));

let setupQueue = [];
let currentPkg = "";

function startMapSetupSequence(pkgName, scriptList) {
    currentPkg = pkgName;
    const defaultScripts = ['download_data.js', 'process_data.js', 'download_tiles.js'];
    setupQueue = (scriptList && scriptList.length) ? scriptList : defaultScripts;
    
    // Check tools first
    logToTerminal("\nChecking Map Tools...\n");
    fetch('/api/map-tools-status').then(r=>r.json()).then(status => {
        if (!status.installed) {
            logToTerminal("Error: Map tools missing. Please run install dependencies first(.bat for windows and .sh for Linux and macOS).\n");
        } else {
            logToTerminal("Tools found. Starting sequence...\n");
            runNextScript();
        }
    }).catch(() => logToTerminal("Error checking tools.\n"));
}

function runNextScript() {
    if (setupQueue.length === 0) {
        logToTerminal("\n>>> All map setup scripts finished!\n");
        return;
    }
    const script = setupQueue.shift();
    socket.emit('run-script', { pkgName: currentPkg, scriptName: script });
}

socket.on('script-done', ({ scriptName, code }) => {
    if (code === 0) {
        if (setupQueue.length > 0) setTimeout(runNextScript, 1000);
        else logToTerminal(`\n>>> Sequence Complete for ${currentPkg}.\n`);
    } else {
        logToTerminal(`\n!!! Script ${scriptName} failed with code ${code}.\n`);
        setupQueue = [];
    }
});


// --- WIZARD STEPS DEFINITION ---

// STEP 1: ROOT CONFIG
const stepRootConfig = {
    id: 'root-config',
    title: 'Patcher Configuration',
    render: async () => {
        let currentPlatform = 'windows';
        let currentPath = '';
        try {
            const res = await fetch('/api/root-config');
            const data = await res.json();
            if (data.path) currentPath = data.path;
            if (data.platform) currentPlatform = data.platform;
            else currentPlatform = detectOS();
        } catch(e) {}

        return `
            <h2>Patcher Configuration</h2>
            <p>Welcome! Let's start by locating your Subway Builder installation.</p>
            <div class="field-group">
                <label for="platform-select">Platform</label>
                <select id="platform-select">
                    <option value="windows" ${currentPlatform === 'windows' ? 'selected' : ''}>Windows</option>
                    <option value="linux" ${currentPlatform === 'linux' ? 'selected' : ''}>Linux</option>
                    <option value="macos" ${currentPlatform === 'macos' ? 'selected' : ''}>macOS</option>
                </select>
            </div>
            <div class="field-group">
                <label for="sb-path">Installation Path</label>
                <input type="text" id="sb-path" value="${currentPath}" placeholder="e.g. C:\\Users\\Name\\AppData\\Local\\Programs\\Subway Builder\\" />
                <small style="color:#888;">Note: Select the FOLDER containing the executable, not the file itself.</small>
            </div>
        `;
    },
    onLoad: () => {
        fetch('/api/default-paths').then(r => r.json()).then(defaults => {
            document.getElementById('platform-select').addEventListener('change', (e) => {
                const val = e.target.value;
                if (defaults[val]) document.getElementById('sb-path').value = defaults[val];
            });
        });
    },
    validate: () => {
        const path = document.getElementById('sb-path').value;
        if (!path || path.length < 3) return "Please enter a valid path.";
        if (path.includes("YOUR_USERNAME")) return "Please replace 'YOUR_USERNAME' with your actual username.";
        return true;
    },
    save: async () => {
        const platform = document.getElementById('platform-select').value;
        const path = document.getElementById('sb-path').value;
        const res = await fetch('/api/root-config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, path })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        wizardState.rootConfig = { platform, path };
    }
};

// STEP 2: SELECT PACKAGES
const stepSelectPackages = {
    id: 'select-packages',
    title: 'Select Mods',
    render: async () => {
        try {
            const res = await fetch('/api/packages');
            wizardState.availablePackages = await res.json();
        } catch(e) { wizardState.availablePackages = []; }

        if (wizardState.availablePackages.length === 0) return `<p>No packages found.</p>`;

        let html = `<h2>Which mods do you want to install?</h2>
                    <p>Select the modifications you wish to apply to the game.</p>
                    <div class="package-list">`;
        
        const friendlyNames = {
            'mapPatcher': 'Map Patcher (Kronifer)',
            'addTrains': 'New Trains (mhmoeller)',
            'subwaybuilder-addtrains': 'New Trains (mhmoeller)',
            'settingsTweaks': 'Settings Tweaks (slurry)',
            'subwaybuilder-patcher-settingsTweaks': 'Settings Tweaks (slurry)'
        };

        wizardState.availablePackages.forEach(pkg => {
            const label = friendlyNames[pkg] || pkg;
            const isChecked = true;
            html += `
                <div class="package-item">
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" id="pkg-${pkg}" value="${pkg}" ${isChecked ? 'checked' : ''}>
                        <label for="pkg-${pkg}">${label}</label>
                    </div>
                </div>`;
        });
        html += `</div>`;
        return html;
    },
    validate: () => {
        const checkboxes = document.querySelectorAll('.package-item input[type="checkbox"]');
        let selected = [];
        checkboxes.forEach(cb => { if(cb.checked) selected.push(cb.value); });
        if (selected.length === 0) return "Please select at least one mod.";
        wizardState.selectedPackages = selected;
        return true;
    },
    save: async () => {
        generateDynamicSteps();
    }
};

// FINAL STEP: PATCHING
const stepPatching = {
    id: 'patching',
    title: 'Start Patching',
    render: async () => {
        return `
            <h2>Ready to Patch</h2>
            <p>You have configured the following modules:</p>
            <ul>
                ${wizardState.selectedPackages.map(p => `<li>${p}</li>`).join('')}
            </ul>
            <p>Click <strong>"Start Patching"</strong> to begin. The log output will appear below.</p>
            <div id="shortcut-area" style="display:none; margin-top:20px; border-top:1px solid #444; padding-top:15px; text-align:center;">
                <p style="color:#0f0; margin-bottom:10px;">Patching Complete!</p>
                <button id="btn-create-shortcut" class="btn-primary" style="background:#8e44ad; width:auto;">Create Desktop Shortcut</button>
                <p id="shortcut-status" style="margin-top:10px; font-size:0.9rem; color:#aaa;"></p>
            </div>
        `;
    },
    onLoad: () => {
        terminalWrapper.style.display = 'block';
        btnNext.textContent = "Start Patching";
        
        // Setup Shortcut Button Listener
        const btn = document.getElementById('btn-create-shortcut');
        if(btn) {
            btn.addEventListener('click', async () => {
                const stat = document.getElementById('shortcut-status');
                stat.textContent = "Creating shortcut...";
                try {
                    const res = await fetch('/api/create-shortcut', { method: 'POST' });
                    const data = await res.json();
                    if(data.success) {
                        stat.textContent = `Success! Created: ${data.path}`;
                        stat.style.color = "#0f0";
                    } else {
                        stat.textContent = "Error: " + data.error;
                        stat.style.color = "red";
                    }
                } catch(e) {
                    stat.textContent = "Network Error";
                    stat.style.color = "red";
                }
            });
        }
    },
    validate: () => true,
    save: async () => {
        btnNext.disabled = true;
        btnBack.disabled = true;
        btnNext.textContent = "Running...";
        socket.emit('run-patcher', wizardState.selectedPackages);
        return new Promise((resolve) => {}); // Halt navigation
    }
};

function generateDynamicSteps() {
    const baseSteps = [stepRootConfig, stepSelectPackages];
    const newSteps = [];

    wizardState.selectedPackages.forEach(pkg => {
        const lower = pkg.toLowerCase();
        if (lower.includes('mappatcher')) {
            newSteps.push(createMapPatcherStep(pkg));
        } else if (lower.includes('addtrains')) {
            newSteps.push(createAddTrainsStep(pkg));
        } else if (lower.includes('settingstweaks') || lower.includes('subwaybuilder-patcher')) {
            newSteps.push(createSettingsTweaksStep(pkg));
        }
    });

    wizardState.steps = [...baseSteps, ...newSteps, stepPatching];
}

// --- MAP PATCHER WINDOW ---
function createMapPatcherStep(pkgName) {
    return {
        id: `config-${pkgName}`,
        title: 'Map Configuration',
        render: async () => {
            const res = await fetch(`/api/package-config/${pkgName}`);
            const data = await res.json();
            const mapsRes = await fetch('/api/premade-maps');
            const maps = await mapsRes.json();
            
            let configObj = {};
            if (data.content) {
                try {
                    const cleanJs = data.content.replace(/export default/g, 'return');
                    configObj = new Function(cleanJs)();
                } catch (e) {}
            }

            return `
                <h2>Map Patcher Configuration</h2>
                
                <div class="map-mode-tabs">
                    <div class="mode-tab active" data-mode="easy">Import Maps</div>
                    <div class="mode-tab" data-mode="advanced">Manual Configuration</div>
                </div>

                <!-- EASY MODE -->
                <div id="mode-easy" class="mode-content active">
                    <h3>Import Maps</h3>
                    <p>Select a map pack from the <code>premade_maps</code> folder.</p>
                    <div class="field-group" style="background:#333; padding:15px; border-radius:5px;">
                        <label>Available Map Packs</label>
                        <select id="premade-select">
                            <option value="">-- Select Map Pack --</option>
                            ${maps.map(m => `<option value="${m}">${m}</option>`).join('')}
                        </select>
                        <button id="btn-easy-install" class="btn-primary" style="margin-top:10px; width:auto;">Install Selected Map</button>
                        <p id="easy-install-status" style="margin-top:10px; font-weight:bold;"></p>
                    </div>
                </div>

                <!-- ADVANCED MODE -->
				<div id="mode-advanced" class="mode-content">
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
                    <h3>Manual Configuration</h3>
                    <div id="places-container"></div>
                    <button id="btn-add-place" class="btn-secondary" style="margin-top:10px;">+ Add Place</button>
                    
                    <div style="margin-top:20px; border-top:1px solid #444; padding-top:10px;">
                        <h4>Advanced Actions</h4>
                        <button id="btn-full-setup-adv" class="btn-primary" style="background:#e67e22; margin-bottom:10px;">Run Full Map Setup</button>
                        
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button class="btn-secondary" id="btn-dl-data">1. Download Data</button>
                            <button class="btn-secondary" id="btn-process">2. Process Data</button>
                            <button class="btn-secondary" id="btn-dl-tiles">3. Download Tiles</button>
                        </div>
                        <p style="font-size:0.8rem; color:#aaa; margin-top:5px;">Check "Output Log" below to see progress.</p>
                    </div>

                    <input type="hidden" id="raw-filename" value="${data.filename || 'config.js'}">
                </div>
            `;
        },
        onLoad: () => {
            // Tabs
            document.querySelectorAll('.mode-tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.mode-content').forEach(c => c.classList.remove('active'));
                    tab.classList.add('active');
                    document.getElementById(`mode-${tab.dataset.mode}`).classList.add('active');
                });
            });

            // Easy Install
            document.getElementById('btn-easy-install').addEventListener('click', async () => {
                const filename = document.getElementById('premade-select').value;
                const status = document.getElementById('easy-install-status');
                if(!filename) return;
                status.textContent = "Preparing for patching..."; status.style.color = "#aaa";
                try {
                    const res = await fetch('/api/install-premade-map', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ filename }) });
                    const d = await res.json();
                    if(d.success) {
                        status.textContent = "Success! Mappack prepared."; status.style.color = "#0f0";
                        loadAdvancedPlaces(pkgName);
                    } else {
                        status.textContent = "Error: " + d.error; status.style.color = "red";
                    }
                } catch(e) { status.textContent = "Network Error"; status.style.color = "red"; }
            });

            // Advanced Actions
            loadAdvancedPlaces(pkgName);
            document.getElementById('btn-add-place').addEventListener('click', () => addPlaceCard());

            const showTerm = () => terminalWrapper.style.display = 'block';
            document.getElementById('btn-full-setup-adv').addEventListener('click', () => { showTerm(); startMapSetupSequence(pkgName); });
            document.getElementById('btn-dl-data').addEventListener('click', () => { showTerm(); startMapSetupSequence(pkgName, ['download_data.js']); });
            document.getElementById('btn-process').addEventListener('click', () => { showTerm(); startMapSetupSequence(pkgName, ['process_data.js']); });
            document.getElementById('btn-dl-tiles').addEventListener('click', () => { showTerm(); startMapSetupSequence(pkgName, ['download_tiles.js']); });
        },
        validate: () => true,
        save: async () => {
            const filename = document.getElementById('raw-filename').value;
            const places = scrapePlaces();
            const content = `const config = {\n    "tile-zoom-level": 16, \n    "places": ${JSON.stringify(places, null, 4)},\n};\nexport default config;`;
            await fetch(`/api/package-config/${pkgName}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ filename, content }) });
        }
    };
}

// --- ADD TRAINS WINDOW ---
function createAddTrainsStep(pkgName) {
    return {
        id: `config-${pkgName}`,
        title: 'Train Configuration',
        render: async () => {
            const res = await fetch(`/api/package-config/${pkgName}`);
            const data = await res.json();
            let allTrains = {};
            let filename = data.filename || 'config_trains.js';
            
            try {
                if (data.content && data.content.includes('export default')) {
                    const cleanJs = data.content.replace(/export default/g, 'return');
                    const conf = new Function(cleanJs)();
                    allTrains = conf.trains || {};
                }
            } catch(e) {}

            const standards = ['heavy-metro', 'light-metro'];
            
            let html = `<h2>Configure Trains</h2>`;
            html += `<h4 style="border-bottom:1px solid #555;">Standard Trains</h4>`;
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
                <button id="btn-update-trains" class="btn-secondary" style="margin-left:10px; width:auto; padding:5px 10px;">Update Form</button>
            </div>`;

            html += `<div id="custom-trains-container">`;
            customKeys.forEach((key, idx) => { html += generateTrainCard(key, allTrains[key], true, idx); });
            html += `</div>`;
            html += `<input type="hidden" id="trains-filename" value="${filename}">`;
            
            wizardState.configs[pkgName] = allTrains;
            
            return html;
        },
        onLoad: () => {
            const container = document.getElementById('custom-trains-container');
            const allTrains = wizardState.configs[pkgName] || {};
            const customKeys = Object.keys(allTrains).filter(k => !['heavy-metro', 'light-metro'].includes(k));

            document.getElementById('btn-update-trains').addEventListener('click', () => {
                const count = parseInt(document.getElementById('inp-train-count').value) || 0;
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
        },
        validate: () => true,
        save: async () => {
            const resultTrains = {};
            document.querySelectorAll('.train-card[data-type="standard"]').forEach(card => {
                const train = scrapeTrainData(card); resultTrains[train.id] = train;
            });
            document.querySelectorAll('.train-card[data-type="custom"]').forEach(card => {
                const train = scrapeTrainData(card); if (train.id) resultTrains[train.id] = train;
            });
            
            const filename = document.getElementById('trains-filename').value;
            const content = `// config_trains.js\nexport default {\n  trains: ${JSON.stringify(resultTrains, null, 4)}\n};`;
            
            await fetch(`/api/package-config/${pkgName}`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ filename, content })
            });
        }
    };
}

// --- SETTINGS TWEAKS WINDOW ---
function createSettingsTweaksStep(pkgName) {
    return {
        id: `config-${pkgName}`,
        title: 'Game Settings',
        render: async () => {
            const res = await fetch(`/api/package-config/${pkgName}`);
            const data = await res.json();
            let config = {};
            try {
                const cleanJs = data.content.replace(/export default/g, 'return');
                config = new Function(cleanJs)();
            } catch (e) {}

            const numInp = (key, val) => `<input type="number" id="inp-${key}" value="${val !== undefined ? val : 0}" style="width:100px; padding:5px;">`;
            const speeds = config.gameSpeeds || [1, 25, 250, 500];
            const elevationMultipliers = config.elevation_multipliers || [4.5, 2, 1, 0.3, 0.8];
            const waterMultipliers     = config.water_multipliers || [1.44444, 1.5, 3, 10, 2.5];
            const elevationThresholds  = config.elevation_thresholds || [-100, -24, -10, -3, 4.5];
            const bondDefaults = {
                SMALL: { principal: 1e8, interestRate: 0.1, requiredDailyRevenue: 1e7 },
                MEDIUM: { principal: 5e8, interestRate: 0.08, requiredDailyRevenue: 1e8 },
                LARGE: { principal: 1e9, interestRate: 0.06, requiredDailyRevenue: 2e8 }
            };
            const bonds = config.bondParameters || bondDefaults;

            // HTML Structure (Ported from original)
            return `
            <h2>Settings Tweaks</h2>
            <p>Configure game balance parameters below.</p>
            <input type="hidden" id="tweaks-filename" value="${data.filename}">
            
            <div class="field-group">
                <label><input type="checkbox" id="chk-gameSpeed" ${config.changeGameSpeeds ? 'checked' : ''}> <strong>Change Game Speeds</strong></label>
                <div id="div-gameSpeed" style="margin-top:10px; display:${config.changeGameSpeeds ? 'block' : 'none'}; padding-left:20px;">
                    <p style="font-size:0.8rem; color:#aaa;">Enter 4 speeds (factor):</p>
                    <div style="display:flex; gap:10px;">
                        ${speeds.map((s) => `<input type="number" class="inp-speed" value="${s}" style="width:70px;">`).join('')}
                    </div>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-radius" ${config.changeMinTurnRadius ? 'checked' : ''}> <strong>Change Minimum Turn Radius</strong></label>
                <div id="div-radius" style="margin-top:10px; display:${config.changeMinTurnRadius ? 'block' : 'none'}; padding-left:20px;">
                    <label>Radius (m): ${numInp('radius', config.minTurnRadius)}</label>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-slope" ${config.changeMaxSlope ? 'checked' : ''}> <strong>Change Maximum Slope</strong></label>
                <div id="div-slope" style="margin-top:10px; display:${config.changeMaxSlope ? 'block' : 'none'}; padding-left:20px;">
                    <label>Max Slope (%): ${numInp('slope', config.maxSlope)}</label>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-money" ${config.changeStartingMoney ? 'checked' : ''}> <strong>Change Starting Money</strong></label>
                <div id="div-money" style="margin-top:10px; display:${config.changeStartingMoney ? 'block' : 'none'}; padding-left:20px;">
                    <label>Billions: ${numInp('money', config.startingMoney)}</label>
                    <br><label>Number of starting train cars: ${numInp('cars', config.startingTrainCars)}</label>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-crossover" ${config.changeScissorLength ? 'checked' : ''}> <strong>Change Scissor Crossover Length</strong></label>
                <div id="div-crossover" style="margin-top:10px; display:${config.changeScissorLength ? 'block' : 'none'}; padding-left:20px;">
                    <label>Scissor Crossover Length (m): ${numInp('crossover', config.scissorLength)}</label>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-construction" ${config.changeConstructionCosts ? 'checked' : ''}> <strong>Change Construction Costs</strong></label>
                <div id="div-construction" style="margin-top:10px; display:${config.changeConstructionCosts ? 'block' : 'none'}; padding-left:20px;">
                    <label>Single Track Multiplier: ${numInp('single_multiplier', config.single_multiplier ?? 1.0)}</label>
                    <br><label>Quad Track Multiplier: ${numInp('quad_multiplier', config.quad_multiplier ?? 1.0)}</label>
                    <br>
                    <p style="font-size:0.8rem; color:#aaa;">Elevation Multipliers:</p>
                    <div style="display:flex; gap:10px;">${elevationMultipliers.map((v,i) => `<input type="number" class="inp-elevation" value="${v}" style="width:70px;">`).join('')}</div>
                    <p style="font-size:0.8rem; color:#aaa;">Water Multipliers:</p>
                    <div style="display:flex; gap:10px;">${waterMultipliers.map((v,i) => `<input type="number" class="inp-water" value="${v}" style="width:70px;">`).join('')}</div>
                    <p style="font-size:0.8rem; color:#aaa;">Elevation Thresholds:</p>
                    <div style="display:flex; gap:10px;">${elevationThresholds.map((v,i) => `<input type="number" class="inp-threshold" value="${v}" style="width:70px;">`).join('')}</div>
                </div>
            </div>

            <div class="field-group">
                <label><input type="checkbox" id="chk-bonds" ${config.changeBonds ? 'checked' : ''}> <strong>Change Bond Parameters</strong></label>
                <div id="div-bonds" style="margin-top:10px; display:${config.changeBonds ? 'block' : 'none'}; padding-left:20px;">
                    <h4 style="color:#ccc;">Small Bond</h4>
                    <label>Principal (M): ${numInp('bond-small-principal', bonds.SMALL.principal / 1e6)}</label>
                    <label>Interest: ${numInp('bond-small-interest', bonds.SMALL.interestRate)}</label>
                    <label>Rev (M): ${numInp('bond-small-revenue', bonds.SMALL.requiredDailyRevenue / 1e6)}</label>
                    
                    <h4 style="color:#ccc; margin-top:10px;">Medium Bond</h4>
                    <label>Principal (M): ${numInp('bond-medium-principal', bonds.MEDIUM.principal / 1e6)}</label>
                    <label>Interest: ${numInp('bond-medium-interest', bonds.MEDIUM.interestRate)}</label>
                    <label>Rev (M): ${numInp('bond-medium-revenue', bonds.MEDIUM.requiredDailyRevenue / 1e6)}</label>

                    <h4 style="color:#ccc; margin-top:10px;">Large Bond</h4>
                    <label>Principal (M): ${numInp('bond-large-principal', bonds.LARGE.principal / 1e6)}</label>
                    <label>Interest: ${numInp('bond-large-interest', bonds.LARGE.interestRate)}</label>
                    <label>Rev (M): ${numInp('bond-large-revenue', bonds.LARGE.requiredDailyRevenue / 1e6)}</label>
                </div>
            </div>`;
        },
        onLoad: () => {
             const toggle = (chkId, divId) => {
                document.getElementById(chkId).addEventListener('change', (e) => {
                    document.getElementById(divId).style.display = e.target.checked ? 'block' : 'none';
                });
            };
            toggle('chk-gameSpeed', 'div-gameSpeed');
            toggle('chk-radius', 'div-radius');
            toggle('chk-slope', 'div-slope');
            toggle('chk-money', 'div-money');
            toggle('chk-crossover', 'div-crossover');
            toggle('chk-construction', 'div-construction');
            toggle('chk-bonds', 'div-bonds');
        },
        validate: () => true,
        save: async () => {
            const getVal = (id) => parseFloat(document.getElementById(id).value);
            const getInt = (id) => parseInt(document.getElementById(id).value);
            
            const newConfig = {
                changeGameSpeeds: document.getElementById('chk-gameSpeed').checked,
                gameSpeeds: Array.from(document.querySelectorAll('.inp-speed')).map(i => parseInt(i.value)),
                changeMinTurnRadius: document.getElementById('chk-radius').checked,
                minTurnRadius: getInt('inp-radius'),
                changeMaxSlope: document.getElementById('chk-slope').checked,
                maxSlope: getInt('inp-slope'),
                changeStartingMoney: document.getElementById('chk-money').checked,
                startingMoney: getInt('inp-money'),
                startingTrainCars: getInt('inp-cars'),
                changeScissorLength: document.getElementById('chk-crossover').checked,
                scissorLength: getInt('inp-crossover'),
                changeConstructionCosts: document.getElementById('chk-construction').checked,
                single_multiplier: getVal('inp-single_multiplier'),
                quad_multiplier: getVal('inp-quad_multiplier'),
                elevation_multipliers: Array.from(document.querySelectorAll('.inp-elevation')).map(i => parseFloat(i.value)),
                water_multipliers: Array.from(document.querySelectorAll('.inp-water')).map(i => parseFloat(i.value)),
                elevation_thresholds: Array.from(document.querySelectorAll('.inp-threshold')).map(i => parseFloat(i.value)),
                changeBonds: document.getElementById('chk-bonds').checked,
                bondParameters: {
                    SMALL: {
                        principal: getVal('inp-bond-small-principal') * 1e6,
                        interestRate: getVal('inp-bond-small-interest'),
                        requiredDailyRevenue: getVal('inp-bond-small-revenue') * 1e6
                    },
                    MEDIUM: {
                        principal: getVal('inp-bond-medium-principal') * 1e6,
                        interestRate: getVal('inp-bond-medium-interest'),
                        requiredDailyRevenue: getVal('inp-bond-medium-revenue') * 1e6
                    },
                    LARGE: {
                        principal: getVal('inp-bond-large-principal') * 1e6,
                        interestRate: getVal('inp-bond-large-interest'),
                        requiredDailyRevenue: getVal('inp-bond-large-revenue') * 1e6
                    }
                }
            };
            
            const filename = document.getElementById('tweaks-filename').value;
            const content = `const config = ${JSON.stringify(newConfig, null, 4)};\nexport default config;`;
             
             await fetch(`/api/package-config/${pkgName}`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ filename, content })
            });
        }
    };
}

// --- SHARED HELPER FUNCTIONS ---

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

function loadAdvancedPlaces(pkgName) {
    const container = document.getElementById('places-container');
    if(!container) return;
    container.innerHTML = "Loading places...";
    fetch(`/api/package-config/${pkgName}`).then(r=>r.json()).then(data => {
        let configObj = { places: [] };
        if (data.content) {
            try { configObj = new Function(data.content.replace(/export default/g, 'return'))(); } catch (e) {}
        }
        container.innerHTML = "";
        if (configObj.places && Array.isArray(configObj.places)) configObj.places.forEach(p => addPlaceCard(p));
    });
}

function addPlaceCard(place = {}) {
    const container = document.getElementById('places-container');
    const div = document.createElement('div');
    div.className = 'place-card';
    div.innerHTML = `
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
            <div><label>Code</label><input type="text" class="inp-code" value="${place.code||''}"></div>
            <div><label>Name</label><input type="text" class="inp-name" value="${place.name||''}"></div>
        </div>
        <div style="margin-top:5px;"><label>Description</label><input type="text" class="inp-desc" value="${place.description||''}"></div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:5px;">
            <div style="margin-top:5px;"><label>Population</label><input type="number" class="inp-population" value="${place.population || 0}"></div>
            <div style="margin-top:5px;"><label>BBox</label><input type="text" class="inp-bbox" value="${place.bbox ? place.bbox.join(',') : ''}" placeholder="-79.4, 43.6, ..."></div>
        </div>
        <div style="margin-top:5px;"><label>Thumbnail BBox (optional)</label><input type="text" class="inp-thumb-bbox" value="${place.thumbnailBbox ? place.thumbnailBbox.join(',') : ''}" placeholder="-79.4, 43.6, ..."></div>
        <label>Initial View State (optional)</label>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:5px;">
            <div><label>Latitude</label><input type="number" class="inp-view-lat" value="${place.initialViewState ? place.initialViewState.latitude : ''}" step="0.0001"></div>
            <div><label>Longitude</label><input type="number" class="inp-view-lon" value="${place.initialViewState ? place.initialViewState.longitude : ''}" step="0.0001"></div>
            <div><label>Zoom</label><input type="number" class="inp-view-zoom" value="${place.initialViewState ? place.initialViewState.zoom : ''}" step="0.1"></div>
            <div><label>Bearing</label><input type="number" class="inp-view-bearing" value="${place.initialViewState ? place.initialViewState.bearing : ''}" step="1"></div>
        </div>
        <button class="btn-secondary btn-remove-place" style="background:#c0392b; margin-top:10px; padding:5px 10px; font-size:0.8rem;">Remove Place</button>
    `;
    
    div.querySelector('.btn-remove-place').addEventListener('click', () => {
        if(confirm("Are you sure you want to remove " + (place.name || "this place") + "?")) {
            div.remove();
        }
    });

    container.appendChild(div);
}

function scrapePlaces() {
    const places = [];
    document.querySelectorAll('.place-card').forEach(card => {
        const code = card.querySelector('.inp-code').value;
        const name = card.querySelector('.inp-name').value;
        const desc = card.querySelector('.inp-desc').value;
        const bboxStr = card.querySelector('.inp-bbox').value;
        const population = parseInt(card.querySelector('.inp-population').value) || 0;
        const thumbBboxStr = card.querySelector('.inp-thumb-bbox').value;
        const initialViewState = {
            latitude: typeof(parseFloat(card.querySelector('.inp-view-lat').value)) == 'number' ? parseFloat(card.querySelector('.inp-view-lat').value) : undefined,
            longitude: typeof(parseFloat(card.querySelector('.inp-view-lon').value)) == 'number' ? parseFloat(card.querySelector('.inp-view-lon').value) : undefined,
            zoom: typeof(parseFloat(card.querySelector('.inp-view-zoom').value)) == 'number' ? parseFloat(card.querySelector('.inp-view-zoom').value) : undefined,
            bearing: typeof(parseFloat(card.querySelector('.inp-view-bearing').value)) == 'number' ? parseFloat(card.querySelector('.inp-view-bearing').value) : undefined,
        }
        let bbox = [];
        try { bbox = bboxStr.split(',').map(n => parseFloat(n.trim())); } catch(e){}
        let thumbnailBbox = [];
        try { thumbnailBbox = thumbBboxStr.split(',').map(n => parseFloat(n.trim())); } catch(e){}
        let finalCity = { code, name, description: desc, bbox, population };
        if(thumbnailBbox.length === 4) finalCity.thumbnailBbox = thumbnailBbox;
        if(initialViewState.latitude !== undefined && initialViewState.longitude !== undefined && initialViewState.zoom !== undefined && initialViewState.bearing !== undefined) finalCity.initialViewState = initialViewState;
        if(code) places.push(finalCity);
    });
    return places;
}

function detectOS() {
    const ua = navigator.userAgent;
    if (ua.indexOf("Win") !== -1) return "windows";
    if (ua.indexOf("Mac") !== -1) return "macos";
    if (ua.indexOf("Linux") !== -1) return "linux";
    return "windows";
}

// --- Render step logic ---

async function renderStep(index) {
    if (index < 0 || index >= wizardState.steps.length) return;
    const step = wizardState.steps[index];
    stepIndicator.textContent = `Step ${index + 1} of ${wizardState.steps.length} - ${step.title}`;
    const pct = ((index + 1) / wizardState.steps.length) * 100;
    progressBarFill.style.width = `${pct}%`;
    
    wizardContent.innerHTML = `<p>Loading step...</p>`;
    wizardContent.innerHTML = await step.render();
    if (step.onLoad) step.onLoad();

    btnBack.disabled = index === 0;
    btnNext.disabled = false;
    btnNext.textContent = (index === wizardState.steps.length - 1) ? "Start Patching" : "Next";
    statusMsg.textContent = "";
}

async function handleNext() {
    statusMsg.textContent = "";
    const step = wizardState.steps[wizardState.currentStepIndex];
    if (step.validate && step.validate() !== true) {
        statusMsg.textContent = step.validate(); statusMsg.style.color = "red"; return;
    }
    if (step.save) {
        try {
            btnNext.disabled = true; btnNext.textContent = "Saving...";
            await step.save();
        } catch(e) {
            statusMsg.textContent = "Error saving: " + e.message; btnNext.disabled = false; btnNext.textContent = "Next"; return;
        }
        btnNext.disabled = false; btnNext.textContent = "Next";
    }
    if (wizardState.currentStepIndex < wizardState.steps.length - 1) {
        wizardState.currentStepIndex++;
        renderStep(wizardState.currentStepIndex);
    }
}

async function handleBack() {
    if (wizardState.currentStepIndex > 0) {
        wizardState.currentStepIndex--;
        renderStep(wizardState.currentStepIndex);
    }
}

async function initWizard() {
    wizardState.steps = [stepRootConfig, stepSelectPackages, stepPatching];
    btnNext.addEventListener('click', handleNext);
    btnBack.addEventListener('click', handleBack);
    socket.on('process-finished', () => {
        logToTerminal("\n--- PATCHING COMPLETE ---");
        btnNext.textContent = "Done"; btnNext.disabled = false;
        btnNext.onclick = () => alert("Patching finished! You can close this window.");
        
        // SHOW SHORTCUT BUTTON
        const shortcutArea = document.getElementById('shortcut-area');
        if(shortcutArea) shortcutArea.style.display = 'block';
    });
    renderStep(0);
}

initWizard();