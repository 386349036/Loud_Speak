const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(){
  const handlers={};
  const listeners={};
  const context=vm.createContext({console,BLOOD_LT:'#e77',window:{addEventListener:(name,fn)=>{(listeners[name] ||= []).push(fn);handlers[name]=e=>listeners[name].forEach(f=>f(e));}},document:{activeElement:null,addEventListener(){}}});
  vm.runInContext(fs.readFileSync('public/games/roguelike/js/util.js','utf8'),context);
  vm.runInContext('Sfx.init=()=>{}; Sfx.shoot=()=>{}; Sfx.laser=()=>{}; Shake.add=()=>{};',context);
  const entities=fs.readFileSync('public/games/roguelike/js/entities.js','utf8');
  vm.runInContext(entities.slice(0,entities.indexOf('/** Ring of projectiles')),context);
  const main=fs.readFileSync('public/games/roguelike/js/main.js','utf8');
  vm.runInContext(`const STATE={PLAY:'play'}; const game={state:'play',player:{x:450,y:270}};
    const cv={handlers:{},addEventListener(name,fn){this.handlers[name]=fn},setPointerCapture(){},
    getBoundingClientRect(){return {left:100,top:50,width:450,height:270}}};`,context);
  vm.runInContext(main.slice(main.indexOf('  const input ='),main.indexOf('  /* ------------------------------------------------------ touch controls */')),context);
  const run=code=>vm.runInContext(code,context);
  const key=(event,code)=>handlers[event]({code,preventDefault(){}});
  return {run,key,handlers};
}
test('real key handlers combine all diagonals in either press order and fall back after release',()=>{
  for(const [vertical,vcode] of [['up','ArrowUp'],['down','ArrowDown']]){
    for(const [horizontal,hcode] of [['left','ArrowLeft'],['right','ArrowRight']]){
      for(const codes of [[vcode,hcode],[hcode,vcode]]){
        const h=harness();h.key('keydown',codes[0]);h.key('keydown',codes[1]);
        assert.equal(h.run('pollInput(); input.shootDir'),`${vertical}-${horizontal}`);
        h.key('keydown',codes[0]); // repeat must not reorder held directions
        assert.equal(h.run('pollInput(); input.shootDir'),`${vertical}-${horizontal}`);
        h.key('keyup',hcode);assert.equal(h.run('pollInput(); input.shootDir'),vertical);
        h.key('keyup',vcode);assert.equal(h.run('pollInput(); input.shootDir'),null);
      }
    }
  }
});
test('mouse click uses scaled canvas coordinates, tracks moving player and cursor, and handles fast release',()=>{
  const h=harness();
  const point=(name,x,y,type='mouse',button=0)=>h.run(`cv.handlers['${name}']({clientX:${x},clientY:${y},pointerType:'${type}',button:${button},pointerId:1,preventDefault(){}})`);
  // Canvas is half size: player firing origin (450,264) is at screen (325,182).
  point('pointerdown',355,222); // logical offset (60,80)
  assert.ok(Math.abs(h.run('pollInput(); input.shootDir.x')-0.6)<1e-8);
  assert.ok(Math.abs(h.run('input.shootDir.y')-0.8)<1e-8);
  h.run('game.player.x+=50; pollInput();');
  assert.ok(Math.abs(h.run('input.shootDir.x')-10/Math.hypot(10,80))<1e-8,'held fire follows moving player');
  point('pointermove',450,182);
  assert.equal(h.run('pollInput(); input.shootDir.x'),1);
  assert.equal(h.run('input.shootDir.y'),0);
  point('pointerup',355,222);
  assert.equal(h.run('pollInput(); input.shootDir'),null);
  point('pointerdown',250,100);point('pointerup',250,100);
  assert.ok(h.run('pollInput(); input.shootDir'),'quick click survives until next frame');
  assert.equal(h.run('pollInput(); input.shootDir'),null);
  point('pointerdown',250,100,'touch');
  assert.equal(h.run('pollInput(); input.shootDir'),null,'touch canvas taps do not fire');
  point('pointerdown',250,100,'mouse',2);
  assert.equal(h.run('pollInput(); input.shootDir'),null,'right button does not fire');
});
test('mouse fire stops on pause, cancellation and blur, and keyboard resumes after mouse release',()=>{
  const h=harness();
  const down=()=>h.run("cv.handlers.pointerdown({clientX:400,clientY:182,pointerType:'mouse',button:0,pointerId:4,preventDefault(){}})");
  h.key('keydown','ArrowUp');down();
  assert.equal(h.run('pollInput(); input.shootDir.x'),1);
  h.run('cv.handlers.pointerup({pointerId:4});');
  assert.equal(h.run('pollInput(); input.shootDir'),'up');
  h.key('keyup','ArrowUp');down();h.run('game.paused=true; pollInput();game.paused=false;');
  assert.equal(h.run('pollInput(); input.shootDir'),null);
  for(const name of ['pointercancel','lostpointercapture']){down();h.run(`cv.handlers.${name}({pointerId:4})`);assert.equal(h.run('pollInput(); input.shootDir'),null);}
  down();h.handlers.blur();assert.equal(h.run('pollInput(); input.shootDir'),null);
});
test('opposite keys use latest per axis; blur clears keyboard fire; touch aim feeds input',()=>{
  const h=harness();
  for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'])h.key('keydown',key);
  assert.equal(h.run('pollInput(); input.shootDir'),'down-right');
  h.key('keyup','ArrowDown');assert.equal(h.run('pollInput(); input.shootDir'),'up-right');
  h.handlers.blur();assert.equal(h.run('pollInput(); input.shootDir'),null);
  assert.equal(h.run("touchAim.direction={x:0.6,y:0.8}; pollInput(); input.shootDir.x"),0.6);
});
test('actual tears and charged lasers follow each diagonal with normalized speed and direction',()=>{
  const h=harness();
  h.run('const player=new Player(); const world={tears:[],lasers:[],parts:{spawn(){},burst(){}}};');
  for(const dir of ['up-left','up-right','down-left','down-right']){
    const result=h.run(`world.tears=[]; world.lasers=[]; player.fireTears('${dir}',world); player.fireBrimstone('${dir}',world); ({tear:world.tears[0],laser:world.lasers[0],speed:player.stats.shotSpeed})`);
    assert.ok(Math.abs(Math.hypot(result.tear.vx,result.tear.vy)-result.speed)<1e-8);
    assert.ok(Math.abs(Math.hypot(result.laser.dx,result.laser.dy)-1)<1e-8);
    assert.equal(Math.sign(result.tear.vx),dir.endsWith('left')?-1:1);
    assert.equal(Math.sign(result.tear.vy),dir.startsWith('up')?-1:1);
    assert.equal(Math.sign(result.laser.dx),Math.sign(result.tear.vx));
    assert.equal(Math.sign(result.laser.dy),Math.sign(result.tear.vy));
  }
});
test('shoot joystick captures one finger, aims continuously, and stops on release/cancel/background',()=>{
  const h=harness();
  h.run(`
    const JOY_R=52;
    const elements={}; const docEvents={};
    document.addEventListener=(name,fn)=>docEvents[name]=fn;
    document.getElementById=id=>elements[id] ||= {
      style:{}, handlers:{}, classList:{toggle(){},remove(){}},
      getBoundingClientRect(){return {left:100,top:100,width:138,height:138}},
      setPointerCapture(id){this.captured=id}, addEventListener(name,fn){this.handlers[name]=fn}
    };
  `);
  const main=fs.readFileSync('public/games/roguelike/js/main.js','utf8');
  h.run(main.slice(main.indexOf("  const shootJoy ="), main.indexOf('  /* -------------------------------------------------------------- screens */')));
  const point=(name,x,y,id=2)=>h.run(`elements['shoot-joystick'].handlers['${name}']({clientX:${x},clientY:${y},pointerId:${id},preventDefault(){}}); pollInput();`);
  point('pointerdown',169,169);
  assert.equal(h.run('input.shootDir'),null,'dead zone does not fire');
  point('pointermove',199,209);
  assert.ok(Math.abs(h.run('input.shootDir.x')-0.6)<1e-8);
  assert.ok(Math.abs(h.run('input.shootDir.y')-0.8)<1e-8);
  assert.equal(h.run("elements['shoot-joystick'].captured"),2);
  point('pointerdown',100,100,3);
  point('pointerup',100,100,3);
  assert.ok(Math.abs(h.run('input.shootDir.x')-0.6)<1e-8,'other finger cannot change/stop aim');
  point('pointermove',400,269);
  assert.ok(Math.abs(h.run('Math.hypot(input.shootDir.x,input.shootDir.y)')-1)<1e-8);
  for(const ending of ['pointerup','pointercancel','lostpointercapture']){
    point(ending,400,269);
    assert.equal(h.run('input.shootDir'),null);
    assert.equal(h.run("elements['shoot-knob'].style.transform"),'translate(0,0)');
    point('pointerdown',199,209);
  }
  h.run('document.hidden=true; docEvents.visibilitychange(); pollInput();');
  assert.equal(h.run('input.shootDir'),null);
  point('pointerdown',199,209);h.handlers.blur();
  assert.equal(h.run('pollInput(); input.shootDir'),null);
  h.run('const p=new Player(); const g={tears:[],lasers:[],parts:{spawn(){},burst(){}}}; p.fireTears({x:0.6,y:0.8},g); p.fireBrimstone({x:0.6,y:0.8},g);');
  assert.ok(Math.abs(h.run('g.tears[0].vx / p.stats.shotSpeed')-0.6)<1e-8);
  assert.ok(Math.abs(h.run('g.tears[0].vy / p.stats.shotSpeed')-0.8)<1e-8);
  assert.equal(h.run('g.lasers[0].dx'),0.6);
});
