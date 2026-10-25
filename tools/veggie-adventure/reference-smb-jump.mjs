// Research model only, not game code or an emulator.
// Source: doppelganger SMBDIS.ASM: JumpMForceData, FallMForceData,
// PlayerYSpdData, JumpSwimSub, MovePlayerVertically, ImposeGravity.
// Full A hold; constant horizontal speed; no collisions; initial subpixels zero.
const cases = [['standing', -4, 0x20, 0x70, 0], ['walking', -4, 0x1e, 0x60, 1.5], ['running', -5, 0x28, 0x90, 2.5]];
for (const [mode, initialSpeed, up, down, horizontalSpeed] of cases) {
  let speed = initialSpeed, fraction = 0, positionFraction = 0, y = 0, minimum = 0, frames = 0;
  do {
    const gravity = speed < 0 ? up : down;
    positionFraction += fraction;
    y += speed + Math.floor(positionFraction / 256);
    positionFraction %= 256;
    fraction += gravity;
    speed += Math.floor(fraction / 256);
    fraction %= 256;
    if (speed >= 4 && fraction >= 128) { speed = 4; fraction = 0; }
    minimum = Math.min(minimum, y);
    frames++;
  } while (y < 0 && frames < 200);
  console.log(JSON.stringify({mode, heightPixels: -minimum, heightTiles: -minimum / 16, framesToReturn: frames, displacementPixels: frames * horizontalSpeed, displacementTiles: frames * horizontalSpeed / 16}));
}
