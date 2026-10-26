import test from 'node:test';import assert from 'node:assert/strict';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {WARP_ROOM} from '../../public/games/veggie-adventure/levels/warp-room.mjs';
import {sceneFrame,cameraX,createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
import {viewportSize} from '../../public/games/veggie-adventure/js/viewport.mjs';
import fs from 'node:fs';import sharp from 'sharp';import crypto from 'node:crypto';
function entrance(rightFirst=false,jump=true,level=LEVELS[0]){const g=new Game(level);g.enemies=[];for(let n=0;n<25;n++)g.step(STEP);if(rightFirst)g.step(STEP,{right:true});for(let n=0;n<150&&!g.warpRequested;n++)g.step(STEP,{left:true,jump,jumpPressed:jump&&n===0});return g;}

test('only an initial leftward airborne boundary contact in 1-1 opens the hidden entrance',()=>{
 assert.equal(entrance().warpRequested,true);assert.equal(entrance(true).warpRequested,false);assert.equal(entrance(false,false).warpRequested,false);assert.equal(entrance(false,true,LEVELS[1]).warpRequested,false);
 const c=new Campaign();assert.equal(c.openWarpRoom(),false);c.game=entrance();assert.equal(c.openWarpRoom(),true);assert.equal(c.game.level.warpRoom,true);
});

test('all selectors and their PNG badges stay on one screen at desktop, phone and portrait sizes',()=>{
 for(const [w,h] of [[1920,919],[1280,720],[844,390],[844,304],[390,844],[360,800]]){
  const v=viewportSize(w,h),f=sceneFrame(WARP_ROOM,v.width);
  assert.ok(f.x>=0&&f.y>=0);assert.equal(f.width,512);assert.equal(cameraX(WARP_ROOM,{x:480},null,v.width),0);
  for(const b of WARP_ROOM.blocks){const x=f.x+(b.x-3)*f.scale,right=f.x+(b.x+19)*f.scale,y=f.y+(b.y-14)*f.scale,bottom=f.y+(b.y+16)*f.scale;
   assert.ok(x>=0&&right<=v.width&&y>=0&&bottom<=240,`${w}x${h}/${b.warpTo} clipped`);assert.equal(b.w,16);assert.equal(b.h,16);
  }
 }
});

function settle(g,n=120){for(let i=0;i<n;i++)g.step(STEP);assert.equal(g.warpTarget,null);assert.equal(g.mode,'playing');}
function moveTo(g,x){for(let i=0;i<1200;i++){const dx=x-g.p.x;if(Math.abs(dx)<1.1&&Math.abs(g.p.vx)<3)return;const projected=g.p.x+g.p.vx*.12,dir=projected<x-1?1:projected>x+1?-1:0;g.step(STEP,{left:dir<0,right:dir>0});assert.equal(g.warpTarget,null,'walking accidentally selected '+g.warpTarget);}assert.fail('failed to walk to '+x+' from '+g.p.x);}
function hop(g,targetX=null){let airborne=false;for(let i=0;i<240;i++){const dir=targetX==null?0:g.p.x<targetX-.5?1:g.p.x>targetX+.5?-1:0;g.step(STEP,{jump:true,jumpPressed:i===0,left:dir<0,right:dir>0});assert.equal(g.warpTarget,null,'climbing accidentally selected '+g.warpTarget);airborne||=!g.p.grounded;if(airborne&&g.p.grounded)return;}assert.fail('jump never landed');}

test('every one of the 32 selectors is reachable from the real entrance using walking and standing jumps',()=>{
 for(const b of WARP_ROOM.blocks){const g=new Game(WARP_ROOM);settle(g,10);
  if(b.world<=4){moveTo(g,122);settle(g,20);hop(g);assert.equal(g.p.y+g.p.h,168);hop(g);assert.equal(g.p.y+g.p.h,120);settle(g,30);}
  moveTo(g,b.x+2);settle(g,20);assert.equal(g.p.y+g.p.h,b.world<=4?120:216);
  for(let i=0;i<180&&!g.warpTarget;i++)g.step(STEP,{jump:true,jumpPressed:i===0});assert.equal(g.warpTarget,b.warpTo,'wrong physical selector '+b.warpTo);
 }
});

test('upper shelves support dropping through safely and the room never starts the stage timer or completes',()=>{
 const g=new Game(WARP_ROOM),remaining=g.remaining;settle(g,10);moveTo(g,122);settle(g,20);hop(g);hop(g);settle(g,30);assert.equal(g.p.y+g.p.h,120);
 moveTo(g,123);settle(g,30);g.step(STEP,{down:true,jump:true,jumpPressed:true});settle(g,150);assert.equal(g.p.y+g.p.h,168);
 g.step(STEP,{down:true,jump:true,jumpPressed:true});settle(g,150);assert.equal(g.p.y+g.p.h,216);assert.equal(g.remaining,remaining);assert.equal(g.mode,'playing');
});

test('only four shared PNG digits appear above the world soils, without world text or full stage labels',async()=>{
 const m=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')),images=new Map(m.assets.map(a=>[a.id,{id:a.id}])),draws=[],texts=[];
 let tx=0,ty=0;const stack=[];
 const ctx=new Proxy({save(){stack.push([tx,ty]);},restore(){[tx,ty]=stack.pop();},translate(x,y){tx+=x;ty+=y;},setTransform(){tx=0;ty=0;},drawImage(img,...args){draws.push({id:img.id,args,x:tx+args[0],y:ty+args[1]});},fillText(value){texts.push(value);}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)}),g=new Game(WARP_ROOM),before=g.snapshot();createRenderer({width:1536,getContext:()=>ctx},images,null)(g);assert.deepEqual(g.snapshot(),before);
 const hashes=[];for(const b of WARP_ROOM.blocks){const a=m.assets.find(a=>a.id===b.labelAsset);assert.ok(a);assert.equal(a.label,b.warpTo.split('-')[1]);assert.equal(a.stage,'warp-digits-v1');const {data,info}=await sharp('public/games/veggie-adventure/assets/'+a.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,16);assert.equal(info.height,20);assert.equal(data[3],0);assert.ok(data.some((v,i)=>i%4===3&&v>100));hashes.push(crypto.createHash('sha256').update(data).digest('hex'));
  assert.ok(draws.some(d=>d.id===b.labelAsset&&d.y+d.args[3]<b.y));assert.ok(draws.some(d=>d.id===b.terrain+'-0'&&d.x===b.x&&d.y===b.y&&d.args[2]===16&&d.args[3]===16));
 }assert.equal(new Set(hashes).size,4);assert.equal(draws.filter(d=>d.id.startsWith('warp-stage-')).length,32);assert.ok(!draws.some(d=>d.id.startsWith('warp-label-')));assert.ok(!texts.includes('出口'));assert.ok(!texts.some(t=>/[苔矿藤莲果作月王]|[1-8][-·]/.test(t)),'world titles and full labels must not render');
});

