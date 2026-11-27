// Body systems (organs, respiratory, cardiovascular, urinary, nervous). Everything is built on demand, the first
// time a system is switched on, from signed-distance shapes and lofted tubes, in the same world frame as the skeleton
// (cm, +x = subject's left, y up, z anterior). Vessels and nerves follow the real bone meshes where they run along limbs.
import { sphere, ell, rc, box, union, sub, inter, smax, meshSDF, mergeMeshes, mirrorMesh } from './sdf.js';
import { loft, resample } from './meshutil.js';
import { POSES } from './layout.js';
import { bodyDims } from './shapes_axial.js';
import { INFO as OI } from './organdata.js';
import { buildMuscular } from './muscles.js';
import { buildSkin } from './skin.js';
import { buildReproductive } from './reproductive.js';

export const SYSTEMS = [
  { id: 'organs', name: 'Organs', hex: '#e0958a', blurb: 'Digestive tract, glands, eyes' },
  { id: 'respiratory', name: 'Respiratory', hex: '#e8b7b0', blurb: 'Larynx, trachea, bronchi, lungs' },
  { id: 'cardio', name: 'Cardiovascular', hex: '#d0473d', blurb: 'Heart, arteries and veins' },
  { id: 'urinary', name: 'Urinary', hex: '#d9a76f', blurb: 'Kidneys, ureters, bladder' },
  { id: 'nervous', name: 'Nervous', hex: '#e9d98b', blurb: 'Brain, spinal cord, nerves' },
  { id: 'muscular', name: 'Muscular', hex: '#b5483e', blurb: 'Major skeletal muscles' },
  { id: 'skin', name: 'Skin', hex: '#d8b49a', blurb: 'Whole-body skin with an opacity slider' },
  { id: 'reproductive', name: 'Reproductive', hex: '#c58aa0', blurb: 'Male and female structures' },
];

const { vertPose } = POSES;
const V3 = {
  add: (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  nrm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  mix: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
const mx = (p) => [-p[0], p[1], p[2]];

// ---------------- colour ----------------
const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
const rgb = (hex) => [lin(((hex >> 16) & 255) / 255), lin(((hex >> 8) & 255) / 255), lin((hex & 255) / 255)];
const hash = (x, y, z) => { const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453; return s - Math.floor(s); };
function paint(m, hex, vary = 0.07, fn) {
  const c = rgb(hex), P = m.positions, N = m.normals, n = P.length / 3, col = new Float32Array(P.length);
  for (let i = 0; i < n; i++) {
    let k = 1 - vary + vary * 2 * (0.5 * hash(Math.floor(P[3 * i] * 1.7), Math.floor(P[3 * i + 1] * 1.7), Math.floor(P[3 * i + 2] * 1.7)) + 0.5 * hash(Math.floor(P[3 * i] * 5), Math.floor(P[3 * i + 1] * 5), Math.floor(P[3 * i + 2] * 5)));
    let r = c[0], g = c[1], b = c[2];
    if (fn) { const o = fn([P[3 * i], P[3 * i + 1], P[3 * i + 2]], [N[3 * i], N[3 * i + 1], N[3 * i + 2]]); if (o) { r = o[0]; g = o[1]; b = o[2]; k = 1; } }
    col[3 * i] = r * k; col[3 * i + 1] = g * k; col[3 * i + 2] = b * k;
  }
  m.colors = col; return m;
}

// ---------------- mesh builders ----------------
const sdfMesh = (f, mn, mxx, h, bump) => meshSDF(f, mn, mxx, h, { bump: bump || undefined });
// smooth tube along control points; r is a number, [r0,r1], or fn(t)
function tubeM(pts, r, o = {}) {
  const len = resample(pts, 40).length;
  const n = Math.max(6, Math.min(o.maxN || 500, Math.round(len / (o.step || 0.45))));
  const path = resample(pts, n).pts;
  const rf = typeof r === 'function' ? r : Array.isArray(r) ? (t) => r[0] + (r[1] - r[0]) * t : () => r;
  return loft(path, (t) => { const q = rf(t, len * t); return [q, q * (o.flat || 1)]; }, { K: o.K || 8, capN: o.capN === undefined ? 2 : o.capN, hint: o.hint || [0, 1, 0] });
}
const merge = (list) => mergeMeshes(list.filter(Boolean));

// ---------------- anatomy helpers ----------------
const NAMES = ['C3', 'C4', 'C5', 'C6', 'C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5'];
const SP = NAMES.map((n) => { const p = vertPose(n), d = bodyDims(n[0], +n.slice(1)); return { y: p.y, cz: p.z, bd: d.bd }; }).sort((a, b) => a.y - b.y);
function spAt(y) {
  if (y <= SP[0].y) return SP[0]; if (y >= SP[SP.length - 1].y) return SP[SP.length - 1];
  for (let i = 1; i < SP.length; i++) if (y <= SP[i].y) { const t = (y - SP[i - 1].y) / (SP[i].y - SP[i - 1].y); return { cz: SP[i - 1].cz + (SP[i].cz - SP[i - 1].cz) * t, bd: SP[i - 1].bd + (SP[i].bd - SP[i - 1].bd) * t }; }
}
const front = (y) => { const s = spAt(y); return s.cz + s.bd / 2; };           // front of the vertebral bodies
const canal = (y) => { const s = spAt(y); return s.cz - s.bd / 2 - 1.1; };     // centre of the spinal canal
const eZ = (y) => front(y) + 1.05;                                              // oesophagus
const tZ = (y) => eZ(y) + 1.95;                                                 // trachea / larynx

// centre line of a long bone from slices of its mesh (bone along y)
function centerline(pos, n = 7, lo = 0.1, hi = 0.9) {
  let y0 = 1e9, y1 = -1e9; for (let i = 1; i < pos.length; i += 3) { y0 = Math.min(y0, pos[i]); y1 = Math.max(y1, pos[i]); }
  const out = [];
  for (let k = 0; k < n; k++) {
    const y = y1 - (y1 - y0) * (lo + (hi - lo) * (k / (n - 1))), tol = (y1 - y0) * 0.035;
    let sx = 0, sz = 0, c = 0;
    for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i + 1] - y) < tol) { sx += pos[i]; sz += pos[i + 2]; c++; }
    out.push(c ? [sx / c, y, sz / c] : [0, y, 0]);
  }
  return out;
}
const along = (cl, off) => cl.map((p) => V3.add(p, off));

