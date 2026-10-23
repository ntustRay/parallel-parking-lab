// DOM measurements live here, outside camera geometry and GPU rendering.
export function overviewLayout(height) {
  const mirrors = [...document.querySelectorAll('.mirror:not(.expanded)')];
  const upper =
    Math.max(0, ...mirrors.map((el) => el.getBoundingClientRect().bottom)) + 14;
  const lower =
    (document.querySelector('footer')?.getBoundingClientRect().top ?? height) -
    14;
  return { upper, lower };
}

export function positionWheel(camera, car, width, height, THREE, CABIN) {
  const local = new THREE.Vector3(CABIN.wheelX, CABIN.wheelY, CABIN.wheelZ)
    .applyAxisAngle(new THREE.Vector3(0, 1, 0), -car.angle)
    .add(new THREE.Vector3(car.x, 0, -car.z));
  const top = local.clone().add(new THREE.Vector3(0, CABIN.wheelRadius, 0));
  const bottom = local.clone().add(new THREE.Vector3(0, -CABIN.wheelRadius, 0));
  const center = local.project(camera),
    a = top.project(camera),
    b = bottom.project(camera);
  const style = document.body.style;
  style.setProperty('--wheel-x', `${((center.x + 1) * width) / 2}px`);
  style.setProperty('--wheel-y', `${((1 - center.y) * height) / 2}px`);
  style.setProperty('--wheel-size', `${(Math.abs(a.y - b.y) * height) / 2}px`);
  style.setProperty(
    '--wheel-visible',
    center.z > -1 && center.z < 1 && Math.abs(center.x) < 1.5
      ? 'visible'
      : 'hidden',
  );
}
