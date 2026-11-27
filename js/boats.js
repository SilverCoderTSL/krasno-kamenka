// ============================================================================
// js/boats.js (v15.3.1 ONLINE) — Museum-Grade Naval Models & 60 FPS Optimization!
// • Faceted Sculpted Hulls + Procedural Naval CanvasTextures ("770", "D-144", "STRELA-X1")
// • Single Shared Pooled Bridge Searchlight (Zero per-boat shader tax!)
// • Realistic Full-Scale Vessels:
//   - Projekt 12322 "Zubr" LCAC Hovercraft (52m × 22m, 150t, 6 Bays, Pleated Skirt, AK-630 CIWS)
//   - Projekt 11770 "Serna" Tank Landing Barge (28m × 9.2m, 75t, Chined Hull, Ramp Winches)
//   - Krasnaya Utility Patrol Boat (14.8m × 5.0m, 4.5t, Deep-V Planing Hull, Twin Outboards)
//   - Strela-X1 Offshore Speedboat (9.4m × 2.5m, 155 km/h, Stepped Hull, Cockpit & Aero Wing)
// • Shipmaster Deck Lock [U], Anchor [Space], Nav Lights [L], Searchlight [K]
// ============================================================================
window.KK = window.KK || {};

KK.BoatManager = class BoatManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.spawnedBoats = [];
    this.activeBoat = null;
    this.remoteBoats = new Map();
    this.wavePhase = 0;
    this.chopPhase = 0;

    // Reusable scratch math objects (zero per-frame GC allocations!)
    this._tmpQ = new THREE.Quaternion();
    this._tmpE = new THREE.Euler(0, 0, 0, "YXZ");
    this._tmpV = new THREE.Vector3();
    this._tmpT = new THREE.Vector3();

    // v15.3.1 SINGLE SHARED POOLED SEARCHLIGHT (Replaces per-boat SpotLights!)
    this.sharedSpotLight = new THREE.SpotLight(0xdaf6ff, 0.0, 320, 0.56, 0.48, 1.0);
    this.sharedSpotTarget = new THREE.Object3D();
    this.sharedSpotLight.target = this.sharedSpotTarget;
    this.scene.add(this.sharedSpotLight);
    this.scene.add(this.sharedSpotTarget);

    // Cached procedural naval textures
    this._texCache = {};
  }

  _buildFacetedMesh(verts, faces, mat, uvScale = 0.08) {
    const pos = [], uvs = [];
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
    mesh.receiveShadow = true;
    return mesh;
  }

  _getNavalTex(key) {
    if (this._texCache[key]) return this._texCache[key];
    const cv = document.createElement("canvas");
    cv.width = 512; cv.height = 256;
    const ctx = cv.getContext("2d");

    if (key === "naval_steel" || key === "zubr_side" || key === "serna_side") {
      ctx.fillStyle = "#5f6e7a"; ctx.fillRect(0, 0, 512, 256);
      // Welded steel hull plate grid & subtle weathering
      ctx.strokeStyle = "rgba(22, 30, 38, 0.42)"; ctx.lineWidth = 2;
      for (let x = 0; x < 512; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 256); ctx.stroke(); }
      for (let y = 0; y < 256; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
      // Vertical rust streaks below deck edge
      for (let r = 0; r < 14; r++) {
        const rx = (r * 37 + 19) % 490;
        const grad = ctx.createLinearGradient(0, 20, 0, 140 + (r % 3) * 30);
        grad.addColorStop(0, "rgba(116, 62, 36, 0.36)");
        grad.addColorStop(1, "rgba(116, 62, 36, 0.0)");
        ctx.fillStyle = grad;
        ctx.fillRect(rx, 20, 8 + (r % 4) * 3, 130);
      }
      if (key === "zubr_side") {
        // Bold Russian Navy Hull Number "770" + Naval Ensign Stripe!
        ctx.fillStyle = "#f2f6fa"; ctx.font = "900 84px monospace"; ctx.textAlign = "center";
        ctx.fillText("770", 145, 148);
        ctx.fillStyle = "#dce6f0"; ctx.font = "bold 22px monospace";
        ctx.fillText("PROJEKT 12322 • ZUBR", 348, 128);
        ctx.fillStyle = "#ffd166"; ctx.fillRect(250, 144, 195, 7);
      } else if (key === "serna_side") {
        ctx.fillStyle = "#f2f6fa"; ctx.font = "900 72px monospace"; ctx.textAlign = "center";
        ctx.fillText("D-144", 155, 146);
        ctx.fillStyle = "#dce6f0"; ctx.font = "bold 20px monospace";
        ctx.fillText("SERNA • 11770", 362, 136);
      }
    } else if (key === "steel_deck") {
      ctx.fillStyle = "#3e474e"; ctx.fillRect(0, 0, 512, 256);
      // Diamond treadplate & non-skid wear ribs
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      for (let y = 0; y < 256; y += 16) {
        for (let x = 0; x < 512; x += 16) {
          ctx.fillRect(x + ((y / 16) % 2) * 8, y, 6, 3);
        }
      }
      // Tire track wear lanes
      ctx.fillStyle = "rgba(16, 20, 24, 0.25)";
      ctx.fillRect(0, 42, 512, 34); ctx.fillRect(0, 180, 512, 34);
    } else if (key === "hazard_ramp") {
      ctx.fillStyle = "#2d343b"; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#ffd166";
      for (let x = -256; x < 768; x += 48) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 84, 52); ctx.lineTo(x + 60, 52); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x, 204); ctx.lineTo(x + 24, 204); ctx.lineTo(x + 84, 256); ctx.lineTo(x + 60, 256); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = "rgba(180, 195, 210, 0.16)"; ctx.lineWidth = 3;
      for (let y = 64; y < 196; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke(); }
    } else if (key === "patrol_side") {
      ctx.fillStyle = "#194d78"; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#f2f6fa"; ctx.fillRect(0, 0, 512, 58);
      ctx.fillStyle = "#d62828";
      ctx.beginPath(); ctx.moveTo(115, 0); ctx.lineTo(155, 0); ctx.lineTo(115, 256); ctx.lineTo(75, 256); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "900 38px monospace"; ctx.textAlign = "left";
      ctx.fillText("KRASNAYA-04", 185, 148);
    } else if (key === "strela_livery") {
      ctx.fillStyle = "#f4f7fa"; ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = "#d62828";
      ctx.beginPath(); ctx.moveTo(0, 95); ctx.lineTo(512, 65); ctx.lineTo(512, 138); ctx.lineTo(0, 152); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#141920";
      ctx.beginPath(); ctx.moveTo(0, 154); ctx.lineTo(512, 140); ctx.lineTo(512, 175); ctx.lineTo(0, 185); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.font = "italic 900 34px monospace"; ctx.textAlign = "center";
      ctx.fillText("STRELA-X1", 275, 118);
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    this._texCache[key] = tex;
    return tex;
  }

  getPortPadWorldPos(pt) {
    const yaw = pt.yaw || 0;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return {
      x: pt.x + 26 * s,
      z: pt.z + 26 * c,
      seaY: (KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0) + 2.2
    };
  }

  getPortMoatSpawnPos(pt, boatSpec = null) {
    const yaw = pt.yaw || 0;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    // Exact front lip of each port's concrete/wood pier deck!
    const pierLipZ = (pt.islandId === 2) ? 51.5 : ((pt.islandId === 4) ? 28.5 : ((pt.islandId === 1) ? 33.5 : ((pt.islandId === 5) ? 29.5 : 35.5)));
    if (boatSpec && (boatSpec.id === "zubr" || boatSpec.id === "serna")) {
      // Bow loading ramp points STRAIGHT BACK toward the pier lip (180° flipped!)
      const rampReach = (boatSpec.id === "zubr") ? 26.2 : 16.4;
      const centerZ = pierLipZ + rampReach;
      return { x: pt.x + centerZ * s, z: pt.z + centerZ * c, yaw: yaw + Math.PI };
    }
    if (boatSpec && boatSpec.id === "patrol") {
      // Stern loading bay backs straight up to the pier lip!
      const centerZ = pierLipZ + 9.2;
      return { x: pt.x + centerZ * s, z: pt.z + centerZ * c, yaw: yaw };
    }
    // Strela-X1 moors right alongside the pier edge!
    const sideOff = 15.0, fwdOff = pierLipZ + 4.0;
    return {
      x: pt.x + (sideOff * c + fwdOff * s),
      z: pt.z + (-sideOff * s + fwdOff * c),
      yaw: yaw
    };
  }

  // v15.4 PHYSICAL DRIVE-ON RAMP & CARGO DECK SURFACE QUERY (Called by world.getTerrainInfo!)
  getDriveableSurfaceAt(gx, gz, groundH = null) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    const checkList = this.spawnedBoats.concat(Array.from(this.remoteBoats.values()));
    for (let i = 0; i < checkList.length; i++) {
      const b = checkList[i];
      const sp = b.spec;
      if (!sp || !sp.maxPayloadKg) continue;
      const dx = gx - b.gx, dz = gz - b.gz;
      const maxR = sp.len * 0.72 + 12;
      if (Math.abs(dx) > maxR || Math.abs(dz) > maxR) continue;
      const c = Math.cos(-(b.yaw || 0)), s = Math.sin(-(b.yaw || 0));
      const lx = dx * c + dz * s;
      const lz = -dx * s + dz * c;
      const deckH = b.gy + sp.deckY;

      if (b.id === "zubr") {
        // Main 13.4m × 36m steel well-deck
        if (Math.abs(lx) <= 6.7 && lz >= -16.5 && lz <= 20.5) {
          return { height: deckH, boat: b, onRamp: false, lx, lz };
        }
        // v16.7 Smoothstep feathered bow loading ramp (meets actual pier/beach height flush — zero bump!)
        if (!b.deckLocked && b.rampAnim > 0.35 && Math.abs(lx) <= 6.6 && lz > 20.2 && lz <= 31.0) {
          const u = Math.max(0, Math.min(1, (lz - 20.2) / 10.6));
          const su = u * u * (3 - 2 * u);
          const tipY = (groundH !== null) ? Math.min(deckH - 0.08, Math.max(seaL + 0.12, groundH)) : Math.max(seaL + 2.55, b.gy + 1.65);
          return { height: deckH * (1 - su) + tipY * su, boat: b, onRamp: true, lx, lz };
        }
      } else if (b.id === "serna") {
        if (Math.abs(lx) <= 3.4 && lz >= -7.8 && lz <= 12.4) {
          return { height: deckH, boat: b, onRamp: false, lx, lz };
        }
        if (!b.deckLocked && b.rampAnim > 0.35 && Math.abs(lx) <= 3.4 && lz > 12.2 && lz <= 20.2) {
          const u = Math.max(0, Math.min(1, (lz - 12.2) / 7.8));
          const su = u * u * (3 - 2 * u);
          const tipY = (groundH !== null) ? Math.min(deckH - 0.08, Math.max(seaL + 0.12, groundH)) : Math.max(seaL + 2.55, b.gy + 1.45);
          return { height: deckH * (1 - su) + tipY * su, boat: b, onRamp: true, lx, lz };
        }
      } else if (b.id === "patrol") {
        if (Math.abs(lx) <= 2.15 && lz >= -6.6 && lz <= 1.2) {
          return { height: deckH, boat: b, onRamp: false, lx, lz };
        }
        if (!b.deckLocked && b.rampAnim > 0.35 && Math.abs(lx) <= 2.05 && lz < -6.4 && lz >= -12.2) {
          const u = Math.max(0, Math.min(1, (-6.4 - lz) / 5.6));
          const su = u * u * (3 - 2 * u);
          const tipY = (groundH !== null) ? Math.min(deckH - 0.08, Math.max(seaL + 0.12, groundH)) : Math.max(seaL + 2.55, b.gy + 1.10);
          return { height: deckH * (1 - su) + tipY * su, boat: b, onRamp: true, lx, lz };
        }
      }
    }
    return null;
  }

  findBoatUnderPoint(gx, gz, allowRamp = false) {
    const s = this.getDriveableSurfaceAt(gx, gz);
    if (!s) return null;
    return (allowRamp || !s.onRamp) ? s : null;
  }

  // v15.4.3 SOLID CLOSED-RAMP & DECK BULWARK COLLISION (Ram into closed ramp if UP!)
  resolveDeckWallCollisions(vehicle) {
    if (!vehicle || !vehicle.pos) return { hitRamp: false, hitWall: false };
    // Skip if already strapped/welded to deck
    if (this.findLocalMountedBoat()) return { hitRamp: false, hitWall: false };
    const gx = vehicle.pos.x, gz = vehicle.pos.z;
    const surf = this.getDriveableSurfaceAt(gx, gz);
    if (!surf || !surf.boat) return { hitRamp: false, hitWall: false };
    const b = surf.boat;
    const sp = b.spec;
    if (!sp || !sp.maxPayloadKg) return { hitRamp: false, hitWall: false };

    const c = Math.cos(-(b.yaw || 0)), s = Math.sin(-(b.yaw || 0));
    const dx = gx - b.gx, dz = gz - b.gz;
    let lx = dx * c + dz * s;
    let lz = -dx * s + dz * c;
    const halfCarW = (vehicle.spec.bodyWidth || 2.0) * 0.45;
    const halfCarL = (vehicle.spec.bodyLen || 4.6) * 0.44;
    const rampClosed = !!(b.deckLocked || b.rampAnim < 0.50);

    let minX, maxX, minZ, maxZ, rampIsFront = true;
    if (b.id === "zubr") {
      minX = -6.5 + halfCarW; maxX = 6.5 - halfCarW;
      minZ = -16.0 + halfCarL; maxZ = rampClosed ? (19.6 - halfCarL) : 32.0;
      rampIsFront = true;
    } else if (b.id === "serna") {
      minX = -3.25 + halfCarW; maxX = 3.25 - halfCarW;
      minZ = -7.5 + halfCarL; maxZ = rampClosed ? (11.8 - halfCarL) : 22.0;
      rampIsFront = true;
    } else if (b.id === "patrol") {
      minX = -2.05 + halfCarW; maxX = 2.05 - halfCarW;
      minZ = rampClosed ? (-6.2 + halfCarL) : -14.0; maxZ = 0.8 - halfCarL;
      rampIsFront = false;
    } else {
      return { hitRamp: false, hitWall: false };
    }

    let clamped = false, hitRamp = false;
    if (lx < minX) { lx = minX; clamped = true; }
    else if (lx > maxX) { lx = maxX; clamped = true; }
    if (lz < minZ) {
      lz = minZ; clamped = true;
      if (!rampIsFront && rampClosed) hitRamp = true;
    } else if (lz > maxZ) {
      lz = maxZ; clamped = true;
      if (rampIsFront && rampClosed) hitRamp = true;
    }

    if (clamped) {
      const cw = Math.cos(b.yaw || 0), sw = Math.sin(b.yaw || 0);
      vehicle.pos.x = b.gx + (lx * cw - lz * sw);
      vehicle.pos.z = b.gz + (lx * sw + lz * cw);
      // Bounce velocity cleanly off steel ramp/bulkhead!
      vehicle.vel.x = b.vx + (vehicle.vel.x - b.vx) * -0.35;
      vehicle.vel.z = b.vz + (vehicle.vel.z - b.vz) * -0.35;
      return { hitRamp, hitWall: true };
    }
    return { hitRamp: false, hitWall: false };
  }

  // v15.4.3 ANYONE CAN DRIVE: Claim a friend's remote ship into local control when pressing [P]!
  claimRemoteBoatForHelm(remoteBoat) {
    if (!remoteBoat || !remoteBoat.id || !KK.BOATS[remoteBoat.id]) return null;
    let existing = this.spawnedBoats.find((b) => b.id === remoteBoat.id);
    if (!existing) {
      const built = this._buildBoatMesh(remoteBoat.id);
      this.scene.add(built.grp);
      existing = {
        id: remoteBoat.id, spec: KK.BOATS[remoteBoat.id],
        mesh: built.grp, fans: built.fans, radars: built.radars, helmWheel: built.helmWheel, helmLever: built.helmLever, skirtMesh: built.skirtMesh,
        rampPivot: built.rampPivot, rampRestRotX: built.rampRestRotX, rampOpenRotX: built.rampOpenRotX,
        navLightsGroup: built.navLightsGroup, spotCone: built.spotCone, spotMountLocal: built.spotMountLocal,
        bayChains: built.bayChains,
        gx: remoteBoat.gx, gy: remoteBoat.gy, gz: remoteBoat.gz, yaw: remoteBoat.yaw || 0, pitch: 0, roll: 0,
        vx: 0, vz: 0, speedKmh: 0, throttleCmd: 0, boostCmd: false,
        anchored: false, deckLocked: !!remoteBoat.deckLocked, unlockWarnUntil: 0,
        navLightsOn: true, spotLightOn: false, waterDepth: 12, isBeached: false,
        rampAnim: remoteBoat.deckLocked ? 0.0 : 1.0, cushionAnim: 1.0, deckVehicles: []
      };
      this.spawnedBoats.push(existing);
    } else {
      existing.gx = remoteBoat.gx; existing.gy = remoteBoat.gy; existing.gz = remoteBoat.gz;
      existing.yaw = remoteBoat.yaw || 0; existing.deckLocked = !!remoteBoat.deckLocked;
      existing.rampAnim = existing.deckLocked ? 0.0 : 1.0;
    }
    return existing;
  }

  findNearbyPort(gx, gz, maxDist = 48) {
    if (!KK.PORTS) return null;
    let best = null, bestD = maxDist;
    for (const pt of KK.PORTS) {
      const pad = this.getPortPadWorldPos(pt);
      const d = Math.min(Math.hypot(gx - pad.x, gz - pad.z), Math.hypot(gx - pt.x, gz - pt.z));
      if (d < bestD) { bestD = d; best = { port: pt, pad, dist: d }; }
    }
    return best;
  }

  findNearbyBoat(gx, gz, maxDist = 36, includeRemote = true) {
    let best = null, bestD = maxDist;
    for (const b of this.spawnedBoats) {
      const reach = Math.max(maxDist, b.spec.len * 0.72);
      const d = Math.hypot(gx - b.gx, gz - b.gz);
      if (d < reach && d < bestD) { bestD = d; best = { boat: b, dist: d, isRemote: false, ownerPeerId: null }; }
    }
    if (includeRemote) {
      for (const [pid, rb] of this.remoteBoats.entries()) {
        const reach = Math.max(maxDist, (rb.spec ? rb.spec.len : 18) * 0.72);
        const d = Math.hypot(gx - rb.gx, gz - rb.gz);
        if (d < reach && d < bestD) { bestD = d; best = { boat: rb, dist: d, isRemote: true, ownerPeerId: pid }; }
      }
    }
    return best;
  }

  boatLocalToWorld(boat, lx, ly, lz, outVec = new THREE.Vector3()) {
    this._tmpE.set(boat.pitch || 0, boat.yaw || 0, boat.roll || 0, "YXZ");
    this._tmpQ.setFromEuler(this._tmpE);
    outVec.set(lx, ly, lz).applyQuaternion(this._tmpQ);
    outVec.x += boat.gx;
    outVec.y += boat.gy;
    outVec.z += boat.gz;
    return outVec;
  }

  worldToBoatLocal(boat, gx, gz) {
    const dx = gx - boat.gx, dz = gz - boat.gz;
    const c = Math.cos(-(boat.yaw || 0)), s = Math.sin(-(boat.yaw || 0));
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
  }

  clampToWalkDeck(boat, lx, lz) {
    const wb = boat.spec && boat.spec.walkBounds;
    if (!wb) return { x: 0, z: 0 };
    return {
      x: Math.max(wb.minX, Math.min(wb.maxX, lx)),
      z: Math.max(wb.minZ, Math.min(wb.maxZ, lz))
    };
  }

  _buildBoatMesh(boatId) {
    const grp = new THREE.Group();
    const fans = [];
    const radars = [];
    let helmWheel = null;
    let helmLever = null;
    let skirtMesh = null;
    let rampPivot = null;
    let rampRestRotX = 0.0;
    let rampOpenRotX = 1.25;
    const navLightsGroup = new THREE.Group();
    let spotCone = null;
    let spotMountLocal = { x: 0, y: 4.0, z: 6.0 };
    const bayChains = [];

    const matHullDark = new THREE.MeshStandardMaterial({ color: 0x2f3840, roughness: 0.72, metalness: 0.38 });
    const matNavalGry = new THREE.MeshStandardMaterial({ map: this._getNavalTex("naval_steel"), color: 0xdbe3ea, roughness: 0.68, metalness: 0.30 });
    const matNavalLt  = new THREE.MeshStandardMaterial({ color: 0x7a8a96, roughness: 0.58, metalness: 0.28 });
    const matDeck     = new THREE.MeshStandardMaterial({ map: this._getNavalTex("steel_deck"), roughness: 0.86, metalness: 0.24 });
    const matRampTx   = new THREE.MeshStandardMaterial({ map: this._getNavalTex("hazard_ramp"), roughness: 0.76, metalness: 0.32 });
    const matRedOxide = new THREE.MeshStandardMaterial({ color: 0x7c2520, roughness: 0.78, metalness: 0.20 });
    const matSkirt    = new THREE.MeshStandardMaterial({ color: 0x171a1e, roughness: 0.94 });
    const matRed      = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.42, metalness: 0.25 });
    const matWhite    = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.34, metalness: 0.16 });
    const matChrome   = new THREE.MeshStandardMaterial({ color: 0xd8e2ec, roughness: 0.22, metalness: 0.88 });
    const matOrange   = new THREE.MeshStandardMaterial({ color: 0xf77f00, roughness: 0.48 });
    const matGlass    = new THREE.MeshStandardMaterial({ color: 0x10293a, emissive: 0x0b3850, emissiveIntensity: 0.65, roughness: 0.14, metalness: 0.72 });
    const matRail     = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.48, metalness: 0.68 });
    const matStripeY  = new THREE.MeshBasicMaterial({ color: 0xffd166 });
    const matNavRed   = new THREE.MeshBasicMaterial({ color: 0xff2a38 });
    const matNavGrn   = new THREE.MeshBasicMaterial({ color: 0x1cff68 });
    const matNavWht   = new THREE.MeshBasicMaterial({ color: 0xf4fcff });
    const matChainY   = new THREE.MeshStandardMaterial({ color: 0xffb703, emissive: 0x6b4400, roughness: 0.4, metalness: 0.65 });

    const addNavLight = (x, y, z, mat, rad = 0.28) => {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(rad, 8, 6), mat);
      orb.position.set(x, y, z);
      navLightsGroup.add(orb);
    };

    const addTieDownBayVisual = (bx, by, bz, bw, bl) => {
      const lineL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, bl), matStripeY);
      lineL.position.set(bx - bw * 0.46, by + 0.03, bz); grp.add(lineL);
      const lineR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, bl), matStripeY);
      lineR.position.set(bx + bw * 0.46, by + 0.03, bz); grp.add(lineR);

      const chGrp = new THREE.Group();
      chGrp.position.set(bx, by + 0.06, bz);
      for (const cx of [-bw * 0.36, bw * 0.36]) {
        for (const cz of [-bl * 0.32, bl * 0.32]) {
          const chock = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.24, 0.38), matChainY);
          chock.position.set(cx, 0.12, cz); chGrp.add(chock);
        }
      }
      for (const cz of [-bl * 0.30, bl * 0.30]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.72, 0.09, 0.09), matChainY);
        bar.position.set(0, 0.22, cz); chGrp.add(bar);
      }
      chGrp.visible = false;
      grp.add(chGrp);
      bayChains.push(chGrp);
    };

    const attachSearchlightHousing = (sx, sy, sz) => {
      spotMountLocal = { x: sx, y: sy, z: sz };
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.52, 10), matWhite);
      lamp.rotation.x = Math.PI / 2; lamp.position.set(sx, sy, sz); grp.add(lamp);
      spotCone = new THREE.Mesh(
        new THREE.ConeGeometry(7.5, 44, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      spotCone.rotation.x = -Math.PI / 2 + 0.08;
      spotCone.position.set(sx, sy - 1.5, sz + 22.5);
      spotCone.visible = false;
      grp.add(spotCone);
    };

    const matConsole = new THREE.MeshStandardMaterial({ color: 0x1a222a, roughness: 0.72, metalness: 0.35 });
    const matRadarSc = new THREE.MeshBasicMaterial({ color: 0x19ff6e });
    const matPlotSc  = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const matBrass   = new THREE.MeshStandardMaterial({ color: 0xd9a016, roughness: 0.35, metalness: 0.8 });
    const matBridgeGlass = new THREE.MeshStandardMaterial({ color: 0x1a445c, emissive: 0x0a2636, emissiveIntensity: 0.45, roughness: 0.12, metalness: 0.6, transparent: true, opacity: 0.32 });

    const buildBridgeInterior = (bx, by, bz, bw, bl, scale = 1.0) => {
      const bGrp = new THREE.Group();
      bGrp.position.set(bx, by, bz);
      // Sloped Helm Console Dashboard
      const cons = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.86, 0.95 * scale, 0.95 * scale), matConsole);
      cons.position.set(0, 0.48 * scale, bl * 0.30); bGrp.add(cons);
      const topPanel = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.84, 0.14 * scale, 0.72 * scale), matHullDark);
      topPanel.position.set(0, 1.00 * scale, bl * 0.28); topPanel.rotation.x = 0.28; bGrp.add(topPanel);
      // Glowing Green Radar PPI Scope & Cyan Sonar/GPS Chart Plotter!
      const radSc = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 0.05 * scale, 12), matRadarSc);
      radSc.rotation.x = Math.PI / 2 + 0.28; radSc.position.set(-bw * 0.24, 1.06 * scale, bl * 0.25); bGrp.add(radSc);
      const gpsSc = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.34 * scale, 0.05 * scale), matPlotSc);
      gpsSc.rotation.x = -0.25; gpsSc.position.set(bw * 0.24, 1.12 * scale, bl * 0.27); bGrp.add(gpsSc);
      // Brass Compass Binnacle on Centerline
      const binn = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.20 * scale, 0.42 * scale, 10), matBrass);
      binn.position.set(0, 1.16 * scale, bl * 0.32); bGrp.add(binn);
      // Animated Ship's Helm Wheel!
      helmWheel = new THREE.Group();
      helmWheel.position.set(0, 1.06 * scale, bl * 0.10);
      const wRim = new THREE.Mesh(new THREE.TorusGeometry(0.32 * scale, 0.04 * scale, 8, 16), matBrass);
      helmWheel.add(wRim);
      for (let sp = 0; sp < 4; sp++) {
        const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.78 * scale, 6), matBrass);
        spoke.rotation.z = (sp / 4) * Math.PI; helmWheel.add(spoke);
      }
      bGrp.add(helmWheel);
      // Animated Engine Telegraph Throttle Lever!
      helmLever = new THREE.Group();
      helmLever.position.set(bw * 0.16, 1.02 * scale, bl * 0.16);
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.42 * scale, 6), matChrome);
      stalk.position.y = 0.20 * scale; helmLever.add(stalk);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 8, 6), matRed);
      knob.position.y = 0.42 * scale; helmLever.add(knob);
      bGrp.add(helmLever);
      // Captain's Swivel Helm Chair
      const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 0.65 * scale, 8), matHullDark);
      chairBase.position.set(0, 0.32 * scale, -bl * 0.16); bGrp.add(chairBase);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale, 0.14 * scale, 0.58 * scale), matSkirt);
      seat.position.set(0, 0.68 * scale, -bl * 0.16); bGrp.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.60 * scale, 0.72 * scale, 0.12 * scale), matSkirt);
      back.position.set(0, 1.05 * scale, -bl * 0.26); bGrp.add(back);
      // Overhead VHF Radio & Instrument Box
      const ovh = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.70, 0.28 * scale, 0.48 * scale), matConsole);
      ovh.position.set(0, 2.05 * scale, bl * 0.22); bGrp.add(ovh);
      // Corner Structural Window Mullions + Translucent Bridge Glass!
      for (const mx of [-bw * 0.46, -bw * 0.16, bw * 0.16, bw * 0.46]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(0.14 * scale, 1.45 * scale, 0.14 * scale), matNavalLt);
        pil.position.set(mx, 1.55 * scale, bl * 0.44); bGrp.add(pil);
      }
      const fwdGlass = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.90, 1.25 * scale, 0.06 * scale), matBridgeGlass);
      fwdGlass.position.set(0, 1.55 * scale, bl * 0.46); bGrp.add(fwdGlass);
      grp.add(bGrp);
    };

    if (boatId === "zubr") {
      // ======================================================================
      // PROJEKT 12322 "ZUBR" LCAC HOVERCRAFT — MUSEUM-GRADE 52.0m × 22.0m!
      // ======================================================================
      const matZubrSide = new THREE.MeshStandardMaterial({ map: this._getNavalTex("zubr_side"), roughness: 0.66, metalness: 0.30 });

      // 1. Segmented Pleated Rubber Air-Cushion Skirt Group (deflates smoothly on Anchor!)
      skirtMesh = new THREE.Group();
      const skirtCore = new THREE.Mesh(new THREE.BoxGeometry(20.6, 2.05, 49.4), matSkirt);
      skirtCore.position.set(0, 1.02, 0); skirtMesh.add(skirtCore);
      // Pleated rubber cushion fingers along both sides & bow!
      const fingerGeo = new THREE.CylinderGeometry(0.95, 1.05, 2.08, 7);
      for (let fz = -22.5; fz <= 22.5; fz += 2.5) {
        for (const sx of [-10.5, 10.5]) {
          const fg = new THREE.Mesh(fingerGeo, matSkirt);
          fg.position.set(sx, 1.04, fz); skirtMesh.add(fg);
        }
      }
      for (let fx = -9.0; fx <= 9.0; fx += 2.25) {
        const fg = new THREE.Mesh(fingerGeo, matSkirt);
        fg.position.set(fx, 1.04, 24.9); skirtMesh.add(fg);
      }
      grp.add(skirtMesh);

      // 2. Faceted Tapered Armored Hull Base + Ribbed Steel Well-Deck!
      const zHullV = [
        [-10.4, 2.02, -24.5], [ 10.4, 2.02, -24.5], [-10.4, 2.02, 16.5], [ 10.4, 2.02, 16.5],
        [-7.6,  2.02,  24.2], [  7.6, 2.02,  24.2],
        [-10.2, 3.10, -24.2], [ 10.2, 3.10, -24.2], [-10.2, 3.10, 16.5], [ 10.2, 3.10, 16.5],
        [-7.2,  3.10,  23.8], [  7.2, 3.10,  23.8]
      ];
      const zHullF = [
        [0,1,7,6], [0,6,8,2], [1,3,9,7], [2,8,10,4], [3,5,11,9], [4,10,11,5],
        [6,7,9,8], [8,9,11,10]
      ];
      grp.add(this._buildFacetedMesh(zHullV, zHullF, matNavalGry, 0.05));

      const deck = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.16, 36.2), matDeck);
      deck.position.set(0, 3.14, 2.0); deck.receiveShadow = true; grp.add(deck);
      for (const b of KK.BOATS.zubr.bays) addTieDownBayVisual(b.x, 3.20, b.z, 5.4, 9.2);

      // 3. Faceted Port & Starboard Armored Sponsons with "770" Hull Number, Intakes, Life-Rafts & Bollards!
      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 41.5), matNavalGry);
        sp.position.set(sx * 8.4, 4.4, -1.2); grp.add(sp);
        const noseBevel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.5, 5.2), matNavalGry);
        noseBevel.position.set(sx * 7.8, 4.35, 20.6); noseBevel.rotation.y = -sx * 0.28; grp.add(noseBevel);
        // Hull number "770" plaque on forward flank
        const sidePl = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 2.2), matZubrSide);
        sidePl.position.set(sx * 10.24, 4.45, 8.5); sidePl.rotation.y = sx * Math.PI * 0.5; grp.add(sidePl);
        // Walkable catwalk handrails + safety stanchions
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 40.8), matRail);
        rail.position.set(sx * 10.1, 6.55, -1.2); grp.add(rail);
        for (let rz = -20; rz <= 18; rz += 6.3) {
          const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 5), matRail);
          st.position.set(sx * 10.1, 6.1, rz); grp.add(st);
        }
        // Turbine air-intake louvers + twin white inflatable life-raft canisters + mooring bollards
        for (let lv = 0; lv < 5; lv++) {
          const intake = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.15, 2.4), matHullDark);
          intake.position.set(sx * 10.25, 4.45, -15 + lv * 4.4); grp.add(intake);
        }
        for (const lz of [-8.0, -5.8]) {
          const raft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.45, 10), matWhite);
          raft.rotation.x = Math.PI / 2; raft.position.set(sx * 9.3, 6.05, lz); grp.add(raft);
        }
        for (const bz of [17.5, 2.0, -14.5]) {
          const boll = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.65, 8), matHullDark);
          boll.position.set(sx * 7.0, 5.95, bz); grp.add(boll);
        }
      }

      // 4. Multi-Tier Starboard Armored Bridge + Sloped Glass + Spinning Radar + Exhaust Stacks + Twin AK-630 CIWS!
      const bridgeLower = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.8, 10.8), matNavalGry);
      bridgeLower.position.set(7.8, 6.9, 7.6); grp.add(bridgeLower);
      const bridgeRoof = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.28, 7.6), matNavalLt);
      bridgeRoof.position.set(7.8, 10.65, 8.4); grp.add(bridgeRoof);
      const bridgeBack = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.3, 1.6), matNavalLt);
      bridgeBack.position.set(7.8, 9.45, 5.4); grp.add(bridgeBack);
      buildBridgeInterior(7.8, 8.32, 9.2, 3.6, 5.6, 1.05);
      // Exterior bridge wing walkway + whip radio antennas!
      const wingDeck = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 4.6), matDeck);
      wingDeck.position.set(10.5, 8.32, 8.8); grp.add(wingDeck);
      for (const az of [6.4, 7.6]) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 5.2, 5), matChrome);
        ant.position.set(9.7, 13.2, az); grp.add(ant);
      }
      const bVisor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.16, 1.2), matHullDark);
      bVisor.position.set(7.8, 9.9, 12.2); bVisor.rotation.x = 0.22; grp.add(bVisor);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 6.8, 8), matHullDark);
      mast.position.set(7.8, 13.2, 6.4); grp.add(mast);
      const radBar = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.34, 0.48), matWhite);
      radBar.position.set(7.8, 15.8, 6.4); grp.add(radBar);
      radars.push(radBar);

      // Twin angled gas-turbine exhaust stacks behind bridge
      for (const sx of [-7.6, 7.6]) {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.78, 2.8, 10), matHullDark);
        stack.position.set(sx, 6.9, -12.5); stack.rotation.x = -0.25; grp.add(stack);
        // Twin AK-630 30mm Rotary CIWS Turrets with barrels!
        const ciws = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.12, 1.65, 12), matNavalLt);
        ciws.position.set(sx, 6.45, 16.6); grp.add(ciws);
        const ciwsBar = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.2, 8), matHullDark);
        ciwsBar.rotation.x = Math.PI / 2 - 0.12; ciwsBar.position.set(sx, 6.65, 18.2); grp.add(ciwsBar);
      }

      // 5. Ribbed Hazard-Striped Articulating Hydraulic Bow Ramp!
      rampPivot = new THREE.Group();
      rampPivot.position.set(0, 3.08, 20.2);
      const rampSlab = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.40, 7.0), matRampTx);
      rampSlab.position.set(0, 0, 3.5); rampPivot.add(rampSlab);
      rampRestRotX = -1.18; rampOpenRotX = 0.26;
      rampPivot.rotation.x = rampRestRotX;
      grp.add(rampPivot);

      // 6. Three 5.2m Shrouded Propulsor Ducts + Rudder Vanes + 4-Blade Turbines!
      for (const fx of [-6.0, 0, 6.0]) {
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(2.68, 2.68, 2.4, 16, 1, true), matHullDark);
        duct.rotation.x = Math.PI / 2; duct.position.set(fx, 6.25, -21.5); grp.add(duct);
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.70, 2.7, 2.0), matNavalGry);
        pylon.position.set(fx, 3.9, -21.5); grp.add(pylon);
        for (const vx of [-0.9, 0.9]) {
          const vane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.4, 1.2), matNavalLt);
          vane.position.set(fx + vx, 6.25, -23.0); grp.add(vane);
        }
        const hub = new THREE.Group(); hub.position.set(fx, 6.25, -21.4);
        const noseCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 8), matHullDark);
        noseCone.rotation.x = Math.PI / 2; hub.add(noseCone);
        for (let b = 0; b < 4; b++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.8, 0.12), matWhite);
          bl.rotation.z = (b / 4) * Math.PI; hub.add(bl);
        }
        grp.add(hub); fans.push(hub);
      }

      addNavLight(-10.2, 6.8,  16.5, matNavRed, 0.44);
      addNavLight( 10.2, 6.8,  16.5, matNavGrn, 0.44);
      addNavLight(  7.8, 16.6,  6.4, matNavWht, 0.46);
      addNavLight(  0.0, 6.9, -23.2, matNavWht, 0.40);
      attachSearchlightHousing(7.8, 10.2, 12.2);

    } else if (boatId === "serna") {
      // ======================================================================
      // PROJEKT 11770 "SERNA" TANK LANDING BARGE — MUSEUM-GRADE 28.0m × 9.2m!
      // ======================================================================
      const matSernaSide = new THREE.MeshStandardMaterial({ map: this._getNavalTex("serna_side"), roughness: 0.68, metalness: 0.30 });

      // Chined Faceted Steel Hull + Red-Oxide Anti-Fouling Waterline!
      const sVerts = [
        [-4.0, -0.30, -13.6], [ 4.0, -0.30, -13.6], [-4.1, -0.30, 10.8], [ 4.1, -0.30, 10.8], [-3.4, -0.10, 13.6], [ 3.4, -0.10, 13.6],
        [-4.6,  1.92, -13.8], [ 4.6,  1.92, -13.8], [-4.6,  1.92, 11.2], [ 4.6,  1.92, 11.2], [-3.6,  2.10, 14.0], [ 3.6,  2.10, 14.0]
      ];
      const sFaces = [
        [0,1,7,6], [0,6,8,2], [1,3,9,7], [2,8,10,4], [3,5,11,9], [4,10,11,5],
        [6,7,9,8], [8,9,11,10]
      ];
      grp.add(this._buildFacetedMesh(sVerts, sFaces, matNavalGry, 0.08));
      const waterline = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.55, 26.8), matRedOxide);
      waterline.position.set(0, 0.05, 0.0); grp.add(waterline);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.16, 20.0), matDeck);
      deck.position.set(0, 1.96, 2.2); deck.receiveShadow = true; grp.add(deck);
      for (const b of KK.BOATS.serna.bays) addTieDownBayVisual(b.x, 2.02, b.z, 5.2, 8.2);

      // Thick Bulwarks, Rubber Dock Fenders, "D-144" Hull Numbers, Catwalks & Ramp Winch Drums!
      for (const sx of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.55, 22.8), matNavalGry);
        wall.position.set(sx * 3.95, 2.66, 0.8); grp.add(wall);
        const sidePl = new THREE.Mesh(new THREE.PlaneGeometry(10.5, 1.45), matSernaSide);
        sidePl.position.set(sx * 4.58, 2.68, 3.0); sidePl.rotation.y = sx * Math.PI * 0.5; grp.add(sidePl);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 22.0), matRail);
        rail.position.set(sx * 4.5, 4.18, 0.8); grp.add(rail);
        for (let fz = -9; fz <= 9; fz += 4.5) {
          const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.15, 8), matSkirt);
          fender.position.set(sx * 4.68, 1.25, fz); grp.add(fender);
        }
        // Bow ramp winch drum & lift cable stanchion
        const winch = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.65, 8), matHullDark);
        winch.rotation.z = Math.PI / 2; winch.position.set(sx * 3.85, 3.65, 11.4); grp.add(winch);
      }

      // Detailed Aft Wheelhouse, Brow Visor, Life Buoys, Exhaust Pipes & Spinning Radar!
      const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(7.8, 1.6, 5.4), matNavalLt);
      cabinBase.position.set(0, 2.75, -10.8); grp.add(cabinBase);
      const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(8.0, 0.28, 5.8), matNavalLt);
      cabinRoof.position.set(0, 5.38, -10.8); grp.add(cabinRoof);
      const cabinBack = new THREE.Mesh(new THREE.BoxGeometry(7.6, 1.85, 1.4), matNavalLt);
      cabinBack.position.set(0, 4.42, -12.8); grp.add(cabinBack);
      buildBridgeInterior(0, 3.55, -10.2, 5.6, 4.2, 0.90);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.14, 0.85), matHullDark);
      visor.position.set(0, 4.82, -7.85); visor.rotation.x = 0.22; grp.add(visor);
      for (const sx of [-3.95, 3.95]) {
        const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 14), matOrange);
        buoy.rotation.y = Math.PI / 2; buoy.position.set(sx, 3.6, -10.6); grp.add(buoy);
        const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.4, 8), matHullDark);
        exh.position.set(sx * 0.65, 5.8, -12.6); grp.add(exh);
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 4.5, 8), matHullDark);
      mast.position.set(0, 7.2, -11.0); grp.add(mast);
      const radBar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.24, 0.36), matWhite);
      radBar.position.set(0, 9.2, -11.0); grp.add(radBar);
      radars.push(radBar);

      rampPivot = new THREE.Group();
      rampPivot.position.set(0, 1.94, 12.2);
      const rampSlab = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.32, 4.8), matRampTx);
      rampSlab.position.set(0, 0, 2.4); rampPivot.add(rampSlab);
      rampRestRotX = -1.20; rampOpenRotX = 0.24;
      rampPivot.rotation.x = rampRestRotX;
      grp.add(rampPivot);

      addNavLight(-4.5, 4.2,  10.5, matNavRed, 0.30);
      addNavLight( 4.5, 4.2,  10.5, matNavGrn, 0.30);
      addNavLight( 0.0, 9.6, -11.0, matNavWht, 0.34);
      addNavLight( 0.0, 4.8, -13.6, matNavWht, 0.28);
      attachSearchlightHousing(0, 5.4, -8.1);

    } else if (boatId === "patrol") {
      // ======================================================================
      // KRASNAYA UTILITY PATROL BOAT — DEEP-V FACETED 14.8m × 5.0m!
      // ======================================================================
      const matPatSide = new THREE.MeshStandardMaterial({ map: this._getNavalTex("patrol_side"), roughness: 0.44, metalness: 0.22 });
      const pVerts = [
        [-2.0, -0.10, -6.6], [ 2.0, -0.10, -6.6], [-2.1, -0.10, 3.6], [ 2.1, -0.10, 3.6], [0, 0.05, 8.2],
        [-2.5,  1.42, -6.7], [ 2.5,  1.42, -6.7], [-2.5,  1.52, 4.0], [ 2.5,  1.52, 4.0], [0, 1.85, 8.8]
      ];
      const pFaces = [
        [0,1,6,5], [0,5,7,2], [1,3,8,6], [2,7,9,4], [3,4,9,8],
        [5,6,8,7], [7,8,9]
      ];
      grp.add(this._buildFacetedMesh(pVerts, pFaces, matPatSide, 0.14));

      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 7.4), matDeck);
      deck.position.set(0, 1.44, -2.6); deck.receiveShadow = true; grp.add(deck);
      addTieDownBayVisual(0, 1.50, -2.6, 3.2, 5.6);

      // Black rubber rub-rail along gunwales + chrome bow rails
      for (const sx of [-1, 1]) {
        const rub = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 10.8), matSkirt);
        rub.position.set(sx * 2.52, 1.42, -1.4); grp.add(rub);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 7.0), matChrome);
        rail.position.set(sx * 2.35, 2.18, -2.6); grp.add(rail);
      }

      // Detailed Wheelhouse with Brow Visor, Radar Dome & Life Buoy
      const cabinBase = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 4.0), matWhite);
      cabinBase.position.set(0, 1.86, 2.8); grp.add(cabinBase);
      const cabinRoof = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.20, 4.2), matWhite);
      cabinRoof.position.set(0, 3.58, 2.8); grp.add(cabinRoof);
      buildBridgeInterior(0, 2.26, 2.9, 2.9, 3.4, 0.65);
      // Articulating Stern Car Loading Ramp!
      rampPivot = new THREE.Group();
      rampPivot.position.set(0, 1.44, -6.5);
      const pRamp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.24, 4.0), matRampTx);
      pRamp.position.set(0, 0, -2.0); rampPivot.add(pRamp);
      rampRestRotX =  1.25; // Folded up against transom in transit
      rampOpenRotX = -0.22; // Lowered back onto pier when UNLOCKED!
      rampPivot.rotation.x = rampRestRotX;
      grp.add(rampPivot);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.12, 0.72), matHullDark);
      visor.position.set(0, 3.44, 4.78); visor.rotation.x = 0.24; grp.add(visor);
      const radome = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.36, 12), matWhite);
      radome.position.set(0, 3.72, 2.6); grp.add(radome);

      // Twin High-Output Marine Outboards with Lower Units & Chrome Props!
      for (const ox of [-1.05, 1.05]) {
        const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.88, 0.92), matSkirt);
        cowl.position.set(ox, 1.55, -7.1); grp.add(cowl);
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.42), matHullDark);
        leg.position.set(ox, 0.65, -7.15); grp.add(leg);
        const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.14, 6), matChrome);
        prop.rotation.x = Math.PI / 2; prop.position.set(ox, 0.25, -7.42); grp.add(prop);
      }
      addNavLight(-2.4, 2.7, 4.3, matNavRed, 0.22);
      addNavLight( 2.4, 2.7, 4.3, matNavGrn, 0.22);
      addNavLight( 0.0, 4.2, 2.6, matNavWht, 0.24);
      attachSearchlightHousing(0, 3.65, 4.7);

    } else {
      // ======================================================================
      // STRELA-X1 OFFSHORE SPEEDBOAT — RAZOR-SHARP 9.4m × 2.5m RACING HYDROPLANE!
      // ======================================================================
      const matStrela = new THREE.MeshStandardMaterial({ map: this._getNavalTex("strela_livery"), roughness: 0.28, metalness: 0.32 });
      const stVerts = [
        [-1.05, 0.02, -4.1], [ 1.05, 0.02, -4.1], [-1.10, 0.04, 1.6], [ 1.10, 0.04, 1.6], [0, 0.28, 5.3],
        [-1.25, 0.78, -4.1], [ 1.25, 0.78, -4.1], [-1.28, 0.86, 1.8], [ 1.28, 0.86, 1.8], [0, 0.88, 5.4]
      ];
      const stFaces = [
        [0,1,6,5], [0,5,7,2], [1,3,8,6], [2,7,9,4], [3,4,9,8],
        [5,6,8,7], [7,8,9]
      ];
      grp.add(this._buildFacetedMesh(stVerts, stFaces, matStrela, 0.16));

      // Tinted Wrap-Around Fighter Canopy + Visible Bucket Seat & Steering Wheel!
      const cockpitWell = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.26, 2.1), matSkirt);
      cockpitWell.position.set(0, 0.82, -0.35); grp.add(cockpitWell);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 0.20), matRed);
      seat.position.set(0, 1.06, -0.95); seat.rotation.x = -0.22; grp.add(seat);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.03, 6, 12), matChrome);
      wheel.position.set(0, 1.08, 0.25); wheel.rotation.x = -0.35; grp.add(wheel);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.50, 2.45), matGlass);
      canopy.position.set(0, 1.08, -0.15); grp.add(canopy);
      const cowlScoop = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.28, 1.85), matRed);
      cowlScoop.position.set(0, 0.96, -2.45); grp.add(cowlScoop);

      // Aggressive Rear Racing Aero Wing + Twin Chrome Exhaust Tips + Twin Racing Outboards!
      const wing = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.10, 0.56), matRed);
      wing.position.set(0, 1.48, -3.75); grp.add(wing);
      for (const sx of [-0.95, 0.95]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.34), matSkirt);
        strut.position.set(sx, 1.15, -3.75); grp.add(strut);
      }
      for (const ox of [-0.52, 0.52]) {
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8), matChrome);
        tip.rotation.x = Math.PI / 2; tip.position.set(ox, 0.72, -4.25); grp.add(tip);
        const ob = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 0.58), matSkirt);
        ob.position.set(ox, 0.55, -4.35); grp.add(ob);
      }
      addNavLight(-1.24, 0.88, 2.2, matNavRed, 0.16);
      addNavLight( 1.24, 0.88, 2.2, matNavGrn, 0.16);
      addNavLight( 0.0,  1.60, -3.75, matNavWht, 0.16);
      attachSearchlightHousing(0, 0.95, 2.4);
    }

    grp.add(navLightsGroup);
    return { grp, fans, radars, helmWheel, helmLever, skirtMesh, rampPivot, rampRestRotX, rampOpenRotX, navLightsGroup, spotCone, spotMountLocal, bayChains };
  }

  summonBoatAtPort(boatId, port) {
    const spec = KK.BOATS[boatId];
    if (!spec || !port) return null;

    const existing = this.spawnedBoats.find((b) => b.id === boatId);
    const sp = this.getPortMoatSpawnPos(port, spec);
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    if (existing) {
      if (this.activeBoat === existing) this.activeBoat = null;
      existing.deckVehicles = [];
      existing.deckLocked = false;
      existing.rampAnim = 1.0;
      existing.anchored = true;
      existing.gx = sp.x; existing.gy = seaL; existing.gz = sp.z;
      existing.yaw = sp.yaw; existing.pitch = 0; existing.roll = 0;
      existing.vx = 0; existing.vz = 0; existing.speedKmh = 0;
      this.world.toLocal(existing.gx, existing.gy, existing.gz, existing.mesh.position);
      existing.mesh.rotation.set(0, existing.yaw, 0);
      return existing;
    }

    const built = this._buildBoatMesh(boatId);
    this.scene.add(built.grp);
    const boat = {
      id: boatId, spec,
      mesh: built.grp, fans: built.fans, radars: built.radars, helmWheel: built.helmWheel, helmLever: built.helmLever, skirtMesh: built.skirtMesh,
      rampPivot: built.rampPivot, rampRestRotX: built.rampRestRotX, rampOpenRotX: built.rampOpenRotX,
      navLightsGroup: built.navLightsGroup, spotCone: built.spotCone, spotMountLocal: built.spotMountLocal,
      bayChains: built.bayChains,
      gx: sp.x, gy: seaL, gz: sp.z, yaw: sp.yaw, pitch: 0, roll: 0,
      vx: 0, vz: 0, speedKmh: 0, throttleCmd: 0, boostCmd: false,
      anchored: true,
      deckLocked: false,
      unlockWarnUntil: 0,
      navLightsOn: true,
      spotLightOn: false,
      waterDepth: 12.0,
      isBeached: false,
      rampAnim: 1.0,
      cushionAnim: 0.0,
      shockRoll: 0.0,
      shockPitch: 0.0,
      deckVehicles: []
    };
    this.world.toLocal(boat.gx, boat.gy, boat.gz, boat.mesh.position);
    boat.mesh.rotation.set(0, boat.yaw, 0);
    this.spawnedBoats.push(boat);
    return boat;
  }

  spawnBoatAtPosition(boatId, gx, gz, yaw = 0, anchored = false) {
    const spec = KK.BOATS[boatId];
    if (!spec) return null;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    let boat = this.spawnedBoats.find((b) => b.id === boatId);
    if (boat) {
      boat.gx = gx; boat.gy = seaL; boat.gz = gz;
      boat.yaw = yaw; boat.pitch = 0; boat.roll = 0;
      boat.vx = 0; boat.vz = 0; boat.speedKmh = 0;
      boat.shockRoll = 0; boat.shockPitch = 0;
      boat.anchored = !!anchored;
      boat.deckLocked = true;
      boat.rampAnim = 0.0;
      boat.cushionAnim = anchored ? 0.0 : 1.0;
      this.world.toLocal(boat.gx, boat.gy, boat.gz, boat.mesh.position);
      boat.mesh.rotation.set(0, boat.yaw, 0);
      return boat;
    }
    const built = this._buildBoatMesh(boatId);
    this.scene.add(built.grp);
    boat = {
      id: boatId, spec,
      mesh: built.grp, fans: built.fans, radars: built.radars, helmWheel: built.helmWheel, helmLever: built.helmLever, skirtMesh: built.skirtMesh,
      rampPivot: built.rampPivot, rampRestRotX: built.rampRestRotX, rampOpenRotX: built.rampOpenRotX,
      navLightsGroup: built.navLightsGroup, spotCone: built.spotCone, spotMountLocal: built.spotMountLocal,
      bayChains: built.bayChains,
      gx, gy: seaL, gz, yaw, pitch: 0, roll: 0,
      vx: 0, vz: 0, speedKmh: 0, throttleCmd: 0, boostCmd: false,
      anchored: !!anchored,
      deckLocked: true,
      unlockWarnUntil: 0,
      navLightsOn: true,
      spotLightOn: true,
      waterDepth: 28.0,
      isBeached: false,
      rampAnim: 0.0,
      cushionAnim: anchored ? 0.0 : 1.0,
      shockRoll: 0.0,
      shockPitch: 0.0,
      deckVehicles: []
    };
    this.world.toLocal(boat.gx, boat.gy, boat.gz, boat.mesh.position);
    boat.mesh.rotation.set(0, boat.yaw, 0);
    this.spawnedBoats.push(boat);
    return boat;
  }

  // Called by ocean_cryptids.js or main.js when Yamato salvos, Megalodon lunges, or Kraken tentacles slam near a boat!
  applyWaveShock(boat, pushX = 0, pushZ = 0, rollKick = 0, pitchKick = 0) {
    if (!boat) return;
    const massScale = boat.id === "zubr" ? 0.36 : (boat.id === "serna" ? 0.56 : (boat.id === "patrol" ? 0.92 : 1.25));
    boat.vx = (boat.vx || 0) + pushX * massScale;
    boat.vz = (boat.vz || 0) + pushZ * massScale;
    boat.shockRoll = Math.max(-0.52, Math.min(0.52, (boat.shockRoll || 0) + rollKick * massScale));
    boat.shockPitch = Math.max(-0.38, Math.min(0.38, (boat.shockPitch || 0) + pitchKick * massScale));
  }

  getPayloadKg(boat, remotePlayersMap = null) {
    if (!boat) return 0;
    let sum = 0;
    if (boat.deckVehicles) {
      for (const dv of boat.deckVehicles) sum += (dv.massKg || 0);
    }
    if (remotePlayersMap && boat._ownerPeerIdForCheck) {
      for (const rp of remotePlayersMap.values()) {
        if (rp.boatMount && rp.boatMount.ownerPeerId === boat._ownerPeerIdForCheck) {
          const rSpec = KK.VEHICLES[rp.vehicleId];
          sum += (rSpec && rSpec.massKg) || 2500;
        }
      }
    }
    return sum;
  }

  getLocalMountedEntry(boat) {
    if (!boat || !boat.deckVehicles) return null;
    return boat.deckVehicles.find((dv) => dv.key === "local") || null;
  }

  findLocalMountedBoat() {
    for (const b of this.spawnedBoats) {
      const e = this.getLocalMountedEntry(b);
      if (e) return { boat: b, entry: e };
    }
    return null;
  }

  _findFreeBay(boat, massKg, bodyLen, occupiedBaysSet = null) {
    const bays = boat.spec.bays || [];
    if (bays.length === 0) return null;
    const used = new Set((boat.deckVehicles || []).map((d) => d.bayIdx));
    if (occupiedBaysSet) for (const bi of occupiedBaysSet) used.add(bi);

    if (boat.spec.centerHeavyBay && (massKg > 12000 || bodyLen > 7.0)) {
      if (used.size === 0) {
        return { bayIdx: 0, spanBoth: true, x: boat.spec.centerHeavyBay.x, z: boat.spec.centerHeavyBay.z, label: boat.spec.centerHeavyBay.label };
      }
      return null;
    }
    if ((boat.deckVehicles || []).some((d) => d.spanBoth)) return null;

    for (let i = 0; i < bays.length; i++) {
      if (!used.has(i)) return { bayIdx: i, spanBoth: false, x: bays[i].x, z: bays[i].z, label: bays[i].label };
    }
    return null;
  }

  canMountVehicle(boat, vehicle, remotePlayersMap = null) {
    const maxPay = boat && boat.spec ? (boat.spec.maxPayloadKg || 0) : 0;
    if (!boat || !vehicle || maxPay <= 0) {
      return { ok: false, reason: `${boat ? boat.spec.name : "Vessel"} is strictly 1-person / no vehicle deck!` };
    }
    const mass = vehicle.spec.massKg || 2000;
    const curPay = this.getPayloadKg(boat, remotePlayersMap);
    if (curPay + mass > maxPay) {
      return { ok: false, reason: `OVERWEIGHT! ${vehicle.spec.name} (${(mass / 1000).toFixed(1)}t) exceeds remaining deck budget (${((maxPay - curPay) / 1000).toFixed(1)}t left of ${Math.round(maxPay / 1000)}t)!` };
    }
    const occSet = new Set();
    if (remotePlayersMap) {
      for (const rp of remotePlayersMap.values()) {
        if (rp.boatMount && typeof rp.boatMount.bayIdx === "number" && rp.boatMount.boatId === boat.id) {
          occSet.add(rp.boatMount.bayIdx);
        }
      }
    }
    const bay = this._findFreeBay(boat, mass, vehicle.spec.bodyLen || 5.0, occSet);
    if (!bay) {
      return { ok: false, reason: `All vehicle bays on ${boat.spec.name} are full!` };
    }
    return { ok: true, bay };
  }

  // v15.4.3 IGNITION-OFF AUTO-LOCK TO NEAREST FREE PARKING BAY!
  autoSnapAndStrapVehicle(boat, vehicle, ui, audio, remotePlayersMap = null) {
    if (!boat || !vehicle) return null;
    const existing = this.getLocalMountedEntry(boat);
    if (existing) return existing;
    const maxPay = boat.spec.maxPayloadKg || 0;
    const mass = vehicle.spec.massKg || 2000;
    if (maxPay <= 0) return null;
    const curPay = this.getPayloadKg(boat, remotePlayersMap);
    if (curPay + mass > maxPay) {
      if (ui) ui.toast(`OVERWEIGHT! ${vehicle.spec.name} (${(mass / 1000).toFixed(1)}t) exceeds ${Math.round(maxPay / 1000)}t deck limit!`, true);
      return null;
    }
    const loc = this.worldToBoatLocal(boat, vehicle.pos.x, vehicle.pos.z);
    const bays = boat.spec.bays || [];
    const used = new Set((boat.deckVehicles || []).map((d) => d.bayIdx));
    if (remotePlayersMap) {
      for (const rp of remotePlayersMap.values()) {
        if (rp.boatMount && typeof rp.boatMount.bayIdx === "number" && rp.boatMount.boatId === boat.id) used.add(rp.boatMount.bayIdx);
      }
    }
    // Snap cleanly to the nearest FREE parking bay (or keep current spot if bays full)
    let bestBay = null, bestIdx = 0, bestD = 9999;
    for (let i = 0; i < bays.length; i++) {
      if (used.has(i)) continue;
      const d = Math.hypot(loc.x - bays[i].x, loc.z - bays[i].z);
      if (d < bestD) { bestD = d; bestBay = bays[i]; bestIdx = i; }
    }
    const snapX = bestBay ? bestBay.x : loc.x;
    const snapZ = bestBay ? bestBay.z : loc.z;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
    const vehYaw = Math.atan2(fwd.x, fwd.z);
    let relYaw = vehYaw - (boat.yaw || 0);
    while (relYaw > Math.PI) relYaw -= Math.PI * 2;
    while (relYaw < -Math.PI) relYaw += Math.PI * 2;
    // Align neatly straight forward (0) or straight backward (PI) in the parking bay!
    const alignedYaw = (Math.abs(relYaw) > Math.PI * 0.5) ? Math.PI : 0;

    const entry = {
      key: "local", peerId: null,
      vehicleId: vehicle.vState.vehicleId,
      massKg: mass, bayIdx: bestIdx, spanBoth: false,
      x: snapX, z: snapZ, relYaw: alignedYaw,
      label: (bestBay && bestBay.label) || "Deck"
    };
    boat.deckVehicles.push(entry);
    vehicle.hydrolocked = false;
    vehicle.inWaterDepth = 0;
    vehicle.vel.set(0, 0, 0);
    vehicle.angVel.set(0, 0, 0);
    if (audio && audio.playWrench) audio.playWrench();
    if (ui) ui.toast(`🔒 IGNITION OFF — Auto-locked ${vehicle.spec.name} into [${entry.label}]! Press [F] to step out & [P] to drive ship!`);
    return entry;
  }

  // v15.4.3 IGNITION-ON AUTO-UNLOCK RIGHT ON DECK!
  autoUnstrapVehicle(boat, vehicle, ui, audio) {
    if (!boat || !vehicle) return false;
    const idx = (boat.deckVehicles || []).findIndex((d) => d.key === "local");
    if (idx < 0) return false;
    boat.deckVehicles.splice(idx, 1);
    vehicle.vel.set(boat.vx || 0, 0, boat.vz || 0);
    vehicle.angVel.set(0, 0, 0);
    const wRadU = (vehicle.spec && vehicle.spec.wheelRadius) ? vehicle.spec.wheelRadius : 0.44;
    const rHgtU = (vehicle.vState && vehicle.vState.tuning && vehicle.vState.tuning.rideHeight) ? vehicle.vState.tuning.rideHeight : 0.34;
    const minDeckY = boat.gy + boat.spec.deckY + wRadU + rHgtU + 0.12;
    if (vehicle.pos.y < minDeckY) vehicle.pos.y = minDeckY;
    if (audio && audio.playWrench) audio.playWrench();
    if (ui) {
      if (boat.deckLocked) {
        ui.toast(`🔓 IGNITION ON — Car unlocked! (Note: Ramp is CLOSED [U] — open ramp at helm or you'll ram it!)`, true);
      } else {
        ui.toast(`🔓 IGNITION ON — Car unlocked! Ramp is DOWN — vroom off the ship!`);
      }
    }
    return true;
  }

  strapVehicleAtCurrentPos(boat, vehicle, ui, audio, remotePlayersMap = null) {
    if (!boat || !vehicle) return null;
    const existing = this.getLocalMountedEntry(boat);
    if (existing) {
      // Unstrap in-place right on the deck so you can drive off the ramp!
      const idx = boat.deckVehicles.indexOf(existing);
      if (idx >= 0) boat.deckVehicles.splice(idx, 1);
      if (audio && audio.playWrench) audio.playWrench();
      if (ui) ui.toast(`UNSTRAPPED ${vehicle.spec.name} on ${boat.spec.name} deck! Drive off the ramp or re-strap [R]/[V].`);
      return null;
    }
    const maxPay = boat.spec.maxPayloadKg || 0;
    const mass = vehicle.spec.massKg || 2000;
    const curPay = this.getPayloadKg(boat, remotePlayersMap);
    if (curPay + mass > maxPay) {
      if (ui) ui.toast(`OVERWEIGHT! ${vehicle.spec.name} (${(mass / 1000).toFixed(1)}t) exceeds ${Math.round(maxPay / 1000)}t deck limit!`, true);
      return null;
    }
    // Keep exact parked position & relative heading on deck!
    const loc = this.worldToBoatLocal(boat, vehicle.pos.x, vehicle.pos.z);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(vehicle.quat);
    const vehYaw = Math.atan2(fwd.x, fwd.z);
    const relYaw = vehYaw - (boat.yaw || 0);
    // Find nearest bay index for visual chocks
    let nearBay = 0, bestD = 999;
    const bays = boat.spec.bays || [];
    for (let i = 0; i < bays.length; i++) {
      const d = Math.hypot(loc.x - bays[i].x, loc.z - bays[i].z);
      if (d < bestD) { bestD = d; nearBay = i; }
    }
    const entry = {
      key: "local", peerId: null,
      vehicleId: vehicle.vState.vehicleId,
      massKg: mass, bayIdx: nearBay, spanBoth: false,
      x: loc.x, z: loc.z, relYaw,
      label: (bays[nearBay] && bays[nearBay].label) || "Deck"
    };
    boat.deckVehicles.push(entry);
    vehicle.hydrolocked = false;
    vehicle.inWaterDepth = 0;
    vehicle.vel.set(0, 0, 0);
    vehicle.angVel.set(0, 0, 0);
    if (audio && audio.playWrench) audio.playWrench();
    const totalT = (this.getPayloadKg(boat, remotePlayersMap) / 1000).toFixed(1);
    const maxT = Math.round(maxPay / 1000);
    if (ui) ui.toast(`STRAPPED & CHOCKED ${vehicle.spec.name} on ${boat.spec.name} (${totalT}t / ${maxT}t)! Press [F] to step out & walk to the Bridge Helm!`);
    return entry;
  }

  mountLocalVehicle(boat, vehicle, ui, audio, remotePlayersMap = null) {
    if (!boat || !vehicle) return null;
    const existing = this.getLocalMountedEntry(boat);
    if (existing) return existing;
    const chk = this.canMountVehicle(boat, vehicle, remotePlayersMap);
    if (!chk.ok) { if (ui) ui.toast(chk.reason, true); return null; }

    const reach = Math.max(62, boat.spec.len * 1.45);
    const d = Math.hypot(vehicle.pos.x - boat.gx, vehicle.pos.z - boat.gz);
    if (d > reach) {
      if (ui) ui.toast(`Drive your ${vehicle.spec.name} closer to the pier/ramp (< ${Math.round(reach)}m) to board it onto the deck!`, true);
      return null;
    }

    const entry = {
      key: "local", peerId: null,
      vehicleId: vehicle.vState.vehicleId,
      massKg: vehicle.spec.massKg || 2000,
      bayIdx: chk.bay.bayIdx, spanBoth: chk.bay.spanBoth,
      x: chk.bay.x, z: chk.bay.z, label: chk.bay.label
    };
    boat.deckVehicles.push(entry);
    vehicle.hydrolocked = false;
    vehicle.inWaterDepth = 0;
    vehicle.vel.set(0, 0, 0);
    vehicle.angVel.set(0, 0, 0);
    if (audio && audio.playWrench) audio.playWrench();
    const totalT = (this.getPayloadKg(boat, remotePlayersMap) / 1000).toFixed(1);
    const maxT = Math.round(boat.spec.maxPayloadKg / 1000);
    if (ui) ui.toast(`LOADED ${vehicle.spec.name} into [${chk.bay.label}] on ${boat.spec.name} (${totalT}t / ${maxT}t)!`);
    return entry;
  }

  unmountLocalVehicle(boat, vehicle, ui, audio, forceOverboard = false) {
    if (!boat || !vehicle) return false;
    const idx = (boat.deckVehicles || []).findIndex((d) => d.key === "local");
    if (idx < 0) return false;
    const fwdX = Math.sin(boat.yaw), fwdZ = Math.cos(boat.yaw);
    const dropDist = boat.spec.len * 0.54 + 4.5;
    const dropX = boat.gx + fwdX * dropDist;
    const dropZ = boat.gz + fwdZ * dropDist;
    const ti = this.world.getTerrainInfo(dropX, dropZ, false);
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    if (!forceOverboard && ti.height < seaL - 1.6) {
      if (ui) ui.toast("Sail closer to a beach, shoreline, or port ramp (or unlock deck [U] twice to drop overboard)!", true);
      return false;
    }

    boat.deckVehicles.splice(idx, 1);
    vehicle.pos.set(dropX, Math.max(ti.height, seaL) + 1.15, dropZ);
    vehicle.vel.set(fwdX * 3.5, 0, fwdZ * 3.5);
    vehicle.angVel.set(0, 0, 0);
    vehicle.hydrolocked = false;
    vehicle.inWaterDepth = 0;
    if (audio && audio.playWrench) audio.playWrench();
    if (ui) ui.toast(`UNLOADED ${vehicle.spec.name} off ${boat.spec.name}!`);
    return true;
  }

  toggleMountVehicle(boat, vehicle, ui, audio, remotePlayersMap = null) {
    if (!boat || !vehicle) return false;
    if (this.getLocalMountedEntry(boat)) {
      return this.unmountLocalVehicle(boat, vehicle, ui, audio, !boat.deckLocked);
    }
    return !!this.mountLocalVehicle(boat, vehicle, ui, audio, remotePlayersMap);
  }

  toggleDeckLock(boat, ui, audio) {
    if (!boat || !boat.spec.maxPayloadKg) {
      if (ui) ui.toast("This vessel has no vehicle cargo deck!", true);
      return;
    }
    if (!boat.deckLocked) {
      boat.deckLocked = true;
      boat.unlockWarnUntil = 0;
      if (audio && audio.playRampHydraulics) audio.playRampHydraulics();
      if (ui) ui.toast("DECK LOCKED [U]: Tie-down chains secured & bow ramp raised for transit!");
      return;
    }
    const now = performance.now();
    if (boat.waterDepth > 3.0 && !boat.isBeached && now > (boat.unlockWarnUntil || 0)) {
      boat.unlockWarnUntil = now + 4500;
      if (ui) ui.toast(`⚠ DEEP OCEAN (${Math.round(boat.waterDepth)}m)! Press [U] AGAIN within 4s to unlock & allow driving overboard!`, true);
      return;
    }
    boat.deckLocked = false;
    boat.unlockWarnUntil = 0;
    if (audio && audio.playRampHydraulics) audio.playRampHydraulics();
    if (ui) ui.toast("DECK UNLOCKED [U]: Chains released & bow ramp lowered — drivers can roll on/off!");
  }

  toggleAnchor(boat, ui, audio) {
    if (!boat) return;
    boat.anchored = !boat.anchored;
    if (audio && audio.playAnchorClank) audio.playAnchorClank();
    if (boat.spec.amphibious) {
      if (ui) ui.toast(boat.anchored ? "AIR CUSHION DUMPED [P]: Hovercraft settled flat as a motionless landing pad!" : "AIR CUSHION INFLATED [P]: Turbines spooled — ready to glide!");
    } else {
      if (ui) ui.toast(boat.anchored ? "ANCHOR DROPPED [P]: Vessel holding station!" : "ANCHOR WEIGHED [P]: All ahead ready!");
    }
  }

  toggleNavLights(boat, ui) {
    if (!boat) return;
    boat.navLightsOn = !boat.navLightsOn;
    if (ui) ui.toast(`MARITIME NAV LIGHTS [L]: ${boat.navLightsOn ? "ON (Port Red / Stbd Green / Masthead)" : "OFF"}`);
  }

  toggleSpotlight(boat, ui) {
    if (!boat) return;
    boat.spotLightOn = !boat.spotLightOn;
    if (ui) ui.toast(`BRIDGE SEARCHLIGHT [K]: ${boat.spotLightOn ? "ON" : "OFF"}`);
  }

  update(dt, input, vehicle, particles, audio, ui = null, remotePlayersMap = null, localPeerId = null, seaState = null) {
    const hEff = (seaState && seaState.hurricaneEffect !== undefined)
      ? seaState.hurricaneEffect
      : ((seaState && (seaState.waveBoost !== undefined || seaState.windX !== undefined || seaState.inEye !== undefined || seaState.intensity !== undefined)) ? seaState : null);
    const weather = (seaState && seaState.weather) || "clear";
    const seaDread = (seaState && typeof seaState.seaDread === "number") ? seaState.seaDread : 0;

    const hActive = !!(hEff && hEff.active);
    const hInt = hActive ? Math.max(0, Math.min(1, hEff.intensity || 0)) : 0;
    const hWave = hActive ? Math.max(0, hEff.waveBoost !== undefined ? hEff.waveBoost : hInt) : 0;
    const inEye = !!(hActive && hEff.inEye);
    const windX = (hActive && !inEye) ? (hEff.windX || 0) : 0;
    const windZ = (hActive && !inEye) ? (hEff.windZ || 0) : 0;

    const baseWeatherRough = weather === "hurricane" ? 0.92 : (weather === "storm" ? 0.56 : (weather === "rain" ? 0.18 : 0.0));
    const roughness = inEye ? 0.08 : Math.min(1.65, Math.max(baseWeatherRough, hWave * 1.38) + seaDread * 0.35);

    this.wavePhase += dt * (2.1 + roughness * 2.15);
    this.chopPhase = (this.chopPhase || 0) + dt * (3.3 + roughness * 3.05);
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    let spotUsed = false;

    for (const b of this.spawnedBoats) {
      b._ownerPeerIdForCheck = localPeerId;
      const isPiloted = (this.activeBoat === b);
      const sp = b.spec;
      let throttle = 0, steer = 0, boost = false;
      if (isPiloted && input) {
        throttle = (input.throttle || 0) - (input.brake || 0);
        steer = input.steer || 0;
        boost = !!input.boost;
      }
      b.throttleCmd = throttle;
      b.boostCmd = boost;

      // v15.4.3 ZERO-FRICTION HELM: Pressing [W]/[S] auto-weighs anchor / inflates cushion; unpiloted ship holds station!
      if (isPiloted && b.anchored && Math.abs(throttle) > 0.1) {
        b.anchored = false;
        if (audio && audio.playAnchorClank) audio.playAnchorClank();
      }
      if (!isPiloted && b.speedKmh < 12) {
        b.anchored = true;
      }
      if (b.anchored) {
        throttle = 0; steer = 0;
        const holdDrag = Math.exp(-dt * 4.5);
        b.vx *= holdDrag; b.vz *= holdDrag;
      }
      if (b._ancWarnCd > 0) b._ancWarnCd -= dt;

      const payloadKg = this.getPayloadKg(b, remotePlayersMap);
      const loadRatio = sp.maxPayloadKg > 0 ? Math.min(1.0, payloadKg / sp.maxPayloadKg) : 0;
      const weightSpeedMult = 1.0 - loadRatio * 0.14;
      const weightAccelMult = 1.0 - loadRatio * 0.20;
      const maxMs = (sp.topSpeedKmh / 3.6) * weightSpeedMult * (boost ? 1.18 : 1.0);

      const fwdX = Math.sin(b.yaw), fwdZ = Math.cos(b.yaw);
      const fwdSpd = b.vx * fwdX + b.vz * fwdZ;
      const turnRate = sp.amphibious ? 0.88 : (sp.id === "strela" ? 1.75 : (sp.id === "serna" ? 0.92 : 1.22));
      const steerAuth = sp.amphibious ? 1.0 : Math.min(1.0, Math.abs(fwdSpd) / 5.0 + 0.34);
      b.yaw += steer * turnRate * steerAuth * dt * (fwdSpd >= -0.5 ? 1 : -1);

      const nFwdX = Math.sin(b.yaw), nFwdZ = Math.cos(b.yaw);
      if (Math.abs(throttle) > 0.01) {
        const accel = sp.accelMs2 * weightAccelMult * (boost ? 1.26 : 1.0);
        b.vx += nFwdX * throttle * accel * dt;
        b.vz += nFwdZ * throttle * accel * dt;
      }

      // Cyclonic hurricane wind drift & crosswind yaw buffeting!
      if (!b.isBeached && (windX !== 0 || windZ !== 0)) {
        const hullWindMult = sp.id === "zubr" ? 0.20 : (sp.id === "serna" ? 0.16 : (sp.id === "patrol" ? 0.30 : 0.40));
        const anchorMult = b.anchored ? 0.25 : 1.0;
        b.vx += windX * hullWindMult * anchorMult * dt;
        b.vz += windZ * hullWindMult * anchorMult * dt;
        if (!b.anchored && hInt > 0.2) {
          const rX = Math.cos(b.yaw), rZ = -Math.sin(b.yaw);
          const crossW = windX * rX + windZ * rZ;
          b.yaw += Math.max(-0.50, Math.min(0.50, crossW * 0.0085)) * dt * (sp.id === "zubr" ? 0.55 : 0.85);
        }
      }

      const drag = Math.exp(-dt * (sp.amphibious ? 0.62 : 0.90));
      b.vx *= drag; b.vz *= drag;
      if (!sp.amphibious) {
        const rightX = Math.cos(b.yaw), rightZ = -Math.sin(b.yaw);
        const latV = b.vx * rightX + b.vz * rightZ;
        const latKill = Math.min(1, dt * (hInt > 0.25 && !inEye ? 2.6 : 3.8));
        b.vx -= rightX * latV * latKill;
        b.vz -= rightZ * latV * latKill;
      }
      const spd = Math.hypot(b.vx, b.vz);
      const effMaxMs = maxMs + (hInt > 0.1 && !inEye ? 7.5 * hInt : 0);
      if (spd > effMaxMs) { b.vx *= effMaxMs / spd; b.vz *= effMaxMs / spd; }

      const nextX = b.gx + b.vx * dt;
      const nextZ = b.gz + b.vz * dt;
      const tiNext = this.world.getTerrainInfo(nextX, nextZ, false);
      b.waterDepth = Math.max(0, seaL - tiNext.height);
      b.isBeached = tiNext.height >= seaL - 0.6;

      const targetCushion = b.anchored ? 0.0 : 1.0;
      b.cushionAnim += (targetCushion - b.cushionAnim) * Math.min(1, dt * 3.8);
      if (b.skirtMesh) {
        b.skirtMesh.scale.y = 0.38 + b.cushionAnim * 0.62;
      }

      const hullWaveDamp = sp.id === "zubr" ? 0.65 : (sp.id === "serna" ? 0.78 : (sp.id === "patrol" ? 1.05 : 1.28));
      const primaryAmp = (sp.id === "strela" ? 0.24 : 0.16) * (1.0 + roughness * 4.6 * hullWaveDamp);
      const rogueSwell = b.isBeached ? 0.0 : (
        Math.sin(this.wavePhase + b.gx * 0.032 + b.gz * 0.018) * primaryAmp +
        Math.sin(this.chopPhase * 0.85 - b.gx * 0.055 + b.gz * 0.048) * (primaryAmp * 0.42 * Math.min(1.0, roughness))
      );

      const trimSink = loadRatio * (sp.amphibious ? 0.35 : 0.42);
      if (sp.amphibious) {
        const maxSlopeH = seaL + 22.0;
        if (tiNext.height <= maxSlopeH) { b.gx = nextX; b.gz = nextZ; }
        else { b.vx *= -0.22; b.vz *= -0.22; }
        const cushionLift = -0.85 * (1.0 - b.cushionAnim);
        b.gy = Math.max(seaL, tiNext.height) + 0.30 + cushionLift - trimSink + rogueSwell * 0.78 * b.cushionAnim;
      } else {
        if (tiNext.height < seaL + 0.45) { b.gx = nextX; b.gz = nextZ; }
        else { b.vx *= -0.15; b.vz *= -0.15; }
        b.gy = seaL - trimSink + rogueSwell;
      }

      const lim = KK.HALF_WORLD - 400;
      b.gx = Math.max(-lim, Math.min(lim, b.gx));
      b.gz = Math.max(-lim, Math.min(lim, b.gz));
      b.speedKmh = Math.hypot(b.vx, b.vz) * 3.6;

      const targetRamp = b.deckLocked ? 0.0 : 1.0;
      b.rampAnim += (targetRamp - b.rampAnim) * Math.min(1, dt * 3.4);
      if (b.rampPivot) b.rampPivot.rotation.x = b.rampRestRotX + (b.rampOpenRotX - b.rampRestRotX) * b.rampAnim;

      // Decay wave-shock kicks smoothly
      const shockDecay = Math.exp(-dt * 2.8);
      b.shockRoll = (b.shockRoll || 0) * shockDecay;
      b.shockPitch = (b.shockPitch || 0) * shockDecay;

      const bowLift = Math.min(0.11, (b.speedKmh / 145) * 0.09);
      const wavePitchAmp = 0.025 + roughness * 0.088 * hullWaveDamp;
      const waveRollAmp = roughness * 0.145 * hullWaveDamp;
      const crossWindRoll = (!b.isBeached && (windX !== 0 || windZ !== 0))
        ? Math.max(-0.22, Math.min(0.22, (windX * Math.cos(b.yaw) - windZ * Math.sin(b.yaw)) * 0.0065 * hullWaveDamp))
        : 0;
      const wavePitch = b.isBeached ? 0 : (
        Math.sin(this.wavePhase * 1.15 + b.gz * 0.025) * wavePitchAmp +
        Math.cos(this.chopPhase * 0.72 + b.gx * 0.038) * wavePitchAmp * 0.42 - bowLift
      );
      const bankRoll = steer * Math.min(0.18, (b.speedKmh / 95) * 0.15) * (sp.id === "strela" ? 1.35 : 0.45);
      const stormRoll = b.isBeached ? 0 : (Math.sin(this.chopPhase * 0.92 + b.gx * 0.035) * waveRollAmp + crossWindRoll);
      const targetPitch = Math.max(-0.38, Math.min(0.38, wavePitch + b.shockPitch));
      const targetRoll = Math.max(-0.48, Math.min(0.48, bankRoll + stormRoll + b.shockRoll));
      b.pitch += (targetPitch - b.pitch) * Math.min(1, dt * 8);
      b.roll  += (targetRoll  - b.roll)  * Math.min(1, dt * 8);

      this.world.toLocal(b.gx, b.gy, b.gz, b.mesh.position);
      b.mesh.rotation.set(b.pitch, b.yaw, b.roll, "YXZ");

      if (b.navLightsGroup) b.navLightsGroup.visible = !!b.navLightsOn;
      if (b.spotCone) b.spotCone.visible = !!b.spotLightOn;
      if (isPiloted && b.spotLightOn && b.spotMountLocal) {
        spotUsed = true;
        const sm = b.spotMountLocal;
        this.boatLocalToWorld(b, sm.x, sm.y, sm.z + 0.5, this._tmpV);
        this.world.toLocal(this._tmpV.x, this._tmpV.y, this._tmpV.z, this.sharedSpotLight.position);
        this.boatLocalToWorld(b, sm.x, sm.y - 7.5, sm.z + 65, this._tmpT);
        this.world.toLocal(this._tmpT.x, this._tmpT.y, this._tmpT.z, this.sharedSpotTarget.position);
        this.sharedSpotLight.intensity = 5.2;
      }

      if (b.bayChains && b.bayChains.length > 0) {
        const occBays = new Set((b.deckVehicles || []).map((d) => d.bayIdx));
        if (remotePlayersMap && localPeerId) {
          for (const rp of remotePlayersMap.values()) {
            if (rp.boatMount && rp.boatMount.ownerPeerId === localPeerId && typeof rp.boatMount.bayIdx === "number") {
              occBays.add(rp.boatMount.bayIdx);
            }
          }
        }
        for (let ci = 0; ci < b.bayChains.length; ci++) {
          b.bayChains[ci].visible = occBays.has(ci);
        }
      }

      if (b.fans && b.fans.length > 0) {
        const fSpd = b.anchored ? 1.8 : (isPiloted ? (10 + Math.abs(throttle) * 24) : 4.0);
        for (const fn of b.fans) fn.rotation.z += dt * fSpd;
      }
      if (b.radars && b.radars.length > 0) {
        for (const rd of b.radars) rd.rotation.y += dt * 2.2;
      }
      if (b.helmWheel) b.helmWheel.rotation.z += (-steer * 2.2 - b.helmWheel.rotation.z) * Math.min(1, dt * 8);
      if (b.helmLever) b.helmLever.rotation.x += (throttle * 0.65 - b.helmLever.rotation.x) * Math.min(1, dt * 8);

      if (isPiloted && !b.isBeached && particles) {
        if (b.speedKmh > 12 && Math.random() < Math.min(0.92, 0.55 + roughness * 0.30)) {
          particles.emitWaterSplash(b.gx - nFwdX * (sp.len * 0.44), b.gy + 0.3, b.gz - nFwdZ * (sp.len * 0.44), Math.min(3.2, (b.speedKmh / 48) * (1.0 + roughness * 0.55)));
        }
        if (roughness > 0.35 && Math.random() < Math.min(0.90, roughness * 0.58)) {
          const sideSign = Math.random() < 0.5 ? -1 : 1;
          const rX = Math.cos(b.yaw), rZ = -Math.sin(b.yaw);
          const bowDist = sp.len * (0.28 + Math.random() * 0.22);
          const sideDist = sp.width * (0.35 + Math.random() * 0.25) * sideSign;
          particles.emitWaterSplash(b.gx + nFwdX * bowDist + rX * sideDist, b.gy + 0.6 + roughness * 0.5, b.gz + nFwdZ * bowDist + rZ * sideDist, 1.1 + roughness * 1.4);
        }
      }

      const localEntry = this.getLocalMountedEntry(b);
      if (localEntry && vehicle) {
        const wRadV = (vehicle.spec && vehicle.spec.wheelRadius) ? vehicle.spec.wheelRadius : 0.44;
        const rHgtV = (vehicle.vState && vehicle.vState.tuning && vehicle.vState.tuning.rideHeight) ? vehicle.vState.tuning.rideHeight : 0.34;
        const deckCarLift = wRadV + rHgtV + 0.10;
        this.boatLocalToWorld(b, localEntry.x, sp.deckY + deckCarLift, localEntry.z, this._tmpV);
        vehicle.pos.copy(this._tmpV);
        vehicle.vel.set(b.vx, 0, b.vz);
        vehicle.angVel.set(0, 0, 0);
        this._tmpE.set(b.pitch, b.yaw + (localEntry.relYaw || 0), b.roll, "YXZ");
        vehicle.quat.setFromEuler(this._tmpE);
        vehicle.inWaterDepth = 0;
        vehicle.hydrolocked = false;
      }
    }

    if (!spotUsed && this.sharedSpotLight.intensity > 0) {
      this.sharedSpotLight.intensity = 0.0;
    }
  }

  removeRemoteBoat(peerId) {
    const rb = this.remoteBoats.get(peerId);
    if (rb) {
      this.scene.remove(rb.mesh);
      this.remoteBoats.delete(peerId);
    }
  }

  updateRemoteBoats(dt, remotePlayersMap, particles) {
    if (!remotePlayersMap) return;
    const activeIds = new Set();
    const lf = Math.min(1, dt * 11);
    for (const [pid, rp] of remotePlayersMap.entries()) {
      const bData = rp.boat;
      if (!bData || !bData.id || !KK.BOATS[bData.id]) {
        this.removeRemoteBoat(pid);
        continue;
      }
      activeIds.add(pid);
      let rb = this.remoteBoats.get(pid);
      const spec = KK.BOATS[bData.id];
      if (!rb || rb.id !== bData.id) {
        this.removeRemoteBoat(pid);
        const built = this._buildBoatMesh(bData.id);
        this.scene.add(built.grp);
        rb = {
          id: bData.id, spec, ownerPeerId: pid,
          mesh: built.grp, fans: built.fans, radars: built.radars, helmWheel: built.helmWheel, helmLever: built.helmLever, skirtMesh: built.skirtMesh,
          rampPivot: built.rampPivot, rampRestRotX: built.rampRestRotX, rampOpenRotX: built.rampOpenRotX,
          navLightsGroup: built.navLightsGroup, spotCone: built.spotCone, bayChains: built.bayChains,
          gx: bData.x, gy: bData.y, gz: bData.z, yaw: bData.yaw || 0, pitch: 0, roll: 0,
          vx: bData.vx || 0, vz: bData.vz || 0, speedKmh: bData.spd || 0,
          anchored: !!bData.anc, deckLocked: bData.lock !== undefined ? !!bData.lock : true,
          navLightsOn: bData.nav !== undefined ? !!bData.nav : true,
          spotLightOn: !!bData.spot, rampAnim: 0, cushionAnim: 1, deckVehicles: []
        };
        this.remoteBoats.set(pid, rb);
      }

      rb.vx = bData.vx || 0; rb.vz = bData.vz || 0;
      rb.gx += rb.vx * dt; rb.gz += rb.vz * dt;
      rb.gx += (bData.x - rb.gx) * lf;
      rb.gy += (bData.y - rb.gy) * lf;
      rb.gz += (bData.z - rb.gz) * lf;
      let dy = (bData.yaw || 0) - rb.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      rb.yaw += dy * lf;
      rb.speedKmh = bData.spd || 0;
      rb.anchored = !!bData.anc;
      rb.deckLocked = bData.lock !== undefined ? !!bData.lock : true;
      rb.navLightsOn = bData.nav !== undefined ? !!bData.nav : true;
      rb.spotLightOn = !!bData.spot;

      rb.rampAnim += ((rb.deckLocked ? 0.0 : 1.0) - rb.rampAnim) * Math.min(1, dt * 4);
      if (rb.rampPivot) rb.rampPivot.rotation.x = rb.rampRestRotX + (rb.rampOpenRotX - rb.rampRestRotX) * rb.rampAnim;
      rb.cushionAnim += ((rb.anchored ? 0.0 : 1.0) - rb.cushionAnim) * Math.min(1, dt * 4);
      if (rb.skirtMesh) rb.skirtMesh.scale.y = 0.38 + rb.cushionAnim * 0.62;

      rb.pitch = Math.sin(this.wavePhase * 1.15 + rb.gz * 0.025) * 0.025;
      rb.roll = 0;
      this.world.toLocal(rb.gx, rb.gy, rb.gz, rb.mesh.position);
      rb.mesh.rotation.set(rb.pitch, rb.yaw, rb.roll, "YXZ");

      if (rb.navLightsGroup) rb.navLightsGroup.visible = !!rb.navLightsOn;
      if (rb.spotCone) rb.spotCone.visible = !!rb.spotLightOn;
      if (rb.fans && rb.fans.length > 0) {
        const fSpd = rb.anchored ? 1.8 : (8 + Math.min(26, rb.speedKmh * 0.3));
        for (const fn of rb.fans) fn.rotation.z += dt * fSpd;
      }
      if (rb.radars && rb.radars.length > 0) {
        for (const rd of rb.radars) rd.rotation.y += dt * 2.2;
      }
      if (rb.speedKmh > 14 && particles && Math.random() < 0.42) {
        const len = spec.len || 14;
        particles.emitWaterSplash(rb.gx - Math.sin(rb.yaw) * len * 0.44, rb.gy + 0.3, rb.gz - Math.cos(rb.yaw) * len * 0.44, 1.3);
      }
    }
    for (const pid of Array.from(this.remoteBoats.keys())) {
      if (!activeIds.has(pid)) this.removeRemoteBoat(pid);
    }
  }
};
