(function(){'use strict';
const C=RunnerCore;const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h)};
function oval(c,x,y,w,h,color){for(let j=0;j<h;j+=2){const f=Math.sqrt(Math.max(0,1-Math.pow((j+1-h/2)/(h/2),2)));const half=Math.max(1,Math.round(w*f/2));rect(c,x+w/2-half,y+j,half*2,2,color)}}
function hero(c,id,x,y,t=0,pose='run',scale=1){const a=C.characters[id],col=a.color;c.save();c.translate(Math.round(x),Math.round(y));c.scale(scale,scale);if(pose==='slide'){c.scale(1.25,.55)}if(pose==='hurt'){c.rotate(-.25)}const r=(x,y,w,h,k)=>rect(c,x,y,w,h,k),o=(x,y,w,h,k)=>oval(c,x,y,w,h,k);const leaf=()=>{r(-1,-24,2,5,'#557b47');r(0,-25,6,3,'#709447')};
// Each vegetable has its own small pixel silhouette and surface details.
switch(id){
case 0:o(-9,-21,18,20,col);r(-6,-16,2,2,'#947146');r(4,-9,2,2,'#947146');break;
case 2:for(let i=0;i<6;i++)r(-9+i*3,-19+i*2,5,5,col);r(-9,-22,3,4,'#8c7941');r(6,-11,3,3,'#8c7941');break;
case 4:o(-8,-16,16,15,col);o(-5,-23,10,13,col);leaf();break;
case 6:o(-9,-21,18,12,col);o(-6,-13,12,9,col);for(let i=0;i<4;i++)r(-6+i*4,-17+(i%2)*5,1,2,'#f7d09d');r(-8,-24,16,3,'#61834c');break;
case 7:o(-11,-21,22,20,col);for(let i=0;i<4;i++)r(-8+i*5,-20,2,17,'#3a7850');break;
case 8:for(let row=0;row<3;row++)for(let j=0;j<3-row;j++)o(-10+j*7+row*3,-22+row*7,8,8,col);leaf();break;
case 9:o(-9,-20,18,19,col);for(let i=0;i<4;i++){r(-7+i*4,-17,1,13,'#ad9845');r(-7,-17+i*4,14,1,'#ad9845')}r(-4,-28,3,9,'#5c8550');r(1,-27,3,8,'#79a052');r(4,-25,3,5,'#5c8550');break;
case 10:o(-12,-13,12,12,col);o(1,-13,12,12,col);r(-6,-23,2,11,'#66814b');r(6,-23,2,11,'#66814b');r(-5,-24,13,2,'#66814b');break;
case 11:o(-11,-18,22,16,col);r(-13,-12,3,4,col);r(10,-12,3,4,col);leaf();break;
case 12:o(-10,-21,20,20,'#a47d4a');o(-7,-19,14,16,col);for(let i=0;i<5;i++)r(-5+i*2,-15+(i%2)*8,1,2,'#5e6540');break;
case 13:o(-10,-22,20,21,col);r(-7,-23,7,3,'#dba04c');leaf();break;
case 14:for(let i=0;i<3;i++)o(-11+i*6,-16-(i%2)*6,12,14,col);r(-4,-22,8,3,'#425d7d');break;
case 15:o(-10,-21,20,20,col);r(-6,-18,12,2,'#b5916c');r(-7,-12,2,5,'#71563c');r(5,-16,2,10,'#71563c');break;
case 16:o(-9,-21,18,20,col);for(let i=0;i<5;i++)r(-10+i*4,-22+(i%2)*7,3,5,'#8caa54');break;
case 17:o(-10,-21,20,20,col);r(-5,-24,10,4,'#ac4a52');r(-3,-27,2,4,col);r(2,-27,2,4,col);break;
case 18:o(-11,-21,22,20,col);for(let i=0;i<5;i++){r(-9+i*4,-19,1,16,'#a69d69');r(-8,-17+i*3,16,1,'#ddd1a0')}leaf();break;
case 19:for(let i=0;i<9;i++)r(-7+Math.floor(i*.7),-23+i*2,14-i,2,col);r(-2,-29,3,7,'#679651');r(-7,-27,4,5,'#80a85c');r(3,-27,4,5,'#80a85c');r(-5,-18,4,1,'#cd773b');break;
case 20:o(-8,-23,16,17,col);r(-5,-9,10,5,col);r(-1,-6,2,6,col);r(-5,-28,3,7,'#6c9557');r(2,-28,3,7,'#86aa68');break;
case 22:o(-7,-26,14,25,col);for(let i=0;i<5;i++)r(-5+(i%2)*7,-23+i*4,2,2,'#b0c77b');break;
case 23:o(-10,-19,19,18,col);o(-5,-26,12,17,col);r(-4,-26,10,4,'#638552');leaf();break;
case 24:o(-12,-20,24,19,col);for(let i=0;i<4;i++)r(-8+i*5,-18,1,15,'#ba783c');leaf();break;
case 25:o(-8,-26,16,25,col);for(let j=0;j<5;j++)for(let i=0;i<3;i++)r(-5+i*4,-23+j*4,2,2,'#ffdf83');r(-10,-13,4,12,'#769453');r(7,-17,4,16,'#769453');break;
case 26:r(-3,-17,7,16,'#a6b779');o(-12,-26,15,15,col);o(-2,-28,15,16,col);o(-6,-29,13,16,'#72a369');break;
case 27:o(-12,-23,24,22,col);o(-8,-20,16,17,'#acc28e');r(-1,-20,2,17,'#7b9b6d');r(-8,-15,16,1,'#7b9b6d');break;
case 28:o(-9,-27,18,27,col);r(-8,-23,4,16,'#8faa74');r(4,-23,4,16,'#8faa74');r(-2,-20,4,18,'#e1e4bb');break;
case 29:o(-11,-22,13,20,col);o(0,-22,12,20,col);r(-3,-23,7,21,'#7db97a');leaf();break;
case 30:for(let i=0;i<7;i++)r(-8+i*2,-22+i*2,12-i,4,col);leaf();break;
case 31:o(-10,-19,20,18,col);o(-5,-26,10,14,col);r(-2,-29,4,6,'#8c9e63');for(let i=0;i<3;i++)r(-6+i*6,-16,1,11,'#98697f');break;
case 32:o(-11,-19,22,18,col);o(-5,-25,10,15,col);r(-1,-29,2,7,'#bcb88f');r(-6,-15,1,12,'#b9b895');r(5,-15,1,12,'#b9b895');break;
case 33:o(-14,-19,28,16,col);for(let i=0;i<3;i++)o(-11+i*8,-17,7,11,'#a3bd70');break;
case 34:o(-12,-18,24,16,col);r(-14,-12,4,3,col);r(10,-15,4,3,col);r(-9,-13,3,1,'#c28b86');break;
case 35:o(-12,-21,24,20,col);for(const [x,y]of[[-6,-16],[3,-16],[-2,-9]])o(x,y,5,5,'#8f8865');break;
default:o(-10,-21,20,20,col);leaf();if(id===3)r(-7,-17,2,2,'#f3bb5e');if(id===5)r(0,-20,1,17,'#cf7c7c');if(id===21)r(-7,-23,14,4,'#6b8c51');if(id===1)r(-6,-19,3,4,'#ec7b64');
}
// Dark eyes, highlights, smile; legs animate independently from body.
const face=id===2?[[-1,-12],[5,-9],[3,-6]]:id===19?[[-3,-16],[3,-16],[0,-11]]:id===30?[[-2,-17],[4,-13],[3,-8]]:[[-5,-13],[4,-13],[-1,-8]];for(const [x,y]of face.slice(0,2)){r(x,y,2,3,'#273c36');r(x,y,1,1,'#fff4ce')}r(face[2][0],face[2][1],3,1,'#674b3d');const f=pose==='run'?Math.sin(t*17)*2:pose==='jump'?-2:pose==='fall'?2:0;r(-6,-1,3,3+Math.round(f),'#3d5945');r(3,-1,3,3-Math.round(f),'#3d5945');if(pose==='celebrate'){r(-13,-15,4,3,'#3d5945');r(10,-18,4,3,'#3d5945')}c.restore()}
function render(c,g,char,reduced=false){const m=g.map,idx=m.index,theme=m.theme,time=g.time,cam=Math.max(0,g.x-85);c.clearRect(0,0,384,216);rect(c,0,0,384,216,theme[1]);rect(c,0,140,384,76,theme[2]);
const scenery=window.RunnerScenery;
if(!scenery?.backdrop(c,idx,cam,time,reduced)){
// Far clouds/stars and hills move at a fraction of the foreground speed.
oval(c,305,23,22,22,idx===5?'#eee0b3':'#f5d799');if(idx===5)oval(c,312,19,20,22,theme[1]);
for(let i=0;i<9;i++){let x=((i*67-cam*.12)%470+470)%470-40;if(idx===5){rect(c,x,20+(i*23)%75,2,2,'#eeddb0')}else{rect(c,x,26+(i%3)*18,27,6,'#f8f1d9');rect(c,x+7,22+(i%3)*18,12,5,'#f8f1d9')}}
for(let i=0;i<7;i++){let x=((i*83-cam*.25)%560+560)%560-70;for(let j=0;j<5;j++)rect(c,x+j*5,118-j*5,80-j*10,70,theme[2])}
for(let i=0;i<12;i++){const x=((i*57-cam*.45)%700+700)%700-40;const r=(a,b,w,h,k)=>rect(c,x+a,b,w,h,k);if(idx===0){r(0,137,4,41,'#9a9671');r(-4,147,34,3,'#b9ad7c');r(26,137,4,41,'#9a9671')}if(idx===1){r(12,101,5,76,'#a18a59');r(-2,113,33,4,'#e9d59b');r(12,99,4,33,'#e9d59b');r(6,97,16,8,'#b19960')}if(idx===2){r(12,129,5,49,'#928368');oval(c,x-3,102,35,40,'#83a775');rect(c,x+5,115,4,4,'#d89365')}if(idx===3){r(0,135,43,43,'#a8b4a2');r(-3,131,48,7,'#c28770');r(5,142,31,18,'#748d83');r(0,131,8,7,'#e5c699');r(16,131,8,7,'#e5c699')}if(idx===4){const h=35+(i%3)*15;r(0,178-h,36,h,'#b19c91');r(-3,176-h,42,4,'#987e72');r(7,186-h,6,8,'#f0d6a0');r(23,186-h,6,8,'#f0d6a0')}if(idx===5){r(12,120,3,58,'#637d6c');r(7,117,13,10,'#e5c98b');r(0,143,38,1,'#81967a');r(2,145,2,3,'#e9ca86');r(28,145,2,3,'#e9ca86')}}
}
// World floor and ledges.
if(scenery)scenery.floor(c,m,cam);else
for(const p of m.platforms){const x=p.x-cam;if(x>390||x+p.w<0)continue;rect(c,x,p.y,p.w,p.h,theme[3]);rect(c,x,p.y,p.w,4,idx===4?'#bba286':'#afbd81');if(p.y===180)for(let k=Math.max(0,Math.floor((cam-p.x)/24));k<(cam+400-p.x)/24;k++){rect(c,x+k*24+5,191,3,2,'#b4b08a');rect(c,x+k*24+16,205,4,2,'#b4b08a')}}
for(const o of m.obstacles){const x=o.x-cam;if(x>400||x+o.w<0)continue;if(o.type==='gap'){rect(c,x,180,o.w,36,'#384f43');rect(c,x+3,207,o.w-6,9,'#718d77')}else if(o.type==='beam'){rect(c,x,o.y,o.w,o.h,idx===4?'#a67c6a':'#8c9a70');rect(c,x,o.y,o.w,4,'#c6bd91');rect(c,x+3,o.y+5,o.w-6,2,'#768561')}else{rect(c,x,o.y,o.w,o.h,'#ad8058');rect(c,x+2,o.y+2,o.w-4,o.h-4,'#c8a574');rect(c,x+3,o.y+7,o.w-6,2,'#9b7755');rect(c,x+o.w/2,o.y+2,2,o.h-4,'#9b7755');if(o.type==='cart'){rect(c,x-2,o.y+o.h-2,6,5,'#435747');rect(c,x+o.w-4,o.y+o.h-2,6,5,'#435747')}}}
// Theme-specific surfaces retain the same readable collision silhouettes.
for(const o of m.obstacles){if(o.type!=='crate')continue;const x=o.x-cam;if(x< -30||x>400)continue;if(idx===1){rect(c,x,o.y,o.w,o.h,'#c8ad61');for(let i=0;i<4;i++)rect(c,x+2,o.y+3+i*4,o.w-4,1,'#e7cf88');rect(c,x+5,o.y,2,o.h,'#8b8250')}if(idx===2){rect(c,x,o.y+4,o.w,o.h-4,'#ab865a');for(let i=0;i<3;i++)oval(c,x+2+i*7,o.y,6,6,'#d48b60')}if(idx===4){rect(c,x,o.y,o.w,o.h,'#ab8475');for(let j=0;j<4;j++){rect(c,x,o.y+j*6,o.w,1,'#d4b59b');rect(c,x+(j%2?4:12),o.y+j*6,1,6,'#d4b59b')}}if(idx===5){rect(c,x,o.y,o.w,o.h,'#9e8061');rect(c,x,o.y,o.w,4,'#c5ac78');rect(c,x+5,o.y+7,2,5,'#bba077')}}
if(scenery)scenery.detail(c,m,cam,time,reduced);
for(let i=0;i<20;i++){const wx=i*49+Math.floor(cam/980)*980,x=wx-cam;if(x< -10||x>390||m.obstacles.some(o=>o.type==='gap'&&wx>o.x-8&&wx<o.x+o.w+8))continue;rect(c,x,176,1,4,'#a8bd81');rect(c,x-2,174,5,2,idx===1?'#e1ce8b':idx===5?'#dcb790':'#dfaf88')}
for(const s of m.springs){const x=s.x-cam;rect(c,x+3,170,12,10,'#e8dab0');rect(c,x,168,18,5,'#ce7960');rect(c,x+3,169,3,2,'#f7deaa')}
for(const a of m.coins){if(g.collected.has(a.id)||a.x<cam-10||a.x>cam+395)continue;const y=a.y+(reduced?0:Math.sin(time*3+a.id)*2);rect(c,a.x-cam-4,y-4,8,8,'#233f39');rect(c,a.x-cam-3,y-3,6,6,'#f0d89b');rect(c,a.x-cam-2,y-4,5,5,'#6f9b59');rect(c,a.x-cam,y-2,1,4,'#d6dfa0')}
for(const [x,label]of[[m.checkpoint,'½'],[m.length,'★']]){if(x-cam>-20&&x-cam<400){rect(c,x-cam,119,2,61,'#526f52');rect(c,x-cam+2,120,22,14,x===m.checkpoint?'#e2c27b':'#dc8b68');c.fillStyle='#405d47';c.font='9px monospace';c.fillText(label,x-cam+7,130)}}
const drawHero=(id,x,y,t,pose)=>scenery?scenery.hero(c,hero,id,x,y,t,pose):hero(c,id,x,y,t,pose);
if(!g.dead||Math.floor(g.dead*15)%2)drawHero(char.id,g.x-cam,g.y,time,g.dead?'hurt':g.state==='won'?'celebrate':g.slide&&g.grounded?'slide':g.grounded?'run':g.vy<0?'jump':'fall');
if(m.length-cam<400)for(let i=0;i<4;i++)drawHero([0,6,7,25][i],m.length-cam+35+i*24,180,time,'celebrate');
if(idx===3&&!reduced){for(let i=0;i<20;i++)rect(c,(i*31+time*40)%384,(i*17+time*100)%180,1,4,'#e2e9d1')}
}
window.RunnerArt={hero,render};})();
