// Decorative teeth (not counted among the 206 bones). Skull-local coordinates.
import { sphere, ell, rc, box, union, sub, meshSDF, transformMesh, matFrom, mergeMeshes } from './sdf.js';
import { resample } from './meshutil.js';

// crown hangs in -y from the gum line (y=0); root goes +y
function toothSpec(type) {
  if (type === 'I1' || type === 'I2') {
    const w = type === 'I1' ? 0.9 : 0.68, h = type === 'I1' ? 1.1 : 0.95;
    const crown = ell([0, -h / 2, 0], [w / 2, h / 2, 0.3]);
    const cut = box([0, -h - 0.02, 0], [w, 0.1, 0.5]);
    const root = rc([0, 0, 0], [0, 1.2, 0.05], w * 0.32, w * 0.16);
    return { f: sub(union(0.2, crown, root), cut, 0.05), min: [-0.7, -1.4, -0.6], max: [0.7, 1.5, 0.6], h: 0.035 };
  }
  if (type === 'C') {
    const crown = ell([0, -0.6, 0], [0.4, 0.6, 0.4]);
    const tip = rc([0, -0.8, 0.0], [0, -1.25, 0.02], 0.28, 0.05);
    const root = rc([0, 0, 0], [0, 1.6, 0.05], 0.3, 0.14);
    return { f: union(0.25, crown, tip, root), min: [-0.7, -1.6, -0.6], max: [0.7, 1.9, 0.6], h: 0.035 };
  }
  if (type === 'P1' || type === 'P2') {
    const crown = box([0, -0.42, 0], [0.34, 0.42, 0.44], 0.14);
    const c1 = sphere([0, -0.84, 0.2], 0.2), c2 = sphere([0, -0.84, -0.2], 0.17);
    const root = rc([0, 0, 0], [0, 1.2, 0.0], 0.28, 0.14);
    return { f: union(0.12, crown, c1, c2, root), min: [-0.7, -1.2, -0.7], max: [0.7, 1.6, 0.7], h: 0.035 };
  }
  const w = type === 'M3' ? 0.86 : 1.0;
  const crown = box([0, -0.38, 0], [w / 2, 0.38, w / 2 + 0.05], 0.18);
  const cusps = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => sphere([a * w * 0.26, -0.76, b * w * 0.28], 0.22));
  const roots = [[-0.28, 0.25], [0.28, 0.25], [0, -0.3]].map(([a, b]) => rc([a, 0, b], [a * 1.1, 1.3, b * 1.1], 0.2, 0.1));
  return { f: sub(union(0.12, crown, ...cusps, ...roots), sphere([0, -0.82, 0], 0.18), 0.1), min: [-0.85, -1.1, -0.85], max: [0.85, 1.6, 0.85], h: 0.035 };
}

export function teeth() {
  const types = ['I1', 'I2', 'C', 'P1', 'P2', 'M1', 'M2', 'M3'];
  const widthsU = [0.9, 0.68, 0.8, 0.7, 0.7, 1.05, 1.0, 0.88];
  const widthsL = [0.55, 0.62, 0.72, 0.7, 0.75, 1.12, 1.07, 1.0];
  const cache = {};
  const base = (t) => cache[t] || (cache[t] = (() => { const s = toothSpec(t); return meshSDF(s.f, s.min, s.max, s.h); })());
  const clone = (m) => ({ positions: new Float32Array(m.positions), normals: new Float32Array(m.normals), indices: new Uint32Array(m.indices) });
  const arches = {
    upper: { pts: [[0, 9.15], [1.2, 8.95], [2.2, 7.95], [2.9, 6.45], [3.15, 4.9], [2.95, 3.9]], y: -4.4, flip: false, widths: widthsU },
    lower: { pts: [[0, 9.0], [1.2, 8.75], [2.2, 7.7], [2.85, 6.3], [3.15, 4.8], [3.1, 3.5]], y: -6.4, flip: true, widths: widthsL },
  };
  const out = {};
  for (const [name, A] of Object.entries(arches)) {
    const path = resample(A.pts.map((p) => [p[0], 0, p[1]]), 80);
    const cum = [0]; for (let i = 1; i < path.pts.length; i++) cum.push(cum[i - 1] + Math.hypot(path.pts[i][0] - path.pts[i - 1][0], path.pts[i][2] - path.pts[i - 1][2]));
    const at = (s) => { let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const f = (s - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); const a = path.pts[i - 1], b = path.pts[i]; return { p: [a[0] + (b[0] - a[0]) * f, 0, a[2] + (b[2] - a[2]) * f], t: [b[0] - a[0], 0, b[2] - a[2]] }; };
    const list = [];
    let s = 0;
    for (let i = 0; i < 8; i++) {
      const w = A.widths[i]; const c = at(s + w / 2); s += w;
      for (const side of [1, -1]) {
        const m = clone(base(types[i]));
        const tl = Math.hypot(c.t[0], c.t[2]) || 1; let T = [c.t[0] / tl, 0, c.t[2] / tl];
        const ax = { y: [0, 1, 0], x: [T[0] * side, 0, T[2]] };
        const Mflip = A.flip ? [1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] : null;
        let M = matFrom([c.p[0] * side, A.y, c.p[2]], ax);
        if (side === -1) { /* mirror x of the left tooth */ M = matFrom([-c.p[0], A.y, c.p[2]], { y: [0, 1, 0], x: [-T[0], 0, T[2]] }); }
        // apply flip (lower teeth crown up): scale y by -1 first
        if (A.flip) for (let v = 0; v < m.positions.length; v += 3) { m.positions[v + 1] = -m.positions[v + 1]; m.normals[v + 1] = -m.normals[v + 1]; }
        if (A.flip) { const I = m.indices; for (let t = 0; t < I.length; t += 3) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; } }
        transformMesh(m, M);
        list.push(m);
      }
    }
    out[name] = mergeMeshes(list);
  }
  return out;
}
