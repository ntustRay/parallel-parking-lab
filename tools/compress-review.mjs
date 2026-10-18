import fs from 'node:fs/promises';import {pathToFileURL} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE?pathToFileURL(process.env.PLAYWRIGHT_MODULE).href:'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const page=await browser.newPage();await page.goto('about:blank');await fs.mkdir('docs/ui-review',{recursive:true});
for(const f of await fs.readdir('review-screenshots'))if(f.endsWith('.png')){
const data=await fs.readFile('review-screenshots/'+f);const webp=await page.evaluate(async base64=>{const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/webp',.88).split(',')[1];},data.toString('base64'));
await fs.writeFile('docs/ui-review/'+f.replace('.png','.webp'),Buffer.from(webp,'base64'));
}
await browser.close();
