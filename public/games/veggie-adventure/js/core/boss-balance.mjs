export const BOSS_BALANCE_VERSION=1;
export const BOSS_HEALTH=[6,7,8,8,9,10,10,12];
// Cooldowns start on release, independently of the overall attack rhythm.
export const BOSS_SKILLS={
 1:{slam:{name:'落地震波',cooldown:6.5},hop:{name:'锁定跳扑',cooldown:7},seeds:{name:'瞄准抛射',cooldown:5.5},dash:{name:'地面冲撞',cooldown:5}},
 2:{'rock-roll':{name:'落石滚撞',cooldown:6.5},charge:{name:'快速冲撞',cooldown:5}},
 3:{'seed-dash':{name:'三连籽弹',cooldown:6},dash:{name:'突进冲撞',cooldown:5}},
 4:{'fan-leap':{name:'扇射跃岸',cooldown:6},'double-fan':{name:'双轮扇射',cooldown:7}},
 5:{'rock-roll':{name:'落刺滚撞',cooldown:6.5},'thorn-roll':{name:'散刺冲撞',cooldown:6}},
 6:{crossfire:{name:'高低交叉弹',cooldown:6},burst:{name:'连环爆裂种子',cooldown:7}},
 7:{'left-sweep':{name:'左头横扫',cooldown:6},'right-sweep':{name:'右头横扫',cooldown:6}},
 8:{slam:{name:'跳震波',cooldown:5.5},volley:{name:'扇形籽弹',cooldown:6}}
};
export const bossMaxHp=b=>BOSS_HEALTH[b.kind-1]||6;
export const bossEnraged=b=>b.hp<=Math.ceil((b.maxHp||bossMaxHp(b))/3);
export function prepareBoss(b){
 if(!b)return;
 if(b.balanceVersion!==BOSS_BALANCE_VERSION){
  // Legacy checkpoints had three HP. Preserve damage already dealt and deaths.
  const oldMax=b.maxHp||3,damage=Math.max(0,oldMax-b.hp);
  b.maxHp=bossMaxHp(b);b.hp=b.dead||b.hp<=0?0:Math.max(1,b.maxHp-damage);b.balanceVersion=BOSS_BALANCE_VERSION;
 }
 b.skillCooldowns??={};
}
export function bossTiming(b){const rage=bossEnraged(b);return {
 idle:b.kind===1?(rage?.45:.6):(rage?.45:.65),
 windup:b.kind===1?(rage?.85:1):(rage?.55:.65),
 recover:rage?.45:.55,
 expose:b.kind===1?(rage?2.4:2.6):b.kind===4?2:1.6
};}
export const bossWeakDuration=b=>b.exposeTime||bossTiming(b).expose;
export const bossVulnerable=b=>!!b&&b.active&&!b.dead&&b.phase==='expose'&&b.timer>=0&&b.timer<bossWeakDuration(b);
export function tickBossCooldowns(b,dt){for(const key of Object.keys(b.skillCooldowns))b.skillCooldowns[key]=Math.max(0,b.skillCooldowns[key]-dt);}
export function readyBossSkill(b,preferred){
 const skills=BOSS_SKILLS[b.kind],ready=key=>skills?.[key]&&(b.skillCooldowns?.[key]||0)<=1e-7;
 if(ready(preferred))return preferred;
 return Object.keys(skills||{}).find(key=>key!==b.lastSkill&&ready(key))||Object.keys(skills||{}).find(ready)||null;
}
export function releaseBossSkill(b){
 const skill=BOSS_SKILLS[b.kind]?.[b.pattern];if(!skill||(b.skillCooldowns[b.pattern]||0)>1e-7)return false;
 b.skillCooldowns[b.pattern]=skill.cooldown;b.lastSkill=b.pattern;b.secondaryReleased=false;return true;
}
export const bossSkillName=b=>BOSS_SKILLS[b.kind]?.[b.pattern]?.name||'准备攻击';
