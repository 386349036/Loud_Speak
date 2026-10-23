/* ==========================================================================
   pills.js - 临时效果药丸系统
   药丸是房间级临时效果，持续时间以房间数计算
   ========================================================================== */
'use strict';

const PILLS = [
  // ==================== 正面效果 ====================
  {
    id: 'powerPill',
    name: '力量药丸',
    desc: '伤害 +2.5 (当前房间)',
    color: '#ff4444',
    colorAlt: '#ff8866',
    duration: 1,  // 持续1个房间
    positive: true,
    apply(p) {
      p.stats.damage += 2.5;
    },
    remove(p) {
      p.stats.damage -= 2.5;
    }
  },
  {
    id: 'speedPill',
    name: '速度药丸',
    desc: '移速 +60 (3房间)',
    color: '#44ff44',
    colorAlt: '#88ff66',
    duration: 3,
    positive: true,
    apply(p) {
      p.stats.speed += 60;
    },
    remove(p) {
      p.stats.speed -= 60;
    }
  },
  {
    id: 'rangePill',
    name: '射程药丸',
    desc: '射程 +120 (2房间)',
    color: '#ffaa00',
    colorAlt: '#ffcc44',
    duration: 2,
    positive: true,
    apply(p) {
      p.stats.range += 120;
    },
    remove(p) {
      p.stats.range -= 120;
    }
  },
  {
    id: 'fireRatePill',
    name: '射速药丸',
    desc: '射速 +0.8 (2房间)',
    color: '#4488ff',
    colorAlt: '#66aaff',
    duration: 2,
    positive: true,
    apply(p) {
      p.stats.fireRate += 0.8;
    },
    remove(p) {
      p.stats.fireRate -= 0.8;
    }
  },
  {
    id: 'luckPill',
    name: '幸运药丸',
    desc: '幸运 +1.5 (当前房间)',
    color: '#ff44ff',
    colorAlt: '#ff88ff',
    duration: 1,
    positive: true,
    apply(p) {
      p.stats.luck += 1.5;
    },
    remove(p) {
      p.stats.luck -= 1.5;
    }
  },

  // ==================== 负面效果 ====================
  {
    id: 'weakPill',
    name: '虚弱药丸',
    desc: '伤害 -1.5 (2房间)',
    color: '#886644',
    colorAlt: '#aa8866',
    duration: 2,
    positive: false,
    apply(p) {
      p.stats.damage -= 1.5;
      p.stats.damage = Math.max(1, p.stats.damage);
    },
    remove(p) {
      p.stats.damage += 1.5;
      p.stats.damage = Math.min(90, p.stats.damage);
    }
  },
  {
    id: 'slowPill',
    name: '迟缓药丸',
    desc: '移速 -40 (3房间)',
    color: '#666688',
    colorAlt: '#8888aa',
    duration: 3,
    positive: false,
    apply(p) {
      p.stats.speed -= 40;
      p.stats.speed = Math.max(110, p.stats.speed);
    },
    remove(p) {
      p.stats.speed += 40;
      p.stats.speed = Math.min(380, p.stats.speed);
    }
  },
  {
    id: 'shortPill',
    name: '短射程药丸',
    desc: '射程 -80 (当前房间)',
    color: '#884444',
    colorAlt: '#aa6666',
    duration: 1,
    positive: false,
    apply(p) {
      p.stats.range -= 80;
      p.stats.range = Math.max(200, p.stats.range);
    },
    remove(p) {
      p.stats.range += 80;
      p.stats.range = Math.min(1100, p.stats.range);
    }
  },
  {
    id: 'clumsyPill',
    name: '笨拙药丸',
    desc: '射速 -0.5 (2房间)',
    color: '#664466',
    colorAlt: '#886688',
    duration: 2,
    positive: false,
    apply(p) {
      p.stats.fireRate -= 0.5;
      p.stats.fireRate = Math.max(0.9, p.stats.fireRate);
    },
    remove(p) {
      p.stats.fireRate += 0.5;
      p.stats.fireRate = Math.min(14, p.stats.fireRate);
    }
  },

  // ==================== 特殊效果 ====================
  {
    id: 'berserkPill',
    name: '狂暴药丸',
    desc: '伤害 +3, 移速 -30 (当前房间)',
    color: '#ff2222',
    colorAlt: '#ff6644',
    duration: 1,
    positive: true,
    apply(p) {
      p.stats.damage += 3;
      p.stats.speed -= 30;
      p.stats.speed = Math.max(110, p.stats.speed);
    },
    remove(p) {
      p.stats.damage -= 3;
      p.stats.speed += 30;
      p.stats.speed = Math.min(380, p.stats.speed);
    }
  },
  {
    id: 'clearPill',
    name: '清屏药丸',
    desc: '清除当前房间所有敌人',
    color: '#ff44ff',
    colorAlt: '#ff88ff',
    duration: 0,  // 一次性效果，无持续时间
    positive: true,
    instant: true,  // 标记为立即生效
    apply(p, game) {
      if (game && game.enemies && game.enemies.length > 0) {
        // 清空所有敌人
        game.enemies.forEach(e => {
          if (!e.dead) {
            game.parts.burst(e.x, e.y, 16, '#ff88ff', { spd: 200, size: 5 });
            e.dead = true;
          }
        });
        game.enemies.length = 0;
        Shake.add(12, 0.5);
        Sfx.win();
        game.toasts.push({
          text: '清屏！',
          sub: '所有敌人已清除',
          t: 2.0
        });
        // 直接触发房间清理（因为敌人已清空，checkRoomClear 会因 before===0 而提前返回）
        if (!game.room.cleared) game.onRoomCleared();
      }
    }
  }
];

const PILL_BY_ID = Object.fromEntries(PILLS.map(p => [p.id, p]));

/**
 * 药丸池系统 - 类似道具池机制，避免短时间内重复出现相同药丸
 */
class PillPool {
  constructor(seed) {
    this.rng = makeRng(seed ^ 0xabc12345);
    this.allPills = PILLS.map(p => p.id);
    this.remaining = this.rng.shuffle([...this.allPills]);
  }

  next() {
    if (!this.remaining.length) {
      this.remaining = this.rng.shuffle([...this.allPills]);
    }
    const pillId = this.remaining.pop();
    return PILL_BY_ID[pillId] || PILLS[0];
  }
}