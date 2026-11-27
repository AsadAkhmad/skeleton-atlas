// Cartilage that is not part of the 206 bones: intervertebral discs, pubic symphysis, knee menisci,
// nose and jaw-joint cartilage (built from fixed landmarks), plus thin articular cartilage caps found
// automatically wherever two bones come close together (every synovial joint in the model).
import { mergeMeshes, mirrorMesh, transformMesh, matFrom } from './sdf.js';
import { loft, ellipsoidMesh } from './meshutil.js';
import { POSES } from './layout.js';
import { bodyDims } from './shapes_axial.js';

const { vertPose, SK_T } = POSES;
const D = Math.PI / 180;

// ---------- rounded disc (lathe around local y, elliptical in x/z), tilted about x ----------
function discMesh(c, rx, rz, h, tiltDeg, seg = 40) {
  const prof = [[0, 1], [0.72, 1], [0.93, 0.94], [1.0, 0.55], [1.045, 0], [1.0, -0.55], [0.93, -0.94], [0.72, -1], [0, -1]];
  const t = tiltDeg * D, ct = Math.cos(t), st = Math.sin(t);
  const pos = [], nor = [], idx = [];
  const rot = (x, y, z) => [x, y * ct - z * st, y * st + z * ct];
  for (let j = 0; j < prof.length; j++) {
    const [rf, yf] = prof[j];
    const a = prof[Math.max(0, j - 1)], b = prof[Math.min(prof.length - 1, j + 1)];
    // profile tangent -> outward normal in (radial, y)
    let tr = (b[0] - a[0]) * 1.0, ty = (b[1] - a[1]) * h;
    const tl = Math.hypot(tr, ty) || 1; tr /= tl; ty /= tl;
    const nr = ty, ny = -tr;
    for (let i = 0; i <= seg; i++) {
      const ph = (i / seg) * Math.PI * 2, cp = Math.cos(ph), sp = Math.sin(ph);
      const p = rot(rf * rx * cp, yf * h, rf * rz * sp);
      pos.push(c[0] + p[0], c[1] + p[1], c[2] + p[2]);
      let nx = nr * cp / rx, nz = nr * sp / rz, nyy = ny / Math.max(h, 0.01);
      if (j === 0) { nx = 0; nz = 0; nyy = 1; } else if (j === prof.length - 1) { nx = 0; nz = 0; nyy = -1; }
      const q = rot(nx, nyy, nz), l = Math.hypot(...q) || 1;
      nor.push(q[0] / l, q[1] / l, q[2] / l);
    }
  }
  const row = seg + 1;
  for (let j = 0; j < prof.length - 1; j++) for (let i = 0; i < seg; i++) {
    const p = j * row + i, q = p + row;
    idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) };
}

// ---------- intervertebral discs ----------
const SPINE = ['C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'S1'];
const dimsOf = (n) => {
  if (n === 'C2') return { bw: 2.0, bd: 1.6, bh: 1.4 };
  if (n === 'S1') return { bw: 4.9, bd: 3.6, bh: 3.0 };
  return bodyDims(n[0], +n.slice(1));
};
function discs() {
  const out = [];
  for (let i = 0; i < SPINE.length - 1; i++) {
    const u = SPINE[i], l = SPINE[i + 1];
    const pu = vertPose(u), pl = vertPose(l);
    const du = dimsOf(u), dl = dimsOf(l);
    const gap = (pu.y - pl.y) - (du.bh + dl.bh) / 2;
    const h = Math.max(0.2, gap / 2 + 0.12);
    const c = [0, (pu.y + pl.y) / 2, (pu.z + pl.z) / 2];
    // the disc sits between the bodies; widen a little at the lumbar levels where the nucleus bulges
    const rx = ((du.bw + dl.bw) / 4) * 0.97, rz = ((du.bd + dl.bd) / 4) * 0.97;
    const mesh = discMesh(c, rx, rz, h, (pu.tilt + pl.tilt) / 2);
    out.push({ id: `disc-${u}-${l}`, kind: 'cartilage', mesh, owners: [u, l === 'S1' ? 'sacrum' : l] });
  }
  return out;
}

// ---------- pubic symphysis ----------
function symphysis() {
  const m = ellipsoidMesh([0, 88.6, 8.25], [0.72, 1.7, 1.15], null, 20);
  return [{ id: 'symphysis', kind: 'cartilage', mesh: m, owners: ['hip-bone-L', 'hip-bone-R'] }];
}

// ---------- knee menisci (left built, right mirrored) ----------
function arcPath(c, ax, az, a0, a1, n = 44) {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * (i / n)) * D; p.push([c[0] + ax * Math.cos(a), c[1], c[2] + az * Math.sin(a)]); }
  return p;
}
function menisci() {
  const y = 46.45;
  const sec = (t) => { const e = Math.min(1, 0.3 + 0.7 * Math.min(t * 7, (1 - t) * 7)); return [0.3 * e, 0.58 * e]; };
  const med = loft(arcPath([5.4, y, -0.3], 1.35, 2.1, 28, 332), sec, { K: 12, capN: 3, hint: [0, 1, 0] });
  const lat = loft(arcPath([9.2, y, -0.3], 1.4, 1.85, 208, 512), sec, { K: 12, capN: 3, hint: [0, 1, 0] });
  const L = mergeMeshes([med, lat]);
  return [
    { id: 'menisci-L', kind: 'cartilage', mesh: L, owners: ['tibia-L'] },
    { id: 'menisci-R', kind: 'cartilage', mesh: mirrorMesh(L), owners: ['tibia-R'] },
  ];
}

