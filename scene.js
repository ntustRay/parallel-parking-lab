import * as THREE from './vendor/three.module.min.js';
import { step, CAR, ROAD, bodyHalfWidth, collision } from './physics.js';
import { createExterior, updateExterior } from './vehicle-view.js';
export { THREE };

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

function roadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'),
    pixels = ctx.createImageData(256, 256);
  let seed = 9211;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const shade = 45 + (seed % 13);
    pixels.data[i] = shade;
    pixels.data[i + 1] = shade + 3;
    pixels.data[i + 2] = shade + 5;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 70);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function pavementTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#b7bab4';
  c.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32)
    for (let x = -32; x < 256; x += 64) {
      const offset = y % 64 ? 32 : 0;
      c.fillStyle = (x + y) % 3 ? '#c3c6bf' : '#bec2ba';
      c.fillRect(x + offset + 1, y + 1, 62, 30);
    }
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 62);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function signTexture(text, background, foreground) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = background;
  c.fillRect(0, 0, 512, 128);
  c.strokeStyle = foreground + '66';
  c.lineWidth = 3;
  c.strokeRect(10, 10, 492, 108);
  c.font = '600 44px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = foreground;
  c.fillText(text, 256, 65);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 });
}

function daylightEnvironment() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  const sky = c.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#8fb7cf');
  sky.addColorStop(0.43, '#d2e1df');
  sky.addColorStop(0.52, '#f0e8d3');
  sky.addColorStop(0.6, '#89968f');
  sky.addColorStop(1, '#424e52');
  c.fillStyle = sky;
  c.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 8; i++) {
    c.fillStyle = i % 3 ? '#b1bab1' : '#e9e5ce';
    c.fillRect(i * 67, 97 - (i % 3) * 7, 32 + (i % 2) * 17, 36 + (i % 3) * 7);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
let contactMaterial;
function contactShadow() {
  if (contactMaterial) return contactMaterial;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d'),
    g = c.createRadialGradient(32, 32, 7, 32, 32, 32);
  g.addColorStop(0, '#17232b88');
  g.addColorStop(1, '#17232b00');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  contactMaterial = new THREE.MeshBasicMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthWrite: false,
    opacity: 0.65,
    toneMapped: false,
  });
  return contactMaterial;
}
function disposeObject(object) {
  const sharedGeometry = new Set([
    boxGeometry,
    sphereGeometry,
    cylinderGeometry,
  ]);
  const sharedMaterials = new Set([...materials.values(), contactMaterial]);
  const geometries = new Set(),
    privateMaterials = new Set();
  object.traverse((item) => {
    if (item.isInstancedMesh) item.dispose();
    if (
      item.geometry &&
      !item.userData.assetGeometry &&
      !sharedGeometry.has(item.geometry)
    )
      geometries.add(item.geometry);
    for (const mat of Array.isArray(item.material)
      ? item.material
      : [item.material])
      if (
        mat &&
        (!item.userData.assetGeometry || item.userData.privateMaterial) &&
        !sharedMaterials.has(mat)
      )
        privateMaterials.add(mat);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const mat of privateMaterials) {
    mat.map?.dispose();
    mat.dispose();
  }
}
function clearStreet(state) {
  for (const item of state.street.children)
    if (!state.backgroundCars?.includes(item)) disposeObject(item);
  state.street.clear();
}

class Batches {
  constructor(parent) {
    this.parent = parent;
    this.items = new Map();
  }
  add(color, x, y, z, w, h, d, geometry = boxGeometry, angle = 0) {
    const key = color + '-' + geometry.id;
    let list = this.items.get(key);
    if (!list) {
      list = { mat: material(color), geometry, transforms: [] };
      this.items.set(key, list);
    }
    position.set(x, y, z);
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    scale.set(w, h, d);
    matrix.compose(position, rotation, scale);
    list.transforms.push(matrix.clone());
  }
  flush() {
    for (const { mat, geometry, transforms } of this.items.values()) {
      const item = new THREE.InstancedMesh(geometry, mat, transforms.length);
      transforms.forEach((m, i) => item.setMatrixAt(i, m));
      item.castShadow = true;
      item.receiveShadow = true;
      this.parent.add(item);
    }
    this.items.clear();
  }
}

export function createWorld(assets) {
  const makeCar = (color) => {
    const vehicle = createExterior(assets.exterior, color);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(CAR.width * 1.35, CAR.length * 1.08),
      contactShadow(),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.008;
    vehicle.add(shadow);
    return vehicle;
  };
  const world = new THREE.Scene();
  world.background = new THREE.Color('#a9cee6');
  world.fog = new THREE.Fog('#c1d9e7', 65, 190);
  world.environment = daylightEnvironment();
  world.environmentIntensity = 0.45;
  world.add(new THREE.HemisphereLight('#e4eff5', '#8e9b7e', 2.1));
  const sun = new THREE.DirectionalLight('#fff0d4', 3.2);
  sun.position.set(-24, 38, -12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -28;
  sun.shadow.camera.right = 28;
  sun.shadow.camera.top = 32;
  sun.shadow.camera.bottom = -32;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 100;
  sun.shadow.normalBias = 0.035;
  sun.shadow.bias = -0.0002;
  sun.shadow.radius = 3;
  world.add(sun);
  world.add(sun.target);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(180, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#267bd4') },
        horizon: { value: new THREE.Color('#88bfe7') },
      },
      vertexShader:
        'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'varying vec3 vPosition;uniform vec3 top;uniform vec3 horizon;void main(){vec3 d=normalize(vPosition);float h=pow(max(d.y,0.0),.55);vec3 c=mix(horizon,top,h);float sun=pow(max(dot(d,normalize(vec3(-24.,38.,-12.))),0.),300.);c+=vec3(1.,.86,.65)*sun*.55;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    }),
  );
  sky.material.fog = false;
  world.add(sky);
  const street = new THREE.Group();
  world.add(street);
  const player = makeCar('#326576');
  world.add(player);
  const bay = new THREE.Group();
  world.add(bay);
  const guides = new THREE.Group();
  world.add(guides);
  if (!materials.has('road'))
    materials.set(
      'road',
      new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 1 }),
    );
  if (!materials.has('pavement'))
    materials.set(
      'pavement',
      new THREE.MeshStandardMaterial({ map: pavementTexture(), roughness: 1 }),
    );
  return {
    world,
    sun,
    street,
    player,
    bay,
    guides,
    makeCar,
    obstacles: [],
    side: null,
    scenario: null,
    roadMaterial: materials.get('road'),
    pavementMaterial: materials.get('pavement'),
  };
}

