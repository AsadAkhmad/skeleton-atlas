// Skeletal muscles. Everything is built for the left side and mirrored. Attachments are taken from the
// bone meshes (centre lines of the long bones, extreme points of the scapula and so on) and from the pelvis
// landmarks, so the muscles run from bone to bone. Helpers arrive from systems.js as H to avoid a cycle.
import { applyPt, ell, rc, union, sub, inter, meshSDF } from './sdf.js';

const MUSCLE = 0xa23a33, MUSCLE2 = 0x93332e, TENDON = 0xe7d9c0;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function buildMuscular(ctx, H) {
  const { V3, merge, paint, mirrorMesh, loft, resample, sdfMesh, centerline, spAt, POSES } = H;
  const { STERN_M } = POSES;
  const SXM = ctx.sex === 'female' ? 0.86 : 1;                         // female muscle bulk
  const P = (id) => ctx.pos(id);
  const A = (a, d) => V3.add(a, d);
  const MX = (p) => [-p[0], p[1], p[2]];
  const at = (cl, u) => { const f = clamp(u, 0, 1) * (cl.length - 1), i = Math.min(cl.length - 2, Math.floor(f)); return V3.mix(cl[i], cl[i + 1], f - i); };
  const centroid = (id) => { const p = P(id); let x = 0, y = 0, z = 0; const n = p.length / 3; for (let i = 0; i < p.length; i += 3) { x += p[i]; y += p[i + 1]; z += p[i + 2]; } return [x / n, y / n, z / n]; };
  const extreme = (pos, f, ok) => { let best = -1e18, bp = [0, 0, 0]; for (let i = 0; i < pos.length; i += 3) { const x = pos[i], y = pos[i + 1], z = pos[i + 2]; if (ok && !ok(x, y, z)) continue; const v = f(x, y, z); if (v > best) { best = v; bp = [x, y, z]; } } return bp; };
  const bbox = (id) => { const p = P(id); const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[i + k]); mx[k] = Math.max(mx[k], p[i + k]); } return { mn, mx }; };

  // ---- limb centre lines and landmarks ----
  const hum = centerline(P('humerus-L'), 7, 0.03, 0.97), rad = centerline(P('radius-L'), 5, 0.03, 0.97), uln = centerline(P('ulna-L'), 5, 0.03, 0.97);
  const fem = centerline(P('femur-L'), 8, 0.05, 0.97), tib = centerline(P('tibia-L'), 7, 0.03, 0.96), fib = centerline(P('fibula-L'), 6, 0.04, 0.96);
  const coracoid = extreme(P('scapula-L'), (x, y, z) => z);
  const acromion = extreme(P('scapula-L'), (x, y, z) => x + 0.3 * y);
  const clavM = extreme(P('clavicle-L'), (x) => -x), clavL = extreme(P('clavicle-L'), (x) => x);
  const patella = bbox('patella-L');
  const calc = P('calcaneus-L');
  const heel = extreme(calc, (x, y, z) => -z);
  const SKT = [0, 163, -0.5];
  const P_infAng = () => extreme(P('scapula-L'), (x, y, z) => -y);
  const rib1 = () => centerline(P('rib-1-L'), 4, 0.0, 1.0).map((p) => p);
  const sk = (p) => A(p, SKT);
  const sternum = (x, y) => applyPt(STERN_M, [x, y, 0.75]);   // front of the sternum
  const tip = (y) => spAt(y).cz - 5.5;                         // spinous process tips

  // ---- torso envelope (ellipse per height) from the ribs ----
  const ribPos = []; for (let i = 1; i <= 12; i++) ribPos.push(P(`rib-${i}-L`));
  const ENV = [];
  for (let y = 108; y <= 146; y += 2) {
    let rx = 0, zb = 1e9, zf = -1e9;
    for (const p of ribPos) for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i + 1] - y) < 1.6) { rx = Math.max(rx, p[i]); zb = Math.min(zb, p[i + 2]); zf = Math.max(zf, p[i + 2]); }
    if (rx === 0) continue;
    if (y >= 122 && y <= 142) zf = Math.max(zf, 6.6);
    ENV.push([y, rx + 0.5, zb - 0.3, zf + 0.2]);
  }
  ENV.unshift([84, 13.2, -11.2, 10.6], [96, 14.0, -11.4, 10.4], [104, 14.2, -11.2, 9.0]);
  ENV.push([150, 5.8, -6.6, 5.0], [162, 5.0, -6.0, 5.4]);
  ENV.sort((a, b) => a[0] - b[0]);
  const env = (y) => {
    let i = 1; while (i < ENV.length - 1 && ENV[i][0] < y) i++;
    const a = ENV[i - 1], b = ENV[i], t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1);
    const L = (k) => a[k] + (b[k] - a[k]) * t;
    return { rx: L(1), zc: (L(2) + L(3)) / 2, rz: (L(3) - L(2)) / 2 };
  };
  const hug = (p, off) => {
    const e = env(p[1]), dx = p[0], dz = p[2] - e.zc;
    const rho = Math.hypot(dx / e.rx, dz / e.rz) || 1e-6;
    const nx = dx / (e.rx * e.rx), nz = dz / (e.rz * e.rz), nl = Math.hypot(nx, nz) || 1;
    return [dx / rho + (nx / nl) * off, p[1], e.zc + dz / rho + (nz / nl) * off];
  };
  const outDist = (p) => { const e = env(p[1]); const rho = Math.hypot(p[0] / e.rx, (p[2] - e.zc) / e.rz); return (rho - 1) * Math.min(e.rx, e.rz); };

  // ---- shapes ----
  const col = (m, hex, v = 0.06) => paint(m, hex, v);
  // spindle-shaped muscle between points, with tendons at both ends. R can be a number or [ra, rb] (ra across hint)
  function fus(pts, R, o = {}) {
    const te = o.te === undefined ? 0.14 : o.te, p = o.p || 0.8, hint = o.hint || [0, 0, 1];
    const [ra0, rb0] = Array.isArray(R) ? R : [R * (o.flat || 0.75), R];
    const ra = ra0 * SXM, rb = rb0 * SXM;
    const len = resample(pts, 40).length, n = clamp(Math.round(len / 0.45), 10, 140);
    const path = resample(pts, n).pts;
    const i0 = Math.max(1, Math.round(te * 0.7 * n)), i1 = Math.min(n - 2, n - 1 - Math.round(te * 0.7 * n));
    const sub = path.slice(i0, i1 + 1);
    const prof = (t) => { const g = i0 + t * (i1 - i0), u = clamp((g / (n - 1) - te) / (1 - 2 * te), 0, 1); return 0.1 + 0.9 * Math.pow(Math.sin(Math.PI * u), p); };
    const belly = loft(sub, (t) => { const k = prof(t); return [Math.max(0.08, ra * k), Math.max(0.1, rb * k)]; }, { K: 12, capN: 2, hint });
    const out = [col(belly, o.color || MUSCLE, 0.07)];
    if (!o.color) { // lengthwise fibre streaks: shade by angle around the belly
      const ph = Math.random() * 6, nb = belly.positions.length / 3 - 2, bc = belly.colors;
      for (let v = 0; v < nb; v++) { const k = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(((v % 12) / 12) * Math.PI * 2 * 4 + ph)); bc[3 * v] *= k; bc[3 * v + 1] *= k; bc[3 * v + 2] *= k; }
    }
    const tend = (seg, w) => { if (seg.length >= 2) out.push(col(loft(seg.length < 3 ? [seg[0], V3.mix(seg[0], seg[1], 0.5), seg[1]] : seg, () => [w * 0.55, w], { K: 6, capN: 1, hint }), TENDON, 0.03)); };
    tend(path.slice(0, i0 + 2), o.tw || 0.22);
    tend(path.slice(i1 - 1), o.tw || 0.22);
    return merge(out);
  }
  // flat muscle: fibres from origin line to insertion line, hugging the torso, drawn as a thin slab
  function sheet(O, I, T, o = {}) {
    const off = o.off === undefined ? 0.2 : o.off, M = o.M || 10, rows = O.length;
    T = T * SXM;
    const S = [], N = [];
    for (let i = 0; i < rows; i++) {
      const rowP = [], rowN = [];
      for (let j = 0; j <= M; j++) {
        const t = j / M, pl = V3.mix(O[i], I[i], t);
        const w = clamp(1 - Math.max(0, outDist(pl) - 1.2) / 4, 0, 1);
        const q = V3.mix(pl, hug(pl, off), w * (o.snap === undefined ? 1 : o.snap));
        const e = env(q[1]); const n = V3.nrm([q[0] / (e.rx * e.rx), 0, (q[2] - e.zc) / (e.rz * e.rz)]);
        rowP.push(q); rowN.push(n);
      }
      S.push(rowP); N.push(rowN);
    }
    const pos = [], idx = [];
    const th = (i, j) => { const u = rows > 1 ? i / (rows - 1) : 0.5, v = j / M; return 0.12 + T * Math.pow(Math.sin(Math.PI * (0.03 + 0.94 * u)), 0.45) * Math.pow(Math.sin(Math.PI * (0.06 + 0.88 * v)), 0.6); };
    for (let i = 0; i < rows; i++) for (let j = 0; j <= M; j++) { const q = S[i][j], n = N[i][j], t = th(i, j); pos.push(q[0] - n[0] * 0.05, q[1], q[2] - n[2] * 0.05, q[0] + n[0] * t, q[1] + n[1] * t, q[2] + n[2] * t); }
    const id = (i, j, s) => (i * (M + 1) + j) * 2 + s;
    for (let i = 0; i < rows - 1; i++) for (let j = 0; j < M; j++) {
      const a = id(i, j, 1), b = id(i + 1, j, 1), c = id(i + 1, j + 1, 1), d = id(i, j + 1, 1);
      idx.push(a, b, c, a, c, d);
      const e0 = id(i, j, 0), f = id(i + 1, j, 0), g = id(i + 1, j + 1, 0), h = id(i, j + 1, 0);
      idx.push(e0, g, f, e0, h, g);
    }
    for (let j = 0; j < M; j++) { const q = [[0, 1], [rows - 1, -1]]; for (const [i, dir] of q) { const a0 = id(i, j, 0), a1 = id(i, j, 1), b0 = id(i, j + 1, 0), b1 = id(i, j + 1, 1); dir > 0 ? idx.push(a0, a1, b1, a0, b1, b0) : idx.push(a0, b1, a1, a0, b0, b1); } }
    for (let i = 0; i < rows - 1; i++) for (const [j, dir] of [[0, 1], [M, -1]]) { const a0 = id(i, j, 0), a1 = id(i, j, 1), b0 = id(i + 1, j, 0), b1 = id(i + 1, j, 1); dir > 0 ? idx.push(a0, b1, a1, a0, b0, b1) : idx.push(a0, a1, b1, a0, b1, b0); }
    const positions = new Float32Array(pos), normals = new Float32Array(pos.length), indices = new Uint32Array(idx);
    for (let t = 0; t < indices.length; t += 3) {
      const a = indices[t] * 3, b = indices[t + 1] * 3, c = indices[t + 2] * 3;
      const u = [positions[b] - positions[a], positions[b + 1] - positions[a + 1], positions[b + 2] - positions[a + 2]], v = [positions[c] - positions[a], positions[c + 1] - positions[a + 1], positions[c + 2] - positions[a + 2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      for (const k of [a, b, c]) { normals[k] += n[0]; normals[k + 1] += n[1]; normals[k + 2] += n[2]; }
    }
    for (let i = 0; i < normals.length; i += 3) { const l = Math.hypot(normals[i], normals[i + 1], normals[i + 2]) || 1; normals[i] /= l; normals[i + 1] /= l; normals[i + 2] /= l; }
    const out = col({ positions, normals, indices }, o.color || MUSCLE, 0.05);
    // fibre streaks: each row of the sheet is one fibre, so vary the shade row by row
    for (let v = 0; v < positions.length / 3; v++) {
      const row = Math.floor(v / 2 / (M + 1)), k = 0.84 + 0.16 * (0.5 + 0.5 * Math.sin(row * 2.1 + 0.7 * Math.sin(row * 0.9)));
      out.colors[3 * v] *= k; out.colors[3 * v + 1] *= k; out.colors[3 * v + 2] *= k;
    }
    return out;
  }
  const lineOf = (a, b, n) => Array.from({ length: n }, (_, i) => V3.mix(a, b, n === 1 ? 0 : i / (n - 1)));
  const both = (m) => merge([m, mirrorMesh(m)]);
  const items = [];
  const add = (key, build, sym) => { try { const m = build(); if (m) items.push({ key, mesh: sym ? m : both(m), color: MUSCLE }); } catch (e) { console.warn('muscle failed', key, e); } };

  // ============================ head and neck ============================
  add('temporalis', () => {
    const f = ell(sk([6.75, 2.6, 1.0]), [0.55, 3.2, 3.5], [0, 0, 0]);
    const body = sdfMesh(f, sk([5, -1, -4]).map((v, i) => v), sk([9, 7, 6]), 0.1, null);
    const ten = fus([sk([6.4, 0.0, 2.2]), sk([5.6, -0.9, 3.0]), sk([5.1, -1.6, 3.4])], 0.35, { te: 0.1, hint: [1, 0, 0] });
    return merge([col(body, MUSCLE, 0.06), ten]);
  });
  add('masseter', () => fus([sk([6.5, 0.2, 3.4]), sk([6.1, -3.6, 1.6]), sk([5.7, -6.9, -0.4])], [0.45, 1.25], { hint: [1, 0, 0], te: 0.07 }));
  add('sternocleidomastoid', () => merge([
    fus([sk([5.7, -3.0, -1.6]), A(sk([5.0, -9, 2.0]), [0, 0, 0.3]), [3.2, 145.2, 3.5], [1.7, 141.3, 3.7]], [0.45, 1.05], { hint: [1, 0, 0.6], te: 0.09 }),
    fus([sk([5.7, -3.0, -1.6]), sk([5.4, -9.5, 2.2]), [4.6, 145.5, 3.0], A(clavM, [0.8, 0.2, 0.8])], [0.38, 0.8], { hint: [1, 0, 0.6], te: 0.09 }),
  ]));

  // ============================ back and shoulder ============================
  add('trapezius', () => {
    const ys = [161, 156, 150, 146, 142, 138, 133, 128, 122, 117];
    const O = ys.map((y) => [0.4, y, tip(y) - 0.2]);
    const I = [A(clavL, [-0.6, 0.6, 0.6]), A(clavL, [-2.0, 0.6, 0.3]), A(clavL, [0.3, 0.6, -1.6]), acromion, A(acromion, [-3.4, -0.2, -2.5]), A(acromion, [-6.6, -1.8, -3.2]), A(acromion, [-9.4, -3.0, -3.4]), [9.6, 133.5, -11.3], [9.4, 131.0, -11.6], [9.0, 129.5, -11.8]];
    return sheet(O, I, 0.9, { off: 0.5, M: 12 });
  });
  add('latissimus', () => {
    const O = [[0.5, 128, tip(128) - 0.2], [0.5, 124, tip(124) - 0.2], [0.6, 119, tip(119) - 0.2], [0.8, 114, tip(114) - 0.2], [1.2, 109, tip(109) - 0.2], [3.5, 104, -10.6], [6.6, 101.5, -9.0], [10.0, 102.2, -4.8]];
    const h0 = A(at(hum, 0.14), [-1.2, 0, 0.5]);
    const I = O.map((p, i) => A(h0, [0, -i * 0.1, -i * 0.12]));
    return sheet(O, I, 0.8, { off: 0.9, M: 12 });
  });
  add('pectoralis-major', () => {
    const O = [A(clavM, [1.0, 0.0, 1.0]), A(clavM, [3.5, 0.2, 0.9]), A(clavM, [6.2, 0.2, 0.9]), sternum(0.9, -2.5), sternum(1.2, -5.5), sternum(1.2, -8.5), sternum(1.4, -11.5), sternum(2.0, -14.2), [3.5, 120.5, 6.6]];
    const I = O.map((p, i) => A(at(hum, 0.1 + 0.014 * i), [-0.5, 0, 1.7]));
    return sheet(O, I, 0.95, { off: 0.35, M: 12 });
  });
  add('deltoid', () => {
    const ins = A(at(hum, 0.42), [1.7, 0, 0]);
    const sh = at(hum, 0);
    const front = fus([A(clavL, [-2.5, 0.8, 0.8]), A(sh, [0.2, 3.2, 3.0]), A(at(hum, 0.22), [2.2, 0, 2.0]), ins], [1.15, 1.3], { hint: [1, 0, 0.3], te: 0.1, flat: 0.9 });
    const mid = fus([A(acromion, [-0.6, 0.6, 0.2]), A(sh, [3.4, 2.4, 0.0]), A(at(hum, 0.22), [3.3, 0, -0.2]), ins], [1.3, 1.7], { hint: [1, 0, 0], te: 0.1, flat: 0.9 });
    const back = fus([A(acromion, [-4.0, -0.4, -3.2]), A(sh, [1.4, 3.2, -3.4]), A(at(hum, 0.22), [2.2, 0, -2.1]), ins], [1.15, 1.3], { hint: [1, 0, -0.3], te: 0.1, flat: 0.9 });
    return merge([front, mid, back]);
  });
  add('rotator-cuff', () => {
    const f = union(0.4, ell([14.0, 133.4, -13.0], [4.7, 3.6, 0.95], [0, 0, -12]), ell([13.2, 141.4, -11.6], [4.3, 1.6, 1.0], [0, 0, -8]), ell([17.4, 129.4, -9.8], [3.0, 1.0, 1.1], [0, 0, 20]));
    const body = sdfMesh(f, [7, 124, -16], [24, 146, -6], 0.1, null);
    return merge([col(body, MUSCLE2, 0.06), fus([[17.6, 134, -12.2], [19.8, 137.5, -8.0], A(at(hum, 0), [1.8, 0.8, -1.2])], 0.5, { te: 0.15 }), fus([[19.2, 128.8, -9.2], [21.0, 131.8, -5.4], A(at(hum, 0.07), [0.6, 0.2, -1.4])], 0.55, { te: 0.15 })]);
  });

  // ============================ arm ============================
  add('biceps-brachii', () => {
    const e1 = A(at(hum, 0.99), [-0.2, 0, 1.4]), r1 = A(at(rad, 0.1), [-0.3, 0, 1.0]);
    const long = fus([A(coracoid, [0.5, 1.5, 0.6]), A(at(hum, 0.08), [0.2, 0, 2.0]), A(at(hum, 0.5), [-0.2, 0, 2.2]), e1, r1], [1.1, 1.5], { te: 0.1, hint: [1, 0, 0] });
    const short = fus([A(coracoid, [0.0, -0.4, 0.2]), A(at(hum, 0.1), [-1.4, 0, 1.6]), A(at(hum, 0.5), [-1.2, 0, 1.9]), e1, r1], [1.0, 1.3], { te: 0.1, hint: [1, 0, 0] });
    return merge([long, short]);
  });
  add('triceps-brachii', () => {
    const ol = A(uln[0], [0, 0.2, -1.0]);
    const longH = fus([A(at(hum, 0), [-0.3, -1.4, -1.9]), A(at(hum, 0.35), [-0.4, 0, -2.3]), A(at(hum, 0.8), [-0.2, 0, -2.0]), ol], [1.2, 1.5], { te: 0.08, hint: [1, 0, 0] });
    const lat = fus([A(at(hum, 0.14), [1.2, 0, -1.8]), A(at(hum, 0.5), [1.6, 0, -1.5]), A(at(hum, 0.85), [1.0, 0, -1.7]), ol], [0.95, 1.3], { te: 0.08, hint: [1, 0, 0] });
    return merge([longH, lat]);
  });
  add('forearm-flexors', () => {
    const o = A(at(hum, 1), [-2.2, -0.3, 0.2]);
    return merge([0, 1, 2].map((k) => fus([o, A(at(rad, 0.12), [-0.9 + 0.8 * k, 0, 1.5 - 0.4 * k]), A(at(rad, 0.45), [-0.6 + 0.6 * k, 0, 1.2]), A(at(rad, 0.98), [-0.4 + 0.5 * k, -0.4, 0.9])], [0.55, 0.75], { te: 0.34, hint: [1, 0, 0] })));
  });
  add('forearm-extensors', () => {
    const o = A(at(hum, 1), [2.2, -0.3, -0.2]);
    return merge([0, 1, 2].map((k) => fus([o, A(at(rad, 0.12), [1.2 - 0.9 * k, 0, -1.4 - 0.2 * k]), A(at(rad, 0.45), [0.8 - 0.6 * k, 0, -1.4]), A(at(rad, 0.98), [0.5 - 0.5 * k, -0.4, -1.0])], [0.5, 0.7], { te: 0.34, hint: [1, 0, 0] })).concat([fus([A(at(hum, 0.82), [1.9, 0, 0.5]), A(at(rad, 0.1), [1.7, 0, 0.9]), A(at(rad, 0.55), [1.2, 0, 0.7]), A(at(rad, 0.98), [0.9, -0.5, 0.2])], [0.55, 0.75], { te: 0.3, hint: [1, 0, 0] })]));
  });

  // ============================ trunk ============================
  add('rectus-abdominis', () => {
    const zw = (y) => env(y).zc + env(y).rz + 0.7;
    const ys = []; for (let y = 90.5; y <= 126; y += 1.6) ys.push(y);
    const path = ys.map((y) => [1.0 + (y - 90) * 0.06, y, zw(y)]);
    const m = loft(path, (t) => { const dip = 0.18 * Math.pow(Math.sin(t * Math.PI * 5), 2) * (t > 0.08 && t < 0.92 ? 1 : 0); return [0.62 - dip, 1.65 * (0.75 + 0.25 * Math.sin(Math.PI * clamp(t * 1.05, 0, 1))) - dip * 0.6]; }, { K: 12, capN: 2, hint: [0, 0, 1] });
    return col(m, MUSCLE, 0.07);
  });
  add('external-oblique', () => {
    const O = [], I = [];
    for (let k = 0; k < 8; k++) { const y = 128 - k * 2.5; const e = env(y); O.push([e.rx * 0.78, y, e.zc + e.rz * 0.62]); I.push([Math.min(5.6, 4.0 + k * 0.4), y - 9.5 - k * 0.5, env(y - 10).zc + env(y - 10).rz]); }
    return sheet(O, I, 0.85, { off: 0.5, M: 12 });
  });
  add('erector-spinae', () => {
    const pts = [[3.0, 91, -9.8], [3.4, 100, tip(100) + 2.0], [3.6, 110, tip(110) + 2.2], [3.9, 120, tip(120) + 2.6], [4.2, 130, tip(130) + 2.6], [3.9, 140, tip(140) + 2.4], [3.2, 148, tip(148) + 2.2], [3.0, 156, -5.8], [3.6, 161, -7.8]];
    const m = loft(resample(pts, 120).pts, (t) => [1.35 * (0.55 + 0.45 * Math.sin(Math.PI * clamp(t * 0.9 + 0.05, 0, 1))), 2.0 * (0.45 + 0.55 * Math.sin(Math.PI * clamp(t * 0.95 + 0.02, 0, 1)))], { K: 12, capN: 2, hint: [0, 0, 1] });
    return col(m, MUSCLE2, 0.07);
  });
  add('psoas-major', () => fus([[2.8, 113, -5.4], [3.4, 106, -5.0], [5.2, 100, -3.8], [7.0, 95, -1.0], [8.0, 90.5, 3.2], [7.0, 87.0, 3.8], A(at(fem, 0.12), [-1.8, 0, -1.2])], [1.2, 1.5], { te: 0.1, hint: [1, 0, 0] }));
  add('diaphragm', () => {
    const dome = (cx, cy) => { const R = (k) => ell([cx, cy, 1.5], [10 - k, 12 - k, 12 - k]); return inter(sub(R(0), R(0.6)), (x, y, z) => cy + 1.0 - y, 0.2); };
    const box = (x, y, z) => ell([0, 118, -2.6], [13.8, 14, 9.8])(x, y, z);
    const f = inter(union(0.6, dome(4.5, 110.5), dome(-4.5, 113.0)), box, 0.3);
    return col(sdfMesh(f, [-15.5, 108, -13], [15.5, 126.5, 8], 0.2, null), 0xa5483f, 0.06);
  }, true);

  // ============================ hip and thigh ============================
  const ASIS = [12.5, 100.3, 9.0], PSIS = [4.9, 100.2, -10.4], ISCH = [6.3, 84.4, -3.8], PUB = [2.0, 89.8, 8.3], AIIS = [11.0, 95.2, 7.2];
  const CREST = [[12.4, 100.4, 8.9], [14.0, 102.6, 6.0], [15.1, 104.4, 2.6], [14.2, 105.4, -2.0], [11.2, 104.4, -6.2], [6.2, 101.4, -9.6]];
  const troch = A(at(fem, 0), [2.9, 1.0, 0.4]);
  add('gluteus-maximus', () => {
    const O = [PSIS, [4.0, 97.0, -10.8], [2.8, 93.0, -10.4], [1.6, 89.0, -9.8], [1.0, 85.0, -8.8]];
    const tubes = O.map((o, k) => {
      const ins = V3.mix(A(at(fem, 0.04), [1.6, 0, -2.4]), A(at(fem, 0.26), [0.2, 0, -2.8]), k / (O.length - 1));
      const mid = V3.mix(o, ins, 0.5); mid[2] = Math.min(mid[2], -9.6) - 2.0; mid[0] += 1.5;
      return fus([o, mid, ins], [1.3, 2.0], { te: 0.08, hint: [0, 0, 1] });
    });
    return merge(tubes);
  });
  add('gluteus-medius', () => {
    const tubes = CREST.map((c, k) => {
      const o = A(c, [-1.4, -3.4, 0]), mid = A(V3.mix(o, troch, 0.5), [1.6, 1.0, 0]);
      return fus([o, mid, troch], [0.75, 1.15], { te: 0.1, hint: [1, 0, 0] });
    });
    return merge(tubes);
  });
  add('quadriceps', () => {
    const pt = [(patella.mn[0] + patella.mx[0]) / 2, patella.mx[1] + 0.3, (patella.mn[2] + patella.mx[2]) / 2 + 0.4];
    const rf = fus([AIIS, A(at(fem, 0.2), [-0.4, 0, 3.4]), A(at(fem, 0.5), [0.2, 0, 3.8]), A(at(fem, 0.95), [0.0, 0.0, 3.4]), pt], [1.6, 2.3], { te: 0.1, hint: [1, 0, 0] });
    const vl = fus([A(at(fem, 0.02), [2.4, -0.5, 0.4]), A(at(fem, 0.4), [3.4, 0, 1.0]), A(at(fem, 0.85), [3.0, 0, 1.7]), A(pt, [2.4, -0.6, 0.2])], [2.0, 2.6], { te: 0.1, hint: [1, 0, 0] });
    const vm = fus([A(at(fem, 0.3), [-2.0, 0, 1.0]), A(at(fem, 0.65), [-3.2, 0, 1.8]), A(at(fem, 0.98), [-2.7, -0.5, 1.6]), A(pt, [-2.2, -0.8, 0.2])], [1.6, 2.2], { te: 0.12, hint: [1, 0, 0] });
    const vi = fus([A(at(fem, 0.2), [0, 0, 2.6]), A(at(fem, 0.6), [0, 0, 2.8]), A(pt, [0, -0.3, -0.5])], [1.2, 1.8], { te: 0.12, hint: [1, 0, 0] });
    return merge([rf, vl, vm, vi]);
  });
  add('sartorius', () => fus([ASIS, A(at(fem, 0.18), [-0.2, 0, 4.6]), A(at(fem, 0.5), [-2.8, 0, 2.6]), A(at(fem, 1), [-3.6, -1.0, -0.4]), A(tib[0], [-2.4, -2.0, 0.6])], [0.45, 0.7], { te: 0.08, hint: [1, 0, 0.5], p: 0.5 }));
  add('adductors', () => {
    const origins = [PUB, [3.6, 87.6, 6.6], [5.0, 85.8, 1.0], ISCH];
    const grac = fus([A(PUB, [-0.4, -0.2, 0]), A(at(fem, 0.3), [-4.4, 0, 0.6]), A(at(fem, 0.95), [-4.0, -1.0, -0.6]), A(tib[0], [-2.8, -2.6, 0.2])], [0.38, 0.65], { te: 0.1, hint: [1, 0, 0] });
    const adds = origins.map((o, k) => fus([o, A(at(fem, 0.25 + 0.12 * k), [-3.0, 0, -0.6 - 0.2 * k]), A(at(fem, 0.46 + 0.16 * k), [-1.7, 0, -1.6])], [0.9, 1.5], { te: 0.1, hint: [1, 0, 0] }));
    return merge([grac, ...adds]);
  });
  add('hamstrings', () => {
    const bf = fus([ISCH, A(at(fem, 0.4), [1.6, 0, -3.5]), A(at(fem, 0.95), [2.4, 0, -3.0]), A(fib[0], [0.4, 0.4, -0.6])], [1.3, 1.9], { te: 0.1, hint: [1, 0, 0] });
    const sm = fus([A(ISCH, [-0.4, 0, 0]), A(at(fem, 0.4), [-0.9, 0, -3.9]), A(at(fem, 0.95), [-1.6, 0, -3.1]), A(tib[0], [-2.8, -3.2, -1.2])], [1.2, 1.7], { te: 0.12, hint: [1, 0, 0] });
    const st = fus([A(ISCH, [-0.2, 0.4, 0]), A(at(fem, 0.45), [-1.5, 0, -3.0]), A(at(fem, 0.97), [-2.2, 0, -2.6]), A(tib[0], [-2.6, -3.0, -0.4])], [0.9, 1.2], { te: 0.3, hint: [1, 0, 0] });
    return merge([bf, sm, st]);
  });

  // ============================ leg ============================
  const achO = A(at(tib, 0.62), [0, 0, -2.9]), achI = A(heel, [0.2, 2.2, 0.4]);
  add('gastrocnemius', () => {
    const med = fus([A(at(fem, 1), [-1.8, -1.2, -2.8]), A(at(tib, 0.1), [-1.7, 0, -3.8]), A(at(tib, 0.34), [-1.2, 0, -3.5]), achO], [1.7, 2.2], { te: 0.1, hint: [1, 0, 0] });
    const lat = fus([A(at(fem, 1), [1.8, -1.2, -2.8]), A(at(tib, 0.1), [1.5, 0, -3.8]), A(at(tib, 0.34), [1.0, 0, -3.5]), achO], [1.5, 2.0], { te: 0.1, hint: [1, 0, 0] });
    const tendon = fus([achO, A(at(tib, 0.9), [0, 0, -2.6]), achI], [0.5, 0.9], { te: 0.03, p: 0.2, tw: 0.4, hint: [1, 0, 0], color: TENDON });
    return merge([med, lat, tendon]);
  });
  add('soleus', () => fus([A(at(tib, 0.08), [0.6, 0, -2.4]), A(at(tib, 0.3), [0.4, 0, -2.2]), A(at(tib, 0.62), [0.3, 0, -2.5]), achO], [1.4, 2.0], { te: 0.12, hint: [1, 0, 0] }));
  add('tibialis-anterior', () => {
    const foot = centroid('cuneiform-medial-L');
    return fus([A(tib[0], [1.8, -1.0, 1.0]), A(at(tib, 0.3), [1.5, 0, 2.2]), A(at(tib, 0.7), [0.8, 0, 2.5]), A(at(tib, 0.97), [-0.6, -0.5, 2.4]), A(foot, [0, 0.5, 0.8])], [0.8, 1.15], { te: 0.3, hint: [1, 0, 0] });
  });
  add('fibularis-longus', () => {
    const foot = centroid('cuboid-L');
    return fus([A(fib[0], [0.4, 0, 0.2]), A(at(fib, 0.4), [1.2, 0, 0.4]), A(at(fib, 0.9), [1.4, 0, -0.2]), A(at(fib, 1), [1.2, -1.4, -0.8]), A(foot, [0.3, -1.0, 0.0])], [0.7, 1.0], { te: 0.3, hint: [1, 0, 0] });
  });


  // ============================ face ============================
  const ringPath = (c, rx, ry, n = 26, zc = 0) => Array.from({ length: n + 1 }, (_, i) => { const a = (i / n) * Math.PI * 2; return [c[0] + rx * Math.cos(a), c[1] + ry * Math.sin(a), c[2] + zc * Math.cos(a)]; });
  const ringM = (c, rx, ry, w, t, color) => col(loft(ringPath(c, rx, ry), () => [t * SXM, w * SXM], { K: 10, capN: 0, hint: [0, 0, 1] }), color || MUSCLE, 0.06);
  add('orbicularis-oculi', () => merge([ringM(sk([3.4, 1.8, 9.6]), 2.55, 2.15, 0.5, 0.2), ringM(sk([3.4, 1.8, 9.5]), 1.7, 1.35, 0.35, 0.16, MUSCLE2)]));
  add('orbicularis-oris', () => ringM(sk([0, -6.0, 10.2]), 2.9, 1.65, 0.65, 0.5), true);
  add('zygomaticus', () => merge([
    fus([sk([5.4, -0.8, 6.8]), sk([4.2, -3.4, 8.4]), sk([2.7, -5.7, 9.9])], [0.22, 0.38], { te: 0.18, tw: 0.1, hint: [0, 0, 1] }),
    fus([sk([4.9, -0.2, 7.9]), sk([3.6, -3.0, 9.2]), sk([2.2, -5.1, 10.2])], [0.15, 0.26], { te: 0.2, tw: 0.08, hint: [0, 0, 1] })]));
  add('frontalis', () => {
    const shell = (r) => ell(sk([0, 3.0, 2.5]), [6.7 + r, 7.4 + r, 7.1 + r]);
    const f = inter(sub(shell(0.5), shell(0.1)), (x, y, z) => Math.max(Math.abs(x) - 5.6, 166.7 - y, y - 170.5, 3.0 - z), 0.1);
    return col(sdfMesh(f, sk([-7, 3.5, 2]), sk([7, 8.5, 11]), 0.1, null), MUSCLE2, 0.05);
  }, true);
  add('platysma', () => {
    const O = [sk([4.2, -8.0, 4.0]), sk([3.2, -8.3, 6.6]), sk([2.0, -8.5, 8.6]), sk([0.7, -8.6, 9.3])];
    const I = [[9.6, 141.4, -2.0], [7.2, 141.2, 1.2], [4.8, 141.0, 3.4], [2.4, 140.9, 4.2]];
    return sheet(O, I, 0.35, { off: 0.25, M: 10, snap: 1 });
  });
  add('neck-muscles', () => {
    const sc = [0, 1, 2].map((k) => fus([[1.8 + k * 0.2, 150.2 + k * 0.3, -3.6 + k * 0.3], [3.0 + k * 0.3, 145.8, -1.4 + k * 0.6], A(centroid('rib-1-L'), [-0.2 + k * 0.4, 0.4, 0.2])], [0.35, 0.5], { te: 0.12, hint: [1, 0, 0] }));
    const spl = fus([[0.8, 144.2, tip(144) - 0.4], [2.6, 151.0, tip(151) + 0.6], sk([4.4, -2.6, -3.0])], [0.8, 1.7], { te: 0.12, hint: [0, 0, 1] });
    return merge([...sc, spl]);
  });

  // ============================ deep and superficial trunk, shoulder girdle ============================
  const scapMed = (u) => [9.2 + 0.3 * u, 143.2 - 12 * u, -11.2 - 0.5 * u];
  add('serratus-anterior', () => {
    const O = [], I = [];
    for (let k = 0; k < 8; k++) { const y = 140.5 - k * 2.2, e = env(y); O.push([e.rx * 0.94, y - 0.5, e.zc + e.rz * 0.18 - k * 0.2]); I.push(scapMed(Math.min(1, k / 7.5))); }
    return sheet(O, I, 0.5, { off: 0.2, M: 10 });
  });
  add('rhomboids', () => {
    const O = [], I = [];
    for (let k = 0; k < 7; k++) { const y = 147.5 - k * 2.0; O.push([0.7, y, tip(y) + 0.4]); I.push(scapMed(Math.min(1, k / 6.5))); }
    return sheet(O, I, 0.55, { off: 0.2, M: 8 });
  });
  add('abdominal-wall-deep', () => {
    const mk = (offs, T, k0) => { const O = [], I = []; for (let k = 0; k < 7; k++) { const y = 123 - k * 2.6, e = env(y); O.push([e.rx * 0.8, y, e.zc + e.rz * 0.5]); I.push([Math.min(5.0, 3.6 + k * 0.4), y - 5.5 - k * 0.4 * k0, env(y - 6).zc + env(y - 6).rz]); } return sheet(O, I, T, { off: offs, M: 10 }); };
    return merge([mk(0.1, 0.7, 0.6), mk(-0.4, 0.55, 0.3)]);
  });
  add('quadratus-lumborum', () => fus([[7.2, 101.5, -9.0], [6.0, 107.0, -9.8], [4.0, 112.4, -9.8]], [0.8, 1.3], { te: 0.1, hint: [0, 0, 1] }));
  add('pectoralis-minor', () => merge([0, 1, 2].map((k) => { const y = 133 - k * 2.2, e = env(y); const o = [e.rx * 0.62, y, e.zc + e.rz * 0.9]; return fus([o, A(coracoid, [-3.0 + k * 0.8, -4.0 + k * 1.6, 1.4]), A(coracoid, [0.2, -0.3, 0.4])], [0.5, 0.65], { te: 0.12, hint: [1, 0, 0] }); })));
  add('teres-major', () => fus([A(P_infAng(), [0.4, 0.2, -0.4]), A(at(hum, 0.1), [-0.4, 0, -1.6]), A(at(hum, 0.14), [-1.1, 0, 0.1])], [0.8, 1.2], { te: 0.1, hint: [0, 0, 1] }));
  add('brachialis-coracobrachialis', () => {
    const br = fus([A(at(hum, 0.5), [0.4, 0, 1.1]), A(at(hum, 0.85), [0.1, 0, 1.3]), A(at(hum, 1), [-0.1, -0.4, 1.0]), A(uln[0], [-0.1, -1.6, 1.4])], [0.7, 1.35], { te: 0.1, hint: [1, 0, 0] });
    const co = fus([A(coracoid, [-0.3, -0.4, 0.0]), A(at(hum, 0.14), [-1.1, 0, 0.9]), A(at(hum, 0.4), [-1.2, 0, 0.5])], [0.4, 0.6], { te: 0.1, hint: [1, 0, 0] });
    return merge([br, co]);
  });
  add('pronator-teres', () => fus([A(at(hum, 1), [-2.3, -0.5, 0.5]), A(at(rad, 0.2), [-0.6, 0, 1.4]), A(at(rad, 0.5), [1.0, 0, 0.6])], [0.45, 0.7], { te: 0.1, hint: [0, 0, 1] }));

  // ============================ hand: tendons along each finger, thenar and hypothenar ============================
  const centroidSafe = (id) => { try { return centroid(id); } catch (e) { return null; } };
  add('finger-tendons', () => {
    const out = [];
    for (let n = 1; n <= 5; n++) {
      const segs = n === 1 ? ['finger-1-prox-L', 'finger-1-dist-L'] : [`finger-${n}-prox-L`, `finger-${n}-mid-L`, `finger-${n}-dist-L`];
      const pts = [A(at(rad, 1), [(n - 3) * 0.55, -0.2, 1.0])];
      const mc = centroidSafe(`metacarpal-${n}-L`); if (mc) pts.push(A(mc, [0, 0, 1.1]));
      for (const id of segs) { try { const cl = centerline(P(id), 3, 0.15, 0.85); for (const p of cl) pts.push(A(p, [0, 0, 0.62])); } catch (e) {} }
      if (pts.length > 3) out.push(col(H.tubeM(pts, 0.14, { K: 6, capN: 1, step: 0.35 }), TENDON, 0.03));
    }
    return merge(out);
  });
  add('hand-muscles', () => {
    const out = [];
    const t = centroidSafe('metacarpal-1-L'), h = centroidSafe('metacarpal-5-L');
    if (t) out.push(col(sdfMesh(ell(A(t, [-0.5, 0.9, 1.1]), [1.15, 2.1, 0.95], [0, 0, 24]), A(t, [-4, -3, -1]), A(t, [4, 5, 4]), 0.08, null), MUSCLE, 0.06));
    if (h) out.push(col(sdfMesh(ell(A(h, [0.5, 0.6, 1.0]), [0.9, 2.3, 0.8], [0, 0, -12]), A(h, [-4, -4, -1]), A(h, [4, 5, 4]), 0.08, null), MUSCLE, 0.06));
    return merge(out);
  });

  // ============================ hip, thigh, leg and foot (more) ============================
  add('gluteus-minimus-piriformis', () => {
    const gm = [0, 1, 2].map((k) => fus([A(CREST[1 + k], [-2.4, -6.2, 0]), A(V3.mix(A(CREST[1 + k], [-2.4, -6.2, 0]), troch, 0.5), [1.0, 0.4, 0]), A(troch, [0, -0.6, 0.4])], [0.55, 0.85], { te: 0.1, hint: [1, 0, 0] }));
    const pir = fus([[2.0, 92.8, -6.0], [5.6, 91.6, -7.0], A(troch, [-0.4, 0.2, -0.2])], [0.55, 0.9], { te: 0.1, hint: [0, 0, 1] });
    return merge([...gm, pir]);
  });
  add('tfl-iliotibial', () => merge([
    fus([A(ASIS, [1.2, -0.4, 0.2]), A(at(fem, 0.1), [3.6, 0, 1.4]), A(at(fem, 0.25), [3.9, 0, 0.9])], [0.65, 1.15], { te: 0.1, hint: [1, 0, 0] }),
    fus([A(at(fem, 0.2), [3.9, 0, 0.7]), A(at(fem, 0.6), [3.9, 0, 0.3]), A(at(fem, 1), [3.6, -0.6, 0.2]), A(tib[0], [2.6, -2.2, 1.0])], [0.18, 0.95], { te: 0.02, tw: 0.3, p: 0.2, hint: [1, 0, 0], color: TENDON })]));
  add('pectineus', () => fus([A(PUB, [0.8, 1.0, -0.2]), A(at(fem, 0.04), [-2.2, 0, 0.2]), A(at(fem, 0.2), [-1.9, 0, -1.4])], [0.55, 1.0], { te: 0.12, hint: [0, 0, 1] }));
  add('popliteus', () => fus([A(at(fem, 1), [1.6, -1.0, -2.0]), A(tib[0], [0.4, -1.2, -2.4]), A(at(tib, 0.12), [-1.0, 0, -1.6])], [0.5, 0.85], { te: 0.12, hint: [1, 0, 0] }));
  add('shin-extensors', () => {
    const edl = fus([A(tib[0], [2.4, -1.4, 1.6]), A(at(tib, 0.4), [2.8, 0, 1.6]), A(at(tib, 0.9), [1.2, 0, 2.2]), A(centroidSafe('metatarsal-3-L') || at(tib, 1), [0, 1.0, -2.0])], [0.55, 0.8], { te: 0.3, hint: [1, 0, 0] });
    const ehl = fus([A(at(tib, 0.3), [2.1, 0, 1.4]), A(at(tib, 0.85), [0.8, 0, 2.1]), A(centroidSafe('metatarsal-1-L') || at(tib, 1), [0, 1.0, 0.2])], [0.3, 0.45], { te: 0.3, hint: [1, 0, 0] });
    return merge([edl, ehl]);
  });
  add('fibularis-brevis', () => fus([A(at(fib, 0.5), [1.1, 0, 0.2]), A(at(fib, 1), [1.4, -1.2, -0.6]), A(centroidSafe('metatarsal-5-L') || at(fib, 1), [0.4, 0.6, -1.0])], [0.45, 0.7], { te: 0.3, hint: [1, 0, 0] }));
  add('foot-muscles', () => {
    const out = [];
    const heelC = extreme(calc, (x, y, z) => -y), mts = [1, 2, 3, 4, 5].map((n) => centroidSafe(`metatarsal-${n}-L`)).filter(Boolean);
    const floorY = 0.9;
    for (const m of mts) out.push(col(H.tubeM([A(heelC, [0, 0.4, 0.8]), [(heelC[0] + m[0]) / 2, floorY + 0.5, (heelC[2] + m[2]) / 2], [m[0], floorY + 0.4, m[2] + 3.4]], 0.3, { K: 6, capN: 1, step: 0.4 }), TENDON, 0.03));
    if (mts.length) {
      const m1 = mts[0], m5 = mts[mts.length - 1];
      const fc = [(m1[0] + m5[0]) / 2, 1.6, (heelC[2] + m1[2]) / 2 + 0.6];
      out.push(col(sdfMesh(ell(fc, [Math.abs(m1[0] - m5[0]) / 2 + 0.4, 0.8, 4.2]), A(fc, [-6, -3, -7]), A(fc, [6, 3, 7]), 0.1, null), MUSCLE2, 0.06));
      out.push(col(H.tubeM([A(heelC, [-0.6, 0.8, 0.6]), A(m1, [-0.2, -0.2, 1.6])], 0.55, { K: 8, step: 0.4 }), MUSCLE, 0.06));
    }
    return merge(out);
  });

  return items;
}
