import test from 'node:test';
import assert from 'node:assert/strict';
import {viewportSize,bindViewport} from '../../public/games/veggie-adventure/js/viewport.mjs';
import {cameraX,createRenderer} from '../../public/games/veggie-adventure/js/render.mjs';
import {Game} from '../../public/games/veggie-adventure/js/core/game.mjs';
import {levelById} from '../../public/games/veggie-adventure/levels/catalog.mjs';

test('desktop, phone portrait and ultrawide views keep equal horizontal and vertical sprite scale',()=>{
 for(const [w,h] of [[1920,1080],[2048,700],[844,390],[390,844],[360,800]]){
  const view=viewportSize(w,h);assert.ok(Math.abs(w/view.width-h/view.height)/(h/view.height)<.005);
  const level=levelById('1-4');
  for(const active of [false,true])for(let x=active?level.boss.left:0;x<=(active?level.boss.right:level.width-16);x+=8){
   const cam=cameraX(level,{x},{...level.boss,active},view.width);assert.ok(cam>=0&&cam+view.width<=level.width);
   assert.ok(x>=cam&&x+12<=cam+view.width,'hero must remain inside '+w+'x'+h);
  }
 }
});

test('viewport resize releases held input and fullscreen keeps controls inside the same host',async()=>{
 const events={},docEvents={},button={},canvas={},doc={addEventListener:(k,f)=>docEvents[k]=f};let w=844,h=390,clears=0,locks=0;
 const host={getBoundingClientRect:()=>({width:w,height:h}),async requestFullscreen(){doc.fullscreenElement=host;}};
 doc.exitFullscreen=async()=>doc.fullscreenElement=null;
 const win={addEventListener:(k,f)=>events[k]=f,screen:{orientation:{async lock(value){assert.equal(value,'landscape');locks++;}}}};
 bindViewport(canvas,host,{window:win,document:doc,button,onResize:()=>clears++});assert.equal(button.hidden,false);assert.equal(clears,1);
 await button.onclick();assert.equal(doc.fullscreenElement,host);assert.equal(button.textContent,'退出全屏');assert.equal(locks,1);
 [w,h]=[390,844];events.resize();assert.equal(canvas.height,720);assert.equal(canvas.width,viewportSize(w,h).width*3);assert.equal(clears,2);
 await button.onclick();assert.equal(doc.fullscreenElement,null);assert.equal(button.textContent,'全屏');
});

test('wide renderer draws terrain beyond the old 256px edge and scenery covers the full viewport',()=>{
 const level=structuredClone(levelById('1-1'));level.terrain='W01-kit';level.background='W01-far';level.width=1024;level.platforms=[{x:0,y:208,w:1024,h:32}];level.enemies=[];level.boss=null;
 const draws=[],stack=[];let tx=0;const ctx=new Proxy({save(){stack.push(tx);},restore(){tx=stack.pop();},translate(x){tx+=x;},setTransform(){tx=0;},drawImage(img,...v){draws.push({id:img.id,x:tx+v[0],w:v[2]});}},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 const images=new Map([level.background,level.terrain+'-0',level.terrain+'-1'].map(id=>[id,{id}]));
 createRenderer({width:650*3,getContext:()=>ctx},images,null)(new Game(level));
 assert.ok(draws.filter(d=>d.id===level.terrain+'-0').some(d=>d.x>600));
 const sky=draws.filter(d=>d.id===level.background);assert.ok(sky.some(d=>d.x<=0&&d.x+d.w>0));assert.ok(sky.some(d=>d.x<650&&d.x+d.w>=650));
});

// The fullscreen shell includes controls, but the renderer must measure only its canvas.
test('touch rails resize the camera using the central canvas and respond to pointer changes',()=>{
 const events={},mediaEvents={},classes=new Map(),canvas={getBoundingClientRect:()=>({width:580,height:390})};let coarse=true,clears=0,observed;
 const media={get matches(){return coarse;},addEventListener:(k,f)=>mediaEvents[k]=f};
 const host={classList:{toggle:(k,v)=>classes.set(k,v)},getBoundingClientRect:()=>({width:844,height:390})};
 const win={matchMedia:()=>media,addEventListener:(k,f)=>events[k]=f,ResizeObserver:class{constructor(fn){this.fn=fn;}observe(target){observed=target;}}};
 bindViewport(canvas,host,{window:win,document:{addEventListener(){}},onResize:()=>clears++});
 assert.equal(classes.get('touch-layout'),true);assert.equal(observed,canvas);assert.equal(canvas.width,viewportSize(580,390).width*3);assert.equal(clears,1);
 coarse=false;mediaEvents.change();assert.equal(classes.get('touch-layout'),false);
 bindViewport(canvas,host,{window:win,document:{addEventListener(){}},forceTouch:true});assert.equal(classes.get('touch-layout'),true);
});
