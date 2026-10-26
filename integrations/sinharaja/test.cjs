const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),esbuild=require('esbuild'),React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const app=fs.readFileSync(path.join(__dirname,'src/App.js'),'utf8');
function load(code){const module={exports:{}};new Function('require','module','exports',esbuild.transformSync(code,{loader:'jsx',format:'cjs',target:'es2020'}).code)(require,module,module.exports);return module.exports}
// The upstream pause menu referenced a missing Compass component. Check every literal icon usage.
const icons=load("import React from 'react';\n"+app.slice(app.indexOf('export const Icons ='),app.indexOf('// ── Master Achievements'))).Icons;
const used=new Set([...app.matchAll(/<Icons\.(\w+)/g)].map(m=>m[1]));
for(const name of used){assert.equal(typeof icons[name],'function',`Missing icon: ${name}`);assert.match(renderToStaticMarkup(React.createElement(icons[name])),/<svg/)}
console.log(`PASS: ${used.size} UI icons render, including the pause menu`);
const {Sinharaja3DEngine}=load(fs.readFileSync(path.join(__dirname,'src/Sinharaja3DEngine.js'),'utf8'));
const engine=Object.create(Sinharaja3DEngine.prototype);engine.setAnalogMove(2,-2,true);assert.deepEqual(engine.analogMove,{x:1,y:-1,active:true});engine.setAnalogMove(NaN,Infinity,false);assert.deepEqual(engine.analogMove,{x:0,y:0,active:false});
const handlers=new Map(),oldWindow=global.window,oldDocument=global.document;global.window={addEventListener(){}};global.document={addEventListener(){}};
try{engine.canvas={style:{},setPointerCapture(){},addEventListener:(n,f)=>handlers.set(n,f)};engine.player={targetYaw:0,targetPitch:0};engine.paused=false;engine.setupInputs();handlers.get('pointerdown')({pointerType:'touch',pointerId:1,clientX:20,clientY:20});handlers.get('pointermove')({pointerId:1,clientX:120,clientY:30});assert.ok(engine.player.targetYaw<0);assert.ok(engine.player.targetPitch<0);const yaw=engine.player.targetYaw;engine.paused=true;handlers.get('pointermove')({pointerId:1,clientX:220,clientY:30});assert.equal(engine.player.targetYaw,yaw);handlers.get('pointercancel')({pointerId:1});assert.equal(engine.touchLook,null)}finally{global.window=oldWindow;global.document=oldDocument}
console.log('PASS: analog movement, touch camera, cancel and pause input guards');
// Exercise the production movement block against the camera's actual world axes.
const movementSource=fs.readFileSync(path.join(__dirname,'src/Sinharaja3DEngine.js'),'utf8');
const movement=new Function('dt',movementSource.slice(movementSource.indexOf('    // Movement Vector Calculation'),movementSource.indexOf('      // Proposed horizontal positions'))+'return {x:worldDx,z:worldDz};} return {x:0,z:0};');
const THREE=require('three');
for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2,.73]){
 const camera=new THREE.PerspectiveCamera();camera.rotation.y=yaw;
 const forward=camera.getWorldDirection(new THREE.Vector3()),right=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);
 for(const [key,axis,sign]of [['w',forward,1],['s',forward,-1],['a',right,-1],['d',right,1],['arrowup',forward,1],['arrowdown',forward,-1],['arrowleft',right,-1],['arrowright',right,1]]){
  const fixture={keys:{[key]:true},player:{yaw,speed:4,stamina:100},analogMove:{active:false}};
  const delta=movement.call(fixture,.25);
  assert.ok(Math.abs(delta.x-axis.x*sign)<1e-9&&Math.abs(delta.z-axis.z*sign)<1e-9,`${key} follows camera at yaw ${yaw}`);
 }
 for(const [x,y,axis,sign]of [[0,-1,forward,1],[0,1,forward,-1],[-1,0,right,-1],[1,0,right,1]]){
  const delta=movement.call({keys:{},player:{yaw,speed:4,stamina:100},analogMove:{x,y,active:true}},.25);
  assert.ok(Math.abs(delta.x-axis.x*sign)<1e-9&&Math.abs(delta.z-axis.z*sign)<1e-9,'joystick follows camera');
 }
 const diagonal=movement.call({keys:{w:true,d:true},player:{yaw,speed:4,stamina:100}},.25);
 assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-1)<1e-9,'diagonal movement preserves speed');
}
console.log('PASS: WASD, arrow keys and joystick follow camera axes at five headings; diagonal speed unchanged');
const actions=[];engine.cb={onToggleMap:()=>actions.push('map'),onToggleInventory:()=>actions.push('bag'),onToggleEvidence:()=>actions.push('evidence')};engine.keys={};engine.ambientStarted=true;engine.player={isCrouching:false};
const key=(value,extra={})=>engine._onKeyDown({key:value,target:{tagName:'CANVAS'},preventDefault(){},...extra});
engine.paused=true;key('m');key('i');key('5');key('i',{repeat:true});key('m',{target:{tagName:'INPUT'}});key('i',{target:{tagName:'DIV',isContentEditable:true}});assert.deepEqual(actions,['map','bag','evidence']);
for(const [method,label]of [['takePhoto','photo'],['drinkGingerTea','tea'],['brewHerbalTea','brew'],['cycleTorchIntensity','beam'],['toggleViewMode','view']])engine[method]=()=>actions.push(label);
key('p');assert.equal(actions.length,3);engine.paused=false;for(const value of ['p','j','l','t','v'])key(value);key('p',{repeat:true});assert.deepEqual(actions.slice(3),['photo','tea','brew','beam','view']);key('c');assert.equal(engine.player.isCrouching,true);
console.log('PASS: map/backpack/evidence keys close paused panels, native photo/crouch keys, tea/view bindings, repeat and editable-field guards');
const output=path.resolve(__dirname,'../../public/games/sinharaja'),html=fs.readFileSync(path.join(output,'index.html'),'utf8'),css=fs.readFileSync(path.join(output,'game.css'),'utf8');
assert.ok(fs.statSync(path.join(output,'game.js')).size>100000);assert.match(html,/Content-Security-Policy/);assert.doesNotMatch(app,/https?:\/\//);assert.doesNotMatch(css,/@import|https?:\/\//);
for(const name of ['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','paper']){const image=fs.readFileSync(path.join(output,'images',name+'.jpg'));assert.equal(image[0],255);assert.equal(image[1],216);assert.ok(image.length>1000)}
for(const match of css.matchAll(/url\(["']?(\/games\/sinharaja\/[^)"']+)/g))assert.ok(fs.existsSync(path.resolve(output,'..','..',match[1].slice(1))));
assert.ok(fs.existsSync(path.join(output,'DEPENDENCY_LICENSES.txt')));console.log('PASS: offline bundle, six local images, stylesheet URLs and dependency notices');
(async()=>{const base=process.env.SINHARAJA_TEST_URL||'http://127.0.0.1:3108';for(const item of ['/','/sinharaja-launcher.js','/assets/sinharaja-icon.svg','/games/sinharaja/','/games/sinharaja/game.js','/games/sinharaja/game.css',...['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','paper'].map(n=>'/games/sinharaja/images/'+n+'.jpg')]){const response=await fetch(base+item);assert.equal(response.status,200,item);assert.ok((await response.arrayBuffer()).byteLength>0)}console.log('PASS: live Loud homepage, launcher, game and all six images return HTTP 200')})().catch(e=>{console.error(e);process.exitCode=1});
