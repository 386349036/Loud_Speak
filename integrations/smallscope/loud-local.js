// Same-origin LAN relay; query/profile settings cannot redirect players to an external relay.
(()=>{'use strict';
  wsUrl=(_relay,params)=>(location.protocol==='https:'?'wss://':'ws://')+location.host+'/games/smallscope/ws?'+params;
  let inviteOrigin=location.origin;
  if(typeof fetch==='function')fetch('/api/smallscope/network').then(r=>r.ok?r.json():null).then(info=>{if(info?.origin&&['http:','https:'].includes(new URL(info.origin).protocol))inviteOrigin=info.origin}).catch(()=>{});
  if(typeof document!=='undefined'){
    const note=document.querySelector('.loud-local-note');
    const code=document.getElementById('smallscope-room'),invite=document.getElementById('smallscope-copy-invite'),status=document.getElementById('smallscope-status');
    if(note)setInterval(()=>{note.hidden=state.mode!=='title';const room=roomCode();code.textContent=room||'—';invite.disabled=!room;const language=document.getElementById('smallscope-language');if(language){language.disabled=NET.role!=='solo';language.title=language.disabled?'离开房间后可切换语言':'';}status.textContent=NET.role==='solo'?'单机 / AI':NET.transport?.open?(NET.role==='host'?'局域网房主':'已加入局域网房间'):'正在连接本地房间…'},500);
    if(invite)invite.onclick=async()=>{const room=roomCode();if(!room)return;const url=new URL(location.pathname,inviteOrigin);url.search='?seed='+SEED+'&join='+encodeURIComponent(room)+(PRACTICE?'&practice=1':'');const output=document.getElementById('smallscope-invite');output.hidden=false;output.value=url.href;output.select();try{await navigator.clipboard.writeText(url.href);status.textContent='邀请链接已复制'}catch{status.textContent='复制此链接发送给同一局域网的朋友'}};
  }
})();
