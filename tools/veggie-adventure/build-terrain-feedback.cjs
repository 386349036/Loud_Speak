const fs=require('node:fs'),sharp=require('sharp'),crypto=require('node:crypto');
const base='public/games/veggie-adventure/assets',art='art-source/veggie-adventure/terrain/seamless-v2',size=48;
function wrap(data,vertical){
 for(let y=0;y<size;y++)for(let c=0;c<3;c++){const a=(y*size)*4+c,b=(y*size+size-1)*4+c;data[a]=data[b]=Math.round((data[a]+data[b])/2);}
 if(vertical)for(let x=0;x<size;x++)for(let c=0;c<3;c++){const a=x*4+c,b=((size-1)*size+x)*4+c;data[a]=data[b]=Math.round((data[a]+data[b])/2);}
}
(async()=>{
 if(JSON.parse(fs.readFileSync(base+'/manifest.json')).terrainVersion>=3){console.log('World-specific terrain V3 is active; keep it intact. Use build-world-terrain.cjs.');return;}
 const soil=await sharp(art+'/soil-generated.png').resize(size,size,{kernel:'nearest'}).ensureAlpha().raw().toBuffer(),stone=await sharp(art+'/stone-generated.png').resize(size,size,{kernel:'nearest'}).ensureAlpha().raw().toBuffer();
 wrap(stone,true);wrap(soil,false);
 for(let x=0;x<size;x++)for(let c=0;c<4;c++)soil[((size-1)*size+x)*4+c]=stone[x*4+c];
 const palette=[[1,1,1],[.88,.78,.65],[.9,1.05,.8],[.72,1,1.15],[1.08,.9,.65],[1.12,.72,.63],[.65,.7,1.05],[.9,.7,.85]],manifest=JSON.parse(fs.readFileSync(base+'/manifest.json')),report=[];
 fs.mkdirSync(base+'/terrain/seamless-v2',{recursive:true});
 for(let world=1;world<=8;world++)for(let cell=0;cell<2;cell++){
  const data=Buffer.from(cell?stone:soil);for(let i=0;i<data.length;i+=4){for(let c=0;c<3;c++)data[i+c]=Math.min(255,Math.round(data[i+c]*palette[world-1][c]));data[i+3]=255;}
  const id=`W${String(world).padStart(2,'0')}-kit-${cell}`,file=`terrain/seamless-v2/${id}.png`;
  const png=await sharp(data,{raw:{width:size,height:size,channels:4}}).png().toBuffer();fs.writeFileSync(base+'/'+file,png);
  const asset=manifest.assets.find(a=>a.id===id);Object.assign(asset,{path:file,width:size,height:size,anchor:[size/2,size],source:`terrain/seamless-v2/${cell?'stone':'soil'}-generated.png`,stage:'seamless-runtime-v2',seamless:{horizontal:true,vertical:cell===1,opaque:true}});delete asset.grid;delete asset.cell;
  report.push({id,path:file,sha256:crypto.createHash('sha256').update(png).digest('hex')});
 }
 fs.writeFileSync(base+'/manifest.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync(art+'/build-report.json',JSON.stringify({method:'Generated textures, nearest-neighbor runtime sizing, exact shared edge rows/columns and matched soil-to-foundation boundary; original PNGs retained',size,tiles:report},null,2)+'\n');
 console.log('Built 16 opaque terrain tiles from two generated masters; exact horizontal/vertical and inter-layer joins');
})().catch(e=>{console.error(e);process.exitCode=1});
