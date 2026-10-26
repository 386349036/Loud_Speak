import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import sharp from 'sharp';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {bossWeakTop} from '../../public/games/veggie-adventure/js/core/bosses.mjs';
import {createRenderer,cameraX} from '../../public/games/veggie-adventure/js/render.mjs';
import {bossCue} from '../../public/games/veggie-adventure/js/core/boss-cues.mjs';
import {auditCampaignLevel} from '../../tools/veggie-adventure/review-campaign-rules.mjs';
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-boss-halving-layouts.json',import.meta.url))),manifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));

const halved=JSON.parse(fs.readFileSync(new URL('./fixtures/pre-boss-compact-layouts.json',import.meta.url)));

test('the previous eight boss approaches halve their width and keep the full arena, rewards and safe splice support',()=>{
 assert.equal(before.length,8);for(const old of before){const l=halved.find(l=>l.id===old.id),delta=old.width/2;assert.equal(l.width,delta);assert.equal(l.exit,old.exit-delta);assert.equal(l.width-l.exit,48);assert.equal(l.timeLimit,old.timeLimit);assert.deepEqual(l.spawn,old.spawn);assert.equal(l.background,old.background);assert.equal(l.terrain,old.terrain);assert.equal(l.bossRouteVersion,1);assert.ok(l.layoutVersion>old.layoutVersion);
  assert.deepEqual(l.boss,{...old.boss,x:old.boss.x-delta,left:old.boss.left-delta,right:old.boss.right-delta});assert.deepEqual(l.movers.filter(m=>m.arena),old.movers.filter(m=>m.arena).map(m=>({...m,x:m.x-delta,baseX:m.baseX-delta})));assert.equal(l.boss.right-l.boss.left,288);
  const x=l.bossRouteReduction.from;for(const edge of [x-127,x+127])assert.ok(l.platforms.some(p=>edge>=p.x&&edge<p.x+p.w&&p.y===208));assert.deepEqual(auditCampaignLevel(l),[],l.id);
  let end=0;for(const s of l.sections){assert.equal(s.from,end);assert.ok(s.to>s.from);end=s.to;}assert.equal(end,l.width);assert.ok(l.blocks.some(b=>['carrot','chili'].includes(b.item)&&b.x>l.boss.left-640));
 }
});

test('all eight shortened routes are physically traversable in every standing form, including pools and the splice',()=>{
 for(const old of before)for(const form of [0,1,2])for(const lead of [6,12]){
  const l=structuredClone(levelById(old.id));l.enemies=[];l.items=[];l.boss=null;l.hazards=[];l.turrets=[];const g=new Game(l,{form});g.hitBlock=()=>{};let jump=false,last=-1,stuck=0;
  for(let n=0;n<120*90&&g.mode==='playing';n++){const p=g.p,foot=p.y+p.h,solids=g.solids(),ahead=p.x+p.w+lead,floor=solids.some(s=>ahead>=s.x&&ahead<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20),obstacle=solids.some(s=>!s.oneWay&&s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+16&&s.y<foot&&s.y+s.h>p.y),press=p.grounded&&(!floor||obstacle||stuck>30);
   if(press)jump=true;else if(p.grounded)jump=false;g.step(STEP,{right:true,jump:jump||p.inWater,jumpPressed:press});stuck=Math.abs(g.p.x-last)<.02?stuck+1:0;last=g.p.x;assert.equal(g.p.form,form);assert.equal(g.p.crouch,false);assert.equal(g.rebirths,3);if(stuck>240)break;
  }assert.equal(g.mode,'won',`${old.id}/form${form}/lead${lead} x=${g.p.x}`);assert.ok(g.blocks.every(b=>!b.broken),old.id+'/form'+form+'/lead'+lead+' broken '+JSON.stringify(g.blocks.filter(b=>b.broken).map(b=>[b.x,b.y])));
 }
});

