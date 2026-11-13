# Vaultbreak game assets

This directory is reserved for approved in-game artwork. No generated or third-party artwork is included yet.

- `manifest.json` is the versioned registry entry point.
- Keep source PNGs in subfolders (`characters/`, `enemies/`, `weapons/`, `environment/`, `effects/`, `loot/`).
- Use transparent PNG/RGBA for sprites and sprite sheets.
- Each sprite sheet must use a fixed cell size. Record frame size, frame count, pivot, scale and animation timing in the manifest before wiring it into the renderer.
- Keep collision radii and gameplay dimensions in simulation data; artwork never defines physics.
- Keep the current procedural renderer as a fallback until each asset has passed in-game QA.

See `docs/asset-production-plan.md` for the art direction options, production workflow and acceptance checklist.
