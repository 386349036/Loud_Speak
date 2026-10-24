import {ENEMY_ART} from './enemies.mjs';
export function frameAt(clip,elapsed){const n=Math.floor(Math.max(0,elapsed)*clip.fps+1e-7);return clip.loop?n%clip.frames:Math.min(clip.frames-1,n);}
export function playerClip(game){const p=game.p;if(game.mode==='dead')return 'death';if(game.mode==='won')return 'victory';if(p.hurt>1.15)return 'hurt';if(p.form===2&&p.shotCooldown>.02)return 'throw';if(p.crouch)return 'crouch';if(p.inWater)return 'swim';if(!p.grounded)return p.vy<0?'jump-rise':'jump-fall';return Math.abs(p.vx)>85?'run':Math.abs(p.vx)>4?'walk':'idle';}
export function enemyClip(e){
 if(e.dead)return e.kind==='mushroom'?'flatten':e.kind==='bolt'?'fall':'hit';
 if(e.state==='rolling')return 'shell-slide';if(e.state==='shell')return e.timer>8.6?'wake':'shell-idle';
 switch(e.kind){
 case 'mushroom':case 'cabbage':case 'walnut':return 'walk';
 case 'spike':return e.grounded?'walk':'fall';
 case 'jelly':return (e.phase||0)%2<.5?'pulse':'float';
 case 'fish':return 'swim';
 case 'corn':return e.warning?'windup':e.cooldown>2.95?'throw':e.cooldown>2.55?'recover':!e.grounded?'jump':'walk';
 case 'trap':{const t=(e.phase||0)%3;return t<.3?'retract':t<1.1?'hidden':t<1.5?'emerge':'idle';}
 case 'cloud':return e.warning?'windup':e.cooldown>2.6?'drop':'float';
 case 'bolt':return 'fly';case 'winged':return 'fly';case 'leaper':return e.vy<0?'leap':e.grounded?'splash':'fall';
 default:return 'idle';}
}
export function bossClip(b){
 if(b.dead)return 'defeat';if(b.invulnerable>.65)return 'hit';
 const kind=b.kind,t=b.timer||0;
 if(b.phase==='expose')return ['expose','expose','stun','stagger','stranded','open','exhaust','expose','open'][kind];
 if(b.phase==='recover')return 'hit';
 if(b.phase==='windup')return kind===6?'cast-high':kind===7?(b.head?'right-attack':'left-attack'):'windup';
 if(b.phase==='attack')return ({1:t>.75?'land':'jump',2:t<.4?'throw':'roll',3:t<.6?'throw':'dash',4:t<.3?'spray':'leap',5:t<.35?'shed':'roll',6:t<.45?'cast-high':t<.9?'cast-low':'seed',7:t<.6?(b.head?'right-attack':'left-attack'):'sweep',8:b.cycle%2?(t>.75?'land':'jump'):'seed-fan'})[kind];
 return kind===4?'swim':kind===8&&b.hp===1?'enrage':'idle';
}
// Presentation owns all clocks and transient sprites; simulation objects remain untouched.
export class AnimationPlayer{
 constructor(){this.reset();}
 reset(){this.time=0;this.game=null;this.lastTime=-1;this.tracks=new Map();this.previous=new Map();this.ghosts=[];this.effects=[];this.observed=false;}
 track(key,actor,clip,dt,token=''){let t=this.tracks.get(key);if(!t||t.actor!==actor||t.clip!==clip||t.token!==token)t={actor,clip,elapsed:0,token};else t.elapsed+=dt;this.tracks.set(key,t);return t;}
 update(game,dt){
  if(this.game!==game||game.time<this.lastTime||this.player&&this.player!==game.p){this.reset();this.game=game;}this.player=game.p;
  this.lastTime=game.time;this.time+=dt;this.ghosts=this.ghosts.filter(g=>(g.elapsed+=dt)<.5);this.effects=this.effects.filter(e=>(e.elapsed+=dt)<.5);
  const p=game.p;this.track(p,'P01-'+p.form,playerClip(game),dt);
  const live=new Set([p,'boss','N01','N02']);
  for(const e of game.enemies){const old=this.previous.get(e);let actor=ENEMY_ART[e.kind],clip=enemyClip(e);live.add(e);
   if(old&&!old.dead&&e.dead)this.ghosts.push({actor,clip,x:e.x,y:e.y,w:e.w,h:e.h,flip:e.vx<0,elapsed:0});
   let track=this.tracks.get(e);
   if(old&&old.kind==='winged'&&e.kind==='cabbage')track=this.track(e,'E11','lose-wings',0,'transition');
   else if(old&&old.state!=='shell'&&e.state==='shell')track=this.track(e,actor,'retract',0,'transition');
   else if(old&&!old.grounded&&e.grounded&&['spike','leaper'].includes(e.kind))track=this.track(e,actor,e.kind==='spike'?'unfold':'splash',0,'transition');
   else if(track?.token==='transition'&&track.elapsed<.35){track.elapsed+=dt;}
   else this.track(e,actor,clip,dt);
   this.previous.set(e,{kind:e.kind,state:e.state,dead:e.dead,grounded:e.grounded});
  }
  for(const [e,old] of this.previous)if(!live.has(e)){if(e.dead&&!old.dead)this.ghosts.push({actor:ENEMY_ART[old.kind],clip:old.kind==='bolt'?'fall':'hit',x:e.x,y:e.y,w:e.w,h:e.h,flip:e.vx<0,elapsed:0});this.previous.delete(e);}
  if(game.boss)this.track('boss',game.boss.id,bossClip(game.boss),dt,game.boss.phase);
  this.track('N01','N01',Math.abs(p.x-64)<48?['wave','map','talk'][Math.floor(this.time/2)%3]:'idle',dt);
  const rescued=this.tracks.get('boss');this.track('N02','N02',game.mode==='won'?'celebrate':game.boss?.dead?(rescued?.elapsed<.6?'rescue':'plant'):'idle',dt);
  for(const event of game.animationEvents||[]){if(event.type==='deflect'){this.track(event.body,ENEMY_ART[event.body.kind],'deflect',0,'transition');this.effect('hit',event.x,event.y);}}if(game.animationEvents)game.animationEvents.length=0;
  for(const key of this.tracks.keys())if(!live.has(key))this.tracks.delete(key);
  if(this.observed){if(p.grounded&&!this.grounded)this.effect('dust',p.x,p.y+p.h);if(p.inWater!==this.water)this.effect('splash',p.x,p.y+p.h/2);if(game.score>this.score)this.effect('spark',p.x,p.y);if(p.hurt>this.hurt||game.mode==='dead'&&this.mode!=='dead')this.effect('hit',p.x,p.y);}
  this.observed=true;this.grounded=p.grounded;this.water=p.inWater;this.score=game.score;this.hurt=p.hurt;this.mode=game.mode;
 }
 effect(kind,x,y){this.effects.push({kind,x,y,elapsed:0});}
 get(key){return this.tracks.get(key);}
}
