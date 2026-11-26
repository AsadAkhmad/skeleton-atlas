// Skull and head bones. Skull-local frame: origin = midpoint of the two porions,
// y up (Frankfurt plane at y=0), z anterior, x = subject's left.
import { sphere, ell, rc, box, tor, cyl, tube, poly, union, sub, inter, mirrorX, warp, smin, smax, meshSDF, mergeMeshes, vnoise } from './sdf.js';

const D = Math.PI / 180;
const ORB = { R: [3.4, 1.7, 8.6], A: [1.6, 1.4, 4.6] };
const orbAxis = (() => { const d = [ORB.A[0] - ORB.R[0], ORB.A[1] - ORB.R[1], ORB.A[2] - ORB.R[2]]; const l = Math.hypot(...d); return { u: d.map((v) => v / l), len: l }; })();

export function skullField() {
  const v1 = ell([0, 3.6, -2.0], [7.3, 7.6, 6.6]);
  const v2 = ell([0, 4.2, 3.0], [6.4, 7.1, 6.8]);
  const vault = union(2.6, v1, v2);
  const vaultCut = (x, y, z) => smax(vault(x, y, z), -(y + 3.35), 1.0);
  const face = ell([0, -2.0, 5.2], [5.2, 4.0, 4.8]);
  const faceCut = (x, y, z) => smax(face(x, y, z), -(y + 3.5), 0.8);
  const feats = [
    vaultCut, faceCut,
    tube([[0.9, 3.9, 9.5], [2.5, 3.9, 9.2], [4.2, 3.6, 8.5], [5.4, 3.2, 7.5]], [0.55, 0.6, 0.6, 0.5]),   // brow ridge
    ell([0, 3.9, 9.5], [1.25, 0.8, 0.7]),                                                              // glabella
    tube([[0, 3.0, 9.55], [0, 0.9, 10.1]], [0.8, 0.72]),                                              // nasal bridge
    ell([0.9, 1.5, 9.4], [0.7, 1.3, 0.6]),
    tube([[1.7, -0.2, 9.0], [2.1, 2.8, 9.1]], 0.55),                                                   // maxilla frontal process
    ell([5.0, -0.3, 7.0], [1.15, 1.55, 1.4]),                                                          // zygomatic body
    tube([[5.8, 0.3, -0.6], [6.7, 0.3, 1.4], [6.9, 0.1, 3.2], [6.3, 0.0, 5.0], [5.4, -0.4, 6.8]], [0.5, 0.42, 0.42, 0.45, 0.52]), // arch
    rc([5.2, -0.2, -2.5], [5.5, -3.1, -1.5], 1.0, 0.7),                                                // mastoid
    rc([3.7, -3.2, -0.6], [3.4, -5.8, 0.4], 0.27, 0.1),                                                // styloid
    ell([1.75, -3.4, -0.4], [0.6, 0.55, 1.25]),                                                        // occipital condyle
    ell([0, 0.9, -8.0], [2.0, 1.4, 1.4]),                                                              // inion
    tube([[0, 1.0, -8.1], [2.5, 0.7, -7.7], [5.0, 0.3, -6.3]], 0.45),                                  // nuchal line
    tube([[0, -3.55, 9.15], [1.2, -3.55, 8.95], [2.2, -3.6, 7.95], [2.9, -3.6, 6.45], [3.15, -3.6, 4.9], [2.95, -3.5, 3.9]], 0.9), // alveolar
    ell([0, -3.15, 6.2], [2.9, 0.55, 3.1]),                                                            // palate
    ell([3.1, -3.2, 3.9], [0.85, 0.95, 1.0]),                                                          // tuberosity
    rc([0, -2.3, 9.7], [0, -2.0, 10.6], 0.22, 0.15),                                                   // anterior nasal spine
    rc([1.9, -3.3, 4.2], [2.2, -5.3, 3.8], 0.5, 0.4), rc([3.0, -3.3, 4.0], [3.1, -5.0, 3.6], 0.4, 0.3), // pterygoid
    ell([5.4, -1.2, 1.6], [0.8, 0.5, 0.7]),                                                            // articular tubercle
  ];
  let f = union(1.0, ...feats);
  // orbit first, so the cranial cavity can leave a bony wall (roof, medial wall, apex) around it
  const [Rx, Ry, Rz] = ORB.R, u = orbAxis.u;
  const P0 = [Rx - u[0] * 3, Ry - u[1] * 3, Rz - u[2] * 3];
  const orbit0 = union(0, rc(P0, ORB.R, 2.15, 2.0), rc(ORB.R, ORB.A, 2.0, 0.5));
  const orbit = warp(orbit0, (x, y, z) => [x, Ry + (y - Ry) / 0.9, z]);
  const orbitM = mirrorX(orbit);
  // cranial cavity
  const cavRaw = (x, y, z) => smax(ell([0, 3.6, 0.6], [6.4, 6.7, 8.2])(x, y, z), -(y + 1.9), 0.8);
  const cav = (x, y, z) => smax(cavRaw(x, y, z), 1.0 - orbitM(x, y, z), 0.3);
  f = sub(f, cav, 0.2);
  f = sub(f, orbitM, 0.25);
  const rim = mirrorX(tor(ORB.R, 2.12, 0.4, { y: u }));
  f = union(0.4, f, rim);
  // nasal aperture + cavity
  f = sub(f, union(0.45, ell([0, 0.75, 9.45], [0.78, 1.15, 1.9]), ell([0, -0.95, 9.45], [1.32, 1.0, 1.9])), 0.2);   // pear-shaped piriform aperture
  f = sub(f, mirrorX(ell([3.0, -1.9, 8.7], [0.95, 1.05, 0.5])), 0.6);                                                   // canine fossa
  f = sub(f, ell([0, -0.1, 6.4], [1.4, 2.25, 3.6]), 0.3);
  f = sub(f, ell([0, -2.8, 3.9], [1.2, 1.2, 0.9]), 0.2); // choanae
  // foramen magnum, ear canal, TMJ fossa, small foramina
  f = sub(f, ell([0, -3.3, -1.15], [1.5, 2.2, 1.75]), 0.3);
  f = sub(f, mirrorX(rc([7.7, -0.15, -0.2], [5.4, -0.15, -0.1], 0.5, 0.45)), 0.1);
  f = sub(f, mirrorX(sphere([5.3, -0.6, 0.35], 1.15)), 0.25);
  f = sub(f, mirrorX(sphere([2.9, -1.0, 8.55], 0.28)), 0.1);
  f = sub(f, mirrorX(sphere([2.6, 3.3, 9.1], 0.22)), 0.1);
  f = sub(f, sphere([0, -3.75, 8.0], 0.3), 0.1);
  f = sub(f, mirrorX(sphere([2.2, -3.75, 4.3], 0.28)), 0.1);
  f = sub(f, mirrorX(rc([1.6, 1.4, 4.6], [1.3, 1.3, 3.4], 0.45, 0.45)), 0.1);   // optic canal
  f = sub(f, mirrorX(rc([2.4, 0.6, 4.4], [2.9, 0.5, 3.2], 0.33, 0.3)), 0.1);    // superior orbital fissure
  return mirrorX(f);
}

