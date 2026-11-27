// Skin: a closed shell around the whole body, male or female. The body (torso, limbs, hands, feet, external genitalia,
// breasts) is meshed coarsely; the head and neck are meshed separately at a much finer resolution so the face keeps
// its features: brow, eyelids, nose with nostrils, lips with a philtrum, chin, cheeks, ears with a lobe, and a hairline.
// Limbs follow the bone centre lines; hands and feet are an offset around their bones.
import { sphere, ell, rc, union, smin, smax, mirrorX, tube, meshSDF, mergeMeshes } from './sdf.js';
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
    for (let v = 0; v < n; v += step) { pts.push(P[3 * v], P[3 * v + 1], P[3 * v + 2], g.r); for (let k = 0; k < 3; k++) { const q = P[3 * v + k]; if (q < mn[k]) mn[k] = q; if (q > mx[k]) mx[k] = q; } }
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

// a smooth swept capsule along a path with per-point radii, baked into a grid (much faster than a union of many capsules)
function chainField(path, radii, h = 0.4) {
  const pts = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(1, Math.ceil(L / 0.3));
    for (let s = 0; s < n; s++) { const t = s / n; pts.push(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, radii[i] + (radii[i + 1] - radii[i]) * t); }
  }
  const e = path[path.length - 1]; pts.push(e[0], e[1], e[2], radii[radii.length - 1]);
  const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; let maxR = 0;
  for (let q = 0; q < pts.length; q += 4) { for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], pts[q + k]); mx[k] = Math.max(mx[k], pts[q + k]); } maxR = Math.max(maxR, pts[q + 3]); }
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
  return bounded(f, [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2], Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]) / 2 + M);
}

