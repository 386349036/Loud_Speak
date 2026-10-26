import {overlap} from './geometry.mjs';
import {updateGardenBoss,gardenRecovery,gardenWeakTop} from './garden-boss.mjs';
import {observeBoss,predictedBossTarget,casterMovement,rememberBossAttack} from './boss-awareness.mjs';
import {prepareBoss,BOSS_SKILLS,bossTiming,readyBossSkill,releaseBossSkill,tickBossCooldowns,bossWeakDuration,bossVulnerable} from './boss-balance.mjs';
export {bossVulnerable};
export const bossWeakTop=(game,b)=>gardenWeakTop(game,b);
export const exposeDuration=bossWeakDuration;
export const bossHitbox=b=>b;
function phase(b,name){b.phase=name;b.timer=0;b.hits=0;}
function projectile(game,b,dx,dy,options={}){game.dangers.push({x:b.x+b.w/2,y:b.y+12,w:6,h:6,vx:dx,vy:dy,gravity:0,life:4,kind:'seed',...options});}
function wave(game,b){for(const d of [-1,1])projectile(game,b,d*80,0,{y:200,w:16,h:8,kind:'wave',life:2});}
function fan(game,b){const dir=b.direction||(game.p.x<b.x?-1:1);for(const vy of [-65,-20,25])projectile(game,b,dir*85,vy);}
function expose(game,b){
 const lo=Math.min(game.p.x,b.x),hi=Math.max(game.p.x,b.x);
 const water=b.kind===4?(game.level.water||[]).reduce((sum,w)=>sum+Math.max(0,Math.min(hi,w.x+w.w)-Math.max(lo,w.x)),0):0;
 b.exposeTime=Math.max(bossTiming(b).expose,Math.min(b.kind===4?4.8:3.6,Math.abs(game.p.x-b.x)/112+water*(1/58-1/112)+1.4));phase(b,'expose');
}
function chooseSkill(game,b){
 const options=Object.keys(BOSS_SKILLS[b.kind]),p=game.p,a=b.awareness;
 let preferred=options[b.cycle%options.length];
 const distance=Math.abs(p.x-b.x),high=p.y+p.h<190;
 if(b.cycle>0){
  if(b.kind===2)preferred=high||distance>112?'rock-roll':'charge';
  if(b.kind===3)preferred=high||distance>96?'seed-dash':'dash';
  if(b.kind===4)preferred=high||distance>104?'double-fan':'fan-leap';
  if(b.kind===5)preferred=high||distance>112?'rock-roll':'thorn-roll';
  if(b.kind===6)preferred=high||a.fire>=1.5||a.camp>=2.5?'burst':'crossfire';
  if(b.kind===7)preferred=p.x<b.x?'left-sweep':'right-sweep';
 }
 if(b.kind===8){
  preferred=p.y+p.h<190||Math.abs(p.x-b.x)>112||a.fire>=1.5?'volley':'slam';
  if(a.camp>=2.5&&a.recent.at(-1)===preferred)preferred=preferred==='volley'?'slam':'volley';
  b.intent=a.fire>=1.5?'suppress':a.camp>=2.5?'flank':'watch';
 }
 if(preferred===b.lastSkill)preferred=options.find(key=>key!==b.lastSkill)||preferred;
 const pattern=readyBossSkill(b,preferred);if(!pattern){b.intent='cooldown';return false;}
 b.pattern=pattern;b.windupDuration=bossTiming(b).windup;b.head=pattern==='right-sweep'?1:0;
 b.targetX=predictedBossTarget(game,b);b.direction=p.x<b.x?-1:1;rememberBossAttack(b);phase(b,'windup');return true;
}
export function hurtBoss(game,method){
 const b=game.boss;if(!b||b.dead||!b.active)return false;
 if(!bossVulnerable(b)){b.blockFlash=.2;game.emitAnimation('boss-block',b);game.emitSound?.('boss-armor',b);return false;}
 b.hp--;game.score+=1000;b.invulnerable=0;b.hitFlash=.25;b.hits=0;game.emitAnimation('boss-hit',b);game.emitSound?.(method==='stomp'?'stomp-boss':'boss-hit',b);game.dangers=[];game.p.hurt=Math.max(game.p.hurt,1);
 if(b.hp<=0){b.dead=true;b.phase='defeated';game.score+=3000;for(const e of game.enemies)e.dead=true;}
 else gardenRecovery(game,b);
 return true;
}
export function updateBoss(game,dt,oldBottom){
 const b=game.boss,p=game.p;if(!b||b.dead)return;
 prepareBoss(b);
 if(!b.active){if(p.x<b.left)return;b.active=true;b.timer=0;if(b.kind===4){b.x=b.left+120;b.y=192;}game.dangers=[];for(const e of game.enemies)e.dead=true;}
 p.x=Math.max(b.left,Math.min(b.right+16-p.w,p.x));b.invulnerable=0;b.hitFlash=Math.max(0,(b.hitFlash||0)-dt);b.blockFlash=Math.max(0,(b.blockFlash||0)-dt);b.timer+=dt;tickBossCooldowns(b,dt);
 observeBoss(game,dt);
 if(b.kind===1){updateGardenBoss(game,dt,oldBottom,hurtBoss);return;}
 if([2,3,5,6,7,8].includes(b.kind)&&b.phase==='idle')casterMovement(game,b,dt);
 if(b.phase==='idle'&&b.timer>=bossTiming(b).idle)chooseSkill(game,b);
 else if(b.phase==='windup'&&b.timer>=(b.windupDuration||bossTiming(b).windup)){
  if(!releaseBossSkill(b)){phase(b,'idle');return;}
  phase(b,'attack');b.startX=b.x;b.startY=b.y;b.cycle++;
  if([2,5].includes(b.kind)&&b.pattern==='rock-roll')for(const dx of [-40,0,40])projectile(game,b,0,0,{x:Math.max(b.left,Math.min(b.right-6,b.targetX+dx)),y:48,gravity:220,delay:.6,kind:'rock'});
  if(b.kind===5&&b.pattern==='thorn-roll')for(const dir of [-1,1])projectile(game,b,dir*65,-95,{gravity:260});
  if(b.kind===3&&b.pattern==='seed-dash')for(const vx of [65,85,105])projectile(game,b,b.direction*vx,-130,{gravity:230});
  if(b.kind===4)fan(game,b);
  if(b.kind===6){const dir=b.direction;if(b.pattern==='burst'){for(const dx of [-28,0,28])projectile(game,b,0,80,{x:Math.max(b.left,Math.min(b.right-6,b.targetX+dx)),y:130,kind:'burst',gravity:100,delay:.7+Math.abs(dx)/100});}else {projectile(game,b,dir*95,0,{y:180});projectile(game,b,dir*95,0,{y:200,delay:.3});projectile(game,b,dir*95,0,{y:164,delay:.6});}}
  if(b.kind===7){fan(game,b);projectile(game,b,b.head?-90:90,0,{x:b.x+(b.head?16:0),y:201,w:48,h:7,kind:'sweep',delay:.6,life:2.4});}
 }
 if(b.phase==='attack'){
  const t=b.timer;
  if(b.kind===8){const volley=b.pattern==='volley'||(!b.pattern&&b.cycle%2===0);b.y=volley?176:176-Math.sin(Math.min(1,t)*Math.PI)*40;if(t>=1){b.y=176;if(volley)fan(game,b);else wave(game,b);expose(game,b);}}
  else if([2,3,5].includes(b.kind)){
   if(b.kind!==3||b.pattern==='dash'||t>=.45)b.x+=b.direction*(b.pattern==='charge'||b.pattern==='dash'?150:b.kind===3?130:115)*dt;
   if(b.x<=b.left+8||b.x+b.w>=b.right||t>2.1){b.x=Math.max(b.left+8,Math.min(b.right-b.w,b.x));expose(game,b);}
  }else if(b.kind===4){const u=Math.min(1,t/1.05);b.x=b.startX+(b.left+8-b.startX)*u;b.y=b.startY+(176-b.startY)*u-Math.sin(u*Math.PI)*48;if(b.pattern==='double-fan'&&!b.secondaryReleased&&t>=.5){fan(game,b);b.secondaryReleased=true;}if(t>=1.05){b.y=176;expose(game,b);}}
  else if(t>=1.2)expose(game,b);
 }else if(b.phase==='expose'&&b.timer>=exposeDuration(b))phase(b,'recover');
 else if(b.phase==='recover'){
  if(Number.isFinite(b.recoverX))b.x=b.recoverX+(b.recoverTo-b.recoverX)*Math.min(1,b.timer/.45);
  if(b.timer>=bossTiming(b).recover){b.y=b.kind===4?192:176;if(b.kind===4)b.x=b.left+120;phase(b,'idle');}
 }
 const top=bossWeakTop(game,b);
 if(bossVulnerable(b)&&p.vy>=0&&oldBottom<=top+4&&p.y+p.h>=top&&p.y<top&&p.x+p.w>b.x&&p.x<b.x+b.w){p.y=top-p.h;p.vy=-145;hurtBoss(game,'stomp');return;}
 if(b.phase==='recover')return;
 if(!overlap(p,bossHitbox(b)))return;
 const stomp=p.vy>=0&&oldBottom<=b.y+4&&p.y<b.y;
 if(stomp&&bossVulnerable(b)){p.y=b.y-p.h;p.vy=-145;hurtBoss(game,'stomp');}
 else {if(stomp)hurtBoss(game,'stomp');game.damage();}
}
