import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateBoss,hurtBoss,exposeDuration} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {BOSS_HEALTH,BOSS_SKILLS,bossTiming,bossEnraged} from '../../public/games/veggie-adventure/js/core/boss-balance.mjs';
import {bossClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';

function encounter(world,rage=false){const g=new Game(levelById(`${world}-4`)),b=g.boss;g.p.x=b.left+12;g.p.y=194;g.p.star=999;g.enemies=[];g.items=[];if(rage)b.hp=Math.ceil(b.maxHp/3);return g;}
function observeEncounter(g,seconds){
 const b=g.boss,casts=[],cues=[];let cycle=b.cycle,phase=b.phase,cueStart=null;
 for(let n=0;n<seconds/STEP;n++){
  g.step(STEP);
  if(b.phase==='windup'&&phase!=='windup')cueStart=g.time;
  if(b.cycle!==cycle){assert.notEqual(cueStart,null);casts.push({time:g.time,skill:b.pattern});cues.push(g.time-cueStart);cycle=b.cycle;}
  assert.equal(g.mode,'playing');assert.ok(b.x>=b.left&&b.x+b.w<=b.right);phase=b.phase;
 }
 return {casts,cues};
}

test('eight authored bosses and generated profiles use the increased HP and can still be defeated by base-form stomps',()=>{
 assert.deepEqual(BOSS_HEALTH,[6,7,8,8,9,10,10,12]);
 for(let world=1;world<=8;world++){
  const l=levelById(`${world}-4`),g=new Game(l),b=g.boss;assert.equal(l.boss.hp,BOSS_HEALTH[world-1]);assert.equal(b.hp,b.maxHp);b.active=true;
  for(let hp=b.maxHp;hp>0;hp--){Object.assign(b,{phase:'expose',timer:0});assert.equal(hurtBoss(g,'stomp'),true);assert.equal(b.hp,hp-1);assert.equal(g.p.form,0);}
  assert.ok(b.dead);assert.equal(hurtBoss(g,'stomp'),false);
 }
 const generator=fs.readFileSync('tools/veggie-adventure/build-levels.cjs','utf8');assert.match(generator,/await import\('.*boss-balance\.mjs'\)/);assert.match(generator,/hp:BOSS_HEALTH\[world-1\]/);
});

test('one-minute real simulations rotate skills, respect every cooldown and signal attacks before release',()=>{
 // Wider arenas add distance-based counterattack time; keep a measurable active rhythm.
 const minima=[10,10,11,11,10,10,10,11];
 for(let world=1;world<=8;world++){
  const g=encounter(world),b=g.boss,{casts,cues}=observeEncounter(g,60);assert.ok(casts.length>=minima[world-1],`${b.id}: ${casts.length} releases`);assert.equal(b.hp,b.maxHp);
  assert.ok(new Set(casts.map(c=>c.skill)).size>=2,b.id+' must rotate');assert.ok(cues.every(t=>t>=bossTiming(b).windup-STEP-1e-6),b.id+' missing cue');
  const previous=new Map();for(const cast of casts){const definition=BOSS_SKILLS[world][cast.skill];assert.ok(definition);if(previous.has(cast.skill))assert.ok(cast.time-previous.get(cast.skill)>=definition.cooldown-STEP-1e-6,`${b.id}/${cast.skill} bypassed cooldown`);previous.set(cast.skill,cast.time);}
 }
});

test('the last third of HP shortens pacing while keeping telegraphs and never reduces release frequency',()=>{
 for(let world=1;world<=8;world++){
  const normal=encounter(world),rage=encounter(world,true);assert.ok(bossEnraged(rage.boss));assert.ok(!bossEnraged(normal.boss));
  assert.ok(bossTiming(rage.boss).idle<bossTiming(normal.boss).idle);assert.ok(bossTiming(rage.boss).windup>=.55);assert.ok(bossTiming(rage.boss).recover>0);
  const a=observeEncounter(normal,60),b=observeEncounter(rage,60);assert.ok(b.casts.length>=a.casts.length,`B0${world} rage reduced frequency`);assert.ok(b.cues.every(t=>t>=.55-STEP-1e-6));
 }
});

test('all skills cooling down waits safely, chooses another ready skill, and resumes when a timer ends',()=>{
 for(let world=1;world<=8;world++){
  const g=encounter(world),b=g.boss;Object.assign(b,{active:true,phase:'idle',timer:10});g.damage=()=>{};
  for(const [key,skill] of Object.entries(BOSS_SKILLS[world]))b.skillCooldowns[key]=skill.cooldown;
  for(let i=0;i<120;i++)updateBoss(g,STEP,208);
  assert.equal(b.phase,'idle');assert.equal(b.cycle,0);assert.equal(b.intent,'cooldown');
  const available=Object.keys(BOSS_SKILLS[world]).at(-1);b.skillCooldowns[available]=0;
  updateBoss(g,STEP,208);assert.equal(b.phase,'windup');assert.equal(b.pattern,available);
  // The clock is started at release, not at the earlier cue.
  assert.equal(b.skillCooldowns[available],0);
  for(let i=0;i<240&&b.phase==='windup';i++)updateBoss(g,STEP,208);
  assert.equal(b.cycle,1);assert.equal(b.phase,'attack');assert.ok(Math.abs(b.skillCooldowns[available]-BOSS_SKILLS[world][available].cooldown)<1e-8);
 }
});

test('checkpoints preserve damage and cooldowns, legacy HP migrates once and invalid cooldowns are rejected',()=>{
 for(let world=1;world<=8;world++){
  const g=new Game(levelById(`${world}-4`)),b=g.boss;const key=Object.keys(BOSS_SKILLS[world])[0];Object.assign(b,{active:true,phase:'expose',timer:0});hurtBoss(g,'stomp');b.skillCooldowns[key]=2.25;g.saveCheckpoint();
  let saved=decodeSave(encodeSave(g));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();assert.equal(g.boss.hp,g.boss.maxHp-1);assert.equal(g.boss.skillCooldowns[key],2.25);g.restore();assert.equal(g.boss.hp,g.boss.maxHp-1);
  const legacy=JSON.parse(encodeSave(g)),old=legacy.checkpoint.boss;delete old.balanceVersion;delete old.maxHp;delete old.skillCooldowns;old.hp=2;
  saved=decodeSave(JSON.stringify(legacy));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();assert.equal(g.boss.hp,BOSS_HEALTH[world-1]-1);g.saveCheckpoint();g.restore();assert.equal(g.boss.hp,BOSS_HEALTH[world-1]-1);
  old.hp=0;old.dead=true;old.phase='defeated';saved=decodeSave(JSON.stringify(legacy));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();assert.ok(g.boss.dead);assert.equal(g.boss.hp,0);g.saveCheckpoint();
  for(const value of [-1,999,'2']){const bad=JSON.parse(encodeSave(g));bad.checkpoint.boss.skillCooldowns[key]=value;assert.equal(decodeSave(JSON.stringify(bad)),null);}
  const bad=JSON.parse(encodeSave(g));bad.checkpoint.boss.skillCooldowns.unknown=1;assert.equal(decodeSave(JSON.stringify(bad)),null);
 }
});

test('new variants use valid existing animation clips and keep platform-climbing counterplay time',()=>{
 const actors=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).animations.actors;
 for(let world=1;world<=8;world++)for(const pattern of Object.keys(BOSS_SKILLS[world]))for(const timer of [.1,.55,1]){
  const g=encounter(world),b=g.boss;Object.assign(b,{phase:'attack',pattern,timer});assert.ok(actors[b.id].clips[bossClip(b)],`${b.id}/${pattern}`);
 }
 const g=encounter(1,true),b=g.boss,arenaX=x=>b.left+x-1424;Object.assign(b,{active:true,phase:'attack',pattern:'hop',timer:1.1,startX:arenaX(1586),startY:176,targetX:arenaX(1664),targetY:144});g.p.x=arenaX(1570);g.p.y=146;
 updateBoss(g,STEP,160);assert.equal(b.phase,'expose');assert.ok(exposeDuration(b)>=3.4);assert.equal(bossClip({kind:3,hp:8,phase:'attack',pattern:'dash',timer:.1}),'dash');
});
