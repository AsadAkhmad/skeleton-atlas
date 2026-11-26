// Hand and foot bones (LEFT side). Hand frame: origin = carpus centre, +x lateral (thumb side),
// +y proximal (up), +z palmar. Foot frame: origin = ankle-joint centre, +x lateral, +y up, +z anterior.
import { sphere, ell, rc, box, tor, cyl, tube, poly, inter, union, sub, meshSDF, transformMesh, matFrom, matMul, MAT_I } from './sdf.js';

const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };
const add = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

// ---- generic shaft bones, built along -y from y=0 ----
function longBone(L, wb, ws, wh, opts = {}) {
  const curve = opts.curve === undefined ? -0.08 : opts.curve;
  const base = ell([0, -0.32, 0], [wb, 0.5, wb * 0.92]);
  const shaft = tube([[0, -0.5, curve], [0, -L * 0.5, curve * 1.6], [0, -(L - 0.6), curve]], [ws * 1.1, ws * 0.85, ws * 1.02], 0);
  const head = sphere([0, -(L - 0.52), 0.04], wh);
  let f = union(0.28, base, shaft, head);
  if (opts.sub) f = sub(f, opts.sub, 0.1);
  return { f, min: [-wb - 0.5, -L - 0.6, -wb - 0.6], max: [wb + 0.5, 0.8, wb + 0.6], h: opts.h || 0.045, bump: { amp: 0.02, freq: 2.0 } };
}
function phalanx(L, wb, ws, wh, type) {
  const base = ell([0, -0.28, 0], [wb, 0.34, wb * 0.78]);
  const shaft = rc([0, -0.4, -0.04], [0, -(L - 0.5), -0.04], ws, ws * 0.92);
  let parts = [base, shaft];
  if (type === 'dist') {
    parts.push(ell([0, -(L - 0.45), 0], [wh * 1.0, 0.5, wh * 0.55]));
    parts.push(rc([0, -(L - 0.7), 0], [0, -(L - 0.1), 0], wh * 0.6, wh * 0.25));
  } else {
    parts.push(ell([wh * 0.36, -(L - 0.3), 0.05], [wh * 0.46, 0.34, wh * 0.58]));
    parts.push(ell([-wh * 0.36, -(L - 0.3), 0.05], [wh * 0.46, 0.34, wh * 0.58]));
  }
  let f = union(0.2, ...parts);
  return { f, min: [-wb - 0.4, -L - 0.4, -wb - 0.4], max: [wb + 0.4, 0.6, wb + 0.4], h: 0.035, bump: { amp: 0.012, freq: 2.5 } };
}
// keep the side of a plane: n.p <= d (n need not be unit); k softens the edge
const cut = (f, n, d, k = 0.12) => { const l = Math.hypot(...n); const u = n.map((c) => c / l); return inter(f, (x, y, z) => u[0] * x + u[1] * y + u[2] * z - d / l, k); };
const mk = (spec) => meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump || undefined });

function place(mesh, pos, dir, xHint = [1, 0, 0]) {
  // bone extends along -y locally; map local -y to dir
  const ay = dir.map((c) => -c);
  return transformMesh(mesh, matFrom(pos, { y: ay, x: xHint }));
}
function flex(d, n, deg) { const a = deg * Math.PI / 180; return norm(add(d.map((c) => c * Math.cos(a)), n, Math.sin(a))); }

