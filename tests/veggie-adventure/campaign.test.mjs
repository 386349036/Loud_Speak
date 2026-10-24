import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LEVELS,levelById,nextLevel} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {updateBoss,hurtBoss} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {hazardShapes,updateEnvironment,updateDangers} from '../../public/games/veggie-adventure/js/core/environment.mjs';
const tick=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(STEP,input);};
const flat=()=>{const g=new Game();g.level.platforms=[{x:0,y:208,w:1536,h:32}];g.enemies=[];g.blocks=[];g.items=[];return g;};
const actor=kind=>({id:0,x:100,y:194,w:14,h:14,kind,vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false});
test('32 ordered independent maps, all resource references and safe spawn/checkpoint/exit ground',()=>{
 assert.equal(LEVELS.length,32);const art=new Set(JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).assets.map(a=>a.id));
 for(let i=0;i<32;i++){const l=LEVELS[i];assert.equal(l.id,(Math.floor(i/4)+1)+'-'+(i%4+1));const g=new Game(l);assert.ok(!g.solids().some(s=>overlap(g.p,s)),l.id+' spawn');
  for(const x of [l.spawn.x,l.checkpoint,l.exit])assert.ok(l.platforms.some(s=>s.x<=x&&s.x+s.w>=x+12&&s.y>=176),l.id+' floor '+x);
  for(const b of [...l.platforms,...l.blocks,...l.items,...l.enemies]){assert.ok(['x','y','w','h'].every(k=>Number.isFinite(b[k])),l.id);assert.ok(b.w>0&&b.h>0&&b.x>=0&&b.x+b.w<=l.width,l.id);}
  if(l.background)assert.ok(art.has(l.background),l.id);if(l.mid)assert.ok(art.has(l.mid),l.id);if(l.terrain)assert.ok(art.has(l.terrain+'-0'),l.id);
  assert.ok(decodeSave(encodeSave(g)),l.id+' save');
 }
 assert.equal(LEVELS.filter(l=>l.boss).length,8);assert.equal(nextLevel('8-4'),null);
 assert.equal(new Set(LEVELS.map(l=>JSON.stringify(l.platforms)+JSON.stringify(l.enemies))).size,32);
});
test('campaign advances all 32 exits, carries score/form, restores completed campaign and ends once',()=>{
 const c=new Campaign();assert.equal(c.advance(),false);
 for(let i=0;i<32;i++){const g=c.game;g.p.form=2;g.score=1000+i;g.p.x=g.level.exit;if(g.boss)g.boss.dead=true;g.step(STEP);assert.equal(g.mode,'won',g.level.id);const score=g.score;c.finish();assert.equal(c.completed.size,i+1);const saved=decodeSave(encodeSave(g,[...c.completed]));assert.ok(saved);const restored=new Campaign();restored.restore(saved);assert.equal(restored.game.mode,'won');assert.equal(restored.game.score,score);assert.equal(restored.game.p.form,2);assert.equal(c.advance(),i<31);if(i<31){assert.equal(c.game.score,score);assert.equal(c.game.p.form,2);}}
 assert.equal(c.completed.size,32);assert.equal(c.game.level.id,'8-4');assert.equal(c.advance(),false);
});
test('grown player crawls through low root tunnel without standing into roof',()=>{const g=new Game(levelById('2-1'));g.enemies=[];g.p.x=240;g.p.y=194;g.collect('carrot');tick(g,600,{right:true,down:true});assert.ok(g.p.x>384);assert.equal(g.p.h,14);});
test('underwater swimming rises, fish cannot be stomped, and air leaper can',()=>{const g=new Game(levelById('4-2'));g.p.x=200;g.p.y=160;g.enemies=[];tick(g,40,{jump:true});assert.ok(g.p.y<140);assert.ok(g.p.inWater);const a=actor('fish');g.enemies=[a];g.p.x=100;g.p.y=181;g.p.vy=20;g.p.inWater=true;updateEnemies(g,STEP,194);assert.ok(!a.dead);assert.equal(g.mode,'dead');const s=flat();s.p.x=100;s.p.y=181;s.p.vy=20;const e=actor('leaper');s.enemies=[e];updateEnemies(s,STEP,194);assert.ok(e.dead);});
test('moving platforms carry rider, crumble restores and crushing ignores star',()=>{const g=new Game(levelById('3-2'));const m=g.movers[0];g.p.x=m.x+8;g.p.y=m.y-14;g.p.grounded=true;const x=g.p.x;g.time=.1;updateEnvironment(g,.1);assert.ok(g.p.x>x);const c=new Game(levelById('5-2')),p=c.movers.find(m=>m.kind==='crumble');c.p.x=p.x+4;c.p.y=p.y-14;c.p.grounded=true;updateEnvironment(c,.9);assert.ok(p.fallen);updateEnvironment(c,4);assert.ok(!p.fallen);const k=flat();k.movers=[{x:40,y:194,w:32,h:8,baseX:40,baseY:194,kind:'lift',axis:'y',range:24,period:4}];k.p.x=44;k.p.y=180;k.p.grounded=true;k.p.star=10;k.blocks=[{x:40,y:144,w:32,h:24,kind:'brick'}];k.time=1;updateEnvironment(k,1);assert.equal(k.mode,'dead');});
test('heat has warning/rest phases and is fatal even with star; spikes respect temporary immunity',()=>{const g=new Game(levelById('6-1'));const h=g.level.hazards[0];g.time=.1-(h.offset||0);assert.ok(hazardShapes(g)[0].warning);g.time=1-(h.offset||0);assert.ok(hazardShapes(g)[0].active);g.p.x=h.x;g.p.y=h.y;g.p.star=10;updateDangers(g,STEP);assert.equal(g.mode,'dead');g.time=3-(h.offset||0);assert.ok(!hazardShapes(g)[0].active);});
test('walnut/bolt resist fire, spike cannot be stomped, winged becomes cabbage',()=>{for(const kind of ['walnut','bolt']){const g=flat();g.p.x=20;g.enemies=[actor(kind)];g.shots=[{x:100,y:194,w:4,h:4,vx:0,vy:0,life:1}];g.step(STEP);assert.ok(!g.enemies[0].dead);}const g=flat();g.p.x=100;g.p.y=181;g.p.vy=20;g.enemies=[actor('spike')];updateEnemies(g,STEP,194);assert.equal(g.mode,'dead');const a=flat();a.p.x=100;a.p.y=181;a.p.vy=20;a.enemies=[actor('winged')];updateEnemies(a,STEP,194);assert.equal(a.enemies[0].kind,'cabbage');});
test('rolling shell opens gate and defeats fireproof walnut',()=>{const g=flat();g.p.x=20;g.gates=[{x:120,y:176,w:16,h:32,open:false}];g.enemies=[{...actor('cabbage'),x:104,state:'rolling',vx:150}, {...actor('walnut'),x:100,id:1}];tick(g,20);assert.ok(g.gates[0].open);assert.ok(g.enemies[1].dead);});
test('turret suppresses near fire, signals before shooting; cloud has three-child cap',()=>{const g=flat();g.turrets=[{x:100,y:176,w:16,h:32,cooldown:0,windup:0}];g.p.x=100;updateEnvironment(g,1);assert.equal(g.enemies.length,0);g.p.x=30;updateEnvironment(g,.4);assert.equal(g.enemies.length,0);assert.ok(g.turrets[0].windup>0);updateEnvironment(g,.3);assert.equal(g.enemies[0].kind,'bolt');const c=flat();c.p.x=20;const e={...actor('cloud'),x:120,y:50,cooldown:0};c.enemies=[e];for(let i=0;i<6;i++){e.cooldown=0;updateEnemies(c,STEP,0);}assert.equal(c.enemies.filter(v=>v.parent===0).length,3);});
for(let world=1;world<=8;world++)test('boss '+world+' telegraph, weakness window, one HP per opening and entrance rollback',()=>{
 const g=new Game(levelById(world+'-4'));g.p.x=g.boss.left;g.p.y=194;g.p.star=999;g.checkpointReached=true;g.saveCheckpoint();const b=g.boss;
 for(let i=0;i<120;i++)updateBoss(g,STEP,208);assert.ok(b.active);assert.equal(b.hp,3);assert.equal(hurtBoss(g,'stomp'),false);
 let warn=0,seen=false;for(let i=0;i<700;i++){if(b.phase==='windup')warn+=STEP;updateBoss(g,STEP,208);if(b.phase==='expose'){seen=true;break;}}
 assert.ok(seen);assert.ok(warn>=.74);assert.equal(b.hp,3);assert.ok(hurtBoss(g,'fire'));assert.equal(b.hp,3);hurtBoss(g,'fire');assert.equal(b.hp,3);hurtBoss(g,'fire');assert.equal(b.hp,2);assert.equal(hurtBoss(g,'stomp'),false);
 g.restore();assert.equal(g.boss.hp,3);assert.equal(g.boss.active,false);assert.equal(g.dangers.length,0);assert.equal(g.p.star,0);
 for(let hp=3;hp>0;hp--){Object.assign(g.boss,{active:true,phase:'expose',timer:0,invulnerable:0});assert.ok(hurtBoss(g,'stomp'));assert.equal(g.boss.hp,hp-1);}assert.ok(g.boss.dead);g.p.x=g.level.exit;g.step(STEP);assert.equal(g.mode,'won');
});
test('closed boss blocks exit; open-window partial fire hits reset and star cannot auto-kill',()=>{const g=new Game(levelById('8-4'));g.p.x=g.level.exit;g.p.star=10;g.step(STEP);assert.equal(g.mode,'playing');assert.equal(g.boss.hp,3);Object.assign(g.boss,{phase:'expose',timer:1.99,hits:2});updateBoss(g,.02,0);assert.equal(g.boss.hits,0);assert.equal(g.boss.phase,'recover');});
test('checkpoint restores moving terrain, gates, enemy projectiles and timers',()=>{const g=new Game(levelById('5-3'));g.saveCheckpoint();g.gates[0].open=true;g.time=20;g.dangers.push({x:1});g.restore();assert.ok(!g.gates[0].open);assert.equal(g.time,0);assert.equal(g.dangers.length,0);});
test('campaign save rejects other-level shapes, malformed boss and NaN-like fields',()=>{const g=new Game(levelById('2-4'));let d=JSON.parse(encodeSave(g));d.checkpoint.boss.hp=99;assert.equal(decodeSave(JSON.stringify(d)),null);d=JSON.parse(encodeSave(g));d.level='2-1';assert.equal(decodeSave(JSON.stringify(d)),null);d=JSON.parse(encodeSave(g));d.completed=['9-9'];assert.equal(decodeSave(JSON.stringify(d)),null);});
test('basic running jump physically reaches every exposed boss head without a power-up',()=>{
 for(let world=1;world<=8;world++){const g=new Game(levelById(world+'-4')),b=g.boss;g.level.platforms=[{x:0,y:208,w:g.level.width,h:32}];g.level.water=[];g.level.hazards=[];g.movers=[];g.blocks=[];g.enemies=[];g.turrets=[];g.items=[];
  Object.assign(b,{active:true,phase:'expose',timer:0,y:176,head:0});g.p.x=b.x-48;g.p.y=194;g.p.grounded=true;g.p.vx=112;
  for(let i=0;i<80&&b.hp===3&&g.mode==='playing';i++)g.step(STEP,{right:true,run:true,jump:true,jumpPressed:i===0});
  assert.equal(b.hp,2,'boss '+world);assert.equal(g.mode,'playing','boss '+world);assert.equal(g.p.form,0);
 }
});
