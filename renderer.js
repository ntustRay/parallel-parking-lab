import { THREE, createWorld, updateWorld } from './scene.js';
import { CABIN } from './vehicle-spec.js';
import { CameraRig } from './camera-rig.js';
import { overviewLayout, positionWheel } from './render-layout.js';
import { loadVehicleAssets } from './model-assets.js';
import { createCockpit, updateCockpit } from './cockpit.js';

function engine(canvas, assets) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    if (window.parkingBoot) {
      window.parkingBoot.fail(
        '瀏覽器無法啟動 3D 圖形。請開啟圖形加速，或改用支援 WebGL 2 的瀏覽器。',
      );
      throw error;
    }
    document.body.classList.add('startup-failed');
    const notice = document.createElement('main');
    notice.id = 'startup-error';
    notice.innerHTML =
      '<span class="startup-mark" aria-hidden="true">P</span><h1>3D 場景未能啟動</h1><p>瀏覽器目前無法使用 WebGL 2。請檢查圖形加速設定，或改用支援 WebGL 2 的瀏覽器後再試。</p><button type="button">重新整理</button>';
    notice.querySelector('button').onclick = () => location.reload();
    document.body.append(notice);
    notice.querySelector('button').focus();
    throw error;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.autoClear = false;
  const overlay = new THREE.Scene(),
    overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const overlayMaterial = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    uniforms: {
      image: { value: null },
      size: { value: new THREE.Vector2(1, 1) },
      radius: { value: 18 },
    },
    vertexShader:
      'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `
    uniform sampler2D image;uniform vec2 size;uniform float radius;varying vec2 vUv;
    void main(){
      vec2 p=abs((vUv-.5)*size)-(size*.5-radius);float edge=length(max(p,0.))+min(max(p.x,p.y),0.)-radius;
      if(edge>0.)discard;
      gl_FragColor=texture2D(image,vec2(1.-vUv.x,vUv.y));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  });
  overlay.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), overlayMaterial));
  const state = createWorld(assets);
  state.cabin = createCockpit(assets.cabin);
  state.world.add(state.cabin);
  return {
    renderer,
    ...state,
    pixelRatio: Math.min(devicePixelRatio || 1, 1.5),
    slowFrames: 0,
    lastShadow: 0,
    panes: [],
    overlay,
    overlayCamera,
    overlayMaterial,
  };
}

