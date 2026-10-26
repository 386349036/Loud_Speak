'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const repo=path.resolve(__dirname,'../..');
const base=path.join(repo,'docs/veggie-adventure');
const roster=JSON.parse(fs.readFileSync(path.join(base,'roster.json'),'utf8'));
const rows=roster.characters;
const expected=Object.values(roster.counts).reduce((n,c)=>n+c,0);
assert.equal(rows.length,expected);
assert.equal(new Set(rows.map(c=>c.id)).size,expected);
assert.equal(new Set(rows.map(c=>c.slug)).size,expected);
for(const [category,count] of Object.entries(roster.counts)) assert.equal(rows.filter(c=>c.category===category).length,count,category);
for(const c of rows){
  for(const key of ['id','slug','name','ingredient','silhouette','palette','ability','counterplay','dangerCue','states','assetPrefix','card']) assert.ok(typeof c[key]==='string'&&c[key].trim(),c.id+': '+key);
  assert.ok(c.animations.length>0);
  assert.equal(new Set(c.animations).size,c.animations.length);
  assert.match(c.slug,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  const card=fs.readFileSync(path.join(base,c.card),'utf8');
  assert.ok(card.includes(c.id+' '+c.name));
  for(const a of c.animations)assert.ok(card.includes('- '+a),c.id+': animation '+a);
  assert.ok(fs.existsSync(path.join(repo,'public/games/veggie-adventure/assets',c.assetPrefix)),c.assetPrefix);
  if(c.baseId) assert.ok(rows.find(r=>r.id===c.baseId&&r.category==='enemy'));
  if(c.category==='boss'){assert.equal(c.health,c.hp);assert.ok(c.hp>=6);assert.ok(c.weakness);}
}
assert.deepEqual(rows.filter(c=>c.category==='boss').map(c=>c.world).sort((a,b)=>a-b),[1,2,3,4,5,6,7,8]);
const manifest=JSON.parse(fs.readFileSync(path.join(repo,'public/games/veggie-adventure/assets/manifest.json'),'utf8'));
assert.equal(manifest.artDirection,roster.artDirection);
for(const a of manifest.assets)assert.ok(fs.existsSync(path.join(repo,'public/games/veggie-adventure/assets',a.path)),a.path);
console.log(JSON.stringify({status:'passed',characters:rows.length,cards:rows.length,bossWorlds:8,runtimeAssets:manifest.assets.length,boundary:'Structure only; prototype runtime assets do not imply visual acceptance'},null,2));
