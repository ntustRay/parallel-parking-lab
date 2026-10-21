import {THREE,createWorld,updateWorld} from './scene.js';
import {CAR} from './physics.js';
import {CABIN,createCockpit,updateCockpit} from './cockpit.js';

let shared;
function engine(canvas){
  let renderer;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
  catch(error){
    document.body.classList.add('startup-failed');
    const notice=document.createElement('main');notice.id='startup-error';
    notice.innerHTML='<span class="startup-mark" aria-hidden="true">P</span><h1>3D 場景未能啟動</h1><p>瀏覽器目前無法使用 WebGL 2。請檢查圖形加速設定，或改用支援 WebGL 2 的瀏覽器後再試。</p><button type="button">重新整理</button>';
    notice.querySelector('button').onclick=()=>location.reload();document.body.append(notice);notice.querySelector('button').focus();
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.setSize(innerWidth,innerHeight,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.autoClear=false;
  const overlay=new THREE.Scene(),overlayCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const overlayMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,transparent:true,uniforms:{image:{value:null},size:{value:new THREE.Vector2(1,1)},radius:{value:18}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',fragmentShader:`
    uniform sampler2D image;uniform vec2 size;uniform float radius;varying vec2 vUv;
    void main(){
      vec2 p=abs((vUv-.5)*size)-(size*.5-radius);float edge=length(max(p,0.))+min(max(p.x,p.y),0.)-radius;
      if(edge>0.)discard;
      gl_FragColor=texture2D(image,vec2(1.-vUv.x,vUv.y));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`});
  overlay.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),overlayMaterial));
  const state=createWorld();state.cabin=createCockpit();state.world.add(state.cabin);
  return {renderer,...state,pixelRatio:Math.min(devicePixelRatio||1,1.5),slowFrames:0,lastShadow:0,panes:[],overlay,overlayCamera,overlayMaterial};
}

// One WebGL context renders the windshield and mirror textures. GPU composition
// avoids synchronous canvas readbacks, even with large or enlarged mirrors.
export class Renderer{
  constructor(canvas){
    this.canvas=canvas;this.main=canvas.id==='world';this.view='driver';this.lookYaw=0;this.lookPitch=0;this.fov=80;this.mirrorTilt=-14;
    if(this.main)shared=engine(canvas);else{this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,depthBuffer:true,samples:2});shared.panes.push(this);const side=canvas.id==='mirror-left'?'left':canvas.id==='mirror-right'?'right':null;if(side)shared.cabin.userData.mirrorFaces[side].material.uniforms.image.value=this.target.texture;}
    this.perspectiveCamera=new THREE.PerspectiveCamera(45,1,.06,200);this.topCamera=new THREE.OrthographicCamera(-16,16,12,-12,.06,200);this.camera=this.perspectiveCamera;this.resize();window.addEventListener('resize',()=>this.resize());
  }
  resize(){
    this.w=this.canvas.clientWidth||innerWidth;this.h=this.canvas.clientHeight||innerHeight;this.dpr=shared.pixelRatio;
    if(this.main){shared.renderer.setPixelRatio(this.dpr);shared.renderer.setSize(this.w,this.h,false);}else this.target.setSize(Math.round(this.w*this.dpr),Math.round(this.h*this.dpr));
  }
  adaptQuality(dt){
    // Keep the mirrors large in CSS; reduce GPU work on slower devices instead.
    shared.slowFrames=dt>.12?shared.slowFrames+1:Math.max(0,shared.slowFrames-1);
    if(shared.slowFrames<3||shared.pixelRatio<=.7)return;
    shared.slowFrames=0;shared.pixelRatio=Math.max(.7,shared.pixelRatio*.8);
    for(const pane of shared.panes){pane.target.samples=0;pane.resize();}
    if(shared.sun.shadow.mapSize.x>1024){shared.sun.shadow.mapSize.set(1024,1024);shared.sun.shadow.map?.dispose();shared.sun.shadow.map=null;shared.renderer.shadowMap.needsUpdate=true;}
    this.resize();
  }
  pointCamera(car){
    const p=new THREE.Vector3(car.x,0,-car.z),f=new THREE.Vector3(Math.sin(car.angle),0,-Math.cos(car.angle)),r=new THREE.Vector3(Math.cos(car.angle),0,Math.sin(car.angle));
    this.camera=this.view==='top'?this.topCamera:this.perspectiveCamera;
    let eye,target;this.camera.up.set(0,1,0);const aspect=this.w/this.h;let horizontalFov=65;
    if(this.view==='mirror-left'||this.view==='mirror-right'){
      const sign=this.view==='mirror-left'?-1:1;
      eye=p.clone().addScaledVector(r,sign*(CAR.width/2+.13)).addScaledVector(f,CABIN.mirrorForward);eye.y=CABIN.mirrorHeight;
      target=eye.clone().addScaledVector(f,-12).addScaledVector(r,sign*3.5);target.y+=Math.tan(this.mirrorTilt*Math.PI/180)*12;horizontalFov=64;
    }else if(this.view==='rear'){
      eye=p.clone().addScaledVector(f,-.6);eye.y=1.3;target=eye.clone().addScaledVector(f,-18);target.y=.4;horizontalFov=72;
    }else if(this.view==='driver'){
      eye=p.clone().addScaledVector(r,CABIN.eyeX).addScaledVector(f,CABIN.eyeForward);eye.y=CABIN.eyeHeight;
      const yaw=car.angle+this.lookYaw,pitch=CABIN.pitch+this.lookPitch;target=eye.clone().add(new THREE.Vector3(Math.sin(yaw)*18,Math.tan(pitch)*18,-Math.cos(yaw)*18));horizontalFov=this.fov;
    }else if(this.view==='top'){
      eye=new THREE.Vector3(.3,31,.001);target=new THREE.Vector3(.3,0,0);this.camera.up.set(0,0,-1);horizontalFov=65;
    }else if(this.view==='chase'){
      eye=p.clone().addScaledVector(f,-10);eye.y=6.5;target=p.clone().addScaledVector(f,3);horizontalFov=70;
    }else{
      eye=new THREE.Vector3(-15*(shared.side||1),19,19);target=new THREE.Vector3(shared.side||1,0,-.5);horizontalFov=70;
    }
    if(this.view==='top'){const halfHeight=Math.max(12,16/aspect);this.camera.left=-halfHeight*aspect;this.camera.right=halfHeight*aspect;this.camera.top=halfHeight;this.camera.bottom=-halfHeight;}
    this.camera.aspect=aspect;this.camera.fov=Math.min(this.view==='driver'?90:150,THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(horizontalFov)/2)/aspect)));
    this.camera.position.copy(eye);this.camera.lookAt(target);this.camera.updateProjectionMatrix();
    this.camera.updateMatrixWorld();
    if(this.main&&this.view==='driver'){
      const local=new THREE.Vector3(CABIN.wheelX,CABIN.wheelY,CABIN.wheelZ).applyAxisAngle(new THREE.Vector3(0,1,0),-car.angle).add(p);
      const top=local.clone().add(new THREE.Vector3(0,CABIN.wheelRadius,0)),bottom=local.clone().add(new THREE.Vector3(0,-CABIN.wheelRadius,0));
      const center=local.project(this.camera),a=top.project(this.camera),b=bottom.project(this.camera);
      const size=Math.abs(a.y-b.y)*this.h/2;
      document.body.style.setProperty('--wheel-x',`${(center.x+1)*this.w/2}px`);document.body.style.setProperty('--wheel-y',`${(1-center.y)*this.h/2}px`);document.body.style.setProperty('--wheel-size',`${size}px`);
      document.body.style.setProperty('--wheel-visible',center.z>-1&&center.z<1&&Math.abs(center.x)<1.5?'visible':'hidden');
    }
  }
  draw(car,scenario,options={}){
    updateWorld(shared,car,scenario,options);this.pointCamera(car);shared.player.visible=this.view!=='driver'&&this.view!=='rear';
    shared.cabin.visible=this.view==='driver';
    if(shared.cabin.visible){shared.cabin.position.copy(shared.player.position);shared.cabin.rotation.y=-car.angle;updateCockpit(shared.cabin,car,scenario,options);}
    const gpu=shared.renderer;
    const shadowKey=[car.x,car.z,car.angle,car.steer,scenario.side,scenario.length].join(':');
    if(shadowKey!==shared.shadowKey&&performance.now()-shared.lastShadow>130){gpu.shadowMap.needsUpdate=true;shared.lastShadow=performance.now();shared.shadowKey=shadowKey;}
    gpu.setRenderTarget(this.main?null:this.target);gpu.setScissorTest(false);
    if(this.main)gpu.setViewport(0,0,this.w,this.h);
    gpu.clear();gpu.render(shared.world,this.camera);
    if(this.main){
      const panes=shared.panes.filter(p=>!p.canvas.closest('[hidden]')).sort((a,b)=>Number(a.canvas.parentElement.classList.contains('expanded'))-Number(b.canvas.parentElement.classList.contains('expanded')));
      const zoomed=panes.some(p=>p.canvas.parentElement.classList.contains('expanded'));document.body.classList.toggle('mirror-zoom',zoomed);
      gpu.setScissorTest(true);for(const pane of panes){
        if(zoomed&&!pane.canvas.parentElement.classList.contains('expanded'))continue;
        const rect=pane.canvas.getBoundingClientRect();if(!rect.width||!rect.height)continue;
        gpu.setViewport(rect.x,this.h-rect.bottom,rect.width,rect.height);gpu.setScissor(rect.x,this.h-rect.bottom,rect.width,rect.height);
        shared.overlayMaterial.uniforms.image.value=pane.target.texture;shared.overlayMaterial.uniforms.size.value.set(rect.width,rect.height);shared.overlayMaterial.uniforms.radius.value=pane.view==='rear'?9:15;
        gpu.render(shared.overlay,shared.overlayCamera);
      }
    }
  }
}

