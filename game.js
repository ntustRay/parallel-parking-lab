import {createScenario as scenario,courseMetrics as metrics,assess as result,advanceCourse,isDrivingCourse,COURSE_NAMES} from './courses.js';
import {GameAudio} from './audio.js';
import {bindShortcuts,editingTarget} from './shortcuts.js';
import {lessonProgress,lessonContent,observationYaw} from './lessons.js';
import {advanceLook} from './view.js';
import {demonstration,parkingPlan} from './training.js';
import {bindSteering,STEERING_LOCK} from './steering.js';
import {Renderer} from './renderer.js';import {step,collision,clamp,drivingInput,CAR,proximity} from './physics.js';
window.parkingBoot?.stage('正在建立車輛、道路與後視鏡…');
const audio=new GameAudio();
const $=id=>document.getElementById(id),render=new Renderer($('world')),rearRender=new Renderer($('rear-view')),keys=new Set(),input={turn:0,throttle:false,brake:false},views=['driver','orbit','top','chase'];let scene=scenario(),car={...scene.start},stats={hits:0,corrections:0,time:0},started=false,exam=false,finished=false,lastDirection=null,touchGas=false,touchBrake=false,steeringHeld=false,hitLatch=false,toastUntil=0,history=[],demoFrames=null,demoIndex=0,demonstrated=false,lastHitPosition=null;
let hazards=false,hazardLit=false,readyNotified=false;
let lastPicture='',lastPictureAt=0,manualLessonPhase=0,demoPaused=false,observingLesson=false,rearCameraOpen=false,lessonPlan=parkingPlan(scene);
let savedSettings=null;
try{history=JSON.parse(localStorage.getItem('parking-lab-history')||'[]');if(!Array.isArray(history))history=[];history=history.filter(h=>h&&typeof h.passed==='boolean'&&Number.isFinite(h.score)&&COURSE_NAMES[h.exercise]);const saved=JSON.parse(localStorage.getItem('parking-lab-settings')||'null');if(saved){savedSettings=saved;for(const id of ['exercise','difficulty','side','mode','fov'])if(saved[id])$(id).value=saved[id];for(const id of ['guides','slow','mirror-curb'])if(typeof saved[id]==='boolean')$(id).checked=saved[id];}}catch{}
function exerciseOptions(){
  const kind=$('exercise').value,garage=kind==='garage',driving=kind==='s-curve'||kind.startsWith('uturn'),previous=$('difficulty').value;
  $('difficulty-label').textContent=driving?'道路難度':'車位大小';
  $('side-label').textContent=kind==='s-curve'?'彎道方向':kind.startsWith('uturn')?'起點與迴轉方向':'停車側';
  $('side').options[0].textContent=kind==='s-curve'?'先右彎，再左彎':kind.startsWith('uturn')?'右側起步，向左迴轉':'右側停車';
  $('side').options[1].textContent=kind==='s-curve'?'先左彎，再右彎':kind.startsWith('uturn')?'左側起步，向右迴轉':'左側停車';
  const choices=driving?kind==='s-curve'?[['easy','寬鬆 · 4.4 m'],['normal','標準 · 3.8 m'],['hard','進階 · 3.5 m']]:[['normal',kind==='uturn-two'?'雙線道 · 6.5 m':'四線道 · 13.0 m']]:garage
    ? [['easy','寬鬆 · 5.5 × 2.8 m'],['normal','標準 · 5.5 × 2.5 m'],['hard','緊湊 · 5.2 × 2.4 m']]
    : [['normal','標準 · 6 × 2.5 m'],['compact','街邊 · 5.5 × 2.5 m'],['tight','緊湊 · 5 × 2.3 m']];
  $('difficulty').replaceChildren(...choices.map(([value,label])=>new Option(label,value)));
  $('difficulty').value=choices.some(([value])=>value===previous)?previous:'normal';
  $('course-brief').textContent=({parallel:'從車尾對齊的位置起步，倒進目標格；完全入格、煞停排 P 後提交。',garage:'直退定位、轉入 90° 車格，再回正直退；觀察兩側、停穩排 P。','s-curve':'D 前進通過兩個彎，在末端等待區停穩換 R，原路倒回 START；完整往返才計完成。','uturn-two':'封閉訓練場：前進轉入、停穩倒退騰空間、再次前進，回到反向車道的 FINISH。','uturn-four':'封閉訓練場：在開放迴轉區低速轉過 180°，沿反向車道前進到 FINISH。'})[kind];
}
$('exercise').addEventListener('change',exerciseOptions);exerciseOptions();if(savedSettings?.difficulty&&[...$('difficulty').options].some(o=>o.value===savedSettings.difficulty))$('difficulty').value=savedSettings.difficulty;
function historyUI(){
  const wins=history.filter(h=>h.passed),completed=Object.keys(COURSE_NAMES).filter(kind=>wins.some(h=>h.exercise===kind));
  $('history').textContent=history.length?`已練習 ${history.length} 次 · 成功 ${wins.length} 次 · 課程完成 ${completed.length} / 5`:'每項課程各完成一次，累積你的駕駛進度。';
  $('course-records').replaceChildren(...Object.entries(COURSE_NAMES).map(([kind,name])=>{
    const row=document.createElement('div'),label=document.createElement('span'),score=document.createElement('strong'),records=wins.filter(h=>h.exercise===kind);
    label.textContent=name;score.textContent=records.length?`✓ ${Math.max(...records.map(h=>h.score))} 分`:'尚未完成';
    row.className=records.length?'course-completed':'';row.append(label,score);return row;
  }));
}
historyUI();
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+2700;$('toast').classList.add('show');}
function gear(g){if(demoFrames){toast('示範中請用暫停觀察，或按重新練習自行操作。');return;}if(Math.abs(car.speed)>.08){audio.cue('warning');toast('請先煞停，再換檔。');return;}if(g!==car.gear)audio.cue('gear');if(g!=='P'&&lastDirection&&g!==lastDirection)stats.corrections++;if(g!=='P')lastDirection=g;car.gear=g;car.acceleration=0;update();}
function setView(v){for(const m of document.querySelectorAll('.mirror.expanded')){m.classList.remove('expanded');m.setAttribute('aria-expanded','false');}render.view=v;$('camera-choice').value=v;document.body.classList.toggle('first-person',v==='driver');$('mirror-system').hidden=false;render.lookYaw=render.lookPitch=0;lookTarget=lookYawVelocity=lookPitchVelocity=0;drag=null;updateLook();for(const b of document.querySelectorAll('[data-view]')){b.classList.toggle('selected',b.dataset.view===v);b.setAttribute('aria-pressed',b.dataset.view===v);}}
function reset(){readyNotified=false;document.body.classList.remove('parking-success');demoFrames=null;demoIndex=0;demonstrated=false;demoPaused=false;manualLessonPhase=0;$('demo-pause').hidden=true;$('demo-pause').textContent='暫停示範';$('demo-pause').setAttribute('aria-pressed','false');lastHitPosition=null;$('demo').textContent='▶ 入位示範';scene=scenario($('difficulty').value,Number($('side').value),$('exercise').value);car={...scene.start};lessonPlan=parkingPlan(scene);stats={hits:0,corrections:0,time:0};lastDirection=null;hitLatch=false;finished=false;keys.clear();touchGas=false;touchBrake=false;steeringHeld=false;started=true;exam=$('mode').value==='exam';document.body.classList.toggle('exam',exam);$('mode-badge').textContent=exam?'測驗模式':'練習模式';render.fov=Number($('fov').value)||80;setView(exam?'driver':render.view);update();}
function setSteer(n){if(demoFrames)return;car.steer=clamp(n,-1,1);car.steerVelocity=0;car.steerTarget=null;}
function aimSteer(n){if(demoFrames)return;car.steerTarget=clamp(n,-1,1);car.steerVelocity=0;}
bindSteering($('wheel'),()=>car.steer,setSteer,v=>steeringHeld=v);$('camera-choice').onchange=e=>setView(e.target.value);
document.querySelectorAll('[data-gear]').forEach(b=>b.onclick=()=>gear(b.dataset.gear));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));$('steer').oninput=e=>setSteer(Number(e.target.value)/100);$('full-left').onclick=()=>aimSteer(-1);$('full-right').onclick=()=>aimSteer(1);$('center').onclick=()=>aimSteer(0);
function pedal(id,fn){const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);fn(true);b.classList.add('pressed');});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{fn(false);b.classList.remove('pressed');});}pedal('throttle',v=>touchGas=v);pedal('brake',v=>touchBrake=v);
for(const event of ['pointerdown','keydown'])$('steer').addEventListener(event,()=>steeringHeld=true);
for(const event of ['pointerup','pointercancel','keyup','blur'])$('steer').addEventListener(event,()=>steeringHeld=false);
function clearInput(){observeLesson(false);keys.clear();touchGas=touchBrake=steeringHeld=false;lookTarget=0;drag=null;input.throttle=input.brake=false;for(const id of ['throttle','brake'])$(id).classList.remove('pressed');}window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();audio.setActive(false);}last=performance.now();});
window.addEventListener('keydown',e=>{
  if($('setup').open||$('result').open||$('shortcuts').open||editingTarget(e.target)||e.altKey||e.ctrlKey||e.metaKey||e.isComposing)return;
  const k=e.key.toLowerCase();
  if(k==='escape')document.querySelectorAll('.mirror.expanded').forEach(m=>{m.classList.remove('expanded');m.setAttribute('aria-expanded','false');});
  if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
  keys.add(k);if(e.repeat)return;
  if(k==='j')look(-75);if(k==='k')look(0);if(k==='l')look(75);
  if(k==='q')gear(car.gear==='D'?'R':'D');
  if(k==='c')setView(views[(views.indexOf(render.view)+1)%views.length]);
  if(k==='h'){$('guides').checked=!$('guides').checked;toast($('guides').checked?'已顯示倒車軌跡':'已隱藏倒車軌跡');persistSettings();}
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());if(['j','l'].includes(e.key.toLowerCase()))look(keys.has('j')?-75:keys.has('l')?75:0);});
$('reset').onclick=()=>{reset();toast('回到起點。慢慢來，再練一次。');};function showAids(value){document.body.classList.toggle('show-aids',value);$('hud-toggle').setAttribute('aria-pressed',value);$('hud-toggle').textContent=value?'收起教學':'教學／輔助';}showAids(false);$('hud-toggle').onclick=()=>showAids(!document.body.classList.contains('show-aids'));$('settings').onclick=()=>{clearInput();historyUI();$('setup').showModal();};function persistSettings(){try{localStorage.setItem('parking-lab-settings',JSON.stringify({...Object.fromEntries(['exercise','difficulty','side','mode','fov'].map(id=>[id,$(id).value])),...Object.fromEntries(['guides','slow','mirror-curb'].map(id=>[id,$(id).checked]))}));}catch{}}$('setup').querySelector('form').addEventListener('submit',e=>{if(e.submitter?.value==='start'){persistSettings();reset();}else if(!started)reset();});$('setup').addEventListener('cancel',()=>{if(!started)reset();});$('setup').addEventListener('close',()=>{if(!started)reset();});$('again').onclick=()=>{$('result').close();reset();};$('continue').onclick=()=>{$('result').close();finished=false;};
$('finish').onclick=()=>{if(demonstrated){toast('示範不計分；請重新練習，自己停一次。');return;}clearInput();const r=result(car,scene,stats,{exam});if(!r.stopped){audio.cue('warning');toast('先放開油門、踩煞車，停穩後再提交。');return;}finished=true;audio.cue(r.passed?'success':'warning');document.body.classList.toggle('parking-success',r.passed);const entry={...r,...stats,date:new Date().toISOString(),difficulty:$('difficulty').value,exercise:scene.kind,mode:exam?'exam':'practice'};history.push(entry);history=history.slice(-50);try{localStorage.setItem('parking-lab-history',JSON.stringify(history));}catch{toast('瀏覽器無法儲存成績，但仍可繼續練習。');}const reasons=[];if(exam&&stats.hits>0)reasons.push('測驗需全程零碰撞；請重新挑戰');if(r.routeComplete===false)reasons.push('請依順序完成全程，再回終點停妥');if(!r.parked)reasons.push('停穩後請排 P 檔');if(!r.inside)reasons.push('車身四角需要完全進入標線內');if(r.angle>=r.angleLimit)reasons.push(`車身與格線未對齊，請調整到 ${r.angleLimit}° 內`);$('result-body').innerHTML=`<p>${r.passed?'漂亮，完成練習了。':'還差一點，找回節奏。'}</p><h2>${r.passed?'這次完成得很好':'每次調整，都更接近入位'}</h2><div class="score">${r.score}<span style="font-size:18px"> / 100</span></div><p>${r.passed?'已完成指定步驟，入框對齊、停穩排 P。':reasons.join('<br>')}<br>${isDrivingCourse(scene)?'最近路緣':scene.kind==='garage'?'後方':'路緣'} ${Math.round(r.curb*100)} cm · 角度 ${r.angle.toFixed(1)}°<br>碰撞 ${stats.hits} 次 · 修正 ${stats.corrections} 次 · ${Math.floor(stats.time)} 秒</p><p class="result-note">位置 ${r.breakdown.position} / ${isDrivingCourse(scene)?35:55}　方向 ${r.breakdown.alignment} / 25　${isDrivingCourse(scene)?'全程':'路緣'} ${r.breakdown.curb} / ${isDrivingCourse(scene)?40:20}<br>${exam?'測驗標準':'練習模式：前 6 次修正不扣分'} · 本次扣分 ${r.breakdown.penalty}</p>`;$('continue').hidden=exam||r.passed;const kinds=Object.keys(COURSE_NAMES),nextKind=kinds[(kinds.indexOf(scene.kind)+1)%kinds.length];$('next-course').hidden=!r.passed;$('next-course').dataset.kind=nextKind;$('next-course').textContent='下一項：'+COURSE_NAMES[nextKind];historyUI();$('result').showModal();};
$('next-course').onclick=()=>{$('result').close();$('exercise').value=$('next-course').dataset.kind;exerciseOptions();persistSettings();reset();toast(COURSE_NAMES[scene.kind]+'，準備好了。');};
function lessonStage(){
  manualLessonPhase=lessonProgress(car,scene,manualLessonPhase,demonstrated);
  return manualLessonPhase;
}
$('demo-pause').onclick=()=>{
  if(!demoFrames)return;
  demoPaused=!demoPaused;
  $('demo-pause').textContent=demoPaused?'繼續示範':'暫停示範';
  $('demo-pause').setAttribute('aria-pressed',String(demoPaused));
  clearInput();update();
};
function observeLesson(held){
  observingLesson=held;
  const stage=lessonStage(),curbMirror=scene.side===1?'right':'left',outerMirror=scene.side===1?'left':'right';
  const mirror=stage>=2?outerMirror:curbMirror;
  for(const item of document.querySelectorAll('.mirror'))item.classList.toggle('observing',held&&stage>0&&item.classList.contains('mirror-'+mirror));
  lookTarget=held?observationYaw(scene,stage)*Math.PI/180:0;
  $('observe-lesson').setAttribute('aria-pressed',String(held));
}
$('observe-lesson').addEventListener('pointerdown',event=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);observeLesson(true);});
for(const type of ['pointerup','pointercancel','lostpointercapture','blur'])$('observe-lesson').addEventListener(type,()=>observeLesson(false));
$('observe-lesson').addEventListener('keydown',event=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();event.stopPropagation();observeLesson(true);}});
$('observe-lesson').addEventListener('keyup',event=>{if(event.key===' '||event.key==='Enter'){event.stopPropagation();observeLesson(false);}});