export function buildStreet(state, side) {
  clearStreet(state);
  const group = state.street,
    batch = new Batches(group);
  const ground = mesh(
    boxGeometry,
    '#9eaf8c',
    0,
    -0.18,
    0,
    180,
    0.2,
    250,
    group,
  );
  ground.receiveShadow = true;
  const road = mesh(
    boxGeometry,
    state.roadMaterial,
    ((ROAD.curb + ROAD.oppositeCurb) / 2) * side,
    -0.035,
    0,
    ROAD.curb - ROAD.oppositeCurb,
    0.07,
    180,
    group,
  );
  road.name = 'road-surface';
  for (const sign of [-1, 1]) {
    const edge = sign > 0 ? ROAD.curb : ROAD.oppositeCurb,
      sx = (edge + sign * (0.1 + ROAD.sidewalkWidth / 2)) * side;
    const walk = mesh(
      boxGeometry,
      state.pavementMaterial,
      sx,
      ROAD.curbHeight / 2,
      0,
      ROAD.sidewalkWidth,
      ROAD.curbHeight,
      180,
      group,
    );
    walk.name = sign > 0 ? 'parking-sidewalk' : 'opposite-sidewalk';
  }
  for (let z = -85; z < 90; z += 1.5) {
    batch.add(
      z % 3 ? '#dfded5' : '#d2d3ca',
      (ROAD.curb + 0.1) * side,
      ROAD.curbHeight / 2,
      z,
      0.2,
      ROAD.curbHeight,
      1.48,
    );
    batch.add(
      '#bdc6c4',
      (ROAD.oppositeCurb - 0.1) * side,
      ROAD.curbHeight / 2,
      z,
      0.2,
      ROAD.curbHeight,
      1.48,
    );
  }
  for (const x of [ROAD.divider - 0.08, ROAD.divider + 0.08])
    batch.add('#ddbf62', x * side, 0.012, 0, 0.09, 0.014, 180);
  for (let z = -84; z < 90; z += 6)
    for (const x of [
      ROAD.curb - ROAD.parkingWidth,
      ROAD.oppositeCurb + ROAD.parkingWidth,
    ])
      batch.add('#ebe8d9', x * side, 0.012, z, 0.1, 0.014, 3);
  for (let i = 0; i < 14; i++)
    for (const bank of [-1, 1]) {
      const z = -68 + i * 10,
        ht = 8 + ((i * 7) % 9) * 1.3;
      const right = bank === 1,
        wall = (right ? 8.8 : -10.3) * side,
        x = (right ? 12.9 : -14.3) * side;
      const facade = ['#d5d0c3', '#bdc8c6', '#d5d8d2', '#b9c3c8', '#c8c3b8'][
        (i + (right ? 1 : 0)) % 5
      ];
      batch.add(facade, x, ht / 2, z, 8, ht, 9.7);
      batch.add('#b5b8b1', x, ht + 0.1, z, 8.3, 0.22, 9.9);
      batch.add(
        '#e1dfd5',
        wall - side * bank * 0.035,
        3.1,
        z,
        0.18,
        0.22,
        9.75,
      );
      batch.add('#adb5b6', wall - side * bank * 0.08, 0.25, z, 0.13, 0.5, 9.8);
      for (let y = 4.1; y < ht - 0.7; y += 2.2)
        for (let dz = -3.1; dz <= 3.2; dz += 2.05) {
          batch.add(
            '#e5e3d9',
            wall - side * bank * 0.04,
            y,
            z + dz,
            0.15,
            1.5,
            1.18,
          );
          batch.add(
            (i + dz + y) % 3 > 1 ? '#526a76' : '#7495a2',
            wall - side * bank * 0.125,
            y,
            z + dz,
            0.035,
            1.31,
            0.99,
          );
          batch.add(
            '#a8b2b4',
            wall - side * bank * 0.15,
            y - 0.73,
            z + dz,
            0.3,
            0.09,
            1.3,
          );
        }
      for (const dz of [-2.4, 2.4]) {
        batch.add(
          '#566c73',
          wall - side * bank * 0.13,
          1.47,
          z + dz,
          0.04,
          2.45,
          3.7,
        );
        batch.add(
          '#d7d9d0',
          wall - side * bank * 0.17,
          1.47,
          z + dz,
          0.06,
          2.5,
          0.07,
        );
      }
      if (i % 3 === 0) {
        const sign = box(
          group,
          signTexture(
            ['MORNING COFFEE', 'PARKSIDE', 'FLOWER & LEAF'][i % 3],
            ['#274f52', '#3c526a', '#556a50'][i % 3],
            '#f5efdf',
          ),
          wall - side * bank * 0.18,
          2.8,
          z,
          0.05,
          0.55,
          7.1,
        );
        sign.material = Array(6).fill(material('#d9dacd'));
        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(6.8, 0.5),
          signTexture(
            i % 2 ? 'PARKSIDE' : 'MORNING COFFEE',
            '#2b5055',
            '#f4eddb',
          ),
        );
        face.position.set(wall - side * bank * 0.22, 2.8, z);
        face.rotation.y = right ? -Math.PI / 2 : Math.PI / 2;
        group.add(face);
        const canopy = box(
          group,
          '#597b6f',
          wall - side * bank * 0.72,
          2.6,
          z,
          1.3,
          0.12,
          7.4,
        );
        canopy.rotation.z = bank * side * 0.08;
      }
    }
  for (let i = 0; i < 12; i++)
    for (const bank of [-1, 1]) {
      const x = (bank === 1 ? 7.7 : -9.2) * side,
        z = -50 + i * 10;
      batch.add('#77735d', x, 1.65, z, 0.19, 3.3, 0.19, cylinderGeometry);
      batch.add('#7e8b70', x, 0.24, z, 1.55, 0.35, 1.55);
      batch.add('#acb5a2', x, 0.1, z, 1.8, 0.13, 1.8);
      for (let j = 0; j < 7; j++) {
        const theta = j * 2.4,
          rx = Math.cos(theta) * 0.78,
          rz = Math.sin(theta) * 0.75,
          ry = 3.3 + (j % 3) * 0.45;
        batch.add(
          ['#5f7b57', '#708b64', '#7f996f'][j % 3],
          x + rx,
          ry,
          z + rz,
          1.08,
          0.99,
          1.1,
          sphereGeometry,
        );
      }
      if (i % 2 === 0) {
        const polex = (bank === 1 ? 7.9 : -9.4) * side;
        batch.add(
          '#5d696b',
          polex,
          2.65,
          z + 4,
          0.075,
          5.3,
          0.075,
          cylinderGeometry,
        );
        batch.add(
          '#697678',
          polex - bank * side * 0.55,
          5.25,
          z + 4,
          1.1,
          0.08,
          0.12,
        );
        batch.add(
          '#e8e3d2',
          polex - bank * side * 1.04,
          5.18,
          z + 4,
          0.5,
          0.08,
          0.24,
        );
      }
    }
  for (const z of [-22, 20]) {
    batch.add(
      '#596b6c',
      6.7 * side,
      1.8,
      z,
      0.035,
      3.6,
      0.035,
      cylinderGeometry,
    );
    const pole = box(
      group,
      signTexture('P  30 MIN', '#2c6d6a', '#ffffff'),
      6.7 * side,
      3,
      z,
      0.03,
      0.7,
      0.55,
    );
    pole.castShadow = false;
  }
  for (const z of [-10, 13]) {
    batch.add('#758774', 6.5 * side, 0.28, z, 0.8, 0.5, 1.7);
    for (let j = 0; j < 4; j++)
      batch.add(
        '#668857',
        6.5 * side,
        0.65,
        z - 0.6 + j * 0.4,
        0.48,
        0.5,
        0.48,
        sphereGeometry,
      );
  }
  // Background cars stay beyond the drivable +/-24 m practice boundary.
  state.backgroundCars ??= [];
  for (const [i, z] of [-30, -43, -57, 32, 45].entries())
    for (const bank of [-1, 1]) {
      const index = i * 2 + (bank > 0 ? 1 : 0),
        parked = (state.backgroundCars[index] ??= state.makeCar(
          ['#cbd2d4', '#66808b', '#ae806b', '#c2b8a6'][i % 4],
        ));
      const x =
        (bank > 0
          ? ROAD.curb - ROAD.parkingWidth / 2
          : ROAD.oppositeCurb + ROAD.parkingWidth / 2) * side;
      parked.position.set(x, 0, z);
      parked.rotation.y = bank < 0 ? Math.PI : 0;
      group.add(parked);
      for (const edge of [-1, 1]) {
        batch.add(
          '#e5e5d9',
          x + (edge * ROAD.parkingWidth) / 2,
          0.016,
          z,
          0.09,
          0.018,
          6.5,
        );
        batch.add(
          '#e5e5d9',
          x,
          0.016,
          z + edge * 3.25,
          ROAD.parkingWidth,
          0.018,
          0.09,
        );
      }
    }
  // People and street furniture give the road an independent metre-scale cue.
  for (const z of [-26, -47, 28]) {
    const x = 6.7 * side;
    batch.add('#4f6579', x, 1.18, z, 0.36, 0.49, 0.21);
    batch.add('#34424d', x - 0.1, 0.55, z, 0.12, 0.8, 0.13);
    batch.add('#34424d', x + 0.1, 0.55, z, 0.12, 0.8, 0.13);
    batch.add('#b99778', x, 1.59, z, 0.115, 0.14, 0.115, sphereGeometry);
    batch.add('#34424d', x - 0.11, 0.15, z - 0.035, 0.14, 0.09, 0.25);
    batch.add('#34424d', x + 0.11, 0.15, z - 0.035, 0.14, 0.09, 0.25);
  }
  for (const direction of [-1, 1])
    for (const x of [-38, 18, 57])
      for (let i = 0; i < 5; i++) {
        batch.add(
          '#edf3f5',
          x + (i - 2) * 4.5,
          27 + (i === 2 ? 3 : i % 2 ? 1.3 : 0),
          direction * (115 + (i % 2) * 4),
          4.2,
          2.5 + (i === 2 ? 1.1 : 0),
          3.2,
          sphereGeometry,
        );
      }
  batch.flush();
  state.side = side;
}

