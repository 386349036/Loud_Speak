import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';

// Expand combat space only. Keep the entrance and approach intact, and never scale actors.
export function expandBossArena(source){
 if(!source.boss||source.bossArenaVersion>=1)return null;
 const l=structuredClone(source),left=l.boss.left,priorWidth=l.boss.right-left;
 const width=priorWidth*1.5,added=width-priorWidth,right=l.boss.right;
 const map=x=>x<=left?x:x>=right?x+added:left+(x-left)*1.5;
 l.priorLayouts=[...(l.priorLayouts||[l.priorLayout]).filter(Boolean),{version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length])),boss:{left,right}}];
 // Ground and pool boundaries expand together, preserving continuous shorelines.
 for(const key of ['platforms','water'])l[key]=l[key].map(a=>({...a,x:map(a.x),w:map(a.x+a.w)-map(a.x)}));
 for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates'])for(const a of l[key]){
  const x=a.x;a.x=x>=left&&x<right?map(x+a.w/2)-a.w/2:map(x);
  for(const k of ['baseX','homeX'])if(Number.isFinite(a[k]))a[k]+=a.x-x;
  for(const k of ['patrolLeft','patrolRight'])if(Number.isFinite(a[k]))a[k]=map(a[k]);
  if(key==='movers'&&a.arena&&l.world===1)a.visual='garden-deck-v1';
 }
 l.boss.x=map(l.boss.x+l.boss.w/2)-l.boss.w/2;l.boss.right=map(right);
 for(const key of ['exit','checkpoint'])if(Number.isFinite(l[key]))l[key]=map(l[key]);
 for(const s of l.sections||[]){s.from=map(s.from);s.to=map(s.to);}
 l.width+=added;l.layoutVersion=(l.layoutVersion||1)+1;l.bossArenaVersion=1;
 l.bossArenaExpansion={priorWidth,width,added,scale:1.5,priorLevelWidth:source.width};
 return {level:l,report:{id:l.id,left,right:l.boss.right,priorWidth,width,added,priorLevelWidth:source.width,levelWidth:l.width,approachUnchanged:l.boss.left===source.boss.left}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.includes('--apply'),before=[],rows=[];
 for(const source of LEVELS){const result=expandBossArena(source);if(!result)continue;before.push(source);rows.push(result.report);if(apply){const l=result.level;fs.writeFileSync(`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`,'// Expanded boss arena; short approach and actor dimensions retained.\nexport default '+JSON.stringify(l,null,2)+';\n');}}
 if(apply&&rows.length){fs.writeFileSync('tests/veggie-adventure/fixtures/pre-arena-expansion-layouts.json',JSON.stringify(before)+'\n');fs.writeFileSync('docs/veggie-adventure/BOSS_ARENA_EXPANSION_REPORT.json',JSON.stringify({version:1,levels:rows},null,2)+'\n');}
 console.log(JSON.stringify({apply,levels:rows}));
}
