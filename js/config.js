// ============================================================================
// js/config.js — KRASNO-KAMENKA OBLAST (v6):
// 9 Cars, 11 Distinct-Sound Engines, 5 Brands, 7 Landmarks & Cryptid Zones
// ============================================================================
window.KK = window.KK || {};
KK.VERSION = "v15.3";
KK.VERSION_FULL = "v15.3 ONLINE";

KK.WORLD_SIZE = 200000;
KK.HALF_WORLD = 100000;
KK.SEA_LEVEL = -32.0;

// 6-ISLAND 200x200 KM ARCHIPELAGO (Island 1 = Original Mainland, 3 Medium Biome Isles, 2 Small Isles!)
KK.ISLANDS = [
  { id: 0, name: "Krasno-Kamenka Mainland", cx:      0, cz:      0, rx: 48500, rz: 46500, biome: "mainland",      peakH: 0,   labelColor: "#e6f0f8" },
  { id: 1, name: "Ostrov Tropika",          cx:  69000, cz:  62000, rx: 16500, rz: 14500, biome: "tropical",      peakH: 155, labelColor: "#2de08b" },
  { id: 2, name: "Zolotoy Savanna",         cx: -68000, cz:  61000, rx: 17500, rz: 15000, biome: "savanna",       peakH: 95,  labelColor: "#ffd166" },
  { id: 3, name: "Severnyy Proving Ground", cx: -65000, cz: -67000, rx: 16500, rz: 15000, biome: "arctic",        peakH: 220, labelColor: "#8ecae6" },
  { id: 4, name: "Coral Smuggler's Cay",    cx:  77000, cz:  -6000, rx:  4800, rz:  4200, biome: "tropical",      peakH: 38,  labelColor: "#48cae4" },
  { id: 5, name: "Site-140 Black Rock",     cx:  68000, cz: -68000, rx:  4400, rz:  4100, biome: "radioactive",   peakH: 62,  labelColor: "#b8ff3b" }
];

KK.AIRSTRIPS = [
  { id: "hq_strip",       name: "Kamenka Mainland Airstrip",  x:   1950, z:  -1150, len: 520, width: 28, yaw: 0.0,  surface: "asphalt" },
  { id: "tropika_strip",  name: "Tropika Jungle Airstrip",    x:  69800, z:  62400, len: 460, width: 26, yaw: 0.25, surface: "gravel"  },
  { id: "savanna_strip",  name: "Zolotoy Savanna Runway",     x: -67100, z:  61300, len: 520, width: 28, yaw: -0.2, surface: "gravel"  },
  { id: "arctic_strip",   name: "Severnyy Ice Runway",        x: -64100, z: -66600, len: 560, width: 30, yaw: 0.1,  surface: "asphalt" },
  { id: "cay_strip",      name: "Coral Cay Bush Strip",       x:  77450, z:  -5900, len: 340, width: 22, yaw: 0.4,  surface: "gravel"  }
];

// Ostrov Tropika (Indonesia-style) Twin Volcanoes: 1 Active Smoking Cone + 1 Dormant Crater Lake!
KK.TROPIKA_VOLCANOES = [
  { id: "gunung_api",   name: "Gunung Api (Active Volcano)",    x: 72600, z: 59000, radius: 3400, peakH: 340, active: true  },
  { id: "gunung_danau", name: "Gunung Danau (Crater Lake)",     x: 66200, z: 65200, radius: 3100, peakH: 270, active: false, lakeRad: 760 }
];

// Zolotoy City Massive 6x6 Grid Metropolis + Working Animated Electric Tram Loop!
KK.ZOLOTOY_CITY = {
  cx: -68000, cz: 61000,
  halfSpan: 420,    // 840m x 840m dense urban grid!
  blockPitch: 120,  // 7 avenues x 7 cross-streets = 36 city blocks
  roadWidth: 14.0,  // Wide smooth multi-lane asphalt avenues
  tramRadius: 240   // Working electric tram runs a 480m x 480m square loop along the main boulevard!
};

// 9 OCEAN PORTS (Auto-snapped to exact ocean shoreline at boot + connected by coastal spur roads!)
KK.PORTS = [
  { id: "port_main_e",   name: "Vostochny Mainland Port",    x:  44500, z:   2800, dirAng:  0.08, islandId: 0, nearTownId: 4,  portTownId: null },
  { id: "port_main_w",   name: "Zapadny Mainland Port",      x: -44200, z:   3200, dirAng:  3.06, islandId: 0, nearTownId: 9,  portTownId: null },
  { id: "port_main_s",   name: "Yuzhny Desert Harbor",       x:   2400, z:  42600, dirAng:  1.52, islandId: 0, nearTownId: 3,  portTownId: null },
  { id: "port_main_n",   name: "Severny Coastal Dock",       x:  -3200, z: -42400, dirAng: -1.65, islandId: 0, nearTownId: 6,  portTownId: null },
  { id: "port_tropika",  name: "Palma Bay Port (Tropika)",   x:  58200, z:  52800, dirAng: -2.42, islandId: 1, nearTownId: 10, portTownId: 10   },
  { id: "port_savanna",  name: "Savanna Marina Port",        x: -55800, z:  70400, dirAng:  0.65, islandId: 2, nearTownId: 19, portTownId: 19   },
  { id: "port_arctic",   name: "Borey Icebreaker Port",      x: -52400, z: -58200, dirAng:  0.62, islandId: 3, nearTownId: 12, portTownId: 12   },
  { id: "port_cay",      name: "Coral Cay Smuggler Pier",    x:  72800, z:  -5600, dirAng:  3.05, islandId: 4, nearTownId: 13, portTownId: 13   },
  { id: "port_site140",  name: "Site-140 Quarantine Pier",   x:  64800, z: -65200, dirAng:  2.42, islandId: 5, nearTownId: 14, portTownId: 14   }
];

// v15.2 REALISTIC FULL-SCALE OCEAN VESSELS, MULTI-VEHICLE DECK BAYS & PAYLOAD BUDGETS!
KK.BOATS = {
  patrol: {
    id: "patrol", name: "Krasnaya Utility Patrol Boat", price: 24000,
    topSpeedKmh: 94, accelMs2: 12.5, len: 14.8, width: 5.0, seats: 6,
    maxPayloadKg: 4500, maxCarMassKg: 4500,
    amphibious: false, deckY: 1.48, deckZ: -2.6,
    walkBounds: { minX: -2.0, maxX: 2.0, minZ: -6.4, maxZ: 4.8 },
    helmLocal: { x: 0, y: 2.1, z: 3.0 },
    bays: [{ x: 0, z: -2.6, label: "Stern Bay" }],
    desc: "14.8m × 5.0m twin-outboard harbor patrol craft. Seats 6, walkable rails & mounts 1 light 4x4 (up to 4.5t) on the aft deck!"
  },
  strela: {
    id: "strela", name: "Strela-X1 Offshore Speedboat", price: 38000,
    topSpeedKmh: 155, accelMs2: 22.0, len: 9.4, width: 2.5, seats: 1,
    maxPayloadKg: 0, maxCarMassKg: 0,
    amphibious: false, deckY: 1.0, deckZ: 0,
    walkBounds: null,
    helmLocal: { x: 0, y: 1.1, z: -0.4 },
    bays: [],
    desc: "9.4m × 2.5m blistering 155 km/h hydroplane racing speedboat! Strictly 1 person only (NO vehicles) — fastest crossing on the map."
  },
  serna: {
    id: "serna", name: "Projekt 11770 'Serna' Tank Landing Barge", price: 68000,
    topSpeedKmh: 68, accelMs2: 7.5, len: 28.0, width: 9.2, seats: 8,
    maxPayloadKg: 75000, maxCarMassKg: 75000,
    amphibious: false, deckY: 1.95, deckZ: 1.2,
    walkBounds: { minX: -4.0, maxX: 4.0, minZ: -11.5, maxZ: 12.5 },
    helmLocal: { x: 0, y: 3.4, z: -9.8 },
    bays: [
      { x: 0, z: 6.2, label: "Fwd Bay" },
      { x: 0, z: -3.4, label: "Aft Bay" }
    ],
    centerHeavyBay: { x: 0, z: 1.4, label: "Main Tank Well" },
    desc: "28m × 9.2m heavy steel landing craft with hydraulic bow ramp & walkable catwalks. Carries 1 MBT (up to 75t) OR 2 cars nose-to-tail!"
  },
  zubr: {
    id: "zubr", name: "Projekt 12322 'Zubr' LCAC Hovercraft", price: 165000,
    topSpeedKmh: 105, accelMs2: 11.8, len: 52.0, width: 22.0, seats: 12,
    maxPayloadKg: 150000, maxCarMassKg: 150000,
    amphibious: true, deckY: 3.10, deckZ: 0.0,
    walkBounds: { minX: -9.2, maxX: 9.2, minZ: -18.5, maxZ: 21.5 },
    helmLocal: { x: 7.5, y: 6.0, z: 7.5 },
    bays: [
      { x: -3.4, z:  11.0, label: "Port Fwd" },
      { x:  3.4, z:  11.0, label: "Stbd Fwd" },
      { x: -3.4, z:   0.0, label: "Port Mid" },
      { x:  3.4, z:   0.0, label: "Stbd Mid" },
      { x: -3.4, z: -11.0, label: "Port Aft" },
      { x:  3.4, z: -11.0, label: "Stbd Aft" }
    ],
    desc: "Colossal 52m × 22m amphibious Soviet assault hovercraft! 150-TON / 6-BAY deck carries multiple MBTs & 4x4s, glides over waves & beaches!"
  }
};
KK.CHUNK_SIZE = 180;
KK.CHUNK_SEGMENTS = 45;      // Exact 4.0m crisp vertex spacing (180 / 45 = 4m)
KK.CHUNK_RADIUS = 3;

KK.TOWNS = [
  { id: 0, name: "Kamenka-Central HQ", survivability: "HIGH", survScore: 92, survColor: "#2de08b", survNote: "Fortified valley HQ • Low threat • Full garage & fuel", biome: "rust_basin", x: 0, z: 0, hasGarage: true, hasDock: true, desc: "Crumbling Soviet depot. Devil's Bridge 440m East, Stunt Ramp 950m NE, Desert Dunes SE!" },
  { id: 1, name: "Kamenka Outpost East", survivability: "MODERATE", survScore: 70, survColor: "#ffd166", survNote: "Taiga edge • Occasional Yeti & deer herds • Quick bridge run", biome: "taiga", x: 1350, z: 180, hasGarage: true, hasDock: true, desc: "Quick starter haul across Devil's Plank Bridge. Watch out for the Forest Yeti just beyond!" },
  { id: 2, name: "Rzhavsk Flooded Depot", survivability: "MODERATE", survScore: 64, survColor: "#ffd166", survNote: "Flooded river crossings & deep mud • Snorkel advised", biome: "rust_basin", x: -11800, z: 14200, hasGarage: true, hasDock: true, desc: "Rust Basin lowlands. Deep river crossings — bring a Snorkel or a friend's winch." },
  { id: 3, name: "Gorge Oasis Crossing", survivability: "LOW", survScore: 38, survColor: "#ff9f1c", survNote: "Deep Red Sands Desert • Active subterranean Sandwyrm tremors", biome: "desert", x: 6200, z: 25800, hasGarage: true, hasDock: true, desc: "Red Sands Desert canyon hub. Kill your engine [I] if the Sandworm starts vibrating the dunes!" },
  { id: 4, name: "Cherny Les Logging Camp", survivability: "LOW", survScore: 32, survColor: "#ff9f1c", survNote: "Dense Black Timber Taiga • Siren Head broadcast & Yeti territory", biome: "taiga", x: 24500, z: 3800, hasGarage: true, hasDock: true, desc: "Deep Black Timber mud bogs, deer herds & prowling Forest Yetis." },
  { id: 5, name: "Klyuchi Weather Station", survivability: "EXTREME", survScore: 18, survColor: "#ff3b5c", survNote: "High snowy alpine peaks • Avalanches, Snowman & Kaiju radiation", biome: "mountains", x: -22000, z: -24500, hasGarage: true, hasDock: true, desc: "Razorback Switchbacks alpine peak. Sheer cliffs & Abominable Snowman territory!" },
  { id: 6, name: "Severny Iron Quarry", survivability: "EXTREME", survScore: 22, survColor: "#ff3b5c", survNote: "High northern peaks • Rockfalls, icy grades & Kaiju territory", biome: "mountains", x: 18200, z: -31500, hasGarage: true, hasDock: true, desc: "Brutal mountain grades, snowy ridges & massive industrial payouts." },
  { id: 7, name: "Volchya Far-East Outpost", survivability: "LOW", survScore: 34, survColor: "#ff9f1c", survNote: "Remote far-east taiga frontier • Long haul back to HQ", biome: "taiga", x: 41200, z: -17600, hasGarage: true, hasDock: true, desc: "End-of-the-line 45km taiga expedition. Maximum cash, zero mercy." },
  { id: 8, name: "Buran Desert Radar", survivability: "LOW", survScore: 30, survColor: "#ff9f1c", survNote: "Remote southwest Red Sands canyon • Heavy Sandwyrm hunting grounds", biome: "desert", x: -38800, z: 34200, hasGarage: true, hasDock: true, desc: "Remote southwest Red Sands canyon station across rotten bridges." },
  { id: 9, name: "Vulkan Geothermal Base", survivability: "EXTREME", survScore: 15, survColor: "#ff3b5c", survNote: "Active volcanic caldera • Lava bombs & 131 km/h Vulkan T-Rex", biome: "volcanic", x: -3600, z: 1100, hasGarage: true, hasDock: true, desc: "Obsidian badlands outpost at the foot of smoking Mt. Vulkan! Watch for the T-Rex — freeze motionless if it sees you!" },
  // --- STRICTLY ORDERED IDs 10..21 (KK.TOWNS[i].id === i ALWAYS!) ---
  { id: 10, name: "Palma Bay Port (Tropika)", survivability: "MODERATE", survScore: 74, survColor: "#2de08b", survNote: "Indonesian-style coastal harbor • Narrow mud switchbacks ahead", biome: "tropical", x: 64200, z: 56500, hasGarage: true, hasDock: true, isIsland: true, desc: "Busy tropical fishing harbor & coastal port. Bring a light 4x4 — the mountain roads inland are brutal!" },
  { id: 11, name: "Zolotoy City (Metro Center)", survivability: "HIGH", survScore: 95, survColor: "#ffd166", survNote: "Massive modernized grid metropolis • Working tram, NPC traffic & wide avenues", biome: "savanna", x: -68000, z: 61000, hasGarage: true, hasDock: true, isIsland: true, isMetro: true, desc: "The crown jewel of the archipelago: 6x6 grid skyline, working city tram, NPC traffic, international runway & smooth 250+ km/h highways!" },
  { id: 12, name: "Borey Icebreaker Port", survivability: "LOW", survScore: 42, survColor: "#8ecae6", survNote: "Frozen polar naval dock • Slippery sea-ice flats — tracks dominate", biome: "arctic", x: -58500, z: -63500, hasGarage: true, hasDock: true, isIsland: true, desc: "Rusted Soviet icebreaker harbor & heated depot on the edge of the Arctic proving ground." },
  { id: 13, name: "Coral Cay Smuggler Pier", survivability: "HIGH", survScore: 84, survColor: "#48cae4", survNote: "Small Eastern Tropical Atoll • Turquoise lagoon, pier & bush strip", biome: "tropical", x: 77000, z: -6000, hasGarage: true, hasDock: true, isIsland: true, desc: "Tiny sun-drenched coral atoll in the eastern sea. Palm grove, upgraded boat pier & dirt smuggler strip." },
  { id: 14, name: "Site-140 Exclusion Zone", survivability: "EXTREME", survScore: 10, survColor: "#b8ff3b", survNote: "RADIOACTIVE WASTELAND • Reactor Sarcophagus • Geiger alerts & EMP wear", biome: "radioactive", x: 68000, z: -68000, hasGarage: true, hasDock: true, isIsland: true, desc: "Quarantined sea-fortress & crumbling Reactor Sarcophagus. Intense radiation — EMP-shielded tanks advised. Something worse than Godzilla sleeps beneath..." },
  { id: 15, name: "Desa Kabut (Highland Village)", survivability: "MODERATE", survScore: 62, survColor: "#2de08b", survNote: "Large Indonesian terraced village between twin volcanoes", biome: "tropical", x: 69200, z: 62200, hasGarage: true, hasDock: true, isIsland: true, desc: "Bustling highland village packed with stilt houses, warung stalls & tight winding switchbacks between Gunung Api & Gunung Danau." },
  { id: 16, name: "Danau Merah (Crater Lake)", survivability: "LOW", survScore: 48, survColor: "#ff9f1c", survNote: "Volcanic crater lake village & dirt jungle airstrip", biome: "tropical", x: 78600, z: 69400, hasGarage: true, hasDock: true, isIsland: true, desc: "Misty highland village overlooking the volcanic crater lake. Iffy bridges & narrow hairpins — heavy trucks beware!" },
  { id: 17, name: "Solnechny Heights (Suburb)", survivability: "HIGH", survScore: 90, survColor: "#ffd166", survNote: "Modern elevated mesa suburb overlooking the golden savanna", biome: "savanna", x: -57200, z: 53400, hasGarage: true, hasDock: true, isIsland: true, desc: "Clean suburban avenue perched on a golden mesa overlooking Zolotoy City." },
  { id: 18, name: "Steppe Logistics Park", survivability: "HIGH", survScore: 88, survColor: "#ffd166", survNote: "Modern refinery & heavy freight suburb • Concrete viaducts", biome: "savanna", x: -79600, z: 56200, hasGarage: true, hasDock: true, isIsland: true, desc: "High-capacity industrial park built for heavy KamAZ & MAZ-537 highway freight." },
  { id: 19, name: "Savanna Marina Port", survivability: "HIGH", survScore: 92, survColor: "#ffd166", survNote: "Modern waterfront suburb & deep-water container port", biome: "savanna", x: -64800, z: 67200, hasGarage: true, hasDock: true, isIsland: true, desc: "Sleek coastal marina suburb with paved boat ramps and highway access to Zolotoy City." },
  { id: 20, name: "Poligon-9 Gunnery Range", survivability: "LOW", survScore: 34, survColor: "#8ecae6", survNote: "Frozen tank proving ground • Target hulks & heavy ice runway", biome: "arctic", x: -65200, z: -67200, hasGarage: true, hasDock: true, isIsland: true, desc: "Wide open arctic weapons testing range with target tank hulks, concrete blast walls & ice runway." },
  { id: 21, name: "Kholodnyy Radar Peak", survivability: "EXTREME", survScore: 22, survColor: "#ff3b5c", survNote: "Bitter high-altitude whiteout station • Severe cold soak", biome: "arctic", x: -74600, z: -74800, hasGarage: true, hasDock: true, isIsland: true, desc: "Frozen summit radar station. Keep your engine running — sub-zero winds rapidly chill coolant!" }
];

KK.ROAD_LINKS = [
  [0, 1], [0, 2], [0, 3], [0, 5],
  [1, 4], [1, 6], [2, 3], [2, 8],
  [3, 4], [3, 8], [4, 6], [4, 7],
  [5, 6], [6, 7],
  [0, 9], [2, 9], [5, 9],
  // Ostrov Tropika (Indonesian Winding Nürburgring-Hell Mountain Loop!)
  [10, 15], [15, 16], [10, 16],
  // Zolotoy Savanna (Modernized Pristine Highway Network!)
  [11, 17], [11, 18], [11, 19], [17, 19], [18, 19],
  // Severnyy Proving Ground (Arctic Polar Military Roads!)
  [12, 20], [20, 21], [12, 21]
];

