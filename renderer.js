// Small dependency-free 3D painter. Coordinates are metres, +Z is road direction.
import {CAR,step} from './physics.js';
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>a.map(v=>v/Math.hypot(...a));
const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,(n>>8)&255,n&255].map(v=>Math.min(255,Math.round(v*k))).join(',')})`;};
export class Renderer{
constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.camera=[-13,17,-19];this.view='orbit';this.resize();window.addEventListener('resize',()=>this.resize());}
resize(){this.w=this.canvas.clientWidth||innerWidth;this.h=this.canvas.clientHeight||innerHeight;this.dpr=Math.min(devicePixelRatio||1,2);this.canvas.width=this.w*this.dpr;this.canvas.height=this.h*this.dpr;this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);}
project(p){const d=sub(p,this.camera),z=dot(d,this.forward);if(z<.12)return null;return [this.w/2+dot(d,this.right)*this.focal/z,this.h*.48-dot(d,this.up)*this.focal/z,z];}
poly(points,color){const ps=points.map(p=>this.project(p));if(ps.some(p=>!p))return;this.queue.push({ps,color,depth:ps.reduce((a,b)=>a+b[2],0)/ps.length,layer:this.layer??0});}
quad(x,z,w,l,color,y=.015){this.poly([[x-w/2,y,z-l/2],[x+w/2,y,z-l/2],[x+w/2,y,z+l/2],[x-w/2,y,z+l/2]],color);}
box(x,y,z,w,h,l,color,angle=0){const transform=(a,b,c)=>[x+a*Math.cos(angle)+c*Math.sin(angle),y+b,z-a*Math.sin(angle)+c*Math.cos(angle)];const p=[[-w/2,0,-l/2],[w/2,0,-l/2],[w/2,0,l/2],[-w/2,0,l/2],[-w/2,h,-l/2],[w/2,h,-l/2],[w/2,h,l/2],[-w/2,h,l/2]].map(v=>transform(...v));for(const [indices,k]of [[[0,1,5,4],.7],[[1,2,6,5],.83],[[2,3,7,6],.86],[[3,0,4,7],.75],[[4,5,6,7],1.06]]){const saved=this.layer;this.layer=0;this.poly(indices.map(i=>p[i]),shade(color,k));this.layer=saved;}}
line(points,color,width=2){const ps=points.map(p=>this.project(p));if(ps.some(p=>!p))return;this.queue.push({ps,color,line:true,width,layer:-1,depth:ps.reduce((a,b)=>a+b[2],0)/ps.length-.05});}
car(s,color,player=false){const a=s.angle,part=(x,y,z,w,h,l,c,turn=0)=>this.box(s.x+x*Math.cos(a)+z*Math.sin(a),y,s.z-x*Math.sin(a)+z*Math.cos(a),w,h,l,c,a+turn);part(0,.02,0,2.02,.015,4.7,'#4b6266'); // contact shadow
for(const x of [-.87,.87])for(const z of [-1.35,1.35]){const turn=player&&z>0?s.steer*CAR.maxSteer:0;part(x,.22,z,.24,.54,.65,'#25313a',turn);part(x*1.025,.33,z,.25,.29,.38,'#9baeb0',turn);}
part(0,.44,0,1.8,.52,4.5,color);part(0,.94,-.1,1.53,.64,2.15,'#294752');part(0,1.58,-.15,1.5,.09,1.3,color);part(0,.93,1.6,1.72,.12,1.15,color);part(0,.94,-1.75,1.72,.1,.8,color);
for(const x of [-.91,.91]){part(x,1.03,.6,.2,.15,.31,color);part(x*.78,.75,2.26,.43,.16,.025,'#f5e5af');part(x*.78,.75,-2.26,.45,.13,.025,player&&s.speed<0?'#fff6d7':'#d76b58');}part(0,.58,2.26,.67,.16,.03,'#283943');part(0,.6,-2.26,.6,.16,.025,'#e7e9df');
if(player){part(0,1.68,0,.12,.015,.6,'#e5bd6c');if(s.speed<-.01){for(const x of [-.65,.65]){const p=(xx,zz)=>[s.x+xx*Math.cos(a)+zz*Math.sin(a),.03,s.z-xx*Math.sin(a)+zz*Math.cos(a)];this.poly([p(x,-2.3),p(x-.6,-5),p(x+.6,-5)],'#f3e6bb40');}}}}
tree(x,z,h=3){this.box(x,0,z,.18,h,.18,'#8c8b73');this.box(x,h*.55,z,1.75,h*.48,1.8,'#73917c');this.box(x+.2,h*.9,z-.1,1.4,h*.32,1.4,'#91aa87');}
draw(s,scene,{guides=true,exam=false,hits=0}={}){const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#bfd5df');sky.addColorStop(.65,'#e5e8dc');sky.addColorStop(1,'#c4d0bd');c.fillStyle=sky;c.fillRect(0,0,w,h);const side=scene.side;
let eye,target;const f=[Math.sin(s.angle),0,Math.cos(s.angle)],r=[Math.cos(s.angle),0,-Math.sin(s.angle)];if(this.view==='rear'){eye=[s.x-f[0]*.5,1.15,s.z-f[2]*.5];target=[s.x-f[0]*18,.3,s.z-f[2]*18];}else if(this.view==='top'){eye=[.3,31,0];target=[.3,0,.01];}else if(this.view==='chase'){eye=[s.x-f[0]*10,6.5,s.z-f[2]*10];target=[s.x+f[0]*3,0,s.z+f[2]*3];}else if(this.view==='driver'){eye=[s.x-r[0]*.42+f[0]*.3,1.35,s.z-r[2]*.42+f[2]*.3];target=[s.x+f[0]*18,1,s.z+f[2]*18];}else{eye=[-15*side,19,-19];target=[1*side,0,.5];}
this.camera=eye;this.forward=norm(sub(target,eye));this.right=norm(cross([0,1,0],this.forward));this.up=cross(this.forward,this.right);this.focal=Math.min(w,h)*1.32;if(w<650&&this.view==='orbit')this.focal=h*.8;this.queue=[];
// Tiles keep near-plane clipping bounded, and provide depth for all viewing angles.
this.layer=-3;for(let x=-32;x<33;x+=4)for(let z=-52;z<64;z+=4)this.quad(x,z,4.01,4.01,'#acbca3',-.07);
this.layer=-2;for(let z=-50;z<62;z+=3){this.quad(-1.5*side,z,13,3.01,'#70838a',0);this.quad(7*side,z,3.8,3.01,'#c9cbbd',.05);this.box(5.1*side,.02,z,.22,.2,3,'#e8e7d7');this.layer=-1;if(z%6===0)this.quad(-2.5*side,z,.1,2.4,'#dce0ce',.018);this.quad(-7.7*side,z,.09,3.01,'#d3d8c8',.018);this.layer=-2;}
for(let z=-26;z<=40;z+=9){this.tree(7.3*side,z,3.2);this.box(8.5*side,0,z+3,.16,4.7,.16,'#647c7d');this.box(7.9*side,4.5,z+3,1.4,.12,.2,'#647c7d');this.box(7.45*side,4.43,z+3,.5,.07,.32,'#fff4cc');}
for(let i=0;i<11;i++){const z=-35+i*9,ht=4+(i*7%5);this.box(13.7*side,0,z,7,ht,7,['#d2c8b2','#a8b7b4','#d8d5c3','#b5c1ba'][i%4]);for(let y=1.5;y<ht-.5;y+=1.6)for(let dz=-2.3;dz<=2.4;dz+=1.7)this.box(10.15*side,y,z+dz,.03,.9,.85,'#7c999f');this.box(-14*side,0,z,6,ht+1,7,'#a6b4af');for(let y=1.5;y<ht;y+=1.6)for(let dz=-2.3;dz<2.4;dz+=1.7)this.box(-10.98*side,y,z+dz,.03,.9,.85,'#6f8c94');}
// Parking bay, painted corners, and quiet center marker.
this.layer=-1;const tx=scene.target.x,L=scene.length;this.quad(tx,0,2.2,L,exam?'#82968b':'#8bada080',.024);for(const x of [tx-1.1,tx+1.1]){this.line([[x,.035,-L/2],[x,.035,L/2]],'#e9e8c9',2);}for(const z of [-L/2,L/2])this.line([[tx-1.1,.035,z],[tx+1.1,.035,z]],'#f7efcd',3);
if(!exam){this.line([[tx-.3,.04,-.6],[tx-.3,.04,.6],[tx+.25,.04,.6],[tx+.3,.04,.2],[tx-.3,.04,.2]],'#d6e8d1',4);}
for(const [i,ob]of scene.obstacles.entries())this.car(ob,i?'#c5b799':'#94b2b8');
if(guides&&!exam){let p={...s,gear:'R',speed:-1.1};const left=[],right=[];for(let i=0;i<100;i++){p=step(p,{throttle:true},1/30);if(i%3===0){const a=p.angle;left.push([p.x-.82*Math.cos(a)-2.1*Math.sin(a),.055,p.z+.82*Math.sin(a)-2.1*Math.cos(a)]);right.push([p.x+.82*Math.cos(a)-2.1*Math.sin(a),.055,p.z-.82*Math.sin(a)-2.1*Math.cos(a)]);}}this.line(left,'#e7cf80',2);this.line(right,'#e7cf80',2);for(let i=9;i<left.length;i+=9)this.line([left[i],right[i]],'#e7cf80',2);}
if(this.view!=='driver'&&this.view!=='rear')this.car(s,hits?'#407f90':'#407f90',true);
this.queue.sort((a,b)=>a.layer-b.layer||b.depth-a.depth);for(const item of this.queue){c.beginPath();item.ps.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));if(item.line){c.strokeStyle=item.color;c.lineWidth=item.width;c.lineJoin='round';c.stroke();}else{c.closePath();c.fillStyle=item.color;c.fill();}}
if(this.view==='driver'){c.fillStyle='#1c3644';c.beginPath();c.moveTo(0,h);c.lineTo(0,h*.86);c.quadraticCurveTo(w/2,h*.72,w,h*.86);c.lineTo(w,h);c.fill();c.fillStyle='#739ba6';c.beginPath();c.ellipse(w/2,h*.84,w*.24,h*.045,0,Math.PI,0);c.fill();c.strokeStyle='#1c3644';c.lineWidth=w*.025;c.beginPath();c.moveTo(w*.04,h);c.lineTo(0,h*.05);c.moveTo(w*.96,h);c.lineTo(w,h*.05);c.stroke();}
}
}


