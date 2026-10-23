import * as THREE from '../vendor/three.module.min.js';
import { CAR, bodyHalfWidth } from '../physics.js';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const sphereGeometry = new THREE.SphereGeometry(1, 12, 9);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
const matrix = new THREE.Matrix4(),
  position = new THREE.Vector3(),
  rotation = new THREE.Quaternion(),
  scale = new THREE.Vector3();
const materials = new Map();
function material(color, roughness = 0.85, metalness = 0) {
  const key = `${color}-${roughness}-${metalness}`;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
  return materials.get(key);
}
function unlit(color, opacity = 1) {
  const key = 'unlit:' + color + opacity;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshBasicMaterial({
        color,
        opacity,
        transparent: opacity < 1,
        depthWrite: opacity === 1,
      }),
    );
  return materials.get(key);
}
function guideMaterial(color) {
  const key = 'line:' + color;
  if (!materials.has(key))
    materials.set(key, new THREE.LineBasicMaterial({ color, depthTest: true }));
  return materials.get(key);
}
function mesh(geometry, color, x, y, z, w = 1, h = 1, d = 1, parent) {
  const item = new THREE.Mesh(
    geometry,
    typeof color === 'string' ? material(color) : color,
  );
  item.position.set(x, y, z);
  item.scale.set(w, h, d);
  item.castShadow = true;
  item.receiveShadow = true;
  parent.add(item);
  return item;
}
function box(parent, color, x, y, z, w, h, d) {
  return mesh(boxGeometry, color, x, y, z, w, h, d, parent);
}

