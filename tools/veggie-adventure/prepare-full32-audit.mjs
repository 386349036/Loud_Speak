import fs from 'node:fs';
import {LEVELS} from '../../public/games/veggie-adventure/levels/catalog.mjs';
const root='docs/veggie-adventure/qa/full32-20261027';
fs.mkdirSync(root,{recursive:true});
if(fs.existsSync(root+'/progress.json')){console.log('Audit state already exists; preserved.');process.exit(0);}
const categories=['A','B','C','D','E','F','G','H','I','J','K','L','M','N'];
const progress={schemaVersion:1,task:'32关可视化自主检查与集中修复',timezone:'Asia/Shanghai',startNotBefore:'2026-10-27T06:00:00+08:00',threadId:'01a16beb-02aa-7871-9179-45a47c27b5ea',automationId:null,phase:'scheduled',complete:false,reviewedLevels:0,baseline:null,preFixSummary:null,levels:LEVELS.map(l=>({id:l.id,name:l.name,world:l.world,boss:l.boss?.id||null,status:'pending',visualObserved:false,forms:{base:'pending',grown:'pending',chili:'pending'},desktop:'pending',mobileLandscape:'pending',coverage:[],categories:Object.fromEntries(categories.map(k=>[k,'pending'])),evidence:[],issueIds:[],gaps:[],lastReviewedAt:null})),executionLimits:[],updatedAt:new Date().toISOString()};
fs.writeFileSync(root+'/progress.json',JSON.stringify(progress,null,2)+'\n');
fs.writeFileSync(root+'/issues.json',JSON.stringify({schemaVersion:1,issues:[],note:'尚未开始视觉检查，空列表不代表没有问题。'},null,2)+'\n');
fs.writeFileSync(root+'/coverage-matrix.md','# 32关检查进度\n\n计划：2026-10-27 06:00，北京时间。当前全部待检查，不代表已验收。以progress.json为机器状态源，每关实际检查后同步更新此表。\n\n| 关卡 | 名称 | 桌面/三形态 | 手机横屏 | 关键区间 | 证据 | 问题 |\n| --- | --- | --- | --- | --- | --- | --- |\n'+LEVELS.map(l=>`| ${l.id} | ${l.name} | 待检查 | 待检查 | 未记录 | 无 | 尚未检查 |`).join('\n')+'\n');
console.log(JSON.stringify({prepared:true,levels:progress.levels.length,startNotBefore:progress.startNotBefore,root}));
