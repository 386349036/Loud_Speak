import {hazardShapes} from './core/environment.mjs';
import {ENEMY_ART} from './core/enemies.mjs';
import {bossHitbox} from './core/bosses.mjs';
import {frameAt} from './core/animation.mjs';
import {spriteBox,shieldBox} from './core/sprite-layout.mjs';
export function createRenderer(canvas,images,animation,library={actors:{}}){
 const ctx=canvas.getContext('2d');
 function sprite(id,x,y,w,h,flip=false){const img=images.get(id);if(!img)return;ctx.save();ctx.translate(Math.round(x+(flip?w:0)),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(img,0,0,w,h);ctx.restore();}
 function animated(track,x,y,w,h,flip=false){if(!track||track.clip==='hidden')return false;const actor=library.actors[track.actor],clip=actor?.clips[track.clip],img=images.get(actor?.asset);if(!img||!clip)return false;const frame=frameAt(clip,track.elapsed);ctx.save();ctx.translate(Math.round(x+(flip?w:0)),Math.round(y));if(flip)ctx.scale(-1,1);ctx.drawImage(img,frame*actor.frameWidth,clip.row*actor.frameHeight,actor.frameWidth,actor.frameHeight,0,0,w,h);ctx.restore();return true;}
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
 function text(value,x,y,color='#fff3bf'){ctx.fillStyle=color;ctx.font='8px sans-serif';ctx.fillText(value,Math.round(x),Math.round(y));}
 return function draw(game){
  const l=game.level,p=game.p,world=String(l.world||1).padStart(2,'0'),terrain=l.terrain||'W01-kit',boss=game.boss;
  let camera=Math.max(0,Math.min(l.width-256,p.x-88));if(boss?.active&&!boss.dead)camera=boss.left-16;
  ctx.setTransform(3,0,0,3,0,0);ctx.imageSmoothingEnabled=false;rect(0,0,256,240,'#152e2e');
  if(boss?.active)sprite(l.background,0,0,256,240);else {sprite(l.background||'W01-far',-camera/l.width*140,0,430,240);if(l.mid!==null){ctx.globalAlpha=.65;sprite(l.mid||'W01-mid',-camera/l.width*160,24,430,216);ctx.globalAlpha=1;}}
  for(const w of l.water||[]){ctx.globalAlpha=.45;rect(w.x-camera,w.y,w.w,w.h,'#40b7d8');ctx.globalAlpha=1;rect(w.x-camera,w.y,w.w,2,'#a0f1ed');}
  for(const b of l.platforms)for(let y=0;y<b.h;y+=16)for(let x=0;x<b.w;x+=16){const sx=b.x+x-camera;if(sx>-16&&sx<256)sprite(terrain+'-'+(b.bridge?2:y===0?0:1),sx,b.y+y,Math.min(16,b.w-x),Math.min(16,b.h-y));}
  for(const b of game.blocks)if(!b.broken)sprite('objects-'+(b.kind==='brick'?15:b.used?13:12),b.x-camera,b.y,16,16);
  for(const m of game.movers)if(!m.fallen){for(let x=0;x<m.w;x+=16)sprite(terrain+'-2',m.x+x-camera,m.y,16,m.h);if(m.kind==='crumble'&&m.timer>0)text('!',m.x-camera+m.w/2,m.y-3,'#ffcd69');}
  for(const g of game.gates)if(!g.open){sprite(terrain+'-1',g.x-camera,g.y,g.w,g.h);text('壳',g.x-camera,g.y-4);}
  for(const h of hazardShapes(game)){if(h.kind==='spikes'){ctx.fillStyle='#efbfd0';for(let x=0;x<h.w;x+=8){ctx.beginPath();ctx.moveTo(h.x+x-camera,h.y+h.h);ctx.lineTo(h.x+x+4-camera,h.y);ctx.lineTo(h.x+x+8-camera,h.y+h.h);ctx.fill();}}else if(h.active){rect(h.x-camera,h.y,h.w,h.h,'#ff8146');rect(h.x-camera+2,h.y+2,Math.max(2,h.w-4),Math.max(2,h.h-4),'#ffe57c');}else if(h.warning){rect(h.x-camera,h.kind==='rock'?196:h.y+h.h-3,h.w,3,'#ffd466');text('!',h.x-camera,h.kind==='rock'?190:h.y-4);}}
  for(const t of game.turrets){rect(t.x-camera,t.y,t.w,t.h,'#654c86');rect(t.x-camera-3,t.y+2,22,8,'#b68bd0');if(t.windup>0)text('!',t.x-camera,t.y-4);}
  for(const i of game.items)if(!i.collected)sprite('objects-'+({carrot:8,chili:9,star:10,seed:11}[i.kind]),i.x-camera,i.y,i.w,i.h);
  for(const e of game.enemies)if(!e.dead){
   const track=animation?.get(e),box=spriteBox(e,library.actors[track?.actor],18,18);if(track?.clip==='hidden')continue;if(animated(track,box.x-camera,box.y,box.w,box.h,e.vx<0)){if(e.warning)text('!',e.x-camera,e.y-5);continue;}
   if(e.kind==='trap'&&!e.active){sprite('E08-1',e.x-camera,e.y+9,14,5);continue;}
   const walk=Math.floor(game.time*7)%2;
   let art=e.kind==='mushroom'?'objects-'+walk:e.kind==='cabbage'?'objects-'+(e.state==='walk'?(walk?4:3):e.state==='rolling'?6:5):ENEMY_ART[e.kind]+'-1';
   sprite(art,e.x-camera-2,e.y-2,18,18,e.vx<0);
   if(e.state==='shell'||e.state==='rolling'){ctx.strokeStyle=e.kind==='walnut'?'#e8ba82':'#b4eb75';ctx.strokeRect(e.x-camera,e.y+6,14,8);if(e.timer>8)text('!',e.x-camera,e.y-4);}
   if(e.warning)text('!',e.x-camera,e.y-5);
  }
  for(const g of animation?.ghosts||[]){const box=spriteBox(g,library.actors[g.actor],18,18);animated({...g},box.x-camera,box.y,box.w,box.h,g.flip);}
  if(boss){const f=boss.dead?5:boss.phase==='windup'?2:boss.phase==='attack'?3:boss.phase==='expose'?4:1;if(!animated(animation?.get('boss'),boss.x-camera-4,boss.y-8,40,40,boss.kind!==7&&boss.direction<0))sprite(boss.id+'-'+f,boss.x-camera-4,boss.y-8,40,40,boss.direction>0);
   if(boss.active&&!boss.dead){rect(14,10,228,19,'#15251edd');text(boss.name+'  '+('●'.repeat(boss.hp))+('○'.repeat(3-boss.hp)),20,23);
    if(boss.phase==='windup'){text('准备攻击',boss.x-camera-2,boss.y-14,'#ffd472');rect((boss.targetX||boss.x)-camera,204,16,3,'#ffb272');}
    if(boss.kind===7)text(boss.head?'右头行动':'左头行动',14,50);
    if(boss.phase==='expose'){const hit=bossHitbox(boss);rect(hit.x-camera+2,boss.y-3,hit.w-4,3,'#8dffb2');text('↓',hit.x-camera+hit.w/2-4,boss.y-6,'#a6ffc8');text('弱点 '+Math.max(0,(boss.kind===4?2.5:2)-boss.timer).toFixed(1)+'秒',14,40);}
   }
  }
  for(const d of game.dangers){if(d.delay>0){text('!',d.x-camera,d.kind==='rock'?190:d.y,'#ffd472');continue;}const clip=d.kind==='wave'||d.kind==='sweep'?'wave':d.kind==='burst'&&d.exploded?'burst':'seed',elapsed=clip==='burst'?Math.max(0,.6-d.life):animation?.time||game.time;if(d.kind!=='rock'&&animated({actor:'FX01',clip,elapsed},d.x-camera-2,d.y-2,d.w+4,d.h+4,d.vx<0))continue;rect(d.x-camera,d.y,d.w,d.h,d.kind==='rock'?'#c6917a':'#fb805c');rect(d.x-camera+1,d.y+1,Math.max(1,d.w-2),2,'#ffe6a1');}
  for(const s of game.shots)if(!animated({actor:'FX01',clip:'fire',elapsed:3-s.life},s.x-camera-2,s.y-2,8,8,s.vx<0)){rect(s.x-camera,s.y,4,4,'#ffe66b');rect(s.x-camera+1,s.y+1,2,2,'#ed6438');}
  let frame=p.form*4+(p.grounded?(Math.abs(p.vx)>4?1+Math.floor(game.time*10)%2:0):3);if(p.form===2&&p.shotCooldown>.12)frame=14;if(p.crouch)frame=p.form===2?8:13;if(game.mode==='dead')frame=12;if(game.mode==='won')frame=15;
  const ph=p.form?32:20,box=spriteBox(p,library.actors['P01-'+p.form],p.form?16:20,ph);if(p.hurt<=0||Math.floor(game.time*12)%2===0){if(!animated(animation?.get(p),box.x-camera,box.y,box.w,box.h,p.facing<0))sprite('hero-'+frame,box.x-camera,box.y,box.w,box.h,p.facing<0);}
  for(const e of animation?.effects||[])animated({actor:'FX01',clip:e.kind,elapsed:e.elapsed},e.x-camera-6,e.y-18,24,24);
  if(p.star>0){const aura=shieldBox(p);ctx.save();ctx.globalAlpha=p.star<2?.65+.25*Math.sin(game.time*8):.9;animated({actor:'SHIELD',clip:'aura',elapsed:10-p.star},aura.x-camera,aura.y,aura.w,aura.h);ctx.restore();}
  const cp=l.checkpoint;rect(cp-camera,155,2,53,game.checkpointReached?'#ffde72':'#9ee268');rect(cp-camera+2,155,13,10,game.checkpointReached?'#ffde72':'#9ee268');
  sprite('W'+world+'-special-exit',l.exit-camera-4,160,24,48);if(!boss||boss.dead)text('出口',l.exit-camera-4,154);
  if(l.id==='1-1'&&!animated(animation?.get('N01'),64-camera,190,18,18))sprite('N01-1',64-camera,190,18,18);if(l.id==='8-4'&&boss?.dead&&!animated(animation?.get('N02'),l.exit-camera-24,190,18,18))sprite('N02-1',l.exit-camera-24,190,18,18);
 };
}
