// Skin: one closed shell around the whole body, built from signed-distance shapes. Limbs follow the bone
// centre lines, the head is the skull and jaw grown outward plus nose, ears, lips and eyelids, and hands and feet
// are a close-fitting offset around their bones. Left side is built once and mirrored.
import { sphere, ell, rc, union, sub, smin, smax, mirrorX, tube, meshSDF } from './sdf.js';
import { skullField, mandible } from './shapes_head.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bounded = (f, c, R) => { f.bc = c; f.bR = R; return f; };

// offset field around a set of bones: splat (distance - radius) from subsampled bone vertices into a small grid
// over the group's bounding box, then read it back with trilinear interpolation
function cloudField(groups, h = 0.34) {
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; let maxR = 0;
  const pts = [];
  for (const g of groups) {
    const P = g.pos, n = P.length / 3, step = Math.max(1, Math.floor(n / 450));
    maxR = Math.max(maxR, g.r);
    for (let v = 0; v < n; v += step) { const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2]; pts.push(x, y, z, g.r); for (let k = 0; k < 3; k++) { const q = P[3 * v + k]; if (q < mn[k]) mn[k] = q; if (q > mx[k]) mx[k] = q; } }
  }
  const M = maxR + 1.4;
  const o = mn.map((v) => v - M), nx = Math.ceil((mx[0] - mn[0] + 2 * M) / h) + 1, ny = Math.ceil((mx[1] - mn[1] + 2 * M) / h) + 1, nz = Math.ceil((mx[2] - mn[2] + 2 * M) / h) + 1;
  const G = new Float32Array(nx * ny * nz).fill(1.4);
  for (let q = 0; q < pts.length; q += 4) {
    const x = pts[q], y = pts[q + 1], z = pts[q + 2], r = pts[q + 3], R = r + 1.4;
    const i0 = Math.max(0, Math.floor((x - R - o[0]) / h)), i1 = Math.min(nx - 1, Math.ceil((x + R - o[0]) / h));
    const j0 = Math.max(0, Math.floor((y - R - o[1]) / h)), j1 = Math.min(ny - 1, Math.ceil((y + R - o[1]) / h));
    const k0 = Math.max(0, Math.floor((z - R - o[2]) / h)), k1 = Math.min(nz - 1, Math.ceil((z + R - o[2]) / h));
    for (let k = k0; k <= k1; k++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = o[0] + i * h - x, dy = o[1] + j * h - y, dz = o[2] + k * h - z;
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
      const id = i + nx * (j + ny * k); if (d < G[id]) G[id] = d;
    }
  }
  const lo = o, hi = [o[0] + (nx - 1) * h, o[1] + (ny - 1) * h, o[2] + (nz - 1) * h];
  const f = (x, y, z) => {
    if (x < lo[0] || x > hi[0] || y < lo[1] || y > hi[1] || z < lo[2] || z > hi[2]) {
      const dx = Math.max(lo[0] - x, 0, x - hi[0]), dy = Math.max(lo[1] - y, 0, y - hi[1]), dz = Math.max(lo[2] - z, 0, z - hi[2]);
      return Math.hypot(dx, dy, dz) + 1.4;
    }
    const fx = (x - lo[0]) / h, fy = (y - lo[1]) / h, fz = (z - lo[2]) / h;
    const i = Math.min(nx - 2, Math.floor(fx)), j = Math.min(ny - 2, Math.floor(fy)), k = Math.min(nz - 2, Math.floor(fz));
    const u = fx - i, v = fy - j, w = fz - k, s0 = i + nx * (j + ny * k), sy = nx, sz = nx * ny;
    const c00 = G[s0] * (1 - u) + G[s0 + 1] * u, c10 = G[s0 + sy] * (1 - u) + G[s0 + sy + 1] * u, c01 = G[s0 + sz] * (1 - u) + G[s0 + sz + 1] * u, c11 = G[s0 + sy + sz] * (1 - u) + G[s0 + sy + sz + 1] * u;
    return (c00 * (1 - v) + c10 * v) * (1 - w) + (c01 * (1 - v) + c11 * v) * w;
  };
  const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
  return bounded(f, c, Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 + M);
}

