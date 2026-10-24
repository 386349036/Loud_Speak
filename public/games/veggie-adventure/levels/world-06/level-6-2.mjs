// 炮弹作坊 — 掩体间穿行
export default {
  "id": "6-2",
  "name": "炮弹作坊",
  "focus": "掩体间穿行",
  "world": 6,
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
  "background": "W06-far",
  "mid": "W06-mid",
  "terrain": "W06-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 640,
      "h": 32
    },
    {
      "x": 672,
      "y": 208,
      "w": 464,
      "h": 32
    },
    {
      "x": 1168,
      "y": 208,
      "w": 368,
      "h": 32
    },
    {
      "x": 304,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 336,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 864,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 896,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 368,
      "y": 144,
      "w": 64,
      "h": 16
    },
    {
      "x": 928,
      "y": 144,
      "w": 64,
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
      "x": 768,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 768,
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
  "turrets": [
    {
      "x": 512,
      "y": 176,
      "w": 16,
      "h": 32,
      "cooldown": 1.5,
      "windup": 0
    },
    {
      "x": 1008,
      "y": 176,
      "w": 16,
      "h": 32,
      "cooldown": 1.5,
      "windup": 0
    },
    {
      "x": 1328,
      "y": 176,
      "w": 16,
      "h": 32,
      "cooldown": 1.5,
      "windup": 0
    }
  ],
  "gates": [],
  "boss": null
};
