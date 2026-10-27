import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import source from '../../public/games/veggie-adventure/levels/world-01/level-1-3.mjs';
export function buildLayeredStage(original){
 if(original.layeredRouteVersion>=1)return null;
 const l=structuredClone(original);
 l.priorLayouts=[...(l.priorLayouts||[]),{version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length]))}];
 l.layoutVersion=(l.layoutVersion||1)+1;l.layeredRouteVersion=1;l.focus='地面、阶梯与可破坏高路';
 // Open safe banks for optional upper routes; keep both 48-unit approach jumps.
 l.platforms=[{x:0,y:208,w:416,h:32},{x:464,y:208,w:512,h:32},{x:1024,y:208,w:512,h:32}];
 // Its original implicit patrol crossed into the remaining pit's 8-tile buffer.
 Object.assign(l.enemies.find(e=>e.id===1),{patrolLeft:768,patrolRight:848});
 const plans=[{id:'leaf-steps',entry:96,middle:160,middleWidth:112,top:208,topWidth:64,enemyX:240,kind:'mushroom'},
  {id:'root-canopy',entry:608,middle:672,middleWidth:160,top:720,topWidth:112,enemyX:768,kind:'cabbage'},
  {id:'crown-path',entry:1168,middle:1232,middleWidth:160,top:1280,topWidth:112,enemyX:1344,kind:'mushroom'}];
 l.layeredRoutes=[];let nextId=Math.max(...l.enemies.map(e=>e.id))+1;
 for(const [index,r]of plans.entries()){
  const floors=[{x:r.entry,y:176,w:32},{x:r.middle,y:128,w:r.middleWidth},{x:r.top,y:80,w:r.topWidth}];
  for(const floor of floors)for(let x=floor.x;x<floor.x+floor.w;x+=16)l.blocks.push({x,y:floor.y,w:16,h:16,kind:'brick',breakable:true,route:r.id});
  if(index===1)l.blocks.find(b=>b.route===r.id&&b.x===784&&b.y===80).item='chili';
  for(const x of [r.top+16,r.top+r.topWidth-16])l.items.push({x,y:56,w:10,h:12,kind:'seed',collected:false,route:r.id});
  l.enemies.push({id:nextId++,kind:r.kind,x:r.enemyX,y:66,w:14,h:14,vx:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:r.enemyX,homeY:66,cooldown:1.2,phase:0,patrolLeft:r.top,patrolRight:r.top+r.topWidth,route:r.id});
  l.layeredRoutes.push({id:r.id,optional:true,entry:{x:r.entry-32,foot:208},floors:floors.map(f=>({...f,h:16})),rejoin:{x:r.top+r.topWidth+48,foot:208},enemyId:nextId-1});
 }
 return l;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.includes('--apply'),level=buildLayeredStage(source);
 if(apply&&level){fs.writeFileSync('tests/veggie-adventure/fixtures/pre-layered-1-3.json',JSON.stringify(source)+'\n');fs.writeFileSync('public/games/veggie-adventure/levels/world-01/level-1-3.mjs','// Optional breakable upper routes, with safe ground beneath and two buffered pits.\nexport default '+JSON.stringify(level,null,2)+';\n');}
 console.log(JSON.stringify({apply,changed:!!level,routes:level?.layeredRoutes.length,blocks:level?.blocks.length,enemies:level?.enemies.length}));
}
