// Nonvisual geometry probe only: disables combat/hazards and leaves water/moving solids enabled.
// This is not a complete-playthrough or difficulty acceptance test.
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import fs from 'node:fs';
const results=[];
const worldOne=process.argv.includes('--world-one-forms');
const standingOnly=process.argv.includes('--standing-only');
for(const level of LEVELS.filter(l=>!worldOne||l.id.startsWith('1-')))for(const form of worldOne?[0,1,2]:[0]){
 let best=0,passed=false,settings=null,successfulSettings=[],attempts=[];
 for(const lookahead of [3,6,9,12]){for(const obstacleLook of [8,16,24]){
  const l=structuredClone(level);l.enemies=[];l.items=[];l.boss=null;l.hazards=[];l.turrets=[];l.gates=[];const g=new Game(l,{form});
  let jump=false,previousX=-1,stuck=0,dive=0;
  for(let i=0;i<120*100;i++){
   const p=g.p,foot=p.y+p.h,solids=g.solids();
   const floorAt=x=>solids.some(s=>x>=s.x&&x<s.x+s.w&&s.y>=foot-1&&s.y<=foot+20);
   const obstacle=solids.some(s=>s.x>=p.x+p.w-.1&&s.x<=p.x+p.w+obstacleLook&&s.y<foot&&s.y+s.h>p.y);
   const ceiling=solids.some(s=>s.x<p.x+p.w+4&&s.x+s.w>p.x&&s.y+s.h<=foot-14&&s.y+s.h>foot-30);
   const trigger=p.grounded&&(!floorAt(p.x+p.w+lookahead)||obstacle||stuck>30)&&!ceiling;
   if(trigger)jump=true;if(p.grounded&&!trigger)jump=false;
   if(p.inWater&&obstacle)dive=40;dive=Math.max(0,dive-1);
   g.step(STEP,{right:true,run:true,jump:(jump||p.inWater)&&!dive,jumpPressed:trigger,down:standingOnly?false:ceiling});
   stuck=Math.abs(g.p.x-previousX)<.02?stuck+1:0;previousX=g.p.x;best=Math.max(best,g.p.x);
   if(g.mode==='won'){passed=true;settings={lookahead,obstacleLook};successfulSettings.push(settings);break;}if(g.mode==='dead'||stuck>240)break;
  }
  attempts.push({lookahead,obstacleLook,mode:g.mode,x:Math.round(g.p.x),y:Math.round(g.p.y),height:g.p.h});
  if(passed&&!standingOnly)break;
 }if(passed&&!standingOnly)break;}
 results.push({id:level.id,form,terrainProbePassed:passed,maxX:Math.round(best),exit:level.exit,settings,successfulSettings,attempts});
}
const report={scope:'terrain-only nonvisual simulation; combat, boss and hazard encounters excluded; not user play acceptance',standingOnly,results};
fs.writeFileSync(`docs/veggie-adventure/${worldOne?'world01-forms-check':'terrain-check'}${standingOnly?'-standing':''}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:results.filter(r=>r.terrainProbePassed).length,total:results.length,failures:results.filter(r=>!r.terrainProbePassed)},null,2));
if(results.some(r=>!r.terrainProbePassed))process.exitCode=1;
