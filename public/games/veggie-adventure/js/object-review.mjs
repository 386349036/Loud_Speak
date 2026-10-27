// Explicit local QA controls. No save writes, automatic movement or combat bypass.
export function objectReviewPoints(levels){
 const points=[];
 for(const l of levels){
  points.push({id:l.id+':entry',level:l.id,name:l.id+' · 入口',x:l.spawn.x});
  for(const [key,label] of [['hazards','机关'],['movers','平台'],['turrets','炮台'],['water','水域'],['gates','壳门']]){
   const seen=new Set();for(const a of l[key]||[]){const kind=a.arena?'arena':a.kind||key;if(seen.has(kind))continue;seen.add(kind);points.push({id:l.id+':'+key+':'+kind,level:l.id,name:l.id+' · '+label+' '+kind,x:kind==='crumble'?a.x+4:Math.max(16,a.x-64),...(kind==='crumble'?{foot:a.y}:{})});}
  }
  if(l.boss)points.push({id:l.id+':boss',level:l.id,name:l.id+' · 首领战',x:l.boss.left+8});
  for(const r of l.layeredRoutes||[]){points.push({id:l.id+':route:'+r.id+':approach',level:l.id,name:l.id+' · 高路 '+r.id+' 入口',x:r.entry.x,foot:r.entry.foot});const f=r.floors.at(-1);points.push({id:l.id+':route:'+r.id+':top',level:l.id,name:l.id+' · 高路 '+r.id+' 顶层',x:f.x+4,foot:f.y});}
 }
 return points;
}
export function reviewSpawn(game,x,foot){
 const p=game.p,solids=game.solids().filter(b=>!b.oneWay),inside=b=>p.x<b.x+b.w&&p.x+p.w>b.x&&p.y<b.y+b.h&&p.y+p.h>b.y;
 for(let n=0;n<32;n++)for(const dir of [1,-1]){const px=Math.max(0,Math.min(game.level.width-p.w,x+dir*n*8)),floor=(foot===undefined?game.level.platforms:game.solids().filter(b=>b.y===foot)).find(b=>px>=b.x&&px+p.w<=b.x+b.w);if(!floor)continue;p.x=px;p.y=floor.y-p.h;if(solids.some(inside))continue;p.vx=0;p.vy=0;p.grounded=true;game.saveCheckpoint();return;}
 throw Error('巡检点附近没有安全落脚处');
}
export function bindObjectReview({document,levels,mount,onSelect}){
 const points=objectReviewPoints(levels),row=document.createElement('div');row.className='level-picker';
 const label=document.createElement('label');label.textContent='素材巡检点';label.htmlFor='object-review-point';const select=document.createElement('select');select.id='object-review-point';select.setAttribute('aria-label','素材巡检点');for(const p of points){const o=document.createElement('option');o.value=p.id;o.textContent=p.name;select.append(o);}
 const button=document.createElement('button');button.textContent='前往巡检点';button.onclick=()=>{const point=points.find(p=>p.id===select.value);if(point)onSelect(point);button.blur();};row.append(label,select,button);mount.append(row);
}
