import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./index.css";

const LABELS = [
  { text: "Slab seat", anchor: [0.5, 0.5, 0.45] },
  { text: "Back slats", anchor: [0.5, 0.9, 0.78] },
  { text: "Square legs", anchor: [0.15, 0.18, 0.22] },
  { text: "Round stretchers", anchor: [0.5, 0.22, 0.18] },
];

const VIEWS = [
  { id: "angle", title: "Angle", note: "Perspective" },
  { id: "front", title: "Front", note: "Elevation" },
  { id: "detail", title: "Back", note: "Slats" },
  { id: "top", title: "Top", note: "Plan" },
];

function createLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x65736e, 2));

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(1400, -1800, 2400);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 100;
  key.shadow.camera.far = 5200;
  key.shadow.camera.left = -1500;
  key.shadow.camera.right = 1500;
  key.shadow.camera.top = 2600;
  key.shadow.camera.bottom = -800;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xd3ecff, 1);
  fill.position.set(-1200, 900, 1200);
  scene.add(fill);

  const front = new THREE.DirectionalLight(0xfff4e4, 1.5);
  front.position.set(650, 700, -1800);
  scene.add(front);
}

function configureCamera(view, camera, target, model, aspect = 1) {
  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const distance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));

  target.copy(center);
  if (view === "front") {
    camera.position.set(center.x, center.y + distance * 0.03, center.z - distance * 1.75);
  } else if (view === "detail") {
    target.set(center.x, center.y + size.y * 0.16, center.z + size.z * 0.1);
    camera.position.set(center.x + distance * 0.16, center.y + distance * 0.12, center.z + distance * 1.45);
  } else if (view === "top") {
    camera.position.set(center.x, center.y + distance * 1.55, center.z + distance * 0.02);
  } else {
    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.28, center.z - distance * 1.45);
  }

  camera.aspect = aspect;
  camera.near = Math.max(1, distance / 120);
  camera.far = distance * 8;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
}

function getPanelRect(container, panel) {
  const containerRect = container.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  return {
    x: panelRect.left - containerRect.left,
    y: panelRect.top - containerRect.top,
    width: panelRect.width,
    height: panelRect.height,
  };
}

function findViewAtPoint(container, panelRefs, clientX, clientY) {
  const containerRect = container.getBoundingClientRect();
  const x = clientX - containerRect.left;
  const y = clientY - containerRect.top;

  return VIEWS.find((view) => {
    const panel = panelRefs.current.get(view.id);
    if (!panel) return false;
    const rect = getPanelRect(container, panel);
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  });
}

