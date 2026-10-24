// Deterministic extraction from the recorded 3x2 character / 4x2 environment layouts.
// Keeps source files intact. These are temporary key poses, not new/final animations.
const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),art=path.join(root,'art-source/veggie-adventure'),out=path.join(root,'public/games/veggie-adventure/assets');
async function main(){
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));
 manifest.assets=manifest.assets.filter(a=>!a.campaign);
 const add=a=>manifest.assets.push({...a,campaign:true,stage:'temporary-key-pose-runtime',visualVerified:false});
 async function slice(a,cols,rows,n,id,w,h,fill=false){
  const source=path.join(art,a.path),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const cw=Math.floor(info.width/cols),ch=Math.floor(info.height/rows),ox=n%cols*cw,oy=Math.floor(n/cols)*ch;
  let x0=cw,y0=ch,x1=-1,y1=-1;for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>40){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<0)throw Error('Empty cell '+id);
  const file='campaign/'+id+'.png';
  await sharp(source).extract({left:ox+x0,top:oy+y0,width:x1-x0+1,height:y1-y0+1}).resize(w,h,{fit:fill?'fill':'contain',position:'bottom',kernel:'nearest',background:'#00000000'}).png().toFile(path.join(out,file));
  add({id,path:file,width:w,height:h,anchor:[w/2,h],source:a.path,grid:[cols,rows],cell:n});
 }
 fs.mkdirSync(path.join(out,'campaign'),{recursive:true});
 const scenes=JSON.parse(fs.readFileSync(path.join(art,'scenes/all-worlds-manifest.json'))).assets;
 for(const a of scenes){
  if(['far','mid','arena'].includes(a.kind)){
   const file='campaign/'+a.id+'.png';await sharp(path.join(art,a.path)).resize({width:1008,kernel:'nearest'}).png().toFile(path.join(out,file));add({id:a.id,path:file,source:a.path});
  }else if(a.kind==='kit')for(let n=0;n<3;n++)await slice(a,4,2,n,a.id+'-'+n,48,48,true);
  else if(a.kind==='special')await slice(a,4,2,7,a.id+'-exit',96,144);
 }
 const chars=JSON.parse(fs.readFileSync(path.join(art,'concept-manifest.json'))).assets.filter(a=>/^[EBN]\d\d$/.test(a.id));
 for(const a of chars)for(const n of a.id.startsWith('B')?[1,2,3,4,5]:[1])await slice(a,3,2,n,a.id+'-'+n,a.id.startsWith('B')?120:48,a.id.startsWith('B')?120:48);
 if(!manifest.animations)manifest.status='campaign-runtime-key-poses';manifest.assets.sort((a,b)=>a.id.localeCompare(b.id));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Runtime assets:',manifest.assets.length);
}
main().catch(e=>{console.error(e);process.exitCode=1});
