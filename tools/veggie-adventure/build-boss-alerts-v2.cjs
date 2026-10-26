const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'art-source/veggie-adventure/effects/boss-cues-v2'),base=path.join(root,'public/games/veggie-adventure/assets');
(async()=>{
 const file=path.join(source,'generated.png'),meta=await sharp(file).metadata(),ids=['slam','hop','seeds','dash','weak','target'],report=[];
 const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));fs.mkdirSync(path.join(base,'effects/boss-cues-v2'),{recursive:true});
 for(const [i,id] of ids.entries()){
  const col=i%3,row=Math.floor(i/3),left=Math.floor(col*meta.width/3),top=Math.floor(row*meta.height/2),width=Math.floor((col+1)*meta.width/3)-left,height=Math.floor((row+1)*meta.height/2)-top;
  const cell=await sharp(file).extract({left,top,width,height}).png().toBuffer(),{data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x1=info.width,y1=info.height,x2=-1,y2=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){x1=Math.min(x1,x);x2=Math.max(x2,x);y1=Math.min(y1,y);y2=Math.max(y2,y);}
  if(x2<x1)throw Error('Empty cue '+id);const crop={left:x1,top:y1,width:x2-x1+1,height:y2-y1+1},relative='effects/boss-cues-v2/'+id+'.png';
  const png=await sharp(cell).extract(crop).resize(96,96,{fit:'contain',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();fs.writeFileSync(path.join(base,relative),png);
  const asset={id:'boss-cue-'+id,path:relative,width:96,height:96,anchor:[48,96],source:'effects/boss-cues-v2/generated.png',stage:'boss-cues-v2',visualVerified:false},index=m.assets.findIndex(a=>a.id===asset.id);if(index<0)m.assets.push(asset);else m.assets[index]=asset;
  report.push({id,crop,sha256:crypto.createHash('sha256').update(png).digest('hex')});
 }
 m.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(m,null,2)+'\n');fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',sourceSize:[meta.width,meta.height],icons:report},null,2)+'\n');console.log('Built six transparent boss cue PNGs');
})().catch(e=>{console.error(e);process.exitCode=1;});
