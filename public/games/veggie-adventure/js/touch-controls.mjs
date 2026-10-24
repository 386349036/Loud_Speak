export function stickDirection(dx,dy,radius){const length=Math.hypot(dx,dy),ratio=length>radius?radius/length:1,x=dx*ratio,y=dy*ratio;return {x,y,left:x< -radius*.24,right:x>radius*.24,down:y>radius*.42};}
export function bindTouchControls(stick,buttons,{enabled,jump}){
 let pointer=null,direction={},actions=new Map();const knob=stick.querySelector('.stick-knob');
 const active=key=>!!direction[key]||[...actions.values()].includes(key);
 const paint=()=>{for(const b of buttons)b.classList.toggle('active',[...actions.values()].includes(b.dataset.key));};
 const resetStick=()=>{pointer=null;direction={};knob.style.transform='translate(0px,0px)';stick.classList.remove('active');};
 const move=e=>{if(e.pointerId!==pointer)return;const r=stick.getBoundingClientRect();direction=stickDirection(e.clientX-r.left-r.width/2,e.clientY-r.top-r.height/2,r.width*.3);knob.style.transform=`translate(${direction.x}px,${direction.y}px)`;};
 stick.addEventListener('pointerdown',e=>{if(!enabled()||pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stick.classList.add('active');move(e);});
 stick.addEventListener('pointermove',move);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,e=>{if(e.pointerId===pointer)resetStick();});
 for(const b of buttons){b.addEventListener('pointerdown',e=>{if(!enabled()||e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);if(b.dataset.key==='jump'&&!active('jump'))jump();actions.set(e.pointerId,b.dataset.key);paint();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{actions.delete(e.pointerId);paint();});}
 return {active,clear(){resetStick();actions.clear();paint();}};
}
