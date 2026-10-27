import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
export const steer=(p,x)=>{const dx=x-(p.x+p.vx*.16);return {right:dx>1,left:dx< -1};};
export function terrainGame(level,form=0){const l=structuredClone(level);l.enemies=[];l.items=[];l.hazards=[];l.turrets=[];return new Game(l,{form});}
export function walkTo(g,x,frames=420){for(let n=0;n<frames&&g.mode==='playing';n++){if(Math.abs(g.p.x-x)<1.2&&Math.abs(g.p.vx)<8)return true;g.step(STEP,steer(g.p,x));}return false;}
export function climbRoute(level,route,form=0){
 const g=terrainGame(level,form);g.p.x=route.entry.x;g.p.y=route.entry.foot-g.p.h;for(let n=0;n<20;n++)g.step(STEP);
 const touched=[];let previous={x:0,w:level.width};
 for(const [index,floor]of route.floors.entries()){
  if(index===0&&route.entryMode==='swim-bank'){
   if(!walkTo(g,floor.x-16))return {ok:false,reason:'swim-launch',floor:floor.y};
   let surfaced=false;for(let n=0;n<480;n++){g.step(STEP,{jump:true});if(g.p.y+g.p.h<=floor.y-.5){surfaced=true;break;}}
   if(!surfaced)return {ok:false,reason:'swim-rise',floor:floor.y};
   let landed=false;for(let n=0;n<240;n++){g.step(STEP,steer(g.p,floor.x+10));if(g.p.grounded){landed=Math.abs(g.p.y+g.p.h-floor.y)<.01;break;}}
   if(!landed)return {ok:false,reason:'swim-land',floor:floor.y};
   touched.push(floor.y);previous=floor;continue;
  }
  const launch=Math.min(floor.x-24,previous.x+previous.w-g.p.w-2);
  if(!walkTo(g,launch))return {ok:false,reason:'launch',floor:floor.y,x:g.p.x};
  let landed=false;const target=floor.x+(floor.w-g.p.w)/2;
  for(let n=0;n<180&&g.mode==='playing';n++){g.step(STEP,{...steer(g.p,target),jump:true,jumpPressed:n===0});if(n>4&&g.p.grounded){landed=Math.abs(g.p.y+g.p.h-floor.y)<.01&&g.p.x+g.p.w>floor.x&&g.p.x<floor.x+floor.w;break;}}
  if(!landed)return {ok:false,reason:'landing',floor:floor.y,x:g.p.x,foot:g.p.y+g.p.h};
  touched.push(floor.y);previous=floor;
 }
 if(!walkTo(g,route.rejoin.x))return {ok:false,reason:'rejoin-walk',x:g.p.x};
 for(let n=0;n<180;n++)g.step(STEP);
 const expectedFoot=Math.min(route.rejoin.foot,...level.platforms.filter(p=>p.waterBank&&g.p.x+g.p.w>p.x&&g.p.x<p.x+p.w).map(p=>p.y));
 return {ok:g.mode==='playing'&&Math.abs(g.p.y+g.p.h-expectedFoot)<.01&&g.blocks.every(b=>!b.broken),touched,foot:g.p.y+g.p.h,expectedFoot,rebirths:g.rebirths};
}
export function traverseGround(level,form=0,destroyed=false){
 const g=terrainGame(level,form);if(destroyed)for(const b of g.blocks)if(level.layeredRoutes.some(r=>r.floors.some(f=>b.y===f.y&&b.x>=f.x&&b.x+b.w<=f.x+f.w)))b.broken=true;g.hitBlock=()=>{};let last=-1,stuck=0,hold=0;
 for(let n=0;n<120*100&&g.mode==='playing';n++){
  const p=g.p,foot=p.y+p.h,solids=g.solids(),ahead=p.x+p.w+6,floor=solids.some(s=>ahead>=s.x&&ahead<s.x+s.w&&s.y>=foot-1&&s.y<=Math.max(foot+20,level.leaperBankVersion?208:0)),obstacle=solids.some(s=>!s.oneWay&&s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+16&&s.y<foot&&s.y+s.h>p.y),press=p.grounded&&(!floor||obstacle||stuck>30);
  const nextFloor=solids.filter(s=>s.x>ahead&&s.y>=foot-1&&s.y<=foot+20).sort((a,b)=>a.x-b.x)[0],wideGap=nextFloor&&nextFloor.x-p.x-p.w>56;
  const roofAhead=solids.some(s=>!s.oneWay&&!s.waterBank&&s.y<190&&s.y+s.h>p.y&&s.x>=p.x+p.w-2&&s.x<p.x+p.w+24&&s.y<foot+8);
  if(press)hold=obstacle?.24:level.leaperBankVersion?.65:wideGap?.3:.12;g.step(STEP,{right:true,jump:hold>0||p.inWater&&!roofAhead,jumpPressed:press});hold-=STEP;stuck=Math.abs(g.p.x-last)<.02?stuck+1:0;last=g.p.x;if(stuck>240)break;
 }
 return {mode:g.mode,rebirths:g.rebirths,form:g.p.form,x:g.p.x,foot:g.p.y+g.p.h,time:g.time};
}
