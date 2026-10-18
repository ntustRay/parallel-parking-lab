import {test} from 'node:test';import assert from 'node:assert/strict';
import {pointerDelta,STEERING_LOCK} from '../steering.js';
test('wheel drag crosses the angle seam without jumping to full lock',()=>{assert.equal(pointerDelta(179,-179),2);assert.equal(pointerDelta(-179,179),-2);assert.equal(pointerDelta(0,90),90);assert.equal(STEERING_LOCK,540);});