test('both side aisles let the hero walk off the upper row and land on the ground without a down-jump',()=>{
 assert.equal(WARP_ROOM.movers.filter(m=>m.kind==='warp-step').length,3);assert.ok(WARP_ROOM.movers.every(m=>m.x>=16&&m.x+m.w<=480));
 for(const target of [0,500]){const g=new Game(WARP_ROOM);settle(g,10);moveTo(g,122);settle(g,20);hop(g);hop(g);settle(g,30);assert.equal(g.p.y+g.p.h,120);moveTo(g,target);settle(g,180);assert.equal(g.p.y+g.p.h,216);assert.equal(g.warpTarget,null);assert.equal(g.mode,'playing');}
});

test('all 32 numbered blocks are in campaign order and can be struck by a real jump',()=>{
 assert.equal(WARP_ROOM.blocks.length,32);assert.deepEqual(WARP_ROOM.blocks.map(b=>b.warpTo),LEVELS.map(l=>l.id));
 for(const [i,b] of WARP_ROOM.blocks.entries()){if(i&&b.y===WARP_ROOM.blocks[i-1].y)assert.ok(b.x>WARP_ROOM.blocks[i-1].x+WARP_ROOM.blocks[i-1].w);
  const g=new Game(WARP_ROOM);g.p.x=b.x+2;g.p.y=(b.world<=4?120:216)-g.p.h;for(let n=0;n<10;n++)g.step(STEP);for(let n=0;n<150&&!g.warpTarget;n++)g.step(STEP,{jump:true,jumpPressed:n===0});assert.equal(g.warpTarget,b.warpTo);
  const c=new Campaign();c.game=g;c.game.rebirths=2;assert.equal(c.warpTo(b.warpTo),true);assert.equal(c.game.level.id,b.warpTo);assert.equal(c.game.p.form,0);assert.equal(c.game.rebirths,2);assert.equal(c.game.mode,'playing');assert.equal(c.completed.size,0);
 }
});
