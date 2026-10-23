import * as THREE from './vendor/three.module.min.js';
import { CAR, CABIN, MODEL_ANCHORS } from './vehicle-spec.js';
import { STEERING_LOCK } from './steering.js';
export { CABIN } from './vehicle-spec.js';

function display(anchor, w, h, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  anchor.add(mesh);
  return { canvas, texture, mesh, ctx: canvas.getContext('2d') };
}

// The asset supplies shape and named anchors; this adapter supplies behaviour.
export function createCockpit(model) {
  const group = model.clone(true);
  group.name = 'driver-cabin';
  const rotating = group.getObjectByName(MODEL_ANCHORS.steering);
  const instruments = display(
    group.getObjectByName(MODEL_ANCHORS.instruments),
    0.49,
    0.156,
    960,
    340,
  );
  const mirrorFaces = {};
  for (const side of ['left', 'right']) {
    const material = new THREE.ShaderMaterial({
      uniforms: { image: { value: null } },
      vertexShader:
        'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader:
        'uniform sampler2D image;varying vec2 vUv;void main(){gl_FragColor=texture2D(image,vec2(1.-vUv.x,vUv.y));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.177, 0.102),
      material,
    );
    group.getObjectByName('mirror-' + side).add(face);
    mirrorFaces[side] = face;
  }
  group.userData = { rotating, instruments, mirrorFaces, lastKey: '' };
  return group;
}

function dial(ctx, cx, cy, r, start, end, value, label, color) {
  ctx.strokeStyle = '#263b4e';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end);
  ctx.stroke();
  for (let i = 0; i <= 20; i++) {
    const a = start + ((end - start) * i) / 20,
      major = i % 5 === 0;
    ctx.strokeStyle = major ? '#e9f3ff' : '#84a6c5';
    ctx.lineWidth = major ? 3 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * (r - 3), cy + Math.sin(a) * (r - 3));
    ctx.lineTo(
      cx + Math.cos(a) * (r - (major ? 20 : 10)),
      cy + Math.sin(a) * (r - (major ? 20 : 10)),
    );
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#bdcfe0';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      const tick =
        label === 'km/h'
          ? i * 2
          : Math.round((((i - 10) / 10) * CAR.maxSteer * 180) / Math.PI);
      ctx.fillText(
        String(tick),
        cx + Math.cos(a) * (r - 40),
        cy + Math.sin(a) * (r - 40) + 7,
      );
    }
  }
  const a = start + (end - start) * Math.max(0, Math.min(1, value));
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(a) * (r - 26), cy + Math.sin(a) * (r - 26));
  ctx.stroke();
  ctx.fillStyle = '#324958';
  ctx.beginPath();
  ctx.arc(cx, cy, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9cb2c8';
  ctx.font = '19px sans-serif';
  ctx.fillText(label, cx, cy + 43);
}
export function updateCockpit(
  cabin,
  car,
  scenario,
  { braking = false, hazards = false } = {},
) {
  const data = cabin.userData;
  data.rotating.rotation.z = (-car.steer * STEERING_LOCK * Math.PI) / 180;
  const key = [
    (Math.abs(car.speed) * 3.6).toFixed(1),
    car.gear,
    car.steer.toFixed(2),
    car.x.toFixed(1),
    car.z.toFixed(1),
    car.angle.toFixed(2),
    scenario.length,
    braking,
    hazards,
  ].join(':');
  if (key === data.lastKey) return;
  data.lastKey = key;
  const c = data.instruments.ctx;
  c.fillStyle = '#08131e';
  c.fillRect(0, 0, 960, 340);
  dial(
    c,
    190,
    205,
    128,
    Math.PI * 0.78,
    Math.PI * 2.22,
    (Math.abs(car.speed) * 3.6) / 40,
    'km/h',
    '#78bdff',
  );
  dial(
    c,
    770,
    205,
    128,
    Math.PI * 0.78,
    Math.PI * 2.22,
    (car.steer + 1) / 2,
    '輪角 °',
    '#78bdff',
  );
  c.fillStyle = '#9fb7d0';
  c.textAlign = 'center';
  c.font = '24px sans-serif';
  c.fillText('PARKING LAB', 480, 62);
  c.fillStyle = '#f1f7ff';
  c.font = '600 88px sans-serif';
  c.fillText((Math.abs(car.speed) * 3.6).toFixed(1), 480, 166);
  c.font = '23px sans-serif';
  c.fillStyle = '#97b1ca';
  c.fillText('km/h', 480, 204);
  c.strokeStyle = car.gear === 'R' ? '#e4b775' : '#7baace';
  c.lineWidth = 2;
  c.strokeRect(445, 231, 70, 64);
  c.fillStyle = car.gear === 'R' ? '#e4b775' : '#d3e9ff';
  c.font = '43px sans-serif';
  c.fillText(car.gear, 480, 280);
  data.instruments.texture.needsUpdate = true;
  c.font = '28px sans-serif';
  c.fillStyle = hazards ? '#f0c578' : '#293c49';
  c.fillText('◀', 407, 275);
  c.fillText('▶', 552, 275);
  if (braking) {
    c.font = '18px sans-serif';
    c.fillStyle = '#df968c';
    c.fillText('BRAKE', 480, 324);
  }
}
