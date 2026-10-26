export function beginShellAttack(game,e,a,direction){
 if(!['cabbage','walnut','spike'].includes(e.kind))return false;
 a.direction=direction;a.seen=0;a.attackCooldown=e.kind==='spike'?2.4:2;e.facing=direction;e.aiWarning=true;
 if(e.kind==='spike'){
  a.mode='volley';a.timer=.45;e.vx=0;e.intent='spine-volley';
  const sx=e.x+e.w/2,sy=e.y+e.h/2,dx=game.p.x+game.p.w/2-sx,dy=game.p.y+game.p.h/2-sy,length=Math.hypot(dx,dy);
  const ux=length>1e-6?dx/length:direction,uy=length>1e-6?dy/length:0,offset=Math.max(e.w,e.h)/2+3;
  game.dangers.push({x:sx+ux*offset-2.5,y:sy+uy*offset-2.5,w:5,h:5,vx:ux*96,vy:uy*96,gravity:0,life:2,kind:'thorn'});
  game.emitSound?.('spine-volley',e);
 }else{
  a.mode='dash';a.dashRemaining=32;a.dashLastX=e.x;e.vx=direction*128;e.intent='dash';game.emitSound?.('shell-dash',e);
 }
 return true;
}
export function finishShellDash(e){
 const a=e.brain;if(a?.mode!=='dash')return;
 const moved=(e.x-a.dashLastX)*a.direction;a.dashRemaining=Math.max(0,a.dashRemaining-Math.max(0,moved));
 if(moved<=1e-8||a.dashRemaining<=1e-6){a.mode='pursue';a.timer=0;e.vx=a.direction*(e.kind==='walnut'?60:72);e.aiWarning=false;e.intent='pursue';}
}
export function stompSound(e){
 if(['winged','cloud','bolt'].includes(e.kind))return 'stomp-flight';
 if(['cabbage','walnut','spike'].includes(e.kind))return 'stomp-shell';
 if(['fish','jelly','leaper','anemone'].includes(e.kind))return 'stomp-water';
 return 'stomp-normal';
}
