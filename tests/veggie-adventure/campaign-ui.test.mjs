import {createAssetLoader} from '../../public/games/veggie-adventure/js/asset-loader.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {Game,STEP} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {Campaign} from '../../public/games/veggie-adventure/js/core/campaign.mjs';
import {LEVELS,levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';
import {SAVE_KEY,DEBUG_SAVE_KEY,LEGACY_SAVE_KEY,encodeSave,decodeSave} from '../../public/games/veggie-adventure/js/core/save.mjs';
import {createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
import {AnimationPlayer} from '../../public/games/veggie-adventure/js/core/animation.mjs';
import {bindTouchControls} from '../../public/games/veggie-adventure/js/touch-controls.mjs';
import {MusicDirector} from '../../public/games/veggie-adventure/js/audio.mjs';
import {bindViewport} from '../../public/games/veggie-adventure/js/viewport.mjs';
import {playerAttack} from '../../public/games/veggie-adventure/js/core/player-attacks.mjs';
import {SoundDirector} from '../../public/games/veggie-adventure/js/sound-effects.mjs';

const html=fs.readFileSync('public/games/veggie-adventure/index.html','utf8');
const source=fs.readFileSync('public/games/veggie-adventure/js/main.mjs','utf8').replace(/^import[^\n]*\r?\n/gm,'');
const manifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/manifest.json'));
const musicManifest=JSON.parse(fs.readFileSync('public/games/veggie-adventure/assets/audio/manifest.json'));
class Element{
 constructor(){this.style={};this.dataset={};this.children=[];this.handlers={};this.value='';this.hidden=false;this.disabled=false;this.textContent='';this.classList={add(){},remove(){},toggle(){}};}
 append(child){this.children.push(child);}
 setAttribute(name,value){this[name]=value;}
 addEventListener(name,callback){this.handlers[name]=callback;}
 querySelector(){return this;}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
 setPointerCapture(){}
 blur(){}
 getContext(){return new Proxy({},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});}
}
class Select extends Element{}
class Button extends Element{}
async function boot(search='',initial={}){
 const elements=new Map(),frames=[],events={},documentEvents={},store=new Map(Object.entries(initial)),writes=[];let campaign,time=0;
 for(const match of html.matchAll(/<([a-z][\w-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
  const element=new (match[1]==='select'?Select:match[1]==='button'?Button:Element)();
  element.hidden=/\bhidden(?:\s|=|$)/.test(match[2]);element.disabled=/\bdisabled(?:\s|=|$)/.test(match[2]);elements.set(match[3],element);
 }
 const actions=['fire','jump'].map(key=>{const e=new Button();e.dataset.key=key;return e;}),buttons=[...elements.values()].filter(e=>e instanceof Button).concat(actions);
 const document={body:new Element(),hidden:false,getElementById:id=>elements.get(id),createElement:()=>new Element(),addEventListener:(type,fn)=>documentEvents[type]=fn,querySelectorAll:selector=>selector==='button'?buttons:selector==='[data-key]'?actions:[]};
 const context={console,URLSearchParams,Game,STEP,LEVELS,SAVE_KEY,DEBUG_SAVE_KEY,LEGACY_SAVE_KEY,encodeSave,decodeSave,createRenderer,AnimationPlayer,bindTouchControls,MusicDirector,bindViewport,SoundDirector,playerAttack,createAssetLoader,
  Campaign:class extends Campaign{constructor(){super();campaign=this;}},document,location:{search},HTMLSelectElement:Select,HTMLButtonElement:Button,
  window:{addEventListener:(type,fn)=>events[type]=fn},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>{store.set(key,value);writes.push(key);}},
  Image:class{set src(value){queueMicrotask(()=>this.onload());}},fetch:async url=>({ok:true,json:async()=>url.includes('audio/')?musicManifest:manifest}),requestAnimationFrame:callback=>frames.push(callback)};
 await vm.runInNewContext(source,context,{filename:'veggie-main-ui-fixture.js'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(elements.get('start').disabled,false);
 return {campaign,elements,events,document,documentEvents,store,writes,frames(count){for(let n=0;n<count;n++){const callback=frames.shift();assert.ok(callback);callback(time+=50);}}};
}
function wonSave(id,form=1,score=9300){const g=new Game(levelById(id),{form});g.mode='won';g.score=score;return encodeSave(g,[id]);}

test('normal mode has no selectable levels and rejects even a direct selection-handler call',async()=>{
 for(const query of ['','?qa=0','?qa=false','?review=1']){
  const ui=await boot(query);assert.equal(ui.elements.get('level-picker').hidden,true);assert.equal(ui.elements.get('level').disabled,true);assert.equal(ui.elements.get('level').children.length,0);assert.equal(ui.elements.get('load-level').disabled,true);
  ui.elements.get('level').value='8-4';ui.elements.get('load-level').onclick();assert.equal(ui.campaign.game.level.id,'1-1');
 }
});

test('actual page loop automatically starts every next level, carries results and stops at the final ending',async()=>{
 const ui=await boot();ui.campaign.game.rebirths=1;ui.elements.get('start').onclick();
 for(let index=0;index<32;index++){
  const g=ui.campaign.game;assert.equal(g.level.id,LEVELS[index].id);g.p.form=index%3;g.resizePlayer();g.p.hurt=2;g.score=1000+index;g.p.x=g.level.exit;if(g.boss)g.boss.dead=true;
  ui.frames(2);assert.equal(g.mode,'won');const score=g.score,form=g.p.form;
  ui.frames(24);await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.campaign.completed.size,index+1);
  if(index<31){assert.equal(ui.campaign.game.level.id,LEVELS[index+1].id);assert.equal(ui.campaign.game.mode,'playing');assert.equal(ui.campaign.game.score,score);assert.equal(ui.campaign.game.p.form,form);assert.equal(ui.campaign.game.rebirths,1);assert.equal(ui.elements.get('overlay').hidden,true);assert.equal(decodeSave(ui.store.get(SAVE_KEY)).level,LEVELS[index+1].id);assert.equal(decodeSave(ui.store.get(SAVE_KEY)).run.rebirths,1);}
  else {assert.equal(ui.campaign.game,g);assert.equal(ui.elements.get('message').textContent,'蔬果王庭获救！');assert.equal(ui.elements.get('overlay').hidden,false);ui.frames(40);assert.equal(ui.campaign.game,g);assert.equal(g.score,score);assert.equal(ui.campaign.completed.size,32);}
 }
});

test('loading an older completed-stage save proceeds immediately, while final saves retain the ending',async()=>{
 const ui=await boot('',{[SAVE_KEY]:wonSave('1-2',2,9200)});assert.equal(ui.campaign.game.level.id,'1-3');assert.equal(ui.campaign.game.score,9200);assert.equal(ui.campaign.game.p.form,2);assert.equal(ui.elements.get('overlay').hidden,true);
 const final=await boot('',{[SAVE_KEY]:wonSave('8-4')});assert.equal(final.campaign.game.level.id,'8-4');assert.equal(final.elements.get('start').textContent,'再玩一局');final.events.blur();assert.equal(final.elements.get('message').textContent,'蔬果王庭获救！');
});

test('debug selection works only with qa=1 and cannot overwrite or be loaded as normal progress',async()=>{
 const normal=encodeSave(new Game(levelById('1-2')),['1-1']),ui=await boot('?qa=1',{[SAVE_KEY]:normal});
 assert.equal(ui.elements.get('level-picker').hidden,false);assert.equal(ui.elements.get('level').disabled,false);assert.equal(ui.elements.get('level').children.length,32);
 ui.elements.get('level').value='6-4';ui.elements.get('load-level').onclick();assert.equal(ui.campaign.game.level.id,'6-4');assert.equal(ui.store.get(SAVE_KEY),normal);assert.equal(decodeSave(ui.store.get(DEBUG_SAVE_KEY)).level,'6-4');assert.ok(ui.writes.every(key=>key===DEBUG_SAVE_KEY));
 const fresh=await boot('',{[DEBUG_SAVE_KEY]:ui.store.get(DEBUG_SAVE_KEY)});assert.equal(fresh.campaign.game.level.id,'1-1');
});

test('review mode can inspect automatic advancement and debug selection without writing either save',async()=>{
 const saved=wonSave('1-4'),ui=await boot('?qa=1&review=1',{[SAVE_KEY]:saved});assert.equal(ui.campaign.game.level.id,'2-1');
 ui.elements.get('level').value='8-4';ui.elements.get('load-level').onclick();assert.equal(ui.campaign.game.level.id,'8-4');assert.equal(ui.store.get(SAVE_KEY),saved);assert.equal(ui.writes.length,0);
});

test('losing focus during the victory delay pauses transition and resume continues automatically',async()=>{
 const ui=await boot();ui.elements.get('start').onclick();ui.campaign.game.p.x=ui.campaign.game.level.exit;ui.frames(2);assert.equal(ui.campaign.game.mode,'won');
 ui.events.blur();ui.frames(40);assert.equal(ui.campaign.game.level.id,'1-1');assert.equal(ui.elements.get('overlay').hidden,false);
 ui.elements.get('start').onclick();ui.frames(24);assert.equal(ui.campaign.game.level.id,'1-2');assert.equal(ui.elements.get('overlay').hidden,true);
});

test('actual page shows the game-over dialog after three rebirths and cannot resume it with pause or focus changes',async()=>{
 const ui=await boot();ui.elements.get('start').onclick();const g=ui.campaign.game;
 assert.equal(ui.elements.get('retry').hidden,true);assert.equal(ui.elements.get('retry').disabled,true);
 g.p.x=120;ui.elements.get('retry').onclick();assert.equal(g.p.x,120,'normal mode cannot call the debug restore handler');
 for(const remaining of [2,1,0]){
  g.p.form=2;g.resizePlayer();g.p.x=g.level.checkpoint+20;g.kill();ui.frames(3);
  const saved=decodeSave(ui.store.get(SAVE_KEY));assert.equal(saved.run.rebirths,remaining);assert.equal(saved.run.status,'dead');
  ui.frames(20);assert.equal(g.mode,'playing');assert.equal(g.p.form,0);assert.equal(g.p.x,g.level.spawn.x);assert.equal(g.rebirths,remaining);assert.match(ui.elements.get('hud').textContent,new RegExp('剩余重生 '+remaining+'次'));
 }
 g.kill();ui.frames(20);assert.equal(g.mode,'gameover');assert.equal(ui.elements.get('overlay').hidden,false);assert.equal(ui.elements.get('message').textContent,'游戏结束');assert.equal(ui.elements.get('start').textContent,'重新开始');assert.equal(ui.elements.get('pause').disabled,true);
 const frozen=g.snapshot();ui.events.blur();ui.events.keydown({target:null,code:'KeyP',repeat:false});ui.elements.get('pause').onclick();ui.frames(50);assert.deepEqual(g.snapshot(),frozen);assert.equal(ui.elements.get('overlay').hidden,false);assert.equal(ui.elements.get('message').textContent,'游戏结束');
 ui.elements.get('start').onclick();assert.equal(ui.campaign.game.level.id,'1-1');assert.equal(ui.campaign.game.rebirths,3);assert.equal(ui.campaign.game.p.form,0);assert.equal(ui.campaign.game.score,0);assert.equal(ui.elements.get('overlay').hidden,true);assert.equal(ui.elements.get('pause').disabled,false);
});

test('refreshing during the last rebirth or final death preserves exhaustion and the game-over screen',async()=>{
 const g=new Game(levelById('1-3'),{form:2,score:1000,rebirths:1});g.kill();
 const pending=await boot('',{[SAVE_KEY]:encodeSave(g)});assert.equal(pending.campaign.game.rebirths,0);assert.equal(pending.campaign.game.p.form,0);assert.equal(pending.campaign.game.p.x,g.level.spawn.x);assert.equal(pending.campaign.game.mode,'playing');
 pending.elements.get('start').onclick();pending.campaign.game.kill();pending.frames(3);const dying=decodeSave(pending.store.get(SAVE_KEY));assert.equal(dying.run.pendingRebirth,false);
 const ended=await boot('',{[SAVE_KEY]:pending.store.get(SAVE_KEY)});assert.equal(ended.campaign.game.mode,'gameover');assert.equal(ended.elements.get('message').textContent,'游戏结束');assert.equal(ended.elements.get('overlay').hidden,false);assert.equal(ended.campaign.game.rebirths,0);
 const repeat=await boot('',{[SAVE_KEY]:ended.store.get(SAVE_KEY)});assert.equal(repeat.campaign.game.mode,'gameover');assert.equal(repeat.campaign.game.rebirths,0);
});

test('normal restart starts a new run at 1-1 and cannot replenish attempts while keeping a later stage',async()=>{
 const g=new Game(levelById('3-4'),{score:9800,form:2,rebirths:0}),ui=await boot('',{[SAVE_KEY]:encodeSave(g,['1-1','1-2'])});
 assert.equal(ui.campaign.game.level.id,'3-4');ui.elements.get('fresh').onclick();await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.campaign.game.level.id,'1-1');assert.equal(ui.campaign.game.rebirths,3);assert.equal(ui.campaign.game.score,0);assert.equal(ui.campaign.completed.size,0);assert.equal(ui.elements.get('overlay').hidden,true);const saved=decodeSave(ui.store.get(SAVE_KEY));assert.equal(saved.level,'1-1');assert.equal(saved.run.rebirths,3);
});

test('overlay settings pause gameplay, preserve the run and close when resuming',async()=>{
 const ui=await boot();ui.elements.get('start').onclick();ui.frames(4);const g=ui.campaign.game;
 ui.elements.get('settings-toggle').onclick();assert.equal(ui.elements.get('settings').hidden,false);assert.equal(ui.elements.get('settings-toggle')['aria-expanded'],'true');
 const time=g.time;ui.frames(20);assert.equal(g.time,time);assert.equal(g.rebirths,3);
 ui.elements.get('settings-toggle').onclick();assert.equal(ui.elements.get('settings').hidden,true);
 ui.elements.get('start').onclick();ui.frames(4);assert.ok(g.time>time);assert.equal(ui.elements.get('settings-toggle')['aria-expanded'],'false');
});

test('normal play can discover the hidden warp room by keyboard, then hit a stage block and immediately play it',async()=>{
 const ui=await boot();ui.elements.get('start').onclick();ui.frames(4);
 const key=code=>ui.events.keydown({target:null,code,repeat:false,preventDefault(){}});
 key('KeyA');key('Space');ui.frames(18);await new Promise(resolve=>setImmediate(resolve));assert.equal(ui.campaign.game.level.warpRoom,true);assert.equal(ui.elements.get('level-picker').hidden,true);assert.equal(decodeSave(ui.store.get(SAVE_KEY)).level,'1-1');
 const room=ui.campaign.game,block=room.blocks.find(b=>b.warpTo==='8-4');room.p.x=block.x+8;room.p.y=194;room.p.vx=0;room.p.vy=0;room.p.grounded=true;key('Space');ui.frames(9);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(ui.campaign.game.level.id,'8-4');assert.equal(ui.campaign.game.mode,'playing');assert.equal(ui.campaign.game.p.form,0);assert.equal(ui.elements.get('overlay').hidden,true);assert.equal(ui.campaign.completed.size,0);assert.equal(decodeSave(ui.store.get(SAVE_KEY)).level,'8-4');
});

test('SFX settings are independent from music, and review mode writes no preferences',async()=>{
 const ui=await boot();ui.elements.get('sfx-volume').value='20';ui.elements.get('sfx-volume').oninput();ui.elements.get('sfx-toggle').onclick();
 const sfx=JSON.parse(ui.store.get('veggie-adventure-sfx-v1'));assert.equal(sfx.volume,.2);assert.equal(sfx.muted,true);assert.equal(ui.store.has('veggie-adventure-audio-v1'),false);assert.equal(ui.elements.get('sfx-toggle').textContent,'音效：关');
 const review=await boot('?qa=1&review=sfx');review.elements.get('sfx-volume').value='15';review.elements.get('sfx-volume').oninput();review.elements.get('sfx-toggle').onclick();assert.equal(review.writes.length,0);
});
