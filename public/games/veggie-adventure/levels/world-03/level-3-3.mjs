// 玉米守桥 — 投手压制
export default {
  "id": "3-3",
  "name": "玉米守桥",
  "focus": "投手压制",
  "world": 3,
  "stage": 3,
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
      "w": 560,
      "h": 32
    },
    {
      "x": 608,
      "y": 208,
      "w": 368,
      "h": 32
    },
    {
      "x": 1024,
      "y": 208,
      "w": 512,
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
      "x": 368,
      "y": 144,
      "w": 80,
      "h": 16
    },
    {
      "x": 816,
      "y": 144,
      "w": 96,
      "h": 16
    },
    {
      "x": 544,
      "y": 192,
      "w": 80,
      "h": 16,
      "bridge": true
    },
    {
      "x": 960,
      "y": 192,
      "w": 80,
      "h": 16,
      "bridge": true
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
      "kind": "corn",
      "x": 432,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 432,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "winged",
      "x": 688,
      "y": 160,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 688,
      "homeY": 160,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "corn",
      "x": 880,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 880,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 3,
      "kind": "corn",
      "x": 1232,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1232,
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
