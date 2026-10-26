const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const source='art-source/veggie-adventure/effects/player-attacks-v1',root='public/games/veggie-adventure/assets',stage='player-attacks-v1';
(async()=>{
 const out=path.join(root,'effects',stage);fs.mkdirSync(out,{recursive:true});const rows=[];
 for(const name of ['small','large','lightning']){
  const file=path.join(source,name,'generated.png'),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>24){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  if(right<left)throw Error(name+' empty alpha');
  const crop={left,top,width:right-left+1,height:bottom-top+1};
  await sharp(file).extract(crop).resize(88,88,{fit:'contain',kernel:'nearest',background:'#00000000'}).extend({top:4,bottom:4,left:4,right:4,background:'#00000000'}).png().toFile(path.join(out,name+'.png'));
  rows.push({id:'player-shot-'+name,path:`effects/${stage}/${name}.png`,width:96,height:96,anchor:[48,48],stage,visualVerified:false,sources:[file],crop});
 }
 const file=path.join(root,'manifest.json'),m=JSON.parse(fs.readFileSync(file));m.assets=m.assets.filter(a=>a.stage!==stage).concat(rows.map(({crop,...a})=>a));fs.writeFileSync(file,JSON.stringify(m,null,2)+'\n');
 fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',assets:rows},null,2)+'\n');console.log(JSON.stringify({count:rows.length,total:m.assets.length}));
})().catch(e=>{console.error(e);process.exitCode=1;});
