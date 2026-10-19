import {advanceSteering} from './steering.js';
// Metres, seconds, radians. Exterior dimensions: Toyota Taiwan Corolla Altis.
// Axles are centred longitudinally; overhang split and rack tuning are approximations.
export const CAR=Object.freeze({length:4.63,width:1.78,height:1.435,wheelbase:2.7,rear:.965,track:1.53,maxSteer:35*Math.PI/180});
export const DRIVE=Object.freeze({creepForward:1.1,creepReverse:.85,precisionCreep:.55,precisionLimit:.8,forwardLimit:30/3.6,reverseLimit:12/3.6,forwardAcceleration:1.8,reverseAcceleration:1.2,jerk:2.5,brakeDeceleration:6});
export const BAYS=Object.freeze({easy:{length:7,width:2.5},normal:{length:6,width:2.5},hard:{length:5.5,width:2.2}});
export function frontWheelAngles(steer){
  const center=steer*CAR.maxSteer;
  if(Math.abs(center)<1e-9)return {left:0,right:0};
  const radius=CAR.wheelbase/Math.tan(center);
  return {left:Math.atan(CAR.wheelbase/(radius+CAR.track/2)),right:Math.atan(CAR.wheelbase/(radius-CAR.track/2))};
}
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function corners(s,car=CAR){const f={x:Math.sin(s.angle),z:Math.cos(s.angle)},r={x:Math.cos(s.angle),z:-Math.sin(s.angle)};return [[-1,-1],[-1,1],[1,1],[1,-1]].map(([a,b])=>({x:s.x+a*car.width/2*r.x+b*car.length/2*f.x,z:s.z+a*car.width/2*r.z+b*car.length/2*f.z}));}
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
      : speed<creep?Math.min(.65,(creep-speed)*2):-(.18+.06*speed+.006*speed*speed);
    const previous=Number.isFinite(s.acceleration)?s.acceleration*direction:0;
    const acceleration=previous+clamp(requested-previous,-(pedal>0?DRIVE.jerk:8)*dt,(pedal>0?DRIVE.jerk:8)*dt);
    let next=Math.max(0,speed+acceleration*dt);
    if(pedal===0&&speed>=creep)next=Math.max(creep,next);
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
export function scenario(level='normal',side=1){
  const {length,width}=BAYS[level]||BAYS.normal;
  const parkedX=(5-CAR.width/2-.3)*side;
  const obstacleZ=length/2+CAR.length/2+.15;
  return {length,side,curb:5*side,target:{x:(5-width/2)*side,z:0,width,length},obstacles:[{x:parkedX,z:obstacleZ,angle:0},{x:parkedX,z:-obstacleZ,angle:0}],start:{x:.6*side,z:obstacleZ-.1,angle:0,speed:0,acceleration:0,steer:0,steerVelocity:0,steerTarget:null,gear:'P'}};
}
export function collision(s,scene){const p=corners(s);return p.some(v=>v.x*scene.side>=5||v.x*scene.side<=-8||Math.abs(v.z)>24)||scene.obstacles.some(v=>overlap(p,corners(v)));}
export function metrics(s,scene){const p=corners(s),angle=Math.abs(Math.atan2(Math.sin(s.angle),Math.cos(s.angle)))*180/Math.PI;return {angle,curb:5-Math.max(...p.map(v=>v.x*scene.side)),inside:p.every(v=>Math.abs(v.x-scene.target.x)<scene.target.width/2&&Math.abs(v.z)<scene.length/2),stopped:Math.abs(s.speed)<.05};}
// Direction follows the selected gear. S/down is reverse gas in R, brake elsewhere.
export function drivingInput(keys,gear,{gas=false,brake=false,slow=true}={}){
const down=keys.has('s')||keys.has('arrowdown');
return {turn:Number(keys.has('arrowright')||keys.has('d'))-Number(keys.has('arrowleft')||keys.has('a')),throttle:gas||keys.has('w')||keys.has('arrowup')||(gear==='R'&&down),brake:brake||keys.has(' ')||(gear!=='R'&&down),slow};
}
export function result(s,scene,stats,{exam=false}={}){
const m=metrics(s,scene),margin=exam?0:.12,angleLimit=exam?8:12;
const inside=corners(s).every(v=>Math.abs(v.x-scene.target.x)<scene.target.width/2+margin&&Math.abs(v.z)<scene.length/2+margin);
const passed=inside&&m.angle<angleLimit&&m.stopped;
const position=55*clamp(1-Math.hypot((s.x-scene.target.x)/2.5,s.z/(scene.length/2)),0,1);
const alignment=25*clamp(1-m.angle/60,0,1),curb=20*clamp(1-Math.abs(m.curb-(5-Math.abs(scene.target.x)-CAR.width/2))/1.8,0,1);
const penalty=exam?stats.hits*20+Math.max(0,stats.corrections-2)*4:Math.min(16,stats.hits*4)+Math.min(6,Math.max(0,stats.corrections-6));
return {...m,inside,passed,angleLimit,score:Math.max(0,Math.round(position+alignment+curb-penalty)),breakdown:{position:Math.round(position),alignment:Math.round(alignment),curb:Math.round(curb),penalty}};
}


