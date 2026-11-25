// ============================================================================
// js/hazards.js (v9) — Throwable Road Flares, Volcanic Lava Bombs,
// Falling Mountain Rocks, Snow Avalanches & Rare Realistic Tornadoes!
// ============================================================================
window.KK = window.KK || {};

KK.HazardManager = class HazardManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;

    this.flares = [];          // Burning thrown road flares (distract T-Rex & light up fog!)
    this.lavaBombs = [];       // Fiery arcing boulders erupting from Mt. Vulkan!
    this.fallingRocks = [];    // Tumbling rocks on mountain passes & Southern Touge!
    this.avalancheChunks = []; // Cascading snow wall on snowy peaks!
    this.tornado = null;       // Rare realistic twisting funnel cloud!
    this.hurricane = null;     // v15.5 Cat 1-5 Ocean Hurricane (strictly at sea!)
    this.hurricaneCheckTimer = 75.0;
    this.avalancheWaves = [];  // v15.5 Staggered 3-wave avalanche queue!

    this.lavaTimer = 4.0;
    this.rockTimer = 5.0;
    this.avalancheTimer = 38.0;
    this.tornadoCheckTimer = 65.0;
    this.syncAccum = 0;

    // Shared geometries & materials (zero GPU leaks!)
    this.geoFlare = new THREE.CylinderGeometry(0.055, 0.055, 0.36, 7);
    this.matFlare = new THREE.MeshBasicMaterial({ color: 0xff2442 });
    this.geoLava = new THREE.DodecahedronGeometry(0.95, 0);
    this.matLava = new THREE.MeshStandardMaterial({ color: 0x3b1810, emissive: 0xff4800, emissiveIntensity: 1.4, roughness: 0.7 });
    this.geoFallRock = new THREE.DodecahedronGeometry(1.25, 0);
    this.matFallRock = new THREE.MeshStandardMaterial({ color: 0x5c5b56, roughness: 0.94 });
    this.geoSnowBall = new THREE.DodecahedronGeometry(1.65, 0);
    this.matSnowBall = new THREE.MeshStandardMaterial({ color: 0xeef6fc, roughness: 0.9 });

    this._buildTornadoMesh();
    this._buildHurricaneMesh();
  }

  _buildHurricaneMesh() {
    const grp = new THREE.Group();
    const rings = [];
    const matCloud = new THREE.MeshBasicMaterial({ color: 0x3b4d5e, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
    const matSpray = new THREE.MeshBasicMaterial({ color: 0xcbe8f5, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
    for (let i = 0; i < 6; i++) {
      const rIn = 32 + i * 16, rOut = rIn + 24;
      const ring = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 24), i < 2 ? matSpray : matCloud);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = i < 2 ? (2.5 + i * 4.5) : (26 + i * 14);
      grp.add(ring);
      rings.push(ring);
    }
    grp.visible = false;
    this.scene.add(grp);
    this.hurricaneVisual = { grp, rings, phase: 0 };
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

  // Find nearest burning road flare (used by Volcanic T-Rex distraction!)
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
    const hCenter = this.world.getTerrainInfo(px, pz, false).height;
    // Find uphill direction so snow cascade rolls downhill across the player's road!
    const eps = 18;
    const hE = this.world.getTerrainInfo(px + eps, pz, false).height;
    const hW = this.world.getTerrainInfo(px - eps, pz, false).height;
    const hS = this.world.getTerrainInfo(px, pz + eps, false).height;
    const hN = this.world.getTerrainInfo(px, pz - eps, false).height;
    let ux = hE - hW, uz = hS - hN;
    const ulen = Math.hypot(ux, uz) || 1;
    ux /= ulen; uz /= ulen;

    // v15.5 MASSIVE 3-WAVE AVALANCHE (21-24 Snow & Ice Boulders in 3 Staggered Waves!)
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
      
    } else if (msg.kind === "avalanche") {
      if (distToLocal < 280) {
        this.triggerAvalancheNear(tx, tz, ui, audio);
      } else if (ui) {
        
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

  applySyncState(tData) {
    if (!tData) {
      this.tornado = null;
      return;
    }
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
        if (fl.gy <= gh) {
          fl.gy = gh;
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
        // Launch from volcano crater peak (-85, +80, +12 relative to landmark)!
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
      const stormBoost = (weatherSys.weather === "storm" || weatherSys.weather === "rain") ? 2.0 : 1.0;
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
          const ahead = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
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
          const chance = weatherSys.weather === "storm" ? 0.42 : (weatherSys.weather === "overcast" || weatherSys.weather === "rain" ? 0.16 : 0.06);
          const allP = this._collectAllPlayers(vehicle, network);
          const valleyPlayers = allP.filter((pl) => this.world.getBiomeWeights(pl.x, pl.z).mountains < 0.38);
          if (valleyPlayers.length > 0 && Math.random() < chance) {
            // Randomly pick ANY LAN player (not always the host!)
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
        // Tornadoes deflect away from Clarkson's Farm sanctuary!
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
            tornado: this.tornado ? { x: +this.tornado.gx.toFixed(1), z: +this.tornado.gz.toFixed(1), vx: +this.tornado.vx.toFixed(1), vz: +this.tornado.vz.toFixed(1), l: +this.tornado.life.toFixed(1), ef: this.tornado.ef || 3, sc: +(this.tornado.scale || 1.2).toFixed(2) } : null
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
        // Realistic mass resistance: heavy 11.8-ton MAZ-537 resists 4x better than a 1.1-ton Jimny!
        const massResist = Math.min(1.3, 2100 / Math.max(950, vehicle.getTotalMassKg()));
        const dx = (this.tornado.gx - px) / Math.max(1, dTor);
        const dz = (this.tornado.gz - pz) / Math.max(1, dTor);
        // Tangential swirl + inward suction + core vertical lift!
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

    // 6. v15.5 CATEGORY 1-5 OCEAN HURRICANES (Strictly Open Sea — Tests Ships!)
    const ab = boats ? boats.activeBoat : null;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const fxH = ab ? ab.gx : px, fzH = ab ? ab.gz : pz;
    const bSea = this.world.getBiomeWeights(fxH, fzH);
    const inOpenSea = (bSea.ocean || 0) > 0.72;

    if (isAuth) {
      if (!this.hurricane) {
        this.hurricaneCheckTimer -= dt;
        if (this.hurricaneCheckTimer <= 0) {
          this.hurricaneCheckTimer = 65 + Math.random() * 75;
          if (inOpenSea && Math.random() < (weatherSys.weather === "storm" ? 0.65 : 0.32)) {
            const cat = 1 + Math.floor(Math.random() * 5);
            const ang = Math.random() * Math.PI * 2;
            const hx = fxH + Math.cos(ang) * 260, hz = fzH + Math.sin(ang) * 260;
            if ((this.world.getBiomeWeights(hx, hz).ocean || 0) > 0.75) {
              this.hurricane = {
                gx: hx, gz: hz,
                vx: (fxH - hx) * 0.032, vz: (fzH - hz) * 0.032,
                cat, radius: 190 + cat * 42, life: 52 + cat * 10
              };
              if (ui) ui.toast(`🌀 CATEGORY ${cat} OCEAN HURRICANE FORMING AHEAD! Brace your helm & watch your roll!`, true);
            }
          }
        }
      } else {
        this.hurricane.life -= dt;
        this.hurricane.gx += this.hurricane.vx * dt;
        this.hurricane.gz += this.hurricane.vz * dt;
        if (this.hurricane.life <= 0 || (this.world.getBiomeWeights(this.hurricane.gx, this.hurricane.gz).ocean || 0) < 0.45) {
          this.hurricane = null;
        }
      }
    }

    if (this.hurricane && this.hurricaneVisual) {
      const hv = this.hurricaneVisual;
      hv.grp.visible = true;
      hv.phase += dt * (1.2 + this.hurricane.cat * 0.45);
      this.world.toLocal(this.hurricane.gx, seaL, this.hurricane.gz, hv.grp.position);
      const scH = 0.85 + this.hurricane.cat * 0.24;
      hv.grp.scale.set(scH, 1.0, scH);
      for (let i = 0; i < hv.rings.length; i++) hv.rings[i].rotation.z = hv.phase * (i % 2 === 0 ? 1 : -0.75);

      if (ab) {
        const dxH = ab.gx - this.hurricane.gx, dzH = ab.gz - this.hurricane.gz;
        const dH = Math.hypot(dxH, dzH);
        if (dH < this.hurricane.radius) {
          const intens = (1.0 - dH / this.hurricane.radius) * (0.45 + this.hurricane.cat * 0.34);
          const tx = -dzH / Math.max(1, dH), tz = dxH / Math.max(1, dH);
          const massDamp = ab.spec.len > 36 ? 0.55 : (ab.spec.len > 20 ? 0.78 : 1.15);
          ab.vx += tx * intens * 14.0 * massDamp * dt;
          ab.vz += tz * intens * 14.0 * massDamp * dt;
          ab.roll += Math.sin(hv.phase * 2.4) * intens * 0.36 * massDamp * dt;
          ab.pitch += Math.cos(hv.phase * 1.9) * intens * 0.20 * massDamp * dt;
          if (particles && Math.random() < 0.45) {
            particles.emitWaterSplash(ab.gx + (Math.random() - 0.5) * 18, seaL + 0.5, ab.gz + (Math.random() - 0.5) * 18, 1.6 + intens);
          }
        }
      }
    } else if (this.hurricaneVisual) {
      this.hurricaneVisual.grp.visible = false;
    }
  }
};
