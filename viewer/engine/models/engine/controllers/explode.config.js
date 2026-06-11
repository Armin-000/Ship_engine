import * as THREE from "three";

/* ======================================================================
   EXPLODE CONFIG
   Manual CAD-style explode mapping for GLB hierarchy
====================================================================== */

const DEG = THREE.MathUtils.degToRad;

export const ROT = {
  NONE: { x: 0, y: 0, z: 0 },

  X_45: { x: DEG(45), y: 0, z: 0 },
  X_90: { x: DEG(90), y: 0, z: 0 },
  X_180: { x: DEG(180), y: 0, z: 0 },

  Y_45: { x: 0, y: DEG(45), z: 0 },
  Y_90: { x: 0, y: DEG(90), z: 0 },
  Y_180: { x: 0, y: DEG(180), z: 0 },

  Z_45: { x: 0, y: 0, z: DEG(45) },
  Z_90: { x: 0, y: 0, z: DEG(90) },
  Z_180: { x: 0, y: 0, z: DEG(180) },

  SPIN_X: { x: Math.PI * 2, y: 0, z: 0 },
  SPIN_Y: { x: 0, y: Math.PI * 2, z: 0 },
  SPIN_Z: { x: 0, y: 0, z: Math.PI * 2 },
};

export const EXPLODE_CONFIG = {
  duration: 2.2,

  scale: {
    globalMove: 1.0,
    globalRotate: 1.0,
  },

    manual: {
    "1. Structure": {
        move: { x: 0, y: 0, z: 0 },
        rotate: { x: 0, y: 0, z: 0 },
    },

    "2. Exhaust system": {
        move: { x: 0, y: 0, z: -0.6 },
    },

    "3. Plate heat exchanger": {
        move: { x: 0, y: 0.0, z: -0.1 },
    },

    "4. Port Generator": {
        move: { x: 0, y: 0.0, z: -0.6 },
    },

    "5. Main engine No.1": {
        move: { x: 0, y: 0.0, z: -0.6 },
    },

    "6 Transmition": {
    move: { x: 0, y: 0, z: -0.6 },
    rotate: { x: 0, y: 0, z: 0 },
    },

    "7. Pipes": {
        move: { x: 0, y: 0, z: -0.6 },
    },

    "8. Valves": {
        move: { x: 0, y: 0, z: -0.6 },
    },

    "9. Propeller": {
        move: { x: 0, y: -0.1, z: 0 },
    },

    "10. Fire System": {
        move: { x: 0, y: 0, z: -1 },
    },

    "11. Lube oil tank": {
        move: { x: 0.0, y: 0, z: -0.6 },
    },

    "12. Service Air Reciever": {
        move: { x: 0, y: 0, z: -0.6 },
    },

    "13. Duplex Oil strainer": {
        move: { x: 0, y: 0, z: -0.6 },
    },
    }
};