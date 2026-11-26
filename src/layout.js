// Places every bone in the world and produces the roster of 206 bones (+ decorative cartilage and teeth).
// World: cm, x = subject's left (+), y up, z anterior. Floor at y = 0. Stature ~ 175 cm.
import { meshSDF, transformMesh, mirrorMesh, mergeMeshes, cloneMesh, matFrom, matMul, matTrans, matRotAxis, applyPt, bounds, RES } from './sdf.js';
import * as LIMB from './shapes_limb.js';
import * as AX from './shapes_axial.js';
import * as PEL from './shapes_pelvis.js';
import * as HEAD from './shapes_head.js';
import * as HF from './shapes_hand.js';
import { teeth as makeTeeth } from './shapes_teeth.js';
import { loft, resample, ellipsoidMesh } from './meshutil.js';

const D = Math.PI / 180;
const build = (spec) => meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump || undefined });
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------- spine centreline ----------------
const SPINE_Y = {
  C1: 158.0, C2: 156.2, C3: 154.1, C4: 152.2, C5: 150.3, C6: 148.4, C7: 146.3,
  T1: 144.0, T2: 141.7, T3: 139.4, T4: 137.0, T5: 134.6, T6: 132.2, T7: 129.7, T8: 127.2, T9: 124.7, T10: 122.1, T11: 119.5, T12: 116.8,
  L1: 113.4, L2: 109.75, L3: 106.1, L4: 102.45, L5: 98.8, S1: 95.0,
};
const SPINE_Z = [[158.0, -1.0], [156.2, -1.4], [152.2, -1.0], [148.4, -1.6], [146.3, -2.6], [144.0, -4.2], [139.4, -6.8], [134.6, -8.4], [129.7, -9.1], [124.7, -8.7], [119.5, -7.2], [116.8, -6.2], [113.4, -5.0], [109.75, -4.0], [106.1, -3.5], [102.45, -3.4], [98.8, -4.2], [95.0, -6.0]];
function spineZ(y) {
  const t = SPINE_Z.slice().sort((a, b) => a[0] - b[0]);
  if (y <= t[0][0]) return t[0][1];
  for (let i = 1; i < t.length; i++) if (y <= t[i][0]) { const u = (y - t[i - 1][0]) / (t[i][0] - t[i - 1][0]); return lerp(t[i - 1][1], t[i][1], u); }
  return t[t.length - 1][1];
}
function vertPose(name) {
  const y = SPINE_Y[name];
  const z = spineZ(y);
  const dz = (spineZ(y + 1.0) - spineZ(y - 1.0)) / 2.0;
  const tilt = Math.atan2(dz, 1.0) / D;
  return { y, z, tilt };
}
const vertMat = (name) => { const p = vertPose(name); return matFrom([0, p.y, p.z], [p.tilt, 0, 0]); };

// ---------------- sternum ----------------
const STERN_M = matFrom([0, 140.8, 2.0], [-16, 0, 0]);
const NOTCH = { 1: [2.35, -1.6], 2: [1.75, -5.0], 3: [1.8, -7.3], 4: [1.85, -9.65], 5: [1.85, -12.0], 6: [1.85, -13.6], 7: [1.5, -14.9] };

