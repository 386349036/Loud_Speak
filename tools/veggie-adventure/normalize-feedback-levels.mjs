import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const report=[];
for(const original of LEVELS){
 const l=structuredClone(original),ground=l.platforms.filter(p=>p.y>=208).sort((a,b)=>a.x-b.x),gaps=[];
 let end=0;for(const p of ground){if(p.x>end)gaps.push({x:end,w:p.x-end});end=Math.max(end,p.x+p.w);}
 const nearPit=b=>gaps.some(g=>b.x<g.x+g.w+128&&b.x+b.w>g.x-128);
 const elevated=l.platforms.filter(p=>p.y<208);l.platforms=l.platforms.filter(p=>p.y>=208);
 const all=[...l.blocks];for(const p of elevated)for(let y=p.y;y<p.y+p.h;y+=16)for(let x=p.x;x<p.x+p.w;x+=16)all.push({x,y,w:Math.min(16,p.x+p.w-x),h:Math.min(16,p.y+p.h-y),kind:'brick'});
 l.blocks=all.filter(b=>!nearPit(b)).map(b=>({...b,kind:'brick',breakable:true}));
 let moved=0;for(const item of l.items||[]){if(item.kind!=='seed')continue;const solids=[...l.platforms,...l.blocks,...(l.gates||[])];while(solids.some(s=>intersects(item,s))&&item.y>=16){item.y-=16;moved++;}}
 const [world]=l.id.split('-');const file=`public/games/veggie-adventure/levels/world-${world.padStart(2,'0')}/level-${l.id}.mjs`;
 fs.writeFileSync(file,'export default '+JSON.stringify(l,null,2)+';\n');
 report.push({id:l.id,gaps,removedNearPit:all.filter(nearPit).length,convertedPlatforms:elevated.length,blocks:l.blocks.length,seedMoves:moved});
}
fs.writeFileSync('docs/veggie-adventure/feedback-level-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
