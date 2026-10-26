import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {prepareTrap,trapStage} from '../../public/games/veggie-adventure/js/core/trap-profile.mjs';
import {updateEnemies,enemyActive} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {AnimationPlayer} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
import {spriteBox} from '../../public/games/veggie-adventure/js/core/sprite-layout.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
const level=LEVELS.find(l=>l.id==='1-2'),manifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
function scene(form=0){const g=new Game(level,{form});g.enemies=g.enemies.filter(e=>e.kind==='trap');g.p.x=g.enemies[0].x-80;g.p.y=208-g.p.h;return g;}

test('all configured planted traps grow exactly 1.5 times once, keeping ground and center anchors',()=>{
 let count=0;
 for(const l of LEVELS){const g=new Game(l);for(const source of l.enemies.filter(e=>e.kind==='trap')){
  const e=g.enemies.find(e=>e.id===source.id);count++;assert.equal(e.w,source.w*1.5);assert.equal(e.h,source.h*1.5);
  assert.equal(e.x+e.w/2,source.x+source.w/2);assert.equal(e.y+e.h,source.y+source.h);assert.ok(!g.solids().some(s=>overlap(e,s)));
  const before=structuredClone(e);prepareTrap(e);assert.deepEqual(e,before);assert.equal(enemyActive(e),false);
  const box=spriteBox(e,manifest.animations.actors.E08,18,18);assert.equal(box.y+box.h,e.y+e.h);
  assert.equal(manifest.animations.actors.E08.presentation.targetHeight,24);
 }}assert.equal(count,LEVELS.reduce((n,l)=>n+l.enemies.filter(e=>e.kind==='trap').length,0));assert.ok(count>=5);
});

test('buried soil, rumble, emergence, danger and retraction occur in order with a full one-second warning',()=>{
 const g=scene(),e=g.enemies[0],stages=[];g.p.x=e.x-200;let warning=0;
 for(let n=0;n<120*3.6;n++){
  updateEnemies(g,STEP,208);const stage=trapStage(e).name;
  if(stages.at(-1)!==stage)stages.push(stage);
  if(['rumble','emerge'].includes(stage)){warning+=STEP;assert.equal(enemyActive(e),false);}
  if(stage==='idle')assert.equal(enemyActive(e),true);
  if(['hidden','retract'].includes(stage))assert.equal(enemyActive(e),false);
 }
 assert.deepEqual(stages,['hidden','rumble','emerge','idle','retract','hidden']);assert.ok(warning>=.99);
});

test('overlapping every hero form during soil warning or emergence is harmless, exposed contact still hurts',()=>{
 for(const form of [0,1,2]){
  const g=scene(form),e=g.enemies[0];g.p.x=e.x+e.w/2-g.p.w/2;
  for(const phase of [.95,1.55,3.3]){e.phase=phase;updateEnemies(g,STEP,208);assert.equal(g.mode,'playing');assert.equal(g.p.form,form);assert.equal(enemyActive(e),false);}
  e.phase=2;updateEnemies(g,STEP,208);assert.equal(enemyActive(e),true);assert.equal(form?g.p.form:g.mode,form?0:'dead');
 }
});

test('hidden soil is rendered before the plant, and the warning advances all four generated PNG frames',()=>{
 const g=scene(),e=g.enemies[0],animation=new AnimationPlayer(),images=new Map(manifest.assets.map(a=>[a.id,{id:a.id}])),calls=[];
 const ctx=new Proxy({drawImage(image,...args){if(['anim-TRAP_SOIL','anim-E08'].includes(image.id))calls.push({id:image.id,args});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const draw=createRenderer({getContext:()=>ctx},images,animation,{actors:manifest.animations.actors});
 for(const [phase,frame] of [[0,0],[.81,0],[.97,1],[1.12,2],[1.28,3]]){
  e.phase=phase;prepareTrap(e);animation.update(g,0);calls.length=0;draw(g);
  assert.equal(calls.length,1);assert.equal(calls[0].id,'anim-TRAP_SOIL');assert.equal(calls[0].args[0],frame*64);
 }
 e.phase=1.5;prepareTrap(e);animation.update(g,0);calls.length=0;draw(g);assert.deepEqual(calls.map(c=>c.id),['anim-TRAP_SOIL','anim-E08']);
});

test('new checkpoints do not repeatedly enlarge traps; legacy checkpoints restart with a visible safe mound',()=>{
 const g=new Game(level),e=g.enemies.find(e=>e.kind==='trap');e.phase=2;g.saveCheckpoint();const data=decodeSave(encodeSave(g));assert.ok(data);
 for(let n=0;n<3;n++){g.checkpoint=structuredClone(data.checkpoint);g.restore();const restored=g.enemies.find(e=>e.kind==='trap');assert.equal(restored.w,21);assert.equal(restored.h,21);assert.equal(restored.phase,2);}
 const legacy=JSON.parse(encodeSave(g));legacy.checkpoint.enemies=structuredClone(level.enemies);legacy.checkpoint.enemies.find(e=>e.kind==='trap').phase=2.8;
 const decoded=decodeSave(JSON.stringify(legacy));assert.ok(decoded);g.checkpoint=decoded.checkpoint;g.restore();const migrated=g.enemies.find(e=>e.kind==='trap');assert.equal(migrated.w,21);assert.equal(migrated.h,21);assert.equal(migrated.y+migrated.h,208);assert.equal(migrated.phase,0);assert.equal(enemyActive(migrated),false);
});
