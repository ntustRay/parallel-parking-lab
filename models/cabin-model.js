import * as THREE from '../vendor/three.module.min.js';
import { CAR, CABIN } from '../vehicle-spec.js';
import { createCabinShell } from '../cabin-shell.js';
import { addCabinDetails } from './cabin-details.js';

// Editable authoring source; runtime loads the exported GLB instead.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const mats = new Map();
function mat(color, metalness = 0) {
  const key = color + metalness;
  if (!mats.has(key))
    mats.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        roughness: metalness ? 0.38 : 0.88,
        metalness,
      }),
    );
  return mats.get(key);
}
function box(parent, color, x, y, z, w, h, d, metalness = 0) {
  const mesh = new THREE.Mesh(unitBox, mat(color, metalness));
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}
function softBox(parent, color, x, y, z, w, h, d, r = 0.025) {
  const g = new THREE.BoxGeometry(w, h, d, 10, 5, 8),
    p = g.attributes.position,
    v = new THREE.Vector3(),
    center = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    center.set(
      THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r),
      THREE.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r),
      THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r),
    );
    v.sub(center).normalize().multiplyScalar(r).add(center);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, mat(color));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}
function surface(parent, points, color) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  g.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2),
  );
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const m = mat(color).clone();
  m.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(g, m);
  parent.add(mesh);
  return mesh;
}

