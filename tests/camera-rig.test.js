import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { CameraRig } from '../camera-rig.js';
import { CABIN, CAR } from '../vehicle-spec.js';
import { createScenario } from '../courses.js';

const state = {
  w: 1440,
  h: 960,
  view: 'driver',
  lookYaw: 0,
  lookPitch: 0,
  fov: 80,
  mirrorTilt: -12,
};
test('camera extraction preserves driver eye and horizontal FOV without DOM access', () => {
  const rig = new CameraRig(),
    scene = createScenario(),
    car = { ...scene.start, angle: 0 };
  const camera = rig.pointCamera(car, state, scene, null);
  assert.ok(
    camera.position.distanceTo(
      new THREE.Vector3(
        car.x + CABIN.eyeX,
        CABIN.eyeHeight,
        -car.z - CABIN.eyeForward,
      ),
    ) < 1e-9,
  );
  const horizontal =
    (2 *
      Math.atan((Math.tan((camera.fov * Math.PI) / 360) * state.w) / state.h) *
      180) /
    Math.PI;
  assert.ok(Math.abs(horizontal - 80) < 1e-9);
});
test('mirrors use the shared vehicle dimensions and top camera consumes supplied layout', () => {
  const rig = new CameraRig(),
    scene = createScenario(),
    car = { ...scene.start, angle: 0 };
  const left = rig
    .pointCamera(car, { ...state, view: 'mirror-left' }, scene, null)
    .position.clone();
  const right = rig
    .pointCamera(car, { ...state, view: 'mirror-right' }, scene, null)
    .position.clone();
  assert.ok(Math.abs(right.x - left.x - (CAR.width + 0.26)) < 1e-9);
  const top = rig.pointCamera(car, { ...state, view: 'top' }, scene, {
    upper: 150,
    lower: 850,
  });
  assert.ok(top.isOrthographicCamera);
  assert.ok(Number.isFinite(top.top));
});
