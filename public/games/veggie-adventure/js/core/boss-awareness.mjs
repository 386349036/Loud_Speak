// Bounded, serializable observations: no input reading and no mid-attack retargeting.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function observeBoss(game,dt){
 const b=game.boss,p=game.p;
 const a=b.awareness??={anchorX:p.x,camp:0,ledge:null,ledgeTime:0,fire:0,velocity:0,lastCooldown:0,nextAdaptCycle:0,recent:[]};
 if(Math.abs(p.x-a.anchorX)>24){a.anchorX=p.x;a.camp=0;}else a.camp=Math.min(6,a.camp+dt);
 const ledge=game.movers.find(m=>m.arena&&!m.fallen&&p.x+p.w>m.x&&p.x<m.x+m.w&&Math.abs(p.y+p.h-m.y)<3&&Math.abs(p.vy)<8);
 const ledgeId=ledge?.id??(ledge?`${ledge.x}:${ledge.y}`:null);
 a.ledgeTime=ledgeId&&ledgeId===a.ledge?Math.min(6,a.ledgeTime+dt):0;a.ledge=ledgeId;
 a.fire=Math.max(0,a.fire-dt*.55);
 if(p.shotCooldown>a.lastCooldown+.1)a.fire=Math.min(4,a.fire+1);
 a.lastCooldown=p.shotCooldown||0;
 a.velocity+=(p.vx-a.velocity)*(1-Math.exp(-dt/.25));
 return a;
}
export function predictedBossTarget(game,b){
 return clamp(game.p.x+clamp((b.awareness?.velocity??game.p.vx)*.22,-25,25),b.left+16,b.right-16);
}
export function rememberBossAttack(b){
 const a=b.awareness;if(!a)return;
 a.recent.push(b.pattern);if(a.recent.length>3)a.recent.shift();
 if(['dislodge','flank','suppress'].includes(b.intent))a.nextAdaptCycle=(b.cycle||0)+2;
}
// Casters choose a position from what they can see, and take time to react.
export function casterMovement(game,b,dt){
 const p=game.p,a=b.awareness,distance=Math.abs(p.x-b.x),toward=p.x<b.x?-1:1;
 const projectile=game.shots.some(s=>s.life>0&&Math.abs(s.x-b.x)<96&&Math.sign(s.vx)===Math.sign(b.x-s.x)&&s.y+s.h>b.y-16&&s.y<b.y+b.h+16);
 a.threatTime=projectile?Math.min(.5,(a.threatTime||0)+dt):Math.max(0,(a.threatTime||0)-dt);
 let speed=distance>104?30:distance<56?-24:0;
 if(a.threatTime>=.22){
  const awayRoom=toward<0?b.right-b.w-8-b.x:b.x-b.left-8;
  speed=awayRoom>32?-30:24;b.intent='reposition';
 }else b.intent=speed>0?'pursue':speed<0?'spacing':'watch';
 b.x=clamp(b.x+toward*speed*dt,b.left+8,b.right-b.w-8);
}
