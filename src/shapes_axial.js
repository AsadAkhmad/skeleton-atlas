// Vertebrae, sacrum, coccyx, sternum. Local frames: y up (vertebral axis), z anterior, origin = body centre.
import { sphere, ell, rc, box, tor, cyl, ecyl, tube, poly, union, sub, inter, mirrorX, smin, smax, meshSDF } from './sdf.js';

const D = Math.PI / 180;

function lerpTab(tab, x) { // tab: [[x,y],...] ascending x
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) { const t = (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]); return tab[i - 1][1] + (tab[i][1] - tab[i - 1][1]) * t; }
  return tab[tab.length - 1][1];
}

export function bodyDims(kind, n) {
  if (kind === 'C') { const k = n - 3; return { bw: 1.7 + 0.18 * k, bd: 1.45 + 0.07 * k, bh: 1.35 + 0.05 * k }; }
  if (kind === 'T') { const k = n - 1; return { bw: 2.5 + 0.17 * k, bd: 2.0 + 0.125 * k, bh: 1.95 + 0.075 * k }; }
  const k = n - 1; return { bw: 4.3 + 0.18 * k, bd: 3.1 + 0.1 * k, bh: 3.05 };
}

export function cervical(n) {
  const { bw, bd, bh } = bodyDims('C', n);
  const k = n - 3;
  const zf = -bd / 2 + 0.1, fd = 1.55 + 0.04 * k, fx = 1.2;
  const zb = zf - fd - 0.15;
  const parts = [];
  parts.push(ecyl([0, 0, 0], bw / 2, bd / 2, bh / 2, 0.28));
  parts.push(ell([bw * 0.47, bh / 2 + 0.02, -0.05], [0.3, 0.3, bd * 0.38]));           // uncinate
  parts.push(rc([bw * 0.28, 0.0, -bd * 0.3], [fx + 0.45, 0.0, zf - 0.5], 0.42, 0.42)); // pedicle
  parts.push(ell([fx + 0.75, 0, zf - 0.7], [0.75, bh * 0.72 + 0.1, 0.68]));            // articular pillar
  parts.push(ell([fx * 0.5 + 0.2, 0.05, zf - fd + 0.05], [0.95, bh * 0.43, 0.27], [0, 24, 0])); // lamina
  if (n === 7) {
    parts.push(rc([0, 0.15, zb + 0.1], [0, -0.1, zb - 3.0], 0.5, 0.36));
    parts.push(sphere([0, -0.1, zb - 3.1], 0.42));
  } else {
    parts.push(rc([0.3, 0.0, zb + 0.1], [0.5, -0.25, zb - 1.35 - (n === 6 ? 0.4 : 0)], 0.34, 0.24));
  }
  const tlen = n === 7 ? 0.5 : 0;
  parts.push(rc([bw * 0.5, 0, 0.1], [bw * 0.5 + 1.3, -0.15, 0.55], 0.34, 0.28));      // anterior tubercle
  parts.push(rc([fx + 0.9, 0, zf - 0.6], [fx + 1.95 + tlen, -0.1, zf - 0.95 - tlen * 0.5], 0.32, 0.27)); // posterior tubercle
  parts.push(ell([bw * 0.5 + 0.9, -0.15, -0.1], [1.0, 0.3, 0.8]));
  const half = union(0.28, ...parts);
  let f = mirrorX(half);
  f = sub(f, mirrorX(cyl([bw * 0.5 + 0.85, 0, -0.3], n === 7 ? 0.24 : 0.36, 2, 0)), 0.1); // foramen transversarium
  return { f, min: [-4.6, -2.0, zb - 3.7], max: [4.6, 2.0, 2.2], h: 0.07, bump: { amp: 0.03, freq: 1.2 } };
}

