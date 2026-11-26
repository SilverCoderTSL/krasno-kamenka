// ============================================================================
// js/trailer.js (v8) — Articulated 3D Log & Flatbed Trailers + LAN Sync
// ============================================================================
window.KK = window.KK || {};

KK.TrailerBuilder = {
  buildTrailer(trailerId) {
    const spec = KK.TRAILERS[trailerId] || KK.TRAILERS.log_trailer;
    const root = new THREE.Group();

    const matFrame = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.55, metalness: 0.35 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.85, metalness: 0.25 });
    const matDeck = new THREE.MeshStandardMaterial({ color: 0x5c422a, roughness: 0.92 });
    const matStanchion = new THREE.MeshStandardMaterial({ color: 0xcc2929, roughness: 0.48, metalness: 0.3 });
    const matTire = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.94 });
    const matRim = new THREE.MeshStandardMaterial({ color: 0x9aa4ae, roughness: 0.35, metalness: 0.7 });
    const matTail = new THREE.MeshBasicMaterial({ color: 0xaa1515 });
    const matAmber = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const len = spec.length;
    const w = spec.width;

    // Main twin steel chassis beams (axle center at z = 0, hitch tongue extends to +hitchDist)
    for (const sx of [-w * 0.34, w * 0.34]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, len * 0.88), matFrame);
      beam.position.set(sx, 0.52, -0.15);
      beam.castShadow = true;
      root.add(beam);
    }

    // A-frame drawbar tongue extending forward to the hitch ball at z = +spec.hitchDist!
    const tongueLen = spec.hitchDist - len * 0.35 + 0.5;
    for (const sx of [-1, 1]) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, tongueLen + 0.8), matDark);
      bar.position.set(sx * 0.32, 0.52, spec.hitchDist - (tongueLen + 0.6) * 0.5);
      bar.rotation.y = -sx * 0.22;
      root.add(bar);
    }
    const coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.16, 8), matDark);
    coupler.position.set(0, 0.52, spec.hitchDist);
    root.add(coupler);

    if (trailerId === "log_trailer") {
      // Heavy steel log bolsters + 4 pairs of tall red log bunk stanchions!
      for (const bz of [-1.75, -0.55, 0.65, 1.65]) {
        const cross = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, 0.20), matFrame);
        cross.position.set(0, 0.68, bz);
        root.add(cross);
        for (const sx of [-w * 0.47, w * 0.47]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.38, 0.11), matStanchion);
          post.position.set(sx, 1.38, bz);
          post.castShadow = true;
          root.add(post);
        }
      }
      // Front protective steel headboard mesh
      const hb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 1.45, 0.12), matDark);
      hb.position.set(0, 1.38, 1.85);
      root.add(hb);
    } else if (trailerId === "support_trailer") {
      // BOREAL DAKAR FUEL & REPAIR SUPPORT TRAILER (2,000L Diesel Cistern + Mechanic Workshop + Spares!)
      const matTankRed = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.38, metalness: 0.28 });
      const matTankWht = new THREE.MeshStandardMaterial({ color: 0xeaf0f5, roughness: 0.42, metalness: 0.18 });
      const matCabinet = new THREE.MeshStandardMaterial({ color: 0x2b3642, roughness: 0.55, metalness: 0.48 });
      const matBeacon  = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, len * 0.86), matDark);
      deck.position.set(0, 0.66, -0.15); deck.castShadow = true; root.add(deck);

      const cistern = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.76, 2.75, 16), matTankRed);
      cistern.rotation.x = Math.PI / 2; cistern.position.set(0, 1.54, 0.42); cistern.castShadow = true; root.add(cistern);

      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.775, 0.775, 0.72, 16), matTankWht);
      band.rotation.x = Math.PI / 2; band.position.set(0, 1.54, 0.42); root.add(band);
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.26, 10), matDark);
      hatch.position.set(0, 2.36, 0.42); root.add(hatch);

      const cabBox = new THREE.Mesh(new THREE.BoxGeometry(w * 0.90, 1.18, 1.45), matCabinet);
      cabBox.position.set(0, 1.32, -1.68); cabBox.castShadow = true; root.add(cabBox);
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 10), matAmber);
      reel.rotation.z = Math.PI / 2; reel.position.set(w * 0.42, 1.35, -1.68); root.add(reel);

      for (const sx of [-0.46, 0.46]) {
        const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.28, 14), matTire);
        sp.rotation.x = Math.PI / 2; sp.position.set(sx, 1.32, -2.54); sp.castShadow = true; root.add(sp);
        const sr = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.30, 8), matRim);
        sr.rotation.x = Math.PI / 2; sr.position.set(sx, 1.32, -2.54); root.add(sr);
      }

      const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.65, 6), matDark);
      bPost.position.set(0, 2.22, -1.68); root.add(bPost);
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.24, 8), matBeacon);
      beacon.position.set(0, 2.58, -1.68); root.add(beacon);
    } else if (trailerId === "car_carrier") {
      // BOREAL HYDRAULIC CAR-CARRIER RECOVERY TRAILER (Steel Deck, Twin Ramps, Wheel Chocks & Winch!)
      const matDeckSteel = new THREE.MeshStandardMaterial({ color: 0x2c333b, roughness: 0.78, metalness: 0.45 });
      const matWarnYel   = new THREE.MeshStandardMaterial({ color: 0xe6a800, roughness: 0.50 });
      const matBeacon    = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, len * 0.88), matDeckSteel);
      deck.position.set(0, 0.68, -0.15); deck.castShadow = true; deck.receiveShadow = true; root.add(deck);
      // Yellow side safety rub-rails & wheel guide tracks
      for (const sx of [-w * 0.48, w * 0.48]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, len * 0.88), matWarnYel);
        rail.position.set(sx, 0.82, -0.15); root.add(rail);
      }
      // Front headache winch rack + flashing amber beacons
      const frontRack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.95, 0.14), matWarnYel);
      frontRack.position.set(0, 1.18, len * 0.44 - 0.15); root.add(frontRack);
      for (const sx of [-0.82, 0.82]) {
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.20, 8), matBeacon);
        bcn.position.set(sx, 1.74, len * 0.44 - 0.15); root.add(bcn);
      }
      // Twin angled steel loading ramps at rear!
      for (const sx of [-0.66, 0.66]) {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.10, 1.55), matWarnYel);
        ramp.position.set(sx, 0.96, -len * 0.48 - 0.15);
        ramp.rotation.x = 0.85;
        root.add(ramp);
      }
    } else {
      // Flatbed plank deck + low steel side rails + rear ramps
      const deck = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, len * 0.86), matDeck);
      deck.position.set(0, 0.68, -0.15);
      deck.castShadow = true; deck.receiveShadow = true;
      root.add(deck);
      for (const sx of [-w * 0.48, w * 0.48]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, len * 0.86), matFrame);
        rail.position.set(sx, 0.88, -0.15);
        root.add(rail);
      }
      const hb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.72, 0.10), matFrame);
      hb.position.set(0, 1.06, len * 0.43 - 0.15);
      root.add(hb);
    }

    // Rear bumper + taillights + amber side markers
    const rBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, 0.16), matDark);
    rBump.position.set(0, 0.50, -len * 0.46 - 0.15);
    root.add(rBump);
    for (const sx of [-w * 0.38, w * 0.38]) {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.08), matTail);
      tl.position.set(sx, 0.52, -len * 0.46 - 0.24);
      root.add(tl);
    }
    for (const sx of [-w * 0.50, w * 0.50]) {
      const am = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.10, 0.18), matAmber);
      am.position.set(sx, 0.56, 0.4);
      root.add(am);
    }

    // Tandem dual axles (4 rotating wheels!)
    const wheels = [];
    const r = spec.wheelRadius;
    for (const wz of [-0.62, 0.48]) {
      const axleBar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, w * 0.92, 8), matDark);
      axleBar.rotation.z = Math.PI / 2;
      axleBar.position.set(0, r, wz);
      root.add(axleBar);
      for (const sx of [-w * 0.46, w * 0.46]) {
        const wGrp = new THREE.Group();
        wGrp.position.set(sx, r, wz);
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.28, 14), matTire);
        tire.rotation.z = Math.PI / 2; tire.castShadow = true; wGrp.add(tire);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.30, 8), matRim);
        rim.rotation.z = Math.PI / 2; wGrp.add(rim);
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.32, r * 0.85, 0.08), matDark);
        wGrp.add(spoke);
        root.add(wGrp);
        wheels.push(wGrp);
      }
    }

    // Cargo group on trailer deck
    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(0, 0.78, -0.15);
    root.add(cargoGroup);

    const matBark = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.95 });
    const matLogEnd = new THREE.MeshStandardMaterial({ color: 0xc9a36b, roughness: 0.88 });
    const matStrap = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

    const rig = {
      root, wheels, cargoGroup, spec, matTail,
      setCargoVisual(count, cargoType, strapped = true) {
        while (cargoGroup.children.length > 0) cargoGroup.remove(cargoGroup.children[0]);
        if (count <= 0) return;

        if (cargoType === "logs") {
          // Stack big realistic pine logs cleanly inside the bunks!
          const logLen = spec.length * 0.84;
          const totalLogs = Math.min(10, count * 2 + 1);
          const logGeo = new THREE.CylinderGeometry(0.24, 0.26, logLen, 8);
          logGeo.rotateX(Math.PI / 2);
          const endGeo = new THREE.CylinderGeometry(0.22, 0.22, logLen + 0.03, 8);
          endGeo.rotateX(Math.PI / 2);

          for (let i = 0; i < totalLogs; i++) {
            const row = Math.floor(i / 3);
            const col = i % 3;
            const lx = (col - 1) * 0.52 + (row % 2 === 1 ? 0.14 : 0);
            const ly = 0.26 + row * 0.44;
            const logM = new THREE.Mesh(logGeo, matBark);
            logM.position.set(lx, ly, 0);
            logM.castShadow = true;
            cargoGroup.add(logM);
            const endM = new THREE.Mesh(endGeo, matLogEnd);
            endM.position.set(lx, ly, 0);
            cargoGroup.add(endM);
          }
          if (strapped) {
            for (const sz of [-1.2, 0.0, 1.2]) {
              const st = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.06, 0.08), matStrap);
              st.position.set(0, 0.95, sz);
              cargoGroup.add(st);
            }
          }
        } else {
          const cDef = KK.CARGO_TYPES[cargoType] || KK.CARGO_TYPES.standard;
          const cMat = new THREE.MeshStandardMaterial({ color: cDef.color, roughness: 0.8 });
          for (let i = 0; i < count; i++) {
            const row = Math.floor(i / 2), col = i % 2;
            const mesh = (cargoType === "fuel_drums")
              ? new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.78, 10), cMat)
              : new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.76), cMat);
            mesh.position.set((col - 0.5) * 0.92, 0.36, 1.35 - row * 0.95);
            mesh.castShadow = true;
            cargoGroup.add(mesh);
          }
        }
      },
      carriedCarGroup: null,
      setCarriedCarVisual(carInfo) {
        if (this.carriedCarGroup) { root.remove(this.carriedCarGroup); this.carriedCarGroup = null; }
        if (!carInfo || !carInfo.vid || !KK.VehicleBuilder) return;
        if (carInfo.isBm21Relic || carInfo.isShilkaRelic) {
          const g = new THREE.Group();
          const matRust  = new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.94, metalness: 0.35 });
          const matOlive = new THREE.MeshStandardMaterial({ color: 0x3b4832, roughness: 0.92 });
          const matDark  = new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.94 });
          const matChain = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45, metalness: 0.75 });
          if (carInfo.isBm21Relic) {
            const cab = new THREE.Mesh(new THREE.BoxGeometry(1.72, 1.15, 1.85), matOlive);
            cab.position.set(0, 0.95, 1.45); g.add(cab);
            const pod = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.72, 2.35), matRust);
            pod.position.set(0, 1.25, -1.05); pod.rotation.x = -0.22; g.add(pod);
          } else {
            const hull = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.76, 4.45), matOlive);
            hull.position.y = 0.56; g.add(hull);
            const tur = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.54, 1.68), matRust);
            tur.position.set(0, 1.15, 0); g.add(tur);
            for (const bx of [-0.25, 0.25]) {
              const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.8, 6), matDark);
              bar.rotation.x = Math.PI / 2; bar.position.set(bx, 1.18, 1.45); g.add(bar);
            }
          }
          for (const sz of [-1.8, 1.8]) {
            const ch = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.09, 0.11), matChain);
            ch.position.set(0, 0.92, sz); g.add(ch);
          }
          g.position.set(0, 0.74, -0.15);
          root.add(g);
          this.carriedCarGroup = g;
          return;
        }
        if (carInfo.isT72Relic) {
          // Broken-Down Rusted T-72 Relic Hull strapped onto trailer with heavy steel chains!
          const g = new THREE.Group();
          const matRust  = new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.94, metalness: 0.35 });
          const matOlive = new THREE.MeshStandardMaterial({ color: 0x3b4832, roughness: 0.92 });
          const matDark  = new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.94 });
          const matChain = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.45, metalness: 0.75 });
          const hull = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.85, 4.85), matOlive);
          hull.position.y = 0.62; hull.castShadow = true; g.add(hull);
          for (const sx of [-1.18, 1.18]) {
            const trk = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 4.75), matDark);
            trk.position.set(sx, 0.35, 0); g.add(trk);
          }
          const tur = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.12, 0.56, 12), matRust);
          tur.position.set(0, 1.26, 0.25); g.add(tur);
          const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 3.85, 8), matRust);
          bar.rotation.x = Math.PI / 2; bar.position.set(0, 1.30, -1.85); g.add(bar);
          for (const sz of [-1.8, 1.8]) {
            const ch = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.09, 0.11), matChain);
            ch.position.set(0, 0.98, sz); g.add(ch);
          }
          g.position.set(0, 0.76, -0.15);
          root.add(g);
          this.carriedCarGroup = g;
          return;
        }
        const fakeSt = KK.createDefaultVehicleState(carInfo.vid);
        fakeSt.paintColor = carInfo.col || fakeSt.paintColor;
        const carRig = KK.VehicleBuilder.buildVehicle(carInfo.vid, fakeSt, false);
        const s = (carInfo.vid === "kamaz" || carInfo.vid === "btr80" || carInfo.vid === "maz537" || carInfo.vid === "t72" || carInfo.vid === "bm21" || carInfo.vid === "shilka") ? 0.68 : 0.94;
        carRig.root.scale.set(s, s, s);
        carRig.root.position.set(0, 1.12, -0.15);
        root.add(carRig.root);
        this.carriedCarGroup = carRig.root;
      },
      updateVisuals(spinAngle, braking) {
        for (const wGrp of wheels) wGrp.rotation.x = spinAngle;
        matTail.color.setHex(braking ? 0xff1e1e : 0x7a1212);
      }
    };
    return rig;
  }
};

