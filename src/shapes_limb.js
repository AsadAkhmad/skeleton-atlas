// Long bones of the limbs, built for the LEFT side in a local anatomical frame:
// +x lateral, +y proximal (up), +z anterior. Origin = proximal articular centre.
import { sphere, ell, rc, box, tor, cyl, ecyl, tube, poly, union, sub, inter, meshSDF, curve, smin } from './sdf.js';

const B = (mn, mx) => [mn, mx];

export function humerus() {
  const L = [];
  // head, anatomical neck, tubercles
  const head = sphere([0, 0, 0], 2.4);
  const neck = ell([1.6, -2.3, -0.1], [2.1, 1.7, 1.9], [0, 0, 18]);
  const gt = ell([4.2, -1.5, 0.35], [1.35, 1.9, 2.0]);
  const lt = ell([2.1, -2.2, 2.3], [1.05, 1.5, 1.0]);
  const shaft = tube([[2.55, -4, 0.15], [2.3, -9, 0.1], [1.8, -18, 0.1], [1.35, -24, 0.1], [1.1, -27.0, 0.1]], [1.75, 1.48, 1.38, 1.5, 1.8], 0);
  const deltoid = ell([3.35, -12.8, 0.5], [0.5, 2.3, 0.85]);
  const ridgeL = rc([3.7, -28.0, 0.0], [1.7, -22.5, 0.0], 0.5, 0.35);
  const ridgeM = rc([-1.0, -28.0, -0.1], [0.9, -22.5, 0.0], 0.55, 0.38);
  const plate = ell([1.15, -28.4, 0.2], [2.8, 2.0, 0.95]);
  const epiM = ell([-1.6, -28.4, -0.3], [1.0, 1.3, 0.95]);
  const epiL = ell([4.1, -28.5, 0.0], [0.7, 1.0, 0.75]);
  const troch = cyl([0.45, -29.9, 0.5], 1.1, 1.05, 0.25, [0, 0, 90]);
  const capit = sphere([3.1, -29.9, 0.9], 1.0);
  const body = union(0.9, head, neck, gt, lt, shaft, deltoid, ridgeL, ridgeM, plate, epiM, epiL, troch, capit);
  const groove = rc([3.15, -2.0, 2.6], [2.75, -11.0, 1.85], 0.42, 0.38);
  const olecr = sphere([0.7, -28.3, -0.95], 0.95);
  const coron = sphere([0.85, -28.1, 1.3], 0.75);
  const trochGroove = tor([0.45, -29.9, 0.5], 0.95, 0.28, [0, 0, 90]);
  let f = sub(body, groove, 0.3);
  f = sub(f, olecr, 0.25);
  f = sub(f, coron, 0.25);
  return { f, min: [-4.5, -33, -4], max: [7.5, 4.5, 5], h: 0.14, bump: { amp: 0.05, freq: 0.9 } };
}

export function radius() {
  // origin: centre of radial head top surface, supinated
  const head = cyl([0, -0.5, 0], 1.18, 0.5, 0.25);
  const neck = rc([0, -1.0, 0], [0.05, -3.2, 0], 0.85, 0.75);
  const tuber = ell([-0.85, -3.8, 0.3], [0.55, 0.9, 0.6]);
  const shaft = tube([[0.05, -3.2, 0], [0.5, -8, 0.05], [0.9, -13, 0.0], [0.7, -18.5, 0.05], [0.4, -21.2, 0.1]], [0.78, 0.82, 0.9, 0.85, 0.95], 0);
  const crest = rc([-0.35, -7.5, 0.0], [-0.1, -19.5, 0.1], 0.35, 0.3);
  const dist = ell([0.1, -22.7, 0.05], [1.65, 1.2, 1.3]);
  const styloid = rc([1.25, -22.6, 0.0], [1.4, -24.2, 0.0], 0.55, 0.28);
  const tub = ell([0.2, -22.5, -1.15], [0.35, 0.8, 0.35]); // dorsal tubercle (Lister)
  let f = union(0.5, head, neck, tuber, shaft, crest, dist, styloid, tub);
  f = sub(f, sphere([0, 0.75, 0], 1.55), 0.15); // radial head dish
  f = sub(f, ell([0.2, -24.6, 0.1], [1.2, 0.62, 0.95]), 0.15); // carpal articular surface
  f = sub(f, ell([-1.55, -22.8, 0.0], [0.5, 0.8, 0.6]), 0.1); // ulnar notch
  return { f, min: [-3, -26.5, -3], max: [3.5, 1.8, 3], h: 0.12, bump: { amp: 0.045, freq: 1.0 } };
}