export function thoracic(n) {
  const { bw, bd, bh } = bodyDims('T', n);
  const zf = -bd / 2 + 0.1, fd = 1.45, fx = 0.85;
  const zb = zf - fd - 0.15;
  const parts = [];
  parts.push(ecyl([0, 0, 0], bw / 2, bd / 2, bh / 2, 0.3));
  parts.push(rc([bw * 0.3, bh * 0.1, -bd * 0.32], [fx + 0.5, bh * 0.05, zf - 0.55], 0.52, 0.46)); // pedicle
  parts.push(ell([fx * 0.55 + 0.25, 0.0, zf - fd + 0.05], [1.0, bh * 0.47, 0.3], [0, 20, 0]));    // lamina
  const ang = [20, 25, 35, 45, 55, 60, 60, 58, 50, 35, 20, 8][n - 1] * D;
  const len = [3.0, 3.2, 3.5, 3.7, 3.8, 3.9, 3.9, 3.8, 3.5, 3.2, 2.8, 2.4][n - 1];
  const sb = [0, 0.2, zb + 0.2];
  parts.push(rc(sb, [0, sb[1] - Math.sin(ang) * len, sb[2] - Math.cos(ang) * len], 0.42, 0.3)); // spinous
  parts.push(sphere([0, sb[1] - Math.sin(ang) * len, sb[2] - Math.cos(ang) * len], 0.32));
  const tl = [2.5, 2.6, 2.7, 2.7, 2.7, 2.6, 2.5, 2.4, 2.2, 1.9, 0.9, 0.7][n - 1];
  const tb = [fx + 0.55, 0.2, zf - fd * 0.55];
  const te = [fx + 0.55 + tl, 0.05, tb[2] - 0.95];
  parts.push(rc(tb, te, 0.55, 0.68));
  if (n <= 10) parts.push(sphere([te[0] + 0.1, te[1], te[2]], 0.82)); else parts.push(sphere(te, 0.55));
  parts.push(ell([fx + 0.7, bh / 2 + 0.45, zf - fd * 0.6], [0.45, 0.7, 0.36]));  // superior articular
  parts.push(ell([fx + 0.45, -bh / 2 - 0.15, zf - fd - 0.1], [0.4, 0.72, 0.3])); // inferior articular
  let f = mirrorX(union(0.3, ...parts));
  // costal facets (dimples)
  const dim = (y, r = 0.42) => mirrorX(sphere([bw / 2 + 0.1, y, -bd * 0.16], r));
  if (n >= 2 && n <= 9) { f = sub(f, dim(bh * 0.4), 0.15); f = sub(f, dim(-bh * 0.4), 0.15); }
  else if (n === 1) { f = sub(f, dim(bh * 0.35, 0.6), 0.2); f = sub(f, dim(-bh * 0.45, 0.3), 0.15); }
  else if (n === 10) { f = sub(f, dim(bh * 0.2, 0.6), 0.2); }
  else { f = sub(f, dim(0, 0.65), 0.2); }
  if (n <= 10) f = sub(f, mirrorX(sphere([te[0] + 0.55, te[1], te[2] + 0.42], 0.3)), 0.1);
  return { f, min: [-5.8, -bh / 2 - 1.5, zb - 4.6], max: [5.8, bh / 2 + 1.6, bd / 2 + 0.5], h: 0.09, bump: { amp: 0.035, freq: 1.0 } };
}

export function lumbar(n) {
  const { bw, bd, bh } = bodyDims('L', n);
  const zf = -bd / 2 + 0.1, fd = 1.75, fx = 1.15;
  const zb = zf - fd - 0.15;
  const parts = [];
  parts.push(ecyl([0, 0, 0], bw / 2, bd / 2, bh / 2, 0.45));
  parts.push(rc([bw * 0.3, 0.3, -bd * 0.3], [fx + 0.65, 0.3, zf - 0.6], 0.66, 0.6));
  parts.push(ell([fx * 0.55 + 0.3, 0.2, zf - fd + 0.05], [1.25, bh * 0.43, 0.4], [0, 22, 0]));
  const sl = n === 5 ? 1.7 : 2.4;
  parts.push(box([0, 0.0, zb - sl / 2 + 0.2], [0.55, bh * (n === 5 ? 0.32 : 0.4), sl / 2 + 0.3], 0.3));
  const tlen = [3.0, 3.3, 3.4, 3.2, 2.7][n - 1];
  const tr = n === 5 ? 0.95 : 0.55;
  parts.push(rc([fx + 0.55, n === 5 ? 0.6 : 0.1, zf - 0.35], [fx + 0.55 + tlen, n === 5 ? 0.9 : 0.2, zf - 0.15 - (n === 5 ? 0.6 : 0)], tr, tr * 0.7));
  parts.push(ell([fx + 0.6, bh / 2 + 0.5, zf - fd * 0.55], [0.38, 0.95, 0.72]));   // superior articular
  parts.push(sphere([fx + 0.95, bh / 2 + 1.35, zf - fd * 0.55 - 0.2], 0.24));   // mammillary
  parts.push(ell([fx + 0.2, -bh / 2 - 0.25, zf - fd - 0.2], [0.36, 0.95, 0.5]));  // inferior articular
  const f = mirrorX(union(0.35, ...parts));
  return { f, min: [-(fx + tlen + 1.4), -bh / 2 - 1.6, zb - 3.6], max: [fx + tlen + 1.4, bh / 2 + 2.1, bd / 2 + 0.5], h: 0.1, bump: { amp: 0.04, freq: 0.9 } };
}

