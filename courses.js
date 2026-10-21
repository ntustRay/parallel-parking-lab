import {CAR,clamp,scenario,step,collision,metrics,result,proximity} from './physics.js';

const rearOffset=CAR.length/2-CAR.rear;
const rear=s=>({x:s.x-Math.sin(s.angle)*rearOffset,z:s.z-Math.cos(s.angle)*rearOffset});
export const COURSE_NAMES={parallel:'路邊停車',garage:'倒車入庫','s-curve':'S 彎前進／倒退','uturn-two':'雙線道迴轉','uturn-four':'四線道迴轉'};
export function isDrivingCourse(scene){return Boolean(scene.drivingArea);}
export function createScenario(level='normal',side=1,kind='parallel'){
  if(kind==='s-curve')return sCurve(level,side);
  if(kind.startsWith('uturn'))return uTurn(level,side,kind);
  return scenario(level,side,kind);
}
function start(x,z,angle=0){return {x,z,angle,speed:0,acceleration:0,steer:0,steerVelocity:0,steerTarget:null,gear:'P',courseProgress:0,reverseDistance:0};}
function ribbon(points,width){
  const left=[],right=[];
  for(let i=0;i<points.length;i++){
    const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b.x-a.x,b.z-a.z),nx=(b.z-a.z)/d,nz=-(b.x-a.x)/d;
    left.push({x:points[i].x-nx*width/2,z:points[i].z-nz*width/2});right.push({x:points[i].x+nx*width/2,z:points[i].z+nz*width/2});
  }
  return {left,right,polygon:[...left,...right.toReversed()]};
}
function sCurve(level,side){
  const width=({easy:4.4,normal:3.8,hard:3.5})[level]||3.8,R=10,turn=50*Math.PI/180,points=[];
  for(let z=-10;z<0;z+=.25)points.push({x:0,z});
  for(let i=0;i<=80;i++){const a=turn*i/80;points.push({x:R*(1-Math.cos(a)),z:R*Math.sin(a)});}
  const joint=points.at(-1);
  for(let i=1;i<=80;i++){const a=turn*(1-i/80);points.push({x:joint.x+R*(Math.cos(a)-Math.cos(turn)),z:joint.z+R*(Math.sin(turn)-Math.sin(a))});}
  const end={...points.at(-1)};
  for(let z=.25;z<=10;z+=.25)points.push({x:end.x,z:end.z+z});
  for(const p of points)p.x*=side;
  const path=points.filter(p=>p.z>=-5-rearOffset-.01&&p.z<=end.z+5+.01);
  path.unshift({x:0,z:-5-rearOffset});path.push({x:end.x*side,z:end.z+5});
  const edges=ribbon(points,width),target={x:0,z:-5,length:6,width,angle:0};
  const gates=[.24,.5,.76].map(f=>({...path[Math.round((path.length-1)*f)],fraction:f}));
  return {kind:'s-curve',side,length:6,target,start:start(0,-5),parkingBays:[{...target,active:true,number:'START'}],obstacles:[],sideGap:0,
    drivingArea:edges.polygon,overviewPoints:edges.polygon,roadEdges:edges,centerline:points,path,gates,width,turnaround:{x:end.x*side,z:end.z+5+rearOffset},roadLabel:'S CURVE',level};
}
function uTurn(level,side,kind){
  const width=kind==='uturn-two'?6.5:13,half=width/2,lane=3.25,x=(kind==='uturn-four'?4.5:half-lane/2)*side;
  const target={x:-x,z:-12,length:6,width:lane,angle:-Math.PI*side};
  const polygon=[{x:-half,z:-17},{x:half,z:-17},{x:half,z:17},{x:-half,z:17}];
  return {kind,side,length:6,target,start:start(x,-6),parkingBays:[{...target,active:true,number:'FINISH'}],obstacles:[],sideGap:0,
    drivingArea:polygon,overviewPoints:polygon,width,lane,roadLabel:kind==='uturn-two'?'2 LANE TURN':'4 LANE TURN',level};
}
function gateCross(a,b,gate,direction,width){
  const tangent=gate.tangent,sa=(a.x-gate.x)*tangent.x+(a.z-gate.z)*tangent.z,sb=(b.x-gate.x)*tangent.x+(b.z-gate.z)*tangent.z;
  const lateral=Math.abs((b.x-gate.x)*tangent.z-(b.z-gate.z)*tangent.x);
  return direction*sa<=0&&direction*sb>0&&lateral<width/2;
}
function routeGate(scene,index){
  const gate=scene.gates[index];
  if(gate.tangent)return gate;
  // Gate objects are copies; nearest path sample determines its tangent.
  let nearest=0,distance=Infinity;scene.path.forEach((p,j)=>{const d=Math.hypot(p.x-gate.x,p.z-gate.z);if(d<distance){distance=d;nearest=j;}});
  const a=scene.path[Math.max(0,nearest-1)],b=scene.path[Math.min(scene.path.length-1,nearest+1)],d=Math.hypot(b.x-a.x,b.z-a.z);
  gate.tangent={x:(b.x-a.x)/d,z:(b.z-a.z)/d};return gate;
}
export function advanceCourse(previous,next,scene){
  if(!isDrivingCourse(scene))return next;
  let progress=previous.courseProgress||0,reverseDistance=previous.reverseDistance||0;
  const distance=Math.hypot(next.x-previous.x,next.z-previous.z);
  if(scene.kind==='s-curve'){
    const a=rear(previous),b=rear(next);
    if(progress<3&&next.gear==='D'&&gateCross(a,b,routeGate(scene,progress),1,scene.width))progress++;
    else if(progress===3&&next.gear==='R'&&Math.abs(next.speed)<.05&&Math.hypot(next.x-scene.turnaround.x,next.z-scene.turnaround.z)<1.5)progress=4;
    else if(progress>=4&&progress<7&&next.gear==='R'&&gateCross(a,b,routeGate(scene,6-progress),-1,scene.width))progress++;
  }else{
    const turn=-next.angle*scene.side;
    if(progress===0&&next.gear==='D'&&turn>55*Math.PI/180)progress=1;
    if(scene.kind==='uturn-two'){
      if(progress===1&&next.gear==='R')reverseDistance+=distance;
      if(progress===1&&reverseDistance>.5)progress=2;
      if(progress===2&&next.gear==='D'&&turn>165*Math.PI/180)progress=3;
    }else{
      if(progress===1&&next.gear==='D'&&turn>130*Math.PI/180)progress=2;
      if(progress===2&&next.gear==='D'&&turn>165*Math.PI/180)progress=3;
    }
  }
  return {...next,courseProgress:progress,reverseDistance};
}
export function coursePhase(car,scene){
  const p=car.courseProgress||0;
  if(scene.kind==='s-curve')return p<2?0:p<4?1:p<6?2:3;
  if(scene.kind==='uturn-two'&&p===2&&car.gear==='R')return 1;
  return Math.min(3,p);
}
export function courseMetrics(car,scene){const m=metrics(car,scene);return isDrivingCourse(scene)?{...m,curb:proximity(car,scene)}:m;}
export function assess(car,scene,stats,options={}){
  if(!isDrivingCourse(scene))return result(car,scene,stats,options);
  const m=courseMetrics(car,scene),parked=car.gear==='P',angleLimit=options.exam?8:12,needed=scene.kind==='s-curve'?7:3,routeComplete=(car.courseProgress||0)>=needed;
  const position=m.inside?35:Math.round(35*clamp(1-Math.hypot(car.x-scene.target.x,car.z-scene.target.z)/15,0,1));
  const route=Math.round(40*Math.min(needed,car.courseProgress||0)/needed),alignment=Math.round(25*clamp(1-m.angle/60,0,1));
  const penalty=stats.hits*(options.exam?20:4)+Math.max(0,stats.corrections-(scene.kind==='uturn-two'?4:2))*2;
  return {...m,parked,angleLimit,routeComplete,passed:m.inside&&m.stopped&&parked&&m.angle<angleLimit&&routeComplete&&(!options.exam||stats.hits===0),score:Math.max(0,position+route+alignment-penalty),breakdown:{position,alignment,curb:route,penalty}};
}
function recorder(scene){
  let state={...scene.start},failed=false;const frames=[{...state,lessonPhase:0,demoInput:{brake:true,slow:true}}];
  const push=(gear,steer,brake,throttle=false)=>{
    const input={brake,throttle,slow:true,holdSteering:false};
    const next=step({...state,gear,steerTarget:steer},input,1/120);
    if(collision(next,scene)){failed=true;return false;}
    state=advanceCourse(state,next,scene);
    frames.push({...state,lessonPhase:coursePhase(state,scene),lessonAction:gear==='R'?'reverse':brake?'stop':'forward',demoInput:input});return true;
  };
  const stop=(gear,steer)=>{for(let i=0;i<200&&(state.speed!==0||Math.abs(state.steer-steer)>.001);i++)if(!push(gear,steer,true))return false;return true;};
  const park=()=>{stop(state.gear,0);push('P',0,true);return failed?null:frames;};
  return {push,stop,park,frames,get state(){return state;},get failed(){return failed;}};
}
export function courseDemonstration(scene){return scene.kind==='s-curve'?sDemonstration(scene):turnDemonstration(scene);}
function sDemonstration(scene){
  const r=recorder(scene),path=scene.path;
  for(const direction of [1,-1]){
    const gear=direction>0?'D':'R';let nearest=direction>0?0:path.length-1;
    for(let i=0;i<30000;i++){
      const p=rear(r.state);
      let best=Infinity,bestI=nearest;
      for(let j=Math.max(0,nearest-12);j<=Math.min(path.length-1,nearest+12);j++){const d=Math.hypot(p.x-path[j].x,p.z-path[j].z);if(d<best){best=d;bestI=j;}}
      nearest=bestI;
      const end=path[direction>0?path.length-1:0],remaining=Math.hypot(p.x-end.x,p.z-end.z);
      if((direction>0?nearest>path.length-10:nearest<10)&&remaining<.07)break;
      let look=nearest,total=0;
      while(look+direction>=0&&look+direction<path.length&&total<2.1){total+=Math.hypot(path[look+direction].x-path[look].x,path[look+direction].z-path[look].z);look+=direction;}
      const target=path[look],dx=target.x-p.x,dz=target.z-p.z,localX=dx*Math.cos(r.state.angle)-dz*Math.sin(r.state.angle),d2=dx*dx+dz*dz;
      const steer=clamp(Math.atan(CAR.wheelbase*2*localX/Math.max(.1,d2))/CAR.maxSteer,-1,1);
      if(!r.push(gear,steer,false,true))return null;
      if(i===29999)return null;
    }
    if(!r.stop(gear,0))return null;
    if(direction>0&&!r.push('R',0,true))return null;
  }
  return r.park();
}
function turnDemonstration(scene){
  const r=recorder(scene),side=scene.side;
  // Position at the open turning area before turning; every frame uses step().
  while(r.state.z<0)if(!r.push('D',0,false,true))return null;
  if(!r.stop('D',0))return null;
  const wide=scene.kind==='uturn-four',radius=Math.abs(scene.start.x),steer=wide?-side*Math.atan(CAR.wheelbase/radius)/CAR.maxSteer:-side;
  let gear='D';
  for(let segment=0;segment<9;segment++){
    const steering=gear==='D'?steer:-steer;
    if(!r.stop(gear,steering))return null;
    for(let i=0;i<12000;i++){
      if(-r.state.angle*side>=Math.PI-.012)break;
      const preview=step({...r.state,gear,steer:steering,steerTarget:steering},{brake:false,throttle:false,slow:true,holdSteering:true},1/30);
      // Begin braking while there is room for the full stopping distance.
      if(proximity(preview,scene)<.18&&proximity(preview,scene)<proximity(r.state,scene)-1e-7&&Math.abs(r.state.speed)>.01)break;
      if(!r.push(gear,steering,false,true))return null;
      if(i===11999)return null;
    }
    if(!r.stop(gear,steering))return null;
    if(-r.state.angle*side>=Math.PI-.012)break;
    gear=gear==='D'?'R':'D';
  }
  if(-r.state.angle*side<Math.PI-.04)return null;
  if(!r.stop(gear,0))return null;
  // Final lane alignment at low speed using a forward pure-pursuit target.
  if(gear==='R')gear='D';
  for(let i=0;i<12000;i++){
    const s=r.state,target=scene.target;
    if(s.z<=target.z+.06)break;
    const p=rear(s),dx=target.x-p.x,dz=-3,localX=dx*Math.cos(s.angle)-dz*Math.sin(s.angle),d2=dx*dx+dz*dz;
    const aim=clamp(Math.atan(CAR.wheelbase*2*localX/Math.max(.1,d2))/CAR.maxSteer,-1,1);
    if(!r.push('D',aim,false,true))return null;
    if(i===11999)return null;
  }
  return r.park();
}

