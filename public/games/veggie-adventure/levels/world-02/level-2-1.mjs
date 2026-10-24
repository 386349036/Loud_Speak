// 根下入口 — 低顶与蹲行
export default {
  "id": "2-1",
  "name": "根下入口",
  "focus": "低顶与蹲行",
  "world": 2,
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
  "background": "W02-far",
  "mid": "W02-mid",
  "terrain": "W02-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 752,
      "h": 32
    },
    {
      "x": 784,
      "y": 208,
      "w": 752,
      "h": 32
    },
    {
      "x": 544,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 576,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 256,
      "y": 160,
      "w": 128,
      "h": 32,
      "ceiling": true
    },
    {
      "x": 992,
      "y": 160,
      "w": 144,
      "h": 32,
      "ceiling": true
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
      "x": 864,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick"
    },
    {
      "x": 880,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick"
    },
    {
      "x": 896,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick"
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "walnut",
      "x": 448,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 448,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "mushroom",
      "x": 656,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
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
      "kind": "trap",
      "x": 1216,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1216,
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
