# Krasno-Kamenka Oblast v17.6.1 ONLINE — Off-Road & Abyssal Sandbox

A massive 200 km × 200 km open-world off-road driving, heavy logistics, naval exploration, and vehicular horror sandbox set across the Siberian frontier and surrounding outer-ocean archipelago, featuring zero-dependency WebSocket-over-TLS online multiplayer.

---

## What's New in v17.6.1 ONLINE

### 1. Performance & Engine Architecture
- **Zero-GC Physics & Weather Loops:** Pre-allocated reusable scratch vectors, quaternions, typed arrays, and colors inside the 120 Hz vehicle physics substep (`js/physics.js`), main loop (`js/main.js`), and weather controller (`js/weather.js`).
- **Spatial Hash Acceleration (`js/world.js`):** Road segments and building colliders use 2D spatial hash grids alongside baked per-chunk surface/height metadata for fast vehicle terrain queries.
- **Cached & Dirty-Checked HUD (`js/ui.js`):** All HUD DOM references are cached and guarded with dirty-checking on text, style, attribute, and class writes; sensible device-pixel-ratio caps protect high-DPI laptops.

### 2. Driving Feel & Off-Road Realism (`js/physics.js`)
- **Kamm Friction Circle & Slip-Angle Tires:** Progressive lateral breakaway and combined braking/turning grip via a lightweight Pacejka-style slip curve.
- **Mud Wheelspin & Turbo Spool Model:** Driven wheels spin up naturally in deep mud and steep climbs, allowing RPM to climb into the powerband and turbos to spool when bogged.
- **Keyboard Counter-Steer Assist & Balanced Wear:** Subtle self-aligning drift recovery for keyboard play, fixed overheat part-wear keys (`fuelRails`, `fuelInjectors`, etc.), and gentler normal-cruising wear while keeping abuse damage impactful.

### 3. Foreboding Abyssal Sea Cryptids (`js/ocean_cryptids.js`)
- **Possessed Yamato (Ghost Dreadnought):** Sweeping bridge searchlight, spectral fog shroud, tracking turrets, rising sea dread, and telegraphed 460mm salvos with water-column spouts and shockwaves.
- **El Gran Maja (34m Megalodon):** 4-stage predator loop (**Stalking → Submerging → Breach / Lunge → Retreating**) across open-ocean straits, capable of rolling vessels unless evaded or repelled.
- **The Bloop (120m+ Abyssal Kraken):** Subsurface bioluminescent omen, rotating maelstrom whirlpool that pulls boats inward, and telegraphed 42m tentacle slams.

### 4. Physical Cat 1–5 Ocean Hurricanes & Storm Soundscape (`js/hazards.js`, `js/weather.js`, `js/boats.js`, `js/audio.js`)
- **Volumetric Storm Structure:** Towering rotating eyewall cloud cylinder, open **Calm Eye**, spiral rainbands, sea-spray collar, and internal eyewall lightning flashes.
- **Dynamic Sea & Weather Coupling:** Cyclonic wind drift, rogue wave heaving, wind-tilted rain, and eerie sudden calm inside the eye.
- **Procedural WebAudio Terror:** Layered hurricane roar, sub-bass thalassophobia sea-dread drone, NOAA Bloop sonar sweeps, ghost battleship foghorn, and Megalodon breach impacts.

### 5. Intuitiveness & UX Polish (`index.html`, `css/style.css`, `js/start_menu.js`, `js/ui.js`)
- **1-Click Quick Deploy:** Jump straight into Krasno-Kamenka from the first title screen with **⚡ QUICK DEPLOY**, or use the full Rig + 200 km Archipelago Spawn Map flow right beside it.
- **Cleaner Solo HUD:** Collapsible top-right **🌐 ONLINE / LAN** panel starts compact in Solo mode and auto-expands when hosting or joining a room.
- **Quick Vehicle Systems & Controls Bar:** Clickable bottom-center toggles for Lights `[L]`, 4WD `[V]`, Diffs `[2/3]`, Winch `[T]`, Flip `[U]`, Camera `[C]`, and a toggleable `[?] CONTROLS` cheat-sheet.
- **Sea Threat & Hurricane Barometer Banner:** Dedicated top-center sonar/radar threat alerts, Cat 1–5 hurricane phase & pressure readout (**APPROACHING / EYEWALL / INSIDE THE EYE**), plus 1-click **Cat-5 Hurricane / Megalodon / The Bloop / Yamato** spawn triggers in `[O] OPTIONS → World & Weather`.

---

## Previous Milestones (v16.5 – v17.6)
- **Recessed Wheel Wells & Clean Arches (`js/vehicle_builder.js`):** Clamped inner wheel-well liners across 17 wheeled vehicles and sculpted semicircular GT-R R35 arches.
- **Nautical Helm & Drive-On Barges (`js/boats.js`):** Dedicated vessel helm HUD, coastal port summon pads, Zubr Hovercraft, Serna Barge, Patrol Boat, and Strela-X1 Speedboat.
- **CPM2 Blueprint Garage & Analog Cluster:** Interactive 2D vehicle part blueprint, 5 fictional part brands, dyno tuning, and analog tachometer/speedometer cluster.
- **WSS Online Multiplayer (`js/network.js`):** Zero-dependency room-code multiplayer with shared world state, co-op convoys, rescue winches, and pit-crew field assistance.
