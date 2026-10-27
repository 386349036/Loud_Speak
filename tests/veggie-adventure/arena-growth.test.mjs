import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP,overlap} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {playerSize} from '../../public/games/veggie-adventure/js/core/player-size.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {updateBoss,exposeDuration} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {cameraX,createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
import {expandBossArena} from '../../tools/veggie-adventure/expand-boss-arenas.mjs';
import {auditCampaignLevel} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-arena-expansion-layouts.json',import.meta.url)));

test('all eight arenas expand exactly 1.5 times, keeping approaches, actor sizes and combat stats',()=>{
 assert.equal(before.length,8);
 for(const old of before){const l=levelById(old.id),b=l.boss;
  assert.equal(b.right-b.left,432);assert.equal(b.left,old.boss.left);assert.equal(l.width-old.width,144);assert.equal(l.exit-old.exit,144);
  assert.deepEqual({...b,x:old.boss.x,right:old.boss.right},old.boss);assert.deepEqual(l.spawn,old.spawn);
  for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates'])assert.deepEqual(l[key].filter(a=>a.x+a.w<=b.left),old[key].filter(a=>a.x+a.w<=b.left),old.id+'/'+key);
  for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates','platforms','water'])for(const a of l[key])assert.ok(a.x>=0&&a.x+a.w<=l.width,old.id+'/'+key);
  assert.deepEqual(auditCampaignLevel(l),[]);assert.deepEqual(expandBossArena(old).level,l);assert.equal(expandBossArena(l),null);
  assert.equal(l.movers.filter(m=>m.arena).length,3);
 }
});

test('enlarged arena floors and pool shorelines remain continuous and supported to the exit',()=>{
 for(const l of LEVELS.filter(l=>l.boss))for(let x=l.boss.left;x<l.width;x+=1){
  const floor=l.platforms.filter(p=>p.x<=x&&p.x+p.w>x);assert.equal(floor.length,1,l.id+'/'+x);
  const water=l.water.find(w=>w.x<=x&&w.x+w.w>x);assert.equal(floor[0].y,water?water.y+water.h:208,l.id+'/'+x);
 }
});

test('all player forms keep a 12x14 collision body through upgrades, crouch, damage and restore',()=>{
 for(const form of [0,1,2]){const g=new Game(undefined,{form}),foot=g.p.y+g.p.h,cx=g.p.x+g.p.w/2;
  for(const down of [false,true,false]){g.resizePlayer(down);assert.deepEqual(playerSize(form,down),{w:12,h:14});assert.equal(g.p.w,12);assert.equal(g.p.h,14);assert.equal(g.p.y+g.p.h,foot);assert.equal(g.p.x+g.p.w/2,cx);}
  for(const item of ['carrot','chili','chili','chili']){g.collect(item);assert.equal(g.p.w,12);assert.equal(g.p.h,14);assert.equal(g.p.y+g.p.h,foot);}
  g.saveCheckpoint();assert.ok(decodeSave(encodeSave(g)));g.restore();assert.equal(g.p.h,14);g.damage();assert.equal(g.p.h,14);assert.equal(g.p.w,12);
 }
});

test('a 16-unit-high tunnel and contact hit tests behave identically in all three forms',()=>{
 const games=[0,1,2].map(form=>{const l=structuredClone(LEVELS[0]);Object.assign(l,{width:800,exit:750,platforms:[{x:0,y:208,w:800,h:32}],blocks:[{x:64,y:176,w:128,h:16,kind:'brick'}],enemies:[],items:[],movers:[],hazards:[],water:[],gates:[],turrets:[],boss:null});return new Game(l,{form});});
 for(let n=0;n<320;n++){for(const g of games)g.step(STEP,{right:true});for(const g of games.slice(1)){assert.equal(g.p.x,games[0].p.x);assert.equal(g.p.y,games[0].p.y);assert.equal(g.p.vx,games[0].p.vx);}}
 assert.ok(games[0].p.x>208);for(const g of games){assert.equal(g.mode,'playing');assert.equal(overlap(g.p,{x:g.p.x-1,y:g.p.y-1,w:14,h:.5}),false);assert.equal(overlap(g.p,{x:g.p.x,y:g.p.y,w:1,h:1}),true);}
});

test('all historic grown collision sizes normalize at the same feet on restore',()=>{
 for(const form of [1,2])for(const [w,h] of [[12,28],[12,14],[9.6,22.4],[9.6,11.2]]){const g=new Game(undefined,{form}),d=JSON.parse(encodeSave(g)),p=d.checkpoint.p,foot=p.y+p.h,cx=p.x+p.w/2;Object.assign(p,{w,h,x:cx-w/2,y:foot-h});const saved=decodeSave(JSON.stringify(d));assert.ok(saved);g.checkpoint=saved.checkpoint;g.restore();assert.equal(g.p.w,12);assert.equal(g.p.h,14);assert.equal(g.p.y+g.p.h,foot);assert.equal(g.p.x+g.p.w/2,cx);}
});

