/* 地面单位建筑碰撞：圆形近似 + 推出 + 小角度转向滑动。
   只处理建筑，不处理单位互撞，避免挤在一起时抖动。 */

const extraObstacles = [];

/* 虫巢等不在 buildings 里的大型静态障碍，注册后所有 nav 实例共用 */
export function addExtraObstacle(o){
  if (o && o.center && o.radius) extraObstacles.push(o);
}

export function removeExtraObstacle(center){
  if (!center) return;
  for (let i = extraObstacles.length - 1; i >= 0; i--){
    const o = extraObstacles[i];
    if (o.center && Math.hypot(o.center.x - center.x, o.center.z - center.z) < 0.01){
      extraObstacles.splice(i, 1);
    }
  }
}

export function createGroundNav(buildings){
  /* 直接引用建筑数组：玩家新建的建筑 push 进来后立即生效 */
  const list = buildings || [];
  const R = (b) => b.radius || 10;

  function blocked(x, z, rad = 0.75){
    for (const b of list){
      if (!b || !b.center) continue;
      const dx = x - b.center.x, dz = z - b.center.z;
      const rr = R(b) + rad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    for (const b of extraObstacles){
      const dx = x - b.center.x, dz = z - b.center.z;
      const rr = b.radius + rad;
      if (dx * dx + dz * dz < rr * rr) return true;
    }
    return false;
  }

  function resolve(pos, rad = 0.75){
    let hit = false;
    for (let pass = 0; pass < 2; pass++){
      for (const b of list){
        if (!b || !b.center) continue;
        const dx = pos.x - b.center.x, dz = pos.z - b.center.z;
        const rr = R(b) + rad;
        const d = Math.hypot(dx, dz);
        if (d >= rr) continue;
        if (d < 0.001){
          pos.x = b.center.x + rr; pos.z = b.center.z;
        } else {
          pos.x = b.center.x + dx / d * rr;
          pos.z = b.center.z + dz / d * rr;
        }
        hit = true;
      }
      for (const b of extraObstacles){
        const dx = pos.x - b.center.x, dz = pos.z - b.center.z;
        const rr = b.radius + rad;
        const d = Math.hypot(dx, dz);
        if (d >= rr) continue;
        if (d < 0.001){
          pos.x = b.center.x + rr; pos.z = b.center.z;
        } else {
          pos.x = b.center.x + dx / d * rr;
          pos.z = b.center.z + dz / d * rr;
        }
        hit = true;
      }
    }
    return hit;
  }

  /* 朝目标位移；正面被挡时依次尝试小角度绕行，最后兜底推出。 */
  function step(pos, dx, dz, rad = 0.75){
    if (!dx && !dz) return false;
    /* 已经被挤进建筑圈内时，先推回边界，否则所有候选点都在圈里，会原地顶墙 */
    if (blocked(pos.x, pos.z, rad)) resolve(pos, rad);
    if (!blocked(pos.x + dx, pos.z + dz, rad)){
      pos.x += dx; pos.z += dz;
      return true;
    }
    const len = Math.hypot(dx, dz);
    const base = Math.atan2(dx, dz);
    for (const a of [0.32, -0.32, 0.64, -0.64, 0.96, -0.96, 1.28, -1.28, 1.6, -1.6, 1.92, -1.92]){
      const yaw = base + a;
      const nx = pos.x + Math.sin(yaw) * len;
      const nz = pos.z + Math.cos(yaw) * len;
      if (blocked(nx, nz, rad)) continue;
      pos.x = nx; pos.z = nz;
      return true;
    }
    /* 小步长下候选点仍在墙里时，用略大的切向步长沿墙滑出去，避免原地顶墙 */
    const probe = Math.max(len, 0.24);
    for (const a of [Math.PI / 2, -Math.PI / 2, 2.2, -2.2]){
      const yaw = base + a;
      const nx = pos.x + Math.sin(yaw) * probe;
      const nz = pos.z + Math.cos(yaw) * probe;
      if (blocked(nx, nz, rad)) continue;
      pos.x = nx; pos.z = nz;
      return true;
    }
    pos.x += dx; pos.z += dz;
    resolve(pos, rad);
    return false;
  }

  return { blocked, resolve, step };
}
