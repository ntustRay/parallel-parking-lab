const STORE='parking-lab-audio-v1';
const defaults={muted:false,effects:true,music:true,effectsVolume:.45,musicVolume:.22};
const unit=value=>Math.max(0,Math.min(1,Number(value)||0));
const frequency=note=>440*2**((note-69)/12);

// Original, locally synthesised cues and a quiet pentatonic practice loop.
// No downloads, recordings, external assets or autoplay before a user gesture.
export class GameAudio{
  constructor(){
    this.options={...defaults};this.active=false;this.timer=null;this.nextBeat=0;this.beat=0;this.lastBeep=0;
    try{
      const saved=JSON.parse(localStorage.getItem(STORE)||'null');
      for(const key of ['muted','effects','music'])if(typeof saved?.[key]==='boolean')this.options[key]=saved[key];
      for(const key of ['effectsVolume','musicVolume'])if(Number.isFinite(saved?.[key]))this.options[key]=unit(saved[key]);
    }catch{}
  }
  unlock(){
    try{
      if(!this.context){
        const Context=window.AudioContext||window.webkitAudioContext;
        if(!Context)return;
        this.context=new Context();this.effects=this.context.createGain();this.music=this.context.createGain();
        const limiter=this.context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.ratio.value=6;
        this.effects.connect(limiter);this.music.connect(limiter);limiter.connect(this.context.destination);
        this.gains();
      }
      if(this.context.state==='suspended')void this.context.resume().then(()=>this.schedule()).catch(()=>{});
      else this.schedule();
    }catch{/* Sound is optional; unsupported audio must not stop driving. */}
  }
  set(key,value){
    if(!(key in defaults))return;
    this.options[key]=key.endsWith('Volume')?unit(value):Boolean(value);
    try{localStorage.setItem(STORE,JSON.stringify(this.options));}catch{}
    this.gains();this.schedule();
  }
  gains(){
    if(!this.context)return;
    const o=this.options,t=this.context.currentTime;
    this.effects.gain.setTargetAtTime(!o.muted&&o.effects?o.effectsVolume:0,t,.025);
    this.music.gain.setTargetAtTime(!o.muted&&o.music&&this.active?o.musicVolume*.32:0,t,.06);
  }
  setActive(active){
    if(this.active===active)return;
    this.active=active;this.gains();this.schedule();
  }
  tone(bus,note,start,duration,volume,type='sine'){
    const c=this.context,osc=c.createOscillator(),gain=c.createGain();
    osc.type=type;osc.frequency.value=frequency(note);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(volume,start+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    osc.connect(gain);gain.connect(bus);osc.start(start);osc.stop(start+duration+.02);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  cue(name='click'){
    if(!this.context||this.context.state!=='running'||this.options.muted||!this.options.effects)return;
    const cues={click:[[78,0,.07,.12]],gear:[[55,0,.09,.2],[62,.065,.12,.13]],warning:[[71,0,.14,.18],[66,.14,.18,.14]],hit:[[34,0,.2,.27],[39,.025,.15,.1]],success:[[60,0,.4,.15],[64,.12,.45,.14],[67,.24,.55,.14],[72,.36,.7,.12]]};
    const t=this.context.currentTime;
    for(const [note,offset,duration,gain] of cues[name]||cues.click)this.tone(this.effects,note,t+offset,duration,gain,name==='hit'?'triangle':'sine');
  }
  proximity(distance,moving,now){
    if(!moving||distance>=1.3||!this.context||this.context.state!=='running'||this.options.muted||!this.options.effects)return;
    const interval=140+Math.max(0,distance)*650;
    if(now-this.lastBeep<interval)return;
    this.lastBeep=now;this.tone(this.effects,distance<.25?84:79,this.context.currentTime,.075,.1);
  }
  schedule(){
    const playing=this.active&&this.context?.state==='running'&&this.options.music&&!this.options.muted&&this.options.musicVolume>0;
    if(!playing){if(this.timer)clearInterval(this.timer);this.timer=null;this.nextBeat=0;return;}
    if(this.timer)return;
    this.nextBeat=this.context.currentTime+.06;
    const tick=()=>{
      if(!this.active||this.context.state!=='running')return;
      const c=this.context,step=60/76/2;
      // Skip elapsed beats after a throttled background tab instead of catching up.
      this.nextBeat=Math.max(this.nextBeat,c.currentTime+.015);
      while(this.nextBeat<c.currentTime+.18){
        const chords=[[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,62]],chord=chords[Math.floor(this.beat/16)%4];
        const phrase=[0,2,3,1,2,3,2,1],note=chord[phrase[this.beat%8]]+12;
        if(this.beat%2===0)this.tone(this.music,note,this.nextBeat,.9,.15,'triangle');
        if(this.beat%8===0)for(const value of chord)this.tone(this.music,value,this.nextBeat,2.3,.065);
        this.nextBeat+=step;this.beat++;
      }
    };
    tick();this.timer=setInterval(tick,100);
  }
}
