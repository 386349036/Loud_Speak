// 南瓜庭院 — 宽平竞技场
export default {
  "id": "1-4",
  "name": "南瓜庭院",
  "focus": "宽平竞技场",
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
  "checkpoint": 1408,
  "background": "W01-arena",
  "mid": null,
  "terrain": "W01-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 1792,
      "h": 32
    },
    {
      "x": 1552,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 1680,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 464,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 496,
      "y": 176,
      "w": 48,
      "h": 32
    }
  ],
  "blocks": [
    {
      "x": 160,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "reward",
      "item": "carrot"
    },
    {
      "x": 608,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "reward",
      "item": "chili"
    },
    {
      "x": 1248,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "reward",
      "item": "star"
    },
    {
      "x": 1408,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "reward",
      "item": "chili"
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
      "x": 864,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 864,
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
      "x": 1472,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1584,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    }
  ],
  "movers": [],
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
    "left": 1504,
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
