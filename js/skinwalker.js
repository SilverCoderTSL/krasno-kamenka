// ============================================================================
// js/skinwalker.js (v14.0B) — The Skinwalker (Deer-Ramming Karma Horror!)
// Zero HUD warning text — experienced drivers must read its uncanny tells:
//   • Slightly too tall & ribby-gaunt, inverted rear hocks, forward-facing
//     pale glowing predator eyes; never flees—turns ONLY its head to stare,
//     then glides straight toward your headlights!
//   • Ambush (< 7.5m): Snaps upright, latches onto driver-side window for 3.0s
//     with deafening shriek & horror vignette, then flings rig into nearest boulder!
// ============================================================================
window.KK = window.KK || {};

KK.SkinwalkerManager = class SkinwalkerManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.deerKills = 0;
    this.state = "dormant"; // dormant | disguised | stalk | grab | flee
    this.gx = 2500; this.gy = 20; this.gz = 400;
    this.yaw = 0;
    this.grabTimer = 0;
    this.fleeTimer = 0;
    this.spawnCooldown = 0;
    this.phase = 0;
    this.isGrabbing = false;
    this._netSyncCd = 0;
    this._lastNetState = "dormant";
    this.remoteSkinwalkers = new Map(); // peerId -> { rig, state, gx, gy, gz, yaw, tx, ty, tz, tyaw, phase, lastSeen }

    this._buildMesh();
  }

  _createSkinwalkerRig() {
    const grp = new THREE.Group();
    const matFur   = new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.94 });
    const matPale  = new THREE.MeshStandardMaterial({ color: 0x9c8e7c, roughness: 0.90 });
    const matSkull = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.82 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x120d0c, roughness: 0.96 });
    const matEye   = new THREE.MeshBasicMaterial({ color: 0xf4fcff });

    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 1.24;
    grp.add(bodyPivot);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.50, 1.56), matFur);
    torso.castShadow = true; bodyPivot.add(torso);
    for (let r = -0.45; r <= 0.45; r += 0.22) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.06), matPale);
      rib.position.set(0, -0.04, r); bodyPivot.add(rib);
    }

    const neckPivot = new THREE.Group();
    neckPivot.position.set(0, 0.20, 0.72);
    bodyPivot.add(neckPivot);
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.24), matFur);
    neck.position.set(0, 0.34, 0.06); neck.rotation.x = 0.20; neckPivot.add(neck);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.72, 0.16);
    neckPivot.add(headPivot);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.50), matFur);
    snout.position.set(0, 0, 0.16); headPivot.add(snout);
    const skullFace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.36), matSkull);
    skullFace.position.set(0, 0.04, 0.26); headPivot.add(skullFace);
    const maw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), matDark);
    maw.position.set(0, -0.10, 0.32); headPivot.add(maw);

    for (const ex of [-0.085, 0.085]) {
      const sock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.05), matDark);
      sock.position.set(ex, 0.07, 0.43); headPivot.add(sock);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), matEye);
      eye.position.set(ex, 0.07, 0.455); headPivot.add(eye);
    }
    for (const ax of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.85, 5), matSkull);
      ant.position.set(ax * 0.16, 0.42, 0.02); ant.rotation.z = -ax * 0.42; ant.rotation.x = -0.18;
      headPivot.add(ant);
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 0.42, 5), matSkull);
      tine.position.set(ax * 0.28, 0.56, 0.14); tine.rotation.x = 0.55; tine.rotation.z = -ax * 0.22;
      headPivot.add(tine);
    }
    const makeLeg = (lx, lz, isRear) => {
      const piv = new THREE.Group();
      piv.position.set(lx, -0.18, lz);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), matFur);
      upper.position.set(0, -0.30, isRear ? 0.08 : 0); upper.rotation.x = isRear ? -0.28 : 0.06; piv.add(upper);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), matDark);
      lower.position.set(0, -0.82, isRear ? -0.08 : 0.02); lower.rotation.x = isRear ? 0.26 : -0.06; piv.add(lower);
      bodyPivot.add(piv);
      return piv;
    };
    const legFL = makeLeg(-0.22,  0.58, false);
    const legFR = makeLeg( 0.22,  0.58, false);
    const legRL = makeLeg(-0.22, -0.58, true);
    const legRR = makeLeg( 0.22, -0.58, true);

    grp.visible = false;
    this.scene.add(grp);
    return { mesh: grp, bodyPivot, headPivot, legFL, legFR, legRL, legRR, matEye };
  }

  _buildMesh() {
    const grp = new THREE.Group();
    this.matFur   = new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.94 });
    this.matPale  = new THREE.MeshStandardMaterial({ color: 0x9c8e7c, roughness: 0.90 });
    this.matSkull = new THREE.MeshStandardMaterial({ color: 0xd9d2c5, roughness: 0.82 });
    this.matDark  = new THREE.MeshStandardMaterial({ color: 0x120d0c, roughness: 0.96 });
    this.matEye   = new THREE.MeshBasicMaterial({ color: 0xf4fcff });

    this.bodyPivot = new THREE.Group();
    this.bodyPivot.position.y = 1.24;
    grp.add(this.bodyPivot);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.50, 1.56), this.matFur);
    torso.castShadow = true; this.bodyPivot.add(torso);
    for (let r = -0.45; r <= 0.45; r += 0.22) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.34, 0.06), this.matPale);
      rib.position.set(0, -0.04, r); this.bodyPivot.add(rib);
    }

    this.neckPivot = new THREE.Group();
    this.neckPivot.position.set(0, 0.20, 0.72);
    this.bodyPivot.add(this.neckPivot);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.74, 0.24), this.matFur);
    neck.position.set(0, 0.34, 0.06); neck.rotation.x = 0.20; this.neckPivot.add(neck);

    this.headPivot = new THREE.Group();
    this.headPivot.position.set(0, 0.72, 0.16);
    this.neckPivot.add(this.headPivot);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.50), this.matFur);
    snout.position.set(0, 0, 0.16); this.headPivot.add(snout);
    const skullFace = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.36), this.matSkull);
    skullFace.position.set(0, 0.04, 0.26); this.headPivot.add(skullFace);
    const maw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.24), this.matDark);
    maw.position.set(0, -0.10, 0.32); this.headPivot.add(maw);

    // Uncanny forward-facing predator eyes
    for (const ex of [-0.085, 0.085]) {
      const sock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.05), this.matDark);
      sock.position.set(ex, 0.07, 0.43); this.headPivot.add(sock);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), this.matEye);
      eye.position.set(ex, 0.07, 0.455); this.headPivot.add(eye);
    }

    for (const ax of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, 0.85, 5), this.matSkull);
      ant.position.set(ax * 0.16, 0.42, 0.02); ant.rotation.z = -ax * 0.42; ant.rotation.x = -0.18;
      this.headPivot.add(ant);
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 0.42, 5), this.matSkull);
      tine.position.set(ax * 0.28, 0.56, 0.14); tine.rotation.x = 0.55; tine.rotation.z = -ax * 0.22;
      this.headPivot.add(tine);
    }

    const makeLeg = (lx, lz, isRear) => {
      const piv = new THREE.Group();
      piv.position.set(lx, -0.18, lz);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.62, 0.11), this.matFur);
      upper.position.set(0, -0.30, isRear ? 0.08 : 0);
      upper.rotation.x = isRear ? -0.28 : 0.06;
      piv.add(upper);
      const lower = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.68, 0.09), this.matDark);
      lower.position.set(0, -0.82, isRear ? -0.08 : 0.02);
      lower.rotation.x = isRear ? 0.26 : -0.06;
      piv.add(lower);
      this.bodyPivot.add(piv);
      return piv;
    };
    this.legFL = makeLeg(-0.22,  0.58, false);
    this.legFR = makeLeg( 0.22,  0.58, false);
    this.legRL = makeLeg(-0.22, -0.58, true);
    this.legRR = makeLeg( 0.22, -0.58, true);

    grp.visible = false;
    this.scene.add(grp);
    this.mesh = grp;
  }

  recordDeerKill(gx, gz, vehicle = null) {
    this.deerKills++;
    // Completely silent — ZERO warning text! After 3+ deer kills it quietly manifests ahead of your headlights!
    if (this.deerKills >= 3 && this.state === "dormant" && this.spawnCooldown <= 0) {
      this.spawnNear(gx, gz, vehicle);
    }
  }

  spawnNear(px, pz, vehicle = null) {
    if (vehicle && vehicle.quat) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
      const ahead = 52 + Math.random() * 24;
      const side = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 14);
      this.gx = vehicle.pos.x + fwd.x * ahead - fwd.z * side;
      this.gz = vehicle.pos.z + fwd.z * ahead + fwd.x * side;
    } else {
      const ang = Math.random() * Math.PI * 2;
      const dist = 52 + Math.random() * 28;
      this.gx = px + Math.cos(ang) * dist;
      this.gz = pz + Math.sin(ang) * dist;
    }
    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
    this.state = "disguised";
    this.isGrabbing = false;
    this.mesh.visible = true;
  }

  applyHit(gx, gy, gz, audio, network = null) {
    if (this.state !== "dormant" && this.state !== "flee") {
      const rad = this.state === "grab" ? 12.0 : 4.5;
      if (Math.hypot(this.gx - gx, this.gz - gz) < rad && Math.abs(this.gy - gy) < 8.0) {
        this.repel(audio);
        return { hit: true };
      }
    }
    // Check remote comrades' Skinwalkers so you can shoot them off your friend's window!
    for (const [pid, rsw] of this.remoteSkinwalkers.entries()) {
      if (rsw.state === "dormant" || rsw.state === "flee") continue;
      const rad = rsw.state === "grab" ? 12.0 : 5.0;
      if (Math.hypot(rsw.gx - gx, rsw.gz - gz) < rad && Math.abs(rsw.gy - gy) < 8.5) {
        rsw.state = "flee";
        if (audio) audio.playCryptidSound("skinwalker_shriek");
        if (network) network.send({ type: "skinwalker_repel", ownerPeerId: pid });
        return { hit: true, savedPeerId: pid };
      }
    }
    return { hit: false };
  }

  syncRemote(peerId, msg, audio, localVehicle) {
    if (!peerId || !msg) return;
    if (msg.state === "dormant") {
      this.removeRemote(peerId);
      return;
    }
    let rsw = this.remoteSkinwalkers.get(peerId);
    if (!rsw) {
      rsw = {
        rig: this._createSkinwalkerRig(),
        state: msg.state, gx: msg.gx || 0, gy: msg.gy || 0, gz: msg.gz || 0, yaw: msg.yaw || 0,
        tx: msg.gx || 0, ty: msg.gy || 0, tz: msg.gz || 0, tyaw: msg.yaw || 0,
        phase: 0, lastSeen: performance.now()
      };
      this.remoteSkinwalkers.set(peerId, rsw);
    }
    const prevState = rsw.state;
    rsw.state = msg.state;
    rsw.tx = msg.gx; rsw.ty = msg.gy; rsw.tz = msg.gz; rsw.tyaw = msg.yaw || 0;
    rsw.lastSeen = performance.now();
    if ((rsw.state === "grab" || rsw.state === "flee") && prevState !== rsw.state && audio && localVehicle) {
      if (Math.hypot(localVehicle.pos.x - rsw.tx, localVehicle.pos.z - rsw.tz) < 260) {
        audio.playCryptidSound("skinwalker_shriek");
      }
    }
  }

  removeRemote(peerId) {
    const rsw = this.remoteSkinwalkers.get(peerId);
    if (rsw) {
      this.scene.remove(rsw.rig.mesh);
      this.remoteSkinwalkers.delete(peerId);
    }
  }

  repel(audio) {
    if (this.state === "dormant" || this.state === "flee") return;
    this.state = "flee";
    this.isGrabbing = false;
    this.fleeTimer = 28.0;
    this.grabTimer = 0;
    this.spawnCooldown = 120.0;
    if (audio) audio.playCryptidSound("skinwalker_shriek");
  }

  setThermalMode(isFlir) {
    // Uncanny FLIR tell: Normal deer glow warm white; Skinwalker stays eerily cold with cyan eyes!
    if (!this.matEye) return;
    this.matEye.color.setHex(isFlir ? 0x00f5ff : 0xf4fcff);
    for (const rsw of this.remoteSkinwalkers.values()) { if (rsw.rig && rsw.rig.matEye) rsw.rig.matEye.color.setHex(isFlir ? 0x00f5ff : 0xf4fcff); }
  }

  _findNearestBoulderOrCliff(px, pz) {
    let best = null, bestD = 160;
    if (this.world.activeColliders) {
      for (const c of this.world.activeColliders) {
        if (c.broken) continue;
        if (c.type === "boulder" || c.type === "rock" || c.r > 1.2) {
          const d = Math.hypot(c.x - px, c.z - pz);
          if (d > 6 && d < bestD) { bestD = d; best = { x: c.x, z: c.z }; }
        }
      }
    }
    return best;
  }

  update(dt, vehicle, particles, audio, hazards, game) {
    const ov = document.getElementById("skinwalker-overlay");
    if (this.spawnCooldown > 0) this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);

    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    this._updateRemoteAndBroadcast(dt, px, pz, hazards, audio, game);
    const bw = this.world.getBiomeWeights(px, pz);
    const inWoods = (bw.taiga > 0.30 || bw.rust > 0.35);
    const inSanctuary = (game.clarksonFarm && game.clarksonFarm.isInsideSanctuary(px, pz, 30)) ||
                        (game.hammondMesa && game.hammondMesa.isInsideSanctuary(px, pz, 30));

    if ((this.state === "disguised" || this.state === "stalk" || this.state === "grab") && hazards && hazards.flares) {
      for (const fl of hazards.flares) {
        if (Math.hypot(fl.gx - this.gx, fl.gz - this.gz) < 28) {
          this.repel(audio);
          break;
        }
      }
    }

    if (this.state === "dormant") {
      this.isGrabbing = false;
      this.mesh.visible = false;
      if (ov) ov.classList.remove("active");
      if (this.deerKills >= 3 && this.spawnCooldown <= 0 && inWoods && !inSanctuary && Math.random() < dt * 0.14) {
        const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
        const side = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 14);
        this.gx = px + fwd.x * 58 - fwd.z * side;
        this.gz = pz + fwd.z * 58 + fwd.x * side;
        this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
        this.state = "disguised";
        this.mesh.visible = true;
      }
      return;
    }

    if (this.state === "flee") {
      this.isGrabbing = false;
      if (ov) ov.classList.remove("active");
      this.fleeTimer -= dt;
      const fAng = Math.atan2(this.gx - px, this.gz - pz);
      this.yaw = fAng;
      this.gx += Math.sin(fAng) * 22 * dt;
      this.gz += Math.cos(fAng) * 22 * dt;
      this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
      this.world.toLocal(this.gx, this.gy, this.gz, this.mesh.position);
      this.mesh.rotation.set(0, this.yaw, 0);
      this.bodyPivot.rotation.x = 0; this.bodyPivot.position.y = 1.24;
      this.phase += dt * 15;
      const sw = Math.sin(this.phase) * 0.85;
      this.legFL.rotation.x = sw; this.legRR.rotation.x = sw;
      this.legFR.rotation.x = -sw; this.legRL.rotation.x = -sw;
      if (this.fleeTimer <= 0) { this.state = "dormant"; this.mesh.visible = false; }
      return;
    }

    if (this.state === "grab") {
      this.isGrabbing = true;
      this.grabTimer -= dt;
      if (ov) ov.classList.add("active");

      const sideOff = new THREE.Vector3(-vehicle.spec.bodyWidth * 0.54 - 0.12, 0.38, 0.25).applyQuaternion(vehicle.quat);
      this.gx = px + sideOff.x; this.gy = py + sideOff.y; this.gz = pz + sideOff.z;
      this.world.toLocal(this.gx, this.gy, this.gz, this.mesh.position);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
      const vehYaw = Math.atan2(fwd.x, fwd.z);
      this.mesh.rotation.set(0, vehYaw + Math.PI * 0.5, 0);
      this.bodyPivot.rotation.x = -1.28 + Math.sin(performance.now() * 0.038) * 0.16;
      this.bodyPivot.position.y = 1.65;
      this.headPivot.rotation.set(0.95 + Math.sin(performance.now() * 0.05) * 0.18, Math.sin(performance.now() * 0.04) * 0.25, 0);
      this.legFL.rotation.x = -0.95 + Math.sin(performance.now() * 0.045) * 0.45;
      this.legFR.rotation.x = -0.95 - Math.sin(performance.now() * 0.045) * 0.45;

      if (game) game.cameraShake = Math.max(game.cameraShake, 0.68);
      vehicle.vel.multiplyScalar(Math.max(0.5, 1.0 - dt * 1.8));

      if (this.grabTimer <= 0) {
        this.isGrabbing = false;
        if (ov) ov.classList.remove("active");
        const boulder = this._findNearestBoulderOrCliff(px, pz);
        const flingAng = boulder ? Math.atan2(boulder.x - px, boulder.z - pz) : (vehYaw + (Math.random() > 0.5 ? 1.4 : -1.4));
        const is140 = !!vehicle.spec.isSchreckensfurst;
        const isTank = !!vehicle.spec.isTracked;
        const hasK5 = (vehicle.spec.id === "t72" && !!vehicle.vState.upgrades.t72Kontakt5);
        const k5Scale = is140 ? 0.24 : (isTank || hasK5 ? 0.36 : 1.0);

        vehicle.applyExternalImpulse(
          Math.sin(flingAng) * 34 * k5Scale,
          16.5 * k5Scale,
          Math.cos(flingAng) * 34 * k5Scale,
          (Math.random() - 0.5) * 7.5 * k5Scale
        );
        vehicle.vState.health.body = Math.max(8, vehicle.vState.health.body - Math.round(28 * k5Scale));
        if (audio) audio.playImpact(1.0);
        if (particles) particles.emitCrashBurst(px, py + 1.0, pz, 1.6, "rock", "clear");

        this.state = "flee";
        this.fleeTimer = 24.0;
        this.spawnCooldown = 145.0;
      }
      return;
    }

    if (ov) ov.classList.remove("active");
    const dist = Math.hypot(this.gx - px, this.gz - pz);
    if (dist > 260 || inSanctuary) {
      this.state = "dormant"; this.mesh.visible = false; return;
    }

    const toPlayerAng = Math.atan2(px - this.gx, pz - this.gz);
    if (this.state === "disguised") {
      let headDelta = toPlayerAng - this.yaw;
      while (headDelta > Math.PI) headDelta -= Math.PI * 2;
      while (headDelta < -Math.PI) headDelta += Math.PI * 2;
      this.headPivot.rotation.set(0, Math.max(-1.35, Math.min(1.35, headDelta)), 0);
      this.bodyPivot.rotation.x = 0; this.bodyPivot.position.y = 1.24;
      this.legFL.rotation.x = 0; this.legFR.rotation.x = 0; this.legRL.rotation.x = 0; this.legRR.rotation.x = 0;
      if (dist < 42) this.state = "stalk";
    } else if (this.state === "stalk") {
      this.yaw = toPlayerAng;
      this.headPivot.rotation.set(0.08, 0, Math.sin(performance.now() * 0.008) * 0.16);
      const stalkSpd = dist < 18 ? 14.5 : 6.2;
      this.gx += Math.sin(this.yaw) * stalkSpd * dt;
      this.gz += Math.cos(this.yaw) * stalkSpd * dt;
      this.phase += dt * (dist < 18 ? 14.0 : 5.5);
      const sw = Math.sin(this.phase) * 0.42;
      this.legFL.rotation.x = sw; this.legRR.rotation.x = sw;
      this.legFR.rotation.x = -sw; this.legRL.rotation.x = -sw;

      if (dist < 7.5 && Math.abs(this.gy - py) < 4.5 && !game.onFoot) {
        this.state = "grab";
        this.grabTimer = 3.0;
        if (audio) audio.playCryptidSound("skinwalker_shriek");
        return;
      }
    }

    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
    this.world.toLocal(this.gx, this.gy, this.gz, this.mesh.position);
    this.mesh.rotation.set(0, this.yaw, 0);
    this.mesh.visible = true;
  }

  _updateRemoteAndBroadcast(dt, px, pz, hazards, audio, game) {
    // 1. Broadcast local Skinwalker state while active (or once on returning dormant)
    if (game && game.network && game.network.mode !== "offline") {
      this._netSyncCd = Math.max(0, this._netSyncCd - dt);
      const changed = (this.state !== this._lastNetState);
      if ((this.state !== "dormant" && this._netSyncCd <= 0) || changed) {
        this._netSyncCd = 0.12;
        this._lastNetState = this.state;
        game.network.send({
          type: "skinwalker_sync",
          state: this.state,
          gx: +this.gx.toFixed(2), gy: +this.gy.toFixed(2), gz: +this.gz.toFixed(2),
          yaw: +this.yaw.toFixed(2)
        });
      }
    }

    // 2. Interpolate & animate remote comrades' Skinwalkers (and let local flares repel them!)
    const now = performance.now();
    const lf = Math.min(1, dt * 10);
    for (const [pid, rsw] of this.remoteSkinwalkers.entries()) {
      if (now - rsw.lastSeen > 6000) { this.removeRemote(pid); continue; }
      rsw.gx += (rsw.tx - rsw.gx) * lf;
      rsw.gy += (rsw.ty - rsw.gy) * lf;
      rsw.gz += (rsw.tz - rsw.gz) * lf;
      rsw.yaw = rsw.tyaw;

      if ((rsw.state === "disguised" || rsw.state === "stalk" || rsw.state === "grab") && hazards && hazards.flares) {
        for (const fl of hazards.flares) {
          if (Math.hypot(fl.gx - rsw.gx, fl.gz - rsw.gz) < 28) {
            rsw.state = "flee";
            if (audio) audio.playCryptidSound("skinwalker_shriek");
            if (game && game.network) game.network.send({ type: "skinwalker_repel", ownerPeerId: pid });
            break;
          }
        }
      }

      const rig = rsw.rig;
      this.world.toLocal(rsw.gx, rsw.gy, rsw.gz, rig.mesh.position);
      rig.mesh.rotation.set(0, rsw.yaw, 0);
      rig.mesh.visible = Math.hypot(rsw.gx - px, rsw.gz - pz) < 320;
      if (rsw.state === "grab") {
        rig.bodyPivot.rotation.x = -1.28 + Math.sin(now * 0.038) * 0.16;
        rig.bodyPivot.position.y = 1.65;
        rig.headPivot.rotation.set(0.95, Math.sin(now * 0.04) * 0.25, 0);
        rig.legFL.rotation.x = -0.95 + Math.sin(now * 0.045) * 0.45;
        rig.legFR.rotation.x = -0.95 - Math.sin(now * 0.045) * 0.45;
      } else {
        rig.bodyPivot.rotation.x = 0; rig.bodyPivot.position.y = 1.24;
        rig.headPivot.rotation.set(0.05, 0, 0);
        rsw.phase += dt * (rsw.state === "flee" ? 15 : (rsw.state === "stalk" ? 9 : 0));
        const swA = rsw.state === "disguised" ? 0 : Math.sin(rsw.phase) * 0.65;
        rig.legFL.rotation.x = swA; rig.legRR.rotation.x = swA;
        rig.legFR.rotation.x = -swA; rig.legRL.rotation.x = -swA;
      }
    }
  }
};
