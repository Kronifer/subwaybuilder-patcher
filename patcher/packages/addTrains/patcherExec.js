import config from './config_trains.js';

/**
 * patcherExec
 * Required by Kronifer's SubwayBuilder Patcher (refactorExtendable).
 * * @param {Object} fileContents - Dictionary containing filenames/content and resource paths.
 * @returns {Object} The modified fileContents dictionary.
 */
export function patcherExec(fileContents) {
  console.log("[addTrains] Executing patcherExec...");

  // Iterate over the dictionary to find the correct files by their dynamic names
  fileContents.INDEX = patchIndexContent(fileContents.INDEX, config);
  fileContents.GAMEMAIN = patchGameMainContent(fileContents.GAMEMAIN, config);

  console.log("Successfully patched trains according to config_trains.js");
  return fileContents;
}

// ==================================================
// LOGIC FUNCTIONS (Core implementation)
// ==================================================

function patchIndexContent(text, config) {
  let newText = text;
  let changed = false;

  // 1. OVERWRITE TRAIN_TYPES
  const reTrain = /const TRAIN_TYPES\s*=\s*\{[\s\S]*?\};/;
  if (reTrain.test(newText)) {
    // We use config.trains directly as requested
    const jsonString = JSON.stringify(config.trains, null, 0);
    newText = newText.replace(reTrain, `const TRAIN_TYPES = ${jsonString};`);
    changed = true;
    console.log(`  -> Replaced TRAIN_TYPES`);
  }

  // 2. FORCE STATION COMPATIBILITY
  const allTrainKeys = Object.keys(config.trains);
  const reStationTracks = /(["']?compatibleTrackTypes["']?)\s*:\s*\[([^\]]*)\]/g;
  
  if (reStationTracks.test(newText)) {
    newText = newText.replace(reStationTracks, (match, prefix, content) => {
      let items = [];
      if (content.trim().length > 0) {
        items = content.split(',').map(s => s.trim().replace(/['"]/g, ''));
      }
      const missingKeys = allTrainKeys.filter(k => !items.includes(k));
      if (missingKeys.length === 0) return match; 
      
      const newItemsString = missingKeys.map(k => `"${k}"`).join(",");
      const separator = (content.trim().length > 0) ? "," : "";
      return `${prefix}:[${content}${separator}${newItemsString}]`;
    });
    // Regex runs multiple times, so we assume change if TRAIN_TYPES worked
  }

  // 3. PATCH COST CALCULATIONS
  // Filter out default types to inject only new ones
  const customTrainKeys = allTrainKeys.filter(k => k !== "heavy-metro" && k !== "light-metro");

  if (customTrainKeys.length > 0) {
    // Cost Pattern A (Elevation)
    const reCostObj = /"light-metro"\s*:\s*\{\s*"total"\s*:\s*0,\s*"byElevation"\s*:\s*([a-zA-Z0-9_]+)\(\)\s*\}/g;
    newText = newText.replace(reCostObj, (match, funcName) => {
      const injections = customTrainKeys.map(k => `,"${k}":{"total":0,"byElevation":${funcName}()}`).join("");
      console.log(`  -> Injected Cost Calculation (Elevation)`);
      return match + injections;
    });

    // Cost Pattern B (Count)
    const reCountObj = /"light-metro"\s*:\s*\{\s*"total"\s*:\s*0,\s*"count"\s*:\s*0\s*\}/g;
    newText = newText.replace(reCountObj, (match) => {
      const injections = customTrainKeys.map(k => `,"${k}":{"total":0,"count":0}`).join("");
      console.log(`  -> Injected Cost Calculation (Count)`);
      return match + injections;
    });
  }

  return newText;
}

function patchGameMainContent(text, config) {
  // 4. FIX ROAD COLLISIONS
  // Extract allowed keys from config.trains
  const allowedKeys = [];
  for (const [key, value] of Object.entries(config.trains)) {
    if (value.canCrossRoads === true) allowedKeys.push(key);
  }
  if (allowedKeys.length === 0) return text;

  if (text.includes("Dynamic Road Collision Patch")) return text;

  const conditions = allowedKeys.map(k => `(__t && __t.trackType === '${k}')`).join(" || ");
  const snippet = `
  // Dynamic Road Collision Patch
  if (Array.isArray(arguments[0]) && arguments[0].length > 0) {
    var __t = arguments[0][0];
    if (${conditions}) {
      return { "isValid": !![] };
    }
  }
  `;

  const re = /function validateRoadCollision\([^)]*\)\s*\{/;
  if (!re.test(text)) return text;

  console.log(`  -> Patched Road Collision Logic`);
  return text.replace(re, (match) => match + "\n" + snippet);
}