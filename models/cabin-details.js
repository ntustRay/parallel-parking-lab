import * as THREE from '../vendor/three.module.min.js';
import { CABIN_BOUNDS } from '../vehicle-spec.js';

// Quiet, game-scale details. Nothing extends into a window or the driver's eye.
const finishes = {
  fabric: new THREE.MeshStandardMaterial({ color: '#485258', roughness: 0.98 }),
  dark: new THREE.MeshStandardMaterial({ color: '#171f24', roughness: 0.9 }),
  stitch: new THREE.MeshStandardMaterial({ color: '#899494', roughness: 1 }),
  alloy: new THREE.MeshStandardMaterial({
    color: '#9bacae',
    metalness: 0.65,
    roughness: 0.38,
  }),
};

function block(parent, name, material, position, size) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  parent.add(mesh);
  return mesh;
}

function seam(
  parent,
  name,
  points,
  radius = 0.0014,
  material = finishes.stitch,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
  );
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, radius, 4, false),
    material,
  );
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

export function addCabinDetails(group) {
  const h = CABIN_BOUNDS.halfWidth;
  // Horizontal shoulder lines unite the dashboard and door cards.
  seam(group, 'dash-stitched-brow', [
    [-0.71, 0.913, -0.81],
    [-0.4, 0.93, -0.75],
    [0, 0.917, -0.7],
    [0.4, 0.905, -0.7],
    [0.7, 0.909, -0.8],
  ]);
  for (const side of [-1, 1]) {
    const x = side * (h - 0.072);
    seam(group, 'door-shoulder-' + side, [
      [x, 0.792, -0.91],
      [x, 0.78, -0.55],
      [x, 0.773, -0.1],
      [x, 0.77, 0.27],
    ]);
    seam(group, 'door-armrest-' + side, [
      [side * (h - 0.148), 0.677, -0.65],
      [side * (h - 0.148), 0.682, -0.35],
      [side * (h - 0.148), 0.677, -0.02],
    ]);
    // A curved fabric insert follows the shoulder and armrest rather than a box.
    const outline = new THREE.Shape();
    outline.moveTo(-0.22, 0.72);
    outline.lineTo(0.8, 0.72);
    outline.quadraticCurveTo(0.92, 0.74, 0.86, 0.78);
    outline.quadraticCurveTo(0.42, 0.81, -0.18, 0.79);
    outline.quadraticCurveTo(-0.28, 0.77, -0.22, 0.72);
    const insert = new THREE.ExtrudeGeometry(outline, {
      depth: 0.008,
      bevelEnabled: true,
      bevelSize: 0.007,
      bevelThickness: 0.004,
      bevelSegments: 2,
      curveSegments: 12,
    });
    insert.rotateY(Math.PI / 2);
    const insertMesh = new THREE.Mesh(insert, finishes.fabric);
    insertMesh.position.x = side * (h - 0.07);
    group.add(insertMesh);
    // Recessed speaker with a perforated face rather than an isolated cube.
    const speaker = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.072, 0.012, 24),
      finishes.dark,
    );
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(x, 0.46, -0.78);
    group.add(speaker);
    for (let row = -3; row <= 3; row++)
      for (let col = -3; col <= 3; col++) {
        if (row * row + col * col > 10) continue;
        block(
          group,
          'speaker-slot',
          finishes.fabric,
          [x - side * 0.008, 0.46 + row * 0.014, -0.78 + col * 0.014],
          [0.003, 0.004, 0.008],
        );
      }
    block(
      group,
      'window-switch-bed',
      finishes.dark,
      [side * (h - 0.13), 0.689, -0.43],
      [0.05, 0.008, 0.15],
    );
    for (let i = 0; i < (side < 0 ? 4 : 1); i++)
      block(
        group,
        'window-switch',
        finishes.alloy,
        [side * (h - 0.13), 0.696, -0.48 + i * 0.031],
        [0.025, 0.005, 0.016],
      );
  }
  // Sculpted upholstery ribs and piping keep seats readable when looking back.
  for (const x of [-0.4, 0.4]) {
    for (const sign of [-1, 1])
      seam(group, 'seat-piping', [
        [x + sign * 0.17, 0.64, 0.614],
        [x + sign * 0.185, 0.81, 0.625],
        [x + sign * 0.17, 1.005, 0.657],
      ]);
    for (let i = 0; i < 6; i++)
      seam(
        group,
        'seat-fabric-rib',
        [
          [x - 0.135, 0.67 + i * 0.052, 0.613 + i * 0.006],
          [x, 0.675 + i * 0.052, 0.608 + i * 0.006],
          [x + 0.135, 0.67 + i * 0.052, 0.613 + i * 0.006],
        ],
        0.002,
        finishes.fabric,
      );
    block(
      group,
      'floor-mat',
      finishes.dark,
      [x, 0.348, -0.33],
      [0.46, 0.008, 0.65],
    );
    for (let i = 0; i < 6; i++)
      block(
        group,
        'floor-rib',
        finishes.fabric,
        [x, 0.354, -0.55 + i * 0.07],
        [0.35, 0.003, 0.008],
      );
  }
  for (const x of [-0.46, 0, 0.46]) {
    for (const sign of [-1, 1])
      seam(group, 'rear-seat-piping', [
        [x + sign * 0.14, 0.61, 1.027],
        [x + sign * 0.14, 0.79, 1.045],
      ]);
  }
  // Small practical fittings, below the sight line.
  block(
    group,
    'brake-pedal',
    finishes.dark,
    [-0.47, 0.44, -0.83],
    [0.13, 0.07, 0.055],
  ).rotation.x = -0.35;
  block(
    group,
    'accelerator-pedal',
    finishes.dark,
    [-0.29, 0.4, -0.85],
    [0.055, 0.13, 0.04],
  ).rotation.x = -0.25;
  for (const x of [-0.045, 0.045]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.033, 0.004, 6, 24),
      finishes.alloy,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.716, 0.13);
    group.add(ring);
    const cup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.025, 0.024, 24),
      finishes.dark,
    );
    cup.position.set(x, 0.701, 0.13);
    group.add(cup);
  }
  block(
    group,
    'roof-light-surround',
    finishes.dark,
    [0, 1.351, -0.16],
    [0.18, 0.012, 0.16],
  );
  block(
    group,
    'roof-light-lens',
    finishes.stitch,
    [0, 1.343, -0.16],
    [0.12, 0.004, 0.07],
  );
}