function update(){
  const m=metrics(car,scene),stage=lessonStage(),lesson=lessonContent(car,scene,stage,car.demoPlan||lessonPlan);
  if(observingLesson)observeLesson(true);
  $('lesson-landmark').textContent=lesson.landmark;
  $('scale-reference').textContent=lesson.scale;
  $('clearance-label').textContent=lesson.clearanceLabel;
  $('angle-label').textContent=lesson.angleLabel;
  $('parallel-sources').hidden=scene.kind!=='parallel';
  $('garage-steps').hidden=scene.kind!=='garage';
  $('exercise-label').textContent=COURSE_NAMES[scene.kind];
  if(!demoFrames&&!demonstrated)$('demo').textContent=isDrivingCourse(scene)?'▶ 課程示範':'▶ 入位示範';
  $('finish').textContent=isDrivingCourse(scene)?'✓ 完成練習':'✓ 完成停車';
  $('coach').dataset.lessonPhase=String(stage);
  document.body.dataset.lessonAction=car.lessonAction||'';
  document.body.dataset.demoState=demoFrames?(demoPaused?'paused':'playing'):demonstrated?'complete':'idle';
  $('coach-title').textContent=lesson.title;$('coach-text').textContent=lesson.text;$('stage').textContent=`0${stage+1} / 04`;
  for(const [i,item] of [...document.querySelectorAll('.steps i')].entries())item.classList.toggle('active',i<=stage);
  $('distance').textContent=`${Math.round(m.curb*100)} cm`;$('angle').textContent=`${m.angle.toFixed(1)}°`;
  $('hits').textContent=stats.hits;$('corrections').textContent=stats.corrections;
  $('time').textContent=`${Math.floor(stats.time/60)}:${String(Math.floor(stats.time%60)).padStart(2,'0')}`;
  $('speed').textContent=(Math.abs(car.speed)*3.6).toFixed(1);
  document.body.classList.toggle('reverse-active',car.gear==='R');
  $('pedal-label').textContent='油門';$('pedal-hint').textContent='W / ↑';
  $('throttle').classList.toggle('pressed',Boolean(input.throttle));$('brake').classList.toggle('pressed',Boolean(input.brake));
  $('gear-label').textContent={P:'P 停車',R:'R 倒車',D:'D 前進'}[car.gear];
  $('steer').value=car.steer*100;$('steer-value').textContent=Math.abs(car.steer)<.001?'回正':`${car.steer>0?'右':'左'} ${Math.round(Math.abs(car.steer)*CAR.maxSteer*180/Math.PI)}°`;
  $('drive-state').textContent=demoFrames&&demoPaused?'示範暫停':car.gear==='P'?'停車鎖定':input.brake?'煞車中':input.throttle?'加速中':'鬆煞車即蠕行';
  $('wheel-graphic').style.transform=`rotate(${car.steer*STEERING_LOCK}deg)`;
  $('wheel-value').textContent=Math.abs(car.steer)<.001?'方向盤置中':`方向盤${car.steer>0?'右':'左'} ${(Math.abs(car.steer)*STEERING_LOCK/360).toFixed(2)} 圈`;
  for(const b of document.querySelectorAll('[data-gear]')){b.classList.toggle('selected',b.dataset.gear===car.gear);b.setAttribute('aria-pressed',b.dataset.gear===car.gear);}
  const clearance=proximity(car,scene),danger=clearance<.2;
  const active=started&&!finished&&!demoPaused&&!$('setup').open&&!$('result').open&&!$('shortcuts').open&&!document.hidden;
  const ready=result(car,scene,stats,{exam}).passed;
  if(ready&&active&&!demonstrated&&!readyNotified){toast('已完成步驟並停妥，按 E 提交成績。');readyNotified=true;}if(!ready)readyNotified=false;
  audio.proximity(clearance,active&&car.gear==='R'&&Math.abs(car.speed)>.02,performance.now());
  $('sensor-text').textContent=danger?'接近車輛或邊界，請煞車。':isDrivingCourse(scene)&&!result(car,scene,stats,{exam}).routeComplete?'依教練順序完成全程，再到目標框停妥。':m.inside?'已入格，對齊、煞停排 P 後提交。':'慢慢來，給自己多一點空間。';
  for(const [i,v] of document.querySelectorAll('.sensor i').entries()){v.classList.toggle('on',clearance<1.5-i*.25);v.classList.toggle('danger',danger);}
}
$('demo').onclick=()=>{if(exam)return;if(demoFrames){reset();return;}reset();demoFrames=demonstration(scene);demonstrated=Boolean(demoFrames);if(!demoFrames){toast('此緊湊車格需要分段前後修正；可先切回標準格觀看完整示範。');return;}if($('demo-stepwise').checked){car={...demoFrames[0]};demoIndex=1;demoPaused=true;$('demo-pause').textContent='繼續示範';$('demo-pause').setAttribute('aria-pressed','true');}showAids(true);$('demo-pause').hidden=false;$('demo').textContent='■ 停止示範';toast(isDrivingCourse(scene)?'完整課程示範，使用相同物理與路緣判定；可暫停觀察，示範不計分。':scene.kind==='garage'?'倒車入庫示範：定位、轉入、回正直退、煞停。可暫停觀察；示範不計分。':'四步驟示範：定位、車尾對齊、斜退與直退、反打微調。可暫停觀察；示範不計分。');update();};
$('rear-toggle').onclick=()=>{rearCameraOpen=!rearCameraOpen;document.body.classList.toggle('rear-camera-open',rearCameraOpen);$('rear-toggle').setAttribute('aria-pressed',String(rearCameraOpen));$('rear-toggle').textContent=rearCameraOpen?'關閉倒車顯影':'倒車顯影';lastPicture='';};
rearRender.view='rear';const leftMirror=new Renderer($('mirror-left')),centerMirror=new Renderer($('mirror-center')),rightMirror=new Renderer($('mirror-right'));leftMirror.view='mirror-left';centerMirror.view='rear';rightMirror.view='mirror-right';document.querySelectorAll('.mirror').forEach(m=>{m.tabIndex=0;m.setAttribute('role','button');m.setAttribute('aria-label',m.querySelector('canvas').getAttribute('aria-label')+'，點擊放大');m.setAttribute('aria-expanded','false');const toggle=()=>{const expanded=!m.classList.contains('expanded');document.querySelectorAll('.mirror').forEach(v=>{v.classList.remove('expanded');v.setAttribute('aria-expanded','false');});if(expanded){m.classList.add('expanded');m.setAttribute('aria-expanded','true');}};m.onclick=toggle;m.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();toggle();}if(e.key==='Escape'){m.classList.remove('expanded');m.setAttribute('aria-expanded','false');}};});let mirrorTick=0;function updateLook(){$('look-label').textContent=Math.abs(render.lookYaw)<.03?'正前方':(render.lookYaw<0?'左側 ':'右側 ')+Math.round(Math.abs(render.lookYaw)*180/Math.PI)+'°';}let lookTarget=0,lookYawVelocity=0,lookPitchVelocity=0,drag=null;
function look(degrees){lookTarget=degrees*Math.PI/180;}
for(const [id,degrees] of [['look-left',-75],['look-right',75]]){
  const button=$(id);button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);look(degrees);});
  for(const event of ['pointerup','pointercancel','lostpointercapture','blur'])button.addEventListener(event,()=>look(0));
  button.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();look(degrees);}});
  button.addEventListener('keyup',e=>{if(['Enter',' '].includes(e.key))e.stopPropagation();look(0);});
} $('look-center').onclick=()=>look(0);
$('world').addEventListener('pointerdown',e=>{$('world').focus({preventScroll:true});if(render.view!=='driver'||$('setup').open||$('result').open)return;lookTarget=lookYawVelocity=lookPitchVelocity=0;drag={x:e.clientX,y:e.clientY,yaw:render.lookYaw,pitch:render.lookPitch};$('world').setPointerCapture(e.pointerId);});$('world').addEventListener('pointermove',e=>{if(!drag)return;render.lookYaw=clamp(drag.yaw+(e.clientX-drag.x)/innerWidth*4.5,-2.7,2.7);render.lookPitch=clamp(drag.pitch-(e.clientY-drag.y)/innerHeight*.8,-.22,.28);updateLook();});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('world').addEventListener(event,()=>drag=null);let rearTick=0;let last=performance.now(),accumulator=0,ui=0;function frame(now){const dt=document.hidden?0:Math.max(0,Math.min((now-last)/1000,1));last=now;const paused=!started||finished||$('setup').open||$('result').open||$('shortcuts').open;audio.setActive(!paused&&!demoPaused&&!document.hidden);if(!paused&&!drag){const head=advanceLook({yaw:render.lookYaw,pitch:render.lookPitch,yawVelocity:lookYawVelocity,pitchVelocity:lookPitchVelocity},{yaw:lookTarget,pitch:0,held:lookTarget!==0},dt);render.lookYaw=head.yaw;render.lookPitch=head.pitch;lookYawVelocity=head.yawVelocity;lookPitchVelocity=head.pitchVelocity;updateLook();}Object.assign(input,demonstrated?(car.demoInput||{throttle:false,brake:true}):drivingInput(keys,car.gear,{gas:touchGas,brake:touchBrake,slow:$('slow').checked}));input.holdSteering=demonstrated?Boolean(car.demoInput?.holdSteering):steeringHeld;if(!paused){accumulator+=dt*(demoFrames?Number($('demo-speed').value):1);while(accumulator>=1/120){if(demoFrames){if(demoPaused){accumulator=0;break;}const previousPhase=car.lessonPhase,previousAction=car.lessonAction;car={...demoFrames[demoIndex++]};Object.assign(input,car.demoInput);if($('demo-stepwise').checked&&(car.lessonPhase!==previousPhase||(car.lessonPhase===2&&car.lessonAction==='straight'&&previousAction!=='straight'))&&demoIndex<demoFrames.length){demoPaused=true;$('demo-pause').textContent='繼續示範';$('demo-pause').setAttribute('aria-pressed','true');accumulator=0;update();break;}if(demoIndex>=demoFrames.length){demoFrames=null;finished=true;$('demo-pause').hidden=true;$('demo').textContent='▶ 再看示範';toast('示範完成！按重新練習，換你試一次。');accumulator=0;break;}accumulator-=1/120;continue;}const next=step(car,input,1/120);if(collision(next,scene)){car.speed=0;car.acceleration=0;car.steer=next.steer;car.steerVelocity=next.steerVelocity;car.steerTarget=next.steerTarget;if(!hitLatch){stats.hits++;audio.cue('hit');impactFeedback();lastHitPosition={x:car.x,z:car.z};toast('碰到障礙物了。停穩，換方向慢慢離開。');hitLatch=true;}}else{car=advanceCourse(car,next,scene);if(lastHitPosition&&Math.hypot(car.x-lastHitPosition.x,car.z-lastHitPosition.z)>.12){hitLatch=false;lastHitPosition=null;}}stats.time+=1/120;accumulator-=1/120;}}else accumulator=0;
if(now>toastUntil)$('toast').classList.remove('show');ui+=dt;if(ui>.06){update();ui=0;}
hazardLit=hazards&&Math.floor(now/500)%2===0;$('hazard-toggle').classList.toggle('lit',hazardLit);
const rearVisible=rearCameraOpen;$('rear-panel').hidden=!rearVisible;
const picture=[car.x,car.z,car.angle,car.steer,car.gear,Boolean(input.brake),hazardLit,render.view,render.lookYaw,render.lookPitch,render.fov,scene.kind,scene.side,scene.length,scene.target.width,scene.width,exam,document.body.classList.contains('show-aids'),$('guides').checked,$('mirror-curb').checked,rearVisible,innerWidth,innerHeight,document.querySelector('.mirror.expanded')?.className].join('|');
// Parked scenes need no continuous GPU work. Simulation and input still update
// independently; moving scenes redraw at up to 25 fps, including every mirror.
if(picture!==lastPicture&&now-lastPictureAt>=40){
  render.adaptQuality(dt);
  for(const m of [leftMirror,centerMirror,rightMirror]){if(m.w!==m.canvas.clientWidth||m.h!==m.canvas.clientHeight)m.resize();m.mirrorTilt=$('mirror-curb').checked?-12:-4;m.draw(car,scene,{guides:false,exam:true,braking:Boolean(input.brake)||car.gear==='P',hazards:hazardLit});}
  if(rearVisible){if(rearRender.w!==$('rear-view').clientWidth||rearRender.h!==$('rear-view').clientHeight)rearRender.resize();rearRender.draw(car,scene,{guides:false,exam:true,braking:Boolean(input.brake)||car.gear==='P',hazards:hazardLit});}
  render.draw(car,scene,{guides:$('guides').checked&&(render.view!=='driver'||document.body.classList.contains('show-aids')),exam,hits:stats.hits,braking:Boolean(input.brake)||car.gear==='P',hazards:hazardLit});lastPicture=picture;lastPictureAt=now;window.parkingBoot?.ready();
}
requestAnimationFrame(frame);}
window.addEventListener('parking:ready',()=>$('setup').showModal(),{once:true});
initialiseFeedback();setView('driver');update();requestAnimationFrame(frame);if(!window.parkingBoot)$('setup').showModal();


