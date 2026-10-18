export const STEERING_LOCK=540;
export function pointerDelta(previous,current){let delta=current-previous;while(delta>180)delta-=360;while(delta<-180)delta+=360;return delta;}
export function bindSteering(element,getSteer,setSteer){
  let previous=null;
  const angle=e=>{const r=element.getBoundingClientRect();return Math.atan2(e.clientY-r.y-r.height/2,e.clientX-r.x-r.width/2)*180/Math.PI;};
  element.addEventListener('pointerdown',e=>{e.preventDefault();element.setPointerCapture(e.pointerId);previous=angle(e);element.classList.add('dragging');});
  element.addEventListener('pointermove',e=>{if(previous===null)return;const next=angle(e);setSteer(getSteer()+pointerDelta(previous,next)/STEERING_LOCK);previous=next;});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,()=>{previous=null;element.classList.remove('dragging');});
}
