// 双层葡萄架 — 藤架分层
export default {
  "id": "7-3",
  "name": "双层葡萄架",
  "focus": "藤架分层",
  "world": 7,
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
  "background": "W07-far",
  "mid": "W07-mid",
  "terrain": "W07-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 512,
      "h": 32
    },
    {
      "x": 560,
      "y": 208,
      "w": 528,
      "h": 32
    },
    {
      "x": 1136,
      "y": 208,
      "w": 400,
      "h": 32
    },
    {
      "x": 240,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 272,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 720,
      "y": 192,
      "w": 32,
      "h": 16
    },
    {
      "x": 752,
      "y": 176,
      "w": 32,
      "h": 32
    },
    {
      "x": 304,
      "y": 144,
      "w": 160,
      "h": 16
    },
    {
      "x": 784,
      "y": 144,
      "w": 176,
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
      "kind": "corn",
      "x": 400,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 400,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "winged",
      "x": 624,
      "y": 160,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 624,
      "homeY": 160,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "corn",
      "x": 896,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 896,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 3,
      "kind": "cloud",
      "x": 1264,
      "y": 64,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1264,
      "homeY": 64,
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
  "movers": [
    {
      "x": 464,
      "y": 160,
      "w": 48,
      "h": 8,
      "baseX": 464,
      "baseY": 160,
      "axis": "x",
      "range": 40,
      "period": 4,
      "kind": "lift",
      "id": "lift-464"
    },
    {
      "x": 976,
      "y": 144,
      "w": 48,
      "h": 8,
      "baseX": 976,
      "baseY": 144,
      "axis": "y",
      "range": 32,
      "period": 4,
      "kind": "lift",
      "id": "lift-976"
    }
  ],
  "hazards": [],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
