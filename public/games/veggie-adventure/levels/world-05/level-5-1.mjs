export default {
  "id": "5-1",
  "name": "刺栗边界",
  "focus": "危险形状识别",
  "world": 5,
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
  "background": "W05-far",
  "mid": "W05-mid",
  "terrain": "W05-kit",
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 496,
      "h": 32
    },
    {
      "x": 528,
      "y": 208,
      "w": 528,
      "h": 32
    },
    {
      "x": 1104,
      "y": 208,
      "w": 432,
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
    }
  ],
  "enemies": [
    {
      "id": 0,
      "kind": "spike",
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
      "x": 656,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 656,
      "homeY": 194,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "cabbage",
      "x": 912,
      "y": 194,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 912,
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
      "x": 320,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0.5
    },
    {
      "x": 768,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0
    },
    {
      "x": 1232,
      "y": 200,
      "w": 32,
      "h": 8,
      "kind": "spikes",
      "period": 4,
      "on": 1.2,
      "offset": 0.5
    }
  ],
  "water": [],
  "turrets": [
    {
      "x": 1344,
      "y": 176,
      "w": 16,
      "h": 32,
      "cooldown": 1.5,
      "windup": 0
    }
  ],
  "gates": [],
  "boss": null
};
