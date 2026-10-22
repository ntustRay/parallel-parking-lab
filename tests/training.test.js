import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collision,step} from '../physics.js';
import {createScenario,assess} from '../courses.js';
import {STEERING_RATE,STEERING_RETURN_RATE,STEERING_LOCK} from '../steering.js';
import {demonstration} from '../training.js';

for(const kind of ['parallel','garage','s-curve','uturn-two','uturn-four']){
  test(`${kind} demonstrations finish the actual route on both sides without collisions`,()=>{
    for(const side of [-1,1]){
      const sc=createScenario('normal',side,kind),frames=demonstration(sc);
      assert.ok(frames?.length,'a complete demonstration exists');
      assert.ok(frames.every(s=>!collision(s,sc)),'the full swept body clears the course');
      assert.ok(assess(frames.at(-1),sc,{hits:0,corrections:0},{exam:true}).passed,'finish aligned, stopped and in P');
      for(let i=1;i<frames.length;i++){
        const a=frames[i-1],b=frames[i];
        const centering=Math.abs(b.steer)<Math.abs(a.steer)&&a.steer*b.steer>=0;
        const rate=centering?STEERING_RETURN_RATE:STEERING_RATE;
        assert.ok(Math.abs(b.steer-a.steer)<=rate/STEERING_LOCK/120+1e-9,'finite rack speed');
        assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<.03,'continuous physical movement');
        if(b.gear!==a.gear)assert.equal(a.speed,0,'stop before shifting');
      }
    }
  });
}

test('precision throttle stays within 2.9 km/h',()=>{
  let s={...createScenario().start,gear:'D'};
  for(let i=0;i<1200;i++)s=step(s,{throttle:true,slow:true},1/120);
  assert.ok(s.speed*3.6<=2.9);
});

