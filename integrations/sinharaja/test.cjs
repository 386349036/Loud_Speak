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
const {getNavigation,getCompassTicks}=load(fs.readFileSync(path.join(__dirname,'src/navigation.js'),'utf8'));
for(const [yaw,label]of [[0,'N'],[-Math.PI/2,'E'],[Math.PI,'S'],[Math.PI/2,'W']]){
 const camera=new THREE.PerspectiveCamera();camera.rotation.y=yaw;const forward=camera.getWorldDirection(new THREE.Vector3());
 const nav=getNavigation(yaw,520,720,520+forward.x*10,720+forward.z*10);
 assert.equal(nav.direction,label);assert.ok(Math.abs(nav.relativeBearing)<1e-9,'forward objective stays centered');assert.ok(Math.abs(nav.distance-10)<1e-9);
 assert.ok(getCompassTicks(nav.heading).some(t=>t.primary&&t.label===label&&Math.abs(t.offset)<1e-9));
}
assert.equal(getNavigation(0,0,0,10,0).relativeBearing,90);
assert.equal(getNavigation(0,0,0,-10,0).relativeBearing,-90);
assert.equal(getNavigation(0,0,0,0,10).relativeBearing,-180);
const seam=getNavigation(-359*Math.PI/180,0,0,Math.sin(Math.PI/180)*10,-Math.cos(Math.PI/180)*10);assert.ok(Math.abs(seam.relativeBearing-2)<1e-9,'north crossing takes the short rotation');
assert.equal(getNavigation(0,4,5,4,5).arrived,true);assert.equal(getNavigation(NaN,0,0,NaN,0).hasTarget,false);
console.log('PASS: compass follows camera heading, target arrow points left/right/behind, north wraps correctly and distances use world units');
const {getMapView,projectMapPoint,fitMapView}=load(fs.readFileSync(path.join(__dirname,'src/navigation.js'),'utf8'));
const view=getMapView(520,720,100,2);assert.deepEqual(projectMapPoint(520,720,view),{x:.5,y:.5});
assert.deepEqual(projectMapPoint(530,730,view),{x:.55,y:.6});
const following=getMapView(530,730,100,2);assert.deepEqual(projectMapPoint(530,730,following),{x:.5,y:.5});assert.notDeepEqual(projectMapPoint(520,720,following),{x:.5,y:.5});
assert.deepEqual(getMapView(530,730,100,2,{x:520,z:720}),view);assert.equal(getMapView(0,0,-10).height,30);assert.equal(getMapView(0,0,900).height,800);
const overview=fitMapView([{x:480,z:715},{x:545,z:855}]);assert.equal(overview.x,512.5);assert.equal(overview.z,785);assert.equal(overview.span,188);
const mapEngine=Object.create(Sinharaja3DEngine.prototype);mapEngine.scene=new THREE.Scene();
const group=new THREE.Group();group.position.set(500,0,700);mapEngine.scene.add(group);
const landmark=new THREE.Object3D();landmark.position.set(12,0,35);landmark.userData={id:'key',titleEn:'Key'};group.add(landmark);
const hidden=new THREE.Object3D();hidden.visible=false;group.add(hidden);const removed=new THREE.Object3D();mapEngine.interactableMeshes=[landmark,hidden,removed];
assert.deepEqual(mapEngine.getSceneMap().landmarks,[{id:'key',x:512,z:735,title:'Key'}]);
group.position.x=510;assert.equal(mapEngine.getSceneMap().landmarks[0].x,522);group.visible=false;assert.deepEqual(mapEngine.getSceneMap().landmarks,[]);
console.log('PASS: map follows world coordinates, panning/zoom bounds, overview fitting and actual visible scene landmarks');
const actions=[];engine.cb={onToggleMap:()=>actions.push('map'),onToggleInventory:()=>actions.push('bag'),onToggleEvidence:()=>actions.push('evidence')};engine.keys={};engine.ambientStarted=true;engine.player={isCrouching:false};
const key=(value,extra={})=>engine._onKeyDown({key:value,target:{tagName:'CANVAS'},preventDefault(){},...extra});
engine.paused=true;key('m');key('i');key('5');key('i',{repeat:true});key('m',{target:{tagName:'INPUT'}});key('i',{target:{tagName:'DIV',isContentEditable:true}});assert.deepEqual(actions,['map','bag','evidence']);
for(const [method,label]of [['takePhoto','photo'],['drinkGingerTea','tea'],['brewHerbalTea','brew'],['cycleTorchIntensity','beam'],['toggleViewMode','view']])engine[method]=()=>actions.push(label);
key('p');assert.equal(actions.length,3);engine.paused=false;for(const value of ['p','j','l','t','v'])key(value);key('p',{repeat:true});assert.deepEqual(actions.slice(3),['photo','tea','brew','beam','view']);key('c');assert.equal(engine.player.isCrouching,true);
console.log('PASS: map/backpack/evidence keys close paused panels, native photo/crouch keys, tea/view bindings, repeat and editable-field guards');
let pauseCalls=0;engine.cb.onTogglePause=()=>pauseCalls++;engine.mapOpen=true;key('Escape');assert.equal(pauseCalls,0);key('w');assert.equal(engine.keys.w,true);engine.mapOpen=false;key('Escape');assert.equal(pauseCalls,1);
console.log('PASS: live map retains movement input and Escape does not also toggle pause');
const output=path.resolve(__dirname,'../../public/games/sinharaja'),html=fs.readFileSync(path.join(output,'index.html'),'utf8'),css=fs.readFileSync(path.join(output,'game.css'),'utf8');
assert.ok(fs.statSync(path.join(output,'game.js')).size>100000);assert.match(html,/Content-Security-Policy/);assert.doesNotMatch(app,/https?:\/\//);assert.doesNotMatch(css,/@import|https?:\/\//);
for(const name of ['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','paper']){const image=fs.readFileSync(path.join(output,'images',name+'.jpg'));assert.equal(image[0],255);assert.equal(image[1],216);assert.ok(image.length>1000)}
for(const match of css.matchAll(/url\(["']?(\/games\/sinharaja\/[^)"']+)/g))assert.ok(fs.existsSync(path.resolve(output,'..','..',match[1].slice(1))));
assert.ok(fs.existsSync(path.join(output,'DEPENDENCY_LICENSES.txt')));console.log('PASS: offline bundle, six local images, stylesheet URLs and dependency notices');
(async()=>{const base=process.env.SINHARAJA_TEST_URL||'http://127.0.0.1:3108';for(const item of ['/','/sinharaja-launcher.js','/assets/sinharaja-icon.svg','/games/sinharaja/','/games/sinharaja/game.js','/games/sinharaja/game.css',...['chapter-1','chapter-2','chapter-3','chapter-4','chapter-5','paper'].map(n=>'/games/sinharaja/images/'+n+'.jpg')]){const response=await fetch(base+item);assert.equal(response.status,200,item);assert.ok((await response.arrayBuffer()).byteLength>0)}console.log('PASS: live Loud homepage, launcher, game and all six images return HTTP 200')})().catch(e=>{console.error(e);process.exitCode=1});
