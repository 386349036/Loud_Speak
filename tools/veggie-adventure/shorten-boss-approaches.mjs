import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {auditCampaignLevel,repairCampaignLevel} from './review-campaign-rules.mjs';

// Remove travel from the middle, never scale the arena, tiles or actors.
export function shortenBossApproach(source){
 if(!source.boss||source.bossRouteVersion>=2)return null;
 if(source.bossRouteVersion!==1)throw Error(source.id+' requires the reviewed half-length layout');
 const l=structuredClone(source),width=Math.floor(l.width*.4/16)*16,removed=l.width-width,from=432,to=from+removed;
 for(const x of [from,to])if(!l.platforms.some(p=>p.x<=x-128&&p.x+p.w>=x+128&&p.y===208))throw Error(l.id+' unsafe splice');
 if(to>=l.boss.left-128)throw Error(l.id+' arena buffer cut');
 const map=x=>x<=from?x:x>=to?x-removed:from;
 const slice=a=>{const out=[];if(a.x<from)out.push({...a,w:Math.min(a.x+a.w,from)-a.x});if(a.x+a.w>to){const x=Math.max(a.x,to);out.push({...a,x:x-removed,w:a.x+a.w-x});}return out.filter(a=>a.w>0);};
 l.priorLayouts=[...(l.priorLayouts||[l.priorLayout]).filter(Boolean),{version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length])),boss:{left:l.boss.left,right:l.boss.right}}];
 l.platforms=l.platforms.flatMap(slice);l.water=l.water.flatMap(slice);
 for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates'])l[key]=l[key].filter(a=>a.x+a.w<=from||a.x>=to).map(a=>{const b={...a,x:map(a.x)};for(const k of ['baseX','homeX','patrolLeft','patrolRight'])if(Number.isFinite(a[k]))b[k]=map(a[k]);return b;});
 // Keep the water world's authored pond and inhabitants in the short approach.
 if(l.world===4){
  const pond=source.water.find(w=>w.h>=56&&w.x>=from&&w.x+w.w<=to);
  if(!pond)throw Error(l.id+' missing water-world pond');
  const x=208,end=x+pond.w,shift=x-pond.x;
  l.platforms=l.platforms.flatMap(p=>{
   if(p.x>=end||p.x+p.w<=x)return [p];
   const parts=[];if(p.x<x)parts.push({...p,w:x-p.x});if(p.x+p.w>end)parts.push({...p,x:end,w:p.x+p.w-end});return parts;
  });
  l.platforms.push({x,y:pond.y+pond.h,w:pond.w,h:240-pond.y-pond.h});l.platforms.sort((a,b)=>a.x-b.x);
  l.water.push({...pond,x});l.water.sort((a,b)=>a.x-b.x);
  l.enemies=l.enemies.filter(e=>e.x+e.w<=x||e.x>=end);
  for(const e of source.enemies.filter(e=>e.x>=pond.x&&e.x+e.w<=pond.x+pond.w)){
   const copy={...e,x:e.x+shift};for(const k of ['homeX','patrolLeft','patrolRight'])if(Number.isFinite(e[k]))copy[k]=e[k]+shift;l.enemies.push(copy);
  }
 }
 for(const k of ['x','left','right'])l.boss[k]-=removed;
 l.width=width;l.exit-=removed;l.checkpoint=map(l.checkpoint);l.layoutVersion++;l.bossRouteVersion=2;
 l.bossRouteHistory=[...(l.bossRouteHistory||[]),l.bossRouteReduction];
 l.bossRouteReduction={priorWidth:source.width,from,to,removed,requestedReduction:.6};
 l.sections=l.sections.map(s=>({...s,from:map(s.from),to:map(s.to)})).filter(s=>s.to>s.from);
 const repairs=repairCampaignLevel(l),issues=auditCampaignLevel(l);if(issues.length)throw Error(l.id+': '+JSON.stringify(issues));
 return {level:l,report:{id:l.id,priorWidth:source.width,width:l.width,removed,reduction:removed/source.width,splice:{from,to},priorApproach:source.boss.left-source.spawn.x,approach:l.boss.left-l.spawn.x,arenaWidth:l.boss.right-l.boss.left,repairs}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.includes('--apply'),before=[],rows=[];
 for(const source of LEVELS){const result=shortenBossApproach(source);if(!result)continue;before.push(source);rows.push(result.report);if(apply){const l=result.level;fs.writeFileSync(`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`,'// Short boss approach; full arena and combat parameters retained.\nexport default '+JSON.stringify(l,null,2)+';\n');}}
 if(apply&&rows.length){fs.writeFileSync('tests/veggie-adventure/fixtures/pre-boss-compact-layouts.json',JSON.stringify(before)+'\n');fs.writeFileSync('docs/veggie-adventure/BOSS_APPROACH_COMPACT_REPORT.json',JSON.stringify({version:2,scope:'1-4 through 8-4',levels:rows},null,2)+'\n');}
 console.log(JSON.stringify({apply,levels:rows},null,2));
}
