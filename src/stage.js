import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const NOISE = `
float h31(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
 return mix(mix(mix(h31(i+vec3(0,0,0)),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),
 mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z); }
float boneH(vec3 p){ return vn(p*5.0)*0.55 + vn(p*13.0)*0.3 + vn(p*31.0)*0.15; }
vec3 perturbH(vec3 surf_pos, vec3 surf_norm, float h){
  vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos);
  vec3 R1 = cross(sy, surf_norm), R2 = cross(surf_norm, sx);
  float det = dot(sx, R1);
  det *= (float(gl_FrontFacing)*2.0-1.0);
  vec3 g = sign(det) * (dFdx(h)*R1 + dFdy(h)*R2);
  return normalize(abs(det)*surf_norm - g);
}`;

export function patchBone(mat, strength = 0.36) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP;\n' + NOISE)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float fw = length(fwidth(vOP)); float fade = smoothstep(0.55, 0.12, fw*5.0);
          float bh = boneH(vOP) * fade;
          normal = perturbH(-vViewPosition, normal, bh * ${strength.toFixed(3)} * 0.35); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        { float g = vn(vOP*3.1)*0.5 + vn(vOP*9.0)*0.5; diffuseColor.rgb *= 0.93 + 0.1*g; }`);
  };
  mat.customProgramCacheKey = () => 'bone' + strength;
  return mat;
}

export function makeStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 2000);
  camera.position.set(0, 100, 380);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.09;
  controls.target.set(0, 90, 0);
  controls.minDistance = 6; controls.maxDistance = 700;
  controls.screenSpacePanning = true;
  controls.update();

  const hemi = new THREE.HemisphereLight(0xfff2e0, 0x2a2430, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0dc, 2.3);
  key.position.set(120, 260, 220);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  const sc = key.shadow.camera; sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 50; sc.far = 700;
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.12; key.shadow.radius = 3;
  key.target.position.set(0, 90, 0);
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.9);
  rim.position.set(-200, 150, -220);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffe6cc, 0.45);
  fill.position.set(-220, 60, 180);
  scene.add(fill);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(160, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.05; floor.receiveShadow = true;
  scene.add(floor);

  return { renderer, scene, camera, controls, key, floor };
}

export function geometryFrom(mesh, tint) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(mesh.normals, 3));
  let col = mesh.colors;
  if (!col) { col = new Float32Array(mesh.positions.length).fill(1); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
  g.computeBoundingSphere(); g.computeBoundingBox();
  return g;
}
