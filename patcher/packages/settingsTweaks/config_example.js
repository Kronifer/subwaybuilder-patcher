const config = {
    "changeGameSpeeds" : false, // true or false. Determines whether to change the simulation speeds
    "gameSpeeds" : [1, 25, 250, 500], // Simulation speed factor for each game speed - game default is [1, 25, 250, 500] - I recommend [1, 100, 1000, 4000]
    
    "changeMinTurnRadius" : false, // true or false. Determines whether to change the minimum allowed turn radius when building tracks
    "minTurnRadius" : 29, // Minimum allowed turn radius in meters - game default is 29
    
    "changeMaxSlope" : false, // true or false. Determines whether to change the maximum allowed slope percentage when building tracks
    "maxSlope" : 4, // Maximum allowed slope percentage - game default is 4
    
    "changeStartingMoney" : false, // true or false. Determines whether to change the starting money for new games
    "startingMoney" : 3, // Starting money in billions - game default is 3 billion
  };
  
  export default config;
