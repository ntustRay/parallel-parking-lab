import * as THREE from './vendor/three.module.min.js';
import {CAR} from './physics.js';
import {STEERING_LOCK} from './steering.js';

// Metres in the same car-local coordinate system as the exterior shell.
// Seat/eye/rack positions are ergonomic approximations, not an Altis interior scan.
export const CABIN=Object.freeze({eyeX:-.4,eyeHeight:1.16,eyeForward:-.16,pitch:-10*Math.PI/180,wheelX:-.4,wheelY:.89,wheelZ:-.30,wheelRadius:.188,mirrorHeight:.98,mirrorForward:.47});
const unitBox=new THREE.BoxGeometry(1,1,1);
const mats=new Map();
let grain;
function leatherGrain(){if(grain)return grain;const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d'),pixels=c.createImageData(128,128);let seed=3217;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=150+seed%70;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}c.putImageData(pixels,0,0);grain=new THREE.CanvasTexture(canvas);grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(6,6);return grain;}
function mat(color,metalness=0){const key=color+metalness;if(!mats.has(key)){const leather=['#171d23','#242b31','#363a3d','#555e65','#30373c','#34383c','#35434f'].includes(color);mats.set(key,new THREE.MeshStandardMaterial({color,roughness:metalness?.38:.88,metalness,...(leather?{bumpMap:leatherGrain(),bumpScale:.0008}:{})}));}return mats.get(key);}
function box(parent,color,x,y,z,w,h,d,metalness=0){const mesh=new THREE.Mesh(unitBox,mat(color,metalness));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);return mesh;}
function softBox(parent,color,x,y,z,w,h,d,r=.025){const g=new THREE.BoxGeometry(w,h,d,10,5,8),p=g.attributes.position,v=new THREE.Vector3(),center=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);center.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(center).normalize().multiplyScalar(r).add(center);p.setXYZ(i,v.x,v.y,v.z);}g.computeVertexNormals();const mesh=new THREE.Mesh(g,mat(color));mesh.position.set(x,y,z);parent.add(mesh);return mesh;}
function surface(parent,points,color){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,1,1,1,1,0,0,0],2));g.setIndex([0,1,2,0,2,3]);g.computeVertexNormals();const m=mat(color).clone();m.side=THREE.DoubleSide;const mesh=new THREE.Mesh(g,m);parent.add(mesh);return mesh;}
function beam(parent,a,b,width,depth,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=box(parent,color,0,0,0,width,delta.length(),depth);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return mesh;}
function display(parent,x,y,z,w,h,width,height){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));mesh.position.set(x,y,z);parent.add(mesh);return {canvas,texture,mesh,ctx:canvas.getContext('2d')};}