function FourCameraViewer({ settings, onLoaded }) {
  const containerRef = useRef(null);
  const canvasHostRef = useRef(null);
  const panelRefs = useRef(new Map());
  const settingsRef = useRef(settings);
  const [status, setStatus] = useState("Loading");
  const [labels, setLabels] = useState([]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const container = containerRef.current;
    const canvasHost = canvasHostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9efec);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setScissorTest(true);
    canvasHost.appendChild(renderer.domElement);

    const cameras = new Map(
      VIEWS.map((view) => [view.id, new THREE.PerspectiveCamera(42, 1, 1, 10000)]),
    );
    const targets = new Map(VIEWS.map((view) => [view.id, new THREE.Vector3()]));
    const controls = new Map(
      VIEWS.map((view) => {
        const control = new OrbitControls(cameras.get(view.id), renderer.domElement);
        control.enableDamping = true;
        control.autoRotateSpeed = 0.75;
        control.maxPolarAngle = Math.PI * 0.88;
        control.enabled = false;
        return [view.id, control];
      }),
    );
    let activeViewId = "angle";

    const setActiveControl = (viewId) => {
      activeViewId = viewId ?? activeViewId;
      controls.forEach((control, id) => {
        control.enabled = id === activeViewId;
      });
    };
    setActiveControl("angle");

    createLights(scene);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1500, 1500),
      new THREE.MeshStandardMaterial({ color: 0xdde6e2, roughness: 0.92, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -18, 120);
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(1400, 14, 0x788d85, 0xc3d0ca);
    grid.position.y = -16;
    scene.add(grid);

    let model = null;
    let frameId = 0;
    let disposed = false;

    const resizeRenderer = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      if (!model) return;
      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        if (!panel) return;
        const panelRect = getPanelRect(container, panel);
        const aspect = panelRect.width / Math.max(panelRect.height, 1);
        const camera = cameras.get(view.id);
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      });
    };

    const updateLabels = () => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.labels || !model) {
        setLabels([]);
        return;
      }

      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const nextLabels = [];

      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        const camera = cameras.get(view.id);
        if (!panel || !camera) return;
        const panelRect = getPanelRect(container, panel);

        LABELS.forEach((label) => {
          const position = new THREE.Vector3(
            box.min.x + size.x * label.anchor[0],
            box.min.y + size.y * label.anchor[1],
            box.min.z + size.z * label.anchor[2],
          );
          const projected = position.project(camera);
          const x = panelRect.x + ((projected.x + 1) / 2) * panelRect.width;
          const y = panelRect.y + ((-projected.y + 1) / 2) * panelRect.height;
          const visible =
            projected.z > -1 &&
            projected.z < 1 &&
            x > panelRect.x &&
            x < panelRect.x + panelRect.width &&
            y > panelRect.y &&
            y < panelRect.y + panelRect.height;

          nextLabels.push({
            key: `${view.id}-${label.text}`,
            text: label.text,
            x,
            y,
            visible,
          });
        });
      });

      setLabels(nextLabels);
    };

    const configureAllCameras = () => {
      if (!model) return;
      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        const panelRect = panel ? getPanelRect(container, panel) : { width: 1, height: 1 };
        const camera = cameras.get(view.id);
        const target = targets.get(view.id);
        configureCamera(view.id, camera, target, model, panelRect.width / Math.max(panelRect.height, 1));
        controls.get(view.id).target.copy(target);
        controls.get(view.id).update();
      });
    };

    const activatePointerView = (event) => {
      const view = findViewAtPoint(container, panelRefs, event.clientX, event.clientY);
      if (view) setActiveControl(view.id);
    };

    const activateHoverView = (event) => {
      if (event.buttons !== 0) return;
      activatePointerView(event);
    };

    renderer.domElement.addEventListener("pointerdown", activatePointerView, true);
    renderer.domElement.addEventListener("pointermove", activateHoverView, true);
    renderer.domElement.addEventListener("wheel", activatePointerView, { capture: true, passive: true });

    const loader = new GLTFLoader();
    loader.load(
      "/output/door_model.glb",
      (gltf) => {
        if (disposed) return;
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
        window.__chairDebug = { model, cameras };
        configureAllCameras();
        resizeRenderer();
        setStatus("Loaded");
        onLoaded(meshes);
      },
      undefined,
      (error) => {
        console.error(error);
        setStatus("Load failed");
      },
    );

    const observer = new ResizeObserver(resizeRenderer);
    observer.observe(container);

    const render = () => {
      const currentSettings = settingsRef.current;
      const canvasRect = container.getBoundingClientRect();
      grid.visible = currentSettings.grid;
      floor.visible = currentSettings.floor;
      controls.forEach((control, id) => {
        control.autoRotate = currentSettings.autoRotate && id === "angle";
        control.update();
      });

      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        const camera = cameras.get(view.id);
        if (!panel || !camera) return;

        const panelRect = getPanelRect(container, panel);
        const x = Math.round(panelRect.x);
        const y = Math.round(canvasRect.height - panelRect.y - panelRect.height);
        const width = Math.round(panelRect.width);
        const height = Math.round(panelRect.height);

        renderer.setViewport(x, y, width, height);
        renderer.setScissor(x, y, width, height);
        renderer.render(scene, camera);
      });

      updateLabels();
      frameId = requestAnimationFrame(render);
    };

    resizeRenderer();
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", activatePointerView, true);
      renderer.domElement.removeEventListener("pointermove", activateHoverView, true);
      renderer.domElement.removeEventListener("wheel", activatePointerView, true);
      controls.forEach((control) => control.dispose());
      renderer.dispose();
      canvasHost.removeChild(renderer.domElement);
    };
  }, [onLoaded]);

  return (
    <div ref={containerRef} className="relative min-h-[860px] overflow-hidden lg:min-h-0">
      <div ref={canvasHostRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 grid grid-cols-1 gap-2 p-2 md:grid-cols-2">
        {VIEWS.map((view) => (
          <section
            key={view.id}
            ref={(element) => {
              if (element) {
                panelRefs.current.set(view.id, element);
              } else {
                panelRefs.current.delete(view.id);
              }
            }}
            className="relative min-h-[410px] overflow-hidden rounded border border-slate-300/90 shadow-sm md:min-h-0"
          >
            <div className="absolute left-2 top-2 rounded border border-white/60 bg-white/80 px-2 py-1 text-slate-800 shadow-sm backdrop-blur">
              <div className="text-xs font-medium leading-none">{view.title}</div>
              <div className="mt-0.5 text-[10px] text-slate-500">{view.note}</div>
            </div>
            <div className="absolute right-2 top-2 rounded border border-white/60 bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm backdrop-blur">
              {status}
            </div>
          </section>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-0">
        {labels.map(
          (label) =>
            label.visible && (
              <div
                key={label.key}
                className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded border border-teal-900/20 bg-white/90 px-1.5 py-0.5 text-[10px] text-teal-950 shadow-md"
                style={{ left: label.x, top: label.y }}
              >
                {label.text}
              </div>
            ),
        )}
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-400 text-teal-700"
      />
      <span>{label}</span>
    </label>
  );
}

function App() {
  const [settings, setSettings] = useState({
    autoRotate: false,
    labels: true,
    grid: true,
    floor: true,
  });
  const [partCount, setPartCount] = useState(null);

  const setOption = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const controls = useMemo(
    () => [
      ["autoRotate", "Auto rotate"],
      ["labels", "Labels"],
      ["grid", "Grid"],
      ["floor", "Floor"],
    ],
    [],
  );

  return (
    <main className="grid min-h-screen grid-rows-[auto_1fr] bg-[#e9efec]">
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-white/90 px-2 py-1.5 shadow-sm backdrop-blur">
        <div className="mr-auto flex min-w-0 items-center gap-3 text-xs text-slate-600">
          <span className="font-medium text-slate-800">Chair viewer</span>
          <span>Parts {partCount ?? "-"}</span>
          <span>Height 1055 mm</span>
        </div>
        {controls.map(([key, label]) => (
          <Checkbox key={key} label={label} checked={settings[key]} onChange={(value) => setOption(key, value)} />
        ))}
      </header>

      <FourCameraViewer settings={settings} onLoaded={setPartCount} />
    </main>
  );
}

createRoot(document.querySelector("#root")).render(<App />);
