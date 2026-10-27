import {ENEMY_ART,enemyFacing} from './enemies.mjs';
import {trapStage} from './trap-profile.mjs';
import {bossEnraged} from './boss-balance.mjs';
export function frameAt(clip,elapsed){const n=Math.floor(Math.max(0,elapsed)*clip.fps+1e-7);return clip.loop?n%clip.frames:Math.min(clip.frames-1,n);}
export function playerClip(game){const p=game.p;if(game.mode==='dead'||game.mode==='gameover')return 'death';if(game.mode==='won')return 'victory';if(p.hurt>1.15)return 'hurt';if(p.form===2&&p.shotCooldown>.02)return 'throw';if(p.crouch)return 'crouch';if(p.inWater)return 'swim';if(!p.grounded)return p.vy<0?'jump-rise':'jump-fall';return Math.abs(p.vx)>4?'run':'idle';}
export function enemyClip(e){
 if(['winged','cloud'].includes(e.kind)&&e.dead)return e.grounded?'stunned':'fall-stunned';
 if(e.dead)return e.kind==='mushroom'&&e.defeatedBy==='stomp'?'flatten':e.kind==='bolt'?'fall':'hit';
 if(e.state==='stunned')return !e.grounded?'fall-stunned':e.timer>=8?'wake':'stunned';
 if(e.state==='rolling')return 'shell-slide';if(e.state==='shell')return e.timer>=8?'wake':'shell-idle';
 switch(e.kind){
 case 'anemone':return e.plantPhase==='windup'?'windup':e.plantPhase==='attack'?'attack':'idle';
 case 'mushroom':case 'cabbage':case 'walnut':return 'walk';
 case 'spike':return e.intent==='spine-volley'?'unfold':e.grounded?'walk':'fall';
 case 'jelly':return (e.phase||0)%2<.5?'pulse':'float';
 case 'fish':return 'swim';
 case 'corn':return e.warning?'windup':e.cooldown>2.95?'throw':e.cooldown>2.55?'recover':!e.grounded?'jump':'walk';
 case 'trap':{const stage=trapStage(e).name;return stage==='rumble'?'hidden':stage;}
 case 'cloud':return e.warning?'windup':e.dropTimer>0?'drop':'float';
 case 'bolt':return 'fly';case 'winged':return 'fly';case 'leaper':return e.leapPhase==='wait'?'hidden':e.leapPhase==='splash'?'splash':e.vy<0?'leap':e.grounded?'splash':'fall';
 default:return 'idle';}
}
export function bossClip(b){
 if(b.dead)return 'defeat';if(b.hitFlash>0)return 'hit';
 const kind=b.kind,t=b.timer||0;
 if(b.phase==='expose')return ['expose','expose','stun','stagger','stranded','open','exhaust','expose','open'][kind];
 if(b.phase==='recover')return 'hit';
 if(b.phase==='attack'){
  if(b.pattern==='root-quake')return 'throw';
  if(b.pattern==='husk-lance')return 'throw';
  if(b.pattern==='lotus-geyser')return 'spray';
  if(b.pattern==='durian-bounce')return 'shed';
  if(b.pattern==='kiln-pillars')return 'cast-high';
  if(b.pattern==='twin-pincer')return t<1?'left-attack':'right-attack';
  if(b.pattern==='crown-split')return 'seed-fan';
  if(kind===2&&b.pattern==='charge')return 'roll';
  if(kind===3&&b.pattern==='dash')return 'dash';
  if(kind===3&&b.pattern==='seed-dash')return t<.45?'throw':'dash';
  if(kind===4&&b.pattern==='double-fan'&&t>=.5&&t<.75)return 'spray';
  if(kind===6&&b.pattern==='burst')return 'seed';
 }
 if(kind===1&&b.phase==='attack'){if(b.pattern==='seeds')return 'windup';if(b.pattern==='dash')return 'land';return t>.8?'land':'jump';}
 if(kind===8&&b.phase==='attack'){const volley=b.pattern==='volley'||(!b.pattern&&b.cycle%2===0);return volley?'seed-fan':t>.75?'land':'jump';}
 if(b.phase==='windup')return kind===6?'cast-high':kind===7?(b.head?'right-attack':'left-attack'):'windup';
 if(b.phase==='attack')return ({1:t>.75?'land':'jump',2:t<.4?'throw':'roll',3:t<.6?'throw':'dash',4:t<.3?'spray':'leap',5:t<.35?'shed':'roll',6:t<.45?'cast-high':t<.9?'cast-low':'seed',7:t<.6?(b.head?'right-attack':'left-attack'):'sweep',8:b.cycle%2?(t>.75?'land':'jump'):'seed-fan'})[kind];
 return kind===4?'swim':kind===8&&bossEnraged(b)?'enrage':'idle';
}
// Presentation owns all clocks and transient sprites; simulation objects remain untouched.
export class AnimationPlayer{
 constructor(){this.reset();}
 reset(){this.time=0;this.game=null;this.lastTime=-1;this.tracks=new Map();this.previous=new Map();this.ghosts=[];this.effects=[];this.observed=false;}
 addGhost(e,actor,clip){const flying=['winged','cloud'].includes(e.kind);this.ghosts.push({actor,clip:flying?(e.grounded?'stunned':'fall-stunned'):clip,x:e.x,y:e.y,w:e.w,h:e.h,flip:enemyFacing(e)<0,elapsed:0,flying,grounded:!!e.grounded,vy:Math.max(0,e.vy||0),hold:0});}
 advanceGhosts(game,dt){
  this.ghosts=this.ghosts.filter(g=>{
   g.elapsed+=dt;if(!g.flying)return g.elapsed<.5;
   if(!g.grounded){
    const bottom=g.y+g.h;g.vy=Math.min(280,g.vy+600*dt);g.y+=g.vy*dt;
    const floor=Math.min(240,...game.solids().filter(s=>s.x<g.x+g.w&&s.x+s.w>g.x&&s.y>=bottom-.1).map(s=>s.y));
    if(g.y+g.h>=floor){g.y=floor-g.h;g.grounded=true;g.elapsed=0;g.clip='stunned';}
   }else {g.hold+=dt;g.clip='stunned';}
   return g.hold<.5&&g.elapsed<3;
  });
 }
 track(key,actor,clip,dt,token=''){let t=this.tracks.get(key);if(!t||t.actor!==actor||t.clip!==clip||t.token!==token)t={actor,clip,elapsed:0,token};else t.elapsed+=dt;this.tracks.set(key,t);return t;}
 update(game,dt){
  if(this.game!==game||game.time<this.lastTime||this.player&&this.player!==game.p){this.reset();this.game=game;}this.player=game.p;
  this.lastTime=game.time;this.time+=dt;this.advanceGhosts(game,dt);this.effects=this.effects.filter(e=>(e.elapsed+=dt)<.5);
  const p=game.p,clip=playerClip(game),rate=clip==='run'?Math.max(.35,Math.min(1,Math.abs(p.vx)/112)):1;this.track(p,'P01-'+p.form,clip,dt*rate);
  const live=new Set([p,'boss','N01','N02']);
  for(const e of game.enemies){const old=this.previous.get(e);let actor=ENEMY_ART[e.kind],clip=enemyClip(e);live.add(e);
   if(old&&!old.dead&&e.dead)this.addGhost(e,actor,clip);
   let track=this.tracks.get(e);
   if(e.dead)track=this.track(e,actor,clip,dt);
   else if(e.state==='stunned')track=this.track(e,actor,clip,dt);
   else if(old&&old.state!=='shell'&&e.state==='shell')track=this.track(e,actor,'retract',0,'transition');
   else if(old&&!old.grounded&&e.grounded&&e.state==='walk'&&['spike','leaper'].includes(e.kind))track=this.track(e,actor,e.kind==='spike'?'unfold':'splash',0,'transition');
   else if(track?.token==='transition'&&track.elapsed<.35){track.elapsed+=dt;}
   else this.track(e,actor,clip,clip==='walk'?dt*Math.min(1.4,Math.abs(e.vx)/20):dt,clip==='walk'&&Math.abs(e.vx)<.1?'stand':'');
   this.previous.set(e,{kind:e.kind,state:e.state,dead:e.dead,grounded:e.grounded});
  }
  for(const [e,old] of this.previous)if(!live.has(e)){if(e.dead&&!old.dead)this.addGhost(e,ENEMY_ART[old.kind],old.kind==='bolt'?'fall':'hit');this.previous.delete(e);}
  if(game.boss)this.track('boss',game.boss.id,bossClip(game.boss),dt,game.boss.phase);
  this.track('N01','N01',Math.abs(p.x-64)<48?['wave','map','talk'][Math.floor(this.time/2)%3]:'idle',dt);
  const rescued=this.tracks.get('boss');this.track('N02','N02',game.mode==='won'?'celebrate':game.boss?.dead?(rescued?.elapsed<.6?'rescue':'plant'):'idle',dt);
  for(const event of game.animationEvents||[]){if(event.type==='deflect')this.track(event.body,ENEMY_ART[event.body.kind],'deflect',0,'transition');if(['enemy-block','boss-block'].includes(event.type))this.effect('spark',event.x,event.y);if(['deflect','enemy-hit','boss-hit'].includes(event.type))this.effect('hit',event.x,event.y);}if(game.animationEvents)game.animationEvents.length=0;
  for(const key of this.tracks.keys())if(!live.has(key))this.tracks.delete(key);
  if(this.observed){if(p.grounded&&!this.grounded)this.effect('dust',p.x,p.y+p.h);if(p.inWater!==this.water)this.effect('splash',p.x,p.y+p.h/2);if(game.score>this.score)this.effect('spark',p.x,p.y);if(p.hurt>this.hurt||game.mode==='dead'&&this.mode!=='dead')this.effect('hit',p.x,p.y);}
  this.observed=true;this.grounded=p.grounded;this.water=p.inWater;this.score=game.score;this.hurt=p.hurt;this.mode=game.mode;
 }
 effect(kind,x,y){this.effects.push({kind,x,y,elapsed:0});}
 get(key){return this.tracks.get(key);}
}
