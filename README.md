# Krasno-Kamenka Oblast (v15.1.8 ONLINE — [TAB] Online Players, Friends, Cash Transfer & Thin Fence Hitboxes)

## What's New in Version 15.1.8 ONLINE
1. **`[TAB]` Online Players List, Add Friend & Send Cash (`index.html`, `js/ui.js`, `js/network.js`, `js/main.js`):**
   - Press **`[TAB]`** anytime to toggle the **Online Players** roster showing every connected driver, their vehicle/boat, live distance, and current island/biome.
   - Click **`+ ADD FRIEND`** beside any player to save them to your Friends list (`localStorage`) and notify them live.
   - Send cash directly to any online player using the custom amount box or `$1K` / `$5K` quick buttons (**`$1,000` minimum**).
   - **Photo Mode** (hide HUD) moved cleanly to **`[F8]`** (Screenshots stay on `[F9]` / `[9]`).
2. **Fixed Oversized Fence & Guardrail Hitboxes (`js/world.js`, `js/physics.js`):**
   - Replaced the old `2.35 m` circular fence collision radius (which protruded meters into the road) with an **exact thin Oriented Bounding Box (OBB)** (`0.32 m` thick aligned to each rail's actual heading) against your vehicle's true body width. You can now skim inches past guardrails and ranch fences without clipping invisible air, while still smashing cleanly through them on real contact.
