// Reproductive anatomy, male or female. Hollow organs (uterus, vagina, penis, prostate) are built as an outer
// wall plus an inner lining surface, so the "Section view" button can cut them open and show the inside.
// Everything is placed in the pelvis next to the bladder, rectum and pubic symphysis of the skeleton (cm, +x = left).
import { sphere, ell, rc, union, sub, meshSDF } from './sdf.js';

const flip = (m) => { const I = m.indices; for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; } const N = m.normals; for (let i = 0; i < N.length; i++) N[i] = -N[i]; return m; };

export function buildReproductive(ctx, H) {
  const { V3, merge, paint, mirrorMesh, loft, resample, tubeM, rgb } = H;
  const sdf = (f, mn, mx, h, bump) => meshSDF(f, mn, mx, h, { bump: bump || undefined });
  const col = (m, hex, v = 0.05, fn) => paint(m, hex, v, fn);
  const mirrored = (m) => merge([m, mirrorMesh(m)]);
  const out = [];
  const add = (key, mesh, cut) => out.push({ key, mesh, cut });
  const A = V3.add;
  // loft with an elliptical cross-section that varies along the path: sec(t, s) -> [halfWidthX, halfDepth]
  const flat = (pts, sec, o = {}) => {
    const len = resample(pts, 40).length, n = Math.max(10, Math.min(260, Math.round(len / (o.step || 0.18))));
    const path = resample(pts, n).pts;
    return loft(path, (t) => sec(t, len * t), { K: o.K || 24, capN: o.capN === undefined ? 3 : o.capN, hint: o.hint || [1, 0, 0] });
  };

  if (ctx.sex === 'female') {
    // ------------------------------------------------ uterus, cervix, endometrial cavity
    const d = V3.nrm([0, 0.93, 0.37]);
    const outer = union(0.9,
      ell([0, 95.0, 1.5], [2.7, 2.9, 1.9], { y: d }),
      rc([0, 92.5, 0.5], [0, 89.9, -0.55], 1.4, 1.25),
      ell([2.25, 96.4, 1.9], [0.95, 0.8, 0.8]), ell([-2.25, 96.4, 1.9], [0.95, 0.8, 0.8]));
    const cavity = union(0.3,
      ell([0, 95.3, 1.65], [1.5, 1.6, 0.3], { y: d }), ell([1.6, 96.7, 2.0], [0.55, 0.38, 0.22]), ell([-1.6, 96.7, 2.0], [0.55, 0.38, 0.22]),
      rc([0, 93.1, 0.75], [0, 92.4, 0.45], 0.45, 0.25), rc([0, 92.5, 0.5], [0, 89.85, -0.55], 0.2, 0.22), sphere([0, 89.85, -0.55], 0.3));
    const wall = col(sdf(outer, [-4.5, 88.5, -3.5], [4.5, 99, 5.5], 0.07, { amp: 0.02, freq: 2 }), 0xc66b75, 0.05);
    const lining = col(flip(sdf(cavity, [-3, 89, -2], [3, 98, 4], 0.05)), 0xdc6672, 0.05);
    add('uterus', merge([wall, lining]), { p: [0, 95, 1.6], n: [0, 0, -1] });

    // ------------------------------------------------ uterine tubes with fimbriae
    const tubeL = () => {
      const iso = tubeM([[2.3, 96.4, 1.9], [3.6, 97.6, 1.6], [5.2, 98.0, 1.0]], 0.24, { K: 10 });
      const amp = tubeM([[5.2, 98.0, 1.0], [6.8, 97.4, 0.0], [7.6, 95.8, -1.2], [7.6, 94.3, -2.0]], (t) => 0.36 + 0.26 * t, { K: 12 });
      const parts = [col(iso, 0xd89593, 0.04), col(amp, 0xdd9c9a, 0.04)];
      const ax = V3.nrm([0.1, -0.72, -0.5]), c = [7.55, 93.7, -2.15];
      const funnel = sdf(union(0.2, ell(c, [0.75, 0.5, 0.75], { y: ax })), [6, 91.5, -4.5], [9.2, 95.5, 0.5], 0.05);
      parts.push(col(funnel, 0xe3a6a3, 0.04));
      const e1 = V3.nrm(V3.add([1, 0, 0], ax, -ax[0])); const e2 = [ax[1] * e1[2] - ax[2] * e1[1], ax[2] * e1[0] - ax[0] * e1[2], ax[0] * e1[1] - ax[1] * e1[0]];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = V3.add(V3.mix([0, 0, 0], e1, Math.cos(a)), e2, Math.sin(a));
        const p0 = V3.add(c, V3.add(r, ax, 0.5), 0.55), p1 = V3.add(c, V3.add(r, ax, 0.35), 1.25), p2 = V3.add(c, V3.add(r, ax, 0.15), 1.7);
        parts.push(col(tubeM([p0, p1, p2], [0.11, 0.05], { K: 5, capN: 1, step: 0.3 }), 0xe8b3b0, 0.04));
      }
      return merge(parts);
    };
    add('uterine-tubes', mirrored(tubeL()));

    // ------------------------------------------------ ovaries with follicles and a corpus luteum
    const fol = [[7.1, 93.9, -1.9, 0.5], [5.7, 93.0, -2.6, 0.3], [6.6, 92.6, -2.3, 0.26], [7.2, 93.2, -3.0, 0.28], [5.9, 94.2, -2.8, 0.22], [6.2, 93.8, -1.7, 0.3], [6.9, 92.9, -1.8, 0.2], [5.4, 93.5, -2.0, 0.24]];
    const base = ell([6.4, 93.4, -2.4], [1.9, 1.15, 0.95], { y: V3.nrm([0.25, 1, 0.3]) });
    const ovaryF = union(0.18, base, ...fol.map(([x, y, z, r]) => sphere([x, y, z], r)));
    const ov = sdf(ovaryF, [3.5, 90.5, -5], [9.5, 97, 1], 0.05, { amp: 0.04, freq: 4 });
    const cl = [5.6, 93.9, -2.5, 0.5];
    add('ovaries', mirrored(col(ov, 0xe9d2bb, 0.05, (p) => {
      const q = fol.map(([x, y, z, r]) => Math.hypot(p[0] - x, p[1] - y, p[2] - z) - r);
      const lu = Math.hypot(p[0] - cl[0], p[1] - cl[1], p[2] - cl[2]) - cl[3];
      if (lu < 0.05) return rgb(0xe3c25a);
      if (Math.min(...q) < 0.06) return rgb(0xd7e4ee);
      return null;
    })));

    // ------------------------------------------------ ligaments
    const lig = (pts, r) => col(tubeM(pts, r, { K: 6, step: 0.3 }), 0xe7d6c6, 0.04);
    add('uterine-ligaments', mirrored(merge([
      lig([[6.0, 93.7, -2.2], [4.0, 95.0, 0.0], [2.4, 95.6, 1.4]], 0.14),                                   // ovarian ligament
      lig([[7.6, 95.2, -2.6], [8.2, 97.6, -3.2], [8.8, 99.4, -3.9]], 0.17),                                // suspensory ligament of the ovary
      lig([[2.3, 95.4, 2.2], [4.2, 96.6, 4.6], [6.8, 96.0, 6.8], [5.4, 92.6, 9.2], [3.2, 88.6, 9.8], [2.2, 86.6, 9.4]], 0.21)])));   // round ligament to the labia majora

    // ------------------------------------------------ vagina: wall, lumen with rugae, fornices, hymenal remnant
    const vp = [[0, 90.9, -1.1], [0, 88.6, -0.1], [0, 86.2, 1.6], [0, 84.4, 3.9], [0, 83.2, 6.0]];
    const smooth = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    const vWall = flat(vp, (t) => [1.75 - 0.55 * t + 1.5 * smooth(1 - t / 0.2), 0.95 + 0.0 * t + 0.9 * smooth(1 - t / 0.2)], { capN: 4 });
    const vLumen = flat(vp, (t, s) => {
      const ridge = Math.pow(Math.max(0, Math.sin(s * Math.PI / 0.55)), 2);
      return [1.35 - 0.5 * t + 1.4 * smooth(1 - t / 0.2), Math.max(0.1, 0.5 - 0.3 * ridge + 0.85 * smooth(1 - t / 0.2))];
    }, { capN: 3 });
    const hym = [];
    const tE = V3.nrm([0, -0.5, 0.87]), uE = [0, 0.87, 0.5];
    for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2; hym.push(A(A([0, 83.45, 5.95], [1, 0, 0], 1.15 * Math.cos(a)), uE, 0.5 * Math.sin(a))); }
    add('vagina', merge([col(vWall, 0xc9838a, 0.05), col(flip(vLumen), 0xd8727e, 0.06), col(tubeM(hym, 0.13, { K: 6, capN: 0, step: 0.25 }), 0xdb8e92, 0.04)]),
      { p: [0, 87, 1.2], n: V3.nrm([0, -0.72, -0.69]) });

    // ------------------------------------------------ female urethra
    add('urethra-female', col(tubeM([[0, 86.7, 4.6], [0, 85.2, 5.9], [0, 83.9, 7.2], [0, 83.3, 7.9]], 0.36, { K: 10 }), 0xd9a090, 0.04), { p: [0, 87, 1.2], n: V3.nrm([0, -0.72, -0.69]) });

    // ------------------------------------------------ vulva (external genitalia)
    const dl = V3.nrm([0, 0.95, 0.3]);
    const majora = union(0.35, ell([1.7, 85.3, 8.5], [0.8, 3.1, 1.25], { y: dl }), ell([-1.7, 85.3, 8.5], [0.8, 3.1, 1.25], { y: dl }), ell([0, 88.5, 10.0], [2.9, 1.7, 1.25]));
    const minora = union(0.2, ell([0.85, 85.0, 8.1], [0.36, 2.0, 1.0], { y: V3.nrm([0, 0.95, 0.25]) }), ell([-0.85, 85.0, 8.1], [0.36, 2.0, 1.0], { y: V3.nrm([0, 0.95, 0.25]) }));
    const hood = union(0.25, ell([0, 87.5, 9.5], [0.6, 0.5, 0.45]));
    add('vulva', merge([col(sdf(majora, [-5, 80.5, 3], [5, 91.5, 13], 0.07, { amp: 0.02, freq: 3 }), 0xe0a898, 0.04),
      col(sdf(minora, [-3, 81.5, 5], [3, 88, 11], 0.05), 0xd47f86, 0.04), col(sdf(hood, [-2, 85.5, 7], [2, 89.5, 12], 0.05), 0xd79a92, 0.04)]));

    // ------------------------------------------------ clitoris, vestibular bulbs, Bartholin glands
    const crus = (s) => tubeM([[s * 0.35, 87.0, 8.9], [s * 0.4, 87.6, 7.6], [s * 1.2, 86.8, 6.0], [s * 2.2, 85.6, 4.4], [s * 3.4, 84.4, 1.4]], (t) => 0.5 - 0.22 * t, { K: 8 });
    const bulb = (s) => sdf(ell([s * 1.25, 84.2, 6.8], [0.7, 2.0, 0.8], { y: V3.nrm([0, 0.95, 0.25]) }), [s > 0 ? 0 : -3, 81, 4], [s > 0 ? 3 : 0, 88, 10], 0.06);
    const glans = sdf(sphere([0, 86.95, 9.1], 0.34), [-1, 86, 8], [1, 88, 10.2], 0.04);
    add('clitoris', merge([col(merge([crus(1), crus(-1)]), 0xd88f93, 0.04), col(merge([bulb(1), bulb(-1)]), 0xcf7f88, 0.04), col(glans, 0xdc7f88, 0.03),
      col(merge([sdf(sphere([1.3, 82.6, 6.5], 0.36), [0.5, 81.8, 5.5], [2.2, 83.6, 7.5], 0.05), sdf(sphere([-1.3, 82.6, 6.5], 0.36), [-2.2, 81.8, 5.5], [-0.5, 83.6, 7.5], 0.05)]), 0xe8c06a, 0.03)]));

    // ------------------------------------------------ breasts (mammary glands)
    const breast = () => {
      const c = [5.6, 130.4, 10.4];
      const fat = sdf(ell(c, [4.7, 4.9, 3.0]), [0.5, 124, 5], [11, 137, 15], 0.12, { amp: 0.04, freq: 1.5 });
      const gland = sdf(union(0.5, ell([5.6, 130.4, 10.9], [3.7, 3.9, 1.7]), ell([4.3, 131.5, 10.8], [2.2, 2.2, 1.5]), ell([7.0, 129.5, 10.8], [2.2, 2.0, 1.5])), [1, 125, 6], [10.5, 136, 14], 0.1, { amp: 0.08, freq: 3 });
      const nip = [5.6, 129.5, 13.3];
      const ducts = [];
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, r = 2.6 + 0.7 * Math.sin(i * 2.3); ducts.push(col(tubeM([A(nip, [0, 0, -0.2]), A(nip, [0.35 * Math.cos(a), 0.35 * Math.sin(a), -1.5]), A([5.6, 130.4, 10.4], [r * Math.cos(a), r * Math.sin(a) * 0.95, 0.5])], [0.08, 0.05], { K: 5, capN: 1, step: 0.3 }), 0xf3e8c8, 0.03)); }
      const areola = sdf(ell([5.6, 129.5, 12.95], [1.9, 1.9, 0.4]), [3, 127, 12], [8.2, 132, 14.2], 0.06);
      const nipple = sdf(union(0.15, ell(nip, [0.42, 0.42, 0.55])), [4.6, 128.5, 12.2], [6.6, 130.6, 14.4], 0.04);
      return merge([col(fat, 0xeadba0, 0.05), col(gland, 0xf2e5c4, 0.04), ...ducts, col(areola, 0xbd8a7e, 0.04), col(nipple, 0xb27468, 0.03)]);
    };
    add('breasts', mirrored(breast()));
  } else {
    // ------------------------------------------------ testis, epididymis, spermatic cord and vas deferens
    const side = () => {
      const tc = [2.0, 76.6, 6.4], ax = V3.nrm([0.05, 1, -0.25]);
      const testis = col(sdf(ell(tc, [1.35, 2.25, 1.55], { y: ax }), [0, 72, 2], [5, 82, 10], 0.06, { amp: 0.015, freq: 3 }), 0xe9dac4, 0.04);
      const head = col(sdf(ell([2.25, 78.7, 5.3], [0.95, 0.6, 0.72], { y: ax }), [0, 76, 2], [5, 82, 8], 0.05), 0xd4b189, 0.05);
      const body = col(tubeM([[2.7, 78.2, 5.0], [2.9, 76.6, 4.6], [2.7, 74.9, 5.0]], [0.42, 0.34], { K: 10 }), 0xd6b48b, 0.05);
      const tail = col(sdf(ell([2.3, 74.3, 5.6], [0.55, 0.55, 0.5]), [1, 72, 3], [4, 77, 8], 0.05), 0xd1ac82, 0.05);
      const cord = col(tubeM([[2.4, 79.0, 5.0], [2.6, 82.0, 6.8], [2.9, 84.4, 8.4], [3.6, 87.2, 8.9], [4.8, 90.4, 7.4]], 0.52, { K: 10 }), 0xeadfc8, 0.04);
      const vasA = tubeM([[2.1, 74.8, 5.2], [2.5, 77.6, 4.5], [2.5, 79.2, 4.9], [2.7, 82.0, 6.5], [3.0, 84.4, 8.2], [3.7, 87.2, 8.7], [4.8, 90.4, 7.2], [5.4, 91.6, 5.4], [5.2, 92.0, 2.2], [3.8, 90.6, -0.4]], 0.2, { K: 6 });
      const ampulla = tubeM([[3.8, 90.6, -0.4], [2.8, 89.2, -0.3], [1.6, 87.6, 0.4]], [0.3, 0.55, 0.32], { K: 8 });
      return merge([testis, head, body, tail, cord, col(vasA, 0xf2e8d2, 0.03), col(ampulla, 0xf2e8d2, 0.03)]);
    };
    add('testes-epididymis', mirrored(side()));
    // ------------------------------------------------ seminal vesicles (coiled), prostate with urethra and ejaculatory ducts, bulbourethral glands
    const vesicle = () => col(tubeM([[0.9, 89.4, 0.5], [2.0, 89.9, -0.5], [3.0, 90.4, -1.6], [3.7, 90.7, -2.4]], (t, s) => 0.62 * (1 + 0.28 * Math.sin(s * 5.0)) * (1 - 0.35 * t), { K: 12, step: 0.18 }), 0xdab599, 0.06);
    add('seminal-vesicles', mirrored(vesicle()));
    const pro = sdf(ell([0, 85.2, 3.2], [2.0, 1.45, 1.65]), [-3, 82, 0], [3, 89, 7], 0.05, { amp: 0.03, freq: 3 });
    const uret = col(tubeM([[0, 86.7, 4.4], [0, 85.2, 3.4], [0, 83.9, 5.0], [0, 83.4, 6.0]], 0.3, { K: 10 }), 0xcf8d78, 0.04);
    const ej = (s) => col(tubeM([[s * 1.5, 87.6, 0.4], [s * 0.7, 86.2, 1.8], [s * 0.2, 85.4, 3.0]], 0.1, { K: 5, capN: 1, step: 0.2 }), 0xf2e8d2, 0.03);
    add('prostate', merge([col(pro, 0xcda58c, 0.05), uret, ej(1), ej(-1)]), { p: [0, 85.2, 3.2], n: [0, 0, -1] });
    add('bulbourethral', merge([col(sdf(sphere([0.9, 83.0, 4.9], 0.38), [0, 82, 4], [2, 84, 6], 0.05), 0xd9b88c, 0.04), col(sdf(sphere([-0.9, 83.0, 4.9], 0.38), [-2, 82, 4], [0, 84, 6], 0.05), 0xd9b88c, 0.04)]));
    // ------------------------------------------------ penis: sheath and glans, erectile bodies, urethra
    const S = [[0, 86.8, 10.0], [0, 83.0, 11.4], [0, 79.0, 12.4], [0, 75.8, 13.0]];
    const sheath = tubeM([...S.slice(0, 3), [0, 77.0, 12.8]], (t) => 1.52 - 0.05 * t, { K: 20, capN: 1 });
    const gl = union(0.4, ell([0, 75.0, 13.1], [1.5, 1.25, 1.5]), ell([0, 75.7, 13.1], [1.72, 0.32, 1.7]), ell([0, 73.9, 13.2], [1.0, 0.7, 1.0]));
    const glansSdf = sdf(sub(gl, ell([0, 73.5, 13.5], [0.1, 0.55, 0.28]), 0.04), [-3, 71, 9], [3, 78, 17], 0.05);
    add('penis', merge([col(sheath, 0xe0aa98, 0.04), col(glansSdf, 0xcf7f82, 0.03)]), { p: [0, 81.5, 11.7], n: V3.nrm([0, -0.25, -0.97]) });
    const cc = (s) => tubeM([[s * 0.7, 86.6, 10.2], [s * 0.72, 83.0, 11.7], [s * 0.72, 79.0, 12.7], [s * 0.6, 76.6, 13.1]], 0.72, { K: 12 });
    const crura = (s) => tubeM([[s * 0.7, 86.6, 10.2], [s * 1.6, 85.6, 6.6], [s * 2.5, 84.6, 3.6]], (t) => 0.66 - 0.28 * t, { K: 10 });
    const spong = tubeM([[0, 83.8, 6.6], [0, 85.0, 9.4], [0, 83.0, 10.9], [0, 79.0, 11.9], [0, 75.8, 12.5]], 0.5, { K: 10 });
    const bulb = sdf(ell([0, 83.6, 6.3], [0.95, 1.4, 1.0]), [-2, 81, 4], [2, 86, 9], 0.05);
    const urethra = tubeM([[0, 83.8, 6.6], [0, 85.0, 9.3], [0, 83.0, 10.8], [0, 79.0, 11.8], [0, 75.8, 12.4], [0, 73.9, 13.2]], 0.13, { K: 6, step: 0.25 });
    add('penis-erectile', merge([col(merge([cc(1), cc(-1)]), 0xc9696d, 0.05), col(merge([crura(1), crura(-1)]), 0xc15f66, 0.05), col(spong, 0xd98582, 0.05), col(bulb, 0xd98582, 0.05), col(urethra, 0x7a3a3e, 0.03)]));
  }
  return out;
}
