import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import { loadModel } from './load-model.mjs';
import { validateCabinModel } from '../model-assets.js';
import { createExterior, updateExterior } from '../vehicle-view.js';
import { CABIN, CAR } from '../vehicle-spec.js';

test('the shipped GLB retains its unit scale and animation/display anchors', async () => {
  const cabin = validateCabinModel(await loadModel('sedan-cabin.glb'));
  cabin.updateMatrixWorld(true);
  const position = new THREE.Vector3();
  cabin.getObjectByName('steering-wheel').getWorldPosition(position);
  assert.ok(
    position.distanceTo(
      new THREE.Vector3(CABIN.wheelX, CABIN.wheelY, CABIN.wheelZ),
    ) < 0.0001,
  );
  let triangles = 0,
    meshes = 0;
  cabin.traverse((item) => {
    if (item.isMesh) {
      meshes++;
      triangles +=
        (item.geometry.index?.count ??
          item.geometry.attributes.position.count) / 3;
    }
  });
  assert.ok(triangles < 35000, 'cabin triangle budget');
  assert.ok(meshes < 75, 'cabin draw-call budget');
  cabin.getObjectByName('steering-wheel').name = 'missing';
  assert.throws(() => validateCabinModel(cabin), /missing anchor/);
});

test('each vehicle owns paint and lights while sharing immutable mesh geometry', async () => {
  const model = await loadModel('sedan-exterior.glb');
  const a = createExterior(model, '#326576'),
    b = createExterior(model, '#9b7d61');
  assert.equal(a.userData.frontWheels.length, 2);
  assert.equal(a.userData.lights.length, 2);
  assert.equal(a.userData.reverseLights.length, 2);
  assert.equal(a.userData.indicators.length, 4);
  const wheel = a.userData.frontWheels[0];
  assert.ok(Math.abs(Math.abs(wheel.position.x) - CAR.track / 2) < 0.0001);
  assert.equal(
    wheel.children[0].geometry,
    b.userData.frontWheels[0].children[0].geometry,
  );
  assert.notEqual(a.userData.lights[0].material, b.userData.lights[0].material);
  updateExterior(
    a,
    { x: 1, z: 2, angle: 0.5, steer: 0.8, gear: 'R' },
    { braking: true, hazards: true },
  );
  assert.equal(a.userData.lights[0].material.emissiveIntensity, 2.3);
  assert.equal(a.userData.reverseLights[0].material.emissiveIntensity, 2.1);
  assert.equal(a.userData.indicators[0].material.emissiveIntensity, 3);
  assert.equal(b.userData.reverseLights[0].material.emissiveIntensity, 0);
  assert.notEqual(
    a.userData.frontWheels[0].rotation.y,
    a.userData.frontWheels[1].rotation.y,
  );
});
