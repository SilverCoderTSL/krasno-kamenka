// ============================================================================
// js/military_camp.js (v13.95 HF2) — Secret Abandoned Military Camp on the
// Taiga / Northern Foothills Border:
//   • 55m Rusted Lattice Radar Tower + Blinking Red Strobe (visible 2.2 km!)
//   • 1.5 km Approach Breadcrumb Trail (ЗАПРЕТНАЯ ЗОНА signs, poles, fuel truck)
//   • Broken-Down T-72B Relic Hull ([5] Hoist) + $15,000 Military Stash ([E])
// ============================================================================
window.KK = window.KK || {};

KK.MilitaryCamp = class MilitaryCamp {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    // Fallback offline random border coords (overwritten by authoritative server snapshot `milCamp`!)
    this.gx = 5800 + Math.random() * 8800;
    this.gz = -4500 - Math.random() * 2400;
    this.gy = 20;
    this.discovered = false;
    this.stashClaimed = false;
    this.relicHoisted = false;
    this.relicMesh = null;
    this.radarMesh = null;
    this.strobeCore = null;
    this.strobeHalo = null;
    this.strobePhase = 0;
    this.smokeTimer = 0;
    this.breadcrumbs = [];

    // 1. Long-range 55m Radar Tower + Blinking Red Aviation Strobe (visible out to 2,200 m!)
    this.beaconGroup = new THREE.Group();
    this._buildLongRangeRadar();
    this.scene.add(this.beaconGroup);

    // 2. Main Compound (Bunkers, T-72 Relic, Crates, Perimeter — visible out to 680 m)
    this.group = new THREE.Group();
    this._buildCampProps();
    this.scene.add(this.group);

    // 3. 1.5 km Military Debris Breadcrumb Trail radiating SW toward roads
    this._buildBreadcrumbs();

    this.setLocation(this.gx, this.gz);
  }

  _createRestrictedSignTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 160;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#c8c2b2"; ctx.fillRect(0, 0, 256, 160);
    // Soviet Red-White Warning Border
    ctx.strokeStyle = "#9e1c1c"; ctx.lineWidth = 14; ctx.strokeRect(7, 7, 242, 146);
    ctx.fillStyle = "#8a1616"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
    ctx.fillText("ЗАПРЕТНАЯ", 128, 56);
    ctx.fillText("ЗОНА", 128, 86);
    ctx.fillStyle = "#22201d"; ctx.font = "bold 15px monospace";
    ctx.fillText("ОБЪЕКТ-72 • СТОЙ!", 128, 122);
    // Rust speckles
    ctx.fillStyle = "rgba(88, 52, 26, 0.35)";
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 53) % 240, (i * 37) % 148, 9, 6);
    }
    return new THREE.CanvasTexture(cv);
  }

  _buildLongRangeRadar() {
    const matRust = new THREE.MeshStandardMaterial({ color: 0x5d3d29, roughness: 0.90, metalness: 0.38 });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x262220, roughness: 0.92 });

    // 55m Tall Tapered Soviet Lattice Mast (clears the 40m Siberian pines!)
    const mastX = -18, mastZ = -18;
    const legGeo = new THREE.CylinderGeometry(0.18, 0.34, 55, 6);
    for (const [lx, lz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
      const leg = new THREE.Mesh(legGeo, matRust);
      leg.position.set(mastX + lx * 0.55, 27.5, mastZ + lz * 0.55);
      leg.rotation.z = lx > 0 ? 0.025 : -0.025;
      leg.rotation.x = lz > 0 ? -0.025 : 0.025;
      leg.castShadow = true;
      this.beaconGroup.add(leg);
    }
    // Horizontal cross-platforms every 10m
    for (let h = 10; h <= 50; h += 10) {
      const w = 3.2 - (h / 55) * 1.4;
      const brace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.32, w), matDark);
      brace.position.set(mastX, h, mastZ);
      this.beaconGroup.add(brace);
    }

    // Large Rotating Soviet Parabolic Radar Dish at y = 52.5m
    const dishPivot = new THREE.Group();
    dishPivot.position.set(mastX, 52.5, mastZ);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 0.85, 1.7, 14), matRust);
    dish.rotation.x = Math.PI * 0.38;
    dishPivot.add(dish);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 4.8, 6), matDark);
    spire.position.y = 2.4;
    dishPivot.add(spire);
    this.beaconGroup.add(dishPivot);
    this.radarMesh = dishPivot;

    // Slow-Blinking Red Aviation Warning Strobe (fog: false so it pierces distance as a tiny red pinprick!)
    const matCore = new THREE.MeshBasicMaterial({ color: 0xff2a2a, fog: false });
    const matHalo = new THREE.MeshBasicMaterial({
      color: 0xff1e1e, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false, fog: false
    });
    this.strobeCore = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), matCore);
    this.strobeCore.position.set(mastX, 56.6, mastZ);
    this.beaconGroup.add(this.strobeCore);

    this.strobeHalo = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 10), matHalo);
    this.strobeHalo.position.set(mastX, 56.6, mastZ);
    this.beaconGroup.add(this.strobeHalo);
  }

  _buildCampProps() {
    const matConc  = new THREE.MeshStandardMaterial({ color: 0x62696c, roughness: 0.94 });
    const matRust  = new THREE.MeshStandardMaterial({ color: 0x593d2b, roughness: 0.92, metalness: 0.35 });
    const matOlive = new THREE.MeshStandardMaterial({ color: 0x3b4832, roughness: 0.88, metalness: 0.22 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.94 });
    const matCrate = new THREE.MeshStandardMaterial({ color: 0x4d5c3a, roughness: 0.85 });

    // 1. Two Weathered Concrete Soviet Pillbox Bunkers
    for (const [bx, bz, ry] of [[-14, -10, 0.3], [16, -12, -0.4]]) {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(10, 4.2, 8), matConc);
      bk.position.set(bx, 2.1, bz); bk.rotation.y = ry; bk.castShadow = true; bk.receiveShadow = true;
      this.group.add(bk);
      const slit = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.55, 0.3), matDark);
      slit.position.set(bx, 2.8, bz + 4.0); slit.rotation.y = ry; this.group.add(slit);
    }

    // 2. Half-Buried Broken-Down T-72 Relic Hull ([5] Hoist onto Trailer!)
    const t72 = new THREE.Group();
    t72.position.set(0, 0, 2); t72.rotation.set(0.06, 0.45, -0.08);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.15, 6.6), matOlive);
    hull.position.y = 0.95; hull.castShadow = true; t72.add(hull);
    for (const sx of [-1.72, 1.72]) {
      const trk = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.92, 6.4), matDark);
      trk.position.set(sx, 0.55, 0); t72.add(trk);
    }
    const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.62, 0.78, 12), matOlive);
    turret.position.set(0, 1.85, 0.35); turret.castShadow = true; t72.add(turret);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 10), matRust);
    barrel.rotation.x = Math.PI / 2 - 0.08; barrel.position.set(0, 1.92, 3.85); t72.add(barrel);
    const tag = KK.VehicleBuilder.createNameSprite("BROKEN T-72 RELIC [5 HOIST]", "#ffd166");
    tag.position.set(0, 3.5, 0); t72.add(tag);
    this.group.add(t72);
    this.relicMesh = t72;

    // 3. Military Supply Stash Crates
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 1.1), matCrate);
      c.position.set(8 + i * 1.9, 0.48, 5); this.group.add(c);
    }

    // 4. Perimeter rusted posts
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      if (Math.abs(a - Math.PI * 0.5) < 0.35) continue;
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 5), matRust);
      p.position.set(Math.cos(a) * 28, 1.2, Math.sin(a) * 28);
      this.group.add(p);
    }
  }

  // 1.5 km Military Debris Breadcrumb Trail radiating SW toward Kamenka/Cherny Les!
  _buildBreadcrumbs() {
    const matConc  = new THREE.MeshStandardMaterial({ color: 0x73797d, roughness: 0.94 });
    const matRust  = new THREE.MeshStandardMaterial({ color: 0x5c3e2a, roughness: 0.92, metalness: 0.35 });
    const matOlive = new THREE.MeshStandardMaterial({ color: 0x3b4832, roughness: 0.90 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.95 });
    const matSign  = new THREE.MeshBasicMaterial({ map: this._createRestrictedSignTex() });

    const makeWarningSign = () => {
      const g = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.8, 6), matRust);
      post.position.y = 1.4; g.add(post);
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.15, 0.08), [matRust, matRust, matRust, matRust, matSign, matSign]);
      board.position.set(0, 2.35, 0); g.add(board);
      return g;
    };

    const makePowerPole = () => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 11.5, 7), matConc);
      pole.position.y = 5.6; pole.rotation.z = 0.14; pole.castShadow = true; g.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 0.18), matRust);
      arm.position.set(-0.7, 10.6, 0); arm.rotation.z = 0.14; g.add(arm);
      return g;
    };

    const makeRustedFuelTruck = () => {
      const g = new THREE.Group();
      // Half-buried abandoned Soviet military fuel tanker pointing toward the camp!
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.7, 2.1), matOlive);
      cab.position.set(0, 1.15, 2.0); cab.rotation.set(0.08, 0, -0.14); cab.castShadow = true; g.add(cab);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 4.2, 10), matRust);
      tank.rotation.x = Math.PI / 2; tank.position.set(0, 1.35, -1.2); tank.rotation.z = -0.14; tank.castShadow = true; g.add(tank);
      const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.34, 10); wGeo.rotateZ(Math.PI / 2);
      for (const [wx, wz] of [[-1.12, 2.1], [1.12, 2.1], [-1.12, -0.6], [1.12, -0.6], [-1.12, -2.1], [1.12, -2.1]]) {
        const wh = new THREE.Mesh(wGeo, matDark); wh.position.set(wx, 0.42, wz); g.add(wh);
      }
      const s = makeWarningSign(); s.position.set(3.4, 0, 1.2); s.rotation.y = 0.4; g.add(s);
      return g;
    };

    const makeCheckpoint = () => {
      const g = new THREE.Group();
      const booth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.5, 2.4), matConc);
      booth.position.set(-3.6, 1.25, 0); booth.castShadow = true; g.add(booth);
      const barPost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.3, 0.35), matRust);
      barPost.position.set(3.2, 0.65, 0); g.add(barPost);
      const barArm = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.14, 0.14), matSign);
      barArm.position.set(0.2, 1.25, 0); barArm.rotation.z = 0.22; g.add(barArm);
      const pole = makePowerPole(); pole.position.set(-5.8, 0, -2.0); g.add(pole);
      return g;
    };

    // 4 Breadcrumb Waystations radiating SW (dx = -0.68, dz = +0.73) from the camp up to 1,450 m!
    const defs = [
      { dist: 380,  yaw: 0.75, build: makeCheckpoint },
      { dist: 720,  yaw: 0.72, build: makeRustedFuelTruck },
      { dist: 1080, yaw: 0.80, build: () => { const g = new THREE.Group(); g.add(makePowerPole()); const s = makeWarningSign(); s.position.set(2.8, 0, 1.0); g.add(s); return g; } },
      { dist: 1450, yaw: 0.68, build: () => { const g = new THREE.Group(); const s = makeWarningSign(); s.rotation.z = 0.12; g.add(s); const p = makePowerPole(); p.position.set(-3.5, 0, -1.5); g.add(p); return g; } }
    ];

    for (const d of defs) {
      const mesh = d.build();
      mesh.rotation.y = d.yaw;
      mesh.visible = false;
      this.scene.add(mesh);
      this.breadcrumbs.push({ dist: d.dist, ox: -0.68 * d.dist, oz: 0.73 * d.dist, gx: 0, gy: 10, gz: 0, mesh });
    }
  }

  setLocation(gx, gz) {
    this.gx = Number(gx) || this.gx;
    this.gz = Number(gz) || this.gz;
    if (this.world.setMilCampLocation) this.world.setMilCampLocation(this.gx, this.gz);
    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
    for (const b of this.breadcrumbs) {
      b.gx = this.gx + b.ox;
      b.gz = this.gz + b.oz;
      b.gy = this.world.getTerrainInfo(b.gx, b.gz, false).height;
    }
  }

  setRelicVisible(vis) {
    this.relicHoisted = !vis;
    if (this.relicMesh) this.relicMesh.visible = !!vis;
  }

  isNearRelic(gx, gz, maxDist = 20.0) {
    if (this.relicHoisted) return false;
    return Math.hypot(gx - this.gx, gz - (this.gz + 2)) < maxDist;
  }

  isNearCamp(gx, gz) {
    return Math.hypot(gx - this.gx, gz - this.gz) < 22.0;
  }

  interact(game) {
    if (!this.stashClaimed) {
      this.stashClaimed = true;
      game.money += 15000;
      game.audio.playCash();
      game._saveProgress(true);
      game.ui.toast("SECRET MILITARY CAMP STASH FOUND! +$15,000! Bring a Car-Carrier or Flatbed Trailer & press [5] to hoist the broken T-72!");
    } else {
      game.ui.toast(this.relicHoisted ? "Abandoned Soviet Border Outpost — T-72 Relic salvaged!" : "Hitch a Car-Carrier or Flatbed Trailer ([J]), pull beside the broken T-72 & press [5] to hoist it to Richard Hammond!");
    }
  }

  update(dt, vehicle, particles, ui, weatherSys) {
    const px = vehicle.pos.x, pz = vehicle.pos.z;
    const d = Math.hypot(this.gx - px, this.gz - pz);
    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;

    // 1. Long-Range 55m Radar Tower + Slow-Blinking Red Aviation Strobe (visible up to 2,250 m!)
    this.world.toLocal(this.gx, this.gy, this.gz, this.beaconGroup.position);
    this.beaconGroup.visible = d < 2250;
    if (this.beaconGroup.visible) {
      if (this.radarMesh) this.radarMesh.rotation.y += dt * 0.34;
      this.strobePhase += dt;
      // Sharp eerie aviation strobe pulse every 1.85 seconds!
      const cyc = this.strobePhase % 1.85;
      const pulse = cyc < 0.28 ? Math.sin((cyc / 0.28) * Math.PI) : 0.06;
      const weatherAtten = (weatherSys && weatherSys.weather === "fog") ? 0.30 : ((weatherSys && weatherSys.weather === "storm") ? 0.60 : 1.0);
      const distScale = 1.0 + Math.min(2.2, d / 900);
      if (this.strobeCore) {
        this.strobeCore.visible = pulse > 0.1;
        this.strobeCore.scale.setScalar(distScale * (0.7 + pulse * 0.6));
      }
      if (this.strobeHalo) {
        this.strobeHalo.material.opacity = pulse * 0.68 * weatherAtten;
        this.strobeHalo.scale.setScalar(distScale * (0.8 + pulse * 1.1));
      }
    }

    // 2. Main Compound (visible up to 680 m)
    this.world.toLocal(this.gx, this.gy, this.gz, this.group.position);
    this.group.visible = d < 680;
    if (this.group.visible) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0 && particles && d < 520) {
        this.smokeTimer = 0.25;
        particles.emitCrashBurst(this.gx, this.gy + 2.4, this.gz + 2, 0.36, "rock", "clear");
      }
      if (!this.discovered && d < 55) {
        this.discovered = true;
        if (ui) ui.toast("DISCOVERED: Secret Abandoned Soviet Military Border Camp! Press [F] for Stash or [F]/[5] to Hoist T-72!");
      }
    }

    // 3. 1.5 km Approach Breadcrumb Trail Props (each renders cleanly within 480 m)
    for (const b of this.breadcrumbs) {
      const db = Math.hypot(b.gx - px, b.gz - pz);
      b.mesh.visible = db < 480;
      if (b.mesh.visible) {
        b.gy = this.world.getTerrainInfo(b.gx, b.gz, false).height;
        this.world.toLocal(b.gx, b.gy, b.gz, b.mesh.position);
      }
    }
  }
};


