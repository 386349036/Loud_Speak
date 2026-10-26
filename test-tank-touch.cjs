const assert=require('node:assert/strict');
const {direction,bind}=require('./public/tank-touch.js');
class Target{
 constructor(){this.handlers={};this.style={};this.classes=new Set();this.captured=new Set();this.disabled=false;this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 getBoundingClientRect(){return {left:10,top:20,width:100,height:100};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);this.emit('lostpointercapture',{pointerId:id});}
 emit(type,fields={}){const event={pointerId:1,button:0,clientX:60,clientY:70,preventDefault(){this.prevented=true;},...fields};for(const fn of this.handlers[type]||[])fn(event);return event;}
}
let enabled=true,uses=0;const stick=new Target(),knob=new Target(),fire=new Target(),skill=new Target();
const touch=bind({stick,knob,fire,skill,enabled:()=>enabled,onSkill:()=>uses++});
assert.equal(direction(0,0,32),-1);assert.equal(direction(2,2,32),-1);assert.equal(direction(30,8,32),1);assert.equal(direction(-30,8,32),3);assert.equal(direction(8,-30,32),0);assert.equal(direction(8,30,32),2);assert.equal(direction(NaN,0,32),-1);
stick.emit('pointerdown',{clientX:100});assert.equal(touch.direction(),1);assert(stick.classes.has('active'));
stick.emit('pointerdown',{pointerId:2,clientX:0});assert.equal(touch.direction(),1);
stick.emit('pointermove',{clientX:60,clientY:0});assert.equal(touch.direction(),0);assert.equal(knob.style.transform,'translate(0px,-32px)');
fire.emit('pointerdown',{pointerId:2});assert(touch.fire());assert.equal(touch.direction(),0);assert(fire.classes.has('held'));
fire.emit('pointerup',{pointerId:99});assert(touch.fire());
skill.emit('pointerdown',{pointerId:3});assert.equal(uses,1);assert(touch.fire());assert.equal(touch.direction(),0);
skill.emit('pointerdown',{pointerId:4});assert.equal(uses,1);
fire.emit('pointercancel',{pointerId:2});assert(!touch.fire());assert.equal(touch.direction(),0);
stick.emit('lostpointercapture');assert.equal(touch.direction(),-1);assert.equal(knob.style.transform,'');
touch.reset();assert.equal(skill.captured.size,0);assert(!skill.classes.has('held'));
skill.disabled=true;skill.emit('pointerdown');assert.equal(uses,1);skill.disabled=false;
stick.emit('pointerdown',{clientX:0});fire.emit('pointerdown',{pointerId:2});enabled=false;assert.equal(touch.direction(),-1);assert(!touch.fire());touch.reset();enabled=true;assert.equal(touch.direction(),-1);assert(!touch.fire());assert.equal(stick.captured.size,0);assert.equal(fire.captured.size,0);
stick.emit('pointerdown',{button:2,clientX:0});assert.equal(touch.direction(),-1);
console.log('Tank touch: cardinal movement/dead zone, clamping, multitouch move+fire+skill, capture loss, cancellation, pause reset and disabled skill passed.');