// ====================================================================================
// RESPIRATORY
// ====================================================================================
function lungField(side) { // side +1 = left lung (built at +x), right lung is mirrored afterwards and is bigger
  const R = side < 0;
  const up = ell([6.4, 137.0, -4.0], [3.9 + (R ? 0.3 : 0), 9.0, 5.7], [0, 0, 12]);
  const lo = ell([7.7 + (R ? 0.5 : 0), 120.8, -4.2], [5.2 + (R ? 0.4 : 0), 11.0, 6.5 + (R ? 0.2 : 0)]);
  let f = union(2.4, up, lo);
  f = sub(f, ell([4.5, (R ? 113.0 : 110.5), 1.5], [10, 12, 12], [0, 0, 0]), 1.8);            // diaphragm dome: high in front, low behind
  f = sub(f, ell([-1.6, 126, -3.0], [5.2, 14, 7.2]), 1.0);                                  // mediastinum
  f = sub(f, ell([2.9, 123.8, 0.8], [R ? 2.4 : 4.4, R ? 3.5 : 7.4, 4.2]), 1.3);              // cardiac notch
  const n = V3.nrm([0, 1, 1.64]);
  f = sub(f, ell([8.4, 124.0, -3.4], [5.2, 0.16, 11.5], { y: n, x: [1, 0, 0] }), 0.12);       // oblique fissure
  if (R) f = sub(f, ell([9.0, 127.4, 1.8], [6.2, 0.16, 5.0]), 0.12);                         // horizontal fissure
  return f;
}
function lungMesh(side) {
  const m = sdfMesh(lungField(side), [0.2, 103, -14], [16, 151, 8], 0.2, { amp: 0.025, freq: 1.4 });
  return side < 0 ? mirrorMesh(m) : m;
}
function bronchi(lf, rf) {
  const out = [];
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const carina = [0, 134.2, tZ(134.2)];
  function grow(p, d, r, len, depth, field, sgn) {
    const e = V3.add(p, d, len);
    if (field(e[0], e[1], e[2]) > -0.5 && depth > 0) return;
    out.push(tubeM([p, V3.mix(p, e, 0.5), e], [r, r * 0.82], { K: 6, capN: 1, step: 0.5 }));
    if (depth >= 5) return;
    for (const s of [-1, 1]) {
      const a = V3.nrm(V3.add(d, [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], 0.9));
      const pull = V3.nrm([sgn * 7.5 - e[0], 123 - e[1], -4 - e[2]]);
      const nd = V3.nrm(V3.add(V3.add(d, a, 0.55 * s), pull, 0.4));
      grow(e, nd, r * 0.74, len * 0.82, depth + 1, field, sgn);
    }
  }
  const hl = [4.9, 129.5, -4.4], hr = [-4.5, 130.2, -4.4];
  out.push(tubeM([carina, [2.2, 132.0, -3.4], hl], [0.62, 0.55], { K: 8 }));
  out.push(tubeM([carina, [-2.0, 132.4, -3.5], hr], [0.7, 0.62], { K: 8 }));
  grow(hl, V3.nrm([0.45, -0.85, -0.1]), 0.5, 3.3, 0, lf, 1);
  grow(hr, V3.nrm([-0.45, -0.85, -0.1]), 0.56, 3.5, 0, rf, -1);
  return merge(out);
}
function larynx() {
  const c = 152.0, z = tZ(c) + 0.9;
  const shield = union(0.25, ell([1.15, c + 0.2, z + 0.5], [0.45, 1.9, 1.5], [0, 28, 0]), ell([-1.15, c + 0.2, z + 0.5], [0.45, 1.9, 1.5], [0, -28, 0]), ell([0, c + 0.4, z + 1.6], [0.35, 1.5, 0.5]));
  const cricoid = sub(ell([0, c - 2.7, z - 0.15], [1.45, 0.95, 1.4]), ell([0, c - 2.7, z - 0.15], [0.95, 1.2, 0.95]), 0.1);
  const epi = ell([0, c + 2.1, z + 0.25], [0.8, 0.9, 0.2], [18, 0, 0]);
  const f = union(0.35, shield, cricoid, epi);
  return paint(sdfMesh(f, [-3.5, c - 4.5, z - 2.5], [3.5, c + 3.8, z + 3.2], 0.09), 0xe9dfce, 0.04);
}
function trachea() {
  const pts = []; for (let y = 148.6; y >= 134.0; y -= 1.2) pts.push([0, y, tZ(y)]);
  pts.push([0, 134.2, tZ(134.2)]);
  const m = tubeM(pts, (t, s) => 1.02 + 0.075 * Math.sin(s * 2 * Math.PI / 0.62), { K: 14, capN: 1, step: 0.12, maxN: 160, flat: 0.92 });
  return paint(m, 0xe9c6bd, 0.03);
}
function buildRespiratory() {
  const lfL = lungField(1), lfR = (x, y, z) => lungField(-1)(-x, y, z);
  const L = lungMesh(1), Rr = lungMesh(-1);
  return [
    { key: 'larynx', mesh: larynx(), color: 0xe9dfce },
    { key: 'trachea', mesh: trachea() },
    { key: 'bronchi', mesh: paint(bronchi(lfL, lfR), 0xd7a9a0, 0.05) },
    { key: 'lung-R', mesh: paint(Rr, 0xe1a9a2, 0.1) },
    { key: 'lung-L', mesh: paint(L, 0xe1a9a2, 0.1) },
  ];
}

