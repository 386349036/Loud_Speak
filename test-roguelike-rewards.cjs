const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(){
 const c=vm.createContext({console,CHAPTERS:[]});
 vm.runInContext(fs.readFileSync('public/games/roguelike/js/util.js','utf8'),c);
 vm.runInContext(fs.readFileSync('public/games/roguelike/js/game.js','utf8'),c);
 vm.runInContext(`Sfx.pickup=Sfx.hurt=()=>{};Shake.add=()=>{};
 const ITEM_BY_ID={one:{id:'one'},two:{id:'two'}};
 const g=Object.create(Game.prototype);g.room={props:[],pickups:[]};g.parts={burst(){}};g.toasts=[];
 g.player={x:100,y:88,r:15,hp:8,coins:20,items:[],addItem(item){this.items.push(item.id)}};
 const first={kind:'pedestal',x:100,y:100,itemId:'one',exclusiveGroup:'choice'};
 const second={kind:'pedestal',x:180,y:100,itemId:'two',exclusiveGroup:'choice',cursed:true};
 g.room.props=[first,second];`,c);
 return s=>vm.runInContext(s,c);
}
test('either normal or cursed choice removes its peer and cannot regenerate it on later contact',()=>{
 for(const chosen of ['first','second']){
  const run=setup();run(`g.player.x=${chosen}.x;g.updatePickups();`);
  assert.equal(run('g.player.items.length'),1);
  const other=chosen==='first'?'second':'first';
  assert.equal(run(`${other}.gone`),true);
  run(`g.player.x=${other}.x;g.updatePickups();g.updatePickups();`);
  assert.equal(run('g.player.items.length'),1);
  assert.equal(run('g.player.hp'),chosen==='second'?6:8);
 }
});
test('overlapping choices award only one item in one update',()=>{
 const run=setup();run('second.x=first.x;g.updatePickups();');
 assert.equal(run('g.player.items.length'),1);assert.equal(run('g.player.hp'),8);
});
test('challenge reward generator puts normal, cursed and gamble rewards in one choice group',()=>{
 const run=setup();
 run(`g.room.props=[];g.itemPool={next:()=>({id:'one'})};g.cursedItemPool={next:()=>({id:'two'})};
 g.gambleItemPool={next:()=>({id:'two'})};g.refreshDoors=()=>{};g.spawnChallengeReward(g.room);`);
 assert.equal(run("g.room.props.filter(p=>p.exclusiveGroup==='challenge-exclusion').length"),3);
 run('g.player.x=g.room.props[0].x;g.player.y=g.room.props[0].y-12;g.updatePickups();');
 assert.equal(run('g.player.items.length'),1);
 assert.equal(run('g.room.props.filter(p=>p.gone).length'),2);
});
test('gamble success and failure both commit a paid choice; insufficient coins do not',()=>{
 for(const roll of [0.1,0.9]){
  const run=setup();run(`first.kind='gamblePedestal';first.coinCost=5;Math.random=()=>${roll};g.updatePickups();`);
  assert.equal(run('second.gone'),true);assert.equal(run('g.player.coins'),15);
  run('g.player.x=second.x;g.updatePickups();');
  assert.equal(run('g.player.items.length'),roll<0.6?1:0);
 }
 const run=setup();run("first.kind='gamblePedestal';first.coinCost=5;g.player.coins=0;g.updatePickups();");
 assert.equal(run('!!second.gone'),false);
});
