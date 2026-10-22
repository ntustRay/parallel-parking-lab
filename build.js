import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const modules=['bootstrap.js','audio.js','shortcuts.js','physics.js','courses.js','lessons.js','training.js','steering.js','view.js','scene.js','cabin-shell.js','cockpit.js','renderer.js','game.js'];
const sources=Object.fromEntries([...modules,'style.css','index.html'].map(f=>[f,fs.readFileSync(f,'utf8')]));
const hash=createHash('sha256').update(JSON.stringify(sources)).update(fs.readFileSync('vendor/three.module.min.js')).update(fs.readFileSync('vendor/three.core.min.js')).digest('hex').slice(0,12);
const output=path.resolve('_site');fs.mkdirSync(output,{recursive:true});
const hashed=f=>f.replace(/(\.[^.]+)$/,`.${hash}$1`);
for(const f of modules){const content=sources[f].replace(/from\s+(['"])\.\/([^'"]+\.js)\1/g,(_,q,file)=>`from ${q}./${file.startsWith('vendor/')?'vendor/'+hash+'/'+file.slice(7):hashed(file)}${q}`).replace(/import\((['"])\.\/([^'"]+\.js)\1\)/g,(_,q,file)=>`import(${q}./${hashed(file)}${q})`);fs.writeFileSync(path.join(output,hashed(f)),content,'utf8');}
fs.cpSync('vendor',path.join(output,'vendor',hash),{recursive:true});
fs.writeFileSync(path.join(output,hashed('style.css')),sources['style.css'],'utf8');
fs.writeFileSync(path.join(output,'index.html'),sources['index.html'].replace('href="style.css"',`href="${hashed('style.css')}"`).replace('src="bootstrap.js"',`src="${hashed('bootstrap.js')}"`),'utf8');
// Reviewed stills are static documentation, never a prerequisite for deployment.
if(fs.existsSync('docs/screenshots'))fs.cpSync('docs/screenshots',path.join(output,'screenshots'),{recursive:true});
console.log(`Static build: _site/ (${hash})`);