// ---------- classification of skull surface into bones ----------
const jag = (s) => 0.22 * Math.sin(s * 7.3) + 0.14 * Math.sin(s * 17.1 + 1.0) + 0.08 * Math.sin(s * 31.7 + 2.0);
const up = [0, 1, 0];
const ou = orbAxis.u;
const ev = (() => { const d = up[1] * ou[1]; const v = [0 - ou[0] * d, 1 - ou[1] * d, 0 - ou[2] * d]; const l = Math.hypot(...v); return v.map((c) => c / l); })();
const eh = (() => { const c = [ev[1] * ou[2] - ev[2] * ou[1], ev[2] * ou[0] - ev[0] * ou[2], ev[0] * ou[1] - ev[1] * ou[0]]; const l = Math.hypot(...c); const r = c.map((q) => q / l); return r[0] < 0 ? r.map((q) => -q) : r; })();

export function classify(x, y, z) {
  const ax = Math.abs(x), s = x >= 0 ? 'L' : 'R';
  // orbit
  {
    const vx = ax - ORB.R[0], vy = y - ORB.R[1], vz = z - ORB.R[2];
    const depth = vx * ou[0] + vy * ou[1] + vz * ou[2];
    const rx = vx - depth * ou[0], ry = vy - depth * ou[1], rz = vz - depth * ou[2];
    const r = Math.hypot(rx, ry, rz);
    if (depth > -0.6 && depth < 5.0 && r < 2.95 - 0.12 * Math.max(0, depth - 3.5) * 2) {
      const h = rx * eh[0] + ry * eh[1] + rz * eh[2], v = rx * ev[0] + ry * ev[1] + rz * ev[2];
      const phi = Math.atan2(v, h) / D;
      if (depth > 4.0) return ['sphenoid', s];
      if (phi >= 28 && phi <= 152) return depth > 3.7 ? ['sphenoid', s] : ['frontal', ''];
      if (phi > -36 && phi < 28) return depth < 1.9 ? ['zygomatic', s] : ['sphenoid', s];
      if (phi <= -36 && phi > -144) { if (depth > 3.2) return ['palatine', s]; return h > 0.4 && depth < 2.4 ? ['zygomatic', s] : ['maxilla', s]; }
      // medial wall
      if (depth < 0.9) return ['maxilla', s];
      if (depth < 1.9 && v > -0.7 && v < 1.3) return ['lacrimal', s];
      if (depth < 1.9) return ['maxilla', s];
      return ['ethmoid', s];
    }
  }
  // nasal cavity interior
  if (ax < 2.2 && y > -3.2 && y < 2.2 && z > 3.2 && z < 10.2) {
    if (y > 1.0) return z > 8.7 ? ['nasal', s] : ['ethmoid', s];
    if (z < 4.9) return ['palatine', s];
    return ['maxilla', s];
  }
  // sutures
  const zc = 2.0 + 0.2 * (10.8 - y) + jag(y * 0.9 + ax * 0.45);
  const zl = -7.3 + 0.125 * (8.4 - y) + jag(y * 0.8 + ax * 0.3 + 4);
  const ys = 6.0 - 0.17 * (z + 1.0) * (z + 1.0) + jag(z * 0.7 + 9);
  // base / occipital
  if (y < -1.7 && ax < 3.3 && z < 0.9 + jag(ax)) return ['occipital', ''];
  // sphenoid base
  if (y < -1.5 && z >= 0.9 && z < 5.0 && ax < 3.8 && !(y < -2.4 && z > 3.5 && ax < 2.7 && z < 5.4 && y > -4.2)) return ['sphenoid', ''];
  // palatine
  if (y < -2.4 && z > 3.4 && z < 5.4 + 0.2 * jag(ax * 2) && ax < 2.7) return ['palatine', s];
  // face
  if (z > 4.6 && y < 3.2) {
    if (ax < 1.15 && y > 0.6 && z > 8.6) return ['nasal', s];
    const zy = ((ax - 5.0) / 2.3) ** 2 + ((y + 0.3) / 2.5) ** 2 + ((z - 7.0) / 2.3) ** 2;
    if (zy < 1) return ['zygomatic', s];
    if (ax > 5.2 && y > -1.3 && y < 1.4) return ['zygomatic', s];
    if (z > zc && y > 1.4 + 0.2 * Math.max(0, ax - 3)) return ['frontal', ''];
    return ['maxilla', s];
  }
  // frontal
  if (z > zc && !(y < 3.0 && ax > 4.4 && z < zc + 2.6 && y < 4.4 && z < 4.8)) {
    if (y > 3.0 || (ax > 4.6 && y > 1.0 && z > 4.6)) return ['frontal', ''];
  }
  // temple: sphenoid wing
  if (ax > 3.8 && y < 4.4 && y > -1.9 && z >= 2.4 + 0.25 * jag(y * 2) && z <= zc + 0.15) return ['sphenoid', s];
  // occipital squama
  if (z < zl && !(ax > 4.0 && y < 4.0 && z > -6.2)) return ['occipital', ''];
  // temporal
  if (ax > 3.0 && y < ys && z > -6.3 && z < 4.8) return ['temporal', s];
  if (y > ys - 0.0 && z < zc && z > zl) return ['parietal', s];
  if (z > 4.0) return ['maxilla', s];
  return z < -1 ? ['occipital', ''] : ['temporal', s];
}

