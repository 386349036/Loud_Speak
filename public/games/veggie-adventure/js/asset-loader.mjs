// Load shared sprites plus the current scene; distant worlds never block Start.
export function assetsForLevel(assets,level){
 const world=String(level.world||1).padStart(2,'0'),terrain=level.terrain||'W01-kit';
 const backgrounds=new Set([level.background||'W01-far',...(level.mid===null?[]:[level.mid||'W01-mid'])]);
 return assets.filter(a=>{
  if(backgrounds.has(a.id))return true;
  if(/^anim-B\d+/.test(a.id))return a.id==='anim-'+level.boss?.id;
  if(['forest-far','forest-mid'].includes(a.id))return false;
  if(/^W\d\d-/.test(a.id))return level.warpRoom?/^W\d\d-kit-/.test(a.id):a.id.startsWith(terrain+'-')||a.id==='W'+world+'-special-exit';
  return true;
 });
}
export function createAssetLoader({assets,images,revision='',Image:ImageType=Image,concurrency=6}){
 const jobs=new Map(),queue=[];let active=0;
 function pump(){while(active<concurrency&&queue.length){const job=queue.shift();active++;const img=new ImageType();
  function finish(error){active--;jobs.delete(job.asset.id);if(error)job.reject(error);else{images.set(job.asset.id,img);job.resolve();}pump();}
  img.onload=()=>finish();img.onerror=()=>finish(Error('素材加载失败：'+job.asset.path));img.src='assets/'+job.asset.path+(revision?'?v='+encodeURIComponent(revision):'');
 }}
 function load(asset){if(images.has(asset.id))return Promise.resolve();if(jobs.has(asset.id))return jobs.get(asset.id);
  const promise=new Promise((resolve,reject)=>queue.push({asset,resolve,reject}));jobs.set(asset.id,promise);pump();return promise;
 }
 return {ensure(level,onProgress=()=>{}){const missing=assetsForLevel(assets,level).filter(a=>!images.has(a.id));if(!missing.length)return null;let loaded=0;onProgress(0,missing.length);return Promise.allSettled(missing.map(a=>load(a).then(()=>onProgress(++loaded,missing.length)))).then(results=>{const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;});}};
}
