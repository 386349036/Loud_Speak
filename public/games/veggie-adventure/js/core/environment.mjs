import {overlap} from './geometry.mjs';
import {updateSignatureDanger} from './boss-signatures.mjs';
import {limitProjectileRange} from './projectile-range.mjs';
export function hazardShapes(game){
 const shapes=[];for(const h of game.level.hazards||[]){
  const t=(game.time+(h.offset||0))%(h.period||4);
  if(h.kind==='chain'){for(let i=1;i<=3;i++){const r=h.radius*i/3,a=game.time*2*Math.PI/h.period;shapes.push({x:h.x+Math.cos(a)*r-3,y:h.y+Math.sin(a)*r-3,w:6,h:6,kind:'chain',active:true});}}
  else if(h.kind==='rock')shapes.push({...h,y:24,h:8,active:false,warning:t<.75});
  else shapes.push({...h,active:h.kind==='spikes'||(t>=.75&&t<.75+h.on),warning:h.kind==='heat'&&t<.75});
 }return shapes;
}
export function updateEnvironment(game,dt){
 const p=game.p;
 for(const m of game.movers){const ox=m.x,oy=m.y,riding=!m.fallen&&p.grounded&&Math.abs(p.y+p.h-oy)<1&&p.x+p.w>ox&&p.x<ox+m.w;
  if(m.kind==='lift'){const displacement=Math.sin(game.time*2*Math.PI/m.period)*m.range;m.x=m.baseX+(m.axis==='x'?displacement:0);m.y=m.baseY-(m.axis==='y'?displacement:0);}
  else if(m.kind==='crumble'){if(riding||m.timer>0)m.timer+=dt;if(m.timer>=.8)m.fallen=true;if(m.timer>4){m.timer=0;m.fallen=false;}}
  if(riding&&!m.fallen){p.x+=m.x-ox;p.y+=m.y-oy;if(game.solids().some(b=>b!==m&&overlap(p,b)))game.kill();}
 }
 for(const h of game.level.hazards||[])if(h.kind==='rock'){
  const t=game.time+(h.offset||0),prev=t-dt;if(Math.floor((t-.75)/h.period)>Math.floor((prev-.75)/h.period)&&Math.abs(h.x-p.x)<280)game.dangers.push({x:h.x,y:24,w:10,h:10,vx:0,vy:10,gravity:300,life:3,kind:'rock'});
 }
 for(const t of game.turrets){if(Math.abs(t.x-p.x)>280)continue;const near=Math.abs(t.x-p.x)<24;if(near){t.windup=0;continue;}t.cooldown-=dt;
  if(t.cooldown<=0){t.windup+=dt;if(t.windup>=.6){game.enemies.push({id:'bolt-'+game.serial++,kind:'bolt',x:t.x+(p.x<t.x?-16:16),y:t.y,w:14,h:12,vx:p.x<t.x?-85:85,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:t.x,homeY:t.y});t.windup=0;t.cooldown=2.5;}}
 }
}
export function updateDangers(game,dt){
 for(const d of [...game.dangers]){if(updateSignatureDanger(game,d,dt))continue;d.life-=dt;if(d.delay>0){d.delay-=dt;continue;}const oldBottom=d.y+d.h,oldX=d.x,oldY=d.y;d.vy+=(d.gravity||0)*dt;d.x+=d.vx*dt;d.y+=d.vy*dt;
  const thrown=!['wave','sweep'].includes(d.kind)&&!(d.kind==='rock'&&!d.bossKind);
  if(thrown&&limitProjectileRange(d,oldX,oldY))continue;
  if(d.kind==='burst'&&!d.exploded&&d.y>=196){d.exploded=true;d.y=184;d.x-=12;d.w=32;d.h=24;d.vx=0;d.vy=0;d.gravity=0;d.delay=.7;d.life=1.3;}
  if(d.exploded&&d.delay>0)continue;
  if(d.aquatic&&!(game.level.water||[]).some(w=>overlap(d,w))){d.life=0;continue;}
  if(overlap(game.p,d)){game.damage();d.life=0;}
  if(!['wave','sweep','burst'].includes(d.kind)&&game.solids().some(s=>!(s.oneWay&&d.ignoreOneWay)&&(!s.oneWay||(d.vy>=0&&oldBottom<=s.y+.1))&&overlap(d,s)))d.life=0;
 }
 game.dangers=game.dangers.filter(d=>d.life>0&&d.y<256&&Math.abs(d.x-game.p.x)<520);
 for(const h of hazardShapes(game))if(h.active&&overlap(game.p,h)){if(h.kind==='heat')game.kill();else game.damage();}
}
