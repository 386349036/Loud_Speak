const clamp=n=>Math.max(0,Math.min(1,n));
export class SoundDirector{
 constructor({fetcher=(...args)=>fetch(...args),storage=null,persistPreferences=true,base='assets/audio/sfx/'}={}){
  Object.assign(this,{fetcher,storage,persistPreferences,base});this.sounds={};this.cache=new Map();this.loading=new Map();this.failed=new Set();this.voices=new Set();this.lastPlayed=new Map();this.volume=.65;this.muted=false;this.paused=true;this.hidden=false;this.generation=0;this.unlocked=false;
  try{const p=JSON.parse(storage?.getItem('veggie-adventure-sfx-v1'));if(Number.isFinite(p?.volume))this.volume=clamp(p.volume);if(typeof p?.muted==='boolean')this.muted=p.muted;}catch{}
 }
 async loadManifest(){try{const r=await this.fetcher(this.base+'manifest.json');if(!r.ok)return false;this.sounds=(await r.json()).sounds||{};if(this.context)await this.preload();return true;}catch{return false;}}
 async unlock(context){
  if(!context||context.state==='closed')return false;
  try{if(this.context!==context){this.stop();this.master?.disconnect();this.cache.clear();this.loading.clear();this.context=context;this.master=context.createGain();this.master.connect(context.destination);this._volume();}this.unlocked=true;await this.preload();return true;}catch{this.unlocked=false;return false;}
 }
 _volume(){this.master?.gain.setValueAtTime(this.muted?0:this.volume,this.context.currentTime);}
 _save(){if(this.persistPreferences)try{this.storage?.setItem('veggie-adventure-sfx-v1',JSON.stringify({volume:this.volume,muted:this.muted}));}catch{}}
 setVolume(value){this.volume=clamp(Number(value)||0);this._volume();this._save();}
 toggleMute(){this.muted=!this.muted;if(this.muted)this.stop();this._volume();this._save();}
 setPaused(value){if(value&&!this.paused)this.stop();this.paused=!!value;}
 setHidden(value){if(value&&!this.hidden)this.stop();this.hidden=!!value;}
 async _load(id){
  if(this.cache.has(id))return this.cache.get(id);if(this.loading.has(id))return this.loading.get(id);const sound=this.sounds[id];if(!sound||!this.context||this.failed.has(id))return null;
  const context=this.context,job=(async()=>{try{const r=await this.fetcher(this.base+sound.path);if(!r.ok)throw Error('Missing sound');const buffer=await context.decodeAudioData(await r.arrayBuffer());if(this.context===context)this.cache.set(id,buffer);return buffer;}catch{this.failed.add(id);return null;}finally{this.loading.delete(id);}})();this.loading.set(id,job);return job;
 }
 preload(){return Promise.all(Object.keys(this.sounds).map(id=>this._load(id)));}
 play(id){
  if(!this.unlocked||this.paused||this.hidden||this.muted||!this.sounds[id])return false;
  const now=this.context.currentTime,buffer=this.cache.get(id);
  if(!buffer){const token=this.generation;void this._load(id).then(value=>{if(value&&token===this.generation&&this.context.currentTime-now<=.15)this.play(id);});return false;}
  if(now-(this.lastPlayed.get(id)??-Infinity)<this.sounds[id].cooldown)return false;
  this.lastPlayed.set(id,now);if(this.voices.size>=6){const oldest=this.voices.values().next().value;try{oldest.stop();}catch{}oldest.onended?.();}
  try{const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.master);this.voices.add(node);node.onended=()=>{node.disconnect();this.voices.delete(node);};node.start();return true;}catch{return false;}
 }
 update(game){const events=game.soundEvents?.splice(0)||[];for(const e of events)if(Math.abs(e.x-game.p.x)<=384)this.play(e.id);}
 stop(){this.generation++;for(const node of this.voices){node.onended=null;try{node.stop();}catch{}node.disconnect();}this.voices.clear();this.lastPlayed.clear();}
 dispose(){this.stop();this.master?.disconnect();this.unlocked=false;this.cache.clear();}
}
