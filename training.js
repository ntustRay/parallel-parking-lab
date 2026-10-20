import {step,collision,result} from './physics.js';

// These bounded geometric parameters are not calibrated window/mirror sightlines.
// Every displayed frame is integrated and collision checked; no pose is assigned.
export function demonstration(scene){
  for(const initialReverse of [.4,.6,.8,1,1.2,1.4]){
    for(const straightReverse of [.3,.5,.7,.9,1.1,1.3]){
      for(let angle=.34;angle<=.86;angle+=.02){
        let s={...scene.start};
        const frames=[];
        const run=(lessonPhase,gear,steer,pedals,until,limit=2400)=>{
          if(gear!==s.gear&&s.speed!==0)return false;
          s={...s,gear,steerTarget:steer};
          for(let i=0;i<limit;i++){
            if(until(s))return true;
            const demoInput={throttle:false,brake:false,...pedals,slow:true,holdSteering:s.steerTarget===null};
            const next=step(s,demoInput,1/120);
            if(collision(next,scene))return false;
            s=next;
            frames.push({...s,lessonPhase,demoInput});
          }
          return false;
        };
        const stop=(phase,steer)=>run(phase,'R',steer,{brake:true},v=>v.speed===0);
        const steerStopped=(phase,steer)=>run(phase,'R',steer,{brake:true},v=>v.steer===steer);
        if(!run(0,'R',0,{throttle:true},v=>scene.start.z-v.z>=initialReverse))continue;
        if(!stop(0,0)||!steerStopped(1,scene.side))continue;
        if(!run(1,'R',scene.side,{throttle:true},v=>Math.abs(v.angle)>=angle))continue;
        if(!stop(1,scene.side)||!steerStopped(1,0))continue;
        const straightStart={x:s.x,z:s.z};
        if(!run(2,'R',0,{throttle:true},v=>Math.hypot(v.x-straightStart.x,v.z-straightStart.z)>=straightReverse))continue;
        if(!stop(2,0)||!steerStopped(3,-scene.side))continue;
        if(!run(3,'R',-scene.side,{throttle:true},v=>v.angle*scene.side>=0))continue;
        if(!stop(3,-scene.side)||!steerStopped(3,0))continue;
        if(Math.abs(s.z)>.1){
          const gear=s.z<0?'D':'R';
          if(!run(4,gear,0,{throttle:true},v=>Math.abs(v.z)<.08))continue;
          if(!run(4,gear,0,{brake:true},v=>v.speed===0))continue;
        }
        const parked=result(s,scene,{hits:0,corrections:1},{exam:true});
        if(parked.passed&&parked.curb>=.2){
          frames.push({...s,gear:'P',lessonPhase:4,demoInput:{throttle:false,brake:true,slow:true,holdSteering:true}});
          return frames;
        }
      }
    }
  }
  return null;
}

