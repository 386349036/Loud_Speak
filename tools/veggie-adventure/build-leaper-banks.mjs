import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';

export function leaperPools(level){
 return (level.water||[]).filter(w=>level.enemies.some(e=>e.kind==='leaper'&&e.homeX>=w.x&&e.homeX+e.w<=w.x+w.w));
}
export function addLeaperBanks(original){
 if(original.leaperBankVersion)return null;
 const pools=leaperPools(original);if(!pools.length)return null;
 const l=structuredClone(original),columns=new Map();
 const add=(x,y)=>{
  // Keep the entire bank on existing dry ground, never fill water or bridge a pit.
  if(!(l.platforms||[]).some(p=>p.y===208&&p.x<=x&&p.x+p.w>=x+16))return;
  columns.set(x,Math.min(columns.get(x)??208,y));
 };
 for(const w of pools)for(const side of [-1,1]){
  for(let i=0;i<2;i++)add(side<0?w.x-16*(i+1):w.x+w.w+16*i,w.y);
  for(let y=w.y+16,i=2;y<208;y+=16,i++)add(side<0?w.x-16*(i+1):w.x+w.w+16*i,y);
 }
 for(const [x,y] of [...columns].sort((a,b)=>a[0]-b[0]))l.platforms.push({x,y,w:16,h:208-y,waterBank:true});
 l.waterBankBlockAdjustments=[];
 for(const [index,b] of l.blocks.entries()){
  const banks=l.platforms.filter(p=>p.waterBank&&overlap(b,p));if(!banks.length)continue;
  const before={x:b.x,y:b.y};b.y=Math.min(128,Math.min(...banks.map(p=>p.y))-48);
  l.waterBankBlockAdjustments.push({index,before,after:{x:b.x,y:b.y}});
 }
 for(const item of l.items){
  if(!l.platforms.some(p=>p.waterBank&&overlap(item,p)))continue;
  let hits;while((hits=[...l.platforms,...l.blocks,...l.gates].filter(p=>overlap(item,p))).length)item.y=Math.min(...hits.map(p=>p.y))-item.h-8;
 }
 const prior={version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length]))};
 l.priorLayouts=[...(l.priorLayouts||[l.priorLayout]).filter(Boolean),prior];
 l.layoutVersion=prior.version+1;l.leaperBankVersion=1;
 return l;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=[];
 for(const old of LEVELS){const l=addLeaperBanks(old);if(!l)continue;
  const path=`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`;
  fs.writeFileSync(path,'// Optional breakable upper branches and raised soil banks at leaper pools.\nexport default '+JSON.stringify(l,null,2)+';\n');
  report.push({id:l.id,pools:leaperPools(l),columns:l.platforms.filter(p=>p.waterBank).length,layoutVersion:l.layoutVersion});
 }
 console.log(JSON.stringify(report,null,2));
}
