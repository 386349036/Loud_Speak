// 跃水长廊 — 水陆跳跃
export default {
  "id": "4-3",
  "name": "跃水长廊",
  "focus": "水陆跳跃",
  "world": 4,
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
  "background": "W04-far",
  "mid": "W04-mid",
  "terrain": "W04-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 320,
      "h": 32
    },
    {
      "x": 320,
      "y": 224,
      "w": 224,
      "h": 16
    },
    {
      "x": 544,
      "y": 208,
      "w": 192,
      "h": 32
    },
    {
      "x": 736,
      "y": 224,
      "w": 224,
      "h": 16
    },
    {
      "x": 960,
      "y": 208,
      "w": 192,
      "h": 32
    },
    {
      "x": 1152,
      "y": 224,
      "w": 224,
      "h": 16
    },
    {
      "x": 1376,
      "y": 208,
      "w": 160,
      "h": 32
    },
    {
      "x": 576,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 608,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 992,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 1024,
      "y": 176,
      "w": 32,
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
      "kind": "leaper",
      "x": 400,
      "y": 184,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 400,
      "homeY": 184,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "fish",
      "x": 800,
      "y": 184,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 800,
      "homeY": 184,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "leaper",
      "x": 864,
      "y": 184,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 864,
      "homeY": 184,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 3,
      "kind": "leaper",
      "x": 1232,
      "y": 184,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1232,
      "homeY": 184,
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
      "x": 320,
      "y": 160,
      "w": 224,
      "h": 64
    },
    {
      "x": 736,
      "y": 160,
      "w": 224,
      "h": 64
    },
    {
      "x": 1152,
      "y": 160,
      "w": 224,
      "h": 64
    }
  ],
  "turrets": [],
  "gates": [],
  "boss": null
};
