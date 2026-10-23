window.TankArt=(()=>{
const S=624,T=24;let cachedWorld=null,floor=null;
const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
function poly(c,p,color){c.fillStyle=color;c.beginPath();c.moveTo(...p[0]);for(const q of p.slice(1))c.lineTo(...q);c.closePath();c.fill()}
function ellipse(c,x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill()}
function line(c,x,y,xx,yy,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke()}
function hash(x,y){return ((Math.imul(x+19,374761393)^Math.imul(y+37,668265263))>>>0)%997}
function decoration(c,d,theme,fade=1){const x=d.x*T,y=d.y*T,n=d.variant;c.save();c.translate(x,y);c.globalAlpha=.65*fade;
 switch(d.type){
 case 'cactus':line(c,12,23,12,4,'#57754c',5);line(c,12,14,5,14,'#57754c',4);line(c,5,14,5,8,'#57754c',4);line(c,12,18,20,18,'#57754c',4);line(c,20,18,20,12,'#57754c',4);line(c,11,5,11,21,'#9fa76b');break;
 case 'deadwood':case 'stump':line(c,11,22,12,7,'#72654c',3);line(c,12,14,5,8,'#72654c',2);line(c,12,11,18,5,'#72654c',2);ellipse(c,12,23,7,2,'#6a664440');break;
 case 'stone':case 'mesa':ellipse(c,15,20,10,4,'#293c3430');poly(c,[[3,17],[6,8],[17,6],[23,15],[18,20],[7,20]],theme.id==='red'?'#99634e':theme.id==='snow'?'#aab8b7':'#a38e67');poly(c,[[6,8],[17,6],[20,12],[10,14],[3,17]],theme.id==='red'?'#c19070':theme.id==='snow'?'#e9efe8':'#c5b08a');break;
 case 'tracks':for(let i=1;i<22;i+=5){c.fillStyle='#465f3c25';c.fillRect(5,i,3,3);c.fillRect(17,i,3,3)}break;
 case 'shrub':ellipse(c,10,16,7,5,theme.id==='red'?'#707345':'#879161');ellipse(c,16,13,5,4,'#8a9560');break;
 case 'pine':ellipse(c,14,23,9,3,'#657c7240');c.fillStyle='#786b50';c.fillRect(10,15,4,9);poly(c,[[12,0],[2,18],[22,18]],'#4e7263');poly(c,[[12,0],[5,11],[16,8]],'#d5e7df');line(c,6,15,17,15,'#dce8db',2);break;
 case 'snowbank':ellipse(c,12,15,11,6,'#a8bdbc');ellipse(c,10,12,10,6,'#f2f4e7');break;
 case 'lamp':line(c,16,23,12,4,'#364e48',2);ellipse(c,13,3,4,2,'#c9c9a4');line(c,16,23,22,23,'#384c4430',2);break;
 case 'crossing':c.fillStyle='#d8d8bb55';for(let i=1;i<24;i+=6)c.fillRect(2,i,20,3);break;
 case 'parking':line(c,3,3,3,22,'#d2d4ba55');line(c,3,3,22,3,'#d2d4ba55');break;
 case 'wreck':ellipse(c,14,19,11,4,'#263c3a40');c.fillStyle='#665b4b';c.fillRect(3,7,17,13);c.fillStyle='#977e62';c.fillRect(5,5,13,12);c.fillStyle='#556b6a';c.fillRect(8,6,7,4);line(c,3,20,20,20,'#3a4941',2);break;
 case 'crater':ellipse(c,12,14,10,7,'#596d60');ellipse(c,12,15,7,4,'#43574e');break;
 case 'crops':for(let xx=3;xx<24;xx+=7){line(c,xx,22,xx,7,'#687f43',2);line(c,xx,14,xx-3,10,'#b4bd6c',2);line(c,xx,17,xx+3,13,'#b4bd6c',2)}break;
 case 'windmill':poly(c,[[10,22],[12,9],[16,9],[19,22]],'#cec39b');line(c,14,9,4,0,'#f0dfb4',2);line(c,14,9,24,18,'#f0dfb4',2);line(c,14,9,23,0,'#f0dfb4',2);line(c,14,9,5,18,'#f0dfb4',2);break;
 case 'hut':c.fillStyle='#b09b6b';c.fillRect(4,11,17,11);poly(c,[[1,12],[12,3],[24,12]],'#7c6e4b');c.fillStyle='#526344';c.fillRect(10,16,5,6);break;
 case 'furrow':for(let i=3;i<24;i+=6)line(c,2,i,23,i,'#697a4750',2);break;
 case 'hay':ellipse(c,12,15,9,7,'#bba45d');line(c,4,12,20,12,'#e0cc83');line(c,8,9,8,20,'#8f8750');break;
 case 'rail':line(c,6,0,6,24,'#63584d',2);line(c,19,0,19,24,'#63584d',2);for(let i=3;i<24;i+=6)line(c,3,i,22,i,'#88725a',2);break;
 case 'rust':c.fillStyle='#865c45';c.fillRect(5,5,14,17);line(c,7,8,17,8,'#ba8765',2);line(c,7,18,17,18,'#ba8765',2);break;
 case 'gravel':for(let i=0;i<7;i++)ellipse(c,hash(i,d.x)%22,hash(i,d.y)%22,2,1,'#d3ac84');break;
 }c.restore();}
function buildFloor(world){floor=document.createElement('canvas');floor.width=floor.height=S;const c=floor.getContext('2d'),p=world.theme;c.fillStyle=p.floor[0];c.fillRect(0,0,S,S);
 for(let y=0;y<26;y++)for(let x=0;x<26;x++){const n=hash(x,y),px=x*T,py=y*T;c.globalAlpha=.08+(n%7)/60;c.fillStyle=n%2?p.floor[1]:p.floor[2];c.fillRect(px,py,T,T);c.globalAlpha=1;
  for(let i=0;i<3;i++){c.fillStyle=p.floor[i%2+1]+'65';c.fillRect(px+(n+i*11)%23,py+(n+i*7)%23,i===0?2:1,1)}
  if(p.id==='desert'){c.strokeStyle='#e2c79c28';c.beginPath();c.moveTo(px,py+12);c.quadraticCurveTo(px+9,py+8,px+24,py+12);c.stroke()}
  if(p.id==='red'&&n%4===0){line(c,px+4,py+3,px+10,py+11,'#865c4a65');line(c,px+10,py+11,px+18,py+8,'#865c4a65')}
  if(p.id==='city'&&(x===1||x===24||y===2||y===22)){c.fillStyle='#aab29c';c.globalAlpha=.2;c.fillRect(px,py,T,T);c.globalAlpha=1;line(c,px,py,px+24,py,'#505e5355')}
  const t=world.terrain[y][x];if(t==='mud'){ellipse(c,px+11,py+12,12,9,p.id==='farm'?'#6c7150':'#805a49');line(c,px+4,py+12,px+16,py+11,'#beb08b65',2)}if(t==='snow'){ellipse(c,px+12,py+14,13,10,'#e9eee3');ellipse(c,px+9,py+9,9,5,'#f4f5ea')}
 }
 for(const d of world.decor)if(!['pine','lamp'].includes(d.type))decoration(c,d,p);cachedWorld=world;
}
function block(c,g,x,y){const v=g.map[y][x],p=g.world.theme,px=x*T,py=y*T,variant=(x*7+y*3)%2,solid=v===2,colors=solid?p.solid:p.brick,top=py-6,same=(xx,yy)=>g.map[yy]?.[xx]===v;
 c.fillStyle='#1c2d2538';if(!same(x,y+1))c.fillRect(px+3,py+19,24,9);if(!same(x+1,y))c.fillRect(px+23,py-1,4,25);
 c.fillStyle=colors[0];c.fillRect(px,top,24,24);if(!same(x,y+1)){c.fillStyle=colors[1];c.fillRect(px,top+24,24,6)}if(!same(x,y-1)){c.fillStyle='#fff0ce55';c.fillRect(px,top,24,2)}
 const id=p.id;
 if(!solid&&((id==='farm'&&variant===0)||(id==='snow'&&variant===1)||(id==='desert'&&variant===1)||(id==='red'&&variant===1)||(id==='city'&&variant===1))){c.fillStyle=colors[1];for(let q=5;q<24;q+=6)c.fillRect(px+q,top+2,1,20);line(c,px+2,top+3,px+21,top+20,colors[1],2);line(c,px+21,top+3,px+2,top+20,colors[1],2)}
 else if(!solid&&(id==='farm'||id==='snow')){c.fillStyle=colors[1];for(let k=2;k<23;k+=7)c.fillRect(px+k,top+2,3,22);c.fillStyle=colors[0];c.fillRect(px,top+7,24,4);c.fillRect(px,top+17,24,3)}else if(!solid){c.fillStyle=colors[1];c.fillRect(px,top+11,24,1.5);c.fillRect(px+11,top,1.5,11);c.fillRect(px+5,top+13,1.5,11);c.fillRect(px+17,top+13,1.5,11)}
 else if(id==='desert'||id==='red'||id==='snow'&&variant===1){poly(c,[[px+2,top+15],[px+5,top+3],[px+17,top+2],[px+23,top+17],[px+13,top+23]],variant?p.solid[0]:p.floor[1]);line(c,px+5,top+10,px+19,top+8,p.solid[1]);line(c,px+6,top+16,px+22,top+13,p.solid[1]);}
 else if(id==='city'&&variant===0){c.fillStyle='#aeb9ac';c.fillRect(px+1,top+4,22,16);line(c,px+1,top+12,px+23,top+12,'#7d8b80',2);line(c,px+8,top+5,px+8,top+19,'#d4d9ca',2)}else if(id==='farm'&&variant){c.fillStyle='#5b6d50';c.fillRect(px+3,top+5,18,14);c.fillStyle='#394c3c';c.fillRect(px+1,top+16,6,7);c.fillRect(px+17,top+16,6,7);c.fillStyle='#a9b48b';c.fillRect(px+6,top+3,11,8)}
 else{c.strokeStyle=p.solid[1];c.lineWidth=1;c.strokeRect(px+3,top+3,18,18);for(const [a,b]of [[3,3],[19,3],[3,19],[19,19]]){c.fillStyle='#e7e9d2';c.fillRect(px+a,top+b,2,2)}}
 if(id==='snow'){c.fillStyle='#e9eee4';c.fillRect(px,top,24,4);ellipse(c,px+9,top+3,9,3,'#f8f7ed')}
 if(v===1&&g.wallHp[y][x]<2){line(c,px+9,top+2,px+13,top+10,'#463c31',2);line(c,px+13,top+10,px+8,top+16,'#463c31',2);line(c,px+8,top+16,px+14,top+23,'#463c31',2)}
}
function tank(c,t,g){const time=g.time,hidden=t.enemy&&g.terrainAt(t)==='wheat'&&time>(t.revealedUntil||0);c.save();if(hidden)c.globalAlpha=.38;ellipse(c,t.x+15,t.y+17,15,9,'#152a235c');c.translate(t.x+10,t.y+6);c.rotate(t.dir*Math.PI/2);const def=t.enemy?window.TankCore.enemies[t.type]:null,color=def?.color||'#acbe6d',light=t.enemy?'#f1cead':'#e1e9a9',wide=t.type==='heavy'?14:t.type==='scout'?9:12;
 c.fillStyle='#20372e';c.fillRect(-wide,-10,6,24);c.fillRect(wide-6,-10,6,24);c.fillStyle='#789184';for(let y=-9;y<14;y+=4){const q=Math.floor(time*12)%2;c.fillRect(-wide+1,y+q,4,2);c.fillRect(wide-5,y+q,4,2)}c.fillStyle='#4c5a3c';c.fillRect(-7,-6,14,20);c.fillStyle=color;c.fillRect(-8,-10,16,20);c.fillStyle=light;c.fillRect(-7,-10,14,2);c.fillStyle='#364e3b';c.fillRect(-5,5,10,3);
 if(t.type==='heavy'){c.fillStyle=color;c.fillRect(-10,-8,20,16);c.strokeStyle='#e0ddd280';c.strokeRect(-7,-5,14,10)}else if(t.type==='scout'){poly(c,[[-6,6],[-5,-9],[5,-9],[6,6]],light)}else if(t.type==='siege'){c.fillStyle='#786e45';c.fillRect(-9,-6,18,13);line(c,-7,-4,6,5,'#ddc991',2)}
 const length=t.type==='sniper'?27:t.type==='scout'?16:21,offsets=t.type==='burst'?[-4,4]:[0];for(const offset of offsets){c.fillStyle='#213a2e';c.fillRect(offset-2,-length,5,length-3);c.fillStyle=light;c.fillRect(offset-2,-length,3,length-5);c.fillStyle='#294434';c.fillRect(offset-3,-length+1,6,3)}c.fillStyle=light;c.fillRect(-5,-7,10,8);c.fillStyle=color;c.fillRect(-3,-5,6,6);c.fillStyle='#f4efd0';c.fillRect(-1,-4,2,3);c.restore();
 if(time<t.flashUntil){c.fillStyle='#fff5cba0';c.fillRect(t.x,t.y-4,20,20)}
 if(t.hp<t.maxHp){c.fillStyle='#293e35';c.fillRect(t.x-1,t.y-12,22,3);c.fillStyle=t.enemy?'#e3a17c':'#b9e3a2';c.fillRect(t.x-1,t.y-12,22*Math.max(0,t.hp/t.maxHp),3)}
 if(time<t.shieldUntil||!t.enemy&&g.passives.some(s=>s.id==='reactive'&&s.charge)){c.strokeStyle='#d2edb5';c.lineWidth=1.5;c.beginPath();c.ellipse(t.x+10,t.y+7,18,18,0,0,Math.PI*2);c.stroke()}
 if(t.enemy&&time<t.stunUntil){c.fillStyle='#b1e9e5';c.font='bold 17px system-ui';c.fillText('ϟ',t.x+6,t.y-13)}
 if(t.aimUntil>time){const [dx,dy]=window.TankCore.D[t.dir];c.setLineDash([4,5]);line(c,t.x+10,t.y+10,t.x+10+dx*180,t.y+10+dy*180,'#ffa58eaa',1.5);c.setLineDash([])}
}
function wheat(c,g,y){for(let x=0;x<26;x++)if(g.world.terrain[y][x]==='wheat'){const px=x*T,py=y*T;const near=Math.hypot(g.player.x-px,g.player.y-py)<48;c.save();c.globalAlpha=near?.3:.65;for(let xx=4;xx<24;xx+=7){const sway=reduced()?0:Math.sin(g.time*1.7+x)*2;line(c,px+xx,py+22,px+xx+sway,py+5,'#c4bc6c',1.5);line(c,px+xx+sway,py+6,px+xx+3+sway,py+3,'#e2d88b',2)}c.restore()}}
function draw(c,g){if(cachedWorld!==g.world)buildFloor(g.world);c.drawImage(floor,0,0);const time=g.time,p=g.world.theme;
 for(let y=0;y<26;y++)for(let x=0;x<26;x++)if(g.map[y][x]===3){const px=x*T,py=y*T;c.fillStyle=p.water;c.fillRect(px,py,24,24);if(g.map[y-1]?.[x]!==3){c.fillStyle='#253e3e70';c.fillRect(px,py,24,3)}const wave=reduced()?0:Math.sin(time*2+x+y)*2;line(c,px+3,py+9+wave,px+18,py+9+wave,'#dbedea60');line(c,px+7,py+18-wave,px+22,py+18-wave,'#dbedea30')}
 for(const chest of g.chests){const x=chest.x,y=chest.y,bob=reduced()?0:Math.sin(time*3)*2;if(chest.until-time<5&&Math.floor(time*6)%2)continue;ellipse(c,x+11,y+20,18,9,chest.kind==='growth'?'#ffdf7040':'#63d8d040');c.fillStyle=chest.kind==='growth'?'#7f6537':'#326761';c.fillRect(x+1,y+6+bob,20,17);c.fillStyle=chest.kind==='growth'?'#ecd189':'#8bd3c7';c.fillRect(x,y+2+bob,20,16);c.fillStyle='#fff0c0';c.fillRect(x+2,y+3+bob,16,2);c.fillStyle=chest.kind==='growth'?'#71572d':'#30574d';c.font='bold 14px system-ui';c.textAlign='center';c.fillText(chest.kind==='growth'?'⚙':'ϟ',x+10,y+16+bob);c.textAlign='left'}
 for(const mine of g.mines){ellipse(c,mine.x,mine.y,9,5,'#304a3c');ellipse(c,mine.x,mine.y-2,6,4,'#b8c186');ellipse(c,mine.x,mine.y-3,2,2,'#de9671')}
 const actors=[g.player,...g.enemies].sort((a,b)=>a.y-b.y);let index=0;for(let y=0;y<26;y++){while(index<actors.length&&actors[index].y+20<(y+1)*T)tank(c,actors[index++],g);for(let x=0;x<26;x++)if(g.map[y][x]===1||g.map[y][x]===2)block(c,g,x,y);for(const d of g.world.decor)if(d.y===y&&['pine','lamp'].includes(d.type))decoration(c,d,p,Math.hypot(g.player.x-d.x*T,g.player.y-d.y*T)<48?.35:1);wheat(c,g,y)}while(index<actors.length)tank(c,actors[index++],g);
 const base=p.id==='city'?'#b0c3ba':p.id==='snow'?'#d9ded0':p.id==='red'?'#cba179':'#d2c17c';c.fillStyle='#263c2e70';c.fillRect(291,585,46,38);c.fillStyle='#6a7653';c.fillRect(290,580,44,38);c.fillStyle=base;c.fillRect(290,575,44,38);poly(c,[[298,583],[312,591],[326,583],[323,600],[312,608],[301,600]],'#43583c');c.fillStyle='#eee6c0';c.fillRect(309,591,6,9);c.fillStyle='#273e32';c.fillRect(290,619,44,3);c.fillStyle='#c3e3a4';c.fillRect(290,619,44*g.baseHp/6,3);if(time<(g.baseShieldUntil||0)){c.strokeStyle='#9cddd3';c.lineWidth=3;c.strokeRect(284,570,56,53)}
 for(const b of g.bullets){line(c,b.x-b.dx*8,b.y-b.dy*8,b.x,b.y,b.enemy?'#e99b75':'#fff0ab',3);ellipse(c,b.x,b.y,2,2,b.enemy?'#ffd6b4':'#ffffdc')}
 for(const e of g.effects){const progress=1-(e.until-time)/(e.kind==='emp'?.6:.35);c.save();c.globalAlpha=1-progress;if(e.kind==='emp'){c.strokeStyle='#ade9dd';c.lineWidth=3;c.beginPath();c.arc(e.x,e.y,120*progress,0,Math.PI*2);c.stroke()}else{for(let i=0;i<8;i++){const a=i*Math.PI/4,r=progress*(e.kind==='blast'?30:16);c.fillStyle=i%2?'#f3d38e':'#dd9671';c.fillRect(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,4,4)}}c.restore()}
 if(!reduced()&&(p.id==='snow'||p.id==='desert')){c.fillStyle=p.id==='snow'?'#ffffff85':'#e5d1a630';for(let i=0;i<20;i++){const x=(i*73+time*(p.id==='snow'?8:24))%624,y=(i*131+time*17)%624;c.fillRect(x,y,p.id==='snow'?2:6,2)}}
 for(const n of g.notifications.slice(-1)){const left=Math.max(0,n.until-time),alpha=Math.min(1,left);c.save();c.globalAlpha=alpha;c.textAlign='center';c.font='bold 12px system-ui';c.lineWidth=3;c.strokeStyle='#263c2e';const text=n.text.split(' · ')[0];const x=Math.max(85,Math.min(539,g.player.x+10)),y=g.player.y-16-(3-left)*8;c.strokeText(text,x,y);c.fillStyle='#fff0bc';c.fillText(text,x,y);c.restore()}if(g.transition>0){c.fillStyle='#172d22e8';c.fillRect(60,266,504,82);c.fillStyle='#e5d29b';c.textAlign='center';c.font='bold 24px system-ui';c.fillText('区域肃清 · 下一处战场',312,315);c.textAlign='left'}
}
return{draw};
})();
