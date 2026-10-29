(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChatImages=api;})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
const types=new Set(['image/png','image/jpeg','image/webp','image/gif']);
function droppedImage(files){if(files.length!==1)throw Error('一次请拖入一张图片');const file=files[0];if(!types.has(file.type))throw Error('请拖入 PNG、JPEG、WebP 或 GIF 图片');if(file.size>20*1024*1024)throw Error('图片不能超过 20 MB');return file;}
function bindDrop({area,document,window,enabled,busy,choose,error}){
 let depth=0;
 const files=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
 const clear=()=>{depth=0;area.classList.remove('image-drag-over');};
 area.addEventListener('dragenter',e=>{if(!files(e))return;e.preventDefault();if(enabled()&&!busy()){depth++;area.classList.add('image-drag-over');}});
 area.addEventListener('dragover',e=>{if(!files(e))return;e.preventDefault();e.dataTransfer.dropEffect=enabled()&&!busy()?'copy':'none';});
 area.addEventListener('dragleave',e=>{if(!files(e))return;depth=Math.max(0,depth-1);if(!depth)clear();});
 area.addEventListener('drop',e=>{if(!files(e))return;e.preventDefault();clear();if(!enabled()){error('聊天室暂时不可用');return;}if(busy()){error('消息正在发送，请稍后再拖入图片');return;}try{choose(droppedImage(Array.from(e.dataTransfer.files||[])));}catch(ex){error(ex.message);}});
 // Prevent the browser navigating to a file dropped outside the chat card.
 document.addEventListener('dragover',e=>{if(files(e))e.preventDefault();});
 document.addEventListener('drop',e=>{if(!files(e))return;e.preventDefault();clear();if(!area.contains(e.target))error('请将图片拖入聊天窗口');});
 window.addEventListener('dragend',clear);window.addEventListener('blur',clear);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 return {clear};
}
return {types,droppedImage,bindDrop};
});
