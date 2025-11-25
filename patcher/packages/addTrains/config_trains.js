// config_trains.js
// This script defines ALL trains in the game.
// When the script runs it overwrites all the train lists in the game including the standard trains.

export default {
  // =========================================================================
  // STANDARD TRAINS
  // Here is the original trains DON'T DELETE THESE
  // You can update them. Like I made light-metro to be modelled after the driverless Copenhagen Metro here
  // If you still want to use the standard light metro you can remove the /* and */ from the lower one and delete my version
  // =========================================================================
  trains: {
    "heavy-metro": {
      id: "heavy-metro",
      name: "Heavy Metro",
      description: "For higher capacity routes. Modeled after the NYC subway's R211 cars.",
      // canCrossRoads: false (Standard)
      stats: {
        maxAcceleration: 1.1,
        maxDeceleration: 1.3,
        maxSpeed: 24.72,
        maxSpeedLocalStation: 13,
        capacityPerCar: 240,
        carLength: 15,
        minCars: 5,
        maxCars: 10,
        carsPerCarSet: 5,
        carCost: 2500000,
        trainWidth: 3.05,
        minStationLength: 160,
        maxStationLength: 227,
        baseTrackCost: 50000,
        baseStationCost: 75000000,
        trainOperationalCostPerHour: 500,
        carOperationalCostPerHour: 50,
        scissorsCrossoverCost: 15000000
      },
      compatibleTrackTypes: ["heavy-metro"],
      appearance: { color: "#2563eb" }
    },
    "light-metro": {
      id: "light-metro",
      name: "Light Metro",
      description: "Lighter, more flexible transit for moderate capacity routes. Modeled after Copenhagen AnsaldoBreda.",
      // canCrossRoads: false (Standard)
      stats: {
        maxAcceleration: 1.3,
        maxDeceleration: 1.3,
        maxSpeed: 25.0,
        maxSpeedLocalStation: 13.0,
        capacityPerCar: 120,
        carLength: 13,
        minCars: 3,
        maxCars: 6,
        carsPerCarSet: 3,
        carCost: 2500000,
        trainWidth: 2.65,
        minStationLength: 80,
        maxStationLength: 160,
        baseTrackCost: 30000,
        baseStationCost: 50000000,
        trainOperationalCostPerHour: 100,
        carOperationalCostPerHour: 10,
        scissorsCrossoverCost: 12000000
      },
      compatibleTrackTypes: ["light-metro"],
      appearance: { color: "#10b981" }
    },
/*     "light-metro": {
      id: "light-metro",
      name: "Light Metro",
      description: "Lighter, more flexible transit for moderate capacity routes. Modeled after Montreal's Alstom Metropolis Saint-Laurent.",
      // canCrossRoads: false (Standard)
      stats: {
        maxAcceleration: 1.1,
        maxDeceleration: 1.3,
        maxSpeed: 25,
        maxSpeedLocalStation: 13.0,
        capacityPerCar: 200,
        carLength: 19.05,
        minCars: 2,
        maxCars: 4,
        carsPerCarSet: 2,
        carCost: 25e5,
        trainWidth: 2.94,
        minStationLength: 80,
        maxStationLength: 160,
        baseTrackCost: 3e4,
        baseStationCost: 5e7,
        trainOperationalCostPerHour: 400,
        carOperationalCostPerHour: 40,
        scissorsCrossoverCost: 12e6
      },
      compatibleTrackTypes: ["light-metro"],
      appearance: { color: "#10b981" }
    }, */

  // =========================================================================
  // NEW TRAINS
  // Here is the new train types
  // =========================================================================
    
    "s-train": {
      id: "s-train", // make sure this is the same as compatibleTrackTypes
      name: "S-tog", // the name it will show in game
      description: "High-capacity commuter train. Modeled after Copenhagen S-train Litra SE", // the description it will show in game
      canCrossRoads: false, // May not cross roads at street level. But can still cross them +/-5m as usual.
      stats: {
        maxAcceleration: 1.3, // acceleration in m/s^2
        maxDeceleration: 1.2,
        maxSpeed: 33.3, // Speed in m/s
        maxSpeedLocalStation: 13, // speed in m/s through stations
        capacityPerCar: 250, // number of people per car so if 8 cars it's 2000
        carLength: 21, // length in m
        minCars: 4, // minimum number of cars per train
        maxCars: 8, // maximum number of cars per train
        carsPerCarSet: 4, // standard number of cars
        carCost: 3000000, // price per car
        trainWidth: 3.6, // width of train in m
        minStationLength: 100, // make sure this is larger with at least a few meters than your carLength*minCars
        maxStationLength: 200, // make sure this is larger with at least a few meters than your carLength*maxCars
        baseTrackCost: 50000, // track cost at street level
        baseStationCost: 80000000, // station cost at street level
        trainOperationalCostPerHour: 600, // whole train cost to operate
        carOperationalCostPerHour: 60, // car operation cost
        scissorsCrossoverCost: 15000000 // scissors cost
      },
      compatibleTrackTypes: ["s-train"], // make sure this is same as id
      appearance: { color: "#C2122B" } // when you show the track type in game this is what color it will appear with
    },
    "regional": {
      id: "regional",
      name: "Lokaltog",
      description: "Regional diesel/electric unit for local services. Modelled after the LINT 41",
      canCrossRoads: true, // <-- May cross roads at street level
      stats: {
        maxAcceleration: 0.6,
        maxDeceleration: 0.9,
        maxSpeed: 33.3,
        maxSpeedLocalStation: 12,
        capacityPerCar: 100,
        carLength: 20,
        minCars: 2,
        maxCars: 4,
        carsPerCarSet: 2,
        carCost: 2000000,
        trainWidth: 2.75,
        minStationLength: 60,
        maxStationLength: 120,
        baseTrackCost: 40000,
        baseStationCost: 60000000,
        trainOperationalCostPerHour: 300,
        carOperationalCostPerHour: 30,
        scissorsCrossoverCost: 10000000
      },
      compatibleTrackTypes: ["regional"],
      appearance: { color: "#EBD768" }
    },
    "intercity": {
      id: "intercity",
      name: "Fjerntog",
      description: "Fast long-distance train modeled after the Danish IR4.",
      canCrossRoads: false,
      stats: {
        maxAcceleration: 0.8,
        maxDeceleration: 1.0,
        maxSpeed: 50.0,
        maxSpeedLocalStation: 15,
        capacityPerCar: 130,
        carLength: 26,
        minCars: 2,
        maxCars: 8,
        carsPerCarSet: 2,
        carCost: 4000000,
        trainWidth: 3.1,
        minStationLength: 100,
        maxStationLength: 275,
        baseTrackCost: 60000,
        baseStationCost: 90000000,
        trainOperationalCostPerHour: 700,
        carOperationalCostPerHour: 70,
        scissorsCrossoverCost: 20000000
      },
      compatibleTrackTypes: ["intercity"],
      appearance: { color: "#222222" }
    },
    "tram": {
      id: "tram",
      name: "Letbane",
      description: "City tram service modeled after Siemens Avenio.",
      canCrossRoads: true,
      stats: {
        maxAcceleration: 1.2,
        maxDeceleration: 1.2,
        maxSpeed: 22.22,
        maxSpeedLocalStation: 8.0,
        capacityPerCar: 200,
        carLength: 30,
        minCars: 1,
        maxCars: 2,
        carsPerCarSet: 1,
        carCost: 1500000,
        trainWidth: 2.65,
        minStationLength: 40,
        maxStationLength: 80,
        baseTrackCost: 25000,
        baseStationCost: 20000000,
        trainOperationalCostPerHour: 200,
        carOperationalCostPerHour: 20,
        scissorsCrossoverCost: 5000000
      },
      compatibleTrackTypes: ["tram"],
      appearance: { color: "#62B54E" }
    }
  }
};