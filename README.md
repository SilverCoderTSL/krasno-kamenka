# Krasno-Kamenka Oblast (v15.4.1 ONLINE — All Land Entities Ocean-Locked, Minecraft-Style Sea Life & On-Screen Deck Controls)

## What's New in Version 15.4.1 ONLINE
1. **ALL Land Cryptids & Land Animals Strictly Ocean-Locked (`js/cryptids.js`, `js/ai_entities.js`):**
   - Extended the hard dry-mainland failsafe to **Godzilla**, **Abominable Snowman**, **Sandwyrm**, **Volcanic T-Rex**, **Siren Head**, and **Forest Yeti**—zero land cryptids can ever enter or cross the sea.
   - Locked **Deer**, **Mountain Goats**, **Desert Camels**, and all island wildlife strictly to dry inland on both spawns/relocates and movement.
2. **Minecraft-Style Ocean Sea Life (`js/ai_entities.js`, `js/main.js`):**
   - Populated the oceans with **8 distinct marine species** (strictly ocean-only, zero extra dynamic lights): **Cod**, **Salmon**, **6 Vibrant Tropical Reef Fish**, **Inflating Pufferfish** (puffs up into a spiky ball when boats get close!), **Leaping Dolphin Pods**, **Gliding Sea Turtles**, **Manta Rays**, and **Deep-Sea Squid**.
3. **Clickable On-Screen Boat Deck Action Bar (`index.html`, `css/style.css`, `js/main.js`):**
   - Removed conflicting `[R]` / `[V]` keyboard overrides on ship decks and replaced them with a clean on-screen button bar (`#boat-deck-bar`) for **🔒 LOCK & STRAP CAR TO DECK**, **🔓 RELEASE CAR**, **🚶 STEP OUT TO DECK**, **⚓ TAKE THE HELM**, **🔒 LOCK/UNLOCK DECK & RAMP**, and **⚓ DROP/WEIGH ANCHOR**.
