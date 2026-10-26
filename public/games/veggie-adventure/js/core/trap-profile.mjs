export const TRAP_SCALE=1.5;
const phases=[['hidden',.8],['rumble',.6],['emerge',.4],['idle',1.4],['retract',.4]];
export const TRAP_CYCLE=3.6;
export function trapStage(enemy){
 let elapsed=((enemy.phase||0)%TRAP_CYCLE+TRAP_CYCLE)%TRAP_CYCLE;
 for(const [name,duration] of phases){if(elapsed<duration-1e-9)return {name,elapsed,duration};elapsed-=duration;}
 return {name:'hidden',elapsed:0,duration:.8};
}
export function prepareTrap(enemy,{restartLegacy=false}={}){
 if(enemy.kind!=='trap')return;
 if(enemy.trapScale!==TRAP_SCALE){
  const ratio=TRAP_SCALE/(enemy.trapScale||1),center=enemy.x+enemy.w/2,bottom=enemy.y+enemy.h;
  enemy.w*=ratio;enemy.h*=ratio;enemy.x=center-enemy.w/2;enemy.y=bottom-enemy.h;enemy.trapScale=TRAP_SCALE;
  if(restartLegacy)enemy.phase=0;
 }
 const stage=trapStage(enemy);enemy.active=stage.name==='idle';enemy.warning=['rumble','emerge'].includes(stage.name);
}
