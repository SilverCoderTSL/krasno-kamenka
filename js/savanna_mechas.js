// ============================================================================
// KRASNO-KAMENKA OBLAST v18.1 — ZOLOTOY SAVANNA COLOSSAL STAHLHELM MECHAS
// 3 Extremely Tall (~68m!) Heavy Armored Mechas (2 Dormant Statues + 1 Active Patrol!)
// Active coastal defender ("EINHEIT-03") features full multi-joint knee/ankle/hip/
// torso/shoulder/head animation, ground-dust footfalls, seismic footsteps & twin
// 6-tube shoulder rocket pods that fire salvos to repel Megalodon & Kraken!
// ============================================================================
window.KK = window.KK || {};

KK.SavannaMechaManager = class SavannaMechaManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.mechas = [];
    this.rockets = [];
    this._stepPhase = 0;
    this._lastStepHalf = 0;
    this._salvoCd = 0;
    this._headScanT = 0;
    this.cameraShakeOut = 0;

    this._camoTex = this._makeSplinterCamoTex();
    this._emblemTex = this._makeWingedSwordEmblemTex();
    this._buildAllMechas();
  }

  _makeSplinterCamoTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#2b3033";
    ctx.fillRect(0, 0, 256, 256);
    const cols = ["#1a1e21", "#3b4246", "#23282b", "#495156", "#15181a"];
    let s = 14041;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 46; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const cx = rnd() * 256, cy = rnd() * 256;
      const r = 20 + rnd() * 50;
      ctx.beginPath();
      const n = 4 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.6;
        const rr = r * (0.55 + rnd() * 0.6);
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(215, 225, 230, 0.09)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 28; i++) {
      const x = rnd() * 256, y = rnd() * 256;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 44, y + (rnd() - 0.5) * 44); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _makeWingedSwordEmblemTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#e2e8ee";
    // Central downward blade
    ctx.beginPath();
    ctx.moveTo(128, 34); ctx.lineTo(139, 64); ctx.lineTo(135, 198);
    ctx.lineTo(147, 194); ctx.lineTo(128, 234); ctx.lineTo(109, 194);
    ctx.lineTo(121, 198); ctx.lineTo(117, 64);
    ctx.closePath(); ctx.fill();
    // Spread feathered wings on both sides
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(128, 108);
      ctx.scale(sx, 1);
      for (let f = 0; f < 5; f++) {
        ctx.beginPath();
        const y0 = -28 + f * 13;
        const len = 96 - f * 12;
        ctx.moveTo(12, y0);
        ctx.quadraticCurveTo(len * 0.55, y0 - 16 + f * 4, len, y0 - 8 + f * 7);
        ctx.lineTo(len - 10, y0 + 5 + f * 6);
        ctx.quadraticCurveTo(len * 0.45, y0 + 2 + f * 3, 12, y0 + 9);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    return new THREE.CanvasTexture(cv);
  }

  _buildSingleMecha(isActive) {
    const root = new THREE.Group();
    const matCamo = new THREE.MeshStandardMaterial({
      map: this._camoTex, color: isActive ? 0xdbe2e6 : 0x9aa2a8,
      roughness: isActive ? 0.68 : 0.90, metalness: 0.38
    });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x191c1f, roughness: 0.76, metalness: 0.54 });
    const matJoint = new THREE.MeshStandardMaterial({ color: 0x2c3238, roughness: 0.58, metalness: 0.72 });
    const matStripe = new THREE.MeshStandardMaterial({ color: isActive ? 0xd6dde3 : 0x8d959b, roughness: 0.64, metalness: 0.16 });
    const matEmblem = new THREE.MeshBasicMaterial({ map: this._emblemTex, transparent: true, opacity: isActive ? 0.94 : 0.54, side: THREE.DoubleSide });
    const matVisor = isActive
      ? new THREE.MeshBasicMaterial({ color: 0xffa61a })
      : new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.45, metalness: 0.6 });
    const matTubeIn = new THREE.MeshBasicMaterial({ color: 0x080a0c });
    const matFlash = new THREE.MeshBasicMaterial({ color: 0xffbe3b, transparent: true, opacity: 0.92 });

    // Base rig is ~13.1 units tall -> scaled 5.2x = ~68 METERS EXTREMELY TALL SKYSCRAPER-SIZE MECHA!
    const rig = new THREE.Group();
    root.add(rig);

    // 1. PELVIS & TACTICAL BELT POUCHES (y = 5.65)
    const pelvisGrp = new THREE.Group();
    pelvisGrp.position.set(0, 5.65, 0);
    rig.add(pelvisGrp);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(3.45, 1.35, 2.25), matCamo);
    pelvisGrp.add(pelvis);
    const crotch = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.45, 2.40), matCamo);
    crotch.position.set(0, -0.45, 0.12); pelvisGrp.add(crotch);
    for (let bx = -1.65; bx <= 1.66; bx += 0.66) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.74, 0.58), matDark);
      pouch.position.set(bx, 0.30, 1.18); pelvisGrp.add(pouch);
    }

    // 2. ARTICULATED TORSO GROUP (turns toward ocean threats & pitches with heavy gait!)
    const torsoGrp = new THREE.Group();
    torsoGrp.position.set(0, 0.55, 0);
    pelvisGrp.add(torsoGrp);

    const waistCore = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, 1.60, 12), matDark);
    waistCore.position.set(0, 0.75, -0.05); torsoGrp.add(waistCore);
    for (const hx of [-0.95, -0.58, 0.58, 0.95]) {
      const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.60, 8), matJoint);
      hose.position.set(hx, 0.75, 0.86); hose.rotation.z = hx * 0.16; torsoGrp.add(hose);
    }

    const chestMain = new THREE.Mesh(new THREE.BoxGeometry(4.35, 2.58, 2.88), matCamo);
    chestMain.position.set(0, 2.65, 0.12); torsoGrp.add(chestMain);
    const chestSlope = new THREE.Mesh(new THREE.BoxGeometry(3.65, 1.38, 0.78), matCamo);
    chestSlope.position.set(0, 3.12, 1.54); chestSlope.rotation.x = -0.26; torsoGrp.add(chestSlope);
    const chestLower = new THREE.Mesh(new THREE.BoxGeometry(3.25, 1.06, 0.58), matCamo);
    chestLower.position.set(0, 2.04, 1.54); chestLower.rotation.x = 0.24; torsoGrp.add(chestLower);
    const backPack = new THREE.Mesh(new THREE.BoxGeometry(3.45, 2.85, 1.68), matDark);
    backPack.position.set(0, 2.75, -1.68); torsoGrp.add(backPack);

    // Twin Rear Comms Antennas
    for (const [ax, ah] of [[-1.18, 2.95], [-0.84, 2.15]]) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.065, ah, 6), matJoint);
      ant.position.set(ax, 4.1 + ah * 0.5, -1.12); torsoGrp.add(ant);
    }

    // 3. HEAD WITH ICONIC FLARED GERMAN STAHLHELM + GLOWING AMBER VISOR!
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 4.35, 0.35);
    torsoGrp.add(headGrp);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.86, 0.78, 10), matDark);
    neck.position.set(0, -0.1, 0); headGrp.add(neck);
    for (const sx of [-1, 1]) {
      const nHose = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.08, 8), matJoint);
      nHose.position.set(sx * 0.78, -0.05, 0.38); nHose.rotation.z = sx * 0.38; nHose.rotation.x = -0.25; headGrp.add(nHose);
    }
    const face = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.16, 1.26), matCamo);
    face.position.set(0, 0.42, 0.16); headGrp.add(face);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.64, 0.44), matDark);
    jaw.position.set(0, 0.14, 0.78); headGrp.add(jaw);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.23, 0.25), matVisor);
    visor.position.set(0, 0.66, 0.74); headGrp.add(visor);

    // Flared Stahlhelm Dome + Skirt + Front Brim + Side Vent Studs
    const helmDome = new THREE.Mesh(new THREE.SphereGeometry(1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), matCamo);
    helmDome.position.set(0, 0.82, 0.0); headGrp.add(helmDome);
    const helmSkirt = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.42, 0.58, 16, 1, true), matCamo);
    helmSkirt.position.set(0, 0.62, -0.06); headGrp.add(helmSkirt);
    const helmBrim = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.15, 0.56), matCamo);
    helmBrim.position.set(0, 0.82, 0.82); helmBrim.rotation.x = 0.20; headGrp.add(helmBrim);

    // 4. TWIN ARTICULATED 6-TUBE (2x3) SHOULDER ROCKET PODS WITH MUZZLE FLASHES!
    const podTips = [];
    const podPivots = [];
    const podFlashes = [];
    for (const sx of [-1, 1]) {
      const pod = new THREE.Group();
      pod.position.set(sx * 2.48, 4.82, -0.14);
      pod.rotation.y = sx * -0.05;
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.94, 1.40, 2.28), matCamo);
      pod.add(box);
      const faceBezel = new THREE.Mesh(new THREE.BoxGeometry(1.74, 1.20, 0.16), matDark);
      faceBezel.position.set(0, 0, 1.13); pod.add(faceBezel);
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 10), matTubeIn);
          tube.rotation.x = Math.PI / 2;
          tube.position.set(-0.50 + c * 0.50, -0.25 + r * 0.50, 1.15);
          pod.add(tube);
        }
      }
      const pFlash = new THREE.Mesh(new THREE.SphereGeometry(0.95, 8, 6), matFlash);
      pFlash.position.set(0, 0, 1.65); pFlash.visible = false; pod.add(pFlash);
      podFlashes.push(pFlash);
      const podMuzzle = new THREE.Object3D();
      podMuzzle.position.set(0, 0, 1.55);
      pod.add(podMuzzle);
      podTips.push(podMuzzle);
      podPivots.push(pod);
      torsoGrp.add(pod);
    }

    // 5. MULTI-JOINTED ARMS (Shoulder Pivot + Pauldron + Winged Sword + Elbow Pivot + Striped Forearm + Fist!)
    const arms = [];
    for (const sx of [-1, 1]) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(sx * 2.98, 3.15, 0.05);
      torsoGrp.add(shoulderPivot);

      const paul = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.98, 2.38), matCamo);
      paul.position.set(sx * 0.28, 0.12, 0); paul.rotation.z = sx * -0.16; shoulderPivot.add(paul);
      const paulStripe = new THREE.Mesh(new THREE.BoxGeometry(1.93, 0.24, 2.43), matStripe);
      paulStripe.position.set(sx * 0.28, -0.28, 0); paulStripe.rotation.z = sx * -0.16; shoulderPivot.add(paulStripe);
      const embPl = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 1.48), matEmblem);
      embPl.position.set(sx * 1.26, 0.20, 0);
      embPl.rotation.y = sx * (Math.PI / 2);
      embPl.rotation.x = sx * 0.16;
      shoulderPivot.add(embPl);

      const uArm = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.75, 1.16), matJoint);
      uArm.position.set(sx * 0.36, -1.45, 0); shoulderPivot.add(uArm);

      // Articulated Elbow Joint!
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(sx * 0.38, -2.25, 0);
      shoulderPivot.add(elbowPivot);

      const elbowDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.12, 10), matDark);
      elbowDrum.rotation.z = Math.PI / 2; elbowPivot.add(elbowDrum);
      const fArm = new THREE.Mesh(new THREE.BoxGeometry(1.40, 2.15, 1.48), matCamo);
      fArm.position.set(0, -1.02, 0.16); fArm.rotation.x = -0.14; elbowPivot.add(fArm);
      const fStripe = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.26, 1.52), matStripe);
      fStripe.position.set(0, -1.12, 0.18); fStripe.rotation.x = -0.14; elbowPivot.add(fStripe);
      const fist = new THREE.Mesh(new THREE.BoxGeometry(1.20, 1.12, 1.26), matDark);
      fist.position.set(0, -2.35, 0.36); elbowPivot.add(fist);

      arms.push({ shoulder: shoulderPivot, elbow: elbowPivot });
    }

    // 6. MULTI-JOINTED COLOSSAL LEGS (Hip -> Striped Thigh -> Articulated Knee -> Armored Shin -> Articulated Ankle + Claws!)
    const legs = [];
    for (const sx of [-1, 1]) {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(sx * 1.42, -0.40, 0);
      pelvisGrp.add(hipPivot);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(1.58, 2.60, 1.88), matCamo);
      thigh.position.set(0, -1.18, 0.08); hipPivot.add(thigh);
      const tStripe = new THREE.Mesh(new THREE.BoxGeometry(1.63, 0.26, 1.93), matStripe);
      tStripe.position.set(0, -1.28, 0.08); hipPivot.add(tStripe);

      // Articulated Knee Pivot!
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -2.55, 0);
      hipPivot.add(kneePivot);

      const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(1.38, 1.18, 1.12), matCamo);
      kneeGuard.position.set(0, 0.05, 0.72); kneePivot.add(kneeGuard);
      const kneeDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 1.78, 12), matJoint);
      kneeDrum.rotation.z = Math.PI / 2; kneePivot.add(kneeDrum);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(1.76, 2.50, 2.08), matCamo);
      shin.position.set(0, -1.38, 0.02); kneePivot.add(shin);

      // Articulated Ankle Pivot so giant foot plants flat on the ground!
      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -2.42, 0.25);
      kneePivot.add(anklePivot);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.84, 3.15), matDark);
      foot.position.set(0, 0.0, 0.22); anklePivot.add(foot);
      for (const tx of [-0.56, 0.56]) {
        const toe = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.64, 1.18), matCamo);
        toe.position.set(tx, -0.06, 1.65); anklePivot.add(toe);
      }
      legs.push({ hip: hipPivot, knee: kneePivot, ankle: anklePivot });
    }

    rig.scale.setScalar(5.2); // ~68 METERS EXTREMELY TALL COLOSSUS!
    this.scene.add(root);
    return { root, rig, pelvisGrp, torsoGrp, headGrp, arms, legs, podTips, podPivots, podFlashes, isActive, flashTimer: 0 };
  }

  _buildAllMechas() {
    // 1. Deactivated Monumental Statue #1 ("EINHEIT-01"): Northern Savanna Coastline Overlook
    const m1 = this._buildSingleMecha(false);
    m1.id = "einheit_01";
    m1.gx = -63200; m1.gz = 51600; m1.yaw = 0.52;
    m1.pelvisGrp.rotation.z = 0.08; m1.torsoGrp.rotation.x = 0.14; m1.headGrp.rotation.x = 0.24;
    m1.arms[0].shoulder.rotation.x = 0.18; m1.arms[0].elbow.rotation.x = -0.35;
    m1.arms[1].shoulder.rotation.x = -0.08; m1.arms[1].elbow.rotation.x = -0.22;
    m1.legs[0].hip.rotation.x = -0.10; m1.legs[0].knee.rotation.x = 0.18;
    this.mechas.push(m1);

    // 2. Deactivated Monumental Statue #2 ("EINHEIT-02"): Western Savanna Ridge
    const m2 = this._buildSingleMecha(false);
    m2.id = "einheit_02";
    m2.gx = -77200; m2.gz = 64800; m2.yaw = -1.15;
    m2.pelvisGrp.rotation.z = -0.06; m2.torsoGrp.rotation.x = 0.10; m2.headGrp.rotation.y = 0.28;
    m2.arms[0].shoulder.rotation.x = -0.15; m2.arms[0].elbow.rotation.x = -0.40;
    m2.arms[1].shoulder.rotation.x = 0.20; m2.arms[1].elbow.rotation.x = -0.25;
    this.mechas.push(m2);

    // 3. ACTIVE COASTAL PATROL COLOSSUS ("EINHEIT-03"): Roams Zolotoy Savanna's entire coastline!
    const m3 = this._buildSingleMecha(true);
    m3.id = "einheit_03";
    m3.isPatrol = true;
    m3.gx = -56200; m3.gz = 64200; m3.yaw = 0;
    m3.patrolWaypoints = [
      [-55200, 62200], [-56200, 54800], [-64500, 50400],
      [-75400, 52200], [-80800, 60800], [-75200, 69400],
      [-64500, 71600], [-56800, 69200]
    ];
    m3.torsoYaw = 0;
    m3.podPitch = 0;
    this.mechas.push(m3);
  }

  _fireRocketVolley(mecha, targetX, targetY, targetZ, audio, particles) {
    mecha.root.updateMatrixWorld(true);
    mecha.flashTimer = 0.35;
    const tipW = new THREE.Vector3();
    for (let i = 0; i < 6; i++) {
      const pod = mecha.podTips[i % 2];
      pod.getWorldPosition(tipW);
      const sx = tipW.x + this.world.originX;
      const sy = tipW.y;
      const sz = tipW.z + this.world.originZ;
      const spreadX = (Math.random() - 0.5) * 32;
      const spreadZ = (Math.random() - 0.5) * 32;
      const dx = (targetX + spreadX) - sx;
      const dy = (targetY + 4.0) - sy;
      const dz = (targetZ + spreadZ) - sz;
      const dist = Math.max(12, Math.hypot(dx, dy, dz));
      const spd = 230 + Math.random() * 45;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.72, 6.0, 6),
        new THREE.MeshBasicMaterial({ color: 0xffa61a })
      );
      mesh.rotation.x = Math.PI / 2;
      const grp = new THREE.Group();
      grp.add(mesh);
      this.scene.add(grp);
      this.rockets.push({
        grp, gx: sx, gy: sy, gz: sz,
        vx: (dx / dist) * spd, vy: (dy / dist) * spd + 18, vz: (dz / dist) * spd,
        life: Math.min(8.5, dist / spd + 0.6)
      });
      if (particles) {
        particles.emitCrashBurst(sx, sy, sz, 1.8, "rock", "clear");
      }
    }
    if (audio && audio.playTank125mmBlast) audio.playTank125mmBlast(155);
  }

  update(dt, playerGx, playerGz, oceanCryptids, particles, audio) {
    this.cameraShakeOut = 0;
    if (this._salvoCd > 0) this._salvoCd = Math.max(0, this._salvoCd - dt);
    this._headScanT += dt;

    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    for (let i = 0; i < this.mechas.length; i++) {
      const m = this.mechas[i];
      if (m.isPatrol) {
        // Deterministic wall-clock synced coastal patrol (100% synced in Multiplayer!)
        const wps = m.patrolWaypoints;
        const speedMs = 13.5; // Heavy giant stride (~48 km/h across huge 16km island!)
        let totalLen = 0;
        const segLens = [];
        for (let k = 0; k < wps.length; k++) {
          const a = wps[k], b = wps[(k + 1) % wps.length];
          const sl = Math.hypot(b[0] - a[0], b[1] - a[1]);
          segLens.push(sl); totalLen += sl;
        }
        const cycleSec = totalLen / speedMs;
        const nowSec = (Date.now() * 0.001) % cycleSec;
        let walkDist = nowSec * speedMs;
        let segIdx = 0;
        while (segIdx < segLens.length - 1 && walkDist > segLens[segIdx]) {
          walkDist -= segLens[segIdx];
          segIdx++;
        }
        const wpA = wps[segIdx], wpB = wps[(segIdx + 1) % wps.length];
        const frac = segLens[segIdx] > 1 ? (walkDist / segLens[segIdx]) : 0;
        m.gx = wpA[0] + (wpB[0] - wpA[0]) * frac;
        m.gz = wpA[1] + (wpB[1] - wpA[1]) * frac;
        const targetYaw = Math.atan2(wpB[0] - wpA[0], wpB[1] - wpA[1]);
        let dyaw = targetYaw - m.yaw;
        while (dyaw > Math.PI) dyaw -= Math.PI * 2;
        while (dyaw < -Math.PI) dyaw += Math.PI * 2;
        m.yaw += dyaw * Math.min(1, dt * 2.2);

        // DETAILED MULTI-JOINT HEAVY MECHANICAL WALK ANIMATION!
        this._stepPhase += dt * 1.15; // Slow, titanic, weighty stride cadence
        const ph = this._stepPhase;
        const sL = Math.sin(ph);
        const sR = Math.sin(ph + Math.PI);
        const liftL = Math.max(0, Math.cos(ph));
        const liftR = Math.max(0, Math.cos(ph + Math.PI));

        // 1. Hip swing, knee flexion on lifted swing-phase & counter-angled flat foot plant!
        m.legs[0].hip.rotation.x   = -sL * 0.42 - liftL * 0.14;
        m.legs[0].knee.rotation.x  =  liftL * 0.68 + 0.08;
        m.legs[0].ankle.rotation.x = -(m.legs[0].hip.rotation.x + m.legs[0].knee.rotation.x) * 0.82;

        m.legs[1].hip.rotation.x   = -sR * 0.42 - liftR * 0.14;
        m.legs[1].knee.rotation.x  =  liftR * 0.68 + 0.08;
        m.legs[1].ankle.rotation.x = -(m.legs[1].hip.rotation.x + m.legs[1].knee.rotation.x) * 0.82;

        // 2. Weight-shift hip roll, vertical stomp compression & counter-swinging hydraulic arms!
        m.pelvisGrp.position.y = 5.65 + Math.abs(Math.sin(ph)) * 0.36 - 0.14;
        m.pelvisGrp.rotation.z = sL * 0.075;
        m.torsoGrp.rotation.x  = 0.06 + Math.abs(Math.cos(ph)) * 0.045;
        m.torsoGrp.rotation.z  = -sL * 0.045;

        m.arms[0].shoulder.rotation.x =  sL * 0.32;
        m.arms[0].elbow.rotation.x    = -0.34 - Math.max(0, -sL) * 0.28;
        m.arms[1].shoulder.rotation.x =  sR * 0.32;
        m.arms[1].elbow.rotation.x    = -0.34 - Math.max(0, -sR) * 0.28;

        // 3. Heavy Ground-Shaking Footfall Impact, Dust Plume & Booming Stomp Audio!
        const halfIdx = Math.floor((ph + Math.PI * 0.5) / Math.PI);
        if (halfIdx !== this._lastStepHalf) {
          this._lastStepHalf = halfIdx;
          const dP = Math.hypot(m.gx - playerGx, m.gz - playerGz);
          if (dP < 650) {
            const prox = Math.max(0, 1.0 - dP / 650);
            this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.55);
            if (audio && audio.playMechaFootstep) audio.playMechaFootstep(prox);
            else if (audio && audio.playImpact) audio.playImpact(0.45 + prox * 0.55);
          }
          if (particles && dP < 1800) {
            const side = (halfIdx % 2 === 0) ? -1 : 1;
            const tiF = this.world.getTerrainInfo(m.gx, m.gz, false);
            const fx = m.gx + Math.cos(m.yaw) * side * 7.5;
            const fz = m.gz - Math.sin(m.yaw) * side * 7.5;
            particles.emitCrashBurst(fx, Math.max(seaL + 0.6, tiF.height + 0.5), fz, 2.4, "rock", "clear");
          }
        }

        // 4. COASTAL DEFENSE: Scan ocean, swivel torso & head, elevate rocket pods, & repel Megalodon/Kraken!
        let threat = null;
        if (oceanCryptids) {
          const mg = oceanCryptids.megalodon;
          const kr = oceanCryptids.kraken;
          if (mg && mg.state !== "dormant" && mg.state !== "retreating") {
            const dM = Math.hypot(mg.gx - m.gx, mg.gz - m.gz);
            if (dM < 2800) threat = { kind: "megalodon", obj: mg, gx: mg.gx, gy: seaL + 2, gz: mg.gz, dist: dM };
          }
          if (!threat && kr && kr.state !== "dormant" && kr.state !== "flee") {
            const dK = Math.hypot(kr.gx - m.gx, kr.gz - m.gz);
            if (dK < 2800) threat = { kind: "kraken", obj: kr, gx: kr.gx, gy: seaL + 4, gz: kr.gz, dist: dK };
          }
        }
        if (threat) {
          const worldBear = Math.atan2(threat.gx - m.gx, threat.gz - m.gz);
          let relBear = worldBear - m.yaw;
          while (relBear > Math.PI) relBear -= Math.PI * 2;
          while (relBear < -Math.PI) relBear += Math.PI * 2;
          m.torsoYaw += (relBear - m.torsoYaw) * Math.min(1, dt * 3.0);
          m.torsoGrp.rotation.y = m.torsoYaw;
          m.headGrp.rotation.y *= Math.exp(-dt * 4.0);
          m.podPitch += (-0.18 - m.podPitch) * Math.min(1, dt * 4.0);
          if (this._salvoCd <= 0) {
            this._salvoCd = 4.2;
            const dPlayer = Math.hypot(m.gx - playerGx, m.gz - playerGz);
            this._fireRocketVolley(m, threat.gx, threat.gy, threat.gz, dPlayer < 2200 ? audio : null, particles);
            threat.obj.hp = (threat.obj.hp || 120) - 85;
            if (threat.obj.hp <= 0) {
              if (threat.kind === "megalodon") {
                threat.obj.state = "retreating"; threat.obj.fleeTimer = 14.0; threat.obj.hp = 120;
              } else {
                threat.obj.state = "flee"; threat.obj.fleeTimer = 14.0; threat.obj.hp = 165;
              }
            }
          }
        } else {
          // Natural torso counter-twist + scanning Stahlhelm head!
          const idleTorso = -sL * 0.09;
          m.torsoYaw += (idleTorso - m.torsoYaw) * Math.min(1, dt * 3.0);
          m.torsoGrp.rotation.y = m.torsoYaw;
          m.headGrp.rotation.y = Math.sin(this._headScanT * 0.45) * 0.34;
          m.podPitch += (0.0 - m.podPitch) * Math.min(1, dt * 3.0);
        }
        for (const pp of m.podPivots) pp.rotation.x = m.podPitch;
        if (m.flashTimer > 0) m.flashTimer = Math.max(0, m.flashTimer - dt);
        for (const pf of m.podFlashes) pf.visible = m.flashTimer > 0;
      }

      // Colossal skyline visibility up to 8.5 km away!
      const dVis = Math.hypot(m.gx - playerGx, m.gz - playerGz);
      m.root.visible = dVis < 8500;
      if (m.root.visible) {
        const ti = this.world.getTerrainInfo(m.gx, m.gz, false);
        const groundY = Math.max(seaL + 0.5, ti.height);
        this.world.toLocal(m.gx, groundY, m.gz, m.root.position);
        m.root.rotation.y = m.yaw;
      }
    }

    // Update flying Mecha coastal-defense rockets!
    for (let r = this.rockets.length - 1; r >= 0; r--) {
      const rk = this.rockets[r];
      rk.life -= dt;
      rk.vy -= 9.5 * dt;
      rk.gx += rk.vx * dt; rk.gy += rk.vy * dt; rk.gz += rk.vz * dt;
      this.world.toLocal(rk.gx, rk.gy, rk.gz, rk.grp.position);
      rk.grp.lookAt(rk.grp.position.x + rk.vx, rk.grp.position.y + rk.vy, rk.grp.position.z + rk.vz);
      if (particles && Math.random() < 0.72) {
        particles.emitRGB(rk.gx, rk.gy, rk.gz, (Math.random() - 0.5) * 3.5, 2.5, (Math.random() - 0.5) * 3.5, 1.0, 0.72, 0.25, 0.50, 0.5, 2.2);
      }
      if (rk.life <= 0 || rk.gy <= seaL) {
        if (particles) particles.emitCrashBurst(rk.gx, Math.max(seaL + 1.0, rk.gy), rk.gz, 3.2, "water", "clear");
        this.scene.remove(rk.grp);
        this.rockets.splice(r, 1);
      }
    }
  }
};
