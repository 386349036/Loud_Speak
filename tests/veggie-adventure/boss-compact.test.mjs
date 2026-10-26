import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {shortenBossApproach} from '../../tools/veggie-adventure/shorten-boss-approaches.mjs';
import {auditCampaignLevel} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-boss-compact-layouts.json',import.meta.url)));

test('eight boss stages remove 60 percent on the tile grid while retaining arenas and combat parameters',()=>{
 assert.equal(before.length,8);
 for(const old of before){
  const l=levelById(old.id),delta=old.width-l.width;
  assert.equal(l.width,1168);assert.ok(delta/old.width>=.6&&delta/old.width<.61);assert.equal(l.width%16,0);
  assert.deepEqual(l.boss,{...old.boss,x:old.boss.x-delta,left:old.boss.left-delta,right:old.boss.right-delta});
  assert.equal(l.boss.right-l.boss.left,288);assert.equal(l.exit,old.exit-delta);assert.equal(l.width-l.exit,48);
  assert.deepEqual(l.movers.filter(m=>m.arena),old.movers.filter(m=>m.arena).map(m=>({...m,x:m.x-delta,baseX:m.baseX-delta})));
  assert.deepEqual(l.water.filter(w=>w.x>=l.boss.left),old.water.filter(w=>w.x>=old.boss.left).map(w=>({...w,x:w.x-delta})));
  assert.deepEqual(l.spawn,old.spawn);assert.equal(l.timeLimit,old.timeLimit);assert.equal(l.background,old.background);assert.equal(l.terrain,old.terrain);
  assert.ok(l.blocks.some(b=>b.item==='carrot'&&b.x<432));assert.ok(l.blocks.some(b=>b.item==='chili'&&b.x>=432&&b.x<l.boss.left));
  assert.deepEqual(auditCampaignLevel(l),[]);assert.deepEqual(shortenBossApproach(old).level,l);assert.equal(shortenBossApproach(l),null);
  for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates','water','platforms'])for(const a of l[key])assert.ok(a.x>=0&&a.x+a.w<=l.width,old.id+'/'+key);
 }
});

function approach(level,form){
 const l=structuredClone(level);l.enemies=[];l.items=[];l.hazards=[];l.turrets=[];
 const g=new Game(l,{form});let jump=false,last=-1,stuck=0;
 g.hitBlock=()=>{};
 for(let n=0;n<120*90&&g.mode==='playing'&&!g.boss.active;n++){
  const p=g.p,foot=p.y+p.h,solids=g.solids(),ahead=p.x+p.w+9;
  const floor=solids.some(s=>ahead>=s.x&&ahead<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20);
  const obstacle=solids.some(s=>!s.oneWay&&s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+16&&s.y<foot&&s.y+s.h>p.y);
  const press=p.grounded&&(!floor||obstacle||stuck>30);if(press)jump=true;else if(p.grounded)jump=false;
  g.step(STEP,{right:true,jump:jump||p.inWater,jumpPressed:press});stuck=Math.abs(g.p.x-last)<.02?stuck+1:0;last=g.p.x;if(stuck>240)break;
 }
 assert.ok(g.boss.active,level.id+'/form'+form+' failed to reach boss at '+g.p.x);assert.equal(g.mode,'playing');assert.equal(g.rebirths,3);assert.equal(g.p.form,form);return g.time;
}

test('three forms reach each boss on the real terrain in under 12 seconds without breaking bricks',()=>{
 for(const old of before)for(const form of [0,1,2]){
  const current=approach(levelById(old.id),form),prior=approach(old,form);
  assert.ok(current<12,old.id+'/'+form+' took '+current);assert.ok(current<prior*.45,old.id+' approach should be substantially quicker');
 }
});

test('saves from all eight previous boss layouts migrate without losing campaign progression',()=>{
 for(const old of before)for(const status of ['playing','dead','won','gameover']){
  const g=new Game(old,{score:20000,form:2,rebirths:1});g.p.x=old.boss.left+32;g.p.y=208-g.p.h;g.score=20500;g.saveCheckpoint();g.mode=status;g.pendingRebirth=status==='dead';if(status==='gameover')g.rebirths=0;
  const raw=JSON.parse(encodeSave(g,['1-1','1-2','1-3'])),saved=decodeSave(JSON.stringify(raw));assert.ok(saved,old.id+'/'+status);assert.equal(saved.layoutMigrated,true);
  const c=new Campaign();c.restore(saved);assert.equal(c.game.level.width,1168);assert.ok(c.game.p.x<64);assert.equal(c.game.rebirths,g.rebirths);assert.equal(c.game.mode,status==='dead'?'playing':status);assert.ok(c.completed.has('1-3'));assert.equal(c.game.score,['won','gameover'].includes(status)?20500:20000);assert.ok(decodeSave(encodeSave(c.game,[...c.completed])));
  for(const corrupt of [d=>d.checkpoint.p.x=old.width+32,d=>d.checkpoint.blocks.pop(),d=>d.layoutVersion=levelById(old.id).layoutVersion]){const bad=structuredClone(raw);corrupt(bad);assert.equal(decodeSave(JSON.stringify(bad)),null);}
 }
});
