import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const repository=process.env.GITHUB_REPOSITORY,token=process.env.GITHUB_TOKEN;
if(!repository||!token)throw Error('Run version publication in GitHub Actions with contents: write.');
async function api(route,method='GET',body){
  const response=await fetch(`https://api.github.com/repos/${repository}/${route}`,{method,
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'},
    ...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok&&!(method==='GET'&&response.status===404))throw Error(`${response.status}: ${data.message}`);
  return response.status===404?null:data;
}
// Reconstruct the first commit of each new version, including a run cancelled
// by a newer Pages push. Existing tags are never moved or overwritten.
const versions=new Map();
for(const sha of git('rev-list','--reverse','HEAD','--','package.json').split('\n')){
  const {version}=JSON.parse(git('show',sha+':package.json'));
  if(!/^\d+\.\d+\.\d+$/.test(version))continue;
  const [major,minor]=version.split('.').map(Number);
  if(major===0&&minor<11)continue;
  if(!versions.has(version))versions.set(version,sha);
}
const report=[];
for(const [version,sha] of versions){
  const tag='v'+version;
  try{
    if(await api('git/ref/tags/'+tag)){console.log('Keep existing tag:',tag);report.push(`${tag}: already present`);continue;}
    // Use the tag API for existing commits; do not republish commit trees or
    // workflow files through a git pack when backfilling older versions.
    const object=await api('git/tags','POST',{tag,message:tag+': Parking Lab iteration',object:sha,type:'commit'});
    await api('git/refs','POST',{ref:'refs/tags/'+tag,sha:object.sha});
    console.log('Published tag:',tag,sha);report.push(`${tag}: ${sha}`);
  }catch(error){
    console.error('Version tag blocked:',tag,error.message);report.push(`${tag}: blocked — ${error.message}`);process.exitCode=1;
  }
}
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Version tags\n\n'+report.map(line=>'- '+line).join('\n')+'\n');
