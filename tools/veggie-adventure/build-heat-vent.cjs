const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'art-source/veggie-adventure/hazards/heat-vent-v1'),base=path.join(root,'public/games/veggie-adventure/assets');
(async()=>{
 const file=path.join(source,'generated.png'),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cells=[];
 for(let i=0;i<4;i++){
  const start=Math.floor(i*info.width/4),end=Math.floor((i+1)*info.width/4);let left=end-start,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=start;x<end;x++)if(data[(y*info.width+x)*4+3]>40){left=Math.min(left,x-start);right=Math.max(right,x-start);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Empty heat-vent frame '+i);cells.push({start,width:end-start,left,top,right,bottom});
 }
 const left=Math.min(...cells.map(c=>c.left)),right=Math.min(Math.max(...cells.map(c=>c.right)),...cells.map(c=>c.width-1)),top=Math.min(...cells.slice(1).map(c=>c.top)),height=Math.max(...cells.slice(1).map(c=>c.bottom-top+1)),width=right-left+1;
 const frames=[];for(const [i,c] of cells.entries()){
  const frameHeight=Math.max(1,Math.min(192,Math.round((c.bottom-Math.max(top,c.top)+1)*192/height)));
  const png=await sharp(file).extract({left:c.start+left,top:Math.max(top,c.top),width,height:c.bottom-Math.max(top,c.top)+1}).resize(96,frameHeight,{kernel:'nearest'}).png().toBuffer();
  frames.push({input:png,left:i*96,top:192-frameHeight});
 }
 const png=await sharp({create:{width:384,height:192,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(frames).png().toBuffer(),relative='hazards/heat-vent-v1/atlas.png';
 fs.mkdirSync(path.dirname(path.join(base,relative)),{recursive:true});fs.writeFileSync(path.join(base,relative),png);
 const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'))),asset={id:'hazard-heat-vent',path:relative,width:384,height:192,anchor:[192,192],source:'hazards/heat-vent-v1/generated.png',stage:'heat-vent-v1',frameWidth:96,frameHeight:192,frames:4,visualVerified:false},index=m.assets.findIndex(a=>a.id===asset.id);if(index<0)m.assets.push(asset);else m.assets[index]=asset;m.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(m,null,2)+'\n');
 fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',sourceSize:[info.width,info.height],cells,crop:{left,right,top,height},asset,sha256:crypto.createHash('sha256').update(png).digest('hex'),collisionChanged:false},null,2)+'\n');console.log('Built four-frame transparent heat-vent atlas');
})().catch(e=>{console.error(e);process.exitCode=1;});
