import {test,expect} from './fixture.js';
async function start(page){await page.goto('/');await page.getByRole('button',{name:'開始練習',exact:true}).click();await page.locator('#hud-toggle').click();}
test('dragging the wheel turns progressively and X recenters wheel and tires',async({page},info)=>{
  const renderErrors=[];page.on('pageerror',e=>renderErrors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|Shader|GL_INVALID/.test(m.text()))renderErrors.push(m.text());});
  await start(page);const b=await page.locator('#wheel').boundingBox(),cx=b.x+b.width/2,cy=b.y+b.height/2,r=b.width*.41;
  await page.mouse.move(cx,cy-r);await page.mouse.down();
  for(let a=-80;a<=0;a+=10)await page.mouse.move(cx+Math.cos(a*Math.PI/180)*r,cy+Math.sin(a*Math.PI/180)*r);
  await expect(page.locator('#steer-value')).toHaveText('右 6°');await expect(page.locator('#wheel-value')).toHaveText('方向盤右 0.25 圈');
  await page.screenshot({path:info.outputPath('steering-quarter-turn.png')});await page.mouse.up();
  await page.keyboard.press('x');await expect(page.locator('#steer-value')).toHaveText('回正');await expect(page.locator('#wheel-value')).toHaveText('方向盤置中');
  await page.locator('#full-right').click();await expect(page.locator('#wheel-value')).toHaveText('方向盤右 1.50 圈');await expect(page.locator('#steer-value')).toHaveText('右 35°');
  expect(renderErrors).toEqual([]);
});
test('3D cabin wheel keeps its drag target with larger equal side mirrors',async({page})=>{
  await start(page);expect((await page.locator('#wheel').boundingBox()).width).toBeGreaterThanOrEqual(400);for(const id of ['mirror-left','mirror-right']){const b=await page.locator('#'+id).boundingBox();expect(b.width).toBeGreaterThanOrEqual(300);expect(b.width).toBeLessThan(420);expect(b.height).toBeLessThan(250);}
});

