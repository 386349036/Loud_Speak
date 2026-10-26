export function musicFor(game,{title=false,ending=false}={}){
 if(ending)return 'M03';
 if(title)return 'M01';
 if(game.level.warpRoom)return 'M01';
 if(['dead','gameover'].includes(game.mode))return null;
 if(game.mode==='won'&&game.level.id==='8-4')return 'M03';
 if(game.p.star>0&&game.mode==='playing')return 'M02';
 if(game.boss?.active&&!game.boss.dead)return 'B'+String(game.boss.kind).padStart(2,'0');
 return 'W'+String(game.level.world||1).padStart(2,'0');
}
const clamp=x=>Math.max(0,Math.min(1,x));
export class MusicDirector{
 constructor({contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)(),fetcher=(...a)=>fetch(...a),storage=null,persistPreferences=true,base='assets/audio/'}={}){
  Object.assign(this,{contextFactory,fetcher,storage,persistPreferences,base});this.tracks={};this.cache=new Map();this.loading=new Map();this.failed=new Set();this.positions=new Map();this.finished=new Set();this.volume=.55;this.muted=false;this.unlocked=false;this.hidden=false;this.paused=false;this.desired=null;this.sequence=0;this.cueSequence=0;this.message='点击开始后播放配乐';
  try{const p=JSON.parse(storage?.getItem('veggie-adventure-audio-v1'));if(Number.isFinite(p?.volume))this.volume=clamp(p.volume);if(typeof p?.muted==='boolean')this.muted=p.muted;}catch{}
 }
 async loadManifest(){try{const r=await this.fetcher(this.base+'manifest.json');if(!r.ok)throw Error();this.configure(await r.json());return true;}catch{this.message='配乐暂不可用，游戏可继续';return false;}}
 configure(manifest){this.tracks=manifest.tracks||{};this._apply();}
 async unlock(){
  try{if(!this.context){this.context=this.contextFactory();this.master=this.context.createGain();this.master.connect(this.context.destination);this._volume();}this.unlocked=true;await this.context.resume();if(this.hidden||this.paused)await this.context.suspend();this._apply();this.message='配乐已开启';return true;}catch{this.unlocked=false;this.message='此浏览器暂无法播放配乐';return false;}
 }
 _volume(){if(this.master)this.master.gain.setValueAtTime(this.muted?0:this.volume,this.context.currentTime);}
 _save(){if(this.persistPreferences)try{this.storage?.setItem('veggie-adventure-audio-v1',JSON.stringify({volume:this.volume,muted:this.muted}));}catch{}}
 setVolume(value){this.volume=clamp(Number(value)||0);this._volume();this._save();}
 toggleMute(){this.muted=!this.muted;this._volume();this._save();}
 setHidden(value){this.hidden=!!value;this._suspend();}
 _suspend(){if(!this.context||!this.unlocked)return;const p=this.hidden||this.paused?this.context.suspend():this.context.resume();p?.catch?.(()=>{});if(!this.hidden&&!this.paused)this._apply();}
 update(game,{paused=false,title=false,ending=false}={}){
  const old=this.observed;
  if(!old&&game.mode==='gameover')this.playCue('J06');
  if(old){
   if(game.mode==='gameover'&&old.mode!=='gameover')this.playCue('J06');
   else if(game.mode==='dead'&&old.mode!=='dead')this.playCue('J02');
   else if(game.mode==='playing'&&old.mode==='dead'&&old.game===game)this.playCue('J07');
   else if(game.boss?.dead&&!old.bossDead&&old.game===game)this.playCue(game.boss.kind===8?'J05':'J04');
   else if(game.mode==='won'&&old.mode!=='won'&&!game.boss)this.playCue('J03');
  }
  this.observed={game,mode:game.mode,bossDead:!!game.boss?.dead};
  const key=musicFor(game,{title,ending}),stateChanged=this.paused!==paused;
  this.paused=paused;
  if(key!==this.desired){this.desired=key;this.sequence++;this._stopBackground();this._apply();}
  if(stateChanged)this._suspend();
 }
 resetRun(){this.sequence++;this.cueSequence++;this.desired=null;this.cue=null;this.observed=null;this._stopBackground();this._stopCue();this.positions.clear();this.finished.clear();}
 async _load(key){
  if(this.cache.has(key))return this.cache.get(key);
  if(this.loading.has(key))return this.loading.get(key);
  const track=this.tracks[key];if(!track||track.enabled===false||this.failed.has(key)||!this.context)return null;
  const job=(async()=>{try{
   const r=await this.fetcher(this.base+track.path);if(!r.ok)throw Error('Missing audio');const buffer=await this.context.decodeAudioData(await r.arrayBuffer());
   this.cache.set(key,buffer);
   for(const k of this.cache.keys()){if(this.cache.size<=2)break;if(k!==key&&k!==this.background?.key&&k!==this.cueNode?.key)this.cache.delete(k);}
   return buffer;
  }catch{this.failed.add(key);this.message='个别配乐未能加载，游戏可继续';return null;}finally{this.loading.delete(key);}})();
  this.loading.set(key,job);return job;
 }
 _stopBackground(){
  const b=this.background;if(!b)return;
  const elapsed=this.context.currentTime-b.startedAt+b.offset;
  this.positions.set(b.key,b.loop?elapsed%b.buffer.duration:Math.min(elapsed,b.buffer.duration));
  b.node.onended=()=>{b.node.disconnect();b.gain.disconnect();};try{b.gain.gain.cancelScheduledValues(this.context.currentTime);b.gain.gain.setTargetAtTime(0,this.context.currentTime,.012);b.node.stop(this.context.currentTime+.06);}catch{b.node.disconnect();b.gain.disconnect();}this.background=null;
 }
 _stopCue(){const c=this.cueNode;if(!c)return;c.node.onended=null;try{c.node.stop();}catch{}c.node.disconnect();this.cueNode=null;}
 _apply(){if(!this.unlocked||!this.context||this.hidden||this.paused)return;if(this.cue){if(!this.cueNode&&!this.cueLoading)this._startCue(this.cue,this.cueSequence);return;}if(this.desired&&!this.finished.has(this.desired)&&!this.background&&!this.backgroundLoading)this._startBackground(this.desired,this.sequence);}
 async _startBackground(key,token){
  this.backgroundLoading=true;
  const buffer=await this._load(key);this.backgroundLoading=false;
  if(!buffer||token!==this.sequence||key!==this.desired||this.cue||this.hidden||this.paused){if(token!==this.sequence)this._apply();return;}
  const track=this.tracks[key],node=this.context.createBufferSource(),gain=this.context.createGain();node.buffer=buffer;node.loop=!!track.loop;node.loopStart=track.loopStart||0;node.loopEnd=Math.min(buffer.duration,track.loopEnd||buffer.duration);
  gain.gain.setValueAtTime(0,this.context.currentTime);gain.gain.linearRampToValueAtTime(1,this.context.currentTime+.18);node.connect(gain);gain.connect(this.master);
  const saved=this.positions.get(key)||0,offset=node.loop?saved%node.loopEnd:saved>=buffer.duration?0:saved;
  this.background={key,node,gain,buffer,offset,loop:node.loop,startedAt:this.context.currentTime};
  node.onended=()=>{if(this.background?.node===node){this.positions.set(key,0);if(!node.loop)this.finished.add(key);node.disconnect();gain.disconnect();this.background=null;}};
  node.start(0,offset);
 }
 playCue(key){if(!this.tracks[key])return;this.cue=key;this.cueSequence++;this._stopCue();this._stopBackground();this._apply();}
 async _startCue(key,token){
  this.cueLoading=true;const buffer=await this._load(key);this.cueLoading=false;
  if(token!==this.cueSequence||this.hidden||this.paused){this._apply();return;}
  if(!buffer){this.cue=null;this._apply();return;}
  const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.master);this.cueNode={key,node};
  node.onended=()=>{if(this.cueNode?.node!==node)return;node.disconnect();this.cueNode=null;this.cue=null;this._apply();};node.start();
 }
 dispose(){this.resetRun();this.unlocked=false;this.context?.close()?.catch?.(()=>{});}
}
