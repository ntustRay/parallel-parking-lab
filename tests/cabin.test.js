import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.min.js';
import {CABIN,createCockpit} from '../cockpit.js';
import {CABIN_BOUNDS,createCabinShell} from '../cabin-shell.js';
import {loadModel} from './load-model.mjs';

const model=await loadModel('sedan-cabin.glb');

// Canvas textures don't need a GPU to construct geometry. Only the texture
// allocation is stubbed; intersections use the actual assembled Three meshes.
function cockpit(){
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})};
  try{return createCockpit(model);}finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
}
const cabin=cockpit();cabin.updateMatrixWorld(true);
const eye=new THREE.Vector3(CABIN.eyeX,CABIN.eyeHeight,-CABIN.eyeForward);
function hits(group,from,to){
  const target=new THREE.Vector3(...to),direction=target.clone().sub(from);
  return new THREE.Raycaster(from,direction.normalize(),.06,from.distanceTo(target)+.005).intersectObject(group,true);
}

test('the assembled driver cabin closes both door skins and their lower seams',()=>{
  const {halfWidth:h}=CABIN_BOUNDS;
  for(const side of [-1,1])for(const y of [.34,.43,.64,.82])for(const z of [-.97,-.6,-.1,.34,.65,.96,1.15]){
    assert.ok(hits(cabin,eye,[side*(h+.05),y,z]).length,`street leak through door: ${side},${y},${z}`);
  }
});

test('floor, firewall, roof and rear bulkhead cover the full occupied cabin',()=>{
  const shell=createCabinShell();shell.updateMatrixWorld(true);
  for(const x of [-.69,-.3,0,.3,.69])for(const z of [-.96,-.4,.2,.7,1.10]){
    assert.ok(hits(shell,new THREE.Vector3(x,1.16,z),[x,.25,z]).length,`floor leak: ${x},${z}`);
  }
  for(const x of [-.69,0,.69])for(const y of [.34,.55,.82]){
    assert.ok(hits(shell,eye,[x,y,-1.08]).length,'closed firewall');
    assert.ok(hits(shell,eye,[x,y,1.22]).length,'closed rear bulkhead');
  }
  for(const x of [-.56,0,.56])for(const z of [-.38,.1,.64])assert.ok(hits(shell,eye,[x,1.42,z]).length,'closed roof');
});

test('the windscreen and side/rear windows remain open above the trim',()=>{
  for(const target of [[-.4,1.18,-1.1],[-.76,1.19,-.15],[.76,1.22,-.05],[0,1.22,1.25]]){
    assert.equal(hits(cabin,eye,target).length,0,`window blocked: ${target}`);
  }
});

test('supported head turns keep the eye clear of seat backs and near-plane clipping',()=>{
  for(let yaw=-155;yaw<=155;yaw+=5)for(const pitch of [-.39,-.17,.10]){
    const direction=new THREE.Vector3(Math.sin(yaw*Math.PI/180),Math.tan(pitch),-Math.cos(yaw*Math.PI/180)).normalize();
    const result=new THREE.Raycaster(eye,direction,0,.065).intersectObject(cabin,true);
    assert.equal(result.length,0,`near-plane intersection: ${yaw},${pitch}`);
  }
});
