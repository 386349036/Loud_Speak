const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'public/games/veggie-adventure/assets'),art=path.join(root,'art-source/veggie-adventure');
async function main(){const rows=JSON.parse(fs.readFileSync(path.join(root,'docs/veggie-adventure/prototype-atlases.json'),'utf8')),assets=[];
for(const r of rows){fs.mkdirSync(path.join(art,'working/prototype'),{recursive:true});fs.copyFileSync(r.source,path.join(art,'working/prototype/'+r.id+'-atlas-v1.png'));fs.writeFileSync(path.join(art,'working/prototype/'+r.id+'-prompt.txt'),r.prompt);
const {data,info}=await sharp(r.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
for(let n=0;n<16;n++){const cw=Math.floor(info.width/4),ch=Math.floor(info.height/4),ox=n%4*cw,oy=Math.floor(n/4)*ch;let x0=cw,y0=ch,x1=0,y1=0;
for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>40){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
if(x0>x1||y0>y1)throw Error('Empty cell '+r.id+n);
const tall=r.id==='hero'&&n>=4&&n<12,tw=48,th=tall?96:48;const file='prototype/'+r.id+'-'+n+'.png';fs.mkdirSync(path.join(out,'prototype'),{recursive:true});
await sharp(r.source).extract({left:ox+x0,top:oy+y0,width:x1-x0+1,height:y1-y0+1}).resize(tw,th,{fit:r.id==='objects'&&n>=12?'fill':'contain',position:'bottom',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(path.join(out,file));assets.push({id:r.id+'-'+n,path:file,width:tw,height:th,anchor:[24,th],stage:'prototype-runtime',visualVerified:false,source:'working/prototype/'+r.id+'-atlas-v1.png',cell:n});}}
for(const kind of ['far','mid']){const file='prototype/forest-'+kind+'.png';fs.copyFileSync(path.join(art,'scenes/batch-01/w01-'+kind+'-v1.png'),path.join(out,file));assets.push({id:'forest-'+kind,path:file,stage:'prototype-runtime',visualVerified:false});}
const manifestPath=path.join(out,'manifest.json'),previous=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};const ids=new Set(assets.map(a=>a.id));
fs.writeFileSync(manifestPath,JSON.stringify({...previous,schemaVersion:1,artDirection:'32-bit-era-2d-pixel',status:previous.status||'prototype-runtime',assets:[...(previous.assets||[]).filter(a=>!ids.has(a.id)),...assets]},null,2));console.log('Built '+assets.length+' prototype assets');}
main().catch(e=>{console.error(e);process.exitCode=1});
