// ============================================================================
// js/ocean_cryptids.js (v17.6.1 ONLINE) — Foreboding & Threatening Ocean Cryptids!
//   1. Possessed Yamato-Class Battleship (263m × 38.9m): Ghostly dreadnought with
//      sweeping searchlight, swirling dark mist shroud, pulsing portholes, bow wake,
//      eerie tracking 460mm turrets, and devastating 3-salvo retaliation!
//   2. El Gran Maja (34m Megalodon): 4-stage apex predator (Stalking -> Submerging
//      -> Breach/Lunge with glowing eyes & snapping jaws -> Retreating). Patrols
//      Southern & open-ocean straits!
//   3. The Bloop (120m+ Abyssal Kraken): Subsurface bioluminescent omen + bubble
//      ring, rotating Maelstrom Whirlpool pulling vessels inward, and telegraphed
//      42m Tentacle Slams with splash shockwaves & damage!
// ============================================================================
window.KK = window.KK || {};

KK.OceanCryptidManager = class OceanCryptidManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.syncAccum = 0;
    this.shells = [];         // Flying 460mm Yamato broadside shells
    this.spouts = [];         // Towering ocean water spouts
    this.cameraShakeOut = 0;
    this._flirMode = false;

    // Shared Interface Contract (read by main.js, ui.js, weather.js, audio.js)
    this.seaDreadLevel = 0;
    this.activeWarning = null;
    this.oceanPeaceCd = 300.0;
    this.pendingAudioCues = [];

    this.yamato    = this._createYamato();
    this.megalodon = this._createMegalodon();
    this.kraken    = this._createKraken();
  }

  _emitDreadAudio(audio, intensity, kind) {
    const inten = Math.max(0.1, Math.min(1.0, intensity || 0.75));
    this.pendingAudioCues.push({ intensity: inten, kind, time: performance.now() });
    if (this.pendingAudioCues.length > 12) this.pendingAudioCues.shift();
    if (audio && typeof audio.playSeaDreadPulse === "function") {
      audio.playSeaDreadPulse(inten, kind);
    }
  }

  _applyBoatShock(boats, ab, pushX, pushZ, rollKick, pitchKick) {
    if (!ab) return;
    if (boats && typeof boats.applyWaveShock === "function") {
      boats.applyWaveShock(ab, pushX, pushZ, rollKick, pitchKick);
    } else {
      ab.vx += pushX;
      ab.vz += pushZ;
      ab.roll += rollKick;
      ab.pitch += pitchKick;
    }
  }

  _applyHullOrVehicleDamage(vehicle, boats, ab, dmgAmount, pushX, pushY, pushZ, yawKick) {
    if (vehicle && !ab) {
      const armor = vehicle.spec && vehicle.spec.isSchreckensfurst ? 0.20 : (vehicle.spec && vehicle.spec.isTracked ? 0.35 : 1.0);
      if (vehicle.applyExternalImpulse) {
        vehicle.applyExternalImpulse(pushX * armor, pushY * armor, pushZ * armor, yawKick * armor);
      } else {
        vehicle.vel.x += pushX * armor;
        vehicle.vel.y += pushY * armor;
        vehicle.vel.z += pushZ * armor;
      }
      if (vehicle.vState && vehicle.vState.health) {
        vehicle.vState.health.body = Math.max(0, (vehicle.vState.health.body || 100) - dmgAmount * armor);
        if (dmgAmount >= 14 && typeof vehicle.vState.health.engine === "number") {
          vehicle.vState.health.engine = Math.max(5, vehicle.vState.health.engine - dmgAmount * 0.25 * armor);
        }
      }
    } else if (ab && vehicle && boats && boats.getLocalMountedEntry && boats.getLocalMountedEntry(ab)) {
      // Deck shock jolt for vehicle strapped onto boat deck
      if (vehicle.vState && vehicle.vState.health) {
        const deckArmor = vehicle.spec && vehicle.spec.isSchreckensfurst ? 0.12 : 0.35;
        vehicle.vState.health.body = Math.max(0, (vehicle.vState.health.body || 100) - dmgAmount * deckArmor);
      }
    }
  }

  // ==========================================================================
  // HELPER: Check if (gx, gz) is truly open deep ocean far from all islands
  // ==========================================================================
  _isOpenOcean(gx, gz, minMargin = 450) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    // v18.1 Check ACTUAL seabed height beneath (gx, gz) so open-sea channels & the Savanna Mega-Bridge over water always count as open sea!
    if (this.world && this.world.getBaseHeight) {
      const baseH = this.world.getBaseHeight(gx, gz);
      if (baseH >= seaL - 1.2) return false;
      // If a large margin is requested (natural spawns), also sample 4 cardinal points at margin*0.55 to avoid shallow beaches
      if (minMargin >= 280) {
        const probe = Math.min(260, minMargin * 0.55);
        if (this.world.getBaseHeight(gx + probe, gz) >= seaL - 0.8) return false;
        if (this.world.getBaseHeight(gx - probe, gz) >= seaL - 0.8) return false;
        if (this.world.getBaseHeight(gx, gz + probe) >= seaL - 0.8) return false;
        if (this.world.getBaseHeight(gx, gz - probe) >= seaL - 0.8) return false;
      }
      return true;
    }
    if (!KK.ISLANDS) return false;
    for (let i = 0; i < KK.ISLANDS.length; i++) {
      const isl = KK.ISLANDS[i];
      const rx = isl.rx * 1.02 + minMargin * 0.5;
      const rz = isl.rz * 1.02 + minMargin * 0.5;
      const nx = (gx - isl.cx) / rx;
      const nz = (gz - isl.cz) / rz;
      if (nx * nx + nz * nz < 1.0) return false;
    }
    return true;
  }

  _collectSeaPlayers(vehicle, boats, remotePlayersMap) {
    const list = [];
    const ab = boats ? boats.activeBoat : null;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const gx = ab ? ab.gx : vehicle.pos.x;
    const gz = ab ? ab.gz : vehicle.pos.z;
    const gy = ab ? ab.gy : vehicle.pos.y;
    const vx = ab ? ab.vx : vehicle.vel.x;
    const vz = ab ? ab.vz : vehicle.vel.z;
    const spdKmh = ab ? ab.speedKmh : vehicle.speedKmh;
    const inWaterVeh = !ab && ((vehicle.inWaterDepth || 0) > 0.6 || gy < seaL + 2.0);
    list.push({
      isLocal: true, peerId: "__local__",
      x: gx, y: gy, z: gz, vx, vz, speedKmh: spdKmh,
      inBoat: !!ab, inWater: !!ab || inWaterVeh, boat: ab
    });
    if (remotePlayersMap) {
      for (const [pid, rp] of remotePlayersMap.entries()) {
        const rb = rp.boat;
        const rInWater = !!rb || (rp.gy !== undefined && rp.gy < seaL + 2.0);
        list.push({
          isLocal: false, peerId: pid,
          x: rb ? rb.x : rp.gx,
          y: rb ? rb.y : rp.gy,
          z: rb ? rb.z : rp.gz,
          vx: rb ? (rb.vx || 0) : (rp.vx || 0),
          vz: rb ? (rb.vz || 0) : (rp.vz || 0),
          speedKmh: rb ? (rb.spd || 0) : Math.hypot(rp.vx || 0, rp.vz || 0) * 3.6,
          inBoat: !!rb, inWater: rInWater, boat: null
        });
      }
    }
    return list;
  }

  // ==========================================================================
  // 1. MUSEUM-GRADE POSSESSED YAMATO-CLASS BATTLESHIP (263m × 38.9m!)
  // ==========================================================================
  _createYamato() {
    const grp = new THREE.Group();
    const shipRoot = new THREE.Group(); // Tilted with tragic 5.5° port list!
    shipRoot.rotation.z = 0.095;
    grp.add(shipRoot);

    // Battle-scarred rusted IJN Kure naval grey + dark-crimson lower hull + weathered teak deck!
    const matHullGry  = new THREE.MeshStandardMaterial({ color: 0x384047, roughness: 0.84, metalness: 0.44 });
    const matHullDrk  = new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.88, metalness: 0.48 });
    const matRust     = new THREE.MeshStandardMaterial({ color: 0x543426, roughness: 0.94, metalness: 0.30 });
    const matRedHull  = new THREE.MeshStandardMaterial({ color: 0x562020, roughness: 0.86, metalness: 0.25 });
    const matTeak     = new THREE.MeshStandardMaterial({ color: 0x62503b, roughness: 0.92, metalness: 0.08 });
    const matBarrel   = new THREE.MeshStandardMaterial({ color: 0x22282e, roughness: 0.50, metalness: 0.74 });
    const matPortGlow = new THREE.MeshBasicMaterial({ color: 0x62dcff }); // Pulses ghost-cyan -> crimson during retaliation!
    const matMist     = new THREE.MeshBasicMaterial({ color: 0x456070, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
    const matMistDark = new THREE.MeshBasicMaterial({ color: 0x1b2d38, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    const matWake     = new THREE.MeshBasicMaterial({ color: 0xbfeaff, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const matBeam     = new THREE.MeshBasicMaterial({ color: 0x7ce8ff, transparent: true, opacity: 0.16, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });

    // A) v17.8.3 MUSEUM-GRADE SCULPTED 263m × 38.9m IJN YAMATO HULL
    //    (Smooth Bezier-curved beam, flared clipper bow, cruiser stern, teak deck, breakwater, anchor chains & stern catapults!)
    const makeHullShape = (beamScale = 1.0, lenScale = 1.0) => {
      const sh = new THREE.Shape();
      const hw = 19.45 * beamScale;
      const zBow = 134 * lenScale;
      const zStern = -126 * lenScale;
      // Start at razor-sharp bow stem (0, zBow) -> sweep smoothly along Starboard (+X) -> Cruiser Stern -> Port (-X)
      sh.moveTo(0, zBow);
      sh.bezierCurveTo(hw * 0.24, zBow - 18 * lenScale, hw * 0.78, 76 * lenScale, hw, 34 * lenScale);
      sh.lineTo(hw, -44 * lenScale);
      sh.bezierCurveTo(hw * 0.96, -86 * lenScale, hw * 0.62, zStern + 14 * lenScale, hw * 0.28, zStern + 2 * lenScale);
      sh.quadraticCurveTo(0, zStern - 3 * lenScale, -hw * 0.28, zStern + 2 * lenScale);
      sh.bezierCurveTo(-hw * 0.62, zStern + 14 * lenScale, -hw * 0.96, -86 * lenScale, -hw, -44 * lenScale);
      sh.lineTo(-hw, 34 * lenScale);
      sh.bezierCurveTo(-hw * 0.78, 76 * lenScale, -hw * 0.24, zBow - 18 * lenScale, 0, zBow);
      return sh;
    };

    const extrudeHullTier = (beamScale, lenScale, height, yBottom, mat, bevel = 0.45) => {
      const geo = new THREE.ExtrudeGeometry(makeHullShape(beamScale, lenScale), {
        depth: height, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 24
      });
      // v18.2 Rotate +90° around X & lift by height so sharp clipper bow (y=+134) stays cleanly at +Z & normals face OUT!
      geo.rotateX(Math.PI / 2);
      geo.translate(0, height, 0);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = yBottom;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    };

    // 1. Continuous Crimson Underwater Anti-Fouling Hull + Lower Boot-Topping
    shipRoot.add(extrudeHullTier(0.93, 0.97, 5.2, -4.4, matRedHull, 0.35));
    // 2. Main Armored Hull Belt (Full 38.9m Beam, Smooth Curved Bow & Cruiser Stern)
    shipRoot.add(extrudeHullTier(1.00, 1.00, 7.6, 0.8, matHullGry, 0.45));
    // 3. Flared Upper Freeboard & Sheer Strake
    shipRoot.add(extrudeHullTier(1.025, 1.015, 1.8, 8.2, matHullGry, 0.22));
    // 4. Flush Weathered Teak Plank Main Deck (Matching exact curved hull outline!)
    shipRoot.add(extrudeHullTier(0.965, 0.985, 0.45, 9.85, matTeak, 0.0));

    // Iconic Bulbous Bow faired cleanly into the lower stem
    const bulbBow = new THREE.Mesh(new THREE.SphereGeometry(4.4, 14, 10), matRedHull);
    bulbBow.scale.set(0.72, 0.82, 2.35);
    bulbBow.position.set(0, -1.6, 131.5);
    shipRoot.add(bulbBow);

    // v18.2 Flush Sculpted 16-Petal Golden Imperial Chrysanthemum Crest bolted directly onto Clipper Bow Stem!
    const matGoldCrest = new THREE.MeshStandardMaterial({ color: 0xd4a938, metalness: 0.82, roughness: 0.28 });
    const crestGrp = new THREE.Group();
    crestGrp.position.set(0, 8.95, 136.05); // Flush on Tier-3 bow stem (zBow=134*1.015+0.22=136.23) — ZERO floating gap!
    const sealBase = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.48, 0.36, 16), matGoldCrest);
    sealBase.rotation.x = Math.PI / 2; crestGrp.add(sealBase);
    const sealCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), matGoldCrest);
    sealCore.position.z = 0.16; crestGrp.add(sealCore);
    for (let pi = 0; pi < 16; pi++) {
      const pa = (pi / 16) * Math.PI * 2;
      const pet = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.82, 0.18), matGoldCrest);
      pet.position.set(Math.cos(pa) * 0.92, Math.sin(pa) * 0.92, 0.14);
      pet.rotation.z = pa - Math.PI / 2;
      crestGrp.add(pet);
    }
    shipRoot.add(crestGrp);
    const jackstaff = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 9.5, 6), matHullDrk);
    jackstaff.position.set(0, 14.6, 129.5); shipRoot.add(jackstaff);

    // Armored Belt Strakes & Battle-Scarred Rust Streaks along hull sides
    for (const sx of [-1, 1]) {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.4, 124), matHullDrk);
      belt.position.set(sx * 19.65, 3.2, -6);
      shipRoot.add(belt);
      for (let ri = 0; ri < 5; ri++) {
        const rustPatch = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.6 + (ri % 2) * 1.4, 9 + ri * 1.8), matRust);
        rustPatch.position.set(sx * 19.75, 4.6 - (ri % 3) * 1.2, -46 + ri * 24);
        shipRoot.add(rustPatch);
      }
      // Twin Bow Anchor Hawsepipes + Dark Anchors
      const anchor = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.8, 1.6), matHullDrk);
      anchor.position.set(sx * 8.2, 7.4, 108);
      anchor.rotation.y = sx * 0.35;
      shipRoot.add(anchor);
    }

    // Foredeck V-Shaped Wave Breakwater, Anchor Chains & Capstans
    for (const sx of [-1, 1]) {
      const bw = new THREE.Mesh(new THREE.BoxGeometry(11.5, 1.5, 0.65), matHullDrk);
      bw.position.set(sx * 4.8, 10.9, 92);
      bw.rotation.y = sx * -0.42;
      shipRoot.add(bw);
      const chain = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.25, 22), matHullDrk);
      chain.position.set(sx * 2.8, 10.35, 106);
      chain.rotation.y = sx * -0.14;
      shipRoot.add(chain);
      const capstan = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 1.2, 10), matHullDrk);
      capstan.position.set(sx * 3.6, 10.8, 97);
      shipRoot.add(capstan);
    }

    // Midship Armored Citadel Deckhouse & Superstructure Base
    const citadel = new THREE.Mesh(new THREE.BoxGeometry(24.0, 3.8, 86), matHullGry);
    citadel.position.set(0, 11.8, -6);
    citadel.castShadow = true;
    shipRoot.add(citadel);
    const citadelDeck = new THREE.Mesh(new THREE.BoxGeometry(23.2, 0.35, 84), matTeak);
    citadelDeck.position.set(0, 13.8, -6);
    shipRoot.add(citadelDeck);

    // Stern Aircraft Handling Deck: Twin Angled Seaplane Catapults + Lattice Recovery Crane
    for (const sx of [-1, 1]) {
      const cat = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 19.5), matHullDrk);
      cat.position.set(sx * 9.8, 11.2, -98);
      cat.rotation.y = sx * 0.32;
      shipRoot.add(cat);
    }
    const craneBase = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 4.2, 8), matHullDrk);
    craneBase.position.set(0, 12.0, -118);
    shipRoot.add(craneBase);
    const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 18.0), matHullDrk);
    craneBoom.position.set(0, 16.5, -111);
    craneBoom.rotation.x = -0.45;
    shipRoot.add(craneBoom);

    // B) 3 COLOSSAL TRIPLE 460mm (18.1-INCH) MAIN TURRETS (Independently Rotating & Elevating!)
    const mainTurrets = [];
    const build460Turret = (ty, tz, baseYaw) => {
      const barbette = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 4.2, 16), matHullDrk);
      barbette.position.set(0, ty - 2.0, tz); shipRoot.add(barbette);

      const piv = new THREE.Group();
      piv.position.set(0, ty, tz);
      piv.rotation.y = baseYaw;
      shipRoot.add(piv);

      const house = new THREE.Mesh(new THREE.BoxGeometry(14.2, 5.2, 16.5), matHullGry);
      house.position.set(0, 2.6, -1.2); house.castShadow = true; piv.add(house);
      const face = new THREE.Mesh(new THREE.BoxGeometry(13.6, 4.6, 3.2), matHullDrk);
      face.position.set(0, 2.3, 7.2); face.rotation.x = 0.42; piv.add(face);
      const rfBar = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.2, 1.6), matHullDrk);
      rfBar.position.set(0, 4.6, -3.5); piv.add(rfBar);

      const gunPitch = new THREE.Group();
      gunPitch.position.set(0, 2.5, 7.2);
      piv.add(gunPitch);

      const matCanvasBag = new THREE.MeshStandardMaterial({ color: 0x9aa2a6, roughness: 0.92, metalness: 0.05 });
      const flashes = [];
      const muzzleTips = [];
      for (const bx of [-3.4, 0, 3.4]) {
        const bag = new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.85, 2.2), matCanvasBag);
        bag.position.set(bx, 0, 0.8); gunPitch.add(bag);
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.84, 7.2, 10), matHullDrk);
        sleeve.rotation.x = Math.PI / 2; sleeve.position.set(bx, 0, 4.4); gunPitch.add(sleeve);
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.68, 21.5, 10), matBarrel);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(bx, 0, 11.2); bar.castShadow = true; gunPitch.add(bar);
        const mTip = new THREE.Object3D();
        mTip.position.set(bx, 0, 22.3);
        gunPitch.add(mTip);
        muzzleTips.push(mTip);
        const fl = new THREE.Mesh(
          new THREE.ConeGeometry(4.0, 17.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xffa826, transparent: true, opacity: 0.94, blending: THREE.AdditiveBlending, depthWrite: false })
        );
        fl.rotation.x = Math.PI / 2; fl.position.set(bx, 0, 30.2); fl.visible = false;
        gunPitch.add(fl);
        flashes.push(fl);
      }
      mainTurrets.push({ pivot: piv, gunPitch, flashes, muzzleTips, baseYaw, curYaw: baseYaw, curPitch: 0.08, tz, ty });
    };
    build460Turret(11.6,  66, 0);        // Turret A (Forward)
    build460Turret(15.2,  42, 0);        // Turret B (Superfiring Forward)
    build460Turret(12.0, -72, Math.PI);  // Turret X (Aft)

    // C) Secondary Triple 155mm Turrets + Twin 127mm AA Batteries
    for (const [sy, sz, sry] of [[18.0, 22, 0], [15.6, -50, Math.PI]]) {
      const sec = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 8.8), matHullGry);
      sec.position.set(0, sy, sz); sec.rotation.y = sry; shipRoot.add(sec);
      for (const bx of [-1.6, 0, 1.6]) {
        const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 10.5, 6), matBarrel);
        sb.rotation.x = Math.PI / 2;
        sb.position.set(bx, sy, sz + (sry === 0 ? 7.5 : -7.5)); shipRoot.add(sb);
      }
    }
    for (const sx of [-16.0, 16.0]) {
      for (const az of [18, 0, -18]) {
        const aaGrp = new THREE.Group();
        aaGrp.position.set(sx, 12.8, az);
        aaGrp.rotation.y = sx > 0 ? Math.PI * 0.42 : -Math.PI * 0.42;
        const aaHouse = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 4.6), matHullDrk);
        aaGrp.add(aaHouse);
        for (const abx of [-0.65, 0.65]) {
          const ab = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 6.2, 6), matBarrel);
          ab.rotation.x = Math.PI / 2 - 0.36; ab.position.set(abx, 1.2, 3.8); aaGrp.add(ab);
        }
        shipRoot.add(aaGrp);
      }
      for (const tz25 of [28, 10, -8, -26, -38]) {
        const tub = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 1.6, 10), matHullGry);
        tub.position.set(sx * 0.86, 14.5, tz25); shipRoot.add(tub);
        const aaGun = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 3.2, 5), matBarrel);
        aaGun.rotation.x = Math.PI / 2 - 0.55; aaGun.position.set(sx * 0.86, 15.8, tz25); shipRoot.add(aaGun);
      }
      const boat = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 10.5), matTeak);
      boat.position.set(sx * 0.72, 10.9, -52); shipRoot.add(boat);
      const fp = new THREE.Group();
      fp.position.set(sx * 9.8, 12.6, -98);
      fp.rotation.y = sx * 0.32;
      const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 9.5, 8), matHullGry);
      fuse.rotation.x = Math.PI / 2; fp.add(fuse);
      const wing = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.28, 2.4), matHullGry);
      wing.position.set(0, 0.1, 1.2); fp.add(wing);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.22, 1.1), matHullDrk);
      tail.position.set(0, 0.2, -4.1); fp.add(tail);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.8, 1.4), matHullDrk);
      fin.position.set(0, 0.9, -4.1); fp.add(fin);
      for (const fx of [-1.8, 1.8]) {
        const flt = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 6.2, 6), matHullDrk);
        flt.rotation.x = Math.PI / 2; flt.position.set(fx, -1.1, 0.6); fp.add(flt);
      }
      shipRoot.add(fp);
    }

    // D) ICONIC 44-METER PAGODA MAST SUPERSTRUCTURE + RAKED FUNNEL + SWEEPING SEARCHLIGHT!
    const citBase = new THREE.Mesh(new THREE.BoxGeometry(22.0, 7.5, 58.0), matHullGry);
    citBase.position.set(0, 13.8, -8); citBase.castShadow = true; shipRoot.add(citBase);

    const pagodaTiers = [
      { w: 15.5, h: 6.5, l: 17.5, y: 20.5, z: 6.0 },
      { w: 13.0, h: 6.2, l: 14.5, y: 26.8, z: 6.5 },
      { w: 11.2, h: 5.5, l: 12.0, y: 32.6, z: 7.0 },
      { w:  8.5, h: 5.0, l:  9.2, y: 37.8, z: 7.2 },
      { w:  5.8, h: 4.4, l:  6.4, y: 42.4, z: 7.2 }
    ];
    for (let ti = 0; ti < pagodaTiers.length; ti++) {
      const t = pagodaTiers[ti];
      const box = new THREE.Mesh(new THREE.BoxGeometry(t.w, t.h, t.l), ti % 2 === 0 ? matHullGry : matHullDrk);
      box.position.set(0, t.y, t.z); box.castShadow = true; shipRoot.add(box);
      if (ti >= 1 && ti <= 3) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.35, 1.15, t.l * 0.75), matPortGlow);
        win.position.set(0, t.y + 0.8, t.z + 0.6); shipRoot.add(win);
      }
    }
    const topRange = new THREE.Mesh(new THREE.BoxGeometry(16.0, 1.6, 2.0), matHullDrk);
    topRange.position.set(0, 45.4, 7.2); shipRoot.add(topRange);
    const radar = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.8, 0.5), matRust);
    radar.position.set(0, 48.2, 7.2); shipRoot.add(radar);
    for (const [wy, wz, ww] of [[24.2, 7.2, 22.0], [30.2, 7.4, 18.5], [35.4, 7.4, 14.5]]) {
      const wingDeck = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.65, 4.2), matHullDrk);
      wingDeck.position.set(0, wy, wz); shipRoot.add(wingDeck);
    }
    const yard1 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 22.0, 6), matHullDrk);
    yard1.rotation.z = Math.PI / 2; yard1.position.set(0, 40.5, 3.5); shipRoot.add(yard1);
    const yard2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 15.0, 6), matHullDrk);
    yard2.rotation.z = Math.PI / 2; yard2.position.set(0, 35.2, -32.0); shipRoot.add(yard2);
    for (const px of [-4.6, 4.6]) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 17.5, 6), matHullDrk);
      sp.position.set(px, 24.0, -14.2); sp.rotation.x = -0.34; shipRoot.add(sp);
    }

    // Eerie Sweeping Bridge Searchlight Beam!
    const searchlightPivot = new THREE.Group();
    searchlightPivot.position.set(0, 35.5, 11.5);
    const slLamp = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), matPortGlow);
    searchlightPivot.add(slLamp);
    const slBeam = new THREE.Mesh(new THREE.ConeGeometry(18.0, 165.0, 14, 1, true), matBeam);
    slBeam.rotation.x = -Math.PI / 2 + 0.14;
    slBeam.position.set(0, -11.5, 82.0);
    searchlightPivot.add(slBeam);
    shipRoot.add(searchlightPivot);

    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 21.0, 12), matHullDrk);
    funnel.position.set(0, 24.5, -14.5); funnel.rotation.x = -0.34; funnel.castShadow = true; shipRoot.add(funnel);
    const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 2.2, 12), matRust);
    funnelCap.position.set(0, 34.4, -18.0); funnelCap.rotation.x = -0.34; shipRoot.add(funnelCap);
    const aftMast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 26.0, 8), matHullDrk);
    aftMast.position.set(0, 26.0, -32.0); aftMast.rotation.x = -0.14; shipRoot.add(aftMast);
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 22.0), matRust);
    crane.position.set(0, 15.8, -108); crane.rotation.x = 0.42; shipRoot.add(crane);

    // E) Darker, Denser Swirling Spectral Fog Shroud + Bow-Wake Foam!
    const mistRings = [];
    const mistRing1 = new THREE.Mesh(new THREE.RingGeometry(46, 175, 28), matMist);
    mistRing1.rotation.x = -Math.PI / 2; mistRing1.position.y = 1.6; grp.add(mistRing1); mistRings.push(mistRing1);
    const mistRing2 = new THREE.Mesh(new THREE.RingGeometry(75, 210, 28), matMistDark);
    mistRing2.rotation.x = -Math.PI / 2; mistRing2.position.y = 4.2; grp.add(mistRing2); mistRings.push(mistRing2);
    const mistWall = new THREE.Mesh(new THREE.CylinderGeometry(168, 138, 28, 24, 1, true), matMistDark);
    mistWall.position.y = 13.0; grp.add(mistWall); mistRings.push(mistWall);

    // Bow-wake V-foam & churning stern wake
    const bowWakeGrp = new THREE.Group();
    for (const sx of [-1, 1]) {
      const wPlane = new THREE.Mesh(new THREE.PlaneGeometry(14, 72), matWake);
      wPlane.rotation.x = -Math.PI / 2;
      wPlane.rotation.z = sx * 0.28;
      wPlane.position.set(sx * 16, 0.7, 108);
      bowWakeGrp.add(wPlane);
    }
    const sternWake = new THREE.Mesh(new THREE.PlaneGeometry(28, 86), matWake);
    sternWake.rotation.x = -Math.PI / 2;
    sternWake.position.set(0, 0.6, -158);
    bowWakeGrp.add(sternWake);
    grp.add(bowWakeGrp);

    grp.scale.setScalar(1.55);
    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, shipRoot, mainTurrets, matPortGlow, matHullGry, matMist, matMistDark,
      matBeam, matWake, searchlightPivot, mistRings, bowWakeGrp,
      state: "dormant", // dormant | drifting | retaliating | departing
      gx: 45000, gy: -32, gz: 25000, yaw: 0.6,
      sinkOffset: 0, forced: false,
      salvosLeft: 0, salvoTimer: 0, flashTimer: 0, provokeTimer: 0,
      targetX: 0, targetZ: 0, targetPeerId: null,
      driftTimer: 0, dormantCd: 300.0, hornCd: 8.0, phase: 0, searchlightYaw: 0
    };
  }

  // ==========================================================================
  // 2. MUSEUM-GRADE EL GRAN MAJA — MEGALODON (~34m ARTICULATED APEX PREDATOR!)
  // ==========================================================================
  _createMegalodon() {
    const grp = new THREE.Group();
    const matBack  = new THREE.MeshStandardMaterial({ color: 0x35424c, roughness: 0.46, metalness: 0.18 });
    const matBelly = new THREE.MeshStandardMaterial({ color: 0xb6c3cc, roughness: 0.56, metalness: 0.10 });
    const matScar  = new THREE.MeshStandardMaterial({ color: 0x6b7780, roughness: 0.72 });
    const matGums  = new THREE.MeshStandardMaterial({ color: 0x62151c, roughness: 0.78 });
    const matTooth = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.30 });
    const matEye   = new THREE.MeshBasicMaterial({ color: 0x993318 }); // Flares glowing abyssal amber-red on breach!
    const matWake  = new THREE.MeshBasicMaterial({ color: 0xaad8ec, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false });

    // Torso & Head Core (16m forward half)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 12.5, 12), matBack);
    torso.rotation.x = Math.PI / 2; torso.scale.set(0.95, 1.0, 1.05); torso.castShadow = true; grp.add(torso);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.2, 11.8, 10), matBelly);
    belly.rotation.x = Math.PI / 2; belly.position.y = -0.85; grp.add(belly);

    const snout = new THREE.Mesh(new THREE.ConeGeometry(2.75, 8.2, 10), matBack);
    snout.rotation.x = Math.PI / 2; snout.scale.set(0.95, 1.0, 0.78);
    snout.position.set(0, 0.55, 10.0); snout.castShadow = true; grp.add(snout);

    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 8), matEye);
      eye.position.set(sx * 2.08, 0.75, 7.6); grp.add(eye);
      for (let g = 0; g < 5; g++) {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.18), matGums);
        gill.position.set(sx * 3.15, -0.1, 3.8 - g * 0.65); grp.add(gill);
      }
      const sc = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 4.8), matScar);
      sc.position.set(sx * 3.35, 1.15, -0.5); sc.rotation.x = 0.24; grp.add(sc);
    }

    // Hinged Gaping Jaw with Double Rows of Serrated White Triangular Teeth!
    const upperTeethGrp = new THREE.Group(); upperTeethGrp.position.set(0, -0.35, 8.2); grp.add(upperTeethGrp);
    const jawPivot = new THREE.Group(); jawPivot.position.set(0, -1.1, 6.0); grp.add(jawPivot);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.85, 5.2), matBelly);
    lowerJaw.position.set(0, -0.45, 2.3); jawPivot.add(lowerJaw);
    const maw = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.45, 4.8), matGums);
    maw.position.set(0, 0.0, 2.2); jawPivot.add(maw);
    for (let t = -4; t <= 4; t++) {
      const tx = t * 0.34;
      const tz = 4.4 - Math.abs(t) * 0.42;
      const ut = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.62, 4), matTooth);
      ut.rotation.x = Math.PI; ut.position.set(tx, -0.22, tz - 2.0); upperTeethGrp.add(ut);
      const lt = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.56, 4), matTooth);
      lt.position.set(tx, 0.36, tz); jawPivot.add(lt);
    }

    // TOWERING 4.6-METER SCARRED DORSAL FIN
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5.4, 4), matBack);
    dorsal.scale.set(0.24, 1.0, 1.35);
    dorsal.position.set(0, 4.4, 0.8); dorsal.rotation.x = -0.34; dorsal.castShadow = true; grp.add(dorsal);

    for (const sx of [-1, 1]) {
      const pec = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 3.4), matBack);
      pec.position.set(sx * 5.2, -1.2, 2.0);
      pec.rotation.z = -sx * 0.24; pec.rotation.y = -sx * 0.38; grp.add(pec);
    }

    // 3-Joint Articulated Whipping Tail + Giant Crescent Caudal Fin!
    const tail1 = new THREE.Group(); tail1.position.set(0, 0, -6.0); grp.add(tail1);
    const tSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.85, 7.6, 10), matBack);
    tSeg1.rotation.x = Math.PI / 2; tSeg1.position.z = -3.6; tail1.add(tSeg1);
    const dorsal2 = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.7, 4), matBack);
    dorsal2.scale.set(0.25, 1, 1.2); dorsal2.position.set(0, 2.1, -4.8); dorsal2.rotation.x = -0.3; tail1.add(dorsal2);

    const tail2 = new THREE.Group(); tail2.position.set(0, 0, -7.2); tail1.add(tail2);
    const tSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.65, 6.8, 10), matBack);
    tSeg2.rotation.x = Math.PI / 2; tSeg2.position.z = -3.2; tail2.add(tSeg2);

    const caudal = new THREE.Group(); caudal.position.set(0, 0, -6.4); tail2.add(caudal);
    const topLobe = new THREE.Mesh(new THREE.BoxGeometry(0.32, 6.4, 2.6), matBack);
    topLobe.position.set(0, 2.6, -1.4); topLobe.rotation.x = -0.45; caudal.add(topLobe);
    const botLobe = new THREE.Mesh(new THREE.BoxGeometry(0.30, 4.8, 2.2), matBelly);
    botLobe.position.set(0, -2.0, -1.1); botLobe.rotation.x = 0.42; caudal.add(botLobe);

    // Churning dark surface wake V-trail around the dorsal fin!
    const wakeMesh = new THREE.Mesh(new THREE.RingGeometry(2.8, 8.2, 16), matWake);
    wakeMesh.rotation.x = -Math.PI / 2;
    wakeMesh.scale.set(0.75, 2.2, 1.0);
    wakeMesh.position.set(0, 2.2, -3.5);
    grp.add(wakeMesh);

    grp.scale.setScalar(1.85);
    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, jawPivot, tail1, tail2, caudal, matBack, matBelly, matEye, matWake, wakeMesh,
      state: "dormant", // dormant | stalking | submerging | breach_lunge | retreating
      gx: 18000, gy: -35, gz: 52000, yaw: 0,
      orbitAng: 0, stageTimer: 0, submergeDur: 4.0, lungeArcT: 0, fleeTimer: 0, dormantCd: 300.0,
      hp: 110, hitCd: 0, phase: 0, depthOff: -2.2, forced: false, dreadCueCd: 0
    };
  }

  // ==========================================================================
  // 3. MUSEUM-GRADE THE BLOOP — ABYSSAL KRAKEN (~120m+ MAELSTROM RING!)
  // ==========================================================================
  _createKraken() {
    const grp = new THREE.Group();
    const matChitin = new THREE.MeshStandardMaterial({ color: 0x1a1e2e, roughness: 0.62, metalness: 0.34 });
    const matFlesh  = new THREE.MeshStandardMaterial({ color: 0x26283d, roughness: 0.74, metalness: 0.20 });
    const matSucker = new THREE.MeshStandardMaterial({ color: 0x628099, emissive: 0x14384f, emissiveIntensity: 0.55, roughness: 0.45 });
    const matBio    = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const matEye    = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const matBeak   = new THREE.MeshStandardMaterial({ color: 0x0e0c12, roughness: 0.35, metalness: 0.6 });

    // A) Colossal 28m Wide × 36m Tall Domed Abyssal Mantle & Head
    const headGrp = new THREE.Group();
    grp.add(headGrp);

    const mantle = new THREE.Mesh(new THREE.SphereGeometry(14.5, 16, 12), matChitin);
    mantle.scale.set(1.0, 1.55, 1.05); mantle.position.y = 14.0; mantle.castShadow = true; headGrp.add(mantle);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(13.8, 16.0, 10), matFlesh);
    crown.position.y = 32.5; crown.castShadow = true; headGrp.add(crown);

    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.65, 22.0, 0.65), matBio);
      vein.position.set(Math.sin(a) * 14.2, 16.5, Math.cos(a) * 14.2);
      headGrp.add(vein);
    }
    for (const sx of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.2, 4.2), matChitin);
      brow.position.set(sx * 8.2, 9.6, 11.4); brow.rotation.z = -sx * 0.25; headGrp.add(brow);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), matEye);
      eye.position.set(sx * 7.8, 7.2, 12.2); headGrp.add(eye);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.4, 0.8), matBeak);
      pupil.position.set(sx * 7.8, 7.2, 14.1); headGrp.add(pupil);
    }
    const beakU = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.5, 6), matBeak);
    beakU.rotation.x = Math.PI * 0.62; beakU.position.set(0, 1.5, 13.5); headGrp.add(beakU);

    // B) 8 ARTICULATED 42-METER BREACHING TENTACLES RINGING THE VESSEL (~110m DIAMETER!)
    const tentacles = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rad = 46 + (i % 2) * 11;
      const tRoot = new THREE.Group();
      tRoot.position.set(Math.cos(ang) * rad, -8, Math.sin(ang) * rad);
      tRoot.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang));
      grp.add(tRoot);

      const segs = [];
      let parent = tRoot;
      const radii = [2.6, 2.1, 1.65, 1.20, 0.72];
      const lens  = [9.5, 9.0, 8.5, 8.0, 7.5];
      for (let s = 0; s < 5; s++) {
        const piv = new THREE.Group();
        piv.position.y = s === 0 ? 0 : lens[s - 1];
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radii[s] * 0.80, radii[s], lens[s], 9), s % 2 === 0 ? matFlesh : matChitin);
        mesh.position.y = lens[s] * 0.5; mesh.castShadow = true; piv.add(mesh);
        for (let k = 0; k < 3; k++) {
          const suck = new THREE.Mesh(new THREE.SphereGeometry(radii[s] * 0.28, 6, 5), matSucker);
          suck.position.set(0, 1.8 + k * 2.5, radii[s] * 0.82); piv.add(suck);
        }
        parent.add(piv);
        segs.push(piv);
        parent = piv;
      }
      tentacles.push({ root: tRoot, segs, ang, rad, slamPhase: 0, slamming: false });
    }

    // C) SUBSURFACE BIOLUMINESCENT OMEN GLOW + MAELSTROM WHIRLPOOL VORTEX RINGS!
    const matOmenGlow = new THREE.MeshBasicMaterial({
      color: 0x22d8ff, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const omenDisc = new THREE.Mesh(new THREE.CircleGeometry(56, 28), matOmenGlow);
    omenDisc.rotation.x = -Math.PI / 2;
    omenDisc.position.y = 0.28;
    grp.add(omenDisc);

    const matOmenRing = new THREE.MeshBasicMaterial({
      color: 0x8b4dff, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const omenRing = new THREE.Mesh(new THREE.RingGeometry(42, 62, 28), matOmenRing);
    omenRing.rotation.x = -Math.PI / 2;
    omenRing.position.y = 0.36;
    grp.add(omenRing);

    const vortexRings = [];
    const vortexSpecs = [
      { rIn: 14, rOut: 28, col: 0x09131c, op: 0.62, spd:  2.4, y: 0.42 },
      { rIn: 27, rOut: 44, col: 0x0f202e, op: 0.48, spd:  1.7, y: 0.46 },
      { rIn: 43, rOut: 62, col: 0x1b374a, op: 0.36, spd:  1.15, y: 0.50 },
      { rIn: 58, rOut: 78, col: 0x84c9e0, op: 0.26, spd:  0.80, y: 0.54 }
    ];
    for (let v = 0; v < vortexSpecs.length; v++) {
      const vs = vortexSpecs[v];
      const vMat = new THREE.MeshBasicMaterial({ color: vs.col, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
      const vMesh = new THREE.Mesh(new THREE.RingGeometry(vs.rIn, vs.rOut, 28), vMat);
      vMesh.rotation.x = -Math.PI / 2;
      vMesh.position.y = vs.y;
      grp.add(vMesh);
      vortexRings.push({ mesh: vMesh, mat: vMat, maxOp: vs.op, spd: vs.spd });
    }

    // D) Telegraphed Tentacle Slam Warning Ring on the Water Surface!
    const matSlamWarn = new THREE.MeshBasicMaterial({
      color: 0xff4b6e, transparent: true, opacity: 0.0, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const slamWarnRing = new THREE.Mesh(new THREE.RingGeometry(9.0, 17.5, 22), matSlamWarn);
    slamWarnRing.rotation.x = -Math.PI / 2;
    slamWarnRing.position.y = 0.72;
    slamWarnRing.visible = false;
    grp.add(slamWarnRing);

    grp.scale.setScalar(1.75);
    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, headGrp, tentacles, matChitin, matFlesh, matBio, matEye,
      omenDisc, omenRing, matOmenGlow, matOmenRing, vortexRings, slamWarnRing, matSlamWarn,
      state: "dormant", // dormant | sonar_omen | tentacle_ring | breach_slam | flee
      gx: -24000, gy: -32, gz: -54000, yaw: 0,
      stageTimer: 0, fleeTimer: 0, dormantCd: 330.0,
      hp: 165, slamCd: 3.0, activeSlamIdx: -1, headSubmerge: -42, phase: 0,
      forced: false, omenPulseCd: 0
    };
  }

  // ==========================================================================
  // FLIR THERMAL VISION SUPPORT
  // ==========================================================================
  setThermalMode(isFlir) {
    this._flirMode = !!isFlir;
    const setEm = (mat, hex, inten) => { if (mat && mat.emissive) { mat.emissive.setHex(hex); mat.emissiveIntensity = inten; } };
    setEm(this.megalodon.matBack,  isFlir ? 0xffffff : 0x000000, isFlir ? 0.85 : 0);
    setEm(this.megalodon.matBelly, isFlir ? 0xffffff : 0x000000, isFlir ? 0.90 : 0);
    setEm(this.kraken.matChitin,   isFlir ? 0x99eeff : 0x000000, isFlir ? 0.72 : 0);
    setEm(this.kraken.matFlesh,    isFlir ? 0xffffff : 0x000000, isFlir ? 0.85 : 0);
    setEm(this.yamato.matHullGry,  isFlir ? 0x3b6e88 : 0x000000, isFlir ? 0.42 : 0);
  }

  // ==========================================================================
  // WATER SPOUT & 460mm SHELL EFFECTS
  // ==========================================================================
  _spawnWaterSpout(gx, gz, heightM = 42, radM = 7.5) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const grp = new THREE.Group();
    const matFoam = new THREE.MeshBasicMaterial({ color: 0xe6f8ff, transparent: true, opacity: 0.86, depthWrite: false });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(radM * 0.45, radM, heightM, 10), matFoam);
    col.position.y = heightM * 0.5; grp.add(col);
    const ring = new THREE.Mesh(new THREE.RingGeometry(radM * 0.6, radM * 2.5, 16), matFoam);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; grp.add(ring);
    this.world.toLocal(gx, seaL, gz, grp.position);
    this.scene.add(grp);
    this.spouts.push({ gx, gz, gy: seaL, mesh: grp, mat: matFoam, age: 0, maxAge: 2.8, heightM });
  }

  _provokeYamato(attackerX, attackerZ, attackerPeerId, audio, ui, reasonText) {
    const ym = this.yamato;
    if (ym.state === "drifting") {
      ym.state = "retaliating";
      ym.salvosLeft = 3;
      ym.salvoTimer = 3.0; // Telegraphed 3.0s turret lock & warning before Salvo 1!
      ym.targetX = attackerX; ym.targetZ = attackerZ; ym.targetPeerId = attackerPeerId;
      ym.matPortGlow.color.setHex(0xff2b1f);
      ym.matBeam.color.setHex(0xff3824);
      if (audio && audio.playYamatoKlaxon) audio.playYamatoKlaxon();
      this._emitDreadAudio(audio, 0.96, "yamato");

    } else if (ym.state === "retaliating") {
      ym.targetX = attackerX; ym.targetZ = attackerZ;
    }
  }

  _fireYamatoSalvo(audio, particles) {
    const ym = this.yamato;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    ym.flashTimer = 0.36;
    if (audio && audio.playYamatoSalvo) audio.playYamatoSalvo();
    this._emitDreadAudio(audio, 0.95, "yamato");

    // v18.2 Fire all nine 460mm shells DIRECTLY forward from each barrel's real 3D muzzle tip!
    ym.mesh.updateMatrixWorld(true);
    const tmpTip = new THREE.Vector3();
    for (const t of ym.mainTurrets) {
      for (const fl of t.flashes) fl.visible = true;
      const tips = (t.muzzleTips && t.muzzleTips.length > 0) ? t.muzzleTips : [t.gunPitch];
      for (let bi = 0; bi < tips.length; bi++) {
        tips[bi].getWorldPosition(tmpTip);
        const sx = tmpTip.x + this.world.originX;
        const sy = tmpTip.y;
        const sz = tmpTip.z + this.world.originZ;
        const spreadX = (Math.random() - 0.5) * 44;
        const spreadZ = (Math.random() - 0.5) * 44;
        const tx = ym.targetX + spreadX;
        const tz = ym.targetZ + spreadZ;
        const dist = Math.max(25, Math.hypot(tx - sx, tz - sz));
        const flightT = Math.max(1.3, Math.min(3.2, dist / 215));
        const g = 28.0;
        const vx = (tx - sx) / flightT;
        const vz = (tz - sz) / flightT;
        const vy = (seaL - sy + 0.5 * g * flightT * flightT) / flightT;

        const shellMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.35, 8, 6),
          new THREE.MeshBasicMaterial({ color: 0xffb703 })
        );
        this.world.toLocal(sx, sy, sz, shellMesh.position);
        this.scene.add(shellMesh);
        this.shells.push({ gx: sx, gy: sy, gz: sz, vx, vy, vz, g, mesh: shellMesh, life: flightT + 0.45 });

        if (particles && bi === 1) {
          particles.emitCrashBurst(sx, sy + 1.0, sz, 2.8, "rock", "clear");
        }
      }
    }
  }

  // ==========================================================================
  // WEAPON HIT DETECTION (Called by ALL bullets, 30mm, 105mm/125mm/140mm, Rockets!)
  // ==========================================================================
  applyWeaponHit(gx, gy, gz, dmg = 18, attackerX = 0, attackerZ = 0, attackerPeerId = null, audio = null, ui = null, network = null) {
    // 1. POSSESSED YAMATO (263m × 38.9m) — Shooting it wakes its 3-Salvo Retaliation!
    const ym = this.yamato;
    if (ym.state === "drifting" || ym.state === "retaliating") {
      const dx = gx - ym.gx, dz = gz - ym.gz;
      const c = Math.cos(-ym.yaw), s = Math.sin(-ym.yaw);
      const lx = dx * c + dz * s, lz = -dx * s + dz * c;
      if (Math.abs(lx) < 40 && Math.abs(lz) < 214 && gy > ym.gy - 8 && gy < ym.gy + 84) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "yamato", dmg, ax: +attackerX.toFixed(1), az: +attackerZ.toFixed(1) });
        }
        this._provokeYamato(
          attackerX, attackerZ, attackerPeerId, audio, ui,
          "⚠ YOU FIRED ON THE PHANTOM YAMATO!! GENERAL QUARTERS — 460mm TURRETS SLEWING (3 SALVOS INCOMING)!!"
        );
        return { hit: true, name: "Phantom Yamato" };
      }
    }

    // 2. EL GRAN MAJA (34m Megalodon)
    const mg = this.megalodon;
    if (mg.state === "stalking" || mg.state === "submerging" || mg.state === "breach_lunge") {
      if (Math.hypot(gx - mg.gx, gz - mg.gz) < 38 && Math.abs(gy - mg.gy) < 24) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "megalodon", dmg });
        }
        mg.hp -= dmg;
        if (audio) audio.playImpact(0.78);
        if (mg.hp <= 0) {
          mg.state = "retreating"; mg.fleeTimer = 14.0; mg.hp = 110;

        }
        return { hit: true, name: "El Gran Maja" };
      }
    }

    // 3. THE BLOOP — ABYSSAL KRAKEN (Head + 8 Breaching Tentacles)
    const kr = this.kraken;
    if (kr.state === "tentacle_ring" || kr.state === "breach_slam") {
      let hitKr = (Math.hypot(gx - kr.gx, gz - kr.gz) < 40 && gy > kr.gy - 10 && gy < kr.gy + 74);
      let hitTentacleIdx = -1;
      if (!hitKr) {
        for (let ti = 0; ti < kr.tentacles.length; ti++) {
          const t = kr.tentacles[ti];
          const tx = kr.gx + Math.cos(t.ang) * (t.rad * 1.75);
          const tz = kr.gz + Math.sin(t.ang) * (t.rad * 1.75);
          if (Math.hypot(gx - tx, gz - tz) < 9.5 && gy > kr.gy - 5 && gy < kr.gy + 46) {
            hitKr = true; hitTentacleIdx = ti; break;
          }
        }
      }
      if (hitKr) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "kraken", dmg });
        }
        kr.hp -= dmg;
        if (audio) audio.playImpact(0.82);
        // Shooting an actively rearing tentacle with heavy ordnance can interrupt its slam!
        if (hitTentacleIdx >= 0 && dmg >= 28 && kr.tentacles[hitTentacleIdx].slamming) {
          kr.tentacles[hitTentacleIdx].slamming = false;
          kr.tentacles[hitTentacleIdx].slamPhase = 0;

        }
        if (kr.hp <= 0) {
          kr.state = "flee"; kr.fleeTimer = 14.0; kr.hp = 165;
          if (audio && audio.playBloopSonar) audio.playBloopSonar();
          this._emitDreadAudio(audio, 0.85, "bloop");

        }
        return { hit: true, name: "The Bloop" };
      }
    }
    return { hit: false };
  }

  applyRemoteHit(msg, audio, ui) {
    if (!msg || !msg.target) return;
    if (msg.target === "yamato") {
      this.applyWeaponHit(this.yamato.gx, this.yamato.gy + 12, this.yamato.gz, msg.dmg || 20, msg.ax || this.yamato.gx, msg.az || this.yamato.gz, msg.peerId, audio, ui, null);
    } else if (msg.target === "megalodon") {
      this.megalodon.hp -= (msg.dmg || 20);
      if (this.megalodon.hp <= 0) { this.megalodon.state = "retreating"; this.megalodon.fleeTimer = 14.0; this.megalodon.hp = 110; }
    } else if (msg.target === "kraken") {
      this.kraken.hp -= (msg.dmg || 20);
      if (this.kraken.hp <= 0) { this.kraken.state = "flee"; this.kraken.fleeTimer = 14.0; this.kraken.hp = 165; }
    }
  }

  // ==========================================================================
  // SHARED INTERFACE CONTRACT: forceSpawnNear(kind, gx, gz, audio, ui)
  // Spawns/surfaces the chosen entity ~180-280m near (gx, gz), even near shore!
  // ==========================================================================
  forceSpawnNear(kind, gx, gz, audio = null, ui = null) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const ang = Math.random() * Math.PI * 2;

    if (kind === "yamato") {
      const ym = this.yamato;
      const dist = 240;
      ym.gx = gx + Math.cos(ang) * dist;
      ym.gz = gz + Math.sin(ang) * dist;
      ym.gy = seaL;
      ym.yaw = ang + Math.PI * 0.5;
      ym.state = "drifting"; ym.driftTimer = 110 + Math.random() * 55; ym.sinkOffset = 0; ym.salvosLeft = 0; ym.provokeTimer = 0;
      ym.forced = true;
      ym.matPortGlow.color.setHex(0x62dcff);
      ym.matBeam.color.setHex(0x7ce8ff);
      if (audio && audio.playYamatoLament) audio.playYamatoLament();
      this._emitDreadAudio(audio, 0.88, "yamato");

      return ym;
    } else if (kind === "megalodon") {
      // Mutual exclusion: dismiss Kraken if active so both monsters NEVER overlap!
      if (this.kraken && this.kraken.state !== "dormant") {
        this.kraken.state = "dormant"; this.kraken.mesh.visible = false; this.kraken.dormantCd = 360; this.kraken.forced = false;
      }
      const mg = this.megalodon;
      const dist = 185;
      mg.gx = gx + Math.cos(ang) * dist;
      mg.gz = gz + Math.sin(ang) * dist;
      mg.gy = seaL - 2.0;
      mg.orbitAng = ang;
      mg.state = "stalking"; mg.stageTimer = 8.5; mg.hp = 110; mg.depthOff = -2.0;
      mg.huntTimeLeft = 65 + Math.random() * 35; // 1–1.7 min max encounter before losing interest!
      mg.lungesLeft = 2;
      mg.forced = true; mg.dreadCueCd = 2.0;
      this._emitDreadAudio(audio, 0.85, "megalodon");

      return mg;
    } else if (kind === "kraken") {
      // Mutual exclusion: dismiss Megalodon if active so both monsters NEVER overlap!
      if (this.megalodon && this.megalodon.state !== "dormant") {
        this.megalodon.state = "dormant"; this.megalodon.mesh.visible = false; this.megalodon.dormantCd = 360; this.megalodon.forced = false;
      }
      const kr = this.kraken;
      const dist = 180;
      kr.gx = gx + Math.cos(ang) * dist;
      kr.gz = gz + Math.sin(ang) * dist;
      kr.gy = seaL;
      kr.state = "sonar_omen"; kr.stageTimer = 5.0; kr.hp = 165; kr.headSubmerge = -42;
      kr.encounterTimer = 85 + Math.random() * 45; // 1.4–2.2 min max encounter before sinking back!
      kr.slamsLeft = 4;
      kr.forced = true; kr.omenPulseCd = 0.5;
      if (audio && audio.playBloopSonar) audio.playBloopSonar();
      this._emitDreadAudio(audio, 0.95, "bloop");

      return kr;
    }
    return null;
  }

  // Backwards-compatible manual spawner
  forceSpawn(kind, vehicle, boats, audio, ui) {
    const ab = boats ? boats.activeBoat : null;
    const px = ab ? ab.gx : vehicle.pos.x;
    const pz = ab ? ab.gz : vehicle.pos.z;
    return this.forceSpawnNear(kind, px, pz, audio, ui);
  }

  // ==========================================================================
  // MULTIPLAYER SNAPSHOT EXPORT / APPLY
  // ==========================================================================
  exportSyncState() {
    const ym = this.yamato, mg = this.megalodon, kr = this.kraken;
    return {
      ym: { s: ym.state, x: +ym.gx.toFixed(1), z: +ym.gz.toFixed(1), y: +ym.yaw.toFixed(2), sk: +ym.sinkOffset.toFixed(2), sl: ym.salvosLeft, tx: +ym.targetX.toFixed(1), tz: +ym.targetZ.toFixed(1) },
      mg: { s: mg.state, x: +mg.gx.toFixed(1), z: +mg.gz.toFixed(1), y: +mg.yaw.toFixed(2), d: +mg.depthOff.toFixed(2) },
      kr: { s: kr.state, x: +kr.gx.toFixed(1), z: +kr.gz.toFixed(1), hs: +kr.headSubmerge.toFixed(1), si: kr.activeSlamIdx }
    };
  }

  getSyncState() {
    return this.exportSyncState();
  }

  applySyncState(d) {
    if (!d) return;
    if (d.ym) {
      const ym = this.yamato;
      ym.state = d.ym.s; ym.gx = d.ym.x; ym.gz = d.ym.z; ym.yaw = d.ym.y;
      ym.sinkOffset = d.ym.sk || 0; ym.salvosLeft = d.ym.sl || 0;
      ym.targetX = d.ym.tx || 0; ym.targetZ = d.ym.tz || 0;
      ym.matPortGlow.color.setHex(ym.state === "retaliating" ? 0xff2b1f : 0x62dcff);
      ym.matBeam.color.setHex(ym.state === "retaliating" ? 0xff3824 : 0x7ce8ff);
    }
    if (d.mg) {
      const mg = this.megalodon;
      // Map legacy state strings gracefully if an older host connects
      const sMap = { fin_stalk: "stalking", lunge_ram: "breach_lunge", flee: "retreating" };
      mg.state = sMap[d.mg.s] || d.mg.s;
      mg.gx = d.mg.x; mg.gz = d.mg.z; mg.yaw = d.mg.y; mg.depthOff = d.mg.d || -2.0;
    }
    if (d.kr) {
      const kr = this.kraken;
      kr.state = d.kr.s; kr.gx = d.kr.x; kr.gz = d.kr.z; kr.headSubmerge = d.kr.hs || -42; kr.activeSlamIdx = d.kr.si;
    }
  }

  // ==========================================================================
  // MAIN UPDATE LOOP (AI + Visuals + Sea Dread + Collisions + 460mm Shells!)
  // ==========================================================================
  update(dt, vehicle, boats, particles, audio, ui, network, hazards) {
    this.cameraShakeOut = 0;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const isAuth = !network || network.mode === "offline" || network.isHost;
    const players = this._collectSeaPlayers(vehicle, boats, network ? network.remotePlayers : null);
    const localP = players[0];

    if (isAuth) {
      this._stepAuthoritativeAI(dt, players, particles, audio, ui, hazards, seaL);
      if (network && network.mode === "wss_host") {
        const anyAct = (this.yamato.state !== "dormant" || this.megalodon.state !== "dormant" || this.kraken.state !== "dormant");
        this.syncAccum += dt;
        if ((anyAct && this.syncAccum >= 0.20) || this.syncAccum >= 1.5) {
          this.syncAccum = 0;
          network.send({ type: "ocean_cryptid_sync", data: this.exportSyncState() });
        }
      }
    }

    this._updateVisualsAndCollisions(dt, localP, boats, vehicle, particles, audio, ui, seaL);
    this._updateDreadAndWarnings(dt, localP);
  }

  _stepAuthoritativeAI(dt, players, particles, audio, ui, hazards, seaL) {
    // ========================================================================
    // 1. POSSESSED YAMATO-CLASS BATTLESHIP
    // ========================================================================
    const ym = this.yamato;
    if (ym.dormantCd > 0) ym.dormantCd -= dt;
    if (ym.state === "dormant") {
      if (ym.dormantCd <= 0) {
        const seaTgt = players.find((p) => p.inWater && this._isOpenOcean(p.x, p.z, 720));
        if (seaTgt && Math.random() < dt * 0.065) {
          const ang = Math.random() * Math.PI * 2;
          const sx = seaTgt.x + Math.cos(ang) * 430, sz = seaTgt.z + Math.sin(ang) * 430;
          if (this._isOpenOcean(sx, sz, 520)) {
            ym.gx = sx; ym.gz = sz; ym.gy = seaL;
            ym.yaw = ang + Math.PI * 0.52;
            ym.state = "drifting"; ym.driftTimer = 185; ym.sinkOffset = 0; ym.salvosLeft = 0; ym.provokeTimer = 0; ym.forced = false;
            ym.matPortGlow.color.setHex(0x62dcff);
            ym.matBeam.color.setHex(0x7ce8ff);
            if (audio && audio.playYamatoLament) audio.playYamatoLament();
            this._emitDreadAudio(audio, 0.72, "yamato");
          }
        }
      }
    } else if (ym.state === "drifting") {
      ym.driftTimer -= dt;
      ym.gx += Math.sin(ym.yaw) * 7.4 * dt;
      ym.gz += Math.cos(ym.yaw) * 7.4 * dt;

      // Reckless proximity provocation (< 110m for several seconds wakes its wrath!)
      let closestP = null, closestD = 99999;
      for (const p of players) {
        const d = Math.hypot(p.x - ym.gx, p.z - ym.gz);
        if (d < closestD) { closestD = d; closestP = p; }
      }
      if (closestP && closestD < 110) {
        ym.provokeTimer += dt;
        if (ym.provokeTimer >= 5.5) {
          this._provokeYamato(
            closestP.x, closestP.z, closestP.peerId, audio, ui,
            "⚠ YOU LINGERED TOO CLOSE TO THE PHANTOM YAMATO!! ITS 460mm TURRETS LOCK ON — 3 SALVOS INCOMING!!"
          );
        }
      } else {
        ym.provokeTimer = Math.max(0, ym.provokeTimer - dt * 0.6);
      }

      if ((!ym.forced && !this._isOpenOcean(ym.gx, ym.gz, 380)) || ym.driftTimer <= 0) {
        ym.state = "departing"; ym.forced = false;
        if (audio && audio.playYamatoLament) audio.playYamatoLament();
      }
    } else if (ym.state === "retaliating") {
      ym.gx += Math.sin(ym.yaw) * 4.5 * dt;
      ym.gz += Math.cos(ym.yaw) * 4.5 * dt;
      const atk = players.find((p) => p.peerId === ym.targetPeerId) || players[0];
      if (atk && Math.hypot(atk.x - ym.gx, atk.z - ym.gz) < 1050) {
        ym.targetX = atk.x + (atk.vx || 0) * 1.45;
        ym.targetZ = atk.z + (atk.vz || 0) * 1.45;
      }
      ym.salvoTimer -= dt;
      if (ym.salvoTimer <= 0 && ym.salvosLeft > 0) {
        this._fireYamatoSalvo(audio, particles);
        ym.salvosLeft--;
        if (ym.salvosLeft > 0) {
          ym.salvoTimer = 5.2;
        } else {
          ym.state = "departing"; ym.forced = false;
          ym.matPortGlow.color.setHex(0x62dcff);
          ym.matBeam.color.setHex(0x7ce8ff);
          if (audio && audio.playYamatoLament) audio.playYamatoLament();

        }
      }
    } else if (ym.state === "departing") {
      ym.gx += Math.sin(ym.yaw) * 4.0 * dt;
      ym.gz += Math.cos(ym.yaw) * 4.0 * dt;
      ym.sinkOffset += dt * 3.8;
      if (ym.sinkOffset > 56) {
        ym.state = "dormant"; ym.dormantCd = 420.0 + Math.random() * 120.0; ym.sinkOffset = 0; ym.provokeTimer = 0; ym.forced = false;
      }
    }

    // ========================================================================
    // 2. EL GRAN MAJA — 34m MEGALODON (4-Stage Predator Loop: Southern + Open Ocean!)
    // ========================================================================
    const mg = this.megalodon;
    if (this.oceanPeaceCd > 0) this.oceanPeaceCd = Math.max(0, this.oceanPeaceCd - dt);
    if (mg.dormantCd > 0) mg.dormantCd -= dt;
    if (mg.hitCd > 0) mg.hitCd -= dt;
    if (mg.dreadCueCd > 0) mg.dreadCueCd -= dt;

    // Patrol BOTH Southern Straits AND Open-Ocean Straits (boats OR swimming vehicles!)
    const findMegTarget = () => {
      if (mg.forced) {
        return players[0] || null;
      }
      return players.find((p) => p.inWater && (p.z > 6000 || this._isOpenOcean(p.x, p.z, 360)) && this._isOpenOcean(p.x, p.z, 260));
    };
    const megTgt = findMegTarget();

    // Road flare decoy check repels El Gran Maja!
    if ((mg.state === "stalking" || mg.state === "submerging" || mg.state === "breach_lunge") && hazards && hazards.flares) {
      for (const fl of hazards.flares) {
        if (Math.hypot(fl.gx - mg.gx, fl.gz - mg.gz) < 85) {
          mg.state = "retreating"; mg.fleeTimer = 13.0; mg.forced = false;

          break;
        }
      }
    }

    if (mg.state === "dormant") {
      // Mutual exclusion: Megalodon NEVER spawns while The Bloop (Kraken) is active!
      const krakenActive = (this.kraken && this.kraken.state !== "dormant");
      if (!krakenActive && this.oceanPeaceCd <= 0 && mg.dormantCd <= 0 && megTgt && Math.random() < dt * 0.015) {
        const a = Math.random() * Math.PI * 2;
        mg.gx = megTgt.x + Math.cos(a) * 145;
        mg.gz = megTgt.z + Math.sin(a) * 145;
        mg.orbitAng = a; mg.state = "stalking"; mg.stageTimer = 9.5; mg.hp = 110; mg.depthOff = -2.2; mg.forced = false;
        mg.huntTimeLeft = 60 + Math.random() * 45; // 1–1.75 min max hunt window before losing interest
        mg.lungesLeft = 2; // Gets bored & leaves after 2 lunge attempts!
        this._emitDreadAudio(audio, 0.72, "megalodon");
      }
    } else if (mg.state === "stalking") {
      if (mg.huntTimeLeft !== undefined) mg.huntTimeLeft -= dt;
      if (!megTgt || Math.hypot(megTgt.x - mg.gx, megTgt.z - mg.gz) > 480) {
        mg.state = "dormant"; mg.dormantCd = 360.0 + Math.random() * 150.0; this.oceanPeaceCd = 360.0 + Math.random() * 120.0; mg.forced = false;
      } else if ((mg.huntTimeLeft !== undefined && mg.huntTimeLeft <= 0) || (mg.lungesLeft !== undefined && mg.lungesLeft <= 0)) {
        mg.state = "retreating"; mg.fleeTimer = 11.0; mg.forced = false;

      } else {
        mg.stageTimer -= dt;
        mg.orbitAng += dt * 0.56;
        const rad = Math.max(44, 92 - (9.5 - Math.max(0, mg.stageTimer)) * 5.0);
        const tx = megTgt.x + Math.cos(mg.orbitAng) * rad;
        const tz = megTgt.z + Math.sin(mg.orbitAng) * rad;
        mg.yaw = Math.atan2(tx - mg.gx, tz - mg.gz);
        mg.gx += Math.sin(mg.yaw) * 26.5 * dt;
        mg.gz += Math.cos(mg.yaw) * 26.5 * dt;
        mg.depthOff += (-1.85 - mg.depthOff) * Math.min(1, dt * 3.5);
        if (mg.stageTimer <= 0) {
          // STAGE 2: SUBMERGING — drops beneath dark waves for 3–5 seconds of pure dread!
          mg.state = "submerging";
          mg.submergeDur = 3.2 + Math.random() * 1.8;
          mg.stageTimer = mg.submergeDur;
          this._emitDreadAudio(audio, 0.78, "megalodon");

        }
      }
    } else if (mg.state === "submerging") {
      if (mg.huntTimeLeft !== undefined) mg.huntTimeLeft -= dt;
      if (!megTgt || Math.hypot(megTgt.x - mg.gx, megTgt.z - mg.gz) > 480) {
        mg.state = "dormant"; mg.dormantCd = 360.0 + Math.random() * 150.0; this.oceanPeaceCd = 360.0 + Math.random() * 120.0; mg.forced = false;
      } else {
        mg.stageTimer -= dt;
        // Silently closes distance underwater from a flank angle!
        mg.orbitAng += dt * 0.42;
        const closeRad = Math.max(36, 62 * (mg.stageTimer / Math.max(1, mg.submergeDur)));
        const tx = megTgt.x + Math.cos(mg.orbitAng) * closeRad;
        const tz = megTgt.z + Math.sin(mg.orbitAng) * closeRad;
        mg.yaw = Math.atan2(tx - mg.gx, tz - mg.gz);
        mg.gx += Math.sin(mg.yaw) * 24.0 * dt;
        mg.gz += Math.cos(mg.yaw) * 24.0 * dt;
        mg.depthOff += (-15.5 - mg.depthOff) * Math.min(1, dt * 2.8);
        if (mg.stageTimer <= 0) {
          // STAGE 3: BREACH / LUNGE — explodes upward & forward toward target!
          mg.state = "breach_lunge";
          mg.stageTimer = 6.2;
          mg.lungeArcT = 0;
          if (mg.lungesLeft !== undefined) mg.lungesLeft = Math.max(0, mg.lungesLeft - 1);
          this._spawnWaterSpout(mg.gx, mg.gz, 28, 6.2);
          this._emitDreadAudio(audio, 0.96, "megalodon");

        }
      }
    } else if (mg.state === "breach_lunge") {
      if (mg.huntTimeLeft !== undefined) mg.huntTimeLeft -= dt;
      if (!megTgt || Math.hypot(megTgt.x - mg.gx, megTgt.z - mg.gz) > 440) {
        mg.state = "retreating"; mg.fleeTimer = 10; mg.forced = false;
      } else {
        mg.stageTimer -= dt;
        mg.lungeArcT += dt;
        // Lead target slightly; flank speed > 96 km/h lets fast boats outrun/juke!
        const leadT = Math.min(0.9, Math.hypot(megTgt.x - mg.gx, megTgt.z - mg.gz) / 48);
        const aimX = megTgt.x + (megTgt.vx || 0) * leadT * 0.55;
        const aimZ = megTgt.z + (megTgt.vz || 0) * leadT * 0.55;
        const ang = Math.atan2(aimX - mg.gx, aimZ - mg.gz);
        mg.yaw = ang;
        mg.gx += Math.sin(ang) * 35.5 * dt;
        mg.gz += Math.cos(ang) * 35.5 * dt;
        // Dramatic upward breach arc in the first 1.6s, then surface skimming jaw-charge!
        const breachTarget = mg.lungeArcT < 1.5
          ? (Math.sin((mg.lungeArcT / 1.5) * Math.PI) * 5.8 - 0.5)
          : -0.15;
        mg.depthOff += (breachTarget - mg.depthOff) * Math.min(1, dt * 6.5);

        if ((!mg.forced && !this._isOpenOcean(mg.gx, mg.gz, 160)) || mg.stageTimer <= 0) {
          if ((mg.lungesLeft !== undefined && mg.lungesLeft <= 0) || (mg.huntTimeLeft !== undefined && mg.huntTimeLeft <= 0)) {
            mg.state = "retreating"; mg.fleeTimer = 11.0; mg.forced = false;

          } else {
            mg.state = "stalking"; mg.stageTimer = 8.0;
          }
        }
      }
    } else if (mg.state === "retreating") {
      mg.fleeTimer -= dt;
      mg.gx += Math.sin(mg.yaw) * 29.0 * dt;
      mg.gz += Math.cos(mg.yaw) * 29.0 * dt;
      mg.depthOff -= dt * 3.4;
      if (mg.fleeTimer <= 0) { mg.state = "dormant"; mg.dormantCd = 420.0 + Math.random() * 120.0; this.oceanPeaceCd = 360.0 + Math.random() * 120.0; mg.depthOff = -2.2; mg.forced = false; }
    }

    // ========================================================================
    // 3. THE BLOOP — 120m+ ABYSSAL KRAKEN (Omen -> Maelstrom -> Tentacle Slams!)
    // ========================================================================
    const kr = this.kraken;
    if (kr.dormantCd > 0) kr.dormantCd -= dt;
    if (kr.omenPulseCd > 0) kr.omenPulseCd -= dt;

    const findKrakenTarget = () => {
      if (kr.forced) return players[0] || null;
      return players.find((p) => p.inWater && (p.z < -6000 || this._isOpenOcean(p.x, p.z, 540)) && this._isOpenOcean(p.x, p.z, 380));
    };
    const krTgt = findKrakenTarget();

    // Road flare decoy check!
    if ((kr.state === "tentacle_ring" || kr.state === "breach_slam") && hazards && hazards.flares) {
      for (const fl of hazards.flares) {
        if (Math.hypot(fl.gx - kr.gx, fl.gz - kr.gz) < 105) {
          kr.state = "flee"; kr.fleeTimer = 12.0; kr.forced = false;

          break;
        }
      }
    }

    if (kr.state === "dormant") {
      // Mutual exclusion: The Bloop NEVER spawns while El Gran Maja (Megalodon) is active!
      const megActive = (this.megalodon && this.megalodon.state !== "dormant");
      if (!megActive && this.oceanPeaceCd <= 0 && kr.dormantCd <= 0 && krTgt && Math.random() < dt * 0.014) {
        kr.gx = krTgt.x + (krTgt.vx || 0) * 2.8;
        kr.gz = krTgt.z + (krTgt.vz || 0) * 2.8;
        kr.state = "sonar_omen"; kr.stageTimer = 5.5; kr.hp = 165; kr.headSubmerge = -42; kr.forced = false; kr.omenPulseCd = 0.6;
        kr.encounterTimer = 80 + Math.random() * 55; // 1.3–2.25 min max encounter before retreating!
        kr.slamsLeft = 4;
        if (audio && audio.playBloopSonar) audio.playBloopSonar();
        this._emitDreadAudio(audio, 0.92, "bloop");
      }
    } else if (kr.state === "sonar_omen") {
      kr.stageTimer -= dt;
      if (krTgt) {
        kr.gx += (krTgt.x - kr.gx) * Math.min(1, dt * 1.15);
        kr.gz += (krTgt.z - kr.gz) * Math.min(1, dt * 1.15);
      }
      if (kr.stageTimer <= 0) {
        kr.state = "tentacle_ring"; kr.stageTimer = 15.0; kr.slamCd = 2.4;
        this._spawnWaterSpout(kr.gx, kr.gz, 42, 12.0);
        this._emitDreadAudio(audio, 0.98, "bloop");

      }
    } else if (kr.state === "tentacle_ring" || kr.state === "breach_slam") {
      if (kr.encounterTimer !== undefined) kr.encounterTimer -= dt;
      if (!krTgt || Math.hypot(krTgt.x - kr.gx, krTgt.z - kr.gz) > 420) {
        kr.state = "flee"; kr.fleeTimer = 10.0; kr.forced = false;
      } else if ((kr.encounterTimer !== undefined && kr.encounterTimer <= 0) || (kr.slamsLeft !== undefined && kr.slamsLeft <= 0)) {
        kr.state = "flee"; kr.fleeTimer = 12.0; kr.forced = false;

      } else {
        kr.stageTimer -= dt;
        const targetHead = (kr.state === "breach_slam") ? -1.5 : -22.0;
        kr.headSubmerge += (targetHead - kr.headSubmerge) * Math.min(1, dt * 1.65);
        kr.slamCd -= dt;
        if (kr.slamCd <= 0) {
          kr.slamCd = kr.state === "breach_slam" ? 2.8 : 3.6;
          if (kr.slamsLeft !== undefined) kr.slamsLeft = Math.max(0, kr.slamsLeft - 1);
          // Pick tentacle closest to player to telegraph & slam!
          let bestI = 0, bestD = 99999;
          for (let i = 0; i < kr.tentacles.length; i++) {
            const t = kr.tentacles[i];
            if (t.slamming) continue;
            const d = Math.hypot((kr.gx + Math.cos(t.ang) * (t.rad * 1.75)) - krTgt.x, (kr.gz + Math.sin(t.ang) * (t.rad * 1.75)) - krTgt.z);
            if (d < bestD) { bestD = d; bestI = i; }
          }
          kr.activeSlamIdx = bestI;
          kr.tentacles[bestI].slamming = true;
          kr.tentacles[bestI].slamPhase = 0;
        }
        if (kr.state === "tentacle_ring" && kr.stageTimer <= 0) {
          kr.state = "breach_slam"; kr.stageTimer = 18.0;
          if (audio && audio.playBloopSonar) audio.playBloopSonar();
          this._emitDreadAudio(audio, 0.96, "bloop");
        } else if (kr.state === "breach_slam" && kr.stageTimer <= 0) {
          kr.state = "flee"; kr.fleeTimer = 12.0; kr.forced = false;

        }
      }
    } else if (kr.state === "flee") {
      kr.fleeTimer -= dt;
      kr.headSubmerge -= dt * 4.5;
      if (kr.fleeTimer <= 0) { kr.state = "dormant"; kr.dormantCd = 420.0 + Math.random() * 120.0; this.oceanPeaceCd = 360.0 + Math.random() * 120.0; kr.forced = false; }
    }
  }

  _updateVisualsAndCollisions(dt, localP, boats, vehicle, particles, audio, ui, seaL) {
    const ab = boats ? boats.activeBoat : null;

    // ========================================================================
    // 1. YAMATO VISUALS, SEARCHLIGHT, TRACKING TURRETS, WAKE & COLLISION
    // ========================================================================
    const ym = this.yamato;
    ym.mesh.visible = (ym.state !== "dormant");
    if (ym.mesh.visible) {
      ym.phase += dt;
      ym.gy = seaL - ym.sinkOffset + Math.sin(ym.phase * 0.7) * 0.48;
      this.world.toLocal(ym.gx, ym.gy, ym.gz, ym.mesh.position);
      ym.mesh.rotation.y = ym.yaw;
      ym.shipRoot.rotation.z = 0.095 + Math.sin(ym.phase * 0.55) * 0.024;

      // Swirling spectral fog shroud & pulsing portholes
      ym.mistRings[0].rotation.z = ym.phase * 0.18;
      ym.mistRings[1].rotation.z = -ym.phase * 0.12;
      ym.mistRings[2].rotation.y = ym.phase * 0.15;
      const pulse = 0.55 + 0.45 * Math.sin(ym.phase * (ym.state === "retaliating" ? 7.5 : 2.2));
      if (ym.state === "retaliating") {
        ym.matPortGlow.color.setRGB(1.0, 0.14 + pulse * 0.22, 0.08);
        ym.matBeam.color.setRGB(1.0, 0.22, 0.12);
        ym.matBeam.opacity = 0.20 + pulse * 0.12;
      } else {
        ym.matPortGlow.color.setRGB(0.24 + pulse * 0.18, 0.72 + pulse * 0.22, 0.95);
        ym.matBeam.color.setRGB(0.45, 0.88, 1.0);
        ym.matBeam.opacity = 0.12 + pulse * 0.07;
      }
      ym.matWake.opacity = ym.state === "departing" ? Math.max(0, 0.35 - ym.sinkOffset * 0.01) : (0.34 + 0.12 * Math.sin(ym.phase * 3.1));

      if (ym.flashTimer > 0) {
        ym.flashTimer -= dt;
        if (ym.flashTimer <= 0) {
          for (const t of ym.mainTurrets) for (const fl of t.flashes) fl.visible = false;
        }
      }

      const dYm = Math.hypot(localP.x - ym.gx, localP.z - ym.gz);

      // Eerie bridge searchlight sweeps dark water, then locks onto player when close or retaliating!
      const localAngleToPlayer = Math.atan2(localP.x - ym.gx, localP.z - ym.gz) - ym.yaw;
      const desiredBeamYaw = (ym.state === "retaliating" || dYm < 380)
        ? localAngleToPlayer
        : Math.sin(ym.phase * 0.42) * 1.35;
      let dBeam = desiredBeamYaw - ym.searchlightYaw;
      while (dBeam > Math.PI) dBeam -= Math.PI * 2;
      while (dBeam < -Math.PI) dBeam += Math.PI * 2;
      ym.searchlightYaw += dBeam * Math.min(1, dt * (ym.state === "retaliating" ? 2.4 : 1.1));
      ym.searchlightPivot.rotation.y = ym.searchlightYaw;

      // Creepy 460mm turrets slowly track the player even while drifting (< 450m)!
      const trackPlayer = (ym.state === "retaliating") || (ym.state === "drifting" && dYm < 450);
      const trackWorldYaw = (ym.state === "retaliating")
        ? Math.atan2(ym.targetX - ym.gx, ym.targetZ - ym.gz)
        : Math.atan2(localP.x - ym.gx, localP.z - ym.gz);
      for (const t of ym.mainTurrets) {
        const tgtYaw = trackPlayer ? (trackWorldYaw - ym.yaw) : t.baseYaw;
        let dy = tgtYaw - t.curYaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        const step = (ym.state === "retaliating" ? 0.42 : 0.16) * dt;
        t.curYaw += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;
        t.pivot.rotation.y = t.curYaw;
        const tgtP = (ym.state === "retaliating") ? -0.26 : (trackPlayer ? -0.11 : -0.05);
        t.curPitch += (tgtP - t.curPitch) * Math.min(1, dt * 1.4);
        t.gunPitch.rotation.x = t.curPitch;
      }

      // Bow-wake spray particles
      if (particles && dYm < 480 && ym.state !== "departing" && Math.random() < 0.55) {
        const bx = ym.gx + Math.sin(ym.yaw) * 195;
        const bz = ym.gz + Math.cos(ym.yaw) * 195;
        particles.emitWaterSplash(bx + (Math.random() - 0.5) * 16, seaL + 0.5, bz + (Math.random() - 0.5) * 16, 2.0);
      }

      // Heavy hull-wake turbulence rocking nearby boats (< 180m)
      if (ab && dYm < 180 && ym.state !== "departing") {
        const wakeInt = (1.0 - dYm / 180);
        this._applyBoatShock(
          boats, ab,
          Math.sin(ym.phase * 2.1) * wakeInt * 2.6 * dt,
          Math.cos(ym.phase * 1.9) * wakeInt * 2.6 * dt,
          Math.sin(ym.phase * 3.2) * wakeInt * 0.24 * dt,
          Math.cos(ym.phase * 2.6) * wakeInt * 0.14 * dt
        );
      }

      // Mournful distant steel foghorn lament while drifting nearby
      ym.hornCd -= dt;
      if (dYm < 720 && ym.hornCd <= 0 && ym.state === "drifting") {
        ym.hornCd = 16.0 + Math.random() * 8.0;
        if (audio && audio.playYamatoLament) audio.playYamatoLament();
        this._emitDreadAudio(audio, Math.max(0.35, 1 - dYm / 720), "yamato");
      }

      // SOLID COLD-STEEL HULL BOUNCE (Aggressive ramming provokes retaliation!)
      if (ab && ym.state !== "departing" && dYm < 260) {
        const dx = ab.gx - ym.gx, dz = ab.gz - ym.gz;
        const c = Math.cos(-ym.yaw), s = Math.sin(-ym.yaw);
        const lx = dx * c + dz * s, lz = -dx * s + dz * c;
        const hx = 32.5 + (ab.spec.width || 6) * 0.5;
        const hz = 205.0 + (ab.spec.len || 12) * 0.5;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
          const pushX = (lx >= 0 ? 1 : -1);
          const nx = pushX * Math.cos(ym.yaw), nz = -pushX * Math.sin(ym.yaw);
          const pen = hx - Math.abs(lx) + 0.6;
          ab.gx += nx * pen; ab.gz += nz * pen;
          this._applyBoatShock(boats, ab, nx * 10.5 - ab.vx * 0.6, nz * 10.5 - ab.vz * 0.6, pushX * 0.30, 0.10);
          if (audio) audio.playImpact(0.85);
          this.cameraShakeOut = Math.max(this.cameraShakeOut, 0.65);
          if (ym.state === "drifting") {
            ym.provokeTimer += 2.6;
            if (ym.provokeTimer >= 5.5) {
              this._provokeYamato(
                ab.gx, ab.gz, "__local__", audio, ui,
                "⚠ RAMMING THE PHANTOM YAMATO AWAKENED ITS WRATH!! 460mm BROADSIDE INCOMING!!"
              );
            } else if (ui) {

            }
          }
        }
      }
    }

    // ========================================================================
    // 2. FLYING 460mm YAMATO SHELLS -> 52m WATER SPOUTS, SHOCKWAVE & DAMAGE!
    // ========================================================================
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      sh.life -= dt;
      sh.vy -= sh.g * dt;
      sh.gx += sh.vx * dt; sh.gy += sh.vy * dt; sh.gz += sh.vz * dt;
      this.world.toLocal(sh.gx, sh.gy, sh.gz, sh.mesh.position);
      if (particles && Math.random() < 0.7) {
        particles.emitRGB(sh.gx, sh.gy, sh.gz, (Math.random() - 0.5) * 2, 1.0, (Math.random() - 0.5) * 2, 1.0, 0.58, 0.14, 0.55, 0.2, 2.4);
      }
      if (sh.gy <= seaL + 0.4 || sh.life <= 0) {
        this._spawnWaterSpout(sh.gx, sh.gz, 52, 9.5);
        const dImp = Math.hypot(localP.x - sh.gx, localP.z - sh.gz);
        if (dImp < 520) {
          if (audio) audio.playImpact(Math.min(1.0, 1.2 - dImp / 520));
          this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dImp / 360) * 1.35);
        }
        if (dImp < 52) {
          const pushAng = Math.atan2(localP.x - sh.gx, localP.z - sh.gz);
          const norm = 1.0 - dImp / 52;
          const f = norm * 32.0;
          if (ab) {
            this._applyBoatShock(
              boats, ab,
              Math.sin(pushAng) * f,
              Math.cos(pushAng) * f,
              (Math.random() > 0.5 ? 1 : -1) * (0.28 + norm * 0.42),
              (0.14 + norm * 0.22)
            );
          }
          if (dImp < 42) {
            this._applyHullOrVehicleDamage(
              vehicle, boats, ab,
              14 + norm * 24,
              Math.sin(pushAng) * f * 0.7, 6.5 * norm, Math.cos(pushAng) * f * 0.7,
              (Math.random() - 0.5) * 3.2
            );

          }
        }
        this.scene.remove(sh.mesh);
        this.shells.splice(i, 1);
      }
    }

    // ========================================================================
    // 3. EL GRAN MAJA — VISUALS, GLOWING EYES, SNAPPING JAWS & BREACH IMPACT!
    // ========================================================================
    const mg = this.megalodon;
    mg.mesh.visible = (mg.state !== "dormant");
    if (mg.mesh.visible) {
      const isBreach = (mg.state === "breach_lunge");
      const isSub = (mg.state === "submerging");
      mg.phase += dt * (isBreach ? 11.0 : (isSub ? 3.5 : 5.2));
      mg.gy = seaL + mg.depthOff;
      this.world.toLocal(mg.gx, mg.gy, mg.gz, mg.mesh.position);

      const pitchAng = isBreach
        ? (mg.lungeArcT < 0.75 ? -0.34 : -0.10)
        : (isSub ? 0.36 : (mg.state === "retreating" ? 0.28 : 0));
      mg.mesh.rotation.set(pitchAng, mg.yaw, Math.sin(mg.phase) * 0.08, "YXZ");
      mg.tail1.rotation.y  = Math.sin(mg.phase) * 0.36;
      mg.tail2.rotation.y  = Math.sin(mg.phase - 0.8) * 0.44;
      mg.caudal.rotation.y = Math.sin(mg.phase - 1.5) * 0.52;

      // Glowing abyssal eyes flare menacingly during breach/lunge!
      if (isBreach) {
        const snap = 0.52 + Math.abs(Math.sin(mg.phase * 1.4)) * 0.34;
        mg.jawPivot.rotation.x += (snap - mg.jawPivot.rotation.x) * Math.min(1, dt * 10);
        mg.matEye.color.setHex(0xff3d14);
      } else {
        mg.jawPivot.rotation.x += (0.09 - mg.jawPivot.rotation.x) * Math.min(1, dt * 6);
        mg.matEye.color.setHex(0x883018);
      }

      // Surface wake visible when near surface (stalking & breaching), hidden when submerged deep
      mg.wakeMesh.visible = mg.depthOff > -5.5;
      mg.matWake.opacity = isBreach ? 0.62 : 0.38;

      if (particles) {
        if (isSub && Math.random() < 0.38) {
          // Ominous bubbling wake trail above the submerged shark!
          particles.emitWaterSplash(mg.gx + (Math.random() - 0.5) * 10, seaL + 0.25, mg.gz + (Math.random() - 0.5) * 10, 0.8);
        } else if (!isSub && Math.random() < 0.72) {
          particles.emitWaterSplash(mg.gx, seaL + 0.35, mg.gz, isBreach ? 2.8 : 1.25);
        }
      }

      if (isBreach && mg.hitCd <= 0) {
        const dMg = Math.hypot(localP.x - mg.gx, localP.z - mg.gz);
        const hitRad = ab ? (ab.spec.len * 0.44 + 17.5) : 19.5;
        if (dMg < hitRad) {
          // Allow agile flank-speed evasion if boat is screaming past > 105 km/h at an angle!
          mg.hitCd = 5.2;
          const rAng = Math.atan2(localP.x - mg.gx, localP.z - mg.gz);
          const force = ab ? (ab.spec.amphibious ? 16.0 : 28.0) : 22.0;
          if (ab) {
            this._applyBoatShock(
              boats, ab,
              Math.sin(rAng) * force, Math.cos(rAng) * force,
              (Math.random() > 0.5 ? 1 : -1) * 0.44, -0.22
            );
          }
          this._applyHullOrVehicleDamage(
            vehicle, boats, ab,
            22,
            Math.sin(rAng) * 18, 7.5, Math.cos(rAng) * 18,
            (Math.random() - 0.5) * 4.0
          );
          this._spawnWaterSpout(mg.gx, mg.gz, 28, 6.2);
          if (audio) audio.playImpact(1.0);
          this._emitDreadAudio(audio, 1.0, "megalodon");
          this.cameraShakeOut = Math.max(this.cameraShakeOut, 1.15);

          mg.state = "stalking"; mg.stageTimer = 8.5;
        }
      }
    }

    // ========================================================================
    // 4. THE BLOOP — SUBSURFACE OMEN, MAELSTROM WHIRLPOOL & TELEGRAPHED SLAMS!
    // ========================================================================
    const kr = this.kraken;
    kr.mesh.visible = (kr.state !== "dormant");
    if (kr.mesh.visible) {
      kr.phase += dt * 2.0;
      kr.gy = seaL;
      this.world.toLocal(kr.gx, kr.gy, kr.gz, kr.mesh.position);
      kr.headGrp.position.y = kr.headSubmerge;
      kr.headGrp.rotation.y = Math.atan2(localP.x - kr.gx, localP.z - kr.gz);

      const bioPulse = 0.5 + 0.5 * Math.sin(kr.phase * 2.8);
      kr.matBio.color.setRGB(0.08 + bioPulse * 0.34, 0.68 + bioPulse * 0.32, 1.0);

      const isOmen = (kr.state === "sonar_omen");
      const isCombat = (kr.state === "tentacle_ring" || kr.state === "breach_slam");
      const dKr = Math.hypot(localP.x - kr.gx, localP.z - kr.gz);

      // Subsurface bioluminescent cyan-violet omen glow + bubble ring + rhythmic camera shake!
      const omenTargetOp = isOmen ? (0.28 + bioPulse * 0.34) : (isCombat ? (0.14 + bioPulse * 0.14) : 0);
      kr.matOmenGlow.opacity += (omenTargetOp - kr.matOmenGlow.opacity) * Math.min(1, dt * 3.5);
      kr.matOmenRing.opacity += ((isOmen ? 0.36 + bioPulse * 0.32 : 0.12) * (kr.state === "flee" ? 0 : 1) - kr.matOmenRing.opacity) * Math.min(1, dt * 3.5);
      kr.omenRing.rotation.z = kr.phase * 0.65;
      const omenSc = 0.92 + bioPulse * 0.18;
      kr.omenDisc.scale.set(omenSc, omenSc, 1);

      if (isOmen) {
        // Rhythmic thalassophobic tremor pulses & rising bubble foam ring!
        const tremorWave = Math.max(0, Math.sin(kr.phase * 2.6) - 0.45) * 1.8;
        if (dKr < 260) {
          this.cameraShakeOut = Math.max(this.cameraShakeOut, tremorWave * Math.max(0, 1 - dKr / 260) * 0.55);
        }
        if (particles && Math.random() < 0.78) {
          const ba = Math.random() * Math.PI * 2;
          const br = 24 + Math.random() * 68;
          particles.emitWaterSplash(kr.gx + Math.cos(ba) * br, seaL + 0.4, kr.gz + Math.sin(ba) * br, 1.35);
        }
      }

      // Maelstrom Whirlpool visual rings + active inward suction & vortex swirl on boats/vehicles!
      const vortexStrength = isCombat ? 1.0 : (isOmen ? 0.42 : 0.0);
      for (let v = 0; v < kr.vortexRings.length; v++) {
        const vr = kr.vortexRings[v];
        vr.mesh.rotation.z = kr.phase * vr.spd;
        vr.mat.opacity += (vr.maxOp * vortexStrength - vr.mat.opacity) * Math.min(1, dt * 2.5);
      }

      if (vortexStrength > 0.25 && dKr < 165 && dKr > 8) {
        const pullT = Math.pow(1.0 - dKr / 165, 1.15) * vortexStrength;
        const inX = (kr.gx - localP.x) / dKr;
        const inZ = (kr.gz - localP.z) / dKr;
        const swX = -inZ, swZ = inX;
        if (ab) {
          const mDamp = ab.spec.len > 36 ? 0.55 : 0.92;
          const vPull = pullT * 9.5 * mDamp;
          this._applyBoatShock(
            boats, ab,
            (inX * 0.72 + swX * 0.68) * vPull * dt,
            (inZ * 0.72 + swZ * 0.68) * vPull * dt,
            Math.sin(kr.phase * 2.3) * pullT * 0.16 * dt,
            0
          );
        } else if (vehicle && localP.inWater) {
          const vPull = pullT * 11.0;
          vehicle.vel.x += (inX * 0.75 + swX * 0.65) * vPull * dt;
          vehicle.vel.z += (inZ * 0.75 + swZ * 0.65) * vPull * dt;
        }
      }

      // 8 Articulated 42m Tentacles with Telegraphed Rear -> Pause -> Slam!
      const showTentacles = (isCombat || kr.state === "flee");
      let activeWarnSet = false;
      for (let i = 0; i < kr.tentacles.length; i++) {
        const t = kr.tentacles[i];
        t.root.visible = showTentacles;
        const targetY = (kr.state === "flee") ? -44 : -5;
        t.root.position.y += (targetY - t.root.position.y) * Math.min(1, dt * 1.8);

        let slamBend = 0;
        if (t.slamming) {
          t.slamPhase += dt * 1.05; // ~0.95s full telegraph + slam so player can clearly read & dodge!
          const impactLocalX = Math.cos(t.ang) * (t.rad - 18);
          const impactLocalZ = Math.sin(t.ang) * (t.rad - 18);

          if (t.slamPhase < 0.44) {
            // REAR HIGH ABOVE THE WATER!
            const u = t.slamPhase / 0.44;
            slamBend = -0.48 * u;
            activeWarnSet = true;
            kr.slamWarnRing.visible = true;
            kr.slamWarnRing.position.set(impactLocalX, 0.72, impactLocalZ);
            kr.slamWarnRing.scale.setScalar(0.65 + u * 0.45);
            kr.matSlamWarn.opacity = 0.25 + u * 0.45;
          } else if (t.slamPhase < 0.64) {
            // BRIEF DRAMATIC PAUSE AT PEAK (Readable telegraph window!)
            slamBend = -0.48 + Math.sin(t.slamPhase * 35) * 0.03;
            activeWarnSet = true;
            kr.slamWarnRing.visible = true;
            kr.slamWarnRing.position.set(impactLocalX, 0.72, impactLocalZ);
            kr.slamWarnRing.scale.setScalar(1.05 + 0.12 * Math.sin(t.slamPhase * 30));
            kr.matSlamWarn.opacity = 0.78;
          } else if (t.slamPhase < 1.0) {
            // VIOLENT DOWNWARD SLAM!
            const u = (t.slamPhase - 0.64) / 0.36;
            slamBend = -0.48 + 1.72 * (u * u);
            activeWarnSet = true;
            kr.slamWarnRing.visible = true;
            kr.slamWarnRing.position.set(impactLocalX, 0.72, impactLocalZ);
            kr.matSlamWarn.opacity = 0.9 * (1 - u);
          } else {
            t.slamming = false;
            const sx = kr.gx + impactLocalX * 1.75;
            const sz = kr.gz + impactLocalZ * 1.75;
            this._spawnWaterSpout(sx, sz, 40, 8.2);
            const dSlam = Math.hypot(localP.x - sx, localP.z - sz);
            if (dSlam < 360) {
              if (audio) audio.playImpact(Math.min(1.0, 1.15 - dSlam / 360));
              this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dSlam / 250) * 1.18);
            }
            if (dSlam < 38) {
              const pA = Math.atan2(localP.x - sx, localP.z - sz);
              const norm = 1.0 - dSlam / 38;
              if (ab) {
                this._applyBoatShock(
                  boats, ab,
                  Math.sin(pA) * (16 + norm * 14),
                  Math.cos(pA) * (16 + norm * 14),
                  (Math.random() > 0.5 ? 1 : -1) * (0.34 + norm * 0.28),
                  0.18
                );
              }
              this._applyHullOrVehicleDamage(
                vehicle, boats, ab,
                18 + norm * 16,
                Math.sin(pA) * 16, 7.0, Math.cos(pA) * 16,
                (Math.random() - 0.5) * 3.6
              );

            }
          }
        }
        for (let s = 0; s < t.segs.length; s++) {
          const sway = Math.sin(kr.phase + i * 0.9 + s * 0.55) * 0.18;
          t.segs[s].rotation.x = 0.08 + sway * 0.5 + slamBend * (0.28 + s * 0.15);
          t.segs[s].rotation.z = Math.cos(kr.phase * 0.8 + i + s * 0.4) * 0.14;
        }
      }
      if (!activeWarnSet) {
        kr.slamWarnRing.visible = false;
        kr.matSlamWarn.opacity = 0;
      }
    }

    // ========================================================================
    // 5. ANIMATE WATER SPOUTS
    // ========================================================================
    for (let i = this.spouts.length - 1; i >= 0; i--) {
      const sp = this.spouts[i];
      sp.age += dt;
      const u = sp.age / sp.maxAge;
      const grow = u < 0.25 ? (u / 0.25) : (1.0 - (u - 0.25) / 0.75);
      sp.mesh.scale.set(1.0 + u * 0.65, Math.max(0.05, grow), 1.0 + u * 0.65);
      sp.mat.opacity = Math.max(0, (1.0 - u) * 0.84);
      this.world.toLocal(sp.gx, sp.gy, sp.gz, sp.mesh.position);
      if (sp.age >= sp.maxAge) {
        this.scene.remove(sp.mesh);
        this.spouts.splice(i, 1);
      }
    }
  }

  // ==========================================================================
  // SHARED INTERFACE CONTRACT: Compute seaDreadLevel (0..1) & activeWarning!
  // ==========================================================================
  _updateDreadAndWarnings(dt, localP) {
    let targetDread = 0;
    let bestWarn = null;
    let bestRank = 0; // 1 = omen, 2 = danger, 3 = critical

    const considerWarn = (rank, warnObj) => {
      if (rank > bestRank) {
        bestRank = rank;
        bestWarn = warnObj;
      }
    };

    // 1. Possessed Yamato Dread & Warning
    const ym = this.yamato;
    if (ym.state !== "dormant") {
      const dYm = Math.hypot(localP.x - ym.gx, localP.z - ym.gz);
      if (ym.state === "retaliating" && dYm < 950) {
        targetDread = Math.max(targetDread, 0.94);
        considerWarn(3, {
          title: "PHANTOM YAMATO — 460mm SALVO INCOMING",
          detail: `${Math.round(dYm)}m • ${ym.salvosLeft} salvo${ym.salvosLeft === 1 ? "" : "s"} remaining • EVADE!`,
          severity: "critical", kind: "yamato"
        });
      } else if (ym.state === "drifting" && dYm < 460) {
        const prox = 1.0 - dYm / 460;
        targetDread = Math.max(targetDread, 0.22 + prox * 0.52);
        if (dYm < 130) {
          considerWarn(2, {
            title: "GHOST DREADNOUGHT — TURRETS LOCKING",
            detail: `${Math.round(dYm)}m • Pull away! Lingering provokes 460mm broadsides`,
            severity: "danger", kind: "yamato"
          });
        } else {
          considerWarn(1, {
            title: "RADAR CONTACT: PHANTOM YAMATO",
            detail: `${Math.round(dYm)}m • 263m battleship drifting in mist — DO NOT FIRE`,
            severity: "omen", kind: "yamato"
          });
        }
      }
    }

    // 2. El Gran Maja (Megalodon) Dread & Warning
    const mg = this.megalodon;
    if (mg.state !== "dormant" && mg.state !== "retreating") {
      const dMg = Math.hypot(localP.x - mg.gx, localP.z - mg.gz);
      if (dMg < 420) {
        const prox = 1.0 - dMg / 420;
        if (mg.state === "breach_lunge") {
          targetDread = Math.max(targetDread, 0.96);
          considerWarn(3, {
            title: "EL GRAN MAJA — BREACHING!!",
            detail: `${Math.round(dMg)}m • Flank speed, toss flare [G], or open fire!`,
            severity: "critical", kind: "megalodon"
          });
        } else if (mg.state === "submerging") {
          targetDread = Math.max(targetDread, 0.80);
          considerWarn(2, {
            title: "APEX PREDATOR SUBMERGED",
            detail: `Dorsal fin vanished beneath the waves — brace for lunge!`,
            severity: "danger", kind: "megalodon"
          });
        } else if (mg.state === "stalking") {
          targetDread = Math.max(targetDread, 0.35 + prox * 0.42);
          considerWarn(dMg < 110 ? 2 : 1, {
            title: "EL GRAN MAJA — STALKING WAKE",
            detail: `${Math.round(dMg)}m • 34m Megalodon circling your vessel`,
            severity: dMg < 110 ? "danger" : "omen", kind: "megalodon"
          });
        }
      }
    }

    // 3. The Bloop (Abyssal Kraken) Dread & Warning
    const kr = this.kraken;
    if (kr.state !== "dormant" && kr.state !== "flee") {
      const dKr = Math.hypot(localP.x - kr.gx, localP.z - kr.gz);
      if (dKr < 420) {
        if (kr.state === "sonar_omen") {
          targetDread = Math.max(targetDread, 0.72);
          considerWarn(1, {
            title: "DEEP SONAR ANOMALY — 'THE BLOOP'",
            detail: `${Math.round(dKr)}m • Bioluminescent mass rising from the abyss...`,
            severity: "omen", kind: "kraken"
          });
        } else {
          targetDread = Math.max(targetDread, 1.0);
          considerWarn(3, {
            title: "THE BLOOP — MAELSTROM & TENTACLE SLAMS",
            detail: `${Math.round(dKr)}m • Fight the whirlpool, dodge red rings, toss flare [G]!`,
            severity: "critical", kind: "kraken"
          });
        }
      }
    }

    // Smoothly interpolate seaDreadLevel (0..1)
    const rate = targetDread > this.seaDreadLevel ? 1.8 : 0.75;
    this.seaDreadLevel += (targetDread - this.seaDreadLevel) * Math.min(1, dt * rate);
    if (this.seaDreadLevel < 0.005) this.seaDreadLevel = 0;
    this.activeWarning = bestWarn;
  }
};
