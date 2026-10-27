export const PROJECTILE_RANGE_TILES=10;
export const PROJECTILE_RANGE=16*PROJECTILE_RANGE_TILES;
// Count actual flight, including vertical arcs and bounces, independent of lifetime.
export function limitProjectileRange(p,oldX,oldY){
 const dx=p.x-oldX,dy=p.y-oldY,step=Math.hypot(dx,dy);
 if(!step)return false;
 const remaining=Math.max(0,PROJECTILE_RANGE-(p.travelled||0));
 if(step>=remaining){
  const fraction=remaining/step;p.x=oldX+dx*fraction;p.y=oldY+dy*fraction;
  p.travelled=PROJECTILE_RANGE;p.life=0;return true;
 }
 p.travelled=(p.travelled||0)+step;return false;
}
