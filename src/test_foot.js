import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import { hand, foot } from './shapes_hand.js';
import { RES } from './sdf.js';

const canvas = document.getElementById('c');
const st = makeStage(canvas);
const P = new URLSearchParams(location.search);
RES.scale = parseFloat(P.get('res') || '1.0');
const mat = patchBone(new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.62, metalness: 0, vertexColors: true }));
const hl = new THREE.MeshStandardMaterial({ color: 0xe8b04a, roughness: 0.5, vertexColors: true });
const group = new THREE.Group(); st.scene.add(group);
const which = P.get('w') || 'foot';
const only = P.get('only') ? new RegExp(P.get('only')) : null;
const hi = P.get('hi') ? new RegExp(P.get('hi')) : null;
const t0 = performance.now();
const d = which === 'hand' ? hand() : foot();
for (const [k, m] of Object.entries(d)) {
  if (only && !only.test(k)) continue;
  const mesh = new THREE.Mesh(geometryFrom(m), hi && hi.test(k) ? hl : mat);
  mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
}
document.getElementById('log').textContent = which + ' ' + Object.keys(d).length + ' bones ' + ((performance.now() - t0) | 0) + 'ms';
const c = [parseFloat(P.get('cx') || '0'), parseFloat(P.get('cy') || '-4'), parseFloat(P.get('cz') || '4')];
const dd = parseFloat(P.get('d') || '55');
st.controls.target.set(...c);
st.controls.minDistance = 2;
const az = parseFloat(P.get('az') || '0') * Math.PI / 180, el = parseFloat(P.get('el') || '0') * Math.PI / 180;
st.camera.position.set(c[0] + dd * Math.sin(az) * Math.cos(el), c[1] + dd * Math.sin(el), c[2] + dd * Math.cos(az) * Math.cos(el));
st.camera.near = 1; st.controls.update();
st.floor.visible = false;
st.key.position.set(c[0] + 40, c[1] + 70, c[2] + 60); st.key.target.position.set(...c);
const sc = st.key.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 20; sc.far = 200; sc.updateProjectionMatrix();
st.renderer.shadowMap.needsUpdate = true;
function resize() { const w = innerWidth, hh = innerHeight; st.renderer.setSize(w, hh, false); st.camera.aspect = w / hh; st.camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
(function loop() { st.controls.update(); st.renderer.render(st.scene, st.camera); requestAnimationFrame(loop); })();
window.__st = st;
