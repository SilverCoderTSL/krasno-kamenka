# Krasno-Kamenka Oblast (v15.2 ONLINE — Naval & Multi-Crew Deck Overhaul + 60 FPS Ocean & Zero-Lag Trailers)

## What's New in Version 15.2 ONLINE
1. **Realistic Full-Scale Ships & Multi-Vehicle Deck Bays (`js/config.js`, `js/boats.js`):**
   - **Projekt 12322 "Zubr" LCAC Hovercraft (`52 m × 22 m`):** Colossal amphibious assault hovercraft with a `13.4 m × 36 m` steel well-deck, **150-ton payload budget**, **6 painted tie-down bays** (`2 lanes × 3 rows` — carries multiple MBTs and 4x4s simultaneously!), walkable side sponsons, articulating hydraulic bow ramp, 3 massive `5.2 m` rear propulsor ducts, and a compressible air-cushion skirt!
   - **Projekt 11770 "Serna" Tank Landing Barge (`28 m × 9.2 m`):** **75-ton** landing craft with walkable catwalks, articulating bow ramp, and 2 bays (or 1 centered MBT well).
   - **Krasnaya Utility Patrol Boat (`14.8 m × 5.0 m`):** **4.5-ton** stern bay for 1 light 4x4 + walkable rails.
   - **Strela-X1 Offshore Speedboat (`9.4 m × 2.5 m`):** Blistering `155 km/h` solo 1-person hydroplane.
2. **Shipmaster Deck Lock `[U]`, Anchor `[SPACE]` & Walkable Moving Decks (`js/boats.js`, `js/main.js`):**
   - **`[U]` Shipmaster Deck Lock:** Locks all mounted vehicles with visual yellow tie-down chains & raises the hydraulic bow ramp. Unlocking over deep water (`> 3 m`) triggers a **4-second double-tap safety warning**.
   - **`[SPACE]` Anchor / Air-Cushion Dump:** Drops anchor on conventional vessels or visibly deflates the Zubr's rubber skirt so it rests dead still for loading.
   - **Walkable Moving Decks & Live Turrets:** Press `[E]` at the helm (or `[F]` inside a mounted vehicle) to walk freely around the moving deck in boat-local coordinates—or stay inside a chained tank/Komodo on deck to aim & fire turrets live during ocean crossings!
3. **Maritime Lighting, Dedicated Marine Audio & Nautical Helm HUD (`js/boats.js`, `js/audio.js`, `js/ui.js`, `index.html`, `css/style.css`):**
   - **`[L]` Navigation Lights** (Port Red / Starboard Green / White Masthead & Stern) & **`[K]` Bridge Searchlight** (`THREE.SpotLight` + volumetric beam), both synced to remote ships.
   - **Dedicated Marine Audio:** Procedural Zubr gas-turbine + fan roar, Serna marine diesel, Strela/Patrol outboard scream, **`[N]` Naval Foghorn**, anchor clank, and ramp hydraulics—while completely muting your parked car.
   - **Clean Nautical Helm HUD (`#hud-helm`):** Completely replaces `#hud-dash` when piloting a boat (Knots + km/h, Heading, Telegraph, Fathometer Depth, Payload/Lock, Anchor & Light badges, plus boat-centered Compass/Radar).
4. **Zero Hydrolock, 60 FPS Ocean & Zero-Lag Trailers (`js/world.js`, `js/main.js`, `js/network.js`):**
   - Completely bypasses `vehicle.step()` while mounted on a boat or carried on a trailer (zero hydrolock, zero underwater tint, zero physics fighting).
   - Skips heavy terrain/foliage generation on pure deep-ocean chunks (`_isPureDeepOceanChunk`) for flat 60 FPS even at `155 km/h`.
   - Local 60 FPS parent-locking + velocity dead-reckoning for trailer-carried & boat-mounted peer cars (zero `60+ km/h` rubber-banding!) + `cash_ack` auto-refund protection for `[TAB]` cash transfers.
