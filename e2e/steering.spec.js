import {test,expect} from './fixture.js';
async function start(page){await page.goto('/');await page.getByRole('button',{name:'開始練習',exact:true}).click();}
test('dragging the wheel turns progressively and X recenters wheel and tires',async({page},info)=>{
  await start(page);const b=await page.locator('#wheel').boundingBox(),cx=b.x+b.width/2,cy=b.y+b.height/2,r=b.width*.41;
  await page.mouse.move(cx,cy-r);await page.mouse.down();
  for(let a=-80;a<=0;a+=10)await page.mouse.move(cx+Math.cos(a*Math.PI/180)*r,cy+Math.sin(a*Math.PI/180)*r);
  await page.mouse.up();await expect(page.locator('#steer-value')).toHaveText('右 6°');await expect(page.locator('#wheel-value')).toHaveText('方向盤右 0.25 圈');
  await page.screenshot({path:info.outputPath('steering-quarter-turn.png')});
  await page.keyboard.press('x');await expect(page.locator('#steer-value')).toHaveText('回正');await expect(page.locator('#wheel-value')).toHaveText('方向盤置中');
  await page.locator('#full-right').click();await expect(page.locator('#wheel-value')).toHaveText('方向盤右 1.50 圈');await expect(page.locator('#steer-value')).toHaveText('右 35°');
});
test('default desktop side mirrors are at least 500 by 330 pixels',async({page})=>{
  await start(page);for(const id of ['mirror-left','mirror-right']){const b=await page.locator('#'+id).boundingBox();expect(b.width).toBeGreaterThanOrEqual(500);expect(b.height).toBeGreaterThanOrEqual(330);}
});
