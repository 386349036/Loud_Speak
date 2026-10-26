const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),art='art-source/veggie-adventure/effects/combat-rewards-v1',base='public/games/veggie-adventure/assets';
(async()=>{
 const input=path.join(root,art,'generated.png'),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cw=Math.floor(info.width/2),ch=Math.floor(info.height/2),manifest=JSON.parse(fs.readFileSync(path.join(root,base,'manifest.json'))),report=[];
 const entries=[['reward-rebirth-face',48,48],['item-rebirth',48,48],['projectile-thorn',48,24],['projectile-pea',48,48]];fs.mkdirSync(path.join(root,base,'effects/combat-rewards-v1'),{recursive:true});
 for(let n=0;n<entries.length;n++){
  const [id,w,h]=entries[n],ox=n%2*cw,oy=Math.floor(n/2)*ch;let left=cw,top=ch,right=-1,bottom=-1;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>40){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Empty generated sprite '+id);
  const file='effects/combat-rewards-v1/'+id+'.png',png=await sharp(input).extract({left:ox+left,top:oy+top,width:right-left+1,height:bottom-top+1}).resize(w,h,{fit:'contain',position:'centre',kernel:'nearest',background:'#00000000'}).png().toBuffer();fs.writeFileSync(path.join(root,base,file),png);
  const record={id,path:file,width:w,height:h,anchor:[w/2,h],source:'effects/combat-rewards-v1/generated.png',grid:[2,2],cell:n,stage:'combat-rewards-runtime-v1',visualVerified:false};
  const index=manifest.assets.findIndex(a=>a.id===id);if(index<0)manifest.assets.push(record);else manifest.assets[index]=record;report.push({...record,sha256:crypto.createHash('sha256').update(png).digest('hex')});
 }
 manifest.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path.join(root,base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(root,art,'build-report.json'),JSON.stringify({tool:'built-in image_gen',sourceWidth:info.width,sourceHeight:info.height,sprites:report},null,2)+'\n');console.log('Built four transparent reward/projectile PNGs');
})().catch(e=>{console.error(e);process.exitCode=1;});
