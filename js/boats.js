// ============================================================================
// js/boats.js (v15.2 ONLINE) — Full-Scale Naval & Multi-Crew Deck Overhaul!
// • Realistic Full-Scale Vessels:
//   - Projekt 12322 "Zubr" LCAC Hovercraft (52m × 22m, 150t, 6 Bays, Amphibious)
//   - Projekt 11770 "Serna" Tank Landing Barge (28m × 9.2m, 75t, 2 Bays / 1 MBT)
//   - Krasnaya Utility Patrol Boat (14.8m × 5.0m, 4.5t, 1 Stern Bay)
//   - Strela-X1 Offshore Speedboat (9.4m × 2.5m, 155 km/h, 1 Seat Only)
// • Multi-Vehicle Deck Bays + Tonnage Trim Physics + Visual Tie-Down Chains
// • Shipmaster Deck Lock [U] + Articulating Bow Ramp + Deep-Ocean Safety Warning
// • [Space] Anchor / Zubr Air-Cushion Dump + [L] Nav Lights + [K] Bridge Searchlight
// • Walkable Moving Deck Helpers + Man-Overboard Boarding + Synced Remote Boats!
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
    const sideOff = (boatSpec && boatSpec.width > 12) ? 46 : ((boatSpec && boatSpec.width > 7) ? 38 : 32);
    const fwdOff  = (boatSpec && boatSpec.len > 36) ? 62 : 50;
    return {
      x: pt.x + (sideOff * c + fwdOff * s),
      z: pt.z + (-sideOff * s + fwdOff * c),
      yaw: yaw
    };
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
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(boat.pitch || 0, boat.yaw || 0, boat.roll || 0, "YXZ"));
    outVec.set(lx, ly, lz).applyQuaternion(q);
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

  _buildBoatMesh(boatId, isLocalLight = true) {
    const grp = new THREE.Group();
    const fans = [];
    let skirtMesh = null;
    let rampPivot = null;
    let rampRestRotX = 0.0;
    let rampOpenRotX = 1.25;
    const navLightsGroup = new THREE.Group();
    let spotLight = null;
    let spotTarget = null;
    let spotCone = null;
    const bayChains = [];

    const matHullDark = new THREE.MeshStandardMaterial({ color: 0x343d46, roughness: 0.72, metalness: 0.36 });
    const matNavalGry = new THREE.MeshStandardMaterial({ color: 0x64727e, roughness: 0.64, metalness: 0.34 });
    const matNavalLt  = new THREE.MeshStandardMaterial({ color: 0x7d8c98, roughness: 0.60, metalness: 0.28 });
    const matDeck     = new THREE.MeshStandardMaterial({ color: 0x454e55, roughness: 0.88, metalness: 0.24 });
    const matSkirt    = new THREE.MeshStandardMaterial({ color: 0x181b1f, roughness: 0.96 });
    const matRed      = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.42, metalness: 0.25 });
    const matWhite    = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.35, metalness: 0.15 });
    const matBlue     = new THREE.MeshStandardMaterial({ color: 0x1e6091, roughness: 0.45, metalness: 0.25 });
    const matGlass    = new THREE.MeshStandardMaterial({ color: 0x142b3c, emissive: 0x0d364d, emissiveIntensity: 0.65, roughness: 0.16, metalness: 0.68 });
    const matRail     = new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.5, metalness: 0.65 });
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

    const attachSearchlight = (sx, sy, sz, range = 260) => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.48, 10), matWhite);
      lamp.rotation.x = Math.PI / 2; lamp.position.set(sx, sy, sz); grp.add(lamp);
      spotCone = new THREE.Mesh(
        new THREE.ConeGeometry(7.5, 42, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xc8f4ff, transparent: true, opacity: 0.11, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      spotCone.rotation.x = -Math.PI / 2 + 0.08;
      spotCone.position.set(sx, sy - 1.4, sz + 21.5);
      spotCone.visible = false;
      grp.add(spotCone);
      if (isLocalLight) {
        spotLight = new THREE.SpotLight(0xdaf6ff, 0.0, range, 0.56, 0.48, 1.0);
        spotLight.position.set(sx, sy, sz + 0.5);
        spotTarget = new THREE.Object3D();
        spotTarget.position.set(sx, sy - 7.5, sz + 65);
        grp.add(spotTarget);
        spotLight.target = spotTarget;
        grp.add(spotLight);
      }
    };

    if (boatId === "zubr") {
      // PROJEKT 12322 "ZUBR" LCAC HOVERCRAFT — 52.0m × 22.0m REALISTIC FULL SCALE!
      skirtMesh = new THREE.Mesh(new THREE.BoxGeometry(22.0, 2.05, 51.6), matSkirt);
      skirtMesh.position.set(0, 1.02, 0); skirtMesh.castShadow = true; grp.add(skirtMesh);

      const hull = new THREE.Mesh(new THREE.BoxGeometry(20.6, 1.15, 48.8), matNavalGry);
      hull.position.set(0, 2.52, -0.4); hull.castShadow = true; hull.receiveShadow = true; grp.add(hull);

      const deck = new THREE.Mesh(new THREE.BoxGeometry(13.4, 0.16, 36.0), matDeck);
      deck.position.set(0, 3.12, 2.0); deck.receiveShadow = true; grp.add(deck);

      for (const b of KK.BOATS.zubr.bays) {
        addTieDownBayVisual(b.x, 3.18, b.z, 5.4, 9.2);
      }

      for (const sx of [-1, 1]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.6, 42.5), matNavalGry);
        sp.position.set(sx * 8.4, 4.35, -1.2); sp.castShadow = true; grp.add(sp);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.05, 41.5), matRail);
        rail.position.set(sx * 10.1, 6.1, -1.2); grp.add(rail);
        for (let lv = 0; lv < 5; lv++) {
          const intake = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.1, 2.2), matHullDark);
          intake.position.set(sx * 10.25, 4.4, -14 + lv * 5.2); grp.add(intake);
        }
      }

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3.4, 9.6), matNavalLt);
      bridge.position.set(7.8, 7.2, 8.2); bridge.castShadow = true; grp.add(bridge);
      const bWin = new THREE.Mesh(new THREE.BoxGeometry(4.35, 1.15, 7.2), matGlass);
      bWin.position.set(7.8, 7.8, 9.2); grp.add(bWin);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 6.8, 8), matHullDark);
      mast.position.set(7.8, 12.2, 6.4); grp.add(mast);
      const radBar = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.32, 0.45), matWhite);
      radBar.position.set(7.8, 14.8, 6.4); grp.add(radBar);
      for (const sx of [-7.8, 7.8]) {
        const ciws = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.6, 10), matNavalLt);
        ciws.position.set(sx, 6.4, 16.5); grp.add(ciws);
      }

      rampPivot = new THREE.Group();
      rampPivot.position.set(0, 3.05, 20.2);
      const rampSlab = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.38, 7.0), matHullDark);
      rampSlab.position.set(0, 0, 3.5); rampSlab.castShadow = true; rampPivot.add(rampSlab);
      const rampStripe = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.42, 0.45), matStripeY);
      rampStripe.position.set(0, 0.02, 6.6); rampPivot.add(rampStripe);
      rampRestRotX = -1.18;
      rampOpenRotX =  0.26;
      rampPivot.rotation.x = rampRestRotX;
      grp.add(rampPivot);

      for (const fx of [-6.0, 0, 6.0]) {
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.65, 2.2, 16, 1, true), matHullDark);
        duct.rotation.x = Math.PI / 2; duct.position.set(fx, 6.2, -21.5); grp.add(duct);
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.65, 2.6, 1.8), matNavalGry);
        pylon.position.set(fx, 3.9, -21.5); grp.add(pylon);
        const hub = new THREE.Group(); hub.position.set(fx, 6.2, -21.5);
        for (let b = 0; b < 4; b++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 4.8, 0.12), matWhite);
          bl.rotation.z = (b / 4) * Math.PI; hub.add(bl);
        }
        grp.add(hub); fans.push(hub);
      }

      addNavLight(-10.2, 6.6,  16.5, matNavRed, 0.42);
      addNavLight( 10.2, 6.6,  16.5, matNavGrn, 0.42);
      addNavLight(  7.8, 15.6,  6.4, matNavWht, 0.46);
      addNavLight(  0.0, 6.8, -23.0, matNavWht, 0.40);
      attachSearchlight(7.8, 9.2, 13.0, 320);

    } else if (boatId === "serna") {
      // PROJEKT 11770 "SERNA" TANK LANDING BARGE — 28.0m × 9.2m REALISTIC SCALE!
      const hull = new THREE.Mesh(new THREE.BoxGeometry(9.2, 2.05, 26.8), matHullDark);
      hull.position.set(0, 0.85, -0.4); hull.castShadow = true; grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.16, 20.0), matDeck);
      deck.position.set(0, 1.94, 2.2); deck.receiveShadow = true; grp.add(deck);

      for (const b of KK.BOATS.serna.bays) {
        addTieDownBayVisual(b.x, 2.00, b.z, 5.2, 8.2);
      }

      for (const sx of [-1, 1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.55, 22.8), matNavalGry);
        wall.position.set(sx * 3.95, 2.62, 0.8); wall.castShadow = true; grp.add(wall);
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.85, 22.0), matRail);
        rail.position.set(sx * 4.5, 3.8, 0.8); grp.add(rail);
      }

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(7.8, 3.1, 5.2), matNavalLt);
      cabin.position.set(0, 3.45, -10.8); cabin.castShadow = true; grp.add(cabin);
      const win = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.05, 0.45), matGlass);
      win.position.set(0, 4.05, -8.15); grp.add(win);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.20, 4.4, 8), matHullDark);
      mast.position.set(0, 7.1, -11.2); grp.add(mast);

      rampPivot = new THREE.Group();
      rampPivot.position.set(0, 1.92, 12.2);
      const rampSlab = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.30, 4.6), matRed);
      rampSlab.position.set(0, 0, 2.3); rampSlab.castShadow = true; rampPivot.add(rampSlab);
      rampRestRotX = -1.20;
      rampOpenRotX =  0.24;
      rampPivot.rotation.x = rampRestRotX;
      grp.add(rampPivot);

      addNavLight(-4.5, 3.9, 10.5, matNavRed, 0.30);
      addNavLight( 4.5, 3.9, 10.5, matNavGrn, 0.30);
      addNavLight( 0.0, 9.3, -11.2, matNavWht, 0.34);
      addNavLight( 0.0, 4.6, -13.5, matNavWht, 0.28);
      attachSearchlight(0, 5.2, -8.2, 260);

    } else if (boatId === "patrol") {
      // KRASNAYA UTILITY PATROL BOAT — 14.8m × 5.0m!
      const hull = new THREE.Mesh(new THREE.BoxGeometry(5.0, 1.45, 11.8), matBlue);
      hull.position.set(0, 0.65, -0.8); hull.castShadow = true; grp.add(hull);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(2.6, 4.2, 4), matBlue);
      bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.scale.set(1.0, 0.52, 1.0);
      bow.position.set(0, 0.68, 7.1); grp.add(bow);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.14, 7.2), matWhite);
      deck.position.set(0, 1.42, -2.6); deck.receiveShadow = true; grp.add(deck);
      addTieDownBayVisual(0, 1.48, -2.6, 3.2, 5.6);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.0, 3.8), matWhite);
      cabin.position.set(0, 2.38, 2.8); cabin.castShadow = true; grp.add(cabin);
      const win = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.88, 2.6), matGlass);
      win.position.set(0, 2.65, 3.2); grp.add(win);
      for (const sx of [-2.35, 2.35]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 7.0), matRail);
        rail.position.set(sx, 1.82, -2.6); grp.add(rail);
      }
      for (const ox of [-1.05, 1.05]) {
        const ob = new THREE.Mesh(new THREE.BoxGeometry(0.50, 1.35, 0.75), matSkirt);
        ob.position.set(ox, 0.85, -6.9); grp.add(ob);
      }
      addNavLight(-2.4, 2.6, 4.2, matNavRed, 0.22);
      addNavLight( 2.4, 2.6, 4.2, matNavGrn, 0.22);
      addNavLight( 0.0, 4.0, 2.6, matNavWht, 0.24);
      attachSearchlight(0, 3.6, 4.6, 220);

    } else {
      // STRELA-X1 OFFSHORE SPEEDBOAT — 9.4m × 2.5m (155 km/h Solo Hydroplane!)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.50, 0.78, 7.0), matWhite);
      hull.position.set(0, 0.38, -0.5); hull.castShadow = true; grp.add(hull);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.24, 6.8), matRed);
      stripe.position.set(0, 0.50, -0.5); grp.add(stripe);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.30, 4.0, 4), matWhite);
      bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.scale.set(1.0, 0.36, 1.0);
      bow.position.set(0, 0.40, 4.95); grp.add(bow);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.62, 2.6), matGlass);
      canopy.position.set(0, 0.98, -0.2); grp.add(canopy);
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.10, 0.50), matRed);
      spoiler.position.set(0, 1.24, -3.65); grp.add(spoiler);
      for (const ox of [-0.55, 0.55]) {
        const ob = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.95, 0.58), matSkirt);
        ob.position.set(ox, 0.55, -4.18); grp.add(ob);
      }
      addNavLight(-1.22, 0.85, 2.2, matNavRed, 0.16);
      addNavLight( 1.22, 0.85, 2.2, matNavGrn, 0.16);
      addNavLight( 0.0,  1.38, -3.65, matNavWht, 0.16);
      attachSearchlight(0, 0.88, 2.4, 210);
    }

    grp.add(navLightsGroup);
    return { grp, fans, skirtMesh, rampPivot, rampRestRotX, rampOpenRotX, navLightsGroup, spotLight, spotTarget, spotCone, bayChains };
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
      existing.deckLocked = true;
      existing.anchored = true;
      existing.gx = sp.x; existing.gy = seaL; existing.gz = sp.z;
      existing.yaw = sp.yaw; existing.pitch = 0; existing.roll = 0;
      existing.vx = 0; existing.vz = 0; existing.speedKmh = 0;
      this.world.toLocal(existing.gx, existing.gy, existing.gz, existing.mesh.position);
      existing.mesh.rotation.set(0, existing.yaw, 0);
      return existing;
    }

    const built = this._buildBoatMesh(boatId, true);
    this.scene.add(built.grp);
    const boat = {
      id: boatId, spec,
      mesh: built.grp, fans: built.fans, skirtMesh: built.skirtMesh,
      rampPivot: built.rampPivot, rampRestRotX: built.rampRestRotX, rampOpenRotX: built.rampOpenRotX,
      navLightsGroup: built.navLightsGroup, spotLight: built.spotLight, spotTarget: built.spotTarget, spotCone: built.spotCone,
      bayChains: built.bayChains,
      gx: sp.x, gy: seaL, gz: sp.z, yaw: sp.yaw, pitch: 0, roll: 0,
      vx: 0, vz: 0, speedKmh: 0, throttleCmd: 0, boostCmd: false,
      anchored: true,
      deckLocked: true,
      unlockWarnUntil: 0,
      navLightsOn: true,
      spotLightOn: false,
      waterDepth: 12.0,
      isBeached: false,
      rampAnim: 0.0,
      cushionAnim: 0.0,
      deckVehicles: []
    };
    this.world.toLocal(boat.gx, boat.gy, boat.gz, boat.mesh.position);
    boat.mesh.rotation.set(0, boat.yaw, 0);
    this.spawnedBoats.push(boat);
    return boat;
  }

  getPayloadKg(boat, remotePlayersMap = null) {
    if (!boat) return 0;
    let sum = 0;
    if (boat.deckVehicles) {
      for (const dv of boat.deckVehicles) sum += (dv.massKg || 0);
    }
    // Also count any remote comrades' vehicles mounted on this boat!
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
      if (ui) ui.toast(boat.anchored ? "AIR CUSHION DUMPED [SPACE]: Hovercraft settled flat as a motionless landing pad!" : "AIR CUSHION INFLATED [SPACE]: Turbines spooled — ready to glide!");
    } else {
      if (ui) ui.toast(boat.anchored ? "ANCHOR DROPPED [SPACE]: Vessel holding station!" : "ANCHOR WEIGHED [SPACE]: All ahead ready!");
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

  update(dt, input, vehicle, particles, audio, ui = null, remotePlayersMap = null, localPeerId = null) {
    this.wavePhase += dt * 2.1;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

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

      if (b.anchored) {
        if (isPiloted && Math.abs(throttle) > 0.2 && (!b._ancWarnCd || b._ancWarnCd <= 0)) {
          b._ancWarnCd = 2.6;
          if (ui) ui.toast(sp.amphibious ? "AIR CUSHION DUMPED — Press [SPACE] to inflate & lift off!" : "ANCHOR DOWN — Press [SPACE] to weigh anchor!", true);
        }
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

      const drag = Math.exp(-dt * (sp.amphibious ? 0.62 : 0.90));
      b.vx *= drag; b.vz *= drag;
      if (!sp.amphibious) {
        const rightX = Math.cos(b.yaw), rightZ = -Math.sin(b.yaw);
        const latV = b.vx * rightX + b.vz * rightZ;
        const latKill = Math.min(1, dt * 3.8);
        b.vx -= rightX * latV * latKill;
        b.vz -= rightZ * latV * latKill;
      }
      const spd = Math.hypot(b.vx, b.vz);
      if (spd > maxMs) { b.vx *= maxMs / spd; b.vz *= maxMs / spd; }

      const nextX = b.gx + b.vx * dt;
      const nextZ = b.gz + b.vz * dt;
      const tiNext = this.world.getTerrainInfo(nextX, nextZ, false);
      b.waterDepth = Math.max(0, seaL - tiNext.height);
      b.isBeached = tiNext.height >= seaL - 0.6;

      const targetCushion = b.anchored ? 0.0 : 1.0;
      b.cushionAnim += (targetCushion - b.cushionAnim) * Math.min(1, dt * 3.8);
      if (b.skirtMesh) {
        b.skirtMesh.scale.y = 0.38 + b.cushionAnim * 0.62;
        b.skirtMesh.position.y = 1.02 * b.skirtMesh.scale.y;
      }

      const trimSink = loadRatio * (sp.amphibious ? 0.35 : 0.42);
      if (sp.amphibious) {
        const maxSlopeH = seaL + 22.0;
        if (tiNext.height <= maxSlopeH) {
          b.gx = nextX; b.gz = nextZ;
        } else {
          b.vx *= -0.22; b.vz *= -0.22;
        }
        const waveAmp = b.isBeached ? 0.0 : (0.16 * b.cushionAnim);
        const cushionLift = -0.85 * (1.0 - b.cushionAnim);
        b.gy = Math.max(seaL, tiNext.height) + 0.30 + cushionLift - trimSink + Math.sin(this.wavePhase + b.gx * 0.03) * waveAmp;
      } else {
        if (tiNext.height < seaL + 0.45) {
          b.gx = nextX; b.gz = nextZ;
        } else {
          b.vx *= -0.15; b.vz *= -0.15;
        }
        b.gy = seaL - trimSink + Math.sin(this.wavePhase + b.gx * 0.04) * (sp.id === "strela" ? 0.24 : 0.16);
      }

      const lim = KK.HALF_WORLD - 400;
      b.gx = Math.max(-lim, Math.min(lim, b.gx));
      b.gz = Math.max(-lim, Math.min(lim, b.gz));
      b.speedKmh = Math.hypot(b.vx, b.vz) * 3.6;

      const targetRamp = b.deckLocked ? 0.0 : 1.0;
      b.rampAnim += (targetRamp - b.rampAnim) * Math.min(1, dt * 3.4);
      if (b.rampPivot) {
        b.rampPivot.rotation.x = b.rampRestRotX + (b.rampOpenRotX - b.rampRestRotX) * b.rampAnim;
      }

      const bowLift = Math.min(0.11, (b.speedKmh / 145) * 0.09);
      const wavePitch = b.isBeached ? 0 : (Math.sin(this.wavePhase * 1.15 + b.gz * 0.025) * 0.025 - bowLift);
      const bankRoll = steer * Math.min(0.18, (b.speedKmh / 95) * 0.15) * (sp.id === "strela" ? 1.35 : 0.45);
      b.pitch += (wavePitch - b.pitch) * Math.min(1, dt * 8);
      b.roll  += (bankRoll  - b.roll)  * Math.min(1, dt * 8);

      this.world.toLocal(b.gx, b.gy, b.gz, b.mesh.position);
      b.mesh.rotation.set(b.pitch, b.yaw, b.roll, "YXZ");

      if (b.navLightsGroup) b.navLightsGroup.visible = !!b.navLightsOn;
      if (b.spotLight) b.spotLight.intensity = b.spotLightOn ? 4.8 : 0.0;
      if (b.spotCone)  b.spotCone.visible = !!b.spotLightOn;
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
          b.bayChains[ci].visible = !!b.deckLocked && occBays.has(ci);
        }
      }

      if (b.fans && b.fans.length > 0) {
        const fSpd = b.anchored ? 1.8 : (isPiloted ? (10 + Math.abs(throttle) * 24) : 4.0);
        for (const fn of b.fans) fn.rotation.z += dt * fSpd;
      }

      if (isPiloted && b.speedKmh > 12 && !b.isBeached && particles && Math.random() < 0.55) {
        particles.emitWaterSplash(b.gx - nFwdX * (sp.len * 0.44), b.gy + 0.3, b.gz - nFwdZ * (sp.len * 0.44), Math.min(2.2, b.speedKmh / 48));
      }

      const localEntry = this.getLocalMountedEntry(b);
      if (localEntry && vehicle) {
        const wPos = this.boatLocalToWorld(b, localEntry.x, sp.deckY + 0.06, localEntry.z);
        vehicle.pos.copy(wPos);
        vehicle.vel.set(b.vx, 0, b.vz);
        vehicle.angVel.set(0, 0, 0);
        vehicle.quat.setFromEuler(new THREE.Euler(b.pitch, b.yaw, b.roll, "YXZ"));
        vehicle.inWaterDepth = 0;
        vehicle.hydrolocked = false;
      }
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
        const built = this._buildBoatMesh(bData.id, false);
        this.scene.add(built.grp);
        rb = {
          id: bData.id, spec, ownerPeerId: pid,
          mesh: built.grp, fans: built.fans, skirtMesh: built.skirtMesh,
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
      if (rb.skirtMesh) {
        rb.skirtMesh.scale.y = 0.38 + rb.cushionAnim * 0.62;
        rb.skirtMesh.position.y = 1.02 * rb.skirtMesh.scale.y;
      }

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
