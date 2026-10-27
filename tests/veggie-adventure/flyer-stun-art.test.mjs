import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import crypto from 'node:crypto';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {hurtEnemy,ENEMY_ART} from '../../public/games/veggie-adventure/js/core/enemies.mjs';
import {AnimationPlayer,enemyClip} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
const base='public/games/veggie-adventure/assets/',m=JSON.parse(fs.readFileSync(base+'manifest.json')),actors=m.animations.actors;
function scene(kind){const l=structuredClone(new Game().level);Object.assign(l,{width:600,exit:580,platforms:[{x:0,y:208,w:600,h:32}],water:[],blocks:[],items:[],movers:[],hazards:[],gates:[],turrets:[],boss:null,enemies:[{id:0,kind,x:220,y:110,w:14,h:14,homeX:220,homeY:110,vx:0,vy:0,state:'walk',phase:0,timer:0,grace:0,dead:false}]});return new Game(l);}

test('two generated flyer atlases retain every old flight pixel and add twelve distinct transparent stun frames each',async()=>{
 for(const id of ['E11','E09']){const a=actors[id],asset=m.assets.find(x=>x.id===a.asset),old=await sharp(base+'animations/'+id+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true}),current=await sharp(base+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(current.info.height,old.info.height+144);assert.ok(current.data.subarray(0,old.data.length).equals(old.data));
  for(const name of ['fall-stunned','stunned','wake']){const clip=a.clips[name],hashes=[];assert.ok(clip);for(let col=0;col<4;col++){const data=await sharp(base+asset.path).extract({left:col*48,top:clip.row*48,width:48,height:48}).ensureAlpha().raw().toBuffer();let clear=0,solid=0;for(let i=3;i<data.length;i+=4){if(!data[i])clear++;if(data[i]>128)solid++;}assert.ok(clear>500&&solid>80,id+'/'+name);hashes.push(crypto.createHash('sha256').update(data).digest('hex'));}assert.equal(new Set(hashes).size,4,id+'/'+name);}
 }
});

test('both species select their own fall, grounded stun and wake clips and never a shell clip',()=>{
 for(const kind of ['winged','cloud'])for(const grounded of [false,true])for(const timer of [0,4,8.5]){const g=scene(kind),e=g.enemies[0],a=new AnimationPlayer();Object.assign(e,{state:'stunned',grounded,timer});a.update(g,0);assert.equal(a.get(e).actor,ENEMY_ART[kind]);const clip=!grounded?'fall-stunned':timer>=8?'wake':'stunned';assert.equal(enemyClip(e),clip);assert.equal(a.get(e).clip,clip);assert.ok(actors[ENEMY_ART[kind]].clips[clip]);}
});

test('fallback rendering draws the matching flyer PNG instead of cabbage shell even without an animation player',()=>{
 for(const kind of ['winged','cloud']){const g=scene(kind),e=g.enemies[0],draws=[];Object.assign(e,{state:'stunned',grounded:true,y:194});const ctx=new Proxy({drawImage(img){draws.push(img.id);}},{get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});createRenderer({width:768,getContext:()=>ctx},new Map(m.assets.map(a=>[a.id,{id:a.id}])),null,{actors})(g);assert.ok(draws.includes(ENEMY_ART[kind]+'-stunned'));assert.ok(!draws.includes('objects-5'));assert.ok(!draws.includes('anim-E02'));}
});

test('defeated flying units fall visually to the real platform, show their own unconscious pose, then disappear',()=>{
 for(const kind of ['winged','cloud']){const g=scene(kind),e=g.enemies[0],a=new AnimationPlayer();a.update(g,0);while(!e.dead)hurtEnemy(g,e,'fire');a.update(g,0);assert.equal(a.ghosts.length,1);assert.equal(a.ghosts[0].actor,ENEMY_ART[kind]);assert.equal(a.ghosts[0].clip,'fall-stunned');const score=g.score,hp=e.hp;let grounded=false,lastY=e.y;
  for(let n=0;n<360&&a.ghosts.length;n++){g.time+=STEP;const before=g.snapshot();a.update(g,STEP);assert.deepEqual(g.snapshot(),before);if(a.ghosts.length){const ghost=a.ghosts[0];assert.equal(ghost.actor,ENEMY_ART[kind]);assert.ok(ghost.y>=lastY);lastY=ghost.y;if(ghost.grounded){grounded=true;assert.equal(ghost.y+ghost.h,208);assert.equal(ghost.clip,'stunned');}}}
  assert.ok(grounded);assert.equal(a.ghosts.length,0);assert.equal(e.dead,true);assert.equal(e.hp,hp);assert.equal(g.score,score);assert.equal(g.mode,'playing');
 }
});
