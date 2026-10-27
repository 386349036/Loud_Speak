import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
export const root='docs/veggie-adventure/qa/full32-20261027';
export const read=name=>JSON.parse(fs.readFileSync(`${root}/${name}.json`,'utf8'));
export const write=(name,data)=>fs.writeFileSync(`${root}/${name}.json`,JSON.stringify(data,null,2)+'\n');
const git=(...args)=>{try{return execFileSync('git',['-c','safe.directory=C:/codex/loud',...args],{encoding:'utf8',maxBuffer:10e6});}catch(e){const file=args[0]==='rev-parse'?'head.txt':args[0]==='status'?'git-status.txt':args[0]==='diff'?'git-diff-stat.txt':null;if(!file)throw e;return fs.readFileSync(root+'/baseline/'+file,'utf8');}};
export function matrix(p){
 const out=['# 32关检查进度','',`阶段：${p.phase}；初查记录 ${p.reviewedLevels}/32；complete=${p.complete}。分段观察与真实连续通关分别记录，pending/not_verified不算通过。`,'','| 关卡 | 名称 | 桌面/三形态 | 手机横屏 | 关键区间 | 证据 | 问题 |','| --- | --- | --- | --- | --- | --- | --- |'];
 for(const l of p.levels)out.push(`| ${l.id} | ${l.name||'芽豆出发'} | ${l.desktop} / ${Object.values(l.forms).join('/')} | ${l.mobileLandscape} | ${l.coverage.map(v=>typeof v==='string'?v:JSON.stringify(v)).join('<br>')||'未记录'} | ${l.evidence.length} | ${l.issueIds.join(', ')||'尚未发现（未覆盖区间除外）'} |`);
 fs.writeFileSync(root+'/coverage-matrix.md',out.join('\n')+'\n');
}
export function checkpoint(p){p.updatedAt=new Date().toISOString();p.reviewedLevels=p.levels.filter(l=>l.status==='initial_reviewed').length;write('progress',p);matrix(p);}
export function baseline(){
 const p=read('progress');if(p.complete||p.baseline)return {preserved:true,complete:p.complete};
 if(Date.now()<Date.parse(p.startNotBefore))throw Error('Not yet scheduled audit time');
 fs.mkdirSync(root+'/baseline',{recursive:true});
 const files=[];const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name).replaceAll('\\','/');if(f.startsWith('docs/veggie-adventure/qa/'))continue;if(e.isDirectory())walk(f);else {const b=fs.readFileSync(f);files.push({path:f,bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')});}}};
 for(const d of ['public/games/veggie-adventure','art-source/veggie-adventure','tests/veggie-adventure','tools/veggie-adventure','docs/veggie-adventure'])walk(d);
 const head=git('rev-parse','HEAD'),status=git('status','--short');
 fs.writeFileSync(root+'/baseline/git-status.txt',status);fs.writeFileSync(root+'/baseline/git-diff-stat.txt',git('diff','--stat'));fs.writeFileSync(root+'/baseline/source-files.json',JSON.stringify(files,null,2)+'\n');
 p.baseline={recordedAt:new Date().toISOString(),head:head.trim(),workspace:'C:/codex/loud',sourceFiles:files.length,totalBytes:files.reduce((a,b)=>a+b.bytes,0),manifestSha256:files.find(f=>f.path==='public/games/veggie-adventure/assets/manifest.json').sha256,url:'http://127.0.0.1:3210/games/veggie-adventure/?qa=1&review=full32-audit',notes:'包含此前全部已有及高路任务改动；完整初查开始后不改玩法和素材。新增full32-review显式形态/定位控件仅用于巡检，普通伤害，无自动移动，无存档写入。'};
 p.phase='initial_visual_inspection';p.startedAt=p.baseline.recordedAt;p.nextLevel='1-1';
 for(const l of p.levels){const def=LEVELS.find(v=>v.id===l.id);l.name=def.name||'芽豆出发';l.world=Number(l.id[0]);}
 p.executionLimits=['浏览器可截图和输入；仅响应式窗口模拟，无法验收手机硬件多点触摸/安全区真实设备。','当前工具无法听音，音频只能记录调度与错误，听觉项目保持not_verified。'];checkpoint(p);return p.baseline;
}
if(process.argv.includes('--baseline'))console.log(JSON.stringify(baseline(),null,2));
