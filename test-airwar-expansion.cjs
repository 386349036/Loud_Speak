const assert=require('node:assert/strict');
const {Game,ENEMIES}=require('./public/airwar-core');
const tick=(g,n)=>{for(let i=0;i<n;i++)g.step(1/60)};
assert.equal(Object.keys(ENEMIES).length,8);
for(const type of ['hornet','manta','lancer','carrier']){
 const g=new Game(2,3);g.play();g.waveClock=100;g.spawnEnemy(type,180,80,{shot:0});tick(g,1);
 if(type==='lancer'){assert.equal(g.lasers.length,1);assert.equal(g.lasers[0].warn,1);assert.equal(g.player.hp,5)}
 else if(type==='carrier')assert.equal(g.enemies.filter(e=>e.type==='sparrow').length,2);
 else {assert.equal(g.enemyBullets.length,type==='hornet'?3:10);assert.ok(g.enemyBullets.some(b=>b.curve!==0));}
}
{
 const g=new Game();g.play();g.waveClock=100;g.emit(20,70,1,100,'bullet-aimed',.65);const b=g.enemyBullets[0],vx=b.vx;tick(g,20);assert.notEqual(b.vx,vx);
 const normal=new Game(),slow=new Game();for(const x of[normal,slow]){x.play();x.waveClock=100;x.emit(30,80,Math.PI/2,100)}slow.pickup({type:'slow'});tick(normal,60);tick(slow,60);assert.ok(slow.enemyBullets[0].y<normal.enemyBullets[0].y-40);
 slow.pause();const time=slow.buffs.slow;tick(slow,60);assert.equal(slow.buffs.slow,time);
}
{
 const a=new Game(),b=new Game();for(const g of[a,b]){g.play();g.waveClock=100}a.pickup({type:'rapid'});tick(a,60);tick(b,60);assert.ok(a.playerBullets.length>b.playerBullets.length);
 b.pickup({type:'bomb'});assert.equal(b.player.bombs,3);for(let n=0;n<10;n++)b.pickup({type:'bomb'});assert.equal(b.player.bombs,5);
 b.pickup({type:'pierce'});b.playerBullets=[];b.player.x=180;b.player.y=300;b.shootPlayer();b.spawnEnemy('sparrow',175,260);b.spawnEnemy('sparrow',175,220);tick(b,20);assert.ok(b.score>=120);
 const m=new Game();m.play();m.waveClock=100;m.pickup({type:'magnet'});m.items=[{x:240,y:400,age:0,type:'repair'}];m.player.hp=3;tick(m,40);assert.equal(m.player.hp,4);
 for(const k of Object.keys(m.buffs))m.buffs[k]=.01;tick(m,2);assert.ok(Object.values(m.buffs).every(t=>t===0));
}
{
 const g=new Game(2,17);g.play();g.player.invuln=1000;const seen=new Set();for(let i=0;i<60*89;i++){g.step(1/60);g.enemies.forEach(e=>seen.add(e.type));assert.ok(g.enemies.length<=22&&g.enemyBullets.length<=180)}for(const type of Object.keys(ENEMIES))assert.ok(seen.has(type),'missing '+type);
 const lib=new Game(0,42),items=new Set();for(let i=0;i<1000;i++){lib.player.firepower=i%2?3:1;lib.dropSupply();items.add(lib.items.at(-1).type)}for(const type of['firepower','shield','bomb','rapid','pierce','slow','magnet'])assert.ok(items.has(type));
}
console.log('PASS expanded enemies, curved trajectories, laser warning, carrier deployment, timed powers, piercing, magnet, spawn coverage and caps');
