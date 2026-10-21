export const SHORTCUTS=[
  ['f','F','gear-forward','D 前進檔'],['r','R','gear-reverse','R 倒車檔'],['p','P','gear-park','P 停車檔'],
  ['z','Z','full-left','方向盤左打滿'],['x','X','center','方向盤回正'],['v','V','full-right','方向盤右打滿'],
  ['1','1','view-driver','第一人稱'],['2','2','view-orbit','斜俯視'],['3','3','view-top','正上方'],['4','4','view-chase','跟車視角'],
  ['t','T','hud-toggle','教學／輔助'],['b','B','rear-toggle','倒車顯影'],['u','U','demo','開始／停止示範'],['i','I','demo-pause','暫停／繼續示範'],
  ['e','E','finish','完成停車'],['backspace','⌫','reset','重新練習'],['g','G','settings','練習設定'],
  ['m','M','sound-toggle','全部聲音開關'],['n','N','music-toggle','背景音樂開關'],['?','?','shortcut-toggle','快捷鍵說明'],
];
export function editingTarget(target){return target instanceof Element&&Boolean(target.closest('input,select,textarea,[contenteditable="true"]'));}

export function bindShortcuts({enabled,onHold}){
  const table=document.getElementById('shortcut-list');
  for(const [key,label,id,description] of SHORTCUTS){
    const button=document.getElementById(id);if(!button)continue;
    button.setAttribute('aria-keyshortcuts',key==='enter'?'Enter':key==='backspace'?'Backspace':label);
    button.title=`${description}（${label}）`;
    if(!button.querySelector('kbd'))button.dataset.shortcut=label;
    const row=document.createElement('div'),term=document.createElement('dt'),value=document.createElement('dd');
    const kbd=document.createElement('kbd');kbd.textContent=label;term.append(kbd);value.textContent=description;row.append(term,value);table.append(row);
  }
  let holding=false;
  window.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing||editingTarget(event.target))return;
    const key=event.key.toLowerCase();
    if(key==='?'||key==='f1'){event.preventDefault();if(!event.repeat)document.getElementById('shortcut-toggle').click();return;}
    if(!enabled())return;
    if(key==='o'){event.preventDefault();holding=true;onHold(true);return;}
    if(key==='enter'&&event.target.closest?.('button,[role="button"],summary,a'))return;
    const action=SHORTCUTS.find(item=>item[0]===key);if(!action)return;
    const button=document.getElementById(action[2]);
    if(button.disabled||button.hidden)return;
    event.preventDefault();if(!event.repeat)button.click();
  });
  window.addEventListener('keyup',event=>{if(event.key.toLowerCase()==='o'&&holding){holding=false;onHold(false);}});
  window.addEventListener('blur',()=>{holding=false;onHold(false);});
}
