# Krasno-Kamenka Oblast (v16.5 ONLINE — Fleet-Wide Recessed Wheel Wells, Clamped Inner Liners & Clean GT-R R35 Arches)

## What's New in Version 16.5 ONLINE (`js/vehicle_builder.js`)
1. **Clamped Inner Wheel-Well Liners (Zero Boot/Cabin Intrusion):**
   - Clamped `_addWheelWellLiners()` strictly inside `maxTopY` (`rArch - 0.018`) and tightened liner depth (`<= 0.27 m`) + shock strut height so no wheel-well plane or bulkhead ever pokes into the rear boot or cargo floor.
2. **Clean GT-R R35 Semicircular Arches:**
   - Removed the triangular faceted widebody haunch overhang on `gtr_r35` and widened the extruded body (`w - 0.05`) with sculpted upper shoulder creases strictly above the wheel arches so both front and rear arches are smooth semicircles.
3. **Fleet-Wide Recessed Wheel Wells (17 Wheeled Vehicles):**
   - Rolled out `_traceBottomWithWheelArches()`, `_addWheelWellLiners()`, and arch-aligned `_addFenderFlares()` across all 17 extruded wheeled chassis: `wrx`, `fortuner`, `gtr_r35`, `uaz452`, `hilux`, `evo`, `rangerover`, `lc79`, `delica`, `jimny`, `humvee`, `patrol_y61`, `btr80`, `dacia_sandero`, `jeep_wrangler`, `mega_cruiser`, and `toyota_coaster`.
