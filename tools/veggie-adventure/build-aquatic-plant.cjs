const fs=require('node:fs'),sharp=require('sharp'),crypto=require('node:crypto');
const source='art-source/veggie-adventure/enemies/aquatic-plant-v1/generated.png',base='public/games/veggie-adventure/assets';
(async()=>{
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cw=info.width/4,ch=info.height/4,cells=[];
 for(let r=0;r<4;r++)for(let c=0;c<4;c++){
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=r*ch;y<(r+1)*ch;y++)for(let x=c*cw;x<(c+1)*cw;x++)if(data[(y*info.width+x)*4+3]>64){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Empty aquatic plant frame');cells.push({left,top,width:right-left+1,height:bottom-top+1});
 }
 const scale=Math.min(44/Math.max(...cells.map(c=>c.width)),44/Math.max(...cells.map(c=>c.height))),layers=[],heights=[],hashes=[];
 for(let i=0;i<cells.length;i++){
  const rect=cells[i],w=Math.round(rect.width*scale),h=Math.round(rect.height*scale),input=await sharp(source).extract(rect).resize(w,h,{kernel:'nearest'}).png().toBuffer();heights.push(h);hashes.push(crypto.createHash('sha256').update(input).digest('hex'));layers.push({input,left:i%4*48+Math.floor((48-w)/2),top:Math.floor(i/4)*48+48-h});
 }
 fs.mkdirSync(base+'/animations',{recursive:true});await sharp({create:{width:192,height:192,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(base+'/animations/E13.png');
 const referenceHeight=heights.slice(0,4).sort((a,b)=>a-b)[2],manifest=JSON.parse(fs.readFileSync(base+'/manifest.json'));
 manifest.assets=manifest.assets.filter(a=>a.id!=='anim-E13');manifest.assets.push({id:'anim-E13',path:'animations/E13.png',animation:true,visualVerified:false,sources:[source],stage:'aquatic-plant-v1'});
 manifest.animations.actors.E13={asset:'anim-E13',frameWidth:48,frameHeight:48,anchor:[24,48],clips:{idle:{row:0,frames:4,fps:5,loop:true},windup:{row:1,frames:4,fps:6,loop:false},attack:{row:2,frames:4,fps:10,loop:false},hit:{row:3,frames:4,fps:8,loop:false}},presentation:{referenceHeight,targetHeight:24,scale:24/referenceHeight}};
 fs.writeFileSync(base+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync('art-source/veggie-adventure/enemies/aquatic-plant-v1/build-report.json',JSON.stringify({source,cells,frameHashes:hashes,scale,referenceHeight,alphaThreshold:64,rootAnchor:[24,48]},null,2)+'\n');
 console.log('E13 aquatic plant: 16 transparent, root-aligned animation frames');
})().catch(e=>{console.error(e);process.exitCode=1});
