const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
(async()=>{
 const source='art-source/veggie-adventure/effects/boss-signatures-v1',runtime='public/games/veggie-adventure/assets/effects/boss-signatures-v1';fs.mkdirSync(runtime,{recursive:true});
 const records=[],assets=[];
 for(let kind=2;kind<=8;kind++){
  const input=`${source}/B0${kind}/generated.png`,meta=await sharp(input).metadata(),cw=Math.floor(meta.width/2),ch=Math.floor(meta.height/2),parts=[],frames=[];
  for(let f=0;f<4;f++){
   const cell=await sharp(input).extract({left:(f%2)*cw,top:Math.floor(f/2)*ch,width:cw,height:ch}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   let left=cw,right=-1,top=ch,bottom=-1;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(cell.data[(y*cw+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   if(right<left)throw Error('Empty frame '+kind+'/'+f);
   const crop={left,top,width:right-left+1,height:bottom-top+1},scale=Math.min(116/crop.width,116/crop.height),width=Math.max(1,Math.round(crop.width*scale)),height=Math.max(1,Math.round(crop.height*scale)),ground=[2,4,6].includes(kind),x=Math.floor((128-width)/2),y=ground?124-height:Math.floor((128-height)/2);
   const frame=await sharp(cell.data,{raw:cell.info}).extract(crop).resize(width,height,{kernel:'nearest'}).png().toBuffer();parts.push({input:frame,left:(f%2)*128+x,top:Math.floor(f/2)*128+y});frames.push({crop,x,y,width,height});
  }
  const file=`${runtime}/B0${kind}.png`;await sharp({create:{width:256,height:256,channels:4,background:'#00000000'}}).composite(parts).png().toFile(file);
  const cue=`${runtime}/B0${kind}-cue.png`;await sharp(file).extract({left:0,top:128,width:128,height:128}).resize(96,96,{kernel:'nearest'}).png().toFile(cue);
  for(const [id,name,size]of [[`boss-fx-${kind}`,`B0${kind}.png`,256],[`boss-cue-theme-${kind}`,`B0${kind}-cue.png`,96]])assets.push({id,path:`effects/boss-signatures-v1/${name}`,width:size,height:size,anchor:[size/2,size],stage:'boss-signatures-v1',sources:[input],visualVerified:false});
  records.push({kind,source:input,frames,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),frameSize:128,layout:'2x2',alphaPreserved:true});
 }
 const manifestFile='public/games/veggie-adventure/assets/manifest.json',m=JSON.parse(fs.readFileSync(manifestFile));m.assets=m.assets.filter(a=>!assets.some(b=>a.id===b.id));m.assets.push(...assets);delete m.deliveryVersion;fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');fs.writeFileSync(source+'/build.json',JSON.stringify({tool:'built-in image_gen',records},null,2)+'\n');console.log(JSON.stringify({effects:7,warningIcons:7,assets:m.assets.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
