const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function moveAquaticPlant(game,e,dt){
 const p=game.p,water=game.level.water?.find(w=>e.homeX+e.w>w.x&&e.homeX<w.x+w.w);
 const floor=water?Math.min(water.y+water.h,...game.level.platforms.filter(s=>s.x<e.homeX+e.w&&s.x+s.w>e.homeX&&s.y>=water.y).map(s=>s.y)):e.homeY+e.h;
 e.x=e.homeX;e.y=floor-e.h;e.vx=0;e.vy=0;e.grounded=true;e.plantPhase??='idle';e.plantTimer=(e.plantTimer||0)+dt;e.cooldown=(e.cooldown??1.2)-dt;
 const visible=water&&p.x+p.w>water.x&&p.x<water.x+water.w&&p.y+p.h>water.y&&Math.abs(p.x-e.x)<112;
 if(e.plantPhase==='idle'){
  e.warning=false;e.intent='rooted';
  if(visible&&e.cooldown<=0){e.plantPhase='windup';e.plantTimer=0;e.aimX=clamp(p.x+p.w/2+p.vx*.15,water.x+4,water.x+water.w-4);e.aimY=clamp(p.y+p.h/2,water.y+4,floor-4);}
  else if(!visible)e.cooldown=Math.max(.5,e.cooldown);
 }else if(e.plantPhase==='windup'){
  e.warning=true;e.intent='spore-cue';
  if(e.plantTimer>=.7){const dx=e.aimX-(e.x+e.w/2),dy=e.aimY-(e.y+4),length=Math.max(1,Math.hypot(dx,dy));game.dangers.push({x:e.x+e.w/2-3,y:e.y+4,w:6,h:6,vx:dx/length*64,vy:dy/length*64,gravity:0,life:2,kind:'spore',aquatic:true});e.plantPhase='attack';e.plantTimer=0;e.cooldown=3.4;e.warning=false;}
 }else if(e.plantPhase==='attack'){
  e.intent='spore-release';if(e.plantTimer>=.4){e.plantPhase='recover';e.plantTimer=0;}
 }else{e.intent='plant-rest';if(e.plantTimer>=.8){e.plantPhase='idle';e.plantTimer=0;}}
}
