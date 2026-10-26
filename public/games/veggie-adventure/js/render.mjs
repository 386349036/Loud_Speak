import {bossCue} from './core/boss-cues.mjs';
import {hazardShapes} from './core/environment.mjs';
import {ENEMY_ART,enemyFacing,enemyActive,enemyShelled} from './core/enemies.mjs';
import {bossHitbox,exposeDuration,bossWeakTop,bossVulnerable} from './core/bosses.mjs';
import {frameAt} from './core/animation.mjs';
import {spriteBox,playerBox,shieldBox} from './core/sprite-layout.mjs';
import {trapStage} from './core/trap-profile.mjs';
import {bossEnraged,bossSkillName} from './core/boss-balance.mjs';
export function terrainTileId(terrain,layer,x,y,images){
 const id=terrain+'-'+layer,alternate=id+'b';
 const index=((Math.floor(x/16)*17+Math.floor(y/16)*11)%7+7)%7;
 return layer!==2&&index<3&&images.has(alternate)?alternate:id;
}
export function cameraX(level,player,boss,width=256){
 if(level.warpRoom)return 0;
 const max=Math.max(0,level.width-width);
 if(boss?.active&&!boss.dead){
  const left=boss.left-16,right=boss.right+16;
  if(width>=right-left)return Math.max(0,Math.min(max,(left+right-width)/2));
  return Math.max(0,Math.min(max,Math.max(left,Math.min(right-width,player.x-width*.4375))));
 }
 return Math.max(0,Math.min(max,player.x-width*.34375));
}
export function sceneFrame(level,width,height=240){
 const scale=level.warpRoom?Math.min(width/level.width,height/level.height):1;
 return {scale,width:level.warpRoom?level.width:width,x:level.warpRoom?(width-level.width*scale)/2:0,y:level.warpRoom?(height-level.height*scale)/2:0};
}
export function createRenderer(canvas,images,animation,library={actors:{}}){
 const ctx=canvas.getContext('2d');
 function sprite(id,x,y,w,h,flip=false){const img=images.get(id);if(!img)return;const dx=Math.round(x),dy=Math.round(y),dw=Math.max(1,Math.round(x+w)-dx),dh=Math.max(1,Math.round(y+h)-dy);ctx.save();ctx.translate(dx+(flip?dw:0),dy);if(flip)ctx.scale(-1,1);ctx.drawImage(img,0,0,dw,dh);ctx.restore();}
 function animated(track,x,y,w,h,flip=false){if(!track||track.clip==='hidden')return false;const actor=library.actors[track.actor],clip=actor?.clips[track.clip],img=images.get(actor?.asset);if(!img||!clip)return false;const frame=frameAt(clip,track.elapsed);y+=(actor.footOffsets?.[track.clip]?.[frame]||0)*h/actor.frameHeight;const dx=Math.round(x),dy=Math.round(y),dw=Math.max(1,Math.round(x+w)-dx),dh=Math.max(1,Math.round(y+h)-dy);ctx.save();ctx.translate(dx+(flip?dw:0),dy);if(flip)ctx.scale(-1,1);ctx.drawImage(img,frame*actor.frameWidth,clip.row*actor.frameHeight,actor.frameWidth,actor.frameHeight,0,0,dw,dh);ctx.restore();return true;}
 function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),w,h);}
 function text(value,x,y,color='#fff3bf'){ctx.fillStyle=color;ctx.font='8px sans-serif';ctx.fillText(value,Math.round(x),Math.round(y));}
 return function draw(game){
  const l=game.level,p=game.p,world=String(l.world||1).padStart(2,'0'),terrain=l.terrain||'W01-kit',boss=game.boss;
  const screenWidth=Number.isFinite(canvas.width)?canvas.width/3:256,viewFrame=sceneFrame(l,screenWidth),width=viewFrame.width,camera=cameraX(l,p,boss,width);
  ctx.setTransform(3,0,0,3,0,0);ctx.imageSmoothingEnabled=false;rect(0,0,screenWidth,240,'#152e2e');
  if(l.warpRoom){for(let x=0;x<screenWidth;x+=430)sprite(l.background||'W01-far',x,0,430,240);ctx.setTransform(3*viewFrame.scale,0,0,3*viewFrame.scale,viewFrame.x*3,viewFrame.y*3);}
  // Repeat scenery at its original proportions; ultrawide displays must not expose blank edges.
  const backdrop=(id,parallax,y,h)=>{const offset=-(camera*parallax%430);for(let x=offset;x<width;x+=430)sprite(id,x,y,430,h);};
  if(!l.warpRoom)backdrop(l.background||'W01-far',.08,0,240);if(l.mid!==null&&!boss?.active){ctx.globalAlpha=.65;backdrop(l.mid||'W01-mid',.1,24,216);ctx.globalAlpha=1;}
  for(const w of l.water||[]){ctx.globalAlpha=.45;rect(w.x-camera,w.y,w.w,w.h,'#40b7d8');ctx.globalAlpha=1;rect(w.x-camera,w.y,w.w,2,'#a0f1ed');}
  for(const b of l.platforms)for(let y=0;y<b.h;y+=16)for(let x=0;x<b.w;x+=16){const sx=b.x+x-camera;if(sx>-16&&sx<width)sprite(terrainTileId(terrain,b.bridge?2:y===0?0:1,b.x+x,b.y+y,images),sx,b.y+y,Math.min(16,b.w-x),Math.min(16,b.h-y));}
  for(const b of game.blocks)if(!b.broken&&b.kind!=='warp')sprite('objects-15',b.x-camera,b.y,16,16);
  // Reward contents survive conversion to breakable bricks; draw faces last.
  for(const b of game.blocks)if(!b.broken&&(b.item||b.kind==='reward'))sprite(!b.used&&b.item==='rebirth'?'reward-rebirth-face':'objects-'+(b.used?13:12),b.x-camera,b.y,16,16);
  for(const b of game.blocks)if(b.kind==='warp'){
   sprite((b.terrain||'W01-kit')+'-0',b.x-camera,b.y,b.w,b.h);
   sprite(b.labelAsset,b.x+b.w/2-camera-11,b.y-14,22,10);
  }
  for(const group of l.worldGroups||[])text(group.world+' · '+group.name,group.x+24,group.y,'#fff1b5');
  for(const m of game.movers)if(!m.fallen){rect(m.x-camera,m.y,m.w,m.h,'#596347');for(let x=0;x<m.w;x+=16)sprite((m.terrain||terrain)+(m.kind==='warp-shelf'?'-0':'-2'),m.x+x-camera,m.y,Math.min(16,m.w-x),m.h);if(m.arena){rect(m.x-camera,m.y,m.w,2,'#d9e89b');for(const x of [m.x+4,m.x+m.w-6])rect(x-camera,m.y+m.h,2,12,'#6d9650');}if(m.kind==='crumble'&&m.timer>0)text('!',m.x-camera+m.w/2,m.y-3,'#ffcd69');}
  for(const g of game.gates)if(!g.open){sprite(terrain+'-1',g.x-camera,g.y,g.w,g.h);text('壳',g.x-camera,g.y-4);}
  for(const h of hazardShapes(game)){if(h.kind==='spikes'){ctx.fillStyle='#efbfd0';for(let x=0;x<h.w;x+=8){ctx.beginPath();ctx.moveTo(h.x+x-camera,h.y+h.h);ctx.lineTo(h.x+x+4-camera,h.y);ctx.lineTo(h.x+x+8-camera,h.y+h.h);ctx.fill();}}else if(h.active){rect(h.x-camera,h.y,h.w,h.h,'#ff8146');rect(h.x-camera+2,h.y+2,Math.max(2,h.w-4),Math.max(2,h.h-4),'#ffe57c');}else if(h.warning){rect(h.x-camera,h.kind==='rock'?196:h.y+h.h-3,h.w,3,'#ffd466');text('!',h.x-camera,h.kind==='rock'?190:h.y-4);}}
  for(const t of game.turrets){rect(t.x-camera,t.y,t.w,t.h,'#654c86');rect(t.x-camera-3,t.y+2,22,8,'#b68bd0');if(t.windup>0)text('!',t.x-camera,t.y-4);}
  for(const i of game.items)if(!i.collected)sprite(i.kind==='rebirth'?'item-rebirth':'objects-'+({carrot:8,chili:9,star:10,seed:11}[i.kind]),i.x-camera,i.y,i.w,i.h);
  for(const e of game.enemies)if(!e.dead){
   const track=animation?.get(e),box=spriteBox(e,library.actors[track?.actor],18,18),flip=enemyFacing(e)<0;
   if(enemyActive(e)){if(e.maxHp>1){rect(e.x-camera,box.y-6,e.w,3,'#442927');rect(e.x-camera,box.y-6,e.w*e.hp/e.maxHp,3,'#b6f26e');}if(e.hitFlash>0)text('-1',e.x-camera,box.y-9,'#ffffff');else if(enemyShelled(e))text(e.state==='shell'&&e.timer>=8?'醒转':e.state==='rolling'?'昏厥·滑行':'昏厥·护壳',e.x-camera-2,box.y-9,'#d9ebbe');}
   if(e.kind==='trap'){
    const stage=trapStage(e),elapsed=stage.name==='rumble'?stage.elapsed:stage.name==='emerge'?.6:stage.name==='retract'?.6*(1-stage.elapsed/stage.duration):0;
    animated({actor:'TRAP_SOIL',clip:'rumble',elapsed},e.x+e.w/2-camera-16,e.y+e.h-20,32,20);
    if(['hidden','rumble'].includes(stage.name))continue;
    const height=library.actors.E08?.presentation?.targetHeight||24,lift=height*(stage.name==='emerge'?1-stage.elapsed/stage.duration:stage.name==='retract'?stage.elapsed/stage.duration:0);
    ctx.save();ctx.beginPath();ctx.rect(box.x-camera-4,box.y-4,box.w+8,e.y+e.h-box.y+4);ctx.clip();
    if(!animated(track,box.x-camera,box.y+lift,box.w,box.h,flip))sprite('E08-1',box.x-camera,box.y+lift,box.w,box.h,flip);
    ctx.restore();if(e.warning)text('!',e.x-camera,e.y-5);continue;
   }
   if(e.kind==='leaper'&&e.leapPhase==='wait'){animated({actor:'FX01',clip:'splash',elapsed:e.leapTimer||0},e.x-camera-4,e.y+e.h-5,22,10);text('!',e.x-camera+4,e.y-3,'#ffd472');continue;}
   if(e.kind==='cloud'&&e.warning&&Number.isFinite(e.dropX)){rect(e.dropX-camera-10,205,22,2,'#ffd472');text('↓',e.dropX-camera-4,200,'#ffd472');}
   if(track?.clip==='hidden')continue;if(animated(track,box.x-camera,box.y,box.w,box.h,flip)){if(e.warning||e.aiWarning||e.state==='shell'&&e.timer>=8)text('!',e.x-camera,e.y-5);continue;}
   const walk=Math.floor(game.time*7)%2;
   let art=e.kind==='mushroom'?'objects-'+walk:e.kind==='cabbage'?'objects-'+(e.state==='walk'?(walk?4:3):e.state==='rolling'?6:5):ENEMY_ART[e.kind]+'-1';
   sprite(art,e.x-camera-2,e.y-2,18,18,flip);
   if(e.state==='shell'||e.state==='rolling'){ctx.strokeStyle=e.kind==='walnut'?'#e8ba82':'#b4eb75';ctx.strokeRect(e.x-camera,e.y+6,14,8);if(e.timer>8)text('!',e.x-camera,e.y-4);}
   if(e.warning||e.aiWarning)text('!',e.x-camera,e.y-5);
  }
  for(const g of animation?.ghosts||[]){const box=spriteBox(g,library.actors[g.actor],18,18);animated({...g},box.x-camera,box.y,box.w,box.h,g.flip);}
  if(boss){const f=boss.dead?5:boss.phase==='windup'?2:boss.phase==='attack'?3:boss.phase==='expose'?4:1;if(!animated(animation?.get('boss'),boss.x-camera-4,boss.y-8,40,40,boss.kind!==7&&boss.direction<0))sprite(boss.id+'-'+f,boss.x-camera-4,boss.y-8,40,40,boss.direction>0);
   if(boss.active&&!boss.dead){const hudScale=Math.min(1,(width-8)/256);ctx.save();ctx.translate((width-256*hudScale)/2,16);ctx.scale(hudScale,hudScale);rect(14,10,228,19,'#15251edd');text(boss.name+' '+boss.hp+'/'+boss.maxHp+(bossEnraged(boss)?' 狂暴':'')+(bossVulnerable(boss)?' · 弱点开放':' · 护甲保护'),20,23);rect(16,27,224,2,'#4c2929');rect(16,27,224*boss.hp/boss.maxHp,2,bossEnraged(boss)?'#ff835f':'#b6f26e');
    if(['windup','attack','expose'].includes(boss.phase)){
     const weak=bossVulnerable(boss),cue=bossCue(boss);rect(14,31,228,29,weak?'#124c30e6':'#4c2119e6');
     sprite(weak?'boss-cue-weak':cue.asset,17,33,24,24);text(weak?'弱点开放：踩头 / 火弹':cue.hint,45,42,weak?'#baff82':'#ffe3a0');
     if(weak){const remain=Math.max(0,exposeDuration(boss)-boss.timer);text('弱点 '+remain.toFixed(1)+' 秒',45,53,'#ffffff');rect(112,50,124*remain/exposeDuration(boss),3,'#a8ff69');sprite('boss-cue-weak',boss.x-camera,boss.y-34,28,28);}
     else text(boss.phase==='windup'?'即将攻击，提前换位':'攻击进行中',45,54,'#f9c394');
    }
    ctx.restore();
    if(boss.phase==='windup'){text(boss.kind===1?({dislodge:'追击高台',flank:'绕后跳扑',suppress:'抛射压制'}[boss.intent]||bossSkillName(boss)):bossSkillName(boss),boss.x-camera-2,boss.y-14,'#ffd472');if(boss.kind!==1||boss.pattern==='hop')rect((boss.targetX||boss.x)-camera,(boss.targetFloor||208)-4,boss.kind===1?boss.w:16,3,'#ffb272');if(boss.kind===1&&boss.pattern==='dash')rect(Math.min(boss.x,boss.targetX)-camera,202,Math.abs(boss.targetX-boss.x)+boss.w,4,'#f8aa58');if(boss.kind===1&&boss.pattern==='seeds')for(let i=1;i<=7;i++){const t=i*.1;rect(boss.x+16+boss.seedVX*t-camera,boss.y+12+boss.seedVY*t+130*t*t,2,2,'#ffd588');}}
    if(boss.kind===7)text(boss.head?'右头行动':'左头行动',14,70);
    if(bossVulnerable(boss)){const hit=bossHitbox(boss),top=bossWeakTop(game,boss);rect(hit.x-camera+2,top-3,hit.w-4,3,'#8dffb2');text('↓',hit.x-camera+hit.w/2-4,top-6,'#a6ffc8');}if(boss.hitFlash>0)text('-1',boss.x-camera,boss.y-9,'#fff4b1');else if(boss.blockFlash>0)text('护甲',boss.x-camera,boss.y-9,'#ffd28b');
   }
  }
  for(const d of game.dangers){if(d.delay>0){text('!',d.x-camera,d.kind==='rock'?190:d.y,'#ffd472');continue;}if(['thorn','plant-seed'].includes(d.kind)){ctx.save();ctx.translate(Math.round(d.x+d.w/2-camera),Math.round(d.y+d.h/2));ctx.rotate(Math.atan2(d.vy,d.vx));sprite(d.kind==='thorn'?'projectile-thorn':'projectile-pea',-6,-4,12,8);ctx.restore();continue;}const clip=d.kind==='wave'||d.kind==='sweep'?'wave':d.kind==='burst'&&d.exploded?'burst':'seed',elapsed=clip==='burst'?Math.max(0,.6-d.life):animation?.time||game.time;if(d.kind!=='rock'&&animated({actor:'FX01',clip,elapsed},d.x-camera-2,d.y-2,d.w+4,d.h+4,d.vx<0))continue;rect(d.x-camera,d.y,d.w,d.h,d.kind==='rock'?'#c6917a':'#fb805c');rect(d.x-camera+1,d.y+1,Math.max(1,d.w-2),2,'#ffe6a1');}
  for(const s of game.shots)if(!animated({actor:'FX01',clip:'fire',elapsed:3-s.life},s.x-camera-2,s.y-2,8,8,s.vx<0)){rect(s.x-camera,s.y,4,4,'#ffe66b');rect(s.x-camera+1,s.y+1,2,2,'#ed6438');}
  let frame=p.form*4+(p.grounded?(Math.abs(p.vx)>4?1+Math.floor(game.time*10)%2:0):3);if(p.form===2&&p.shotCooldown>.12)frame=14;if(p.crouch)frame=p.form===2?8:13;if(game.mode==='dead')frame=12;if(game.mode==='won')frame=15;
  const ph=p.form?32:20,box=playerBox(p,library.actors['P01-'+p.form],p.form?16:20,ph);if(p.hurt<=0||Math.floor(game.time*12)%2===0){if(!animated(animation?.get(p),box.x-camera,box.y,box.w,box.h,p.facing<0))sprite('hero-'+frame,box.x-camera,box.y,box.w,box.h,p.facing<0);}
  for(const e of animation?.effects||[])animated({actor:'FX01',clip:e.kind,elapsed:e.elapsed},e.x-camera-6,e.y-18,24,24);
  if(p.star>0){const aura=shieldBox(p);ctx.save();ctx.globalAlpha=p.star<2?.65+.25*Math.sin(game.time*8):.9;animated({actor:'SHIELD',clip:'aura',elapsed:10-p.star},aura.x-camera,aura.y,aura.w,aura.h);ctx.restore();}
  if(game.rewardNotice?.until>game.time)text(game.rewardNotice.text,p.x-camera-12,p.y-12,'#dbff9e');
  if(!l.warpRoom){sprite('W'+world+'-special-exit',l.exit-camera-4,160,24,48);if(!boss||boss.dead)text('出口',l.exit-camera-4,154);}
  if(l.id==='1-1'&&!animated(animation?.get('N01'),64-camera,190,18,18))sprite('N01-1',64-camera,190,18,18);if(l.id==='8-4'&&boss?.dead&&!animated(animation?.get('N02'),l.exit-camera-24,190,18,18))sprite('N02-1',l.exit-camera-24,190,18,18);
 };
}
