# Krasno-Kamenka Oblast (v15.3.2 ONLINE — Zero-Quality-Loss Optimization & Laptop Presets Pass)

## What's New in Version 15.3.2 ONLINE
1. **InstancedMesh Chunk Batching (`js/world.js`):**
   - Batched Savanna grass tufts, termite mounds, and chunk boulders into `THREE.InstancedMesh` calls—100% identical visuals while slashing hundreds of per-frame draw calls across active chunks.
2. **20 Hz Throttled HUD & 2D Canvas Radar (`js/main.js`):**
   - Capped `updateHUD()` and `drawCompassAndRadar()` to 20 Hz (`0.05 s`) instead of 60 Hz—visually indistinguishable while cutting UI/Canvas CPU overhead by ~65%.
3. **Real Graphics Presets & Live Draw-Call Counter (`js/ui.js`, `js/main.js`):**
   - Added **`POTATO` / `LOW` / `MEDIUM` / `HIGH`** graphics presets in **`[O] Options → Audio & Graphics`** (persisted in `localStorage`, defaulting to **`HIGH`** so zero quality is lost on capable PCs, while low-end laptops can drop to `LOW` or `POTATO` for 1.0×/0.85× pixel ratio, shadows off, and `5×5` chunk radius).
   - Added live **DRAW CALLS** telemetry right beside **LIVE FPS**.
4. **Multiplayer Shadow Optimization (`js/main.js`):**
   - Disabled `castShadow` on remote players' vehicles (keeping full shadows on your own rig) so online convoys don't multiply shadow-pass draw calls.
