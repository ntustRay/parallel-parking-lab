import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceLook} from '../view.js';
const advance=(s,target,seconds,hz=120)=>{for(let i=0;i<Math.round(seconds*hz);i++)s=advanceLook(s,target,1/hz);return s;};
test('head turns smoothly while held and returns after mouse or key release',()=>{
  for(const direction of [-1,1]){
    const start={yaw:0,pitch:0},held={yaw:direction*75*Math.PI/180,held:true};
    const first=advanceLook(start,held,1/120);assert.ok(Math.abs(first.yaw)>0&&Math.abs(first.yaw)<.01);
    const turned=advance(start,held,1.5);assert.ok(Math.abs(turned.yaw)>1.3);
    const released=advanceLook({...turned,pitch:.2},{},1/120);assert.ok(Math.abs(released.yaw)>.9);assert.ok(released.pitch>0&&released.pitch<.2);
    const centred=advance(released,{},3);assert.equal(centred.yaw,0);assert.equal(centred.pitch,0);
  }
});
test('head return agrees across frame rates and never crosses the forward axis',()=>{
  const start={yaw:-1,pitch:.2};
  const states=[30,60,120].map(hz=>advance(start,{},.5,hz));
  for(const s of states){assert.ok(Math.abs(s.yaw-states[2].yaw)<1e-10);assert.ok(s.yaw<0&&s.pitch>0);}
});
