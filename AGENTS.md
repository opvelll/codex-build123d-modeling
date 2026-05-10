# AGENTS.md

## Project Notes

- Use `uv` for Python dependencies and model generation.
- Use `pnpm` for the browser viewer and Playwright checks.
- The generated CAD/viewer assets live in `output/`.
- In `build123d`, transformation helpers such as `translate()` return a transformed shape; assign the result back, e.g. `shape = shape.translate(...)`.
- Before exporting CAD/viewer assets, union modeled parts with `fuse()` and verify the result is a single solid when the requested model should be one body.

## Common Commands

```powershell
uv run python door_model.py
pnpm dev
```

`door_model.py` writes `output/door_model.glb`, `output/door_model.step`, and `output/door_model.stl`. The viewer expects the GLB at `/output/door_model.glb`.
