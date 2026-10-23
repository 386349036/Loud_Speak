import * as THREE from 'three';
import { UP } from '../core/utils.js';
import { scene, camera } from '../core/renderer.js';
import { run, allies, solidMeshes } from '../core/state.js';
import { SUPPORTS, ALLY_MAX, ALLY_ROSTER, allyCost } from '../config/balance.js';
import { TEX } from '../assets/textures.js';
import { isBlocked, findPath } from '../world/nav.js';
import { openSky } from '../world/collision.js';
import { MAP_INFO } from '../world/map.js';
import { sfx } from '../audio/sfx.js';
import { music } from '../audio/music.js';
import { radio } from '../audio/radio.js';
import { raycaster } from '../entities/combat.js';
import { player } from '../entities/player.js';
import { Ally } from '../entities/ally.js';
import { animateSoldier } from '../entities/soldier-model.js';
import { input } from '../input/input.js';
import { flyTransport, airstrike, launchUAV } from '../vehicles/flights.js';
import { dropWithChute } from '../vehicles/parachute.js';
import { buildSupplyCrate } from '../vehicles/models.js';
import { addSupplyCrate } from './pickups.js';
import { unlockMedal } from './progression.js';
import { challengeEvent } from './challenges.js';
import { showMsg, setDesignator } from '../ui/hud.js';

/*
 * Support calls bought with support points earned in combat. Each has a cost and a cooldown.
 * Up to two allies can serve at once, each extra one costing more. The air strike is aimed
 * through a laser designator and warns when the target is danger-close.
 */

export const support = { cd: { uav: 0, supply: 0, ally: 0, strike: 0 }, uavT: 0, designating: false, target: new THREE.Vector3(), valid: false, dist: 0, fireLatch: true, aimLatch: true };
const BY_ID = Object.fromEntries(SUPPORTS.map((s) => [s.id, s]));
let marker = null, beam = null;
const aliveAllies = () => allies.filter((a) => a.alive).length;

/** Current price of a call (the second ally costs more than the first). */
export function supportCost(id) { return id === 'ally' ? allyCost(aliveAllies()) : BY_ID[id].cost; }

export function resetSupport() {
  Object.assign(support.cd, { uav: 0, supply: 0, ally: 0, strike: 0 });
  support.uavT = 0;
  if (support.designating) stopDesignate();
}

/** { ok, reason } for the HUD and for callSupport. */
export function supportStatus(id) {
  const s = BY_ID[id];
  if (!player.alive) return { ok: false, reason: '' };
  if (support.cd[id] > 0) return { ok: false, reason: `${s.name} 冷却剩余 ${Math.ceil(support.cd[id])} 秒` };
  if (id === 'ally' && aliveAllies() >= ALLY_MAX) return { ok: false, reason: '你已有两名队友，已达上限' };
  if (run.sp < supportCost(id)) return { ok: false, reason: `${s.name} 需要 ${supportCost(id)} 支援点` };
  if (id === 'uav' && support.uavT > 0) return { ok: false, reason: '侦察机已抵达' };
  return { ok: true, reason: '' };
}
function pay(id) {
  run.sp -= supportCost(id);
  support.cd[id] = BY_ID[id].cd;
  run.supportsUsed.add(id);
  if (run.supportsUsed.size >= 4) unlockMedal('commander');
  challengeEvent('support', { support: id });
  music.stinger('support');
}

/*
 * Where a parachute may land: inside the walls, on a walkable cell, with nothing overhead,
 * and connected to the player by a walkable path. Tries spots around the player first.
 */
export function dropPoint(preferAhead = 6) {
  const fwd = new THREE.Vector2(-Math.sin(player.yaw), -Math.cos(player.yaw));
  const tries = [];
  for (const d of [preferAhead, preferAhead + 3, preferAhead - 3, preferAhead + 7, preferAhead + 12, 3]) {
    for (const a of [0, 0.6, -0.6, 1.3, -1.3, 2.2, -2.2, Math.PI]) {
      const c = Math.cos(a), s = Math.sin(a);
      tries.push([player.pos.x + (fwd.x * c - fwd.y * s) * d, player.pos.z + (fwd.x * s + fwd.y * c) * d]);
    }
  }
  for (const [x, z] of tries) if (validDrop(x, z)) return new THREE.Vector3(x, 0, z);
  return MAP_INFO.dropFallback.clone();
}
export function validDrop(x, z) {
  if (!MAP_INFO.interior(x, z)) return false;
  for (const [ox, oz] of [[0, 0], [0.9, 0], [-0.9, 0], [0, 0.9], [0, -0.9]]) if (isBlocked(x + ox, z + oz)) return false;
  if (!openSky(x, z)) return false;
  const path = findPath(player.pos.x, player.pos.z, x, z);
  return !!path && path[path.length - 1].distanceTo(new THREE.Vector3(x, 0, z)) < 1.5;
}

