// ============================================================================
// js/ai_entities.js (v13.9) — Biome-Specific Wildlife (Taiga Deer, River Fish,
// Snowy Mountain Goats, Desert Camels), Loose Crates & Directional Winch Cable!
// ============================================================================
window.KK = window.KK || {};

KK.EntityManager = class EntityManager {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.deers = []; this.goats = []; this.camels = []; this.fishes = []; this.looseCrates = [];

    this.winchLineGeo = new THREE.BufferGeometry();
    this.winchLineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12 * 3), 3));
    this.winchLine = new THREE.Line(this.winchLineGeo, new THREE.LineBasicMaterial({ color: 0xffd166 }));
    this.winchLine.visible = false;
    this.scene.add(this.winchLine);

    this.matDeerFur   = new THREE.MeshStandardMaterial({ color: 0x6e4b30, roughness: 0.9 });
    this.matDeerBelly = new THREE.MeshStandardMaterial({ color: 0xc9b498, roughness: 0.9 });
    this.matAntler    = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.8 });
    this.matGoatWool  = new THREE.MeshStandardMaterial({ color: 0xedf2f4, roughness: 0.92 });
    this.matGoatHorn  = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.85 });
    this.matCamelFur  = new THREE.MeshStandardMaterial({ color: 0xc99a5b, roughness: 0.94 });
    this.matFish      = new THREE.MeshStandardMaterial({ color: 0x56cfe1, roughness: 0.25, metalness: 0.55 });
    this.matFishFin   = new THREE.MeshStandardMaterial({ color: 0xff9f1c, roughness: 0.50 });

    for (let i = 0; i < 16; i++) this._spawnDeer(i, 2400, 300);
    for (let i = 0; i < 12; i++) this._spawnGoat(i, -12000, -16000);
    for (let i = 0; i < 10; i++) this._spawnCamel(i, 2400, 6200);
    for (let i = 0; i < 20; i++) this._spawnFish(i);

    this.spawnLooseCrate(-22, -2.5, "standard");
    this.spawnLooseCrate(-20.6, -2.5, "fuel_drums");
    this.spawnLooseCrate(-19.2, -2.5, "fragile");
  }

  _buildDeerMesh(hasAntlers) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.56, 1.35), this.matDeerFur);
    body.position.y = 1.02; body.castShadow = true; grp.add(body);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.52, 0.30), this.matDeerFur);
    neck.position.set(0, 1.38, 0.58); neck.rotation.x = 0.25; grp.add(neck);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.42), this.matDeerFur);
    head.position.set(0, 1.64, 0.78); grp.add(head);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xe6ff99 });
    for (const ex of [-0.11, 0.11]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), eyeMat);
      eye.position.set(ex, 1.68, 0.88); grp.add(eye);
    }
    if (hasAntlers) {
      for (const sx of [-1, 1]) {
        const ant = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 0.05), this.matAntler);
        ant.position.set(sx * 0.14, 1.92, 0.68); ant.rotation.z = -sx * 0.35; grp.add(ant);
      }
    }
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.20, 0.12), this.matDeerBelly);
    tail.position.set(0, 1.12, -0.72); grp.add(tail);
    const legs = [];
    for (const [lx, lz] of [[-0.2, 0.48], [0.2, 0.48], [-0.2, -0.48], [0.2, -0.48]]) {
      const piv = new THREE.Group(); piv.position.set(lx, 0.78, lz);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.78, 0.11), this.matDeerFur);
      leg.position.y = -0.39; piv.add(leg); grp.add(piv); legs.push(piv);
    }
    grp.userData.legs = legs; return grp;
  }

  _buildGoatMesh() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.50, 1.05), this.matGoatWool);
    body.position.y = 0.82; body.castShadow = true; grp.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.36), this.matGoatWool);
    head.position.set(0, 1.14, 0.60); grp.add(head);
    const beard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.08), this.matGoatWool);
    beard.position.set(0, 0.94, 0.70); grp.add(beard);
    for (const sx of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.045, 0.42, 6), this.matGoatHorn);
      horn.position.set(sx * 0.10, 1.38, 0.52); horn.rotation.x = -0.55; horn.rotation.z = -sx * 0.22; grp.add(horn);
    }
    const legs = [];
    for (const [lx, lz] of [[-0.17, 0.36], [0.17, 0.36], [-0.17, -0.36], [0.17, -0.36]]) {
      const piv = new THREE.Group(); piv.position.set(lx, 0.60, lz);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.60, 0.09), this.matGoatHorn);
      leg.position.y = -0.30; piv.add(leg); grp.add(piv); legs.push(piv);
    }
    grp.userData.legs = legs; return grp;
  }

  _buildCamelMesh() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.86, 1.85), this.matCamelFur);
    body.position.y = 1.62; body.castShadow = true; grp.add(body);
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 8), this.matCamelFur);
    hump.scale.set(0.9, 1.05, 1.25); hump.position.set(0, 2.22, -0.05); grp.add(hump);
    const neck1 = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.36), this.matCamelFur);
    neck1.position.set(0, 1.98, 1.05); neck1.rotation.x = 0.55; grp.add(neck1);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.32, 0.56), this.matCamelFur);
    head.position.set(0, 2.42, 1.44); grp.add(head);
    const legs = [];
    for (const [lx, lz] of [[-0.28, 0.68], [0.28, 0.68], [-0.28, -0.68], [0.28, -0.68]]) {
      const piv = new THREE.Group(); piv.position.set(lx, 1.24, lz);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.24, 0.14), this.matCamelFur);
      leg.position.y = -0.62; piv.add(leg); grp.add(piv); legs.push(piv);
    }
    grp.userData.legs = legs; return grp;
  }

  _buildFishMesh() {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.85, 6), this.matFish);
    body.rotation.x = Math.PI / 2; grp.add(body);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 4), this.matFishFin);
    tail.rotation.x = -Math.PI / 2; tail.position.z = -0.52; grp.add(tail);
    const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.28), this.matFishFin);
    dorsal.position.set(0, 0.16, -0.05); grp.add(dorsal);
    return grp;
  }

  _spawnDeer(index, cx, cz) {
    const mesh = this._buildDeerMesh(index % 2 === 0); this.scene.add(mesh);
    this.deers.push({ id: index, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "graze", timer: 2 + Math.random() * 5, phase: Math.random() * 10, stunTimer: 0, mesh });
  }
  _spawnGoat(index, cx, cz) {
    const mesh = this._buildGoatMesh(); this.scene.add(mesh);
    this.goats.push({ id: index, gx: cx, gy: 180, gz: cz, yaw: Math.random() * 6.28, state: "graze", timer: 2 + Math.random() * 5, phase: Math.random() * 10, mesh });
  }
  _spawnCamel(index, cx, cz) {
    const mesh = this._buildCamelMesh(); this.scene.add(mesh);
    this.camels.push({ id: index, gx: cx, gy: 15, gz: cz, yaw: Math.random() * 6.28, state: "graze", timer: 3 + Math.random() * 6, phase: Math.random() * 10, stunTimer: 0, mesh });
  }
  _spawnFish(index) {
    const mesh = this._buildFishMesh(); this.scene.add(mesh);
    this.fishes.push({ id: index, gx: 440, gy: 0, gz: 58, yaw: 0, phase: Math.random() * 12, jumpPhase: Math.random() * 8, mesh });
  }

  spawnLooseCrate(gx, gz, cargoType = "standard") {
    const cDef = KK.CARGO_TYPES[cargoType] || KK.CARGO_TYPES.standard;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.95), new THREE.MeshStandardMaterial({ color: cDef.color, roughness: 0.85 }));
    mesh.castShadow = true; this.scene.add(mesh);
    const gy = this.world.getTerrainInfo(gx, gz, false).height + 0.36;
    this.looseCrates.push({ gx, gy, gz, cargoType, mesh });
  }

  findNearestCrate(gx, gz, maxDist = 3.2) {
    let best = null, bestD = maxDist;
    for (let i = 0; i < this.looseCrates.length; i++) {
      const c = this.looseCrates[i];
      const d = Math.hypot(c.gx - gx, c.gz - gz);
      if (d < bestD) { bestD = d; best = { crate: c, idx: i, dist: d }; }
    }
    return best;
  }

  removeCrate(idx) {
    const c = this.looseCrates[idx];
    if (c) { this.scene.remove(c.mesh); this.looseCrates.splice(idx, 1); }
  }

  update(dt, vehicle, weatherSys, onDeerImpact, sirenPos) {
    const px = vehicle.pos.x, pz = vehicle.pos.z;
    const playerBiomes = this.world.getBiomeWeights(px, pz);
    const isDuskOrNight = (weatherSys.timeOfDay > 17.5 || weatherSys.timeOfDay < 6.5);

    // 1. TAIGA-ONLY DEER
    const inTaiga = playerBiomes.taiga > 0.28;
    for (const d of this.deers) {
      if (!inTaiga) { d.mesh.visible = false; continue; }
      const distToPlayer = Math.hypot(d.gx - px, d.gz - pz);
      if (distToPlayer > 340 || this.world.getBiomeWeights(d.gx, d.gz).taiga < 0.26) {
        const ang = Math.random() * Math.PI * 2, rad = 95 + Math.random() * 195;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if (this.world.getBiomeWeights(nx, nz).taiga > 0.30) { d.gx = nx; d.gz = nz; d.state = "wander"; d.stunTimer = 0; d.mesh.rotation.z = 0; }
        else { d.mesh.visible = false; continue; }
      }
      if (d.stunTimer > 0) { d.stunTimer -= dt; d.mesh.rotation.z = Math.PI * 0.48; if (d.stunTimer <= 0) d.mesh.rotation.z = 0; }
      else {
        d.timer -= dt;
        const dSiren = sirenPos ? Math.hypot(d.gx - sirenPos.x, d.gz - sirenPos.z) : 9999;
        if (dSiren < 220) { d.state = "flee"; d.yaw = Math.atan2(d.gx - sirenPos.x, d.gz - sirenPos.z); d.timer = 4.0; }
        else if (distToPlayer < 45 && vehicle.speedKmh > 18) {
          if (vehicle.headlights && isDuskOrNight && Math.random() < 0.32 && d.state !== "flee") { d.state = "freeze"; d.timer = 2.0; }
          else if (d.state !== "freeze") { d.state = "flee"; d.yaw = Math.atan2(d.gx - px, d.gz - pz) + (Math.random() - 0.5) * 0.9; d.timer = 3.2; }
        } else if (d.timer <= 0) { d.state = Math.random() < 0.45 ? "graze" : "wander"; d.yaw += (Math.random() - 0.5) * 2.2; d.timer = 3 + Math.random() * 5; }
        const spd = d.state === "flee" ? 13.5 : (d.state === "wander" ? 2.6 : 0);
        if (spd > 0) {
          d.gx += Math.sin(d.yaw) * spd * dt; d.gz += Math.cos(d.yaw) * spd * dt;
          d.phase += dt * (d.state === "flee" ? 14 : 6);
          const sw = Math.sin(d.phase) * (d.state === "flee" ? 0.85 : 0.42);
          const legs = d.mesh.userData.legs;
          legs[0].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; legs[3].rotation.x = sw;
        }
        const deerHitRad = Math.max(2.55, Math.max(vehicle.spec.bodyWidth, vehicle.spec.bodyLen * 0.56) * 0.54 + 0.75);
        if (distToPlayer < deerHitRad && vehicle.speedKmh > 10 && Math.abs(d.gy - vehicle.pos.y) < 2.8) { d.stunTimer = 6.0; if (onDeerImpact) onDeerImpact("deer", vehicle.speedKmh, d.gx, d.gz); }
      }
      const ti = this.world.getTerrainInfo(d.gx, d.gz, false);
      d.gy = ti.height; this.world.toLocal(d.gx, d.gy, d.gz, d.mesh.position);
      d.mesh.rotation.y = d.yaw; d.mesh.visible = distToPlayer < 290 && ti.waterDepth < 0.3;
    }

    // 2. SNOWY MOUNTAIN GOATS
    const inSnowMtn = (playerBiomes.mountains > 0.32 || vehicle.pos.y > 135 || weatherSys.weather === "snow");
    for (const g of this.goats) {
      if (!inSnowMtn) { g.mesh.visible = false; continue; }
      const dP = Math.hypot(g.gx - px, g.gz - pz);
      if (dP > 320) {
        const ang = Math.random() * 6.28, rad = 85 + Math.random() * 175;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if (this.world.getBiomeWeights(nx, nz).mountains > 0.28 || this.world.getTerrainInfo(nx, nz, false).height > 125) { g.gx = nx; g.gz = nz; }
        else { g.mesh.visible = false; continue; }
      }
      g.timer -= dt;
      if (dP < 38 && vehicle.speedKmh > 12) { g.state = "flee"; g.yaw = Math.atan2(g.gx - px, g.gz - pz); g.timer = 2.8; }
      else if (g.timer <= 0) { g.state = Math.random() < 0.5 ? "graze" : "wander"; g.yaw += (Math.random() - 0.5) * 2.4; g.timer = 2.5 + Math.random() * 4; }
      const spd = g.state === "flee" ? 9.5 : (g.state === "wander" ? 2.0 : 0);
      if (spd > 0) {
        g.gx += Math.sin(g.yaw) * spd * dt; g.gz += Math.cos(g.yaw) * spd * dt;
        g.phase += dt * (g.state === "flee" ? 13 : 5);
        const sw = Math.sin(g.phase) * 0.65;
        const legs = g.mesh.userData.legs;
        legs[0].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; legs[3].rotation.x = sw;
      }
      g.gy = this.world.getTerrainInfo(g.gx, g.gz, false).height;
      this.world.toLocal(g.gx, g.gy, g.gz, g.mesh.position); g.mesh.rotation.y = g.yaw; g.mesh.visible = dP < 270;
    }

    // 3. DESERT CAMELS
    const inDesert = playerBiomes.desert > 0.34;
    for (const c of this.camels) {
      if (!inDesert) { c.mesh.visible = false; continue; }
      const dP = Math.hypot(c.gx - px, c.gz - pz);
      if (dP > 360 || this.world.getBiomeWeights(c.gx, c.gz).desert < 0.30) {
        const ang = Math.random() * 6.28, rad = 95 + Math.random() * 195;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if (this.world.getBiomeWeights(nx, nz).desert > 0.32) { c.gx = nx; c.gz = nz; c.stunTimer = 0; c.mesh.rotation.z = 0; }
        else { c.mesh.visible = false; continue; }
      }
      if (c.stunTimer > 0) { c.stunTimer -= dt; c.mesh.rotation.z = Math.PI * 0.45; if (c.stunTimer <= 0) c.mesh.rotation.z = 0; }
      else {
        c.timer -= dt;
        if (dP < 42 && vehicle.speedKmh > 16) { c.state = "flee"; c.yaw = Math.atan2(c.gx - px, c.gz - pz); c.timer = 3.2; }
        else if (c.timer <= 0) { c.state = Math.random() < 0.45 ? "graze" : "wander"; c.yaw += (Math.random() - 0.5) * 1.8; c.timer = 3 + Math.random() * 6; }
        const spd = c.state === "flee" ? 8.8 : (c.state === "wander" ? 1.9 : 0);
        if (spd > 0) {
          c.gx += Math.sin(c.yaw) * spd * dt; c.gz += Math.cos(c.yaw) * spd * dt;
          c.phase += dt * (c.state === "flee" ? 9 : 4);
          const sw = Math.sin(c.phase) * 0.52;
          const legs = c.mesh.userData.legs;
          legs[0].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; legs[3].rotation.x = sw;
        }
        const camelHitRad = Math.max(2.8, Math.max(vehicle.spec.bodyWidth, vehicle.spec.bodyLen * 0.56) * 0.54 + 0.85);
      if (dP < camelHitRad && vehicle.speedKmh > 12 && Math.abs(c.gy - vehicle.pos.y) < 3.0) { c.stunTimer = 6.0; if (onDeerImpact) onDeerImpact("camel", vehicle.speedKmh, c.gx, c.gz); }
      }
      c.gy = this.world.getTerrainInfo(c.gx, c.gz, false).height;
      this.world.toLocal(c.gx, c.gy, c.gz, c.mesh.position); c.mesh.rotation.y = c.yaw; c.mesh.visible = dP < 310;
    }

    // 4. GREAT KRASNAYA RIVER FISH
    const rcP = this.world.getRiverChannel(px, pz);
    const nearRiver = rcP.seg && rcP.dist < 180;
    for (const f of this.fishes) {
      if (!nearRiver) { f.mesh.visible = false; continue; }
      const dF = Math.hypot(f.gx - px, f.gz - pz);
      if (dF > 175 || !this.world.getRiverChannel(f.gx, f.gz).seg) {
        const seg = rcP.seg, t = Math.random(), off = (Math.random() - 0.5) * seg.halfWidth * 1.1;
        const dx = seg.x1 - seg.x0, dz = seg.z1 - seg.z0, len = Math.hypot(dx, dz) || 1;
        f.gx = seg.x0 + dx * t - (dz / len) * off; f.gz = seg.z0 + dz * t + (dx / len) * off;
        f.yaw = Math.atan2(dx, dz);
      }
      f.phase += dt * 4.2; f.jumpPhase += dt * 0.85;
      f.gx += Math.sin(f.yaw + Math.sin(f.phase * 0.5) * 0.35) * 2.6 * dt;
      f.gz += Math.cos(f.yaw + Math.sin(f.phase * 0.5) * 0.35) * 2.6 * dt;
      const rcF = this.world.getRiverChannel(f.gx, f.gz);
      if (rcF.seg && rcF.dist < rcF.seg.halfWidth * 0.9) {
        const cyc = f.jumpPhase % 6.5;
        const leapH = cyc < 0.85 ? (Math.sin((cyc / 0.85) * Math.PI) * 1.15) : -0.32;
        f.gy = rcF.waterY + leapH;
        this.world.toLocal(f.gx, f.gy, f.gz, f.mesh.position);
        f.mesh.rotation.y = f.yaw + Math.sin(f.phase * 2.5) * 0.22;
        f.mesh.rotation.x = cyc < 0.85 ? -Math.cos((cyc / 0.85) * Math.PI) * 0.65 : 0;
        f.mesh.visible = dF < 160;
      } else { f.yaw += Math.PI * 0.8; f.mesh.visible = false; }
    }

    for (const c of this.looseCrates) {
      this.world.toLocal(c.gx, c.gy, c.gz, c.mesh.position);
      c.mesh.visible = Math.hypot(c.gx - px, c.gz - pz) < 250;
    }
  }

  updateWinchLine(vehicle, remotePlayersMap) {
    if (!vehicle.winch.active) { this.winchLine.visible = false; return; }
    let anchorG = vehicle.winch.anchorPos;
    if (vehicle.winch.targetPeerId && remotePlayersMap) {
      const rp = remotePlayersMap.get(vehicle.winch.targetPeerId);
      if (rp) anchorG = new THREE.Vector3(rp.gx, rp.gy + 0.8, rp.gz);
    }
    if (!anchorG) { this.winchLine.visible = false; return; }
    this.winchLine.visible = true;
    const localAtt = vehicle.winch.localAttach || new THREE.Vector3(0, 0.62, vehicle.spec.bodyLen * 0.5);
    const startG = localAtt.clone().applyQuaternion(vehicle.quat).add(vehicle.pos);
    const startL = this.world.toLocal(startG.x, startG.y, startG.z, new THREE.Vector3());
    const endL = this.world.toLocal(anchorG.x, anchorG.y, anchorG.z, new THREE.Vector3());
    const arr = this.winchLineGeo.attributes.position.array;
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      const sag = Math.sin(t * Math.PI) * Math.max(0.1, (vehicle.winch.length - startL.distanceTo(endL)) * 0.18);
      arr[i * 3 + 0] = startL.x + (endL.x - startL.x) * t;
      arr[i * 3 + 1] = startL.y + (endL.y - startL.y) * t - sag;
      arr[i * 3 + 2] = startL.z + (endL.z - startL.z) * t;
    }
    this.winchLineGeo.attributes.position.needsUpdate = true;
  }

  setThermalMode(isFlir) {
    if (this._thermalOn === isFlir) return;
    this._thermalOn = isFlir;
    const mats = [this.matDeerFur, this.matGoatWool, this.matCamelFur, this.matFish];
    for (const m of mats) {
      if (!m || !m.emissive) continue;
      if (isFlir) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.45; }
      else { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
    }
  }
};
