// ============================================================================
// js/boats.js (v15.1 ONLINE) — Naval System, Port Boat Summoning & Vehicle Ferries
// 4 Unlockable Boats:
//   1. Projekt 12322 "Zubr" LCAC Hovercraft (Amphibious, carries ANY tank/car!)
//   2. Projekt 11770 "Serna" Tank Landing Barge (Steel bow ramp, carries ANY tank/car!)
//   3. Krasnaya Utility Patrol Boat (Fast 4-seat patrol boat, carries 1 light 4x4!)
//   4. Strela-X1 Offshore Speedboat (155 km/h hydroplane, 1 person only, no vehicles!)
// ============================================================================
window.KK = window.KK || {};

KK.BoatManager = class BoatManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.spawnedBoats = [];
    this.activeBoat = null;
    this.wavePhase = 0;
    this.remoteBoats = new Map(); // peerId -> { id, mesh, fans, gx, gy, gz, yaw }
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

  getPortMoatSpawnPos(pt) {
    const yaw = pt.yaw || 0;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return {
      x: pt.x + (32 * c + 48 * s),
      z: pt.z + (-32 * s + 48 * c),
      yaw: yaw
    };
  }

  findNearbyPort(gx, gz, maxDist = 44) {
    if (!KK.PORTS) return null;
    let best = null, bestD = maxDist;
    for (const pt of KK.PORTS) {
      const pad = this.getPortPadWorldPos(pt);
      const d = Math.min(Math.hypot(gx - pad.x, gz - pad.z), Math.hypot(gx - pt.x, gz - pt.z));
      if (d < bestD) { bestD = d; best = { port: pt, pad, dist: d }; }
    }
    return best;
  }

  findNearbyBoat(gx, gz, maxDist = 28) {
    let best = null, bestD = maxDist;
    for (const b of this.spawnedBoats) {
      const d = Math.hypot(gx - b.gx, gz - b.gz);
      if (d < bestD) { bestD = d; best = { boat: b, dist: d }; }
    }
    return best;
  }

  _buildBoatMesh(boatId) {
    const grp = new THREE.Group();
    const fans = [];
    const matHullDark = new THREE.MeshStandardMaterial({ color: 0x3b444c, roughness: 0.72, metalness: 0.35 });
    const matNavalGry = new THREE.MeshStandardMaterial({ color: 0x677580, roughness: 0.65, metalness: 0.32 });
    const matDeck     = new THREE.MeshStandardMaterial({ color: 0x4b5359, roughness: 0.88, metalness: 0.22 });
    const matSkirt    = new THREE.MeshStandardMaterial({ color: 0x1b1e22, roughness: 0.96 });
    const matRed      = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.42, metalness: 0.25 });
    const matWhite    = new THREE.MeshStandardMaterial({ color: 0xedf2f7, roughness: 0.35, metalness: 0.15 });
    const matBlue     = new THREE.MeshStandardMaterial({ color: 0x1e6091, roughness: 0.45, metalness: 0.25 });
    const matGlass    = new THREE.MeshStandardMaterial({ color: 0x152838, emissive: 0x0b2538, roughness: 0.18, metalness: 0.6 });
    const matGold     = new THREE.MeshBasicMaterial({ color: 0xffd166 });

    if (boatId === "zubr") {
      // PROJEKT 12322 "ZUBR" LCAC HOVERCRAFT (24m x 11m Amphibious Tank Carrier!)
      const skirt = new THREE.Mesh(new THREE.BoxGeometry(11.2, 1.55, 24.4), matSkirt);
      skirt.position.set(0, 0.78, 0); skirt.castShadow = true; grp.add(skirt);
      const hull = new THREE.Mesh(new THREE.BoxGeometry(10.4, 1.15, 23.0), matNavalGry);
      hull.position.set(0, 2.05, 0); hull.castShadow = true; hull.receiveShadow = true; grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.18, 17.5), matDeck);
      deck.position.set(0, 2.66, 1.2); deck.receiveShadow = true; grp.add(deck);
      for (const sx of [-4.2, 4.2]) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 20.5), matNavalGry);
        sp.position.set(sx, 3.65, -0.5); sp.castShadow = true; grp.add(sp);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 5.2), matNavalGry);
      bridge.position.set(3.8, 5.4, 4.2); grp.add(bridge);
      const bWin = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.85, 4.6), matGlass);
      bWin.position.set(3.8, 5.8, 4.5); grp.add(bWin);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.28, 3.8), matHullDark);
      ramp.position.set(0, 1.95, 12.6); ramp.rotation.x = 0.28; grp.add(ramp);
      for (const fx of [-3.3, 0, 3.3]) {
        const duct = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 1.4, 14, 1, true), matHullDark);
        duct.rotation.x = Math.PI / 2; duct.position.set(fx, 4.4, -10.5); grp.add(duct);
        const hub = new THREE.Group(); hub.position.set(fx, 4.4, -10.5);
        for (let b = 0; b < 4; b++) {
          const bl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 3.1, 0.08), matWhite);
          bl.rotation.z = (b / 4) * Math.PI; hub.add(bl);
        }
        grp.add(hub); fans.push(hub);
      }
      const navL = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 6), matGold);
      navL.position.set(3.8, 6.8, 4.5); grp.add(navL);
    } else if (boatId === "serna") {
      // PROJEKT 11770 "SERNA" TANK LANDING BARGE (19m x 6.6m Heavy Steel Deck + Bow Ramp!)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(6.6, 1.85, 18.6), matHullDark);
      hull.position.set(0, 0.65, 0); hull.castShadow = true; grp.add(hull);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 13.5), matDeck);
      deck.position.set(0, 1.62, 1.5); deck.receiveShadow = true; grp.add(deck);
      for (const sx of [-3.1, 3.1]) {
        const wall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.25, 15.2), matNavalGry);
        wall.position.set(sx, 2.1, 0.8); grp.add(wall);
      }
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.5, 3.8), matNavalGry);
      cabin.position.set(0, 2.8, -7.2); cabin.castShadow = true; grp.add(cabin);
      const win = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.85, 0.4), matGlass);
      win.position.set(0, 3.3, -5.2); grp.add(win);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.25, 3.2), matRed);
      ramp.position.set(0, 1.45, 10.2); ramp.rotation.x = 0.24; grp.add(ramp);
    } else if (boatId === "patrol") {
      // KRASNAYA UTILITY PATROL BOAT (11.5m x 4.0m Fast Twin-Outboard Harbor Craft!)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.25, 10.8), matBlue);
      hull.position.set(0, 0.42, 0); hull.castShadow = true; grp.add(hull);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(2.05, 3.2, 4), matBlue);
      bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.scale.set(1.0, 0.52, 1.0);
      bow.position.set(0, 0.45, 6.8); grp.add(bow);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 6.2), matWhite);
      deck.position.set(0, 1.08, -1.6); grp.add(deck);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.65, 3.2), matWhite);
      cabin.position.set(0, 1.88, 2.2); cabin.castShadow = true; grp.add(cabin);
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.72, 2.2), matGlass);
      win.position.set(0, 2.12, 2.6); grp.add(win);
      for (const ox of [-0.9, 0.9]) {
        const ob = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.15, 0.65), matSkirt);
        ob.position.set(ox, 0.65, -5.65); grp.add(ob);
      }
    } else {
      // STRELA-X1 OFFSHORE SPEEDBOAT (8.5m Sleek 1-Person Hydroplane Rocket!)
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.72, 6.6), matWhite);
      hull.position.set(0, 0.34, -0.4); hull.castShadow = true; grp.add(hull);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.30, 0.22, 6.4), matRed);
      stripe.position.set(0, 0.46, -0.4); grp.add(stripe);
      const bow = new THREE.Mesh(new THREE.ConeGeometry(1.18, 3.6, 4), matWhite);
      bow.rotation.x = Math.PI / 2; bow.rotation.z = Math.PI / 4; bow.scale.set(1.0, 0.36, 1.0);
      bow.position.set(0, 0.36, 4.65); grp.add(bow);
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.56, 2.4), matGlass);
      canopy.position.set(0, 0.92, -0.2); grp.add(canopy);
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.10, 0.45), matRed);
      spoiler.position.set(0, 1.12, -3.35); grp.add(spoiler);
    }

    return { grp, fans };
  }

  summonBoatAtPort(boatId, port) {
    const spec = KK.BOATS[boatId];
    if (!spec || !port) return null;

    const existing = this.spawnedBoats.find((b) => b.id === boatId);
    const sp = this.getPortMoatSpawnPos(port);
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    if (existing) {
      if (this.activeBoat === existing) this.activeBoat = null;
      existing.mountedCar = false;
      existing.gx = sp.x; existing.gy = seaL; existing.gz = sp.z;
      existing.yaw = sp.yaw; existing.vx = 0; existing.vz = 0; existing.speedKmh = 0;
      this.world.toLocal(existing.gx, existing.gy, existing.gz, existing.mesh.position);
      existing.mesh.rotation.set(0, existing.yaw, 0);
      return existing;
    }

    const built = this._buildBoatMesh(boatId);
    this.scene.add(built.grp);
    const boat = {
      id: boatId, spec, mesh: built.grp, fans: built.fans,
      gx: sp.x, gy: seaL, gz: sp.z, yaw: sp.yaw,
      vx: 0, vz: 0, speedKmh: 0, mountedCar: false
    };
    this.world.toLocal(boat.gx, boat.gy, boat.gz, boat.mesh.position);
    boat.mesh.rotation.set(0, boat.yaw, 0);
    this.spawnedBoats.push(boat);
    return boat;
  }

  canMountVehicle(boat, vehicle) {
    if (!boat || !vehicle || !boat.spec.maxCarMassKg) {
      return { ok: false, reason: `${boat.spec.name} is strictly 1-person / no vehicle deck!` };
    }
    const mass = vehicle.spec.massKg || 2000;
    if (mass > boat.spec.maxCarMassKg) {
      return { ok: false, reason: `${vehicle.spec.name} (${Math.round(mass / 1000)}t) is too heavy for ${boat.spec.name} (max ${Math.round(boat.spec.maxCarMassKg / 1000)}t)!` };
    }
    return { ok: true };
  }

  toggleMountVehicle(boat, vehicle, ui) {
    if (!boat || !vehicle) return false;
    if (boat.mountedCar) {
      const fwdX = Math.sin(boat.yaw), fwdZ = Math.cos(boat.yaw);
      const dropX = boat.gx + fwdX * (boat.spec.len * 0.58 + 3.5);
      const dropZ = boat.gz + fwdZ * (boat.spec.len * 0.58 + 3.5);
      const ti = this.world.getTerrainInfo(dropX, dropZ, false);
      const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
      if (ti.height < seaL - 1.5) {
        if (ui) ui.toast("Sail closer to a beach, island shore, or port ramp before unloading your vehicle!", true);
        return false;
      }
      boat.mountedCar = false;
      vehicle.pos.set(dropX, Math.max(ti.height, seaL) + 1.1, dropZ);
      vehicle.vel.set(0, 0, 0);
      vehicle.angVel.set(0, 0, 0);
      if (ui) ui.toast(`UNLOADED ${vehicle.spec.name} onto shore!`);
      return true;
    } else {
      const chk = this.canMountVehicle(boat, vehicle);
      if (!chk.ok) { if (ui) ui.toast(chk.reason, true); return false; }
      const d = Math.hypot(vehicle.pos.x - boat.gx, vehicle.pos.z - boat.gz);
      if (d > 58) {
        if (ui) ui.toast(`Drive your ${vehicle.spec.name} closer to the pier/boat (< 58m) to mount it on deck!`, true);
        return false;
      }
      boat.mountedCar = true;
      if (ui) ui.toast(`MOUNTED ${vehicle.spec.name} onto ${boat.spec.name} deck! Sail to any island & press [V] to unload!`);
      return true;
    }
  }

  update(dt, input, vehicle, particles, audio) {
    this.wavePhase += dt * 2.1;
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;

    for (const b of this.spawnedBoats) {
      const isPiloted = (this.activeBoat === b);
      const sp = b.spec;
      let throttle = 0, steer = 0, boost = false;
      if (isPiloted && input) {
        throttle = (input.throttle || 0) - (input.brake || 0);
        steer = input.steer || 0;
        boost = !!input.boost;
      }

      const maxMs = (sp.topSpeedKmh / 3.6) * (boost ? 1.18 : 1.0);
      const fwdX = Math.sin(b.yaw), fwdZ = Math.cos(b.yaw);
      const fwdSpd = b.vx * fwdX + b.vz * fwdZ;
      const turnRate = sp.amphibious ? 1.05 : (sp.id === "strela" ? 1.75 : 1.15);
      const steerAuth = sp.amphibious ? 1.0 : Math.min(1.0, Math.abs(fwdSpd) / 5.0 + 0.32);
      b.yaw += steer * turnRate * steerAuth * dt * (fwdSpd >= -0.5 ? 1 : -1);

      const nFwdX = Math.sin(b.yaw), nFwdZ = Math.cos(b.yaw);
      if (Math.abs(throttle) > 0.01) {
        const accel = sp.accelMs2 * (boost ? 1.28 : 1.0);
        b.vx += nFwdX * throttle * accel * dt;
        b.vz += nFwdZ * throttle * accel * dt;
      }

      const drag = Math.exp(-dt * (sp.amphibious ? 0.65 : 0.92));
      b.vx *= drag; b.vz *= drag;
      const spd = Math.hypot(b.vx, b.vz);
      if (spd > maxMs) { b.vx *= maxMs / spd; b.vz *= maxMs / spd; }

      const nextX = b.gx + b.vx * dt;
      const nextZ = b.gz + b.vz * dt;
      const tiNext = this.world.getTerrainInfo(nextX, nextZ, false);

      if (sp.amphibious) {
        const maxSlopeH = seaL + 18.0;
        if (tiNext.height <= maxSlopeH) {
          b.gx = nextX; b.gz = nextZ;
        } else {
          b.vx *= -0.25; b.vz *= -0.25;
        }
        b.gy = Math.max(seaL, tiNext.height) + 0.35 + Math.sin(this.wavePhase + b.gx * 0.04) * 0.18;
      } else {
        if (tiNext.height < seaL + 0.35) {
          b.gx = nextX; b.gz = nextZ;
        } else {
          b.vx *= -0.15; b.vz *= -0.15;
        }
        b.gy = seaL + Math.sin(this.wavePhase + b.gx * 0.05) * (sp.id === "strela" ? 0.28 : 0.20);
      }

      const lim = KK.HALF_WORLD - 400;
      b.gx = Math.max(-lim, Math.min(lim, b.gx));
      b.gz = Math.max(-lim, Math.min(lim, b.gz));
      b.speedKmh = Math.hypot(b.vx, b.vz) * 3.6;

      this.world.toLocal(b.gx, b.gy, b.gz, b.mesh.position);
      const bowLift = Math.min(0.14, (b.speedKmh / 140) * 0.11);
      const wavePitch = Math.sin(this.wavePhase * 1.15 + b.gz * 0.03) * 0.035 - bowLift;
      const bankRoll = steer * Math.min(0.22, (b.speedKmh / 90) * 0.18) * (sp.id === "strela" ? 1.4 : 0.65);
      b.mesh.rotation.set(wavePitch, b.yaw, bankRoll);

      if (b.fans && b.fans.length > 0) {
        const fSpd = isPiloted ? (10 + Math.abs(throttle) * 24) : 2.5;
        for (const fn of b.fans) fn.rotation.z += dt * fSpd;
      }

      if (isPiloted && b.speedKmh > 12 && particles && Math.random() < 0.65) {
        particles.emitWaterSplash(b.gx - nFwdX * (sp.len * 0.42), b.gy + 0.25, b.gz - nFwdZ * (sp.len * 0.42), Math.min(1.8, b.speedKmh / 55));
      }

      if (b.mountedCar && vehicle) {
        const deckOffZ = sp.deckZ || 1.0;
        const deckY = b.gy + (sp.deckY || 2.0);
        vehicle.pos.set(b.gx + nFwdX * deckOffZ, deckY, b.gz + nFwdZ * deckOffZ);
        vehicle.vel.set(b.vx, 0, b.vz);
        vehicle.angVel.set(0, 0, 0);
        vehicle.quat.setFromEuler(new THREE.Euler(wavePitch, b.yaw, bankRoll, "YXZ"));
      }
    }
  }

  // v15.1.5 SYNC REMOTE PLAYERS' OCEAN BOATS & ZUBR HOVERCRAFT!
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
    const lf = Math.min(1, dt * 10);
    for (const [pid, rp] of remotePlayersMap.entries()) {
      const bData = rp.boat;
      if (!bData || !bData.id || !KK.BOATS[bData.id]) {
        this.removeRemoteBoat(pid);
        continue;
      }
      activeIds.add(pid);
      let rb = this.remoteBoats.get(pid);
      if (!rb || rb.id !== bData.id) {
        this.removeRemoteBoat(pid);
        const built = this._buildBoatMesh(bData.id);
        this.scene.add(built.grp);
        rb = { id: bData.id, mesh: built.grp, fans: built.fans, gx: bData.x, gy: bData.y, gz: bData.z, yaw: bData.yaw || 0 };
        this.remoteBoats.set(pid, rb);
      }
      rb.gx += (bData.x - rb.gx) * lf;
      rb.gy += (bData.y - rb.gy) * lf;
      rb.gz += (bData.z - rb.gz) * lf;
      let dy = (bData.yaw || 0) - rb.yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      rb.yaw += dy * lf;

      this.world.toLocal(rb.gx, rb.gy, rb.gz, rb.mesh.position);
      const wavePitch = Math.sin(this.wavePhase * 1.15 + rb.gz * 0.03) * 0.035;
      rb.mesh.rotation.set(wavePitch, rb.yaw, 0);
      if (rb.fans && rb.fans.length > 0) {
        const fSpd = 8 + Math.min(26, (bData.spd || 0) * 0.3);
        for (const fn of rb.fans) fn.rotation.z += dt * fSpd;
      }
      if ((bData.spd || 0) > 14 && particles && Math.random() < 0.45) {
        const len = (KK.BOATS[rb.id] && KK.BOATS[rb.id].len) || 12;
        particles.emitWaterSplash(rb.gx - Math.sin(rb.yaw) * len * 0.42, rb.gy + 0.25, rb.gz - Math.cos(rb.yaw) * len * 0.42, 1.1);
      }
    }
    for (const pid of Array.from(this.remoteBoats.keys())) {
      if (!activeIds.has(pid)) this.removeRemoteBoat(pid);
    }
  }
};
