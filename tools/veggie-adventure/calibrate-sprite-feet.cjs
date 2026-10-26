const fs=require('node:fs'),sharp=require('sharp');
async function calibrate(){
 const base='public/games/veggie-adventure/assets',manifest=JSON.parse(fs.readFileSync(base+'/manifest.json')),report=[];
 for(const [id,a] of Object.entries(manifest.animations.actors)){
  if(!/^(P01-|E\d|B\d|N\d)/.test(id))continue;
  const file=manifest.assets.find(x=>x.id===a.asset).path,{data,info}=await sharp(base+'/'+file).ensureAlpha().raw().toBuffer({resolveWithObject:true});a.footOffsets={};
  for(const [name,clip] of Object.entries(a.clips)){
   const pads=[];for(let c=0;c<clip.frames;c++){
    let bottom=-1;for(let y=0;y<a.frameHeight;y++){let n=0;for(let x=0;x<a.frameWidth;x++)if(data[((clip.row*a.frameHeight+y)*info.width+c*a.frameWidth+x)*4+3]>40)n++;if(n>=2)bottom=y;}
    if(bottom<0)throw Error(id+'/'+name+' empty silhouette');pads.push(a.frameHeight-1-bottom);
   }a.footOffsets[name]=pads;
  }report.push({id,maxTransparentFootPadding:Math.max(...Object.values(a.footOffsets).flat()),frameHeight:a.frameHeight});
 }
 fs.writeFileSync(base+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync('art-source/veggie-adventure/terrain/seamless-v2/feet-calibration.json',JSON.stringify({method:'Register visible alpha silhouette per animation frame; preserve source PNG and collider; FX and centered shield excluded',actors:report},null,2)+'\n');console.log('Calibrated visible foot anchors for '+report.length+' actors');
}
module.exports=calibrate;if(require.main===module)calibrate().catch(e=>{console.error(e);process.exitCode=1;});
