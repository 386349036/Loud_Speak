import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
import {Game} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {auditCampaignLevel,nearPit,hazardEnvelope} from './review-campaign-rules.mjs';
import {climbRoute} from './layered-route-probe.mjs';
const kinds={2:['walnut','cabbage'],3:['corn','cabbage'],4:['cabbage','mushroom'],5:['spike','walnut'],6:['walnut','corn'],7:['cabbage','spike'],8:['corn','walnut']};
const rect=(x,y,w,h)=>({x,y,w,h});
const expanded=(a,n)=>({...a,x:a.x-n,y:a.y-n,w:a.w+2*n,h:a.h+2*n});
export function addUpperRoute(original,base,index,diagnostics,firstHeight=176,lastWidth){
 const fail=reason=>{if(diagnostics)diagnostics[reason]=(diagnostics[reason]||0)+1;return null;};
 const l=structuredClone(original),id=`upper-${index+1}`,topWidth=lastWidth??[80,96,80][(l.world+index)%3];
 const footprint={x:base-32,y:24,w:topWidth+184,h:184};
 const waters=l.water.filter(w=>w.x<footprint.x+footprint.w&&w.x+w.w>footprint.x),water=waters.find(w=>w.x<=base-32&&w.x+w.w>=base+32);
 if(waters.length&&(!water||water.y<144))return fail('water-transition');
 const firstY=water?water.y:firstHeight;
 const floors=[rect(base,firstY,32,16),rect(base+64,firstY-48,112,16),rect(base+112,firstY-96,topWidth,16)];
 // A low entry ceiling must not pin the player against an adjacent ground step.
 if(!water){const supported=[base,base+16].every(x=>{for(let y=firstY+16;y<208;y+=16)if(!original.blocks.some(b=>b.y===y&&b.x<=x&&b.x+b.w>=x+16))return false;return true;});if(!supported&&original.blocks.some(b=>b.y>=176&&b.y<firstY+30&&b.x<base+64&&b.x+b.w>base-32))return fail('ground-headroom');}
 if(!l.platforms.some(p=>p.y===208&&p.x<=footprint.x&&p.x+p.w>=footprint.x+footprint.w))return fail('bank');
 if(nearPit(l,{x:base,w:112+topWidth}))return fail('pit');
 if([...l.hazards.map(hazardEnvelope),...l.turrets,...l.gates].some(h=>overlap(footprint,expanded(h,24))))return fail('hazard');
 // Moving-platform sweeps keep their established space, not just their initial position.
 if(l.movers.some(m=>{const horizontal=m.axis==='x'?m.range||0:0,vertical=m.axis==='y'?m.range||0:0;return overlap(footprint,expanded({...m,x:m.baseX-horizontal,y:m.baseY-vertical,w:m.w+2*horizontal,h:m.h+2*vertical},12));}))return fail('mover');
 const added=[];
 for(const f of floors)for(let x=f.x;x<f.x+f.w;x+=16){const b={...rect(x,f.y,16,16),kind:'brick',breakable:true,route:id};
  const same=l.blocks.find(a=>a.x===x&&a.y===f.y&&a.w===16&&a.h===16);
  if(same){if(!same.breakable)return null;continue;}
  if(l.blocks.some(a=>overlap(b,a)))return fail('brick-overlap');
  l.blocks.push(b);added.push(b);
 }
 const movedBlocks=[],top=floors[2];
 for(const b of l.blocks.slice(0,original.blocks.length))if(b.y<=144&&b.y>=96&&b.item&&b.item!=='rebirth'&&b.x<base+144+topWidth&&b.x+b.w>base-24){
  const before={x:b.x,y:b.y},x=top.x+top.w-16*(movedBlocks.length+1);
  if(x<top.x)return fail('reward-capacity');
  const slot=added.find(a=>a.x===x&&a.y===top.y);if(!slot)return fail('reward-slot');
  l.blocks=l.blocks.filter(a=>a!==slot);added.splice(added.indexOf(slot),1);
  b.x=x;b.y=top.y;movedBlocks.push({index:l.blocks.indexOf(b),before,after:{x:b.x,y:b.y}});
 }
 if(l.enemies.some(e=>added.some(b=>overlap(e,b))))return null;
 const roof=floors[index%2?1:2],kind=kinds[l.world][index%2],enemyId=Math.max(-1,...l.enemies.map(e=>typeof e.id==='number'?e.id:-1))+1;
 const enemyX=roof.x+Math.floor((roof.w-14)/2),enemy={id:enemyId,kind,x:enemyX,y:roof.y-14,w:14,h:14,vx:kind==='corn'?0:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:enemyX,homeY:roof.y-14,cooldown:1.2,phase:0,patrolLeft:roof.x,patrolRight:roof.x+roof.w,route:id};
 if(l.blocks.some(b=>overlap(enemy,b)))return null;
 l.enemies.push(enemy);
 const movedItems=[];
 for(const [i,item]of l.items.entries())if(l.blocks.some(b=>overlap(item,b))){const before={x:item.x,y:item.y};do{item.y-=16;}while(item.y>=16&&l.blocks.some(b=>overlap(item,b)));if(item.y<16)return null;movedItems.push({index:i,before,after:{x:item.x,y:item.y}});}
 for(const [i,x]of [floors[1].x+32,floors[2].x+16,floors[2].x+floors[2].w-16].entries()){
  const y=i===0?floors[1].y-24:floors[2].y-24,item={...rect(x,y,10,12),kind:'seed',collected:false,route:id};
  if(!l.blocks.some(b=>overlap(item,b))&&!l.items.some(a=>overlap(item,a)))l.items.push(item);
 }
 const reward=added.find(b=>b.y===floors[2].y&&b.x===floors[2].x+32);if(reward&&index===1)reward.item='chili';
 const route={id,optional:true,entry:{x:base-32,foot:208},...(water?{entryMode:'swim-bank'}:{}),floors,rejoin:{x:base+112+topWidth+40,foot:208},enemyId,addedBlocks:added.length,blockAdjustments:movedBlocks,itemAdjustments:movedItems};
 l.layeredRoutes=[...(l.layeredRoutes||[]),route];
 const issues=auditCampaignLevel(l);if(issues.length)return fail('audit:'+issues[0].type);
 const probe=new Game(l);if(probe.enemies.some(e=>probe.solids().filter(s=>!s.oneWay).some(s=>overlap(e,s))))return fail('enemy-solid');
 const climb=climbRoute(l,route);if(!climb.ok)return fail('climb:'+climb.reason+':'+climb.floor);
 return {level:l,route};
}
export function buildLaterLayeredStage(original){
 if(original.world<2||original.boss||original.layeredRouteVersion>=1)return null;
 let l=structuredClone(original);const count=l.stage===1?2:3;
 for(let n=0;n<count;n++){
  const target=l.width*(n+1)/(count+1),candidates=[];
  for(let x=160;x<l.exit-300;x+=16)if(!(l.layeredRoutes||[]).some(r=>Math.abs(r.floors[0].x-x)<448))candidates.push(x);
  candidates.sort((a,b)=>Math.abs(a-target)-Math.abs(b-target));let chosen=null;
  for(const x of candidates){for(const height of [176,160,144]){for(const width of [undefined,80,64]){chosen=addUpperRoute(l,x,n,null,height,width);if(chosen)break;}if(chosen)break;}if(chosen)break;}
  if(!chosen)throw Error(`${l.id}: cannot fit upper branch ${n+1}`);
  l=chosen.level;
 }
 const prior={version:original.layoutVersion||1,width:original.width,timeLimit:original.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,original[k].length]))};
 l.priorLayouts=[...(original.priorLayouts||[original.priorLayout]).filter(Boolean).filter(p=>p.version!==prior.version),prior];
 l.layoutVersion=(original.layoutVersion||1)+1;l.layeredRouteVersion=1;l.focus+='；可破坏中高层支路与高台巡逻';
 return l;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.includes('--apply'),arg=process.argv.indexOf('--baseline'),sources=(arg>=0?JSON.parse(fs.readFileSync(process.argv[arg+1])):LEVELS).filter(l=>l.world>=2&&!l.boss),planned=sources.map(l=>({before:l,after:buildLaterLayeredStage(l)}));
 if(apply&&planned.some(p=>p.after)){
  const fixture='tests/veggie-adventure/fixtures/pre-layered-later21.json';if(!fs.existsSync(fixture))fs.writeFileSync(fixture,JSON.stringify(sources)+'\n');
  for(const {after:l}of planned)if(l)fs.writeFileSync(`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`,'// Optional breakable upper branches; original ground, water and mechanisms preserved.\nexport default '+JSON.stringify(l,null,2)+';\n');
  fs.writeFileSync('docs/veggie-adventure/LAYERED_LATER21_REPORT.json',JSON.stringify({version:1,scope:'2-1 through 8-3, non-boss stages',levels:planned.filter(p=>p.after).map(({before,after:l})=>({id:l.id,routes:l.layeredRoutes,oldBlocks:before.blocks.length,blocks:l.blocks.length,oldEnemies:before.enemies.length,enemies:l.enemies.length,layoutVersion:l.layoutVersion}))},null,2)+'\n');
 }
 console.log(JSON.stringify({apply,changed:planned.filter(p=>p.after).length,levels:planned.map(({before,after:l})=>({id:before.id,routes:l?.layeredRoutes.map(r=>({x:r.entry.x,enemy:r.enemyId,foot:l.enemies.find(e=>e.id===r.enemyId).y+14})),blocks:l?.blocks.length}))},null,2));
}
