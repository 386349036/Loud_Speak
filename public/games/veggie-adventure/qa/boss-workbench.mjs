import {Game,STEP} from '../js/core/game.mjs';
import {LEVELS} from '../levels/catalog.mjs';
import {AnimationPlayer} from '../js/core/animation.mjs';
import {createRenderer} from '../js/render.mjs';
import {createAssetLoader} from '../js/asset-loader.mjs';
import {BOSS_SKILLS} from '../js/core/boss-balance.mjs';
const $=id=>document.getElementById(id),images=new Map(),manifest=await(await fetch('../assets/manifest.json')).json();
// Loader paths are relative to the gameplay root, so resolve them here explicitly.
class ReviewImage extends Image{set src(value){super.src='../'+value;}get src(){return super.src;}}
const loader=createAssetLoader({assets:manifest.assets,images,Image:ReviewImage}),animation=new AnimationPlayer(),draw=createRenderer($('game'),images,animation,manifest.animations);
let game,running=false,last=0,acc=0,events=[],previous='',ready=false;
// Visible diagnostic mode; it changes only the starting cycle, never damage or HP.
const modeLabel=document.createElement('label');modeLabel.textContent=' 演练方式 ';const exercise=document.createElement('select');exercise.id='exercise';exercise.setAttribute('aria-label','演练方式');for(const [value,text]of [['normal','正常轮换'],['signature','专属技能先行']]){const o=document.createElement('option');o.value=value;o.textContent=text;exercise.append(o);}modeLabel.append(exercise);$('reset').before(modeLabel);
const lensLabel=document.createElement('label');lensLabel.textContent=' 镜头 ';const lens=document.createElement('select');lens.setAttribute('aria-label','镜头宽度');for(const width of [430,320,256]){const o=document.createElement('option');o.value=width;o.textContent=width+'单位';lens.append(o);}lensLabel.append(lens);$('play').after(lensLabel);lens.onchange=()=>{$('game').width=Number(lens.value)*3;render();};
for(const l of LEVELS.filter(l=>l.boss&&l.world>=2)){const o=document.createElement('option');o.value=l.id;o.textContent=l.id+' '+l.boss.name;$('boss').append(o);}
async function reset(){ready=false;running=false;$('play').textContent='实时运行';const l=LEVELS.find(l=>l.id===$('boss').value);await loader.ensure(l);game=new Game(l,{form:Number($('form').value)});game.p.x=l.boss.left+20;game.p.y=208-game.p.h;if(exercise.value==='signature')game.boss.cycle=2;events=[];previous='';animation.reset();animation.update(game,0);ready=true;render();}
function step(){const p=game.p,dir=Number($('direction').value),jump=$('jump').checked&&p.grounded;game.step(STEP,{right:dir>0,left:dir<0,jump:$('jump').checked,jumpPressed:jump,fire:$('fire').checked});animation.update(game,STEP);const b=game.boss,key=b.phase+'/'+b.pattern+'/'+b.cycle;if(key!==previous){events.push(`${game.time.toFixed(2)}s ${key} hp=${b.hp} x=${b.x.toFixed(1)}`);events=events.slice(-50);previous=key;}}
function render(){if(!ready)return;const b=game.boss,p=game.p;$('state').textContent=`${game.level.id} ${b.name} | 时间 ${game.time.toFixed(2)} | ${game.mode} | 主角${p.form+1} x=${p.x.toFixed(1)} foot=${(p.y+p.h).toFixed(1)} | Boss ${b.hp}/${b.maxHp} ${b.phase} / ${b.pattern||'-'} t=${b.timer.toFixed(2)} x=${b.x.toFixed(1)} | 危险物${game.dangers.length}\n技能：${Object.values(BOSS_SKILLS[b.kind]).map(s=>s.name).join('、')}`;$('log').textContent=events.slice(-5).join('\n');draw(game);}
function advance(seconds){running=false;$('play').textContent='实时运行';if(!ready)return;for(let n=0;n<seconds/STEP;n++)step();render();}
$('reset').onclick=reset;$('boss').onchange=reset;$('form').onchange=reset;$('play').onclick=()=>{running=!running;last=0;$('play').textContent=running?'暂停运行':'实时运行';};$('step').onclick=()=>advance(.5);$('step-short').onclick=()=>advance(.1);$('step-long').onclick=()=>advance(5);
exercise.onchange=reset;
function frame(t){if(running&&ready){if(!last)last=t;acc+=Math.min(.05,(t-last)/1000);while(acc>=STEP){step();acc-=STEP;}render();}last=t;requestAnimationFrame(frame);}await reset();requestAnimationFrame(frame);