function paintMaterial(color) {
  const key = 'paint:' + color;
  if (!materials.has(key))
    materials.set(
      key,
      new THREE.MeshPhysicalMaterial({
        color,
        roughness: 0.3,
        metalness: 0.42,
        clearcoat: 0.75,
        clearcoatRoughness: 0.23,
      }),
    );
  return materials.get(key);
}
const rimMaterial = new THREE.MeshStandardMaterial({
  color: '#aebbc2',
  roughness: 0.35,
  metalness: 0.7,
});
const wheelFinish = () => rimMaterial;
function roundedBox(w, h, d, r = 0.12) {
  const geometry = new THREE.BoxGeometry(w, h, d, 8, 5, 12),
    p = geometry.attributes.position,
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
  geometry.computeVertexNormals();
  return geometry;
}
function quad(parent, points, mat) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  const m = new THREE.Mesh(geometry, mat);
  m.material.side = THREE.DoubleSide;
  m.castShadow = true;
  parent.add(m);
  return m;
}
let carBodyGeometry;
function bodyShell() {
  if (carBodyGeometry) return carBodyGeometry;
  const bevel = 0.045,
    half = CAR.length / 2 - bevel,
    low = 0.22 + bevel,
    axle = 0.317,
    radius = 0.37,
    rear = CAR.length / 2 - CAR.rear,
    front = rear - CAR.wheelbase;
  const profile = new THREE.Shape();
  profile.moveTo(-half, low);
  for (const z of [front, rear]) {
    profile.lineTo(z - radius, low);
    profile.lineTo(z - radius, axle);
    profile.absarc(z, axle, radius, Math.PI, 0, true);
    profile.lineTo(z + radius, low);
  }
  profile.lineTo(half, low);
  profile.quadraticCurveTo(half, 0.62, half - 0.12, 0.7);
  profile.lineTo(1.02, 0.84);
  profile.lineTo(-0.84, 0.84);
  profile.quadraticCurveTo(-1.7, 0.8, -half + 0.1, 0.66);
  profile.quadraticCurveTo(-half, 0.58, -half, 0.34);
  profile.closePath();
  const depth = CAR.width - 2 * bevel;
  carBodyGeometry = new THREE.ExtrudeGeometry(profile, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 20,
    steps: 1,
  });
  carBodyGeometry.translate(0, 0, -depth / 2);
  carBodyGeometry.rotateY(-Math.PI / 2);
  const p = carBodyGeometry.attributes.position;
  for (let i = 0; i < p.count; i++)
    p.setX(i, (p.getX(i) / (CAR.width / 2)) * bodyHalfWidth(-p.getZ(i)));
  carBodyGeometry.computeVertexNormals();
  return carBodyGeometry;
}
export function createExteriorModel(color = '#326576') {
  const group = new THREE.Group(),
    paint = paintMaterial(color),
    rubber = material('#1b2228', 0.98),
    chrome = material('#aebbc2', 0.3, 0.7),
    glass = material('#294654', 0.22, 0.2),
    trim = material('#24303a', 0.7);
  paint.name = 'body-paint';
  const body = mesh(bodyShell(), paint, 0, 0, 0, 1, 1, 1, group);
  body.name = 'body-envelope';
  box(group, trim, 0, 0.18, 0, CAR.width - 0.28, 0.08, CAR.length - 0.48);
  quad(
    group,
    [
      [-0.7, 0.71, -2.1],
      [0.7, 0.71, -2.1],
      [0.8, 0.86, -0.86],
      [-0.8, 0.86, -0.86],
    ],
    paint,
  );
  quad(
    group,
    [
      [0.8, 0.86, 1.12],
      [-0.8, 0.86, 1.12],
      [-0.74, 0.7, 2.1],
      [0.74, 0.7, 2.1],
    ],
    paint,
  );
  const base = 0.78,
    top = 0.635,
    low = 0.87,
    high = CAR.height - 0.065;
  quad(
    group,
    [
      [-base, low, -0.86],
      [base, low, -0.86],
      [top, high, -0.38],
      [-top, high, -0.38],
    ],
    glass,
  );
  quad(
    group,
    [
      [base, low, 1.12],
      [-base, low, 1.12],
      [-top, high, 0.65],
      [top, high, 0.65],
    ],
    glass,
  );
  for (const side of [-1, 1]) {
    quad(
      group,
      [
        [side * base, low, -0.86],
        [side * base, low, 1.12],
        [side * top, high, 0.65],
        [side * top, high, -0.38],
      ],
      glass,
    );
    for (const [bottomZ, topZ] of [
      [-0.86, -0.38],
      [1.12, 0.65],
    ]) {
      const a = new THREE.Vector3(side * base, low, bottomZ),
        b = new THREE.Vector3(side * top, high, topZ),
        axis = b.clone().sub(a);
      const frame = box(group, paint, 0, 0, 0, 0.055, axis.length(), 0.055);
      frame.position.copy(a.add(b).multiplyScalar(0.5));
      frame.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        axis.normalize(),
      );
    }
    const pillar = box(group, paint, side * 0.7, 1.15, 0.1, 0.065, 0.46, 0.085);
    pillar.rotation.z = side * 0.18;
    const quarterBase = new THREE.Vector3(side * base, low, 0.72),
      quarterTop = new THREE.Vector3(side * top, high, 0.36),
      quarterAxis = quarterTop.clone().sub(quarterBase);
    const quarterPillar = box(
      group,
      paint,
      0,
      0,
      0,
      0.045,
      quarterAxis.length(),
      0.055,
    );
    quarterPillar.position.copy(
      quarterBase.add(quarterTop).multiplyScalar(0.5),
    );
    quarterPillar.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      quarterAxis.normalize(),
    );
    box(group, trim, side * 0.795, 0.87, 0.13, 0.035, 0.025, 1.97);
    box(
      group,
      chrome,
      side * (CAR.width / 2 - 0.02),
      0.76,
      0.58,
      0.025,
      0.028,
      0.18,
    );
    box(
      group,
      chrome,
      side * (CAR.width / 2 - 0.02),
      0.76,
      -0.49,
      0.025,
      0.028,
      0.18,
    );
    mesh(
      roundedBox(0.205, 0.135, 0.275, 0.04),
      paint,
      side * 0.984,
      0.98,
      -0.64,
      1,
      1,
      1,
      group,
    );
    box(
      group,
      trim,
      side * (CAR.width / 2 - 0.02),
      0.365,
      0,
      0.03,
      0.045,
      3.48,
    );
    const seam = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(side * 0.888, 0.8, 0.16),
      new THREE.Vector3(side * 0.888, 0.43, 0.16),
    ]);
    group.add(new THREE.Line(seam, guideMaterial('#36505b')));
  }
  mesh(
    roundedBox(1.31, 0.08, 1.1, 0.025),
    paint,
    0,
    CAR.height - 0.04,
    0.135,
    1,
    1,
    1,
    group,
  );
  box(group, trim, 0, 0.51, -CAR.length / 2 + 0.018, 0.88, 0.16, 0.028);
  box(group, chrome, 0, 0.6, -CAR.length / 2 + 0.019, 0.88, 0.018, 0.028);
  const lights = [],
    reverseLights = [],
    indicators = [];
  for (const side of [-1, 1]) {
    box(
      group,
      new THREE.MeshStandardMaterial({
        color: '#ebf0ed',
        emissive: '#dce9e5',
        emissiveIntensity: 0.35,
      }),
      side * 0.49,
      0.63,
      -CAR.length / 2 + 0.035,
      0.34,
      0.09,
      0.045,
    );
    const tail = box(
      group,
      new THREE.MeshStandardMaterial({
        color: '#bb493d',
        emissive: '#8d2822',
        emissiveIntensity: 0.35,
      }),
      side * 0.52,
      0.65,
      CAR.length / 2 - 0.035,
      0.37,
      0.09,
      0.045,
    );
    tail.name = 'brake-' + side;
    lights.push(tail);
    const reverse = box(
      group,
      new THREE.MeshStandardMaterial({
        color: '#cbd9d6',
        emissive: '#e5f2df',
        emissiveIntensity: 0,
      }),
      side * 0.41,
      0.65,
      CAR.length / 2 - 0.009,
      0.1,
      0.06,
      0.018,
    );
    reverse.name = 'reverse-' + side;
    reverseLights.push(reverse);
    for (const end of [-1, 1]) {
      const lamp = box(
        group,
        new THREE.MeshStandardMaterial({
          color: '#986b36',
          emissive: '#ffb64e',
          emissiveIntensity: 0,
        }),
        side * 0.69,
        0.64,
        end * (CAR.length / 2 - 0.025),
        0.07,
        0.065,
        0.025,
      );
      lamp.name = 'indicator-' + side + '-' + end;
      indicators.push(lamp);
    }
  }
  box(
    group,
    material('#d9e0df'),
    0,
    0.47,
    CAR.length / 2 - 0.012,
    0.43,
    0.1,
    0.02,
  );
  const frontWheels = [],
    rearWheels = [],
    radius = 0.317;
  const rearZ = CAR.length / 2 - CAR.rear,
    frontZ = rearZ - CAR.wheelbase;
  for (const x of [-CAR.track / 2, CAR.track / 2])
    for (const z of [frontZ, rearZ]) {
      const axle = new THREE.Group();
      axle.name =
        (z === frontZ ? 'front-wheel-' : 'rear-wheel-') +
        (x < 0 ? 'left' : 'right');
      axle.position.set(x, radius, z);
      group.add(axle);
      const tire = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.195, 28),
        rubber,
      );
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      axle.add(tire);
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.209, 0.209, 0.018, 32),
        wheelFinish(),
      );
      rim.position.x = Math.sign(x) * 0.101;
      rim.rotation.z = Math.PI / 2;
      axle.add(rim);
      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.024, 16),
        trim,
      );
      hub.position.x = Math.sign(x) * 0.113;
      hub.rotation.z = Math.PI / 2;
      axle.add(hub);
      (z === frontZ ? frontWheels : rearWheels).push(axle);
    }
  group.name = 'sedan-exterior';
  group.userData = { units: 'metres', forward: '-Z', car: { ...CAR } };
  return group;
}