export function createCabinModel() {
  const group = new THREE.Group();
  group.name = 'sedan-cabin';
  const half = CAR.width / 2 - 0.115;
  group.add(createCabinShell(mat));
  for (const sign of [-1, 1]) {
    softBox(
      group,
      '#326576',
      sign * 0.984,
      0.98,
      -0.64,
      0.205,
      0.135,
      0.275,
      0.04,
    );
    box(group, '#1b2228', sign * 0.984, 0.98, -0.498, 0.19, 0.115, 0.005);
    const anchor = new THREE.Object3D();
    anchor.name = sign < 0 ? 'mirror-left' : 'mirror-right';
    anchor.position.set(sign * 0.984, 0.98, -0.492);
    group.add(anchor);
  }
  // A shaped dashboard joins the windscreen sill to the lower instrument panel.
  surface(
    group,
    [
      [-half, 0.94, -1.02],
      [half, 0.94, -1.02],
      [half, 0.93, -0.83],
      [-half, 0.93, -0.83],
    ],
    '#363a3d',
  );
  for (const [left, right] of [
    [-half, -0.7],
    [-0.08, half],
  ]) {
    surface(
      group,
      [
        [left, 0.93, -0.83],
        [right, 0.93, -0.83],
        [right, 0.89, -0.39],
        [left, 0.89, -0.39],
      ],
      '#363a3d',
    );
    surface(
      group,
      [
        [left, 0.89, -0.39],
        [right, 0.89, -0.39],
        [right, 0.53, -0.32],
        [left, 0.53, -0.32],
      ],
      '#23292d',
    );
  }
  surface(
    group,
    [
      [-0.7, 0.72, -0.35],
      [-0.08, 0.72, -0.35],
      [-0.08, 0.53, -0.32],
      [-0.7, 0.53, -0.32],
    ],
    '#23292d',
  );
  // Close the driver's instrument recess and the dashboard end caps.
  surface(
    group,
    [
      [-0.7, 0.8, -0.655],
      [-0.08, 0.8, -0.655],
      [-0.08, 0.72, -0.35],
      [-0.7, 0.72, -0.35],
    ],
    '#23292d',
  );
  for (const side of [-1, 1])
    surface(
      group,
      [
        [side * half, 0.94, -1.02],
        [side * half, 0.89, -0.39],
        [side * half, 0.53, -0.32],
        [side * half, 0.53, -1.02],
      ],
      '#23292d',
    );
  softBox(group, '#30373c', 0.35, 0.74, -0.64, 0.81, 0.28, 0.7, 0.04);
  box(group, '#161d22', 0, 0.48, -0.62, half * 2, 0.16, 0.72);
  box(group, '#6e777b', 0, 0.815, -0.381, half * 2, 0.015, 0.016, 0.55);
  // Binnacle, physical vent slats, and a separate passenger-side parking display.
  const hood = new THREE.Shape();
  hood.moveTo(-0.285, 0.8);
  hood.lineTo(-0.285, 0.88);
  hood.quadraticCurveTo(-0.26, 0.982, 0, 0.991);
  hood.quadraticCurveTo(0.26, 0.982, 0.285, 0.88);
  hood.lineTo(0.285, 0.8);
  hood.closePath();
  const hoodMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(hood, {
      depth: 0.16,
      bevelEnabled: true,
      bevelSize: 0.012,
      bevelThickness: 0.012,
      bevelSegments: 3,
      curveSegments: 24,
    }),
    mat('#171d23'),
  );
  hoodMesh.position.set(-0.4, 0, -0.82);
  group.add(hoodMesh);
  const instruments = new THREE.Object3D();
  instruments.name = 'instrument-display';
  instruments.position.set(-0.4, 0.884, -0.645);
  group.add(instruments);
  box(group, '#14202a', -0.4, 0.65, -0.7, 0.64, 0.34, 0.025);
  for (const x of [-0.685, -0.07, 0.25, 0.55]) {
    box(group, '#12191e', x, 0.762, -0.375, 0.14, 0.065, 0.018);
    box(group, '#9aabad', x, 0.8, -0.38, 0.15, 0.008, 0.024, 0.65);
    for (let i = 0; i < 4; i++)
      box(group, '#4a555b', x, 0.739 + i * 0.014, -0.359, 0.126, 0.005, 0.012);
  }
  box(group, '#161e23', 0.385, 0.64, -0.355, 0.37, 0.13, 0.07);
  for (const x of [0.25, 0.39, 0.53]) {
    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.036, 0.036, 0.018, 24),
      mat('#818f96', 0.65),
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.set(x, 0.646, -0.31);
    group.add(dial);
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(0.028, 24),
      mat('#172027'),
    );
    face.position.set(x, 0.646, -0.298);
    group.add(face);
    box(group, '#bdd9e4', x, 0.664, -0.296, 0.003, 0.01, 0.002);
  }
  box(group, '#333e44', 0.08, 0.75, -0.344, 0.04, 0.055, 0.025);
  surface(
    group,
    [
      [0.069, 0.744, -0.328],
      [0.08, 0.766, -0.328],
      [0.091, 0.744, -0.328],
      [0.069, 0.744, -0.328],
    ],
    '#d66a60',
  );

  const wheel = new THREE.Group();
  wheel.position.set(CABIN.wheelX, CABIN.wheelY, CABIN.wheelZ);
  wheel.rotation.x = -0.15;
  group.add(wheel);
  const rotating = new THREE.Group();
  rotating.name = 'steering-wheel';
  wheel.add(rotating);
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.171, 0.017, 10, 72),
    mat('#171d23'),
  );
  rotating.add(rim);
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.154, 0.0014, 4, 72),
    mat('#899295'),
  );
  seam.position.z = 0.011;
  rotating.add(seam);
  for (const sign of [-1, 1]) {
    const spoke = box(
      rotating,
      '#626f78',
      sign * 0.1,
      -0.014,
      0.006,
      0.139,
      0.04,
      0.027,
      0.6,
    );
    spoke.rotation.z = sign * 0.13;
    box(rotating, '#18242b', sign * 0.105, -0.011, 0.023, 0.062, 0.028, 0.011);
    for (let i = 0; i < 3; i++)
      box(
        rotating,
        '#afbdc4',
        sign * 0.104 + (i - 1) * 0.016,
        -0.009,
        0.03,
        0.006,
        0.002,
        0.003,
      );
  }
  const lower = box(
    rotating,
    '#697780',
    0,
    -0.112,
    0.006,
    0.047,
    0.116,
    0.026,
    0.55,
  );
  lower.rotation.z = 0.02;
  const hub = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 12),
    mat('#242b31'),
  );
  hub.scale.set(0.079, 0.063, 0.031);
  hub.position.set(0, -0.013, 0.019);
  rotating.add(hub);
  const badge = new THREE.Mesh(
    new THREE.RingGeometry(0.012, 0.014, 24),
    mat('#adb9bf', 0.65),
  );
  badge.position.set(0, -0.009, 0.05);
  rotating.add(badge);
  box(group, '#182127', -0.4, 0.76, -0.48, 0.105, 0.105, 0.23);
  // Stalks and a narrow wheel marker keep rotation readable without a floating icon.
  box(group, '#172127', -0.62, 0.85, -0.36, 0.15, 0.021, 0.025);
  box(group, '#172127', -0.18, 0.85, -0.36, 0.15, 0.021, 0.025);
  box(rotating, '#b9c5ca', 0, 0.17, 0.012, 0.008, 0.022, 0.014);
  addCabinDetails(group);
  group.userData = { units: 'metres', forward: '-Z', car: { ...CAR } };
  return group;
}
