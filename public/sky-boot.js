import('/sky.js').catch(e=>{const box=document.getElementById('error');box.hidden=false;if(!box.textContent)box.textContent='游戏未能启动，请刷新页面后重试。\n'+e.message});
