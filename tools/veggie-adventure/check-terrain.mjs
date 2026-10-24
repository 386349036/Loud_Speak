// Nonvisual geometry probe only: disables combat/hazards and leaves water/moving solids enabled.
// This is not a complete-playthrough or difficulty acceptance test.
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import fs from 'node:fs';
const results=[];
for(const level of LEVELS){
 let best=0,passed=false,settings=null;
 for(const lookahead of [3,6,9,12]){for(const obstacleLook of [8,16,24]){
  const l=structuredClone(level);l.enemies=[];l.items=[];l.boss=null;l.hazards=[];l.turrets=[];l.gates=[];const g=new Game(l);
  let jump=false,previousX=-1,stuck=0,dive=0;
  for(let i=0;i<120*100;i++){
   const p=g.p,foot=p.y+p.h,solids=g.solids();
   const floorAt=x=>solids.some(s=>x>=s.x&&x<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20);
   const obstacle=solids.some(s=>s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+obstacleLook&&s.y<foot&&s.y+s.h>p.y);
   const ceiling=solids.some(s=>s.x<p.x+p.w+4&&s.x+s.w>p.x&&s.y+s.h<=foot-14&&s.y+s.h>foot-30);
   const trigger=p.grounded&&(!floorAt(p.x+p.w+lookahead)||obstacle||stuck>30)&&!ceiling;
   if(trigger)jump=true;if(p.grounded&&!trigger)jump=false;
   if(p.inWater&&obstacle)dive=40;dive=Math.max(0,dive-1);
   g.step(STEP,{right:true,run:true,jump:(jump||p.inWater)&&!dive,jumpPressed:trigger,down:ceiling});
   stuck=Math.abs(g.p.x-previousX)<.02?stuck+1:0;previousX=g.p.x;best=Math.max(best,g.p.x);
   if(g.mode==='won'){passed=true;settings={lookahead,obstacleLook};break;}if(g.mode==='dead'||stuck>240)break;
  }
  if(passed)break;
 }if(passed)break;}
 results.push({id:level.id,terrainProbePassed:passed,maxX:Math.round(best),exit:level.exit,settings});
}
const report={scope:'terrain-only nonvisual simulation; combat, boss and hazard encounters excluded; not user play acceptance',results};
fs.writeFileSync('docs/veggie-adventure/terrain-check.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:results.filter(r=>r.terrainProbePassed).length,total:32,failures:results.filter(r=>!r.terrainProbePassed)},null,2));
if(results.some(r=>!r.terrainProbePassed))process.exitCode=1;
