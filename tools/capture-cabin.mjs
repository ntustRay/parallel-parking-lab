import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const root=path.resolve('_site'),output=path.join(root,'screenshots');
const {version}=JSON.parse(await fs.readFile('package.json','utf8'));
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
try{
  const width=1440,height=960,errors=[];
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1}),converter=await browser.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://127.0.0.1:4173/**',async route=>{
    const url=new URL(route.request().url()),file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
    if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:'Forbidden'});
    try{await route.fulfill({body:await fs.readFile(file),contentType:({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream'});}
    catch(error){if(error.code!=='ENOENT')throw error;await route.fulfill({status:404,body:'Not found'});}
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('#setup[open]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#start').click();
  const captures=[];
  for(const [name,title,yaw] of [['02-driver','第一人稱・儀表與前擋',0],['cabin-left','左側・完整門板與底板',-90],['cabin-right','右側・副駕座與門板',90],['cabin-rear','回頭・後座與後窗',145]]){
    await page.keyboard.press('k');
    await page.waitForFunction(()=>document.querySelector('#look-label').textContent==='正前方');
    if(yaw){
      // Start above the mirror overlays and the draggable steering wheel.
      const x=yaw<0?1000:300;
      await page.mouse.move(x,300);await page.mouse.down();
      await page.mouse.move(x+yaw*Math.PI/180/4.5*width,300);
      await page.waitForFunction(expected=>{
        const label=document.querySelector('#look-label').textContent;
        return label.startsWith(expected<0?'左側':'右側')&&Math.abs(Number(label.match(/\d+/)?.[0])-Math.abs(expected))<3;
      },yaw,{timeout:5000});
    }
    await page.waitForTimeout(500);
    const png=await page.screenshot(),file=name+'.webp';
    const base64=await converter.evaluate(async data=>{
      const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').drawImage(image,0,0);
      return canvas.toDataURL('image/webp',.86).split(',')[1];
    },png.toString('base64'));
    await fs.writeFile(path.join(output,file),Buffer.from(base64,'base64'));
    const lookLabel=await page.locator('#look-label').textContent();
    captures.push({file,title,yaw,lookLabel,viewport:{width,height}});console.log('Cabin snapshot:',file,lookLabel);
    if(yaw)await page.mouse.up();
  }
  if(errors.length)throw new Error(errors.join("; "));
  const manifest={version,commit:process.env.GITHUB_SHA||null,capturedAt:new Date().toISOString(),complete:true,captures};
  await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  await fs.writeFile(path.join(output,'index.html'),`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>慢慢停・車內畫面</title><style>body{max-width:1100px;margin:32px auto;padding:0 20px;font:16px/1.6 system-ui;background:#14212a;color:#eef5f6}a{color:#a9ddd3}img{display:block;max-width:100%;height:auto;border-radius:8px}figure{margin:32px 0}</style><h1>慢慢停・v${version} 車內畫面</h1><p><a href="../">開始練習</a> · <a href="manifest.json">擷取紀錄</a></p>${captures.map(item=>`<figure><figcaption>${item.title}</figcaption><a href="${item.file}"><img src="${item.file}" alt="${item.title}" loading="lazy"></a></figure>`).join('')}</html>`);
}finally{await browser.close();}