export function atlas() {
  const parts = [];
  parts.push(ell([1.9, 0, 0.0], [1.0, 1.0, 1.45]));
  parts.push(tube([[1.9, 0, 0.9], [1.0, 0, 1.85], [0, 0, 2.05]], 0.55, 0));
  parts.push(tube([[1.9, 0, -0.9], [1.2, 0, -2.0], [0, 0, -2.3]], 0.5, 0));
  parts.push(rc([1.9, -0.1, -0.2], [3.35, -0.2, -0.35], 0.62, 0.45));
  parts.push(sphere([0, 0, 2.4], 0.45));
  parts.push(rc([0, 0, -2.3], [0, 0, -3.0], 0.4, 0.28));
  let f = mirrorX(union(0.35, ...parts));
  f = sub(f, mirrorX(sphere([2.0, 1.95, 0.1], 1.45)), 0.2);       // superior facet
  f = sub(f, mirrorX(sphere([1.95, -1.9, 0.05], 1.6)), 0.2);      // inferior facet
  f = sub(f, mirrorX(cyl([2.75, 0, -0.35], 0.4, 2, 0)), 0.1);     // transverse foramen
  f = sub(f, mirrorX(rc([2.0, 0.6, -1.2], [0.9, 0.6, -2.05], 0.42, 0.42)), 0.15); // artery groove
  f = sub(f, sphere([0, 0, 1.0], 0.9), 0.15);                      // dens facet / canal
  return { f, min: [-4.2, -2.2, -3.5], max: [4.2, 2.2, 3.1], h: 0.06, bump: { amp: 0.025, freq: 1.4 } };
}

export function axis() {
  const bw = 1.8, bd = 1.55, bh = 1.7;
  const zf = -bd / 2 + 0.1, fd = 1.55, fx = 1.2;
  const zb = zf - fd - 0.15;
  const parts = [];
  parts.push(ecyl([0, 0, 0], bw / 2, bd / 2, bh / 2, 0.3));
  parts.push(rc([0, 0.7, 0.2], [0, 2.75, 0.15], 0.72, 0.42));                      // dens
  parts.push(sphere([0, 2.75, 0.15], 0.42));
  parts.push(ell([1.55, 0.95, 0.15], [1.0, 0.34, 0.95]));                          // superior facet
  parts.push(rc([bw * 0.3, 0.0, -bd * 0.3], [fx + 0.55, 0.0, zf - 0.5], 0.6, 0.55)); // pedicle
  parts.push(ell([fx * 0.5 + 0.3, 0.0, zf - fd + 0.05], [1.0, bh * 0.5, 0.32], [0, 24, 0]));
  parts.push(rc([0.3, 0.0, zb + 0.1], [0.55, -0.35, zb - 2.2], 0.58, 0.36));       // bifid spinous
  parts.push(rc([1.2, -0.2, -0.3], [2.5, -0.5, -0.3], 0.42, 0.3));
  parts.push(ell([fx + 0.6, -bh / 2 - 0.2, zf - 0.9], [0.5, 0.6, 0.55]));          // inferior articular
  let f = mirrorX(union(0.3, ...parts));
  f = sub(f, mirrorX(cyl([2.0, 0, -0.3], 0.3, 2, 0)), 0.1);
  return { f, min: [-4.0, -2.4, zb - 3.2], max: [4.0, 3.6, 1.7], h: 0.065, bump: { amp: 0.025, freq: 1.3 } };
}

