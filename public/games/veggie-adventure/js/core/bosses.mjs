import {overlap} from './geometry.mjs';
import {updateGardenBoss,gardenRecovery,gardenWeakTop} from './garden-boss.mjs';
import {observeBoss,predictedBossTarget,casterMovement,rememberBossAttack} from './boss-awareness.mjs';
export const bossWeakTop=(game,b)=>b.kind===1?gardenWeakTop(game,b):b.y;
export const exposeDuration=b=>b.kind===1?(b.exposeTime||3.2):b.kind===4?2.5:2;
export const bossHitbox=b=>b.kind===7?{...b,x:b.x+(b.head?16:0),w:16}:b;
function phase(b,name){b.phase=name;b.timer=0;b.hits=0;}
function projectile(game,b,dx,dy,options={}){game.dangers.push({x:b.x+b.w/2,y:b.y+12,w:6,h:6,vx:dx,vy:dy,gravity:0,life:4,kind:'seed',...options});}
function wave(game,b){for(const d of [-1,1])projectile(game,b,d*80,0,{y:200,w:16,h:8,kind:'wave',life:2});}
function fan(game,b){const dir=b.direction||(game.p.x<b.x?-1:1);for(const vy of [-65,-20,25])projectile(game,b,dir*85,vy);}
export function hurtBoss(game,method){
 const b=game.boss;if(!b||b.dead||!b.active||b.phase!=='expose'||b.invulnerable>0)return false;
 if(method==='fire'&&++b.hits<3)return true;
 b.hp--;game.score+=1000;b.invulnerable=1;b.hits=0;game.dangers=[];game.p.hurt=Math.max(game.p.hurt,1);
 if(b.hp<=0){b.dead=true;b.phase='defeated';game.score+=3000;for(const e of game.enemies)e.dead=true;}
 else if(b.kind===1)gardenRecovery(game,b);
 else {phase(b,'recover');b.x=Math.max(b.left+32,Math.min(b.right-b.w,b.x+(game.p.x<b.x?24:-24)));}
 return true;
}
export function updateBoss(game,dt,oldBottom){
 const b=game.boss,p=game.p;if(!b||b.dead)return;
 if(!b.active){if(p.x<b.left)return;b.active=true;b.timer=0;if(b.kind===4){b.x=b.left+120;b.y=192;}game.dangers=[];for(const e of game.enemies)e.dead=true;}
 p.x=Math.max(b.left,Math.min(b.right+16-p.w,p.x));b.invulnerable=Math.max(0,b.invulnerable-dt);b.timer+=dt;
 observeBoss(game,dt);
 if(b.kind===1){updateGardenBoss(game,dt,oldBottom,hurtBoss);return;}
 if([6,7].includes(b.kind)&&b.phase==='idle')casterMovement(game,b,dt);
 if(b.phase==='idle'&&b.timer>=(b.hp===1&&b.kind===8?.5:1)){
  phase(b,'windup');b.targetX=predictedBossTarget(game,b);b.direction=p.x<b.x?-1:1;
  if(b.kind===8){
   const a=b.awareness,high=p.y+p.h<190,far=Math.abs(p.x-b.x)>112;
   b.pattern=high||far||a.fire>=1.5?'volley':'slam';
   // A stationary strategy receives a different follow-up; never skip recovery.
   if(a.camp>=2.5&&a.recent.at(-1)===b.pattern)b.pattern=b.pattern==='volley'?'slam':'volley';
   b.intent=a.fire>=1.5?'suppress':a.camp>=2.5?'flank':'watch';rememberBossAttack(b);
  }
 }else if(b.phase==='windup'&&b.timer>=.75){
  phase(b,'attack');b.startX=b.x;b.startY=b.y;b.cycle++;b.head=b.cycle%2;
  if(b.kind===2||b.kind===5)for(const dx of [-40,40])projectile(game,b,0,0,{x:Math.max(b.left,Math.min(b.right,b.targetX+dx)),y:48,gravity:220,delay:.6,kind:'rock'});
  if(b.kind===3)for(const vx of [65,85,105])projectile(game,b,b.direction*vx,-130,{gravity:230});
  if(b.kind===4)fan(game,b);
  if(b.kind===6){const dir=b.direction;projectile(game,b,dir*95,0,{y:180});projectile(game,b,dir*95,0,{y:200,delay:.35});projectile(game,b,0,80,{x:b.targetX,y:130,kind:'burst',gravity:100,delay:.7});}
  if(b.kind===7){fan(game,b);projectile(game,b,b.head?-90:90,0,{x:b.x+(b.head?16:0),y:201,w:48,h:7,kind:'sweep',delay:.6,life:2.4});}
 }
 if(b.phase==='attack'){
  const t=b.timer;
  if(b.kind===8){const volley=b.pattern==='volley'||(!b.pattern&&b.cycle%2===0);b.y=volley?176:176-Math.sin(Math.min(1,t)*Math.PI)*40;if(t>=1){b.y=176;if(volley)fan(game,b);else wave(game,b);phase(b,'expose');}}
  else if([2,3,5].includes(b.kind)){
   if(b.kind!==3||t>=.6)b.x+=b.direction*(b.kind===3?130:105)*dt;
   if(b.x<=b.left+8||b.x+b.w>=b.right||t>2.5){b.x=Math.max(b.left+8,Math.min(b.right-b.w,b.x));phase(b,'expose');}
  }else if(b.kind===4){const u=Math.min(1,t/1.2);b.x=b.startX+(b.left+8-b.startX)*u;b.y=b.startY+(176-b.startY)*u-Math.sin(u*Math.PI)*48;if(t>=1.2){b.y=176;phase(b,'expose');}}
  else if(t>=1.5)phase(b,'expose');
 }else if(b.phase==='expose'&&b.timer>=exposeDuration(b))phase(b,'recover');
 else if(b.phase==='recover'&&b.timer>=1){b.y=b.kind===4?192:176;if(b.kind===4)b.x=b.left+120;phase(b,'idle');}
 if(!overlap(p,bossHitbox(b)))return;
 const stomp=!p.inWater&&p.vy>=0&&oldBottom<=b.y+4;
 if(stomp&&b.phase==='expose'&&b.invulnerable<=0){p.y=b.y-p.h;p.vy=-145;hurtBoss(game,'stomp');}
 else game.damage();
}
