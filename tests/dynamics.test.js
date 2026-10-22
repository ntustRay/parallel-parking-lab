import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAR,DRIVE,BAYS,scenario,step,frontWheelAngles,corners} from '../physics.js';
import {STEERING_LOCK,STEERING_RATE,STEERING_RETURN_RATE} from '../steering.js';
const advance=(s,input,seconds,rate=120)=>{for(let i=0;i<Math.round(seconds*rate);i++)s=step(s,input,1/rate);return s;};
const car=(gear='D',extra={})=>({...scenario().start,gear,...extra});
test('fixed pedal has a smooth launch and linear acceleration after take-up',()=>{
  const first=step(car(),{throttle:true},1/120);assert.ok(first.acceleration>0&&first.acceleration<.1);
  const a=advance(car(),{throttle:true},1),b=advance(a,{throttle:true},1),c=advance(b,{throttle:true},1);
  assert.ok(Math.abs((c.speed-b.speed)-(b.speed-a.speed))<1e-9);
  assert.ok(Math.abs(b.speed-a.speed-DRIVE.forwardAcceleration)<1e-9);
  const half=advance(car(),{throttle:.5},2);assert.ok(half.speed<b.speed*.65);
});
test('D and R creep without throttle, brake holds at zero, release resumes gently',()=>{
  for(const gear of ['D','R']){
    const direction=gear==='D'?1:-1,creep=gear==='D'?DRIVE.creepForward:DRIVE.creepReverse;
    let s=advance(car(gear),{},10);assert.ok(Math.abs(s.speed-direction*creep)<.001);
    s=advance(s,{brake:true,throttle:true},2);assert.equal(s.speed,0);
    assert.equal(advance(s,{brake:true},3).speed,0);
    const next=step(s,{},1/120);assert.ok(next.speed*direction>0&&Math.abs(next.speed)<.001);
    assert.equal(advance(car('P'),{throttle:true},5).speed,0);
  }
});
test('releasing gas coasts toward creep without stopping or reversing',()=>{
  for(const gear of ['D','R']){
    const a=advance(car(gear),{throttle:true},2),b=advance(a,{},1),c=advance(b,{},30);
    assert.ok(Math.abs(b.speed)<Math.abs(a.speed));assert.ok(Math.abs(b.speed)>.85);
    assert.ok(Math.abs(c.speed-(gear==='D'?DRIVE.creepForward:-DRIVE.creepReverse))<.001);assert.equal(Math.sign(c.speed),Math.sign(a.speed));
  }
});
test('forward/reverse and precision governors preserve continuous speed',()=>{
  for(const gear of ['D','R']){const s=advance(car(gear),{throttle:true},20);assert.equal(Math.abs(s.speed),gear==='D'?DRIVE.forwardLimit:DRIVE.reverseLimit);}
  const fast=car('D',{speed:4}),next=step(fast,{throttle:true,slow:true},1/120);
  assert.ok(next.speed>3.9&&next.speed<4);
  assert.equal(advance(next,{throttle:true,slow:true},10).speed,DRIVE.precisionLimit);
});
test('release returns from small and large angles on both sides, even while parked',()=>{
  for(const gear of ['P','D','R'])for(const steer of [-1,-.2,-.005,.005,.2,1]){
    const initial=car(gear,{steer});
    assert.equal(advance(initial,{holdSteering:true},1).steer,steer);
    const a=step(initial,{},1/120);
    assert.ok(Math.abs(Math.abs(a.steer)-Math.max(0,Math.abs(steer)-STEERING_RETURN_RATE/STEERING_LOCK/120))<1e-12);
    assert.equal(advance(initial,{},.3).steer,0);
    let s=initial;for(let i=0;i<480;i++){const next=step(s,{},1/120);assert.ok(Math.abs(next.steer)<=Math.abs(s.steer));assert.ok(next.steer===0||Math.sign(next.steer)===Math.sign(steer));s=next;}
    assert.equal(s.steer,0);
  }
});

test('idle creep builds gently without a launch surge and is slower than walking',()=>{
  for(const gear of ['D','R']){
    const first=step(car(gear),{},1/120),a=advance(car(gear),{},.5),b=advance(car(gear),{},1),c=advance(car(gear),{},10);
    assert.ok(Math.abs(first.acceleration)<=DRIVE.creepJerk/120+.00001);
    assert.ok(Math.abs(a.speed)*3.6<.25);assert.ok(Math.abs(b.speed)*3.6<.8);
    assert.ok(Math.abs(c.speed)*3.6<=2.35);
  }
});
test('rack takes finite time to travel three turns and X return never snaps',()=>{
  const s=car('P',{steer:-1}),first=step({...s,steerTarget:1},{},1/120);
  assert.ok(first.steer>-1&&first.steer<-.9);
  const lock=advance({...s,steerTarget:1},{},STEERING_LOCK*2/STEERING_RATE);assert.equal(lock.steer,1);
  assert.ok(step(lock,{center:true},1/120).steer>.9);
  assert.equal(advance(lock,{center:true},2).steer,0);
});
test('real dimensions, axle placement and Ackermann wheel paths share one scale',()=>{
  assert.equal(CAR.length,4.4);assert.equal(CAR.width,1.78);assert.equal(CAR.wheelbase,2.64);
  assert.equal(CAR.front+CAR.wheelbase+CAR.rear,CAR.length);
  assert.deepEqual(BAYS.normal,{length:6,width:2.5});
  for(const side of [-1,1]){const sc=scenario('normal',side);assert.equal(sc.target.width,2.5);assert.equal(Math.abs(sc.target.x)+sc.target.width/2,Math.abs(sc.curb));}
  const points=corners({x:0,z:0,angle:0});assert.equal(Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z)),CAR.length);
  assert.deepEqual(frontWheelAngles(0),{left:0,right:0});
  const right=frontWheelAngles(1),left=frontWheelAngles(-1);
  assert.ok(right.right>right.left);assert.equal(right.right,-left.left);
  const rl=CAR.wheelbase/Math.tan(right.left),rr=CAR.wheelbase/Math.tan(right.right);
  assert.ok(Math.abs(rl-rr-CAR.track)<1e-9);
});
test('motion and self-return remain consistent at 30, 60 and 120 Hz',()=>{
  const states=[30,60,120].map(hz=>advance(car('D',{steer:.5}),{throttle:true},2,hz));
  for(const s of states){assert.ok(Math.abs(s.speed-states[2].speed)<.03);assert.ok(Math.hypot(s.x-states[2].x,s.z-states[2].z)<.06);assert.ok(Math.abs(s.steer-states[2].steer)<.01);}
});
