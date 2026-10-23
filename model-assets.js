import { GLTFLoader } from './vendor/GLTFLoader.js';
import { CAR, MODEL_ANCHORS } from './vehicle-spec.js';

export function validateCabinModel(model) {
  for (const name of Object.values(MODEL_ANCHORS)) {
    if (!model.getObjectByName(name))
      throw new Error(`Car model is missing anchor: ${name}`);
  }
  const metadata = model.getObjectByName('sedan-cabin')?.userData;
  if (metadata?.units !== 'metres' || metadata?.forward !== '-Z')
    throw new Error('Car model must use metres and face -Z');
  for (const key of ['length', 'width', 'height', 'wheelbase']) {
    if (
      Math.abs((metadata.car?.[key] ?? NaN) - CAR[key]) > 0.001 ||
      !Number.isFinite(metadata.car?.[key])
    ) {
      throw new Error(`Car model does not match simulation: ${key}`);
    }
  }
  return model;
}

async function loadModel(name) {
  const embedded = globalThis.parkingAssets?.[name];
  let data;
  if (embedded) {
    data = Uint8Array.from(atob(embedded), (char) => char.charCodeAt(0)).buffer;
  } else {
    const response = await fetch(new URL('./assets/' + name, import.meta.url));
    if (!response.ok)
      throw new Error(`Cannot load car model: ${response.status}`);
    data = await response.arrayBuffer();
  }
  const gltf = await new GLTFLoader().parseAsync(data, '');
  return gltf.scene;
}

export async function loadVehicleAssets() {
  const [cabin, exterior] = await Promise.all([
    loadModel('sedan-cabin.glb'),
    loadModel('sedan-exterior.glb'),
  ]);
  validateCabinModel(cabin);
  for (const name of [
    'front-wheel-left',
    'front-wheel-right',
    'rear-wheel-left',
    'rear-wheel-right',
  ])
    if (!exterior.getObjectByName(name))
      throw new Error('Exterior model is missing ' + name);
  return { cabin, exterior };
}