function buildParkingCourt(state, scenario) {
  clearStreet(state);
  const group = state.street,
    batch = new Batches(group),
    side = scenario.side;
  const edge = scenario.bounds.maxX,
    min = scenario.bounds.minX;
  box(group, '#819d85', 0, -0.18, 0, 140, 0.2, 140);
  box(
    group,
    state.roadMaterial,
    ((edge + min) / 2) * side,
    -0.035,
    0,
    edge - min,
    0.07,
    32,
  );
  // Visible curb edges match the collision envelope exactly.
  for (const x of [min - 0.15, edge + 0.15])
    batch.add('#d6d6c9', x * side, 0.09, 0, 0.3, 0.18, 32.6);
  for (const z of [-16.15, 16.15])
    batch.add(
      '#d6d6c9',
      ((edge + min) / 2) * side,
      0.09,
      z,
      edge - min,
      0.18,
      0.3,
    );
  for (let z = -14; z < 16; z += 4)
    batch.add('#d8d9c7', -2.6 * side, 0.012, z, 0.12, 0.018, 1.8);
  for (const z of [-11, 11]) {
    batch.add(
      '#65716c',
      (edge + 1.8) * side,
      2.5,
      z,
      0.12,
      5,
      0.12,
      cylinderGeometry,
    );
    batch.add('#e9e7ce', (edge + 1.35) * side, 4.9, z, 1.2, 0.08, 0.4);
    batch.add('#8b9b85', (edge + 1.8) * side, 0.25, z + 2, 1.5, 0.5, 2);
    for (let j = 0; j < 4; j++)
      batch.add(
        '#5a805b',
        (edge + 1.8) * side,
        0.8,
        z + 1.3 + j * 0.45,
        0.8,
        0.9,
        0.7,
        sphereGeometry,
      );
  }
  batch.add('#bbc6bd', (edge + 3) * side, 2.7, 0, 1, 5.4, 27);
  batch.add('#58797c', (edge + 2.45) * side, 3.7, 0, 0.1, 1.2, 5);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1),
    signTexture('PARKING LAB', '#345d63', '#f1ead3'),
  );
  sign.position.set((edge + 2.38) * side, 3.7, 0);
  sign.rotation.y = (-side * Math.PI) / 2;
  group.add(sign);
  batch.flush();
  state.side = side;
}

