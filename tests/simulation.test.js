import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimulation } from '../simulation.js';
import { createScenario, advanceCourse } from '../courses.js';
import { step, collision } from '../physics.js';

test('extracted simulation preserves the existing fixed-step motion without mutating input state', () => {
  const scene = createScenario(),
    input = { throttle: true, slow: true, turn: 0.2 };
  let car = { ...scene.start, gear: 'D' },
    state = {
      car,
      stats: { hits: 0, corrections: 0, time: 0 },
      hitLatch: false,
      lastHitPosition: null,
    };
  const original = structuredClone(state);
  for (let i = 0; i < 120; i++) {
    const next = step(car, input, 1 / 120);
    assert.equal(collision(next, scene), false);
    car = advanceCourse(car, next, scene);
    state = advanceSimulation(state, input, scene, 1 / 120);
  }
  assert.deepEqual(state.car, car);
  assert.deepEqual(original.car, { ...scene.start, gear: 'D' });
  assert.ok(Math.abs(state.stats.time - 1) < 1e-10);
});

test('continuous contact emits one hit and keeps collision geometry out of rendering', () => {
  const scene = createScenario(),
    obstacle = scene.obstacles[0];
  let state = {
    car: {
      ...scene.start,
      x: obstacle.x,
      z: obstacle.z,
      gear: 'D',
      speed: 0.5,
    },
    stats: { hits: 0, corrections: 0, time: 0 },
    hitLatch: false,
    lastHitPosition: null,
  };
  const first = advanceSimulation(state, { throttle: true }, scene, 1 / 120);
  const second = advanceSimulation(first, { throttle: true }, scene, 1 / 120);
  assert.equal(first.hit, true);
  assert.equal(second.hit, false);
  assert.equal(second.stats.hits, 1);
  assert.equal(second.car.speed, 0);
  assert.equal(state.stats.hits, 0);
});