export function callSupport(id) {
  if (support.designating) { if (id === 'strike') stopDesignate(); return; }
  const st = supportStatus(id);
  if (!st.ok) { if (st.reason) showMsg(st.reason, 1500); sfx.dry(); return; }
  if (id === 'strike') { startDesignate(); return; }
  pay(id);
  if (id === 'uav') {
    support.uavT = BY_ID.uav.dur;
    launchUAV(BY_ID.uav.dur, () => { support.uavT = 0; });
    radio('侦察机已抵达. 敌人位置已显示在罗盘上.', 'hq');
  } else if (id === 'supply') {
    const target = dropPoint(6);
    flyTransport(target, (pos) => {
      const c = buildSupplyCrate();
      scene.add(c.g);
      dropWithChute(pos, { kind: 'cargo', obj: c.g, target, onLand: (p) => { sfx.supplyLand(p); addSupplyCrate(c, p); } });
    });
    radio('补给飞机正在赶来. 留意橙色降落伞和绿色烟雾.', 'hq');
  } else if (id === 'ally') {
    const target = dropPoint(4);
    const used = allies.filter((a) => a.alive).map((a) => a.name);
    const name = ALLY_ROSTER.find((n) => !used.includes(n)) || ALLY_ROSTER[0];
    const ally = new Ally(new THREE.Vector3(target.x, 90, target.z), name);
    ally.root.visible = false;
    flyTransport(target, (pos) => {
      if (!ally.alive) return;
      ally.root.visible = true;
      ally.pos.copy(pos);
      dropWithChute(pos, {
        kind: 'trooper', obj: ally.root, target,
        onFly: (p, dt) => { ally.pos.copy(p.pos); animateSoldier(ally.ch, dt, { para: true }); },
        onLand: (p) => { ally.pos.copy(p); ally.land(); },
      });
    });
    radio(`${name} 已登机，将在你的位置上空跳伞.`, 'hq');
  }
}

/* ---------- laser designator for the air strike ---------- */
function startDesignate() {
  if (!marker) {
    marker = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: TEX.ring, color: new THREE.Color(4, 0.6, 0.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 0.4, 0.3), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    beam.frustumCulled = false;
  }
  scene.add(marker, beam);
  support.designating = true;
  support.fireLatch = true;
  support.aimLatch = true;
  setDesignator(true);
  sfx.click(2600, 0.3);
}
function stopDesignate() {
  support.designating = false;
  if (marker) scene.remove(marker, beam);
  setDesignator(false);
}
export function confirmStrike() {
  if (!support.designating || !support.valid) return;
  if (!supportStatus('strike').ok) { stopDesignate(); return; }
  pay('strike');
  airstrike(support.target.clone());
  stopDesignate();
  radio(support.dist < 15 ? '确认: 目标离你太近. 立即寻找掩体!' : '坐标已确认. 战机正在赶来，三秒后到达.', 'hq', true);
}
export const cancelStrike = () => { if (support.designating) { stopDesignate(); sfx.back(); } };

const _f = new THREE.Vector3();
export function updateSupport(dt) {
  for (const k in support.cd) support.cd[k] = Math.max(0, support.cd[k] - dt);
  if (!support.designating) return;
  if (!player.alive) { stopDesignate(); return; }
  _f.set(0, 0, -1).applyQuaternion(camera.quaternion);
  raycaster.set(camera.position, _f); raycaster.near = 0.5; raycaster.far = 280;
  const h = raycaster.intersectObjects(solidMeshes, false)[0];
  support.valid = !!h;
  if (h) {
    support.target.copy(h.point);
    support.dist = h.point.distanceTo(player.pos);
    marker.position.copy(h.point).addScaledVector(UP, 0.08);
    marker.lookAt(h.point.clone().add(UP));
    marker.rotation.z += dt;
    marker.visible = true;
    const from = camera.localToWorld(new THREE.Vector3(0.12, -0.15, -0.4));
    beam.position.copy(from);
    beam.lookAt(h.point);
    beam.scale.set(0.02, 0.02, from.distanceTo(h.point));
  } else marker.visible = false;
  if (!input.fire) support.fireLatch = false;
  if (!input.aim) support.aimLatch = false;
  if (input.fire && !support.fireLatch) { support.fireLatch = true; confirmStrike(); }
  if (input.aim && !support.aimLatch) cancelStrike();
}
export const uavActive = () => support.uavT > 0;
