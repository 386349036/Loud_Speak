import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const result=[];
for(const source of LEVELS.filter(l=>l.world===4)){
 const l=structuredClone(source);if(l.aquaticPlantVersion===1){result.push({id:l.id,status:'already-applied'});continue;}
 const old={version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length])),boss:l.boss?{left:l.boss.left,right:l.boss.right}:null};
 l.priorLayouts=[...(l.priorLayouts||[l.priorLayout]).filter(Boolean),old];l.layoutVersion=3;l.aquaticPlantVersion=1;
 let added=0;
 for(const water of l.water){
  if(l.boss&&water.x+water.w>l.boss.left)continue;
  const count=Math.max(1,Math.min(5,Math.floor(water.w/96)));
  for(let n=0;n<count;n++){
   const nominal=water.x+water.w*(n+1)/(count+1)-10;
   for(const shift of [0,24,-24,40,-40]){
    const x=Math.round(nominal+shift),floor=Math.min(water.y+water.h,...l.platforms.filter(p=>p.x<x+20&&p.x+p.w>x&&p.y>=water.y).map(p=>p.y));
    const body={x,y:floor-24,w:20,h:24};if(x<water.x+16||x+20>water.x+water.w-16||[...l.platforms,...l.blocks,...l.enemies].some(a=>overlap(body,a)))continue;
    l.enemies.push({...body,id:l.enemies.length,kind:'anemone',vx:0,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:x,homeY:body.y,phase:0,cooldown:1.4+n*.45});added++;break;
   }
  }
 }
 const file=`public/games/veggie-adventure/levels/world-04/level-${l.id}.mjs`;fs.writeFileSync(file,'// Long water-world route with rooted aquatic plant enemies.\nexport default '+JSON.stringify(l,null,2)+';\n');result.push({id:l.id,added,totalEnemies:l.enemies.length,layoutVersion:3});
}
fs.writeFileSync('docs/veggie-adventure/AQUATIC_PLANTS_REPORT.json',JSON.stringify({version:1,scope:'world 4 pool beds; boss-only pool excluded',levels:result},null,2)+'\n');console.log(JSON.stringify(result));