let impactTimer;
function impactFeedback(){
  clearTimeout(impactTimer);document.body.classList.add('impact');
  impactTimer=setTimeout(()=>document.body.classList.remove('impact'),350);
}
function initialiseFeedback(){
  function pulse(button){button.classList.add('action-feedback');setTimeout(()=>button.classList.remove('action-feedback'),180);}
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{if(audio.context?.state!=='running')audio.unlock();},{capture:true});
  document.addEventListener('pointerdown',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    pulse(button);if(!button.dataset.gear&&button.id!=='finish')audio.cue('click');
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||event.detail!==0)return;
    pulse(button);if(!button.dataset.gear&&button.id!=='finish')audio.cue('click');
  });
  function syncAudio(){
    const o=audio.options;
    $('sound-toggle').textContent=o.muted?'全部靜音':'聲音開';$('sound-toggle').setAttribute('aria-pressed',String(o.muted));
    $('music-toggle').textContent=o.music?'音樂開':'音樂關';$('music-toggle').setAttribute('aria-pressed',String(o.music));
    $('effects-enabled').checked=o.effects;$('music-enabled').checked=o.music;
    for(const [id,key] of [['effects-volume','effectsVolume'],['music-volume','musicVolume']]){$(id).value=Math.round(o[key]*100);$(id+'-value').textContent=Math.round(o[key]*100)+'%';}
  }
  $('sound-toggle').onclick=()=>{audio.set('muted',!audio.options.muted);syncAudio();toast(audio.options.muted?'所有聲音已靜音':'已開啟聲音');};
  $('music-toggle').onclick=()=>{audio.set('music',!audio.options.music);syncAudio();};
  for(const [id,key] of [['effects-enabled','effects'],['music-enabled','music']])$(id).onchange=e=>{audio.set(key,e.target.checked);syncAudio();};
  for(const [id,key] of [['effects-volume','effectsVolume'],['music-volume','musicVolume']])$(id).oninput=e=>{audio.set(key,Number(e.target.value)/100);syncAudio();};
  syncAudio();
  $('hazard-toggle').onclick=()=>{hazards=!hazards;$('hazard-toggle').setAttribute('aria-pressed',String(hazards));toast(hazards?'已開啟雙黃燈':'已關閉雙黃燈');};
  $('shortcut-toggle').onclick=()=>{clearInput();if($('shortcuts').open)$('shortcuts').close();else $('shortcuts').showModal();};
  $('shortcuts-close').onclick=()=>$('shortcuts').close();
  $('shortcuts').addEventListener('close',clearInput);
  bindShortcuts({enabled:()=>started&&!$('setup').open&&!$('result').open&&!$('shortcuts').open,onHold:observeLesson});
}
