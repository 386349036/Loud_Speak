const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),https=require('node:https');
const root=process.argv[2]||'/opt/loud/current',reportFile=process.argv[3],sharp=require(require.resolve('sharp',{paths:[root]}));
(async()=>{
 const report=JSON.parse(fs.readFileSync(reportFile)),checks=[];
 for(const row of report.rows){const file=path.join(root,'public/games/veggie-adventure/assets',row.path),hash=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(hash!==row.sha256)throw Error('Original image changed: '+row.path);}
 for(const id of ['W01-far','anim-P01-0','W01-kit-0']){
  const row=report.rows.find(r=>r.id===id);if(!row?.webp)continue;const file=path.join(root,'public/games/veggie-adventure/assets',row.path),a=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),b=await sharp(file+'.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  if(a.info.width!==b.info.width||a.info.height!==b.info.height)throw Error(id+' resized');
  for(let i=0;i<a.data.length;i+=4){if(a.data[i+3]!==b.data[i+3])throw Error(id+' alpha differs');if(a.data[i+3])for(let c=0;c<3;c++)if(a.data[i+c]!==b.data[i+c])throw Error(id+' visible pixels differ');}checks.push({id,lossless:true});
 }
 const range=await new Promise((resolve,reject)=>{https.get('https://35.221.134.170/games/veggie-adventure/assets/campaign/W01-far.png?v='+report.version,{headers:{Accept:'image/webp',Range:'bytes=0-31'}},res=>{let bytes=0;res.on('data',c=>bytes+=c.length);res.on('end',()=>resolve({status:res.statusCode,bytes,range:res.headers['content-range']}));}).on('error',reject);});
 if(range.status!==206||range.bytes!==32)throw Error('Byte ranges unavailable');
 console.log(JSON.stringify({originalHashesVerified:report.rows.length,checks,range}));
})().catch(e=>{console.error(e);process.exitCode=1;});
