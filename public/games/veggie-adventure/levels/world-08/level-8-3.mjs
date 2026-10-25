export default {
  "id": "8-3",
  "name": "三重试炼",
  "focus": "三段组合",
  "world": 8,
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
  "background": "W08-far",
  "mid": "W08-mid",
  "terrain": "W08-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 416,
      "h": 32
    },
    {
      "x": 480,
      "y": 208,
      "w": 384,
      "h": 32
    },
    {
      "x": 912,
      "y": 208,
      "w": 288,
      "h": 32
    },
    {
      "x": 1248,
      "y": 208,
      "w": 288,
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
      "x": 608,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "chili",
      "breakable": true
    },
    {
      "x": 704,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 720,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "winged",
      "x": 304,
      "y": 160,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 304,
      "homeY": 160,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "corn",
      "x": 768,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": 0,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 768,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "walnut",
      "x": 1120,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1120,
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
      "x": 408,
      "y": 192,
      "w": 48,
      "h": 8,
      "baseX": 408,
      "baseY": 192,
      "axis": "x",
      "range": 32,
      "period": 4,
      "kind": "lift",
      "id": "lift-408"
    },
    {
      "x": 912,
      "y": 176,
      "w": 64,
      "h": 8,
      "baseX": 912,
      "baseY": 176,
      "kind": "crumble",
      "id": "crumble-912",
      "timer": 0,
      "fallen": false
    }
  ],
  "hazards": [
    {
      "x": 624,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0
    },
    {
      "x": 1040,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0.5
    },
    {
      "x": 1344,
      "y": 176,
      "w": 8,
      "h": 8,
      "kind": "chain",
      "radius": 20,
      "period": 5
    }
  ],
  "water": [],
  "turrets": [],
  "gates": [],
  "boss": null
};
