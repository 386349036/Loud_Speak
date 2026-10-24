// 垂直矿井 — 升降台
export default {
  "id": "2-2",
  "name": "垂直矿井",
  "focus": "升降台",
  "world": 2,
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
  "background": "W02-far",
  "mid": "W02-mid",
  "terrain": "W02-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 448,
      "h": 32
    },
    {
      "x": 496,
      "y": 208,
      "w": 368,
      "h": 32
    },
    {
      "x": 912,
      "y": 208,
      "w": 272,
      "h": 32
    },
    {
      "x": 1184,
      "y": 224,
      "w": 240,
      "h": 16
    },
    {
      "x": 1424,
      "y": 208,
      "w": 112,
      "h": 32
    },
    {
      "x": 272,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 304,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 1056,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 1088,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 512,
      "y": 144,
      "w": 112,
      "h": 16
    },
    {
      "x": 928,
      "y": 128,
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
      "kind": "walnut",
      "x": 336,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 336,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "jelly",
      "x": 1232,
      "y": 168,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1232,
      "homeY": 168,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "fish",
      "x": 1328,
      "y": 168,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1328,
      "homeY": 168,
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
  "movers": [
    {
      "x": 432,
      "y": 192,
      "w": 48,
      "h": 8,
      "baseX": 432,
      "baseY": 192,
      "axis": "y",
      "range": 64,
      "period": 4,
      "kind": "lift",
      "id": "lift-432"
    },
    {
      "x": 832,
      "y": 176,
      "w": 64,
      "h": 8,
      "baseX": 832,
      "baseY": 176,
      "axis": "y",
      "range": 48,
      "period": 5,
      "kind": "lift",
      "id": "lift-832"
    }
  ],
  "hazards": [],
  "water": [
    {
      "x": 1184,
      "y": 144,
      "w": 240,
      "h": 80
    }
  ],
  "turrets": [],
  "gates": [],
  "boss": null
};