function buildDrivingCourse(state, scene) {
  clearStreet(state);
  const group = state.street,
    batch = new Batches(group),
    area = scene.drivingArea;
  box(group, '#8da384', 0, -0.18, -8, 150, 0.2, 150);
  const shape = new THREE.Shape();
  area.forEach((p, i) => (i ? shape.lineTo(p.x, p.z) : shape.moveTo(p.x, p.z)));
  shape.closePath();
  const surface = new THREE.Mesh(
    new THREE.ShapeGeometry(shape),
    material('#3c464b', 1),
  );
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.005;
  surface.receiveShadow = true;
  group.add(surface);
  function strip(a, b, color, w = 0.14, height = 0.02) {
    batch.add(
      color,
      (a.x + b.x) / 2,
      height / 2 + 0.015,
      -(a.z + b.z) / 2,
      Math.hypot(b.x - a.x, b.z - a.z) + 0.015,
      height,
      w,
      boxGeometry,
      Math.atan2(b.z - a.z, b.x - a.x),
    );
  }
  const winding = Math.sign(
    area.reduce(
      (sum, p, i) =>
        sum +
        p.x * area[(i + 1) % area.length].z -
        area[(i + 1) % area.length].x * p.z,
      0,
    ),
  );
  for (let i = 0; i < area.length; i++) {
    const a = area[i],
      b = area[(i + 1) % area.length],
      length = Math.hypot(b.x - a.x, b.z - a.z),
      nx = ((winding * (b.z - a.z)) / length) * 0.09,
      nz = ((-winding * (b.x - a.x)) / length) * 0.09;
    strip(
      { x: a.x + nx, z: a.z + nz },
      { x: b.x + nx, z: b.z + nz },
      i % 12 < 6 ? '#deddd0' : '#b1b4a5',
      0.18,
      0.15,
    );
  }
  const start = scene.start,
    startWidth = scene.lane || scene.width;
  strip(
    { x: start.x - startWidth / 2 + 0.2, z: start.z + 2.8 },
    { x: start.x + startWidth / 2 - 0.2, z: start.z + 2.8 },
    '#9bd4c5',
    0.16,
  );
  if (scene.kind === 's-curve') {
    // Subtle centre dots are a teaching aid; solid edges remain the road limits.
    for (let i = 8; i < scene.centerline.length - 8; i += 10) {
      const a = scene.centerline[i],
        b = scene.centerline[i + 2];
      strip(a, b, '#b6b6a2', 0.08);
    }
    for (const [i, g] of scene.gates.entries()) {
      const p = scene.centerline.reduce((best, p) =>
          Math.hypot(p.x - g.x, p.z - g.z) <
          Math.hypot(best.x - g.x, best.z - g.z)
            ? p
            : best,
        ),
        index = scene.centerline.indexOf(p),
        a = scene.centerline[index - 1],
        b = scene.centerline[index + 1],
        d = Math.hypot(b.x - a.x, b.z - a.z),
        nx = (b.z - a.z) / d,
        nz = -(b.x - a.x) / d;
      strip(
        {
          x: g.x - nx * (scene.width / 2 - 0.2),
          z: g.z - nz * (scene.width / 2 - 0.2),
        },
        {
          x: g.x + nx * (scene.width / 2 - 0.2),
          z: g.z + nz * (scene.width / 2 - 0.2),
        },
        '#829e91',
        0.08,
      );
      batch.add(
        '#e4a569',
        g.x + nx * (scene.width / 2 + 0.45),
        0.3,
        -g.z - nz * (scene.width / 2 + 0.45),
        0.3,
        0.6,
        0.3,
        cylinderGeometry,
      );
    }
    const t = scene.turnaround;
    for (const z of [t.z - 2.7, t.z + 2.7])
      strip(
        { x: t.x - scene.width / 2 + 0.16, z },
        { x: t.x + scene.width / 2 - 0.16, z },
        '#d6ba79',
        0.15,
      );
  } else {
    for (let x = -scene.width / 2 + 3.25; x < scene.width / 2 - 0.1; x += 3.25)
      for (let z = -15; z < 16; z += 3) {
        if (Math.abs(x) < 0.1 && z > -2 && z < 8) continue;
        strip(
          { x, z },
          { x, z: z + 1.4 },
          Math.abs(x) < 0.1 ? '#d4bc78' : '#d7d7c9',
          0.1,
        );
      }
  }
  // A small training ground with low planting keeps sight lines open.
  const minX = Math.min(...area.map((p) => p.x)),
    maxX = Math.max(...area.map((p) => p.x));
  for (const x of [minX - 3, maxX + 3])
    for (const z of [-10, 2, 14, 26]) {
      batch.add('#686e66', x, 1.05, -z, 0.2, 2.1, 0.2, cylinderGeometry);
      batch.add('#5c7f60', x, 2.9, -z, 2.4, 2.8, 2.4, sphereGeometry);
      batch.add('#bbc3b4', x, 0.18, -z, 2, 0.36, 2);
    }
  batch.flush();
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.85),
    signTexture(scene.roadLabel, '#345d63', '#f1ead3'),
  );
  sign.position.set(minX - 2, 1.8, 3);
  group.add(sign);
  box(group, '#687a72', minX - 2, 0.85, 3, 0.09, 1.7, 0.09);
  state.side = scene.side;
}

