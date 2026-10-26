import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
import {prepareTrap} from '../../public/games/veggie-adventure/js/core/trap-profile.mjs';

const groundedKinds=new Set(['mushroom','cabbage','walnut','spike','corn','trap']);
function collider(e,x=e.x){const body={...e,x};if(body.kind==='trap')prepareTrap(body);return body;}
export function repairGroundSpawn(level,e){
 if(!groundedKinds.has(e.kind))return null;
 const solids=[...level.platforms,...level.blocks.filter(b=>!b.broken),...(level.gates||[]).filter(g=>!g.open),...(level.movers||[])].filter(s=>!s.oneWay);
 if(!solids.some(s=>overlap(collider(e),s)))return null;
 const bank=level.platforms.find(p=>p.y>=208&&e.x+e.w/2>=p.x&&e.x+e.w/2<p.x+p.w);
 if(!bank)throw Error(`${level.id}/${e.id}: embedded enemy has no supporting bank`);
 const ground=[...level.platforms].sort((a,b)=>a.x-b.x);let end=0;const gaps=[];for(const p of ground){if(p.x>end)gaps.push({x:end,w:p.x-end});end=Math.max(end,p.x+p.w);}
 const lo=bank.x+(gaps.some(g=>g.x+g.w===bank.x)?128:16),hi=bank.x+bank.w-(gaps.some(g=>g.x===bank.x+bank.w)?128:16);
 const candidates=[];for(let x=Math.ceil(lo);x<=hi-e.w;x+=2)candidates.push(x);
 candidates.sort((a,b)=>Math.abs(a-e.x)-Math.abs(b-e.x));
 const x=candidates.find(x=>{const body=collider(e,x),margin={...body,x:body.x-2,w:body.w+4};return !solids.some(s=>overlap(margin,s));});
 if(x===undefined)throw Error(`${level.id}/${e.id}: no safe ground spawn inside pit buffers`);
 const before={x:e.x,y:e.y,patrolLeft:e.patrolLeft,patrolRight:e.patrolRight};
 e.x=x;e.homeX=x;e.patrolLeft=Math.max(lo,x-48);e.patrolRight=Math.min(hi,x+e.w+48);delete e.brain;
 return {id:e.id,kind:e.kind,before,after:{x:e.x,y:e.y,patrolLeft:e.patrolLeft,patrolRight:e.patrolRight}};
}
