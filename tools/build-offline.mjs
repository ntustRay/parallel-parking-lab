import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const imports=/\bfrom\s*(['"])(\.\/[^'"]+\.js)\1/g;
const ordered=[],seen=new Set(),visiting=new Set();
async function visit(file){
  if(seen.has(file))return;
  if(visiting.has(file))throw Error('Circular offline dependency: '+file);
  visiting.add(file);
  const source=await fs.readFile(path.join(root,file),'utf8'),dependencies={};
  for(const match of source.matchAll(imports)){
    const dependency=path.posix.normalize(path.posix.join(path.posix.dirname(file),match[2]));
    if(dependency.startsWith('../'))throw Error('Dependency outside project: '+dependency);
    dependencies[match[2]]=dependency;await visit(dependency);
  }
  visiting.delete(file);seen.add(file);ordered.push({file,source,dependencies});
}
await visit('game.js');
const version=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8')).version;
const css=await fs.readFile(path.join(root,'style.css'),'utf8');
const license=await fs.readFile(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8');
const appLicense=await fs.readFile(path.join(root,'LICENSE'),'utf8');
const data=JSON.stringify(ordered).replaceAll('<','\\u003c');
const bootSource=await fs.readFile(path.join(root,'bootstrap.js'),'utf8');
const bootstrap=`
const modules=JSON.parse(document.querySelector('#offline-modules').textContent),urls={};
try{
  for(const {file,source,dependencies} of modules){
    const resolved=source.replace(/\\bfrom\\s*(['"])(\\.\\/[^'"]+\\.js)\\1/g,(_,q,relative)=>{
      const url=urls[dependencies[relative]];if(!url)throw Error('Missing offline module: '+relative);
      return 'from '+JSON.stringify(url);
    });
    urls[file]=URL.createObjectURL(new Blob([resolved],{type:'text/javascript'}));
  }
  const start=${JSON.stringify(bootSource)}.replace("import('./game.js')",'import('+JSON.stringify(urls['game.js'])+')');
  await import(URL.createObjectURL(new Blob([start],{type:'text/javascript'})));
}catch(error){
  console.error(error);
  if(!document.querySelector('#startup-error')){
    document.body.classList.add('startup-failed');
    const notice=document.createElement('main');notice.id='startup-error';
    const heading=document.createElement('h1');heading.textContent='無法開啟離線試玩';
    const message=document.createElement('p');message.textContent='請下載完整 HTML 檔案，再用 Chrome 或 Edge 開啟。';
    notice.append(heading,message);document.body.append(notice);
  }
}
`;
let html=await fs.readFile(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="style.css">',()=>'<style>'+css+'</style>');
html=html.replace('<script type="module" src="bootstrap.js"></script>',()=>'<script type="application/json" id="offline-modules">'+data+'</script><script type="module">'+bootstrap+'</script>');
html=html.replace('</head>',()=>'<meta name="parking-build" content="offline-v'+version+'"><!-- '+appLicense.replaceAll('--','—')+'\nThree.js: '+license.replaceAll('--','—')+' --></head>');
const destination=path.join(root,'dist','parking-lab-v'+version+'.html');
await fs.mkdir(path.dirname(destination),{recursive:true});await fs.writeFile(destination,html);
console.log(JSON.stringify({file:destination,bytes:Buffer.byteLength(html),modules:ordered.length}));
