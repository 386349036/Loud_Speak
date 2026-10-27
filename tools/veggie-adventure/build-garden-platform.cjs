const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
(async()=>{
 const source='art-source/veggie-adventure/objects/garden-platform-v1',runtime='public/games/veggie-adventure/assets/objects/garden-platform-v1';
 fs.mkdirSync(source,{recursive:true});fs.mkdirSync(runtime,{recursive:true});
 const input=path.join(source,'generated.png'),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,right=0,bottom=0;for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 // Align the long, flat deck with collision y; decorative leaves stay below it.
 let top=0;for(let y=0;y<info.height;y++){let count=0;for(let x=left;x<=right;x++)if(data[(y*info.width+x)*4+3]>128)count++;if(count/(right-left+1)>.88){top=y;break;}}
 const crop={left,top,width:right-left+1,height:bottom-top+1};
 const file=path.join(runtime,'platform-garden-deck.png');await sharp(input).extract(crop).resize(192,64,{kernel:'nearest'}).png().toFile(file);
 const manifestFile='public/games/veggie-adventure/assets/manifest.json',m=JSON.parse(fs.readFileSync(manifestFile));
 const asset={id:'platform-garden-deck',path:'objects/garden-platform-v1/platform-garden-deck.png',width:192,height:64,anchor:[96,64],stage:'garden-platform-v1',sources:[input.replaceAll('\\','/')],visualVerified:false};
 m.assets=m.assets.filter(a=>a.id!==asset.id);m.assets.push(asset);delete m.deliveryVersion;fs.writeFileSync(manifestFile,JSON.stringify(m,null,2)+'\n');
 fs.writeFileSync(path.join(source,'build.json'),JSON.stringify({tool:'built-in image_gen',crop,runtime:asset.path,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),render:{topAlignedWithCollision:true,width:'ledge width',height:16},visualInGameVerified:false},null,2)+'\n');
 console.log(JSON.stringify({asset:asset.id,crop,runtime:file}));
})().catch(e=>{console.error(e);process.exitCode=1;});
