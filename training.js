import {step,collision,result,corners,parkingLandmarks} from './physics.js';

// One measured S manoeuvre, translated only along the road. The safe starting
// interval comes from the complete body sweep against both parked cars.
function overlapInterval(body,obstacle){
  let low=-Infinity,high=Infinity;
  for(const polygon of [body,obstacle])for(let i=0;i<polygon.length;i++){
    const a=polygon[i],b=polygon[(i+1)%polygon.length];
    const axis={x:-(b.z-a.z),z:b.x-a.x};
    const project=p=>p.x*axis.x+p.z*axis.z;
    const aa=body.map(project),bb=obstacle.map(project);
    const minA=Math.min(...aa),maxA=Math.max(...aa),minB=Math.min(...bb),maxB=Math.max(...bb);
    if(Math.abs(axis.z)<1e-9){if(maxA<minB||maxB<minA)return null;continue;}
    const first=(minB-maxA)/axis.z,last=(maxB-minA)/axis.z;
    low=Math.max(low,Math.min(first,last));high=Math.min(high,Math.max(first,last));
    if(low>high)return null;
  }
  return [low,high];
}
export function parkingPlan(scene){
  const path=turningPath(scene);
  if(!path)return null;
  let low=-Infinity,high=Infinity;
  for(const pose of path){
    const body=corners(pose);
    const front=overlapInterval(body,corners(scene.obstacles[0]));
    const rear=overlapInterval(body,corners(scene.obstacles[1]));
    if(front)high=Math.min(high,front[0]);
    if(rear)low=Math.max(low,rear[1]);
  }
  const margin=.025;
  if(!Number.isFinite(low)||!Number.isFinite(high)||high-low<margin*2)return null;
  const startZ=(low+high)/2;
  return {startZ,rearAlignmentExtra:scene.obstacles[0].z-startZ,turnAngle:35,safeStartMin:low+margin,safeStartMax:high-margin,path};
}
function runner(initial){
  let state={...initial};
  const frames=[];
  function run(lessonPhase,gear,steer,brake,until,limit=6000,lessonAction=''){
    if(gear!==state.gear&&Math.abs(state.speed)>1e-9)return false;
    state={...state,gear,steerTarget:steer};
    for(let i=0;i<limit;i++){
      if(until(state))return true;
      const demoInput={throttle:false,brake,slow:true,holdSteering:state.steerTarget===null};
      state=step(state,demoInput,1/120);
      frames.push({...state,lessonPhase,lessonAction,demoInput});
    }
    return false;
  }
  return {run,frames,get state(){return state;}};
}
function turningPath(scene){
  const r=runner({...scene.start,z:0});
  const run=r.run,side=scene.side;
  const stop=(phase,steer,action)=>run(phase,'R',steer,true,s=>s.speed===0,6000,action);
  const aim=(phase,steer,action)=>run(phase,'R',steer,true,s=>s.steer===steer,6000,action);
  if(!aim(2,side,'turn'))return null;
  if(!run(2,'R',side,false,s=>Math.abs(s.angle)>=35*Math.PI/180,6000,'turn')||!stop(2,side,'turn'))return null;
  if(!aim(2,0,'straight'))return null;
  if(!run(2,'R',0,false,s=>parkingLandmarks(s,scene).outerRearWheelToLine>=0,6000,'straight')||!stop(2,0,'straight'))return null;
  if(!aim(3,-side,'countersteer'))return null;
  if(!run(3,'R',-side,false,s=>s.angle*side>=0,6000,'countersteer')||!stop(3,-side,'countersteer')||!aim(3,0,'adjust'))return null;
  return r.frames;
}
export function demonstration(scene){
  const plan=parkingPlan(scene);
  if(!plan)return null;
  const r=runner(scene.start),run=r.run;
  // Include a stopped positioning frame before selecting reverse.
  const frames=[{...scene.start,lessonPhase:0,lessonAction:'position',demoInput:{throttle:false,brake:true,slow:true}}];
  if(!run(1,'R',0,false,s=>s.z<=scene.obstacles[0].z,6000,'align'))return null;
  if(!run(1,'R',0,true,s=>s.speed===0,6000,'align'))return null;
  if(!run(1,'R',0,false,s=>s.z-plan.startZ<=s.speed*s.speed/12,6000,'clearance'))return null;
  if(!run(1,'R',0,true,s=>s.speed===0,6000,'clearance'))return null;
  frames.push(...r.frames);
  const shift=r.state.z;
  for(const pose of plan.path)frames.push({...pose,z:pose.z+shift});
  const end=frames.at(-1),adjust=runner(end),direction=end.z<0?'D':'R';
  if(Math.abs(end.z)>.06){
    if(!adjust.run(3,direction,0,false,s=>Math.abs(s.z)<.04,6000,'adjust'))return null;
    if(!adjust.run(3,direction,0,true,s=>s.speed===0,6000,'adjust'))return null;
    frames.push(...adjust.frames);
  }
  const final=frames.at(-1);
  if(frames.some(s=>collision(s,scene))||!result(final,scene,{hits:0,corrections:1},{exam:true}).passed)return null;
  const demoPlan={rearAlignmentExtra:scene.obstacles[0].z-shift,turnAngle:plan.turnAngle,safeStartMin:plan.safeStartMin,safeStartMax:plan.safeStartMax};
  for(const frame of frames)frame.demoPlan=demoPlan;
  frames.push({...final,gear:'P',lessonPhase:3,lessonAction:'parked',demoPlan,demoInput:{throttle:false,brake:true,slow:true,holdSteering:true}});
  return frames;
}