// ---------------- ribs ----------------
const RIB_A = [5.2, 7.6, 9.6, 11.0, 12.3, 13.3, 14.0, 14.5, 14.5, 13.7, 11.8, 9.6];
const RIB_B = [4.2, 6.0, 7.3, 8.3, 9.0, 9.6, 10.0, 10.2, 10.0, 9.4, 8.0, 6.4];
const RIB_YH = [144.3, 142.85, 140.55, 138.2, 135.8, 133.4, 130.95, 128.45, 125.95, 122.1, 119.5, 116.8];
const RIB_YE = [138.2, 134.4, 130.8, 127.5, 124.2, 120.8, 118.2, 113.0, 110.0, 106.5, 111.5, 111.0];
const RIB_P1 = [2.45, 2.35, 2.3, 2.28, 2.25, 2.2, 2.15, 2.05, 1.98, 1.9, 1.25, 1.1];
function ribGeom(i) { // i = 1..12
  const k = i - 1;
  const tName = 'T' + i;
  const tp = vertPose(tName);
  const dims = AX.bodyDims('T', i);
  const a = RIB_A[k], b = RIB_B[k];
  const yH = RIB_YH[k], yE = RIB_YE[k];
  const zT = tp.z - 2.9;
  const xT = 3.9 + 0.12 * i + (i >= 11 ? -1.2 : 0);
  const phi0 = Math.asin(Math.min(0.95, xT / a));
  const zc = zT + b * Math.cos(phi0);
  const phi1 = RIB_P1[k];
  const H = [dims.bw / 2 + 0.25, yH + 0.15, tp.z - dims.bd * 0.12];
  const Tb = [xT, yH - 0.25, zT];
  const pts = [H, [lerp(H[0], Tb[0], 0.5), lerp(H[1], Tb[1], 0.5) + 0.05, lerp(H[2], Tb[2], 0.5)], Tb];
  const NS = 12;
  for (let s = 1; s <= NS; s++) {
    const u = s / NS, phi = phi0 + (phi1 - phi0) * u;
    pts.push([a * Math.sin(phi), yH - 0.25 - (yH - 0.25 - yE) * Math.pow(u, 1.15), zc - b * Math.cos(phi)]);
  }
  return { pts, H, Tb, end: pts[pts.length - 1], i };
}
function ribMesh(i) {
  const g = ribGeom(i);
  const path = resample(g.pts, 70).pts;
  const flat = i === 1;
  const wv = [0.0, 0.8, 0.62, 0.6, 0.6, 0.6, 0.6, 0.58, 0.55, 0.5, 0.42, 0.38][i - 1] || 0.6;
  const sec = (t) => {
    const neck = Math.min(1, t / 0.12);
    const body = 0.7 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    const end = 1 + 0.18 * Math.pow(Math.max(0, (t - 0.9) / 0.1), 2);
    const thick = 0.27 + 0.06 * (i === 1 ? 1 : 0);
    if (flat) return [0.3 * (0.5 + 0.5 * neck), (0.4 + 0.65 * neck * body) * end];
    return [wv * (0.45 + 0.55 * neck) * body * end * (t < 0.12 ? 0.8 : 1), thick * (0.7 + 0.3 * neck) * (t < 0.12 ? 1.1 : 1)];
  };
  const m = loft(path, sec, { K: 14, capN: 3, hint: [0, 1, 0] });
  const head = ellipsoidMesh(g.H, [0.62, 0.72, 0.62], null, 14);
  const tub = ellipsoidMesh([g.Tb[0] + 0.05, g.Tb[1] - 0.05, g.Tb[2] + 0.1], [0.4, 0.42, 0.42], null, 12);
  return mergeMeshes([m, head, tub]);
}
function cartilageMesh(i) {
  const g = ribGeom(i);
  const E = g.end;
  const pts = [];
  const sternPoint = (n) => { const [x, y] = NOTCH[n]; return applyPt(STERN_M, [x, y, 0.0]); };
  if (i <= 7) {
    const S = sternPoint(i);
    const mid = [(E[0] + S[0]) / 2, Math.max(E[1], S[1]) + (i <= 2 ? 0.3 : 0.9), (E[2] + S[2]) / 2 + 0.7];
    pts.push(E, [lerp(E[0], mid[0], 0.6), lerp(E[1], mid[1], 0.6), lerp(E[2], mid[2], 0.6)], mid, [lerp(mid[0], S[0], 0.6), lerp(mid[1], S[1], 0.6), lerp(mid[2], S[2], 0.6) + 0.1], [S[0] + 0.1, S[1], S[2]]);
  } else if (i <= 10) {
    // attach to the cartilage above
    const gu = ribGeom(i - 1); const Eu = gu.end;
    const Sx = i === 8 ? applyPt(STERN_M, [1.9, -14.4, 0]) : null;
    const up = cartilageMesh.cache[i - 1];
    const tgt = [lerp(Eu[0], (up && up.start[0]) || 0, 0.45), lerp(Eu[1], (up && up.start[1]) || Eu[1] + 3, 0.45) - 0.4, lerp(Eu[2], (up && up.start[2]) || Eu[2], 0.45)];
    pts.push(E, [lerp(E[0], tgt[0], 0.5) - 0.3, lerp(E[1], tgt[1], 0.5) + 0.7, lerp(E[2], tgt[2], 0.5) + 0.4], tgt);
  } else return null;
  cartilageMesh.cache[i] = { start: pts[0], mid: pts[Math.floor(pts.length / 2)], pts };
  const path = resample(pts, 36).pts;
  return loft(path, () => [0.46, 0.4], { K: 10, capN: 3, hint: [0, 1, 0] });
}
cartilageMesh.cache = {};