export function createCockpit(){
  const group=new THREE.Group();group.name='driver-cabin';
  const half=CAR.width/2-.115,roof=CAR.height-.08;
  const mirrorFaces={};
  for(const sign of [-1,1]){
    const x=sign*.984;
    softBox(group,'#326576',x,.98,-.64,.205,.135,.275,.04);
    box(group,'#1b2228',x,.98,-.498,.19,.115,.005);
    const face=new THREE.Mesh(new THREE.PlaneGeometry(.177,.102),new THREE.ShaderMaterial({uniforms:{image:{value:null}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D image;varying vec2 vUv;void main(){gl_FragColor=texture2D(image,vec2(1.-vUv.x,vUv.y));\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));
    face.position.set(x,.98,-.492);group.add(face);mirrorFaces[sign<0?'left':'right']=face;
  }
  // A shaped dashboard joins the windscreen sill to the lower instrument panel.
  surface(group,[[-half,.94,-1.02],[half,.94,-1.02],[half,.93,-.83],[-half,.93,-.83]],'#363a3d');
  for(const [left,right] of [[-half,-.70],[-.08,half]]){
    surface(group,[[left,.93,-.83],[right,.93,-.83],[right,.89,-.39],[left,.89,-.39]],'#363a3d');
    surface(group,[[left,.89,-.39],[right,.89,-.39],[right,.53,-.32],[left,.53,-.32]],'#23292d');
  }
  surface(group,[[-.70,.72,-.35],[-.08,.72,-.35],[-.08,.53,-.32],[-.70,.53,-.32]],'#23292d');
  softBox(group,'#30373c',.35,.74,-.64,.81,.28,.7,.04);
  box(group,'#161d22',0,.48,-.62,half*2,.16,.72);
  box(group,'#6e777b',0,.815,-.381,half*2,.015,.016,.55);
  box(group,'#242b30',0,.32,.12,half*2,.045,1.8);
  box(group,'#303438',0,roof+.04,.22,half*2,.08,1.65);
  for(const sign of [-1,1]){
    beam(group,[sign*half,.87,-.92],[sign*(half-.1),roof,-.42],.115,.105,'#555e65');
    beam(group,[sign*(half+.026),.865,-.94],[sign*(half-.07),roof,-.43],.035,.125,'#171f24');
    beam(group,[sign*.78,.91,.72],[sign*.635,CAR.height-.065,.36],.045,.055,'#555e65');
    box(group,'#2b3135',sign*(half+.018),.65,.02,.09,.43,1.57);
    box(group,'#41464a',sign*(half-.015),.886,.02,.095,.055,1.58);
    box(group,'#171d22',sign*(half-.055),.71,-.28,.03,.12,.32);
    box(group,'#aab4b8',sign*(half-.076),.74,-.28,.019,.025,.21,.7);
    const visor=softBox(group,'#34383c',sign*.36,roof+.025,-.38,.55,.045,.17,.015);visor.rotation.x=-.1;
  }
  // Binnacle, physical vent slats, and a separate passenger-side parking display.
  const hood=new THREE.Shape();hood.moveTo(-.285,.80);hood.lineTo(-.285,.88);hood.quadraticCurveTo(-.26,.982,0,.991);hood.quadraticCurveTo(.26,.982,.285,.88);hood.lineTo(.285,.80);hood.closePath();
  const hoodMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(hood,{depth:.16,bevelEnabled:true,bevelSize:.012,bevelThickness:.012,bevelSegments:3,curveSegments:24}),mat('#171d23'));hoodMesh.position.set(-.4,0,-.82);group.add(hoodMesh);
  const instruments=display(group,-.4,.884,-.645,.49,.156,960,340);
  box(group,'#14202a',-.4,.65,-.70,.64,.34,.025);
  for(const x of [-.685,-.07,.25,.55]){
    box(group,'#12191e',x,.762,-.375,.14,.065,.018);
    box(group,'#9aabad',x,.8,-.38,.15,.008,.024,.65);
    for(let i=0;i<4;i++)box(group,'#4a555b',x,.739+i*.014,-.359,.126,.005,.012);
  }
  box(group,'#161e23',.385,.64,-.355,.37,.13,.07);
  for(const x of [.25,.39,.53]){
    const dial=new THREE.Mesh(new THREE.CylinderGeometry(.036,.036,.018,24),mat('#818f96',.65));dial.rotation.x=Math.PI/2;dial.position.set(x,.646,-.31);group.add(dial);
    const face=new THREE.Mesh(new THREE.CircleGeometry(.028,24),mat('#172027'));face.position.set(x,.646,-.298);group.add(face);
    box(group,'#bdd9e4',x,.664,-.296,.003,.01,.002);
  }
  box(group,'#333e44',.08,.75,-.344,.04,.055,.025);
  surface(group,[[.069,.744,-.328],[.08,.766,-.328],[.091,.744,-.328],[.069,.744,-.328]],'#d66a60');

  const wheel=new THREE.Group();wheel.position.set(CABIN.wheelX,CABIN.wheelY,CABIN.wheelZ);wheel.rotation.x=-.15;group.add(wheel);
  const rotating=new THREE.Group();wheel.add(rotating);
  const rim=new THREE.Mesh(new THREE.TorusGeometry(.171,.017,10,72),mat('#171d23'));rotating.add(rim);
  const seam=new THREE.Mesh(new THREE.TorusGeometry(.154,.0014,4,72),mat('#899295'));seam.position.z=.011;rotating.add(seam);
  for(const sign of [-1,1]){
    const spoke=box(rotating,'#626f78',sign*.1,-.014,.006,.139,.04,.027,.6);spoke.rotation.z=sign*.13;
    box(rotating,'#18242b',sign*.105,-.011,.023,.062,.028,.011);
    for(let i=0;i<3;i++)box(rotating,'#afbdc4',sign*.104+(i-1)*.016,-.009,.03,.006,.002,.003);
  }
  const lower=box(rotating,'#697780',0,-.112,.006,.047,.116,.026,.55);lower.rotation.z=.02;
  const hub=new THREE.Mesh(new THREE.SphereGeometry(1,24,12),mat('#242b31'));hub.scale.set(.079,.063,.031);hub.position.set(0,-.013,.019);rotating.add(hub);
  const badge=new THREE.Mesh(new THREE.RingGeometry(.012,.014,24),mat('#adb9bf',.65));badge.position.set(0,-.009,.05);rotating.add(badge);
  box(group,'#182127',-.4,.76,-.48,.105,.105,.23);
  // Stalks and a narrow wheel marker keep rotation readable without a floating icon.
  box(group,'#172127',-.62,.85,-.36,.15,.021,.025);
  box(group,'#172127',-.18,.85,-.36,.15,.021,.025);
  box(rotating,'#b9c5ca',0,.17,.012,.008,.022,.014);
  group.userData={wheel,rotating,instruments,mirrorFaces,lastKey:''};
  return group;
}

function dial(ctx,cx,cy,r,start,end,value,label,color){
  ctx.strokeStyle='#263b4e';ctx.lineWidth=5;ctx.beginPath();ctx.arc(cx,cy,r,start,end);ctx.stroke();
  for(let i=0;i<=20;i++){
    const a=start+(end-start)*i/20,major=i%5===0;
    ctx.strokeStyle=major?'#e9f3ff':'#84a6c5';ctx.lineWidth=major?3:1;
    ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(r-3),cy+Math.sin(a)*(r-3));ctx.lineTo(cx+Math.cos(a)*(r-(major?20:10)),cy+Math.sin(a)*(r-(major?20:10)));ctx.stroke();
    if(major){ctx.fillStyle='#bdcfe0';ctx.font='22px sans-serif';ctx.textAlign='center';const tick=label==='km/h'?i*2:Math.round((i-10)/10*CAR.maxSteer*180/Math.PI);ctx.fillText(String(tick),cx+Math.cos(a)*(r-40),cy+Math.sin(a)*(r-40)+7);}
  }
  const a=start+(end-start)*Math.max(0,Math.min(1,value));ctx.strokeStyle=color;ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*(r-26),cy+Math.sin(a)*(r-26));ctx.stroke();ctx.fillStyle='#324958';ctx.beginPath();ctx.arc(cx,cy,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#9cb2c8';ctx.font='19px sans-serif';ctx.fillText(label,cx,cy+43);
}
export function updateCockpit(cabin,car,scenario){
  const data=cabin.userData;data.rotating.rotation.z=-car.steer*STEERING_LOCK*Math.PI/180;
  const key=[(Math.abs(car.speed)*3.6).toFixed(1),car.gear,car.steer.toFixed(2),car.x.toFixed(1),car.z.toFixed(1),car.angle.toFixed(2),scenario.length].join(':');
  if(key===data.lastKey)return;data.lastKey=key;
  const c=data.instruments.ctx;c.fillStyle='#08131e';c.fillRect(0,0,960,340);
  dial(c,190,205,128,Math.PI*.78,Math.PI*2.22,Math.abs(car.speed)*3.6/40,'km/h','#78bdff');
  dial(c,770,205,128,Math.PI*.78,Math.PI*2.22,(car.steer+1)/2,'輪角 °','#78bdff');
  c.fillStyle='#9fb7d0';c.textAlign='center';c.font='24px sans-serif';c.fillText('PARKING LAB',480,62);
  c.fillStyle='#f1f7ff';c.font='600 88px sans-serif';c.fillText((Math.abs(car.speed)*3.6).toFixed(1),480,166);
  c.font='23px sans-serif';c.fillStyle='#97b1ca';c.fillText('km/h',480,204);
  c.strokeStyle=car.gear==='R'?'#e4b775':'#7baace';c.lineWidth=2;c.strokeRect(445,231,70,64);c.fillStyle=car.gear==='R'?'#e4b775':'#d3e9ff';c.font='43px sans-serif';c.fillText(car.gear,480,280);data.instruments.texture.needsUpdate=true;
}
