const DEGREES = 180 / Math.PI;
const DIRECTIONS = ['N','NE','E','SE','S','SW','W','NW'];
export const normalizeDegrees = value => ((value % 360) + 360) % 360;

// Three.js yaw 0 faces -Z (north), while positive yaw turns toward -X (west).
export function getNavigation(yaw, playerX, playerZ, targetX, targetZ) {
  const heading = normalizeDegrees(-(Number.isFinite(yaw) ? yaw : 0) * DEGREES);
  const dx = targetX - playerX, dz = targetZ - playerZ;
  const distance = Math.hypot(dx,dz);
  const hasTarget = Number.isFinite(distance);
  const arrived = hasTarget && distance < 0.5;
  const bearing = hasTarget && !arrived ? normalizeDegrees(Math.atan2(dx,-dz) * DEGREES) : heading;
  const relativeBearing = normalizeDegrees(bearing - heading + 180) - 180;
  return {heading, direction:DIRECTIONS[Math.round(heading / 45) % 8], bearing, relativeBearing, distance:hasTarget?distance:0, hasTarget, arrived};
}

export function getCompassTicks(heading) {
  const center = Math.floor(heading / 45);
  return Array.from({length:7},(_,i)=>{
    const index = center + i - 3, degrees = index * 45;
    return {degrees,label:DIRECTIONS[((index % 8)+8)%8],offset:(degrees-heading)*0.85,primary:Math.abs(degrees-heading)<=22.5};
  });
}

export function getMapView(playerX,playerZ,span=160,aspect=1.4,pan=null) {
  const height=Math.max(30,Math.min(800,Number.isFinite(span)?span:160));
  const width=height*Math.max(0.25,Math.min(5,Number.isFinite(aspect)?aspect:1.4));
  const x=pan?.x??playerX,z=pan?.z??playerZ;
  return {x:x-width/2,z:z-height/2,width,height};
}
export function projectMapPoint(x,z,view) {
  return {x:(x-view.x)/view.width,y:(z-view.z)/view.height};
}
export function fitMapView(points) {
  const valid=points.filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.z));
  if(!valid.length)return {x:520,z:720,span:160};
  const xs=valid.map(p=>p.x),zs=valid.map(p=>p.z);
  return {x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,span:Math.max(80,Math.max(...xs)-Math.min(...xs)+48,Math.max(...zs)-Math.min(...zs)+48)};
}