// ---------------- the roster ----------------
const R = []; // definitions
const def = (o) => { R.push(o); return o; };
const SIDE = { L: 'Left', R: 'Right' };

function pair(o) { // o: {key, make()->left mesh (world)}
  let cacheL = null;
  const getL = () => cacheL || (cacheL = o.make());
  def({ ...o, id: o.key + '-L', side: 'L', build: () => getL() });
  def({ ...o, id: o.key + '-R', side: 'R', build: () => mirrorMesh(getL()) });
}
function single(o) { def({ ...o, id: o.key, side: '', build: o.make }); }

// ---- skull (22) ----
const SK_T = matFrom([0, 163, -0.5], [0, 0, 0]);
let skullCache = null;
const skull = () => {
  if (!skullCache) {
    const raw = HEAD.skullBones(0.19 / RES.scale);
    const merged = {};
    const put = (k, m) => { (merged[k] || (merged[k] = [])).push(m); };
    for (const [k, m] of Object.entries(raw)) {
      const base = k.split('-')[0];
      if (base === 'sphenoid') put('sphenoid', m);
      else if (base === 'ethmoid') put('ethmoid', m);
      else put(k, m);
    }
    const inner = (spec) => build(spec);
    put('sphenoid', inner(HEAD.sphenoidInner()));
    put('ethmoid', inner(HEAD.ethmoidInner()));
    const pal = inner(HEAD.palatineInner());
    put('palatine-L', pal); put('palatine-R', mirrorMesh(pal));
    const conchaL = inner(HEAD.concha());
    skullCache = { parts: merged, vomer: inner(HEAD.vomer()), concha: conchaL };
  }
  return skullCache;
};
const skullPart = (key) => () => {
  const S = skull();
  const list = S.parts[key];
  if (!list || !list.length) throw new Error('missing skull part ' + key);
  return transformMesh(mergeMeshes(list.map(cloneMesh)), SK_T);
};
const cranial = [['frontal', 0], ['parietal', 1], ['occipital', 0], ['temporal', 1], ['sphenoid', 0], ['ethmoid', 0]];
for (const [k, p] of cranial) {
  if (p) { def({ key: k, id: k + '-L', side: 'L', region: 'Skull', sub: 'Cranial bones', build: skullPart(k + '-L') }); def({ key: k, id: k + '-R', side: 'R', region: 'Skull', sub: 'Cranial bones', build: skullPart(k + '-R') }); }
  else single({ key: k, region: 'Skull', sub: 'Cranial bones', make: skullPart(k) });
}
for (const k of ['maxilla', 'zygomatic', 'nasal', 'lacrimal', 'palatine']) {
  def({ key: k, id: k + '-L', side: 'L', region: 'Skull', sub: 'Facial bones', build: skullPart(k + '-L') });
  def({ key: k, id: k + '-R', side: 'R', region: 'Skull', sub: 'Facial bones', build: skullPart(k + '-R') });
}
def({ key: 'inferior-concha', id: 'inferior-concha-L', side: 'L', region: 'Skull', sub: 'Facial bones', build: () => transformMesh(cloneMesh(skull().concha), SK_T) });
def({ key: 'inferior-concha', id: 'inferior-concha-R', side: 'R', region: 'Skull', sub: 'Facial bones', build: () => transformMesh(mirrorMesh(skull().concha), SK_T) });
single({ key: 'vomer', region: 'Skull', sub: 'Facial bones', make: () => transformMesh(cloneMesh(skull().vomer), SK_T) });
single({ key: 'mandible', region: 'Skull', sub: 'Facial bones', make: () => transformMesh(build(HEAD.mandible()), SK_T) });

