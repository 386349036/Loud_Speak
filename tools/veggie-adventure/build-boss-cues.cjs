const fs=require('fs'),sharp=require('sharp');
(async()=>{const root='public/games/veggie-adventure/assets',source='art-source/veggie-adventure/effects/boss-cues-v1/source.png';const meta=await sharp(source).metadata();
// Generated icons have unequal gutters; retain complete silhouettes with explicit cuts.
const cuts=[0,.249,.5215,.769,1].map(v=>Math.round(v*meta.width)),ids=['slam','hop','seeds','weak'];
const m=JSON.parse(fs.readFileSync(root+'/manifest.json'));fs.mkdirSync(root+'/effects/boss-cues-v1',{recursive:true});
for(let i=0;i<4;i++){const path='effects/boss-cues-v1/'+ids[i]+'.png';await sharp(await sharp(source).extract({left:cuts[i],top:0,width:cuts[i+1]-cuts[i],height:meta.height}).png().toBuffer()).trim().resize(96,96,{fit:'contain',kernel:'nearest',background:'#00000000'}).png().toFile(root+'/'+path);const asset={id:'boss-cue-'+ids[i],path,width:96,height:96,anchor:[48,96]};const old=m.assets.findIndex(a=>a.id===asset.id);if(old<0)m.assets.push(asset);else m.assets[old]=asset;}
fs.writeFileSync(root+'/manifest.json',JSON.stringify(m,null,2));})();
