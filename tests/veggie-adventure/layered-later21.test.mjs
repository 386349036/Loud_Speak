import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {auditCampaignLevel,nearPit} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
import {buildLaterLayeredStage} from '../../tools/veggie-adventure/build-layered-later21.mjs';
import {climbRoute,traverseGround} from '../../tools/veggie-adventure/layered-route-probe.mjs';
import {cameraY} from '../../public/games/veggie-adventure/js/render.mjs';
const originals=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-layered-later21.json',import.meta.url))),later=LEVELS.filter(l=>l.world>=2&&!l.boss);

test('all 21 later ordinary stages add optional upper branches without replacing ground, water or authored mechanisms',()=>{
 assert.equal(later.length,21);assert.equal(later.reduce((n,l)=>n+l.layeredRoutes.length,0),56);
 for(const l of later){const old=originals.find(o=>o.id===l.id);for(const key of ['width','exit','spawn','checkpoint','timeLimit','platforms','water','hazards','movers','turrets','gates','sections'])assert.deepEqual(key==='platforms'?l.platforms.filter(p=>!p.waterBank):l[key],old[key],l.id+'/'+key);
  assert.equal(l.layeredRoutes.length,l.stage===1?2:3);assert.deepEqual(l.enemies.slice(0,old.enemies.length),old.enemies);assert.equal(buildLaterLayeredStage(l),null);assert.deepEqual(auditCampaignLevel(l),[]);assert.ok(l.blocks.length<200&&l.enemies.length<200&&l.items.length<200);assert.ok(decodeSave(encodeSave(new Game(l))));
  for(const r of l.layeredRoutes){assert.equal(r.optional,true);assert.equal(r.floors.length,3);assert.equal(r.floors[0].y-r.floors[1].y,48);assert.equal(r.floors[1].y-r.floors[2].y,48);assert.ok(r.floors[2].y>=48);const e=l.enemies.find(e=>e.id===r.enemyId);assert.ok(e.y+e.h<=128);assert.ok(r.floors.some(f=>f.y===e.y+e.h&&f.x<=e.x&&f.x+f.w>=e.x+e.w));assert.ok(l.blocks.filter(b=>b.route===r.id).every(b=>b.kind==='brick'&&b.breakable&&!nearPit(l,b)));}
  const previous=structuredClone(l.blocks.slice(0,old.blocks.length));for(const a of l.waterBankBlockAdjustments||[])Object.assign(previous[a.index],a.before);for(const r of l.layeredRoutes)for(const a of r.blockAdjustments)Object.assign(previous[a.index],a.before);assert.deepEqual(previous,old.blocks);
 }
 assert.ok(later.some(l=>l.layeredRoutes.some(r=>r.entryMode==='swim-bank')));
});
test('all three forms physically climb all 56 branches without breaking bricks and rejoin the unchanged ground route',()=>{
 for(const l of later)for(const r of l.layeredRoutes)for(const form of [0,1,2]){const result=climbRoute(l,r,form);assert.ok(result.ok,l.id+'/'+r.id+'/'+form+' '+JSON.stringify(result));assert.deepEqual(result.touched,r.floors.map(f=>f.y));assert.equal(result.foot,result.expectedFoot);assert.equal(result.rebirths,3);}
});
test('ground routes remain physically traversable in every form with upper branches intact or destroyed',()=>{
 for(const l of later)for(const form of [0,1,2])for(const destroyed of [false,true]){
  const result=traverseGround(l,form,destroyed);assert.equal(result.mode,'won',`${l.id}/form${form}/destroyed${destroyed} ${JSON.stringify(result)}`);assert.equal(result.rebirths,3);assert.equal(result.form,form);
 }
});
test('all new high enemies use real ledge patrols or ranged attacks and fall when their breakable floors collapse',()=>{
 for(const l of later)for(const r of l.layeredRoutes){const g=new Game(l),e=g.enemies.find(e=>e.id===r.enemyId),floor=r.floors.find(f=>f.y===e.y+e.h);g.enemies=[e];g.items=[];g.damage=()=>{};g.p.x=floor.x+2;g.p.y=floor.y-14;
  let lo=e.x,hi=e.x;for(let n=0;n<600;n++){g.time+=STEP;updateEnemies(g,STEP,0);lo=Math.min(lo,e.x);hi=Math.max(hi,e.x);assert.ok(!e.dead);assert.ok(e.y+e.h<=floor.y+.01,l.id+'/'+r.id+' fell before destruction');assert.ok(e.x>=floor.x-.01&&e.x+e.w<=floor.x+floor.w+.01);assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)));if(n===300)g.p.x=floor.x+floor.w-14;}
  if(e.kind==='corn')assert.ok(g.dangers.length>0);else assert.ok(hi-lo>8,l.id+'/'+r.id+' stuck patrol');
  for(const b of g.blocks.filter(b=>r.floors.some(f=>b.y===f.y&&b.x>=f.x&&b.x+b.w<=f.x+f.w)))g.hitBlock(b);g.p.x=r.entry.x;g.p.y=194;let maxFoot=e.y+e.h;for(let n=0;n<360;n++){g.time+=STEP;updateEnemies(g,STEP,0);maxFoot=Math.max(maxFoot,e.y+e.h);}assert.ok(!e.dead);assert.ok(maxFoot>floor.y+8,l.id+'/'+r.id+' floating after destruction');assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)));
 }
});
test('previous ordinary-stage saves migrate to layered maps while preserving score, consumed rebirths and completed stages',()=>{
 for(const old of originals)for(const status of ['playing','dead','won','gameover']){const g=new Game(old,{form:2,score:12000,rebirths:1});g.mode=status;g.pendingRebirth=status==='dead';g.score=12500;if(status==='gameover')g.rebirths=0;const raw=JSON.parse(encodeSave(g,['1-4'])),saved=decodeSave(JSON.stringify(raw));assert.ok(saved,old.id+'/'+status);assert.ok(saved.layoutMigrated);const c=new Campaign();c.restore(saved);assert.ok(c.completed.has('1-4'));assert.equal(c.game.rebirths,g.rebirths);assert.equal(c.game.mode,status==='dead'?'playing':status);assert.equal(c.game.score,['won','gameover'].includes(status)?12500:12000);assert.equal(c.game.blocks.length,levelById(old.id).blocks.length);assert.ok(decodeSave(encodeSave(c.game,[...c.completed])));raw.layoutVersion=levelById(old.id).layoutVersion;assert.equal(decodeSave(JSON.stringify(raw)),null);}
});
test('upper-route jumps stay below the HUD with vertical camera follow while ground, boss and warp views stay fixed',()=>{
 for(const l of later)for(const r of l.layeredRoutes)for(const form of [0,1,2]){const g=new Game(l,{form});g.p.y=r.floors.at(-1).y-g.p.h-80;const offset=cameraY(l,g.p);assert.ok(offset<=0&&offset>=-96);assert.ok(g.p.y-offset>=40);g.p.y=194;assert.equal(cameraY(l,g.p),0);}
 assert.equal(cameraY(levelById('2-4'),{y:-40}),0);assert.equal(cameraY({layeredRoutes:[{}],warpRoom:true},{y:-40}),0);
});
