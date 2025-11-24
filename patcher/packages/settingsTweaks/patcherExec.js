import fs from 'fs';
import config from './config.js';
import { execSync } from 'child_process';

const stringReplaceAt = (string, startIndex, endIndex, replacement) => {
    return string.substring(0, startIndex) + replacement + string.substring(endIndex + 1);
};

export function patcherExec(fileContents) {
    console.log("Running settingsTweaks - contributed by slurry");
    if (config.changeGameSpeeds) {
        console.log("Changing game simulation speeds");
        
        ["INDEX", "INTERLINEDROUTES", "POPCOMMUTEWORKER"].forEach(key => {
          fileContents[key] = fileContents[key]
            .replace(/"slow":[\s]*[0-9]+/, `"slow": ${config.gameSpeeds[0]}`)
            .replace(/"normal":[\s]*[0-9]+/, `"normal": ${config.gameSpeeds[1]}`)
            .replace(/"fast":[\s]*[0-9]+/, `"fast": ${config.gameSpeeds[2]}`)
            .replace(/"ultrafast":[\s]*[0-9]+/, `"ultrafast": ${config.gameSpeeds[3]}`);
        });
    }
    
    if (config.changeMinTurnRadius) {
        console.log("Changing minimum allowed turn radius");
        
        ["INDEX", "INTERLINEDROUTES", "POPCOMMUTEWORKER"].forEach(key => {
          fileContents[key] = fileContents[key].replace(
            /("MIN_TURN_RADIUS":)[\s]*[^,]*/,
            `$1 ${config.minTurnRadius}`
          );
        });
    }

    
    if (config.changeMaxSlope) {
        console.log("Changing maximum slope percentage");
        
        ["INDEX", "INTERLINEDROUTES", "POPCOMMUTEWORKER"].forEach(key => {
          fileContents[key] = fileContents[key].replace(
            /("MAX_SLOPE_PERCENTAGE":)[\s]*[^,]*/,
            `$1 ${config.maxSlope}`
          );
        });
        
        ["INDEX", "INTERLINEDROUTES", "POPCOMMUTEWORKER"].forEach(key => {
          let occurrence = 0;
          fileContents[key] = fileContents[key].replace(/("maxSlopePercentage":)[\s]*[^,]*/g, (match, group1) => {
            occurrence++;
            if (occurrence === 2) {
              return `${group1} ${config.maxSlope}`; // replace only the 2nd occurrence
            }
            return match; // leave others unchanged
          });
        });
    }
    
    if (config.changeStartingMoney) {
        console.log("Changing starting money amount");
        
        ["INDEX", "INTERLINEDROUTES"].forEach(key => {
          fileContents[key] = fileContents[key].replace(
            /("STARTING_MONEY":)[\s]*[^,]*/,
            `$1 ${config.startingMoney}e9`
          );
        });
    }

    return fileContents;
}
