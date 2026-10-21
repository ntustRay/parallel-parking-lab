const loader=document.getElementById('loading'),title=document.getElementById('loading-title'),message=document.getElementById('loading-message');
let failed=false,ready=false;
const timeout=setTimeout(()=>{if(!ready&&!failed)message.textContent='第一次建立場景可能需要一點時間，請稍候。';},12000);
window.parkingBoot={
  stage(text){if(!failed&&!ready)message.textContent=text;},
  ready(){
    if(ready||failed)return;ready=true;clearTimeout(timeout);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      loader.hidden=true;loader.setAttribute('aria-busy','false');document.body.classList.add('app-ready');
      window.dispatchEvent(new Event('parking:ready'));
    }));
  },
  fail(text='場景載入失敗，請確認網路連線後重新載入。'){
    if(failed)return;failed=true;ready=false;clearTimeout(timeout);
    loader.hidden=false;loader.setAttribute('aria-busy','false');loader.classList.add('loading-failed');loader.setAttribute('role','alert');
    title.textContent='暫時無法開啟練習場';message.textContent=text;
    document.getElementById('loading-retry').hidden=false;
  }
};
document.getElementById('loading-retry').onclick=()=>location.reload();
window.addEventListener('error',()=>{if(!ready)window.parkingBoot.fail();});
window.addEventListener('unhandledrejection',()=>{if(!ready)window.parkingBoot.fail();});
try{
  window.parkingBoot.stage('正在下載 3D 場景與操作模組…');
  await import('./game.js');
}catch(error){console.error(error);window.parkingBoot.fail();}