KK.TrailerPhysics = class TrailerPhysics {
  constructor(trailerId, startX, startY, startZ, startYaw = 0) {
    this.trailerId = trailerId;
    this.spec = KK.TRAILERS[trailerId] || KK.TRAILERS.log_trailer;
    this.pos = new THREE.Vector3(startX, startY, startZ);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.yaw = startYaw;
    this.pitch = 0;
    this.roll = 0;
    this.spinAngle = 0;
    this.hitched = true;
    this.cargoCount = 0;
    this.cargoType = "logs";
    this.carriedCar = null; // { vid, col, peerId, label }
  }

  getTotalMassKg() {
    const cDef = KK.CARGO_TYPES[this.cargoType] || KK.CARGO_TYPES.logs;
    const carMass = this.carriedCar ? (this.carriedCar.isT72Relic ? 12500 : (this.carriedCar.isBm21Relic ? 8800 : (this.carriedCar.isShilkaRelic ? 9800 : (KK.VEHICLES[this.carriedCar.vid] ? KK.VEHICLES[this.carriedCar.vid].massKg : 0)))) : 0;
    return this.spec.emptyMassKg + this.cargoCount * cDef.massPerUnitKg + carMass;
  }

  getRearHitchWorldPos(vehicle) {
    const rearLocal = new THREE.Vector3(0, 0.48, -(vehicle.spec.bodyLen * 0.5 + 0.25));
    return rearLocal.applyQuaternion(vehicle.quat).add(vehicle.pos);
  }

  // v17.0 REVAMPED TRAILER PHYSICS: Velocity-Integrated Articulated Hitch + Lateral Tire Grip & Sway Damping!
  step(dt, vehicle, world) {
    const sdt = Math.min(0.035, Math.max(0.001, dt));
    const prevX = this.pos.x, prevZ = this.pos.z;
    if (this.yawVel === undefined) this.yawVel = 0;

    if (this.hitched && vehicle) {
      const hitchPos = this.getRearHitchWorldPos(vehicle);
      const vehFwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
      const vehYaw = Math.atan2(vehFwd.x, vehFwd.z);

      const curFwdX = Math.sin(this.yaw), curFwdZ = Math.cos(this.yaw);
      const tongueX = this.pos.x + curFwdX * this.spec.hitchDist;
      const tongueZ = this.pos.z + curFwdZ * this.spec.hitchDist;

      const errX = hitchPos.x - tongueX;
      const errZ = hitchPos.z - tongueZ;
      this.vel.x += errX * 42.0 * sdt;
      this.vel.z += errZ * 42.0 * sdt;

      const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
      const vFwd = this.vel.x * curFwdX + this.vel.z * curFwdZ;
      const vLat = this.vel.x * rightX + this.vel.z * rightZ;
      const newVLat = vLat * Math.exp(-9.5 * sdt);
      this.vel.x = curFwdX * vFwd + rightX * newVLat;
      this.vel.z = curFwdZ * vFwd + rightZ * newVLat;

      this.pos.x += this.vel.x * sdt;
      this.pos.z += this.vel.z * sdt;

      const dx = hitchPos.x - this.pos.x;
      const dz = hitchPos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.05) {
        let desiredYaw = Math.atan2(dx, dz);
        let rel = desiredYaw - vehYaw;
        while (rel > Math.PI) rel -= Math.PI * 2;
        while (rel < -Math.PI) rel += Math.PI * 2;
        const maxJack = 1.28;
        if (Math.abs(rel) > maxJack) {
          desiredYaw = vehYaw + Math.sign(rel) * maxJack;
        }
        let yawErr = desiredYaw - this.yaw;
        while (yawErr > Math.PI) yawErr -= Math.PI * 2;
        while (yawErr < -Math.PI) yawErr += Math.PI * 2;
        this.yawVel += yawErr * 28.0 * sdt;
        this.yawVel *= Math.exp(-8.5 * sdt);
        this.yaw += this.yawVel * sdt;

        this.pos.x = hitchPos.x - Math.sin(this.yaw) * this.spec.hitchDist;
        this.pos.z = hitchPos.z - Math.cos(this.yaw) * this.spec.hitchDist;
      }

      const massRatio = this.getTotalMassKg() / Math.max(1200, vehicle.getTotalMassKg());
      const dragFactor = Math.max(0.93, 1.0 - massRatio * 0.14 * sdt);
      vehicle.vel.x *= dragFactor;
      vehicle.vel.z *= dragFactor;

      const tCheck = world.getTerrainInfo(this.pos.x, this.pos.z, true, this.pos.y + 1.0);
      if (tCheck.onBridge && tCheck.bridgeHit) {
        const spd = Math.hypot(this.pos.x - prevX, this.pos.z - prevZ) / Math.max(0.005, sdt);
        if (world.stressBridgePlank(tCheck.bridgeHit.bridge.id, tCheck.bridgeHit.plankIdx, this.getTotalMassKg(), spd, sdt)) {
          vehicle.emit("plank_break", {
            bridgeId: tCheck.bridgeHit.bridge.id,
            plankIdx: tCheck.bridgeHit.plankIdx,
            bridgeName: tCheck.bridgeHit.bridge.name
          });
        }
      }
    } else {
      this.vel.multiplyScalar(Math.exp(-3.4 * sdt));
      this.pos.x += this.vel.x * sdt;
      this.pos.z += this.vel.z * sdt;
    }

    const fwdX = Math.sin(this.yaw), fwdZ = Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    const hCenter = world.getTerrainInfo(this.pos.x, this.pos.z, true, this.pos.y + 1.0).height;
    const hFront = world.getTerrainInfo(this.pos.x + fwdX * 1.8, this.pos.z + fwdZ * 1.8, true, this.pos.y + 1.0).height;
    const hBack  = world.getTerrainInfo(this.pos.x - fwdX * 1.8, this.pos.z - fwdZ * 1.8, true, this.pos.y + 1.0).height;
    const hLeft  = world.getTerrainInfo(this.pos.x - rightX * 0.9, this.pos.z - rightZ * 0.9, true, this.pos.y + 1.0).height;
    const hRight = world.getTerrainInfo(this.pos.x + rightX * 0.9, this.pos.z + rightZ * 0.9, true, this.pos.y + 1.0).height;

    const targetY = Math.max(hCenter, (hFront + hBack) * 0.5);
    this.pos.y += (targetY - this.pos.y) * Math.min(1, sdt * 14);
    const targetPitch = -Math.atan2(hFront - hBack, 3.6);
    const targetRoll  = Math.atan2(hLeft - hRight, 1.8);
    this.pitch += (targetPitch - this.pitch) * Math.min(1, sdt * 10);
    this.roll  += (targetRoll - this.roll) * Math.min(1, sdt * 10);

    const moved = (this.pos.x - prevX) * fwdX + (this.pos.z - prevZ) * fwdZ;
    this.spinAngle += moved / this.spec.wheelRadius;
    this.vel.set((this.pos.x - prevX) / Math.max(0.005, sdt), 0, (this.pos.z - prevZ) / Math.max(0.005, sdt));
  }
};
