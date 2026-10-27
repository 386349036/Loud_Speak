import LEVEL from '../../levels/world-01/level-1-1.mjs';
import {copy,overlap} from './geometry.mjs';
import {updateEnvironment,updateDangers} from './environment.mjs';
import {updateEnemies,hurtEnemy,enemyActive} from './enemies.mjs';
import {updateBoss,hurtBoss,bossHitbox} from './bosses.mjs';
import {jumpProfile} from './jump-profile.mjs';
import {prepareTrap} from './trap-profile.mjs';
import {prepareEnemyHealth} from './enemy-health.mjs';
import {playerSize} from './player-size.mjs';
import {limitProjectileRange} from './projectile-range.mjs';
import {prepareBoss} from './boss-balance.mjs';
import {attackBonus,playerAttack,MAX_ATTACK_BONUS} from './player-attacks.mjs';
import {INITIAL_REBIRTHS,MAX_REBIRTHS,rebirthClaims,validRebirthReward} from './rebirth-rewards.mjs';
export {overlap};
export {INITIAL_REBIRTHS,MAX_REBIRTHS};
export const TILE=16,STEP=1/120;
export function makeLevel(){return copy(LEVEL);}
export class Game{
 constructor(level=makeLevel(),carry={}){
  this.level=copy(level);this.time=0;this.score=carry.score||0;this.entryScore=this.score;this.entryForm=carry.form||0;this.claimedRebirthRewards=rebirthClaims(carry.claimedRebirthRewards);this.rebirths=Number.isInteger(carry.rebirths)&&carry.rebirths>=0&&carry.rebirths<=MAX_REBIRTHS?carry.rebirths:INITIAL_REBIRTHS;this.pendingRebirth=false;this.remaining=level.timeLimit||300;this.mode='playing';this.deathTimer=0;this.checkpointReached=false;this.serial=0;
  for(const key of ['enemies','blocks','items','movers','turrets','gates'])this[key]=copy(level[key]||[]);
  for(const b of this.blocks)if(b.item==='rebirth'&&this.claimedRebirthRewards.includes(b.rewardId))b.used=true;
  for(const enemy of this.enemies){prepareTrap(enemy);prepareEnemyHealth(enemy);}
  this.boss=copy(level.boss||null);prepareBoss(this.boss);this.shots=[];this.dangers=[];this.animationEvents=[];this.soundEvents=[];this.rewardNotice=null;this.rightCommandSeen=false;this.warpRequested=false;this.warpTarget=null;
  this.entryAttackBonus=attackBonus(carry.form,carry.attackBonus);
  this.p={...level.spawn,w:12,h:14,vx:0,vy:0,form:carry.form||0,attackBonus:this.entryAttackBonus,grounded:false,facing:1,hurt:0,star:0,crouch:false,shotCooldown:0,swimCooldown:0,inWater:false};this.resizePlayer();this.saveCheckpoint();
 }
 solids(){return [...this.level.platforms,...this.blocks.filter(b=>!b.broken),...this.movers.filter(m=>!m.fallen),...this.gates.filter(g=>!g.open)];}
 snapshot(){return copy({p:this.p,enemies:this.enemies,blocks:this.blocks,items:this.items,movers:this.movers,turrets:this.turrets,gates:this.gates,boss:this.boss,time:this.time,serial:this.serial,score:this.score,remaining:this.remaining,checkpointReached:this.checkpointReached});}
 saveCheckpoint(){this.checkpoint=this.snapshot();}
 restore(){Object.assign(this,copy(this.checkpoint));this.p.attackBonus=attackBonus(this.p.form,this.p.attackBonus);prepareBoss(this.boss);for(const enemy of this.enemies){prepareTrap(enemy,{restartLegacy:true});prepareEnemyHealth(enemy);}this.resizePlayer(this.p.crouch);this.p.star=0;this.p.hurt=0;this.p.vx=0;this.p.vy=0;this.p.runCharge=0;this.p.jumpPhysics=null;this.p.coyote=0;this.p.jumpBuffer=0;this.p.dropThrough=0;this.shots=[];this.dangers=[];this.animationEvents=[];this.soundEvents=[];this.rewardNotice=null;this.mode='playing';this.pendingRebirth=false;this.deathTimer=0;}
 emitAnimation(type,body){this.animationEvents.push({type,body,x:body.x,y:body.y});if(this.animationEvents.length>64)this.animationEvents.shift();}
 emitSound(id,body=this.p){this.soundEvents.push({id,time:this.time,x:body.x,y:body.y});if(this.soundEvents.length>64)this.soundEvents.shift();}
 kill(){if(this.mode==='playing'){this.pendingRebirth=this.rebirths>0;if(this.pendingRebirth)this.rebirths--;this.mode='dead';this.deathTimer=.7;}}
 rebirth(){const fresh=new Game(this.level,{score:this.entryScore,form:0,rebirths:this.rebirths,claimedRebirthRewards:this.claimedRebirthRewards});Object.assign(this,fresh);}
 damage(){if(this.p.star>0||this.p.hurt>0||this.mode!=='playing')return;if(this.p.form){this.emitSound('hurt');this.p.form=0;this.p.attackBonus=0;this.resizePlayer();this.p.hurt=1.5;}else this.kill();}
 resizePlayer(crouch=false){const p=this.p,{w,h}=playerSize();p.x+=(p.w-w)/2;p.y+=p.h-h;p.w=w;p.h=h;p.crouch=!!p.form&&crouch;}
 collect(kind,rewardId=this.level.id){
  if(kind==='rebirth'){
   if(!validRebirthReward(rewardId)||this.claimedRebirthRewards.includes(rewardId))return;
   this.claimedRebirthRewards.push(rewardId);this.rebirths=Math.min(MAX_REBIRTHS,this.rebirths+1);this.rewardNotice={text:'重生 +1',until:this.time+2};this.emitSound('life-up');
  }else if(kind==='seed'){this.score+=100;this.emitSound('pickup-seed');}
  else if(kind==='star'){this.p.star=10;this.emitSound('pickup-star');}
  else {this.score+=1000;if(kind==='carrot')this.p.form=Math.max(1,this.p.form);if(kind==='chili'){if(this.p.form===2){const previous=attackBonus(this.p.form,this.p.attackBonus);this.p.attackBonus=Math.min(MAX_ATTACK_BONUS,previous+1);this.rewardNotice={text:previous===MAX_ATTACK_BONUS?'积分 +1000':playerAttack(this.p).name+' 攻击 +'+this.p.attackBonus,until:this.time+2};}else this.p.form++;}this.resizePlayer(this.p.crouch);this.emitSound('pickup-upgrade');}
 }
 spawnBlockItem(b){
  // Authored carrot/chili entries both mean an upgrade; resolve only when released.
  if(['carrot','chili'].includes(b.item)&&this.p.form===2&&attackBonus(this.p.form,this.p.attackBonus)===MAX_ATTACK_BONUS){this.score+=1000;this.rewardNotice={text:'积分 +1000',until:this.time+2};this.emitSound('pickup-seed',b);return;}
  const kind=['carrot','chili'].includes(b.item)?(this.p.form===0?'carrot':'chili'):b.item;
  if(kind==='rebirth'&&this.claimedRebirthRewards.includes(b.rewardId))return;
  this.items.push({x:b.x+2,y:b.y-14,w:12,h:14,vx:25,vy:0,kind,...(kind==='rebirth'?{rewardId:b.rewardId}:{}),collected:false});this.emitSound('reward-spawn',b);
 }
 hitBlock(b){
  if(b.kind==='warp'){this.warpTarget=b.warpTo;this.emitSound('warp',b);return;}
  if(b.broken)return;
  if(b.breakable){b.broken=true;this.score+=50;this.emitSound('brick-break',b);if(b.item&&!b.used){b.used=true;this.spawnBlockItem(b);}}
  else if(b.kind==='reward'&&!b.used){b.used=true;this.spawnBlockItem(b);}
  else if(b.kind==='brick'&&this.p.form){b.broken=true;this.score+=50;this.emitSound('brick-break',b);}
 }
 move(body,dt,player=false){let wall=false;body.x+=body.vx*dt;
  for(const b of this.solids())if(!b.oneWay&&overlap(body,b)){if(body.vx>0)body.x=b.x-body.w;else if(body.vx<0)body.x=b.x+b.w;wall=true;}
  if(wall)body.vx=player?0:-body.vx;
  body.grounded=false;const vy=body.vy,oldBottom=body.y+body.h;body.y+=vy*dt;
  for(const b of this.solids())if((!b.oneWay||(vy>0&&oldBottom<=b.y+.1&&!(player&&body.dropThrough>0)))&&overlap(body,b)){if(vy>0){body.y=b.y-body.h;body.grounded=true;}else if(vy<0){body.y=b.y+b.h;if(player)this.hitBlock(b);}body.vy=0;}
  return wall;
 }
 shoot(){const p=this.p;if(p.form!==2||p.crouch||p.shotCooldown>0||this.shots.length>=2)return;const a=playerAttack(p);this.shots.push({x:p.x+(p.facing>0?p.w:-a.w),y:p.y+p.h/2-a.h/2,w:a.w,h:a.h,kind:a.kind,damage:a.damage,asset:a.asset,size:a.size,vx:p.facing*150,vy:50,life:3});p.shotCooldown=.25;this.emitSound('fire');}
 step(dt,input={}){
  if(this.mode==='won'||this.mode==='gameover')return;if(this.mode==='dead'){this.deathTimer-=dt;if(this.deathTimer<=0){if(this.pendingRebirth)this.rebirth();else this.mode='gameover';}return;}
  const p=this.p;this.time+=dt;if(!this.level.warpRoom)this.remaining-=dt;if(input.right)this.rightCommandSeen=true;p.hurt=Math.max(0,p.hurt-dt);p.star=Math.max(0,p.star-dt);p.shotCooldown=Math.max(0,p.shotCooldown-dt);p.swimCooldown=Math.max(0,(p.swimCooldown||0)-dt);
  updateEnvironment(this,dt);this.resizePlayer(!!input.down);p.inWater=(this.level.water||[]).some(w=>overlap({...p,y:p.y+p.h/2,h:p.h/2},w));
  const dir=(input.right?1:0)-(input.left?1:0),speed=p.inWater?58:p.crouch?32:112,target=dir*speed;
  const accelerating=dir&&p.vx*dir>=0&&Math.abs(p.vx)<speed;
  // Slightly firmer ground braking; keep the one-second run-up and air control.
  const acceleration=p.inWater||p.crouch?600:!p.grounded?(dir?224:0):accelerating?112:dir?560:400;
  p.vx+=Math.max(-acceleration*dt,Math.min(acceleration*dt,target-p.vx));if(dir)p.facing=dir;
  p.runCharge=p.inWater||p.crouch?0:Math.min(1,Math.abs(p.vx)/112);
  p.coyote=p.grounded?.075:Math.max(0,(p.coyote||0)-dt);
  p.jumpBuffer=input.jumpPressed?.1:Math.max(0,(p.jumpBuffer||0)-dt);
  p.dropThrough=Math.max(0,(p.dropThrough||0)-dt);
  if(input.down&&input.jumpPressed&&p.grounded&&this.movers.some(m=>m.oneWay&&p.x+p.w>m.x&&p.x<m.x+m.w&&Math.abs(p.y+p.h-m.y)<1)){p.dropThrough=.18;p.jumpBuffer=0;p.coyote=0;p.grounded=false;p.y+=2;p.vy=30;}
  if(p.inWater){p.coyote=0;p.jumpBuffer=0;if(input.jump&&p.swimCooldown===0){p.vy=-115;p.swimCooldown=.25;this.emitSound('swim');}p.vy=Math.min(55,p.vy+170*dt);}
  else {if(p.jumpBuffer>0&&(p.grounded||p.coyote>0)){p.jumpPhysics=jumpProfile(p.form,p.runCharge);p.vy=-p.jumpPhysics.velocity;p.grounded=false;p.coyote=0;p.jumpBuffer=0;this.emitSound('jump');}const j=p.jumpPhysics||jumpProfile(p.form,p.runCharge);if(!input.jump&&p.vy<-j.cutoff)p.vy=-j.cutoff;p.vy=Math.min(350,p.vy+(p.vy<0?j.gravity:j.fallGravity)*dt);}
  const oldBottom=p.y+p.h;this.move(p,dt,true);const boundedX=Math.max(0,Math.min(this.level.width-p.w,p.x));if(boundedX!==p.x)p.vx=0;p.x=boundedX;
  p.runCharge=p.inWater||p.crouch?0:Math.min(1,Math.abs(p.vx)/112);if(p.grounded||p.inWater)p.jumpPhysics=null;
  if(input.fire)this.shoot();updateEnemies(this,dt,oldBottom);updateBoss(this,dt,oldBottom);
  for(const s of this.shots){const oldX=s.x,oldY=s.y;s.life-=dt;s.vy=Math.min(220,s.vy+500*dt);if(this.move(s,dt))s.life=0;if(s.grounded)s.vy=-100;
   if(limitProjectileRange(s,oldX,oldY))continue;
   if(this.boss&&!this.boss.dead&&this.boss.active&&overlap(s,bossHitbox(this.boss))){hurtBoss(this,'fire',s.damage||1);s.life=0;}
   if(s.life>0)for(const e of this.enemies)if(enemyActive(e)&&overlap(s,e)){hurtEnemy(this,e,'fire',s.damage||1);s.life=0;break;}
  }
  this.shots=this.shots.filter(s=>s.life>0&&s.y<270&&s.x>=0&&s.x<this.level.width);
  for(const i of this.items)if(!i.collected){if(i.kind!=='seed'){i.vx=Number.isFinite(i.vx)?i.vx:25;i.vy=Math.min(220,(i.vy||0)+500*dt);this.move(i,dt);if(i.y>270){i.collected=true;continue;}}if(overlap(p,i)){i.collected=true;this.collect(i.kind,i.rewardId);}}
  updateDangers(this,dt);if(p.y>260||this.remaining<=0)this.kill();
  if(this.mode==='playing'&&this.level.id==='1-1'&&!this.rightCommandSeen&&input.left&&p.x<=0&&!p.grounded&&p.jumpPhysics&&p.y+p.h<207.5)this.warpRequested=true;
  if(this.mode==='playing'&&p.x>=this.level.exit&&(!this.boss||this.boss.dead)){this.mode='won';this.score+=Math.floor(this.remaining)*10;}
 }
}
