// Authored encounter plans. Generated modules are committed as readable level data.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'public/games/veggie-adventure/levels');
const plan=JSON.parse(fs.readFileSync(path.join(root,'docs/veggie-adventure/scenes/level-asset-map.json'))).levels;
const box=(x,y,w,h)=>({x,y,w,h});
// Each row supplies independent pit/terrain/encounter positions, not a random seed.
const designs={
 '1-2':{gaps:[[544,32],[1072,48]],stairs:[320,752],upper:[[384,160,96],[816,144,112]],enemies:[[240,'cabbage'],[656,'trap'],[960,'mushroom'],[1280,'cabbage']]},
 '1-3':{gaps:[[416,48],[672,48],[976,48],[1248,48]],stairs:[224,784],bridges:[[448,192,32],[1008,192,32]],enemies:[[320,'winged'],[832,'mushroom'],[1168,'winged']]},
 '2-1':{gaps:[[752,32]],ceilings:[[256,160,128,32],[992,160,144,32]],stairs:[544],enemies:[[448,'walnut'],[656,'mushroom'],[1216,'trap']],bricks:[864]},
 '2-2':{gaps:[[448,48],[864,48]],movers:[[432,192,48,'y',64,4],[832,176,64,'y',48,5]],stairs:[272,1056],upper:[[512,144,112],[928,128,96]],water:[[1184,144,240,80]],enemies:[[336,'walnut'],[1232,'jelly'],[1328,'fish']]},
 '2-3':{gaps:[[528,32],[1088,32]],stairs:[304,896],bricks:[416,960,1200],upper:[[368,144,96],[960,144,96]],enemies:[[224,'walnut'],[720,'cabbage'],[1280,'leaper']],water:[[1248,176,160,48]]},
 '3-1':{gaps:[[480,48],[912,48],[1232,48]],stairs:[256,672],upper:[[320,144,112],[736,144,144]],enemies:[[384,'spike'],[784,'corn'],[1136,'winged']]},
 '3-2':{gaps:[[384,64],[736,64],[1120,48]],movers:[[376,192,48,'x',32,3],[728,176,48,'y',32,4],[1112,192,48,'x',40,4]],stairs:[544,912],enemies:[[272,'winged'],[640,'corn'],[1328,'spike']]},
 '3-3':{gaps:[[560,48],[976,48]],stairs:[304,752],upper:[[368,144,80],[816,144,96]],bridges:[[544,192,80],[960,192,80]],enemies:[[432,'corn'],[688,'winged'],[880,'corn'],[1232,'corn']]},
 '4-1':{water:[[288,160,256,64],[864,144,320,80]],gaps:[],stairs:[640],enemies:[[400,'fish'],[976,'jelly'],[1280,'cloud']]},
 '4-2':{water:[[160,64,1248,160]],gaps:[],upper:[[352,144,80],[704,112,80],[1056,160,96]],enemies:[[288,'jelly'],[560,'fish'],[880,'jelly'],[1200,'fish']]},
 '4-3':{water:[[320,160,224,64],[736,160,224,64],[1152,160,224,64]],gaps:[],stairs:[576,992],enemies:[[400,'leaper'],[800,'fish'],[864,'leaper'],[1232,'leaper']]},
 '5-1':{gaps:[[496,32],[1056,48]],hazards:[[320,200,32,8,'spikes'],[768,200,32,8,'spikes'],[1232,200,32,8,'spikes']],enemies:[[224,'spike'],[656,'walnut'],[912,'cabbage']],turrets:[1344]},
 '5-2':{gaps:[[448,48],[864,48],[1248,48]],hazards:[[304,200,32,8,'spikes'],[704,200,32,8,'spikes'],[1120,200,32,8,'spikes']],upper:[[288,176,64],[688,176,64],[1104,176,64]],crumble:[[512,176,64],[944,176,64]],enemies:[[608,'spike'],[1008,'winged']]},
 '5-3':{gaps:[[592,32],[1104,32]],gates:[496,1008],stairs:[320,832],upper:[[384,144,160],[896,144,160]],enemies:[[224,'cabbage'],[704,'walnut'],[1232,'spike']]},
 '6-1':{gaps:[[512,32],[1056,32]],hazards:[[336,176,16,32,'heat'],[784,176,16,32,'heat'],[1248,176,16,32,'heat']],enemies:[[224,'mushroom'],[672,'walnut'],[1152,'trap']]},
 '6-2':{gaps:[[640,32],[1136,32]],stairs:[304,864],turrets:[512,1008,1328],upper:[[368,144,64],[928,144,64]],enemies:[[768,'spike']]},
 '6-3':{gaps:[[480,48],[976,48]],stairs:[256,688],upper:[[320,144,112],[752,144,128]],hazards:[[576,176,16,32,'heat'],[1136,176,16,32,'heat']],chains:[[408,164,24],[840,164,24],[1328,180,20]],enemies:[[640,'trap'],[1232,'walnut']]},
 '7-1':{gaps:[[448,48],[896,48],[1200,48]],stairs:[272,704],enemies:[[368,'winged'],[816,'cloud'],[1296,'mushroom']]},
 '7-2':{gaps:[[576,32],[1024,32]],stairs:[320,800],upper:[[384,144,96],[864,144,96]],enemies:[[528,'cloud'],[944,'cloud'],[1248,'spike']],hazards:[[672,24,12,12,'rock'],[1136,24,12,12,'rock']]},
 '7-3':{gaps:[[512,48],[1088,48]],stairs:[240,720],upper:[[304,144,160],[784,144,176]],movers:[[464,160,48,'x',40,4],[976,144,48,'y',32,4]],enemies:[[400,'corn'],[624,'winged'],[896,'corn'],[1264,'cloud']]},
 '8-1':{gaps:[[464,48],[1008,48]],ceilings:[[640,160,96,32]],movers:[[448,192,48,'x',24,4]],hazards:[[1168,176,16,32,'heat']],stairs:[272],enemies:[[352,'walnut'],[848,'corn'],[1312,'spike']]},
 '8-2':{water:[[320,144,256,80],[944,128,288,96]],gaps:[],turrets:[720,1328],hazards:[[832,176,16,32,'heat']],stairs:[608],enemies:[[416,'fish'],[1056,'jelly'],[1168,'leaper']]},
 '8-3':{gaps:[[416,64],[864,48],[1200,48]],movers:[[408,192,48,'x',32,4]],crumble:[[912,176,64]],hazards:[[624,200,32,8,'spikes'],[1040,176,16,32,'heat']],chains:[[1344,176,20]],stairs:[704],enemies:[[304,'winged'],[768,'corn'],[1120,'walnut']]}
};
const enemy=(x,kind,id,y=194)=>({id,kind,x,y,w:14,h:14,vx:['corn','trap','cloud'].includes(kind)?0:-20,vy:0,state:'walk',timer:0,grace:0,dead:false,homeX:x,homeY:y,cooldown:1.2,phase:0});
const bossNames=['南瓜门卫','洋葱矿主','玉米骑士','莲藕潜王','榴莲堡主','辣椒术士','葡萄双生','石榴王'];
const index=[];
for(const meta of plan){
 const [world,stage]=meta.id.split('-').map(Number),wd='world-'+String(world).padStart(2,'0'),file=path.join(dir,wd,'level-'+meta.id+'.mjs');fs.mkdirSync(path.dirname(file),{recursive:true});
 index.push(`import l${world}${stage} from './${wd}/level-${meta.id}.mjs';`);
 if(meta.id==='1-1')continue;
 const boss=stage===4,design=designs[meta.id]||{},width=boss?1792:1536;
 const level={id:meta.id,name:meta.name,focus:meta.focus,world,stage,width,height:240,timeLimit:boss?420:360,spawn:{x:32,y:180},exit:width-48,checkpoint:boss?width-384:720,background:meta.background,mid:meta.mid,terrain:meta.terrain,platforms:[],blocks:[],enemies:[],items:[],movers:[],hazards:[],water:[],turrets:[],gates:[],boss:null};
 let cursor=0;for(const [x,gap] of design.gaps||[]){level.platforms.push(box(cursor,208,x-cursor,32));cursor=x+gap;}level.platforms.push(box(cursor,208,width-cursor,32));
 for(const x of design.stairs||[])level.platforms.push(box(x,192,32,16),box(x+32,176,32,32));
 for(const [x,y,w] of design.upper||[])level.platforms.push(box(x,y,w,16));
 for(const [x,y,w] of design.bridges||[])level.platforms.push({...box(x,y,w,16),bridge:true});
 for(const v of design.ceilings||[])level.platforms.push({...box(...v),ceiling:true});
 for(const [x,y,w,axis,range,period] of design.movers||[])level.movers.push({...box(x,y,w,8),baseX:x,baseY:y,axis,range,period,kind:'lift',id:'lift-'+x});
 for(const [x,y,w] of design.crumble||[])level.movers.push({...box(x,y,w,8),baseX:x,baseY:y,kind:'crumble',id:'crumble-'+x,timer:0,fallen:false});
 for(const v of design.water||[])level.water.push(box(...v));
 // Lower the pool bed while retaining solid bank transitions.
 for(const pool of level.water){const next=[];for(const g of level.platforms){if(g.y===208&&g.x<pool.x+pool.w&&g.x+g.w>pool.x){const a=Math.max(g.x,pool.x),b=Math.min(g.x+g.w,pool.x+pool.w);if(g.x<a)next.push(box(g.x,208,a-g.x,32));next.push(box(a,224,b-a,16));if(b<g.x+g.w)next.push(box(b,208,g.x+g.w-b,32));}else next.push(g);}level.platforms=next;}
 for(const [x,y,w,h,kind] of design.hazards||[])level.hazards.push({...box(x,y,w,h),kind,period:4,on:1.2,offset:(x%3)*.25});
 for(const [x,y,radius] of design.chains||[])level.hazards.push({...box(x,y,8,8),kind:'chain',radius,period:5});
 for(const x of design.turrets||[])level.turrets.push({...box(x,176,16,32),cooldown:1.5,windup:0});
 for(const x of design.gates||[])level.gates.push({...box(x,176,16,32),open:false});
 for(const x of [160,608,1248])level.blocks.push({...box(x,144,16,16),kind:'reward',item:x===160?'carrot':x===608?'chili':'star'});
 for(const x of design.bricks||[])for(let n=0;n<3;n++)level.blocks.push({...box(x+n*16,144,16,16),kind:'brick'});
 for(const [x,kind] of design.enemies||[]){const pool=level.water.find(w=>x>=w.x&&x<w.x+w.w);level.enemies.push(enemy(x,kind,level.enemies.length,pool?pool.y+24:kind==='cloud'?64:kind==='winged'?160:194));}
 for(let x=128;x<width-128;x+=112){if(!(design.gaps||[]).some(([a,b])=>x>=a&&x<a+b))level.items.push({...box(x,176,10,12),kind:'seed',collected:false});}
 if(boss){
  const left=width-288,right=width-80;
  level.boss={id:'B0'+world,kind:world,name:bossNames[world-1],x:left+128,y:176,w:32,h:32,left,right,hp:3,phase:'idle',timer:0,cycle:0,hits:0,invulnerable:0,active:false,dead:false};
  level.platforms.push(box(left+48,192,32,16),box(right-32,192,32,16));
  const approach=432+world*32;level.platforms.push(box(approach,192,32,16),box(approach+32,176,48,32));
  level.enemies=[enemy(320,world===1?'mushroom':world===2?'walnut':world===3?'corn':world===4?'leaper':world===5?'spike':world===6?'trap':world===7?'winged':'walnut',0),enemy(864,'cabbage',1)];
  level.blocks=level.blocks.filter(b=>b.x<left-32);level.blocks.push({...box(left-96,144,16,16),kind:'reward',item:'chili'});
  if(world===2)level.hazards.push({...box(704,24,12,12),kind:'rock',period:4,on:1,offset:0});
  if(world===4){const px=left+104,pw=96;level.water.push(box(px,176,pw,48));const ground=level.platforms.find(p=>p.y===208&&p.x<=px&&p.x+p.w>=px+pw);level.platforms=level.platforms.filter(p=>p!==ground);level.platforms.push(box(ground.x,208,px-ground.x,32),box(px,224,pw,16),box(px+pw,208,ground.x+ground.w-px-pw,32));}
  if(world===6)level.hazards.push({...box(592,176,16,32),kind:'heat',period:4,on:1.2,offset:0});
  if(world===7)level.movers.push({...box(672,176,64,8),baseX:672,baseY:176,axis:'y',range:24,period:4,kind:'lift',id:'lift-672'});
  if(world===8){level.hazards.push({...box(736,176,16,32),kind:'heat',period:4,on:1.2,offset:0});level.turrets.push({...box(1056,176,16,32),cooldown:1.5,windup:0});}
 }
 fs.writeFileSync(file,'// '+meta.name+' — '+meta.focus+'\nexport default '+JSON.stringify(level,null,2)+';\n');
}
fs.writeFileSync(path.join(dir,'catalog.mjs'),index.join('\n')+`\nexport const LEVELS=[${plan.map(m=>'l'+m.id.replace('-','')).join(',')}];\nexport const levelById=id=>LEVELS.find(l=>l.id===id);\nexport const nextLevel=id=>LEVELS[LEVELS.findIndex(l=>l.id===id)+1]||null;\n`);
console.log('31 new level modules + ordered 32-level catalog; 1-1 preserved.');
