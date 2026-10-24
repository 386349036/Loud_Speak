const fs=require('fs'),path=require('path'),sharp=require('sharp'),crypto=require('crypto');
const source='art-source/veggie-adventure/animations/v1',out='public/games/veggie-adventure/assets';
const plan=JSON.parse(fs.readFileSync(source+'/plan.json','utf8'));
const loopStates=new Set(['idle','walk','run','swim','float','pulse','fly','roll','shell-idle','shell-slide','open','expose','stranded','exhaust','stun','stagger','fire','seed','wave','enrage']);
for(const [id,split] of [['P01-1',5],['B07',4]]){const j=plan.jobs.find(j=>j.id===id);j.parts=[{source:source+'/'+id+'-part0.png',rows:split},{source:source+'/'+id+'-part1.png',rows:j.rows-split}];}
if(!plan.jobs.some(j=>j.id==='FX01'))plan.jobs.push({id:'FX01',name:'共享特效',states:['fire','seed','dust','splash','hit','spark','wave','burst'],columns:4,rows:8,source:source+'/FX01.png',frameWidth:48,frameHeight:48,status:'pending'});
async function build(){
 fs.mkdirSync(out+'/animations',{recursive:true});const actors={},assets=[];
 for(const job of plan.jobs){
  const parts=job.parts||[{source:job.source,rows:job.rows}];if(parts.some(p=>!fs.existsSync(p.source))){job.status='pending';continue;}
  const cells=[];job.sourceSizes=[];
  for(const part of parts){
  const {data,info}=await sharp(part.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width:W,height:H,channels:C}=info;const alpha=(x,y)=>data[(y*W+x)*C+3];
  let transparent=0;for(let i=3;i<data.length;i+=C)if(data[i]<10)transparent++;
  if(transparent<W*H*.2)throw Error(job.id+': source lacks transparent gutters');
  const bands=[];let start=-1,xmin=W,xmax=0;const rows=[];
  for(let y=0;y<H;y++){let n=0;for(let x=0;x<W;x++)if(alpha(x,y)>40){n++;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);}rows.push(n);if(n>W*.04&&start<0)start=y;if((n<=W*.04||y===H-1)&&start>=0){if(y-start>12)bands.push([start,y]);start=-1;}}
  const cuts=[0];for(let r=1;r<part.rows;r++){const nominal=H*r/part.rows,margin=H/part.rows*.25;let best=Infinity,cut=Math.round(nominal);if(bands.length===part.rows)cut=Math.floor((bands[r-1][1]+bands[r][0])/2);else for(let y=Math.floor(nominal-margin);y<=nominal+margin;y++){const cost=rows[y]+Math.abs(y-nominal)*.001;if(cost<best){best=cost;cut=y;}}cuts.push(cut);}cuts.push(H);
  for(let r=0;r<part.rows;r++){
   const y0=cuts[r],y1=cuts[r+1],xcuts=[0];for(let c=1;c<4;c++){const nominal=xmin+(xmax-xmin+1)*c/4,margin=(xmax-xmin+1)/4*.23;let best=Infinity,cut=Math.round(nominal);for(let x=Math.floor(nominal-margin);x<nominal+margin;x++){let n=0;for(let y=y0;y<y1;y++)if(alpha(x,y)>40)n++;const cost=n+Math.abs(x-nominal)*.001;if(cost<best){best=cost;cut=x;}}xcuts.push(cut);}xcuts.push(W);
   for(let c=0;c<4;c++){
   const x0=xcuts[c],x1=xcuts[c+1];let left=x1,top=y1,right=-1,bottom=-1,count=0;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(alpha(x,y)>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);count++;}
   if(count<30)throw Error(`${job.id}: empty frame ${r*4+c}`);
   cells.push({source:part.source,normalization:1024/W,rect:{left,top,width:right-left+1,height:bottom-top+1}});
   }
  }
  job.sourceSizes.push({source:part.source,size:[W,H],detectedBands:bands.length,expectedRows:part.rows});
  }
  const fw=job.frameWidth,fh=job.frameHeight,scale=Math.min((fw-4)/Math.max(...cells.map(c=>c.rect.width*c.normalization)),(fh-4)/Math.max(...cells.map(c=>c.rect.height*c.normalization)));
  const layers=[],hashes=[];for(let i=0;i<cells.length;i++){
   const cell=cells[i],w=Math.max(1,Math.round(cell.rect.width*cell.normalization*scale)),h=Math.max(1,Math.round(cell.rect.height*cell.normalization*scale));
   const buffer=await sharp(cell.source).extract(cell.rect).resize(w,h,{kernel:'nearest'}).png().toBuffer();hashes.push(crypto.createHash('sha256').update(buffer).digest('hex'));
   layers.push({input:buffer,left:(i%4)*fw+Math.floor((fw-w)/2),top:Math.floor(i/4)*fh+fh-h});
  }
  const file=`animations/${job.id}.png`;await sharp({create:{width:fw*4,height:fh*job.rows,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(out+'/'+file);
  const clips={};job.states.forEach((s,row)=>{clips[s]={row,frames:4,fps:['death','defeat','victory','celebrate'].includes(s)?6:['run','roll','shell-slide'].includes(s)?14:10,loop:loopStates.has(s)};});
  actors[job.id]={asset:'anim-'+job.id,frameWidth:fw,frameHeight:fh,anchor:[fw/2,fh],clips};
  assets.push({id:'anim-'+job.id,path:file,animation:true,visualVerified:false,sources:parts.map(p=>p.source)});
  job.status='built';job.frameHashes=hashes;job.scale=scale;job.sourceCells=cells;
 }
 const manifestPath=out+'/manifest.json',manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8'));
 for(const [id,old] of Object.entries(manifest.animations?.actors||{})){if(actors[id]&&old.presentation)actors[id].presentation=old.presentation;else if(!plan.jobs.some(j=>j.id===id))actors[id]=old;}
 manifest.assets=manifest.assets.filter(a=>!a.animation).concat(assets);manifest.animations={version:1,actors};manifest.status=assets.length===plan.jobs.length?'campaign-animation-integrated-awaiting-user-review':'campaign-animation-in-progress';
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));plan.status=assets.length===plan.jobs.length?'built-awaiting-user-review':'in-progress';fs.writeFileSync(source+'/plan.json',JSON.stringify(plan,null,2));
 console.log(JSON.stringify({sheets:assets.length,planned:plan.jobs.length,clips:Object.values(actors).reduce((n,a)=>n+Object.keys(a.clips).length,0),visualVerified:false}));
}
build().catch(e=>{console.error(e);process.exitCode=1;});