// ====================================================================================
// CARDIOVASCULAR
// ====================================================================================
const HEART_C = [2.8, 126.3, -2.0];
function heart() {
  const d = V3.nrm([0.55, -0.72, 0.4]), c = HEART_C;
  const body = ell(c, [3.2, 5.8, 3.4], { y: d });
  const ra = ell([-1.2, 127.2, -2.4], [2.0, 2.9, 2.0]);
  const la = ell([3.2, 129.4, -5.2], [2.7, 1.7, 1.9]);
  const rau = ell([-0.2, 130.4, -0.2], [1.2, 1.2, 0.9]), lau = ell([5.2, 130.0, -1.6], [1.1, 1.4, 0.9]);
  const aorta = rc([0.8, 129.5, -2.2], [1.1, 132.4, -2.3], 1.5, 1.35);
  const pulm = rc([2.0, 129.0, 0.2], [3.2, 133.3, -1.7], 1.35, 1.2);
  const svc = rc([-2.1, 128.0, -2.4], [-2.2, 133.0, -2.2], 1.05, 0.95);
  let f = union(1.0, body, ra, la, rau, lau, aorta, pulm, svc);
  f = sub(f, ell([c[0] + 0.3, c[1] + 2.4, c[2] + 0.4], [4.2, 0.35, 3.8], { y: V3.nrm([0.3, 1, 0.5]) }), 0.4);   // coronary groove
  const m = sdfMesh(f, [-5, 116, -9], [9.5, 135, 4], 0.16, { amp: 0.04, freq: 1.2 });
  return paint(m, 0xb3544c, 0.08, (p, n) => (p[1] > 131.5 && p[0] > 1.5 ? null : null));
}
// arterial / venous trees. Limb segments follow the bone meshes (left) and are mirrored for the right.
function limbPaths(ctx) {
  const hum = centerline(ctx.pos('humerus-L'), 7, 0.06, 0.94), rad = centerline(ctx.pos('radius-L'), 5, 0.06, 0.94), uln = centerline(ctx.pos('ulna-L'), 5, 0.06, 0.94);
  const fem = centerline(ctx.pos('femur-L'), 8, 0.1, 0.96), tib = centerline(ctx.pos('tibia-L'), 7, 0.04, 0.94);
  return { hum, rad, uln, fem, tib };
}
function arteries(ctx) {
  const { hum, rad, uln, fem, tib } = limbPaths(ctx);
  const A = [];
  const seg = (pts, r, o) => A.push(tubeM(pts, r, o || {}));
  const aY = (y) => [2.2 - Math.max(0, 128 - y) * 0.035, y, front(y) + 1.15];
  // aorta: root, arch, descending, abdominal
  const aortaPts = [[1.0, 129.6, -2.2], [0.8, 133.0, -2.4], [1.4, 136.4, -3.1], [3.2, 137.2, -4.6], [3.7, 135.2, -6.0], [2.9, 131.0, -6.8]];
  for (let y = 126; y >= 100.5; y -= 3.2) aortaPts.push(aY(y));
  seg(aortaPts, (t) => 1.4 - 0.65 * t, { K: 12, maxN: 400 });
  // iliacs and leg
  const bif = aY(100.0);
  const leftLeg = [[bif[0], 100.0, bif[2]], [4.8, 96.2, -2.8], [6.6, 92.6, 1.2], [7.4, 89.4, 5.4], ...along(fem, [-2.3, 0, 3.0]).map((p, i) => (i === 0 ? V3.add(p, [-0.6, 0.6, 0.4]) : p)), ...along(tib.slice(0, 1), [-0.2, 0.3, -3.0]), ...along(tib.slice(1), [-0.3, 0, -2.2])];
  const legR = (t) => 0.55 - 0.28 * t;
  seg(leftLeg, legR, { K: 8 });
  seg(leftLeg.map(mx), legR, { K: 8 });
  // arm (from the subclavian) mirrored
  const arm = [[3.0, 136.3, -4.2], [6.5, 142.2, -2.6], [12.5, 142.0, -0.5], V3.add(hum[0], [-2.4, 0.5, 0.8]), ...along(hum.slice(1), [-1.9, 0, 0.7]), ...along(rad.slice(1), [-0.2, 0, 1.4]), V3.add(rad[rad.length - 1], [0.0, -2.0, 1.6])];
  seg(arm, (t) => 0.62 - 0.32 * t, { K: 8 });
  seg(arm.slice(1).map(mx).map((p, i) => (i === 0 ? [-3.0, 142.0, -2.6] : p)).slice(0), (t) => 0.62 - 0.32 * t, { K: 8 });
  seg([[0.7, 135.6, -2.6], [-1.2, 138.3, -2.3], [-2.9, 141.4, -2.0], [-6.5, 142.2, -2.6]], 0.7, { K: 8 });       // brachiocephalic into right subclavian
  const ulnar = [V3.add(hum[hum.length - 1], [-1.8, -0.5, 1.0]), ...along(uln.slice(1), [-0.6, 0, 1.2]), V3.add(uln[uln.length - 1], [-0.2, -2.0, 1.4])];
  seg(ulnar, 0.3, { K: 6 }); seg(ulnar.map(mx), 0.3, { K: 6 });
  // carotids
  const carotL = [[1.7, 136.8, -3.2], [2.3, 142.0, -1.0], [2.5, 148.0, tZ(148) - 0.2], [2.7, 153.6, tZ(153.6) - 0.6], [2.8, 158.0, -1.0], [2.9, 160.8, -1.6]];
  seg(carotL, [0.55, 0.42], { K: 8 });
  seg(carotL.slice(1).map(mx).map((p, i) => (i === 0 ? [-2.9, 141.5, -1.9] : p)), [0.55, 0.42], { K: 8 });
  seg([[2.7, 153.6, tZ(153.6) - 0.4], [3.6, 156.0, 2.4], [4.2, 158.5, 4.2]], 0.3, { K: 6 }); seg([[-2.7, 153.6, tZ(153.6) - 0.4], [-3.6, 156.0, 2.4], [-4.2, 158.5, 4.2]], 0.3, { K: 6 });
  // vertebral arteries
  for (const s of [1, -1]) seg([[s * 5.2, 141.6, -4.5], [s * 2.4, 148.0, -4.6], [s * 1.9, 155.0, -3.6], [s * 1.2, 159.8, -2.4]], 0.28, { K: 6 });
  // visceral branches
  seg([aY(116.5), [1.0, 117.3, 0.0], [-1.4, 117.0, 1.4]], 0.45, { K: 8 });                                   // coeliac trunk
  seg([[-1.4, 117.0, 1.4], [-4.5, 116.4, 0.5], [-7.0, 114.8, -0.8]], 0.3, { K: 6 });                          // hepatic
  seg([[1.0, 117.3, 0.0], [5.2, 117.6, -2.8], [9.8, 115.6, -5.4]], 0.3, { K: 6 });                            // splenic
  const sma = [aY(113.5), [1.8, 112.0, 1.6], [3.0, 108.0, 3.4], [2.6, 103.0, 4.6]];
  seg(sma, 0.4, { K: 8 });
  for (let i = 0; i < 6; i++) { const t = 0.35 + i * 0.1; const b = V3.mix(sma[1], sma[3], t - 0.2); seg([b, [b[0] + (i % 2 ? 4.5 : -4.5), b[1] - 3.2 - i * 0.6, b[2] + 1.8], [(i % 2 ? 6.0 : -6.0), b[1] - 5.4 - i * 0.5, 3.4]], 0.16, { K: 5, capN: 1 }); }
  seg([aY(110.5), [4.0, 110.2, -3.8], [5.4, 110.0, -6.2]], 0.34, { K: 6 }); seg([aY(110.5), [-0.6, 110.0, -3.8], [-4.0, 109.8, -5.8]], 0.34, { K: 6 }); // renal
  seg([aY(104.0), [3.4, 100.8, 0.6], [6.4, 95.8, -1.2]], 0.26, { K: 6 });                                      // inferior mesenteric
  return A;
}
function veins(ctx) {
  const { hum, rad, uln, fem, tib } = limbPaths(ctx);
  const A = [];
  const seg = (pts, r, o) => A.push(tubeM(pts, r, o || {}));
  const iY = (y) => [-1.7, y, front(y) + 1.2];
  const ivc = [[-1.2, 98.4, front(98.4) + 1.4]]; for (let y = 102; y <= 118; y += 3.2) ivc.push(iY(y)); ivc.push([-2.2, 121.2, -3.0], [-1.8, 124.4, -2.6], [-1.6, 126.0, -2.4]);
  seg(ivc, (t) => 0.72 + 0.5 * t, { K: 12, maxN: 300 });
  const svc = [[-2.1, 126.8, -2.4], [-2.3, 130.4, -2.2], [-2.4, 134.6, -2.0], [-2.5, 138.4, -1.9]];
  seg(svc, 0.95, { K: 12 });
  // iliac and leg veins
  const legV = [[-1.2, 98.4, front(98.4) + 1.4], [3.6, 96.0, -1.4], [6.0, 92.4, 1.6], [6.6, 89.4, 5.2], ...along(fem, [-3.4, 0, 2.4]).map((p, i) => (i === 0 ? V3.add(p, [-0.2, 0.6, 0.2]) : p)), ...along(tib.slice(0, 1), [-0.6, 0.3, -3.4]), ...along(tib.slice(1), [-0.6, 0, -2.4])];
  const lr = (t) => 0.74 - 0.38 * t;
  seg(legV, lr, { K: 8 }); seg(legV.map(mx), lr, { K: 8 });
  const sap = [V3.add(fem[0], [-3.2, -2.5, 3.6]), ...along(fem.slice(1), [-3.9, 0, 1.8]), ...along(tib.slice(1), [-2.6, 0, 0.6])];
  seg(sap, 0.28, { K: 6 }); seg(sap.map(mx), 0.28, { K: 6 });                                                   // great saphenous
  // arm veins
  const armV = [[-2.8, 139.0, -2.0], [-6.5, 141.6, -2.0], [-12.5, 141.0, -0.5].map((v, i) => (i === 0 ? -v : v)), V3.add(hum[0], [-3.0, 0.2, 0.2]), ...along(hum.slice(1), [-2.5, 0, 0.2]), ...along(rad.slice(1), [-0.6, 0, 0.9]), V3.add(rad[rad.length - 1], [-0.4, -2.0, 1.2])];
  armV[0] = [2.5, 139.0, -2.0]; armV[1] = [6.5, 141.6, -2.0]; armV[2] = [12.5, 141.0, -0.5];
  seg(armV, (t) => 0.7 - 0.38 * t, { K: 8 });
  seg([[-2.5, 138.4, -1.9], [-1.6, 139.6, -1.8], [2.2, 139.4, -1.8], ...armV.slice(0, 2)].slice(2), 0.5, { K: 8 });
  seg([[-2.5, 138.4, -1.9], [-5.0, 139.8, -2.0], [-6.5, 141.6, -2.0], [-12.5, 141.0, -0.5]], 0.6, { K: 8 });
  seg(armV.slice(3).map(mx), (t) => 0.55 - 0.3 * t, { K: 8 });
  const baz = [V3.add(hum[1], [-3.4, 0, -0.2]), ...along(hum.slice(2), [-3.1, 0, -0.4]), V3.add(uln[1], [-1.0, 0, 0.4])];
  seg(baz, 0.26, { K: 6 }); seg(baz.map(mx), 0.26, { K: 6 });                                                   // basilic
  // jugulars
  const jug = [[2.4, 139.0, -1.6], [3.5, 143.5, 0.0], [3.6, 149.0, tZ(149) - 0.4], [3.6, 154.0, tZ(154) - 0.5], [3.4, 158.4, -0.8], [3.2, 160.8, -2.0]];
  seg(jug, [0.75, 0.55], { K: 8 }); seg(jug.map(mx).map((p, i) => (i === 0 ? [-2.4, 139.0, -1.6] : p)), [0.75, 0.55], { K: 8 });
  // renal and hepatic veins
  seg([[-1.4, 110.6, front(110.6) + 1.2], [-4.2, 110.0, -4.8], [-5.6, 109.8, -6.2]], 0.42, { K: 6 }); seg([[-1.8, 110.9, front(110.9) + 1.2], [1.8, 110.7, -3.2], [4.2, 110.0, -5.6]], 0.42, { K: 6 });
  for (const [x, z] of [[-6, -1], [-3, 2.5], [-1.2, 3.4]]) seg([[-2.0, 121.0, -3.0], [x, 118.4, z], [x * 1.6, 114, z + 1.4]], 0.32, { K: 6, capN: 1 });
  seg([[-1.4, 108.0, 0.0], [-3.0, 111.0, 0.0], [-3.2, 115.5, -0.6]], 0.34, { K: 6 });                          // portal vein (to liver)
  return A;
}
function pulmonaryVessels() {
  const A = [];
  const blue = [tubeM([[2.0, 129.2, 0.0], [2.8, 132.0, -1.4], [3.0, 133.2, -2.4]], 1.2, { K: 12 }), tubeM([[3.0, 133.0, -2.4], [4.5, 131.6, -3.6], [6.3, 130.0, -4.8]], 0.78, { K: 10 }), tubeM([[2.8, 133.0, -2.4], [-0.5, 132.4, -3.2], [-5.0, 130.6, -4.8]], 0.82, { K: 10 })];
  const red = [];
  for (const [y, z] of [[128.6, -3.8], [126.4, -4.4]]) { red.push(tubeM([[6.2, y + 1.5, -5.2], [4.6, y + 0.4, z - 0.4], [3.6, 128.4, -5.0]], 0.46, { K: 6 })); red.push(tubeM([[-4.6, y + 1.5, -5.2], [-2.2, y + 0.2, z - 0.4], [0.8, 128.6, -5.0]], 0.46, { K: 6 })); }
  return { blue, red };
}
function buildCardio(ctx) {
  const pv = pulmonaryVessels();
  return [
    { key: 'heart', mesh: heart() },
    { key: 'arteries', mesh: paint(merge(arteries(ctx)), 0xc8362f, 0.05) },
    { key: 'veins', mesh: paint(merge(veins(ctx)), 0x3f5fa6, 0.05) },
    { key: 'pulmonary', mesh: merge([paint(merge(pv.blue), 0x5a63b0, 0.04), paint(merge(pv.red), 0xd2453b, 0.04)]) },
  ];
}

