import {SoundDirector} from '../js/sound-effects.mjs';
const sound=new SoundDirector({base:'../assets/audio/sfx/',persistPreferences:false}),status=document.getElementById('status');let context;
const names={jump:'跳跃',swim:'水下划动','brick-break':'撞破砖块','reward-spawn':'奖励出现','pickup-seed':'拾取积分','pickup-upgrade':'拾取升级','pickup-star':'拾取星星','life-up':'重生 +1','stomp-normal':'普通敌兵踩踏','stomp-flight':'飞行敌兵踩踏','stomp-shell':'壳兵踩踏','stomp-boss':'首领弱点踩踏','stomp-water':'水生敌兵踩踏','shell-bounce':'缩壳安全弹起','boss-armor':'首领护甲阻挡','boss-hit':'火弹击中首领',fire:'发射火弹',hurt:'主角受伤','shell-dash':'壳兵冲刺','spine-volley':'三向尖刺','plant-spit':'食人花吐弹',warp:'进入隐藏关卡'};
if(await sound.loadManifest()){
 status.textContent='共22种，点击任意按钮开始试听。';
 for(const [id,s] of Object.entries(sound.sounds)){
  const button=document.createElement('button'),label=document.createElement('span'),detail=document.createElement('small');label.textContent=names[id]||id;detail.textContent=s.duration.toFixed(2)+'秒 · '+id;button.append(label,detail);
  button.onclick=async()=>{try{context??=new (globalThis.AudioContext||globalThis.webkitAudioContext)();await context.resume();await sound.unlock(context);sound.setPaused(false);sound.stop();sound.play(id);status.textContent='试听：'+names[id];}catch{status.textContent='当前浏览器暂时无法播放音效。';}};document.getElementById('sounds').append(button);
 }
}else status.textContent='音效清单读取失败。请通过本地HTTP服务打开。';
window.addEventListener('blur',()=>sound.setHidden(true));window.addEventListener('focus',()=>sound.setHidden(false));window.addEventListener('pagehide',()=>{sound.dispose();context?.close();});