// elliptical torso: rx, back and front z per height
const TORSO = {
  male: [[82, 13.2, -11.8, 10.4], [90, 15.6, -13.4, 11.4], [98, 16.0, -12.8, 11.4], [106, 14.8, -12.0, 11.0], [114, 14.4, -12.8, 10.4], [122, 15.4, -14.0, 9.8], [130, 15.9, -15.0, 10.0], [138, 15.2, -14.6, 9.2], [144, 12.6, -12.4, 7.6], [147, 9.0, -10.4, 6.8], [149.5, 5.0, -8.2, 5.6], [153, 4.0, -6.8, 5.0]],
  female: [[82, 13.8, -12.4, 10.8], [90, 16.4, -14.4, 11.8], [97, 17.2, -13.8, 11.8], [105, 14.2, -12.2, 10.8], [113, 13.4, -12.2, 9.9], [121, 14.0, -13.4, 9.4], [130, 14.3, -14.2, 9.6], [138, 13.6, -13.6, 8.9], [144, 11.4, -11.8, 7.4], [147, 8.4, -10.0, 6.6], [149.5, 4.6, -8.0, 5.4], [153, 3.8, -6.6, 4.8]],
};
function torsoField(sex) {
  const T = TORSO[sex];
  const at = (y) => {   // Catmull-Rom through the rows, so the body outline has no creases at the table heights
    let i = 1; while (i < T.length - 1 && T[i][0] < y) i++;
    const a = T[i - 1], b = T[i], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
    const p0 = T[Math.max(0, i - 2)], p3 = T[Math.min(T.length - 1, i + 1)];
    const L = (k) => 0.5 * ((2 * a[k]) + (-p0[k] + b[k]) * t + (2 * p0[k] - 5 * a[k] + 4 * b[k] - p3[k]) * t * t + (-p0[k] + 3 * a[k] - 3 * b[k] + p3[k]) * t * t * t);
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

const TONE = 0xefc3a0, LIP = 0xc9787a, BROW = 0x3a2a22, HAIR = 0x3b2b23;

export function buildSkin(ctx, H) {
  const { V3, centerline, paint, rgb } = H;
  const sex = ctx.sex === 'female' ? 'female' : 'male', F = sex === 'female';
  const P = (id) => ctx.pos(id);
  const SKT = [0, 163, -0.5];
  const W = (p) => [p[0] + SKT[0], p[1] + SKT[1], p[2] + SKT[2]];
  const A = V3.add;

  // ============================================================ head and neck (fine mesh)
  const skull = skullField(), jaw = mandible().f;
  const Tc = F ? 1.05 : 0.95, Tj = F ? 0.85 : 1.0;
  const m = (a, b) => (F ? a : b);                                         // female / male value
  const cheek = union(1.8, ell(W([4.3, -3.4, 5.2]), [m(2.3, 2.1), 3.6, 4.0]), ell(W([-4.3, -3.4, 5.2]), [m(2.3, 2.1), 3.6, 4.0]));
  const brow = union(0.7, ell(W([2.8, 3.95, 9.5]), [2.5, m(0.5, 0.75), 0.9], [0, -8, 0]), ell(W([-2.8, 3.95, 9.5]), [2.5, m(0.5, 0.75), 0.9], [0, 8, 0]), ell(W([0, 3.7, 9.9]), [1.1, 0.7, 0.6]));
  const nose = union(0.8,
    ell(W([0, 1.4, 10.1]), [0.8, 2.0, 1.15]),                              // bridge
    ell(W([0, -1.1, 11.0]), [0.95, 1.5, 1.35]),                            // dorsum to tip
    ell(W([0, -2.0, 12.0]), [1.2, 0.95, 1.1]),                             // tip
    ell(W([1.25, -2.0, 10.3]), [0.85, 0.85, 1.0]), ell(W([-1.25, -2.0, 10.3]), [0.85, 0.85, 1.0]),   // alae
    ell(W([0, -2.7, 10.7]), [0.45, 0.5, 0.6]));                             // columella and base
  const lips = union(0.45,
    ell(W([1.15, -5.35, 9.95]), [1.35, 0.78, 1.0]), ell(W([-1.15, -5.35, 9.95]), [1.35, 0.78, 1.0]),   // upper lip (two halves leave the philtrum)
    ell(W([0, -6.65, 9.95]), [m(2.05, 2.15), 0.85, 1.05]),                                              // lower lip
    ell(W([0, -4.5, 9.8]), [0.95, 0.7, 0.55]));                                                         // philtrum area
  const chin = ell(W([0, -8.1, 9.6]), [m(1.5, 1.95), 1.15, 0.95]);
  const lids = union(0.4, ell(W([3.4, 1.9, 7.4]), [2.35, 1.95, 1.6]), ell(W([-3.4, 1.9, 7.4]), [2.35, 1.95, 1.6]));
  const ear = (s) => {
    const c = W([s * 7.45, 0.1, -1.9]);
    const base = ell(c, [0.5, 2.7, 1.7], [0, 0, s * -6]);
    const lobe = ell(W([s * 7.5, -2.4, -1.5]), [0.5, 0.7, 0.6]);
    return (x, y, z) => smin(base(x, y, z), lobe(x, y, z), 0.5);
  };
  const earR = ear(1), earL = ear(-1);
  const concha = (s) => ell(W([s * 7.95, 0.1, -1.7]), [0.45, 1.3, 0.75]);
  const conchaR = concha(1), conchaL = concha(-1);
  const neckR = m(4.7, 5.2);
  const neck = rc([0, 158.0, -1.7], [0, 143.0, 0.7], neckR, neckR + 0.7);
  const floorFill = ell(W([0, -4.8, 2.0]), [4.6, 3.0, 6.0]);
  const apple = F ? null : ell([0, 152.6, 5.0], [0.75, 1.2, 0.9]);        // Adam's apple
  const nostrils = union(0.1, ell(W([0.7, -2.45, 10.75]), [0.36, 0.3, 0.65], [30, 0, 0]), ell(W([-0.7, -2.45, 10.75]), [0.36, 0.3, 0.65], [30, 0, 0]));
  const mouthLine = ell(W([0, -6.0, 10.75]), [2.15, 0.09, 0.55]);
  const lidSlit = union(0.1, ell(W([3.45, 1.55, 8.75]), [1.45, 0.11, 0.55]), ell(W([-3.45, 1.55, 8.75]), [1.45, 0.11, 0.55]));
  const headField = (x, y, z) => {
    const qx = x - SKT[0], qy = y - SKT[1], qz = z - SKT[2];
    let d = skull(qx, qy, qz) - Tc;
    d = smin(d, jaw(qx, qy, qz) - Tj, 1.6);
    d = smin(d, floorFill(x, y, z), 1.5);
    d = smin(d, cheek(x, y, z), 1.8);
    d = smin(d, brow(x, y, z), 0.8);
    d = smin(d, chin(x, y, z), 1.0);
    d = smin(d, nose(x, y, z), 0.9);
    d = smin(d, lips(x, y, z), 0.5);
    d = smin(d, lids(x, y, z), 0.6);
    d = smin(d, earR(x, y, z), 0.4); d = smin(d, earL(x, y, z), 0.4);
    d = smin(d, neck(x, y, z), 2.4);
    if (apple) d = smin(d, apple(x, y, z), 0.5);
    d = smax(d, -nostrils(x, y, z), 0.14);
    d = smax(d, -mouthLine(x, y, z), 0.07);
    d = smax(d, -lidSlit(x, y, z), 0.07);
    d = smax(d, -conchaR(x, y, z), 0.2); d = smax(d, -conchaL(x, y, z), 0.2);
    d = smax(d, -(y - 143.5), 1.0);                                         // cut under the shoulders; the body mesh takes over
    return d;
  };
  bounded(headField, [0, 163, 2], 26);
  const tH = performance.now();
  const head = meshSDF(headField, [-11.5, 143, -12.5], [11.5, 178.5, 17.5], 0.16, { bump: { amp: 0.01, freq: 4 } });
  const HL = [[11, 171.2], [8.5, 170.4], [5, 169.0], [3, 167.6], [0.5, 166.2], [-2, 164.6], [-5, 161.8], [-8, 160.0], [-12, 158.0]];
  const hairLine = (z) => { if (z >= HL[0][0]) return HL[0][1]; for (let i = 1; i < HL.length; i++) if (z >= HL[i][0]) { const t = (z - HL[i][0]) / (HL[i - 1][0] - HL[i][0]); return HL[i][1] + (HL[i - 1][1] - HL[i][1]) * t; } return HL[HL.length - 1][1]; };
  const lipU = W([0, -5.35, 9.5]), lipL = W([0, -6.65, 9.4]);
  paint(head, TONE, 0.03, (p) => {
    const x = Math.abs(p[0]), y = p[1], z = p[2];
    // lips
    if (z > 8.6 && (((x / 2.7) ** 2 + ((y - lipU[1]) / 0.95) ** 2 < 1) || ((x / 2.5) ** 2 + ((y - lipL[1]) / 1.0) ** 2 < 1))) return rgb(LIP);
    // eyebrows
    if (z > 8.4 && x > 0.9 && x < 5.2 && Math.abs(y - (167.0 + 0.22 * Math.min(x, 3.2) - 0.1 * Math.max(0, x - 3.2))) < (F ? 0.34 : 0.45)) return rgb(BROW);
    // scalp hair: above the hairline, over the back of the head, and the temples
    if (y > hairLine(z) + (z > 6 ? 0.28 * Math.max(0, x - 3.2) : 0)) return rgb(HAIR);
    // eyelids are slightly rosier
    if (z > 5.6 && z < 9.4 && y > 163.9 && y < 166.6 && x > 1.2 && x < 5.8) return rgb(0xe8b496);
    return null;
  });

  console.log('skin head ms', Math.round(performance.now() - tH));
  // ============================================================ body (coarse mesh)
  const hum = centerline(P('humerus-L'), 7, 0.0, 1.0), rad = centerline(P('radius-L'), 5, 0.0, 1.0);
  const fem = centerline(P('femur-L'), 8, 0.0, 1.0), tib = centerline(P('tibia-L'), 7, 0.0, 1.0);
  const k = F ? 0.92 : 1.0, kl = F ? 0.98 : 1.0;
  const armPts = [A(hum[0], [-0.8, 3.0, 0]), A(hum[0], [0.4, 0.5, 0]), ...hum.slice(1, -1).map((p) => A(p, [-0.2, 0, 0.2])), A(hum[hum.length - 1], [0, -0.4, 0.4]), ...rad.slice(1).map((p) => A(p, [-0.1, 0, 0.5]))];
  const armR = [4.2, 5.6, 5.2, 4.7, 4.5, 4.2, 4.0, 3.9, 3.5, 3.1, 2.8, 2.5, 2.3];
  // dense, spline-smoothed tubes: the radius follows a smooth curve instead of changing at each bone slice
  const cr1 = (arr, t) => { const n = arr.length, f = t * (n - 1), i = Math.min(n - 2, Math.floor(f)), u = f - i, p0 = arr[Math.max(0, i - 1)], p1 = arr[i], p2 = arr[i + 1], p3 = arr[Math.min(n - 1, i + 2)]; return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u); };
  const smoothTube = (pts, radii, n = 60) => { const path = H.resample(pts, n).pts; return chainField(path, path.map((_, i) => cr1(radii, i / (n - 1)))); };
  const arm = smoothTube(armPts, armPts.map((_, i) => armR[Math.min(i, armR.length - 1)] * k));
  const legPts = [A(fem[0], [-1.5, 3.0, 0.4]), A(fem[0], [0.2, 0, 0.9]), ...fem.slice(1, -1).map((p) => A(p, [0.2, 0, 0.9])), A(fem[fem.length - 1], [0.2, -0.6, 0.9]), A(tib[0], [-0.1, 0, -0.6]), ...tib.slice(1).map((p) => A(p, [-0.3, 0, -0.6]))];
  const legR = [7.2, 8.0, 7.2, 6.6, 6.2, 5.8, 5.4, 5.0, 4.6, 4.6, 5.4, 5.0, 4.6, 4.0, 3.5, 3.0, 2.8];
  const leg = smoothTube(legPts, legPts.map((_, i) => legR[Math.min(i, legR.length - 1)] * kl * (i > 8 && F ? 0.94 : 1)), 96);

  const ids = ctx.ids();
  const pick = (re) => ids.filter((i) => re.test(i)).map((i) => P(i));
  const hk = F ? 0.94 : 1;
  const hand = cloudField([
    ...pick(/^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate)-L$/).map((pos) => ({ pos, r: 1.9 * hk })),
    ...pick(/^metacarpal-\d-L$/).map((pos) => ({ pos, r: 1.45 * hk })),
    ...pick(/^finger-\d-(prox|mid|dist)-L$/).map((pos) => ({ pos, r: 1.05 * hk })),
  ]);
  const foot0 = cloudField([
    ...pick(/^(talus|calcaneus)-L$/).map((pos) => ({ pos, r: 2.3 * hk })),
    ...pick(/^(navicular|cuboid|cuneiform-medial|cuneiform-intermediate|cuneiform-lateral)-L$/).map((pos) => ({ pos, r: 1.9 * hk })),
    ...pick(/^metatarsal-\d-L$/).map((pos) => ({ pos, r: 1.5 * hk })),
    ...pick(/^toe-\d-(prox|mid|dist)-L$/).map((pos) => ({ pos, r: 1.1 * hk })),
  ]);
  const foot = bounded((x, y, z) => smax(foot0(x, y, z), -y, 0.5), foot0.bc, foot0.bR);

  const sym = (f) => bounded(mirrorX(f), [0, f.bc[1], f.bc[2]], Math.hypot(Math.abs(f.bc[0]) + f.bR, f.bR));
  const parts = [torsoField(sex), sym(arm), sym(leg), sym(hand), sym(foot)];
  if (F) {
    // breasts (hanging slightly), mons pubis and labia majora
    parts.push(bounded(mirrorX(union(1.2, ell([5.8, 129.8, 11.2], [5.2, 5.1, 3.5]), ell([5.8, 129.2, 14.0], [0.5, 0.5, 0.45]))), [0, 130, 11], 14));
    parts.push(bounded(mirrorX(ell([1.7, 85.4, 8.6], [1.15, 3.4, 1.6])), [0, 85, 8.6], 7));
    parts.push(bounded(ell([0, 88.5, 10.1], [3.3, 2.1, 1.65]), [0, 88.5, 10.1], 4));
  } else {
    // scrotum and penis (relaxed)
    parts.push(bounded(mirrorX(ell([1.95, 76.8, 6.3], [1.95, 2.9, 2.15])), [0, 76.8, 6.3], 5));
    parts.push(bounded(tube([[0, 86.8, 10.0], [0, 83.0, 11.4], [0, 79.0, 12.4], [0, 76.6, 12.9]], [1.85, 1.8, 1.75, 1.7], 0.4), [0, 81.5, 11.5], 7));
    parts.push(bounded(ell([0, 75.1, 13.1], [1.7, 1.45, 1.7]), [0, 75.1, 13.1], 3));
  }
  const body = bounded((x, y, z) => {
    let d = 1e9;
    for (const p of parts) {
      if (d < 1e8 && p.bR !== undefined) { const bx = x - p.bc[0], by = y - p.bc[1], bz = z - p.bc[2]; if (Math.sqrt(bx * bx + by * by + bz * bz) - p.bR > d + 1.8) continue; }
      const v = p(x, y, z); d = d >= 1e8 ? v : smin(d, v, 1.8);
    }
    return smax(d, y - 150.5, 0.6);
  }, [0, 90, 0], 120);
  const tB = performance.now();
  const bodyMesh = meshSDF(body, [-36, -1, -17], [36, 151, 22], 0.36, { bump: { amp: 0.012, freq: 3 } });
  paint(bodyMesh, TONE, 0.03);
  console.log('skin body ms', Math.round(performance.now() - tB));
  return mergeMeshes([bodyMesh, head]);
}
