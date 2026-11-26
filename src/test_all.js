import * as THREE from 'three';
import { makeStage, patchBone, geometryFrom } from './stage.js';
import { ROSTER, decorative } from './layout.js';
import { RES } from './sdf.js';

const canvas = document.getElementById('c');
const st = makeStage(canvas);
const P = new URLSearchParams(location.search);
RES.scale = parseFloat(P.get('res') || '1.4');
const mat = patchBone(new THREE.MeshStandardMaterial({ color: 0xe8dcc2, roughness: 0.62, metalness: 0, vertexColors: true }));
const cmat = new THREE.MeshStandardMaterial({ color: 0xbcc9c4, roughness: 0.5, vertexColors: true });
const tmat = new THREE.MeshStandardMaterial({ color: 0xf6f0e2, roughness: 0.3, vertexColors: true });
const group = new THREE.Group(); st.scene.add(group);
const only = P.get('only') ? new RegExp(P.get('only')) : null;
const log = []; let tot = 0; const t00 = performance.now();
const times = {};
for (const d of ROSTER) {
  if (only && !only.test(d.id)) continue;
  const t0 = performance.now();
  let m;
  try { m = d.build(); } catch (e) { log.push('ERR ' + d.id + ' ' + e.message); console.error(d.id, e); continue; }
  const dt = performance.now() - t0;
  times[d.id] = dt | 0;
  const g = geometryFrom(m); const mesh = new THREE.Mesh(g, mat); mesh.castShadow = mesh.receiveShadow = true; mesh.userData.id = d.id; group.add(mesh); tot += m.indices.length / 3;
}
if (!P.get('nodeco')) for (const d of decorative()) { const g = geometryFrom(d.mesh); const mesh = new THREE.Mesh(g, d.kind === 'teeth' ? tmat : cmat); mesh.castShadow = true; group.add(mesh); }
log.push('bones ' + group.children.length + ' tris ' + (tot | 0) + ' time ' + ((performance.now() - t00) | 0) + 'ms');
const slow = Object.entries(times).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + ':' + v);
log.push('slowest ' + slow.join(' '));
document.getElementById('log').textContent = log.join('\n');
const cy = parseFloat(P.get('cy') || '90'); const dd = parseFloat(P.get('d') || '420');
st.controls.target.set(0, cy, 0);
const az = parseFloat(P.get('az') || '0') * Math.PI / 180, el = parseFloat(P.get('el') || '0') * Math.PI / 180;
st.camera.position.set(dd * Math.sin(az) * Math.cos(el), cy + dd * Math.sin(el), dd * Math.cos(az) * Math.cos(el));
st.controls.update();
function resize() { const w = innerWidth, hh = innerHeight; st.renderer.setSize(w, hh, false); st.camera.aspect = w / hh; st.camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
(function loop() { st.controls.update(); st.renderer.render(st.scene, st.camera); requestAnimationFrame(loop); })();
window.__st = st;
