import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';

function scene(item='carrot',form=0,breakable=true){
 const l=structuredClone(LEVELS[0]);Object.assign(l,{width:512,exit:480,spawn:{x:80,y:194},platforms:[{x:0,y:208,w:512,h:32}],blocks:[{x:80,y:144,w:16,h:16,kind:breakable?'brick':'reward',breakable,item}],enemies:[],items:[],movers:[],water:[],hazards:[],turrets:[],gates:[],boss:null});
 return new Game(l,{form});
}

test('every authored upgrade block across 32 stages releases the next item for the current form exactly once',()=>{
 let checked=0;for(const level of LEVELS)for(const form of [0,1,2]){
  const g=new Game(level,{form});for(const block of g.blocks.filter(b=>['carrot','chili'].includes(b.item))){
   const count=g.items.length,authored=block.item;g.hitBlock(block);g.hitBlock(block);
   assert.equal(g.items.length,count+1,level.id+' duplicate reward');assert.equal(g.items.at(-1).kind,form===0?'carrot':'chili',level.id+'/'+form+'/'+authored);
   assert.equal(g.p.form,form,'release must not upgrade before collection');assert.equal(block.item,authored);checked++;
  }
 }assert.equal(checked,LEVELS.reduce((sum,l)=>sum+l.blocks.filter(b=>['carrot','chili'].includes(b.item)).length,0)*3);
});

test('actual upward collisions at the same position release carrot or chili for all forms and both block styles',()=>{
 for(const authored of ['carrot','chili'])for(const form of [0,1,2])for(const breakable of [false,true]){
  const g=scene(authored,form,breakable);for(let n=0;n<10;n++)g.step(STEP);
  for(let n=0;n<180&&!g.blocks[0].used;n++)g.step(STEP,{jump:true,jumpPressed:n===0});
  assert.ok(g.blocks[0].used,authored+'/'+form+' did not hit block');assert.equal(g.items.length,1);
  assert.equal(g.items[0].kind,form===0?'carrot':'chili');assert.equal(g.p.form,form);
 }
});

test('upgrade collection advances one stage, caps at chili, and leaves seed and star rewards unchanged',()=>{
 for(const form of [0,1,2]){
  const g=scene('chili',form);g.hitBlock(g.blocks[0]);const item=g.items[0],foot=g.p.y+g.p.h,score=g.score;
  Object.assign(item,{x:g.p.x,y:g.p.y,vx:0,vy:0});g.step(STEP);
  assert.ok(item.collected);assert.equal(g.p.form,Math.min(2,form+1));assert.equal(g.score,score+1000);assert.equal(g.p.y+g.p.h,foot);
  for(const kind of ['seed','star'])for(const breakable of [false,true]){
   const other=scene(kind,form,breakable);other.hitBlock(other.blocks[0]);assert.equal(other.items[0].kind,kind);other.collect(kind);assert.equal(other.p.form,form);
   if(kind==='star')assert.equal(other.p.star,10);else assert.equal(other.score,breakable?150:100);
  }
 }
});

test('hit-time form follows damage and rebirth, while already released items retain their kind and save correctly',()=>{
 const l=structuredClone(LEVELS.find(l=>l.blocks.filter(b=>['carrot','chili'].includes(b.item)).length>=2)),g=new Game(l);g.collect('carrot');
 const first=g.blocks.find(b=>['carrot','chili'].includes(b.item));g.hitBlock(first);const released=g.items.at(-1);assert.equal(released.kind,'chili');
 g.damage();assert.equal(g.p.form,0);assert.equal(released.kind,'chili');
 const second=g.blocks.find(b=>b!==first&&['carrot','chili'].includes(b.item));g.hitBlock(second);assert.equal(g.items.at(-1).kind,'carrot');
 g.saveCheckpoint();const saved=decodeSave(encodeSave(g));assert.ok(saved);assert.deepEqual(saved.checkpoint.items.slice(-2).map(i=>i.kind),['chili','carrot']);
 g.kill();for(let n=0;n<90;n++)g.step(STEP);assert.equal(g.p.form,0);assert.equal(g.rebirths,2);
 const reset=g.blocks.find(b=>b.x===first.x&&b.y===first.y);assert.ok(!reset.used);g.hitBlock(reset);assert.equal(g.items.at(-1).kind,'carrot');
});
