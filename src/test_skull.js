import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import * as H from './shapes_head.js';
import { meshSDF } from './sdf.js';
import { teeth } from './shapes_teeth.js';

const canvas = document.getElementById('c');
const st = makeStage(canvas);
const P = new URLSearchParams(location.search);
const mode = P.get('m') || 'tint';
const mat = patchBone(new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.62, metalness: 0, vertexColors: true }));
const group = new THREE.Group(); st.scene.add(group);
const t0 = performance.now();
const h = parseFloat(P.get('h') || '0.16');
const bones = H.skullBones(h);
const log = ['skull ' + ((performance.now() - t0) | 0) + ' ms'];
let tot = 0;
const tints = {};
let ci = 0;
for (const [k, m] of Object.entries(bones)) {
  const hue = (ci++ * 0.137) % 1;
  const col = new THREE.Color().setHSL(hue, 0.55, 0.62);
  const g = geometryFrom(m);
  if (mode === 'tint') { const c = g.getAttribute('color'); for (let i = 0; i < c.count; i++) c.setXYZ(i, c.getX(i) * col.r, c.getY(i) * col.g, c.getZ(i) * col.b); }
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true;
  group.add(mesh); tot += m.indices.length / 3;
  log.push(`${k}: ${m.indices.length / 3 | 0}`);
}
if (P.get('mand') !== '0') {
  const spec = H.mandible(); const m = meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump });
  const mesh = new THREE.Mesh(geometryFrom(m), mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); log.push('mandible ' + (m.indices.length / 3 | 0));
}
if (P.get('teeth') !== '0') { const T = teeth(); const tm = new THREE.MeshStandardMaterial({ color: 0xf4eee0, roughness: 0.35, vertexColors: true }); for (const k of Object.keys(T)) { const mesh = new THREE.Mesh(geometryFrom(T[k]), tm); mesh.castShadow = true; group.add(mesh); log.push('teeth ' + k + ' ' + (T[k].indices.length / 3 | 0)); } }
log.push('total ' + (tot | 0));
document.getElementById('log').textContent = log.join('\n');
group.position.set(0, 50, 0);
st.controls.target.set(0, 50, 0);
const d = 45;
const az = parseFloat(P.get('az') || '25') * Math.PI / 180, el = parseFloat(P.get('el') || '10') * Math.PI / 180;
st.camera.position.set(d * Math.sin(az) * Math.cos(el), 50 + d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
st.controls.update();
st.key.target.position.set(0, 52, 0); st.key.position.set(60, 150, 100);
st.key.shadow.camera.left = -30; st.key.shadow.camera.right = 30; st.key.shadow.camera.top = 30; st.key.shadow.camera.bottom = -30;
let cam = st.camera;
if (P.get('ortho')) {
  const hh = 15; cam = new THREE.OrthographicCamera(-hh * 1.33, hh * 1.33, hh, -hh, 1, 500);
  cam.position.copy(st.camera.position); cam.lookAt(st.controls.target);
  st.controls.object = cam; st.controls.update();
  const mk = (a, b, c, d, col) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]); const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.55, depthTest: false })); l.renderOrder = 10; return l; };
  const plane = P.get('plane') || 'x';
  for (let i = -12; i <= 14; i++) {
    const col = i === 0 ? 0xff5555 : (i % 5 === 0 ? 0x66aaff : 0x446688);
    const L = plane === 'x' ? [[[0, i, -14], [0, i, 14]], [[0, -14, i], [0, 14, i]]] : [[[-14, i, 0], [14, i, 0]], [[i, -14, 0], [i, 14, 0]]];
    for (const [a, b] of L) { const l = mk(a, b); l.material.color.set(col); group.add(l); }
  }
}
function resize() { const w = innerWidth, hh = innerHeight; st.renderer.setSize(w, hh, false); st.camera.aspect = w / hh; st.camera.updateProjectionMatrix(); if (cam.isOrthographicCamera) { const a = w / hh; cam.left = -15 * a; cam.right = 15 * a; cam.updateProjectionMatrix(); } }
addEventListener('resize', resize); resize();
(function loop() { st.controls.update(); st.renderer.render(st.scene, cam); requestAnimationFrame(loop); })();
window.__st = st;
