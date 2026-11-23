// ============================================================================
// js/hammond_mesa.js (v13.9) — Richard Hammond's Rocky Desert Mesa
// Sandwyrm-Safe Stone Plateau, Oliver (1963 Opel Kadett), Upside-Down Wreck,
// & BTR-80 Contraband KPVT 14.5mm Heavy Autocannon Rearmament!
// ============================================================================
window.KK = window.KK || {};

KK.HammondMesa = class HammondMesa {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cfg = KK.HAMMOND_MESA;
    this.hammond = {
      gx: this.cfg.campX + 6.0,
      gy: 35,
      gz: this.cfg.campZ + 5.0,
      yaw: 0.4,
      mesh: null,
      armR: null
    };
    this.smokeTimer = 0;
    this.wallColliders = [];
    this._buildMesaCamp();
    this._buildHammondNPC();
  }

  isInsideSanctuary(gx, gz, pad = 0) {
    return Math.hypot(gx - this.cfg.x, gz - this.cfg.z) < (this.cfg.radius + pad);
  }

  _createSignTex() {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 140;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#2b1c12"; ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#f4a261"; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 500, 128);
    ctx.fillStyle = "#ffd166"; ctx.font = "bold 32px serif"; ctx.textAlign = "center";
    ctx.fillText("HAMMOND'S DESERT GARAGE", 256, 48);
    ctx.fillStyle = "#90e0ef"; ctx.font = "bold 19px monospace";
    ctx.fillText("SOLID ROCK MESA • SANDWYRM-SAFE", 256, 86);
    ctx.fillStyle = "#ff6b6b"; ctx.font = "bold 18px monospace";
    ctx.fillText("BTR-80 KPVT 14.5mm REARMING & AMMO", 256, 120);
    return new THREE.CanvasTexture(cv);
  }

  _buildMesaCamp() {
    const baseH = this.world.getBaseHeight(this.cfg.x, this.cfg.z);
    const grp = new THREE.Group();
    grp.position.set(this.cfg.x, baseH, this.cfg.z);

    const matTin    = new THREE.MeshStandardMaterial({ color: 0x7d6b58, roughness: 0.78, metalness: 0.35 });
    const matRoof   = new THREE.MeshStandardMaterial({ color: 0x4a3d31, roughness: 0.85 });
    const matWood   = new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.92 });
    const matOliver = new THREE.MeshStandardMaterial({ color: 0xd8c39e, roughness: 0.45, metalness: 0.15 }); // Iconic Oliver beige!
    const matDark   = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.90 });
    const matGlass  = new THREE.MeshStandardMaterial({ color: 0x9cd2f0, transparent: true, opacity: 0.35 });
    const matRimac  = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.32, metalness: 0.45 });
    const matPad    = new THREE.MeshStandardMaterial({ color: 0xe76f51, emissive: 0x5c1a0a, roughness: 0.65 });
    const matAmmo   = new THREE.MeshStandardMaterial({ color: 0x4a5d3b, roughness: 0.85 });

    // 1. Desert Tin Workshop Garage & Ammo Crates
    const shop = new THREE.Mesh(new THREE.BoxGeometry(15, 5.2, 10), matTin);
    shop.position.set(0, 2.6, -8); shop.castShadow = true; shop.receiveShadow = true; grp.add(shop);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.45, 11.4), matRoof);
    roof.position.set(0, 5.4, -8); grp.add(roof);

    const signMat = new THREE.MeshBasicMaterial({ map: this._createSignTex() });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.5, 0.24), [matWood, matWood, matWood, matWood, signMat, signMat]);
    sign.position.set(0, 4.4, -2.8); grp.add(sign);

    // Military Green 14.5mm Ammo Crates stacked outside
    for (let i = 0; i < 4; i++) {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 0.9), matAmmo);
      cr.position.set(9.2 + (i % 2) * 1.7, 0.4 + Math.floor(i / 2) * 0.82, -5.5);
      grp.add(cr);
    }

    // Glowing Orange Rearmament Pad!
    const pad = new THREE.Mesh(new THREE.BoxGeometry(11, 0.18, 11), matPad);
    pad.position.set(0, 0.09, 10); grp.add(pad);

    // 2. OLIVER! (1963 Opel Kadett — Tiny Featherweight Desert-Beige Classic!)
    const oliver = new THREE.Group();
    oliver.position.set(-13.5, 0, 2.5); oliver.rotation.y = 0.65;
    const oBody = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.56, 3.65), matOliver);
    oBody.position.y = 0.60; oBody.castShadow = true; oliver.add(oBody);
    const oCab = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.54, 1.75), matOliver);
    oCab.position.set(0, 1.12, -0.15); oliver.add(oCab);
    const oGlass = new THREE.Mesh(new THREE.BoxGeometry(1.39, 0.40, 1.55), matGlass);
    oGlass.position.set(0, 1.12, -0.15); oliver.add(oGlass);
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12); wGeo.rotateZ(Math.PI / 2);
    for (const [wx, wz] of [[-0.76, 1.15], [0.76, 1.15], [-0.76, -1.15], [0.76, -1.15]]) {
      const wh = new THREE.Mesh(wGeo, matDark); wh.position.set(wx, 0.28, wz); oliver.add(wh);
    }
    const oTag = KK.VehicleBuilder.createNameSprite("OLIVER (1963 KADETT)", "#ffd166");
    oTag.position.set(0, 2.1, 0); oliver.add(oTag);
    grp.add(oliver);

    // 3. Hammond's Signature Upside-Down Smoking Red Supercar in the Ditch!
    const wreck = new THREE.Group();
    wreck.position.set(22, 0.55, 16);
    wreck.rotation.set(0.18, -0.8, Math.PI - 0.14); // Completely upside-down!
    const wBody = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.62, 4.35), matRimac);
    wreck.add(wBody);
    const wCab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 1.90), matDark);
    wCab.position.set(0, 0.48, -0.15); wreck.add(wCab);
    for (const [wx, wz] of [[-0.98, 1.35], [0.98, 1.35], [-0.98, -1.35], [0.98, -1.35]]) {
      const wh = new THREE.Mesh(wGeo, matDark); wh.position.set(wx, -0.25, wz); wreck.add(wh);
    }
    grp.add(wreck);

    // Tall Beacon Spire so players spot Hammond's Mesa from afar across the dunes!
    const bcn = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 34, 8),
      new THREE.MeshBasicMaterial({ color: 0xf4a261, transparent: true, opacity: 0.35 })
    );
    bcn.position.set(0, 17, 10); grp.add(bcn);

    // v14.0A: HAMMOND'S FORTIFIED ANTI-SANDWYRM DESERT STRONGHOLD!
    const matWall   = new THREE.MeshStandardMaterial({ color: 0x766c5f, roughness: 0.92 });
    const matSteel  = new THREE.MeshStandardMaterial({ color: 0x3a4046, roughness: 0.58, metalness: 0.65 });
    const matSandbg = new THREE.MeshStandardMaterial({ color: 0xa68e68, roughness: 0.96 });
    const matCanopy = new THREE.MeshStandardMaterial({ color: 0xb88642, roughness: 0.90 });
    const matCrane  = new THREE.MeshStandardMaterial({ color: 0xe9a925, roughness: 0.55, metalness: 0.45 });
    const matFlood  = new THREE.MeshBasicMaterial({ color: 0xfff5d6 });

    const wallR = 62.0;
    const segs = 28;
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const aMid = (a0 + a1) * 0.5;
      const mx = Math.sin(aMid) * wallR, mz = Math.cos(aMid) * wallR;
      if (mz < -45 && Math.abs(mx) < 15.5) continue;

      const x0 = Math.sin(a0) * wallR, z0 = Math.cos(a0) * wallR;
      const x1 = Math.sin(a1) * wallR, z1 = Math.cos(a1) * wallR;
      const segLen = Math.hypot(x1 - x0, z1 - z0) + 0.6;
      const yaw = Math.atan2(x1 - x0, z1 - z0);

      const wall = new THREE.Mesh(new THREE.BoxGeometry(1.65, 4.2, segLen), matWall);
      wall.position.set(mx, 2.1, mz); wall.rotation.y = yaw;
      wall.castShadow = true; wall.receiveShadow = true; grp.add(wall);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, segLen), matSteel);
      cap.position.set(mx, 4.3, mz); cap.rotation.y = yaw; grp.add(cap);

      for (const f of [-0.33, 0, 0.33]) {
        const cx = this.cfg.x + mx + Math.sin(yaw) * (segLen * f);
        const cz = this.cfg.z + mz + Math.cos(yaw) * (segLen * f);
        this.wallColliders.push({ x: cx, y: baseH, z: cz, r: 2.35, h: 4.5, type: "wall" });
      }
    }

    for (const gx of [-14.2, 14.2]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 7.6, 3.2), matWall);
      pillar.position.set(gx, 3.8, -60.2); pillar.castShadow = true; grp.add(pillar);
      const sb = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.35, 2.4), matSandbg);
      sb.position.set(gx + (gx < 0 ? -3.4 : 3.4), 0.68, -56.0); grp.add(sb);
      this.wallColliders.push({ x: this.cfg.x + gx, y: baseH, z: this.cfg.z - 60.2, r: 2.4, h: 7.8, type: "wall" });
    }
    const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(31.5, 1.35, 2.4), matSteel);
    gateBeam.position.set(0, 7.6, -60.2); gateBeam.castShadow = true; grp.add(gateBeam);

    for (const ang of [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75]) {
      const tx = Math.sin(ang) * (wallR - 4.5), tz = Math.cos(ang) * (wallR - 4.5);
      const tw = new THREE.Group(); tw.position.set(tx, 0, tz);
      for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 9.5, 6), matSteel);
        leg.position.set(lx, 4.75, lz); tw.add(leg);
      }
      const box = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 4.2), matWall);
      box.position.y = 10.6; box.castShadow = true; tw.add(box);
      const tRoof = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.35, 4.8), matSteel);
      tRoof.position.y = 12.1; tw.add(tRoof);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.25), matFlood);
      lamp.position.set(0, 11.4, 2.2); tw.add(lamp);
      grp.add(tw);
      this.wallColliders.push({ x: this.cfg.x + tx, y: baseH, z: this.cfg.z + tz, r: 2.8, h: 12.0, type: "wall" });
    }

    const oCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 6.2), matCanopy);
    oCanopy.position.set(-13.5, 3.1, 2.5); oCanopy.castShadow = true; grp.add(oCanopy);
    for (const [px, pz] of [[-2.5, -2.8], [2.5, -2.8], [-2.5, 2.8], [2.5, 2.8]]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.1, 6), matSteel);
      p.position.set(-13.5 + px, 1.55, 2.5 + pz); grp.add(p);
    }

    for (const gx of [-6.8, 6.8]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.65, 8.2, 1.2), matCrane);
      leg.position.set(gx, 4.1, 10); leg.castShadow = true; grp.add(leg);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.95, 1.25), matCrane);
    bridge.position.set(0, 8.4, 10); bridge.castShadow = true; grp.add(bridge);
    const hoist = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.4), matSteel);
    hoist.position.set(0, 7.6, 10); grp.add(hoist);

    this.world.rootGroup.add(grp);
    this.mesaGroup = grp;
    if (!this.world.staticColliders) this.world.staticColliders = [];
    for (const wc of this.wallColliders) this.world.staticColliders.push(wc);
    this.wreckWorldX = this.cfg.x + 22;
    this.wreckWorldZ = this.cfg.z + 16;
  }

  _buildHammondNPC() {
    const root = new THREE.Group();
    // Classic slightly-shorter Richard Hammond silhouette in leather jacket & desert boots!
    root.scale.set(0.88, 0.88, 0.88);
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xe6b692, roughness: 0.78 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0x3b2a1c, roughness: 0.90 });
    const matJkt  = new THREE.MeshStandardMaterial({ color: 0x4a2e1b, roughness: 0.82 }); // Brown leather jacket!
    const matJean = new THREE.MeshStandardMaterial({ color: 0x26384d, roughness: 0.92 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.64, 0.30), matJkt);
    torso.position.y = 1.12; torso.castShadow = true; root.add(torso);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), matSkin);
    head.position.y = 1.66; root.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.16, 0.36), matHair);
    hair.position.set(0, 1.82, -0.02); root.add(hair);

    const makeLimb = (w, h, d, mat, px, py) => {
      const piv = new THREE.Group(); piv.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = -h * 0.5; m.castShadow = true; piv.add(m); root.add(piv); return piv;
    };
    makeLimb(0.15, 0.56, 0.15, matJkt, -0.34, 1.38);
    const armR = makeLimb(0.15, 0.56, 0.15, matJkt, 0.34, 1.38);
    makeLimb(0.18, 0.76, 0.18, matJean, -0.14, 0.78);
    makeLimb(0.18, 0.76, 0.18, matJean,  0.14, 0.78);

    const tag = KK.VehicleBuilder.createNameSprite("RICHARD HAMMOND", "#f4a261");
    tag.position.set(0, 2.55, 0); root.add(tag);

    this.scene.add(root);
    this.hammond.mesh = root;
    this.hammond.armR = armR;
  }

  isNearHammond(gx, gz) {
    return Math.hypot(gx - this.hammond.gx, gz - this.hammond.gz) < 16.0 ||
           Math.hypot(gx - this.cfg.x, gz - (this.cfg.z + 10)) < 12.0;
  }

  interactWithHammond(game) {
    const vs = game.vehicle.vState;

    // PRIORITY 1: Player hauled the broken T-72 Relic from the secret northern border camp!
    const hasRelicOnTrailer = !!(game.trailer && game.trailer.hitched && game.trailer.carriedCar && game.trailer.carriedCar.isT72Relic);
    if (hasRelicOnTrailer) {
      if (game.ownedVehicles.t72) {
        game.ui.toast('RICHARD HAMMOND: "You already have your restored T-72B in your garage! Unload that hull or sell the scrap!"');
        return;
      }
      const restoreCost = 75000;
      if (game.money < restoreCost) {
        game.ui.toast(`RICHARD HAMMOND: "BLIMEY!! A genuine T-72B?! It's wrecked — I need $${restoreCost.toLocaleString()} for a V-84 V12 rebuild, tracks & 125mm autoloader! (You have $${Math.floor(game.money).toLocaleString()})"`, true);
        return;
      }
      game.startTimedWork("HAMMOND RESTORING T-72B MAIN BATTLE TANK", [
        { label: "Craning 41.5T T-72 hull off trailer & inspecting torsion bars...", dur: 3.0, sfx: "wrench" },
        { label: "Rebuilding 38.8L V-84MS V12 diesel & mounting fresh steel tracks...", dur: 3.5, sfx: "impact" },
        { label: "Calibrating 125mm 2A46M Carousel Autoloader, FLIR Thermal & 14.5mm MG...", dur: 3.5, sfx: "impact" }
      ], () => {
        if (game.money < restoreCost) return;
        game.money -= restoreCost;
        // Unload relic from trailer permanently!
        game.trailer.carriedCar = null;
        if (game.trailerRig) game.trailerRig.setCarriedCarVisual(null);
        if (game.milCamp) game.milCamp.setRelicVisible(false);

        // Permanently unlock T-72B on THIS player's personal account ONLY!
        game.ownedVehicles.t72 = KK.createDefaultVehicleState("t72");
        game.audio.playCash();
        game.audio.playTankAutoloader();
        game.switchVehicle("t72", false);
        const hy = this.world.getTerrainInfo(this.cfg.x, this.cfg.z + 12, true).height;
        game.vehicle.pos.set(this.cfg.x, hy + 1.5, this.cfg.z + 12);
        game.vehicle.vel.set(0, 0, 0);
        game._saveProgress(true);
        game.ui.toast('RICHARD HAMMOND: "T-72B RESTORED!! LMB=125mm Cannon, RMB=Turret Optic, MMB=Freeze Turret, [Shift]=14.5mm MG, [R]=Ammo, [Z]=FLIR/NVG, [G]=Smoke!"');
      });
      return;
    }

    // PRIORITY 1B: Player hauled the broken BM-21 "Grad" Katyusha Relic to Hammond's Mesa!
    const carried = (game.trailer && game.trailer.hitched) ? game.trailer.carriedCar : null;
    if (carried && carried.isBm21Relic) {
      if (game.ownedVehicles.bm21) { game.ui.toast('RICHARD HAMMOND: "You already own your restored BM-21 Grad!"'); return; }
      const cost = 65000;
      if (game.money < cost) { game.ui.toast(`RICHARD HAMMOND: "A 40-tube Katyusha BM-21 Grad?! Need $${cost.toLocaleString()} to rebuild the Ural 6x6 & rocket pods! (Have $${Math.floor(game.money).toLocaleString()})"`, true); return; }
      game.startTimedWork('HAMMOND RESTORING BM-21 "GRAD" KATYUSHA', [
        { label: "Craning rusted Ural-4320 6x6 chassis off trailer...", dur: 2.8, sfx: "wrench" },
        { label: "Rebuilding YaMZ-238 V8 diesel & hydraulic 40-tube pod elevation...", dur: 3.2, sfx: "impact" },
        { label: "Loading 40x 122mm High-Explosive Crater Rockets...", dur: 3.0, sfx: "impact" }
      ], () => {
        if (game.money < cost) return;
        game.money -= cost;
        game.trailer.carriedCar = null;
        if (game.trailerRig) game.trailerRig.setCarriedCarVisual(null);
        if (game.bm21Camp) game.bm21Camp.setRelicVisible(false);
        game.ownedVehicles.bm21 = KK.createDefaultVehicleState("bm21");
        game.audio.playCash(); game.audio.playKatyushaRocket();
        game.switchVehicle("bm21", false);
        const hy = this.world.getTerrainInfo(this.cfg.x, this.cfg.z + 12, true).height;
        game.vehicle.pos.set(this.cfg.x, hy + 1.5, this.cfg.z + 12);
        game.vehicle.vel.set(0, 0, 0);
        game._saveProgress(true);
        game.ui.toast('RICHARD HAMMOND: "BM-21 GRAD RESTORED!! LMB=Launch 122mm Rockets (Carves Permanent Craters!), RMB=Ballistic Sight, [R]=Single/Ripple Salvo!"');
      });
      return;
    }

    // PRIORITY 1C: Player hauled the broken ZSU-23-4 "Shilka" Relic to Hammond's Mesa!
    if (carried && carried.isShilkaRelic) {
      if (game.ownedVehicles.shilka) { game.ui.toast('RICHARD HAMMOND: "You already own your restored ZSU-23-4 Shilka!"'); return; }
      const cost = 70000;
      if (game.money < cost) { game.ui.toast(`RICHARD HAMMOND: "A ZSU-23-4 Shilka quad-23mm?! Need $${cost.toLocaleString()} to restore the RPK-2 Cryptid Radar & quad cannons! (Have $${Math.floor(game.money).toLocaleString()})"`, true); return; }
      game.startTimedWork('HAMMOND RESTORING ZSU-23-4 "SHILKA" SPAAG', [
        { label: "Rebuilding GM-575 tracked chassis & 12 torsion bars...", dur: 2.8, sfx: "wrench" },
        { label: "Calibrating 360° 1RL33 Moving-Target Cryptid Radar Dish...", dur: 3.2, sfx: "impact" },
        { label: "Synchronizing Quad 23mm AZP-23 water-cooled autocannons (800 rds)...", dur: 3.0, sfx: "impact" }
      ], () => {
        if (game.money < cost) return;
        game.money -= cost;
        game.trailer.carriedCar = null;
        if (game.trailerRig) game.trailerRig.setCarriedCarVisual(null);
        if (game.shilkaCamp) game.shilkaCamp.setRelicVisible(false);
        game.ownedVehicles.shilka = KK.createDefaultVehicleState("shilka");
        game.audio.playCash(); game.audio.playShilka23mm();
        game.switchVehicle("shilka", false);
        const hy = this.world.getTerrainInfo(this.cfg.x, this.cfg.z + 12, true).height;
        game.vehicle.pos.set(this.cfg.x, hy + 1.5, this.cfg.z + 12);
        game.vehicle.vel.set(0, 0, 0);
        game._saveProgress(true);
        game.ui.toast('RICHARD HAMMOND: "SHILKA RESTORED!! Hold LMB=Quad-23mm Shredder, RMB=Optic, [Z]=FLIR Thermal, [G]=360° Cryptid Radar Scope!"');
      });
      return;
    }

    // PRIORITY 2: Resupply T-72B / BM-21 / Shilka ammo at Hammond's Mesa!
    if (vs.vehicleId === "t72" || vs.vehicleId === "bm21" || vs.vehicleId === "shilka") {
      game.resupplyTankAmmo();
      return;
    }
    if (vs.vehicleId !== "btr80") {
      game.ui.toast('RICHARD HAMMOND: "Nice rig! Bring a BTR-80 up here to my mesa — I found a contraband 14.5mm KPVT turret that fits right on top ($28,000)!"');
      return;
    }
    if (!vs.upgrades.btrTurret) {
      const cost = 28000;
      if (game.money < cost) {
        game.ui.toast(`RICHARD HAMMOND: "Need $${cost.toLocaleString()} to bolt this 14.5mm KPVT cannon onto your BTR-80! (You have $${Math.floor(game.money).toLocaleString()})"`, true);
        return;
      }
      game.startTimedWork("HAMMOND REARMING BTR-80 (KPVT 14.5mm)", [
        { label: "Unbolting demilitarized rescue sensor pod...", dur: 2.2, sfx: "wrench" },
        { label: "Mounting 14.5mm KPVT Heavy Autocannon & Coaxial PKT...", dur: 2.6, sfx: "impact" },
        { label: "Loading 120-round belt & calibrating turret traverse...", dur: 2.0, sfx: "impact" }
      ], () => {
        if (game.money < cost) return;
        game.money -= cost;
        vs.upgrades.btrTurret = true;
        vs.btrAmmo = 120;
        game.vehicleRig.applyUpgrades(vs);
        game.audio.playCash();
        game._saveProgress(true);
        game.ui.toast('RICHARD HAMMOND: "BTR-80 REARMED!! Hold [Right-Click] for Gunner Sight Aim & [Left-Click] to fire 14.5mm bursts! (120 rds)"');
      });
      return;
    }
    // Already rearmed -> Resupply 14.5mm ammo!
    if ((vs.btrAmmo || 0) >= 120) {
      game.ui.toast('RICHARD HAMMOND: "Your KPVT ammo drum is already topped off at 120 rounds! Go give Siren Head a headache!"');
      return;
    }
    const ammoCost = 600;
    if (game.money < ammoCost) {
      game.ui.toast(`Need $${ammoCost} for 120 rounds of 14.5mm KPVT ammo!`, true);
      return;
    }
    game.money -= ammoCost;
    vs.btrAmmo = 120;
    game.audio.playCash();
    game._saveProgress(true);
    game.ui.toast('RICHARD HAMMOND: "Reloaded 120 rounds of 14.5mm KPVT tracers (-$600)! Try not to flip it!"');
  }

  update(dt, vehicle, particles) {
    const px = vehicle.pos.x, pz = vehicle.pos.z;
    const d = Math.hypot(this.hammond.gx - px, this.hammond.gz - pz);
    this.hammond.gy = this.world.getTerrainInfo(this.hammond.gx, this.hammond.gz, false).height;
    this.world.toLocal(this.hammond.gx, this.hammond.gy, this.hammond.gz, this.hammond.mesh.position);
    this.hammond.mesh.visible = d < 420;
    if (this.hammond.mesh.visible) {
      this.hammond.mesh.rotation.y = Math.atan2(px - this.hammond.gx, pz - this.hammond.gz);
      this.hammond.armR.rotation.x = -1.4 + Math.sin(performance.now() * 0.004) * 0.30;
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0 && particles && d < 240) {
        this.smokeTimer = 0.25;
        const wy = this.world.getTerrainInfo(this.wreckWorldX, this.wreckWorldZ, false).height;
        particles.emitCrashBurst(this.wreckWorldX, wy + 1.0, this.wreckWorldZ, 0.25, "rock", "clear");
      }
    }
  }
};
