# AGENTS.md

## Project Notes

- Use `uv` for Python dependencies and model generation.
- Use `pnpm` for the browser viewer and Playwright checks.
- The generated CAD/viewer assets live in `output/`.

## Common Commands

```powershell
uv run python door_model.py
pnpm dev
pnpm test
```

`door_model.py` writes `output/door_model.glb`, `output/door_model.step`, and `output/door_model.stl`. The viewer expects the GLB at `/output/door_model.glb`.
