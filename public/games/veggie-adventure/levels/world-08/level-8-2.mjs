export default {
  "id": "8-2",
  "name": "水火回廊",
  "focus": "水陆炮弹",
  "world": 8,
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
  "background": "W08-far",
  "mid": "W08-mid",
  "terrain": "W08-kit",
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
      "w": 256,
      "h": 16
    },
    {
      "x": 576,
      "y": 208,
      "w": 368,
      "h": 32
    },
    {
      "x": 944,
      "y": 224,
      "w": 288,
      "h": 16
    },
    {
      "x": 1232,
      "y": 208,
      "w": 304,
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
      "x": 1248,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "item": "star",
      "breakable": true
    },
    {
      "x": 608,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 624,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 640,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 656,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 640,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 656,
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
      "kind": "fish",
      "x": 416,
      "y": 168,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 416,
      "homeY": 168,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 1,
      "kind": "jelly",
      "x": 1056,
      "y": 152,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1056,
      "homeY": 152,
      "cooldown": 1.2,
      "phase": 0
    },
    {
      "id": 2,
      "kind": "leaper",
      "x": 1168,
      "y": 152,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1168,
      "homeY": 152,
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
      "x": 832,
      "y": 176,
      "w": 16,
      "h": 32,
      "kind": "heat",
      "period": 4,
      "on": 1.2,
      "offset": 0.25
    }
  ],
  "water": [
    {
      "x": 320,
      "y": 144,
      "w": 256,
      "h": 80
    },
    {
      "x": 944,
      "y": 128,
      "w": 288,
      "h": 96
    }
  ],
  "turrets": [
    {
      "x": 720,
      "y": 176,
      "w": 16,
      "h": 32,
      "cooldown": 1.5,
      "windup": 0
    },
    {
      "x": 1328,
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
