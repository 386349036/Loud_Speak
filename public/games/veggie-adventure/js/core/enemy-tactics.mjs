// Decisions use visible positions, geometry and aura; never read player inputs.
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
export function safeStep(game,e,dir){
 const [left,right]=bounds(e),x=e.x+dir*4;if(x<left||x>right)return false;
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
 if(e.state!=='walk'){a.mode='patrol';a.seen=0;e.intent=e.state;e.facing=Math.sign(e.vx)||e.facing||-1;return;}
 if(!e.grounded){e.intent='landing';return;}
 const visible=seesPlayer(game,e),reachable=visible&&groundRoute(game,e),dir=toward(e,game.p);
 a.seen=reachable?Math.min(.3,a.seen+dt):Math.max(0,a.seen-dt*2);a.timer=Math.max(0,a.timer-dt);
 if(a.mode==='rest'){
  e.vx=0;e.intent='rest';if(a.timer<=0){a.mode='patrol';a.seen=0;e.vx=a.direction*20;}
 }else if(a.mode==='notice'){
  e.vx=0;e.aiWarning=true;e.intent=a.retreat?'retreat-cue':'notice';e.facing=a.direction;
  if(!reachable){a.mode='rest';a.timer=.5;e.aiWarning=false;}
  else if(a.timer<=0){a.mode='advance';a.timer=.75;e.aiWarning=false;}
 }else if(a.mode==='advance'){
  e.intent=a.retreat?'retreat':'pursue';e.vx=a.direction*(a.retreat?24:{mushroom:24,cabbage:28,walnut:18,spike:16}[e.kind]);
  if(a.timer<=0){a.mode='rest';a.timer=.8;e.vx=0;e.intent='rest';}
 }else{
  e.intent='patrol';a.direction=Math.sign(e.vx)||a.direction;e.vx=a.direction*20;
  if(a.seen>=.18){a.mode='notice';a.timer=.3;a.retreat=game.p.star>0;a.direction=dir*(a.retreat?-1:1);e.vx=0;e.aiWarning=true;e.intent=a.retreat?'retreat-cue':'notice';e.facing=a.direction;}
 }
 if(e.vx&&!safeStep(game,e,Math.sign(e.vx))){a.direction=-Math.sign(e.vx);a.mode='rest';a.timer=.55;e.vx=0;e.aiWarning=false;e.intent='edge-guard';}
 if(e.vx)e.facing=Math.sign(e.vx);
}
export function confineGroundEnemy(e){
 if(!groundKinds.has(e.kind)||e.state!=='walk')return;
 const [left,right]=bounds(e);if(e.x<left){e.x=left;e.vx=Math.abs(e.vx);}else if(e.x>right){e.x=right;e.vx=-Math.abs(e.vx);}
 if(e.vx)e.facing=Math.sign(e.vx);
}
export function flyingTarget(game,e,dt,patrol){
 const a=brain(e),p=game.p,water=game.level.water?.find(w=>e.homeX>=w.x&&e.homeX<w.x+w.w);
 const sameWater=water&&p.x+p.w>water.x&&p.x<water.x+water.w&&p.y+p.h>water.y;
 const visible=seesPlayer(game,e,96,80)&&(e.kind==='winged'||sameWater);
 e.aiWarning=false;a.timer=Math.max(0,a.timer-dt);
 if(a.mode==='rest'){e.intent='return';if(a.timer<=0){a.mode='patrol';a.seen=0;}return {x:patrol,speed:24};}
 if(a.mode==='notice'){
  e.intent='intercept-cue';e.aiWarning=true;e.facing=a.direction;
  if(a.timer<=0){a.mode='advance';a.timer=.8;e.aiWarning=false;}
  return {x:e.x,speed:0};
 }
 if(a.mode==='advance'){
  e.intent='intercept';if(a.timer<=0){a.mode='rest';a.timer=1.2;return {x:patrol,speed:24};}
  return {x:a.targetX,speed:e.kind==='fish'?30:32};
 }
 e.intent='patrol';a.seen=visible?Math.min(.3,a.seen+dt):0;
 if(a.seen>=.25){a.mode='notice';a.timer=.45;a.direction=toward(e,p);a.targetX=clamp(p.x+p.w/2-e.w/2+clamp(p.vx*.2,-20,20),e.homeX-40,e.homeX+40);e.aiWarning=true;e.intent='intercept-cue';return {x:e.x,speed:0};}
 return {x:patrol,speed:32};
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
