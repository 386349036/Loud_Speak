const fs=require('fs'),sharp=require('sharp');
const root='public/games/veggie-adventure/assets',source='art-source/veggie-adventure/effects/star-shield-v1/source.png';
(async()=>{
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});const cells=[];
 for(let c=0;c<4;c++){const x0=Math.floor(info.width*c/4),x1=Math.floor(info.width*(c+1)/4);let l=x1,r=0,t=info.height,b=0;for(let y=0;y<info.height;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>40){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}cells.push({left:l,top:t,width:r-l+1,height:b-t+1});}
 const scale=92/Math.max(...cells.flatMap(c=>[c.width,c.height])),layers=[];
 for(let i=0;i<4;i++){const c=cells[i],w=Math.round(c.width*scale),h=Math.round(c.height*scale);layers.push({input:await sharp(source).extract(c).resize(w,h,{kernel:'nearest'}).png().toBuffer(),left:i*96+Math.floor((96-w)/2),top:Math.floor((96-h)/2)});}
 fs.mkdirSync(root+'/effects',{recursive:true});await sharp({create:{width:384,height:96,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).png().toFile(root+'/effects/star-shield-v1.png');
 const file=root+'/manifest.json',m=JSON.parse(fs.readFileSync(file));m.assets=m.assets.filter(a=>a.id!=='star-shield-v1');m.assets.push({id:'star-shield-v1',path:'effects/star-shield-v1.png',source,visualVerified:false});
 m.animations.actors.SHIELD={asset:'star-shield-v1',frameWidth:96,frameHeight:96,anchor:[48,48],clips:{aura:{row:0,frames:4,fps:8,loop:true}}};
 const report=[];for(const [id,a] of Object.entries(m.animations.actors)){if(!/^(P01-|E\d)/.test(id))continue;const row=(a.clips.idle||a.clips.walk||Object.values(a.clips)[0]).row;const asset=m.assets.find(v=>v.id===a.asset),heights=[];
 for(let f=0;f<4;f++){const {data,info}=await sharp(root+'/'+asset.path).extract({left:f*a.frameWidth,top:row*a.frameHeight,width:a.frameWidth,height:a.frameHeight}).ensureAlpha().raw().toBuffer({resolveWithObject:true});let top=info.height,bottom=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>40){top=Math.min(top,y);bottom=Math.max(bottom,y);}heights.push(bottom-top+1);}
 heights.sort((a,b)=>a-b);const referenceHeight=(heights[1]+heights[2])/2,targetHeight=id==='P01-0'?18:id.startsWith('P')?28:16;a.presentation={referenceHeight,targetHeight,scale:targetHeight/referenceHeight};report.push({id,...a.presentation});}
 fs.writeFileSync(file,JSON.stringify(m,null,2));fs.writeFileSync('art-source/veggie-adventure/effects/star-shield-v1/build.json',JSON.stringify({source,cells,scale,calibration:report,visualVerified:false},null,2));console.log('Built star shield and calibrated '+report.length+' character forms');
})().catch(e=>{console.error(e);process.exitCode=1;});
