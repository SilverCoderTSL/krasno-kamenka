# Krasno-Kamenka Oblast (v15.4.3 ONLINE — Effortless Ignition Auto-Lock Ships, Solid Closed-Ramp Collision & Zero-Jitter 3rd-Person Cameras)

## What's New in Version 15.4.3 ONLINE
1. **Effortless Ship Loading & Driving Flow (`js/boats.js`, `js/main.js`, `js/physics.js`):**
   - **Load:** Drive up the lowered ramp onto the ship deck -> turn **OFF ignition (`[I]`)** -> your car **automatically snaps & locks into the nearest free parking bay** with yellow chocks/chains!
   - **Wander & Drive (Anyone Can Drive):** Press **`[F]`** to step out and walk the deck; press **`[SPACE]`** to **enter the Helm** (even on a friend's ship!) and **`[SPACE]`** to **exit the Helm**.
   - **Minimal Helm Controls:** Just **`[WASD]`** (auto-weighs anchor / auto-inflates Zubr cushion!), **`[U]`** to open/close the ramp, **`[L]`/`[K]`** for lights, and **`[C]`** for cameras.
   - **Unload + Solid Closed-Ramp Collision:** Press **`[SPACE]`** to exit helm -> **`[F]`** to get in your car -> turn **ON ignition (`[I]`)** -> your car **automatically unlocks** and you drive straight off! If the ramp (`[U]`) is still **UP**, your car physically **rams into the solid steel ramp** and bounces back!
2. **Zero-Jitter 3rd-Person Cameras Everywhere (`js/main.js`):**
   - Upgraded **Boat**, **On-Foot**, and **Passenger** 3rd-person cameras to the exact same framerate-independent relative-offset smoothing (`1 - Math.exp(-10.5 * dt)`) anchored directly to `focusLocal` as cars.
