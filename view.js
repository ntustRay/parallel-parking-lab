// Analytic damped head motion. Input holds a target; release returns to forward.
export function advanceLook(state,target,dt){
  const omega=target.held?7:5.5,next={};
  for(const axis of ['yaw','pitch']){
    const goal=target[axis]||0,offset=state[axis]-goal,velocity=state[axis+'Velocity']||0;
    const c=velocity+omega*offset,decay=Math.exp(-omega*dt);
    next[axis]=goal+(offset+c*dt)*decay;
    next[axis+'Velocity']=(velocity-omega*c*dt)*decay;
    if(Math.abs(next[axis]-goal)<.0001&&Math.abs(next[axis+'Velocity'])<.001){next[axis]=goal;next[axis+'Velocity']=0;}
  }
  return next;
}
