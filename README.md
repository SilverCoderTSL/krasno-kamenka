# Krasno-Kamenka Oblast (v15.3.3 ONLINE — InstancedMesh Trees & Fences Draw-Call Pass)

## What's New in Version 15.3.3 ONLINE
1. **InstancedMesh Chunk Trees (`js/world.js`):**
   - Batched all chunk trees across every biome (Siberian Taiga pines, snow pines, tropical palms, Savanna acacias, Arctic glacier spires, desert cacti, and dead volcanic/radioactive trunks) into per-chunk `THREE.InstancedMesh` batches—100% identical visuals and smash/falling-tree physics while eliminating hundreds of draw calls!
2. **InstancedMesh Roadside Fences & Guardrails (`js/world.js`):**
   - Batched all wooden ranch fence posts/rails and metal highway guardrails into `THREE.InstancedMesh` batches—smashing through a panel hides its instanced parts and launches the debris flying identically.
3. **UI Label Fix (`js/ui.js`):**
   - Updated the Photo Mode button label in `[O] Options → Audio & Graphics` from `[Tab]` to `[F8]`.
