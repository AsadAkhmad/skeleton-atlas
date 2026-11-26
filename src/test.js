import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import * as limb from './shapes_limb.js';
import * as axial from './shapes_axial.js';
import * as pelvis from './shapes_pelvis.js';
import { meshSDF } from './sdf.js';
const MODS = { limb, axial, pelvis };
try { Object.assign(MODS, window.__extraMods || {}); } catch (e) {}

const canvas = document.getElementById('c');
const st = makeStage(canvas);
const mat = patchBone(new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.62, metalness: 0, vertexColors: true }));
const P = new URLSearchParams(location.search);
const names = (P.get('b') || 'limb.humerus').split(',');
const group = new THREE.Group(); st.scene.add(group);
let x = 0; const log = [];
for (const n of names) {
  const [path, argstr] = n.split(':'); const [mod, fn] = path.split('.');
  const args = argstr ? argstr.split('_').map((a) => (isNaN(+a) ? a : +a)) : [];
  const t0 = performance.now();
  const spec = MODS[mod][fn](...args);
  const m = spec.positions ? spec : meshSDF(spec.f, spec.min, spec.max, spec.h, { bump: spec.bump });
  const dt = performance.now() - t0;
  log.push(`${n}: ${(m.indices.length / 3) | 0} tris, ${dt | 0} ms`);
  const mesh = new THREE.Mesh(geometryFrom(m), mat);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.geometry.computeBoundingBox();
  const bb = mesh.geometry.boundingBox; const c = bb.getCenter(new THREE.Vector3()); const sz = bb.getSize(new THREE.Vector3());
  mesh.position.set(x - c.x + sz.x / 2, -c.y + 50, -c.z); x += sz.x + 1.5;
  group.add(mesh);
}
document.getElementById('log').textContent = log.join('\n');
const bb = new THREE.Box3().setFromObject(group); const c = bb.getCenter(new THREE.Vector3()); const s = bb.getSize(new THREE.Vector3());
group.position.x = -c.x;
st.controls.target.set(0, 50, 0);
const d = Math.max(s.x, s.y) * 1.6 + 6;
const az = parseFloat(P.get('az') || '20') * Math.PI / 180, el = parseFloat(P.get('el') || '10') * Math.PI / 180;
st.camera.position.set(d * Math.sin(az) * Math.cos(el), 50 + d * Math.sin(el), d * Math.cos(az) * Math.cos(el));
st.controls.update();
st.key.target.position.set(0, 50, 0); st.key.position.set(60, 150, 100);
st.key.shadow.camera.left = -40; st.key.shadow.camera.right = 40; st.key.shadow.camera.top = 40; st.key.shadow.camera.bottom = -40;
function resize() { const w = innerWidth, h = innerHeight; st.renderer.setSize(w, h, false); st.camera.aspect = w / h; st.camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
(function loop() { st.controls.update(); st.renderer.render(st.scene, st.camera); requestAnimationFrame(loop); })();
window.__st = st;