// ============================================================================
// EXTRA SECRET SOVIET RELIC SITES (v13.99) — BM-21 "Grad" & ZSU-23-4 "Shilka"
// ============================================================================
KK.SecretRelicSite = class SecretRelicSite {
  constructor(scene, world, kind) {
    this.scene = scene;
    this.world = world;
    this.kind = kind; // "bm21" | "shilka"
    this.isBm21 = (kind === "bm21");
    this.gx = this.isBm21 ? (5800 + Math.random() * 7200) : (-11000 + Math.random() * 5000);
    this.gz = this.isBm21 ? (7800 + Math.random() * 6400) : (-3600 + Math.random() * 5000);
    this.gy = 20;
    this.discovered = false;
    this.stashClaimed = false;
    this.relicHoisted = false;
    this.strobePhase = Math.random() * 2;
    this.smokeTimer = 0;

    this.beaconGroup = new THREE.Group();
    this.group = new THREE.Group();
    this._buildSite();
    this.scene.add(this.beaconGroup);
    this.scene.add(this.group);
    this.setLocation(this.gx, this.gz);
  }

  _buildSite() {
    const matConc  = new THREE.MeshStandardMaterial({ color: 0x666c6f, roughness: 0.94 });
    const matRust  = new THREE.MeshStandardMaterial({ color: 0x5d3d29, roughness: 0.92, metalness: 0.36 });
    const matOlive = new THREE.MeshStandardMaterial({ color: 0x3b4832, roughness: 0.88, metalness: 0.22 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x1a1e20, roughness: 0.94 });
    const strobeCol = this.isBm21 ? 0xff9f1c : 0x2de08b;

    // 50m Rusted Lattice Mast + Colored Blinking Aviation Strobe (visible 2.2 km!)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.85, 50, 6), matRust);
    mast.position.set(-16, 25, -16); mast.castShadow = true; this.beaconGroup.add(mast);
    this.strobeCore = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), new THREE.MeshBasicMaterial({ color: strobeCol, fog: false }));
    this.strobeCore.position.set(-16, 51.2, -16); this.beaconGroup.add(this.strobeCore);
    this.strobeHalo = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 12, 10),
      new THREE.MeshBasicMaterial({ color: strobeCol, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })
    );
    this.strobeHalo.position.set(-16, 51.2, -16); this.beaconGroup.add(this.strobeHalo);

    // Concrete Revetment Bunker & Ammo Crates
    const bk = new THREE.Mesh(new THREE.BoxGeometry(11, 3.8, 7.5), matConc);
    bk.position.set(14, 1.9, -11); bk.rotation.y = -0.35; bk.castShadow = true; this.group.add(bk);
    for (let i = 0; i < 4; i++) {
      const cr = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.0), matOlive);
      cr.position.set(-8 - i * 1.4, 0.45, 7); this.group.add(cr);
    }

    // Broken Relic Prop (BM-21 Katyusha Rocket Truck OR ZSU-23-4 Shilka SPAAG!)
    const rel = new THREE.Group();
    rel.position.set(0, 0, 2); rel.rotation.set(0.05, 0.55, -0.06);
    if (this.isBm21) {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.85, 2.5), matOlive);
      cab.position.set(0, 1.45, 2.1); rel.add(cab);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.92, 3.1), matRust);
      pod.position.set(0, 2.05, -1.55); pod.rotation.x = -0.28; rel.add(pod);
      const tag = KK.VehicleBuilder.createNameSprite("BROKEN BM-21 GRAD RELIC [5 HOIST]", "#ff9f1c");
      tag.position.set(0, 4.1, 0); rel.add(tag);
    } else {
      const hull = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.05, 6.2), matOlive);
      hull.position.y = 0.85; rel.add(hull);
      const tur = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.72, 2.3), matRust);
      tur.position.set(0, 1.72, 0); rel.add(tur);
      for (const bx of [-0.30, 0.30]) {
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 2.6, 7), matDark);
        bar.rotation.x = Math.PI / 2 - 0.25; bar.position.set(bx, 1.92, 2.15); rel.add(bar);
      }
      const tag = KK.VehicleBuilder.createNameSprite("BROKEN ZSU-23-4 SHILKA RELIC [5 HOIST]", "#2de08b");
      tag.position.set(0, 3.8, 0); rel.add(tag);
    }
    this.group.add(rel);
    this.relicMesh = rel;
  }

  setLocation(gx, gz) {
    this.gx = Number(gx) || this.gx;
    this.gz = Number(gz) || this.gz;
    if (this.world.setSecretCampPad) this.world.setSecretCampPad(this.kind, this.gx, this.gz);
    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
  }

  setRelicVisible(vis) {
    this.relicHoisted = !vis;
    if (this.relicMesh) this.relicMesh.visible = !!vis;
  }

  isNearRelic(gx, gz, maxDist = 22.0) {
    if (this.relicHoisted) return false;
    return Math.hypot(gx - this.gx, gz - (this.gz + 2)) < maxDist;
  }

  isNearCamp(gx, gz) { return Math.hypot(gx - this.gx, gz - this.gz) < 22.0; }

  interact(game) {
    const nm = this.isBm21 ? 'BM-21 "Grad" Rocket Battery' : 'ZSU-23-4 "Shilka" Air-Defense Site';
    if (!this.stashClaimed) {
      this.stashClaimed = true;
      game.money += 12000;
      game.audio.playCash();
      game._saveProgress(true);
      game.ui.toast(`SECRET ${nm.toUpperCase()} STASH! +$12,000! Bring a Car-Carrier or Flatbed Trailer & press [5] to hoist the relic to Richard Hammond!`);
    } else {
      game.ui.toast(this.relicHoisted ? `${nm} — Relic salvaged!` : `Pull a Car-Carrier or Flatbed Trailer beside the ${this.isBm21 ? "BM-21 Grad" : "ZSU-23-4 Shilka"} & press [5] to hoist it to Richard Hammond!`);
    }
  }

  update(dt, vehicle, particles, ui, weatherSys) {
    const px = vehicle.pos.x, pz = vehicle.pos.z;
    const d = Math.hypot(this.gx - px, this.gz - pz);
    this.gy = this.world.getTerrainInfo(this.gx, this.gz, false).height;
    this.world.toLocal(this.gx, this.gy, this.gz, this.beaconGroup.position);
    this.beaconGroup.visible = d < 2250;
    if (this.beaconGroup.visible) {
      this.strobePhase += dt;
      const cyc = this.strobePhase % 2.1;
      const pulse = cyc < 0.28 ? Math.sin((cyc / 0.28) * Math.PI) : 0.06;
      const atten = (weatherSys && weatherSys.weather === "fog") ? 0.30 : 1.0;
      const dSc = 1.0 + Math.min(2.2, d / 900);
      this.strobeCore.visible = pulse > 0.1;
      this.strobeCore.scale.setScalar(dSc * (0.7 + pulse * 0.6));
      this.strobeHalo.material.opacity = pulse * 0.65 * atten;
      this.strobeHalo.scale.setScalar(dSc * (0.8 + pulse * 1.1));
    }
    this.world.toLocal(this.gx, this.gy, this.gz, this.group.position);
    this.group.visible = d < 680;
    if (this.group.visible) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0 && particles && d < 500) {
        this.smokeTimer = 0.28;
        particles.emitCrashBurst(this.gx, this.gy + 2.2, this.gz + 2, 0.32, "rock", "clear");
      }
      if (!this.discovered && d < 55) {
        this.discovered = true;
        if (ui) ui.toast(`DISCOVERED: Secret ${this.isBm21 ? "BM-21 Grad Rocket Battery" : "ZSU-23-4 Shilka Air-Defense Site"}! Press [F] for Stash or [F]/[5] to Hoist!`);
      }
    }
  }
};
