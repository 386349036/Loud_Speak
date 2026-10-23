/* ==========================================================================
   modifiers.js — Boss词缀系统

   为Boss提供随机词缀，增加游戏多样性和挑战性。
   每个Boss生成时随机获得1个词缀，词缀效果包括属性加成、特殊行为等。
   ========================================================================== */
'use strict';

const BOSS_MODIFIERS = {
  /* ===== 难度1：基础属性增强 ===== */

  frenzied: {
    id: 'frenzied',
    name: '狂暴',
    color: '#ff6a3a',           // 橙红色
    difficulty: 1,
    desc: '移动速度+25%',

    apply(e) {
      e.spd *= 1.25;
      e.modifierName = this.name;
      e.modifierColor = this.color;
      e.modifierDesc = this.desc;
    }
  },

  resilient: {
    id: 'resilient',
    name: '坚韧',
    color: '#4a90d9',           // 蓝色
    difficulty: 1,
    desc: '生命值+30%',

    apply(e) {
      e.maxHp *= 1.3;
      e.hp = e.maxHp;
      e.modifierName = this.name;
      e.modifierColor = this.color;
      e.modifierDesc = this.desc;
    }
  },

  /* ===== 难度2：特殊能力 ===== */

  vengeful: {
    id: 'vengeful',
    name: '复仇',
    color: '#a855f7',           // 紫色
    difficulty: 2,
    desc: '被击中后微量回血',

    apply(e) {
      e.modifierName = this.name;
      e.modifierColor = this.color;
      e.modifierDesc = this.desc;
      e.vengefulHealCd = 0;
    },

    onHit(e, dmg, g) {
      // 被击中后2.5秒冷却，回复2%生命值（最多3点）
      if (!e.vengefulHealCd || e.vengefulHealCd <= 0) {
        e.vengefulHealCd = 2.5;
        const healAmount = Math.min(Math.ceil(e.maxHp * 0.02), 3);
        e.hp = Math.min(e.hp + healAmount, e.maxHp);

        // 紫色光环粒子效果
        if (g.parts && g.parts.ring) {
          g.parts.ring(e.x, e.y, 8, '#a855f7', 150, 3);
        }
      }
      return dmg;
    },

    onAI(e, dt, g) {
      // 冷却时间递减
      if (e.vengefulHealCd && e.vengefulHealCd > 0) {
        e.vengefulHealCd -= dt;
      }
    }
  },

  manic: {
    id: 'manic',
    name: '狂乱',
    color: '#22c55e',           // 绿色
    difficulty: 2,
    desc: '定期额外发射泪弹',

    apply(e) {
      e.modifierName = this.name;
      e.modifierColor = this.color;
      e.modifierDesc = this.desc;
      e.manicTearBurst = 0;
    },

    onAI(e, dt, g) {
      // 每3.5秒额外发射一发瞄准玩家的泪弹
      if (!e.manicTearBurst) e.manicTearBurst = 0;
      e.manicTearBurst += dt;

      if (e.manicTearBurst >= 3.5) {
        e.manicTearBurst = 0;

        const p = g.player;
        if (p && !p.dead) {
          const n = norm(p.x - e.x, p.y - e.y);
          const vx = n.x * 180;
          const vy = n.y * 180;

          // 添加敌人泪弹
          if (g.addEnemyTear) {
            g.addEnemyTear(e.x, e.y, vx, vy, 1, 6);
          }

          // 绿色粒子效果
          if (g.parts && g.parts.burst) {
            g.parts.burst(e.x, e.y, 5, '#22c55e', { spd: 120, size: 3 });
          }
        }
      }
    }
  },

  /* ===== 难度3：视觉干扰 ===== */

  phantom: {
    id: 'phantom',
    name: '幻影',
    color: '#64748b',           // 灰色
    difficulty: 3,
    desc: '透明度周期性变化',

    apply(e) {
      e.modifierName = this.name;
      e.modifierColor = this.color;
      e.modifierDesc = this.desc;
      e.phantomAlpha = 1;
      e.phantomT = 0;
    },

    onAI(e, dt, g) {
      // 透明度周期性变化（55%-90%）
      if (!e.phantomT) e.phantomT = 0;
      e.phantomT += dt;
      e.phantomAlpha = 0.55 + Math.sin(e.phantomT * 1.8) * 0.35;
    }
  }
};


/* ===== 辅助函数 ===== */

/**
 * 获取随机Boss词缀
 * @returns {Object} 词缀定义对象
 */
function getRandomBossModifier() {
  const modifierKeys = Object.keys(BOSS_MODIFIERS);
  const randomKey = modifierKeys[Math.floor(Math.random() * modifierKeys.length)];
  return BOSS_MODIFIERS[randomKey];
}

/**
 * 应用词缀到Boss对象
 * @param {Object} e - Boss敌人对象
 * @param {Object} modifier - 词缀定义
 */
function applyBossModifier(e, modifier) {
  if (!modifier) return;

  e.modifier = modifier.id;
  if (modifier.apply) {
    modifier.apply(e);
  }
}

/**
 * 调用词缀的AI钩子
 * @param {Object} e - Boss敌人对象
 * @param {number} dt - 时间增量
 * @param {Object} g - 游戏对象
 */
function callModifierAIHook(e, dt, g) {
  if (e.modifier && BOSS_MODIFIERS[e.modifier] && BOSS_MODIFIERS[e.modifier].onAI) {
    BOSS_MODIFIERS[e.modifier].onAI(e, dt, g);
  }
}

/**
 * 调用词缀的受击钩子
 * @param {Object} e - Boss敌人对象
 * @param {number} dmg - 伤害值
 * @param {Object} g - 游戏对象
 * @returns {number} 修正后的伤害值
 */
function callModifierHitHook(e, dmg, g) {
  if (e.modifier && BOSS_MODIFIERS[e.modifier] && BOSS_MODIFIERS[e.modifier].onHit) {
    return BOSS_MODIFIERS[e.modifier].onHit(e, dmg, g);
  }
  return dmg;
}


/* ===== 调试接口 ===== */

if (typeof window !== 'undefined') {
  window.BOSS_MODIFIERS = BOSS_MODIFIERS;
  window.getRandomBossModifier = getRandomBossModifier;
}