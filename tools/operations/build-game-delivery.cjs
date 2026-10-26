// Add lossless transport variants; retain original PNGs for fallback and rollback.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require(require.resolve('sharp',{paths:[process.cwd(),__dirname]}));
const root=path.resolve(process.argv[2]||'public/games/veggie-adventure/assets');
(async()=>{const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'))),rows=[];
 for(const a of m.assets){if(!a.path.endsWith('.png'))continue;const file=path.resolve(root,a.path);if(!file.startsWith(root+path.sep))throw Error('Invalid asset path');
  const data=fs.readFileSync(file),webp=await sharp(data).webp({lossless:true,effort:4}).toBuffer(),output=file+'.webp';
  const use=webp.length<data.length;if(use)fs.writeFileSync(output,webp);else if(fs.existsSync(output))fs.unlinkSync(output);
  rows.push({id:a.id,path:a.path,pngBytes:data.length,transferBytes:use?webp.length:data.length,webp:use,sha256:crypto.createHash('sha256').update(data).digest('hex')});
 }
 m.deliveryVersion=crypto.createHash('sha256').update(rows.map(r=>r.path+':'+r.sha256).join('\n')).digest('hex').slice(0,16);
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(m,null,2)+'\n');
 const report={lossless:true,version:m.deliveryVersion,assets:rows.length,pngBytes:rows.reduce((n,r)=>n+r.pngBytes,0),transferBytes:rows.reduce((n,r)=>n+r.transferBytes,0),rows};
 const reportFile=process.argv[3];if(reportFile)fs.writeFileSync(reportFile,JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined}));
})().catch(e=>{console.error(e);process.exitCode=1;});
