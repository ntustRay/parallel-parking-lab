import * as THREE from './vendor/three.module.min.js';
import { CABIN_BOUNDS } from './vehicle-spec.js';
export { CABIN_BOUNDS } from './vehicle-spec.js';

// Car-local metres, facing -Z. Keep the opaque shell separate from canvas
// instruments so its coverage and window openings can be checked without WebGL.
const cube = new THREE.BoxGeometry(1, 1, 1);

export function createCabinShell(material) {
  const group = new THREE.Group();
  group.name = 'cabin-shell';
  const materials = new Map();
  const finish =
    material ||
    ((color, metalness = 0) => {
      const key = color + metalness;
      if (!materials.has(key))
        materials.set(
          key,
          new THREE.MeshStandardMaterial({
            color,
            roughness: metalness ? 0.4 : 0.9,
            metalness,
          }),
        );
      return materials.get(key);
    });
  const {
    halfWidth: h,
    floor,
    sill,
    front,
    rear,
    roof,
    roofHalfWidth: rh,
    roofFront: rf,
    roofRear: rr,
  } = CABIN_BOUNDS;
  function box(name, color, x, y, z, w, height, d, metalness = 0) {
    const mesh = new THREE.Mesh(cube, finish(color, metalness));
    mesh.name = name;
    mesh.position.set(x, y, z);
    mesh.scale.set(w, height, d);
    group.add(mesh);
    return mesh;
  }
  function rounded(name, color, x, y, z, w, height, d, r = 0.025) {
    const geometry = new THREE.BoxGeometry(w, height, d, 6, 4, 6),
      p = geometry.attributes.position;
    const v = new THREE.Vector3(),
      center = new THREE.Vector3();
    r = Math.min(r, w / 2, height / 2, d / 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      center.set(
        THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r),
        THREE.MathUtils.clamp(v.y, -height / 2 + r, height / 2 - r),
        THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r),
      );
      v.sub(center).normalize().multiplyScalar(r).add(center);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    // Taper the upper backrest and gently hollow the seat cushion.
    if (name.endsWith('seat-back') || name.endsWith('seat-cushion')) {
      for (let i = 0; i < p.count; i++) {
        const y = (p.getY(i) + height / 2) / height;
        if (name.endsWith('seat-back')) {
          p.setX(i, p.getX(i) * (1 - 0.12 * y));
          if (p.getZ(i) < 0)
            p.setZ(i, p.getZ(i) - 0.012 * Math.sin(Math.PI * y));
        } else if (p.getY(i) > 0) {
          const across = p.getX(i) / (w / 2);
          p.setY(i, p.getY(i) - 0.012 * (1 - across * across));
        }
      }
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, finish(color));
    mesh.name = name;
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  }
  function panel(name, color, points) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points.flat(), 3),
    );
    geometry.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2),
    );
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    const m = finish(color).clone();
    m.side = THREE.DoubleSide;
    const mesh = new THREE.Mesh(geometry, m);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }
  function beam(name, color, a, b, w, d) {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b),
      axis = end.clone().sub(start),
      mid = start.clone().add(end).multiplyScalar(0.5);
    const mesh = box(name, color, mid.x, mid.y, mid.z, w, axis.length(), d);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      axis.normalize(),
    );
    return mesh;
  }

  // Continuous opaque floor, firewall and rear bulkhead. Door skins overlap
  // these surfaces; trim must never be the only thing hiding the street.
  box(
    'floor',
    '#242b30',
    0,
    floor,
    (front + rear) / 2,
    h * 2 + 0.08,
    0.08,
    rear - front + 0.1,
  );
  box('firewall', '#252c31', 0, 0.61, front, h * 2 + 0.08, 0.64, 0.1);
  box('rear-bulkhead', '#2b3237', 0, 0.57, rear, h * 2 + 0.08, 0.62, 0.1);
  rounded('transmission-tunnel', '#242b31', 0, 0.4, 0.04, 0.24, 0.2, 1.7, 0.05);
  rounded('center-console', '#30373c', 0, 0.58, 0.21, 0.22, 0.24, 0.67, 0.035);
  rounded('console-armrest', '#171d23', 0, 0.73, 0.43, 0.24, 0.1, 0.33, 0.03);
  box('console-inlay', '#141c22', 0, 0.713, 0.02, 0.15, 0.014, 0.18);

  // Headliner and tapered roof rails follow the exterior's sloping glass.
  box(
    'headliner',
    '#777c7d',
    0,
    roof + 0.025,
    (rf + rr) / 2,
    rh * 2,
    0.05,
    rr - rf + 0.05,
  );
  beam(
    'windscreen-header',
    '#687074',
    [-rh, roof, rf],
    [rh, roof, rf],
    0.065,
    0.075,
  );
  beam(
    'rear-window-header',
    '#687074',
    [-rh, roof, rr],
    [rh, roof, rr],
    0.065,
    0.075,
  );
  box('parcel-shelf', '#41494c', 0, 0.875, 1.02, h * 2, 0.055, 0.4);

  for (const side of [-1, 1]) {
    const label = side < 0 ? 'left' : 'right';
    box(
      label + '-door-skin',
      '#2b3237',
      side * (h + 0.025),
      (floor + sill) / 2,
      (front + rear) / 2,
      0.11,
      sill - floor + 0.055,
      rear - front + 0.1,
    );
    // Both front and rear door cards sit on a complete skin, with visible
    // armrests, a lower pocket and a small seam between the doors.
    for (const [name, z, length] of [
      ['front', -0.34, 1.32],
      ['rear', 0.78, 0.78],
    ]) {
      rounded(
        label + '-' + name + '-door-card',
        '#363e44',
        side * (h - 0.037),
        0.655,
        z,
        0.055,
        0.32,
        length - 0.06,
        0.02,
      );
      rounded(
        label + '-' + name + '-armrest',
        '#171d23',
        side * (h - 0.085),
        0.64,
        z + 0.035,
        0.115,
        0.075,
        length * 0.55,
        0.025,
      );
      rounded(
        label + '-' + name + '-pocket',
        '#20282e',
        side * (h - 0.055),
        0.405,
        z,
        0.065,
        0.13,
        length * 0.68,
        0.015,
      );
      box(
        label + '-' + name + '-handle-recess',
        '#171d22',
        side * (h - 0.069),
        0.765,
        z - 0.14,
        0.018,
        0.065,
        0.22,
      );
      box(
        label + '-' + name + '-handle',
        '#aab4b8',
        side * (h - 0.083),
        0.773,
        z - 0.14,
        0.018,
        0.019,
        0.15,
        0.65,
      );
    }
    box(
      label + '-door-seam',
      '#151e24',
      side * (h - 0.034),
      0.59,
      0.36,
      0.012,
      0.49,
      0.013,
    );
    box(
      label + '-window-sill',
      '#4a5357',
      side * (h - 0.012),
      sill - 0.003,
      (front + rear) / 2,
      0.1,
      0.05,
      rear - front + 0.03,
    );
    box(
      label + '-sill-trim',
      '#879297',
      side * (h - 0.071),
      0.837,
      (front + rear) / 2,
      0.012,
      0.012,
      rear - front - 0.1,
      0.4,
    );
    beam(
      label + '-a-pillar',
      '#687074',
      [side * h, sill, -0.96],
      [side * rh, roof, rf],
      0.095,
      0.1,
    );
    beam(
      label + '-a-seal',
      '#171f24',
      [side * (h + 0.02), sill, -0.97],
      [side * (rh + 0.025), roof, rf],
      0.025,
      0.11,
    );
    beam(
      label + '-roof-rail',
      '#687074',
      [side * rh, roof, rf],
      [side * rh, roof, rr],
      0.07,
      0.075,
    );
    beam(
      label + '-b-pillar',
      '#555e65',
      [side * h, sill, 0.38],
      [side * rh, roof, 0.31],
      0.095,
      0.09,
    );
    // The broad C pillar closes the quarter behind the rear door, leaving
    // a real rear windscreen between the two pillars rather than a solid wall.
    panel(label + '-c-pillar', '#687074', [
      [side * h, sill, 0.94],
      [side * h, sill, rear + 0.025],
      [side * rh, roof, rr + 0.02],
      [side * rh, roof, 0.52],
    ]);
    beam(
      label + '-rear-window-seal',
      '#171f24',
      [side * h, sill, rear],
      [side * rh, roof, rr],
      0.025,
      0.04,
    );
    box(
      label + '-belt-anchor',
      '#929b9e',
      side * (h - 0.06),
      1.13,
      0.36,
      0.03,
      0.08,
      0.045,
      0.4,
    );
    beam(
      label + '-belt',
      '#242b31',
      [side * (h - 0.07), 1.12, 0.36],
      [side * 0.66, 0.54, 0.6],
      0.028,
      0.012,
    );
    const visor = rounded(
      label + '-visor',
      '#555e65',
      side * 0.34,
      roof - 0.018,
      -0.35,
      0.49,
      0.035,
      0.17,
      0.012,
    );
    visor.rotation.x = -0.08;
  }

  // Seat pans, bolsters, backrests and head restraints. The driver's backrest
  // is behind the eye; it must not intersect the near plane when turning.
  for (const x of [-0.4, 0.4]) {
    const name = x < 0 ? 'driver' : 'passenger';
    rounded(
      name + '-seat-base',
      '#171d23',
      x,
      0.405,
      0.4,
      0.55,
      0.17,
      0.63,
      0.045,
    );
    rounded(
      name + '-seat-cushion',
      '#343d44',
      x,
      0.51,
      0.36,
      0.48,
      0.12,
      0.56,
      0.045,
    );
    for (const side of [-1, 1])
      rounded(
        name + '-seat-bolster-' + side,
        '#242b31',
        x + side * 0.215,
        0.57,
        0.38,
        0.075,
        0.13,
        0.54,
        0.03,
      );
    const back = rounded(
      name + '-seat-back',
      '#242b31',
      x,
      0.8,
      0.72,
      0.53,
      0.58,
      0.14,
      0.045,
    );
    back.rotation.x = 0.12;
    const inset = rounded(
      name + '-seat-inset',
      '#343d44',
      x,
      0.82,
      0.633,
      0.37,
      0.4,
      0.025,
      0.012,
    );
    inset.rotation.x = 0.12;
    for (const side of [-1, 1])
      box(
        name + '-headrest-post-' + side,
        '#aab4b8',
        x + side * 0.085,
        1.115,
        0.75,
        0.014,
        0.12,
        0.014,
        0.65,
      );
    rounded(
      name + '-headrest',
      '#242b31',
      x,
      1.205,
      0.76,
      0.31,
      0.19,
      0.13,
      0.04,
    );
  }
  rounded(
    'rear-seat-cushion',
    '#343d44',
    0,
    0.51,
    0.99,
    1.4,
    0.18,
    0.38,
    0.045,
  );
  const rearBack = rounded(
    'rear-seat-back',
    '#242b31',
    0,
    0.69,
    1.135,
    1.42,
    0.39,
    0.14,
    0.04,
  );
  rearBack.rotation.x = 0.1;
  for (const x of [-0.46, 0, 0.46]) {
    rounded(
      'rear-seat-inset-' + x,
      '#343d44',
      x,
      0.71,
      1.052,
      0.33,
      0.26,
      0.025,
      0.012,
    );
    rounded(
      'rear-headrest-' + x,
      '#242b31',
      x,
      0.975,
      1.13,
      x === 0 ? 0.22 : 0.27,
      0.16,
      0.11,
      0.03,
    );
  }
  // A short exterior bonnet is visible below the windscreen, as it is when
  // the exterior player mesh is shown in the other three camera views.
  panel('bonnet', '#326576', [
    [-0.71, 0.71, -2.1],
    [0.71, 0.71, -2.1],
    [0.8, 0.88, -1.0],
    [-0.8, 0.88, -1.0],
  ]);
  return group;
}
