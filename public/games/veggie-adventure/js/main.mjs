import {STEP} from './core/game.mjs';
import {Campaign} from './core/campaign.mjs';
import {LEVELS,nextLevel} from '../levels/catalog.mjs';
import {SAVE_KEY,LEGACY_SAVE_KEY,encodeSave,decodeSave} from './core/save.mjs';
import {createRenderer} from './render.mjs';
import {AnimationPlayer} from './core/animation.mjs';
import {bindTouchControls} from './touch-controls.mjs';
const $=id=>document.getElementById(id),images=new Map(),campaign=new Campaign();
let game=campaign.game,paused=true,ready=false,last=0,acc=0,jumpPending=false,savedCheckpoint=game.checkpoint,savedWin=false;
const animation=new AnimationPlayer(),animationLibrary={actors:{}};
const draw=createRenderer($('game'),images,animation,animationLibrary),held=new Set();let victoryTime=0;
const touch=bindTouchControls($('joystick'),[...document.querySelectorAll('[data-key]')],{enabled:()=>ready&&!paused,jump:()=>{if(!active('jump'))jumpPending=true;}});
const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',Space:'jump',KeyZ:'jump',ShiftLeft:'run',ShiftRight:'run',KeyX:'fire'};
function active(k){return [...held].some(code=>map[code]===k)||touch.active(k);}
function clear(){held.clear();touch.clear();jumpPending=false;document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'));}
function show(title,detail,button='继续冒险'){paused=true;clear();$('overlay').hidden=false;$('message').textContent=title;$('detail').textContent=detail;$('start').textContent=button;}
function pause(){if(!ready||game.mode==='won')return;if(paused){paused=false;$('overlay').hidden=true;last=0;}else show('休息一下','暂停期间倒计时停止。');}
function persist(){try{localStorage.setItem(SAVE_KEY,encodeSave(game,[...campaign.completed]));$('storage').textContent='进度与检查点已保存到当前浏览器。';}catch{$('storage').textContent='浏览器存储不可用；本次可重试，关闭页面后不保留。';}}
function sync(){game=campaign.game;animation.reset();animation.update(game,0);victoryTime=0;savedCheckpoint=game.checkpoint;savedWin=false;last=0;acc=0;clear();$('level').value=game.level.id;$('title').textContent=game.level.id+' · '+(game.level.name||'芽豆出发');}
function enter(id,carry={}){campaign.select(id,carry);sync();persist();show($('title').textContent,game.level.focus||'安全移动与短坑','开始本关');}
function completedScreen(){const next=nextLevel(game.level.id);show(next?game.level.id+' 已完成':'蔬果王庭获救！',next?'下一关：'+next.id+' · '+next.name+'。形态与分数将延续。':'32关旅程的终点到了。草莓园丁与你一同迎接花园新生。可以从关卡列表重玩。',next?'进入下一关':'重玩最终关');}
function fresh(){enter(game.level.id);}
$('start').onclick=()=>{if(game.mode==='won'){if(campaign.advance()){sync();persist();show($('title').textContent,game.level.focus,'开始本关');}else fresh();}else pause();};
$('pause').onclick=pause;$('fresh').onclick=()=>{if(ready)fresh();};$('retry').onclick=()=>{if(!ready)return;game.restore();animation.reset();animation.update(game,0);victoryTime=0;savedWin=false;persist();paused=false;clear();$('overlay').hidden=true;last=0;};
$('load-level').onclick=()=>{if(ready)enter($('level').value);};
for(const l of LEVELS){const option=document.createElement('option');option.value=l.id;option.textContent=l.id+' · '+(l.name||'芽豆出发');$('level').append(option);}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLButtonElement)return;if(map[e.code]){e.preventDefault();if(!e.repeat&&map[e.code]==='jump'&&!active('jump'))jumpPending=true;held.add(e.code);}if(e.code==='KeyP'&&!e.repeat)pause();});
window.addEventListener('keyup',e=>held.delete(e.code));
document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>b.blur()));
window.addEventListener('blur',()=>{if(ready&&!paused&&game.mode!=='won')show('已自动暂停','切回窗口后继续。');clear();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ready&&!paused)show('已自动暂停','页面离开时暂停倒计时。');});
window.addEventListener('resize',clear);
function loop(t){if(!last)last=t;const elapsed=Math.min(.1,(t-last)/1000);last=t;
 if(ready&&!paused){acc+=elapsed;while(acc>=STEP){const input=Object.fromEntries(['left','right','down','run','jump','fire'].map(k=>[k,active(k)]));input.jumpPressed=jumpPending;jumpPending=false;game.step(STEP,input);animation.update(game,STEP);acc-=STEP;
  if(game.checkpoint!==savedCheckpoint){savedCheckpoint=game.checkpoint;persist();}
  if(game.mode==='won'){victoryTime+=STEP;if(!savedWin){savedWin=true;campaign.finish();persist();}if(victoryTime>=1){completedScreen();break;}}
 }}else acc=0;
 if(ready){draw(game);$('hud').textContent=game.level.id+' · '+['基础芽豆','成长芽豆','辣椒芽豆'][game.p.form]+' · 分数 '+game.score+' · '+Math.max(0,Math.ceil(game.remaining))+'秒 · 已完成 '+campaign.completed.size+'/32'+(game.p.inWater?' · 水下':'')+(game.p.star>0?' · 无敌 '+Math.ceil(game.p.star)+'秒':'');}requestAnimationFrame(loop);
}
async function boot(){try{
 const response=await fetch('assets/manifest.json');if(!response.ok)throw Error('素材清单无法读取');const m=await response.json();let count=0;
 animationLibrary.actors=m.animations?.actors||{};
 await Promise.all(m.assets.map(a=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>{images.set(a.id,i);$('detail').textContent='素材加载 '+(++count)+' / '+m.assets.length;resolve();};i.onerror=()=>reject(Error('素材加载失败：'+a.path));i.src='assets/'+a.path;})));
 try{const saved=decodeSave(localStorage.getItem(SAVE_KEY))||decodeSave(localStorage.getItem(LEGACY_SAVE_KEY));if(saved){campaign.restore(saved);$('storage').textContent='已读取 '+saved.level+' 的进度。';}}catch{$('storage').textContent='本次使用临时存档。';}
 sync();ready=true;$('start').disabled=false;for(const id of ['load-level','fresh','retry','pause'])$(id).disabled=false;
 if(game.mode==='won'){savedWin=true;completedScreen();}else show($('title').textContent,game.level.focus||'踩香菇、顶叶纹箱，越过短坑，前往右侧出口。','开始冒险');
 requestAnimationFrame(loop);
 }catch(e){$('message').textContent='暂时无法开始';$('detail').textContent=e.message+'。请通过本地 HTTP 服务打开游戏。';}}
boot();
