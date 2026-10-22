import {test} from 'node:test';
import assert from 'node:assert/strict';
import {CAR,drivingInput,step,scenario,result} from '../physics.js';
test('W/up is gas and S/down/space brakes in every gear, including reverse',()=>{
for(const gear of ['P','D','R']){
  for(const key of ['s','arrowdown',' ']){
    const input=drivingInput(new Set([key]),gear);assert.equal(input.throttle,false);assert.equal(input.brake,true);
    const initial={...scenario().start,gear,speed:gear==='R'?-.5:.5};
    assert.ok(Math.abs(step(initial,input,1/120).speed)<.5);
    assert.equal(step({...initial,speed:0},input,1/120).speed,0);
  }
  for(const key of ['w','arrowup']){
    const input=drivingInput(new Set([key]),gear);assert.equal(input.throttle,true);assert.equal(input.brake,false);
    const next=step({...scenario().start,gear},input,1/120);
    assert.equal(Math.sign(next.speed),gear==='D'?1:gear==='R'?-1:0);
    assert.equal(step({...next,speed:0},drivingInput(new Set([key,'s']),gear),1/120).speed,0);
  }
}
});
test('practice gives geometry feedback outside the bay without claiming a pass',()=>{
const sc=scenario(),stats={hits:0,corrections:0};
const near=result({x:3.2,z:0,angle:0,speed:0},sc,stats);
const far=result(sc.start,sc,stats);
assert.ok(near.score>far.score);assert.ok(near.score>0);assert.equal(near.passed,false);
});
test('practice accepts a small line margin while exam keeps strict containment',()=>{
const sc=scenario(),s={x:sc.target.x-sc.target.width/2+CAR.width/2-.06,z:0,angle:0,speed:0,gear:'P'},stats={hits:0,corrections:0};
assert.equal(result(s,sc,stats).passed,true);assert.equal(result(s,sc,stats,{exam:true}).passed,false);
});

