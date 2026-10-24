// 王庭外墙 — 机制复习
export default {
  "id": "8-1",
  "name": "王庭外墙",
  "focus": "机制复习",
  "world": 8,
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
  "background": "W08-far",
  "mid": "W08-mid",
  "terrain": "W08-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 464,
      "h": 32
    },
    {
      "x": 512,
      "y": 208,
      "w": 496,
      "h": 32
    },
    {
      "x": 1056,
      "y": 208,
      "w": 480,
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
      "x": 640,
      "y": 160,
      "w": 96,
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
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "walnut",
      "x": 352,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 352,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "corn",
      "x": 848,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 848,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "spike",
      "x": 1312,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1312,
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
      "x": 448,
      "y": 192,
      "w": 48,
      "h": 8,
      "baseX": 448,
      "baseY": 192,
      "axis": "x",
      "range": 24,
      "period": 4,
      "kind": "lift",
      "id": "lift-448"
    }
  ],
  "hazards": [
    {
      "x": 1168,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0.25
    }
  ],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
