// ============================================================================
// js/world.js (v6) — Zero-Leak Shared Geometries, Red Sands Desert Biome,
// Collidable Trees & Rocks, 7 3D Landmarks & Driveable Stunt Ramps!
// ============================================================================
window.KK = window.KK || {};

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
    this.bridgeMeshes = new Map();
    this.townGroups = new Map();
    this.settlementAnims = [];
    this.townNightLights = [];
    this.landmarkGroups = new Map();
    this.waterMeshes = [];
    this.roadSegments = [];
    this.riverSegments = [];
    this.winchTrees = [];
    this.activeColliders = []; // Collidable trees, rocks, cacti & landmark pillars!
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

    this._buildRoadNetwork();
    this._buildRiverNetwork();
    this._computeTownAndLandmarkElevations();
    this._initSharedAssets();
    this._buildTowns();
    this._buildBridges();
    this._buildRivers();
    this._buildLandmarks();
    this._buildTarmacDetails();
    this._buildOceanAndFarIslands();
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
  getIslandInfo(gx, gz) {
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
    return { mask: bestMask, island: bestIsl };
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

  getBiomeWeights(gx, gz) {
    const islInfo = this.getIslandInfo(gx, gz);
    const isl = islInfo.island;

    // Outer Islands (Tropical Jungle, Golden Savanna, Arctic Glacier, Black Rock Volcanic Fortress)
    if (isl && isl.id !== 0 && islInfo.mask > 0.02) {
      const m = islInfo.mask;
      const isTrop = isl.biome === "tropical" ? m : 0;
      const isSav  = isl.biome === "savanna" ? m : 0;
      const isArc  = isl.biome === "arctic" ? m : 0;
      const isVolc = isl.biome === "volcanic_isle" ? m : 0;
      return {
        mountains: isArc * 0.55,
        taiga: 0,
        desert: 0,
        volcanic: isVolc,
        rust: 0,
        tropical: isTrop,
        savanna: isSav,
        arctic: isArc,
        ocean: 1.0 - m
      };
    }

    // Open Ocean outside all islands
    if (!isl || islInfo.mask <= 0.02) {
      return { mountains: 0, taiga: 0, desert: 0, volcanic: 0, rust: 0, tropical: 0, savanna: 0, arctic: 0, ocean: 1.0 };
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
    return { mountains, taiga, desert, volcanic, rust, tropical: 0, savanna: 0, arctic: 0, ocean: 1.0 - islInfo.mask };
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

  _buildRoadNetwork() {
    this.roadSegments = [];
    for (const [ia, ib] of KK.ROAD_LINKS) {
      const a = KK.TOWNS[ia], b = KK.TOWNS[ib];
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const isMountain = (a.biome === "mountains" || b.biome === "mountains");
      const steps = Math.max(6, Math.min(48, Math.floor(dist / 900)));
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        let px = a.x + (b.x - a.x) * t;
        let pz = a.z + (b.z - a.z) * t;
        const env = Math.sin(t * Math.PI);
        if (env > 0.05 && dist > 2000) {
          const dx = (b.x - a.x) / dist, dz = (b.z - a.z) / dist;
          const nx = -dz, nz = dx;
          const freq = isMountain ? 6.0 : 2.5;
          const amp = isMountain ? Math.min(850, dist * 0.045) : Math.min(420, dist * 0.025);
          const midPin = Math.abs(t - 0.5) < 0.14 ? (Math.abs(t - 0.5) / 0.14) : 1.0;
          const wobble = Math.sin(t * Math.PI * freq) * amp * env * midPin;
          px += nx * wobble; pz += nz * wobble;
        }
        pts.push({ x: px, z: pz });
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i], p1 = pts[i + 1];
        this.roadSegments.push({
          x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z,
          minX: Math.min(p0.x, p1.x) - 45, maxX: Math.max(p0.x, p1.x) + 45,
          minZ: Math.min(p0.z, p1.z) - 45, maxZ: Math.max(p0.z, p1.z) + 45,
          isMountain, width: isMountain ? 5.6 : 7.4
        });
      }
    }
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
        const steps = Math.max(4, Math.min(36, Math.floor(dist / 320)));
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
          chain.push({ x: px, z: pz, y: this._computeNaturalGroundHeight(px, pz) - 1.15 });
        }
      }
      const last = pts[pts.length - 1];
      chain.push({ x: last.x, z: last.z, y: this._computeNaturalGroundHeight(last.x, last.z) - 1.15 });

      // 6 passes of Laplacian elevation smoothing along the river spline so water flows smoothly with ZERO cliffs!
      for (let pass = 0; pass < 6; pass++) {
        const nextY = new Float32Array(chain.length);
        nextY[0] = chain[0].y;
        nextY[chain.length - 1] = chain[chain.length - 1].y;
        for (let k = 1; k < chain.length - 1; k++) {
          nextY[k] = chain[k - 1].y * 0.25 + chain[k].y * 0.50 + chain[k + 1].y * 0.25;
        }
        for (let k = 0; k < chain.length; k++) chain[k].y = nextY[k];
      }

      if (this.riverSplines.length > 0) {
        const mainChain = this.riverSplines[0].chain;
        let bestJ = mainChain[0], bestJD = 999999;
        for (const mn of mainChain) {
          const d = Math.hypot(mn.x - chain[0].x, mn.z - chain[0].z);
          if (d < bestJD) { bestJD = d; bestJ = mn; }
        }
        if (bestJD < 350) {
          const deltaY = bestJ.y - chain[0].y;
          for (let k = 0; k < Math.min(8, chain.length); k++) {
            chain[k].y += deltaY * (1.0 - k / 8.0);
          }
        }
      }

      this.riverSplines.push({ id: rp.id, halfWidth: rp.halfWidth, depth: rp.depth, chain });
      const pad = rp.halfWidth + 52;
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
  }

  getRiverChannel(gx, gz) {
    let bestD = 999999, bestSeg = null, bestCx = gx, bestCz = gz, bestWaterY = -9999;
    for (let i = 0; i < this.riverSegments.length; i++) {
      const s = this.riverSegments[i];
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
    return { dist: bestD, seg: bestSeg, cx: bestCx, cz: bestCz, waterY: bestWaterY };
  }

  getRiverFordInfo(gx, gz) {
    if (!KK.RIVER_FORDS) return { blend: 0, depth: 4.5, ford: null };
    let maxB = 0, bestDepth = 0.62, bestFord = null;
    for (let i = 0; i < KK.RIVER_FORDS.length; i++) {
      const fd = KK.RIVER_FORDS[i];
      const d = Math.hypot(gx - fd.x, gz - fd.z);
      const outer = fd.radius + 22;
      if (d < outer) {
        const u = d <= fd.radius ? 1.0 : Math.max(0, 1.0 - (d - fd.radius) / 22.0);
        const b = u * u * (3 - 2 * u);
        if (b > maxB) { maxB = b; bestDepth = fd.depth; bestFord = fd; }
      }
    }
    return { blend: maxB, depth: bestDepth, ford: bestFord };
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
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0d4f73, emissive: 0x041d2e, roughness: 0.22, metalness: 0.35,
      transparent: true, opacity: 0.88
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
    this.geoAcaciaCanopy = new THREE.CylinderGeometry(3.8, 2.2, 0.95, 8);
    this.geoIceSpire = new THREE.ConeGeometry(1.1, 7.8, 6);
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
    this.geoFenceRailW = new THREE.BoxGeometry(5.6, 0.14, 0.10);
    this.geoGuardRail  = new THREE.BoxGeometry(5.8, 0.34, 0.14);
    this.geoBrokenSlab = new THREE.BoxGeometry(3.4, 0.35, 2.2);
  }

  // Pure procedural ground height BEFORE town/landmark/tarmac flattening
  _computeNaturalGroundHeight(gx, gz) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const seaFloor = seaL - 28.0; // -60m deep ocean bed
    const islInfo = this.getIslandInfo(gx, gz);
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
        // Lush emerald jungle ridges & volcanic emerald spine + gentle sandy beaches!
        landH += Math.pow(ridge, 1.55) * (isl.peakH || 140) * mask;
      } else if (isl.biome === "savanna") {
        // Wide golden rolling grasslands + flat-top mesa plateaus!
        const mesaRaw = Math.pow(ridge, 1.35) * (isl.peakH || 90);
        const mesaFlat = Math.min(mesaRaw, 58) + Math.max(0, mesaRaw - 58) * 0.18;
        landH += mesaFlat * mask;
      } else if (isl.biome === "arctic") {
        // Dramatic jagged alpine glacier peaks + frozen coastal ice shelf!
        landH += Math.pow(ridge, 1.65) * (isl.peakH || 210) * mask + 14 * mask;
      } else if (isl.biome === "volcanic_isle") {
        // Sheer obsidian sea-cliffs & caldera peak on Site-140 Black Rock!
        landH += Math.pow(ridge, 1.25) * (isl.peakH || 130) * mask + 18 * mask;
      }

      // Smooth coastal beach drop-off into ocean floor
      const coastBlend = Math.min(1.0, mask * 1.45);
      const cb = coastBlend * coastBlend * (3 - 2 * coastBlend);
      return seaFloor * (1 - cb) + landH * cb;
    }

    // ISLAND 1: CLASSIC KRASNO-KAMENKA MAINLAND (100% untouched interior!)
    const b = this.getBiomeWeights(gx, gz);
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

  // Query Smooth High-Grip Tarmac Proving Grounds & Oval Track
  getSmoothTarmacInfo(gx, gz) {
    if (!KK.SMOOTH_TARMAC_ZONES) return null;
    for (const tz of KK.SMOOTH_TARMAC_ZONES) {
      const dx = gx - tz.cx, dz = gz - tz.cz;
      const bound = Math.max(tz.rx, tz.rz) + 85;
      if (Math.abs(dx) > bound || Math.abs(dz) > bound) continue;
      const c = Math.cos(-tz.yaw), s = Math.sin(-tz.yaw);
      const lx = dx * c - dz * s;
      const lz = dx * s + dz * c;

      // Distance from smooth oval racetrack centerline (normalized ellipse radius = 1.0)
      const ellR = Math.hypot(lx / tz.rx, lz / tz.rz);
      const avgR = (tz.rx + tz.rz) * 0.5;
      const distFromTrack = Math.abs(ellR - 1.0) * avgR;
      const halfTrack = tz.trackWidth * 0.5;

      // Also include a wide central skidpad & access straight on the East side toward HQ!
      const onSkidpad = (Math.abs(lx) < 95 && Math.abs(lz) < 65);
      const onAccess = (lx >= 0 && lx <= tz.rx + 18 && Math.abs(lz) <= 9.5);
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

  getBaseHeight(gx, gz) {
    let h = this._computeNaturalGroundHeight(gx, gz);

    // Smooth Town Plateau Blending (matches exact natural surrounding average -> ZERO holes!)
    for (let i = 0; i < KK.TOWNS.length; i++) {
      const t = KK.TOWNS[i];
      const d = Math.hypot(gx - t.x, gz - t.z);
      if (d < 185 && t._baseH !== undefined) {
        const blend = d < 92 ? 1.0 : (1.0 - (d - 92) / 93);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + t._baseH * s;
      }
    }

    // Smooth Landmark Pad Blending (exact natural surrounding average -> ZERO holes!)
    for (let i = 0; i < KK.LANDMARKS.length; i++) {
      const lm = KK.LANDMARKS[i];
      const d = Math.hypot(gx - lm.x, gz - lm.z);
      if (d < 64 && lm._baseH !== undefined) {
        const blend = d < 28 ? 1.0 : (1.0 - (d - 28) / 36);
        const s = blend * blend * (3 - 2 * blend);
        h = h * (1 - s) + lm._baseH * s;
      }
    }

    // Glass-smooth Krasny-Ring Tarmac Proving Grounds flattening
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
      h += this.getCraterOffset(gx, gz).off;
    }

    return h;
  }

  getNearestRoad(gx, gz) {
    let bestDist = 999999, bestSeg = null, bestCx = gx, bestCz = gz;
    for (let i = 0; i < this.roadSegments.length; i++) {
      const s = this.roadSegments[i];
      if (gx < s.minX || gx > s.maxX || gz < s.minZ || gz > s.maxZ) continue;
      const vx = s.x1 - s.x0, vz = s.z1 - s.z0;
      const len2 = vx * vx + vz * vz;
      let t = len2 > 0 ? ((gx - s.x0) * vx + (gz - s.z0) * vz) / len2 : 0;
      t = Math.max(0, Math.min(1, t));
      const cx = s.x0 + vx * t, cz = s.z0 + vz * t;
      const d = Math.hypot(gx - cx, gz - cz);
      if (d < bestDist) { bestDist = d; bestSeg = s; bestCx = cx; bestCz = cz; }
    }
    return { dist: bestDist, seg: bestSeg, cx: bestCx, cz: bestCz };
  }

  getPotholeDepth(gx, gz, roadDist, seg) {
    if (!seg || roadDist > seg.width * 0.65) return 0;
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
    const chunk = this.chunks.get(cx + "," + cz);
    if (!chunk || !chunk.heights) return null;

    const fx = ((gx - cx * size) / size) * segs;
    const fz = ((gz - cz * size) / size) * segs;
    const ix = Math.max(0, Math.min(segs - 1, Math.floor(fx)));
    const iz = Math.max(0, Math.min(segs - 1, Math.floor(fz)));
    const u = Math.max(0, Math.min(1, fx - ix));
    const v = Math.max(0, Math.min(1, fz - iz));

    const stride = segs + 1;
    const H = chunk.heights;
    const hA = H[iz * stride + ix];             // (0,0)
    const hD = H[iz * stride + (ix + 1)];       // (1,0)
    const hB = H[(iz + 1) * stride + ix];       // (0,1)
    const hC = H[(iz + 1) * stride + (ix + 1)]; // (1,1)

    // Matches Three.js PlaneGeometry diagonal split (b,d): u+v <= 1 vs u+v > 1!
    if (u + v <= 1.0) {
      return hA + u * (hD - hA) + v * (hB - hA);
    } else {
      return hC + (1.0 - u) * (hB - hC) + (1.0 - v) * (hD - hC);
    }
  }

  // Full deterministic terrain + bridge + ramp query
  getTerrainInfo(gx, gz, forVehicle = true, refY = Infinity) {
    const b = this.getBiomeWeights(gx, gz);
    let h = this.getBaseHeight(gx, gz);
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
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
    const road = this.getNearestRoad(gx, gz);
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
        surface = road.seg.isMountain ? "shale" : "asphalt";
        if (abutSuppress < 0.15) {
          potholeDepth = this.getPotholeDepth(gx, gz, road.dist, road.seg);
          h -= potholeDepth;
        }
      } else if (road.dist < road.seg.width * 0.95) {
        surface = "gravel";
      }
    }

    // 2. Continuous Great Krasnaya River (GENTLER Driveable Banks + Smooth Contained Water + Shallow Fords!)
    const rc = this.getRiverChannel(gx, gz);
    if (rc.seg && rc.dist < rc.seg.halfWidth + 48) {
      const rWaterY = rc.waterY;
      const hw = rc.seg.halfWidth;
      const ford = this.getRiverFordInfo(gx, gz);
      const targetDepth = rc.seg.depth * (1.0 - ford.blend) + ford.depth * ford.blend;
      const bedY = rWaterY - targetDepth;
      const bankTopY = rWaterY + (ford.blend > 0.35 ? 0.85 : 1.15);

      if (rc.dist > hw * 0.90 && rc.dist < hw + 46 && abutSuppress < 0.5) {
        const dRim = Math.abs(rc.dist - (hw + 22.0));
        const rimU = Math.max(0, 1.0 - dRim / 24.0);
        const rimBlend = rimU * rimU * (3 - 2 * rimU) * (1.0 - abutSuppress);
        if (h < bankTopY) h = h * (1.0 - rimBlend) + bankTopY * rimBlend;
      }

      // Wide gentle concave beach/bank slope (hw*0.52 -> hw+32) so BTR-80 & 4x4s drive cleanly up riverbanks!
      let channelBlend = 0;
      if (rc.dist <= hw * 0.52) channelBlend = 1.0;
      else if (rc.dist < hw + 32.0) {
        const u = 1.0 - (rc.dist - hw * 0.52) / (hw * 0.48 + 32.0);
        channelBlend = u * u * (3 - 2 * u);
      }
      const effBlend = channelBlend * (1.0 - abutSuppress);
      if (effBlend > 0.001) h = h * (1.0 - effBlend) + bedY * effBlend;

      if (h < rWaterY && rc.dist < hw + 22 && abutSuppress < 0.5) {
        waterSurfaceY = Math.max(waterSurfaceY, rWaterY);
        waterDepth = Math.max(waterDepth, rWaterY - h);
        surface = (ford.blend > 0.30 || waterDepth < 0.9) ? "gravel" : "mud";
        if (ford.blend > 0.30 || waterDepth < 0.9) mudDepth = 0;
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

    // 4. Mud Bogs
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

    // 6. For physics queries (`forVehicle = true`), SNAP base ground height to the EXACT rendered chunk triangle!
    //    This guarantees ZERO visual/physics mismatch on mountains, slopes, hills, or bridge approaches!
    if (forVehicle) {
      const meshH = this.getRenderedChunkHeight(gx, gz);
      if (meshH !== null) {
        h = meshH;
        if (waterSurfaceY > -5000 && h < waterSurfaceY) waterDepth = waterSurfaceY - h;
        else if (waterSurfaceY > -5000 && h >= waterSurfaceY) waterDepth = 0;
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

    return { height: h, surface, roadDist: road.dist, potholeDepth, mudDepth, waterDepth, waterSurfaceY, onBridge, bridgeHit };
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

      const gX = 24, gZ = -18;
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

      const dX = -22, dZ = -14;
      const dockBase = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 8), this.matWoodDark);
      dockBase.position.set(dX, 0.55, dZ); dockBase.castShadow = true; grp.add(dockBase);
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

  // Visual Start/Finish Gantry at Krasny-Ring Smooth Tarmac & Hazard Signs at Shattered Hell-Roads!
  _buildTarmacDetails() {
    const matPillar = new THREE.MeshStandardMaterial({ color: 0xe6ebef, roughness: 0.5 });
    const matBanner = new THREE.MeshStandardMaterial({ color: 0x0088cc, roughness: 0.4 });
    const matWarn   = new THREE.MeshStandardMaterial({ color: 0xffb703, roughness: 0.6 });

    if (KK.SMOOTH_TARMAC_ZONES) {
      for (const tz of KK.SMOOTH_TARMAC_ZONES) {
        const g = new THREE.Group();
        const c = Math.cos(tz.yaw), s = Math.sin(tz.yaw);
        const gx = tz.cx + c * tz.rx, gz = tz.cz + s * tz.rx;
        g.position.set(gx, tz._baseH || 10, gz);
        g.rotation.y = -tz.yaw + Math.PI * 0.5;
        for (const sx of [-9.5, 9.5]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.5, 0.9), matPillar);
          p.position.set(sx, 4.25, 0); g.add(p);
        }
        const top = new THREE.Mesh(new THREE.BoxGeometry(20.5, 1.8, 1.2), matBanner);
        top.position.set(0, 8.2, 0); g.add(top);
        this.rootGroup.add(g);
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
    if (chunkObj.mesh && chunkObj.mesh.geometry) {
      chunkObj.mesh.geometry.dispose();
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
          this.chunks.set(key, this._createChunk(cx, cz));
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

  getCraterOffset(gx, gz) {
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
    return { off, scorch };
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
            curb.castShadow = true;
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

      // DYNAMIC BANK-GAP FILLING: March outward on left & right banks until ground rises safely above waterY + 0.65m,
      // then tuck +4.5m into the rising bank so there is NEVER an air gap between water and riverbank!
      const findBankEdge = (cx, cz, waterY, dirX, dirZ) => {
        let dist = hwBase * 0.95;
        const maxDist = hwBase + 34.0;
        while (dist < maxDist) {
          const th = this.getTerrainInfo(cx + dirX * dist, cz + dirZ * dist, false).height;
          if (th > waterY + 0.65) break;
          dist += 2.5;
        }
        return Math.min(hwBase + 38.0, dist + 5.5);
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

    // 3. Visual Red/White Depth-Gauge Guide Poles at every Shallow Cobble Ford!
    if (KK.RIVER_FORDS) {
      const matPoleW = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, roughness: 0.7 });
      const matPoleR = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
      const matFordBeacon = new THREE.MeshBasicMaterial({ color: 0x38d9f5, transparent: true, opacity: 0.38 });
      for (const fd of KK.RIVER_FORDS) {
        const rc = this.getRiverChannel(fd.x, fd.z);
        const wy = rc.seg ? rc.waterY : this.getBaseHeight(fd.x, fd.z);
        const s = rc.seg;
        let nx = 0, nz = 1;
        if (s) {
          const dx = s.x1 - s.x0, dz = s.z1 - s.z0;
          const l = Math.hypot(dx, dz) || 1;
          nx = -dz / l; nz = dx / l;
        }
        const fGrp = new THREE.Group();
        fGrp.position.set(fd.x, wy, fd.z);
        const span = (rc.seg ? rc.seg.halfWidth : 22) + 4.5;
        for (const side of [-1, 1]) {
          for (const off of [-8, 8]) {
            const px = nx * side * span - nz * off;
            const pz = nz * side * span + nx * off;
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 3.8, 6), matPoleW);
            pole.position.set(px, 1.4, pz); fGrp.add(pole);
            const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.75, 6), matPoleR);
            tip.position.set(px, 3.0, pz); fGrp.add(tip);
          }
        }
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 18, 6), matFordBeacon);
        bcn.position.set(nx * span, 9.0, nz * span);
        fGrp.add(bcn);
        this.rootGroup.add(fGrp);
      }
    }
  }

  updateChunks(playerGx, playerGz, force = false) {
    const pcx = Math.floor(playerGx / KK.CHUNK_SIZE);
    const pcz = Math.floor(playerGz / KK.CHUNK_SIZE);
    if (this.oceanMesh) {
      this.oceanMesh.position.set(playerGx, KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0, playerGz);
    }
    if (this.farIslandsGroup && KK.ISLANDS) {
      let cIdx = 0;
      for (const isl of KK.ISLANDS) {
        if (isl.id === 0) continue;
        const m = this.farIslandsGroup.children[cIdx++];
        if (m) m.visible = (Math.hypot(playerGx - isl.cx, playerGz - isl.cz) > Math.max(isl.rx, isl.rz) * 1.12);
      }
    }
    if (!force && pcx === this._lastCcx && pcz === this._lastCcz) return;
    this._lastCcx = pcx; this._lastCcz = pcz;

    const needed = new Set(), R = KK.CHUNK_RADIUS;
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const cx = pcx + dx, cz = pcz + dz, key = cx + "," + cz;
        needed.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this._createChunk(cx, cz));
      }
    }
    for (const [key, chunk] of this.chunks.entries()) {
      if (!needed.has(key)) {
        this.rootGroup.remove(chunk.group);
        chunk.mesh.geometry.dispose();
        for (const col of chunk.colliders) { if (col.id) this.treeMeshMap.delete(col.id); }
        if (chunk.fences) { for (const fn of chunk.fences) this.fenceMeshMap.delete(fn.id); }
        this.chunks.delete(key);
      }
    }
    this.winchTrees = [];
    this.activeColliders = [];
    this.activeFences = [];
    for (const chunk of this.chunks.values()) {
      for (const tr of chunk.trees) this.winchTrees.push(tr);
      for (const col of chunk.colliders) this.activeColliders.push(col);
      if (chunk.fences) { for (const fn of chunk.fences) if (!fn.broken) this.activeFences.push(fn); }
    }
  }

  _createChunk(cx, cz) {
    const size = KK.CHUNK_SIZE, segs = KK.CHUNK_SEGMENTS;
    const startX = cx * size, startZ = cz * size;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const heights = new Float32Array(pos.count);
    const colors = new Float32Array(pos.count * 3);
    const col = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const gx = startX + size * 0.5 + pos.getX(i);
      const gz = startZ + size * 0.5 + pos.getZ(i);
      const info = this.getTerrainInfo(gx, gz, false);
      pos.setY(i, info.height);
      heights[i] = info.height;

      const b = this.getBiomeWeights(gx, gz);
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
      else if (info.surface === "gravel") col.setRGB(0.45, 0.42, 0.36);
      else if (info.surface === "mud") col.setRGB(0.24, 0.17, 0.11);
      else if (info.surface === "volcanic") {
        // Dark volcanic ash & glowing magma veins across Mt. Vulkan Caldera!
        const vein = Math.abs(Math.sin(gx * 0.032 + Math.cos(gz * 0.028) * 2.5));
        if (vein < 0.07) col.setRGB(0.95, 0.28, 0.04); // glowing molten crack!
        else {
          const vv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
          col.setRGB(0.15 + vv, 0.13 + vv, 0.14 + vv);
        }
      } else if (info.surface === "sand") {
        const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.07;
        col.setRGB(0.76 + sv, 0.54 + sv, 0.30 + sv);
      } else if (info.surface === "rock" || info.height > 175) {
        if (info.height > 260) col.setRGB(0.86, 0.90, 0.94); // Snowy Abominable Snowman peaks!
        else col.setRGB(0.38, 0.38, 0.40);
      } else if (KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < KK.CLARKSON_FARM.radius) {
        const v = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.05;
        col.setRGB(0.24 + v, 0.48 + v, 0.18 + v);
      } else {
        if (info.surface === "snow" || (b.arctic || 0) > 0.42) {
          const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.04;
          col.setRGB(0.84 + sv, 0.90 + sv, 0.96 + sv);
        } else if ((b.tropical || 0) > 0.35) {
          const tv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.06;
          col.setRGB(0.11 + tv * 0.5, 0.44 + tv, 0.15 + tv * 0.5);
        } else if ((b.savanna || 0) > 0.35) {
          const sv = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.06;
          col.setRGB(0.68 + sv, 0.56 + sv * 0.8, 0.22 + sv * 0.4);
        } else {
          const r = 0.28 * b.rust + 0.16 * b.taiga + 0.72 * b.desert + 0.36 * b.mountains;
          const g = 0.33 * b.rust + 0.28 * b.taiga + 0.52 * b.desert + 0.34 * b.mountains;
          const bl = 0.18 * b.rust + 0.15 * b.taiga + 0.28 * b.desert + 0.32 * b.mountains;
          const v = (this.hash2(Math.floor(gx), Math.floor(gz)) - 0.5) * 0.06;
          col.setRGB(Math.max(0.05, r + v), Math.max(0.05, g + v), Math.max(0.05, bl + v));
        }
      }
      if (this.craters.length > 0) {
        const sc = this.getCraterOffset(gx, gz).scorch;
        if (sc > 0.02) {
          col.r = col.r * (1 - sc * 0.72) + 0.08 * sc;
          col.g = col.g * (1 - sc * 0.74) + 0.07 * sc;
          col.b = col.b * (1 - sc * 0.76) + 0.06 * sc;
        }
      }
      colors[i * 3] = col.r; colors[i * 3 + 1] = col.g; colors[i * 3 + 2] = col.b;
    }

    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const group = new THREE.Group();
    group.position.set(startX + size * 0.5, 0, startZ + size * 0.5);
    const mesh = new THREE.Mesh(geo, this.matTerrain);
    mesh.receiveShadow = true;
    group.add(mesh);

    const trees = [];
    const colliders = [];
    const bCenter = this.getBiomeWeights(startX + size * 0.5, startZ + size * 0.5);
    const isDesertChunk = bCenter.desert > 0.55;
    const isVolcChunk = bCenter.volcanic > 0.45;
    const isTropChunk = (bCenter.tropical || 0) > 0.40;
    const isSavChunk  = (bCenter.savanna || 0) > 0.40;
    const isArcChunk  = (bCenter.arctic || 0) > 0.40;
    const isOceanChunk = (bCenter.ocean || 0) > 0.88;
    const treeCount = isOceanChunk ? 0 : (isTropChunk ? 18 : (isSavChunk ? 7 : (isArcChunk ? 6 : (isVolcChunk ? 3 : (isDesertChunk ? 5 : Math.floor(8 + bCenter.taiga * 15 + bCenter.rust * 4))))));
    const chunkKey = cx + "," + cz;

    for (let t = 0; t < treeCount; t++) {
      const treeId = `${cx}_${cz}_${t}`;
      if (this.brokenTrees.has(treeId)) continue; // Already smashed down!
      const rx = (this.hash2(cx * 31 + t, cz * 17) - 0.5) * (size - 10);
      const rz = (this.hash2(cx * 13, cz * 29 + t) - 0.5) * (size - 10);
      const gx = startX + size * 0.5 + rx, gz = startZ + size * 0.5 + rz;
      const info = this.getTerrainInfo(gx, gz, false);
      const aChk = this.getAirstripInfo(gx, gz);
      if (info.roadDist < 12 || info.waterDepth > 0.1 || info.height > 290 || info.surface === "race_tarmac" || info.surface === "kerb" || info.surface === "tarmac_line" || (aChk && aChk.blend > 0.1)) continue;

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
      const tGrp = new THREE.Group();
      if (isTropChunk) {
        // Curved Tropical Jungle Palm Tree with 6 splayed emerald fronds!
        const lean = 0.14 + this.hash2(cx + t, cz - t) * 0.16;
        const p1 = new THREE.Mesh(this.geoPalmSeg, this.matPalmTrunk);
        p1.position.set(0, 1.35, 0); p1.rotation.z = lean * 0.5; tGrp.add(p1);
        const p2 = new THREE.Mesh(this.geoPalmSeg, this.matPalmTrunk);
        p2.position.set(-lean * 1.4, 4.0, 0); p2.rotation.z = lean; tGrp.add(p2);
        const p3 = new THREE.Mesh(this.geoPalmSeg, this.matPalmTrunk);
        p3.position.set(-lean * 3.8, 6.5, 0); p3.rotation.z = lean * 1.2; tGrp.add(p3);
        const crownX = -lean * 5.2, crownY = 7.9;
        for (let f = 0; f < 6; f++) {
          const fa = (f / 6) * Math.PI * 2;
          const fr = new THREE.Mesh(this.geoPalmFrond, this.matPalmLeaf);
          fr.position.set(crownX + Math.sin(fa) * 1.5, crownY - 0.15, Math.cos(fa) * 1.5);
          fr.rotation.y = fa; fr.rotation.x = 0.34;
          tGrp.add(fr);
        }
        tGrp.rotation.y = this.hash2(t * 7, cx + cz) * Math.PI * 2;
        tGrp.scale.set(scale * 1.05, scale * 1.15, scale * 1.05);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.42 * scale, h: 9.0 * scale, kind: "tree", mesh: tGrp, broken: false });
      } else if (isSavChunk) {
        // Wide Flat-Topped African Savanna Acacia Tree!
        const trk = new THREE.Mesh(this.geoPalmSeg, this.matAcaciaBark);
        trk.scale.set(1.25, 1.55, 1.25); trk.position.set(0, 2.1, 0); tGrp.add(trk);
        const can1 = new THREE.Mesh(this.geoAcaciaCanopy, this.matAcaciaLeaf);
        can1.position.set(0, 4.4, 0); tGrp.add(can1);
        const can2 = new THREE.Mesh(this.geoAcaciaCanopy, this.matAcaciaLeaf);
        can2.scale.set(0.68, 0.75, 0.68); can2.position.set(1.1, 5.0, 0.6); tGrp.add(can2);
        tGrp.rotation.y = this.hash2(t * 11, cx - cz) * Math.PI * 2;
        tGrp.scale.set(scale * 1.1, scale * 1.0, scale * 1.1);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.55 * scale, h: 6.2 * scale, kind: "tree", mesh: tGrp, broken: false });
      } else if (isArcChunk) {
        // Arctic Glacier Ice Spire / Frost-Laden Pine!
        if (t % 2 === 0) {
          const spire = new THREE.Mesh(this.geoIceSpire, this.matGlacierIce);
          spire.position.set(0, 3.6, 0); tGrp.add(spire);
        } else {
          tGrp.add(new THREE.Mesh(this.geoTrunk, this.matTrunk));
          tGrp.add(new THREE.Mesh(this.geoPine1, this.matSnowPine));
          tGrp.add(new THREE.Mesh(this.geoPine2, this.matSnowPine));
        }
        tGrp.scale.set(scale, scale, scale);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.60 * scale, h: 8.5 * scale, kind: "tree", mesh: tGrp, broken: false });
      } else if (isDesertChunk) {
        const cMesh = new THREE.Mesh(this.geoCactus, this.matCactus);
        tGrp.add(cMesh);
        tGrp.scale.set(scale, scale, scale);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.46 * scale, h: 5.8 * scale, kind: "tree", mesh: tGrp, broken: false });
      } else if (isVolcChunk) {
        const trunk = new THREE.Mesh(this.geoTrunk, this.matObsidian);
        tGrp.add(trunk);
        tGrp.scale.set(scale * 0.85, scale * 0.95, scale * 0.85);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.50 * scale, h: 8.5 * scale, kind: "tree", mesh: tGrp, broken: false });
      } else {
        // Towering 3-tier Siberian Taiga Pine (21m to 40m tall!)
        const trunk = new THREE.Mesh(this.geoTrunk, this.matTrunk);
        tGrp.add(trunk);
        const foliageMat = info.height > 210 ? this.matSnowPine : this.matPine;
        tGrp.add(new THREE.Mesh(this.geoPine1, foliageMat));
        tGrp.add(new THREE.Mesh(this.geoPine2, foliageMat));
        tGrp.add(new THREE.Mesh(this.geoPine3, foliageMat));
        tGrp.scale.set(scale, scale, scale);
        tGrp.position.set(rx, info.height - 0.15, rz);
        group.add(tGrp);
        trees.push({ x: gx, y: info.height + 1.8, z: gz });
        this.treeMeshMap.set(treeId, { mesh: tGrp, chunkKey });
        colliders.push({ id: treeId, x: gx, y: info.height, z: gz, r: 0.56 * scale, h: 9.0 * scale, kind: "tree", mesh: tGrp, broken: false });
      }
    }

    const rockCount = Math.floor(4 + bCenter.mountains * 8 + bCenter.desert * 5 + bCenter.volcanic * 9);
    for (let r = 0; r < rockCount; r++) {
      const rx = (this.hash2(cx * 41 + r, cz * 53) - 0.5) * (size - 12);
      const rz = (this.hash2(cx * 61, cz * 71 + r) - 0.5) * (size - 12);
      const gx = startX + size * 0.5 + rx, gz = startZ + size * 0.5 + rz;
      const info = this.getTerrainInfo(gx, gz, false);
      if (info.roadDist < 8.5 || info.surface === "gravel") continue;

      let blocked = false;
      for (const lm of KK.LANDMARKS) { if (Math.hypot(gx - lm.x, gz - lm.z) < 42) { blocked = true; break; } }
      if (!blocked && KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < KK.CLARKSON_FARM.radius + 12) blocked = true;
      if (!blocked && KK.JAMES_MAY_BAR && Math.hypot(gx - KK.JAMES_MAY_BAR.x, gz - KK.JAMES_MAY_BAR.z) < KK.JAMES_MAY_BAR.radius + 12) blocked = true;
      if (!blocked && KK.HAMMOND_MESA && Math.hypot(gx - KK.HAMMOND_MESA.x, gz - KK.HAMMOND_MESA.z) < KK.HAMMOND_MESA.radius + 20) blocked = true;
      if (!blocked) { for (const pk in this.secretPads) { const sp = this.secretPads[pk]; if (Math.hypot(gx - sp.x, gz - sp.z) < sp.radius + 8) { blocked = true; break; } } }
      if (blocked) continue;

      const rad = 0.85 + this.hash2(cx + r, cz + r) * 1.95;
      const rock = new THREE.Mesh(this.geoRock, isVolcChunk ? this.matObsidian : (isDesertChunk ? this.matSandRock : this.matRock));
      rock.position.set(rx, info.height + rad * 0.35, rz);
      rock.scale.set(rad * 1.15, rad * 0.72, rad);
      group.add(rock);
      // Solid collidable boulder!
      colliders.push({ x: gx, y: info.height, z: gz, r: rad * 0.92, h: rad * 1.15, kind: "rock" });
    }

    // BREAKABLE ROADSIDE FENCES & GUARDRAILS (Wooden Post-and-Rail + Corrugated Metal!)
    const fences = [];
    const cMinX = startX, cMaxX = startX + size, cMinZ = startZ, cMaxZ = startZ + size;
    let fenceSeq = 0;
    for (let si = 0; si < this.roadSegments.length; si++) {
      const seg = this.roadSegments[si];
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
        // Skip near towns, bridges, rivers
        let skip = false;
        for (const tw of KK.TOWNS) { if (Math.hypot(bx - tw.x, bz - tw.z) < 92) { skip = true; break; } }
        if (skip) continue;
        if (this.getBridgeInfo(bx, bz)) continue;
        const rcF = this.getRiverChannel(bx, bz);
        if (rcF.seg && rcF.dist < rcF.seg.halfWidth + 16) continue;

        for (const side of [-1, 1]) {
          fenceSeq++;
          const fenceId = `f_${cx}_${cz}_${si}_${fenceSeq}`;
          if (this.brokenFences.has(fenceId)) continue;
          const fx = bx + nx * side * offset;
          const fz = bz + nz * side * offset;
          const fy = this.getTerrainInfo(fx, fz, false).height;

          const fGrp = new THREE.Group();
          fGrp.position.set(fx - (startX + size * 0.5), fy, fz - (startZ + size * 0.5));
          fGrp.rotation.y = yaw + Math.PI * 0.5;

          const pMat = isMetal ? this.matFenceMetal : this.matFenceWood;
          for (const px of [-2.4, 0, 2.4]) {
            const post = new THREE.Mesh(this.geoFencePost, pMat);
            post.position.set(px, 0.65, 0);
            fGrp.add(post);
          }
          if (isMetal) {
            const rail = new THREE.Mesh(this.geoGuardRail, this.matFenceMetal);
            rail.position.set(0, 0.85, 0); fGrp.add(rail);
          } else {
            const r1 = new THREE.Mesh(this.geoFenceRailW, this.matFenceWood);
            r1.position.set(0, 1.05, 0); fGrp.add(r1);
            const r2 = new THREE.Mesh(this.geoFenceRailW, this.matFenceWood);
            r2.position.set(0, 0.58, 0); fGrp.add(r2);
          }
          group.add(fGrp);
          this.fenceMeshMap.set(fenceId, { mesh: fGrp, chunkKey });
          fences.push({ id: fenceId, x: fx, y: fy, z: fz, r: 2.35, isMetal, broken: false });
        }
      }
    }

    this.rootGroup.add(group);
    return { group, mesh, heights, trees, colliders, fences };
  }

  getNearbyTownInteraction(gx, gz) {
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
    if (entry && entry.mesh) {
      const len = Math.hypot(dirX, dirZ) || 1;
      this.fallingTrees.push({
        mesh: entry.mesh,
        ax: -dirZ / len,
        az: dirX / len,
        angle: 0,
        timer: 2.8
      });
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
    if (entry && entry.mesh) {
      const len = Math.hypot(dirX, dirZ) || 1;
      this.fallingFences.push({
        mesh: entry.mesh,
        vx: (dirX / len) * 9.5 + (Math.random() - 0.5) * 3.0,
        vy: 4.2 + Math.random() * 2.5,
        vz: (dirZ / len) * 9.5 + (Math.random() - 0.5) * 3.0,
        rx: (Math.random() - 0.5) * 6.0,
        rz: (Math.random() - 0.5) * 6.0,
        timer: 2.2
      });
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
