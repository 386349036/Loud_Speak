export default {
  "id": "1-1",
  "width": 1536,
  "height": 240,
  "spawn": {
    "x": 32,
    "y": 180
  },
  "exit": 1460,
  "checkpoint": 720,
  "platforms": [
    {
      "x": 0,
      "y": 208,
      "w": 352,
      "h": 32
    },
    {
      "x": 400,
      "y": 208,
      "w": 208,
      "h": 32
    },
    {
      "x": 656,
      "y": 208,
      "w": 304,
      "h": 32
    },
    {
      "x": 1008,
      "y": 208,
      "w": 240,
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
      "x": 192,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 784,
      "y": 192,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 800,
      "y": 176,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true
    },
    {
      "x": 816,
      "y": 176,
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
      "x": 112,
      "y": 144,
      "w": 16,
      "h": 16,
      "kind": "brick",
      "breakable": true,
      "item": "rebirth",
      "rewardId": "1-1"
    }
  ],
  "enemies": [
    {
      "x": 272,
      "kind": "mushroom",
      "id": 0,
      "y": 190,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false
    },
    {
      "x": 448,
      "kind": "mushroom",
      "id": 1,
      "y": 190,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false
    },
    {
      "x": 1152,
      "kind": "cabbage",
      "id": 2,
      "y": 190,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1152,
      "patrolLeft": 1136,
      "patrolRight": 1200
    },
    {
      "x": 1408,
      "kind": "mushroom",
      "id": 3,
      "y": 190,
      "w": 14,
      "h": 14,
      "vx": -20,
      "vy": 0,
      "state": "walk",
      "timer": 0,
      "grace": 0,
      "dead": false,
      "homeX": 1408,
      "patrolLeft": 1376,
      "patrolRight": 1440
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
      "x": 208,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 432,
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
      "x": 688,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 752,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 880,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1040,
      "y": 176,
      "w": 10,
      "h": 12,
      "kind": "seed",
      "collected": false
    },
    {
      "x": 1312,
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
  "priorLayouts": [
    {
      "version": 1,
      "width": 1536,
      "timeLimit": 300,
      "counts": {
        "blocks": 7,
        "enemies": 4,
        "movers": 0,
        "turrets": 0,
        "gates": 0
      },
      "boss": null
    }
  ],
  "layoutVersion": 2,
  "rebirthRewardVersion": 1
};
