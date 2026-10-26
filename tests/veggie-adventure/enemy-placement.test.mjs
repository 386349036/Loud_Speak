import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {repairGroundSpawn} from '../../tools/veggie-adventure/encounter-placement.mjs';

test('all configured enemy collision bodies start outside solid terrain, including scaled traps and pond plants',()=>{
 let checked=0;for(const level of LEVELS){const g=new Game(level),solids=g.solids().filter(s=>!s.oneWay);
  for(const e of g.enemies){assert.ok(!solids.some(s=>overlap(e,s)),`${level.id}/${e.id}/${e.kind} starts inside terrain`);checked++;}
 }assert.equal(checked,LEVELS.reduce((sum,l)=>sum+l.enemies.length,0));assert.ok(checked>200);
});

test('repaired ground enemies can actually patrol without entering the bricks in every player form',()=>{
 for(const [id,enemyId] of [['2-2',0],['8-1',0],['8-3',1]])for(const form of [0,1,2]){
  const g=new Game(levelById(id),{form}),e=g.enemies.find(e=>e.id===enemyId);g.enemies=[e];g.items=[];g.damage=()=>{};g.p.x=e.x-128;g.p.y=208-g.p.h;
  let low=e.x,high=e.x;for(let n=0;n<120*10;n++){
   g.time+=STEP;updateEnemies(g,STEP,0);low=Math.min(low,e.x);high=Math.max(high,e.x);
   assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)),`${id}/${form} entered terrain at ${e.x}`);
   assert.ok(!e.dead);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');
  }assert.ok(high-low>=16,`${id}/${form} remains stuck at its starting point`);
 }
});

test('the map-building placement repair handles each reproduced overlap and is idempotent afterwards',()=>{
 const report=JSON.parse(fs.readFileSync('docs/veggie-adventure/ENCOUNTER_SPAWN_FIXES.json'));
 for(const row of report.results){const l=structuredClone(levelById(row.level));for(const fix of row.fixes){const e=l.enemies.find(e=>e.id===fix.id);Object.assign(e,fix.before);e.homeX=e.x;
  const result=repairGroundSpawn(l,e);assert.ok(result);assert.ok(![...l.platforms,...l.blocks].some(s=>overlap(e,s)));assert.equal(e.homeX,e.x);assert.ok(e.patrolLeft<e.x&&e.x+e.w<e.patrolRight);
  assert.equal(repairGroundSpawn(l,e),null);
 }}
 const first=structuredClone(LEVELS[0]),before=structuredClone(first);for(const e of first.enemies)assert.equal(repairGroundSpawn(first,e),null);assert.deepEqual(first,before);
});
