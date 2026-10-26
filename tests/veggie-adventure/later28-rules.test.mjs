import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {auditCampaignLevel,repairCampaignLevel,nearPit,hazardEnvelope} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
const beforeBoss=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-boss-halving-layouts.json',import.meta.url)));
const reportedLevel=id=>beforeBoss.find(l=>l.id===id)||LEVELS.find(l=>l.id===id);

test('all later 28 maps leave pit buffers clear of bricks, patrols, turrets and complete hazard sweeps',()=>{
 const later=LEVELS.filter(l=>l.world>=2);assert.equal(later.length,28);
 for(const l of later){assert.deepEqual(auditCampaignLevel(l),[],l.id);const clone=structuredClone(l);assert.deepEqual(repairCampaignLevel(clone),[],l.id+' must be idempotent');assert.deepEqual(clone,l);}
});

test('reproduced low ceilings and hazard overlaps are repaired without removing objects or changing progression',()=>{
 const report=JSON.parse(fs.readFileSync('docs/veggie-adventure/LATER28_RULE_REVIEW.json'));
 for(const row of report.levels){const l=structuredClone(reportedLevel(row.id)),counts=['blocks','items','enemies','hazards','turrets'].map(k=>l[k].length);
  for(const change of [...row.changes].reverse()){const a=l[change.type][change.index];for(const key of Object.keys(change.after))delete a[key];Object.assign(a,change.before);if(change.type==='enemies')a.homeX=a.x;}
  if(row.changes.length){assert.ok(auditCampaignLevel(l).length,row.id);assert.ok(repairCampaignLevel(l).length);assert.deepEqual(auditCampaignLevel(l),[],row.id);}
  assert.deepEqual(['blocks','items','enemies','hazards','turrets'].map(k=>l[k].length),counts);
 }
});

test('relocated patrols keep their actual scaled bodies outside pit buffers during AI movement',()=>{
 const report=JSON.parse(fs.readFileSync('docs/veggie-adventure/LATER28_RULE_REVIEW.json'));
 for(const row of report.levels)for(const fix of row.changes.filter(c=>c.type==='enemies'))for(const form of [0,1,2]){
  const g=new Game(reportedLevel(row.id),{form}),e=g.enemies[fix.index];g.enemies=[e];g.damage=()=>{};
  g.p.x=e.x-96;g.p.y=208-g.p.h;for(let frame=0;frame<120*10;frame++){
   g.time+=STEP;updateEnemies(g,STEP,0);assert.equal(nearPit(g.level,e),false,row.id+'/'+e.kind);assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)),row.id+' embedded');
  }
 }
});

test('chain audit includes the entire rotating radius rather than only the visible anchor',()=>{
 const l={platforms:[{x:0,w:400},{x:448,w:400}]},h={kind:'chain',x:250,y:176,w:8,h:8,radius:24};
 assert.equal(nearPit(l,h),false);assert.equal(nearPit(l,hazardEnvelope(h)),true);
});