export function ulna() {
  // origin: centre of trochlear notch
  const olecranon = ell([0, 1.15, -1.5], [1.25, 1.95, 1.4], [18, 0, 0]);
  const upper = ell([0, -0.7, -0.5], [1.35, 1.9, 1.5]);
  const coronoid = ell([0, -1.7, 1.3], [1.05, 0.95, 1.1]);
  const tuberos = ell([0, -3.2, 1.0], [0.8, 0.8, 0.6]);
  const shaft = tube([[0, -2.5, 0.1], [0, -8, 0.0], [-0.1, -14, -0.1], [-0.25, -19, -0.15], [-0.35, -21.2, -0.2]], [1.2, 1.0, 0.78, 0.62, 0.7], 0);
  const crest = rc([0.35, -6, 0.2], [0.2, -18, 0.0], 0.38, 0.3);
  const head = sphere([-0.3, -22.1, -0.15], 0.9);
  const styloid = rc([-0.75, -22.4, -0.55], [-0.85, -23.5, -0.7], 0.4, 0.2);
  let f = union(0.55, olecranon, upper, coronoid, tuberos, shaft, crest, head, styloid);
  f = sub(f, cyl([0, 0.2, 0.55], 1.25, 1.5, 0, [0, 0, 90]), 0.25); // trochlear notch
  f = sub(f, sphere([1.25, -1.5, 0.45], 0.85), 0.2); // radial notch
  return { f, min: [-3, -25.5, -4], max: [3, 4.5, 4], h: 0.12, bump: { amp: 0.045, freq: 1.0 } };
}

export function clavicle() {
  // origin: sternal end; runs laterally (+x). S-shaped in top view.
  const pts = [[0, 0, 0.1], [2.2, 0.35, 0.95], [5.0, 0.7, 1.35], [8.0, 0.75, 1.0], [11.0, 0.55, -0.2], [13.6, 0.3, -1.2], [15.0, 0.2, -1.55]];
  const path = curve(pts, 10);
  const radii = path.map((p, i) => { const t = i / (path.length - 1); return 0.58 + 0.55 * Math.pow(1 - Math.min(1, t * 4), 2) + 0.28 * Math.pow(Math.max(0, t - 0.78) / 0.22, 2); });
  const shaft = tube(path, radii, 0);
  const sternal = ell([0.35, -0.05, 0.1], [0.95, 1.2, 1.15], [0, 0, 0]);
  const costal = ell([1.4, -0.75, 0.3], [0.8, 0.35, 0.6]);
  const acromial = ell([14.5, 0.15, -1.55], [1.15, 0.4, 1.05], [0, 18, 0]);
  const conoid = ell([12.0, -0.55, -0.95], [0.45, 0.4, 0.45]);
  const f = union(0.5, shaft, sternal, costal, acromial, conoid);
  return { f, min: [-2, -3, -4], max: [17.5, 3, 4], h: 0.1, bump: { amp: 0.04, freq: 1.1 } };
}

