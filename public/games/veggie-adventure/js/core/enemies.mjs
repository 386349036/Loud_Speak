import {overlap} from './geometry.mjs';
import {moveFlyer,moveTrap,moveWaterLeaper} from './enemy-motion.mjs';
import {planGroundEnemy,confineGroundEnemy,positionCorn,groundEnemyEngaged} from './enemy-tactics.mjs';
import {prepareEnemyHealth} from './enemy-health.mjs';
import {moveAquaticPlant} from './aquatic-plant.mjs';
import {finishShellDash,stompSound} from './enemy-attacks.mjs';
export const ENEMY_ART={mushroom:'E01',cabbage:'E02',walnut:'E03',spike:'E04',jelly:'E05',fish:'E06',corn:'E07',trap:'E08',cloud:'E09',bolt:'E10',winged:'E11',leaper:'E12',anemone:'E13'};
export const enemyFacing=e=>Math.sign(e.facing||e.vx||1);
export const enemyActive=e=>!e.dead&&!(['trap','leaper'].includes(e.kind)&&e.active===false);
export const enemyShelled=e=>['cabbage','walnut','spike'].includes(e.kind)&&['shell','rolling'].includes(e.state);
export function defeat(game,e,score=200,reason='hit'){if(e.dead)return;e.dead=true;e.hp=0;e.defeatedBy=reason;game.score+=score;}
export function hurtEnemy(game,e,method='stomp',damage=1){
 if(!enemyActive(e))return false;prepareEnemyHealth(e);if(method==='stomp'&&enemyShelled(e)){game.emitAnimation('enemy-block',e);game.emitSound?.('shell-bounce',e);return false;}if(method==='stomp')game.emitSound?.(stompSound(e),e);e.lastDamage=Math.min(e.hp,method==='fire'?Math.max(1,Math.min(4,Math.floor(damage)||1)):1);e.hp-=e.lastDamage;e.hitFlash=.25;game.emitAnimation('enemy-hit',e);
 if(e.hp<=0)defeat(game,e,method==='stomp'?100:200,method);
 else if(method==='stomp'){
  if(e.kind==='winged'){e.state='stunned';e.vx=0;e.vy=Math.max(0,e.vy||0);e.timer=0;e.grounded=false;delete e.brain;e.aiWarning=false;e.intent='stunned-fall';}
  else if(['cabbage','walnut','spike'].includes(e.kind)){e.state='shell';e.vx=0;e.timer=0;}
 }
 return true;
}
export function updateEnemies(game,dt,oldBottom){
 const p=game.p;
 for(const e of game.enemies){prepareEnemyHealth(e);if(e.dead)continue;e.hitFlash=Math.max(0,e.hitFlash-dt);if(!['rolling','shell','stunned'].includes(e.state)&&!e.brain?.engaged&&e.brain?.mode!=='return'&&Math.abs(e.x-p.x)>320)continue;
  e.grace=Math.max(0,(e.grace||0)-dt);e.phase=(e.phase||0)+dt;e.homeX??=e.x;e.homeY??=e.y;
  planGroundEnemy(game,e,dt);if(e.kind==='corn')positionCorn(game,e,dt);
  if(['fish','jelly','cloud','winged'].includes(e.kind)&&e.state!=='stunned'){
   moveFlyer(game,e,dt);
  }else if(e.kind==='anemone')moveAquaticPlant(game,e,dt);
  else if(e.kind==='trap')moveTrap(game,e,dt);
  else if(e.kind==='leaper'&&moveWaterLeaper(game,e,dt)){}
  else if(e.kind==='bolt'){e.x+=e.vx*dt;if(e.phase>6||game.solids().some(b=>overlap(e,b))){e.dead=true;continue;}}
  else {e.vy=Math.min(280,e.vy+600*dt);game.move(e,dt);if(e.kind==='leaper'&&e.grounded){e.leapWait=(e.leapWait??.5)-dt;e.warning=true;e.vx=0;if(e.leapWait<=0){e.vy=-300;e.grounded=false;e.leapWait=.5;e.warning=false;}}if(e.y>270){e.dead=true;continue;}}
  if(e.state==='walk'&&!['winged','fish','jelly'].includes(e.kind)&&!groundEnemyEngaged(e)&&Number.isFinite(e.patrolLeft)&&Number.isFinite(e.patrolRight)){
   if(e.x<e.patrolLeft){e.x=e.patrolLeft;e.vx=Math.abs(e.vx);}else if(e.x+e.w>e.patrolRight){e.x=e.patrolRight-e.w;e.vx=-Math.abs(e.vx);}
  }
  confineGroundEnemy(game,e);
  finishShellDash(e);
  if(e.kind==='corn'){
   if(e.grounded&&e.phase%4<dt)e.vy=-150;
   e.cooldown=(e.cooldown??1.2)-dt;e.warning=e.cooldown<.6&&e.cooldown>0;
   if(e.warning){if(e.aimDirection==null){e.aimX=p.x+p.w/2+Math.max(-20,Math.min(20,p.vx*.2));e.aimDirection=e.aimX<e.x+e.w/2?-1:1;e.aimSpeed=Math.max(52,Math.min(96,Math.abs(e.aimX-e.x)/.85));}e.facing=e.aimDirection;e.vx=0;e.intent='throw-cue';}
   else if(e.cooldown>2.55){e.vx=0;}
   else if(e.cooldown>0){e.aimDirection=null;e.facing=Math.sign(e.vx)||-1;}
   if(e.cooldown<=0){const dir=e.aimDirection||(p.x<e.x?-1:1);e.facing=dir;e.intent='throw';for(let i=0;i<3;i++)game.dangers.push({x:e.x+e.w/2,y:e.y-4,w:5,h:5,vx:dir*((e.aimSpeed||60)+i*12),vy:-100-i*14,gravity:240,delay:i*.18,life:4,kind:'seed'});e.cooldown=3.3;}
  }
  if(e.kind==='cloud'){
   e.cooldown=(e.cooldown??2)-dt;e.dropTimer=Math.max(0,(e.dropTimer||0)-dt);
   const full=game.enemies.filter(v=>!v.dead&&v.parent===e.id).length>=3;
   if(full)e.cooldown=Math.max(.7,e.cooldown);
   e.warning=!full&&e.cooldown<.6&&e.cooldown>0;
   if(e.warning){e.dropX??=e.x;e.intent='drop-cue';}else if(e.cooldown>0&&e.dropTimer<=0)e.dropX=null;
   if(e.cooldown<=0){const drop={id:'cloud-'+game.serial,parent:e.id,kind:'spike',x:e.dropX??e.x,y:e.y+16,w:14,h:14,vx:-15,vy:0,state:'walk',timer:0,grace:0,dead:false,patrolLeft:e.patrolLeft,patrolRight:e.patrolRight};
    if(overlap({...p,x:p.x-12,y:p.y-8,w:p.w+24,h:p.h+16},drop)){e.cooldown=.6;e.dropX=null;}
    else {game.serial++;game.enemies.push(drop);e.dropTimer=.4;e.cooldown=3;}
   }
  }
  if(e.state==='shell'){e.timer+=dt;if(e.timer>=9){e.state='walk';e.vx=-20;e.timer=0;e.homeX=e.x;e.patrolLeft=Math.max(0,e.x-48);e.patrolRight=Math.min(game.level.width,e.x+e.w+48);delete e.brain;}}
  if(e.state==='stunned'){
   e.vx=0;e.aiWarning=false;e.intent=e.grounded?'stunned':'stunned-fall';
   if(e.grounded)e.timer+=dt;
   if(e.timer>=9){e.state='walk';e.timer=0;e.vy=0;e.homeX=e.x;e.homeY=e.y;e.flightHomeSet=false;delete e.brain;e.intent='recover-flight';}
  }
  if(e.state==='rolling'){
   for(const other of game.enemies)if(other!==e&&enemyActive(other)&&overlap(e,other)){defeat(game,other);if(other.state==='rolling')e.dead=true;}
   for(const gate of game.gates)if(!gate.open&&overlap({...e,x:e.x-3,w:e.w+6},gate)){gate.open=true;e.vx=-e.vx;game.score+=300;}
  }
  if(!enemyActive(e)||!overlap(p,e))continue;
  const stomp=p.vy>=0&&oldBottom<=e.y+3&&p.y<e.y;
  if(stomp&&enemyShelled(e)){p.y=e.y-p.h;p.vy=-135;if(e.state==='rolling'){e.state='shell';e.vx=0;e.timer=0;e.grace=.15;}hurtEnemy(game,e,'stomp');continue;}
  if(p.star>0){if(stomp)game.emitSound?.(stompSound(e),e);defeat(game,e);continue;}
  if(stomp){p.y=e.y-p.h;p.vy=-135;hurtEnemy(game,e,'stomp');
  }else if(e.state==='stunned'){/* An unconscious flyer cannot attack or be kicked into a rolling shell. */}
  else if(e.state==='shell'){e.state='rolling';e.vx=(p.x<e.x?1:-1)*150;e.grace=.15;e.timer=0;}
  else if(e.grace<=0)game.damage();
 }
 // Generated actors expire; fixed level actors stay in snapshots for deterministic rollback.
 game.enemies=game.enemies.filter(e=>!(e.dead&&typeof e.id==='string'));
}