// ---- ear ossicles (6) ----
const OSS = {
  malleus: { spec: HEAD.malleus, pos: [4.95, 0.4, -0.1], rot: [0, 0, 0] },
  incus: { spec: HEAD.incus, pos: [4.55, 0.35, -0.55], rot: [0, 0, 0] },
  stapes: { spec: HEAD.stapes, pos: [4.1, 0.05, -0.55], rot: [0, 0, 0] },
};
for (const [k, o] of Object.entries(OSS)) pair({ key: k, region: 'Skull', sub: 'Auditory ossicles', make: () => transformMesh(build(o.spec()), matMul(SK_T, matFrom(o.pos, o.rot))) });
single({ key: 'hyoid', region: 'Skull', sub: 'Hyoid', make: () => transformMesh(build(HEAD.hyoid()), matFrom([0, 152.6, 4.2], [8, 0, 0])) });

// ---- vertebral column (26) ----
single({ key: 'C1', region: 'Vertebral column', sub: 'Cervical vertebrae', make: () => transformMesh(AXb(AX.atlas()), vertMat('C1')) });
single({ key: 'C2', region: 'Vertebral column', sub: 'Cervical vertebrae', make: () => transformMesh(AXb(AX.axis()), vertMat('C2')) });
for (let n = 3; n <= 7; n++) single({ key: 'C' + n, region: 'Vertebral column', sub: 'Cervical vertebrae', make: () => transformMesh(AXb(AX.cervical(n)), vertMat('C' + n)) });
for (let n = 1; n <= 12; n++) single({ key: 'T' + n, region: 'Vertebral column', sub: 'Thoracic vertebrae', make: () => transformMesh(AXb(AX.thoracic(n)), vertMat('T' + n)) });
for (let n = 1; n <= 5; n++) single({ key: 'L' + n, region: 'Vertebral column', sub: 'Lumbar vertebrae', make: () => transformMesh(AXb(AX.lumbar(n)), vertMat('L' + n)) });
function AXb(spec) { return build(spec); }
const SAC_M = matFrom([0, 95.0, -6.0], [24, 0, 0]);
single({ key: 'sacrum', region: 'Vertebral column', sub: 'Sacrum and coccyx', make: () => transformMesh(build(AX.sacrum()), SAC_M) });
const apexW = applyPt(SAC_M, [0, -10.2, 0.4]);
single({ key: 'coccyx', region: 'Vertebral column', sub: 'Sacrum and coccyx', make: () => transformMesh(build(AX.coccyx()), matFrom([apexW[0], apexW[1] - 0.1, apexW[2] + 0.1], [-8, 0, 0])) });

// ---- thorax (25) ----
single({ key: 'sternum', region: 'Thorax', sub: 'Sternum', make: () => transformMesh(build(AX.sternum()), STERN_M) });
for (let i = 1; i <= 12; i++) pair({ key: 'rib-' + i, region: 'Thorax', sub: 'Ribs', rib: i, make: () => ribMesh(i) });

// ---- shoulder girdle (4) ----
const GLEN = [17.0, 139.3, -5.2];
pair({ key: 'clavicle', region: 'Shoulder girdle', sub: 'Clavicle and scapula', make: () => transformMesh(build(LIMB.clavicle()), matFrom([3.2, 140.7, 2.6], [0, 21.9, 8.5])) });
pair({ key: 'scapula', region: 'Shoulder girdle', sub: 'Clavicle and scapula', make: () => transformMesh(build(LIMB.scapula()), matFrom(GLEN, [0, -35, 0])) });

