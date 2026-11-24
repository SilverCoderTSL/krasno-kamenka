// ============================================================================
// js/vehicle_builder.js (v5) — 9 Sculpted Cars, Dirt & Mud Overlay,
// Headlight Glow Halos (No Ugly Cones!), Exhaust Backfire Flames & Avatars
// ============================================================================
window.KK = window.KK || {};

KK.VehicleBuilder = {
  _glowTexWarm: null,
  _glowTexCool: null,

  getGlowTexture(isCool = false) {
    if (isCool && this._glowTexCool) return this._glowTexCool;
    if (!isCool && this._glowTexWarm) return this._glowTexWarm;
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    if (isCool) {
      g.addColorStop(0, "rgba(235, 250, 255, 1.0)");
      g.addColorStop(0.25, "rgba(165, 230, 255, 0.72)");
      g.addColorStop(0.6, "rgba(110, 200, 255, 0.18)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
    } else {
      g.addColorStop(0, "rgba(255, 252, 225, 1.0)");
      g.addColorStop(0.25, "rgba(255, 238, 170, 0.72)");
      g.addColorStop(0.6, "rgba(255, 210, 120, 0.18)");
      g.addColorStop(1, "rgba(0, 0, 0, 0)");
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(cv);
    if (isCool) this._glowTexCool = tex; else this._glowTexWarm = tex;
    return tex;
  },

  createNameSprite(text, color = "#ffffff") {
    const canvas = document.createElement("canvas");
    canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(10, 14, 20, 0.72)";
    ctx.fillRect(8, 12, 240, 40);
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.strokeRect(8, 12, 240, 40);
    ctx.fillStyle = color; ctx.font = "bold 24px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(text.slice(0, 16), 128, 33);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const spr = new THREE.Sprite(mat);
    spr.scale.set(3.2, 0.8, 1);
    return spr;
  },

  createPlateTexture(plateText) {
    const cv = document.createElement("canvas");
    cv.width = 160; cv.height = 48;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#f2f4f7"; ctx.fillRect(0, 0, 160, 48);
    ctx.strokeStyle = "#182026"; ctx.lineWidth = 5; ctx.strokeRect(2, 2, 156, 44);
    ctx.fillStyle = "#184e9e"; ctx.fillRect(4, 4, 22, 40);
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 11px monospace"; ctx.fillText("KK", 8, 28);
    ctx.fillStyle = "#111418"; ctx.font = "bold 24px monospace"; ctx.textAlign = "center";
    ctx.fillText(plateText, 92, 32);
    return new THREE.CanvasTexture(cv);
  },

  // Builds a custom faceted stealth-polyhedral 3D armor hull/turret from vertices & quad/tri faces
  _buildFacetedMesh(verts, faces, mat) {
    const pos = [];
    const pushTri = (a, b, c) => {
      pos.push(verts[a][0], verts[a][1], verts[a][2], verts[b][0], verts[b][1], verts[b][2], verts[c][0], verts[c][1], verts[c][2]);
    };
    for (const f of faces) {
      if (f.length === 3) pushTri(f[0], f[1], f[2]);
      else if (f.length === 4) { pushTri(f[0], f[1], f[2]); pushTri(f[0], f[2], f[3]); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  },

  _extrudeSideProfile(shape, width, material, bevelSize = 0.06, bevelThick = 0.07, hollowCfg = null, pillarMat = null) {
    if (hollowCfg && KK.CockpitBuilder) {
      return KK.CockpitBuilder.buildHollowExtrudedBody(shape, width, material, bevelSize, bevelThick, hollowCfg, pillarMat);
    }
    const innerDepth = Math.max(0.05, width - bevelThick * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: innerDepth, bevelEnabled: true, bevelThickness: bevelThick,
      bevelSize: bevelSize, bevelSegments: 3, curveSegments: 10
    });
    geo.translate(0, 0, -innerDepth * 0.5);
    geo.rotateY(-Math.PI / 2);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  },

  _addInterior(chassis, zCenter, yFloor, width, hasRearBench = false) {
    const matSeat = new THREE.MeshStandardMaterial({ color: 0x26292e, roughness: 0.92 });
    const matDash = new THREE.MeshStandardMaterial({ color: 0x1b1e23, roughness: 0.88 });
    const dash = new THREE.Mesh(new THREE.BoxGeometry(width * 0.84, 0.24, 0.34), matDash);
    dash.position.set(0, yFloor + 0.42, zCenter + 0.52); chassis.add(dash);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 6, 14), matDash);
    wheel.position.set(-width * 0.24, yFloor + 0.52, zCenter + 0.34); wheel.rotation.x = 0.42; chassis.add(wheel);

    for (const sx of [-width * 0.24, width * 0.24]) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.44), matSeat);
      cushion.position.set(sx, yFloor + 0.14, zCenter); chassis.add(cushion);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.54, 0.11), matSeat);
      back.position.set(sx, yFloor + 0.42, zCenter - 0.18); back.rotation.x = -0.15; chassis.add(back);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.09), matSeat);
      head.position.set(sx, yFloor + 0.74, zCenter - 0.22); chassis.add(head);
    }
    if (hasRearBench) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.14, 0.44), matSeat);
      bench.position.set(0, yFloor + 0.14, zCenter - 0.72); chassis.add(bench);
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(width * 0.76, 0.52, 0.12), matSeat);
      bBack.position.set(0, yFloor + 0.42, zCenter - 0.90); chassis.add(bBack);
    }
  },

  _addFenderFlares(chassis, wheels, wheelRadius, matFlare, flareWidth = 0.15) {
    for (const w of wheels) {
      const side = w.x < 0 ? -1 : 1;
      const rOuter = wheelRadius + 0.13;
      const arch = new THREE.Mesh(new THREE.TorusGeometry(rOuter, flareWidth * 0.48, 8, 16, Math.PI), matFlare);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(w.x + side * 0.03, w.y + 0.32, w.z);
      arch.castShadow = true; chassis.add(arch);

      if (!w.steer) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.03), matFlare);
        flap.position.set(w.x, w.y + 0.06, w.z - wheelRadius - 0.12); chassis.add(flap);
      }
    }
  },

  _addMirrors(chassis, halfW, yPos, zPos, matArm, matHousing, size = 0.22) {
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.038, 0.038), matArm);
      arm.position.set(side * (halfW + 0.08), yPos, zPos); chassis.add(arm);
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.07, size, size * 0.72), matHousing);
      mir.position.set(side * (halfW + 0.19), yPos + 0.02, zPos - 0.02); mir.castShadow = true; chassis.add(mir);
    }
  },

  _addUndercarriage(chassis, spec, matMetal) {
    const railGeo = new THREE.BoxGeometry(0.14, 0.14, spec.bodyLen * 0.86);
    const railL = new THREE.Mesh(railGeo, matMetal); railL.position.set(-spec.bodyWidth * 0.25, 0.24, 0); chassis.add(railL);
    const railR = railL.clone(); railR.position.x = spec.bodyWidth * 0.25; chassis.add(railR);

    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.65, 8), matMetal);
    muffler.rotation.x = Math.PI / 2; muffler.position.set(spec.bodyWidth * 0.22, 0.22, -spec.bodyLen * 0.25); chassis.add(muffler);
    const tailPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.58, 8), matMetal);
    tailPipe.rotation.x = Math.PI / 2; tailPipe.position.set(spec.bodyWidth * 0.26, 0.24, -spec.bodyLen * 0.45); chassis.add(tailPipe);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, spec.bodyLen * 0.58, 6), matMetal);
    shaft.rotation.x = Math.PI / 2; shaft.position.set(0, 0.16, 0); chassis.add(shaft);
    const diffF = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), matMetal);
    diffF.position.set(0, 0.14, spec.wheels[0].z); chassis.add(diffF);
    const diffR = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), matMetal);
    diffR.position.set(0, 0.14, spec.wheels[spec.wheels.length - 1].z); chassis.add(diffR);
  },

  buildHumanAvatar(callsign = "DRIVER", jacketColor = 0xd96b27) {
    const root = new THREE.Group();
    const matSkin = new THREE.MeshStandardMaterial({ color: 0xe3b38a, roughness: 0.78 });
    const matJacket = new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.85 });
    const matPants = new THREE.MeshStandardMaterial({ color: 0x26323e, roughness: 0.92 });
    const matBoot = new THREE.MeshStandardMaterial({ color: 0x1b1815, roughness: 0.92 });
    const matHat = new THREE.MeshStandardMaterial({ color: 0x2e3b2e, roughness: 0.88 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.28), matJacket);
    torso.position.y = 1.06; torso.castShadow = true; root.add(torso);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.10, 0.30), new THREE.MeshBasicMaterial({ color: 0xddf23d }));
    stripe.position.y = 1.02; root.add(stripe);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.30, 0.30), matSkin);
    head.position.y = 1.54; head.castShadow = true; root.add(head);
    const hat = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), matHat);
    hat.position.y = 1.71; root.add(hat);

    const makeLimb = (w, h, d, mat, px, py) => {
      const piv = new THREE.Group(); piv.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.y = -h * 0.5; m.castShadow = true; piv.add(m); root.add(piv);
      return piv;
    };

    const armL = makeLimb(0.15, 0.54, 0.16, matJacket, -0.33, 1.32);
    const armR = makeLimb(0.15, 0.54, 0.16, matJacket,  0.33, 1.32);
    const legL = makeLimb(0.18, 0.72, 0.20, matPants,  -0.14, 0.74);
    const legR = makeLimb(0.18, 0.72, 0.20, matPants,   0.14, 0.74);

    const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.28), matBoot);
    bootL.position.set(0, -0.68, 0.04); legL.add(bootL);
    legR.add(bootL.clone());

    const heldCrate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.44, 0.56), new THREE.MeshStandardMaterial({ color: 0xb07c40, roughness: 0.85 }));
    heldCrate.position.set(0, 1.12, 0.48); heldCrate.visible = false; root.add(heldCrate);
    const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.42), new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.8, roughness: 0.3 }));
    wrench.position.set(0, -0.48, 0.18); wrench.visible = false; armR.add(wrench);

    const tag = this.createNameSprite(callsign, "#ffd166");
    tag.position.set(0, 2.22, 0); root.add(tag);

    root.userData = {
      armL, armR, legL, legR, heldCrate, wrench, tag,
      animate(walkPhase, isMoving, carrying, repairing) {
        const sw = isMoving ? Math.sin(walkPhase) * 0.65 : 0;
        legL.rotation.x = sw; legR.rotation.x = -sw;
        if (carrying) { armL.rotation.x = -1.25; armR.rotation.x = -1.25; }
        else if (repairing) { armL.rotation.x = -0.7; armR.rotation.x = -1.1 + Math.sin(performance.now() * 0.018) * 0.45; }
        else { armL.rotation.x = -sw * 0.8; armR.rotation.x = sw * 0.8; }
        heldCrate.visible = !!carrying; wrench.visible = !!repairing;
      }
    };
    return root;
  },

  buildVehicle(vehicleId, vState, isLocal = true) {
    const spec = KK.VEHICLES[vehicleId] || KK.VEHICLES.uaz452;
    const root = new THREE.Group();
    const chassis = new THREE.Group();
    root.add(chassis);
    const cockpitCfg = KK.CockpitBuilder ? KK.CockpitBuilder.getConfig(vehicleId) : null;
    let cockpit = null, btrTurretPivot = null, btrGunGroup = null, btrMuzzleFlash = null, tankTurretPivot = null, tankGunPitch = null, tankBarrelSlide = null, tankMainFlash = null, tankCoaxFlash = null, trackSys = null, tankDriverHoodMesh = null, tankUpgVisuals = null, tankXrayAnim = null, gradTurretPivot = null, gradPodPitch = null, gradFlashMesh = null, shilkaTurretPivot = null, shilkaGunPitch = null, shilkaBarrels = null, shilkaRadarDish = null, shilkaFlashes = null, p140SturmGroup = null, p140ApsFlash = null, p140XrayAnim = null, p140RwsPivot = null, p140RwsGunPitch = null, p140RwsMuzzleTip = null;

    const basePaintHex = (vState && vState.paintColor) ? vState.paintColor : spec.color;
    const basePaintColor = new THREE.Color(basePaintHex);
    const cleanTireColor = new THREE.Color(0x15171a);
    const mudBrownColor = new THREE.Color(0x523b26);

    const matPaint = new THREE.MeshStandardMaterial({ color: basePaintColor.clone(), roughness: 0.36, metalness: 0.12 });
    const matTrim = new THREE.MeshStandardMaterial({ color: spec.accentColor, roughness: 0.78, metalness: 0.14 });
    const matRubber = new THREE.MeshStandardMaterial({ color: 0x191c20, roughness: 0.94, metalness: 0.04 });
    const matCarbon = new THREE.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.38, metalness: 0.32 });
    const matGlass = new THREE.MeshStandardMaterial({ color: 0x9cd2f0, roughness: 0.08, metalness: 0.14, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    const matMetal = new THREE.MeshStandardMaterial({ color: 0x383e45, roughness: 0.62, metalness: 0.52 });
    const matGalv = new THREE.MeshStandardMaterial({ color: 0x8f969e, roughness: 0.52, metalness: 0.48 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0xdce3eb, roughness: 0.18, metalness: 0.88 });
    const matSpring = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.42, metalness: 0.25 });
    const matTire = new THREE.MeshStandardMaterial({ color: cleanTireColor.clone(), roughness: 0.95, metalness: 0.03 });
    const rimHex = (vehicleId === "wrx") ? 0xd4af37 : ((vehicleId === "evo" || vehicleId === "fortuner") ? 0x2a2f36 : ((vehicleId === "gtr_r35") ? 0x2f343b : ((vehicleId === "humvee" || vehicleId === "btr80" || vehicleId === "maz537") ? 0x454a3d : 0xadb6c0)));
    const matRim = new THREE.MeshStandardMaterial({ color: rimHex, roughness: 0.28, metalness: 0.72 });
    const matBrake = new THREE.MeshStandardMaterial({ color: (vehicleId === "wrx" || vehicleId === "gtr_r35") ? 0xe89c1c : 0xc92a2a, roughness: 0.45, metalness: 0.3 });
    const matHeadlightL = new THREE.MeshBasicMaterial({ color: 0xfff6d1 });
    const matHeadlightR = new THREE.MeshBasicMaterial({ color: 0xfff6d1 });
    const matHeadlight = matHeadlightL;
    const matTaillightL = new THREE.MeshBasicMaterial({ color: 0x701010 });
    const matTaillightR = new THREE.MeshBasicMaterial({ color: 0x701010 });
    const matTaillight = matTaillightL;
    const matBlinker = new THREE.MeshBasicMaterial({ color: 0x523606 });
    const matReverse = new THREE.MeshBasicMaterial({ color: 0x444444 });
    const matEngineBlk = new THREE.MeshStandardMaterial({ color: 0x4c5259, roughness: 0.65, metalness: 0.55 });

    // Dynamic Mud-Splatter Lower Body Overlay material (fades in as dirtLevel rises!)
    const matDirtOverlay = new THREE.MeshStandardMaterial({
      color: 0x4a3420, roughness: 0.98, metalness: 0.0, transparent: true, opacity: 0.0
    });

    this._addUndercarriage(chassis, spec, matMetal);

    if (!spec.isTracked) {
      const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.46, 0.72), matEngineBlk);
      engineBlock.position.set(0, 0.56, spec.bodyLen * 0.28); chassis.add(engineBlock);
      const valveCover = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.10, 0.58), matSpring);
      valveCover.position.set(0, 0.82, spec.bodyLen * 0.28); chassis.add(valveCover);
    }

    const hoodPivot = new THREE.Group(); chassis.add(hoodPivot);

    let plateText = "KK-452";
    let hlY = 0.72, hlZ = spec.bodyLen * 0.5, hlSpread = spec.bodyWidth * 0.34, roundHL = false;

    // ========================================================================
    // 1. UAZ-452 "BUKHANKA"
    // ========================================================================
    if (vehicleId === "uaz452") {
      plateText = "UAZ-452"; roundHL = true; hlY = 0.84; hlZ = 2.18; hlSpread = 0.64;
      const matAmber   = new THREE.MeshStandardMaterial({ color: 0xe88b14, emissive: 0x4a2500, roughness: 0.35 });
      const matCabGlass = new THREE.MeshStandardMaterial({ color: 0x89a8be, roughness: 0.12, metalness: 0.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide });

      // Classic Rounded Bukhanka ("Loaf") Body Extrusion — Hollowed for Clean First-Person Cockpit!
      const s = new THREE.Shape();
      s.moveTo(-2.12, 0.40); s.lineTo(2.08, 0.40);
      s.quadraticCurveTo(2.20, 0.65, 2.15, 1.15);
      s.quadraticCurveTo(2.08, 1.68, 1.82, 1.90);
      s.quadraticCurveTo(0.0, 2.04, -1.96, 1.90);
      s.quadraticCurveTo(-2.16, 1.72, -2.14, 1.15); s.closePath();
      chassis.add(this._extrudeSideProfile(s, 1.88, matPaint, 0.08, 0.10, cockpitCfg));

      // Lower rubber rocker skirt, stamped side beltline trim & roof rain-gutter molding
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.26, 4.24), matRubber);
      skirt.position.set(0, 0.47, -0.02); chassis.add(skirt);
      const molding = new THREE.Mesh(new THREE.BoxGeometry(1.97, 0.055, 4.18), matTrim);
      molding.position.set(0, 1.14, -0.02); chassis.add(molding);
      const gutter = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.04, 3.88), matTrim);
      gutter.position.set(0, 1.90, -0.06); chassis.add(gutter);

      // NO opaque black outer windshield or front cab windows — CockpitBuilder provides the clear hollow
      // split windshield & A-pillars so First-Person POV is 100% unobstructed!
      // Hollow rear cargo side window trim frames (top/bottom/pillars) + light see-through glass!
      for (const wz of [0.22, -0.68, -1.52]) {
        for (const sx of [-1, 1]) {
          const wx = sx * 0.945;
          const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.68), matRubber);
          topBar.position.set(wx, 1.70, wz); chassis.add(topBar);
          const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.68), matRubber);
          botBar.position.set(wx, 1.32, wz); chassis.add(botBar);
          for (const dz of [-0.32, 0.32]) {
            const pBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), matRubber);
            pBar.position.set(wx, 1.51, wz + dz); chassis.add(pBar);
          }
          const wg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.60), matCabGlass);
          wg.position.set(sx * 0.935, 1.51, wz); chassis.add(wg);
        }
      }

      // Classic Front Fascia: Recessed Round Headlight Bezels, Amber Turn Signals, Twin Pill Grille & Chrome UAZ Emblem!
      for (const sx of [-1, 1]) {
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.022, 8, 16), matChrome);
        bezel.position.set(sx * 0.64, 0.84, 2.18); chassis.add(bezel);
        const turnSig = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.065, 0.05), matAmber);
        turnSig.position.set(sx * 0.64, 0.65, 2.17); chassis.add(turnSig);
        // Front cab door handles & rear rubber mudflaps
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.16), matChrome);
        handle.position.set(sx * 0.96, 1.06, 0.92); chassis.add(handle);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.03), matRubber);
        flap.position.set(sx * 0.84, 0.26, -1.78); chassis.add(flap);
      }
      for (const gy of [0.92, 0.78]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.085, 0.06), matRubber);
        slot.position.set(0, gy, 2.18); chassis.add(slot);
      }
      const uazBadge = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.04), matChrome);
      uazBadge.position.set(0, 1.05, 2.17); chassis.add(uazBadge);

      // Heavy Steel Front & Rear Bumpers w/ Front Tow Hooks
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 0.18), matMetal);
      fBump.position.set(0, 0.46, 2.26); fBump.castShadow = true; chassis.add(fBump);
      for (const tx of [-0.52, 0.52]) {
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 10), matMetal);
        hook.position.set(tx, 0.46, 2.38); chassis.add(hook);
      }
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.00, 0.16, 0.18), matMetal);
      rBump.position.set(0, 0.46, -2.24); chassis.add(rBump);

      // Rear Twin-Door Center Seam + Rear-Mounted Full-Size Spare Tire!
      const rSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.28, 0.04), matRubber);
      rSeam.position.set(0, 1.18, -2.14); chassis.add(rSeam);
      const spTire = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.24, 16), matTire);
      spTire.rotation.x = Math.PI / 2; spTire.position.set(0.42, 1.06, -2.28); spTire.castShadow = true; chassis.add(spTire);
      const spRim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.26, 10), matRim);
      spRim.rotation.x = Math.PI / 2; spRim.position.set(0.42, 1.06, -2.28); chassis.add(spRim);

      // Soviet Tubular Expedition Roof Rack (Floor slats + raised side perimeter rails!)
      const rackFloor = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.04, 2.48), matMetal);
      rackFloor.position.set(0, 2.04, -0.35); chassis.add(rackFloor);
      for (const sx of [-0.72, 0.72]) {
        const rSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 2.48), matMetal);
        rSide.position.set(sx, 2.10, -0.35); chassis.add(rSide);
      }
      for (const rz of [0.88, -1.58]) {
        const rEnd = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.12, 0.04), matMetal);
        rEnd.position.set(0, 2.10, rz); chassis.add(rEnd);
      }

      hoodPivot.position.set(0, 1.14, 2.16);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.36, 0.08), matPaint);
      nose.position.set(0, -0.18, 0.04); hoodPivot.add(nose);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.12);
      this._addMirrors(chassis, 0.96, 1.48, 1.72, matMetal, matRubber, 0.24);
    }

    // ========================================================================
    // 2. TOYOTA HILUX N70 (2.8L)
    // ========================================================================
    else if (vehicleId === "hilux") {
      plateText = "HLX-N70"; hlY = 0.78; hlZ = 2.58; hlSpread = 0.64;
      const w = spec.bodyWidth;
      const cabShape = new THREE.Shape();
      cabShape.moveTo(-0.92, 0.42); cabShape.lineTo(2.50, 0.42);
      cabShape.quadraticCurveTo(2.60, 0.68, 2.48, 0.92);
      cabShape.lineTo(1.10, 1.00); cabShape.lineTo(0.62, 1.56);
      cabShape.quadraticCurveTo(-0.15, 1.64, -0.82, 1.56);
      cabShape.lineTo(-0.92, 1.00); cabShape.closePath();
      chassis.add(this._extrudeSideProfile(cabShape, w - 0.08, matPaint, 0.07, 0.08, cockpitCfg));

      const fBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.28, 0.34), matRubber);
      fBumper.position.set(0, 0.48, 2.52); chassis.add(fBumper);
      const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.30, 0.08), matRubber);
      grilleBg.position.set(0, 0.78, 2.57); chassis.add(grilleBg);
      for (let gy = 0.69; gy <= 0.87; gy += 0.09) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.035, 0.11), matChrome);
        bar.position.set(0, gy, 2.58); chassis.add(bar);
      }
      hoodPivot.position.set(0, 1.01, 1.10);
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.08, 1.38), matPaint);
      hoodPanel.position.set(0, 0.02, 0.68); hoodPivot.add(hoodPanel);
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.11, 0.48), matPaint);
      scoop.position.set(0, 0.09, 0.72); hoodPivot.add(scoop);

      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.60, 0.06), matGlass);
      wind.position.set(0, 1.29, 0.88); wind.rotation.x = -0.64; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const winF = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.68), matGlass);
        winF.position.set(sx * (w * 0.47), 1.29, 0.34); chassis.add(winF);
        const winR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.64), matGlass);
        winR.position.set(sx * (w * 0.47), 1.29, -0.44); chassis.add(winR);
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.88), matChrome);
        step.position.set(sx * (w * 0.52), 0.36, 0.06); chassis.add(step);
      }
      const bedZ = -1.78, bedLen = 1.66;
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.14, bedLen), matRubber);
      bedFloor.position.set(0, 0.56, bedZ); chassis.add(bedFloor);
      for (const sx of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.52, bedLen), matPaint);
        wall.position.set(sx * (w * 0.44), 0.84, bedZ); wall.castShadow = true; chassis.add(wall);
      }
      const tailGate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.52, 0.12), matPaint);
      tailGate.position.set(0, 0.84, bedZ - bedLen * 0.5 + 0.06); chassis.add(tailGate);
      const sbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w * 0.82, 8), matChrome);
      sbTop.rotation.z = Math.PI / 2; sbTop.position.set(0, 1.58, -1.04); chassis.add(sbTop);
      for (const sx of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.60, 8), matChrome);
        leg.position.set(sx * (w * 0.39), 1.30, -1.04); chassis.add(leg);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.16);
      this._addMirrors(chassis, w * 0.49, 1.24, 0.72, matRubber, matChrome, 0.22);
    }

    // ========================================================================
    // 3. SUBARU IMPREZA WRX STI (GD "Blobeye") — Low Rally Sedan, Big Scoop & STI Wing!
    // ========================================================================
    else if (vehicleId === "wrx") {
      plateText = "WRX-STI"; hlY = 0.68; hlZ = 2.22; hlSpread = 0.62;
      const w = spec.bodyWidth;

      // Sleek 3-box rally sedan profile!
      const s = new THREE.Shape();
      s.moveTo(-2.18, 0.36);
      s.lineTo(2.14, 0.36);
      s.quadraticCurveTo(2.26, 0.56, 2.16, 0.84);   // sporty front lip & nose
      s.lineTo(0.88, 0.94);                         // long low turbo hood
      s.lineTo(0.32, 1.44);                         // raked windshield
      s.quadraticCurveTo(-0.34, 1.48, -0.88, 1.40); // rally roof line
      s.lineTo(-1.42, 0.96);                        // fastback rear glass
      s.lineTo(-2.14, 0.92);                        // trunk decklid
      s.lineTo(-2.20, 0.50);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg));

      // Front aero splitter + intercooler mouth + rally fog lamp covers!
      const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.10, 0.34), matRubber);
      lip.position.set(0, 0.38, 2.18); chassis.add(lip);
      const icMouth = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.20, 0.08), matRubber);
      icMouth.position.set(0, 0.52, 2.22); chassis.add(icMouth);
      const fmic = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 0.09), matChrome);
      fmic.position.set(0, 0.52, 2.21); chassis.add(fmic);

      // Signature 3-piece WRX grille
      const gCenter = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.08), matRubber);
      gCenter.position.set(0, 0.72, 2.22); chassis.add(gCenter);

      // HUGE iconic WRX STI Hood Scoop!
      hoodPivot.position.set(0, 0.95, 0.88);
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.06, 1.24), matPaint);
      hoodPanel.position.set(0, 0.01, 0.62); hoodPivot.add(hoodPanel);
      const stiScoop = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.54), matPaint);
      stiScoop.position.set(0, 0.10, 0.58); stiScoop.castShadow = true; hoodPivot.add(stiScoop);
      const scoopHole = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.10, 0.06), matRubber);
      scoopHole.position.set(0, 0.10, 0.86); hoodPivot.add(scoopHole);

      // Glass: raked front, rear, and 4-door side windows
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.64, 0.06), matGlass);
      wind.position.set(0, 1.20, 0.61); wind.rotation.x = -0.82; chassis.add(wind);
      const rWind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.60, 0.06), matGlass);
      rWind.position.set(0, 1.19, -1.14); rWind.rotation.x = 0.86; chassis.add(rWind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.28), matGlass);
        sg.position.set(sx * (w * 0.45), 1.18, -0.26); chassis.add(sg);
      }

      // ICONIC TALL STI REAR WING with dual endplates!
      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.07, 0.34), matPaint);
      wingBlade.position.set(0, 1.38, -2.02); wingBlade.rotation.x = 0.10; wingBlade.castShadow = true; chassis.add(wingBlade);
      for (const sx of [-1, 1]) {
        const endp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 0.36), matPaint);
        endp.position.set(sx * (w * 0.44), 1.18, -2.02); endp.castShadow = true; chassis.add(endp);
      }

      // Chunky rally mudflaps (red STI flaps!)
      const redFlapMat = new THREE.MeshStandardMaterial({ color: 0xcc1f2a, roughness: 0.85 });
      for (const wDef of spec.wheels) {
        const mf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.03), redFlapMat);
        mf.position.set(wDef.x, 0.28, wDef.z - 0.44); chassis.add(mf);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.12);
      this._addMirrors(chassis, w * 0.46, 1.10, 0.48, matRubber, matPaint, 0.18);
    }

    // ========================================================================
    // 4. MITSUBISHI LANCER EVOLUTION IX (CT9A) — Sharp Nose, Hood Vents & Carbon Wing!
    // ========================================================================
    else if (vehicleId === "evo") {
      plateText = "EVO-IX"; hlY = 0.67; hlZ = 2.24; hlSpread = 0.64;
      const w = spec.bodyWidth;

      // Aggressive angular CT9A Evo sedan profile!
      const s = new THREE.Shape();
      s.moveTo(-2.20, 0.35);
      s.lineTo(2.18, 0.35);
      s.lineTo(2.26, 0.62);                         // sharp aggressive chin
      s.lineTo(2.14, 0.82);                         // angular headlight nose
      s.lineTo(0.86, 0.92);                         // sharp low aluminum hood
      s.lineTo(0.34, 1.42);
      s.lineTo(-0.88, 1.41);                        // flatter rally roofline
      s.lineTo(-1.38, 0.95);
      s.lineTo(-2.16, 0.94);                        // tall aggressive Evo trunk
      s.lineTo(-2.22, 0.48);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.05, 0.06, cockpitCfg));

      // Huge Black Evo IX Intercooler Grille Mouth + Visible Aluminum Intercooler + Carbon Lip
      const cLip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.09, 0.36), matCarbon);
      cLip.position.set(0, 0.37, 2.22); chassis.add(cLip);
      const bigMouth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.09), matRubber);
      bigMouth.position.set(0, 0.58, 2.24); chassis.add(bigMouth);
      const icCore = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.24, 0.10), matChrome);
      icCore.position.set(0, 0.56, 2.23); chassis.add(icCore);

      // Hinged Vented Evo Hood (Dark mesh heat extractor vent!)
      hoodPivot.position.set(0, 0.93, 0.86);
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.06, 1.28), matPaint);
      hoodPanel.position.set(0, 0.01, 0.64); hoodPivot.add(hoodPanel);
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.05, 0.42), matCarbon);
      vent.position.set(0, 0.05, 0.68); hoodPivot.add(vent);

      // Roof Vortex Generators (signature Evo IX shark fins!)
      for (let vx = -0.52; vx <= 0.52; vx += 0.13) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.14), matCarbon);
        fin.position.set(vx, 1.46, -0.82); chassis.add(fin);
      }

      // Glass
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.62, 0.06), matGlass);
      wind.position.set(0, 1.18, 0.61); wind.rotation.x = -0.80; chassis.add(wind);
      const rWind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.58, 0.06), matGlass);
      rWind.position.set(0, 1.18, -1.13); rWind.rotation.x = 0.84; chassis.add(rWind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 1.28), matGlass);
        sg.position.set(sx * (w * 0.46), 1.17, -0.26); chassis.add(sg);
      }

      // ICONIC EVO IX CARBON-BLADE REAR WING + Rear Diffuser!
      const cBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.06, 0.32), matCarbon);
      cBlade.position.set(0, 1.40, -2.04); cBlade.rotation.x = 0.12; cBlade.castShadow = true; chassis.add(cBlade);
      for (const sx of [-1, 1]) {
        const sideW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.36), matPaint);
        sideW.position.set(sx * (w * 0.45), 1.20, -2.04); sideW.castShadow = true; chassis.add(sideW);
      }
      const diff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.16, 0.22), matCarbon);
      diff.position.set(0, 0.42, -2.20); chassis.add(diff);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.12);
      this._addMirrors(chassis, w * 0.47, 1.09, 0.48, matCarbon, matPaint, 0.18);
    }

    // ========================================================================
    // 5. RANGE ROVER VOGUE V8 (L322) — Luxurious Boxy British SUV w/ Floating Roof!
    // ========================================================================
    else if (vehicleId === "rangerover") {
      plateText = "RR-V8SC"; hlY = 0.84; hlZ = 2.48; hlSpread = 0.72;
      const w = spec.bodyWidth;

      // Iconic tall, poised L322 Range Rover silhouette with clamshell hood & floating greenhouse!
      const s = new THREE.Shape();
      s.moveTo(-2.40, 0.42);
      s.lineTo(2.38, 0.42);
      s.quadraticCurveTo(2.50, 0.72, 2.42, 1.06);   // authoritative Range Rover nose
      s.lineTo(0.98, 1.12);                         // flat clamshell hood
      s.lineTo(0.62, 1.78);                         // tall commanding windshield
      s.lineTo(-2.12, 1.78);                        // long regal SUV roofline
      s.lineTo(-2.42, 1.08);                        // slight rear hatch rake
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.07, 0.08, cockpitCfg));

      // Signature Range Rover Silver Mesh Grille & Front Side Door Gill Vents!
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.34, 0.08), matChrome);
      grille.position.set(0, 0.84, 2.47); chassis.add(grille);
      for (let gy = 0.74; gy <= 0.94; gy += 0.10) {
        const sl = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.035, 0.10), matMetal);
        sl.position.set(0, gy, 2.48); chassis.add(sl);
      }

      // Iconic Range Rover side fender gill vents & silver lower trim strip
      for (const sx of [-1, 1]) {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.30, 0.24), matChrome);
        gill.position.set(sx * (w * 0.49), 0.90, 0.88); chassis.add(gill);
        const sideStep = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 2.42), matChrome);
        sideStep.position.set(sx * (w * 0.52), 0.40, 0.04); chassis.add(sideStep);
      }

      // Signature Blacked-Out "Floating Roof" Pillar Glass Greenhouse!
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.64, 0.06), matGlass);
      wind.position.set(0, 1.46, 0.82); wind.rotation.x = -0.48; chassis.add(wind);
      const rGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.58, 0.06), matGlass);
      rGlass.position.set(0, 1.44, -2.28); rGlass.rotation.x = 0.38; chassis.add(rGlass);
      for (const sx of [-1, 1]) {
        const fullGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 2.75), matGlass);
        fullGlass.position.set(sx * (w * 0.48), 1.44, -0.78); chassis.add(fullGlass);
        // Gloss black pillars (floating roof signature!)
        for (const pz of [0.10, -0.95]) {
          const pil = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.56, 0.12), matRubber);
          pil.position.set(sx * (w * 0.485), 1.44, pz); chassis.add(pil);
        }
      }

      // Clamshell hinged hood
      hoodPivot.position.set(0, 1.13, 0.98);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.09, 1.42), matPaint);
      hood.position.set(0, 0.02, 0.70); hoodPivot.add(hood);

      // Split Range Rover tailgate crease + roof rails
      const splitLine = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.04, 0.06), matChrome);
      splitLine.position.set(0, 0.96, -2.42); chassis.add(splitLine);
      for (const sx of [-0.74, 0.74]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 2.45), matChrome);
        rail.position.set(sx, 1.84, -0.75); chassis.add(rail);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.14);
      this._addMirrors(chassis, w * 0.50, 1.32, 0.68, matRubber, matChrome, 0.24);
    }

    // ========================================================================
    // 6. LAND CRUISER 79 PICKUP
    // ========================================================================
    else if (vehicleId === "lc79") {
      plateText = "LC-79V8"; hlY = 0.82; hlZ = 2.66; hlSpread = 0.68;
      const w = spec.bodyWidth;
      const cabShape = new THREE.Shape();
      cabShape.moveTo(-0.32, 0.46); cabShape.lineTo(2.58, 0.46); cabShape.lineTo(2.62, 1.02);
      cabShape.lineTo(1.06, 1.08); cabShape.lineTo(0.88, 1.74); cabShape.lineTo(-0.28, 1.74); cabShape.closePath();
      chassis.add(this._extrudeSideProfile(cabShape, w - 0.14, matPaint, 0.06, 0.07, cockpitCfg));

      for (const sx of [-1, 1]) {
        const fend = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.46, 1.56), matPaint);
        fend.position.set(sx * (w * 0.44), 0.76, 1.82); fend.castShadow = true; chassis.add(fend);
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.16), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        pod.position.set(sx * (w * 0.44), 1.02, 2.38); chassis.add(pod);
      }
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(w * 1.04, 0.26, 0.30), matMetal);
      fBump.position.set(0, 0.52, 2.68); chassis.add(fBump);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.40, 0.08), matRubber);
      grille.position.set(0, 0.82, 2.65); chassis.add(grille);
      for (let gx = -0.44; gx <= 0.44; gx += 0.17) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.10), matChrome);
        slat.position.set(gx, 0.82, 2.66); chassis.add(slat);
      }
      hoodPivot.position.set(0, 1.09, 1.06);
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.08, 1.52), matPaint);
      hoodPanel.position.set(0, 0.02, 0.76); hoodPivot.add(hoodPanel);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.56, 0.06), matGlass);
      wind.position.set(0, 1.42, 0.99); wind.rotation.x = -0.25; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.86), matGlass);
        sw.position.set(sx * (w * 0.46), 1.42, 0.34); chassis.add(sw);
      }
      const trayZ = -1.56, trayLen = 2.34, trayW = w * 1.05;
      const trayDeck = new THREE.Mesh(new THREE.BoxGeometry(trayW, 0.16, trayLen), matGalv);
      trayDeck.position.set(0, 0.76, trayZ); trayDeck.castShadow = true; chassis.add(trayDeck);
      for (const sx of [-1, 1]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.40, trayLen), matGalv);
        side.position.set(sx * (trayW * 0.48), 1.03, trayZ); side.castShadow = true; chassis.add(side);
      }
      const rearDrop = new THREE.Mesh(new THREE.BoxGeometry(trayW, 0.40, 0.09), matGalv);
      rearDrop.position.set(0, 1.03, trayZ - trayLen * 0.5 + 0.05); chassis.add(rearDrop);
      const hrTop = new THREE.Mesh(new THREE.BoxGeometry(trayW * 0.94, 0.09, 0.09), matMetal);
      hrTop.position.set(0, 1.84, -0.40); chassis.add(hrTop);
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.04, 0.09), matMetal);
        post.position.set(sx * (trayW * 0.44), 1.32, -0.40); chassis.add(post);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.18);
      this._addMirrors(chassis, w * 0.48, 1.42, 0.78, matChrome, matChrome, 0.28);
    }

    // ========================================================================
    // 7. MITSUBISHI DELICA L300 4x4
    // ========================================================================
    else if (vehicleId === "delica") {
      plateText = "L300-4X4"; hlY = 0.84; hlZ = 2.16; hlSpread = 0.56;
      const s = new THREE.Shape();
      s.moveTo(-2.08, 0.42); s.lineTo(2.06, 0.42); s.lineTo(2.14, 0.96);
      s.lineTo(1.76, 1.66); s.quadraticCurveTo(1.56, 1.94, 1.20, 1.94);
      s.lineTo(-1.88, 1.94); s.quadraticCurveTo(-2.10, 1.88, -2.10, 1.56); s.closePath();
      chassis.add(this._extrudeSideProfile(s, 1.72, matPaint, 0.06, 0.07, cockpitCfg));
      const lowerBand = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.48, 4.18), matTrim);
      lowerBand.position.set(0, 0.64, -0.01); chassis.add(lowerBand);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.62, 0.07), matGlass);
      wind.position.set(0, 1.38, 1.97); wind.rotation.x = -0.50; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 3.25), matGlass);
        sg.position.set(sx * 0.87, 1.44, -0.15); chassis.add(sg);
        const sky = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 2.35), matGlass);
        sky.position.set(sx * 0.44, 1.98, -0.25); chassis.add(sky);
      }
      const bashBar = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.44, 0.14), matChrome);
      bashBar.position.set(0, 0.66, 2.24); chassis.add(bashBar);
      for (const lx of [0.32, 0.56]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.42, 0.04), matChrome);
        rail.position.set(lx, 1.24, -2.14); chassis.add(rail);
      }
      hoodPivot.position.set(0, 1.02, 2.12);
      const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.30, 0.08), matTrim);
      hatch.position.set(0, -0.15, 0.04); hoodPivot.add(hatch);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matTrim, 0.15);
      this._addMirrors(chassis, 0.88, 1.34, 1.66, matChrome, matRubber, 0.22);
    }

    // ========================================================================
    // 8. SUZUKI JIMNY JB74
    // ========================================================================
    else if (vehicleId === "jimny") {
      plateText = "JB74-4X4"; roundHL = true; hlY = 0.78; hlZ = 1.78; hlSpread = 0.52;
      const s = new THREE.Shape();
      s.moveTo(-1.68, 0.44); s.lineTo(1.70, 0.44); s.lineTo(1.74, 0.96);
      s.lineTo(0.68, 1.02); s.lineTo(0.52, 1.62); s.lineTo(-1.58, 1.62); s.lineTo(-1.70, 1.02); s.closePath();
      chassis.add(this._extrudeSideProfile(s, 1.58, matPaint, 0.06, 0.06, cockpitCfg));
      const blackRoof = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.12, 2.18), matRubber);
      blackRoof.position.set(0, 1.68, -0.52); chassis.add(blackRoof);
      const fB = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.28, 0.28), matRubber);
      fB.position.set(0, 0.46, 1.78); chassis.add(fB);
      const rB = fB.clone(); rB.position.z = -1.76; chassis.add(rB);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 0.08), matRubber);
      grille.position.set(0, 0.78, 1.76); chassis.add(grille);
      for (let gx = -0.28; gx <= 0.28; gx += 0.14) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.10), matMetal);
        slot.position.set(gx, 0.78, 1.77); chassis.add(slot);
      }
      const wind = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.50, 0.06), matGlass);
      wind.position.set(0, 1.32, 0.62); wind.rotation.x = -0.26; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const winS = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 1.82), matGlass);
        winS.position.set(sx * 0.79, 1.32, -0.46); chassis.add(winS);
      }
      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.22, 16), matTire);
      spareTire.rotation.x = Math.PI / 2; spareTire.position.set(0, 0.94, -1.86); chassis.add(spareTire);
      hoodPivot.position.set(0, 1.02, 0.68);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 1.04), matPaint);
      hood.position.set(0, 0.02, 0.52); hoodPivot.add(hood);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.18);
      this._addMirrors(chassis, 0.80, 1.24, 0.52, matRubber, matRubber, 0.22);
    }

    // ========================================================================
    // 9. NISSAN GT-R R35 "GODZILLA SAFARI" — Special Rally-Spec Coupe!
    // ========================================================================
    else if (vehicleId === "gtr_r35") {
      plateText = "GTR-R35"; hlY = 0.72; hlZ = 2.34; hlSpread = 0.72;
      const w = spec.bodyWidth;
      const matRedAccent = new THREE.MeshStandardMaterial({ color: 0xd91e26, roughness: 0.35, metalness: 0.2 });
      const matTit = new THREE.MeshStandardMaterial({ color: 0x6b88b8, roughness: 0.22, metalness: 0.88 });

      // Sleek muscular R35 fastback coupe silhouette!
      const s = new THREE.Shape();
      s.moveTo(-2.30, 0.36);
      s.lineTo(2.26, 0.36);
      s.quadraticCurveTo(2.40, 0.54, 2.28, 0.84);   // aggressive R35 front nose
      s.lineTo(0.86, 0.96);                         // long muscular V6 hood
      s.lineTo(0.22, 1.44);                         // sharply raked coupe windshield
      s.quadraticCurveTo(-0.36, 1.48, -0.82, 1.42); // floating C-pillar coupe roof
      s.lineTo(-1.72, 1.02);                        // sweeping fastback rear deck
      s.lineTo(-2.26, 0.98);                        // high iconic R35 rear tail
      s.lineTo(-2.34, 0.46);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg));

      // NISMO Red Aero Side Skirts + Front Carbon Splitter + Heavy Rally Aluminum Skid Plate!
      const frontLip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.08, 0.38), matCarbon);
      frontLip.position.set(0, 0.38, 2.28); chassis.add(frontLip);
      const redLip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.99, 0.035, 0.40), matRedAccent);
      redLip.position.set(0, 0.36, 2.29); chassis.add(redLip);
      const rallySkid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.06, 0.62), matGalv);
      rallySkid.position.set(0, 0.31, 2.08); rallySkid.rotation.x = 0.28; chassis.add(rallySkid);

      // Iconic R35 Black V-Motion Front Grille Mouth + Twin Exposed Intercooler Cores + Red Tow Loop
      const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.42, 0.09), matCarbon);
      mouth.position.set(0, 0.62, 2.34); chassis.add(mouth);
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 0.11), matChrome);
      vBar.position.set(0, 0.72, 2.35); chassis.add(vBar);
      const icTwin = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.22, 0.10), matChrome);
      icTwin.position.set(0, 0.52, 2.33); chassis.add(icTwin);
      const towLoop = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12), matRedAccent);
      towLoop.rotation.x = Math.PI / 2; towLoop.position.set(0.54, 0.44, 2.40); chassis.add(towLoop);

      // RALLY-SPEC QUAD HOOD LIGHT POD (4 big rally lamps on a carbon pod!)
      const podBar = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.16, 0.22), matCarbon);
      podBar.position.set(0, 0.95, 2.04); chassis.add(podBar);
      for (const lx of [-0.42, -0.14, 0.14, 0.42]) {
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.12, 12), matCarbon);
        rim.rotation.x = Math.PI / 2; rim.position.set(lx, 0.97, 2.12); chassis.add(rim);
        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.13, 12), matHeadlight);
        lamp.rotation.x = Math.PI / 2; lamp.position.set(lx, 0.97, 2.13); chassis.add(lamp);
      }

      // Hinged Vented R35 Hood (Twin NACA Carbon Ducts!)
      hoodPivot.position.set(0, 0.97, 0.86);
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.06, 1.32), matPaint);
      hoodPanel.position.set(0, 0.01, 0.66); hoodPivot.add(hoodPanel);
      for (const nx of [-0.36, 0.36]) {
        const naca = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.04, 0.42), matCarbon);
        naca.position.set(nx, 0.05, 0.58); hoodPivot.add(naca);
      }

      // Sleek Coupe Glass + Iconic Blacked-Out R35 A-Pillars + Side Fender Gill Vents
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.74, 0.06), matGlass);
      wind.position.set(0, 1.21, 0.55); wind.rotation.x = -0.92; chassis.add(wind);
      const rWind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.92, 0.06), matGlass);
      rWind.position.set(0, 1.22, -1.26); rWind.rotation.x = 1.12; chassis.add(rWind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 1.32), matGlass);
        sg.position.set(sx * (w * 0.46), 1.18, -0.34); chassis.add(sg);
        const sideVent = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.16), matCarbon);
        sideVent.position.set(sx * (w * 0.48), 0.76, 0.86); chassis.add(sideVent);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 2.25), matCarbon);
        skirt.position.set(sx * (w * 0.49), 0.36, 0.02); chassis.add(skirt);
        const redSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 2.25), matRedAccent);
        redSkirt.position.set(sx * (w * 0.495), 0.33, 0.02); chassis.add(redSkirt);
      }

      // RALLY ROOF AIR SCOOP + ROOF EXPEDITION RACK W/ SPARE RALLY TIRE!
      const roofScoop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.11, 0.44), matCarbon);
      roofScoop.position.set(0, 1.50, 0.04); chassis.add(roofScoop);
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.05, 1.16), matMetal);
      rack.position.set(0, 1.48, -0.58); chassis.add(rack);
      const roofSpare = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14), matTire);
      roofSpare.position.set(0, 1.62, -0.58); roofSpare.castShadow = true; chassis.add(roofSpare);
      const roofRim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.26, 10), matRim);
      roofRim.position.set(0, 1.62, -0.58); chassis.add(roofRim);

      // SWAN-NECK CARBON GT RALLY WING w/ Red Endplates!
      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.06, 0.36), matCarbon);
      wingBlade.position.set(0, 1.42, -2.14); wingBlade.rotation.x = 0.12; wingBlade.castShadow = true; chassis.add(wingBlade);
      for (const sx of [-1, 1]) {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.22), matCarbon);
        pylon.position.set(sx * 0.44, 1.20, -2.06); chassis.add(pylon);
        const endp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.28, 0.42), matRedAccent);
        endp.position.set(sx * (w * 0.49), 1.42, -2.14); chassis.add(endp);
      }

      // CARBON REAR DIFFUSER + QUAD BURNT-TITANIUM EXHAUST TIPS!
      const rearDiff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.90, 0.20, 0.22), matCarbon);
      rearDiff.position.set(0, 0.44, -2.32); chassis.add(rearDiff);
      for (const ex of [-0.66, -0.48, 0.48, 0.66]) {
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.22, 10), matTit);
        tip.rotation.x = Math.PI / 2; tip.position.set(ex, 0.44, -2.42); chassis.add(tip);
      }

      // SIGNATURE QUAD CIRCULAR RED LED R35 AFTERBURNER TAILLIGHTS!
      for (const [tx, radT] of [[-0.68, 0.135], [-0.42, 0.105], [0.42, 0.105], [0.68, 0.135]]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radT, 0.032, 8, 16), matTaillight);
        ring.position.set(tx, 0.84, -2.35); chassis.add(ring);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(radT * 0.72, radT * 0.72, 0.04, 12), matTaillight);
        core.rotation.x = Math.PI / 2; core.position.set(tx, 0.84, -2.34); chassis.add(core);
      }

      // Wide Carbon Rally Mudflaps
      for (const wDef of spec.wheels) {
        const mf = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.03), matRedAccent);
        mf.position.set(wDef.x, 0.28, wDef.z - 0.46); chassis.add(mf);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matCarbon, 0.18);
      this._addMirrors(chassis, w * 0.48, 1.12, 0.48, matCarbon, matRedAccent, 0.18);
    }

    // ========================================================================
    // 10. AM GENERAL M998 HUMVEE — Ultra-Wide Flat-Panel Military Tactical 4x4!
    // ========================================================================
    else if (vehicleId === "humvee") {
      plateText = "HMMWV-M998"; roundHL = true; hlY = 0.94; hlZ = 2.34; hlSpread = 0.68;
      const w = spec.bodyWidth;
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x2a2d24, roughness: 0.86, metalness: 0.34 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x25282c, roughness: 0.62, metalness: 0.65 });
      const matJerry   = new THREE.MeshStandardMaterial({ color: 0x4d563c, roughness: 0.82 });

      const lowerDeck = new THREE.Shape();
      lowerDeck.moveTo(-2.34, 0.58);
      lowerDeck.lineTo(2.26, 0.58);
      lowerDeck.lineTo(2.34, 1.06);
      lowerDeck.lineTo(0.84, 1.15);
      lowerDeck.lineTo(-2.34, 1.15);
      lowerDeck.closePath();
      chassis.add(this._extrudeSideProfile(lowerDeck, w - 0.08, matPaint, 0.025, 0.03, cockpitCfg));

      const cabShape = new THREE.Shape();
      cabShape.moveTo(-2.22, 1.14);
      cabShape.lineTo(0.84, 1.14);
      cabShape.lineTo(0.66, 1.75);
      cabShape.lineTo(-0.74, 1.75);
      cabShape.lineTo(-2.22, 1.18);
      cabShape.closePath();
      chassis.add(this._extrudeSideProfile(cabShape, w - 0.30, matPaint, 0.02, 0.025, cockpitCfg));

      hoodPivot.position.set(0, 1.15, 0.84);
      const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 1.46), matPaint);
      hoodTop.position.set(0, 0.02, 0.72); hoodPivot.add(hoodTop);
      const hoodVentBox = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.52), matArmorDk);
      hoodVentBox.position.set(0, 0.06, 0.70); hoodPivot.add(hoodVentBox);
      for (let vz = 0.50; vz <= 0.90; vz += 0.08) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.90, 0.03, 0.035), matSteel);
        slat.position.set(0, 0.095, vz); hoodPivot.add(slat);
      }
      for (const sx of [-0.88, 0.88]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 10), matSteel);
        ring.position.set(sx, 0.06, 1.24); hoodPivot.add(ring);
      }

      const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.38, 0.08), matRubber);
      grilleBg.position.set(0, 0.92, 2.34); chassis.add(grilleBg);
      for (let gx = -0.39; gx <= 0.39; gx += 0.13) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.30, 0.11), matPaint);
        slot.position.set(gx, 0.92, 2.35); chassis.add(slot);
      }
      const milBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.24, 0.30), matSteel);
      milBumper.position.set(0, 0.64, 2.40); milBumper.castShadow = true; chassis.add(milBumper);
      const bTop = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.065, 0.065), matSteel);
      bTop.position.set(0, 1.14, 2.50); chassis.add(bTop);
      const bMid = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.05, 0.05), matSteel);
      bMid.position.set(0, 0.92, 2.50); chassis.add(bMid);
      for (const bx of [-0.90, -0.46, 0.46, 0.90]) {
        const bPost = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 0.06), matSteel);
        bPost.position.set(bx, 0.88, 2.50); chassis.add(bPost);
      }
      for (const sx of [-0.56, 0.56]) {
        const sh = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.026, 6, 10), matSteel);
        sh.position.set(sx, 0.64, 2.60); chassis.add(sh);
      }

      for (const sx of [-1, 1]) {
        const rockRail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 2.24), matSteel);
        rockRail.position.set(sx * (w * 0.49), 0.56, 0.0); chassis.add(rockRail);
        for (const wz of [1.65, -1.65]) {
          const brow = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 1.16), matRubber);
          brow.position.set(sx * (w * 0.48), 1.12, wz); chassis.add(brow);
        }
        const doorTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.46, 1.48), matArmorDk);
        doorTrim.position.set(sx * (w * 0.47), 0.86, 0.0); chassis.add(doorTrim);
      }

      const turretRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 8, 18), matSteel);
      turretRing.rotation.x = Math.PI / 2; turretRing.position.set(0, 1.79, -0.08); chassis.add(turretRing);
      const hatchLid = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.06, 14), matArmorDk);
      hatchLid.position.set(0, 1.79, -0.08); chassis.add(hatchLid);

      for (const sx of [-0.46, 0, 0.46]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.56), matArmorDk);
        rib.position.set(sx, 1.48, -1.48); rib.rotation.x = 0.36; chassis.add(rib);
      }
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.24, 0.24), matSteel);
      rBump.position.set(0, 0.64, -2.38); chassis.add(rBump);

      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.31, 16), matTire);
      spareTire.rotation.x = Math.PI / 2; spareTire.position.set(0.38, 1.08, -2.52); spareTire.castShadow = true; chassis.add(spareTire);
      const spareRim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.33, 10), matArmorDk);
      spareRim.rotation.x = Math.PI / 2; spareRim.position.set(0.38, 1.08, -2.52); chassis.add(spareRim);
      for (let j = 0; j < 2; j++) {
        const jc = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.46, 0.19), matJerry);
        jc.position.set(-0.46 - j * 0.38, 1.04, -2.48); chassis.add(jc);
      }
      const milPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.18, 8), matSteel);
      milPipe.position.set(w * 0.47, 1.44, 0.72); chassis.add(milPipe);
      const whipAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 2.35, 5), matSteel);
      whipAnt.position.set(-w * 0.44, 2.25, -2.18); chassis.add(whipAnt);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addMirrors(chassis, w * 0.48, 1.44, 0.62, matSteel, matRubber, 0.26);
    }

    // ========================================================================
    // 11. TOYOTA FORTUNER 2.8L OVERLAND — Agile Modern SUV + Rooftop Tent!
    // ========================================================================
    else if (vehicleId === "fortuner") {
      plateText = "FRT-28D"; hlY = 0.80; hlZ = 2.38; hlSpread = 0.66;
      const w = spec.bodyWidth;
      const matTent = new THREE.MeshStandardMaterial({ color: 0xb8a074, roughness: 0.90 });

      const s = new THREE.Shape();
      s.moveTo(-2.34, 0.42);
      s.lineTo(2.30, 0.42);
      s.quadraticCurveTo(2.42, 0.68, 2.32, 0.96);   // sharp Fortuner nose
      s.lineTo(0.96, 1.04);                         // sculpted SUV hood
      s.lineTo(0.46, 1.66);                         // raked SUV windshield
      s.lineTo(-2.02, 1.66);                        // sleek floating SUV roofline
      s.lineTo(-2.34, 1.08);                        // angled rear hatch
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.07, 0.08, cockpitCfg));

      // Silver front skid plate + modern chrome V-bars grille
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.07, 0.52), matGalv);
      skid.position.set(0, 0.36, 2.24); skid.rotation.x = 0.34; chassis.add(skid);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.32, 0.08), matRubber);
      grille.position.set(0, 0.80, 2.38); chassis.add(grille);
      for (let gy = 0.72; gy <= 0.88; gy += 0.08) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.035, 0.10), matChrome);
        bar.position.set(0, gy, 2.39); chassis.add(bar);
      }

      hoodPivot.position.set(0, 1.05, 0.96);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.08, 1.32), matPaint);
      hood.position.set(0, 0.02, 0.66); hoodPivot.add(hood);

      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.64, 0.06), matGlass);
      wind.position.set(0, 1.36, 0.72); wind.rotation.x = -0.64; chassis.add(wind);
      const rWin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.56, 0.06), matGlass);
      rWin.position.set(0, 1.38, -2.18); rWin.rotation.x = 0.45; chassis.add(rWin);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 2.52), matGlass);
        sg.position.set(sx * (w * 0.46), 1.36, -0.72); chassis.add(sg);
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 2.15), matRubber);
        step.position.set(sx * (w * 0.50), 0.38, 0.02); chassis.add(step);
      }

      // Overland Roof Rack + Folded Canvas Expedition Rooftop Tent + Side Awning Tube!
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 2.28), matMetal);
      rack.position.set(0, 1.72, -0.82); chassis.add(rack);
      const tent = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.28, 1.62), matTent);
      tent.position.set(0, 1.88, -0.96); tent.castShadow = true; chassis.add(tent);
      const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.20, 8), matRubber);
      awning.rotation.x = Math.PI / 2; awning.position.set(-0.78, 1.78, -0.82); chassis.add(awning);

      // Rear Roof Spoiler
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.08, 0.26), matPaint);
      spoiler.position.set(0, 1.68, -2.12); chassis.add(spoiler);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.15);
      this._addMirrors(chassis, w * 0.48, 1.26, 0.60, matRubber, matPaint, 0.22);
    }

    // ========================================================================
    // 11.5. NISSAN PATROL Y61 SUPER SAFARI — Iconic Two-Tone Desert Dune King!
    // ========================================================================
    else if (vehicleId === "patrol_y61") {
      plateText = "Y61-4800"; hlY = 0.86; hlZ = 2.50; hlSpread = 0.68;
      const w = spec.bodyWidth;
      const matGoldClad = new THREE.MeshStandardMaterial({ color: 0xb89f6d, roughness: 0.42, metalness: 0.30 });
      const matSandBoard = new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.72 });

      const s = new THREE.Shape();
      s.moveTo(-2.42, 0.44);
      s.lineTo(2.40, 0.44);
      s.quadraticCurveTo(2.54, 0.74, 2.44, 1.08);
      s.lineTo(1.00, 1.14);
      s.lineTo(0.62, 1.82);
      s.lineTo(-2.24, 1.82);
      s.lineTo(-2.46, 1.12);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg));

      const lowerClad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.40, 4.78), matGoldClad);
      lowerClad.position.set(0, 0.62, -0.01); chassis.add(lowerClad);

      const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.36, 0.08), matRubber);
      grilleBg.position.set(0, 0.86, 2.49); chassis.add(grilleBg);
      for (const gx of [-0.30, 0.30]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 0.11), matChrome);
        strut.position.set(gx, 0.86, 2.50); chassis.add(strut);
      }
      for (let gy = 0.76; gy <= 0.96; gy += 0.10) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.038, 0.10), matChrome);
        bar.position.set(0, gy, 2.50); chassis.add(bar);
      }
      const fBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 1.00, 0.24, 0.32), matGoldClad);
      fBumper.position.set(0, 0.50, 2.52); chassis.add(fBumper);
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.56), matGalv);
      skid.position.set(0, 0.36, 2.32); skid.rotation.x = 0.32; chassis.add(skid);

      hoodPivot.position.set(0, 1.15, 1.00);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.09, 1.40), matPaint);
      hood.position.set(0, 0.02, 0.70); hoodPivot.add(hood);

      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.66, 0.06), matGlass);
      wind.position.set(0, 1.49, 0.83); wind.rotation.x = -0.46; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 2.86), matGlass);
        sg.position.set(sx * (w * 0.47), 1.48, -0.82); chassis.add(sg);
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 2.38), matChrome);
        step.position.set(sx * (w * 0.52), 0.38, 0.02); chassis.add(step);
      }

      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.08, 2.55), matMetal);
      rack.position.set(0, 1.88, -0.80); chassis.add(rack);
      for (const sx of [-0.52, 0.52]) {
        const sb = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.05, 1.25), matSandBoard);
        sb.position.set(sx, 1.94, -0.95); chassis.add(sb);
      }

      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.28, 16), matTire);
      spareTire.rotation.x = Math.PI / 2; spareTire.position.set(0.32, 1.10, -2.56); spareTire.castShadow = true; chassis.add(spareTire);
      const spareCover = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.30, 14), matGoldClad);
      spareCover.rotation.x = Math.PI / 2; spareCover.position.set(0.32, 1.10, -2.57); chassis.add(spareCover);

      for (const lx of [-0.58, -0.34]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.32, 0.04), matChrome);
        rail.position.set(lx, 1.26, -2.48); chassis.add(rail);
      }
      for (let ly = 0.78; ly <= 1.78; ly += 0.25) {
        const rung = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 0.04), matChrome);
        rung.position.set(-0.46, ly, -2.49); chassis.add(rung);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matGoldClad, 0.17);
      this._addMirrors(chassis, w * 0.49, 1.36, 0.68, matRubber, matChrome, 0.24);
    }

    // ========================================================================
    // 12. ACCURATE DEMILITARIZED BTR-80 8x8 AMPHIBIOUS RESCUE APC REMODEL!
    // ========================================================================
    else if (vehicleId === "btr80") {
      plateText = "BTR-80R"; roundHL = true; hlY = 1.38; hlZ = 3.55; hlSpread = 0.88;
      const w = spec.bodyWidth;
      const matRescue = new THREE.MeshStandardMaterial({ color: 0xe87a1a, roughness: 0.48 });
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x2f382d, roughness: 0.82, metalness: 0.25 });
      const matStrobe = new THREE.MeshBasicMaterial({ color: 0xffaa00 });

      // 1. Accurate Faceted Boat-Hull Lower Tub + Sloped Upper Armored Glacis!
      const lowerHull = new THREE.Shape();
      lowerHull.moveTo(-3.68, 0.72);
      lowerHull.lineTo(2.75, 0.68);
      lowerHull.lineTo(3.74, 1.34);     // sharp amphibious prow!
      lowerHull.lineTo(3.55, 1.48);
      lowerHull.lineTo(-3.72, 1.48);
      lowerHull.closePath();
      chassis.add(this._extrudeSideProfile(lowerHull, w - 0.16, matPaint, 0.04, 0.05));

      // Tumblehome Inward-Sloped Upper Armored Superstructure (classic BTR-80 octagonal cross-section!)
      const upperHull = new THREE.Shape();
      upperHull.moveTo(-3.66, 1.44);
      upperHull.lineTo(3.48, 1.44);
      upperHull.lineTo(2.15, 2.02);     // long sloped nose glacis
      upperHull.lineTo(-2.55, 2.02);    // flat armored crew roof
      upperHull.lineTo(-3.62, 1.66);    // sloped rear engine bay deck
      upperHull.closePath();
      chassis.add(this._extrudeSideProfile(upperHull, w - 0.56, matPaint, 0.05, 0.06, cockpitCfg));

      // Angled Side Armor Cheeks linking wider mid-belt to narrower roof!
      for (const sx of [-1, 1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 5.45), matPaint);
        cheek.position.set(sx * (w * 0.43), 1.72, -0.35);
        cheek.rotation.z = sx * 0.40;
        cheek.castShadow = true; chassis.add(cheek);

        // Signature High-Vis Rescue Stripe along armored mid-chine
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 5.6), matRescue);
        stripe.position.set(sx * (w * 0.48), 1.42, -0.25); chassis.add(stripe);

        // Iconic BTR-80 Split Clamshell Side Troop Door (Upper + Lower Half between Axles 2 & 3!)
        const doorUpper = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.96), matArmorDk);
        doorUpper.position.set(sx * (w * 0.45), 1.70, 0.04); doorUpper.rotation.z = sx * 0.38; chassis.add(doorUpper);
        const doorLower = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.96), matArmorDk);
        doorLower.position.set(sx * (w * 0.485), 1.12, 0.04); chassis.add(doorLower);

        // 3 Angled Side Vision/Firing Port Blisters per flank
        for (const pz of [1.45, -0.78, -1.55]) {
          const port = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.20, 0.34), matMetal);
          port.position.set(sx * (w * 0.45), 1.78, pz); chassis.add(port);
        }

        // Armored Side Mudguard Fenders over wheel bays + heavy rear-quarter exhaust pipe!
        const mudguard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 6.25), matArmorDk);
        mudguard.position.set(sx * (w * 0.47), 1.40, 0.0); chassis.add(mudguard);
        const exhPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.2, 8), matMetal);
        exhPipe.rotation.x = Math.PI / 2; exhPipe.position.set(sx * (w * 0.45), 1.66, -2.55); chassis.add(exhPipe);
      }

      // 2. Front Bow Details: Hinged Wave-Breaker Trim Vane + Twin Armored Windshield Visors + Tow Hooks!
      const trimVane = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.58, 0.08), matArmorDk);
      trimVane.position.set(0, 1.48, 3.48); trimVane.rotation.x = -0.62; chassis.add(trimVane);
      for (const sx of [-0.56, 0.56]) {
        const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.34, 0.08), matArmorDk);
        visorFrame.position.set(sx, 1.84, 2.58); visorFrame.rotation.x = -0.45; chassis.add(visorFrame);
        const visorGlass = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.10), matGlass);
        visorGlass.position.set(sx, 1.84, 2.59); visorGlass.rotation.x = -0.45; chassis.add(visorGlass);
        // Raised armored eyebrow shutter above driver/commander glass!
        const brow = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.06, 0.34), matPaint);
        brow.position.set(sx, 2.04, 2.52); brow.rotation.x = 0.25; chassis.add(brow);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.035, 6, 10), matMetal);
        hook.position.set(sx * 1.15, 1.15, 3.74); chassis.add(hook);
      }

      // 3. Accurate Rotatable Conical BPU-1 Turret + Optional Hammond Contraband KPVT 14.5mm Cannon!
      btrTurretPivot = new THREE.Group();
      btrTurretPivot.position.set(0, 2.28, 0.92);
      chassis.add(btrTurretPivot);

      const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.98, 0.58, 12), matPaint);
      turretBase.castShadow = true; btrTurretPivot.add(turretBase);
      const turretCap = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.66, 0.14, 12), matArmorDk);
      turretCap.position.set(0, 0.34, 0); btrTurretPivot.add(turretCap);
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.85), matMetal);
      pod.position.set(0, 0.04, 0.60); btrTurretPivot.add(pod);
      const searchRim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.26, 12), matMetal);
      searchRim.rotation.x = Math.PI / 2; searchRim.position.set(0.48, 0.18, 0.54); btrTurretPivot.add(searchRim);
      const searchLens = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.28, 12), matHeadlightR);
      searchLens.rotation.x = Math.PI / 2; searchLens.position.set(0.48, 0.18, 0.55); btrTurretPivot.add(searchLens);
      const strobe = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 8), matStrobe);
      strobe.position.set(0, 0.52, 0); btrTurretPivot.add(strobe);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 2.6, 5), matMetal);
      ant.position.set(-0.75, 1.02, -0.27); btrTurretPivot.add(ant);

      btrGunGroup = new THREE.Group();
      btrGunGroup.visible = false;
      const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.36, 0.42), matArmorDk);
      mantlet.position.set(0, 0.06, 0.92); btrGunGroup.add(mantlet);
      const kpvtBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.058, 2.15, 10), matMetal);
      kpvtBarrel.rotation.x = Math.PI / 2; kpvtBarrel.position.set(0, 0.06, 2.05); kpvtBarrel.castShadow = true; btrGunGroup.add(kpvtBarrel);
      const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.055, 0.24, 8), matRubber);
      muzzleBrake.rotation.x = Math.PI / 2; muzzleBrake.position.set(0, 0.06, 3.16); btrGunGroup.add(muzzleBrake);
      const coaxBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.05, 6), matMetal);
      coaxBarrel.rotation.x = Math.PI / 2; coaxBarrel.position.set(-0.16, 0.06, 1.48); btrGunGroup.add(coaxBarrel);
      btrMuzzleFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 1.15, 7),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.92 })
      );
      btrMuzzleFlash.rotation.x = Math.PI / 2; btrMuzzleFlash.position.set(0, 0.06, 3.72); btrMuzzleFlash.visible = false;
      btrGunGroup.add(btrMuzzleFlash);
      btrTurretPivot.add(btrGunGroup);

      // 4. Sloped Rear Engine Bay Louvres + Armored Rear Water-Jet Hydro-Nozzle Shroud!
      for (let gz = -2.85; gz <= -1.45; gz += 0.35) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.18), matRubber);
        louver.position.set(0, 1.94, gz); chassis.add(louver);
      }
      const jetShroud = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.68, 0.58), matArmorDk);
      jetShroud.position.set(0, 1.02, -3.76); chassis.add(jetShroud);
      const jetNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.42, 12), matMetal);
      jetNozzle.rotation.x = Math.PI / 2; jetNozzle.position.set(0, 0.98, -3.96); chassis.add(jetNozzle);

      hoodPivot.position.set(0, 2.02, -1.25);
      const engHatch = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.10, 1.35), matPaint);
      engHatch.position.set(0, 0.04, -0.70); hoodPivot.add(engHatch);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, w * 0.46, 1.88, 2.38, matMetal, matRubber, 0.26);
    }

    // ========================================================================
    // 13. MAZ-537 8x8 SOVIET HEAVY ARTILLERY/CARGO TRACTOR (38.8L V12!)
    // ========================================================================
    else if (vehicleId === "maz537") {
      plateText = "MAZ-537"; roundHL = true; hlY = 1.18; hlZ = 4.46; hlSpread = 1.05;
      const w = spec.bodyWidth;

      // Colossal forward twin-side Soviet cab (split nose!)
      const cabLower = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.84, 2.45), matPaint);
      cabLower.position.set(0, 1.48, 3.18); cabLower.castShadow = true; chassis.add(cabLower);
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.12, 2.45), matPaint);
      cabRoof.position.set(0, 2.74, 3.18); cabRoof.castShadow = true; chassis.add(cabRoof);
      const cabRear = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.88, 0.14), matPaint);
      cabRear.position.set(0, 2.32, 2.02); chassis.add(cabRear);
      for (const px of [-1.30, 0, 1.30]) {
        const fp = new THREE.Mesh(new THREE.BoxGeometry(px === 0 ? 0.16 : 0.14, 0.88, 0.14), matPaint);
        fp.position.set(px, 2.32, 4.35); chassis.add(fp);
      }
      for (const sx of [-1.35, 1.35]) {
        const sWin = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.66, 2.05), matGlass);
        sWin.position.set(sx, 2.30, 3.18); chassis.add(sWin);
      }

      // Iconic Split Armored Front Windshields + Center Engine Tunnel Grille
      for (const sx of [-0.74, 0.74]) {
        const wp = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.62, 0.08), matGlass);
        wp.position.set(sx, 2.26, 4.42); chassis.add(wp);
      }
      const centerGrille = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.68, 0.12), matRubber);
      centerGrille.position.set(0, 1.48, 4.42); chassis.add(centerGrille);
      const megaBump = new THREE.Mesh(new THREE.BoxGeometry(2.88, 0.44, 0.42), matMetal);
      megaBump.position.set(0, 0.96, 4.54); chassis.add(megaBump);

      // Signature MASSIVE 38.8L V12 Armored Engine Bay Box right behind the cab!
      const engBox = new THREE.Mesh(new THREE.BoxGeometry(2.62, 1.82, 2.15), matPaint);
      engBox.position.set(0, 1.94, 0.85); engBox.castShadow = true; chassis.add(engBox);
      for (const sx of [-1.32, 1.32]) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 1.75), matRubber);
        louver.position.set(sx, 2.02, 0.85); chassis.add(louver);
      }
      // Twin massive vertical exhaust stacks
      for (const sx of [-1.26, 1.26]) {
        const stk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.4, 8), matMetal);
        stk.position.set(sx, 2.45, -0.32); chassis.add(stk);
      }

      // Colossal heavy cargo & logging rear flatbed (4.6m long!)
      const bedDeck = new THREE.Mesh(new THREE.BoxGeometry(2.76, 0.24, 4.45), matMetal);
      bedDeck.position.set(0, 1.34, -2.42); bedDeck.castShadow = true; chassis.add(bedDeck);
      for (const sx of [-1.32, 1.32]) {
        const bSide = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.92, 4.45), matPaint);
        bSide.position.set(sx, 1.86, -2.42); bSide.castShadow = true; chassis.add(bSide);
        // Giant cylindrical fuel tanks tucked between axles
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.45, 10), matTrim);
        tank.rotation.x = Math.PI / 2; tank.position.set(sx * 0.92, 0.92, -0.15); chassis.add(tank);
      }
      const tailW = new THREE.Mesh(new THREE.BoxGeometry(2.74, 0.92, 0.14), matPaint);
      tailW.position.set(0, 1.86, -4.60); chassis.add(tailW);

      hoodPivot.position.set(0, 2.86, 1.92);
      const topHatch = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.10, 1.8), matPaint);
      topHatch.position.set(0, 0.04, -0.9); hoodPivot.add(topHatch);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, 1.40, 2.32, 4.18, matMetal, matRubber, 0.36);
    }

    // ========================================================================
    // 13.5A. DACIA SANDERO — James May's Sensible Compact Hatchback!
    // ========================================================================
    else if (vehicleId === "dacia_sandero") {
      plateText = "GOOD-NWS"; hlY = 0.68; hlZ = 2.02; hlSpread = 0.58;
      const w = spec.bodyWidth;
      const s = new THREE.Shape();
      s.moveTo(-1.98, 0.36); s.lineTo(1.94, 0.36); s.quadraticCurveTo(2.06, 0.56, 1.96, 0.84);
      s.lineTo(0.86, 0.94); s.lineTo(0.32, 1.48); s.quadraticCurveTo(-0.45, 1.54, -1.42, 1.48);
      s.lineTo(-1.96, 1.00); s.lineTo(-2.00, 0.46); s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg));
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.24, 0.24), matRubber);
      fBump.position.set(0, 0.46, 1.98); chassis.add(fBump);
      const rBump = fBump.clone(); rBump.position.z = -1.96; chassis.add(rBump);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.22, 0.08), matRubber);
      grille.position.set(0, 0.70, 2.01); chassis.add(grille);
      const gTop = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.10), matChrome);
      gTop.position.set(0, 0.78, 2.02); chassis.add(gTop);
      hoodPivot.position.set(0, 0.95, 0.86);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.07, 1.06), matPaint);
      hood.position.set(0, 0.02, 0.53); hoodPivot.add(hood);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.62, 0.06), matGlass);
      wind.position.set(0, 1.22, 0.60); wind.rotation.x = -0.76; chassis.add(wind);
      const rWin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.50, 0.06), matGlass);
      rWin.position.set(0, 1.24, -1.69); rWin.rotation.x = 0.74; chassis.add(rWin);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.40, 1.72), matGlass);
        sg.position.set(sx * (w * 0.45), 1.22, -0.54); chassis.add(sg);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.11);
      this._addMirrors(chassis, w * 0.46, 1.12, 0.46, matRubber, matRubber, 0.18);
    }

    // ========================================================================
    // 13.5B. JEEP WRANGLER RUBICON — 7-Slot Grille, Flat Fenders & Rollbar!
    // ========================================================================
    else if (vehicleId === "jeep_wrangler") {
      plateText = "RUBICON"; roundHL = true; hlY = 0.86; hlZ = 2.12; hlSpread = 0.56;
      const w = spec.bodyWidth;
      const s = new THREE.Shape();
      s.moveTo(-2.06, 0.48); s.lineTo(2.04, 0.48); s.lineTo(2.10, 1.04);
      s.lineTo(0.76, 1.10); s.lineTo(0.56, 1.78); s.lineTo(-1.98, 1.78); s.lineTo(-2.08, 1.06); s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.16, matPaint, 0.05, 0.06, cockpitCfg, matRubber));
      const gBg = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.42, 0.08), matPaint);
      gBg.position.set(0, 0.86, 2.10); chassis.add(gBg);
      for (let gx = -0.33; gx <= 0.33; gx += 0.11) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.28, 0.11), matRubber);
        slot.position.set(gx, 0.86, 2.11); chassis.add(slot);
      }
      const stubBump = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.22, 0.28), matMetal);
      stubBump.position.set(0, 0.54, 2.18); chassis.add(stubBump);
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.22, 0.24), matMetal);
      rBump.position.set(0, 0.54, -2.14); chassis.add(rBump);
      for (const sx of [-1, 1]) {
        const fFl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 1.18), matRubber);
        fFl.position.set(sx * (w * 0.46), 1.02, 1.42); chassis.add(fFl);
        const rFl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 1.12), matRubber);
        rFl.position.set(sx * (w * 0.46), 1.02, -1.32); chassis.add(rFl);
        const slider = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 1.75), matMetal);
        slider.position.set(sx * (w * 0.48), 0.46, 0.05); chassis.add(slider);
      }
      hoodPivot.position.set(0, 1.11, 0.76);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.76, 0.09, 1.28), matPaint);
      hood.position.set(0, 0.02, 0.64); hoodPivot.add(hood);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.58, 0.06), matGlass);
      wind.position.set(0, 1.44, 0.68); wind.rotation.x = -0.28; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 2.15), matGlass);
        sg.position.set(sx * (w * 0.44), 1.44, -0.68); chassis.add(sg);
      }
      const spT = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.28, 16), matTire);
      spT.rotation.x = Math.PI / 2; spT.position.set(0, 1.06, -2.24); spT.castShadow = true; chassis.add(spT);
      const spR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.30, 10), matRim);
      spR.rotation.x = Math.PI / 2; spR.position.set(0, 1.06, -2.24); chassis.add(spR);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addMirrors(chassis, w * 0.46, 1.32, 0.56, matRubber, matRubber, 0.22);
    }

    // ========================================================================
    // 13.5C. TOYOTA MEGA CRUISER (BXD20 4WS) — Ultra-Wide Japanese Portal Titan!
    // ========================================================================
    else if (vehicleId === "mega_cruiser") {
      plateText = "BXD20-4WS"; roundHL = true; hlY = 0.96; hlZ = 2.53; hlSpread = 0.76;
      const w = spec.bodyWidth;
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x262e23, roughness: 0.84, metalness: 0.30 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x22262b, roughness: 0.58, metalness: 0.66 });
      const matJerry   = new THREE.MeshStandardMaterial({ color: 0x3f4c36, roughness: 0.85 });

      const lowerDeck = new THREE.Shape();
      lowerDeck.moveTo(-2.52, 0.60);
      lowerDeck.lineTo(2.46, 0.60);
      lowerDeck.lineTo(2.54, 1.12);
      lowerDeck.lineTo(0.96, 1.22);
      lowerDeck.lineTo(-2.52, 1.22);
      lowerDeck.closePath();
      chassis.add(this._extrudeSideProfile(lowerDeck, w - 0.08, matPaint, 0.03, 0.035, cockpitCfg));

      const upperCab = new THREE.Shape();
      upperCab.moveTo(-2.44, 1.21);
      upperCab.lineTo(0.96, 1.21);
      upperCab.lineTo(0.70, 1.93);
      upperCab.lineTo(-2.28, 1.93);
      upperCab.lineTo(-2.46, 1.24);
      upperCab.closePath();
      chassis.add(this._extrudeSideProfile(upperCab, w - 0.30, matPaint, 0.03, 0.03, cockpitCfg));

      const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.38, 0.09), matRubber);
      grilleBg.position.set(0, 0.96, 2.52); chassis.add(grilleBg);
      for (let gy = 0.84; gy <= 1.08; gy += 0.08) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.035, 0.11), matArmorDk);
        bar.position.set(0, gy, 2.53); chassis.add(bar);
      }
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.25, 0.30), matSteel);
      fBump.position.set(0, 0.66, 2.58); fBump.castShadow = true; chassis.add(fBump);
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.56), matSteel);
      skid.position.set(0, 0.52, 2.38); skid.rotation.x = 0.35; chassis.add(skid);
      const bullLoop = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.06, 0.06), matSteel);
      bullLoop.position.set(0, 1.16, 2.62); chassis.add(bullLoop);
      for (const bx of [-0.70, 0.70]) {
        const bp = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), matSteel);
        bp.position.set(bx, 0.90, 2.62); chassis.add(bp);
        const sh = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 6, 10), matSteel);
        sh.position.set(bx * 0.76, 0.66, 2.76); chassis.add(sh);
      }
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.24, 0.26), matSteel);
      rBump.position.set(0, 0.66, -2.56); chassis.add(rBump);

      hoodPivot.position.set(0, 1.22, 0.96);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.07, 1.52), matPaint);
      hood.position.set(0, 0.02, 0.76); hoodPivot.add(hood);
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.07, 0.48), matArmorDk);
      scoop.position.set(0, 0.065, 0.82); hoodPivot.add(scoop);

      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 2.36), matSteel);
        rail.position.set(sx * (w * 0.50), 0.56, 0.0); chassis.add(rail);
        for (const wz of [1.70, -1.695]) {
          const flareTop = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.09, 1.18), matRubber);
          flareTop.position.set(sx * (w * 0.49), 1.18, wz); chassis.add(flareTop);
        }
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 4.72), matArmorDk);
        strip.position.set(sx * (w * 0.48), 0.94, 0.0); chassis.add(strip);
      }
      const sideCan = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.46, 0.34), matJerry);
      sideCan.position.set(-w * 0.49, 1.44, -1.96); chassis.add(sideCan);

      const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.06, 2.68), matSteel);
      rackBase.position.set(0, 1.98, -0.78); chassis.add(rackBase);
      for (const sx of [-0.82, 0.82]) {
        const rSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 2.68), matSteel);
        rSide.position.set(sx, 2.03, -0.78); chassis.add(rSide);
      }
      for (const rz of [0.54, -2.10]) {
        const rEnd = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.14, 0.05), matSteel);
        rEnd.position.set(0, 2.03, rz); chassis.add(rEnd);
      }
      const spT = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.30, 16), matTire);
      spT.rotation.x = Math.PI / 2; spT.position.set(0.46, 1.16, -2.68); spT.castShadow = true; chassis.add(spT);
      const spR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.32, 10), matArmorDk);
      spR.rotation.x = Math.PI / 2; spR.position.set(0.46, 1.16, -2.68); chassis.add(spR);
      const rLadder = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.15, 0.08), matSteel);
      rLadder.position.set(-0.56, 1.42, -2.54); chassis.add(rLadder);
      const whipAnt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.022, 2.45, 5), matSteel);
      whipAnt.position.set(w * 0.45, 2.38, -2.35); chassis.add(whipAnt);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addMirrors(chassis, w * 0.48, 1.54, 0.74, matSteel, matRubber, 0.28);
    }

    // ========================================================================
    // 13.5D. LAMBORGHINI R8.270 DCR — Clarkson's Comically Giant Tractor!
    // ========================================================================
    else if (vehicleId === "lambo_tractor") {
      plateText = "DIDDLY-1"; hlY = 1.62; hlZ = 2.48; hlSpread = 0.58;
      const matBlackCab = new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.55, metalness: 0.3 });
      const matAmberBcn = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const weights = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.65, 0.62), matMetal);
      weights.position.set(0, 1.05, 2.58); weights.castShadow = true; chassis.add(weights);
      const noseShape = new THREE.Shape();
      noseShape.moveTo(-0.15, 0.92); noseShape.lineTo(2.38, 0.92); noseShape.lineTo(2.50, 1.62);
      noseShape.lineTo(2.22, 1.88); noseShape.lineTo(-0.10, 2.18); noseShape.closePath();
      chassis.add(this._extrudeSideProfile(noseShape, 1.28, matPaint, 0.06, 0.07));
      const fGrille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.62, 0.10), matBlackCab);
      fGrille.position.set(0, 1.42, 2.46); fGrille.rotation.x = -0.15; chassis.add(fGrille);
      for (const sx of [-0.66, 0.66]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 1.55), matBlackCab);
        vent.position.set(sx, 1.52, 1.15); chassis.add(vent);
      }
      const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.18, 1.90), matBlackCab);
      cabFloor.position.set(0, 1.52, -0.95); chassis.add(cabFloor);
      for (const [cx, cz] of [[-0.92, -0.04], [0.92, -0.04], [-0.92, -1.86], [0.92, -1.86]]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.11, 1.62, 0.11), matBlackCab);
        post.position.set(cx, 2.36, cz); post.castShadow = true; chassis.add(post);
      }
      const fGlass = new THREE.Mesh(new THREE.BoxGeometry(1.80, 1.48, 0.05), matGlass);
      fGlass.position.set(0, 2.36, -0.02); chassis.add(fGlass);
      const rGlass = fGlass.clone(); rGlass.position.z = -1.88; chassis.add(rGlass);
      for (const sx of [-0.94, 0.94]) {
        const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.48, 1.78), matGlass);
        sGlass.position.set(sx, 2.36, -0.95); chassis.add(sGlass);
      }
      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.24, 2.18), matPaint);
      cabRoof.position.set(0, 3.22, -0.95); cabRoof.castShadow = true; chassis.add(cabRoof);
      for (const sx of [-0.88, 0.88]) {
        const bcn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 8), matAmberBcn);
        bcn.position.set(sx, 3.45, -0.35); chassis.add(bcn);
        const rFend = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.12, 1.95), matBlackCab);
        rFend.position.set(sx * 1.38, 2.08, -1.35); chassis.add(rFend);
      }
      const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 2.45, 8), matMetal);
      exh.position.set(0.92, 2.45, 0.18); chassis.add(exh);
      const rearHitch = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.55, 0.65), matMetal);
      rearHitch.position.set(0, 0.95, -2.18); chassis.add(rearHitch);
      hoodPivot.position.set(0, 2.18, -0.10);
      const hPanel = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.08, 2.10), matPaint);
      hPanel.position.set(0, 0.02, 1.05); hoodPivot.add(hPanel);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, 1.02, 2.55, -0.15, matMetal, matBlackCab, 0.30);
    }

    // ========================================================================
    // 13.98. TRUE-SCALE T-72B MAIN BATTLE TANK (9.53m Gun-Forward x 3.59m x 2.23m)
    //        43.5 Tonnes, 12 Stamped-Steel Roadwheels, Gap-Free Bouncing Tracks,
    //        OPVT Snorkel, Shtora-1 EMP Eyes, LRAD Jammer & Kontakt-5 Heavy ERA!
    // ========================================================================
    else if (vehicleId === "t72") {
      plateText = "T-72B"; roundHL = true; hlY = 1.38; hlZ = 3.30; hlSpread = 1.32;
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x242e1e, roughness: 0.85, metalness: 0.30 });
      const matERA     = new THREE.MeshStandardMaterial({ color: 0x4a5b3e, roughness: 0.78, metalness: 0.24 });
      const matERA5    = new THREE.MeshStandardMaterial({ color: 0x35442b, roughness: 0.74, metalness: 0.34 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x3e444a, roughness: 0.52, metalness: 0.72 });
      const matTrack   = new THREE.MeshStandardMaterial({ color: 0x1b1e20, roughness: 0.90, metalness: 0.38 });
      const matGrouser = new THREE.MeshStandardMaterial({ color: 0x4a5056, roughness: 0.60, metalness: 0.75 });
      const matLogWood = new THREE.MeshStandardMaterial({ color: 0x5c3e24, roughness: 0.95 });
      const matIRLens  = new THREE.MeshBasicMaterial({ color: 0x331114 });
      const matShtora  = new THREE.MeshBasicMaterial({ color: 0xff1e2d });
      const matCopper  = new THREE.MeshStandardMaterial({ color: 0xb87333, roughness: 0.42, metalness: 0.78 });

      if (!chassis.userData.extraShellMats) chassis.userData.extraShellMats = [];
      chassis.userData.extraShellMats.push(matArmorDk, matERA, matERA5, matSteel, matRubber);

      const hullShape = new THREE.Shape();
      hullShape.moveTo(-3.44, 0.70);
      hullShape.lineTo(2.76, 0.66);
      hullShape.lineTo(3.47, 1.18);
      hullShape.lineTo(1.78, 1.60);
      hullShape.lineTo(-2.96, 1.60);
      hullShape.lineTo(-3.48, 1.32);
      hullShape.closePath();
      chassis.add(this._extrudeSideProfile(hullShape, 2.34, matPaint, 0.04, 0.05));

      for (const sx of [-1, 1]) {
        const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 6.72), matArmorDk);
        sponson.position.set(sx * 1.455, 1.44, -0.02); sponson.castShadow = true; chassis.add(sponson);
        for (let kz = -2.45; kz <= 2.45; kz += 1.22) {
          const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.34, 1.16), matRubber);
          skirt.position.set(sx * 1.755, 1.24, kz); chassis.add(skirt);
        }
        const fGuard = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.11, 0.64), matArmorDk);
        fGuard.position.set(sx * 1.455, 1.36, 3.34); fGuard.rotation.x = 0.28; chassis.add(fGuard);
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.042, 6, 10), matSteel);
        shackle.position.set(sx * 0.96, 1.12, 3.50); chassis.add(shackle);
        const bin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.26, 2.2), matArmorDk);
        bin.position.set(sx * 1.46, 1.68, -0.85); bin.castShadow = true; chassis.add(bin);
      }

      for (let row = 0; row < 2; row++) {
        for (let col = -3; col <= 3; col++) {
          const brick = new THREE.Mesh(new THREE.BoxGeometry(0.29, 0.12, 0.44), matERA);
          brick.position.set(col * 0.32, 1.32 + row * 0.13, 2.98 - row * 0.48);
          brick.rotation.x = 0.23; brick.castShadow = true; chassis.add(brick);
        }
      }
      const splashV1 = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.13, 0.07), matArmorDk);
      splashV1.position.set(-0.50, 1.54, 2.22); splashV1.rotation.y = 0.36; chassis.add(splashV1);
      const splashV2 = splashV1.clone(); splashV2.position.x = 0.50; splashV2.rotation.y = -0.36; chassis.add(splashV2);

      tankDriverHoodMesh = new THREE.Group();
      const drvPeriscope = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.36), matArmorDk);
      drvPeriscope.position.set(0, 1.69, 1.98); tankDriverHoodMesh.add(drvPeriscope);
      const drvVisor = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.08, 0.06), matIRLens);
      drvVisor.position.set(0, 1.71, 2.16); tankDriverHoodMesh.add(drvVisor);
      chassis.add(tankDriverHoodMesh);

      for (let gz = -2.85; gz <= -1.35; gz += 0.32) {
        const louver = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.07, 0.19), matRubber);
        louver.position.set(0, 1.63, gz); chassis.add(louver);
      }
      for (const dx of [-0.74, 0.74]) {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.92, 12), matArmorDk);
        drum.rotation.z = Math.PI / 2; drum.position.set(dx, 1.50, -3.56); drum.castShadow = true; chassis.add(drum);
      }
      const unditchLog = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.75, 10), matLogWood);
      unditchLog.rotation.z = Math.PI / 2; unditchLog.position.set(0, 1.10, -3.62); unditchLog.castShadow = true; chassis.add(unditchLog);

      const idlerGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.56, 16); idlerGeo.rotateZ(Math.PI / 2);
      const sprockGeo = new THREE.CylinderGeometry(0.39, 0.39, 0.58, 14); sprockGeo.rotateZ(Math.PI / 2);
      const rollerGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.50, 10); rollerGeo.rotateZ(Math.PI / 2);
      const trackIdlers = [], trackSprockets = [];
      for (const sx of [-1, 1]) {
        const idl = new THREE.Mesh(idlerGeo, matSteel);
        idl.position.set(sx * 1.46, 0.96, 3.12); chassis.add(idl); trackIdlers.push(idl);
        const spr = new THREE.Mesh(sprockGeo, matSteel);
        spr.position.set(sx * 1.46, 0.98, -3.08); chassis.add(spr); trackSprockets.push(spr);
        for (const rz of [1.72, 0.0, -1.72]) {
          const rol = new THREE.Mesh(rollerGeo, matArmorDk);
          rol.position.set(sx * 1.46, 1.24, rz); chassis.add(rol);
        }
      }

      const makeTrackSide = (sx) => {
        const tx = sx * 1.46;
        const loopSpans = [];
        for (let k = 0; k < 16; k++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.085, 1.0), matTrack);
          seg.castShadow = true; seg.receiveShadow = true;
          root.add(seg);
          loopSpans.push(seg);
        }
        const cleats = [];
        for (let c = 0; c < 36; c++) {
          const cl = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.058, 0.13), matGrouser);
          root.add(cl);
          cleats.push(cl);
        }
        return { sx, tx, loopSpans, cleats };
      };
      trackSys = {
        left: makeTrackSide(-1),
        right: makeTrackSide(1),
        idlers: trackIdlers,
        sprockets: trackSprockets
      };

      tankTurretPivot = new THREE.Group();
      tankTurretPivot.position.set(0, 1.62, 0.16);
      chassis.add(tankTurretPivot);

      const dome = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.66, 0.78, 18), matPaint);
      dome.scale.set(1.06, 1.0, 1.15); dome.position.y = 0.36; dome.castShadow = true; tankTurretPivot.add(dome);
      const domeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.26, 0.18, 18), matPaint);
      domeCap.scale.set(1.04, 1.0, 1.10); domeCap.position.y = 0.80; tankTurretPivot.add(domeCap);

      for (const ang of [-0.95, -0.68, -0.42, 0.42, 0.68, 0.95]) {
        const era = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.36, 0.19), matERA);
        era.position.set(Math.sin(ang) * 1.66, 0.40, Math.cos(ang) * 1.78);
        era.rotation.y = ang; era.rotation.x = -0.22; era.castShadow = true;
        tankTurretPivot.add(era);
      }

      for (const sx of [-1, 1]) {
        for (let t = 0; t < 4; t++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.42, 7), matArmorDk);
          tube.position.set(sx * (1.44 + t * 0.06), 0.52 + (t % 2) * 0.07, 0.78 - t * 0.14);
          tube.rotation.x = Math.PI * 0.32; tube.rotation.z = -sx * 0.25;
          tankTurretPivot.add(tube);
        }
      }

      const lunaBox = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.23, 0.25, 12), matArmorDk);
      lunaBox.rotation.x = Math.PI / 2; lunaBox.position.set(0.70, 0.46, 1.66); tankTurretPivot.add(lunaBox);
      const lunaFace = new THREE.Mesh(new THREE.CircleGeometry(0.19, 12), matIRLens);
      lunaFace.position.set(0.70, 0.46, 1.80); tankTurretPivot.add(lunaFace);
      const sightDog = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.30, 0.46), matArmorDk);
      sightDog.position.set(-0.58, 0.94, 0.66); tankTurretPivot.add(sightDog);

      const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.24, 12), matArmorDk);
      cupola.position.set(0.58, 0.94, -0.18); tankTurretPivot.add(cupola);
      const mgMount = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.24, 0.58), matSteel);
      mgMount.position.set(0.58, 1.18, 0.20); tankTurretPivot.add(mgMount);
      const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.044, 1.65, 8), matSteel);
      mgBarrel.rotation.x = Math.PI / 2; mgBarrel.position.set(0.58, 1.22, 1.24); tankTurretPivot.add(mgBarrel);
      tankCoaxFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.90, 7),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.92 })
      );
      tankCoaxFlash.rotation.x = Math.PI / 2; tankCoaxFlash.position.set(0.58, 1.22, 2.34); tankCoaxFlash.visible = false;
      tankTurretPivot.add(tankCoaxFlash);

      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 3.0, 5), matSteel);
      ant.position.set(-0.92, 2.18, -0.82); tankTurretPivot.add(ant);
      const bustle = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.38, 0.56), matArmorDk);
      bustle.position.set(0, 0.44, -1.76); tankTurretPivot.add(bustle);

      tankGunPitch = new THREE.Group();
      tankGunPitch.position.set(0, 0.44, 1.56);
      tankTurretPivot.add(tankGunPitch);

      const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.46, 0.44), matArmorDk);
      tankGunPitch.add(mantlet);

      tankBarrelSlide = new THREE.Group();
      tankGunPitch.add(tankBarrelSlide);

      const barrelBase = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.142, 2.15, 12), matPaint);
      barrelBase.rotation.x = Math.PI / 2; barrelBase.position.z = 1.08; barrelBase.castShadow = true; tankBarrelSlide.add(barrelBase);
      const evac = new THREE.Mesh(new THREE.CylinderGeometry(0.182, 0.182, 0.88, 12), matERA);
      evac.rotation.x = Math.PI / 2; evac.position.z = 2.42; evac.castShadow = true; tankBarrelSlide.add(evac);
      const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.090, 0.108, 1.98, 12), matSteel);
      barrelTip.rotation.x = Math.PI / 2; barrelTip.position.z = 3.44; barrelTip.castShadow = true; tankBarrelSlide.add(barrelTip);

      tankMainFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.95, 3.1, 9),
        new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.94 })
      );
      tankMainFlash.rotation.x = Math.PI / 2; tankMainFlash.position.z = 5.75; tankMainFlash.visible = false;
      tankBarrelSlide.add(tankMainFlash);

      // 3D VISUALS FOR ALL 5 CLASSIFIED T-72B UPGRADES!
      const upgSnorkel = new THREE.Group(); upgSnorkel.visible = false;
      const snPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 4.5, 10), matArmorDk);
      snPipe.position.set(-0.62, 3.05, -0.68); snPipe.castShadow = true; upgSnorkel.add(snPipe);
      const snCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.24, 10), matSteel);
      snCap.position.set(-0.62, 5.32, -0.68); upgSnorkel.add(snCap);
      tankTurretPivot.add(upgSnorkel);

      const upgEmp = new THREE.Group(); upgEmp.visible = false;
      for (const sx of [-1, 1]) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.30), matArmorDk);
        box.position.set(sx * 0.72, 0.44, 1.78); upgEmp.add(box);
        const eye = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.22), matShtora);
        eye.position.set(sx * 0.72, 0.44, 1.94); upgEmp.add(eye);
      }
      const braid = new THREE.Mesh(new THREE.TorusGeometry(1.58, 0.035, 6, 20), matCopper);
      braid.rotation.x = Math.PI / 2; braid.position.y = 0.14; upgEmp.add(braid);
      tankTurretPivot.add(upgEmp);

      const upgJammer = new THREE.Group(); upgJammer.visible = false;
      const jMast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.65, 8), matSteel);
      jMast.position.set(-0.78, 1.15, -0.25); upgJammer.add(jMast);
      const jDish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.14, 0.24, 12), matSteel);
      jDish.rotation.x = Math.PI / 2; jDish.position.set(-0.78, 1.52, -0.10); upgJammer.add(jDish);
      const jCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00f5ff }));
      jCore.position.set(-0.78, 1.52, 0.04); upgJammer.add(jCore);
      tankTurretPivot.add(upgJammer);

      const upgK5 = new THREE.Group(); upgK5.visible = false;
      for (const sx of [-1, 1]) {
        const wedge = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.48, 0.42), matERA5);
        wedge.position.set(sx * 1.18, 0.42, 1.62);
        wedge.rotation.y = sx * 0.55; wedge.rotation.x = -0.18; wedge.castShadow = true; upgK5.add(wedge);
        const sideW = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 1.25), matERA5);
        sideW.position.set(sx * 1.66, 0.42, 0.45); sideW.castShadow = true; upgK5.add(sideW);
      }
      tankTurretPivot.add(upgK5);
      const upgK5Hull = new THREE.Group(); upgK5Hull.visible = false;
      for (const sx of [-1, 1]) {
        for (let kz = 0.2; kz <= 2.6; kz += 0.78) {
          const skEra = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.68), matERA5);
          skEra.position.set(sx * 1.82, 1.28, kz); skEra.castShadow = true; upgK5Hull.add(skEra);
        }
      }
      chassis.add(upgK5Hull);

      const upgFcs = new THREE.Group(); upgFcs.visible = false;
      const metSensor = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.95, 6), matSteel);
      metSensor.position.set(0.28, 1.32, -1.22); upgFcs.add(metSensor);
      const metHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), matArmorDk);
      metHead.position.set(0.28, 1.80, -1.22); upgFcs.add(metHead);
      const thermHood = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.56), matERA5);
      thermHood.position.set(-0.58, 0.98, 0.72); upgFcs.add(thermHood);
      tankTurretPivot.add(upgFcs);

      tankUpgVisuals = { snorkel: upgSnorkel, emp: upgEmp, jammer: upgJammer, jammerDish: jDish, k5: upgK5, k5Hull: upgK5Hull, fcs: upgFcs };

      hoodPivot.position.set(0, 1.62, -1.25);
      const engDeckHatch = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 1.28), matPaint);
      engDeckHatch.position.set(0, 0.04, -0.68); hoodPivot.add(engDeckHatch);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
    }

    // ========================================================================
    // 13.99A. BM-21 "GRAD" (KATYUSHA) 6x6 40-TUBE 122mm ROCKET ARTILLERY!
    // ========================================================================
    else if (vehicleId === "bm21") {
      plateText = "BM-21"; roundHL = true; hlY = 1.18; hlZ = 3.55; hlSpread = 0.86;
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x263021, roughness: 0.86, metalness: 0.28 });
      const matTube    = new THREE.MeshStandardMaterial({ color: 0x2f3b28, roughness: 0.72, metalness: 0.55 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.54, metalness: 0.68 });
      const matCapRed  = new THREE.MeshStandardMaterial({ color: 0x9e2a2b, roughness: 0.60 });

      // 1. Heavy Ural-4320 Steel Ladder Frame & Armored Front Bumper
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 7.15), matRubber);
      frame.position.set(0, 0.96, 0); frame.castShadow = true; chassis.add(frame);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.36, 0.34), matArmorDk);
      bumper.position.set(0, 1.05, 3.62); bumper.castShadow = true; chassis.add(bumper);

      // 2. Classic Long-Nose Soviet Ural-375D/4320 Cab (See-through hollow greenhouse!)
      const cabShape = new THREE.Shape();
      cabShape.moveTo(0.82, 1.08);
      cabShape.lineTo(3.52, 1.08);
      cabShape.lineTo(3.52, 1.92); // vertical armored radiator grille
      cabShape.lineTo(2.42, 1.96); // long Ural hood
      cabShape.lineTo(2.20, 2.54); // slanted windshield
      cabShape.lineTo(0.92, 2.54); // cab roof
      cabShape.lineTo(0.82, 1.92);
      cabShape.closePath();
      const cpCfg = KK.CockpitBuilder ? KK.CockpitBuilder.getConfig("bm21") : null;
      if (cpCfg) chassis.add(KK.CockpitBuilder.buildHollowExtrudedBody(cabShape, 2.16, matPaint, 0.04, 0.05, cpCfg));
      else chassis.add(this._extrudeSideProfile(cabShape, 2.16, matPaint, 0.04, 0.05));

      // Iconic Ural Grille Slats & Front Fenders
      for (let gx = -0.64; gx <= 0.64; gx += 0.16) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.08), matRubber);
        slat.position.set(gx, 1.54, 3.55); chassis.add(slat);
      }
      for (const sx of [-1, 1]) {
        const fnd = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 1.25), matArmorDk);
        fnd.position.set(sx * 1.06, 1.62, 2.38); chassis.add(fnd);
        // Side diesel fuel tanks
        const ft = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.46, 1.35), matArmorDk);
        ft.position.set(sx * 0.94, 0.96, 0.42); chassis.add(ft);
      }
      // Behind-Cab Spare Tire Rack & Stabilization Outrigger Jacks
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.34, 14), matTire);
      spare.position.set(-0.62, 1.82, 0.45); spare.castShadow = true; chassis.add(spare);
      const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.20, 4.10), matArmorDk);
      rearDeck.position.set(0, 1.24, -1.55); rearDeck.castShadow = true; chassis.add(rearDeck);

      // 3. ROTATING & ELEVATING 40-TUBE 122mm BM-21 "GRAD" ROCKET LAUNCHER POD!
      gradTurretPivot = new THREE.Group();
      gradTurretPivot.position.set(0, 1.44, -2.05);
      chassis.add(gradTurretPivot);

      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.92, 0.44, 14), matArmorDk);
      pedestal.position.y = 0.22; gradTurretPivot.add(pedestal);
      const cradleL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.72, 0.65), matSteel);
      cradleL.position.set(-0.98, 0.68, 0); gradTurretPivot.add(cradleL);
      const cradleR = cradleL.clone(); cradleR.position.x = 0.98; gradTurretPivot.add(cradleR);

      gradPodPitch = new THREE.Group();
      gradPodPitch.position.set(0, 0.92, 0);
      gradTurretPivot.add(gradPodPitch);

      // Steel Rocket Rack Cage Frame
      const rackBox = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.88, 2.95), matArmorDk);
      rackBox.position.set(0, 0.22, 0.25); rackBox.castShadow = true; gradPodPitch.add(rackBox);

      // 4 Rows x 10 Columns = 40 Authentic 122mm Katyusha Launch Tubes with Red Warhead Tips!
      const tubeGeo = new THREE.CylinderGeometry(0.068, 0.068, 3.15, 7);
      tubeGeo.rotateX(Math.PI / 2);
      const tipGeo = new THREE.ConeGeometry(0.054, 0.18, 6);
      tipGeo.rotateX(Math.PI / 2);
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 10; col++) {
          const tx = -0.81 + col * 0.18;
          const ty = -0.05 + row * 0.18;
          const tube = new THREE.Mesh(tubeGeo, matTube);
          tube.position.set(tx, ty, 0.28);
          gradPodPitch.add(tube);
          if ((row + col) % 2 === 0) {
            const tip = new THREE.Mesh(tipGeo, matCapRed);
            tip.position.set(tx, ty, 1.88);
            gradPodPitch.add(tip);
          }
        }
      }

      // Rear Backblast Flame Cone!
      gradFlashMesh = new THREE.Mesh(
        new THREE.ConeGeometry(1.05, 3.4, 9),
        new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.90 })
      );
      gradFlashMesh.rotation.x = -Math.PI / 2;
      gradFlashMesh.position.set(0, 0.22, -2.85);
      gradFlashMesh.visible = false;
      gradPodPitch.add(gradFlashMesh);

      hoodPivot.position.set(0, 1.94, 2.42);
      const hPanel = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 1.05), matPaint);
      hPanel.position.set(0, 0.04, 0.52); hoodPivot.add(hPanel);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
    }

    // ========================================================================
    // 13.99B. ZSU-23-4 "SHILKA" QUAD-23mm TRACKED RADAR SPAAG!
    // ========================================================================
    else if (vehicleId === "shilka") {
      plateText = "ZSU-23"; roundHL = true; hlY = 1.24; hlZ = 3.12; hlSpread = 1.08;
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x2a3525, roughness: 0.85, metalness: 0.28 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x3c4349, roughness: 0.52, metalness: 0.70 });
      const matTrack   = new THREE.MeshStandardMaterial({ color: 0x1b1e20, roughness: 0.90, metalness: 0.36 });
      const matGrouser = new THREE.MeshStandardMaterial({ color: 0x4c5258, roughness: 0.62, metalness: 0.72 });
      const matDish    = new THREE.MeshStandardMaterial({ color: 0x607058, roughness: 0.65, metalness: 0.45 });

      if (!chassis.userData.extraShellMats) chassis.userData.extraShellMats = [];
      chassis.userData.extraShellMats.push(matArmorDk, matSteel, matDish, matRubber);

      // 1. Wide Flat-Sloped GM-575 Tracked Armored Hull (6.54m x 3.12m!)
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-3.24, 0.64);
      hullShape.lineTo(2.62, 0.62);
      hullShape.lineTo(3.26, 1.12);
      hullShape.lineTo(2.05, 1.48);
      hullShape.lineTo(-2.92, 1.48);
      hullShape.lineTo(-3.26, 1.18);
      hullShape.closePath();
      chassis.add(this._extrudeSideProfile(hullShape, 2.24, matPaint, 0.04, 0.05));

      for (const sx of [-1, 1]) {
        const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 6.24), matArmorDk);
        sponson.position.set(sx * 1.28, 1.32, 0); sponson.castShadow = true; chassis.add(sponson);
      }
      tankDriverHoodMesh = new THREE.Group();
      const dHood = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.34), matArmorDk);
      dHood.position.set(0, 1.56, 1.92); tankDriverHoodMesh.add(dHood);
      chassis.add(tankDriverHoodMesh);

      // Rear Engine Deck Cooling Louvres
      for (let gz = -2.75; gz <= -1.45; gz += 0.30) {
        const luv = new THREE.Mesh(new THREE.BoxGeometry(1.80, 0.06, 0.18), matRubber);
        luv.position.set(0, 1.51, gz); chassis.add(luv);
      }

      // Front Idlers, Rear Sprockets & Gap-Free Closed-Loop Bouncing Tracks!
      const idlGeo = new THREE.CylinderGeometry(0.30, 0.30, 0.48, 14); idlGeo.rotateZ(Math.PI / 2);
      const sprGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.50, 12); sprGeo.rotateZ(Math.PI / 2);
      const trackIdlers = [], trackSprockets = [];
      for (const sx of [-1, 1]) {
        const idl = new THREE.Mesh(idlGeo, matSteel); idl.position.set(sx * 1.28, 0.88, 2.86); chassis.add(idl); trackIdlers.push(idl);
        const spr = new THREE.Mesh(sprGeo, matSteel); spr.position.set(sx * 1.28, 0.90, -2.84); chassis.add(spr); trackSprockets.push(spr);
      }
      const makeTrackSide = (sx) => {
        const tx = sx * 1.28;
        const loopSpans = [], cleats = [];
        for (let k = 0; k < 16; k++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.075, 1.0), matTrack);
          seg.castShadow = true; root.add(seg); loopSpans.push(seg);
        }
        for (let c = 0; c < 34; c++) {
          const cl = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.05, 0.12), matGrouser);
          root.add(cl); cleats.push(cl);
        }
        return { sx, tx, loopSpans, cleats, isShilka: true };
      };
      trackSys = { left: makeTrackSide(-1), right: makeTrackSide(1), idlers: trackIdlers, sprockets: trackSprockets, isShilka: true };

      // 2. Iconic Wide Low-Profile Armored Shilka Turret + Spinning 1RL33 RPK-2 Radar Dish!
      shilkaTurretPivot = new THREE.Group();
      shilkaTurretPivot.position.set(0, 1.50, -0.05);
      chassis.add(shilkaTurretPivot);

      const tBox = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.72, 2.42), matPaint);
      tBox.position.y = 0.36; tBox.castShadow = true; shilkaTurretPivot.add(tBox);
      const tTop = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.14, 1.98), matArmorDk);
      tTop.position.y = 0.78; shilkaTurretPivot.add(tTop);

      // Iconic Folding / Spinning Circular 1RL33 RPK-2 Radar Dish on Rear Turret Roof!
      const rMast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.62, 10), matArmorDk);
      rMast.position.set(0, 1.06, -0.68); shilkaTurretPivot.add(rMast);
      shilkaRadarDish = new THREE.Group();
      shilkaRadarDish.position.set(0, 1.48, -0.68);
      const dishCone = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.18, 0.28, 16), matDish);
      dishCone.rotation.x = Math.PI / 2; shilkaRadarDish.add(dishCone);
      const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.45, 6), matSteel);
      feedHorn.rotation.x = Math.PI / 2; feedHorn.position.z = 0.22; shilkaRadarDish.add(feedHorn);
      shilkaTurretPivot.add(shilkaRadarDish);

      // 3. QUAD 23mm AZP-23 WATER-COOLED AUTOCANNON ARRAY (4 Independent Reciprocating Barrels!)
      shilkaGunPitch = new THREE.Group();
      shilkaGunPitch.position.set(0, 0.40, 1.18);
      shilkaTurretPivot.add(shilkaGunPitch);

      const qMantlet = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.44, 0.46), matArmorDk);
      shilkaGunPitch.add(qMantlet);

      shilkaBarrels = [];
      shilkaFlashes = [];
      const bOffsets = [[-0.32, 0.11], [0.32, 0.11], [-0.32, -0.11], [0.32, -0.11]];
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.94 });
      for (const [bx, by] of bOffsets) {
        const bGrp = new THREE.Group();
        bGrp.position.set(bx, by, 0);
        const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 1.15, 8), matArmorDk);
        jacket.rotation.x = Math.PI / 2; jacket.position.z = 0.62; bGrp.add(jacket);
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 1.65, 8), matSteel);
        tube.rotation.x = Math.PI / 2; tube.position.z = 1.65; tube.castShadow = true; bGrp.add(tube);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.032, 0.20, 8), matSteel);
        cone.rotation.x = Math.PI / 2; cone.position.z = 2.52; bGrp.add(cone);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 6), flashMat);
        fl.rotation.x = Math.PI / 2; fl.position.z = 2.95; fl.visible = false; bGrp.add(fl);
        shilkaGunPitch.add(bGrp);
        shilkaBarrels.push(bGrp);
        shilkaFlashes.push(fl);
      }

      hoodPivot.position.set(0, 1.50, -1.25);
      const engDeckHatch = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.08, 1.20), matPaint);
      engDeckHatch.position.set(0, 0.04, -0.62); hoodPivot.add(engDeckHatch);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
    }

    // ========================================================================
    // 14.1B-1. PORSCHE 911 DAKAR (992 RALLY) — Lifted Twin-Turbo AWD Rally Icon!
    // ========================================================================
    else if (vehicleId === "porsche_dakar") {
      plateText = "911-DKR"; roundHL = true; hlY = 0.74; hlZ = 2.18; hlSpread = 0.66;
      const w = spec.bodyWidth;
      const matRallyBlue = new THREE.MeshStandardMaterial({ color: 0x16386b, roughness: 0.42, metalness: 0.25 });
      const matRallyRed  = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.45 });
      const matRallyGold = new THREE.MeshStandardMaterial({ color: 0xe9b44c, roughness: 0.40, metalness: 0.45 });
      const matClad      = new THREE.MeshStandardMaterial({ color: 0x1d2024, roughness: 0.85 });

      const s = new THREE.Shape();
      s.moveTo(-2.22, 0.42); s.lineTo(2.14, 0.40); s.lineTo(2.26, 0.72);
      s.lineTo(1.24, 0.90); s.lineTo(0.60, 1.36); s.lineTo(-0.36, 1.38);
      s.lineTo(-1.84, 0.96); s.lineTo(-2.24, 0.82); s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.14, matPaint, 0.06, 0.07, cockpitCfg));

      const lowBody = new THREE.Mesh(new THREE.BoxGeometry(w - 0.08, 0.26, 4.30), matRallyBlue);
      lowBody.position.set(0, 0.56, -0.02); chassis.add(lowBody);
      const stripeR = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.055, 4.32), matRallyRed);
      stripeR.position.set(0, 0.70, -0.02); chassis.add(stripeR);
      const stripeG = new THREE.Mesh(new THREE.BoxGeometry(w - 0.06, 0.04, 4.32), matRallyGold);
      stripeG.position.set(0, 0.75, -0.02); chassis.add(stripeG);

      const fSkid = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.08, 0.54), matMetal);
      fSkid.position.set(0, 0.42, 2.08); fSkid.rotation.x = 0.34; chassis.add(fSkid);
      const rSkid = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.10, 0.48), matMetal);
      rSkid.position.set(0, 0.44, -2.14); rSkid.rotation.x = -0.25; chassis.add(rSkid);
      const towHook = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.02, 6, 10), matRallyRed);
      towHook.position.set(0.42, 0.52, 2.28); chassis.add(towHook);

      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.16, 0.36), matPaint);
      ducktail.position.set(0, 1.04, -2.06); ducktail.rotation.x = -0.32; ducktail.castShadow = true; chassis.add(ducktail);
      const rearBar = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.06), matTaillightL);
      rearBar.position.set(0, 0.86, -2.25); chassis.add(rearBar);

      const basket = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.09, 1.46), matClad);
      basket.position.set(0, 1.44, -0.10); chassis.add(basket);
      const matBoard = new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.75 });
      for (const bx of [-0.30, 0.30]) {
        const bd = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 1.12), matBoard);
        bd.position.set(bx, 1.50, -0.10); chassis.add(bd);
      }

      hoodPivot.position.set(0, 0.90, 1.24);
      const frunk = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.05, 0.96), matPaint);
      frunk.position.set(0, 0.02, 0.46); hoodPivot.add(frunk);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matClad, 0.14);
      this._addMirrors(chassis, w * 0.46, 1.06, 0.62, matPaint, matClad, 0.16);
    }

    // ========================================================================
    // 14.1B-2. TOYOTA COASTER 4.2D EXPEDITION MINIBUS!
    // ========================================================================
    else if (vehicleId === "toyota_coaster") {
      plateText = "COASTER"; roundHL = false; hlY = 0.86; hlZ = 3.46; hlSpread = 0.78;
      const w = spec.bodyWidth;
      const matStripe = new THREE.MeshStandardMaterial({ color: 0x24577a, roughness: 0.45 });
      const matSeat   = new THREE.MeshStandardMaterial({ color: 0x3b4e63, roughness: 0.88 });
      const matRoofAc = new THREE.MeshStandardMaterial({ color: 0xdce2e8, roughness: 0.55 });

      const s = new THREE.Shape();
      s.moveTo(-3.46, 0.52); s.lineTo(3.40, 0.52); s.lineTo(3.48, 1.44);
      s.lineTo(3.16, 2.54); s.lineTo(-3.36, 2.54); s.lineTo(-3.48, 1.44); s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.08, matPaint, 0.05, 0.05, cockpitCfg));

      const belt = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.24, 6.86), matStripe);
      belt.position.set(0, 1.18, -0.02); chassis.add(belt);
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.08), matRubber);
      grille.position.set(0, 0.90, 3.46); chassis.add(grille);
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.24, 0.26), matRubber);
      fBump.position.set(0, 0.56, 3.48); chassis.add(fBump);
      const rBump = fBump.clone(); rBump.position.z = -3.48; chassis.add(rBump);

      for (const sx of [-1, 1]) {
        for (let wz = 1.65; wz >= -2.55; wz -= 1.05) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.92), matGlass);
          pane.position.set(sx * (w * 0.48), 1.94, wz); chassis.add(pane);
        }
      }
      const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.84, 0.06), matGlass);
      rearGlass.position.set(0, 1.94, -3.45); chassis.add(rearGlass);
      for (let rz = 1.4; rz >= -2.2; rz -= 1.15) {
        for (const sx of [-0.56, 0.56]) {
          const sb = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.62, 0.14), matSeat);
          sb.position.set(sx, 1.42, rz); chassis.add(sb);
          const sc = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.14, 0.44), matSeat);
          sc.position.set(sx, 1.14, rz + 0.18); chassis.add(sc);
        }
      }

      const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.26, 2.35), matRoofAc);
      acPod.position.set(0, 2.66, -0.45); acPod.castShadow = true; chassis.add(acPod);
      const rLad = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.85, 0.08), matMetal);
      rLad.position.set(-0.62, 1.56, -3.52); chassis.add(rLad);

      hoodPivot.position.set(0, 1.44, 3.20);
      const svcHatch = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.06), matPaint);
      svcHatch.position.set(0, -0.22, 0.28); hoodPivot.add(svcHatch);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, w * 0.50, 1.86, 3.36, matMetal, matRubber, 0.28);
    }

    // ========================================================================
    // 14.1B-3. PANZERKAMPFWAGEN 140A4 "SCHRECKENSFÜRST" (DEV-ONLY: SILVER)
    //          68T | 8.1m Hull (11.5m Gun-Forward) x 3.9m Wide x 2.65m Tall
    //          Taiga Splinter Camo + "For The Imperium!" + Crimson "7"
    //          140mm Rh-140/56 ETC, Remote 40mm AutoKanone, STURM Blade & APS!
    // ========================================================================
    else if (vehicleId === "pzkpfw_140a4") {
      plateText = "SD-140A4"; roundHL = false; hlY = 1.24; hlZ = 3.92; hlSpread = 1.48;

      // 1. MULTI-TONE GEOMETRIC SPLINTER CAMOUFLAGE TEXTURES (Matching Reference Designs!)
      const makeSplinterTex = (mode = "turret") => {
        const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#313b33"; ctx.fillRect(0, 0, 512, 256);

        // Crisp angular stealth splinter polygons (charcoal, forest pine, slate gunmetal, moss)
        const polys = [
          { col: "#1d2320", pts: [[0,0],[150,0],[95,125],[0,95]] },
          { col: "#445045", pts: [[135,0],[295,0],[245,118],[105,95]] },
          { col: "#252c2d", pts: [[280,0],[440,0],[395,130],[255,105]] },
          { col: "#3c473e", pts: [[420,0],[512,0],[512,140],[380,115]] },
          { col: "#1a201d", pts: [[30,105],[205,90],[165,256],[0,256]] },
          { col: "#4b574c", pts: [[185,110],[355,88],[385,256],[165,256]] },
          { col: "#222928", pts: [[345,105],[512,85],[512,256],[370,256]] },
          { col: "#5a665b", pts: [[85,35],[180,55],[145,145],[65,120]] },
          { col: "#2d3632", pts: [[310,40],[425,25],[405,135],[295,120]] }
        ];
        for (const p of polys) {
          ctx.fillStyle = p.col; ctx.beginPath();
          ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (let k = 1; k < p.pts.length; k++) ctx.lineTo(p.pts[k][0], p.pts[k][1]);
          ctx.closePath(); ctx.fill();
        }

        if (mode === "glacis") {
          // Twin crisp white-silver tactical stripes on the sloped front upper glacis!
          ctx.fillStyle = "#dce3ea";
          ctx.beginPath(); ctx.moveTo(165, 0); ctx.lineTo(205, 0); ctx.lineTo(175, 256); ctx.lineTo(135, 256); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(230, 0); ctx.lineTo(270, 0); ctx.lineTo(240, 256); ctx.lineTo(200, 256); ctx.closePath(); ctx.fill();
        } else if (mode === "skirt") {
          // Diagonal silver-white stripe + Imperium/Germanic Cross + "For The Imperium!" & Crimson "7"!
          ctx.fillStyle = "#d9e1e8";
          ctx.beginPath(); ctx.moveTo(278, 0); ctx.lineTo(312, 0); ctx.lineTo(268, 256); ctx.lineTo(234, 256); ctx.closePath(); ctx.fill();

          // Black & White Tactical Cross Emblem
          const cx = 182, cy = 112;
          ctx.fillStyle = "#f2f5f8";
          ctx.fillRect(cx - 28, cy - 10, 56, 20);
          ctx.fillRect(cx - 10, cy - 28, 20, 56);
          ctx.fillStyle = "#121518";
          ctx.fillRect(cx - 24, cy - 6, 48, 12);
          ctx.fillRect(cx - 6, cy - 24, 12, 48);

          // Crimson "7" + "For The Imperium!" Insignia
          ctx.strokeStyle = "#e6ecf2"; ctx.lineWidth = 3;
          ctx.strokeRect(24, 52, 62, 92);
          ctx.fillStyle = "#d62828"; ctx.font = "900 66px monospace"; ctx.textAlign = "center";
          ctx.fillText("7", 55, 120);
          ctx.fillStyle = "#e63946"; ctx.font = "italic bold 24px serif"; ctx.textAlign = "left";
          ctx.fillText("For The Imperium!", 324, 108);
          ctx.fillStyle = "#d8e0e8"; ctx.font = "bold 14px monospace";
          ctx.fillText("SCHRECKENSFÜRST • 140A4", 324, 134);
        } else if (mode === "turret_insig") {
          ctx.strokeStyle = "#f2f4f8"; ctx.lineWidth = 4;
          ctx.strokeRect(22, 48, 86, 118);
          ctx.fillStyle = "#d62828"; ctx.font = "900 84px monospace"; ctx.textAlign = "center";
          ctx.fillText("7", 65, 134);
          ctx.fillStyle = "#e63946"; ctx.font = "italic bold 36px serif"; ctx.textAlign = "left";
          ctx.fillText("For The Imperium!", 132, 118);
          ctx.fillStyle = "#dce4ec"; ctx.font = "bold 17px monospace";
          ctx.fillText("SCHRECKENSFÜRST • 140A4", 134, 152);
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
        return tex;
      };

      const camoTex       = makeSplinterTex("turret");
      const glacisTex     = makeSplinterTex("glacis");
      const skirtTex      = makeSplinterTex("skirt");
      const turretInsig   = makeSplinterTex("turret_insig");

      const matCamo    = new THREE.MeshStandardMaterial({ map: camoTex, roughness: 0.72, metalness: 0.28, flatShading: true });
      const matGlacis  = new THREE.MeshStandardMaterial({ map: glacisTex, roughness: 0.70, metalness: 0.28 });
      const matSkirt   = new THREE.MeshStandardMaterial({ map: skirtTex, roughness: 0.72, metalness: 0.26 });
      const matInsig   = new THREE.MeshStandardMaterial({ map: turretInsig, roughness: 0.72, metalness: 0.26 });
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x1d2226, roughness: 0.78, metalness: 0.38 });
      const matNERA    = new THREE.MeshStandardMaterial({ color: 0x343f38, roughness: 0.70, metalness: 0.34, flatShading: true });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x3b424b, roughness: 0.45, metalness: 0.78 });
      const matTrack   = new THREE.MeshStandardMaterial({ color: 0x16181b, roughness: 0.88, metalness: 0.42 });
      const matGrouser = new THREE.MeshStandardMaterial({ color: 0x525a64, roughness: 0.52, metalness: 0.82 });
      const matRedAcc  = new THREE.MeshBasicMaterial({ color: 0xe63946 });
      const matLedWht  = new THREE.MeshBasicMaterial({ color: 0xeaf8ff });

      if (!chassis.userData.extraShellMats) chassis.userData.extraShellMats = [];
      chassis.userData.extraShellMats.push(matCamo, matGlacis, matSkirt, matInsig, matArmorDk, matNERA, matSteel, matRubber);

      // 2. LOW-SLUNG SLEEK FRONT-ENGINE STEALTH HULL (8.10m Long x 3.90m Wide!)
      const hullShape = new THREE.Shape();
      hullShape.moveTo(-4.02, 0.76);
      hullShape.lineTo(3.38, 0.74);
      hullShape.lineTo(4.08, 1.18);  // razor-sharp front beak
      hullShape.lineTo(1.72, 1.66);  // shallow-angled front-engine stealth glacis
      hullShape.lineTo(-3.72, 1.66); // low sleek rear capsule deck
      hullShape.lineTo(-4.04, 1.24); // angled rear armored hull plate
      hullShape.closePath();
      chassis.add(this._extrudeSideProfile(hullShape, 2.54, matCamo, 0.03, 0.04));

      // Sloped Front Upper Glacis Armor Plate w/ Twin White Tactical Stripes!
      const glacisPlate = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 2.42), matGlacis);
      glacisPlate.position.set(0, 1.44, 2.88);
      glacisPlate.rotation.x = 0.20;
      glacisPlate.castShadow = true;
      chassis.add(glacisPlate);

      // Front Sponson Cheeks w/ Recessed Rectangular White LED Headlights & Engine Louvers!
      for (const sx of [-1, 1]) {
        const sponson = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.34, 7.86), matArmorDk);
        sponson.position.set(sx * 1.59, 1.50, 0.02); sponson.castShadow = true; chassis.add(sponson);

        // Recessed Rectangular LED Headlight Pod (Matches all 4 Reference Tank Images!)
        const hlPod = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.42), matArmorDk);
        hlPod.position.set(sx * 1.54, 1.26, 3.84); chassis.add(hlPod);
        const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.11, 0.05), matLedWht);
        hlLens.position.set(sx * 1.54, 1.25, 4.05); chassis.add(hlLens);

        // Front MDV-16 V16 Cooling Louvers
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.85), matRubber);
        vent.position.set(sx * 1.54, 1.68, 2.85); chassis.add(vent);

        // Scalloped / Sawtooth Modular Side Skirts (Exposing the 7 Titanium/Crimson Roadwheels!)
        const skirtMain = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 7.45), matSkirt);
        skirtMain.position.set(sx * 1.93, 1.38, -0.05); skirtMain.castShadow = true; chassis.add(skirtMain);
        // Upper beveled armor shoulder along side skirt
        const skirtTop = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 7.55), matArmorDk);
        skirtTop.position.set(sx * 1.90, 1.62, -0.05); skirtTop.rotation.z = -sx * 0.22; chassis.add(skirtTop);
        // Front mudguard fender flap
        const fFlap = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.26, 0.36), matArmorDk);
        fFlap.position.set(sx * 1.60, 1.18, 3.88); fFlap.rotation.x = 0.36; chassis.add(fFlap);
      }

      // Rear Armored Crew Capsule Escape Hatch + Insignia
      const rearHatch = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.78, 0.14), matArmorDk);
      rearHatch.position.set(0, 1.26, -4.05); chassis.add(rearHatch);
      const rearTag = new THREE.Mesh(new THREE.PlaneGeometry(1.20, 0.54), matInsig);
      rearTag.rotation.y = Math.PI; rearTag.position.set(0, 1.28, -4.13); chassis.add(rearTag);

      // Optional STURM Front Wedge Plow (Toggleable in Garage Blueprint; stowed by default so sleek nose shines!)
      p140SturmGroup = new THREE.Group();
      const blade = new THREE.Mesh(new THREE.BoxGeometry(3.88, 0.86, 0.22), matArmorDk);
      blade.position.set(0, 0.92, 4.46); blade.rotation.x = 0.28; blade.castShadow = true; p140SturmGroup.add(blade);
      const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(3.92, 0.16, 0.26), matSteel);
      bladeEdge.position.set(0, 0.50, 4.58); p140SturmGroup.add(bladeEdge);
      for (const sx of [-1.25, 1.25]) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.85), matSteel);
        arm.position.set(sx, 0.90, 4.06); p140SturmGroup.add(arm);
      }
      p140SturmGroup.visible = false;
      chassis.add(p140SturmGroup);

      // 3. FRONT DRIVE SPROCKETS, REAR IDLERS & 14-WHEEL CLOSED-LOOP TRACKS
      const sprGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.66, 14); sprGeo.rotateZ(Math.PI / 2);
      const idlGeo = new THREE.CylinderGeometry(0.37, 0.37, 0.64, 16); idlGeo.rotateZ(Math.PI / 2);
      const trackIdlers = [], trackSprockets = [];
      for (const sx of [-1, 1]) {
        const spr = new THREE.Mesh(sprGeo, matSteel); spr.position.set(sx * 1.60, 1.06,  3.62); chassis.add(spr); trackSprockets.push(spr);
        const idl = new THREE.Mesh(idlGeo, matSteel); idl.position.set(sx * 1.60, 1.04, -3.58); chassis.add(idl); trackIdlers.push(idl);
      }
      const makeTrackSide = (sx) => {
        const tx = sx * 1.60;
        const loopSpans = [], cleats = [];
        for (let k = 0; k < 17; k++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.095, 1.0), matTrack);
          seg.castShadow = true; seg.receiveShadow = true; root.add(seg); loopSpans.push(seg);
        }
        for (let c = 0; c < 42; c++) {
          const cl = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.064, 0.14), matGrouser);
          root.add(cl); cleats.push(cl);
        }
        return { sx, tx, loopSpans, cleats, isP140: true };
      };
      trackSys = { left: makeTrackSide(-1), right: makeTrackSide(1), idlers: trackIdlers, sprockets: trackSprockets, isP140: true };

      // 4. FACETED STEALTH-POLYHEDRAL ARROWHEAD TURRET (Matches All 4 Reference Tank Images!)
      tankTurretPivot = new THREE.Group();
      tankTurretPivot.position.set(0, 1.68, -0.38);
      chassis.add(tankTurretPivot);

      // Turret Ring Collar
      const turRing = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.42, 0.14, 24), matArmorDk);
      turRing.position.set(0, 0.05, 0.05); tankTurretPivot.add(turRing);

      // Custom 16-Vertex Faceted Stealth-Polyhedral Turret Hull (Tapered Chin + Arrowhead Front Cheeks + Cantilevered Bustle!)
      const tVerts = [
        // Bottom Ring Perimeter (y = 0.12) — Undercut stealth bevels!
        [-0.58, 0.12,  1.88], // 0: front-left chin
        [ 0.58, 0.12,  1.88], // 1: front-right chin
        [-1.32, 0.12,  0.75], // 2: mid-front-left lower
        [ 1.32, 0.12,  0.75], // 3: mid-front-right lower
        [-1.28, 0.12, -1.15], // 4: mid-rear-left lower
        [ 1.28, 0.12, -1.15], // 5: mid-rear-right lower
        [-1.02, 0.24, -2.42], // 6: bustle-rear-left lower (undercut!)
        [ 1.02, 0.24, -2.42], // 7: bustle-rear-right lower (undercut!)

        // Mid-Belt Widest Facet Ridge (y = 0.48) — Sharp stealth chine!
        [-0.54, 0.48,  2.26], // 8: nose-left peak
        [ 0.54, 0.48,  2.26], // 9: nose-right peak
        [-1.62, 0.50,  0.82], // 10: widest-left cheek chine
        [ 1.62, 0.50,  0.82], // 11: widest-right cheek chine
        [-1.56, 0.52, -1.15], // 12: mid-rear-left chine
        [ 1.56, 0.52, -1.15], // 13: mid-rear-right chine
        [-1.24, 0.54, -2.56], // 14: bustle-rear-left chine
        [ 1.24, 0.54, -2.56], // 15: bustle-rear-right chine

        // Turret Roof Perimeter (y = 0.84) — Sloped inward stealth upper facets!
        [-0.48, 0.80,  1.68], // 16: roof-front-left
        [ 0.48, 0.80,  1.68], // 17: roof-front-right
        [-1.22, 0.84,  0.62], // 18: roof-mid-front-left
        [ 1.22, 0.84,  0.62], // 19: roof-mid-front-right
        [-1.18, 0.86, -1.12], // 20: roof-mid-rear-left
        [ 1.18, 0.86, -1.12], // 21: roof-mid-rear-right
        [-0.98, 0.86, -2.46], // 22: roof-bustle-left
        [ 0.98, 0.86, -2.46]  // 23: roof-bustle-right
      ];
      const tFaces = [
        // Front arrowhead nose & chin
        [0, 1, 9, 8],
        [8, 9, 17, 16],
        // Angled front-left & front-right stealth cheeks (upper & lower facets!)
        [0, 8, 10, 2],
        [8, 16, 18, 10],
        [1, 3, 11, 9],
        [9, 11, 19, 17],
        // Mid side facets (upper & lower)
        [2, 10, 12, 4],
        [10, 18, 20, 12],
        [3, 5, 13, 11],
        [11, 13, 21, 19],
        // Rear bustle side facets
        [4, 12, 14, 6],
        [12, 20, 22, 14],
        [5, 7, 15, 13],
        [13, 15, 23, 21],
        // Rear bustle plate
        [6, 14, 15, 7],
        [14, 22, 23, 15],
        // Sloped stealth roof deck
        [16, 17, 19, 18],
        [18, 19, 21, 20],
        [20, 21, 23, 22],
        // Bottom belly closure
        [0, 2, 3, 1],
        [2, 4, 5, 3],
        [4, 6, 7, 5]
      ];
      const polyTurret = this._buildFacetedMesh(tVerts, tFaces, matCamo);
      tankTurretPivot.add(polyTurret);

      // Additional Angled NERA Cheek Appliqué Wedges + Side Bustle Stowage Boxes + Insignia Plates!
      for (const sx of [-1, 1]) {
        const cheekSlab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.44, 1.38), matNERA);
        cheekSlab.position.set(sx * 1.14, 0.56, 1.46);
        cheekSlab.rotation.y = sx * 0.62;
        cheekSlab.rotation.z = -sx * 0.28;
        cheekSlab.castShadow = true;
        tankTurretPivot.add(cheekSlab);

        const sideBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 1.24), matArmorDk);
        sideBox.position.set(sx * 1.46, 0.54, -1.78);
        sideBox.rotation.y = -sx * 0.22;
        tankTurretPivot.add(sideBox);

        // Turret Side Insignia Plate ("For The Imperium!" + Crimson "7")
        const sidePl = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.34), matInsig);
        sidePl.position.set(sx * 1.60, 0.52, -0.18);
        sidePl.rotation.y = sx * Math.PI * 0.5;
        tankTurretPivot.add(sidePl);
      }

      // Rear Bustle Blow-Out Panels & Roof Detail Hatches
      for (const bx of [-0.46, 0.46]) {
        const blowOut = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 1.05), matArmorDk);
        blowOut.position.set(bx, 0.89, -1.78); tankTurretPivot.add(blowOut);
      }

      // Donnerschild A7 APS 4-Corner Sensor Pods + Flash Ring
      for (const [ax, az] of [[-1.36, 0.88], [1.36, 0.88], [-1.24, -2.35], [1.24, -2.35]]) {
        const pod = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.28), matSteel);
        pod.position.set(ax, 0.78, az); tankTurretPivot.add(pod);
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.05), matRedAcc);
        led.position.set(ax, 0.80, az + (az > 0 ? 0.15 : -0.15)); tankTurretPivot.add(led);
      }
      p140ApsFlash = new THREE.Mesh(
        new THREE.SphereGeometry(4.2, 14, 12),
        new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: true })
      );
      p140ApsFlash.position.y = 0.55; p140ApsFlash.visible = false; tankTurretPivot.add(p140ApsFlash);

      // Panoramic Zielfalken-IV Electro-Optical Sensor Mast (Left Roof — Reference Image 3!) + Twin Whip Antennas!
      const mastBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 12), matArmorDk);
      mastBase.position.set(-0.68, 0.94, 0.15); tankTurretPivot.add(mastBase);
      const mastStem = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.34, 0.24), matSteel);
      mastStem.position.set(-0.68, 1.18, 0.15); tankTurretPivot.add(mastStem);
      const mastHead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.38), matNERA);
      mastHead.position.set(-0.68, 1.46, 0.15); mastHead.castShadow = true; tankTurretPivot.add(mastHead);
      const mastLens = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.06), matRedAcc);
      mastLens.position.set(-0.68, 1.46, 0.35); tankTurretPivot.add(mastLens);

      for (const ax of [-0.92, 0.92]) {
        const antBase = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.22, 8), matArmorDk);
        antBase.position.set(ax, 0.96, -2.25); tankTurretPivot.add(antBase);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 2.95, 5), matSteel);
        ant.position.set(ax, 2.45, -2.25); tankTurretPivot.add(ant);
      }

      // 5. ANCHORED, INDEPENDENTLY ROTATING REMOTE 40mm AUTOKANONE TURRET (`p140RwsPivot` — Rotates 3x Faster!)
      p140RwsPivot = new THREE.Group();
      p140RwsPivot.position.set(0.62, 0.84, 0.18); // Bolted directly into turret roof (y = 0.84) — ZERO floating gap!
      tankTurretPivot.add(p140RwsPivot);

      // Heavy flanged turret ring + armored cylindrical pedestal
      const rwsCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 16), matArmorDk);
      rwsCollar.position.y = 0.07; p140RwsPivot.add(rwsCollar);
      const rwsPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 0.28, 14), matSteel);
      rwsPedestal.position.y = 0.26; p140RwsPivot.add(rwsPedestal);

      // Trunnion yoke arms holding the elevating 40mm weapon cradle
      for (const yx of [-0.26, 0.26]) {
        const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.22), matArmorDk);
        yoke.position.set(yx, 0.44, 0.02); p140RwsPivot.add(yoke);
      }

      // 2-AXIS ELEVATION / DEPRESSION PIVOT (-10° depression to +55° elevation!)
      p140RwsGunPitch = new THREE.Group();
      p140RwsGunPitch.position.set(0, 0.54, 0.02);
      p140RwsPivot.add(p140RwsGunPitch);

      const rwsCradle = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.30, 0.72), matNERA);
      rwsCradle.position.set(0, 0, 0.02); rwsCradle.castShadow = true; p140RwsGunPitch.add(rwsCradle);
      const rwsAmmoBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.48), matArmorDk);
      rwsAmmoBox.position.set(0.34, -0.02, -0.06); p140RwsGunPitch.add(rwsAmmoBox);
      const rwsOptic = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.34), matArmorDk);
      rwsOptic.position.set(-0.32, 0.04, 0.10); p140RwsGunPitch.add(rwsOptic);
      const rwsLens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), matRedAcc);
      rwsLens.position.set(-0.32, 0.04, 0.28); p140RwsGunPitch.add(rwsLens);

      const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.068, 2.35, 10), matSteel);
      akBarrel.rotation.x = Math.PI / 2; akBarrel.position.set(0, 0.02, 1.46); akBarrel.castShadow = true; p140RwsGunPitch.add(akBarrel);
      const akBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.058, 0.26, 8), matArmorDk);
      akBrake.rotation.x = Math.PI / 2; akBrake.position.set(0, 0.02, 2.70); p140RwsGunPitch.add(akBrake);
      p140RwsMuzzleTip = new THREE.Object3D();
      p140RwsMuzzleTip.position.set(0, 0.02, 2.86);
      p140RwsGunPitch.add(p140RwsMuzzleTip);

      tankCoaxFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 1.35, 8),
        new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 0.94 })
      );
      tankCoaxFlash.rotation.x = Math.PI / 2; tankCoaxFlash.position.set(0, 0.02, 3.43); tankCoaxFlash.visible = false;
      p140RwsGunPitch.add(tankCoaxFlash);

      // 6. 140mm GLATTROHR-ETK KANONE Rh-140/56 ETC + 4-PORT SLOTTED GERMAN MUZZLE BRAKE!
      tankGunPitch = new THREE.Group();
      tankGunPitch.position.set(0, 0.48, 2.08);
      tankTurretPivot.add(tankGunPitch);

      // Sloped stealth gun mantlet
      const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.58), matArmorDk);
      mantlet.rotation.x = -0.14; tankGunPitch.add(mantlet);

      tankBarrelSlide = new THREE.Group();
      tankGunPitch.add(tankBarrelSlide);

      // Multi-stepped thermal-sleeved smoothbore barrel with splinter camo rings
      const bRoot = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.185, 2.45, 16), matCamo);
      bRoot.rotation.x = Math.PI / 2; bRoot.position.z = 1.25; bRoot.castShadow = true; tankBarrelSlide.add(bRoot);
      const bCollar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.24, 16), matArmorDk);
      bCollar1.rotation.x = Math.PI / 2; bCollar1.position.z = 2.45; tankBarrelSlide.add(bCollar1);
      const bEvac = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 1.05, 16), matCamo);
      bEvac.rotation.x = Math.PI / 2; bEvac.position.z = 3.08; bEvac.castShadow = true; tankBarrelSlide.add(bEvac);
      const bTip = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.142, 2.35, 16), matSteel);
      bTip.rotation.x = Math.PI / 2; bTip.position.z = 4.75; bTip.castShadow = true; tankBarrelSlide.add(bTip);

      // Sculpted 4-Port Slotted German Muzzle Brake (Matches Reference Images 2, 3, 4!)
      const mbCore = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.72), matArmorDk);
      mbCore.position.set(0, 0, 6.18); mbCore.castShadow = true; tankBarrelSlide.add(mbCore);
      for (let slot = 0; slot < 4; slot++) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.065), matSteel);
        baffle.position.set(0, 0, 5.90 + slot * 0.18); tankBarrelSlide.add(baffle);
      }

      tankMainFlash = new THREE.Mesh(
        new THREE.ConeGeometry(1.25, 3.85, 10),
        new THREE.MeshBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.94 })
      );
      tankMainFlash.rotation.x = Math.PI / 2; tankMainFlash.position.z = 8.20; tankMainFlash.visible = false;
      tankBarrelSlide.add(tankMainFlash);

      // Front Engine Maintenance Deck Hood Pivot
      hoodPivot.position.set(0, 1.66, 1.75);
      const fDeckHatch = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.08, 1.48), matCamo);
      fDeckHatch.position.set(0, 0.04, 0.74); hoodPivot.add(fDeckHatch);

      tankDriverHoodMesh = new THREE.Group();
      const dVis = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.30), matArmorDk);
      dVis.position.set(0, 1.72, 1.58); tankDriverHoodMesh.add(dVis);
      chassis.add(tankDriverHoodMesh);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
    }

    // ========================================================================
    // 14. KAMAZ-4310 6x6 HEAVY TRUCK
    // ========================================================================
    else if (vehicleId === "kamaz") {
      plateText = "KMZ-4310"; roundHL = true; hlY = 0.72; hlZ = 3.64; hlSpread = 0.92;
      const cabShape = new THREE.Shape();
      cabShape.moveTo(1.18, 0.84); cabShape.lineTo(3.34, 0.84); cabShape.lineTo(3.40, 1.56);
      cabShape.lineTo(3.26, 2.48); cabShape.lineTo(1.22, 2.48); cabShape.closePath();
      chassis.add(this._extrudeSideProfile(cabShape, 2.40, matPaint, 0.08, 0.09, cockpitCfg));
      const visor = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.12, 0.28), matTrim);
      visor.position.set(0, 2.38, 3.44); visor.rotation.x = 0.28; chassis.add(visor);
      for (const sx of [-0.56, 0.56]) {
        const wp = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.58, 0.08), matGlass);
        wp.position.set(sx, 1.94, 3.39); wp.rotation.x = -0.14; chassis.add(wp);
      }
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.54, 0.10), matRubber);
      grille.position.set(0, 1.24, 3.44); chassis.add(grille);
      const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.58, 0.38, 0.36), matMetal);
      bumper.position.set(0, 0.70, 3.56); chassis.add(bumper);
      for (const sx of [-1.06, 1.06]) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.18, 12), matTrim);
        tank.rotation.x = Math.PI / 2; tank.position.set(sx, 0.68, 0.42); chassis.add(tank);
      }
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.40, 16), matTire);
      spare.rotation.z = Math.PI / 2; spare.position.set(0.55, 1.56, 0.88); chassis.add(spare);
      for (const sx of [-1.16, -0.96]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 2.40, 8), matMetal);
        stack.position.set(sx, 2.00, 1.04); chassis.add(stack);
      }
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(2.48, 0.22, 4.75), matMetal);
      bedFloor.position.set(0, 1.04, -1.45); chassis.add(bedFloor);
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x4b5738, roughness: 0.90 });
      for (const sx of [-1.18, 1.18]) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.86, 4.75), sideMat);
        side.position.set(sx, 1.56, -1.45); side.castShadow = true; chassis.add(side);
      }
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.86, 0.14), sideMat);
      backWall.position.set(0, 1.56, -3.78); chassis.add(backWall);
      for (let bz = -3.4; bz <= 0.4; bz += 1.25) {
        const bowL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), matMetal);
        bowL.position.set(-1.16, 2.28, bz); chassis.add(bowL);
        const bowR = bowL.clone(); bowR.position.x = 1.16; chassis.add(bowR);
        const bowTop = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.06, 0.06), matMetal);
        bowTop.position.set(0, 2.64, bz); chassis.add(bowTop);
      }
      hoodPivot.position.set(0, 1.48, 3.42);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.48, 0.08), matPaint);
      panel.position.set(0, -0.24, 0.05); hoodPivot.add(panel);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, 1.24, 1.98, 3.16, matMetal, matRubber, 0.34);
    }

    // ========================================================================
    // LOWER-BODY DYNAMIC MUD SPLATTER PANELS + BACKFIRE EXHAUST FLAME
    // ========================================================================
    const halfLen = spec.bodyLen * 0.5, halfW = spec.bodyWidth * 0.5;
    for (const sx of [-1, 1]) {
      const mudSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.36, spec.bodyLen * 0.84), matDirtOverlay);
      mudSkirt.position.set(sx * (halfW + 0.015), 0.56, 0);
      chassis.add(mudSkirt);
    }
    const rearMud = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.92, 0.36, 0.03), matDirtOverlay);
    rearMud.position.set(0, 0.58, -halfLen - 0.02);
    chassis.add(rearMud);

    const flameMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.48, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.92 })
    );
    flameMesh.rotation.x = -Math.PI / 2;
    flameMesh.position.set(spec.bodyWidth * 0.26, 0.24, -halfLen - 0.16);
    flameMesh.visible = false;
    chassis.add(flameMesh);

    // License plates
    const plateMat = new THREE.MeshBasicMaterial({ map: this.createPlateTexture(plateText) });
    const fPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.15), plateMat);
    fPlate.position.set(0, 0.48, halfLen + 0.18); chassis.add(fPlate);
    const rPlate = fPlate.clone(); rPlate.rotation.y = Math.PI; rPlate.position.set(0, 0.58, -halfLen - 0.12); chassis.add(rPlate);

    // ========================================================================
    // HEADLIGHTS & VISIBLE LAN GLOW HALO SPRITES (ZERO UGLY SOLID CONES!)
    // ========================================================================
    const glowWarmMat = new THREE.SpriteMaterial({
      map: this.getGlowTexture(false), color: 0xfff2c2, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const glowCoolMat = new THREE.SpriteMaterial({
      map: this.getGlowTexture(true), color: 0xc2eeff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });

    const hlGlows = [];
    for (const sx of [-1, 1]) {
      const sideLensMat = (sx < 0) ? matHeadlightL : matHeadlightR;
      if (roundHL) {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.06, 14), matChrome);
        bezel.rotation.x = Math.PI / 2; bezel.position.set(sx * hlSpread, hlY, hlZ); chassis.add(bezel);
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 14), sideLensMat);
        lens.rotation.x = Math.PI / 2; lens.position.set(sx * hlSpread, hlY, hlZ + 0.01); chassis.add(lens);
      } else {
        const housing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.06), matChrome);
        housing.position.set(sx * hlSpread, hlY, hlZ); chassis.add(housing);
        const lens = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.15, 0.08), sideLensMat);
        lens.position.set(sx * hlSpread, hlY, hlZ + 0.01); chassis.add(lens);
      }
      const spr = new THREE.Sprite(glowWarmMat);
      spr.position.set(sx * hlSpread, hlY, hlZ + 0.14);
      spr.scale.set(1.55, 1.55, 1);
      spr.visible = false;
      chassis.add(spr);
      hlGlows.push(spr);

      const blk = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.07), matBlinker);
      blk.position.set(sx * (hlSpread + 0.20), hlY, hlZ - 0.02); chassis.add(blk);
    }

    // Taillights (GT-R R35 already built its signature quad circular LED rings!)
    if (vehicleId !== "gtr_r35") {
      const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.08), matTaillightL);
      tlL.position.set(-halfW * 0.72, 0.72, -halfLen - 0.04); chassis.add(tlL);
      const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.08), matTaillightR);
      tlR.position.set(halfW * 0.72, 0.72, -halfLen - 0.04); chassis.add(tlR);
    }
    const revL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.08), matReverse);
    revL.position.set(-halfW * 0.45, 0.72, -halfLen - 0.04); chassis.add(revL);
    const revR = revL.clone(); revR.position.x = halfW * 0.45; chassis.add(revR);

    // Optional Upgrades
    const snorkelGroup = new THREE.Group();
    const sPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.38, 8), matRubber);
    sPipe.position.set(halfW + 0.05, 1.25, halfLen * 0.35); snorkelGroup.add(sPipe);
    const sHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.22), matRubber);
    sHead.position.set(halfW + 0.05, 1.95, halfLen * 0.35); snorkelGroup.add(sHead);
    chassis.add(snorkelGroup);

    const bullbarGroup = new THREE.Group();
    const bbMain = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.96, 0.26, 0.22), matMetal);
    bbMain.position.set(0, 0.56, halfLen + 0.22); bullbarGroup.add(bbMain);
    const bbLoop = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.65, 0.44, 0.09), matMetal);
    bbLoop.position.set(0, 0.86, halfLen + 0.26); bullbarGroup.add(bbLoop);
    chassis.add(bullbarGroup);

    const lightbarGroup = new THREE.Group();
    const matLedStrip = new THREE.MeshBasicMaterial({ color: 0x334455 });
    const ledGlow = new THREE.Sprite(glowCoolMat);
    ledGlow.visible = false;
    let tankSearchBeam = null;

    const isTurretSearchlight = (spec.isTracked && (tankTurretPivot || shilkaTurretPivot));
    if (isTurretSearchlight) {
      // ======================================================================
      // CUSTOM REALISTIC ARMORED SOVIET TURRET-MOUNTED XENON SEARCHLIGHT!
      // Mounted directly on the tank turret so it sweeps live with your gun
      // & is 100% visible with volumetric beam + SpotLight across LAN!
      // ======================================================================
      const hostPivot = tankTurretPivot || shilkaTurretPivot;
      const matArmorSL = new THREE.MeshStandardMaterial({ color: 0x263120, roughness: 0.80, metalness: 0.35 });
      const matGrillSL = new THREE.MeshStandardMaterial({ color: 0x161a18, roughness: 0.65, metalness: 0.72 });
      const sx = tankTurretPivot ? 0.82 : 0.88;
      const sy = tankTurretPivot ? 0.66 : 0.76;
      const sz = tankTurretPivot ? 1.56 : 1.05;

      // Armored mounting pedestal & U-yoke cradle
      const ped = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.22), matArmorSL);
      ped.position.set(sx, sy - 0.16, sz - 0.04); lightbarGroup.add(ped);
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.09, 0.16), matGrillSL);
      yoke.position.set(sx, sy - 0.04, sz); lightbarGroup.add(yoke);

      // Heavy Cylindrical Armored Searchlight Drum Housing + Protective Rim Hood
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.24, 0.36, 16), matArmorSL);
      drum.rotation.x = Math.PI / 2; drum.position.set(sx, sy + 0.16, sz); drum.castShadow = true; lightbarGroup.add(drum);
      const hoodRim = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.28, 0.16, 16, 1, true), matGrillSL);
      hoodRim.rotation.x = Math.PI / 2; hoodRim.position.set(sx, sy + 0.16, sz + 0.22); lightbarGroup.add(hoodRim);

      // Glowing Parabolic Xenon Lens + Horizontal Armored Louver Slats
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.245, 16), matLedStrip);
      lens.position.set(sx, sy + 0.16, sz + 0.19); lightbarGroup.add(lens);
      for (const ly of [-0.11, 0, 0.11]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.022, 0.05), matGrillSL);
        slat.position.set(sx, sy + 0.16 + ly, sz + 0.23); lightbarGroup.add(slat);
      }

      // Blinding Front Flare Sprite + Volumetric Searchlight Beam Cone (Visible to Local & LAN!)
      ledGlow.position.set(sx, sy + 0.16, sz + 0.36);
      ledGlow.scale.set(2.4, 2.4, 1);
      lightbarGroup.add(ledGlow);

      // v14.1A: Volumetric cone removed — glowing lens flare + real sweeping SpotLight only!

      hostPivot.add(lightbarGroup);
    } else {
      const lbHousing = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.72, 0.11, 0.14), matMetal);
      lbHousing.position.set(0, spec.bodyHeight + 0.16, halfLen * 0.22); lightbarGroup.add(lbHousing);
      const lbLens = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.68, 0.07, 0.05), matLedStrip);
      lbLens.position.set(0, spec.bodyHeight + 0.16, halfLen * 0.22 + 0.07); lightbarGroup.add(lbLens);
      ledGlow.position.set(0, spec.bodyHeight + 0.16, halfLen * 0.22 + 0.18);
      ledGlow.scale.set(2.8, 1.6, 1);
      lightbarGroup.add(ledGlow);
      chassis.add(lightbarGroup);
    }

    // Real PointLight/SpotLight illumination!
    // Tank turret searchlight attaches directly to `lightbarGroup` (on turret pivot) so it sweeps live on Local & LAN!
    let spotL = null, spotR = null, ledSpot = null, remoteHeadLight = null;
    if (isLocal) {
      spotL = new THREE.SpotLight(0xfff4d6, 0, 105, Math.PI / 4.0, 0.48, 1.1);
      spotL.position.set(-hlSpread, hlY + 0.12, hlZ + 0.2);
      spotL.target.position.set(-hlSpread, -1.4, hlZ + 28);
      chassis.add(spotL); chassis.add(spotL.target);

      spotR = new THREE.SpotLight(0xfff4d6, 0, 105, Math.PI / 4.0, 0.48, 1.1);
      spotR.position.set(hlSpread, hlY + 0.12, hlZ + 0.2);
      spotR.target.position.set(hlSpread, -1.4, hlZ + 28);
      chassis.add(spotR); chassis.add(spotR.target);

      if (isTurretSearchlight) {
        const sx = tankTurretPivot ? 0.82 : 0.88, sy = tankTurretPivot ? 0.82 : 0.92, sz = tankTurretPivot ? 1.82 : 1.30;
        ledSpot = new THREE.SpotLight(0xe6f7ff, 0, 235, Math.PI / 5.2, 0.36, 0.85);
        ledSpot.position.set(sx, sy, sz);
        ledSpot.target.position.set(sx, sy - 2.4, sz + 64);
        lightbarGroup.add(ledSpot); lightbarGroup.add(ledSpot.target);
      } else {
        ledSpot = new THREE.SpotLight(0xd9f2ff, 0, 175, Math.PI / 2.9, 0.4, 0.92);
        ledSpot.position.set(0, spec.bodyHeight + 0.22, halfLen * 0.25);
        ledSpot.target.position.set(0, -1.2, halfLen + 48);
        chassis.add(ledSpot); chassis.add(ledSpot.target);
      }
    } else {
      remoteHeadLight = new THREE.PointLight(0xfff2cc, 0, 42, 1.3);
      remoteHeadLight.position.set(0, hlY + 0.4, hlZ + 3.2);
      chassis.add(remoteHeadLight);

      if (isTurretSearchlight) {
        const sx = tankTurretPivot ? 0.82 : 0.88, sy = tankTurretPivot ? 0.82 : 0.92, sz = tankTurretPivot ? 1.82 : 1.30;
        ledSpot = new THREE.SpotLight(0xe6f7ff, 0, 195, Math.PI / 5.0, 0.38, 0.90);
        ledSpot.position.set(sx, sy, sz);
        ledSpot.target.position.set(sx, sy - 2.4, sz + 58);
        lightbarGroup.add(ledSpot); lightbarGroup.add(ledSpot.target);
      } else {
        ledSpot = new THREE.SpotLight(0xd9f2ff, 0, 145, Math.PI / 3.0, 0.42, 0.95);
        ledSpot.position.set(0, spec.bodyHeight + 0.24, halfLen * 0.25);
        ledSpot.target.position.set(0, -1.2, halfLen + 45);
        chassis.add(ledSpot); chassis.add(ledSpot.target);
      }
    }

    const cargoGroup = new THREE.Group();
    cargoGroup.position.set(spec.bedOffset.x, spec.bedOffset.y, spec.bedOffset.z);
    chassis.add(cargoGroup);
    const cargoMeshes = [], strapMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const strapGroup = new THREE.Group(); cargoGroup.add(strapGroup);

    // ========================================================================
    // REAL-TIME X-RAY MECHANICAL SKELETON (Visible when Holding [X]!)
    // Shows live health-colored Engine, Pistons, Radiator, Intercooler,
    // Gearbox, Clutch, Transfer Case, Driveshaft & Tie-Rod Rack!
    // ========================================================================
    const xrayGroup = new THREE.Group();
    xrayGroup.visible = false;
    chassis.add(xrayGroup);

    const makeXrayMat = () => new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.90, depthTest: false });
    const xrayParts = {};
    const addXPart = (key, geo, px, py, pz, rx = 0) => {
      const mat = makeXrayMat();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (rx) m.rotation.x = rx;
      m.renderOrder = 10;
      xrayGroup.add(m);
      xrayParts[key] = mat;
    };

    if (spec.isSchreckensfurst) {
      // Tucked strictly INSIDE the armored front-engine glacis bay (never poking through armor!)
      addXPart("engine",      new THREE.BoxGeometry(1.56, 0.62, 1.58), 0, 1.08, 1.88);
      addXPart("radiator",    new THREE.BoxGeometry(1.88, 0.14, 0.88), 0, 1.32, 2.58);
      addXPart("intercooler", new THREE.BoxGeometry(1.54, 0.20, 0.36), 0, 1.06, 2.86);
      addXPart("gearbox",     new THREE.BoxGeometry(1.74, 0.38, 0.54), 0, 0.98, 2.74);
      addXPart("transfer",    new THREE.BoxGeometry(2.58, 0.30, 0.34), 0, 0.96, 3.04);
      addXPart("driveshaft",  new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8), 0, 1.00, 2.42, Math.PI / 2);

      const capX = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.86, 2.25), new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.45, depthTest: false }));
      capX.position.set(0, 1.18, -2.15); capX.renderOrder = 10; xrayGroup.add(capX);

      const torsionMat = makeXrayMat();
      xrayParts.tieRods = torsionMat;
      for (let k = 0; k < 7; k++) {
        const tz = spec.wheels[k * 2].z;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 3.18, 6), torsionMat);
        bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.80, tz); bar.renderOrder = 10; xrayGroup.add(bar);
      }

      const turX = new THREE.Group(); turX.position.set(0, 1.68, -0.38); xrayGroup.add(turX);
      const matBreech = new THREE.MeshBasicMaterial({ color: 0x2de08b, transparent: true, opacity: 0.94, depthTest: false });
      const matRack   = new THREE.MeshBasicMaterial({ color: 0xffbe0b, transparent: true, opacity: 0.92, depthTest: false });
      const matRam    = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.92, depthTest: false });

      const breechX = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.48, 1.25), matBreech);
      breechX.position.set(0, 0.48, 0.92); breechX.renderOrder = 12; turX.add(breechX);
      const barrelX = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.115, 6.2, 8), matBreech);
      barrelX.rotation.x = Math.PI / 2; barrelX.position.set(0, 0.48, 4.52); barrelX.renderOrder = 11; turX.add(barrelX);

      // Exact 40-shell 1-to-1 bustle ready-rack (4 rows x 10 casings — every single round fired removes 1 casing!)
      const rackShells = [];
      for (let r = 0; r < 40; r++) {
        const row = Math.floor(r / 10), col = r % 10;
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 1.12, 6), matRack);
        sh.rotation.x = Math.PI / 2;
        sh.position.set(-0.855 + col * 0.19, 0.28 + row * 0.145, -1.56);
        sh.renderOrder = 11; turX.add(sh); rackShells.push(sh);
      }
      const ramShell = new THREE.Mesh(new THREE.CylinderGeometry(0.070, 0.074, 1.28, 8), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.98, depthTest: false }));
      ramShell.rotation.x = Math.PI / 2; ramShell.position.set(0, 0.46, -1.25); ramShell.visible = false; ramShell.renderOrder = 13; turX.add(ramShell);
      const ramRod = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 1.45), matRam);
      ramRod.position.set(0, 0.46, -2.05); ramRod.renderOrder = 12; turX.add(ramRod);
      p140XrayAnim = { turX, breechX, rackShells, ramShell, ramRod };
    } else if (spec.isTracked) {
      // AUTHENTIC T-72B X-RAY INTERNALS + LIVE ANIMATED AZ-184 CAROUSEL AUTOLOADER!
      addXPart("engine",      new THREE.BoxGeometry(1.42, 0.68, 1.15), 0, 1.02, -1.78);
      addXPart("radiator",    new THREE.BoxGeometry(1.78, 0.16, 0.96), 0, 1.44, -2.35);
      addXPart("intercooler", new THREE.CylinderGeometry(0.30, 0.30, 0.48, 12), 0.74, 1.12, -1.52, Math.PI / 2);
      addXPart("gearbox",     new THREE.BoxGeometry(1.88, 0.44, 0.52), 0, 0.96, -2.74);
      addXPart("transfer",    new THREE.BoxGeometry(2.58, 0.34, 0.36), 0, 0.94, -3.02);
      addXPart("driveshaft",  new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8), 0, 0.96, -2.32, Math.PI / 2);

      const matArmorX = new THREE.MeshBasicMaterial({ color: 0x4cc9f0, transparent: true, opacity: 0.48, depthTest: false });
      const glacisX = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 1.45), matArmorX);
      glacisX.position.set(0, 1.24, 2.55); glacisX.rotation.x = 0.24; glacisX.renderOrder = 10; xrayGroup.add(glacisX);
      const fuelX = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.98), new THREE.MeshBasicMaterial({ color: 0x3a86ff, transparent: true, opacity: 0.68, depthTest: false }));
      fuelX.position.set(0.78, 1.04, 2.02); fuelX.renderOrder = 10; xrayGroup.add(fuelX);
      const drvSeatX = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.50), new THREE.MeshBasicMaterial({ color: 0x90e0ef, transparent: true, opacity: 0.72, depthTest: false }));
      drvSeatX.position.set(0, 1.06, 1.92); drvSeatX.renderOrder = 10; xrayGroup.add(drvSeatX);

      const torsionMat = makeXrayMat();
      xrayParts.tieRods = torsionMat;
      for (let k = 0; k < 6; k++) {
        const tz = spec.wheels[k * 2].z;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 2.86, 6), torsionMat);
        bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.74, tz); bar.renderOrder = 10;
        xrayGroup.add(bar);
      }

      const matShellWar = new THREE.MeshBasicMaterial({ color: 0xffbe0b, transparent: true, opacity: 0.95, depthTest: false });
      const matShellChg = new THREE.MeshBasicMaterial({ color: 0xff6b35, transparent: true, opacity: 0.92, depthTest: false });
      const matLoaderSt = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.88, depthTest: false });
      const matBreechX  = new THREE.MeshBasicMaterial({ color: 0x2de08b, transparent: true, opacity: 0.95, depthTest: false });

      const carouselBase = new THREE.Group();
      carouselBase.position.set(0, 0.96, 0.16);
      xrayGroup.add(carouselBase);

      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.055, 8, 24), matLoaderSt);
      ringMesh.rotation.x = Math.PI / 2; ringMesh.renderOrder = 11; carouselBase.add(ringMesh);

      const carouselRotor = new THREE.Group();
      carouselBase.add(carouselRotor);
      const carouselShells = [];
      for (let r = 0; r < 22; r++) {
        const ang = (r / 22) * Math.PI * 2;
        const slot = new THREE.Group();
        slot.rotation.y = ang;
        const proj = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.56, 6), matShellWar);
        proj.rotation.x = Math.PI / 2; proj.position.set(0, 0.05, 0.80); proj.renderOrder = 11; slot.add(proj);
        const chg = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.42, 6), matShellChg);
        chg.rotation.x = Math.PI / 2; chg.position.set(0, -0.05, 0.86); chg.renderOrder = 11; slot.add(chg);
        carouselRotor.add(slot);
        carouselShells.push(slot);
      }

      const turretXray = new THREE.Group();
      turretXray.position.set(0, 1.62, 0.16);
      xrayGroup.add(turretXray);

      const breechX = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.40, 0.98), matBreechX);
      breechX.position.set(0, 0.42, 0.65); breechX.renderOrder = 12; turretXray.add(breechX);
      const barrelX = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 4.6, 8), matBreechX);
      barrelX.rotation.x = Math.PI / 2; barrelX.position.set(0, 0.42, 3.35); barrelX.renderOrder = 11; turretXray.add(barrelX);

      const hoistGrp = new THREE.Group();
      hoistGrp.position.set(0, -0.58, -0.52);
      const hoistTray = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.10, 0.95), matLoaderSt);
      hoistTray.renderOrder = 12; hoistGrp.add(hoistTray);
      const liftProj = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.064, 0.62, 8), matShellWar);
      liftProj.rotation.x = Math.PI / 2; liftProj.position.set(0, 0.09, 0.18); liftProj.renderOrder = 13; hoistGrp.add(liftProj);
      const liftChg = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.44, 8), matShellChg);
      liftChg.rotation.x = Math.PI / 2; liftChg.position.set(0, 0.09, -0.34); liftChg.renderOrder = 13; hoistGrp.add(liftChg);
      hoistGrp.visible = false;
      turretXray.add(hoistGrp);

      const rammerRod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.15), matLoaderSt);
      rammerRod.position.set(0, 0.42, -1.22); rammerRod.renderOrder = 12; turretXray.add(rammerRod);

      const spentStub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.068, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xff3b5c, transparent: true, opacity: 0.95, depthTest: false }));
      spentStub.rotation.x = Math.PI / 2; spentStub.visible = false; spentStub.renderOrder = 13; turretXray.add(spentStub);

      tankXrayAnim = { carouselRotor, carouselShells, turretXray, breechX, hoistGrp, liftProj, liftChg, rammerRod, spentStub, spinAngle: 0 };
    } else {
      const engZ = spec.id === "btr80" ? -1.85 : (spec.id === "maz537" ? 0.95 : halfLen * 0.34);
      addXPart("engine",      new THREE.BoxGeometry(0.68, 0.56, 0.88), 0, 0.64, engZ);
      addXPart("radiator",    new THREE.BoxGeometry(spec.bodyWidth * 0.55, 0.46, 0.14), 0, 0.66, halfLen * 0.82);
      addXPart("intercooler", new THREE.BoxGeometry(spec.bodyWidth * 0.48, 0.24, 0.12), 0, 0.42, halfLen * 0.88);
      addXPart("gearbox",     new THREE.BoxGeometry(0.46, 0.38, 0.72), 0, 0.52, engZ - 0.85);
      addXPart("transfer",    new THREE.BoxGeometry(0.44, 0.34, 0.46), 0, 0.44, engZ - 1.50);
      addXPart("driveshaft",  new THREE.CylinderGeometry(0.07, 0.07, spec.bodyLen * 0.56, 8), 0, 0.34, -0.15, Math.PI / 2);
      addXPart("tieRods",     new THREE.BoxGeometry(spec.bodyWidth * 0.84, 0.09, 0.09), 0, 0.30, spec.wheels[0].z);
    }

    const shellMaterials = [matPaint, matTrim, matGalv, matMetal, matCarbon, ...(chassis.userData.extraShellMats || [])];

    const smokeGroup = new THREE.Group();
    const smkZ = spec.rearEngine ? (-halfLen * 0.64) : (halfLen * 0.65);
    const smkY = spec.isTracked ? 1.62 : 1.05;
    smokeGroup.position.set(0, smkY, smkZ); chassis.add(smokeGroup);
    const smokePuffs = [];
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.24 + i * 0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xd9dee3, transparent: true, opacity: 0.0, depthWrite: false })
      );
      smokeGroup.add(puff); smokePuffs.push({ mesh: puff, phase: i / 6 });
    }

    // ========================================================================
    // DYNAMIC FLIR THERMAL SIGNATURE ASSEMBLY (Engine Bay, Exhaust, Barrels!)
    // Visible ONLY in FLIR White-Hot Thermal ([6]); brightness scales dynamically
    // with real engine coolant temperature, EGT, speed & gun barrel heat!
    // ========================================================================
    const thermalGroup = new THREE.Group();
    thermalGroup.visible = false;
    chassis.add(thermalGroup);

    const matThEng = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const matThExh = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    const matThBar = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false
    });

    if (spec.isSchreckensfurst) {
      // Shrouded stealth thermal signature: flush armored MDV-16 side cooling louvers ONLY — zero engine/radiator poking out the glacis!
      for (const sx of [-1, 1]) {
        const thLouver = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.80), matThEng);
        thLouver.position.set(sx * 1.54, 1.69, 2.85);
        thermalGroup.add(thLouver);
        const thSideExh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.68), matThExh);
        thSideExh.position.set(sx * 1.96, 1.52, 2.35);
        thermalGroup.add(thSideExh);
      }
    } else if (spec.rearEngine) {
      const deckW = spec.isTracked ? 2.15 : 1.72;
      const deckL = spec.isTracked ? 2.10 : 1.85;
      const deckY = spec.isTracked ? (spec.id === "t72" ? 1.66 : 1.54) : 1.68;
      const deckZ = -halfLen * 0.54;
      const thDeck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.24, deckL), matThEng);
      thDeck.position.set(0, deckY, deckZ);
      thermalGroup.add(thDeck);

      const thExh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.42, 1.35), matThExh);
      thExh.position.set(-spec.bodyWidth * 0.44, deckY - 0.34, deckZ - 0.35);
      thermalGroup.add(thExh);
    } else {
      const hoodW = Math.min(1.85, spec.bodyWidth * 0.72);
      const hoodL = Math.min(2.1, spec.bodyLen * 0.34);
      const hoodY = Math.max(0.92, spec.bodyHeight * 0.56);
      const hoodZ = halfLen * 0.56;
      const thHood = new THREE.Mesh(new THREE.BoxGeometry(hoodW, 0.44, hoodL), matThEng);
      thHood.position.set(0, hoodY, hoodZ);
      thermalGroup.add(thHood);

      const thGrille = new THREE.Mesh(new THREE.BoxGeometry(hoodW * 0.92, 0.46, 0.24), matThEng);
      thGrille.position.set(0, hoodY - 0.14, halfLen * 0.94);
      thermalGroup.add(thGrille);

      const thExh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.20, 0.75, 8), matThExh);
      thExh.rotation.x = Math.PI / 2;
      thExh.position.set(spec.bodyWidth * 0.30, 0.52, -halfLen * 0.92);
      thermalGroup.add(thExh);
    }

    let thBarrelMesh = null;
    if (tankBarrelSlide) {
      thBarrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 4.75, 10), matThBar);
      thBarrelMesh.rotation.x = Math.PI / 2; thBarrelMesh.position.z = 2.45; thBarrelMesh.visible = false;
      tankBarrelSlide.add(thBarrelMesh);
    } else if (shilkaGunPitch) {
      thBarrelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 2.55), matThBar);
      thBarrelMesh.position.set(0, 0, 1.35); thBarrelMesh.visible = false;
      shilkaGunPitch.add(thBarrelMesh);
    } else if (btrGunGroup) {
      thBarrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.35, 8), matThBar);
      thBarrelMesh.rotation.x = Math.PI / 2; thBarrelMesh.position.set(0, 0.06, 2.05); thBarrelMesh.visible = false;
      btrGunGroup.add(thBarrelMesh);
    } else if (gradPodPitch) {
      thBarrelMesh = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.96, 3.05), matThBar);
      thBarrelMesh.position.set(0, 0.22, 0.26); thBarrelMesh.visible = false;
      gradPodPitch.add(thBarrelMesh);
    }

    // Detailed 3D Wheels
    const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _yUp = new THREE.Vector3(0, 1, 0);
    const wheelAssemblies = [];
    const mudBonus = (vState && vState.upgrades && vState.upgrades.mudTires) ? 0.06 : 0;
    const rad = spec.wheelRadius + mudBonus;
    const wid = spec.wheelWidth + (mudBonus > 0 ? 0.05 : 0);

    for (let i = 0; i < spec.wheels.length; i++) {
      const wDef = spec.wheels[i];
      const rScale = wDef.radiusScale || 1.0;
      const wRad = rad * rScale;
      const wWid = wid * (0.75 + 0.25 * rScale);
      const sideSign = wDef.x < 0 ? -1 : 1;
      const mount = new THREE.Group(); mount.position.set(wDef.x, wDef.y, wDef.z); root.add(mount);
      const steerPivot = new THREE.Group(); mount.add(steerPivot);
      const camberPivot = new THREE.Group(); steerPivot.add(camberPivot);
      const spinGroup = new THREE.Group(); camberPivot.add(spinGroup);

      const tireRubberGroup = new THREE.Group();
      spinGroup.add(tireRubberGroup);

      if (spec.isTracked) {
        const is140W = !!spec.isSchreckensfurst;
        const matRoadSteel = new THREE.MeshStandardMaterial({ color: is140W ? 0x45505e : 0x3b4832, roughness: is140W ? 0.46 : 0.72, metalness: is140W ? 0.76 : 0.45 });
        const matRoadBand  = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.94 });
        const matHub140    = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.42, metalness: 0.55 });
        const matRim140    = new THREE.MeshStandardMaterial({ color: 0xdce4ee, roughness: 0.34, metalness: 0.85 });
        const band = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wWid * 0.86, 22), matRoadBand);
        band.rotation.z = Math.PI / 2; band.castShadow = true; tireRubberGroup.add(band);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.84, wRad * 0.84, wWid * 0.90, 20), matRoadSteel);
        disc.rotation.z = Math.PI / 2; spinGroup.add(disc);
        const rimRing = new THREE.Mesh(new THREE.TorusGeometry(wRad * 0.76, is140W ? 0.038 : 0.032, 8, 20), is140W ? matRim140 : matMetal);
        rimRing.rotation.y = Math.PI / 2; rimRing.position.x = sideSign * (wWid * 0.44); spinGroup.add(rimRing);
        const hubCap = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.25, wRad * 0.30, wWid * 1.02, 12), is140W ? matHub140 : matMetal);
        hubCap.rotation.z = Math.PI / 2; spinGroup.add(hubCap);
        for (let sp = 0; sp < 6; sp++) {
          const ang = (sp / 6) * Math.PI * 2;
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.055, wRad * 0.56, 0.075), matMetal);
          rib.position.set(sideSign * (wWid * 0.44), Math.cos(ang) * wRad * 0.42, Math.sin(ang) * wRad * 0.42);
          rib.rotation.x = ang; spinGroup.add(rib);
        }
      } else {
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wWid, 20), matTire);
        tire.rotation.z = Math.PI / 2; tire.castShadow = true; tireRubberGroup.add(tire);

        const lugGeo = new THREE.BoxGeometry(wWid * 0.92, 0.048 * rScale, wRad * 0.19);
        for (let l = 0; l < 12; l++) {
          const ang = (l / 12) * Math.PI * 2;
          const lug = new THREE.Mesh(lugGeo, matTire);
          lug.position.set(0, Math.cos(ang) * (wRad - 0.005), Math.sin(ang) * (wRad - 0.005));
          lug.rotation.x = ang; tireRubberGroup.add(lug);
        }

        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.58, wRad * 0.58, wWid + 0.015, 14), matRubber);
        barrel.rotation.z = Math.PI / 2; spinGroup.add(barrel);
        const outerLip = new THREE.Mesh(new THREE.TorusGeometry(wRad * 0.55, 0.032 * rScale, 6, 16), matRim);
        outerLip.rotation.y = Math.PI / 2; outerLip.position.x = sideSign * (wWid * 0.44); spinGroup.add(outerLip);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.18, wRad * 0.18, wWid + 0.05, 8), matChrome);
        hub.rotation.z = Math.PI / 2; spinGroup.add(hub);

        for (let sp = 0; sp < 5; sp++) {
          const ang = (sp / 5) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.045, wRad * 0.48, 0.065 * rScale), matRim);
          spoke.position.set(sideSign * (wWid * 0.36), Math.cos(ang) * (wRad * 0.28), Math.sin(ang) * (wRad * 0.28));
          spoke.rotation.x = ang; spinGroup.add(spoke);
        }
      }

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.07, wRad * 0.26, wRad * 0.18), matBrake);
      caliper.position.set(-sideSign * 0.04, 0.04, wRad * 0.28); camberPivot.add(caliper);

      const strutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.0, 8), matSpring); root.add(strutMesh);
      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 1.0), matMetal); root.add(armMesh);
      wheelAssemblies.push({ def: wDef, mount, steerPivot, camberPivot, spinGroup, tireRubberGroup, strutMesh, armMesh, radius: wRad });
    }

    const rig = {
      root, chassis, hoodPivot, cockpit, wheelAssemblies, cargoGroup, cargoMeshes, strapGroup, smokePuffs, spec, p140RwsGunPitch, p140RwsMuzzleTip,
      matPaint, matTire, matDirtOverlay, matHeadlight, matTaillight, matBlinker, matReverse, matLedStrip,
      snorkelGroup, bullbarGroup, lightbarGroup, spotL, spotR, ledSpot, remoteHeadLight, hlGlows, ledGlow, flameMesh,
      hoodOpenTarget: 0, hoodOpenCurrent: 0, baseColor: basePaintColor,

      applyUpgrades(state) {
        if (!state) return;
        this.baseColor.set(state.paintColor || spec.color);
        const stw = state.stowedUpgrades || {};
        snorkelGroup.visible = !!state.upgrades.snorkel && !stw.snorkel;
        bullbarGroup.visible = !!state.upgrades.bullbar;
        lightbarGroup.visible = !!state.upgrades.ledLightbar;
        if (btrGunGroup) btrGunGroup.visible = !!state.upgrades.btrTurret;
        if (tankUpgVisuals && state.upgrades) {
          tankUpgVisuals.snorkel.visible = !!state.upgrades.t72Snorkel && !stw.t72Snorkel;
          tankUpgVisuals.emp.visible     = !!state.upgrades.t72EmpShield;
          tankUpgVisuals.jammer.visible  = !!state.upgrades.t72AcousticJammer;
          tankUpgVisuals.k5.visible      = !!state.upgrades.t72Kontakt5;
          tankUpgVisuals.k5Hull.visible  = !!state.upgrades.t72Kontakt5;
          tankUpgVisuals.fcs.visible     = !!state.upgrades.t72SeismicFcs;
        }
      },

      setCargoVisual(count, cargoTypeId, strapped) {
        while (cargoMeshes.length > 0) cargoGroup.remove(cargoMeshes.pop());
        while (strapGroup.children.length > 0) strapGroup.remove(strapGroup.children[0]);
        const cDef = KK.CARGO_TYPES[cargoTypeId] || KK.CARGO_TYPES.standard;
        const cMat = new THREE.MeshStandardMaterial({ color: cDef.color, roughness: 0.78 });
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / 2), col = i % 2;
          const mesh = (cargoTypeId === "fuel_drums")
            ? new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.68, 10), cMat)
            : new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.52, 0.62), cMat);
          mesh.position.set((col - 0.5) * 0.70, 0.28 + Math.floor(row / 3) * 0.56, 0.42 - (row % 3) * 0.70);
          mesh.castShadow = true; cargoGroup.add(mesh); cargoMeshes.push(mesh);
        }
        if (count > 0 && strapped) {
          for (let s = 0; s < 2; s++) {
            const st = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.05, 0.08), strapMat);
            st.position.set(0, 0.58, 0.35 - s * 0.75); strapGroup.add(st);
          }
        }
      },

      updateVisuals(dt, state) {
        const chassisLiftY = (state.rideHeight || 0) - 0.34;
        chassis.position.y = chassisLiftY;
        this.hoodOpenTarget = state.hoodOpen ? 1.0 : 0.0;
        this.hoodOpenCurrent += (this.hoodOpenTarget - this.hoodOpenCurrent) * Math.min(1, dt * 7);
        hoodPivot.rotation.x = -this.hoodOpenCurrent * 1.1;

        // Dynamic Body & Tire Dirt Accumulation!
        const dirt = Math.max(0, Math.min(1, state.dirtLevel || 0));
        matPaint.color.copy(this.baseColor).lerp(mudBrownColor, dirt * 0.46);
        matPaint.roughness = 0.36 + dirt * 0.58;
        matTire.color.copy(cleanTireColor).lerp(mudBrownColor, dirt * 0.72);
        matDirtOverlay.opacity = dirt * 0.76;

        // Real-Time X-Ray Mechanical View ([X] Hold)!
        const isXray = !!state.xrayActive;
        xrayGroup.visible = isXray;
        for (const sm of shellMaterials) {
          sm.transparent = isXray;
          sm.opacity = isXray ? 0.22 : 1.0;
          sm.depthWrite = !isXray;
        }
        if (isXray && state.xrayHealth) {
          const hColor = (pct) => {
            if (pct > 68) return 0x00ff88;
            if (pct > 36) return 0xffd166;
            return 0xff2a4a;
          };
          const xh = state.xrayHealth;
          if (xrayParts.engine)      xrayParts.engine.color.setHex(hColor(xh.engine));
          if (xrayParts.radiator)    xrayParts.radiator.color.setHex(hColor(xh.radiator));
          if (xrayParts.intercooler) xrayParts.intercooler.color.setHex(hColor(xh.intercooler));
          if (xrayParts.gearbox)     xrayParts.gearbox.color.setHex(hColor(xh.gearbox));
          if (xrayParts.transfer)    xrayParts.transfer.color.setHex(hColor(xh.transfer));
          if (xrayParts.driveshaft)  xrayParts.driveshaft.color.setHex(hColor(xh.driveshaft));
          if (xrayParts.tieRods)     xrayParts.tieRods.color.setHex(hColor(xh.tieRods));
          matSpring.color.setHex(hColor(xh.shocksAvg));
        } else {
          matSpring.color.setHex(0xe63946);
        }

        if (cockpit) cockpit.update(dt, state);
        if (btrTurretPivot) {
          if (state.hasBtrTurret !== undefined && btrGunGroup) btrGunGroup.visible = !!state.hasBtrTurret;
          if (typeof state.turretYaw === "number") btrTurretPivot.rotation.y = state.turretYaw;
          if (btrGunGroup && typeof state.gunPitch === "number") btrGunGroup.rotation.x = -Math.max(-0.14, Math.min(0.55, state.gunPitch));
          if (btrMuzzleFlash) btrMuzzleFlash.visible = (state.btrFlashTimer || 0) > 0;
        }
        if (tankDriverHoodMesh) tankDriverHoodMesh.visible = !state.inCockpitCam;
        if (tankUpgVisuals) {
          if (state.t72Upgrades) {
            const stwV = state.stowedUpgrades || {};
            tankUpgVisuals.snorkel.visible = !!state.t72Upgrades.t72Snorkel && !stwV.t72Snorkel;
            tankUpgVisuals.emp.visible     = !!state.t72Upgrades.t72EmpShield;
            tankUpgVisuals.jammer.visible  = !!state.t72Upgrades.t72AcousticJammer;
            tankUpgVisuals.k5.visible      = !!state.t72Upgrades.t72Kontakt5;
            tankUpgVisuals.k5Hull.visible  = !!state.t72Upgrades.t72Kontakt5;
            tankUpgVisuals.fcs.visible     = !!state.t72Upgrades.t72SeismicFcs;
          }
          if (tankUpgVisuals.jammer.visible && tankUpgVisuals.jammerDish) {
            tankUpgVisuals.jammerDish.rotation.z = Math.sin(performance.now() * 0.004) * 0.55;
          }
        }
        if (gradTurretPivot) {
          if (typeof state.turretYaw === "number") gradTurretPivot.rotation.y = state.turretYaw;
          if (gradPodPitch && typeof state.gunPitch === "number") gradPodPitch.rotation.x = -Math.max(-0.08, Math.min(0.76, state.gunPitch));
          if (gradFlashMesh) gradFlashMesh.visible = (state.gradFlashTimer || 0) > 0;
        }
        if (shilkaTurretPivot) {
          if (typeof state.turretYaw === "number") shilkaTurretPivot.rotation.y = state.turretYaw;
          if (shilkaGunPitch && typeof state.gunPitch === "number") shilkaGunPitch.rotation.x = -Math.max(-0.14, Math.min(0.85, state.gunPitch));
          if (shilkaRadarDish) shilkaRadarDish.rotation.y += dt * (state.shilkaRadarOn ? 4.8 : 1.1);
          if (shilkaBarrels && shilkaFlashes) {
            const activeIdx = state.shilkaActiveBarrel;
            const flOn = (state.shilkaFlashTimer || 0) > 0;
            for (let b = 0; b < 4; b++) {
              const kick = (flOn && activeIdx === b) ? -0.18 : 0;
              shilkaBarrels[b].position.z += (kick - shilkaBarrels[b].position.z) * Math.min(1, dt * 28);
              shilkaFlashes[b].visible = (flOn && activeIdx === b);
            }
          }
        }
        if (tankTurretPivot) {
          if (typeof state.turretYaw === "number") tankTurretPivot.rotation.y = state.turretYaw;
          if (p140RwsPivot && typeof state.rwsYaw === "number") p140RwsPivot.rotation.y = state.rwsYaw - (state.turretYaw || 0);
          if (p140RwsGunPitch && typeof state.rwsPitch === "number") p140RwsGunPitch.rotation.x = -Math.max(-0.175, Math.min(0.96, state.rwsPitch));
          if (tankGunPitch && typeof state.gunPitch === "number") tankGunPitch.rotation.x = -Math.max(-0.12, Math.min(0.32, state.gunPitch));
          if (tankBarrelSlide) tankBarrelSlide.position.z = -(state.barrelRecoil || 0) * 0.68;
          if (tankMainFlash) tankMainFlash.visible = (state.tankFlashTimer || 0) > 0;
          if (tankCoaxFlash) tankCoaxFlash.visible = (state.coaxFlashTimer || 0) > 0;
        }

        if (tankXrayAnim && state.xrayActive) {
          tankXrayAnim.turretXray.rotation.y = typeof state.turretYaw === "number" ? state.turretYaw : 0;
          const rRem = state.t72ReloadTimer || 0;
          const rTot = state.t72ReloadTotal || 6.5;
          const rElapsed = rRem > 0 ? Math.max(0, rTot - rRem) : -1;
          const frac = rRem > 0 ? (rElapsed / rTot) : 0;

          const totalShells = state.t72TotalShells !== undefined ? state.t72TotalShells : 22;
          for (let s = 0; s < tankXrayAnim.carouselShells.length; s++) {
            tankXrayAnim.carouselShells[s].visible = (s < Math.min(22, totalShells));
          }

          tankXrayAnim.breechX.position.z = 0.65 - (state.barrelRecoil || 0) * 0.52;

          if (rRem > 0) {
            if (frac < 0.20) {
              const eT = frac / 0.20;
              tankXrayAnim.spentStub.visible = true;
              tankXrayAnim.spentStub.position.set(0, 0.46 + Math.sin(eT * Math.PI) * 0.42, 0.25 - eT * 2.4);
              tankXrayAnim.hoistGrp.visible = false;
              tankXrayAnim.rammerRod.position.z = -1.22;
            } else if (frac < 0.42) {
              tankXrayAnim.spentStub.visible = false;
              tankXrayAnim.spinAngle += dt * 2.1;
              tankXrayAnim.carouselRotor.rotation.y = tankXrayAnim.spinAngle;
              tankXrayAnim.hoistGrp.visible = true;
              tankXrayAnim.hoistGrp.position.set(0, -0.58, -0.52);
              tankXrayAnim.liftProj.position.z = 0.18;
              tankXrayAnim.liftChg.position.z = -0.34;
              tankXrayAnim.rammerRod.position.z = -1.22;
            } else if (frac < 0.66) {
              const hT = (frac - 0.42) / 0.24;
              tankXrayAnim.spentStub.visible = false;
              tankXrayAnim.hoistGrp.visible = true;
              tankXrayAnim.hoistGrp.position.set(0, -0.58 + hT * 0.92, -0.52);
              tankXrayAnim.liftProj.position.z = 0.18;
              tankXrayAnim.liftChg.position.z = -0.34;
              tankXrayAnim.rammerRod.position.z = -1.22;
            } else if (frac < 0.90) {
              const pT = (frac - 0.66) / 0.24;
              tankXrayAnim.spentStub.visible = false;
              tankXrayAnim.hoistGrp.visible = true;
              tankXrayAnim.hoistGrp.position.set(0, 0.34, -0.52);
              tankXrayAnim.rammerRod.position.z = -1.22 + Math.sin(pT * Math.PI) * 1.12;
              tankXrayAnim.liftProj.position.z = 0.18 + Math.min(1, pT * 1.4) * 1.15;
              tankXrayAnim.liftChg.position.z  = -0.34 + Math.max(0, (pT - 0.25) * 1.35) * 1.15;
            } else {
              const dT = (frac - 0.90) / 0.10;
              tankXrayAnim.spentStub.visible = false;
              tankXrayAnim.hoistGrp.visible = false;
              tankXrayAnim.rammerRod.position.z = -1.22;
              tankXrayAnim.breechX.position.y = 0.42 - Math.sin(dT * Math.PI) * 0.08;
            }
          } else {
            tankXrayAnim.spentStub.visible = false;
            tankXrayAnim.hoistGrp.visible = false;
            tankXrayAnim.rammerRod.position.z = -1.22;
            tankXrayAnim.breechX.position.y = 0.42;
          }
        }

        if (p140SturmGroup && state.t72Upgrades) p140SturmGroup.visible = !!state.t72Upgrades.sturmKit && !(state.stowedUpgrades && state.stowedUpgrades.sturmKit);
        if (p140ApsFlash) p140ApsFlash.visible = (state.apsFlashTimer || 0) > 0;
        if (p140XrayAnim && state.xrayActive) {
          p140XrayAnim.turX.rotation.y = typeof state.turretYaw === "number" ? state.turretYaw : 0;
          p140XrayAnim.breechX.position.z = 0.85 - (state.barrelRecoil || 0) * 0.58;
          const totalS = state.t72TotalShells !== undefined ? state.t72TotalShells : 40;
          for (let s = 0; s < p140XrayAnim.rackShells.length; s++) p140XrayAnim.rackShells[s].visible = (s < totalS);
          const rRem = state.t72ReloadTimer || 0, rTot = state.t72ReloadTotal || 4.8;
          if (rRem > 0) {
            const frac = Math.max(0, Math.min(1, 1.0 - rRem / rTot));
            p140XrayAnim.ramShell.visible = (frac > 0.18 && frac < 0.88);
            const push = frac > 0.35 ? Math.min(1, (frac - 0.35) / 0.45) : 0;
            p140XrayAnim.ramShell.position.z = -1.25 + push * 1.95;
            p140XrayAnim.ramRod.position.z = -2.05 + Math.sin(push * Math.PI) * 1.55;
          } else {
            p140XrayAnim.ramShell.visible = false;
            p140XrayAnim.ramRod.position.z = -2.05;
          }
        }

        if (trackSys && (wheelAssemblies.length === 12 || wheelAssemblies.length === 14)) {
          const zAxis = new THREE.Vector3(0, 0, 1);
          const updateClosedTrack = (sideObj, isRight) => {
            const tx = sideObj.tx;
            const cy = chassisLiftY;
            const perSide = wheelAssemblies.length / 2;
            let avgSpin = 0, avgBounce = 0;
            const wBot = [];
            for (let k = 0; k < perSide; k++) {
              const wa = wheelAssemblies[k * 2 + (isRight ? 1 : 0)];
              const wy = wa.mount.position.y;
              wBot.push(new THREE.Vector3(tx, wy - wa.radius + 0.02, wa.def.z));
              avgSpin += (state.wheelSpins && state.wheelSpins[k * 2 + (isRight ? 1 : 0)]) ? state.wheelSpins[k * 2 + (isRight ? 1 : 0)] : 0;
              avgBounce += wy;
            }
            avgSpin /= perSide;
            const topSag = Math.sin(avgSpin * 2.5) * 0.025 + Math.max(-0.04, Math.min(0.04, (avgBounce / perSide) * 0.08));

            const zF = sideObj.isP140 ? 3.62 : (sideObj.isShilka ? 2.86 : 3.10);
            const zFN = sideObj.isP140 ? 4.02 : (sideObj.isShilka ? 3.16 : 3.46);
            const zR = sideObj.isP140 ? -3.58 : (sideObj.isShilka ? -2.84 : -3.08);
            const zRT = sideObj.isP140 ? -3.96 : (sideObj.isShilka ? -3.14 : -3.46);
            const yTop = sideObj.isP140 ? 1.48 : (sideObj.isShilka ? 1.20 : 1.34);
            const loop = [
              new THREE.Vector3(tx, yTop + cy, zF),
              new THREE.Vector3(tx, (yTop - 0.30) + cy, zFN),
              new THREE.Vector3(tx, 0.62 + cy, zF + 0.04),
              ...wBot,
              new THREE.Vector3(tx, 0.60 + cy, zR - 0.04),
              new THREE.Vector3(tx, (yTop - 0.32) + cy, zRT),
              new THREE.Vector3(tx, (yTop + 0.02) + cy, zR),
              new THREE.Vector3(tx, (yTop + 0.01) + cy + topSag, zR * 0.55),
              new THREE.Vector3(tx, (yTop - 0.01) + cy - topSag, 0.00),
              new THREE.Vector3(tx, (yTop + 0.01) + cy + topSag, zF * 0.55),
              new THREE.Vector3(tx, yTop + cy, zF - 0.55)
            ];
            const nSeg = loop.length;
            const segLens = [];
            let totalPerim = 0;
            for (let s = 0; s < nSeg; s++) {
              const a = loop[s], b = loop[(s + 1) % nSeg];
              const dir = b.clone().sub(a);
              const len = Math.max(0.08, dir.length());
              segLens.push(len);
              totalPerim += len;
              const seg = sideObj.loopSpans[s];
              if (seg) {
                seg.position.copy(a).addScaledVector(dir, 0.5);
                seg.scale.set(1, 1, len + 0.16);
                seg.quaternion.setFromUnitVectors(zAxis, dir.normalize());
              }
            }

            const scrollDist = (avgSpin * 0.44);
            const cleats = sideObj.cleats;
            const nC = cleats.length;
            for (let c = 0; c < nC; c++) {
              let targetD = (((c / nC) * totalPerim - scrollDist) % totalPerim + totalPerim) % totalPerim;
              let sIdx = 0;
              while (sIdx < nSeg - 1 && targetD > segLens[sIdx]) {
                targetD -= segLens[sIdx];
                sIdx++;
              }
              const a = loop[sIdx], b = loop[(sIdx + 1) % nSeg];
              const frac = Math.max(0, Math.min(1, targetD / Math.max(0.05, segLens[sIdx])));
              const cl = cleats[c];
              cl.position.lerpVectors(a, b, frac);
              const dir = b.clone().sub(a).normalize();
              cl.quaternion.setFromUnitVectors(zAxis, dir);
            }
          };
          updateClosedTrack(trackSys.left, false);
          updateClosedTrack(trackSys.right, true);
          const spL = (state.wheelSpins && state.wheelSpins[0]) || 0;
          const spR = (state.wheelSpins && state.wheelSpins[1]) || 0;
          if (trackSys.idlers[0]) trackSys.idlers[0].rotation.x = spL;
          if (trackSys.idlers[1]) trackSys.idlers[1].rotation.x = spR;
          if (trackSys.sprockets[0]) trackSys.sprockets[0].rotation.x = spL;
          if (trackSys.sprockets[1]) trackSys.sprockets[1].rotation.x = spR;
        }

        // Exhaust backfire flash
        flameMesh.visible = !!(state.backfireTimer && state.backfireTimer > 0);
        if (flameMesh.visible) {
          const sc = 0.7 + Math.random() * 0.6;
          flameMesh.scale.set(sc, sc * 1.2, sc);
        }

        const camberRad = ((state.camberDeg || 0) * Math.PI) / 180;
        const toeRad = ((state.toeDeg || 0) * Math.PI) / 180;

        for (let i = 0; i < wheelAssemblies.length; i++) {
          const wa = wheelAssemblies[i];
          const sideSign = wa.def.x < 0 ? -1 : 1;
          const suspY = (state.wheelOffsets && state.wheelOffsets[i] !== undefined) ? state.wheelOffsets[i] : -spec.restLength * 0.45;
          wa.mount.position.set(wa.def.x, wa.def.y + suspY, wa.def.z);
          const stScale = wa.def.steerScale !== undefined ? wa.def.steerScale : 1.0;
          if (spec.isTracked) {
            wa.steerPivot.rotation.y = 0;
            wa.camberPivot.rotation.z = 0;
          } else {
            wa.steerPivot.rotation.y = (wa.def.steer ? (state.steerAngle || 0) * stScale : 0) + sideSign * toeRad * (wa.def.steer ? 1 : 0.4);
            wa.camberPivot.rotation.z = -sideSign * camberRad;
          }
          if (state.wheelSpins && state.wheelSpins[i] !== undefined) wa.spinGroup.rotation.x = state.wheelSpins[i];
          if (wa.tireRubberGroup) {
            const isBlown = !!(state.blownTires && state.blownTires[i]);
            wa.tireRubberGroup.visible = !isBlown;
          }

          _v1.set(wa.def.x * 0.72, wa.def.y + 0.46 + chassisLiftY, wa.def.z);
          _v2.set(wa.def.x * 0.90, wa.def.y + suspY, wa.def.z);
          wa.strutMesh.position.copy(_v1).add(_v2).multiplyScalar(0.5);
          wa.strutMesh.scale.set(1, Math.max(0.15, _v1.distanceTo(_v2)), 1);
          _v3.copy(_v1).sub(_v2).normalize();
          wa.strutMesh.quaternion.setFromUnitVectors(_yUp, _v3);

          const armIn = _v4.set(sideSign * spec.bodyWidth * 0.25, 0.20 + chassisLiftY, wa.def.z);
          const armOut = _v5.set(wa.def.x * 0.92, wa.def.y + suspY, wa.def.z);
          wa.armMesh.position.copy(armIn).add(armOut).multiplyScalar(0.5);
          wa.armMesh.scale.set(1, 1, Math.max(0.15, armIn.distanceTo(armOut)));
          wa.armMesh.lookAt(armOut);
        }

        // Sync physical LED lightbar mesh on remote LAN cars!
        if (state.hasLightbar !== undefined) lightbarGroup.visible = !!state.hasLightbar;

        // Independent Damageable Left/Right Headlights (Flicker < 40%, Shattered at 0%!)
        const hlHpL = state.headlightL !== undefined ? state.headlightL : 100;
        const hlHpR = state.headlightR !== undefined ? state.headlightR : 100;
        const nowMs = performance.now();
        const empFlick = (state.empGlitch > 0) ? (Math.random() < 0.45 ? 0.04 : (0.5 + Math.random() * 0.9)) : 1.0;
        const flickL = (hlHpL <= 2 ? 0 : (hlHpL < 40 ? ((Math.sin(nowMs * 0.045) > -0.25) ? 0.55 : 0.05) : 1.0)) * empFlick;
        const flickR = (hlHpR <= 2 ? 0 : (hlHpR < 40 ? ((Math.sin(nowMs * 0.052 + 1.4) > -0.25) ? 0.55 : 0.05) : 1.0)) * (state.empGlitch > 0 ? (Math.random() < 0.45 ? 0.04 : 1.1) : 1.0);

        const hlOn = !!state.headlights;
        const hlActiveL = hlOn && flickL > 0.1;
        const hlActiveR = hlOn && flickR > 0.1;
        const lbHp = state.lightbarHp !== undefined ? state.lightbarHp : 100;
        const tlHpL = state.taillightL !== undefined ? state.taillightL : 100;
        const tlHpR = state.taillightR !== undefined ? state.taillightR : 100;
        const lbFlick = lbHp <= 2 ? 0 : (lbHp < 55 ? (Math.sin(nowMs * 0.04) > -0.2 ? 0.75 : 0.1) : 1.0);
        const lbOn = !!state.lightbar && lightbarGroup.visible && lbFlick > 0.2 && (state.empGlitch > 0 ? Math.random() > 0.42 : true);

        matHeadlightL.color.setHex(hlHpL <= 2 ? 0x16181c : (hlActiveL ? 0xfffce0 : 0x555248));
        matHeadlightR.color.setHex(hlHpR <= 2 ? 0x16181c : (hlActiveR ? 0xfffce0 : 0x555248));
        matLedStrip.color.setHex(lbHp <= 2 ? 0x111518 : (lbOn ? 0xd9f7ff : 0x22303c));
        matTaillightL.color.setHex(tlHpL <= 2 ? 0x151212 : (state.braking ? 0xff1e1e : (hlOn ? 0xa31414 : 0x450b0b)));
        matTaillightR.color.setHex(tlHpR <= 2 ? 0x151212 : (state.braking ? 0xff1e1e : (hlOn ? 0xa31414 : 0x450b0b)));
        matReverse.color.setHex(state.reversing ? 0xffffff : 0x333333);
        const blink = state.hazards && (Math.floor(nowMs / 360) % 2 === 0);
        matBlinker.color.setHex(blink ? 0xffa600 : 0x452d05);

        if (hlGlows[0]) hlGlows[0].visible = hlActiveL;
        if (hlGlows[1]) hlGlows[1].visible = hlActiveR;
        ledGlow.visible = lbOn;
        if (tankSearchBeam) tankSearchBeam.visible = lbOn;
        if (spotL) spotL.intensity = hlOn ? (2.8 * flickL) : 0;
        if (spotR) spotR.intensity = hlOn ? (2.8 * flickR) : 0;
        if (ledSpot) ledSpot.intensity = lbOn ? (isTurretSearchlight ? (isLocal ? 6.8 : 5.6) : (isLocal ? 5.2 : 4.6)) : 0;
        if (remoteHeadLight) remoteHeadLight.intensity = lbOn ? 3.2 : (hlOn ? ((flickL + flickR) * 1.15) : 0);

        if (state.cargoTilt !== undefined) cargoGroup.rotation.z = state.cargoTilt;

        const smk = state.smokeLevel || 0;
        for (const p of smokePuffs) {
          if (smk > 0.05) {
            p.phase = (p.phase + dt * (0.65 + smk * 0.8)) % 1.0;
            p.mesh.position.set(Math.sin(p.phase * 7) * 0.25 * p.phase, p.phase * 2.2, -p.phase * 0.6);
            const sc = 0.6 + p.phase * 1.9; p.mesh.scale.set(sc, sc, sc);
            p.mesh.material.opacity = Math.sin(p.phase * Math.PI) * Math.min(0.8, smk);
            p.mesh.material.color.setHex(smk > 0.65 ? 0x303338 : 0xdde5ed);
          } else { p.mesh.material.opacity = 0; }
        }

        // DYNAMIC FLIR ENGINE, EXHAUST, BARREL & TIRE THERMAL SIGNATURES!
        const isFlir = (state.thermalMode === 1);
        thermalGroup.visible = isFlir;
        if (thBarrelMesh) thBarrelMesh.visible = isFlir && ((state.barrelHeat || 0) > 0.04);
        if (isFlir) {
          const cTemp = state.coolantTemp !== undefined ? state.coolantTemp : 82;
          const eTemp = state.egtTemp !== undefined ? state.egtTemp : 300;
          const engNorm = Math.max(0, Math.min(1.0, (cTemp - 42) / 56));
          const egtNorm = Math.max(0, Math.min(1.0, (eTemp - 160) / 520));
          matThEng.opacity = Math.min(0.88, engNorm * 0.64 + egtNorm * 0.24);
          matThExh.opacity = Math.min(0.94, engNorm * 0.35 + egtNorm * 0.62);
          if (thBarrelMesh) {
            const bH = Math.max(0, Math.min(1.0, state.barrelHeat || 0));
            matThBar.opacity = Math.min(0.95, bH * 0.92);
          }
          const spdWarm = Math.min(0.32, (state.speedKmh || 0) / 260);
          if (matTire && matTire.emissive) {
            matTire.emissive.setHex(0xffffff);
            matTire.emissiveIntensity = spdWarm;
          }
        } else {
          if (matTire && matTire.emissive) {
            matTire.emissive.setHex(0x000000);
            matTire.emissiveIntensity = 0;
          }
        }
      }
    };
    rig.applyUpgrades(vState);
    return rig;
  }
};