// ---------- nose and jaw joint (skull-local landmarks -> world) ----------
function head() {
  const E = (c, r, rot) => ellipsoidMesh(c, r, rot, 16);
  const nose = mergeMeshes([
    E([0, -0.5, 11.3], [0.16, 1.55, 1.7]),                       // septal cartilage
    E([1.05, 0.2, 10.75], [0.22, 1.3, 1.05], [0, 0, -18]),      // lateral nasal cartilage
    E([-1.05, 0.2, 10.75], [0.22, 1.3, 1.05], [0, 0, 18]),
    E([1.15, -1.35, 11.35], [0.5, 0.34, 0.62], [0, 20, 0]),     // alar cartilages
    E([-1.15, -1.35, 11.35], [0.5, 0.34, 0.62], [0, -20, 0]),
    E([0, -1.55, 12.3], [0.55, 0.4, 0.42]),                      // nasal tip
  ]);
  const tmj = mergeMeshes([E([5.3, -1.0, 0.35], [0.95, 0.14, 0.75]), E([-5.3, -1.0, 0.35], [0.95, 0.14, 0.75])]);
  return [
    { id: 'nose-cartilage', kind: 'cartilage', mesh: transformMesh(nose, SK_T), owners: ['nasal-L', 'nasal-R'] },
    { id: 'tmj-discs', kind: 'cartilage', mesh: transformMesh(tmj, SK_T), owners: ['mandible'] },
  ];
}

export function staticCartilage() {
  return [...discs(), ...symphysis(), ...menisci(), ...head()];
}

