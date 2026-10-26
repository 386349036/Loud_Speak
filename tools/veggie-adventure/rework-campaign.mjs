// Extend authored maps without regenerating or overwriting earlier experiments.
import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {repairGroundSpawn} from './encounter-placement.mjs';
const apply=process.argv.includes('--apply'),report=[];
const baselineArg=process.argv.indexOf('--baseline');
const sources=baselineArg>=0?JSON.parse(fs.readFileSync(process.argv[baselineArg+1],'utf8')):LEVELS;
const box=(x,y,w,h)=>({x,y,w,h});
const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const themes={2:['walnut','cabbage','mushroom'],3:['winged','corn','spike'],4:['fish','jelly','leaper'],5:['spike','walnut','cabbage'],6:['trap','walnut','mushroom'],7:['winged','cloud','spike'],8:['walnut','corn','winged']};
const names={2:'根下矿道',3:'藤架高路',4:'莲池水岸',5:'荆棘果径',6:'炉阀工坊',7:'月光云庭',8:'王庭外廊'};
function gaps(l){const out=[];let end=0;for(const p of [...l.platforms].sort((a,b)=>a.x-b.x)){if(p.x>end)out.push({x:end,w:p.x-end});end=Math.max(end,p.x+p.w);}return out;}
function cutGround(l,x,w,y=208){
 const out=[];for(const p of l.platforms){if(p.x>=x+w||p.x+p.w<=x){out.push(p);continue;}if(p.x<x)out.push({...p,w:x-p.x});if(p.x+p.w>x+w)out.push({...p,x:x+w,w:p.x+p.w-x-w});}if(y!==null)out.push(box(x,y,w,240-y));l.platforms=out.sort((a,b)=>a.x-b.x);
}
function actor(l,x,kind,left,right,y=194){l.enemies.push({id:l.enemies.length,kind,x,y,w:14,h:14,vx:['corn','trap','cloud'].includes(kind)?0:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:x,homeY:y,cooldown:1.2,phase:0,patrolLeft:left,patrolRight:right});}
function brick(l,x,y,item){l.blocks.push({...box(x,y,16,16),kind:'brick',breakable:true,...(item?{item}:{})});}
for(const original of sources.filter(l=>l.world>=2)){
 if(original.reworkVersion===1){report.push({id:original.id,status:'already-applied',width:original.width});continue;}
 const l=structuredClone(original),boss=!!l.boss,add=boss?4096:3328+l.stage*256,at=1408;
 const priorLayout={version:l.layoutVersion||1,width:l.width,timeLimit:l.timeLimit,counts:Object.fromEntries(['blocks','enemies','movers','turrets','gates'].map(k=>[k,l[k].length])),boss:l.boss?{left:l.boss.left,right:l.boss.right}:null};
 l.width+=add;l.exit+=add;l.timeLimit=boss?840:660+l.stage*60;l.layoutVersion=2;l.reworkVersion=1;l.priorLayout=priorLayout;
 if(l.checkpoint>=at)l.checkpoint+=add;
 for(const p of l.platforms){if(p.x>=at)p.x+=add;else if(p.x+p.w>at)p.w+=add;}
 for(const key of ['blocks','enemies','items','movers','hazards','water','turrets','gates'])for(const a of l[key]){
  if(a.x>=at){a.x+=add;for(const k of ['baseX','homeX','patrolLeft','patrolRight'])if(Number.isFinite(a[k]))a[k]+=add;}
  else if(key==='water'&&a.x+a.w>at)a.w+=add;
 }
 for(const m of l.movers)m.oneWay=true;
 if(boss){for(const k of ['x','left','right'])l.boss[k]+=add;l.boss.left=l.width-368;l.boss.right=l.width-80;}
 // A bank starting exactly at the insertion point moves too; explicitly fill the new route.
 cutGround(l,at,add,208);
 l.sections=[{id:'introduction',name:'原关教学与特色机制',from:0,to:at}];
 for(let n=0,x=at;x<at+add;n++,x+=512){
  const length=Math.min(512,at+add-x),wet=l.world===4&&(n%2===0||l.stage===2),hazardModule=([5,6,8].includes(l.world)&&n%3===1),kind=l.world===4&&!wet?(n%3?'cabbage':'winged'):themes[l.world][(n+l.stage-1)%3];
  l.sections.push({id:'route-'+n,name:n%3===2?'回收与补给':names[l.world]+'·'+(n+1),from:x,to:x+length});
  if(length<448){brick(l,x+96,144,'carrot');continue;}
  if(wet){
   l.water.push(box(x+48,160,208,64));cutGround(l,x+48,208,224);
   actor(l,x+128,kind,x+50,x+254,kind==='leaper'?184:184);
   brick(l,x+288,144,n%2?'chili':'carrot');
  }else{
   const variant=(n+l.world+l.stage)%4;
   if(variant===0){for(let t=0;t<5;t++)brick(l,x+64+t*16,192);for(let t=2;t<5;t++)brick(l,x+64+t*16,176);}
   else if(variant===1){for(const dx of [64,80,112,128,144])brick(l,x+dx,192);}
   else if(variant===2){for(const dx of [64,80,128,144])for(const y of [176,192])brick(l,x+dx,y);}
   else for(const dx of [64,80,96,112])brick(l,x+dx,144);
   brick(l,x+160,144,n%3===0?'carrot':n%3===1?'chili':'seed');
   if(!hazardModule)actor(l,x+(kind==='winged'?208:224),kind,x+176,x+256,kind==='cloud'?64:kind==='winged'?112:194);
   if(l.world===2&&n%2===0)l.movers.push({...box(x+192,160,48,8),baseX:x+192,baseY:160,axis:'y',range:16,period:4.5,kind:'lift',oneWay:true,id:'rework-lift-'+n});
   if(l.world===3&&n%2===0)l.movers.push({...box(x+192,160,48,8),baseX:x+192,baseY:160,axis:'x',range:16,period:4,kind:'lift',oneWay:true,id:'rework-lift-'+n});
   if(l.world===5&&n%3===2)l.movers.push({...box(x+192,160,48,8),baseX:x+192,baseY:160,kind:'crumble',oneWay:true,id:'rework-crumble-'+n,timer:0,fallen:false});
   if(hazardModule){l.hazards.push({...box(x+208,l.world===5?200:176,16,l.world===5?8:32),kind:l.world===5?'spikes':'heat',period:4.8,on:1.1,offset:n*.3});if(l.world===8)l.turrets.push({...box(x+256,176,16,32),cooldown:1.5,windup:0});}
  }
  if(!wet||l.stage!==2){const w=l.stage===1?32:48;cutGround(l,x+384,w,null);}
 }
 l.sections.push({id:boss?'boss':'exit',name:boss?'关底分层战场':'终点缓冲',from:at+add,to:l.width});
 if(boss){
  const b=l.boss;
  l.blocks=l.blocks.filter(a=>a.x+a.w<=b.left-32);
  l.movers=l.movers.filter(a=>a.x+a.w<=b.left);
  // Three predictable one-way ledges, never extra pits or lethal arena hazards.
  for(const [n,dx,y,w] of [[0,32,176,48],[1,144,160,48],[2,240,176,32]])l.movers.push({...box(b.left+dx,y,w,8),baseX:b.left+dx,baseY:y,kind:'ledge',oneWay:true,arena:true,id:'arena-ledge-'+n});
  brick(l,b.left-144,144,'carrot');brick(l,b.left-96,144,'chili');
 }
 // Apply the same eight-tile pit buffers, including older long gaps.
 const pits=gaps(l),nearPit=a=>pits.some(g=>a.x<g.x+g.w+128&&a.x+a.w>g.x-128);
 l.blocks=l.blocks.filter(a=>!nearPit(a)).map(a=>({...a,kind:'brick',breakable:true}));
 // Dynamic route platforms do not overlap pit takeoff/landing space either.
 l.movers=l.movers.filter(a=>!String(a.id).startsWith('rework-')||!nearPit({...a,x:a.baseX-(a.axis==='x'?a.range:0),w:a.w+(a.axis==='x'?2*a.range:0)}));
 for(let x=at+32;x<at+add-32;x+=96)if(!pits.some(p=>x<p.x+p.w&&x+10>p.x))l.items.push({...box(x,176,10,12),kind:'seed',collected:false});
 for(const item of l.items){while([...l.platforms,...l.blocks,...l.gates,...l.turrets].some(a=>intersects(item,a))&&item.y>=16)item.y-=16;}
 // Confine original ground patrols to their own bank, outside pit landing buffers.
 for(const e of l.enemies.filter(e=>['mushroom','cabbage','walnut','spike','corn','trap'].includes(e.kind))){
  const bank=l.platforms.find(p=>e.x+e.w/2>=p.x&&e.x+e.w/2<p.x+p.w&&p.y>=208);if(!bank)continue;
  const lo=bank.x+(pits.some(p=>p.x+p.w===bank.x)?128:32),hi=bank.x+bank.w-(pits.some(p=>p.x===bank.x+bank.w)?128:32);
  if(hi-lo>=48){e.x=Math.max(lo,Math.min(hi-e.w,e.x));e.homeX=e.x;e.patrolLeft=Math.max(lo,e.patrolLeft??e.x-48);e.patrolRight=Math.min(hi,e.patrolRight??e.x+62);}
 }
 l.focus=original.focus+'；长路线分段补给，三形态净空'+(boss?'，三层弱点战场':'');
 for(const enemy of l.enemies)repairGroundSpawn(l,enemy);
 const entry={id:l.id,world:l.world,stage:l.stage,oldWidth:original.width,width:l.width,ratio:+(l.width/original.width).toFixed(3),blocks:l.blocks.length,enemies:l.enemies.length,seeds:l.items.length,pits:pits.length,water:l.water.length,movers:l.movers.length,hazards:l.hazards.length,arena:boss?{left:l.boss.left,right:l.boss.right,ledges:l.movers.filter(m=>m.arena).length}:null};report.push(entry);
 if(apply){const file=`public/games/veggie-adventure/levels/world-${String(l.world).padStart(2,'0')}/level-${l.id}.mjs`;fs.writeFileSync(file,'// Campaign rework V1, following the authored 1-4 experiment.\nexport default '+JSON.stringify(l,null,2)+';\n');}
}
const result={version:1,applied:apply,scope:'2-1 through 8-4; world 1 preserved',levels:report};
if(apply)fs.writeFileSync('docs/veggie-adventure/CAMPAIGN_REWORK_REPORT.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({applied:apply,levels:report.length,widths:[...new Set(report.map(l=>l.width))],minRatio:Math.min(...report.filter(l=>l.ratio).map(l=>l.ratio))}));
