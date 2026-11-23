// ============================================================================
// js/clarkson_farm.js (v13) — Clarkson's Farm ("Diddly Squat Oblast")
// Total Cryptid Sanctuary, Free Repairs by Jeremy Clarkson, 14 Grazing Sheep,
// & UNHINGED SUPER-STRENGTH YEET RAGE IF YOU RUN OVER HIS SHEEP!
// ============================================================================
window.KK = window.KK || {};

KK.ClarksonFarm = class ClarksonFarm {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.cfg = KK.CLARKSON_FARM;
    this.sheep = [];
    this.bleatTimer = 4.0;
    this.rageMode = false;
    this.rageTimer = 0;
    this.yeetCooldown = 0;

    this.jeremy = {
      homeX: this.cfg.shopX,
      homeZ: this.cfg.shopZ,
      gx: this.cfg.shopX,
      gy: 10,
      gz: this.cfg.shopZ,
      yaw: 0.4,
      phase: 0,
      mesh: null
    };

    this.quips = [
      "Right, I've fixed your car with a hammer. Sometimes my genius... it's almost frightening.",
      "Speed and power didn't save your suspension, did it? All patched up — on the house!",
      "Look at that, brand new headlights and fresh tires. I AM a farmer AND a mechanic!",
      "How hard can it be? Fixed your engine, hammered your tie-rod straight. Now stay off my crops!",
      "Oh no... anyway, I fixed your rig to 100%. Mind the sheep on your way out!"
    ];

    this._buildFarmStructures();
    this._buildJeremyMesh();
    this._spawnSheep();
  }

  isInsideSanctuary(gx, gz, extraPad = 0) {
    return Math.hypot(gx - this.cfg.x, gz - this.cfg.z) < (this.cfg.radius + extraPad);
  }

  _createFarmSignTexture() {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 140;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#2b2118"; ctx.fillRect(0, 0, 512, 140);
    ctx.strokeStyle = "#e6c36e"; ctx.lineWidth = 8; ctx.strokeRect(6, 6, 500, 128);
    ctx.fillStyle = "#f4e6c2"; ctx.font = "bold 36px serif"; ctx.textAlign = "center";
    ctx.fillText("DIDDLY SQUAT FARM SHOP", 256, 54);
    ctx.fillStyle = "#88d498"; ctx.font = "bold 20px monospace";
    ctx.fillText("CLARKSON'S SANCTUARY • FREE REPAIRS", 256, 94);
    ctx.fillStyle = "#ff6b6b"; ctx.font = "bold 17px monospace";
    ctx.fillText("DO NOT RUN OVER THE SHEEP!", 256, 122);
    return new THREE.CanvasTexture(cv);
  }

  _buildFarmStructures() {
    const baseH = this.cfg._baseH !== undefined ? this.cfg._baseH : this.world.getBaseHeight(this.cfg.x, this.cfg.z);
    this.cfg._baseH = baseH;
    const grp = new THREE.Group();
    grp.position.set(this.cfg.x, baseH, this.cfg.z);

    const matBarnWood = new THREE.MeshStandardMaterial({ color: 0x6e472b, roughness: 0.92 });
    const matRoofSlate = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.80 });
    const matStone = new THREE.MeshStandardMaterial({ color: 0x9c927d, roughness: 0.92 });
    const matWheat = new THREE.MeshStandardMaterial({ color: 0xd4a838, roughness: 0.94 });
    const matPlowed = new THREE.MeshStandardMaterial({ color: 0x5c3e26, roughness: 0.96 });
    const matHay = new THREE.MeshStandardMaterial({ color: 0xd9b84e, roughness: 0.95 });
    const matFence = new THREE.MeshStandardMaterial({ color: 0x7a5738, roughness: 0.94 });
    const matLamboWht = new THREE.MeshStandardMaterial({ color: 0xeaf0f4, roughness: 0.35, metalness: 0.25 });
    const matBlack = new THREE.MeshStandardMaterial({ color: 0x1a1d20, roughness: 0.92 });
    const matWin = new THREE.MeshStandardMaterial({ color: 0xffe099, emissive: 0xffb84d, emissiveIntensity: 0.65 });

    // 1. Plowed Arable Crop Fields & Golden Wheat Strips!
    for (let i = 0; i < 6; i++) {
      const strip = new THREE.Mesh(new THREE.BoxGeometry(68, 0.22, 11), i % 2 === 0 ? matWheat : matPlowed);
      strip.position.set(-54, 0.08, -58 + i * 14);
      strip.receiveShadow = true;
      grp.add(strip);
    }

    // 2. Iconic Wooden "DIDDLY SQUAT FARM SHOP" Barn (+22, -18)
    const shopX = this.cfg.shopX - this.cfg.x;
    const shopZ = this.cfg.shopZ - this.cfg.z;
    const barn = new THREE.Mesh(new THREE.BoxGeometry(16, 5.4, 10), matBarnWood);
    barn.position.set(shopX, 2.7, shopZ - 7.5); barn.castShadow = true; barn.receiveShadow = true; grp.add(barn);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(11.6, 3.8, 4), matRoofSlate);
    roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.78);
    roof.position.set(shopX, 7.2, shopZ - 7.5); grp.add(roof);

    // Big Farm Shop Signboard!
    const signMat = new THREE.MeshBasicMaterial({ map: this._createFarmSignTexture() });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10.5, 2.6, 0.24), [
      matBarnWood, matBarnWood, matBarnWood, matBarnWood, signMat, signMat
    ]);
    sign.position.set(shopX, 5.6, shopZ - 2.3); grp.add(sign);

    // Stone Cotswold-style Farmhouse + Glowing Warm Windows
    const house = new THREE.Mesh(new THREE.BoxGeometry(18, 7.8, 12), matStone);
    house.position.set(52, 3.9, -46); house.castShadow = true; grp.add(house);
    const hRoof = new THREE.Mesh(new THREE.ConeGeometry(13.5, 4.4, 4), matRoofSlate);
    hRoof.rotation.y = Math.PI / 4; hRoof.position.set(52, 9.8, -46); grp.add(hRoof);
    for (const wx of [46, 52, 58]) {
      const w1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 0.16), matWin);
      w1.position.set(wx, 4.6, -39.9); grp.add(w1);
    }

    // 3. Jeremy's Comically Giant "LAMBORGHINI" Farm Tractor Prop parked next to the barn!
    const tr = new THREE.Group();
    tr.position.set(shopX + 16, 0, shopZ - 2); tr.rotation.y = -0.5;
    const tHood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.8, 3.6), matLamboWht);
    tHood.position.set(0, 2.1, 1.2); tHood.castShadow = true; tr.add(tHood);
    const tCab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 2.2), matBlack);
    tCab.position.set(0, 3.2, -1.2); tr.add(tCab);
    const bigWheelGeo = new THREE.CylinderGeometry(1.55, 1.55, 0.85, 14); bigWheelGeo.rotateZ(Math.PI / 2);
    const smWheelGeo = new THREE.CylinderGeometry(1.05, 1.05, 0.65, 12); smWheelGeo.rotateZ(Math.PI / 2);
    for (const sx of [-1.45, 1.45]) {
      const rw = new THREE.Mesh(bigWheelGeo, matBlack); rw.position.set(sx, 1.55, -1.4); tr.add(rw);
      const fw = new THREE.Mesh(smWheelGeo, matBlack); fw.position.set(sx, 1.05, 2.1); tr.add(fw);
    }
    grp.add(tr);
    this.parkedTractorMesh = tr;
    this.tractorWorldX = this.cfg.x + shopX + 16;
    this.tractorWorldZ = this.cfg.z + shopZ - 2;
    this.tractorTaken = false;

    // 4. Golden Round Hay Bales scattered across the pasture
    const baleGeo = new THREE.CylinderGeometry(1.15, 1.15, 1.65, 12);
    baleGeo.rotateZ(Math.PI / 2);
    const baleCoords = [[-22, 34], [-18, 38], [-25, 42], [44, 24], [49, 28], [62, 12], [-58, 22]];
    for (const [bx, bz] of baleCoords) {
      const bale = new THREE.Mesh(baleGeo, matHay);
      bale.position.set(bx, 1.15, bz); bale.rotation.y = bx * 0.2; bale.castShadow = true; grp.add(bale);
    }

    // 5. Sanctuary Perimeter Wooden Paddock Fence (with wide open road entrance on East & North sides!)
    const segs = 36;
    const rF = this.cfg.radius - 12;
    const postGeo = new THREE.BoxGeometry(0.24, 1.6, 0.24);
    const railGeo = new THREE.BoxGeometry(28.0, 0.18, 0.14);
    for (let i = 0; i < segs; i++) {
      const ang = (i / segs) * Math.PI * 2;
      // Leave wide open driveways on East (ang ~0) & North (ang ~-PI/2)
      if (Math.abs(ang) < 0.26 || Math.abs(ang - Math.PI * 2) < 0.26 || Math.abs(ang - Math.PI * 1.5) < 0.26) continue;
      const fx = Math.cos(ang) * rF, fz = Math.sin(ang) * rF;
      const fSec = new THREE.Group();
      fSec.position.set(fx, 0, fz); fSec.rotation.y = -ang + Math.PI * 0.5;
      const post = new THREE.Mesh(postGeo, matFence); post.position.y = 0.8; fSec.add(post);
      const r1 = new THREE.Mesh(railGeo, matFence); r1.position.y = 1.25; fSec.add(r1);
      const r2 = new THREE.Mesh(railGeo, matFence); r2.position.y = 0.72; fSec.add(r2);
      grp.add(fSec);
    }

    // Green Sanctuary Safe-Zone Pad right next to Jeremy!
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.16, 10),
      new THREE.MeshStandardMaterial({ color: 0x38b000, emissive: 0x144500, roughness: 0.7 })
    );
    pad.position.set(shopX, 0.09, shopZ + 7.5);
    grp.add(pad);

    this.world.rootGroup.add(grp);
    this.farmGroup = grp;
  }

  _buildJeremyMesh() {
    const root = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xe6b894, roughness: 0.78 });
    const matHair = new THREE.MeshStandardMaterial({ color: 0xcbd0d6, roughness: 0.90 }); // Curly silver-grey hair!
    const matDenim = new THREE.MeshStandardMaterial({ color: 0x2d4e78, roughness: 0.85 });
    const matShirt = new THREE.MeshStandardMaterial({ color: 0x9fb8d4, roughness: 0.88 });
    const matJeans = new THREE.MeshStandardMaterial({ color: 0x223654, roughness: 0.92 });
    const matBoots = new THREE.MeshStandardMaterial({ color: 0x3b2a1d, roughness: 0.92 });
    const matEyeNormal = new THREE.MeshBasicMaterial({ color: 0x1a1e24 });

    // Slightly portly iconic Jeremy Clarkson silhouette!
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.72, 0.42), matDenim);
    torso.position.y = 1.15; torso.castShadow = true; root.add(torso);
    const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.68, 0.44), matShirt);
    shirt.position.y = 1.15; root.add(shirt);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), matSkin);
    head.position.y = 1.72; head.castShadow = true; root.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), matHair);
    hair.scale.set(1.1, 0.65, 1.1); hair.position.set(0, 1.92, -0.02); root.add(hair);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.05), matEyeNormal);
    eyeL.position.set(-0.09, 1.75, 0.17); root.add(eyeL);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.09; root.add(eyeR);

    const makeLimb = (w, h, d, mat, px, py) => {
      const piv = new THREE.Group(); piv.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = -h * 0.5; m.castShadow = true; piv.add(m); root.add(piv); return piv;
    };
    const armL = makeLimb(0.18, 0.64, 0.18, matDenim, -0.42, 1.44);
    const armR = makeLimb(0.18, 0.64, 0.18, matDenim,  0.42, 1.44);
    const legL = makeLimb(0.22, 0.78, 0.22, matJeans, -0.17, 0.80);
    const legR = makeLimb(0.22, 0.78, 0.22, matJeans,  0.17, 0.80);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.32), matBoots);
    boot.position.set(0, -0.74, 0.04); legL.add(boot); legR.add(boot.clone());

    // Trusty Clarkson Hammer in right hand!
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), new THREE.MeshStandardMaterial({ color: 0x7c5330 }));
    handle.rotation.x = Math.PI * 0.5; handle.position.set(0, -0.58, 0.22); armR.add(handle);
    const hHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.12), new THREE.MeshStandardMaterial({ color: 0x555c63, metalness: 0.7 }));
    hHead.position.set(0, -0.58, 0.46); armR.add(hHead);

    const tag = KK.VehicleBuilder.createNameSprite("JEREMY CLARKSON", "#88ff99");
    tag.position.set(0, 2.55, 0); root.add(tag);

    this.scene.add(root);
    this.jeremy.mesh = root;
    this.jeremy.parts = { armL, armR, legL, legR, matEyeNormal, tag };
  }

  _spawnSheep() {
    const matWool = new THREE.MeshStandardMaterial({ color: 0xf4f2eb, roughness: 0.96 });
    const matFace = new THREE.MeshStandardMaterial({ color: 0x22201e, roughness: 0.92 });
    for (let i = 0; i < this.cfg.sheepCount; i++) {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 1.15), matWool);
      body.position.y = 0.78; body.castShadow = true; grp.add(body);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.46, 8, 8), matWool);
      puff.scale.set(1.0, 0.85, 1.35); puff.position.y = 0.82; grp.add(puff);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.46), matFace);
      head.position.set(0, 0.96, 0.68); grp.add(head);
      for (const [lx, lz] of [[-0.24, 0.36], [0.24, 0.36], [-0.24, -0.36], [0.24, -0.36]]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.52, 0.11), matFace);
        leg.position.set(lx, 0.26, lz); grp.add(leg);
      }

      const ang = (i / this.cfg.sheepCount) * Math.PI * 2 + 0.3;
      const rad = 32 + (i % 4) * 26;
      const gx = this.cfg.x + Math.cos(ang) * rad;
      const gz = this.cfg.z + Math.sin(ang) * rad;
      const gy = this.world.getTerrainInfo(gx, gz, false).height;
      this.scene.add(grp);
      this.sheep.push({
        gx, gy, gz, yaw: Math.random() * Math.PI * 2,
        timer: 2 + Math.random() * 5, walking: false, hitCd: 0, mesh: grp
      });
    }
  }

  triggerRage(ui, audio) {
    this.rageMode = true;
    this.rageTimer = 22.0;
    this.jeremy.parts.matEyeNormal.color.setHex(0xff1111);
    if (audio) audio.playClarksonRage();
    if (ui) ui.toast('JEREMY CLARKSON: "YOU ABSOLUTE MUPPET!! YOU RAN OVER MY SHEEP!!"', true);
  }

  repairPlayerVehicle(game) {
    if (this.rageMode) {
      game.ui.toast('JEREMY CLARKSON: "FIX YOUR CAR?! AFTER WHAT YOU DID TO MY SHEEP?!"', true);
      return;
    }
    const vs = game.vehicle.vState, spec = game.vehicle.spec;
    for (const pid of Object.keys(KK.PARTS_CATALOG)) vs.parts[pid].hp = 100;
    vs.health.mudClog = 0; vs.health.tieRodBias = 0; vs.health.tires = 100; vs.health.body = 100;
    vs.health.headlightL = 100; vs.health.headlightR = 100;
    for (let i = 0; i < vs.blownTires.length; i++) { vs.blownTires[i] = false; vs.tiresHP[i] = 100; }
    vs.spareTires = spec.wheels.length >= 6 ? 3 : 2;
    vs.fuel = spec.fuelCapacity;
    vs.dirtLevel = 0;
    game.flareCount = 6;
    game.vehicle.hydrolocked = false;
    game.vehicle.engineRunning = game.vehicle.ignitionOn;
    game.vehicle.coolantTemp = 82;
    game.audio.playWrench();
    game._saveProgress(true);
    const quip = this.quips[Math.floor(Math.random() * this.quips.length)];
    game.ui.toast(`JEREMY CLARKSON (FREE REPAIR): "${quip}"`);
  }

  isNearJeremy(gx, gz) {
    if (this.rageMode) return false;
    return Math.hypot(gx - this.jeremy.gx, gz - this.jeremy.gz) < 13.5;
  }

  isNearLamboTractor(gx, gz) {
    if (this.tractorTaken) return false;
    return Math.hypot(gx - this.tractorWorldX, gz - this.tractorWorldZ) < 9.5;
  }

  borrowLamboTractor(game) {
    if (this.tractorTaken) return;
    this.tractorTaken = true;
    if (this.parkedTractorMesh) this.parkedTractorMesh.visible = false;
    if (!game.ownedVehicles.lambo_tractor) {
      game.ownedVehicles.lambo_tractor = KK.createDefaultVehicleState("lambo_tractor");
    }
    game.switchVehicle("lambo_tractor", false);
    const ty = this.world.getTerrainInfo(this.tractorWorldX, this.tractorWorldZ, true).height;
    game.vehicle.pos.set(this.tractorWorldX, ty + 1.4, this.tractorWorldZ);
    game.vehicle.vel.set(0, 0, 0);
    game.onFoot = false;
    game.localAvatar.visible = false;
    game._saveProgress(true);
    game.ui.toast('JEREMY CLARKSON: "Careful with my Lamborghini!! It\'s a bit wide for the barn door!"');
  }

  update(dt, vehicle, particles, audio, ui, game) {
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const distToFarm = Math.hypot(px - this.cfg.x, pz - this.cfg.z);
    if (this.yeetCooldown > 0) this.yeetCooldown -= dt;

    // 1. Update 14 Grazing Sheep (only active within 360m for performance!)
    if (distToFarm < 360) {
      this.bleatTimer -= dt;
      if (this.bleatTimer <= 0 && distToFarm < 190) {
        this.bleatTimer = 5.5 + Math.random() * 8.0;
        if (audio) audio.playSheepBleat();
      }
      for (const sh of this.sheep) {
        if (sh.hitCd > 0) sh.hitCd -= dt;
        sh.timer -= dt;
        if (sh.timer <= 0) {
          sh.walking = !sh.walking;
          sh.yaw += (Math.random() - 0.5) * 2.4;
          sh.timer = 2.5 + Math.random() * 5.0;
        }
        if (sh.walking) {
          const nx = sh.gx + Math.sin(sh.yaw) * 1.4 * dt;
          const nz = sh.gz + Math.cos(sh.yaw) * 1.4 * dt;
          // Keep sheep comfortably inside the fenced pasture!
          if (Math.hypot(nx - this.cfg.x, nz - this.cfg.z) < this.cfg.radius - 24) {
            sh.gx = nx; sh.gz = nz;
          } else {
            sh.yaw += Math.PI * 0.7;
          }
        }
        sh.gy = this.world.getTerrainInfo(sh.gx, sh.gz, false).height;
        this.world.toLocal(sh.gx, sh.gy, sh.gz, sh.mesh.position);
        sh.mesh.rotation.y = sh.yaw;
        sh.mesh.visible = true;

        // CHECK IF PLAYER RAN OVER A SHEEP!
        const dHit = Math.hypot(sh.gx - px, sh.gz - pz);
        if (dHit < (vehicle.spec.bodyWidth * 0.65 + 0.65) && vehicle.speedKmh > 9 && sh.hitCd <= 0 && Math.abs(sh.gy - py) < 2.5) {
          sh.hitCd = 6.0;
          if (audio) { audio.playSheepBleat(); audio.playImpact(0.55); }
          // Knock sheep sideways harmlessly into the grass — AND AWAKEN JEREMY'S WRATH!
          sh.gx += (Math.random() - 0.5) * 7;
          sh.gz += (Math.random() - 0.5) * 7;
          this.triggerRage(ui, audio);
        }
      }
    } else {
      for (const sh of this.sheep) sh.mesh.visible = false;
    }

    // 2. Update Jeremy Clarkson NPC (Friendly Mechanic OR Super-Strength Colossal Rage!)
    const j = this.jeremy;
    const jp = j.parts;
    const targetScale = this.rageMode ? 3.2 : 1.0;
    const curS = j.mesh.scale.x + (targetScale - j.mesh.scale.x) * Math.min(1, dt * 6);
    j.mesh.scale.set(curS, curS, curS);

    if (this.rageMode) {
      this.rageTimer -= dt;
      const dJ = Math.hypot(px - j.gx, pz - j.gz);
      const ang = Math.atan2(px - j.gx, pz - j.gz);
      j.yaw = ang;
      // Sprints at unstoppable 48 m/s!
      j.gx += Math.sin(ang) * 48.0 * dt;
      j.gz += Math.cos(ang) * 48.0 * dt;
      j.phase += dt * 18;

      const sw = Math.sin(j.phase) * 0.95;
      jp.legL.rotation.x = sw; jp.legR.rotation.x = -sw;
      jp.armL.rotation.x = -2.2 + sw * 0.5; jp.armR.rotation.x = -2.2 - sw * 0.5;

      // Ground shake as giant furious Clarkson sprints toward you!
      if (dJ < 120 && game) game.cameraShake = Math.max(game.cameraShake || 0, (1 - dJ / 120) * 0.65);

      // MEGA CLARKSON YEET (launches car 400+ meters away!)
      const pGroundY = this.world.getTerrainInfo(px, pz, true).height;
      if (dJ < 8.5 && (py - pGroundY) < 6.0 && this.yeetCooldown <= 0) {
        this.yeetCooldown = 10.0;
        if (audio) { audio.playClarksonRage(); audio.playImpact(1.0); }
        const yeetAng = Math.atan2(px - this.cfg.x, pz - this.cfg.z) + (Math.random() - 0.5) * 0.6;
        vehicle.applyExternalImpulse(Math.sin(yeetAng) * 62, 54.0, Math.cos(yeetAng) * 62, (Math.random() - 0.5) * 12.0);
        if (particles) particles.emitCrashBurst(px, py, pz, 1.5, "gravel", "clear");
        if (ui) ui.toast('JEREMY CLARKSON: "POWEEERRRR!! GET OFF MY FARM!!" (YEETED 400m!)', true);
        this.rageMode = false;
        this.rageTimer = 0;
        jp.matEyeNormal.color.setHex(0x1a1e24);
      }
      if (this.rageTimer <= 0) {
        this.rageMode = false;
        jp.matEyeNormal.color.setHex(0x1a1e24);
      }
    } else {
      // Walk gently back to Farm Shop & wave happily!
      const dHome = Math.hypot(j.homeX - j.gx, j.homeZ - j.gz);
      if (dHome > 1.5) {
        const hAng = Math.atan2(j.homeX - j.gx, j.homeZ - j.gz);
        j.yaw = hAng;
        j.gx += Math.sin(hAng) * 12.0 * dt;
        j.gz += Math.cos(hAng) * 12.0 * dt;
        j.phase += dt * 8;
        const sw = Math.sin(j.phase) * 0.55;
        jp.legL.rotation.x = sw; jp.legR.rotation.x = -sw;
        jp.armL.rotation.x = -sw * 0.6; jp.armR.rotation.x = sw * 0.6;
      } else {
        j.yaw = Math.atan2(px - j.gx, pz - j.gz);
        jp.legL.rotation.x = 0; jp.legR.rotation.x = 0;
        jp.armL.rotation.x = 0;
        jp.armR.rotation.x = -1.6 + Math.sin(performance.now() * 0.005) * 0.35; // Friendly hammer wave!
      }
    }

    j.gy = this.world.getTerrainInfo(j.gx, j.gz, false).height;
    this.world.toLocal(j.gx, j.gy, j.gz, j.mesh.position);
    j.mesh.rotation.y = j.yaw;
    j.mesh.visible = Math.hypot(j.gx - px, j.gz - pz) < 420;
  }
};
