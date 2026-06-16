import * as THREE from "three";

const DEG = THREE.MathUtils.degToRad;

export const SYSTEM_EXPLODE_CONFIG = {

  /* =========================================================
     1. STRUCTURE
  ========================================================= */

  "1. Structure": {
    "1.1. Floor": {
      dir: "top",
      distance: 0.0,
    },

    "1.1.1. Main Deck": {
      dir: "top",
      distance: 0.3,
    },

    "1.1.2. Ship's Hull": {
      dir: "front",
      distance: 0.3,
    },

    "1.1.3. Engine Room Base": {
      dir: "right",
      distance: 0.7,
    },

    "1.1.4. Base Supports": {
      dir: "back",
      distance: 0.5,
    },

    "1.2. Underwater Part of the Ship's Hull": {
      dir: "front",
      distance: 0.0,
    },

    "1.2.1. Ship's Ribs": {
      dir: "front",
      distance: 0.0,
    },

    "1.2.2. Manholes": {
      dir: "back",
      distance: 0.0,
    },

    "1.2.2.1. Manhole": {
      dir: "back",
      distance: 0.1,
    },

    "1.2.3.2. Manhole": {
      dir: "back",
      distance: 0.1,
    },
  },

  /* =========================================================
    2. EXHAUST SYSTEM
  ========================================================= */

  "2. Exhaust system": {
    "2.1. Ventilation system": {
      dir: "left",
      distance: 0.0,
    },

    "Object 37001 1": {
      dir: "left",
      distance: 0.0,
    },

    "Object 37 1": {
      dir: "front",
      distance: 0.05,
    },

    "Object 37 2": {
      dir: "back",
      distance: 0.0,
    },

    "Object 37 3": {
      dir: "front",
      distance: 0.05,
    },
  },

  /* =========================================================
    3. PLATE HEAT EXCHANGER
  ========================================================= */

  "3. Plate heat exchanger": {
    "3.1. Centar": {
      dir: "top",
      distance: 0.0,
    },

    "Object_20.003": {
      dir: "top",
      distance: 0.05,
    },

    "3.2. Nails": {
      dir: "left",
      distance: 0.09,
    },

    "Object_20.001": {
      dir: "left",
      distance: 0.0,
    },

    "3.3. Nuts": {
      dir: "right",
      distance: 0.05,
    },

    "Object_20.002": {
      dir: "right",
      distance: 0.6,
    },

    "3.4. Site 1": {
      dir: "right",
      distance: 0.02,
    },

    "Object_20": {
      dir: "right",
      distance: 0.02,
    },

    "3.5. Site 2": {
      dir: "left",
      distance: 0.02,
    },

    "Object_20.004": {
      dir: "left",
      distance: 0.02,
    },

    "Supporter": {
      dir: "bottom",
      distance: 0.05,
    },

    "Object_20.005": {
      dir: "bottom",
      distance: 0.05,
    },
  },

  /* =========================================================
    4. PORT GENERATOR
  ========================================================= */

  "4 Port Generator": {
    "41 Port Generator base": {
      dir: "bottom",
      distance: 0.0,
    },

    "42 Exhaust insulation": {
      dir: "top",
      distance: 0.06,
    },

    "43 Port Generator Main": {
      dir: "right",
      distance: 0.0,
    },

    "665001001 Engine 3": {
      dir: "right",
      distance: 0.20,
    },

    "665001001 Engine 3 1": {
      dir: "top",
      distance: 0.20,
    },

    "665001001 Engine 3 2": {
      dir: "right",
      distance: 0.20,
    },

    "665001001 Engine 3 3": {
      dir: "front",
      distance: 0.10,
    },

    "665001001 Engine 3 4": {
      dir: "top",
      distance: 0.05,
    },

    "665001001 Engine 3 5": {
      dir: "top",
      distance: 0.15,
    },

    "665001001 Engine 3 6": {
      dir: "bottom",
      distance: 0.01,
    },

    "665001001 Engine 3 7": {
      dir: "left",
      distance: 0.10,
    },

    "665001001 Engine 3 8": {
      dir: "left",
      distance: 0.05,
    },

    "665001001 Engine 3 9": {
      dir: "right",
      distance: 0.20,
    },
  },

  /* =========================================================
    5. MAIN ENGINE NO1
  ========================================================= */

  "5 Main engine No1": {
    "54 Fuel oil filter No1": {
      dir: "front",
      distance: 0.15,
    },

    "51 Main Engine No1": {
      dir: "top",
      distance: 0.0,
    },

    "601110 Engine 662": {
      dir: "right",
      distance: 0.0,
    },

    "601110 Engine 662 1": {
      dir: "left",
      distance: 0.35,
    },

    "601110 Engine 662 2": {
      dir: "right",
      distance: 0.05,
    },

    "601110 Engine 662 3": {
      dir: "front",
      distance: 0.10,
    },

    "601110 Engine 662 4": {
      dir: "right",
      distance: 0.15,
    },

    "601110 Engine 662 5": {
      dir: "top",
      distance: 0.15,
    },

    "601110 Engine 662 6": {
      dir: "bottom",
      distance: 0.25,
    },

    "601110 Engine 662 7": {
      dir: "front",
      distance: 0.15,
    },

    "601110 Engine 662 8": {
      dir: "right",
      distance: 0.15,
    },

    "601110 Engine 662 9": {
      dir: "right",
      distance: 0.15,
    },

    "601110 Engine 662 10": {
      dir: "left",
      distance: 0.35,
    },

    "601110 Engine 662 11": {
      dir: "top",
      distance: 0.15,
    },

    "52 Gearbox": {
      dir: "left",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907": {
      dir: "left",
      distance: 0.05,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 1": {
      dir: "left",
      distance: 0.35,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 2": {
      dir: "left",
      distance: 0.35,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 3": {
      dir: "front",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 4": {
      dir: "back",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 5": {
      dir: "top",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 6": {
      dir: "left",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 7": {
      dir: "front",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 8": {
      dir: "back",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 9": {
      dir: "right",
      distance: 0.25,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 10": {
      dir: "left",
      distance: 0.35,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 11": {
      dir: "top",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 12": {
      dir: "front",
      distance: 0.15,
    },

    "601100 PROPULSION ENGINE – STERN Port side 907 13": {
      dir: "left",
      distance: 0.35,
    },

    "55 Main engine No1 base": {
      dir: "bottom",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 1015": {
      dir: "bottom",
      distance: 0.05,
    },

    "601100 PROPULSION ENGINE – STERN Port side 1015 1": {
      dir: "bottom",
      distance: 0.05,
    },

    "53 Filters": {
      dir: "right",
      distance: 0.0,
    },

    "531 Filter 1": {
      dir: "right",
      distance: 0.15,
    },

    "532 Filter 2": {
      dir: "right",
      distance: 0.15,
    },
  },

  /* =========================================================
    6. TRANSMITION
  ========================================================= */

  "6 Transmition": {
    "63 Azipod foundation": {
      dir: "bottom",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 102": {
      dir: "bottom",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 102 1": {
      dir: "top",
      distance: 0.02,
    },

    "62 Transmition Plate": {
      dir: "top",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823": {
      dir: "top",
      distance: 0.08,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 1": {
      dir: "top",
      distance: 0.08,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 2": {
      dir: "top",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 3": {
      dir: "back",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 4": {
      dir: "left",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 5": {
      dir: "top",
      distance: 0.18,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 6": {
      dir: "bottom",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 7": {
      dir: "top",
      distance: 0.09,
    },

    "601100 PROPULSION ENGINE – STERN Port side 823 8": {
      dir: "top",
      distance: 0.01,
    },

    "61 Full Shaft": {
      dir: "front",
      distance: 0.0,
    },

    "612 Shaft": {
      dir: "right",
      distance: 0.03,
    },

    "611 Shaft Covers": {
      dir: "back",
      distance: 0.0,
    },

    "601100 PROPULSION ENGINE – STERN Port side 282": {
      dir: "right",
      distance: 0.03,
    },

    "601100 PROPULSION ENGINE – STERN Port side 282 1": {
      dir: "right",
      distance: 0.1,
    },

    "601100 PROPULSION ENGINE – STERN Port side 282 2": {
      dir: "right",
      distance: 0.06,
    },

    "601100 PROPULSION ENGINE – STERN Port side 282 3": {
      dir: "top",
      distance: 0.03,
    },

    "601100 PROPULSION ENGINE – STERN Port side 282 4": {
      dir: "bottom",
      distance: 0.25,
    },
  },

  /* =========================================================
    7. PIPES
  ========================================================= */

"7 Pipes": {
  "73 Fuel oil system": {
    dir: "front",
    distance: 0.0,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS": {
    dir: "back",
    distance: 0.0,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 1": {
    dir: "front",
    distance: 0.01,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 2": {
    dir: "back",
    distance: 0.0,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 3": {
    dir: "front",
    distance: 0.01,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 4": {
    dir: "front",
    distance: 0.01,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 5": {
    dir: "back",
    distance: 0.01,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 6": {
    dir: "back",
    distance: 0.01,
  },

  "07 SYSTEMS FOR MACHINERY MAIN COMPONENTS 7": {
    dir: "front",
    distance: 0.0,
  },

  "71 Fresh Water System Pipes": {
    dir: "left",
    distance: 0.0,
  },

  "Solid1 2075": {
    dir: "back",
    distance: 0.02,
  },

  "Solid1 2075 1": {
    dir: "left",
    distance: 0.0,
  },

  "Solid1 2075 2": {
    dir: "right",
    distance: 0.0,
  },

  "Solid1 2075 3": {
    dir: "front",
    distance: 0.0,
  },

  "Solid1 2075 4": {
    dir: "top",
    distance: 0.02,
  },

  "Solid1 2075 5": {
    dir: "back",
    distance: 0.02,
  },

  "Solid1 2075 6": {
    dir: "back",
    distance: 0.02,
  },

  "Solid1 2075 7": {
    dir: "top",
    distance: 0.02,
  },

  "721 Auxiliary piping system 1": {
    dir: "top",
    distance: 0.0,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621": {
    dir: "top",
    distance: 0.0,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 1": {
    dir: "back",
    distance: 0.07,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 2": {
    dir: "back",
    distance: 0.07,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 3": {
    dir: "back",
    distance: 0.05,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 4": {
    dir: "right",
    distance: 0.0,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 5": {
    dir: "front",
    distance: 0.04,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 6": {
    dir: "back",
    distance: 0.10,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 7": {
    dir: "front",
    distance: 0.05,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 8": {
    dir: "right",
    distance: 0.04,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 9": {
    dir: "right",
    distance: 0.06,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 10": {
    dir: "right",
    distance: 0.07,
  },

  "723010 FW, EVAPORATOR, FW NO 1 (SW COOL) 621 11": {
    dir: "front",
    distance: 0.02,
  },

  "722 Auxiliary piping system 2": {
    dir: "bottom",
    distance: 0.0,
  },

  "701020 DO transfer systems": {
    dir: "bottom",
    distance: 0.0,
  },

  "701020 DO transfer systems 1": {
    dir: "right",
    distance: 0.12,
  },

  "701020 DO transfer systems 2": {
    dir: "right",
    distance: 0.15,
  },

  "701020 DO transfer systems 3": {
    dir: "right",
    distance: 0.16,
  },
},


/* =========================================================
   8. VALVES
========================================================= */

"8 Valves": {
  "82 Valve 2": { dir: "left", distance: 0.0 },
  "Object 8 1": { dir: "back", distance: 0.3 },
  "Object 8 2": { dir: "top", distance: 0.3 },

  "81 Full Valve": { dir: "top", distance: 0.0 },
  "813 Head": { dir: "top", distance: 0.2 },
  "812 Body": { dir: "bottom", distance: 0.0 },
  "815 Steering wheel": { dir: "top", distance: 0.5 },
  "814 Steering rod": { dir: "top", distance: 0.4 },
  "Object 212047 1": { dir: "top", distance: 0.2 },

  "811 Screws": { dir: "right", distance: 0.0 },

  "8111 Screws Horizontal 1": { dir: "left", distance: 0.0 },
  "81113 Screw 1": { dir: "right", distance: 0.0 },
  "81112 Nut 1": { dir: "left", distance: 0.03 },
  "81111 Holder 1": { dir: "left", distance: 0.02 },

  "8112 Screws Horizontal 2": { dir: "right", distance: 0.0 },
  "81123 Screw 2": { dir: "right", distance: 0.0 },
  "81122 Nut 2": { dir: "left", distance: 0.03 },
  "81121 Holder 2": { dir: "left", distance: 0.02 },

  "8113 Screws Horizontal 3": { dir: "front", distance: 0.0 },
  "81133 Screw 3": { dir: "front", distance: 0.0 },
  "81132 Nut 3": { dir: "left", distance: 0.03 },
  "81131 Holder 3": { dir: "left", distance: 0.02 },

  "8114 Screws Horizontal 4": { dir: "back", distance: 0.0 },
  "81143 Screw 4": { dir: "back", distance: 0.0 },
  "81142 Nut 4": { dir: "left", distance: 0.03 },
  "81141 Holder 4": { dir: "left", distance: 0.02 },

  "8115 Screws Horizontal 5": { dir: "left", distance: 0.0 },
  "81153 Screw 5": { dir: "left", distance: 0.0 },
  "81152 Nut 5": { dir: "left", distance: 0.03 },
  "81151 Holder 5": { dir: "left", distance: 0.02 },

  "8116 Screws Horizontal 6": { dir: "right", distance: 0.0 },
  "81163 Screw 6": { dir: "right", distance: 0.0 },
  "81162 Nut 6": { dir: "left", distance: 0.03 },
  "81161 Holder 6": { dir: "left", distance: 0.02 },

  "8117 Screws Vertical 1": { dir: "top", distance: 0.0 },
  "81173 Screw 1": { dir: "", distance: 0.0 },
  "81171 Holder 1": { dir: "bottom", distance: 0.03 },
  "81172 Nut 1": { dir: "bottom", distance: 0.04 },

  "8118 Screws Vertical 2": { dir: "top", distance: 0.0 },
  "81183 Screw 2": { dir: "", distance: 0.0 },
  "81181 Holder 2": { dir: "bottom", distance: 0.03 },
  "81182 Nut 2": { dir: "bottom", distance: 0.04 },

  "8119 Screws Vertical 3": { dir: "top", distance: 0.0 },
  "81193 Screw 3": { dir: "", distance: 0.0 },
  "81191 Holder 3": { dir: "bottom", distance: 0.03 },
  "81192 Nut 3": { dir: "bottom", distance: 0.04 },

  "81110 Screws Vertical 4": { dir: "top", distance: 0.0 },
  "811103 Screw 4": { dir: "", distance: 0.0 },
  "811101 Holder 4": { dir: "bottom", distance: 0.03 },
  "811102 Nut 4": { dir: "bottom", distance: 0.04 },

  "81111 Screws Vertical 5": { dir: "top", distance: 0.0 },
  "811113 Screw 5": { dir: "", distance: 0.0 },
  "811111 Holder 5": { dir: "bottom", distance: 0.03 },
  "811112 Nut 5": { dir: "bottom", distance: 0.04 },

  "81112 Screws Vertical 6": { dir: "top", distance: 0.0 },
  "811163 Screw 6": { dir: "top", distance: 0.0 },
  "811121 Holder 6": { dir: "bottom", distance: 0.03 },
  "811122 Nut 6": { dir: "bottom", distance: 0.04 },

  "81113 Upper Screws Vertical 1": { dir: "top", distance: 0.12 },
  "811133 Screw 1": { dir: "top", distance: 0.20 },
  "811132 Nut 1": { dir: "top", distance: 0.12 },
  "811131 Holder 1": { dir: "top", distance: 0.10 },

  "81114 Upper Screws Vertical 2": { dir: "top", distance: 0.12 },
  "811143 Screw 2": { dir: "top", distance: 0.20 },
  "811142 Nut 2": { dir: "top", distance: 0.12 },
  "811141 Holder 2": { dir: "top", distance: 0.10 },

  "81115 Upper Screws Vertical 3": { dir: "top", distance: 0.12 },
  "811153 Screw 3": { dir: "top", distance: 0.20 },
  "811152 Nut 3": { dir: "top", distance: 0.12 },
  "811151 Holder 3": { dir: "top", distance: 0.10 },

  "81116 Upper Screws Vertical 4": { dir: "top", distance: 0.12 },
  "811163 Screw 4": { dir: "top", distance: 0.20 },
  "811162 Nut 4": { dir: "top", distance: 0.12 },
  "811161 Holder 4": { dir: "top", distance: 0.10 },

  "81117 Body Nut": { dir: "top", distance: 0.0 },
  "811171 Main Nut 1": { dir: "top", distance: 0.24 },
  "811172 Main Nut 2": { dir: "top", distance: 0.24 },
},


  /* =========================================================
    9. PROPELLER
  ========================================================= */

  "9 Propeller": {
    "93 Propeller": {
      dir: "left",
      distance: 0.03,
    },

    "92 Motor Head": {
      dir: "top",
      distance: 0.0,
    },

    "91 Motor connector": {
      dir: "top",
      distance: 0.03,
    },
  },

  /* =========================================================
    11. LUBE OIL TANK
  ========================================================= */

  "11 Lube oil tank": {
    "11 Lube oil tank": {
      dir: "bottom",
      distance: 0.0,
    },

    "Object 1 1": {
      dir: "left",
      distance: 0.08,
    },

    "Object 1 2": {
      dir: "left",
      distance: 0.09,
    },
  },

  /* =========================================================
    12. SERVICE AIR RECIEVER
  ========================================================= */

  "12 Service Air Reciever": {
    "12 Service Air Reciever": {
      dir: "bottom",
      distance: 0.0,
    },

    "Object 104 1": {
      dir: "top",
      distance: 0.08,
    },

    "Object 104 2": {
      dir: "right",
      distance: 0.03,
    },
  },
};