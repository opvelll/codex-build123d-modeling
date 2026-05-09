import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const root = document.querySelector("#viewer");
const status = document.querySelector("#status");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf4f1ea);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 10000);
camera.position.set(1500, -2600, 1700);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
root.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1000);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;

scene.add(new THREE.HemisphereLight(0xffffff, 0x6d5d4c, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(1400, -1800, 2400);
scene.add(key);

const grid = new THREE.GridHelper(1800, 18, 0xa89984, 0xd7cbb8);
grid.rotation.x = Math.PI / 2;
scene.add(grid);

const loader = new GLTFLoader();
let model = null;

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));

  controls.target.copy(center);
  camera.position.set(center.x + distance * 0.8, center.y - distance * 1.35, center.z + distance * 0.75);
  camera.near = Math.max(1, distance / 100);
  camera.far = distance * 8;
  camera.updateProjectionMatrix();
  controls.update();
}

loader.load(
  "/output/door_model.glb",
  (gltf) => {
    model = gltf.scene;
    scene.add(model);
    frameObject(model);
    status.textContent = "Loaded";
  },
  undefined,
  (error) => {
    console.error(error);
    status.textContent = "Load failed";
  },
);

document.querySelector("#reset").addEventListener("click", () => {
  if (model) frameObject(model);
});

document.querySelector("#toggle-spin").addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

function render() {
  requestAnimationFrame(render);
  controls.update();
  renderer.render(scene, camera);
}

render();
