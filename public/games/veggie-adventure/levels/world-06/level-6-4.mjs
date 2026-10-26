// Short boss approach; full arena and combat parameters retained.
export default {
  "id": "6-4",
  "name": "辣椒炉厅",
  "focus": "高低攻击预兆；长路线分段补给，三形态净空，三层弱点战场",
  "world": 6,
  "stage": 4,
  "width": 1168,
  "height": 240,
  "timeLimit": 840,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1120,
  "checkpoint": 784,
  "background": "W06-arena",
  "mid": null,
  "terrain": "W06-kit",
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
      "w": 224,
      "h": 32
    },
    {
      "x": 704,
      "y": 208,
      "w": 80,
      "h": 32
    },
    {
      "x": 784,
      "y": 208,
      "w": 384,
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
      "x": 432,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true,
      "item": "chili"
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "trap",
      "x": 320,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 320,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0,
      "patrolLeft": 272,
      "patrolRight": 382
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
      "x": 848,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 960,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 464,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 560,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    }
  ],
  "movers": [
    {
      "x": 832,
      "y": 176,
      "w": 48,
      "h": 8,
      "baseX": 832,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-0"
    },
    {
      "x": 944,
      "y": 160,
      "w": 48,
      "h": 8,
      "baseX": 944,
      "baseY": 160,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-1"
    },
    {
      "x": 1040,
      "y": 176,
      "w": 32,
      "h": 8,
      "baseX": 1040,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-2"
    }
  ],
  "hazards": [
    {
      "x": 480,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4.8,
      "on": 1.1,
      "offset": 2.1
    }
  ],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": {
    "id": "B06",
    "kind": 6,
    "name": "辣椒术士",
    "x": 1008,
    "y": 176,
    "w": 32,
    "h": 32,
    "left": 800,
    "right": 1088,
    "hp": 10,
    "phase": "idle",
    "timer": 0,
    "cycle": 0,
    "hits": 0,
    "invulnerable": 0,
    "active": false,
    "dead": false,
    "maxHp": 10,
    "balanceVersion": 1
  },
  "layoutVersion": 4,
  "reworkVersion": 1,
  "priorLayout": {
    "version": 1,
    "width": 1792,
    "timeLimit": 420,
    "counts": {
      "blocks": 16,
      "enemies": 2,
      "movers": 0,
      "turrets": 0,
      "gates": 0
    },
    "boss": {
      "left": 1504,
      "right": 1712
    }
  },
  "sections": [
    {
      "id": "introduction",
      "name": "原关教学与特色机制",
      "from": 0,
      "to": 432
    },
    {
      "id": "route-7",
      "name": "炉阀工坊·8",
      "from": 432,
      "to": 784
    },
    {
      "id": "boss",
      "name": "关底分层战场",
      "from": 784,
      "to": 1168
    }
  ],
  "priorLayouts": [
    {
      "version": 1,
      "width": 1792,
      "timeLimit": 420,
      "counts": {
        "blocks": 16,
        "enemies": 2,
        "movers": 0,
        "turrets": 0,
        "gates": 0
      },
      "boss": {
        "left": 1504,
        "right": 1712
      }
    },
    {
      "version": 2,
      "width": 5888,
      "timeLimit": 840,
      "counts": {
        "blocks": 69,
        "enemies": 7,
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
      "timeLimit": 840,
      "counts": {
        "blocks": 26,
        "enemies": 3,
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
      "from": 1280,
      "to": 4224,
      "removed": 2944
    }
  ]
};