// elliptical torso: rx, back and front z per height
const TORSO = [[82, 13.2, -11.8, 10.4], [90, 15.6, -13.4, 11.4], [98, 16.0, -12.8, 11.4], [106, 14.8, -12.0, 11.0], [114, 14.4, -12.8, 10.4], [122, 15.4, -14.0, 9.8], [130, 15.9, -15.0, 10.0], [138, 15.2, -14.6, 9.2], [144, 12.6, -12.4, 7.6], [149, 7.2, -9.0, 6.6], [153, 5.6, -7.2, 6.0]];
function torsoField() {
  const at = (y) => {
    let i = 1; while (i < TORSO.length - 1 && TORSO[i][0] < y) i++;
    const a = TORSO[i - 1], b = TORSO[i], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1), L = (k) => a[k] + (b[k] - a[k]) * t;
    return { rx: L(1), zc: (L(2) + L(3)) / 2, rz: (L(3) - L(2)) / 2 };
  };
  const f = (x, y, z) => {
    const e = at(clamp(y, 82, 153));
    const rho = Math.hypot(x / e.rx, (z - e.zc) / e.rz);
    const side = (rho - 1) * Math.min(e.rx, e.rz);
    const cap = Math.max(82 - y, y - 153);
    return smax(side, cap, 2.0);
  };
  return bounded(f, [0, 117, -1], 48);
}

