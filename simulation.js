import { step, collision } from './physics.js';
import { advanceCourse } from './courses.js';

// No DOM, audio, renderer or storage. The caller consumes collision events.
export function advanceSimulation(state, input, scene, dt) {
  const next = step(state.car, input, dt);
  let { car, hitLatch, lastHitPosition } = state;
  let hit = false;
  if (collision(next, scene)) {
    car = {
      ...car,
      speed: 0,
      acceleration: 0,
      steer: next.steer,
      steerVelocity: next.steerVelocity,
      steerTarget: next.steerTarget,
    };
    if (!hitLatch) {
      hit = true;
      hitLatch = true;
      lastHitPosition = { x: car.x, z: car.z };
    }
  } else {
    car = advanceCourse(car, next, scene);
    if (
      lastHitPosition &&
      Math.hypot(car.x - lastHitPosition.x, car.z - lastHitPosition.z) > 0.12
    ) {
      hitLatch = false;
      lastHitPosition = null;
    }
  }
  return {
    car,
    hitLatch,
    lastHitPosition,
    hit,
    stats: {
      ...state.stats,
      hits: state.stats.hits + Number(hit),
      time: state.stats.time + dt,
    },
  };
}
