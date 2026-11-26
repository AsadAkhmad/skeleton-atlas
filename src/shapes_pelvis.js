// Hip bone (os coxae), LEFT side, built directly in world coordinates (cm).
import { sphere, ell, rc, box, tor, cyl, tube, poly, union, sub, inter, smin, meshSDF } from './sdf.js';

export const HIP = { A: [8.6, 92.3, 0.0] }; // acetabulum / femoral-head centre

export function hipBone() {
  const A = HIP.A;
  // iliac blade: vertical plate, bent laterally toward the crest
  const C = [8.6, 0, -0.25];
  const uHat = [0.39, 0.92]; // (x,z) direction from PSIS to ASIS
  const nHat = [0.92, -0.39]; // lateral-posterior normal
  const outline = [[9.8, 100.5], [8.4, 103.0], [5.0, 104.6], [0.5, 105.3], [-4.4, 104.3], [-9.8, 100.3], [-10.4, 97.4], [-9.0, 94.0], [-6.2, 90.2], [-2.0, 88.8], [3.0, 88.8], [7.4, 91.8], [7.8, 95.0], [9.2, 98.0]];
  const plateBase = poly(outline, 0.24, 0.2, [0, 0, 0], { y: [0, 1, 0], x: [uHat[0], 0, uHat[1]] });
  const blade = (x, y, z) => {
    const u = (x - C[0]) * uHat[0] + (z - C[2]) * uHat[1];
    const b = 0.07 * Math.pow(Math.max(0, y - 96), 2) * Math.max(0, 1 - (u / 10.5) * (u / 10.5));
    const bx = x - b * nHat[0], bz = z - b * nHat[1];
    // poly centre is origin -> pass world offset so local x = dot((x-C), u)
    return plateBase(bx - C[0], y, bz - C[2]);
  };
  const crestPts = [[12.4, 100.4, 8.9], [14.0, 102.6, 6.0], [15.1, 104.4, 2.6], [14.2, 105.4, -2.0], [11.2, 104.4, -6.2], [6.2, 101.4, -9.6], [4.9, 100.3, -10.3]];
  const crest = tube(crestPts, 0.5, 0);
  const asis = sphere([12.5, 100.3, 9.0], 0.9);
  const psis = sphere([4.9, 100.2, -10.4], 0.8);
  const piis = ell([5.2, 96.6, -10.2], [0.8, 1.2, 0.8]);
  const aiis = ell([11.0, 95.2, 7.2], [0.85, 0.9, 1.0]);
  const tubercle = sphere([15.0, 104.3, 2.6], 0.75);
  const brim = tube([[4.2, 96.2, -9.4], [5.8, 93.6, -4.0], [6.6, 92.7, 0.0], [6.8, 91.6, 3.4]], 0.62, 0);
  const posterior = tube([[5.6, 101.0, -9.9], [4.9, 98.0, -10.3], [5.6, 95.8, -9.6], [6.0, 93.2, -8.0]], 0.7, 0);
  const auric = ell([4.6, 96.6, -7.6], [0.9, 3.0, 2.0]);
  const acet = ell(A, [3.9, 3.9, 3.9]);
  const ischBody = rc([8.0, 90.4, -1.2], [6.6, 85.4, -3.7], 1.85, 1.55);
  const tuber = ell([6.3, 84.4, -3.8], [1.55, 1.75, 2.15]);
  const spine = rc([6.4, 90.3, -4.4], [5.6, 89.6, -6.2], 0.5, 0.28);
  const ischRamus = tube([[5.9, 85.0, -2.6], [4.6, 83.8, 0.6], [3.4, 83.8, 3.4]], [1.0, 0.82, 0.7], 0);
  const supRamus = tube([[7.0, 91.0, 1.4], [5.4, 90.2, 5.0], [2.5, 88.9, 7.8]], [1.4, 1.0, 0.9], 0);
  const pubBody = ell([1.6, 88.3, 8.2], [1.15, 1.5, 0.95]);
  const pubTub = sphere([2.0, 89.8, 8.3], 0.62);
  const infRamus = tube([[1.4, 87.4, 8.0], [2.8, 85.0, 6.0], [3.5, 83.9, 3.2]], [0.9, 0.75, 0.7], 0);
  let f = union(0.9, blade, crest, asis, psis, piis, aiis, tubercle, brim, posterior, auric, acet, ischBody, tuber, spine, ischRamus, supRamus, pubBody, pubTub, infRamus);
  // acetabular socket + notch
  const a = [0.76, -0.56, 0.32]; const al = Math.hypot(...a); const ax = a.map((v) => v / al);
  f = sub(f, sphere(A, 2.7), 0.2);
  f = sub(f, rc(A, [A[0] + ax[0] * 7, A[1] + ax[1] * 7, A[2] + ax[2] * 7], 2.35, 2.35), 0.3);
  // acetabular rim ring
  const rimC = [A[0] + ax[0] * 1.55, A[1] + ax[1] * 1.55, A[2] + ax[2] * 1.55];
  f = union(0.4, f, tor(rimC, 2.45, 0.42, { y: ax }));
  // obturator foramen is the gap between rami (already open). Greater sciatic notch clean-up:
  f = sub(f, ell([4.0, 90.0, -8.6], [1.6, 1.2, 1.9]), 0.4);
  // acetabular notch (inferior gap)
  f = sub(f, ell([8.3, 88.6, 0.8], [1.2, 0.9, 1.2]), 0.2);
  return { f, min: [-1, 80.5, -13], max: [17.5, 107.5, 12], h: 0.13, bump: { amp: 0.05, freq: 0.8 } };
}

export function build(spec) { return meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump }); }
