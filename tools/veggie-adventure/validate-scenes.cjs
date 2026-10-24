'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),art=path.join(root,'art-source/veggie-adventure');
async function main(){
 const m=JSON.parse(fs.readFileSync(path.join(art,'scenes/all-worlds-manifest.json'),'utf8'));
 assert.equal(m.generated,40);assert.deepEqual(m.missing,[]);let transparent=0;
 for(const a of m.assets){const file=path.join(art,a.path),bytes=fs.readFileSync(file);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),a.sha256,a.id);
 const meta=await sharp(file).metadata();assert.equal(meta.width,a.width);assert.equal(meta.height,a.height);assert.equal(meta.format,'png');assert.equal(a.runtimeReady,false);
 if(a.transparent){transparent++;const {data}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let zero=0,visible=0;for(let i=3;i<data.length;i+=4){if(data[i]===0)zero++;if(data[i]>200)visible++;}assert.ok(meta.hasAlpha&&zero>0&&visible>0,a.id);}
 assert.ok(fs.readFileSync(path.join(art,a.prompt),'utf8').trim().length>40);
 }
 assert.equal(transparent,24);
 const html=fs.readFileSync(path.join(art,'scene-library.html'),'utf8');for(const match of html.matchAll(/href="([^"#]+)"/g))assert.ok(fs.existsSync(path.resolve(art,match[1])),match[1]);
 new Function(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 const map=JSON.parse(fs.readFileSync(path.join(root,'docs/veggie-adventure/scenes/level-asset-map.json'),'utf8')).levels;
 assert.equal(new Set(map.map(l=>l.id)).size,32);for(let w=1;w<=8;w++)for(let l=1;l<=4;l++)assert.ok(map.some(x=>x.id===w+'-'+l));
 for(const l of map){assert.equal(l.runtimeReady,false);for(const id of [l.background,l.mid,l.terrain,l.special,...l.sharedAssets,...l.extraAssets].filter(Boolean))assert.ok(m.assets.some(a=>a.id===id),l.id+' '+id);}
 console.log(JSON.stringify({status:'passed',pngs:40,sha256:40,alpha:24,levels:32,staticLinks:'passed',browserInteraction:'not-verified',runtimeReady:false},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
