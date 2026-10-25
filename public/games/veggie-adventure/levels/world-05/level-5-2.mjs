export default {
  "id": "5-2",
  "name": "荆棘落脚",
  "focus": "安全落脚台",
  "world": 5,
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
  "background": "W05-far",
  "mid": "W05-mid",
  "terrain": "W05-kit",
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
      "w": 336,
      "h": 32
    },
    {
      "x": 1296,
      "y": 208,
      "w": 240,
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
      "x": 288,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 304,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 688,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 704,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 720,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 1104,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "spike",
      "x": 608,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 608,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "winged",
      "x": 1008,
      "y": 160,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1008,
      "homeY": 160,
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
      "y": 160,
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
      "x": 512,
      "y": 176,
      "w": 64,
      "h": 8,
      "baseX": 512,
      "baseY": 176,
      "kind": "crumble",
      "id": "crumble-512",
      "timer": 0,
      "fallen": false
    },
    {
      "x": 944,
      "y": 176,
      "w": 64,
      "h": 8,
      "baseX": 944,
      "baseY": 176,
      "kind": "crumble",
      "id": "crumble-944",
      "timer": 0,
      "fallen": false
    }
  ],
  "hazards": [
    {
      "x": 304,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0.25
    },
    {
      "x": 704,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0.5
    },
    {
      "x": 1120,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
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
