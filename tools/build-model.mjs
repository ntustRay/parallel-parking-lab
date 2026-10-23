import fs from 'node:fs/promises';
import * as THREE from '../vendor/three.module.min.js';
import {
  mergeGeometries,
  mergeVertices,
} from '../vendor/BufferGeometryUtils.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';
import { createCabinModel } from '../models/cabin-model.js';
import { createExteriorModel } from '../models/exterior-model.js';

// The official browser exporter uses FileReader for its binary buffer.
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((result) => {
      this.result = result;
      this.onloadend?.();
    });
  }
};

async function bake(source, filename, preserve) {
  const output = new THREE.Group();
  output.name = source.name;
  output.userData = source.userData;
  source.updateMatrixWorld(true);
  const preserved = [];
  source.traverse((item) => {
    if (preserve(item)) preserved.push(item);
  });
  const batches = new Map();
  source.traverse((item) => {
    if (!item.isMesh) return;
    for (let parent = item; parent; parent = parent.parent)
      if (preserved.includes(parent)) return;
    const material = item.material;
    const key = [
      material.name,
      material.color.getHex(),
      material.roughness,
      material.metalness,
      material.side,
    ].join(':');
    if (!batches.has(key)) batches.set(key, { material, geometries: [] });
    let geometry = item.geometry.clone().applyMatrix4(item.matrixWorld);
    if (geometry.index) geometry = geometry.toNonIndexed();
    for (const name of Object.keys(geometry.attributes))
      if (!['position', 'normal', 'uv'].includes(name))
        geometry.deleteAttribute(name);
    if (!geometry.attributes.uv)
      geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(
          new Float32Array(geometry.attributes.position.count * 2),
          2,
        ),
      );
    batches.get(key).geometries.push(geometry);
  });
  for (const [key, { material, geometries }] of batches) {
    const geometry = mergeVertices(mergeGeometries(geometries), 0.00001);
    geometry.normalizeNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'finish-' + key;
    output.add(mesh);
  }
  for (const original of preserved) {
    const node = original.clone(true);
    original.matrixWorld.decompose(node.position, node.quaternion, node.scale);
    output.add(node);
  }
  const binary = await new GLTFExporter().parseAsync(output, {
    binary: true,
    onlyVisible: true,
  });
  await fs.writeFile('assets/' + filename + '.glb', Buffer.from(binary));
  const meshes = [];
  output.traverse((item) => {
    if (item.isMesh) meshes.push(item);
  });
  return {
    bytes: binary.byteLength,
    meshes: meshes.length,
    staticMaterials: batches.size,
    triangles: meshes.reduce(
      (sum, item) =>
        sum +
        (item.geometry.index?.count ??
          item.geometry.attributes.position.count) /
          3,
      0,
    ),
  };
}

await fs.mkdir('assets', { recursive: true });
const anchors = [
  'steering-wheel',
  'instrument-display',
  'mirror-left',
  'mirror-right',
];
const cabin = await bake(createCabinModel(), 'sedan-cabin', (item) =>
  anchors.includes(item.name),
);
const exterior = await bake(createExteriorModel(), 'sedan-exterior', (item) =>
  /^(front-wheel-|rear-wheel-|brake-|reverse-|indicator-)/.test(item.name),
);
await fs.writeFile(
  'assets/model-budget.json',
  JSON.stringify({ cabin, exterior }, null, 2) + '\n',
);
console.log('Vehicle GLBs:', { cabin, exterior });
