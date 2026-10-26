export const MAX_ATTACK_BONUS=3;
export function attackBonus(form,value=0){return form===2&&Number.isInteger(value)&&value>=0&&value<=MAX_ATTACK_BONUS?value:0;}
const attacks=[
 {kind:'fire',name:'基础火弹',w:4,h:4,size:8,damage:1},
 {kind:'small-fire',name:'小火球',w:6,h:6,size:12,damage:2,asset:'player-shot-small'},
 {kind:'large-fire',name:'大火球',w:10,h:10,size:18,damage:3,asset:'player-shot-large'},
 {kind:'lightning',name:'闪电球',w:10,h:10,size:18,damage:4,asset:'player-shot-lightning'}
];
export function playerAttack(p){return attacks[attackBonus(p.form,p.attackBonus)];}