// ============================================================================
// 4 DISTINCT BRIDGE ARCHITECTURES + SEEDED RNG STRENGTH VARIATIONS
// ============================================================================
KK.BRIDGE_TYPES = {
  concrete: {
    id: "concrete",
    label: "Reinforced Concrete Viaduct",
    surface: "asphalt",
    breakable: false,
    sagMult: 0.08,
    baseMassMult: 1.0,
    desc: "Heavy Soviet steel-reinforced concrete slab bridge. Rock-solid even under loaded MAZ-537 & KamAZ convoys!"
  },
  steel_truss: {
    id: "steel_truss",
    label: "Well-Made Steel Truss",
    surface: "wood",
    breakable: true,
    sagMult: 0.35,
    baseMassMult: 1.0,
    desc: "Bolted overhead steel truss & heavy deck plates. Sturdy for pickups, SUVs, Humvees & careful trucks."
  },
  timber_wellmade: {
    id: "timber_wellmade",
    label: "Well-Made Heavy Timber",
    surface: "wood",
    breakable: true,
    sagMult: 0.65,
    baseMassMult: 1.0,
    desc: "Stout twin-log beam stringers & thick fitted timber deck. Reliable for medium rigs, risky for 8x8 giants."
  },
  rickety_wood: {
    id: "rickety_wood",
    label: "Rickety Rotten Wood",
    surface: "wood",
    breakable: true,
    sagMult: 1.15,
    baseMassMult: 1.0,
    desc: "Creaking crooked wooden planks with unpredictable RNG rot! Go slow or bring a lightweight rig!"
  }
};

// Generously sized bridges with seamless graded approach abutments touching both river banks!
KK.BRIDGES = [
  {
    id: "kamenka_ravine",
    name: "Devil's Plank Bridge (Near HQ)",
    x: 440, z: 58, yaw: Math.atan2(180, 1350),
    length: 112, width: 7.2, plankCount: 22,
    baseMaxMassKg: 4200, ravineDepth: 14, style: "rickety_wood"
  },
  {
    id: "rzhavsk_span",
    name: "Rzhavsk Concrete Highway Viaduct",
    x: -5900, z: 7100, yaw: Math.atan2(14200, -11800),
    length: 128, width: 8.4, plankCount: 20,
    baseMaxMassKg: 32000, ravineDepth: 15, style: "concrete"
  },
  {
    id: "gorge_truss",
    name: "Krasny Gorge Steel Truss",
    x: 3100, z: 12900, yaw: Math.atan2(25800, 6200),
    length: 132, width: 7.8, plankCount: 24,
    baseMaxMassKg: 11500, ravineDepth: 26, style: "steel_truss"
  },
  {
    id: "taiga_log_bridge",
    name: "Cherny Creek Heavy Timber Span",
    x: 12800, z: 2000, yaw: Math.atan2(3620, 23150),
    length: 116, width: 7.2, plankCount: 22,
    baseMaxMassKg: 6800, ravineDepth: 13, style: "timber_wellmade"
  },
  {
    id: "razorback_viaduct",
    name: "Razorback Concrete Arch Viaduct",
    x: -11000, z: -12250, yaw: Math.atan2(-24500, -22000),
    length: 118, width: 8.0, plankCount: 20,
    baseMaxMassKg: 30000, ravineDepth: 34, style: "concrete"
  },
  {
    id: "buran_chasm",
    name: "Buran Canyon Rickety Trestle",
    x: -25300, z: 24200, yaw: Math.atan2(20000, -27000),
    length: 126, width: 7.2, plankCount: 24,
    baseMaxMassKg: 4600, ravineDepth: 30, style: "rickety_wood"
  },
  {
    id: "vulkan_crossing",
    name: "Vulkan Steel Bailey Bridge",
    x: -1800, z: 550, yaw: Math.atan2(1100, -3600),
    length: 102, width: 7.8, plankCount: 20,
    baseMaxMassKg: 13500, ravineDepth: 18, style: "steel_truss"
  },
  {
    id: "north_timber_span",
    name: "Severny Old Timber Trestle",
    x: 9775, z: -15660, yaw: Math.atan2(-31680, 16850),
    length: 114, width: 7.4, plankCount: 22,
    baseMaxMassKg: 7400, ravineDepth: 22, style: "timber_wellmade"
  },
  {
    id: "tropika_kabut_bridge",
    name: "Jembatan Kabut (Iffy Jungle Crossing)",
    x: 66700, z: 59350, yaw: Math.atan2(5700, 5000),
    length: 98, width: 5.8, plankCount: 20,
    baseMaxMassKg: 4400, ravineDepth: 16, style: "rickety_wood"
  },
  {
    id: "tropika_danau_bridge",
    name: "Jembatan Merah (Rotten Ravine Span)",
    x: 71300, z: 64000, yaw: Math.atan2(3600, 4200),
    length: 92, width: 5.6, plankCount: 19,
    baseMaxMassKg: 4800, ravineDepth: 18, style: "timber_wellmade"
  },
  {
    id: "zolotoy_east_viaduct",
    name: "Zolotoy Express Viaduct East",
    x: -65250, z: 58900, yaw: Math.atan2(-4200, 5500),
    length: 120, width: 10.5, plankCount: 22,
    baseMaxMassKg: 95000, ravineDepth: 14, style: "concrete"
  },
  {
    id: "zolotoy_marina_viaduct",
    name: "Savanna Marina Grand Viaduct",
    x: -66400, z: 64100, yaw: Math.atan2(6200, 3200),
    length: 118, width: 10.5, plankCount: 22,
    baseMaxMassKg: 95000, ravineDepth: 14, style: "concrete"
  }
];

KK.RIVERS = [
  { name: "Kamenka Creek Ford", x: -460, z: 360, rx: 140, rz: 48, yaw: 0.45, depth: 1.45 },
  { name: "Rzhavsk Flood Basin", x: -8400, z: 10200, rx: 320, rz: 90, yaw: -0.6, depth: 1.65 },
  { name: "Black Timber Swamp", x: 18500, z: 3200, rx: 280, rz: 120, yaw: 0.2, depth: 1.35 },
  { name: "Volchya River", x: 33000, z: -9000, rx: 360, rz: 95, yaw: 1.1, depth: 1.8 }
];

// Continuous 95km Canyon River Network ("The Great Krasnaya River")
// Flows directly underneath Devil's Plank Bridge, Rzhavsk Trestle, Krasny Gorge Truss,
// Cherny Creek Log Bridge & Buran Chasm — so bridges are genuinely essential!
KK.RIVER_PATHS = [
  {
    id: "krasnaya_main",
    name: "The Great Krasnaya River",
    halfWidth: 24,
    depth: 4.8,
    pts: [
      { x: 14000, z: -45000 },
      { x: 6500,  z: -18000 },
      { x: 1450,  z: -3600  },
      { x: 440,   z: 58     }, // Directly beneath Devil's Plank Bridge!
      { x: -850,  z: 3100   },
      { x: -5900, z: 7100   }, // Directly beneath Rzhavsk Flood Trestle!
      { x: -13500,z: 18500  },
      { x: -25300,z: 24200  }, // Directly beneath Buran Canyon Bridge!
      { x: -44000,z: 44000  }
    ]
  },
  {
    id: "krasnaya_south_fork",
    name: "Southern Gorge River Fork",
    halfWidth: 21,
    depth: 4.2,
    pts: [
      { x: -850,  z: 3100   },
      { x: 600,   z: 7400   },
      { x: 3100,  z: 12900  }, // Directly beneath Krasny Gorge Rusty Truss!
      { x: 11200, z: 13200  },
      { x: 12800, z: 2000   }, // Directly beneath Cherny Creek Log Bridge!
      { x: 26500, z: -11000 },
      { x: 45000, z: -29000 }
    ]
  },
  {
    id: "tropika_sungai_kabut",
    halfWidth: 20,
    depth: 3.6,
    pts: [
      { x: 63200, z: 61800 },
      { x: 66700, z: 59350 },
      { x: 69600, z: 60400 },
      { x: 71300, z: 64000 },
      { x: 75200, z: 66800 }
    ]
  }
];

// Shallow Rocky Cobble Fords along the Great Krasnaya River!
// Depth smoothly rises to ~0.60m-0.65m with firm gravel bed so regular 4x4s can cross without needing the BTR-80!
KK.RIVER_FORDS = [
  { id: "ford_hq_south",  name: "Kamenka South Cobble Ford",   x: -110,   z: 1280,  radius: 34, depth: 0.60 },
  { id: "ford_hq_north",  name: "Kamenka North Gravel Shoal",  x: 920,    z: -1680, radius: 34, depth: 0.62 },
  { id: "ford_mid_west",  name: "Rzhavsk Shallow Crossing",    x: -3350,  z: 5050,  radius: 36, depth: 0.65 },
  { id: "ford_gorge_mid", name: "Southern Touge Stone Ford",   x: 1780,   z: 9815,  radius: 34, depth: 0.64 },
  { id: "ford_taiga_east",name: "Cherny Creek Shallow Shoal",  x: 12380,  z: 4630,  radius: 34, depth: 0.62 },
  { id: "ford_desert_sw", name: "Red Sands Oasis Ford",        x: -17710, z: 20330, radius: 38, depth: 0.60 }
];

KK.MUD_ZONES = [
  { x: -320, z: 240, r: 95, depth: 0.55 },
  { x: 960, z: 120, r: 85, depth: 0.5 },
  { x: 21000, z: 3600, r: 650, depth: 0.72 },
  { x: 35000, z: -12000, r: 800, depth: 0.78 },
  { x: -9500, z: 12500, r: 520, depth: 0.78 },
  { x: 1100, z: 320, r: 95, depth: 0.82 },
  { x: -2400, z: 4800, r: 220, depth: 0.85 },
  { x: 4500, z: 16500, r: 260, depth: 0.80 }
];

// ============================================================================
// SMOOTH HIGH-GRIP TARMAC PROVING GROUNDS & AUTOBAHN (Zero Potholes, mu = 1.26!)
// ============================================================================
KK.SMOOTH_TARMAC_ZONES = [
  {
    id: "krasny_ring_autobahn",
    name: "Krasny-Ring Smooth Tarmac Proving Grounds",
    cx: -1450, cz: -850,
    rx: 560, rz: 310,
    trackWidth: 16.0,
    yaw: -0.22,
    desc: "Glass-smooth freshly paved oval & speedway circuit with red/white apex curbs and zero potholes — open up your GT-R, Evo, or WRX to 220+ km/h!"
  }
];

// ============================================================================
// SHATTERED HELL-ROAD ZONES (Extreme Craters, Washboard & Broken Concrete Slabs!)
// ============================================================================
KK.BAD_ROAD_ZONES = [
  {
    id: "devils_washbasin",
    name: "Devil's Washbasin (Shattered Hell-Road)",
    x: 2450, z: 1450,
    radius: 620,
    severity: 1.0,
    desc: "Notorious collapsed Soviet freight highway — axle-snapping craters, deep washboard ruts, broken concrete slabs & tire-shredding mud!"
  },
  {
    id: "rzhavsk_ruins_road",
    name: "Rzhavsk Bomb-Crater Highway",
    x: -7800, z: 9800,
    radius: 580,
    severity: 0.92,
    desc: "Flood-wrecked highway stretch riddled with brutal potholes and sunken slabs. Low-range 4L & aired-down tires recommended!"
  }
];

// ============================================================================
// CLARKSON'S FARM ("DIDDLY SQUAT OBLAST") — Cryptid Sanctuary, Free Repairs & Sheep!
// ============================================================================
KK.CLARKSON_FARM = {
  id: "clarksons_farm",
  name: "Clarkson's Farm (Diddly Squat Oblast)",
  x: -1150,
  z: 1450,
  radius: 175,       // Safe sanctuary perimeter — NO cryptid or tornado can enter!
  shopX: -1128,      // Jeremy Clarkson stands right in front of the Farm Shop!
  shopZ: 1432,
  sheepCount: 14,
  desc: "Jeremy Clarkson's arable sanctuary farm. Cryptids refuse to enter! Drive up to Jeremy for FREE repairs — just whatever you do, DO NOT run over his sheep!"
};

// ============================================================================
// JAMES MAY'S PUB ("THE SLOW & STEADY ARMS") — Beer Deliveries & Dacia Sandero!
// ============================================================================
KK.JAMES_MAY_BAR = {
  id: "james_may_bar",
  name: "Captain Slow's Pub (James May's Bar)",
  x: -1250, z: 420, radius: 68,
  pubX: -1250, pubZ: 405,
  dockX: -1228, dockZ: 432,
  sanderoX: -1268, sanderoZ: 428,
  desc: "James May's cozy British-Slavic country bar. Deliver Beer Kegs to James for cash & trivia — and try not to steal his beloved Dacia Sandero parked outside!"
};

// ============================================================================
// RICHARD HAMMOND'S DESERT MESA — Sandwyrm-Safe Plateau, Oliver & BTR-80 Rearm!
// ============================================================================
KK.HAMMOND_MESA = {
  id: "hammond_mesa",
  name: "Hammond's Rocky Plateau (Desert Mesa)",
  x: 3600,
  z: 11800,
  radius: 135,
  mesaHeightAdd: 16,
  campX: 3600,
  campZ: 11810,
  desc: "Richard Hammond's desert sanctuary high on a solid rock mesa (safe from the Sandwyrm!). Bring your BTR-80 here to rearm its KPVT 14.5mm turret, or admire Oliver!"
};

// ============================================================================
// TIRE COMPOUNDS & BRANDS (Tunable in Garage [G] -> 2D Blueprint -> Tires!)
// ============================================================================
KK.TIRE_COMPOUNDS = {
  all_terrain: {
    id: "all_terrain", name: "All-Terrain Overland (A/T)", short: "A/T", price: 0,
    grip: { race_tarmac: 1.00, asphalt: 1.00, gravel: 1.05, dirt: 1.05, mud: 1.00, sand: 1.05, snow: 1.02, bad_road: 1.04 },
    punctureResist: 0.15, dragMult: 1.00,
    desc: "Balanced all-rounder for mixed tarmac, gravel, and moderate trails."
  },
  street_sport: {
    id: "street_sport", name: "Apex Semi-Slick Sport (Tarmac)", short: "SPORT", price: 1850,
    grip: { race_tarmac: 1.24, asphalt: 1.20, gravel: 0.92, dirt: 0.84, mud: 0.62, sand: 0.72, snow: 0.65, bad_road: 0.75 },
    punctureResist: 0.10, dragMult: 0.86,
    desc: "Razor-sharp asphalt & Krasny-Ring grip with maximum high-speed stability!"
  },
  mud_terrain: {
    id: "mud_terrain", name: "Deep-Lug Mud Bogger (M/T)", short: "MUD M/T", price: 2400,
    grip: { race_tarmac: 0.90, asphalt: 0.92, gravel: 1.12, dirt: 1.18, mud: 1.46, sand: 1.10, snow: 1.15, bad_road: 1.28 },
    punctureResist: 0.48, dragMult: 1.14,
    desc: "Massive sidewall lugs chew through Black Timber bogs & Hell-Road craters!"
  },
  snow_studded: {
    id: "snow_studded", name: "Arctic Carbide-Studded Snow", short: "STUDDED", price: 2300,
    grip: { race_tarmac: 0.92, asphalt: 0.94, gravel: 1.08, dirt: 1.05, mud: 1.08, sand: 0.95, snow: 1.52, bad_road: 1.14 },
    punctureResist: 0.42, dragMult: 1.08,
    desc: "Tungsten studs bite icy Razorback Switchbacks & snowy northern climbs!"
  },
  desert_paddle: {
    id: "desert_paddle", name: "Liwa Sand-Dune Paddle & Kevlar", short: "SAND", price: 2150,
    grip: { race_tarmac: 0.88, asphalt: 0.90, gravel: 1.04, dirt: 1.08, mud: 1.12, sand: 1.48, snow: 1.04, bad_road: 1.12 },
    punctureResist: 0.45, dragMult: 1.06,
    desc: "Wide flotation tread floats effortlessly across Red Sands Desert dunes!"
  }
};

KK.TIRE_BRANDS = {
  krasnyscrap: { id: "krasnyscrap", name: "KrasnyScrap Retreads",   short: "KRASNY",   color: "#c6946b", gripMult: 0.92, punctureResist: 0.00, wearMult: 1.55, priceMult: 0.45, desc: "Cheap recapped Soviet rubber. Blows easily on sharp mountain rocks." },
  volgaworks:  { id: "volgaworks",  name: "VolgaWorks OEM Rubber",  short: "VOLGA",    color: "#9db4c4", gripMult: 1.00, punctureResist: 0.18, wearMult: 1.00, priceMult: 1.00, desc: "Dependable factory radial tires." },
  boreal:      { id: "boreal",      name: "Boreal Expedition 10-Ply",short: "BOREAL",  color: "#2ec4b6", gripMult: 1.06, punctureResist: 0.58, wearMult: 0.45, priceMult: 1.65, desc: "Steel-belted Siberian 10-ply sidewalls — laughs at sharp rocks & potholes!" },
  kurogane:    { id: "kurogane",    name: "Kurogane R-Spec",        short: "KUROGANE", color: "#ffb703", gripMult: 1.14, punctureResist: 0.38, wearMult: 0.82, priceMult: 2.10, desc: "Sticky Japanese rally/track compound with crisp turn-in bite." },
  valkyrie:    { id: "valkyrie",    name: "Valkyrie Kevlar Pro",    short: "VALKYRIE", color: "#ff4d6d", gripMult: 1.20, punctureResist: 0.74, wearMult: 0.52, priceMult: 3.10, desc: "Military Kevlar-woven apex rubber — extreme grip and near-unpoppable!" }
};

