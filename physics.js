import {advanceSteering} from './steering.js';
// Metres, seconds, radians. A compact practice sedan, not a measured car model.
// Body, wheelbase, overhangs, collision and demonstrations share this geometry.
export const CAR=Object.freeze({length:4.4,width:1.78,height:1.435,wheelbase:2.64,front:.84,rear:.92,track:1.53,maxSteer:35*Math.PI/180});
export const DRIVE=Object.freeze({creepForward:.65,creepReverse:.5,precisionCreep:.4,creepAcceleration:.28,creepJerk:.45,precisionLimit:.8,forwardLimit:30/3.6,reverseLimit:12/3.6,forwardAcceleration:1.8,reverseAcceleration:1.2,jerk:2.5,brakeDeceleration:6});
// Two 3.25 m lanes, with a 2.6 m practice parking strip on each side.
export const ROAD=Object.freeze({laneWidth:3.25,parkingWidth:2.6,curb:5,oppositeCurb:-6.7,divider:-.85,curbHeight:.15,sidewalkWidth:3.5});
export const BAYS=Object.freeze({normal:{length:6,width:2.5},compact:{length:5.5,width:2.5},tight:{length:5,width:2.3}});
export function frontWheelAngles(steer){
  const center=steer*CAR.maxSteer;
  if(Math.abs(center)<1e-9)return {left:0,right:0};
  const radius=CAR.wheelbase/Math.tan(center);
  return {left:Math.atan(CAR.wheelbase/(radius+CAR.track/2)),right:Math.atan(CAR.wheelbase/(radius-CAR.track/2))};
}
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// The visible bumpers and the collision envelope share the same tapered plan.
// z is forward in simulation coordinates; the renderer reverses this axis.
export function bodyHalfWidth(z,car=CAR){
  const half=car.length/2,w=car.width/2;
  return w-Math.max(0,(z-(half-.42))/.42)*.16-Math.max(0,(-z-(half-.34))/.34)*.14;
}
export function corners(s,car=CAR){
  const f={x:Math.sin(s.angle),z:Math.cos(s.angle)},r={x:Math.cos(s.angle),z:-Math.sin(s.angle)},half=car.length/2;
  const outline=[[-1,-half],[-1,-half+.34],[-1,half-.42],[-1,half],[1,half],[1,half-.42],[1,-half+.34],[1,-half]];
  return outline.map(([side,z])=>{const x=side*bodyHalfWidth(z,car);return {x:s.x+x*r.x+z*f.x,z:s.z+x*r.z+z*f.z};});
}
export function overlap(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const j=(i+1)%p.length,axis={x:-(p[j].z-p[i].z),z:p[j].x-p[i].x};const project=q=>q.map(v=>v.x*axis.x+v.z*axis.z),aa=project(a),bb=project(b);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;}return true;}
export function step(s,input,dt){
  dt=clamp(dt,0,1/30);
  if(dt===0)return {...s};
  const t={...s,...advanceSteering(s,input,dt)};
  const direction=s.gear==='D'?1:s.gear==='R'?-1:0;
  const pedal=clamp(Number(input.throttle)||0,0,1);
  const braking=Boolean(input.brake)||!direction;
  const speed=Math.abs(s.speed);
  if(braking||s.speed*direction<0){
    t.speed=speed<=DRIVE.brakeDeceleration*dt?0:Math.sign(s.speed)*(speed-DRIVE.brakeDeceleration*dt);
    t.acceleration=t.speed===0?0:(t.speed-s.speed)/dt;
  }else{
    const limit=input.slow?DRIVE.precisionLimit:direction>0?DRIVE.forwardLimit:DRIVE.reverseLimit;
    const creep=input.slow?DRIVE.precisionCreep:direction>0?DRIVE.creepForward:DRIVE.creepReverse;
    // Fixed pedal gives constant acceleration below the speed governor.
    // Released pedal coasts down to creep, rather than stopping automatically.
    const requested=pedal>0
      ? (direction>0?DRIVE.forwardAcceleration:DRIVE.reverseAcceleration)*pedal
      : speed<creep?Math.min(DRIVE.creepAcceleration,(creep-speed)*.8):-(.18+.06*speed+.006*speed*speed);
    const rawPrevious=Number.isFinite(s.acceleration)?s.acceleration*direction:0;
    const previous=pedal===0&&speed>=creep?Math.min(0,rawPrevious):rawPrevious;
    const jerk=pedal>0?DRIVE.jerk:speed<creep?DRIVE.creepJerk:4;
    const acceleration=previous+clamp(requested-previous,-jerk*dt,jerk*dt);
    let next=Math.max(0,speed+acceleration*dt);
    if(pedal===0)next=speed>=creep?Math.max(creep,next):Math.min(creep,next);
    // A speed governor slows down progressively when precision mode is enabled.
    if(speed<=limit)next=Math.min(limit,next);
    else next=Math.max(limit,speed-Math.max(.8,-acceleration)*dt);
    t.speed=direction*next;
    t.acceleration=(t.speed-s.speed)/dt;
  }
  const distance=(s.speed+t.speed)*.5*dt;
  if(distance===0)return t;
  const curvature=Math.tan((s.steer+t.steer)*.5*CAR.maxSteer)/CAR.wheelbase;
  const offset=CAR.length/2-CAR.rear;
  let rx=s.x-Math.sin(s.angle)*offset,rz=s.z-Math.cos(s.angle)*offset;
  t.angle=s.angle+distance*curvature;
  if(Math.abs(curvature)<1e-9){rx+=Math.sin(s.angle)*distance;rz+=Math.cos(s.angle)*distance;}
  else{rx+=(Math.cos(s.angle)-Math.cos(t.angle))/curvature;rz+=(Math.sin(t.angle)-Math.sin(s.angle))/curvature;}
  t.x=rx+Math.sin(t.angle)*offset;t.z=rz+Math.cos(t.angle)*offset;
  return t;
}
export function scenario(level='normal',side=1,kind='parallel'){
  if(kind==='garage')return garageScenario(level,side);
  const {length,width}=BAYS[level]||BAYS.normal;
  const parkedX=(ROAD.curb-width/2)*side,obstacleZ=length,sideGap=.5;
  const target={x:parkedX,z:0,width,length,angle:0};
  const parkingBays=[obstacleZ,0,-obstacleZ].map((z,i)=>({...target,z,active:i===1,number:String(i+1).padStart(2,'0')}));
  return {kind:'parallel',length,side,sideGap,curb:ROAD.curb*side,target,parkingBays,obstacles:[{x:parkedX,z:obstacleZ,angle:0},{x:parkedX,z:-obstacleZ,angle:0}],start:{x:parkedX-(CAR.width+sideGap)*side,z:obstacleZ,angle:0,speed:0,acceleration:0,steer:0,steerVelocity:0,steerTarget:null,gear:'P'}};
}
function garageScenario(level,side){
  const {length,width}=({easy:{length:5.5,width:2.8},normal:{length:5.5,width:2.5},hard:{length:5.2,width:2.4}})[level]||{length:5.5,width:2.5};
  const angle=-side*Math.PI/2,target={x:(2.4+length/2)*side,z:0,width,length,angle};
  return {kind:'garage',length,side,sideGap:2.4-.1-CAR.width/2,curb:(2.8+length)*side,
    bounds:{minX:-6.7,maxX:2.8+length,maxZ:16},target,
    parkingBays:[width+.35,0,-width-.35].map((z,i)=>({...target,z,active:i===1,number:String(i+1).padStart(2,'0')})),
    obstacles:[{x:target.x,z:width+.35,angle},{x:target.x,z:-width-.35,angle}],
    start:{x:.1*side,z:7,angle:0,speed:0,acceleration:0,steer:0,steerVelocity:0,steerTarget:null,gear:'P'}};
}
export function parkingLandmarks(car,scene){
  const offset=CAR.length/2-CAR.rear;
  const rearAxleX=car.x-Math.sin(car.angle)*offset;
  const rearAxleZ=car.z-Math.cos(car.angle)*offset;
  const outerRearWheelX=rearAxleX*scene.side-CAR.track/2*Math.cos(car.angle);
  const outerLine=ROAD.curb-scene.target.width;
  const frontRearZ=scene.obstacles[0].z-CAR.length/2;
  return {rearAlignment:car.z-CAR.length/2*Math.cos(car.angle)-frontRearZ,rearAxleAlignment:rearAxleZ-frontRearZ,outerRearWheelX,outerRearWheelToLine:outerRearWheelX-outerLine,targetAngle:35,sideGap:scene.sideGap};
}
export function collision(s,scene){const p=corners(s),bounds=scene.bounds||{minX:ROAD.oppositeCurb,maxX:ROAD.curb,maxZ:24};return p.some(v=>v.x*scene.side>=bounds.maxX||v.x*scene.side<=bounds.minX||Math.abs(v.z)>bounds.maxZ)||scene.obstacles.some(v=>overlap(p,corners(v)));}
export function targetPosition(point,scene){
  const dx=point.x-scene.target.x,dz=point.z-scene.target.z,a=scene.target.angle||0;
  return {x:dx*Math.cos(a)-dz*Math.sin(a),z:dx*Math.sin(a)+dz*Math.cos(a)};
}
function insideBay(s,scene,margin=0){return corners(s).every(point=>{const p=targetPosition(point,scene);return Math.abs(p.x)<scene.target.width/2+margin&&Math.abs(p.z)<scene.length/2+margin;});}
function pointSegment(point,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=clamp(((point.x-a.x)*dx+(point.z-a.z)*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(point.x-a.x-t*dx,point.z-a.z-t*dz);}
export function proximity(s,scene){
  const p=corners(s),bounds=scene.bounds||{minX:ROAD.oppositeCurb,maxX:ROAD.curb,maxZ:24};
  let distance=Math.min(...p.flatMap(v=>[v.x*scene.side-bounds.minX,bounds.maxX-v.x*scene.side,bounds.maxZ-Math.abs(v.z)]));
  for(const obstacle of scene.obstacles){
    const q=corners(obstacle);if(overlap(p,q))return 0;
    for(const [vertices,edges] of [[p,q],[q,p]])for(const point of vertices)for(let i=0;i<edges.length;i++)distance=Math.min(distance,pointSegment(point,edges[i],edges[(i+1)%edges.length]));
  }
  return Math.max(0,distance);
}
export function metrics(s,scene){const p=corners(s),delta=s.angle-(scene.target.angle||0),angle=Math.abs(Math.atan2(Math.sin(delta),Math.cos(delta)))*180/Math.PI;return {angle,curb:(scene.bounds?.maxX??ROAD.curb)-Math.max(...p.map(v=>v.x*scene.side)),inside:insideBay(s,scene),stopped:Math.abs(s.speed)<.05};}
// The selected gear controls direction; pedal keys never change meaning.
export function drivingInput(keys,gear,{gas=false,brake=false,slow=true}={}){
const down=keys.has('s')||keys.has('arrowdown');
return {turn:Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),throttle:gas||keys.has('w')||keys.has('arrowup'),brake:brake||keys.has(' ')||down,slow};
}
export function result(s,scene,stats,{exam=false}={}){
const m=metrics(s,scene),margin=exam?0:.12,angleLimit=exam?8:12;
const inside=insideBay(s,scene,margin);
const parked=s.gear==='P',passed=inside&&m.angle<angleLimit&&m.stopped&&parked;
const local=targetPosition(s,scene),position=55*clamp(1-Math.hypot(local.x/2.5,local.z/(scene.length/2)),0,1);
const desiredClearance=scene.kind==='garage'?scene.bounds.maxX-Math.abs(scene.target.x)-CAR.length/2:ROAD.curb-Math.abs(scene.target.x)-CAR.width/2;
const alignment=25*clamp(1-m.angle/60,0,1),curb=20*clamp(1-Math.abs(m.curb-desiredClearance)/1.8,0,1);
const penalty=exam?stats.hits*20+Math.max(0,stats.corrections-2)*4:Math.min(16,stats.hits*4)+Math.min(6,Math.max(0,stats.corrections-6));
return {...m,inside,parked,passed,angleLimit,score:Math.max(0,Math.round(position+alignment+curb-penalty)),breakdown:{position:Math.round(position),alignment:Math.round(alignment),curb:Math.round(curb),penalty}};
}


