// Keep world units and physics fixed; widen the camera instead of stretching sprites.
export function viewportSize(width,height){
 const aspect=Math.max(.1,Number(width)||256)/Math.max(1,Number(height)||240);
 return {width:Math.max(64,Math.round(240*aspect)),height:240,scale:3};
}
export function bindViewport(canvas,host,{window:win=window,document:doc=document,button,surface=canvas,forceTouch=false,onResize=()=>{}}={}){
 const touchMedia=win.matchMedia?.('(pointer:coarse), (hover:none)');
 function resize(){
  host.classList?.toggle('touch-layout',forceTouch||!!touchMedia?.matches);
  const box=(surface.getBoundingClientRect?surface:host).getBoundingClientRect(),v=viewportSize(box.width,box.height);
  if(canvas.width!==v.width*v.scale||canvas.height!==v.height*v.scale){canvas.width=v.width*v.scale;canvas.height=v.height*v.scale;onResize();}
 }
 function state(){if(button)button.textContent=doc.fullscreenElement?'退出全屏':'全屏';resize();}
 async function fullscreen(){
  try{if(doc.fullscreenElement)await doc.exitFullscreen?.();else if(host.requestFullscreen){await host.requestFullscreen();try{await win.screen?.orientation?.lock?.('landscape');}catch{}}}catch{}
  state();
 }
 touchMedia?.addEventListener?.('change',resize);
 const observer=win.ResizeObserver?new win.ResizeObserver(resize):null;observer?.observe(surface);
 win.addEventListener('resize',resize);win.visualViewport?.addEventListener('resize',resize);doc.addEventListener('fullscreenchange',state);
 if(button){button.hidden=!host.requestFullscreen;button.onclick=fullscreen;}
 resize();return {resize,fullscreen};
}
