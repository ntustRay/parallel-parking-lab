import {test,expect} from './fixture.js';
async function start(page){await page.goto('/');await expect(page.locator('.footnote strong')).toHaveText('W／↑ 油門，S／↓／Space 煞車；R 檔倒車。');await page.locator('#start').click();}
test('first person starts quiet, with larger aligned side mirrors and a high central mirror',async({page})=>{
  await start(page);
  for(const selector of ['#coach','.steer-adjust','.look-controls','.camera','.keyboard-hint','#wheel-value'])await expect(page.locator(selector)).not.toBeVisible();
  const left=await page.locator('.mirror-left').boundingBox(),right=await page.locator('.mirror-right').boundingBox(),rear=await page.locator('.mirror-center').boundingBox();
  expect(left.width).toBeGreaterThanOrEqual(300);expect(left.width).toBe(right.width);
  expect(left.y+left.height/2).toBeCloseTo(right.y+right.height/2,1);expect(left.height).toBeCloseTo(right.height,1);
  expect(rear.y+rear.height).toBeLessThan(left.y);expect(rear.x+rear.width/2).toBeCloseTo(720,1);
  await page.locator('#hud-toggle').click();await expect(page.locator('#coach')).toBeVisible();
});
test('mouse drag and held keys return the head gradually without an explicit centre action',async({page})=>{
  await start(page);
  await page.mouse.move(710,280);await page.mouse.down();await page.mouse.move(960,330,{steps:8});await page.mouse.up();
  await expect(page.locator('#look-label')).toHaveText(/右側/);await expect(page.locator('#look-label')).toHaveText('正前方',{timeout:4000});
  for(const key of ['j','l']){
    await page.keyboard.down(key);await expect(page.locator('#look-label')).toHaveText(key==='j'?'左側 75°':'右側 75°');await page.keyboard.up(key);
    await expect(page.locator('#look-label')).not.toHaveText('正前方');await expect(page.locator('#look-label')).toHaveText('正前方',{timeout:4000});
  }
  await expect(page.locator('#steer-value')).toHaveText('回正');
});
test('rendered road, parking strips and collision boundary share metre dimensions',async({page})=>{
  await start(page);
  const data=await page.evaluate(async()=>{
    const url=document.querySelector('script[type=module]').src;
    const {ROAD,scenario,collision}=await import(url.replace('game.','physics.'));
    const {createWorld,updateWorld}=await import(url.replace('game.','scene.'));
    const s=scenario(),world=createWorld();updateWorld(world,s.start,s,{guides:false});const road=world.street.getObjectByName('road-surface');
    return {ROAD,width:road.scale.x,centre:road.position.x,leftLane:ROAD.divider-(ROAD.oppositeCurb+ROAD.parkingWidth),rightLane:ROAD.curb-ROAD.parkingWidth-ROAD.divider,blocked:collision({...s.start,x:ROAD.oppositeCurb+.5},s)};
  });
  expect(data.width).toBe(11.5);expect(data.centre).toBe(-.75);expect(data.leftLane).toBe(3.25);expect(data.rightLane).toBe(3.25);expect(data.blocked).toBe(true);
});
