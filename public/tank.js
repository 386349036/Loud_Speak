(()=>{
'use strict';
const $=id=>document.getElementById(id),canvas=$('field'),ctx=canvas.getContext('2d'),keys=new Set(),game=new window.TankCore.Game();let previous=0,uiAt=-1,previousState='ready';
const touch=window.TankTouch.bind({stick:$('tank-joystick'),knob:document.querySelector('.stick-knob'),fire:$('mobile-fire'),skill:$('mobile-skill'),enabled:()=>game.state==='playing',onSkill:()=>{game.useSkill();drawUI(true)}});
function clearInput(){keys.clear();touch.reset();}
const options=()=>({themeStart:Number($('theme-select').value)||0,layoutStart:Number($('stage-select').value)||0});
function preview(){if(game.state==='playing'||game.state==='paused')return;game.options=options();game.level=1;game.stage();game.state='ready';drawUI(true)}
function begin(){game.start(options());clearInput();$('overlay').hidden=true;$('pause').textContent='暂停';$('theme-select').disabled=$('stage-select').disabled=true;canvas.focus();drawUI(true)}
function pause(){game.pause();clearInput();drawUI(true);if(game.state==='playing')canvas.focus()}
$('start').onclick=()=>game.state==='paused'?pause():begin();$('pause').onclick=()=>{if(['playing','paused'].includes(game.state))pause()};$('theme-select').onchange=$('stage-select').onchange=preview;
function drawUI(force=false){if(!force&&uiAt>=0&&game.time-uiAt<.1&&game.state===previousState)return;uiAt=game.time;previousState=game.state;
 $('level').textContent=String(game.level).padStart(2,'0');$('score').textContent=String(game.score).padStart(4,'0');$('lives').textContent=game.lives;$('enemies').textContent=game.quota-game.killed;$('stage-name').textContent=game.world.theme.name+' · '+game.world.name;
 $('armor').textContent=Math.max(0,Math.ceil(game.player.hp))+'/'+game.player.maxHp;$('armor').parentElement.classList.toggle('danger',game.player.hp<=game.player.maxHp*.25);$('base-hp').textContent=game.baseHp+'/6';$('growth').textContent=`引擎 ${game.growth.speed}/5 · 火力 ${game.growth.power}/4 · 护甲 ${game.growth.armor}/4`;
 $('terrain-state').textContent=({snow:'深雪 · 移速 −15%',mud:'泥地 · 移速 −20%',wheat:'麦田 · 隐蔽区'})[game.terrainAt(game.player)]||'普通地面';$('chest-clock').textContent=game.state==='playing'?'补给 '+Math.max(1,Math.ceil(game.chestInterval-game.chestTimer))+'s':'首箱15秒 · 随后每10秒';
 $('passive-slots').replaceChildren();for(let i=0;i<2;i++){const entry=game.passives[i],el=document.createElement('span');el.className='skill-slot';if(entry){const def=window.TankCore.skills[entry.id];el.textContent=def.icon+' '+def.name+' '+Math.ceil(entry.until-game.time)+'s';el.title=def.desc}else{el.classList.add('empty');el.textContent='被动槽 '+(i+1)}$('passive-slots').append(el)}
 const active=game.active,def=active?window.TankCore.skills[active.id]:null,cooldown=active?Math.max(0,(game.cooldowns[active.id]||0)-game.time):0;$('active-skill').textContent=def?def.icon+' '+def.name+' '+Math.ceil(active.until-game.time)+'s · '+(cooldown>0?Math.ceil(cooldown)+'s 冷却':'E 释放'):'E · 尚无主动技能';$('active-skill').title=def?def.desc+' · 装备剩余 '+Math.ceil(active.until-game.time)+' 秒':'拾取青蓝色技能箱获取';$('active-skill').disabled=!active||game.state!=='playing'||cooldown>0;$('mobile-skill').textContent=def?def.icon+' '+def.name:'E 技能';$('mobile-skill').disabled=$('active-skill').disabled;
 $('notice').textContent=game.notifications.map(n=>n.text).join(' · ');
 if(game.state==='playing'){$('overlay').hidden=true;$('pause').textContent='暂停'}else if(game.state==='paused'){$('overlay').hidden=false;$('heading').textContent='稍作停留';$('description').textContent='宝箱、技能时长和战场均已暂停。';$('start').textContent='继续游戏 →';$('pause').textContent='继续'}else if(game.state==='over'){$('overlay').hidden=false;$('heading').textContent='防线暂告一段落';$('description').textContent=game.reason+' · 得分 '+game.score+' · 抵达第 '+game.level+' 关';$('start').textContent='再战一次 →';$('theme-select').disabled=$('stage-select').disabled=false}
}
function use(){game.useSkill();drawUI(true);canvas.focus()}
$('active-skill').onclick=use;
// Keyboard and assistive activation still work without duplicating pointer skill use.
$('mobile-skill').addEventListener('click',e=>{if(e.detail===0)use()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.parent!==window){window.parent.postMessage('loud-tank-close',location.origin);return}if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;const k=e.key.length===1?e.key.toLowerCase():e.key;if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft','w','a','s','d',' ','e'].includes(k)){e.preventDefault();if(game.state==='playing')keys.add(k)}if(k==='p'&&!e.repeat&&['playing','paused'].includes(game.state))pause()});document.addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
const blur=()=>{clearInput();if(game.state==='playing')pause()};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',()=>{if(document.hidden)blur()});window.addEventListener('resize',()=>touch.reset());
$('guide').addEventListener('toggle',()=>{if($('guide').open&&game.state==='playing')pause()});
function frame(now){const dt=Math.max(0,(now-previous)/1000);previous=now;let dir=touch.direction();if(dir<0)for(const [i,arrow,letter]of [[0,'ArrowUp','w'],[1,'ArrowRight','d'],[2,'ArrowDown','s'],[3,'ArrowLeft','a']])if(keys.has(arrow)||keys.has(letter)){dir=i;break}const livesBefore=game.lives;game.advance(dt,{dir,fire:keys.has(' ')||touch.fire(),skill:keys.has('e')});if(game.lives!==livesBefore)clearInput();if(game.state==='over')clearInput();window.TankArt.draw(ctx,game);drawUI();requestAnimationFrame(frame)}
preview();requestAnimationFrame(frame);
})();