// ====================================================================================
// ORGANS (digestive and others)
// ====================================================================================
function esophagus() {
  const pts = []; for (let y = 149.5; y >= 115.5; y -= 2.2) pts.push([y < 124 ? 0.4 + (124 - y) * 0.09 : 0.2, y, eZ(y) + (y < 124 ? 0.3 : 0)]);
  pts.push([1.6, 114.5, -4.8]);
  return paint(tubeM(pts, 0.82, { K: 12, flat: 0.78, hint: [0, 0, 1] }), 0xc97b72, 0.05);
}
function stomach() {
  const f = union(1.6,
    ell([6.0, 115.8, -4.0], [3.7, 3.4, 3.5]),
    rc([5.0, 115.0, -3.6], [6.6, 107.4, 0.4], 3.7, 3.0),
    rc([6.6, 107.4, 0.4], [1.2, 104.8, 2.2], 2.8, 1.9),
    rc([1.2, 104.8, 2.2], [-1.2, 105.0, 2.2], 1.5, 1.3),
    rc([1.3, 116.7, -5.0], [3.6, 116.6, -4.2], 0.9, 1.1));
  return paint(sdfMesh(f, [-4, 100, -9], [13, 121, 8], 0.2, { amp: 0.06, freq: 1.0 }), 0xdb9d90, 0.07);
}
function liver() {
  let f = union(2.6,
    ell([-6.8, 115.6, -1.4], [7.4, 5.8, 8.0]),
    ell([0.5, 117.4, 2.0], [6.8, 3.4, 4.8], [0, 0, -8]),
    ell([-2.0, 114.0, -5.4], [2.2, 3.0, 2.0]));
  f = sub(f, ell([-3.5, 105.8, 3.5], [8, 3.0, 6.0]), 1.2);
  f = sub(f, ell([-1.9, 114.4, 4.6], [0.2, 3.6, 4.2]), 0.2);                // falciform fissure
  return paint(sdfMesh(f, [-16, 108, -10], [9, 124, 10], 0.22, { amp: 0.05, freq: 0.9 }), 0x93433a, 0.06);
}
function gallbladder() {
  const f = union(0.4, ell([-6.0, 105.4, 3.8], [1.35, 3.3, 1.3], { y: V3.nrm([0.2, -1, 0.35]) }), rc([-5.0, 102.4, 3.0], [-3.4, 104.2, 1.6], 0.3, 0.25));
  return paint(sdfMesh(f, [-9, 99, -1], [-1, 109.5, 8], 0.09), 0x6d8f3d, 0.05);
}
function spleen() { return paint(sdfMesh(ell([11.5, 114.0, -7.2], [1.9, 4.3, 3.0], { y: V3.nrm([0.25, 1, -0.1]) }), [7, 107, -13], [16, 121, -2], 0.12, { amp: 0.03, freq: 1.5 }), 0x723a4d, 0.05); }
function pancreas() {
  const pts = [[-3.4, 105.6, -1.0], [-0.8, 107.2, -1.5], [2.4, 108.4, -2.6], [5.8, 109.3, -3.6], [10.2, 111.0, -5.4]];
  const f = union(0.8, rc(pts[0], pts[1], 1.9, 1.3), rc(pts[1], pts[2], 1.3, 1.2), rc(pts[2], pts[3], 1.2, 1.15), rc(pts[3], pts[4], 1.15, 0.8), ell([-4.0, 103.4, -0.8], [1.4, 2.0, 1.2]));
  return paint(sdfMesh(f, [-7, 99, -9], [13, 114, 3], 0.14, { amp: 0.1, freq: 2.2 }), 0xdfbd8f, 0.06);
}
function duodenum() {
  const pts = [[-1.3, 104.8, 2.2], [-3.8, 104.0, 0.6], [-4.9, 101.0, -1.0], [-3.3, 97.8, -1.7], [0.5, 97.2, -1.9], [4.6, 98.2, -1.4], [5.8, 99.2, -0.6]];
  return paint(tubeM(pts, 1.1, { K: 10 }), 0xe6a392, 0.05);
}
function smallIntestine() {
  const pts = [[5.8, 99.2, -0.6]];
  const layers = [1.6, 4.4, 7.0];
  let dir = 1, k = 0;
  for (let li = 0; li < layers.length; li++) {
    for (let row = 0; row < 8; row++) {
      const y = 98.4 - row * 1.15 - li * 0.15, z = layers[li] + 0.5 * Math.sin(row * 1.7 + li);
      const xs = dir > 0 ? [-8.5, -4.2, 0.2, 4.4, 8.4] : [8.4, 4.4, 0.2, -4.2, -8.5];
      xs.forEach((x, i) => pts.push([x + 0.5 * Math.sin(k + i * 2.1), y + 0.45 * Math.sin(k * 1.3 + i), z + 0.6 * Math.sin(i * 1.9 + k)]));
      dir = -dir; k++;
    }
  }
  pts.push([-7.5, 92.8, 1.2]);
  return paint(tubeM(pts, 0.92, { K: 8, step: 0.6, maxN: 900 }), 0xe9a898, 0.06);
}
function largeIntestine() {
  const pts = [[-8.2, 91.8, 2.6], [-9.3, 94.6, 1.2], [-10.0, 100.0, 0.2], [-10.4, 106.0, -0.2], [-9.6, 108.8, -0.8], [-6.4, 107.4, 3.0], [-4.8, 104.8, 5.2], [0, 102.4, 6.3], [5.0, 103.8, 5.0], [8.8, 107.4, 1.4], [10.6, 109.6, -3.4], [11.0, 104.0, -3.0], [10.6, 98.0, -2.6], [9.4, 92.6, -2.2], [7.6, 90.2, -0.4], [3.8, 88.8, 0.4], [4.4, 86.2, -1.8], [1.2, 87.4, -4.2], [0, 84.0, -6.4], [0, 81.0, -6.8]];
  const m = tubeM(pts, (t, s) => (0.045 > t ? 2.2 : 1.9 - 0.2 * t - 0.45 * Math.max(0, (t - 0.74) / 0.26)) * (1 + 0.075 * Math.sin(s * 2 * Math.PI / 2.0)), { K: 12, step: 0.3, maxN: 520 });
  const app = tubeM([[-7.4, 90.4, 3.6], [-6.4, 88.9, 4.8], [-5.2, 88.6, 5.8]], 0.32, { K: 6 });
  return paint(merge([m, app]), 0xd08574, 0.07);
}
function adrenals() {
  const one = (s) => paint(sdfMesh(union(0.3, ell([s * 5.1, 118.4, -6.9], [1.5, 0.55, 1.8], [0, s * 25, 0]), ell([s * 5.7, 118.0, -6.4], [1.0, 0.5, 1.2])), [s > 0 ? 2 : -9, 114, -11], [s > 0 ? 9 : -2, 122, -2], 0.1), 0xe8c968, 0.04);
  return merge([one(1), one(-1)]);
}
function thyroid() {
  const z = tZ(146.4) + 1.0;
  const f = union(0.5, ell([1.8, 146.4, z], [0.95, 2.1, 0.95], [0, 0, -8]), ell([-1.8, 146.4, z], [0.95, 2.1, 0.95], [0, 0, 8]), ell([0, 145.4, z + 0.3], [1.4, 0.4, 0.55]));
  return paint(sdfMesh(f, [-4, 142, z - 2], [4, 150, z + 2], 0.09), 0xb9695a, 0.05);
}
function eyes() {
  const one = (s) => {
    const c = [s * 3.4, 164.6, 6.3];
    const m = sdfMesh(union(0.3, sphere(c, 1.2), sphere([c[0], c[1], c[2] + 1.0], 0.62)), [c[0] - 2, c[1] - 2, c[2] - 2], [c[0] + 2, c[1] + 2, c[2] + 2.4], 0.06);
    return paint(m, 0xf3eee6, 0.02, (p, n) => { const dx = p[0] - c[0], dy = p[1] - c[1], dz = p[2] - c[2], l = Math.hypot(dx, dy, dz) || 1, f = dz / l; return f > 0.965 ? rgb(0x0b0b0e) : f > 0.86 ? rgb(0x4a7aa1) : f > 0.8 ? rgb(0xe8dfd2) : null; });
  };
  return merge([one(1), one(-1)]);
}
function buildOrgans() {
  return [
    { key: 'esophagus', mesh: esophagus() }, { key: 'stomach', mesh: stomach() }, { key: 'liver', mesh: liver() }, { key: 'gallbladder', mesh: gallbladder() },
    { key: 'spleen', mesh: spleen() }, { key: 'pancreas', mesh: pancreas() }, { key: 'duodenum', mesh: duodenum() }, { key: 'small-intestine', mesh: smallIntestine() },
    { key: 'large-intestine', mesh: largeIntestine() }, { key: 'adrenals', mesh: adrenals() }, { key: 'thyroid', mesh: thyroid() }, { key: 'eyes', mesh: eyes() },
  ];
}

