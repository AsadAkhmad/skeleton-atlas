import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import * as HF from './shapes_hand.js';

const canvas = document.getElementById('c');
const st = makeStage(canvas);
const P = new URLSearchParams(location.search);
const src = P.get('src') || 'hand';
const mat = patchBone(new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.62, metalness: 0, vertexColors: true }));
const group = new THREE.Group(); st.scene.add(group);
const t0 = performance.now();
const bones = HF[src]();
const log = [src + ' ' + ((performance.now() - t0) | 0) + ' ms'];
let tot = 0, ci = 0;
const tint = P.get('m') === 'tint';
for (const [k, m] of Object.entries(bones)) {
  const g = geometryFrom(m);
  if (tint) { const col = new THREE.Color().setHSL((ci++ * 0.137) % 1, 0.5, 0.65); const c = g.getAttribute('color'); for (let i = 0; i < c.count; i++) c.setXYZ(i, col.r, col.g, col.b); }
  const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); tot += m.indices.length / 3; log.push(k + ' ' + (m.indices.length / 3 | 0));
}
log.push('total ' + (tot | 0));
document.getElementById('log').textContent = log.join('\n');
group.position.set(0, 60, 0);
st.controls.target.set(0, 58, 0);
const d = parseFloat(P.get('d') || '40');
const az = parseFloat(P.get('az') || '0') * Math.PI / 180, el = parseFloat(P.get('el') || '0') * Math.PI / 180;
st.camera.position.set(d * Math.sin(az) * Math.cos(el), 58 + d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
st.controls.update();
st.key.target.position.set(0, 58, 0); st.key.position.set(60, 150, 100);
st.key.shadow.camera.left = -30; st.key.shadow.camera.right = 30; st.key.shadow.camera.top = 30; st.key.shadow.camera.bottom = -30;
function resize() { const w = innerWidth, hh = innerHeight; st.renderer.setSize(w, hh, false); st.camera.aspect = w / hh; st.camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
(function loop() { st.controls.update(); st.renderer.render(st.scene, st.camera); requestAnimationFrame(loop); })();
window.__st = st;
