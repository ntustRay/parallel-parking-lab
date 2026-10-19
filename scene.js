import * as THREE from './vendor/three.module.min.js';
import {step,CAR,ROAD,frontWheelAngles} from './physics.js';
export {THREE};

const boxGeometry=new THREE.BoxGeometry(1,1,1);
const sphereGeometry=new THREE.SphereGeometry(1,12,9);
const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,16);
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
const materials=new Map();
function material(color,roughness=.85,metalness=0){const key=`${color}-${roughness}-${metalness}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
function mesh(geometry,color,x,y,z,w=1,h=1,d=1,parent){const item=new THREE.Mesh(geometry,typeof color==='string'?material(color):color);item.position.set(x,y,z);item.scale.set(w,h,d);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;}
function box(parent,color,x,y,z,w,h,d){return mesh(boxGeometry,color,x,y,z,w,h,d,parent);}

function roadTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=9211;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const shade=45+(seed%13);pixels.data[i]=shade;pixels.data[i+1]=shade+3;pixels.data[i+2]=shade+5;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,70);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function pavementTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#b7bab4';c.fillRect(0,0,256,256);for(let y=0;y<256;y+=32)for(let x=-32;x<256;x+=64){const offset=y%64?32:0;c.fillStyle=(x+y)%3?'#c3c6bf':'#bec2ba';c.fillRect(x+offset+1,y+1,62,30);}const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,62);t.colorSpace=THREE.SRGBColorSpace;return t;}
function signTexture(text,background,foreground){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,512,128);c.strokeStyle=foreground+'66';c.lineWidth=3;c.strokeRect(10,10,492,108);c.font='600 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=foreground;c.fillText(text,256,65);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.8});}

// Rounded geometry uses real curved normals, rather than a stack of cuboids.
function roundedBox(w,h,d,r=.12){const geometry=new THREE.BoxGeometry(w,h,d,8,5,12),p=geometry.attributes.position,v=new THREE.Vector3(),center=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);center.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(center).normalize().multiplyScalar(r).add(center);p.setXYZ(i,v.x,v.y,v.z);}geometry.computeVertexNormals();return geometry;}
function quad(parent,points,mat){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const m=new THREE.Mesh(geometry,mat);m.material.side=THREE.DoubleSide;m.castShadow=true;parent.add(m);return m;}
let carBodyGeometry;
function bodyShell(){
  if(carBodyGeometry)return carBodyGeometry;
  const bevel=.025,half=CAR.length/2-bevel,low=.22+bevel,top=.86-bevel,axle=.317,radius=.37,rear=CAR.length/2-CAR.rear,front=rear-CAR.wheelbase;
  const profile=new THREE.Shape();profile.moveTo(-half,low);
  for(const z of [front,rear]){profile.lineTo(z-radius,low);profile.lineTo(z-radius,axle);profile.absarc(z,axle,radius,Math.PI,0,true);profile.lineTo(z+radius,low);}
  profile.lineTo(half,low);profile.lineTo(half,top);profile.lineTo(-half,top);profile.closePath();
  const depth=CAR.width-2*bevel;
  carBodyGeometry=new THREE.ExtrudeGeometry(profile,{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:2,curveSegments:20,steps:1});
  carBodyGeometry.translate(0,0,-depth/2);carBodyGeometry.rotateY(-Math.PI/2);return carBodyGeometry;
}
export function makeCar(color){
  const group=new THREE.Group(),paint=material(color,.32,.38),rubber=material('#1b2228',.98),chrome=material('#aebbc2',.3,.7),glass=material('#294654',.22,.2),trim=material('#24303a',.7);
  const body=mesh(bodyShell(),paint,0,0,0,1,1,1,group);body.name='body-envelope';
  box(group,trim,0,.18,0,CAR.width-.28,.08,CAR.length-.48);
  mesh(roundedBox(CAR.width-.07,.12,1.36,.045),paint,0,.855,-1.52,1,1,1,group);
  mesh(roundedBox(CAR.width-.08,.12,.96,.04),paint,0,.87,1.77,1,1,1,group);
  const base=.78,top=.635,low=.91,high=CAR.height-.065;
  quad(group,[[-base,low,-.99],[base,low,-.99],[top,high,-.47],[-top,high,-.47]],glass);
  quad(group,[[base,low,1.07],[-base,low,1.07],[-top,high,.63],[top,high,.63]],glass);
  for(const side of [-1,1]){
    quad(group,[[side*base,low,-.99],[side*base,low,1.07],[side*top,high,.63],[side*top,high,-.47]],glass);
    const pillar=box(group,paint,side*.70,1.15,.1,.065,.46,.085);pillar.rotation.z=side*.18;
    box(group,trim,side*.795,.91,.05,.035,.035,2.06);
    box(group,chrome,side*(CAR.width/2-.02),.76,.58,.025,.028,.18);box(group,chrome,side*(CAR.width/2-.02),.76,-.49,.025,.028,.18);
    mesh(roundedBox(.205,.135,.275,.04),paint,side*.984,.98,-.64,1,1,1,group);
    box(group,trim,side*(CAR.width/2-.02),.365,0,.03,.055,CAR.length-.45);
  }
  mesh(roundedBox(1.34,.08,1.18,.025),paint,0,CAR.height-.04,.08,1,1,1,group);
  box(group,trim,0,.51,-CAR.length/2+.018,.88,.16,.028);
  box(group,chrome,0,.6,-CAR.length/2+.019,.88,.018,.028);
  const lights=[];
  for(const side of [-1,1]){
    box(group,new THREE.MeshStandardMaterial({color:'#ebf0ed',emissive:'#dce9e5',emissiveIntensity:.35}),side*.59,.74,-CAR.length/2+.035,.46,.1,.045);
    const tail=box(group,new THREE.MeshStandardMaterial({color:'#bb493d',emissive:'#8d2822',emissiveIntensity:.35}),side*.61,.76,CAR.length/2-.035,.43,.1,.045);lights.push(tail);
  }
  box(group,material('#d9e0df'),0,.56,CAR.length/2-.012,.43,.1,.02);
  const frontWheels=[],rearWheels=[],radius=.317;
  const rearZ=CAR.length/2-CAR.rear,frontZ=rearZ-CAR.wheelbase;
  for(const x of [-CAR.track/2,CAR.track/2])for(const z of [frontZ,rearZ]){
    const axle=new THREE.Group();axle.position.set(x,radius,z);group.add(axle);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,.195,28),rubber);tire.rotation.z=Math.PI/2;tire.castShadow=true;axle.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.196,.196,.018,24),chrome);rim.position.x=Math.sign(x)*.101;rim.rotation.z=Math.PI/2;axle.add(rim);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.024,16),trim);hub.position.x=Math.sign(x)*.113;hub.rotation.z=Math.PI/2;axle.add(hub);
    (z===frontZ?frontWheels:rearWheels).push(axle);
  }
  group.userData={frontWheels,rearWheels,lights,body,tireRadius:radius};return group;
}
class Batches{
  constructor(parent){this.parent=parent;this.items=new Map();}
  add(color,x,y,z,w,h,d,geometry=boxGeometry,angle=0){const key=color+'-'+geometry.id;let list=this.items.get(key);if(!list){list={mat:material(color),geometry,transforms:[]};this.items.set(key,list);}position.set(x,y,z);rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);scale.set(w,h,d);matrix.compose(position,rotation,scale);list.transforms.push(matrix.clone());}
  flush(){for(const {mat,geometry,transforms} of this.items.values()){const item=new THREE.InstancedMesh(geometry,mat,transforms.length);transforms.forEach((m,i)=>item.setMatrixAt(i,m));item.castShadow=true;item.receiveShadow=true;this.parent.add(item);}this.items.clear();}
}

export function createWorld(){
  const world=new THREE.Scene();world.background=new THREE.Color('#a9cee6');world.fog=new THREE.Fog('#c1d9e7',65,190);
  world.add(new THREE.HemisphereLight('#e4eff5','#8e9b7e',2.1));
  const sun=new THREE.DirectionalLight('#fff0d4',3.2);sun.position.set(-24,38,-12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;world.add(sun);world.add(sun.target);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(180,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#267bd4')},horizon:{value:new THREE.Color('#88bfe7')}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vPosition;uniform vec3 top;uniform vec3 horizon;void main(){vec3 d=normalize(vPosition);float h=pow(max(d.y,0.0),.55);vec3 c=mix(horizon,top,h);float sun=pow(max(dot(d,normalize(vec3(-24.,38.,-12.))),0.),300.);c+=vec3(1.,.86,.65)*sun*.55;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));sky.material.fog=false;world.add(sky);
  const street=new THREE.Group();world.add(street);
  const player=makeCar('#326576');world.add(player);
  const bay=new THREE.Group();world.add(bay);
  const guides=new THREE.Group();world.add(guides);
  return {world,sun,street,player,bay,guides,obstacles:[],side:null,scenario:null,roadMaterial:new THREE.MeshStandardMaterial({map:roadTexture(),roughness:1}),pavementMaterial:new THREE.MeshStandardMaterial({map:pavementTexture(),roughness:1})};
}

export function buildStreet(state,side){
  state.street.clear();const group=state.street,batch=new Batches(group);
  const ground=mesh(boxGeometry,'#9eaf8c',0,-.18,0,180,.2,250,group);ground.receiveShadow=true;
  const road=mesh(boxGeometry,state.roadMaterial,(ROAD.curb+ROAD.oppositeCurb)/2*side,-.035,0,ROAD.curb-ROAD.oppositeCurb,.07,180,group);road.name='road-surface';
  for(const sign of [-1,1]){
    const edge=sign>0?ROAD.curb:ROAD.oppositeCurb,sx=(edge+sign*(.1+ROAD.sidewalkWidth/2))*side;
    const walk=mesh(boxGeometry,state.pavementMaterial,sx,ROAD.curbHeight/2,0,ROAD.sidewalkWidth,ROAD.curbHeight,180,group);walk.name=sign>0?'parking-sidewalk':'opposite-sidewalk';
  }
  for(let z=-85;z<90;z+=1.5){batch.add(z%3?'#dfded5':'#d2d3ca',(ROAD.curb+.1)*side,ROAD.curbHeight/2,z,.2,ROAD.curbHeight,1.48);batch.add('#bdc6c4',(ROAD.oppositeCurb-.1)*side,ROAD.curbHeight/2,z,.2,ROAD.curbHeight,1.48);}
  for(const x of [ROAD.divider-.08,ROAD.divider+.08])batch.add('#ddbf62',x*side,.012,0,.09,.014,180);
  for(let z=-84;z<90;z+=6)for(const x of [ROAD.curb-ROAD.parkingWidth,ROAD.oppositeCurb+ROAD.parkingWidth])batch.add('#ebe8d9',x*side,.012,z,.1,.014,3);
  for(let i=0;i<14;i++)for(const bank of [-1,1]){
    const z=-68+i*10,ht=8+(i*7%9)*1.3;
    const right=bank===1,wall=(right?8.8:-10.3)*side,x=(right?12.9:-14.3)*side;
    const facade=['#d5d0c3','#bdc8c6','#d5d8d2','#b9c3c8','#c8c3b8'][(i+(right?1:0))%5];
    batch.add(facade,x,ht/2,z,8,ht,9.7);
    batch.add('#b5b8b1',x,ht+.1,z,8.3,.22,9.9);
    batch.add('#e1dfd5',wall-side*bank*.035,3.1,z,.18,.22,9.75);
    batch.add('#adb5b6',wall-side*bank*.08,.25,z,.13,.5,9.8);
    for(let y=4.1;y<ht-.7;y+=2.2)for(let dz=-3.1;dz<=3.2;dz+=2.05){
      batch.add('#e5e3d9',wall-side*bank*.04,y,z+dz,.15,1.5,1.18);
      batch.add((i+dz+y)%3>1?'#526a76':'#7495a2',wall-side*bank*.125,y,z+dz,.035,1.31,.99);
      batch.add('#a8b2b4',wall-side*bank*.15,y-.73,z+dz,.3,.09,1.3);
    }
    for(const dz of [-2.4,2.4]){batch.add('#566c73',wall-side*bank*.13,1.47,z+dz,.04,2.45,3.7);batch.add('#d7d9d0',wall-side*bank*.17,1.47,z+dz,.06,2.5,.07);}
    if(i%3===0){const sign=box(group,signTexture(['MORNING COFFEE','PARKSIDE','FLOWER & LEAF'][i%3],['#274f52','#3c526a','#556a50'][i%3],'#f5efdf'),wall-side*bank*.18,2.8,z,.05,.55,7.1);sign.material=Array(6).fill(material('#d9dacd'));const face=new THREE.Mesh(new THREE.PlaneGeometry(6.8,.5),signTexture(i%2?'PARKSIDE':'MORNING COFFEE','#2b5055','#f4eddb'));face.position.set(wall-side*bank*.22,2.8,z);face.rotation.y=right?-Math.PI/2:Math.PI/2;group.add(face);const canopy=box(group,'#597b6f',wall-side*bank*.72,2.6,z,1.3,.12,7.4);canopy.rotation.z=bank*side*.08;}
  }
  for(let i=0;i<12;i++)for(const bank of [-1,1]){
    const x=(bank===1?7.7:-9.2)*side,z=-50+i*10;
    batch.add('#77735d',x,1.65,z,.19,3.3,.19,cylinderGeometry);
    batch.add('#7e8b70',x,.24,z,1.55,.35,1.55);
    batch.add('#acb5a2',x,.1,z,1.8,.13,1.8);
    for(let j=0;j<7;j++){const theta=j*2.4,rx=Math.cos(theta)*.78,rz=Math.sin(theta)*.75,ry=3.3+(j%3)*.45;batch.add(['#5f7b57','#708b64','#7f996f'][j%3],x+rx,ry,z+rz,1.08,.99,1.1,sphereGeometry);}
    if(i%2===0){const polex=(bank===1?7.9:-9.4)*side;batch.add('#5d696b',polex,2.65,z+4,.075,5.3,.075,cylinderGeometry);batch.add('#697678',polex-bank*side*.55,5.25,z+4,1.1,.08,.12);batch.add('#e8e3d2',polex-bank*side*1.04,5.18,z+4,.5,.08,.24);}
  }
  for(const z of [-22,20]){batch.add('#596b6c',6.7*side,1.8,z,.035,3.6,.035,cylinderGeometry);const pole=box(group,signTexture('P  30 MIN','#2c6d6a','#ffffff'),6.7*side,3,z,.03,.7,.55);pole.castShadow=false;}
  for(const z of [-10,13]){batch.add('#758774',6.5*side,.28,z,.8,.5,1.7);for(let j=0;j<4;j++)batch.add('#668857',6.5*side,.65,z-.6+j*.4,.48,.5,.48,sphereGeometry);}
  // Background cars stay beyond the drivable +/-24 m practice boundary.
  state.backgroundCars??=[];
  for(const [i,z] of [-30,-43,-57,32,45].entries())for(const bank of [-1,1]){
    const index=i*2+(bank>0?1:0),parked=state.backgroundCars[index]??=makeCar(['#cbd2d4','#66808b','#ae806b','#c2b8a6'][i%4]);
    parked.position.set((bank>0?ROAD.curb-CAR.width/2-.3:ROAD.oppositeCurb+CAR.width/2+.3)*side,0,z);parked.rotation.y=bank<0?Math.PI:0;group.add(parked);
  }
  // People and street furniture give the road an independent metre-scale cue.
  for(const z of [-26,-47,28]){
    const x=6.7*side;batch.add('#4f6579',x,1.18,z,.36,.49,.21);
    batch.add('#34424d',x-.1,.55,z,.12,.8,.13);batch.add('#34424d',x+.1,.55,z,.12,.8,.13);
    batch.add('#b99778',x,1.59,z,.115,.14,.115,sphereGeometry);
    batch.add('#34424d',x-.11,.15,z-.035,.14,.09,.25);batch.add('#34424d',x+.11,.15,z-.035,.14,.09,.25);
  }
  for(const direction of [-1,1])for(const x of [-38,18,57])for(let i=0;i<5;i++){
    batch.add('#edf3f5',x+(i-2)*4.5,27+(i===2?3:i%2?1.3:0),direction*(115+i%2*4),4.2,2.5+(i===2?1.1:0),3.2,sphereGeometry);
  }
  batch.flush();state.side=side;
}

export function updateWorld(state,car,scenario,{guides=true,exam=false}={}){
  if(state.side!==scenario.side)buildStreet(state,scenario.side);
  if(state.scenario!==scenario){
    for(const v of state.obstacles){state.world.remove(v);v.traverse(item=>{if(item.geometry&&![boxGeometry,sphereGeometry,cylinderGeometry,carBodyGeometry].includes(item.geometry))item.geometry.dispose();});}state.obstacles=scenario.obstacles.map((p,i)=>{const v=makeCar(i?'#9b7d61':'#c3c8c7');v.position.set(p.x,0,-p.z);v.rotation.y=-p.angle;state.world.add(v);return v;});
    state.bay.clear();const tx=scenario.target.x,L=scenario.length,lineMat=new THREE.MeshBasicMaterial({color:'#ece9d2'});
    for(const x of [tx-scenario.target.width/2,tx+scenario.target.width/2])box(state.bay,lineMat,x,.016,0,.1,.018,L);
    for(const z of [-L/2,L/2])box(state.bay,lineMat,tx,.017,-z,scenario.target.width,.02,.1);
    state.scenario=scenario;
  }
  state.player.position.set(car.x,0,-car.z);state.player.rotation.y=-car.angle;const angles=frontWheelAngles(car.steer);for(const wheel of state.player.userData.frontWheels)wheel.rotation.y=-(wheel.position.x<0?angles.left:angles.right);
  state.bay.visible=true;
  const key=[car.x,car.z,car.angle,car.steer].map(n=>n.toFixed(3)).join(':');
  if(guides&&!exam&&state.guideKey!==key){
    const segments=[];let predicted={...car,gear:'R',speed:-.8},previous=null;
    for(let i=0;i<100;i++){
      predicted=step(predicted,{throttle:true,slow:true,holdSteering:true},1/30);
      const a=predicted.angle,point=sign=>[predicted.x+sign*(CAR.width/2-.06)*Math.cos(a)-(CAR.length/2-.1)*Math.sin(a),.035,-(predicted.z-sign*(CAR.width/2-.06)*Math.sin(a)-(CAR.length/2-.1)*Math.cos(a))];
      const pair=[point(-1),point(1)];if(previous)for(let j=0;j<2;j++)segments.push(...previous[j],...pair[j]);if(i%25===0)segments.push(...pair[0],...pair[1]);previous=pair;
    }
    for(const child of state.guides.children)child.geometry.dispose();state.guides.clear();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));state.guides.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#e4c471',depthTest:true})));state.guideKey=key;
  }
  state.guides.visible=guides&&!exam;
}

