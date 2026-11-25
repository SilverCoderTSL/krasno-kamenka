// ============================================================================
// js/cryptids.js (v13) — Staged Buildup, Zero-Text Immersion, Articulated
// Siren Head, Animated Multi-Jaw Sandwyrm (Earth Rumble + Massive Internal Dmg),
// Volcanic T-Rex, Yeti, Snowman & Clarkson's Farm Sanctuary Exclusion!
// ============================================================================
window.KK = window.KK || {};

KK.CryptidManager = class CryptidManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.projectiles = [];
    this.syncAccum = 0;
    this.anyThreatNear = false;
    this.cameraShakeOut = 0;
    this.empTrigger = null; // { dur, kind: "sonic" | "radiation" } consumed by main.js!

    this.geoLog = new THREE.CylinderGeometry(0.28, 0.32, 3.2, 6);
    this.geoLog.rotateZ(Math.PI / 2);
    this.matLog = new THREE.MeshStandardMaterial({ color: 0x523924, roughness: 0.94 });
    this.geoIceBall = new THREE.DodecahedronGeometry(0.68, 0);
    this.matIceBall = new THREE.MeshStandardMaterial({ color: 0xbceeff, emissive: 0x1c4a66, roughness: 0.35 });

    this.yeti = this._createYeti();
    this.snowman = this._createSnowman();
    this.sandworm = this._createSandworm();
    this.sirenhead = this._createSirenHead();
    this.trex = this._createTRex();
    this.godzilla = this._createGodzilla();

    this.allList = [this.yeti, this.snowman, this.sandworm, this.sirenhead, this.trex, this.godzilla];
    this.sandwormDist = 9999;
    this.sandwormActive = false;
    this.iceAuraStrength = 0;
    this.quicksandDrag = 0;
  }

  _inSanctuary(gx, gz, pad = 35) {
    if (KK.CLARKSON_FARM && Math.hypot(gx - KK.CLARKSON_FARM.x, gz - KK.CLARKSON_FARM.z) < (KK.CLARKSON_FARM.radius + pad)) return true;
    if (KK.HAMMOND_MESA && Math.hypot(gx - KK.HAMMOND_MESA.x, gz - KK.HAMMOND_MESA.z) < (KK.HAMMOND_MESA.radius + pad)) return true;
    return false;
  }

  // Handle KPVT 14.5mm autocannon hit from a rearmed BTR-80 (Staggers & retreats — never permakills!)
  // v14.2 EXPONENTIAL CALIBER STUN FORMULA (Anchored to T-72B 125mm = 9.5s base!)
  _isLandSafe(gx, gz, coastM = 10.0, riverPad = 18.0, mainlandOnly = true) {
    if (mainlandOnly && this.world.isMainlandDry) return this.world.isMainlandDry(gx, gz, coastM, riverPad);
    return this.world.isDryInland ? this.world.isDryInland(gx, gz, coastM, riverPad) : true;
  }

  _moveDryLand(ent, desiredAng, stepDist, extraCheck = null, allowSlide = true) {
    const offsets = allowSlide ? [0, 0.55, -0.55, 1.15, -1.15, 1.65, -1.65] : [0];
    for (let i = 0; i < offsets.length; i++) {
      const a = desiredAng + offsets[i];
      const nx = ent.gx + Math.sin(a) * stepDist;
      const nz = ent.gz + Math.cos(a) * stepDist;
      if (!this._isLandSafe(nx, nz)) continue;
      if (extraCheck && !extraCheck(nx, nz)) continue;
      ent.gx = nx;
      ent.gz = nz;
      return true;
    }
    return false;
  }

  _moveDryInlandFlee(ent, fleeAng, stepDist) {
    // Prefer fleeing away from player; if blocked by ocean/river, steer toward dry mainland interior!
    if (this._moveDryLand(ent, fleeAng, stepDist, null, true)) return true;
    const toCenter = Math.atan2(-ent.gx, -ent.gz);
    return this._moveDryLand(ent, toCenter, stepDist, null, true);
  }

  _calcCaliberStun(caliberMm = 125, shellMult = 1.0) {
    return +(9.5 * Math.pow(Math.max(10, caliberMm) / 125.0, 2.2) * shellMult).toFixed(2);
  }

  applyBulletHit(gx, gy, gz, audio, hasAcousticJam = false, caliberMm = 14.5) {
    // Exponential caliber power: 14.5mm (~0.10x), 23mm (~0.24x), 40mm (~0.80x)
    const calPow = Math.pow(Math.max(12, caliberMm) / 40.0, 2.1);
    for (const c of this.allList) {
      if (c.state === "dormant" || c.state === "submerged" || c.state === "resting") continue;
      const hitRad = c.kind === "godzilla" ? 26 : (c.kind === "sandworm" ? 28 : 11);
      if (Math.hypot(c.gx - gx, c.gz - gz) < hitRad && Math.abs(c.gy - gy) < 42) {
        c.adaptedToMil = true;
        c.adaptTimer = 95.0;
        if (c.kind === "godzilla") {
          c.flashTimer = Math.max(c.flashTimer || 0, 0.8 + calPow * 1.1);
          // 40mm AutoKanone chips away at Godzilla's combat stamina & can briefly flinch him!
          c.combatFatigue = (c.combatFatigue || 0) + (caliberMm >= 35 ? 6.5 : (caliberMm >= 20 ? 1.8 : 0.6));
          if (caliberMm >= 35) {
            const flinchDur = Math.max(1.2, this._calcCaliberStun(caliberMm, 1.0));
            c.staggerTimer = Math.max(c.staggerTimer || 0, flinchDur);
          }
          if (c.combatFatigue >= 100 && c.state !== "resting") {
            c.state = "resting"; c.restTimer = 180.0; c.combatFatigue = 0; c.beamTimer = 0;
            if (audio) audio.playCryptidSound("godzilla");
            return { hit: true, kind: "godzilla", staggered: true };
          }
          if (Math.random() < 0.25 && audio) audio.playCryptidSound("godzilla");
          return { hit: true, kind: "godzilla" };
        }
        const addAmt = (c.kind === "sirenhead" ? (hasAcousticJam ? 1.2 : 0.6) : (c.kind === "sandworm" ? 0.65 : 1.15)) * Math.max(0.25, calPow * 1.45);
        c.counterAccum = (c.counterAccum || 0) + addAmt;
        if (c.counterAccum >= 2.2) {
          // Stun / retreat scales exponentially with caliber!
          const retreatDur = Math.max(8.0, Math.min(48.0, this._calcCaliberStun(caliberMm, 1.0) * 6.5 + 12.0));
          if (c.kind === "sandworm") {
            c.state = "burrow"; c.burrowTimer = 3.6; c.fleeTimer = retreatDur; c.eruptTimer = 0;
          } else if (c.kind === "sirenhead") {
            c.state = "recoil"; c.recoilTimer = 2.6; c.fleeTimer = retreatDur;
          } else {
            c.state = "flee"; c.fleeTimer = retreatDur;
          }
          c.counterAccum = 0;
          if (audio) audio.playCryptidSound(c.kind);
          return { hit: true, kind: c.kind, staggered: true };
        }
        return { hit: true, kind: c.kind, staggered: false };
      }
    }
    return { hit: false };
  }

  // TANK & ARTILLERY CANNON IMPACT (Exponential Caliber Stun w/ 125mm = 9.5s Base + Pinpoint APFSDS!)
  applyCannonHit(gx, gy, gz, shellType = "he", audio = null, caliberMm = null) {
    const isAp    = (shellType === "ap" || shellType === "ap140");
    const isHe    = (shellType === "he" || shellType === "hesh140");
    const isTherm = (shellType === "therm" || shellType === "therm140");
    const isRlg   = (shellType === "rlg140");
    const cal = caliberMm || ((shellType === "ap140" || shellType === "hesh140" || shellType === "therm140" || shellType === "rlg140") ? 140 : (shellType === "rocket122" ? 122 : 125));

    // v14.2: APFSDS IS A SINGLE PINPOINT DART (ZERO BLAST RADIUS!) — HE/HESH/Thermobaric have wide blast shockwaves!
    const blastRad = isAp ? 0.0 : (isTherm ? 46.0 : (shellType === "rocket122" ? 42.0 : (isRlg ? 30.0 : (isHe ? 26.0 : 22.0))));

    const swm = this.sandworm;
    if ((isHe || isTherm) && this.world.getBiomeWeights(gx, gz).desert > 0.36 && swm.state === "submerged" && Math.hypot(swm.gx - gx, swm.gz - gz) < 460) {
      swm.gx = gx + (Math.random() - 0.5) * 90;
      swm.gz = gz + (Math.random() - 0.5) * 90;
      swm.state = "tremor";
      swm.stageTimer = 6.0;
      return { hit: true, kind: "sandworm" };
    }

    for (const c of this.allList) {
      if (c.state === "dormant" || c.state === "submerged" || c.state === "resting") continue;
      // Tight direct body hitbox for pinpoint APFSDS vs full radius + blast for HE/Thermobaric!
      const entRad = isAp
        ? (c.kind === "godzilla" ? 13.5 : (c.kind === "sandworm" ? 16.0 : 6.5))
        : (c.kind === "godzilla" ? 26.0 : (c.kind === "sandworm" ? 28.0 : 12.0));
      const d = Math.hypot(c.gx - gx, c.gz - gz);
      if (d < (entRad + blastRad) && Math.abs(c.gy - gy) < (isAp ? 32 : 52)) {
        c.adaptedToMil = true;
        c.adaptTimer = 110.0;
        const shellMult = isTherm ? 1.42 : (isRlg ? 1.18 : (isAp ? 1.12 : 1.0));
        const stunSec = this._calcCaliberStun(cal, shellMult); // 125mm HE = 9.5s EXACT!

        if (c.kind === "godzilla") {
          c.staggerTimer = Math.max(c.staggerTimer || 0, stunSec);
          c.flashTimer = 3.5;
          c.attackCd = Math.max(c.attackCd || 0, stunSec * 0.9);
          // Heavy cannon combat fatigue -> fight well enough & Godzilla withdraws to REST for 3 full minutes (180s)!
          const fatigueAdd = (cal >= 140 ? 34 : (cal >= 125 ? 25 : 18)) * (isTherm ? 1.35 : (isAp ? 1.15 : 1.0));
          c.combatFatigue = (c.combatFatigue || 0) + fatigueAdd;
          if (c.combatFatigue >= 100) {
            c.state = "resting";
            c.restTimer = 180.0; // 3 full minutes of peace in the snow peaks!
            c.combatFatigue = 0;
            c.beamTimer = 0;
            c.staggerTimer = 0;
          }
          if (audio) audio.playCryptidSound("godzilla");
          return { hit: true, kind: "godzilla", staggered: true, stunSec };
        }
        if (c.kind === "sirenhead") {
          c.state = "recoil";
          c.recoilTimer = 2.6;
          c.fleeTimer = Math.max(24.0, stunSec * 3.8);
          c.counterAccum = 0;
          c.attackCd = 18.0;
          if (audio) audio.playCryptidSound("siren_sonic_blast");
          return { hit: true, kind: "sirenhead", staggered: true, stunSec };
        }
        if (c.kind === "sandworm") {
          // Visible 3.6-second burrowing dive animation so players clearly see it retreat underground!
          c.state = "burrow";
          c.burrowTimer = 3.6;
          c.fleeTimer = Math.max(26.0, stunSec * 3.4);
          c.counterAccum = 0;
          c.eruptTimer = 0;
          if (audio) audio.playCryptidSound("sandworm");
          return { hit: true, kind: "sandworm", staggered: true, stunSec };
        }
        c.state = "flee";
        c.fleeTimer = Math.max(22.0, stunSec * 3.2);
        c.counterAccum = 0;
        if (audio) audio.playCryptidSound(c.kind);
        return { hit: true, kind: c.kind, staggered: true, stunSec };
      }
    }
    return { hit: false };
  }

  // FLIR WHITE-HOT THERMAL SIGNATURE HIGHLIGHT (Makes cryptids blaze white-hot through night & fog!)
  setThermalMode(isFlir) {
    if (this._thermalOn === isFlir) return;
    this._thermalOn = isFlir;
    for (const c of this.allList) {
      if (!c.mesh) continue;
      c.mesh.traverse((obj) => {
        if (!obj.isMesh || !obj.material) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!m.emissive) continue;
          if (isFlir) {
            if (m._origEmissiveHex === undefined) {
              m._origEmissiveHex = m.emissive.getHex();
              m._origEmissiveInt = m.emissiveIntensity !== undefined ? m.emissiveIntensity : 1.0;
            }
            m.emissive.setHex(0xffffff);
            m.emissiveIntensity = 1.65;
          } else if (m._origEmissiveHex !== undefined) {
            m.emissive.setHex(m._origEmissiveHex);
            m.emissiveIntensity = m._origEmissiveInt;
          }
        }
      });
    }
  }

  _createYeti() {
    const grp = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0x452d1d, roughness: 0.95 });
    const skin = new THREE.MeshStandardMaterial({ color: 0x2b1d14, roughness: 0.9 });
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.85, 1.05), fur);
    torso.position.y = 2.25; torso.castShadow = true; grp.add(torso);
    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.72, 1.15), fur);
    shoulders.position.y = 3.05; grp.add(shoulders);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.86, 0.80), fur);
    head.position.set(0, 3.72, 0.16); grp.add(head);
    const face = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.12), skin);
    face.position.set(0, 3.68, 0.54); grp.add(face);
    for (const ex of [-0.18, 0.18]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), eyeM);
      eye.position.set(ex, 3.76, 0.60); grp.add(eye);
    }
    const makeLimb = (w, h, d, px, py) => {
      const p = new THREE.Group(); p.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fur);
      m.position.y = -h * 0.5; m.castShadow = true; p.add(m); grp.add(p); return p;
    };
    const armL = makeLimb(0.50, 1.85, 0.52, -1.20, 3.05);
    const armR = makeLimb(0.50, 1.85, 0.52,  1.20, 3.05);
    const legL = makeLimb(0.56, 1.45, 0.58, -0.48, 1.45);
    const legR = makeLimb(0.56, 1.45, 0.58,  0.48, 1.45);
    this.scene.add(grp);
    return {
      kind: "yeti", gx: 2250, gy: 15, gz: 720, tx: 2250, ty: 15, tz: 720,
      yaw: 0, tyaw: 0, phase: 0, state: "prowl",
      stageTimer: 0, fleeTimer: 0, attackCd: 0, throwCd: 0, counterAccum: 0, cueCd: 0, dormantCd: 0,
      mesh: grp, armL, armR, legL, legR
    };
  }

  _createSnowman() {
    const grp = new THREE.Group();
    const fur = new THREE.MeshStandardMaterial({ color: 0xeaf4fa, roughness: 0.85 });
    const ice = new THREE.MeshStandardMaterial({ color: 0x7ad7f0, emissive: 0x164a66, roughness: 0.25 });
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x00f5ff });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.15, 1.25), fur);
    torso.position.y = 2.55; torso.castShadow = true; grp.add(torso);
    for (const sx of [-1.1, 1.1]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.25, 5), ice);
      spike.position.set(sx, 3.85, 0); spike.rotation.z = -sx * 0.35; grp.add(spike);
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.92), fur);
    head.position.set(0, 4.10, 0.15); grp.add(head);
    for (const ex of [-0.22, 0.22]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.08), eyeM);
      eye.position.set(ex, 4.18, 0.62); grp.add(eye);
    }
    const makeLimb = (w, h, d, px, py) => {
      const p = new THREE.Group(); p.position.set(px, py, 0);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fur);
      m.position.y = -h * 0.5; m.castShadow = true; p.add(m); grp.add(p); return p;
    };
    const armL = makeLimb(0.58, 2.1, 0.58, -1.35, 3.45);
    const armR = makeLimb(0.58, 2.1, 0.58,  1.35, 3.45);
    const legL = makeLimb(0.65, 1.6, 0.65, -0.58, 1.60);
    const legR = makeLimb(0.65, 1.6, 0.65,  0.58, 1.60);
    this.scene.add(grp);
    return {
      kind: "snowman", gx: -14800, gy: 240, gz: -16500, tx: -14800, ty: 240, tz: -16500,
      yaw: 0, tyaw: 0, phase: 0, state: "prowl",
      stageTimer: 0, fleeTimer: 0, attackCd: 0, throwCd: 0, counterAccum: 0, cueCd: 0, dormantCd: 0,
      mesh: grp, armL, armR, legL, legR
    };
  }

  _createSandworm() {
    const grp = new THREE.Group();
    const matChitinA = new THREE.MeshStandardMaterial({ color: 0x9c7244, roughness: 0.88, metalness: 0.08 });
    const matChitinB = new THREE.MeshStandardMaterial({ color: 0x614222, roughness: 0.94 });
    const matSpine   = new THREE.MeshStandardMaterial({ color: 0x3b2615, roughness: 0.82 });
    const matGullet  = new THREE.MeshBasicMaterial({ color: 0x5c0c08 });
    const matAbyss   = new THREE.MeshBasicMaterial({ color: 0x170202 });
    const matTooth   = new THREE.MeshStandardMaterial({ color: 0xf7ebd2, roughness: 0.35, metalness: 0.15 });

    const segments = [];
    for (let i = 0; i < 16; i++) {
      const sGrp = new THREE.Group();
      const r = Math.max(5.5, 18.5 - i * 0.85);
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(r * 0.90, r * 1.03, 19.0, 14),
        i % 2 === 0 ? matChitinA : matChitinB
      );
      cyl.rotation.x = Math.PI / 2; sGrp.add(cyl);
      const collar = new THREE.Mesh(new THREE.TorusGeometry(r * 0.98, 1.45, 7, 14), matSpine);
      sGrp.add(collar);
      for (const ang of [-0.55, 0, 0.55]) {
        const sp = new THREE.Mesh(new THREE.ConeGeometry(1.4, 5.2 - i * 0.18, 5), matSpine);
        sp.position.set(Math.sin(ang) * r, Math.cos(ang) * r + 1.4, 0);
        sp.rotation.z = -ang; sGrp.add(sp);
      }
      grp.add(sGrp); segments.push(sGrp);
    }

    const headSeg = segments[0];
    const throatOuter = new THREE.Mesh(new THREE.CylinderGeometry(14.5, 11.0, 6.0, 14), matGullet);
    throatOuter.rotation.x = Math.PI / 2; throatOuter.position.z = 8.2; headSeg.add(throatOuter);
    const throatDeep = new THREE.Mesh(new THREE.CircleGeometry(10.8, 14), matAbyss);
    throatDeep.position.z = 9.5; headSeg.add(throatDeep);

    for (let t = 0; t < 16; t++) {
      const a = (t / 16) * Math.PI * 2;
      const fang = new THREE.Mesh(new THREE.ConeGeometry(1.15, 5.8, 4), matTooth);
      fang.position.set(Math.cos(a) * 11.2, Math.sin(a) * 11.2, 9.8);
      fang.rotation.z = a + Math.PI * 0.5; fang.rotation.x = Math.PI * 0.35;
      headSeg.add(fang);
    }

    const jawFlaps = [];
    for (let j = 0; j < 4; j++) {
      const angle = (j / 4) * Math.PI * 2 + Math.PI * 0.25;
      const holder = new THREE.Group(); holder.rotation.z = angle; holder.position.z = 8.8;
      const hinge = new THREE.Group(); hinge.position.y = 14.5; holder.add(hinge);
      const plate = new THREE.Mesh(new THREE.BoxGeometry(11.5, 3.2, 13.5), matChitinB);
      plate.position.set(0, 0.8, 6.2); hinge.add(plate);
      for (const tx of [-3.8, 0, 3.8]) {
        const tusk = new THREE.Mesh(new THREE.ConeGeometry(1.25, 6.6, 4), matTooth);
        tusk.rotation.x = -Math.PI * 0.65; tusk.position.set(tx, -1.8, 10.5); hinge.add(tusk);
      }
      headSeg.add(holder); jawFlaps.push(hinge);
    }

    this.scene.add(grp);
    return {
      kind: "sandworm", gx: 2350, gy: 15, gz: 3450, tx: 2350, ty: 15, tz: 3450,
      yaw: 0, tyaw: 0, phase: 0, state: "submerged",
      stageTimer: 0, fleeTimer: 0, counterAccum: 0, eruptTimer: 0, cueCd: 0, attackCd: 0, dormantCd: 0,
      mesh: grp, segments, jawFlaps
    };
  }

  _createSirenHead() {
    const grp = new THREE.Group();
    const matSkin  = new THREE.MeshStandardMaterial({ color: 0x3b2722, roughness: 0.94 });
    const matDark  = new THREE.MeshStandardMaterial({ color: 0x221512, roughness: 0.96 });
    const matSiren = new THREE.MeshStandardMaterial({ color: 0x544d46, roughness: 0.62, metalness: 0.50 });
    const matWire  = new THREE.MeshStandardMaterial({ color: 0x1a1818, roughness: 0.85 });
    const matMaw   = new THREE.MeshBasicMaterial({ color: 0x160505 });
    const matPulse = new THREE.MeshBasicMaterial({ color: 0xaa1515 });

    const bodyPivot = new THREE.Group(); bodyPivot.position.y = 8.4; grp.add(bodyPivot);
    bodyPivot.add(new THREE.Mesh(new THREE.BoxGeometry(1.75, 1.05, 1.05), matSkin));

    const torsoPivot = new THREE.Group(); torsoPivot.position.y = 0.45; bodyPivot.add(torsoPivot);
    const lowerSpine = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.56, 2.4, 8), matSkin);
    lowerSpine.position.set(0, 1.2, -0.08); lowerSpine.rotation.x = 0.08; torsoPivot.add(lowerSpine);
    const upperChest = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.52, 3.0, 9), matSkin);
    upperChest.position.set(0, 3.6, 0.10); upperChest.rotation.x = 0.14; upperChest.castShadow = true; torsoPivot.add(upperChest);

    for (let r = 0; r < 5; r++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.76 + r * 0.06, 0.11, 6, 12), matDark);
      rib.rotation.x = Math.PI * 0.5 + 0.12; rib.scale.set(1.25, 0.85, 1.0);
      rib.position.set(0, 2.4 + r * 0.52, 0.08); torsoPivot.add(rib);
    }
    const shoulderBar = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 3.3, 8), matSkin);
    shoulderBar.rotation.z = Math.PI / 2; shoulderBar.position.set(0, 5.15, 0.25); torsoPivot.add(shoulderBar);

    const headPivot = new THREE.Group(); headPivot.position.set(0, 5.35, 0.28); torsoPivot.add(headPivot);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 3.8, 8), matSiren);
    pole.position.y = 1.9; headPivot.add(pole);
    for (let w = 0; w < 4; w++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.055, 5, 10), matWire);
      coil.rotation.x = Math.PI * 0.42; coil.position.y = 0.6 + w * 0.82; headPivot.add(coil);
    }
    const buildSirenHorn = (sx, sy, rotY) => {
      const h = new THREE.Group(); h.position.set(sx, sy, 0.1); h.rotation.y = rotY;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.9, 8), matSiren);
      neck.rotation.x = Math.PI / 2; neck.position.z = 0.3; h.add(neck);
      const bell = new THREE.Mesh(new THREE.ConeGeometry(1.18, 2.35, 12, 1, true), matSiren);
      bell.rotation.x = -Math.PI / 2; bell.position.z = 1.45; h.add(bell);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.06, 12), matMaw);
      mouth.position.z = 2.45; h.add(mouth);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), matPulse);
      core.position.z = 2.15; h.add(core);
      headPivot.add(h);
    };
    buildSirenHorn(-0.68, 3.15, -0.32);
    buildSirenHorn( 0.68, 2.05,  0.34);

    const buildJointedArm = (side) => {
      const shoulder = new THREE.Group(); shoulder.position.set(side * 1.72, 5.05, 0.25); torsoPivot.add(shoulder);
      shoulder.add(new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), matSkin));
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 4.4, 8), matSkin);
      upper.position.y = -2.2; upper.castShadow = true; shoulder.add(upper);
      const elbow = new THREE.Group(); elbow.position.y = -4.4; shoulder.add(elbow);
      elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 7, 7), matDark));
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 4.5, 8), matSkin);
      forearm.position.y = -2.25; forearm.castShadow = true; elbow.add(forearm);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.65, 0.22), matDark);
      palm.position.y = -4.65; elbow.add(palm);
      for (let f = -1.5; f <= 1.5; f += 1) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.015, 0.95, 5), matDark);
        finger.position.set(f * 0.10, -5.35, 0.12); finger.rotation.x = 0.28; elbow.add(finger);
      }
      return { shoulder, elbow };
    };

    const buildJointedLeg = (side) => {
      const hip = new THREE.Group(); hip.position.set(side * 0.78, -0.25, 0); bodyPivot.add(hip);
      hip.add(new THREE.Mesh(new THREE.SphereGeometry(0.40, 8, 8), matSkin));
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.28, 4.2, 8), matSkin);
      thigh.position.y = -2.1; thigh.castShadow = true; hip.add(thigh);
      const knee = new THREE.Group(); knee.position.y = -4.2; hip.add(knee);
      knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.30, 7, 7), matDark));
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.20, 4.1, 8), matSkin);
      shin.position.y = -2.05; shin.castShadow = true; knee.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 1.25), matDark);
      foot.position.set(0, -4.05, 0.32); knee.add(foot);
      return { hip, knee };
    };

    const armL = buildJointedArm(-1), armR = buildJointedArm(1);
    const legL = buildJointedLeg(-1), legR = buildJointedLeg(1);

    this.scene.add(grp);
    return {
      kind: "sirenhead", gx: 3650, gy: 18, gz: -350, tx: 3650, ty: 18, tz: -350,
      yaw: 0, tyaw: 0, phase: 0, state: "dormant",
      stageTimer: 0, spawnCheckCd: 18, dormantCd: 0, fleeTimer: 0, attackCd: 0, sonicCd: 0, counterAccum: 0, cueCd: 0,
      mesh: grp, bodyPivot, torsoPivot, headPivot, armL, armR, legL, legR, matPulse
    };
  }

  _createTRex() {
    const grp = new THREE.Group();
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x3b4a2c, roughness: 0.85 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x6b6043, roughness: 0.90 });
    const lavaStripe = new THREE.MeshStandardMaterial({ color: 0x8f2912, emissive: 0x380b02, roughness: 0.75 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xf7f2e1 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.7, 5.6), scaleMat);
    body.position.set(0, 4.9, 0); body.rotation.x = -0.14; body.castShadow = true; grp.add(body);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 5.0), lavaStripe);
    ridge.position.set(0, 6.25, -0.1); ridge.rotation.x = -0.14; grp.add(ridge);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.65, 4.8), bellyMat);
    belly.position.set(0, 3.6, 0.1); grp.add(belly);

    const tailPivot = new THREE.Group(); tailPivot.position.set(0, 5.0, -2.6);
    const tail1 = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 4.4), scaleMat);
    tail1.position.set(0, -0.1, -2.0); tailPivot.add(tail1);
    const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 5.2, 6), scaleMat);
    tail2.rotation.x = -Math.PI / 2; tail2.position.set(0, -0.2, -6.5); tailPivot.add(tail2);
    grp.add(tailPivot);

    const neck = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 2.4), scaleMat);
    neck.position.set(0, 6.4, 3.0); neck.rotation.x = -0.45; grp.add(neck);
    const headGrp = new THREE.Group(); headGrp.position.set(0, 7.6, 4.2);
    const upperSkull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.45, 3.2), scaleMat);
    upperSkull.position.set(0, 0.35, 1.1); upperSkull.castShadow = true; headGrp.add(upperSkull);
    for (const ex of [-0.96, 0.96]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.28), eyeMat);
      eye.position.set(ex, 0.68, 0.55); headGrp.add(eye);
    }
    for (let tz = 0.4; tz <= 2.4; tz += 0.5) {
      for (const tx of [-0.82, 0.82]) {
        const th = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), toothMat);
        th.rotation.x = Math.PI; th.position.set(tx, -0.48, tz); headGrp.add(th);
      }
    }
    const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.35, 0.2);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.55, 2.7), bellyMat);
    lowerJaw.position.set(0, -0.22, 1.2); jawPivot.add(lowerJaw);
    headGrp.add(jawPivot); grp.add(headGrp);

    for (const sx of [-1.2, 1.2]) {
      const tinyArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.1, 0.42), scaleMat);
      tinyArm.position.set(sx, 4.5, 2.4); tinyArm.rotation.x = -0.65; grp.add(tinyArm);
    }
    const makeLeg = (px) => {
      const piv = new THREE.Group(); piv.position.set(px, 4.2, -0.3);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(1.25, 2.4, 1.85), scaleMat);
      thigh.position.set(0, -1.1, 0); thigh.castShadow = true; piv.add(thigh);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.2, 1.0), scaleMat);
      shin.position.set(0, -2.9, -0.2); piv.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.45, 2.1), bellyMat);
      foot.position.set(0, -4.0, 0.45); piv.add(foot);
      grp.add(piv); return piv;
    };
    const legL = makeLeg(-1.45), legR = makeLeg(1.45);
    this.scene.add(grp);
    return {
      kind: "trex", gx: -4350, gy: 38, gz: 1320, tx: -4350, ty: 38, tz: 1320,
      yaw: 0, tyaw: 0, phase: 0, state: "prowl",
      stageTimer: 0, fleeTimer: 0, attackCd: 0, counterAccum: 0, cueCd: 0, dormantCd: 0,
      mesh: grp, legL, legR, tailPivot, jawPivot
    };
  }

  _createGodzilla() {
    const grp = new THREE.Group();
    const matScales  = new THREE.MeshStandardMaterial({ color: 0x1a2026, roughness: 0.88, metalness: 0.18 });
    const matArmorPl = new THREE.MeshStandardMaterial({ color: 0x262f37, roughness: 0.84, metalness: 0.24 });
    const matBelly   = new THREE.MeshStandardMaterial({ color: 0x363e45, roughness: 0.90 });
    const matTooth   = new THREE.MeshStandardMaterial({ color: 0xebe6d8, roughness: 0.45 });
    const matThroat  = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.15 });
    const matEye     = new THREE.MeshBasicMaterial({ color: 0x7df9ff });

    const bodyPivot = new THREE.Group(); bodyPivot.position.y = 14.5; grp.add(bodyPivot);

    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 7.4, 10.5, 10), matScales);
    pelvis.position.set(0, 3.2, -0.4); pelvis.castShadow = true; bodyPivot.add(pelvis);
    const ribcage = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 6.2, 11.5, 10), matScales);
    ribcage.position.set(0, 12.6, 1.4); ribcage.rotation.x = 0.22; ribcage.castShadow = true; bodyPivot.add(ribcage);
    for (const sx of [-1, 1]) {
      const shld = new THREE.Mesh(new THREE.DodecahedronGeometry(3.6, 0), matArmorPl);
      shld.position.set(sx * 5.2, 17.2, 2.2); shld.castShadow = true; bodyPivot.add(shld);
    }
    for (let r = 0; r < 6; r++) {
      const wP = 6.8 - r * 0.28;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(wP, 1.85, 2.2), r % 2 === 0 ? matBelly : matArmorPl);
      plate.position.set(0, 3.8 + r * 2.35, 4.9 + r * 0.25);
      plate.rotation.x = 0.14; bodyPivot.add(plate);
    }

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 4.4, 6.8, 9), matScales);
    neck.position.set(0, 20.6, 3.0); neck.rotation.x = 0.26; neck.castShadow = true; bodyPivot.add(neck);
    for (const sx of [-1, 1]) {
      for (let g = 0; g < 3; g++) {
        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.3, 1.6), matArmorPl);
        gill.position.set(sx * 3.3, 19.2 + g * 1.4, 3.2 + g * 0.25); bodyPivot.add(gill);
      }
    }

    const headGrp = new THREE.Group(); headGrp.position.set(0, 24.4, 4.6);
    bodyPivot.add(headGrp);

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 4.4), matScales);
    cranium.position.set(0, 0.8, 0.8); cranium.castShadow = true; headGrp.add(cranium);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 4.6), matArmorPl);
    snout.position.set(0, 0.35, 4.2); snout.castShadow = true; headGrp.add(snout);
    const noseTip = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.6, 1.5), matScales);
    noseTip.position.set(0, 0.42, 6.6); headGrp.add(noseTip);

    for (const sx of [-1, 1]) {
      const brow = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.72, 2.6), matArmorPl);
      brow.position.set(sx * 1.78, 1.85, 2.2); brow.rotation.z = -sx * 0.28; brow.rotation.y = sx * 0.14; headGrp.add(brow);
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 3.0), matScales);
      cheek.position.set(sx * 2.15, 0.35, 1.6); headGrp.add(cheek);
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.72), matEye);
      eye.position.set(sx * 1.72, 1.22, 2.55); eye.rotation.z = -sx * 0.22; headGrp.add(eye);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.62, 2.2, 5), matArmorPl);
      horn.position.set(sx * 1.85, 2.35, -0.6); horn.rotation.x = -0.78; headGrp.add(horn);
    }

    const throatGlow = new THREE.Mesh(new THREE.SphereGeometry(1.45, 10, 8), matThroat);
    throatGlow.position.set(0, -0.35, 2.5); headGrp.add(throatGlow);

    for (const sx of [-1, 1]) {
      for (let f = 0; f < 5; f++) {
        const fang = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.88 - f * 0.06, 5), matTooth);
        fang.rotation.x = Math.PI;
        fang.position.set(sx * (1.28 - f * 0.08), -0.82, 2.4 + f * 0.92);
        headGrp.add(fang);
      }
    }

    const jawPivot = new THREE.Group(); jawPivot.position.set(0, -0.55, 0.8);
    const jawBone = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.15, 5.8), matBelly);
    jawBone.position.set(0, -0.55, 3.1); jawPivot.add(jawBone);
    for (const sx of [-1, 1]) {
      for (let f = 0; f < 5; f++) {
        const lFang = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.76 - f * 0.05, 5), matTooth);
        lFang.position.set(sx * (1.12 - f * 0.07), 0.25, 1.6 + f * 0.90);
        jawPivot.add(lFang);
      }
    }
    headGrp.add(jawPivot);

    // VISIBLE COLOSSAL ATOMIC GAMMA BEAM (Core Laser + Plasma Halo + Blazing Impact Sphere!)
    const beamGroup = new THREE.Group();
    beamGroup.position.set(0, -0.35, 5.6);
    beamGroup.visible = false;
    const beamCoreGeo = new THREE.CylinderGeometry(1.35, 0.85, 1.0, 12, 1, true);
    beamCoreGeo.translate(0, 0.5, 0);
    beamCoreGeo.rotateX(Math.PI / 2);
    const matBeamCore = new THREE.MeshBasicMaterial({ color: 0xe6ffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamCore = new THREE.Mesh(beamCoreGeo, matBeamCore);
    beamGroup.add(beamCore);

    const beamHaloGeo = new THREE.CylinderGeometry(3.8, 2.1, 1.0, 14, 1, true);
    beamHaloGeo.translate(0, 0.5, 0);
    beamHaloGeo.rotateX(Math.PI / 2);
    const matBeamHalo = new THREE.MeshBasicMaterial({ color: 0x00d9ff, transparent: true, opacity: 0.44, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beamHalo = new THREE.Mesh(beamHaloGeo, matBeamHalo);
    beamGroup.add(beamHalo);
    headGrp.add(beamGroup);

    const beamImpact = new THREE.Mesh(
      new THREE.SphereGeometry(5.5, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0x4df5ff, transparent: true, opacity: 0.82, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    beamImpact.visible = false;
    this.scene.add(beamImpact);

    // 14 Individually Addressable Jagged Crystalline Dorsal Spines (Tail Tip -> Neck Crest!)
    const dorsalFins = [];
    const makeFinMat = () => new THREE.MeshStandardMaterial({ color: 0x3b586e, emissive: 0x00ccff, emissiveIntensity: 0.30, roughness: 0.28 });

    const tailPivot = new THREE.Group(); tailPivot.position.set(0, -0.5, -4.6);
    const tail1 = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 5.6, 15.0, 9), matScales);
    tail1.rotation.x = Math.PI / 2 - 0.16; tail1.position.set(0, -1.8, -6.8); tail1.castShadow = true; tailPivot.add(tail1);
    const tail2 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 3.8, 15.0, 8), matScales);
    tail2.rotation.x = Math.PI / 2 - 0.04; tail2.position.set(0, -3.4, -20.5); tailPivot.add(tail2);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(2.0, 11.0, 7), matScales);
    tailTip.rotation.x = -Math.PI / 2; tailTip.position.set(0, -4.1, -33.0); tailPivot.add(tailTip);

    for (let ts = 4; ts >= 0; ts--) {
      const m = makeFinMat();
      const tsp = new THREE.Mesh(new THREE.ConeGeometry(1.15 - ts * 0.12, 4.2 - ts * 0.45, 5), m);
      tsp.position.set(0, -0.1 - ts * 0.65, -5.8 - ts * 5.4); tsp.rotation.x = -0.38;
      tailPivot.add(tsp);
      dorsalFins.push(m);
    }
    bodyPivot.add(tailPivot);

    for (let i = 8; i >= 0; i--) {
      const m = makeFinMat();
      const sz = 2.9 + Math.sin((i / 8) * Math.PI) * 4.4;
      const finGrp = new THREE.Group();
      finGrp.position.set(0, 22.0 - i * 2.45, -2.6 - i * 0.54);
      const mainSp = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.44, sz * 1.55, 5), m);
      mainSp.rotation.x = -0.74; finGrp.add(mainSp);
      for (const sx of [-1, 1]) {
        const subSp = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.24, sz * 0.95, 4), m);
        subSp.position.set(sx * sz * 0.34, -0.4, 0.2); subSp.rotation.x = -0.68; subSp.rotation.z = -sx * 0.32;
        finGrp.add(subSp);
      }
      bodyPivot.add(finGrp);
      dorsalFins.push(m);
    }

    const makeArm = (sx) => {
      const piv = new THREE.Group(); piv.position.set(sx * 5.2, 16.5, 2.4);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.3, 5.2, 7), matScales);
      upper.position.set(0, -2.2, 1.0); upper.rotation.x = -0.45; piv.add(upper);
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 4.6, 7), matArmorPl);
      fore.position.set(0, -5.2, 3.0); fore.rotation.x = -1.05; piv.add(fore);
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.65, 5), matTooth);
        claw.position.set(c * 0.65, -6.3, 5.2); claw.rotation.x = Math.PI * 0.65; piv.add(claw);
      }
      bodyPivot.add(piv); return piv;
    };
    const armL = makeArm(-1), armR = makeArm(1);

    const makeLeg = (sx) => {
      const piv = new THREE.Group(); piv.position.set(sx * 4.5, 1.2, 0.2);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 3.0, 9.8, 9), matScales);
      thigh.position.y = -4.5; thigh.castShadow = true; piv.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.5, 8.2, 9), matArmorPl);
      shin.position.set(0, -11.8, 0.5); piv.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(5.2, 2.1, 7.6), matBelly);
      foot.position.set(0, -14.8, 1.9); piv.add(foot);
      for (let t = -1; t <= 1; t++) {
        const toe = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.4, 5), matTooth);
        toe.position.set(t * 1.6, -15.1, 6.2); toe.rotation.x = Math.PI * 0.45; piv.add(toe);
      }
      bodyPivot.add(piv); return piv;
    };
    const legL = makeLeg(-1), legR = makeLeg(1);

    this.scene.add(grp);
    return {
      kind: "godzilla", gx: -12500, gy: 240, gz: -22500, tx: -12500, ty: 240, tz: -22500,
      yaw: 0.4, tyaw: 0.4, phase: 0, state: "prowl",
      stageTimer: 0, cueCd: 0, attackCd: 0, empCd: 0, stompCd: 0, flashTimer: 0, staggerTimer: 0,
      adaptedToMil: false, adaptTimer: 0, beamTimer: 0, beamCd: 11.0, tailWhipTimer: 0, tailWindup: 0, tailHitDone: false, kickTimer: 0, combatFatigue: 0, restTimer: 0, stalkAfarTimer: 16.0,
      beamTargetX: -12500, beamTargetY: 240, beamTargetZ: -22400,
      mesh: grp, bodyPivot, headGrp, tailPivot, jawPivot, armL, armR, legL, legR,
      dorsalFins, matSpine: dorsalFins[dorsalFins.length - 1], matThroat,
      beamGroup, beamCore, beamHalo, beamImpact
    };
  }

  _spawnProjectile(kind, gx, gy, gz, vx, vy, vz) {
    if (this.projectiles.length > 8) return;
    const mesh = new THREE.Mesh(
      kind === "log" ? this.geoLog : this.geoIceBall,
      kind === "log" ? this.matLog : this.matIceBall
    );
    mesh.castShadow = true; this.scene.add(mesh);
    this.projectiles.push({ kind, gx, gy, gz, vx, vy, vz, life: 4.5, mesh });
  }

  exportSyncState() {
    const out = {};
    for (const c of this.allList) {
      out[c.kind] = {
        x: +c.gx.toFixed(1), y: +c.gy.toFixed(1), z: +c.gz.toFixed(1),
        yaw: +c.yaw.toFixed(2), st: c.state, ph: +c.phase.toFixed(2), et: +(c.eruptTimer || 0).toFixed(2)
      };
    }
    return out;
  }

  applySyncState(cryptidDict) {
    if (!cryptidDict || typeof cryptidDict !== "object") return;
    for (const c of this.allList) {
      const s = cryptidDict[c.kind]; if (!s) continue;
      c.tx = s.x; c.ty = s.y; c.tz = s.z; c.tyaw = s.yaw;
      c.state = s.st || c.state; c.eruptTimer = s.et || 0;
      if (Math.hypot(c.gx - c.tx, c.gz - c.tz) > 90) { c.gx = c.tx; c.gy = c.ty; c.gz = c.tz; c.yaw = c.tyaw; }
    }
  }

  applyRemoteCounter(kind, amount) {
    const map = { yeti: this.yeti, snowman: this.snowman, sandworm: this.sandworm, sirenhead: this.sirenhead, trex: this.trex };
    const c = map[kind];
    if (!c || c.state === "flee" || c.state === "dormant") return;
    c.counterAccum = (c.counterAccum || 0) + amount;
    if (c.counterAccum >= 2.2) { c.state = "flee"; c.fleeTimer = 26; c.counterAccum = 0; }
  }

  _collectPlayers(vehicle, remotePlayersMap) {
    const list = [{
      isLocal: true, x: vehicle.pos.x, y: vehicle.pos.y, z: vehicle.pos.z,
      vx: vehicle.vel.x, vz: vehicle.vel.z,
      speedKmh: vehicle.speedKmh, engineRunning: vehicle.engineRunning,
      headlights: vehicle.headlights, lightbar: vehicle.lightbar, hornActive: vehicle.hornActive
    }];
    if (remotePlayersMap) {
      for (const rp of remotePlayersMap.values()) {
        list.push({
          isLocal: false, x: rp.gx, y: rp.gy, z: rp.gz,
          vx: rp.vx || 0, vz: rp.vz || 0,
          speedKmh: Math.hypot(rp.vx || 0, rp.vz || 0) * 3.6,
          engineRunning: rp.engOn !== undefined ? !!rp.engOn : true,
          headlights: rp.headlights, lightbar: rp.lightbar, hornActive: !!rp.hornActive
        });
      }
    }
    return list;
  }

  _randomPlayerIn(players, filterFn) {
    const elig = [];
    for (const p of players) {
      if (this._inSanctuary(p.x, p.z, 10)) continue;
      if (!filterFn || filterFn(p)) elig.push(p);
    }
    return elig.length > 0 ? elig[Math.floor(Math.random() * elig.length)] : null;
  }

  _nearestPlayerIn(players, cx, cz, filterFn) {
    let best = null, bestD = 999999;
    for (const p of players) {
      if (this._inSanctuary(p.x, p.z, 10)) continue;
      if (filterFn && !filterFn(p)) continue;
      const d = Math.hypot(p.x - cx, p.z - cz);
      if (d < bestD) { bestD = d; best = p; }
    }
    return { player: best, dist: bestD };
  }

  update(dt, vehicle, weatherSys, particles, audio, ui, network, hazards) {
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const isAuthoritative = (!network || network.mode === "offline" || network.isHost);
    const players = this._collectPlayers(vehicle, network ? network.remotePlayers : null);

    this.iceAuraStrength = 0;
    this.quicksandDrag = 0;
    this.anyThreatNear = false;
    this.cameraShakeOut = 0;
    this.empTrigger = null;

    if (isAuthoritative) {
      this._stepAuthoritativeAI(dt, players, weatherSys, audio, hazards);
      if (network && network.mode !== "offline") {
        this.syncAccum += dt;
        if (this.syncAccum >= 0.085) {
          this.syncAccum = 0;
          network.send({ type: "cryptid_sync", cryptids: this.exportSyncState() });
        }
      }
    } else {
      const lf = Math.min(1, dt * 11);
      for (const c of this.allList) {
        c.gx += (c.tx - c.gx) * lf; c.gy += (c.ty - c.gy) * lf; c.gz += (c.tz - c.gz) * lf;
        let dy = c.tyaw - c.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        c.yaw += dy * lf;
        const pSpd = (c.state === "strike" || c.state === "chase" || c.state === "flee") ? 13 : (c.state === "stalk" ? 4.5 : 1.8);
        c.phase += dt * pSpd;
      }
    }

    this._stepLocalEffectsAndVisuals(dt, vehicle, weatherSys, particles, audio, network, isAuthoritative);

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt; pr.vy -= 14.0 * dt;
      pr.gx += pr.vx * dt; pr.gy += pr.vy * dt; pr.gz += pr.vz * dt;
      pr.mesh.rotation.x += dt * 7; pr.mesh.rotation.z += dt * 4;
      this.world.toLocal(pr.gx, pr.gy, pr.gz, pr.mesh.position);
      const dHit = Math.hypot(pr.gx - px, pr.gz - pz);
      const groundH = this.world.getTerrainInfo(pr.gx, pr.gz, false).height;
      if (dHit < 2.9 && Math.abs(pr.gy - (py + 1.0)) < 2.4) {
        audio.playImpact(0.82);
        vehicle.applyExternalImpulse(pr.vx * 0.45, 5.5, pr.vz * 0.45, (Math.random() - 0.5) * 3.0);
        particles.emitCrashBurst(pr.gx, pr.gy, pr.gz, 0.7, pr.kind === "ice" ? "snow" : "gravel", weatherSys.weather);
        this.scene.remove(pr.mesh); this.projectiles.splice(i, 1);
      } else if (pr.life <= 0 || pr.gy < groundH) {
        particles.emitCrashBurst(pr.gx, groundH + 0.2, pr.gz, 0.4, pr.kind === "ice" ? "snow" : "gravel", weatherSys.weather);
        this.scene.remove(pr.mesh); this.projectiles.splice(i, 1);
      }
    }
  }

  _stepAuthoritativeAI(dt, players, weatherSys, audio, hazards) {
    // 1. SIREN HEAD: dormant -> distant_broadcast -> stalk -> strike (185 km/h!) -> flee
    const sh = this.sirenhead;
    if (sh.dormantCd > 0) sh.dormantCd -= dt;
    const shPick = this._nearestPlayerIn(players, sh.gx, sh.gz, (p) => this.world.getBiomeWeights(p.x, p.z).taiga > 0.44 && this._isLandSafe(p.x, p.z, 5.0, 4.0));

    if (sh.state === "dormant") {
      if (sh.dormantCd <= 0 && shPick.player) {
        sh.spawnCheckCd -= dt;
        if (sh.spawnCheckCd <= 0) {
          sh.spawnCheckCd = 28.0;
          if (Math.random() < 0.42) {
            const tgt = this._randomPlayerIn(players, (p) => this.world.getBiomeWeights(p.x, p.z).taiga > 0.44 && this._isLandSafe(p.x, p.z, 5.0, 4.0)) || shPick.player;
            // If player is cruising fast (>30 km/h), manifest AHEAD of their travel path so they drive into the ambush!
            const spd = Math.hypot(tgt.vx || 0, tgt.vz || 0);
            let ang = Math.random() * Math.PI * 2;
            let distSpawn = 210;
            if (spd > 8.5) {
              ang = Math.atan2(tgt.vz, tgt.vx) + (Math.random() - 0.5) * 0.72;
              distSpawn = Math.min(340, 210 + spd * 2.2);
            }
            const sx = tgt.x + Math.cos(ang) * distSpawn, sz = tgt.z + Math.sin(ang) * distSpawn;
            if (this.world.getBiomeWeights(sx, sz).taiga > 0.38 && !this._inSanctuary(sx, sz, 40) && this._isLandSafe(sx, sz, 9.0, 20.0)) {
              sh.gx = sx; sh.gz = sz; sh.state = "distant_broadcast"; sh.stageTimer = 11.0 + Math.random() * 8.0; sh.counterAccum = 0;
            }
          }
        }
      }
    } else if (sh.state === "distant_broadcast") {
      sh.phase += dt * 1.4; sh.stageTimer -= dt;
      if (!shPick.player || shPick.dist > 680) { sh.state = "dormant"; sh.dormantCd = 35.0; }
      else {
        sh.yaw = Math.atan2(shPick.player.x - sh.gx, shPick.player.z - sh.gz);
        if (sh.stageTimer <= 0 || shPick.dist < 170) { sh.state = "stalk"; sh.stageTimer = 14.0 + Math.random() * 10.0; }
      }
    } else if (sh.state === "stalk") {
      if (!shPick.player || shPick.dist > 640) { sh.state = "dormant"; sh.dormantCd = 45.0; }
      else {
        const tp = shPick.player;
        const detectable = tp.engineRunning || tp.headlights || tp.lightbar || tp.speedKmh > 6;
        const cAng = Math.atan2(tp.x - sh.gx, tp.z - sh.gz);
        sh.yaw = cAng;
        if (!detectable) {
          sh.counterAccum += dt * 0.9;
          if (sh.counterAccum >= 3.2) { sh.state = "flee"; sh.fleeTimer = 16; sh.counterAccum = 0; }
        } else {
          sh.stageTimer -= dt;
          const orbitAng = cAng + (shPick.dist < 85 ? 0.95 : 0.35);
          const stalkSpd = shPick.dist > 130 ? 22.0 : 9.5;
          const nx = sh.gx + Math.sin(orbitAng) * stalkSpd * dt, nz = sh.gz + Math.cos(orbitAng) * stalkSpd * dt;
          if (this.world.getBiomeWeights(nx, nz).taiga > 0.34 && !this._inSanctuary(nx, nz, 45) && this._isLandSafe(nx, nz, 8.0, 18.0)) { sh.gx = nx; sh.gz = nz; }
          sh.phase += dt * 5.2;
          if (sh.stageTimer <= 0 || shPick.dist < 75) sh.state = "strike";
        }
      }
    } else if (sh.state === "strike") {
      if (!shPick.player || shPick.dist > 620) { sh.state = "dormant"; sh.dormantCd = 60.0; }
      else {
        const tp = shPick.player;
        const detectable = tp.engineRunning || tp.headlights || tp.lightbar || tp.speedKmh > 6;
        if (!detectable) {
          sh.counterAccum += dt; sh.phase += dt * 2.2;
          if (sh.counterAccum >= 3.0) { sh.state = "flee"; sh.fleeTimer = 18; sh.counterAccum = 0; }
        } else {
          sh.counterAccum = Math.max(0, sh.counterAccum - dt * 0.6);
          if (sh.adaptTimer > 0) { sh.adaptTimer -= dt; if (sh.adaptTimer <= 0) sh.adaptedToMil = false; }
          let cAng = Math.atan2(tp.x - sh.gx, tp.z - sh.gz);
          if (sh.adaptedToMil && shPick.dist > 22 && shPick.dist < 220) {
            cAng += Math.sin(performance.now() * 0.0042) * 0.72;
          }
          sh.yaw = cAng;
          const shSpd = tp.hasAcousticJammer ? 26.4 : 51.4;
          const nx = sh.gx + Math.sin(cAng) * shSpd * dt, nz = sh.gz + Math.cos(cAng) * shSpd * dt;
          if (this.world.getBiomeWeights(nx, nz).taiga > 0.30 && !this._inSanctuary(nx, nz, 40) && this._isLandSafe(nx, nz, 8.0, 18.0)) { sh.gx = nx; sh.gz = nz; }
          else { sh.state = "flee"; sh.fleeTimer = 14; }
          sh.phase += dt * 16.5;
        }
      }
    } else if (sh.state === "recoil") {
      sh.recoilTimer = (sh.recoilTimer || 0) - dt;
      // Stagger physically backward away from player before breaking into retreat!
      const target = shPick.player || players[0];
      if (target) {
        const bAng = Math.atan2(sh.gx - target.x, sh.gz - target.z);
        this._moveDryInlandFlee(sh, bAng, 5.2 * dt);
      }
      sh.phase += dt * 7.5;
      if (sh.recoilTimer <= 0) sh.state = "flee";
    } else if (sh.state === "flee") {
      sh.fleeTimer -= dt;
      const target = shPick.player || players[0];
      const fAng = Math.atan2(sh.gx - target.x, sh.gz - target.z); sh.yaw = fAng;
      this._moveDryInlandFlee(sh, fAng, 28 * dt); sh.phase += dt * 14;
      if (sh.fleeTimer <= 0) { sh.state = "dormant"; sh.dormantCd = 145.0; sh.counterAccum = 0; }
    }
    if (sh.state !== "dormant" && !this._isLandSafe(sh.gx, sh.gz, 8.0, 14.0, true)) { sh.state = "dormant"; sh.dormantCd = 60.0; sh.gx = 6500; sh.gz = -2500; }
    sh.gy = this.world.getTerrainInfo(sh.gx, sh.gz, false).height;

    // 2. FOREST YETI
    const yt = this.yeti;
    if (yt.throwCd > 0) yt.throwCd -= dt;
    if (yt.dormantCd > 0) yt.dormantCd -= dt;
    const dYetiToSiren = (sh.state !== "dormant") ? Math.hypot(yt.gx - sh.gx, yt.gz - sh.gz) : 9999;
    const ytPick = this._nearestPlayerIn(players, yt.gx, yt.gz, (p) => this.world.getBiomeWeights(p.x, p.z).taiga > 0.42 && this._isLandSafe(p.x, p.z, 10.0, 16.0, true));

    if (dYetiToSiren < 230 || this._inSanctuary(yt.gx, yt.gz, 35)) {
      yt.state = "flee"; yt.fleeTimer = 12;
      const rx = dYetiToSiren < 230 ? sh.gx : KK.CLARKSON_FARM.x, rz = dYetiToSiren < 230 ? sh.gz : KK.CLARKSON_FARM.z;
      const runAng = Math.atan2(yt.gx - rx, yt.gz - rz); yt.yaw = runAng;
      this._moveDryInlandFlee(yt, runAng, 20 * dt); yt.phase += dt * 16;
    } else if (yt.state === "flee") {
      yt.fleeTimer -= dt;
      const target = ytPick.player || players[0];
      const fAng = Math.atan2(yt.gx - target.x, yt.gz - target.z); yt.yaw = fAng;
      this._moveDryInlandFlee(yt, fAng, 18 * dt); yt.phase += dt * 15;
      if (yt.fleeTimer <= 0) { yt.state = "prowl"; yt.dormantCd = 85.0; yt.counterAccum = 0; }
    } else if (yt.dormantCd <= 0 && ytPick.player && ytPick.dist > 360) {
      if (Math.random() < dt * 0.04) {
        const tgt = this._randomPlayerIn(players, (p) => this.world.getBiomeWeights(p.x, p.z).taiga > 0.42 && this._isLandSafe(p.x, p.z, 10.0, 16.0, true)) || ytPick.player;
        const ang = Math.random() * Math.PI * 2;
        const nx = tgt.x + Math.cos(ang) * 165, nz = tgt.z + Math.sin(ang) * 165;
        if (this.world.getBiomeWeights(nx, nz).taiga > 0.42 && !this._inSanctuary(nx, nz, 45) && this._isLandSafe(nx, nz, 8.0, 18.0)) { yt.gx = nx; yt.gz = nz; }
      }
    } else if (yt.dormantCd <= 0 && ytPick.player && ytPick.dist < 145) {
      const tp = ytPick.player;
      if (yt.state === "prowl") { yt.state = "stalk"; yt.stageTimer = 8.0; }
      const cAng = Math.atan2(tp.x - yt.gx, tp.z - yt.gz); yt.yaw = cAng;
      if (yt.state === "stalk") {
        yt.stageTimer -= dt; yt.phase += dt * 4.5;
        this._moveDryLand(yt, cAng, 4.5 * dt);
        if (yt.stageTimer <= 0 || ytPick.dist < 62) yt.state = "chase";
      } else {
        const spd = Math.min(19.5, 14.0 + ytPick.dist * 0.055);
        const nx = yt.gx + Math.sin(cAng) * spd * dt, nz = yt.gz + Math.cos(cAng) * spd * dt;
        if (this.world.getBiomeWeights(nx, nz).taiga > 0.35 && !this._inSanctuary(nx, nz, 35) && this._isLandSafe(nx, nz, 8.0, 18.0)) { yt.gx = nx; yt.gz = nz; }
        else { yt.state = "flee"; yt.fleeTimer = 14; }
        yt.phase += dt * 13;
        if (ytPick.dist > 18 && ytPick.dist < 68 && yt.throwCd <= 0) {
          yt.throwCd = 4.6;
          const ft = Math.max(0.7, ytPick.dist / 28);
          this._spawnProjectile("log", yt.gx, yt.gy + 3.2, yt.gz,
            (tp.x - yt.gx) / ft + tp.vx * 0.4, (tp.y - yt.gy) / ft + 0.5 * 14 * ft, (tp.z - yt.gz) / ft + tp.vz * 0.4);
        }
      }
    } else { yt.state = "prowl"; yt.phase += dt * 3.5; }
    if (!this._isLandSafe(yt.gx, yt.gz, 8.0, 14.0, true)) { yt.state = "prowl"; yt.dormantCd = 45.0; yt.gx = 5200; yt.gz = -1800; }
    yt.gy = this.world.getTerrainInfo(yt.gx, yt.gz, false).height;

    // 3. ABOMINABLE SNOWMAN
    const sn = this.snowman;
    if (sn.throwCd > 0) sn.throwCd -= dt;
    if (sn.dormantCd > 0) sn.dormantCd -= dt;
    const isSnowArea = (p) => (p.y > 155 || weatherSys.weather === "snow");
    const snPick = this._nearestPlayerIn(players, sn.gx, sn.gz, isSnowArea);

    const dSnowToGz = Math.hypot(sn.gx - this.godzilla.gx, sn.gz - this.godzilla.gz);
    if (dSnowToGz < 340) {
      sn.state = "flee"; sn.fleeTimer = 14;
      const runAng = Math.atan2(sn.gx - this.godzilla.gx, sn.gz - this.godzilla.gz);
      sn.yaw = runAng;
      this._moveDryInlandFlee(sn, runAng, 24 * dt); sn.phase += dt * 16;
    } else if (sn.state === "flee") {
      sn.fleeTimer -= dt;
      const target = snPick.player || players[0];
      const fAng = Math.atan2(sn.gx - target.x, sn.gz - target.z); sn.yaw = fAng;
      this._moveDryInlandFlee(sn, fAng, 19 * dt); sn.phase += dt * 15;
      if (sn.fleeTimer <= 0) { sn.state = "prowl"; sn.dormantCd = 80.0; sn.counterAccum = 0; }
    } else if (sn.dormantCd <= 0 && snPick.player && snPick.dist > 340) {
      if (Math.random() < dt * 0.04) {
        const tgt = this._randomPlayerIn(players, isSnowArea) || snPick.player;
        const ang = Math.random() * Math.PI * 2;
        const nx = tgt.x + Math.cos(ang) * 155, nz = tgt.z + Math.sin(ang) * 155;
        if ((this.world.getTerrainInfo(nx, nz, false).height > 145 || weatherSys.weather === "snow") && !this._inSanctuary(nx, nz, 45) && this._isLandSafe(nx, nz, 8.0, 18.0)) { sn.gx = nx; sn.gz = nz; }
      }
    } else if (sn.dormantCd <= 0 && snPick.player && snPick.dist < 155) {
      const tp = snPick.player;
      if (sn.state === "prowl") { sn.state = "stalk"; sn.stageTimer = 9.0; }
      const cAng = Math.atan2(tp.x - sn.gx, tp.z - sn.gz); sn.yaw = cAng;
      if (sn.state === "stalk") {
        sn.stageTimer -= dt; sn.phase += dt * 4;
        if (sn.stageTimer <= 0 || snPick.dist < 68) sn.state = "chase";
      } else {
        const nx = sn.gx + Math.sin(cAng) * 16.0 * dt, nz = sn.gz + Math.cos(cAng) * 16.0 * dt;
        if ((this.world.getTerrainInfo(nx, nz, false).height > 140 || weatherSys.weather === "snow") && !this._inSanctuary(nx, nz, 35) && this._isLandSafe(nx, nz, 8.0, 18.0)) { sn.gx = nx; sn.gz = nz; }
        else { sn.state = "flee"; sn.fleeTimer = 14; }
        sn.phase += dt * 11;
        if (snPick.dist > 16 && snPick.dist < 74 && sn.throwCd <= 0) {
          sn.throwCd = 4.2;
          const ft = Math.max(0.7, snPick.dist / 30);
          this._spawnProjectile("ice", sn.gx, sn.gy + 3.6, sn.gz,
            (tp.x - sn.gx) / ft + tp.vx * 0.4, (tp.y - sn.gy) / ft + 0.5 * 14 * ft, (tp.z - sn.gz) / ft + tp.vz * 0.4);
        }
      }
    } else { sn.state = "prowl"; sn.phase += dt * 3.0; }
    if (!this._isLandSafe(sn.gx, sn.gz, 8.0, 14.0, true)) { sn.state = "prowl"; sn.dormantCd = 45.0; sn.gx = -5400; sn.gz = -12500; }
    sn.gy = this.world.getTerrainInfo(sn.gx, sn.gz, false).height;

    // 4. SANDWYRM: submerged -> tremor -> stalk -> erupt -> flee
    const swm = this.sandworm;
    if (swm.dormantCd > 0) swm.dormantCd -= dt;
    const swPick = this._nearestPlayerIn(players, swm.gx, swm.gz, (p) => this.world.getBiomeWeights(p.x, p.z).desert > 0.40);

    if (swm.state === "burrow") {
      swm.burrowTimer = (swm.burrowTimer || 0) - dt;
      swm.phase += dt * 13.0;
      if (swm.burrowTimer <= 0) {
        swm.state = "flee";
        swm.fleeTimer = Math.max(22.0, swm.fleeTimer || 28.0);
      }
    } else if (swm.state === "flee") {
      swm.fleeTimer -= dt;
      const target = swPick.player || players[0];
      const fAng = Math.atan2(swm.gx - target.x, swm.gz - target.z);
      this._moveDryInlandFlee(swm, fAng, 42 * dt); swm.phase += dt * 6;
      if (swm.fleeTimer <= 0) { swm.state = "submerged"; swm.dormantCd = 65.0; swm.counterAccum = 0; }
    } else if (swm.state === "burrow") {
      // v14.2 VISIBLE SANDWYRM BURROWING RETREAT ANIMATION (3.6s diving nose-first into dunes w/ sand plume!)
      this.anyThreatNear = false;
      swm.mesh.visible = dWorm < 640;
      const frac = Math.max(0, Math.min(1, 1.0 - ((swm.burrowTimer || 0) / 3.6)));
      const groundH = this.world.getTerrainInfo(swm.gx, swm.gz, false).height;
      // Rears up in pain during first 25%, then dives nose-down deep beneath the sand!
      const diveY = frac < 0.25 ? (22.0 + Math.sin(frac * 4 * Math.PI * 0.5) * 14.0) : (36.0 - ((frac - 0.25) / 0.75) * 68.0);
      this.world.toLocal(swm.gx, groundH + diveY, swm.gz, swm.mesh.position);
      swm.mesh.rotation.y = swm.yaw + Math.sin(frac * 14.0) * 0.35;
      swm.mesh.rotation.x = -0.35 + frac * 1.75; // Tilts cleanly nose-first into the ground!
      this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dWorm / 280) * 0.55 * (1 - frac));
      if (Math.random() < 0.90) particles.emitFrostOrSand(swm.gx + (Math.random() - 0.5) * 16, groundH + 2.5, swm.gz + (Math.random() - 0.5) * 16, false, 9);
    } else if (swm.state === "erupt") {
      swm.eruptTimer -= dt; swm.phase += dt * 9;
      if (swm.eruptTimer <= 0) { swm.state = "flee"; swm.fleeTimer = 16; }
    } else if (swm.dormantCd <= 0 && swPick.player && swPick.dist > 520) {
      if (Math.random() < dt * 0.04) {
        const tgt = this._randomPlayerIn(players, (p) => this.world.getBiomeWeights(p.x, p.z).desert > 0.40) || swPick.player;
        const ang = Math.random() * Math.PI * 2;
        const nx = tgt.x + Math.cos(ang) * 290, nz = tgt.z + Math.sin(ang) * 290;
        if (this.world.getBiomeWeights(nx, nz).desert > 0.38 && !this._inSanctuary(nx, nz, 55) && this._isLandSafe(nx, nz, 8.5, 8.5)) { swm.gx = nx; swm.gz = nz; }
      }
    } else if (swm.dormantCd <= 0 && swPick.player && swPick.dist < 380) {
      const tp = swPick.player;
      const gInfo = this.world.getTerrainInfo(tp.x, tp.z, true);
      const onSafeRock = (gInfo.surface === "asphalt" || gInfo.surface === "wood" || gInfo.surface === "rock");
      const vib = !onSafeRock && (tp.speedKmh > 5 || tp.engineRunning);

      if (vib) {
        swm.counterAccum = Math.max(0, swm.counterAccum - dt * 0.7);
        if (swm.state === "submerged") { swm.state = "tremor"; swm.stageTimer = 10.5; }
        if (swm.adaptTimer > 0) { swm.adaptTimer -= dt; if (swm.adaptTimer <= 0) swm.adaptedToMil = false; }
        let cAng = Math.atan2(tp.x - swm.gx, tp.z - swm.gz);
        if (swm.adaptedToMil && swm.state === "stalk" && swPick.dist > 28 && swPick.dist < 140) cAng += 0.62;
        swm.yaw = cAng;
        const wormSpd = (swm.state === "tremor") ? 19.0 : (swm.adaptedToMil ? 47.0 : 43.0);
        const nx = swm.gx + Math.sin(cAng) * wormSpd * dt, nz = swm.gz + Math.cos(cAng) * wormSpd * dt;
        if (!this._inSanctuary(nx, nz, 50) && this._isLandSafe(nx, nz, 8.0, 18.0)) { swm.gx = nx; swm.gz = nz; }
        if (swm.state !== "submerged" && !this._isLandSafe(swm.gx, swm.gz, 8.0, 14.0, true)) { swm.state = "submerged"; swm.dormantCd = 45.0; swm.gx = 3600; swm.gz = 11500; }
    swm.gy = this.world.getTerrainInfo(swm.gx, swm.gz, false).height;
        swm.phase += dt * (swm.state === "tremor" ? 5 : 8);

        if (swm.state === "tremor") {
          swm.stageTimer -= dt;
          if (swm.stageTimer <= 0 || swPick.dist < 175) swm.state = "stalk";
        } else {
          const tpAlt = tp.y - gInfo.height;
          if (swPick.dist < 22.0 && tpAlt < 7.0) {
            swm.state = "erupt"; swm.eruptTimer = 4.4;
            swm.gx = tp.x; swm.gz = tp.z; swm.gy = gInfo.height;
          }
        }
      } else if (swm.state === "stalk" || swm.state === "tremor") {
        swm.counterAccum += dt;
        if (swm.counterAccum >= 3.0) { swm.state = "flee"; swm.fleeTimer = 20; swm.counterAccum = 0; }
      }
    } else { swm.state = "submerged"; }

    // 5. VOLCANIC T-REX (Fixed Aggro, 131 km/h Chase, Relocation & Fair Freeze Counterplay!)
    const rx = this.trex;
    if (rx.dormantCd > 0) rx.dormantCd -= dt;
    const rxPick = this._nearestPlayerIn(players, rx.gx, rx.gz, (p) => this.world.getBiomeWeights(p.x, p.z).volcanic > 0.22);
    const nearFlare = hazards ? hazards.getNearestFlare(rx.gx, rx.gz, 125) : null;

    if (nearFlare && rx.state !== "flee") {
      rx.state = "flare";
      const dFl = Math.hypot(nearFlare.gx - rx.gx, nearFlare.gz - rx.gz);
      const fAng = Math.atan2(nearFlare.gx - rx.gx, nearFlare.gz - rx.gz); rx.yaw = fAng;
      if (dFl > 6.5) { this._moveDryLand(rx, fAng, 26.0 * dt); rx.phase += dt * 12; }
      else rx.phase += dt * 6;
    } else if (rx.state === "flee") {
      rx.fleeTimer -= dt;
      const target = rxPick.player || players[0];
      const fAng = Math.atan2(rx.gx - target.x, rx.gz - target.z); rx.yaw = fAng;
      this._moveDryInlandFlee(rx, fAng, 22 * dt); rx.phase += dt * 12;
      if (rx.fleeTimer <= 0) { rx.state = "prowl"; rx.dormantCd = 45.0; rx.counterAccum = 0; }
    } else if (rx.dormantCd <= 0 && rxPick.player && rxPick.dist > 380) {
      // Relocate closer inside the volcanic zone if player drove far away (e.g. Far-West volcanic badlands)
      if (Math.random() < dt * 0.08) {
        const tgt = this._randomPlayerIn(players, (p) => this.world.getBiomeWeights(p.x, p.z).volcanic > 0.22) || rxPick.player;
        const ang = Math.random() * Math.PI * 2;
        const nx = tgt.x + Math.cos(ang) * 195, nz = tgt.z + Math.sin(ang) * 195;
        if (this.world.getBiomeWeights(nx, nz).volcanic > 0.20 && !this._inSanctuary(nx, nz, 45)) {
          rx.gx = nx; rx.gz = nz; rx.state = "prowl";
        }
      }
    } else if (rx.dormantCd <= 0 && rxPick.player && rxPick.dist < 240) {
      const tp = rxPick.player;
      const cAng = Math.atan2(tp.x - rx.gx, tp.z - rx.gz);
      // If you're right inside its bite reach (< 14m), freezing won't magically save you — it CHOMPS!
      const movingOrTooClose = (tp.speedKmh > 2.2) || (rxPick.dist < 14.0);
      if (movingOrTooClose) {
        rx.counterAccum = Math.max(0, rx.counterAccum - dt * 0.9);
        if (rx.state === "prowl") { rx.state = rxPick.dist < 95 ? "chase" : "stalk"; rx.stageTimer = 5.5; }
        rx.yaw = cAng;
        if (rx.state === "stalk") {
          rx.stageTimer -= dt; rx.phase += dt * 6.0;
          this._moveDryLand(rx, cAng, 10.5 * dt);
          if (rx.stageTimer <= 0 || rxPick.dist < 95) rx.state = "chase";
        } else {
          if (rx.adaptTimer > 0) { rx.adaptTimer -= dt; if (rx.adaptTimer <= 0) rx.adaptedToMil = false; }
          let mvAng = cAng;
          if (rx.adaptedToMil && rxPick.dist > 20 && rxPick.dist < 120) mvAng += Math.sin(performance.now() * 0.0036) * 0.68;
          rx.yaw = mvAng;
          const chaseSpd = rx.adaptedToMil ? 39.5 : 36.5;
          const nx = rx.gx + Math.sin(mvAng) * chaseSpd * dt, nz = rx.gz + Math.cos(mvAng) * chaseSpd * dt;
          if (this.world.getBiomeWeights(nx, nz).volcanic > 0.14 && !this._inSanctuary(nx, nz, 40)) {
            rx.gx = nx; rx.gz = nz;
          }
          rx.phase += dt * 13.5;
        }
      } else if (rx.state === "chase" || rx.state === "stalk") {
        // Player froze completely (< 2.2 km/h) outside jaws -> loses track after 3.2s!
        rx.yaw = cAng;
        rx.counterAccum += dt;
        rx.phase += dt * 2.4;
        if (rx.counterAccum >= 3.2) { rx.state = "flee"; rx.fleeTimer = 18; rx.counterAccum = 0; }
      }
    } else {
      rx.state = "prowl";
      rx.yaw += Math.sin(performance.now() * 0.00035) * dt * 0.5;
      const nx = rx.gx + Math.sin(rx.yaw) * 4.5 * dt, nz = rx.gz + Math.cos(rx.yaw) * 4.5 * dt;
      if (this.world.getBiomeWeights(nx, nz).volcanic > 0.24 && !this._inSanctuary(nx, nz, 45) && this._isLandSafe(nx, nz, 8.0, 18.0)) { rx.gx = nx; rx.gz = nz; }
      else rx.yaw += Math.PI * 0.6;
      rx.phase += dt * 4.0;
    }
    if (!this._isLandSafe(rx.gx, rx.gz, 8.0, 14.0, true)) { rx.state = "prowl"; rx.dormantCd = 40.0; rx.gx = -8500; rx.gz = 1800; }
    rx.gy = this.world.getTerrainInfo(rx.gx, rx.gz, false).height;

    // 6. GODZILLA (v14.2: Fair Snow-Delivery Pacing + Stalk-From-Afar + Standoff Tail Whip + Titan Kick + 3-Min Rest!)
    const gz = this.godzilla;
    if (gz.adaptTimer > 0) { gz.adaptTimer -= dt; if (gz.adaptTimer <= 0) gz.adaptedToMil = false; }
    if (gz.beamCd > 0) gz.beamCd -= dt;
    if (gz.tailWhipTimer > 0) gz.tailWhipTimer = Math.max(0, gz.tailWhipTimer - dt);
    if (gz.tailWindup > 0) gz.tailWindup = Math.max(0, gz.tailWindup - dt);
    if (gz.kickTimer > 0) gz.kickTimer = Math.max(0, gz.kickTimer - dt);
    if (gz.combatFatigue > 0 && gz.state !== "charge" && gz.state !== "beam_fire") {
      gz.combatFatigue = Math.max(0, gz.combatFatigue - dt * 0.45);
    }

    // 3-MINUTE REST PHASE AFTER PLAYERS FIGHT HIM WELL (180s of peace for snow deliveries!)
    if (gz.state === "resting") {
      gz.restTimer = (gz.restTimer || 0) - dt;
      gz.beamTimer = 0;
      const isSnowyN = (p) => (p.z < -7500);
      const nearP = this._nearestPlayerIn(players, gz.gx, gz.gz, isSnowyN);
      if (nearP.player && nearP.dist < 420) {
        const awayAng = Math.atan2(gz.gx - nearP.player.x, gz.gz - nearP.player.z);
        gz.yaw = awayAng;
        gz.gx += Math.sin(awayAng) * 8.0 * dt;
        gz.gz = Math.min(-9200, gz.gz + Math.cos(awayAng) * 8.0 * dt);
        gz.phase += dt * 1.6;
      }
      gz.gy = this.world.getTerrainInfo(gz.gx, gz.gz, false).height;
      if (gz.restTimer <= 0) {
        gz.state = "stalk_afar";
        gz.stalkAfarTimer = 28.0;
        gz.adaptedToMil = false;
      }
      return;
    }

    if (gz.staggerTimer > 0) {
      gz.staggerTimer -= dt;
      gz.state = "prowl";
      gz.beamTimer = 0;
      gz.tailWindup = 0;
      gz.gx -= Math.sin(gz.yaw) * 3.8 * dt;
      gz.gz = Math.min(-8200, gz.gz - Math.cos(gz.yaw) * 3.8 * dt);
      gz.phase += dt * 0.8;
      gz.gy = this.world.getTerrainInfo(gz.gx, gz.gz, false).height;
      return;
    }

    const isSnowyNorth = (p) => (p.z < -7500 && (p.y > 120 || this.world.getBiomeWeights(p.x, p.z).mountains > 0.38));
    const gzPick = this._nearestPlayerIn(players, gz.gx, gz.gz, isSnowyNorth);

    if (gz.state === "beam_charge" || gz.state === "beam_fire") {
      gz.beamTimer -= dt;
      if (gzPick.player) {
        const tp = gzPick.player;
        const cAng = Math.atan2(tp.x - gz.gx, tp.z - gz.gz);
        let dy = cAng - gz.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        gz.yaw += dy * Math.min(1, dt * (gz.state === "beam_charge" ? 1.8 : 0.72));
        const sweepLat = gz.state === "beam_fire" ? Math.sin(gz.beamTimer * 2.4) * 14.0 : 0;
        gz.beamTargetX += ((tp.x + Math.cos(gz.yaw) * sweepLat) - gz.beamTargetX) * Math.min(1, dt * (gz.state === "beam_charge" ? 3.5 : 1.9));
        gz.beamTargetZ += ((tp.z - Math.sin(gz.yaw) * sweepLat) - gz.beamTargetZ) * Math.min(1, dt * (gz.state === "beam_charge" ? 3.5 : 1.9));
        gz.beamTargetY = this.world.getTerrainInfo(gz.beamTargetX, gz.beamTargetZ, false).height + 1.2;
      }
      if (gz.beamTimer <= 0) {
        if (gz.state === "beam_charge") {
          gz.state = "beam_fire";
          gz.beamTimer = 2.8;
          if (audio) audio.playCryptidSound("godzilla_beam_fire");
        } else {
          gz.state = "stalk_afar";
          gz.stalkAfarTimer = gz.adaptedToMil ? 6.0 : 18.0;
          gz.beamCd = gz.adaptedToMil ? 12.5 : 22.0;
        }
      }
    } else if (gz.state === "tail_windup" || gz.state === "tail_whip") {
      // Planted feet during standoff 160° spinning tail whip — NEVER walks over player's roof!
      if (gz.state === "tail_windup") {
        if (gz.tailWindup <= 0) {
          gz.state = "tail_whip";
          gz.tailWhipTimer = 1.25;
          gz.tailHitDone = false;
          if (audio) audio.playCryptidSound("godzilla");
        }
      } else {
        gz.yaw += dt * 2.8; // Dramatic spinning kaiju torso swing!
        if (gz.tailWhipTimer <= 0) {
          gz.state = "charge";
          gz.attackCd = 5.5;
        }
      }
    } else if (gzPick.player && gzPick.dist > 620) {
      if (Math.random() < dt * 0.035) {
        const tgt = this._randomPlayerIn(players, isSnowyNorth) || gzPick.player;
        const ang = Math.random() * Math.PI * 2;
        gz.gx = tgt.x + Math.cos(ang) * 310;
        gz.gz = Math.min(-8800, tgt.z + Math.sin(ang) * 310);
        gz.state = "stalk_afar";
        gz.stalkAfarTimer = 24.0;
      }
    } else if (gzPick.player && gzPick.dist < 520) {
      const tp = gzPick.player;
      const cAng = Math.atan2(tp.x - gz.gx, tp.z - gz.gz);
      let dy = cAng - gz.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      gz.yaw += dy * Math.min(1, dt * (gz.adaptedToMil ? 1.45 : 0.92));

      // Fair Pacing: If NOT provoked by gunfire & player stays > 145m away, loom & STARE from snowy ridges instead of relentlessly charging!
      const provoked = gz.adaptedToMil || gzPick.dist < 145 || (gzPick.dist < 220 && tp.speedKmh > 65);
      if (!provoked && gz.state !== "charge") {
        gz.state = "stalk_afar";
        if (gz.stalkAfarTimer > 0) gz.stalkAfarTimer -= dt;
        // Slowly pace along ridge maintaining ~220-280m looming distance
        if (gzPick.dist > 280) {
          gz.gx += Math.sin(gz.yaw) * 4.5 * dt;
          gz.gz = Math.min(-8400, gz.gz + Math.cos(gz.yaw) * 4.5 * dt);
          gz.phase += dt * 1.4;
        }
      } else {
        // Active Combat Engagement!
        const beamMaxR = gz.adaptedToMil ? 265 : 175;
        if (gz.beamCd <= 0 && gzPick.dist > 56 && gzPick.dist < beamMaxR) {
          gz.state = "beam_charge";
          gz.beamTimer = 2.2;
          gz.beamTargetX = tp.x; gz.beamTargetY = tp.y + 1.0; gz.beamTargetZ = tp.z;
          if (audio) { audio.playCryptidSound("godzilla_beam_charge"); audio.playCryptidSound("godzilla"); }
        } else if (gzPick.dist >= 27.0 && gzPick.dist <= 54.0 && gz.attackCd <= 0) {
          // STANDOFF SPINNING TAIL WHIP (27m - 54m) — Plants feet & coils cleanly without walking over you!
          gz.state = "tail_windup";
          gz.tailWindup = 0.75;
        } else {
          gz.state = "charge";
          // HARD STANDOFF CLAMP (< 28m): Stops walking forward so his legs NEVER clip through your tank roof!
          if (gzPick.dist > 28.0) {
            const spd = gz.adaptedToMil ? 15.5 : 12.5;
            gz.gx += Math.sin(gz.yaw) * spd * dt;
            gz.gz = Math.min(-8200, gz.gz + Math.cos(gz.yaw) * spd * dt);
            gz.phase += dt * 3.4;
          } else {
            gz.phase += dt * 1.2;
          }
        }
      }
    } else {
      gz.state = "prowl";
      gz.yaw += Math.sin(performance.now() * 0.0002) * dt * 0.35;
      const nx = gz.gx + Math.sin(gz.yaw) * 6.0 * dt, nz = gz.gz + Math.cos(gz.yaw) * 6.0 * dt;
      if (nz < -9000 && nz > -40000 && Math.abs(nx) < 34000 && this._isLandSafe(nx, nz, 10.0, 8.0)) { gz.gx = nx; gz.gz = nz; }
      else gz.yaw += Math.PI * 0.65;
      gz.phase += dt * 1.8;
    }
    if (!this._isLandSafe(gz.gx, gz.gz, 10.0, 10.0, true)) { gz.state = "prowl"; gz.gx = -4200; gz.gz = -18500; }
    gz.gy = this.world.getTerrainInfo(gz.gx, gz.gz, false).height;
  }

  _stepLocalEffectsAndVisuals(dt, vehicle, weatherSys, particles, audio, network, isAuthoritative) {
    const px = vehicle.pos.x, py = vehicle.pos.y, pz = vehicle.pos.z;
    const playerGroundY = this.world.getTerrainInfo(px, pz, true).height;
    const altAboveGround = py - playerGroundY;
    const upg = (vehicle.vState && vehicle.vState.upgrades) || {};
    const isP140 = !!vehicle.spec.isSchreckensfurst;
    const hasEmpShield = isP140 || (vehicle.spec.id === "t72" && !!upg.t72EmpShield);
    const hasAcousticJam = isP140 || (vehicle.spec.id === "t72" && !!upg.t72AcousticJammer);
    const hasKontakt5 = isP140 || (vehicle.spec.id === "t72" && !!upg.t72Kontakt5);
    const k5Dmg = isP140 ? 0.22 : (hasKontakt5 ? 0.35 : 1.0);
    const k5Fling = isP140 ? 0.24 : (hasKontakt5 ? 0.36 : 1.0);

    const sendCounter = (kind, amt) => {
      if (isAuthoritative) this.applyRemoteCounter(kind, amt);
      else if (network && network.mode !== "offline") network.send({ type: "cryptid_counter", kind, amt });
    };

    // 1. SIREN HEAD ANIMATIONS & AUDIO CUES (Zero Text!)
    const sh = this.sirenhead;
    if (sh.attackCd > 0) sh.attackCd -= dt;
    if (sh.cueCd > 0) sh.cueCd -= dt;
    const dSH = Math.hypot(sh.gx - px, sh.gz - pz);
    this.world.toLocal(sh.gx, sh.gy, sh.gz, sh.mesh.position);
    sh.mesh.rotation.y = sh.yaw;
    sh.mesh.visible = (sh.state !== "dormant" && dSH < 520);
    if (audio && audio.updateSirenHeadContinuous) audio.updateSirenHeadContinuous(dt, sh.state, dSH);

    if (sh.mesh.visible) {
      const ph = sh.phase;
      sh.matPulse.color.setHex(sh.state === "strike" && Math.sin(performance.now() * 0.008) > 0 ? 0xff2222 : 0x440808);
      if (sh.state === "distant_broadcast") {
        sh.bodyPivot.position.y = 8.4 + Math.sin(ph) * 0.14;
        sh.torsoPivot.rotation.x = 0.08 + Math.sin(ph * 0.7) * 0.05;
        sh.headPivot.rotation.z = Math.sin(ph * 2.1) * 0.16;
        sh.headPivot.rotation.y = Math.sin(ph * 0.9) * 0.35;
        sh.legL.hip.rotation.x = 0; sh.legL.knee.rotation.x = 0.08;
        sh.legR.hip.rotation.x = 0; sh.legR.knee.rotation.x = 0.08;
        sh.armL.shoulder.rotation.x = 0.05; sh.armL.elbow.rotation.x = -0.25 + Math.sin(ph * 3) * 0.08;
        sh.armR.shoulder.rotation.x = 0.05; sh.armR.elbow.rotation.x = -0.25 - Math.sin(ph * 2.7) * 0.08;
      } else if (sh.state === "recoil") {
        // Visibly recoiling & clutching sirens in static pain before bolting!
        sh.matPulse.color.setHex(Math.sin(performance.now() * 0.045) > 0 ? 0xff4444 : 0x220000);
        sh.bodyPivot.position.y = 7.9 + Math.sin(ph * 2.5) * 0.25;
        sh.torsoPivot.rotation.x = -0.34 + Math.sin(ph * 3.2) * 0.14;
        sh.headPivot.rotation.z = Math.sin(ph * 5.0) * 0.42;
        sh.armL.shoulder.rotation.x = -2.15; sh.armL.elbow.rotation.x = -1.25;
        sh.armR.shoulder.rotation.x = -2.15; sh.armR.elbow.rotation.x = -1.25;
        sh.legL.hip.rotation.x = -0.25; sh.legR.hip.rotation.x = 0.25;
      } else if (sh.state === "stalk") {
        const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
        sh.bodyPivot.position.y = 8.1 + Math.abs(sL) * 0.22;
        sh.torsoPivot.rotation.x = 0.24;
        sh.headPivot.rotation.z = Math.sin(ph * 0.8) * 0.12; sh.headPivot.rotation.y = 0;
        sh.legL.hip.rotation.x = sL * 0.55; sh.legL.knee.rotation.x = Math.max(0.12, -Math.cos(ph) * 0.65);
        sh.legR.hip.rotation.x = sR * 0.55; sh.legR.knee.rotation.x = Math.max(0.12, -Math.cos(ph + Math.PI) * 0.65);
        sh.armL.shoulder.rotation.x = -0.45 + sR * 0.45; sh.armL.elbow.rotation.x = -0.55;
        sh.armR.shoulder.rotation.x = -0.45 + sL * 0.45; sh.armR.elbow.rotation.x = -0.55;
      } else {
        const sL = Math.sin(ph), sR = Math.sin(ph + Math.PI);
        sh.bodyPivot.position.y = 7.75 + Math.abs(sL) * 0.65;
        sh.torsoPivot.rotation.x = 0.44;
        sh.headPivot.rotation.z = Math.sin(ph * 2) * 0.08;
        sh.legL.hip.rotation.x = sL * 0.98 - 0.12; sh.legL.knee.rotation.x = Math.max(0.15, -Math.cos(ph) * 1.15);
        sh.legR.hip.rotation.x = sR * 0.98 - 0.12; sh.legR.knee.rotation.x = Math.max(0.15, -Math.cos(ph + Math.PI) * 1.15);
        sh.armL.shoulder.rotation.x = -0.85 + sR * 0.95; sh.armL.elbow.rotation.x = -0.78;
        sh.armR.shoulder.rotation.x = -0.85 + sL * 0.95; sh.armR.elbow.rotation.x = -0.78;
      }
    }

    if (sh.sonicCd > 0) sh.sonicCd -= dt;
    if (sh.state !== "dormant" && dSH < 420) {
      this.anyThreatNear = true;
      // Continuous mood-morphing Siren Head voice is driven every frame below!
      if (sh.state === "stalk" || sh.state === "strike") {
        const stealth = !vehicle.engineRunning && !vehicle.headlights && !vehicle.lightbar && vehicle.speedKmh < 5;
        if (stealth) sendCounter("sirenhead", dt * 1.15);
      }

      // ATTACK VARIATION 1 — SONIC SIREN BLAST (Mid-Range < 92m): Massive sound blast, screen jitter,
      // instruments go haywire & lights flicker violently, light car damage!
      if (sh.state === "strike" && dSH < 92.0 && dSH > 14.0 && sh.sonicCd <= 0) {
        sh.sonicCd = 12.0;
        audio.playCryptidSound("siren_sonic_blast");
        const sShake = hasAcousticJam ? 0.34 : 1.15;
        const sDur = hasEmpShield ? 1.2 : (hasAcousticJam ? 2.8 : 6.5);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, sShake);
        if (!isP140) this.empTrigger = { dur: sDur, kind: "sonic" };
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - Math.round(5 * k5Dmg));
        // Slight acoustic shove
        const pushAng = Math.atan2(px - sh.gx, pz - sh.gz);
        vehicle.applyExternalImpulse(Math.sin(pushAng) * 6.5, 2.2, Math.cos(pushAng) * 6.5, (Math.random() - 0.5) * 1.8);
      }

      // ATTACK VARIATION 2 — HEAVY THROW / MEGA YEET (Close < 11.5m): Big car damage OR point-blank Sonic Blast!
      if (sh.state === "strike" && dSH < 11.5 && altAboveGround < 5.5 && Math.abs(py - sh.gy) < 12.0 && sh.attackCd <= 0) {
        if (sh.sonicCd <= 0 && Math.random() < 0.35) {
          // Point-blank Sonic Blast variation (light damage, huge screen/light/gauge haywire!)
          sh.attackCd = 6.5; sh.sonicCd = 12.0;
          audio.playCryptidSound("siren_sonic_blast");
          this.cameraShakeOut = Math.max(this.cameraShakeOut, 1.25);
          this.empTrigger = { dur: 7.5, kind: "sonic" };
          vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 6);
        } else {
          // Heavy Throw variation (BIG car damage + massive treetop yeet!)
          sh.attackCd = 10.0;
          audio.playCryptidSound("sirenhead"); audio.playImpact(1.0);
          const yeetAng = sh.yaw + (Math.random() - 0.5) * 0.8;
          vehicle.applyExternalImpulse(Math.sin(yeetAng) * 36 * k5Fling, 36.0 * k5Fling, Math.cos(yeetAng) * 36 * k5Fling, (Math.random() - 0.5) * 8.5 * k5Fling);
          vehicle.cargoStrapped = false;
          const p = vehicle.vState.parts;
          for (const id of ["radiator", "intercooler", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods"]) {
            if (p[id]) p[id].hp = Math.max(12, p[id].hp - (16 + Math.random() * 12) * k5Dmg);
          }
          vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 32 * k5Dmg);
          if (vehicle.damageHeadlights) vehicle.damageHeadlights(48, 0);
          particles.emitCrashBurst(px, py, pz, 1.5, "gravel", weatherSys.weather);
          if (isAuthoritative) { sh.state = "flee"; sh.fleeTimer = 14; }
        }
      }
    }

    // 2. FOREST YETI
    const yt = this.yeti;
    if (yt.attackCd > 0) yt.attackCd -= dt;
    if (yt.cueCd > 0) yt.cueCd -= dt;
    const dYeti = Math.hypot(yt.gx - px, yt.gz - pz);
    this.world.toLocal(yt.gx, yt.gy, yt.gz, yt.mesh.position);
    yt.mesh.rotation.y = yt.yaw; yt.mesh.visible = dYeti < 380;
    if (yt.mesh.visible) {
      const sw = Math.sin(yt.phase) * 0.75;
      yt.legL.rotation.x = sw; yt.legR.rotation.x = -sw;
      yt.armL.rotation.x = yt.state === "flee" ? -2.4 : -sw * 0.9;
      yt.armR.rotation.x = yt.state === "flee" ? -2.4 : sw * 0.9;
    }
    if ((yt.state === "stalk" || yt.state === "chase") && dYeti < 160) {
      this.anyThreatNear = true;
      if (yt.cueCd <= 0) {
        if (yt.state === "chase") { audio.playCryptidSound("yeti"); yt.cueCd = 7.0; }
        else { audio.playStagedCue("yeti_breath", Math.max(0.25, 1 - dYeti / 160)); yt.cueCd = 5.5; }
      }
      const spookRate = (vehicle.hornActive ? 1.55 : 0) + (vehicle.lightbar ? 1.35 : 0) + (vehicle.headlights && dYeti < 45 ? 0.55 : 0);
      if (spookRate > 0) sendCounter("yeti", spookRate * dt);
      if (yt.state === "chase" && dYeti < 7.2 && altAboveGround < 5.0 && yt.attackCd <= 0) {
        yt.attackCd = 4.5;
        audio.playImpact(0.95); audio.playCryptidSound("yeti");
        vehicle.applyExternalImpulse(Math.sin(yt.yaw) * 18, 9.0, Math.cos(yt.yaw) * 18, (Math.random() - 0.5) * 4.5);
        vehicle.cargoStrapped = false;
        particles.emitCrashBurst(px, py, pz, 0.9, "gravel", weatherSys.weather);
      }
    }

    // 3. ABOMINABLE SNOWMAN
    const sn = this.snowman;
    if (sn.attackCd > 0) sn.attackCd -= dt;
    if (sn.cueCd > 0) sn.cueCd -= dt;
    const dSnow = Math.hypot(sn.gx - px, sn.gz - pz);
    this.world.toLocal(sn.gx, sn.gy, sn.gz, sn.mesh.position);
    sn.mesh.rotation.y = sn.yaw;
    sn.mesh.visible = dSnow < 380 && (sn.gy > 135 || weatherSys.weather === "snow");
    if (sn.mesh.visible) {
      const sw = Math.sin(sn.phase) * 0.7;
      sn.legL.rotation.x = sw; sn.legR.rotation.x = -sw;
      sn.armL.rotation.x = -sw * 0.85; sn.armR.rotation.x = sw * 0.85;
    }
    if ((sn.state === "stalk" || sn.state === "chase") && dSnow < 160) {
      this.anyThreatNear = true;
      this.iceAuraStrength = Math.max(0.22, Math.min(0.82, 1.0 - dSnow / 160));
      if (Math.random() < 0.25) particles.emitFrostOrSand(px, py + 0.5, pz, true, 2);
      if (sn.cueCd <= 0) {
        if (sn.state === "chase") { audio.playCryptidSound("snowman"); sn.cueCd = 7.5; }
        else { audio.playStagedCue("frost_chime", Math.max(0.3, 1 - dSnow / 160)); sn.cueCd = 5.0; }
      }
      const eng = KK.ENGINES[vehicle.vState.engineId] || KK.ENGINES.umz_24;
      const revHigh = vehicle.engineRunning && (vehicle.rpm > eng.redlineRpm * 0.72 || vehicle.egtTemp > 510);
      const heatRate = (revHigh ? 1.15 : 0) + (vehicle.backfireTimer > 0 ? 4.5 : 0);
      if (heatRate > 0) sendCounter("snowman", heatRate * dt);
      if (sn.state === "chase" && dSnow < 7.5 && altAboveGround < 5.0 && sn.attackCd <= 0) {
        sn.attackCd = 4.5;
        audio.playImpact(0.85); audio.playCryptidSound("snowman");
        vehicle.applyExternalImpulse(Math.sin(sn.yaw) * 18, 6.5, Math.cos(sn.yaw) * 18, (Math.random() - 0.5) * 5.0);
        vehicle.coolantTemp = Math.max(52, vehicle.coolantTemp - 18);
        particles.emitFrostOrSand(px, py + 1, pz, true, 12);
      }
    }

    // 4. ANIMATED 15x SANDWYRM
    const swm = this.sandworm;
    if (swm.attackCd > 0) swm.attackCd -= dt;
    if (swm.cueCd > 0) swm.cueCd -= dt;
    const dWorm = Math.hypot(swm.gx - px, swm.gz - pz);
    this.sandwormDist = dWorm;
    this.sandwormActive = (swm.state === 'tremor' || swm.state === 'stalk' || swm.state === 'erupt');

    if (swm.state === "tremor" && dWorm < 360) {
      this.anyThreatNear = true; swm.mesh.visible = false;
      const prox = Math.max(0, 1.0 - dWorm / 360);
      this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.28);
      if (swm.cueCd <= 0) { audio.playStagedCue("sand_tremor", 0.35 + prox * 0.55); swm.cueCd = 2.4; }
      if (Math.random() < 0.35) particles.emitFrostOrSand(swm.gx, swm.gy + 0.5, swm.gz, false, 3);
      const gInfo = this.world.getTerrainInfo(px, pz, true);
      const silent = (!vehicle.engineRunning && vehicle.speedKmh < 4) || gInfo.surface === "asphalt" || gInfo.surface === "rock";
      if (silent) sendCounter("sandworm", dt * 1.15);
    } else if (swm.state === "erupt") {
      this.anyThreatNear = true; swm.mesh.visible = true;
      const tNorm = Math.max(0, Math.min(1, 1.0 - (swm.eruptTimer / 4.4)));
      const archH = Math.sin(tNorm * Math.PI) * 88.0;
      const groundH = this.world.getTerrainInfo(swm.gx, swm.gz, false).height;
      this.world.toLocal(swm.gx, groundH + archH - 18.0, swm.gz, swm.mesh.position);
      swm.mesh.rotation.y = swm.yaw;
      swm.mesh.rotation.x = -Math.PI * 0.44 + tNorm * Math.PI * 0.88;
      this.cameraShakeOut = Math.max(this.cameraShakeOut, Math.max(0, 1 - dWorm / 260) * 0.95);
      if (Math.random() < 0.75) particles.emitFrostOrSand(swm.gx, groundH + 2.0, swm.gz, false, 6);

      if (dWorm < 28.0 && altAboveGround < 8.0 && swm.attackCd <= 0) {
        swm.attackCd = 8.0;
        audio.playCryptidSound("sandworm"); audio.playImpact(1.0);
        const yeetAng = Math.random() * Math.PI * 2;
        vehicle.applyExternalImpulse(Math.sin(yeetAng) * 34 * k5Fling, 48.0 * k5Fling, Math.cos(yeetAng) * 34 * k5Fling, (Math.random() - 0.5) * 11.0 * k5Fling);
        // MASSIVE INTERNAL DAMAGE ON SANDWYRM YEET!
        const p = vehicle.vState.parts;
        for (const id of ["pistons", "crankshaft", "headGasket", "radiator", "intercooler", "gearboxGears", "driveshaft", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods"]) {
          if (p[id]) p[id].hp = Math.max(8, p[id].hp - (24 + Math.random() * 24) * k5Dmg);
        }
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 45);
        vehicle.vState.health.headlightL = Math.max(0, vehicle.vState.health.headlightL - 70);
        vehicle.vState.health.headlightR = Math.max(0, vehicle.vState.health.headlightR - 70);
        if (vehicle._damageTire) vehicle._damageTire(Math.floor(Math.random() * vehicle.wheels.length), 100, "sandwyrm");
        particles.emitFrostOrSand(px, py, pz, false, 20);
      }
    } else if (swm.state === "stalk" && dWorm < 460) {
      this.anyThreatNear = true; swm.mesh.visible = true;
      this.world.toLocal(swm.gx, swm.gy - 8.5, swm.gz, swm.mesh.position);
      swm.mesh.rotation.set(0, swm.yaw, 0);
      const prox = Math.max(0, 1.0 - dWorm / 360);
      this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.62);
      if (swm.cueCd <= 0) { audio.playStagedCue("sand_tremor", 0.55 + prox * 0.45); swm.cueCd = 1.65; }
      if (Math.random() < 0.70) particles.emitFrostOrSand(swm.gx, swm.gy + 2.0, swm.gz, false, 5);
      if (dWorm < 340) {
        const gInfo = this.world.getTerrainInfo(px, pz, true);
        const silent = (!vehicle.engineRunning && vehicle.speedKmh < 4) || gInfo.surface === "asphalt" || gInfo.surface === "rock";
        if (silent) sendCounter("sandworm", dt * 1.15);
        if (dWorm < 75) this.quicksandDrag = Math.min(0.85, (1 - dWorm / 75) * 0.9);
      }
    } else { swm.mesh.visible = false; }

    if (swm.mesh.visible) {
      for (let i = 0; i < swm.segments.length; i++) {
        const seg = swm.segments[i];
        seg.position.set(
          Math.sin(swm.phase - i * 0.52) * (4.2 + i * 0.25),
          Math.cos(swm.phase * 0.85 - i * 0.45) * 3.4,
          -i * 17.5
        );
        seg.rotation.z = Math.sin(swm.phase * 0.6 - i * 0.35) * 0.18;
      }
      const jawOpen = (swm.state === "erupt") ? (-0.42 + Math.sin(swm.phase * 2.2) * 0.35) : (-0.15 + Math.sin(swm.phase * 1.6) * 0.22);
      for (const flap of swm.jawFlaps) flap.rotation.x = jawOpen;
    }

    // 5. VOLCANIC T-REX (Jaw Chomp Yeet + Tail Whip + Real Internal Mechanical Damage!)
    const rx = this.trex;
    if (rx.attackCd > 0) rx.attackCd -= dt;
    if (rx.cueCd > 0) rx.cueCd -= dt;
    const dRex = Math.hypot(rx.gx - px, rx.gz - pz);
    // Exact forward Jaw & rear Tail world hitboxes matching the 3D T-Rex mesh!
    const jawX = rx.gx + Math.sin(rx.yaw) * 5.2, jawZ = rx.gz + Math.cos(rx.yaw) * 5.2;
    const tailX = rx.gx - Math.sin(rx.yaw) * 7.0, tailZ = rx.gz - Math.cos(rx.yaw) * 7.0;
    const dJaw = Math.hypot(jawX - px, jawZ - pz);
    const dTail = Math.hypot(tailX - px, tailZ - pz);

    this.world.toLocal(rx.gx, rx.gy, rx.gz, rx.mesh.position);
    rx.mesh.rotation.y = rx.yaw; rx.mesh.visible = dRex < 480;
    if (rx.mesh.visible) {
      const sw = Math.sin(rx.phase) * 0.62;
      rx.legL.rotation.x = sw; rx.legR.rotation.x = -sw;
      rx.tailPivot.rotation.y = Math.sin(rx.phase * 0.8) * 0.42;
      rx.jawPivot.rotation.x = (rx.state === "chase" || rx.state === "flare" || dJaw < 14) ? (0.42 + Math.abs(Math.sin(rx.phase * 1.5)) * 0.48) : 0.10;
    }

    if (dRex < 240 && (rx.state === "stalk" || rx.state === "chase" || rx.state === "prowl")) {
      if (rx.state === "stalk" || rx.state === "chase") {
        this.anyThreatNear = true;
        const prox = Math.max(0, 1 - dRex / 240);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.42);
        if (rx.cueCd <= 0) {
          if (rx.state === "chase" && Math.random() < 0.40) { audio.playCryptidSound("trex"); rx.cueCd = 3.8; }
          else { audio.playStagedCue("trex_stomp", 0.40 + prox * 0.60); rx.cueCd = rx.state === "chase" ? 0.58 : 1.25; }
        }
        // Only send remote freeze counter from non-host clients (prevents 2x double-counting on host!)
        if (!isAuthoritative && vehicle.speedKmh < 2.2 && dRex > 14.0) {
          sendCounter("trex", dt * 0.9);
        }
      }

      // ATTACK 1 — JAW CHOMP & MASSIVE FLING (Triggers in chase/stalk OR if you ram straight into it!)
      const inBiteRange = (dJaw < 8.4 || dRex < 11.8);
      const canBite = (rx.state === "chase" || rx.state === "stalk" || (rx.state === "prowl" && vehicle.speedKmh > 4.0));
      if (canBite && inBiteRange && altAboveGround < 6.5 && rx.attackCd <= 0) {
        rx.attackCd = 5.5;
        if (isAuthoritative) rx.state = "chase";
        audio.playCryptidSound("trex"); audio.playImpact(1.0);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, 1.05);

        const flingAng = rx.yaw + (Math.random() - 0.5) * 0.9;
        vehicle.applyExternalImpulse(Math.sin(flingAng) * 38 * k5Fling, 34.0 * k5Fling, Math.cos(flingAng) * 38 * k5Fling, (Math.random() - 0.5) * 9.5 * k5Fling);
        vehicle.cargoStrapped = false;

        // Crushing Tyrannosaur bite internal mechanical damage!
        const p = vehicle.vState.parts;
        for (const id of ["radiator", "intercooler", "pistons", "headGasket", "shockFL", "shockFR", "tieRods"]) {
          if (p[id]) p[id].hp = Math.max(10, p[id].hp - (18 + Math.random() * 14) * k5Dmg);
        }
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 38);
        if (vehicle.damageHeadlights) vehicle.damageHeadlights(65, 0);
        if (vehicle._damageTire && Math.random() < 0.65) {
          vehicle._damageTire(Math.floor(Math.random() * vehicle.wheels.length), 100, "trex");
        }
        particles.emitCrashBurst(px, py, pz, 1.4, "rock", weatherSys.weather);
      }
      // ATTACK 2 — SWEEPING TAIL WHIP (If you try to skirt behind its tail!)
      else if (canBite && dTail < 7.8 && altAboveGround < 6.5 && rx.attackCd <= 0) {
        rx.attackCd = 5.0;
        if (isAuthoritative) rx.state = "chase";
        audio.playCryptidSound("trex"); audio.playImpact(0.95);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, 0.85);

        const sideAng = rx.yaw + (Math.random() < 0.5 ? Math.PI * 0.5 : -Math.PI * 0.5);
        vehicle.applyExternalImpulse(Math.sin(sideAng) * 32, 22.0, Math.cos(sideAng) * 32, (Math.random() - 0.5) * 10.5);
        const p = vehicle.vState.parts;
        for (const id of ["shockRL", "shockRR", "driveshaft", "antiRollBar"]) {
          if (p[id]) p[id].hp = Math.max(12, p[id].hp - (16 + Math.random() * 12));
        }
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - 26);
        particles.emitCrashBurst(px, py, pz, 1.2, "rock", weatherSys.weather);
      }
    }

    // 6. GODZILLA LOCAL ANIMATIONS, STANDOFF TAIL WHIP, HEAVY TITAN KICK, BEAM & RESTING!
    const gz = this.godzilla;
    if (gz.cueCd > 0) gz.cueCd -= dt;
    if (gz.stompCd > 0) gz.stompCd -= dt;
    if (gz.attackCd > 0) gz.attackCd -= dt;
    if (gz.empCd > 0) gz.empCd -= dt;
    if (gz.flashTimer > 0) gz.flashTimer -= dt;
    const dGz = Math.hypot(gz.gx - px, gz.gz - pz);
    this.world.toLocal(gz.gx, gz.gy, gz.gz, gz.mesh.position);
    gz.mesh.rotation.y = gz.yaw;
    gz.mesh.visible = dGz < 860;

    if (gz.mesh.visible) {
      const ph = gz.phase, sw = Math.sin(ph) * 0.42;
      const isBeamChg  = (gz.state === "beam_charge");
      const isBeamFire = (gz.state === "beam_fire");
      const isCharging = (gz.state === "charge");
      const isResting  = (gz.state === "resting");
      const isStalking = (gz.state === "stalk_afar");
      const isTailWind = (gz.state === "tail_windup");
      const isTailWhip = (gz.state === "tail_whip");

      // Legs: Kick animation on Titan Kick, braced wide during beam/tail whip!
      if ((gz.kickTimer || 0) > 0) {
        const kFrac = Math.sin(Math.min(1, gz.kickTimer / 0.85) * Math.PI);
        gz.legR.rotation.x = -1.15 * kFrac;
        gz.legL.rotation.x = 0.20 * kFrac;
      } else {
        gz.legL.rotation.x = (isBeamChg || isBeamFire || isTailWind || isTailWhip || isStalking) ? 0.14 : sw;
        gz.legR.rotation.x = (isBeamChg || isBeamFire || isTailWind || isTailWhip || isStalking) ? -0.14 : -sw;
      }

      gz.bodyPivot.position.y = (isResting ? 13.4 : 14.5) + ((isBeamChg || isBeamFire || isTailWind || isTailWhip || isStalking) ? 0.35 : Math.abs(Math.sin(ph)) * 0.9);
      gz.bodyPivot.rotation.x = isBeamFire ? -0.14 : (isTailWind ? 0.22 : (gz.adaptedToMil && isCharging ? 0.16 : 0.04));

      // Dramatic Coiling -> Sweeping 160° Tail Whip Animation!
      if (isTailWind) {
        gz.tailPivot.rotation.y = -1.35 * (1.0 - (gz.tailWindup || 0) / 0.75);
      } else if (isTailWhip) {
        const wFrac = 1.0 - (gz.tailWhipTimer || 0) / 1.25;
        gz.tailPivot.rotation.y = -1.35 + wFrac * 2.95;
      } else {
        gz.tailPivot.rotation.y = Math.sin(ph * 0.75) * (isResting ? 0.18 : 0.48);
      }

      gz.armL.rotation.x = isBeamFire ? -0.85 : (isTailWind ? -0.55 : (-0.15 + sw * 0.35));
      gz.armR.rotation.x = isBeamFire ? -0.85 : (isTailWind ? -0.55 : (-0.15 - sw * 0.35));

      gz.jawPivot.rotation.x = isBeamFire ? 0.98 : (isBeamChg ? (0.45 + (1.0 - gz.beamTimer / 2.2) * 0.48) : ((isCharging || isTailWhip || gz.flashTimer > 0) ? (0.50 + Math.sin(ph * 2.2) * 0.22) : 0.10));
      if (gz.matThroat) {
        gz.matThroat.opacity = isBeamFire ? 0.98 : (isBeamChg ? (0.25 + (1.0 - gz.beamTimer / 2.2) * 0.70) : (gz.flashTimer > 0 ? 0.75 : 0.10));
      }

      const nFins = gz.dorsalFins.length;
      const chgProgress = isBeamChg ? Math.max(0, Math.min(1, 1.0 - (gz.beamTimer / 2.2))) : 0;
      for (let f = 0; f < nFins; f++) {
        const finFrac = f / Math.max(1, nFins - 1);
        let inten = isResting ? 0.06 : 0.28;
        if (isBeamFire) inten = 5.2 + Math.sin(performance.now() * 0.03 + f) * 1.1;
        else if (isBeamChg) inten = finFrac <= chgProgress ? 4.4 : 0.35;
        else if (gz.flashTimer > 0) inten = 4.0;
        else if (isTailWind || isTailWhip) inten = 2.4;
        else if (isCharging) inten = 1.6 + Math.sin(performance.now() * 0.012 - f * 0.4) * 0.8;
        else if (isStalking) inten = 0.55 + Math.sin(performance.now() * 0.004 - f * 0.25) * 0.25;
        gz.dorsalFins[f].emissiveIntensity = inten;
      }

      if (isBeamFire) {
        gz.beamGroup.visible = true;
        gz.beamImpact.visible = true;
        const mouthWorld = new THREE.Vector3();
        gz.beamGroup.getWorldPosition(mouthWorld);
        const tgtLocal = this.world.toLocal(gz.beamTargetX, gz.beamTargetY, gz.beamTargetZ, new THREE.Vector3());
        const beamLen = Math.max(18, Math.min(360, mouthWorld.distanceTo(tgtLocal)));
        gz.beamGroup.lookAt(tgtLocal);
        const flicker = 0.90 + Math.random() * 0.28;
        gz.beamCore.scale.set(flicker, flicker, beamLen);
        gz.beamHalo.scale.set(flicker * 1.12, flicker * 1.12, beamLen);
        gz.beamImpact.position.copy(tgtLocal);
        gz.beamImpact.scale.setScalar(0.85 + Math.random() * 0.45);
        if (Math.random() < 0.75) particles.emitFrostOrSand(gz.beamTargetX, gz.beamTargetY + 1.0, gz.beamTargetZ, true, 5);

        const dBeamToPlayer = Math.hypot(gz.beamTargetX - px, gz.beamTargetZ - pz);
        if (dBeamToPlayer < 22.0 && gz.empCd <= 0) {
          gz.empCd = 1.4;
          this.cameraShakeOut = Math.max(this.cameraShakeOut, hasEmpShield ? 0.55 : 1.25);
          if (!isP140) this.empTrigger = { dur: hasEmpShield ? 1.8 : 9.5, kind: "radiation" };
          const empScale = hasEmpShield ? 0.22 : 1.0;
          const bAng = Math.atan2(px - gz.gx, pz - gz.gz);
          vehicle.applyExternalImpulse(Math.sin(bAng) * 20 * k5Fling, 7.5 * k5Fling, Math.cos(bAng) * 20 * k5Fling, (Math.random() - 0.5) * 3.5 * k5Fling);
          vehicle.coolantTemp = Math.min(129, vehicle.coolantTemp + 14 * empScale);
          vehicle.vState.health.body = Math.max(6, vehicle.vState.health.body - Math.round(18 * k5Dmg));
          const p = vehicle.vState.parts;
          for (const id of ["sparkPlugs", "fuelInjectors", "radiator", "intercooler"]) {
            if (p[id]) p[id].hp = Math.max(10, p[id].hp - (8 + Math.random() * 6) * empScale);
          }
        }
      } else {
        gz.beamGroup.visible = false;
        gz.beamImpact.visible = false;
      }
    } else {
      gz.beamGroup.visible = false;
      gz.beamImpact.visible = false;
    }

    if (dGz < 520 && gz.state !== "resting") {
      this.anyThreatNear = (gz.state === "charge" || gz.state === "beam_charge" || gz.state === "beam_fire" || gz.state === "tail_windup" || gz.state === "tail_whip");
      const prox = Math.max(0, 1.0 - dGz / 520);
      if (gz.stompCd <= 0 && (gz.state === "charge" || gz.state === "prowl")) {
        gz.stompCd = gz.state === "charge" ? 1.35 : 2.35;
        audio.playStagedCue("godzilla_stomp", 0.38 + prox * 0.60);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.62);
        particles.emitFrostOrSand(gz.gx, gz.gy + 1.0, gz.gz, true, 6);
      }
      if (gz.cueCd <= 0 && dGz < 440) {
        if (gz.state === "charge" || gz.state === "stalk_afar" || gz.adaptedToMil) {
          audio.playCryptidSound("godzilla");
          gz.cueCd = gz.state === "stalk_afar" ? 16.5 : 11.5;
        } else {
          audio.playStagedCue("godzilla_hum", 0.35 + prox * 0.5);
          gz.cueCd = 9.5;
        }
      }

      // v14.2 REVAMPED STANDOFF TAIL WHIP HIT (Triggers mid-swing at 20m - 58m, packs REAL Kaiju punch even vs 68T tanks!)
      const kaijuFling = isP140 ? 0.62 : (hasKontakt5 ? 0.68 : 1.0);
      if (gz.state === "tail_whip" && !gz.tailHitDone && (gz.tailWhipTimer || 0) < 0.82 && dGz < 58.0 && altAboveGround < 14.0) {
        gz.tailHitDone = true;
        audio.playImpact(1.0);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, 1.15);
        // Sweeping lateral + outward + upward kaiju tail impact!
        const outAng = Math.atan2(px - gz.gx, pz - gz.gz);
        const sweepAng = outAng + 0.72;
        vehicle.applyExternalImpulse(
          Math.sin(sweepAng) * 44 * kaijuFling,
          19.5 * kaijuFling,
          Math.cos(sweepAng) * 44 * kaijuFling,
          (Math.random() > 0.5 ? 1 : -1) * 7.8 * kaijuFling
        );
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - Math.round(34 * k5Dmg));
        const p = vehicle.vState.parts;
        for (const id of ["shockFL", "shockFR", "shockRL", "shockRR", "tieRods", "driveshaft"]) {
          if (p[id]) p[id].hp = Math.max(8, p[id].hp - (18 + Math.random() * 14) * k5Dmg);
        }
        particles.emitFrostOrSand(px, py + 1.5, pz, true, 24);
      }

      // v14.2 REVAMPED CLOSE-RANGE TITAN KICK (< 30m): Cleanly boots the vehicle away instead of clipping feet over you!
      if (dGz < 30.0 && altAboveGround < 11.0 && gz.attackCd <= 0 && gz.state !== "tail_windup" && gz.state !== "tail_whip") {
        gz.attackCd = 6.2;
        gz.kickTimer = 0.85;
        audio.playCryptidSound("godzilla"); audio.playImpact(1.0);
        this.cameraShakeOut = Math.max(this.cameraShakeOut, 1.25);
        const kickAng = Math.atan2(px - gz.gx, pz - gz.gz);
        vehicle.applyExternalImpulse(
          Math.sin(kickAng) * 52 * kaijuFling,
          24.0 * kaijuFling,
          Math.cos(kickAng) * 52 * kaijuFling,
          (Math.random() - 0.5) * 9.0 * kaijuFling
        );
        const p = vehicle.vState.parts;
        for (const id of ["pistons", "crankshaft", "headGasket", "radiator", "intercooler", "gearboxGears", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods"]) {
          if (p[id]) p[id].hp = Math.max(5, p[id].hp - (26 + Math.random() * 18) * k5Dmg);
        }
        vehicle.vState.health.body = Math.max(5, vehicle.vState.health.body - Math.round(44 * k5Dmg));
        if (vehicle.damageHeadlights) vehicle.damageHeadlights(70, 0);
        if (vehicle._damageTire) vehicle._damageTire(Math.floor(Math.random() * vehicle.wheels.length), 100, "godzilla");
        particles.emitFrostOrSand(px, py + 1.2, pz, true, 26);
      }
    }
  }
};
