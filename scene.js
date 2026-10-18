import * as THREE from './vendor/three.module.min.js';
import {step} from './physics.js';
export {THREE};

const boxGeometry=new THREE.BoxGeometry(1,1,1);
const sphereGeometry=new THREE.SphereGeometry(1,12,9);
const cylinderGeometry=new THREE.CylinderGeometry(1,1,1,16);
const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3();
const materials=new Map();
function material(color,roughness=.85,metalness=0){const key=`${color}-${roughness}-${metalness}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
function mesh(geometry,color,x,y,z,w=1,h=1,d=1,parent){const item=new THREE.Mesh(geometry,typeof color==='string'?material(color):color);item.position.set(x,y,z);item.scale.set(w,h,d);item.castShadow=true;item.receiveShadow=true;parent.add(item);return item;}
function box(parent,color,x,y,z,w,h,d){return mesh(boxGeometry,color,x,y,z,w,h,d,parent);}

function roadTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);let seed=9211;for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const shade=82+(seed%24);pixels.data[i]=shade;pixels.data[i+1]=shade+3;pixels.data[i+2]=shade+5;pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(8,70);texture.colorSpace=THREE.SRGBColorSpace;return texture;}
function pavementTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#b7bab4';c.fillRect(0,0,256,256);for(let y=0;y<256;y+=32)for(let x=-32;x<256;x+=64){const offset=y%64?32:0;c.fillStyle=(x+y)%3?'#c3c6bf':'#bec2ba';c.fillRect(x+offset+1,y+1,62,30);}const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,62);t.colorSpace=THREE.SRGBColorSpace;return t;}
function signTexture(text,background,foreground){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const c=canvas.getContext('2d');c.fillStyle=background;c.fillRect(0,0,512,128);c.strokeStyle=foreground+'66';c.lineWidth=3;c.strokeRect(10,10,492,108);c.font='600 44px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle=foreground;c.fillText(text,256,65);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshStandardMaterial({map:t,roughness:.8});}

// Rounded geometry uses real curved normals, rather than a stack of cuboids.
function roundedBox(w,h,d,r=.12){const geometry=new THREE.BoxGeometry(w,h,d,8,5,12),p=geometry.attributes.position,v=new THREE.Vector3(),center=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);center.set(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));v.sub(center).normalize().multiplyScalar(r).add(center);p.setXYZ(i,v.x,v.y,v.z);}geometry.computeVertexNormals();return geometry;}
function quad(parent,points,mat){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();const m=new THREE.Mesh(geometry,mat);m.material.side=THREE.DoubleSide;m.castShadow=true;parent.add(m);return m;}
export function makeCar(color){
  const group=new THREE.Group(),paint=material(color,.28,.48),rubber=material('#20252a',.96),chrome=material('#adb9bf',.24,.8),glass=material('#243d4b',.15,.35),trim=material('#2c3337',.55);
  mesh(roundedBox(1.8,.52,4.5,.17),paint,0,.63,0,1,1,1,group);
  mesh(roundedBox(1.73,.15,1.35,.07),paint,0,.94,-1.5,1,1,1,group);
  mesh(roundedBox(1.7,.13,.8,.06),paint,0,.93,1.77,1,1,1,group);
  const b=1.06,t=.72,top=.64,bottom=.78;
  quad(group,[[-bottom,.94,-b],[bottom,.94,-b],[top,1.52,-t],[-top,1.52,-t]],glass);
  quad(group,[[bottom,.94,b],[-bottom,.94,b],[-top,1.52,t],[top,1.52,t]],glass);
  for(const side of [-1,1]){
    quad(group,[[side*bottom,.95,b],[side*bottom,.95,-b],[side*top,1.52,-t],[side*top,1.52,t]],glass);
    const pillar=box(group,paint,side*.72,1.24,0,.07,.57,.08);pillar.rotation.z=side*.2;
    box(group,trim,side*.805,.96,0,.04,.045,2.1);
    box(group,chrome,side*.899,.76,.55,.025,.035,.21);box(group,chrome,side*.899,.76,-.6,.025,.035,.21);
    mesh(roundedBox(.22,.14,.3,.055),paint,side*.97,1.07,-.64,1,1,1,group);
    box(group,trim,side*.9,.43,0,.035,.1,3.7);
  }
  mesh(roundedBox(1.35,.105,1.48,.045),paint,0,1.57,0,1,1,1,group);
  box(group,trim,0,.53,-2.255,.9,.2,.02);box(group,chrome,0,.65,-2.266,.87,.025,.02);
  const lights=[];
  for(const side of [-1,1]){
    const head=box(group,new THREE.MeshStandardMaterial({color:'#f5f1d9',emissive:'#efe7c7',emissiveIntensity:.45}),side*.6,.76,-2.24,.47,.12,.06);
    head.rotation.y=side*.1;
    const tail=box(group,new THREE.MeshStandardMaterial({color:'#bc3e35',emissive:'#9c231c',emissiveIntensity:.35}),side*.62,.75,2.24,.46,.12,.05);lights.push(tail);
    box(group,chrome,side*.57,.52,2.25,.4,.025,.025);
  }
  box(group,material('#e5e7e1'),0,.58,2.265,.43,.11,.02);
  const frontWheels=[];
  for(const x of [-.88,.88])for(const z of [-1.35,1.35]){
    const axle=new THREE.Group();axle.position.set(x,.36,z);group.add(axle);
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.22,28),rubber);tire.rotation.z=Math.PI/2;tire.castShadow=true;axle.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.025,24),chrome);rim.position.x=Math.sign(x)*.123;rim.rotation.z=Math.PI/2;axle.add(rim);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.035,16),trim);hub.position.x=Math.sign(x)*.14;hub.rotation.z=Math.PI/2;axle.add(hub);
    if(z<0)frontWheels.push(axle);
  }
  group.userData={frontWheels,lights};return group;
}

class Batches{
  constructor(parent){this.parent=parent;this.items=new Map();}
  add(color,x,y,z,w,h,d,geometry=boxGeometry,angle=0){const key=color+'-'+geometry.id;let list=this.items.get(key);if(!list){list={mat:material(color),geometry,transforms:[]};this.items.set(key,list);}position.set(x,y,z);rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);scale.set(w,h,d);matrix.compose(position,rotation,scale);list.transforms.push(matrix.clone());}
  flush(){for(const {mat,geometry,transforms} of this.items.values()){const item=new THREE.InstancedMesh(geometry,mat,transforms.length);transforms.forEach((m,i)=>item.setMatrixAt(i,m));item.castShadow=true;item.receiveShadow=true;this.parent.add(item);}this.items.clear();}
}

export function createWorld(){
  const world=new THREE.Scene();world.background=new THREE.Color('#cbdde6');world.fog=new THREE.Fog('#cbdde6',45,145);
  world.add(new THREE.HemisphereLight('#e4eff5','#8e9b7e',2.1));
  const sun=new THREE.DirectionalLight('#fff0d4',3.2);sun.position.set(-24,38,-12);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.camera.near=1;sun.shadow.camera.far=100;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;sun.shadow.radius=3;world.add(sun);world.add(sun.target);
  const sky=new THREE.Mesh(new THREE.SphereGeometry(180,24,12),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#75a6cb')},horizon:{value:new THREE.Color('#e7eef0')}},vertexShader:'varying vec3 vPosition;void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vPosition;uniform vec3 top;uniform vec3 horizon;void main(){vec3 d=normalize(vPosition);float h=pow(max(d.y,0.0),.55);vec3 c=mix(horizon,top,h);float sun=pow(max(dot(d,normalize(vec3(-24.,38.,-12.))),0.),300.);c+=vec3(1.,.86,.65)*sun*.55;gl_FragColor=vec4(c,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'}));sky.material.fog=false;world.add(sky);
  const street=new THREE.Group();world.add(street);
  const player=makeCar('#326576');world.add(player);
  const bay=new THREE.Group();world.add(bay);
  const guides=new THREE.Group();world.add(guides);
  return {world,sun,street,player,bay,guides,obstacles:[],side:null,scenario:null,roadMaterial:new THREE.MeshStandardMaterial({map:roadTexture(),roughness:1}),pavementMaterial:new THREE.MeshStandardMaterial({map:pavementTexture(),roughness:1})};
}

export function buildStreet(state,side){
  state.street.clear();const group=state.street,batch=new Batches(group);
  const ground=mesh(boxGeometry,'#9eaf8c',0,-.18,0,180,.2,250,group);ground.receiveShadow=true;
  mesh(boxGeometry,state.roadMaterial,-1.5*side,-.035,0,13,.07,180,group);
  for(const sign of [-1,1]){
    const sx=sign===1?7.15*side:-10*side;
    mesh(boxGeometry,state.pavementMaterial,sx,.045,0,sign===1?4.1:4,.09,180,group);
  }
  for(let z=-85;z<90;z+=1.5){batch.add(z%3?'#dfded5':'#d2d3ca',5.1*side,.105,z,.2,.21,1.48);batch.add('#bdc6c4',-8.1*side,.1,z,.2,.2,1.48);}
  for(let z=-84;z<90;z+=6){batch.add('#ece8d4',-2.5*side,.012,z,.12,.014,2.8);batch.add('#ebe8d9',-7.7*side,.012,z,.1,.014,6);}
  for(let i=0;i<14;i++)for(const bank of [-1,1]){
    const z=-68+i*10,ht=7+(i*7%5)*1.25;
    const right=bank===1,wall=(right?10.1:-12.2)*side,x=(right?14.2:-16.2)*side;
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
    const x=(bank===1?7.5:-9.8)*side,z=-50+i*10;
    batch.add('#77735d',x,1.65,z,.19,3.3,.19,cylinderGeometry);
    batch.add('#7e8b70',x,.24,z,1.55,.35,1.55);
    batch.add('#acb5a2',x,.1,z,1.8,.13,1.8);
    for(let j=0;j<7;j++){const theta=j*2.4,rx=Math.cos(theta)*.78,rz=Math.sin(theta)*.75,ry=3.3+(j%3)*.45;batch.add(['#5f7b57','#708b64','#7f996f'][j%3],x+rx,ry,z+rz,1.08,.99,1.1,sphereGeometry);}
    if(i%2===0){const polex=(bank===1?8.2:-10.5)*side;batch.add('#5d696b',polex,2.65,z+4,.075,5.3,.075,cylinderGeometry);batch.add('#697678',polex-bank*side*.55,5.25,z+4,1.1,.08,.12);batch.add('#e8e3d2',polex-bank*side*1.04,5.18,z+4,.5,.08,.24);}
  }
  for(const z of [-22,20]){batch.add('#596b6c',6.7*side,1.8,z,.035,3.6,.035,cylinderGeometry);const pole=box(group,signTexture('P  30 MIN','#2c6d6a','#ffffff'),6.7*side,3,z,.03,.7,.55);pole.castShadow=false;}
  for(const z of [-10,13]){batch.add('#758774',6.5*side,.28,z,.8,.5,1.7);for(let j=0;j<4;j++)batch.add('#668857',6.5*side,.65,z-.6+j*.4,.48,.5,.48,sphereGeometry);}
  batch.flush();state.side=side;
}

export function updateWorld(state,car,scenario,{guides=true,exam=false}={}){
  if(state.side!==scenario.side)buildStreet(state,scenario.side);
  if(state.scenario!==scenario){
    state.obstacles.forEach(v=>{state.world.remove(v);v.traverse(item=>{if(item.geometry&&![boxGeometry,sphereGeometry,cylinderGeometry].includes(item.geometry))item.geometry.dispose();});});state.obstacles=scenario.obstacles.map((p,i)=>{const v=makeCar(i?'#9b7d61':'#c3c8c7');v.position.set(p.x,0,-p.z);v.rotation.y=-p.angle;state.world.add(v);return v;});
    state.bay.clear();const tx=scenario.target.x,L=scenario.length,lineMat=new THREE.MeshBasicMaterial({color:'#ece9d2'});
    for(const x of [tx-1.1,tx+1.1])box(state.bay,lineMat,x,.016,0,.07,.018,L);
    for(const z of [-L/2,L/2])box(state.bay,lineMat,tx,.017,-z,2.2,.02,.09);
    state.scenario=scenario;
  }
  state.player.position.set(car.x,0,-car.z);state.player.rotation.y=-car.angle;for(const wheel of state.player.userData.frontWheels)wheel.rotation.y=-car.steer*35*Math.PI/180;
  state.bay.visible=true;
  const key=[car.x,car.z,car.angle,car.steer].map(n=>n.toFixed(3)).join(':');
  if(guides&&!exam&&state.guideKey!==key){
    const segments=[];let predicted={...car,gear:'R',speed:-.8},previous=null;
    for(let i=0;i<100;i++){
      predicted=step(predicted,{throttle:true,slow:true},1/30);
      const a=predicted.angle,point=sign=>[predicted.x+sign*.84*Math.cos(a)-2.1*Math.sin(a),.035,-(predicted.z-sign*.84*Math.sin(a)-2.1*Math.cos(a))];
      const pair=[point(-1),point(1)];if(previous)for(let j=0;j<2;j++)segments.push(...previous[j],...pair[j]);if(i%25===0)segments.push(...pair[0],...pair[1]);previous=pair;
    }
    state.guides.children.forEach(child=>child.geometry.dispose());state.guides.clear();
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(segments,3));state.guides.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#e4c471',depthTest:true})));state.guideKey=key;
  }
  state.guides.visible=guides&&!exam;
}
