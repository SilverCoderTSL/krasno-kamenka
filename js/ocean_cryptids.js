// ============================================================================
// js/ocean_cryptids.js (v15.3 ONLINE) — The 3 Ocean Cryptids!
//   1. Possessed Yamato-Class Battleship (263m × 38.9m): Passive tragic ghost
//      dreadnought. Ignores horns, lights & rams; if shot, unleashes 3 timed
//      9-gun 460mm broadside salvos then mournfully submerges into the mist.
//   2. El Gran Maja (34m Southern Megalodon): Articulated jaw, teeth, gill slits,
//      4.6m scarred dorsal fin & whipping tail. Patrols warm Southern Straits.
//   3. The Bloop (120m+ Northern Abyssal Kraken): Haunting sonar omen, 28m
//      bioluminescent domed head & 8 articulated 42m breaching tentacles!
// ============================================================================
window.KK = window.KK || {};

KK.OceanCryptidManager = class OceanCryptidManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.syncAccum = 0;
    this.shells = [];     // Flying 460mm Yamato broadside shells
    this.spouts = [];     // Towering 45m ocean water spouts
    this.cameraShakeOut = 0;
    this._flirMode = false;

    this.yamato    = this._createYamato();
    this.megalodon = this._createMegalodon();
    this.kraken    = this._createKraken();
  }

  // ==========================================================================
  // HELPER: Check if (gx, gz) is truly open deep ocean far from all islands
  // ==========================================================================
  _isOpenOcean(gx, gz, minMargin = 450) {
    if (!KK.ISLANDS) return false;
    for (let i = 0; i < KK.ISLANDS.length; i++) {
      const isl = KK.ISLANDS[i];
      const rx = isl.rx * 1.12 + minMargin;
      const rz = isl.rz * 1.12 + minMargin;
      const nx = (gx - isl.cx) / rx;
      const nz = (gz - isl.cz) / rz;
      if (nx * nx + nz * nz < 1.0) return false;
    }
    return true;
  }

  _collectSeaPlayers(vehicle, boats, remotePlayersMap) {
    const list = [];
    const ab = boats ? boats.activeBoat : null;
    const gx = ab ? ab.gx : vehicle.pos.x;
    const gz = ab ? ab.gz : vehicle.pos.z;
    const gy = ab ? ab.gy : vehicle.pos.y;
    const vx = ab ? ab.vx : vehicle.vel.x;
    const vz = ab ? ab.vz : vehicle.vel.z;
    const spdKmh = ab ? ab.speedKmh : vehicle.speedKmh;
    list.push({
      isLocal: true, peerId: "__local__",
      x: gx, y: gy, z: gz, vx, vz, speedKmh: spdKmh,
      inBoat: !!ab, boat: ab
    });
    if (remotePlayersMap) {
      for (const [pid, rp] of remotePlayersMap.entries()) {
        const rb = rp.boat;
        list.push({
          isLocal: false, peerId: pid,
          x: rb ? rb.x : rp.gx,
          y: rb ? rb.y : rp.gy,
          z: rb ? rb.z : rp.gz,
          vx: rb ? (rb.vx || 0) : (rp.vx || 0),
          vz: rb ? (rb.vz || 0) : (rp.vz || 0),
          speedKmh: rb ? (rb.spd || 0) : Math.hypot(rp.vx || 0, rp.vz || 0) * 3.6,
          inBoat: !!rb, boat: null
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
    const matHullGry = new THREE.MeshStandardMaterial({ color: 0x3f474e, roughness: 0.84, metalness: 0.42 });
    const matHullDrk = new THREE.MeshStandardMaterial({ color: 0x2a3036, roughness: 0.88, metalness: 0.46 });
    const matRust    = new THREE.MeshStandardMaterial({ color: 0x543426, roughness: 0.94, metalness: 0.30 });
    const matRedHull = new THREE.MeshStandardMaterial({ color: 0x562020, roughness: 0.86, metalness: 0.25 });
    const matTeak    = new THREE.MeshStandardMaterial({ color: 0x6b5842, roughness: 0.92, metalness: 0.08 });
    const matBarrel  = new THREE.MeshStandardMaterial({ color: 0x262c32, roughness: 0.50, metalness: 0.72 });
    const matPortGlow = new THREE.MeshBasicMaterial({ color: 0x72d8ff }); // Shifts to crimson-amber during retaliation!
    const matMist    = new THREE.MeshBasicMaterial({ color: 0x9ab8c8, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false });

    // A) Sculpted 263m × 38.9m Hull (Bulbous bow, flared forecastle, armored citadel, tapered stern)
    const midHull = new THREE.Mesh(new THREE.BoxGeometry(38.9, 13.5, 148), matHullGry);
    midHull.position.set(0, 3.2, -4); midHull.castShadow = true; midHull.receiveShadow = true; shipRoot.add(midHull);

    // Dark-crimson anti-fouling lower belt
    const lowerBelt = new THREE.Mesh(new THREE.BoxGeometry(39.2, 4.5, 152), matRedHull);
    lowerBelt.position.set(0, -1.8, -4); shipRoot.add(lowerBelt);

    // Tapered Forward Clipper Bow (z = +70 .. +131.5m) + Iconic Yamato Bulbous Bow!
    const bowMid = new THREE.Mesh(new THREE.BoxGeometry(27.0, 14.5, 42), matHullGry);
    bowMid.position.set(0, 4.0, 88); shipRoot.add(bowMid);
    const bowTip = new THREE.Mesh(new THREE.ConeGeometry(14.5, 44, 4), matHullGry);
    bowTip.rotation.x = Math.PI / 2; bowTip.rotation.z = Math.PI / 4;
    bowTip.scale.set(0.95, 0.56, 1.0);
    bowTip.position.set(0, 4.8, 120); shipRoot.add(bowTip);
    const bulbBow = new THREE.Mesh(new THREE.SphereGeometry(5.2, 12, 10), matRedHull);
    bulbBow.scale.set(0.75, 0.85, 2.2); bulbBow.position.set(0, -1.2, 128); shipRoot.add(bulbBow);
    // Golden Imperial Chrysanthemum seal on prow (faded rusted gold)
    const seal = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xa68532, metalness: 0.7, roughness: 0.4 }));
    seal.rotation.x = Math.PI / 2; seal.position.set(0, 9.2, 131.5); shipRoot.add(seal);

    // Tapered Stern (z = -78 .. -131.5m)
    const sternMid = new THREE.Mesh(new THREE.BoxGeometry(29.0, 12.2, 38), matHullGry);
    sternMid.position.set(0, 2.8, -94); shipRoot.add(sternMid);
    const sternTip = new THREE.Mesh(new THREE.ConeGeometry(15.2, 34, 4), matHullGry);
    sternTip.rotation.x = -Math.PI / 2; sternTip.rotation.z = Math.PI / 4;
    sternTip.scale.set(1.0, 0.50, 1.0);
    sternTip.position.set(0, 2.8, -120); shipRoot.add(sternTip);

    // Weathered Wooden Teak Main Deck + Battle-Scar Rust Patches along Armored Belt
    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(36.2, 0.4, 198), matTeak);
    mainDeck.position.set(0, 10.1, 2); mainDeck.receiveShadow = true; shipRoot.add(mainDeck);
    for (const sx of [-19.6, 19.6]) {
      for (let rs = 0; rs < 6; rs++) {
        const scar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.8 + (rs % 3) * 1.4, 14 + (rs % 2) * 8), matRust);
        scar.position.set(sx, 4.2 + (rs % 2) * 1.8, -62 + rs * 26); shipRoot.add(scar);
      }
    }

    // B) 3 COLOSSAL TRIPLE 460mm (18.1-INCH) MAIN TURRETS (Independently Rotating & Elevating!)
    const mainTurrets = [];
    const build460Turret = (ty, tz, baseYaw) => {
      const barbette = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 7.6, 4.2, 16), matHullDrk);
      barbette.position.set(0, ty - 2.0, tz); shipRoot.add(barbette);

      const piv = new THREE.Group();
      piv.position.set(0, ty, tz);
      piv.rotation.y = baseYaw;
      shipRoot.add(piv);

      // Sloped 650mm Armored Gunhouse
      const house = new THREE.Mesh(new THREE.BoxGeometry(14.2, 5.2, 16.5), matHullGry);
      house.position.set(0, 2.6, -1.2); house.castShadow = true; piv.add(house);
      const face = new THREE.Mesh(new THREE.BoxGeometry(13.6, 4.6, 3.2), matHullDrk);
      face.position.set(0, 2.3, 7.2); face.rotation.x = 0.42; piv.add(face);
      // Iconic Yamato 15-meter optical rangefinder ears!
      const rfBar = new THREE.Mesh(new THREE.BoxGeometry(18.5, 1.2, 1.6), matHullDrk);
      rfBar.position.set(0, 4.6, -3.5); piv.add(rfBar);

      const gunPitch = new THREE.Group();
      gunPitch.position.set(0, 2.5, 7.2);
      piv.add(gunPitch);

      const flashes = [];
      for (const bx of [-3.4, 0, 3.4]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.68, 21.5, 10), matBarrel);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(bx, 0, 10.6); bar.castShadow = true; gunPitch.add(bar);
        const fl = new THREE.Mesh(
          new THREE.ConeGeometry(3.2, 13.5, 8),
          new THREE.MeshBasicMaterial({ color: 0xffa826, transparent: true, opacity: 0.92 })
        );
        fl.rotation.x = Math.PI / 2; fl.position.set(bx, 0, 26.5); fl.visible = false;
        gunPitch.add(fl);
        flashes.push(fl);
      }
      mainTurrets.push({ pivot: piv, gunPitch, flashes, baseYaw, curYaw: baseYaw, curPitch: 0.08, tz, ty });
    };
    build460Turret(11.6,  66, 0);        // Turret A (Forward)
    build460Turret(15.2,  42, 0);        // Turret B (Superfiring Forward)
    build460Turret(12.0, -72, Math.PI);  // Turret X (Aft)

    // C) Secondary Triple 155mm Turrets (Superfiring Fore & Aft) + Twin 127mm AA Batteries
    for (const [sy, sz, sry] of [[18.0, 22, 0], [15.6, -50, Math.PI]]) {
      const sec = new THREE.Mesh(new THREE.BoxGeometry(7.2, 3.2, 8.8), matHullGry);
      sec.position.set(0, sy, sz); sec.rotation.y = sry; shipRoot.add(sec);
      for (const bx of [-1.6, 0, 1.6]) {
        const sb = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 10.5, 6), matBarrel);
        sb.rotation.x = Math.PI / 2;
        sb.position.set(bx, sy, sz + (sry === 0 ? 7.5 : -7.5)); shipRoot.add(sb);
      }
    }
    for (const sx of [-16.2, 16.2]) {
      for (const az of [14, -4, -22]) {
        const aa = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 4.8), matHullDrk);
        aa.position.set(sx, 12.8, az); shipRoot.add(aa);
      }
    }

    // D) ICONIC 44-METER TOWERING JAPANESE PAGODA MAST SUPERSTRUCTURE + RAKED FUNNEL!
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
      // Glowing ghostly bridge windows on tiers 1, 2, 3!
      if (ti >= 1 && ti <= 3) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(t.w + 0.35, 1.15, t.l * 0.75), matPortGlow);
        win.position.set(0, t.y + 0.8, t.z + 0.6); shipRoot.add(win);
      }
    }
    // Top 15m Director & Type-21 Radar Mattress Array
    const topRange = new THREE.Mesh(new THREE.BoxGeometry(16.0, 1.6, 2.0), matHullDrk);
    topRange.position.set(0, 45.4, 7.2); shipRoot.add(topRange);
    const radar = new THREE.Mesh(new THREE.BoxGeometry(7.4, 3.8, 0.5), matRust);
    radar.position.set(0, 48.2, 7.2); shipRoot.add(radar);

    // Iconic Single Swept-Back Massive Funnel + Aft Tripod Mast + Stern Catapult Crane!
    const funnel = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.4, 21.0, 12), matHullDrk);
    funnel.position.set(0, 24.5, -14.5); funnel.rotation.x = -0.34; funnel.castShadow = true; shipRoot.add(funnel);
    const funnelCap = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 2.2, 12), matRust);
    funnelCap.position.set(0, 34.4, -18.0); funnelCap.rotation.x = -0.34; shipRoot.add(funnelCap);
    const aftMast = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.95, 26.0, 8), matHullDrk);
    aftMast.position.set(0, 26.0, -32.0); aftMast.rotation.x = -0.14; shipRoot.add(aftMast);
    const crane = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 22.0), matRust);
    crane.position.set(0, 15.8, -108); crane.rotation.x = 0.42; shipRoot.add(crane);

    // E) Drifting Ghostly Sea-Mist Shroud Ring around the 263m Hull!
    const mistRing = new THREE.Mesh(new THREE.RingGeometry(48, 165, 28), matMist);
    mistRing.rotation.x = -Math.PI / 2; mistRing.position.y = 1.6;
    grp.add(mistRing);

    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, shipRoot, mainTurrets, matPortGlow, matHullGry, matMist,
      state: "dormant", // dormant | drifting | retaliating | departing
      gx: 45000, gy: -32, gz: 25000, yaw: 0.6,
      sinkOffset: 0,
      salvosLeft: 0, salvoTimer: 0, flashTimer: 0,
      targetX: 0, targetZ: 0, targetPeerId: null,
      driftTimer: 0, dormantCd: 45.0, hornCd: 8.0, phase: 0
    };
  }

  // ==========================================================================
  // 2. MUSEUM-GRADE EL GRAN MAJA — SOUTHERN MEGALODON (~34m ARTICULATED!)
  // ==========================================================================
  _createMegalodon() {
    const grp = new THREE.Group();
    const matBack  = new THREE.MeshStandardMaterial({ color: 0x3b4852, roughness: 0.46, metalness: 0.18 });
    const matBelly = new THREE.MeshStandardMaterial({ color: 0xbcc7cf, roughness: 0.56, metalness: 0.10 });
    const matScar  = new THREE.MeshStandardMaterial({ color: 0x6b7780, roughness: 0.72 });
    const matGums  = new THREE.MeshStandardMaterial({ color: 0x5c181e, roughness: 0.78 });
    const matTooth = new THREE.MeshStandardMaterial({ color: 0xf4f2ea, roughness: 0.30 });
    const matEye   = new THREE.MeshBasicMaterial({ color: 0x090b0d });

    // Torso & Head Core (16m forward half)
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.6, 12.5, 12), matBack);
    torso.rotation.x = Math.PI / 2; torso.scale.set(0.95, 1.0, 1.05); torso.castShadow = true; grp.add(torso);
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 3.2, 11.8, 10), matBelly);
    belly.rotation.x = Math.PI / 2; belly.position.y = -0.85; grp.add(belly);

    // Sculpted Pointed Snout + Black Eyes + 5 Gill Slits per side + Battle Scars
    const snout = new THREE.Mesh(new THREE.ConeGeometry(2.75, 8.2, 10), matBack);
    snout.rotation.x = Math.PI / 2; snout.scale.set(0.95, 1.0, 0.78);
    snout.position.set(0, 0.55, 10.0); snout.castShadow = true; grp.add(snout);

    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), matEye);
      eye.position.set(sx * 2.05, 0.72, 7.6); grp.add(eye);
      for (let g = 0; g < 5; g++) {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.95, 0.18), matGums);
        gill.position.set(sx * 3.15, -0.1, 3.8 - g * 0.65); grp.add(gill);
      }
      // Battle scars along flank
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

    // TOWERING 4.6-METER SCARRED DORSAL FIN (Slices dramatically above the ocean!)
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5.4, 4), matBack);
    dorsal.scale.set(0.24, 1.0, 1.35);
    dorsal.position.set(0, 4.4, 0.8); dorsal.rotation.x = -0.34; dorsal.castShadow = true; grp.add(dorsal);

    // Sweeping 8m Pectoral Fins
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

    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, jawPivot, tail1, tail2, caudal, matBack, matBelly,
      state: "dormant", // dormant | fin_stalk | lunge_ram | flee
      gx: 18000, gy: -35, gz: 52000, yaw: 0,
      orbitAng: 0, stageTimer: 0, fleeTimer: 0, dormantCd: 25.0,
      hp: 100, hitCd: 0, phase: 0, depthOff: -2.2
    };
  }

  // ==========================================================================
  // 3. MUSEUM-GRADE THE BLOOP — NORTHERN ABYSSAL KRAKEN (~120m+ RING!)
  // ==========================================================================
  _createKraken() {
    const grp = new THREE.Group();
    const matChitin = new THREE.MeshStandardMaterial({ color: 0x1a1e2e, roughness: 0.62, metalness: 0.34 });
    const matFlesh  = new THREE.MeshStandardMaterial({ color: 0x26283d, roughness: 0.74, metalness: 0.20 });
    const matSucker = new THREE.MeshStandardMaterial({ color: 0x628099, emissive: 0x14384f, emissiveIntensity: 0.55, roughness: 0.45 });
    const matBio    = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const matEye    = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const matBeak   = new THREE.MeshStandardMaterial({ color: 0x0e0c12, roughness: 0.35, metalness: 0.6 });

    // A) Colossal 28m Wide × 36m Tall Domed Abyssal Mantle & Head (Center of Ring!)
    const headGrp = new THREE.Group();
    grp.add(headGrp);

    const mantle = new THREE.Mesh(new THREE.SphereGeometry(14.5, 16, 12), matChitin);
    mantle.scale.set(1.0, 1.55, 1.05); mantle.position.y = 14.0; mantle.castShadow = true; headGrp.add(mantle);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(13.8, 16.0, 10), matFlesh);
    crown.position.y = 32.5; crown.castShadow = true; headGrp.add(crown);

    // Ridged armored chitin dorsal fins & bioluminescent pulsing veins!
    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      const vein = new THREE.Mesh(new THREE.BoxGeometry(0.65, 22.0, 0.65), matBio);
      vein.position.set(Math.sin(a) * 14.2, 16.5, Math.cos(a) * 14.2);
      headGrp.add(vein);
    }
    // Twin Massive 3.4m Glowing Abyssal Eyes + Armored Brow Crests!
    for (const sx of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.2, 4.2), matChitin);
      brow.position.set(sx * 8.2, 9.6, 11.4); brow.rotation.z = -sx * 0.25; headGrp.add(brow);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), matEye);
      eye.position.set(sx * 7.8, 7.2, 12.2); headGrp.add(eye);
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.75, 3.4, 0.8), matBeak);
      pupil.position.set(sx * 7.8, 7.2, 14.1); headGrp.add(pupil);
    }
    // Gaping Abyssal Beak Maw
    const beakU = new THREE.Mesh(new THREE.ConeGeometry(4.2, 7.5, 6), matBeak);
    beakU.rotation.x = Math.PI * 0.62; beakU.position.set(0, 1.5, 13.5); headGrp.add(beakU);

    // B) 8 ARTICULATED 42-METER BREACHING TENTACLES RINGING THE VESSEL (~110m DIAMETER!)
    const tentacles = [];
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const rad = 46 + (i % 2) * 11;
      const tRoot = new THREE.Group();
      tRoot.position.set(Math.cos(ang) * rad, -8, Math.sin(ang) * rad);
      tRoot.rotation.y = Math.atan2(-Math.cos(ang), -Math.sin(ang)); // Face inward toward ship!
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
        // Pale glowing bioluminescent suckers facing inward!
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

    grp.visible = false;
    this.scene.add(grp);
    return {
      mesh: grp, headGrp, tentacles, matChitin, matFlesh, matBio, matEye,
      state: "dormant", // dormant | sonar_omen | tentacle_ring | breach_slam | flee
      gx: -24000, gy: -32, gz: -54000, yaw: 0,
      stageTimer: 0, fleeTimer: 0, dormantCd: 30.0,
      hp: 160, slamCd: 3.5, activeSlamIdx: -1, headSubmerge: -42, phase: 0
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
    const matFoam = new THREE.MeshBasicMaterial({ color: 0xe6f8ff, transparent: true, opacity: 0.82, depthWrite: false });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(radM * 0.45, radM, heightM, 10), matFoam);
    col.position.y = heightM * 0.5; grp.add(col);
    const ring = new THREE.Mesh(new THREE.RingGeometry(radM * 0.6, radM * 2.2, 16), matFoam);
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.4; grp.add(ring);
    this.world.toLocal(gx, seaL, gz, grp.position);
    this.scene.add(grp);
    this.spouts.push({ gx, gz, gy: seaL, mesh: grp, mat: matFoam, age: 0, maxAge: 2.6, heightM });
  }

  _fireYamatoSalvo(audio, particles) {
    const ym = this.yamato;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    ym.flashTimer = 0.28;
    if (audio && audio.playYamatoSalvo) audio.playYamatoSalvo();

    for (const t of ym.mainTurrets) {
      for (const fl of t.flashes) fl.visible = true;
      // Compute world muzzle position of each triple turret
      const c = Math.cos(ym.yaw), s = Math.sin(ym.yaw);
      const sx = ym.gx + t.tz * s;
      const sz = ym.gz + t.tz * c;
      const sy = seaL + t.ty + 4.0;
      const spreadX = (Math.random() - 0.5) * 44;
      const spreadZ = (Math.random() - 0.5) * 44;
      const tx = ym.targetX + spreadX;
      const tz = ym.targetZ + spreadZ;
      const dist = Math.hypot(tx - sx, tz - sz);
      const flightT = Math.max(1.35, Math.min(3.2, dist / 210));
      const g = 28.0;
      const vx = (tx - sx) / flightT;
      const vz = (tz - sz) / flightT;
      const vy = (seaL - sy + 0.5 * g * flightT * flightT) / flightT;

      const shellMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.25, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffb703 })
      );
      this.world.toLocal(sx, sy, sz, shellMesh.position);
      this.scene.add(shellMesh);
      this.shells.push({ gx: sx, gy: sy, gz: sz, vx, vy, vz, g, mesh: shellMesh, life: flightT + 0.4 });

      if (particles) {
        particles.emitCrashBurst(sx, sy + 2, sz, 2.2, "rock", "clear");
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
      if (Math.abs(lx) < 26 && Math.abs(lz) < 138 && gy > ym.gy - 5 && gy < ym.gy + 54) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "yamato", dmg, ax: +attackerX.toFixed(1), az: +attackerZ.toFixed(1) });
        }
        if (ym.state === "drifting") {
          ym.state = "retaliating";
          ym.salvosLeft = 3;
          ym.salvoTimer = 3.2; // 3.2s of grinding 460mm turrets slewing before Salvo 1!
          ym.targetX = attackerX; ym.targetZ = attackerZ; ym.targetPeerId = attackerPeerId;
          ym.matPortGlow.color.setHex(0xff3b2f);
          if (audio && audio.playYamatoKlaxon) audio.playYamatoKlaxon();
          if (ui) ui.toast("⚠ YOU FIRED ON THE PHANTOM YAMATO!! GENERAL QUARTERS — 460mm TURRETS SLEWING (3 SALVOS INCOMING)!!", true);
        } else {
          ym.targetX = attackerX; ym.targetZ = attackerZ;
        }
        return { hit: true, name: "Phantom Yamato" };
      }
    }

    // 2. SOUTHERN MEGALODON (~34m)
    const mg = this.megalodon;
    if (mg.state === "fin_stalk" || mg.state === "lunge_ram") {
      if (Math.hypot(gx - mg.gx, gz - mg.gz) < 20 && Math.abs(gy - mg.gy) < 12) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "megalodon", dmg });
        }
        mg.hp -= dmg;
        if (audio) audio.playImpact(0.75);
        if (mg.hp <= 0) {
          mg.state = "flee"; mg.fleeTimer = 14.0; mg.hp = 100;
          if (ui) ui.toast("EL GRAN MAJA WOUNDED!! The Megalodon dives back into the deep!", false);
        }
        return { hit: true, name: "El Gran Maja" };
      }
    }

    // 3. NORTHERN ABYSSAL KRAKEN (Head + 8 Breaching Tentacles)
    const kr = this.kraken;
    if (kr.state === "tentacle_ring" || kr.state === "breach_slam") {
      let hitKr = (Math.hypot(gx - kr.gx, gz - kr.gz) < 22 && gy > kr.gy - 6 && gy < kr.gy + 42);
      if (!hitKr) {
        for (const t of kr.tentacles) {
          const tx = kr.gx + Math.cos(t.ang) * t.rad;
          const tz = kr.gz + Math.sin(t.ang) * t.rad;
          if (Math.hypot(gx - tx, gz - tz) < 7.5 && gy > kr.gy - 5 && gy < kr.gy + 38) { hitKr = true; break; }
        }
      }
      if (hitKr) {
        if (network && !network.isHost && network.mode !== "offline") {
          network.send({ type: "ocean_cryptid_hit", target: "kraken", dmg });
        }
        kr.hp -= dmg;
        if (audio) audio.playImpact(0.8);
        if (kr.hp <= 0) {
          kr.state = "flee"; kr.fleeTimer = 14.0; kr.hp = 160;
          if (audio && audio.playBloopSonar) audio.playBloopSonar();
          if (ui) ui.toast("THE BLOOP RETREATS!! The Abyssal Kraken sinks back beneath the northern sea!", false);
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
      if (this.megalodon.hp <= 0) { this.megalodon.state = "flee"; this.megalodon.fleeTimer = 14.0; this.megalodon.hp = 100; }
    } else if (msg.target === "kraken") {
      this.kraken.hp -= (msg.dmg || 20);
      if (this.kraken.hp <= 0) { this.kraken.state = "flee"; this.kraken.fleeTimer = 14.0; this.kraken.hp = 160; }
    }
  }

  // Quick manual spawner for testing from [O] Options -> Recovery & Chaos!
  forceSpawn(kind, vehicle, boats, audio, ui) {
    const ab = boats ? boats.activeBoat : null;
    const px = ab ? ab.gx : vehicle.pos.x;
    const pz = ab ? ab.gz : vehicle.pos.z;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    if (kind === "yamato") {
      const ym = this.yamato;
      ym.gx = px + 260; ym.gz = pz + 180; ym.gy = seaL;
      ym.yaw = Math.atan2(-180, 260);
      ym.state = "drifting"; ym.driftTimer = 180; ym.sinkOffset = 0; ym.salvosLeft = 0;
      ym.matPortGlow.color.setHex(0x72d8ff);
      if (audio && audio.playYamatoLament) audio.playYamatoLament();
      if (ui) ui.toast("⚓ A colossal 263m silhouette drifts out of the sea mist... The Phantom Yamato (PASSIVE unless shot).");
    } else if (kind === "megalodon") {
      const mg = this.megalodon;
      mg.gx = px + 95; mg.gz = pz + 65; mg.gy = seaL - 2.0;
      mg.state = "fin_stalk"; mg.stageTimer = 11.0; mg.hp = 100;
      if (ui) ui.toast("🦈 FIN SPOTTED!! El Gran Maja (34m Megalodon) is circling your hull!", true);
    } else if (kind === "kraken") {
      const kr = this.kraken;
      kr.gx = px; kr.gz = pz; kr.gy = seaL;
      kr.state = "sonar_omen"; kr.stageTimer = 5.5; kr.hp = 160; kr.headSubmerge = -42;
      if (audio && audio.playBloopSonar) audio.playBloopSonar();
      if (ui) ui.toast("🌊 DEEP-SEA SONAR ANOMALY ('THE BLOOP') DETECTED BENEATH YOUR HULL!!", true);
    }
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

  applySyncState(d) {
    if (!d) return;
    if (d.ym) {
      const ym = this.yamato;
      ym.state = d.ym.s; ym.gx = d.ym.x; ym.gz = d.ym.z; ym.yaw = d.ym.y;
      ym.sinkOffset = d.ym.sk || 0; ym.salvosLeft = d.ym.sl || 0;
      ym.targetX = d.ym.tx || 0; ym.targetZ = d.ym.tz || 0;
      ym.matPortGlow.color.setHex(ym.state === "retaliating" ? 0xff3b2f : 0x72d8ff);
    }
    if (d.mg) {
      const mg = this.megalodon;
      mg.state = d.mg.s; mg.gx = d.mg.x; mg.gz = d.mg.z; mg.yaw = d.mg.y; mg.depthOff = d.mg.d || -2.0;
    }
    if (d.kr) {
      const kr = this.kraken;
      kr.state = d.kr.s; kr.gx = d.kr.x; kr.gz = d.kr.z; kr.headSubmerge = d.kr.hs || -42; kr.activeSlamIdx = d.kr.si;
    }
  }

  // ==========================================================================
  // MAIN UPDATE LOOP (AI + Visuals + Solid Yamato Hull Bounce + 460mm Shells!)
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
  }

  _stepAuthoritativeAI(dt, players, particles, audio, ui, hazards, seaL) {
    // 1. POSSESSED YAMATO-CLASS BATTLESHIP (Passive Ghost Ship -> 3 Salvos if Shot -> Submerge!)
    const ym = this.yamato;
    if (ym.dormantCd > 0) ym.dormantCd -= dt;
    if (ym.state === "dormant") {
      if (ym.dormantCd <= 0) {
        const seaTgt = players.find((p) => p.inBoat && this._isOpenOcean(p.x, p.z, 900));
        if (seaTgt && Math.random() < dt * 0.045) {
          const ang = Math.random() * Math.PI * 2;
          const sx = seaTgt.x + Math.cos(ang) * 440, sz = seaTgt.z + Math.sin(ang) * 440;
          if (this._isOpenOcean(sx, sz, 600)) {
            ym.gx = sx; ym.gz = sz; ym.gy = seaL;
            ym.yaw = ang + Math.PI * 0.52; // Crosses majestically across your bow
            ym.state = "drifting"; ym.driftTimer = 170; ym.sinkOffset = 0; ym.salvosLeft = 0;
            ym.matPortGlow.color.setHex(0x72d8ff);
            if (audio && audio.playYamatoLament) audio.playYamatoLament();
          }
        }
      }
    } else if (ym.state === "drifting") {
      ym.driftTimer -= dt;
      ym.gx += Math.sin(ym.yaw) * 7.2 * dt;
      ym.gz += Math.cos(ym.yaw) * 7.2 * dt;
      if (!this._isOpenOcean(ym.gx, ym.gz, 420) || ym.driftTimer <= 0) {
        ym.state = "departing";
        if (audio && audio.playYamatoLament) audio.playYamatoLament();
      }
    } else if (ym.state === "retaliating") {
      ym.gx += Math.sin(ym.yaw) * 4.5 * dt;
      ym.gz += Math.cos(ym.yaw) * 4.5 * dt;
      // Track attacker if still nearby
      const atk = players.find((p) => p.peerId === ym.targetPeerId) || players[0];
      if (atk && Math.hypot(atk.x - ym.gx, atk.z - ym.gz) < 950) {
        ym.targetX = atk.x + (atk.vx || 0) * 1.4;
        ym.targetZ = atk.z + (atk.vz || 0) * 1.4;
      }
      ym.salvoTimer -= dt;
      if (ym.salvoTimer <= 0 && ym.salvosLeft > 0) {
        this._fireYamatoSalvo(audio, particles);
        ym.salvosLeft--;
        if (ym.salvosLeft > 0) {
          ym.salvoTimer = 5.4;
        } else {
          ym.state = "departing";
          ym.matPortGlow.color.setHex(0x72d8ff);
          if (audio && audio.playYamatoLament) audio.playYamatoLament();
          if (ui) ui.toast("The Phantom Yamato elevates its 460mm guns to neutral and slips mournfully beneath the waves...");
        }
      }
    } else if (ym.state === "departing") {
      ym.gx += Math.sin(ym.yaw) * 4.0 * dt;
      ym.gz += Math.cos(ym.yaw) * 4.0 * dt;
      ym.sinkOffset += dt * 3.8;
      if (ym.sinkOffset > 56) {
        ym.state = "dormant"; ym.dormantCd = 220.0; ym.sinkOffset = 0;
      }
    }

    // 2. EL GRAN MAJA — SOUTHERN MEGALODON (z > 8000, Warm Southern Ocean!)
    const mg = this.megalodon;
    if (mg.dormantCd > 0) mg.dormantCd -= dt;
    if (mg.hitCd > 0) mg.hitCd -= dt;
    const southTgt = players.find((p) => p.inBoat && p.z > 8000 && this._isOpenOcean(p.x, p.z, 360));

    if (mg.state === "dormant") {
      if (mg.dormantCd <= 0 && southTgt && Math.random() < dt * 0.08) {
        const a = Math.random() * Math.PI * 2;
        mg.gx = southTgt.x + Math.cos(a) * 115;
        mg.gz = southTgt.z + Math.sin(a) * 115;
        mg.orbitAng = a; mg.state = "fin_stalk"; mg.stageTimer = 11.5; mg.hp = 100; mg.depthOff = -2.2;
      }
    } else if (mg.state === "fin_stalk") {
      if (!southTgt || Math.hypot(southTgt.x - mg.gx, southTgt.z - mg.gz) > 420) {
        mg.state = "dormant"; mg.dormantCd = 35;
      } else {
        mg.stageTimer -= dt;
        mg.orbitAng += dt * 0.52;
        const rad = Math.max(48, 86 - (11.5 - mg.stageTimer) * 3.2);
        const tx = southTgt.x + Math.cos(mg.orbitAng) * rad;
        const tz = southTgt.z + Math.sin(mg.orbitAng) * rad;
        mg.yaw = Math.atan2(tx - mg.gx, tz - mg.gz);
        mg.gx += Math.sin(mg.yaw) * 26.0 * dt;
        mg.gz += Math.cos(mg.yaw) * 26.0 * dt;
        mg.depthOff += (-1.9 - mg.depthOff) * Math.min(1, dt * 3);
        if (mg.stageTimer <= 0) { mg.state = "lunge_ram"; mg.stageTimer = 7.5; }
      }
    } else if (mg.state === "lunge_ram") {
      if (!southTgt || Math.hypot(southTgt.x - mg.gx, southTgt.z - mg.gz) > 380) {
        mg.state = "flee"; mg.fleeTimer = 10;
      } else {
        mg.stageTimer -= dt;
        const ang = Math.atan2(southTgt.x - mg.gx, southTgt.z - mg.gz);
        mg.yaw = ang;
        mg.gx += Math.sin(ang) * 34.5 * dt; // ~124 km/h — Strela-X1 outruns it, slow barges must fight!
        mg.gz += Math.cos(ang) * 34.5 * dt;
        mg.depthOff += (-0.2 - mg.depthOff) * Math.min(1, dt * 4);
        if (!this._isOpenOcean(mg.gx, mg.gz, 180) || mg.stageTimer <= 0) {
          mg.state = "fin_stalk"; mg.stageTimer = 9.0;
        }
      }
    } else if (mg.state === "flee") {
      mg.fleeTimer -= dt;
      mg.gx += Math.sin(mg.yaw) * 28.0 * dt;
      mg.gz += Math.cos(mg.yaw) * 28.0 * dt;
      mg.depthOff -= dt * 3.2;
      if (mg.fleeTimer <= 0) { mg.state = "dormant"; mg.dormantCd = 95.0; mg.depthOff = -2.2; }
    }

    // 3. THE BLOOP — NORTHERN ABYSSAL KRAKEN (z < -8000, Freezing Northern Ocean!)
    const kr = this.kraken;
    if (kr.dormantCd > 0) kr.dormantCd -= dt;
    const northTgt = players.find((p) => p.inBoat && p.z < -8000 && this._isOpenOcean(p.x, p.z, 420));

    // Road flare decoy check!
    if ((kr.state === "tentacle_ring" || kr.state === "breach_slam") && hazards && hazards.flares) {
      for (const fl of hazards.flares) {
        if (Math.hypot(fl.gx - kr.gx, fl.gz - kr.gz) < 95) {
          kr.state = "flee"; kr.fleeTimer = 12.0;
          if (ui) ui.toast("FLARE DECOY!! The Bloop recoils from the burning phosphorus and dives!", false);
          break;
        }
      }
    }

    if (kr.state === "dormant") {
      if (kr.dormantCd <= 0 && northTgt && Math.random() < dt * 0.065) {
        kr.gx = northTgt.x + (northTgt.vx || 0) * 3.0;
        kr.gz = northTgt.z + (northTgt.vz || 0) * 3.0;
        kr.state = "sonar_omen"; kr.stageTimer = 5.5; kr.hp = 160; kr.headSubmerge = -42;
        if (audio && audio.playBloopSonar) audio.playBloopSonar();
      }
    } else if (kr.state === "sonar_omen") {
      kr.stageTimer -= dt;
      if (northTgt) { kr.gx += (northTgt.x - kr.gx) * Math.min(1, dt * 1.2); kr.gz += (northTgt.z - kr.gz) * Math.min(1, dt * 1.2); }
      if (kr.stageTimer <= 0) { kr.state = "tentacle_ring"; kr.stageTimer = 14.0; kr.slamCd = 2.6; }
    } else if (kr.state === "tentacle_ring" || kr.state === "breach_slam") {
      if (!northTgt || Math.hypot(northTgt.x - kr.gx, northTgt.z - kr.gz) > 360) {
        kr.state = "flee"; kr.fleeTimer = 10.0;
      } else {
        kr.stageTimer -= dt;
        const targetHead = (kr.state === "breach_slam") ? -2.0 : -24.0;
        kr.headSubmerge += (targetHead - kr.headSubmerge) * Math.min(1, dt * 1.6);
        kr.slamCd -= dt;
        if (kr.slamCd <= 0) {
          kr.slamCd = 3.2;
          // Pick tentacle closest to player to slam!
          let bestI = 0, bestD = 9999;
          for (let i = 0; i < kr.tentacles.length; i++) {
            const t = kr.tentacles[i];
            const d = Math.hypot((kr.gx + Math.cos(t.ang) * t.rad) - northTgt.x, (kr.gz + Math.sin(t.ang) * t.rad) - northTgt.z);
            if (d < bestD) { bestD = d; bestI = i; }
          }
          kr.activeSlamIdx = bestI;
          kr.tentacles[bestI].slamming = true;
          kr.tentacles[bestI].slamPhase = 0;
        }
        if (kr.state === "tentacle_ring" && kr.stageTimer <= 0) {
          kr.state = "breach_slam"; kr.stageTimer = 18.0;
          if (audio && audio.playBloopSonar) audio.playBloopSonar();
        } else if (kr.state === "breach_slam" && kr.stageTimer <= 0) {
          kr.state = "flee"; kr.fleeTimer = 12.0;
        }
      }
    } else if (kr.state === "flee") {
      kr.fleeTimer -= dt;
      kr.headSubmerge -= dt * 4.5;
      if (kr.fleeTimer <= 0) { kr.state = "dormant"; kr.dormantCd = 120.0; }
    }
  }

  _updateVisualsAndCollisions(dt, localP, boats, vehicle, particles, audio, ui, seaL) {
    const ab = boats ? boats.activeBoat : null;

    // 1. UPDATE YAMATO VISUALS, TURRET SLEWING & PASSIVE SOLID HULL COLLISION!
    const ym = this.yamato;
    ym.mesh.visible = (ym.state !== "dormant");
    if (ym.mesh.visible) {
      ym.phase += dt;
      ym.gy = seaL - ym.sinkOffset + Math.sin(ym.phase * 0.7) * 0.45;
      this.world.toLocal(ym.gx, ym.gy, ym.gz, ym.mesh.position);
      ym.mesh.rotation.y = ym.yaw;
      ym.shipRoot.rotation.z = 0.095 + Math.sin(ym.phase * 0.55) * 0.022;

      if (ym.flashTimer > 0) {
        ym.flashTimer -= dt;
        if (ym.flashTimer <= 0) {
          for (const t of ym.mainTurrets) for (const fl of t.flashes) fl.visible = false;
        }
      }

      // Slew all 3 triple 460mm turrets toward target during retaliation (or back to neutral)
      const desiredWorldYaw = Math.atan2(ym.targetX - ym.gx, ym.targetZ - ym.gz);
      for (const t of ym.mainTurrets) {
        const tgtYaw = (ym.state === "retaliating") ? (desiredWorldYaw - ym.yaw) : t.baseYaw;
        let dy = tgtYaw - t.curYaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        const step = 0.34 * dt;
        t.curYaw += Math.abs(dy) <= step ? dy : Math.sign(dy) * step;
        t.pivot.rotation.y = t.curYaw;
        const tgtP = (ym.state === "retaliating") ? -0.26 : -0.06;
        t.curPitch += (tgtP - t.curPitch) * Math.min(1, dt * 1.4);
        t.gunPitch.rotation.x = t.curPitch;
      }

      // Mournful distant steel foghorn lament while drifting nearby
      const dYm = Math.hypot(localP.x - ym.gx, localP.z - ym.gz);
      ym.hornCd -= dt;
      if (dYm < 680 && ym.hornCd <= 0 && ym.state === "drifting") {
        ym.hornCd = 19.0 + Math.random() * 8.0;
        if (audio && audio.playYamatoLament) audio.playYamatoLament();
      }

      // SOLID COLD-STEEL HULL BOUNCE (Ramming the Yamato bounces your boat off — it stays 100% passive!)
      if (ab && ym.state !== "departing" && dYm < 165) {
        const dx = ab.gx - ym.gx, dz = ab.gz - ym.gz;
        const c = Math.cos(-ym.yaw), s = Math.sin(-ym.yaw);
        const lx = dx * c + dz * s, lz = -dx * s + dz * c;
        const hx = 21.0 + (ab.spec.width || 6) * 0.5;
        const hz = 132.0 + (ab.spec.len || 12) * 0.5;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
          const pushX = (lx >= 0 ? 1 : -1);
          const nx = pushX * Math.cos(ym.yaw), nz = -pushX * Math.sin(ym.yaw);
          const pen = hx - Math.abs(lx) + 0.5;
          ab.gx += nx * pen; ab.gz += nz * pen;
          ab.vx = nx * 8.0; ab.vz = nz * 8.0;
          if (audio) audio.playImpact(0.75);
        }
      }
    }

    // 2. UPDATE FLYING 460mm YAMATO SHELLS -> 45m WATER SPOUTS & SHOCKWAVES!
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const sh = this.shells[i];
      sh.life -= dt;
      sh.vy -= sh.g * dt;
      sh.gx += sh.vx * dt; sh.gy += sh.vy * dt; sh.gz += sh.vz * dt;
      this.world.toLocal(sh.gx, sh.gy, sh.gz, sh.mesh.position);
      if (sh.gy <= seaL + 0.4 || sh.life <= 0) {
        this._spawnWaterSpout(sh.gx, sh.gz, 45, 8.5);
        const dImp = Math.hypot(localP.x - sh.gx, localP.z - sh.gz);
        if (dImp < 480) {
          if (audio) audio.playImpact(Math.min(1.0, 1.15 - dImp / 480));
          this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dImp / 340) * 1.15);
        }
        if (ab && dImp < 46) {
          const pushAng = Math.atan2(ab.gx - sh.gx, ab.gz - sh.gz);
          const f = (1.0 - dImp / 46) * 28.0;
          ab.vx += Math.sin(pushAng) * f;
          ab.vz += Math.cos(pushAng) * f;
          ab.roll += (Math.random() > 0.5 ? 1 : -1) * 0.35;
          if (dImp < 22 && ui) ui.toast("💥 460mm YAMATO NEAR-MISS SHOCKWAVE ROCKED YOUR HULL!!", true);
        }
        this.scene.remove(sh.mesh);
        this.shells.splice(i, 1);
      }
    }

    // 3. UPDATE MEGALODON VISUALS, TAIL SWIMMING & HULL RAM!
    const mg = this.megalodon;
    mg.mesh.visible = (mg.state !== "dormant");
    if (mg.mesh.visible) {
      mg.phase += dt * (mg.state === "lunge_ram" ? 9.5 : 4.8);
      mg.gy = seaL + mg.depthOff;
      this.world.toLocal(mg.gx, mg.gy, mg.gz, mg.mesh.position);
      mg.mesh.rotation.set(mg.state === "lunge_ram" ? -0.14 : 0, mg.yaw, Math.sin(mg.phase) * 0.06, "YXZ");
      mg.tail1.rotation.y  = Math.sin(mg.phase) * 0.34;
      mg.tail2.rotation.y  = Math.sin(mg.phase - 0.8) * 0.42;
      mg.caudal.rotation.y = Math.sin(mg.phase - 1.5) * 0.48;
      const targetJaw = (mg.state === "lunge_ram") ? 0.62 : 0.08;
      mg.jawPivot.rotation.x += (targetJaw - mg.jawPivot.rotation.x) * Math.min(1, dt * 6);

      if (particles && Math.random() < 0.65) {
        particles.emitWaterSplash(mg.gx, seaL + 0.3, mg.gz, mg.state === "lunge_ram" ? 2.4 : 1.1);
      }
      if (ab && mg.state === "lunge_ram" && mg.hitCd <= 0) {
        const dMg = Math.hypot(ab.gx - mg.gx, ab.gz - mg.gz);
        if (dMg < (ab.spec.len * 0.42 + 9.0)) {
          mg.hitCd = 5.5;
          const rAng = Math.atan2(ab.gx - mg.gx, ab.gz - mg.gz);
          const force = ab.spec.amphibious ? 12.0 : 24.0;
          ab.vx += Math.sin(rAng) * force; ab.vz += Math.cos(rAng) * force;
          ab.roll += 0.32;
          this._spawnWaterSpout(mg.gx, mg.gz, 22, 5.0);
          if (audio) audio.playImpact(0.95);
          this.cameraShakeOut = Math.max(this.cameraShakeOut, 0.95);
          if (ui) ui.toast("🦈 EL GRAN MAJA SLAMMED YOUR HULL!! Full throttle or blast it with deck guns!", true);
          mg.state = "fin_stalk"; mg.stageTimer = 9.0;
        }
      }
    }

    // 4. UPDATE NORTHERN KRAKEN VISUALS & 42m SLAMMING TENTACLES!
    const kr = this.kraken;
    kr.mesh.visible = (kr.state !== "dormant");
    if (kr.mesh.visible) {
      kr.phase += dt * 1.9;
      kr.gy = seaL;
      this.world.toLocal(kr.gx, kr.gy, kr.gz, kr.mesh.position);
      kr.headGrp.position.y = kr.headSubmerge;
      kr.headGrp.rotation.y = Math.atan2(localP.x - kr.gx, localP.z - kr.gz);

      const bioPulse = 0.5 + 0.5 * Math.sin(kr.phase * 2.5);
      kr.matBio.color.setRGB(0.05 + bioPulse * 0.25, 0.72 + bioPulse * 0.28, 1.0);

      const showTentacles = (kr.state === "tentacle_ring" || kr.state === "breach_slam" || kr.state === "flee");
      for (let i = 0; i < kr.tentacles.length; i++) {
        const t = kr.tentacles[i];
        t.root.visible = showTentacles;
        const targetY = (kr.state === "flee") ? -44 : -5;
        t.root.position.y += (targetY - t.root.position.y) * Math.min(1, dt * 1.8);

        let slamBend = 0;
        if (t.slamming) {
          t.slamPhase += dt * 1.45;
          if (t.slamPhase < 0.55) {
            slamBend = -0.35 * (t.slamPhase / 0.55); // Wind up backward!
          } else if (t.slamPhase < 1.0) {
            slamBend = -0.35 + 1.55 * ((t.slamPhase - 0.55) / 0.45); // SLAM down toward water!
          } else {
            t.slamming = false;
            const sx = kr.gx + Math.cos(t.ang) * (t.rad - 18);
            const sz = kr.gz + Math.sin(t.ang) * (t.rad - 18);
            this._spawnWaterSpout(sx, sz, 34, 7.0);
            const dSlam = Math.hypot(localP.x - sx, localP.z - sz);
            if (dSlam < 320) {
              if (audio) audio.playImpact(Math.min(1.0, 1.1 - dSlam / 320));
              this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dSlam / 220) * 1.0);
            }
            if (ab && dSlam < 32) {
              const pA = Math.atan2(ab.gx - sx, ab.gz - sz);
              ab.vx += Math.sin(pA) * 22; ab.vz += Math.cos(pA) * 22; ab.roll += 0.36;
              if (ui) ui.toast("🐙 KRAKEN TENTACLE SLAM!! Weave out of the ring, toss a flare [G], or fire deck guns!", true);
            }
          }
        }
        for (let s = 0; s < t.segs.length; s++) {
          const sway = Math.sin(kr.phase + i * 0.9 + s * 0.55) * 0.18;
          t.segs[s].rotation.x = 0.08 + sway * 0.5 + slamBend * (0.28 + s * 0.14);
          t.segs[s].rotation.z = Math.cos(kr.phase * 0.8 + i + s * 0.4) * 0.14;
        }
      }
    }

    // 5. ANIMATE WATER SPOUTS
    for (let i = this.spouts.length - 1; i >= 0; i--) {
      const sp = this.spouts[i];
      sp.age += dt;
      const u = sp.age / sp.maxAge;
      const grow = u < 0.25 ? (u / 0.25) : (1.0 - (u - 0.25) / 0.75);
      sp.mesh.scale.set(1.0 + u * 0.65, Math.max(0.05, grow), 1.0 + u * 0.65);
      sp.mat.opacity = Math.max(0, (1.0 - u) * 0.82);
      this.world.toLocal(sp.gx, sp.gy, sp.gz, sp.mesh.position);
      if (sp.age >= sp.maxAge) {
        this.scene.remove(sp.mesh);
        this.spouts.splice(i, 1);
      }
    }
  }
};
