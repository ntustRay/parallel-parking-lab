import {test} from 'node:test';
import assert from 'node:assert/strict';
import {drivingInput,step,scenario,result} from '../physics.js';
test('S and down accelerate backwards only in R; space always brakes',()=>{
for(const key of ['s','arrowdown']){
const reverse=drivingInput(new Set([key]),'R');assert.ok(reverse.throttle);assert.equal(reverse.brake,false);
assert.ok(step({...scenario().start,gear:'R'},reverse,1/120).speed<0);
assert.ok(drivingInput(new Set([key]),'D').brake);
assert.ok(drivingInput(new Set([key,' ']),'R').brake);
}
});
test('practice gives geometry feedback outside the bay without claiming a pass',()=>{
const sc=scenario(),stats={hits:0,corrections:0};
const near=result({x:3.2,z:0,angle:0,speed:0},sc,stats);
const far=result(sc.start,sc,stats);
assert.ok(near.score>far.score);assert.ok(near.score>0);assert.equal(near.passed,false);
});
test('practice accepts a small line margin while exam keeps strict containment',()=>{
const sc=scenario(),s={x:3.34,z:0,angle:0,speed:0},stats={hits:0,corrections:0};
assert.equal(result(s,sc,stats).passed,true);assert.equal(result(s,sc,stats,{exam:true}).passed,false);
});

