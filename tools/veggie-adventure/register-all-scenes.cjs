'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),art=path.join(root,'art-source/veggie-adventure'),doc=path.join(root,'docs/veggie-adventure/scenes');
async function main(){
 const plan=JSON.parse(fs.readFileSync(path.join(doc,'all-worlds-generation-plan.json'),'utf8'));
 const first=JSON.parse(fs.readFileSync(path.join(art,'scenes/manifest.json'),'utf8')).assets;
 const records=new Map();for(const f of fs.readdirSync(doc).filter(f=>/^all-worlds-run-\d+\.json$/.test(f)).sort())for(const r of JSON.parse(fs.readFileSync(path.join(doc,f),'utf8')))records.set(r.id,r);
 const assets=[...first];
 for(const e of plan.entries){const r=records.get(e.id);if(!r)continue;
 const name=e.id.toLowerCase()+'-'+(r.version||'v1'),rel='scenes/world-'+e.world+'/'+name+'.png',target=path.join(art,rel),bytes=fs.readFileSync(r.source);
 fs.mkdirSync(path.dirname(target),{recursive:true});if(fs.existsSync(target))assert.ok(fs.readFileSync(target).equals(bytes),'Refuse overwrite '+e.id);else fs.copyFileSync(r.source,target);
 const prompt='prompts/scenes/'+name+'.txt';fs.writeFileSync(path.join(art,prompt),r.prompt||e.prompt);
 const meta=await sharp(target).metadata(),{data}=await sharp(target).ensureAlpha().raw().toBuffer({resolveWithObject:true});let zero=0,visible=0;for(let i=3;i<data.length;i+=4){if(!data[i])zero++;if(data[i]>200)visible++;}
 assert.equal(meta.format,'png');if(e.transparent)assert.ok(meta.hasAlpha&&zero>0&&visible>0,e.id+' alpha');
 assets.push({id:e.id,world:e.world,kind:e.kind,path:rel,prompt,width:meta.width,height:meta.height,transparent:e.transparent,alphaZero:zero,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),runtimeReady:false,review:r.review||'源图已查看；待切分、网格和实机校准'});
 }
 assert.equal(new Set(assets.map(a=>a.id)).size,assets.length);
 const missing=plan.entries.filter(e=>!records.has(e.id)).map(e=>e.id);
 fs.writeFileSync(path.join(art,'scenes/all-worlds-manifest.json'),JSON.stringify({scope:plan.scope,planned:40,generated:assets.length,missing,assets},null,2));
 console.log(JSON.stringify({generated:assets.length,planned:40,transparent:assets.filter(a=>a.transparent).length,missing}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
