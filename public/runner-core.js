(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.RunnerCore=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const names=['土豆','苹果','香蕉','橘子','梨','桃子','草莓','西瓜','葡萄','菠萝','樱桃','柠檬','猕猴桃','芒果','蓝莓','椰子','火龙果','石榴','哈密瓜','胡萝卜','白萝卜','番茄','黄瓜','茄子','南瓜','玉米','西兰花','卷心菜','白菜','青椒','辣椒','洋葱','大蒜','豌豆','红薯','莲藕'];
const colors=['#bf925c','#d44a48','#f1d25c','#e99539','#c2cd60','#ef9c8b','#dc5362','#579d68','#8a68a2','#dfb849','#c44759','#e9d465','#91b555','#eca64d','#637ba8','#94734d','#e37eab','#c65161','#cfbc75','#ed9444','#e8e4bd','#da6548','#5d9b55','#8b6296','#df903d','#ebca61','#5b975e','#92b17c','#c9d69f','#66a569','#cf6047','#b57c96','#e5ddbd','#75a15b','#a96776','#cdb48b'];
const characters=names.map((name,id)=>({id,name,color:colors[id]}));
function drawCharacter(storage,random=Math.random){let s;try{s=JSON.parse(storage.getItem('loud-runner-roster'))}catch{}if(!s||!Array.isArray(s.bag)||s.bag.some(i=>!Number.isInteger(i)||i<0||i>=36)||new Set(s.bag).size!==s.bag.length)s={bag:[],last:-1};if(!s.bag.length){s.bag=characters.map(c=>c.id);for(let i=35;i>0;i--){const j=Math.floor(random()*(i+1));[s.bag[i],s.bag[j]]=[s.bag[j],s.bag[i]]}if(s.bag[35]===s.last)[s.bag[0],s.bag[35]]=[s.bag[35],s.bag[0]]}const id=s.bag.pop();s.last=id;try{storage.setItem('loud-runner-roster',JSON.stringify(s))}catch{}return characters[id]}
const themes=[['菜园清晨','#dce9cf','#91b582','#65885d'],['麦田小径','#f1e2b4','#ceb967','#98834c'],['果园午后','#d5e3d0','#9cb576','#628c61'],['雨后集市','#cbdcdd','#91a7a1','#647f77'],['黄昏屋顶','#efd0bc','#c49485','#8a746b'],['星夜花园','#293e59','#668078','#446a62']];
function level(index){const speed=65+index*3,length=speed*65,ground=180,platforms=[{x:-100,y:ground,w:length+600,h:60}],obstacles=[],coins=[],springs=[];let n=0;const checkpoint=Math.floor(length/2),patterns=[[0,0,1,0,2],[0,1,1,2,0],[2,0,1,2,0],[0,3,1,2,3],[2,1,3,0,2],[3,2,1,0,3]];
for(let x=420;x<length-280;x+=[240,220,260,215,235][(n+index)%5]){if(Math.abs(x-checkpoint)<160)continue;const type=patterns[index][n%5];let o;if(type===0)o={x,y:162,w:20,h:18,type:'crate'};else if(type===1)o={x,y:137,w:48,h:25,type:'beam'};else if(type===2)o={x,y:180,w:42,h:60,type:'gap'};else if(type===3&&index>=3)o={x,y:160,w:22,h:20,type:'cart',base:x};else o={x,y:158,w:24,h:22,type:'crate'};obstacles.push(o);
coins.push({id:n*3,x:x-35,y:147},{id:n*3+1,x:x+10,y:type===1?171:127},{id:n*3+2,x:x+65,y:147});
if(index>=2&&n%3===1){platforms.push({x:x-70,y:116,w:145,h:10,moving:index>=4,base:x-70});coins.push({id:100+n,x:x+5,y:96});springs.push({x:x-112,y:174,w:18,h:6})}n++}
return {index,speed,length,ground,platforms,obstacles,coins,springs,checkpoint,theme:themes[index]}}
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
// Keep the arc close to its original height, with more travel and a weightier fall.
const physics={jumpSpeed:360,doubleJumpSpeed:300,riseGravity:780,fallGravity:1170,airSpeed:1.534,shortJumpSpeed:240,springSpeed:390};
class Game{
constructor(index=0){this.load(index)}
load(index){this.map=level(index);this.x=40;this.y=180;this.vy=0;this.time=0;this.dead=0;this.deaths=0;this.collected=new Set();this.saved=new Set();this.check=false;this.grounded=true;this.coyote=.1;this.buffer=0;this.hold=false;this.slide=false;this.state='ready';this.event='';this.jumpsUsed=0}
jump(){if(this.state==='playing')this.buffer=.12}
release(){this.hold=false;if(this.vy< -physics.shortJumpSpeed)this.vy=-physics.shortJumpSpeed}
get body(){return{x:this.x-7,y:this.y-(this.slide&&this.grounded?10:19),w:14,h:this.slide&&this.grounded?10:19}}
step(dt){if(this.state!=='playing')return;this.event='';if(this.dead>0){this.dead-=dt;if(this.dead<=0){this.dead=0;this.x=this.check?this.map.checkpoint:40;this.y=180;this.vy=0;this.grounded=true;this.coyote=.1;this.buffer=0;this.jumpsUsed=0;this.collected=new Set(this.saved)}return}this.time+=dt;this.buffer-=dt;this.coyote=this.grounded?.1:this.coyote-dt;if(this.buffer>0&&(this.coyote>0||(!this.grounded&&this.jumpsUsed<2))){const airJump=this.coyote<=0;this.vy=-(airJump?physics.doubleJumpSpeed:physics.jumpSpeed);this.jumpsUsed=airJump?2:1;this.grounded=false;this.coyote=0;this.buffer=0;this.event='jump'}
const prev=this.y;this.x+=this.map.speed*(this.grounded?1:physics.airSpeed)*dt;this.vy+=(this.vy<0?physics.riseGravity:physics.fallGravity)*dt;this.y+=this.vy*dt;this.grounded=false;
for(const p of this.map.platforms){if(p.moving)p.x=p.base+Math.sin(this.time*1.2)*22;const gap=p.y===180&&this.map.obstacles.some(o=>o.type==='gap'&&this.x>o.x+4&&this.x<o.x+o.w-4);if(!gap&&this.vy>=0&&prev<=p.y+.5&&this.y>=p.y&&this.x+6>p.x&&this.x-6<p.x+p.w){this.y=p.y;this.vy=0;this.grounded=true;this.jumpsUsed=0}}
for(const s of this.map.springs)if(this.grounded&&Math.abs(this.x-(s.x+9))<12){this.vy=-physics.springSpeed;this.grounded=false;this.jumpsUsed=1;this.coyote=0;this.event='jump'}
for(const c of this.map.coins)if(!this.collected.has(c.id)&&Math.abs(this.x-c.x)<13&&Math.abs(this.y-10-c.y)<16){this.collected.add(c.id);this.event='coin'}
for(const o of this.map.obstacles){if(o.type==='cart')o.x=o.base+Math.sin(this.time*1.2)*8;if(o.type!=='gap'&&overlap(this.body,o)){this.die();break}}
if(this.y>235)this.die();if(this.dead)return;
if(!this.check&&this.x>=this.map.checkpoint){this.check=true;this.saved=new Set(this.collected);this.event='checkpoint'}
if(this.x>=this.map.length){this.state='won';this.event='win'}
}
die(){if(this.dead)return;this.deaths++;this.dead=.7;this.event='hurt'}
get leaves(){return 1+(this.collected.size/this.map.coins.length>=.8?1:0)+(this.deaths===0?1:0)}
}
return{characters,drawCharacter,level,Game,overlap,themes};
});
