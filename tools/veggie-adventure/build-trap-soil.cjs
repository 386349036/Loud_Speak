const fs=require('node:fs'),sharp=require('sharp');
const root='public/games/veggie-adventure/assets',folder='art-source/veggie-adventure/effects/trap-soil-v1',source=folder+'/source.png';
(async()=>{
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cells=[];
 for(let frame=0;frame<4;frame++){
  const start=Math.round(frame*info.width/4),end=Math.round((frame+1)*info.width/4);let left=end,right=start,top=info.height,bottom=0;
  for(let y=0;y<info.height;y++)for(let x=start;x<end;x++)if(data[(y*info.width+x)*4+3]>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Missing soil frame '+frame);
  cells.push({left,top,width:right-left+1,height:bottom-top+1});
 }
 const scale=Math.min(60/Math.max(...cells.map(c=>c.width)),36/Math.max(...cells.map(c=>c.height))),layers=[];
 for(let frame=0;frame<4;frame++){
  const cell=cells[frame],width=Math.max(1,Math.round(cell.width*scale)),height=Math.max(1,Math.round(cell.height*scale));
  layers.push({input:await sharp(source).extract(cell).resize(width,height,{kernel:'nearest'}).png().toBuffer(),left:frame*64+Math.round((64-width)/2),top:40-height});
 }
 fs.mkdirSync(root+'/effects/trap-soil-v1',{recursive:true});
 await sharp({create:{width:256,height:40,channels:4,background:'#00000000'}}).composite(layers).png().toFile(root+'/effects/trap-soil-v1/soil.png');
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json'));
 const asset={id:'anim-TRAP_SOIL',path:'effects/trap-soil-v1/soil.png',animation:true,visualVerified:false,sources:[source]};
 const index=manifest.assets.findIndex(a=>a.id===asset.id);if(index<0)manifest.assets.push(asset);else manifest.assets[index]=asset;
 manifest.animations.actors.TRAP_SOIL={asset:asset.id,frameWidth:64,frameHeight:40,anchor:[32,40],clips:{rumble:{row:0,frames:4,fps:4/.6,loop:false}}};
 const presentation=manifest.animations.actors.E08.presentation;presentation.targetHeight=24;presentation.scale=24/presentation.referenceHeight;
 fs.writeFileSync(root+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(folder+'/build.json',JSON.stringify({source,cells,scale,frameWidth:64,frameHeight:40,frames:4,transparent:true,enemyVisualScale:1.5},null,2)+'\n');
 console.log(JSON.stringify({asset:asset.path,frames:4,enemyVisualHeight:24}));
})();
