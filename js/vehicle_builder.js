// ============================================================================
// js/vehicle_builder.js (v5) — 9 Sculpted Cars, Dirt & Mud Overlay,
// Headlight Glow Halos (No Ugly Cones!), Exhaust Backfire Flames & Avatars
// ============================================================================
window.KK = window.KK || {};

KK.VehicleBuilder = {
  _tireBrandMatCache: {},
  _getTireSidewallMat(brandId) {
    const key = brandId || "volgaworks";
    if (this._tireBrandMatCache[key]) return this._tireBrandMatCache[key];
    const br = (KK.TIRE_BRANDS && KK.TIRE_BRANDS[key]) || { short: "VOLGA", color: "#9db4c4" };
    const cv = document.createElement("canvas"); cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 256);
    ctx.beginPath(); ctx.arc(128, 128, 124, 0, Math.PI * 2); ctx.arc(128, 128, 76, 0, Math.PI * 2, true);
    ctx.fillStyle = "#1c1f24"; ctx.fill();
    ctx.strokeStyle = br.color || "#9db4c4"; ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(128, 128, 114, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = br.color || "#9db4c4"; ctx.font = "900 18px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const label = (br.short || "VOLGA").toUpperCase();
    for (const baseAng of [0, Math.PI]) {
      ctx.save(); ctx.translate(128, 128); ctx.rotate(baseAng);
      const step = 0.14, startA = -((label.length - 1) * step) * 0.5;
      for (let i = 0; i < label.length; i++) { ctx.save(); ctx.rotate(startA + i * step); ctx.fillText(label[i], 0, -96); ctx.restore(); }
      ctx.restore();
    }
    for (const lx of [32, 224]) { ctx.save(); ctx.translate(lx, 128); ctx.rotate(Math.PI / 4); ctx.fillRect(-5, -5, 10, 10); ctx.restore(); }
    const tex = new THREE.CanvasTexture(cv);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.85, metalness: 0.08, side: THREE.DoubleSide });
    this._tireBrandMatCache[key] = mat;
    return mat;
  },
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
  _buildFacetedMesh(verts, faces, mat, uvScale = 0.28) {
    const pos = [], uvs = [];
    // Compute mesh centroid so EVERY face is automatically wound outward (zero see-through backfaces!)
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < verts.length; i++) { cx += verts[i][0]; cy += verts[i][1]; cz += verts[i][2]; }
    cx /= Math.max(1, verts.length); cy /= Math.max(1, verts.length); cz /= Math.max(1, verts.length);

    const pushTri = (ia, ib, ic) => {
      let a = verts[ia], b = verts[ib], c = verts[ic];
      let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const mx = (a[0] + b[0] + c[0]) / 3 - cx;
      const my = (a[1] + b[1] + c[1]) / 3 - cy;
      const mz = (a[2] + b[2] + c[2]) / 3 - cz;
      if (nx * mx + ny * my + nz * mz < 0) {
        const tmp = b; b = c; c = tmp;
        nx = -nx; ny = -ny; nz = -nz;
      }
      pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      const anx = Math.abs(nx), any = Math.abs(ny), anz = Math.abs(nz);
      const pts = [a, b, c];
      for (let k = 0; k < 3; k++) {
        const p = pts[k];
        if (any >= anx && any >= anz) uvs.push(p[0] * uvScale + 0.5, p[2] * uvScale + 0.5);
        else if (anx >= anz)          uvs.push(p[2] * uvScale + 0.5, p[1] * uvScale + 0.5);
        else                          uvs.push(p[0] * uvScale + 0.5, p[1] * uvScale + 0.5);
      }
    };
    for (const f of faces) {
      if (f.length === 3) pushTri(f[0], f[1], f[2]);
      else if (f.length === 4) { pushTri(f[0], f[1], f[2]); pushTri(f[0], f[2], f[3]); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  },

  _getGroundGlowTex() {
    if (this._groundGlowTex) return this._groundGlowTex;
    const cv = document.createElement("canvas");
    cv.width = 128; cv.height = 128;
    const ctx = cv.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0.0, "rgba(255,255,255,0.65)");
    g.addColorStop(0.45, "rgba(255,255,255,0.22)");
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    this._groundGlowTex = new THREE.CanvasTexture(cv);
    return this._groundGlowTex;
  },

  _getMudSplotchTex() {
    if (this._mudSplotchTex) return this._mudSplotchTex;
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 128;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, 256, 128);
    // Deterministic brown mud splatters concentrated along bottom edge!
    let seed = 1337;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < 65; i++) {
      const x = rnd() * 256;
      const y = 128 - Math.pow(rnd(), 1.8) * 96;
      const rx = 5 + rnd() * 18;
      const ry = 3 + rnd() * 11;
      ctx.fillStyle = rnd() > 0.4 ? "rgba(74, 48, 26, 0.85)" : "rgba(56, 36, 18, 0.92)";
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    this._mudSplotchTex = new THREE.CanvasTexture(cv);
    return this._mudSplotchTex;
  },

  // v15.6 MODULAR HOOD-CULLED ENGINE BAY (0 Draw Calls While Hood Is Closed!)
  _buildEngineBay(vehicleId, vState, spec, hoodPivot) {
    if (spec && (spec.isTracked || spec.id === "btr80" || spec.id === "komodo_std" || spec.id === "komodo_recon" || spec.id === "komodo_turret")) {
      return null;
    }
    const bay = new THREE.Group();
    const hz = hoodPivot.position.z || (spec.bodyLen * 0.25);
    const hy = Math.max(0.50, (hoodPivot.position.y || 0.92) - 0.26);
    const isRearEng = (vehicleId === "porsche_dakar");
    bay.position.set(0, hy, isRearEng ? -1.45 : (hz + 0.42));

    const engId = (vState && vState.engineId) || "i4_stock";
    const isV = engId.includes("v6") || engId.includes("v8") || engId.includes("vr38") || engId.includes("v12") || vehicleId === "gtr_r35";
    const isTurbo = engId.includes("turbo") || engId.includes("tt") || engId.includes("vr38") || (vState && vState.upgrades && vState.upgrades.turbo);
    const isJdm = (vehicleId === "gtr_r35" || vehicleId === "evo" || vehicleId === "wrx" || vehicleId === "supra" || vehicleId === "silvia");

    const matBlock = new THREE.MeshStandardMaterial({ color: 0x3b4046, roughness: 0.72, metalness: 0.58 });
    const matCover = new THREE.MeshStandardMaterial({ color: isJdm ? 0xc92a2a : (isV ? 0xd9a016 : 0x2a6f97), roughness: 0.35, metalness: 0.48 });
    const matPipe  = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.24, metalness: 0.85 });
    const matRad   = new THREE.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.85, metalness: 0.35 });
    const matBat   = new THREE.MeshStandardMaterial({ color: 0x14171c, roughness: 0.8 });
    const matRedP  = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.4 });

    const block = new THREE.Mesh(new THREE.BoxGeometry(isV ? 0.56 : 0.36, 0.34, 0.58), matBlock);
    bay.add(block);
    if (isV) {
      for (const sx of [-0.22, 0.22]) {
        const vc = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.54), matCover);
        vc.position.set(sx, 0.21, 0); vc.rotation.z = sx > 0 ? -0.35 : 0.35; bay.add(vc);
      }
      const plenum = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.48), matPipe);
      plenum.position.set(0, 0.26, 0); bay.add(plenum);
    } else {
      const vc = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.11, 0.56), matCover);
      vc.position.set(0, 0.22, 0); bay.add(vc);
      const intake = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.44), matPipe);
      intake.position.set(0.22, 0.16, 0); bay.add(intake);
    }
    if (isTurbo) {
      const snail = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.042, 7, 12), matPipe);
      snail.position.set(-0.28, 0.14, 0.12); snail.rotation.y = Math.PI / 2; bay.add(snail);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.48, 8), matPipe);
      pipe.rotation.z = Math.PI / 2; pipe.position.set(0, 0.26, 0.24); bay.add(pipe);
    }
    const rad = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.36, 0.08), matRad);
    rad.position.set(0, 0.06, isRearEng ? -0.38 : 0.44); bay.add(rad);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.05), matRedP);
    strut.position.set(0, 0.30, -0.08); bay.add(strut);
    const bat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 0.18), matBat);
    bat.position.set(0.46, 0.08, -0.14); bay.add(bat);

    const fan = new THREE.Group();
    fan.position.set(0, 0.06, isRearEng ? -0.32 : 0.37);
    const matFan = new THREE.MeshStandardMaterial({ color: 0x20252b, roughness: 0.7 });
    for (let fb = 0; fb < 4; fb++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.015), matFan);
      blade.rotation.z = (fb / 4) * Math.PI;
      fan.add(blade);
    }
    bay.add(fan);
    bay.userData.fan = fan;
    bay.userData.basePos = bay.position.clone();
    bay.visible = false;
    return bay;
  },

  // v15.6 DYNAMIC PER-VEHICLE EXHAUSTS
  _buildDynamicExhaust(chassis, vehicleId, vState, spec) {
    if (spec && spec.isTracked) return;
    const isRaceExh = !!(vState && vState.upgrades && (vState.upgrades.raceExhaust || vState.upgrades.exhaust));
    const matTip = new THREE.MeshStandardMaterial({
      color: isRaceExh ? 0x6ba6ff : 0x9aa4ae,
      emissive: isRaceExh ? 0x241638 : 0x000000,
      roughness: 0.26, metalness: 0.88
    });
    const matPipeDk = new THREE.MeshStandardMaterial({ color: 0x3b3532, roughness: 0.85, metalness: 0.45 });
    const hl = (spec.bodyLen || 4.4) * 0.5;
    const rearZ = -hl - 0.04;
    const tipY = 0.38;

    const tips = [];
    const addTip = (x, y, z, rad = 0.055, len = 0.24, dir = "rear") => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.08, len, 10), matTip);
      m.rotation.x = Math.PI / 2; m.position.set(x, y, z); chassis.add(m);
      tips.push({ x, y, z: z - len * 0.5 - 0.06, dir });
    };

    if (vehicleId === "gtr_r35" || vehicleId === "porsche_dakar" || vehicleId === "supra") {
      for (const sx of [-1, 1]) { addTip(sx * 0.45, tipY, rearZ, 0.052, 0.22); addTip(sx * 0.59, tipY, rearZ, 0.052, 0.22); }
    } else if (vehicleId === "wrx" || vehicleId === "evo" || vehicleId === "camry" || vehicleId === "bmw_e39" || vehicleId === "audi_quattro") {
      for (const sx of [-0.48, 0.48]) addTip(sx, tipY, rearZ, 0.058, 0.24);
    } else if (vehicleId === "kamaz" || vehicleId === "maz537" || vehicleId === "ural") {
      const sx = -spec.bodyWidth * 0.48;
      const sideP = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.55, 8), matPipeDk);
      sideP.rotation.z = Math.PI / 2; sideP.position.set(sx, 0.62, -0.4); chassis.add(sideP);
      tips.push({ x: sx - 0.30, y: 0.62, z: -0.4, dir: "left" });
    } else {
      addTip(-0.42, tipY, rearZ, 0.048, 0.22);
    }
    return tips;
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

  // v16.4.1 TRUE RECESSED WHEEL WELLS: Carves UPPER semicircular arches (PI -> 0) into 2D side-profile Shape!
  _traceBottomWithWheelArches(shape, zRear, zFront, yBottom, spec, maxTopY = 0.92) {
    shape.moveTo(zRear, yBottom);
    const axles = [];
    const seen = new Set();
    for (const w of (spec.wheels || [])) {
      const kz = Math.round(w.z * 100);
      if (!seen.has(kz)) { seen.add(kz); axles.push({ z: w.z, y: w.y || 0.25 }); }
    }
    axles.sort((a, b) => a.z - b.z);
    const rBase = (spec.wheelRadius || 0.38) + 0.11;
    for (const ax of axles) {
      const cy = yBottom + 0.04;
      const rArch = Math.min(rBase, Math.max(0.28, maxTopY - cy));
      const zStart = Math.max(zRear + 0.08, ax.z - rArch);
      const zEnd   = Math.min(zFront - 0.08, ax.z + rArch);
      if (zEnd <= zStart + 0.08) continue;
      shape.lineTo(zStart, yBottom);
      const segs = 12;
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const a = Math.PI * (1 - t); // PI (rear) -> PI/2 (top) -> 0 (front), sin(a) >= 0 ALWAYS UPWARD!
        const pz = ax.z + Math.cos(a) * rArch;
        const py = Math.min(maxTopY, cy + Math.sin(a) * rArch);
        if (pz > zStart && pz < zEnd) shape.lineTo(pz, py);
      }
      shape.lineTo(zEnd, yBottom);
    }
    shape.lineTo(zFront, yBottom);
  },

  // v16.5 RECESSED INNER WHEEL-WELL LINERS + TUCKED COILOVER SHOCK STRUTS
  // Strictly clamped inside maxTopY & 0.26m depth so ZERO plane ever pokes into the boot or cabin!
  _addWheelWellLiners(chassis, spec, matLiner, yBottom = 0.36, maxTopY = 0.96) {
    if (!this._matWellDark) {
      this._matWellDark = new THREE.MeshStandardMaterial({ color: 0x0c0e11, roughness: 0.96, metalness: 0.04, side: THREE.DoubleSide });
      this._matCoilSpring = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.42, metalness: 0.35 });
    }
    const cy = yBottom + 0.04;
    const rBase = (spec.wheelRadius || 0.38) + 0.11;
    const rArch = Math.min(rBase, Math.max(0.28, maxTopY - cy));
    const rLiner = Math.max(0.24, rArch - 0.018);
    const depth = Math.min(0.27, spec.bodyWidth * 0.14);
    const archGeo = new THREE.CylinderGeometry(rLiner, rLiner, depth, 14, 1, true, 0, Math.PI);
    const backGeo = new THREE.CircleGeometry(rLiner, 14, 0, Math.PI);
    const strutH = Math.max(0.18, rLiner * 0.72);
    const strutGeo = new THREE.CylinderGeometry(0.028, 0.028, strutH, 8);
    const springGeo = new THREE.CylinderGeometry(0.050, 0.050, strutH * 0.48, 8);

    for (const w of (spec.wheels || [])) {
      const side = w.x < 0 ? -1 : 1;
      const outerX = side * (spec.bodyWidth * 0.5 - 0.05);
      const centerX = outerX - side * (depth * 0.5);
      const innerX = outerX - side * depth;

      const liner = new THREE.Mesh(archGeo, this._matWellDark);
      liner.rotation.z = Math.PI / 2;
      liner.position.set(centerX, cy, w.z);
      chassis.add(liner);

      const back = new THREE.Mesh(backGeo, this._matWellDark);
      back.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      back.position.set(innerX, cy, w.z);
      chassis.add(back);

      const strut = new THREE.Mesh(strutGeo, matLiner || this._matWellDark);
      strut.position.set(innerX + side * 0.075, cy + strutH * 0.48, w.z);
      chassis.add(strut);
      const spring = new THREE.Mesh(springGeo, this._matCoilSpring);
      spring.position.set(innerX + side * 0.075, cy + strutH * 0.56, w.z);
      chassis.add(spring);
    }
  },

  _addFenderFlares(chassis, wheels, wheelRadius, matFlare, flareWidth = 0.15, archY = null) {
    for (const w of wheels) {
      const side = w.x < 0 ? -1 : 1;
      const rOuter = wheelRadius + 0.115;
      const yPos = (archY !== null) ? archY : (w.y + 0.18);
      const arch = new THREE.Mesh(new THREE.TorusGeometry(rOuter, flareWidth * 0.42, 8, 16, Math.PI), matFlare);
      arch.rotation.y = Math.PI / 2;
      arch.position.set(w.x + side * 0.01, yPos, w.z);
      arch.castShadow = true; chassis.add(arch);

      if (!w.steer) {
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.03), matFlare);
        flap.position.set(w.x, yPos - 0.14, w.z - wheelRadius - 0.09);
        chassis.add(flap);
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
    // v16.3 Removed hardcoded default tailPipe — exhausts are built dynamically per vehicle!

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
    let cockpit = null, btrTurretPivot = null, btrGunGroup = null, btrMuzzleFlash = null, btrMuzzleTip = null, tankTurretPivot = null, tankGunPitch = null, tankBarrelSlide = null, tankMainFlash = null, tankCoaxFlash = null, trackSys = null, tankDriverHoodMesh = null, tankUpgVisuals = null, tankXrayAnim = null, gradTurretPivot = null, gradPodPitch = null, gradFlashMesh = null, shilkaTurretPivot = null, shilkaGunPitch = null, shilkaBarrels = null, shilkaRadarDish = null, shilkaFlashes = null, p140SturmGroup = null, p140ApsFlash = null, p140XrayAnim = null, p140RwsPivot = null, p140RwsGunPitch = null, p140RwsMuzzleTip = null, matMainBarrelHot = null, matAutoBarrelHot = null;

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
    const matTire = new THREE.MeshStandardMaterial({ color: cleanTireColor.clone(), roughness: 0.95, metalness: 0.03, side: THREE.DoubleSide });
    const rimHex = (vehicleId === "wrx") ? 0xd4af37 : ((vehicleId === "evo" || vehicleId === "fortuner") ? 0x2a2f36 : ((vehicleId === "gtr_r35") ? 0x2f343b : ((vehicleId === "humvee" || vehicleId === "btr80" || vehicleId === "maz537") ? 0x454a3d : 0xadb6c0)));
    const matRim = new THREE.MeshStandardMaterial({ color: rimHex, roughness: 0.28, metalness: 0.72 });
    if (vState && vState.rimColor) matRim.color.set(vState.rimColor);
    const matBrake = new THREE.MeshStandardMaterial({ color: (vehicleId === "wrx" || vehicleId === "gtr_r35") ? 0xe89c1c : 0xc92a2a, roughness: 0.45, metalness: 0.3 });
    if (vState && vState.caliperColor) matBrake.color.set(vState.caliperColor);
    const matBrakeRotor = new THREE.MeshStandardMaterial({ color: 0x7a828c, emissive: 0xff2a00, emissiveIntensity: 0.0, roughness: 0.34, metalness: 0.84 });
    const matBarrelIn = matRubber.clone(); matBarrelIn.side = THREE.DoubleSide;
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
      // v16.2 EPIC REMODEL: Authentic Rounded Soviet UAZ-452 "Bukhanka" Loaf Van!
      plateText = "UAZ-452"; roundHL = true; hlY = 0.86; hlZ = 2.21; hlSpread = 0.64;
      const matAmber   = new THREE.MeshStandardMaterial({ color: 0xe88b14, emissive: 0x4a2500, roughness: 0.35 });
      const matCabGlass = new THREE.MeshStandardMaterial({ color: 0x6c9ab8, roughness: 0.10, metalness: 0.25, transparent: true, opacity: 0.30, side: THREE.DoubleSide });

      // 1. Rounded Classic Loaf Body Extrusion (Hollow Cabin + Split Windshield!)
      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.14, 2.08, 0.42, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.12));
      s.quadraticCurveTo(2.24, 0.72, 2.18, 1.18);
      s.quadraticCurveTo(2.10, 1.72, 1.82, 1.94);
      s.quadraticCurveTo(0.0, 2.06, -1.96, 1.94);
      s.quadraticCurveTo(-2.18, 1.74, -2.16, 1.18); s.closePath();
      chassis.add(this._extrudeSideProfile(s, 1.90, matPaint, 0.03, 0.035, cockpitCfg));

      // 2. Sculpted Rounded Loaf Nose Valence (Faceted taper!)
      const noseV = [
        [-0.92, 0.44, 2.10], [ 0.92, 0.44, 2.10],
        [-0.84, 0.48, 2.24], [ 0.84, 0.48, 2.24],
        [-0.86, 1.16, 2.21], [ 0.86, 1.16, 2.21],
        [-0.94, 1.16, 2.06], [ 0.94, 1.16, 2.06]
      ];
      const noseF = [[2,3,5,4], [0,2,4,6], [1,7,5,3], [4,5,7,6]];
      chassis.add(this._buildFacetedMesh(noseV, noseF, matPaint, 0.30));

      // Stamped Soviet body-side horizontal beltline & triple corrugated lower ribs!
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.20, 1.38), matRubber);
      skirt.position.set(0, 0.45, 0.03); chassis.add(skirt);
      for (const sx of [-1, 1]) {
        for (const ry of [1.02, 1.14]) {
          const rib = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.038, 4.16), ry === 1.14 ? matTrim : matPaint);
          rib.position.set(sx * 0.96, ry, -0.02); chassis.add(rib);
        }
        const sideGutter = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.04, 3.88), matTrim);
        sideGutter.position.set(sx * 0.92, 1.92, -0.06); chassis.add(sideGutter);
      }
      const frontMold = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.05, 0.04), matTrim);
      frontMold.position.set(0, 1.16, 2.22); chassis.add(frontMold);

      // 3. Recessed Rear Cargo Side Windows w/ Rubber Weatherstrip Frames
      for (const wz of [0.22, -0.68, -1.52]) {
        for (const sx of [-1, 1]) {
          const wx = sx * 0.955;
          const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.68), matRubber);
          topBar.position.set(wx, 1.70, wz); chassis.add(topBar);
          const botBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.68), matRubber);
          botBar.position.set(wx, 1.32, wz); chassis.add(botBar);
          for (const dz of [-0.32, 0.32]) {
            const pBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.04), matRubber);
            pBar.position.set(wx, 1.51, wz + dz); chassis.add(pBar);
          }
          const wg = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.34, 0.60), matCabGlass);
          wg.position.set(sx * 0.945, 1.51, wz); chassis.add(wg);
        }
      }

      // 4. Iconic Front Fascia: Recessed Round Headlight Buckets, Chrome Bezels, Twin Pill Slots & Emblem!
      for (const sx of [-1, 1]) {
        const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.175, 0.08, 16), matRubber);
        bucket.rotation.x = Math.PI / 2; bucket.position.set(sx * 0.64, 0.86, 2.19); chassis.add(bucket);
        const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.024, 8, 16), matChrome);
        bezel.position.set(sx * 0.64, 0.86, 2.23); chassis.add(bezel);
        const turnSig = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.065, 0.05), matAmber);
        turnSig.position.set(sx * 0.64, 0.64, 2.23); chassis.add(turnSig);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.16), matChrome);
        handle.position.set(sx * 0.965, 1.06, 0.92); chassis.add(handle);
        const flap = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.03), matRubber);
        flap.position.set(sx * 0.84, 0.26, -1.78); chassis.add(flap);
      }
      for (const gy of [0.94, 0.78]) {
        const slot = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.085, 0.06), matRubber);
        slot.position.set(0, gy, 2.22); chassis.add(slot);
        const trimBar = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.02, 0.07), matChrome);
        trimBar.position.set(0, gy, 2.23); chassis.add(trimBar);
      }
      const uazBadge = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.065, 0.04), matChrome);
      uazBadge.position.set(0, 1.07, 2.22); chassis.add(uazBadge);

      // 5. Split Heavy-Gauge Steel Front Bumper w/ Tow Shackles + Rear Bumper
      for (const sx of [-1, 1]) {
        const fB = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.16, 0.20), matMetal);
        fB.position.set(sx * 0.56, 0.45, 2.30); fB.castShadow = true; chassis.add(fB);
        const hook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 10), matMetal);
        hook.position.set(sx * 0.52, 0.45, 2.42); chassis.add(hook);
      }
      const fCenter = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.16), matRubber);
      fCenter.position.set(0, 0.45, 2.28); chassis.add(fCenter);
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.16, 0.18), matMetal);
      rBump.position.set(0, 0.46, -2.25); chassis.add(rBump);

      // 6. Rear Twin Barn-Door Seam, Left Roof Access Ladder & Full-Size Rear Spare Tire!
      const rSeam = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.32, 0.04), matRubber);
      rSeam.position.set(0, 1.18, -2.16); chassis.add(rSeam);
      for (const lx of [-0.68, -0.36]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.34, 6), matMetal);
        rail.position.set(lx, 1.30, -2.23); chassis.add(rail);
      }
      for (let ry = 0.78; ry <= 1.82; ry += 0.26) {
        const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), matMetal);
        rung.rotation.z = Math.PI / 2; rung.position.set(-0.52, ry, -2.23); chassis.add(rung);
      }
      const spTire = new THREE.Mesh(new THREE.CylinderGeometry(0.39, 0.39, 0.24, 16), matTire);
      spTire.rotation.x = Math.PI / 2; spTire.position.set(0.44, 1.06, -2.30); spTire.castShadow = true; chassis.add(spTire);
      const spRim = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.26, 10), matRim);
      spRim.rotation.x = Math.PI / 2; spRim.position.set(0.44, 1.06, -2.30); chassis.add(spRim);

      // 7. Soviet Tubular Expedition Roof Rack
      const rackFloor = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.04, 2.48), matMetal);
      rackFloor.position.set(0, 2.06, -0.35); chassis.add(rackFloor);
      for (const sx of [-0.73, 0.73]) {
        const rSide = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 2.48), matMetal);
        rSide.position.set(sx, 2.12, -0.35); chassis.add(rSide);
      }
      for (const rz of [0.88, -1.58]) {
        const rEnd = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.12, 0.04), matMetal);
        rEnd.position.set(0, 2.12, rz); chassis.add(rEnd);
      }

      hoodPivot.position.set(0, 1.16, 2.20);
      const nose = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.34, 0.07), matPaint);
      nose.position.set(0, -0.17, 0.03); hoodPivot.add(nose);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.42, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.12));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.12, 0.46);
      this._addMirrors(chassis, 0.97, 1.48, 1.72, matMetal, matRubber, 0.24);
    }

    // ========================================================================
    // 2. TOYOTA HILUX N70 (2.8L)
    // ========================================================================
    else if (vehicleId === "hilux") {
      // v16.2 EPIC REMODEL: Sculpted Toyota Hilux N70 Pickup w/ Aggressive Fascia & Sports Rollbar!
      plateText = "HLX-N70"; hlY = 0.80; hlZ = 2.60; hlSpread = 0.66;
      const w = spec.bodyWidth;
      const matGunmetal = new THREE.MeshStandardMaterial({ color: 0x2c323b, roughness: 0.45, metalness: 0.55 });
      const matDrl = new THREE.MeshBasicMaterial({ color: 0xeef8ff });

      const cabShape = new THREE.Shape();
      this._traceBottomWithWheelArches(cabShape, -0.92, 2.50, 0.42, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.94));
      cabShape.quadraticCurveTo(2.62, 0.68, 2.50, 0.94);
      cabShape.lineTo(1.10, 1.01); cabShape.lineTo(0.62, 1.58);
      cabShape.quadraticCurveTo(-0.14, 1.66, -0.82, 1.58);
      cabShape.lineTo(-0.92, 1.00); cabShape.closePath();
      chassis.add(this._extrudeSideProfile(cabShape, w - 0.08, matPaint, 0.06, 0.07, cockpitCfg));

      const fBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.28, 0.34), matGunmetal);
      fBumper.position.set(0, 0.49, 2.53); fBumper.castShadow = true; chassis.add(fBumper);
      const bashPlate = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.06, 0.52), matGalv);
      bashPlate.position.set(0, 0.36, 2.40); bashPlate.rotation.x = 0.34; chassis.add(bashPlate);

      const grilleFrame = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.34, 0.09), matChrome);
      grilleFrame.position.set(0, 0.80, 2.58); chassis.add(grilleFrame);
      const grilleBg = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.28, 0.10), matRubber);
      grilleBg.position.set(0, 0.80, 2.59); chassis.add(grilleBg);
      for (const gy of [0.72, 0.80, 0.88]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.032, 0.12), matChrome);
        bar.position.set(0, gy, 2.60); chassis.add(bar);
      }
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 12), matChrome);
      badge.rotation.x = Math.PI / 2; badge.position.set(0, 0.80, 2.66); chassis.add(badge);

      for (const sx of [-1, 1]) {
        const fogRim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.08), matRubber);
        fogRim.position.set(sx * 0.68, 0.50, 2.68); chassis.add(fogRim);
        const fogLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.06, 10), matDrl);
        fogLamp.rotation.x = Math.PI / 2; fogLamp.position.set(sx * 0.68, 0.50, 2.71); chassis.add(fogLamp);
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 1.92), matGunmetal);
        step.position.set(sx * (w * 0.52), 0.36, 0.06); chassis.add(step);
        const stepTrim = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.065, 1.88), matChrome);
        stepTrim.position.set(sx * (w * 0.59), 0.36, 0.06); chassis.add(stepTrim);
      }

      hoodPivot.position.set(0, 1.02, 1.10); hoodPivot.rotation.x = 0.055;
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.07, 1.38), matPaint);
      hoodPanel.position.set(0, 0.02, 0.68); hoodPivot.add(hoodPanel);
      const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.11, 0.52), matPaint);
      scoop.position.set(0, 0.09, 0.72); scoop.castShadow = true; hoodPivot.add(scoop);
      const scoopVent = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.07, 0.05), matRubber);
      scoopVent.position.set(0, 0.09, 0.98); hoodPivot.add(scoopVent);

      const bedZ = -1.78, bedLen = 1.66;
      const bedFloor = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.14, bedLen), matRubber);
      bedFloor.position.set(0, 0.56, bedZ); chassis.add(bedFloor);
      // v16.6 Carved pickup bed side walls (upper panel above rear wheel arch + rear quarter behind arch!)
      for (const sx of [-1, 1]) {
        const wallTop = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, bedLen), matPaint);
        wallTop.position.set(sx * (w * 0.44), 1.01, bedZ); wallTop.castShadow = true; chassis.add(wallTop);
        const wallRear = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.34, 0.56), matPaint);
        wallRear.position.set(sx * (w * 0.44), 0.74, -2.32); chassis.add(wallRear);
        const railCap = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, bedLen + 0.02), matRubber);
        railCap.position.set(sx * (w * 0.44), 1.13, bedZ); chassis.add(railCap);
      }
      const tailGate = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.54, 0.12), matPaint);
      tailGate.position.set(0, 0.85, bedZ - bedLen * 0.5 + 0.06); chassis.add(tailGate);
      const tgHandle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.05), matChrome);
      tgHandle.position.set(0, 1.00, bedZ - bedLen * 0.5 - 0.01); chassis.add(tgHandle);
      const rBumper = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.18, 0.20), matChrome);
      rBumper.position.set(0, 0.48, -2.66); chassis.add(rBumper);

      const sbTop = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, w * 0.82, 8), matGunmetal);
      sbTop.rotation.z = Math.PI / 2; sbTop.position.set(0, 1.60, -1.04); chassis.add(sbTop);
      for (const sx of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.58, 8), matGunmetal);
        leg.position.set(sx * (w * 0.39), 1.32, -1.04); chassis.add(leg);
        const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.78, 8), matGunmetal);
        brace.position.set(sx * (w * 0.39), 1.34, -1.36); brace.rotation.x = 0.72; chassis.add(brace);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.42, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.94));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matGunmetal, 0.17, 0.46);
      this._addMirrors(chassis, w * 0.49, 1.24, 0.72, matRubber, matChrome, 0.22);
    }

    // ========================================================================
    // 3. SUBARU IMPREZA WRX STI (GD "Blobeye") — Low Rally Sedan, Big Scoop & STI Wing!
    // ========================================================================
    else if (vehicleId === "wrx") {
      // v16.2 EPIC REMODEL: Distinct 2005 Subaru Impreza WRX STI (Blobeye Rally Blister Sedan!)
      plateText = "WRX-STI"; hlY = 0.70; hlZ = 2.24; hlSpread = 0.63;
      const w = spec.bodyWidth;
      const matGoldAccent = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.32, metalness: 0.65 });
      const matFogYellow  = new THREE.MeshStandardMaterial({ color: 0xffd000, emissive: 0x554200, roughness: 0.18, metalness: 0.1 });
      const redFlapMat    = new THREE.MeshStandardMaterial({ color: 0xcc1f2a, roughness: 0.85 });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.16, 2.14, 0.37, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88));
      s.quadraticCurveTo(2.28, 0.58, 2.18, 0.86);
      s.lineTo(0.88, 0.95);
      s.lineTo(0.36, 1.46);
      s.quadraticCurveTo(-0.30, 1.50, -0.84, 1.42);
      s.lineTo(-1.38, 0.97);
      s.lineTo(-2.12, 0.93);
      s.lineTo(-2.18, 0.50);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.12, matPaint, 0.06, 0.07, cockpitCfg));

      const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.09, 0.34), matRubber);
      lip.position.set(0, 0.38, 2.18); chassis.add(lip);
      const lowerMouth = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 0.08), matRubber);
      lowerMouth.position.set(0, 0.52, 2.24); chassis.add(lowerMouth);

      const gCenter = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.18, 0.09), matRubber);
      gCenter.position.set(0, 0.72, 2.25); chassis.add(gCenter);
      const subBadge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.04), matGoldAccent);
      subBadge.position.set(0, 0.72, 2.29); chassis.add(subBadge);
      for (const sx of [-1, 1]) {
        const gWing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.08), matRubber);
        gWing.position.set(sx * 0.38, 0.71, 2.24); chassis.add(gWing);
        const fogBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 12), matRubber);
        fogBezel.rotation.x = Math.PI / 2; fogBezel.position.set(sx * 0.64, 0.53, 2.23); chassis.add(fogBezel);
        const fogLens = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.09, 12), matFogYellow);
        fogLens.rotation.x = Math.PI / 2; fogLens.position.set(sx * 0.64, 0.53, 2.24); chassis.add(fogLens);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 2.18), matPaint);
        skirt.position.set(sx * (w * 0.47), 0.39, -0.02); chassis.add(skirt);
      }

      hoodPivot.position.set(0, 0.96, 0.88); hoodPivot.rotation.x = 0.072;
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.06, 1.24), matPaint);
      hoodPanel.position.set(0, 0.01, 0.62); hoodPivot.add(hoodPanel);
      const scoopV = [
        [-0.38, 0.04, 0.24], [ 0.38, 0.04, 0.24],
        [-0.36, 0.04, 0.90], [ 0.36, 0.04, 0.90],
        [-0.32, 0.22, 0.86], [ 0.32, 0.22, 0.86],
        [-0.34, 0.10, 0.28], [ 0.34, 0.10, 0.28]
      ];
      const scoopF = [[4,5,7,6], [0,2,4,6], [1,7,5,3], [0,6,7,1]];
      const stiScoop = this._buildFacetedMesh(scoopV, scoopF, matPaint, 0.3);
      stiScoop.castShadow = true; hoodPivot.add(stiScoop);
      const scoopHole = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.13, 0.05), matRubber);
      scoopHole.position.set(0, 0.13, 0.87); hoodPivot.add(scoopHole);

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.07, 0.36), matPaint);
      wingBlade.position.set(0, 1.40, -2.02); wingBlade.rotation.x = 0.09; wingBlade.castShadow = true; chassis.add(wingBlade);
      const centerStab = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.28), matPaint);
      centerStab.position.set(0, 1.17, -2.02); chassis.add(centerStab);
      for (const sx of [-1, 1]) {
        const endp = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.48, 0.38), matPaint);
        endp.position.set(sx * (w * 0.44), 1.18, -2.02); endp.castShadow = true; chassis.add(endp);
      }

      for (const wDef of spec.wheels) {
        const mf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.03), redFlapMat);
        mf.position.set(wDef.x, 0.28, wDef.z - 0.44); chassis.add(mf);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.37, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.14, 0.41);
      this._addMirrors(chassis, w * 0.46, 1.10, 0.48, matRubber, matPaint, 0.18);
    }

    // ========================================================================
    // 4. MITSUBISHI LANCER EVOLUTION IX (CT9A) — Sharp Nose, Hood Vents & Carbon Wing!
    // ========================================================================
    else if (vehicleId === "evo") {
      // v16.2 EPIC REMODEL: Distinct 2006 Mitsubishi Lancer Evo IX (CT9A Shark-Nose Track Weapon!)
      plateText = "EVO-IX"; hlY = 0.67; hlZ = 2.28; hlSpread = 0.66;
      const w = spec.bodyWidth;
      const matRedLogo = new THREE.MeshStandardMaterial({ color: 0xe61c24, roughness: 0.3, metalness: 0.3 });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.22, 2.18, 0.34, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.86));
      s.lineTo(2.30, 0.60);
      s.lineTo(2.18, 0.80);
      s.lineTo(0.86, 0.91);
      s.lineTo(0.32, 1.40);
      s.lineTo(-0.90, 1.39);
      s.lineTo(-1.38, 0.95);
      s.lineTo(-2.18, 0.96);
      s.lineTo(-2.24, 0.48);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.04, 0.05, cockpitCfg));

      const cLip = new THREE.Mesh(new THREE.BoxGeometry(w * 1.00, 0.08, 0.38), matCarbon);
      cLip.position.set(0, 0.35, 2.24); chassis.add(cLip);
      const bigMouth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.36, 0.10), matRubber);
      bigMouth.position.set(0, 0.56, 2.26); chassis.add(bigMouth);
      const icCore = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.25, 0.11), matChrome);
      icCore.position.set(0, 0.54, 2.26); chassis.add(icCore);
      const noseBridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.12), matPaint);
      noseBridge.position.set(0, 0.72, 2.27); chassis.add(noseBridge);
      const mitsuBadge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), matRedLogo);
      mitsuBadge.rotation.z = Math.PI / 4; mitsuBadge.position.set(0, 0.73, 2.33); chassis.add(mitsuBadge);

      for (const sx of [-1, 1]) {
        const oilDuct = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.20, 0.08), matRubber);
        oilDuct.position.set(sx * 0.72, 0.52, 2.24); chassis.add(oilDuct);
        const canard = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.24), matCarbon);
        canard.position.set(sx * (w * 0.51), 0.48, 2.16); canard.rotation.z = sx * 0.24; chassis.add(canard);
        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.10, 2.22), matCarbon);
        skirt.position.set(sx * (w * 0.48), 0.36, 0.0); chassis.add(skirt);
      }

      hoodPivot.position.set(0, 0.92, 0.86); hoodPivot.rotation.x = 0.085;
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.055, 1.30), matPaint);
      hoodPanel.position.set(0, 0.01, 0.65); hoodPivot.add(hoodPanel);
      const mainVent = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.035, 0.36), matCarbon);
      mainVent.position.set(0, 0.04, 0.74); hoodPivot.add(mainVent);
      for (const lz of [0.64, 0.74, 0.84]) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.025, 0.03), matMetal);
        slat.position.set(0, 0.055, lz); hoodPivot.add(slat);
      }
      for (const nx of [-0.42, 0.42]) {
        const naca = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.24), matCarbon);
        naca.position.set(nx, 0.04, 0.42); hoodPivot.add(naca);
      }

      for (let vx = -0.52; vx <= 0.52; vx += 0.13) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.065, 0.15), matCarbon);
        fin.position.set(vx, 1.44, -0.84); chassis.add(fin);
      }

      const cBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.055, 0.32), matCarbon);
      cBlade.position.set(0, 1.42, -2.06); cBlade.rotation.x = 0.12; cBlade.castShadow = true; chassis.add(cBlade);
      for (const sx of [-1, 1]) {
        const sideW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.36), matPaint);
        sideW.position.set(sx * (w * 0.46), 1.20, -2.06); sideW.castShadow = true; chassis.add(sideW);
      }
      const diff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.90, 0.18, 0.22), matCarbon);
      diff.position.set(0, 0.42, -2.22); chassis.add(diff);
      for (const fx of [-0.62, -0.38, -0.14, 0.14, 0.38, 0.62]) {
        const strake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.24), matCarbon);
        strake.position.set(fx, 0.40, -2.24); chassis.add(strake);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.34, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.86));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.13, 0.38);
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
      this._traceBottomWithWheelArches(s, -2.40, 2.38, 0.42, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.06));
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
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.64, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.46, 0.82); wind.rotation.x = -0.48; chassis.add(wind);
      const rGlass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.58, 0.06), matGlass); rGlass.visible = false;
      rGlass.position.set(0, 1.44, -2.28); rGlass.rotation.x = 0.38; chassis.add(rGlass);
      for (const sx of [-1, 1]) {
        const fullGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 2.75), matGlass); fullGlass.visible = false;
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.42, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.06));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matPaint, 0.14, 0.46);
      this._addMirrors(chassis, w * 0.50, 1.32, 0.68, matRubber, matChrome, 0.24);
    }

    // ========================================================================
    // 6. LAND CRUISER 79 PICKUP
    // ========================================================================
    else if (vehicleId === "lc79") {
      plateText = "LC-79V8"; hlY = 0.82; hlZ = 2.66; hlSpread = 0.68;
      const w = spec.bodyWidth;
      const cabShape = new THREE.Shape();
      this._traceBottomWithWheelArches(cabShape, -0.32, 2.58, 0.46, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.02)); cabShape.lineTo(2.62, 1.02);
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
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.56, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.42, 0.99); wind.rotation.x = -0.25; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 0.86), matGlass); sw.visible = false;
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.46, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.02));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.18, 0.5);
      this._addMirrors(chassis, w * 0.48, 1.42, 0.78, matChrome, matChrome, 0.28);
    }

    // ========================================================================
    // 7. MITSUBISHI DELICA L300 4x4
    // ========================================================================
    else if (vehicleId === "delica") {
      plateText = "L300-4X4"; hlY = 0.84; hlZ = 2.16; hlSpread = 0.56;
      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.08, 2.06, 0.42, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.06)); s.lineTo(2.14, 0.96);
      s.lineTo(1.76, 1.66); s.quadraticCurveTo(1.56, 1.94, 1.20, 1.94);
      s.lineTo(-1.88, 1.94); s.quadraticCurveTo(-2.10, 1.88, -2.10, 1.56); s.closePath();
      chassis.add(this._extrudeSideProfile(s, 1.72, matPaint, 0.06, 0.07, cockpitCfg));
      // v16.6 Shortened two-tone lower rocker band strictly between wheel arches!
      const lowerBand = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.42, 1.32), matTrim);
      lowerBand.position.set(0, 0.64, 0.08); chassis.add(lowerBand);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.62, 0.07), matGlass); wind.visible = false;
      wind.position.set(0, 1.38, 1.97); wind.rotation.x = -0.50; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 3.25), matGlass); sg.visible = false;
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.42, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.06));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matTrim, 0.15, 0.46);
      this._addMirrors(chassis, 0.88, 1.34, 1.66, matChrome, matRubber, 0.22);
    }

    // ========================================================================
    // 8. SUZUKI JIMNY JB74
    // ========================================================================
    else if (vehicleId === "jimny") {
      plateText = "JB74-4X4"; roundHL = true; hlY = 0.78; hlZ = 1.78; hlSpread = 0.52;
      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -1.68, 1.70, 0.44, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.96)); s.lineTo(1.74, 0.96);
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
      const wind = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.50, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.32, 0.62); wind.rotation.x = -0.26; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const winS = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.44, 1.82), matGlass); winS.visible = false;
        winS.position.set(sx * 0.79, 1.32, -0.46); chassis.add(winS);
      }
      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.22, 16), matTire);
      spareTire.rotation.x = Math.PI / 2; spareTire.position.set(0, 0.94, -1.86); chassis.add(spareTire);
      hoodPivot.position.set(0, 1.02, 0.68);
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 1.04), matPaint);
      hood.position.set(0, 0.02, 0.52); hoodPivot.add(hood);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.44, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.96));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.18, 0.48);
      this._addMirrors(chassis, 0.80, 1.24, 0.52, matRubber, matRubber, 0.22);
    }

    // ========================================================================
    // 9. NISSAN GT-R R35 "GODZILLA SAFARI" — Special Rally-Spec Coupe!
    // ========================================================================
    else if (vehicleId === "gtr_r35") {
      // v16.2 CENTERPIECE REMODEL: Realistic Nissan GT-R R35 NISMO / Track-Spec Coupe!
      plateText = "GTR-R35"; hlY = 0.72; hlZ = 2.35; hlSpread = 0.74;
      const w = spec.bodyWidth;
      const matRedNismo = new THREE.MeshStandardMaterial({ color: 0xd91e26, roughness: 0.32, metalness: 0.22 });
      const matDrl      = new THREE.MeshBasicMaterial({ color: 0xf0f8ff });
      const matSmoked   = new THREE.MeshStandardMaterial({ color: 0x101318, roughness: 0.25, metalness: 0.55 });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.30, 2.26, 0.35, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.90));
      s.quadraticCurveTo(2.42, 0.54, 2.30, 0.83);
      s.lineTo(0.86, 0.96);
      s.lineTo(0.20, 1.43);
      s.quadraticCurveTo(-0.38, 1.47, -0.84, 1.41);
      s.lineTo(-1.74, 1.03);
      s.lineTo(-2.28, 1.00);
      s.lineTo(-2.35, 0.46);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.05, matPaint, 0.05, 0.06, cockpitCfg, matCarbon));

      for (const sx of [-1, 1]) {
        const hw = w * 0.5;
        // v16.5 Sculpted R35 upper shoulder haunch crease (strictly above wheel arches — zero triangle clipping!)
        const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 1.32), matPaint);
        shoulder.position.set(sx * (hw - 0.015), 0.93, -1.38); chassis.add(shoulder);
        const fShoulder = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 1.05), matPaint);
        fShoulder.position.set(sx * (hw - 0.02), 0.91, 1.44); chassis.add(fShoulder);

        const gill = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.18), matCarbon);
        gill.position.set(sx * (hw + 0.01), 0.74, 0.88); gill.rotation.x = 0.22; chassis.add(gill);
        const fBadge = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.08), matChrome);
        fBadge.position.set(sx * (hw + 0.015), 0.78, 0.74); chassis.add(fBadge);

        const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 2.34), matCarbon);
        skirt.position.set(sx * (hw + 0.01), 0.36, -0.02); chassis.add(skirt);
        const redSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.028, 2.34), matRedNismo);
        redSkirt.position.set(sx * (hw + 0.015), 0.33, -0.02); chassis.add(redSkirt);

        const bDuct = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.10), matSmoked);
        bDuct.position.set(sx * 0.74, 0.52, 2.32); chassis.add(bDuct);
        const drlStrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.20, 0.04), matDrl);
        drlStrip.position.set(sx * 0.84, 0.52, 2.36); drlStrip.rotation.z = sx * -0.18; chassis.add(drlStrip);
        const hlBrow = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.07, 0.36), matSmoked);
        hlBrow.position.set(sx * 0.74, 0.79, 2.22); hlBrow.rotation.x = 0.26; chassis.add(hlBrow);
      }

      const frontLip = new THREE.Mesh(new THREE.BoxGeometry(w * 1.02, 0.075, 0.42), matCarbon);
      frontLip.position.set(0, 0.35, 2.30); chassis.add(frontLip);
      const redLip = new THREE.Mesh(new THREE.BoxGeometry(w * 1.03, 0.028, 0.44), matRedNismo);
      redLip.position.set(0, 0.33, 2.31); chassis.add(redLip);

      const mouth = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.44, 0.10), matSmoked);
      mouth.position.set(0, 0.60, 2.35); chassis.add(mouth);
      const icTwin = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.24, 0.11), matChrome);
      icTwin.position.set(0, 0.52, 2.35); chassis.add(icTwin);
      const vTop = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.12), matChrome);
      vTop.position.set(0, 0.74, 2.37); chassis.add(vTop);
      for (const sx of [-1, 1]) {
        const vLeg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.12), matChrome);
        vLeg.position.set(sx * 0.40, 0.64, 2.37); vLeg.rotation.z = sx * 0.26; chassis.add(vLeg);
      }
      const gtrBadge = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.04), matRedNismo);
      gtrBadge.position.set(0.28, 0.74, 2.42); chassis.add(gtrBadge);
      const towLoop = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.016, 6, 12), matRedNismo);
      towLoop.rotation.x = Math.PI / 2; towLoop.position.set(0.56, 0.44, 2.44); chassis.add(towLoop);

      hoodPivot.position.set(0, 0.97, 0.86); hoodPivot.rotation.x = 0.095;
      const hoodPanel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.06, 1.34), matPaint);
      hoodPanel.position.set(0, 0.01, 0.67); hoodPivot.add(hoodPanel);
      const powerBulge = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.055, 1.06), matPaint);
      powerBulge.position.set(0, 0.05, 0.58); hoodPivot.add(powerBulge);
      for (const nx of [-0.38, 0.38]) {
        const naca = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.44), matCarbon);
        naca.position.set(nx, 0.045, 0.60); hoodPivot.add(naca);
      }

      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.055, 0.34), matCarbon);
      wingBlade.position.set(0, 1.36, -2.18); wingBlade.rotation.x = 0.11; wingBlade.castShadow = true; chassis.add(wingBlade);
      for (const sx of [-1, 1]) {
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.38, 0.22), matCarbon);
        pylon.position.set(sx * 0.46, 1.17, -2.10); chassis.add(pylon);
        const endp = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.40), matCarbon);
        endp.position.set(sx * (w * 0.49), 1.36, -2.18); chassis.add(endp);
        const endpRed = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.41), matRedNismo);
        endpRed.position.set(sx * (w * 0.49), 1.25, -2.18); chassis.add(endpRed);
      }

      const rearDiff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, 0.24), matCarbon);
      rearDiff.position.set(0, 0.42, -2.32); chassis.add(rearDiff);
      const diffRed = new THREE.Mesh(new THREE.BoxGeometry(w * 0.93, 0.028, 0.25), matRedNismo);
      diffRed.position.set(0, 0.32, -2.33); chassis.add(diffRed);
      for (const fx of [-0.32, -0.11, 0.11, 0.32]) {
        const strake = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.26), matCarbon);
        strake.position.set(fx, 0.40, -2.35); chassis.add(strake);
      }

      for (const [tx, radT] of [[-0.68, 0.14], [-0.40, 0.108], [0.40, 0.108], [0.68, 0.14]]) {
        const tMat = tx < 0 ? matTaillightL : matTaillightR;
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(radT + 0.025, radT + 0.025, 0.05, 16), matSmoked);
        bezel.rotation.x = Math.PI / 2; bezel.position.set(tx, 0.86, -2.34); chassis.add(bezel);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(radT, 0.030, 8, 18), tMat);
        ring.position.set(tx, 0.86, -2.37); chassis.add(ring);
        const core = new THREE.Mesh(new THREE.CylinderGeometry(radT * 0.62, radT * 0.62, 0.03, 12), tMat);
        core.rotation.x = Math.PI / 2; core.position.set(tx, 0.86, -2.36); chassis.add(core);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.35, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.90));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matCarbon, 0.12, 0.39);
      this._addMirrors(chassis, w * 0.49, 1.12, 0.42, matCarbon, matPaint, 0.20);
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
      this._traceBottomWithWheelArches(lowerDeck, -2.34, 2.26, 0.58, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.08));
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.58, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.08));
      this._addMirrors(chassis, w * 0.48, 1.44, 0.62, matSteel, matRubber, 0.26);
    }

    // ========================================================================
    // 11. TOYOTA FORTUNER 2.8L OVERLAND — Agile Modern SUV + Rooftop Tent!
    // ========================================================================
    else if (vehicleId === "fortuner") {
      // v16.2 EPIC REMODEL: Sleek Modern Toyota Fortuner 2.8L Overland SUV!
      plateText = "FRT-28D"; hlY = 0.84; hlZ = 2.40; hlSpread = 0.68;
      const w = spec.bodyWidth;
      const matTent     = new THREE.MeshStandardMaterial({ color: 0xb8a074, roughness: 0.90 });
      const matGlossBlk = new THREE.MeshStandardMaterial({ color: 0x15181e, roughness: 0.22, metalness: 0.55 });
      const matDrl      = new THREE.MeshBasicMaterial({ color: 0xf0f8ff });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.36, 2.32, 0.42, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.98));
      s.quadraticCurveTo(2.44, 0.70, 2.34, 0.98);
      s.lineTo(0.96, 1.05);
      s.lineTo(0.46, 1.66);
      s.lineTo(-2.04, 1.66);
      s.lineTo(-2.36, 1.08);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg, matGlossBlk));

      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.10, 0.07, 0.54), matGalv);
      skid.position.set(0, 0.37, 2.26); skid.rotation.x = 0.34; chassis.add(skid);
      const lowerGrille = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.22, 0.09), matGlossBlk);
      lowerGrille.position.set(0, 0.56, 2.40); chassis.add(lowerGrille);
      const upperGrille = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.24, 0.09), matGlossBlk);
      upperGrille.position.set(0, 0.84, 2.40); chassis.add(upperGrille);
      for (const gy of [0.78, 0.88]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(1.00, 0.028, 0.11), matChrome);
        bar.position.set(0, gy, 2.41); chassis.add(bar);
      }
      for (const sx of [-1, 1]) {
        const vCheek = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.46, 0.10), matChrome);
        vCheek.position.set(sx * 0.56, 0.70, 2.40); vCheek.rotation.z = sx * -0.14; chassis.add(vCheek);
        const fogBezel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.08), matGlossBlk);
        fogBezel.position.set(sx * 0.72, 0.56, 2.38); chassis.add(fogBezel);
        const drl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.032, 0.05), matDrl);
        drl.position.set(sx * 0.68, 0.93, 2.40); chassis.add(drl);
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 2.18), matRubber);
        step.position.set(sx * (w * 0.50), 0.38, 0.02); chassis.add(step);
        const stepEdge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.065, 2.12), matGalv);
        stepEdge.position.set(sx * (w * 0.57), 0.38, 0.02); chassis.add(stepEdge);
      }

      hoodPivot.position.set(0, 1.06, 0.96); hoodPivot.rotation.x = 0.055;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.075, 1.34), matPaint);
      hood.position.set(0, 0.02, 0.67); hoodPivot.add(hood);
      const hCreaseL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 1.18), matPaint);
      hCreaseL.position.set(-0.34, 0.06, 0.64); hoodPivot.add(hCreaseL);
      const hCreaseR = hCreaseL.clone(); hCreaseR.position.x = 0.34; hoodPivot.add(hCreaseR);

      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.05, 2.24), matMetal);
      rack.position.set(0, 1.71, -0.82); chassis.add(rack);
      const tent = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.24, 1.56), matTent);
      tent.position.set(0, 1.85, -0.96); tent.castShadow = true; chassis.add(tent);
      const awning = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.18, 8), matRubber);
      awning.rotation.x = Math.PI / 2; awning.position.set(-0.77, 1.76, -0.82); chassis.add(awning);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.08, 0.28), matPaint);
      spoiler.position.set(0, 1.68, -2.14); chassis.add(spoiler);
      const rearGarnish = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 0.07, 0.06), matChrome);
      rearGarnish.position.set(0, 0.94, -2.37); chassis.add(rearGarnish);
      const rearSkid = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.14, 0.12), matGalv);
      rearSkid.position.set(0, 0.44, -2.38); chassis.add(rearSkid);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.42, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.98));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matGlossBlk, 0.14, 0.46);
      this._addMirrors(chassis, w * 0.48, 1.26, 0.60, matGlossBlk, matPaint, 0.22);
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
      this._traceBottomWithWheelArches(s, -2.42, 2.40, 0.44, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.08));
      s.quadraticCurveTo(2.54, 0.74, 2.44, 1.08);
      s.lineTo(1.00, 1.14);
      s.lineTo(0.62, 1.82);
      s.lineTo(-2.24, 1.82);
      s.lineTo(-2.46, 1.12);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.10, matPaint, 0.06, 0.07, cockpitCfg));

      // v16.6 Shortened two-tone lower rocker cladding strictly between wheel arches!
      const lowerClad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.36, 1.82), matGoldClad);
      lowerClad.position.set(0, 0.62, 0.04); chassis.add(lowerClad);

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

      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 0.66, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.49, 0.83); wind.rotation.x = -0.46; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 2.86), matGlass); sg.visible = false;
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.44, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.08));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matGoldClad, 0.17, 0.48);
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
      this._traceBottomWithWheelArches(lowerHull, -3.68, 2.75, 0.72, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.42));
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
      matAutoBarrelHot = matMetal.clone();
      const kpvtBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.058, 2.15, 10), matAutoBarrelHot);
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.72, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.42));
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
      this._traceBottomWithWheelArches(s, -1.98, 1.94, 0.36, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88)); s.quadraticCurveTo(2.06, 0.56, 1.96, 0.84);
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
      hoodPivot.position.set(0, 0.95, 0.86); hoodPivot.rotation.x = 0.082;
      const hood = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.07, 1.06), matPaint);
      hood.position.set(0, 0.02, 0.53); hoodPivot.add(hood);
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.62, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.22, 0.60); wind.rotation.x = -0.76; chassis.add(wind);
      const rWin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.50, 0.06), matGlass); rWin.visible = false;
      rWin.position.set(0, 1.24, -1.69); rWin.rotation.x = 0.74; chassis.add(rWin);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.40, 1.72), matGlass); sg.visible = false;
        sg.position.set(sx * (w * 0.45), 1.22, -0.54); chassis.add(sg);
      }
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.36, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matRubber, 0.11, 0.4);
      this._addMirrors(chassis, w * 0.46, 1.12, 0.46, matRubber, matRubber, 0.18);
    }

    // ========================================================================
    // 13.5B. JEEP WRANGLER RUBICON — 7-Slot Grille, Flat Fenders & Rollbar!
    // ========================================================================
    else if (vehicleId === "jeep_wrangler") {
      plateText = "RUBICON"; roundHL = true; hlY = 0.86; hlZ = 2.12; hlSpread = 0.56;
      const w = spec.bodyWidth;
      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.06, 2.04, 0.48, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.04)); s.lineTo(2.10, 1.04);
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
      const wind = new THREE.Mesh(new THREE.BoxGeometry(w * 0.78, 0.58, 0.06), matGlass); wind.visible = false;
      wind.position.set(0, 1.44, 0.68); wind.rotation.x = -0.28; chassis.add(wind);
      for (const sx of [-1, 1]) {
        const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 2.15), matGlass); sg.visible = false;
        sg.position.set(sx * (w * 0.44), 1.44, -0.68); chassis.add(sg);
      }
      const spT = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.28, 16), matTire);
      spT.rotation.x = Math.PI / 2; spT.position.set(0, 1.06, -2.24); spT.castShadow = true; chassis.add(spT);
      const spR = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.30, 10), matRim);
      spR.rotation.x = Math.PI / 2; spR.position.set(0, 1.06, -2.24); chassis.add(spR);
      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.48, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.04));
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
      this._traceBottomWithWheelArches(lowerDeck, -2.52, 2.46, 0.60, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.16));
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.60, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.16));
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
      // v14.4 INDEPENDENT 2-AXIS ROTATING & ELEVATING T-72B 14.5mm ROOF MG TURRET!
      matAutoBarrelHot = matSteel.clone();
      p140RwsPivot = new THREE.Group();
      p140RwsPivot.position.set(0.58, 1.06, -0.18);
      tankTurretPivot.add(p140RwsPivot);

      const mgRing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.10, 12), matArmorDk);
      mgRing.position.y = 0.05; p140RwsPivot.add(mgRing);
      const mgPost = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.14), matSteel);
      mgPost.position.set(0, 0.18, 0.08); p140RwsPivot.add(mgPost);

      p140RwsGunPitch = new THREE.Group();
      p140RwsGunPitch.position.set(0, 0.28, 0.08);
      p140RwsPivot.add(p140RwsGunPitch);

      const mgReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.20, 0.56), matArmorDk);
      mgReceiver.position.set(0, 0, 0.10); mgReceiver.castShadow = true; p140RwsGunPitch.add(mgReceiver);
      const mgAmmoBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.30), matPaint);
      mgAmmoBox.position.set(0.18, -0.02, 0.04); p140RwsGunPitch.add(mgAmmoBox);
      const mgBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.046, 1.65, 8), matAutoBarrelHot);
      mgBarrel.rotation.x = Math.PI / 2; mgBarrel.position.set(0, 0.02, 1.15); mgBarrel.castShadow = true; p140RwsGunPitch.add(mgBarrel);
      p140RwsMuzzleTip = new THREE.Object3D();
      p140RwsMuzzleTip.position.set(0, 0.02, 2.02);
      p140RwsGunPitch.add(p140RwsMuzzleTip);

      tankCoaxFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.90, 7),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.92 })
      );
      tankCoaxFlash.rotation.x = Math.PI / 2; tankCoaxFlash.position.set(0, 0.02, 2.48); tankCoaxFlash.visible = false;
      p140RwsGunPitch.add(tankCoaxFlash);

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
      matMainBarrelHot = matSteel.clone();
      const barrelTip = new THREE.Mesh(new THREE.CylinderGeometry(0.090, 0.108, 1.98, 12), matMainBarrelHot);
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

      // v17.0 DESPERATE SHILKA REMODEL: Sloped Faceted ZSU-23-4 Turret + Parabolic 1RL33 "Gun Dish" Radar!
      shilkaTurretPivot = new THREE.Group();
      shilkaTurretPivot.position.set(0, 1.48, -0.05);
      chassis.add(shilkaTurretPivot);

      const stV = [
        [-1.18, 0.00,  1.24], [ 1.18, 0.00,  1.24],
        [-1.32, 0.00,  0.10], [ 1.32, 0.00,  0.10],
        [-1.18, 0.00, -1.26], [ 1.18, 0.00, -1.26],
        [-0.96, 0.78,  1.02], [ 0.96, 0.78,  1.02],
        [-1.10, 0.78,  0.06], [ 1.10, 0.78,  0.06],
        [-0.96, 0.78, -1.08], [ 0.96, 0.78, -1.08]
      ];
      const stF = [
        [0,1,7,6], [0,6,8,2], [2,8,10,4], [1,3,9,7], [3,5,11,9], [4,10,11,5],
        [6,7,9,8], [8,9,11,10]
      ];
      const stMesh = this._buildFacetedMesh(stV, stF, matPaint, 0.35);
      stMesh.castShadow = true;
      shilkaTurretPivot.add(stMesh);

      const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.22, 12), matArmorDk);
      cupola.position.set(-0.46, 0.88, 0.26); shilkaTurretPivot.add(cupola);
      const hatch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 0.12, 10), matArmorDk);
      hatch2.position.set(0.46, 0.84, 0.26); shilkaTurretPivot.add(hatch2);
      const optHood = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.34), matArmorDk);
      optHood.position.set(-0.56, 0.88, 0.86); shilkaTurretPivot.add(optHood);
      for (const sx of [-1, 1]) {
        const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.36, 0.94), matArmorDk);
        ammoBox.position.set(sx * 1.24, 0.34, -0.32); shilkaTurretPivot.add(ammoBox);
      }

      const rBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.26, 12), matArmorDk);
      rBase.position.set(0, 0.88, -0.78); shilkaTurretPivot.add(rBase);
      for (const sx of [-0.22, 0.22]) {
        const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.16), matArmorDk);
        yoke.position.set(sx, 1.24, -0.78); shilkaTurretPivot.add(yoke);
      }
      shilkaRadarDish = new THREE.Group();
      shilkaRadarDish.position.set(0, 1.56, -0.78);
      const rTrans = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.38), matArmorDk);
      rTrans.position.set(0, 0, -0.22); shilkaRadarDish.add(rTrans);
      const dishOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.46, 0.18, 20, 1, true), matDish);
      dishOuter.rotation.x = Math.PI / 2; dishOuter.position.z = 0.06; shilkaRadarDish.add(dishOuter);
      const dishInner = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.14, 0.12, 16), matDish);
      dishInner.rotation.x = Math.PI / 2; dishInner.position.z = -0.02; shilkaRadarDish.add(dishInner);
      const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.76, 0.032, 8, 24), matSteel);
      dishRim.position.z = 0.15; shilkaRadarDish.add(dishRim);
      for (let fi = 0; fi < 3; fi++) {
        const fa = (fi / 3) * Math.PI * 2;
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.62, 6), matSteel);
        strut.position.set(Math.cos(fa) * 0.28, Math.sin(fa) * 0.28, 0.28);
        strut.rotation.x = Math.PI / 2; strut.rotation.z = fa;
        shilkaRadarDish.add(strut);
      }
      const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.04, 0.56, 8), matSteel);
      feedHorn.rotation.x = Math.PI / 2; feedHorn.position.z = 0.30; shilkaRadarDish.add(feedHorn);
      const feedTip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), matArmorDk);
      feedTip.position.z = 0.58; shilkaRadarDish.add(feedTip);
      shilkaTurretPivot.add(shilkaRadarDish);

      shilkaGunPitch = new THREE.Group();
      shilkaGunPitch.position.set(0, 0.42, 1.12);
      shilkaTurretPivot.add(shilkaGunPitch);

      const qMantlet = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.48, 0.52), matArmorDk);
      shilkaGunPitch.add(qMantlet);

      shilkaBarrels = [];
      shilkaFlashes = [];
      var shilkaMuzzleTips = [];
      const bOffsets = [[-0.34, 0.12], [0.34, 0.12], [-0.34, -0.12], [0.34, -0.12]];
      const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.94 });
      for (const [bx, by] of bOffsets) {
        const bGrp = new THREE.Group();
        bGrp.position.set(bx, by, 0);
        const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.066, 1.18, 8), matArmorDk);
        jacket.rotation.x = Math.PI / 2; jacket.position.z = 0.62; bGrp.add(jacket);
        if (!matAutoBarrelHot) matAutoBarrelHot = matSteel.clone();
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.040, 1.70, 8), matAutoBarrelHot);
        tube.rotation.x = Math.PI / 2; tube.position.z = 1.66; tube.castShadow = true; bGrp.add(tube);
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.032, 0.22, 8), matSteel);
        cone.rotation.x = Math.PI / 2; cone.position.z = 2.56; bGrp.add(cone);
        const mTip = new THREE.Object3D();
        mTip.position.set(0, 0, 2.68);
        bGrp.add(mTip);
        shilkaMuzzleTips.push(mTip);
        const fl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.72, 6), flashMat);
        fl.rotation.x = Math.PI / 2; fl.position.z = 2.98; fl.visible = false; bGrp.add(fl);
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
      // v16.6 CLEAN 992 PORSCHE 911 DAKAR REMODEL — Carved Wheel Arches, Smooth Fastback & Roof Rack!
      plateText = "911-DKR"; roundHL = true; hlY = 0.78; hlZ = 2.16; hlSpread = 0.66;
      const w = spec.bodyWidth;
      const matRallyBlue = new THREE.MeshStandardMaterial({ color: 0x0f2d5e, roughness: 0.36, metalness: 0.32 });
      const matRallyRed  = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.40, metalness: 0.18 });
      const matRallyGold = new THREE.MeshStandardMaterial({ color: 0xebba46, roughness: 0.34, metalness: 0.55 });
      const matClad      = new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.84, metalness: 0.18 });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -2.18, 2.16, 0.38, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88));
      s.quadraticCurveTo(2.28, 0.62, 2.14, 0.84);
      s.lineTo(0.86, 0.94);
      s.lineTo(0.22, 1.42);
      s.quadraticCurveTo(-0.32, 1.45, -0.78, 1.38);
      s.lineTo(-1.82, 0.98);
      s.lineTo(-2.18, 0.92);
      s.lineTo(-2.22, 0.48);
      s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.08, matPaint, 0.06, 0.07, cockpitCfg, matRallyBlue));

      for (const sx of [-1, 1]) {
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 1.44), matRallyBlue);
        rock.position.set(sx * (w * 0.49), 0.52, 0.08); chassis.add(rock);
        const stG = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 1.48), matRallyGold);
        stG.position.set(sx * (w * 0.50), 0.72, 0.08); chassis.add(stG);
        const stR = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 1.48), matRallyRed);
        stR.position.set(sx * (w * 0.50), 0.67, 0.08); chassis.add(stR);
      }

      const fSkid = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.07, 0.44), matGalv);
      fSkid.position.set(0, 0.38, 2.12); fSkid.rotation.x = 0.28; chassis.add(fSkid);
      const rSkid = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.14, 0.14), matGalv);
      rSkid.position.set(0, 0.42, -2.22); chassis.add(rSkid);
      const lightBar = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.075, 0.06), matTaillightL);
      lightBar.position.set(0, 0.88, -2.22); chassis.add(lightBar);
      const ducktail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, 0.07, 0.28), matPaint);
      ducktail.position.set(0, 1.04, -2.08); ducktail.rotation.x = 0.22; ducktail.castShadow = true; chassis.add(ducktail);

      const basket = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.07, 1.12), matClad);
      basket.position.set(0, 1.48, -0.34); chassis.add(basket);
      for (const bx of [-0.30, 0.30]) {
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.96), new THREE.MeshStandardMaterial({ color: 0xff6b1a, roughness: 0.7 }));
        board.position.set(bx, 1.53, -0.34); chassis.add(board);
      }

      hoodPivot.position.set(0, 0.95, 0.86);
      const frunk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.74, 0.06, 1.20), matPaint);
      frunk.position.set(0, 0.01, 0.60); hoodPivot.add(frunk);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, true) : null;
      this._addWheelWellLiners(chassis, spec, matMetal, 0.38, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 0.88));
      this._addFenderFlares(chassis, spec.wheels, spec.wheelRadius, matClad, 0.13, 0.42);
      this._addMirrors(chassis, w * 0.47, 1.08, 0.42, matClad, matPaint, 0.18);
    }

    else if (vehicleId === "toyota_coaster") {
      plateText = "COASTER"; roundHL = false; hlY = 0.86; hlZ = 3.46; hlSpread = 0.78;
      const w = spec.bodyWidth;
      const matStripe = new THREE.MeshStandardMaterial({ color: 0x24577a, roughness: 0.45 });
      const matSeat   = new THREE.MeshStandardMaterial({ color: 0x3b4e63, roughness: 0.88 });
      const matRoofAc = new THREE.MeshStandardMaterial({ color: 0xdce2e8, roughness: 0.55 });

      const s = new THREE.Shape();
      this._traceBottomWithWheelArches(s, -3.46, 3.40, 0.52, spec, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.36)); s.lineTo(3.48, 1.44);
      s.lineTo(3.16, 2.54); s.lineTo(-3.36, 2.54); s.lineTo(-3.48, 1.44); s.closePath();
      chassis.add(this._extrudeSideProfile(s, w - 0.08, matPaint, 0.05, 0.05, cockpitCfg));

      // v16.3 Exterior-only side blue stripes (eliminates the solid blue box cutting through the seats!)
      for (const sx of [-1, 1]) {
        const sideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.24, 6.82), matStripe);
        sideStripe.position.set(sx * (w * 0.5 - 0.015), 1.18, -0.02); chassis.add(sideStripe);
      }
      const grille = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.08), matRubber);
      grille.position.set(0, 0.90, 3.46); chassis.add(grille);
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.24, 0.26), matRubber);
      fBump.position.set(0, 0.56, 3.48); chassis.add(fBump);
      const rBump = fBump.clone(); rBump.position.z = -3.48; chassis.add(rBump);

      for (const sx of [-1, 1]) {
        for (let wz = 1.65; wz >= -2.55; wz -= 1.05) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.92), matGlass); pane.visible = false;
          pane.position.set(sx * (w * 0.48), 1.94, wz); chassis.add(pane);
        }
      }
      const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.84, 0.06), matGlass); rearGlass.visible = false;
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
      this._addWheelWellLiners(chassis, spec, matMetal, 0.52, (cockpitCfg ? cockpitCfg.beltY - 0.06 : 1.36));
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

      // v17.0 140A4 ANGLED UFP GLACIS HOOD (Matches exact 0.20 rad UFP slope + reveals massive V12 Powerpack!)
      hoodPivot.position.set(0, 1.66, 1.72);
      hoodPivot.rotation.x = 0.20;
      const glacisPlate = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.08, 2.42), matGlacis);
      glacisPlate.position.set(0, 0.02, 1.20);
      glacisPlate.castShadow = true;
      hoodPivot.add(glacisPlate);

      const ppGrp = new THREE.Group();
      ppGrp.position.set(0, 1.05, 2.55);
      const ppMatBlk   = new THREE.MeshStandardMaterial({ color: 0x242a30, roughness: 0.55, metalness: 0.65 });
      const ppMatAlum  = new THREE.MeshStandardMaterial({ color: 0xaab4be, roughness: 0.28, metalness: 0.85 });
      const ppMatBrass = new THREE.MeshStandardMaterial({ color: 0xc8963e, roughness: 0.32, metalness: 0.78 });
      const ppMatRed   = new THREE.MeshStandardMaterial({ color: 0xcc2229, roughness: 0.35, metalness: 0.40 });
      const ppMatGlow  = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

      const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.64, 1.68), ppMatBlk);
      ppGrp.add(mainBlock);
      for (const sx of [-1, 1]) {
        const bank = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 1.56), ppMatRed);
        bank.position.set(sx * 0.56, 0.36, 0); bank.rotation.z = sx * -0.42; ppGrp.add(bank);
        for (let ci = -2; ci <= 3; ci++) {
          const inj = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 6), ppMatBrass);
          inj.position.set(sx * 0.62, 0.52, ci * 0.24 - 0.12); ppGrp.add(inj);
        }
        for (const tz of [-0.42, 0.42]) {
          const turbo = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.055, 8, 12), ppMatAlum);
          turbo.rotation.y = Math.PI / 2; turbo.position.set(sx * 0.84, 0.28, tz); ppGrp.add(turbo);
        }
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.48, 8), ppMatAlum);
        pipe.rotation.x = Math.PI / 2; pipe.position.set(sx * 0.28, 0.54, 0.06); ppGrp.add(pipe);
      }
      const radCore = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.44, 0.22), ppMatAlum);
      radCore.position.set(0, 0.14, 0.98); ppGrp.add(radCore);
      for (const fx of [-0.45, 0.45]) {
        const fanRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 6, 14), ppMatBlk);
        fanRing.position.set(fx, 0.16, 1.12); ppGrp.add(fanRing);
      }
      const ecuCore = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.32), ppMatBlk);
      ecuCore.position.set(0, 0.46, -0.58); ppGrp.add(ecuCore);
      const ecuLed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.05), ppMatGlow);
      ecuLed.position.set(0, 0.53, -0.58); ppGrp.add(ecuLed);
      chassis.add(ppGrp);

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

      matAutoBarrelHot = matSteel.clone();
      const akBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.068, 2.35, 10), matAutoBarrelHot);
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
      matMainBarrelHot = matSteel.clone();
      const bTip = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.142, 2.35, 16), matMainBarrelHot);
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
    // v15.1.4 MUSEUM-GRADE PT PINDAD KOMODO 4x4 (STANDARD APC / RECON / CPWS 30mm)
    // Authentic IRL Dimensions:
    //   • Standard APC: 5.65m L × 2.25m W × 2.15m H | 3.60m WB | 1.90m Track | 0.44m Clr
    //   • Recon:        5.50m L × 2.30m W × 2.20m H | 8.0t | Thermal/EO Mast
    //   • Turreted:     5.65m L × 2.25m W × 2.15m H | 8.2t | Cockerill CPWS 30mm
    // Sculpted Tapered Nose, Faceted Tumblehome MRAP Cabin, TNI-AD Jungle Camo
    // + Merah-Putih Insignia, Trapezoidal Mudguards, Bolted Firing Ports & Roof Suites!
    // ========================================================================
    else if (vehicleId === "komodo_std" || vehicleId === "komodo_recon" || vehicleId === "komodo_turret") {
      plateText = vehicleId === "komodo_recon" ? "KMD-RCN" : (vehicleId === "komodo_turret" ? "KMD-30" : "KOMODO");
      roundHL = false; hlY = 1.14; hlZ = spec.bodyLen * 0.485; hlSpread = 0.72;

      // 1. PROCEDURAL TNI-AD INDONESIAN JUNGLE CAMO + MERAH-PUTIH INSIGNIA TEXTURES!
      const makeTniCamoTex = (mode = "hull") => {
        const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
        const ctx = cv.getContext("2d");
        // Base TNI-AD tropical olive drab
        ctx.fillStyle = "#3f4e34"; ctx.fillRect(0, 0, 512, 256);
        const blobs = [
          { col: "#253121", pts: [[0,0],[165,0],[125,115],[15,135],[0,80]] },
          { col: "#584832", pts: [[140,0],[310,0],[275,95],[175,115],[120,65]] },
          { col: "#1c221b", pts: [[295,0],[440,0],[410,120],[280,105]] },
          { col: "#4a5d3d", pts: [[400,0],[512,0],[512,135],[390,115]] },
          { col: "#54442e", pts: [[25,120],[185,105],[195,256],[0,256]] },
          { col: "#243020", pts: [[180,100],[365,92],[345,256],[165,256]] },
          { col: "#1a2019", pts: [[340,105],[512,95],[512,256],[330,256]] },
          { col: "#61734d", pts: [[95,45],[195,58],[160,155],[75,135]] },
          { col: "#2c3a25", pts: [[290,45],[425,35],[405,145],[290,130]] }
        ];
        for (const p of blobs) {
          ctx.fillStyle = p.col; ctx.beginPath();
          ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (let k = 1; k < p.pts.length; k++) ctx.lineTo(p.pts[k][0], p.pts[k][1]);
          ctx.closePath(); ctx.fill();
        }
        // Subtle welded armor plate seams & bolt rivet rows
        ctx.strokeStyle = "rgba(12, 16, 12, 0.42)"; ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, 504, 248);
        ctx.beginPath(); ctx.moveTo(256, 0); ctx.lineTo(256, 256); ctx.moveTo(0, 128); ctx.lineTo(512, 128); ctx.stroke();
        ctx.fillStyle = "rgba(18, 22, 18, 0.55)";
        for (let rx = 18; rx < 500; rx += 26) {
          ctx.fillRect(rx, 10, 4, 4); ctx.fillRect(rx, 242, 4, 4);
        }
        if (mode === "insignia") {
          // Indonesian Merah-Putih Tactical Flag + TNI-AD KOMODO Stencil!
          ctx.fillStyle = "#d62828"; ctx.fillRect(28, 84, 72, 24);
          ctx.fillStyle = "#f4f6f8"; ctx.fillRect(28, 108, 72, 24);
          ctx.strokeStyle = "#121512"; ctx.lineWidth = 3; ctx.strokeRect(28, 84, 72, 48);
          ctx.fillStyle = "#e8ece6"; ctx.font = "900 32px monospace"; ctx.textAlign = "left";
          ctx.fillText("TNI-AD", 118, 114);
          ctx.fillStyle = "#ffd166"; ctx.font = "bold 20px monospace";
          ctx.fillText("PT PINDAD • KOMODO 4x4", 118, 144);
          ctx.fillStyle = "#d8e2d8"; ctx.font = "bold 16px monospace";
          ctx.fillText(vehicleId === "komodo_recon" ? "RECON-04" : (vehicleId === "komodo_turret" ? "CPWS-30" : "APC-01"), 385, 112);
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
      };

      const matCamo    = new THREE.MeshStandardMaterial({ map: makeTniCamoTex("hull"), color: basePaintColor.clone().lerp(new THREE.Color(0xffffff), 0.72), roughness: 0.76, metalness: 0.16, side: THREE.DoubleSide });
      const matInsig   = new THREE.MeshStandardMaterial({ map: makeTniCamoTex("insignia"), roughness: 0.74, metalness: 0.14, side: THREE.DoubleSide });
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x1e221d, roughness: 0.80, metalness: 0.42, side: THREE.DoubleSide });
      const matArmorMd = new THREE.MeshStandardMaterial({ color: 0x2e3729, roughness: 0.74, metalness: 0.24, side: THREE.DoubleSide });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x3b4248, roughness: 0.42, metalness: 0.76 });
      const matBrass   = new THREE.MeshStandardMaterial({ color: 0xd4a437, roughness: 0.36, metalness: 0.80 });
      const matLens    = new THREE.MeshStandardMaterial({ color: 0x183c52, emissive: 0x0b4b69, emissiveIntensity: 0.65, roughness: 0.12, metalness: 0.82 });
      const matGoldOpt = new THREE.MeshStandardMaterial({ color: 0xd99b26, emissive: 0x5c3804, emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.85 });
      const matGlass   = new THREE.MeshStandardMaterial({ color: 0x7aa4be, roughness: 0.08, metalness: 0.22, transparent: true, opacity: 0.24, side: THREE.DoubleSide, depthWrite: false });
      const matRedShk  = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.48, metalness: 0.45 });
      const matNet     = new THREE.MeshStandardMaterial({ color: 0x384d2c, roughness: 0.96 });

      if (!chassis.userData.extraShellMats) chassis.userData.extraShellMats = [];
      chassis.userData.extraShellMats.push(matCamo, matInsig, matArmorDk, matArmorMd, matSteel, matRubber);

      const hl = spec.bodyLen * 0.5;   // 2.825m (std/turret) or 2.75m (recon)
      const hw = spec.bodyWidth * 0.5; // 1.125m (std/turret) or 1.15m (recon)
      const roofY = spec.bodyHeight;   // Exact 2.15m (std/turret) or 2.20m (recon)

      // 2. TRUE V-SHAPED MINE-RESISTANT UNDERBELLY HULL (0.44m exact ground clearance!)
      const bellyVerts = [
        [-0.48, 0.44,  1.65], [ 0.48, 0.44,  1.65],
        [-0.48, 0.44, -2.05], [ 0.48, 0.44, -2.05],
        [-0.92, 0.88,  1.65], [ 0.92, 0.88,  1.65],
        [-0.96, 0.88, -2.25], [ 0.96, 0.88, -2.25]
      ];
      const bellyFaces = [[0,1,3,2],[0,4,6,2],[1,3,7,5],[0,1,5,4],[2,6,7,3]];
      chassis.add(this._buildFacetedMesh(bellyVerts, bellyFaces, matArmorDk, 0.35));

      // 3. ICONIC SCULPTED TAPERED ARMORED NOSE / HOOD (Narrows forward like real Komodo / Sherpa!)
      const noseZ = hl - 0.10;
      const cowlZ = 1.24;
      const hoodVerts = [
        // Lower apron (y = 0.86)
        [-0.72, 0.86, noseZ], [ 0.72, 0.86, noseZ],
        [-0.96, 0.88, cowlZ], [ 0.96, 0.88, cowlZ],
        // Upper shoulder chine (y = 1.32 front -> 1.48 cowl)
        [-0.66, 1.30, noseZ - 0.08], [ 0.66, 1.30, noseZ - 0.08],
        [-0.92, 1.48, cowlZ],        [ 0.92, 1.48, cowlZ],
        // Raised central armored power-bulge ridge on hood
        [-0.42, 1.36, noseZ - 0.14], [ 0.42, 1.36, noseZ - 0.14],
        [-0.56, 1.54, cowlZ],        [ 0.56, 1.54, cowlZ]
      ];
      const hoodFaces = [
        [0,1,5,4], [4,5,9,8],
        [0,4,6,2], [1,3,7,5],
        [4,8,10,6], [5,7,11,9],
        [8,9,11,10]
      ];
      chassis.add(this._buildFacetedMesh(hoodVerts, hoodFaces, matCamo, 0.32));

      // Slatted armored radiator grille + recessed dual LED headlights inside protective brush guards!
      const grBox = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.34, 0.10), matArmorDk);
      grBox.position.set(0, 1.12, noseZ - 0.02); chassis.add(grBox);
      for (let sl = 0; sl < 5; sl++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.026, 0.13), matSteel);
        slat.position.set(0, 1.00 + sl * 0.062, noseZ + 0.01); chassis.add(slat);
      }
      // Hood armored cooling louver pods + twin black hood latches
      for (const sx of [-0.50, 0.50]) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.68), matArmorDk);
        vent.position.set(sx, 1.46, cowlZ + 0.62); vent.rotation.x = 0.10; vent.rotation.z = -sx * 0.20; chassis.add(vent);
        const hlCage = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.14), matArmorDk);
        hlCage.position.set(sx * 1.44, 1.14, noseZ - 0.02); chassis.add(hlCage);
      }

      // 4. FACETED TUMBLEHOME ARMORED CABIN (Wide angular waist -> sloped inward ballistic upper walls!)
      const rearZ = -hl + 0.12;
      const cabVerts = [
        // Lower waist skirt (y = 0.88)
        [-0.98, 0.88, cowlZ],        [ 0.98, 0.88, cowlZ],
        [-1.04, 0.88, rearZ + 0.06], [ 1.04, 0.88, rearZ + 0.06],
        // Widest angled armor chine / beltline (y = 1.48)
        [-1.06, 1.48, cowlZ],        [ 1.06, 1.48, cowlZ],
        [-1.08, 1.48, rearZ],        [ 1.08, 1.48, rearZ],
        // Tumblehome inward-canted roof edge (y = roofY = 2.15m / 2.20m)
        [-0.86, roofY, 0.72],        [ 0.86, roofY, 0.72],
        [-0.90, roofY, rearZ + 0.24],[ 0.90, roofY, rearZ + 0.24]
      ];
      const cabFaces = [
        // Lower outward-flared armor sides
        [0,4,6,2], [1,3,7,5],
        // Upper inward-sloped tumblehome ballistic sides
        [4,8,10,6], [5,7,11,9],
        // Rear sloped armored bulkhead
        [2,6,7,3], [6,10,11,7],
        // Armored roof deck
        [8,9,11,10],
        // Front cowl closure (below windshield)
        [0,1,5,4]
      ];
      chassis.add(this._buildFacetedMesh(cabVerts, cabFaces, matCamo, 0.28));

      // Split Sloped Armored Windshield Frame + Thick Ballistic Glass + Twin Wipers!
      const wCenterY = (1.48 + roofY) * 0.5;
      const wCenterZ = (cowlZ + 0.72) * 0.5;
      const wSlope = Math.atan2(cowlZ - 0.72, roofY - 1.48);
      // v15.4.2 HOLLOW SEE-THROUGH ARMORED WINDSHIELD FRAME (Clear 1st-Person Cockpit POV!)
      const wGrp = new THREE.Group();
      wGrp.position.set(0, wCenterY, wCenterZ);
      wGrp.rotation.x = -wSlope;
      const fTopBar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.10), matArmorDk); fTopBar.position.y =  0.34; wGrp.add(fTopBar);
      const fBotBar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.10), matArmorDk); fBotBar.position.y = -0.34; wGrp.add(fBotBar);
      const fMidBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.10), matArmorDk); wGrp.add(fMidBar);
      for (const sx of [-0.84, 0.84]) {
        const fSide = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.72, 0.10), matArmorDk); fSide.position.x = sx; wGrp.add(fSide);
      }
      for (const wx of [-0.42, 0.42]) {
        const wPane = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.58, 0.04), matGlass);
        wPane.position.set(wx, 0, 0.01); wGrp.add(wPane);
        const wiper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.03), matArmorDk);
        wiper.position.set(wx - 0.08, -0.06, 0.06); wiper.rotation.z = 0.28; wGrp.add(wiper);
      }
      chassis.add(wGrp);

      // 5. BOLD TRAPEZOIDAL ARMORED FENDERS / WHEEL WELLS (Exact 2.25m / 2.30m width!)
      for (const sx of [-1, 1]) {
        for (const wz of [1.80, -1.80]) {
          // Flat-top armored fender wing over each wheel
          const fTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 1.02), matArmorDk);
          fTop.position.set(sx * (hw - 0.22), 1.30, wz); fTop.castShadow = true; chassis.add(fTop);
          // Front & rear angled trapezoidal fender flares
          const fFr = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.46), matArmorDk);
          fFr.position.set(sx * (hw - 0.22), 1.15, wz + 0.64); fFr.rotation.x = 0.72; chassis.add(fFr);
          const fRr = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.08, 0.46), matArmorDk);
          fRr.position.set(sx * (hw - 0.22), 1.15, wz - 0.64); fRr.rotation.x = -0.72; chassis.add(fRr);
          // Heavy rubber mudflap behind each wheel
          const mFlap = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.36, 0.05), matRubber);
          mFlap.position.set(sx * (hw - 0.22), 0.78, wz - 0.78); chassis.add(mFlap);
        }

        // Armored side-step running boards + tubular rock sliders between axles
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 2.24), matArmorDk);
        step.position.set(sx * (hw - 0.14), 0.68, 0.0); chassis.add(step);
        const slider = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 2.20, 8), matSteel);
        slider.rotation.x = Math.PI / 2; slider.position.set(sx * (hw - 0.02), 0.64, 0.0); chassis.add(slider);

        // Side Armored Doors: 3 Ballistic Glass Windows, External Hinges, Handles & Gun Firing Ports!
        const sideTilt = Math.atan2(1.06 - 0.88, roofY - 1.48);
        const winZs = [0.28, -0.68, -1.66];
        for (let wi = 0; wi < winZs.length; wi++) {
          const wz = winZs[wi];
          const wFrm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.68), matArmorDk);
          wFrm.position.set(sx * 0.99, 1.78, wz); wFrm.rotation.z = sx * sideTilt; chassis.add(wFrm);
          const wGl = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.30, 0.56), matGlass);
          wGl.position.set(sx * 0.995, 1.78, wz); wGl.rotation.z = sx * sideTilt; chassis.add(wGl);
          // Circular gun firing port directly below each ballistic window!
          const port = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.08, 10), matSteel);
          port.rotation.z = Math.PI / 2; port.position.set(sx * 1.07, 1.38, wz); chassis.add(port);
        }
        // External armored door hinges & grab handles
        for (const hz of [0.76, -0.20]) {
          for (const hy of [1.06, 1.42]) {
            const hng = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 0.12), matArmorDk);
            hng.position.set(sx * 1.06, hy, hz); chassis.add(hng);
          }
          const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.18), matSteel);
          hdl.position.set(sx * 1.07, 1.26, hz - 0.56); chassis.add(hdl);
        }
        // TNI-AD Merah-Putih Flag & PT Pindad Insignia Side Plate on Doors!
        const insigPl = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.46), matInsig);
        insigPl.position.set(sx * 1.065, 1.18, -0.18);
        insigPl.rotation.y = sx * Math.PI * 0.5;
        chassis.add(insigPl);

        // Roof tactical rail + LED side marker lights
        const rRail = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.08, 2.95), matArmorDk);
        rRail.position.set(sx * 0.80, roofY + 0.06, -0.88); chassis.add(rRail);
      }

      // 6. HEAVY ANGLED WINCH BUMPER, FAIRLEAD, SKID PLATE, SNORKEL, EXHAUST STACK & REAR SPARE!
      const fBump = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.92, 0.30, 0.38), matArmorDk);
      fBump.position.set(0, 0.86, hl - 0.04); fBump.castShadow = true; chassis.add(fBump);
      const winchBox = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.28), matSteel);
      winchBox.position.set(0, 0.88, hl + 0.14); chassis.add(winchBox);
      const skid = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.10, 0.86), matSteel);
      skid.position.set(0, 0.62, hl - 0.44); skid.rotation.x = -0.46; chassis.add(skid);
      // Angular front brush guard bullbar + crimson recovery shackles
      const bBarTop = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.065, 0.065), matArmorDk);
      bBarTop.position.set(0, 1.36, hl + 0.08); chassis.add(bBarTop);
      for (const bx of [-0.56, 0.56]) {
        const bPost = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.52, 0.085), matArmorDk);
        bPost.position.set(bx, 1.12, hl + 0.08); chassis.add(bPost);
        const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.026, 6, 10), matRedShk);
        shackle.position.set(bx * 0.86, 0.84, hl + 0.18); chassis.add(shackle);
      }
      const rBump = new THREE.Mesh(new THREE.BoxGeometry(spec.bodyWidth * 0.94, 0.28, 0.28), matArmorDk);
      rBump.position.set(0, 0.86, -hl + 0.04); chassis.add(rBump);

      // Right A-pillar tactical snorkel with cyclonic pre-cleaner mushroom cap
      const snorkPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.072, 1.12, 10), matArmorDk);
      snorkPipe.position.set(0.96, 1.76, 1.08); snorkPipe.rotation.x = -0.32; chassis.add(snorkPipe);
      const snorkCap = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.14, 10), matArmorDk);
      snorkCap.position.set(0.96, 2.28, 0.90); chassis.add(snorkCap);

      // Left vertical armored exhaust stack with perforated heat shield!
      const exhPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.060, 1.25, 8), matSteel);
      exhPipe.position.set(-1.08, 1.68, -2.18); chassis.add(exhPipe);
      const exhGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.92, 8, 1, true), matArmorDk);
      exhGuard.position.set(-1.08, 1.60, -2.18); chassis.add(exhGuard);

      // Rear swing-arm full-size spare tire + jerrycan + rear dual armor door seam
      const rDoorSeam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.18, 0.06), matArmorDk);
      rDoorSeam.position.set(0, 1.50, rearZ - 0.02); chassis.add(rDoorSeam);
      const spT = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.34, 16), matRubber);
      spT.rotation.x = Math.PI / 2; spT.position.set(0.44, 1.38, -hl - 0.06); spT.castShadow = true; chassis.add(spT);
      const spR = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 10), matArmorDk);
      spR.rotation.x = Math.PI / 2; spR.position.set(0.44, 1.38, -hl - 0.06); chassis.add(spR);
      const jcan = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.50, 0.20), matArmorMd);
      jcan.position.set(-0.56, 1.36, -hl + 0.02); chassis.add(jcan);

      // 7. VARIANT-SPECIFIC HERO ROOF SYSTEMS
      if (vehicleId === "komodo_std") {
        // STANDARD APC: WORKING 360° ROTATING & ELEVATING 12.7mm SMB-2 HMG CUPOLA!
        btrTurretPivot = new THREE.Group();
        btrTurretPivot.position.set(0, roofY, -0.22);
        chassis.add(btrTurretPivot);

        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.58, 0.20, 8), matArmorDk);
        ring.position.set(0, 0.10, 0); btrTurretPivot.add(ring);
        // 3-panel angled gunner shield rotating with cupola
        const shCenter = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.58, 0.07), matCamo);
        shCenter.position.set(0, 0.44, 0.48); shCenter.rotation.x = -0.14; btrTurretPivot.add(shCenter);
        const shGlass = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.09), matGlass);
        shGlass.position.set(0, 0.54, 0.47); shGlass.rotation.x = -0.14; btrTurretPivot.add(shGlass);
        for (const sx of [-1, 1]) {
          const wing = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.065), matCamo);
          wing.position.set(sx * 0.48, 0.42, 0.28); wing.rotation.y = -sx * 0.68; btrTurretPivot.add(wing);
        }
        const hatchLid = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.06, 8), matArmorDk);
        hatchLid.position.set(0, 0.52, -0.52); hatchLid.rotation.x = 1.35; btrTurretPivot.add(hatchLid);

        // Elevating Pindad SMB-2 / M2HB 12.7mm Heavy Machine Gun (Glows cherry-red on sustained fire!)
        btrGunGroup = new THREE.Group();
        btrGunGroup.visible = true;
        btrGunGroup.position.set(0, 0.54, 0.54);
        btrTurretPivot.add(btrGunGroup);

        const hmgRec = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.72), matArmorDk);
        hmgRec.position.set(0, 0, 0.06); btrGunGroup.add(hmgRec);
        const hmgJkt = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.48, 10), matArmorDk);
        hmgJkt.rotation.x = Math.PI / 2; hmgJkt.position.set(0, 0.02, 0.62); btrGunGroup.add(hmgJkt);
        matAutoBarrelHot = matSteel.clone();
        const hmgBar = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.040, 1.38, 10), matAutoBarrelHot);
        hmgBar.rotation.x = Math.PI / 2; hmgBar.position.set(0, 0.02, 1.24); hmgBar.castShadow = true; btrGunGroup.add(hmgBar);
        const hmgFlashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.036, 0.18, 8), matArmorDk);
        hmgFlashHider.rotation.x = Math.PI / 2; hmgFlashHider.position.set(0, 0.02, 1.98); btrGunGroup.add(hmgFlashHider);
        const ammoCan = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.30), matArmorMd);
        ammoCan.position.set(-0.20, -0.04, 0.02); btrGunGroup.add(ammoCan);
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.14), matBrass);
        belt.position.set(-0.11, 0.02, 0.02); btrGunGroup.add(belt);

        btrMuzzleTip = new THREE.Object3D();
        btrMuzzleTip.position.set(0, 0.02, 2.08);
        btrGunGroup.add(btrMuzzleTip);

        btrMuzzleFlash = new THREE.Mesh(
          new THREE.ConeGeometry(0.24, 0.98, 7),
          new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.94 })
        );
        btrMuzzleFlash.rotation.x = Math.PI / 2; btrMuzzleFlash.position.set(0, 0.02, 2.52); btrMuzzleFlash.visible = false;
        btrGunGroup.add(btrMuzzleFlash);

        const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 2.2, 5), matArmorDk);
        whip.position.set(-0.80, roofY + 1.10, -2.18); chassis.add(whip);
      } else if (vehicleId === "komodo_recon") {
        // RECONNAISSANCE: 3-Stage Telescoping Thermal/EO Surveillance Mast + SATCOM Radome + Roof Rack + Camo Roll!
        const mastHousing = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.36, 0.62), matArmorDk);
        mastHousing.position.set(0, roofY + 0.18, -1.32); chassis.add(mastHousing);
        const stg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.78, 12), matArmorMd);
        stg1.position.set(0, roofY + 0.72, -1.32); chassis.add(stg1);
        const stg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.10, 0.85, 12), matSteel);
        stg2.position.set(0, roofY + 1.45, -1.32); chassis.add(stg2);
        // Articulated Twin-Sensor Pan/Tilt EO/FLIR/LRF Gimbal Head
        const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.12, 0.32), matArmorDk);
        yoke.position.set(0, roofY + 1.92, -1.32); chassis.add(yoke);
        const eoPod = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.38, 0.48), matArmorDk);
        eoPod.position.set(0, roofY + 2.15, -1.32); eoPod.castShadow = true; chassis.add(eoPod);
        const flirLens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), matGoldOpt);
        flirLens.rotation.x = Math.PI / 2; flirLens.position.set(-0.16, roofY + 2.16, -1.07); chassis.add(flirLens);
        const dayLens = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 12), matLens);
        dayLens.rotation.x = Math.PI / 2; dayLens.position.set(0.16, roofY + 2.16, -1.07); chassis.add(dayLens);
        // Armored SATCOM Dome + Rolled Jungle Camo Net + Twin 2.6m Spring-Base Whip Antennas
        const satDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), matArmorMd);
        satDome.scale.set(1.0, 0.48, 1.0); satDome.position.set(0, roofY + 0.12, -0.10); chassis.add(satDome);
        const netRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.45, 10), matNet);
        netRoll.rotation.z = Math.PI / 2; netRoll.position.set(0, roofY + 0.18, 0.42); chassis.add(netRoll);
        for (const ax of [-0.82, 0.82]) {
          const springB = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.18, 8), matSteel);
          springB.position.set(ax, roofY + 0.09, -2.18); chassis.add(springB);
          const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 2.6, 5), matArmorDk);
          whip.position.set(ax, roofY + 1.42, -2.18); chassis.add(whip);
        }
      } else if (vehicleId === "komodo_turret") {
        // TURRETED VARIANT: Faceted Polyhedral John Cockerill CPWS Gen 2 (30mm Autocannon Stealth Turret!)
        btrTurretPivot = new THREE.Group();
        btrTurretPivot.position.set(0, roofY, -0.32);
        chassis.add(btrTurretPivot);

        const tRing = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.12, 16), matArmorDk);
        tRing.position.y = 0.06; btrTurretPivot.add(tRing);

        // 16-vertex faceted low-profile CPWS armored turret shroud
        const cpVerts = [
          [-0.44, 0.10,  0.88], [ 0.44, 0.10,  0.88],
          [-0.76, 0.10,  0.22], [ 0.76, 0.10,  0.22],
          [-0.74, 0.10, -0.82], [ 0.74, 0.10, -0.82],
          [-0.56, 0.10, -1.04], [ 0.56, 0.10, -1.04],
          [-0.36, 0.58,  0.66], [ 0.36, 0.58,  0.66],
          [-0.58, 0.62,  0.14], [ 0.58, 0.62,  0.14],
          [-0.56, 0.62, -0.74], [ 0.56, 0.62, -0.74],
          [-0.42, 0.58, -0.94], [ 0.42, 0.58, -0.94]
        ];
        const cpFaces = [
          [0,1,9,8], [0,8,10,2], [1,3,11,9],
          [2,10,12,4], [3,5,13,11], [4,12,14,6], [5,7,15,13], [6,14,15,7],
          [8,9,11,10], [10,11,13,12], [12,13,15,14]
        ];
        btrTurretPivot.add(this._buildFacetedMesh(cpVerts, cpFaces, matCamo, 0.40));

        // 360° Panoramic Optronic Thermal Sight + Twin 4-Tube 76mm Smoke Dischargers
        const sPod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.36), matArmorDk);
        sPod.position.set(0.42, 0.76, 0.16); btrTurretPivot.add(sPod);
        const sLens = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, 0.06), matLens);
        sLens.position.set(0.42, 0.76, 0.35); btrTurretPivot.add(sLens);
        for (const sx of [-1, 1]) {
          for (let tb = 0; tb < 3; tb++) {
            const smk = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.34, 6), matArmorDk);
            smk.rotation.x = Math.PI / 2 - 0.42; smk.rotation.z = sx * (0.18 + tb * 0.12);
            smk.position.set(sx * (0.64 + tb * 0.04), 0.42 + tb * 0.05, 0.34 - tb * 0.08);
            btrTurretPivot.add(smk);
          }
        }

        btrGunGroup = new THREE.Group();
        btrGunGroup.visible = true;
        btrGunGroup.position.set(0, 0.38, 0.80);
        btrTurretPivot.add(btrGunGroup);

        const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.56), matArmorDk);
        btrGunGroup.add(mantlet);
        const cradle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.88), matArmorMd);
        cradle.position.set(0, 0.02, 0.58); btrGunGroup.add(cradle);
        // Boldly protruding 30mm M230LF / Bushmaster Autocannon Barrel (Glows cherry-red -> orange-red on fire!)
        matAutoBarrelHot = matSteel.clone();
        const barrel30 = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.078, 2.90, 14), matAutoBarrelHot);
        barrel30.rotation.x = Math.PI / 2; barrel30.position.set(0, 0.02, 1.70); barrel30.castShadow = true; btrGunGroup.add(barrel30);
        for (let r = 0; r < 5; r++) {
          const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.06, 12), matArmorDk);
          rib.rotation.x = Math.PI / 2; rib.position.set(0, 0.02, 1.04 + r * 0.22); btrGunGroup.add(rib);
        }
        const mBrake = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.40), matAutoBarrelHot);
        mBrake.position.set(0, 0.02, 3.24); mBrake.castShadow = true; btrGunGroup.add(mBrake);
        // Coaxial 7.62mm barrel poking beside the 30mm cannon
        const coaxBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.92, 6), matSteel);
        coaxBar.rotation.x = Math.PI / 2; coaxBar.position.set(-0.20, 0.02, 0.72); btrGunGroup.add(coaxBar);

        btrMuzzleTip = new THREE.Object3D();
        btrMuzzleTip.position.set(0, 0.02, 3.46);
        btrGunGroup.add(btrMuzzleTip);

        btrMuzzleFlash = new THREE.Mesh(
          new THREE.ConeGeometry(0.32, 1.35, 7),
          new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.95 })
        );
        btrMuzzleFlash.rotation.x = Math.PI / 2; btrMuzzleFlash.position.set(0, 0.02, 4.05); btrMuzzleFlash.visible = false;
        btrGunGroup.add(btrMuzzleFlash);
      }

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
      this._addMirrors(chassis, hw + 0.04, 1.72, 1.12, matArmorDk, matRubber, 0.26);
    }

    // ========================================================================
    // v15.1.4 MUSEUM-GRADE PT PINDAD HARIMAU (KAPLAN MT) — 31.5t MEDIUM TANK!
    // Exact IRL Dimensions:
    //   • Hull: 6.95m (7.0m) L × 3.20m W (3.32m w/ modular STANAG composite skirts)
    //   • Height: 2.46m Turret Roof | 2.90m Peak Hunter-Killer Optic | 9.11m w/ 105mm Gun!
    //   • 24-Vertex Faceted Cockerill 3105 Turret, 105mm Gun w/ Slotted Muzzle Brake,
    //     TNI-AD Woodland Camo + Merah-Putih Insignia, Flexing 12-Roadwheel Tracks!
    // ========================================================================
    else if (vehicleId === "harimau") {
      plateText = "HARIMAU"; roundHL = false; hlY = 1.24; hlZ = 3.44; hlSpread = 1.18;

      // 1. PROCEDURAL TNI-AD KAVALERI TROPICAL CAMO + HARIMAU INSIGNIA TEXTURES!
      const makeHarimauTex = (mode = "hull") => {
        const cv = document.createElement("canvas"); cv.width = 512; cv.height = 256;
        const ctx = cv.getContext("2d");
        ctx.fillStyle = "#3f4f33"; ctx.fillRect(0, 0, 512, 256);
        const polys = [
          { col: "#222e1d", pts: [[0,0],[155,0],[115,120],[0,105]] },
          { col: "#57462f", pts: [[135,0],[305,0],[265,105],[125,95]] },
          { col: "#192018", pts: [[285,0],[445,0],[405,125],[270,110]] },
          { col: "#4c5f3d", pts: [[415,0],[512,0],[512,145],[385,115]] },
          { col: "#53422b", pts: [[20,115],[195,100],[180,256],[0,256]] },
          { col: "#253320", pts: [[175,105],[360,95],[350,256],[165,256]] },
          { col: "#1a2119", pts: [[340,105],[512,90],[512,256],[335,256]] },
          { col: "#64764e", pts: [[88,38],[192,54],[155,148],[68,128]] },
          { col: "#2d3c26", pts: [[305,40],[430,30],[410,140],[295,125]] }
        ];
        for (const p of polys) {
          ctx.fillStyle = p.col; ctx.beginPath();
          ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (let k = 1; k < p.pts.length; k++) ctx.lineTo(p.pts[k][0], p.pts[k][1]);
          ctx.closePath(); ctx.fill();
        }
        // Armor plate weld seams & hex bolt fasteners
        ctx.strokeStyle = "rgba(10, 14, 10, 0.45)"; ctx.lineWidth = 2;
        ctx.strokeRect(4, 4, 504, 248);
        ctx.fillStyle = "rgba(15, 18, 15, 0.62)";
        for (let bx = 18; bx < 500; bx += 32) {
          ctx.fillRect(bx, 12, 5, 5); ctx.fillRect(bx, 238, 5, 5);
        }
        if (mode === "skirt") {
          // Indonesian Merah-Putih Tactical Flag + HARIMAU KAVALERI Stencil + Yellow Chevron!
          ctx.fillStyle = "#d62828"; ctx.fillRect(34, 78, 76, 26);
          ctx.fillStyle = "#f4f6f8"; ctx.fillRect(34, 104, 76, 26);
          ctx.strokeStyle = "#121512"; ctx.lineWidth = 3; ctx.strokeRect(34, 78, 76, 52);
          ctx.fillStyle = "#f0f4ee"; ctx.font = "900 34px monospace"; ctx.textAlign = "left";
          ctx.fillText("HARIMAU", 128, 112);
          ctx.fillStyle = "#ffd166"; ctx.font = "bold 18px monospace";
          ctx.fillText("TNI-AD • KAPLAN MT 105", 128, 142);
          // Tactical Kavaleri Chevron
          ctx.strokeStyle = "#f2f5f2"; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.moveTo(415, 145); ctx.lineTo(448, 82); ctx.lineTo(481, 145); ctx.stroke();
        }
        const tex = new THREE.CanvasTexture(cv);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        return tex;
      };

      const matCamo    = new THREE.MeshStandardMaterial({ map: makeHarimauTex("hull"), color: basePaintColor.clone().lerp(new THREE.Color(0xffffff), 0.74), roughness: 0.76, metalness: 0.18 });
      const matSkirtTx = new THREE.MeshStandardMaterial({ map: makeHarimauTex("skirt"), color: basePaintColor.clone().lerp(new THREE.Color(0xffffff), 0.78), roughness: 0.74, metalness: 0.20 });
      const matArmorDk = new THREE.MeshStandardMaterial({ color: 0x1f251c, roughness: 0.80, metalness: 0.42 });
      const matArmorMd = new THREE.MeshStandardMaterial({ color: 0x333f2b, roughness: 0.74, metalness: 0.26 });
      const matSteel   = new THREE.MeshStandardMaterial({ color: 0x424a52, roughness: 0.42, metalness: 0.78 });
      const matTrack   = new THREE.MeshStandardMaterial({ color: 0x191c1f, roughness: 0.90, metalness: 0.40 });
      const matGrouser = new THREE.MeshStandardMaterial({ color: 0x4a5158, roughness: 0.58, metalness: 0.76 });
      const matLens    = new THREE.MeshStandardMaterial({ color: 0x183c52, emissive: 0x0b4b69, emissiveIntensity: 0.68, roughness: 0.12, metalness: 0.82 });
      const matGoldOpt = new THREE.MeshStandardMaterial({ color: 0xd99b26, emissive: 0x623b04, emissiveIntensity: 0.48, roughness: 0.12, metalness: 0.85 });
      const matRedShk  = new THREE.MeshStandardMaterial({ color: 0xd62828, roughness: 0.48, metalness: 0.45 });
      const matNet     = new THREE.MeshStandardMaterial({ color: 0x364a2a, roughness: 0.96 });

      if (!chassis.userData.extraShellMats) chassis.userData.extraShellMats = [];
      chassis.userData.extraShellMats.push(matCamo, matSkirtTx, matArmorDk, matArmorMd, matSteel, matRubber);

      // 2. SLEEK MODERN 6.95m WEDGE COMPOSITE HULL (Faceted Polyhedral Lower V-Hull + Deeply Sloped Upper Glacis!)
      const hullVerts = [
        // Lower V-hull mine-resistant belly (y = 0.62)
        [-1.08, 0.62,  2.76], [ 1.08, 0.62,  2.76],
        [-1.08, 0.62, -3.26], [ 1.08, 0.62, -3.26],
        // Mid nose peak & hull chines (y = 1.12 front -> 1.18 rear)
        [-1.16, 1.12,  3.48], [ 1.16, 1.12,  3.48],
        [-1.22, 1.16, -3.47], [ 1.22, 1.16, -3.47],
        // Hull upper glacis deck & engine deck (y = 1.54)
        [-1.18, 1.54,  2.05], [ 1.18, 1.54,  2.05],
        [-1.20, 1.56, -3.12], [ 1.20, 1.56, -3.12]
      ];
      const hullFaces = [
        [0,1,5,4], [4,5,9,8],           // Lower glacis & deeply sloped 72-deg upper glacis
        [8,9,11,10],                    // Flat upper hull & Cat C13 rear deck
        [2,3,7,6], [6,7,11,10],         // Rear engine bulkhead
        [0,4,6,2], [4,8,10,6],          // Left hull cheek
        [1,3,7,5], [5,7,11,9],          // Right hull cheek
        [0,2,3,1]                       // Belly plate
      ];
      chassis.add(this._buildFacetedMesh(hullVerts, hullFaces, matCamo, 0.24));

      // Central Recessed Driver's Armored Station (3 Angled Periscope Vision Blocks + Hinged Hatch!)
      const drvPod = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.16, 0.62), matArmorDk);
      drvPod.position.set(0, 1.55, 2.34); chassis.add(drvPod);
      for (const [px, ry] of [[-0.20, -0.34], [0, 0], [0.20, 0.34]]) {
        const peri = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.12), matArmorDk);
        peri.position.set(px, 1.64, 2.58 - Math.abs(px) * 0.22); peri.rotation.y = ry; chassis.add(peri);
        const pGl = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.055, 0.04), matLens);
        pGl.position.set(px, 1.64, 2.64 - Math.abs(px) * 0.22); pGl.rotation.y = ry; chassis.add(pGl);
      }
      // Bolted Spare Track Links on Upper Glacis + Front Crimson Tow Shackles + Armored Headlight Brush Guards!
      for (let st = 0; st < 4; st++) {
        const link = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.16), matTrack);
        link.position.set(-0.62 + st * 0.42, 1.24, 3.16); link.rotation.x = 0.28; chassis.add(link);
      }
      for (const sx of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 6, 10), matRedShk);
        sh.position.set(sx * 0.86, 1.06, 3.49); chassis.add(sh);
        // Armored LED Headlight Pod w/ protective cage on front sponsons
        const hlPod = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.20, 0.24), matArmorDk);
        hlPod.position.set(sx * 1.18, 1.32, 3.24); chassis.add(hlPod);
        // Wide Armored Track Sponsons & 7-Segment Modular Bolted STANAG Level 4/5 Side Composite Skirts (3.20-3.32m W!)
        const spons = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.20, 6.82), matCamo);
        spons.position.set(sx * 1.36, 1.46, 0.0); spons.castShadow = true; chassis.add(spons);
        // Continuous angled upper skirt bevel + 7 distinct bolted composite armor modules + lower rubber dust flaps!
        for (let p = 0; p < 7; p++) {
          const pz = 2.86 - p * 0.96;
          const mod = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.48, 0.91), matCamo);
          mod.position.set(sx * 1.58, 1.18, pz); mod.castShadow = true; chassis.add(mod);
          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.91), matArmorMd);
          cap.position.set(sx * 1.54, 1.44, pz); cap.rotation.z = sx * 0.34; chassis.add(cap);
          const flap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.88), matRubber);
          flap.position.set(sx * 1.62, 0.84, pz); chassis.add(flap);
        }
        // Crisp TNI-AD HARIMAU Merah-Putih Insignia Plate mounted cleanly along mid side skirts!
        const skPl = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 0.44), matSkirtTx);
        skPl.position.set(sx * 1.68, 1.18, 0.0);
        skPl.rotation.y = sx * Math.PI * 0.5;
        chassis.add(skPl);
        // Front & Rear Armored Mudguards + Coiled Steel Tow Cable on rear fender
        const fMud = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.34, 0.12), matArmorDk);
        fMud.position.set(sx * 1.36, 1.24, 3.44); fMud.rotation.x = 0.32; chassis.add(fMud);
        const rBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 1.24), matArmorMd);
        rBox.position.set(sx * 1.36, 1.72, -2.52); chassis.add(rBox);
      }

      // 3. REAR CATERPILLAR C13 (711 HP) POWERPACK DECK (Dual Cooling Fan Grilles + Exhaust Louvers!)
      const deckBase = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.08, 2.20), matArmorDk);
      deckBase.position.set(0, 1.59, -2.02); chassis.add(deckBase);
      for (const fx of [-0.56, 0.56]) {
        const fanRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.09, 16), matSteel);
        fanRing.position.set(fx, 1.63, -2.42); chassis.add(fanRing);
        const fanCore = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.10, 14), matArmorDk);
        fanCore.position.set(fx, 1.635, -2.42); chassis.add(fanCore);
      }
      for (let g = 0; g < 6; g++) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.035, 0.10), matSteel);
        slat.position.set(0, 1.645, -1.06 - g * 0.18); chassis.add(slat);
      }
      const rExhGrille = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.36, 0.18), matArmorDk);
      rExhGrille.position.set(0, 1.28, -3.48); chassis.add(rExhGrille);

      // 4. REAL FLEXING 12-ROADWHEEL TORSION-BAR CLOSED TRACK SYSTEM!
      const idlerGeo  = new THREE.CylinderGeometry(0.36, 0.36, 0.52, 14); idlerGeo.rotateZ(Math.PI / 2);
      const sprockGeo = new THREE.CylinderGeometry(0.41, 0.41, 0.54, 14); sprockGeo.rotateZ(Math.PI / 2);
      const rollerGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.48, 10); rollerGeo.rotateZ(Math.PI / 2);
      const trackIdlers = [], trackSprockets = [];
      for (const sx of [-1, 1]) {
        const idl = new THREE.Mesh(idlerGeo, matSteel);
        idl.position.set(sx * 1.36, 0.92, 3.12); chassis.add(idl); trackIdlers.push(idl);
        const spr = new THREE.Mesh(sprockGeo, matSteel);
        spr.position.set(sx * 1.36, 0.94, -3.08); chassis.add(spr); trackSprockets.push(spr);
        for (const rz of [1.65, 0.0, -1.65]) {
          const rol = new THREE.Mesh(rollerGeo, matArmorDk);
          rol.position.set(sx * 1.36, 1.18, rz); chassis.add(rol);
        }
      }
      const makeTrackSide = (sx) => {
        const tx = sx * 1.36;
        const loopSpans = [];
        for (let k = 0; k < 16; k++) {
          const seg = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 1.0), matTrack);
          seg.castShadow = true; seg.receiveShadow = true;
          root.add(seg);
          loopSpans.push(seg);
        }
        const cleats = [];
        for (let c = 0; c < 36; c++) {
          const cl = new THREE.Mesh(new THREE.BoxGeometry(0.59, 0.055, 0.12), matGrouser);
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

      // 5. ICONIC 24-VERTEX FACETED POLYHEDRAL COCKERILL 3105 TURRET!
      // Hull deck = 1.56m + Turret roof = +0.90m => Exact 2.46m turret roof height!
      tankTurretPivot = new THREE.Group();
      tankTurretPivot.position.set(0, 1.56, 0.14);
      chassis.add(tankTurretPivot);

      const turRing = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.22, 0.12, 20), matArmorDk);
      turRing.position.set(0, 0.05, 0.02); tankTurretPivot.add(turRing);

      const c3105Verts = [
        // Bottom Perimeter (y = 0.10) — Sharp undercut arrowhead cheeks & cantilevered bustle!
        [-0.50, 0.10,  1.66], [ 0.50, 0.10,  1.66],
        [-1.18, 0.10,  0.62], [ 1.18, 0.10,  0.62],
        [-1.16, 0.10, -1.06], [ 1.16, 0.10, -1.06],
        [-0.96, 0.24, -2.42], [ 0.96, 0.24, -2.42],
        // Widest Stealth Belt Chine (y = 0.48)
        [-0.48, 0.48,  1.96], [ 0.48, 0.48,  1.96],
        [-1.34, 0.50,  0.70], [ 1.34, 0.50,  0.70],
        [-1.30, 0.52, -1.08], [ 1.30, 0.52, -1.08],
        [-1.08, 0.54, -2.54], [ 1.08, 0.54, -2.54],
        // Sloped-Inward Modern Turret Roof Perimeter (y = 0.88 -> 2.44m exact roof height!)
        [-0.44, 0.84,  1.42], [ 0.44, 0.84,  1.42],
        [-1.06, 0.88,  0.54], [ 1.06, 0.88,  0.54],
        [-1.04, 0.90, -1.04], [ 1.04, 0.90, -1.04],
        [-0.92, 0.90, -2.44], [ 0.92, 0.90, -2.44]
      ];
      const c3105Faces = [
        [0,1,9,8], [8,9,17,16],
        [0,8,10,2], [8,16,18,10], [1,3,11,9], [9,11,19,17],
        [2,10,12,4], [10,18,20,12], [3,5,13,11], [11,13,21,19],
        [4,12,14,6], [12,20,22,14], [5,7,15,13], [13,15,23,21],
        [6,14,15,7], [14,22,23,15],
        [16,17,19,18], [18,19,21,20], [20,21,23,22],
        [0,2,3,1], [2,4,5,3], [4,6,7,5]
      ];
      tankTurretPivot.add(this._buildFacetedMesh(c3105Verts, c3105Faces, matCamo, 0.30));

      // Modular Turret Cheek Appliqué Armor, Twin 4-Tube 76mm Smoke Launchers, LWR/PULAT Pods & Bustle Basket!
      for (const sx of [-1, 1]) {
        const chMod = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.40, 1.18), matArmorMd);
        chMod.position.set(sx * 0.98, 0.56, 1.26); chMod.rotation.y = sx * 0.58; chMod.rotation.z = -sx * 0.28; chMod.castShadow = true;
        tankTurretPivot.add(chMod);
        // 4 individual angled 76mm smoke grenade dispenser tubes per cheek!
        for (let tb = 0; tb < 4; tb++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.048, 0.38, 8), matArmorDk);
          tube.rotation.x = Math.PI / 2 - 0.44; tube.rotation.z = sx * (0.20 + tb * 0.11);
          tube.position.set(sx * (1.28 + tb * 0.03), 0.56 + (tb % 2) * 0.09, 0.62 - tb * 0.09);
          tankTurretPivot.add(tube);
        }
        // ASELSAN PULAT-style APS launcher box + corner Laser Warning Receiver (LWR)
        const pulat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.34), matArmorDk);
        pulat.position.set(sx * 1.24, 0.52, -1.65); pulat.rotation.y = -sx * 0.18; tankTurretPivot.add(pulat);
        const lwr = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.16), matSteel);
        lwr.position.set(sx * 0.88, 0.95, 0.44); tankTurretPivot.add(lwr);
      }

      // 12-Round Bustle Autoloader Roof Blow-Out Panels + Tubular Steel Rear Stowage Basket + Rolled Camo Tarp!
      for (const bx of [-0.42, 0.42]) {
        const bo = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.06, 1.18), matArmorDk);
        bo.position.set(bx, 0.92, -1.72); tankTurretPivot.add(bo);
      }
      const bFloor = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.06, 0.62), matArmorDk);
      bFloor.position.set(0, 0.42, -2.86); tankTurretPivot.add(bFloor);
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.42, 0.06), matSteel);
      bBack.position.set(0, 0.63, -3.16); tankTurretPivot.add(bBack);
      for (const bx of [-0.96, 0.96]) {
        const bSide = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.62), matSteel);
        bSide.position.set(bx, 0.63, -2.86); tankTurretPivot.add(bSide);
      }
      const tarpRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 1.56, 10), matNet);
      tarpRoll.rotation.z = Math.PI / 2; tarpRoll.position.set(0, 0.62, -2.86); tankTurretPivot.add(tarpRoll);

      // Commander's Hunter-Killer Panoramic Thermal Sight (Reaches exact 2.90m overall tank height!)
      const hkPed = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.24, 12), matArmorDk);
      hkPed.position.set(-0.56, 1.00, 0.24); tankTurretPivot.add(hkPed);
      const hkGimbal = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.26, 0.34), matArmorDk);
      hkGimbal.position.set(-0.56, 1.22, 0.24); hkGimbal.castShadow = true; tankTurretPivot.add(hkGimbal);
      const hkOpt1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), matGoldOpt);
      hkOpt1.position.set(-0.62, 1.22, 0.42); tankTurretPivot.add(hkOpt1);
      const hkOpt2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.14, 0.08), matLens);
      hkOpt2.position.set(-0.49, 1.22, 0.42); tankTurretPivot.add(hkOpt2);

      // Gunner's Armored Primary Thermal Sight Hood + Crew Hatches + Crosswind Met Mast + Twin Whips!
      const gSight = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.48), matArmorDk);
      gSight.position.set(0.56, 0.96, 0.74); tankTurretPivot.add(gSight);
      const gLens = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), matLens);
      gLens.position.set(0.56, 0.96, 0.99); tankTurretPivot.add(gLens);
      for (const hx of [-0.52, 0.52]) {
        const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.09, 12), matArmorMd);
        hatch.position.set(hx, 0.94, -0.46); tankTurretPivot.add(hatch);
      }
      const metMast = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.56, 6), matSteel);
      metMast.position.set(-0.78, 1.18, -2.26); tankTurretPivot.add(metMast);
      for (const ax of [-0.92, 0.92]) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.022, 2.35, 5), matArmorDk);
        ant.position.set(ax, 2.02, -2.35); tankTurretPivot.add(ant);
      }

      // Independent 2-Axis Roof 7.62mm MG on Commander Cupola
      matAutoBarrelHot = matSteel.clone();
      p140RwsPivot = new THREE.Group();
      p140RwsPivot.position.set(0.56, 0.94, -0.36);
      tankTurretPivot.add(p140RwsPivot);
      const mgRing = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.24, 0.10, 12), matArmorDk);
      mgRing.position.y = 0.05; p140RwsPivot.add(mgRing);
      p140RwsGunPitch = new THREE.Group();
      p140RwsGunPitch.position.set(0, 0.24, 0.06);
      p140RwsPivot.add(p140RwsGunPitch);
      const mgRec = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.48), matArmorDk);
      p140RwsGunPitch.add(mgRec);
      const mgAmmo = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.24), matArmorMd);
      mgAmmo.position.set(0.15, -0.02, 0.02); p140RwsGunPitch.add(mgAmmo);
      const mgBar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.030, 1.25, 8), matAutoBarrelHot);
      mgBar.rotation.x = Math.PI / 2; mgBar.position.set(0, 0.02, 0.85); p140RwsGunPitch.add(mgBar);
      p140RwsMuzzleTip = new THREE.Object3D(); p140RwsMuzzleTip.position.set(0, 0.02, 1.52); p140RwsGunPitch.add(p140RwsMuzzleTip);
      tankCoaxFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.75, 7),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0.92 })
      );
      tankCoaxFlash.rotation.x = Math.PI / 2; tankCoaxFlash.position.set(0, 0.02, 1.92); tankCoaxFlash.visible = false;
      p140RwsGunPitch.add(tankCoaxFlash);

      // 6. COCKERILL 105mm HIGH-PRESSURE RIFLED CANNON (Exact 9.11m total vehicle length!)
      tankGunPitch = new THREE.Group();
      tankGunPitch.position.set(0, 0.46, 1.56);
      tankTurretPivot.add(tankGunPitch);

      const mant = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.48, 0.68), matArmorDk);
      tankGunPitch.add(mant);
      // Coaxial 7.62mm barrel port right beside the main gun mantlet
      const coaxPort = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.55, 6), matSteel);
      coaxPort.rotation.x = Math.PI / 2; coaxPort.position.set(-0.30, 0.02, 0.45); tankGunPitch.add(coaxPort);

      tankBarrelSlide = new THREE.Group();
      tankGunPitch.add(tankBarrelSlide);
      // Thermal Shroud Sleeve + Clamping Bands
      const bBase = new THREE.Mesh(new THREE.CylinderGeometry(0.106, 0.132, 2.15, 16), matCamo);
      bBase.rotation.x = Math.PI / 2; bBase.position.z = 1.08; bBase.castShadow = true; tankBarrelSlide.add(bBase);
      for (const cz of [0.65, 1.45, 3.05, 3.85]) {
        const clmp = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.07, 14), matArmorDk);
        clmp.rotation.x = Math.PI / 2; clmp.position.z = cz; tankBarrelSlide.add(clmp);
      }
      // Eccentric Cylindrical Bore Evacuator (Fume Extractor)
      const bEvac = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.64, 16), matArmorMd);
      bEvac.rotation.x = Math.PI / 2; bEvac.position.set(0, 0.015, 2.42); bEvac.castShadow = true; tankBarrelSlide.add(bEvac);
      // Forward Thermal-Sleeved Rifled Tube (Glows cherry-red on repeated fire!)
      matMainBarrelHot = matSteel.clone();
      const bTip = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.098, 2.25, 16), matMainBarrelHot);
      bTip.rotation.x = Math.PI / 2; bTip.position.z = 3.82; bTip.castShadow = true; tankBarrelSlide.add(bTip);
      // Muzzle Reference Sensor (MRS) Collimator + Iconic Multi-Baffle Slotted Rectangular Muzzle Brake!
      const mrs = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.11, 0.08), matArmorDk);
      mrs.position.set(0, 0.11, 4.78); tankBarrelSlide.add(mrs);
      const mBrakeCore = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.24, 0.64), matArmorDk);
      mBrakeCore.position.set(0, 0, 5.22); mBrakeCore.castShadow = true; tankBarrelSlide.add(mBrakeCore);
      for (const bz of [5.04, 5.22, 5.40]) {
        const baffle = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.07), matSteel);
        baffle.position.set(0, 0, bz); tankBarrelSlide.add(baffle);
      }

      tankMainFlash = new THREE.Mesh(
        new THREE.ConeGeometry(0.80, 3.1, 9),
        new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.94 })
      );
      tankMainFlash.rotation.x = Math.PI / 2; tankMainFlash.position.z = 6.95; tankMainFlash.visible = false;
      tankBarrelSlide.add(tankMainFlash);

      cockpit = KK.CockpitBuilder ? KK.CockpitBuilder.buildCockpit(chassis, vehicleId, spec, isLocal, false) : null;
    }

    // ========================================================================
    // LOWER-BODY DYNAMIC MUD SPLATTER PANELS + BACKFIRE EXHAUST FLAME
    // ========================================================================
    const halfLen = spec.bodyLen * 0.5, halfW = spec.bodyWidth * 0.5;
    // v15.9.1 Procedural Lower-Body Mud Splotches (Alpha-blended decals flush with body — zero slab!)
    const matMudSplotch = new THREE.MeshStandardMaterial({
      map: this._getMudSplotchTex(), transparent: true, opacity: 0.0,
      roughness: 0.96, metalness: 0.02, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2
    });
    for (const sx of [-1, 1]) {
      const spPlane = new THREE.Mesh(new THREE.PlaneGeometry(spec.bodyLen * 0.78, 0.42), matMudSplotch);
      spPlane.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      spPlane.position.set(sx * (halfW - 0.01), 0.56, 0);
      chassis.add(spPlane);
    }
    const spRear = new THREE.Mesh(new THREE.PlaneGeometry(spec.bodyWidth * 0.86, 0.38), matMudSplotch);
    spRear.rotation.y = Math.PI;
    spRear.position.set(0, 0.58, -halfLen - 0.006);
    chassis.add(spRear);

    const exhaustTips = this._buildDynamicExhaust(chassis, vehicleId, vState, spec) || [];
    // v16.0 DYNAMIC MULTI-TIP BACKFIRE FLAMES (One flame cone per actual exhaust tip!)
    const flameGeo = new THREE.ConeGeometry(0.095, 0.48, 8);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8c1a, transparent: true, opacity: 0.92 });
    const flameMeshes = [];
    const tipList = (exhaustTips && exhaustTips.length > 0) ? exhaustTips : [{ x: -0.42, y: 0.36, z: -halfLen - 0.14, dir: "rear" }];
    for (let ti = 0; ti < tipList.length; ti++) {
      const tp = tipList[ti];
      const fm = new THREE.Mesh(flameGeo, flameMat);
      if (tp.dir === "left") fm.rotation.z = Math.PI / 2;
      else fm.rotation.x = -Math.PI / 2;
      fm.position.set(tp.x, tp.y, tp.z);
      fm.visible = false;
      chassis.add(fm);
      flameMeshes.push(fm);
    }
    const flameMesh = flameMeshes[0];
    // v16.1 Zero-FPS-Cost Ground-Cast Headlight & Brake Glow Quads (No extra SpotLights!)
    const gTex = this._getGroundGlowTex();
    const hlGroundGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.bodyWidth * 2.2, 8.5),
      new THREE.MeshBasicMaterial({ map: gTex, color: 0xfff4d6, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    hlGroundGlow.rotation.x = -Math.PI / 2;
    hlGroundGlow.position.set(0, 0.08, halfLen + 4.4);
    hlGroundGlow.visible = false;
    chassis.add(hlGroundGlow);

    const blGroundGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(spec.bodyWidth * 1.45, 2.8),
      new THREE.MeshBasicMaterial({ map: gTex, color: 0xff1e1e, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    blGroundGlow.rotation.x = -Math.PI / 2;
    blGroundGlow.position.set(0, 0.08, -halfLen - 1.35);
    blGroundGlow.visible = false;
    chassis.add(blGroundGlow);

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
    const engineBay = this._buildEngineBay(vehicleId, vState, spec, hoodPivot);
    if (engineBay) chassis.add(engineBay);
    // v16.2.1 exhaustTips initialized earlier before flameMeshes!

    const xrayGroup = new THREE.Group();
    xrayGroup.visible = false;
    chassis.add(xrayGroup);

    const makeXrayMat = () => new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.90, depthTest: false });
    const xrayParts = {};
    const addXPart = (key, geo, px, py, pz, rx = 0, rz = 0) => {
      const mat = makeXrayMat();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (rx) m.rotation.x = rx;
      if (rz) m.rotation.z = rz;
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
    } else if (spec.isHarimau) {
      // AUTHENTIC PINDAD HARIMAU (KAPLAN MT) X-RAY INTERNALS + 12-ROUND BUSTLE AUTOLOADER!
      addXPart("engine",      new THREE.BoxGeometry(1.48, 0.68, 1.35), 0, 1.04, -1.85);
      addXPart("radiator",    new THREE.BoxGeometry(1.85, 0.16, 0.95), 0, 1.44, -2.42);
      addXPart("intercooler", new THREE.BoxGeometry(1.20, 0.26, 0.42), 0, 1.12, -1.18);
      addXPart("gearbox",     new THREE.BoxGeometry(1.82, 0.42, 0.56), 0, 0.98, -2.76);
      addXPart("transfer",    new THREE.BoxGeometry(2.48, 0.32, 0.36), 0, 0.94, -3.04);
      addXPart("driveshaft",  new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8), 0, 0.98, -2.35, Math.PI / 2);

      const torsionMat = makeXrayMat();
      xrayParts.tieRods = torsionMat;
      for (let k = 0; k < 6; k++) {
        const tz = spec.wheels[k * 2].z;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 2.74, 6), torsionMat);
        bar.rotation.z = Math.PI / 2; bar.position.set(0, 0.76, tz); bar.renderOrder = 10; xrayGroup.add(bar);
      }

      const turX = new THREE.Group(); turX.position.set(0, 1.56, 0.14); xrayGroup.add(turX);
      const matBreech = new THREE.MeshBasicMaterial({ color: 0x2de08b, transparent: true, opacity: 0.94, depthTest: false });
      const matRack   = new THREE.MeshBasicMaterial({ color: 0xffbe0b, transparent: true, opacity: 0.92, depthTest: false });
      const matRam    = new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.92, depthTest: false });

      const breechX = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 1.08), matBreech);
      breechX.position.set(0, 0.46, 0.85); breechX.renderOrder = 12; turX.add(breechX);
      const barrelX = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, 5.2, 8), matBreech);
      barrelX.rotation.x = Math.PI / 2; barrelX.position.set(0, 0.46, 3.85); barrelX.renderOrder = 11; turX.add(barrelX);

      // 12-Round Ready-Rack in Cockerill 3105 Rear Bustle (1-to-1 shell removal!)
      const rackShells = [];
      for (let r = 0; r < 12; r++) {
        const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.052, 0.98, 6), matRack);
        sh.rotation.x = Math.PI / 2;
        sh.position.set(-0.77 + r * 0.14, 0.48, -1.68);
        sh.renderOrder = 11; turX.add(sh); rackShells.push(sh);
      }
      const ramShell = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.060, 1.04, 8), new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.98, depthTest: false }));
      ramShell.rotation.x = Math.PI / 2; ramShell.position.set(0, 0.46, -1.15); ramShell.visible = false; ramShell.renderOrder = 13; turX.add(ramShell);
      const ramRod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.25), matRam);
      ramRod.position.set(0, 0.46, -1.95); ramRod.renderOrder = 12; turX.add(ramRod);
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
      // v15.6 ACCURATE X-RAY ENGINE & DRIVETRAIN POSITIONS (Matches Actual Engine Bays!)
      const isKomodo = (vehicleId === "komodo_std" || vehicleId === "komodo_recon" || vehicleId === "komodo_turret");
      const isRear911 = (vehicleId === "porsche_dakar" || !!spec.rearEngine);
      const isCabOver = (vehicleId === "toyota_coaster" || vehicleId === "kamaz" || vehicleId === "uaz_buhanka");
      let engZ, engY = 0.66, radZ = halfLen * 0.86, radY = 0.68, gbZ, tfZ, dsZ = -0.10, dsLen = spec.bodyLen * 0.52;

      if (isKomodo) {
        // Pindad Komodo: Front armored sloped hood engine bay (cowlZ = 1.24 .. front = +2.85)!
        engZ = 1.88; engY = 1.12;
        radZ = 2.52; radY = 1.16;
        gbZ  = 0.92; tfZ  = 0.15;
        dsZ  = -0.85; dsLen = 2.05;
      } else if (isRear911) {
        // Porsche 911 Dakar: Rear-mounted Flat-6 behind rear axle + front radiator!
        engZ = -1.52; engY = 0.68;
        radZ =  1.88; radY = 0.58;
        gbZ  = -0.78; tfZ  = -0.18;
        dsZ  =  0.55; dsLen = 1.55;
      } else if (spec.id === "btr80") {
        engZ = -2.25; engY = 0.95;
        radZ = -2.95; radY = 1.15;
        gbZ  = -1.25; tfZ  = -0.45;
        dsZ  =  0.20; dsLen = 3.6;
      } else if (spec.id === "maz537") {
        engZ = 0.95; engY = 1.25;
        radZ = 2.45; radY = 1.35;
        gbZ  = -0.15; tfZ  = -0.95;
        dsZ  = -1.20; dsLen = 4.2;
      } else if (isCabOver) {
        engZ = halfLen * 0.54; engY = 0.72;
        radZ = halfLen * 0.86; radY = 0.78;
        gbZ  = engZ - 0.88; tfZ = engZ - 1.55;
      } else {
        // Standard Front-Engine Cars & Trucks: Anchor directly inside the actual hood bay!
        engZ = (hoodPivot && hoodPivot.position.z > 0.2) ? (hoodPivot.position.z + 0.42) : (halfLen * 0.60);
        engY = (hoodPivot && hoodPivot.position.y > 0.5) ? Math.max(0.56, hoodPivot.position.y - 0.28) : 0.66;
        radZ = Math.min(halfLen * 0.88, engZ + 0.52);
        radY = engY + 0.02;
        gbZ  = engZ - 0.82;
        tfZ  = engZ - 1.45;
      }

      addXPart("engine",      new THREE.BoxGeometry(isKomodo ? 0.78 : 0.68, isKomodo ? 0.62 : 0.54, isKomodo ? 0.96 : 0.84), 0, engY, engZ);
      addXPart("radiator",    new THREE.BoxGeometry(spec.bodyWidth * 0.54, 0.44, 0.14), 0, radY, radZ);
      addXPart("intercooler", new THREE.BoxGeometry(spec.bodyWidth * 0.46, 0.22, 0.12), 0, radY - 0.22, radZ + (isRear911 ? 0.06 : 0.08));
      addXPart("gearbox",     new THREE.BoxGeometry(0.46, 0.36, 0.68), 0, engY - 0.12, gbZ);
      addXPart("transfer",    new THREE.BoxGeometry(0.44, 0.32, 0.44), 0, engY - 0.18, tfZ);
      addXPart("driveshaft",  new THREE.CylinderGeometry(0.07, 0.07, dsLen, 8), 0, isKomodo ? 0.64 : 0.36, dsZ, Math.PI / 2);
      addXPart("tieRods",     new THREE.BoxGeometry(spec.bodyWidth * 0.84, 0.09, 0.09), 0, isKomodo ? 0.58 : 0.30, spec.wheels[0].z);
      addXPart("crankshaft",  new THREE.CylinderGeometry(0.08, 0.08, 0.78, 8), 0, engY - 0.14, engZ, Math.PI / 2);
      const rearWz = spec.wheels[spec.wheels.length - 1].z;
      addXPart("rearAxle",    new THREE.CylinderGeometry(0.055, 0.055, spec.bodyWidth * 0.86, 8), 0, isKomodo ? 0.58 : 0.32, rearWz, 0, Math.PI / 2);
      const xraySuspList = [];
      const xrayBrakeList = [];
      for (let wi = 0; wi < spec.wheels.length; wi++) {
        const wd = spec.wheels[wi];
        const cornerKey = (wd.z >= 0) ? (wd.x < 0 ? "shockFL" : "shockFR") : (wd.x < 0 ? "shockRL" : "shockRR");
        const sMat = makeXrayMat();
        const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.58, 6), sMat);
        const baseY = isKomodo ? 0.86 : 0.56;
        sk.position.set(wd.x * 0.82, baseY, wd.z);
        sk.renderOrder = 10;
        xrayGroup.add(sk);
        xraySuspList.push({ mesh: sk, mat: sMat, baseY, partKey: cornerKey });

        // v16.7 X-Ray Brake Rotor/Caliper Disc at each wheel!
        const bMat = makeXrayMat();
        const brk = new THREE.Mesh(new THREE.CylinderGeometry(spec.wheelRadius * 0.52, spec.wheelRadius * 0.52, 0.12, 10), bMat);
        brk.rotation.z = Math.PI / 2;
        brk.position.set(wd.x * 0.90, (wd.y || 0.25) + 0.08, wd.z);
        brk.renderOrder = 10;
        xrayGroup.add(brk);
        xrayBrakeList.push({ mesh: brk, mat: bMat });
      }
      xrayParts._suspList = xraySuspList;
      xrayParts._brakeList = xrayBrakeList;
    }

    // v15.9 Tracked Tank X-Ray: Left & Right Destroyable Track Runs!
    if (spec.isTracked) {
      const trkLen = (spec.bodyLen || 6.4) * 0.88;
      const trkX = (spec.bodyWidth || 3.2) * 0.44;
      addXPart("trackL", new THREE.BoxGeometry(0.54, 0.72, trkLen), -trkX, 0.48, 0);
      addXPart("trackR", new THREE.BoxGeometry(0.54, 0.72, trkLen),  trkX, 0.48, 0);
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
        // v15.6.3 TRUE HOLLOW TIRE (openEnded=true + Sidewall Rings) so Open-Spoke Rims & Brake Discs are 100% Visible!
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(wRad, wRad, wWid, 20, 1, true), matTire);
        tire.rotation.z = Math.PI / 2; tire.castShadow = true; tireRubberGroup.add(tire);
        const brandMat = this._getTireSidewallMat(vState && vState.tireBrand);
        const swRing = new THREE.Mesh(new THREE.RingGeometry(wRad * 0.54, wRad * 1.008, 20), brandMat);
        swRing.rotation.y = sideSign > 0 ? Math.PI / 2 : -Math.PI / 2;
        swRing.position.x = sideSign * (wWid * 0.502);
        tireRubberGroup.add(swRing);
        // Inner tire sidewall ring (keeps inside of tire closed while leaving the rim center completely open!)
        const swInner = new THREE.Mesh(new THREE.RingGeometry(wRad * 0.54, wRad * 1.008, 20), matTire);
        swInner.rotation.y = sideSign > 0 ? -Math.PI / 2 : Math.PI / 2;
        swInner.position.x = -sideSign * (wWid * 0.50);
        tireRubberGroup.add(swInner);

        const lugGeo = new THREE.BoxGeometry(wWid * 0.92, 0.048 * rScale, wRad * 0.19);
        for (let l = 0; l < 12; l++) {
          const ang = (l / 12) * Math.PI * 2;
          const lug = new THREE.Mesh(lugGeo, matTire);
          lug.position.set(0, Math.cos(ang) * (wRad - 0.005), Math.sin(ang) * (wRad - 0.005));
          lug.rotation.x = ang; tireRubberGroup.add(lug);
        }

        // v15.6 OPEN-SPOKE CUSTOM RIMS + VISIBLE GLOWING BRAKE ROTOR DISC!
        const innerBarrel = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.57, wRad * 0.57, wWid * 0.96, 16, 1, true), matBarrelIn);
        innerBarrel.rotation.z = Math.PI / 2; spinGroup.add(innerBarrel);
        const outerLip = new THREE.Mesh(new THREE.TorusGeometry(wRad * 0.56, 0.032 * rScale, 6, 18), matRim);
        outerLip.rotation.y = Math.PI / 2; outerLip.position.x = sideSign * (wWid * 0.44); spinGroup.add(outerLip);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.16, wRad * 0.16, wWid * 0.55, 10), matChrome);
        hub.rotation.z = Math.PI / 2; hub.position.x = sideSign * (wWid * 0.16); spinGroup.add(hub);

        const rotorDisc = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.44, wRad * 0.44, 0.036, 16), matBrakeRotor);
        rotorDisc.rotation.z = Math.PI / 2;
        rotorDisc.position.x = sideSign * (wWid * 0.22);
        spinGroup.add(rotorDisc);

        const rimStyle = (vState && vState.rimStyle) || (KK.getDefaultRimStyle ? KK.getDefaultRimStyle(vehicleId) : "sport5");
        const isDish   = (rimStyle === "oz_rally" || rimStyle === "soviet_dish" || rimStyle === "aero_disc" || rimStyle === "turbofan");
        const isSplitY = (rimStyle === "mesh" || rimStyle === "bbs_lm" || rimStyle === "rpf1" || rimStyle === "split_y10" || rimStyle === "rotiform");
        const isBead   = (rimStyle === "beadlock12" || rimStyle === "humvee_mil" || rimStyle === "steel_mil");
        const spokeCnt = rimStyle === "advan_sa3r" ? 3 : (rimStyle === "wire_classic" ? 16 : (rimStyle === "turbine" ? 12
          : (rimStyle === "ce28n" || rimStyle === "mesh" || rimStyle === "bbs_lm" || rimStyle === "split_y10" ? 10
          : (rimStyle === "watanabe" || rimStyle === "steel_mil" || rimStyle === "rotiform" ? 8
          : (rimStyle === "forged_7" ? 7 : (rimStyle === "te37" || rimStyle === "rpf1" ? 6 : 5))))));
        const spokeW   = (rimStyle === "wire_classic" ? 0.022 : (isSplitY ? 0.034 : (rimStyle === "advan_sa3r" ? 0.115
          : (rimStyle === "steel_mil" || rimStyle === "watanabe" ? 0.085 : (rimStyle === "te37" || rimStyle === "meister_s1" ? 0.072 : 0.056))))) * rScale;
        const dishInset = (rimStyle === "meister_s1" || rimStyle === "deep_star5" || rimStyle === "ssr_prof") ? 0.36 : 0.41;

        if (isDish) {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(wRad * 0.56, wRad * 0.56, 0.035, 16), matRim);
          disc.rotation.z = Math.PI / 2;
          disc.position.set(sideSign * (wWid * 0.41), 0, 0);
          spinGroup.add(disc);
        }
        for (let sp = 0; sp < spokeCnt; sp++) {
          const ang = (sp / spokeCnt) * Math.PI * 2;
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.038, wRad * 0.44, spokeW), matRim);
          spoke.position.set(sideSign * (wWid * dishInset), Math.cos(ang) * (wRad * 0.32), Math.sin(ang) * (wRad * 0.32));
          const twist = isSplitY ? (sp % 2 === 0 ? 0.24 : -0.24) : (rimStyle === "turbine" ? 0.35 : 0);
          spoke.rotation.x = ang + twist;
          spinGroup.add(spoke);
        }
        if (isBead) {
          const boltCnt = rimStyle === "beadlock12" ? 12 : 8;
          for (let bi = 0; bi < boltCnt; bi++) {
            const ba = (bi / boltCnt) * Math.PI * 2;
            const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032 * rScale, 0.032 * rScale), matChrome);
            bolt.position.set(sideSign * (wWid * 0.45), Math.cos(ba) * (wRad * 0.53), Math.sin(ba) * (wRad * 0.53));
            spinGroup.add(bolt);
          }
        }
        if (rimStyle === "centerlock") {
          const hexNut = new THREE.Mesh(new THREE.CylinderGeometry(0.095 * rScale, 0.095 * rScale, 0.06, 6), matBrake);
          hexNut.rotation.z = Math.PI / 2;
          hexNut.position.set(sideSign * (wWid * 0.44), 0, 0);
          spinGroup.add(hexNut);
        }
      }

      const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.075, wRad * 0.26, wRad * 0.19), matBrake);
      caliper.position.set(sideSign * (wWid * 0.24), 0.04, wRad * 0.34); camberPivot.add(caliper);

      const strutMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 1.0, 8), matSpring); root.add(strutMesh);
      const armMesh = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 1.0), matMetal); root.add(armMesh);
      wheelAssemblies.push({ def: wDef, mount, steerPivot, camberPivot, spinGroup, tireRubberGroup, strutMesh, armMesh, radius: wRad });
    }

    const rig = {
      root, chassis, hoodPivot, cockpit, wheelAssemblies, shilkaGunPitch, shilkaMuzzleTips: (typeof shilkaMuzzleTips !== 'undefined' ? shilkaMuzzleTips : null), cargoGroup, cargoMeshes, strapGroup, smokePuffs, spec, p140RwsGunPitch, p140RwsMuzzleTip, btrMuzzleTip, btrGunGroup, tankGunPitch, shilkaGunPitch,
      matPaint, matTire, matDirtOverlay, matHeadlight, matTaillight, matBlinker, matReverse, matLedStrip,
      snorkelGroup, bullbarGroup, lightbarGroup, spotL, spotR, ledSpot, remoteHeadLight, hlGlows, ledGlow, flameMesh,
      hoodOpenTarget: 0, hoodOpenCurrent: 0, baseColor: basePaintColor, _baseRimColor: matRim.color.clone(),

      applyUpgrades(state) {
        if (!state) return;
        this.baseColor.set(state.paintColor || spec.color);
        const stw = state.stowedUpgrades || {};
        snorkelGroup.visible = !!state.upgrades.snorkel && !stw.snorkel;
        bullbarGroup.visible = !!state.upgrades.bullbar;
        lightbarGroup.visible = !!state.upgrades.ledLightbar;
        if (btrGunGroup) btrGunGroup.visible = (vehicleId === "komodo_turret" || vehicleId === "komodo_std") || !!state.upgrades.btrTurret;
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
        if (this._hoodBaseRotX === undefined) this._hoodBaseRotX = hoodPivot.rotation.x;
          hoodPivot.rotation.x = this._hoodBaseRotX - this.hoodOpenCurrent * 1.1;
        if (engineBay) {
          engineBay.visible = (this.hoodOpenCurrent > 0.02 || !!state.xrayActive);
          if (engineBay.visible && engineBay.userData.basePos) {
            const bp = engineBay.userData.basePos;
            if (state.engineRunning) {
              const tVib = performance.now() * 0.045;
              const amp = 0.004 + Math.min(0.008, (state.rpm || 800) / 450000);
              engineBay.position.set(bp.x + Math.sin(tVib * 1.7) * amp, bp.y + Math.cos(tVib * 2.3) * amp, bp.z);
              if (engineBay.userData.fan) engineBay.userData.fan.rotation.z += dt * (8.0 + (state.rpm || 800) * 0.004);
            } else {
              engineBay.position.copy(bp);
            }
          }
        }
        const bHeat = Math.max(0, Math.min(1, state.brakeHeat || 0));
        if (matBrakeRotor) {
          if (bHeat > 0.12) {
            matBrakeRotor.emissiveIntensity = (bHeat - 0.12) * 2.6;
            matBrakeRotor.emissive.setHex(bHeat > 0.55 ? 0xff6b1a : 0xff2200);
          } else if (matBrakeRotor.emissiveIntensity !== 0.0) {
            matBrakeRotor.emissiveIntensity = 0.0;
          }
        }

        // Dynamic Body & Tire Dirt Accumulation!
        const dirt = Math.max(0, Math.min(1, state.dirtLevel || 0));
        matPaint.color.copy(this.baseColor).lerp(mudBrownColor, dirt * 0.46);
        matPaint.roughness = 0.36 + dirt * 0.58;
        matTire.color.copy(cleanTireColor).lerp(mudBrownColor, dirt * 0.72);
        if (matRim && this._baseRimColor) matRim.color.copy(this._baseRimColor).lerp(mudBrownColor, dirt * 0.55);
        matDirtOverlay.opacity = dirt * 0.76;
        if (matMudSplotch) matMudSplotch.opacity = dirt * 0.92;

        // Real-Time X-Ray Mechanical View ([X] Hold)!
        const isXray = !!state.xrayActive;
        xrayGroup.visible = isXray;
        if (isXray && xrayParts._suspList) {
          const xhObj = state.xrayHealth || {};
          const wOffs = state.wheelOffsets || [];
          for (let si = 0; si < xrayParts._suspList.length; si++) {
            const it = xrayParts._suspList[si];
            const sHp = (xhObj[it.partKey] !== undefined) ? xhObj[it.partKey] : (xhObj.shocksAvg !== undefined ? xhObj.shocksAvg : 100);
            const flashRedS = (Math.sin(performance.now() * 0.018) > 0) ? 0xff1a1a : 0x4a0000;
            const sCol = sHp <= 10 ? flashRedS : (sHp > 65 ? 0x2de08b : (sHp > 30 ? 0xffbe0b : 0xff3b3b));
            it.mat.color.setHex(sCol);
            const comp = wOffs[si] || 0;
            it.mesh.position.y = it.baseY + comp * 0.55;
            it.mesh.scale.y = Math.max(0.55, Math.min(1.35, 1.0 - comp * 0.7));
          }
          if (xrayParts._brakeList) {
            const bHp = xhObj.brakePads !== undefined ? xhObj.brakePads : 100;
            const flashRedB = (Math.sin(performance.now() * 0.018) > 0) ? 0xff1a1a : 0x4a0000;
            const bCol = (state.brakeHeat > 0.55) ? 0xff6b1a : (bHp <= 10 ? flashRedB : (bHp > 65 ? 0x2de08b : (bHp > 30 ? 0xffbe0b : 0xff3b3b)));
            for (let bi = 0; bi < xrayParts._brakeList.length; bi++) {
              xrayParts._brakeList[bi].mat.color.setHex(bCol);
            }
          }
        }
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
          if (xrayParts.trackL)      xrayParts.trackL.color.setHex(hColor(state.trackL !== undefined ? state.trackL : 100));
          if (xrayParts.trackR)      xrayParts.trackR.color.setHex(hColor(state.trackR !== undefined ? state.trackR : 100));
          matSpring.color.setHex(hColor(xh.shocksAvg));
        } else {
          matSpring.color.setHex(0xe63946);
        }

        if (cockpit) cockpit.update(dt, state);
        if (btrTurretPivot) {
          if (btrGunGroup) btrGunGroup.visible = (vehicleId === "komodo_turret" || vehicleId === "komodo_std") || (state.hasBtrTurret !== undefined ? !!state.hasBtrTurret : btrGunGroup.visible);
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
        hlGroundGlow.visible = !!state.headlights;
        blGroundGlow.visible = !!state.braking;
        const bfOn = !!(state.backfireTimer && state.backfireTimer > 0);
        for (let fi = 0; fi < flameMeshes.length; fi++) {
          const fm = flameMeshes[fi];
          fm.visible = bfOn && (flameMeshes.length === 1 || Math.random() < 0.85);
          if (fm.visible) {
            const sc = 0.65 + Math.random() * 0.95;
            fm.scale.set(sc, sc * 1.25, sc);
          }
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

        // v14.4 VISIBLE RED-HOT GLOWING BARRELS ON REPEATED FIRE (Day & Night, Local & Remote Tanks!)
        const applyHotGlow = (mat, heatVal) => {
          if (!mat || !mat.emissive) return;
          const h = Math.max(0, Math.min(1, heatVal || 0));
          if (h > 0.14) {
            const norm = (h - 0.14) / 0.86;
            mat.emissive.setRGB(1.0, Math.min(0.45, norm * norm * 0.48), Math.max(0, (norm - 0.72) * 0.35));
            mat.emissiveIntensity = norm * norm * 3.4;
          } else {
            mat.emissive.setRGB(0, 0, 0);
            mat.emissiveIntensity = 0;
          }
        };
        applyHotGlow(matMainBarrelHot, state.barrelHeat);
        applyHotGlow(matAutoBarrelHot, state.autoBarrelHeat !== undefined ? state.autoBarrelHeat : state.barrelHeat);

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