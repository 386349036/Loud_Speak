// Expanded boss arena; short approach and actor dimensions retained.
export default {
  "id": "3-4",
  "name": "穗冠高台",
  "focus": "宽长平台；长路线分段补给，三形态净空，三层弱点战场",
  "world": 3,
  "stage": 4,
  "width": 1312,
  "height": 240,
  "timeLimit": 840,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1264,
  "checkpoint": 784,
  "background": "W03-arena",
  "mid": null,
  "terrain": "W03-kit",
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
      "w": 528,
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
      "y": 128,
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
      "kind": "corn",
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
    },
    {
      "id": 9,
      "kind": "corn",
      "x": 496,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 496,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0,
      "patrolLeft": 448,
      "patrolRight": 528
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
      "x": 874.5,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1042.5,
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
      "x": 860,
      "y": 176,
      "w": 48,
      "h": 8,
      "baseX": 860,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-0"
    },
    {
      "x": 1028,
      "y": 160,
      "w": 48,
      "h": 8,
      "baseX": 1028,
      "baseY": 160,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-1"
    },
    {
      "x": 1168,
      "y": 176,
      "w": 32,
      "h": 8,
      "baseX": 1168,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true,
      "id": "arena-ledge-2"
    }
  ],
  "hazards": [],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": {
    "id": "B03",
    "kind": 3,
    "name": "玉米骑士",
    "x": 1120,
    "y": 176,
    "w": 32,
    "h": 32,
    "left": 800,
    "right": 1232,
    "hp": 8,
    "phase": "idle",
    "timer": 0,
    "cycle": 0,
    "hits": 0,
    "invulnerable": 0,
    "active": false,
    "dead": false,
    "maxHp": 8,
    "balanceVersion": 1
  },
  "layoutVersion": 5,
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
      "name": "藤架高路·8",
      "from": 432,
      "to": 784
    },
    {
      "id": "boss",
      "name": "关底分层战场",
      "from": 784,
      "to": 1312
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
        "enemies": 10,
        "movers": 7,
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
        "enemies": 4,
        "movers": 4,
        "turrets": 0,
        "gates": 0
      },
      "boss": {
        "left": 2576,
        "right": 2864
      }
    },
    {
      "version": 4,
      "width": 1168,
      "timeLimit": 840,
      "counts": {
        "blocks": 2,
        "enemies": 2,
        "movers": 3,
        "turrets": 0,
        "gates": 0
      },
      "boss": {
        "left": 800,
        "right": 1088
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
  ],
  "bossArenaVersion": 1,
  "bossArenaExpansion": {
    "priorWidth": 288,
    "width": 432,
    "added": 144,
    "scale": 1.5,
    "priorLevelWidth": 1168
  }
};