test('pre-expansion boss saves migrate all run states without losing score, form or completed stages',()=>{
 for(const old of before)for(const status of ['playing','dead','won','gameover']){const g=new Game(old,{form:2,score:20000,rebirths:1});g.mode=status;g.score=20500;g.pendingRebirth=status==='dead';if(status==='gameover')g.rebirths=0;const saved=decodeSave(encodeSave(g,['1-1','1-2','1-3']));assert.ok(saved,old.id);assert.ok(saved.layoutMigrated);const c=new Campaign();c.restore(saved);assert.equal(c.game.level.boss.right-c.game.level.boss.left,432);assert.equal(c.game.rebirths,g.rebirths);assert.equal(c.game.p.h,14);assert.ok(c.completed.has('1-3'));assert.equal(c.game.score,['won','gameover'].includes(status)?20500:20000);assert.ok(decodeSave(encodeSave(c.game,[...c.completed])));}
 for(const old of before){const bad=JSON.parse(encodeSave(new Game(old)));bad.layoutVersion=levelById(old.id).layoutVersion;assert.equal(decodeSave(JSON.stringify(bad)),null,old.id+' cannot disguise old arena bounds as current');}
});

test('wider-arena camera and combat barriers keep each player form visible at every screen width',()=>{
 for(const l of LEVELS.filter(l=>l.boss))for(const form of [0,1,2])for(const width of [192,256,426,650])for(const fraction of [0,.25,.5,.75,1]){const g=new Game(l,{form}),b=g.boss;Object.assign(b,{active:true,phase:'idle'});g.p.x=b.left+(b.right+16-g.p.w-b.left)*fraction;g.p.y=194;updateBoss(g,0,208);const x=cameraX(l,g.p,b,width);assert.ok(g.p.x-x>=0&&g.p.x+g.p.w-x<=width);assert.ok(g.p.x>=b.left&&g.p.x+g.p.w<=b.right+16);}
});

test('garden boss far-edge weak point remains reachable with an actual running jump in each form',()=>{
 for(const form of [0,1,2]){const g=new Game(levelById('1-4'),{form}),b=g.boss;g.enemies=[];g.items=[];
  Object.assign(b,{active:true,x:b.right-b.w-8,y:176,phase:'attack',pattern:'slam',timer:2,startY:176});Object.assign(g.p,{x:b.left+8,y:194,vx:0,vy:0,grounded:true});updateBoss(g,0,208);assert.equal(b.phase,'expose');const window=exposeDuration(b),hp=b.hp;let jumping=false;
  for(let n=0;n<window/STEP&&b.hp===hp&&g.mode==='playing';n++){const target=b.x+b.w/2-g.p.w/2,dx=target-g.p.x,press=g.p.grounded&&Math.abs(dx)<64;if(press)jumping=true;const projected=g.p.x+g.p.vx*.25;g.step(STEP,{right:projected<target-1,left:projected>target+1,jump:jumping,jumpPressed:press});}
  assert.equal(b.hp,hp-1,'form '+form);assert.equal(g.p.form,form);assert.equal(g.mode,'playing');
 }
});

test('first-world ledges render the generated flat wooden deck PNG at the collision top',async()=>{
 const m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')),asset=m.assets.find(a=>a.id==='platform-garden-deck');assert.ok(asset);
 const {data,info}=await sharp('public/games/veggie-adventure/assets/'+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,192);assert.equal(info.height,64);let clear=0,visible=0,top=0;for(let i=3;i<data.length;i+=4){if(!data[i])clear++;if(data[i]>128)visible++;}for(let x=0;x<192;x++)if(data[x*4+3]>128)top++;assert.ok(clear>100&&visible>1000&&top>160);
 const calls=[],stack=[];let x=0,y=0;const ctx=new Proxy({save(){stack.push([x,y]);},restore(){[x,y]=stack.pop();},translate(dx,dy){x+=dx;y+=dy;},setTransform(){x=0;y=0;},drawImage(img,dx,dy,w,h){if(img.id===asset.id)calls.push({x:x+dx,y:y+dy,w,h});}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
 const g=new Game(levelById('1-4')),camera=cameraX(g.level,g.p,g.boss,650);createRenderer({width:650*3,getContext:()=>ctx},new Map(m.assets.map(a=>[a.id,{id:a.id}])),null)(g);const ledges=g.movers.filter(m=>m.arena);assert.equal(calls.length,3);for(let i=0;i<3;i++){assert.equal(ledges[i].visual,'garden-deck-v1');assert.equal(calls[i].y,ledges[i].y);assert.equal(calls[i].x,ledges[i].x-camera);assert.equal(calls[i].w,ledges[i].w);assert.equal(calls[i].h,16);}
 for(const l of LEVELS.filter(l=>l.boss&&l.world!==1))assert.ok(l.movers.every(m=>m.visual===undefined));
});
