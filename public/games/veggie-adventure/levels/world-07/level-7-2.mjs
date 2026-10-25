export default {
  "id": "7-2",
  "name": "云栗庭廊",
  "focus": "上方落栗预警",
  "world": 7,
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
  "background": "W07-far",
  "mid": "W07-mid",
  "terrain": "W07-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 576,
      "h": 32
    },
    {
      "x": 608,
      "y": 208,
      "w": 416,
      "h": 32
    },
    {
      "x": 1056,
      "y": 208,
      "w": 480,
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
      "x": 1248,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "star",
      "breakable": true
    },
    {
      "x": 320,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 336,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 352,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 368,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 352,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 368,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 800,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 816,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 832,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 848,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 832,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 848,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 384,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 400,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 416,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 432,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 864,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 880,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "cloud",
      "x": 528,
      "y": 64,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 528,
      "homeY": 64,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "cloud",
      "x": 944,
      "y": 64,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 944,
      "homeY": 64,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "spike",
      "x": 1248,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1248,
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
      "y": 160,
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
      "x": 672,
      "y": 24,
      "w": 12,
      "h": 12,
      "kind": "rock",
      "period": 4,
      "on": 1.2,
      "offset": 0
    },
    {
      "x": 1136,
      "y": 24,
      "w": 12,
      "h": 12,
      "kind": "rock",
      "period": 4,
      "on": 1.2,
      "offset": 0.5
    }
  ],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
