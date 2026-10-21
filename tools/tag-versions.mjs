import {execFileSync} from 'node:child_process';
import {appendFileSync,readFileSync} from 'node:fs';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
if(!repository||!token)throw Error('Run version publication in GitHub Actions with contents: write.');
async function api(route,method='GET',body){
  const response=await fetch(`https://api.github.com/repos/${repository}/${route}`,{method,
    signal:AbortSignal.timeout(15000),
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2026-03-10'},
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({message:response.statusText}));
  if(!response.ok&&!(method==='GET'&&response.status===404))throw Error(`${response.status}: ${data.message}`);
  return response.status===404?null:data;
}
// Publish only the version built by this run. Historical commits can contain
// different workflow files and require permissions GITHUB_TOKEN does not have.
const {version}=JSON.parse(readFileSync('package.json','utf8'));
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid release version: '+version);
const sha=git('rev-parse','HEAD'),tag='v'+version;
if(process.env.GITHUB_SHA&&sha!==process.env.GITHUB_SHA)throw Error('Checkout does not match the workflow commit.');
const existing=await api('git/ref/tags/'+tag);
let report;
if(existing){
  report=`${tag}: already present; retained without changes`;
}else{
  const object=await api('git/tags','POST',{tag,message:tag+': Parking Lab iteration',object:sha,type:'commit'});
  await api('git/refs','POST',{ref:'refs/tags/'+tag,sha:object.sha});
  report=`${tag}: ${sha}`;
}
console.log(report);
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Current version tag\n\n'+report+'\n');
