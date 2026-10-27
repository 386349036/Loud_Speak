import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {leaperPools,addLeaperBanks} from '../../tools/veggie-adventure/build-leaper-banks.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
const levels=LEVELS.filter(l=>leaperPools(l).length);
test('all ten jumping-fish pools have solid soil shores at the water surface on both sides',()=>{
 assert.equal(levels.length,5);assert.equal(levels.reduce((n,l)=>n+leaperPools(l).length,0),10);
 for(const l of levels){assert.equal(addLeaperBanks(l),null);
  for(const w of leaperPools(l))for(const x of [w.x-16,w.x+w.w])assert.ok(l.platforms.some(p=>p.waterBank&&p.x===x&&p.y===w.y&&p.h===208-w.y),l.id+'/'+x);
  for(const p of l.platforms.filter(p=>p.waterBank)){
   assert.ok(!l.water.some(w=>p.x<w.x+w.w&&p.x+p.w>w.x));
   assert.ok(l.platforms.some(b=>!b.waterBank&&b.y===208&&b.x<=p.x&&b.x+b.w>=p.x+p.w));
   assert.ok(!l.blocks.some(b=>overlap(b,p)),l.id+' bank must not bury bricks/rewards');
  }
 }
});
test('all three forms can swim and jump out of each raised shore in both directions',()=>{
 for(const l of levels)for(const w of leaperPools(l))for(const form of [0,1,2])for(const dir of [-1,1]){
  // Isolate shore geometry from combat; this is a physics check, not visual acceptance.
  const scene={...structuredClone(l),enemies:[],blocks:[],items:[],movers:[],hazards:[],turrets:[],gates:[]};
  const g=new Game(scene,{form});g.p.x=dir<0?w.x+24:w.x+w.w-36;g.p.y=w.y+24-g.p.h;
  const target=dir<0?w.x-36:w.x+w.w+24;
  for(let n=0;n<4/STEP&&g.mode==='playing'&&(dir<0?g.p.x>target:g.p.x<target);n++)g.step(STEP,{left:dir<0,right:dir>0,jump:true});
  assert.equal(g.mode,'playing',l.id+'/'+w.x+'/'+form+'/'+dir);
  assert.ok(dir<0?g.p.x<=target:g.p.x>=target,l.id+'/'+w.x+'/'+form+'/'+dir+' x='+g.p.x);
 }
});
test('saved runs from before the shore update migrate to a safe current entrance',()=>{
 for(const l of levels){const old=structuredClone(l);old.layoutVersion--;old.platforms=old.platforms.filter(p=>!p.waterBank);
  const restored=decodeSave(encodeSave(new Game(old,{form:1,rebirths:2})));assert.ok(restored?.layoutMigrated,l.id);assert.equal(restored.run.rebirths,2);
 }
});
