# Krasno-Kamenka Oblast (v15.1 ONLINE — Naval Update: Boats, Zubr Hovercraft, Toggle Scope & Winch Overhaul)

## What's New in Version 15.1 ONLINE
1. **Toggle Right-Click Aim/Scope (`js/main.js`):**
   - Right-click **once** to enter gunner scope/aim mode, and right-click **again** (or press `Esc`) to exit—no more holding RMB!
2. **Overhauled Visible & Smart-Recovery Winch (`js/main.js`, `js/physics.js`, `js/ai_entities.js`, `js/network.js`):**
   - Fixed the missing `updateWinchLine()` loop call so your **thick glowing 3D winch cable & anchor hook** are now 100% visible every frame!
   - **Smart Comrade Rescue Logic:** When winched to a **tree/rock/ground**, holding `[T]` pulls *your* vehicle toward the anchor. When winched to a **comrade**, holding `[T]` now sends a `winch_pull` rescue force that **pulls your comrade toward YOU** while auto-bracing your wheels (hold `[Space]` for 100% brake anchor) instead of dragging you into the river!
3. **4 Unlockable Ocean Boats & Port Summoning (`js/boats.js`, `js/config.js`, `js/ui.js`, `js/main.js`):**
   - Drive or walk to any of the **9 Ocean Ports**, find the glowing cyan **Boat Summon Pad**, and press **`[F]`** to open the **Harbor Boat Dock**.
   - Summoned boats launch floating in the water beside the pier **without deleting your vehicle**!
   - **Projekt 12322 "Zubr" LCAC Hovercraft ($165,000):** Amphibious assault hovercraft (`105 km/h`) with 3 spinning propulsor ducts—glides over ocean waves AND coastal beaches while carrying **ANY vehicle including the 68-ton PzKpfw 140A4 & T-72B**!
   - **Projekt 11770 "Serna" Tank Landing Barge ($68,000):** Heavy steel landing craft (`68 km/h`) carrying **any truck or tank up to 75 tons**.
   - **Krasnaya Utility Patrol Boat ($24,000):** Fast 4-seat harbor craft (`92 km/h`) that mounts **1 light 4x4 (`<= 3.6t`)** on the stern deck.
   - **Strela-X1 Offshore Speedboat ($38,000):** Blistering **`155 km/h`** hydroplane racing boat (**strictly 1 person only, no vehicles**).
   - **Controls:** `[F]` at Port Pad to summon / `[F]` near boat to board / `[W/S]` throttle / `[A/D]` rudder / `[Shift]` boost / `[V]` Load or Unload your vehicle on deck / `[E]` disembark.