const keyOf = (c) => c[0] + (c[1] ? '-' + c[1] : '');

export function skullBones(h = 0.16, onProgress) {
  const f = skullField();
  const mesh = meshSDF(f, [-8.4, -7.2, -10.3], [8.4, 12.6, 12.0], h, { bump: { amp: 0.04, freq: 0.9 } });
  const P = mesh.positions, I = mesh.indices;
  const nv = P.length / 3;
  const keys = new Array(nv);
  const eps = 0.13;
  const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const dark = new Float32Array(nv);
  for (let v = 0; v < nv; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    const k0 = keyOf(classify(x, y, z));
    keys[v] = k0;
    let diff = 0;
    for (const d of dirs) if (keyOf(classify(x + d[0] * eps, y + d[1] * eps, z + d[2] * eps)) !== k0) diff++;
    dark[v] = Math.min(1, diff / 3);
  }
  // baked ambient occlusion: march the field along each normal; cavities (orbits, nasal cavity, fossae) go dark
  const N = mesh.normals, ao = new Float32Array(nv);
  const ts = [0.35, 0.9, 1.8, 3.2], ws = [0.38, 0.3, 0.2, 0.12];
  for (let v = 0; v < nv; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2], nx = N[3 * v], ny = N[3 * v + 1], nz = N[3 * v + 2];
    let occ = 0;
    for (let i = 0; i < ts.length; i++) { const t = ts[i]; const d = f(x + nx * t, y + ny * t, z + nz * t); occ += ws[i] * Math.max(0, Math.min(1, (t - d) / t)); }
    ao[v] = Math.min(1, occ * 1.15);
  }
  // cavities get darker with depth (light does not reach the back of an orbit or the nasal cavity)
  const cav = new Float32Array(nv);
  const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let v = 0; v < nv; v++) {
    const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2], ax = Math.abs(x);
    let c = 0;
    const vx = ax - ORB.R[0], vy = y - ORB.R[1], vz = z - ORB.R[2];
    const depth = vx * ou[0] + vy * ou[1] + vz * ou[2];
    const rx = vx - depth * ou[0], ry = vy - depth * ou[1], rz = vz - depth * ou[2];
    if (depth > -0.3 && Math.hypot(rx, ry, rz) < 3.0) c = Math.max(c, sm(0.1, 3.8, depth));
    if (ax < 2.4 && y > -3.4 && y < 2.4 && z > 3.0 && z < 9.6) c = Math.max(c, sm(9.7, 5.5, z) * 0.9);   // nasal cavity
    cav[v] = c;
  }
  const groups = {};
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t], b = I[t + 1], c = I[t + 2];
    const cx = (P[3 * a] + P[3 * b] + P[3 * c]) / 3, cy = (P[3 * a + 1] + P[3 * b + 1] + P[3 * c + 1]) / 3, cz = (P[3 * a + 2] + P[3 * b + 2] + P[3 * c + 2]) / 3;
    const k = keyOf(classify(cx, cy, cz));
    (groups[k] || (groups[k] = [])).push(a, b, c);
  }
  const out = {};
  for (const k of Object.keys(groups)) {
    const tri = groups[k];
    const map = new Map();
    const pos = [], nor = [], col = [], idx = [];
    for (let i = 0; i < tri.length; i++) {
      const v = tri[i];
      let nvv = map.get(v);
      if (nvv === undefined) {
        nvv = pos.length / 3; map.set(v, nvv);
        pos.push(P[3 * v], P[3 * v + 1], P[3 * v + 2]); nor.push(mesh.normals[3 * v], mesh.normals[3 * v + 1], mesh.normals[3 * v + 2]);
        const g = (1 - 0.5 * dark[v]) * (1 - 0.72 * ao[v]) * (1 - 0.62 * cav[v]); col.push(g, g, g * 0.985);
      }
      idx.push(nvv);
    }
    out[k] = { positions: new Float32Array(pos), normals: new Float32Array(nor), colors: new Float32Array(col), indices: new Uint32Array(idx) };
  }
  return out;
}

