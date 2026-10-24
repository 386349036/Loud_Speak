'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('sharp');
const root=path.resolve(__dirname,'../..'), art=path.join(root,'art-source/veggie-adventure');
const doc=path.join(root,'docs/veggie-adventure');
const plan=JSON.parse(fs.readFileSync(path.join(doc,'asset-generation-plan.json'),'utf8'));
const runDir=path.join(doc,'generation-runs');
const records=new Map();
for(const name of fs.readdirSync(runDir).filter(n=>/^batch-.*\.json$/.test(n)).sort()){
 for(const r of JSON.parse(fs.readFileSync(path.join(runDir,name),'utf8'))) records.set(r.id,r);
}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const write=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);};
async function main(){
 const assets=[];
 for(const e of plan.entries){
  const r=records.get(e.id); if(!r)continue;
  if(!fs.existsSync(r.source))throw Error('Missing source '+e.id);
  const bytes=fs.readFileSync(r.source), sha=hash(bytes);
  const name=e.id.toLowerCase()+'-'+e.slug+'-'+(r.version||'v1');
  const rel='originals/'+e.kind+'/'+name+'.png', target=path.join(art,rel);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(fs.existsSync(target)){if(hash(fs.readFileSync(target))!==sha)throw Error('Refuse overwrite '+target);}
  else fs.copyFileSync(r.source,target);
  const promptRel='prompts/'+e.kind+'/'+name+'.txt';
  write(path.join(art,promptRel),r.prompt||e.prompt);
  const metadata=await sharp(target).metadata();
  const {data,info}=await sharp(target).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let zero=0,partial=0,opaque=0,max=0;
  for(let i=3;i<data.length;i+=4){const a=data[i];max=Math.max(max,a);if(a===0)zero++;else if(a===255)opaque++;else partial++;}
  if(e.transparent&&(!metadata.hasAlpha||zero===0||max<200))throw Error('Invalid alpha '+e.id);
  const corners=[3,(info.width-1)*4+3,((info.height-1)*info.width)*4+3,data.length-1].map(i=>data[i]);
  const a={id:e.id,name:e.name,kind:e.kind,path:rel,prompt:promptRel,sha256:sha,width:metadata.width,height:metadata.height,hasAlpha:!!metadata.hasAlpha,transparent:e.transparent,alpha:{zero,partial,opaque,max,corners},stage:'concept-source',runtimeReady:false,review:r.review||'Pending visual review',referenceIds:r.referenceIds||['P01']};
  assets.push(a);
 }
 const manifest={schemaVersion:1,date:'2026-10-24',scope:plan.scope,planned:plan.entries.length,generated:assets.length,assets};
 write(path.join(art,'concept-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>蔬果大冒险 · 形象资产库</title><style>body{margin:0;background:#17231e;color:#eee8d8;font:16px/1.6 system-ui}header{padding:28px 4vw}main{padding:0 4vw 40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:24px}article{background:#25382e;border-radius:12px;overflow:hidden}h2,p{margin:12px 18px}img{width:100%;display:block;background-color:#ddd;background-image:linear-gradient(45deg,#c1c1c1 25%,transparent 25%),linear-gradient(-45deg,#c1c1c1 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#c1c1c1 75%),linear-gradient(-45deg,transparent 75%,#c1c1c1 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}a{color:#b6e4a8}small{color:#c0ccb9}</style><header><h1>蔬果大冒险 · 形象资产库</h1><p>32-bit二维像素 · 先形象后比例 · 当前 '+assets.length+'/'+plan.entries.length+' 张新增概念素材。角色卡为透明PNG；场景背景单独存放。尚非运行精灵或完整动画。</p><p><a href="concepts/p01-transparent-v2.png">P01 芽豆透明形象基准</a></p></header><main>'+assets.map(a=>'<article><a href="'+esc(a.path)+'"><img loading="lazy" src="'+esc(a.path)+'" alt="'+esc(a.id+' '+a.name)+'"></a><h2>'+esc(a.id+' '+a.name)+'</h2><p><small>'+a.width+'×'+a.height+' · '+(a.transparent?'Alpha透明':'场景背景')+' · 概念稿</small></p><p>'+esc(a.review)+'</p><p><a href="'+esc(a.prompt)+'">完整提示词</a></p></article>').join('')+'</main></html>';
 write(path.join(art,'index.html'),html);
 write(path.join(doc,'ASSET_PROGRESS.md'),'# 素材生成进度\n\n已生成 '+assets.length+' / '+plan.entries.length+' 张新增概念素材。已有P01透明基准另计。\n\n先形象、后按实际需求调整比例；没有运行精灵、完整动画或音频交付。\n\n| ID | 名称 | 类别 | 尺寸 | Alpha | 查看 |\n|---|---|---|---|---|---|\n'+assets.map(a=>'| '+a.id+' | '+a.name+' | '+a.kind+' | '+a.width+'×'+a.height+' | '+(a.transparent?'已检查':'背景')+' | [PNG](../../art-source/veggie-adventure/'+a.path+') |').join('\n')+'\n');
 console.log(JSON.stringify({planned:plan.entries.length,generated:assets.length,transparent:assets.filter(a=>a.transparent).length,backgrounds:assets.filter(a=>!a.transparent).length,missing:plan.entries.filter(e=>!records.has(e.id)).map(e=>e.id)},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});

