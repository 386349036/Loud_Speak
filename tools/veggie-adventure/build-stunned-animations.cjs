const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'public/games/veggie-adventure/assets'),source=path.join(root,'art-source/veggie-adventure/animations/stunned-v1');
const jobs=[['E02','animations/v2-scene01/E02.png'],['E03','animations/E03.png'],['E04','animations/E04.png']];
const median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
function inkBounds(data,width,left,top,w,h){let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[((top+y)*width+left+x)*4+3]>40){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}if(x1<0)throw Error('Empty sprite cell');return {left:left+x0,top:top+y0,width:x1-x0+1,height:y1-y0+1};}
async function build(){
 const m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'))),report=[];fs.mkdirSync(path.join(base,'animations/stunned-v1'),{recursive:true});
 for(const [id,original] of jobs){
  const generated=path.join(source,id,'generated.png');if(!fs.existsSync(generated))throw Error('Missing generated stunned source '+id);
  const a=m.animations.actors[id],asset=m.assets.find(v=>v.id===a.asset),fw=a.frameWidth,fh=a.frameHeight;
  const {data:old,info:oi}=await sharp(path.join(base,original)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const oldRows=oi.height/fh;if(!Number.isInteger(oldRows))throw Error('Invalid original frame grid '+id);
  // Four original E04 rows stay intact; the folded state gets dedicated clips.
  const clips=id==='E04'?Object.fromEntries(Object.entries(a.clips).filter(([k])=>['fall','unfold','walk','hit'].includes(k))):structuredClone(a.clips);
  const {data,info}=await sharp(generated).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cw=Math.floor(info.width/4),ch=Math.floor(info.height/3),cells=[];
  if(!info.hasAlpha&&info.channels!==4)throw Error('Generated source must have alpha');
  for(let row=0;row<3;row++)for(let col=0;col<4;col++)cells.push(inkBounds(data,info.width,col*cw,row*ch,cw,ch));
  const walkRow=clips.walk.row,normalHeight=median([0,1,2,3].map(col=>inkBounds(old,oi.width,col*fw,walkRow*fh,fw,fh).height));
  const scale=Math.min(normalHeight/median(cells.slice(8).map(c=>c.height)),(fw-2)/Math.max(...cells.map(c=>c.width)),(fh-2)/Math.max(...cells.map(c=>c.height)));
  const replacements=[['retract',0,false,10],['shell-idle',1,true,8],['shell-slide',1,true,14],['wake',2,false,4]];
  for(const [name,,loop,fps] of replacements)clips[name]={row:clips[name]?.row??Object.keys(clips).length,frames:4,fps,loop};
  const layers=[];
  for(let row=0;row<oldRows;row++)if(!replacements.some(([name])=>clips[name].row===row))layers.push({input:await sharp(path.join(base,original)).extract({left:0,top:row*fh,width:fw*4,height:fh}).png().toBuffer(),left:0,top:row*fh});
  const hashes={};for(const [name,sourceRow] of replacements){hashes[name]=[];for(let col=0;col<4;col++){
   const cell=cells[sourceRow*4+col],w=Math.max(1,Math.round(cell.width*scale)),h=Math.max(1,Math.round(cell.height*scale));
   const png=await sharp(generated).extract(cell).resize(w,h,{kernel:'nearest'}).png().toBuffer();
   hashes[name].push(crypto.createHash('sha256').update(png).digest('hex'));layers.push({input:png,left:col*fw+Math.floor((fw-w)/2),top:clips[name].row*fh+fh-h});
  }}
  const file=`animations/stunned-v1/${id}.png`,height=Object.keys(clips).length*fh;
  const rgba=await sharp({create:{width:fw*4,height,channels:4,background:'#00000000'}}).composite(layers).raw().toBuffer();
  // Avoid alpha premultiply rounding in untouched historical animation rows.
  for(let row=0;row<oldRows;row++)if(!replacements.some(([name])=>clips[name].row===row)){const start=row*fh*fw*4*4;old.copy(rgba,start,start,start+fh*fw*4*4);}
  await sharp(rgba,{raw:{width:fw*4,height,channels:4}}).png().toFile(path.join(base,file));
  Object.assign(a,{clips,revision:'stunned-v1'});Object.assign(asset,{path:file,revision:'stunned-v1',sources:[original,`art-source/veggie-adventure/animations/stunned-v1/${id}/generated.png`],visualVerified:false});
  report.push({id,original,path:file,frameSize:[fw,fh],clips:replacements.map(([name])=>name),sourceCells:cells,scale,frameHashes:hashes});
 }
 // Keep the legacy cabbage fallback poses in sync with the live atlas.
 const a=m.animations.actors.E02,atlas=m.assets.find(v=>v.id===a.asset);
 for(const [id,clip,col] of [['objects-5','shell-idle',0],['objects-6','shell-slide',1]]){const v=m.assets.find(v=>v.id===id);await sharp(path.join(base,atlas.path)).extract({left:col*a.frameWidth,top:a.clips[clip].row*a.frameHeight,width:a.frameWidth,height:a.frameHeight}).resize(v.width,v.height,{kernel:'nearest'}).png().toFile(path.join(base,v.path));v.revision='stunned-v1';v.source=atlas.path;}
 fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(m,null,2)+'\n');
 fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',visualVerified:false,actors:report},null,2)+'\n');
 console.log('Built three transparent stunned atlases; original walking/falling sprites preserved');
}
module.exports=build;if(require.main===module)build().then(()=>require('./calibrate-sprite-feet.cjs')()).catch(e=>{console.error(e);process.exitCode=1;});