// ---------- Mandible (skull-local) ----------
export function mandible() {
  const lower = [[0, -8.55, 8.95], [1.6, -8.5, 8.5], [3.0, -8.25, 7.0], [3.95, -8.0, 5.0], [4.55, -7.7, 3.0], [4.95, -7.4, 1.0], [5.0, -7.1, -0.9]];
  const upper = [[0, -7.1, 9.05], [1.6, -6.95, 8.6], [3.0, -6.6, 7.2], [3.7, -6.45, 5.2], [4.2, -6.3, 3.3]];
  const body = union(0.9, tube(lower, 0.62), tube(upper, 0.55));
  const chin = ell([0, -8.2, 9.1], [1.45, 1.2, 0.75]);
  const mental = ell([1.0, -8.65, 9.0], [0.5, 0.4, 0.4]);
  const outline = [[-1.5, -7.2], [-1.3, -4.8], [-0.9, -2.7], [-0.55, -1.7], [0.1, -1.2], [0.9, -1.7], [1.5, -2.0], [2.2, -1.6], [3.0, -1.15], [3.3, -1.6], [3.4, -2.9], [3.6, -5.0], [3.9, -6.6], [3.6, -8.0], [1.5, -8.3], [-0.3, -8.1], [-1.3, -7.8]];
  const ramus = poly(outline, 0.27, 0.23, [4.85, 0, 0], { y: [0, 1, 0], x: [0, 0, 1] });
  const postBorder = tube([[5.0, -7.1, -1.3], [4.95, -4.8, -1.15], [5.0, -2.7, -0.8], [5.1, -1.7, -0.5]], 0.31);
  const antBorder = tube([[4.95, -1.2, 2.9], [4.9, -2.9, 3.4], [4.7, -5.0, 3.8]], 0.26);
  const condyle = ell([5.3, -1.45, 0.35], [1.05, 0.55, 0.6]);
  const cneck = rc([5.15, -2.0, 0.2], [4.95, -3.4, -0.1], 0.55, 0.45);
  const angle = ell([5.15, -7.3, -1.0], [0.55, 0.6, 0.55]);
  let f = union(0.6, body, chin, mental, ramus, postBorder, antBorder, condyle, cneck, angle);
  f = mirrorX(f);
  f = sub(f, mirrorX(sphere([4.5, -3.3, 0.55], 0.3)), 0.1);
  f = sub(f, mirrorX(sphere([4.1, -7.6, 6.2], 0.24)), 0.1);
  return { f, min: [-7, -10.2, -3], max: [7, 0.2, 10.8], h: 0.11, bump: { amp: 0.04, freq: 1.0 } };
}

