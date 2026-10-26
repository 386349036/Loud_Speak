import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {repairGroundSpawn} from './encounter-placement.mjs';
const applied=process.argv.includes('--apply'),results=[];
for(const source of LEVELS){
 const level=structuredClone(source),fixes=level.enemies.map(e=>repairGroundSpawn(level,e)).filter(Boolean);
 if(!fixes.length)continue;
 results.push({level:level.id,fixes});
 if(applied){const world=level.id.split('-')[0].padStart(2,'0'),file=`public/games/veggie-adventure/levels/world-${world}/level-${level.id}.mjs`,prefix=fs.readFileSync(file,'utf8').split('export default ')[0];fs.writeFileSync(file,prefix+'export default '+JSON.stringify(level,null,2)+';\n');}
}
if(applied&&results.length)fs.writeFileSync('docs/veggie-adventure/ENCOUNTER_SPAWN_FIXES.json',JSON.stringify({applied,results},null,2)+'\n');
console.log(JSON.stringify({applied,levels:results.length,results},null,2));
