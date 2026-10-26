export function beginShellAttack(game,e,a,direction){
 if(!['cabbage','walnut','spike'].includes(e.kind))return false;
 a.direction=direction;a.seen=0;a.attackCooldown=e.kind==='spike'?2.4:2;e.facing=direction;e.aiWarning=true;
 if(e.kind==='spike'){
  a.mode='volley';a.timer=.45;e.vx=0;e.intent='spine-volley';
  const speed=96;for(const [vx,vy] of [[direction*speed,0],[0,-speed],[direction*speed/Math.SQRT2,-speed/Math.SQRT2]])game.dangers.push({x:e.x+e.w/2-2.5+(vx?direction*(e.w/2+3):0),y:e.y+(vy<0?-6:4),w:5,h:5,vx,vy,gravity:0,life:2,kind:'thorn'});
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