export function hyoid() {
  const body = union(0.3, rc([-1.15, 0, 0.1], [1.15, 0, 0.1], 0.5, 0.5), ell([0, 0, 0.35], [1.4, 0.55, 0.38]));
  const horn = tube([[1.4, 0, 0], [2.3, -0.05, -1.2], [3.1, -0.1, -2.6]], [0.4, 0.3, 0.3]);
  const knob = sphere([3.1, -0.1, -2.6], 0.36);
  const lesser = rc([1.2, 0.45, 0.0], [1.35, 1.1, -0.55], 0.2, 0.12);
  const f = mirrorX(union(0.3, body, horn, knob, lesser));
  return { f, min: [-4.2, -1.3, -3.5], max: [4.2, 2, 1.6], h: 0.07, bump: { amp: 0.02, freq: 1.5 } };
}

export function malleus() {
  const head = sphere([0, 0.45, 0], 0.17);
  const neck = rc([0, 0.4, 0], [0, 0.18, 0.02], 0.1, 0.09);
  const handle = rc([0, 0.18, 0.02], [0.02, -0.38, 0.1], 0.075, 0.05);
  const lat = rc([0, 0.2, 0], [0.16, 0.15, 0.02], 0.06, 0.04);
  const ant = rc([0, 0.25, 0.04], [0.02, 0.28, 0.32], 0.045, 0.02);
  return { f: union(0.04, head, neck, handle, lat, ant), min: [-0.5, -0.6, -0.3], max: [0.5, 0.8, 0.6], h: 0.012, bump: null };
}
export function incus() {
  const body = ell([0, 0.12, 0], [0.2, 0.17, 0.15]);
  const shortP = rc([0, 0.08, -0.05], [0, 0.0, -0.38], 0.07, 0.03);
  const longP = rc([0, 0.0, 0.0], [0.02, -0.52, 0.04], 0.07, 0.04);
  const lent = sphere([0.04, -0.54, 0.06], 0.065);
  return { f: union(0.05, body, shortP, longP, lent), min: [-0.4, -0.8, -0.6], max: [0.5, 0.5, 0.4], h: 0.012, bump: null };
}
export function stapes() {
  const head = sphere([0, 0.17, 0], 0.07);
  const crus1 = rc([0, 0.15, 0.02], [0.04, -0.12, 0.11], 0.03, 0.03);
  const crus2 = rc([0, 0.15, -0.02], [0.04, -0.12, -0.11], 0.03, 0.03);
  const foot = ell([0.04, -0.15, 0], [0.025, 0.07, 0.15]);
  return { f: union(0.02, head, crus1, crus2, foot), min: [-0.25, -0.4, -0.35], max: [0.3, 0.4, 0.35], h: 0.008, bump: null };
}

