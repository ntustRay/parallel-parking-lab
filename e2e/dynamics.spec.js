import {test,expect} from './fixture.js';
async function start(page){await page.goto('/');await page.getByRole('button',{name:'開始練習',exact:true}).click();}
const speed=async page=>Number(await page.locator('#speed').textContent());
test('D and R creep without gas, Space holds still and release resumes motion',async({page})=>{
  await start(page);
  for(const gear of ['D','R']){
    await page.keyboard.down('Space');await expect(page.locator('#speed')).toHaveText('0.0');
    await page.locator(`[data-gear=${gear}]`).click();await expect(page.locator('#drive-state')).toHaveText('煞車中');
    await page.keyboard.up('Space');await expect.poll(()=>speed(page)).toBeGreaterThan(.5);
    await expect(page.locator('#throttle')).not.toHaveClass(/pressed/);
    await expect(page.locator('#drive-state')).toHaveText('鬆煞車即蠕行');
  }
  await page.keyboard.down('Space');await expect(page.locator('#speed')).toHaveText('0.0');
  await page.locator('[data-gear=P]').click();await page.keyboard.up('Space');
  await expect(page.locator('#drive-state')).toHaveText('停車鎖定');await expect(page.locator('#speed')).toHaveText('0.0');
});
test('releasing the moving wheel returns it progressively, stationary wheel keeps its angle',async({page})=>{
  await start(page);await page.locator('#full-right').click();
  await expect(page.locator('#wheel-value')).toHaveText('方向盤右 1.50 圈');
  await page.waitForTimeout(200);await expect(page.locator('#wheel-value')).toHaveText('方向盤右 1.50 圈');
  await page.locator('[data-gear=D]').click();
  await expect.poll(async()=>await page.locator('#wheel-value').textContent()).not.toBe('方向盤右 1.50 圈');
  // Release begins visibly off-centre, then converges rather than snapping to zero.
  await expect(page.locator('#wheel-value')).not.toHaveText('方向盤置中');
  await expect(page.locator('#wheel-value')).toHaveText('方向盤置中',{timeout:8000});
});
test('rendered body, axles, bay lines and tire angles use physics dimensions',async({page})=>{
  await start(page);
  const data=await page.evaluate(async()=>{
    const gameURL=document.querySelector('script[type=module]').src;
    const {makeCar,THREE,createWorld,updateWorld}=await import(gameURL.replace('game.','scene.'));
    const {CAR,scenario,frontWheelAngles}=await import(gameURL.replace('game.','physics.'));
    const visual=makeCar('#326576');visual.updateMatrixWorld(true);
    const size=new THREE.Box3().setFromObject(visual.children[0]).getSize(new THREE.Vector3());
    const axles=visual.children.filter(v=>v.type==='Group').map(v=>v.getWorldPosition(new THREE.Vector3()));
    const scene=scenario(),world=createWorld();updateWorld(world,{...scene.start,steer:1},scene,{guides:false});
    const lines=world.bay.children;
    return {size:{x:size.x,z:size.z},length:CAR.length,width:CAR.width,wheelbase:CAR.wheelbase,
      axleSpan:Math.max(...axles.map(v=>v.z))-Math.min(...axles.map(v=>v.z)),
      bayWidth:Math.abs(lines[1].position.x-lines[0].position.x),bayLength:Math.abs(lines[3].position.z-lines[2].position.z),
      target:scene.target,wheels:world.player.userData.frontWheels.map(v=>v.rotation.y),expected:frontWheelAngles(1)};
  });
  expect(data.size.x).toBeCloseTo(data.width,5);expect(data.size.z).toBeCloseTo(data.length,5);
  expect(data.axleSpan).toBeCloseTo(data.wheelbase,8);expect(data.bayWidth).toBe(data.target.width);expect(data.bayLength).toBe(data.target.length);
  expect(data.wheels[0]).toBeCloseTo(-data.expected.left,8);expect(data.wheels[1]).toBeCloseTo(-data.expected.right,8);
});