// One WebGL context renders the windshield and mirror textures. GPU composition
// avoids synchronous canvas readbacks, even with large or enlarged mirrors.
export class Renderer {
  constructor(canvas, system) {
    this.system = system;
    this.canvas = canvas;
    this.main = canvas.id === 'world';
    this.view = 'driver';
    this.lookYaw = 0;
    this.lookPitch = 0;
    this.fov = 80;
    this.mirrorTilt = -14;
    if (!this.main) {
      this.target = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        depthBuffer: true,
        samples: 2,
      });
      this.system.panes.push(this);
      const side =
        canvas.id === 'mirror-left'
          ? 'left'
          : canvas.id === 'mirror-right'
            ? 'right'
            : null;
      if (side)
        this.system.cabin.userData.mirrorFaces[
          side
        ].material.uniforms.image.value = this.target.texture;
    }
    this.rig = new CameraRig();
    this.camera = this.rig.perspectiveCamera;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    this.w = this.canvas.clientWidth || innerWidth;
    this.h = this.canvas.clientHeight || innerHeight;
    this.dpr = this.system.pixelRatio;
    if (this.main) {
      this.system.renderer.setPixelRatio(this.dpr);
      this.system.renderer.setSize(this.w, this.h, false);
    } else
      this.target.setSize(
        Math.round(this.w * this.dpr),
        Math.round(this.h * this.dpr),
      );
  }
  adaptQuality(dt) {
    // Keep the mirrors large in CSS; reduce GPU work on slower devices instead.
    this.system.slowFrames =
      dt > 0.12
        ? this.system.slowFrames + 1
        : Math.max(0, this.system.slowFrames - 1);
    if (this.system.slowFrames < 3 || this.system.pixelRatio <= 0.7) return;
    this.system.slowFrames = 0;
    this.system.pixelRatio = Math.max(0.7, this.system.pixelRatio * 0.8);
    for (const pane of this.system.panes) {
      pane.target.samples = 0;
      pane.resize();
    }
    if (this.system.sun.shadow.mapSize.x > 1024) {
      this.system.sun.shadow.mapSize.set(1024, 1024);
      this.system.sun.shadow.map?.dispose();
      this.system.sun.shadow.map = null;
      this.system.renderer.shadowMap.needsUpdate = true;
    }
    this.resize();
  }
  pointCamera(car) {
    this.camera = this.rig.pointCamera(
      car,
      this,
      this.system.scenario,
      this.view === 'top' ? overviewLayout(this.h) : null,
    );
    if (this.main && this.view === 'driver')
      positionWheel(this.camera, car, this.w, this.h, THREE, CABIN);
  }
  draw(car, scenario, options = {}) {
    this.pointCamera(car);
    this.system.player.visible = this.view !== 'driver' && this.view !== 'rear';
    this.system.cabin.visible = this.view === 'driver';
    this.system.guides.visible =
      this.main &&
      Boolean(this.system.frameOptions.guides) &&
      !this.system.frameOptions.exam &&
      car.gear === 'R';
    const gpu = this.system.renderer;
    gpu.setRenderTarget(this.main ? null : this.target);
    gpu.setScissorTest(false);
    if (this.main) gpu.setViewport(0, 0, this.w, this.h);
    gpu.clear();
    gpu.render(this.system.world, this.camera);
    this.system.metrics.views++;
    if (this.main) {
      const panes = this.system.panes
        .filter((p) => !p.canvas.closest('[hidden]'))
        .sort(
          (a, b) =>
            Number(a.canvas.parentElement.classList.contains('expanded')) -
            Number(b.canvas.parentElement.classList.contains('expanded')),
        );
      const zoomed = panes.some((p) =>
        p.canvas.parentElement.classList.contains('expanded'),
      );
      document.body.classList.toggle('mirror-zoom', zoomed);
      gpu.setScissorTest(true);
      for (const pane of panes) {
        if (zoomed && !pane.canvas.parentElement.classList.contains('expanded'))
          continue;
        const rect = pane.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        gpu.setViewport(rect.x, this.h - rect.bottom, rect.width, rect.height);
        gpu.setScissor(rect.x, this.h - rect.bottom, rect.width, rect.height);
        this.system.overlayMaterial.uniforms.image.value = pane.target.texture;
        this.system.overlayMaterial.uniforms.size.value.set(
          rect.width,
          rect.height,
        );
        this.system.overlayMaterial.uniforms.radius.value =
          pane.view === 'rear' ? 9 : 15;
        gpu.render(this.system.overlay, this.system.overlayCamera);
      }
    }
  }
}

export async function createRenderSystem(canvas) {
  const assets = await loadVehicleAssets();
  const system = engine(canvas, assets);
  system.metrics = {
    frames: 0,
    worldUpdates: 0,
    views: 0,
    calls: 0,
    triangles: 0,
  };
  system.renderer.info.autoReset = false;
  return {
    main: new Renderer(canvas, system),
    createPane: (canvas) => new Renderer(canvas, system),
    metrics: system.metrics,
    beginFrame(car, scenario, options) {
      system.frameStart = performance.now();
      system.renderer.info.reset();
      system.frameOptions = options;
      updateWorld(system, car, scenario, options);
      system.metrics.frames++;
      system.metrics.worldUpdates++;
      system.metrics.views = 0;
      system.cabin.position.copy(system.player.position);
      system.cabin.rotation.y = -car.angle;
      updateCockpit(system.cabin, car, scenario, options);
      const shadowKey = [
        car.x,
        car.z,
        car.angle,
        car.steer,
        scenario.side,
        scenario.length,
      ].join(':');
      if (
        shadowKey !== system.shadowKey &&
        performance.now() - system.lastShadow > 130
      ) {
        system.renderer.shadowMap.needsUpdate = true;
        system.lastShadow = performance.now();
        system.shadowKey = shadowKey;
      }
    },
    endFrame() {
      system.metrics.cpuFrameMs = performance.now() - system.frameStart;
      system.metrics.calls = system.renderer.info.render.calls;
      system.metrics.triangles = system.renderer.info.render.triangles;
    },
  };
}