export function buildSkin(ctx, H) {
  const { V3, centerline, paint } = H;
  const P = (id) => ctx.pos(id);
  const SKT = [0, 163, -0.5];
  const world = (p) => [p[0] + SKT[0], p[1] + SKT[1], p[2] + SKT[2]];

  // ---------------- head ----------------
  const skull = skullField();
  const jaw = mandible().f;
  const T = 0.95;                                                         // skin and soft tissue over bone
  const cheek = union(1.6, ell(world([4.3, -3.6, 5.2]), [2.1, 3.7, 4.0]), ell(world([-4.3, -3.6, 5.2]), [2.1, 3.7, 4.0]));
  const lips = union(0.6, ell(world([0, -5.3, 10.0]), [2.5, 0.9, 1.15]), ell(world([0, -6.5, 9.9]), [2.2, 0.85, 1.05]));
  const nose = union(0.9, ell(world([0, 1.2, 10.3]), [0.85, 2.0, 1.2]), ell(world([0, -1.6, 11.3]), [1.45, 1.2, 1.5]), ell(world([1.35, -2.0, 10.5]), [0.9, 0.9, 1.0]), ell(world([-1.35, -2.0, 10.5]), [0.9, 0.9, 1.0]));
  const eyelids = union(0.4, ell(world([3.4, 1.7, 7.4]), [2.3, 2.0, 1.6]), ell(world([-3.4, 1.7, 7.4]), [2.3, 2.0, 1.6]));
  const ears = union(0.4, ell(world([7.6, 0.2, -1.7]), [0.55, 2.5, 1.5], [0, -12, 8]), ell(world([-7.6, 0.2, -1.7]), [0.55, 2.5, 1.5], [0, 12, -8]));
  const neckCol = rc([0, 156.5, -1.6], [0, 145.5, 0.4], 5.0, 5.8);
  // fill the mouth gap and the eye sockets, then add the soft features
  const headField = (x, y, z) => {
    let d = skull(x - SKT[0], y - SKT[1], z - SKT[2]) - T;
    d = smin(d, jaw(x - SKT[0], y - SKT[1], z - SKT[2]) - T, 1.6);
    d = smin(d, cheek(x, y, z), 1.6);
    d = smin(d, lips(x, y, z), 0.7);
    d = smin(d, nose(x, y, z), 0.9);
    d = smin(d, eyelids(x, y, z), 0.6);
    d = smin(d, ears(x, y, z), 0.5);
    d = smin(d, neckCol(x, y, z), 2.2);
    // close the cranial base and the orbit/nasal cavities seen from inside
    d = smax(d, -(y - 150.0), 1.0);
    return d;
  };
  bounded(headField, [0, 163, 2], 24);

  // ---------------- limbs (left, mirrored) ----------------
  const hum = centerline(P('humerus-L'), 7, 0.0, 1.0), rad = centerline(P('radius-L'), 5, 0.0, 1.0);
  const fem = centerline(P('femur-L'), 8, 0.0, 1.0), tib = centerline(P('tibia-L'), 7, 0.0, 1.0);
  const A = V3.add;
  const armPts = [A(hum[0], [-0.8, 3.0, 0]), A(hum[0], [0.4, 0.5, 0]), ...hum.slice(1, -1).map((p) => A(p, [-0.2, 0, 0.2])), A(hum[hum.length - 1], [0, -0.4, 0.4]), ...rad.slice(1).map((p) => A(p, [-0.1, 0, 0.5]))];
  const armR = [4.2, 5.6, 5.2, 4.7, 4.5, 4.2, 4.0, 3.9, 3.5, 3.1, 2.8, 2.5, 2.3];
  const arm = tube(armPts, armPts.map((_, i) => armR[Math.min(i, armR.length - 1)]), 1.0);
  const legPts = [A(fem[0], [-1.5, 3.0, 0.4]), A(fem[0], [0.2, 0, 0.9]), ...fem.slice(1, -1).map((p) => A(p, [0.2, 0, 0.9])), A(fem[fem.length - 1], [0.2, -0.6, 0.9]), A(tib[0], [-0.1, 0, -0.6]), ...tib.slice(1).map((p) => A(p, [-0.3, 0, -0.6]))];
  const legR = [7.2, 8.0, 7.2, 6.6, 6.2, 5.8, 5.4, 5.0, 4.6, 4.6, 5.4, 5.0, 4.6, 4.0, 3.5, 3.0, 2.8];
  const leg = tube(legPts, legPts.map((_, i) => legR[Math.min(i, legR.length - 1)]), 1.2);

  // ---------------- hands and feet ----------------
  const ids = ctx.ids();
  const pick = (re) => ids.filter((i) => re.test(i)).map((i) => P(i));
  const handG = [
    ...pick(/^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)-L$/).map((pos) => ({ pos, r: 1.9 })),
    ...pick(/^metacarpal-\d-L$/).map((pos) => ({ pos, r: 1.45 })),
    ...pick(/^finger-\d-(prox|mid|dist)-L$/).map((pos) => ({ pos, r: 1.05 })),
  ];
  const hand = cloudField(handG);
  const footG = [
    ...pick(/^(talus|calcaneus)-L$/).map((pos) => ({ pos, r: 2.3 })),
    ...pick(/^(navicular|cuboid|cuneiform-medial|cuneiform-intermediate|cuneiform-lateral)-L$/).map((pos) => ({ pos, r: 1.9 })),
    ...pick(/^metatarsal-\d-L$/).map((pos) => ({ pos, r: 1.5 })),
    ...pick(/^toe-\d-(prox|mid|dist)-L$/).map((pos) => ({ pos, r: 1.1 })),
  ];
  const foot0 = cloudField(footG);
  const foot = bounded((x, y, z) => smax(foot0(x, y, z), -y, 0.5), foot0.bc, foot0.bR);   // flat sole on the floor

  const sym = (f) => bounded(mirrorX(f), [0, f.bc[1], f.bc[2]], Math.hypot(Math.abs(f.bc[0]) + f.bR, f.bR));
  const body = union(1.8, torsoField(), headField, sym(arm), sym(leg), sym(hand), sym(foot));
  const mesh = meshSDF(body, [-36, -1, -17], [36, 178.5, 20], 0.36, { bump: { amp: 0.012, freq: 3 } });
  // colour: skin tone, rosier lips, a little shade at the ends of the limbs
  const tone = 0xefc3a0, lip = 0xc97b7a;
  const lipC = [0, 157.5, 9.9];
  paint(mesh, tone, 0.035, (p) => { const dx = p[0] - lipC[0], dy = p[1] - lipC[1], dz = p[2] - lipC[2]; return (dx / 2.8) ** 2 + (dy / 1.7) ** 2 + (dz / 2.2) ** 2 < 1 && dz > 0 ? H.rgb(lip) : null; });
  return mesh;
}
