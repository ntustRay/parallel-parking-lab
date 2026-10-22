import {execFileSync} from 'node:child_process';
import {appendFileSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
if(!repository||!token)throw Error('Run release publication in GitHub Actions with contents: write.');
const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2026-03-10'};
async function api(route,method='GET',body){
  const response=await fetch(`https://api.github.com/repos/${repository}/${route}`,{method,
    signal:AbortSignal.timeout(15000),headers,
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({message:response.statusText}));
  if(method==='GET'&&response.status===404)return null;
  if(!response.ok)throw Error(`${response.status}: ${data.message}`);
  return data;
}
const compareVersions=(a,b)=>{
  const aa=a.replace(/^v/,'').split('.').map(Number),bb=b.replace(/^v/,'').split('.').map(Number);
  for(let i=0;i<3;i++)if(aa[i]!==bb[i])return aa[i]-bb[i];
  return 0;
};
const notes=new Map();
for(const section of readFileSync('CHANGELOG.md','utf8').split(/^## /m).slice(1)){
  const newline=section.indexOf('\n'),version=section.slice(0,newline).match(/^(\d+\.\d+\.\d+)(?:\s|$)/)?.[1];
  if(version)notes.set('v'+version,section.slice(newline+1).trim());
}
const {version}=JSON.parse(readFileSync('package.json','utf8'));
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version: '+version);
const sha=git('rev-parse','HEAD'),tag='v'+version,report=[];
if(process.env.GITHUB_SHA&&sha!==process.env.GITHUB_SHA)throw Error('Checkout does not match the workflow commit.');
if(!notes.get(tag))throw Error('Missing CHANGELOG.md notes for '+tag);

// Create only the current version's tag. Historical releases use existing tags.
const existingTag=await api('git/ref/tags/'+tag);
if(existingTag)report.push(`${tag}: existing tag retained`);
else{
  const object=await api('git/tags','POST',{tag,message:tag+': Parking Lab release',object:sha,type:'commit'});
  await api('git/refs','POST',{ref:'refs/tags/'+tag,sha:object.sha});
  report.push(`${tag}: created tag at ${sha}`);
}
const refs=await api('git/matching-refs/tags/v');
const candidates=[...new Set((refs||[]).map(ref=>ref.ref.replace('refs/tags/','')).concat(tag))]
  .filter(name=>/^v\d+\.\d+\.\d+$/.test(name)&&notes.has(name)&&compareVersions(name,tag)<=0)
  .sort(compareVersions);
let currentRelease;
for(const name of candidates){
  let release=await api('releases/tags/'+name);
  if(release)report.push(`${name}: existing Release retained`);
  else{
    release=await api('releases','POST',{tag_name:name,name,body:notes.get(name),draft:name===tag,prerelease:false,make_latest:'false'});
    report.push(`${name}: ${name===tag?'prepared draft':'published'} ${release.html_url}`);
  }
  if(name===tag)currentRelease=release;
}
if(!currentRelease||currentRelease.prerelease)throw Error('Current version must have a stable Release.');

// Build from the released tag, so assets always match its source, even on a
// later documentation-only commit. Never replace a previously uploaded file.
const assetName=`parking-lab-${tag}.html`;
const assets=await api(`releases/${currentRelease.id}/assets?per_page=100`);
const existingAsset=assets.find(asset=>asset.name===assetName);
if(existingAsset?.state==='uploaded'&&existingAsset.size>0)report.push(`${tag}: existing ${assetName} retained`);
else{
  if(existingAsset){
    if(existingAsset.state!=='starter'||existingAsset.size!==0)throw Error('Refusing to replace existing asset: '+assetName);
    await api('releases/assets/'+existingAsset.id,'DELETE');
  }
  const directory=mkdtempSync(path.join(tmpdir(),'parking-release-'));let added=false;
  try{
    git('fetch','--no-tags','origin',`refs/tags/${tag}:refs/tags/${tag}`);
    git('worktree','add','--detach',directory,tag);added=true;
    execFileSync(process.execPath,[path.join(directory,'tools/build-offline.mjs')],{cwd:directory,stdio:'inherit'});
    const file=readFileSync(path.join(directory,'dist',assetName));
    const upload=new URL(currentRelease.upload_url.replace(/\{.*$/,''));upload.searchParams.set('name',assetName);
    const response=await fetch(upload,{method:'POST',signal:AbortSignal.timeout(45000),headers:{...headers,'Content-Type':'text/html'},body:file});
    const asset=await response.json();
    if(!response.ok)throw Error(`${response.status}: ${asset.message}`);
    report.push(`${tag}: uploaded ${asset.browser_download_url}`);
  }finally{
    if(added)git('worktree','remove','--force',directory);else rmSync(directory,{recursive:true,force:true});
  }
}
if(currentRelease.draft){
  currentRelease=await api('releases/'+currentRelease.id,'PATCH',{draft:false,make_latest:'true'});
  report.push(`${tag}: published ${currentRelease.html_url}`);
}
console.log(report.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## GitHub Releases\n\n'+report.map(line=>'- '+line).join('\n')+'\n');
