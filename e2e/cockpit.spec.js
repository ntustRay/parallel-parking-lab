import {test,expect} from './fixture.js';
async function start(page){await page.goto('/');await page.getByRole('button',{name:'開始練習',exact:true}).click();}
test('S and down reverse in R, space brakes, gear does not change',async({page})=>{
await start(page);await page.locator('[data-gear=R]').click();
for(const key of ['s','ArrowDown']){await page.keyboard.down(key);await expect(page.locator('#speed')).not.toHaveText('0.0');await expect(page.locator('#gear-label')).toHaveText('R 倒車');await page.keyboard.down('Space');await expect(page.locator('#speed')).toHaveText('0.0');await page.keyboard.up(key);await page.keyboard.up('Space');}
});
test('range focus does not swallow driving keys and R selects reverse',async({page})=>{
await start(page);await page.locator('#steer').focus();await page.keyboard.press('r');await expect(page.locator('#gear-label')).toHaveText('R 倒車');await page.keyboard.down('s');await expect(page.locator('#speed')).not.toHaveText('0.0');await page.keyboard.up('s');await page.keyboard.down('Space');await expect(page.locator('#speed')).toHaveText('0.0');await page.keyboard.up('Space');await page.keyboard.press('Backspace');await expect(page.locator('#gear-label')).toHaveText('P 停車');
});
test('mirror enlargement supports mouse and keyboard dismissal',async({page},info)=>{
await start(page);const mirror=page.locator('.mirror-right');const before=await mirror.boundingBox();await mirror.click();await expect(mirror).toHaveAttribute('aria-expanded','true');await expect(page.locator('.mirror-center')).not.toBeVisible();expect((await mirror.boundingBox()).width).toBeGreaterThan(before.width);const expanded=await mirror.boundingBox();expect(await mirror.evaluate((el,r)=>el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)),expanded)).toBe(true);await page.screenshot({path:info.outputPath('mirror-expanded.png')});await page.keyboard.press('Escape');await expect(mirror).toHaveAttribute('aria-expanded','false');await mirror.focus();await page.keyboard.press('Enter');await expect(mirror).toHaveAttribute('aria-expanded','true');await page.keyboard.press('Enter');await expect(mirror).toHaveAttribute('aria-expanded','false');
});
test('focus mode hides aids and keeps mirrors and driving controls',async({page},info)=>{
await start(page);await page.locator('#hud-toggle').click();await expect(page.locator('#coach')).not.toBeVisible();await expect(page.locator('#telemetry')).not.toBeVisible();for(const id of ['mirror-left','mirror-right','mirror-center','throttle','brake'])await expect(page.locator('#'+id)).toBeVisible();await page.screenshot({path:info.outputPath('focus.png')});await page.locator('#hud-toggle').click();await expect(page.locator('#coach')).toBeVisible();
});
test('practice explains partial score and allows another adjustment',async({page},info)=>{
await start(page);await page.locator('#finish').click();await expect(page.locator('.result-note')).toContainText('前 6 次修正不扣分');await expect(page.locator('.score')).not.toHaveText('0 / 100');await page.screenshot({path:info.outputPath('result.png')});await page.locator('#continue').click();await expect(page.locator('#result')).not.toBeVisible();
});
test('closing the first setup dialog starts a drivable practice',async({page})=>{await page.goto('/');await page.getByRole('button',{name:'關閉',exact:true}).click();await page.keyboard.press('r');await page.keyboard.down('s');await expect(page.locator('#speed')).not.toHaveText('0.0');await page.keyboard.up('s');});
for(const [width,height] of [[1440,960],[1280,720],[1024,768],[390,844],[360,740],[844,390]]){
test(`cockpit fits ${width}x${height} with usable hit targets`,async({page},info)=>{
await page.setViewportSize({width,height});await start(page);
for(const selector of ['#wheel','#throttle','#brake','#finish','#reset','[data-gear=R]','.mirror-left','.mirror-right','.mirror-center']){const r=await page.locator(selector).boundingBox();expect(r.x,selector).toBeGreaterThanOrEqual(0);expect(r.y,selector).toBeGreaterThanOrEqual(0);expect(r.x+r.width,selector).toBeLessThanOrEqual(width);expect(r.y+r.height,selector).toBeLessThanOrEqual(height);if(!selector.startsWith('.mirror')){expect(r.width,selector).toBeGreaterThanOrEqual(40);expect(r.height,selector).toBeGreaterThanOrEqual(40);}}
const dock=await page.locator('footer').boundingBox();for(const selector of ['.mirror-left','.mirror-right','.look-controls']){const r=await page.locator(selector).boundingBox();expect(r.y+r.height,selector+' does not overlap dock').toBeLessThanOrEqual(dock.y);}
for(const [mirror,panel] of [['.mirror-left','#coach'],['.mirror-right','#telemetry']]){
if(await page.locator(panel).isVisible()){
const a=await page.locator(mirror).boundingBox(),b=await page.locator(panel).boundingBox();
expect(a.y+a.height<=b.y||a.x+a.width<=b.x||b.x+b.width<=a.x,`${mirror} does not cover ${panel}`).toBe(true);
}}
await page.screenshot({path:info.outputPath(`cockpit-${width}x${height}.png`)});
});}

