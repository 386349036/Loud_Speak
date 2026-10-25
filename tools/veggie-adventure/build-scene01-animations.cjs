const fs=require('fs'),sharp=require('sharp'),crypto=require('crypto');
const source='art-source/veggie-adventure/animations/v2-scene01',out='public/games/veggie-adventure/assets';
const plan=JSON.parse(fs.readFileSync(source+'/plan.json')),median=a=>{a.sort((a,b)=>a-b);return a[Math.floor(a.length/2)];};
async function run(){
 for(const j of plan.jobs)for(const p of j.parts)if(!fs.existsSync(p.source))throw Error('Missing source: '+p.source);
 const m=JSON.parse(fs.readFileSync(out+'/manifest.json'));const reports=[];fs.mkdirSync(out+'/animations/v2-scene01',{recursive:true});
 for(const job of plan.jobs){let cells=[];const parts=[];
  for(const part of job.parts){const {data,info}=await sharp(part.source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height;const alpha=(x,y)=>data[(y*W+x)*4+3];let clear=0,xmin=W,xmax=0;const rows=[],bands=[];let start=-1;
   for(let y=0;y<H;y++){let ink=0;for(let x=0;x<W;x++){const a=alpha(x,y);if(a<10)clear++;if(a>40){ink++;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);}}rows.push(ink);if(ink>W*.04&&start<0)start=y;if((ink<=W*.04||y===H-1)&&start>=0){if(y-start>12)bands.push([start,y]);start=-1;}}
   if(clear<W*H*.2)throw Error(part.source+': missing transparency');
   if(bands.length!==part.states.length)throw Error(part.source+`: expected ${part.states.length} rows, found ${bands.length}`);
   const ycuts=[0,...bands.slice(1).map((b,i)=>Math.floor((bands[i][1]+b[0])/2)),H],partCells=[];
   for(let r=0;r<part.states.length;r++){const y0=ycuts[r],y1=ycuts[r+1],xcuts=[0];for(let c=1;c<4;c++){const nominal=xmin+(xmax-xmin+1)*c/4,margin=(xmax-xmin+1)/4*.25;let cut=Math.round(nominal),best=Infinity;for(let x=Math.floor(nominal-margin);x<=nominal+margin;x++){let ink=0;for(let y=y0;y<y1;y++)if(alpha(x,y)>40)ink++;const cost=ink+Math.abs(x-nominal)*.001;if(cost<best){best=cost;cut=x;}}xcuts.push(cut);}xcuts.push(W);
    for(let c=0;c<4;c++){let l=xcuts[c+1],t=y1,rr=-1,b=-1,ink=0;for(let y=y0;y<y1;y++)for(let x=xcuts[c];x<xcuts[c+1];x++)if(alpha(x,y)>40){ink++;l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y);}if(ink<30)throw Error(part.source+': empty sprite');partCells.push({source:part.source,state:part.states[r],frame:c,normalization:1024/W,rect:{left:l,top:t,width:rr-l+1,height:b-t+1}});}
   }
   const normal=partCells.filter(c=>['idle','walk','run','jump-rise','jump-fall','throw','hurt','victory','shell-idle'].includes(c.state));const reference=median((normal.length?normal:partCells).map(c=>c.rect.height*c.normalization));parts.push({source:part.source,reference,bandCount:bands.length,states:part.states});for(const c of partCells)c.partReference=reference;cells.push(...partCells);
  }
  // One scale per source group, never fit each frame separately. This also aligns short groups.
  const groupReference=median(parts.map(p=>p.reference));for(const c of cells)c.normalization*=groupReference/c.partReference;
  const scale=Math.min(60/Math.max(...cells.map(c=>c.rect.width*c.normalization)),60/Math.max(...cells.map(c=>c.rect.height*c.normalization)));const layers=[];
  for(let i=0;i<cells.length;i++){const c=cells[i],w=Math.max(1,Math.round(c.rect.width*c.normalization*scale)),h=Math.max(1,Math.round(c.rect.height*c.normalization*scale));const buffer=await sharp(c.source).extract(c.rect).resize(w,h,{kernel:'nearest'}).png().toBuffer();c.hash=crypto.createHash('sha256').update(buffer).digest('hex');layers.push({input:buffer,left:(i%4)*64+Math.floor((64-w)/2),top:Math.floor(i/4)*64+64-h});}
  const file=`animations/v2-scene01/${job.id}.png`;await sharp({create:{width:256,height:64*job.states.length,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(out+'/'+file);
  const actor=m.animations.actors[job.id];actor.frameWidth=64;actor.frameHeight=64;actor.anchor=[32,64];actor.revision='scene01-v2';actor.identityReference=plan.identityReference;delete actor.presentation;
  const asset=m.assets.find(a=>a.id===actor.asset);Object.assign(asset,{path:file,sources:job.parts.map(p=>p.source),revision:'scene01-v2',identityReference:plan.identityReference,visualVerified:false});
  job.status='built';job.cells=cells;job.partsReport=parts;job.scale=scale;reports.push({id:job.id,frames:cells.length,sourceGroups:parts.length});
 }
 // Refresh legacy key poses too: homepage icon and any fallback must use the same identity.
 async function legacy(id,actorId,state,frame){const a=m.animations.actors[actorId],row=a.clips[state].row,asset=m.assets.find(x=>x.id===id),atlas=m.assets.find(x=>x.id===a.asset);await sharp(out+'/'+atlas.path).extract({left:frame*64,top:row*64,width:64,height:64}).resize(asset.width,asset.height,{fit:'contain',position:'bottom',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}}).png().toFile(out+'/'+asset.path);asset.revision='scene01-v2';asset.source=atlas.path;}
 for(let form=0;form<3;form++)for(let n=0;n<4;n++)await legacy('hero-'+(form*4+n),'P01-'+form,n===0?'idle':n===3?'jump-rise':'walk',n===2?2:0);
 await legacy('hero-12','P01-0','hurt',1);await legacy('hero-13','P01-1','crouch',1);await legacy('hero-14','P01-2','throw',2);await legacy('hero-15','P01-0','victory',2);
 for(const [id,actor,state,frame] of [['objects-0','E01','walk',0],['objects-1','E01','walk',2],['objects-2','E01','flatten',3],['objects-3','E02','walk',0],['objects-4','E02','walk',2],['objects-5','E02','shell-idle',0],['objects-6','E02','shell-slide',1],['objects-7','E02','hit',3]])await legacy(id,actor,state,frame);
 m.animations.identityRevision='scene01-v2';fs.writeFileSync(out+'/manifest.json',JSON.stringify(m,null,2));plan.status='built-local-awaiting-user-review';fs.writeFileSync(source+'/plan.json',JSON.stringify(plan,null,2));fs.writeFileSync(source+'/build-report.json',JSON.stringify({reports,visualVerified:false},null,2));console.log(JSON.stringify(reports));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
