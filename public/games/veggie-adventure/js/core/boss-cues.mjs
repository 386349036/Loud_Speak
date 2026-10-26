// Reuse the established PNG cue vocabulary; concrete instructions match each skill.
const cues={
 slam:['slam','落震：登台或跳过地面波'],hop:['hop','跳扑：离开标记落点'],seeds:['seeds','抛射：离开瞄准位置'],
 dash:['dash','冲撞：跳起或登台避让'],charge:['dash','冲撞：跳起或登台避让'],
 'rock-roll':['seeds','落石滚撞：先移位，再登台'], 'seed-dash':['seeds','籽弹突进：避开弹道再换位'],
 'fan-leap':['hop','跃岸：离开落点，等待露弱点'], 'double-fan':['seeds','双扇射：换位避开两轮弹幕'],
 'thorn-roll':['seeds','散刺滚撞：登台并避开飞刺'],crossfire:['seeds','交叉弹：观察高低弹道换位'],
 burst:['seeds','爆裂：离开标记，等待爆炸'], 'left-sweep':['slam','左头横扫：跳过地面扫击'],
 'right-sweep':['slam','右头横扫：跳过地面扫击'],volley:['seeds','扇射：从弹道间隙换位']
};
export const bossCue=b=>{const [icon,hint]=cues[b.pattern]||['hop','观察预警，准备换位'];return {asset:'boss-cue-'+icon,hint};};
