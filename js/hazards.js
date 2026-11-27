// ============================================================================
// js/hazards.js (v17.6.1) — Throwable Road Flares, Volcanic Lava Bombs,
// Falling Mountain Rocks, Snow Avalanches, Tornadoes & Cat 1-5 Ocean Hurricanes!
// ============================================================================
window.KK = window.KK || {};

KK.HazardManager = class HazardManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.flares = [];          // Burning thrown road flares (distract T-Rex & sea cryptids!)
    this.lavaBombs = [];       // Fiery arcing boulders erupting from Mt. Vulkan!
    this.fallingRocks = [];    // Tumbling rocks on mountain passes & Southern Touge!
    this.avalancheChunks = []; // Cascading snow wall on snowy peaks!
    this.tornado = null;       // Rare realistic twisting funnel cloud!
    this.hurricane = null;     // Cat 1-5 Ocean Hurricane with Eyewall, Spiral Bands & Calm Eye!
    this.hurricaneCheckTimer = 34.0;
    this.avalancheWaves = [];  // Staggered 3-wave avalanche queue!

    this.lavaTimer = 4.0;
    this.rockTimer = 5.0;
    this.avalancheTimer = 38.0;
    this.tornadoCheckTimer = 65.0;
    this.syncAccum = 0;
    this._lastHurricaneZone = "none"; // none | outer | eyewall | eye

    // Shared geometries & materials (zero GPU leaks!)
    this.geoFlare = new THREE.CylinderGeometry(0.055, 0.055, 0.36, 7);
    this.matFlare = new THREE.MeshBasicMaterial({ color: 0xff2442 });
    this.geoLava = new THREE.DodecahedronGeometry(0.95, 0);
    this.matLava = new THREE.MeshStandardMaterial({ color: 0x3b1810, emissive: 0xff4800, emissiveIntensity: 1.4, roughness: 0.7 });
    this.geoFallRock = new THREE.DodecahedronGeometry(1.25, 0);
    this.matFallRock = new THREE.MeshStandardMaterial({ color: 0x5c5b56, roughness: 0.94 });
    this.geoSnowBall = new THREE.DodecahedronGeometry(1.65, 0);
    this.matSnowBall = new THREE.MeshStandardMaterial({ color: 0xeef6fc, roughness: 0.9 });

    // Reusable scratch vector
    this._tmpAhead = new THREE.Vector3();

    this._buildTornadoMesh();
    this._buildHurricaneMesh();
  }

  // ==========================================================================
  // DRAMATIC CAT 1-5 HURRICANE SYSTEM (Normalized to reference outer radius = 220m)
  // Eye cavity: r = 0..48m | Eyewall: r = 48..105m | Outer spiral rainbands: r = 105..220m
  // ==========================================================================
  _buildHurricaneMesh() {
    const grp = new THREE.Group();
    const eyewallLayers = [];
    const spiralBands = [];
    const sprayRings = [];
    const bolts = [];

    // 1. Towering Dark Rotating Eyewall Cloud Cylinder (Stadium-effect flared open cavity!)
    const wallSpecs = [
      { rBot: 48,  rTop: 68,  h: 190, y: 98,  col: 0x16212b, op: 0.48, spd:  1.05 },
      { rBot: 64,  rTop: 94,  h: 215, y: 112, col: 0x1e2d3b, op: 0.42, spd:  0.88 },
      { rBot: 86,  rTop: 128, h: 230, y: 122, col: 0x283a4a, op: 0.34, spd:  0.72 },
      { rBot: 114, rTop: 162, h: 195, y: 118, col: 0x324657, op: 0.24, spd:  0.56 }
    ];
    for (let i = 0; i < wallSpecs.length; i++) {
      const ws = wallSpecs[i];
      const mat = new THREE.MeshBasicMaterial({
        color: ws.col, transparent: true, opacity: ws.op, side: THREE.DoubleSide, depthWrite: false
      });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(ws.rTop, ws.rBot, ws.h, 24, 1, true), mat);
      cyl.position.y = ws.y;
      grp.add(cyl);
      eyewallLayers.push({ mesh: cyl, mat, baseOp: ws.op, spd: ws.spd });
    }

    // Upper anvil cloud deck ring (leaves unmistakable circular open Eye skylight in the center!)
    const matAnvil = new THREE.MeshBasicMaterial({
      color: 0x131d26, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
    });
    const anvilDeck = new THREE.Mesh(new THREE.RingGeometry(56, 225, 28), matAnvil);
    anvilDeck.rotation.x = -Math.PI / 2;
    anvilDeck.position.y = 202;
    grp.add(anvilDeck);

    // 2. Sweeping Outer Spiral Rainbands (curved partial-cylinder rain curtains spiraling outward)
    const matBandDark = new THREE.MeshBasicMaterial({
      color: 0x243646, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false
    });
    const matBandRain = new THREE.MeshBasicMaterial({
      color: 0x628399, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false
    });
    for (let b = 0; b < 8; b++) {
      const armGrp = new THREE.Group();
      const baseAng = (b / 8) * Math.PI * 2;
      armGrp.rotation.y = baseAng;
      const rMid = 128 + (b % 3) * 32;
      const arcLen = Math.PI * (0.48 + (b % 2) * 0.22);
      const curtain = new THREE.Mesh(
        new THREE.CylinderGeometry(rMid + 18, rMid - 6, 115 + (b % 3) * 28, 12, 1, true, 0, arcLen),
        b % 2 === 0 ? matBandDark : matBandRain
      );
      curtain.position.y = 60 + (b % 3) * 14;
      armGrp.add(curtain);
      grp.add(armGrp);
      spiralBands.push({ grp: armGrp, baseAng, spd: 0.36 + (b % 3) * 0.09 });
    }

    // 3. Churning White Sea-Spray Collar & Rotating Whirlpool Foam Rings at Water Level!
    const matSprayCollar = new THREE.MeshBasicMaterial({
      color: 0xd4eefc, transparent: true, opacity: 0.30, side: THREE.DoubleSide, depthWrite: false
    });
    const sprayCollarIn = new THREE.Mesh(new THREE.CylinderGeometry(64, 48, 22, 24, 1, true), matSprayCollar);
    sprayCollarIn.position.y = 11.5;
    grp.add(sprayCollarIn);
    const sprayCollarOut = new THREE.Mesh(new THREE.CylinderGeometry(102, 82, 16, 24, 1, true), matSprayCollar);
    sprayCollarOut.position.y = 8.0;
    grp.add(sprayCollarOut);

    const foamSpecs = [
      { rIn: 44,  rOut: 72,  y: 1.0, op: 0.36, spd:  1.45, col: 0xdcf4ff },
      { rIn: 70,  rOut: 112, y: 1.4, op: 0.26, spd:  1.05, col: 0xb5d9eb },
      { rIn: 110, rOut: 168, y: 1.8, op: 0.18, spd:  0.72, col: 0x89b3c9 },
      { rIn: 164, rOut: 218, y: 2.0, op: 0.12, spd:  0.48, col: 0x678da3 }
    ];
    for (let i = 0; i < foamSpecs.length; i++) {
      const fs = foamSpecs[i];
      const mat = new THREE.MeshBasicMaterial({
        color: fs.col, transparent: true, opacity: fs.op, side: THREE.DoubleSide, depthWrite: false
      });
      const ring = new THREE.Mesh(new THREE.RingGeometry(fs.rIn, fs.rOut, 28), mat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = fs.y;
      grp.add(ring);
      sprayRings.push({ mesh: ring, spd: fs.spd });
    }

    // 4. Internal Eyewall Lightning Bolts & Inner Cloud Flash Glow!
    const matFlashGlow = new THREE.MeshBasicMaterial({
      color: 0x9ce2ff, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const flashCylinder = new THREE.Mesh(new THREE.CylinderGeometry(74, 52, 155, 20, 1, true), matFlashGlow);
    flashCylinder.position.y = 92;
    grp.add(flashCylinder);

    const matBolt = new THREE.MeshBasicMaterial({
      color: 0xeaf8ff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    for (let k = 0; k < 6; k++) {
      const bGrp = new THREE.Group();
      const ang = (k / 6) * Math.PI * 2;
      const rad = 58 + (k % 2) * 18;
      bGrp.position.set(Math.cos(ang) * rad, 24, Math.sin(ang) * rad);
      // Jagged 3-segment lightning bolt spanning eyewall height
      let lx = 0, ly = 0, lz = 0;
      for (let seg = 0; seg < 4; seg++) {
        const segH = 38;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, segH, 5), matBolt);
        const jx = (seg % 2 === 0 ? 1 : -1) * 5.5;
        const jz = (seg % 2 === 0 ? -1 : 1) * 4.2;
        m.position.set(lx + jx * 0.5, ly + segH * 0.5, lz + jz * 0.5);
        m.rotation.z = Math.atan2(-jx, segH);
        m.rotation.x = Math.atan2(jz, segH);
        bGrp.add(m);
        lx += jx; ly += segH; lz += jz;
      }
      bGrp.visible = false;
      grp.add(bGrp);
      bolts.push({ grp: bGrp, ang, rad });
    }

    grp.visible = false;
    this.scene.add(grp);
    this.hurricaneVisual = {
      grp, eyewallLayers, anvilDeck, spiralBands, sprayCollarIn, sprayCollarOut,
      sprayRings, flashCylinder, matFlashGlow, bolts,
      phase: 0, flashTimer: 0, nextBoltCd: 1.6, activeBoltIdx: -1
    };
  }

  _buildTornadoMesh() {
    const grp = new THREE.Group();
    const matFunnel = new THREE.MeshBasicMaterial({ color: 0x565e66, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const matCore = new THREE.MeshBasicMaterial({ color: 0x383e45, transparent: true, opacity: 0.52, side: THREE.DoubleSide, depthWrite: false });
    const rings = [];
    for (let i = 0; i < 8; i++) {
      const rBot = 3.2 + i * 2.8;
      const rTop = 5.4 + i * 3.4;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(rTop, rBot, 16, 12, 1, true),
        i % 2 === 0 ? matFunnel : matCore
      );
      seg.position.y = 8 + i * 15.2;
      grp.add(seg);
      rings.push(seg);
    }
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x453b2e, roughness: 0.95 });
    const debris = [];
    for (let d = 0; d < 14; d++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 1.4), debrisMat);
      grp.add(m);
      debris.push({ mesh: m, ang: (d / 14) * Math.PI * 2, rad: 6 + (d % 5) * 4.5, h: 2 + (d % 6) * 14 });
    }
    grp.visible = false;
    this.scene.add(grp);
    this.tornadoVisual = { grp, rings, debris, phase: 0 };
  }

  // ==========================================================================
  // SHARED INTERFACE CONTRACT: Hurricane Effect Query & Immediate Summoner
  // ==========================================================================
  getHurricaneEffectAt(gx, gz) {
    const h = this.hurricane;
    if (!h) {
      return {
        active: false, inEye: false, inEyewall: false,
        intensity: 0, windX: 0, windZ: 0, waveBoost: 0,
        cat: 0, dist: 99999, radius: 0, eyeRadius: 0
      };
    }
    const dx = gx - h.gx;
    const dz = gz - h.gz;
    const dist = Math.hypot(dx, dz);
    const radius = h.radius;
    const eyeRadius = h.eyeRadius || (radius * 0.22);
    const eyewallRadius = h.eyewallRadius || (radius * 0.48);

    if (dist >= radius) {
      return {
        active: true, inEye: false, inEyewall: false,
        intensity: 0, windX: 0, windZ: 0, waveBoost: 0,
        cat: h.cat, dist, radius, eyeRadius
      };
    }

    const catScale = 0.52 + h.cat * 0.096; // Cat 1 ~ 0.62, Cat 5 = 1.0
    const safeD = Math.max(1.0, dist);
    // Counter-clockwise Northern Hemisphere cyclonic tangential direction + slight inward suction
    const tx = -dz / safeD;
    const tz =  dx / safeD;
    const inX = -dx / safeD;
    const inZ = -dz / safeD;

    let inEye = false;
    let inEyewall = false;
    let intensity = 0;
    let waveBoost = 0;
    let windSpd = 0;
    let suctionRatio = 0.22;

    if (dist < eyeRadius * 0.88) {
      // THE CALM EYE: Eerie sudden drop in wind/rain with visible sky column overhead!
      inEye = true;
      const edgeT = Math.max(0, (dist / (eyeRadius * 0.88)));
      intensity = 0.05 + edgeT * edgeT * 0.08;
      waveBoost = 0.10 + edgeT * 0.12;
      windSpd = 2.0 + edgeT * 3.5;
      suctionRatio = 0.0;
    } else if (dist <= eyewallRadius) {
      // THE VIOLENT EYEWALL: Peak tangential winds, inward pull, blinding spray & rogue waves!
      inEyewall = true;
      // Smooth ramp-up across the inner edge of the eye into maximum eyewall fury
      const innerRamp = Math.min(1.0, (dist - eyeRadius * 0.88) / Math.max(8, eyeRadius * 0.28));
      const outerTaper = 1.0 - Math.max(0, (dist - eyeRadius * 1.16) / Math.max(1, eyewallRadius - eyeRadius * 1.16)) * 0.18;
      intensity = Math.min(1.0, innerRamp * outerTaper * catScale);
      waveBoost = Math.min(1.0, (0.28 + 0.72 * innerRamp) * catScale);
      windSpd = (18 + h.cat * 8.5) * innerRamp * outerTaper;
      suctionRatio = 0.26;
    } else {
      // OUTER SPIRAL RAINBANDS: Gusty crosswinds & rising chop
      const u = 1.0 - (dist - eyewallRadius) / Math.max(1, radius - eyewallRadius);
      const gustPhase = this.hurricaneVisual ? this.hurricaneVisual.phase : 0;
      const gust = 0.86 + 0.18 * Math.sin(gustPhase * 1.8 + dist * 0.035);
      intensity = Math.min(1.0, Math.pow(u, 1.15) * 0.78 * catScale * gust);
      waveBoost = Math.min(1.0, Math.pow(u, 1.05) * 0.72 * catScale);
      windSpd = (14 + h.cat * 6.5) * Math.pow(u, 1.1) * gust;
      suctionRatio = 0.18;
    }

    const windX = (tx + inX * suctionRatio) * windSpd;
    const windZ = (tz + inZ * suctionRatio) * windSpd;

    return {
      active: true, inEye, inEyewall,
      intensity, windX, windZ, waveBoost,
      cat: h.cat, dist, radius, eyeRadius
    };
  }

  spawnHurricaneNear(gx, gz, cat = 5, ui = null, audio = null, network = null) {
    // Strictly prohibit hurricanes on land — must be over open ocean!
    const playerOcean = this.world ? (this.world.getBiomeWeights(gx, gz).ocean || 0) : 0;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const terrainH = this.world ? this.world.getTerrainInfo(gx, gz, false).height : 0;
    if (playerOcean < 0.50 || terrainH >= seaL - 1.5) {
      if (ui) ui.toast("❌ Failed to summon hurricane — hurricanes only form over open ocean!", true);
      return null;
    }

    const c = Math.max(1, Math.min(5, Math.round(Number(cat) || 5)));
    const dist = 255;
    let hx = gx + dist, hz = gz, foundOcean = false;
    const baseAng = Math.random() * Math.PI * 2;
    for (let k = 0; k < 12; k++) {
      const ang = baseAng + (k / 12) * Math.PI * 2;
      const candX = gx + Math.cos(ang) * dist;
      const candZ = gz + Math.sin(ang) * dist;
      if ((this.world.getBiomeWeights(candX, candZ).ocean || 0) >= 0.55) {
        hx = candX; hz = candZ; foundOcean = true;
        break;
      }
    }
    if (!foundOcean) {
      if (ui) ui.toast("❌ Failed to summon hurricane — sail further into open sea!", true);
      return null;
    }

    const radius = 240 + c * 55;
    const eyeRadius = radius * 0.22;
    const eyewallRadius = radius * 0.48;
    // Track straight across the player's path at ~7.5-10 m/s so they pass Outer -> Eyewall -> Calm Eye -> Eyewall!
    const moveSpd = 6.8 + c * 0.65;
    const dirAng = Math.atan2(gz - hz, gx - hx);
    const vx = Math.cos(dirAng) * moveSpd;
    const vz = Math.sin(dirAng) * moveSpd;
    const life = 95 + c * 16;

    this.hurricane = {
      gx: hx, gz: hz, vx, vz,
      cat: c, radius, eyeRadius, eyewallRadius,
      life, maxLife: life, forced: false
    };
    this._lastHurricaneZone = "none";

    if (audio) {
      if (audio.playSeaDreadPulse) audio.playSeaDreadPulse(0.92, "hurricane");
      else if (audio.playThunder) audio.playThunder();
    }
    if (ui) {
      ui.toast(`🌀 CATEGORY ${c} HURRICANE SUMMONED (${Math.round(dist)}m)! Outer bands closing fast — aim for the calm Eye!`, true);
    }
    if (network && network.isHost && network.mode !== "offline") {
      network.send({
        type: "hazard_event", kind: "hurricane",
        x: +hx.toFixed(1), z: +hz.toFixed(1),
        vx: +vx.toFixed(2), vz: +vz.toFixed(2),
        cat: c, radius: +radius.toFixed(1), life: +life.toFixed(1), forced: false
      });
    }
    return this.hurricane;
  }

  // Throw a glowing red road flare (from vehicle window or on foot!)
  spawnFlare(gx, gy, gz, vx, vy, vz, isRemote = false) {
    if (this.flares.length >= 10) {
      const oldest = this.flares.shift();
      this.scene.remove(oldest.grp);
    }
    const grp = new THREE.Group();
    const stick = new THREE.Mesh(this.geoFlare, this.matFlare);
    stick.rotation.z = Math.PI * 0.42;
    grp.add(stick);
    const light = new THREE.PointLight(0xff2840, 3.2, 34, 1.5);
    light.position.y = 0.25;
    grp.add(light);
    this.scene.add(grp);

    this.flares.push({ gx, gy, gz, vx, vy, vz, life: 32.0, grp, light, grounded: false });
  }

  // Find nearest burning road flare (used by Volcanic T-Rex & Sea Cryptid distraction!)
  getNearestFlare(gx, gz, maxDist = 110) {
    let best = null, bestD = maxDist;
    for (const f of this.flares) {
      const d = Math.hypot(f.gx - gx, f.gz - gz);
      if (d < bestD) { bestD = d; best = f; }
    }
    return best;
  }

  // Trigger a Tornado near a player (naturally rare in storms/overcast, or manual from [P])
  spawnTornadoNear(px, pz, ui, audio) {
    const ang = Math.random() * Math.PI * 2;
    const dist = 145 + Math.random() * 80;
    const tx = px + Math.cos(ang) * dist;
    const tz = pz + Math.sin(ang) * dist;
    const driftAng = Math.atan2(pz - tz, px - tx) + (Math.random() - 0.5) * 0.7;
    const ef = 1 + Math.floor(Math.random() * 5);
    const scale = 0.52 + ef * 0.30;
    this.tornado = {
      gx: tx, gz: tz,
      vx: Math.cos(driftAng) * (9.0 + ef * 1.4),
      vz: Math.sin(driftAng) * (9.0 + ef * 1.4),
      life: 54.0 + ef * 12.0,
      ef, scale, strength: 0.55 + ef * 0.34
    };
    if (audio) audio.playThunder();
  }

  triggerAvalancheNear(px, pz, ui, audio) {
    const eps = 18;
    const hE = this.world.getTerrainInfo(px + eps, pz, false).height;
    const hW = this.world.getTerrainInfo(px - eps, pz, false).height;
    const hS = this.world.getTerrainInfo(px, pz + eps, false).height;
    const hN = this.world.getTerrainInfo(px, pz - eps, false).height;
    let ux = hE - hW, uz = hS - hN;
    const ulen = Math.hypot(ux, uz) || 1;
    ux /= ulen; uz /= ulen;

    // MASSIVE 3-WAVE AVALANCHE (21-24 Snow & Ice Boulders in 3 Staggered Waves!)
    for (let w = 0; w < 3; w++) {
      this.avalancheWaves.push({
        delay: w * 2.2,
        px, pz, ux, uz,
        count: 7 + (w === 1 ? 1 : 0)
      });
    }
    if (audio) audio.playThunder();
  }

  _collectAllPlayers(vehicle, network) {
    const list = [{
      isLocal: true,
      callsign: network ? network.callsign : "HOST",
      x: vehicle.pos.x, y: vehicle.pos.y, z: vehicle.pos.z
    }];
    if (network && network.remotePlayers) {
      for (const rp of network.remotePlayers.values()) {
        list.push({ isLocal: false, callsign: rp.callsign || rp.peerId, x: rp.gx, y: rp.gy, z: rp.gz });
      }
    }
    return list;
  }

  // Handle synchronized LAN hazard events targeted at ANY player (Host OR Friend)!
  handleHazardEvent(msg, localVeh, ui, audio) {
    if (!msg || !msg.kind) return;
    const tx = Number(msg.x) || 0, tz = Number(msg.z) || 0;
    const distToLocal = Math.hypot(localVeh.pos.x - tx, localVeh.pos.z - tz);
    if (msg.kind === "tornado") {
      const ef = Math.max(1, Math.min(5, Number(msg.ef) || (1 + Math.floor(Math.random() * 5))));
      const scale = Number(msg.scale) || (0.52 + ef * 0.30);
      this.tornado = {
        gx: tx, gz: tz,
        vx: Number(msg.vx) || 0, vz: Number(msg.vz) || 0,
        life: Number(msg.life) || (54 + ef * 12),
        ef, scale, strength: 0.55 + ef * 0.34
      };
      if (distToLocal < 380 && audio) audio.playThunder();
    } else if (msg.kind === "hurricane") {
      const cat = Math.max(1, Math.min(5, Number(msg.cat) || 4));
      const radius = Number(msg.radius) || (240 + cat * 55);
      this.hurricane = {
        gx: tx, gz: tz,
        vx: Number(msg.vx) || 0, vz: Number(msg.vz) || 0,
        cat, radius,
        eyeRadius: radius * 0.22,
        eyewallRadius: radius * 0.48,
        life: Number(msg.life) || (90 + cat * 14),
        maxLife: Number(msg.life) || (90 + cat * 14),
        forced: !!msg.forced
      };
      if (distToLocal < 750 && audio) {
        if (audio.playSeaDreadPulse) audio.playSeaDreadPulse(0.85, "hurricane");
        else if (audio.playThunder) audio.playThunder();
      }
      if (distToLocal < 750 && ui) {
        ui.toast(`🌀 CATEGORY ${cat} OCEAN HURRICANE DETECTED NEARBY!`, true);
      }
    } else if (msg.kind === "avalanche") {
      if (distToLocal < 280) {
        this.triggerAvalancheNear(tx, tz, ui, audio);
      }
    } else if (msg.kind === "rockfall") {
      if (distToLocal < 220) {
        this._spawnRockfallAt(tx, tz, localVeh, ui);
      }
    }
  }

  _spawnRockfallAt(tx, tz, vehicle, ui) {
    const eps = 14;
    const hE = this.world.getTerrainInfo(tx + eps, tz, false).height;
    const hW = this.world.getTerrainInfo(tx - eps, tz, false).height;
    const hS = this.world.getTerrainInfo(tx, tz + eps, false).height;
    const hN = this.world.getTerrainInfo(tx, tz - eps, false).height;
    let ux = hE - hW, uz = hS - hN;
    const slope = Math.hypot(ux, uz);
    if (slope < 1.2) { ux = Math.cos(Math.random() * 6.28); uz = Math.sin(Math.random() * 6.28); }
    else { ux /= slope; uz /= slope; }
    for (let k = 0; k < 2; k++) {
      if (this.fallingRocks.length >= 8) break;
      const rx = tx + ux * 38 + (Math.random() - 0.5) * 22;
      const rz = tz + uz * 38 + (Math.random() - 0.5) * 22;
      const ry = this.world.getTerrainInfo(rx, rz, false).height + 3.5;
      const m = new THREE.Mesh(this.geoFallRock, this.matFallRock);
      const sc = 0.75 + Math.random() * 0.9;
      m.scale.set(sc, sc * 0.85, sc);
      this.scene.add(m);
      this.fallingRocks.push({
        gx: rx, gy: ry, gz: rz,
        vx: -ux * (11 + Math.random() * 6), vy: 0, vz: -uz * (11 + Math.random() * 6),
        life: 7.5, mesh: m, radius: 1.25 * sc
      });
    }
  }

  applySyncState(tData, hData = undefined) {
    if (!tData) {
      this.tornado = null;
    } else {
      const ef = tData.ef || 3, sc = tData.sc || (0.52 + ef * 0.30);
      if (!this.tornado) {
        this.tornado = { gx: tData.x, gz: tData.z, vx: tData.vx || 0, vz: tData.vz || 0, life: tData.l || 40, ef, scale: sc, strength: 0.55 + ef * 0.34 };
      } else {
        this.tornado.gx += (tData.x - this.tornado.gx) * 0.25;
        this.tornado.gz += (tData.z - this.tornado.gz) * 0.25;
        this.tornado.life = tData.l || this.tornado.life;
        this.tornado.ef = ef; this.tornado.scale = sc; this.tornado.strength = 0.55 + ef * 0.34;
      }
    }
    if (hData !== undefined) {
      if (!hData) {
        this.hurricane = null;
      } else {
        const cat = Math.max(1, Math.min(5, hData.c || 3));
        const rad = hData.r || (240 + cat * 55);
        if (!this.hurricane) {
          this.hurricane = {
            gx: hData.x, gz: hData.z, vx: hData.vx || 0, vz: hData.vz || 0,
            cat, radius: rad, eyeRadius: rad * 0.22, eyewallRadius: rad * 0.48,
            life: hData.l || 60, maxLife: 120, forced: !!hData.f
          };
        } else {
          this.hurricane.gx += (hData.x - this.hurricane.gx) * 0.25;
          this.hurricane.gz += (hData.z - this.hurricane.gz) * 0.25;
          this.hurricane.cat = cat; this.hurricane.radius = rad;
          this.hurricane.eyeRadius = rad * 0.22; this.hurricane.eyewallRadius = rad * 0.48;
          this.hurricane.life = hData.l || this.hurricane.life;
        }
      }
    }
  }

  update(dt, vehicle, weatherSys, particles, audio, ui, network, boats = null) {
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const b = this.world.getBiomeWeights(px, pz);
    const isAuth = (!network || network.mode === "offline" || network.isHost);

    // ------------------------------------------------------------------------
    // 1. UPDATE THROWN ROAD FLARES
    // ------------------------------------------------------------------------
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const fl = this.flares[i];
      fl.life -= dt;
      if (!fl.grounded) {
        fl.vy -= 14.5 * dt;
        fl.gx += fl.vx * dt; fl.gy += fl.vy * dt; fl.gz += fl.vz * dt;
        const gh = this.world.getTerrainInfo(fl.gx, fl.gz, true).height + 0.12;
        const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
        const floorH = Math.max(gh, seaL + 0.08); // Flares bob on water surface too!
        if (fl.gy <= floorH) {
          fl.gy = floorH;
          fl.vy = -fl.vy * 0.25;
          fl.vx *= 0.45; fl.vz *= 0.45;
          if (Math.abs(fl.vy) < 0.8 && Math.hypot(fl.vx, fl.vz) < 0.8) fl.grounded = true;
        }
      }
      this.world.toLocal(fl.gx, fl.gy, fl.gz, fl.grp.position);
      fl.light.intensity = 2.6 + Math.sin(performance.now() * 0.03 + i) * 0.8;
      if (Math.random() < 0.35) {
        particles.emitRGB(fl.gx, fl.gy + 0.18, fl.gz, (Math.random() - 0.5) * 0.9, 1.4 + Math.random() * 1.2, (Math.random() - 0.5) * 0.9, 1.0, 0.22, 0.26, 0.52, 0.3, 1.6);
      }
      if (fl.life <= 0) {
        this.scene.remove(fl.grp);
        this.flares.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------------
    // 2. VOLCANIC LAVA BOMBS (Active when near Mt. Vulkan Caldera!)
    // ------------------------------------------------------------------------
    const volcLm = KK.LANDMARKS.find((l) => l.id === "mt_vulkan_caldera");
    if (volcLm && Math.hypot(px - volcLm.x, pz - volcLm.z) < 420) {
      this.lavaTimer -= dt;
      if (this.lavaTimer <= 0 && this.lavaBombs.length < 7) {
        this.lavaTimer = 1.9 + Math.random() * 2.2;
        const srcX = volcLm.x - 85, srcZ = volcLm.z + 12;
        const srcY = (volcLm._baseH || 38) + 82;
        const tgtX = px + (Math.random() - 0.5) * 65;
        const tgtZ = pz + (Math.random() - 0.5) * 65;
        const tgtY = this.world.getTerrainInfo(tgtX, tgtZ, false).height;
        const ft = 3.2 + Math.random() * 1.2;
        const m = new THREE.Mesh(this.geoLava, this.matLava);
        const sc = 0.75 + Math.random() * 0.9;
        m.scale.set(sc, sc, sc);
        this.scene.add(m);
        this.lavaBombs.push({
          gx: srcX, gy: srcY, gz: srcZ,
          vx: (tgtX - srcX) / ft,
          vy: (tgtY - srcY) / ft + 0.5 * 16.0 * ft,
          vz: (tgtZ - srcZ) / ft,
          life: ft + 2.0, mesh: m, radius: 1.1 * sc
        });
      }
    }
    for (let i = this.lavaBombs.length - 1; i >= 0; i--) {
      const lb = this.lavaBombs[i];
      lb.life -= dt; lb.vy -= 16.0 * dt;
      lb.gx += lb.vx * dt; lb.gy += lb.vy * dt; lb.gz += lb.vz * dt;
      lb.mesh.rotation.x += dt * 4; lb.mesh.rotation.y += dt * 3;
      this.world.toLocal(lb.gx, lb.gy, lb.gz, lb.mesh.position);
      if (Math.random() < 0.45) {
        particles.emitRGB(lb.gx, lb.gy, lb.gz, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 1.0, 0.38, 0.06, 0.48, 0.2, 2.0);
      }
      const gh = this.world.getTerrainInfo(lb.gx, lb.gz, false).height;
      const dVeh = Math.hypot(lb.gx - px, lb.gz - pz);
      if (lb.gy <= gh + 0.5 || lb.life <= 0) {
        if (dVeh < 9.5) {
          audio.playImpact(0.95);
          const ang = Math.atan2(px - lb.gx, pz - lb.gz);
          const lvScale = vehicle.spec.isSchreckensfurst ? 0.16 : (vehicle.spec.isTracked ? 0.28 : 1.0);
          vehicle.applyExternalImpulse(Math.sin(ang) * 14 * lvScale, 7.5 * lvScale, Math.cos(ang) * 14 * lvScale, (Math.random() - 0.5) * 3.5 * lvScale);
          vehicle.coolantTemp = Math.min(130, vehicle.coolantTemp + 14);
        }
        particles.emitRGB(lb.gx, gh + 0.6, lb.gz, 0, 5, 0, 1.0, 0.42, 0.05, 0.65, -4, 1.4);
        particles.emitCrashBurst(lb.gx, gh + 0.5, lb.gz, 0.9, "rock", weatherSys.weather);
        this.scene.remove(lb.mesh);
        this.lavaBombs.splice(i, 1);
      }
    }

    // ------------------------------------------------------------------------
    // 3. FALLING MOUNTAIN BOULDERS (Razorback Mountains & Southern Touge!)
    // ------------------------------------------------------------------------
    const inMtnOrTouge = (b.mountains > 0.30 || py > 58);
    if (inMtnOrTouge) {
      const stormBoost = (weatherSys.weather === "storm" || weatherSys.weather === "rain" || weatherSys.weather === "hurricane") ? 2.0 : 1.0;
      this.rockTimer -= dt * stormBoost;
      if (this.rockTimer <= 0 && this.fallingRocks.length < 3) {
        this.rockTimer = 18.0 + Math.random() * 14.0;
        const eps = 16;
        const hE = this.world.getTerrainInfo(px + eps, pz, false).height;
        const hW = this.world.getTerrainInfo(px - eps, pz, false).height;
        const hS = this.world.getTerrainInfo(px, pz + eps, false).height;
        const hN = this.world.getTerrainInfo(px, pz - eps, false).height;
        let ux = hE - hW, uz = hS - hN;
        const slope = Math.hypot(ux, uz);
        if (slope > 4.2) {
          ux /= slope; uz /= slope;
          const ahead = this._tmpAhead.set(0, 0, 1).applyQuaternion(vehicle.quat);
          const rx = px + ahead.x * 34 + ux * 54 + (Math.random() - 0.5) * 10;
          const rz = pz + ahead.z * 34 + uz * 54 + (Math.random() - 0.5) * 10;
          const ry = this.world.getTerrainInfo(rx, rz, false).height + 2.2;
          const m = new THREE.Mesh(this.geoFallRock, this.matFallRock);
          const sc = 0.7 + Math.random() * 0.9;
          m.scale.set(sc, sc * 0.85, sc);
          this.scene.add(m);
          this.fallingRocks.push({
            gx: rx, gy: ry, gz: rz,
            vx: -ux * (11 + Math.random() * 6), vy: 0, vz: -uz * (11 + Math.random() * 6),
            life: 7.5, mesh: m, radius: 1.25 * sc
          });
        }
      }
    }
    for (let i = this.fallingRocks.length - 1; i >= 0; i--) {
      const rk = this.fallingRocks[i];
      rk.life -= dt; rk.vy -= 18.0 * dt;
      rk.gx += rk.vx * dt; rk.gy += rk.vy * dt; rk.gz += rk.vz * dt;
      rk.mesh.rotation.x += dt * 5; rk.mesh.rotation.z += dt * 4;
      const gh = this.world.getTerrainInfo(rk.gx, rk.gz, false).height + rk.radius * 0.5;
      if (rk.gy < gh) { rk.gy = gh; rk.vy = Math.abs(rk.vy) * 0.45 + 1.5; }
      this.world.toLocal(rk.gx, rk.gy, rk.gz, rk.mesh.position);
      if (Math.hypot(rk.gx - px, rk.gz - pz) < rk.radius + 2.2 && Math.abs(rk.gy - (py + 1.0)) < 2.6) {
        audio.playImpact(0.95);
        const rkArmor = vehicle.spec.isSchreckensfurst ? 0.14 : (vehicle.spec.isTracked ? 0.24 : 1.0);
        vehicle.applyExternalImpulse(rk.vx * 0.8 * rkArmor, 5.0 * rkArmor, rk.vz * 0.8 * rkArmor, (Math.random() - 0.5) * 4.0 * rkArmor);
        const bull = (vehicle.vState.upgrades.bullbar ? 0.35 : 1.0) * rkArmor;
        vehicle.vState.health.body = Math.max(0, vehicle.vState.health.body - 18 * bull);
        particles.emitCrashBurst(rk.gx, rk.gy, rk.gz, 1.0, "rock", weatherSys.weather);
        this.scene.remove(rk.mesh); this.fallingRocks.splice(i, 1);
        continue;
      }
      if (rk.life <= 0) { this.scene.remove(rk.mesh); this.fallingRocks.splice(i, 1); }
    }

    // ------------------------------------------------------------------------
    // 4. SNOW AVALANCHES (Randomly picks ANY eligible LAN player on snowy peaks!)
    // ------------------------------------------------------------------------
    if (isAuth) {
      const allP = this._collectAllPlayers(vehicle, network);
      const snowPlayers = allP.filter((pl) => pl.y > 150 || (this.world.getBiomeWeights(pl.x, pl.z).mountains > 0.42 && weatherSys.weather === "snow"));
      if (snowPlayers.length > 0) {
        this.avalancheTimer -= dt;
        if (this.avalancheTimer <= 0) {
          this.avalancheTimer = 48 + Math.random() * 55;
          if (Math.random() < 0.50) {
            const victim = snowPlayers[Math.floor(Math.random() * snowPlayers.length)];
            if (network && network.mode !== "offline") {
              network.send({ type: "hazard_event", kind: "avalanche", x: +victim.x.toFixed(1), z: +victim.z.toFixed(1), target: victim.callsign });
            } else {
              this.triggerAvalancheNear(victim.x, victim.z, ui, audio);
            }
          }
        }
      }
    }
    for (let wi = this.avalancheWaves.length - 1; wi >= 0; wi--) {
      const wv = this.avalancheWaves[wi];
      wv.delay -= dt;
      if (wv.delay <= 0) {
        const startX = wv.px + wv.ux * 66, startZ = wv.pz + wv.uz * 66;
        for (let k = 0; k < wv.count; k++) {
          if (this.avalancheChunks.length >= 36) break;
          const lat = (k - wv.count * 0.5) * 5.6;
          const sx = startX - wv.uz * lat + (Math.random() - 0.5) * 4.5;
          const sz = startZ + wv.ux * lat + (Math.random() - 0.5) * 4.5;
          const sy = this.world.getTerrainInfo(sx, sz, false).height + 2.0;
          const m = new THREE.Mesh(this.geoSnowBall, this.matSnowBall);
          const sc = 0.85 + Math.random() * 1.25;
          m.scale.set(sc, sc * 0.85, sc);
          this.scene.add(m);
          this.avalancheChunks.push({
            gx: sx, gy: sy, gz: sz,
            vx: -wv.ux * (15 + Math.random() * 7), vy: 0, vz: -wv.uz * (15 + Math.random() * 7),
            r: 1.65 * sc, life: 13.0, mesh: m
          });
        }
        this.avalancheWaves.splice(wi, 1);
      }
    }
    for (let i = this.avalancheChunks.length - 1; i >= 0; i--) {
      const av = this.avalancheChunks[i];
      av.life -= dt; av.vy -= 16.0 * dt;
      av.gx += av.vx * dt; av.gy += av.vy * dt; av.gz += av.vz * dt;
      av.mesh.rotation.x += dt * 6;
      const gh = this.world.getTerrainInfo(av.gx, av.gz, false).height + av.radius * 0.4;
      if (av.gy < gh) { av.gy = gh; av.vy = 1.2; }
      this.world.toLocal(av.gx, av.gy, av.gz, av.mesh.position);
      if (Math.random() < 0.4) particles.emitFrostOrSand(av.gx, av.gy, av.gz, true, 1);
      if (Math.hypot(av.gx - px, av.gz - pz) < av.radius + 2.5 && Math.abs(av.gy - (py + 1.0)) < 3.2) {
        audio.playImpact(0.75);
        const avScale = vehicle.spec.isSchreckensfurst ? 0.14 : (vehicle.spec.isTracked ? 0.24 : 1.0);
        vehicle.applyExternalImpulse(av.vx * 0.55 * avScale, 3.2 * avScale, av.vz * 0.55 * avScale, (Math.random() - 0.5) * 3.0 * avScale);
        this.scene.remove(av.mesh); this.avalancheChunks.splice(i, 1);
        continue;
      }
      if (av.life <= 0) { this.scene.remove(av.mesh); this.avalancheChunks.splice(i, 1); }
    }

    // ------------------------------------------------------------------------
    // 5. RARE REALISTIC TORNADOES (Authoritative Host Spawn + LAN Sync!)
    // ------------------------------------------------------------------------
    if (isAuth) {
      if (!this.tornado) {
        this.tornadoCheckTimer -= dt;
        if (this.tornadoCheckTimer <= 0 && (!this.world.isDryInland || this.world.isDryInland(px, pz, 8.0, 4.0))) {
          this.tornadoCheckTimer = 80 + Math.random() * 70;
          const chance = (weatherSys.weather === "storm" || weatherSys.weather === "hurricane") ? 0.42 : (weatherSys.weather === "overcast" || weatherSys.weather === "rain" ? 0.16 : 0.06);
          const allP = this._collectAllPlayers(vehicle, network);
          const valleyPlayers = allP.filter((pl) => this.world.getBiomeWeights(pl.x, pl.z).mountains < 0.38);
          if (valleyPlayers.length > 0 && Math.random() < chance) {
            const victim = valleyPlayers[Math.floor(Math.random() * valleyPlayers.length)];
            const ang = Math.random() * Math.PI * 2;
            const dist = 145 + Math.random() * 80;
            const tx = victim.x + Math.cos(ang) * dist;
            const tz = victim.z + Math.sin(ang) * dist;
            const driftAng = Math.atan2(victim.z - tz, victim.x - tx) + (Math.random() - 0.5) * 0.7;
            const vx = Math.cos(driftAng) * 11.5, vz = Math.sin(driftAng) * 11.5;
            if (network && network.mode !== "offline") {
              const efRoll = 1 + Math.floor(Math.random() * 5); const scRoll = +(0.52 + efRoll * 0.30).toFixed(2);
              network.send({ type: "hazard_event", kind: "tornado", x: +tx.toFixed(1), z: +tz.toFixed(1), vx: +vx.toFixed(2), vz: +vz.toFixed(2), life: 54 + efRoll * 12, ef: efRoll, scale: scRoll, target: victim.callsign });
            } else {
              this.spawnTornadoNear(victim.x, victim.z, ui, audio);
            }
          }
        }
      } else {
        this.tornado.life -= dt;
        this.tornado.gx += this.tornado.vx * dt;
        this.tornado.gz += this.tornado.vz * dt;
        if (KK.CLARKSON_FARM) {
          const dCF = Math.hypot(this.tornado.gx - KK.CLARKSON_FARM.x, this.tornado.gz - KK.CLARKSON_FARM.z);
          if (dCF < KK.CLARKSON_FARM.radius + 65) {
            const outAng = Math.atan2(this.tornado.gz - KK.CLARKSON_FARM.z, this.tornado.gx - KK.CLARKSON_FARM.x);
            this.tornado.vx = Math.cos(outAng) * 12;
            this.tornado.vz = Math.sin(outAng) * 12;
          }
        }
        if (this.tornado.life <= 0) {
          this.tornado = null;
        }
      }
      if (network && network.mode !== "offline") {
        this.syncAccum += dt;
        if (this.syncAccum >= 0.25) {
          this.syncAccum = 0;
          network.send({
            type: "hazard_sync",
            tornado: this.tornado ? { x: +this.tornado.gx.toFixed(1), z: +this.tornado.gz.toFixed(1), vx: +this.tornado.vx.toFixed(1), vz: +this.tornado.vz.toFixed(1), l: +this.tornado.life.toFixed(1), ef: this.tornado.ef || 3, sc: +(this.tornado.scale || 1.2).toFixed(2) } : null,
            hurricane: this.hurricane ? { x: +this.hurricane.gx.toFixed(1), z: +this.hurricane.gz.toFixed(1), vx: +this.hurricane.vx.toFixed(1), vz: +this.hurricane.vz.toFixed(1), c: this.hurricane.cat, r: +this.hurricane.radius.toFixed(0), l: +this.hurricane.life.toFixed(1), f: this.hurricane.forced ? 1 : 0 } : null
          });
        }
      }
    }

    // Render Tornado Visual + Apply Realistic Mass-Scaled Suction & Swirl Physics!
    if (this.tornado) {
      const tv = this.tornadoVisual;
      tv.grp.visible = true;
      tv.phase += dt * 4.5;
      const tGround = this.world.getTerrainInfo(this.tornado.gx, this.tornado.gz, false).height;
      this.world.toLocal(this.tornado.gx, tGround, this.tornado.gz, tv.grp.position);
      const tSc = this.tornado.scale || 1.0;
      tv.grp.scale.set(tSc, 0.72 + tSc * 0.45, tSc);

      for (let i = 0; i < tv.rings.length; i++) {
        tv.rings[i].rotation.y = tv.phase * (1.8 - i * 0.12);
        tv.rings[i].position.x = Math.sin(tv.phase * 0.5 + i * 0.5) * (1.2 + i * 0.7);
      }
      for (const db of tv.debris) {
        db.ang += dt * (4.5 - db.h * 0.02);
        db.mesh.position.set(Math.cos(db.ang) * db.rad, db.h, Math.sin(db.ang) * db.rad);
        db.mesh.rotation.x += dt * 4; db.mesh.rotation.y += dt * 3;
      }

      const dTor = Math.hypot(this.tornado.gx - px, this.tornado.gz - pz);
      if (dTor < 220 && Math.random() < 0.55) {
        particles.emitCrashBurst(this.tornado.gx + (Math.random() - 0.5) * 14, tGround + 1.5, this.tornado.gz + (Math.random() - 0.5) * 14, 0.5, "gravel", weatherSys.weather);
      }
      if (dTor < 88) {
        const pull = Math.pow(1 - dTor / 88, 1.5);
        const massResist = Math.min(1.3, 2100 / Math.max(950, vehicle.getTotalMassKg()));
        const dx = (this.tornado.gx - px) / Math.max(1, dTor);
        const dz = (this.tornado.gz - pz) / Math.max(1, dTor);
        const swirlX = -dz, swirlZ = dx;
        const accel = pull * 26.0 * massResist;
        vehicle.vel.x += (dx * 0.75 + swirlX * 0.65) * accel * dt;
        vehicle.vel.z += (dz * 0.75 + swirlZ * 0.65) * accel * dt;
        if (dTor < 28) {
          vehicle.vel.y += pull * 24.0 * massResist * dt;
          vehicle.angVel.y += pull * 2.2 * massResist * dt;
        }
      }
    } else {
      this.tornadoVisual.grp.visible = false;
    }

    // ------------------------------------------------------------------------
    // 6. CATEGORY 1-5 OCEAN HURRICANES (Outer Bands -> Violent Eyewall -> Calm Eye!)
    // ------------------------------------------------------------------------
    const ab = boats ? boats.activeBoat : null;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const fxH = ab ? ab.gx : px, fzH = ab ? ab.gz : pz;
    const bSea = this.world.getBiomeWeights(fxH, fzH);
    const inOpenSea = (bSea.ocean || 0) > 0.58 || (ab && ab.waterDepth > 4.0);

    if (isAuth) {
      if (!this.hurricane) {
        this.hurricaneCheckTimer -= dt;
        if (this.hurricaneCheckTimer <= 0) {
          this.hurricaneCheckTimer = 38 + Math.random() * 44;
          const spawnChance = (weatherSys.weather === "hurricane" || weatherSys.weather === "storm")
            ? 0.78 : ((weatherSys.weather === "rain" || weatherSys.weather === "overcast") ? 0.50 : 0.34);
          if (inOpenSea && Math.random() < spawnChance) {
            const cat = (weatherSys.weather === "hurricane")
              ? (3 + Math.floor(Math.random() * 3))
              : (1 + Math.floor(Math.random() * 5));
            const ang = Math.random() * Math.PI * 2;
            const spawnDist = 320 + Math.random() * 140;
            const hx = fxH + Math.cos(ang) * spawnDist;
            const hz = fzH + Math.sin(ang) * spawnDist;
            if ((this.world.getBiomeWeights(hx, hz).ocean || 0) > 0.55) {
              const radius = 240 + cat * 55;
              const moveSpd = 6.2 + cat * 0.65;
              const dirAng = Math.atan2(fzH - hz, fxH - hx) + (Math.random() - 0.5) * 0.25;
              this.hurricane = {
                gx: hx, gz: hz,
                vx: Math.cos(dirAng) * moveSpd, vz: Math.sin(dirAng) * moveSpd,
                cat, radius,
                eyeRadius: radius * 0.22,
                eyewallRadius: radius * 0.48,
                life: 85 + cat * 15, maxLife: 85 + cat * 15,
                forced: false
              };
              this._lastHurricaneZone = "none";
              if (audio) {
                if (audio.playSeaDreadPulse) audio.playSeaDreadPulse(0.82, "hurricane");
                else if (audio.playThunder) audio.playThunder();
              }
              if (ui) ui.toast(`🌀 CATEGORY ${cat} OCEAN HURRICANE FORMING AHEAD! Eyewall winds rising — brace your helm!`, true);
              if (network && network.mode !== "offline") {
                network.send({
                  type: "hazard_event", kind: "hurricane",
                  x: +hx.toFixed(1), z: +hz.toFixed(1),
                  vx: +this.hurricane.vx.toFixed(2), vz: +this.hurricane.vz.toFixed(2),
                  cat, radius: +radius.toFixed(1), life: +this.hurricane.life.toFixed(1), forced: false
                });
              }
            }
          }
        }
      } else {
        this.hurricane.life -= dt;
        this.hurricane.gx += this.hurricane.vx * dt;
        this.hurricane.gz += this.hurricane.vz * dt;
        const overWater = (this.world.getBiomeWeights(this.hurricane.gx, this.hurricane.gz).ocean || 0) >= 0.42;
        if (this.hurricane.life <= 0 || !overWater) {
          this.hurricane = null;
          this._lastHurricaneZone = "none";
        }
      }
    }

    if (this.hurricane && this.hurricaneVisual) {
      const h = this.hurricane;
      const hv = this.hurricaneVisual;
      hv.grp.visible = true;
      const rotSpd = 0.72 + h.cat * 0.26;
      hv.phase += dt * rotSpd;

      // Anchor hurricane base at sea level (or local terrain if forced inland for testing!)
      const hBaseY = h.forced
        ? Math.max(seaL, this.world.getTerrainInfo(h.gx, h.gz, false).height - 2.0)
        : seaL;
      this.world.toLocal(h.gx, hBaseY, h.gz, hv.grp.position);

      // Scale horizontal extent so visual eyewall matches physics radius/eyeRadius 1:1!
      const horizScale = h.radius / 220.0;
      const vertScale  = 0.85 + h.cat * 0.14;
      hv.grp.scale.set(horizScale, vertScale, horizScale);

      // Rotate concentric eyewall cloud cylinders, spiral rainbands, and whirlpool spray rings
      for (let i = 0; i < hv.eyewallLayers.length; i++) {
        const ly = hv.eyewallLayers[i];
        ly.mesh.rotation.y = hv.phase * ly.spd;
      }
      hv.anvilDeck.rotation.z = hv.phase * 0.35;
      for (let bIdx = 0; bIdx < hv.spiralBands.length; bIdx++) {
        const sb = hv.spiralBands[bIdx];
        sb.grp.rotation.y = sb.baseAng + hv.phase * sb.spd;
      }
      hv.sprayCollarIn.rotation.y  = hv.phase * 1.45;
      hv.sprayCollarOut.rotation.y = hv.phase * 1.05;
      for (let rIdx = 0; rIdx < hv.sprayRings.length; rIdx++) {
        hv.sprayRings[rIdx].mesh.rotation.z = hv.phase * hv.sprayRings[rIdx].spd;
      }

      // Internal Eyewall Lightning Bolts & Cloud Illumination Flash!
      hv.nextBoltCd -= dt * (0.7 + h.cat * 0.22);
      if (hv.nextBoltCd <= 0) {
        hv.nextBoltCd = 0.85 + Math.random() * 2.4;
        hv.flashTimer = 0.22 + Math.random() * 0.14;
        hv.activeBoltIdx = Math.floor(Math.random() * hv.bolts.length);
        for (let k = 0; k < hv.bolts.length; k++) {
          hv.bolts[k].grp.visible = (k === hv.activeBoltIdx);
          if (k === hv.activeBoltIdx) {
            const randAng = Math.random() * Math.PI * 2;
            const rad = 56 + Math.random() * 24;
            hv.bolts[k].grp.position.set(Math.cos(randAng) * rad, 22, Math.sin(randAng) * rad);
            hv.bolts[k].grp.rotation.y = randAng;
          }
        }
        const dPlayH = Math.hypot(fxH - h.gx, fzH - h.gz);
        if (dPlayH < h.radius * 1.15 && audio && Math.random() < 0.45) {
          audio.playThunder();
        }
      }
      if (hv.flashTimer > 0) {
        hv.flashTimer -= dt;
        const flNorm = Math.max(0, hv.flashTimer / 0.32);
        hv.matFlashGlow.opacity = flNorm * (0.34 + h.cat * 0.05);
        if (hv.flashTimer <= 0) {
          hv.matFlashGlow.opacity = 0;
          for (let k = 0; k < hv.bolts.length; k++) hv.bolts[k].grp.visible = false;
        }
      }

      // Evaluate exact zone effect at player position
      const eff = this.getHurricaneEffectAt(fxH, fzH);
      const curZone = eff.inEye ? "eye" : (eff.inEyewall ? "eyewall" : (eff.intensity > 0.08 ? "outer" : "none"));
      if (curZone !== this._lastHurricaneZone) {
        if (curZone === "eye" && ui) {
          ui.toast(`👁️ YOU ENTERED THE CALM EYE OF THE CAT-${h.cat} HURRICANE! Eerie silence overhead — eyewall surrounds you!`, false);
        } else if (curZone === "eyewall" && ui) {
          ui.toast(`🌀 CAT-${h.cat} EYEWALL!! Violent cyclonic winds & rogue waves — fight the helm!`, true);
          if (audio && audio.playSeaDreadPulse) audio.playSeaDreadPulse(0.85, "hurricane");
        }
        this._lastHurricaneZone = curZone;
      }

      // Apply cyclonic wind, rogue wave surge & blinding spray to activeBoat
      if (ab && eff.intensity > 0.01 && !eff.inEye) {
        const massDamp = ab.spec.len > 36 ? 0.46 : (ab.spec.len > 20 ? 0.68 : 1.05);
        const pushScale = (eff.inEyewall ? 0.42 : 0.28) * massDamp;
        ab.vx += eff.windX * pushScale * dt;
        ab.vz += eff.windZ * pushScale * dt;
        // Rogue wave heaving & chaotic rolling in eyewall
        const heaveWave = Math.sin(hv.phase * 2.9 + ab.gx * 0.03) * eff.waveBoost;
        const pitchWave = Math.cos(hv.phase * 2.2 + ab.gz * 0.03) * eff.waveBoost;
        ab.roll  += heaveWave * (eff.inEyewall ? 0.42 : 0.22) * massDamp * dt;
        ab.pitch += pitchWave * (eff.inEyewall ? 0.24 : 0.12) * massDamp * dt;
        if (particles && Math.random() < (eff.inEyewall ? 0.78 : 0.40)) {
          particles.emitWaterSplash(
            ab.gx + (Math.random() - 0.5) * 22,
            seaL + 0.6,
            ab.gz + (Math.random() - 0.5) * 22,
            1.5 + eff.intensity * 2.2
          );
        }
      }

      // Apply cyclonic wind + water push to swimming/coastal vehicles (when not mounted on a boat)
      const isVehMounted = ab && boats && boats.getLocalMountedEntry && boats.getLocalMountedEntry(ab);
      if (vehicle && !isVehMounted) {
        const vEff = ab ? this.getHurricaneEffectAt(px, pz) : eff;
        if (vEff.intensity > 0.02 && !vEff.inEye) {
          const massResist = Math.min(1.25, 2200 / Math.max(950, vehicle.getTotalMassKg ? vehicle.getTotalMassKg() : 2000));
          const inWater = (vehicle.inWaterDepth || 0) > 0.25 || py < seaL + 2.5;
          const windForce = (inWater ? 0.58 : 0.34) * massResist;
          vehicle.vel.x += vEff.windX * windForce * dt;
          vehicle.vel.z += vEff.windZ * windForce * dt;
          if (vEff.inEyewall) {
            vehicle.angVel.y += Math.sin(hv.phase * 3.1) * 0.65 * vEff.intensity * massResist * dt;
            if (inWater) {
              vehicle.vel.y += Math.sin(hv.phase * 2.6) * 2.4 * vEff.waveBoost * dt;
            }
          }
          if (particles && inWater && Math.random() < 0.55) {
            particles.emitWaterSplash(px + (Math.random() - 0.5) * 14, seaL + 0.4, pz + (Math.random() - 0.5) * 14, 1.4 + vEff.intensity * 1.8);
          }
        }
      }
    } else if (this.hurricaneVisual) {
      this.hurricaneVisual.grp.visible = false;
      this._lastHurricaneZone = "none";
    }
  }
};
