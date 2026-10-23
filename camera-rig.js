import * as THREE from './vendor/three.module.min.js';
import { CAR, CABIN } from './vehicle-spec.js';
import { corners } from './physics.js';

// Camera geometry only; viewport bounds are supplied by the DOM adapter.
export class CameraRig {
  constructor() {
    this.perspectiveCamera = new THREE.PerspectiveCamera(45, 1, 0.06, 200);
    this.topCamera = new THREE.OrthographicCamera(-16, 16, 12, -12, 0.06, 200);
  }
  pointCamera(car, state, scenario, layout) {
    for (const key of [
      'w',
      'h',
      'view',
      'lookYaw',
      'lookPitch',
      'fov',
      'mirrorTilt',
    ])
      this[key] = state[key];
    this.scenario = scenario;
    const p = new THREE.Vector3(car.x, 0, -car.z),
      f = new THREE.Vector3(Math.sin(car.angle), 0, -Math.cos(car.angle)),
      r = new THREE.Vector3(Math.cos(car.angle), 0, Math.sin(car.angle));
    this.camera = this.view === 'top' ? this.topCamera : this.perspectiveCamera;
    let eye, target;
    this.camera.up.set(0, 1, 0);
    const aspect = this.w / this.h;
    let horizontalFov = 65;
    if (this.view === 'mirror-left' || this.view === 'mirror-right') {
      const sign = this.view === 'mirror-left' ? -1 : 1;
      eye = p
        .clone()
        .addScaledVector(r, sign * (CAR.width / 2 + 0.13))
        .addScaledVector(f, CABIN.mirrorForward);
      eye.y = CABIN.mirrorHeight;
      target = eye
        .clone()
        .addScaledVector(f, -12)
        .addScaledVector(r, sign * 3.5);
      target.y += Math.tan((this.mirrorTilt * Math.PI) / 180) * 12;
      horizontalFov = 64;
    } else if (this.view === 'rear') {
      eye = p.clone().addScaledVector(f, -0.6);
      eye.y = 1.3;
      target = eye.clone().addScaledVector(f, -18);
      target.y = 0.4;
      horizontalFov = 72;
    } else if (this.view === 'driver') {
      eye = p
        .clone()
        .addScaledVector(r, CABIN.eyeX)
        .addScaledVector(f, CABIN.eyeForward);
      eye.y = CABIN.eyeHeight;
      const yaw = car.angle + this.lookYaw,
        pitch = CABIN.pitch + this.lookPitch;
      target = eye
        .clone()
        .add(
          new THREE.Vector3(
            Math.sin(yaw) * 18,
            Math.tan(pitch) * 18,
            -Math.cos(yaw) * 18,
          ),
        );
      horizontalFov = this.fov;
    } else if (this.view === 'top') {
      const scene = this.scenario;
      const points = (scene.overviewPoints || []).concat(
        scene.parkingBays
          .flatMap((bay) =>
            corners(bay, { length: bay.length, width: bay.width }),
          )
          .concat(corners(scene.start)),
      );
      const minZ = Math.min(...points.map((v) => v.z)),
        maxZ = Math.max(...points.map((v) => v.z));
      const centerX =
          (Math.min(...points.map((v) => v.x)) +
            Math.max(...points.map((v) => v.x))) /
          2,
        centerZ = (minZ + maxZ) / 2;
      const { upper, lower } = layout;
      const usable = Math.max(this.h * 0.25, lower - upper),
        halfHeight = Math.max(
          (((maxZ - minZ + 1.2) / 2) * this.h) / usable,
          (Math.max(...points.map((v) => v.x)) -
            Math.min(...points.map((v) => v.x)) +
            2) /
            2 /
            aspect,
          9 / aspect,
        );
      const offset =
        (((upper + lower) / 2 - this.h / 2) * 2 * halfHeight) / this.h;
      this.camera.left = -halfHeight * aspect;
      this.camera.right = halfHeight * aspect;
      this.camera.top = halfHeight + offset;
      this.camera.bottom = -halfHeight + offset;
      eye = new THREE.Vector3(centerX, 31, -centerZ + 0.001);
      target = new THREE.Vector3(centerX, 0, -centerZ);
      this.camera.up.set(0, 0, -1);
      horizontalFov = 65;
    } else if (this.view === 'chase') {
      eye = p.clone().addScaledVector(f, -10);
      eye.y = 6.5;
      target = p.clone().addScaledVector(f, 3);
      horizontalFov = 70;
    } else {
      const points = this.scenario.overviewPoints;
      if (points) {
        const minX = Math.min(...points.map((p) => p.x)),
          maxX = Math.max(...points.map((p) => p.x)),
          minZ = Math.min(...points.map((p) => p.z)),
          maxZ = Math.max(...points.map((p) => p.z)),
          size = Math.max(maxZ - minZ, maxX - minX);
        target = new THREE.Vector3((minX + maxX) / 2, 0, -(minZ + maxZ) / 2);
        eye = target
          .clone()
          .add(
            new THREE.Vector3(-size * 0.65, Math.max(24, size), size * 0.65),
          );
      } else {
        eye = new THREE.Vector3(-15 * (this.scenario.side || 1), 19, 19);
        target = new THREE.Vector3(this.scenario.side || 1, 0, -0.5);
      }
      horizontalFov = 70;
    }
    this.camera.aspect = aspect;
    this.camera.fov = Math.min(
      this.view === 'driver' ? 90 : 150,
      THREE.MathUtils.radToDeg(
        2 *
          Math.atan(
            Math.tan(THREE.MathUtils.degToRad(horizontalFov) / 2) / aspect,
          ),
      ),
    );
    this.camera.position.copy(eye);
    this.camera.lookAt(target);
    this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    return this.camera;
  }
}
