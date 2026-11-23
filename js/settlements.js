// ============================================================================
// js/settlements.js (v10) — Lively, Thematic Settlements for All 10 Towns!
// Each settlement has custom architecture, welcome signage, night lights,
// glowing windows, animated radar/turbines/beacons & biome-authentic props!
// ============================================================================
window.KK = window.KK || {};

KK.SettlementBuilder = {
  createTownSignTexture(title, subtitle, accentColor = "#ffd166") {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 128;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#161d26";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 500, 116);
    ctx.fillStyle = accentColor;
    ctx.font = "bold 36px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title.toUpperCase().slice(0, 24), 256, 48);
    ctx.fillStyle = "#dce6f2";
    ctx.font = "bold 20px monospace";
    ctx.fillText(subtitle.slice(0, 38), 256, 92);
    return new THREE.CanvasTexture(cv);
  },

  createBridgeSignTexture(name, typeLabel, maxTons, conditionLabel, accentColor) {
    const cv = document.createElement("canvas");
    cv.width = 384; cv.height = 160;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f2c12e";
    ctx.fillRect(0, 0, 384, 160);
    ctx.strokeStyle = "#15181c";
    ctx.lineWidth = 10;
    ctx.strokeRect(7, 7, 370, 146);
    ctx.fillStyle = "#15181c";
    ctx.font = "bold 24px monospace";
    ctx.textAlign = "center";
    ctx.fillText(typeLabel.toUpperCase().slice(0, 22), 192, 36);
    ctx.fillStyle = accentColor || "#b81d24";
    ctx.font = "bold 46px monospace";
    ctx.fillText(`MAX ${maxTons} TON`, 192, 92);
    ctx.fillStyle = "#15181c";
    ctx.font = "bold 21px monospace";
    ctx.fillText(`STATE: ${conditionLabel}`, 192, 134);
    return new THREE.CanvasTexture(cv);
  },

  initMaterials() {
    if (this.mats) return this.mats;
    this.mats = {
      concrete:   new THREE.MeshStandardMaterial({ color: 0x7c807e, roughness: 0.92 }),
      concreteLt: new THREE.MeshStandardMaterial({ color: 0x9fa4a1, roughness: 0.88 }),
      brick:      new THREE.MeshStandardMaterial({ color: 0x8a4836, roughness: 0.90 }),
      sandstone:  new THREE.MeshStandardMaterial({ color: 0xc9a06a, roughness: 0.88 }),
      woodLog:    new THREE.MeshStandardMaterial({ color: 0x69462a, roughness: 0.94 }),
      woodDark:   new THREE.MeshStandardMaterial({ color: 0x452d1a, roughness: 0.95 }),
      rust:       new THREE.MeshStandardMaterial({ color: 0x6e402c, roughness: 0.82, metalness: 0.35 }),
      steel:      new THREE.MeshStandardMaterial({ color: 0x444c54, roughness: 0.62, metalness: 0.55 }),
      whiteDome:  new THREE.MeshStandardMaterial({ color: 0xeaf0f5, roughness: 0.45 }),
      yellowInd:  new THREE.MeshStandardMaterial({ color: 0xdba018, roughness: 0.52, metalness: 0.25 }),
      redMetal:   new THREE.MeshStandardMaterial({ color: 0xb52b2b, roughness: 0.58 }),
      blueMetal:  new THREE.MeshStandardMaterial({ color: 0x2b5e8a, roughness: 0.58 }),
      greenMetal: new THREE.MeshStandardMaterial({ color: 0x356b46, roughness: 0.62 }),
      fabric:     new THREE.MeshStandardMaterial({ color: 0xd9532f, roughness: 0.92 }),
      fabricAlt:  new THREE.MeshStandardMaterial({ color: 0x2a8c82, roughness: 0.92 }),
      palmLeaf:   new THREE.MeshStandardMaterial({ color: 0x2d6b35, roughness: 0.85 }),
      oasisWater: new THREE.MeshStandardMaterial({ color: 0x1eb8b8, roughness: 0.18, metalness: 0.2, transparent: true, opacity: 0.82 }),
      obsidian:   new THREE.MeshStandardMaterial({ color: 0x26242b, roughness: 0.88 }),
      lavaPipe:   new THREE.MeshBasicMaterial({ color: 0xff5a14 }),
      // Shared night-lit glowing window & lamp materials (updated live at dusk/night!)
      windowGlow: new THREE.MeshStandardMaterial({ color: 0x32404e, emissive: 0xffb84d, emissiveIntensity: 0.15, roughness: 0.3 }),
      lampBulb:   new THREE.MeshBasicMaterial({ color: 0xffe4a1 }),
      blinkRed:   new THREE.MeshBasicMaterial({ color: 0xff2222 }),
      fireGlow:   new THREE.MeshBasicMaterial({ color: 0xff7b1c }),
      helipad:    new THREE.MeshStandardMaterial({ color: 0xd96b18, roughness: 0.72 })
    };
    return this.mats;
  },

  _addStreetLamp(grp, x, z, mats, nightLights) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 6), mats.steel);
    pole.position.set(x, 3.1, z);
    grp.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.10, 0.10), mats.steel);
    arm.position.set(x + 0.45, 6.1, z);
    grp.add(arm);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.24), mats.lampBulb);
    bulb.position.set(x + 0.90, 5.96, z);
    grp.add(bulb);
    if (nightLights) nightLights.push(bulb);
  },

  _addWelcomeSign(grp, town, x, z, rotY, subtitle, accent) {
    const mats = this.initMaterials();
    const sGrp = new THREE.Group();
    sGrp.position.set(x, 0, z);
    sGrp.rotation.y = rotY;
    for (const px of [-3.6, 3.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 4.8, 6), mats.steel);
      post.position.set(px, 2.4, 0);
      sGrp.add(post);
    }
    const boardMat = new THREE.MeshBasicMaterial({ map: this.createTownSignTexture(town.name, subtitle, accent) });
    const board = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.9, 0.22), [
      mats.steel, mats.steel, mats.steel, mats.steel, boardMat, boardMat
    ]);
    board.position.set(0, 4.1, 0);
    sGrp.add(board);
    grp.add(sGrp);
  },

  _addLogCabin(grp, x, z, rotY, w, h, d, mats) {
    const c = new THREE.Group();
    c.position.set(x, 0, z); c.rotation.y = rotY;
    const base = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.woodLog);
    base.position.y = h * 0.5; base.castShadow = true; c.add(base);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.2, 4), mats.woodDark);
    roof.rotation.y = Math.PI / 4; roof.position.y = h + 1.05; c.add(roof);
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.4, 0.65), mats.brick);
    chim.position.set(w * 0.28, h + 1.2, d * 0.15); c.add(chim);
    for (const wx of [-w * 0.25, w * 0.25]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.12), mats.windowGlow);
      win.position.set(wx, h * 0.55, d * 0.5 + 0.03); c.add(win);
    }
    grp.add(c);
  },

  _addCampfire(grp, x, z, mats, animList) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 8), mats.rust);
    barrel.position.set(x, 0.48, z); grp.add(barrel);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.95, 6), mats.fireGlow);
    flame.position.set(x, 1.25, z); grp.add(flame);
    animList.push({ type: "flame", mesh: flame, baseY: 1.25 });
  },

  // Decorates each town's Group (local coords centered on town.x, town.y, town.z)
  // Leaves central yard (0,0), Garage (+24,-5.5) and Dock (-22,-3.5) completely unobstructed!
  decorateTown(town, grp, animList, nightLights) {
    const mats = this.initMaterials();

    // Streetlamps flanking Garage & Cargo Dock in every town!
    this._addStreetLamp(grp, 14, -4, mats, nightLights);
    this._addStreetLamp(grp, -11, -2, mats, nightLights);
    this._addStreetLamp(grp, 0, 22, mats, nightLights);

    // ------------------------------------------------------------------------
    // TOWN 0: KAMENKA-CENTRAL HQ (Soviet Industrial Hub & Apartment Quarter)
    // ------------------------------------------------------------------------
    if (town.id === 0) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "OBLAST TRANSPORT HQ • GARAGE & DISPATCH", "#ffd166");

      // Soviet Khrushchyovka 4-story Apartment Block w/ Glowing Warm Windows!
      const apt = new THREE.Mesh(new THREE.BoxGeometry(26, 13.5, 11), mats.concreteLt);
      apt.position.set(-42, 6.75, -36); apt.castShadow = true; grp.add(apt);
      for (let floor = 0; floor < 4; floor++) {
        for (let col = -9; col <= 9; col += 4.5) {
          const wMesh = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 0.16), mats.windowGlow);
          wMesh.position.set(-42 + col, 2.4 + floor * 3.0, -30.45); grp.add(wMesh);
        }
      }

      // Red/White Soviet Radio Comms Mast with Blinking Aviation Light
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.62, 26, 6), mats.redMetal);
      mast.position.set(44, 13, -34); grp.add(mast);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mats.blinkRed);
      beacon.position.set(44, 26.5, -34); grp.add(beacon);
      animList.push({ type: "blink", mesh: beacon });

      // Fuel Station Canopy & Twin Diesel Pumps (South-East yard)
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(12, 0.55, 8), mats.blueMetal);
      canopy.position.set(36, 4.6, 26); grp.add(canopy);
      for (const px of [31, 41]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.45, 4.6, 0.45), mats.whiteDome);
        pil.position.set(px, 2.3, 26); grp.add(pil);
      }
      for (const px of [34.5, 37.5]) {
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.65), mats.redMetal);
        pump.position.set(px, 0.92, 26); grp.add(pump);
      }

      // Stacked Colored Shipping Containers
      const contCols = [mats.redMetal, mats.blueMetal, mats.yellowInd];
      for (let i = 0; i < 3; i++) {
        const c = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.8, 2.6), contCols[i]);
        c.position.set(-44, i === 2 ? 4.2 : 1.4, 26 + (i === 1 ? 3.2 : 0));
        c.castShadow = true; grp.add(c);
      }
      this._addCampfire(grp, -18, 28, mats, animList);
    }

    // ------------------------------------------------------------------------
    // TOWN 1: KAMENKA OUTPOST EAST (Frontier Taiga Checkpoint)
    // ------------------------------------------------------------------------
    else if (town.id === 1) {
      this._addWelcomeSign(grp, town, -38, 18, Math.PI * 0.5, "TAIGA FRONTIER • BEWARE FOREST YETI", "#2de08b");
      // Wooden Frontier Watchtower
      const legs = [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]];
      for (const [lx, lz] of legs) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 11, 6), mats.woodDark);
        post.position.set(40 + lx, 5.5, -30 + lz); grp.add(post);
      }
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.6, 3.2, 5.6), mats.woodLog);
      cabin.position.set(40, 12.2, -30); cabin.castShadow = true; grp.add(cabin);
      const tRoof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.6, 4), mats.woodDark);
      tRoof.rotation.y = Math.PI / 4; tRoof.position.set(40, 15.1, -30); grp.add(tRoof);

      this._addLogCabin(grp, -38, -32, 0.3, 8.5, 3.6, 6.2, mats);
      this._addLogCabin(grp, -24, 34, -0.4, 7.2, 3.4, 5.6, mats);
      this._addCampfire(grp, 12, 28, mats, animList);
    }

    // ------------------------------------------------------------------------
    // TOWN 2: RZHAVSK FLOODED DEPOT (Rusty River Port & Water Tower)
    // ------------------------------------------------------------------------
    else if (town.id === 2) {
      this._addWelcomeSign(grp, town, 0, -42, 0, "RZHAVSK RIVER PORT • FLOOD WARNING", "#48cae4");
      // Tall Rusty Water Tower
      for (const [lx, lz] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 14, 6), mats.rust);
        leg.position.set(-40 + lx, 7, -34 + lz); grp.add(leg);
      }
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 5.2, 12), mats.rust);
      tank.position.set(-40, 16.2, -34); tank.castShadow = true; grp.add(tank);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.6, 12), mats.steel);
      cap.position.set(-40, 20.1, -34); grp.add(cap);

      // Tilted Rusted River Barge Hull resting on the flooded yard!
      const barge = new THREE.Mesh(new THREE.BoxGeometry(16, 2.6, 6.2), mats.rust);
      barge.position.set(38, 1.1, 32); barge.rotation.set(0.08, 0.45, -0.14); barge.castShadow = true; grp.add(barge);
      const wheelhouse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.8, 3.4), mats.concreteLt);
      wheelhouse.position.set(42, 3.4, 30); wheelhouse.rotation.y = 0.45; grp.add(wheelhouse);

      // Rusted Port Gantry Crane
      for (const cx of [-42, -30]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.8, 12, 0.8), mats.yellowInd);
        leg.position.set(cx, 6, 32); grp.add(leg);
      }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(16, 1.1, 1.2), mats.yellowInd);
      beam.position.set(-36, 12.2, 32); grp.add(beam);
    }

    // ------------------------------------------------------------------------
    // TOWN 3: GORGE OASIS CROSSING (Desert Palm Spring & Sandstone Bazaar)
    // ------------------------------------------------------------------------
    else if (town.id === 3) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "RED SANDS OASIS • KILL ENGINE FOR SANDWYRM", "#ffbe0b");
      // Turquoise Oasis Pond + 5 Sculpted Palm Trees!
      const pond = new THREE.Mesh(new THREE.CircleGeometry(14, 16), mats.oasisWater);
      pond.rotation.x = -Math.PI / 2; pond.position.set(-36, 0.14, 30); grp.add(pond);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const px = -36 + Math.cos(ang) * 14.5, pz = 30 + Math.sin(ang) * 14.5;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 7.5, 6), mats.woodLog);
        trunk.position.set(px, 3.7, pz); trunk.rotation.z = Math.cos(ang) * 0.18; grp.add(trunk);
        for (let f = 0; f < 5; f++) {
          const fa = (f / 5) * Math.PI * 2;
          const frond = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 0.85), mats.palmLeaf);
          frond.position.set(px + Math.cos(fa) * 1.4, 7.4, pz + Math.sin(fa) * 1.4);
          frond.rotation.y = -fa; frond.rotation.z = -0.32; grp.add(frond);
        }
      }
      // Sandstone Adobe Bazaar + Colorful Market Canopies
      const adobe = new THREE.Mesh(new THREE.BoxGeometry(16, 5.2, 10), mats.sandstone);
      adobe.position.set(38, 2.6, -34); adobe.castShadow = true; grp.add(adobe);
      for (let m = 0; m < 3; m++) {
        const stall = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.18, 4.2), m % 2 === 0 ? mats.fabric : mats.fabricAlt);
        stall.position.set(28 + m * 6.5, 3.4, 28); grp.add(stall);
      }
    }

    // ------------------------------------------------------------------------
    // TOWN 4: CHERNY LES LOGGING CAMP (Sawmill, Giant Timber Crane & Log Stacks)
    // ------------------------------------------------------------------------
    else if (town.id === 4) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "CHERNY LES TIMBER MILL • LOG TRAILER HUB", "#ffb703");
      // Big Timber Sawmill Shed
      const mill = new THREE.Mesh(new THREE.BoxGeometry(20, 7.2, 12), mats.woodDark);
      mill.position.set(-40, 3.6, -34); mill.castShadow = true; grp.add(mill);
      const mRoof = new THREE.Mesh(new THREE.BoxGeometry(21.5, 0.8, 13.5), mats.redMetal);
      mRoof.position.set(-40, 7.5, -34); grp.add(mRoof);

      // Towering Yellow Timber Loading Crane (Slowly sways!)
      const cMast = new THREE.Mesh(new THREE.BoxGeometry(1.4, 16, 1.4), mats.yellowInd);
      cMast.position.set(40, 8, 28); grp.add(cMast);
      const cBoomPiv = new THREE.Group();
      cBoomPiv.position.set(40, 15.8, 28);
      const cBoom = new THREE.Mesh(new THREE.BoxGeometry(18, 1.0, 1.0), mats.yellowInd);
      cBoom.position.set(6, 0, 0); cBoomPiv.add(cBoom);
      grp.add(cBoomPiv);
      animList.push({ type: "sway", mesh: cBoomPiv, speed: 0.35, amp: 0.55 });

      // Huge Stacked Pine Log Pyramids!
      const logGeo = new THREE.CylinderGeometry(0.48, 0.50, 9.5, 7);
      logGeo.rotateX(Math.PI / 2);
      for (let stack = 0; stack < 2; stack++) {
        const bx = -38 + stack * 12, bz = 32;
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 4 - row; col++) {
            const lg = new THREE.Mesh(logGeo, mats.woodLog);
            lg.position.set(bx + (col - (3 - row) * 0.5) * 1.02, 0.5 + row * 0.88, bz);
            grp.add(lg);
          }
        }
      }
      this._addLogCabin(grp, 42, -32, -0.3, 8.0, 3.6, 6.0, mats);
    }

    // ------------------------------------------------------------------------
    // TOWN 5: KLYUCHI WEATHER STATION (Geodesic Radome, Wind Turbine & Helipad)
    // ------------------------------------------------------------------------
    else if (town.id === 5) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "KLYUCHI ALPINE METEO • SNOWMAN ZONE", "#72efdd");
      // Iconic White Geodesic Weather Radome on Concrete Pedestal!
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 6.2, 4.5, 10), mats.concrete);
      ped.position.set(-40, 2.25, -34); grp.add(ped);
      const dome = new THREE.Mesh(new THREE.IcosahedronGeometry(6.8, 1), mats.whiteDome);
      dome.position.set(-40, 9.5, -34); dome.castShadow = true; grp.add(dome);

      // Spinning Alpine Wind Turbine!
      const wTower = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.65, 22, 8), mats.whiteDome);
      wTower.position.set(42, 11, -32); grp.add(wTower);
      const hub = new THREE.Group(); hub.position.set(42, 22, -31.2);
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.5, 0.14), mats.whiteDome);
        const piv = new THREE.Group(); piv.rotation.z = (b / 3) * Math.PI * 2;
        blade.position.y = 3.75; piv.add(blade); hub.add(piv);
      }
      grp.add(hub);
      animList.push({ type: "spinZ", mesh: hub, speed: 2.2 });

      // Orange Arctic Helipad with "H" Marking!
      const hPad = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 11.2, 0.45, 16), mats.helipad);
      hPad.position.set(34, 0.22, 30); grp.add(hPad);
      const hBarL = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 6.8), mats.whiteDome);
      hBarL.position.set(31.5, 0.28, 30); grp.add(hBarL);
      const hBarR = hBarL.clone(); hBarR.position.x = 36.5; grp.add(hBarR);
      const hMid = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.5, 1.1), mats.whiteDome);
      hMid.position.set(34, 0.28, 30); grp.add(hMid);
    }

    // ------------------------------------------------------------------------
    // TOWN 6: SEVERNY IRON QUARRY (Ore Crusher Conveyor & Giant Dump Truck!)
    // ------------------------------------------------------------------------
    else if (town.id === 6) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "SEVERNY IRON QUARRY • HEAVY HAUL ONLY", "#ff9f1c");
      // Massive Ore Crusher Tower & Inclined Conveyor Belt
      const hopper = new THREE.Mesh(new THREE.BoxGeometry(12, 11, 10), mats.rust);
      hopper.position.set(-42, 5.5, -34); hopper.castShadow = true; grp.add(hopper);
      const conv = new THREE.Mesh(new THREE.BoxGeometry(24, 1.4, 2.6), mats.steel);
      conv.position.set(-28, 6.2, -34); conv.rotation.z = -0.32; grp.add(conv);
      const orePile = new THREE.Mesh(new THREE.ConeGeometry(10, 7.5, 8), mats.obsidian);
      orePile.position.set(-14, 3.7, -34); grp.add(orePile);

      // Giant Parked BelAZ-Style Yellow Mining Dump Truck Prop!
      const dt = new THREE.Group();
      dt.position.set(40, 0, 30); dt.rotation.y = -0.6;
      const dBody = new THREE.Mesh(new THREE.BoxGeometry(5.8, 3.6, 10.5), mats.yellowInd);
      dBody.position.y = 3.8; dBody.castShadow = true; dt.add(dBody);
      const dCab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 2.6), mats.whiteDome);
      dCab.position.set(-1.3, 6.2, 3.6); dt.add(dCab);
      const tireGeo = new THREE.CylinderGeometry(1.75, 1.75, 1.1, 12); tireGeo.rotateZ(Math.PI / 2);
      for (const wx of [-2.8, 2.8]) {
        for (const wz of [-3.2, 3.2]) {
          const t = new THREE.Mesh(tireGeo, mats.obsidian);
          t.position.set(wx, 1.75, wz); dt.add(t);
        }
      }
      grp.add(dt);
    }

    // ------------------------------------------------------------------------
    // TOWN 7: VOLCHYA FAR-EAST OUTPOST (Frontier Beacon Lighthouse & Cabins)
    // ------------------------------------------------------------------------
    else if (town.id === 7) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "VOLCHYA FAR-EAST • END OF THE LINE", "#ff4d6d");
      // Brick Frontier Beacon Lighthouse Tower!
      const lh = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.8, 20, 10), mats.brick);
      lh.position.set(40, 10, -34); lh.castShadow = true; grp.add(lh);
      const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 2.6, 10), mats.lampBulb);
      lantern.position.set(40, 21.2, -34); grp.add(lantern);
      const lhRoof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 2.4, 10), mats.redMetal);
      lhRoof.position.set(40, 23.6, -34); grp.add(lhRoof);

      this._addLogCabin(grp, -40, -32, 0.25, 9.5, 4.0, 6.8, mats);
      this._addLogCabin(grp, -36, 30, -0.35, 8.2, 3.6, 6.0, mats);
      this._addCampfire(grp, 18, 28, mats, animList);
    }

    // ------------------------------------------------------------------------
    // TOWN 8: BURAN DESERT RADAR (Giant Rotating Cold-War Dish & Bunkers)
    // ------------------------------------------------------------------------
    else if (town.id === 8) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "BURAN RADAR ARRAY • RESTRICTED SECTOR", "#00e5ff");
      // Giant Rotating Parabolic Military Radar Dish!
      const rBase = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 5.2, 7.5, 8), mats.concrete);
      rBase.position.set(-40, 3.75, -34); grp.add(rBase);
      const dishPiv = new THREE.Group();
      dishPiv.position.set(-40, 9.8, -34);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 1.4, 2.8, 14, 1, true), mats.whiteDome);
      dish.rotation.x = Math.PI * 0.36; dishPiv.add(dish);
      const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 4.5, 6), mats.redMetal);
      feed.rotation.x = Math.PI * 0.36; feed.position.set(0, 1.4, 1.8); dishPiv.add(feed);
      grp.add(dishPiv);
      animList.push({ type: "spinY", mesh: dishPiv, speed: 0.55 });

      // Concrete Military Bunker + Twin Fuel Silos
      const bunk = new THREE.Mesh(new THREE.BoxGeometry(16, 4.8, 12), mats.concrete);
      bunk.position.set(40, 2.4, 30); bunk.castShadow = true; grp.add(bunk);
      for (const sx of [34, 42]) {
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 9.5, 12), mats.sandstone);
        silo.position.set(sx, 4.75, -34); grp.add(silo);
      }
    }

    // ------------------------------------------------------------------------
    // TOWN 9: VULKAN GEOTHERMAL BASE (Cooling Towers & Glowing Magma Pipes!)
    // ------------------------------------------------------------------------
    else if (town.id === 9) {
      this._addWelcomeSign(grp, town, 0, -44, 0, "VULKAN GEOTHERMAL • T-REX & LAVA ZONE", "#ff5e1a");
      // Twin Hyperbolic Geothermal Steam Cooling Towers!
      for (const [tx, tz] of [[-40, -34], [-24, -40]]) {
        const tBot = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 6.2, 10, 12), mats.concrete);
        tBot.position.set(tx, 5, tz); tBot.castShadow = true; grp.add(tBot);
        const tTop = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.2, 6.5, 12), mats.concreteLt);
        tTop.position.set(tx, 13.2, tz); grp.add(tTop);
      }
      // Glowing Orange Geothermal Magma Conduit Pipelines!
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 36, 8), mats.lavaPipe);
      pipe.rotation.z = Math.PI / 2; pipe.position.set(18, 2.2, 34); grp.add(pipe);
      // Reinforced Obsidian Research Dome
      const dome = new THREE.Mesh(new THREE.SphereGeometry(7.2, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.obsidian);
      dome.position.set(40, 0, -32); dome.castShadow = true; grp.add(dome);
      const vBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), mats.blinkRed);
      vBeacon.position.set(40, 7.6, -32); grp.add(vBeacon);
      animList.push({ type: "blink", mesh: vBeacon });
    }

    // v14.0A: ELABORATE LIVELY SOVIET TOWN INFRASTRUCTURE
    const isDesert = (town.biome === "desert");
    const isSnow = (town.biome === "mountains");
    const wallMat = isDesert ? mats.sandstone : (isSnow ? mats.concrete : (town.id % 2 === 0 ? mats.concrete : mats.brick));

    const aptH = isDesert ? 7.4 : 10.6;
    const apt = new THREE.Mesh(new THREE.BoxGeometry(22, aptH, 9.5), wallMat);
    apt.position.set(-22, aptH * 0.5, 44); apt.castShadow = true; apt.receiveShadow = true; grp.add(apt);
    const aptRoof = new THREE.Mesh(new THREE.BoxGeometry(22.6, 0.55, 10.1), mats.steel);
    aptRoof.position.set(-22, aptH + 0.25, 44); grp.add(aptRoof);
    const floors = isDesert ? 2 : 3;
    for (let fl = 0; fl < floors; fl++) {
      for (let wx = -8.5; wx <= 8.5; wx += 3.4) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.35, 0.14), mats.windowGlow);
        win.position.set(-22 + wx, 2.3 + fl * 3.1, 39.2); grp.add(win);
      }
    }

    const busStop = new THREE.Group();
    busStop.position.set(22, 0, -34);
    const bsBack = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.7, 0.22), mats.concrete);
    bsBack.position.set(0, 1.35, -1.2); busStop.add(bsBack);
    const bsRoof = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.22, 2.6), mats.redMetal);
    bsRoof.position.set(0, 2.75, 0); busStop.add(bsRoof);
    for (const bx of [-2.6, 2.6]) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.20, 2.7, 2.4), mats.concrete);
      side.position.set(bx, 1.35, 0); busStop.add(side);
    }
    const bench = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 0.55), mats.woodDark);
    bench.position.set(0, 0.55, -0.7); busStop.add(bench);
    grp.add(busStop);

    const azs = new THREE.Group();
    azs.position.set(-34, 0, 18);
    const canRoof = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.45, 6.8), mats.yellowInd);
    canRoof.position.set(0, 4.6, 0); canRoof.castShadow = true; azs.add(canRoof);
    for (const [px, pz] of [[-4.2, -2.2], [4.2, -2.2], [-4.2, 2.2], [4.2, 2.2]]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 4.6, 8), mats.steel);
      col.position.set(px, 2.3, pz); azs.add(col);
    }
    for (const px of [-2.4, 2.4]) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.65, 0.52), mats.redMetal);
      pump.position.set(px, 0.84, 0); azs.add(pump);
    }
    grp.add(azs);

    const carCols = [0x4c6b78, 0x8a3d36, 0xb8a36e, 0x3b5241];
    const parkedPos = [[18, 36, 0.15], [-8, 34, -0.35], [32, -16, 1.52]];
    for (let pi = 0; pi < parkedPos.length; pi++) {
      const [px, pz, ry] = parkedPos[pi];
      const pc = new THREE.Group();
      pc.position.set(px, 0, pz); pc.rotation.y = ry;
      const cMat = new THREE.MeshStandardMaterial({ color: carCols[(town.id + pi) % carCols.length], roughness: 0.65 });
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.62, 4.05), cMat);
      b1.position.y = 0.62; b1.castShadow = true; pc.add(b1);
      const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.54, 1.95), cMat);
      b2.position.set(0, 1.18, -0.15); pc.add(b2);
      const wg = new THREE.CylinderGeometry(0.30, 0.30, 0.20, 10); wg.rotateZ(Math.PI / 2);
      for (const [wx, wz] of [[-0.84, 1.25], [0.84, 1.25], [-0.84, -1.25], [0.84, -1.25]]) {
        const wh = new THREE.Mesh(wg, mats.obsidian); wh.position.set(wx, 0.30, wz); pc.add(wh);
      }
      grp.add(pc);
    }

    for (const [lx, lz] of [[14, 24], [-14, 24], [14, -22], [-18, -22]]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 5.8, 6), mats.steel);
      pole.position.set(lx, 2.9, lz); grp.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats.lampBulb);
      bulb.position.set(lx, 5.9, lz); grp.add(bulb);
    }
  },

  updateAnimations(dt, isNight, animList, nightLights) {
    const mats = this.mats;
    if (!mats) return;
    // Automatically glow windows & streetlamps warm amber at dusk/night!
    mats.windowGlow.emissiveIntensity = isNight ? 1.35 : 0.08;
    mats.lampBulb.color.setHex(isNight ? 0xfff0b3 : 0x6b7075);

    const t = performance.now() * 0.001;
    const blinkOn = (Math.floor(t * 2.2) % 2) === 0;
    mats.blinkRed.color.setHex(blinkOn ? 0xff1e1e : 0x3b0808);

    for (let i = 0; i < animList.length; i++) {
      const a = animList[i];
      if (a.type === "spinY") a.mesh.rotation.y += a.speed * dt;
      else if (a.type === "spinZ") a.mesh.rotation.z += a.speed * dt;
      else if (a.type === "sway") a.mesh.rotation.y = Math.sin(t * a.speed) * a.amp;
      else if (a.type === "flame") {
        const sc = 0.85 + Math.sin(t * 14 + i) * 0.22;
        a.mesh.scale.set(sc, sc * 1.15, sc);
      }
    }
  }
};
