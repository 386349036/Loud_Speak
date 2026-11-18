/* 关卡数据：三关线性战役。自由模式不加载这里。 */
export const LEVELS = [
  {
    id: 'first_drop',
    index: 1,
    name: '着陆',
    en: 'FIRST DROP',
    brief: '在星港外围建立前哨，撑过虫群的第一轮试探。',
    outro: '前哨站站稳了。虫群正在向东集结。',
    start: { minerals: 350 },
    waves: 5,
    hive: false,
    nests: false,
    objective: 'surviveWaves',
    objectiveText: '守住 5 波并建成 3 座兵营',
    surviveWaves: 5,
    barracks: 3
  },
  {
    id: 'cut_link',
    index: 2,
    name: '断链',
    en: 'CUT THE LINK',
    brief: '虫群用三座子巢维持主巢护盾。拔掉它们，打开通往母巢的路。',
    outro: '三座子巢被拔除，主巢的护盾熄灭了。',
    start: { minerals: 450 },
    waves: 7,
    hive: 'shielded',
    nests: true,
    objective: 'nests',
    objectiveText: '摧毁 3 座虫族子巢',
    nestsNeeded: 3
  },
  {
    id: 'the_hive',
    index: 3,
    name: '母巢',
    en: 'THE HIVE',
    brief: '护盾已破。集中全部兵力，摧毁虫巢主基地。',
    outro: '虫巢核心崩溃，虫群失去中枢。',
    start: { minerals: 550 },
    waves: 10,
    hive: 'active',
    nests: true,
    objective: 'hive',
    objectiveText: '摧毁虫巢主基地'
  }
];

export function getLevel(id){
  return LEVELS.find(l => l.id === id) || null;
}

export function nextLevel(id){
  const i = LEVELS.findIndex(l => l.id === id);
  return i >= 0 ? LEVELS[i + 1] || null : null;
}
