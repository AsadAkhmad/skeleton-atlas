// Signed-distance-field toolkit + surface-nets mesher.
// Units are centimetres. x = subject's left (+), y = up, z = anterior.
const sqrt = Math.sqrt, abs = Math.abs, min = Math.min, max = Math.max;
const D2R = Math.PI / 180;

export function smin(a, b, k) {
  if (k <= 0) return a < b ? a : b;
  const h = max(k - abs(a - b), 0) / k;
  return min(a, b) - h * h * k * 0.25;
}
export function smax(a, b, k) {
  if (k <= 0) return a > b ? a : b;
  const h = max(k - abs(a - b), 0) / k;
  return max(a, b) + h * h * k * 0.25;
}

// ---------- orientation ----------
// An orientation is local axes expressed in world coords: Float64Array(9) rows ax, ay, az.
function norm3(v) { const l = sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

// o: null | [degX,degY,degZ] (Euler XYZ) | {y:[..], x:[..]?}  -> axes rows
export function axesOf(o) {
  if (!o) return null;
  let ax, ay, az;
  if (Array.isArray(o)) {
    const [a, b, c] = [o[0] * D2R, o[1] * D2R, o[2] * D2R];
    const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cc = Math.cos(c), sc = Math.sin(c);
    // R = Rx * Ry * Rz ; columns are local axes in world
    const r = [
      [cb * cc, -cb * sc, sb],
      [ca * sc + sa * sb * cc, ca * cc - sa * sb * sc, -sa * cb],
      [sa * sc - ca * sb * cc, sa * cc + ca * sb * sc, ca * cb],
    ];
    ax = [r[0][0], r[1][0], r[2][0]];
    ay = [r[0][1], r[1][1], r[2][1]];
    az = [r[0][2], r[1][2], r[2][2]];
  } else {
    ay = norm3(o.y || [0, 1, 0]);
    let h = o.x || (abs(ay[0]) < 0.9 ? [1, 0, 0] : [0, 0, 1]);
    const d = dot3(h, ay);
    ax = norm3([h[0] - ay[0] * d, h[1] - ay[1] * d, h[2] - ay[2] * d]);
    az = cross3(ax, ay);
  }
  return new Float64Array([ax[0], ax[1], ax[2], ay[0], ay[1], ay[2], az[0], az[1], az[2]]);
}

function withBound(f, c, R) { f.bc = c; f.bR = R; return f; }

// ---------- primitives ----------
export function sphere(c, r) {
  const [cx, cy, cz] = c;
  return withBound((x, y, z) => { const dx = x - cx, dy = y - cy, dz = z - cz; return sqrt(dx * dx + dy * dy + dz * dz) - r; }, c, r);
}

export function ell(c, r, o) {
  const [cx, cy, cz] = c, [rx, ry, rz] = r;
  const A = axesOf(o);
  const i2x = 1 / (rx * rx), i2y = 1 / (ry * ry), i2z = 1 / (rz * rz);
  const i4x = i2x * i2x, i4y = i2y * i2y, i4z = i2z * i2z;
  const rm = min(rx, ry, rz);
  return withBound((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    const lx2 = lx * lx, ly2 = ly * ly, lz2 = lz * lz;
    const k0 = sqrt(lx2 * i2x + ly2 * i2y + lz2 * i2z);
    const k1 = sqrt(lx2 * i4x + ly2 * i4y + lz2 * i4z);
    if (k1 < 1e-9) return -rm;
    return k0 * (k0 - 1) / k1;
  }, c, max(rx, ry, rz));
}

// round cone / capsule between a and b with radii ra, rb (exact)
export function rc(a, b, ra, rb) {
  if (rb === undefined) rb = ra;
  const [ax, ay, az] = a;
  const bx = b[0] - ax, by = b[1] - ay, bz = b[2] - az;
  let l2 = bx * bx + by * by + bz * bz;
  if (l2 < 1e-10) return sphere(a, max(ra, rb));
  const rr = ra - rb, a2 = l2 - rr * rr, il2 = 1 / l2;
  const srr = rr > 0 ? 1 : rr < 0 ? -1 : 0;
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  return withBound((x, y, z) => {
    const px = x - ax, py = y - ay, pz = z - az;
    const yy = px * bx + py * by + pz * bz;
    const zz = yy - l2;
    const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = srr * rr * rr * x2;
    if ((zz > 0 ? 1 : zz < 0 ? -1 : 0) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - rb;
    if ((yy > 0 ? 1 : yy < 0 ? -1 : 0) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - ra;
    return (sqrt(x2 * a2 * il2) + yy * rr) * il2 - ra;
  }, c, sqrt(l2) / 2 + max(ra, rb));
}

export function box(c, h, round = 0, o) {
  const [cx, cy, cz] = c, [hx, hy, hz] = [h[0] - round, h[1] - round, h[2] - round];
  const A = axesOf(o);
  return withBound((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    const qx = abs(lx) - hx, qy = abs(ly) - hy, qz = abs(lz) - hz;
    const mx = max(qx, 0), my = max(qy, 0), mz = max(qz, 0);
    return sqrt(mx * mx + my * my + mz * mz) + min(max(qx, max(qy, qz)), 0) - round;
  }, c, sqrt(h[0] * h[0] + h[1] * h[1] + h[2] * h[2]));
}

// torus around local y axis
export function tor(c, R, r, o) {
  const [cx, cy, cz] = c;
  const A = axesOf(o);
  return withBound((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    const q = sqrt(lx * lx + lz * lz) - R;
    return sqrt(q * q + ly * ly) - r;
  }, c, R + r);
}

// capped cylinder around local y axis
export function cyl(c, r, hh, round = 0, o) {
  const [cx, cy, cz] = c;
  const A = axesOf(o);
  return withBound((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    const d1 = sqrt(lx * lx + lz * lz) - r + round, d2 = abs(ly) - hh + round;
    const m1 = max(d1, 0), m2 = max(d2, 0);
    return min(max(d1, d2), 0) + sqrt(m1 * m1 + m2 * m2) - round;
  }, c, sqrt(r * r + hh * hh));
}

// elliptic cylinder around local y axis (approximate metric)
export function ecyl(c, rx, rz, hh, round = 0, o) {
  const [cx, cy, cz] = c;
  const A = axesOf(o);
  const s = min(rx, rz), sx = s / rx, sz = s / rz;
  return withBound((x, y, z) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    lx *= sx; lz *= sz;
    const d1 = sqrt(lx * lx + lz * lz) - s + round, d2 = abs(ly) - hh + round;
    const m1 = max(d1, 0), m2 = max(d2, 0);
    return min(max(d1, d2), 0) + sqrt(m1 * m1 + m2 * m2) - round;
  }, c, sqrt(max(rx, rz) ** 2 + hh * hh));
}

// extruded 2D polygon in local xy plane, thickness half hz along local z, edges rounded
export function poly(pts, hz, round = 0, c = [0, 0, 0], o) {
  const n = pts.length;
  const A = axesOf(o);
  let mnx = 1e9, mny = 1e9, mxx = -1e9, mxy = -1e9;
  for (const p of pts) { mnx = min(mnx, p[0]); mxx = max(mxx, p[0]); mny = min(mny, p[1]); mxy = max(mxy, p[1]); }
  const bc = [c[0] + (mnx + mxx) / 2, c[1] + (mny + mxy) / 2, c[2]];
  const R = sqrt((mxx - mnx) ** 2 + (mxy - mny) ** 2) / 2 + hz + round;
  const hzr = hz - round;
  const fp = ((x, y, z) => {
    const dx = x - c[0], dy = y - c[1], dz = z - c[2];
    let lx = dx, ly = dy, lz = dz;
    if (A) { lx = A[0] * dx + A[1] * dy + A[2] * dz; ly = A[3] * dx + A[4] * dy + A[5] * dz; lz = A[6] * dx + A[7] * dy + A[8] * dz; }
    // iq sdPolygon
    let d = (lx - pts[0][0]) ** 2 + (ly - pts[0][1]) ** 2;
    let s = 1;
    for (let i = 0, j = n - 1; i < n; j = i, i++) {
      const ex = pts[j][0] - pts[i][0], ey = pts[j][1] - pts[i][1];
      const wx = lx - pts[i][0], wy = ly - pts[i][1];
      const t = max(0, min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const bx = wx - ex * t, by = wy - ey * t;
      const dd = bx * bx + by * by;
      if (dd < d) d = dd;
      const c1 = ly >= pts[i][1], c2 = ly < pts[j][1], c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    const d2 = s * sqrt(d) + round;
    const d3 = abs(lz) - hzr;
    const m1 = max(d2, 0), m2 = max(d3, 0);
    return min(max(d2, d3), 0) + sqrt(m1 * m1 + m2 * m2) - round;
  });
  return A ? fp : withBound(fp, bc, R);
}

// polyline of round cones through points with radii
export function tube(pts, radii, k = 0) {
  const fs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const ra = Array.isArray(radii) ? radii[i] : radii;
    const rb = Array.isArray(radii) ? radii[i + 1] : radii;
    fs.push(rc(pts[i], pts[i + 1], ra, rb));
  }
  return union(k, ...fs);
}

// Catmull-Rom sample helper for smooth paths
export function curve(pts, n = 24) {
  const out = [];
  const P = (i) => pts[max(0, min(pts.length - 1, i))];
  for (let s = 0; s < pts.length - 1; s++) {
    for (let t = 0; t < n; t++) {
      const u = t / n, u2 = u * u, u3 = u2 * u;
      const p0 = P(s - 1), p1 = P(s), p2 = P(s + 1), p3 = P(s + 2);
      const q = [0, 0, 0];
      for (let a = 0; a < 3; a++) {
        q[a] = 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * u + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * u2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * u3);
      }
      out.push(q);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

// ---------- combinators ----------
export function union(k, ...fs) {
  if (fs.length === 1) return fs[0];
  const n = fs.length;
  const f = (x, y, z) => {
    let d = 1e9;
    for (let i = 0; i < n; i++) {
      const g = fs[i];
      if (g.bR !== undefined && d < 1e8) {
        const bx = x - g.bc[0], by = y - g.bc[1], bz = z - g.bc[2];
        const lb = sqrt(bx * bx + by * by + bz * bz) - g.bR;
        if (lb >= d + k) continue;
      }
      const v = g(x, y, z);
      d = d >= 1e8 ? v : smin(d, v, k);
    }
    return d;
  };
  // overall bound
  let ok = fs.every((g) => g.bR !== undefined);
  if (ok) {
    let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const g of fs) for (let a = 0; a < 3; a++) { mn[a] = min(mn[a], g.bc[a] - g.bR); mx[a] = max(mx[a], g.bc[a] + g.bR); }
    const c = [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2];
    const R = sqrt((mx[0] - mn[0]) ** 2 + (mx[1] - mn[1]) ** 2 + (mx[2] - mn[2]) ** 2) / 2 + k;
    withBound(f, c, R);
  }
  return f;
}
export function sub(a, b, k = 0) { return (x, y, z) => smax(a(x, y, z), -b(x, y, z), k); }
export function inter(a, b, k = 0) { return (x, y, z) => smax(a(x, y, z), b(x, y, z), k); }
export function grow(f, d) { return (x, y, z) => f(x, y, z) - d; }
// mirror about plane x = cx (keeps x >= cx half, reflects)
export function mirrorX(f, cx = 0) { return (x, y, z) => f(abs(x - cx) + cx, y, z); }
// domain warp by function (x,y,z)->[x',y',z']
export function warp(f, fn) { return (x, y, z) => { const p = fn(x, y, z); return f(p[0], p[1], p[2]); }; }
// scale distance for a stretched field
export function stretch(f, sx, sy, sz, c = [0, 0, 0]) {
  const m = min(sx, sy, sz);
  return (x, y, z) => f(c[0] + (x - c[0]) / sx, c[1] + (y - c[1]) / sy, c[2] + (z - c[2]) / sz) * m;
}

// ---------- noise ----------
function hash3(i, j, k, s) {
  let h = (i * 374761393 + j * 668265263 + k * 2147483647 + s * 1274126177) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
export function vnoise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const c000 = hash3(xi, yi, zi, s), c100 = hash3(xi + 1, yi, zi, s), c010 = hash3(xi, yi + 1, zi, s), c110 = hash3(xi + 1, yi + 1, zi, s);
  const c001 = hash3(xi, yi, zi + 1, s), c101 = hash3(xi + 1, yi, zi + 1, s), c011 = hash3(xi, yi + 1, zi + 1, s), c111 = hash3(xi + 1, yi + 1, zi + 1, s);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u, x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return (y0 + (y1 - y0) * w) * 2 - 1;
}
export function fbm(x, y, z, s = 0) { return vnoise(x, y, z, s) * 0.62 + vnoise(x * 2.1, y * 2.1, z * 2.1, s + 7) * 0.38; }

// ---------- surface nets ----------
// f: sdf, bmin/bmax: [x,y,z], h: voxel size. opts: {cs, bump:{amp,freq,seed}, color:(x,y,z,nx,ny,nz)=>[r,g,b] or scalar}
export const RES = { scale: 1 };
export function meshSDF(f, bmin, bmax, h, opts = {}) {
  h = h * RES.scale;
  const cs = opts.cs || 4;
  const nxc = Math.ceil((bmax[0] - bmin[0]) / (h * cs)), nyc = Math.ceil((bmax[1] - bmin[1]) / (h * cs)), nzc = Math.ceil((bmax[2] - bmin[2]) / (h * cs));
  const nx = nxc * cs + 1, ny = nyc * cs + 1, nz = nzc * cs + 1;
  const cnx = nxc + 1, cny = nyc + 1, cnz = nzc + 1;
  const ox = bmin[0], oy = bmin[1], oz = bmin[2];
  const cvals = new Float32Array(cnx * cny * cnz);
  const ch = h * cs;
  for (let k = 0; k < cnz; k++) for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) {
    cvals[i + cnx * (j + cny * k)] = f(ox + i * ch, oy + j * ch, oz + k * ch);
  }
  const vals = new Float32Array(nx * ny * nz).fill(NaN);
  const thr = ch * 1.95;
  for (let ck = 0; ck < nzc; ck++) for (let cj = 0; cj < nyc; cj++) for (let ci = 0; ci < nxc; ci++) {
    let m = 1e9;
    for (let dk = 0; dk < 2; dk++) for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const v = abs(cvals[(ci + di) + cnx * ((cj + dj) + cny * (ck + dk))]);
      if (v < m) m = v;
    }
    if (m >= thr) continue;
    for (let k = ck * cs; k <= ck * cs + cs; k++) for (let j = cj * cs; j <= cj * cs + cs; j++) for (let i = ci * cs; i <= ci * cs + cs; i++) {
      const idx = i + nx * (j + ny * k);
      if (vals[idx] !== vals[idx]) vals[idx] = f(ox + i * h, oy + j * h, oz + k * h);
    }
  }
  // fill inactive with coarse sign
  for (let k = 0; k < nz; k++) {
    const ck = min(cnz - 1, ((k + (cs >> 1)) / cs) | 0);
    for (let j = 0; j < ny; j++) {
      const cj = min(cny - 1, ((j + (cs >> 1)) / cs) | 0);
      for (let i = 0; i < nx; i++) {
        const idx = i + nx * (j + ny * k);
        if (vals[idx] !== vals[idx]) {
          const ci = min(cnx - 1, ((i + (cs >> 1)) / cs) | 0);
          vals[idx] = cvals[ci + cnx * (cj + cny * ck)] > 0 ? 1e3 : -1e3;
        }
      }
    }
  }
  // cells -> vertices
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellVert = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const cornerOff = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float64Array(8);
  let nv = 0;
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const o = cornerOff[c];
      const v = vals[(i + o[0]) + nx * ((j + o[1]) + ny * (k + o[2]))];
      cv[c] = v;
      if (v < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, cnt = 0;
    for (let e = 0; e < 12; e++) {
      const a = edges[e][0], b = edges[e][1];
      const va = cv[a], vb = cv[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      const oa = cornerOff[a], ob = cornerOff[b];
      sx += oa[0] + (ob[0] - oa[0]) * t; sy += oa[1] + (ob[1] - oa[1]) * t; sz += oa[2] + (ob[2] - oa[2]) * t; cnt++;
    }
    cellVert[i + cx * (j + cy * k)] = nv++;
    pos.push(ox + (i + sx / cnt) * h, oy + (j + sy / cnt) * h, oz + (k + sz / cnt) * h);
  }
  // quads
  const idxs = [];
  const cvIdx = (i, j, k) => cellVert[i + cx * (j + cy * k)];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (!flip) idxs.push(a, b, c, a, c, d); else idxs.push(a, c, b, a, d, c);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = vals[i + nx * (j + ny * k)];
    const in0 = v0 < 0;
    if (i < nx - 1 && j > 0 && k > 0 && j < ny - 1 && k < nz - 1) {
      const in1 = vals[(i + 1) + nx * (j + ny * k)] < 0;
      if (in0 !== in1) quad(cvIdx(i, j - 1, k - 1), cvIdx(i, j, k - 1), cvIdx(i, j, k), cvIdx(i, j - 1, k), !in0);
    }
    if (j < ny - 1 && i > 0 && k > 0 && i < nx - 1 && k < nz - 1) {
      const in1 = vals[i + nx * ((j + 1) + ny * k)] < 0;
      if (in0 !== in1) quad(cvIdx(i - 1, j, k - 1), cvIdx(i - 1, j, k), cvIdx(i, j, k), cvIdx(i, j, k - 1), !in0);
    }
    if (k < nz - 1 && i > 0 && j > 0 && i < nx - 1 && j < ny - 1) {
      const in1 = vals[i + nx * (j + ny * (k + 1))] < 0;
      if (in0 !== in1) quad(cvIdx(i - 1, j - 1, k), cvIdx(i, j - 1, k), cvIdx(i, j, k), cvIdx(i - 1, j, k), !in0);
    }
  }
  // project onto surface + gradient normals
  const P = new Float32Array(pos);
  const N = new Float32Array(pos.length);
  const e = h * 0.5;
  const proj = opts.project !== false;
  for (let v = 0; v < nv; v++) {
    let x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
    for (let it = 0; it < (proj ? 1 : 0); it++) {
      const d = f(x, y, z);
      const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
      const gl = sqrt(gx * gx + gy * gy + gz * gz) || 1;
      const step = max(-h * 0.8, min(h * 0.8, d));
      x -= gx / gl * step; y -= gy / gl * step; z -= gz / gl * step;
    }
    const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const gl = sqrt(gx * gx + gy * gy + gz * gz) || 1;
    N[3 * v] = gx / gl; N[3 * v + 1] = gy / gl; N[3 * v + 2] = gz / gl;
    P[3 * v] = x; P[3 * v + 1] = y; P[3 * v + 2] = z;
  }
  const out = { positions: P, normals: N, indices: new Uint32Array(idxs) };
  if (opts.bump) {
    const { amp, freq, seed = 0 } = opts.bump;
    for (let v = 0; v < nv; v++) {
      const x = P[3 * v], y = P[3 * v + 1], z = P[3 * v + 2];
      const n = fbm(x * freq, y * freq, z * freq, seed) * amp;
      P[3 * v] += N[3 * v] * n; P[3 * v + 1] += N[3 * v + 1] * n; P[3 * v + 2] += N[3 * v + 2] * n;
    }
  }
  return out;
}

// ---------- geometry transforms (plain arrays) ----------
// m: 16-element column-major (three.js Matrix4.elements)
export function transformMesh(mesh, m) {
  const P = mesh.positions, N = mesh.normals;
  // normal matrix = inverse transpose of upper 3x3 (assume rigid/uniform scale; recompute generally)
  const a = m[0], b = m[4], c = m[8], d = m[1], e = m[5], f = m[9], g = m[2], h = m[6], i = m[10];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  const id = 1 / det;
  // inverse transpose rows
  const n00 = (e * i - f * h) * id, n01 = -(d * i - f * g) * id, n02 = (d * h - e * g) * id;
  const n10 = -(b * i - c * h) * id, n11 = (a * i - c * g) * id, n12 = -(a * h - b * g) * id;
  const n20 = (b * f - c * e) * id, n21 = -(a * f - c * d) * id, n22 = (a * e - b * d) * id;
  for (let v = 0; v < P.length; v += 3) {
    const x = P[v], y = P[v + 1], z = P[v + 2];
    P[v] = m[0] * x + m[4] * y + m[8] * z + m[12];
    P[v + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    P[v + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    const nx = N[v], ny = N[v + 1], nz = N[v + 2];
    let tx = n00 * nx + n01 * ny + n02 * nz, ty = n10 * nx + n11 * ny + n12 * nz, tz = n20 * nx + n21 * ny + n22 * nz;
    const l = sqrt(tx * tx + ty * ty + tz * tz) || 1;
    N[v] = tx / l; N[v + 1] = ty / l; N[v + 2] = tz / l;
  }
  if (det < 0) { const I = mesh.indices; for (let t = 0; t < I.length; t += 3) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; } }
  return mesh;
}
export function mirrorMesh(mesh) {
  const P = new Float32Array(mesh.positions), N = new Float32Array(mesh.normals), I = new Uint32Array(mesh.indices);
  for (let v = 0; v < P.length; v += 3) { P[v] = -P[v]; N[v] = -N[v]; }
  for (let t = 0; t < I.length; t += 3) { const tmp = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = tmp; }
  const out = { positions: P, normals: N, indices: I };
  if (mesh.colors) out.colors = new Float32Array(mesh.colors);
  return out;
}
export function cloneMesh(mesh) {
  const out = { positions: new Float32Array(mesh.positions), normals: new Float32Array(mesh.normals), indices: new Uint32Array(mesh.indices) };
  if (mesh.colors) out.colors = new Float32Array(mesh.colors);
  return out;
}
export function mergeMeshes(list) {
  let nv = 0, ni = 0;
  for (const m of list) { nv += m.positions.length; ni += m.indices.length; }
  const P = new Float32Array(nv), N = new Float32Array(nv), I = new Uint32Array(ni);
  let hasC = list.some((m) => m.colors);
  const C = hasC ? new Float32Array(nv) : null;
  let vo = 0, io = 0;
  for (const m of list) {
    P.set(m.positions, vo); N.set(m.normals, vo);
    if (hasC) { if (m.colors) C.set(m.colors, vo); else C.fill(1, vo, vo + m.positions.length); }
    const base = vo / 3;
    for (let t = 0; t < m.indices.length; t++) I[io + t] = m.indices[t] + base;
    vo += m.positions.length; io += m.indices.length;
  }
  const out = { positions: P, normals: N, indices: I };
  if (hasC) out.colors = C;
  return out;
}

// 4x4 matrix helpers (column-major arrays)
export function matFrom(pos, rotDeg = [0, 0, 0], scale = 1) {
  const A = axesOf(rotDeg);
  // axes rows are local axes in world => columns of rotation matrix
  const s = Array.isArray(scale) ? scale : [scale, scale, scale];
  return [
    A[0] * s[0], A[1] * s[0], A[2] * s[0], 0,
    A[3] * s[1], A[4] * s[1], A[5] * s[1], 0,
    A[6] * s[2], A[7] * s[2], A[8] * s[2], 0,
    pos[0], pos[1], pos[2], 1,
  ];
}
export function matMul(a, b) { // a*b, column-major
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
// rotation about an axis (unit) by angle deg, around a pivot point
export function matRotAxis(axis, deg, pivot = [0, 0, 0]) {
  const [x, y, z] = norm3(axis); const a = deg * D2R, c = Math.cos(a), s = Math.sin(a), t = 1 - c;
  const R = [
    t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1,
  ];
  const T1 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, pivot[0], pivot[1], pivot[2], 1];
  const T0 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -pivot[0], -pivot[1], -pivot[2], 1];
  return matMul(T1, matMul(R, T0));
}
export function matTrans(p) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, p[0], p[1], p[2], 1]; }
export const MAT_I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export function applyPt(m, p) {
  return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
}
export function bounds(mesh) {
  const P = mesh.positions; const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
  for (let v = 0; v < P.length; v += 3) for (let a = 0; a < 3; a++) { const q = P[v + a]; if (q < mn[a]) mn[a] = q; if (q > mx[a]) mx[a] = q; }
  return { min: mn, max: mx, size: [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]], center: [(mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2] };
}
