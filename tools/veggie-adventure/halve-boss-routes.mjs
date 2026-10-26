import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {auditCampaignLevel,repairCampaignLevel} from './review-campaign-rules.mjs';
const apply=process.argv.includes('--apply'),rows=[],before=LEVELS.filter(l=>l.boss&&!l.bossRouteVersion).map(l=>structuredClone(l));
for(const old of before){
 const l=structuredClone(old),removed=old.width/2,from=l.world===1?1600:1280,to=from+removed;
 for(const x of [from,to])if(!l.platforms.some(p=>p.x<=x-128&&p.x+p.w>=x+128&&p.y===208))throw Error(l.id+' unsafe splice');
 const map=x=>x<=from?x:x>=to?x-removed:from;
 const slice=a=>{const out=[];if(a.x<from)out.push({...a,w:Math.min(a.x+a.w,from)-a.x});if(a.x+a.w>to){const x=Math.max(a.x,to);out.push({...a,x:x-removed,w:a.x+a.w-x});}return out.filter(a=>a.w>0);};
 l.priorLayouts=[...(l.priorLayouts||[l.priorLayout]).filter(Boolean),{version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length])),boss:{left:l.boss.left,right:l.boss.right}}];
 l.platforms=l.platforms.flatMap(slice);l.water=l.water.flatMap(slice);
 for(const key of ['blocks','enemies','items','movers','hazards','turrets','gates'])l[key]=l[key].filter(a=>a.x+a.w<=from||a.x>=to).map(a=>{const b={...a,x:map(a.x)};for(const k of ['baseX','homeX','patrolLeft','patrolRight'])if(Number.isFinite(a[k]))b[k]=map(a[k]);return b;});
 for(const k of ['x','left','right'])l.boss[k]-=removed;
 l.width-=removed;l.exit-=removed;l.checkpoint=map(l.checkpoint);l.layoutVersion=(l.layoutVersion||1)+1;l.bossRouteVersion=1;l.bossRouteReduction={priorWidth:old.width,from,to,removed};
 l.sections=l.sections.map(s=>({...s,from:map(s.from),to:map(s.to)})).filter(s=>s.to>s.from);
 const repairs=repairCampaignLevel(l),issues=auditCampaignLevel(l);if(issues.length)throw Error(l.id+': '+JSON.stringify(issues));
 rows.push({id:l.id,oldWidth:old.width,width:l.width,removed,splice:{from,to},layoutVersion:l.layoutVersion,oldCounts:Object.fromEntries(['blocks','enemies','items'].map(k=>[k,old[k].length])),counts:Object.fromEntries(['blocks','enemies','items'].map(k=>[k,l[k].length])),arena:{left:l.boss.left,right:l.boss.right,ledges:l.movers.filter(m=>m.arena).length},repairs});
 if(apply){const file=`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`;fs.writeFileSync(file,'// Boss approach shortened by half; complete arena and authored mechanics retained.\nexport default '+JSON.stringify(l,null,2)+';\n');}
}
if(apply&&before.length){fs.writeFileSync('tests/veggie-adventure/fixtures/pre-boss-halving-layouts.json',JSON.stringify(before)+'\n');fs.writeFileSync('docs/veggie-adventure/BOSS_ROUTE_HALVING_REPORT.json',JSON.stringify({version:1,scope:'1-4 through 8-4 only',levels:rows},null,2)+'\n');}
console.log(JSON.stringify({applied:apply,levels:rows}));