// ---------- articular cartilage caps ----------
// bones: [{ id, region, positions, normals, indices }] in world space.
// Returns [{ id, owner, mesh }]: one thin cartilage skin per bone, on the faces that lie within a joint-width of another bone.
export function articularCaps(bones, opts = {}) {
  const R = opts.radius || 0.5, CELL = R, R2 = R * R;
  const key = (x, y, z) => (Math.floor(x / CELL) + 2048) * 16777216 + (Math.floor(y / CELL) + 2048) * 4096 + (Math.floor(z / CELL) + 2048);
  const grid = new Map(); // cell -> flat [bone, x, y, z, ...]
  const owners = new Map(); // cell -> first bone index; -1 once shared
  bones.forEach((b, bi) => {
    const P = b.positions, n = P.length / 3, step = Math.max(1, Math.ceil(n / 20000));
    for (let i = 0; i < n; i += step) {
      const x = P[3 * i], y = P[3 * i + 1], z = P[3 * i + 2], k = key(x, y, z);
      let arr = grid.get(k); if (!arr) { arr = []; grid.set(k, arr); owners.set(k, bi); } else if (owners.get(k) !== bi) owners.set(k, -1);
      arr.push(bi, x, y, z);
    }
  });
  // cells that hold two bones, dilated by one cell: only vertices here can touch another bone
  const hot = new Set();
  for (const [k, o] of owners) if (o === -1) for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) hot.add(k + dx * 16777216 + dy * 4096 + dz);
  // skull bones meet in sutures (fibrous), not cartilage; the jaw joint and the atlas/occipital joint are real joints
  const skipPair = (a, b) => a.region === 'Skull' && b.region === 'Skull' && a.id !== 'mandible' && b.id !== 'mandible';
  const out = [];
  bones.forEach((b, bi) => {
    const P = b.positions, N = b.normals, I = b.indices, nv = P.length / 3;
    const flag = new Uint8Array(nv);
    let any = false;
    for (let v = 0; v < nv; v++) {
      const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
      if (!hot.has(key(x, y, z))) continue;
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), cz = Math.floor(z / CELL);
      let hit = false;
      for (let dx = -1; dx <= 1 && !hit; dx++) for (let dy = -1; dy <= 1 && !hit; dy++) for (let dz = -1; dz <= 1 && !hit; dz++) {
        const arr = grid.get((cx + dx + 2048) * 16777216 + (cy + dy + 2048) * 4096 + (cz + dz + 2048));
        if (!arr) continue;
        for (let j = 0; j < arr.length; j += 4) {
          const bj = arr[j]; if (bj === bi) continue;
          if (skipPair(b, bones[bj])) continue;
          const ox = arr[j + 1] - x, oy = arr[j + 2] - y, oz = arr[j + 3] - z;
          if (ox * ox + oy * oy + oz * oz < R2) { hit = true; break; }
        }
      }
      if (hit) { flag[v] = 1; any = true; }
    }
    if (!any) return;
    // faces whose three corners all lie in a joint zone
    const tri = [];
    for (let t = 0; t < I.length; t += 3) if (flag[I[t]] && flag[I[t + 1]] && flag[I[t + 2]]) tri.push(I[t], I[t + 1], I[t + 2]);
    if (tri.length < 3 * 30) return;
    // drop tiny islands (spinous-process tips, stray contacts)
    const par = new Map(); const find = (a) => { let r = a; while (par.get(r) !== r) r = par.get(r); while (par.get(a) !== r) { const nx = par.get(a); par.set(a, r); a = nx; } return r; };
    const unite = (a, c) => { a = find(a); c = find(c); if (a !== c) par.set(c, a); };
    for (let i = 0; i < tri.length; i++) if (!par.has(tri[i])) par.set(tri[i], tri[i]);
    for (let i = 0; i < tri.length; i += 3) { unite(tri[i], tri[i + 1]); unite(tri[i], tri[i + 2]); }
    const cnt = new Map(); for (let i = 0; i < tri.length; i += 3) { const r = find(tri[i]); cnt.set(r, (cnt.get(r) || 0) + 1); }
    const keep = []; for (let i = 0; i < tri.length; i += 3) if (cnt.get(find(tri[i])) >= 40) keep.push(tri[i], tri[i + 1], tri[i + 2]);
    if (keep.length < 3 * 40) return;
    // size-scaled thickness
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    const st = Math.max(1, Math.floor(nv / 800));
    for (let v = 0; v < nv; v += st) for (let k = 0; k < 3; k++) { const q = P[3 * v + k]; if (q < mn[k]) mn[k] = q; if (q > mx[k]) mx[k] = q; }
    const dim = Math.max(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]);
    const th = dim > 25 ? 0.28 : dim > 12 ? 0.2 : dim > 5 ? 0.14 : 0.09;
    const map = new Map(), pos = [], nor = [], idx = [];
    for (const v of keep) {
      let m = map.get(v);
      if (m === undefined) { m = pos.length / 3; map.set(v, m); pos.push(P[3 * v] + N[3 * v] * th, P[3 * v + 1] + N[3 * v + 1] * th, P[3 * v + 2] + N[3 * v + 2] * th); nor.push(N[3 * v], N[3 * v + 1], N[3 * v + 2]); }
      idx.push(m);
    }
    out.push({ id: 'cap-' + b.id, kind: 'cartilage', owner: b.id, mesh: { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) } });
  });
  return out;
}
