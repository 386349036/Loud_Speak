'use strict';
const assert=require('node:assert/strict');
const {Player,tracks}=require('./public/tank-audio.js');
class Context{
 constructor(){this.currentTime=0;this.state='running';this.destination={};this.notes=[];}
 param(){return {value:0,setValueAtTime(v,t){assert(Number.isFinite(v+t));},exponentialRampToValueAtTime(v,t){assert(v>0&&Number.isFinite(v+t));},setTargetAtTime(v){assert(v>=0&&v<=1);}};}
 createGain(){return {gain:this.param(),connect(){},disconnect(){}};}
 createOscillator(){const note={frequency:this.param(),connect(){},disconnect(){},start:t=>{assert(t>=0);this.notes.push(note);},stop:()=>{note.stopped=true;}};return note;}
 resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
}
let timers=new Set(),storage={getItem(){return '{broken';},setItem(){throw Error('denied');}};
const p=new Player({Context,storage,timer:function(fn){assert.equal(this,undefined);timers.add(fn);return fn;},clear:function(fn){assert.equal(this,undefined);timers.delete(fn);}});
const g={state:'ready',world:{theme:{id:'desert'}},time:0,effects:[],bullets:[]};
p.sync(g);assert.equal(p.ctx,null);assert.equal(timers.size,0);assert(p.unlock());assert.equal(timers.size,1);
assert.equal(Object.keys(tracks).length,6);
for(const id of Object.keys(tracks)){g.state=id==='title'?'ready':'playing';g.world.theme.id=id;const n=p.ctx.notes.length;p.sync(g);p.ctx.currentTime+=1;p.tick();assert(p.ctx.notes.length>n,id);assert.equal(p.scene,id);assert.equal(timers.size,1);}
g.state='paused';p.sync(g);assert.equal(timers.size,0);assert.equal(p.voices.size,0);assert(p.ctx.notes.every(n=>n.stopped));
g.state='playing';p.sync(g);assert.equal(timers.size,1);p.sync(g);assert.equal(timers.size,1);
p.setEnabled(false);assert.equal(timers.size,0);assert.equal(p.voices.size,0);p.setEnabled(true);assert.equal(timers.size,1);
p.setVolume(9);assert.equal(p.volume,1);p.setVolume(-1);assert.equal(p.volume,0);p.setVolume(NaN);assert.equal(p.volume,0);
p.setVolume(.5);g.time=1;g.effects=[{kind:'clash'}];const before=p.ctx.notes.length;p.sync(g);assert(p.ctx.notes.length>before);const once=p.ctx.notes.length;p.sync(g);assert.equal(p.ctx.notes.length,once);
p.dispose();assert.equal(timers.size,0);assert.equal(p.ctx.state,'closed');
const unsupported=new Player({});assert.equal(unsupported.unlock(),false);unsupported.sync(g);unsupported.dispose();
console.log('Tank audio: six arrangements, gesture unlock, finite envelopes, scene switching, pause/mute/resume, volume persistence failures, effect deduplication and cleanup passed.');