test('long-layout saves at the old far arena migrate safely, retaining progression and rejecting malformed layouts',()=>{
 for(const old of before)for(const status of ['playing','dead','won','gameover']){
  const g=new Game(old,{score:12000,form:2,rebirths:1});g.p.x=old.boss.left+32;g.p.y=208-g.p.h;g.score=12500;g.saveCheckpoint();g.mode=status;g.pendingRebirth=status==='dead';if(status==='gameover')g.rebirths=0;
  const raw=JSON.parse(encodeSave(g,['1-1','1-2','1-3'])),saved=decodeSave(JSON.stringify(raw));assert.ok(saved,old.id+'/'+status);assert.equal(saved.layoutMigrated,true);assert.equal(saved.layoutVersion,levelById(old.id).layoutVersion);const c=new Campaign();c.restore(saved);assert.equal(c.game.p.x+c.game.p.w/2,old.spawn.x+6);assert.equal(c.game.rebirths,g.rebirths);assert.equal(c.game.mode,status==='dead'?'playing':status);assert.equal(c.game.score,['won','gameover'].includes(status)?12500:12000);assert.ok(c.completed.has('1-3'));assert.ok(decodeSave(encodeSave(c.game,[...c.completed])));
  for(const corrupt of [d=>d.checkpoint.p.x=old.width+32,d=>d.checkpoint.blocks.pop(),d=>d.layoutVersion=levelById(old.id).layoutVersion]){const bad=structuredClone(raw);corrupt(bad);assert.equal(decodeSave(JSON.stringify(bad)),null);}
 }
});

function render(g,width){const draws=[],stack=[];let a=3,d=3,e=0,f=0;const ctx=new Proxy({save(){stack.push([a,d,e,f]);},restore(){[a,d,e,f]=stack.pop();},setTransform(aa,b,c,dd,ee,ff){a=aa;d=dd;e=ee;f=ff;},translate(x,y){e+=a*x;f+=d*y;},scale(x,y){a*=x;d*=y;},drawImage(img,...v){if(v.length===4)draws.push({id:img.id,x:(e+a*v[0])/3,y:(f+d*v[1])/3,w:a*v[2]/3,h:d*v[3]/3});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});const snap=g.snapshot();createRenderer({width:width*3,getContext:()=>ctx},new Map(manifest.assets.map(a=>[a.id,{id:a.id}])),null)(g);assert.deepEqual(g.snapshot(),snap);return draws;}

test('weak PNG stays centered above the actual boss head in world coordinates at every HUD scale',()=>{
 for(const old of before)for(const width of [192,256,650])for(const dx of [40,200])for(const y of [144,176]){const g=new Game(levelById(old.id));g.enemies=[];g.items=[];Object.assign(g.boss,{active:true,phase:'expose',x:g.boss.left+dx,y,timer:0,invulnerable:0});g.p.x=g.boss.x-32;const b=g.boss,draws=render(g,width),world=draws.filter(d=>d.id==='boss-cue-weak'&&d.w===28);assert.equal(world.length,1);const icon=world[0],center=b.x+b.w/2-cameraX(g.level,g.p,b,width);assert.ok(Math.abs(icon.x+icon.w/2-center)<=.51);assert.ok(icon.y+icon.h<=Math.min(bossWeakTop(g,b),b.y-8)-3.5);}
});

test('garden boss windups show distinct PNG skill cues and visible landing or charge-path markers',()=>{
 for(const pattern of ['slam','hop','seeds','dash'])for(const dir of [-1,1]){const g=new Game(levelById('1-4'));g.enemies=[];g.items=[];g.time=.12;const b=g.boss;Object.assign(b,{active:true,phase:'windup',pattern,direction:dir,targetX:b.x+dir*64,targetFloor:208,seedVX:dir*90,seedVY:-90});const draws=render(g,256),id=bossCue(b).asset;assert.ok(draws.some(d=>d.id===id&&Math.abs(d.w)>26&&Math.abs(d.w)<29&&d.y<b.y-32));if(pattern==='dash')assert.ok(draws.some(d=>d.id==='boss-cue-dash'&&Math.abs(d.w)===16&&d.y===192));else assert.ok(draws.some(d=>d.id==='boss-cue-target'&&d.w===32&&d.y===194));}
});

test('all six generated warning PNGs retain transparency and strong visible silhouettes',async()=>{
 for(const id of ['slam','hop','seeds','dash','weak','target']){const asset=manifest.assets.find(a=>a.id==='boss-cue-'+id);assert.equal(asset.stage,'boss-cues-v2');const {data,info}=await sharp('public/games/veggie-adventure/assets/'+asset.path).ensureAlpha().raw().toBuffer({resolveWithObject:true});assert.equal(info.width,96);assert.equal(info.height,96);let clear=0,solid=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>200)solid++;}assert.ok(clear>300&&solid>300,id);}
});
