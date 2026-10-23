import * as THREE from './vendor/three.module.min.js';
import { frontWheelAngles } from './physics.js';

export function createExterior(model, color) {
  const group = model.clone(true);
  const lights = [],
    reverseLights = [],
    indicators = [],
    frontWheels = [];
  const paint = new Map();
  group.traverse((item) => {
    if (item.name.startsWith('front-wheel-')) frontWheels.push(item);
    if (!item.isMesh) return;
    item.castShadow = true;
    item.receiveShadow = true;
    item.userData.assetGeometry = true;
    if (item.material.name === 'body-paint') {
      if (!paint.has(item.material)) {
        const material = item.material.clone();
        material.color.set(color);
        paint.set(item.material, material);
      }
      item.material = paint.get(item.material);
      item.userData.privateMaterial = true;
    }
    const lamps = item.name.startsWith('brake-')
      ? lights
      : item.name.startsWith('reverse-')
        ? reverseLights
        : item.name.startsWith('indicator-')
          ? indicators
          : null;
    if (lamps) {
      item.material = item.material.clone();
      item.userData.privateMaterial = true;
      lamps.push(item);
    }
  });
  group.userData = { frontWheels, lights, reverseLights, indicators };
  return group;
}

export function updateExterior(
  player,
  car,
  { braking = false, hazards = false } = {},
) {
  player.position.set(car.x, 0, -car.z);
  player.rotation.y = -car.angle;
  const angles = frontWheelAngles(car.steer);
  for (const wheel of player.userData.frontWheels)
    wheel.rotation.y = -(wheel.position.x < 0 ? angles.left : angles.right);
  for (const lamp of player.userData.lights)
    lamp.material.emissiveIntensity = braking ? 2.3 : 0.35;
  for (const lamp of player.userData.reverseLights)
    lamp.material.emissiveIntensity = car.gear === 'R' ? 2.1 : 0;
  for (const lamp of player.userData.indicators)
    lamp.material.emissiveIntensity = hazards ? 3 : 0;
}
