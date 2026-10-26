// Decisions use visible positions, geometry and aura; never read player inputs.
import {beginShellAttack} from './enemy-attacks.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const groundKinds=new Set(['mushroom','cabbage','walnut','spike']);
const center=e=>e.x+e.w/2;
const toward=(e,p)=>center(p)<center(e)?-1:1;
export function seesPlayer(game,e,range=104,height=32){
 const p=game.p;if(Math.abs(center(p)-center(e))>range||Math.abs(p.y+p.h-e.y-e.h)>height)return false;
 const left=Math.min(center(e),center(p)),right=Math.max(center(e),center(p)),y=(e.y+e.h/2+p.y+p.h/2)/2;
 return !game.solids().some(s=>!s.oneWay&&s.x<right&&s.x+s.w>left&&s.y<y&&s.y+s.h>y);
}
function bounds(e){return [Number.isFinite(e.patrolLeft)?e.patrolLeft:e.homeX-64,Number.isFinite(e.patrolRight)?e.patrolRight-e.w:e.homeX+64];}
// Patrol markers describe idle pacing, not an invisible wall during combat.
// Keep the landing areas beside real ground gaps clear even when pursuing.
function combatBounds(game,e){
 const floor=e.y+e.h,banks=game.level.platforms.filter(s=>Math.abs(s.y-floor)<=6).map(s=>({left:s.x,right:s.x+s.w})).sort((a,b)=>a.left-b.left),merged=[];
 for(const b of banks){const last=merged.at(-1);if(last&&b.left<=last.right+.1)last.right=Math.max(last.right,b.right);else merged.push({...b});}
 const bank=merged.find(b=>center(e)>=b.left&&center(e)<=b.right);
 if(!bank)return bounds(e);
 const margin=floor>=202?128:6,left=bank.left+(bank.left>0?margin:0),right=bank.right-e.w-(bank.right<game.level.width?margin:0);
 // Some original short banks cannot fit two 8-tile buffers, or already spawn
 // their actor inside one. Allow combat there with a real ledge guard instead
 // of trapping that legacy actor behind its idle patrol markers.
 if(left>right||e.homeX<left||e.homeX>right)return [bank.left+6,bank.right-e.w-6];
 return [left,right];
}
export const groundEnemyEngaged=e=>groundKinds.has(e.kind)&&!!e.brain?.engaged;
export function safeStep(game,e,dir){
 const [left,right]=groundEnemyEngaged(e)?combatBounds(game,e):bounds(e),x=e.x+dir*4;if(x<left||x>right)return false;
 const edge=e.x+(dir>0?e.w:0)+dir*6,bottom=e.y+e.h,solids=game.solids();
 if(solids.some(s=>!s.oneWay&&edge>s.x&&edge<s.x+s.w&&e.y+2<s.y+s.h&&bottom-2>s.y))return false;
 return solids.some(s=>edge>=s.x&&edge<=s.x+s.w&&s.y>=bottom-2&&s.y<=bottom+6);
}
function groundRoute(game,e){
 const start=center(e),end=center(game.p),steps=Math.max(1,Math.ceil(Math.abs(end-start)/6)),floor=e.y+e.h,solids=game.solids();
 for(let n=0;n<=steps;n++){const x=start+(end-start)*n/steps;if(!solids.some(s=>x>=s.x&&x<=s.x+s.w&&s.y>=floor-2&&s.y<=floor+6))return false;}
 return true;
}
function brain(e){return e.brain??={mode:'patrol',timer:0,seen:0,direction:Math.sign(e.vx)||-1};}
export function planGroundEnemy(game,e,dt){
 if(!groundKinds.has(e.kind))return;
 const a=brain(e);e.aiWarning=false;
 a.attackCooldown=Math.max(0,(a.attackCooldown||0)-dt);
 if(e.state!=='walk'){a.mode='patrol';a.seen=0;a.engaged=false;e.intent=e.state;e.facing=Math.sign(e.vx)||e.facing||-1;return;}
 if(!e.grounded){e.intent='landing';return;}
 const visible=seesPlayer(game,e,a.engaged?208:104,a.engaged?96:32),reachable=visible&&groundRoute(game,e),dir=toward(e,game.p);
 a.seen=reachable?Math.min(.3,a.seen+dt):Math.max(0,a.seen-dt*2);a.timer=Math.max(0,a.timer-dt);
 a.alert=Math.max(0,(a.alert||0)-dt);
 if(reachable){a.lost=0;a.targetX=center(game.p);}else a.lost=(a.lost||0)+dt;
 if(!a.engaged&&a.seen>=.18){a.engaged=true;a.mode='pursue';a.alert=.3;}
 if(a.engaged&&a.lost>1.25)a.mode='return';
 if(a.mode==='return'){
  const [left,right]=bounds(e);
  if(e.x>=left&&e.x<=right){a.engaged=false;a.mode='patrol';a.seen=0;}
  else {a.direction=e.x<left?1:-1;e.vx=a.direction*40;e.intent='return';}
  if(reachable){a.mode='pursue';a.engaged=true;}
 }
 if(a.engaged&&a.mode!=='return'){
  a.retreat=game.p.star>0;
  if(a.retreat&&['dash','volley'].includes(a.mode))a.mode='pursue';
  if(!['dash','volley'].includes(a.mode)){
   a.mode='pursue';a.direction=(a.targetX<center(e)?-1:1)*(a.retreat?-1:1);
   if(reachable&&!a.retreat&&a.attackCooldown<=0)beginShellAttack(game,e,a,dir);
  }
  if(a.mode==='dash'){
  e.intent='dash';e.aiWarning=true;e.facing=a.direction;a.dashLastX=e.x;e.vx=a.direction*Math.min(128,a.dashRemaining/Math.max(dt,1e-6));
  }else{
   if(a.mode==='volley'&&a.timer<=0)a.mode='pursue';
   e.intent=a.mode==='volley'?'spine-volley':a.retreat?'retreat':'pursue';
   e.vx=a.direction*{mushroom:64,cabbage:72,walnut:60,spike:56}[e.kind];e.aiWarning=a.alert>0||a.mode==='volley';
  }
 }else if(!a.engaged){
  e.intent='patrol';a.direction=Math.sign(e.vx)||a.direction;e.vx=a.direction*20;
 }
 if(e.vx&&!safeStep(game,e,Math.sign(e.vx))){if(!a.engaged)a.direction=-Math.sign(e.vx);if(a.mode==='dash'){a.mode='pursue';a.dashRemaining=0;}e.vx=0;e.intent='edge-guard';}
 if(e.vx)e.facing=Math.sign(e.vx);
}
export function confineGroundEnemy(game,e){
 if(!groundKinds.has(e.kind)||e.state!=='walk')return;
 const [left,right]=groundEnemyEngaged(e)?combatBounds(game,e):bounds(e);if(e.x<left){e.x=left;e.vx=Math.abs(e.vx);}else if(e.x>right){e.x=right;e.vx=-Math.abs(e.vx);}
 if(e.vx)e.facing=Math.sign(e.vx);
}
export function flyingTarget(game,e,dt,patrol){
 const a=brain(e),p=game.p,water=game.level.water?.find(w=>e.homeX>=w.x&&e.homeX<w.x+w.w);
 const sameWater=water&&p.x+p.w>water.x&&p.x<water.x+water.w&&p.y+p.h>water.y;
 const visible=seesPlayer(game,e,a.engaged?208:e.kind==='winged'?128:96,a.engaged?160:e.kind==='winged'?128:80)&&(e.kind==='winged'||sameWater);
 a.alert=Math.max(0,(a.alert||0)-dt);a.seen=visible?Math.min(.3,a.seen+dt):0;
 a.lost=visible?0:(a.lost||0)+dt;
 if(!a.engaged&&a.seen>=.25){a.engaged=true;a.alert=.3;}
 if(a.engaged&&a.lost>1.25)a.engaged=false;
 e.aiWarning=a.engaged&&a.alert>0;
 if(a.engaged){
  a.mode='pursue';a.direction=toward(e,p);e.facing=a.direction;e.intent='intercept';
  if(visible){a.targetX=clamp(center(p)-e.w/2,0,game.level.width-e.w);a.targetY=clamp(p.y+p.h/2-e.h/2,24,240-e.h);}
  return {x:a.targetX,y:a.targetY,speed:e.kind==='fish'?64:112};
 }
 a.mode=Math.abs(e.x-patrol)>.1||Math.abs(e.y-e.homeY)>.1?'return':'patrol';e.intent=a.mode;return {x:patrol,y:e.homeY,speed:48};
}
export function jellyTarget(game,e,dt,patrol){
 const a=brain(e),t=e.phase%2,p=game.p,water=game.level.water?.find(w=>e.homeX>=w.x&&e.homeX<w.x+w.w);
 if(a.pulse===undefined||t<a.pulse){
  const visible=water&&p.x+p.w>water.x&&p.x<water.x+water.w&&p.y+p.h>water.y&&seesPlayer(game,e,96,80);
  a.targetX=visible?clamp(p.x+p.w/2-e.w/2,e.homeX-32,e.homeX+32):null;
 }
 a.pulse=t;e.intent=a.targetX!==null&&t<.5?'pulse-approach':'drift';
 return a.targetX!==null&&t<.5?{x:a.targetX,speed:24}:{x:patrol,speed:16};
}
export function positionCorn(game,e,dt){
 const a=brain(e);e.aiWarning=false;
 if(e.warning||e.cooldown>2.55){e.vx=0;return;}
 a.seen=seesPlayer(game,e,128,48)?Math.min(.4,a.seen+dt):0;
 if(a.seen>=.3){const distance=Math.abs(center(game.p)-center(e)),dir=toward(e,game.p);e.vx=distance<64?-dir*16:distance>96?dir*12:0;e.intent=!e.vx?'hold':Math.sign(e.vx)===dir?'approach':'spacing';}
 else {if(e.x<e.homeX-24)e.vx=12;else if(e.x>e.homeX+24)e.vx=-12;else if(!e.vx)e.vx=-12;e.intent='patrol';}
 if(e.x<=e.homeX-32&&e.vx<0||e.x>=e.homeX+32&&e.vx>0||e.grounded&&e.vx&&!safeStep(game,e,Math.sign(e.vx)))e.vx=0;
}
