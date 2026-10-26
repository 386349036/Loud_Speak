const fs=require('node:fs'),path=require('node:path'),sharp=require('sharp'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),source=path.join(root,'art-source/veggie-adventure/ui/warp-labels-v1'),base=path.join(root,'public/games/veggie-adventure/assets');
async function build(){
 const input=path.join(source,'generated-glyphs.png'),{data,info}=await sharp(input).ensureAlpha().raw().toBuffer({resolveWithObject:true}),cells=[];
 for(let i=0;i<9;i++){
  const x0=Math.floor(i%3*info.width/3),x1=Math.floor((i%3+1)*info.width/3),y0=Math.floor(Math.floor(i/3)*info.height/3),y1=Math.floor((Math.floor(i/3)+1)*info.height/3);let left=x1,top=y1,right=-1,bottom=-1;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(data[(y*info.width+x)*4+3]>100){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  if(right<left)throw Error('Missing generated glyph '+i);cells.push({glyph:i===8?'-':String(i+1),rect:{left,top,width:right-left+1,height:bottom-top+1}});
 }
 const scale=Math.min(18/Math.max(...cells.slice(0,8).map(c=>c.rect.height)),16/Math.max(...cells.map(c=>c.rect.width))),glyphs=new Map();
 for(const cell of cells){const w=Math.max(1,Math.round(cell.rect.width*scale)),h=Math.max(1,Math.round(cell.rect.height*scale));glyphs.set(cell.glyph,{w,h,png:await sharp(input).extract(cell.rect).resize(w,h,{kernel:'nearest'}).png().toBuffer()});}
 const manifest=JSON.parse(fs.readFileSync(path.join(base,'manifest.json'))),out=path.join(base,'ui/warp-labels-v1'),report=[];fs.mkdirSync(out,{recursive:true});
 for(let world=1;world<=8;world++)for(let stage=1;stage<=4;stage++){
  const label=world+'-'+stage,layers=[...label].map((char,i)=>{const g=glyphs.get(char);return {input:g.png,left:i*16+Math.floor((16-g.w)/2),top:char==='-'?Math.floor((20-g.h)/2):19-g.h};});
  const id='warp-label-'+label,file='ui/warp-labels-v1/'+label+'.png',png=await sharp({create:{width:48,height:20,channels:4,background:'#00000000'}}).composite(layers).png().toBuffer();fs.writeFileSync(path.join(base,file),png);
  const entry={id,path:file,width:48,height:20,anchor:[24,20],label,stage:'warp-labels-v1',source:'ui/warp-labels-v1/generated-glyphs.png',visualVerified:false},existing=manifest.assets.findIndex(a=>a.id===id);if(existing<0)manifest.assets.push(entry);else manifest.assets[existing]=entry;
  report.push({id,path:file,label,sha256:crypto.createHash('sha256').update(png).digest('hex')});
 }
 manifest.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(path.join(source,'build-report.json'),JSON.stringify({tool:'built-in image_gen',method:'Generated number glyphs, deterministic monospaced PNG assembly; no font substitution',sourceSize:[info.width,info.height],cells,scale,labels:report,visualVerified:false},null,2)+'\n');console.log('Built 32 transparent stage-number PNGs from generated glyphs');
}
build().catch(e=>{console.error(e);process.exitCode=1;});
