# Krasno-Kamenka Oblast (v15.1.1 ONLINE — True Shoreline Ports, Coastal Roads & Full-Island Spread)

## What's New in Version 15.1.1 ONLINE
1. **True Shoreline Ocean Ports (`js/world.js`, `js/config.js`):**
   - Added `_snapPortsToRealShorelines()` which raymarches from each island's center to the exact `SEA_LEVEL` crossing so all **9 Ocean Ports** sit right on the real ocean shoreline facing open water—zero buried inland piers!
   - Smoothly grades a driveable beach approach behind every port and snaps outer-island port towns right behind their harbors.
2. **Coastal Port Spur Roads & Full-Island Town Spread (`js/config.js`, `js/world.js`):**
   - Spread outer-island suburbs/villages out to `~68–80%` of each island's radius so roads sweep across the entire island instead of huddling in the center.
   - Added automatic **coastal spur roads** linking all 4 Mainland ports and all 5 outer-island ports straight into the highway network.
3. **Visible & Spawnable Ports on Both Maps (`js/map_ui.js`, `js/start_menu.js`):**
   - All 9 Ocean Ports now appear as bright cyan **`⚓`** icons on both the **`[M]` GPS Map** (with tooltips & clickable GPS waypoints) and the **Intro Spawn Map** (click any `⚓` port to deploy straight to the pier and summon boats immediately!).
4. **Outer-Ring Island Landmarks (`js/world.js`):**
   - Populated outer island rings with spinning Savanna wind turbines, Tropika coastal fishing shacks/warungs, Arctic polar watchtowers, and Site-140 radiation warning pylons.
