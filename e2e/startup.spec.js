import {test,expect} from './fixture.js';
test('unavailable WebGL shows a readable recovery screen instead of inert controls',async({page},info)=>{
  await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:getContext.call(this,type,...args);};});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'3D 場景未能啟動'})).toBeVisible();
  await expect(page.locator('#startup-error')).toContainText('WebGL 2');
  await expect(page.getByRole('button',{name:'重新整理',exact:true})).toBeFocused();
  await expect(page.locator('#throttle')).not.toBeVisible();
  await page.screenshot({path:info.outputPath('webgl-unavailable.png')});
});
