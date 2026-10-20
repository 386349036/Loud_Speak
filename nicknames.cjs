const {randomInt}=require('crypto');
const adjectives=['帅气','快乐','勇敢','可爱','机灵','悠闲','闪亮','温柔','热情','活泼','淡定','认真','神秘','潇洒','清醒','乐观','优雅','聪明','勤奋','灿烂','自由','好奇','俏皮','稳重','浪漫','幸运','阳光','灵动','憨厚','酷酷','腼腆','自信'];
const nouns=['土豆','番茄','南瓜','黄瓜','胡萝卜','白萝卜','玉米','红薯','白菜','青菜','菠菜','生菜','芹菜','韭菜','茄子','辣椒','青椒','冬瓜','丝瓜','苦瓜','西葫芦','西兰花','花菜','莲藕','山药','芋头','豌豆','毛豆','扁豆','四季豆','西瓜','哈密瓜','香瓜','甜瓜','芒果','草莓','菠萝','苹果','橘子','橙子','柠檬','桃子','葡萄','香蕉','梨子','樱桃','蓝莓','荔枝','龙眼','柚子','石榴','猕猴桃','火龙果','柿子','李子','杏子','杨梅','枇杷','椰子','木瓜'];
module.exports=function nickname(taken=new Set()){
  const available=[];
  for(const adjective of adjectives)for(const noun of nouns){const name=adjective+'的'+noun;if(!taken.has(name))available.push(name)}
  // Sessions are distinct even in the unlikely event that every display name is taken.
  return available.length?available[randomInt(available.length)]:adjectives[randomInt(adjectives.length)]+'的'+nouns[randomInt(nouns.length)];
};
