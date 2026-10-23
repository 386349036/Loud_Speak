// Fetch only runtime files from a fixed public revision. Never execute upstream tooling/hooks.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const COMMIT='2e23b67d6da06c10195718c0e69a763bca880c1d';
const root=path.resolve(__dirname,'../..'),cache=path.join(root,'.tmp-smallscope-tree.json');
const destination=path.join(root,'.tmp-smallscope-source/SmallScope-main');
const blobHash=data=>crypto.createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
async function main(){
  let tree;
  if(fs.existsSync(cache))tree=JSON.parse(fs.readFileSync(cache,'utf8'));
  else{const r=await fetch(`https://api.github.com/repos/Aptyll/SmallScope/git/trees/${COMMIT}?recursive=1`,{signal:AbortSignal.timeout(40000)});if(!r.ok)throw Error('Git tree HTTP '+r.status);tree=await r.json();fs.writeFileSync(cache,JSON.stringify(tree))}
  if(tree.sha!==COMMIT||tree.truncated)throw Error('Unexpected or incomplete upstream tree');
  const files=tree.tree.filter(f=>f.type==='blob'&&(f.path.startsWith('js/')||f.path.startsWith('audio/')||f.path.startsWith('bots/')||['index.html','favicon.ico','LICENSE','README.md'].includes(f.path)));
  let cursor=0,done=0;
  async function worker(){while(cursor<files.length){
    const f=files[cursor++],out=path.resolve(destination,f.path);
    if(!out.startsWith(destination+path.sep))throw Error('Invalid source path');
    if(fs.existsSync(out)&&blobHash(fs.readFileSync(out))===f.sha){done++;continue}
    let error;
    for(let attempt=0;attempt<3;attempt++){
      try{const response=await fetch(`https://raw.githubusercontent.com/Aptyll/SmallScope/${COMMIT}/${f.path}`,{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error(`HTTP ${response.status}`);const data=Buffer.from(await response.arrayBuffer());if(blobHash(data)!==f.sha)throw Error('Blob hash mismatch');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,data);error=null;break}
      catch(e){error=e;await new Promise(r=>setTimeout(r,1000*(attempt+1)))}
    }
    if(error)throw Error(f.path+': '+error.message);
    done++;if(done%25===0)console.log(`Downloaded ${done}/${files.length}`);
  }}
  await Promise.all(Array.from({length:6},worker));console.log(`Source ${COMMIT}: ${done} files verified`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
