// 热流入口 — 热流等待
export default {
  "id": "6-1",
  "name": "热流入口",
  "focus": "热流等待",
  "world": 6,
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
  "background": "W06-far",
  "mid": "W06-mid",
  "terrain": "W06-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 512,
      "h": 32
    },
    {
      "x": 544,
      "y": 208,
      "w": 512,
      "h": 32
    },
    {
      "x": 1088,
      "y": 208,
      "w": 448,
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
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "mushroom",
      "x": 224,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 224,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "walnut",
      "x": 672,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 672,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "trap",
      "x": 1152,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1152,
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
  "hazards": [
    {
      "x": 336,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0
    },
    {
      "x": 784,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0.25
    },
    {
      "x": 1248,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0
    }
  ],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
