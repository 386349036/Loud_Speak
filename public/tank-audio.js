(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TankAudio=api;})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
// Original, locally synthesized arrangements: no downloads or third-party music.
const tracks={
 title:{name:'街机序曲',bpm:94,root:60,type:'triangle',notes:[0,4,7,12,7,4,2,7],chords:[0,5,7,0]},
 desert:{name:'沙海行军',bpm:112,root:57,type:'square',notes:[0,1,4,7,8,7,4,1],chords:[0,5,7,0]},
 snow:{name:'雪线微光',bpm:86,root:65,type:'sine',notes:[0,7,12,9,4,7,2,9],chords:[0,5,2,7]},
 city:{name:'都市脉冲',bpm:126,root:55,type:'sawtooth',notes:[0,3,7,10,7,3,5,2],chords:[0,3,5,7]},
 farm:{name:'田野巡游',bpm:104,root:60,type:'triangle',notes:[0,4,7,9,12,9,7,4],chords:[0,5,7,0]},
 red:{name:'赤土前线',bpm:118,root:50,type:'square',notes:[0,3,5,7,10,7,5,3],chords:[0,5,3,7]}
};
class Player{
 constructor({Context,storage,timer=setInterval,clear=clearInterval}={}){this.Context=Context;this.storage=storage;this.timer=(...args)=>timer(...args);this.clear=(...args)=>clear(...args);this.enabled=true;this.volume=.35;this.ctx=null;this.voices=new Set();this.scene='title';this.playing=false;this.handle=null;this.step=0;this.seen=new Set();this.shots=new Set();this.lastFx=-1;try{const saved=JSON.parse(storage?.getItem('loud.tank.audio')||'null');if(saved){this.enabled=saved.enabled!==false;if(Number.isFinite(saved.volume))this.volume=Math.max(0,Math.min(1,saved.volume));}}catch{}}
 save(){try{this.storage?.setItem('loud.tank.audio',JSON.stringify({enabled:this.enabled,volume:this.volume}));}catch{}}
 unlock(){if(!this.Context)return false;try{if(!this.ctx){this.ctx=new this.Context();this.master=this.ctx.createGain();this.master.gain.value=this.volume*.28;this.master.connect(this.ctx.destination);}if(this.ctx.state==='suspended')this.ctx.resume()?.then(()=>this.run()).catch(()=>{});this.run();return true;}catch{return false;}}
 setEnabled(value){this.enabled=!!value;this.save();if(this.enabled)this.unlock();else this.stop();}
 setVolume(value){if(!Number.isFinite(value))return;this.volume=Math.max(0,Math.min(1,value));if(this.master)this.master.gain.setTargetAtTime(this.volume*.28,this.ctx.currentTime,.03);this.save();}
 tone(note,time,duration=.12,level=.15,type='triangle',slide=0){if(!this.ctx||!this.enabled||!this.volume||this.voices.size>=80)return;const oscillator=this.ctx.createOscillator(),gain=this.ctx.createGain();oscillator.type=type;const frequency=440*Math.pow(2,(note-69)/12);oscillator.frequency.setValueAtTime(frequency,time);if(slide)oscillator.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*slide),time+duration);gain.gain.setValueAtTime(.0001,time);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),time+.008);gain.gain.exponentialRampToValueAtTime(.0001,time+duration);oscillator.connect(gain);gain.connect(this.master);this.voices.add(oscillator);oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(time);oscillator.stop(time+duration+.02);}
 tick(){if(!this.ctx||!this.enabled||!this.playing)return;const track=tracks[this.scene]||tracks.title,dt=60/track.bpm/2;if(this.next<this.ctx.currentTime-.25)this.next=this.ctx.currentTime+.02;while(this.next<this.ctx.currentTime+.16){const step=this.step++%32,chord=track.chords[Math.floor(step/8)],note=track.notes[step%8];this.tone(track.root+note+(step>=16?12:0),this.next,dt*.75,.12,track.type);if(step%2===0)this.tone(track.root-24+chord,this.next,dt*1.6,.2,'triangle');if(step%8===0){for(const offset of [0,4,7])this.tone(track.root-12+chord+offset,this.next,dt*6,.025,'sine');}if(step%4===0)this.tone(34,this.next,.1,.3,'sine',.3);if(step%2)this.tone(94,this.next,.025,.018,'triangle',.4);this.next+=dt;}}
 run(){if(!this.ctx||!this.enabled||!this.playing||this.ctx.state==='suspended'||this.handle!==null)return;this.next=this.ctx.currentTime+.03;this.tick();this.handle=this.timer(()=>this.tick(),75);}
 stop(){if(this.handle!==null)this.clear(this.handle);this.handle=null;for(const voice of this.voices){try{voice.stop();}catch{}}this.voices.clear();}
 sync(game){const scene=game.state==='ready'?'title':game.world.theme.id,playing=game.state==='playing'||game.state==='ready';if(scene!==this.scene||playing!==this.playing){this.stop();if(scene!==this.scene)this.step=0;this.scene=scene;this.playing=playing;this.run();}const effects=new Set(game.effects),shots=new Set(game.bullets.filter(b=>!b.enemy).map(b=>b.id));if(playing&&this.ctx&&game.time-this.lastFx>.06){const fresh=game.effects.find(e=>!this.seen.has(e));if(fresh){const blast=fresh.kind==='blast';this.tone(blast?43:fresh.kind==='clash'?86:65,this.ctx.currentTime+.005,blast?.25:.07,blast?.35:.12,blast?'sawtooth':'triangle',.25);this.lastFx=game.time;}else if([...shots].some(id=>!this.shots.has(id))){this.tone(72,this.ctx.currentTime+.005,.055,.1,'square',.35);this.lastFx=game.time;}}if(game.time<this.lastFx)this.lastFx=-1;this.seen=effects;this.shots=shots;}
 dispose(){this.stop();this.ctx?.close()?.catch(()=>{});}
}
return {Player,tracks};
});