// ============================================================================
// VEHICLE MANUFACTURERS & CUSTOM SVG LOGOS (Clickable Dealership Brands!)
// ============================================================================
KK.MANUFACTURERS = {
  toyota: {
    id: "toyota", name: "Toyota", country: "Japan", tagline: "Unbreakable Overland Legends", color: "#eb0a1e",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><ellipse cx="40" cy="25" rx="34" ry="20" fill="none" stroke="#eb0a1e" stroke-width="4"/><ellipse cx="40" cy="25" rx="11" ry="19" fill="none" stroke="#eb0a1e" stroke-width="3.5"/><ellipse cx="40" cy="17" rx="22" ry="7.5" fill="none" stroke="#eb0a1e" stroke-width="3.5"/></svg>`
  },
  nissan: {
    id: "nissan", name: "Nissan", country: "Japan", tagline: "Godzilla & Desert Safari Icons", color: "#c3002f",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><circle cx="40" cy="25" r="20" fill="none" stroke="#dce4ec" stroke-width="4"/><rect x="8" y="19" width="64" height="12" rx="2" fill="#c3002f"/><text x="40" y="28" text-anchor="middle" fill="#fff" font-family="monospace" font-size="10" font-weight="bold">NISSAN</text></svg>`
  },
  subaru: {
    id: "subaru", name: "Subaru", country: "Japan", tagline: "Symmetrical AWD Boxer Rally", color: "#1554d1",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><ellipse cx="40" cy="25" rx="34" ry="19" fill="#0d2f7a" stroke="#c8d6e5" stroke-width="3"/><polygon points="24,14 27,22 35,25 27,28 24,36 21,28 13,25 21,22" fill="#fff"/><circle cx="46" cy="17" r="3" fill="#fff"/><circle cx="56" cy="22" r="2.6" fill="#fff"/><circle cx="44" cy="27" r="2.6" fill="#fff"/><circle cx="53" cy="31" r="2.4" fill="#fff"/><circle cx="62" cy="27" r="2" fill="#fff"/></svg>`
  },
  mitsubishi: {
    id: "mitsubishi", name: "Mitsubishi", country: "Japan", tagline: "Rally Weapons & Alpine 4x4s", color: "#e60012",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><polygon points="40,5 49,21 40,37 31,21" fill="#e60012"/><polygon points="40,37 22,37 13,22 31,22" fill="#e60012"/><polygon points="40,37 58,37 67,22 49,22" fill="#e60012"/></svg>`
  },
  suzuki: {
    id: "suzuki", name: "Suzuki", country: "Japan", tagline: "Featherweight Mountain Goats", color: "#0055a5",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><path d="M22 14 L52 7 L60 15 L36 22 L58 31 L28 43 L20 35 L44 28 Z" fill="#e61c24" stroke="#fff" stroke-width="1.5"/></svg>`
  },
  landrover: {
    id: "landrover", name: "Land Rover", country: "UK", tagline: "Posh Supercharged V8 Luxury", color: "#005a2b",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><ellipse cx="40" cy="25" rx="34" ry="18" fill="#005a2b" stroke="#d4af37" stroke-width="3"/><text x="40" y="23" text-anchor="middle" fill="#fff" font-family="monospace" font-size="9" font-weight="bold">LAND</text><text x="40" y="34" text-anchor="middle" fill="#ffd166" font-family="monospace" font-size="9" font-weight="bold">ROVER</text></svg>`
  },
  uaz: {
    id: "uaz", name: "UAZ", country: "USSR / Russia", tagline: "Glorious Indestructible Loaf Vans", color: "#558c52",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><ellipse cx="40" cy="25" rx="33" ry="18" fill="#1e2d1e" stroke="#85b87e" stroke-width="3"/><path d="M16 30 Q40 10 64 30 Q40 22 16 30 Z" fill="#85b87e"/><text x="40" y="38" text-anchor="middle" fill="#dce6dc" font-family="monospace" font-size="9" font-weight="bold">UAZ</text></svg>`
  },
  amgeneral: {
    id: "amgeneral", name: "AM General", country: "USA", tagline: "Ultra-Wide Tactical Utility", color: "#b59d6b",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><rect x="10" y="10" width="60" height="30" rx="4" fill="#3a3628" stroke="#b59d6b" stroke-width="3"/><polygon points="40,14 43,22 52,22 45,27 47,35 40,30 33,35 35,27 28,22 37,22" fill="#e6cf95"/></svg>`
  },
  kamaz: {
    id: "kamaz", name: "KamAZ", country: "Russia", tagline: "6x6 Heavy Expedition Titans", color: "#2d7dd2",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><rect x="8" y="12" width="64" height="26" rx="4" fill="#1b3552" stroke="#5aa9e6" stroke-width="3"/><text x="40" y="29" text-anchor="middle" fill="#fff" font-family="monospace" font-size="13" font-weight="bold">KAMAZ</text></svg>`
  },
  gaz: {
    id: "gaz", name: "GAZ / BTR", country: "USSR / Russia", tagline: "Amphibious 8x8 Rescue Armor", color: "#e87a1a",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><polygon points="40,5 70,20 62,43 18,43 10,20" fill="#2b3828" stroke="#e87a1a" stroke-width="3"/><text x="40" y="30" text-anchor="middle" fill="#ffbe5c" font-family="monospace" font-size="12" font-weight="bold">BTR</text></svg>`
  },
  maz: {
    id: "maz", name: "MAZ", country: "Belarus", tagline: "38.8L Tank V12 8x8 Leviathans", color: "#c9382a",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><rect x="10" y="10" width="60" height="30" rx="3" fill="#2e1818" stroke="#e64c3c" stroke-width="3"/><text x="40" y="30" text-anchor="middle" fill="#ffd166" font-family="monospace" font-size="15" font-weight="bold">MAZ</text></svg>`
  },
  jeep: {
    id: "jeep", name: "Jeep", country: "USA", tagline: "Trail-Rated Solid-Axle Icons", color: "#d98218",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><rect x="8" y="11" width="64" height="28" rx="4" fill="#1e241b" stroke="#d98218" stroke-width="3"/><circle cx="19" cy="25" r="5" fill="#fff4c2"/><circle cx="61" cy="25" r="5" fill="#fff4c2"/><rect x="28" y="17" width="3" height="16" fill="#d98218"/><rect x="34" y="17" width="3" height="16" fill="#d98218"/><rect x="40" y="17" width="3" height="16" fill="#d98218"/><rect x="46" y="17" width="3" height="16" fill="#d98218"/><rect x="52" y="17" width="3" height="16" fill="#d98218"/></svg>`
  },
  dacia: {
    id: "dacia", name: "Dacia", country: "Romania", tagline: "Good News! Sensible Transport", color: "#5f7a52",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><path d="M12 14 L34 25 L12 36 M68 14 L46 25 L68 36 M34 25 L46 25" fill="none" stroke="#9ec48b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
  },
  lamborghini: {
    id: "lamborghini", name: "Lamborghini Trattori", country: "Italy", tagline: "Clarkson's Comically Giant Tractor", color: "#d4af37",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><path d="M18 8 L62 8 L58 34 L40 45 L22 34 Z" fill="#16181c" stroke="#d4af37" stroke-width="3"/><text x="40" y="24" text-anchor="middle" fill="#d4af37" font-family="monospace" font-size="9" font-weight="bold">LAMBO</text><text x="40" y="34" text-anchor="middle" fill="#e6ebef" font-family="monospace" font-size="7" font-weight="bold">TRATTORI</text></svg>`
  },
  uvz: {
    id: "uvz", name: "Uralvagonzavod", country: "USSR / Russia", tagline: "Classified Heavy Armored Works", color: "#6b8e4e", secretOnly: true,
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><polygon points="40,5 72,18 64,44 16,44 8,18" fill="#1b2618" stroke="#85b865" stroke-width="3"/><polygon points="40,12 44,23 55,23 46,29 49,39 40,33 31,39 34,29 25,23 36,23" fill="#e63946"/></svg>`
  },
  porsche: {
    id: "porsche", name: "Porsche", country: "Germany", tagline: "Stuttgart Dakar Rally Engineering", color: "#e63946",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><path d="M20 6 L60 6 L56 36 L40 46 L24 36 Z" fill="#d4af37" stroke="#181a1e" stroke-width="2.5"/><rect x="24" y="10" width="16" height="12" fill="#c1121f"/><rect x="40" y="22" width="14" height="12" fill="#c1121f"/><text x="40" y="19" text-anchor="middle" fill="#111" font-family="monospace" font-size="7" font-weight="900">911</text></svg>`
  },
  pindad: {
    id: "pindad", name: "PT Pindad", country: "Indonesia", tagline: "Tropical Tactical Armor & Medium Tanks", color: "#2de08b",
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><polygon points="40,4 68,14 62,38 40,47 18,38 12,14" fill="#1e3528" stroke="#2de08b" stroke-width="3"/><polygon points="40,10 43.5,19 53,19 45.5,24.5 48.5,33.5 40,28 31.5,33.5 34.5,24.5 27,19 36.5,19" fill="#ffd166"/><text x="40" y="42" text-anchor="middle" fill="#e6f4ea" font-family="monospace" font-size="7.5" font-weight="900">PINDAD</text></svg>`
  },
  silver_directive: {
    id: "silver_directive", name: "The Silver Directive", country: "Imperium", tagline: "Dev-Exclusive Breakthrough Armor", color: "#d62828", secretOnly: true, devOnly: true,
    logoSvg: `<svg viewBox="0 0 80 50" width="56" height="36"><polygon points="40,4 72,16 64,44 16,44 8,16" fill="#14181e" stroke="#d9e2ec" stroke-width="3"/><text x="40" y="31" text-anchor="middle" fill="#e63946" font-family="monospace" font-size="18" font-weight="900">7</text></svg>`
  }
};

// ============================================================================
// 7 LANDMARKS, CASH TEMPLES, DREARY CASTLE & SILLY SHENANIGANS SPOTS!
// ============================================================================
KK.LANDMARKS = [
  {
    id: "samovar_stunt",
    type: "samovar",
    name: "Giant Golden Samovar & Bus Jump",
    x: -640, z: -690,
    rewardCash: 3500,
    interactRadius: 24,
    hasRamp: true, rampYaw: 0.4, rampLen: 22, rampWidth: 8.5, rampHeight: 4.8,
    desc: "Monumental 16m Soviet golden teapot & rusty bus jump! Claim the monument stash or launch off the ramp!"
  },
  {
    id: "mega_ramp_hq",
    type: "ramp",
    name: "Kamenka Concrete Mega-Ramp",
    x: 840, z: -540,
    rewardCash: 2800,
    interactRadius: 22,
    hasRamp: true, rampYaw: -0.5, rampLen: 28, rampWidth: 10.0, rampHeight: 6.5,
    desc: "Colossal concrete stunt jump right outside HQ. Floor it in a WRX or Evo for massive dust clouds!"
  },
  {
    id: "castle_raven",
    type: "castle",
    name: "Castle Raven-Kamen (Dreary Fortress)",
    x: -2250, z: -2050,
    rewardCash: 8500,
    interactRadius: 26,
    desc: "Spooky gothic stone fortress with glowing red slit windows and an ancient $8,500 relic chest inside the courtyard!"
  },
  {
    id: "desert_temple",
    type: "temple",
    name: "Sunken Golden Temple of the Sands",
    x: 2350, z: 3250,
    rewardCash: 12500,
    interactRadius: 24,
    desc: "Ancient sandstone ziggurat in the Red Sands Desert with glowing fire braziers and a $12,500 Golden Offering Vault! Beware the Sandworm!"
  },
  {
    id: "rubber_duck",
    type: "duck",
    name: "Colossal Rubber Duck Canyon",
    x: -2650, z: 2250,
    rewardCash: 5500,
    interactRadius: 24,
    hasRamp: true, rampYaw: 2.2, rampLen: 20, rampWidth: 8.0, rampHeight: 4.4,
    desc: "Nobody knows why a 15-meter bright-yellow rubber duck watches over this valley, but there is $5,500 taped to its beak."
  },
  {
    id: "crashed_ufo",
    type: "ufo",
    name: "Crashed Oblast UFO Telemetry Site",
    x: 3350, z: -1850,
    rewardCash: 9500,
    interactRadius: 24,
    desc: "Smoking alien saucer pulsing with green light in the northern pine woods. Collect the $9,500 scrap bounty!"
  },
  {
    id: "alpine_shrine",
    type: "shrine",
    name: "Frost-Peak Alpine Treasury Shrine",
    x: -14800, z: -16500,
    rewardCash: 19500,
    interactRadius: 26,
    desc: "Remote snowy mountain temple guarded by the Abominable Snowman. Worth a massive $19,500 payout!"
  },
  {
    id: "mt_vulkan_caldera",
    type: "volcano",
    name: "Mt. Vulkan Magma Caldera (T-Rex Territory)",
    x: -4550, z: 1350,
    rewardCash: 16500,
    interactRadius: 34,
    desc: "Smoking volcanic caldera with a glowing molten lava lake and $16,500 in rare obsidian samples! Guarded by a stomping T-Rex!"
  }
];

// ============================================================================
// 5 FICTIONAL AFTERMARKET COMPANIES
// ============================================================================
KK.BRANDS = {
  krasnyscrap: { id: "krasnyscrap", name: "KrasnyScrap Surplus", short: "KRASNY", tier: "Budget Junkyard", color: "#c6946b", perfMult: 0.90, wearMult: 1.75, priceMult: 0.45, desc: "Salvaged Soviet depot parts. Dirt cheap, wears fast, slightly down on power." },
  volgaworks:  { id: "volgaworks",  name: "VolgaWorks OEM",      short: "VOLGA OEM", tier: "Factory Standard", color: "#9db4c4", perfMult: 1.00, wearMult: 1.00, priceMult: 1.00, desc: "Balanced factory-spec replacement parts." },
  boreal:      { id: "boreal",      name: "Boreal Heavy-Duty",   short: "BOREAL HD", tier: "Siberian Endurance", color: "#2ec4b6", perfMult: 1.07, wearMult: 0.42, priceMult: 1.65, desc: "Overbuilt expedition steel — 2.4x longer lifespan!" },
  kurogane:    { id: "kurogane",    name: "Kurogane Motorsport", short: "KUROGANE", tier: "JDM Rally Spec", color: "#ffb703", perfMult: 1.18, wearMult: 0.80, priceMult: 2.15, desc: "Precision Japanese gravel rally hardware. Crisp response & high output." },
  valkyrie:    { id: "valkyrie",    name: "Valkyrie Apex Racing",short: "VALKYRIE", tier: "Pro Billet Titanium", color: "#ff4d6d", perfMult: 1.34, wearMult: 0.58, priceMult: 3.40, desc: "Forged titanium motorsport parts. Insane output & reliability." }
};

KK.BRAND_ORDER = ["krasnyscrap", "volgaworks", "boreal", "kurogane", "valkyrie"];

// ============================================================================
// DEEP CPM2-STYLE MULTI-PART CATALOG
// ============================================================================
KK.PARTS_CATALOG = {
  airFilter:       { id: "airFilter",       cat: "engine", sub: "Fuel & Air System",         name: "Air Intake & Filter",       basePrice: 360,  effect: "Airflow & peak HP; clogs on dusty trails" },
  fuelRails:       { id: "fuelRails",       cat: "engine", sub: "Fuel & Air System",         name: "High-Pressure Fuel Rails",  basePrice: 540,  effect: "High-RPM fuel delivery & top-end torque" },
  fuelInjectors:   { id: "fuelInjectors",   cat: "engine", sub: "Fuel & Air System",         name: "Fuel Injectors / Carb",     basePrice: 680,  effect: "Throttle response & economy; misfires when worn" },
  sparkPlugs:      { id: "sparkPlugs",      cat: "engine", sub: "Fuel & Air System",         name: "Spark / Glow Plugs",        basePrice: 320,  effect: "Clean ignition; sputters under boost when worn" },

  radiator:        { id: "radiator",        cat: "engine", sub: "Cooling & Exhaust System",  name: "Radiator Core",             basePrice: 780,  effect: "Heat rejection on steep mountain climbs" },
  waterPump:       { id: "waterPump",       cat: "engine", sub: "Cooling & Exhaust System",  name: "Water Pump & Thermostat",   basePrice: 490,  effect: "Coolant circulation; boiling spikes if it fails" },
  intercooler:     { id: "intercooler",     cat: "engine", sub: "Cooling & Exhaust System",  name: "Intercooler & Piping",      basePrice: 820,  effect: "Boost density & EGT cooling; leaks when worn" },
  exhaustManifold: { id: "exhaustManifold", cat: "engine", sub: "Cooling & Exhaust System",  name: "Exhaust Manifold & Turbo",  basePrice: 950,  effect: "Spool speed, backfire pops & peak boost" },

  pistons:         { id: "pistons",         cat: "engine", sub: "Engine Body & Internals",   name: "Pistons & Compression Rings", basePrice: 1250, effect: "Compression power & over-boost durability" },
  crankshaft:      { id: "crankshaft",      cat: "engine", sub: "Engine Body & Internals",   name: "Crankshaft & Bearings",     basePrice: 1450, effect: "Safe redline RPM & bottom-end torque" },
  camshaft:        { id: "camshaft",        cat: "engine", sub: "Engine Body & Internals",   name: "Camshaft & Valvetrain",     basePrice: 1100, effect: "Mid-to-high RPM powerband curve" },
  headGasket:      { id: "headGasket",      cat: "engine", sub: "Engine Body & Internals",   name: "Engine Block & Head Gasket",basePrice: 1350, effect: "Core engine integrity; white smoke if blown" },

  flywheel:        { id: "flywheel",        cat: "transmission", sub: "Clutch & Flywheel",   name: "Flywheel",                  basePrice: 640,  effect: "Lighter high-tier flywheels rev WAY faster!" },
  clutchPack:      { id: "clutchPack",      cat: "transmission", sub: "Clutch & Flywheel",   name: "Clutch Plate & Pressure",   basePrice: 760,  effect: "Torque clamping; slips RPM when worn" },
  gearboxGears:    { id: "gearboxGears",    cat: "transmission", sub: "Gearbox & Axles",     name: "Gearbox Gearset & Synchros",basePrice: 1180, effect: "Shift crispness & mechanical power transfer" },
  transferCase:    { id: "transferCase",    cat: "transmission", sub: "Gearbox & Axles",     name: "4WD/AWD Transfer Case",     basePrice: 960,  effect: "4H/4L & AWD traction efficiency" },
  driveshaft:      { id: "driveshaft",      cat: "transmission", sub: "Gearbox & Axles",     name: "Driveshaft & U-Joints",     basePrice: 620,  effect: "Drivetrain rigidity & torque delivery" },

  coilSprings:     { id: "coilSprings",     cat: "suspension", sub: "Springs & Dampers",     name: "Coilover / Leaf Springs",   basePrice: 720,  effect: "Load support & bump-stop resistance" },
  shockFL:         { id: "shockFL",         cat: "suspension", sub: "Springs & Dampers",     name: "Front-Left Shock Damper",   basePrice: 440,  effect: "Controls FL wheel bounce on potholes" },
  shockFR:         { id: "shockFR",         cat: "suspension", sub: "Springs & Dampers",     name: "Front-Right Shock Damper",  basePrice: 440,  effect: "Controls FR wheel bounce on potholes" },
  shockRL:         { id: "shockRL",         cat: "suspension", sub: "Springs & Dampers",     name: "Rear-Left Shock Damper",    basePrice: 440,  effect: "Controls RL wheel bounce under cargo" },
  shockRR:         { id: "shockRR",         cat: "suspension", sub: "Springs & Dampers",     name: "Rear-Right Shock Damper",   basePrice: 440,  effect: "Controls RR wheel bounce under cargo" },
  tieRods:         { id: "tieRods",         cat: "suspension", sub: "Steering, Hubs & Brakes", name: "Tie-Rods & Steering Rack",basePrice: 520,  effect: "Steering precision & pothole bend resistance" },
  antiRollBar:     { id: "antiRollBar",     cat: "suspension", sub: "Steering, Hubs & Brakes", name: "Sway / Anti-Roll Bars",   basePrice: 580,  effect: "Cornering flatness & rollover prevention" },
  wheelHubs:       { id: "wheelHubs",       cat: "suspension", sub: "Steering, Hubs & Brakes", name: "Wheel Bearings & Hubs",   basePrice: 540,  effect: "Low rolling drag & cornering bite" },
  brakeSystem:     { id: "brakeSystem",     cat: "suspension", sub: "Steering, Hubs & Brakes", name: "Brake Pads & Rotors",     basePrice: 660,  effect: "Stopping power down mountain cliffs" }
};

