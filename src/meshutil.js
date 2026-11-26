// Direct mesh builders (lofts, ellipsoids) that return {positions, normals, indices}
import { axesOf } from './sdf.js';

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len3 = (a) => Math.sqrt(dot3(a, a));
const nrm3 = (a) => { const l = len3(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

// Smooth Catmull-Rom resample of a polyline into n points
export function resample(pts, n) {
  const P = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  // arc-length param
  const dense = [];
  const seg = 12;
  for (let s = 0; s < pts.length - 1; s++) {
    for (let t = 0; t < seg; t++) {
      const u = t / seg, u2 = u * u, u3 = u2 * u;
      const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
      const q = [0, 0, 0];
      for (let a = 0; a < 3; a++) q[a] = 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * u + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * u2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * u3);
      dense.push(q);
    }
  }
  dense.push(pts[pts.length - 1].slice());
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + len3(sub3(dense[i], dense[i - 1])));
  const total = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const target = total * i / (n - 1);
    while (j < cum.length - 2 && cum[j + 1] < target) j++;
    const f = (target - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    out.push([0, 1, 2].map((a) => dense[j][a] + (dense[j + 1][a] - dense[j][a]) * f));
  }
  return { pts: out, length: total };
}

// Loft an elliptical section along a path. sec(t) -> [a, b]: a along "up-hint" side, b the other.
export function loft(path, sec, opts = {}) {
  const K = opts.K || 16, capN = opts.capN === undefined ? 4 : opts.capN;
  const hint = opts.hint || [0, 1, 0];
  const n = path.length;
  const rings = [];
  const T = path.map((p, i) => nrm3(sub3(path[Math.min(n - 1, i + 1)], path[Math.max(0, i - 1)])));
  const frames = T.map((t) => {
    let N = sub3(hint, t.map((c) => c * dot3(hint, t)));
    if (len3(N) < 1e-3) N = sub3([1, 0, 0], t.map((c) => c * t[0]));
    N = nrm3(N);
    const Bn = nrm3(cross3(t, N));
    return { t, N, Bn };
  });
  const pos = [], nor = [], idx = [];
  const addRing = (center, f, a, b, tcomp, scale) => {
    const base = pos.length / 3;
    for (let k = 0; k < K; k++) {
      const ph = (k / K) * Math.PI * 2, c = Math.cos(ph), s = Math.sin(ph);
      const p = [0, 1, 2].map((q) => center[q] + f.N[q] * a * c * scale + f.Bn[q] * b * s * scale);
      const nn = nrm3([0, 1, 2].map((q) => f.N[q] * c / a + f.Bn[q] * s / b));
      pos.push(p[0], p[1], p[2]);
      const nf = tcomp === 0 ? nn : nrm3([0, 1, 2].map((q) => nn[q] * Math.sqrt(1 - tcomp * tcomp) + f.t[q] * tcomp));
      nor.push(nf[0], nf[1], nf[2]);
    }
    return base;
  };
  const ringBases = [];
  // start cap
  const s0 = sec(0), r0 = Math.min(s0[0], s0[1]);
  if (capN > 0) {
    for (let k = capN; k >= 1; k--) {
      const ps = (k / (capN + 1)) * Math.PI / 2;
      const center = [0, 1, 2].map((q) => path[0][q] - frames[0].t[q] * Math.sin(ps) * r0 * 1.0);
      ringBases.push(addRing(center, frames[0], s0[0], s0[1], -Math.sin(ps), Math.cos(ps)));
    }
  }
  for (let i = 0; i < n; i++) {
    const [a, b] = sec(i / (n - 1));
    ringBases.push(addRing(path[i], frames[i], a, b, 0, 1));
  }
  const s1 = sec(1), r1 = Math.min(s1[0], s1[1]);
  if (capN > 0) {
    for (let k = 1; k <= capN; k++) {
      const ps = (k / (capN + 1)) * Math.PI / 2;
      const center = [0, 1, 2].map((q) => path[n - 1][q] + frames[n - 1].t[q] * Math.sin(ps) * r1);
      ringBases.push(addRing(center, frames[n - 1], s1[0], s1[1], Math.sin(ps), Math.cos(ps)));
    }
  }
  for (let r = 0; r < ringBases.length - 1; r++) {
    const A = ringBases[r], B = ringBases[r + 1];
    for (let k = 0; k < K; k++) {
      const k2 = (k + 1) % K;
      idx.push(A + k, B + k, B + k2, A + k, B + k2, A + k2);
    }
  }
  // end poles
  const pole = (ringBase, center, dir) => {
    const pi = pos.length / 3;
    pos.push(center[0], center[1], center[2]); nor.push(dir[0], dir[1], dir[2]);
    for (let k = 0; k < K; k++) {
      const k2 = (k + 1) % K;
      if (dir === frames[0].t || dir._start) idx.push(pi, ringBase + k2, ringBase + k); else idx.push(pi, ringBase + k, ringBase + k2);
    }
  };
  const d0 = frames[0].t.map((c) => -c); d0._start = true;
  pole(ringBases[0], capN > 0 ? [0, 1, 2].map((q) => path[0][q] - frames[0].t[q] * r0) : path[0], d0);
  pole(ringBases[ringBases.length - 1], capN > 0 ? [0, 1, 2].map((q) => path[n - 1][q] + frames[n - 1].t[q] * r1) : path[n - 1], frames[n - 1].t);
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) };
}

export function ellipsoidMesh(c, r, rot, seg = 18) {
  const A = axesOf(rot);
  const pos = [], nor = [], idx = [];
  const rows = Math.max(8, seg >> 1);
  for (let j = 0; j <= rows; j++) {
    const th = (j / rows) * Math.PI;
    for (let i = 0; i <= seg; i++) {
      const ph = (i / seg) * Math.PI * 2;
      const lx = Math.sin(th) * Math.cos(ph), ly = Math.cos(th), lz = Math.sin(th) * Math.sin(ph);
      const px = lx * r[0], py = ly * r[1], pz = lz * r[2];
      const nx = lx / r[0], ny = ly / r[1], nz = lz / r[2];
      let wx = px, wy = py, wz = pz, wnx = nx, wny = ny, wnz = nz;
      if (A) {
        wx = A[0] * px + A[3] * py + A[6] * pz; wy = A[1] * px + A[4] * py + A[7] * pz; wz = A[2] * px + A[5] * py + A[8] * pz;
        wnx = A[0] * nx + A[3] * ny + A[6] * nz; wny = A[1] * nx + A[4] * ny + A[7] * nz; wnz = A[2] * nx + A[5] * ny + A[8] * nz;
      }
      const nl = Math.sqrt(wnx * wnx + wny * wny + wnz * wnz) || 1;
      pos.push(c[0] + wx, c[1] + wy, c[2] + wz); nor.push(wnx / nl, wny / nl, wnz / nl);
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < seg; i++) {
    const a = j * (seg + 1) + i, b = a + seg + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  return { positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) };
}
