// ============================================================================
// js/town_npcs.js (v14.0A) — Lively Strolling Town Pedestrians Across All 10
// Towns! Rammable with Spinning Ragdoll Launch Physics, -$350 Militia Fine,
// & 65m Town Panic Fleeing!
// ============================================================================
window.KK = window.KK || {};

KK.TownNPCManager = class TownNPCManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.npcs = [];
    this.fineCooldown = 0;

    const coatColors = [0x3d4c5c, 0x6b3a2e, 0x3b4f3a, 0x595248, 0x2c3645, 0x7a5c38, 0x4e3b52];
    const hatColors  = [0x1c1e22, 0x453528, 0x2a323b, 0x612824];
    this.matSkin = new THREE.MeshStandardMaterial({ color: 0xe6b995, roughness: 0.78 });
    this.matPant = new THREE.MeshStandardMaterial({ color: 0x22272e, roughness: 0.92 });
    this.coatMats = coatColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.88 }));
    this.hatMats  = hatColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.90 }));

    for (const town of KK.TOWNS) {
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2 + (town.id * 0.4);
        const rad = 16 + (i % 3) * 11;
        const gx = town.x + Math.cos(ang) * rad;
        const gz = town.z + Math.sin(ang) * rad;
        const gy = this.world.getTerrainInfo(gx, gz, false).height;
        const mesh = this._buildPedestrianMesh(town.id * 7 + i);
        mesh.visible = false;
        this.scene.add(mesh);
        this.npcs.push({
          townId: town.id,
          homeX: town.x, homeZ: town.z,
          gx, gy, gz,
          vx: 0, vy: 0, vz: 0,
          rotX: 0, rotZ: 0, spinX: 0, spinZ: 0,
          yaw: Math.random() * Math.PI * 2,
          state: i % 3 === 0 ? "idle" : "walk",
          timer: 2 + Math.random() * 6,
          phase: Math.random() * 10,
          mesh
        });
      }
    }
  }

  _buildPedestrianMesh(seedIdx) {
    const grp = new THREE.Group();
    const matCoat = this.coatMats[seedIdx % this.coatMats.length];
    const matHat  = this.hatMats[seedIdx % this.hatMats.length];

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.66, 0.28), matCoat);
    torso.position.y = 1.12; torso.castShadow = true; grp.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), this.matSkin);
    head.position.y = 1.62; grp.add(head);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.16, 0.33), matHat);
    hat.position.y = 1.80; grp.add(hat);

    const makeLimb = (w, h, d, mat, px, py) => {
      const piv = new THREE.Group(); piv.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = -h * 0.5; m.castShadow = true; piv.add(m); grp.add(piv); return piv;
    };
    const armL = makeLimb(0.14, 0.56, 0.14, matCoat, -0.32, 1.38);
    const armR = makeLimb(0.14, 0.56, 0.14, matCoat,  0.32, 1.38);
    const legL = makeLimb(0.16, 0.78, 0.16, this.matPant, -0.13, 0.78);
    const legR = makeLimb(0.16, 0.78, 0.16, this.matPant,  0.13, 0.78);
    grp.userData = { armL, armR, legL, legR };
    return grp;
  }

  triggerTownPanic(hitX, hitZ, radius = 65) {
    for (const n of this.npcs) {
      if (n.state === "ragdoll" || n.state === "down") continue;
      if (Math.hypot(n.gx - hitX, n.gz - hitZ) < radius) {
        n.state = "panic";
        n.timer = 10.0 + Math.random() * 5.0;
        n.yaw = Math.atan2(n.gx - hitX, n.gz - hitZ) + (Math.random() - 0.5) * 0.7;
      }
    }
  }

  setThermalMode(isFlir) {
    if (this._thermalOn === isFlir) return;
    this._thermalOn = isFlir;
    const allMats = [this.matSkin, ...this.coatMats];
    for (const m of allMats) {
      if (!m || !m.emissive) continue;
      if (isFlir) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.35; }
      else { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
    }
  }

  update(dt, vehicle, particles, audio, ui, game) {
    if (this.fineCooldown > 0) this.fineCooldown = Math.max(0, this.fineCooldown - dt);
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const vehSpd = vehicle.vel.length();
    const vehRad = Math.max(1.5, vehicle.spec.bodyWidth * 0.58 + 0.55);

    for (const n of this.npcs) {
      const dTown = Math.hypot(n.homeX - px, n.homeZ - pz);
      if (dTown > 340) { n.mesh.visible = false; continue; }

      const limbs = n.mesh.userData;
      const dP = Math.hypot(n.gx - px, n.gz - pz);

      if (n.state === "ragdoll") {
        n.vy -= 18.5 * dt;
        n.gx += n.vx * dt; n.gy += n.vy * dt; n.gz += n.vz * dt;
        n.rotX += n.spinX * dt; n.rotZ += n.spinZ * dt;
        const gh = this.world.getTerrainInfo(n.gx, n.gz, false).height;
        if (n.gy <= gh + 0.25 && n.vy < 0) {
          n.gy = gh + 0.25;
          n.vx *= 0.35; n.vz *= 0.35; n.vy = 0;
          n.state = "down"; n.timer = 7.5 + Math.random() * 3.0;
          n.rotX = Math.PI * 0.48; n.rotZ = 0;
        }
        this.world.toLocal(n.gx, n.gy, n.gz, n.mesh.position);
        n.mesh.rotation.set(n.rotX, n.yaw, n.rotZ);
        n.mesh.visible = dP < 310;
        continue;
      }

      if (n.state === "down") {
        n.timer -= dt;
        if (n.timer <= 0) {
          n.state = "panic"; n.timer = 7.0;
          n.rotX = 0; n.rotZ = 0;
          n.yaw = Math.atan2(n.gx - px, n.gz - pz);
        }
        this.world.toLocal(n.gx, n.gy, n.gz, n.mesh.position);
        n.mesh.rotation.set(n.rotX, n.yaw, n.rotZ);
        n.mesh.visible = dP < 310;
        continue;
      }

      if (dP < vehRad && vehSpd > 2.4 && Math.abs(n.gy - py) < 2.6) {
        const launchAng = Math.atan2(n.gx - px, n.gz - pz) + (Math.random() - 0.5) * 0.35;
        const kick = Math.min(26, 7.5 + vehSpd * 1.15);
        n.state = "ragdoll";
        n.vx = Math.sin(launchAng) * kick + vehicle.vel.x * 0.45;
        n.vz = Math.cos(launchAng) * kick + vehicle.vel.z * 0.45;
        n.vy = Math.min(14.5, 5.2 + vehSpd * 0.42);
        n.spinX = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 7);
        n.spinZ = (Math.random() - 0.5) * 10;

        if (audio && audio.playNpcRam) audio.playNpcRam();
        if (particles) particles.emitCrashBurst(n.gx, n.gy + 0.9, n.gz, 0.45, "dirt", "clear");
        this.triggerTownPanic(n.gx, n.gz, 65);

        if (this.fineCooldown <= 0 && game) {
          this.fineCooldown = 2.0;
          const fine = Math.min(game.money, 350);
          game.money = Math.max(0, game.money - fine);
          if (ui) ui.toast(`WHOA! You rammed a local townsfolk! -$${fine} Militia Fine — locals are fleeing!`, true);
        }
        continue;
      }

      n.timer -= dt;
      if (dP < 12.0 && vehSpd > 6.0 && n.state !== "panic") {
        n.state = "panic"; n.timer = 6.5;
        n.yaw = Math.atan2(n.gx - px, n.gz - pz) + (Math.random() - 0.5) * 0.6;
      }

      if (n.state === "panic") {
        if (n.timer <= 0) { n.state = "walk"; n.timer = 4 + Math.random() * 4; }
        n.gx += Math.sin(n.yaw) * 6.4 * dt;
        n.gz += Math.cos(n.yaw) * 6.4 * dt;
        n.phase += dt * 13.5;
        const sw = Math.sin(n.phase) * 0.95;
        limbs.legL.rotation.x = sw; limbs.legR.rotation.x = -sw;
        limbs.armL.rotation.x = -2.4 + Math.sin(n.phase * 1.5) * 0.4;
        limbs.armR.rotation.x = -2.4 - Math.sin(n.phase * 1.5) * 0.4;
      } else {
        if (n.timer <= 0) {
          n.state = Math.random() < 0.36 ? "idle" : "walk";
          n.timer = 3 + Math.random() * 6;
          if (Math.hypot(n.gx - n.homeX, n.gz - n.homeZ) > 46) {
            n.yaw = Math.atan2(n.homeX - n.gx, n.homeZ - n.gz) + (Math.random() - 0.5) * 0.8;
          } else {
            n.yaw += (Math.random() - 0.5) * 2.2;
          }
        }
        if (n.state === "walk") {
          n.gx += Math.sin(n.yaw) * 1.65 * dt;
          n.gz += Math.cos(n.yaw) * 1.65 * dt;
          n.phase += dt * 5.2;
          const sw = Math.sin(n.phase) * 0.46;
          limbs.legL.rotation.x = sw; limbs.legR.rotation.x = -sw;
          limbs.armL.rotation.x = -sw * 0.65; limbs.armR.rotation.x = sw * 0.65;
        } else {
          limbs.legL.rotation.x = 0; limbs.legR.rotation.x = 0;
          limbs.armL.rotation.x = Math.sin(performance.now() * 0.002 + n.homeX) * 0.12;
          limbs.armR.rotation.x = -Math.sin(performance.now() * 0.002 + n.homeX) * 0.12;
        }
      }

      n.gy = this.world.getTerrainInfo(n.gx, n.gz, false).height;
      this.world.toLocal(n.gx, n.gy, n.gz, n.mesh.position);
      n.mesh.rotation.set(0, n.yaw, 0);
      n.mesh.visible = dP < 310;
    }
  }
};
