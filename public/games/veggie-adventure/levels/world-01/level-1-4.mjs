// Short boss approach; full arena and combat parameters retained.
export default {
  "id": "1-4",
  "name": "南瓜庭院",
  "focus": "长庭院验证：短坑、砖阶、壳兵与飞翼；终点三层场地抓住绿标反击",
  "world": 1,
  "stage": 4,
  "width": 1168,
  "height": 240,
  "timeLimit": 720,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1120,
  "checkpoint": 736,
  "background": "W01-arena",
  "mid": null,
  "terrain": "W01-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 432,
      "h": 32
    },
    {
      "x": 432,
      "y": 208,
      "w": 736,
      "h": 32
    }
  ],
  "blocks": [
    {
      "x": 160,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "carrot",
      "breakable": true
    },
    {
      "x": 448,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "carrot",
      "breakable": true
    },
    {
      "x": 560,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "chili",
      "breakable": true
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "mushroom",
      "x": 320,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 320,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 11,
      "kind": "cabbage",
      "x": 632,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 632,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0,
      "patrolLeft": 608,
      "patrolRight": 672
    }
  ],
  "items": [
    {
      "x": 128,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 240,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 352,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 448,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 544,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 640,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 736,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    }
  ],
  "movers": [
    {
      "id": "arena-ledge-0",
      "x": 832,
      "y": 176,
      "w": 48,
      "h": 8,
      "baseX": 832,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true
    },
    {
      "id": "arena-ledge-1",
      "x": 944,
      "y": 160,
      "w": 48,
      "h": 8,
      "baseX": 944,
      "baseY": 160,
      "kind": "ledge",
      "oneWay": true,
      "arena": true
    },
    {
      "id": "arena-ledge-2",
      "x": 1040,
      "y": 176,
      "w": 32,
      "h": 8,
      "baseX": 1040,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true
    }
  ],
  "hazards": [],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": {
    "id": "B01",
    "kind": 1,
    "name": "南瓜门卫",
    "x": 1008,
    "y": 176,
    "w": 32,
    "h": 32,
    "left": 800,
    "right": 1088,
    "hp": 6,
    "phase": "idle",
    "timer": 0,
    "cycle": 0,
    "hits": 0,
    "invulnerable": 0,
    "active": false,
    "dead": false,
    "maxHp": 6,
    "balanceVersion": 1
  },
  "layoutVersion": 4,
  "sections": [
    {
      "id": "entry",
      "name": "庭院入口",
      "from": 0,
      "to": 432
    },
    {
      "id": "supply",
      "name": "门前补给",
      "from": 432,
      "to": 800
    },
    {
      "id": "boss",
      "name": "南瓜三层战场",
      "from": 800,
      "to": 1168
    }
  ],
  "priorLayouts": [
    {
      "version": 2,
      "width": 5888,
      "timeLimit": 720,
      "counts": {
        "blocks": 73,
        "enemies": 12,
        "movers": 3,
        "turrets": 0,
        "gates": 0
      },
      "boss": {
        "left": 5520,
        "right": 5808
      }
    },
    {
      "version": 3,
      "width": 2944,
      "timeLimit": 720,
      "counts": {
        "blocks": 32,
        "enemies": 4,
        "movers": 3,
        "turrets": 0,
        "gates": 0
      },
      "boss": {
        "left": 2576,
        "right": 2864
      }
    }
  ],
  "bossRouteVersion": 2,
  "bossRouteReduction": {
    "priorWidth": 2944,
    "from": 432,
    "to": 2208,
    "removed": 1776,
    "requestedReduction": 0.6
  },
  "bossRouteHistory": [
    {
      "priorWidth": 5888,
      "from": 1600,
      "to": 4544,
      "removed": 2944
    }
  ]
};