// ----- Sacrum (local frame: origin S1 body centre; y up; anterior +z; concave front) -----
function polyDist2D(pts, lx, ly) {
  const n = pts.length;
  let d = (lx - pts[0][0]) ** 2 + (ly - pts[0][1]) ** 2, s = 1;
  for (let i = 0, j = n - 1; i < n; j = i, i++) {
    const ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1];
    const wx = lx - pts[i][0], wy = ly - pts[i][1];
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    const bx = wx - ex * t, by = wy - ey * t;
    const dd = bx * bx + by * by; if (dd < d) d = dd;
    const c1 = ly >= pts[i][1], c2 = ly < pts[j][1], c3 = ex * wy > ey * wx;
    if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
  }
  return s * Math.sqrt(d);
}

export const SACRUM = {
  zf: [[-10.4, 0.6], [-8, -0.7], [-5, -1.15], [-2, -0.3], [0.5, 1.4], [1.5, 2.1]],       // anterior surface z(y)
  T: [[-10.4, 0.7], [-8, 1.3], [-5, 2.3], [-2, 3.4], [0.5, 4.1], [1.5, 4.4]],              // thickness
  w: [[-10.4, 0.7], [-9.4, 1.5], [-7.4, 2.6], [-5.2, 3.8], [-3, 4.8], [-0.8, 5.8], [1.4, 6.0]],
};
export function sacrum() {
  const S = SACRUM;
  const zf = (y) => lerpTab(S.zf, y), T = (y) => lerpTab(S.T, y), w = (y) => lerpTab(S.w, y);
  const outline = [];
  const ys = [1.5, 1.2, -0.8, -3, -5.2, -7.4, -9.4, -10.4];
  for (const y of ys) outline.push([w(y), y]);
  for (let i = ys.length - 1; i >= 0; i--) outline.push([-w(ys[i]), ys[i]]);
  const R = 0.55;
  const plate = (x, y, z) => {
    const d2 = polyDist2D(outline, x, y) + R;
    const zc = zf(y) - T(y) / 2;
    const d3 = Math.abs(z - zc) - T(y) / 2 + R;
    const a = Math.max(d2, 0), b = Math.max(d3, 0);
    return Math.min(Math.max(d2, d3), 0) + Math.sqrt(a * a + b * b) - R;
  };
  const zc = (y) => zf(y) - T(y) / 2;
  const zbk = (y) => zf(y) - T(y);
  // ala bulge (lateral parts of S1/S2 are thicker)
  const ala = ell([0, 0.2, zf(0.2) - 1.2], [5.7, 1.6, 1.3]);
  const prom = ell([0, 1.35, zf(1.4) - 0.1], [1.9, 0.55, 0.65]);
  const medCrest = tube([[0, 0.4, zbk(0.4) - 0.1], [0, -3, zbk(-3) - 0.15], [0, -6, zbk(-6) - 0.1], [0, -8.2, zbk(-8.2) - 0.05]], [0.4, 0.38, 0.32, 0.25], 0);
  const latCrest = mirrorX(tube([[1.9, -0.5, zbk(-0.5) - 0.1], [1.7, -3, zbk(-3) - 0.1], [1.4, -6, zbk(-6) - 0.05], [1.0, -8.3, zbk(-8.3)]], [0.3, 0.3, 0.26, 0.22], 0));
  const sap = mirrorX(ell([1.75, 1.45, zbk(1.4) + 0.9], [0.5, 0.95, 0.5]));
  const bodyBulge = ell([0, 0.1, zf(0) - 0.9], [2.4, 1.5, 1.2]);
  let f = (x, y, z) => smin(smin(smin(plate(x, y, z), ala(x, y, z), 0.8), smin(prom(x, y, z), bodyBulge(x, y, z), 0.5), 0.5), smin(smin(medCrest(x, y, z), latCrest(x, y, z), 0.3), sap(x, y, z), 0.3), 0.4);
  const canal = (x, y, z) => {
    // tapering canal along zc(y); opens at the back below y=-8.2 (sacral hiatus)
    const r = Math.max(0.28, 1.05 + (y - 0) * 0.07);
    const dx = x, dz = z - (zc(y) - 0.3);
    return Math.sqrt(dx * dx + dz * dz * 0.9) - r * (y < -8 ? 1.2 : 1);
  };
  f = sub(f, (x, y, z) => (y > -9.0 ? canal(x, y, z) : 1), 0.1);
  const hiatus = (x, y, z) => Math.max(Math.abs(x) - 0.7, -(y + 8.2), -(z - zc(y) + 0.4));
  f = sub(f, hiatus, 0.15);
  const rowsY = [0.1, -2.5, -4.6, -6.5];
  for (const y of rowsY) {
    const x = w(y) * 0.45;
    f = sub(f, mirrorX(rc([x, y, zf(y) + 0.5], [x * 0.7, y, zc(y)], 0.42, 0.34)), 0.12); // anterior
    f = sub(f, mirrorX(rc([x * 0.78, y + 0.1, zbk(y) - 0.5], [x * 0.6, y, zc(y)], 0.3, 0.26)), 0.1);  // posterior
  }
  // sacro-iliac rough surface hint: slight lateral thickening
  return { f, min: [-6.5, -11.8, -9.5], max: [6.5, 3.4, 4.6], h: 0.11, bump: { amp: 0.045, freq: 0.9 } };
}

