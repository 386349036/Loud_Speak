// Hand-authored experimental first boss level; preserved by build-levels.cjs.
export default {
  "id": "1-4",
  "name": "南瓜庭院",
  "focus": "三层路线：高台避震，↓＋跳穿下，抓住绿标反击",
  "world": 1,
  "stage": 4,
  "width": 1792,
  "height": 240,
  "timeLimit": 420,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1744,
  "checkpoint": 1360,
  "background": "W01-arena",
  "mid": null,
  "terrain": "W01-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 720,
      "h": 32
    },
    {
      "x": 768,
      "y": 208,
      "w": 288,
      "h": 32
    },
    {
      "x": 1104,
      "y": 208,
      "w": 688,
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
      "x": 560,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "chili",
      "breakable": true
    },
    {
      "x": 1248,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "star",
      "breakable": true
    },
    {
      "x": 464,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 480,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 496,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 512,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 528,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 496,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 512,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 528,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 1312,
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
      "id": 1,
      "kind": "cabbage",
      "x": 944,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 944,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
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
      "x": 464,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 576,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 688,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 800,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 912,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1024,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1136,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1248,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1360,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1392,
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
      "x": 1456,
      "y": 176,
      "w": 48,
      "h": 8,
      "baseX": 1456,
      "baseY": 176,
      "kind": "ledge",
      "oneWay": true,
      "arena": true
    },
    {
      "id": "arena-ledge-1",
      "x": 1568,
      "y": 160,
      "w": 48,
      "h": 8,
      "baseX": 1568,
      "baseY": 160,
      "kind": "ledge",
      "oneWay": true,
      "arena": true
    },
    {
      "id": "arena-ledge-2",
      "x": 1664,
      "y": 176,
      "w": 32,
      "h": 8,
      "baseX": 1664,
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
    "x": 1632,
    "y": 176,
    "w": 32,
    "h": 32,
    "left": 1424,
    "right": 1712,
    "hp": 3,
    "phase": "idle",
    "timer": 0,
    "cycle": 0,
    "hits": 0,
    "invulnerable": 0,
    "active": false,
    "dead": false
  }
};
