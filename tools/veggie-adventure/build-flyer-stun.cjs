const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const base='public/games/veggie-adventure/assets',source='art-source/veggie-adventure/animations/flyer-stun-v1',out=base+'/animations/flyer-stun-v1';
const median=xs=>[...xs].sort((a,b)=>a-b)[Math.floor(xs.length/2)];
function bounds(data,width,x0,y0,x1,y1){let left=x1,top=y1,right=-1,bottom=-1;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*width+x)*4+3]>40){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}if(right<left)throw Error('Empty generated cell');return {left,top,width:right-left+1,height:bottom-top+1};}
function cut(size,nominal,radius,count){let best=Infinity,result=Math.round(nominal);for(let i=Math.max(1,Math.floor(nominal-radius));i<Math.min(size-1,nominal+radius);i++){const cost=count(i)+Math.abs(i-nominal)*.001;if(cost<best){best=cost;result=i;}}return result;}
(async()=>{
 const m=JSON.parse(fs.readFileSync(base+'/manifest.json')),report=[];fs.mkdirSync(out,{recursive:true});
 for(const id of ['E11','E09']){
  const input=source+'/'+id+'/generated.png',a=m.animations.actors[id],asset=m.assets.find(x=>x.id===a.asset),original=base+'/animations/'+id+'.png';
  const {data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true}),alpha=(x,y)=>data[(y*info.width+x)*4+3]>40;
  const ys=[0,...[1,2].map(r=>cut(info.height,info.height*r/3,info.height/3*.3,y=>{let n=0;for(let x=0;x<info.width;x++)n+=alpha(x,y);return n;})),info.height],cells=[];
  for(let r=0;r<3;r++){const xs=[0,...[1,2,3].map(c=>cut(info.width,info.width*c/4,info.width/4*.22,x=>{let n=0;for(let y=ys[r];y<ys[r+1];y++)n+=alpha(x,y);return n;})),info.width];for(let c=0;c<4;c++)cells.push(bounds(data,info.width,xs[c],ys[r],xs[c+1],ys[r+1]));}
  const {data:old,info:oi}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true}),fw=a.frameWidth,fh=a.frameHeight,oldRows=oi.height/fh;
  const normalHeight=median([0,1,2,3].map(c=>bounds(old,oi.width,c*fw,0,(c+1)*fw,fh).height));
  const scale=Math.min(normalHeight/median(cells.slice(8).map(c=>c.height)),(fw-2)/Math.max(...cells.map(c=>c.width)),(fh-2)/Math.max(...cells.map(c=>c.height)));
  const clips=Object.fromEntries(Object.entries(a.clips).filter(([k])=>!['fall-stunned','stunned','wake'].includes(k))),layers=[];
  for(const [r,name] of ['fall-stunned','stunned','wake'].entries()){clips[name]={row:oldRows+r,frames:4,fps:r===0?10:r===1?6:4,loop:r===1};for(let c=0;c<4;c++){const b=cells[r*4+c],w=Math.max(1,Math.round(b.width*scale)),h=Math.max(1,Math.round(b.height*scale)),png=await sharp(input).extract(b).resize(w,h,{kernel:'nearest'}).png().toBuffer();layers.push({input:png,left:c*fw+Math.floor((fw-w)/2),top:(oldRows+r)*fh+fh-h});}}
  const width=fw*4,height=(oldRows+3)*fh,rgba=await sharp({create:{width,height,channels:4,background:'#00000000'}}).composite(layers).raw().toBuffer();old.copy(rgba,0);
  const file=`animations/flyer-stun-v1/${id}.png`;await sharp(rgba,{raw:{width,height,channels:4}}).png().toFile(base+'/'+file);
  const fallback=`animations/flyer-stun-v1/${id}-stunned.png`;await sharp(base+'/'+file).extract({left:fw,top:clips.stunned.row*fh,width:fw,height:fh}).png().toFile(base+'/'+fallback);
  Object.assign(a,{clips,revision:'flyer-stun-v1',footOffsets:{...a.footOffsets,'fall-stunned':[0,0,0,0],stunned:[0,0,0,0],wake:[0,0,0,0]}});
  Object.assign(asset,{path:file,revision:'flyer-stun-v1',sources:[original,input],visualVerified:false});
  m.assets=m.assets.filter(x=>x.id!==id+'-stunned');m.assets.push({id:id+'-stunned',path:fallback,width:fw,height:fh,anchor:[fw/2,fh],stage:'flyer-stun-v1',sources:[input],visualVerified:false});
  report.push({id,source:input,runtime:file,fallback,rows:ys,cells,scale,normalHeight,originalRowsPreserved:oldRows,clips:['fall-stunned','stunned','wake'],sha256:crypto.createHash('sha256').update(fs.readFileSync(base+'/'+file)).digest('hex')});
 }
 delete m.deliveryVersion;fs.writeFileSync(base+'/manifest.json',JSON.stringify(m,null,2)+'\n');fs.writeFileSync(source+'/build.json',JSON.stringify({generator:'built-in image_gen',actors:report},null,2)+'\n');console.log(JSON.stringify(report.map(r=>({id:r.id,runtime:r.runtime,cells:r.cells.length,scale:r.scale}))));
})().catch(e=>{console.error(e);process.exitCode=1;});
