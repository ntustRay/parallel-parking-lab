import fs from 'node:fs';import path from 'node:path';
const labels={'斜俯視.png':'overview.png','正上方.png':'top.png','跟車.png':'chase.png','駕駛座.png':'driver.png','mobile.png':'mobile.png','landscape.png':'landscape.png'};
const out='_site/screenshots';fs.mkdirSync(out,{recursive:true});
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())walk(p);else if(labels[entry.name])fs.copyFileSync(p,path.join(out,labels[entry.name]));}}
walk('test-results');console.log('Published browser screenshots:',fs.readdirSync(out).join(', '));
