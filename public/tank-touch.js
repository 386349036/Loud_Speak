(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TankTouch=api;})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
// Tank movement stays cardinal; the dead zone lets the thumb rest at centre.
function direction(x,y,radius){if(!Number.isFinite(x+y+radius)||radius<=0||Math.hypot(x,y)<radius*.18)return -1;return Math.abs(x)>Math.abs(y)?(x>0?1:3):(y>0?2:0);}
function bind({stick,knob,fire,skill,enabled,onSkill}){
 let pointer=null,dir=-1;const actions=new Map();
 const paint=()=>{fire.classList.toggle('held',[...actions.values()].includes(fire));skill.classList.toggle('held',[...actions.values()].includes(skill));};
 const move=e=>{const r=stick.getBoundingClientRect(),radius=Math.min(r.width,r.height)*.32,x=e.clientX-r.left-r.width/2,y=e.clientY-r.top-r.height/2,length=Math.hypot(x,y),scale=length>radius?radius/length:1;dir=direction(x,y,radius);knob.style.transform=`translate(${x*scale}px,${y*scale}px)`;};
 stick.addEventListener('pointerdown',e=>{if(!enabled()||pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);stick.classList.add('active');move(e);});
 stick.addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();if(enabled())move(e);else reset();});
 const releaseStick=e=>{if(e.pointerId!==pointer)return;pointer=null;dir=-1;knob.style.transform='';stick.classList.remove('active');};
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(event,releaseStick);
 for(const button of [fire,skill]){
  button.addEventListener('pointerdown',e=>{if(!enabled()||button.disabled||e.button!==0||[...actions.values()].includes(button))return;e.preventDefault();button.setPointerCapture(e.pointerId);actions.set(e.pointerId,button);paint();if(button===skill)onSkill();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,e=>{if(actions.get(e.pointerId)!==button)return;actions.delete(e.pointerId);paint();});
 }
 function reset(){const captured=[...actions.entries()];if(pointer!==null)captured.push([pointer,stick]);pointer=null;dir=-1;actions.clear();knob.style.transform='';stick.classList.remove('active');paint();for(const [id,target]of captured)if(target.hasPointerCapture(id))target.releasePointerCapture(id);}
 for(const target of [stick,fire,skill])target.addEventListener('contextmenu',e=>e.preventDefault());
 return {direction:()=>enabled()?dir:-1,fire:()=>enabled()&&[...actions.values()].includes(fire),reset};
}
return {direction,bind};
});
