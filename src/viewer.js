import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const root = document.querySelector("#viewer");
const status = document.querySelector("#status");
const overlay = document.querySelector("#overlay");
const partCount = document.querySelector("#part-count");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeef2f1);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 1, 10000);
camera.position.set(1500, -2600, 1700);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
root.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1000);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.85;
controls.maxPolarAngle = Math.PI * 0.88;

scene.add(new THREE.HemisphereLight(0xffffff, 0x6b756f, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(1400, -1800, 2400);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 100;
key.shadow.camera.far = 5200;
key.shadow.camera.left = -1500;
key.shadow.camera.right = 1500;
key.shadow.camera.top = 2600;
key.shadow.camera.bottom = -800;
scene.add(key);

const fill = new THREE.DirectionalLight(0xcbe9ff, 1.1);
fill.position.set(-1200, 900, 1200);
scene.add(fill);

const frontLight = new THREE.DirectionalLight(0xfff6e8, 1.8);
frontLight.position.set(650, 700, -1800);
scene.add(frontLight);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(2300, 2700),
  new THREE.MeshStandardMaterial({ color: 0xdfe7e3, roughness: 0.92, metalness: 0.02 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -23, 120);
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(2100, 21, 0x7d918a, 0xc6d2cd);
grid.position.y = -21;
scene.add(grid);

const loader = new GLTFLoader();
let model = null;
const labelData = [
  { text: "Raised panels", anchor: [0.48, 0.88, 0.66] },
  { text: "Lever hardware", anchor: [0.75, 0.92, 0.50] },
  { text: "Hinge barrels", anchor: [0.12, 0.42, 0.50] },
  { text: "Casing frame", anchor: [0.50, 0.50, 0.05] },
];
const labelElements = labelData.map(({ text }) => {
  const element = document.createElement("div");
  element.className = "label";
  element.textContent = text;
  overlay.appendChild(element);
  return element;
});

function frameObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));

  controls.target.copy(center);
  camera.position.set(center.x + distance * 0.7, center.y + distance * 0.28, center.z - distance * 1.45);
  camera.near = Math.max(1, distance / 100);
  camera.far = distance * 8;
  camera.updateProjectionMatrix();
  controls.update();
}

function setView(view) {
  if (!model) return;

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));

  controls.target.copy(center);
  if (view === "front") {
    camera.position.set(center.x, center.y + distance * 0.03, center.z - distance * 1.75);
  } else if (view === "hardware") {
    controls.target.set(center.x + size.x * 0.24, center.y + size.y * 0.48, center.z - size.z * 0.28);
    camera.position.set(center.x + distance * 0.48, center.y + distance * 0.18, center.z - distance * 0.88);
  } else {
    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.28, center.z - distance * 1.45);
  }
  camera.updateProjectionMatrix();
  controls.update();
}

function updateLabels() {
  const labelsEnabled = document.querySelector("#toggle-labels").checked;
  const modelBox = model ? new THREE.Box3().setFromObject(model) : null;
  const modelSize = modelBox ? modelBox.getSize(new THREE.Vector3()) : null;
  labelData.forEach((label, index) => {
    const element = labelElements[index];
    if (!labelsEnabled || !modelBox || !modelSize) {
      element.style.display = "none";
      return;
    }

    const position = new THREE.Vector3(
      modelBox.min.x + modelSize.x * label.anchor[0],
      modelBox.min.y + modelSize.y * label.anchor[1],
      modelBox.min.z + modelSize.z * label.anchor[2],
    );
    const projected = position.project(camera);
    const screenX = ((projected.x + 1) / 2) * innerWidth;
    const screenY = ((-projected.y + 1) / 2) * innerHeight;
    const visible =
      projected.z > -1 &&
      projected.z < 1 &&
      screenX > 0 &&
      screenX < innerWidth &&
      screenY > 0 &&
      screenY < innerHeight;
    element.style.display = visible ? "block" : "none";
    element.style.left = `${screenX}px`;
    element.style.top = `${screenY}px`;
  });
}

loader.load(
  "/output/door_model.glb",
  (gltf) => {
    model = gltf.scene;
    let meshes = 0;
    model.traverse((child) => {
      if (!child.isMesh) return;
      meshes += 1;
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.DoubleSide;
        child.material.roughness = Math.max(child.material.roughness ?? 0.55, 0.42);
        child.material.needsUpdate = true;
      }
    });
    scene.add(model);
    window.__doorDebug = { model };
    frameObject(model);
    partCount.textContent = String(meshes);
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
  document.querySelector("#toggle-spin").ariaPressed = String(controls.autoRotate);
});

document.querySelector("#toggle-labels").addEventListener("change", updateLabels);

document.querySelectorAll(".view-preset").forEach((button) => {
  button.addEventListener("click", () => {
    controls.autoRotate = false;
    setView(button.dataset.view);
  });
});

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  updateLabels();
});

function render() {
  requestAnimationFrame(render);
  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

render();
