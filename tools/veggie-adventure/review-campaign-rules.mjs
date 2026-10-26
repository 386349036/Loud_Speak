// Recheck existing long maps in place. Never rebuild from the obsolete short-map fixture.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
import {prepareTrap} from '../../public/games/veggie-adventure/js/core/trap-profile.mjs';
const grounded=new Set(['mushroom','cabbage','walnut','spike','corn','trap']);
export function groundGaps(l){let end=0;const out=[];for(const p of [...l.platforms].sort((a,b)=>a.x-b.x)){if(p.x>end)out.push({x:end,w:p.x-end});end=Math.max(end,p.x+p.w);}return out;}
export function nearPit(l,a){return groundGaps(l).some(g=>a.x<g.x+g.w+128&&a.x+a.w>g.x-128);}
export function hazardEnvelope(h){return h.kind==='chain'?{x:h.x-h.radius-3,y:h.y-h.radius-3,w:2*h.radius+6,h:2*h.radius+6}:h.kind==='rock'?{x:h.x,y:24,w:10,h:184}:{...h};}
function body(e){const b={...e};prepareTrap(b);return b;}
function patrol(e){const b=body(e),left=e.patrolLeft??(e.homeX??e.x)-64,right=e.patrolRight??(e.homeX??e.x)+64+b.w;return {x:Math.min(left,b.x),w:Math.max(right,b.x+b.w)-Math.min(left,b.x)};}
function obstacles(l){return [...l.platforms,...l.blocks.filter(b=>!b.broken),...(l.gates||[]).filter(g=>!g.open)];}
function lowClearance(l,b){return b.y<=144&&l.blocks.some(s=>s!==b&&s.y===176&&s.y-b.y-b.h>0&&s.y-b.y-b.h<32&&b.x<s.x+s.w+24&&b.x+b.w>s.x-24);}
export function auditCampaignLevel(l){
 const issues=[];
 for(const [i,b] of l.blocks.entries()){if(nearPit(l,b))issues.push({type:'pit-brick',index:i});if(!b.breakable||b.kind!=='brick')issues.push({type:'unbreakable',index:i});if(lowClearance(l,b))issues.push({type:'low-step-clearance',index:i});}
 for(const [i,h] of l.hazards.entries())if(nearPit(l,hazardEnvelope(h)))issues.push({type:'pit-hazard',index:i});
 for(const [i,t] of l.turrets.entries())if(nearPit(l,t))issues.push({type:'pit-turret',index:i});
 for(const [i,e] of l.enemies.entries())if(grounded.has(e.kind)&&nearPit(l,patrol(e)))issues.push({type:'pit-patrol',index:i});
 const occupied=[...obstacles(l),...l.turrets,...l.hazards.map(hazardEnvelope)];
 for(const [i,item] of l.items.entries())if(occupied.some(b=>overlap(item,b)))issues.push({type:'item-obstacle',index:i});
 return issues;
}
function relocation(l,object,envelope,others){
 const candidates=[],limit=l.boss?l.boss.left-64:l.exit-64;
 for(let x=160;x<limit;x+=2){const trial={...object,x},shape=envelope(trial);if(nearPit(l,shape))continue;
  const foot=l.platforms.find(p=>p.x<=shape.x&&p.x+p.w>=shape.x+shape.w&&p.y>=208);if(!foot)continue;
  if([...obstacles(l),...others].some(s=>overlap({...shape,x:shape.x-2,w:shape.w+4},s)))continue;
  candidates.push(x);
 }
 candidates.sort((a,b)=>Math.abs(a-object.x)-Math.abs(b-object.x));if(!candidates.length)throw Error(l.id+': no safe placement');return candidates[0];
}
export function repairCampaignLevel(l){
 const changes=[];
 for(const [index,b] of l.blocks.entries())if(lowClearance(l,b)){
  const before={x:b.x,y:b.y};while(lowClearance(l,b))b.y-=16;
  changes.push({type:'blocks',index,kind:b.item?'reward-clearance':'step-clearance',before,after:{x:b.x,y:b.y}});
 }
 for(const key of ['hazards','turrets'])for(const [index,a] of l[key].entries()){
  const envelope=key==='hazards'?hazardEnvelope:b=>({...b});if(!nearPit(l,envelope(a)))continue;
  const before={x:a.x,y:a.y},others=[...l.hazards.filter(h=>h!==a).map(hazardEnvelope),...l.turrets.filter(t=>t!==a)];
  a.x=relocation(l,a,envelope,others);changes.push({type:key,index,kind:a.kind||'turret',before,after:{x:a.x,y:a.y}});
 }
 for(const [index,e] of l.enemies.entries()){
  if(!grounded.has(e.kind)||!nearPit(l,patrol(e)))continue;
  const before={x:e.x,patrolLeft:e.patrolLeft,patrolRight:e.patrolRight};
  e.x=relocation(l,e,body,[...l.hazards.map(hazardEnvelope),...l.turrets]);e.homeX=e.x;
  const b=body(e);let lo=16,hi=l.width-16;
  for(const gap of groundGaps(l)){if(gap.x+gap.w<=b.x)lo=Math.max(lo,gap.x+gap.w+128);if(gap.x>=b.x+b.w)hi=Math.min(hi,gap.x-128);}
  e.patrolLeft=Math.max(lo,b.x-48);e.patrolRight=Math.min(hi,b.x+b.w+48);
  changes.push({type:'enemies',index,kind:e.kind,before,after:{x:e.x,patrolLeft:e.patrolLeft,patrolRight:e.patrolRight}});
 }
 const occupied=[...obstacles(l),...l.turrets,...l.hazards.map(hazardEnvelope)];
 for(const [index,item] of l.items.entries())if(occupied.some(b=>overlap(item,b))){
  const before={x:item.x,y:item.y};while(item.y>=16&&occupied.some(b=>overlap(item,b)))item.y-=16;
  if(occupied.some(b=>overlap(item,b)))throw Error(l.id+': no safe item clearance');
  changes.push({type:'items',index,kind:item.kind,before,after:{x:item.x,y:item.y}});
 }
 return changes;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const apply=process.argv.includes('--apply'),rows=[],reportFile='docs/veggie-adventure/LATER28_RULE_REVIEW.json';
 const prior=apply&&fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile,'utf8')):null;
 for(const source of LEVELS.filter(l=>l.world>=2)){
  const l=structuredClone(source),before=auditCampaignLevel(l),changes=repairCampaignLevel(l),remaining=auditCampaignLevel(l);
  if(remaining.length)throw Error(l.id+': '+JSON.stringify(remaining));
  if(apply&&changes.length){const file=`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`,text=fs.readFileSync(file,'utf8');fs.writeFileSync(file,text.slice(0,text.indexOf('export default '))+'export default '+JSON.stringify(l,null,2)+';\n');}
  rows.push({id:l.id,name:l.name,width:l.width,layoutVersion:l.layoutVersion,before,changes,remaining,pits:groundGaps(l),boss:l.boss?.id||null,aquaticPlants:l.enemies.filter(e=>e.kind==='anemone').length});
 }
 const report={scope:'2-1 through 8-4; placement and trajectory audit, not visual or combat acceptance',applied:apply,levels:rows};
 if(apply&&rows.some(r=>r.changes.length)){
  for(const row of rows){const old=prior?.levels.find(r=>r.id===row.id);if(old){row.before=[...old.before,...row.before];row.changes=[...old.changes,...row.changes];}}
  fs.writeFileSync(reportFile,JSON.stringify(report,null,2)+'\n');
 }
 console.log(JSON.stringify({apply,levels:rows.length,changedLevels:rows.filter(r=>r.changes.length).length,changes:rows.reduce((n,r)=>n+r.changes.length,0),levelsChanged:rows.filter(r=>r.changes.length)},null,2));
}
