// ============================================================================
// js/cockpit.js (v13.7) — Modular 5-Archetype Interiors, See-Through Hollow
// Cabins, Live Canvas Gauges, Rotating Steering Wheel, Driver Avatar & Wipers!
// ============================================================================
window.KK = window.KK || {};

KK.CockpitBuilder = {
  // Exact per-car cockpit geometry & archetype metadata!
  // Coordinate system: +Z = forward, +Y = up, +X = driver's LEFT, -X = driver's RIGHT
  CONFIGS: {
    // --- JDM SPORT / RALLY ARCHETYPE (RHD: driver on -X!) ---
    gtr_r35:       { arch: "jdm",      rhd: true,  beltY: 0.96, roofY: 1.46, seatZ: -0.08, yFloor: 0.56, cabW: 1.60, windZ: 0.55, windY: 1.21, windTilt: -0.92, special: "r35_mfd" },
    wrx:           { arch: "jdm",      rhd: true,  beltY: 0.94, roofY: 1.46, seatZ: -0.02, yFloor: 0.56, cabW: 1.54, windZ: 0.60, windY: 1.20, windTilt: -0.78 },
    evo:           { arch: "jdm",      rhd: true,  beltY: 0.92, roofY: 1.42, seatZ:  0.00, yFloor: 0.56, cabW: 1.54, windZ: 0.60, windY: 1.18, windTilt: -0.76 },

    // --- OVERLAND & TRAIL 4x4 ARCHETYPE ---
    hilux:         { arch: "overland", rhd: true,  beltY: 1.00, roofY: 1.62, seatZ:  0.18, yFloor: 0.66, cabW: 1.64, windZ: 0.86, windY: 1.30, windTilt: -0.62 },
    fortuner:      { arch: "overland", rhd: true,  beltY: 1.04, roofY: 1.66, seatZ:  0.10, yFloor: 0.68, cabW: 1.64, windZ: 0.72, windY: 1.36, windTilt: -0.64 },
    patrol_y61:    { arch: "overland", rhd: true,  beltY: 1.14, roofY: 1.82, seatZ:  0.14, yFloor: 0.72, cabW: 1.68, windZ: 0.83, windY: 1.49, windTilt: -0.46 },
    lc79:          { arch: "overland", rhd: true,  beltY: 1.08, roofY: 1.74, seatZ:  0.34, yFloor: 0.72, cabW: 1.60, windZ: 0.97, windY: 1.41, windTilt: -0.26 },
    rangerover:    { arch: "overland", rhd: true,  beltY: 1.12, roofY: 1.78, seatZ:  0.12, yFloor: 0.72, cabW: 1.72, windZ: 0.80, windY: 1.45, windTilt: -0.48, special: "wood_trim" },
    jimny:         { arch: "overland", rhd: true,  beltY: 1.02, roofY: 1.62, seatZ: -0.10, yFloor: 0.66, cabW: 1.38, windZ: 0.60, windY: 1.32, windTilt: -0.26 },
    jeep_wrangler: { arch: "overland", rhd: false, beltY: 1.10, roofY: 1.78, seatZ:  0.02, yFloor: 0.70, cabW: 1.56, windZ: 0.68, windY: 1.44, windTilt: -0.28, special: "rollbar" },

    // --- SOVIET METAL & HEAVY TRUCK ARCHETYPE (LHD: driver on +X!) ---
    uaz452:        { arch: "soviet",   rhd: false, beltY: 1.18, roofY: 1.98, seatZ:  1.12, yFloor: 0.82, cabW: 1.68, windZ: 2.04, windY: 1.52, windTilt: -0.14, splitWind: true },
    delica:        { arch: "soviet",   rhd: true,  beltY: 1.12, roofY: 1.94, seatZ:  1.08, yFloor: 0.78, cabW: 1.56, windZ: 1.94, windY: 1.40, windTilt: -0.46 },
    kamaz:         { arch: "soviet",   rhd: false, beltY: 1.56, roofY: 2.48, seatZ:  2.25, yFloor: 1.32, cabW: 2.18, windZ: 3.35, windY: 1.96, windTilt: -0.14, splitWind: true },
    maz537:        { arch: "soviet",   rhd: false, beltY: 1.90, roofY: 2.78, seatZ:  3.18, yFloor: 1.56, cabW: 2.48, windZ: 4.38, windY: 2.30, windTilt: -0.05, splitWind: true },

    // --- WIDEBODY MILITARY & ARMOR ARCHETYPE ---
    humvee:        { arch: "military", rhd: false, beltY: 1.14, roofY: 1.74, seatZ:  0.10, yFloor: 0.78, cabW: 1.88, windZ: 0.72, windY: 1.46, windTilt: -0.30, splitWind: true },
    mega_cruiser:  { arch: "military", rhd: true,  beltY: 1.22, roofY: 1.94, seatZ:  0.18, yFloor: 0.82, cabW: 1.86, windZ: 0.88, windY: 1.58, windTilt: -0.36, splitWind: true },
    btr80:         { arch: "military", rhd: false, beltY: 1.48, roofY: 2.02, seatZ:  1.75, yFloor: 1.10, cabW: 1.92, windZ: 2.58, windY: 1.84, windTilt: -0.45, special: "btr_visor" },
    t72:           { arch: "military", rhd: false, beltY: 1.54, roofY: 1.98, seatZ:  1.95, yFloor: 0.96, cabW: 1.76, windZ: 2.48, windY: 1.70, windTilt: -0.25, special: "t72_periscope" },
    bm21:          { arch: "soviet",   rhd: false, beltY: 1.92, roofY: 2.52, seatZ:  1.65, yFloor: 1.32, cabW: 2.04, windZ: 2.38, windY: 2.22, windTilt: -0.18 },
    shilka:        { arch: "military", rhd: false, beltY: 1.44, roofY: 1.88, seatZ:  1.80, yFloor: 0.92, cabW: 1.74, windZ: 2.32, windY: 1.62, windTilt: -0.25, special: "t72_periscope" },
    porsche_dakar: { arch: "jdm",      rhd: false, beltY: 0.94, roofY: 1.34, seatZ: -0.10, yFloor: 0.56, cabW: 1.64, windZ: 0.72, windY: 1.14, windTilt: -0.58 },
    toyota_coaster:{ arch: "overland", rhd: true,  beltY: 1.42, roofY: 2.52, seatZ:  2.42, yFloor: 0.98, cabW: 1.94, windZ: 3.18, windY: 1.98, windTilt: -0.18 },
    pzkpfw_140a4:  { arch: "military", rhd: false, beltY: 1.72, roofY: 2.22, seatZ: -1.60, yFloor: 1.05, cabW: 1.96, windZ: 1.95, windY: 1.92, windTilt: -0.22, special: "t72_periscope" },

    // --- SPECIALS ARCHETYPE ---
    lambo_tractor: { arch: "special",  rhd: false, beltY: 1.68, roofY: 3.12, seatZ: -0.95, yFloor: 1.56, cabW: 1.80, windZ: -0.05, windY: 2.38, windTilt: -0.08, special: "tractor" },
    dacia_sandero: { arch: "special",  rhd: false, beltY: 0.94, roofY: 1.50, seatZ:  0.00, yFloor: 0.56, cabW: 1.52, windZ: 0.60, windY: 1.22, windTilt: -0.76, special: "sandero" },
    komodo_std:    { arch: "military", rhd: true,  beltY: 1.38, roofY: 2.08, seatZ:  0.35, yFloor: 0.96, cabW: 1.92, windZ: 1.15, windY: 1.66, windTilt: -0.45 },
    komodo_recon:  { arch: "military", rhd: true,  beltY: 1.40, roofY: 2.12, seatZ:  0.32, yFloor: 0.98, cabW: 1.94, windZ: 1.10, windY: 1.68, windTilt: -0.45 },
    komodo_turret: { arch: "military", rhd: true,  beltY: 1.38, roofY: 2.08, seatZ:  0.35, yFloor: 0.96, cabW: 1.92, windZ: 1.15, windY: 1.66, windTilt: -0.45 },
    harimau:       { arch: "military", rhd: false, beltY: 1.48, roofY: 1.94, seatZ:  2.10, yFloor: 0.96, cabW: 1.72, windZ: 2.85, windY: 1.62, windTilt: -0.22, special: "t72_periscope" }
  },

  // v18.3 PER-VEHICLE MULTI-SEAT PASSENGER LAYOUT (Supports 1–12+ visual passenger avatars, e.g. Toyota Coaster!)
  getPassengerSeats(vehicleId) {
    const cfg = this.getConfig(vehicleId);
    const zC = cfg.seatZ, yF = cfg.yFloor, w = cfg.cabW;
    const drvX = (cfg.special === "t72_periscope") ? 0 : ((cfg.rhd ? -1 : 1) * (w * 0.25));
    const pasX = -drvX;
    const seats = [];

    if (vehicleId === "toyota_coaster") {
      // 12-seat bus layout: front shotgun + 5 double-aisle rows down the bus cabin!
      seats.push({ x: pasX, y: yF + 0.09, z: zC - 0.06 });
      for (let r = 0; r < 5; r++) {
        const rz = zC - 1.10 - r * 0.92;
        seats.push({ x: -w * 0.29, y: yF + 0.09, z: rz });
        seats.push({ x:  w * 0.29, y: yF + 0.09, z: rz });
      }
      seats.push({ x: 0, y: yF + 0.09, z: zC - 5.65 });
      return seats;
    }
    if (vehicleId === "uaz452" || vehicleId === "delica") {
      // 6-seat van layout: front shotgun + 2 middle + 3 rear bench
      seats.push({ x: pasX, y: yF + 0.09, z: zC - 0.06 });
      seats.push({ x: -w * 0.27, y: yF + 0.09, z: zC - 1.05 });
      seats.push({ x:  w * 0.27, y: yF + 0.09, z: zC - 1.05 });
      seats.push({ x: -w * 0.30, y: yF + 0.09, z: zC - 2.02 });
      seats.push({ x:  0,        y: yF + 0.09, z: zC - 2.02 });
      seats.push({ x:  w * 0.30, y: yF + 0.09, z: zC - 2.02 });
      return seats;
    }
    if (vehicleId === "btr80" || vehicleId === "komodo_std" || vehicleId === "komodo_recon" || vehicleId === "komodo_turret" || vehicleId === "humvee" || vehicleId === "mega_cruiser") {
      // 5-seat armored troop / tactical layout
      seats.push({ x: pasX, y: yF + 0.09, z: zC - 0.06 });
      seats.push({ x: -w * 0.28, y: yF + 0.09, z: zC - 0.96 });
      seats.push({ x:  w * 0.28, y: yF + 0.09, z: zC - 0.96 });
      seats.push({ x: -w * 0.28, y: yF + 0.09, z: zC - 1.80 });
      seats.push({ x:  w * 0.28, y: yF + 0.09, z: zC - 1.80 });
      return seats;
    }
    if (cfg.special === "t72_periscope") {
      // Tank commander/loader crew spots
      seats.push({ x: 0.45, y: yF + 0.48, z: zC - 0.95 });
      seats.push({ x: -0.45, y: yF + 0.48, z: zC - 0.95 });
      return seats;
    }
    if (vehicleId === "porsche_dakar" || vehicleId === "lc79" || vehicleId === "kamaz" || vehicleId === "maz537" || vehicleId === "bm21" || vehicleId === "lambo_tractor") {
      // Classic 2-seat cab (1 passenger seat)
      seats.push({ x: pasX, y: yF + 0.09, z: zC - 0.06 });
      return seats;
    }
    // Standard 4-seat cars & SUVs (shotgun + rear left + rear right)
    seats.push({ x: pasX, y: yF + 0.09, z: zC - 0.06 });
    seats.push({ x: -w * 0.26, y: yF + 0.09, z: zC - 0.88 });
    seats.push({ x:  w * 0.26, y: yF + 0.09, z: zC - 0.88 });
    return seats;
  },

  getConfig(vehicleId) {
    return this.CONFIGS[vehicleId] || this.CONFIGS.uaz452;
  },

  _clipPolygonX(pts, boundX, keepGreater) {
    const out = [];
    const n = pts.length;
    if (n < 3) return out;
    const isIn = (p) => keepGreater ? (p.x >= boundX - 1e-4) : (p.x <= boundX + 1e-4);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const aIn = isIn(a), bIn = isIn(b);
      if (aIn && bIn) {
        out.push({ x: b.x, y: b.y });
      } else if (aIn && !bIn) {
        const t = (boundX - a.x) / (Math.abs(b.x - a.x) < 1e-6 ? 1e-6 : (b.x - a.x));
        out.push({ x: boundX, y: a.y + (b.y - a.y) * t });
      } else if (!aIn && bIn) {
        const t = (boundX - a.x) / (Math.abs(b.x - a.x) < 1e-6 ? 1e-6 : (b.x - a.x));
        out.push({ x: boundX, y: a.y + (b.y - a.y) * t });
        out.push({ x: b.x, y: b.y });
      }
    }
    return out;
  },

  _extrudePts(pts, width, mat, bevelSize, bevelThick, offsetX = 0) {
    if (!pts || pts.length < 3) return null;
    // Deduplicate near-identical consecutive vertices & reject near-zero-area slivers
    const clean = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const prev = clean.length ? clean[clean.length - 1] : null;
      if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.004) clean.push(p);
    }
    if (clean.length >= 2 && Math.hypot(clean[0].x - clean[clean.length - 1].x, clean[0].y - clean[clean.length - 1].y) <= 0.004) {
      clean.pop();
    }
    if (clean.length < 3) return null;
    let area2 = 0;
    for (let i = 0; i < clean.length; i++) {
      const a = clean[i], b = clean[(i + 1) % clean.length];
      area2 += a.x * b.y - b.x * a.y;
    }
    if (Math.abs(area2) * 0.5 < 0.004) return null;

    const sh = new THREE.Shape();
    sh.moveTo(clean[0].x, clean[0].y);
    for (let i = 1; i < clean.length; i++) sh.lineTo(clean[i].x, clean[i].y);
    sh.closePath();
    const innerDepth = Math.max(0.03, width - bevelThick * 2);
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: innerDepth, bevelEnabled: bevelThick > 0.005, bevelThickness: bevelThick,
      bevelSize: Math.min(bevelSize, 0.04), bevelSegments: 2, curveSegments: 8
    });
    geo.translate(0, 0, -innerDepth * 0.5);
    geo.rotateY(-Math.PI / 2);
    if (offsetX !== 0) geo.translate(offsetX, 0, 0);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  },

  _clipPolygonBelowY(pts, maxY) {
    const out = [];
    const n = pts.length;
    if (n < 3) return out;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const aIn = a.y <= maxY + 1e-4;
      const bIn = b.y <= maxY + 1e-4;
      if (aIn && bIn) {
        out.push({ x: b.x, y: b.y });
      } else if (aIn && !bIn) {
        const t = (maxY - a.y) / Math.max(1e-6, b.y - a.y);
        out.push({ x: a.x + (b.x - a.x) * t, y: maxY });
      } else if (!aIn && bIn) {
        const t = (maxY - a.y) / Math.min(-1e-6, b.y - a.y);
        out.push({ x: a.x + (b.x - a.x) * t, y: maxY });
        out.push({ x: b.x, y: b.y });
      }
    }
    return out;
  },

  _makePillar(ax, ay, az, bx, by, bz, radius, mat) {
    const a = new THREE.Vector3(ax, ay, az);
    const b = new THREE.Vector3(bx, by, bz);
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 2, len, radius * 2), mat);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    return mesh;
  },

  // TRUE SEE-THROUGH HOLLOW GREENHOUSE BUILDER!
  buildHollowExtrudedBody(shape, width, matPaint, bevelSize, bevelThick, cfg, matPillarOverride = null) {
    const group = new THREE.Group();
    const beltY = cfg.beltY;
    const rawPts = shape.getPoints(12);

    const lowerPts = this._clipPolygonBelowY(rawPts, beltY);
    if (lowerPts.length >= 3) {
      // TRUE HOLLOW LOWER CABIN TUB! Carves out [zCabRear .. zCabFront] so gauges, dash, wheel & seats sit in open air!
      const zCabFront = cfg.seatZ + 0.72;
      let zMinLower = cfg.seatZ - 0.65;
      for (let i = 0; i < lowerPts.length; i++) if (lowerPts[i].x < zMinLower) zMinLower = lowerPts[i].x;
      const isLongCab = (cfg.seatZ - zMinLower) > 1.85;
      const zCabRear  = isLongCab ? (zMinLower + 0.36) : (cfg.seatZ - 0.65);
      const frontPts = this._clipPolygonX(lowerPts, zCabFront, true);
      const rearPts  = this._clipPolygonX(lowerPts, zCabRear, false);
      const midPts   = this._clipPolygonX(this._clipPolygonX(lowerPts, zCabRear, true), zCabFront, false);

      // v15.6.1 TRUE HOLLOW ENGINE BAY! Carves out front bay between left/right fenders & front nose!
      let zNoseMax = zCabFront;
      for (let i = 0; i < frontPts.length; i++) if (frontPts[i].x > zNoseMax) zNoseMax = frontPts[i].x;
      if (frontPts.length >= 3 && (zNoseMax - zCabFront) > 0.72) {
        const zNoseCut = zNoseMax - 0.24;
        const nosePts = this._clipPolygonX(frontPts, zNoseCut, true);
        const bayPts  = this._clipPolygonX(frontPts, zNoseCut, false);
        const mNose = this._extrudePts(nosePts, width, matPaint, bevelSize * 0.7, bevelThick * 0.7, 0);
        if (mNose) group.add(mNose);
        if (bayPts.length >= 3) {
          const fenderThick = Math.min(0.28, width * 0.16);
          const fOff = Math.max(0.25, width * 0.5 - fenderThick * 0.5);
          const fL = this._extrudePts(bayPts, fenderThick, matPaint, 0.02, 0.02, -fOff);
          const fR = this._extrudePts(bayPts, fenderThick, matPaint, 0.02, 0.02,  fOff);
          if (fL) group.add(fL);
          if (fR) group.add(fR);
          const bayFloorPts = this._clipPolygonBelowY(bayPts, cfg.yFloor + 0.06);
          if (!this._matBayDark) this._matBayDark = new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.92, metalness: 0.2 });
          const mBayFloor = this._extrudePts(bayFloorPts, width - fenderThick * 1.6, this._matBayDark, 0.01, 0.01, 0);
          if (mBayFloor) group.add(mBayFloor);
        }
      } else {
        const mFront = this._extrudePts(frontPts, width, matPaint, bevelSize, bevelThick, 0);
        if (mFront) group.add(mFront);
      }
      const mRear = this._extrudePts(rearPts, width, matPaint, bevelSize, bevelThick, 0);
      if (mRear) group.add(mRear);
      if (midPts.length >= 3) {
        const doorThick = 0.13;
        const sideOffset = Math.max(0.25, width * 0.5 - doorThick * 0.5);
        const mL = this._extrudePts(midPts, doorThick, matPaint, 0.015, 0.01, -sideOffset);
        const mR = this._extrudePts(midPts, doorThick, matPaint, 0.015, 0.01,  sideOffset);
        if (mL) group.add(mL);
        if (mR) group.add(mR);
        const floorPts = this._clipPolygonBelowY(midPts, cfg.yFloor + 0.02);
        const mFloor = this._extrudePts(floorPts, Math.max(0.60, width - 0.58), matPaint, 0.01, 0.01, 0);
        if (mFloor) group.add(mFloor);
      }
    }

    const upperPts = rawPts.filter((p) => p.y > beltY + 0.03);
    if (upperPts.length >= 2) {
      let roofY = beltY + 0.55;
      for (const p of upperPts) if (p.y > roofY) roofY = p.y;

      const beltBand = rawPts.filter((p) => Math.abs(p.y - beltY) < 0.22);
      const roofBand = upperPts.filter((p) => p.y >= roofY - 0.16);

      const crossingsZ = [];
      for (let i = 0; i < rawPts.length; i++) {
        const a = rawPts[i], b = rawPts[(i + 1) % rawPts.length];
        if ((a.y <= beltY && b.y > beltY) || (a.y > beltY && b.y <= beltY)) {
          const t = (beltY - a.y) / (b.y - a.y);
          crossingsZ.push(a.x + (b.x - a.x) * t);
        }
      }
      const zFrontBot = crossingsZ.length >= 2 ? Math.max(...crossingsZ) : (beltBand.length ? Math.max(...beltBand.map((p) => p.x)) : 0.85);
      const zRearBot  = crossingsZ.length >= 2 ? Math.min(...crossingsZ) : (beltBand.length ? Math.min(...beltBand.map((p) => p.x)) : -1.2);
      const zFrontTop = roofBand.length ? Math.max(...roofBand.map((p) => p.x)) : (zFrontBot - 0.35);
      const zRearTop  = roofBand.length ? Math.min(...roofBand.map((p) => p.x)) : (zRearBot + 0.25);

      const roofLen = Math.max(0.65, zFrontTop - zRearTop + 0.08);
      const roofZ   = (zFrontTop + zRearTop) * 0.5;
      const roofW   = width - 0.12;
      const halfW   = roofW * 0.47;
      const pMat    = matPillarOverride || matPaint;

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.09, roofLen), pMat);
      roofCap.position.set(0, roofY - 0.03, roofZ);
      roofCap.castShadow = true; roofCap.receiveShadow = true;
      group.add(roofCap);

      for (const sx of [-1, 1]) {
        group.add(this._makePillar(sx * halfW, beltY - 0.04, zFrontBot, sx * halfW, roofY - 0.04, zFrontTop, 0.046, pMat));
        group.add(this._makePillar(sx * halfW, beltY - 0.04, zRearBot,  sx * halfW, roofY - 0.04, zRearTop,  0.058, pMat));
        if (roofLen > 1.25) {
          const bZ = roofZ + 0.06;
          group.add(this._makePillar(sx * halfW, beltY - 0.04, bZ, sx * halfW, roofY - 0.04, bZ, 0.044, pMat));
        }
      }
      if (cfg.splitWind) {
        group.add(this._makePillar(0, beltY - 0.04, zFrontBot, 0, roofY - 0.04, zFrontTop, 0.032, pMat));
      }
      const fHeader = new THREE.Mesh(new THREE.BoxGeometry(roofW, 0.07, 0.09), pMat);
      fHeader.position.set(0, roofY - 0.04, zFrontTop);
      group.add(fHeader);

      // v15.6 FORM-FITTING TRAPEZOIDAL SIDE WINDOWS, WINDSHIELD & REAR GLASS!
      if (!this._matFormGlass) {
        this._matFormGlass = new THREE.MeshBasicMaterial({ color: 0x4c7c9c, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
      }
      const makeQuad = (p0, p1, p2, p3) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute([
          p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2],
          p0[0], p0[1], p0[2], p2[0], p2[1], p2[2], p3[0], p3[1], p3[2]
        ], 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute([
          0, 0, 1, 0, 1, 1,
          0, 0, 1, 1, 0, 1
        ], 2));
        g.computeVertexNormals();
        return new THREE.Mesh(g, this._matFormGlass);
      };
      const yB = beltY - 0.01, yT = roofY - 0.05;
      const hwG = halfW - 0.015;
      for (const sx of [-1, 1]) {
        const xS = sx * hwG;
        group.add(makeQuad(
          [xS, yB, zFrontBot - 0.03], [xS, yB, zRearBot + 0.03],
          [xS, yT, zRearTop + 0.03],  [xS, yT, zFrontTop - 0.03]
        ));
      }
      group.add(makeQuad(
        [-hwG, yB, zFrontBot], [hwG, yB, zFrontBot],
        [ hwG, yT, zFrontTop], [-hwG, yT, zFrontTop]
      ));
      group.add(makeQuad(
        [-hwG, yB, zRearBot], [hwG, yB, zRearBot],
        [ hwG, yT, zRearTop], [-hwG, yT, zRearTop]
      ));
    }
    return group;
  },

  _createGaugeCanvas(arch) {
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 96;
    const ctx = cv.getContext("2d");
    const tex = new THREE.CanvasTexture(cv);
    tex.minFilter = THREE.LinearFilter;

    const palette = {
      jdm:      { bg: "#0c0f16", rim: "#e63946", text: "#00f5ff", needle: "#ff3355", accent: "#ffbe0b" },
      overland: { bg: "#121518", rim: "#d49b24", text: "#ffd166", needle: "#ff7b1c", accent: "#2de08b" },
      soviet:   { bg: "#0f1712", rim: "#4d7854", text: "#70e088", needle: "#e8f5e9", accent: "#ffb703" },
      military: { bg: "#101410", rim: "#6b7d4c", text: "#b5e48c", needle: "#ff4d4d", accent: "#ffd166" },
      special:  { bg: "#1a1d21", rim: "#8d99ae", text: "#edf2f4", needle: "#ef233c", accent: "#ffd166" }
    }[arch] || { bg: "#111", rim: "#888", text: "#fff", needle: "#f33", accent: "#ff0" };

    const drawDial = (cx, cy, r, frac, valText, label) => {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#06080c"; ctx.fill();
      ctx.strokeStyle = palette.rim; ctx.lineWidth = 2.5; ctx.stroke();
      const startA = Math.PI * 0.78, endA = Math.PI * 2.22;
      ctx.beginPath(); ctx.arc(cx, cy, r - 4, startA, startA + (endA - startA) * Math.max(0, Math.min(1, frac)));
      ctx.strokeStyle = frac > 0.85 ? "#ff2a4a" : palette.text; ctx.lineWidth = 3.5; ctx.stroke();
      const ang = startA + (endA - startA) * Math.max(0, Math.min(1, frac));
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6));
      ctx.strokeStyle = palette.needle; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = "#ffffff"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
      ctx.fillText(valText, cx, cy + 12);
      ctx.fillStyle = palette.text; ctx.font = "bold 8px monospace";
      ctx.fillText(label, cx, cy + 23);
    };

    const draw = (st) => {
      ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, 256, 96);
      ctx.strokeStyle = palette.rim; ctx.lineWidth = 2; ctx.strokeRect(2, 2, 252, 92);
      if (st.empGlitch > 0) {
        // HAYWIRE ELECTRONICS! Needles whip wildly & digital readout scrambles!
        const isRad = (st.empKind === "radiation");
        drawDial(50, 48, 36, Math.random(), (Math.random() * 9.9).toFixed(1), isRad ? "RAD ERR" : "STATIC");
        drawDial(206, 48, 36, Math.random(), String(Math.floor(Math.random() * 999)), "ERR");
        ctx.fillStyle = isRad ? "#00e5ff" : "#ff3b5c";
        ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
        ctx.fillText(Math.random() < 0.5 ? "ERR" : (isRad ? "RAD!" : "###"), 128, 36);
        ctx.fillStyle = "#ffd166"; ctx.font = "bold 10px monospace";
        ctx.fillText(`${Math.floor(Math.random() * 99)} PSI | ${Math.floor(Math.random() * 999)}°C`, 128, 54);
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = isRad ? "rgba(0,229,255,0.28)" : "rgba(255,60,90,0.24)";
          ctx.fillRect(0, Math.random() * 96, 256, 2 + Math.random() * 4);
        }
        tex.needsUpdate = true;
        return;
      }
      const rpmNorm = Math.max(0, Math.min(1, (st.rpm || 800) / (st.redlineRpm || 6000)));
      const spdKmh = Math.round(st.speedKmh || 0);
      drawDial(50, 48, 36, rpmNorm, (st.rpm ? (st.rpm / 1000).toFixed(1) : "0.8"), "x1000 RPM");
      drawDial(206, 48, 36, Math.min(1, spdKmh / 220), String(spdKmh), "KM/H");

      const gTxt = st.gear === -1 ? "R" : (st.gear === 0 ? "N" : String(st.gear || 1));
      ctx.fillStyle = palette.accent; ctx.font = "bold 26px monospace"; ctx.textAlign = "center";
      ctx.fillText(gTxt, 128, 34);
      ctx.fillStyle = palette.text; ctx.font = "bold 10px monospace";
      ctx.fillText(`${(st.boostPsi || 0).toFixed(0)} PSI | ${Math.round(st.coolantTemp || 85)}°C`, 128, 52);

      const fuelF = Math.max(0, Math.min(1, st.fuelFrac !== undefined ? st.fuelFrac : 1));
      ctx.fillStyle = "#1d2630"; ctx.fillRect(96, 60, 64, 7);
      ctx.fillStyle = fuelF < 0.2 ? "#ff2a4a" : "#2de08b"; ctx.fillRect(96, 60, 64 * fuelF, 7);

      ctx.font = "bold 8.5px monospace";
      ctx.fillStyle = st.driveMode === "4L" ? "#ffbe0b" : "#3a4552"; ctx.fillText("4L", 102, 82);
      ctx.fillStyle = (st.frontLock || st.rearLock) ? "#ff595e" : "#3a4552"; ctx.fillText("LCK", 122, 82);
      ctx.fillStyle = st.wipersOn ? "#00e5ff" : "#3a4552"; ctx.fillText("WPR", 144, 82);
      if (st.hasBlown) { ctx.fillStyle = "#ff2a4a"; ctx.fillText("FLAT!", 128, 12); }
      // v15.8 Digital Dash Clock (HH:MM in-game time!)
      if (typeof st.timeOfDay === "number") {
        const hrs = Math.floor(((st.timeOfDay % 24) + 24) % 24);
        const mins = Math.floor((((st.timeOfDay % 1) + 1) % 1) * 60);
        const clk = String(hrs).padStart(2, "0") + ":" + String(mins).padStart(2, "0");
        ctx.fillStyle = palette.accent || "#00f5ff";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(clk, 128, 16);
      }
      tex.needsUpdate = true;
    };
    draw({});
    return { tex, draw };
  },

  _createTankGaugeCanvas() {
    const cv = document.createElement("canvas");
    cv.width = 320; cv.height = 128;
    const ctx = cv.getContext("2d");
    const tex = new THREE.CanvasTexture(cv);

    const drawDial = (cx, cy, r, frac, valTxt, subTxt, col = "#63ff85") => {
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
      ctx.strokeStyle = "#1c2b22"; ctx.lineWidth = 5; ctx.stroke();
      const ang = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI * 0.75, ang);
      ctx.strokeStyle = col; ctx.lineWidth = 4.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * (r - 6), cy + Math.sin(ang) * (r - 6));
      ctx.strokeStyle = "#ffbe0b"; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.fillStyle = "#e8f8ec"; ctx.font = "bold 12px monospace"; ctx.textAlign = "center";
      ctx.fillText(valTxt, cx, cy + 5);
      ctx.fillStyle = "#7da88b"; ctx.font = "8.5px monospace";
      ctx.fillText(subTxt, cx, cy + 16);
    };

    const draw = (st) => {
      ctx.fillStyle = "#09110d"; ctx.fillRect(0, 0, 320, 128);
      ctx.strokeStyle = "#355240"; ctx.lineWidth = 2.5; ctx.strokeRect(2, 2, 316, 124);

      if (st.empGlitch > 0) {
        const isRad = (st.empKind === "radiation");
        drawDial(54, 48, 34, Math.random(), "ERR", "RPM", isRad ? "#00e5ff" : "#ff3b5c");
        drawDial(266, 48, 34, Math.random(), "???", "KM/H", isRad ? "#00e5ff" : "#ff3b5c");
        ctx.fillStyle = isRad ? "#00e5ff" : "#ff3b5c";
        ctx.font = "bold 16px monospace"; ctx.textAlign = "center";
        ctx.fillText(isRad ? "RAD-EMP SCRAMBLE" : "SONIC INTERFERENCE", 160, 56);
        tex.needsUpdate = true;
        return;
      }

      const rpmNorm = Math.max(0, Math.min(1, (st.rpm || 600) / (st.redlineRpm || 2250)));
      const spdKmh = Math.round(st.speedKmh || 0);
      drawDial(54, 48, 34, rpmNorm, String(Math.round(st.rpm || 600)), "V-84 RPM", "#63ff85");
      drawDial(266, 48, 34, Math.min(1, spdKmh / 85), String(spdKmh), "KM/H", "#ffd166");

      const gTxt = st.gear === -1 ? "R" : (st.gear === 0 ? "N" : String(st.gear || 1));
      ctx.fillStyle = "#ffd166"; ctx.font = "bold 20px monospace"; ctx.textAlign = "center";
      ctx.fillText(`GEAR ${gTxt}`, 160, 26);

      const shLbl = st.t72ShellType === "therm" ? "3BK-THERM" : (st.t72ShellType === "ap" ? "3BM42 APFSDS" : "3OF26 HE-FRAG");
      ctx.fillStyle = st.t72ShellType === "therm" ? "#ff7b1c" : (st.t72ShellType === "ap" ? "#00f5ff" : "#ffd166");
      ctx.font = "bold 11px monospace";
      ctx.fillText(`125mm: ${shLbl}`, 160, 44);

      const rRem = st.t72ReloadTimer || 0;
      const rTot = st.t72ReloadTotal || 6.5;
      const rFrac = rRem > 0 ? Math.max(0, Math.min(1, 1.0 - rRem / rTot)) : 1.0;
      ctx.fillStyle = "#16241b"; ctx.fillRect(102, 51, 116, 12);
      ctx.fillStyle = rRem > 0 ? "#ffb703" : "#2de08b";
      ctx.fillRect(102, 51, Math.round(116 * rFrac), 12);
      ctx.fillStyle = "#08100b"; ctx.font = "bold 9px monospace";
      ctx.fillText(rRem > 0 ? `AUTOLOADER ${rRem.toFixed(1)}s` : "BREECH READY", 160, 60);

      ctx.fillStyle = "#9ec4a8"; ctx.font = "bold 9.5px monospace";
      ctx.fillText(`14.5mm: ${st.t72CoaxAmmo || 0}  |  ${Math.round(st.coolantTemp || 84)}°C`, 160, 78);

      const fuelF = Math.max(0, Math.min(1, st.fuelFrac !== undefined ? st.fuelFrac : 1));
      ctx.fillStyle = "#16241b"; ctx.fillRect(24, 94, 120, 8);
      ctx.fillStyle = fuelF < 0.2 ? "#ff3b5c" : "#4cc9f0"; ctx.fillRect(24, 94, Math.round(120 * fuelF), 8);
      ctx.fillStyle = "#9ec4a8"; ctx.font = "bold 8.5px monospace"; ctx.textAlign = "left";
      ctx.fillText(`DIESEL ${Math.round(fuelF * 100)}%`, 24, 114);

      ctx.textAlign = "right";
      const depth = st.waterDepth || 0;
      if (depth > 0.35) {
        ctx.fillStyle = st.hasT72Snorkel ? "#00e5ff" : "#ff3b5c";
        ctx.fillText(st.hasT72Snorkel ? `OPVT WADING ${depth.toFixed(1)}m` : `FLOOD RISK ${depth.toFixed(1)}m!`, 296, 114);
      } else {
        const thTxt = st.isSchreckensfurst ? ["DAY OPTIC", "TRI-BAND FLIR", "CRIMSON RED NVD"][st.thermalMode || 0] : ["DAY OPTIC", "FLIR THERMAL", "1PN51 NVG"][st.thermalMode || 0];
        ctx.fillStyle = st.thermalMode > 0 ? "#63ff85" : "#8fb399";
        ctx.fillText(thTxt, 296, 114);
      }

      tex.needsUpdate = true;
    };
    draw({ rpm: 600, speedKmh: 0, gear: 1, coolantTemp: 82, fuelFrac: 1, t72ShellType: "he", t72ReloadTimer: 0, t72CoaxAmmo: 300 });
    return { tex, draw };
  },

  _buildTankDriverCockpit(chassis, spec, isLocal) {
    const cfg = this.getConfig("t72");
    const bay = new THREE.Group();
    bay.visible = false;
    chassis.add(bay);

    const matSeaGreen = new THREE.MeshStandardMaterial({ color: 0x263930, roughness: 0.78, metalness: 0.32 });
    const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x171d1a, roughness: 0.72, metalness: 0.55 });
    const matPad = new THREE.MeshStandardMaterial({ color: 0x1d1a18, roughness: 0.94 });
    const matBrass = new THREE.MeshStandardMaterial({ color: 0x8f7540, roughness: 0.45, metalness: 0.65 });
    const matPrismGlass = new THREE.MeshStandardMaterial({ color: 0x9ad8b8, transparent: true, opacity: 0.14, roughness: 0.08, side: THREE.DoubleSide });
    const matGlowGrn = new THREE.MeshBasicMaterial({ color: 0x45ff7a });
    const matGlowAmb = new THREE.MeshBasicMaterial({ color: 0xffb703 });

    const cx = 0, cy = 1.66, cz = 1.96;

    // 1. Armored Sea-Green Driver Compartment (Zero hull clipping — sits cleanly above sloped glacis!)
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.10, 1.38), matSeaGreen);
    roofPlate.position.set(cx, cy + 0.36, cz - 0.12); bay.add(roofPlate);
    const hatchRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.045, 8, 16), matDarkSteel);
    hatchRing.rotation.x = Math.PI / 2; hatchRing.position.set(cx, cy + 0.30, cz - 0.18); bay.add(hatchRing);

    for (const sx of [-1, 1]) {
      const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.88, 1.44), matSeaGreen);
      sideWall.position.set(sx * 0.74, cy - 0.06, cz - 0.12); bay.add(sideWall);
      for (const rz of [-0.35, 0.05, 0.35]) {
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.76, 0.06), matDarkSteel);
        rib.position.set(sx * 0.68, cy - 0.06, cz + rz); bay.add(rib);
      }
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.15, 6), matBrass);
      pipe.rotation.x = Math.PI / 2; pipe.position.set(sx * 0.66, cy + 0.18, cz - 0.05); bay.add(pipe);
    }

    const rearBulkhead = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.90, 0.10), matSeaGreen);
    rearBulkhead.position.set(cx, cy - 0.06, cz - 0.82); bay.add(rearBulkhead);
    const lowerConsole = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.42, 0.56), matDarkSteel);
    lowerConsole.position.set(cx, cy - 0.34, cz + 0.38); bay.add(lowerConsole);

    // 2. THREE BEVELED TNPO-168 ARMORED PERISCOPE VISION SLITS (Wide Center + Left/Right Prisms)
    const browPad = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.14, 0.18), matPad);
    browPad.position.set(cx, cy + 0.27, cz + 0.48); bay.add(browPad);
    const sillBar = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.10, 0.20), matDarkSteel);
    sillBar.position.set(cx, cy - 0.06, cz + 0.50); bay.add(sillBar);

    for (const sx of [-1, 1]) {
      const div = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.30, 0.14), matDarkSteel);
      div.position.set(sx * 0.34, cy + 0.10, cz + 0.50); bay.add(div);
      const outerDiv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.16), matDarkSteel);
      outerDiv.position.set(sx * 0.68, cy + 0.10, cz + 0.42); bay.add(outerDiv);
      const sGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.24), matPrismGlass);
      sGlass.position.set(sx * 0.51, cy + 0.10, cz + 0.48);
      sGlass.rotation.y = sx * -0.22; bay.add(sGlass);
    }
    const cGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.24), matPrismGlass);
    cGlass.position.set(cx, cy + 0.10, cz + 0.52); bay.add(cGlass);

    // 3. LIVE ARMORED SOVIET TANK TELEMETRY BINNACLE
    let gaugeSys = null;
    if (isLocal) {
      gaugeSys = this._createTankGaugeCanvas();
      const binnacleBox = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.23, 0.12), matDarkSteel);
      binnacleBox.position.set(cx, cy - 0.20, cz + 0.36); binnacleBox.rotation.x = -0.32; bay.add(binnacleBox);
      const gPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.19), new THREE.MeshBasicMaterial({ map: gaugeSys.tex }));
      gPlane.position.set(cx, cy - 0.195, cz + 0.292);
      gPlane.rotation.y = Math.PI; gPlane.rotation.x = 0.32;
      bay.add(gPlane);
    }

    for (let i = 0; i < 4; i++) {
      const lLed = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.02), i % 2 === 0 ? matGlowGrn : matGlowAmb);
      lLed.position.set(-0.42, cy - 0.15 - i * 0.045, cz + 0.34); bay.add(lLed);
      const rLed = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.02), i < 2 ? matGlowGrn : matGlowAmb);
      rLed.position.set( 0.42, cy - 0.15 - i * 0.045, cz + 0.34); bay.add(rLed);
    }

    // 4. DUAL T-72B MECHANICAL STEERING TILLER LEVERS
    const makeTiller = (tx) => {
      const piv = new THREE.Group();
      piv.position.set(tx, cy - 0.48, cz + 0.22);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.42, 8), matDarkSteel);
      rod.position.y = 0.21; piv.add(rod);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.026, 0.13, 8), matPad);
      grip.position.y = 0.43; piv.add(grip);
      bay.add(piv);
      return piv;
    };
    const leverL = makeTiller(-0.28);
    const leverR = makeTiller( 0.28);

    // v15.3.6: Removed dynamic cockpit PointLight to keep 1st-person locked at 60 FPS!

    const eyeLocal = new THREE.Vector3(cx, cy + 0.10, cz - 0.04);

    return {
      cfg, cockpitGrp: bay, eyeLocal, gaugeSys, gaugeAccum: 0,
      update(dt, state) {
        const show = !!state.inCockpitCam;
        bay.visible = show;
        if (show) {
          const st = state.steerAngle || 0;
          leverL.rotation.x = -0.18 - Math.max(0,  st) * 0.85;
          leverR.rotation.x = -0.18 - Math.max(0, -st) * 0.85;
          if (gaugeSys) {
            this.gaugeAccum += dt;
            if (this.gaugeAccum >= 0.45) { this.gaugeAccum = 0; gaugeSys.draw(state); }
          }
        }
      }
    };
  },

  _getCrackedGlassTex() {
    if (this._crackedGlassTex) return this._crackedGlassTex;
    const cv = document.createElement("canvas");
    cv.width = 256; cv.height = 256;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = "rgba(76, 124, 156, 0.36)";
    ctx.fillRect(0, 0, 256, 256);
    // Spiderweb bullet/impact cracks
    ctx.strokeStyle = "rgba(248, 253, 255, 0.96)";
    ctx.lineWidth = 2.5;
    for (const [cx, cy] of [[86, 108], [174, 146]]) {
      for (let r = 0; r < 9; r++) {
        const a = (r / 9) * Math.PI * 2 + 0.2;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * 44, cy + Math.sin(a) * 44);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
    }
    this._crackedGlassTex = new THREE.CanvasTexture(cv);
    return this._crackedGlassTex;
  },

  buildCockpit(chassis, vehicleId, spec, isLocal, hasRearBench = false) {
    const cfg = this.getConfig(vehicleId);
    if (cfg.special === "t72_periscope") {
      return this._buildTankDriverCockpit(chassis, spec, isLocal);
    }
    const arch = cfg.arch, zC = cfg.seatZ, yF = cfg.yFloor, w = cfg.cabW;
    const drvX = (cfg.special === "t72_periscope") ? 0 : ((cfg.rhd ? -1 : 1) * (w * 0.25));
    const pasX = -drvX;

    const cockpitGrp = new THREE.Group();
    chassis.add(cockpitGrp);

    const matDash = new THREE.MeshStandardMaterial({
      color: arch === "soviet" ? 0x3b453e : (cfg.special === "sandero" ? 0x697078 : (arch === "military" ? 0x2b3026 : 0x1b1e24)),
      roughness: arch === "soviet" ? 0.65 : 0.85, metalness: arch === "soviet" ? 0.35 : 0.12
    });
    const matTrim = new THREE.MeshStandardMaterial({
      color: cfg.special === "wood_trim" ? 0x6b3e1e : (arch === "jdm" ? 0x242830 : 0x2c3036),
      roughness: cfg.special === "wood_trim" ? 0.35 : 0.78
    });
    const matSeat = new THREE.MeshStandardMaterial({
      color: arch === "jdm" ? 0x1e2128 : (cfg.special === "wood_trim" ? 0xc9b38c : (arch === "soviet" ? 0x453428 : 0x2a2e33)),
      roughness: 0.90
    });
    const matAccent = new THREE.MeshStandardMaterial({
      color: arch === "jdm" ? 0xd91e26 : (cfg.special === "tractor" ? 0xff7b1c : 0x38b000),
      roughness: 0.55
    });
    const matWheelRim = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.78 });
    const matSpoke = new THREE.MeshStandardMaterial({ color: arch === "jdm" ? 0x9aa4ae : 0x3b4046, metalness: 0.55, roughness: 0.42 });

    const floorPan = new THREE.Mesh(new THREE.BoxGeometry(w * 0.96, 0.08, 1.55), matDash);
    floorPan.position.set(0, yF - 0.02, zC - 0.05); cockpitGrp.add(floorPan);

    const dashZ = zC + 0.52, dashY = cfg.beltY - 0.05;
    const dashMain = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.28, 0.42), matDash);
    dashMain.position.set(0, dashY, dashZ); cockpitGrp.add(dashMain);
    const trimStrip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.06, 0.44), matTrim);
    trimStrip.position.set(0, dashY + 0.02, dashZ - 0.01); cockpitGrp.add(trimStrip);
    const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.26), matDash);
    binnacle.position.set(drvX, dashY + 0.14, dashZ - 0.06); cockpitGrp.add(binnacle);

    let gaugeSys = null;
    if (isLocal) {
      gaugeSys = this._createGaugeCanvas(arch);
      const gPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.165), new THREE.MeshBasicMaterial({ map: gaugeSys.tex }));
      gPlane.position.set(drvX, dashY + 0.15, dashZ - 0.205);
      gPlane.rotation.y = Math.PI; gPlane.rotation.x = 0.16;
      cockpitGrp.add(gPlane);
    }

    const tunnelW = (arch === "military") ? 0.56 : 0.26;
    const tunnelH = (arch === "military") ? 0.44 : 0.24;
    const tunnel = new THREE.Mesh(new THREE.BoxGeometry(tunnelW, tunnelH, 1.05), matDash);
    tunnel.position.set(0, yF + tunnelH * 0.5, zC + 0.12); cockpitGrp.add(tunnel);
    // v16.0 Animated H-Pattern Cockpit Shifter Lever!
    const shifterPivot = new THREE.Group();
    shifterPivot.position.set(0, yF + tunnelH, zC + 0.22);
    const shifterStick = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.020, 0.28, 6), matSpoke);
    shifterStick.position.set(0, 0.14, 0); shifterPivot.add(shifterStick);
    const shiftKnob = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), matAccent);
    shiftKnob.position.set(0, 0.28, 0); shifterPivot.add(shiftKnob);
    cockpitGrp.add(shifterPivot);

    if (arch === "jdm") {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.08, 10), matDash);
      pod.rotation.x = Math.PI / 2; pod.position.set(drvX + (cfg.rhd ? -0.22 : 0.22), dashY + 0.24, dashZ - 0.02); cockpitGrp.add(pod);
      const podFace = new THREE.Mesh(new THREE.CircleGeometry(0.038, 10), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      podFace.rotation.y = Math.PI; podFace.position.set(drvX + (cfg.rhd ? -0.22 : 0.22), dashY + 0.24, dashZ - 0.065); cockpitGrp.add(podFace);
      if (cfg.special === "r35_mfd") {
        const mfd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), matDash);
        mfd.position.set(0, dashY + 0.14, dashZ - 0.12); cockpitGrp.add(mfd);
        const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.13), new THREE.MeshBasicMaterial({ color: 0x104c75 }));
        scr.rotation.y = Math.PI; scr.position.set(0, dashY + 0.14, dashZ - 0.148); cockpitGrp.add(scr);
      }
    } else if (arch === "overland") {
      const grab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.06), matSpoke);
      grab.position.set(pasX, dashY + 0.06, dashZ - 0.22); cockpitGrp.add(grab);
      for (let s = 0; s < 3; s++) {
        const sw = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.05, 0.03), new THREE.MeshBasicMaterial({ color: s === 0 ? 0xffb703 : 0x2de08b }));
        sw.position.set(-0.07 + s * 0.07, dashY + 0.06, dashZ - 0.215); cockpitGrp.add(sw);
      }
      if (cfg.special === "rollbar") {
        const matBar = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.65 });
        const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, w * 0.90, 8), matBar);
        crossBar.rotation.z = Math.PI / 2; crossBar.position.set(0, cfg.roofY - 0.14, zC - 0.25); cockpitGrp.add(crossBar);
        for (const sx of [-w * 0.42, w * 0.42]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.95, 8), matBar);
          post.position.set(sx, cfg.roofY - 0.60, zC - 0.25); cockpitGrp.add(post);
        }
      }
    } else if (arch === "soviet") {
      for (let s = 0; s < 4; s++) {
        const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), matSpoke);
        sw.rotation.x = Math.PI / 2; sw.position.set(-0.14 + s * 0.09, dashY + 0.04, dashZ - 0.22); cockpitGrp.add(sw);
      }
    } else if (arch === "military") {
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 4; c++) {
          const led = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.032, 0.025), new THREE.MeshBasicMaterial({ color: r === 0 ? 0x52b788 : 0xe63946 }));
          led.position.set(-0.12 + c * 0.08, dashY + 0.06 - r * 0.07, dashZ - 0.215); cockpitGrp.add(led);
        }
      }
      if (cfg.special === "btr_visor") {
        const matArmorIn = new THREE.MeshStandardMaterial({ color: 0x262e24, roughness: 0.88 });
        const topSlit = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.14, 0.16), matArmorIn);
        topSlit.position.set(0, cfg.roofY - 0.06, dashZ + 0.14); cockpitGrp.add(topSlit);
        const midDiv = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.16), matArmorIn);
        midDiv.position.set(0, dashY + 0.30, dashZ + 0.14); cockpitGrp.add(midDiv);
      }
    } else if (arch === "special") {
      if (cfg.special === "tractor") {
        for (let l = 0; l < 3; l++) {
          const lev = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 6), matSpoke);
          lev.position.set(drvX - 0.48, yF + 0.44, zC + 0.12 + l * 0.10); cockpitGrp.add(lev);
          const tip = new THREE.Mesh(new THREE.SphereGeometry(0.036, 6, 6), matAccent);
          tip.position.set(drvX - 0.48, yF + 0.62, zC + 0.12 + l * 0.10); cockpitGrp.add(tip);
        }
      } else if (cfg.special === "sandero") {
        const radio = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: 0x202428 }));
        radio.position.set(0, dashY + 0.03, dashZ - 0.215); cockpitGrp.add(radio);
        const lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.045), new THREE.MeshBasicMaterial({ color: 0x8cb369 }));
        lcd.rotation.y = Math.PI; lcd.position.set(0, dashY + 0.05, dashZ - 0.238); cockpitGrp.add(lcd);
      }
    }

    // ROTATING 3D STEERING WHEEL
    const steerRadius = (arch === "soviet" || cfg.special === "tractor") ? 0.21 : (arch === "jdm" ? 0.165 : 0.185);
    const steerColumn = new THREE.Group();
    steerColumn.position.set(drvX, dashY + 0.08, dashZ - 0.24);
    steerColumn.rotation.x = (arch === "soviet" || cfg.special === "tractor") ? 0.68 : 0.34;
    cockpitGrp.add(steerColumn);
    const steerPivot = new THREE.Group();
    steerColumn.add(steerPivot);
    steerPivot.add(new THREE.Mesh(new THREE.TorusGeometry(steerRadius, 0.022, 8, 18), matWheelRim));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), matDash);
    hub.rotation.x = Math.PI / 2; steerPivot.add(hub);
    for (const a of [0, 2.25, -2.25]) {
      const spk = new THREE.Mesh(new THREE.BoxGeometry(0.028, steerRadius * 0.92, 0.022), matSpoke);
      spk.position.set(Math.sin(a) * steerRadius * 0.45, -Math.cos(a) * steerRadius * 0.45, 0);
      spk.rotation.z = a; steerPivot.add(spk);
    }
    if (arch === "jdm" || arch === "overland") {
      const topMark = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.048, 0.048), matAccent);
      topMark.position.set(0, steerRadius, 0); steerPivot.add(topMark);
    }

    // SEATS
    for (const sx of [drvX, pasX]) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.46), matSeat);
      cushion.position.set(sx, yF + 0.14, zC); cockpitGrp.add(cushion);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.56, 0.11), matSeat);
      back.position.set(sx, yF + 0.44, zC - 0.19); back.rotation.x = -0.15; cockpitGrp.add(back);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.09), matSeat);
      head.position.set(sx, yF + 0.77, zC - 0.23); cockpitGrp.add(head);
      if (arch === "jdm") {
        for (const bx of [-0.21, 0.21]) {
          const bol = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.18), matAccent);
          bol.position.set(sx + bx, yF + 0.40, zC - 0.14); cockpitGrp.add(bol);
        }
      }
    }
    if (hasRearBench) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.14, 0.44), matSeat);
      bench.position.set(0, yF + 0.14, zC - 0.74); cockpitGrp.add(bench);
      const bBack = new THREE.Mesh(new THREE.BoxGeometry(w * 0.80, 0.52, 0.12), matSeat);
      bBack.position.set(0, yF + 0.42, zC - 0.92); cockpitGrp.add(bBack);
    }

    // SEATED 3D DRIVER (Visible through see-through windows from outside! Auto-hides in Cockpit Cam!)
    const driverGroup = new THREE.Group();
    driverGroup.position.set(drvX, yF + 0.22, zC - 0.04);
    const matJacket = new THREE.MeshStandardMaterial({ color: isLocal ? 0x26547c : 0x8f3926, roughness: 0.88 });
    const matHead   = new THREE.MeshStandardMaterial({ color: 0xe2b490, roughness: 0.78 });
    const matCap    = new THREE.MeshStandardMaterial({ color: 0x1d232a, roughness: 0.85 });
    const dTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 0.22), matJacket); dTorso.position.y = 0.24; driverGroup.add(dTorso);
    const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), matHead); dHead.position.set(0, 0.62, 0.02); driverGroup.add(dHead);
    const dCap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.09, 0.26), matCap); dCap.position.set(0, 0.74, 0.04); driverGroup.add(dCap);
    for (const ax of [-0.18, 0.18]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.44), matJacket);
      arm.position.set(ax, 0.36, 0.24); arm.rotation.x = -0.18; driverGroup.add(arm);
    }
    cockpitGrp.add(driverGroup);
    // v18.3 MULTI-SEAT SOLID SEATED PASSENGER AVATARS (Fits every seat in the car/van/bus — up to 12 in Toyota Coaster!)
    const seatDefs = this.getPassengerSeats(vehicleId);
    const jacketPalette = [0xd97706, 0x2563eb, 0x16a34a, 0xdc2626, 0x9333ea, 0x0891b2, 0xea580c, 0x4f46e5, 0x059669, 0xbe123c, 0xca8a04, 0x0284c7];
    const matPasPants = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.90 });
    const passengerGroups = [];
    for (let si = 0; si < seatDefs.length; si++) {
      const sd = seatDefs[si];
      const pg = new THREE.Group();
      pg.position.set(sd.x, sd.y, sd.z);
      const matPasJkt = new THREE.MeshStandardMaterial({ color: jacketPalette[si % jacketPalette.length], roughness: 0.86 });
      const pTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.46, 0.22), matPasJkt); pTorso.position.y = 0.23; pg.add(pTorso);
      const pHead  = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.22), matHead); pHead.position.set(0, 0.59, 0.02); pg.add(pHead);
      const pCap   = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.09, 0.25), matCap); pCap.position.set(0, 0.71, 0.04); pg.add(pCap);
      for (const sx of [-0.11, 0.11]) {
        const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.34), matPasPants);
        thigh.position.set(sx, 0.06, 0.18); pg.add(thigh);
        const calf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.30, 0.13), matPasPants);
        calf.position.set(sx, -0.09, 0.32); pg.add(calf);
        const pArm = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.32), matPasJkt);
        pArm.position.set(sx * 1.85, 0.26, 0.14); pArm.rotation.x = 0.28; pg.add(pArm);
      }
      pg.visible = false;
      cockpitGrp.add(pg);
      passengerGroups.push(pg);
    }

    // 3D ANIMATED WINDSHIELD WIPERS
    const wiperGroup = new THREE.Group();
    wiperGroup.position.set(0, cfg.beltY + 0.04, cfg.windZ + 0.10);
    wiperGroup.rotation.x = cfg.windTilt;
    chassis.add(wiperGroup);
    const matWiper = new THREE.MeshStandardMaterial({ color: 0x14171a, roughness: 0.75 });
    const wiperSpan = Math.min(0.56, w * 0.32);
    const makeWiper = (px) => {
      const piv = new THREE.Group(); piv.position.set(px, 0, 0.04);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.025, wiperSpan, 0.022), matWiper);
      blade.position.y = wiperSpan * 0.5; piv.add(blade); wiperGroup.add(piv); return piv;
    };
    const wiperL = makeWiper(w * 0.22), wiperR = makeWiper(-w * 0.22);

    // v16.7 Disable shadow maps on interior cockpit meshes to keep 1st-person POV locked at 60 FPS on UHD 630!
    cockpitGrp.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    const eyeLocal = new THREE.Vector3(drvX, Math.min(cfg.roofY - 0.15, cfg.beltY + 0.32), zC - 0.04);

    return {
      cfg, cockpitGrp, steerPivot, driverGroup, wiperL, wiperR, gaugeSys, eyeLocal,
      wiperPhase: 0, gaugeAccum: 0,
      update(dt, state) {
        steerPivot.rotation.z = -(state.steerAngle || 0) * 3.6;
        driverGroup.visible = !state.inCockpitCam && !state.isEmpty;
        if (shifterPivot && typeof state.gear === "number") {
          const g = state.gear;
          const targetPitch = g === 0 ? 0.0 : ((g === -1 || g % 2 === 1) ? 0.24 : -0.22);
          const targetRoll  = g === 0 ? 0.0 : (g === -1 ? -0.22 : (g <= 2 ? 0.18 : (g <= 4 ? 0.0 : -0.16)));
          const sAlpha = Math.min(1, dt * 16);
          shifterPivot.rotation.x += (targetPitch - shifterPivot.rotation.x) * sAlpha;
          shifterPivot.rotation.z += (targetRoll  - shifterPivot.rotation.z) * sAlpha;
        }
        const pCount = (typeof state.passengerCount === "number") ? state.passengerCount : (state.hasPassenger ? 1 : 0);
        for (let pi = 0; pi < passengerGroups.length; pi++) {
          passengerGroups[pi].visible = (pi < pCount);
        }
        if (KK.CockpitBuilder && KK.CockpitBuilder._matFormGlass && typeof state.glassHp === "number") {
          const wantCrack = state.glassHp < 55;
          const mFG = KK.CockpitBuilder._matFormGlass;
          const wMud = Math.max(0, Math.min(1, state.windshieldMud || 0));
          if (wantCrack && !mFG.map) { mFG.map = KK.CockpitBuilder._getCrackedGlassTex(); mFG.needsUpdate = true; }
          else if (!wantCrack && mFG.map) { mFG.map = null; mFG.needsUpdate = true; }
          // Blend 3D windshield glass color & opacity with mud strictly on the 3D window!
          mFG.color.setRGB(0.30 + wMud * 0.14, 0.49 - wMud * 0.17, 0.61 - wMud * 0.41);
          mFG.opacity = (wantCrack ? 0.56 : 0.34) + wMud * 0.28;
        }
        if (state.wipersOn) this.wiperPhase += dt * 4.2;
        else this.wiperPhase += (0 - (this.wiperPhase % (Math.PI * 2))) * Math.min(1, dt * 6);
        const sweep = state.wipersOn ? (Math.sin(this.wiperPhase) * 0.85 - 0.15) : -1.25;
        wiperL.rotation.z = sweep; wiperR.rotation.z = sweep;
        if (gaugeSys && state.inCockpitCam) {
          this.gaugeAccum += dt;
          if (this.gaugeAccum >= 0.45) {
            this.gaugeAccum = 0;
            const gSig = `${Math.round(state.speedKmh || 0)}_${Math.round((state.rpm || 0) / 100)}_${state.gear || 0}_${Math.floor((state.timeOfDay || 0) * 60)}_${state.empGlitch > 0 ? 1 : 0}`;
            if (gSig !== this._lastGaugeSig || state.empGlitch > 0) {
              this._lastGaugeSig = gSig;
              gaugeSys.draw(state);
            }
          }
        }
      }
    };
  }
};
