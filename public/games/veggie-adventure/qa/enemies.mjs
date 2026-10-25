import {Game,STEP} from '../js/core/game.mjs';
import {AnimationPlayer} from '../js/core/animation.mjs';
import {createRenderer,cameraX} from '../js/render.mjs';
import {ENEMY_ART} from '../js/core/enemies.mjs';
import {LEVELS} from '../levels/catalog.mjs';

const names=['香菇巡逻兵','卷心菜壳兵','核桃甲虫','刺栗守卫','莲藕水母','椒鱼','玉米投手','豌豆捕虫株','棉花云牧者','茄子炮弹兵','飞翼卷心菜','跃水椒鱼'];
const hints=['观察、预警、短追击、休息；避坑与光环退让。','短追击与避坑；缩壳、侧踢、踩停、醒转。','谨慎短追与避坑；抗火、缩壳、滑动与醒转。','落地展开后短追；避坑与退让，长刺不可踩。','每次脉冲锁定同水域目标，随后缓慢漂移。','同水域预警拦截，锁定目标后返回巡游。','调整投掷间距；举臂锁定预判目标，三连抛射。','隐藏、伸出、停留、缩回；近距离等待。','缓慢预判跟随；预警锁定投放列，最多3只子兵。','炮口预警与近距停火；水平飞行、踩落、抗火。','预警后短距离拦截；踩踏脱翼，落地重新观察。','起跳预警、上升、下落与落地停顿；空中可踩。'];
const kinds=Object.keys(ENEMY_ART),cards=[],images=new Map(),held=new Set(),$=id=>document.getElementById(id);
let selected=0,playing=false,ready=false,last=0,acc=0,jumpPending=false,globalSteps=0;
const actor=(kind,extra={})=>({id:0,kind,x:152,y:194,w:14,h:14,vx:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,phase:0,...extra});
function makeScene(kind,preset){
 const source=LEVELS.find(l=>l.enemies.some(e=>e.kind===kind)||(kind==='bolt'&&l.turrets?.length));
 const level={...structuredClone(source),id:'qa-'+kind,width:256,spawn:{x:32,y:194},exit:1000,checkpoint:1000,timeLimit:9999,boss:null,blocks:[],items:[],movers:[],hazards:[],gates:[],turrets:[],water:[],platforms:[{x:0,y:208,w:256,h:32},{x:0,y:0,w:8,h:208},{x:248,y:0,w:8,h:208}],enemies:[actor(kind)]};
 const e=level.enemies[0];
 if(['mushroom','cabbage','walnut','spike'].includes(kind))Object.assign(e,{patrolLeft:96,patrolRight:224});
 if(kind==='spike')e.y=140;
 if(['fish','jelly'].includes(kind)){e.y=168;level.water=[{x:96,y:144,w:144,h:64}];}
 if(kind==='cloud'){e.y=80;e.vx=0;e.cooldown=1.2;}
 if(kind==='winged')e.y=152;
 if(kind==='leaper'){e.y=200;level.water=[{x:96,y:176,w:144,h:48}];}
 if(kind==='corn'){e.vx=0;e.cooldown=1.2;}
 if(kind==='trap')e.vx=0;
 if(kind==='bolt'){level.enemies=[];level.turrets=[{x:216,y:188,w:16,h:20,cooldown:0,windup:0}];}
 if(preset!=='default'){
  // Explicit QA starting fixtures, never changes the player's real save.
  if(kind==='bolt'){level.turrets=[];level.enemies=[actor(kind,{x:152,y:178,vx:-85,h:12})];}
  const target=level.enemies[0];
  if(['stomp','stop'].includes(preset)){target.vx=0;target.y=['winged','cloud'].includes(kind)?160:194;level.water=[];level.spawn={x:153,y:target.y-40};if(preset==='stop')Object.assign(target,{x:180,state:'rolling',vx:-150});}
  if(preset==='fire'){
   target.x=152;target.vx=0;
   if(['jelly','fish'].includes(kind)){target.y=168;level.spawn={x:112,y:168};}
   else if(['cloud','winged'].includes(kind)){target.y=160;level.spawn={x:112,y:160};}
   else {target.y=194;level.water=[];level.spawn={x:88,y:194};}
  }
  if(['kick','wake'].includes(preset)){Object.assign(target,{state:'shell',vx:0,timer:preset==='wake'?8:0});level.spawn={x:preset==='kick'?141:32,y:194};}
  if(preset==='near'){level.spawn={x:148,y:194};target.phase=.7;}
  if(preset==='contact'){target.y=['fish','jelly'].includes(kind)?168:194;target.vx=0;level.spawn={x:144,y:target.y};if(kind==='trap')target.phase=1.6;}
  if(['alert','aura'].includes(preset))level.spawn={x:['fish','jelly'].includes(kind)?112:104,y:['fish','jelly'].includes(kind)?168:194};
  if(preset==='gap'){target.x=200;target.y=194;target.patrolLeft=176;target.patrolRight=240;level.spawn={x:100,y:194};level.platforms=[{x:0,y:208,w:128,h:32},{x:176,y:208,w:80,h:32}];}
 }
 return level;
}
function resetCard(c){
 c.game=new Game(makeScene(c.kind,c.preset.value),{form:c.preset.value==='fire'?2:Number($('form').value)});
 if(['stomp','stop'].includes(c.preset.value))c.game.p.vy=80;
 if(c.preset.value==='aura')c.game.p.star=5;
 c.animation=new AnimationPlayer();c.animation.update(c.game,0);c.history=[];c.old='';c.draw=createRenderer(c.canvas,images,c.animation,{actors:library});
}
function step(){
 for(let i=0;i<cards.length;i++){
  const c=cards[i],g=c.game,input=i===selected?{left:held.has('ArrowLeft'),right:held.has('ArrowRight'),jump:held.has('Space'),fire:held.has('KeyX'),jumpPressed:jumpPending}:{};
  g.step(STEP,input);c.animation.update(g,STEP);
  const e=g.enemies.find(e=>e.id===0)||g.enemies.find(e=>e.kind===c.kind),clip=e?c.animation.get(e)?.clip:'waiting';
  const state=e?`${e.kind}/${e.state}/${clip}/${e.intent||'-'}/${e.dead?'dead':'live'}`:'waiting';
  if(state!==c.old){c.history.unshift(`${g.time.toFixed(2)} ${state}`);c.history=c.history.slice(0,4);c.old=state;}
 }
 jumpPending=false;globalSteps++;
}
function draw(){
 for(const c of cards){
  const g=c.game;c.draw(g);const ctx=c.canvas.getContext('2d');
  if($('boxes').checked){ctx.setTransform(3,0,0,3,0,0);const camera=cameraX(g.level,g.p,g.boss);ctx.lineWidth=.5;for(const e of [g.p,...g.enemies.filter(e=>!e.dead)]){ctx.strokeStyle=e===g.p?'#77ffff':'#ffeb76';ctx.strokeRect(e.x-camera,e.y,e.w,e.h);}}
  const e=g.enemies.find(e=>e.id===0)||g.enemies.find(e=>e.kind===c.kind),t=e?c.animation.get(e):null;
  c.output.textContent=`t=${g.time.toFixed(2)} ${g.mode} · 子兵 ${g.enemies.filter(e=>!e.dead&&e.parent!==undefined).length}\n${e?`${e.kind} ${e.state} ${e.dead?'已击败':e.active===false?'隐藏/安全':'存活'} · ${t?.clip||'-'} f=${t?.elapsed.toFixed(2)||'0'}\nx=${e.x.toFixed(1)} y=${e.y.toFixed(1)} vx=${e.vx.toFixed(1)} vy=${e.vy.toFixed(1)} ${e.grounded?'ground':'air'}\n意图=${e.intent||'-'} 目标=${(e.brain?.targetX??e.aimX??e.dropX)?.toFixed(1)||'-'}`:'炮口等待发射'}\n主角 x=${g.p.x.toFixed(1)} 形态=${g.p.form}`;
  c.log.textContent=c.history.join(' → ');
 }
 $('boot').textContent=`正式素材已就绪 · ${playing?'观察中':'已暂停'} · 累计步数 ${globalSteps} · 当前控制 ${names[selected]}`;
}
function advance(seconds){playing=false;$('play').textContent='开始观察';for(let n=0;n<Math.round(seconds/STEP);n++)step();draw();}
let library={};
for(let i=0;i<kinds.length;i++){
 const kind=kinds[i],node=document.createElement('section');node.className='card'+(!i?' selected':'');
 const heading=document.createElement('h2');heading.textContent=`${ENEMY_ART[kind]} ${names[i]}`;
 const hint=document.createElement('p');hint.className='hint';hint.textContent=hints[i];
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=720;canvas.setAttribute('aria-label',names[i]+'实时游戏画面');
 const bar=document.createElement('div');bar.className='toolbar';const focus=document.createElement('button');focus.textContent='控制此项';
 const preset=document.createElement('select');preset.setAttribute('aria-label',names[i]+'场景');
 const presets=[['default','默认巡逻']];
 if(!['trap','bolt','leaper'].includes(kind))presets.push(['alert','近距观察']);
 if(['mushroom','cabbage','walnut','spike'].includes(kind))presets.push(['gap','坑边观察'],['aura','无敌光环退让']);
 if(!['spike','jelly','fish','trap'].includes(kind))presets.push(['stomp','踩踏起点']);
 presets.push(['fire','火弹起点']);
 if(['cabbage','walnut'].includes(kind))presets.push(['kick','侧踢壳起点'],['stop','踩停运动壳'],['wake','醒转起点']);
 if(kind==='trap')presets.push(['near','近距离隐藏']);
 if(['spike','jelly','fish','trap'].includes(kind))presets.push(['contact','触碰危险起点']);
 for(const [value,label] of presets){const o=document.createElement('option');o.value=value;o.textContent=label;preset.append(o);}
 const output=document.createElement('output'),log=document.createElement('div');log.className='history';bar.append(focus,preset);node.append(heading,hint,canvas,bar,output,log);$('grid').append(node);
 const c={kind,node,canvas,preset,output,log};cards.push(c);
 focus.onclick=()=>{selected=i;for(const [n,card] of cards.entries())card.node.classList.toggle('selected',n===i);held.clear();jumpPending=false;if(ready)draw();focus.blur();};
 preset.onchange=()=>{if(ready){playing=false;$('play').textContent='开始观察';held.clear();jumpPending=false;resetCard(c);draw();}};
}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'暂停观察':'开始观察';last=0;$('play').blur();draw();};
for(const [id,sec] of [['frame',STEP],['tenth',.1],['half',.5],['three',3]])$(id).onclick=()=>advance(sec);
$('reset').onclick=()=>{playing=false;$('play').textContent='开始观察';held.clear();globalSteps=0;for(const c of cards)resetCard(c);draw();};
$('form').onchange=()=>{if(ready)$('reset').click();};$('boxes').onchange=()=>{if(ready)draw();};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement)return;if(['ArrowLeft','ArrowRight','Space','KeyX'].includes(e.code)){e.preventDefault();if(e.code==='Space'&&!held.has('Space'))jumpPending=true;held.add(e.code);}if(e.code==='KeyP'&&!e.repeat)$('play').click();});
window.addEventListener('keyup',e=>held.delete(e.code));
window.addEventListener('blur',()=>{playing=false;held.clear();if(ready){$('play').textContent='开始观察';draw();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){playing=false;held.clear();$('play').textContent='开始观察';}});
function loop(t){if(!last)last=t;const elapsed=Math.min(.1,(t-last)/1000);last=t;if(playing){acc+=elapsed*Number($('speed').value);while(acc>=STEP){step();acc-=STEP;}}else acc=0;draw();requestAnimationFrame(loop);}
try{
 const manifest=await (await fetch('../assets/manifest.json')).json();library=manifest.animations.actors;
 await Promise.all(manifest.assets.map(a=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(a.id,img);resolve();};img.onerror=()=>reject(Error(a.path));img.src='../assets/'+a.path;})));
 for(const c of cards)resetCard(c);ready=true;for(const b of document.querySelectorAll('header button'))b.disabled=false;draw();requestAnimationFrame(loop);
}catch(error){$('boot').textContent='加载失败：'+error.message;}
