import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "./index.css";

const VIEWS = [
  { id: "angle", title: "Angle", note: "Perspective" },
  { id: "front", title: "Front", note: "Elevation" },
  { id: "back", title: "Back", note: "Elevation" },
  { id: "top", title: "Top", note: "Plan" },
];
const ALL_MODELS_ID = "__all__";
const modelLoader = new GLTFLoader();
const modelCache = new Map();

function loadModelAsset(model) {
  const url = model.files.glb;
  if (!modelCache.has(url)) {
    const request = new Promise((resolve, reject) => {
      modelLoader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            child.castShadow = true;
            child.receiveShadow = true;
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.filter(Boolean).forEach((material) => {
              material.side = THREE.DoubleSide;
              material.roughness = Math.max(material.roughness ?? 0.55, 0.42);
              material.needsUpdate = true;
            });
          });
          resolve(gltf.scene);
        },
        undefined,
        reject,
      );
    }).catch((error) => {
      modelCache.delete(url);
      throw error;
    });
    modelCache.set(url, request);
  }
  return modelCache.get(url);
}

function preloadModel(model) {
  loadModelAsset(model).catch((error) => {
    console.error(`Could not preload ${model.files.glb}`, error);
  });
}

function createLights(scene) {
  scene.add(new THREE.HemisphereLight(0xffffff, 0x65736e, 2));

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(1400, -1800, 2400);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
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
  camera.up.set(0, 1, 0);
  if (view === "front") {
    camera.position.set(center.x, center.y + distance * 0.03, center.z + distance * 1.75);
  } else if (view === "back") {
    camera.position.set(center.x, center.y + distance * 0.03, center.z - distance * 1.75);
  } else if (view === "top") {
    camera.up.set(0, 0, -1);
    camera.position.set(center.x, center.y + distance * 1.65, center.z);
  } else {
    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.3, center.z + distance * 1.45);
  }

  camera.aspect = aspect;
  camera.near = Math.max(0.1, distance / 120);
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

function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose();
    });
  });
}

function disposeModelCache() {
  modelCache.forEach((request) => {
    request.then(disposeObject).catch(() => {});
  });
  modelCache.clear();
}

