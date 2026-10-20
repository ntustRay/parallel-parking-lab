import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=path.resolve('_site'),output=path.join(root,'screenshots');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
const captures=[];
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try{
  const page=await browser.newPage({viewport:{width:1440,height:960},deviceScaleFactor:1});
  const converter=await browser.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror',error=>console.error('Screenshot page error:',error.message));
  // Capture the actual hashed build without a separate HTTP server.
  await page.route('http://127.0.0.1:4173/**',async route=>{
    const url=new URL(route.request().url());
    const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep)){await route.fulfill({status:403,body:'Forbidden'});return;}
    try{
      const body=await fs.readFile(file);
      await route.fulfill({body,contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});
    }catch(error){
      if(error.code!=='ENOENT')throw error;
      await route.fulfill({status:404,body:'Not found'});
    }
  });
  async function capture(name,title){
    // Leave time for the main WebGL scene and all mirrors to redraw.
    await page.waitForTimeout(500);
    const png=await page.screenshot();
    const base64=await converter.evaluate(async data=>{
      const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
      canvas.getContext('2d').drawImage(image,0,0);
      return canvas.toDataURL('image/webp',.88).split(',')[1];
    },png.toString('base64'));
    const file=name+'.webp';
    await fs.writeFile(path.join(output,file),Buffer.from(base64,'base64'));
    const state=await page.evaluate(()=>({
      view:document.querySelector('[data-view].selected')?.dataset.view??null,
      lessonPhase:document.querySelector('#coach')?.dataset.lessonPhase??null,
      demoState:document.body.dataset.demoState??null,
      reverseCamera:document.querySelector('#rear-toggle')?.getAttribute('aria-pressed')??null,
    }));
    captures.push({file,title,viewport:page.viewportSize(),...state});
    const manifest={version,commit:process.env.GITHUB_SHA||null,capturedAt:new Date().toISOString(),captures};
    await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
    await fs.writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>慢慢停 · 步驟截圖</title><style>body{max-width:1100px;margin:32px auto;padding:0 20px;font:16px/1.6 system-ui;background:#14212a;color:#eef5f6}a{color:#a9ddd3}img{display:block;max-width:100%;height:auto;border-radius:8px}figure{margin:32px 0}figcaption{margin-bottom:10px}</style><h1>慢慢停 · v${version} 步驟截圖</h1><p><a href="../">開始練習</a> · <a href="manifest.json">截圖紀錄</a></p><p>建置：${manifest.commit||'本機'} · ${manifest.capturedAt}</p>${captures.map(item=>`<figure><figcaption>${item.title}（${item.viewport.width} × ${item.viewport.height}）</figcaption><a href="${item.file}"><img src="${item.file}" alt="${item.title}" loading="lazy"></a></figure>`).join('')}</html>`);
    console.log('Screenshot:',file,title);
  }

  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#setup[open]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await capture('01-setup','設定練習');
  await page.locator('#start').click();
  await capture('02-driver','第一人稱駕駛座');
  await page.locator('#hud-toggle').click();
  await page.locator('#demo-stepwise').check();
  await page.locator('#demo').click();
  for(const [phase,name,title] of [
    [0,'03-position','步驟一：並排定位'],
    [1,'04-rear-align','步驟二：直退至車尾對齊'],
    [2,'05-turn-straight','步驟三：朝路緣轉入，回正直退'],
    [3,'06-counter-adjust','步驟四：反打、平行回正與微調'],
  ]){
    // Pause a real playback phase while recording it, rather than racing a timer.
    await page.locator('#coach[data-lesson-phase="'+phase+'"]').waitFor();
    await page.locator('body[data-demo-state="paused"]').waitFor({state:'attached'});
    await page.locator('#toast.show').waitFor({state:'hidden'});
    await capture(name,title+'・駕駛座');
    await page.locator('[data-view="top"]').click();
    await capture(name+'-top',title+'・比例俯視');
    await page.locator('[data-view="driver"]').click();
    if(phase===1||phase===2){
      const reference=await page.locator('#observe-lesson').boundingBox();
      await page.mouse.move(reference.x+reference.width/2,reference.y+reference.height/2);
      await page.mouse.down();
      await page.waitForTimeout(600);
      await capture(phase===1?'04-rear-reference':'05-tail-reference',phase===1?'車尾對齊觀察視線':'直退結束的前車角與路緣觀察');
      await page.mouse.up();
      await page.waitForTimeout(600);
    }
    if(phase===2){
      // Record every view at the same stationary pose. These are visual review
      // artifacts only: no screenshot comparisons or driving assertions.
      for(const [view,label] of [['driver','駕駛座'],['orbit','斜俯視'],['top','正上方'],['chase','跟車']]){
        await page.locator('[data-view="'+view+'"]').click();
        await capture('12-'+view+'-rear-off',label+'・三面後視鏡・倒車鏡頭關閉');
      }
      await page.locator('[data-view="driver"]').click();
      await page.locator('#rear-toggle').click();
      await capture('13-driver-rear-on','駕駛座・三面後視鏡・手動開啟倒車鏡頭');
      await page.locator('#rear-toggle').click();
    }
    await page.locator('#demo-pause').click();
    if(phase===2){
      await page.locator('body[data-lesson-action="straight"][data-demo-state="paused"]').waitFor({state:'attached'});
      await capture('05-turn-complete','步驟三・約35°入格後，煞停回正準備直退');
      await page.locator('[data-view="top"]').click();
      await capture('05-turn-complete-top','步驟三・斜退後的車身與格線比例');
      await page.locator('[data-view="driver"]').click();
      await page.locator('#demo-pause').click();
    }
  }
  await page.locator('body[data-demo-state="complete"]').waitFor({state:'attached'});
  await page.locator('#toast.show').waitFor({state:'hidden'});
  await capture('08-parked','入位示範結束');
  await page.locator('.mirror-right').click();
  await capture('09-mirror','放大右後視鏡');
  await page.keyboard.press('Escape');
  await page.locator('#reset').click();
  await page.locator('#finish').click();
  await page.locator('#result[open]').waitFor();
  await capture('10-result','評分畫面（重新開始後直接提交，尚未入位）');
  await page.locator('#again').click();
  await page.locator('#hud-toggle').click();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#toast.show').waitFor({state:'hidden'});
  await capture('11-mobile','手機第一人稱');

}finally{
  await browser.close();
}
