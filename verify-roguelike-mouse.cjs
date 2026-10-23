const {chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://localhost:3210/games/roguelike/?mute');
  await page.locator('#btn-start').click();
  const aim=await page.evaluate(()=>{
   const g=window.__game.raw,p=g.player,r=document.querySelector('#game').getBoundingClientRect();
   g.tears.length=0;p.fireCd=0;p.vx=p.vy=0;
   return {x:r.left+(p.x+60)*r.width/900,y:r.top+(p.y-6+80)*r.height/540};
  });
  await page.mouse.click(aim.x,aim.y);
  await page.waitForFunction(()=>window.__game.raw.tears.length>0);
  const shot=await page.evaluate(()=>{const g=window.__game.raw,t=g.tears[0];return {x:t.vx/g.player.stats.shotSpeed,y:t.vy/g.player.stats.shotSpeed}});
  assert.ok(Math.abs(shot.x-.6)<.015&&Math.abs(shot.y-.8)<.015,JSON.stringify(shot));
  await page.waitForFunction(()=>window.__game.input.shootDir===null);
  await page.mouse.move(aim.x,aim.y);await page.mouse.down();
  await page.waitForFunction(()=>window.__game.input.shootDir!==null);
  const target=await page.evaluate(()=>{const r=document.querySelector('#game').getBoundingClientRect(),p=window.__game.raw.player;return{x:r.left+(p.x-100)*r.width/900,y:r.top+(p.y-6)*r.height/540};});
  await page.mouse.move(target.x,target.y);
  await page.waitForFunction(()=>window.__game.input.shootDir?.x<-.99);
  await page.keyboard.press('KeyP');
  await page.waitForFunction(()=>window.__game.input.shootDir===null);
  await page.mouse.up();
  assert.deepEqual(errors,[]);
  console.log('PASS browser: click projectile aims at (0.6,0.8), held mouse tracks cursor, release stops, pause clears mouse fire; no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
