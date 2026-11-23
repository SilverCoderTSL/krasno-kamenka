// ============================================================================
// js/james_may_bar.js (v13.5) — James May's Pub ("The Slow & Steady Arms")
// Deliver Beer Kegs to James May & Steal His Beloved Dacia Sandero!
// ============================================================================
window.KK = window.KK || {};

KK.JamesMayBar = class JamesMayBar {
  constructor(scene, world) {
    this.scene = scene; this.world = world; this.cfg = KK.JAMES_MAY_BAR;
    this.sanderoStolen = false;
    this.jamesAngryTimer = 0;
    this.molotovCd = 0;
    this.molotovs = [];
    this.firePools = [];
    this.fuelFireFuse = 0;
    this.james = { gx: this.cfg.pubX + 2.5, gy: 10, gz: this.cfg.pubZ + 9.2, yaw: 0.2, mesh: null };
    this.beerQuips = [
      "Oh, splendid! Proper ale at last. Have a drink — well, actually, you're driving, so take the cash instead.",
      "Good news! The beer delivery has arrived! Wait... did you see my Dacia Sandero outside?",
      "Marvellous logistics, comrade. Smooth, methodical, and at a sensible speed. Here's your pub tab payout!",
      "Hello. Thank you for the kegs. Clarkson tried to bring me cider in his Lamborghini and flattened my hedge."
    ];
    this._buildPubStructures();
    this._buildJamesMesh();
    this._buildParkedSandero();
  }

  _createPubSignTexture() {
    const cv = document.createElement("canvas"); cv.width = 512; cv.height = 140;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#1c2b22"; ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#d4a838"; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 500, 128);
    ctx.fillStyle = "#ffd166"; ctx.font = "bold 34px serif"; ctx.textAlign = "center";
    ctx.fillText("THE SLOW & STEADY ARMS", 256, 50);
    ctx.fillStyle = "#e8f0f5"; ctx.font = "bold 20px monospace";
    ctx.fillText("JAMES MAY'S PUB • BEER DELIVERIES", 256, 90);
    ctx.fillStyle = "#8ecae6"; ctx.font = "bold 17px monospace";
    ctx.fillText("PARKING RESERVED FOR DACIA SANDERO", 256, 120);
    return new THREE.CanvasTexture(cv);
  }

  _buildPubStructures() {
    const baseH = this.cfg._baseH !== undefined ? this.cfg._baseH : this.world.getBaseHeight(this.cfg.x, this.cfg.z);
    this.cfg._baseH = baseH;
    const grp = new THREE.Group(); grp.position.set(this.cfg.x, baseH, this.cfg.z);
    const matBrick = new THREE.MeshStandardMaterial({ color: 0x7a3d2e, roughness: 0.90 });
    const matTimber = new THREE.MeshStandardMaterial({ color: 0x3b2618, roughness: 0.94 });
    const matPlaster = new THREE.MeshStandardMaterial({ color: 0xe6dec8, roughness: 0.92 });
    const matRoof = new THREE.MeshStandardMaterial({ color: 0x2e353b, roughness: 0.82 });
    const matWin = new THREE.MeshStandardMaterial({ color: 0xffd27d, emissive: 0xffa62b, emissiveIntensity: 0.95 });
    const matKeg = new THREE.MeshStandardMaterial({ color: 0xc28a2e, roughness: 0.65, metalness: 0.35 });
    const matPad = new THREE.MeshStandardMaterial({ color: 0xd49b24, emissive: 0x4a3406, roughness: 0.65 });

    const px = this.cfg.pubX - this.cfg.x, pz = this.cfg.pubZ - this.cfg.z;
    const lower = new THREE.Mesh(new THREE.BoxGeometry(18, 4.2, 12), matBrick);
    lower.position.set(px, 2.1, pz); lower.castShadow = true; lower.receiveShadow = true; grp.add(lower);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(18.6, 3.6, 12.6), matPlaster);
    upper.position.set(px, 6.0, pz); upper.castShadow = true; grp.add(upper);
    for (let bx = -8; bx <= 8; bx += 4) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.25), matTimber);
      bm.position.set(px + bx, 6.0, pz + 6.32); grp.add(bm);
    }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(14.0, 4.5, 4), matRoof);
    roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.78); roof.position.set(px, 10.0, pz); grp.add(roof);
    for (const wx of [-5.5, 5.5]) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 0.16), matWin); w1.position.set(px + wx, 2.3, pz + 6.04); grp.add(w1);
      const w2 = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.6, 0.16), matWin); w2.position.set(px + wx, 6.0, pz + 6.32); grp.add(w2);
    }
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.18), matTimber);
    door.position.set(px, 1.6, pz + 6.04); grp.add(door);

    const signMat = new THREE.MeshBasicMaterial({ map: this._createPubSignTexture() });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.5, 0.24), [matTimber, matTimber, matTimber, matTimber, signMat, signMat]);
    sign.position.set(px, 4.6, pz + 6.45); grp.add(sign);

    const porchLight = new THREE.PointLight(0xffb84d, 2.2, 28, 1.5);
    porchLight.position.set(px, 4.2, pz + 8.5); grp.add(porchLight);

    for (const tx of [-12, 12]) {
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.6), matTimber);
      tbl.position.set(px + tx, 0.45, pz + 11.0); grp.add(tbl);
    }
    const dx = this.cfg.dockX - this.cfg.x, dz = this.cfg.dockZ - this.cfg.z;
    for (let k = 0; k < 4; k++) {
      const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.92, 10), matKeg);
      keg.position.set(dx + 5.8, 0.46, dz - 2.5 + k * 1.4); grp.add(keg);
    }
    const dockPad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.16, 10), matPad);
    dockPad.position.set(dx, 0.08, dz); grp.add(dockPad);
    const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 26, 8), new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.36 }));
    bcn.position.set(dx, 13, dz); grp.add(bcn);

    this.world.rootGroup.add(grp); this.pubGroup = grp;
  }

  _buildJamesMesh() {
    const root = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xe6bc9a, roughness: 0.78 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0xc8ccd1, roughness: 0.92 });
    const matStripeA = new THREE.MeshStandardMaterial({ color: 0x6b2c6b, roughness: 0.88 });
    const matStripeB = new THREE.MeshStandardMaterial({ color: 0xd98aa0, roughness: 0.88 });
    const matJeans = new THREE.MeshStandardMaterial({ color: 0x2c4260, roughness: 0.92 });
    const matPint = new THREE.MeshStandardMaterial({ color: 0xe6a817, transparent: true, opacity: 0.85 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.30), matStripeA);
    torso.position.y = 1.12; torso.castShadow = true; root.add(torso);
    for (const sy of [0.95, 1.12, 1.29]) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.07, 0.32), matStripeB); band.position.y = sy; root.add(band);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), matSkin); head.position.y = 1.66; root.add(head);
    const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.38), matHair); hairTop.position.set(0, 1.84, -0.02); root.add(hairTop);
    const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.38, 0.16), matHair); hairBack.position.set(0, 1.62, -0.14); root.add(hairBack);

    const makeLimb = (w, h, d, mat, px, py) => {
      const piv = new THREE.Group(); piv.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.y = -h * 0.5; m.castShadow = true; piv.add(m); root.add(piv); return piv;
    };
    makeLimb(0.15, 0.58, 0.15, matStripeA, -0.35, 1.38);
    const armR = makeLimb(0.15, 0.58, 0.15, matStripeA, 0.35, 1.38);
    makeLimb(0.18, 0.76, 0.18, matJeans, -0.14, 0.78);
    makeLimb(0.18, 0.76, 0.18, matJeans,  0.14, 0.78);

    const pint = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.18, 8), matPint);
    pint.position.set(0, -0.56, 0.16); armR.add(pint);

    const tag = KK.VehicleBuilder.createNameSprite("JAMES MAY (PUB)", "#ffd166");
    tag.position.set(0, 2.42, 0); root.add(tag);
    this.scene.add(root); this.james.mesh = root; this.james.armR = armR;
  }

  _buildParkedSandero() {
    if (!KK.VehicleBuilder) return;
    const st = KK.createDefaultVehicleState("dacia_sandero");
    const rig = KK.VehicleBuilder.buildVehicle("dacia_sandero", st, false);
    const sy = this.world.getTerrainInfo(this.cfg.sanderoX, this.cfg.sanderoZ, false).height + 0.52;
    rig.root.position.set(this.cfg.sanderoX, sy, this.cfg.sanderoZ); rig.root.rotation.y = 0.55;
    const tag = KK.VehicleBuilder.createNameSprite("JAMES'S DACIA SANDERO", "#8ecae6");
    tag.position.set(0, 2.45, 0); rig.root.add(tag);
    this.world.rootGroup.add(rig.root); this.parkedSanderoRig = rig;
  }

  isNearPubDock(gx, gz) {
    return Math.hypot(gx - this.cfg.dockX, gz - this.cfg.dockZ) < 13.5 || Math.hypot(gx - this.james.gx, gz - this.james.gz) < 11.5;
  }
  isNearParkedSandero(gx, gz) {
    if (this.sanderoStolen) return false;
    return Math.hypot(gx - this.cfg.sanderoX, gz - this.cfg.sanderoZ) < 7.5;
  }

  stealDaciaSandero(game) {
    if (this.sanderoStolen) return;
    this.sanderoStolen = true;
    if (this.parkedSanderoRig) this.parkedSanderoRig.root.visible = false;
    if (!game.ownedVehicles.dacia_sandero) game.ownedVehicles.dacia_sandero = KK.createDefaultVehicleState("dacia_sandero");
    game.switchVehicle("dacia_sandero", false);
    const sy = this.world.getTerrainInfo(this.cfg.sanderoX, this.cfg.sanderoZ, true).height;
    game.vehicle.pos.set(this.cfg.sanderoX, sy + 1.1, this.cfg.sanderoZ); game.vehicle.vel.set(0, 0, 0);
    game.onFoot = false; game.localAvatar.visible = false; game._saveProgress(true);
    this.jamesAngryTimer = 42.0;
    this.molotovCd = 1.1; // Gives you ~1s before the first burning bottle flies!
    game.ui.toast('JAMES MAY: "OI!! THAT\'S MY DACIA SANDERO! YOU PILLOCK — EAT THIS MOLOTOV!!"', true);
  }

  interactWithJames(game) {
    const totalCargo = game.vehicle.cargoCount + (game.trailer && game.trailer.hitched ? game.trailer.cargoCount : 0);
    if (game.activeContract && game.activeContract.toBar === true && totalCargo > 0) {
      game.completeDelivery();
      const q = this.beerQuips[Math.floor(Math.random() * this.beerQuips.length)];
      setTimeout(() => game.ui.toast(`JAMES MAY: "${q}"`), 450);
      return;
    }
    if (game.vehicle.cargoType === "beer" && totalCargo > 0) {
      const pay = totalCargo * 2400; game.money += pay; game.vehicle.cargoCount = 0;
      game.vehicleRig.setCargoVisual(0, "standard", true);
      if (game.trailer && game.trailerRig) { game.trailer.cargoCount = 0; game.trailerRig.setCargoVisual(0, "logs", true); }
      game.audio.playCash(); game._saveProgress(true);
      const q = this.beerQuips[Math.floor(Math.random() * this.beerQuips.length)];
      game.ui.toast(`Delivered ${totalCargo} Beer Kegs to James May (+$${pay.toLocaleString()})! "${q}"`);
      return;
    }
    game.ui.toast('JAMES MAY: "Hello. I\'m out of ale! Grab a Beer Delivery contract [J] from Kamenka HQ and bring me some kegs!"');
  }

  _throwMolotovAt(vehicle, audio) {
    const grp = new THREE.Group();
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: 0x3b6e30, roughness: 0.25, transparent: true, opacity: 0.85 })
    );
    grp.add(bottle);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.38, 7),
      new THREE.MeshBasicMaterial({ color: 0xff6b1a, transparent: true, opacity: 0.95 })
    );
    flame.position.y = 0.26;
    grp.add(flame);
    this.scene.add(grp);

    const sx = this.james.gx, sy = this.james.gy + 1.9, sz = this.james.gz;
    // Lead the target slightly so driving away takes skill!
    const flightT = Math.max(0.65, Math.min(1.65, Math.hypot(vehicle.pos.x - sx, vehicle.pos.z - sz) / 28.0));
    const tx = vehicle.pos.x + vehicle.vel.x * flightT * 0.55;
    const tz = vehicle.pos.z + vehicle.vel.z * flightT * 0.55;
    const ty = vehicle.pos.y + 0.9;
    const g = 18.5;
    const vx = (tx - sx) / flightT;
    const vz = (tz - sz) / flightT;
    const vy = (ty - sy + 0.5 * g * flightT * flightT) / flightT;

    this.molotovs.push({ gx: sx, gy: sy, gz: sz, vx, vy, vz, life: 4.5, mesh: grp, flame });
    if (audio && audio.playWrench) audio.playWrench();
  }

  _spawnFirePool(gx, gy, gz) {
    const grp = new THREE.Group();
    const matF1 = new THREE.MeshBasicMaterial({ color: 0xff4d00, transparent: true, opacity: 0.86, blending: THREE.AdditiveBlending, depthWrite: false });
    const matF2 = new THREE.MeshBasicMaterial({ color: 0xffbe0b, transparent: true, opacity: 0.70, blending: THREE.AdditiveBlending, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 14), new THREE.MeshBasicMaterial({ color: 0x161210, transparent: true, opacity: 0.72 }));
    disc.rotation.x = -Math.PI / 2; disc.position.y = 0.08; grp.add(disc);
    const flames = [];
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      const r = k === 0 ? 0 : 1.3;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.3 + (k % 2) * 0.6, 7), k % 2 === 0 ? matF1 : matF2);
      f.position.set(Math.cos(ang) * r, 1.15, Math.sin(ang) * r);
      grp.add(f); flames.push(f);
    }
    this.scene.add(grp);
    this.firePools.push({ gx, gy, gz, life: 12.0, mesh: grp, flames });
  }

  _detonateFuelExplosion(vehicle, game) {
    const vs = vehicle.vState;
    vs.burnedOut = true;
    vs.fuel = 0;
    vs.health.body = 4;
    if (vs.parts) {
      for (const id of ["pistons", "crankshaft", "headGasket", "fuelInjectors", "fuelRails", "radiator", "intercooler", "sparkPlugs"]) {
        if (vs.parts[id]) vs.parts[id].hp = 0;
      }
    }
    vehicle.engineRunning = false;
    vehicle.ignitionOn = false;
    // Violent ragdoll flip & launch!
    const ang = Math.random() * Math.PI * 2;
    vehicle.applyExternalImpulse(Math.sin(ang) * 24, 21.5, Math.cos(ang) * 24, (Math.random() > 0.5 ? 1 : -1) * 9.5);
    if (game) {
      if (game.audio && game.audio.playGasStationExplosion) game.audio.playGasStationExplosion();
      if (game.particles) {
        game.particles.emitCrashBurst(vehicle.pos.x, vehicle.pos.y + 1.2, vehicle.pos.z, 3.4, "rock", game.weather.weather);
        game.particles.emitCrashBurst(vehicle.pos.x, vehicle.pos.y + 2.8, vehicle.pos.z, 2.6, "sand", game.weather.weather);
      }
      game.cameraShake = Math.max(game.cameraShake, 1.25);
      game.ui.toast('BOOM!! FUEL TANK IGNITED & EXPLODED!! Car burned out — tow to a Garage [O]!', true);
      game._saveProgress(true);
    }
  }

  update(dt, vehicle, game = null) {
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const d = Math.hypot(this.james.gx - px, this.james.gz - pz);
    this.james.gy = this.world.getTerrainInfo(this.james.gx, this.james.gz, false).height;
    this.world.toLocal(this.james.gx, this.james.gy, this.james.gz, this.james.mesh.position);
    this.james.mesh.visible = d < 380;

    if (this.james.mesh.visible) {
      this.james.mesh.rotation.y = Math.atan2(px - this.james.gx, pz - this.james.gz);
      if (this.jamesAngryTimer > 0) {
        this.james.armR.rotation.x = -2.2 + Math.sin(performance.now() * 0.018) * 0.85;
      } else {
        this.james.armR.rotation.x = -0.95 + Math.sin(performance.now() * 0.0025) * 0.22;
      }
    }

    // Angry James May hurling Molotov cocktails while you're within 68m!
    if (this.jamesAngryTimer > 0) {
      this.jamesAngryTimer = Math.max(0, this.jamesAngryTimer - dt);
      if (this.molotovCd > 0) this.molotovCd -= dt;
      if (this.molotovCd <= 0 && d < 68 && !vehicle.vState.burnedOut) {
        this.molotovCd = 3.6;
        this._throwMolotovAt(vehicle, game ? game.audio : null);
      }
    }

    // Step flying Molotov cocktails
    for (let i = this.molotovs.length - 1; i >= 0; i--) {
      const m = this.molotovs[i];
      m.life -= dt;
      m.vy -= 18.5 * dt;
      m.gx += m.vx * dt; m.gy += m.vy * dt; m.gz += m.vz * dt;
      this.world.toLocal(m.gx, m.gy, m.gz, m.mesh.position);
      m.mesh.rotation.x += dt * 11; m.mesh.rotation.z += dt * 7;
      if (game && game.particles && Math.random() < 0.85) {
        game.particles.emitBarrelSmoke(m.gx, m.gy, m.gz, 0, 1.8, 0, 0.7);
      }

      const gh = this.world.getTerrainInfo(m.gx, m.gz, false).height;
      const dCar = Math.hypot(m.gx - px, m.gz - pz);
      const directHit = (dCar < 3.6 && Math.abs(m.gy - (py + 0.9)) < 2.6);

      if (directHit || m.gy <= gh + 0.2 || m.life <= 0) {
        const hitY = Math.max(gh, m.gy);
        this._spawnFirePool(m.gx, gh, m.gz);
        if (game && game.audio && game.audio.playMolotovIgnite) game.audio.playMolotovIgnite();
        if (game && game.particles) game.particles.emitCrashBurst(m.gx, hitY + 0.6, m.gz, 1.5, "sand", game.weather.weather);

        // Hit vehicle -> scorching heat + chance to ignite fuel & EXPLODE!
        if (dCar < 5.2 && !vehicle.vState.burnedOut) {
          vehicle.coolantTemp = Math.min(130, vehicle.coolantTemp + 24);
          vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 18);
          const fuelFrac = vehicle.vState.fuel / Math.max(1, vehicle.spec.fuelCapacity);
          const igniteChance = vehicle.spec.isTracked ? 0.12 : (directHit ? (0.48 + fuelFrac * 0.34) : 0.32);
          if (this.fuelFireFuse <= 0 && Math.random() < igniteChance) {
            this.fuelFireFuse = 1.65; // 1.65s burning petrol fuse -> BOOM!
            if (game && game.ui) game.ui.toast('MOLOTOV DIRECT HIT!! PETROL CAUGHT FIRE — BAIL OUT [F]!!', true);
          }
        }
        this.scene.remove(m.mesh);
        this.molotovs.splice(i, 1);
      }
    }

    // Active Fuel Fire Fuse countdown -> Catastrophic Fuel Explosion!
    if (this.fuelFireFuse > 0) {
      this.fuelFireFuse -= dt;
      if (game && game.particles) {
        game.particles.emitBarrelSmoke(px, py + 1.2, pz, 0, 2.6, 0, 1.4);
      }
      if (this.fuelFireFuse <= 0) {
        this._detonateFuelExplosion(vehicle, game);
      }
    }

    // Step lingering burning Molotov fire pools on ground
    for (let i = this.firePools.length - 1; i >= 0; i--) {
      const fp = this.firePools[i];
      fp.life -= dt;
      this.world.toLocal(fp.gx, fp.gy, fp.gz, fp.mesh.position);
      const fl = 0.78 + Math.sin(performance.now() * 0.028 + i) * 0.25;
      for (const f of fp.flames) f.scale.set(fl, fl * (0.85 + Math.min(1, fp.life / 3) * 0.35), fl);
      if (fp.life <= 0) {
        this.scene.remove(fp.mesh);
        this.firePools.splice(i, 1);
      }
    }
  }
};
