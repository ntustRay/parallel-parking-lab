import {execFileSync} from 'node:child_process';

const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
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
const pending=[];
for(const [version,sha] of versions){
  const tag='v'+version;
  try{git('rev-parse','--verify','refs/tags/'+tag);console.log('Keep existing tag:',tag);continue;}catch{}
  git('tag','-a',tag,sha,'-m',tag+': Parking Lab iteration');pending.push('refs/tags/'+tag);
}
if(pending.length){git('push','--atomic','origin',...pending);console.log('Published tags:',pending.join(', '));}
else console.log('All version tags are present.');
