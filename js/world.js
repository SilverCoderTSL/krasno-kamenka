// ============================================================================
// js/world.js (v6) — Zero-Leak Shared Geometries, Red Sands Desert Biome,
// Collidable Trees & Rocks, 7 3D Landmarks & Driveable Stunt Ramps!
// ============================================================================
window.KK = window.KK || {};

// Compact surface-code lookup tables for per-vertex baked chunk metadata
const KK_SURFACE_NAMES = [
  "grass",       // 0
  "asphalt",     // 1
  "race_tarmac", // 2
  "tarmac_line", // 3
  "kerb",        // 4
  "gravel",      // 5
  "shale",       // 6
  "bad_road",    // 7
  "mud",         // 8
  "sand",        // 9
  "snow",        // 10
  "volcanic",    // 11
  "rock",        // 12
  "wood"         // 13
];
const KK_SURFACE_TO_CODE = {
  grass: 0,
  asphalt: 1,
  race_tarmac: 2,
  tarmac_line: 3,
  kerb: 4,
  gravel: 5,
  shale: 6,
  bad_road: 7,
  mud: 8,
  sand: 9,
  snow: 10,
  volcanic: 11,
  rock: 12,
  wood: 13
};

KK.World = class World {
  constructor(scene, seed = 404911) {
    this.scene = scene;
    // IMMUTABLE terrain seed — NEVER changes mid-session so terrain meshes & physics NEVER desync!
    this.terrainSeed = 404911;
    this.seed = this.terrainSeed;
    this.bridgeRngSeed = seed || 404911;
    this.originX = 0;
    this.originZ = 0;

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.chunks = new Map();
    this._chunkIntMap = new Map();
    this._chunkGeoPool = [];
    this._chunkQueue = [];
    this._activeChunkBuild = null;
    this._activeRoadSegs = null;
    this._inChunkBuild = false;
    this._chunkNeeded = new Set();
    this._oceanTex = null;
    this.bridgeMeshes = new Map();
    this.townGroups = new Map();
    this.settlementAnims = [];
    this.townNightLights = [];
    this.landmarkGroups = new Map();
    this.waterMeshes = [];
    this.roadSegments = [];
    this._roadGrid = null;
    this._roadGridCell = 500;
    this._rQueryStamp = 0;
    this.riverSegments = [];
    this._riverGrid = null;
    this._riverGridCell = 500;
    this.winchTrees = [];
    this.activeColliders = []; // Collidable trees, rocks, cacti & landmark pillars!
    this.buildingColliders = []; // v15.0.1 Solid collidable boxes for ALL buildings, houses, skyscrapers, ports & reactor walls!
    this._buildingGrid = null;
    this._buildingGridCell = 200;
    this._bQueryStamp = 0;
    this._nearbyBuildingsScratch = [];
    this._emptyArray = Object.freeze([]);
    this._oceanBiome = Object.freeze({
      mountains: 0, taiga: 0, desert: 0, volcanic: 0, rust: 0,
      tropical: 0, savanna: 0, arctic: 0, radioactive: 0, ocean: 1.0
    });
    // Zero-GC scratch objects for internal terrain helpers
    this._islOut = { mask: 0, island: null };
    this._islNatOut = { mask: 0, island: null };
    this._roadOut = { dist: 999999, seg: null, cx: 0, cz: 0 };
    this._riverOut = { dist: 999999, seg: null, cx: 0, cz: 0, waterY: -9999 };
    this._fordOut = { blend: 0, depth: 4.5, ford: null };
    this._craterOut = { off: 0, scorch: 0 };
    this.tramState = null;       // Working Zolotoy City Electric Tram!
    this.cityOverpasses = [];    // Elevated driveable city overpass bridges!
    this.cityFountainGlow = null;
    this._hasDedicatedZolotoyCaller = false;
    this.gpFloodlights = [];     // Stadium floodlights at Krasny-Ring / Zolotoy GP Circuit
    this.megaBridge = null;      // Auto-snapped 6-Lane Ocean Mega-Bridge metadata
    this.megaBridgeGroup = null;
    this._mbSegPool = [];
    this._mbPylonPool = [];
    this._lastMbSegIdx = -999999;
    this._lastMbPylonIdx = -999999;
    this.brokenTrees = new Set();   // Knocked-down tree IDs (synced over LAN!)
    this.fallingTrees = [];         // Active animated toppling trees!
    this.treeMeshMap = new Map();   // treeId -> { mesh, chunkKey }
    this.brokenFences = new Set();  // Smashed roadside fence IDs (synced over LAN!)
    this.fallingFences = [];        // Animated flying/toppling broken fences!
    this.fenceMeshMap = new Map();  // fenceId -> { mesh, chunkKey }
    this.activeFences = [];
    this.milCampPad = null; // legacy alias
    this.secretPads = {};   // { t72, bm21, shilka } -> { x, z, baseH, radius }
    this.craters = [];      // Permanent blast craters: { x, z, r, d }         // Active breakable fence colliders!

    this._snapPortsToRealShorelines();
    this._initMegaBridge();
    this._buildRoadNetwork();
    this._buildGpCircuitSegments();
    this._buildRiverNetwork();
    this._computeTownAndLandmarkElevations();
    this._initSharedAssets();
    this._buildTowns();
    this._buildBridges();
    this._buildRivers();
    this._buildLandmarks();
    this._buildTarmacDetails();
    this._buildOceanAndFarIslands();
    this._initMegaBridgeStreamPool();
    this.updateMegaBridgeStream(0, 0);
    this._buildZolotoyMetropolis();
    this._buildOceanPorts();
    this._buildIslandSetpieces();
    this._buildLighthouses();
    this._extractBuildingColliders();
    this.updateChunks(0, 0, true);
  }

  hash2(ix, iz) {
    let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(this.terrainSeed, 1442695041);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  hashBridge(ix, iz) {
    let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) + Math.imul(this.bridgeRngSeed, 1442695041);
    n = (n ^ (n >>> 13)) * 1274126177;
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  valueNoise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx);
    const v = fz * fz * (3 - 2 * fz);
    const a = this.hash2(ix, iz), b = this.hash2(ix + 1, iz);
    const c = this.hash2(ix, iz + 1), d = this.hash2(ix + 1, iz + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  fbm(x, z, octaves = 4) {
    let val = 0, amp = 0.5, freq = 1.0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      val += this.valueNoise(x * freq, z * freq) * amp;
      norm += amp; amp *= 0.5; freq *= 2.04;
    }
    return val / norm;
  }

  // 4 Rich Biomes: Razorback Mountains (NW/N), Black Timber Taiga (E), Red Sands Desert (S/SE), Rust Basin (Center)
  // v15.0: 6-ISLAND 200x200 KM ARCHIPELAGO MASK (Island 1 Mainland untouched inside r < 0.84!)
  _getIslandInfoInto(gx, gz, out) {
    const islands = KK.ISLANDS || [];
    let bestMask = 0, bestIsl = null;
    for (let i = 0; i < islands.length; i++) {
      const isl = islands[i];
      const dx = (gx - isl.cx) / isl.rx;
      const dz = (gz - isl.cz) / isl.rz;
      const rSq = dx * dx + dz * dz;
      if (rSq > 1.38) continue;
      const r = Math.sqrt(rSq);
      // Organic scalloped coastline noise
      const ang = Math.atan2(dz, dx);
      const coastNoise = (Math.sin(ang * 5.0 + isl.id * 1.7) * 0.055 + Math.cos(ang * 9.0 - isl.id * 2.3) * 0.032 +
        (this.fbm(gx * 0.00018 + isl.id * 3.1, gz * 0.00018 - isl.id * 1.9, 2) - 0.5) * 0.14);
      const effR = r + coastNoise;
      const innerR = (isl.id === 0) ? 0.86 : 0.72;
      const outerR = 1.04;
      let mask = 0;
      if (effR <= innerR) mask = 1.0;
      else if (effR < outerR) {
        const u = 1.0 - (effR - innerR) / (outerR - innerR);
        mask = u * u * (3 - 2 * u);
      }
      if (mask > bestMask) {
        bestMask = mask;
        bestIsl = isl;
      }
    }
    out.mask = bestMask;
    out.island = bestIsl;
    return out;
  }

  getIslandInfo(gx, gz) {
    return this._getIslandInfoInto(gx, gz, { mask: 0, island: null });
  }

  getAirstripInfo(gx, gz) {
    if (!KK.AIRSTRIPS) return null;
    for (let i = 0; i < KK.AIRSTRIPS.length; i++) {
      const a = KK.AIRSTRIPS[i];
      const dx = gx - a.x, dz = gz - a.z;
      const lim = a.len * 0.65;
      if (Math.abs(dx) > lim || Math.abs(dz) > lim) continue;
      const c = Math.cos(-a.yaw), s = Math.sin(-a.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;
      const halfW = a.width * 0.5, halfL = a.len * 0.5;
      if (Math.abs(lx) < halfW + 24 && Math.abs(lz) < halfL + 28) {
        const bx = Math.abs(lx) <= halfW ? 1.0 : Math.max(0, 1.0 - (Math.abs(lx) - halfW) / 24);
        const bz = Math.abs(lz) <= halfL ? 1.0 : Math.max(0, 1.0 - (Math.abs(lz) - halfL) / 28);
        const b = bx * bz;
        const blend = b * b * (3 - 2 * b);
        const onRunway = (Math.abs(lx) <= halfW && Math.abs(lz) <= halfL);
        const isCenterDash = onRunway && Math.abs(lx) < 0.75 && ((Math.floor((lz + halfL) / 18) % 2) === 0);
        const isEdgeLine = onRunway && Math.abs(Math.abs(lx) - (halfW - 1.1)) < 0.45;
        return { strip: a, blend, onRunway, isLine: isCenterDash || isEdgeLine, targetY: a._baseH };
      }
    }
    return null;
  }

  getBiomeWeights(gx, gz, preIslInfo = null) {
    const islInfo = preIslInfo || this._getIslandInfoInto(gx, gz, this._islOut);
    const isl = islInfo.island;

    // Outer Islands (Tropical Jungle, Golden Savanna, Arctic Glacier, Black Rock Volcanic Fortress)
    if (isl && isl.id !== 0 && islInfo.mask > 0.02) {
      const m = islInfo.mask;
      const isTrop = isl.biome === "tropical" ? m : 0;
      const isSav  = isl.biome === "savanna" ? m : 0;
      const isArc  = isl.biome === "arctic" ? m : 0;
      const isRad  = isl.biome === "radioactive" ? m : 0;
      return {
        mountains: isArc * 0.55,
        taiga: 0,
        desert: 0,
        volcanic: 0,
        rust: 0,
        tropical: isTrop,
        savanna: isSav,
        arctic: isArc,
        radioactive: isRad,
        ocean: 1.0 - m
      };
    }

    // Open Ocean outside all islands
    if (!isl || islInfo.mask <= 0.02) {
      return this._oceanBiome;
    }

    // Island 1: Classic Krasno-Kamenka Mainland (100% original biome math preserved!)
    const mtn = Math.max(0, Math.min(1, (-gz - 2200) / 14000)) * 0.78 +
                Math.max(0, Math.min(1, (-gx - 3000) / 16000)) * 0.35;
    const nearMtnD = Math.hypot(gx + 1450, gz + 1350);
    const nearMtn = Math.max(0, 1 - nearMtnD / 1200) * 0.78;

    const taiga = Math.max(0, Math.min(1, (gx - 900) / 8500)) * (gz < 2400 ? 1.0 : Math.max(0, 1 - (gz - 2400) / 4000));

    const farDesert = Math.max(0, Math.min(1, (gz - 4800) / 8500));
    const nearDesertD = Math.hypot(gx - 2100, gz - 3000);
    const nearDesert = Math.max(0, 1 - nearDesertD / 1750);
    const desert = Math.min(1, Math.max(farDesert, nearDesert));

    const nearVolcD = Math.hypot(gx + 4350, gz - 1300);
    const nearVolc = Math.max(0, 1 - nearVolcD / 2300);
    const farVolc = Math.max(0, Math.min(1, (-gx - 15000) / 14000)) * Math.max(0, 1 - Math.abs(gz - 2000) / 16000);
    const volcanic = Math.min(1, Math.max(nearVolc, farVolc));

    const mountains = Math.min(1, Math.max(mtn, nearMtn)) * (1 - volcanic * 0.8);
    const rust = Math.max(0.08, 1.0 - Math.max(mountains, taiga, desert, volcanic));
    return { mountains, taiga, desert, volcanic, rust, tropical: 0, savanna: 0, arctic: 0, radioactive: 0, ocean: 1.0 - islInfo.mask };
  }

  getBiomeName(gx, gz) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const h = this._computeNaturalGroundHeight(gx, gz);
    if (h < seaL) return "Krasno-Kamenka Open Sea";
    const b = this.getBiomeWeights(gx, gz);
    if (b.tropical > 0.35) {
      const isl = this.getIslandInfo(gx, gz).island;
      return (isl && isl.id === 4) ? "Coral Smuggler's Cay (Tropical)" : "Ostrov Tropika (Tropical Jungle)";
    }
    if (b.savanna > 0.35) return "Zolotoy Steppe (Golden Savanna)";
    if (b.radioactive > 0.35) return "Site-140 Radioactive Exclusion Zone";
    if (b.arctic > 0.35) return "Severnyy Arctic Glacier";
    if (b.volcanic > 0.40) {
      const isl = this.getIslandInfo(gx, gz).island;
      return (isl && isl.id === 5) ? "Site-140 Black Rock (Volcanic Isle)" : "Mt. Vulkan Caldera (Volcanic)";
    }
    if (b.mountains > 0.45) return "Razorback Switchbacks";
    if (b.desert > 0.46) return "Krasny Red Sands Desert";
    if (b.taiga > 0.46) return "Black Timber Taiga";
    return "The Rust Basin";
  }

  // v15.1.1 AUTO-SNAP EVERY OCEAN PORT TO EXACT SHORELINE (Zero buried inland piers!)
  _snapPortsToRealShorelines() {
    if (!KK.PORTS || !KK.ISLANDS) return;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    for (const pt of KK.PORTS) {
      const isl = KK.ISLANDS.find((x) => x.id === pt.islandId);
      if (!isl) continue;
      const ang = pt.dirAng !== undefined ? pt.dirAng : Math.atan2(pt.z - isl.cz, pt.x - isl.cx);
      const ux = Math.cos(ang), uz = Math.sin(ang);
      const maxR = Math.max(isl.rx, isl.rz) * 1.18;
      const startR = isl.id === 0 ? Math.min(isl.rx, isl.rz) * 0.72 : Math.min(isl.rx, isl.rz) * 0.35;

      // Coarse march outward from land into sea until height crosses SEA_LEVEL
      let shoreR = startR;
      let prevAbove = true;
      for (let r = startR; r <= maxR; r += 80) {
        const h = this._computeNaturalGroundHeight(isl.cx + ux * r, isl.cz + uz * r);
        if (prevAbove && h <= seaL + 0.5) {
          // Binary search to within 4m of the exact shoreline!
          let lo = Math.max(startR, r - 80), hi = r;
          for (let it = 0; it < 6; it++) {
            const mid = (lo + hi) * 0.5;
            if (this._computeNaturalGroundHeight(isl.cx + ux * mid, isl.cz + uz * mid) > seaL + 0.5) lo = mid;
            else hi = mid;
          }
          shoreR = lo;
          break;
        }
        prevAbove = (h > seaL + 0.5);
      }

      // Anchor port slightly landward of exact water's edge so pier deck & boat ramp jut straight into deep water!
      const pierR = Math.max(startR, shoreR - 14);
      pt.x = Math.round(isl.cx + ux * pierR);
      pt.z = Math.round(isl.cz + uz * pierR);
      pt.ux = ux; pt.uz = uz;
      // Three.js +Z rotated by yaw points along (sin(yaw), cos(yaw)) -> yaw = atan2(ux, uz) faces straight out to sea!
      pt.yaw = Math.atan2(ux, uz);
      pt.approachX = Math.round(pt.x - ux * 58);
      pt.approachZ = Math.round(pt.z - uz * 58);

      // Snap outer-island coastal port towns cleanly ~190m inland behind their real harbor!
      if (pt.portTownId !== null && pt.portTownId !== undefined && KK.TOWNS[pt.portTownId]) {
        const tw = KK.TOWNS[pt.portTownId];
        const inlandDist = (isl.rx < 7000) ? 165 : 220;
        tw.x = Math.round(pt.x - ux * inlandDist);
        tw.z = Math.round(pt.z - uz * inlandDist);
      }
    }
  }

  // ==========================================================================
  // COLOSSAL 6-LANE OCEAN MEGA-BRIDGE (Mainland SW <-> Zolotoy Savanna NE)
  // Auto-snaps both bridgeheads to exact shorelines + streams pooled segments!
  // ==========================================================================
  _initMegaBridge() {
    if (!KK.ISLANDS || KK.ISLANDS.length < 3) return;
    const isl0 = KK.ISLANDS.find((x) => x.id === 0);
    const isl2 = KK.ISLANDS.find((x) => x.id === 2);
    if (!isl0 || !isl2) return;

    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const cfg = KK.MEGA_BRIDGE || {};
    const halfWidth = cfg.halfWidth || 16.0;
    const approachLen = cfg.approachLen || 260.0;
    const deckY = seaL + (cfg.deckElevationAboveSea || 16.0);

    // Ray from Mainland (id:0) straight to Zolotoy Savanna (id:2)
    const rayDx = isl2.cx - isl0.cx;
    const rayDz = isl2.cz - isl0.cz;
    const rayLen = Math.hypot(rayDx, rayDz) || 1;
    const dirX = rayDx / rayLen;
    const dirZ = rayDz / rayLen;
    // Right vector matching Three.js rotation.y = atan2(dirX, dirZ): local +X = (dirZ, -dirX), local +Z = (dirX, dirZ)
    const rightX = dirZ;
    const rightZ = -dirX;
    const yaw = Math.atan2(dirX, dirZ);

    // 1. Auto-find exact Mainland SW shoreline along +dir
    let shore0R = 45000;
    let prevAbove = true;
    for (let r = 24000; r <= 58000; r += 80) {
      const h = this._computeNaturalGroundHeight(isl0.cx + dirX * r, isl0.cz + dirZ * r);
      if (prevAbove && h <= seaL + 2.5) {
        let lo = Math.max(24000, r - 80), hi = r;
        for (let it = 0; it < 7; it++) {
          const mid = (lo + hi) * 0.5;
          if (this._computeNaturalGroundHeight(isl0.cx + dirX * mid, isl0.cz + dirZ * mid) > seaL + 2.5) lo = mid;
          else hi = mid;
        }
        shore0R = lo;
        break;
      }
      prevAbove = (h > seaL + 2.5);
    }

    // 2. Auto-find exact Zolotoy Savanna NE shoreline marching from isl2 toward isl0 (-dir)
    let shore2R = 14000;
    prevAbove = true;
    for (let r = 5000; r <= 24000; r += 80) {
      const h = this._computeNaturalGroundHeight(isl2.cx - dirX * r, isl2.cz - dirZ * r);
      if (prevAbove && h <= seaL + 2.5) {
        let lo = Math.max(5000, r - 80), hi = r;
        for (let it = 0; it < 7; it++) {
          const mid = (lo + hi) * 0.5;
          if (this._computeNaturalGroundHeight(isl2.cx - dirX * mid, isl2.cz - dirZ * mid) > seaL + 2.5) lo = mid;
          else hi = mid;
        }
        shore2R = lo;
        break;
      }
      prevAbove = (h > seaL + 2.5);
    }

    // Anchor both bridgeheads ~225m inland from shoreline so 260m approach causeways climb cleanly over dry coast to seaL+16m!
    const startR = Math.max(20000, shore0R - 225);
    const endR   = Math.max(4000, shore2R - 225);
    const startX = Math.round(isl0.cx + dirX * startR);
    const startZ = Math.round(isl0.cz + dirZ * startR);
    const endX   = Math.round(isl2.cx - dirX * endR);
    const endZ   = Math.round(isl2.cz - dirZ * endR);
    const totalLen = Math.hypot(endX - startX, endZ - startZ);
    const midX = (startX + endX) * 0.5;
    const midZ = (startZ + endZ) * 0.5;

    const startGroundY = Math.max(seaL + 3.0, this._computeNaturalGroundHeight(startX, startZ));
    const endGroundY   = Math.max(seaL + 3.0, this._computeNaturalGroundHeight(endX, endZ));

    const pad = halfWidth + 90.0;
    const minX = Math.min(startX, endX) - pad;
    const maxX = Math.max(startX, endX) + pad;
    const minZ = Math.min(startZ, endZ) - pad;
    const maxZ = Math.max(startZ, endZ) + pad;

    this.megaBridge = {
      id: cfg.id || "savanna_mega_bridge",
      name: cfg.name || "Krasno-Zolotoy 6-Lane Ocean Mega-Bridge",
      startX, startZ, endX, endZ, midX, midZ,
      totalLen, dirX, dirZ, rightX, rightZ, yaw,
      halfWidth, width: halfWidth * 2,
      deckY, approachLen,
      startGroundY, endGroundY,
      pylonSpacing: cfg.pylonSpacing || 600.0,
      segLength: cfg.segLength || 120.0,
      minX, maxX, minZ, maxZ
    };

    // Keep KK.MEGA_BRIDGE synced with exact auto-snapped coordinates for map_ui.js, start_menu.js & main.js!
    if (KK.MEGA_BRIDGE) {
      Object.assign(KK.MEGA_BRIDGE, {
        startX, startZ, endX, endZ, midX, midZ,
        totalLen, dirX, dirZ, rightX, rightZ, yaw,
        deckY, halfWidth, approachLen, startGroundY, endGroundY
      });
    }
  }

  _megaBridgeDeckYAt(alongDist) {
    const mb = this.megaBridge;
    if (!mb) return -16.0;
    if (alongDist <= 0) return mb.startGroundY;
    if (alongDist >= mb.totalLen) return mb.endGroundY;
    if (alongDist < mb.approachLen) {
      const u = alongDist / mb.approachLen;
      const s = u * u * (3 - 2 * u);
      return mb.startGroundY * (1 - s) + mb.deckY * s;
    }
    if (alongDist > mb.totalLen - mb.approachLen) {
      const u = (mb.totalLen - alongDist) / mb.approachLen;
      const s = u * u * (3 - 2 * u);
      return mb.endGroundY * (1 - s) + mb.deckY * s;
    }
    return mb.deckY;
  }

  // Analytical 6-Lane Ocean Mega-Bridge Deck Query (O(1) AABB reject -> zero cost away from bridge!)
  getMegaBridgeInfo(gx, gz) {
    const mb = this.megaBridge;
    if (!mb) return null;
    if (gx < mb.minX || gx > mb.maxX || gz < mb.minZ || gz > mb.maxZ) return null;

    const dx = gx - mb.startX, dz = gz - mb.startZ;
    const alongDist = dx * mb.dirX + dz * mb.dirZ;
    if (alongDist < -52.0 || alongDist > mb.totalLen + 52.0) return null;

    const latOffset = dx * mb.rightX + dz * mb.rightZ;
    const absLat = Math.abs(latOffset);
    if (absLat > mb.halfWidth + 28.0) return null;

    const onDeck = (alongDist >= -1.5 && alongDist <= mb.totalLen + 1.5 && absLat <= mb.halfWidth + 0.35);
    const onApproach = onDeck && (alongDist < mb.approachLen || alongDist > mb.totalLen - mb.approachLen);
    const deckY = this._megaBridgeDeckYAt(alongDist);

    // Smooth coastal embankment blend right at both bridgehead ground joins (-52..+22 and totalLen-22..totalLen+52)
    let embankmentBlend = 0;
    let embankmentY = mb.startGroundY;
    if (alongDist < 22.0) {
      embankmentY = mb.startGroundY;
      const uA = alongDist >= -8.0 ? Math.max(0, 1.0 - Math.max(0, alongDist) / 22.0) : Math.max(0, 1.0 - (-8.0 - alongDist) / 44.0);
      const uL = absLat <= mb.halfWidth + 2.0 ? 1.0 : Math.max(0, 1.0 - (absLat - (mb.halfWidth + 2.0)) / 24.0);
      const sA = uA * uA * (3 - 2 * uA), sL = uL * uL * (3 - 2 * uL);
      embankmentBlend = sA * sL;
    } else if (alongDist > mb.totalLen - 22.0) {
      embankmentY = mb.endGroundY;
      const dEnd = mb.totalLen - alongDist;
      const uA = dEnd >= -8.0 ? Math.max(0, 1.0 - Math.max(0, dEnd) / 22.0) : Math.max(0, 1.0 - (-8.0 - dEnd) / 44.0);
      const uL = absLat <= mb.halfWidth + 2.0 ? 1.0 : Math.max(0, 1.0 - (absLat - (mb.halfWidth + 2.0)) / 24.0);
      const sA = uA * uA * (3 - 2 * uA), sL = uL * uL * (3 - 2 * uL);
      embankmentBlend = sA * sL;
    }

    const isDash = (Math.floor(Math.max(0, alongDist) / 12.0) % 2) === 0;
    const isLine = onDeck && (
      Math.abs(absLat - 15.0) < 0.28 ||
      Math.abs(absLat - 1.15) < 0.26 ||
      (isDash && (Math.abs(absLat - 5.35) < 0.24 || Math.abs(absLat - 10.55) < 0.24))
    );

    return {
      onDeck, onApproach, deckY, alongDist,
      totalLen: mb.totalLen,
      latOffset, halfWidth: mb.halfWidth,
      dirX: mb.dirX, dirZ: mb.dirZ,
      rightX: mb.rightX, rightZ: mb.rightZ,
      startX: mb.startX, startZ: mb.startZ,
      endX: mb.endX, endZ: mb.endZ,
      midX: mb.midX, midZ: mb.midZ,
      yaw: mb.yaw,
      embankmentBlend, embankmentY, isLine
    };
  }

  // High-FPS Pooled Sliding Window Renderer for the 6-Lane Ocean Mega-Bridge (42 deck segs + 9 cable-stayed pylons!)
  _initMegaBridgeStreamPool() {
    if (!this.megaBridge) return;
    const mb = this.megaBridge;
    const segL = mb.segLength || 120.0;
    const hw = mb.halfWidth || 16.0;

    const grp = new THREE.Group();
    grp.visible = false;
    this.rootGroup.add(grp);
    this.megaBridgeGroup = grp;

    // Shared materials & geometries across all pooled segments (near-zero GPU memory & draw overhead!)
    const matAsphalt = new THREE.MeshStandardMaterial({ color: 0x242830, roughness: 0.84, metalness: 0.08 });
    const matGirder  = new THREE.MeshStandardMaterial({ color: 0x5c6670, roughness: 0.65, metalness: 0.35 });
    const matConc    = new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.78 });
    const matPylon   = new THREE.MeshStandardMaterial({ color: 0xd8e0e8, roughness: 0.48, metalness: 0.22 });
    const matSteel   = new THREE.MeshStandardMaterial({ color: 0x7a8896, roughness: 0.42, metalness: 0.68 });
    const matWhiteL  = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const matYellowL = new THREE.MeshBasicMaterial({ color: 0xffc83d });
    const matCyanG   = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const matAmberG  = new THREE.MeshBasicMaterial({ color: 0xffd073 });
    const matRedNav  = new THREE.MeshBasicMaterial({ color: 0xff2a3c });
    const matCable   = new THREE.MeshStandardMaterial({ color: 0xc2d0dc, roughness: 0.35, metalness: 0.72 });

    const geoDeck   = new THREE.BoxGeometry(hw * 2, 1.5, segL + 0.5);
    const geoUnder  = new THREE.BoxGeometry(hw * 1.72, 2.2, segL + 0.4);
    const geoMedian = new THREE.BoxGeometry(0.85, 0.46, segL + 0.3);
    const geoRail   = new THREE.BoxGeometry(0.55, 1.15, segL + 0.3);
    const geoSolidL = new THREE.BoxGeometry(0.24, 0.04, segL + 0.2);
    const geoDashL  = new THREE.BoxGeometry(0.22, 0.04, 8.0);
    const geoArchP  = new THREE.BoxGeometry(0.45, 9.5, 0.55);
    const geoArchT  = new THREE.BoxGeometry(hw * 2 + 1.2, 0.55, 0.65);
    const geoCyanS  = new THREE.BoxGeometry(hw * 2 + 0.4, 0.20, 0.72);
    const geoLampB  = new THREE.BoxGeometry(2.6, 0.22, 0.55);
    const geoPier   = new THREE.CylinderGeometry(2.0, 2.6, 56, 8);

    const segCount = 42; // 42 * 120m = 5.04 km visible corridor around the player!
    this._mbSegPool = [];
    for (let i = 0; i < segCount; i++) {
      const sg = new THREE.Group();
      sg.rotation.order = "YXZ";
      sg.visible = false;

      const deck = new THREE.Mesh(geoDeck, matAsphalt);
      deck.position.set(0, -0.75, 0);
      deck.receiveShadow = true;
      sg.add(deck);

      const girder = new THREE.Mesh(geoUnder, matGirder);
      girder.position.set(0, -2.4, 0);
      sg.add(girder);

      // Low mountable center concrete jersey median + dual yellow inner lines
      const med = new THREE.Mesh(geoMedian, matConc);
      med.position.set(0, 0.23, 0);
      sg.add(med);
      for (const lx of [-1.15, 1.15]) {
        const yl = new THREE.Mesh(geoSolidL, matYellowL);
        yl.position.set(lx, 0.03, 0);
        sg.add(yl);
      }
      // Solid white outer shoulder lines + outer steel/concrete guardrails
      for (const side of [-1, 1]) {
        const sl = new THREE.Mesh(geoSolidL, matWhiteL);
        sl.position.set(side * 15.0, 0.03, 0);
        sg.add(sl);
        const rail = new THREE.Mesh(geoRail, matSteel);
        rail.position.set(side * (hw - 0.15), 0.58, 0);
        sg.add(rail);
      }
      // 4 dashed white lane lines -> 6 crisp full lanes (3 per direction!)
      for (const lx of [-10.55, -5.35, 5.35, 10.55]) {
        for (let d = 0; d < 5; d++) {
          const dash = new THREE.Mesh(geoDashL, matWhiteL);
          dash.position.set(lx, 0.03, -segL * 0.5 + 12.0 + d * 24.0);
          sg.add(dash);
        }
      }
      // 2 Glowing Cyan/Amber Overhead Bridge Light Arches per 120m segment (every 60m)
      for (const az of [-segL * 0.25, segL * 0.25]) {
        for (const side of [-1, 1]) {
          const post = new THREE.Mesh(geoArchP, matSteel);
          post.position.set(side * (hw + 0.1), 4.75, az);
          sg.add(post);
        }
        const beam = new THREE.Mesh(geoArchT, matSteel);
        beam.position.set(0, 9.5, az);
        sg.add(beam);
        const cyanStrip = new THREE.Mesh(geoCyanS, matCyanG);
        cyanStrip.position.set(0, 9.88, az);
        sg.add(cyanStrip);
        for (const lx of [-9.0, 0, 9.0]) {
          const lamp = new THREE.Mesh(geoLampB, matAmberG);
          lamp.position.set(lx, 9.12, az);
          sg.add(lamp);
        }
      }
      // Twin concrete ocean support piers beneath each 120m segment
      for (const side of [-1, 1]) {
        const pier = new THREE.Mesh(geoPier, matConc);
        pier.position.set(side * 10.5, -30.0, 0);
        sg.add(pier);
      }

      grp.add(sg);
      this._mbSegPool.push(sg);
    }

    // 9 Pooled Towering Twin Cable-Stayed Suspension Pylons (every 600m!)
    const geoLeg    = new THREE.BoxGeometry(3.4, 118, 4.4);
    const geoBase   = new THREE.BoxGeometry(10.5, 22, 16.0);
    const geoCross  = new THREE.BoxGeometry(hw * 2 + 8.0, 3.2, 3.6);
    const geoCrown  = new THREE.BoxGeometry(hw * 2 + 6.0, 0.75, 4.1);
    const geoBeacon = new THREE.SphereGeometry(0.95, 8, 6);
    const cableGeos = [];
    const cableOffsets = [38, 74, 110, 146, 182, 218, 254];
    for (let ci = 0; ci < cableOffsets.length; ci++) {
      const zOff = cableOffsets[ci];
      const topY = 44.0 + ci * 3.8;
      const len = Math.hypot(zOff, topY);
      const ang = Math.atan2(zOff, topY);
      cableGeos.push({ geo: new THREE.CylinderGeometry(0.14, 0.14, len, 5), zOff, topY, ang });
    }

    const pylonCount = 9;
    this._mbPylonPool = [];
    for (let i = 0; i < pylonCount; i++) {
      const pg = new THREE.Group();
      pg.rotation.order = "YXZ";
      pg.visible = false;

      for (const side of [-1, 1]) {
        const px = side * (hw + 2.2);
        const leg = new THREE.Mesh(geoLeg, matPylon);
        leg.position.set(px, 18.0, 0);
        pg.add(leg);
        const caisson = new THREE.Mesh(geoBase, matConc);
        caisson.position.set(px, -24.0, 0);
        pg.add(caisson);
        const redL = new THREE.Mesh(geoBeacon, matRedNav);
        redL.position.set(px, 78.2, 0);
        pg.add(redL);

        // Fanned Stay-Cables fore (+Z) and aft (-Z) from upper pylon down to deck edge!
        for (let ci = 0; ci < cableGeos.length; ci++) {
          const cg = cableGeos[ci];
          for (const dir of [-1, 1]) {
            const cab = new THREE.Mesh(cg.geo, matCable);
            cab.position.set(side * (hw + 0.6), cg.topY * 0.5, dir * cg.zOff * 0.5);
            cab.rotation.x = -dir * cg.ang;
            pg.add(cab);
          }
        }
      }
      // 3 Architectural Crossbeams (sub-deck, mid-tower, crown) + glowing cyan/amber architectural bars!
      for (const cy of [-5.0, 38.0, 72.0]) {
        const cb = new THREE.Mesh(geoCross, matPylon);
        cb.position.set(0, cy, 0);
        pg.add(cb);
      }
      const crownCyan = new THREE.Mesh(geoCrown, matCyanG);
      crownCyan.position.set(0, 74.0, 0);
      pg.add(crownCyan);
      const midAmber = new THREE.Mesh(geoCrown, matAmberG);
      midAmber.position.set(0, 40.0, 0);
      pg.add(midAmber);

      grp.add(pg);
      this._mbPylonPool.push(pg);
    }
  }

  updateMegaBridgeStream(focusGx, focusGz) {
    const mb = this.megaBridge;
    if (!mb || !this.megaBridgeGroup) return;

    // Fast corridor distance check: if > 6km from the Mega-Bridge line segment, hide entire pool (0 draw calls!)
    const dx = focusGx - mb.startX, dz = focusGz - mb.startZ;
    const rawAlong = dx * mb.dirX + dz * mb.dirZ;
    const clampedAlong = Math.max(0, Math.min(mb.totalLen, rawAlong));
    const nearX = mb.startX + mb.dirX * clampedAlong;
    const nearZ = mb.startZ + mb.dirZ * clampedAlong;
    const distToBridge = Math.hypot(focusGx - nearX, focusGz - nearZ);

    if (distToBridge > 6000) {
      if (this.megaBridgeGroup.visible) this.megaBridgeGroup.visible = false;
      return;
    }
    this.megaBridgeGroup.visible = true;

    const segL = mb.segLength || 120.0;
    const totalSegs = Math.ceil(mb.totalLen / segL);
    const centerSegIdx = Math.floor(clampedAlong / segL);
    const pylonSp = mb.pylonSpacing || 600.0;
    const centerPylonIdx = Math.round(clampedAlong / pylonSp);

    // Reposition pooled deck segments ONLY when player crosses a 120m interval boundary!
    if (centerSegIdx !== this._lastMbSegIdx) {
      this._lastMbSegIdx = centerSegIdx;
      const poolN = this._mbSegPool.length;
      const halfN = Math.floor(poolN * 0.5);
      for (let i = 0; i < poolN; i++) {
        const sIdx = centerSegIdx - halfN + i;
        const sg = this._mbSegPool[i];
        if (sIdx < 0 || sIdx >= totalSegs) {
          sg.visible = false;
          continue;
        }
        const a0 = sIdx * segL;
        const a1 = Math.min(mb.totalLen, a0 + segL);
        const curL = a1 - a0;
        if (curL < 1.0) { sg.visible = false; continue; }
        const aMid = (a0 + a1) * 0.5;
        const y0 = this._megaBridgeDeckYAt(a0);
        const y1 = this._megaBridgeDeckYAt(a1);
        const yMid = (y0 + y1) * 0.5;
        const pitch = -Math.atan2(y1 - y0, curL);

        sg.visible = true;
        sg.position.set(mb.startX + mb.dirX * aMid, yMid, mb.startZ + mb.dirZ * aMid);
        sg.rotation.set(pitch, mb.yaw, 0);
        sg.scale.set(1, 1, (curL / segL) / Math.max(0.85, Math.cos(pitch)));
      }
    }

    // Reposition pooled cable-stayed pylons ONLY when player crosses a 600m interval!
    if (centerPylonIdx !== this._lastMbPylonIdx) {
      this._lastMbPylonIdx = centerPylonIdx;
      const pPoolN = this._mbPylonPool.length;
      const halfP = Math.floor(pPoolN * 0.5);
      const minAlong = mb.approachLen + 140;
      const maxAlong = mb.totalLen - mb.approachLen - 140;
      for (let i = 0; i < pPoolN; i++) {
        const pIdx = centerPylonIdx - halfP + i;
        const pg = this._mbPylonPool[i];
        const aP = pIdx * pylonSp;
        if (aP < minAlong || aP > maxAlong) {
          pg.visible = false;
          continue;
        }
        pg.visible = true;
        pg.position.set(mb.startX + mb.dirX * aP, mb.deckY, mb.startZ + mb.dirZ * aP);
        pg.rotation.set(0, mb.yaw, 0);
      }
    }
  }

  _buildRoadNetwork() {
    this.roadSegments = [];
    for (const [ia, ib] of KK.ROAD_LINKS) {
      const a = KK.TOWNS[ia], b = KK.TOWNS[ib];
      if (!a || !b) continue;
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const isMountain = (a.biome === "mountains" || b.biome === "mountains");
      const isTropikaHell = (a.biome === "tropical" && b.biome === "tropical");
      const isModernHwy = (a.biome === "savanna" && b.biome === "savanna");
      const isArcticRoad = (a.biome === "arctic" && b.biome === "arctic");

      const steps = isTropikaHell
        ? Math.max(24, Math.min(72, Math.floor(dist / 220)))
        : Math.max(6, Math.min(48, Math.floor(dist / 900)));
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let px = a.x + (b.x - a.x) * t;
        let pz = a.z + (b.z - a.z) * t;
        const env = Math.sin(t * Math.PI);
        if (env > 0.05 && dist > 1500) {
          const dx = (b.x - a.x) / dist, dz = (b.z - a.z) / dist;
          const nx = -dz, nz = dx;
          if (isTropikaHell) {
            const w1 = Math.sin(t * Math.PI * 5.0 + ia * 0.7) * Math.min(460, dist * 0.085);
            const w2 = Math.sin(t * Math.PI * 9.0 - ib * 0.5) * Math.min(140, dist * 0.028);
            const wobble = (w1 + w2) * env;
            px += nx * wobble; pz += nz * wobble;
          } else if (isModernHwy) {
            const wobble = Math.sin(t * Math.PI * 2.0) * Math.min(260, dist * 0.018) * env;
            px += nx * wobble; pz += nz * wobble;
          } else {
            const freq = isMountain ? 6.0 : (isArcticRoad ? 3.5 : 2.5);
            const amp = isMountain ? Math.min(850, dist * 0.045) : Math.min(420, dist * 0.025);
            const midPin = Math.abs(t - 0.5) < 0.14 ? (Math.abs(t - 0.5) / 0.14) : 1.0;
            const wobble = Math.sin(t * Math.PI * freq) * amp * env * midPin;
            px += nx * wobble; pz += nz * wobble;
          }
        }
        pts.push({ x: px, z: pz });
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        this.roadSegments.push({
          x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z,
          minX: Math.min(p0.x, p1.x) - 45, maxX: Math.max(p0.x, p1.x) + 45,
          minZ: Math.min(p0.z, p1.z) - 45, maxZ: Math.max(p0.z, p1.z) + 45,
          isMountain: isMountain || isTropikaHell,
          isTropikaHell,
          isModernHwy,
          width: isTropikaHell ? 5.1 : (isModernHwy ? 10.6 : (isMountain ? 5.6 : 7.4))
        });
      }
    }

    // ZOLOTOY CITY MASSIVE 6x6 GRID AVENUE NETWORK (7 N-S Avenues x 7 E-W Streets at -360..+360 + Central Roundabout!)
    if (KK.ZOLOTOY_CITY) {
      const zc = KK.ZOLOTOY_CITY;
      const hs = zc.halfSpan, pitch = zc.blockPitch, w = zc.roadWidth;
      const gridLim = 360;
      for (let off = -gridLim; off <= gridLim; off += pitch) {
        this.roadSegments.push({
          x0: zc.cx + off, z0: zc.cz - hs, x1: zc.cx + off, z1: zc.cz + hs,
          minX: zc.cx + off - 28, maxX: zc.cx + off + 28, minZ: zc.cz - hs - 28, maxZ: zc.cz + hs + 28,
          isMountain: false, isModernHwy: true, isCityGrid: true, width: w
        });
        this.roadSegments.push({
          x0: zc.cx - hs, z0: zc.cz + off, x1: zc.cx + hs, z1: zc.cz + off,
          minX: zc.cx - hs - 28, maxX: zc.cx + hs + 28, minZ: zc.cz + off - 28, maxZ: zc.cz + off + 28,
          isMountain: false, isModernHwy: true, isCityGrid: true, width: w
        });
      }
      // Circular asphalt roundabout ringing the Central Monumental Plaza (radius 33m, width 14m)
      const rbSegs = 16, rbRad = 33.0;
      for (let ri = 0; ri < rbSegs; ri++) {
        const a0 = (ri / rbSegs) * Math.PI * 2;
        const a1 = ((ri + 1) / rbSegs) * Math.PI * 2;
        const rx0 = zc.cx + Math.cos(a0) * rbRad, rz0 = zc.cz + Math.sin(a0) * rbRad;
        const rx1 = zc.cx + Math.cos(a1) * rbRad, rz1 = zc.cz + Math.sin(a1) * rbRad;
        this.roadSegments.push({
          x0: rx0, z0: rz0, x1: rx1, z1: rz1,
          minX: Math.min(rx0, rx1) - 24, maxX: Math.max(rx0, rx1) + 24,
          minZ: Math.min(rz0, rz1) - 24, maxZ: Math.max(rz0, rz1) + 24,
          isMountain: false, isModernHwy: true, isCityGrid: true, width: 13.5
        });
      }
    }

    // v15.1.1 COASTAL SPUR ROADS CONNECTING EVERY OCEAN PORT TO ITS NEAREST TOWN!
    if (KK.PORTS) {
      for (const pt of KK.PORTS) {
        const tw = (pt.nearTownId !== undefined && KK.TOWNS[pt.nearTownId]) ? KK.TOWNS[pt.nearTownId] : null;
        if (!tw) continue;
        const ax = pt.approachX !== undefined ? pt.approachX : pt.x;
        const az = pt.approachZ !== undefined ? pt.approachZ : pt.z;
        const dist = Math.hypot(ax - tw.x, az - tw.z);
        if (dist < 25) continue;
        const isSav = (tw.biome === "savanna");
        const isTrop = (tw.biome === "tropical");
        const steps = Math.max(4, Math.min(36, Math.floor(dist / 700)));
        let prevX = tw.x, prevZ = tw.z;
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          let px = tw.x + (ax - tw.x) * t;
          let pz = tw.z + (az - tw.z) * t;
          const env = Math.sin(t * Math.PI);
          if (env > 0.05 && dist > 1200) {
            const nx = -(az - tw.z) / dist, nz = (ax - tw.x) / dist;
            const wob = Math.sin(t * Math.PI * (isTrop ? 5.0 : 2.0)) * Math.min(320, dist * 0.025) * env;
            px += nx * wob; pz += nz * wob;
          }
          this.roadSegments.push({
            x0: prevX, z0: prevZ, x1: px, z1: pz,
            minX: Math.min(prevX, px) - 40, maxX: Math.max(prevX, px) + 40,
            minZ: Math.min(prevZ, pz) - 40, maxZ: Math.max(prevZ, pz) + 40,
            isMountain: false, isTropikaHell: isTrop, isModernHwy: isSav,
            width: isSav ? 9.6 : (isTrop ? 5.6 : 7.4)
          });
          prevX = px; prevZ = pz;
        }
      }
    }

    // ========================================================================
    // v17.2 COMPLEX BRANCHING ROAD NETWORK: RING ROADS, T-JUNCTIONS,
    // FOREST LOGGING SPURS, LANDMARK ACCESS ROADS & MOUNTAIN SWITCHBACK FORKS!
    // ========================================================================
    const addSmoothRoad = (ctrlPts, opts = {}) => {
      if (!ctrlPts || ctrlPts.length < 2) return;
      const subsPerSpan = opts.subs || 6;
      const w = opts.width || 6.4;
      const isMountain = !!opts.isMountain;
      const isDirtSpur = !!opts.isDirtSpur;
      const isModernHwy = !!opts.isModernHwy;

      const sampled = [];
      for (let i = 0; i < ctrlPts.length - 1; i++) {
        const p0 = ctrlPts[Math.max(0, i - 1)];
        const p1 = ctrlPts[i];
        const p2 = ctrlPts[i + 1];
        const p3 = ctrlPts[Math.min(ctrlPts.length - 1, i + 2)];
        for (let s = 0; s < subsPerSpan; s++) {
          const t = s / subsPerSpan;
          const t2 = t * t, t3 = t2 * t;
          const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
          const z = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
          sampled.push([x, z]);
        }
      }
      sampled.push(ctrlPts[ctrlPts.length - 1]);

      for (let i = 0; i < sampled.length - 1; i++) {
        const a = sampled[i], b = sampled[i + 1];
        this.roadSegments.push({
          x0: a[0], z0: a[1], x1: b[0], z1: b[1],
          minX: Math.min(a[0], b[0]) - 40, maxX: Math.max(a[0], b[0]) + 40,
          minZ: Math.min(a[1], b[1]) - 40, maxZ: Math.max(a[1], b[1]) + 40,
          isMountain, isDirtSpur, isModernHwy, isTropikaHell: false, width: w
        });
      }
    };

    // 1. KAMENKA VALLEY ORBITAL RING ROAD (Clean closed loop connecting HQ East, South, West & North arteries!)
    addSmoothRoad([
      [ 1350,   180], [ 2450,  1600], [ 1200,  3600], [ -1200,  4100],
      [-3400,  2600], [-3900,   200], [-2800, -2400], [  -400, -3200],
      [ 1800, -2100], [ 1350,   180]
    ], { width: 7.6, subs: 5 });

    // 2. JAMES MAY'S PUB COMPACT DRIVE-THRU BRANCH (Small loop off the HQ -> Vulkan road — zero dead ends!)
    if (KK.JAMES_MAY_BAR) {
      const jb = KK.JAMES_MAY_BAR;
      addSmoothRoad([
        [-980, 300], [jb.x + 85, jb.z + 35], [jb.x, jb.z + 22], [jb.x - 95, jb.z + 45], [-1560, 480]
      ], { width: 5.8, subs: 4 });
    }

    // 3. BLACK TIMBER TAIGA LOGGING BYPASS LOOP (Starts on East Hwy -> loops through taiga -> rejoins Cherny Les!)
    addSmoothRoad([
      [6200, 1150], [9800, -1800], [15600, -1400], [21200, 1400], [24500, 3800]
    ], { width: 5.2, isDirtSpur: true, subs: 5 });

    // 4. SOUTHERN DESERT CANYON BYPASS & HAMMOND'S MESA ACCESS SPUR (Connects Orbital Ring -> Hammond's Mesa -> Gorge Oasis!)
    if (KK.HAMMOND_MESA) {
      const hm = KK.HAMMOND_MESA;
      addSmoothRoad([
        [1200, 3600], [2400, 8200], [hm.x, hm.z], [4800, 18400], [6200, 25800]
      ], { width: 6.2, subs: 6 });
    }

    // 5. VOLCANIC CALDERA WESTERN CROSS-LINK (Connects Orbital Ring West -> T-Rex Valley -> Rzhavsk Depot!)
    addSmoothRoad([
      [-3900, 200], [-4350, 1320], [-6800, 4200], [-9200, 8800], [-11800, 14200]
    ], { width: 5.8, isDirtSpur: true, subs: 5 });

    // 6. NORTHERN ALPINE SWITCHBACK CROSS-LINK (Connects Klyuchi Weather Station <-> Severny Iron Quarry!)
    addSmoothRoad([
      [-22000, -24500], [-12500, -18200], [-2400, -21400], [7800, -25600], [18200, -31500]
    ], { width: 5.6, isMountain: true, subs: 6 });

    // 7. 6-LANE OCEAN MEGA-BRIDGE COASTAL EXPRESSWAY CONNECTORS (Mainland SW <-> Bridgehead & Savanna Bridgehead <-> Zolotoy City!)
    if (this.megaBridge) {
      const mb = this.megaBridge;
      const preStartX = mb.startX - mb.dirX * 160, preStartZ = mb.startZ - mb.dirZ * 160;
      const postEndX  = mb.endX + mb.dirX * 160,   postEndZ  = mb.endZ + mb.dirZ * 160;
      // Mainland SW connector from Buran Desert Radar (Town #8) & Rzhavsk Depot (Town #2) directly onto Mainland bridgehead
      const tBuran = KK.TOWNS[8];
      const tRzhavsk = KK.TOWNS[2];
      if (tBuran) {
        addSmoothRoad([
          [tBuran.x, tBuran.z],
          [(tBuran.x + preStartX) * 0.5, (tBuran.z + preStartZ) * 0.5],
          [preStartX, preStartZ],
          [mb.startX, mb.startZ]
        ], { width: 12.0, isModernHwy: true, subs: 8 });
      }
      if (tRzhavsk) {
        addSmoothRoad([
          [tRzhavsk.x, tRzhavsk.z],
          [(tRzhavsk.x + preStartX) * 0.5 - 600, (tRzhavsk.z + preStartZ) * 0.5 + 400],
          [preStartX, preStartZ],
          [mb.startX, mb.startZ]
        ], { width: 11.0, isModernHwy: true, subs: 10 });
      }
      // Savanna NE connector from Savanna bridgehead straight into Solnechny Heights (Town #17) & Zolotoy City (Town #11)!
      const tSol = KK.TOWNS[17];
      const tZol = KK.TOWNS[11];
      if (tZol) {
        const midSavX = tSol ? (tSol.x * 0.55 + postEndX * 0.45) : (postEndX + tZol.x) * 0.5;
        const midSavZ = tSol ? (tSol.z * 0.55 + postEndZ * 0.45) : (postEndZ + tZol.z) * 0.5;
        addSmoothRoad([
          [mb.endX, mb.endZ],
          [postEndX, postEndZ],
          [midSavX, midSavZ],
          [tZol.x + 360, tZol.z - 240],
          [tZol.x + 360, tZol.z]
        ], { width: 12.5, isModernHwy: true, subs: 10 });
      }
      if (tSol) {
        addSmoothRoad([
          [postEndX, postEndZ],
          [(postEndX + tSol.x) * 0.5, (postEndZ + tSol.z) * 0.5],
          [tSol.x, tSol.z]
        ], { width: 11.0, isModernHwy: true, subs: 6 });
      }
    }

    this._buildRoadSpatialGrid();
  }

  _buildRoadSpatialGrid() {
    const cell = this._roadGridCell || 500;
    const grid = new Map();
    const segs = this.roadSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      s._idx = i;
      s._qStamp = 0;
      const ix0 = Math.floor(s.minX / cell);
      const ix1 = Math.floor(s.maxX / cell);
      const iz0 = Math.floor(s.minZ / cell);
      const iz1 = Math.floor(s.maxZ / cell);
      for (let ix = ix0; ix <= ix1; ix++) {
        const kx = (ix + 32768) * 65536;
        for (let iz = iz0; iz <= iz1; iz++) {
          const key = kx + (iz + 32768);
          let bucket = grid.get(key);
          if (!bucket) { bucket = []; grid.set(key, bucket); }
          bucket.push(s);
        }
      }
    }
    this._roadGrid = grid;
  }

  _buildRiverNetwork() {
    this.riverSegments = [];
    this.riverSplines = [];
    if (!KK.RIVER_PATHS) return;

    for (const rp of KK.RIVER_PATHS) {
      const pts = rp.pts;
      const chain = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        // Fine ~100m sampling so rivers faithfully follow valleys without bridging over low terrain!
        const steps = Math.max(6, Math.min(280, Math.ceil(dist / 100)));
        for (let k = 0; k < steps; k++) {
          const t = k / steps;
          let px = a.x + (b.x - a.x) * t;
          let pz = a.z + (b.z - a.z) * t;
          const env = Math.sin(t * Math.PI);
          if (env > 0.05 && dist > 1200) {
            const dx = (b.x - a.x) / dist, dz = (b.z - a.z) / dist;
            const wob = Math.sin(t * Math.PI * 3.0 + i * 1.7) * Math.min(260, dist * 0.032) * env;
            px += -dz * wob; pz += dx * wob;
          }
          chain.push({ x: px, z: pz, y: 0, maxAllowedY: 0 });
        }
      }
      const last = pts[pts.length - 1];
      chain.push({ x: last.x, z: last.z, y: 0, maxAllowedY: 0 });

      // Compute centerH AND flanking left/right bank heights (+/-(hw + 18m)) so water NEVER rises above surrounding banks!
      const bankOff = rp.halfWidth + 18.0;
      const innerBankOff = rp.halfWidth + 8.0;
      for (let k = 0; k < chain.length; k++) {
        const cur = chain[k];
        const prev = chain[Math.max(0, k - 1)];
        const next = chain[Math.min(chain.length - 1, k + 1)];
        let tx = next.x - prev.x, tz = next.z - prev.z;
        const len = Math.hypot(tx, tz) || 1;
        tx /= len; tz /= len;
        const nx = -tz, nz = tx;

        const centerH = this._computeNaturalGroundHeight(cur.x, cur.z);
        const leftH   = this._computeNaturalGroundHeight(cur.x - nx * bankOff, cur.z - nz * bankOff);
        const rightH  = this._computeNaturalGroundHeight(cur.x + nx * bankOff, cur.z + nz * bankOff);
        const leftInH  = this._computeNaturalGroundHeight(cur.x - nx * innerBankOff, cur.z - nz * innerBankOff);
        const rightInH = this._computeNaturalGroundHeight(cur.x + nx * innerBankOff, cur.z + nz * innerBankOff);
        const minBankH = Math.min(centerH, leftH, rightH, leftInH, rightInH);

        cur.maxAllowedY = minBankH - 1.05;
        cur.y = minBankH - 1.35;
      }

      // 3 gentle Laplacian passes, strictly re-clamping <= maxAllowedY EVERY pass so rivers NEVER float above valleys!
      for (let pass = 0; pass < 3; pass++) {
        const nextY = new Float32Array(chain.length);
        nextY[0] = chain[0].y;
        nextY[chain.length - 1] = chain[chain.length - 1].y;
        for (let k = 1; k < chain.length - 1; k++) {
          nextY[k] = chain[k - 1].y * 0.25 + chain[k].y * 0.50 + chain[k + 1].y * 0.25;
        }
        for (let k = 0; k < chain.length; k++) {
          chain[k].y = Math.min(nextY[k], chain[k].maxAllowedY);
        }
      }

      // Gently enforce non-spiking downhill flow while strictly obeying <= maxAllowedY
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 1; k < chain.length - 1; k++) {
          const avgNbr = 0.5 * (chain[k - 1].y + chain[k + 1].y);
          if (chain[k].y > avgNbr + 0.18) {
            chain[k].y = avgNbr + 0.18;
          }
          if (chain[k].y > chain[k].maxAllowedY) {
            chain[k].y = chain[k].maxAllowedY;
          }
        }
      }

      // Smoothly match tributary junction elevation without ever pushing water above banks
      if (this.riverSplines.length > 0) {
        const mainChain = this.riverSplines[0].chain;
        let bestJ = mainChain[0], bestJD = 999999;
        for (const mn of mainChain) {
          const d = Math.hypot(mn.x - chain[0].x, mn.z - chain[0].z);
          if (d < bestJD) { bestJD = d; bestJ = mn; }
        }
        if (bestJD < 350) {
          const targetJ = Math.min(bestJ.y, chain[0].maxAllowedY);
          const deltaY = targetJ - chain[0].y;
          for (let k = 0; k < Math.min(12, chain.length); k++) {
            const blend = 1.0 - k / 12.0;
            chain[k].y = Math.min(chain[k].y + deltaY * blend, chain[k].maxAllowedY);
          }
        }
      }

      this.riverSplines.push({ id: rp.id, halfWidth: rp.halfWidth, depth: rp.depth, chain });
      const pad = rp.halfWidth + 62;
      for (let k = 0; k < chain.length - 1; k++) {
        const p0 = chain[k], p1 = chain[k + 1];
        this.riverSegments.push({
          x0: p0.x, z0: p0.z, y0: p0.y,
          x1: p1.x, z1: p1.z, y1: p1.y,
          minX: Math.min(p0.x, p1.x) - pad, maxX: Math.max(p0.x, p1.x) + pad,
          minZ: Math.min(p0.z, p1.z) - pad, maxZ: Math.max(p0.z, p1.z) + pad,
          halfWidth: rp.halfWidth, depth: rp.depth
        });
      }
    }

    // SNAP ALL SHALLOW RIVER FORDS DIRECTLY ONTO THE EXACT RIVER CENTERLINE + STORE ORIENTATION FOR BANK RAMPS!
    if (KK.RIVER_FORDS && this.riverSegments.length > 0) {
      for (const fd of KK.RIVER_FORDS) {
        let bestD = Infinity, bestX = fd.x, bestZ = fd.z, bestSeg = null;
        for (const seg of this.riverSegments) {
          const dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0;
          const len2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((fd.x - seg.x0) * dx + (fd.z - seg.z0) * dz) / len2));
          const px = seg.x0 + dx * t, pz = seg.z0 + dz * t;
          const d = Math.hypot(fd.x - px, fd.z - pz);
          if (d < bestD) { bestD = d; bestX = px; bestZ = pz; bestSeg = seg; }
        }
        if (bestD < 1200 && bestSeg) {
          fd.x = bestX; fd.z = bestZ;
          const dx = bestSeg.x1 - bestSeg.x0, dz = bestSeg.z1 - bestSeg.z0;
          const len = Math.hypot(dx, dz) || 1;
          fd._tx = dx / len; fd._tz = dz / len;
          fd._nx = -fd._tz;  fd._nz = fd._tx;
          fd._hw = bestSeg.halfWidth || 22;
        }
      }
    }

    // ALIGN EVERY BRIDGE (INCLUDING DESERT SPANS) TO ITS ACTUAL ROAD SEGMENT!
    if (KK.BRIDGES && this.roadSegments.length > 0) {
      for (const br of KK.BRIDGES) {
        let bestD = Infinity, bestX = br.x, bestZ = br.z;
        for (const seg of this.roadSegments) {
          if (seg.isCityGrid || seg.isDirtSpur) continue;
          const dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0;
          const len2 = dx * dx + dz * dz || 1;
          const t = Math.max(0, Math.min(1, ((br.x - seg.x0) * dx + (br.z - seg.z0) * dz) / len2));
          const px = seg.x0 + dx * t, pz = seg.z0 + dz * t;
          const d = Math.hypot(br.x - px, br.z - pz);
          if (d < bestD) { bestD = d; bestX = px; bestZ = pz; }
        }
        if (bestD > 4.0 && bestD < 450) {
          br.x = bestX; br.z = bestZ;
        }
      }
    }
    this._buildRiverSpatialGrid();
  }

  _buildRiverSpatialGrid() {
    const cell = this._riverGridCell || 500;
    const grid = new Map();
    const segs = this.riverSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const ix0 = Math.floor(s.minX / cell);
      const ix1 = Math.floor(s.maxX / cell);
      const iz0 = Math.floor(s.minZ / cell);
      const iz1 = Math.floor(s.maxZ / cell);
      for (let ix = ix0; ix <= ix1; ix++) {
        const kx = (ix + 32768) * 65536;
        for (let iz = iz0; iz <= iz1; iz++) {
          const key = kx + (iz + 32768);
          let bucket = grid.get(key);
          if (!bucket) { bucket = []; grid.set(key, bucket); }
          bucket.push(s);
        }
      }
    }
    this._riverGrid = grid;
  }

  _getRiverChannelInto(gx, gz, out) {
    let bestD = 999999, bestSeg = null, bestCx = gx, bestCz = gz, bestWaterY = -9999;
    let segs;
    if (this._riverGrid) {
      const cell = this._riverGridCell;
      const ix = Math.floor(gx / cell);
      const iz = Math.floor(gz / cell);
      segs = this._riverGrid.get((ix + 32768) * 65536 + (iz + 32768));
    } else {
      segs = this.riverSegments;
    }
    if (segs) {
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (gx < s.minX || gx > s.maxX || gz < s.minZ || gz > s.maxZ) continue;
        const vx = s.x1 - s.x0, vz = s.z1 - s.z0;
        const l2 = vx * vx + vz * vz;
        let t = l2 > 0 ? ((gx - s.x0) * vx + (gz - s.z0) * vz) / l2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = s.x0 + vx * t, cz = s.z0 + vz * t;
        const d = Math.hypot(gx - cx, gz - cz);
        if (d < bestD) {
          bestD = d; bestSeg = s; bestCx = cx; bestCz = cz;
          bestWaterY = s.y0 + t * (s.y1 - s.y0);
        }
      }
    }
    out.dist = bestD; out.seg = bestSeg; out.cx = bestCx; out.cz = bestCz; out.waterY = bestWaterY;
    return out;
  }

  getRiverChannel(gx, gz) {
    return this._getRiverChannelInto(gx, gz, { dist: 999999, seg: null, cx: gx, cz: gz, waterY: -9999 });
  }

  _getRiverFordInfoInto(gx, gz, out) {
    if (!KK.RIVER_FORDS) {
      out.blend = 0; out.depth = 4.5; out.ford = null;
      return out;
    }
    let maxB = 0, bestDepth = 0.48, bestFord = null;
    for (let i = 0; i < KK.RIVER_FORDS.length; i++) {
      const fd = KK.RIVER_FORDS[i];
      const dx = gx - fd.x, dz = gz - fd.z;
      const hw = fd._hw || 24;
      const maxReach = Math.max(fd.radius + 26, hw + 68);
      if (dx > maxReach || dx < -maxReach || dz > maxReach || dz < -maxReach) continue;

      let b = 0;
      if (fd._tx !== undefined) {
        // Oriented ford footprint: wide along-river crossing + full graded bank ramps out to hw + 52m on BOTH banks!
        const along = Math.abs(dx * fd._tx + dz * fd._tz);
        const across = Math.abs(dx * fd._nx + dz * fd._nz);
        const innerAlong = fd.radius * 0.65;
        const outerAlong = fd.radius + 24.0;
        const innerAcross = hw + 52.0;
        const outerAcross = hw + 68.0;
        if (along < outerAlong && across < outerAcross) {
          const uA = along <= innerAlong ? 1.0 : Math.max(0, 1.0 - (along - innerAlong) / (outerAlong - innerAlong));
          const uC = across <= innerAcross ? 1.0 : Math.max(0, 1.0 - (across - innerAcross) / (outerAcross - innerAcross));
          const sA = uA * uA * (3 - 2 * uA);
          const sC = uC * uC * (3 - 2 * uC);
          b = sA * sC;
        }
      } else {
        const d = Math.hypot(dx, dz);
        const outer = fd.radius + 26;
        if (d < outer) {
          const u = d <= fd.radius ? 1.0 : Math.max(0, 1.0 - (d - fd.radius) / 26.0);
          b = u * u * (3 - 2 * u);
        }
      }
      if (b > maxB) { maxB = b; bestDepth = fd.depth; bestFord = fd; }
    }
    out.blend = maxB; out.depth = bestDepth; out.ford = bestFord;
    return out;
  }

  getRiverFordInfo(gx, gz) {
    return this._getRiverFordInfoInto(gx, gz, { blend: 0, depth: 4.5, ford: null });
  }

  // v15.2.1 STRICT DRY-INLAND CHECK: Blocks ocean, beaches/coastlines, lakes & river channels!
  isMainlandDry(gx, gz, coastMarginM = 12.0, riverPadM = 18.0) {
    const islInfo = this.getIslandInfo(gx, gz);
    if (!islInfo || !islInfo.island || islInfo.island.id !== 0 || islInfo.mask < 0.72) return false;
    return this.isDryInland(gx, gz, coastMarginM, riverPadM);
  }

  isDryInland(gx, gz, coastMarginM = 8.0, riverPadM = 16.0) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const islInfo = this.getIslandInfo(gx, gz);
    if (!islInfo || !islInfo.island || islInfo.mask < 0.55) return false;
    const b = this.getBiomeWeights(gx, gz);
    if ((b.ocean || 0) > 0.08) return false;
    const rc = this.getRiverChannel(gx, gz);
    if (rc && rc.seg && rc.dist < rc.seg.halfWidth + Math.max(riverPadM, 16.0)) return false;
    if (KK.RIVERS) {
      for (let i = 0; i < KK.RIVERS.length; i++) {
        const rv = KK.RIVERS[i];
        const dx = gx - rv.x, dz = gz - rv.z;
        if (Math.abs(dx) < rv.rx + 18 && Math.abs(dz) < rv.rx + 18) {
          if (Math.hypot(dx, dz) < Math.max(rv.rx, rv.rz) + 12) return false;
        }
      }
    }
    const ti = this.getTerrainInfo(gx, gz, false);
    if (ti.waterDepth > 0.02) return false;
    if (ti.height < seaL + coastMarginM) return false;
    return true;
  }

  getWaterSurfaceAt(gx, gz) {
    let wy = -9999;
    const rc = this.getRiverChannel(gx, gz);
    if (rc.seg && rc.dist < rc.seg.halfWidth + 4.5) wy = Math.max(wy, rc.waterY);
    for (let i = 0; i < KK.RIVERS.length; i++) {
      const rv = KK.RIVERS[i];
      const dx = gx - rv.x, dz = gz - rv.z;
      if (Math.abs(dx) > rv.rx + 15 || Math.abs(dz) > rv.rx + 15) continue;
      const c = Math.cos(-rv.yaw), s = Math.sin(-rv.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      if ((lx * lx) / (rv.rx * rv.rx) + (lz * lz) / (rv.rz * rv.rz) < 1.05) {
        wy = Math.max(wy, this.getBaseHeight(rv.x + rv.rx * 0.9, rv.z) - 0.35);
      }
    }
    return wy;
  }

  // ZERO-LEAK SHARED GEOMETRIES & MATERIALS (Reused across every streamed chunk!)
  // v15.0 INFINITE OCEAN PLANE + FAR-HORIZON ARCHIPELAGO SILHOUETTES + COASTAL AIRSTRIP MARKERS!
  _buildOceanAndFarIslands() {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    // v15.3.1 OPAQUE PROCEDURAL WAVE-TEXTURED OCEAN (Zero full-screen alpha-blend overdraw!)
    const ocv = document.createElement("canvas"); ocv.width = 256; ocv.height = 256;
    const octx = ocv.getContext("2d");
    octx.fillStyle = "#0b4668"; octx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 8) {
      for (let x = 0; x < 256; x += 16) {
        const w = Math.sin(x * 0.08 + y * 0.14) * 0.5 + 0.5;
        octx.fillStyle = w > 0.62 ? "rgba(68, 165, 206, 0.24)" : "rgba(5, 34, 54, 0.26)";
        octx.fillRect(x, y, 14, 4);
        if (w > 0.88) {
          octx.fillStyle = "rgba(215, 245, 255, 0.30)";
          octx.fillRect(x + 2, y + 1, 7, 2);
        }
      }
    }
    this._oceanTex = new THREE.CanvasTexture(ocv);
    this._oceanTex.wrapS = this._oceanTex.wrapT = THREE.RepeatWrapping;
    this._oceanTex.repeat.set(520, 520);
    const oceanMat = new THREE.MeshStandardMaterial({
      map: this._oceanTex, color: 0x16648c, emissive: 0x052032,
      roughness: 0.26, metalness: 0.32, transparent: false
    });
    this.oceanMesh = new THREE.Mesh(new THREE.PlaneGeometry(42000, 42000, 1, 1), oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.set(0, seaL, 0);
    this.rootGroup.add(this.oceanMesh);

    // Far-horizon low-poly silhouettes for outer islands so you can spot them across the strait!
    this.farIslandsGroup = new THREE.Group();
    if (KK.ISLANDS) {
      for (const isl of KK.ISLANDS) {
        if (isl.id === 0) continue;
        const silCol = isl.biome === "tropical" ? 0x1e5c34
          : (isl.biome === "savanna" ? 0x8f7438
          : (isl.biome === "arctic" ? 0xbcd6e8 : 0x2c2426));
        const silMat = new THREE.MeshLambertMaterial({ color: silCol });
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.0, Math.max(45, isl.peakH * 0.85), 14), silMat);
        cone.scale.set(isl.rx * 0.72, 1.0, isl.rz * 0.72);
        cone.position.set(isl.cx, seaL + Math.max(20, isl.peakH * 0.32), isl.cz);
        this.farIslandsGroup.add(cone);
      }
    }
    this.rootGroup.add(this.farIslandsGroup);
  }

  // ==========================================================================
  // MAJOR REVAMP: ZOLOTOY CITY SAVANNA METROPOLIS
  // Monumental Plaza, Varied Architecture, Instanced Streetscape, 2 Driveable
  // City Overpasses, 4 Tram Stations, Physics Electric Tram & Living AI Traffic!
  // ==========================================================================
  _buildZolotoyMetropolis() {
    if (!KK.ZOLOTOY_CITY) return;
    const zc = KK.ZOLOTOY_CITY;
    const baseY = zc._baseH !== undefined ? zc._baseH : this.getBaseHeight(zc.cx, zc.cz);
    const grp = new THREE.Group();
    grp.position.set(zc.cx, baseY, zc.cz);

    const matGlass1    = new THREE.MeshStandardMaterial({ color: 0x3b7899, roughness: 0.18, metalness: 0.72 });
    const matGlass2    = new THREE.MeshStandardMaterial({ color: 0x1e4a63, roughness: 0.22, metalness: 0.65 });
    const matGlassTeal = new THREE.MeshStandardMaterial({ color: 0x20808d, roughness: 0.20, metalness: 0.68 });
    const matConc      = new THREE.MeshStandardMaterial({ color: 0xc4c8cc, roughness: 0.80 });
    const matConcDk    = new THREE.MeshStandardMaterial({ color: 0x6c757d, roughness: 0.85 });
    const matSandB     = new THREE.MeshStandardMaterial({ color: 0xdcc498, roughness: 0.82 });
    const matTerra     = new THREE.MeshStandardMaterial({ color: 0xc27d58, roughness: 0.84 });
    const matGoldSand  = new THREE.MeshStandardMaterial({ color: 0xe8c476, roughness: 0.62, metalness: 0.18 });
    const matTealStone = new THREE.MeshStandardMaterial({ color: 0x1aa6a6, roughness: 0.35, metalness: 0.42 });
    const matWinLit    = new THREE.MeshStandardMaterial({ color: 0xffe08a, emissive: 0xffb703, emissiveIntensity: 0.78 });
    const matWinCyan   = new THREE.MeshStandardMaterial({ color: 0x9cf6ff, emissive: 0x00d9ff, emissiveIntensity: 0.70 });
    const matRail      = new THREE.MeshStandardMaterial({ color: 0x454c54, metalness: 0.78, roughness: 0.32 });
    const matDark      = new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: 0.82 });
    const matAsphalt   = new THREE.MeshStandardMaterial({ color: 0x262b32, roughness: 0.88 });
    const matGrassPk   = new THREE.MeshStandardMaterial({ color: 0x3a8540, roughness: 0.90 });
    const matPole      = new THREE.MeshStandardMaterial({ color: 0x3a424c, metalness: 0.68, roughness: 0.38 });
    const matLamp      = new THREE.MeshBasicMaterial({ color: 0xfff0b3 });
    const matRedL      = new THREE.MeshBasicMaterial({ color: 0xff3b30 });
    const matGrnL      = new THREE.MeshBasicMaterial({ color: 0x2de08b });
    const matCyanGlow  = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const matAmberGlow = new THREE.MeshBasicMaterial({ color: 0xffc83d });
    const matMagGlow   = new THREE.MeshBasicMaterial({ color: 0xff4d94 });
    const matWhite     = new THREE.MeshBasicMaterial({ color: 0xf1f5f9 });
    const matCanopy1   = new THREE.MeshStandardMaterial({ color: 0x1c7c8c, roughness: 0.72 });
    const matCanopy2   = new THREE.MeshStandardMaterial({ color: 0xc95a36, roughness: 0.75 });
    const matCanopy3   = new THREE.MeshStandardMaterial({ color: 0xd99b26, roughness: 0.72 });
    const matWoodBench = new THREE.MeshStandardMaterial({ color: 0x7d5432, roughness: 0.88 });

    // Instancing batcher for ultra-high FPS city streetscape & architectural details!
    const instMap = new Map();
    const _dm = new THREE.Object3D();
    const pushInst = (key, geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => {
      let bk = instMap.get(key);
      if (!bk) { bk = { geo, mat, mats: [] }; instMap.set(key, bk); }
      _dm.position.set(px, py, pz);
      _dm.rotation.set(rx, ry, rz);
      _dm.scale.set(sx, sy, sz);
      _dm.updateMatrix();
      bk.mats.push(_dm.matrix.clone());
    };

    const geoUnitBox = new THREE.BoxGeometry(1, 1, 1);
    const geoUnitCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
    const geoLampOrb = new THREE.SphereGeometry(0.32, 6, 6);
    const geoPalmT   = this.geoPalmSeg || new THREE.CylinderGeometry(0.18, 0.26, 2.8, 6);
    const geoPalmF   = this.geoPalmFrond || new THREE.BoxGeometry(0.62, 0.06, 3.6);
    const geoAcaC    = this.geoAcaciaCanopy || new THREE.CylinderGeometry(3.8, 2.2, 0.95, 8);

    const addPalmAt = (px, pz, sc = 1.0, rot = 0) => {
      pushInst("c_palm_t", geoPalmT, this.matPalmTrunk, px, 2.8 * sc, pz, 0, rot, 0.06, 0.9 * sc, 2.0 * sc, 0.9 * sc);
      for (let f = 0; f < 6; f++) {
        const fa = rot + (f / 6) * Math.PI * 2;
        pushInst("c_palm_f", geoPalmF, this.matPalmLeaf, px + Math.sin(fa) * 1.45 * sc, 5.5 * sc, pz + Math.cos(fa) * 1.45 * sc, 0.34, fa, 0, sc, sc, sc);
      }
    };
    const addAcaciaAt = (px, pz, sc = 1.0) => {
      pushInst("c_aca_t", geoPalmT, this.matAcaciaBark, px, 1.85 * sc, pz, 0, 0, 0, 1.15 * sc, 1.35 * sc, 1.15 * sc);
      pushInst("c_aca_c", geoAcaC, this.matAcaciaLeaf, px, 3.85 * sc, pz, 0, 0, 0, sc, sc, sc);
      pushInst("c_aca_c", geoAcaC, this.matAcaciaLeaf, px + 0.8 * sc, 4.45 * sc, pz + 0.5 * sc, 0, 0, 0, 0.65 * sc, 0.72 * sc, 0.65 * sc);
    };

    // ------------------------------------------------------------------------
    // 1. CENTRAL MONUMENTAL PLAZA (Roundabout Park, Obelisk Monument & Glowing Fountain!)
    // ------------------------------------------------------------------------
    const plazaPark = new THREE.Mesh(new THREE.CylinderGeometry(24.5, 25.5, 0.45, 28), matGrassPk);
    plazaPark.position.set(0, 0.22, 0); plazaPark.receiveShadow = true; grp.add(plazaPark);
    const plazaCurb = new THREE.Mesh(new THREE.TorusGeometry(25.2, 0.42, 6, 32), matGoldSand);
    plazaCurb.rotation.x = Math.PI * 0.5; plazaCurb.position.y = 0.45; grp.add(plazaCurb);

    // Glowing Circular Water Fountain Basin around the Obelisk!
    const ftnRim = new THREE.Mesh(new THREE.TorusGeometry(12.2, 0.65, 8, 28), matGoldSand);
    ftnRim.rotation.x = Math.PI * 0.5; ftnRim.position.y = 0.85; grp.add(ftnRim);
    const ftnWaterMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00b4d8, emissiveIntensity: 0.95, roughness: 0.12 });
    const ftnWater = new THREE.Mesh(new THREE.CylinderGeometry(11.9, 11.9, 0.32, 24), ftnWaterMat);
    ftnWater.position.y = 0.72; grp.add(ftnWater);
    const ftnSpray = new THREE.Mesh(new THREE.TorusGeometry(7.8, 0.22, 6, 24), matCyanGlow);
    ftnSpray.rotation.x = Math.PI * 0.5; ftnSpray.position.y = 2.0; grp.add(ftnSpray);
    this.cityFountainGlow = { waterMat: ftnWaterMat, spray: ftnSpray };

    // Stepped Golden-Sandstone & Teal Obelisk Monument
    for (let st = 0; st < 3; st++) {
      const wSt = 9.4 - st * 1.8;
      const stepM = new THREE.Mesh(new THREE.BoxGeometry(wSt, 1.35, wSt), st === 1 ? matTealStone : matGoldSand);
      stepM.position.y = 0.68 + st * 1.35; stepM.castShadow = true; grp.add(stepM);
    }
    const obShaft = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 2.85, 24.0, 4), matGoldSand);
    obShaft.rotation.y = Math.PI * 0.25; obShaft.position.y = 16.0; obShaft.castShadow = true; grp.add(obShaft);
    const obBand = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.35, 3.6, 4), matTealStone);
    obBand.rotation.y = Math.PI * 0.25; obBand.position.y = 17.5; grp.add(obBand);
    const obTip = new THREE.Mesh(new THREE.ConeGeometry(2.05, 5.8, 4), matTealStone);
    obTip.rotation.y = Math.PI * 0.25; obTip.position.y = 30.9; grp.add(obTip);
    const obBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), matAmberGlow);
    obBeacon.position.y = 34.8; grp.add(obBeacon);

    // Solid collider strictly around the central fountain/monument plinth (leaves circular roundabout road 100% driveable!)
    this.buildingColliders.push({
      minX: zc.cx - 12.2, maxX: zc.cx + 12.2,
      minZ: zc.cz - 12.2, maxZ: zc.cz + 12.2,
      yMin: baseY - 2, yMax: baseY + 35, label: "Zolotoy Monumental Plaza"
    });

    // Manicured Roundabout Park Palms, Acacias & 8 Benches
    for (let bi = 0; bi < 8; bi++) {
      const ba = (bi / 8) * Math.PI * 2;
      const bx = Math.cos(ba) * 18.5, bz = Math.sin(ba) * 18.5;
      if (bi % 2 === 0) addPalmAt(bx, bz, 1.05, ba);
      else addAcaciaAt(bx, bz, 0.88);
      const bnx = Math.cos(ba + 0.39) * 16.2, bnz = Math.sin(ba + 0.39) * 16.2;
      pushInst("c_bench", geoUnitBox, matWoodBench, bnx, 0.78, bnz, 0, -ba - 0.39, 0, 0.85, 0.45, 2.4);
      pushInst("c_pole", geoUnitCyl, matPole, Math.cos(ba + 0.2) * 22.8, 3.2, Math.sin(ba + 0.2) * 22.8, 0, 0, 0, 0.22, 6.4, 0.22);
      pushInst("c_lamp", geoLampOrb, matLamp, Math.cos(ba + 0.2) * 22.8, 6.5, Math.sin(ba + 0.2) * 22.8);
    }

    // ------------------------------------------------------------------------
    // 2. TWO ELEVATED DRIVEABLE CITY OVERPASS BRIDGES (Drive OVER and UNDER!)
    //    - Overpass 1: E-W along z = -120, crossing over Central N-S Ave (x = 0)
    //    - Overpass 2: N-S along x = +120, crossing over Central E-W Ave (z = 0)
    // ------------------------------------------------------------------------
    this.cityOverpasses = [
      { id: "zol_ov_ew", axis: "x", cx: zc.cx + 0,   cz: zc.cz - 120, lxLocal: 0,   lzLocal: -120, flatHalf: 32, rampLen: 58, halfW: 5.8, deckOffY: 6.8, baseY },
      { id: "zol_ov_ns", axis: "z", cx: zc.cx + 120, cz: zc.cz + 0,   lxLocal: 120, lzLocal: 0,    flatHalf: 32, rampLen: 58, halfW: 5.8, deckOffY: 6.8, baseY }
    ];
    for (const ov of this.cityOverpasses) {
      const ovGrp = new THREE.Group();
      ovGrp.position.set(ov.lxLocal, 0, ov.lzLocal);
      if (ov.axis === "z") ovGrp.rotation.y = -Math.PI * 0.5; // Local +X runs along overpass direction!

      const spanW = ov.halfW * 2;
      const flatLen = ov.flatHalf * 2;
      const deckM = new THREE.Mesh(new THREE.BoxGeometry(flatLen + 0.6, 0.85, spanW), matAsphalt);
      deckM.position.set(0, ov.deckOffY - 0.42, 0); deckM.receiveShadow = true; deckM.castShadow = true; ovGrp.add(deckM);
      const deckTrim = new THREE.Mesh(new THREE.BoxGeometry(flatLen + 0.6, 0.22, spanW + 0.6), matConc);
      deckTrim.position.set(0, ov.deckOffY - 0.88, 0); ovGrp.add(deckTrim);

      // Guardrails + glowing cyan edge stripe + center yellow divider along flat span
      const midLine = new THREE.Mesh(new THREE.BoxGeometry(flatLen, 0.04, 0.28), matAmberGlow);
      midLine.position.set(0, ov.deckOffY + 0.03, 0); ovGrp.add(midLine);
      for (const side of [-1, 1]) {
        const gr = new THREE.Mesh(new THREE.BoxGeometry(flatLen + 0.4, 0.95, 0.45), matConc);
        gr.position.set(0, ov.deckOffY + 0.48, side * (ov.halfW - 0.15)); ovGrp.add(gr);
        const neon = new THREE.Mesh(new THREE.BoxGeometry(flatLen, 0.14, 0.52), matCyanGlow);
        neon.position.set(0, ov.deckOffY + 0.72, side * (ov.halfW - 0.15)); ovGrp.add(neon);
      }

      // Smoothly sloped graded approach ramps on BOTH ends (4 smooth piecewise segments matching C1 cubic ramp!)
      const rSub = 4;
      const subL = ov.rampLen / rSub;
      for (const endSign of [-1, 1]) {
        for (let rs = 0; rs < rSub; rs++) {
          const d0 = ov.flatHalf + rs * subL;
          const d1 = d0 + subL;
          const u0 = 1.0 - (rs / rSub), u1 = 1.0 - ((rs + 1) / rSub);
          const y0 = ov.deckOffY * (u0 * u0 * (3 - 2 * u0));
          const y1 = ov.deckOffY * (u1 * u1 * (3 - 2 * u1));
          const yMid = (y0 + y1) * 0.5;
          const segDiag = Math.hypot(subL, y1 - y0) + 0.35;
          const pitch = Math.atan2(y1 - y0, subL) * endSign;
          const xMid = endSign * (d0 + subL * 0.5);

          const rSlab = new THREE.Mesh(new THREE.BoxGeometry(segDiag, 0.75, spanW), matAsphalt);
          rSlab.position.set(xMid, yMid - 0.38, 0);
          rSlab.rotation.z = pitch;
          rSlab.receiveShadow = true;
          ovGrp.add(rSlab);

          for (const side of [-1, 1]) {
            const rGr = new THREE.Mesh(new THREE.BoxGeometry(segDiag, 0.85, 0.42), matConc);
            rGr.position.set(xMid, yMid + 0.42, side * (ov.halfW - 0.15));
            rGr.rotation.z = pitch;
            ovGrp.add(rGr);
          }
          // Solid concrete support wall beneath upper ramp sections
          if (yMid > 1.2) {
            const wall = new THREE.Mesh(new THREE.BoxGeometry(subL - 0.6, yMid - 0.3, spanW * 0.86), matConcDk);
            wall.position.set(xMid, (yMid - 0.3) * 0.5, 0);
            ovGrp.add(wall);
          }
        }
      }

      // Concrete piers cleanly flanking the 14m cross-avenue underneath (at +/-18m and +/-33m -> 36m clear underpass!)
      for (const px of [-33, -18, 18, 33]) {
        for (const pz of [-ov.halfW + 1.2, ov.halfW - 1.2]) {
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.88, ov.deckOffY - 0.4, 8), matConc);
          pier.position.set(px, (ov.deckOffY - 0.4) * 0.5, pz);
          ovGrp.add(pier);
          // Add pier collider strictly at pier column so underpass remains wide open!
          const wx = ov.axis === "x" ? (ov.cx + px) : (ov.cx - pz);
          const wz = ov.axis === "x" ? (ov.cz + pz) : (ov.cz + px);
          this.buildingColliders.push({
            minX: wx - 0.95, maxX: wx + 0.95, minZ: wz - 0.95, maxZ: wz + 0.95,
            yMin: baseY - 1, yMax: baseY + ov.deckOffY, label: "Overpass Pier"
          });
        }
        // Overhead streetlamps on overpass parapet
        for (const side of [-1, 1]) {
          const lp = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 4.8, 6), matPole);
          lp.position.set(px, ov.deckOffY + 2.4, side * (ov.halfW - 0.15));
          ovGrp.add(lp);
          const lb = new THREE.Mesh(geoLampOrb, matLamp);
          lb.position.set(px, ov.deckOffY + 4.9, side * (ov.halfW - 0.15));
          ovGrp.add(lb);
        }
      }
      grp.add(ovGrp);
    }

    // ------------------------------------------------------------------------
    // 3. VARIED CITY ARCHITECTURE ACROSS ALL 36 ALIGNED BLOCKS!
    //    Avenues are at -360,-240,-120,0,120,240,360 -> Blocks centered at -300,-180,-60,60,180,300!
    // ------------------------------------------------------------------------
    const pitch = zc.blockPitch;
    const canopyMats = [matCanopy1, matCanopy2, matCanopy3];
    const billMats   = [matCyanGlow, matAmberGlow, matMagGlow, matGrnL];
    const towerMats  = [matGlass1, matGlass2, matGlassTeal, matConc, matSandB, matTerra];

    for (let bx = -3; bx < 3; bx++) {
      for (let bz = -3; bz < 3; bz++) {
        const blockCx = (bx + 0.5) * pitch;
        const blockCz = (bz + 0.5) * pitch;
        const distCenter = Math.hypot(blockCx, blockCz);
        const isDowntown = distCenter < 245;
        const isMidtown  = distCenter >= 245 && distCenter < 355;

        const subOffs = [[-22, -22], [22, -20], [-20, 22], [22, 22]];
        const bCount = isDowntown ? 3 : 2;
        for (let si = 0; si < bCount; si++) {
          const off = subOffs[(si + Math.abs(bx + bz)) % subOffs.length];
          const lx = blockCx + off[0];
          const lz = blockCz + off[1];
          // Keep clear of Central Monumental Plaza roundabout (r <= 50m)
          if (Math.hypot(lx, lz) < 52) continue;

          const s1 = this.hash2(bx * 41 + si * 11, bz * 37 - si * 17);
          const s2 = this.hash2(bx * 19 - si * 7,  bz * 53 + si * 23);
          const archStyle = Math.floor(s1 * 3); // 0=Glass Skyscraper, 1=Stepped Soviet-Modernist, 2=Savanna Commercial

          const bw = isDowntown ? (22 + s2 * 14) : (isMidtown ? (20 + s2 * 12) : (18 + s2 * 12));
          const bd = isDowntown ? (22 + s1 * 12) : (isMidtown ? (18 + s1 * 12) : (16 + s1 * 12));
          const bh = isDowntown ? (34 + s2 * 48) : (isMidtown ? (18 + s2 * 26) : (11 + s2 * 15));

          const bMat = (archStyle === 0 || (isDowntown && si === 0))
            ? towerMats[Math.floor(s2 * 3)]
            : towerMats[3 + Math.floor(s1 * 3)];

          // Main tower volume
          const tower = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), bMat);
          tower.position.set(lx, bh * 0.5, lz);
          tower.castShadow = true; tower.receiveShadow = true;
          grp.add(tower);

          // Stepped upper crown for Soviet-modernist & sleek downtown towers!
          let topY = bh;
          if (bh > 24 && s1 > 0.32) {
            const topH = 6 + s2 * 12;
            const topW = bw * 0.66, topD = bd * 0.66;
            const upper = new THREE.Mesh(new THREE.BoxGeometry(topW, topH, topD), archStyle === 0 ? matGlassTeal : matGoldSand);
            upper.position.set(lx, bh + topH * 0.5, lz);
            grp.add(upper);
            topY = bh + topH;
          }

          // Rooftop details: Helipad, Radio Spire, Water Tower, or AC Penthouse!
          if (topY > 48 && si === 0) {
            // Rooftop Helipad with glowing 'H' & corner beacons
            pushInst("c_heli_pad", geoUnitCyl, matConcDk, lx, topY + 0.25, lz, 0, 0, 0, Math.min(bw, bd) * 0.52, 0.45, Math.min(bw, bd) * 0.52);
            pushInst("c_heli_h", geoUnitBox, matAmberGlow, lx, topY + 0.52, lz, 0, 0, 0, 4.4, 0.08, 0.85);
            pushInst("c_heli_h", geoUnitBox, matAmberGlow, lx - 2.0, topY + 0.52, lz, 0, 0, 0, 0.85, 0.08, 5.0);
            pushInst("c_heli_h", geoUnitBox, matAmberGlow, lx + 2.0, topY + 0.52, lz, 0, 0, 0, 0.85, 0.08, 5.0);
          } else if (topY > 36 && s2 > 0.52) {
            // Tall Radio Spire + red aviation beacon
            pushInst("c_spire", geoUnitCyl, matPole, lx, topY + 7.5, lz, 0, 0, 0, 0.35, 15.0, 0.35);
            pushInst("c_spire_r", geoLampOrb, matRedL, lx, topY + 15.2, lz, 0, 0, 0, 1.4, 1.4, 1.4);
          } else if (s1 > 0.58) {
            // Rooftop Water Tower
            pushInst("c_wt_leg", geoUnitCyl, matPole, lx - 2.2, topY + 1.4, lz - 2.2, 0, 0, 0, 0.4, 2.8, 0.4);
            pushInst("c_wt_leg", geoUnitCyl, matPole, lx + 2.2, topY + 1.4, lz + 2.2, 0, 0, 0, 0.4, 2.8, 0.4);
            pushInst("c_wt_tank", geoUnitCyl, matConc, lx, topY + 4.2, lz, 0, 0, 0, 4.2, 3.4, 4.2);
          } else {
            // Rooftop AC Penthouse Box
            pushInst("c_ac", geoUnitBox, matConcDk, lx + 2.0, topY + 1.2, lz - 1.5, 0, 0, 0, 5.2, 2.4, 4.0);
          }

          // Instanced glowing multi-floor window bands!
          const winKey = (archStyle === 0) ? "c_win_c" : "c_win_w";
          const winMat = (archStyle === 0) ? matWinCyan : matWinLit;
          const bandCount = Math.min(6, Math.max(2, Math.floor(bh / 8.5)));
          for (let fl = 1; fl <= bandCount; fl++) {
            const fy = fl * (bh / (bandCount + 1));
            pushInst(winKey, geoUnitBox, winMat, lx, fy, lz, 0, 0, 0, bw + 0.36, 1.35, bd + 0.36);
          }

          // Ground-floor shaded shopfront canopy!
          const canMat = canopyMats[(Math.abs(bx * 3 + bz + si)) % canopyMats.length];
          pushInst("c_can_" + ((Math.abs(bx * 3 + bz + si)) % 3), geoUnitBox, canMat, lx, 3.6, lz, 0, 0, 0, bw + 3.2, 0.42, bd + 3.2);

          // Vibrant glowing facade / rooftop billboards on prominent towers
          if ((isDowntown || si === 0) && s2 > 0.42) {
            const bmIdx = Math.floor(s1 * 4) % 4;
            const facingX = (si % 2 === 0);
            pushInst("c_bill_" + bmIdx, geoUnitBox, billMats[bmIdx],
              lx + (facingX ? (bw * 0.5 + 0.4) : 0),
              Math.min(bh - 3.5, 14 + s2 * 16),
              lz + (facingX ? 0 : (bd * 0.5 + 0.4)),
              0, 0, 0,
              facingX ? 0.5 : Math.min(12, bw * 0.65),
              3.4,
              facingX ? Math.min(12, bd * 0.65) : 0.5
            );
          }

          this.buildingColliders.push({
            minX: zc.cx + lx - bw * 0.5, maxX: zc.cx + lx + bw * 0.5,
            minZ: zc.cz + lz - bd * 0.5, maxZ: zc.cz + lz + bd * 0.5,
            yMin: baseY - 2, yMax: baseY + topY + 1, label: "Zolotoy Tower"
          });
        }
      }
    }

    // ------------------------------------------------------------------------
    // 4. BOULEVARD STREETSCAPE (Instanced Trees, Crosswalks, Streetlamps,
    //    Traffic-Light Gantries & Parked Roadside Cars!)
    // ------------------------------------------------------------------------
    const aveCoordsAll = [-360, -240, -120, 0, 120, 240, 360];
    for (let ai = 0; ai < aveCoordsAll.length; ai++) {
      const ix = aveCoordsAll[ai];
      for (let aj = 0; aj < aveCoordsAll.length; aj++) {
        const iz = aveCoordsAll[aj];
        if (Math.hypot(ix, iz) < 55) continue;

        // Tall dual-arm streetlamps at corners
        pushInst("c_pole", geoUnitCyl, matPole, ix + 9.4, 3.6, iz + 9.4, 0, 0, 0, 0.24, 7.2, 0.24);
        pushInst("c_pole", geoUnitBox, matPole, ix + 8.3, 7.1, iz + 9.4, 0, 0, 0, 2.4, 0.16, 0.16);
        pushInst("c_lamp", geoLampOrb, matLamp, ix + 7.2, 7.0, iz + 9.4);

        // Zebra crosswalks on all 4 arms of every intersection (skip overpass center piers)
        const isOvCenter = (ix === 0 && iz === -120) || (ix === 120 && iz === 0);
        if (!isOvCenter) {
          for (let zs = -2; zs <= 2; zs++) {
            const offZ = zs * 2.1;
            pushInst("c_zebra", geoUnitBox, matWhite, ix + offZ, 0.05, iz + 10.5, 0, 0, 0, 0.85, 0.05, 3.4);
            pushInst("c_zebra", geoUnitBox, matWhite, ix + offZ, 0.05, iz - 10.5, 0, 0, 0, 0.85, 0.05, 3.4);
            pushInst("c_zebra", geoUnitBox, matWhite, ix + 10.5, 0.05, iz + offZ, 0, 0, 0, 3.4, 0.05, 0.85);
            pushInst("c_zebra", geoUnitBox, matWhite, ix - 10.5, 0.05, iz + offZ, 0, 0, 0, 3.4, 0.05, 0.85);
          }
        }

        // Traffic-light gantry at downtown/midtown intersections!
        if (Math.abs(ix) <= 240 && Math.abs(iz) <= 240 && !isOvCenter) {
          pushInst("c_pole", geoUnitCyl, matPole, ix - 9.2, 3.0, iz - 9.2, 0, 0, 0, 0.22, 6.0, 0.22);
          pushInst("c_pole", geoUnitBox, matPole, ix - 6.0, 5.75, iz - 9.2, 0, 0, 0, 6.6, 0.18, 0.18);
          pushInst("c_sig",  geoUnitBox, matDark, ix - 4.2, 5.55, iz - 9.2, 0, 0, 0, 0.55, 1.35, 0.45);
          const isGrn = ((ix + iz) % 240 === 0);
          pushInst(isGrn ? "c_sig_g" : "c_sig_r", geoLampOrb, isGrn ? matGrnL : matRedL, ix - 4.2, isGrn ? 5.25 : 5.85, iz - 8.92, 0, 0, 0, 0.55, 0.55, 0.55);
        }

        // Boulevard savanna palms & acacia shade trees lining sidewalks!
        if ((ai + aj) % 2 === 0) addPalmAt(ix + 11.4, iz - 11.4, 1.0, ai * 0.7);
        else addAcaciaAt(ix + 11.4, iz - 11.4, 0.92);
        // Mid-block boulevard trees & parked roadside cars along avenues!
        if (ai < aveCoordsAll.length - 1) {
          const midX = ix + 60;
          if (Math.hypot(midX, iz) > 54 && !(iz === -120 && Math.abs(midX) < 95)) {
            addAcaciaAt(midX, iz + 11.2, 0.85);
            addPalmAt(midX - 24, iz - 11.2, 0.95, aj);
            // Parked roadside car neatly tucked on sidewalk curb!
            if ((ai + aj) % 2 === 0) {
              const pColKey = "c_pcar_" + ((ai * 3 + aj) % 4);
              const pColMat = [matCanopy1, matCanopy2, matCanopy3, matConc][((ai * 3 + aj) % 4)];
              pushInst(pColKey, geoUnitBox, pColMat, midX + 18, 0.68, iz + 8.6, 0, 0, 0, 4.2, 0.78, 1.82);
              pushInst("c_pcar_cab", geoUnitBox, matDark, midX + 18, 1.30, iz + 8.6, 0, 0, 0, 2.2, 0.58, 1.62);
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // 5. TRAM RAIL LOOP (R = 240m) + 4 COVERED TRAM STATION PLATFORMS!
    // ------------------------------------------------------------------------
    const R = zc.tramRadius;
    for (const side of [-1, 1]) {
      for (const railOff of [-0.75, 0.75]) {
        const ns = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, R * 2 + 2), matRail);
        ns.position.set(side * R + railOff, 0.06, 0); grp.add(ns);
        const ew = new THREE.Mesh(new THREE.BoxGeometry(R * 2 + 2, 0.10, 0.16), matRail);
        ew.position.set(0, 0.06, side * R + railOff); grp.add(ew);
      }
    }

    // 4 Covered Tram Station Platforms at midpoints of the 4 sides (outer side of road so traffic & tram pass cleanly!)
    const tramStations = [
      { name: "East Plaza Station",  x:  R + 8.8, z:  0,       rotY: 0 },
      { name: "South Metro Station", x:  0,       z:  R + 8.8, rotY: Math.PI * 0.5 },
      { name: "West Park Station",   x: -R - 8.8, z:  0,       rotY: Math.PI },
      { name: "North Tower Station", x:  0,       z: -R - 8.8, rotY: -Math.PI * 0.5 }
    ];
    for (const st of tramStations) {
      const sGrp = new THREE.Group();
      sGrp.position.set(st.x, 0, st.z);
      sGrp.rotation.y = st.rotY;
      const plat = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.42, 26.0), matConc);
      plat.position.set(0, 0.21, 0); plat.receiveShadow = true; sGrp.add(plat);
      const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 25.8), matAmberGlow);
      edgeLine.position.set(-1.95, 0.44, 0); sGrp.add(edgeLine);
      // Glass & steel cantilevered shelter canopy
      for (const pz of [-9.5, 0, 9.5]) {
        const col = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.6, 0.28), matPole);
        col.position.set(1.4, 2.0, pz); sGrp.add(col);
      }
      const backGlass = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.8, 20.0), matGlassTeal);
      backGlass.position.set(1.55, 1.85, 0); sGrp.add(backGlass);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.26, 23.0), matConcDk);
      roof.position.set(0.1, 3.85, 0); sGrp.add(roof);
      const roofLight = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 19.0), matLamp);
      roofLight.position.set(-0.4, 3.68, 0); sGrp.add(roofLight);
      // Glowing Route Sign Pylon
      const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.25, 4.6), matCyanGlow);
      signBox.position.set(-1.4, 4.55, 0); sGrp.add(signBox);
      // Station benches
      for (const bz of [-5.2, 5.2]) {
        const bch = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.48, 3.2), matWoodBench);
        bch.position.set(0.55, 0.65, bz); sGrp.add(bch);
      }
      grp.add(sGrp);
    }

    // v18.1 GIANT ILLUMINATED LORE & EASTER-EGG BILLBOARDS ACROSS ZOLOTOY METROPOLIS!
    const makeBillboardTex = (bg, accent, topTag, headline, subline) => {
      const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = accent; ctx.lineWidth = 10; ctx.strokeRect(8, 8, 496, 240);
      ctx.fillStyle = accent; ctx.fillRect(14, 14, 484, 42);
      ctx.fillStyle = "#0a0d12"; ctx.font = "900 22px monospace"; ctx.textAlign = "center";
      ctx.fillText(topTag, 256, 43);
      ctx.fillStyle = "#ffffff"; ctx.font = "900 42px sans-serif";
      ctx.fillText(headline, 256, 134);
      ctx.fillStyle = accent; ctx.font = "bold 22px monospace";
      ctx.fillText(subline, 256, 198);
      return new THREE.CanvasTexture(cv);
    };
    const adDefs = [
      [  392,  218, -1.57, "#1b1410", "#ffd166", "🍺 OFFICIAL OBLAST WATERING HOLE", "JAMES MAY'S PUB", "WARM BITTER • CHEESE • ZERO SPEEDING"],
      [ -392,  218,  1.57, "#111f14", "#4ade80", "🚜 DIDDLY SQUAT EAST", "CLARKSON'S FARM", "SPEED & POWER PRODUCE — KEEP OUT!"],
      [  392, -218, -1.57, "#24150e", "#fb923c", "🏜 HIGH-ALTITUDE CRASH ZONE", "HAMMOND'S MESA", "NOW WITH 14% MORE ROLLOVERS!"],
      [ -392, -218,  1.57, "#190c26", "#f472b6", "🪩 NIGHTLIFE DISTRICT • 124 BPM", "DISCO ZOLOTOY", "OPEN 24/7 — NEON SYNTHS & VIBES"],
      [  218,  392,  3.14, "#0d1b2a", "#38bdf8", "🛡 SILVER DIRECTIVE COASTAL DEFENSE", "EINHEIT MECHA CORPS", "PROTECTING ZOLOTOY FROM THE ABYSS"],
      [ -218,  392,  3.14, "#18181b", "#facc15", "🏁 5.6 KM INTERNATIONAL TRACK", "ZOLOTOY GP CIRCUIT", "FREE PIT GARAGE & CAR WASH ON-SITE!"],
      [  218, -392,  0.0,  "#1c1917", "#ef4444", "🛞 BUILT FOR SIBERIAN MUD", "VOLGAWORKS TIRES", "NOW AVAILABLE WITH MUD & SNOW COAT"],
      [ -218, -392,  0.0,  "#0f172a", "#2dd4bf", "🚗 IMPORT TUNING & DYNO", "ZOLOTOY MOTORS", "R35 GT-R • LADA • ARMORED SURPLUS"]
    ];
    for (const [bx, bz, rotY, bg, acc, tag, hl, sub] of adDefs) {
      const bGrp = new THREE.Group();
      bGrp.position.set(bx, 0, bz);
      bGrp.rotation.y = rotY;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 18.0, 8), matPole);
      pole.position.set(0, 9.0, 0); bGrp.add(pole);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(19.6, 10.2, 0.85), matDark);
      frame.position.set(0, 20.5, 0); bGrp.add(frame);
      const tex = makeBillboardTex(bg, acc, tag, hl, sub);
      const faceMat = new THREE.MeshBasicMaterial({ map: tex });
      const frontFace = new THREE.Mesh(new THREE.PlaneGeometry(18.8, 9.4), faceMat);
      frontFace.position.set(0, 20.5, 0.45); bGrp.add(frontFace);
      const backFace = new THREE.Mesh(new THREE.PlaneGeometry(18.8, 9.4), faceMat);
      backFace.position.set(0, 20.5, -0.45); backFace.rotation.y = Math.PI; bGrp.add(backFace);
      grp.add(bGrp);
    }

        // Finalize all batched InstancedMeshes for Zolotoy City!
    for (const bk of instMap.values()) {
      const cnt = bk.mats.length;
      if (cnt === 0) continue;
      const im = new THREE.InstancedMesh(bk.geo, bk.mat, cnt);
      for (let i = 0; i < cnt; i++) im.setMatrixAt(i, bk.mats[i]);
      im.instanceMatrix.needsUpdate = true;
      grp.add(im);
    }

    // ------------------------------------------------------------------------
    // 6. ARTICULATED 3-SECTION ELECTRIC TRAM + PANTOGRAPH SPARK FX!
    // ------------------------------------------------------------------------
    const tramGrp = new THREE.Group();
    const matTramBody  = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.30, metalness: 0.32 });
    const matTramTrim  = new THREE.MeshStandardMaterial({ color: 0xf8f9fa, roughness: 0.38 });
    const matTramGold  = new THREE.MeshStandardMaterial({ color: 0xffc83d, roughness: 0.35, metalness: 0.45 });
    const matTramGlass = new THREE.MeshStandardMaterial({ color: 0xffe8a3, emissive: 0xffc857, emissiveIntensity: 0.85, roughness: 0.2 });
    const matSpark     = new THREE.MeshBasicMaterial({ color: 0x80f8ff });

    for (const czOff of [-9.4, 0, 9.4]) {
      const segLenT = (czOff === 0) ? 7.6 : 9.2;
      const car = new THREE.Mesh(new THREE.BoxGeometry(2.72, 3.15, segLenT), matTramBody);
      car.position.set(0, 2.08, czOff); car.castShadow = true; tramGrp.add(car);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.78, 0.58, segLenT + 0.06), matTramTrim);
      stripe.position.set(0, 1.25, czOff); tramGrp.add(stripe);
      const goldBand = new THREE.Mesh(new THREE.BoxGeometry(2.80, 0.16, segLenT + 0.08), matTramGold);
      goldBand.position.set(0, 1.62, czOff); tramGrp.add(goldBand);
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.79, 1.18, segLenT - 1.1), matTramGlass);
      win.position.set(0, 2.48, czOff); tramGrp.add(win);
      const bogie = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, segLenT - 1.8), matDark);
      bogie.position.set(0, 0.35, czOff); tramGrp.add(bogie);
    }
    for (const jz of [-4.3, 4.3]) {
      const bellows = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.65, 1.4), matDark);
      bellows.position.set(0, 1.98, jz); tramGrp.add(bellows);
    }
    // Pantograph + flashing electric spark mesh!
    const panto = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.15, 0.22), matRail);
    panto.position.set(0, 4.2, 8.8); tramGrp.add(panto);
    const sparkMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), matSpark);
    sparkMesh.position.set(0, 4.85, 8.8);
    sparkMesh.visible = false;
    tramGrp.add(sparkMesh);
    // Glowing destination headsign + twin headlights + red tail lamps
    const destSign = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.36, 0.14), matAmberGlow);
    destSign.position.set(0, 3.25, 14.04); tramGrp.add(destSign);
    for (const hx of [-0.88, 0.88]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.14), matLamp);
      hl.position.set(hx, 1.12, 14.04); tramGrp.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.14), matRedL);
      tl.position.set(hx, 1.12, -14.04); tramGrp.add(tl);
    }
    grp.add(tramGrp);

    this.tramState = {
      mesh: tramGrp, sparkMesh, cx: zc.cx, cz: zc.cz, baseY, radius: R,
      progress: 120, speed: 17.5, curSpeed: 10.0,
      stopTimer: 0, lastStopIdx: -1, eBraking: false,
      sparkTimer: 0, bellCd: 0, shoveCd: 0,
      gx: zc.cx + R, gy: baseY, gz: zc.cz, yaw: 0
    };

    // ------------------------------------------------------------------------
    // 7. 24 VARIED MULTI-PART AI CITY TRAFFIC CARS (Sedans, Taxis, Vans, SUVs!)
    // ------------------------------------------------------------------------
    this.cityTraffic = [];
    const carColors = [0xffbe0b, 0xe63946, 0x3a86ff, 0xf1faee, 0x2a9d8f, 0x8338ec, 0xfb5607, 0xadb5bd, 0x00b4d8, 0x52b788];
    const aveCoords = [-360, -240, -120, 120, 240, 360];
    const geoWheelC = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 6);
    geoWheelC.rotateZ(Math.PI * 0.5);

    for (let c = 0; c < 24; c++) {
      const carGrp = new THREE.Group();
      const style = c % 4; // 0=Sedan, 1=Taxi, 2=City Van, 3=SUV
      const colHex = style === 1 ? 0xffc300 : carColors[c % carColors.length];
      const cMat = new THREE.MeshStandardMaterial({ color: colHex, roughness: 0.38, metalness: 0.38 });
      const bLen = style === 2 ? 4.9 : (style === 3 ? 4.55 : 4.35);
      const bH   = style === 2 ? 1.55 : (style === 3 ? 0.92 : 0.72);
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, bH, bLen), cMat);
      body.position.y = 0.34 + bH * 0.5; carGrp.add(body);
      if (style !== 2) {
        const cabLen = style === 3 ? 2.75 : 2.15;
        const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.64, cabLen), cMat);
        cabin.position.set(0, 0.34 + bH + 0.30, style === 3 ? -0.25 : -0.12); carGrp.add(cabin);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.44, cabLen - 0.18), matDark);
        glass.position.set(0, 0.34 + bH + 0.30, style === 3 ? -0.25 : -0.12); carGrp.add(glass);
        if (style === 1) {
          const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.28), matAmberGlow);
          taxiSign.position.set(0, 0.34 + bH + 0.72, -0.05); carGrp.add(taxiSign);
        }
      } else {
        const vanWin = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.55, 1.5), matDark);
        vanWin.position.set(0, 1.42, 1.35); carGrp.add(vanWin);
      }
      for (const wx of [-0.92, 0.92]) {
        for (const wz of [-bLen * 0.32, bLen * 0.32]) {
          const wh = new THREE.Mesh(geoWheelC, matDark);
          wh.position.set(wx, 0.34, wz); carGrp.add(wh);
        }
      }
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.10), matLamp);
      hl.position.set(0, 0.76, bLen * 0.5 + 0.02); carGrp.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.20, 0.10), matRedL);
      tl.position.set(0, 0.76, -bLen * 0.5 - 0.02); carGrp.add(tl);
      grp.add(carGrp);

      const isNS = (c % 2 === 0);
      const lane = aveCoords[Math.floor(c / 2) % aveCoords.length];
      const dir = (c % 4 < 2) ? 1 : -1;
      const laneOff = dir * 3.4;
      const maxSpd = 10.5 + (c % 5) * 2.4;
      this.cityTraffic.push({
        mesh: carGrp, isNS, lane, dir, laneOff,
        pos: -380 + ((c * 97) % 760),
        speed: maxSpd, curSpeed: maxSpd,
        bumpCd: 0, gx: zc.cx, gz: zc.cz
      });
    }

    // ------------------------------------------------------------------------
    // 8. 36 ANIMATED WALKING SIDEWALK PEDESTRIANS (Scatter on car proximity / horn!)
    // ------------------------------------------------------------------------
    this.cityPeds = [];
    const shirtCols = [0x3a86ff, 0xff006e, 0xffbe0b, 0x2ec4b6, 0xf1faee, 0xfb5607, 0x8ecae6, 0x9b5de5];
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.85 });
    const pantMat = new THREE.MeshStandardMaterial({ color: 0x222831, roughness: 0.9 });
    for (let p = 0; p < 36; p++) {
      const ped = new THREE.Group();
      const sMat = new THREE.MeshStandardMaterial({ color: shirtCols[p % shirtCols.length], roughness: 0.8 });
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 0.28), sMat);
      torso.position.y = 1.12; ped.add(torso);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), skinMat);
      head.position.y = 1.62; ped.add(head);
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), pantMat);
      legL.position.set(-0.12, 0.40, 0); ped.add(legL);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.18), pantMat);
      legR.position.set(0.12, 0.40, 0); ped.add(legR);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.15), sMat);
      armL.position.set(-0.32, 1.08, 0); ped.add(armL);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.56, 0.15), sMat);
      armR.position.set(0.32, 1.08, 0); ped.add(armR);
      grp.add(ped);

      const isNS = (p % 2 === 0);
      const lane = aveCoords[p % aveCoords.length];
      const side = (p % 4 < 2) ? 9.4 : -9.4;
      this.cityPeds.push({
        mesh: ped, legL, legR, armL, armR, isNS, lane, side,
        dir: (p % 3 === 0) ? -1 : 1,
        pos: -360 + ((p * 43) % 720),
        speed: 1.45 + (p % 3) * 0.35,
        phase: p * 0.9,
        dodgeOff: 0, dodgeVel: 0
      });
    }

    this.rootGroup.add(grp);
    this.zolotoyCityGroup = grp;
  }

  // Analytical Elevated City Overpass Query (Cars drive smoothly OVER the deck AND cleanly UNDER the span!)
  getCityOverpassInfo(gx, gz, refY = Infinity) {
    if (!this.cityOverpasses || this.cityOverpasses.length === 0) return null;
    for (let i = 0; i < this.cityOverpasses.length; i++) {
      const ov = this.cityOverpasses[i];
      const dx = gx - ov.cx, dz = gz - ov.cz;
      const maxSpan = ov.flatHalf + ov.rampLen + 2.0;
      const along = ov.axis === "x" ? dx : dz;
      const across = ov.axis === "x" ? dz : dx;
      const absA = Math.abs(along), absL = Math.abs(across);
      if (absA > maxSpan || absL > ov.halfW) continue;

      let deckOff = 0;
      if (absA <= ov.flatHalf) {
        deckOff = ov.deckOffY;
      } else {
        const u = Math.max(0, Math.min(1, 1.0 - (absA - ov.flatHalf) / ov.rampLen));
        deckOff = ov.deckOffY * (u * u * (3 - 2 * u));
      }
      const deckY = ov.baseY + deckOff;
      // Allow driving UNDER the elevated span when vehicle is well below the deck (refY < deckY - 2.4)!
      // On the low approach ramps (deckOff < 2.2m), always engage smoothly so cars climb cleanly up!
      if (deckOff > 2.2 && refY < deckY - 2.4) continue;
      return { ov, deckY, deckOff, onDeck: true, isCenterLine: absL < 0.25 };
    }
    return null;
  }

  // Living Zolotoy City Simulation: Physics Tram (4 station stops, sparks, e-brake, heavy shove),
  // 24 Yielding AI Traffic Cars & 36 Sidewalk Pedestrians (scattering when car is close or hornActive)!
  updateZolotoyCity(dt, vehicle, audio, hornActive = false) {
    this._hasDedicatedZolotoyCaller = true;
    this._stepZolotoyCity(dt, vehicle, audio, hornActive);
  }

  updateTram(dt, vehicle, audio) {
    if (this._hasDedicatedZolotoyCaller) return;
    this._stepZolotoyCity(dt, vehicle, audio, false);
  }

  _stepZolotoyCity(dt, vehicle, audio, hornActive = false) {
    const tr = this.tramState;
    if (!tr || !tr.mesh) return;
    const stepDt = Math.min(Math.max(dt || 0.016, 0.001), 0.05);
    const nowS = performance.now() * 0.001;

    // Gentle animated fountain shimmer in Central Monumental Plaza
    if (this.cityFountainGlow) {
      const pulse = 0.82 + Math.sin(nowS * 3.2) * 0.22;
      this.cityFountainGlow.waterMat.emissiveIntensity = pulse;
      this.cityFountainGlow.spray.scale.set(1 + Math.sin(nowS * 4.5) * 0.04, 1, 1 + Math.sin(nowS * 4.5) * 0.04);
    }

    const sideLen = tr.radius * 2; // 480m
    const perim = sideLen * 4;     // 1920m
    // 4 Tram Station stop positions along the perimeter: midpoints of East, South, West, North boulevards
    const stopPts = [tr.radius, tr.radius * 3, tr.radius * 5, tr.radius * 7];

    // Check if player vehicle is blocking the rails ahead of the tram!
    let eBrake = false;
    let playerRelX = 999, playerRelZ = 999, playerDist = 999999;
    if (vehicle) {
      playerDist = Math.hypot(vehicle.pos.x - tr.gx, vehicle.pos.z - tr.gz);
      if (playerDist < 52 && Math.abs(vehicle.pos.y - tr.gy) < 4.8) {
        const dx = vehicle.pos.x - tr.gx, dz = vehicle.pos.z - tr.gz;
        const c = Math.cos(-tr.yaw), s = Math.sin(-tr.yaw);
        playerRelX = dx * c - dz * s;
        playerRelZ = dx * s + dz * c;
        if (Math.abs(playerRelX) < 3.6 && playerRelZ > 11.0 && playerRelZ < 38.0) {
          eBrake = true;
        }
      }
    }
    tr.eBraking = eBrake;

    // Compute target speed: stops ~2.5s at each of the 4 stations, slows into corners, emergency-brakes for player!
    let targetSpeed = tr.speed;
    if (tr.stopTimer > 0) {
      tr.stopTimer -= stepDt;
      targetSpeed = 0;
      if (tr.stopTimer <= 0 && playerDist < 120 && audio && audio.playTramBell) {
        audio.playTramBell();
        tr.bellCd = 3.0;
      }
    } else {
      for (let si = 0; si < stopPts.length; si++) {
        let dAhead = stopPts[si] - tr.progress;
        if (dAhead < -perim * 0.5) dAhead += perim;
        if (dAhead > 0 && dAhead < 48.0 && tr.lastStopIdx !== si) {
          if (dAhead < 1.8) {
            tr.stopTimer = 2.5;
            tr.lastStopIdx = si;
            targetSpeed = 0;
          } else {
            targetSpeed = Math.min(targetSpeed, Math.max(1.8, (dAhead / 48.0) * tr.speed));
          }
        } else if (tr.lastStopIdx === si && (dAhead > 60 || dAhead < -25)) {
          tr.lastStopIdx = -1;
        }
      }
      // Gentle slowdown into the 4 corners of the boulevard square loop
      const cornerDist = Math.min(tr.progress % sideLen, sideLen - (tr.progress % sideLen));
      if (cornerDist < 26.0) targetSpeed = Math.min(targetSpeed, 9.5);
    }

    if (eBrake) targetSpeed = 0;
    const accelRate = eBrake ? 14.5 : (targetSpeed < tr.curSpeed ? 5.2 : 3.6);
    if (tr.curSpeed < targetSpeed) tr.curSpeed = Math.min(targetSpeed, tr.curSpeed + accelRate * stepDt);
    else tr.curSpeed = Math.max(targetSpeed, tr.curSpeed - accelRate * stepDt);

    tr.progress = (tr.progress + tr.curSpeed * stepDt) % perim;

    let lx = 0, lz = 0, yaw = 0;
    const p = tr.progress;
    if (p < sideLen) {
      lx = tr.radius; lz = -tr.radius + p; yaw = 0;
    } else if (p < sideLen * 2) {
      lx = tr.radius - (p - sideLen); lz = tr.radius; yaw = -Math.PI * 0.5;
    } else if (p < sideLen * 3) {
      lx = -tr.radius; lz = tr.radius - (p - sideLen * 2); yaw = Math.PI;
    } else {
      lx = -tr.radius + (p - sideLen * 3); lz = -tr.radius; yaw = Math.PI * 0.5;
    }

    tr.mesh.position.set(lx, 0, lz);
    tr.mesh.rotation.y = yaw;
    tr.gx = tr.cx + lx;
    tr.gy = tr.baseY;
    tr.gz = tr.cz + lz;
    tr.yaw = yaw;

    // Flashing blue-white pantograph sparks during acceleration, braking, or corners!
    if (tr.sparkMesh) {
      tr.sparkTimer -= stepDt;
      const sparkActive = (eBrake || (tr.curSpeed > 3.5 && Math.sin(nowS * 21.0 + p * 0.4) > 0.88));
      if (sparkActive && tr.sparkTimer <= 0) {
        tr.sparkTimer = 0.08 + Math.random() * 0.14;
        tr.sparkMesh.visible = true;
        const sc = 0.65 + Math.random() * 0.9;
        tr.sparkMesh.scale.set(sc, sc, sc);
      } else if (tr.sparkTimer <= 0.02) {
        tr.sparkMesh.visible = false;
      }
    }

    // Tram Bell + Real Heavy-Mass Physical Shove Collision!
    if (vehicle) {
      if (tr.bellCd > 0) tr.bellCd -= stepDt;
      if (tr.shoveCd > 0) tr.shoveCd -= stepDt;
      if ((eBrake || playerDist < 42) && tr.bellCd <= 0 && audio && audio.playTramBell) {
        audio.playTramBell();
        tr.bellCd = eBrake ? 1.8 : 4.2;
      }
      if (playerDist < 19 && Math.abs(vehicle.pos.y - tr.gy) < 4.5) {
        const dx = vehicle.pos.x - tr.gx, dz = vehicle.pos.z - tr.gz;
        const c = Math.cos(-yaw), s = Math.sin(-yaw);
        const relX = dx * c - dz * s, relZ = dx * s + dz * c;
        const hx = 1.55 + vehicle.spec.bodyWidth * 0.48;
        const hz = 14.2 + vehicle.spec.bodyLen * 0.46;
        if (Math.abs(relX) < hx && Math.abs(relZ) < hz) {
          const fwdX = Math.sin(yaw), fwdZ = Math.cos(yaw);
          const rightX = Math.cos(yaw), rightZ = -Math.sin(yaw);
          const isFrontRear = Math.abs(relZ) > (hz - 2.8) && Math.abs(relX) < (hx * 0.85);
          let wx, wz, pen;
          if (isFrontRear) {
            const signZ = relZ >= 0 ? 1 : -1;
            pen = hz - Math.abs(relZ) + 0.25;
            wx = fwdX * signZ; wz = fwdZ * signZ;
          } else {
            const pushDir = relX >= 0 ? 1 : -1;
            pen = hx - Math.abs(relX) + 0.20;
            wx = rightX * pushDir; wz = rightZ * pushDir;
          }
          vehicle.pos.x += wx * pen;
          vehicle.pos.z += wz * pen;
          if (tr.shoveCd <= 0) {
            const shove = Math.min(24.0, Math.max(9.5, tr.curSpeed * 1.35 + 6.0));
            vehicle.applyExternalImpulse(wx * shove + fwdX * tr.curSpeed * 0.35, 2.8, wz * shove + fwdZ * tr.curSpeed * 0.35, (relX >= 0 ? 1 : -1) * 3.0);
            if (audio && audio.playImpact) audio.playImpact(0.92);
            tr.shoveCd = 0.35;
          }
        }
      }
    }

    // Animate 24 AI Traffic Cars & 36 Sidewalk Pedestrians when player is near Zolotoy City!
    const distToCity = vehicle ? Math.hypot(vehicle.pos.x - tr.cx, vehicle.pos.z - tr.cz) : 999999;
    if (vehicle && distToCity < 1450) {
      if (this.cityTraffic) {
        for (let ci = 0; ci < this.cityTraffic.length; ci++) {
          const car = this.cityTraffic[ci];
          if (car.bumpCd > 0) car.bumpCd -= stepDt;
          const curLx = car.isNS ? (car.lane + car.laneOff) : car.pos;
          const curLz = car.isNS ? car.pos : (car.lane - car.laneOff);
          car.gx = tr.cx + curLx; car.gz = tr.cz + curLz;

          // Yield / brake smoothly if player car is right ahead in this lane!
          const pdx = vehicle.pos.x - car.gx, pdz = vehicle.pos.z - car.gz;
          const fwdDot = car.isNS ? (pdz * car.dir) : (pdx * car.dir);
          const latDot = car.isNS ? Math.abs(pdx) : Math.abs(pdz);
          const blockedByPlayer = (fwdDot > 2.2 && fwdDot < 24.0 && latDot < 3.6 && Math.abs(vehicle.pos.y - (tr.baseY + car.mesh.position.y)) < 3.0);
          const tgtSpd = blockedByPlayer ? 0 : car.speed;
          if (car.curSpeed < tgtSpd) car.curSpeed = Math.min(tgtSpd, car.curSpeed + 7.5 * stepDt);
          else car.curSpeed = Math.max(tgtSpd, car.curSpeed - 16.0 * stepDt);

          car.pos += car.curSpeed * car.dir * stepDt;
          if (car.pos > 400) car.pos = -400;
          else if (car.pos < -400) car.pos = 400;

          const lxC = car.isNS ? (car.lane + car.laneOff) : car.pos;
          const lzC = car.isNS ? car.pos : (car.lane - car.laneOff);
          car.gx = tr.cx + lxC; car.gz = tr.cz + lzC;
          // Ride smoothly up & over the elevated city overpasses when cruising z=-120 or x=+120!
          const ovHit = this.getCityOverpassInfo(car.gx, car.gz, Infinity);
          const carY = ovHit ? (ovHit.deckY - tr.baseY) : 0;
          car.mesh.position.set(lxC, carY, lzC);
          car.mesh.rotation.y = car.isNS ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);

          const dc = Math.hypot(vehicle.pos.x - car.gx, vehicle.pos.z - car.gz);
          if (dc < 3.5 && Math.abs(vehicle.pos.y - (tr.baseY + carY)) < 2.6 && car.bumpCd <= 0) {
            const ang = Math.atan2(vehicle.pos.x - car.gx, vehicle.pos.z - car.gz);
            vehicle.applyExternalImpulse(Math.sin(ang) * 7.2, 1.4, Math.cos(ang) * 7.2, 1.0);
            if (audio && audio.playImpact) audio.playImpact(0.60);
            car.curSpeed = 0;
            car.bumpCd = 0.45;
          }
        }
      }

      if (this.cityPeds) {
        for (let pi = 0; pi < this.cityPeds.length; pi++) {
          const ped = this.cityPeds[pi];
          ped.pos += ped.speed * ped.dir * stepDt;
          if (ped.pos > 390) { ped.pos = 390; ped.dir = -1; }
          else if (ped.pos < -390) { ped.pos = -390; ped.dir = 1; }

          const baseLx = ped.isNS ? (ped.lane + ped.side) : ped.pos;
          const baseLz = ped.isNS ? ped.pos : (ped.lane + ped.side);
          const pgx = tr.cx + baseLx, pgz = tr.cz + baseLz;
          const dCar = Math.hypot(vehicle.pos.x - pgx, vehicle.pos.z - pgz);
          const scareRange = hornActive ? 24.0 : 11.5;

          let targetDodge = 0;
          let spooked = false;
          if (dCar < scareRange && Math.abs(vehicle.pos.y - tr.baseY) < 4.0) {
            // Step back / scatter sideways onto the inner sidewalk away from the vehicle!
            const sideSign = ped.side >= 0 ? 1 : -1;
            targetDodge = sideSign * (hornActive ? 4.2 : 2.8);
            spooked = true;
          }
          ped.dodgeOff += (targetDodge - ped.dodgeOff) * Math.min(1, stepDt * (spooked ? 7.5 : 2.2));

          const finalLx = ped.isNS ? (ped.lane + ped.side + ped.dodgeOff) : ped.pos;
          const finalLz = ped.isNS ? ped.pos : (ped.lane + ped.side + ped.dodgeOff);
          ped.mesh.position.set(finalLx, 0, finalLz);
          ped.mesh.rotation.y = ped.isNS ? (ped.dir > 0 ? 0 : Math.PI) : (ped.dir > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
          ped.phase += stepDt * (spooked ? 13.5 : 7.5);
          const sw = Math.sin(ped.phase) * (spooked ? 0.72 : 0.52);
          ped.legL.rotation.x = sw; ped.legR.rotation.x = -sw;
          if (ped.armL && ped.armR) {
            ped.armL.rotation.x = -sw * 0.75; ped.armR.rotation.x = sw * 0.75;
          }
        }
      }
    }
  }

  _buildOceanPorts() {
    if (!KK.PORTS) return;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const matPier   = new THREE.MeshStandardMaterial({ color: 0x6f757a, roughness: 0.88 });
    const matModern = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.62, metalness: 0.22 });
    const matGlass  = new THREE.MeshStandardMaterial({ color: 0x2a6f97, emissive: 0x164a68, emissiveIntensity: 0.75, roughness: 0.2, metalness: 0.65 });
    const matRamp   = new THREE.MeshStandardMaterial({ color: 0x4b5258, roughness: 0.92 });
    const matPad    = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x0088aa, emissiveIntensity: 0.85, roughness: 0.45 });
    const matWh     = new THREE.MeshStandardMaterial({ color: 0x2f5373, roughness: 0.72 });
    const matCrane  = new THREE.MeshStandardMaterial({ color: 0xe6a817, roughness: 0.55, metalness: 0.35 });
    const matRedC   = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.52, metalness: 0.35 });
    const matBlueC  = new THREE.MeshStandardMaterial({ color: 0x1d6396, roughness: 0.58 });
    const matWood   = new THREE.MeshStandardMaterial({ color: 0x735133, roughness: 0.94 });
    const matWoodDk = new THREE.MeshStandardMaterial({ color: 0x4a331e, roughness: 0.96 });
    const matRust   = new THREE.MeshStandardMaterial({ color: 0x5c3828, roughness: 0.94, metalness: 0.35 });
    const matIceC   = new THREE.MeshStandardMaterial({ color: 0x8ea4b5, roughness: 0.72 });
    const matGlowW  = new THREE.MeshBasicMaterial({ color: 0xffe8a3 });
    const matGlowC  = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const matGlowR  = new THREE.MeshBasicMaterial({ color: 0x9eff2a });

    for (const pt of KK.PORTS) {
      const grp = new THREE.Group();
      const py = seaL + 2.2;
      grp.position.set(pt.x, py, pt.z);
      grp.rotation.y = pt.yaw || 0;
      const iid = pt.islandId;
      const c = Math.cos(pt.yaw || 0), s = Math.sin(pt.yaw || 0);
      const addCol = (lx, lz, hw, hd, hMax) => {
        const wx = pt.x + (lx * c + lz * s), wz = pt.z + (-lx * s + lz * c);
        this.buildingColliders.push({ minX: wx - hw, maxX: wx + hw, minZ: wz - hd, maxZ: wz + hd, yMin: py - 2, yMax: py + hMax, label: pt.name });
      };

      if (iid === 2) {
        // ====================================================================
        // ZOLOTOY SAVANNA: MASSIVE MODERNIZED NIGHT-GLOWING CONTAINER TERMINAL!
        // ====================================================================
        const deck = new THREE.Mesh(new THREE.BoxGeometry(44, 1.6, 68), matModern);
        deck.position.set(0, 0, 18); deck.receiveShadow = true; grp.add(deck);
        for (const px of [-19, 0, 19]) {
          for (const pz of [-10, 10, 30, 48]) {
            const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 11, 8), matRamp);
            pile.position.set(px, -5.5, pz); grp.add(pile);
          }
        }
        // Wide illuminated dual concrete boat launch ramp
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(14, 0.55, 24), matModern);
        ramp.position.set(27, -1.5, 24); ramp.rotation.x = 0.20; grp.add(ramp);

        // Glowing neon pier edge guide strips (glow brilliantly at night!)
        for (const ex of [-21.6, 21.6]) {
          const strip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 66), matGlowC);
          strip.position.set(ex, 0.92, 18); grp.add(strip);
        }
        // Tall glowing harbor floodlight masts along both sides
        for (const fx of [-19, 19]) {
          for (const fz of [-4, 18, 40]) {
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 13, 6), matModern);
            mast.position.set(fx, 7.0, fz); grp.add(mast);
            const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 0.8), matGlowW);
            lamp.position.set(fx, 13.6, fz); grp.add(lamp);
          }
        }
        // Modern Illuminated Glass Port Authority Terminal Building
        const term = new THREE.Mesh(new THREE.BoxGeometry(18, 10.5, 24), matModern);
        term.position.set(-10, 5.8, -2); term.castShadow = true; grp.add(term);
        const glassBand = new THREE.Mesh(new THREE.BoxGeometry(18.4, 4.5, 20), matGlass);
        glassBand.position.set(-10, 6.8, -2); grp.add(glassBand);
        const roofSign = new THREE.Mesh(new THREE.BoxGeometry(12, 1.6, 0.6), matGlowC);
        roofSign.position.set(-10, 12.2, 10); grp.add(roofSign);
        addCol(-10, -2, 9.5, 12.5, 12);

        // Twin Massive Red/White Container Gantry Cranes!
        for (const gz of [16, 36]) {
          const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 22, 2.2), matRedC);
          leg1.position.set(14, 11.5, gz - 4); grp.add(leg1);
          const leg2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 22, 2.2), matRedC);
          leg2.position.set(14, 11.5, gz + 4); grp.add(leg2);
          const boom = new THREE.Mesh(new THREE.BoxGeometry(26, 2.2, 2.6), matRedC);
          boom.position.set(19, 22.0, gz); grp.add(boom);
          const navL = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 6), matGlowW);
          navL.position.set(31.5, 23.4, gz); grp.add(navL);
        }
        // Stacked colorful shipping containers
        const contCols = [matRedC, matBlueC, matCrane];
        for (let ci = 0; ci < 3; ci++) {
          const cont = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.0, 9.5), contCols[ci]);
          cont.position.set(-13 + ci * 3.8, 2.3, 22); grp.add(cont);
        }
        addCol(-9.2, 22, 6.2, 5.2, 4.5);

        // Large glowing cyan Boat Summon Pad + Beacon
        const bPad = new THREE.Mesh(new THREE.BoxGeometry(13, 0.20, 13), matPad);
        bPad.position.set(0, 0.90, 26); grp.add(bPad);
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 46, 8), new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.45 }));
        bcn.position.set(0, 23, 26); grp.add(bcn);

      } else if (iid === 1 || iid === 4) {
        // ====================================================================
        // OSTROV TROPIKA & CORAL CAY: RUSTIC INDONESIAN WOODEN STILT JETTY!
        // ====================================================================
        const isSmallCay = (iid === 4);
        const pw = isSmallCay ? 14 : 20, pl = isSmallCay ? 34 : 44;
        const deck = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.85, pl), matWood);
        deck.position.set(0, 0.2, 12); deck.receiveShadow = true; grp.add(deck);
        for (const px of [-pw * 0.42, pw * 0.42]) {
          for (const pz of [-4, 8, 20, isSmallCay ? 27 : 31]) {
            const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 10, 6), matWoodDk);
            pile.position.set(px, -4.8, pz); grp.add(pile);
          }
        }
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.45, 20), matWoodDk);
        ramp.position.set(pw * 0.5 + 4.5, -1.6, 16); ramp.rotation.x = 0.22; grp.add(ramp);
        // Rustic corrugated-roof wooden harbor warung / fuel shack
        const shack = new THREE.Mesh(new THREE.BoxGeometry(9.5, 4.2, 11), matWood);
        shack.position.set(-2.5, 2.7, -1); shack.castShadow = true; grp.add(shack);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(8.2, 2.6, 4), matRedC);
        roof.rotation.y = Math.PI * 0.25; roof.position.set(-2.5, 6.0, -1); grp.add(roof);
        addCol(-2.5, -1, 5.2, 6.0, 7);
        // Warm wooden lantern post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.0, 6), matWoodDk);
        post.position.set(pw * 0.36, 3.4, 24); grp.add(post);
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.34, 6, 6), matGlowW);
        lantern.position.set(pw * 0.36, 6.5, 24); grp.add(lantern);

        const bPad = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.16, 9.5), matPad);
        bPad.position.set(0, 0.72, 26); grp.add(bPad);
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 30, 8), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.38 }));
        bcn.position.set(0, 15, 26); grp.add(bcn);

      } else if (iid === 5) {
        // ====================================================================
        // SITE-140 BLACK ROCK: DILAPIDATED CRUMBLING QUARANTINE PIER!
        // ====================================================================
        const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 1.1, 40), matRamp);
        deck.position.set(0, 0, 10); deck.rotation.z = 0.025; grp.add(deck);
        for (const px of [-7.5, 7.5]) {
          for (const pz of [-6, 8, 22, 28]) {
            const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 10, 6), matRust);
            pile.position.set(px, -5.0, pz); grp.add(pile);
          }
        }
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(9, 0.45, 20), matRust);
        ramp.position.set(13.5, -1.6, 15); ramp.rotation.x = 0.24; grp.add(ramp);
        // Rusted quarantine bunker shed + crooked steel gantry + radioactive green warning beacon
        const bnk = new THREE.Mesh(new THREE.BoxGeometry(11, 5.2, 12), matRust);
        bnk.position.set(-3, 3.1, -2); grp.add(bnk);
        addCol(-3, -2, 6.0, 6.5, 6);
        const mast = new THREE.Mesh(new THREE.BoxGeometry(1.2, 12, 1.2), matRust);
        mast.position.set(6, 6.2, 8); mast.rotation.z = -0.14; grp.add(mast);
        const warnL = new THREE.Mesh(new THREE.SphereGeometry(0.42, 6, 6), matGlowR);
        warnL.position.set(5.1, 12.2, 8); grp.add(warnL);

        const bPad = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.16, 9.5), matPad);
        bPad.position.set(0, 0.68, 26); grp.add(bPad);
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 32, 8), new THREE.MeshBasicMaterial({ color: 0x9eff2a, transparent: true, opacity: 0.42 }));
        bcn.position.set(0, 16, 26); grp.add(bcn);

      } else {
        // ====================================================================
        // MAINLAND (Soviet Industrial) & SEVERNYY ARCTIC (Frozen Polar Icebreaker Dock)
        // ====================================================================
        const isArc = (iid === 3);
        const deck = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 48), isArc ? matIceC : matPier);
        deck.position.set(0, 0, 12); deck.receiveShadow = true; grp.add(deck);
        for (const px of [-10, 10]) {
          for (const pz of [-8, 8, 24, 34]) {
            const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 10, 8), matRamp);
            pile.position.set(px, -5.2, pz); grp.add(pile);
          }
        }
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 22), matRamp);
        ramp.position.set(16.5, -1.6, 16); ramp.rotation.x = 0.22; grp.add(ramp);
        const bPad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.16, 10), matPad);
        bPad.position.set(0, 0.78, 26); grp.add(bPad);
        const wh = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 18), isArc ? matIceC : matWh);
        wh.position.set(-4, 4.4, -2); wh.castShadow = true; grp.add(wh);
        addCol(-4, -2, 8.5, 9.5, 9);
        const craneBase = new THREE.Mesh(new THREE.BoxGeometry(4.5, 14, 4.5), isArc ? matRedC : matCrane);
        craneBase.position.set(7.5, 7.6, 10); grp.add(craneBase);
        const craneArm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 22), isArc ? matRedC : matCrane);
        craneArm.position.set(7.5, 14.8, 17); grp.add(craneArm);
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 36, 8), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45 }));
        bcn.position.set(0, 18, 26); grp.add(bcn);
      }

      this.rootGroup.add(grp);
    }
  }

  _buildIslandSetpieces() {
    if (KK.TROPIKA_VOLCANOES) {
      for (const v of KK.TROPIKA_VOLCANOES) {
        const vy = this._computeNaturalGroundHeight(v.x, v.z);
        if (v.active) {
          const lava = new THREE.Mesh(new THREE.CircleGeometry(340, 20), new THREE.MeshBasicMaterial({ color: 0xff4d00 }));
          lava.rotation.x = -Math.PI / 2; lava.position.set(v.x, vy + 18, v.z);
          this.rootGroup.add(lava);
        } else {
          const lake = new THREE.Mesh(
            new THREE.CircleGeometry(v.lakeRad * 0.88, 24),
            new THREE.MeshStandardMaterial({ color: 0x18a4b8, emissive: 0x083842, roughness: 0.16, transparent: true, opacity: 0.86 })
          );
          lake.rotation.x = -Math.PI / 2; lake.position.set(v.x, vy + 24, v.z);
          this.rootGroup.add(lake);
        }
      }
    }

    const polX = -65200, polZ = -67200;
    const matHulk = new THREE.MeshStandardMaterial({ color: 0x5c4234, roughness: 0.92, metalness: 0.4 });
    const matWall = new THREE.MeshStandardMaterial({ color: 0x868c92, roughness: 0.9 });
    for (let k = 0; k < 6; k++) {
      const tx = polX + 180 + k * 55, tz = polZ - 140 + (k % 2) * 75;
      const ty = this.getBaseHeight(tx, tz);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.5, 6.8), matHulk);
      hull.position.set(tx, ty + 0.8, tz); hull.rotation.y = k * 0.4; this.rootGroup.add(hull);
      const tur = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.9, 10), matHulk);
      tur.position.set(tx, ty + 1.9, tz); this.rootGroup.add(tur);
      this.buildingColliders.push({ minX: tx - 2.6, maxX: tx + 2.6, minZ: tz - 3.6, maxZ: tz + 3.6, yMin: ty - 1, yMax: ty + 3.5, label: "Target Tank Hulk" });
    }
    const blastW = new THREE.Mesh(new THREE.BoxGeometry(36, 5.5, 2.8), matWall);
    const bwy = this.getBaseHeight(polX + 110, polZ - 60);
    blastW.position.set(polX + 110, bwy + 2.75, polZ - 60); this.rootGroup.add(blastW);
    this.buildingColliders.push({ minX: polX + 92, maxX: polX + 128, minZ: polZ - 62, maxZ: polZ - 58, yMin: bwy - 1, yMax: bwy + 6, label: "Blast Wall" });

    const aurMat = new THREE.MeshBasicMaterial({ color: 0x2de08b, transparent: true, opacity: 0.24, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    const aurora = new THREE.Mesh(new THREE.PlaneGeometry(18000, 1800, 12, 1), aurMat);
    aurora.position.set(-65000, 1450, -76000);
    aurora.rotation.y = 0.28;
    this.rootGroup.add(aurora);

    const rx = 68000, rz = -68000;
    const ry = this.getBaseHeight(rx, rz);
    const sGrp = new THREE.Group();
    sGrp.position.set(rx + 65, ry, rz - 48);
    const matSarc = new THREE.MeshStandardMaterial({ color: 0x4c524b, roughness: 0.94 });
    const matRadGlow = new THREE.MeshBasicMaterial({ color: 0x9eff2a, transparent: true, opacity: 0.78 });

    const vault = new THREE.Mesh(new THREE.BoxGeometry(46, 24, 38), matSarc);
    vault.position.set(0, 12, 0); vault.castShadow = true; sGrp.add(vault);
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 4.4, 48, 12), matSarc);
    stack.position.set(10, 24, -6); sGrp.add(stack);
    const coreGlow = new THREE.Mesh(new THREE.BoxGeometry(16, 6, 4), matRadGlow);
    coreGlow.position.set(0, 8, 19.2); sGrp.add(coreGlow);

    const heliPad = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 0.5, 18), matWall);
    heliPad.position.set(-42, 0.25, 16); sGrp.add(heliPad);
    this.rootGroup.add(sGrp);

    this.buildingColliders.push({
      minX: rx + 65 - 23.5, maxX: rx + 65 + 23.5,
      minZ: rz - 48 - 19.5, maxZ: rz - 48 + 19.5,
      yMin: ry - 2, yMax: ry + 26, label: "Site-140 Reactor Sarcophagus"
    });

    // 4. v15.1.1 OUTER-RING ISLAND LANDMARKS & COASTAL LIFE!
    const matTurbine = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.42 });
    const matShackW  = new THREE.MeshStandardMaterial({ color: 0x7d5838, roughness: 0.92 });
    const matShackR  = new THREE.MeshStandardMaterial({ color: 0xb53c28, roughness: 0.72 });
    const matPylon   = new THREE.MeshStandardMaterial({ color: 0xd9a016, roughness: 0.65 });

    // Zolotoy Savanna: 10 Modern Wind Turbines along the outer savanna mesas & highways!
    for (let w = 0; w < 10; w++) {
      const a = (w / 10) * Math.PI * 2 + 0.3;
      const wx = -68000 + Math.cos(a) * 11800, wz = 61000 + Math.sin(a) * 10200;
      const wy = this.getBaseHeight(wx, wz);
      if (wy < (KK.SEA_LEVEL || -32) + 3) continue;
      const tGrp = new THREE.Group(); tGrp.position.set(wx, wy, wz);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 28, 8), matTurbine);
      tower.position.y = 14; tGrp.add(tower);
      const rotor = new THREE.Group(); rotor.position.set(0, 28, 1.1);
      for (let b = 0; b < 3; b++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 11.5, 0.16), matTurbine);
        bl.position.y = 5.5;
        const arm = new THREE.Group(); arm.rotation.z = (b / 3) * Math.PI * 2; arm.add(bl);
        rotor.add(arm);
      }
      tGrp.add(rotor);
      this.settlementAnims.push({ type: "turbine", mesh: rotor, speed: 1.4 + (w % 3) * 0.35 });
      this.rootGroup.add(tGrp);
    }

    // Ostrov Tropika: 10 Coastal Fishing Shacks & Highland Warungs scattered around outer ring!
    for (let f = 0; f < 10; f++) {
      const a = (f / 10) * Math.PI * 2 + 0.15;
      const fx = 69000 + Math.cos(a) * 10800, fz = 62000 + Math.sin(a) * 9400;
      const fy = this.getBaseHeight(fx, fz);
      if (fy < (KK.SEA_LEVEL || -32) + 2) continue;
      const sh = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.2, 5.2), matShackW);
      sh.position.set(fx, fy + 1.6, fz); sh.rotation.y = a; this.rootGroup.add(sh);
      const rf = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.0, 4), matShackR);
      rf.position.set(fx, fy + 4.1, fz); rf.rotation.y = a + Math.PI * 0.25; this.rootGroup.add(rf);
      this.buildingColliders.push({ minX: fx - 3.6, maxX: fx + 3.6, minZ: fz - 3.6, maxZ: fz + 3.6, yMin: fy - 1, yMax: fy + 5, label: "Coastal Warung" });
    }

    // Severnyy Arctic: 8 Polar Radar Watchtowers around the outer ice shelf!
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + 0.4;
      const ax = -65000 + Math.cos(a) * 11200, az = -67000 + Math.sin(a) * 10100;
      const ay = this.getBaseHeight(ax, az);
      if (ay < (KK.SEA_LEVEL || -32) + 2) continue;
      const twr = new THREE.Mesh(new THREE.BoxGeometry(4.2, 11.5, 4.2), matWall);
      twr.position.set(ax, ay + 5.75, az); this.rootGroup.add(twr);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(2.8, 10, 8), matTurbine);
      cap.position.set(ax, ay + 12.6, az); this.rootGroup.add(cap);
      this.buildingColliders.push({ minX: ax - 2.3, maxX: ax + 2.3, minZ: az - 2.3, maxZ: az + 2.3, yMin: ay - 1, yMax: ay + 14, label: "Arctic Watchtower" });
    }

    // Site-140: 6 Yellow Radiation Warning Pylons ringing the exclusion coast!
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const px = 68000 + Math.cos(a) * 2600, pz = -68000 + Math.sin(a) * 2400;
      const py = this.getBaseHeight(px, pz);
      if (py < (KK.SEA_LEVEL || -32) + 1) continue;
      const pyl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 7.5, 1.4), matPylon);
      pyl.position.set(px, py + 3.75, pz); this.rootGroup.add(pyl);
    }
  }

  _buildLighthouses() {
    this.lighthouses = [];
    if (!KK.LIGHTHOUSES) return;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const matRock  = new THREE.MeshStandardMaterial({ color: 0x45494e, roughness: 0.94 });
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.55 });
    const matRed   = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.55 });
    const matIron  = new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.65, metalness: 0.55 });
    const matGlass = new THREE.MeshBasicMaterial({ color: 0xfff3b0 });
    const matBeam  = new THREE.MeshBasicMaterial({ color: 0xfff6c2, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 0; i < KK.LIGHTHOUSES.length; i++) {
      const lh = KK.LIGHTHOUSES[i], h = lh.height || 48;
      const grp = new THREE.Group();
      grp.position.set(lh.x, seaL, lh.z);
      const rock = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 19.5, 9.5, 10), matRock); rock.position.y = 2.0; grp.add(rock);
      const basePad = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.2, 2.2, 12), matIron); basePad.position.y = 7.4; grp.add(basePad);
      const bandH = (h - 10) / 5;
      for (let b = 0; b < 5; b++) {
        const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - (b + 1) * 0.42, 4.6 - b * 0.42, bandH + 0.08, 12), b % 2 === 0 ? matWhite : matRed);
        seg.position.y = 8.5 + b * bandH + bandH * 0.5; grp.add(seg);
      }
      const lanY = 8.5 + (h - 10);
      const deck = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.2, 0.9, 12), matIron); deck.position.y = lanY; grp.add(deck);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 4.2, 10), matGlass); lantern.position.y = lanY + 2.5; grp.add(lantern);
      const dome = new THREE.Mesh(new THREE.ConeGeometry(2.8, 3.4, 10), matRed); dome.position.y = lanY + 6.2; grp.add(dome);
      const beamPivot = new THREE.Group(); beamPivot.position.y = lanY + 2.5;
      for (const dir of [-1, 1]) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(16, 175, 12, 1, true), matBeam);
        cone.rotation.z = dir * Math.PI * 0.5; cone.position.x = dir * 88; beamPivot.add(cone);
      }
      beamPivot.visible = false; grp.add(beamPivot);
      this.rootGroup.add(grp);
      this.lighthouses.push({ data: lh, grp, beamPivot, lantern, phase: i * 1.3 });
    }
  }

  _extractBuildingColliders() {
    this.rootGroup.updateMatrixWorld(true);
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    for (const grp of this.townGroups.values()) {
      grp.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry) return;
        const mat = Array.isArray(obj.material) ? obj.material[0] : obj.material;
        if (mat && mat.transparent && mat.opacity < 0.7) return;
        if (mat && mat.isMeshBasicMaterial) return;
        box.setFromObject(obj);
        box.getSize(size);
        if (size.x < 2.2 || size.z < 2.2 || size.y < 2.0) return;
        if (size.x > 60 || size.z > 60) return;
        const groundY = this.getBaseHeight((box.min.x + box.max.x) * 0.5, (box.min.z + box.max.z) * 0.5);
        if (box.min.y > groundY + 2.8) return;
        this.buildingColliders.push({
          minX: box.min.x, maxX: box.max.x,
          minZ: box.min.z, maxZ: box.max.z,
          yMin: box.min.y - 1.0, yMax: box.max.y + 0.5,
          label: "Building"
        });
      });
    }
    this._buildBuildingSpatialGrid();
  }

  _buildBuildingSpatialGrid() {
    const cell = this._buildingGridCell || 200;
    const pad = 16; // Covers any vehicle collision radius in a single O(1) cell lookup!
    const grid = new Map();
    const list = this.buildingColliders;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b._bStamp = 0;
      const ix0 = Math.floor((b.minX - pad) / cell);
      const ix1 = Math.floor((b.maxX + pad) / cell);
      const iz0 = Math.floor((b.minZ - pad) / cell);
      const iz1 = Math.floor((b.maxZ + pad) / cell);
      for (let ix = ix0; ix <= ix1; ix++) {
        const kx = (ix + 32768) * 65536;
        for (let iz = iz0; iz <= iz1; iz++) {
          const key = kx + (iz + 32768);
          let bucket = grid.get(key);
          if (!bucket) { bucket = []; grid.set(key, bucket); }
          bucket.push(b);
        }
      }
    }
    this._buildingGrid = grid;
  }

  // O(1) zero-GC spatial hash lookup for nearby solid building colliders!
  getNearbyBuildingColliders(gx, gz, radius = 12) {
    if (!this._buildingGrid) return this.buildingColliders;
    const cell = this._buildingGridCell;
    if (radius <= 16) {
      const ix = Math.floor(gx / cell);
      const iz = Math.floor(gz / cell);
      return this._buildingGrid.get((ix + 32768) * 65536 + (iz + 32768)) || this._emptyArray;
    }
    const out = this._nearbyBuildingsScratch;
    out.length = 0;
    const stamp = ++this._bQueryStamp;
    const ix0 = Math.floor((gx - radius) / cell);
    const ix1 = Math.floor((gx + radius) / cell);
    const iz0 = Math.floor((gz - radius) / cell);
    const iz1 = Math.floor((gz + radius) / cell);
    for (let ix = ix0; ix <= ix1; ix++) {
      const kx = (ix + 32768) * 65536;
      for (let iz = iz0; iz <= iz1; iz++) {
        const bucket = this._buildingGrid.get(kx + (iz + 32768));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const b = bucket[i];
          if (b._bStamp !== stamp) {
            b._bStamp = stamp;
            out.push(b);
          }
        }
      }
    }
    return out;
  }

  _initSharedAssets() {
    this.matTerrain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.04 });
    this.matWood = new THREE.MeshStandardMaterial({ color: 0x6b4c30, roughness: 0.92 });
    this.matWoodDark = new THREE.MeshStandardMaterial({ color: 0x45301d, roughness: 0.95 });
    this.matRustSteel = new THREE.MeshStandardMaterial({ color: 0x5c3a2b, roughness: 0.78, metalness: 0.45 });
    this.matConcrete = new THREE.MeshStandardMaterial({ color: 0x7b7e7c, roughness: 0.9 });
    this.matRoof = new THREE.MeshStandardMaterial({ color: 0x3b484f, roughness: 0.7, metalness: 0.35 });
    this.matGaragePad = new THREE.MeshStandardMaterial({ color: 0xe6b800, emissive: 0x4a3800, roughness: 0.6 });
    this.matDockPad = new THREE.MeshStandardMaterial({ color: 0x2c9c69, emissive: 0x0f3b26, roughness: 0.6 });
    this.matTrunk = new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.95 });
    this.matPine = new THREE.MeshStandardMaterial({ color: 0x1e3f28, roughness: 0.9 });
    this.matSnowPine = new THREE.MeshStandardMaterial({ color: 0x9ab0b8, roughness: 0.88 });
    this.matCactus = new THREE.MeshStandardMaterial({ color: 0x2f6b3c, roughness: 0.9 });
    this.matRock = new THREE.MeshStandardMaterial({ color: 0x5c5d5a, roughness: 0.92 });
    this.matSandRock = new THREE.MeshStandardMaterial({ color: 0x9c6e46, roughness: 0.92 });
    this.matObsidian = new THREE.MeshStandardMaterial({ color: 0x222026, emissive: 0x2a0802, roughness: 0.65, metalness: 0.25 });
    // v15.0 New Biome Materials (Tropical Palm, Golden Savanna Acacia, Arctic Glacier Spire!)
    this.matPalmTrunk = new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.94 });
    this.matPalmLeaf  = new THREE.MeshStandardMaterial({ color: 0x1e8a3c, roughness: 0.78, side: THREE.DoubleSide });
    this.matAcaciaLeaf = new THREE.MeshStandardMaterial({ color: 0x6f7d2c, roughness: 0.88 });
    this.matAcaciaBark = new THREE.MeshStandardMaterial({ color: 0x5c4732, roughness: 0.96 });
    this.matGlacierIce = new THREE.MeshStandardMaterial({ color: 0xbce6ff, emissive: 0x123854, roughness: 0.28, metalness: 0.15 });
    this.geoPalmSeg = new THREE.CylinderGeometry(0.18, 0.26, 2.8, 6);
    this.geoPalmFrond = new THREE.BoxGeometry(0.62, 0.06, 3.6);
    this.matBanyanBark = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.95 });
    this.matBanyanLeaf = new THREE.MeshStandardMaterial({ color: 0x146b2e, roughness: 0.84 });
    this.matBamboo     = new THREE.MeshStandardMaterial({ color: 0x6ba832, roughness: 0.72 });
    this.matFern       = new THREE.MeshStandardMaterial({ color: 0x228b3b, roughness: 0.86, side: THREE.DoubleSide });
    this.geoBanyanTop  = new THREE.DodecahedronGeometry(3.4, 0);
    this.geoBambooStalk = new THREE.CylinderGeometry(0.11, 0.14, 9.5, 5);
    this.geoFernBush   = new THREE.ConeGeometry(1.5, 1.8, 5);
    this.geoAcaciaCanopy = new THREE.CylinderGeometry(3.8, 2.2, 0.95, 8);
    this.geoIceSpire = new THREE.ConeGeometry(1.1, 7.8, 6);
    // v15.0.2 Savanna Golden Tall Grass Tufts & Red-Clay Termite Mounds!
    this.matSavGrass  = new THREE.MeshStandardMaterial({ color: 0xd9b842, roughness: 0.92, side: THREE.DoubleSide });
    this.matSavGrass2 = new THREE.MeshStandardMaterial({ color: 0xb8962e, roughness: 0.94, side: THREE.DoubleSide });
    this.matTermite   = new THREE.MeshStandardMaterial({ color: 0x9c5a34, roughness: 0.96 });
    this.geoSavGrass  = new THREE.ConeGeometry(0.68, 1.45, 5);
    this.geoTermite   = new THREE.ConeGeometry(1.15, 2.8, 7);
    this.matWater = new THREE.MeshStandardMaterial({ color: 0x1b6278, roughness: 0.18, metalness: 0.22, transparent: true, opacity: 0.76, side: THREE.DoubleSide });

    // Shared reusable geometries (zero GPU leaks!)
    // TALLER TOWERING SIBERIAN TAIGA PINES (22m base height -> 21m to 40m tall!)
    this.geoTrunk = new THREE.CylinderGeometry(0.32, 0.56, 10.5, 6);
    this.geoTrunk.translate(0, 5.25, 0);
    this.geoPine1 = new THREE.ConeGeometry(3.8, 9.5, 7);
    this.geoPine1.translate(0, 10.2, 0);
    this.geoPine2 = new THREE.ConeGeometry(2.9, 8.2, 7);
    this.geoPine2.translate(0, 15.2, 0);
    this.geoPine3 = new THREE.ConeGeometry(1.9, 6.4, 7);
    this.geoPine3.translate(0, 19.6, 0);

    // Taller Desert Saguaro Cactus
    this.geoCactus = new THREE.CylinderGeometry(0.32, 0.38, 5.8, 6);
    this.geoCactus.translate(0, 2.9, 0);
    this.geoRock = new THREE.DodecahedronGeometry(1.0, 0);

    // Breakable Roadside Fence Geometries & Materials (Wood Ranch Fence + Metal Highway Guardrail!)
    this.matFenceWood  = new THREE.MeshStandardMaterial({ color: 0x7c5838, roughness: 0.92 });
    this.matFenceMetal = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.45, metalness: 0.65 });
    this.matBrokenSlab = new THREE.MeshStandardMaterial({ color: 0x5c5f61, roughness: 0.92 });
    this.geoFencePost  = new THREE.BoxGeometry(0.16, 1.35, 0.16);
    // v17.5 Zero-FPS-Hit Instanced Ground Wildflowers (Taiga, Valley, Savanna & Tropics!)
    this.geoFlowerStem  = new THREE.BoxGeometry(0.06, 0.32, 0.06);
    this.geoFlowerPetal = new THREE.DodecahedronGeometry(0.18, 0);
    this.matFlowerStem  = new THREE.MeshStandardMaterial({ color: 0x3b6e34, roughness: 0.92 });
    this.matFlPurple    = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.72 });
    this.matFlBlue      = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.72 });
    this.matFlYellow    = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.70 });
    this.matFlWhite     = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
    this.matFlRed       = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.68 });
    this.geoFenceRailW = new THREE.BoxGeometry(5.6, 0.14, 0.10);
    this.geoGuardRail  = new THREE.BoxGeometry(5.8, 0.34, 0.14);
    this.geoBrokenSlab = new THREE.BoxGeometry(3.4, 0.35, 2.2);
  }

  // Pure procedural ground height BEFORE town/landmark/tarmac flattening
  _computeNaturalGroundHeight(gx, gz, preIslInfo = null, preBiome = null) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const seaFloor = seaL - 28.0; // -60m deep ocean bed
    const islInfo = preIslInfo || this._getIslandInfoInto(gx, gz, this._islNatOut);
    const mask = islInfo.mask;
    const isl = islInfo.island;

    if (!isl || mask <= 0.001) {
      return seaFloor + (this.fbm(gx * 0.0004, gz * 0.0004, 2) - 0.5) * 6.0;
    }

    // OUTER ISLANDS (Tropical Jungle, Golden Savanna, Arctic Glacier, Coral Cay, Black Rock!)
    if (isl.id !== 0) {
      const macro = (this.fbm(gx * 0.00035, gz * 0.00035, 3) - 0.5) * 28;
      const detail = (this.fbm(gx * 0.0024, gz * 0.0024, 3) - 0.5) * 7.5;
      const ridge = 1.0 - Math.abs(this.fbm(gx * 0.00055 + isl.id * 4.1, gz * 0.00055 - isl.id * 2.7, 4) * 2 - 1);
      let landH = seaL + 8.0 + macro + detail;

      if (isl.biome === "tropical") {
        // Very mountainous Indonesian jungle highlands + 2 dramatic volcanoes (Gunung Api + Gunung Danau crater lake!)
        landH += Math.pow(ridge, 1.38) * (isl.peakH || 155) * 1.45 * mask;
        if (isl.id === 1 && KK.TROPIKA_VOLCANOES) {
          for (const v of KK.TROPIKA_VOLCANOES) {
            const dv = Math.hypot(gx - v.x, gz - v.z);
            if (dv < v.radius) {
              const u = 1.0 - dv / v.radius;
              let cone = Math.pow(u, 1.45) * v.peakH;
              if (dv < (v.lakeRad || 420)) {
                const cu = 1.0 - dv / (v.lakeRad || 420);
                cone -= cu * cu * (v.active ? 55 : 78);
              }
              landH += cone;
            }
          }
        }
      } else if (isl.biome === "savanna") {
        // Wide golden rolling grasslands + flat-top mesa plateaus!
        const mesaRaw = Math.pow(ridge, 1.35) * (isl.peakH || 90);
        const mesaFlat = Math.min(mesaRaw, 58) + Math.max(0, mesaRaw - 58) * 0.18;
        landH += mesaFlat * mask;
      } else if (isl.biome === "arctic") {
        // Dramatic jagged alpine glacier peaks + frozen coastal ice shelf!
        landH += Math.pow(ridge, 1.65) * (isl.peakH || 210) * mask + 14 * mask;
      } else if (isl.biome === "radioactive") {
        // Bleak Chernobyl-style coastal wasteland plateau on Site-140 Black Rock!
        landH += Math.pow(ridge, 1.8) * (isl.peakH || 58) * mask + 14 * mask;
      }

      // Smooth coastal beach drop-off into ocean floor
      const coastBlend = Math.min(1.0, mask * 1.45);
      const cb = coastBlend * coastBlend * (3 - 2 * coastBlend);
      return seaFloor * (1 - cb) + landH * cb;
    }

    // ISLAND 1: CLASSIC KRASNO-KAMENKA MAINLAND (100% untouched interior!)
    const b = preBiome || this.getBiomeWeights(gx, gz, islInfo);
    const macro = (this.fbm(gx * 0.00028, gz * 0.00028, 3) - 0.5) * 42;
    const detail = (this.fbm(gx * 0.0022, gz * 0.0022, 3) - 0.5) * 8.5;
    const ridgeNoise = 1.0 - Math.abs(this.fbm(gx * 0.00045 + 11.3, gz * 0.00045 - 5.1, 4) * 2 - 1);
    const mtnHeight = Math.pow(ridgeNoise, 1.7) * 560 * b.mountains + b.mountains * 120;
    const desertDunes = (Math.sin(gx * 0.016 + Math.cos(gz * 0.012) * 2.0) * 5.8 + (this.fbm(gx * 0.0008, gz * 0.0008, 2) - 0.35) * 38) * b.desert;
    const taigaHill = (this.fbm(gx * 0.0014, gz * 0.0014, 3) - 0.45) * 30 * b.taiga;

    const southTougeEnv = Math.max(0, 1 - Math.abs(gz - 14500) / 9500) * Math.max(0, 1 - Math.abs(gx - 2500) / 17000);
    const centralRidgeEnv = Math.max(0, 1 - Math.hypot((gx + 1400) / 3600, (gz - 4200) / 2900));
    const tougeNoise = 1.0 - Math.abs(this.fbm(gx * 0.00062 - 3.4, gz * 0.00062 + 7.1, 4) * 2 - 1);
    const southTougeH = Math.pow(tougeNoise, 1.45) * 195 * southTougeEnv + Math.pow(tougeNoise, 1.35) * 92 * centralRidgeEnv;

    const rawMain = macro + detail + mtnHeight + desertDunes + taigaHill + southTougeH;
    if (mask >= 0.999) return rawMain;
    return seaFloor * (1 - mask) + rawMain * mask;
  }

  // Pre-compute EVERY town, landmark & smooth tarmac pad's elevation from the exact average of surrounding terrain!
  // Permanently eliminates underground crater holes & floating pedestals!
  _computeTownAndLandmarkElevations() {
    const sampleRingAvg = (cx, cz, rad) => {
      let sum = this._computeNaturalGroundHeight(cx, cz) * 2.0;
      let wt = 2.0;
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2;
        sum += this._computeNaturalGroundHeight(cx + Math.cos(ang) * rad, cz + Math.sin(ang) * rad);
        wt += 1.0;
      }
      return sum / wt;
    };

    for (const t of KK.TOWNS) {
      let avgH = sampleRingAvg(t.x, t.z, 115);
      // Keep town dry if near a river channel
      const rc = this.getRiverChannel(t.x, t.z);
      if (rc.seg && rc.dist < 220) avgH = Math.max(avgH, rc.waterY + 2.6);
      t._baseH = avgH;
    }

    for (const lm of KK.LANDMARKS) {
      let avgH = sampleRingAvg(lm.x, lm.z, 42);
      const rc = this.getRiverChannel(lm.x, lm.z);
      if (rc.seg && rc.dist < 140) avgH = Math.max(avgH, rc.waterY + 2.2);
      lm._baseH = avgH;
    }

    if (KK.SMOOTH_TARMAC_ZONES) {
      for (const tz of KK.SMOOTH_TARMAC_ZONES) {
        tz._baseH = sampleRingAvg(tz.cx, tz.cz, Math.max(tz.rx, tz.rz) * 0.75);
      }
    }
    if (KK.CLARKSON_FARM) {
      const cf = KK.CLARKSON_FARM;
      let fH = sampleRingAvg(cf.x, cf.z, cf.radius * 0.78);
      const rcF = this.getRiverChannel(cf.x, cf.z);
      if (rcF.seg && rcF.dist < cf.radius + 80) fH = Math.max(fH, rcF.waterY + 2.8);
      cf._baseH = fH;
    }
    if (KK.JAMES_MAY_BAR) {
      const jb = KK.JAMES_MAY_BAR;
      let bH = sampleRingAvg(jb.x, jb.z, jb.radius * 0.85);
      const rcB = this.getRiverChannel(jb.x, jb.z);
      if (rcB.seg && rcB.dist < jb.radius + 80) bH = Math.max(bH, rcB.waterY + 2.6);
      jb._baseH = bH;
    }
    if (KK.ZOLOTOY_CITY) {
      const zc = KK.ZOLOTOY_CITY;
      zc._baseH = Math.max((KK.SEA_LEVEL || -32) + 8.0, sampleRingAvg(zc.cx, zc.cz, 180));
    }
    if (KK.AIRSTRIPS) {
      for (const a of KK.AIRSTRIPS) {
        a._baseH = Math.max((KK.SEA_LEVEL || -32) + 4.0, sampleRingAvg(a.x, a.z, 38));
      }
    }
    if (KK.HAMMOND_MESA) {
      const hm = KK.HAMMOND_MESA;
      hm._baseH = sampleRingAvg(hm.x, hm.z, hm.radius * 0.9) + (hm.mesaHeightAdd || 16);
    }
  }

  _buildGpCircuitSegments() {
    this.gpCircuits = [];
    if (!KK.SMOOTH_TARMAC_ZONES) return;
    for (const tz of KK.SMOOTH_TARMAC_ZONES) {
      if (!tz.isGpCircuit || !tz.waypoints || tz.waypoints.length < 4) continue;
      const wp = tz.waypoints, n = wp.length, samples = [], subPerSeg = 12;
      for (let i = 0; i < n; i++) {
        const p0 = wp[(i - 1 + n) % n], p1 = wp[i], p2 = wp[(i + 1) % n], p3 = wp[(i + 2) % n];
        for (let s = 0; s < subPerSeg; s++) {
          const t = s / subPerSeg, t2 = t * t, t3 = t2 * t;
          const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
          const z = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
          samples.push([x, z]);
        }
      }
      const segs = [], pad = tz.trackWidth + 46;
      for (let i = 0; i < samples.length; i++) {
        const a = samples[i], b = samples[(i + 1) % samples.length];
        segs.push({ x0: a[0], z0: a[1], x1: b[0], z1: b[1], minX: Math.min(a[0], b[0]) - pad, maxX: Math.max(a[0], b[0]) + pad, minZ: Math.min(a[1], b[1]) - pad, maxZ: Math.max(a[1], b[1]) + pad, idx: i });
      }
      this.gpCircuits.push({ zone: tz, segs, samples });
    }
  }

  getSmoothTarmacInfo(gx, gz) {
    if (!KK.SMOOTH_TARMAC_ZONES) return null;
    for (const tz of KK.SMOOTH_TARMAC_ZONES) {
      const dx = gx - tz.cx, dz = gz - tz.cz;
      const bound = Math.max(tz.rx, tz.rz) + 85;
      if (Math.abs(dx) > bound || Math.abs(dz) > bound) continue;
      const c = Math.cos(-tz.yaw), s = Math.sin(-tz.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;

      const halfTrack = tz.trackWidth * 0.5;
      let distFromTrack = 99999;
      if (tz.isGpCircuit && this.gpCircuits) {
        const gp = this.gpCircuits.find((g) => g.zone === tz);
        if (gp) {
          for (let si = 0; si < gp.segs.length; si++) {
            const sg = gp.segs[si];
            if (lx < sg.minX || lx > sg.maxX || lz < sg.minZ || lz > sg.maxZ) continue;
            const vx = sg.x1 - sg.x0, vz = sg.z1 - sg.z0, l2 = vx * vx + vz * vz;
            const t = l2 > 0 ? Math.max(0, Math.min(1, ((lx - sg.x0) * vx + (lz - sg.z0) * vz) / l2)) : 0;
            const d = Math.hypot(lx - (sg.x0 + vx * t), lz - (sg.z0 + vz * t));
            if (d < distFromTrack) distFromTrack = d;
          }
        }
      } else {
        const ellR = Math.hypot(lx / tz.rx, lz / tz.rz);
        distFromTrack = Math.abs(ellR - 1.0) * ((tz.rx + tz.rz) * 0.5);
      }
      const onSkidpad = tz.isGpCircuit ? (lx > -520 && lx < 140 && lz > -465 && lz < -395) : (Math.abs(lx) < 95 && Math.abs(lz) < 65);
      const onAccess = !tz.isGpCircuit && (lx >= 0 && lx <= tz.rx + 18 && Math.abs(lz) <= 9.5);
      const onTrack = distFromTrack <= halfTrack;
      const onKerb = !onTrack && distFromTrack <= (halfTrack + 2.0);
      const onShoulder = distFromTrack <= (halfTrack + 36) || (Math.abs(lx) < 135 && Math.abs(lz) < 105);

      if (onTrack || onKerb || onSkidpad || onAccess || onShoulder) {
        let blend = 0;
        if (onTrack || onKerb || onSkidpad || onAccess) blend = 1.0;
        else {
          const dTrack = Math.max(0, distFromTrack - (halfTrack + 2.0));
          const uT = Math.max(0, 1.0 - dTrack / 34.0);
          const dSkid = Math.max(Math.max(0, Math.abs(lx) - 95), Math.max(0, Math.abs(lz) - 65));
          const uS = Math.max(0, 1.0 - dSkid / 40.0);
          const u = Math.max(uT, uS);
          blend = u * u * (3 - 2 * u);
        }
        return {
          zone: tz,
          onTrack: onTrack || onSkidpad || onAccess,
          onCenterLine: (distFromTrack < 0.75) && (Math.floor((Math.atan2(lz, lx) + Math.PI) * 32) % 2 === 0),
          onKerb,
          blend,
          targetY: tz._baseH || 10.0
        };
      }
    }
    return null;
  }

  // Query Shattered Hell-Road ("Really Bad Roads") severity 0..1
  getBadRoadInfo(gx, gz) {
    if (!KK.BAD_ROAD_ZONES) return null;
    for (const bz of KK.BAD_ROAD_ZONES) {
      const d = Math.hypot(gx - bz.x, gz - bz.z);
      if (d < bz.radius) {
        const u = 1.0 - d / bz.radius;
        const factor = (u * u * (3 - 2 * u)) * bz.severity;
        // Intense washboard corrugation + deep asymmetric mud-filled bomb craters!
        const washboard = Math.sin(gx * 0.55 + gz * 0.35) * 0.24 * factor;
        const craterNoise = this.valueNoise(gx * 0.14, gz * 0.14);
        const deepCrater = craterNoise < 0.34 ? (0.34 - craterNoise) * 2.2 * factor : 0;
        return { zone: bz, factor, deltaH: washboard - deepCrater, mud: 0.58 * factor };
      }
    }
    return null;
  }

  getBaseHeight(gx, gz, preIslInfo = null, preBiome = null) {
    let h = this._computeNaturalGroundHeight(gx, gz, preIslInfo, preBiome);

    // Smooth Town Plateau Blending (matches exact natural surrounding average -> ZERO holes!)
    for (let i = 0; i < KK.TOWNS.length; i++) {
      const t = KK.TOWNS[i];
      const dx = gx - t.x, dz = gz - t.z;
      if (dx > 185 || dx < -185 || dz > 185 || dz < -185) continue;
      const d = Math.hypot(dx, dz);
      if (d < 185 && t._baseH !== undefined) {
        const blend = d < 92 ? 1.0 : (1.0 - (d - 92) / 93);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + t._baseH * s;
      }
    }

    // Smooth Landmark Pad Blending (exact natural surrounding average -> ZERO holes!)
    for (let i = 0; i < KK.LANDMARKS.length; i++) {
      const lm = KK.LANDMARKS[i];
      const dx = gx - lm.x, dz = gz - lm.z;
      if (dx > 64 || dx < -64 || dz > 64 || dz < -64) continue;
      const d = Math.hypot(dx, dz);
      if (d < 64 && lm._baseH !== undefined) {
        const blend = d < 28 ? 1.0 : (1.0 - (d - 28) / 36);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + lm._baseH * s;
      }
    }

    // Glass-smooth Krasny-Ring Tarmac Proving Grounds flattening
    if (KK.ZOLOTOY_CITY && KK.ZOLOTOY_CITY._baseH !== undefined) {
      const zc = KK.ZOLOTOY_CITY;
      const dxC = Math.abs(gx - zc.cx), dzC = Math.abs(gz - zc.cz);
      const maxD = Math.max(dxC, dzC);
      if (maxD < zc.halfSpan + 146) {
        const bC = maxD < zc.halfSpan + 58 ? 1.0 : Math.max(0, 1.0 - (maxD - (zc.halfSpan + 58)) / 88);
        const sC = bC * bC * (3 - 2 * bC);
        h = h * (1 - sC) + zc._baseH * sC;
      }
    }
    if (KK.PORTS) {
      const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
      const targetPortY = seaL + 2.15;
      for (let i = 0; i < KK.PORTS.length; i++) {
        const pt = KK.PORTS[i];
        const ax = pt.approachX !== undefined ? pt.approachX : pt.x;
        const az = pt.approachZ !== undefined ? pt.approachZ : pt.z;
        const dP = Math.hypot(gx - ax, gz - az);
        if (dP < 95) {
          const u = dP < 36 ? 1.0 : Math.max(0, 1.0 - (dP - 36) / 59);
          const s = u * u * (3 - 2 * u);
          h = h * (1 - s) + targetPortY * s;
        }
      }
    }
    const airInfo = this.getAirstripInfo(gx, gz);
    if (airInfo && airInfo.blend > 0.001 && airInfo.targetY !== undefined) {
      h = h * (1 - airInfo.blend) + airInfo.targetY * airInfo.blend;
    }
    const tzInfo = this.getSmoothTarmacInfo(gx, gz);
    if (tzInfo && tzInfo.blend > 0.001) {
      h = h * (1 - tzInfo.blend) + tzInfo.targetY * tzInfo.blend;
    }

    if (KK.CLARKSON_FARM && KK.CLARKSON_FARM._baseH !== undefined) {
      const cf = KK.CLARKSON_FARM;
      const dF = Math.hypot(gx - cf.x, gz - cf.z);
      if (dF < cf.radius + 75) {
        const blend = dF < cf.radius - 10 ? 1.0 : Math.max(0, 1.0 - (dF - (cf.radius - 10)) / 85.0);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + cf._baseH * s;
      }
    }
    if (KK.JAMES_MAY_BAR && KK.JAMES_MAY_BAR._baseH !== undefined) {
      const jb = KK.JAMES_MAY_BAR;
      const dB = Math.hypot(gx - jb.x, gz - jb.z);
      if (dB < jb.radius + 55) {
        const blend = dB < jb.radius - 6 ? 1.0 : Math.max(0, 1.0 - (dB - (jb.radius - 6)) / 61.0);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + jb._baseH * s;
      }
    }
    if (KK.HAMMOND_MESA && KK.HAMMOND_MESA._baseH !== undefined) {
      const hm = KK.HAMMOND_MESA;
      const dx = gx - hm.x, dz = gz - hm.z;
      const dH = Math.hypot(dx, dz);
      // Wide gentle driveable North access ramp (dz < 0, |dx| < 26) up onto the +16m rock mesa!
      const onRamp = (dz < -hm.radius * 0.55 && dz > -(hm.radius + 105) && Math.abs(dx) < 28);
      if (dH < hm.radius + 70 || onRamp) {
        let blend = 0;
        if (dH < hm.radius - 14) blend = 1.0;
        else if (onRamp) {
          const tZ = Math.max(0, Math.min(1, 1.0 - (-dz - (hm.radius - 14)) / 115.0));
          const tX = Math.max(0, 1.0 - Math.max(0, Math.abs(dx) - 12) / 16.0);
          blend = tZ * tX;
        } else if (dH < hm.radius + 70) {
          blend = Math.max(0, 1.0 - (dH - (hm.radius - 14)) / 84.0);
        }
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + hm._baseH * s;
      }
    }

    for (const key in this.secretPads) {
      const mp = this.secretPads[key];
      const dM = Math.hypot(gx - mp.x, gz - mp.z);
      if (dM < mp.radius + 36) {
        const blend = dM < mp.radius ? 1.0 : Math.max(0, 1.0 - (dM - mp.radius) / 36.0);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + mp.baseH * s;
      }
    }

    if (this.craters.length > 0) {
      h += this._getCraterOffsetInto(gx, gz, this._craterOut).off;
    }

    return h;
  }

  _getNearestRoadInto(gx, gz, out) {
    let bestDist = 999999, bestSeg = null, bestCx = gx, bestCz = gz;
    let segs = this._activeRoadSegs;
    if (!segs) {
      if (this._roadGrid) {
        const cell = this._roadGridCell;
        const ix = Math.floor(gx / cell);
        const iz = Math.floor(gz / cell);
        segs = this._roadGrid.get((ix + 32768) * 65536 + (iz + 32768));
      } else {
        segs = this.roadSegments;
      }
    }
    if (segs) {
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i];
        if (gx < s.minX || gx > s.maxX || gz < s.minZ || gz > s.maxZ) continue;
        const vx = s.x1 - s.x0, vz = s.z1 - s.z0;
        const len2 = vx * vx + vz * vz;
        let t = len2 > 0 ? ((gx - s.x0) * vx + (gz - s.z0) * vz) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const cx = s.x0 + vx * t, cz = s.z0 + vz * t;
        const d = Math.hypot(gx - cx, gz - cz);
        if (d < bestDist) { bestDist = d; bestSeg = s; bestCx = cx; bestCz = cz; }
      }
    }
    out.dist = bestDist; out.seg = bestSeg; out.cx = bestCx; out.cz = bestCz;
    return out;
  }

  getNearestRoad(gx, gz) {
    return this._getNearestRoadInto(gx, gz, { dist: 999999, seg: null, cx: gx, cz: gz });
  }

  getPotholeDepth(gx, gz, roadDist, seg) {
    if (!seg || seg.isModernHwy || seg.isCityGrid || roadDist > seg.width * 0.65) return 0;
    if (Math.hypot(gx, gz) < 75) return 0;
    const cell = 13.0;
    const ix = Math.floor(gx / cell), iz = Math.floor(gz / cell);
    const rnd = this.hash2(ix + 911, iz - 404);
    if (rnd < 0.42) return 0;
    const px = (ix + 0.25 + this.hash2(ix + 17, iz) * 0.5) * cell;
    const pz = (iz + 0.25 + this.hash2(ix, iz + 29) * 0.5) * cell;
    const rad = 1.2 + this.hash2(ix + 7, iz + 13) * 1.45;
    const d = Math.hypot(gx - px, gz - pz);
    if (d >= rad) return 0;
    return (0.20 + this.hash2(ix - 3, iz + 88) * 0.24) * (1 - (d / rad) * (d / rad));
  }

  // Per-session bridge RNG strength roll (uses bridgeRngSeed ONLY — never touches terrain!)
  getBridgeRngStats(br, idx) {
    const tDef = KK.BRIDGE_TYPES[br.style] || KK.BRIDGE_TYPES.rickety_wood;
    const r = this.hashBridge(idx * 97 + 13, 773);
    const mult = br.style === "concrete" ? (0.95 + r * 0.30) : (0.76 + r * 0.56);
    const maxKg = Math.round((br.baseMaxMassKg * mult) / 100) * 100;
    let cond = "SOLID", accent = "#1b7a43";
    if (br.style === "concrete") {
      cond = mult > 1.1 ? "REINFORCED" : "HEAVY SLAB"; accent = "#1b6ca8";
    } else if (mult >= 1.14) { cond = "STURDY"; accent = "#1b7a43"; }
    else if (mult >= 0.96) { cond = "WORN"; accent = "#b36b00"; }
    else if (mult >= 0.85) { cond = "CREAKY"; accent = "#cc4400"; }
    else { cond = "SKETCHY!"; accent = "#b81d24"; }
    return { tDef, mult, maxKg, cond, accent };
  }

  // C1-Continuous Bridge Span, Smooth Graded Abutment Embankment & Unclipped Ravine Query!
  getBridgeInfo(gx, gz) {
    for (let i = 0; i < KK.BRIDGES.length; i++) {
      const br = KK.BRIDGES[i];
      const dx = gx - br.x, dz = gz - br.z;
      const halfL = br.length * 0.5;
      const halfW = br.width * 0.5;
      const abutLen = 32.0;
      const latRavineMax = 112.0;
      // Generous radial bound so NEITHER abutment NOR ravine EVER gets clipped by a square box!
      const maxReach = Math.max(halfL + abutLen + 20.0, latRavineMax + 20.0);
      if (Math.abs(dx) > maxReach || Math.abs(dz) > maxReach) continue;

      const c = Math.cos(-br.yaw), s = Math.sin(-br.yaw);
      const lx = dx * c - dz * s; // along bridge (-halfL to +halfL)
      const lz = dx * s + dz * c; // across bridge width
      const absLx = Math.abs(lx);
      const absLz = Math.abs(lz);

      const bObj = this.bridgeMeshes.get(br.id);
      const startY = bObj ? bObj.startY : this.getBaseHeight(br.x - Math.cos(br.yaw) * (halfL + 12), br.z - Math.sin(br.yaw) * (halfL + 12));
      const endY = bObj ? bObj.endY : this.getBaseHeight(br.x + Math.cos(br.yaw) * (halfL + 12), br.z + Math.sin(br.yaw) * (halfL + 12));
      const tAlong = Math.max(0, Math.min(1, (lx + halfL) / br.length));
      const deckYAt = startY + tAlong * (endY - startY);

      // 1. C1-Smooth Approach Abutment Embankment (ZERO sudden cliff step at bank lip!)
      //    - absLx in [halfL-10 .. halfL-1]: smoothstep 0 -> 1 tucked safely UNDER bridge span
      //    - absLx in [halfL-1  .. halfL+6]: solid flat 1.0 locked to exact startY / endY!
      //    - absLx in [halfL+6  .. halfL+6+abutLen]: smoothstep 1 -> 0 into natural road!
      let abutmentBlend = 0;
      const abutmentTargetY = lx < 0 ? startY : endY;
      if (absLx >= halfL - 10.0 && absLx <= halfL + 6.0 + abutLen && absLz <= halfW + 16.0) {
        let sA = 1.0;
        if (absLx < halfL - 1.0) {
          const uA = (absLx - (halfL - 10.0)) / 9.0;
          sA = uA * uA * (3.0 - 2.0 * uA);
        } else if (absLx > halfL + 6.0) {
          const uA = 1.0 - (absLx - (halfL + 6.0)) / abutLen;
          sA = uA * uA * (3.0 - 2.0 * uA);
        }
        let sL = 1.0;
        if (absLz > halfW + 3.0) {
          const uL = 1.0 - (absLz - (halfW + 3.0)) / 13.0;
          sL = uL * uL * (3.0 - 2.0 * uL);
        }
        abutmentBlend = sA * sL;
      }

      // 2. Smooth Ravine Carving strictly underneath the open bridge span
      let ravineDrop = 0;
      const carveHalfL = halfL - 4.0;
      if (absLx < carveHalfL && absLz < latRavineMax) {
        const uX = 1.0 - absLx / carveHalfL;
        const sX = uX * uX * (3.0 - 2.0 * uX);
        const uZ = absLz <= 35.0 ? 1.0 : Math.max(0.0, 1.0 - (absLz - 35.0) / (latRavineMax - 35.0));
        const sZ = uZ * uZ * (3.0 - 2.0 * uZ);
        ravineDrop = br.ravineDepth * sX * sZ;
      }

      // Generous +1.5m longitudinal & +0.4m lateral deck overlap into solid abutments!
      const onDeck = absLx <= (halfL + 1.5) && absLz <= (halfW + 0.40);
      if (onDeck || abutmentBlend > 0.002 || ravineDrop > 0.02) {
        let plankIdx = -1, plankIntact = false;
        const tDef = KK.BRIDGE_TYPES[br.style] || KK.BRIDGE_TYPES.rickety_wood;
        if (onDeck) {
          plankIdx = Math.floor(((lx + halfL) / br.length) * br.plankCount);
          plankIdx = Math.max(0, Math.min(br.plankCount - 1, plankIdx));
          const isEndLip = (plankIdx === 0 || plankIdx === br.plankCount - 1);
          plankIntact = (!tDef.breakable || isEndLip) ? true : !(bObj && bObj.broken.has(plankIdx));
        }
        return {
          bridge: br, bridgeObj: bObj, tDef,
          onDeck, plankIdx, plankIntact, deckYAt,
          abutmentBlend, abutmentTargetY, ravineDrop, lx, lz
        };
      }
    }
    return null;
  }

  getRampElevation(gx, gz) {
    for (let i = 0; i < KK.LANDMARKS.length; i++) {
      const lm = KK.LANDMARKS[i];
      if (!lm.hasRamp || lm._baseH === undefined) continue;
      const dx = gx - lm.x, dz = gz - lm.z;
      if (Math.abs(dx) > 36 || Math.abs(dz) > 36) continue;
      const c = Math.cos(-lm.rampYaw), s = Math.sin(-lm.rampYaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const halfL = lm.rampLen * 0.5, halfW = lm.rampWidth * 0.5;
      if (lx >= -halfL && lx <= halfL && Math.abs(lz) <= halfW) {
        const t = (lx + halfL) / lm.rampLen;
        return lm._baseH + Math.pow(t, 1.25) * lm.rampHeight;
      }
    }
    return null;
  }

  // Exact Barycentric Triangle Height Lookup directly from the rendered 3D chunk mesh!
  // Guarantees 100.000% bit-for-bit match between visible mountains/hills and car physics!
  getRenderedChunkHeight(gx, gz) {
    const size = KK.CHUNK_SIZE;
    const segs = KK.CHUNK_SEGMENTS;
    const cx = Math.floor(gx / size);
    const cz = Math.floor(gz / size);
    const chunk = this._chunkIntMap.get((cx + 32768) * 65536 + (cz + 32768));
    if (!chunk || !chunk.heights) return null;

    const fx = ((gx - cx * size) / size) * segs;
    const fz = ((gz - cz * size) / size) * segs;
    const ix = Math.max(0, Math.min(segs - 1, Math.floor(fx)));
    const iz = Math.max(0, Math.min(segs - 1, Math.floor(fz)));
    const u = Math.max(0, Math.min(1, fx - ix));
    const v = Math.max(0, Math.min(1, fz - iz));

    const stride = segs + 1;
    const H = chunk.heights;
    const idxA = iz * stride + ix;
    const hA = H[idxA];           // (0,0)
    const hD = H[idxA + 1];       // (1,0)
    const hB = H[idxA + stride];  // (0,1)
    const hC = H[idxA + stride + 1]; // (1,1)

    // Matches Three.js PlaneGeometry diagonal split (b,d): u+v <= 1 vs u+v > 1!
    if (u + v <= 1.0) {
      return hA + u * (hD - hA) + v * (hB - hA);
    } else {
      return hC + (1.0 - u) * (hB - hC) + (1.0 - v) * (hD - hC);
    }
  }

  // Full deterministic terrain + bridge + ramp query
  getTerrainInfo(gx, gz, forVehicle = true, refY = Infinity) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    // ULTRA-FAST BAKED-CHUNK PATH: When the chunk is already loaded (and we are not inside a chunk build),
    // read exact triangle height + baked surface/mud/pothole/water metadata directly from the chunk,
    // skipping multi-octave fbm, town/landmark/mud/river loops, and road scans completely!
    if (!this._inChunkBuild) {
      const size = KK.CHUNK_SIZE;
      const cx = Math.floor(gx / size);
      const cz = Math.floor(gz / size);
      const chunk = this._chunkIntMap.get((cx + 32768) * 65536 + (cz + 32768));
      if (chunk) {
        if (chunk.isPureOcean) {
          let h = seaL - 28.0 + (this.fbm(gx * 0.0004, gz * 0.0004, 2) - 0.5) * 6.0;
          let surface = "sand";
          let waterSurfaceY = seaL;
          let waterDepth = seaL - h;
          let onBridge = false;
          if (forVehicle) {
            const mbInfo = this.getMegaBridgeInfo(gx, gz);
            if (mbInfo && mbInfo.onDeck && refY >= (mbInfo.deckY - 4.0)) {
              h = mbInfo.deckY;
              surface = mbInfo.isLine ? "tarmac_line" : "race_tarmac";
              waterDepth = 0;
              onBridge = true;
            } else if (this.boatsRef && this.boatsRef.getDriveableSurfaceAt) {
              const bs = this.boatsRef.getDriveableSurfaceAt(gx, gz, h);
              if (bs && bs.height >= h - 0.5) {
                h = bs.height;
                surface = "asphalt";
                waterDepth = 0;
                onBridge = true;
              }
            }
          }
          return { height: h, surface, roadDist: 999999, potholeDepth: 0, mudDepth: 0, waterDepth, waterSurfaceY, onBridge, bridgeHit: null, b: this._oceanBiome };
        }
        if (chunk.heights && chunk.surfaceCodes) {
          const segs = KK.CHUNK_SEGMENTS;
          const fx = ((gx - cx * size) / size) * segs;
          const fz = ((gz - cz * size) / size) * segs;
          const ix = Math.max(0, Math.min(segs - 1, Math.floor(fx)));
          const iz = Math.max(0, Math.min(segs - 1, Math.floor(fz)));
          const u = Math.max(0, Math.min(1, fx - ix));
          const v = Math.max(0, Math.min(1, fz - iz));
          const stride = segs + 1;
          const idxA = iz * stride + ix;
          const idxD = idxA + 1;
          const idxB = idxA + stride;
          const idxC = idxB + 1;
          const H = chunk.heights;
          const hA = H[idxA], hD = H[idxD], hB = H[idxB], hC = H[idxC];
          let h = (u + v <= 1.0)
            ? (hA + u * (hD - hA) + v * (hB - hA))
            : (hC + (1.0 - u) * (hB - hC) + (1.0 - v) * (hD - hC));

          const nix = u >= 0.5 ? (ix + 1) : ix;
          const niz = v >= 0.5 ? (iz + 1) : iz;
          const nIdx = niz * stride + nix;
          let surface = KK_SURFACE_NAMES[chunk.surfaceCodes[nIdx]] || "grass";

          let mudDepth = 0;
          const M = chunk.mudDepths;
          if (M !== null) {
            const omu = 1 - u, omv = 1 - v;
            mudDepth = (M[idxA] * omu * omv + M[idxD] * u * omv + M[idxB] * omu * v + M[idxC] * u * v) * 0.01;
          }

          let potholeDepth = 0;
          const P = chunk.potholeDepths;
          if (P !== null) {
            const omu = 1 - u, omv = 1 - v;
            potholeDepth = (P[idxA] * omu * omv + P[idxD] * u * omv + P[idxB] * omu * v + P[idxC] * u * v) * 0.005;
          }

          let waterSurfaceY = -9999, waterDepth = 0, onBridge = false, bridgeHit = null;
          const W = chunk.waterSurfaceYs;
          if (W !== null) {
            const wA = W[idxA], wD = W[idxD], wB = W[idxB], wC = W[idxC];
            let wSum = 0, wWt = 0;
            const omu = 1 - u, omv = 1 - v;
            if (wA > -5000) { const wt = omu * omv; wSum += wA * wt; wWt += wt; }
            if (wD > -5000) { const wt = u * omv;   wSum += wD * wt; wWt += wt; }
            if (wB > -5000) { const wt = omu * v;   wSum += wB * wt; wWt += wt; }
            if (wC > -5000) { const wt = u * v;     wSum += wC * wt; wWt += wt; }
            if (wWt > 0.0001) {
              waterSurfaceY = wSum / wWt;
              if (h < waterSurfaceY) waterDepth = waterSurfaceY - h;
            }
          }

          if (forVehicle) {
            // Layer 6-Lane Ocean Mega-Bridge Deck cleanly on top (fast AABB reject when away!)
            if (chunk.hasMegaBridge) {
              const mbInfo = this.getMegaBridgeInfo(gx, gz);
              if (mbInfo && mbInfo.onDeck && refY >= (mbInfo.deckY - 4.0) && mbInfo.deckY >= h - 0.35) {
                h = mbInfo.deckY;
                surface = mbInfo.isLine ? "tarmac_line" : "race_tarmac";
                waterDepth = 0;
                mudDepth = 0;
                potholeDepth = 0;
                onBridge = true;
              }
            }

            // Layer Zolotoy City Elevated Overpass Bridges (cars can drive OVER and UNDER!)
            if (chunk.hasCityOverpass) {
              const ovInfo = this.getCityOverpassInfo(gx, gz, refY);
              if (ovInfo && ovInfo.onDeck && ovInfo.deckY >= h - 0.25) {
                h = ovInfo.deckY;
                surface = ovInfo.isCenterLine ? "tarmac_line" : "race_tarmac";
                waterDepth = 0;
                mudDepth = 0;
                potholeDepth = 0;
                onBridge = true;
              }
            }

            // Layer exact analytical Bridge Deck cleanly on top (and allow BTR-80 swimming underneath!)
            if (chunk.hasBridge) {
              const bInfo = this.getBridgeInfo(gx, gz);
              if (bInfo && bInfo.onDeck && bInfo.plankIntact && refY >= (bInfo.deckYAt - 3.2)) {
                const sag = bInfo.bridgeObj ? (bInfo.bridgeObj.plankSag[bInfo.plankIdx] || 0) : 0;
                const deckH = bInfo.deckYAt - sag;
                if (deckH >= h - 0.15) {
                  h = deckH;
                  surface = bInfo.tDef.surface || "wood";
                  waterDepth = 0;
                  mudDepth = 0;
                  potholeDepth = 0;
                  onBridge = true;
                  bridgeHit = bInfo;
                }
              }
            }

            // Layer Driveable Stunt Ramp cleanly on top
            if (chunk.hasRamp) {
              const rampY = this.getRampElevation(gx, gz);
              if (rampY !== null && rampY > h) {
                h = rampY;
                surface = "asphalt";
              }
            }

            // v15.4.2 SOLID COLLIDABLE PORT PIERS + LANDWARD APPROACH RAMPS + SIDE LAUNCH RAMPS!
            if (chunk.hasPort && KK.PORTS) {
              const pierY = seaL + 2.95;
              for (let pi = 0; pi < KK.PORTS.length; pi++) {
                const pt = KK.PORTS[pi];
                const dxP = gx - pt.x, dzP = gz - pt.z;
                if (Math.abs(dxP) > 76 || Math.abs(dzP) > 76) continue;
                const cp = Math.cos(-(pt.yaw || 0)), sp = Math.sin(-(pt.yaw || 0));
                const lxP = dxP * cp + dzP * sp;
                const lzP = -dxP * sp + dzP * cp;
                const iid = pt.islandId;
                const halfW = (iid === 2) ? 22.0 : ((iid === 4) ? 7.5 : ((iid === 1 || iid === 5) ? 10.0 : 12.2));
                const minZ  = (iid === 2) ? -16.0 : ((iid === 1 || iid === 4) ? -10.0 : -12.0);
                const maxZ  = (iid === 2) ? 53.0 : ((iid === 4) ? 30.0 : ((iid === 1) ? 35.0 : ((iid === 5) ? 31.0 : 37.0)));

                if (Math.abs(lxP) <= halfW && lzP >= minZ && lzP <= maxZ) {
                  if (pierY >= h - 0.5) {
                    h = pierY; surface = "asphalt"; waterDepth = 0; mudDepth = 0; potholeDepth = 0; onBridge = true;
                    break;
                  }
                }
                if (Math.abs(lxP) <= halfW && lzP < minZ && lzP >= minZ - 16.0) {
                  const uR = 1.0 - (minZ - lzP) / 16.0;
                  const rampH = h * (1.0 - uR) + pierY * uR;
                  if (rampH >= h - 0.25) {
                    h = rampH; surface = "asphalt"; waterDepth = 0; mudDepth = 0; potholeDepth = 0; onBridge = true;
                    break;
                  }
                }
                const rX = (iid === 2) ? 27.0 : ((iid === 4) ? 11.5 : ((iid === 1) ? 14.5 : ((iid === 5) ? 13.5 : 16.5)));
                const rW = (iid === 2) ? 7.5 : 5.5;
                const rZ0 = (iid === 2) ? 12.0 : 5.0;
                const rZ1 = (iid === 2) ? 36.0 : 28.0;
                if (Math.abs(lxP - rX) <= rW && lzP >= rZ0 && lzP <= rZ1) {
                  const uL = (lzP - rZ0) / (rZ1 - rZ0);
                  const launchH = pierY * (1.0 - uL) + (seaL - 0.6) * uL;
                  if (launchH >= h - 0.5) {
                    h = launchH; surface = "asphalt"; waterDepth = Math.max(0, seaL - h); mudDepth = 0; potholeDepth = 0; onBridge = true;
                    break;
                  }
                }
              }
            }

            // v15.4 DRIVE-ON PHYSICAL BOAT RAMPS & CARGO DECKS!
            if (this.boatsRef && this.boatsRef.getDriveableSurfaceAt) {
              const bs = this.boatsRef.getDriveableSurfaceAt(gx, gz, h);
              if (bs && bs.height >= h - 0.5) {
                h = bs.height;
                surface = "asphalt";
                waterDepth = 0;
                mudDepth = 0;
                potholeDepth = 0;
                onBridge = true;
              }
            }
          }

          const b = chunk.biomeWeights;
          if (!onBridge && h < seaL) {
            waterSurfaceY = Math.max(waterSurfaceY, seaL);
            waterDepth = Math.max(waterDepth, seaL - h);
            surface = (b.volcanic > 0.4) ? "volcanic" : "sand";
          }

          return { height: h, surface, roadDist: 999999, potholeDepth, mudDepth, waterDepth, waterSurfaceY, onBridge, bridgeHit, b };
        }
      }
    }

    // ANALYTICAL FALLBACK PATH (Used during chunk baking or when target chunk is not yet loaded)
    const islInfo = this._getIslandInfoInto(gx, gz, this._islOut);
    const b = this.getBiomeWeights(gx, gz, islInfo);
    let h = this.getBaseHeight(gx, gz, islInfo, b);
    let surface = b.volcanic > 0.42 ? "volcanic"
      : (b.arctic > 0.42 ? "snow"
      : (b.desert > 0.45 ? "sand"
      : (b.savanna > 0.42 ? "gravel"
      : (b.tropical > 0.42 ? "grass" : "grass"))));
    let potholeDepth = 0, mudDepth = 0;
    let waterSurfaceY = -9999, waterDepth = 0, onBridge = false, bridgeHit = null;

    const bInfo = this.getBridgeInfo(gx, gz);
    const abutSuppress = bInfo ? bInfo.abutmentBlend : 0;

    // 1. Road flattening + potholes (bridge causeways stay pothole-free)
    const road = this._getNearestRoadInto(gx, gz, this._roadOut);
    if (road.seg && road.dist < road.seg.width * 1.9) {
      const centerH = this.getBaseHeight(road.cx, road.cz);
      const inner = road.seg.width * 0.58, outer = road.seg.width * 1.9;
      let blend = 1.0;
      if (road.dist > inner) {
        blend = 1.0 - (road.dist - inner) / (outer - inner);
        blend = blend * blend * (3 - 2 * blend);
      }
      const camberTilt = road.seg.isMountain ? Math.sin(road.cx * 0.015) * 0.14 * (road.dist / road.seg.width) : 0;
      h = h * (1 - blend) + (centerH + camberTilt) * blend;
      if (road.dist < road.seg.width * 0.56) {
        if (road.seg.isModernHwy || road.seg.isCityGrid) {
          surface = road.dist < 0.45 ? "tarmac_line" : "race_tarmac";
        } else if (road.seg.isTropikaHell) {
          surface = "bad_road";
          if (abutSuppress < 0.15) {
            potholeDepth = this.getPotholeDepth(gx, gz, road.dist, road.seg) * 1.45;
            h -= potholeDepth;
          }
        } else {
          surface = road.seg.isMountain ? "shale" : "asphalt";
          if (abutSuppress < 0.15) {
            potholeDepth = this.getPotholeDepth(gx, gz, road.dist, road.seg);
            h -= potholeDepth;
          }
        }
      } else if (road.dist < road.seg.width * 0.95) {
        surface = "gravel";
      }
    }

    // 2. Continuous Great Krasnaya River (Clean Valley Trough Carving — NO Rim-Lift — + Wide Gentle Shallow Fords!)
    const rc = this._getRiverChannelInto(gx, gz, this._riverOut);
    if (rc.seg && rc.dist < rc.seg.halfWidth + 58) {
      const rWaterY = rc.waterY;
      const hw = rc.seg.halfWidth;
      const ford = this._getRiverFordInfoInto(gx, gz, this._fordOut);
      const targetDepth = rc.seg.depth * (1.0 - ford.blend) + ford.depth * ford.blend;
      const bedY = rWaterY - targetDepth;

      if (ford.blend > 0.01 && abutSuppress < 0.5) {
        // Wide, gentle driveable gravel ramp approaches on BOTH banks (0 .. hw+52m) down to flat 0.44-0.52m cobble bed!
        const fordBedHalf = hw * 0.85;
        const fordOuter = hw + 52.0;
        let rampBlend = 0;
        if (rc.dist <= fordBedHalf) rampBlend = 1.0;
        else if (rc.dist < fordOuter) {
          const u = 1.0 - (rc.dist - fordBedHalf) / (fordOuter - fordBedHalf);
          rampBlend = u * u * (3 - 2 * u);
        }
        const effFord = rampBlend * ford.blend * (1.0 - abutSuppress);
        if (effFord > 0.001) {
          const fordBedY = rWaterY - ford.depth;
          h = h * (1.0 - effFord) + fordBedY * effFord;
        }
        // Also blend any residual normal-channel depth outside ford core cleanly downward only
        if (ford.blend < 0.99 && rc.dist < hw + 56.0) {
          let chB = rc.dist <= hw * 0.55 ? 1.0 : Math.max(0, 1.0 - (rc.dist - hw * 0.55) / (hw * 0.45 + 56.0));
          chB = chB * chB * (3 - 2 * chB) * (1.0 - ford.blend) * (1.0 - abutSuppress);
          const carvedH = h * (1.0 - chB) + bedY * chB;
          if (carvedH < h) h = carvedH;
        }
      } else {
        // Clean valley trough out to hw + 56m, blending terrain strictly DOWN to riverbed (never pushing banks up!)
        let channelBlend = 0;
        if (rc.dist <= hw * 0.55) channelBlend = 1.0;
        else if (rc.dist < hw + 56.0) {
          const u = 1.0 - (rc.dist - hw * 0.55) / (hw * 0.45 + 56.0);
          channelBlend = u * u * (3 - 2 * u);
        }
        const effBlend = channelBlend * (1.0 - abutSuppress);
        if (effBlend > 0.001) {
          const carvedH = h * (1.0 - effBlend) + bedY * effBlend;
          if (carvedH < h) h = carvedH;
        }
      }

      if (h < rWaterY && rc.dist < hw + 24 && abutSuppress < 0.5) {
        waterSurfaceY = Math.max(waterSurfaceY, rWaterY);
        waterDepth = Math.max(waterDepth, rWaterY - h);
        if (ford.blend > 0.20) {
          surface = "gravel";
          mudDepth = 0;
          potholeDepth = 0;
        } else {
          surface = waterDepth < 0.9 ? "gravel" : "mud";
          if (waterDepth < 0.9) mudDepth = 0;
        }
      } else if (ford.blend > 0.18 && rc.dist < hw + 52 && abutSuppress < 0.45) {
        surface = "gravel";
        mudDepth = 0;
        potholeDepth = 0;
      } else if (rc.dist < hw + 18 && abutSuppress < 0.35) {
        surface = "gravel";
      }
    }

    // 2B. Smooth High-Grip Tarmac Proving Grounds (Zero potholes, glassy grip!)
    const tarmac = this.getSmoothTarmacInfo(gx, gz);
    if (tarmac && (tarmac.onTrack || tarmac.onKerb)) {
      h = tarmac.targetY;
      potholeDepth = 0;
      mudDepth = 0;
      waterDepth = 0;
      surface = tarmac.onKerb ? "kerb" : (tarmac.onCenterLine ? "tarmac_line" : "race_tarmac");
    }

    // 2B2. Richard Hammond's Solid Rock Desert Mesa (Sandwyrm-Proof!)
    if (KK.HAMMOND_MESA) {
      const hm = KK.HAMMOND_MESA;
      const dHm = Math.hypot(gx - hm.x, gz - hm.z);
      if (dHm < hm.radius + 10) {
        surface = "rock";
        mudDepth = 0;
        potholeDepth = 0;
      }
    }

    // 2C. Really Bad Roads ("Devil's Washbasin" & "Rzhavsk Bomb-Crater Highway")
    const badRoad = this.getBadRoadInfo(gx, gz);
    if (badRoad && abutSuppress < 0.2) {
      h += badRoad.deltaH;
      mudDepth = Math.max(mudDepth, badRoad.mud);
      if (badRoad.factor > 0.25) {
        potholeDepth = Math.max(potholeDepth, Math.max(0, -badRoad.deltaH));
        surface = badRoad.deltaH < -0.18 ? "mud" : "bad_road";
      }
    }

    // 3. Isolated River Fords
    for (let i = 0; i < KK.RIVERS.length; i++) {
      const rv = KK.RIVERS[i];
      const dx = gx - rv.x, dz = gz - rv.z;
      if (Math.abs(dx) > rv.rx + 40 || Math.abs(dz) > rv.rx + 40) continue;
      const c = Math.cos(-rv.yaw), s = Math.sin(-rv.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const norm = (lx * lx) / (rv.rx * rv.rx) + (lz * lz) / (rv.rz * rv.rz);
      if (norm < 1.35) {
        const bankH = this.getBaseHeight(rv.x + rv.rx * 0.9, rv.z);
        const bedDrop = Math.max(0, 1 - norm / 1.15) * (rv.depth + 0.5) * (1.0 - abutSuppress);
        h -= bedDrop;
        waterSurfaceY = Math.max(waterSurfaceY, bankH - 0.35);
        if (h < waterSurfaceY && abutSuppress < 0.5) { waterDepth = Math.max(waterDepth, waterSurfaceY - h); surface = "mud"; }
      }
    }

    // 4. Mud Bogs (never spoil shallow cobble river fords!)
    const fordMudChk = this._getRiverFordInfoInto(gx, gz, this._fordOut);
    if (fordMudChk.blend < 0.25) {
      for (let i = 0; i < KK.MUD_ZONES.length; i++) {
        const m = KK.MUD_ZONES[i];
        const d = Math.hypot(gx - m.x, gz - m.z);
        if (d < m.r && abutSuppress < 0.35) {
          const f = 1 - d / m.r;
          const ruts = Math.sin(gx * 0.65) * 0.14 * f;
          mudDepth = Math.max(mudDepth, m.depth * f);
          h -= mudDepth * 0.45 + ruts;
          surface = "mud";
        }
      }
    }

    // 5. Bridge Ravine + Smooth Graded Approach Abutments
    if (bInfo) {
      if (bInfo.ravineDrop > 0.01) {
        h -= bInfo.ravineDrop * (1.0 - abutSuppress);
      }
      if (abutSuppress > 0.002) {
        h = h * (1.0 - abutSuppress) + bInfo.abutmentTargetY * abutSuppress;
        if (abutSuppress > 0.45) {
          waterDepth = 0;
          mudDepth = 0;
          surface = bInfo.bridge.style === "concrete" ? "asphalt" : "gravel";
        }
      } else if (bInfo.ravineDrop > 2.5) {
        surface = "rock";
      }
    }

    // 5B. 6-Lane Ocean Mega-Bridge Coastal Approach Embankments (zero lip/seam at both bridgeheads!)
    const mbInfo = this.getMegaBridgeInfo(gx, gz);
    if (mbInfo && mbInfo.embankmentBlend > 0.002) {
      h = h * (1.0 - mbInfo.embankmentBlend) + mbInfo.embankmentY * mbInfo.embankmentBlend;
      if (mbInfo.embankmentBlend > 0.45) {
        waterDepth = 0;
        mudDepth = 0;
        potholeDepth = 0;
        surface = mbInfo.isLine ? "tarmac_line" : "race_tarmac";
      }
    }

    // 6. For physics queries (`forVehicle = true`), SNAP base ground height to the EXACT rendered chunk triangle!
    //    This guarantees ZERO visual/physics mismatch on mountains, slopes, hills, or bridge approaches!
    if (forVehicle) {
      const meshH = this.getRenderedChunkHeight(gx, gz);
      if (meshH !== null) {
        h = meshH;
        if (waterSurfaceY > -5000 && h < waterSurfaceY) waterDepth = waterSurfaceY - h;
        else if (waterSurfaceY > -5000 && h >= waterSurfaceY) waterDepth = 0;
      }

      // Layer 6-Lane Ocean Mega-Bridge Deck cleanly on top
      if (mbInfo && mbInfo.onDeck && refY >= (mbInfo.deckY - 4.0) && mbInfo.deckY >= h - 0.35) {
        h = mbInfo.deckY;
        surface = mbInfo.isLine ? "tarmac_line" : "race_tarmac";
        waterDepth = 0;
        mudDepth = 0;
        potholeDepth = 0;
        onBridge = true;
      }

      // Layer Zolotoy City Elevated Overpass Bridges (drive OVER and UNDER!)
      const ovInfo = this.getCityOverpassInfo(gx, gz, refY);
      if (ovInfo && ovInfo.onDeck && ovInfo.deckY >= h - 0.25) {
        h = ovInfo.deckY;
        surface = ovInfo.isCenterLine ? "tarmac_line" : "race_tarmac";
        waterDepth = 0;
        mudDepth = 0;
        potholeDepth = 0;
        onBridge = true;
      }

      // Layer exact analytical Bridge Deck cleanly on top (and allow BTR-80 swimming underneath!)
      if (bInfo && bInfo.onDeck && bInfo.plankIntact && refY >= (bInfo.deckYAt - 3.2)) {
        const sag = bInfo.bridgeObj ? (bInfo.bridgeObj.plankSag[bInfo.plankIdx] || 0) : 0;
        const deckH = bInfo.deckYAt - sag;
        if (deckH >= h - 0.15) {
          h = deckH;
          surface = bInfo.tDef.surface || "wood";
          waterDepth = 0;
          mudDepth = 0;
          onBridge = true;
          bridgeHit = bInfo;
        }
      }

      // Layer Driveable Stunt Ramp cleanly on top
      const rampY = this.getRampElevation(gx, gz);
      if (rampY !== null && rampY > h) {
        h = rampY;
        surface = "asphalt";
      }

      // v15.4.2 SOLID COLLIDABLE PORT PIERS + LANDWARD APPROACH RAMPS + SIDE LAUNCH RAMPS!
      if (KK.PORTS) {
        const pierY = seaL + 2.95;
        for (let pi = 0; pi < KK.PORTS.length; pi++) {
          const pt = KK.PORTS[pi];
          const dxP = gx - pt.x, dzP = gz - pt.z;
          if (Math.abs(dxP) > 76 || Math.abs(dzP) > 76) continue;
          const cp = Math.cos(-(pt.yaw || 0)), sp = Math.sin(-(pt.yaw || 0));
          const lxP = dxP * cp + dzP * sp;
          const lzP = -dxP * sp + dzP * cp;
          const iid = pt.islandId;
          const halfW = (iid === 2) ? 22.0 : ((iid === 4) ? 7.5 : ((iid === 1 || iid === 5) ? 10.0 : 12.2));
          const minZ  = (iid === 2) ? -16.0 : ((iid === 1 || iid === 4) ? -10.0 : -12.0);
          const maxZ  = (iid === 2) ? 53.0 : ((iid === 4) ? 30.0 : ((iid === 1) ? 35.0 : ((iid === 5) ? 31.0 : 37.0)));

          // 1) Main horizontal pier deck (extended +1m seaward to bridge seamlessly to ship ramps!)
          if (Math.abs(lxP) <= halfW && lzP >= minZ && lzP <= maxZ) {
            if (pierY >= h - 0.5) {
              h = pierY; surface = "asphalt"; waterDepth = 0; mudDepth = 0; onBridge = true;
              break;
            }
          }
          // 2) Smooth sloped landward approach ramp (16m long) so cars climb cleanly onto the pier!
          if (Math.abs(lxP) <= halfW && lzP < minZ && lzP >= minZ - 16.0) {
            const u = 1.0 - (minZ - lzP) / 16.0;
            const rampH = h * (1.0 - u) + pierY * u;
            if (rampH >= h - 0.25) {
              h = rampH; surface = "asphalt"; waterDepth = 0; mudDepth = 0; onBridge = true;
              break;
            }
          }
          // 3) Solid driveable side boat launch ramp!
          const rX = (iid === 2) ? 27.0 : ((iid === 4) ? 11.5 : ((iid === 1) ? 14.5 : ((iid === 5) ? 13.5 : 16.5)));
          const rW = (iid === 2) ? 7.5 : 5.5;
          const rZ0 = (iid === 2) ? 12.0 : 5.0;
          const rZ1 = (iid === 2) ? 36.0 : 28.0;
          if (Math.abs(lxP - rX) <= rW && lzP >= rZ0 && lzP <= rZ1) {
            const u = (lzP - rZ0) / (rZ1 - rZ0);
            const launchH = pierY * (1.0 - u) + (seaL - 0.6) * u;
            if (launchH >= h - 0.5) {
              h = launchH; surface = "asphalt"; waterDepth = Math.max(0, seaL - h); mudDepth = 0; onBridge = true;
              break;
            }
          }
        }
      }

      // v15.4 DRIVE-ON PHYSICAL BOAT RAMPS & CARGO DECKS!
      if (this.boatsRef && this.boatsRef.getDriveableSurfaceAt) {
        const bs = this.boatsRef.getDriveableSurfaceAt(gx, gz, h);
        if (bs && bs.height >= h - 0.5) {
          h = bs.height;
          surface = "asphalt";
          waterDepth = 0;
          mudDepth = 0;
          onBridge = true;
        }
      }
    }

    const airInfo = this.getAirstripInfo(gx, gz);
    if (airInfo && airInfo.onRunway) {
      surface = airInfo.isLine ? "tarmac_line" : (airInfo.strip.surface === "asphalt" ? "race_tarmac" : "gravel");
    }

    // Coastal Sandy Beaches & Open Ocean Water Depth!
    if (!onBridge) {
      if (h < seaL) {
        waterSurfaceY = Math.max(waterSurfaceY, seaL);
        waterDepth = Math.max(waterDepth, seaL - h);
        surface = (b.volcanic > 0.4) ? "volcanic" : "sand";
      } else if (h < seaL + 4.8 && (b.arctic || 0) < 0.45 && b.volcanic < 0.45 && surface !== "asphalt" && surface !== "race_tarmac" && surface !== "tarmac_line") {
        surface = "sand";
      }
    }

    for (let i = 0; i < KK.TOWNS.length; i++) {
      if (Math.hypot(gx - KK.TOWNS[i].x, gz - KK.TOWNS[i].z) < 86) { surface = "gravel"; break; }
    }

    return { height: h, surface, roadDist: road.dist, potholeDepth, mudDepth, waterDepth, waterSurfaceY, onBridge, bridgeHit, b };
  }

  toLocal(gx, gy, gz, outVec) {
    const v = outVec || new THREE.Vector3();
    v.set(gx - this.originX, gy, gz - this.originZ);
    return v;
  }

  checkFloatingOrigin(playerGx, playerGz) {
    const dx = playerGx - this.originX, dz = playerGz - this.originZ;
    if (Math.hypot(dx, dz) < 450) return null;
    const oldX = this.originX, oldZ = this.originZ;
    this.originX = Math.round(playerGx);
    this.originZ = Math.round(playerGz);
    this.rootGroup.position.set(-this.originX, 0, -this.originZ);
    return { dx: oldX - this.originX, dz: oldZ - this.originZ };
  }

  _buildTowns() {
    for (const town of KK.TOWNS) {
      const grp = new THREE.Group();
      const ty = this.getTerrainInfo(town.x, town.z, false).height;
      grp.position.set(town.x, ty, town.z);

      // v18.1 Place Zolotoy Metropolis Garage & Warehouse on the outer city perimeter edges instead of downtown center!
      const gX = town.isMetro ? 448 : 24, gZ = town.isMetro ? 0 : -18;
      const hangar = new THREE.Mesh(new THREE.BoxGeometry(16, 6.2, 12), this.matConcrete);
      hangar.position.set(gX, 3.1, gZ); hangar.castShadow = true; hangar.receiveShadow = true; grp.add(hangar);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(17.2, 0.7, 13.2), this.matRoof);
      roof.position.set(gX, 6.5, gZ); grp.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.6, 0.5), new THREE.MeshBasicMaterial({ color: 0x16181c }));
      door.position.set(gX, 2.3, gZ + 6.02); grp.add(door);
      const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.14, 10), this.matGaragePad);
      pad.position.set(gX, 0.08, gZ + 12.5); grp.add(pad);
      const gBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 16, 8), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.45 }));
      gBeacon.position.set(gX, 8, gZ + 12.5); grp.add(gBeacon);

      const dX = town.isMetro ? -448 : -22, dZ = town.isMetro ? 0 : -14;
      const dockBase = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 8), this.matWoodDark);
      dockBase.position.set(dX, 0.55, dZ); grp.add(dockBase);
      const dockCanopy = new THREE.Mesh(new THREE.BoxGeometry(15, 0.4, 9), this.matRustSteel);
      dockCanopy.position.set(dX, 4.6, dZ); grp.add(dockCanopy);

      const crateMat = new THREE.MeshStandardMaterial({ color: 0xa67438, roughness: 0.85 });
      for (let c = 0; c < 4; c++) {
        const cr = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), crateMat);
        cr.position.set(dX - 4.2 + c * 2.5, 1.65, dZ - 1.5); grp.add(cr);
      }
      const dPad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.14, 10), this.matDockPad);
      dPad.position.set(dX, 0.08, dZ + 10.5); grp.add(dPad);
      const dBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 22, 8), new THREE.MeshBasicMaterial({ color: 0x2de08b, transparent: true, opacity: 0.35 }));
      dBeacon.position.set(dX, 11, dZ + 10.5); grp.add(dBeacon);

      town.garageX = town.x + gX; town.garageZ = town.z + gZ + 12.5;
      town.dockX = town.x + dX;   town.dockZ = town.z + dZ + 10.5;
      town.y = ty;
      if (KK.SettlementBuilder) {
        KK.SettlementBuilder.decorateTown(town, grp, this.settlementAnims, this.townNightLights);
      }
      this.rootGroup.add(grp);
      this.townGroups.set(town.id, grp);
    }
  }

  updateSettlements(dt, isNight) {
    if (KK.SettlementBuilder) {
      KK.SettlementBuilder.updateAnimations(dt, isNight, this.settlementAnims, this.townNightLights);
    }
    if (this.lighthouses) {
      for (let i = 0; i < this.lighthouses.length; i++) {
        const lh = this.lighthouses[i];
        lh.beamPivot.visible = !!isNight;
        if (isNight) lh.beamPivot.rotation.y += dt * 0.72;
      }
    }
    if (this.gpFloodlights && this.gpFloodlights.length > 0) {
      for (let i = 0; i < this.gpFloodlights.length; i++) {
        const fl = this.gpFloodlights[i];
        if (fl.lampMat) fl.lampMat.emissiveIntensity = isNight ? 1.85 : 0.25;
        if (fl.glowCone) fl.glowCone.visible = !!isNight;
      }
    }
  }

  // ==========================================================================
  // BUILD ALL 7 LANDMARKS: CASTLE, TEMPLES, GIANT SAMOVAR, UFO, DUCK & RAMPS!
  // ==========================================================================
  _buildLandmarks() {
    const matDarkStone = new THREE.MeshStandardMaterial({ color: 0x30333a, roughness: 0.94 });
    const matSandstone = new THREE.MeshStandardMaterial({ color: 0xc2975e, roughness: 0.88 });
    const matGold = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.25, metalness: 0.85 });
    const matRedGlow = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
    const matGreenGlow = new THREE.MeshBasicMaterial({ color: 0x39ff14 });
    const matDuckYellow = new THREE.MeshStandardMaterial({ color: 0xffd919, roughness: 0.42 });
    const matDuckBeak = new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.5 });
    const matUfoMetal = new THREE.MeshStandardMaterial({ color: 0x6c7a89, roughness: 0.28, metalness: 0.78 });
    const matRampStripe = new THREE.MeshStandardMaterial({ color: 0xe6a800, roughness: 0.7 });

    for (const lm of KK.LANDMARKS) {
      const rawH = lm._baseH !== undefined ? lm._baseH : this.getBaseHeight(lm.x, lm.z);
      lm._baseH = rawH;

      const grp = new THREE.Group();
      grp.position.set(lm.x, rawH, lm.z);

      // Build Driveable Ramp visual wedge if landmark has a stunt ramp!
      if (lm.hasRamp) {
        const rGrp = new THREE.Group();
        rGrp.rotation.y = -lm.rampYaw;
        const sh = new THREE.Shape();
        sh.moveTo(-lm.rampLen * 0.5, 0);
        sh.lineTo(lm.rampLen * 0.5, 0);
        sh.lineTo(lm.rampLen * 0.5, lm.rampHeight);
        sh.closePath();
        const geo = new THREE.ExtrudeGeometry(sh, { depth: lm.rampWidth, bevelEnabled: false });
        geo.translate(0, 0, -lm.rampWidth * 0.5);
        const rMesh = new THREE.Mesh(geo, this.matConcrete);
        rMesh.castShadow = true; rMesh.receiveShadow = true;
        rGrp.add(rMesh);

        // Warning yellow side stripes along ramp edge
        for (const sz of [-lm.rampWidth * 0.48, lm.rampWidth * 0.48]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(lm.rampLen, 0.24, 0.24), matRampStripe);
          bar.position.set(0, lm.rampHeight * 0.5, sz);
          bar.rotation.z = Math.atan2(lm.rampHeight, lm.rampLen);
          rGrp.add(bar);
        }
        grp.add(rGrp);
      }

      if (lm.type === "castle") {
        // DREARY GOTHIC CASTLE RAVEN-KAMEN!
        for (const [wx, wz, sx, sz] of [
          [0, -16, 32, 2.6], [-16, 0, 2.6, 32], [16, 0, 2.6, 32],
          [-10.5, 16, 11, 2.6], [10.5, 16, 11, 2.6] // Front wall w/ open courtyard gate!
        ]) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, 11, sz), matDarkStone);
          wall.position.set(wx, 5.5, wz); wall.castShadow = true; grp.add(wall);
        }
        // 4 Tall Gothic Corner Towers + Conical Spires + Eerie Red Slit Windows
        for (const tx of [-16, 16]) {
          for (const tz of [-16, 16]) {
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 20, 8), matDarkStone);
            tower.position.set(tx, 10, tz); tower.castShadow = true; grp.add(tower);
            const spire = new THREE.Mesh(new THREE.ConeGeometry(4.0, 9, 8), this.matRoof);
            spire.position.set(tx, 24.5, tz); grp.add(spire);
            const slit = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.2, 0.45), matRedGlow);
            slit.position.set(tx, 14, tz + (tz > 0 ? 3.3 : -3.3)); grp.add(slit);
          }
        }
        // Central Dreary Keep + Golden Relic Chest
        const keep = new THREE.Mesh(new THREE.BoxGeometry(11, 18, 10), matDarkStone);
        keep.position.set(0, 9, -8); keep.castShadow = true; grp.add(keep);
        const chest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 1.2), matGold);
        chest.position.set(0, 0.7, 3); grp.add(chest);
      }
      else if (lm.type === "temple") {
        // SUNKEN GOLDEN TEMPLE OF THE SANDS (Stepped Ziggurat + Glowing Braziers + Cash Altar!)
        const tiers = [[28, 3.5, 28], [21, 3.5, 21], [14, 3.5, 14], [8, 4.0, 8]];
        let cy = 0;
        for (const [tw, th, td] of tiers) {
          const tier = new THREE.Mesh(new THREE.BoxGeometry(tw, th, td), matSandstone);
          tier.position.set(0, cy + th * 0.5, 0); tier.castShadow = true; grp.add(tier);
          cy += th;
        }
        // Golden Crown Shrine & Pillars
        const crown = new THREE.Mesh(new THREE.OctahedronGeometry(3.2, 0), matGold);
        crown.position.set(0, cy + 3.2, 0); grp.add(crown);
        for (const px of [-9, 9]) {
          const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 8.5, 8), matSandstone);
          pil.position.set(px, 4.25, 16); grp.add(pil);
          const flame = new THREE.Mesh(new THREE.SphereGeometry(0.85, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff8800 }));
          flame.position.set(px, 9.2, 16); grp.add(flame);
        }
        const vault = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 2.0), matGold);
        vault.position.set(0, 0.7, 16.5); grp.add(vault);
      }
      else if (lm.type === "samovar") {
        // SILLY GIANT GOLDEN SOVIET SAMOVAR + RUSTED BUS TO JUMP OVER!
        const ped = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 3.0, 10), this.matConcrete);
        ped.position.set(16, 1.5, -10); grp.add(ped);
        const urn = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 2.4, 8.5, 14), matGold);
        urn.position.set(16, 7.2, -10); urn.castShadow = true; grp.add(urn);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(3.1, 12, 8), matGold);
        lid.position.set(16, 11.4, -10); grp.add(lid);
        const chim = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 2.6, 10), matGold);
        chim.position.set(16, 14.5, -10); grp.add(chim);
        // Rusted Soviet Bus parked right past the ramp!
        const bus = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 9.2), this.matRustSteel);
        bus.position.set(14, 1.5, 8); bus.rotation.y = 0.8; bus.castShadow = true; grp.add(bus);
      }
      else if (lm.type === "duck") {
        // COLOSSAL 15M BRIGHT-YELLOW RUBBER DUCK!
        const dGrp = new THREE.Group();
        dGrp.position.set(14, 0, -14); dGrp.rotation.y = -0.6;
        const body = new THREE.Mesh(new THREE.SphereGeometry(5.8, 14, 12), matDuckYellow);
        body.scale.set(1.0, 0.78, 1.25); body.position.y = 4.2; body.castShadow = true; dGrp.add(body);
        const head = new THREE.Mesh(new THREE.SphereGeometry(3.6, 14, 12), matDuckYellow);
        head.position.set(0, 9.8, 4.2); head.castShadow = true; dGrp.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(1.7, 3.4, 8), matDuckBeak);
        beak.rotation.x = Math.PI / 2; beak.position.set(0, 9.2, 8.2); dGrp.add(beak);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (const ex of [-1.6, 1.6]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), eyeMat);
          eye.position.set(ex, 10.6, 7.1); dGrp.add(eye);
        }
        grp.add(dGrp);
      }
      else if (lm.type === "ufo") {
        // CRASHED ALIEN UFO SAUCER WITH GREEN TRACTOR BEAM!
        const uGrp = new THREE.Group();
        uGrp.position.set(0, 3.4, 0); uGrp.rotation.z = 0.32; uGrp.rotation.x = -0.18;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.5, 2.2, 18), matUfoMetal);
        disc.castShadow = true; uGrp.add(disc);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(4.2, 14, 10), matGreenGlow);
        dome.position.y = 1.4; uGrp.add(dome);
        grp.add(uGrp);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 5.5, 36, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x39ff14, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
        beam.position.set(0, 18, 0); grp.add(beam);
      }
      else if (lm.type === "shrine") {
        // HIGH ALPINE FROST TREASURY SHRINE
        const gateL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.0, 11, 8), matRedGlow);
        gateL.position.set(-5, 5.5, 6); grp.add(gateL);
        const gateR = gateL.clone(); gateR.position.x = 5; grp.add(gateR);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(14, 1.4, 1.8), matRedGlow);
        lintel.position.set(0, 11.2, 6); grp.add(lintel);
        const monolith = new THREE.Mesh(new THREE.ConeGeometry(4.5, 14, 6), matGold);
        monolith.position.set(0, 7, -4); grp.add(monolith);
      }
      else if (lm.type === "volcano") {
        // COLOSSAL SMOKING MT. VULKAN CONE + GLOWING LAVA LAKE + OBSIDIAN ARCH!
        const matLava = new THREE.MeshBasicMaterial({ color: 0xff4500 });
        const matBasalt = new THREE.MeshStandardMaterial({ color: 0x262226, roughness: 0.94 });
        // Huge volcano cone offset right behind the treasure rim so you can drive up to the caldera!
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(34, 96, 86, 16, 1, false), matBasalt);
        cone.position.set(-85, 38, 12); cone.castShadow = true; grp.add(cone);
        const lavaTop = new THREE.Mesh(new THREE.CircleGeometry(33, 16), matLava);
        lavaTop.rotation.x = -Math.PI / 2; lavaTop.position.set(-85, 81.5, 12); grp.add(lavaTop);
        // Glowing lava pool right next to the caldera treasure vault!
        const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(22, 16), matLava);
        lavaPool.rotation.x = -Math.PI / 2; lavaPool.position.set(-14, 0.35, -18); grp.add(lavaPool);
        // Jagged obsidian basalt pillars & golden obsidian treasure vault
        for (let p = 0; p < 6; p++) {
          const ang = (p / 6) * Math.PI * 2;
          const pil = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11 + (p % 3) * 4, 5), matBasalt);
          pil.position.set(Math.cos(ang) * 20, 5.5, Math.sin(ang) * 20); grp.add(pil);
        }
        const vault = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.6, 2.2), matGold);
        vault.position.set(0, 0.85, 0); grp.add(vault);
      }

      // Tall Gold Treasure Beacon Pillar (hidden once claimed!)
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 65, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.34 })
      );
      beacon.position.set(0, 32, 0);
      grp.add(beacon);

      this.rootGroup.add(grp);
      this.landmarkGroups.set(lm.id, { group: grp, beacon, data: lm });
    }
  }

  // Major Revamp of the Race Track (Krasny-Ring / Zolotoy International GP Circuit) & Hazard Signs!
  _buildTarmacDetails() {
    const matPillar = new THREE.MeshStandardMaterial({ color: 0xe6ebef, roughness: 0.48, metalness: 0.28 });
    const matSteel  = new THREE.MeshStandardMaterial({ color: 0x38414a, roughness: 0.45, metalness: 0.65 });
    const matBanner = new THREE.MeshStandardMaterial({ color: 0x0088cc, roughness: 0.42 });
    const matWarn   = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.60 });
    const matStand  = new THREE.MeshStandardMaterial({ color: 0x3b444e, roughness: 0.78 });
    const matConc   = new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.84 });
    const matRedGP  = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.44 });
    const matWhtGP  = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.48 });
    const matDarkGP = new THREE.MeshStandardMaterial({ color: 0x181c22, roughness: 0.78 });
    const matGlass  = new THREE.MeshStandardMaterial({ color: 0x2ec4e6, emissive: 0x0e5c73, emissiveIntensity: 0.72, roughness: 0.16, metalness: 0.72 });
    const matRedLit = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    const matCyanL  = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const matAmberL = new THREE.MeshBasicMaterial({ color: 0xffc83d });
    const matSeatCols = [
      new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0x219ebc, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0xf1faee, roughness: 0.65 }),
      new THREE.MeshStandardMaterial({ color: 0x2a9d8f, roughness: 0.65 })
    ];

    const makeBoardTex = (text, bg = "#f8fafc", fg = "#11161c", accent = "#d62828") => {
      const cv = document.createElement("canvas");
      cv.width = 256; cv.height = 128;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 128);
      ctx.fillStyle = accent; ctx.fillRect(0, 0, 256, 18); ctx.fillRect(0, 110, 256, 18);
      ctx.fillStyle = fg; ctx.font = "900 56px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(text, 128, 66);
      return new THREE.CanvasTexture(cv);
    };

    const brakeMats = {
      150: new THREE.MeshBasicMaterial({ map: makeBoardTex("150", "#ffffff", "#111111", "#e63946") }),
      100: new THREE.MeshBasicMaterial({ map: makeBoardTex("100", "#ffffff", "#111111", "#ffb703") }),
      50:  new THREE.MeshBasicMaterial({ map: makeBoardTex("50",  "#ffffff", "#111111", "#d62828") })
    };
    const sponsorMats = [
      new THREE.MeshBasicMaterial({ map: makeBoardTex("KRASNY-RING GP", "#141922", "#ffd166", "#e63946") }),
      new THREE.MeshBasicMaterial({ map: makeBoardTex("KUROGANE R-SPEC", "#121820", "#ffffff", "#ffb703") }),
      new THREE.MeshBasicMaterial({ map: makeBoardTex("VALKYRIE KEVLAR", "#1a1420", "#ff4d6d", "#00e5ff") }),
      new THREE.MeshBasicMaterial({ map: makeBoardTex("VOLGAWORKS", "#102430", "#9cf6ff", "#2de08b") })
    ];
    const startBannerMat = new THREE.MeshBasicMaterial({ map: makeBoardTex("KRASNY-RING GP", "#141820", "#ffffff", "#e63946") });

    this.gpFloodlights = [];
    const floodLampMat = new THREE.MeshStandardMaterial({ color: 0xfff3cc, emissive: 0xffd275, emissiveIntensity: 0.35, roughness: 0.25 });
    const floodConeMat = new THREE.MeshBasicMaterial({ color: 0xffe49e, transparent: true, opacity: 0.14, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });

    if (KK.SMOOTH_TARMAC_ZONES) {
      for (const tz of KK.SMOOTH_TARMAC_ZONES) {
        // Parent group aligned 100% identically to getSmoothTarmacInfo local coordinates!
        const tGrp = new THREE.Group();
        tGrp.position.set(tz.cx, tz._baseH || 10, tz.cz);
        tGrp.rotation.y = -tz.yaw;

        if (!tz.isGpCircuit) {
          const g = new THREE.Group();
          g.position.set(tz.rx, 0, 0);
          g.rotation.y = Math.PI * 0.5;
          for (const sx of [-9.5, 9.5]) {
            const p = new THREE.Mesh(new THREE.BoxGeometry(1.0, 9.5, 1.0), matPillar);
            p.position.set(sx, 4.75, 0); g.add(p);
          }
          const top = new THREE.Mesh(new THREE.BoxGeometry(21.2, 2.2, 1.4), matBanner);
          top.position.set(0, 9.2, 0); g.add(top);
          tGrp.add(g);
          this.rootGroup.add(tGrp);
          continue;
        }

        const gp = this.gpCircuits ? this.gpCircuits.find((x) => x.zone === tz) : null;
        const halfT = (tz.trackWidth || 20.0) * 0.5;

        // 1. ILLUMINATED START/FINISH GANTRY ALIGNED TO EXACT SPLINE CENTERLINE & TANGENT!
        let sfX = -260, sfZ = -524, sfRotY = 0;
        let sfTx = 1, sfTz = 0, sfNx = 0, sfNz = 1;
        if (gp && gp.samples && gp.samples.length > 8) {
          const pPrev = gp.samples[5], pMid = gp.samples[6], pNext = gp.samples[7];
          sfX = pMid[0];
          sfZ = pMid[1];
          const dtx = pNext[0] - pPrev[0], dtz = pNext[1] - pPrev[1];
          const tLen = Math.hypot(dtx, dtz) || 1;
          sfTx = dtx / tLen;
          sfTz = dtz / tLen;
          // Outward perpendicular right-hand normal in local (lx, lz)
          sfNx = -sfTz;
          sfNz = sfTx;
          // Local +X points along (sfTx, sfTz): Three.js rotation.y maps (+1,0,0) -> (cosR, 0, -sinR)
          sfRotY = Math.atan2(-sfTz, sfTx);
        }
        // Export EXACT world coordinates & heading of Start/Finish Line onto tz for lap timer & warp!
        {
          const cw = Math.cos(tz.yaw || 0), sw = Math.sin(tz.yaw || 0);
          tz.startX = tz.cx + sfX * cw - sfZ * sw;
          tz.startZ = tz.cz + sfX * sw + sfZ * cw;
          const wDirX = sfTx * cw - sfTz * sw;
          const wDirZ = sfTx * sw + sfTz * cw;
          tz.startDirX = wDirX;
          tz.startDirZ = wDirZ;
          tz.startYaw = Math.atan2(wDirX, wDirZ);
        }

        const sfGrp = new THREE.Group();
        sfGrp.position.set(sfX, 0, sfZ);
        sfGrp.rotation.y = sfRotY;
        const span = halfT + 4.8; // Strictly outside track width + kerbs (zero obstruction!)
        for (const sz of [-span, span]) {
          const pil = new THREE.Mesh(new THREE.BoxGeometry(1.4, 11.2, 1.4), matPillar);
          pil.position.set(0, 5.6, sz); sfGrp.add(pil);
          const brace = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.0, 1.8), matSteel);
          brace.position.set(0, 0.5, sz); sfGrp.add(brace);
        }
        const trussTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, span * 2 + 2.6), [
          startBannerMat, startBannerMat, matRedGP, matDarkGP, matRedGP, matRedGP
        ]);
        trussTop.position.set(0, 10.6, 0); sfGrp.add(trussTop);
        const topCyanBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, span * 2 + 2.0), matCyanL);
        topCyanBar.position.set(0, 12.0, 0); sfGrp.add(topCyanBar);

        // 5 Glowing Red GP Start Light Pods suspended cleanly above the starting grid!
        for (let li = 0; li < 5; li++) {
          const lzPod = -6.4 + li * 3.2;
          const pod = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.75, 1.05), matDarkGP);
          pod.position.set(0, 8.2, lzPod); sfGrp.add(pod);
          for (const ly of [7.75, 8.55]) {
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), matRedLit);
            bulb.position.set(-0.46, ly, lzPod); sfGrp.add(bulb);
            const bulbBack = new THREE.Mesh(new THREE.SphereGeometry(0.24, 6, 6), matRedLit);
            bulbBack.position.set(0.46, ly, lzPod); sfGrp.add(bulbBack);
          }
        }
        // Checkered Start/Finish Line Strip painted flush across exact track width
        for (let ci = 0; ci < 10; ci++) {
          for (let cj = 0; cj < 2; cj++) {
            const sq = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.04, 1.9), (ci + cj) % 2 === 0 ? matWhtGP : matDarkGP);
            sq.position.set(-0.55 + cj * 1.1, 0.03, -9.0 + ci * 2.0);
            sfGrp.add(sq);
          }
        }
        tGrp.add(sfGrp);

        // 2. MULTI-TIER COVERED SPECTATOR GRANDSTANDS WITH COLORFUL SEATING ROWS!
        const addGrandstand = (gxL, gzL, rotY, lenG, tiers = 6) => {
          const gs = new THREE.Group();
          gs.position.set(gxL, 0, gzL);
          gs.rotation.y = rotY;
          // Rear wall & concrete substructure
          const backW = new THREE.Mesh(new THREE.BoxGeometry(lenG, tiers * 1.55 + 3.5, 1.2), matStand);
          backW.position.set(0, (tiers * 1.55 + 3.5) * 0.5, -tiers * 2.2 - 1.5);
          gs.add(backW);
          for (let ti = 0; ti < tiers; ti++) {
            const stepY = 0.8 + ti * 1.45;
            const stepZ = -2.0 - ti * 2.2;
            const deck = new THREE.Mesh(new THREE.BoxGeometry(lenG, 1.35, 2.3), matConc);
            deck.position.set(0, stepY, stepZ); gs.add(deck);
            const seatRow = new THREE.Mesh(new THREE.BoxGeometry(lenG - 2.0, 0.55, 0.95), matSeatCols[ti % matSeatCols.length]);
            seatRow.position.set(0, stepY + 0.85, stepZ - 0.35); gs.add(seatRow);
          }
          // Cantilevered steel canopy roof & glowing edge trim
          const roofH = tiers * 1.55 + 5.2;
          const roof = new THREE.Mesh(new THREE.BoxGeometry(lenG + 2.5, 0.55, tiers * 2.4 + 4.0), matWhtGP);
          roof.position.set(0, roofH, -tiers * 1.15 - 1.0);
          roof.rotation.x = 0.08;
          gs.add(roof);
          const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(lenG + 2.6, 0.32, 0.45), matRedGP);
          roofTrim.position.set(0, roofH + 0.4, 0.8); gs.add(roofTrim);
          for (let px = -lenG * 0.45; px <= lenG * 0.46; px += Math.max(16, lenG / 5)) {
            const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, roofH, 0.65), matSteel);
            col.position.set(px, roofH * 0.5, -tiers * 2.2 - 1.0); gs.add(col);
          }
          tGrp.add(gs);
        };
        // Place grandstands & pit garages strictly OUTSIDE the spline track width (zero track intrusion!)
        const gsOut = halfT + 14.0;
        addGrandstand(sfX - sfTx * 75 - sfNx * gsOut, sfZ - sfTz * 75 - sfNz * gsOut, sfRotY, 125, 6);
        addGrandstand(sfX + sfTx * 95 - sfNx * gsOut, sfZ + sfTz * 95 - sfNz * gsOut, sfRotY, 115, 6);
        addGrandstand(420, -562, -0.14, 92, 5);

        // 3. DETAILED PIT-LANE GARAGES, GLOWING PIT WALL & RACE-CONTROL TOWER!
        const pitGrp = new THREE.Group();
        const pitIn = halfT + 26.0;
        pitGrp.position.set(sfX + sfTx * 30 + sfNx * pitIn, 0, sfZ + sfTz * 30 + sfNz * pitIn);
        pitGrp.rotation.y = sfRotY;
        // Glowing Pit Wall separating track from pit lane
        const pitWall = new THREE.Mesh(new THREE.BoxGeometry(156, 1.15, 0.75), matConc);
        pitWall.position.set(0, 0.58, -11.5); pitGrp.add(pitWall);
        const pitStrip = new THREE.Mesh(new THREE.BoxGeometry(156, 0.18, 0.82), matAmberL);
        pitStrip.position.set(0, 1.05, -11.5); pitGrp.add(pitStrip);
        for (let pi = -3; pi <= 3; pi++) {
          const stand = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.6, 1.8), matSteel);
          stand.position.set(pi * 22, 1.9, -10.2); pitGrp.add(stand);
          const scr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.2), matCyanL);
          scr.position.set(pi * 22, 2.5, -11.15); pitGrp.add(scr);
        }
        // 8 Detailed Pit-Lane Garage Bays with VIP Paddock Deck!
        const pitMain = new THREE.Mesh(new THREE.BoxGeometry(144, 7.2, 16), matStand);
        pitMain.position.set(0, 3.6, 4.0); pitMain.castShadow = true; pitGrp.add(pitMain);
        const pitFascia = new THREE.Mesh(new THREE.BoxGeometry(144.8, 1.25, 16.8), matRedGP);
        pitFascia.position.set(0, 7.4, 4.0); pitGrp.add(pitFascia);
        const pitAwning = new THREE.Mesh(new THREE.BoxGeometry(144, 0.32, 5.2), matWhtGP);
        pitAwning.position.set(0, 4.8, -6.2); pitGrp.add(pitAwning);
        for (let b = 0; b < 8; b++) {
          const bx = -63 + b * 18;
          const bayDoor = new THREE.Mesh(new THREE.BoxGeometry(11.5, 4.2, 0.45), matDarkGP);
          bayDoor.position.set(bx, 2.1, -4.05); pitGrp.add(bayDoor);
          const bayLight = new THREE.Mesh(new THREE.BoxGeometry(9.5, 0.22, 0.35), matCyanL);
          bayLight.position.set(bx, 4.45, -4.15); pitGrp.add(bayLight);
        }
        // Multi-Story Glass Race-Control Tower!
        const rcBase = new THREE.Mesh(new THREE.BoxGeometry(15, 16, 13), matConc);
        rcBase.position.set(-82, 8, 4.0); rcBase.castShadow = true; pitGrp.add(rcBase);
        const rcDeck = new THREE.Mesh(new THREE.BoxGeometry(19, 4.4, 16), matGlass);
        rcDeck.position.set(-82, 17.8, 2.5); pitGrp.add(rcDeck);
        const rcRoof = new THREE.Mesh(new THREE.BoxGeometry(20.5, 0.9, 17.2), matRedGP);
        rcRoof.position.set(-82, 20.4, 2.5); pitGrp.add(rcRoof);
        const rcSign = new THREE.Mesh(new THREE.BoxGeometry(16, 2.4, 0.6), startBannerMat);
        rcSign.position.set(-82, 22.1, -5.8); pitGrp.add(rcSign);
        const rcMast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 8.5, 6), matSteel);
        rcMast.position.set(-82, 25.0, 2.5); pitGrp.add(rcMast);
        // v18.1 FUNCTIONAL GP CIRCUIT PADDOCK GARAGE & CAR WASH PAD (Change, Tune, Repair & Wash right at the track!)
        const gpGarPad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 12), this.matGaragePad);
        gpGarPad.position.set(0, 0.10, -7.2); pitGrp.add(gpGarPad);
        const gpGarBeacon = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 20, 8), new THREE.MeshBasicMaterial({ color: 0xffcc00, transparent: true, opacity: 0.48 }));
        gpGarBeacon.position.set(0, 10.0, -7.2); pitGrp.add(gpGarBeacon);
        tGrp.add(pitGrp);
        {
          // Compute exact world coordinates of the GP Paddock Garage & Car Wash Bay
          const cwG = Math.cos(tz.yaw || 0), swG = Math.sin(tz.yaw || 0);
          const pLocX = (sfX + sfTx * 30 + sfNx * pitIn) - sfNx * 7.2;
          const pLocZ = (sfZ + sfTz * 30 + sfNz * pitIn) - sfNz * 7.2;
          this.gpGaragePos = {
            x: tz.cx + pLocX * cwG - pLocZ * swG,
            z: tz.cz + pLocX * swG + pLocZ * cwG,
            name: "Zolotoy GP Paddock Garage & Car Wash"
          };
        }

        // 4. INSTANCED RED/WHITE CORNER TIRE-STACK BARRIERS + TRACKSIDE TREES + SPONSOR BANNERS + BRAKING BOARDS!
        if (gp && gp.samples && gp.samples.length > 10) {
          const S = gp.samples;
          const N = S.length;
          const redTireMats = [], whtTireMats = [];
          const treeTrunkMats = [], treeCanopyMats = [];
          const _td = new THREE.Object3D();

          for (let i = 0; i < N; i++) {
            const pPrev = S[(i - 1 + N) % N], pCur = S[i], pNext = S[(i + 1) % N];
            const v1x = pCur[0] - pPrev[0], v1z = pCur[1] - pPrev[1];
            const v2x = pNext[0] - pCur[0], v2z = pNext[1] - pCur[1];
            const l1 = Math.hypot(v1x, v1z) || 1, l2 = Math.hypot(v2x, v2z) || 1;
            const u1x = v1x / l1, u1z = v1z / l1;
            const u2x = v2x / l2, u2z = v2z / l2;
            const cross = u1x * u2z - u1z * u2x; // Curvature sign & magnitude!
            const tx = (u1x + u2x) * 0.5, tzV = (u1z + u2z) * 0.5;
            const tl = Math.hypot(tx, tzV) || 1;
            const utx = tx / tl, utz = tzV / tl;
            const nx = -utz, nz = utx;

            // Place red/white stacked tire barriers along key corners (high curvature outer runoff!)
            if (Math.abs(cross) > 0.065) {
              const outSign = cross > 0 ? -1 : 1;
              const off = halfT + 5.6;
              for (let sub = -1; sub <= 1; sub++) {
                const bx = pCur[0] + nx * outSign * off + utx * sub * 2.1;
                const bz = pCur[1] + nz * outSign * off + utz * sub * 2.1;
                _td.position.set(bx, 0.72, bz);
                _td.rotation.set(0, 0, 0);
                _td.scale.set(1, 1, 1);
                _td.updateMatrix();
                if (((i * 3 + sub) & 1) === 0) redTireMats.push(_td.matrix.clone());
                else whtTireMats.push(_td.matrix.clone());
              }
            }

            // Crisp trackside savanna acacia trees outside the circuit perimeter (safe from track & grandstands!)
            if (i % 3 === 0) {
              for (const side of [-1, 1]) {
                const trOff = halfT + 28 + (i % 4) * 5;
                const trx = pCur[0] + nx * side * trOff;
                const trz = pCur[1] + nz * side * trOff;
                // Keep clear of main straight grandstands & pit complex
                if (trx > -430 && trx < 460 && trz > -570 && trz < -420) continue;
                const sc = 0.95 + ((i * 7) % 5) * 0.14;
                _td.position.set(trx, 2.0 * sc, trz);
                _td.rotation.set(0, i * 0.8, 0);
                _td.scale.set(1.1 * sc, 1.45 * sc, 1.1 * sc);
                _td.updateMatrix();
                treeTrunkMats.push(_td.matrix.clone());
                _td.position.set(trx, 4.3 * sc, trz);
                _td.scale.set(sc, sc, sc);
                _td.updateMatrix();
                treeCanopyMats.push(_td.matrix.clone());
              }
            }

            // Sponsor Banners along straights & key turn exits!
            if (i % 14 === 4) {
              const sOff = halfT + 8.5;
              const sx = pCur[0] + nx * sOff, sz = pCur[1] + nz * sOff;
              if (!(sx > -420 && sx < 120 && sz > -560 && sz < -440)) {
                const sb = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.4, 0.45), sponsorMats[(i / 14 | 0) % sponsorMats.length]);
                sb.position.set(sx, 1.35, sz);
                sb.rotation.y = Math.atan2(utx, utz) + Math.PI * 0.5;
                tGrp.add(sb);
              }
            }
          }

          const geoTire = new THREE.CylinderGeometry(0.95, 0.95, 1.42, 10);
          if (redTireMats.length > 0) {
            const imR = new THREE.InstancedMesh(geoTire, matRedGP, redTireMats.length);
            for (let k = 0; k < redTireMats.length; k++) imR.setMatrixAt(k, redTireMats[k]);
            imR.instanceMatrix.needsUpdate = true;
            tGrp.add(imR);
          }
          if (whtTireMats.length > 0) {
            const imW = new THREE.InstancedMesh(geoTire, matWhtGP, whtTireMats.length);
            for (let k = 0; k < whtTireMats.length; k++) imW.setMatrixAt(k, whtTireMats[k]);
            imW.instanceMatrix.needsUpdate = true;
            tGrp.add(imW);
          }
          if (treeTrunkMats.length > 0) {
            const imT = new THREE.InstancedMesh(this.geoPalmSeg, this.matAcaciaBark, treeTrunkMats.length);
            for (let k = 0; k < treeTrunkMats.length; k++) imT.setMatrixAt(k, treeTrunkMats[k]);
            imT.instanceMatrix.needsUpdate = true;
            tGrp.add(imT);
            const imC = new THREE.InstancedMesh(this.geoAcaciaCanopy, this.matAcaciaLeaf, treeCanopyMats.length);
            for (let k = 0; k < treeCanopyMats.length; k++) imC.setMatrixAt(k, treeCanopyMats[k]);
            imC.instanceMatrix.needsUpdate = true;
            tGrp.add(imC);
          }
        }

        // 5. 150m / 100m / 50m BRAKING MARKER BOARDS AT HEAVY-BRAKING ZONES!
        const addBrakingSet = (endX, endZ, dirX, dirZ, sideSign) => {
          const nx = -dirZ * sideSign, nz = dirX * sideSign;
          const rotY = Math.atan2(-dirX, -dirZ);
          for (const distM of [150, 100, 50]) {
            const bx = endX - dirX * distM + nx * (halfT + 3.8);
            const bz = endZ - dirZ * distM + nz * (halfT + 3.8);
            const bg = new THREE.Group();
            bg.position.set(bx, 0, bz);
            bg.rotation.y = rotY;
            const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 2.2, 6), matSteel);
            post.position.y = 1.1; bg.add(post);
            const brd = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.35, 0.16), brakeMats[distM]);
            brd.position.y = 2.05; bg.add(brd);
            tGrp.add(bg);
          }
        };
        // Main straight braking zone approaching Turn 1 (+X direction toward [380, -520])
        addBrakingSet(380, -518, 1, 0, -1);
        // Back-straight braking zone approaching south hairpin
        addBrakingSet(510, 565, 0.65, 0.76, 1);

        // 6. 12 TALL STADIUM FLOODLIGHT TOWERS (Lit Warmly at Night via updateSettlements!)
        const floodPos = [
          [-460, -540], [-260, -540], [-60, -540], [180, -540], [420, -520],
          [-260, -440], [80, -440], [960, -280], [960, 120],
          [480, 580], [-380, 520], [-980, -140]
        ];
        const geoFloodMast = new THREE.CylinderGeometry(0.32, 0.72, 26, 8);
        const geoFloodHead = new THREE.BoxGeometry(7.2, 2.2, 1.1);
        const geoFloodCone = new THREE.ConeGeometry(16, 28, 10, 1, true);
        for (const [fx, fz] of floodPos) {
          const fg = new THREE.Group();
          fg.position.set(fx, 0, fz);
          fg.rotation.y = Math.atan2(-fx, -fz);
          const mast = new THREE.Mesh(geoFloodMast, matSteel);
          mast.position.y = 13.0; fg.add(mast);
          const head = new THREE.Mesh(geoFloodHead, floodLampMat);
          head.position.set(0, 26.2, 0.8);
          head.rotation.x = 0.42;
          fg.add(head);
          const glowCone = new THREE.Mesh(geoFloodCone, floodConeMat);
          glowCone.position.set(0, 14.5, 6.2);
          glowCone.rotation.x = -0.36;
          glowCone.visible = false;
          fg.add(glowCone);
          tGrp.add(fg);
          this.gpFloodlights.push({ lampMat: floodLampMat, glowCone });
        }

        this.rootGroup.add(tGrp);
      }
    }

    if (KK.BAD_ROAD_ZONES) {
      for (const bz of KK.BAD_ROAD_ZONES) {
        const g = new THREE.Group();
        const by = this.getTerrainInfo(bz.x, bz.z, false).height;
        g.position.set(bz.x, by, bz.z);
        // Scattered tilted broken concrete road slabs in the Shattered Hell-Road!
        for (let i = 0; i < 16; i++) {
          const ang = (i / 16) * Math.PI * 2;
          const r = 35 + (i % 5) * 95;
          const sx = Math.cos(ang) * r, sz = Math.sin(ang) * r;
          const sy = this.getTerrainInfo(bz.x + sx, bz.z + sz, false).height - by;
          const slab = new THREE.Mesh(this.geoBrokenSlab, this.matBrokenSlab);
          slab.position.set(sx, sy + 0.08, sz);
          slab.rotation.set((i % 3 - 1) * 0.22, ang, ((i + 1) % 3 - 1) * 0.18);
          g.add(slab);
        }
        // Tall amber warning beacon marking the Bad Road Zone
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 24, 6), matWarn);
        bcn.position.set(0, 12, 0); g.add(bcn);
        this.rootGroup.add(g);
      }
    }
  }

  // Flatten a clean level Soviet military compound pad at the secret border coordinates!
  _disposeChunkGroup(chunkObj) {
    if (!chunkObj || !chunkObj.group) return;
    this.rootGroup.remove(chunkObj.group);
    if (chunkObj.group.children) {
      for (let i = 0; i < chunkObj.group.children.length; i++) {
        const ch = chunkObj.group.children[i];
        if (ch && ch.isInstancedMesh && typeof ch.dispose === "function") ch.dispose();
      }
    }
    if (chunkObj.mesh && chunkObj.mesh.geometry) {
      if (this._chunkGeoPool && this._chunkGeoPool.length < 32) {
        this._chunkGeoPool.push(chunkObj.mesh.geometry);
      } else {
        chunkObj.mesh.geometry.dispose();
      }
    }
    if (chunkObj.colliders) {
      for (const col of chunkObj.colliders) { if (col.id) this.treeMeshMap.delete(col.id); }
    }
    if (chunkObj.fences) {
      for (const fn of chunkObj.fences) { if (fn.id) this.fenceMeshMap.delete(fn.id); }
    }
  }

  _rebuildActiveChunkLists() {
    this.winchTrees = [];
    this.activeColliders = [];
    this.activeFences = [];
    for (const chunk of this.chunks.values()) {
      for (const tr of chunk.trees) this.winchTrees.push(tr);
      for (const col of chunk.colliders) this.activeColliders.push(col);
      if (chunk.fences) { for (const fn of chunk.fences) if (!fn.broken) this.activeFences.push(fn); }
    }
  }

  _storeChunk(cx, cz, key, chunk) {
    const intKey = (cx + 32768) * 65536 + (cz + 32768);
    chunk._intKey = intKey;
    this.chunks.set(key, chunk);
    this._chunkIntMap.set(intKey, chunk);
  }

  _removeChunk(key, chunk) {
    this.chunks.delete(key);
    if (chunk && chunk._intKey !== undefined) {
      this._chunkIntMap.delete(chunk._intKey);
    }
  }

  _invalidateChunksNear(gx, gz, padRadius = 40) {
    const minCx = Math.floor((gx - padRadius) / KK.CHUNK_SIZE);
    const maxCx = Math.floor((gx + padRadius) / KK.CHUNK_SIZE);
    const minCz = Math.floor((gz - padRadius) / KK.CHUNK_SIZE);
    const maxCz = Math.floor((gz + padRadius) / KK.CHUNK_SIZE);
    let rebuiltAny = false;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = `${cx},${cz}`;
        const old = this.chunks.get(key);
        if (old) {
          // Dispose old chunk & IMMEDIATELY rebuild in-place so terrain NEVER disappears!
          this._disposeChunkGroup(old);
          this._removeChunk(key, old);
          this._storeChunk(cx, cz, key, this._createChunk(cx, cz));
          rebuiltAny = true;
        }
      }
    }
    if (rebuiltAny) this._rebuildActiveChunkLists();
  }

  setSecretCampPad(campKey, gx, gz) {
    let sum = this._computeNaturalGroundHeight(gx, gz) * 2.0, wt = 2.0;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      sum += this._computeNaturalGroundHeight(gx + Math.cos(a) * 38, gz + Math.sin(a) * 38);
      wt += 1.0;
    }
    let avgH = sum / wt;
    const rc = this.getRiverChannel(gx, gz);
    if (rc.seg && rc.dist < 140) avgH = Math.max(avgH, rc.waterY + 2.8);
    const pad = { x: gx, z: gz, baseH: avgH, radius: 42 };
    this.secretPads[campKey] = pad;
    if (campKey === "t72") this.milCampPad = pad;
    this._invalidateChunksNear(gx, gz, 85);
  }

  setMilCampLocation(gx, gz) { this.setSecretCampPad("t72", gx, gz); }

  // PERMANENT TERRAIN BLAST CRATER DEFORMATION (Carves heightfield + scorched mesh immediately!)
  addCrater(gx, gz, radius = 6.0, depth = 1.8) {
    // Don't carve inside town garages/docks or bridges
    for (const tw of KK.TOWNS) if (Math.hypot(gx - tw.x, gz - tw.z) < 95) return false;
    for (const br of KK.BRIDGES) if (Math.hypot(gx - br.x, gz - br.z) < 42) return false;
    this.craters.push({ x: gx, z: gz, r: radius, d: depth });
    if (this.craters.length > 120) this.craters.shift();
    this._invalidateChunksNear(gx, gz, radius + 12);
    return true;
  }

  _getCraterOffsetInto(gx, gz, out) {
    let off = 0, scorch = 0;
    for (let i = 0; i < this.craters.length; i++) {
      const c = this.craters[i];
      const dx = gx - c.x, dz = gz - c.z;
      const lim = c.r * 1.42;
      if (dx > lim || dx < -lim || dz > lim || dz < -lim) continue;
      const dist = Math.hypot(dx, dz);
      if (dist < c.r) {
        const u = dist / c.r;
        // Deep parabolic blast bowl!
        off -= c.d * (1.0 - u * u);
        scorch = Math.max(scorch, 1.0 - u * 0.75);
      } else if (dist < lim) {
        // Raised dirt ejecta rim berm!
        const u = (dist - c.r) / (c.r * 0.42);
        off += c.d * 0.24 * Math.sin(u * Math.PI);
        scorch = Math.max(scorch, (1.0 - u) * 0.35);
      }
    }
    out.off = off; out.scorch = scorch;
    return out;
  }

  getCraterOffset(gx, gz) {
    return this._getCraterOffsetInto(gx, gz, { off: 0, scorch: 0 });
  }

  hideLandmarkBeacon(lmId) {
    const obj = this.landmarkGroups.get(lmId);
    if (obj && obj.beacon) obj.beacon.visible = false;
  }

  _buildBridges() {
    // Clear any previously built bridges (supports live LAN seed re-sync!)
    for (const bObj of this.bridgeMeshes.values()) {
      this.rootGroup.remove(bObj.group);
    }
    this.bridgeMeshes.clear();

    const matBarrierRed = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.72 });
    const matBarrierWht = new THREE.MeshStandardMaterial({ color: 0xe6ebef, roughness: 0.75 });
    const matDarkSteel  = new THREE.MeshStandardMaterial({ color: 0x363d44, roughness: 0.58, metalness: 0.62 });
    const matDeckSteel  = new THREE.MeshStandardMaterial({ color: 0x4b535c, roughness: 0.75, metalness: 0.45 });
    const matAsphalt    = new THREE.MeshStandardMaterial({ color: 0x3b3f44, roughness: 0.90 });
    const matHeavyLog   = new THREE.MeshStandardMaterial({ color: 0x5c3c22, roughness: 0.93 });

    for (let bIdx = 0; bIdx < KK.BRIDGES.length; bIdx++) {
      const br = KK.BRIDGES[bIdx];
      const rngStats = this.getBridgeRngStats(br, bIdx);
      br.effectiveMaxMassKg = rngStats.maxKg;
      br.conditionLabel = rngStats.cond;

      const halfL = br.length * 0.5;
      const halfW = br.width * 0.5;
      const cosY = Math.cos(br.yaw), sinY = Math.sin(br.yaw);

      // Sample natural river bank heights just beyond each bridge abutment!
      const endAX = br.x - cosY * (halfL + 12), endAZ = br.z - sinY * (halfL + 12);
      const endBX = br.x + cosY * (halfL + 12), endBZ = br.z + sinY * (halfL + 12);

      // Guarantee deck clears river surface cleanly!
      const rcMid = this.getRiverChannel(br.x, br.z);
      const minClearY = rcMid.seg ? (rcMid.waterY + 2.65) : -9999;
      const startY = Math.max(this.getBaseHeight(endAX, endAZ), minClearY);
      const endY   = Math.max(this.getBaseHeight(endBX, endBZ), minClearY);
      const midY   = (startY + endY) * 0.5;
      const slopePitch = Math.atan2(endY - startY, br.length);
      const slopeScale = 1.0 / Math.max(0.75, Math.cos(slopePitch)); // Compensates cos(pitch) so bridge spans EXACTLY -halfL..+halfL!

      const grp = new THREE.Group();
      grp.position.set(br.x, midY, br.z);
      grp.rotation.order = "YXZ";
      grp.rotation.y = -br.yaw;

      // Inner deck subgroup tilted to EXACT slope from startY (-halfL) to endY (+halfL)!
      const deckGrp = new THREE.Group();
      deckGrp.rotation.z = slopePitch;
      deckGrp.scale.x = slopeScale;
      grp.add(deckGrp);

      // 1. SOLID CONCRETE/STONE APPROACH ABUTMENTS EMBEDDED INTO BOTH BANKS (Zero visual gaps!)
      const abutMat = (br.style === "rickety_wood" || br.style === "timber_wellmade") ? this.matConcrete : this.matConcrete;
      for (const sideSign of [-1, 1]) {
        const ax = sideSign * (halfL + 4.0);
        const abBlock = new THREE.Mesh(new THREE.BoxGeometry(11.5, 10.0, br.width + 3.0), abutMat);
        abBlock.position.set(ax, -5.02, 0);
        abBlock.receiveShadow = true;
        deckGrp.add(abBlock);
        // Flush flat concrete approach slab extending 8m onto the graded bank road!
        const apron = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.36, br.width + 0.8), matAsphalt);
        apron.position.set(sideSign * (halfL + 3.8), -0.18, 0);
        apron.receiveShadow = true;
        deckGrp.add(apron);

        // Concrete wing-walls flaring into the river banks!
        for (const wz of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(8.5, 4.5, 0.7), abutMat);
          wing.position.set(sideSign * (halfL + 5.8), -1.6, wz * (halfW + 1.4));
          wing.rotation.y = -sideSign * wz * 0.25;
          deckGrp.add(wing);
        }

        // 3D Roadside Bridge Weight-Limit & Condition Signboard at BOTH entrances!
        if (KK.SettlementBuilder) {
          const tons = (rngStats.maxKg / 1000).toFixed(1);
          const signTex = KK.SettlementBuilder.createBridgeSignTexture(
            br.name, rngStats.tDef.label, tons, rngStats.cond, rngStats.accent
          );
          const signMat = new THREE.MeshBasicMaterial({ map: signTex });
          const sGrp = new THREE.Group();
          sGrp.position.set(sideSign * (halfL + 6.5), 0, -sideSign * (halfW + 2.0));
          sGrp.rotation.y = sideSign > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 3.6, 6), matDarkSteel);
          post.position.y = 1.8; sGrp.add(post);
          const board = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.25, 0.14), [
            matDarkSteel, matDarkSteel, matDarkSteel, matDarkSteel, signMat, signMat
          ]);
          board.position.y = 3.2; sGrp.add(board);
          deckGrp.add(sGrp);
        }
      }

      // 2. SUPPORT PIERS / PILINGS GOING DEEP INTO THE RIVERBED
      const pierCount = Math.max(4, Math.floor(br.length / 24));
      const pilingMat = br.style === "concrete" ? this.matConcrete : (br.style === "steel_truss" ? matDarkSteel : this.matWoodDark);
      for (let pi = 0; pi < pierCount; pi++) {
        const px = -halfL * 0.82 + (pi / Math.max(1, pierCount - 1)) * (br.length * 0.82);
        const pierH = br.ravineDepth + 18;
        if (br.style === "concrete") {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(2.2, pierH, br.width * 0.88), this.matConcrete);
          pier.position.set(px, -pierH * 0.5 - 0.5, 0);
          deckGrp.add(pier);
        } else {
          for (const pz of [-halfW * 0.78, halfW * 0.78]) {
            const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.44, pierH, 6), pilingMat);
            pil.position.set(px, -pierH * 0.5 - 0.3, pz);
            deckGrp.add(pil);
          }
        }
      }

      // 3. STYLE-SPECIFIC SUPERSTRUCTURE & RAILINGS
      const beamMat = br.style === "concrete" ? this.matConcrete : (br.style === "steel_truss" ? matDarkSteel : (br.style === "timber_wellmade" ? matHeavyLog : this.matWoodDark));
      const beamGeo = new THREE.BoxGeometry(br.length + 4, br.style === "concrete" ? 0.85 : 0.55, br.style === "concrete" ? 0.8 : 0.45);
      for (const side of [-1, 1]) {
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.set(0, br.style === "concrete" ? -0.45 : -0.35, side * (halfW * 0.85));
        deckGrp.add(beam);
      }

      if (br.style === "concrete") {
        // Heavy Concrete Jersey Barriers with Red/White Reflective Hazard Stripes!
        const segCount = 12;
        const segL = br.length / segCount;
        for (let i = 0; i < segCount; i++) {
          const sx = -halfL + (i + 0.5) * segL;
          for (const side of [-1, 1]) {
            const curb = new THREE.Mesh(new THREE.BoxGeometry(segL * 0.96, 0.95, 0.42), (i % 2 === 0) ? matBarrierWht : matBarrierRed);
            curb.position.set(sx, 0.48, side * (halfW + 0.16));
            deckGrp.add(curb);
          }
        }
      } else if (br.style === "steel_truss") {
        // Tall Bolted Steel Truss Cage with Diagonal Braces & Overhead Beams!
        const bays = 8;
        const bayL = br.length / bays;
        for (let i = 0; i <= bays; i++) {
          const tx = -halfL + i * bayL;
          for (const side of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.32, 5.2, 0.32), matDarkSteel);
            post.position.set(tx, 2.6, side * (halfW + 0.18));
            deckGrp.add(post);
          }
          const topCross = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, br.width + 0.6), matDarkSteel);
          topCross.position.set(tx, 5.15, 0);
          deckGrp.add(topCross);
        }
        for (const side of [-1, 1]) {
          const topChord = new THREE.Mesh(new THREE.BoxGeometry(br.length, 0.32, 0.32), matDarkSteel);
          topChord.position.set(0, 5.15, side * (halfW + 0.18));
          deckGrp.add(topChord);
          const lowGuard = new THREE.Mesh(new THREE.BoxGeometry(br.length, 0.32, 0.18), this.matRustSteel);
          lowGuard.position.set(0, 0.85, side * (halfW + 0.14));
          deckGrp.add(lowGuard);
        }
      } else if (br.style === "timber_wellmade") {
        // Stout Heavy Timber Guardrails & Vertical Wheel-Guide Curbs!
        for (let i = 0; i <= 12; i++) {
          const px = -halfL + (i / 12) * br.length;
          for (const side of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.35, 0.24), matHeavyLog);
            post.position.set(px, 0.68, side * (halfW + 0.12));
            deckGrp.add(post);
          }
        }
        for (const side of [-1, 1]) {
          const railTop = new THREE.Mesh(new THREE.BoxGeometry(br.length, 0.18, 0.16), matHeavyLog);
          railTop.position.set(0, 1.25, side * (halfW + 0.12));
          deckGrp.add(railTop);
          const wheelCurb = new THREE.Mesh(new THREE.BoxGeometry(br.length, 0.26, 0.24), this.matWood);
          wheelCurb.position.set(0, 0.14, side * (halfW - 0.10));
          deckGrp.add(wheelCurb);
        }
      } else {
        // Rickety Rotten Wood: Crooked uneven fence posts & slack wire!
        for (let i = 0; i <= 10; i++) {
          const px = -halfL * 0.96 + (i / 10) * br.length * 0.96;
          for (const side of [-1, 1]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.18), this.matWoodDark);
            post.position.set(px, 0.65, side * (halfW + 0.05));
            post.rotation.z = (this.hash2(i * 11 + bIdx, side + 5) - 0.5) * 0.28;
            deckGrp.add(post);
          }
        }
      }

      // 4. DECK SLABS / PLANKS (Flush top surface at y = 0.0 inside deckGrp!)
      const plankLen = br.length / br.plankCount;
      const gapMult = br.style === "concrete" ? 1.01 : (br.style === "steel_truss" ? 0.99 : (br.style === "timber_wellmade" ? 0.97 : 0.92));
      const plankThick = br.style === "concrete" ? 0.42 : 0.26;
      const plankGeo = new THREE.BoxGeometry(plankLen * gapMult, plankThick, br.width);
      const planks = [], plankSag = new Float32Array(br.plankCount);

      for (let p = 0; p < br.plankCount; p++) {
        const px = -halfL + (p + 0.5) * plankLen;
        let pMat = (p % 2 === 0) ? this.matWood : this.matWoodDark;
        if (br.style === "concrete") pMat = matAsphalt;
        else if (br.style === "steel_truss") pMat = (p % 2 === 0) ? matDeckSteel : this.matRustSteel;
        else if (br.style === "timber_wellmade") pMat = (p % 2 === 0) ? matHeavyLog : this.matWood;

        const m = new THREE.Mesh(plankGeo, pMat);
        m.position.set(px, -plankThick * 0.5, 0);
        m.castShadow = true; m.receiveShadow = true;
        deckGrp.add(m);
        planks.push(m);
      }

      this.rootGroup.add(grp);
      this.bridgeMeshes.set(br.id, {
        group: grp,
        deckGrp,
        data: br,
        tDef: rngStats.tDef,
        startY,
        endY,
        deckY: midY,
        slopePitch,
        plankThick,
        planks,
        plankSag,
        broken: new Set()
      });
    }
  }

  applyBridgeSeed(newBridgeSeed) {
    if (typeof newBridgeSeed !== "number" || newBridgeSeed === this.bridgeRngSeed) return;
    this.bridgeRngSeed = newBridgeSeed;
    // Rebuild bridge visual/RNG stats ONLY — terrainSeed stays permanently locked at 404911!
    this._buildBridges();
  }

  stressBridgePlank(bridgeId, plankIdx, totalMassKg, speedMs, dt) {
    const bObj = this.bridgeMeshes.get(bridgeId);
    if (!bObj || bObj.broken.has(plankIdx)) return false;
    const br = bObj.data;
    const tDef = bObj.tDef || KK.BRIDGE_TYPES.rickety_wood;
    const safeMass = br.effectiveMaxMassKg || br.baseMaxMassKg || 4000;

    // Never snap end-abutment transition slabs (0 and plankCount-1) so there's NEVER a gap at the bank!
    const isEndLip = (plankIdx === 0 || plankIdx === br.plankCount - 1);
    const dynamicLoad = totalMassKg * (1.0 + Math.max(0, speedMs - 4.5) * 0.08);
    const ratio = dynamicLoad / safeMass;

    // Dynamic visible sag proportional to bridge type!
    const targetSag = Math.min(0.34, Math.max(0.0, ratio * 0.13 * tDef.sagMult));
    bObj.plankSag[plankIdx] += (targetSag - bObj.plankSag[plankIdx]) * Math.min(1, dt * 10);
    const mesh = bObj.planks[plankIdx];
    if (mesh) mesh.position.y = -bObj.plankThick * 0.5 - bObj.plankSag[plankIdx];

    if (!tDef.breakable || isEndLip) return false;

    if (ratio > 1.04 && Math.random() < (ratio - 0.96) * dt * 2.4) {
      this.breakPlank(bridgeId, plankIdx);
      return true;
    }
    return false;
  }

  breakPlank(bridgeId, plankIdx) {
    const bObj = this.bridgeMeshes.get(bridgeId);
    if (!bObj || bObj.broken.has(plankIdx)) return;
    if (bObj.tDef && !bObj.tDef.breakable) return;
    if (plankIdx <= 0 || plankIdx >= bObj.planks.length - 1) return;
    bObj.broken.add(plankIdx);
    if (bObj.planks[plankIdx]) bObj.planks[plankIdx].visible = false;
  }

  repairAllBridges() {
    for (const bObj of this.bridgeMeshes.values()) {
      bObj.broken.clear(); bObj.plankSag.fill(0);
      for (const m of bObj.planks) { m.visible = true; m.position.y = -bObj.plankThick * 0.5; }
    }
  }

  _buildRivers() {
    // 1. Continuous 3D River Ribbon Meshes along both Great Krasnaya River splines!
    for (const sp of this.riverSplines) {
      const ch = sp.chain;
      if (ch.length < 2) continue;
      const hwBase = sp.halfWidth;
      const positions = new Float32Array(ch.length * 2 * 3);
      const indices = [];

      // TUCK WATER RIBBON EDGES NEATLY INSIDE CARVED BANKS (waterY is strictly below surrounding terrain!)
      const findBankEdge = (cx, cz, waterY, dirX, dirZ) => {
        let dist = hwBase * 0.65;
        const maxDist = hwBase + 26.0;
        while (dist < maxDist) {
          const th = this.getTerrainInfo(cx + dirX * dist, cz + dirZ * dist, false).height;
          if (th > waterY + 0.35) break;
          dist += 2.0;
        }
        return Math.min(hwBase + 28.0, dist + 3.0);
      };

      for (let i = 0; i < ch.length; i++) {
        const cur = ch[i], prev = ch[Math.max(0, i - 1)], next = ch[Math.min(ch.length - 1, i + 1)];
        let tx = next.x - prev.x, tz = next.z - prev.z;
        const len = Math.hypot(tx, tz) || 1;
        tx /= len; tz /= len;
        const nx = -tz, nz = tx;

        const wLeft  = findBankEdge(cur.x, cur.z, cur.y, -nx, -nz);
        const wRight = findBankEdge(cur.x, cur.z, cur.y,  nx,  nz);

        const base = i * 6;
        positions[base + 0] = cur.x - nx * wLeft;  positions[base + 1] = cur.y; positions[base + 2] = cur.z - nz * wLeft;
        positions[base + 3] = cur.x + nx * wRight; positions[base + 4] = cur.y; positions[base + 5] = cur.z + nz * wRight;
        if (i < ch.length - 1) {
          const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
          indices.push(a, c, b, b, c, d);
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const ribbon = new THREE.Mesh(geo, this.matWater);
      ribbon.receiveShadow = true;
      this.rootGroup.add(ribbon);
      this.waterMeshes.push(ribbon);
    }

    // 2. Isolated Oasis/Swamp Water Fords
    for (const rv of KK.RIVERS) {
      const wy = this.getBaseHeight(rv.x + rv.rx * 0.9, rv.z) - 0.35;
      const geo = new THREE.PlaneGeometry(rv.rx * 2.1, rv.rz * 2.1);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, this.matWater);
      m.position.set(rv.x, wy, rv.z); m.rotation.y = -rv.yaw;
      this.rootGroup.add(m); this.waterMeshes.push(m);
    }

    // 3. Visual Red/White Depth-Gauge Guide Poles Flanking Entry & Exit Ramps on BOTH Banks of every Shallow Ford!
    if (KK.RIVER_FORDS) {
      const matPoleW = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.65 });
      const matPoleR = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
      const matFordBeacon = new THREE.MeshBasicMaterial({ color: 0x38d9f5, transparent: true, opacity: 0.38 });
      const geoPoleW = new THREE.CylinderGeometry(0.14, 0.16, 3.6, 6);
      const geoBandR = new THREE.CylinderGeometry(0.165, 0.165, 0.55, 6);
      for (const fd of KK.RIVER_FORDS) {
        const rc = this.getRiverChannel(fd.x, fd.z);
        const hw = (rc.seg ? rc.seg.halfWidth : (fd._hw || 22));
        const nx = fd._nx !== undefined ? fd._nx : 0;
        const nz = fd._nz !== undefined ? fd._nz : 1;
        const tx = fd._tx !== undefined ? fd._tx : 1;
        const tz = fd._tz !== undefined ? fd._tz : 0;
        const fGrp = new THREE.Group();
        fGrp.position.set(fd.x, 0, fd.z);

        // Place inner water-edge guide poles & outer bank-ramp entry poles cleanly on actual graded ramp terrain!
        const laneHalf = Math.min(18, Math.max(12, fd.radius * 0.34));
        const bankRows = [hw + 3.5, hw + 22.0];
        for (const side of [-1, 1]) {
          for (const span of bankRows) {
            for (const off of [-laneHalf, laneHalf]) {
              const px = nx * side * span + tx * off;
              const pz = nz * side * span + tz * off;
              const py = this.getTerrainInfo(fd.x + px, fd.z + pz, false).height;
              const pole = new THREE.Mesh(geoPoleW, matPoleW);
              pole.position.set(px, py + 1.75, pz); fGrp.add(pole);
              const tip1 = new THREE.Mesh(geoBandR, matPoleR);
              tip1.position.set(px, py + 3.15, pz); fGrp.add(tip1);
              const tip2 = new THREE.Mesh(geoBandR, matPoleR);
              tip2.position.set(px, py + 2.05, pz); fGrp.add(tip2);
            }
          }
          // Subtle cyan locator beacon on outer ramp shoulder on each bank
          const bx = nx * side * (hw + 22.0) + tx * laneHalf;
          const bz = nz * side * (hw + 22.0) + tz * laneHalf;
          const by = this.getTerrainInfo(fd.x + bx, fd.z + bz, false).height;
          const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 16, 6), matFordBeacon);
          bcn.position.set(bx, by + 8.0, bz);
          fGrp.add(bcn);
        }
        this.rootGroup.add(fGrp);
      }
    }
  }

  updateChunks(playerGx, playerGz, force = false, velX = 0, velZ = 0) {
    // Gentle velocity look-ahead (+90m max) while ALWAYS locking the 3×3 chunks under the player!
    const rawCx = Math.floor(playerGx / KK.CHUNK_SIZE);
    const rawCz = Math.floor(playerGz / KK.CHUNK_SIZE);
    const spd = Math.hypot(velX || 0, velZ || 0);
    const lookT = spd > 24 ? 1.1 : 0;
    const leadX = Math.max(-90, Math.min(90, (velX || 0) * lookT));
    const leadZ = Math.max(-90, Math.min(90, (velZ || 0) * lookT));
    const pcx = Math.floor((playerGx + leadX) / KK.CHUNK_SIZE);
    const pcz = Math.floor((playerGz + leadZ) / KK.CHUNK_SIZE);

    if (this.oceanMesh) {
      this.oceanMesh.position.set(playerGx, KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0, playerGz);
      if (this._oceanTex) {
        const rep = 520 / 42000;
        const tWave = performance.now() * 0.00008;
        this._oceanTex.offset.set(playerGx * rep + tWave, -playerGz * rep + tWave * 0.6);
      }
    }
    if (this.farIslandsGroup && KK.ISLANDS) {
      let cIdx = 0;
      for (const isl of KK.ISLANDS) {
        if (isl.id === 0) continue;
        const m = this.farIslandsGroup.children[cIdx++];
        if (m) m.visible = (Math.hypot(playerGx - isl.cx, playerGz - isl.cz) > Math.max(isl.rx, isl.rz) * 1.12);
      }
    }

    let listDirty = false;
    if (force || pcx !== this._lastCcx || pcz !== this._lastCcz) {
      this._lastCcx = pcx; this._lastCcz = pcz;
      const needed = new Set(), R = KK.CHUNK_RADIUS;
      const missing = [];
      const dirX = spd > 1 ? (velX / spd) : 0;
      const dirZ = spd > 1 ? (velZ / spd) : 0;

      // Always protect the 3×3 chunks directly around the player so ground NEVER vanishes underfoot!
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          needed.add((rawCx + ax) + "," + (rawCz + az));
        }
      }
      // If the chunk directly under the player is missing, build it immediately so terrain is never invisible!
      const underKey = rawCx + "," + rawCz;
      if (!this.chunks.has(underKey)) {
        this._storeChunk(rawCx, rawCz, underKey, this._createChunk(rawCx, rawCz));
        listDirty = true;
      }
      for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
          const cx = pcx + dx, cz = pcz + dz, key = cx + "," + cz;
          needed.add(key);
          if (!this.chunks.has(key)) {
            if (force) {
              this._storeChunk(cx, cz, key, this._createChunk(cx, cz));
              listDirty = true;
            } else {
              // Priority: closest chunks + chunks directly ahead of travel direction build FIRST!
              const cMidX = (cx + 0.5) * KK.CHUNK_SIZE - playerGx;
              const cMidZ = (cz + 0.5) * KK.CHUNK_SIZE - playerGz;
              const dist = Math.hypot(cMidX, cMidZ);
              const aheadDot = (cMidX * dirX + cMidZ * dirZ) / (dist || 1);
              const prio = dist - aheadDot * 140;
              missing.push({ cx, cz, key, prio });
            }
          }
        }
      }
      this._chunkNeeded = needed;
      if (!force && missing.length > 0) {
        missing.sort((a, b) => a.prio - b.prio);
        this._chunkQueue = missing;
      } else if (force) {
        this._chunkQueue = [];
      }

      // Unload out-of-range chunks safely (pooling PlaneGeometry & guarding pure-ocean null mesh!)
      for (const [key, chunk] of this.chunks.entries()) {
        if (!needed.has(key)) {
          this._disposeChunkGroup(chunk);
          this._removeChunk(key, chunk);
          listDirty = true;
        }
      }
    }

    // v15.3.5 MICRO-SLICED INCREMENTAL CHUNK STREAMING (< 2.5ms/frame -> ZERO 60->35 FPS stutters!)
    if (!force) {
      const t0 = performance.now();
      // 1. If no chunk is currently mid-build, pop the next needed chunk from the priority queue
      while (!this._activeChunkBuild && this._chunkQueue && this._chunkQueue.length > 0) {
        const item = this._chunkQueue.shift();
        if (!this._chunkNeeded.has(item.key) || this.chunks.has(item.key)) continue;
        const size = KK.CHUNK_SIZE;
        if (this._isPureDeepOceanChunk(item.cx * size, item.cz * size, size)) {
          this._storeChunk(item.cx, item.cz, item.key, this._createChunk(item.cx, item.cz));
          listDirty = true;
          if (performance.now() - t0 > 2.0) break;
        } else {
          this._activeChunkBuild = this._beginChunkBuild(item.cx, item.cz, item.key);
        }
      }
      // 2. Advance the active chunk build by ~520 vertices (within 2.6ms frame budget!)
      if (this._activeChunkBuild) {
        if (!this._chunkNeeded.has(this._activeChunkBuild.key) || this.chunks.has(this._activeChunkBuild.key)) {
          // Player moved past before completion — recycle geometry cleanly!
          if (this._activeChunkBuild.geo && this._chunkGeoPool && this._chunkGeoPool.length < 32) {
            this._chunkGeoPool.push(this._activeChunkBuild.geo);
          }
          this._activeChunkBuild = null;
        } else {
          const doneChunk = this._stepChunkBuild(this._activeChunkBuild, t0, 3.2);
          if (doneChunk) {
            this._storeChunk(this._activeChunkBuild.cx, this._activeChunkBuild.cz, this._activeChunkBuild.key, doneChunk);
            this._activeChunkBuild = null;
            listDirty = true;
          }
        }
      }
    }

    if (listDirty) {
      this._rebuildActiveChunkLists();
    }
  }

  _isPureDeepOceanChunk(startX, startZ, size) {
    if (!KK.ISLANDS) return false;
    const midX = startX + size * 0.5, midZ = startZ + size * 0.5;
    const pad = size * 0.95 + 240;
    for (let i = 0; i < KK.ISLANDS.length; i++) {
      const isl = KK.ISLANDS[i];
      const nx = (midX - isl.cx) / (isl.rx * 1.15 + pad);
      const nz = (midZ - isl.cz) / (isl.rz * 1.15 + pad);
      if (nx * nx + nz * nz < 1.0) return false;
    }
    return true;
  }

  _filterChunkRoads(startX, startZ, size) {
    const pad = 42;
    const minX = startX - pad, maxX = startX + size + pad;
    const minZ = startZ - pad, maxZ = startZ + size + pad;
    const list = [];
    if (this._roadGrid) {
      const cell = this._roadGridCell;
      const stamp = ++this._rQueryStamp;
      const ix0 = Math.floor(minX / cell), ix1 = Math.floor(maxX / cell);
      const iz0 = Math.floor(minZ / cell), iz1 = Math.floor(maxZ / cell);
      for (let ix = ix0; ix <= ix1; ix++) {
        const kx = (ix + 32768) * 65536;
        for (let iz = iz0; iz <= iz1; iz++) {
          const bucket = this._roadGrid.get(kx + (iz + 32768));
          if (!bucket) continue;
          for (let i = 0; i < bucket.length; i++) {
            const s = bucket[i];
            if (s._qStamp === stamp) continue;
            s._qStamp = stamp;
            if (s.maxX < minX || s.minX > maxX || s.maxZ < minZ || s.minZ > maxZ) continue;
            list.push(s);
          }
        }
      }
      return list;
    }
    for (let i = 0; i < this.roadSegments.length; i++) {
      const s = this.roadSegments[i];
      if (s.maxX < minX || s.minX > maxX || s.maxZ < minZ || s.minZ > maxZ) continue;
      list.push(s);
    }
    return list;
  }

  _colorChunkVertex(gx, gz, info, col) {
    const b = info.b || this.getBiomeWeights(gx, gz);
    if (info.surface === "race_tarmac") col.setRGB(0.14, 0.15, 0.18);
    else if (info.surface === "tarmac_line") col.setRGB(0.92, 0.94, 0.96);
    else if (info.surface === "kerb") {
      const stripe = (Math.floor((gx + gz) * 0.22) % 2 === 0);
      if (stripe) col.setRGB(0.86, 0.14, 0.16); else col.setRGB(0.94, 0.94, 0.94);
    } else if (info.surface === "bad_road") {
      const wear = this.hash2(Math.floor(gx * 0.5), Math.floor(gz * 0.5)) * 0.10;
      col.setRGB(0.28 + wear, 0.21 + wear * 0.7, 0.14 + wear * 0.4);
    } else if (info.potholeDepth > 0.04) col.setRGB(0.16, 0.13, 0.10);
    else if (info.surface === "asphalt") {
      const wear = this.hash2(Math.floor(gx * 0.5), Math.floor(gz * 0.5)) * 0.08;
      col.setRGB(0.24 + wear, 0.24 + wear, 0.26 + wear);
    } else if (info.surface === "shale") col.setRGB(0.39, 0.36, 0.33);
    else if (info.surface === "gravel") {
      const fdCol = this._getRiverFordInfoInto(gx, gz, this._fordOut);
      if (fdCol.blend > 0.16) {
        // Distinct pale sunlit cobble/gravel shoal so players clearly spot ford entry & exit ramps!
        const spk = (this.hash2(Math.floor(gx * 0.7), Math.floor(gz * 0.7)) - 0.5) * 0.08;
        const fb = Math.min(1.0, fdCol.blend * 1.35);
        col.setRGB(
          0.45 * (1 - fb) + (0.68 + spk) * fb,
          0.42 * (1 - fb) + (0.64 + spk) * fb,
          0.36 * (1 - fb) + (0.54 + spk) * fb
        );
      } else {
        col.setRGB(0.45, 0.42, 0.36);
      }
    } else if (info.surface === "mud") col.setRGB(0.24, 0.17, 0.11);
    else if (info.surface === "volcanic") {
      const vein = Math.abs(Math.sin(gx * 0.032 + Math.cos(gz * 0.028) * 2.5));
      if (vein < 0.07) col.setRGB(0.95, 0.28, 0.04);
      else {
        const vv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
        col.setRGB(0.15 + vv, 0.13 + vv, 0.14 + vv);
      }
    } else if (info.surface === "sand") {
      const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.07;
      col.setRGB(0.76 + sv, 0.54 + sv, 0.30 + sv);
    } else if (info.surface === "rock" || info.height > 175) {
      if (info.height > 260) col.setRGB(0.86, 0.90, 0.94);
      else col.setRGB(0.38, 0.38, 0.40);
    } else if (KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < KK.CLARKSON_FARM.radius) {
      const v = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
      col.setRGB(0.24 + v, 0.48 + v, 0.18 + v);
    } else {
      if ((b.radioactive || 0) > 0.35) {
        const rv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
        col.setRGB(0.24 + rv, 0.28 + rv, 0.16 + rv);
      } else if (info.surface === "snow" || (b.arctic || 0) > 0.42) {
        const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.04;
        col.setRGB(0.84 + sv, 0.90 + sv, 0.96 + sv);
      } else if ((b.tropical || 0) > 0.35) {
        const tv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.06;
        col.setRGB(0.11 + tv * 0.5, 0.44 + tv, 0.15 + tv * 0.5);
      } else if ((b.savanna || 0) > 0.35) {
        const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.06;
        col.setRGB(0.68 + sv, 0.56 + sv * 0.8, 0.22 + sv * 0.4);
      } else {
        const gv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
        col.setRGB(0.24 + b.rust * 0.12 + gv, 0.32 + b.taiga * 0.05 + gv, 0.18 + gv);
      }
    }
    if (this.craters.length > 0) {
      const cr = this._getCraterOffsetInto(gx, gz, this._craterOut);
      if (cr.scorch > 0.05) {
        col.r *= (1 - cr.scorch * 0.78);
        col.g *= (1 - cr.scorch * 0.82);
        col.b *= (1 - cr.scorch * 0.85);
      }
    }
  }

  _beginChunkBuild(cx, cz, key) {
    const size = KK.CHUNK_SIZE, segs = KK.CHUNK_SEGMENTS;
    const startX = cx * size, startZ = cz * size;
    let geo = (this._chunkGeoPool && this._chunkGeoPool.length > 0) ? this._chunkGeoPool.pop() : null;
    if (!geo) {
      geo = new THREE.PlaneGeometry(size, size, segs, segs);
      geo.rotateX(-Math.PI / 2);
    }
    const pos = geo.attributes.position;
    const count = pos.count;
    const heights = new Float32Array(count);
    const surfaceCodes = new Uint8Array(count);
    const mudDepths = new Uint8Array(count);
    const potholeDepths = new Uint8Array(count);
    const existingCol = geo.attributes.color;
    const colors = (existingCol && existingCol.array && existingCol.array.length === count * 3)
      ? existingCol.array
      : new Float32Array(count * 3);
    return {
      cx, cz, key, size, startX, startZ, geo, pos, heights, colors,
      surfaceCodes, mudDepths, potholeDepths,
      waterSurfaceYs: null, hasMud: false, hasPotholes: false,
      roadSubset: this._filterChunkRoads(startX, startZ, size),
      vIdx: 0, col: new THREE.Color()
    };
  }

  _stepChunkBuild(job, t0, budgetMs = 2.6) {
    this._activeRoadSegs = job.roadSubset;
    this._inChunkBuild = true;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const pos = job.pos, heights = job.heights, colors = job.colors, col = job.col;
    const surfaceCodes = job.surfaceCodes, mudDepths = job.mudDepths, potholeDepths = job.potholeDepths;
    const halfX = job.startX + job.size * 0.5, halfZ = job.startZ + job.size * 0.5;
    const total = pos.count;
    let i = job.vIdx;
    const batchEnd = Math.min(total, i + 740);
    while (i < batchEnd) {
      const gx = halfX + pos.getX(i);
      const gz = halfZ + pos.getZ(i);
      const info = this.getTerrainInfo(gx, gz, false);
      pos.setY(i, info.height);
      heights[i] = info.height;
      const sc = KK_SURFACE_TO_CODE[info.surface];
      surfaceCodes[i] = sc !== undefined ? sc : 0;
      if (info.mudDepth > 0.005) {
        job.hasMud = true;
        mudDepths[i] = Math.min(255, Math.round(info.mudDepth * 100));
      }
      if (info.potholeDepth > 0.002) {
        job.hasPotholes = true;
        potholeDepths[i] = Math.min(255, Math.round(info.potholeDepth * 200));
      }
      if (info.waterSurfaceY > -5000 && info.waterSurfaceY > seaL + 0.01) {
        if (!job.waterSurfaceYs) {
          job.waterSurfaceYs = new Float32Array(total);
          job.waterSurfaceYs.fill(-9999);
        }
        job.waterSurfaceYs[i] = info.waterSurfaceY;
      }
      this._colorChunkVertex(gx, gz, info, col);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
      i++;
      if ((i & 63) === 0 && (performance.now() - t0) > budgetMs) break;
    }
    job.vIdx = i;
    this._activeRoadSegs = null;
    this._inChunkBuild = false;
    if (i < total) return null; // Continue next frame!

    // Finalize mesh + instanced props in one quick pass
    if (job.geo.attributes.color && job.geo.attributes.color.array === colors) {
      job.geo.attributes.color.needsUpdate = true;
    } else {
      job.geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    pos.needsUpdate = true;
    job.geo.computeVertexNormals();
    job.geo.computeBoundingSphere();
    job.geo.computeBoundingBox();
    return this._finalizeChunkFromGeo(job.cx, job.cz, job.geo, heights, job.roadSubset, job);
  }

  _createChunk(cx, cz) {
    const size = KK.CHUNK_SIZE, segs = KK.CHUNK_SEGMENTS;
    const startX = cx * size, startZ = cz * size;
    if (this._isPureDeepOceanChunk(startX, startZ, size)) {
      const group = new THREE.Group();
      group.position.set(startX + size * 0.5, 0, startZ + size * 0.5);
      this.rootGroup.add(group);
      return { group, mesh: null, heights: null, trees: [], colliders: [], fences: [], isPureOcean: true };
    }
    const job = this._beginChunkBuild(cx, cz, cx + "," + cz);
    this._activeRoadSegs = job.roadSubset;
    this._inChunkBuild = true;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const pos = job.pos, heights = job.heights, colors = job.colors, col = job.col;
    const surfaceCodes = job.surfaceCodes, mudDepths = job.mudDepths, potholeDepths = job.potholeDepths;
    const total = pos.count;
    const halfX = startX + size * 0.5, halfZ = startZ + size * 0.5;
    for (let i = 0; i < total; i++) {
      const gx = halfX + pos.getX(i);
      const gz = halfZ + pos.getZ(i);
      const info = this.getTerrainInfo(gx, gz, false);
      pos.setY(i, info.height);
      heights[i] = info.height;
      const sc = KK_SURFACE_TO_CODE[info.surface];
      surfaceCodes[i] = sc !== undefined ? sc : 0;
      if (info.mudDepth > 0.005) {
        job.hasMud = true;
        mudDepths[i] = Math.min(255, Math.round(info.mudDepth * 100));
      }
      if (info.potholeDepth > 0.002) {
        job.hasPotholes = true;
        potholeDepths[i] = Math.min(255, Math.round(info.potholeDepth * 200));
      }
      if (info.waterSurfaceY > -5000 && info.waterSurfaceY > seaL + 0.01) {
        if (!job.waterSurfaceYs) {
          job.waterSurfaceYs = new Float32Array(total);
          job.waterSurfaceYs.fill(-9999);
        }
        job.waterSurfaceYs[i] = info.waterSurfaceY;
      }
      this._colorChunkVertex(gx, gz, info, col);
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }
    this._activeRoadSegs = null;
    this._inChunkBuild = false;
    if (job.geo.attributes.color && job.geo.attributes.color.array === colors) {
      job.geo.attributes.color.needsUpdate = true;
    } else {
      job.geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    }
    pos.needsUpdate = true;
    job.geo.computeVertexNormals();
    job.geo.computeBoundingSphere();
    job.geo.computeBoundingBox();
    return this._finalizeChunkFromGeo(cx, cz, job.geo, heights, job.roadSubset, job);
  }

  _finalizeChunkFromGeo(cx, cz, geo, heights, roadSubset, meta = null) {
    const size = KK.CHUNK_SIZE;
    const startX = cx * size, startZ = cz * size;
    this._activeRoadSegs = roadSubset;
    this._inChunkBuild = true;
    const group = new THREE.Group();
    group.position.set(startX + size * 0.5, 0, startZ + size * 0.5);
    const mesh = new THREE.Mesh(geo, this.matTerrain);
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    group.add(mesh);

    const trees = [];
    const colliders = [];
    const bCenter = this.getBiomeWeights(startX + size * 0.5, startZ + size * 0.5);
    const isDesertChunk = bCenter.desert > 0.55;
    const isVolcChunk = bCenter.volcanic > 0.45;
    const isTropChunk = (bCenter.tropical || 0) > 0.40;
    const isSavChunk  = (bCenter.savanna || 0) > 0.40;
    const isArcChunk  = (bCenter.arctic || 0) > 0.40;
    const isRadChunk  = (bCenter.radioactive || 0) > 0.40;
    const isOceanChunk = (bCenter.ocean || 0) > 0.88;
    const treeCount = isOceanChunk ? 0 : (isTropChunk ? 26 : (isSavChunk ? 7 : (isArcChunk ? 6 : (isVolcChunk ? 3 : (isDesertChunk ? 5 : Math.floor(8 + bCenter.taiga * 15 + bCenter.rust * 4))))));
    const chunkKey = cx + "," + cz;

    // v15.3.2 INSTANCED SAVANNA TALL GRASS & TERMITE MOUNDS (Identical look, 34 -> 3 draw calls!)
    if (isSavChunk && !isOceanChunk) {
      const mMats = [], g1Mats = [], g2Mats = [];
      const dummy = new THREE.Object3D();
      for (let g = 0; g < 34; g++) {
        const grx = (this.hash2(cx * 47 + g * 3, cz * 23 - g) - 0.5) * (size - 8);
        const grz = (this.hash2(cx * 19 - g, cz * 53 + g * 5) - 0.5) * (size - 8);
        const ggx = startX + size * 0.5 + grx, ggz = startZ + size * 0.5 + grz;
        if (KK.ZOLOTOY_CITY && Math.abs(ggx - KK.ZOLOTOY_CITY.cx) < (KK.ZOLOTOY_CITY.halfSpan + 24) && Math.abs(ggz - KK.ZOLOTOY_CITY.cz) < (KK.ZOLOTOY_CITY.halfSpan + 24)) continue;
        const gInfo = this.getTerrainInfo(ggx, ggz, false);
        if (gInfo.roadDist < 8 || gInfo.waterDepth > 0.05 || gInfo.surface === "race_tarmac" || gInfo.surface === "tarmac_line") continue;
        const gs = 0.75 + this.hash2(g * 7 + cx, cz - g * 3) * 1.15;
        if (g < 3) {
          dummy.position.set(grx, gInfo.height + 1.1 * gs, grz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(gs * 0.9, gs * 1.0, gs * 0.9);
          dummy.updateMatrix();
          mMats.push(dummy.matrix.clone());
        } else {
          dummy.position.set(grx, gInfo.height + 0.52 * gs, grz);
          dummy.rotation.set(0, g * 1.1, 0);
          dummy.scale.set(gs * 1.4, gs * 0.85, gs * 1.4);
          dummy.updateMatrix();
          (g % 2 === 0 ? g1Mats : g2Mats).push(dummy.matrix.clone());
        }
      }
      const addInst = (geo, mat, arr) => {
        if (arr.length === 0) return;
        const im = new THREE.InstancedMesh(geo, mat, arr.length);
        for (let i = 0; i < arr.length; i++) im.setMatrixAt(i, arr[i]);
        im.instanceMatrix.needsUpdate = true;
        group.add(im);
      };
      addInst(this.geoTermite, this.matTermite, mMats);
      addInst(this.geoSavGrass, this.matSavGrass, g1Mats);
      addInst(this.geoSavGrass, this.matSavGrass2, g2Mats);
    }

    // v15.3.3 ZERO-QUALITY-LOSS INSTANCED CHUNK TREES & FENCES BATCHER!
    const instBuckets = new Map(); // key -> { geo, mat, matrices: [], owners: [] }
    const _pDummy = new THREE.Object3D();
    const _cDummy = new THREE.Object3D();
    const _mComb  = new THREE.Matrix4();
    const addInstPart = (bKey, geo, mat, ownerId, isFence, cxL, cyL, czL, rxL = 0, ryL = 0, rzL = 0, sxL = 1, syL = 1, szL = 1) => {
      let bk = instBuckets.get(bKey);
      if (!bk) { bk = { geo, mat, matrices: [], owners: [] }; instBuckets.set(bKey, bk); }
      _cDummy.position.set(cxL, cyL, czL);
      _cDummy.rotation.set(rxL, ryL, rzL);
      _cDummy.scale.set(sxL, syL, szL);
      _cDummy.updateMatrix();
      _mComb.multiplyMatrices(_pDummy.matrix, _cDummy.matrix);
      bk.matrices.push(_mComb.clone());
      bk.owners.push({ id: ownerId, isFence });
    };

    for (let t = 0; t < treeCount; t++) {
      const treeId = `${cx}_${cz}_${t}`;
      if (this.brokenTrees.has(treeId)) continue; // Already smashed down!
      const rx = (this.hash2(cx * 31 + t, cz * 17) - 0.5) * (size - 10);
      const rz = (this.hash2(cx * 13, cz * 29 + t) - 0.5) * (size - 10);
      const gx = startX + size * 0.5 + rx, gz = startZ + size * 0.5 + rz;
      const info = this.getTerrainInfo(gx, gz, false);
      const inZCity = KK.ZOLOTOY_CITY && Math.abs(gx - KK.ZOLOTOY_CITY.cx) < (KK.ZOLOTOY_CITY.halfSpan + 35) && Math.abs(gz - KK.ZOLOTOY_CITY.cz) < (KK.ZOLOTOY_CITY.halfSpan + 35);
      if (inZCity) continue;
      const aChk = this.getAirstripInfo(gx, gz);
      if (info.roadDist < 12 || info.waterDepth > 0.1 || info.height > 290 || info.surface === "race_tarmac" || info.surface === "kerb" || info.surface === "tarmac_line" || (aChk && aChk.blend > 0.1)) continue;
      if (this.getMegaBridgeInfo(gx, gz)) continue;
      if (this._getRiverFordInfoInto(gx, gz, this._fordOut).blend > 0.08) continue;

      let blocked = false;
      for (const tw of KK.TOWNS) { if (Math.hypot(gx - tw.x, gz - tw.z) < 96) { blocked = true; break; } }
      if (!blocked) {
        for (const lm of KK.LANDMARKS) { if (Math.hypot(gx - lm.x, gz - lm.z) < 48) { blocked = true; break; } }
      }
      if (!blocked && KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < KK.CLARKSON_FARM.radius + 10) blocked = true;
      if (!blocked && KK.JAMES_MAY_BAR && Math.hypot(gx - KK.JAMES_MAY_BAR.x, gz - KK.JAMES_MAY_BAR.z) < KK.JAMES_MAY_BAR.radius + 12) blocked = true;
      if (!blocked && KK.HAMMOND_MESA && Math.hypot(gx - KK.HAMMOND_MESA.x, gz - KK.HAMMOND_MESA.z) < KK.HAMMOND_MESA.radius + 20) blocked = true;
      if (!blocked) { for (const pk in this.secretPads) { const sp = this.secretPads[pk]; if (Math.hypot(gx - sp.x, gz - sp.z) < sp.radius + 8) { blocked = true; break; } } }
      if (blocked) continue;

      const scale = 0.95 + this.hash2(cx + t * 5, cz - t * 3) * 0.90;
      const ryBase = info.height - 0.15;

      if (isTropChunk) {
        const rotY = this.hash2(t * 7, cx + cz) * Math.PI * 2;
        const species = t % 4;
        if (species === 0) {
          const lean = 0.14 + this.hash2(cx + t, cz - t) * 0.16;
          _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, rotY, 0); _pDummy.scale.set(scale * 1.05, scale * 1.15, scale * 1.05); _pDummy.updateMatrix();
          addInstPart("palm_t", this.geoPalmSeg, this.matPalmTrunk, treeId, false, 0, 1.35, 0, 0, 0, lean * 0.5);
          addInstPart("palm_t", this.geoPalmSeg, this.matPalmTrunk, treeId, false, -lean * 1.4, 4.0, 0, 0, 0, lean);
          addInstPart("palm_t", this.geoPalmSeg, this.matPalmTrunk, treeId, false, -lean * 3.8, 6.5, 0, 0, 0, lean * 1.2);
          const crownX = -lean * 5.2, crownY = 7.9;
          for (let f = 0; f < 6; f++) {
            const fa = (f / 6) * Math.PI * 2;
            addInstPart("palm_f", this.geoPalmFrond, this.matPalmLeaf, treeId, false, crownX + Math.sin(fa) * 1.5, crownY - 0.15, Math.cos(fa) * 1.5, 0.34, fa, 0);
          }
          this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "palm", rx, ry: ryBase, rz, scale, rotY, lean });
          colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.42 * scale, h: 9.0 * scale, kind: "tree", broken: false });
        } else if (species === 1) {
          _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, rotY, 0); _pDummy.scale.set(scale * 1.15, scale * 1.2, scale * 1.15); _pDummy.updateMatrix();
          addInstPart("ban_t", this.geoTrunk, this.matBanyanBark, treeId, false, 0, 0, 0, 0, 0, 0, 1.35, 0.85, 1.35);
          addInstPart("ban_c", this.geoBanyanTop, this.matBanyanLeaf, treeId, false, 0, 9.2, 0, 0, 0, 0, 1.35, 0.78, 1.35);
          addInstPart("ban_c", this.geoBanyanTop, this.matBanyanLeaf, treeId, false, 2.2, 8.0, 1.4, 0, 0, 0, 0.92, 0.65, 0.92);
          this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "acacia", rx, ry: ryBase, rz, scale, rotY });
          colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.68 * scale, h: 11.0 * scale, kind: "tree", broken: false });
        } else if (species === 2) {
          _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, rotY, 0); _pDummy.scale.set(scale, scale * 1.15, scale); _pDummy.updateMatrix();
          for (let b = 0; b < 4; b++) {
            const ba = (b / 4) * Math.PI * 2;
            addInstPart("bamb_s", this.geoBambooStalk, this.matBamboo, treeId, false, Math.cos(ba) * 0.55, 4.7, Math.sin(ba) * 0.55, Math.sin(ba) * 0.08, 0, Math.cos(ba) * 0.08);
          }
          addInstPart("bamb_f", this.geoPalmFrond, this.matBamboo, treeId, false, 0, 9.2, 0, 0.25, 0, 0, 1.1, 1, 0.8);
          this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "palm", rx, ry: ryBase, rz, scale, rotY });
          colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.55 * scale, h: 9.5 * scale, kind: "tree", broken: false });
        } else {
          _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, rotY, 0); _pDummy.scale.set(scale * 1.2, scale, scale * 1.2); _pDummy.updateMatrix();
          addInstPart("fern_b", this.geoFernBush, this.matFern, treeId, false, 0, 0.85, 0);
          addInstPart("fern_b", this.geoFernBush, this.matPalmLeaf, treeId, false, 0.9, 0.65, 0.6, 0, 1.2, 0, 0.78, 0.72, 0.78);
        }
      } else if (isSavChunk) {
        const rotY = this.hash2(t * 11, cx - cz) * Math.PI * 2;
        _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, rotY, 0); _pDummy.scale.set(scale * 1.1, scale * 1.0, scale * 1.1); _pDummy.updateMatrix();
        addInstPart("aca_t", this.geoPalmSeg, this.matAcaciaBark, treeId, false, 0, 2.1, 0, 0, 0, 0, 1.25, 1.55, 1.25);
        addInstPart("aca_c", this.geoAcaciaCanopy, this.matAcaciaLeaf, treeId, false, 0, 4.4, 0);
        addInstPart("aca_c", this.geoAcaciaCanopy, this.matAcaciaLeaf, treeId, false, 1.1, 5.0, 0.6, 0, 0, 0, 0.68, 0.75, 0.68);
        this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "acacia", rx, ry: ryBase, rz, scale, rotY });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.55 * scale, h: 6.2 * scale, kind: "tree", broken: false });
      } else if (isArcChunk) {
        _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, 0, 0); _pDummy.scale.set(scale, scale, scale); _pDummy.updateMatrix();
        if (t % 2 === 0) {
          addInstPart("ice_s", this.geoIceSpire, this.matGlacierIce, treeId, false, 0, 3.6, 0);
          this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "ice", rx, ry: ryBase, rz, scale });
        } else {
          addInstPart("trk", this.geoTrunk, this.matTrunk, treeId, false, 0, 0, 0);
          addInstPart("sp1", this.geoPine1, this.matSnowPine, treeId, false, 0, 0, 0);
          addInstPart("sp2", this.geoPine2, this.matSnowPine, treeId, false, 0, 0, 0);
          this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "snowpine", rx, ry: ryBase, rz, scale });
        }
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.60 * scale, h: 8.5 * scale, kind: "tree", broken: false });
      } else if (isRadChunk || isVolcChunk) {
        const sx = isRadChunk ? 0.75 : 0.85, sy = isRadChunk ? 0.85 : 0.95;
        _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, 0, 0); _pDummy.scale.set(scale * sx, scale * sy, scale * sx); _pDummy.updateMatrix();
        addInstPart("dead_t", this.geoTrunk, this.matObsidian, treeId, false, 0, 0, 0);
        this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "dead", rx, ry: ryBase, rz, scale });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: (isRadChunk ? 0.45 : 0.50) * scale, h: (isRadChunk ? 7.5 : 8.5) * scale, kind: "tree", broken: false });
      } else if (isDesertChunk) {
        _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, 0, 0); _pDummy.scale.set(scale, scale, scale); _pDummy.updateMatrix();
        addInstPart("cac", this.geoCactus, this.matCactus, treeId, false, 0, 0, 0);
        this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: "cactus", rx, ry: ryBase, rz, scale });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.46 * scale, h: 5.8 * scale, kind: "tree", broken: false });
      } else {
        // Towering 3-tier Siberian Taiga Pine (21m to 40m tall!)
        const isSnow = info.height > 210;
        const fMat = isSnow ? this.matSnowPine : this.matPine;
        const pfx = isSnow ? "sp" : "gp";
        _pDummy.position.set(rx, ryBase, rz); _pDummy.rotation.set(0, 0, 0); _pDummy.scale.set(scale, scale, scale); _pDummy.updateMatrix();
        addInstPart("trk", this.geoTrunk, this.matTrunk, treeId, false, 0, 0, 0);
        addInstPart(pfx + "1", this.geoPine1, fMat, treeId, false, 0, 0, 0);
        addInstPart(pfx + "2", this.geoPine2, fMat, treeId, false, 0, 0, 0);
        addInstPart(pfx + "3", this.geoPine3, fMat, treeId, false, 0, 0, 0);
        trees.push({ x: gx, y: info.height + 1.8, z: gz });
        this.treeMeshMap.set(treeId, { instRefs: [], chunkKey, group, style: isSnow ? "snowpine" : "pine", rx, ry: ryBase, rz, scale });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.56 * scale, h: 9.0 * scale, kind: "tree", broken: false });
      }
    }

    const rockCount = Math.floor(4 + bCenter.mountains * 8 + bCenter.desert * 5 + bCenter.volcanic * 9);
    const rockMatrices = [];
    for (let r = 0; r < rockCount; r++) {
      const rx = (this.hash2(cx * 41 + r, cz * 53) - 0.5) * (size - 12);
      const rz = (this.hash2(cx * 61, cz * 71 + r) - 0.5) * (size - 12);
      const gx = startX + size * 0.5 + rx, gz = startZ + size * 0.5 + rz;
      const info = this.getTerrainInfo(gx, gz, false);
      if (info.roadDist < 8.5 || info.surface === "gravel" || info.surface === "race_tarmac" || info.surface === "tarmac_line" || info.surface === "kerb") continue;
      if (KK.ZOLOTOY_CITY && Math.abs(gx - KK.ZOLOTOY_CITY.cx) < (KK.ZOLOTOY_CITY.halfSpan + 28) && Math.abs(gz - KK.ZOLOTOY_CITY.cz) < (KK.ZOLOTOY_CITY.halfSpan + 28)) continue;
      if (this.getMegaBridgeInfo(gx, gz)) continue;
      if (this._getRiverFordInfoInto(gx, gz, this._fordOut).blend > 0.08) continue;

      let blocked = false;
      for (const lm of KK.LANDMARKS) { if (Math.hypot(gx - lm.x, gz - lm.z) < 42) { blocked = true; break; } }
      if (!blocked && KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < KK.CLARKSON_FARM.radius + 12) blocked = true;
      if (!blocked && KK.JAMES_MAY_BAR && Math.hypot(gx - KK.JAMES_MAY_BAR.x, gz - KK.JAMES_MAY_BAR.z) < KK.JAMES_MAY_BAR.radius + 12) blocked = true;
      if (!blocked && KK.HAMMOND_MESA && Math.hypot(gx - KK.HAMMOND_MESA.x, gz - KK.HAMMOND_MESA.z) < KK.HAMMOND_MESA.radius + 20) blocked = true;
      if (!blocked) { for (const pk in this.secretPads) { const sp = this.secretPads[pk]; if (Math.hypot(gx - sp.x, gz - sp.z) < sp.radius + 8) { blocked = true; break; } } }
      if (blocked) continue;

      const rad = 0.85 + this.hash2(cx + r, cz + r) * 1.95;
      if (!this._tmpRockDummy) this._tmpRockDummy = new THREE.Object3D();
      this._tmpRockDummy.position.set(rx, info.height + rad * 0.35, rz);
      this._tmpRockDummy.rotation.set(0, r * 1.3, 0);
      this._tmpRockDummy.scale.set(rad * 1.15, rad * 0.72, rad);
      this._tmpRockDummy.updateMatrix();
      rockMatrices.push(this._tmpRockDummy.matrix.clone());
      // Solid collidable boulder!
      colliders.push({ x: gx, y: info.height, z: gz, r: rad * 0.92, h: rad * 1.15, kind: "rock" });
    }
    if (rockMatrices.length > 0) {
      const rMat = isVolcChunk ? this.matObsidian : (isDesertChunk ? this.matSandRock : this.matRock);
      const rInst = new THREE.InstancedMesh(this.geoRock, rMat, rockMatrices.length);
      for (let i = 0; i < rockMatrices.length; i++) rInst.setMatrixAt(i, rockMatrices[i]);
      rInst.instanceMatrix.needsUpdate = true;
      group.add(rInst);
    }

    // v17.5 WILDFLOWER PATCHES (Taiga Purple Fireweed/Bluebells, Valley Daisies/Dandelions, Tropical Hibiscus!)
    const flCount = (this.gfxPreset === "potato") ? 8 : 22;
    for (let fi = 0; fi < flCount; fi++) {
      const fx = startX + this.hash2(cx * 31 + fi, cz * 17 + 7) * size;
      const fz = startZ + this.hash2(cx * 19 + 11, cz * 29 + fi) * size;
      const tFl = this.getTerrainInfo(fx, fz, false);
      if (!tFl || tFl.waterDepth > 0.05 || tFl.surface === "asphalt" || tFl.surface === "race_tarmac" || tFl.surface === "mud") continue;
      const bw = this.getBiomeWeights(fx, fz);
      if (!bw || bw.desert > 0.35 || bw.arctic > 0.35 || bw.volcanic > 0.35 || bw.mountains > 0.45) continue;
      const flType = Math.floor(this.hash2(cx * 13 + fi * 3, cz * 23 + fi) * 3);
      let pKey, pMat;
      if (bw.taiga > 0.35) {
        pKey = flType === 0 ? "fl_p" : (flType === 1 ? "fl_b" : "fl_w");
        pMat = flType === 0 ? this.matFlPurple : (flType === 1 ? this.matFlBlue : this.matFlWhite);
      } else if (bw.tropical > 0.35) {
        pKey = flType === 0 ? "fl_r" : (flType === 1 ? "fl_y" : "fl_p");
        pMat = flType === 0 ? this.matFlRed : (flType === 1 ? this.matFlYellow : this.matFlPurple);
      } else {
        pKey = flType === 0 ? "fl_y" : (flType === 1 ? "fl_w" : "fl_p");
        pMat = flType === 0 ? this.matFlYellow : (flType === 1 ? this.matFlWhite : this.matFlPurple);
      }
      const rxF = fx - (startX + size * 0.5), rzF = fz - (startZ + size * 0.5);
      const scF = 0.75 + this.hash2(fi, cx + cz) * 0.65;
      _pDummy.position.set(rxF, tFl.height, rzF);
      _pDummy.rotation.set(0, fi * 1.3, 0);
      _pDummy.scale.set(scF, scF, scF);
      _pDummy.updateMatrix();
      addInstPart("fl_s", this.geoFlowerStem, this.matFlowerStem, null, false, 0, 0.16, 0);
      addInstPart(pKey, this.geoFlowerPetal, pMat, null, false, 0, 0.36, 0, 0, 0, 0, 1.0, 0.65, 1.0);
    }

        // BREAKABLE ROADSIDE FENCES & GUARDRAILS (Wooden Post-and-Rail + Corrugated Metal!)
    const fences = [];
    const cMinX = startX, cMaxX = startX + size, cMinZ = startZ, cMaxZ = startZ + size;
    let fenceSeq = 0;
    const fenceSegs = roadSubset || this.roadSegments;
    for (let rIdx = 0; rIdx < fenceSegs.length; rIdx++) {
      const seg = fenceSegs[rIdx];
      if (seg.isCityGrid) continue;
      const si = seg._idx !== undefined ? seg._idx : rIdx;
      if (seg.maxX < cMinX || seg.minX > cMaxX || seg.maxZ < cMinZ || seg.minZ > cMaxZ) continue;
      // Place fences along ~55% of road segments (so some stretches stay open and others are fenced!)
      if (this.hash2(si * 19 + 3, 404) < 0.45) continue;

      const dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 12) continue;
      const ux = dx / segLen, uz = dz / segLen;
      const nx = -uz, nz = ux;
      const yaw = Math.atan2(dx, dz);
      const isMetal = seg.isMountain || (this.hash2(si, 91) > 0.55);
      const offset = seg.width * 0.72 + 1.4;
      const step = 12.0; // Spaced cleanly along shoulder

      for (let dist = 8; dist < segLen - 8; dist += step) {
        const bx = seg.x0 + ux * dist, bz = seg.z0 + uz * dist;
        if (bx < cMinX + 4 || bx > cMaxX - 4 || bz < cMinZ + 4 || bz > cMaxZ - 4) continue;
        // Skip near towns, bridges, rivers, mega-bridge approaches
        let skip = false;
        for (const tw of KK.TOWNS) { if (Math.hypot(bx - tw.x, bz - tw.z) < 92) { skip = true; break; } }
        if (skip) continue;
        if (this.getBridgeInfo(bx, bz)) continue;
        if (this.getMegaBridgeInfo(bx, bz)) continue;
        const rcF = this._getRiverChannelInto(bx, bz, this._riverOut);
        if (rcF.seg && rcF.dist < rcF.seg.halfWidth + 16) continue;

        for (const side of [-1, 1]) {
          fenceSeq++;
          const fenceId = `f_${cx}_${cz}_${si}_${fenceSeq}`;
          if (this.brokenFences.has(fenceId)) continue;
          const fx = bx + nx * side * offset;
          const fz = bz + nz * side * offset;
          // v17.3 Skip fences at road intersections / junctions so fences NEVER block crossing roads!
          let blocksOtherRoad = false;
          for (let oi = 0; oi < fenceSegs.length; oi++) {
            const oseg = fenceSegs[oi];
            if (oseg === seg) continue;
            if (fx < oseg.minX || fx > oseg.maxX || fz < oseg.minZ || fz > oseg.maxZ) continue;
            const odx = oseg.x1 - oseg.x0, odz = oseg.z1 - oseg.z0;
            const olen2 = odx * odx + odz * odz || 1;
            const ot = Math.max(0, Math.min(1, ((fx - oseg.x0) * odx + (fz - oseg.z0) * odz) / olen2));
            const opx = oseg.x0 + odx * ot, opz = oseg.z0 + odz * ot;
            if (Math.hypot(fx - opx, fz - opz) < (oseg.width * 0.95 + 6.5)) { blocksOtherRoad = true; break; }
          }
          if (blocksOtherRoad) continue;
          const fy = this.getTerrainInfo(fx, fz, false).height;

          const frx = fx - (startX + size * 0.5), frz = fz - (startZ + size * 0.5);
          const fYaw = yaw + Math.PI * 0.5;
          _pDummy.position.set(frx, fy, frz); _pDummy.rotation.set(0, fYaw, 0); _pDummy.scale.set(1, 1, 1); _pDummy.updateMatrix();
          const pMat = isMetal ? this.matFenceMetal : this.matFenceWood;
          const pKey = isMetal ? "fp_m" : "fp_w";
          for (const px of [-2.4, 0, 2.4]) {
            addInstPart(pKey, this.geoFencePost, pMat, fenceId, true, px, 0.65, 0);
          }
          if (isMetal) {
            addInstPart("fr_m", this.geoGuardRail, this.matFenceMetal, fenceId, true, 0, 0.85, 0);
          } else {
            addInstPart("fr_w", this.geoFenceRailW, this.matFenceWood, fenceId, true, 0, 1.05, 0);
            addInstPart("fr_w", this.geoFenceRailW, this.matFenceWood, fenceId, true, 0, 0.58, 0);
          }
          this.fenceMeshMap.set(fenceId, { instRefs: [], chunkKey, group, isMetal, rx: frx, ry: fy, rz: frz, yaw: fYaw });
          fences.push({ id: fenceId, x: fx, y: fy, z: fz, ux, uz, halfLen: 2.65, halfThick: 0.16, r: 2.8, isMetal, broken: false });
        }
      }
    }

    // Finalize all batched InstancedMeshes for this chunk (cuts ~1,200+ draw calls -> ~200-350!)
    for (const bk of instBuckets.values()) {
      const cnt = bk.matrices.length;
      if (cnt === 0) continue;
      const im = new THREE.InstancedMesh(bk.geo, bk.mat, cnt);
      for (let i = 0; i < cnt; i++) {
        im.setMatrixAt(i, bk.matrices[i]);
        const ow = bk.owners[i];
        const map = ow.isFence ? this.fenceMeshMap : this.treeMeshMap;
        const entry = map.get(ow.id);
        if (entry && entry.instRefs) entry.instRefs.push({ im, idx: i });
      }
      im.instanceMatrix.needsUpdate = true;
      group.add(im);
    }

    // Precompute chunk-level feature overlap flags so getTerrainInfo fast-path skips bridge/ramp/port loops on >95% of chunks!
    const endX = startX + size, endZ = startZ + size;
    let hasBridge = false;
    if (KK.BRIDGES) {
      for (let i = 0; i < KK.BRIDGES.length; i++) {
        const br = KK.BRIDGES[i];
        const reach = Math.max(br.length * 0.5 + 52.0, 132.0);
        if (br.x + reach >= startX && br.x - reach <= endX && br.z + reach >= startZ && br.z - reach <= endZ) {
          hasBridge = true;
          break;
        }
      }
    }
    let hasRamp = false;
    if (KK.LANDMARKS) {
      for (let i = 0; i < KK.LANDMARKS.length; i++) {
        const lm = KK.LANDMARKS[i];
        if (!lm.hasRamp || lm._baseH === undefined) continue;
        if (lm.x + 36 >= startX && lm.x - 36 <= endX && lm.z + 36 >= startZ && lm.z - 36 <= endZ) {
          hasRamp = true;
          break;
        }
      }
    }
    let hasPort = false;
    if (KK.PORTS) {
      for (let i = 0; i < KK.PORTS.length; i++) {
        const pt = KK.PORTS[i];
        if (pt.x + 76 >= startX && pt.x - 76 <= endX && pt.z + 76 >= startZ && pt.z - 76 <= endZ) {
          hasPort = true;
          break;
        }
      }
    }
    let hasMegaBridge = false;
    if (this.megaBridge) {
      const mb = this.megaBridge;
      if (mb.maxX >= startX && mb.minX <= endX && mb.maxZ >= startZ && mb.minZ <= endZ) {
        // Check tight distance from chunk center to Mega-Bridge axis segment
        const cmx = startX + size * 0.5, cmz = startZ + size * 0.5;
        const along = Math.max(0, Math.min(mb.totalLen, (cmx - mb.startX) * mb.dirX + (cmz - mb.startZ) * mb.dirZ));
        const dMb = Math.hypot(cmx - (mb.startX + mb.dirX * along), cmz - (mb.startZ + mb.dirZ * along));
        if (dMb <= size * 0.85 + mb.halfWidth + 45) hasMegaBridge = true;
      }
    }
    let hasCityOverpass = false;
    if (this.cityOverpasses && this.cityOverpasses.length > 0) {
      for (let i = 0; i < this.cityOverpasses.length; i++) {
        const ov = this.cityOverpasses[i];
        const reach = ov.flatHalf + ov.rampLen + 10;
        if (ov.cx + reach >= startX && ov.cx - reach <= endX && ov.cz + reach >= startZ && ov.cz - reach <= endZ) {
          hasCityOverpass = true;
          break;
        }
      }
    }

    this.rootGroup.add(group);
    this._activeRoadSegs = null;
    this._inChunkBuild = false;
    return {
      group, mesh, heights,
      surfaceCodes: meta ? meta.surfaceCodes : null,
      mudDepths: (meta && meta.hasMud) ? meta.mudDepths : null,
      potholeDepths: (meta && meta.hasPotholes) ? meta.potholeDepths : null,
      waterSurfaceYs: meta ? meta.waterSurfaceYs : null,
      hasBridge, hasRamp, hasPort, hasMegaBridge, hasCityOverpass,
      biomeWeights: bCenter,
      trees, colliders, fences
    };
  }

  getNearbyTownInteraction(gx, gz) {
    if (this.gpGaragePos) {
      const dGp = Math.hypot(gx - this.gpGaragePos.x, gz - this.gpGaragePos.z);
      if (dGp < 22) return { type: "garage", town: { id: 99, name: this.gpGaragePos.name, hasGarage: true, x: this.gpGaragePos.x, z: this.gpGaragePos.z, garageX: this.gpGaragePos.x, garageZ: this.gpGaragePos.z }, dist: dGp };
    }
    for (const tw of KK.TOWNS) {
      const dGarage = Math.hypot(gx - tw.garageX, gz - tw.garageZ);
      if (dGarage < 12) return { type: "garage", town: tw, dist: dGarage };
      const dDock = Math.hypot(gx - tw.dockX, gz - tw.dockZ);
      if (dDock < 14) return { type: "dock", town: tw, dist: dDock };
    }
    return null;
  }

  // v14.4 BULLET / AUTOCANNON / CANNON / ROCKET TREE DAMAGE & FELLING!
  damageTreesAt(gx, gy, gz, dmg = 35, blastRad = 0, dirX = 1, dirZ = 0) {
    const res = { hit: false, broken: [] };
    if (!this.activeColliders || this.activeColliders.length === 0) return res;
    const isBlast = blastRad > 0.5;
    for (let i = 0; i < this.activeColliders.length; i++) {
      const c = this.activeColliders[i];
      if (c.broken || c.kind !== "tree") continue;
      const dx = c.x - gx, dz = c.z - gz;
      const hitR = (c.r || 0.55) + (isBlast ? blastRad : 0.95);
      if (Math.abs(dx) > hitR || Math.abs(dz) > hitR) continue;
      const d = Math.hypot(dx, dz);
      if (d > hitR) continue;
      if (!isBlast && (gy < c.y - 0.5 || gy > c.y + (c.h || 7.5) + 0.8)) continue;
      if (isBlast && Math.abs(gy - c.y) > Math.max(10.0, blastRad * 1.1)) continue;

      res.hit = true;
      const falloff = isBlast ? Math.max(0.25, 1.0 - d / hitR) : 1.0;
      if (typeof c.hp !== "number") c.hp = 100;
      c.hp -= dmg * falloff;
      if (c.hp <= 0) {
        const fx = isBlast && d > 0.2 ? dx : dirX;
        const fz = isBlast && d > 0.2 ? dz : dirZ;
        this.knockDownTree(c.id, fx, fz);
        res.broken.push({ treeId: c.id, x: c.x, y: c.y, z: c.z, dirX: fx, dirZ: fz });
      }
      if (!isBlast) break;
    }
    return res;
  }

  knockDownTree(treeId, dirX = 1, dirZ = 0) {
    if (!treeId || this.brokenTrees.has(treeId)) return;
    this.brokenTrees.add(treeId);
    for (let i = 0; i < this.activeColliders.length; i++) {
      if (this.activeColliders[i].id === treeId) {
        this.activeColliders[i].broken = true;
      }
    }
    const entry = this.treeMeshMap.get(treeId);
    if (entry) {
      let fallMesh = entry.mesh || null;
      if (!fallMesh && entry.instRefs && entry.instRefs.length > 0) {
        if (!this._zeroMat4) this._zeroMat4 = new THREE.Matrix4().makeScale(0, 0, 0);
        for (const ref of entry.instRefs) {
          ref.im.setMatrixAt(ref.idx, this._zeroMat4);
          ref.im.instanceMatrix.needsUpdate = true;
        }
        // Spawn lightweight falling tree mesh so smashing trees looks identical!
        if (entry.group) {
          const tGrp = new THREE.Group();
          const st = entry.style || "pine";
          if (st === "cactus") {
            tGrp.add(new THREE.Mesh(this.geoCactus, this.matCactus));
          } else if (st === "ice") {
            const sp = new THREE.Mesh(this.geoIceSpire, this.matGlacierIce); sp.position.y = 3.6; tGrp.add(sp);
          } else if (st === "dead") {
            tGrp.add(new THREE.Mesh(this.geoTrunk, this.matObsidian));
          } else if (st === "acacia") {
            const trk = new THREE.Mesh(this.geoPalmSeg, this.matAcaciaBark); trk.scale.set(1.25, 1.55, 1.25); trk.position.y = 2.1; tGrp.add(trk);
            const c1 = new THREE.Mesh(this.geoAcaciaCanopy, this.matAcaciaLeaf); c1.position.y = 4.4; tGrp.add(c1);
          } else if (st === "palm") {
            const p1 = new THREE.Mesh(this.geoPalmSeg, this.matPalmTrunk); p1.position.y = 2.8; p1.scale.y = 2.4; tGrp.add(p1);
          } else {
            const fMat = st === "snowpine" ? this.matSnowPine : this.matPine;
            tGrp.add(new THREE.Mesh(this.geoTrunk, this.matTrunk));
            tGrp.add(new THREE.Mesh(this.geoPine1, fMat));
            tGrp.add(new THREE.Mesh(this.geoPine2, fMat));
          }
          const s = entry.scale || 1.0;
          tGrp.scale.set(s, s, s);
          tGrp.position.set(entry.rx, entry.ry, entry.rz);
          entry.group.add(tGrp);
          fallMesh = tGrp;
        }
      }
      if (fallMesh) {
        const len = Math.hypot(dirX, dirZ) || 1;
        this.fallingTrees.push({
          mesh: fallMesh,
          ax: -dirZ / len,
          az: dirX / len,
          angle: 0,
          timer: 2.8
        });
      }
    }
  }

  updateFallingTrees(dt) {
    for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
      const ft = this.fallingTrees[i];
      ft.timer -= dt;
      if (ft.angle < Math.PI * 0.48) {
        ft.angle = Math.min(Math.PI * 0.48, ft.angle + dt * 3.4);
        ft.mesh.rotation.x = ft.ax * ft.angle;
        ft.mesh.rotation.z = ft.az * ft.angle;
      }
      if (ft.timer <= 0) {
        ft.mesh.visible = false;
        this.fallingTrees.splice(i, 1);
      }
    }
  }

  smashFence(fenceId, dirX = 1, dirZ = 0) {
    if (!fenceId || this.brokenFences.has(fenceId)) return;
    this.brokenFences.add(fenceId);
    for (let i = 0; i < this.activeFences.length; i++) {
      if (this.activeFences[i].id === fenceId) this.activeFences[i].broken = true;
    }
    const entry = this.fenceMeshMap.get(fenceId);
    if (entry) {
      let flyMesh = entry.mesh || null;
      if (!flyMesh && entry.instRefs && entry.instRefs.length > 0) {
        if (!this._zeroMat4) this._zeroMat4 = new THREE.Matrix4().makeScale(0, 0, 0);
        for (const ref of entry.instRefs) {
          ref.im.setMatrixAt(ref.idx, this._zeroMat4);
          ref.im.instanceMatrix.needsUpdate = true;
        }
        if (entry.group) {
          const fGrp = new THREE.Group();
          fGrp.position.set(entry.rx, entry.ry, entry.rz);
          fGrp.rotation.y = entry.yaw || 0;
          const pMat = entry.isMetal ? this.matFenceMetal : this.matFenceWood;
          for (const px of [-2.4, 0, 2.4]) {
            const post = new THREE.Mesh(this.geoFencePost, pMat);
            post.position.set(px, 0.65, 0); fGrp.add(post);
          }
          if (entry.isMetal) {
            const rail = new THREE.Mesh(this.geoGuardRail, this.matFenceMetal);
            rail.position.set(0, 0.85, 0); fGrp.add(rail);
          } else {
            const r1 = new THREE.Mesh(this.geoFenceRailW, this.matFenceWood); r1.position.set(0, 1.05, 0); fGrp.add(r1);
            const r2 = new THREE.Mesh(this.geoFenceRailW, this.matFenceWood); r2.position.set(0, 0.58, 0); fGrp.add(r2);
          }
          entry.group.add(fGrp);
          flyMesh = fGrp;
        }
      }
      if (flyMesh) {
        const len = Math.hypot(dirX, dirZ) || 1;
        this.fallingFences.push({
          mesh: flyMesh,
          vx: (dirX / len) * 9.5 + (Math.random() - 0.5) * 3.0,
          vy: 4.2 + Math.random() * 2.5,
          vz: (dirZ / len) * 9.5 + (Math.random() - 0.5) * 3.0,
          rx: (Math.random() - 0.5) * 6.0,
          rz: (Math.random() - 0.5) * 6.0,
          timer: 2.2
        });
      }
    }
  }

  updateFallingFences(dt) {
    for (let i = this.fallingFences.length - 1; i >= 0; i--) {
      const ff = this.fallingFences[i];
      ff.timer -= dt;
      ff.vy -= 14.0 * dt;
      ff.mesh.position.x += ff.vx * dt;
      ff.mesh.position.y += ff.vy * dt;
      ff.mesh.position.z += ff.vz * dt;
      ff.mesh.rotation.x += ff.rx * dt;
      ff.mesh.rotation.z += ff.rz * dt;
      if (ff.timer <= 0) {
        ff.mesh.visible = false;
        this.fallingFences.splice(i, 1);
      }
    }
  }

  getNearbyLandmark(gx, gz) {
    for (const lm of KK.LANDMARKS) {
      const d = Math.hypot(gx - lm.x, gz - lm.z);
      if (d < lm.interactRadius) return { landmark: lm, dist: d };
    }
    return null;
  }
};
