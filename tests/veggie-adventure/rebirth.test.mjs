import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP,MAX_REBIRTHS,INITIAL_REBIRTHS} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {playerClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';

test('one run has three rebirths, repeated death callbacks consume once, and the fourth death ends the game',()=>{
 const g=new Game();assert.equal(INITIAL_REBIRTHS,3);assert.equal(MAX_REBIRTHS,11);assert.equal(g.rebirths,3);
 for(const remaining of [2,1,0]){g.p.form=2;g.resizePlayer();g.p.x=900;g.kill();assert.equal(g.rebirths,remaining);assert.equal(g.pendingRebirth,true);for(let n=0;n<5;n++)g.kill();assert.equal(g.rebirths,remaining);g.step(.7);assert.equal(g.mode,'playing');assert.equal(g.p.form,0);assert.equal(g.p.x,g.level.spawn.x);assert.equal(g.pendingRebirth,false);}
 g.kill();assert.equal(g.rebirths,0);assert.equal(g.pendingRebirth,false);g.step(.7);assert.equal(g.mode,'gameover');assert.equal(playerClip(g),'death');const last=g.snapshot();for(let n=0;n<600;n++)g.step(STEP,{right:true,jump:true,fire:true});assert.deepEqual(g.snapshot(),last);assert.equal(g.rebirths,0);assert.equal(g.mode,'gameover');
});

test('all 32 stages and all three entering forms reset at the entrance with fresh actors and base form',()=>{
 for(const level of LEVELS)for(const form of [0,1,2]){
  const g=new Game(level,{form,score:2345,rebirths:2});g.p.x=level.checkpoint+30;g.p.star=8;g.time=50;g.remaining=50;g.score+=4000;
  if(g.blocks.length)g.hitBlock(g.blocks[0]);if(g.enemies.length){g.enemies[0].dead=true;g.enemies[0].hp=0;}if(g.gates.length)g.gates[0].open=true;if(g.movers.length)g.movers[0].fallen=true;if(g.boss){g.boss.active=true;g.boss.hp=1;g.boss.skillCooldowns.slam=4;}
  g.shots=[{x:1}];g.dangers=[{x:1}];g.kill();g.step(.7);
  const fresh=new Game(level,{score:2345,form:0,rebirths:1});assert.deepEqual(g.snapshot(),fresh.snapshot(),`${level.id}/${form}`);assert.equal(g.rebirths,1);assert.equal(g.entryForm,0);assert.equal(g.score,2345);assert.equal(g.mode,'playing');assert.deepEqual(g.shots,[]);assert.deepEqual(g.dangers,[]);
 }
});

test('pit and timeout deaths use the same limited rebirth rule',()=>{
 for(const cause of ['pit','timeout']){
  const g=new Game();for(let death=0;death<4;death++){if(cause==='pit')g.p.y=270;else g.remaining=.001;g.step(STEP);assert.equal(g.mode,'dead');assert.equal(g.rebirths,Math.max(0,2-death));g.step(.7);assert.equal(g.mode,death<3?'playing':'gameover');}
 }
});

test('stage transitions carry remaining rebirths, and a death resets only the current stage and its score gains',()=>{
 const c=new Campaign();c.game.kill();c.game.step(.7);assert.equal(c.game.rebirths,2);c.game.p.form=2;c.game.resizePlayer();c.game.score=4321;c.game.mode='won';c.finish();assert.ok(c.advance());
 assert.equal(c.game.level.id,'1-2');assert.equal(c.game.rebirths,2);assert.equal(c.game.p.form,2);assert.equal(c.game.score,4321);
 c.game.score+=999;c.game.kill();c.game.step(.7);assert.equal(c.game.level.id,'1-2');assert.equal(c.game.rebirths,1);assert.equal(c.game.p.form,0);assert.equal(c.game.score,4321);assert.deepEqual([...c.completed],['1-1']);
 c.game.rebirths=0;c.game.kill();c.game.step(.7);assert.equal(c.advance(),false);c.restart();assert.equal(c.game.level.id,'1-1');assert.equal(c.game.rebirths,3);assert.equal(c.game.score,0);assert.equal(c.game.p.form,0);assert.equal(c.completed.size,0);
});

test('saving or refreshing during death cannot refill lives, double-charge, or skip game over',()=>{
 let c=new Campaign();c.select('1-4',{score:1200,form:2,rebirths:3});
 for(const remaining of [2,1,0]){
  c.game.kill();const data=decodeSave(encodeSave(c.game));assert.ok(data);assert.equal(data.run.status,'dead');assert.equal(data.run.rebirths,remaining);
  c=new Campaign();c.restore(data);assert.equal(c.game.rebirths,remaining);assert.equal(c.game.mode,'playing');assert.equal(c.game.p.form,0);assert.equal(c.game.p.x,c.game.level.spawn.x);assert.equal(c.game.score,1200);
  const repeat=decodeSave(encodeSave(c.game));for(let i=0;i<3;i++){c=new Campaign();c.restore(repeat);assert.equal(c.game.rebirths,remaining);}
 }
 c.game.kill();const exhausted=decodeSave(encodeSave(c.game));assert.ok(exhausted);assert.equal(exhausted.run.pendingRebirth,false);c=new Campaign();c.restore(exhausted);assert.equal(c.game.mode,'gameover');assert.equal(c.game.rebirths,0);
 const ended=decodeSave(encodeSave(c.game));assert.ok(ended);c=new Campaign();c.restore(ended);assert.equal(c.game.mode,'gameover');assert.equal(c.advance(),false);
});

test('legacy stage checkpoints migrate to the entrance instead of restoring a position or grown state',()=>{
 const g=new Game(levelById('2-4'),{form:2});g.p.x=g.level.checkpoint+20;g.score=2000;g.saveCheckpoint();const old=JSON.parse(encodeSave(g,['1-1']));old.version=2;delete old.run;
 const saved=decodeSave(JSON.stringify(old));assert.ok(saved);const c=new Campaign();c.restore(saved);assert.equal(c.game.level.id,'2-4');assert.equal(c.game.p.x,g.level.spawn.x);assert.equal(c.game.p.form,0);assert.equal(c.game.score,2000);assert.equal(c.game.rebirths,3);assert.deepEqual([...c.completed],['1-1']);
});

test('run save validation rejects impossible counts and terminal states',()=>{
 const valid=JSON.parse(encodeSave(new Game()));assert.equal(valid.version,3);
 for(const value of [-1,4,.5,'3',null]){const d=structuredClone(valid);d.run.rebirths=value;assert.equal(decodeSave(JSON.stringify(d)),null);}
 for(const patch of [{status:'gameover'},{status:'playing',pendingRebirth:true},{status:'dead',pendingRebirth:false},{status:'won'},{status:'unknown'},{entryScore:-1},{entryForm:3}]){const d=structuredClone(valid);Object.assign(d.run,patch);assert.equal(decodeSave(JSON.stringify(d)),null);}
 const zero=new Game(undefined,{rebirths:0});assert.ok(decodeSave(encodeSave(zero)),'zero remaining still permits the current attempt');
});