export function updateWorld(
  state,
  car,
  scenario,
  { guides = true, exam = false, braking = false, hazards = false } = {},
) {
  if (
    state.side !== scenario.side ||
    state.kind !== scenario.kind ||
    state.courtLength !== scenario.length ||
    state.roadWidth !== scenario.width
  ) {
    if (scenario.drivingArea) buildDrivingCourse(state, scenario);
    else if (scenario.kind === 'garage') buildParkingCourt(state, scenario);
    else buildStreet(state, scenario.side);
    state.kind = scenario.kind;
    state.courtLength = scenario.length;
    state.roadWidth = scenario.width;
  }
  if (state.scenario !== scenario) {
    for (const v of state.obstacles) {
      state.world.remove(v);
      disposeObject(v);
    }
    state.obstacles = scenario.obstacles.map((p, i) => {
      const v = state.makeCar(i ? '#9b7d61' : '#c3c8c7');
      v.position.set(p.x, 0, -p.z);
      v.rotation.y = -p.angle;
      state.world.add(v);
      return v;
    });
    disposeObject(state.bay);
    state.bay.clear();
    state.bay.position.set(0, 0, 0);
    state.bay.rotation.y = 0;
    for (const bay of scenario.parkingBays) {
      const group = new THREE.Group(),
        L = bay.length,
        w = bay.width / 2,
        lineMat = unlit('#eaeade');
      group.position.set(bay.x, 0, -bay.z);
      group.rotation.y = -bay.angle;
      state.bay.add(group);
      for (const x of [-w, w]) box(group, lineMat, x, 0.016, 0, 0.09, 0.018, L);
      for (const z of [-L / 2, L / 2])
        box(group, lineMat, 0, 0.017, z, bay.width, 0.02, 0.09);
      if (scenario.kind === 'garage') {
        box(
          group,
          lineMat,
          0,
          0.026,
          -L / 2 + 0.65,
          Math.max(0.8, bay.width - 0.4),
          0.025,
          0.12,
        );
      }
      if (bay.active) {
        const fill = new THREE.Mesh(
          new THREE.PlaneGeometry(bay.width - 0.12, L - 0.12),
          unlit('#68a092', 0.16),
        );
        fill.rotation.x = -Math.PI / 2;
        fill.position.y = 0.012;
        group.add(fill);
        const accent = unlit('#9fd4bc');
        for (const x of [-w, w])
          for (const z of [-L / 2, L / 2]) {
            box(
              group,
              accent,
              x,
              0.03,
              z - Math.sign(z) * 0.25,
              0.12,
              0.018,
              0.5,
            );
            box(
              group,
              accent,
              x - Math.sign(x) * 0.2,
              0.03,
              z,
              0.4,
              0.018,
              0.12,
            );
          }
      }
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const c = canvas.getContext('2d');
      c.font = '600 82px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = bay.active ? '#b4dfcc' : '#e5e5d9';
      c.fillText(bay.number, 128, 67);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(bay.number.length > 2 ? 1.5 : 0.65, 0.325),
        new THREE.MeshBasicMaterial({
          map: new THREE.CanvasTexture(canvas),
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      label.rotation.x = -Math.PI / 2;
      label.position.set(0, 0.025, L / 2 - 0.37);
      group.add(label);
    }
    state.scenario = scenario;
    state.guideKey = '';
    state.shadowKey = '';
  }
  updateExterior(state.player, car, { braking, hazards });
  state.bay.visible = true;
  const key = [car.x, car.z, car.angle, car.steer]
    .map((n) => n.toFixed(3))
    .join(':');
  if (guides && !exam && state.guideKey !== key) {
    const segments = [],
      warning = [];
    let predicted = {
      ...car,
      gear: 'R',
      speed: -0.8,
      steerTarget: null,
      steerVelocity: 0,
    };
    const point = (pose, sign) => {
      const a = pose.angle;
      return [
        pose.x +
          sign * bodyHalfWidth(-CAR.length / 2) * Math.cos(a) -
          (CAR.length / 2) * Math.sin(a),
        0.035,
        -(
          pose.z -
          sign * bodyHalfWidth(-CAR.length / 2) * Math.sin(a) -
          (CAR.length / 2) * Math.cos(a)
        ),
      ];
    };
    let previous = [point(predicted, -1), point(predicted, 1)];
    for (let i = 0; i < 100; i++) {
      predicted = step(
        predicted,
        { throttle: true, slow: true, holdSteering: true },
        1 / 30,
      );
      const pair = [point(predicted, -1), point(predicted, 1)],
        blocked = collision(predicted, scenario);
      for (let j = 0; j < 2; j++)
        (blocked ? warning : segments).push(...previous[j], ...pair[j]);
      if (i % 25 === 0 || blocked)
        (blocked ? warning : segments).push(...pair[0], ...pair[1]);
      previous = pair;
      if (blocked) break;
    }
    for (const child of state.guides.children) child.geometry.dispose();
    state.guides.clear();
    for (const [points, color] of [
      [segments, '#e4c471'],
      [warning, '#e78570'],
    ]) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(points, 3),
      );
      state.guides.add(new THREE.LineSegments(geometry, guideMaterial(color)));
    }
    state.guideKey = key;
  }
  state.guides.visible = guides && !exam && car.gear === 'R';
}
