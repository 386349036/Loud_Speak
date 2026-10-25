import fs from 'node:fs';
import {Game,STEP,makeLevel} from '../../public/games/veggie-adventure/js/core/game.mjs';
const flat=()=>{const l=makeLevel();Object.assign(l,{width:4096,exit:4000,checkpoint:3900,spawn:{x:256,y:194},platforms:[{x:0,y:208,w:4096,h:32}],blocks:[],items:[],enemies:[],boss:null});const g=new Game(l);for(let n=0;n<30;n++)g.step(STEP,{});return g;};
const jumps=[];
for(const run of [0,.5,1])for(const hold of [.05,10]){
 const g=flat();for(let n=0;n<run/STEP;n++)g.step(STEP,{right:true});
 const x=g.p.x,foot=g.p.y+g.p.h;let apex=foot,frames=0;
 do{g.step(STEP,{right:run>0,jump:frames*STEP<hold,jumpPressed:frames===0});apex=Math.min(apex,g.p.y+g.p.h);frames++;}while(!g.p.grounded&&frames<300);
 jumps.push({runSeconds:run,holdSeconds:hold===10?'full':hold,height:+(foot-apex).toFixed(2),distance:+(g.p.x-x).toFixed(2),airtime:+(frames*STEP).toFixed(3)});
}
const g=flat();for(let n=0;n<120;n++)g.step(STEP,{right:true});const x=g.p.x;let n=0;while(g.p.vx>0&&n++<120)g.step(STEP,{});
const report={jumps,stopDistance:+(g.p.x-x).toFixed(2),stopSeconds:+(n*STEP).toFixed(3)};
console.log(JSON.stringify(report,null,2));if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