export function scapula() {
  // origin: glenoid centre. Blade lies in plane z~0, medial = -x. Dorsal = -z.
  const outline = [[-9.9, 5.0], [-6.6, 4.0], [-3.7, 3.1], [-2.4, 1.4], [-1.9, -1.2], [-2.5, -3.9], [-5.5, -7.6], [-8.3, -11.2], [-9.5, -9.2], [-9.5, -4.5], [-9.4, 0.0]];
  const blade = poly(outline, 0.22, 0.18, [0, 0, -0.35]);
  const latBorder = rc([-1.7, -2.6, -0.25], [-7.7, -10.6, -0.3], 0.55, 0.42);
  const medBorder = rc([-9.8, 4.7, -0.3], [-8.7, -10.7, -0.3], 0.3, 0.32);
  const supBorder = rc([-9.7, 4.9, -0.3], [-3.5, 3.0, -0.3], 0.28, 0.35);
  const neck = ell([-1.6, -0.2, -0.1], [1.7, 2.3, 1.2]);
  const glen = ell([0.2, 0.0, 0.0], [0.85, 1.95, 1.4]);
  const infra = ell([-0.9, -2.2, -0.3], [0.85, 0.7, 0.75]);
  // spine of scapula: plate rising from the dorsal surface, root at medial border -> acromion
  const spineA = [-9.3, 1.9], spineB = [-1.5, 4.0];
  const ang = Math.atan2(spineB[1] - spineA[1], spineB[0] - spineA[0]) * 180 / Math.PI;
  const mid = [(spineA[0] + spineB[0]) / 2, (spineA[1] + spineB[1]) / 2];
  const len = Math.hypot(spineB[0] - spineA[0], spineB[1] - spineA[1]);
  const spine = ell([mid[0] - 0.2, mid[1], -1.5], [len / 2 + 0.2, 0.3, 1.85], [0, 0, ang]);
  const spineCrest = tube([[spineA[0] + 0.3, spineA[1], -0.7], [spineA[0] + 3, spineA[1] + 0.9, -1.9], [spineB[0] - 2, spineB[1] + 0.1, -3.1], [spineB[0] + 0.4, spineB[1] + 0.25, -3.0]], [0.2, 0.42, 0.55, 0.55]);
  const spineBase = rc([spineA[0], spineA[1], -0.4], [spineB[0], spineB[1], -0.7], 0.45, 0.6);
  const acromion = ell([1.6, 4.35, -0.55], [1.9, 0.42, 2.3], [0, -28, 0]);
  const acrTip = sphere([3.3, 4.0, 0.6], 0.55);
  // coracoid
  const cor = tube([[-2.1, 1.9, 0.6], [-2.1, 3.0, 1.9], [-1.4, 3.2, 3.7], [0.2, 2.9, 4.7]], [1.0, 0.85, 0.7, 0.5], 0);
  let f = union(0.45, blade, latBorder, medBorder, supBorder, neck, glen, infra, spine, spineCrest, spineBase, acromion, acrTip, cor);
  f = sub(f, sphere([3.7, 0, 0], 3.35), 0.2); // glenoid fossa
  return { f, min: [-11.5, -12.5, -4], max: [5.5, 6.5, 6], h: 0.1, bump: { amp: 0.03, freq: 1.0 } };
}

export function femur() {
  // origin: femoral head centre. lateral +x, shaft goes down.
  const head = sphere([0, 0, 0.9], 2.45);
  const neckA = [0, 0, 0.9], neckB = [4.6, -3.2, -0.2];
  const neck = rc(neckA, neckB, 1.75, 2.2);
  const gt = ell([6.0, -2.0, -1.0], [1.65, 2.9, 2.4], [0, 0, -8]);
  const lt = ell([2.1, -8.4, -1.7], [0.95, 1.5, 0.9], [0, 0, 20]);
  const crest = rc([6.3, -1.6, -2.4], [2.3, -7.4, -2.2], 0.65, 0.5);
  const iline = rc([6.3, -3.4, 1.3], [2.8, -7.6, 1.2], 0.38, 0.4);
  // shaft along the anatomical axis, bowed anteriorly
  const Q = [4.55, -3.2], dir = [-0.139, -0.990], Ls = 41.6;
  const ts = [0, 0.1, 0.22, 0.4, 0.55, 0.7, 0.85, 0.95, 1.0];
  const rs = [2.15, 1.75, 1.5, 1.42, 1.45, 1.55, 1.9, 2.5, 2.9];
  const pts = ts.map((t) => [Q[0] + dir[0] * Ls * t, Q[1] + dir[1] * Ls * t, -0.45 + 1.15 * Math.sin(Math.PI * t)]);
  const shaft = tube(pts, rs, 0);
  const linea = tube(ts.slice(1, 7).map((t) => [Q[0] + dir[0] * Ls * t - 0.1, Q[1] + dir[1] * Ls * t, -1.25 + 1.15 * Math.sin(Math.PI * t)]), 0.5, 0);
  // distal end
  const cx = -1.25, cyD = -43.4;
  const flare = ell([cx, -40.6, 0.0], [3.9, 3.1, 2.4]);
  const medC = ell([cx - 2.15, cyD + 0.3, -0.7], [1.95, 2.4, 3.35]);
  const latC = ell([cx + 2.2, cyD + 0.3, -0.7], [1.95, 2.4, 3.35]);
  const epiM = ell([cx - 4.05, -41.6, -0.4], [0.85, 1.1, 1.1]);
  const epiL = ell([cx + 4.0, -41.6, -0.4], [0.75, 0.95, 0.95]);
  const patS = ell([cx, -41.4, 1.55], [2.7, 2.6, 1.4]);
  const body = union(0.9, head, neck, gt, lt, crest, iline, shaft, linea, flare, medC, latC, epiM, epiL, patS);
  let f = sub(body, box([cx, cyD + 0.6, -1.3], [0.7, 2.4, 2.3], 0.3), 0.3); // intercondylar notch
  f = sub(f, ell([5.4, -3.0, -2.2], [0.9, 1.4, 0.9]), 0.4); // trochanteric fossa
  return { f, min: [-5, -48, -6], max: [11, 5, 6], h: 0.15, bump: { amp: 0.06, freq: 0.7 } };
}

