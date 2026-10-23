// One source of truth. Simulation uses +Z forward; the Three.js model faces -Z.
// All distances are metres and all angles are radians unless named otherwise.
export const CAR = Object.freeze({
  length: 4.4,
  width: 1.78,
  height: 1.435,
  wheelbase: 2.64,
  front: 0.84,
  rear: 0.92,
  track: 1.53,
  maxSteer: (35 * Math.PI) / 180,
});

export const CABIN = Object.freeze({
  eyeX: -0.4,
  eyeHeight: 1.16,
  eyeForward: -0.16,
  pitch: (-10 * Math.PI) / 180,
  wheelX: -0.4,
  wheelY: 0.89,
  wheelZ: -0.3,
  wheelRadius: 0.188,
  mirrorHeight: 0.98,
  mirrorForward: 0.47,
});

export const CABIN_BOUNDS = Object.freeze({
  halfWidth: CAR.width / 2 - 0.115,
  floor: 0.3,
  sill: 0.88,
  front: -1.04,
  rear: 1.18,
  roof: CAR.height - 0.08,
  roofHalfWidth: 0.625,
  roofFront: -0.4,
  roofRear: 0.66,
});

export const MODEL_ANCHORS = Object.freeze({
  steering: 'steering-wheel',
  instruments: 'instrument-display',
  mirrorLeft: 'mirror-left',
  mirrorRight: 'mirror-right',
});