export function drivingLesson(car,scene){
  const phase=coursePhase(car,scene),s=scene.kind==='s-curve',narrow=scene.kind==='uturn-two';
  const lessons=s?[
    ['D 檔前進，沿彎道看遠處','先確認前方，踩煞車排 D。低速進第一彎，視線看向彎道出口；逐漸轉向，讓車頭與後輪都留在路緣內。'],
    ['通過第二彎，到末端停穩','接續反向轉彎、回正進入末端等待區。停穩後排 R；到達末端才換倒車，必須完整通過兩彎。'],
    ['R 檔沿原路慢慢倒回','交替觀察左右與中央後視鏡，先退第二彎、再退第一彎。轉向以車尾位置判斷，車頭外甩也不能越過路緣。'],
    ['倒回起點，回正停妥','沿原路退回 START 標線內，確認車身四角與方向。踩煞車、排 P，按 E 完成；往返順序會一起評分。']
  ]:narrow?[
    ['雙線道，先觀察再前進','這是封閉訓練場的 6.5 m 雙線道。確認兩向、後方與路緣，停穩排 D，低速向對側打方向；留意車頭外甩。'],
    ['接近對側，停穩再倒車','車頭接近路緣前先煞停，排 R 並反向轉動方向盤，觀察後方慢慢倒退，保留車尾空間。'],
    ['再次前進，接續完成迴轉','倒退騰出空間後停穩，排 D 並轉回迴轉方向。可以再前後修正，不能碰路緣；換檔前先停穩。'],
    ['回到反向車道，直行停妥','車頭方向已反轉，回正沿反向車道前進至 FINISH。車身完全進框、煞停排 P，再按 E 完成。']
  ]:[
    ['四線道，確認兩向與後方','這是封閉訓練場的 13 m 四線道。先確認周圍，停穩排 D，沿起點車道前進到開放迴轉區。'],
    ['向對向車道平順轉入','低速持續轉向，交替觀察車頭與後輪的路緣距離。四線道空間較寬，可以平順完成大迴轉。'],
    ['接近反向，逐漸回正','看到反向車道出口後逐漸減少轉角；留意車頭外甩與後輪內輪差，不要搶著加速。'],
    ['沿反向車道停妥','回正後繼續沿反向車道進入 FINISH，完整入框、煞停排 P，再按 E 完成。']
  ];
  return {title:lessons[phase][0],text:lessons[phase][1],landmark:s?`順序進度 ${Math.min(7,car.courseProgress||0)} / 7 · ${scene.width.toFixed(1)} m 道寬 · ${car.courseProgress>=4?'倒退回程':'前進去程'}`:`${narrow?'雙線道 6.5':'四線道 13.0'} m · 已轉向 ${Math.min(180,Math.max(0,-car.angle*scene.side*180/Math.PI)).toFixed(0)}°`,scale:`練習車 ${CAR.length.toFixed(2)} × ${CAR.width.toFixed(2)} m · 道路 ${scene.width.toFixed(1)} m`,clearanceLabel:'最近路緣',angleLabel:s?'起點方向差':'反向方向差'};
}
