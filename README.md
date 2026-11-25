# Krasno-Kamenka Oblast (v15.1.5 ONLINE — Multiplayer Chaos & World Sync Update)

## What's Synced in Version 15.1.5 ONLINE
1. **James May's Pub Chaos & Molotovs (`js/james_may_bar.js`, `js/network.js`, `js/main.js`):**
   - Stealing the parked Dacia Sandero, angry James May hurling flaming Molotov cocktails, burning fire pools, and catastrophic fuel-tank explosions now broadcast to all players in the lobby!
2. **Jeremy Clarkson's 3.2× Rage, Yeet & 14 Sheep (`js/clarkson_farm.js`, `js/network.js`, `js/main.js`):**
   - All 14 grazing sheep use deterministic epoch-time grazing (100% synced positions with zero bandwidth!).
   - Running over a sheep triggers colossal red-eyed Clarkson for **everyone**—friends watch giant Jeremy sprint after the culprit and yeet them 400 m into orbit, and borrowing the Lamborghini Tractor hides it for the whole server.
3. **Multiplayer Skinwalker & Co-Op Rescue (`js/skinwalker.js`, `js/network.js`, `js/main.js`):**
   - Active Skinwalkers sync to nearby peers (`skinwalker_sync`), so friends watch the pale-eyed stag stalk out of the Taiga and latch onto your driver window—and can **shoot it or toss a road flare to repel it and save you**!
4. **Remote Players' Thick 3D Winch Cables (`js/ai_entities.js`, `js/main.js`):**
   - Hooked `onRemoteWinch` & snapshot replay so everyone sees every player's glowing 3D yellow-orange winch rope and anchor hook during co-op recoveries.
5. **Synced Ocean Boats & Zubr Hovercraft (`js/boats.js`, `js/network.js`, `js/main.js`):**
   - Active boat state (`id`, position, yaw, speed) rides along in `player_state` so friends see your Zubr hovercraft (with spinning propulsor fans), Serna barge, Patrol boat, or Strela-X1 speedboat carving waves across the archipelago!
6. **Epoch-Synced Zolotoy City Tram, Traffic & Pedestrians (`js/world.js`):**
   - Zolotoy City's electric tram, 12 NPC traffic cars, and 28 sidewalk pedestrians now run on synchronized epoch time (`Date.now() * 0.001`)—identical positions across all clients for zero network cost.
7. **Remote Horn Cryptid Spook (`js/cryptids.js`):**
   - Fixed remote players' `hornActive` flag so a comrade blasting their horn (or the 140A4 Dreadnought War-Horn) genuinely attracts or spooks cryptids for the whole lobby!