// --------------------------- HAND ---------------------------
export function hand() {
  const out = {};
  const C = (key, f, mn, mx, h = 0.045) => { out[key] = meshSDF(f, mn, mx, h, { bump: { amp: 0.015, freq: 2.2 } }); };
  // carpals
  {
    // scaphoid: curved boat, waist, concave distal-ulnar socket, palmar tubercle
    let f = union(0.35, tube([[1.55, 0.95, -0.1], [2.2, 0.05, 0.1], [2.75, -0.85, 0.45]], [0.6, 0.7, 0.72]), ell([2.1, 0.45, -0.1], [0.62, 0.5, 0.5]));
    f = sub(f, sphere([1.2, -0.65, 0.0], 0.95), 0.25);
    f = union(0.15, f, ell([2.85, -1.05, 0.95], [0.46, 0.42, 0.42]));
    C('scaphoid', f, [0.2, -2.3, -1.2], [4.0, 2.2, 1.8]);
  }
  {
    // lunate: half-moon, convex proximal, deep distal socket, palmar horn larger than dorsal
    let f = union(0.25, ell([0.45, 0.75, 0.0], [0.86, 0.78, 0.6]), ell([0.45, 0.55, 0.42], [0.7, 0.55, 0.42]));
    f = sub(f, sphere([0.42, 0.0, 0.0], 0.78), 0.12);
    C('lunate', f, [-0.8, -0.5, -1], [1.8, 2.1, 1.3]);
  }
  C('triquetrum', union(0.2, box([-1.3, 0.55, -0.05], [0.78, 0.68, 0.7], 0.34, [0, 0, 24]), ell([-1.65, 0.35, 0.35], [0.45, 0.45, 0.35])), [-2.5, -0.5, -1], [0, 1.9, 1.2]);
  C('pisiform', union(0.2, ell([-1.8, 0.2, 1.05], [0.5, 0.6, 0.5]), rc([-1.65, 0.2, 0.7], [-1.5, 0.3, 0.45], 0.3, 0.2)), [-2.7, -0.7, 0.1], [-0.7, 1.2, 1.9], 0.035);
  {
    // trapezium: saddle for the thumb metacarpal, palmar tubercle
    let f = union(0.2, box([2.65, -1.55, 0.35], [0.92, 0.98, 0.8], 0.4, [0, 0, 18]), ell([2.4, -1.75, 1.05], [0.38, 0.5, 0.42]));
    f = sub(f, ell([3.55, -2.2, 0.55], [0.7, 0.55, 0.6], [0, 0, 30]), 0.25);
    C('trapezium', f, [1.4, -3.0, -0.7], [4.4, 0.1, 2.0]);
  }
  C('trapezoid', union(0.2, cut(box([1.35, -1.55, -0.05], [0.66, 0.68, 0.62], 0.3), [0, 1, 0.55], 0.1, 0.2)), [0.5, -2.5, -1], [2.3, -0.6, 1]);
  {
    // capitate: rounded head proximally, neck, broad body, dorsal-distal angle
    let f = union(0.3, sphere([0.25, 0.3, -0.05], 0.72), rc([0.25, 0.0, -0.05], [0.28, -1.0, 0.0], 0.55, 0.62), box([0.28, -1.5, 0.0], [0.82, 0.72, 0.72], 0.34));
    C('capitate', f, [-0.9, -2.5, -1], [1.5, 1.2, 1]);
  }
  {
    // hamate: wedge with palmar hook
    let f = union(0.2, box([-1.2, -1.45, -0.05], [0.98, 0.9, 0.74], 0.38, [0, 0, -12]), rc([-1.15, -1.65, 0.45], [-1.0, -2.1, 1.5], 0.4, 0.3));
    f = union(0.15, f, ell([-0.95, -2.2, 1.7], [0.36, 0.34, 0.34]));
    C('hamate', f, [-2.5, -3.0, -1], [0.3, -0.3, 2.3]);
  }

  const fingers = [
    { n: 2, base: [1.45, -2.4, -0.05], head: [2.7, -8.9, -0.15], mc: [6.5, 0.85, 0.5, 0.72], ph: [[4.0, 0.7, 0.42, 0.5], [2.4, 0.55, 0.34, 0.42], [2.0, 0.5, 0.3, 0.5]], ab: 3, fl: [6, 11, 6] },
    { n: 3, base: [0.3, -2.4, 0.0], head: [0.75, -8.75, -0.15], mc: [6.4, 0.8, 0.5, 0.7], ph: [[4.5, 0.72, 0.43, 0.52], [2.8, 0.56, 0.35, 0.43], [2.2, 0.5, 0.3, 0.5]], ab: 0, fl: [7, 13, 7] },
    { n: 4, base: [-0.9, -2.45, 0.0], head: [-1.5, -7.85, -0.1], mc: [5.5, 0.65, 0.45, 0.62], ph: [[4.2, 0.68, 0.41, 0.5], [2.6, 0.53, 0.33, 0.41], [2.1, 0.46, 0.29, 0.46]], ab: -3, fl: [9, 15, 8] },
    { n: 5, base: [-1.95, -2.5, 0.1], head: [-3.25, -7.5, -0.05], mc: [5.2, 0.7, 0.45, 0.6], ph: [[3.3, 0.6, 0.37, 0.42], [1.8, 0.45, 0.3, 0.36], [1.8, 0.42, 0.27, 0.4]], ab: -7, fl: [11, 17, 9] },
  ];
  const palmar = [0, 0, 1];
  for (const F of fingers) {
    const d0 = norm([F.head[0] - F.base[0], F.head[1] - F.base[1], F.head[2] - F.base[2]]);
    const L = Math.hypot(F.head[0] - F.base[0], F.head[1] - F.base[1], F.head[2] - F.base[2]);
    const mcSpec = longBone(F.mc[0] * 0 + L + 0.45, F.mc[1], F.mc[2], F.mc[3]);
    out['mc' + F.n] = place(mk(mcSpec), F.base, d0);
    // abduct about y axis
    const aRad = F.ab * Math.PI / 180;
    let d = norm([d0[0] + Math.sin(aRad), d0[1], d0[2]]);
    let pos = add(F.head, d0, 0.5);
    const names = ['prox', 'mid', 'dist'];
    for (let i = 0; i < 3; i++) {
      d = flex(d, palmar, F.fl[i]);
      const [pl, wb, ws, wh] = F.ph[i];
      out[`f${F.n}-${names[i]}`] = place(mk(phalanx(pl, wb, ws, wh, i === 2 ? 'dist' : 'mid')), pos, d);
      pos = add(pos, d, pl + 0.12);
    }
  }
  // thumb
  {
    const base = [2.95, -2.6, 0.75];
    let d = norm([0.52, -0.72, 0.46]);
    const mc = longBone(4.5, 0.95, 0.56, 0.64);
    out['mc1'] = place(mk(mc), base, d, [0.6, 0.2, -0.8]);
    let pos = add(base, d, 4.55);
    d = norm([d[0] + 0.08, d[1] - 0.02, d[2] + 0.12]);
    out['f1-prox'] = place(mk(phalanx(3.0, 0.78, 0.5, 0.56, 'mid')), pos, d, [0.6, 0.2, -0.8]);
    pos = add(pos, d, 3.12);
    d = norm([d[0] + 0.05, d[1], d[2] + 0.22]);
    out['f1-dist'] = place(mk(phalanx(2.4, 0.62, 0.42, 0.62, 'dist')), pos, d, [0.6, 0.2, -0.8]);
  }
  return out;
}

