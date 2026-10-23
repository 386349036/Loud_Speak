(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.BreakoutCore=factory()})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
const W=480,H=560,R=7,STEP=1/120,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
// Sweep a circle against a rectangle expanded by its radius (conservative at corners).
function sweep(b,dx,dy,box){let enter=-Infinity,exit=Infinity,nx=0,ny=0;for(const [p,d,min,max,ax,ay]of[[b.x,dx,box.x-R,box.x+box.w+R,1,0],[b.y,dy,box.y-R,box.y+box.h+R,0,1]]){if(Math.abs(d)<1e-10){if(p<min||p>max)return null;continue}let a=(min-p)/d,z=(max-p)/d,sign=-Math.sign(d);if(a>z)[a,z]=[z,a];if(a>enter){enter=a;nx=ax*sign;ny=ay*sign}exit=Math.min(exit,z);if(enter>exit)return null}return enter>=-1e-8&&enter<=1&&exit>=0?{t:Math.max(0,enter),nx,ny}:null}
function layout(index){const bricks=[],rows=3+Math.floor(index/2);for(let row=0;row<rows;row++)for(let col=0;col<8;col++){const hp=index>=2&&(row+col)%Math.max(2,6-index)===0?2:1;bricks.push({x:25+col*54,y:64+row*29,w:48,h:22,hp,maxHp:hp,kind:(col+row)%4})}return bricks}
class Game{
 constructor(random=Math.random){this.random=random;this.restart()}
 restart(){this.level=0;this.score=0;this.lives=3;this.time=0;this.events=[];this.load()}
 load(){this.bricks=layout(this.level);this.paddle={x:240,y:516,w:88,h:12};this.clearPowers();this.ready()}
 clearPowers(){this.wideUntil=0;this.slowUntil=0;this.drops=[];if(this.paddle)this.paddle.w=88}
 ready(){this.state='ready';this.balls=[{x:this.paddle.x,y:this.paddle.y-R-1,vx:0,vy:0}]}
 get speed(){return (235+this.level*18)*(this.time<this.slowUntil?.72:1)}
 move(x){this.paddle.x=clamp(x,this.paddle.w/2+8,W-this.paddle.w/2-8);if(this.state==='ready')this.balls[0].x=this.paddle.x}
 launch(){if(this.state!=='ready')return;this.state='playing';this.balls[0].vx=this.speed*.32;this.balls[0].vy=-this.speed*Math.sqrt(1-.32**2)}
 pause(){if(['ready','playing'].includes(this.state)){this.previous=this.state;this.state='paused'}}
 resume(){if(this.state==='paused')this.state=this.previous}
 next(){if(this.state==='level'){this.level++;this.load()}}
 power(type){if(type==='wide'){this.wideUntil=this.time+12;this.paddle.w=130;this.move(this.paddle.x)}else if(type==='slow')this.slowUntil=this.time+12;else if(type==='multi'&&this.balls.length){const b=this.balls[0];while(this.balls.length<3){const a=(this.balls.length===1?-.65:.65);this.balls.push({x:b.x,y:b.y,vx:Math.sin(a)*this.speed,vy:-Math.cos(a)*this.speed})}}this.events.push({type:'power',x:this.paddle.x,y:this.paddle.y})}
 hit(brick){if(brick.hp<=0)return;brick.hp--;this.events.push({type:'hit',x:brick.x+brick.w/2,y:brick.y+brick.h/2});if(!brick.hp){this.score+=brick.maxHp*10;if(this.random()<.2)this.drops.push({x:brick.x+brick.w/2,y:brick.y,type:['wide','slow','multi'][Math.min(2,Math.floor(this.random()*3))]})}}
 step(dt,input=0){if(!['playing','ready'].includes(this.state))return;this.time+=dt;this.paddle.w=this.time<this.wideUntil?130:88;this.move(this.paddle.x+input*370*dt);if(this.state==='ready')return;
 for(const b of this.balls){const length=Math.hypot(b.vx,b.vy)||1;b.vx=b.vx/length*this.speed;b.vy=b.vy/length*this.speed;let remaining=dt;for(let count=0;count<16&&remaining>1e-8;count++){const dx=b.vx*remaining,dy=b.vy*remaining;let best=null;const consider=(t,nx,ny,brick,paddle=false)=>{if(t>=-1e-8&&t<=1&&(!best||t<best.t))best={t:Math.max(0,t),nx,ny,brick,paddle}};if(dx<0)consider((R-b.x)/dx,1,0);if(dx>0)consider((W-R-b.x)/dx,-1,0);if(dy<0)consider((R-b.y)/dy,0,1);for(const brick of this.bricks){if(!brick.hp)continue;const h=sweep(b,dx,dy,brick);if(h)consider(h.t,h.nx,h.ny,brick)}if(dy>0&&b.y<=this.paddle.y-R+.01){const h=sweep(b,dx,dy,{...this.paddle,x:this.paddle.x-this.paddle.w/2});if(h)consider(h.t,h.nx,h.ny,null,true)}if(!best){b.x+=dx;b.y+=dy;break}b.x+=dx*best.t;b.y+=dy*best.t;remaining*=1-best.t;if(best.paddle){const a=clamp((b.x-this.paddle.x)/(this.paddle.w/2),-1,1)*1.05;b.vx=Math.sin(a)*this.speed;b.vy=-Math.cos(a)*this.speed;this.events.push({type:'bounce',x:b.x,y:b.y})}else{if(best.nx)b.vx=-b.vx;if(best.ny)b.vy=-b.vy;if(best.brick)this.hit(best.brick)}b.x+=best.nx*.02;b.y+=best.ny*.02}
 }
 this.balls=this.balls.filter(b=>b.y<H+R);for(const d of this.drops){d.y+=95*dt;if(Math.abs(d.x-this.paddle.x)<this.paddle.w/2+9&&d.y>=this.paddle.y-9&&d.y<=this.paddle.y+this.paddle.h+9){this.power(d.type);d.caught=true}}this.drops=this.drops.filter(d=>!d.caught&&d.y<H+12);
 if(this.bricks.every(b=>b.hp===0)){this.state=this.level===5?'won':'level';this.events.push({type:'win',x:240,y:200});return}if(!this.balls.length){this.lives--;this.clearPowers();if(this.lives<=0)this.state='over';else this.ready()}
 }
}
function preferences(raw){try{const v=JSON.parse(raw);return {best:Number.isSafeInteger(v.best)&&v.best>=0?v.best:0,mute:v.mute!==false}}catch{return {best:0,mute:true}}}
return {Game,layout,sweep,preferences,W,H,R,STEP};
});
