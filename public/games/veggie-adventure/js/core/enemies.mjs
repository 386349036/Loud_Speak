import {overlap} from './geometry.mjs';
export const ENEMY_ART={mushroom:'E01',cabbage:'E02',walnut:'E03',spike:'E04',jelly:'E05',fish:'E06',corn:'E07',trap:'E08',cloud:'E09',bolt:'E10',winged:'E11',leaper:'E12'};
export const fireproof=e=>['walnut','bolt'].includes(e.kind);
export function defeat(game,e,score=200){e.dead=true;game.score+=score;}
export function updateEnemies(game,dt,oldBottom){
 const p=game.p;
 for(const e of game.enemies){if(e.dead)continue;if(!['rolling','shell'].includes(e.state)&&Math.abs(e.x-p.x)>320)continue;
  e.grace=Math.max(0,(e.grace||0)-dt);e.phase=(e.phase||0)+dt;e.homeX??=e.x;e.homeY??=e.y;
  if(['fish','jelly','cloud','winged'].includes(e.kind)){
   e.x=e.homeX+Math.sin(e.phase*(e.kind==='fish'?1.2:.8))* (e.kind==='cloud'?32:24);e.y=e.homeY+Math.sin(e.phase*2)*(e.kind==='jelly'?24:12);e.vy=0;
  }else if(e.kind==='trap'){e.active=e.phase%3>1.1;e.vx=0;e.vy=0;}
  else if(e.kind==='bolt'){e.x+=e.vx*dt;if(e.phase>6||game.solids().some(b=>overlap(e,b))){e.dead=true;continue;}}
  else {e.vy=Math.min(280,e.vy+600*dt);game.move(e,dt);if(e.kind==='leaper'&&e.grounded){e.vy=-300;e.vx=0;}if(e.y>270){e.dead=true;continue;}}
  if(e.kind==='corn'){
   if(e.x<e.homeX-24)e.vx=12;else if(e.x>e.homeX+24)e.vx=-12;else if(!e.vx)e.vx=-12;
   if(e.grounded&&e.phase%4<dt)e.vy=-150;
   e.cooldown=(e.cooldown??1.2)-dt;e.warning=e.cooldown<.6&&e.cooldown>0;
   if(e.cooldown<=0){const dir=p.x<e.x?-1:1;for(let i=0;i<3;i++)game.dangers.push({x:e.x,y:e.y-4,w:5,h:5,vx:dir*(60+i*16),vy:-100-i*14,gravity:240,delay:i*.18,life:4,kind:'seed'});e.cooldown=3.3;}
  }
  if(e.kind==='cloud'){
   e.cooldown=(e.cooldown??2)-dt;e.warning=e.cooldown<.6&&e.cooldown>0;
   if(e.cooldown<=0){if(game.enemies.filter(v=>!v.dead&&v.parent===e.id).length<3)game.enemies.push({id:'cloud-'+game.serial++,parent:e.id,kind:'spike',x:e.x,y:e.y+16,w:14,h:14,vx:-15,vy:0,state:'walk',timer:0,grace:0,dead:false});e.cooldown=3;}
  }
  if(e.state==='shell'){e.timer+=dt;if(e.timer>=9){e.state='walk';e.vx=-20;e.timer=0;}}
  if(e.state==='rolling'){
   for(const other of game.enemies)if(other!==e&&!other.dead&&overlap(e,other)){defeat(game,other);if(other.state==='rolling')e.dead=true;}
   for(const gate of game.gates)if(!gate.open&&overlap({...e,x:e.x-3,w:e.w+6},gate)){gate.open=true;e.vx=-e.vx;game.score+=300;}
  }
  if(e.dead||(e.kind==='trap'&&!e.active)||!overlap(p,e))continue;
  if(p.star>0){defeat(game,e);continue;}
  const stomp=!p.inWater&&p.vy>=0&&oldBottom<=e.y+3&&!['spike','trap','fish','jelly'].includes(e.kind);
  if(stomp){p.y=e.y-p.h;p.vy=-135;
   if(e.kind==='winged'){e.kind='cabbage';e.vx=-20;}
   else if(['cabbage','walnut'].includes(e.kind)){e.state='shell';e.vx=0;e.timer=0;}
   else defeat(game,e,100);
  }else if(e.state==='shell'){e.state='rolling';e.vx=(p.x<e.x?1:-1)*150;e.grace=.15;e.timer=0;}
  else if(e.grace<=0)game.damage();
 }
 // Generated actors expire; fixed level actors stay in snapshots for deterministic rollback.
 game.enemies=game.enemies.filter(e=>!(e.dead&&typeof e.id==='string'));
}
