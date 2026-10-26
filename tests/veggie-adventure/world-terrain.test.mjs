import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import {terrainTileId} from '../../public/games/veggie-adventure/js/render.mjs';
const base='public/games/veggie-adventure/assets/',manifest=JSON.parse(fs.readFileSync(base+'manifest.json'));

test('eight worlds use independent generated material atlases, each with soil and foundation variants',()=>{
 const report=JSON.parse(fs.readFileSync('art-source/veggie-adventure/terrain/world-specific-v3/build-report.json'));
 assert.equal(Object.keys(manifest.terrainSets).length,8);assert.equal(new Set(report.worlds.map(w=>w.sourceSha256)).size,8);
 for(const [world,set] of Object.entries(manifest.terrainSets)){
  assert.equal(set.soil.length,2);assert.equal(set.foundation.length,2);
  for(const id of [...set.soil,...set.foundation]){const a=manifest.assets.find(a=>a.id===id);assert.equal(a.world,world);assert.equal(a.stage,'world-terrain-runtime-v3');assert.ok(a.path.startsWith('terrain/world-specific-v3/'));assert.ok(fs.existsSync('art-source/veggie-adventure/'+a.source));}
 }
});

test('all 32 world tiles are opaque and every A/B neighbor and soil-foundation combination joins exactly',async()=>{
 for(const set of Object.values(manifest.terrainSets)){
  const load=async id=>{const a=manifest.assets.find(a=>a.id===id),data=await sharp(base+a.path).ensureAlpha().raw().toBuffer();assert.equal(data.length,48*48*4);for(let i=3;i<data.length;i+=4)assert.equal(data[i],255);return data;};
  const soils=await Promise.all(set.soil.map(load)),stones=await Promise.all(set.foundation.map(load));
  for(const group of [soils,stones])for(const a of group)for(const b of group)for(let y=0;y<48;y++)assert.deepEqual(a.subarray((y*48+47)*4,(y*48+48)*4),b.subarray(y*48*4,(y*48+1)*4));
  for(const a of [...soils,...stones])for(const b of stones)assert.deepEqual(a.subarray(47*48*4),b.subarray(0,48*4));
  assert.notDeepEqual(soils[0],soils[1]);assert.notDeepEqual(stones[0],stones[1]);
 }
});

test('ground materials vary by stable world coordinates, preserve bridges, and support legacy maps',()=>{
 const images=new Map(manifest.assets.map(a=>[a.id,a]));
 for(const world of Object.keys(manifest.terrainSets))for(const layer of [0,1]){
  const used=new Set();for(let x=0;x<256;x+=16){const id=terrainTileId(world+'-kit',layer,x,208,images);used.add(id);assert.ok(images.has(id));assert.equal(id,terrainTileId(world+'-kit',layer,x,208,images));}
  assert.equal(used.size,2);assert.equal(terrainTileId(world+'-kit',2,0,208,images),world+'-kit-2');
  assert.equal(terrainTileId(world+'-kit',layer,0,208,new Map()),world+'-kit-'+layer);
 }
});
