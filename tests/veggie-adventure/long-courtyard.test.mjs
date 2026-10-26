import test from 'node:test';
import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import level from '../../public/games/veggie-adventure/levels/world-01/level-1-4.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {cameraX} from '../../public/games/veggie-adventure/js/render.mjs';

test('long 1-4 has more than triple the original width, populated sections and its complete arena at the far end',()=>{
 assert.ok(level.width>1792*3);assert.ok(level.exit-level.spawn.x>(1744-32)*3);assert.ok(level.boss.left>1424*3);
 assert.equal(level.boss.right-level.boss.left,288);assert.equal(level.width-level.exit,48);assert.equal(level.movers.filter(m=>m.arena).length,3);
 let end=0;for(const section of level.sections){assert.equal(section.from,end);assert.ok(section.to>section.from);end=section.to;}assert.equal(end,level.width);
 for(const section of level.sections.slice(1,-1)){
  assert.ok(level.blocks.some(b=>b.x>=section.from&&b.x<section.to),section.id+' blocks');
  assert.ok(level.enemies.some(e=>e.x>=section.from&&e.x<section.to),section.id+' enemies');
  assert.ok(level.items.some(i=>i.x>=section.from&&i.x<section.to),section.id+' seeds');
 }
 assert.equal(level.enemies.length,12);assert.ok(level.blocks.filter(b=>b.item).length>=10);assert.ok(level.timeLimit>=720);
 const g=new Game(level);g.p.x=1744;g.p.y=194;g.step(STEP);assert.equal(g.mode,'playing');assert.equal(g.boss.active,false);
 for(let x=0;x<level.boss.left-16;x+=64){const camera=cameraX(level,{x},g.boss);assert.ok(x-camera>=0&&x+12-camera<=256);}
});

test('all standing forms traverse the full long courtyard terrain without crouching, breaking bricks or changing movement physics',()=>{
 for(const form of [0,1,2])for(const lead of [3,6,9,12]){
  const l=structuredClone(level);l.enemies=[];l.items=[];l.boss=null;const g=new Game(l,{form});let jump=false,lastX=-1,stuck=0,jumps=0;
  for(let frame=0;frame<120*150&&g.mode==='playing';frame++){
   const p=g.p,foot=p.y+p.h,solids=g.solids();
   const floorAhead=solids.some(s=>p.x+p.w+lead>=s.x&&p.x+p.w+lead<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20);
   const obstacle=solids.some(s=>s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+16&&s.y<foot&&s.y+s.h>p.y);
   const press=p.grounded&&(!floorAhead||obstacle||stuck>30);
   if(press){jump=true;jumps++;}else if(p.grounded)jump=false;
   g.step(STEP,{right:true,jump,jumpPressed:press});stuck=Math.abs(g.p.x-lastX)<.02?stuck+1:0;lastX=g.p.x;
   assert.equal(g.p.form,form);assert.equal(g.p.h,form?22.4:14);assert.equal(g.rebirths,3);if(stuck>240)break;
  }
  assert.equal(g.mode,'won',`form ${form}, lead ${lead}, x=${g.p.x}`);assert.ok(jumps>=8);assert.ok(g.time<120);assert.ok(g.blocks.every(b=>!b.broken));
 }
});

function oldSave(){
 const g=new Game(level,{form:2,score:15000,rebirths:1}),d=JSON.parse(encodeSave(g,['1-1','1-2','1-3'])),s=d.checkpoint;
 delete d.layoutVersion;d.result.score=15500;s.score=15500;s.p.x=1500;
 s.enemies=s.enemies.slice(0,2);s.blocks=s.blocks.slice(0,12);s.items=s.items.slice(0,13);
 for(const m of s.movers){m.x-=4096;m.baseX-=4096;}
 for(const key of ['x','left','right'])s.boss[key]-=4096;
 s.remaining=300;return d;
}

test('the old short courtyard save migrates to the new entrance without losing completed stages, run score or rebirths',()=>{
 for(const preLedges of [false,true])for(const status of ['playing','dead','gameover','won']){
  const d=oldSave();if(preLedges)d.checkpoint.movers=[];
  d.run.status=status;d.complete=status==='won';d.run.pendingRebirth=status==='dead';if(status==='gameover')d.run.rebirths=0;
  const saved=decodeSave(JSON.stringify(d));assert.ok(saved);assert.equal(saved.layoutMigrated,true);assert.equal(saved.layoutVersion,2);
  assert.equal(saved.checkpoint.boss.left,level.boss.left);assert.equal(saved.checkpoint.blocks.length,level.blocks.length);assert.equal(saved.checkpoint.enemies.length,12);
  const campaign=new Campaign();campaign.restore(saved);const g=campaign.game;
  assert.equal(g.level.id,'1-4');assert.equal(g.p.x+g.p.w/2,level.spawn.x+6);assert.equal(g.rebirths,d.run.rebirths);assert.equal(g.mode,status==='won'?'won':status==='gameover'?'gameover':'playing');
  assert.equal(g.score,status==='won'||status==='gameover'?15500:15000);assert.deepEqual([...campaign.completed],status==='won'?['1-1','1-2','1-3','1-4']:['1-1','1-2','1-3']);
  assert.ok(decodeSave(encodeSave(g,[...campaign.completed])));
 }
 // Migration remains restricted to the known layout and does not bypass validation.
 for(const corrupt of [d=>d.checkpoint.boss.hp=99,d=>d.checkpoint.blocks.pop(),d=>d.checkpoint.enemies[0].x=3000,d=>d.checkpoint.boss.left=1425,d=>d.layoutVersion=2]){
  const d=oldSave();corrupt(d);assert.equal(decodeSave(JSON.stringify(d)),null);
 }
});
