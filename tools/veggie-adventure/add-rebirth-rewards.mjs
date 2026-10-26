import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {nearPit} from './review-campaign-rules.mjs';
import {overlap} from '../../public/games/veggie-adventure/js/core/geometry.mjs';
const apply=process.argv.includes('--apply'),levels=LEVELS.filter(l=>l.id.endsWith('-1')),rows=[];
const originals=levels.filter(l=>!l.rebirthRewardVersion);
if(apply&&originals.length&&!fs.existsSync('tests/veggie-adventure/fixtures/pre-rebirth-rewards.json'))fs.writeFileSync('tests/veggie-adventure/fixtures/pre-rebirth-rewards.json',JSON.stringify(originals,null,2)+'\n');
for(const source of levels){
 if(source.rebirthRewardVersion){rows.push({id:source.id,status:'already-applied'});continue;}
 const l=structuredClone(source),b={x:112,y:144,w:16,h:16,kind:'brick',breakable:true,item:'rebirth',rewardId:l.id};
 if(nearPit(l,b)||[...l.platforms,...l.blocks,...l.items,...(l.movers||[])].some(a=>overlap(a,b)))throw Error(l.id+': unsafe reward site');
 const prior={version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit||300,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,(l[k]||[]).length])),boss:null};
 l.priorLayouts=[...(l.priorLayouts||(l.priorLayout?[l.priorLayout]:[])),prior];l.layoutVersion=prior.version+1;l.rebirthRewardVersion=1;l.blocks.push(b);
 rows.push({id:l.id,block:b,oldLayout:prior.version,layoutVersion:l.layoutVersion});
 if(apply){const p=`public/games/veggie-adventure/levels/world-${l.id.split('-')[0].padStart(2,'0')}/level-${l.id}.mjs`,s=fs.readFileSync(p,'utf8');fs.writeFileSync(p,s.slice(0,s.indexOf('export default '))+'export default '+JSON.stringify(l,null,2)+';\n');}
}
if(apply&&originals.length)fs.writeFileSync('docs/veggie-adventure/REBIRTH_REWARD_PLACEMENT.json',JSON.stringify({scope:'one additional +1 block at each world opening stage; existing terrain and upgrades preserved',levels:rows},null,2)+'\n');
console.log(JSON.stringify({apply,worlds:rows.length,modified:rows.filter(r=>r.block).length}));
