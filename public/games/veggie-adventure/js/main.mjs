import {createAssetLoader} from './asset-loader.mjs';
import {STEP} from './core/game.mjs';
import {Campaign} from './core/campaign.mjs';
import {LEVELS} from '../levels/catalog.mjs';
import {SAVE_KEY,DEBUG_SAVE_KEY,LEGACY_SAVE_KEY,encodeSave,decodeSave} from './core/save.mjs';
import {createRenderer} from './render.mjs';
import {AnimationPlayer} from './core/animation.mjs';
import {bindTouchControls} from './touch-controls.mjs';
import {MusicDirector} from './audio.mjs';
import {bindViewport} from './viewport.mjs';
import {playerAttack} from './core/player-attacks.mjs';
import {SoundDirector} from './sound-effects.mjs';
import {bindObjectReview,reviewSpawn} from './object-review.mjs';
import {bindFull32Review} from './full32-review.mjs';
const $=id=>document.getElementById(id),images=new Map(),campaign=new Campaign();
const motionQA=new URLSearchParams(location.search).get('qa')==='1';$('motion-qa').hidden=!motionQA;
const storageKey=motionQA?DEBUG_SAVE_KEY:SAVE_KEY;$('level-picker').hidden=!motionQA;
const reviewOnly=new URLSearchParams(location.search).has('review');
if(motionQA)document.body.classList.add('motion-qa');
let musicStorage;try{musicStorage=localStorage;}catch{}
const audio=new MusicDirector({storage:musicStorage,fetcher:(...args)=>fetch(...args),persistPreferences:!reviewOnly});
const sound=new SoundDirector({storage:musicStorage,fetcher:(...args)=>fetch(...args),persistPreferences:!reviewOnly});
$('music-volume').value=String(Math.round(audio.volume*100));
$('sfx-volume').value=String(Math.round(sound.volume*100));
let assetLoader=null,loadingGame=null;
let game=campaign.game,paused=true,ready=false,last=0,acc=0,jumpPending=false,savedRunState='',savedWin=false,campaignEnded=false,hasStarted=false;
const animation=new AnimationPlayer(),animationLibrary={actors:{}};
const draw=createRenderer($('game'),images,animation,animationLibrary),held=new Set();let victoryTime=0;
const touch=bindTouchControls($('joystick'),[...document.querySelectorAll('[data-key]')],{enabled:()=>ready&&!paused&&game.mode==='playing',jump:()=>{if(!active('jump'))jumpPending=true;}});
bindViewport($('game'),$('game-shell'),{window,document,button:$('fullscreen'),forceTouch:motionQA&&new URLSearchParams(location.search).get('touch')==='1',onResize:()=>clear()});
$('settings-toggle').onclick=()=>{const open=$('settings').hidden;$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));if(open&&ready&&!paused)pause();};
const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',Space:'jump',KeyZ:'jump',KeyX:'fire'};
function active(k){return [...held].some(code=>map[code]===k)||touch.active(k);}
function clear(){held.clear();touch.clear();jumpPending=false;document.querySelectorAll('.active').forEach(b=>b.classList.remove('active'));}
function musicState(){audio.update(game,{paused:paused&&hasStarted&&!campaignEnded&&game.mode!=='gameover',title:!hasStarted&&!campaignEnded&&game.mode==='playing',ending:campaignEnded});sound.setPaused(paused);$('music-toggle').textContent=!audio.unlocked?'开启音乐':audio.muted?'音乐：静音':'音乐：开';$('music-state').textContent=audio.message;$('sfx-toggle').textContent=sound.muted?'音效：关':'音效：开';}
function unlockAudio(){return audio.unlock().then(ok=>ok?sound.unlock(audio.context):false);}
function show(title,detail,button='继续冒险'){paused=true;clear();$('overlay').hidden=false;$('overlay').classList.toggle('game-over',game.mode==='gameover');$('message').textContent=title;$('detail').textContent=detail;$('start').textContent=button;musicState();}
function play(){
 if(loadingGame===game)return;
 const target=game,pending=assetLoader?.ensure(game.level,(n,total)=>{if(game===target)$('detail').textContent='关卡素材 '+n+' / '+total;});
 if(pending){loadingGame=target;show('正在准备关卡','优先加载当前场景，请稍候。','加载中');$('start').disabled=true;
  pending.then(()=>{if(loadingGame===target)loadingGame=null;if(game===target){$('start').disabled=false;if(document.hidden||document.hasFocus?.()===false)show('准备完成','点击继续冒险。');else play();}}).catch(e=>{if(loadingGame===target)loadingGame=null;if(game===target){$('start').disabled=false;show('资源暂未加载完成',e.message+'，点击重试。','重试');}});return;}
paused=false;hasStarted=true;clear();$('overlay').hidden=true;$('settings').hidden=true;$('settings-toggle').setAttribute('aria-expanded','false');last=0;acc=0;void unlockAudio();musicState();}
function pause(){if(!ready||campaignEnded||game.mode==='gameover')return;if(paused)play();else show('休息一下','暂停期间倒计时停止。');}
function runState(){return game.mode+':'+game.rebirths+':'+game.pendingRebirth;}
function persist(){if(game.level.warpRoom)return;if(reviewOnly){$('storage').textContent='只读验收模式：不会写入正式游戏进度。';return;}try{localStorage.setItem(storageKey,encodeSave(game,[...campaign.completed]));$('storage').textContent=motionQA?'调试进度已独立保存，不覆盖正常旅程。':'旅程与剩余重生次数已保存；重新打开从当前小关起点开始。';}catch{$('storage').textContent='浏览器存储不可用；关闭页面后不保留本局。';}}
function sync(){game=campaign.game;sound.stop();animation.reset();animation.update(game,0);victoryTime=0;savedRunState=runState();savedWin=false;campaignEnded=false;last=0;acc=0;clear();$('pause').disabled=!ready||game.mode==='gameover';$('retry').disabled=!ready||!motionQA||game.mode==='gameover'||game.level.warpRoom;$('level').value=game.level.id;$('title').textContent=game.level.warpRoom?'隐秘选关房':game.level.id+' · '+(game.level.name||'芽豆出发');}
function enter(id,carry={}){audio.resetRun();campaign.select(id,carry);sync();persist();show($('title').textContent,game.level.focus||'安全移动与短坑','开始本关');}
function completedScreen(){if(campaign.advance()){sync();persist();play();}else {campaignEnded=true;show('蔬果王庭获救！',campaign.completed.size===32?'32关旅程全部完成。草莓园丁与你一同迎接花园新生！':'石榴王已被击败。本局已完成 '+campaign.completed.size+'/32 关。','再玩一局');}}
function gameOverScreen(){show('游戏结束','本局重生次数已用完。本局止步 '+game.level.id+'，总分 '+game.score+'。重新开始将从1-1出发。','重新开始');$('pause').disabled=true;$('retry').disabled=true;}
function fresh(){audio.resetRun();campaign.restart();sync();persist();play();}
$('start').onclick=()=>{if(campaignEnded||game.mode==='gameover')fresh();else pause();};
$('pause').onclick=pause;$('fresh').onclick=()=>{if(ready)fresh();};$('retry').hidden=!motionQA;$('retry').onclick=()=>{if(!ready||!motionQA||game.mode==='gameover')return;game.restore();animation.reset();animation.update(game,0);victoryTime=0;savedWin=false;campaignEnded=false;savedRunState=runState();persist();play();};
$('load-level').onclick=()=>{if(ready&&motionQA)enter($('level').value);};
$('music-toggle').onclick=()=>{if(!audio.unlocked){if(audio.muted)audio.toggleMute();void unlockAudio();}else audio.toggleMute();musicState();};
$('music-volume').oninput=()=>{audio.setVolume(Number($('music-volume').value)/100);void unlockAudio();musicState();};
$('sfx-toggle').onclick=()=>{sound.toggleMute();void unlockAudio();musicState();};
$('sfx-volume').oninput=()=>{sound.setVolume(Number($('sfx-volume').value)/100);void unlockAudio();musicState();};
if(motionQA)for(const l of LEVELS){const option=document.createElement('option');option.value=l.id;option.textContent=l.id+' · '+(l.name||'芽豆出发');$('level').append(option);}
const full32=motionQA&&new URLSearchParams(location.search).get('review')==='full32-audit';
const auditControls=full32?bindFull32Review({document,mount:$('settings'),onPosition:point=>{enter(game.level.id,{score:0,form:point.form,rebirths:3});reviewSpawn(game,point.x,point.foot);animation.reset();animation.update(game,0);show('巡检定位 '+game.level.id,'调试定位与形态设置；使用正常输入及伤害，不写入旅程存档。','开始巡检');}}):null;
if(motionQA&&['placeholder-audit','full32-audit'].includes(new URLSearchParams(location.search).get('review')))bindObjectReview({document,levels:LEVELS,mount:$('settings'),onSelect:point=>{enter(point.level,{score:0,form:auditControls?.form()||0,rebirths:3});reviewSpawn(game,point.x,point.foot);animation.reset();animation.update(game,0);show(point.name,'素材巡检：使用正常移动、跳跃与战斗；不写入旅程存档。','开始巡检');}});
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement||e.target instanceof HTMLButtonElement||e.target===$('music-volume')||e.target===$('sfx-volume'))return;if(map[e.code]){e.preventDefault();if(!e.repeat&&map[e.code]==='jump'&&!active('jump'))jumpPending=true;held.add(e.code);}if(e.code==='KeyP'&&!e.repeat)pause();});
window.addEventListener('keyup',e=>held.delete(e.code));
document.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>b.blur()));
window.addEventListener('blur',()=>{audio.setHidden(true);sound.setHidden(true);if(ready&&!paused&&!campaignEnded)show('已自动暂停','切回窗口后继续。');clear();});
window.addEventListener('focus',()=>{audio.setHidden(false);sound.setHidden(false);});
document.addEventListener('visibilitychange',()=>{audio.setHidden(document.hidden);sound.setHidden(document.hidden);if(document.hidden&&ready&&!paused&&!campaignEnded)show('已自动暂停','页面离开时暂停倒计时。');});
window.addEventListener('pagehide',e=>{if(e.persisted){audio.setHidden(true);sound.setHidden(true);}else{sound.dispose();audio.dispose();}});
window.addEventListener('pageshow',()=>{audio.setHidden(false);sound.setHidden(false);});
window.addEventListener('resize',clear);
function loop(t){if(!last)last=t;const elapsed=Math.min(.1,(t-last)/1000);last=t;
 if(ready&&!paused){acc+=elapsed;while(acc>=STEP){const input=Object.fromEntries(['left','right','down','jump','fire'].map(k=>[k,active(k)]));input.jumpPressed=jumpPending;jumpPending=false;game.step(STEP,input);animation.update(game,STEP);sound.update(game);acc-=STEP;
  if(game.warpRequested&&campaign.openWarpRoom()){sync();play();sound.play('warp');break;}
  if(game.warpTarget&&campaign.warpTo(game.warpTarget)){sync();persist();play();sound.play('warp');break;}
  if(runState()!==savedRunState){savedRunState=runState();persist();clear();}
  if(game.mode==='gameover'){gameOverScreen();break;}
  if(game.mode==='won'){victoryTime+=STEP;if(!savedWin){savedWin=true;campaign.finish();persist();}if(victoryTime>=1){completedScreen();break;}}
 }}else acc=0;
 if(ready){musicState();draw(game);$('hud').textContent=game.level.warpRoom?'隐秘选关房 · 32关同屏 · 踏板上行，下拉＋跳跃下行；撞击泥土方块进入':game.level.id+' · '+['基础芽豆','成长芽豆','辣椒芽豆'][game.p.form]+(game.p.form===2?' · '+playerAttack(game.p).name+' +'+(game.p.attackBonus||0):'')+' · 剩余重生 '+game.rebirths+'次 · 分数 '+game.score+' · '+Math.max(0,Math.ceil(game.remaining))+'秒 · 已完成 '+campaign.completed.size+'/32'+(game.p.inWater?' · 水下':'')+(game.p.star>0?' · 无敌 '+Math.ceil(game.p.star)+'秒':'');if(motionQA)$('motion-qa').textContent=`x=${game.p.x.toFixed(1)} foot=${(game.p.y+game.p.h).toFixed(1)} vx=${game.p.vx.toFixed(1)} vy=${game.p.vy.toFixed(1)} charge=${Math.round((game.p.runCharge||0)*100)}% ${game.p.grounded?'ground':'air'} ${game.mode} t=${game.time.toFixed(2)}`+(game.boss?` | boss x=${game.boss.x.toFixed(1)} hp=${game.boss.hp}/${game.boss.maxHp} ${game.boss.phase}/${game.boss.pattern||'-'} ${game.boss.timer.toFixed(2)}`:'');}requestAnimationFrame(loop);
}
async function boot(){try{
 void audio.loadManifest();
 void sound.loadManifest();
 const response=await fetch('assets/manifest.json');if(!response.ok)throw Error('素材清单无法读取');const m=await response.json();let count=0;
 animationLibrary.actors=m.animations?.actors||{};
 try{const saved=decodeSave(localStorage.getItem(storageKey))||(motionQA?decodeSave(localStorage.getItem(SAVE_KEY)):null)||decodeSave(localStorage.getItem(LEGACY_SAVE_KEY));if(saved){campaign.restore(saved);$('storage').textContent=(motionQA?'调试模式：已读取 ':'已读取 ')+saved.level+' 的进度。';}}catch{$('storage').textContent='本次使用临时存档。';}
 game=campaign.game;
 assetLoader=createAssetLoader({assets:m.assets,images,Image,revision:m.deliveryVersion});
 await assetLoader.ensure(game.level,(n,total)=>{$('detail').textContent='当前关卡素材 '+n+' / '+total;});
 sync();ready=true;$('start').disabled=false;for(const id of ['fresh','pause','music-toggle','sfx-toggle'])$(id).disabled=false;$('retry').disabled=!motionQA;$('load-level').disabled=!motionQA;$('level').disabled=!motionQA;persist();
 if(game.mode==='gameover')gameOverScreen();else if(game.mode==='won'){savedWin=true;completedScreen();}else show($('title').textContent,(game.level.focus||'踩香菇、顶叶纹箱，越过短坑，前往右侧出口。')+' · 剩余重生 '+game.rebirths+'次','开始冒险');
 requestAnimationFrame(loop);
 }catch(e){$('message').textContent='暂时无法开始';$('detail').textContent=e.message+'。请通过本地 HTTP 服务打开游戏。';}}
boot();