export function vomer() {
  const outline = [[4.55, -2.65], [8.6, -2.65], [8.7, -1.2], [7.2, 0.5], [6.0, 1.2], [4.6, 1.3], [4.3, -0.5]];
  const f = poly(outline, 0.08, 0.06, [0, 0, 0], { y: [0, 1, 0], x: [0, 0, 1] });
  const ala = ell([0, 1.2, 5.2], [0.9, 0.15, 0.7]);
  return { f: union(0.1, f, ala), min: [-1.2, -3.2, 3.8], max: [1.2, 2.0, 9.4], h: 0.045, bump: null };
}
export function concha() {
  // left inferior nasal concha, scroll-like
  const scroll = ell([1.3, -1.25, 6.5], [0.5, 0.45, 2.1]);
  const curl = sub(scroll, ell([1.55, -1.45, 6.5], [0.35, 0.3, 1.8]), 0.1);
  const attach = rc([1.7, -0.8, 5.0], [1.7, -0.8, 7.9], 0.12, 0.12);
  return { f: union(0.15, curl, attach), min: [0.4, -2.4, 4.0], max: [2.4, 0.2, 9.0], h: 0.04, bump: null };
}
export function ethmoidInner() {
  const crib = box([0, 1.55, 7.2], [1.1, 0.08, 1.9], 0.05);
  const crista = poly([[7.2, 1.6], [8.4, 1.6], [7.9, 3.2]], 0.1, 0.05, [0, 0, 0], { y: [0, 1, 0], x: [0, 0, 1] });
  const perp = poly([[5.9, 1.5], [8.5, 1.5], [8.2, 0.2], [7.0, -1.2], [6.2, -1.2]], 0.06, 0.04, [0, 0, 0], { y: [0, 1, 0], x: [0, 0, 1] });
  const lab = mirrorX(ell([1.7, 0.8, 6.7], [0.55, 1.5, 1.35]));
  const sup = mirrorX(ell([1.25, 1.1, 6.0], [0.2, 0.5, 0.9]));
  const mid = mirrorX(ell([1.35, 0.1, 6.9], [0.25, 0.6, 1.5]));
  return { f: union(0.12, crib, crista, perp, lab, sup, mid), min: [-2.8, -1.6, 5.0], max: [2.8, 3.6, 9.2], h: 0.06, bump: null };
}
export function sphenoidInner() {
  const body = ell([0, -1.6, 2.1], [1.6, 1.2, 1.5]);
  const lesser = mirrorX(ell([2.6, 1.0, 3.5], [1.9, 0.22, 0.65], [0, 12, 0]));
  const dorsum = ell([0, -0.4, 1.0], [1.2, 0.55, 0.25]);
  let f = union(0.3, body, lesser, dorsum);
  f = sub(f, sphere([0, -0.5, 2.4], 0.6), 0.2);
  return { f, min: [-5, -3.2, 0], max: [5, 1.6, 5], h: 0.07, bump: { amp: 0.02, freq: 1.4 } };
}
export function palatineInner() {
  const plate = ell([2.3, -1.0, 4.3], [0.1, 1.6, 0.9]);
  const hori = ell([1.4, -3.15, 4.5], [1.4, 0.15, 0.85]);
  const pyr = rc([2.9, -3.3, 3.9], [3.2, -4.4, 3.5], 0.35, 0.22);
  return { f: union(0.2, plate, hori, pyr), min: [-0.2, -5, 2.6], max: [4.6, 1, 5.6], h: 0.05, bump: null };
}

export function buildSpec(spec) { return meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump || undefined }); }
