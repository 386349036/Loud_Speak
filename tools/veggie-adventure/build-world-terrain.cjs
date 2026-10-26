// Slice independently generated world atlases; keep original PNGs and v2 assets intact.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),art=path.join(root,'art-source/veggie-adventure/terrain/world-specific-v3'),base=path.join(root,'public/games/veggie-adventure/assets');
const size=48,band=4,hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function joint(buffers,axis){
 const result=new Uint8Array(size*4);
 for(let i=0;i<size;i++)for(let c=0;c<4;c++){
  const a=(axis==='x'?i*size:i)*4+c,b=(axis==='x'?i*size+size-1:(size-1)*size+i)*4+c;
  result[i*4+c]=c===3?255:Math.round(buffers.reduce((sum,data)=>sum+data[a]+data[b],0)/(buffers.length*2));
 }return result;
}
function smoothEdge(data,axis,target){
 for(let i=0;i<size;i++)for(let d=0;d<band;d++)for(const opposite of [false,true]){
  const x=axis==='x'?(opposite?size-1-d:d):i,y=axis==='y'?(opposite?size-1-d:d):i,t=(band-d)/band;
  for(let c=0;c<3;c++){const at=(y*size+x)*4+c;data[at]=Math.round(data[at]*(1-t)+target[i*4+c]*t);}data[(y*size+x)*4+3]=255;
 }
}
function walkableRim(data){
 for(let x=0;x<size;x++){let best=0,score=-1;for(let y=0;y<6;y++){const i=(y*size+x)*4,s=data[i]*.22+data[i+1]*.65+data[i+2]*.13;if(s>score){best=i;score=s;}}for(let c=0;c<3;c++)data[x*4+c]=data[best+c];}
}
async function main(){
 const plan=JSON.parse(fs.readFileSync(path.join(art,'plan.json'))),manifestFile=path.join(base,'manifest.json'),manifest=JSON.parse(fs.readFileSync(manifestFile)),report=[];
 const directory='terrain/world-specific-v3';fs.mkdirSync(path.join(base,directory),{recursive:true});
 manifest.terrainVersion=3;manifest.terrainSets={};
 for(const world of plan.worlds){
  const source=path.join(art,world.id+'-generated.png'),meta=await sharp(source).metadata(),cw=Math.floor(meta.width/2),ch=Math.floor(meta.height/2),tiles=[];
  for(let n=0;n<4;n++){
   const data=await sharp(source).extract({left:(n%2)*cw,top:Math.floor(n/2)*ch,width:cw,height:ch}).resize(size,size,{kernel:'nearest',fit:'fill'}).flatten({background:'#16261d'}).ensureAlpha().raw().toBuffer();
   for(let i=3;i<data.length;i+=4)data[i]=255;
   tiles.push(data);
  }
  const soil=tiles.slice(0,2),foundation=tiles.slice(2);
  for(const data of soil)walkableRim(data);
  // All variants share matching boundaries; only the four-pixel technical bands change.
  const foundationHorizontal=joint(foundation,'x');for(const d of foundation)smoothEdge(d,'x',foundationHorizontal);
  const foundationVertical=joint(foundation,'y');for(const d of foundation)smoothEdge(d,'y',foundationVertical);
  // Match corners after the vertical pass so all four possible foundation joins agree.
  for(const d of foundation)for(let y=0;y<size;y++)for(let c=0;c<4;c++)d[(y*size+size-1)*4+c]=d[y*size*4+c];
  const soilHorizontal=joint(soil,'x');for(const d of soil)smoothEdge(d,'x',soilHorizontal);
  for(const d of soil)for(let y=size-band;y<size;y++){
   const t=(y-(size-band)+1)/band;for(let x=0;x<size;x++)for(let c=0;c<3;c++){const at=(y*size+x)*4+c;d[at]=Math.round(d[at]*(1-t)+foundation[0][x*4+c]*t);}
  }
  const assets=[];
  for(let n=0;n<4;n++){
   const cell=n<2?0:1,variant=n%2?'b':'a',id=world.id+'-kit-'+cell+(variant==='b'?'b':''),file=directory+'/'+id+'.png';
   const png=await sharp(tiles[n],{raw:{width:size,height:size,channels:4}}).png().toBuffer();fs.writeFileSync(path.join(base,file),png);
   let asset=manifest.assets.find(a=>a.id===id);if(!asset){asset={id,campaign:true};manifest.assets.push(asset);}
   Object.assign(asset,{path:file,width:size,height:size,anchor:[size/2,size],source:'terrain/world-specific-v3/'+world.id+'-generated.png',grid:[2,2],cell:n,stage:'world-terrain-runtime-v3',visualVerified:false,seamless:{horizontal:true,vertical:cell===1,opaque:true,variantCompatible:true},world:world.id,material:cell===0?'surface-soil':'foundation',variant});
   assets.push({id,path:file,cell:n,kind:asset.material,variant,sha256:hash(png)});
  }
  manifest.terrainSets[world.id]={name:world.name,soil:[assets[0].id,assets[1].id],foundation:[assets[2].id,assets[3].id],source:assets[0].source};
  report.push({id:world.id,name:world.name,source:path.basename(source),sourceWidth:meta.width,sourceHeight:meta.height,sourceSha256:hash(fs.readFileSync(source)),prompt:world.prompt,tiles:assets});
 }
 manifest.assets.sort((a,b)=>a.id.localeCompare(b.id));fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
 fs.writeFileSync(path.join(art,'build-report.json'),JSON.stringify({version:3,size,method:'8 independent built-in image_gen biome atlases; nearest-neighbor slicing; four-pixel shared seam bands; opaque aligned walking rim; source PNGs retained',worlds:report},null,2)+'\n');
 console.log(JSON.stringify({worlds:report.length,tiles:report.reduce((n,w)=>n+w.tiles.length,0),manifestAssets:manifest.assets.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
