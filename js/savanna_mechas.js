// ============================================================================
// KRASNO-KAMENKA OBLAST v18.1.3 — MUSEUM-GRADE ZOLOTOY SAVANNA STAHLHELM MECHAS
// 3 Colossal (~68m) Heavy Armored Mechas (2 Dormant Statues + 1 Active Patrol!)
//   • Watertight Sculpted Solid M35/M42 Stahlhelm (100% solid from every angle,
//    unobstructed glowing curved amber visor, sculpted respirator faceplate!)
//   • Museum-Grade Industrial Detailing: 512px panel-lined splinter camo, riveted
//     bevels, recessed rocket warheads, 8 ribbed waist hoses, buckled pouches,
//     concentric elbow/knee/ankle gear drums, articulated fingers & calf pistons!
//   • Proximity Mechanical Audio: reactor hum, stride-coupled hydraulic servo
//     whirring, gear whine, pneumatic footfall hiss & dormant steel groans!
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
    this._helmSteelTex = this._makeHelmSteelTex();
    this._emblemTex = this._makeWingedSwordEmblemTex();
    this._podStencilTex = this._makePodStencilTex();
    this._stahlhelmGeo = this._buildSolidStahlhelmGeo();
    this._buildAllMechas();
  }

  // High-Res 512x512 Procedural Charcoal Splinter Camo + Armor Panel Seams, Rivets & Edge Weathering!
  _makeSplinterCamoTex() {
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 512;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "#292e31";
    ctx.fillRect(0, 0, 512, 512);
    const cols = ["#191d20", "#3a4146", "#22272a", "#4a5258", "#15181b", "#31373b"];
    let s = 14041;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

    // Angular splinter camo polygons
    for (let i = 0; i < 68; i++) {
      ctx.fillStyle = cols[i % cols.length];
      const cx = rnd() * 512, cy = rnd() * 512;
      const r = 34 + rnd() * 88;
      ctx.beginPath();
      const n = 4 + Math.floor(rnd() * 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + rnd() * 0.55;
        const rr = r * (0.52 + rnd() * 0.62);
        const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Industrial armor plate seams (dark recessed grooves + subtle worn steel highlight edge)
    ctx.lineWidth = 2.4;
    for (const p of [0, 128, 256, 384]) {
      ctx.strokeStyle = "rgba(8, 10, 12, 0.52)";
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(512, p); ctx.stroke();
      ctx.strokeStyle = "rgba(210, 222, 230, 0.11)";
      ctx.beginPath(); ctx.moveTo(p + 2.2, 0); ctx.lineTo(p + 2.2, 512); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p + 2.2); ctx.lineTo(512, p + 2.2); ctx.stroke();
    }

    // Corner armor rivets along every plate seam
    for (let gx = 0; gx < 512; gx += 128) {
      for (let gy = 0; gy < 512; gy += 128) {
        for (const [ox, oy] of [[12, 12], [116, 12], [12, 116], [116, 116], [64, 12], [64, 116]]) {
          ctx.fillStyle = "rgba(10, 12, 14, 0.72)";
          ctx.beginPath(); ctx.arc(gx + ox, gy + oy, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "rgba(215, 225, 232, 0.28)";
          ctx.beginPath(); ctx.arc(gx + ox - 0.8, gy + oy - 0.8, 1.4, 0, Math.PI * 2); ctx.fill();
        }
      }
    }

    // Fine metallic battle scuffs & edge scratches
    for (let i = 0; i < 85; i++) {
      ctx.strokeStyle = i % 3 === 0 ? "rgba(225, 235, 240, 0.14)" : "rgba(12, 14, 16, 0.30)";
      ctx.lineWidth = 0.8 + rnd() * 1.4;
      const x = rnd() * 512, y = rnd() * 512;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 58, y + (rnd() - 0.5) * 58); ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Dark Forged Gunmetal Steel Micro-Texture for the M35/M42 Stahlhelm (matches reference!)
  _makeHelmSteelTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    const grd = ctx.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, "#3b4246");
    grd.addColorStop(0.55, "#2b3135");
    grd.addColorStop(1, "#1e2326");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);
    let s = 9187;
    const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(210,220,225,0.045)" : "rgba(10,12,14,0.08)";
      ctx.fillRect(rnd() * 256, rnd() * 256, 4 + rnd() * 24, 1 + rnd() * 4);
    }
    for (let i = 0; i < 36; i++) {
      ctx.strokeStyle = "rgba(220, 232, 238, 0.13)";
      ctx.lineWidth = 1.0;
      const x = rnd() * 256, y = rnd() * 256;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 28, y + (rnd() - 0.5) * 28); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  _makePodStencilTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 128;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 128);
    ctx.fillStyle = "rgba(226, 232, 238, 0.78)";
    ctx.fillRect(14, 18, 228, 7);
    ctx.fillStyle = "rgba(255, 176, 32, 0.85)";
    for (let x = 14; x < 236; x += 26) ctx.fillRect(x, 96, 14, 12);
    ctx.fillStyle = "rgba(226, 232, 238, 0.82)";
    ctx.font = "900 22px monospace";
    ctx.fillText("WK-140 SALVO", 22, 68);
    return new THREE.CanvasTexture(cv);
  }

  _makeWingedSwordEmblemTex() {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);
    ctx.fillStyle = "#e4eaef";
    // Central downward blade + crossguard pommel
    ctx.beginPath();
    ctx.moveTo(128, 30); ctx.lineTo(140, 62); ctx.lineTo(136, 198);
    ctx.lineTo(148, 194); ctx.lineTo(128, 236); ctx.lineTo(108, 194);
    ctx.lineTo(120, 198); ctx.lineTo(116, 62);
    ctx.closePath(); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(128, 108);
      ctx.scale(sx, 1);
      for (let f = 0; f < 5; f++) {
        ctx.beginPath();
        const y0 = -29 + f * 13;
        const len = 98 - f * 12;
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

  // ==========================================================================
  // WATERTIGHT SCULPTED SOLID M35/M42 GERMAN STAHLHELM GEOMETRY!
  //   • Outer forged steel shell + rolled bottom rim + inner liner wall!
  //   • High overhanging front brow peak (y=0.85, z=+1.26) cleanly ABOVE the
  //     glowing amber visor (y=0.52..0.72, z=+0.96) — ZERO shroud occlusion!
  //   • Iconic swept-down flared ear & neck guard skirt (y=0.36, r=1.44..1.52)
  //   • Watertight double-walled solid -> NEVER invisible from ANY angle!
  // ==========================================================================
  _buildSolidStahlhelmGeo() {
    const segU = 40; // Angular segments around helmet
    const segCrown = 7; // Smooth top crown dome rings
    const segSkirt = 6; // Flared apron/brow skirt rings
    const wallT = 0.095; // Solid steel wall thickness

    const rimProfile = (theta) => {
      const at = Math.abs(theta);
      const tDip = Math.max(0, Math.min(1, (at - 0.70) / (1.22 - 0.70)));
      const sDip = tDip * tDip * (3 - 2 * tDip);
      const yRim = 0.85 * (1 - sDip) + 0.35 * sDip;
      let rRim = 1.27 * (1 - sDip) + 1.44 * sDip;
      const tBack = Math.max(0, Math.min(1, (at - 2.25) / 0.89));
      rRim += 0.09 * tBack * tBack;
      return { yRim, rRim };
    };

    // Build profile rings (each ring has segU+1 vertices around theta in [-PI, +PI])
    // 0 = outer apex -> crown -> outer skirt -> bottom outer rim -> bottom inner rim -> inner skirt -> inner apex
    const rings = [];
    const crownBaseY = 1.04;
    const crownR = 1.06;
    const crownH = 0.90;

    // 1. Outer crown dome (from apex to crownBaseY)
    for (let j = 0; j <= segCrown; j++) {
      const frac = j / segCrown;
      const phi = frac * (Math.PI * 0.5);
      const rBase = Math.max(0.008, Math.sin(phi) * crownR);
      const y = crownBaseY + Math.cos(phi) * crownH;
      const ring = [];
      for (let i = 0; i <= segU; i++) {
        const th = -Math.PI + (i / segU) * Math.PI * 2;
        // Subtle oblong front-to-back helmet skull proportion (slightly longer Z than X)
        const r = rBase * (1.0 + 0.045 * Math.cos(th * 2));
        ring.push([r * Math.sin(th), y, r * Math.cos(th)]);
      }
      rings.push(ring);
    }

    // 2. Outer flared brow & side/rear neck skirt (from crownBaseY down to yRim)
    for (let j = 1; j <= segSkirt; j++) {
      const t = j / segSkirt;
      const flare = t * t * (2.2 - 1.2 * t); // Authentic gentle concave outward Stahlhelm flare!
      const ring = [];
      for (let i = 0; i <= segU; i++) {
        const th = -Math.PI + (i / segU) * Math.PI * 2;
        const { yRim, rRim } = rimProfile(th);
        const rStart = crownR * (1.0 + 0.045 * Math.cos(th * 2));
        const r = rStart + (rRim - rStart) * flare;
        const y = crownBaseY + (yRim - crownBaseY) * t;
        ring.push([r * Math.sin(th), y, r * Math.cos(th)]);
      }
      rings.push(ring);
    }

    // 3. Rolled solid bottom rim lip (rounded underside lip so edge looks thick & forged)
    {
      const lipRing = [];
      for (let i = 0; i <= segU; i++) {
        const th = -Math.PI + (i / segU) * Math.PI * 2;
        const { yRim, rRim } = rimProfile(th);
        const r = rRim - wallT * 0.5;
        const y = yRim - 0.032;
        lipRing.push([r * Math.sin(th), y, r * Math.cos(th)]);
      }
      rings.push(lipRing);
    }

    // 4. Inner skirt rising back up inside the helmet (watertight solid interior!)
    for (let j = segSkirt; j >= 0; j--) {
      const t = j / segSkirt;
      const flare = t * t * (2.2 - 1.2 * t);
      const ring = [];
      for (let i = 0; i <= segU; i++) {
        const th = -Math.PI + (i / segU) * Math.PI * 2;
        const { yRim, rRim } = rimProfile(th);
        const rStart = crownR * (1.0 + 0.045 * Math.cos(th * 2));
        const rOut = rStart + (rRim - rStart) * flare;
        const r = Math.max(0.05, rOut - wallT);
        const y = crownBaseY + (yRim - crownBaseY) * t + (j === 0 ? 0.0 : 0.01);
        ring.push([r * Math.sin(th), y, r * Math.cos(th)]);
      }
      rings.push(ring);
    }

    // 5. Inner crown dome closing cleanly at inner apex
    for (let j = segCrown - 1; j >= 0; j--) {
      const frac = j / segCrown;
      const phi = frac * (Math.PI * 0.5);
      const rBase = Math.max(0.008, Math.sin(phi) * (crownR - wallT));
      const y = crownBaseY + Math.cos(phi) * (crownH - wallT);
      const ring = [];
      for (let i = 0; i <= segU; i++) {
        const th = -Math.PI + (i / segU) * Math.PI * 2;
        const r = rBase * (1.0 + 0.045 * Math.cos(th * 2));
        ring.push([r * Math.sin(th), y, r * Math.cos(th)]);
      }
      rings.push(ring);
    }

    const positions = [];
    const uvs = [];
    const indices = [];
    const cols = segU + 1;
    const totalRings = rings.length;
    for (let r = 0; r < totalRings; r++) {
      const vCoord = r / (totalRings - 1);
      for (let c = 0; c < cols; c++) {
        const pt = rings[r][c];
        positions.push(pt[0], pt[1], pt[2]);
        uvs.push(c / segU, vCoord);
      }
    }
    for (let r = 0; r < totalRings - 1; r++) {
      for (let c = 0; c < segU; c++) {
        const a = r * cols + c;
        const b = (r + 1) * cols + c;
        const d = (r + 1) * cols + (c + 1);
        const e = r * cols + (c + 1);
        indices.push(a, e, b, b, e, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  _buildSingleMecha(isActive) {
    const root = new THREE.Group();
    const matCamo = new THREE.MeshStandardMaterial({
      map: this._camoTex, color: isActive ? 0xdde4e8 : 0x9aa2a8,
      roughness: isActive ? 0.66 : 0.88, metalness: 0.38
    });
    // Museum-grade solid dark forged gunmetal steel for the Stahlhelm (DoubleSide safety!)
    const matHelmSteel = new THREE.MeshStandardMaterial({
      map: this._helmSteelTex, color: isActive ? 0xd4dde2 : 0x929aa0,
      roughness: isActive ? 0.40 : 0.72, metalness: isActive ? 0.64 : 0.44,
      side: THREE.DoubleSide
    });
    const matFaceArmor = new THREE.MeshStandardMaterial({
      map: this._helmSteelTex, color: isActive ? 0xb8c2c8 : 0x80888e,
      roughness: 0.52, metalness: 0.58
    });
    const matDark = new THREE.MeshStandardMaterial({ color: 0x171a1e, roughness: 0.74, metalness: 0.56 });
    const matJoint = new THREE.MeshStandardMaterial({ color: 0x2c333a, roughness: 0.52, metalness: 0.76 });
    const matBolt = new THREE.MeshStandardMaterial({ color: 0x626c74, roughness: 0.36, metalness: 0.85 });
    const matPiston = new THREE.MeshStandardMaterial({ color: 0x9aa6b0, roughness: 0.24, metalness: 0.92 });
    const matStripe = new THREE.MeshStandardMaterial({ color: isActive ? 0xd9e0e6 : 0x8e969c, roughness: 0.62, metalness: 0.16 });
    const matEmblem = new THREE.MeshBasicMaterial({ map: this._emblemTex, transparent: true, opacity: isActive ? 0.96 : 0.56, side: THREE.DoubleSide });
    const matStencil = new THREE.MeshBasicMaterial({ map: this._podStencilTex, transparent: true, opacity: isActive ? 0.88 : 0.45, side: THREE.DoubleSide });
    const matVisor = isActive
      ? new THREE.MeshBasicMaterial({ color: 0xffa61a })
      : new THREE.MeshStandardMaterial({ color: 0x161412, roughness: 0.42, metalness: 0.65 });
    const matVisorHot = isActive
      ? new THREE.MeshBasicMaterial({ color: 0xffe478 })
      : new THREE.MeshStandardMaterial({ color: 0x1b1917, roughness: 0.45, metalness: 0.6 });
    const matReactor = isActive
      ? new THREE.MeshBasicMaterial({ color: 0xff9214 })
      : new THREE.MeshStandardMaterial({ color: 0x151414, roughness: 0.6 });
    const matBeaconRed = new THREE.MeshBasicMaterial({ color: isActive ? 0xff2a3c : 0x2a1416 });
    const matTubeIn = new THREE.MeshBasicMaterial({ color: 0x07090b });
    const matWarhead = new THREE.MeshStandardMaterial({ color: 0x4b533b, roughness: 0.55, metalness: 0.45 });
    const matFlash = new THREE.MeshBasicMaterial({ color: 0xffbe3b, transparent: true, opacity: 0.92 });

    // Helper: Build a detailed concentric mechanical bearing/servo drum (used on shoulders, elbows, knees & ankles!)
    const makeJointDrum = (outerR, width, parent, px, py, pz) => {
      const g = new THREE.Group();
      g.position.set(px, py, pz);
      const outer = new THREE.Mesh(new THREE.CylinderGeometry(outerR, outerR, width, 16), matJoint);
      outer.rotation.z = Math.PI / 2; g.add(outer);
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(outerR * 0.84, outerR * 0.84, width + 0.14, 16), matDark);
      flange.rotation.z = Math.PI / 2; g.add(flange);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(outerR * 0.46, outerR * 0.46, width + 0.26, 12), matBolt);
      hub.rotation.z = Math.PI / 2; g.add(hub);
      // 6 perimeter bolt studs on both exposed circular faces!
      for (let bi = 0; bi < 6; bi++) {
        const ba = (bi / 6) * Math.PI * 2;
        const bRod = new THREE.Mesh(new THREE.CylinderGeometry(outerR * 0.08, outerR * 0.08, width + 0.20, 6), matBolt);
        bRod.rotation.z = Math.PI / 2;
        bRod.position.set(0, Math.sin(ba) * outerR * 0.66, Math.cos(ba) * outerR * 0.66);
        g.add(bRod);
      }
      parent.add(g);
      return g;
    };

    // Helper: Build a curved corrugated ribbed hydraulic hose!
    const addRibbedHose = (parent, p0, p1, p2, rad, ribs = 7) => {
      for (let k = 0; k <= ribs; k++) {
        const t = k / ribs;
        const it = 1 - t;
        const x = it * it * p0[0] + 2 * it * t * p1[0] + t * t * p2[0];
        const y = it * it * p0[1] + 2 * it * t * p1[1] + t * t * p2[1];
        const z = it * it * p0[2] + 2 * it * t * p1[2] + t * t * p2[2];
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.86, rad * 1.45, 8), k % 2 === 0 ? matDark : matJoint);
        ring.position.set(x, y, z);
        if (k < ribs) {
          const tn = (k + 1) / ribs, itn = 1 - tn;
          const nx = itn * itn * p0[0] + 2 * itn * tn * p1[0] + tn * tn * p2[0];
          const ny = itn * itn * p0[1] + 2 * itn * tn * p1[1] + tn * tn * p2[1];
          const nz = itn * itn * p0[2] + 2 * itn * tn * p1[2] + tn * tn * p2[2];
          ring.lookAt(nx, ny, nz);
          ring.rotateX(Math.PI / 2);
        }
        parent.add(ring);
      }
    };

    // Base rig is ~13.1 units tall -> scaled 5.2x = ~68 METERS EXTREMELY TALL SKYSCRAPER-SIZE MECHA!
    const rig = new THREE.Group();
    root.add(rig);

    // 1. PELVIS, HIP ARMOR & BUCKLED TACTICAL BELT POUCHES (y = 5.65)
    const pelvisGrp = new THREE.Group();
    pelvisGrp.position.set(0, 5.65, 0);
    rig.add(pelvisGrp);

    const pelvis = new THREE.Mesh(new THREE.BoxGeometry(3.52, 1.38, 2.30), matCamo);
    pelvisGrp.add(pelvis);
    const pelvisFrontBevel = new THREE.Mesh(new THREE.BoxGeometry(2.90, 0.96, 0.42), matCamo);
    pelvisFrontBevel.position.set(0, 0.08, 1.15); pelvisFrontBevel.rotation.x = 0.14; pelvisGrp.add(pelvisFrontBevel);
    const crotch = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.56, 2.48), matCamo);
    crotch.position.set(0, -0.46, 0.14); pelvisGrp.add(crotch);
    const crotchPlate = new THREE.Mesh(new THREE.BoxGeometry(1.12, 1.24, 0.35), matFaceArmor);
    crotchPlate.position.set(0, -0.52, 1.32); crotchPlate.rotation.x = -0.18; pelvisGrp.add(crotchPlate);

    // 6 Detailed Armored Belt Pouches with Top Flaps & Metallic Buckles (front & hips!)
    const pouchSpecs = [
      [-1.56, 0.34, 1.18, 0], [-0.94, 0.34, 1.24, 0], [0.94, 0.34, 1.24, 0], [1.56, 0.34, 1.18, 0],
      [-1.96, 0.34, 0.25, -Math.PI / 2], [1.96, 0.34, 0.25, Math.PI / 2]
    ];
    for (const [px, py, pz, ry] of pouchSpecs) {
      const pg = new THREE.Group();
      pg.position.set(px, py, pz); pg.rotation.y = ry;
      const bodyP = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.78, 0.56), matCamo);
      pg.add(bodyP);
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.24, 0.60), matDark);
      flap.position.set(0, 0.28, 0.03); pg.add(flap);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.08), matBolt);
      buckle.position.set(0, 0.14, 0.31); pg.add(buckle);
      pelvisGrp.add(pg);
    }

    // 2. ARTICULATED TORSO GROUP (turns toward ocean threats & pitches with heavy gait!)
    const torsoGrp = new THREE.Group();
    torsoGrp.position.set(0, 0.55, 0);
    pelvisGrp.add(torsoGrp);

    // Armored Waist Spine Core + 8 Ribbed Hydraulic Conduit Hoses (4 left, 4 right!)
    const waistCore = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.22, 1.66, 12), matDark);
    waistCore.position.set(0, 0.76, -0.05); torsoGrp.add(waistCore);
    for (const sx of [-1, 1]) {
      // Exposed bright steel hydraulic spine pistons on sides of waist
      const wPist = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.55, 8), matPiston);
      wPist.position.set(sx * 1.28, 0.78, -0.18); wPist.rotation.z = sx * -0.10; torsoGrp.add(wPist);
      // 4 curved ribbed hydraulic hoses per side wrapping the abdominal cavity
      addRibbedHose(torsoGrp, [sx * 0.52, 1.52, 0.92], [sx * 0.72, 0.78, 1.18], [sx * 0.42, 0.05, 0.94], 0.13, 7);
      addRibbedHose(torsoGrp, [sx * 0.88, 1.54, 0.72], [sx * 1.12, 0.78, 0.96], [sx * 0.78, 0.05, 0.74], 0.14, 7);
      addRibbedHose(torsoGrp, [sx * 1.18, 1.56, 0.32], [sx * 1.42, 0.78, 0.45], [sx * 1.12, 0.05, 0.34], 0.13, 6);
      addRibbedHose(torsoGrp, [sx * 0.95, 1.52, -0.78], [sx * 1.18, 0.78, -1.04], [sx * 0.86, 0.05, -0.82], 0.14, 6);
    }

    // Multi-Layered Heavy Armored Chest Cuirass with Beveled Glacis, Bolts & Tow Shackles
    const chestMain = new THREE.Mesh(new THREE.BoxGeometry(4.42, 2.62, 2.90), matCamo);
    chestMain.position.set(0, 2.66, 0.10); torsoGrp.add(chestMain);
    const chestSlope = new THREE.Mesh(new THREE.BoxGeometry(3.74, 1.42, 0.82), matCamo);
    chestSlope.position.set(0, 3.16, 1.56); chestSlope.rotation.x = -0.28; torsoGrp.add(chestSlope);
    const chestCenterPl = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.15, 0.32), matCamo);
    chestCenterPl.position.set(0, 2.66, 1.72); torsoGrp.add(chestCenterPl);
    const chestLower = new THREE.Mesh(new THREE.BoxGeometry(3.32, 1.08, 0.62), matCamo);
    chestLower.position.set(0, 2.02, 1.54); chestLower.rotation.x = 0.25; torsoGrp.add(chestLower);

    // Armored Collar Guard Ring + Twin Front Tow Shackles + Corner Rivets
    const collarRear = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.68, 0.56), matFaceArmor);
    collarRear.position.set(0, 4.16, -0.76); torsoGrp.add(collarRear);
    for (const sx of [-1, 1]) {
      const collarSide = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.62, 1.78), matFaceArmor);
      collarSide.position.set(sx * 1.38, 4.14, 0.12); collarSide.rotation.z = sx * -0.18; torsoGrp.add(collarSide);
      // Chest side rib reinforcement plates
      const ribPl = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.65, 1.85), matDark);
      ribPl.position.set(sx * 2.26, 2.38, 0.12); torsoGrp.add(ribPl);
      // Front chest tow rings & bolt studs
      const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 6, 10), matBolt);
      shackle.position.set(sx * 1.42, 3.32, 1.84); torsoGrp.add(shackle);
      for (const by of [2.15, 3.05]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 6), matBolt);
        bolt.rotation.x = Math.PI / 2; bolt.position.set(sx * 1.58, by, 1.84); torsoGrp.add(bolt);
      }
      // Armored chest cooling intake vents
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.22, 0.14), matDark);
      vent.position.set(sx * 1.05, 3.68, 1.48); vent.rotation.x = -0.35; torsoGrp.add(vent);
    }

    // Heavy Rear Reactor Backpack w/ Glowing Heat-Sink Slits, Louvers & 3 Staggered Comms Antennas!
    const backPack = new THREE.Mesh(new THREE.BoxGeometry(3.54, 2.95, 1.78), matDark);
    backPack.position.set(0, 2.78, -1.72); torsoGrp.add(backPack);
    const backCowl = new THREE.Mesh(new THREE.BoxGeometry(3.26, 1.15, 1.52), matCamo);
    backCowl.position.set(0, 3.88, -1.62); backCowl.rotation.x = 0.20; torsoGrp.add(backCowl);
    for (const sx of [-1, 1]) {
      const rCore = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 2.45, 12), matJoint);
      rCore.position.set(sx * 1.12, 2.62, -2.32); torsoGrp.add(rCore);
      const rSlit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.42, 0.14), matReactor);
      rSlit.position.set(sx * 1.12, 2.65, -2.98); torsoGrp.add(rSlit);
      // Angled cooling louver fins
      for (let ly = 0; ly < 4; ly++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.12, 0.28), matDark);
        fin.position.set(sx * 1.12, 1.98 + ly * 0.42, -2.92); fin.rotation.x = 0.35; torsoGrp.add(fin);
      }
    }
    // 3 Staggered Comms Antennas on Left-Back Shoulder + Blinking Red Aviation Strobe!
    let strobeMesh = null;
    for (const [ax, ah, az] of [[-1.24, 3.25, -1.16], [-0.94, 2.35, -1.24], [-1.46, 1.75, -1.04]]) {
      const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.34, 8), matBolt);
      coil.position.set(ax, 4.30, az); torsoGrp.add(coil);
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.058, ah, 6), matJoint);
      ant.position.set(ax, 4.42 + ah * 0.5, az); torsoGrp.add(ant);
      if (ah > 3.0) {
        strobeMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), matBeaconRed);
        strobeMesh.position.set(ax, 4.46 + ah, az); torsoGrp.add(strobeMesh);
      }
    }

    // 3. MUSEUM-GRADE HEAD: WATERTIGHT SOLID STAHLHELM + UNOBSTRUCTED GLOWING AMBER VISOR + RESPIRATOR FACEPLATE!
    const headGrp = new THREE.Group();
    headGrp.position.set(0, 4.35, 0.32);
    torsoGrp.add(headGrp);

    // Armored Neck Column + Twin Ribbed Neck Hoses curving from jaw into chest collar!
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.86, 0.88, 12), matDark);
    neck.position.set(0, -0.08, -0.02); headGrp.add(neck);
    for (const sx of [-1, 1]) {
      addRibbedHose(headGrp, [sx * 0.56, 0.24, 0.52], [sx * 0.86, -0.06, 0.48], [sx * 0.72, -0.58, 0.26], 0.165, 8);
      addRibbedHose(headGrp, [sx * 0.68, 0.30, 0.18], [sx * 0.96, -0.04, 0.14], [sx * 0.84, -0.56, 0.04], 0.135, 7);
    }

    // Inner Armored Cranium Core (sits cleanly inside Stahlhelm cavity)
    const headCore = new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.80, 1.15, 14), matDark);
    headCore.position.set(0, 0.56, 0.0); headGrp.add(headCore);

    // Sculpted Angular Gas-Mask / Respirator Faceplate (cleanly below the helmet front brow!)
    const faceUpper = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.44, 0.74), matFaceArmor);
    faceUpper.position.set(0, 0.62, 0.52); headGrp.add(faceUpper);
    // Dark recessed visor housing frame
    const visorHousing = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.32, 0.22), matDark);
    visorHousing.position.set(0, 0.62, 0.84); headGrp.add(visorHousing);
    // Curved Glowing Amber Visor (100% UNOBSTRUCTED, clearly below front brow peak y=0.85!)
    const visorCurve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 0.95, 0.20, 16, 1, false, -0.54, 1.08),
      matVisor
    );
    visorCurve.position.set(0, 0.62, 0.06); headGrp.add(visorCurve);
    // Hot inner bright-amber core band across visor center for cinematic glow depth
    const visorCore = new THREE.Mesh(
      new THREE.CylinderGeometry(0.965, 0.965, 0.085, 16, 1, false, -0.46, 0.92),
      matVisorHot
    );
    visorCore.position.set(0, 0.62, 0.06); headGrp.add(visorCore);

    // Lower Angular Respirator Mask: Central Nose Bridge + Angled Cheek Plates + Vent Slits + Chin Block!
    const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.34), matFaceArmor);
    noseBridge.position.set(0, 0.22, 0.86); noseBridge.rotation.x = 0.16; headGrp.add(noseBridge);
    const chinBlock = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.32, 0.42), matDark);
    chinBlock.position.set(0, -0.10, 0.72); headGrp.add(chinBlock);
    for (const sx of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.58, 0.46), matFaceArmor);
      cheek.position.set(sx * 0.34, 0.22, 0.72);
      cheek.rotation.y = sx * 0.38; cheek.rotation.x = 0.14; headGrp.add(cheek);
      // Recessed dark respirator intake vent slit
      const ventSlit = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.12), matTubeIn);
      ventSlit.position.set(sx * 0.21, 0.14, 0.92); ventSlit.rotation.y = sx * 0.26; headGrp.add(ventSlit);
      // Cheek armor rivet bolt (exact match to reference!)
      const cBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.09, 8), matBolt);
      cBolt.rotation.x = Math.PI / 2; cBolt.rotation.z = sx * -0.35;
      cBolt.position.set(sx * 0.44, 0.26, 0.90); headGrp.add(cBolt);
    }

    // WATERTIGHT SCULPTED SOLID GERMAN STAHLHELM SHELL + SIDE AIR-VENT LUGS + LINER RIVETS!
    const stahlhelm = new THREE.Mesh(this._stahlhelmGeo, matHelmSteel);
    headGrp.add(stahlhelm);
    for (const sx of [-1, 1]) {
      // Classic M35/M42 Stahlhelm side ventilation lug + dark bore hole
      const ventLug = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.12, 0.22, 10), matHelmSteel);
      ventLug.rotation.z = Math.PI / 2;
      ventLug.position.set(sx * 1.07, 1.04, 0.26); headGrp.add(ventLug);
      const ventHole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8), matTubeIn);
      ventHole.rotation.z = Math.PI / 2;
      ventHole.position.set(sx * 1.08, 1.04, 0.26); headGrp.add(ventHole);
      // Side liner rivet stud
      const rStud = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), matBolt);
      rStud.position.set(sx * 1.09, 0.92, -0.28); headGrp.add(rStud);
    }
    // Rear liner rivet stud
    const rearStud = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), matBolt);
    rearStud.position.set(0, 0.88, -1.16); headGrp.add(rearStud);

    // 4. TWIN ARTICULATED 6-TUBE (2x3) SHOULDER ROCKET PODS WITH RECESSED WARHEADS & HYDRAULIC STRUTS!
    const podTips = [];
    const podPivots = [];
    const podFlashes = [];
    for (const sx of [-1, 1]) {
      const pod = new THREE.Group();
      pod.position.set(sx * 2.52, 4.86, -0.14);
      pod.rotation.y = sx * -0.05;

      // Mounting bracket & twin hydraulic elevation struts bolting pod into upper back!
      const mountArm = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.15, 0.92), matJoint);
      mountArm.position.set(sx * -0.42, -0.96, -0.25); mountArm.rotation.z = sx * 0.26; pod.add(mountArm);
      const elevPist = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.15, 8), matPiston);
      elevPist.position.set(sx * -0.22, -0.92, 0.42); elevPist.rotation.x = 0.22; pod.add(elevPist);

      // Chamfered Armored Pod Housing + Corner Brackets + Side Warning Stencil
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.98, 1.44, 2.34), matCamo);
      pod.add(box);
      const topBevel = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.22, 2.18), matFaceArmor);
      topBevel.position.set(0, 0.78, -0.04); pod.add(topBevel);
      const faceBezel = new THREE.Mesh(new THREE.BoxGeometry(1.82, 1.26, 0.20), matDark);
      faceBezel.position.set(0, 0, 1.15); pod.add(faceBezel);
      const stencilPl = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 0.92), matStencil);
      stencilPl.position.set(sx * 1.005, 0, 0); stencilPl.rotation.y = sx * (Math.PI / 2); pod.add(stencilPl);

      // Rear blast vent housing & louvers
      const rearVent = new THREE.Mesh(new THREE.BoxGeometry(1.66, 1.08, 0.28), matDark);
      rearVent.position.set(0, 0, -1.22); pod.add(rearVent);

      // 6 Individually Detailed Launch Tubes (Steel Collar + Dark Inner Bore + Recessed Missile Warhead Tip!)
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 3; c++) {
          const tx = -0.52 + c * 0.52, ty = -0.26 + r * 0.52;
          const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.24, 0.24, 12), matJoint);
          collar.rotation.x = Math.PI / 2; collar.position.set(tx, ty, 1.17); pod.add(collar);
          const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.26, 10), matTubeIn);
          bore.rotation.x = Math.PI / 2; bore.position.set(tx, ty, 1.18); pod.add(bore);
          const warhead = new THREE.Mesh(new THREE.ConeGeometry(0.115, 0.26, 8), matWarhead);
          warhead.rotation.x = Math.PI / 2; warhead.position.set(tx, ty, 1.14); pod.add(warhead);
        }
      }

      const pFlash = new THREE.Mesh(new THREE.SphereGeometry(0.98, 8, 6), matFlash);
      pFlash.position.set(0, 0, 1.72); pFlash.visible = false; pod.add(pFlash);
      podFlashes.push(pFlash);
      const podMuzzle = new THREE.Object3D();
      podMuzzle.position.set(0, 0, 1.60);
      pod.add(podMuzzle);
      podTips.push(podMuzzle);
      podPivots.push(pod);
      torsoGrp.add(pod);
    }

    // 5. MUSEUM-GRADE MULTI-JOINTED ARMS (Sculpted Pauldrons, Bicep Pistons, Bolted Elbows, Cross-Striped Gauntlets & Articulated Fists!)
    const arms = [];
    for (const sx of [-1, 1]) {
      const shoulderPivot = new THREE.Group();
      shoulderPivot.position.set(sx * 3.02, 3.16, 0.05);
      torsoGrp.add(shoulderPivot);

      // Inner shoulder bearing drum
      makeJointDrum(0.68, 1.10, shoulderPivot, sx * -0.18, 0.0, 0.0);

      // Multi-Piece Sculpted Pauldron (Top Bevel Cap + Main Armor Block + Dark Solid Underside Liner + Stripe + Winged Sword!)
      const paulGrp = new THREE.Group();
      paulGrp.position.set(sx * 0.30, 0.14, 0);
      paulGrp.rotation.z = sx * -0.16;
      shoulderPivot.add(paulGrp);

      const paul = new THREE.Mesh(new THREE.BoxGeometry(1.94, 2.02, 2.46), matCamo);
      paulGrp.add(paul);
      const paulTop = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.34, 2.18), matFaceArmor);
      paulTop.position.set(0, 1.08, 0); paulGrp.add(paulTop);
      const paulTrim = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 2.52), matDark);
      paulTrim.position.set(0, -0.98, 0); paulGrp.add(paulTrim);
      const paulStripe = new THREE.Mesh(new THREE.BoxGeometry(1.99, 0.25, 2.50), matStripe);
      paulStripe.position.set(0, -0.34, 0); paulGrp.add(paulStripe);
      const embPl = new THREE.Mesh(new THREE.PlaneGeometry(1.52, 1.52), matEmblem);
      embPl.position.set(sx * 1.00, 0.14, 0);
      embPl.rotation.y = sx * (Math.PI / 2);
      paulGrp.add(embPl);
      // Corner rivets on pauldron front/back faces
      for (const rz of [-1.24, 1.24]) {
        for (const ry of [-0.72, 0.72]) {
          const rv = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 6), matBolt);
          rv.rotation.x = Math.PI / 2; rv.position.set(sx * 0.45, ry, rz); paulGrp.add(rv);
        }
      }

      // Upper Arm + Exposed Steel Hydraulic Bicep Pistons + Ribbed Conduit Cable!
      const uArm = new THREE.Mesh(new THREE.BoxGeometry(1.08, 1.72, 1.18), matJoint);
      uArm.position.set(sx * 0.36, -1.44, 0); shoulderPivot.add(uArm);
      const bicepCuff = new THREE.Mesh(new THREE.BoxGeometry(1.20, 0.68, 1.30), matCamo);
      bicepCuff.position.set(sx * 0.38, -1.32, 0); shoulderPivot.add(bicepCuff);
      for (const pz of [-0.42, 0.42]) {
        const bPist = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.25, 8), matPiston);
        bPist.position.set(sx * 0.88, -1.52, pz); shoulderPivot.add(bPist);
      }

      // Articulated Detailed Elbow Joint!
      const elbowPivot = new THREE.Group();
      elbowPivot.position.set(sx * 0.38, -2.28, 0);
      shoulderPivot.add(elbowPivot);

      makeJointDrum(0.56, 1.32, elbowPivot, 0, 0, 0);
      const elbowGuard = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.72, 0.42), matFaceArmor);
      elbowGuard.position.set(0, -0.04, -0.62); elbowPivot.add(elbowGuard);
      addRibbedHose(elbowPivot, [sx * 0.56, 0.52, -0.25], [sx * 0.78, 0.0, -0.45], [sx * 0.56, -0.52, -0.22], 0.11, 5);

      // Faceted Heavy Gauntlet Forearm w/ Horizontal + Vertical White Tactical Cross-Stripe!
      const fArm = new THREE.Mesh(new THREE.BoxGeometry(1.42, 2.18, 1.50), matCamo);
      fArm.position.set(0, -1.04, 0.16); fArm.rotation.x = -0.14; elbowPivot.add(fArm);
      const fGuard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.78, 1.24), matFaceArmor);
      fGuard.position.set(sx * 0.72, -1.02, 0.18); fGuard.rotation.x = -0.14; elbowPivot.add(fGuard);
      const fStripeH = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.25, 1.56), matStripe);
      fStripeH.position.set(0, -1.08, 0.18); fStripeH.rotation.x = -0.14; elbowPivot.add(fStripeH);
      const fStripeV = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.22, 0.18), matStripe);
      fStripeV.position.set(sx * 0.84, -1.04, 0.20); fStripeV.rotation.x = -0.14; elbowPivot.add(fStripeV);
      const wristCuff = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.32, 1.32), matDark);
      wristCuff.position.set(0, -2.06, 0.32); elbowPivot.add(wristCuff);

      // Articulated Armored Hand / Clenched Fist (Backhand Plate + 4 Distinct Finger Blocks + Thumb!)
      const handGrp = new THREE.Group();
      handGrp.position.set(0, -2.46, 0.40);
      elbowPivot.add(handGrp);
      const palm = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.86, 0.88), matDark);
      handGrp.add(palm);
      const backHand = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.78, 0.94), matCamo);
      backHand.position.set(sx * 0.48, 0.04, 0.04); handGrp.add(backHand);
      for (let fi = 0; fi < 4; fi++) {
        const fz = -0.33 + fi * 0.22;
        const knuck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.18), matFaceArmor);
        knuck.position.set(sx * 0.36, -0.44, fz); handGrp.add(knuck);
        const fTip = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.28, 0.17), matJoint);
        fTip.position.set(sx * -0.02, -0.52, fz); handGrp.add(fTip);
      }
      const thumb = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.56, 0.30), matFaceArmor);
      thumb.position.set(sx * -0.34, -0.18, 0.46); thumb.rotation.x = -0.42; handGrp.add(thumb);

      arms.push({ shoulder: shoulderPivot, elbow: elbowPivot });
    }

    // 6. MUSEUM-GRADE COLOSSAL MULTI-JOINTED LEGS & CLAWED FEET!
    const legs = [];
    for (const sx of [-1, 1]) {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(sx * 1.44, -0.40, 0);
      pelvisGrp.add(hipPivot);

      // Inner hip mechanical axle + hydraulic cylinder
      makeJointDrum(0.58, 0.92, hipPivot, sx * -0.32, 0.0, 0.0);

      // Faceted Heavy Thigh Armor + Outer Bevel Plate + White Tactical Stripe + Rear Ribbed Hose!
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(1.62, 2.62, 1.92), matCamo);
      thigh.position.set(0, -1.18, 0.08); hipPivot.add(thigh);
      const thighOuter = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.22, 1.48), matFaceArmor);
      thighOuter.position.set(sx * 0.84, -1.12, 0.06); hipPivot.add(thighOuter);
      const thighFront = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.10, 0.34), matCamo);
      thighFront.position.set(0, -1.12, 1.02); thighFront.rotation.x = -0.06; hipPivot.add(thighFront);
      const tStripe = new THREE.Mesh(new THREE.BoxGeometry(1.69, 0.26, 1.99), matStripe);
      tStripe.position.set(0, -1.26, 0.08); hipPivot.add(tStripe);
      addRibbedHose(hipPivot, [sx * 0.45, -0.82, -0.86], [sx * 0.52, -1.55, -1.32], [sx * 0.45, -2.28, -0.82], 0.14, 7);

      // Articulated Knee Joint w/ Prominent Concentric Bolted Bearing Drum + Armored Kneecap!
      const kneePivot = new THREE.Group();
      kneePivot.position.set(0, -2.56, 0);
      hipPivot.add(kneePivot);

      makeJointDrum(0.76, 1.96, kneePivot, 0, 0, 0);
      const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.24, 1.12), matCamo);
      kneeGuard.position.set(0, 0.08, 0.78); kneePivot.add(kneeGuard);
      const kneeTopBevel = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.34, 0.86), matFaceArmor);
      kneeTopBevel.position.set(0, 0.74, 0.68); kneeTopBevel.rotation.x = 0.26; kneePivot.add(kneeTopBevel);
      for (const kx of [-0.52, 0.52]) {
        const kBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.12, 6), matBolt);
        kBolt.rotation.x = Math.PI / 2; kBolt.position.set(kx, 0.44, 1.36); kneePivot.add(kBolt);
      }

      // Multi-Tiered Heavy Shin / Greave + Rear Calf Hydraulic Shock Pistons!
      const shin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.52, 2.10), matCamo);
      shin.position.set(0, -1.38, 0.02); kneePivot.add(shin);
      const shinFront = new THREE.Mesh(new THREE.BoxGeometry(1.38, 2.08, 0.42), matCamo);
      shinFront.position.set(0, -1.32, 1.12); shinFront.rotation.x = -0.08; kneePivot.add(shinFront);
      const shinCuff = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.56, 2.26), matFaceArmor);
      shinCuff.position.set(0, -2.14, 0.08); kneePivot.add(shinCuff);
      for (const px of [-0.46, 0.46]) {
        const sPist = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.15, 8), matPiston);
        sPist.position.set(px, -1.28, -1.16); sPist.rotation.x = 0.08; kneePivot.add(sPist);
        const sSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.05, 8), matDark);
        sSleeve.position.set(px, -0.82, -1.12); sSleeve.rotation.x = 0.08; kneePivot.add(sSleeve);
      }

      // Articulated Ankle Joint w/ Concentric Bearing Drum + Colossal Segmented Clawed Foot!
      const anklePivot = new THREE.Group();
      anklePivot.position.set(0, -2.44, 0.25);
      kneePivot.add(anklePivot);

      makeJointDrum(0.64, 2.08, anklePivot, 0, 0.26, -0.18);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.86, 3.22), matDark);
      foot.position.set(0, 0.0, 0.24); anklePivot.add(foot);
      const footTop = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.42, 2.38), matCamo);
      footTop.position.set(0, 0.52, 0.36); footTop.rotation.x = 0.14; anklePivot.add(footTop);
      const heelSpur = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.58, 0.92), matFaceArmor);
      heelSpur.position.set(0, -0.06, -1.58); anklePivot.add(heelSpur);
      for (const tx of [-0.58, 0.58]) {
        const toeBase = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.66, 1.24), matCamo);
        toeBase.position.set(tx, -0.04, 1.70); anklePivot.add(toeBase);
        const toeTip = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.46, 0.56), matFaceArmor);
        toeTip.position.set(tx, -0.14, 2.48); toeTip.rotation.x = 0.22; anklePivot.add(toeTip);
        const toePad = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.16, 1.68), matDark);
        toePad.position.set(tx, -0.40, 1.88); anklePivot.add(toePad);
      }
      legs.push({ hip: hipPivot, knee: kneePivot, ankle: anklePivot });
    }

    rig.scale.setScalar(5.2); // ~68 METERS EXTREMELY TALL MUSEUM-GRADE COLOSSUS!
    this.scene.add(root);
    return {
      root, rig, pelvisGrp, torsoGrp, headGrp, arms, legs,
      podTips, podPivots, podFlashes, strobeMesh, matBeaconRed, isActive, flashTimer: 0
    };
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
    let activeProx = 0, strideEffort = 0, isEngaging = false, dormantProx = 0;

    for (let i = 0; i < this.mechas.length; i++) {
      const m = this.mechas[i];
      if (m.isPatrol) {
        // Deterministic wall-clock synced coastal patrol (100% synced in Multiplayer!)
        const wps = m.patrolWaypoints;
        const speedMs = 13.5;
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
        this._stepPhase += dt * 1.15;
        const ph = this._stepPhase;
        const sL = Math.sin(ph);
        const sR = Math.sin(ph + Math.PI);
        const liftL = Math.max(0, Math.cos(ph));
        const liftR = Math.max(0, Math.cos(ph + Math.PI));
        strideEffort = Math.abs(Math.cos(ph)); // Peaks during active leg lift & hydraulic knee swing!

        m.legs[0].hip.rotation.x   = -sL * 0.42 - liftL * 0.14;
        m.legs[0].knee.rotation.x  =  liftL * 0.68 + 0.08;
        m.legs[0].ankle.rotation.x = -(m.legs[0].hip.rotation.x + m.legs[0].knee.rotation.x) * 0.82;

        m.legs[1].hip.rotation.x   = -sR * 0.42 - liftR * 0.14;
        m.legs[1].knee.rotation.x  =  liftR * 0.68 + 0.08;
        m.legs[1].ankle.rotation.x = -(m.legs[1].hip.rotation.x + m.legs[1].knee.rotation.x) * 0.82;

        m.pelvisGrp.position.y = 5.65 + Math.abs(Math.sin(ph)) * 0.36 - 0.14;
        m.pelvisGrp.rotation.z = sL * 0.075;
        m.torsoGrp.rotation.x  = 0.06 + Math.abs(Math.cos(ph)) * 0.045;
        m.torsoGrp.rotation.z  = -sL * 0.045;

        m.arms[0].shoulder.rotation.x =  sL * 0.32;
        m.arms[0].elbow.rotation.x    = -0.34 - Math.max(0, -sL) * 0.28;
        m.arms[1].shoulder.rotation.x =  sR * 0.32;
        m.arms[1].elbow.rotation.x    = -0.34 - Math.max(0, -sR) * 0.28;

        // Blinking red aviation strobe on tallest antenna!
        if (m.strobeMesh) m.strobeMesh.visible = (Math.floor(this._headScanT * 1.8) % 2 === 0);

        const dP = Math.hypot(m.gx - playerGx, m.gz - playerGz);
        if (dP < 560) activeProx = Math.max(activeProx, Math.pow(1.0 - dP / 560, 1.3));

        // Heavy Ground-Shaking Footfall Impact, Dust Plume & Booming Hydraulic Stomp Audio!
        const halfIdx = Math.floor((ph + Math.PI * 0.5) / Math.PI);
        if (halfIdx !== this._lastStepHalf) {
          this._lastStepHalf = halfIdx;
          if (dP < 680) {
            const prox = Math.max(0, 1.0 - dP / 680);
            this.cameraShakeOut = Math.max(this.cameraShakeOut, prox * 0.58);
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

        // COASTAL DEFENSE: Scan ocean, swivel torso & head, elevate rocket pods, & repel Megalodon/Kraken!
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
          isEngaging = true;
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
            this._fireRocketVolley(m, threat.gx, threat.gy, threat.gz, dP < 2200 ? audio : null, particles);
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
          const idleTorso = -sL * 0.09;
          m.torsoYaw += (idleTorso - m.torsoYaw) * Math.min(1, dt * 3.0);
          m.torsoGrp.rotation.y = m.torsoYaw;
          m.headGrp.rotation.y = Math.sin(this._headScanT * 0.45) * 0.34;
          m.podPitch += (0.0 - m.podPitch) * Math.min(1, dt * 3.0);
        }
        for (const pp of m.podPivots) pp.rotation.x = m.podPitch;
        if (m.flashTimer > 0) m.flashTimer = Math.max(0, m.flashTimer - dt);
        for (const pf of m.podFlashes) pf.visible = m.flashTimer > 0;
      } else {
        const dDorm = Math.hypot(m.gx - playerGx, m.gz - playerGz);
        if (dDorm < 220) dormantProx = Math.max(dormantProx, 1.0 - dDorm / 220);
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

    // Continuous proximity mechanical whirring, reactor hum & dormant monument creaks!
    if (audio && audio.updateMechaAmbience) {
      audio.updateMechaAmbience(dt, activeProx, strideEffort, isEngaging, dormantProx);
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