// --------------------------- FOOT ---------------------------
export function foot() {
  const out = {};
  const C = (key, f, mn, mx, h = 0.06, bump = { amp: 0.03, freq: 1.4 }) => { out[key] = meshSDF(f, mn, mx, h, { bump }); };
  // calcaneus
  {
    const body = ell([0.95, -5.0, -1.4], [2.0, 2.5, 4.0]);
    const tub = ell([0.95, -5.4, -4.5], [1.95, 2.25, 1.25]);
    const sus = ell([-0.55, -3.4, -0.1], [1.05, 0.55, 1.4]);
    const ant = ell([1.5, -5.0, 2.4], [1.15, 1.05, 1.0]);
    const top = ell([0.95, -3.1, -1.0], [1.5, 0.7, 2.1]);
    const planM = ell([0.0, -7.2, -4.3], [0.9, 0.7, 0.8]);
    const planL = ell([1.9, -7.1, -4.2], [0.8, 0.7, 0.8]);
    let f = union(0.7, body, tub, sus, ant, top, planM, planL);
    f = sub(f, ell([1.0, -3.7, 0.4], [0.5, 0.5, 0.8]), 0.2);  // sulcus calcanei
    C('calcaneus', f, [-2.2, -8.8, -7.0], [4.2, -1.8, 4.2], 0.07);
  }
  // talus: trochlear dome with shallow groove, angled neck, rounded head, posterior process
  {
    const dome = cyl([0, -2.0, -0.4], 2.0, 1.72, 0.5, [0, 0, 90]);
    const body = ell([0, -2.6, -0.3], [1.7, 1.25, 1.85]);
    const neck = rc([0.15, -2.45, 1.0], [-0.85, -3.0, 2.55], 1.1, 0.92);
    const head = ell([-1.15, -3.05, 3.2], [1.2, 1.08, 1.3], [0, 18, 0]);
    const post = ell([0.0, -2.5, -2.4], [1.0, 0.85, 0.75]);
    const pmt = ell([-0.75, -2.6, -2.5], [0.48, 0.55, 0.5]);
    const lat = ell([1.9, -2.55, 0.0], [0.8, 1.0, 1.3], [0, 0, -15]);
    let f = union(0.5, dome, body, neck, head, post, pmt, lat);
    f = sub(f, tor([0, -2.0, -0.4], 2.2, 0.4, [0, 0, 90]), 0.3);              // trochlear groove (shallow)
    f = sub(f, rc([0.35, -2.2, -3.6], [0.35, -3.4, -1.9], 0.2, 0.2), 0.15);   // groove for flexor hallucis longus
    f = sub(f, ell([0.5, -4.5, 0.6], [0.7, 0.8, 1.2]), 0.25);                  // sulcus tali
    C('talus', f, [-3.0, -4.9, -4.0], [3.4, 0.4, 5.0], 0.06);
  }
  {
    // navicular: curved disc, concave posterior socket for the talar head, medial tuberosity
    let f = union(0.25, box([-1.6, -3.5, 4.2], [1.55, 1.55, 0.95], 0.55), ell([-3.25, -4.4, 3.95], [0.85, 0.8, 0.72]));
    f = inter(f, ell([-1.9, -3.6, 4.2], [2.6, 2.2, 1.35]), 0.2);
    f = sub(f, sphere([-1.35, -2.75, 2.35], 1.75), 0.2);
    C('navicular', f, [-4.3, -5.8, 2.4], [0.3, -1.2, 5.7], 0.05, { amp: 0.018, freq: 1.6 });
  }
  {
    // cuboid: cube with plantar peroneal groove and pyramidal process
    let f = union(0.2, box([2.7, -5.1, 4.6], [1.25, 1.3, 1.62], 0.5), ell([2.6, -6.2, 3.1], [0.9, 0.6, 0.8]));
    f = sub(f, ell([2.5, -6.55, 4.4], [2.2, 0.38, 0.55]), 0.15);
    f = inter(f, ell([2.7, -5.3, 4.4], [1.65, 1.85, 2.15]), 0.4);
    C('cuboid', f, [1.2, -7.3, 2.4], [4.3, -3.5, 6.6], 0.05, { amp: 0.018, freq: 1.6 });
  }
  // cuneiforms: wedges, as seen in a transverse section (x lateral, y up), extruded front to back,
  // then eased with an ellipsoid so the corners read as worn bone, not bricks
  const soft = (f, c, r) => inter(f, ell(c, r), 0.4);
  const SB = { amp: 0.016, freq: 1.6 };
  C('cuneiform-medial', soft(poly([[-3.2, -3.0], [-1.7, -3.0], [-1.45, -5.3], [-2.0, -6.8], [-3.8, -6.8], [-4.05, -5.0]], 1.45, 0.5, [0, 0, 5.85]), [-2.7, -4.9, 5.85], [1.75, 2.35, 1.65]), [-4.4, -7.4, 4.2], [-1.0, -2.5, 7.5], 0.05, SB);
  C('cuneiform-intermediate', soft(poly([[-1.75, -2.75], [0.1, -2.75], [-0.15, -4.7], [-1.45, -4.7]], 1.1, 0.4, [0, 0, 6.2]), [-0.8, -3.7, 6.2], [1.3, 1.5, 1.3]), [-2.2, -5.3, 4.9], [0.6, -2.2, 7.5], 0.045, SB);
  C('cuneiform-lateral', soft(poly([[0.05, -3.0], [1.95, -3.0], [1.75, -5.15], [0.2, -5.55]], 1.35, 0.45, [0, 0, 5.9]), [1.0, -4.2, 5.9], [1.5, 1.8, 1.55]), [-0.6, -6.3, 4.3], [2.4, -2.6, 7.5], 0.05, SB);

  const FL = [-1, 0, 0]; // x-hint so local +z points plantar
  const mts = [
    { n: 1, base: [-2.7, -5.55, 7.5], head: [-3.6, -7.3, 13.4], w: [1.2, 0.8, 0.82], L: 6.2 },
    { n: 2, base: [-1.0, -4.7, 7.15], head: [-1.85, -7.0, 14.1], w: [0.75, 0.46, 0.62], L: 7.4 },
    { n: 3, base: [0.65, -4.85, 7.55], head: [0.0, -7.0, 14.2], w: [0.72, 0.44, 0.6], L: 6.9 },
    { n: 4, base: [2.25, -5.3, 7.9], head: [2.0, -7.0, 14.1], w: [0.7, 0.42, 0.58], L: 6.6 },
    { n: 5, base: [3.6, -5.8, 8.0], head: [3.9, -7.1, 14.0], w: [0.8, 0.4, 0.56], L: 6.0 },
  ];
  for (const M of mts) {
    const d = norm([M.head[0] - M.base[0], M.head[1] - M.base[1], M.head[2] - M.base[2]]);
    const L = Math.hypot(M.head[0] - M.base[0], M.head[1] - M.base[1], M.head[2] - M.base[2]) + 0.5;
    const spec = longBone(L, M.w[0], M.w[1], M.w[2], { curve: 0.1, h: 0.05 });
    out['mt' + M.n] = place(mk(spec), M.base, d, FL);
    // phalanges
    const tl = { 1: [[3.0, 0.9, 0.62, 0.68], null, [2.4, 0.75, 0.5, 0.7]], 2: [[2.5, 0.5, 0.33, 0.4], [1.3, 0.4, 0.3, 0.36], [1.1, 0.36, 0.26, 0.4]], 3: [[2.4, 0.48, 0.32, 0.4], [1.25, 0.4, 0.29, 0.36], [1.0, 0.35, 0.25, 0.38]], 4: [[2.2, 0.46, 0.3, 0.38], [1.1, 0.38, 0.27, 0.34], [0.95, 0.33, 0.24, 0.36]], 5: [[1.9, 0.44, 0.28, 0.36], [0.95, 0.36, 0.25, 0.32], [0.85, 0.31, 0.22, 0.34]] }[M.n];
    let dd = norm([d[0] * 0.6 + (M.n === 1 ? -0.02 : 0), 0.12, d[2]]);
    let pos = add(M.head, d, 0.5);
    const names = ['prox', 'mid', 'dist'];
    for (let i = 0; i < 3; i++) {
      if (!tl[i]) continue;
      const [pl, wb, ws, wh] = tl[i];
      out[`t${M.n}-${names[i]}`] = place(mk(phalanx(pl, wb, ws, wh, i === 2 ? 'dist' : 'mid')), pos, dd, FL);
      pos = add(pos, dd, pl + 0.1);
      dd = norm([dd[0], dd[1] - 0.06, dd[2]]);
    }
  }
  return out;
}
