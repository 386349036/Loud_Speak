// Charge follows actual horizontal speed, independently of body size.
// Capture this profile at takeoff so midair steering cannot boost the jump.
export function jumpProfile(form=0,charge=1){
 const t=Math.max(0,Math.min(1,charge));
 const height=64+16*t,gravity=625;
 return {velocity:Math.sqrt(2*gravity*height),gravity,fallGravity:1400,cutoff:100};
}