export function tibia() {
  // origin: centre of tibial plateau. Lateral +x.
  const medC = ell([-2.1, -1.15, 0.0], [2.2, 1.5, 2.75]);
  const latC = ell([2.2, -1.1, 0.1], [2.0, 1.4, 2.55]);
  const flare = ell([0.05, -3.8, 0.1], [3.0, 2.6, 2.4]);
  const spineM = rc([-0.5, 0.0, 0.0], [-0.5, 0.95, 0.0], 0.5, 0.18);
  const spineL = rc([0.6, 0.0, 0.0], [0.6, 0.85, 0.0], 0.48, 0.16);
  const tub = ell([0.2, -4.6, 2.7], [1.0, 1.7, 0.75]);
  const shaft = tube([[0, -4.5, 0], [0.1, -10, 0.05], [0.15, -20, 0.0], [0.3, -29, -0.05], [0.3, -33.5, 0.0]], [1.95, 1.62, 1.35, 1.42, 1.9], 0);
  const crest = rc([0.2, -6.5, 1.4], [0.3, -31.0, 1.0], 0.5, 0.42);
  const interos = rc([1.2, -8.0, -0.2], [1.35, -31.0, -0.15], 0.28, 0.26);
  const distal = ell([0.1, -36.0, 0.0], [2.55, 1.7, 2.2]);
  const malM = rc([-1.5, -35.7, 0.15], [-1.95, -38.1, 0.1], 1.0, 0.55);
  const body = union(0.7, medC, latC, flare, spineM, spineL, tub, shaft, crest, interos, distal, malM);
  let f = sub(body, ell([0.1, -37.65, 0.0], [1.85, 0.5, 1.75]), 0.15); // plafond
  f = sub(f, cyl([2.6, -35.8, -0.15], 0.8, 1.0, 0, [0, 0, 8]), 0.15); // fibular notch
  f = sub(f, ell([-2.0, 0.9, 0.0], [1.7, 0.55, 2.0]), 0.2); // medial plateau dish
  f = sub(f, ell([2.2, 0.85, 0.1], [1.6, 0.5, 1.9]), 0.2); // lateral plateau dish
  return { f, min: [-5, -41, -5], max: [6, 3, 5], h: 0.14, bump: { amp: 0.05, freq: 0.8 } };
}

export function fibula() {
  // origin: centre of fibular head
  const head = ell([0, 0, 0], [1.05, 1.0, 1.15]);
  const styl = rc([0.25, 0.6, -0.1], [0.4, 1.4, -0.25], 0.35, 0.15);
  const neck = rc([0, -0.7, 0], [-0.1, -3.2, 0], 0.62, 0.55);
  const shaft = tube([[-0.1, -3.2, 0], [-0.25, -12, -0.3], [-0.2, -22, -0.2], [0.0, -30, 0.1], [0.15, -33.5, 0.25]], [0.55, 0.62, 0.65, 0.7, 0.85], 0);
  const crest = rc([-0.55, -5, 0.35], [-0.4, -28, 0.45], 0.22, 0.2);
  const mal = ell([0.3, -35.2, 0.25], [0.95, 2.2, 1.25]);
  const ridge = rc([0.35, -33.5, -0.9], [0.25, -36.8, -1.3], 0.35, 0.3);
  const f = union(0.5, head, styl, neck, shaft, crest, mal, ridge);
  return { f, min: [-3, -39.5, -3], max: [3, 3, 3], h: 0.1, bump: { amp: 0.04, freq: 1.0 } };
}

export function patella() {
  const base = ell([0, 0.75, 0], [2.4, 1.6, 1.1]);
  const apex = rc([0, 0.4, 0], [0, -2.15, 0.05], 1.25, 0.4);
  const ant = ell([0, 0.0, 0.35], [2.1, 2.2, 0.8]);
  let f = union(0.6, base, apex, ant);
  f = sub(f, ell([0, 0, -2.0], [3.6, 3.6, 1.15]), 0.3);
  const ridge = rc([0, 1.6, -0.95], [0, -1.4, -0.95], 0.3, 0.25);
  f = union(0.3, f, ridge);
  return { f, min: [-3.5, -4, -2.5], max: [3.5, 3.5, 2.5], h: 0.07, bump: { amp: 0.03, freq: 1.3 } };
}

export function buildMesh(spec) {
  return meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump });
}