// ====================================================================================
// URINARY
// ====================================================================================
function kidney(s, cy) {
  const c = [s * 7.6, cy, -7.2];
  const ax = V3.nrm([-s * 0.2, 1, -0.05]);
  let f = ell(c, [2.7, 5.8, 1.95], { y: ax });
  f = sub(f, ell([c[0] - s * 2.6, c[1] - 0.2, c[2] + 0.6], [1.5, 2.4, 1.5]), 0.5);
  f = union(0.4, f, rc([c[0] - s * 1.4, c[1] - 0.2, c[2] + 0.2], [c[0] - s * 3.0, c[1] - 2.3, c[2] + 0.8], 0.75, 0.5));
  return paint(sdfMesh(f, [Math.min(c[0], 0) - 6, cy - 8, -13], [Math.max(c[0], 0) + 6, cy + 8, -2], 0.13, { amp: 0.03, freq: 1.2 }), 0x9d3f3b, 0.05);
}
function ureters() {
  const one = (s) => tubeM([[s * 5.3, 109.6, -6.4], [s * 5.4, 104.0, -6.0], [s * 5.0, 98.0, -5.2], [s * 4.7, 93.0, -3.8], [s * 4.2, 90.6, -1.0], [s * 3.0, 89.6, 1.8]], 0.26, { K: 6 });
  return paint(merge([one(1), one(-1)]), 0xe3b977, 0.04);
}
function bladder() {
  const f = union(1.2, ell([0, 90.1, 3.9], [3.8, 3.0, 3.4]), ell([0, 91.8, 3.2], [2.6, 2.2, 2.6]), rc([0, 87.4, 4.4], [0, 85.6, 4.8], 0.7, 0.45));
  return paint(sdfMesh(f, [-6, 83, -1], [6, 96, 9], 0.14, { amp: 0.02, freq: 1.2 }), 0xdcab78, 0.05);
}
function buildUrinary() {
  return [{ key: 'kidney-R', mesh: kidney(-1, 110.4) }, { key: 'kidney-L', mesh: kidney(1, 111.9) }, { key: 'ureters', mesh: ureters() }, { key: 'bladder', mesh: bladder() }];
}

