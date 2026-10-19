import {test,expect} from './fixture.js';
import fs from 'node:fs/promises';

async function probe(page){
  const html=await fs.readFile(new URL('../_site/index.html',import.meta.url),'utf8');
  const game=html.match(/src="(game\.[a-f0-9]+\.js)"/)[1];
  await page.route('**/geometry-probe',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><style>body{margin:0}canvas{position:fixed;inset:0;width:100%;height:100%}</style><canvas id="world"></canvas>'}));
  await page.goto('/geometry-probe');
  return {scene:'/'+game.replace('game.','scene.'),physics:'/'+game.replace('game.','physics.'),renderer:'/'+game.replace('game.','renderer.'),cockpit:'/'+game.replace('game.','cockpit.')};
}

test('sedan touches the ground, has exposed wheel arches and matches physical dimensions',async({page})=>{
  const urls=await probe(page);
  const data=await page.evaluate(async urls=>{
    const {makeCar,THREE}=await import(urls.scene),{CAR,scenario}=await import(urls.physics),car=makeCar('#e4e7e8');car.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(car),size=bounds.getSize(new THREE.Vector3()),body=new THREE.Box3().setFromObject(car.userData.body).getSize(new THREE.Vector3());
    const front=car.userData.frontWheels[0].getWorldPosition(new THREE.Vector3()),rear=car.userData.rearWheels[0].getWorldPosition(new THREE.Vector3());
    const blockedAt=y=>new THREE.Raycaster(new THREE.Vector3(2,y,front.z),new THREE.Vector3(-1,0,0)).intersectObject(car.userData.body).length>0;
    return {ground:bounds.min.y,height:size.y,width:body.x,length:body.z,wheelbase:rear.z-front.z,tireRadius:car.userData.tireRadius,archBlocked:blockedAt(.4),upperFender:blockedAt(.8),bay:scenario().target,car:CAR};
  },urls);
  expect(data.ground).toBeCloseTo(0,6);expect(data.height).toBeCloseTo(data.car.height,6);
  expect(data.length).toBeCloseTo(data.car.length,6);expect(data.width).toBeCloseTo(data.car.width,6);expect(data.wheelbase).toBeCloseTo(data.car.wheelbase,8);
  expect(data.tireRadius).toBeCloseTo(.317,3);expect(data.archBlocked).toBe(false);expect(data.upperFender).toBe(true);
  expect(data.bay.length).toBe(6);expect(data.bay.width).toBe(2.5);
});

test('driver eye stays inside the shell, with a stable horizon across lenses and headings',async({page})=>{
  await page.setViewportSize({width:1672,height:941});const urls=await probe(page);
  const data=await page.evaluate(async urls=>{
    const {Renderer}=await import(urls.renderer),{CAR,scenario}=await import(urls.physics),{CABIN}=await import(urls.cockpit),{THREE}=await import(urls.scene);
    const renderer=new Renderer(document.querySelector('#world')),poses=[];
    for(const heading of [0,Math.PI/2])for(const fov of [65,80,95]){
      const car={...scenario().start,angle:heading};renderer.fov=fov;renderer.pointCamera(car);
      const horizon=new THREE.Vector3(car.x+Math.sin(heading)*10000,renderer.camera.position.y, -car.z-Math.cos(heading)*10000).project(renderer.camera);
      poses.push({height:renderer.camera.position.y,horizon:(1-horizon.y)/2,wheelVisible:document.body.style.getPropertyValue('--wheel-visible')});
    }
    return {poses,eye:CABIN.eyeHeight,ceiling:CAR.height-.08,offset:CABIN.eyeX,bodyWidth:CAR.width};
  },urls);
  expect(Math.abs(data.offset)).toBeLessThan(data.bodyWidth/2);expect(data.ceiling-data.eye).toBeGreaterThan(.15);
  for(const p of data.poses){expect(p.height).toBe(data.eye);expect(p.horizon).toBeGreaterThan(.25);expect(p.horizon).toBeLessThan(.45);expect(p.wheelVisible).toBe('visible');}
});
