import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {nearPit} from '../../tools/veggie-adventure/review-campaign-rules.mjs';

test('each world opening contains exactly one additional accessible extra-life block, with no other stage copies',()=>{
 let count=0;for(const l of LEVELS){const blocks=l.blocks.filter(b=>b.item==='rebirth');assert.equal(blocks.length,l.id.endsWith('-1')?1:0,l.id);if(!blocks.length)continue;count++;
  const b=blocks[0];assert.equal(b.rewardId,l.id);assert.equal(nearPit(l,b),false);
  for(const form of [0,1,2]){const g=new Game(l,{form});g.enemies=[];g.items=[];g.boss=null;g.level.hazards=[];g.turrets=[];
   const p=g.p;p.x=b.x+2;p.y=194-g.p.h+14;p.vx=0;p.vy=0;for(let n=0;n<15;n++)g.step(STEP);
   for(let n=0;n<150&&!g.blocks.find(v=>v.rewardId===l.id).used;n++)g.step(STEP,{jump:true,jumpPressed:n===0});
   const item=g.items.find(i=>i.kind==='rebirth');assert.ok(item,l.id+'/'+form);assert.equal(item.rewardId,l.id);
   Object.assign(item,{x:p.x,y:p.y,vx:0,vy:0});g.step(STEP);assert.equal(g.rebirths,4);assert.deepEqual(g.claimedRebirthRewards,[l.id]);assert.ok(g.soundEvents.some(e=>e.id==='life-up'));
  }
 }assert.equal(count,8);
});

test('extra lives persist across death, refresh and stage transitions without being farmed again',()=>{
 const c=new Campaign(),id=c.game.level.id;c.game.collect('rebirth',id);assert.equal(c.game.rebirths,4);
 c.game.kill();c.game.step(.7);assert.equal(c.game.rebirths,3);assert.deepEqual(c.game.claimedRebirthRewards,[id]);
 const block=c.game.blocks.find(b=>b.item==='rebirth');assert.ok(block.used);const n=c.game.items.length;c.game.hitBlock(block);assert.equal(c.game.items.length,n);
 const saved=decodeSave(encodeSave(c.game));assert.ok(saved);const refresh=new Campaign();refresh.restore(saved);assert.equal(refresh.game.rebirths,3);refresh.game.collect('rebirth',id);assert.equal(refresh.game.rebirths,3);
 refresh.game.mode='won';refresh.advance();assert.deepEqual(refresh.game.claimedRebirthRewards,[id]);assert.equal(refresh.game.rebirths,3);
 refresh.restart();assert.deepEqual(refresh.game.claimedRebirthRewards,[]);assert.equal(refresh.game.rebirths,3);
});

test('all eight bonuses can raise reserves above three and invalid save claims cannot forge extra lives',()=>{
 const g=new Game();for(let world=1;world<=8;world++)g.collect('rebirth',world+'-1');assert.equal(g.rebirths,11);g.collect('rebirth','1-1');assert.equal(g.rebirths,11);assert.ok(decodeSave(encodeSave(g)));
 for(const patch of [{rebirths:12},{rebirths:4,claimedRebirthRewards:[]},{claimedRebirthRewards:['1-2']},{claimedRebirthRewards:['1-1','1-1']}]){const d=JSON.parse(encodeSave(g));Object.assign(d.run,patch);assert.equal(decodeSave(JSON.stringify(d)),null);}
});

test('all eight pre-reward stage layouts migrate old progress without refilling lives or clearing completed levels',()=>{
 const old=JSON.parse(fs.readFileSync('tests/veggie-adventure/fixtures/pre-rebirth-rewards.json'));assert.equal(old.length,8);
 for(const level of old){const g=new Game(level,{score:1234,form:1,rebirths:1}),saved=decodeSave(encodeSave(g,['1-4']));assert.ok(saved,level.id);assert.equal(saved.layoutMigrated,true);const c=new Campaign();c.restore(saved);assert.equal(c.game.rebirths,1);assert.equal(c.game.score,1234);assert.ok(c.completed.has('1-4'));assert.equal(c.game.blocks.filter(b=>b.item==='rebirth').length,1);}
});

test('four generated reward and projectile sprites retain real transparent PNG pixels and visible silhouettes',async()=>{
 const m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
 for(const id of ['reward-rebirth-face','item-rebirth','projectile-thorn','projectile-pea']){
  const a=m.assets.find(a=>a.id===id);assert.ok(a);const data=await sharp('public/games/veggie-adventure/assets/'+a.path).ensureAlpha().raw().toBuffer();let clear=0,solid=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>200)solid++;}assert.ok(clear>0,id+' lacks transparency');assert.ok(solid>100,id+' empty sprite');
 }
});