// ====================================================================================
// NERVOUS
// ====================================================================================
function brain() {
  const cy = 167.7;
  let f = union(1.0,
    ell([3.0, cy, 1.0], [3.3, 5.0, 7.3]), ell([-3.0, cy, 1.0], [3.3, 5.0, 7.3]),
    ell([4.3, cy - 3.2, 1.6], [1.8, 1.8, 3.6]), ell([-4.3, cy - 3.2, 1.6], [1.8, 1.8, 3.6]),
    ell([0, cy - 0.8, 0.8], [3.2, 3.2, 6.6]));
  f = sub(f, ell([0, cy + 3.0, 1.0], [0.14, 3.4, 8.2]), 0.12);                       // longitudinal fissure
  f = sub(f, ell([0, cy - 4.0, -5.4], [4.6, 2.4, 3.3]), 0.7);                        // room for the cerebellum
  return paint(sdfMesh(f, [-8, 160, -9], [8, 175, 10], 0.18, { amp: 0.14, freq: 3.0 }), 0xd9a79e, 0.09);
}
function cerebellum() {
  const f = union(0.4, ell([0, 162.9, -5.4], [4.3, 2.1, 2.9]));
  return paint(sdfMesh(f, [-6, 159, -9], [6, 166, -2], 0.1, { amp: 0.09, freq: 6 }), 0xc9a39a, 0.06);
}
function brainstem() {
  return paint(tubeM([[0, 164.0, -0.4], [0, 161.4, -1.6], [0, 159.4, -2.4], [0, 157.6, canal(157.6)]], [1.45, 0.78], { K: 12 }), 0xe4cfa2, 0.04);
}
function spinalCord() {
  const pts = []; for (let y = 158.0; y >= 111.8; y -= 2.9) pts.push([0, y, canal(y)]);
  pts.push([0, 111.2, canal(111.2)]);
  const m = tubeM(pts, (t) => 0.5 + 0.12 * Math.exp(-Math.pow((t - 0.17) / 0.1, 2)) + 0.1 * Math.exp(-Math.pow((t - 0.86) / 0.07, 2)) - 0.35 * Math.max(0, (t - 0.97) / 0.03), { K: 10, step: 0.35, maxN: 180 });
  const cauda = [];
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cauda.push(tubeM([[0.2 * Math.cos(a), 111.6, canal(111.6)], [0.5 * Math.cos(a), 104, canal(104) + 0.3 * Math.sin(a)], [0.4 * Math.cos(a), 96, canal(96) + 0.3 * Math.sin(a)], [0.3 * Math.cos(a), 89, canal(89) + 0.2 * Math.sin(a)]], 0.07, { K: 5, capN: 1 })); }
  return paint(merge([m, ...cauda]), 0xf2e6bd, 0.04);
}
function spinalNerves() {
  const levels = [['C1', 158], ['C2', 156], ['C3', 154.1], ['C4', 152.2], ['C5', 150.3], ['C6', 148.4], ['C7', 146.3], ['T1', 144], ['T2', 141.7], ['T3', 139.4], ['T4', 137], ['T5', 134.6], ['T6', 132.2], ['T7', 129.7], ['T8', 127.2], ['T9', 124.7], ['T10', 122.1], ['T11', 119.5], ['T12', 116.8], ['L1', 113.4], ['L2', 109.75], ['L3', 106.1], ['L4', 102.45], ['L5', 98.8]];
  const out = [];
  levels.forEach(([n, y], i) => {
    const yc = Math.max(y + 1.2, 113.0), zc = canal(yc), zl = canal(y);
    const lat = n[0] === 'T' ? 2.6 : 3.8, drop = n[0] === 'L' ? 5.5 : n[0] === 'C' ? 0.8 : 1.4;
    for (const s of [1, -1]) {
      const yEnd = y - 1.2 - drop;
      const pts = n[0] === 'L' ? [[s * 0.25, 111.8, canal(111.8)], [s * 1.2, (111.8 + y) / 2, canal(y) + 0.1], [s * 2.2, y + 0.8, zl + 0.2], [s * 3.8, y - 0.2, zl + 0.3], [s * (lat + 1.8), yEnd, zl + 0.9]] : [[s * 0.3, yc, zc], [s * 1.5, yc - 0.3, zc + 0.15], [s * lat, y - 0.5, zl + 0.3], [s * (lat + 2.6), yEnd, zl + 0.5 + (n[0] === 'T' ? 0.6 : 0.2)]];
      out.push(tubeM(pts, 0.14, { K: 5, capN: 1, step: 0.5 }));
    }
  });
  return paint(merge(out), 0xe7d78d, 0.05);
}
function armNerves(ctx) {
  const { hum, rad, uln } = limbPaths(ctx);
  const roots = [[0.4, 149, -5], [0.4, 147.5, -5], [0.4, 146, -5], [0.4, 144.6, -5.5]].map((p, i) => [p, [5.2, 145.6 - i * 0.2, -2.8], [11.5, 141.6 - i * 0.2, -1.2]]);
  const out = [];
  for (const [a, b, c] of roots) out.push(tubeM([a, b, c], 0.2, { K: 6, capN: 1 }));
  const start = V3.add(hum[0], [-2.0, 0.4, 0.0]);
  const median = [[11.5, 141.6, -1.2], start, ...along(hum.slice(1), [-1.6, 0, 0.3]), ...along(rad.slice(1), [-0.1, 0, 1.1]), V3.add(rad[rad.length - 1], [0.1, -2.6, 1.2])];
  const ulnarN = [[11.5, 141.4, -1.4], V3.add(start, [-0.3, 0, -0.6]), ...along(hum.slice(1), [-1.5, 0, -0.8]), ...along(uln.slice(1), [-0.7, 0, 0.4]), V3.add(uln[uln.length - 1], [-0.1, -2.6, 0.9])];
  const radial = [[11.5, 141.2, -1.6], V3.add(start, [0.4, -1.2, -1.8]), ...along(hum.slice(2), [1.3, 0, -1.3]).map((p, i) => (i < 2 ? p : p)), ...along(rad.slice(1), [1.2, 0, 0.2])];
  out.push(tubeM(median, 0.24, { K: 6 }), tubeM(ulnarN, 0.22, { K: 6 }), tubeM(radial, 0.2, { K: 6 }));
  return out;
}
function legNerves(ctx) {
  const { fem, tib } = limbPaths(ctx);
  const out = [];
  const sci = [[1.2, 95.5, -5.0], [5.0, 94.0, -8.6], [8.0, 89.4, -7.0], V3.add(fem[0], [-0.8, -2.0, -3.4]), ...along(fem.slice(1), [-0.4, 0, -3.4]), V3.add(tib[0], [-0.2, 0.0, -3.2])];
  out.push(tubeM(sci, [0.55, 0.32], { K: 8 }));
  out.push(tubeM([V3.add(tib[0], [-0.2, 0.0, -3.2]), ...along(tib.slice(1), [-0.6, 0, -2.5]), V3.add(tib[tib.length - 1], [-1.6, -2.2, -0.8])], 0.26, { K: 6 }));        // tibial
  out.push(tubeM([V3.add(tib[0], [-0.2, 0.0, -3.2]), V3.add(tib[0], [3.6, -1.0, -1.8]), V3.add(tib[1], [4.4, 0, 0.2]), ...along(tib.slice(2), [2.4, 0, 2.2]), V3.add(tib[tib.length - 1], [1.8, -2.4, 2.0])], 0.22, { K: 6 })); // common peroneal
  out.push(tubeM([[2.4, 100.0, -5.6], [4.8, 94.0, -1.4], [6.2, 89.6, 5.0], V3.add(fem[0], [-2.8, -1.0, 3.8]), ...along(fem.slice(1), [-3.0, 0, 2.6]), ...along(tib.slice(1), [-2.0, 0, 0.8])], [0.42, 0.18], { K: 6 }));        // femoral/saphenous
  return out;
}
function cranialNerves() {
  const out = [];
  for (const s of [1, -1]) {
    out.push(tubeM([[s * 0.6, 165.0, 4.8], [s * 1.6, 164.9, 6.0], [s * 2.6, 164.6, 6.2]], 0.16, { K: 6 }));                                   // optic
    const vag = [[s * 1.0, 160.4, -2.0], [s * 2.8, 158.0, -1.4], [s * 3.1, 152, tZ(152) - 0.2], [s * 3.0, 146, tZ(146) - 0.6], [s * 2.4, 140.5, -1.5], [s * 1.8, 134.0, -2.8], [s * 1.4, 127.0, -5.0], [s * 1.2, 118.0, -4.6]];
    out.push(tubeM(vag, 0.15, { K: 5, step: 0.6 }));
  }
  return paint(merge(out), 0xeadd96, 0.04);
}
function buildNervous(ctx) {
  const arm = merge(armNerves(ctx)), leg = merge(legNerves(ctx));
  const nerveHex = 0xeadc92;
  return [
    { key: 'brain', mesh: brain() }, { key: 'cerebellum', mesh: cerebellum() }, { key: 'brainstem', mesh: brainstem() },
    { key: 'spinal-cord', mesh: spinalCord() }, { key: 'spinal-nerves', mesh: spinalNerves() }, { key: 'cranial-nerves', mesh: cranialNerves() },
    { key: 'arm-nerves-L', mesh: paint(arm, nerveHex, 0.04) }, { key: 'arm-nerves-R', mesh: paint(mirrorMesh(arm), nerveHex, 0.04) },
    { key: 'leg-nerves-L', mesh: paint(leg, nerveHex, 0.04) }, { key: 'leg-nerves-R', mesh: paint(mirrorMesh(leg), nerveHex, 0.04) },
  ];
}

// ====================================================================================

const HELP = { V3, merge, paint, mirrorMesh, loft, resample, sdfMesh, centerline, spAt, POSES, rgb, tubeM };
const BUILDERS = { reproductive: (ctx) => buildReproductive(ctx, HELP), skin: (ctx) => [{ key: 'skin', mesh: buildSkin(ctx, HELP) }], muscular: (ctx) => buildMuscular(ctx, HELP), organs: buildOrgans, respiratory: buildRespiratory, cardio: buildCardio, urinary: buildUrinary, nervous: buildNervous };
const PRESET_COLOR = { heart: 0xb3544c };

// ctx: { pos(boneId) -> Float32Array of world positions }
export function buildSystem(id, ctx) {
  const raw = BUILDERS[id](ctx);
  return raw.map((r) => {
    const info = OI[r.key] || { name: r.key };
    const mesh = r.mesh;
    if (!mesh.colors) paint(mesh, r.color || PRESET_COLOR[r.key] || 0xd8b0a8, 0.06);
    return { id: 'sys-' + r.key, key: r.key, system: id, mesh, info, cut: r.cut };
  });
}
