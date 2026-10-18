import {test as base,expect} from '@playwright/test';
import fs from 'node:fs/promises';
// Offline verification uses exactly the hashed build, served without a network port.
export const test=base.extend({page:async({page},use)=>{
if(process.env.PARKING_OFFLINE)await page.route('http://127.0.0.1:4173/**',async route=>{
const pathname=new URL(route.request().url()).pathname;
const name=pathname==='/'?'index.html':pathname.slice(1);
if(name.includes('..'))return route.abort();
try{await route.fulfill({body:await fs.readFile(new URL('../_site/'+name,import.meta.url)),contentType:name.endsWith('.css')?'text/css':name.endsWith('.js')?'text/javascript':'text/html'});}catch{await route.fulfill({status:404,body:'Not found'});}
});await use(page);
}});
export {expect};
