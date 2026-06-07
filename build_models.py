from __future__ import annotations

import argparse
import importlib
import json
from pathlib import Path
from typing import Any

from build123d import export_gltf, export_step, export_stl


ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
OUTPUT_DIR = ROOT / "output"


def available_model_ids() -> list[str]:
    return sorted(
        path.parent.name
        for path in MODELS_DIR.glob("*/model.py")
        if path.parent.name.isidentifier()
    )


def load_model_module(model_id: str):
    if model_id not in available_model_ids():
        raise ValueError(f"Unknown model {model_id!r}. Available: {', '.join(available_model_ids())}")

    return importlib.import_module(f"models.{model_id}.model")


def validate_metadata(model_id: str, metadata: Any) -> dict[str, str]:
    if not isinstance(metadata, dict):
        raise TypeError(f"{model_id}: MODEL must be a dictionary")

    required = ("id", "name", "description")
    missing = [key for key in required if not isinstance(metadata.get(key), str) or not metadata[key].strip()]
    if missing:
        raise ValueError(f"{model_id}: MODEL is missing string fields: {', '.join(missing)}")
    if metadata["id"] != model_id:
        raise ValueError(f"{model_id}: MODEL['id'] must match the directory name")
    return {key: metadata[key].strip() for key in required}


def validate_shape(model_id: str, shape) -> None:
    if not hasattr(shape, "solids") or not hasattr(shape, "is_valid"):
        raise TypeError(f"{model_id}: build_model() must return a build123d shape")

    solids = shape.solids()
    if not solids:
        raise ValueError(f"{model_id}: build_model() returned an empty shape")
    if not shape.is_valid:
        raise ValueError(f"{model_id}: generated shape is not valid")
    if any(not solid.is_valid for solid in solids):
        raise ValueError(f"{model_id}: generated assembly contains an invalid solid")


def build_one(model_id: str) -> dict[str, Any]:
    module = load_model_module(model_id)
    metadata = validate_metadata(model_id, getattr(module, "MODEL", None))
    build_model = getattr(module, "build_model", None)
    if not callable(build_model):
        raise TypeError(f"{model_id}: model.py must export build_model()")

    shape = build_model()
    validate_shape(model_id, shape)

    model_output = OUTPUT_DIR / model_id
    model_output.mkdir(parents=True, exist_ok=True)
    glb_path = model_output / f"{model_id}.glb"
    step_path = model_output / f"{model_id}.step"
    stl_path = model_output / f"{model_id}.stl"

    export_gltf(shape, glb_path, binary=True)
    export_step(shape, step_path)
    export_stl(shape, stl_path)

    size = shape.bounding_box().size
    print(f"Built {model_id}: {glb_path.relative_to(ROOT)}, {step_path.relative_to(ROOT)}, {stl_path.relative_to(ROOT)}")
    return {
        **metadata,
        "files": {
            "glb": f"/output/{model_id}/{model_id}.glb",
            "step": f"/output/{model_id}/{model_id}.step",
            "stl": f"/output/{model_id}/{model_id}.stl",
        },
        "dimensions": {
            "x": round(size.X, 3),
            "y": round(size.Y, 3),
            "z": round(size.Z, 3),
            "unit": "mm",
        },
    }


def read_existing_manifest() -> dict[str, dict[str, Any]]:
    manifest_path = OUTPUT_DIR / "models.json"
    if not manifest_path.exists():
        return {}
    with manifest_path.open(encoding="utf-8") as file:
        data = json.load(file)
    return {model["id"]: model for model in data.get("models", [])}


def latest_model_id(models: list[dict[str, Any]]) -> str | None:
    model_ids = {model["id"] for model in models}
    candidates = [
        ((MODELS_DIR / model_id / "model.py").stat().st_mtime_ns, model_id)
        for model_id in model_ids
    ]
    return max(candidates)[1] if candidates else None


def write_manifest(models: list[dict[str, Any]]) -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)
    manifest = {
        "defaultModelId": latest_model_id(models),
        "models": sorted(models, key=lambda model: model["name"].casefold()),
    }
    manifest_path = OUTPUT_DIR / "models.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest_path.relative_to(ROOT)}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build build123d models and update the viewer manifest.")
    selection = parser.add_mutually_exclusive_group(required=True)
    selection.add_argument("model_id", nargs="?", help="Model directory name under models/")
    selection.add_argument("--all", action="store_true", help="Build every discovered model")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    selected = available_model_ids() if args.all else [args.model_id]
    existing = {} if args.all else read_existing_manifest()
    for model_id in selected:
        existing[model_id] = build_one(model_id)
    write_manifest(list(existing.values()))


if __name__ == "__main__":
    main()
