import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {WARP_ROOM} from '../../public/games/veggie-adventure/levels/warp-room.mjs';
import {assetsForLevel,createAssetLoader} from '../../public/games/veggie-adventure/js/asset-loader.mjs';
const assets=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json')).assets;
test('every stage loads its actual background, terrain, shared sprites and boss without unrelated world backgrounds',()=>{
 for(const level of [...LEVELS,WARP_ROOM]){
  const ids=new Set(assetsForLevel(assets,level).map(a=>a.id));assert.ok(ids.has(level.background||'W01-far'));if(level.mid!==null)assert.ok(ids.has(level.mid||'W01-mid'));
  assert.ok(ids.has('anim-P01-0'));assert.ok(ids.has('anim-FX01'));for(const a of assets.filter(a=>a.id.startsWith((level.terrain||'W01-kit')+'-')))assert.ok(ids.has(a.id));
  if(level.boss)assert.ok(ids.has('anim-'+level.boss.id));
  for(const id of ids)if(/^W\d\d-(far|mid|arena)$/.test(id))assert.ok([level.background||'W01-far',...(level.mid===null?[]:[level.mid||'W01-mid'])].includes(id));
 }
 const warp=new Set(assetsForLevel(assets,WARP_ROOM).map(a=>a.id));for(let n=1;n<=8;n++)assert.ok(warp.has('W0'+n+'-kit-0'));
 const first=assetsForLevel(assets,LEVELS[0]),sum=rows=>rows.reduce((n,a)=>n+fs.statSync('public/games/veggie-adventure/assets/'+a.path).size,0);assert.ok(sum(first)<sum(assets)*.25);
});
test('bounded image loads deduplicate concurrent requests and use immutable content revisions',async()=>{
 let active=0,peak=0,count=0;const pending=[],images=new Map();
 class Image{set src(url){this.url=url;count++;active++;peak=Math.max(peak,active);pending.push(()=>{active--;this.onload();});}}
 const loader=createAssetLoader({assets:assets.slice(0,12),images,Image,concurrency:3,revision:'1234567890abcdef'}),level=LEVELS[0],a=loader.ensure(level),b=loader.ensure(level);
 while(pending.length){assert.ok(pending.length<=3);pending.shift()();await Promise.resolve();}await Promise.all([a,b]);assert.ok(peak<=3);assert.equal(count,images.size);assert.equal(loader.ensure(level),null);for(const img of images.values())assert.match(img.url,/\?v=1234567890abcdef$/);
});
test('failed loads settle, keep successful images and can retry without replaying completed downloads',async()=>{
 let fail=true,count=0;const images=new Map();class Image{set src(url){count++;queueMicrotask(()=>{if(fail&&url.includes('bad'))this.onerror();else this.onload();});}}
 const loader=createAssetLoader({assets:[{id:'good',path:'good.png'},{id:'bad',path:'bad.png'}],images,Image});
 await assert.rejects(loader.ensure(LEVELS[0]),/bad.png/);assert.ok(images.has('good'));assert.ok(!images.has('bad'));fail=false;await loader.ensure(LEVELS[0]);assert.equal(count,3);assert.equal(images.size,2);
});
