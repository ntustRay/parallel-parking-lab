import {CAR,metrics,parkingLandmarks} from './physics.js';

const parallel=[
  ['車尾已對齊，確認周圍','起點已與前車車尾對齊，兩車側向間距 50 cm。先看左右鏡及後方，踩住煞車再排 R 檔。'],
  ['留出車頭轉入空間','從車尾對齊的位置直退，保留本車需要的起轉空間。煞停後向路緣側打滿。'],
  ['斜退入格，再回正直退','向路緣側打滿，低速倒退約 35°。觀察道路側後視鏡，煞停回正，再直退至道路側後輪到達車格外側線。'],
  ['反打回正，前後微調','反向打滿慢慢倒退，車身平行就回正。煞停後前後微調，完全入位後排 P 檔。'],
];
const garage=[
  ['通過車格，準備倒車','沿車道開過目標車格，確認兩側與後方。先直退至起轉位置；打開教學看本車示範，別把固定參考點套用到所有車型。'],
  ['向車格側打滿，慢慢倒退','煞停後向車格側打滿，再慢慢倒退。交替看左右後視鏡，留意車尾與相鄰車輛；接近格線方向就停穩。'],
  ['回正，對齊兩側格線','車身約轉過 90°、與格線同向後按 X 回正。用兩側後視鏡確認間距，直線緩慢倒入；偏斜時先煞停再修正。'],
  ['車身完全入格，煞停排 P','確認四角都在車格內，保留後方空間。完全煞停、排 P，再按「完成停車」。'],
];

export function lessonProgress(car,scene,phase,demonstrated){
  if(demonstrated)return Math.min(3,car.lessonPhase??3);
  if(scene.kind==='garage'){
    const m=metrics(car,scene);
    if(phase===0&&Math.abs(car.steer)>.15)phase=1;
    if(phase<=1&&m.angle<12)phase=2;
    if(phase===2&&m.inside)phase=3;
    return phase;
  }
  const angle=metrics(car,scene).angle;
  if(phase===0&&car.gear==='R')phase=1;
  if(phase===1&&(Math.abs(car.steer)>.15||angle>3))phase=2;
  if(phase===2&&angle>8&&car.steer*scene.side<-.15)phase=3;
  return phase;
}

export function lessonContent(car,scene,phase,plan){
  const [title,original]=(scene.kind==='garage'?garage:parallel)[phase];
  let text=original,landmark;
  if(scene.kind==='garage'){
    const m=metrics(car,scene);
    landmark=phase===0&&plan?`距起轉位置 ${Math.round((car.z-plan.startZ)*100)} cm · 煞停後轉向`:`與格線夾角 ${m.angle.toFixed(1)}° · 後方餘裕 ${Math.round(m.curb*100)} cm`;
  }else{
    const m=parkingLandmarks(car,scene);
    if(phase===1&&plan)text=plan.rearAlignmentExtra>.02?`起點車尾已對齊；本格從對齊處直退約 ${Math.round(plan.rearAlignmentExtra*100)} cm，留出轉入空間。停穩後向路緣打滿。`:'本格從車尾對齊處即可起轉。踩住煞車、向路緣側打滿，再放開煞車慢慢倒退。';
    if((phase===1||phase===2)&&!plan)text='本格沒有單次轉入的安全起轉區間，請分段停穩、觀察前後車並前後修正。';
    landmark=phase<2?`側向間距 ${Math.round(scene.sideGap*100)} cm · ${Math.abs(m.rearAlignment)<.005?'車尾對齊 0 cm':`車尾${m.rearAlignment>=0?'超前':'已退過'} ${Math.abs(Math.round(m.rearAlignment*100))} cm`}`:`車身角度 ${metrics(car,scene).angle.toFixed(1)}° · 道路側後輪${m.outerRearWheelToLine<0?'距外側線':'已入線'} ${Math.abs(Math.round(m.outerRearWheelToLine*100))} cm`;
  }
  return {title,text:text.replaceAll('車格側',scene.side===1?'右側車格':'左側車格'),landmark,
    scale:`練習車 ${CAR.length.toFixed(2)} × ${CAR.width.toFixed(2)} m · 車格 ${scene.length.toFixed(1)} × ${scene.target.width.toFixed(1)} m`,
    clearanceLabel:scene.kind==='garage'?'後方餘裕':'路緣距離',angleLabel:scene.kind==='garage'?'與格線夾角':'車身角度'};
}

export function observationYaw(scene,phase){return (scene.kind==='garage'?[100,120,90,45]:[75,130,-75,25])[phase]*scene.side;}
