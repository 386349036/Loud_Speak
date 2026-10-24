// 苔墙岔路 — 上下路线
export default {
  "id": "1-2",
  "name": "苔墙岔路",
  "focus": "上下路线",
  "world": 1,
  "stage": 2,
  "width": 1536,
  "height": 240,
  "timeLimit": 360,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1488,
  "checkpoint": 720,
  "background": "W01-far",
  "mid": "W01-mid",
  "terrain": "W01-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 544,
      "h": 32
    },
    {
      "x": 576,
      "y": 208,
      "w": 496,
      "h": 32
    },
    {
      "x": 1120,
      "y": 208,
      "w": 416,
      "h": 32
    },
    {
      "x": 320,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 352,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 752,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 784,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 384,
      "y": 160,
      "w": 96,
      "h": 16
    },
    {
      "x": 816,
      "y": 144,
      "w": 112,
      "h": 16
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
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "cabbage",
      "x": 240,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 240,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "trap",
      "x": 656,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 656,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "mushroom",
      "x": 960,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 960,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 3,
      "kind": "cabbage",
      "x": 1280,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1280,
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
    }
  ],
  "movers": [],
  "hazards": [],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
