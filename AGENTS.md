# AGENTS.md

## Project Purpose

This repository is a template for asking Codex to create build123d models. Model source code is a first-class deliverable. The shared builder exports browser and CAD assets, and the React viewer discovers them through `output/models.json`.

## Model Contract

- Put each model in `models/<model-id>/model.py`. Use a lowercase Python identifier for `<model-id>`.
- Export a `MODEL` dictionary with non-empty `id`, `name`, and `description` strings. `id` must equal the directory name.
- Export a zero-argument `build_model()` function that returns one valid build123d solid.
- Use millimeters for all dimensions. Model close to the origin with the vertical direction on the Z axis.
- Assign transformation results back to the shape, for example `shape = shape.translate(...)`.
- Model intentionally low-poly round parts with `RegularPolygon(..., side_count=12)` and `extrude()`.
- Join all parts with `fuse()` and `clean()`. The shared builder rejects empty, invalid, or multi-solid results.
- Do not export files from individual model modules. `build_models.py` owns GLB, STEP, STL, and manifest generation.
- Keep generated sample assets in Git so the viewer works immediately after cloning.

## Common Commands

```powershell
uv sync
uv run python build_models.py chair
uv run python build_models.py --all
pnpm install
pnpm dev
pnpm build
pnpm test
```

Generated files live in `output/<model-id>/`. The viewer reads `output/models.json`.