function ModelViewer({ models, viewerId, settings, onLoaded, onError }) {
  const containerRef = useRef(null);
  const canvasHostRef = useRef(null);
  const panelRefs = useRef(new Map());
  const settingsRef = useRef(settings);
  const runtimeRef = useRef(null);
  const loadGenerationRef = useRef(0);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [status, setStatus] = useState("Loading");

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const container = containerRef.current;
    const canvasHost = canvasHostRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xe9efec);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.setScissorTest(true);
    canvasHost.appendChild(renderer.domElement);

    const cameras = new Map(
      VIEWS.map((view) => [view.id, new THREE.PerspectiveCamera(42, 1, 0.1, 10000)]),
    );
    const targets = new Map(VIEWS.map((view) => [view.id, new THREE.Vector3()]));
    const controls = new Map(
      VIEWS.map((view) => {
        const control = new OrbitControls(cameras.get(view.id), renderer.domElement);
        control.enableDamping = true;
        control.autoRotateSpeed = 0.75;
        control.maxPolarAngle = Math.PI * 0.88;
        control.enabled = view.id === "angle";
        return [view.id, control];
      }),
    );

    createLights(scene);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0xdde6e2, roughness: 0.92, metalness: 0.02 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(1, 14, 0x788d85, 0xc3d0ca);
    scene.add(grid);

    let frameId = 0;
    const runtime = {
      scene,
      renderer,
      cameras,
      targets,
      controls,
      floor,
      grid,
      loadedModel: null,
      resizeRenderer: null,
    };
    runtimeRef.current = runtime;

    const resizeRenderer = () => {
      const rect = container.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      if (!runtime.loadedModel) return;
      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        if (!panel) return;
        const panelRect = getPanelRect(container, panel);
        const camera = cameras.get(view.id);
        camera.aspect = panelRect.width / Math.max(panelRect.height, 1);
        camera.updateProjectionMatrix();
      });
    };
    runtime.resizeRenderer = resizeRenderer;

    const activateControl = (event) => {
      const active = VIEWS.find((view) => {
        const panel = panelRefs.current.get(view.id);
        if (!panel) return false;
        const rect = panel.getBoundingClientRect();
        return (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        );
      });
      if (active) {
        controls.forEach((control, id) => {
          control.enabled = id === active.id;
        });
      }
    };

    renderer.domElement.addEventListener("pointerdown", activateControl, true);
    renderer.domElement.addEventListener("pointermove", activateControl, true);
    renderer.domElement.addEventListener("wheel", activateControl, { capture: true, passive: true });

    const observer = new ResizeObserver(resizeRenderer);
    observer.observe(container);

    const render = () => {
      const current = settingsRef.current;
      const canvasRect = container.getBoundingClientRect();
      grid.visible = current.grid;
      floor.visible = current.floor;
      controls.forEach((control, id) => {
        control.autoRotate = current.autoRotate && id === "angle";
        control.update();
      });

      VIEWS.forEach((view) => {
        const panel = panelRefs.current.get(view.id);
        if (!panel) return;
        const rect = getPanelRect(container, panel);
        renderer.setViewport(
          Math.round(rect.x),
          Math.round(canvasRect.height - rect.y - rect.height),
          Math.round(rect.width),
          Math.round(rect.height),
        );
        renderer.setScissor(
          Math.round(rect.x),
          Math.round(canvasRect.height - rect.y - rect.height),
          Math.round(rect.width),
          Math.round(rect.height),
        );
        renderer.render(scene, cameras.get(view.id));
      });
      frameId = requestAnimationFrame(render);
    };

    resizeRenderer();
    render();
    setRuntimeReady(true);

    return () => {
      loadGenerationRef.current += 1;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", activateControl, true);
      renderer.domElement.removeEventListener("pointermove", activateControl, true);
      renderer.domElement.removeEventListener("wheel", activateControl, true);
      controls.forEach((control) => control.dispose());
      floor.geometry.dispose();
      floor.material.dispose();
      renderer.dispose();
      canvasHost.removeChild(renderer.domElement);
      runtimeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!runtimeReady || !models.length) return;

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setStatus("Loading");

    Promise.all(
      models.map((model) =>
        loadModelAsset(model).then((scene) => ({ model, scene: scene.clone(true) })),
      ),
    )
      .then((loadedScenes) => {
        if (generation !== loadGenerationRef.current) return;
        const runtime = runtimeRef.current;
        if (!runtime) return;

        const { scene, cameras, targets, controls, floor, grid, resizeRenderer } = runtime;
        if (runtime.loadedModel) scene.remove(runtime.loadedModel);

        const loadedModel = new THREE.Group();
        let meshes = 0;
        const measurements = loadedScenes.map(({ model, scene: modelScene }) => {
          modelScene.traverse((child) => {
            if (child.isMesh) meshes += 1;
          });
          const box = new THREE.Box3().setFromObject(modelScene);
          const wrapper = new THREE.Group();
          wrapper.add(modelScene);
          return {
            model,
            wrapper,
            box,
            size: box.getSize(new THREE.Vector3()),
            center: box.getCenter(new THREE.Vector3()),
          };
        });

        const largestWidth = Math.max(...measurements.map(({ size }) => size.x));
        const gap = Math.max(largestWidth * 0.18, 0.12);
        let cursorX = 0;
        measurements.forEach(({ wrapper, box, size, center }) => {
          wrapper.position.set(cursorX + size.x / 2 - center.x, -box.min.y, -center.z);
          loadedModel.add(wrapper);
          cursorX += size.x + gap;
        });

        const arrangedBox = new THREE.Box3().setFromObject(loadedModel);
        const arrangedCenter = arrangedBox.getCenter(new THREE.Vector3());
        loadedModel.children.forEach((child) => {
          child.position.x -= arrangedCenter.x;
        });
        scene.add(loadedModel);
        runtime.loadedModel = loadedModel;

        const box = new THREE.Box3().setFromObject(loadedModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const footprint = Math.max(size.x, size.z) * 2.2;
        floor.geometry.dispose();
        floor.geometry = new THREE.PlaneGeometry(footprint, footprint);
        floor.position.set(center.x, box.min.y, center.z);
        grid.scale.set(footprint, footprint, footprint);
        grid.position.copy(floor.position);

        VIEWS.forEach((view) => {
          const panel = panelRefs.current.get(view.id);
          const rect = panel ? getPanelRect(containerRef.current, panel) : { width: 1, height: 1 };
          const camera = cameras.get(view.id);
          const target = targets.get(view.id);
          configureCamera(view.id, camera, target, loadedModel, rect.width / Math.max(rect.height, 1));
          controls.get(view.id).target.copy(target);
          controls.get(view.id).update();
        });
        resizeRenderer();
        window.__modelViewer = {
          id: viewerId,
          urls: models.map((model) => model.files.glb),
          url: models[0]?.files.glb,
          cameras,
          floorY: floor.position.y,
          modelMinY: box.min.y,
          modelCount: models.length,
          bounds: { x: size.x, y: size.y, z: size.z },
        };
        setStatus("Loaded");
        onLoaded(meshes);
      })
      .catch((error) => {
        if (generation !== loadGenerationRef.current) return;
        console.error(error);
        setStatus("Load failed");
        onError("Could not load one or more model files.");
      });
  }, [models, viewerId, onError, onLoaded, runtimeReady]);

  return (
    <div ref={containerRef} className="viewer">
      <div ref={canvasHostRef} className="canvas-host" />
      <div className="view-grid">
        {VIEWS.map((view) => (
          <section
            key={view.id}
            ref={(element) => {
              if (element) panelRefs.current.set(view.id, element);
              else panelRefs.current.delete(view.id);
            }}
            className="view-panel"
            data-view={view.id}
          >
            <div className="view-label">
              <strong>{view.title}</strong>
              <span>{view.note}</span>
            </div>
            <span className="load-status">{status}</span>
          </section>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function dimensionsText(dimensions) {
  if (!dimensions) return "";
  return `${dimensions.x} × ${dimensions.y} × ${dimensions.z} ${dimensions.unit}`;
}

function App() {
  const [models, setModels] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [manifestError, setManifestError] = useState("");
  const [viewerError, setViewerError] = useState("");
  const [partCount, setPartCount] = useState(null);
  const [settings, setSettings] = useState({ autoRotate: false, grid: true, floor: true });

  useEffect(() => () => disposeModelCache(), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/output/models.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((manifest) => {
        if (cancelled) return;
        const nextModels = Array.isArray(manifest.models) ? manifest.models : [];
        const defaultModelId = nextModels.some((model) => model.id === manifest.defaultModelId)
          ? manifest.defaultModelId
          : nextModels.at(-1)?.id;
        setModels(nextModels);
        setSelectedId(defaultModelId ?? null);
        if (!nextModels.length) setManifestError("No models are listed in output/models.json.");
      })
      .catch((error) => {
        if (!cancelled) setManifestError(`Could not load model manifest: ${error.message}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedModel = models.find((model) => model.id === selectedId);
  const selectedModels = useMemo(
    () => (selectedId === ALL_MODELS_ID ? models : selectedModel ? [selectedModel] : []),
    [models, selectedId, selectedModel],
  );
  const isAllModels = selectedId === ALL_MODELS_ID;
  const onLoaded = useCallback((count) => {
    setPartCount(count);
    setViewerError("");
  }, []);
  const onError = useCallback((message) => setViewerError(message), []);

  const selectModel = (id) => {
    setSelectedId(id);
    setPartCount(null);
    setViewerError("");
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <nav className="model-list" aria-label="Models">
          <button
            type="button"
            className={`model-card all-models-card ${isAllModels ? "active" : ""}`}
            onClick={() => selectModel(ALL_MODELS_ID)}
            aria-pressed={isAllModels}
          >
            <strong>All Models</strong>
            <span>{models.length}</span>
          </button>
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              className={`model-card ${model.id === selectedId ? "active" : ""}`}
              onClick={() => selectModel(model.id)}
              onPointerEnter={() => preloadModel(model)}
              onFocus={() => preloadModel(model)}
              aria-pressed={model.id === selectedId}
            >
              <strong>{model.name}</strong>
            </button>
          ))}
        </nav>

        {manifestError && <p className="error-message">{manifestError}</p>}
      </aside>

      <section className="workspace">
        {selectedModels.length ? (
          <>
            <header className="toolbar">
              <div className="model-heading">
                <h2 data-testid="selected-model-name">
                  {isAllModels ? "All Models" : selectedModel.name}
                </h2>
                <span>
                  {isAllModels
                    ? `${selectedModels.length} models at actual relative scale`
                    : dimensionsText(selectedModel.dimensions)}
                </span>
                <span>Meshes {partCount ?? "-"}</span>
              </div>
              <div className="toolbar-actions">
                <Toggle
                  label="Auto rotate"
                  checked={settings.autoRotate}
                  onChange={(value) => setSettings((current) => ({ ...current, autoRotate: value }))}
                />
                <Toggle
                  label="Grid"
                  checked={settings.grid}
                  onChange={(value) => setSettings((current) => ({ ...current, grid: value }))}
                />
                <Toggle
                  label="Floor"
                  checked={settings.floor}
                  onChange={(value) => setSettings((current) => ({ ...current, floor: value }))}
                />
                {!isAllModels &&
                  ["glb", "step", "stl"].map((format) => (
                    <a
                      key={format}
                      className="download-link"
                      href={selectedModel.files[format]}
                      download
                    >
                      {format.toUpperCase()}
                    </a>
                  ))}
              </div>
            </header>
            {viewerError && <div className="viewer-error">{viewerError}</div>}
            <ModelViewer
              models={selectedModels}
              viewerId={selectedId}
              settings={settings}
              onLoaded={onLoaded}
              onError={onError}
            />
          </>
        ) : (
          <div className="empty-state">{manifestError || "Loading models..."}</div>
        )}
      </section>
    </main>
  );
}

createRoot(document.querySelector("#root")).render(<App />);
