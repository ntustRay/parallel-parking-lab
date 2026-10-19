// 3 turns lock-to-lock; a generic assisted passenger-car rack, not measured Altis EPS.
export const STEERING_LOCK=540;
export const STEERING_RATE=450; // handwheel degrees / second
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function advanceSteering(s,input,dt){
  let steer=s.steer,steerVelocity=s.steerVelocity||0,steerTarget=s.steerTarget??null;
  const turn=clamp(input.turn||0,-1,1),rate=STEERING_RATE/STEERING_LOCK;
  if(turn){steer=clamp(steer+turn*rate*dt,-1,1);steerVelocity=0;steerTarget=null;}
  else if(input.holdSteering){steerVelocity=0;steerTarget=null;}
  else if(input.center||steerTarget!==null){
    const target=input.center?0:steerTarget;
    steer+=clamp(target-steer,-rate*dt,rate*dt);steerVelocity=0;
    if(Math.abs(target-steer)<1e-9){steer=target;steerTarget=null;}
  }else{
    // Release assist at every angle and speed: accelerate gently toward centre.
    // Integrate the ramp and capped speed exactly, without crossing the centre.
    const sign=Math.sign(steer),acceleration=.55,maxSpeed=.85;
    const v=Math.max(0,-sign*steerVelocity),ramp=Math.min(dt,Math.max(0,(maxSpeed-v)/acceleration));
    const nextSpeed=Math.min(maxSpeed,v+acceleration*dt);
    const distance=v*ramp+acceleration*ramp*ramp/2+maxSpeed*(dt-ramp);
    if(distance>=Math.abs(steer)){steer=0;steerVelocity=0;}
    else{steer-=sign*distance;steerVelocity=-sign*nextSpeed;}
  }
  return {steer,steerVelocity,steerTarget};
}
export function pointerDelta(previous,current){let delta=current-previous;while(delta>180)delta-=360;while(delta<-180)delta+=360;return delta;}
export function bindSteering(element,getSteer,setSteer,setHeld=()=>{}){
  let previous=null;
  const angle=e=>{const r=element.getBoundingClientRect();return Math.atan2(e.clientY-r.y-r.height/2,e.clientX-r.x-r.width/2)*180/Math.PI;};
  element.addEventListener('pointerdown',e=>{e.preventDefault();element.setPointerCapture(e.pointerId);previous=angle(e);setHeld(true);element.classList.add('dragging');});
  element.addEventListener('pointermove',e=>{if(previous===null)return;const next=angle(e);setSteer(getSteer()+pointerDelta(previous,next)/STEERING_LOCK);previous=next;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,()=>{previous=null;setHeld(false);element.classList.remove('dragging');});
}