// ---- arm ----
const HEADC = [GLEN[0] + 2.9 * Math.cos(35 * D), GLEN[1], GLEN[2] + 2.9 * Math.sin(35 * D)];
const HUM_M = matFrom(HEADC, [0, 0, 4]);
const ELBOW = applyPt(HUM_M, [0.45, -29.9, 0.5]);
const FORE_M = matFrom([ELBOW[0], ELBOW[1], ELBOW[2] + 0.2], [0, 0, 9]);
const RAD_M = matMul(FORE_M, matTrans([2.5, -0.5, 0.5]));
const HAND_M = matMul(RAD_M, matTrans([-1.85, -25.4, 0.0]));
pair({ key: 'humerus', region: 'Upper limb', sub: 'Arm', make: () => transformMesh(build(LIMB.humerus()), HUM_M) });
pair({ key: 'ulna', region: 'Upper limb', sub: 'Forearm', make: () => transformMesh(build(LIMB.ulna()), FORE_M) });
pair({ key: 'radius', region: 'Upper limb', sub: 'Forearm', make: () => transformMesh(build(LIMB.radius()), RAD_M) });
let handCache = null;
const handBones = () => handCache || (handCache = HF.hand());
const hmesh = (k) => () => transformMesh(cloneMesh(handBones()[k]), HAND_M);
for (const k of ['scaphoid', 'lunate', 'triquetrum', 'pisiform', 'trapezium', 'trapezoid', 'capitate', 'hamate']) pair({ key: k, region: 'Upper limb', sub: 'Carpals (wrist)', make: hmesh(k) });
for (let n = 1; n <= 5; n++) pair({ key: 'metacarpal-' + n, region: 'Upper limb', sub: 'Metacarpals (palm)', make: hmesh('mc' + n) });
const PH = [['prox', 'proximal'], ['mid', 'middle'], ['dist', 'distal']];
for (let n = 1; n <= 5; n++) for (const [c, nm] of PH) { if (n === 1 && c === 'mid') continue; pair({ key: `finger-${n}-${c}`, region: 'Upper limb', sub: 'Phalanges (fingers)', make: hmesh(`f${n}-${c}`) }); }

// ---- pelvis & leg ----
pair({ key: 'hip-bone', region: 'Pelvic girdle', sub: 'Hip bone', make: () => build(PEL.hipBone()) });
const FEM_M = matTrans(PEL.HIP.A);
const TIB_M = matTrans([7.4, 46.0, -0.3]);
const FIB_M = matTrans([7.4 + 3.6, 46.0 - 2.4, -0.3 - 2.1]);
const FOOT_M = matFrom([7.5, 8.6, 0.1], [0, 8, 0]);
pair({ key: 'femur', region: 'Lower limb', sub: 'Thigh', make: () => transformMesh(build(LIMB.femur()), FEM_M) });
pair({ key: 'patella', region: 'Lower limb', sub: 'Thigh', make: () => transformMesh(build(LIMB.patella()), matTrans([7.6, 50.6, 4.15])) });
pair({ key: 'tibia', region: 'Lower limb', sub: 'Leg', make: () => transformMesh(build(LIMB.tibia()), TIB_M) });
pair({ key: 'fibula', region: 'Lower limb', sub: 'Leg', make: () => transformMesh(build(LIMB.fibula()), FIB_M) });
let footCache = null;
const footBones = () => footCache || (footCache = HF.foot());
const fmesh = (k) => () => transformMesh(cloneMesh(footBones()[k]), FOOT_M);
for (const k of ['talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiform-medial', 'cuneiform-intermediate', 'cuneiform-lateral']) pair({ key: k, region: 'Lower limb', sub: 'Tarsals (ankle)', make: fmesh(k) });
for (let n = 1; n <= 5; n++) pair({ key: 'metatarsal-' + n, region: 'Lower limb', sub: 'Metatarsals (foot)', make: fmesh('mt' + n) });
for (let n = 1; n <= 5; n++) for (const [c] of PH) { if (n === 1 && c === 'mid') continue; pair({ key: `toe-${n}-${c}`, region: 'Lower limb', sub: 'Phalanges (toes)', make: fmesh(`t${n}-${c}`) }); }

export const ROSTER = R;

// ---------------- decorative (not bones) ----------------
export function decorative() {
  const out = [];
  for (let i = 1; i <= 10; i++) {
    const m = cartilageMesh(i);
    if (!m) continue;
    out.push({ id: 'cartilage-' + i + '-L', kind: 'cartilage', mesh: m });
    out.push({ id: 'cartilage-' + i + '-R', kind: 'cartilage', mesh: mirrorMesh(m) });
  }
  const T = makeTeeth();
  out.push({ id: 'teeth-upper', kind: 'teeth', mesh: transformMesh(T.upper, SK_T) });
  out.push({ id: 'teeth-lower', kind: 'teeth', mesh: transformMesh(T.lower, SK_T) });
  return out;
}
export const POSES = { vertMat, vertPose, SK_T, STERN_M, SAC_M, HAND_M, FOOT_M, ELBOW };

export function ribArcLength(i) { return resample(ribGeom(i).pts, 70).length; }
export function boneCenters() { return null; }
