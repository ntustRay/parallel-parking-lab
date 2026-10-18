import {step,collision,result} from './physics.js';
// Produce a real, collision-checked maneuver, never teleporting the vehicle.
// Search is bounded; the demonstration is not used to award practice scores.
export function demonstration(scene){
for(const forward of [0,.4,.8,1.2,1.6,2])for(let angle=.7;angle<1.11;angle+=.02){
let s={...scene.start},frames=[],valid=true;
const run=(gear,steer,input,until,limit=4000)=>{s={...s,gear,steer};for(let i=0;i<limit;i++){if(until(s))return true;const next=step(s,{...input,slow:true},1/120);if(collision(next,scene)){valid=false;return false;}s=next;frames.push({...s});}valid=false;return false;};
if(forward){if(!run('D',0,{throttle:true},v=>v.z>=scene.start.z+forward))continue;if(!run('D',0,{brake:true},v=>v.speed===0))continue;}
if(!run('R',scene.side,{throttle:true},v=>Math.abs(v.angle)>=angle))continue;
if(!run('R',-scene.side,{throttle:true},v=>v.angle*scene.side>=0))continue;
if(!run('R',0,{brake:true},v=>v.speed===0))continue;
if(Math.abs(s.z)>.1){const g=s.z<0?'D':'R';if(!run(g,0,{throttle:true},v=>Math.abs(v.z)<.08))continue;if(!run(g,0,{brake:true},v=>v.speed===0))continue;}
if(valid&&result(s,scene,{hits:0,corrections:1}).passed){frames.push({...s,gear:'P'});return frames;}
}return null;}
