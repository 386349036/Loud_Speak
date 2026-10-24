// 水母回廊 — 水下路线
export default {
  "id": "4-2",
  "name": "水母回廊",
  "focus": "水下路线",
  "world": 4,
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
  "background": "W04-far",
  "mid": "W04-mid",
  "terrain": "W04-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 160,
      "h": 32
    },
    {
      "x": 160,
      "y": 224,
      "w": 1248,
      "h": 16
    },
    {
      "x": 1408,
      "y": 208,
      "w": 128,
      "h": 32
    },
    {
      "x": 352,
      "y": 144,
      "w": 80,
      "h": 16
    },
    {
      "x": 704,
      "y": 112,
      "w": 80,
      "h": 16
    },
    {
      "x": 1056,
      "y": 160,
      "w": 96,
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
      "kind": "jelly",
      "x": 288,
      "y": 88,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 288,
      "homeY": 88,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "fish",
      "x": 560,
      "y": 88,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 560,
      "homeY": 88,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "jelly",
      "x": 880,
      "y": 88,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 880,
      "homeY": 88,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 3,
      "kind": "fish",
      "x": 1200,
      "y": 88,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1200,
      "homeY": 88,
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
  "water": [
    {
      "x": 160,
      "y": 64,
      "w": 1248,
      "h": 160
    }
  ],
  "turrets": [],
  "gates": [],
  "boss": null
};