// ============================================================================
// 11 ENGINES — EVERY ENGINE HAS ITS OWN UNIQUE AUDIO SYNTHESIS PROFILE!
// ============================================================================
KK.ENGINES = {
  umz_24: {
    id: "umz_24", name: "2.4L UMZ-417 Carb I4 (UAZ Factory)", layout: "2.4L OHV Inline-4",
    price: 0, fuelType: "petrol", stockHp: 82, baseTorqueNm: 175,
    peakTorqueRpm: 2200, redlineRpm: 4300, idleRpm: 780, basePitch: 0.84, heatRate: 1.25,
    throttleResp: 5.0, stockTurbo: false, stockBoostPsi: 0, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.98, subLvl: 0.56, bodyLvl: 0.44, growlLvl: 0.24, filterBase: 140, filterMax: 680, wobbleHz: 7.5, wobbleAmt: 0.20, airLvl: 0.04, warmth: 7 }
  },
  suzuki_k15b: {
    id: "suzuki_k15b", name: "1.5L K15B High-Rev NA I4 (Jimny Factory)", layout: "1.5L DOHC Inline-4",
    price: 2400, fuelType: "petrol", stockHp: 105, baseTorqueNm: 145,
    peakTorqueRpm: 4200, redlineRpm: 6600, idleRpm: 880, basePitch: 1.18, heatRate: 0.78,
    throttleResp: 11.5, stockTurbo: false, stockBoostPsi: 0, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 2.00, subLvl: 0.42, bodyLvl: 0.46, growlLvl: 0.22, filterBase: 210, filterMax: 1020, wobbleHz: 0, wobbleAmt: 0, airLvl: 0.055, warmth: 4 }
  },
  mitsu_4d56: {
    id: "mitsu_4d56", name: "2.5L 4D56T Turbo-Diesel (Delica Factory)", layout: "2.5L Turbo-Diesel I4",
    price: 4800, fuelType: "diesel", stockHp: 112, baseTorqueNm: 255,
    peakTorqueRpm: 2000, redlineRpm: 4400, idleRpm: 740, basePitch: 0.76, heatRate: 1.05,
    throttleResp: 6.4, stockTurbo: true, stockBoostPsi: 11, antiLag: false,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 2.25, subLvl: 0.55, bodyLvl: 0.34, growlLvl: 0.22, filterBase: 155, filterMax: 660, wobbleHz: 13.0, wobbleAmt: 0.16, airLvl: 0.05, warmth: 8 }
  },
  toyota_1gd: {
    id: "toyota_1gd", name: "2.8L Toyota 1GD-FTV Turbo-Diesel (Hilux Factory)", layout: "2.8L VNT Turbo-Diesel",
    price: 9800, fuelType: "diesel", stockHp: 204, baseTorqueNm: 500,
    peakTorqueRpm: 1850, redlineRpm: 4500, idleRpm: 680, basePitch: 0.70, heatRate: 0.84,
    throttleResp: 8.5, stockTurbo: true, stockBoostPsi: 15, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.58, bodyLvl: 0.42, growlLvl: 0.24, filterBase: 145, filterMax: 720, wobbleHz: 10.5, wobbleAmt: 0.12, airLvl: 0.048, warmth: 6 }
  },
  toyota_1hz: {
    id: "toyota_1hz", name: "4.2L Toyota 1HZ Inline-6 Diesel", layout: "4.2L NA Inline-6 Diesel",
    price: 11500, fuelType: "diesel", stockHp: 138, baseTorqueNm: 325,
    peakTorqueRpm: 2000, redlineRpm: 4600, idleRpm: 640, basePitch: 0.68, heatRate: 0.62,
    throttleResp: 7.2, stockTurbo: false, stockBoostPsi: 0, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.56, bodyLvl: 0.45, growlLvl: 0.20, filterBase: 140, filterMax: 680, wobbleHz: 4.5, wobbleAmt: 0.08, airLvl: 0.04, warmth: 5 }
  },
  nissan_tb48: {
    id: "nissan_tb48", name: "4.8L Nissan TB48DE Inline-6 (Patrol Y61 Factory)", layout: "4.8L DOHC Inline-6 Petrol",
    price: 15800, fuelType: "petrol", stockHp: 280, baseTorqueNm: 451,
    peakTorqueRpm: 3600, redlineRpm: 5800, idleRpm: 720, basePitch: 0.84, heatRate: 0.80,
    throttleResp: 11.8, stockTurbo: false, stockBoostPsi: 0, antiLag: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.58, bodyLvl: 0.48, growlLvl: 0.28, filterBase: 175, filterMax: 980, wobbleHz: 3.5, wobbleAmt: 0.06, airLvl: 0.058, warmth: 6 }
  },
  detroit_65v8: {
    id: "detroit_65v8", name: "6.5L Detroit Turbo-Diesel V8 (Humvee Factory)", layout: "6.5L Military V8 Diesel",
    price: 14200, fuelType: "diesel", stockHp: 205, baseTorqueNm: 590,
    peakTorqueRpm: 1700, redlineRpm: 3400, idleRpm: 600, basePitch: 0.52, heatRate: 0.72,
    throttleResp: 6.2, stockTurbo: true, stockBoostPsi: 12, antiLag: false,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.495, bodyMult: 0.99, growlMult: 1.25, subLvl: 0.64, bodyLvl: 0.38, growlLvl: 0.26, filterBase: 115, filterMax: 560, wobbleHz: 11.5, wobbleAmt: 0.22, airLvl: 0.06, warmth: 9 }
  },
  toyota_1vd: {
    id: "toyota_1vd", name: "4.5L Toyota 1VD-FTV V8 Diesel (LC79 Factory)", layout: "4.5L Twin-Turbo V8 Diesel",
    price: 16800, fuelType: "diesel", stockHp: 235, baseTorqueNm: 560,
    peakTorqueRpm: 1750, redlineRpm: 4400, idleRpm: 620, basePitch: 0.58, heatRate: 0.80,
    throttleResp: 8.0, stockTurbo: true, stockBoostPsi: 14, antiLag: false, isTwinTurbo: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.495, bodyMult: 1.00, growlMult: 1.25, subLvl: 0.62, bodyLvl: 0.40, growlLvl: 0.25, filterBase: 125, filterMax: 620, wobbleHz: 8.5, wobbleAmt: 0.14, airLvl: 0.052, warmth: 7 }
  },
  subaru_ej257: {
    id: "subaru_ej257", name: "2.5L EJ257 Boxer Turbo (WRX STI Factory)", layout: "2.5L Flat-4 Boxer Turbo",
    price: 14500, fuelType: "petrol", stockHp: 305, baseTorqueNm: 410,
    peakTorqueRpm: 4000, redlineRpm: 7000, idleRpm: 860, basePitch: 0.86, heatRate: 0.95,
    throttleResp: 13.0, stockTurbo: true, stockBoostPsi: 16, antiLag: true, isBoxer: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.625, bodyMult: 1.00, growlMult: 1.33, subLvl: 0.58, bodyLvl: 0.44, growlLvl: 0.28, filterBase: 175, filterMax: 920, wobbleHz: 15.5, wobbleAmt: 0.22, airLvl: 0.055, warmth: 7 }
  },
  mitsu_4g63t: {
    id: "mitsu_4g63t", name: "2.0L 4G63T MIVEC Turbo (Evo IX Factory)", layout: "2.0L DOHC Turbo I4",
    price: 15500, fuelType: "petrol", stockHp: 295, baseTorqueNm: 405,
    peakTorqueRpm: 3800, redlineRpm: 7600, idleRpm: 900, basePitch: 1.04, heatRate: 0.96,
    throttleResp: 14.2, stockTurbo: true, stockBoostPsi: 18, antiLag: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.99, subLvl: 0.48, bodyLvl: 0.44, growlLvl: 0.27, filterBase: 200, filterMax: 1080, wobbleHz: 0, wobbleAmt: 0, airLvl: 0.065, warmth: 6 }
  },
  rover_ajv8: {
    id: "rover_ajv8", name: "4.4L Supercharged AJ-V8 (Range Rover Factory)", layout: "4.4L Supercharged V8",
    price: 19500, fuelType: "petrol", stockHp: 396, baseTorqueNm: 560,
    peakTorqueRpm: 3500, redlineRpm: 6200, idleRpm: 680, basePitch: 0.64, heatRate: 0.88,
    throttleResp: 10.5, stockTurbo: true, stockBoostPsi: 12, antiLag: false, isSupercharged: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.503, bodyMult: 1.00, growlMult: 1.25, subLvl: 0.60, bodyLvl: 0.42, growlLvl: 0.24, filterBase: 165, filterMax: 840, wobbleHz: 6.0, wobbleAmt: 0.11, airLvl: 0.045, warmth: 5 }
  },
  nissan_vr38: {
    id: "nissan_vr38", name: "3.8L VR38DETT Twin-Turbo V6 (GT-R R35 Factory)", layout: "3.8L Twin-Turbo 60° V6",
    price: 26500, fuelType: "petrol", stockHp: 565, baseTorqueNm: 637,
    peakTorqueRpm: 3800, redlineRpm: 7100, idleRpm: 820, basePitch: 0.92, heatRate: 0.94,
    throttleResp: 15.0, stockTurbo: true, stockBoostPsi: 17, antiLag: true, isTwinTurbo: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.498, subLvl: 0.58, bodyLvl: 0.46, growlLvl: 0.30, filterBase: 190, filterMax: 1120, wobbleHz: 4.0, wobbleAmt: 0.07, airLvl: 0.068, warmth: 6 }
  },
  toyota_2jz: {
    id: "toyota_2jz", name: "3.0L 2JZ-GTE Twin-Turbo I6 (TT Legend)", layout: "3.0L Twin-Turbo Inline-6",
    price: 24000, fuelType: "petrol", stockHp: 395, baseTorqueNm: 525,
    peakTorqueRpm: 4500, redlineRpm: 7800, idleRpm: 940, basePitch: 0.98, heatRate: 1.12,
    throttleResp: 13.8, stockTurbo: true, stockBoostPsi: 18, antiLag: true, isTwinTurbo: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.75, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.50, bodyLvl: 0.48, growlLvl: 0.28, filterBase: 195, filterMax: 1140, wobbleHz: 0, wobbleAmt: 0, airLvl: 0.062, warmth: 5 }
  },
  kamaz_740: {
    id: "kamaz_740", name: "10.8L KamAZ-740 Twin-Turbo V8 Diesel", layout: "10.8L Heavy TT V8 Diesel",
    price: 28000, fuelType: "diesel", stockHp: 270, baseTorqueNm: 850,
    peakTorqueRpm: 1450, redlineRpm: 2700, idleRpm: 540, basePitch: 0.44, heatRate: 0.72,
    throttleResp: 5.2, stockTurbo: true, stockBoostPsi: 14, antiLag: false, isTwinTurbo: true,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.49, bodyMult: 0.98, growlMult: 1.24, subLvl: 0.68, bodyLvl: 0.36, growlLvl: 0.24, filterBase: 100, filterMax: 460, wobbleHz: 11.0, wobbleAmt: 0.20, airLvl: 0.055, warmth: 8 }
  },
  kamaz_7403: {
    id: "kamaz_7403", name: "10.8L KamAZ-7403 Armor Turbo V8 (BTR-80 Factory)", layout: "10.8L Armored V8 Diesel",
    price: 22000, fuelType: "diesel", stockHp: 260, baseTorqueNm: 790,
    peakTorqueRpm: 1600, redlineRpm: 2900, idleRpm: 580, basePitch: 0.48, heatRate: 0.66,
    throttleResp: 6.4, stockTurbo: true, stockBoostPsi: 14, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.32, subLvl: 0.64, bodyLvl: 0.40, growlLvl: 0.24, filterBase: 110, filterMax: 510, wobbleHz: 9.5, wobbleAmt: 0.16, airLvl: 0.05, warmth: 7 }
  },
  d12a_v12: {
    id: "d12a_v12", name: "38.8L D12A-525 Tank V12 Diesel (MAZ-537 Factory)", layout: "38.8L Tank V12 Diesel",
    price: 36000, fuelType: "diesel", stockHp: 525, baseTorqueNm: 2150,
    peakTorqueRpm: 1350, redlineRpm: 2200, idleRpm: 480, basePitch: 0.38, heatRate: 0.64,
    throttleResp: 4.4, stockTurbo: true, stockBoostPsi: 15, antiLag: false, isTwinTurbo: true,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.72, bodyLvl: 0.46, growlLvl: 0.28, filterBase: 95, filterMax: 440, wobbleHz: 6.5, wobbleAmt: 0.14, airLvl: 0.065, warmth: 9 }
  },
  deutz_71: {
    id: "deutz_71", name: "7.1L Deutz Turbo-Diesel I6 (Lambo Tractor)", layout: "7.1L Agricultural Turbo-Diesel",
    price: 12000, fuelType: "diesel", stockHp: 270, baseTorqueNm: 1080,
    peakTorqueRpm: 1450, redlineRpm: 2400, idleRpm: 560, basePitch: 0.45, heatRate: 0.60,
    throttleResp: 5.5, stockTurbo: true, stockBoostPsi: 14, antiLag: false,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.48, subLvl: 0.66, bodyLvl: 0.42, growlLvl: 0.24, filterBase: 105, filterMax: 470, wobbleHz: 11.5, wobbleAmt: 0.22, airLvl: 0.05, warmth: 8 }
  },
  renault_09t: {
    id: "renault_09t", name: "0.9L TCe 3-Cylinder (Dacia Sandero Factory)", layout: "0.9L 3-Cyl Economy Turbo",
    price: 1500, fuelType: "petrol", stockHp: 90, baseTorqueNm: 140,
    peakTorqueRpm: 2600, redlineRpm: 5800, idleRpm: 820, basePitch: 1.15, heatRate: 0.76,
    throttleResp: 9.8, stockTurbo: true, stockBoostPsi: 9, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.44, bodyLvl: 0.48, growlLvl: 0.22, filterBase: 190, filterMax: 890, wobbleHz: 14.5, wobbleAmt: 0.14, airLvl: 0.045, warmth: 5 }
  },
  jeep_36v6: {
    id: "jeep_36v6", name: "3.6L Pentastar V6 (Jeep Wrangler Factory)", layout: "3.6L DOHC 60° V6 Petrol",
    price: 11200, fuelType: "petrol", stockHp: 285, baseTorqueNm: 365,
    peakTorqueRpm: 4200, redlineRpm: 6400, idleRpm: 740, basePitch: 0.88, heatRate: 0.82,
    throttleResp: 12.2, stockTurbo: false, stockBoostPsi: 0, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.54, bodyLvl: 0.46, growlLvl: 0.26, filterBase: 175, filterMax: 960, wobbleHz: 3.0, wobbleAmt: 0.05, airLvl: 0.055, warmth: 5 }
  },
  toyota_15b: {
    id: "toyota_15b", name: "4.1L Toyota 15B-FTE Turbo-Diesel (Mega Cruiser)", layout: "4.1L Heavy Inline-4 Diesel",
    price: 14800, fuelType: "diesel", stockHp: 170, baseTorqueNm: 420,
    peakTorqueRpm: 1800, redlineRpm: 3800, idleRpm: 620, basePitch: 0.60, heatRate: 0.68,
    throttleResp: 7.4, stockTurbo: true, stockBoostPsi: 14, antiLag: false,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.98, subLvl: 0.62, bodyLvl: 0.40, growlLvl: 0.24, filterBase: 125, filterMax: 580, wobbleHz: 10.0, wobbleAmt: 0.16, airLvl: 0.052, warmth: 7 }
  },
  v84ms_v12: {
    id: "v84ms_v12", name: "38.8L V-84MS Supercharged V12 (T-72B Factory)", layout: "38.8L Centrifugal-Blown Tank V12",
    price: 42000, fuelType: "diesel", stockHp: 840, baseTorqueNm: 3340,
    peakTorqueRpm: 1350, redlineRpm: 2250, idleRpm: 580, basePitch: 0.40, heatRate: 0.52,
    throttleResp: 6.2, stockTurbo: true, stockBoostPsi: 16, antiLag: false,
    soundProfile: { subWave: "sine", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.78, bodyLvl: 0.46, growlLvl: 0.30, filterBase: 92, filterMax: 460, wobbleHz: 7.5, wobbleAmt: 0.18, airLvl: 0.075, warmth: 10 }
  },
  porsche_f6_tt: {
    id: "porsche_f6_tt", name: "3.0L Twin-Turbo Flat-6 (911 Dakar)", layout: "3.0L Twin-Turbo Boxer-6",
    price: 26500, fuelType: "petrol", stockHp: 480, baseTorqueNm: 570,
    peakTorqueRpm: 4200, redlineRpm: 7500, idleRpm: 880, basePitch: 1.18, heatRate: 0.92,
    throttleResp: 14.5, stockTurbo: true, isTwinTurbo: true, stockBoostPsi: 18, antiLag: true,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.42, bodyLvl: 0.54, growlLvl: 0.38, filterBase: 220, filterMax: 1220, wobbleHz: 15.5, wobbleAmt: 0.18, airLvl: 0.055, warmth: 5 }
  },
  toyota_1hz_bus: {
    id: "toyota_1hz_bus", name: "4.2L 1HD-T Inline-6 Commercial Diesel (Coaster)", layout: "4.2L Turbodiesel I6",
    price: 11200, fuelType: "diesel", stockHp: 210, baseTorqueNm: 460,
    peakTorqueRpm: 2000, redlineRpm: 4200, idleRpm: 720, basePitch: 0.66, heatRate: 0.62,
    throttleResp: 7.5, stockTurbo: true, stockBoostPsi: 13, antiLag: false,
    soundProfile: { subWave: "triangle", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.96, subLvl: 0.60, bodyLvl: 0.42, growlLvl: 0.24, filterBase: 135, filterMax: 620, wobbleHz: 10.5, wobbleAmt: 0.14, airLvl: 0.050, warmth: 7 }
  },
  mdv16_diesel: {
    id: "mdv16_diesel", name: "Vorderblock-Diesel MDV-16 (1,600 HP Mechanical V16)", layout: "EMP-Hard Mechanical V16 Diesel",
    price: 95000, fuelType: "diesel", stockHp: 1600, baseTorqueNm: 5400,
    peakTorqueRpm: 1650, redlineRpm: 2450, idleRpm: 600, basePitch: 0.46, heatRate: 0.42,
    throttleResp: 7.8, stockTurbo: true, isTwinTurbo: true, stockBoostPsi: 22, antiLag: false,
    soundProfile: { subWave: "sawtooth", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 2.00, subLvl: 0.88, bodyLvl: 0.58, growlLvl: 0.42, filterBase: 125, filterMax: 680, wobbleHz: 14.0, wobbleAmt: 0.20, airLvl: 0.095, warmth: 12 }
  },
  pindad_215_td: {
    id: "pindad_215_td", name: "Pindad 5.2L Intercooled Turbodiesel (215 HP)", layout: "Inline-4 Tactical Turbodiesel",
    price: 11500, fuelType: "diesel", stockHp: 215, baseTorqueNm: 760,
    peakTorqueRpm: 1600, redlineRpm: 3200, idleRpm: 720, basePitch: 0.72, heatRate: 0.65,
    throttleResp: 6.4, stockTurbo: true, isTwinTurbo: false, stockBoostPsi: 18, antiLag: false,
    soundProfile: { subWave: "sawtooth", bodyWave: "triangle", growlWave: "sawtooth", subMult: 0.50, bodyMult: 1.00, growlMult: 1.50, subLvl: 0.62, bodyLvl: 0.48, growlLvl: 0.28, filterBase: 165, filterMax: 740, wobbleHz: 9.2, wobbleAmt: 0.14, airLvl: 0.055, warmth: 6 }
  },
  cat_c13_711: {
    id: "cat_c13_711", name: "Caterpillar C13 12.5L Diesel (711 HP / 2,714 Nm)", layout: "Inline-6 Heavy Turbo Diesel",
    price: 42000, fuelType: "diesel", stockHp: 711, baseTorqueNm: 2714,
    peakTorqueRpm: 1500, redlineRpm: 2350, idleRpm: 620, basePitch: 0.54, heatRate: 0.56,
    throttleResp: 7.4, stockTurbo: true, isTwinTurbo: true, stockBoostPsi: 24, antiLag: false,
    soundProfile: { subWave: "sawtooth", bodyWave: "sawtooth", growlWave: "triangle", subMult: 0.50, bodyMult: 1.00, growlMult: 1.98, subLvl: 0.80, bodyLvl: 0.54, growlLvl: 0.34, filterBase: 135, filterMax: 660, wobbleHz: 11.8, wobbleAmt: 0.16, airLvl: 0.080, warmth: 9 }
  }
};