export function coccyx() {
  const parts = [
    ell([0, 0, 0], [1.1, 0.55, 0.9]),
    rc([0.85, 0.3, -0.4], [0.85, 1.1, -0.5], 0.17, 0.12), rc([-0.85, 0.3, -0.4], [-0.85, 1.1, -0.5], 0.17, 0.12),
    ell([0, -1.0, 0.2], [0.85, 0.45, 0.7]),
    ell([0, -1.8, 0.65], [0.62, 0.4, 0.5]),
    ell([0, -2.45, 1.2], [0.42, 0.4, 0.38]),
  ];
  const f = union(0.28, ...parts);
  return { f, min: [-2, -3.4, -1.6], max: [2, 1.6, 2.2], h: 0.05, bump: { amp: 0.02, freq: 1.5 } };
}

// ----- Sternum (local: origin jugular notch; y up; anterior +z; vertical) -----
export function sternum() {
  // manubrium: broad, thick shield with jugular and clavicular notches
  const manub = ell([0, -2.2, 0], [2.75, 2.7, 0.66]);
  const manubTaper = poly([[-2.6, -1.2], [2.6, -1.2], [1.75, -4.9], [-1.75, -4.9]], 0.6, 0.45);
  const shoulderL = ell([1.95, -0.6, 0.0], [1.2, 0.95, 0.62]);
  const shoulderR = ell([-1.95, -0.6, 0.0], [1.2, 0.95, 0.62]);
  // body: four fused sternebrae. The outline swells at each costal notch pair, with a waist between them.
  const half = [[1.2, -4.8], [1.55, -5.6], [1.66, -6.7], [1.42, -7.4], [1.62, -7.9], [1.74, -9.0], [1.5, -9.7], [1.68, -10.2], [1.8, -11.3], [1.58, -12.0], [1.76, -12.5], [1.78, -13.6], [1.25, -14.5], [0.6, -14.9]];
  const outline = [...half, ...half.slice().reverse().map(([x, y]) => [-x, y])];
  const body = poly(outline, 0.46, 0.4);
  // transverse ridges where the sternebrae fused, and the sternal angle
  const ridge1 = rc([-1.45, -5.0, 0.5], [1.45, -5.0, 0.5], 0.3, 0.3);
  const ridges = [-7.65, -9.95, -12.25].map((y, i) => rc([-1.25 - i * 0.04, y, 0.42], [1.25 + i * 0.04, y, 0.42], 0.16, 0.16));
  // xiphoid: thin leaf that tapers to a point
  const xiph = ell([0, -15.55, 0.05], [0.8, 1.4, 0.28]);
  const xiphTip = rc([0, -16.4, 0.05], [0, -17.2, 0.08], 0.32, 0.09);
  let f = union(0.4, manub, manubTaper, shoulderL, shoulderR, ridge1, body, ...ridges, xiph, xiphTip);
  f = sub(f, sphere([0, 0.7, 0.2], 1.15), 0.3);                      // jugular notch
  f = sub(f, mirrorX(sphere([3.0, -0.6, 0.0], 0.95)), 0.25);        // clavicular notches
  f = sub(f, mirrorX(sphere([2.45, -3.85, 0.0], 0.5)), 0.2);        // 1st costal cartilage facet
  for (const y of [-5.35, -7.65, -9.95, -12.25]) f = sub(f, mirrorX(sphere([1.95, y - 0.1, 0.0], 0.42)), 0.2);  // costal notches
  return { f, min: [-4.2, -17.8, -1.5], max: [4.2, 1.4, 1.5], h: 0.085, bump: { amp: 0.026, freq: 1.2 } };
}

export function build(spec) { return meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump }); }
