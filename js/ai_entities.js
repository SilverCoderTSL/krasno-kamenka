// ============================================================================
// js/ai_entities.js (v13.9) — Biome-Specific Wildlife (Taiga Deer, River Fish,
// Snowy Mountain Goats, Desert Camels), Loose Crates & Directional Winch Cable!
// ============================================================================
window.KK = window.KK || {};

KK.EntityManager = class EntityManager {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.deers = []; this.goats = []; this.camels = []; this.fishes = []; this.looseCrates = [];
    this.zebras = []; this.giraffes = []; this.macaws = []; this.boars = []; this.polarBears = []; this.radWolves = [];

    // v14.4 THICK 3D HIGH-VISIBILITY WINCH CABLE (12-segment 3D cylinder rope + glowing hook!)
    this.winchGroup = new THREE.Group();
    this.winchGroup.visible = false;
    this.winchSegs = [];
    const ropeGeo = new THREE.CylinderGeometry(0.055, 0.055, 1.0, 8);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xffc300, emissive: 0xff7b00, emissiveIntensity: 0.55,
      roughness: 0.42, metalness: 0.55
    });
    for (let s = 0; s < 12; s++) {
      const seg = new THREE.Mesh(ropeGeo, ropeMat);
      seg.castShadow = true;
      seg.frustumCulled = false;
      this.winchGroup.add(seg);
      this.winchSegs.push(seg);
    }
    this.winchHook = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.055, 8, 14),
      new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.7 })
    );
    this.winchHook.frustumCulled = false;
    this.winchGroup.add(this.winchHook);
    this.scene.add(this.winchGroup);
    this._winchYAxis = new THREE.Vector3(0, 1, 0);
    this._winchPts = [];
    for (let i = 0; i <= 12; i++) this._winchPts.push(new THREE.Vector3());
    this._ropeGeo = ropeGeo;
    this._ropeMat = ropeMat;
    this._hookGeo = new THREE.TorusGeometry(0.18, 0.055, 8, 14);
    this._hookMat = new THREE.MeshStandardMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.65, roughness: 0.35, metalness: 0.7 });
    this.remoteWinches = new Map(); // peerId -> { group, segs, hook, data }

    this.matDeerFur   = new THREE.MeshStandardMaterial({ color: 0x6e4b30, roughness: 0.9 });
    this.matDeerBelly = new THREE.MeshStandardMaterial({ color: 0xc9b498, roughness: 0.9 });
    this.matAntler    = new THREE.MeshStandardMaterial({ color: 0xd9cbb8, roughness: 0.8 });
    this.matGoatWool  = new THREE.MeshStandardMaterial({ color: 0xedf2f4, roughness: 0.92 });
    this.matGoatHorn  = new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 0.85 });
    this.matCamelFur  = new THREE.MeshStandardMaterial({ color: 0xc99a5b, roughness: 0.94 });
    this.matFish      = new THREE.MeshStandardMaterial({ color: 0x56cfe1, roughness: 0.25, metalness: 0.55 });
    this.matFishFin   = new THREE.MeshStandardMaterial({ color: 0xff9f1c, roughness: 0.50 });

    for (let i = 0; i < 28; i++) this._spawnDeer(i, 2400, 300);
    // v15.0.2 Island-Specific Wildlife!
    this.matZebraW = new THREE.MeshStandardMaterial({ color: 0xf2f4f8, roughness: 0.88 });
    this.matZebraB = new THREE.MeshStandardMaterial({ color: 0x181a1f, roughness: 0.90 });
    this.matGiraffe = new THREE.MeshStandardMaterial({ color: 0xe6ae3a, roughness: 0.88 });
    this.matGirSpot = new THREE.MeshStandardMaterial({ color: 0x6e4219, roughness: 0.90 });
    this.matPolar   = new THREE.MeshStandardMaterial({ color: 0xeef6fc, roughness: 0.82 });
    this.matBoar    = new THREE.MeshStandardMaterial({ color: 0x453226, roughness: 0.95 });
    this.matMacawR  = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.7 });
    this.matMacawB  = new THREE.MeshStandardMaterial({ color: 0x00b4d8, roughness: 0.7 });
    this.matRadWolf = new THREE.MeshStandardMaterial({ color: 0x2b3328, roughness: 0.95 });
    this.matRadEye  = new THREE.MeshBasicMaterial({ color: 0x9eff2a });

    for (let i = 0; i < 18; i++) this._spawnIslandAnimal("zebra", i, -68000, 61000);
    for (let i = 0; i < 12; i++) this._spawnIslandAnimal("giraffe", i, -68000, 61000);
    for (let i = 0; i < 18; i++) this._spawnIslandAnimal("macaw", i, 69000, 62000);
    for (let i = 0; i < 16; i++) this._spawnIslandAnimal("boar", i, 69000, 62000);
    for (let i = 0; i < 14; i++) this._spawnIslandAnimal("polarBear", i, -65000, -67000);
    for (let i = 0; i < 12; i++) this._spawnIslandAnimal("radWolf", i, 68000, -68000);
    for (let i = 0; i < 20; i++) this._spawnGoat(i, -12000, -16000);
    for (let i = 0; i < 18; i++) this._spawnCamel(i, 2400, 6200);
    for (let i = 0; i < 20; i++) this._spawnFish(i);
    this.seaCreatures = [];
    this._initSeaEcosystem();

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

  _spawnIslandAnimal(kind, idx, cx, cz) {
    const grp = new THREE.Group();
    const legs = [];
    let wings = null;

    if (kind === "zebra") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.58, 1.48), this.matZebraW);
      body.position.y = 1.08; body.castShadow = true; grp.add(body);
      for (const sz of [-0.46, -0.16, 0.14, 0.44]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.61, 0.56, 0.12), this.matZebraB);
        st.position.set(0, 1.09, sz); grp.add(st);
      }
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.58, 0.32), this.matZebraW);
      neck.position.set(0, 1.44, 0.62); neck.rotation.x = 0.28; grp.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.46), this.matZebraB);
      head.position.set(0, 1.66, 0.84); grp.add(head);
      for (const [lx, lz] of [[-0.20, 0.52], [0.20, 0.52], [-0.20, -0.52], [0.20, -0.52]]) {
        const lg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.84, 0.11), this.matZebraW);
        lg.position.set(lx, 0.42, lz); grp.add(lg); legs.push(lg);
      }
      this.zebras.push({ id: idx, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "graze", timer: 2 + Math.random() * 4, phase: Math.random() * 6, mesh: grp, legs });
    } else if (kind === "giraffe") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.88, 1.85), this.matGiraffe);
      body.position.y = 2.05; body.castShadow = true; grp.add(body);
      for (const sz of [-0.45, 0.05, 0.48]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.34, 0.28), this.matGirSpot);
        sp.position.set(0, 2.08, sz); grp.add(sp);
      }
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.35, 0.34), this.matGiraffe);
      neck.position.set(0, 3.35, 0.78); neck.rotation.x = 0.16; grp.add(neck);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.54), this.matGiraffe);
      head.position.set(0, 4.48, 1.05); grp.add(head);
      for (const [lx, lz] of [[-0.28, 0.66], [0.28, 0.66], [-0.28, -0.66], [0.28, -0.66]]) {
        const lg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.72, 0.14), this.matGiraffe);
        lg.position.set(lx, 0.86, lz); grp.add(lg); legs.push(lg);
      }
      this.giraffes.push({ id: idx, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "wander", timer: 3 + Math.random() * 5, phase: Math.random() * 6, mesh: grp, legs });
    } else if (kind === "macaw") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.58), this.matMacawR);
      grp.add(body);
      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.28), this.matMacawB);
      wL.position.set(-0.38, 0.04, 0); grp.add(wL);
      const wR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.28), this.matMacawB);
      wR.position.set(0.38, 0.04, 0); grp.add(wR);
      wings = [wL, wR];
      this.macaws.push({ id: idx, gx: cx, gy: 24, gz: cz, yaw: Math.random() * 6.28, altOff: 9 + Math.random() * 14, phase: Math.random() * 6, mesh: grp, wings });
    } else if (kind === "boar") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 1.05), this.matBoar);
      body.position.y = 0.58; body.castShadow = true; grp.add(body);
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.34), this.matBoar);
      snout.position.set(0, 0.56, 0.62); grp.add(snout);
      for (const [lx, lz] of [[-0.20, 0.35], [0.20, 0.35], [-0.20, -0.35], [0.20, -0.35]]) {
        const lg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.11), this.matBoar);
        lg.position.set(lx, 0.21, lz); grp.add(lg); legs.push(lg);
      }
      this.boars.push({ id: idx, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "wander", timer: 2 + Math.random() * 4, phase: Math.random() * 6, mesh: grp, legs });
    } else if (kind === "polarBear") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.96, 2.05), this.matPolar);
      body.position.y = 1.08; body.castShadow = true; grp.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 0.66), this.matPolar);
      head.position.set(0, 1.24, 1.24); grp.add(head);
      for (const [lx, lz] of [[-0.36, 0.68], [0.36, 0.68], [-0.36, -0.68], [0.36, -0.68]]) {
        const lg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.24), this.matPolar);
        lg.position.set(lx, 0.36, lz); grp.add(lg); legs.push(lg);
      }
      this.polarBears.push({ id: idx, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "wander", timer: 3 + Math.random() * 5, phase: Math.random() * 6, mesh: grp, legs });
    } else if (kind === "radWolf") {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 1.25), this.matRadWolf);
      body.position.y = 0.78; grp.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.42), this.matRadWolf);
      head.position.set(0, 0.92, 0.76); grp.add(head);
      for (const ex of [-0.08, 0.08]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 5), this.matRadEye);
        eye.position.set(ex, 0.96, 0.98); grp.add(eye);
      }
      for (const [lx, lz] of [[-0.16, 0.42], [0.16, 0.42], [-0.16, -0.42], [0.16, -0.42]]) {
        const lg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.62, 0.10), this.matRadWolf);
        lg.position.set(lx, 0.31, lz); grp.add(lg); legs.push(lg);
      }
      this.radWolves.push({ id: idx, gx: cx, gy: 10, gz: cz, yaw: Math.random() * 6.28, state: "wander", timer: 2 + Math.random() * 4, phase: Math.random() * 6, mesh: grp, legs });
    }
    grp.visible = false;
    this.scene.add(grp);
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

  // ==========================================================================
  // v15.4.1 MINECRAFT-STYLE OCEAN SEA LIFE ECOSYSTEM (8 Species!)
  // Cod, Salmon, 6 Tropical Reef Fish, Inflating Pufferfish, Leaping Dolphins,
  // Gliding Sea Turtles, Manta Rays & Deep-Sea Squid — Strictly Ocean-Only!
  // ==========================================================================
  _initSeaEcosystem() {
    const matCod     = new THREE.MeshStandardMaterial({ color: 0x9b8b6b, roughness: 0.45, metalness: 0.25 });
    const matSalmon  = new THREE.MeshStandardMaterial({ color: 0xc94a38, roughness: 0.35, metalness: 0.35 });
    const matSalHead = new THREE.MeshStandardMaterial({ color: 0x3b6e5c, roughness: 0.40 });
    const matPuffer  = new THREE.MeshStandardMaterial({ color: 0xf4c430, roughness: 0.55 });
    const matPuffSpk = new THREE.MeshStandardMaterial({ color: 0xfff0b3, roughness: 0.6 });
    const matDolphin = new THREE.MeshStandardMaterial({ color: 0x7b9bb5, roughness: 0.26, metalness: 0.30 });
    const matDolBel  = new THREE.MeshStandardMaterial({ color: 0xdce6f0, roughness: 0.35 });
    const matTurtle  = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.65 });
    const matShell   = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.55 });
    const matManta   = new THREE.MeshStandardMaterial({ color: 0x222a38, roughness: 0.38, metalness: 0.25 });
    const matSquid   = new THREE.MeshStandardMaterial({ color: 0x2b3a67, roughness: 0.50 });
    const matEyeBlk  = new THREE.MeshBasicMaterial({ color: 0x0b0d10 });
    const tropColors = [0xff6b2b, 0x00b4d8, 0xffd60a, 0x9b5de5, 0xf15bb5, 0x2ec4b6];
    const tropMats = tropColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.32, metalness: 0.28 }));
    const matWhite = new THREE.MeshStandardMaterial({ color: 0xf4f7fa, roughness: 0.4 });

    const addSea = (kind, mesh, speed, zone, extra = {}) => {
      mesh.visible = false;
      this.scene.add(mesh);
      this.seaCreatures.push(Object.assign({
        kind, mesh, speed, zone,
        gx: 0, gy: -33, gz: 0, yaw: Math.random() * 6.28,
        phase: Math.random() * 14, jumpPhase: Math.random() * 10,
        puffAmt: 0
      }, extra));
    };

    // 1. 10 Cod (Temperate / All Seas)
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.30, 0.85), matCod); g.add(b);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.30), matCod); t.position.z = -0.55; g.add(t);
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.36), matCod); d.position.y = 0.20; g.add(d);
      addSea("cod", g, 3.2, "any", { tail: t });
    }
    // 2. 8 Salmon (Cool / Northern & Coastal Seas)
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 1.05), matSalmon); g.add(b);
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.32, 0.34), matSalHead); h.position.z = 0.56; g.add(h);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.34), matSalmon); t.position.z = -0.68; g.add(t);
      addSea("salmon", g, 4.2, "north", { tail: t });
    }
    // 3. 12 Vibrant Tropical Reef Fish (Warm Southern / Tropika / Savanna Seas!)
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      const cm = tropMats[i % tropMats.length];
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 0.62), cm); g.add(b);
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.39, 0.14), matWhite); st.position.z = 0.08; g.add(st);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.30, 0.24), cm); t.position.z = -0.42; g.add(t);
      addSea("tropical", g, 3.8, "south", { tail: t });
    }
    // 4. 6 Pufferfish (Inflates into a spiky ball when boats/players come near!)
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 0.52), matPuffer); g.add(core);
      const spikes = new THREE.Group();
      for (const [sx, sy, sz] of [[0.28,0,0],[-0.28,0,0],[0,0.28,0],[0,-0.28,0],[0,0,0.30],[0,0,-0.30]]) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 4), matPuffSpk);
        sp.position.set(sx, sy, sz); spikes.add(sp);
      }
      spikes.visible = false; g.add(spikes);
      addSea("puffer", g, 1.9, "south", { spikes });
    }
    // 5. 6 Playful Dolphins (Leap in graceful arcs alongside your boat!)
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.62, 2.45), matDolphin); g.add(b);
      const bel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.22, 2.2), matDolBel); bel.position.y = -0.26; g.add(bel);
      const sn = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.68), matDolphin); sn.position.set(0, -0.06, 1.48); g.add(sn);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.52), matDolphin); fin.position.set(0, 0.45, -0.1); fin.rotation.x = -0.35; g.add(fin);
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.10, 0.55), matDolphin); t.position.set(0, 0, -1.45); g.add(t);
      addSea("dolphin", g, 11.5, "any", { tail: t });
    }
    // 6. 5 Sea Turtles (Flapping flippers near beaches & warm straits!)
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 1.35), matShell); g.add(sh);
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.44), matTurtle); hd.position.set(0, 0, 0.85); g.add(hd);
      const fL = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.32), matTurtle); fL.position.set(-0.82, -0.05, 0.32); g.add(fL);
      const fR = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.32), matTurtle); fR.position.set( 0.82, -0.05, 0.32); g.add(fR);
      addSea("turtle", g, 2.4, "south", { finL: fL, finR: fR });
    }
    // 7. 4 Manta Rays (Wide diamond gliders just beneath the waves!)
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 2.2), matManta); g.add(core);
      const wL = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.10, 1.45), matManta); wL.position.set(-1.5, 0, 0.1); g.add(wL);
      const wR = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.10, 1.45), matManta); wR.position.set( 1.5, 0, 0.1); g.add(wR);
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 2.2, 5), matManta); tail.rotation.x = Math.PI / 2; tail.position.z = -2.0; g.add(tail);
      addSea("manta", g, 4.6, "any", { finL: wL, finR: wR });
    }
    // 8. 5 Ocean Squid (Bobbing with trailing tentacles in deep northern/open seas!)
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const hd = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.72), matSquid); hd.position.y = 0.25; g.add(hd);
      for (const sx of [-0.22, 0.22]) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.06), matEyeBlk); e.position.set(sx, 0.15, 0.38); g.add(e);
      }
      const tentGrp = new THREE.Group(); tentGrp.position.y = -0.25;
      for (let t = 0; t < 6; t++) {
        const a = (t / 6) * Math.PI * 2;
        const tn = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.95, 0.10), matSquid);
        tn.position.set(Math.cos(a) * 0.22, -0.45, Math.sin(a) * 0.22); tentGrp.add(tn);
      }
      g.add(tentGrp);
      addSea("squid", g, 2.1, "north", { tail: tentGrp });
    }
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

  // v17.0 KILLABLE ANIMALS FROM MG, AUTOCANNON & TANK CANNON FIRE!
  hitAnimalAt(wx, wy, wz, radius = 3.2, dmg = 100, weaponName = "gunfire") {
    const lists = [
      { arr: this.deers,  label: "Deer" },
      { arr: this.goats,  label: "Mountain Goat" },
      { arr: this.camels, label: "Desert Camel" }
    ];
    for (const grp of lists) {
      if (!grp.arr) continue;
      for (const a of grp.arr) {
        if (a.deadTimer > 0) continue;
        const d = Math.hypot(a.gx - wx, a.gz - wz);
        if (d <= radius && Math.abs((a.gy || wy) - wy) < 4.5) {
          a.hp = (a.hp !== undefined ? a.hp : 60) - dmg;
          if (a.hp <= 0) {
            a.deadTimer = 28.0;
            a.stunTimer = 28.0;
            if (a.mesh) a.mesh.rotation.z = Math.PI / 2;
            return { hit: true, killed: true, label: grp.label, x: a.gx, y: a.gy, z: a.gz };
          }
          a.stunTimer = 2.0;
          return { hit: true, killed: false, label: grp.label, x: a.gx, y: a.gy, z: a.gz };
        }
      }
    }
    return null;
  }

  update(dt, vehicle, weatherSys, onDeerImpact, sirenPos, seaFocus = null) {
    const px = seaFocus ? seaFocus.x : vehicle.pos.x, pz = seaFocus ? seaFocus.z : vehicle.pos.z;
    const playerBiomes = this.world.getBiomeWeights(px, pz);
    const isDuskOrNight = (weatherSys.timeOfDay > 17.5 || weatherSys.timeOfDay < 6.5);

    // 1. TAIGA-ONLY DEER
    const inTaiga = playerBiomes.taiga > 0.28;
    for (const d of this.deers) {
      if (d.deadTimer > 0) { d.deadTimer -= dt; if (d.deadTimer <= 0) { d.hp = 60; if (d.mesh) d.mesh.rotation.z = 0; } continue; }
      if (!inTaiga) { d.mesh.visible = false; continue; }
      const distToPlayer = Math.hypot(d.gx - px, d.gz - pz);
      if (distToPlayer > 340 || this.world.getBiomeWeights(d.gx, d.gz).taiga < 0.26) {
        const ang = Math.random() * Math.PI * 2, rad = 95 + Math.random() * 195;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if (this.world.getBiomeWeights(nx, nz).taiga > 0.30 && (!this.world.isDryInland || this.world.isDryInland(nx, nz, 6.0, 5.0))) { d.gx = nx; d.gz = nz; d.state = "wander"; d.stunTimer = 0; d.mesh.rotation.z = 0; }
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
          const dnx = d.gx + Math.sin(d.yaw) * spd * dt, dnz = d.gz + Math.cos(d.yaw) * spd * dt; if (!this.world.isDryInland || this.world.isDryInland(dnx, dnz, 5.0, 4.0)) { d.gx = dnx; d.gz = dnz; } else { d.yaw += Math.PI * 0.75; }
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
      if (g.deadTimer > 0) { g.deadTimer -= dt; if (g.deadTimer <= 0) { g.hp = 60; if (g.mesh) g.mesh.rotation.z = 0; } continue; }
      if (!inSnowMtn) { g.mesh.visible = false; continue; }
      const dP = Math.hypot(g.gx - px, g.gz - pz);
      if (dP > 320) {
        const ang = Math.random() * 6.28, rad = 85 + Math.random() * 175;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if ((this.world.getBiomeWeights(nx, nz).mountains > 0.28 || this.world.getTerrainInfo(nx, nz, false).height > 125) && (!this.world.isDryInland || this.world.isDryInland(nx, nz, 6.0, 5.0))) { g.gx = nx; g.gz = nz; }
        else { g.mesh.visible = false; continue; }
      }
      g.timer -= dt;
      if (dP < 38 && vehicle.speedKmh > 12) { g.state = "flee"; g.yaw = Math.atan2(g.gx - px, g.gz - pz); g.timer = 2.8; }
      else if (g.timer <= 0) { g.state = Math.random() < 0.5 ? "graze" : "wander"; g.yaw += (Math.random() - 0.5) * 2.4; g.timer = 2.5 + Math.random() * 4; }
      const spd = g.state === "flee" ? 9.5 : (g.state === "wander" ? 2.0 : 0);
      if (spd > 0) {
        const gnx = g.gx + Math.sin(g.yaw) * spd * dt, gnz = g.gz + Math.cos(g.yaw) * spd * dt; if (!this.world.isDryInland || this.world.isDryInland(gnx, gnz, 5.0, 4.0)) { g.gx = gnx; g.gz = gnz; } else { g.yaw += Math.PI * 0.75; }
        g.phase += dt * (g.state === "flee" ? 13 : 5);
        const sw = Math.sin(g.phase) * 0.65;
        const legs = g.mesh.userData.legs;
        legs[0].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; legs[3].rotation.x = sw;
      }
      const gti = this.world.getTerrainInfo(g.gx, g.gz, false);
      g.gy = gti.height;
      this.world.toLocal(g.gx, g.gy, g.gz, g.mesh.position); g.mesh.rotation.y = g.yaw; g.mesh.visible = dP < 270 && gti.waterDepth < 0.15;
    }

    // 3. DESERT CAMELS
    const inDesert = playerBiomes.desert > 0.34;
    for (const c of this.camels) {
      if (c.deadTimer > 0) { c.deadTimer -= dt; if (c.deadTimer <= 0) { c.hp = 80; if (c.mesh) c.mesh.rotation.z = 0; } continue; }
      if (!inDesert) { c.mesh.visible = false; continue; }
      const dP = Math.hypot(c.gx - px, c.gz - pz);
      if (dP > 360 || this.world.getBiomeWeights(c.gx, c.gz).desert < 0.30) {
        const ang = Math.random() * 6.28, rad = 95 + Math.random() * 195;
        const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
        if (this.world.getBiomeWeights(nx, nz).desert > 0.32 && (!this.world.isDryInland || this.world.isDryInland(nx, nz, 6.0, 5.0))) { c.gx = nx; c.gz = nz; c.stunTimer = 0; c.mesh.rotation.z = 0; }
        else { c.mesh.visible = false; continue; }
      }
      if (c.stunTimer > 0) { c.stunTimer -= dt; c.mesh.rotation.z = Math.PI * 0.45; if (c.stunTimer <= 0) c.mesh.rotation.z = 0; }
      else {
        c.timer -= dt;
        if (dP < 42 && vehicle.speedKmh > 16) { c.state = "flee"; c.yaw = Math.atan2(c.gx - px, c.gz - pz); c.timer = 3.2; }
        else if (c.timer <= 0) { c.state = Math.random() < 0.45 ? "graze" : "wander"; c.yaw += (Math.random() - 0.5) * 1.8; c.timer = 3 + Math.random() * 6; }
        const spd = c.state === "flee" ? 8.8 : (c.state === "wander" ? 1.9 : 0);
        if (spd > 0) {
          const cnx = c.gx + Math.sin(c.yaw) * spd * dt, cnz = c.gz + Math.cos(c.yaw) * spd * dt; if (!this.world.isDryInland || this.world.isDryInland(cnx, cnz, 5.0, 4.0)) { c.gx = cnx; c.gz = cnz; } else { c.yaw += Math.PI * 0.75; }
          c.phase += dt * (c.state === "flee" ? 9 : 4);
          const sw = Math.sin(c.phase) * 0.52;
          const legs = c.mesh.userData.legs;
          legs[0].rotation.x = sw; legs[1].rotation.x = -sw; legs[2].rotation.x = -sw; legs[3].rotation.x = sw;
        }
        const camelHitRad = Math.max(2.8, Math.max(vehicle.spec.bodyWidth, vehicle.spec.bodyLen * 0.56) * 0.54 + 0.85);
      if (dP < camelHitRad && vehicle.speedKmh > 12 && Math.abs(c.gy - vehicle.pos.y) < 3.0) { c.stunTimer = 6.0; if (onDeerImpact) onDeerImpact("camel", vehicle.speedKmh, c.gx, c.gz); }
      }
      const cti = this.world.getTerrainInfo(c.gx, c.gz, false);
      c.gy = cti.height;
      this.world.toLocal(c.gx, c.gy, c.gz, c.mesh.position); c.mesh.rotation.y = c.yaw; c.mesh.visible = dP < 310 && cti.waterDepth < 0.15;
    }

    // 3B. v15.0.2 ISLAND-SPECIFIC WILDLIFE (Savanna Zebras & Giraffes, Tropical Macaws & Boars, Arctic Polar Bears, Site-140 Rad-Wolves!)
    const updateHerd = (list, activeFlag, biomeKey, fleeSpd, walkSpd) => {
      for (const a of list) {
        if (!activeFlag) { a.mesh.visible = false; continue; }
        const dP = Math.hypot(a.gx - px, a.gz - pz);
        if (dP > 360 || (this.world.getBiomeWeights(a.gx, a.gz)[biomeKey] || 0) < 0.25) {
          const ang = Math.random() * 6.28, rad = 75 + Math.random() * 190;
          const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
          const inZCity = KK.ZOLOTOY_CITY && Math.abs(nx - KK.ZOLOTOY_CITY.cx) < (KK.ZOLOTOY_CITY.halfSpan + 40) && Math.abs(nz - KK.ZOLOTOY_CITY.cz) < (KK.ZOLOTOY_CITY.halfSpan + 40);
          if (!inZCity && (this.world.getBiomeWeights(nx, nz)[biomeKey] || 0) > 0.28 && (!this.world.isDryInland || this.world.isDryInland(nx, nz, 5.5, 5.0))) {
            a.gx = nx; a.gz = nz; a.state = "wander";
          } else { a.mesh.visible = false; continue; }
        }
        a.timer -= dt;
        if (dP < 42 && vehicle.speedKmh > 14) { a.state = "flee"; a.yaw = Math.atan2(a.gx - px, a.gz - pz); a.timer = 3.2; }
        else if (a.timer <= 0) { a.state = Math.random() < 0.4 ? "graze" : "wander"; a.yaw += (Math.random() - 0.5) * 2.0; a.timer = 2.5 + Math.random() * 5; }
        const spd = a.state === "flee" ? fleeSpd : (a.state === "wander" ? walkSpd : 0);
        if (spd > 0) {
          const anx = a.gx + Math.sin(a.yaw) * spd * dt, anz = a.gz + Math.cos(a.yaw) * spd * dt; if (!this.world.isDryInland || this.world.isDryInland(anx, anz, 5.0, 4.0)) { a.gx = anx; a.gz = anz; } else { a.yaw += Math.PI * 0.75; }
          a.phase += dt * (a.state === "flee" ? 12 : 5);
          const sw = Math.sin(a.phase) * 0.55;
          a.legs[0].rotation.x = sw; a.legs[1].rotation.x = -sw; a.legs[2].rotation.x = -sw; a.legs[3].rotation.x = sw;
        }
        const ti = this.world.getTerrainInfo(a.gx, a.gz, false);
        a.gy = ti.height; this.world.toLocal(a.gx, a.gy, a.gz, a.mesh.position);
        a.mesh.rotation.y = a.yaw; a.mesh.visible = dP < 310 && ti.waterDepth < 0.25;
      }
    };

    const inSav = (playerBiomes.savanna || 0) > 0.30;
    const inTrop = (playerBiomes.tropical || 0) > 0.30;
    const inArc = (playerBiomes.arctic || 0) > 0.30;
    const inRad = (playerBiomes.radioactive || 0) > 0.30;

    updateHerd(this.zebras,     inSav,  "savanna",     13.5, 2.8);
    updateHerd(this.giraffes,   inSav,  "savanna",      9.5, 2.2);
    updateHerd(this.boars,      inTrop, "tropical",    10.5, 2.4);
    updateHerd(this.polarBears, inArc,  "arctic",       9.0, 2.0);
    updateHerd(this.radWolves,  inRad,  "radioactive", 14.5, 3.4);

    for (const m of this.macaws) {
      if (!inTrop) { m.mesh.visible = false; continue; }
      const dP = Math.hypot(m.gx - px, m.gz - pz);
      if (dP > 320) {
        const ang = Math.random() * 6.28, rad = 40 + Math.random() * 140;
        m.gx = px + Math.cos(ang) * rad; m.gz = pz + Math.sin(ang) * rad;
      }
      m.yaw += dt * 0.45;
      m.gx += Math.sin(m.yaw) * 11.5 * dt;
      m.gz += Math.cos(m.yaw) * 11.5 * dt;
      m.phase += dt * 14.0;
      const fl = Math.sin(m.phase) * 0.62;
      m.wings[0].rotation.z = fl; m.wings[1].rotation.z = -fl;
      const gh = this.world.getTerrainInfo(m.gx, m.gz, false).height;
      m.gy = gh + m.altOff + Math.sin(m.phase * 0.12) * 2.2;
      this.world.toLocal(m.gx, m.gy, m.gz, m.mesh.position);
      m.mesh.rotation.y = m.yaw; m.mesh.visible = dP < 290;
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

    // 5. v15.4.1 MINECRAFT-STYLE OCEAN SEA LIFE (Strictly Ocean-Only — Cod, Salmon, Tropical, Puffer, Dolphins, Turtles, Mantas & Squid!)
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const pTerr = this.world.getTerrainInfo(px, pz, false);
    const nearOcean = (playerBiomes.ocean || 0) > 0.05 || pTerr.height < seaL + 8.0;
    if (this.seaCreatures) {
      for (let si = 0; si < this.seaCreatures.length; si++) {
        const sc = this.seaCreatures[si];
        if (!nearOcean) { sc.mesh.visible = false; continue; }
        // Regional ocean flavor (warm southern seas vs cool northern seas)
        if (sc.zone === "south" && pz < -5000) { sc.mesh.visible = false; continue; }
        if (sc.zone === "north" && pz >  5000) { sc.mesh.visible = false; continue; }

        const dS = Math.hypot(sc.gx - px, sc.gz - pz);
        if (dS > 240 || dS < 2 || this.world.getTerrainInfo(sc.gx, sc.gz, false).height > seaL - 1.2) {
          const ang = Math.random() * 6.28, rad = 28 + Math.random() * 145;
          const nx = px + Math.cos(ang) * rad, nz = pz + Math.sin(ang) * rad;
          if (this.world.getTerrainInfo(nx, nz, false).height < seaL - 1.8) {
            sc.gx = nx; sc.gz = nz; sc.yaw = Math.random() * 6.28;
          } else { sc.mesh.visible = false; continue; }
        }

        sc.phase += dt * (sc.kind === "dolphin" ? 5.5 : 4.2);
        sc.jumpPhase += dt * (sc.kind === "dolphin" ? 1.15 : 0.72);
        const nx = sc.gx + Math.sin(sc.yaw) * sc.speed * dt;
        const nz = sc.gz + Math.cos(sc.yaw) * sc.speed * dt;
        if (this.world.getTerrainInfo(nx, nz, false).height < seaL - 1.5) {
          sc.gx = nx; sc.gz = nz;
        } else {
          sc.yaw += Math.PI * 0.78;
        }
        sc.yaw += Math.sin(sc.phase * 0.25) * 0.35 * dt;

        let depthY = seaL - 0.55;
        let pitchX = 0;
        if (sc.kind === "dolphin") {
          const cyc = sc.jumpPhase % 4.6;
          if (cyc < 1.15) {
            const u = cyc / 1.15;
            depthY = seaL - 0.3 + Math.sin(u * Math.PI) * 2.6;
            pitchX = -Math.cos(u * Math.PI) * 0.72;
          } else {
            depthY = seaL - 0.45 + Math.sin(sc.phase) * 0.15;
          }
          if (sc.tail) sc.tail.rotation.x = Math.sin(sc.phase * 2.0) * 0.35;
        } else if (sc.kind === "puffer") {
          const scared = dS < 22;
          sc.puffAmt += ((scared ? 1.0 : 0.0) - sc.puffAmt) * Math.min(1, dt * 6);
          const s = 1.0 + sc.puffAmt * 1.15;
          sc.mesh.scale.set(s, s, s);
          if (sc.spikes) sc.spikes.visible = sc.puffAmt > 0.35;
          depthY = seaL - 0.45 + Math.sin(sc.phase) * 0.12;
        } else if (sc.kind === "turtle" || sc.kind === "manta") {
          depthY = seaL - (sc.kind === "manta" ? 0.85 : 0.35) + Math.sin(sc.phase * 0.6) * 0.12;
          const flap = Math.sin(sc.phase * 1.4) * (sc.kind === "manta" ? 0.32 : 0.45);
          if (sc.finL) sc.finL.rotation.z = flap;
          if (sc.finR) sc.finR.rotation.z = -flap;
        } else if (sc.kind === "squid") {
          depthY = seaL - 1.1 + Math.sin(sc.phase * 0.9) * 0.55;
          if (sc.tail) sc.tail.rotation.x = Math.sin(sc.phase * 1.6) * 0.28;
        } else {
          // Cod, Salmon & Tropical Fish (Occasional playful surface leaps!)
          const cyc = sc.jumpPhase % 7.5;
          if (cyc < 0.70) {
            const u = cyc / 0.70;
            depthY = seaL - 0.25 + Math.sin(u * Math.PI) * 0.95;
            pitchX = -Math.cos(u * Math.PI) * 0.55;
          } else {
            depthY = seaL - 0.42;
          }
          if (sc.tail) sc.tail.rotation.y = Math.sin(sc.phase * 3.0) * 0.42;
        }

        sc.gy = depthY;
        this.world.toLocal(sc.gx, sc.gy, sc.gz, sc.mesh.position);
        sc.mesh.rotation.set(pitchX, sc.yaw, 0, "YXZ");
        sc.mesh.visible = dS < 210;
      }
    }

    for (const c of this.looseCrates) {
      this.world.toLocal(c.gx, c.gy, c.gz, c.mesh.position);
      c.mesh.visible = Math.hypot(c.gx - px, c.gz - pz) < 250;
    }
  }

  updateWinchLine(vehicle, remotePlayersMap) {
    if (!vehicle.winch.active) { this.winchGroup.visible = false; return; }
    let anchorG = vehicle.winch.anchorPos;
    if (vehicle.winch.targetPeerId && remotePlayersMap) {
      const rp = remotePlayersMap.get(vehicle.winch.targetPeerId);
      if (rp) anchorG = new THREE.Vector3(rp.gx, rp.gy + 0.8, rp.gz);
    }
    if (!anchorG) { this.winchGroup.visible = false; return; }
    this.winchGroup.visible = true;
    const localAtt = vehicle.winch.localAttach || new THREE.Vector3(0, 0.62, vehicle.spec.bodyLen * 0.5);
    const startG = localAtt.clone().applyQuaternion(vehicle.quat).add(vehicle.pos);
    const startL = this.world.toLocal(startG.x, startG.y, startG.z, new THREE.Vector3());
    const endL = this.world.toLocal(anchorG.x, anchorG.y, anchorG.z, new THREE.Vector3());
    const dist = startL.distanceTo(endL);
    const sagAmp = Math.max(0.08, Math.min(2.4, (vehicle.winch.length - dist) * 0.18));

    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const sag = Math.sin(t * Math.PI) * sagAmp;
      this._winchPts[i].set(
        startL.x + (endL.x - startL.x) * t,
        startL.y + (endL.y - startL.y) * t - sag,
        startL.z + (endL.z - startL.z) * t
      );
    }
    const dir = new THREE.Vector3();
    for (let s = 0; s < 12; s++) {
      const a = this._winchPts[s], b = this._winchPts[s + 1];
      dir.subVectors(b, a);
      const len = Math.max(0.02, dir.length());
      const seg = this.winchSegs[s];
      seg.position.copy(a).addScaledVector(dir, 0.5);
      seg.scale.set(1, len + 0.04, 1);
      seg.quaternion.setFromUnitVectors(this._winchYAxis, dir.normalize());
    }
    this.winchHook.position.copy(endL);
    this.winchHook.lookAt(startL);
  }

  // v15.1.5 REMOTE PLAYERS' THICK 3D WINCH CABLES!
  setRemoteWinch(peerId, msg) {
    if (!peerId) return;
    if (!msg || !msg.active) {
      this.removeRemoteWinch(peerId);
      return;
    }
    let rw = this.remoteWinches.get(peerId);
    if (!rw) {
      const grp = new THREE.Group();
      const segs = [];
      for (let s = 0; s < 12; s++) {
        const seg = new THREE.Mesh(this._ropeGeo, this._ropeMat);
        seg.frustumCulled = false;
        grp.add(seg); segs.push(seg);
      }
      const hook = new THREE.Mesh(this._hookGeo, this._hookMat);
      hook.frustumCulled = false;
      grp.add(hook);
      this.scene.add(grp);
      rw = { group: grp, segs, hook, data: msg };
      this.remoteWinches.set(peerId, rw);
    } else {
      rw.data = msg;
    }
  }

  removeRemoteWinch(peerId) {
    const rw = this.remoteWinches.get(peerId);
    if (rw) {
      this.scene.remove(rw.group);
      this.remoteWinches.delete(peerId);
    }
  }

  updateRemoteWinches(localVehicle, localPeerId, remotePlayersMap) {
    if (!this.remoteWinches || this.remoteWinches.size === 0 || !remotePlayersMap) return;
    const dir = new THREE.Vector3();
    for (const [pid, rw] of this.remoteWinches.entries()) {
      const owner = remotePlayersMap.get(pid);
      if (!owner) { this.removeRemoteWinch(pid); continue; }
      const d = rw.data;
      let endG = d.anchorPos ? new THREE.Vector3(d.anchorPos.x, d.anchorPos.y, d.anchorPos.z) : null;
      if (d.targetPeerId) {
        if (d.targetPeerId === localPeerId && localVehicle) {
          endG = new THREE.Vector3(localVehicle.pos.x, localVehicle.pos.y + 0.85, localVehicle.pos.z);
        } else {
          const tp = remotePlayersMap.get(d.targetPeerId);
          if (tp) endG = new THREE.Vector3(tp.gx, tp.gy + 0.85, tp.gz);
        }
      }
      if (!endG) { rw.group.visible = false; continue; }
      rw.group.visible = true;
      const startL = this.world.toLocal(owner.gx, owner.gy + 0.85, owner.gz, new THREE.Vector3());
      const endL   = this.world.toLocal(endG.x, endG.y, endG.z, new THREE.Vector3());
      const dist = startL.distanceTo(endL);
      const sagAmp = Math.max(0.08, Math.min(2.2, ((d.length || dist) - dist) * 0.18));
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const sag = Math.sin(t * Math.PI) * sagAmp;
        this._winchPts[i].set(
          startL.x + (endL.x - startL.x) * t,
          startL.y + (endL.y - startL.y) * t - sag,
          startL.z + (endL.z - startL.z) * t
        );
      }
      for (let s = 0; s < 12; s++) {
        const a = this._winchPts[s], b = this._winchPts[s + 1];
        dir.subVectors(b, a);
        const len = Math.max(0.02, dir.length());
        const seg = rw.segs[s];
        seg.position.copy(a).addScaledVector(dir, 0.5);
        seg.scale.set(1, len + 0.04, 1);
        seg.quaternion.setFromUnitVectors(this._winchYAxis, dir.normalize());
      }
      rw.hook.position.copy(endL);
      rw.hook.lookAt(startL);
    }
  }

  setThermalMode(isFlir) {
    if (this._thermalOn === isFlir) return;
    this._thermalOn = isFlir;
    const mats = [this.matDeerFur, this.matGoatWool, this.matCamelFur, this.matFish, this.matZebraW, this.matGiraffe, this.matPolar, this.matBoar, this.matMacawR, this.matRadWolf];
    for (const m of mats) {
      if (!m || !m.emissive) continue;
      if (isFlir) { m.emissive.setHex(0xffffff); m.emissiveIntensity = 1.45; }
      else { m.emissive.setHex(0x000000); m.emissiveIntensity = 0; }
    }
  }
};
