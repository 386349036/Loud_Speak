// 初登藤架 — 宽平台
export default {
  "id": "3-1",
  "name": "初登藤架",
  "focus": "宽平台",
  "world": 3,
  "stage": 1,
  "width": 1536,
  "height": 240,
  "timeLimit": 360,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1488,
  "checkpoint": 720,
  "background": "W03-far",
  "mid": "W03-mid",
  "terrain": "W03-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 480,
      "h": 32
    },
    {
      "x": 528,
      "y": 208,
      "w": 384,
      "h": 32
    },
    {
      "x": 960,
      "y": 208,
      "w": 272,
      "h": 32
    },
    {
      "x": 1280,
      "y": 208,
      "w": 256,
      "h": 32
    },
    {
      "x": 256,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 288,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 672,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 704,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 320,
      "y": 144,
      "w": 112,
      "h": 16
    },
    {
      "x": 736,
      "y": 144,
      "w": 144,
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
      "kind": "spike",
      "x": 384,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 384,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "corn",
      "x": 784,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 784,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "winged",
      "x": 1136,
      "y": 160,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1136,
      "homeY": 160,
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