KK.VEHICLES = {
  uaz452: {
    id: "uaz452", brand: "uaz", name: '1984 UAZ-452 "Bukhanka"', category: "Starter Soviet Cab-Over Van",
    suspensionType: "Front/Rear Leaf Springs (Soft, Bouncy, High Roll)",
    price: 0, color: "#556b52", accentColor: "#2b302a", massKg: 1880, cargoSlots: 3, enclosedCargo: true,
    bodyLen: 4.36, bodyWidth: 1.94, bodyHeight: 1.92, cogOffsetY: 0.52, intakeHeight: 0.90,
    fuelCapacity: 65, stockEngineId: "umz_24",
    compatibleEngines: ["umz_24", "mitsu_4d56", "toyota_1gd", "subaru_ej257", "toyota_2jz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: false, hasFactoryFrontLock: false,
    defaultFinalDrive: 4.62, defaultGears: [4.12, 2.64, 1.58, 1.00],
    wheelRadius: 0.40, wheelWidth: 0.23, restLength: 0.44, maxTravel: 0.34,
    baseSpringK: 29500, baseDamperC: 2700, baseAntiRoll: 3600, maxSteerDeg: 31, brakeForce: 14500,
    bedOffset: { x: 0, y: 0.75, z: -0.65 },
    wheels: [
      { id: "FL", x: -0.92, y: 0.24, z:  1.24, steer: true,  axle: "front" },
      { id: "FR", x:  0.92, y: 0.24, z:  1.24, steer: true,  axle: "front" },
      { id: "RL", x: -0.92, y: 0.24, z: -1.18, steer: false, axle: "rear"  },
      { id: "RR", x:  0.92, y: 0.24, z: -1.18, steer: false, axle: "rear"  }
    ],
    desc: "82 HP carbureted 4-speed loaf van on squishy leaf springs. Cheap, iconic, hilarious to roll."
  },
  jimny: {
    id: "jimny", brand: "suzuki", name: "Suzuki Jimny JB74", category: "Featherweight Mountain Goat",
    suspensionType: "3-Link Rigid Axles w/ Supple Articulating Coils",
    price: 12500, color: "#c5d636", accentColor: "#1b1e22", massKg: 1110, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 3.56, bodyWidth: 1.66, bodyHeight: 1.58, cogOffsetY: 0.28, intakeHeight: 0.96,
    fuelCapacity: 45, stockEngineId: "suzuki_k15b",
    compatibleEngines: ["suzuki_k15b", "mitsu_4d56", "mitsu_4g63t", "toyota_1gd"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: false, hasFactoryFrontLock: false,
    defaultFinalDrive: 4.09, defaultGears: [4.42, 2.30, 1.67, 1.19, 1.00],
    wheelRadius: 0.39, wheelWidth: 0.22, restLength: 0.45, maxTravel: 0.38,
    baseSpringK: 23500, baseDamperC: 3100, baseAntiRoll: 5200, maxSteerDeg: 52, agileSteer: true, brakeForce: 17500,
    bedOffset: { x: 0, y: 0.68, z: -0.78 },
    wheels: [
      { id: "FL", x: -0.84, y: 0.24, z:  1.14, steer: true,  axle: "front" },
      { id: "FR", x:  0.84, y: 0.24, z:  1.14, steer: true,  axle: "front" },
      { id: "RL", x: -0.84, y: 0.24, z: -1.10, steer: false, axle: "rear"  },
      { id: "RR", x:  0.84, y: 0.24, z: -1.10, steer: false, axle: "rear"  }
    ],
    desc: "105 HP 6,600 RPM screamer weighing only 1,110 kg! Dances across rickety wooden bridges."
  },
  delica: {
    id: "delica", brand: "mitsubishi", name: "Mitsubishi Delica L300 4x4", category: "JDM Cab-Over Alpine Van",
    suspensionType: "Pajero Front Torsion Bars + Plush Long-Travel Rear",
    price: 14000, color: "#234f42", accentColor: "#98a1a8", massKg: 1760, cargoSlots: 4, enclosedCargo: true,
    bodyLen: 4.28, bodyWidth: 1.78, bodyHeight: 1.84, cogOffsetY: 0.40, intakeHeight: 1.00,
    fuelCapacity: 75, stockEngineId: "mitsu_4d56",
    compatibleEngines: ["mitsu_4d56", "mitsu_4g63t", "toyota_1gd", "toyota_1hz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: false, hasFactoryFrontLock: false,
    defaultFinalDrive: 4.87, defaultGears: [3.96, 2.14, 1.36, 1.00, 0.85],
    wheelRadius: 0.41, wheelWidth: 0.25, restLength: 0.48, maxTravel: 0.39,
    baseSpringK: 35000, baseDamperC: 4400, baseAntiRoll: 6400, maxSteerDeg: 47, agileSteer: true, brakeForce: 19000,
    bedOffset: { x: 0, y: 0.72, z: -0.60 },
    wheels: [
      { id: "FL", x: -0.88, y: 0.24, z:  1.26, steer: true,  axle: "front" },
      { id: "FR", x:  0.88, y: 0.24, z:  1.26, steer: true,  axle: "front" },
      { id: "RL", x: -0.88, y: 0.24, z: -1.10, steer: false, axle: "rear"  },
      { id: "RR", x:  0.88, y: 0.24, z: -1.10, steer: false, axle: "rear"  }
    ],
    desc: "112 HP 4D56T turbo-diesel on Pajero 4x4 gear. Plush pothole ride, tight turning, enclosed cargo."
  },
  hilux: {
    id: "hilux", brand: "toyota", name: "Toyota Hilux N70 (2.8L)", category: "Balanced Mid-Size 4x4 Pickup",
    suspensionType: "IFS Double-Wishbone Coilovers / Heavy Rear Leafs",
    price: 18500, color: "#dfe4ea", accentColor: "#22272e", massKg: 2080, cargoSlots: 5, enclosedCargo: false,
    bodyLen: 5.26, bodyWidth: 1.88, bodyHeight: 1.52, cogOffsetY: 0.24, intakeHeight: 1.08,
    fuelCapacity: 80, stockEngineId: "toyota_1gd",
    compatibleEngines: ["toyota_1gd", "toyota_1hz", "toyota_1vd", "toyota_2jz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: false,
    defaultFinalDrive: 3.91, defaultGears: [4.31, 2.33, 1.44, 1.00, 0.84, 0.70],
    wheelRadius: 0.43, wheelWidth: 0.27, restLength: 0.47, maxTravel: 0.40,
    baseSpringK: 46000, baseDamperC: 5600, baseAntiRoll: 10800, maxSteerDeg: 47, agileSteer: true, brakeForce: 24500,
    bedOffset: { x: 0, y: 0.84, z: -1.62 },
    wheels: [
      { id: "FL", x: -0.95, y: 0.24, z:  1.68, steer: true,  axle: "front" },
      { id: "FR", x:  0.95, y: 0.24, z:  1.68, steer: true,  axle: "front" },
      { id: "RL", x: -0.95, y: 0.24, z: -1.56, steer: false, axle: "rear"  },
      { id: "RR", x:  0.95, y: 0.24, z: -1.56, steer: false, axle: "rear"  }
    ],
    desc: "204 HP / 500 Nm 1GD-FTV 6-speed pickup with planted IFS coilovers & factory rear diff-lock."
  },
  wrx: {
    id: "wrx", brand: "subaru", name: "2005 Subaru Impreza WRX STI", category: "AWD Rally Express Legend",
    suspensionType: "Inverted Rally Struts w/ Symmetrical AWD Gravel Spec",
    price: 26500, color: "#1546b8", accentColor: "#d4af37", massKg: 1470, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 4.46, bodyWidth: 1.80, bodyHeight: 1.38, cogOffsetY: 0.14, intakeHeight: 0.84,
    fuelCapacity: 60, stockEngineId: "subaru_ej257",
    compatibleEngines: ["subaru_ej257", "mitsu_4g63t", "toyota_2jz"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 3.90, defaultGears: [3.63, 2.37, 1.76, 1.34, 0.97, 0.76],
    wheelRadius: 0.36, wheelWidth: 0.26, restLength: 0.38, maxTravel: 0.32,
    baseSpringK: 44000, baseDamperC: 5800, baseAntiRoll: 13500, maxSteerDeg: 50, agileSteer: true, brakeForce: 26000,
    bedOffset: { x: 0, y: 0.65, z: -1.30 },
    wheels: [
      { id: "FL", x: -0.90, y: 0.25, z:  1.32, steer: true,  axle: "front" },
      { id: "FR", x:  0.90, y: 0.25, z:  1.32, steer: true,  axle: "front" },
      { id: "RL", x: -0.90, y: 0.25, z: -1.28, steer: false, axle: "rear"  },
      { id: "RR", x:  0.90, y: 0.25, z: -1.28, steer: false, axle: "rear"  }
    ],
    desc: "305 HP EJ257 Boxer Turbo w/ anti-lag pops, gold 5-spoke rally wheels, big hood scoop & STI wing!"
  },
  evo: {
    id: "evo", brand: "mitsubishi", name: "2006 Mitsubishi Lancer Evo IX", category: "AWD Tarmac & Gravel Weapon",
    suspensionType: "Bilstein Rally Coilovers + Active Yaw Control (AYC)",
    price: 28500, color: "#c91c22", accentColor: "#1a1d22", massKg: 1440, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 4.49, bodyWidth: 1.82, bodyHeight: 1.36, cogOffsetY: 0.13, intakeHeight: 0.82,
    fuelCapacity: 58, stockEngineId: "mitsu_4g63t",
    compatibleEngines: ["mitsu_4g63t", "subaru_ej257", "toyota_2jz"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.53, defaultGears: [2.93, 1.95, 1.41, 1.03, 0.72],
    wheelRadius: 0.36, wheelWidth: 0.27, restLength: 0.37, maxTravel: 0.31,
    baseSpringK: 48500, baseDamperC: 6400, baseAntiRoll: 15200, maxSteerDeg: 52, agileSteer: true, brakeForce: 27500,
    bedOffset: { x: 0, y: 0.65, z: -1.32 },
    wheels: [
      { id: "FL", x: -0.91, y: 0.25, z:  1.34, steer: true,  axle: "front" },
      { id: "FR", x:  0.91, y: 0.25, z:  1.34, steer: true,  axle: "front" },
      { id: "RL", x: -0.91, y: 0.25, z: -1.30, steer: false, axle: "rear"  },
      { id: "RR", x:  0.91, y: 0.25, z: -1.30, steer: false, axle: "rear"  }
    ],
    desc: "295 HP 7,600 RPM 4G63T turbo screamer with razor-sharp turn-in, vented hood & carbon Evo wing!"
  },
  lc79: {
    id: "lc79", brand: "toyota", name: "Toyota Land Cruiser 79 Pickup", category: "Heavy-Duty Solid-Axle Legend",
    suspensionType: "Solid Live Axles + Long-Travel HD Coils & 11-Leaf Rear",
    price: 32000, color: "#c9b386", accentColor: "#252624", massKg: 2620, cargoSlots: 7, enclosedCargo: false,
    bodyLen: 5.42, bodyWidth: 1.94, bodyHeight: 1.68, cogOffsetY: 0.30, intakeHeight: 1.22,
    fuelCapacity: 130, stockEngineId: "toyota_1vd",
    compatibleEngines: ["toyota_1vd", "toyota_1hz", "toyota_1gd", "rover_ajv8", "toyota_2jz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.30, defaultGears: [4.53, 2.46, 1.49, 1.00, 0.82],
    wheelRadius: 0.48, wheelWidth: 0.31, restLength: 0.56, maxTravel: 0.48,
    baseSpringK: 62000, baseDamperC: 6800, baseAntiRoll: 9600, maxSteerDeg: 35, brakeForce: 28000,
    bedOffset: { x: 0, y: 0.94, z: -1.45 },
    wheels: [
      { id: "FL", x: -1.00, y: 0.26, z:  1.72, steer: true,  axle: "front" },
      { id: "FR", x:  1.00, y: 0.26, z:  1.72, steer: true,  axle: "front" },
      { id: "RL", x: -1.00, y: 0.26, z: -1.54, steer: false, axle: "rear"  },
      { id: "RR", x:  1.00, y: 0.26, z: -1.54, steer: false, axle: "rear"  }
    ],
    desc: "235 HP / 560 Nm Twin-Turbo V8 diesel workhorse with twin factory diff-locks & steel tray."
  },
  rangerover: {
    id: "rangerover", brand: "landrover", name: "2008 Range Rover Vogue V8 (L322)", category: "Luxury British V8 Off-Roader",
    suspensionType: "Cross-Linked Air Suspension (Ultra-Plush Pothole Soak)",
    price: 38500, color: "#193329", accentColor: "#c8cfd6", massKg: 2480, cargoSlots: 4, enclosedCargo: true,
    bodyLen: 4.96, bodyWidth: 1.98, bodyHeight: 1.76, cogOffsetY: 0.28, intakeHeight: 1.12,
    fuelCapacity: 105, stockEngineId: "rover_ajv8",
    compatibleEngines: ["rover_ajv8", "toyota_1vd", "toyota_2jz"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: false,
    defaultFinalDrive: 3.73, defaultGears: [4.17, 2.34, 1.52, 1.14, 0.87, 0.69],
    wheelRadius: 0.44, wheelWidth: 0.29, restLength: 0.50, maxTravel: 0.44,
    baseSpringK: 48000, baseDamperC: 6900, baseAntiRoll: 12200, maxSteerDeg: 44, agileSteer: true, brakeForce: 29500,
    bedOffset: { x: 0, y: 0.78, z: -1.35 },
    wheels: [
      { id: "FL", x: -0.99, y: 0.25, z:  1.52, steer: true,  axle: "front" },
      { id: "FR", x:  0.99, y: 0.25, z:  1.52, steer: true,  axle: "front" },
      { id: "RL", x: -0.99, y: 0.25, z: -1.42, steer: false, axle: "rear"  },
      { id: "RR", x:  0.99, y: 0.25, z: -1.42, steer: false, axle: "rear"  }
    ],
    desc: "396 HP Supercharged 4.4L V8 aristocrat on buttery air suspension with signature supercharger whine."
  },
  humvee: {
    id: "humvee", brand: "amgeneral", name: "AM General M998 Humvee", category: "Ultra-Wide Military Tactical 4x4",
    suspensionType: "Portal-Axle Geared Hubs + Heavy Independent Double-Wishbone",
    price: 35500, color: "#8c7f63", accentColor: "#242622", massKg: 2950, cargoSlots: 5, enclosedCargo: false,
    bodyLen: 4.72, bodyWidth: 2.18, bodyHeight: 1.76, cogOffsetY: 0.22, intakeHeight: 1.45,
    fuelCapacity: 115, stockEngineId: "detroit_65v8",
    compatibleEngines: ["detroit_65v8", "toyota_1vd", "rover_ajv8", "nissan_vr38", "kamaz_740"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.56, defaultGears: [3.85, 2.24, 1.44, 1.00, 0.78],
    wheelRadius: 0.49, wheelWidth: 0.33, restLength: 0.54, maxTravel: 0.45,
    baseSpringK: 64000, baseDamperC: 7200, baseAntiRoll: 14500, maxSteerDeg: 37, brakeForce: 32000,
    bedOffset: { x: 0, y: 0.96, z: -1.32 },
    wheels: [
      { id: "FL", x: -1.09, y: 0.28, z:  1.65, steer: true,  axle: "front" },
      { id: "FR", x:  1.09, y: 0.28, z:  1.65, steer: true,  axle: "front" },
      { id: "RL", x: -1.09, y: 0.28, z: -1.65, steer: false, axle: "rear"  },
      { id: "RR", x:  1.09, y: 0.28, z: -1.65, steer: false, axle: "rear"  }
    ],
    desc: "Ultra-wide 2.18m military beast with 6.5L V8 Diesel, portal axles, twin lockers, brush guard & almost zero rollover risk on cliff switchbacks!"
  },
  gtr_r35: {
    id: "gtr_r35", brand: "nissan", name: 'Nissan GT-R R35 "Godzilla Safari" Rally', category: "Twin-Turbo Rally-Raid Supercar",
    suspensionType: "Raised Long-Travel Rally-Raid Bilstein Dampers + ATTESA E-TS AWD",
    price: 46500, color: "#d6dce3", accentColor: "#c81d25", massKg: 1680, cargoSlots: 3, enclosedCargo: true,
    bodyLen: 4.72, bodyWidth: 1.94, bodyHeight: 1.40, cogOffsetY: 0.14, intakeHeight: 0.95,
    fuelCapacity: 78, stockEngineId: "nissan_vr38",
    compatibleEngines: ["nissan_vr38", "toyota_2jz", "rover_ajv8"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 3.70, defaultGears: [4.05, 2.30, 1.59, 1.24, 1.00, 0.79],
    wheelRadius: 0.40, wheelWidth: 0.30, restLength: 0.43, maxTravel: 0.36,
    baseSpringK: 52000, baseDamperC: 6800, baseAntiRoll: 15800, maxSteerDeg: 50, agileSteer: true, brakeForce: 34000,
    bedOffset: { x: 0, y: 0.68, z: -1.25 },
    wheels: [
      { id: "FL", x: -0.97, y: 0.26, z:  1.42, steer: true,  axle: "front" },
      { id: "FR", x:  0.97, y: 0.26, z:  1.42, steer: true,  axle: "front" },
      { id: "RL", x: -0.97, y: 0.26, z: -1.36, steer: false, axle: "rear"  },
      { id: "RR", x:  0.97, y: 0.26, z: -1.36, steer: false, axle: "rear"  }
    ],
    desc: "565 HP VR38DETT Twin-Turbo V6 Rally-Spec Godzilla! Wide carbon flares, quad rally hood lights, roof spare tire, swan-neck GT wing & iconic quad round taillights."
  },
  fortuner: {
    id: "fortuner", brand: "toyota", name: "Toyota Fortuner 2.8L Overland", category: "Agile Diesel Touge & Overland SUV",
    suspensionType: "Tuned IFS Coilovers + 4-Link Rear Coil Suspension",
    price: 24500, color: "#e8ecef", accentColor: "#1f252b", massKg: 2140, cargoSlots: 4, enclosedCargo: true,
    bodyLen: 4.82, bodyWidth: 1.88, bodyHeight: 1.72, cogOffsetY: 0.26, intakeHeight: 1.10,
    fuelCapacity: 82, stockEngineId: "toyota_1gd",
    compatibleEngines: ["toyota_1gd", "toyota_1vd", "toyota_1hz", "toyota_2jz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: false,
    defaultFinalDrive: 3.91, defaultGears: [4.31, 2.33, 1.44, 1.00, 0.84, 0.70],
    wheelRadius: 0.43, wheelWidth: 0.27, restLength: 0.47, maxTravel: 0.40,
    baseSpringK: 47000, baseDamperC: 5900, baseAntiRoll: 11800, maxSteerDeg: 49, agileSteer: true, brakeForce: 26000,
    bedOffset: { x: 0, y: 0.76, z: -1.30 },
    wheels: [
      { id: "FL", x: -0.94, y: 0.24, z:  1.46, steer: true,  axle: "front" },
      { id: "FR", x:  0.94, y: 0.24, z:  1.46, steer: true,  axle: "front" },
      { id: "RL", x: -0.94, y: 0.24, z: -1.42, steer: false, axle: "rear"  },
      { id: "RR", x:  0.94, y: 0.24, z: -1.42, steer: false, axle: "rear"  }
    ],
    desc: "Agile 2.8L 1GD-FTV 6-speed SUV built for Southern Touge hairpins & deep trails. Features roof rack, expedition tent, rear locker & crisp turn-in!"
  },
  patrol_y61: {
    id: "patrol_y61", brand: "nissan", name: "Nissan Patrol Y61 Super Safari (TB48)", category: "Desert Dune King & Solid-Axle SUV",
    suspensionType: "Heavy Live Solid Axles + Long-Travel Desert Coils (Front/Rear Lockers)",
    price: 29500, color: "#f0efe9", accentColor: "#b89f6d", massKg: 2380, cargoSlots: 5, enclosedCargo: true,
    bodyLen: 5.04, bodyWidth: 1.94, bodyHeight: 1.84, cogOffsetY: 0.28, intakeHeight: 1.18,
    fuelCapacity: 135, stockEngineId: "nissan_tb48",
    compatibleEngines: ["nissan_tb48", "toyota_1vd", "toyota_2jz", "nissan_vr38"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.11, defaultGears: [4.35, 2.52, 1.52, 1.00, 0.81],
    wheelRadius: 0.46, wheelWidth: 0.30, restLength: 0.53, maxTravel: 0.46,
    baseSpringK: 54000, baseDamperC: 6400, baseAntiRoll: 11200, maxSteerDeg: 45, agileSteer: true, brakeForce: 29000,
    bedOffset: { x: 0, y: 0.78, z: -1.35 },
    wheels: [
      { id: "FL", x: -0.97, y: 0.25, z:  1.54, steer: true,  axle: "front" },
      { id: "FR", x:  0.97, y: 0.25, z:  1.54, steer: true,  axle: "front" },
      { id: "RL", x: -0.97, y: 0.25, z: -1.46, steer: false, axle: "rear"  },
      { id: "RR", x:  0.97, y: 0.25, z: -1.46, steer: false, axle: "rear"  }
    ],
    desc: "Legendary 4.8L TB48 Inline-6 Super Safari! Twin factory diff-locks, 135L dual fuel tank, roof rack & orange sand boards — built to shred the Red Sands Desert & outrun the 15x Sandwyrm!"
  },
  btr80: {
    id: "btr80", brand: "gaz", rearEngine: true, name: "Demilitarized BTR-80 8x8 Amphibious", category: "Amphibious 8x8 Rescue APC",
    suspensionType: "8-Wheel Independent Torsion-Bar Armor Suspension (4-Wheel Front Steer!)",
    price: 49000, color: "#4d5e48", accentColor: "#d98218", massKg: 5800, cargoSlots: 5, enclosedCargo: true,
    amphibious: true,
    bodyLen: 7.55, bodyWidth: 2.78, bodyHeight: 2.24, cogOffsetY: 0.30, intakeHeight: 2.40,
    fuelCapacity: 290, stockEngineId: "kamaz_7403",
    compatibleEngines: ["kamaz_7403", "kamaz_740", "d12a_v12", "toyota_1vd"],
    driveType: "8WD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.45, defaultGears: [5.62, 3.15, 1.98, 1.28, 0.85],
    wheelRadius: 0.56, wheelWidth: 0.36, restLength: 0.56, maxTravel: 0.44,
    baseSpringK: 86000, baseDamperC: 9600, baseAntiRoll: 24000, maxSteerDeg: 35, brakeForce: 58000,
    bedOffset: { x: 0, y: 1.15, z: -0.60 },
    wheels: [
      { id: "F1L", x: -1.34, y: 0.26, z:  2.45, steer: true,  steerScale: 1.00, axle: "front" },
      { id: "F1R", x:  1.34, y: 0.26, z:  2.45, steer: true,  steerScale: 1.00, axle: "front" },
      { id: "F2L", x: -1.34, y: 0.26, z:  0.88, steer: true,  steerScale: 0.58, axle: "front2" },
      { id: "F2R", x:  1.34, y: 0.26, z:  0.88, steer: true,  steerScale: 0.58, axle: "front2" },
      { id: "R1L", x: -1.34, y: 0.26, z: -0.82, steer: false, axle: "rear" },
      { id: "R1R", x:  1.34, y: 0.26, z: -0.82, steer: false, axle: "rear" },
      { id: "R2L", x: -1.34, y: 0.26, z: -2.35, steer: false, axle: "rear2" },
      { id: "R2R", x:  1.34, y: 0.26, z: -2.35, steer: false, axle: "rear2" }
    ],
    desc: "ACTUALLY AMPHIBIOUS 8x8 rescue beast! Floats & waterjet-drives straight across the Great Krasnaya River without bridges or hydrolocking!"
  },
  maz537: {
    id: "maz537", brand: "maz", name: "MAZ-537 8x8 Soviet Heavy Tractor", category: "Colossal 38.8L V12 8x8 Titan",
    suspensionType: "Heavy Front 4-Wheel Steer Torsion + Rear Walking-Beam Bogie",
    price: 74000, color: "#3b4734", accentColor: "#1b1f1a", massKg: 11800, cargoSlots: 14, enclosedCargo: false,
    canCarryLogsInBed: true,
    bodyLen: 8.95, bodyWidth: 2.86, bodyHeight: 2.84, cogOffsetY: 0.44, intakeHeight: 2.25,
    fuelCapacity: 420, stockEngineId: "d12a_v12",
    compatibleEngines: ["d12a_v12", "kamaz_740"],
    driveType: "8WD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 7.45, defaultGears: [6.80, 3.65, 2.20, 1.38, 0.92],
    wheelRadius: 0.69, wheelWidth: 0.48, restLength: 0.68, maxTravel: 0.52,
    baseSpringK: 175000, baseDamperC: 19500, baseAntiRoll: 42000, maxSteerDeg: 34, brakeForce: 96000,
    bedOffset: { x: 0, y: 1.50, z: -2.10 },
    wheels: [
      { id: "F1L", x: -1.38, y: 0.28, z:  3.05, steer: true,  steerScale: 1.00, axle: "front" },
      { id: "F1R", x:  1.38, y: 0.28, z:  3.05, steer: true,  steerScale: 1.00, axle: "front" },
      { id: "F2L", x: -1.38, y: 0.28, z:  1.15, steer: true,  steerScale: 0.55, axle: "front2" },
      { id: "F2R", x:  1.38, y: 0.28, z:  1.15, steer: true,  steerScale: 0.55, axle: "front2" },
      { id: "R1L", x: -1.38, y: 0.28, z: -1.45, steer: false, axle: "rear" },
      { id: "R1R", x:  1.38, y: 0.28, z: -1.45, steer: false, axle: "rear" },
      { id: "R2L", x: -1.38, y: 0.28, z: -3.25, steer: false, axle: "rear2" },
      { id: "R2R", x:  1.38, y: 0.28, z: -3.25, steer: false, axle: "rear2" }
    ],
    desc: "525 HP / 2,150 Nm 38.8L Tank V12 8x8 leviathan! Hauls 14 crates or Giant Logs through lethal mud like dry pavement — WILL shred wooden bridges!"
  },
  dacia_sandero: {
    id: "dacia_sandero", brand: "dacia", name: "Dacia Sandero (James May's Special)", category: "Good News! Compact Hatchback",
    suspensionType: "Sensible MacPherson Struts + Soft British Country Springs",
    price: 8200, color: "#9eb4c4", accentColor: "#262b30", massKg: 1060, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 4.06, bodyWidth: 1.74, bodyHeight: 1.46, cogOffsetY: 0.19, intakeHeight: 0.80,
    fuelCapacity: 50, stockEngineId: "renault_09t",
    compatibleEngines: ["renault_09t", "subaru_ej257", "mitsu_4g63t", "toyota_2jz", "nissan_vr38"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: false, hasFactoryFrontLock: false,
    defaultFinalDrive: 4.18, defaultGears: [3.72, 2.05, 1.32, 0.97, 0.76],
    wheelRadius: 0.34, wheelWidth: 0.21, restLength: 0.37, maxTravel: 0.30,
    baseSpringK: 27000, baseDamperC: 3500, baseAntiRoll: 7200, maxSteerDeg: 50, agileSteer: true, brakeForce: 19500,
    bedOffset: { x: 0, y: 0.62, z: -1.10 },
    wheels: [
      { id: "FL", x: -0.86, y: 0.24, z:  1.26, steer: true,  axle: "front" },
      { id: "FR", x:  0.86, y: 0.24, z:  1.26, steer: true,  axle: "front" },
      { id: "RL", x: -0.86, y: 0.24, z: -1.22, steer: false, axle: "rear"  },
      { id: "RR", x:  0.86, y: 0.24, z: -1.22, steer: false, axle: "rear"  }
    ],
    desc: "GOOD NEWS! James May's beloved Dacia Sandero! Nimble 1-ton hatchback — steal it outside Captain Slow's Pub or swap in a VR38DETT for ultimate sleeper chaos!"
  },
  jeep_wrangler: {
    id: "jeep_wrangler", brand: "jeep", name: "Jeep Wrangler Rubicon 4x4", category: "Trail-Rated Rock Crawler",
    suspensionType: "Dana 44 Solid Axles + Long-Travel Rock-Crawler Coils (Front/Rear Lockers)",
    price: 23500, color: "#d65a18", accentColor: "#1b1e22", massKg: 1890, cargoSlots: 3, enclosedCargo: true,
    bodyLen: 4.24, bodyWidth: 1.88, bodyHeight: 1.76, cogOffsetY: 0.27, intakeHeight: 1.12,
    fuelCapacity: 76, stockEngineId: "jeep_36v6",
    compatibleEngines: ["jeep_36v6", "toyota_1gd", "toyota_1vd", "rover_ajv8", "toyota_2jz"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.10, defaultGears: [4.46, 2.50, 1.56, 1.00, 0.80],
    wheelRadius: 0.45, wheelWidth: 0.30, restLength: 0.52, maxTravel: 0.46,
    baseSpringK: 42000, baseDamperC: 5400, baseAntiRoll: 8200, maxSteerDeg: 50, agileSteer: true, brakeForce: 25500,
    bedOffset: { x: 0, y: 0.74, z: -1.12 },
    wheels: [
      { id: "FL", x: -0.96, y: 0.25, z:  1.38, steer: true,  axle: "front" },
      { id: "FR", x:  0.96, y: 0.25, z:  1.38, steer: true,  axle: "front" },
      { id: "RL", x: -0.96, y: 0.25, z: -1.32, steer: false, axle: "rear"  },
      { id: "RR", x:  0.96, y: 0.25, z: -1.32, steer: false, axle: "rear"  }
    ],
    desc: "Iconic 7-slot Rubicon with 285 HP 3.6L V6, factory twin diff-locks, massive 46cm articulation, 50° tight steering & chunky 35\" tires!"
  },
  mega_cruiser: {
    id: "mega_cruiser", brand: "toyota", name: "Toyota Mega Cruiser (BXD20 4WS)", category: "Widebody 4-Wheel-Steer Portal Titan",
    suspensionType: "Portal-Hub Independent Double-Wishbone + Rear-Axle 4WS Counter-Steering!",
    price: 41500, color: "#4e5c4a", accentColor: "#222620", massKg: 2880, cargoSlots: 6, enclosedCargo: true,
    bodyLen: 5.09, bodyWidth: 2.17, bodyHeight: 2.075, cogOffsetY: 0.22, intakeHeight: 1.56,
    fuelCapacity: 130, stockEngineId: "toyota_15b",
    compatibleEngines: ["toyota_15b", "toyota_1vd", "nissan_tb48", "rover_ajv8", "nissan_vr38"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.56, defaultGears: [4.25, 2.38, 1.48, 1.00, 0.78],
    wheelRadius: 0.49, wheelWidth: 0.33, restLength: 0.56, maxTravel: 0.46,
    baseSpringK: 62000, baseDamperC: 7200, baseAntiRoll: 15500, maxSteerDeg: 42, agileSteer: true, brakeForce: 34000,
    bedOffset: { x: 0, y: 0.90, z: -1.35 },
    wheels: [
      { id: "FL", x: -1.09, y: 0.28, z:  1.70, steer: true, steerScale:  1.00, axle: "front" },
      { id: "FR", x:  1.09, y: 0.28, z:  1.70, steer: true, steerScale:  1.00, axle: "front" },
      { id: "RL", x: -1.09, y: 0.28, z: -1.695, steer: true, steerScale: -0.32, axle: "rear"  },
      { id: "RR", x:  1.09, y: 0.28, z: -1.695, steer: true, steerScale: -0.32, axle: "rear"  }
    ],
    desc: "Rare Japanese Humvee-rival! Ultra-wide 2.17m portal-axle chassis with TRUE 4-Wheel Counter-Steering (turns tighter than a compact!) & twin lockers."
  },
  lambo_tractor: {
    id: "lambo_tractor", brand: "lamborghini", name: "Lamborghini R8.270 (Clarkson's Tractor)", category: "Comically Giant Agricultural Beast",
    suspensionType: "Heavy Front Pivoting Beam + Colossal 2-Meter Rear Agricultural Lugs",
    price: 39000, color: "#edf2f5", accentColor: "#1b1f24", massKg: 6400, cargoSlots: 4, enclosedCargo: false,
    canCarryLogsInBed: true,
    bodyLen: 5.20, bodyWidth: 2.55, bodyHeight: 2.95, cogOffsetY: 0.48, intakeHeight: 2.15,
    fuelCapacity: 240, stockEngineId: "deutz_71",
    compatibleEngines: ["deutz_71", "kamaz_740", "d12a_v12", "nissan_vr38"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 6.80, defaultGears: [6.40, 3.85, 2.40, 1.52, 1.00],
    wheelRadius: 0.82, wheelWidth: 0.56, restLength: 0.56, maxTravel: 0.36,
    baseSpringK: 125000, baseDamperC: 14500, baseAntiRoll: 28000, maxSteerDeg: 46, brakeForce: 58000,
    bedOffset: { x: 0, y: 1.55, z: -1.55 },
    wheels: [
      { id: "FL", x: -1.16, y: 0.28, z:  1.65, steer: true,  axle: "front", radiusScale: 0.72 },
      { id: "FR", x:  1.16, y: 0.28, z:  1.65, steer: true,  axle: "front", radiusScale: 0.72 },
      { id: "RL", x: -1.24, y: 0.36, z: -1.35, steer: false, axle: "rear",  radiusScale: 1.15 },
      { id: "RR", x:  1.24, y: 0.36, z: -1.35, steer: false, axle: "rear",  radiusScale: 1.15 }
    ],
    desc: "\"I bought a Lamborghini!\" — 1,080 Nm of pure agricultural mud-shredding torque! Borrow Jeremy's right at Clarkson's Farm or buy your own."
  },
  t72: {
    id: "t72", brand: "uvz", name: "T-72B Main Battle Tank (Kontakt-1)", category: "43.5T Tracked Apex Counter-Threat",
    suspensionType: "12 Independent Torsion-Bar Roadwheels + Articulated Closed-Loop Steel Tracks",
    price: 75000, secretUnlock: true, isTracked: true, rearEngine: true,
    color: "#3d4c33", accentColor: "#242c1e", massKg: 43500, cargoSlots: 0, enclosedCargo: true,
    bodyLen: 6.95, bodyWidth: 3.59, bodyHeight: 2.23, cogOffsetY: 0.36, intakeHeight: 2.05,
    fuelCapacity: 1200, stockEngineId: "v84ms_v12",
    compatibleEngines: ["v84ms_v12", "d12a_v12"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.95, defaultGears: [6.80, 4.45, 3.05, 2.15, 1.52, 1.12, 0.85],
    wheelRadius: 0.44, wheelWidth: 0.58, restLength: 0.58, maxTravel: 0.48,
    baseSpringK: 265000, baseDamperC: 29500, baseAntiRoll: 155000, maxSteerDeg: 32, brakeForce: 340000,
    bedOffset: { x: 0, y: 1.5, z: -2.0 },
    wheels: [
      { id: "L1", x: -1.46, y: 0.46, z:  2.36, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "R1", x:  1.46, y: 0.46, z:  2.36, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "L2", x: -1.46, y: 0.46, z:  1.42, steer: true,  steerScale:  0.5, axle: "front2" },
      { id: "R2", x:  1.46, y: 0.46, z:  1.42, steer: true,  steerScale:  0.5, axle: "front2" },
      { id: "L3", x: -1.46, y: 0.46, z:  0.48, steer: false, axle: "mid"    },
      { id: "R3", x:  1.46, y: 0.46, z:  0.48, steer: false, axle: "mid"    },
      { id: "L4", x: -1.46, y: 0.46, z: -0.46, steer: false, axle: "mid2"   },
      { id: "R4", x:  1.46, y: 0.46, z: -0.46, steer: false, axle: "mid2"   },
      { id: "L5", x: -1.46, y: 0.46, z: -1.40, steer: false, axle: "rear"   },
      { id: "R5", x:  1.46, y: 0.46, z: -1.40, steer: false, axle: "rear"   },
      { id: "L6", x: -1.46, y: 0.46, z: -2.34, steer: true,  steerScale: -0.6, axle: "rear2"  },
      { id: "R6", x:  1.46, y: 0.46, z: -2.34, steer: true,  steerScale: -0.6, axle: "rear2"  }
    ],
    desc: "True-scale 9.53m x 3.59m x 2.23m (43.5T) Soviet MBT! 125mm 2A46M + live AZ-184 Carousel Autoloader, 14.5mm Roof MG, FLIR Thermal, Deep-Wading Snorkel & Cryptid Countermeasures!"
  },
  bm21: {
    id: "bm21", brand: "uvz", name: 'BM-21 "Grad" 6x6 Katyusha MLRS', category: "13.7T 40-Tube 122mm Rocket Artillery",
    suspensionType: "Heavy Ural-4320 6x6 Solid-Axle Leaf Springs",
    price: 65000, secretUnlock: true, isArtillery: true,
    color: "#43533a", accentColor: "#283322", massKg: 13700, cargoSlots: 0, enclosedCargo: true,
    bodyLen: 7.35, bodyWidth: 2.48, bodyHeight: 2.85, cogOffsetY: 0.42, intakeHeight: 1.72,
    fuelCapacity: 600, stockEngineId: "kamaz_740",
    compatibleEngines: ["kamaz_740", "v84ms_v12", "d12a_v12"],
    driveType: "6WD_LOCK", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.40, defaultGears: [6.40, 4.10, 2.75, 1.85, 1.32, 0.96],
    wheelRadius: 0.56, wheelWidth: 0.40, restLength: 0.52, maxTravel: 0.42,
    baseSpringK: 135000, baseDamperC: 16500, baseAntiRoll: 52000, maxSteerDeg: 34, brakeForce: 115000,
    bedOffset: { x: 0, y: 1.6, z: -1.6 },
    wheels: [
      { id: "FL", x: -1.06, y: 0.50, z:  2.28, steer: true,  axle: "front" },
      { id: "FR", x:  1.06, y: 0.50, z:  2.28, steer: true,  axle: "front" },
      { id: "ML", x: -1.06, y: 0.50, z: -0.95, steer: false, axle: "mid"   },
      { id: "MR", x:  1.06, y: 0.50, z: -0.95, steer: false, axle: "mid"   },
      { id: "RL", x: -1.06, y: 0.50, z: -2.35, steer: false, axle: "rear"  },
      { id: "RR", x:  1.06, y: 0.50, z: -2.35, steer: false, axle: "rear"  }
    ],
    desc: "Salvaged from the secret Desert Rocket Battery & restored by Richard Hammond! 40-Tube 122mm Katyusha/Grad MLRS — fire precision rockets or full ripple salvos [R] that carve PERMANENT blast craters into the terrain!"
  },
  shilka: {
    id: "shilka", brand: "uvz", name: 'ZSU-23-4 "Shilka" Quad-23mm SPAAG', category: "19T Tracked Radar Cryptid Shredder",
    suspensionType: "12 Independent Torsion-Bar Roadwheels + Articulated Steel Tracks",
    price: 70000, secretUnlock: true, isTracked: true, rearEngine: true, isShilka: true,
    color: "#4a5942", accentColor: "#273123", massKg: 19000, cargoSlots: 0, enclosedCargo: true,
    bodyLen: 6.54, bodyWidth: 3.12, bodyHeight: 2.58, cogOffsetY: 0.36, intakeHeight: 1.85,
    fuelCapacity: 520, stockEngineId: "kamaz_740",
    compatibleEngines: ["kamaz_740", "v84ms_v12", "d12a_v12"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.55, defaultGears: [6.40, 4.15, 2.80, 1.95, 1.38, 0.98],
    wheelRadius: 0.38, wheelWidth: 0.48, restLength: 0.50, maxTravel: 0.42,
    baseSpringK: 155000, baseDamperC: 18500, baseAntiRoll: 82000, maxSteerDeg: 34, brakeForce: 180000,
    bedOffset: { x: 0, y: 1.4, z: -1.8 },
    wheels: [
      { id: "L1", x: -1.28, y: 0.42, z:  2.20, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "R1", x:  1.28, y: 0.42, z:  2.20, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "L2", x: -1.28, y: 0.42, z:  1.32, steer: true,  steerScale:  0.5, axle: "front2" },
      { id: "R2", x:  1.28, y: 0.42, z:  1.32, steer: true,  steerScale:  0.5, axle: "front2" },
      { id: "L3", x: -1.28, y: 0.42, z:  0.44, steer: false, axle: "mid"    },
      { id: "R3", x:  1.28, y: 0.42, z:  0.44, steer: false, axle: "mid"    },
      { id: "L4", x: -1.28, y: 0.42, z: -0.44, steer: false, axle: "mid2"   },
      { id: "R4", x:  1.28, y: 0.42, z: -0.44, steer: false, axle: "mid2"   },
      { id: "L5", x: -1.28, y: 0.42, z: -1.32, steer: false, axle: "rear"   },
      { id: "R5", x:  1.28, y: 0.42, z: -1.32, steer: false, axle: "rear"   },
      { id: "L6", x: -1.28, y: 0.42, z: -2.20, steer: true,  steerScale: -0.6, axle: "rear2"  },
      { id: "R6", x:  1.28, y: 0.42, z: -2.20, steer: true,  steerScale: -0.6, axle: "rear2"  }
    ],
    desc: "Salvaged from the secret Western Air-Defense Bunker & restored by Richard Hammond! Quad-23mm AZP-23 Autocannon Shredder + Active 360° 1RL33 Moving-Target Cryptid & Tornado Radar [G] + FLIR Thermal [Z]!"
  },
  porsche_dakar: {
    id: "porsche_dakar", brand: "porsche", name: "Porsche 911 Dakar (992 Rally)", category: "Lifted Twin-Turbo AWD Rally Icon",
    suspensionType: "High-Clearance Rally Coilover Double-Wishbone + Rear-Axle Steer",
    price: 78000, color: "#eef2f5", accentColor: "#143466", massKg: 1605, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 4.53, bodyWidth: 1.87, bodyHeight: 1.38, cogOffsetY: 0.04, intakeHeight: 1.02,
    fuelCapacity: 90, stockEngineId: "porsche_f6_tt",
    compatibleEngines: ["porsche_f6_tt", "nissan_vr38", "subaru_ej257"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: false,
    defaultFinalDrive: 3.72, defaultGears: [3.42, 2.15, 1.50, 1.12, 0.88, 0.72, 0.60],
    wheelRadius: 0.37, wheelWidth: 0.29, restLength: 0.42, maxTravel: 0.36,
    baseSpringK: 42000, baseDamperC: 5100, baseAntiRoll: 15500, maxSteerDeg: 38, agileSteer: true, brakeForce: 28000,
    bedOffset: { x: 0, y: 0.92, z: -0.9 },
    wheels: [
      { id: "FL", x: -0.92, y: 0.14, z:  1.34, steer: true,  steerScale:  1.00, axle: "front" },
      { id: "FR", x:  0.92, y: 0.14, z:  1.34, steer: true,  steerScale:  1.00, axle: "front" },
      { id: "RL", x: -0.95, y: 0.14, z: -1.16, steer: true,  steerScale: -0.18, axle: "rear"  },
      { id: "RR", x:  0.95, y: 0.14, z: -1.16, steer: true,  steerScale: -0.18, axle: "rear"  }
    ],
    desc: "Factory-lifted 911 Dakar desert & taiga rally missile! 480 HP twin-turbo flat-6, high-clearance rally dampers, roof expedition basket & razor-sharp gravel poise!"
  },
  toyota_coaster: {
    id: "toyota_coaster", brand: "toyota", name: "Toyota Coaster 4.2D Expedition Bus", category: "Long-Wheelbase Commercial Minibus",
    suspensionType: "Heavy Commercial Multi-Leaf Beam Axle + Air Assist",
    price: 34000, color: "#e6e2d3", accentColor: "#24577a", massKg: 3950, cargoSlots: 10, enclosedCargo: true,
    bodyLen: 6.99, bodyWidth: 2.08, bodyHeight: 2.63, cogOffsetY: 0.38, intakeHeight: 1.44,
    fuelCapacity: 145, stockEngineId: "toyota_1hz_bus",
    compatibleEngines: ["toyota_1hz_bus", "toyota_1vd", "toyota_15b", "kamaz_740"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: false,
    defaultFinalDrive: 4.56, defaultGears: [4.65, 2.72, 1.72, 1.15, 0.85],
    wheelRadius: 0.42, wheelWidth: 0.28, restLength: 0.46, maxTravel: 0.36,
    baseSpringK: 76000, baseDamperC: 8800, baseAntiRoll: 24000, maxSteerDeg: 40, brakeForce: 42000,
    bedOffset: { x: 0, y: 1.05, z: -0.8 },
    wheels: [
      { id: "FL", x: -0.96, y: 0.22, z:  1.95, steer: true,  axle: "front" },
      { id: "FR", x:  0.96, y: 0.22, z:  1.95, steer: true,  axle: "front" },
      { id: "RL", x: -0.96, y: 0.22, z: -1.98, steer: false, axle: "rear"  },
      { id: "RR", x:  0.96, y: 0.22, z: -1.98, steer: false, axle: "rear"  }
    ],
    desc: "Legendary Toyota Coaster expedition minibus! Massive panoramic windows, 10-slot enclosed troop/cargo cabin & indestructible 4.2L inline-6 diesel!"
  },
  pzkpfw_140a4: {
    id: "pzkpfw_140a4", brand: "silver_directive", name: 'PzKpfw 140A4 "Schreckensfürst"', category: "68T Dev-Exclusive Gen 4.5/5 Breakthrough MBT",
    suspensionType: "14 Hydropneumatic Roadwheels + Wide Composite Steel Tracks",
    price: 0, secretUnlock: true, devOnly: true, isTracked: true, rearEngine: false, isSchreckensfurst: true, empImmune: true,
    color: "#364431", accentColor: "#c1121f", massKg: 68000, cargoSlots: 0, enclosedCargo: true,
    bodyLen: 8.10, bodyWidth: 3.90, bodyHeight: 2.65, cogOffsetY: 0.38, intakeHeight: 2.40,
    fuelCapacity: 1850, stockEngineId: "mdv16_diesel",
    compatibleEngines: ["mdv16_diesel", "v84ms_v12"],
    driveType: "AWD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 6.40, defaultGears: [7.10, 4.70, 3.20, 2.25, 1.58, 1.15, 0.86],
    wheelRadius: 0.45, wheelWidth: 0.66, restLength: 0.60, maxTravel: 0.50,
    baseSpringK: 425000, baseDamperC: 48000, baseAntiRoll: 220000, maxSteerDeg: 34, brakeForce: 540000,
    bedOffset: { x: 0, y: 1.8, z: -2.5 },
    wheels: [
      { id: "L1", x: -1.60, y: 0.48, z:  2.88, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "R1", x:  1.60, y: 0.48, z:  2.88, steer: true,  steerScale:  1.0, axle: "front"  },
      { id: "L2", x: -1.60, y: 0.48, z:  1.92, steer: true,  steerScale:  0.6, axle: "front2" },
      { id: "R2", x:  1.60, y: 0.48, z:  1.92, steer: true,  steerScale:  0.6, axle: "front2" },
      { id: "L3", x: -1.60, y: 0.48, z:  0.96, steer: false, axle: "mid"    },
      { id: "R3", x:  1.60, y: 0.48, z:  0.96, steer: false, axle: "mid"    },
      { id: "L4", x: -1.60, y: 0.48, z:  0.00, steer: false, axle: "mid2"   },
      { id: "R4", x:  1.60, y: 0.48, z:  0.00, steer: false, axle: "mid2"   },
      { id: "L5", x: -1.60, y: 0.48, z: -0.96, steer: false, axle: "mid3"   },
      { id: "R5", x:  1.60, y: 0.48, z: -0.96, steer: false, axle: "mid3"   },
      { id: "L6", x: -1.60, y: 0.48, z: -1.92, steer: false, axle: "rear"   },
      { id: "R6", x:  1.60, y: 0.48, z: -1.92, steer: false, axle: "rear"   },
      { id: "L7", x: -1.60, y: 0.48, z: -2.88, steer: true,  steerScale: -0.6, axle: "rear2"  },
      { id: "R7", x:  1.60, y: 0.48, z: -2.88, steer: true,  steerScale: -0.6, axle: "rear2"  }
    ],
    desc: 'The Silver Directive flagship MBT (Dev-Only: Silver)! 68T front-engine MDV-16 V16 (1,600 HP, EMP-immune), 140mm Rh-140/56 ETC w/ Linear Ram Autoloader (APFSDS / HESH / Thermo / RLG-140K Guided!), Remote 40mm AutoKanone, Donnerschild A7 APS & Crimson Red NVD!'
  },
  kamaz: {
    id: "kamaz", brand: "kamaz", name: "KamAZ-4310 6x6 Heavy Truck", category: "End-Game Soviet 6x6 Monster",
    suspensionType: "Heavy Front Leafs + Rear 6x6 Tandem Walking-Beam Bogie",
    price: 58000, color: "#3f5037", accentColor: "#1d211b", massKg: 7400, cargoSlots: 10, enclosedCargo: false, canCarryLogsInBed: true,
    bodyLen: 7.65, bodyWidth: 2.52, bodyHeight: 2.68, cogOffsetY: 0.52, intakeHeight: 1.92,
    fuelCapacity: 260, stockEngineId: "kamaz_740",
    compatibleEngines: ["kamaz_740", "toyota_1vd", "rover_ajv8", "toyota_2jz"],
    driveType: "6WD_FULL", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 6.53, defaultGears: [7.82, 4.03, 2.50, 1.53, 1.00, 0.81],
    wheelRadius: 0.62, wheelWidth: 0.42, restLength: 0.66, maxTravel: 0.52,
    baseSpringK: 138000, baseDamperC: 15500, baseAntiRoll: 32000, maxSteerDeg: 33, brakeForce: 72000,
    bedOffset: { x: 0, y: 1.38, z: -1.60 },
    wheels: [
      { id: "FL",  x: -1.22, y: 0.26, z:  2.35, steer: true,  axle: "front" },
      { id: "FR",  x:  1.22, y: 0.26, z:  2.35, steer: true,  axle: "front" },
      { id: "ML",  x: -1.22, y: 0.26, z: -1.15, steer: false, axle: "mid"   },
      { id: "MR",  x:  1.22, y: 0.26, z: -1.15, steer: false, axle: "mid"   },
      { id: "RL",  x: -1.22, y: 0.26, z: -2.55, steer: false, axle: "rear"  },
      { id: "RR",  x:  1.22, y: 0.26, z: -2.55, steer: false, axle: "rear"  }
    ],
    desc: "850 Nm 10.8L Twin-Turbo V8 diesel 6x6 titan. Unstoppable pulling power — WILL smash wooden bridges!"
  },
  komodo_std: {
    id: "komodo_std", brand: "pindad", name: "Pindad Komodo 4x4 (Standard APC)", category: "Indonesian 4x4 Tactical Armored Car",
    suspensionType: "Heavy-Duty 4x4 Independent Coil Tactical Suspension (440mm Clearance)",
    price: 48000, color: "#4e5c42", accentColor: "#21261e", massKg: 7300, cargoSlots: 4, enclosedCargo: true,
    bodyLen: 5.65, bodyWidth: 2.25, bodyHeight: 2.15, cogOffsetY: 0.28, intakeHeight: 1.75,
    fuelCapacity: 200, stockEngineId: "pindad_215_td",
    compatibleEngines: ["pindad_215_td", "toyota_1vd", "kamaz_740", "cat_c13_711"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.12, defaultGears: [5.40, 3.15, 1.98, 1.32, 1.00, 0.78],
    wheelRadius: 0.55, wheelWidth: 0.36, restLength: 0.58, maxTravel: 0.44,
    baseSpringK: 122000, baseDamperC: 13800, baseAntiRoll: 28000, maxSteerDeg: 35, brakeForce: 62000,
    bedOffset: { x: 0, y: 1.15, z: -1.45 },
    wheels: [
      { id: "FL", x: -0.95, y: 0.20, z:  1.80, steer: true,  axle: "front" },
      { id: "FR", x:  0.95, y: 0.20, z:  1.80, steer: true,  axle: "front" },
      { id: "RL", x: -0.95, y: 0.20, z: -1.80, steer: false, axle: "rear"  },
      { id: "RR", x:  0.95, y: 0.20, z: -1.80, steer: false, axle: "rear"  }
    ],
    desc: "PT Pindad Komodo 4x4 Standard APC (5.65m × 2.25m × 2.15m, 7.3t). High-clearance monocoque armored 4x4 built for brutal tropical mountain passes!"
  },
  komodo_recon: {
    id: "komodo_recon", brand: "pindad", name: "Pindad Komodo 4x4 (Reconnaissance)", category: "Indonesian 4x4 Thermal Recon Vehicle",
    suspensionType: "Heavy-Duty 4x4 Independent Coil Tactical Suspension (440mm Clearance)",
    price: 62000, color: "#43523a", accentColor: "#1b2019", massKg: 8000, cargoSlots: 3, enclosedCargo: true,
    bodyLen: 5.50, bodyWidth: 2.30, bodyHeight: 2.20, cogOffsetY: 0.30, intakeHeight: 1.82,
    fuelCapacity: 220, stockEngineId: "pindad_215_td",
    compatibleEngines: ["pindad_215_td", "toyota_1vd", "kamaz_740", "cat_c13_711"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.88, defaultGears: [5.20, 3.05, 1.92, 1.28, 1.00, 0.76],
    wheelRadius: 0.56, wheelWidth: 0.38, restLength: 0.60, maxTravel: 0.46,
    baseSpringK: 132000, baseDamperC: 14800, baseAntiRoll: 30000, maxSteerDeg: 36, brakeForce: 68000,
    bedOffset: { x: 0, y: 1.15, z: -1.40 },
    wheels: [
      { id: "FL", x: -1.00, y: 0.20, z:  1.78, steer: true,  axle: "front" },
      { id: "FR", x:  1.00, y: 0.20, z:  1.78, steer: true,  axle: "front" },
      { id: "RL", x: -1.00, y: 0.20, z: -1.78, steer: false, axle: "rear"  },
      { id: "RR", x:  1.00, y: 0.20, z: -1.78, steer: false, axle: "rear"  }
    ],
    desc: "PT Pindad Komodo 4x4 Recon (5.50m × 2.30m × 2.20m, 8.0t). Telescoping thermal/EO surveillance mast, VHF/HF comms & built-in FLIR Thermal / NVG [Z]!"
  },
  komodo_turret: {
    id: "komodo_turret", brand: "pindad", name: "Pindad Komodo 4x4 (CPWS 30mm Turret)", category: "Indonesian 4x4 Autocannon Combat Car",
    suspensionType: "Reinforced 4x4 Tactical Combat Suspension (440mm Clearance)",
    price: 94000, color: "#3d4a35", accentColor: "#1a1f18", massKg: 8200, cargoSlots: 2, enclosedCargo: true,
    bodyLen: 5.65, bodyWidth: 2.25, bodyHeight: 2.15, cogOffsetY: 0.34, intakeHeight: 1.80,
    fuelCapacity: 210, stockEngineId: "pindad_215_td",
    compatibleEngines: ["pindad_215_td", "toyota_1vd", "kamaz_740", "cat_c13_711"],
    driveType: "4WD_PART", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 4.95, defaultGears: [5.30, 3.10, 1.95, 1.30, 1.00, 0.77],
    wheelRadius: 0.56, wheelWidth: 0.38, restLength: 0.58, maxTravel: 0.44,
    baseSpringK: 138000, baseDamperC: 15500, baseAntiRoll: 34000, maxSteerDeg: 35, brakeForce: 72000,
    bedOffset: { x: 0, y: 1.15, z: -1.40 },
    wheels: [
      { id: "FL", x: -1.00, y: 0.20, z:  1.80, steer: true,  axle: "front" },
      { id: "FR", x:  1.00, y: 0.20, z:  1.80, steer: true,  axle: "front" },
      { id: "RL", x: -1.00, y: 0.20, z: -1.80, steer: false, axle: "rear"  },
      { id: "RR", x:  1.00, y: 0.20, z: -1.80, steer: false, axle: "rear"  }
    ],
    desc: "PT Pindad Komodo 4x4 armed with a John Cockerill CPWS 30mm Remote Autocannon Turret (8.2t)! Right-click toggle scope, Left-click 30mm fire & FLIR [Z]!"
  },
  harimau: {
    id: "harimau", brand: "pindad", name: "Pindad Harimau (Kaplan MT 105mm)", category: "Indonesian-Turkish 31.5t Medium Tank",
    suspensionType: "6-Roadwheel Torsion-Bar Tropical Tracked Suspension (STANAG Lvl 4)",
    price: 215000, color: "#4a593d", accentColor: "#232a1e", massKg: 31500, cargoSlots: 4, enclosedCargo: true,
    isTracked: true, isHarimau: true, rearEngine: true,
    bodyLen: 7.00, bodyWidth: 3.20, bodyHeight: 2.90, cogOffsetY: 0.24, intakeHeight: 2.05,
    fuelCapacity: 480, stockEngineId: "cat_c13_711",
    compatibleEngines: ["cat_c13_711", "v84ms_v12", "mdv16_diesel"],
    driveType: "AWD", defaultDriveMode: "4H", hasFactoryRearLock: true, hasFactoryFrontLock: true,
    defaultFinalDrive: 5.40, defaultGears: [6.40, 3.85, 2.35, 1.52, 1.05, 0.78],
    wheelRadius: 0.44, wheelWidth: 0.56, restLength: 0.52, maxTravel: 0.36,
    baseSpringK: 420000, baseDamperC: 48000, baseAntiRoll: 96000, maxSteerDeg: 30, brakeForce: 290000,
    bedOffset: { x: 0, y: 1.50, z: -2.0 },
    wheels: [
      { id: "L1", x: -1.36, y: 0.14, z:  2.55, steer: false, axle: "front" },
      { id: "R1", x:  1.36, y: 0.14, z:  2.55, steer: false, axle: "front" },
      { id: "L2", x: -1.36, y: 0.14, z:  1.53, steer: false, axle: "mid"   },
      { id: "R2", x:  1.36, y: 0.14, z:  1.53, steer: false, axle: "mid"   },
      { id: "L3", x: -1.36, y: 0.14, z:  0.51, steer: false, axle: "mid"   },
      { id: "R3", x:  1.36, y: 0.14, z:  0.51, steer: false, axle: "mid"   },
      { id: "L4", x: -1.36, y: 0.14, z: -0.51, steer: false, axle: "mid"   },
      { id: "R4", x:  1.36, y: 0.14, z: -0.51, steer: false, axle: "mid"   },
      { id: "L5", x: -1.36, y: 0.14, z: -1.53, steer: false, axle: "mid"   },
      { id: "R5", x:  1.36, y: 0.14, z: -1.53, steer: false, axle: "mid"   },
      { id: "L6", x: -1.36, y: 0.14, z: -2.55, steer: false, axle: "rear"  },
      { id: "R6", x:  1.36, y: 0.14, z: -2.55, steer: false, axle: "rear"  }
    ],
    desc: "PT Pindad Harimau / Kaplan MT (7.0m × 3.2m × 2.9m, 31.5t). 711 HP Cat C13 diesel (70 km/h!), Cockerill 3105 105mm autoloader (5.0s reload!), 7.62mm MG, Smoke [G] & Hunter-Killer FLIR [Z]!"
  }
};

KK.UPGRADES = {
  turboKit:      { id: "turboKit",      name: "Single Variable-Geometry Turbo",       price: 3800, desc: "Unlocks Boost PSI slider up to 24 PSI + crisp turbo spool." },
  twinTurboKit:  { id: "twinTurboKit",  name: "Sequential Twin-Turbo (TT) Kit",       price: 7200, desc: "Unlocks 30 PSI Boost + smooth turbine rush & legendary 7-chop STUTUTUTU BOV flutter!" },
  snorkel:       { id: "snorkel",       name: "Safari Roof Snorkel",                  price: 1800, desc: "Raises air intake by +1.15m. Prevents river hydrolock engine death!" },
  diffLocks:     { id: "diffLocks",     name: "Air-Actuated Front & Rear Diff Locks", price: 3400, desc: "Unlocks manual Front & Rear Differential Locks ([2] Front / [3] Rear)." },
  mudTires:      { id: "mudTires",      name: '37" Mud-Terrain Crawler Tires',        price: 2900, desc: "+45% mud/snow/rock traction and +6cm ground clearance." },
  hdSuspension:  { id: "hdSuspension",  name: "Extended Lift Kit Brackets",           price: 3200, desc: "Unlocks maximum Ride Height Lift Kit up to +28 cm!" },
  ledLightbar:   { id: "ledLightbar",   name: "50-Inch Roof LED Lightbar",            price: 1400, desc: "Blinds the Forest Yeti & lights pitch-black taiga nights ([K])!" },
  hdWinch:       { id: "hdWinch",       name: "12-Ton Hydraulic Steel Winch",         price: 2200, desc: "120m cable reach and 2.5x pulling force for dragging buddies up cliffs!" },
  bullbar:       { id: "bullbar",       name: "Steel Kangaroo Bullbar + Rollcage",    price: 2100, desc: "Reduces tree, boulder, deer & Yeti impact damage by 65%!" },

  // CLASSIFIED T-72B TANK UPGRADES (Deep-Water Wading & Cryptid-Targeted Countermeasures!)
  t72Snorkel:       { id: "t72Snorkel",       t72Only: true, name: "OPVT Deep-Wading Tank Snorkel Tube",           price: 8500,  desc: "Mounts a 4.5m vertical Soviet turret wading tube! Drive completely submerged across deep riverbeds & oceans without hydrolocking!" },
  t72EmpShield:     { id: "t72EmpShield",     t72Only: true, name: "Shtora-1 IR Dazzlers & Faraday EMP Cage",      price: 16500, desc: "Glowing red Shtora-1 eyes + Faraday braids! Cuts Godzilla Atomic EMP & Siren Head Sonic gauge scramble by 82% and internal wear by 80%!" },
  t72AcousticJammer:{ id: "t72AcousticJammer",t72Only: true, name: "LRAD Ultrasonic Siren-Disruptor Array",        price: 14000, desc: "Turret-mounted anti-Siren Head dish! Halves Siren Head's sprint speed within 260m, cuts sonic jitter by 70% & doubles stagger power!" },
  t72Kontakt5:      { id: "t72Kontakt5",      t72Only: true, name: "Kontakt-5 Heavy Wedge ERA + Spall Liner",      price: 22000, desc: "Bolts heavy Kontakt-5 wedge armor onto hull & turret! Cuts launch fling & internal damage from Godzilla, T-Rex, Sandwyrm & Siren Head by 65%!" },
  t72SeismicFcs:    { id: "t72SeismicFcs",    t72Only: true, name: "1A45 Fire-Control + 3BK-THERM Thermobaric",    price: 26000, desc: "Speeds AZ-184 Autoloader (6.5s -> 4.8s), +45% turret slew & unlocks 3rd 125mm shell [R]: 3BK-THERM Thermobaric (12.5s Godzilla stagger, 65s monster panic!)" },
  sturmKit:         { id: "sturmKit",         pzkpfwOnly: true, name: "STURM Breakthrough Kit (Dozer Blade + NERA)", price: 0, desc: "Mounts heavy hydraulic front dozer blade & additional STURM NERA/ERA armor modules onto the Schreckensfürst!" }
};

KK.CARGO_TYPES = {
  standard:   { id: "standard",   name: "Industrial Supply Crates",        color: "#a8763e", massPerUnitKg: 260, fragility: 0.35, payMult: 1.0 },
  fuel_drums: { id: "fuel_drums", name: "Heavy Diesel Drums",              color: "#b03227", massPerUnitKg: 420, fragility: 0.55, payMult: 1.35 },
  fragile:    { id: "fragile",    name: "Seismograph & Glass Lab Cargo",   color: "#3a89c9", massPerUnitKg: 190, fragility: 1.65, payMult: 1.85 },
  medical:    { id: "medical",    name: "Timed Emergency Medical Run",     color: "#e6ecf0", massPerUnitKg: 160, fragility: 0.95, payMult: 2.05, timed: true },
  generator:  { id: "generator",  name: "Heavy Industrial Generator",      color: "#d4a017", massPerUnitKg: 680, fragility: 0.45, payMult: 2.25 },
  logs:       { id: "logs",       name: "Giant Timber Logs (Trailer/KamAZ)", color: "#6e4726", massPerUnitKg: 540, fragility: 0.30, payMult: 2.15, requiresTrailerOrHeavy: true },
  beer:       { id: "beer",       name: "Craft Pub Beer Kegs (For James May)", color: "#d49b24", massPerUnitKg: 210, fragility: 0.65, payMult: 1.65 }
};

// ============================================================================
// HITCHABLE TRAILERS (Press [1] to Hitch / Unhitch, or spawn at Dock/Garage!)
// ============================================================================
KK.TRAILERS = {
  log_trailer: {
    id: "log_trailer",
    name: "Krasny-Log Twin-Axle Timber Trailer",
    price: 4200,
    emptyMassKg: 1050,
    cargoSlots: 4,
    canCarryLogs: true,
    length: 5.4,
    width: 2.15,
    hitchDist: 3.15,   // Distance from hitch ball to trailer axle center
    wheelRadius: 0.41,
    color: "#c47d1e",
    desc: "Heavy steel bunk trailer with twin axles and red stanchions. Lets ANY car (even a WRX or Jimny!) haul giant Timber Logs!"
  },
  flatbed_trailer: {
    id: "flatbed_trailer",
    name: "Boreal Heavy Tandem Flatbed Trailer",
    price: 5800,
    emptyMassKg: 1380,
    cargoSlots: 6,
    canCarryLogs: true,
    length: 6.1,
    width: 2.25,
    hitchDist: 3.45,
    wheelRadius: 0.43,
    color: "#3f5366",
    desc: "Massive 6-slot tandem flatbed trailer for huge multi-ton generator, fuel drum, and timber log runs."
  },
  support_trailer: {
    id: "support_trailer",
    name: "Boreal Dakar Fuel & Repair Support Trailer",
    price: 6400,
    emptyMassKg: 1480,
    cargoSlots: 0,
    canCarryLogs: false,
    isSupportTrailer: true,
    length: 5.5,
    width: 2.18,
    hitchDist: 3.15,
    wheelRadius: 0.42,
    color: "#c92a2a",
    desc: "Mobile 2,000L Diesel Cistern + Field Mechanic Workshop + Spare Tire Rack! Pull up & press [F] to refuel to 100%, replace blown tires, restock spares/flares & repair to 90% anywhere (works for LAN friends too!)."
  },
  car_carrier: {
    id: "car_carrier",
    name: "Boreal Hydraulic Car-Carrier Recovery Trailer",
    price: 6800,
    emptyMassKg: 1550,
    cargoSlots: 0,
    canCarryLogs: false,
    isCarCarrier: true,
    length: 6.4,
    width: 2.48,
    hitchDist: 3.65,
    wheelRadius: 0.41,
    color: "#e09f1f",
    desc: "Heavy flatbed vehicle hauler with steel wheel ramps & tie-down chains! Pull near any LAN friend's broken car (or load one of your own fleet rigs!) and press [5] to load & tow it safely to a garage!"
  }
};

KK.ensurePartsInitialized = function(vState) {
  if (!vState.parts || typeof vState.parts !== "object") vState.parts = {};
  const defaultBrand = (vState.vehicleId === "uaz452") ? "krasnyscrap"
    : ((vState.vehicleId === "wrx" || vState.vehicleId === "evo" || vState.vehicleId === "gtr_r35") ? "kurogane"
      : ((vState.vehicleId === "rangerover" || vState.vehicleId === "humvee" || vState.vehicleId === "btr80" || vState.vehicleId === "maz537" || vState.vehicleId === "patrol_y61" || vState.vehicleId === "mega_cruiser" || vState.vehicleId === "lambo_tractor" || vState.vehicleId === "jeep_wrangler" || vState.vehicleId === "t72" || vState.vehicleId === "bm21" || vState.vehicleId === "shilka" || vState.vehicleId === "pzkpfw_140a4") ? "boreal" : "volgaworks"));
  for (const pid of Object.keys(KK.PARTS_CATALOG)) {
    if (!vState.parts[pid]) vState.parts[pid] = { brand: defaultBrand, hp: 100 };
    else {
      if (!KK.BRANDS[vState.parts[pid].brand]) vState.parts[pid].brand = "volgaworks";
      if (typeof vState.parts[pid].hp !== "number") vState.parts[pid].hp = 100;
    }
  }
  if (typeof vState.dirtLevel !== "number") vState.dirtLevel = 0;
  if (vState.upgrades && typeof vState.upgrades.twinTurboKit === "undefined") {
    const eng = KK.ENGINES[vState.engineId];
    vState.upgrades.twinTurboKit = !!(eng && eng.isTwinTurbo);
  }
  const spec = KK.VEHICLES[vState.vehicleId] || KK.VEHICLES.uaz452;
  const wCount = spec.wheels.length;
  if (!Array.isArray(vState.tiresHP) || vState.tiresHP.length !== wCount) {
    vState.tiresHP = new Array(wCount).fill(100);
  }
  if (!Array.isArray(vState.blownTires) || vState.blownTires.length !== wCount) {
    vState.blownTires = new Array(wCount).fill(false);
  }
  if (typeof vState.spareTires !== "number") {
    vState.spareTires = (wCount >= 6) ? 3 : 2;
  }
  if (!vState.health) vState.health = { mudClog: 0, tieRodBias: 0, tires: 100, body: 100, headlightL: 100, headlightR: 100 };
  if (typeof vState.health.headlightL !== "number") vState.health.headlightL = 100;
  if (typeof vState.health.headlightR !== "number") vState.health.headlightR = 100;
  if (!vState.tireCompound || !KK.TIRE_COMPOUNDS[vState.tireCompound]) {
    vState.tireCompound = (vState.upgrades && vState.upgrades.mudTires) ? "mud_terrain"
      : ((vState.vehicleId === "gtr_r35" || vState.vehicleId === "wrx" || vState.vehicleId === "evo") ? "street_sport" : "all_terrain");
  }
  if (!vState.tireBrand || !KK.TIRE_BRANDS[vState.tireBrand]) {
    vState.tireBrand = (vState.vehicleId === "gtr_r35" || vState.vehicleId === "wrx" || vState.vehicleId === "evo") ? "kurogane"
      : ((vState.vehicleId === "btr80" || vState.vehicleId === "humvee" || vState.vehicleId === "mega_cruiser") ? "boreal" : "volgaworks");
  }
  if (vState.upgrades && typeof vState.upgrades.btrTurret === "undefined") vState.upgrades.btrTurret = false;
  if (typeof vState.btrAmmo !== "number") vState.btrAmmo = (vState.upgrades && vState.upgrades.btrTurret) ? 120 : 0;
  if (typeof vState.t72HeAmmo !== "number") vState.t72HeAmmo = (vState.vehicleId === "t72") ? 18 : 0;
  if (typeof vState.t72ApAmmo !== "number") vState.t72ApAmmo = (vState.vehicleId === "t72") ? 14 : 0;
  if (typeof vState.t72CoaxAmmo !== "number") vState.t72CoaxAmmo = (vState.vehicleId === "t72") ? 300 : 0;
  if (typeof vState.t72SmokeCharges !== "number") vState.t72SmokeCharges = (vState.vehicleId === "t72") ? 4 : 0;
  if (!vState.t72ShellType) vState.t72ShellType = "he";
  if (typeof vState.t72ThermAmmo !== "number") vState.t72ThermAmmo = (vState.vehicleId === "t72" && vState.upgrades && vState.upgrades.t72SeismicFcs) ? 10 : 0;
  if (typeof vState.bm21Rockets !== "number") vState.bm21Rockets = (vState.vehicleId === "bm21") ? 40 : 0;
  if (!vState.bm21FireMode) vState.bm21FireMode = "single"; // single | salvo
  if (typeof vState.shilkaAmmo !== "number") vState.shilkaAmmo = (vState.vehicleId === "shilka") ? 800 : 0;
  if (typeof vState.p140ApAmmo !== "number") vState.p140ApAmmo = (vState.vehicleId === "pzkpfw_140a4") ? 14 : 0;
  if (typeof vState.p140HeshAmmo !== "number") vState.p140HeshAmmo = (vState.vehicleId === "pzkpfw_140a4") ? 10 : 0;
  if (typeof vState.p140ThermAmmo !== "number") vState.p140ThermAmmo = (vState.vehicleId === "pzkpfw_140a4") ? 8 : 0;
  if (typeof vState.p140RlgAmmo !== "number") vState.p140RlgAmmo = (vState.vehicleId === "pzkpfw_140a4") ? 8 : 0;
  if (typeof vState.p140AutoAmmo !== "number") vState.p140AutoAmmo = (vState.vehicleId === "pzkpfw_140a4") ? 240 : 0;
  if (!vState.p140ShellType) vState.p140ShellType = "ap140";
  if (vState.vehicleId === "pzkpfw_140a4" && vState.upgrades) {
    vState.upgrades.ledLightbar = true;
    vState.upgrades.hdWinch = true;
    if (typeof vState.upgrades.sturmKit === "undefined") vState.upgrades.sturmKit = false;
  }
  if (vState.health) {
    if (typeof vState.health.lightbar !== "number") vState.health.lightbar = 100;
    if (typeof vState.health.taillightL !== "number") vState.health.taillightL = 100;
    if (typeof vState.health.taillightR !== "number") vState.health.taillightR = 100;
  }
  if (!vState.stowedUpgrades || typeof vState.stowedUpgrades !== "object") vState.stowedUpgrades = {};
  if (vState.upgrades) {
    for (const uk of ["t72Snorkel", "t72EmpShield", "t72AcousticJammer", "t72Kontakt5", "t72SeismicFcs"]) {
      if (typeof vState.upgrades[uk] === "undefined") vState.upgrades[uk] = false;
    }
  }
  return vState;
};

KK.createDefaultVehicleState = function(vehicleId) {
  const spec = KK.VEHICLES[vehicleId] || KK.VEHICLES.uaz452;
  const eng = KK.ENGINES[spec.stockEngineId];
  const st = {
    vehicleId: spec.id, paintColor: spec.color, engineId: spec.stockEngineId, dirtLevel: 0.0,
    upgrades: {
      turboKit: !!eng.stockTurbo,
      twinTurboKit: !!eng.isTwinTurbo,
      snorkel: false, diffLocks: !!(spec.hasFactoryFrontLock && spec.hasFactoryRearLock),
      mudTires: false, hdSuspension: false, ledLightbar: false, hdWinch: false, bullbar: false
    },
    tuning: {
      boostPsi: eng.stockTurbo ? (eng.stockBoostPsi || 12) : 0,
      finalDrive: spec.defaultFinalDrive, gears: spec.defaultGears.slice(),
      rideHeight: 0.0, springStiffness: 1.0, damperRebound: 1.0, antiRoll: 1.0,
      camberDeg: -0.5, toeDeg: 0.0, frontPsi: 30, rearPsi: 30
    },
    health: { mudClog: 0, tieRodBias: 0.0, tires: 100, body: 100, headlightL: 100, headlightR: 100, lightbar: 100, taillightL: 100, taillightR: 100 },
    parts: {}, fuel: spec.fuelCapacity
  };
  if (spec.id === "harimau") {
    st.t72HeAmmo = 22; st.t72ApAmmo = 16; st.t72CoaxAmmo = 400; st.t72SmokeCharges = 6; st.t72ShellType = "he";
  } else if (spec.id === "komodo_turret") {
    st.btrAmmo = 180;
  } else if (spec.id === "komodo_std") {
    st.btrAmmo = 300;
  }
  return KK.ensurePartsInitialized(st);
};

KK.getPartPerf = function(vState, partId) {
  KK.ensurePartsInitialized(vState);
  const p = vState.parts[partId];
  const br = KK.BRANDS[p.brand] || KK.BRANDS.volgaworks;
  return br.perfMult * (0.25 + 0.75 * Math.max(0, Math.min(1, p.hp / 100)));
};
KK.getPartWearMult = function(vState, partId) {
  KK.ensurePartsInitialized(vState);
  return (KK.BRANDS[vState.parts[partId].brand] || KK.BRANDS.volgaworks).wearMult;
};
KK.getPartPrice = function(partId, brandId) {
  return Math.round(KK.PARTS_CATALOG[partId].basePrice * (KK.BRANDS[brandId] || KK.BRANDS.volgaworks).priceMult);
};
KK.getEngineOverallHealth = function(vState) {
  KK.ensurePartsInitialized(vState);
  const ids = ["airFilter", "fuelRails", "fuelInjectors", "sparkPlugs", "radiator", "waterPump", "intercooler", "exhaustManifold", "pistons", "crankshaft", "camshaft", "headGasket"];
  let sum = 0; for (const id of ids) sum += vState.parts[id].hp;
  return sum / ids.length;
};

KK.computeEngineOutput = function(vState, rpm, throttle, currentBoostPsi) {
  KK.ensurePartsInitialized(vState);
  const eng = KK.ENGINES[vState.engineId] || KK.ENGINES.umz_24;
  const crankPerf = KK.getPartPerf(vState, "crankshaft");
  const effectiveRedline = Math.round(eng.redlineRpm * (0.94 + Math.min(0.16, (crankPerf - 0.85) * 0.22)));
  if (rpm >= effectiveRedline * 1.01) {
    return { torqueNm: 0, hp: 0, redline: effectiveRedline, idle: eng.idleRpm, limiter: true };
  }
  const fuelAirMult = (KK.getPartPerf(vState, "airFilter") * 0.22 + KK.getPartPerf(vState, "fuelRails") * 0.26 + KK.getPartPerf(vState, "fuelInjectors") * 0.28 + KK.getPartPerf(vState, "sparkPlugs") * 0.24);
  const internalsMult = (KK.getPartPerf(vState, "pistons") * 0.30 + crankPerf * 0.25 + KK.getPartPerf(vState, "camshaft") * 0.25 + KK.getPartPerf(vState, "headGasket") * 0.20);
  const exhaustMult = (KK.getPartPerf(vState, "intercooler") + KK.getPartPerf(vState, "exhaustManifold")) * 0.5;
  const normRpm = Math.max(0, Math.min(1.0, (rpm - eng.idleRpm) / (effectiveRedline - eng.idleRpm)));
  const peakNorm = (eng.peakTorqueRpm - eng.idleRpm) / (effectiveRedline - eng.idleRpm);
  const dist = normRpm - peakNorm;
  const curve = Math.max(0.32, 1.0 - (dist * dist) * (dist < 0 ? 1.7 : 2.1));
  const stockB = eng.stockTurbo ? (eng.stockBoostPsi || 12) : 0;
  const extraBoost = Math.max(0, currentBoostPsi - stockB);
  const ttBonus = (vState.upgrades.twinTurboKit || eng.isTwinTurbo) ? 1.08 : 1.0;
  const boostMult = (1.0 + extraBoost * 0.044 * Math.max(0.5, exhaustMult)) * ttBonus;
  const totalPartsMult = (0.5 + 0.5 * fuelAirMult) * (0.45 + 0.55 * internalsMult);
  const torqueNm = eng.baseTorqueNm * curve * boostMult * totalPartsMult * Math.max(0, throttle);
  const hp = (torqueNm * rpm) / 7127.0;
  return { torqueNm, hp, redline: effectiveRedline, idle: eng.idleRpm, limiter: false };
};
