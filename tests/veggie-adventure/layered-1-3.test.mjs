import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import level from '../../public/games/veggie-adventure/levels/world-01/level-1-3.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {updateEnemies} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {auditCampaignLevel,groundGaps,nearPit} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
import {buildLayeredStage} from '../../tools/veggie-adventure/build-layered-1-3.mjs';
const old=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-layered-1-3.json',import.meta.url)));
const steer=(p,x)=>{const dx=x-(p.x+p.vx*.16);return {right:dx>1,left:dx< -1};};
function walk(g,x){for(let n=0;n<360;n++){if(Math.abs(g.p.x-x)<1.2&&Math.abs(g.p.vx)<8)return true;g.step(STEP,steer(g.p,x));}return false;}
function terrain(form=0){const l=structuredClone(level);l.enemies=[];l.items=[];return new Game(l,{form});}

test('1-3 adds three optional brick branches with high enemies, rewards and two safely buffered pits',()=>{
 assert.equal(level.width,old.width);assert.equal(level.exit,old.exit);assert.deepEqual(level.spawn,old.spawn);assert.equal(level.layeredRoutes.length,3);assert.equal(level.blocks.length,58);assert.equal(level.enemies.length,6);assert.equal(groundGaps(level).length,2);assert.deepEqual(auditCampaignLevel(level),[]);
 assert.deepEqual(buildLayeredStage(old),level);assert.equal(buildLayeredStage(level),null);
 for(const route of level.layeredRoutes){assert.equal(route.optional,true);assert.deepEqual(route.floors.map(f=>f.y),[176,128,80]);const bricks=level.blocks.filter(b=>b.route===route.id),e=level.enemies.find(e=>e.id===route.enemyId);assert.ok(bricks.every(b=>b.breakable&&b.kind==='brick'&&!nearPit(level,b)));assert.equal(e.y+e.h,80);assert.ok(!nearPit(level,{x:e.patrolLeft,w:e.patrolRight-e.patrolLeft}));assert.ok(level.items.some(i=>i.route===route.id&&i.y<80));}
 for(const e of old.enemies)assert.ok(level.enemies.some(v=>v.id===e.id&&v.kind===e.kind&&v.x===e.x&&v.y===e.y));
});

test('all three forms climb every upper route with real inputs and intact bricks, then safely rejoin the ground',()=>{
 for(const route of level.layeredRoutes)for(const form of [0,1,2]){const g=terrain(form);g.p.x=route.entry.x;g.p.y=194;for(let n=0;n<20;n++)g.step(STEP);let previous={x:0,w:level.width};
  for(const floor of route.floors){const launch=Math.min(floor.x-24,previous.x+previous.w-g.p.w-2);assert.ok(walk(g,launch));let landed=false;const target=floor.x+(floor.w-g.p.w)/2;
   for(let n=0;n<180;n++){g.step(STEP,{...steer(g.p,target),jump:true,jumpPressed:n===0});if(n>4&&g.p.grounded){landed=Math.abs(g.p.y+g.p.h-floor.y)<.01&&g.p.x+g.p.w>floor.x&&g.p.x<floor.x+floor.w;break;}}
   assert.ok(landed,route.id+'/'+form+'/'+floor.y);assert.equal(g.p.form,form);previous=floor;
  }
  assert.ok(walk(g,route.rejoin.x));for(let n=0;n<120;n++)g.step(STEP);assert.equal(g.p.y+g.p.h,208);assert.equal(g.mode,'playing');assert.equal(g.rebirths,3);assert.ok(g.blocks.every(b=>!b.broken));
 }
});

test('the short-jump ground route and the fully collapsed layout remain traversable without upgrades in all forms',()=>{
 for(const form of [0,1,2])for(const collapsed of [false,true]){const g=terrain(form);if(collapsed)for(const b of g.blocks)b.broken=true;g.hitBlock=()=>{};let last=-1,stuck=0,hold=0;
  for(let n=0;n<120*60&&g.mode==='playing';n++){const p=g.p,foot=p.y+p.h,solids=g.solids(),ahead=p.x+p.w+6,floor=solids.some(s=>ahead>=s.x&&ahead<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20),obstacle=solids.some(s=>s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+16&&s.y<foot&&s.y+s.h>p.y),press=p.grounded&&(!floor||obstacle||stuck>30);if(press)hold=.12;g.step(STEP,{right:true,jump:hold>0,jumpPressed:press});hold-=STEP;stuck=Math.abs(g.p.x-last)<.02?stuck+1:0;last=g.p.x;if(stuck>240)break;assert.equal(g.p.form,form);}
  assert.equal(g.mode,'won',`form ${form}, collapsed ${collapsed}, x ${g.p.x}`);assert.equal(g.rebirths,3);if(!collapsed)assert.ok(g.blocks.every(b=>!b.broken));
 }
});

test('high-route enemies patrol and pursue on brick floors, never start embedded, and fall when their route breaks',()=>{
 for(const route of level.layeredRoutes){const g=new Game(level),e=g.enemies.find(e=>e.id===route.enemyId),roof=route.floors[2];g.enemies=[e];g.items=[];g.damage=()=>{};g.p.x=roof.x+2;g.p.y=66;let lo=e.x,hi=e.x;
  for(let n=0;n<120*5;n++){g.time+=STEP;updateEnemies(g,STEP,0);lo=Math.min(lo,e.x);hi=Math.max(hi,e.x);assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)),route.id);assert.equal(e.y+e.h,80);assert.ok(e.x>=roof.x&&e.x+e.w<=roof.x+roof.w);if(n===300)g.p.x=roof.x+roof.w-14;}
  assert.ok(hi-lo>16,route.id+' cannot patrol');assert.equal(e.brain.engaged,true);
  for(const b of g.blocks.filter(b=>b.route===route.id))g.hitBlock(b);g.p.x=32;g.p.y=194;
  for(let n=0;n<240;n++){g.time+=STEP;updateEnemies(g,STEP,0);}
  assert.ok(!e.dead);assert.ok(e.y+e.h>128,route.id+' should fall off destroyed bricks');assert.ok(!g.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s)));
 }
});

test('the previous 1-3 layout migrates campaign run states while keeping progress, score and rebirths',()=>{
 for(const status of ['playing','dead','won','gameover']){const g=new Game(old,{form:2,score:12345,rebirths:1});g.mode=status;g.pendingRebirth=status==='dead';g.score=15000;if(status==='gameover')g.rebirths=0;const raw=JSON.parse(encodeSave(g,['1-1','1-2'])),saved=decodeSave(JSON.stringify(raw));assert.ok(saved);assert.equal(saved.layoutMigrated,true);const c=new Campaign();c.restore(saved);assert.equal(c.game.blocks.length,58);assert.equal(c.game.enemies.length,6);assert.equal(c.game.rebirths,g.rebirths);assert.ok(c.completed.has('1-2'));assert.equal(c.game.score,['won','gameover'].includes(status)?15000:12345);assert.ok(decodeSave(encodeSave(c.game,[...c.completed])));raw.layoutVersion=level.layoutVersion;assert.equal(decodeSave(JSON.stringify(raw)),null);}
});
