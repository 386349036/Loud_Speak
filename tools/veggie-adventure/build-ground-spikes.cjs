const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'art-source/veggie-adventure/hazards/ground-spikes-v1'),base=path.join(root,'public/games/veggie-adventure/assets');
(async()=>{
 const file=path.join(source,'generated.png'),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
 if(right<left)throw Error('Empty generated spike sprite');
 const crop={left,top,width:right-left+1,height:bottom-top+1},width=96,height=48,relative='hazards/ground-spikes-v1/tile.png';fs.mkdirSync(path.dirname(path.join(base,relative)),{recursive:true});
 const png=await sharp(file).extract(crop).resize(width,height,{kernel:'nearest'}).png().toBuffer();fs.writeFileSync(path.join(base,relative),png);
 const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'))),asset={id:'hazard-ground-spikes',path:relative,width,height,anchor:[width/2,height],source:'hazards/ground-spikes-v1/generated.png',stage:'ground-spikes-v1',visualVerified:false},index=m.assets.findIndex(a=>a.id===asset.id);if(index<0)m.assets.push(asset);else m.assets[index]=asset;m.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(m,null,2)+'\n');
 fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',sourceSize:[info.width,info.height],crop,asset,sha256:crypto.createHash('sha256').update(png).digest('hex'),worldTile:[16,8],collisionChanged:false},null,2)+'\n');console.log('Built transparent 96x48 ground-spike PNG for 16x8 repeating hazard tiles');
})().catch(e=>{console.error(e);process.exitCode=1;});
