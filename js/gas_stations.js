// ============================================================================
// js/gas_stations.js (v14.1B) — Operable & Explodable Town AZS Gas Stations!
//   • Pull beside any Town's yellow AZS canopy pumps & press [F] to refuel!
//   • Shoot any gas station -> MASSIVE fuel-air explosion & 60s LAN outage!
// ============================================================================
window.KK = window.KK || {};

KK.GasStationManager = class GasStationManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.stations = [];
    this._smokeCd = 0;

    const matScorch = new THREE.MeshBasicMaterial({ color: 0x161412, transparent: true, opacity: 0.78 });
    const matFire   = new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
    const matHalo   = new THREE.MeshBasicMaterial({ color: 0xffb703, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });

    for (const town of KK.TOWNS) {
      const gx = town.x - 34;
      const gz = town.z + 18;
      const gy = this.world.getTerrainInfo(gx, gz, false).height;

      const fxGrp = new THREE.Group();
      const scorch = new THREE.Mesh(new THREE.CircleGeometry(7.2, 16), matScorch);
      scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.14; fxGrp.add(scorch);
      const fire1 = new THREE.Mesh(new THREE.ConeGeometry(2.2, 5.2, 8), matFire);
      fire1.position.set(-2.2, 2.6, 0); fxGrp.add(fire1);
      const fire2 = new THREE.Mesh(new THREE.ConeGeometry(1.9, 4.6, 8), matHalo);
      fire2.position.set(2.2, 2.3, 0); fxGrp.add(fire2);
      const label = KK.VehicleBuilder ? KK.VehicleBuilder.createNameSprite("GAS STATION DESTROYED", "#ff3b5c") : null;
      if (label) { label.position.set(0, 6.2, 0); fxGrp.add(label); }

      fxGrp.visible = false;
      this.scene.add(fxGrp);
      this.stations.push({ townId: town.id, townName: town.name, gx, gy, gz, outageTimer: 0, fxGrp, fire1, fire2 });
    }
  }

  getNearbyStation(gx, gz, maxDist = 11.5) {
    for (const st of this.stations) {
      if (Math.hypot(st.gx - gx, st.gz - gz) < maxDist) return st;
    }
    return null;
  }

  applyOutageSnapshot(outageDict) {
    if (!outageDict || typeof outageDict !== "object") return;
    for (const [tidStr, rem] of Object.entries(outageDict)) {
      const tid = parseInt(tidStr, 10);
      const st = this.stations.find((s) => s.townId === tid);
      if (st && Number(rem) > 0) st.outageTimer = Math.max(st.outageTimer, Number(rem));
    }
  }

  checkProjectileHit(gx, gy, gz, blastRad = 5.5, game = null, fromNetwork = false) {
    for (const st of this.stations) {
      if (st.outageTimer > 0) continue;
      if (Math.hypot(st.gx - gx, st.gz - gz) < (6.2 + blastRad) && Math.abs(st.gy - gy) < 10.5) {
        this.detonateStation(st.townId, game, fromNetwork);
        return st;
      }
    }
    return null;
  }

  detonateStation(townId, game = null, fromNetwork = false) {
    const st = this.stations.find((s) => s.townId === Number(townId));
    if (!st) return;
    const alreadyDown = st.outageTimer > 55;
    st.outageTimer = 60.0;
    if (alreadyDown) return;

    if (game) {
      const d = Math.hypot(st.gx - game.vehicle.pos.x, st.gz - game.vehicle.pos.z);
      if (game.particles) {
        game.particles.emitCrashBurst(st.gx, st.gy + 2.5, st.gz, 3.2, "rock", game.weather.weather);
        game.particles.emitCrashBurst(st.gx, st.gy + 5.2, st.gz, 2.4, "sand", game.weather.weather);
      }
      if (d < 650 && game.audio && game.audio.playGasStationExplosion) {
        game.audio.playGasStationExplosion();
        game.cameraShake = Math.max(game.cameraShake, Math.max(0, 1.0 - d / 260) * 1.15);
      }
      if (d < 26.0 && !game.onFoot) {
        const ang = Math.atan2(game.vehicle.pos.x - st.gx, game.vehicle.pos.z - st.gz);
        const f = Math.max(0.25, 1.0 - d / 26.0);
        game.vehicle.applyExternalImpulse(Math.sin(ang) * 24 * f, 9.5 * f, Math.cos(ang) * 24 * f, (Math.random() - 0.5) * 4 * f);
        game.vehicle.vState.health.body = Math.max(10, game.vehicle.vState.health.body - Math.round(25 * f));
      }
      if (!fromNetwork && game.network) game.network.send({ type: "gas_explode", townId: st.townId });
      if (game.townNpcs) game.townNpcs.triggerTownPanic(st.gx, st.gz, 95);
    }
  }

  refuelAtStation(st, game) {
    if (!st || !game) return;
    if (st.outageTimer > 0) {
      game.ui.toast(`${st.townName} AZS Gas Station DESTROYED! Offline for ${Math.ceil(st.outageTimer)}s!`, true);
      return;
    }
    const vs = game.vehicle.vState, spec = game.vehicle.spec;
    const needed = Math.max(0, spec.fuelCapacity - vs.fuel);
    if (needed < 1.0) { game.ui.toast("Fuel tank is already FULL (100%)!"); return; }
    const cost = Math.max(15, Math.ceil(needed * 1.45));
    if (game.money < cost) { game.ui.toast(`Need $${cost} to fill ${Math.round(needed)}L at ${st.townName} AZS!`, true); return; }
    game.money -= cost;
    vs.fuel = spec.fuelCapacity;
    if (game.audio) game.audio.playCash();
    game._saveProgress();
    game.ui.toast(`Refueled +${Math.round(needed)}L at ${st.townName} AZS Gas Station (-$${cost})!`);
  }

  update(dt, vehicle, particles) {
    const px = vehicle.pos.x, pz = vehicle.pos.z;
    this._smokeCd -= dt;
    const doSmoke = this._smokeCd <= 0;
    if (doSmoke) this._smokeCd = 0.24;

    for (const st of this.stations) {
      if (st.outageTimer > 0) {
        st.outageTimer = Math.max(0, st.outageTimer - dt);
        const d = Math.hypot(st.gx - px, st.gz - pz);
        st.fxGrp.visible = d < 420;
        if (st.fxGrp.visible) {
          st.gy = this.world.getTerrainInfo(st.gx, st.gz, false).height;
          this.world.toLocal(st.gx, st.gy, st.gz, st.fxGrp.position);
          const fl = 0.78 + Math.sin(performance.now() * 0.025 + st.townId) * 0.28;
          st.fire1.scale.set(fl, fl * 1.15, fl);
          st.fire2.scale.set(1.15 - fl * 0.25, fl, 1.15 - fl * 0.25);
          if (doSmoke && particles && d < 320) {
            particles.emitBarrelSmoke(st.gx + (Math.random() - 0.5) * 4, st.gy + 3.2, st.gz + (Math.random() - 0.5) * 2, 0, 1.4, 0, 1.3);
          }
        }
      } else {
        st.fxGrp.visible = false;
      }
    }
  }
};
