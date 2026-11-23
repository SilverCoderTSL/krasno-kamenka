// ============================================================================
// js/physics.js (v5) — Deep CPM2 Multi-Part Wear, Branded Perf, Dirt & Backfire
// ============================================================================
window.KK = window.KK || {};

KK.VehiclePhysics = class VehiclePhysics {
  constructor(vehicleState, startX = 0, startY = 6, startZ = 0) {
    KK.ensurePartsInitialized(vehicleState);
    this.vState = vehicleState;
    this.spec = KK.VEHICLES[vehicleState.vehicleId];
    this.pos = new THREE.Vector3(startX, startY, startZ);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.quat = new THREE.Quaternion();
    this.angVel = new THREE.Vector3(0, 0, 0);

    const eng = KK.ENGINES[vehicleState.engineId] || KK.ENGINES.umz_24;
    this.gear = 1;
    this.autoShift = true;
    this.driveMode = this.spec.defaultDriveMode || "4H";
    this.rearLock = false;
    this.frontLock = false;
    this.rpm = eng.idleRpm;
    this.boostPsi = 0;
    this.coolantTemp = 82;
    this.egtTemp = 340;
    this.ignitionOn = true;
    this.engineRunning = true;
    this.treeHitCooldown = 0;
    this.carHitCooldown = 0;
    this.hydrolocked = false;
    this.steerAngle = 0;
    this.smoothThrottle = 0;
    this.prevRawThrottle = 0;
    this.backfireTimer = 0;
    this.misfireTimer = 0;
    this.lastImpactFx = 0;

    this.headlights = false; this.lightbar = false; this.hazards = false;
    this.hoodOpen = false; this.braking = false; this.reversing = false; this.hornActive = false;
    this.parkingBrake = false;

    this.cargoCount = 0; this.cargoType = "standard"; this.cargoStrapped = true;
    this.cargoIntegrity = 100; this.cargoTilt = 0; this.lastGForce = 0; this.peakGForce = 0;

    this.winch = { active: false, anchorPos: null, targetPeerId: null, localAttach: new THREE.Vector3(0, 0.6, 2.0), attachLabel: "FRONT", length: 30, reeling: 0 };

    this.wheels = this.spec.wheels.map((wDef) => ({
      def: wDef, compression: 0, prevCompression: 0, visualOffsetY: -this.spec.restLength * 0.4,
      spinAngle: 0, grounded: false, surface: "gravel", waterDepth: 0, mudDepth: 0,
      worldContact: new THREE.Vector3()
    }));

    this.speedKmh = 0; this.onBridgeId = null; this.inWaterDepth = 0; this.events = [];
    this.distanceMetersFrame = 0;
  }

  swapVehicleState(newVState, preservePosition = true) {
    KK.ensurePartsInitialized(newVState);
    const oldPos = this.pos.clone(), oldQuat = this.quat.clone();
    this.vState = newVState;
    this.spec = KK.VEHICLES[newVState.vehicleId];
    const eng = KK.ENGINES[newVState.engineId] || KK.ENGINES.umz_24;

    this.wheels = this.spec.wheels.map((wDef) => ({
      def: wDef, compression: 0, prevCompression: 0, visualOffsetY: -this.spec.restLength * 0.4,
      spinAngle: 0, grounded: false, surface: "gravel", waterDepth: 0, mudDepth: 0,
      worldContact: new THREE.Vector3()
    }));
    if (preservePosition) {
      this.pos.copy(oldPos); this.pos.y += 1.0; this.quat.copy(oldQuat);
    }
    this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0);
    this.gear = 1; this.driveMode = this.spec.defaultDriveMode || "4H";
    this.rearLock = false; this.frontLock = false;
    this.rpm = eng.idleRpm; this.boostPsi = 0; this.smoothThrottle = 0;
    this.hydrolocked = false;
    this.engineRunning = newVState.parts.headGasket.hp > 4 && newVState.fuel > 0.05;
    this.coolantTemp = 82; this.egtTemp = 340; this.steerAngle = 0;
    if (this.cargoCount > this.spec.cargoSlots) this.cargoCount = this.spec.cargoSlots;
  }

  getTotalMassKg() {
    const cDef = KK.CARGO_TYPES[this.cargoType] || KK.CARGO_TYPES.standard;
    return this.spec.massKg + this.cargoCount * cDef.massPerUnitKg;
  }

  emit(kind, data) { this.events.push({ kind, data }); }
  consumeEvents() { const out = this.events; this.events = []; return out; }

  flipUpright(world) {
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat);
    const yaw = Math.atan2(fwd.x, fwd.z);
    this.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const tInfo = world.getTerrainInfo(this.pos.x, this.pos.z, true);
    this.pos.y = Math.max(this.pos.y, tInfo.height + 1.4);
    this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0);
    this.emit("toast", "Vehicle righted with recovery jack!");
  }

  applyExternalImpulse(dvx, dvy, dvz, spinYaw = 0) {
    this.vel.x += dvx;
    this.vel.y += dvy;
    this.vel.z += dvz;
    this.angVel.y += spinYaw;
    this.angVel.z += (Math.random() - 0.5) * 1.4;
  }

  // v13.995 HF: True Gun-Direction-Dependent Suspension Recoil!
  // Decomposes recoil into vehicle local space so:
  //   • Firing FORWARD (+Z) pitches nose UP & compresses REAR torsion bars
  //   • Firing REARWARD (-Z) pitches rear UP & compresses FRONT torsion bars
  //   • Firing LEFT  rolls tank RIGHT so RIGHT suspension squishes deep!
  //   • Firing RIGHT rolls tank LEFT  so LEFT  suspension squishes deep!
  applyRecoilTorque(gunDirWorld, linearKick = 2.1, pitchKick = 1.25, rollKick = 2.35) {
    const recoilWorld = gunDirWorld.clone().normalize().negate();
    // 1. Linear pushback strictly along the recoil line (horizontal component so hull doesn't uniformly squat!)
    this.vel.x += recoilWorld.x * linearKick;
    this.vel.z += recoilWorld.z * linearKick;

    // 2. Transform recoil into vehicle local frame to compute exact directional pitch & roll torque!
    const invQ = this.quat.clone().invert();
    const recLocal = recoilWorld.clone().applyQuaternion(invQ);
    // Right-hand rule with lever = (0, +1, 0): lever x (rx, ry, rz) = (rz, 0, -rx)
    //   • Fire forward (+Z -> rz = -1): localAng.x = -pitchKick -> nose lifts (+Y), rear squishes (-Y)!
    //   • Fire to +X side (rx = -1):    localAng.z = +rollKick  -> +X lifts (+Y), -X squishes (-Y)!
    const localAngKick = new THREE.Vector3(
      recLocal.z * pitchKick,
      0,
      -recLocal.x * rollKick
    );
    localAngKick.applyQuaternion(this.quat);
    this.angVel.add(localAngKick);
  }

  _wearPart(partId, baseAmount) {
    const p = this.vState.parts[partId];
    if (!p) return;
    const mult = KK.getPartWearMult(this.vState, partId);
    const prev = p.hp;
    p.hp = Math.max(0, p.hp - baseAmount * mult);
    if (prev >= 20 && p.hp < 20) {
      const def = KK.PARTS_CATALOG[partId];
      this.emit("toast", `WARNING: ${def ? def.name : partId} is critically worn (<20%)!`);
    }
  }

  // Per-wheel tire wear & realistic blowout trigger!
  _damageTire(wheelIdx, amount, reason = "impact") {
    if (this.spec.isTracked) return; // Heavy forged steel T-72B tracks cannot pop like rubber tires!
    const vs = this.vState;
    if (!vs.tiresHP || !vs.blownTires || wheelIdx < 0 || wheelIdx >= vs.tiresHP.length) return;
    if (vs.blownTires[wheelIdx]) return;
    const tComp = KK.TIRE_COMPOUNDS[vs.tireCompound] || KK.TIRE_COMPOUNDS.all_terrain;
    const tBrnd = KK.TIRE_BRANDS[vs.tireBrand] || KK.TIRE_BRANDS.volgaworks;
    const resist = Math.min(0.84, (tComp.punctureResist || 0) * 0.45 + (tBrnd.punctureResist || 0) * 0.65 + (vs.upgrades.mudTires ? 0.18 : 0));
    const mudTough = Math.max(0.16, 1.0 - resist);
    vs.tiresHP[wheelIdx] = Math.max(0, vs.tiresHP[wheelIdx] - amount * mudTough);
    // Recompute average tire health for legacy gauges
    let sumT = 0;
    for (let k = 0; k < vs.tiresHP.length; k++) sumT += vs.tiresHP[k];
    vs.health.tires = sumT / vs.tiresHP.length;

    if (vs.tiresHP[wheelIdx] <= 0) {
      vs.blownTires[wheelIdx] = true;
      const wDef = this.spec.wheels[wheelIdx];
      const lbl = wDef ? wDef.id : ("W" + wheelIdx);
      this.emit("tire_blowout", { wheelIdx, label: lbl, reason });
    }
  }

  damageHeadlights(amount, sideHint = 0) {
    const h = this.vState.health;
    const bull = this.vState.upgrades.bullbar ? 0.35 : 1.0;
    const dmg = amount * bull;
    const applySide = (key, mult) => {
      const prev = h[key] !== undefined ? h[key] : 100;
      const next = Math.max(0, prev - dmg * mult);
      h[key] = next;
      if (prev > 2 && next <= 2) this.emit("glass_shatter", { side: key });
    };
    if (sideHint < -0.15) applySide("headlightL", 1.25);
    else if (sideHint > 0.15) applySide("headlightR", 1.25);
    else { applySide("headlightL", 0.85); applySide("headlightR", 0.85); }
    if (amount > 16) applySide("lightbar", 0.55);
  }

  damageRoofLight(amount) {
    const h = this.vState.health;
    const prev = h.lightbar !== undefined ? h.lightbar : 100;
    const next = Math.max(0, prev - amount);
    h.lightbar = next;
    if (prev > 2 && next <= 2) this.emit("glass_shatter", { side: "lightbar" });
  }

  damageTaillights(amount, sideHint = 0) {
    const h = this.vState.health;
    const applySide = (key, mult) => {
      const prev = h[key] !== undefined ? h[key] : 100;
      const next = Math.max(0, prev - amount * mult);
      h[key] = next;
      if (prev > 2 && next <= 2) this.emit("glass_shatter", { side: key });
    };
    if (sideHint < -0.15) applySide("taillightL", 1.25);
    else if (sideHint > 0.15) applySide("taillightR", 1.25);
    else { applySide("taillightL", 0.9); applySide("taillightR", 0.9); }
  }

  step(dt, input, world, weatherGrip, remotePlayersMap, weatherName, cryptidMods) {
    const clampedDt = Math.min(0.04, dt);
    this.distanceMetersFrame = 0;
    if (this.backfireTimer > 0) this.backfireTimer = Math.max(0, this.backfireTimer - clampedDt);
    if (this.misfireTimer > 0) this.misfireTimer = Math.max(0, this.misfireTimer - clampedDt);
    if (this.lastImpactFx > 0) this.lastImpactFx = Math.max(0, this.lastImpactFx - clampedDt);
    const sdt = clampedDt / 2;
    if (this.treeHitCooldown > 0) this.treeHitCooldown = Math.max(0, this.treeHitCooldown - clampedDt);
    if (this.carHitCooldown > 0) this.carHitCooldown = Math.max(0, this.carHitCooldown - clampedDt);
    const cMods = cryptidMods || { ice: 0, quicksand: 0 };
    for (let s = 0; s < 2; s++) this._substep(sdt, input, world, weatherGrip, remotePlayersMap, weatherName || "clear", cMods);
  }

  _substep(dt, input, world, weatherGrip, remotePlayersMap, weatherName, cMods) {
    const spec = this.spec, vs = this.vState, tun = vs.tuning, hlth = vs.health, upg = vs.upgrades, parts = vs.parts;
    const eng = KK.ENGINES[vs.engineId] || KK.ENGINES.umz_24;
    const mass = this.getTotalMassKg();

    const cogBoost = 1.0 + (tun.rideHeight * 1.4) + (this.cargoCount * 0.05);
    const Ix = mass * (spec.bodyLen * spec.bodyLen + spec.bodyHeight * spec.bodyHeight) * 0.14;
    const Iy = mass * (spec.bodyLen * spec.bodyLen + spec.bodyWidth * spec.bodyWidth) * 0.15;
    const Iz = mass * (spec.bodyWidth * spec.bodyWidth + spec.bodyHeight * spec.bodyHeight) * (0.14 / cogBoost);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat);

    const fwdSpeed = this.vel.dot(forward), latSpeed = this.vel.dot(right);
    this.speedKmh = Math.abs(fwdSpeed) * 3.6;

    const maxSteerRad = (spec.maxSteerDeg * Math.PI) / 180;
    const absSpd = Math.abs(fwdSpeed);
    const speedSteerFactor = 1.0 / (1.0 + absSpd * (spec.agileSteer ? 0.024 : 0.034) + absSpd * absSpd * (spec.agileSteer ? 0.00145 : 0.00110));
    let flatPull = 0;
    if (vs.blownTires) {
      for (let wi = 0; wi < this.wheels.length; wi++) {
        if (vs.blownTires[wi]) flatPull += (this.wheels[wi].def.x < 0 ? 0.095 : -0.095) * (this.wheels[wi].def.steer ? 1.0 : 0.45);
      }
    }
    const targetSteer = input.steer * maxSteerRad * speedSteerFactor + hlth.tieRodBias + flatPull;
    this.steerAngle += (targetSteer - this.steerAngle) * Math.min(1, dt * (spec.agileSteer ? 11.8 : 8.5));
    this.steerAngle = Math.max(-maxSteerRad * 1.1, Math.min(maxSteerRad * 1.1, this.steerAngle));

    const hasFuel = vs.fuel > 0.05;
    const coreAlive = !vs.burnedOut && parts.headGasket.hp > 4 && parts.crankshaft.hp > 4 && parts.pistons.hp > 4 && !this.hydrolocked && hasFuel;
    if (!this.ignitionOn) {
      this.engineRunning = false;
    } else if (!coreAlive && this.engineRunning) {
      this.engineRunning = false;
      if (!hasFuel) this.emit("toast", "OUT OF FUEL!");
    } else if (coreAlive && this.ignitionOn && !this.engineRunning) {
      this.engineRunning = true;
    }

    let rawThrottle = 0, brake = 0;
    const handbrake = !!input.handbrake || !!this.parkingBrake;
    if (this.autoShift) {
      if (input.throttle > 0.05) {
        if (fwdSpeed < -0.6) brake = input.throttle;
        else { if (this.gear <= 0) this.gear = 1; rawThrottle = input.throttle; }
      } else if (input.brake > 0.05) {
        if (fwdSpeed > 0.8) brake = input.brake;
        else { this.gear = -1; rawThrottle = input.brake; }
      }
    } else {
      rawThrottle = Math.max(0, input.throttle); brake = Math.max(0, input.brake);
    }

    // Flywheel brand & health control rev responsiveness!
    const flywheelPerf = KK.getPartPerf(vs, "flywheel");
    const resp = (eng.throttleResp || 7.0) * (0.65 + 0.45 * flywheelPerf);
    this.smoothThrottle += (rawThrottle - this.smoothThrottle) * Math.min(1, dt * resp);
    let throttle = this.smoothThrottle;

    // Anti-Lag / Exhaust Backfire Pops on lift-off at high RPM (WRX, Evo, 2JZ, or tuned Turbo!)
    if (this.engineRunning && this.prevRawThrottle > 0.65 && rawThrottle < 0.1 && this.rpm > eng.redlineRpm * 0.58) {
      const exhaustGood = KK.getPartPerf(vs, "exhaustManifold") > 1.05;
      if (eng.antiLag || (upg.turboKit && this.boostPsi > 11 && exhaustGood)) {
        this.backfireTimer = 0.24;
        const tailPos = new THREE.Vector3(spec.bodyWidth * 0.26, 0.24, -spec.bodyLen * 0.52).applyQuaternion(this.quat).add(this.pos);
        this.emit("backfire", { pos: tailPos, backDir: forward.clone().negate() });
      }
    }
    this.prevRawThrottle = rawThrottle;
    this.throttle = throttle;

    // Worn Spark Plugs or Injectors cause realistic brief misfire sputters under load!
    if (this.engineRunning && throttle > 0.5 && (parts.sparkPlugs.hp < 35 || parts.fuelInjectors.hp < 35)) {
      if (this.misfireTimer <= 0 && Math.random() < dt * 1.4) {
        this.misfireTimer = 0.22;
      }
    }
    if (this.misfireTimer > 0) throttle *= 0.25;

    this.braking = brake > 0.1 || handbrake;
    this.reversing = this.gear === -1;

    const gears = tun.gears;
    const gearRatio = this.gear === -1
      ? (spec.isSchreckensfurst ? -2.45 : -(gears[0] * 0.92))
      : (this.gear === 0 ? 0 : (gears[Math.min(gears.length - 1, this.gear - 1)] || 1.0));
    const lowRangeMult = (this.driveMode === "4L") ? 2.55 : 1.0;
    const totalRatio = Math.abs(gearRatio) * tun.finalDrive * lowRangeMult;
    const wheelRad = spec.wheelRadius + (upg.mudTires ? 0.06 : 0);

    const outProbe = KK.computeEngineOutput(vs, this.rpm, throttle, this.boostPsi);
    const effRedline = outProbe.redline;

    // Clutch slip based on clutchPack health!
    const clutchSlip = 1.0 + (100 - parts.clutchPack.hp) * 0.0055;
    const wheelRpm = (Math.abs(fwdSpeed) / (2 * Math.PI * wheelRad)) * 60;
    let targetRpm = 0;
    if (this.engineRunning) {
      if (this.gear === 0) targetRpm = eng.idleRpm + throttle * (effRedline - eng.idleRpm) * 0.92;
      else targetRpm = Math.max(eng.idleRpm + throttle * 850, wheelRpm * totalRatio * clutchSlip);
      targetRpm = Math.min(effRedline * 1.025, targetRpm);
    }
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * (7.5 + flywheelPerf * 4.0));

    if (this.autoShift && this.gear > 0 && this.engineRunning) {
      if (this.rpm > effRedline * 0.91 && this.gear < gears.length && throttle > 0.2) this.gear++;
      else if (this.rpm < eng.idleRpm + (effRedline - eng.idleRpm) * 0.26 && this.gear > 1) this.gear--;
    }

    // Turbo boost governed by Intercooler & Exhaust Manifold health!
    const icEff = Math.max(0.45, Math.min(1.25, KK.getPartPerf(vs, "intercooler")));
    const exhEff = Math.max(0.45, Math.min(1.25, KK.getPartPerf(vs, "exhaustManifold")));
    const hasTurbo = !!(upg.turboKit || upg.twinTurboKit);
    const maxBoost = (hasTurbo ? Math.max(0, tun.boostPsi) : (eng.stockTurbo ? Math.min(eng.stockBoostPsi || 14, tun.boostPsi) : 0)) * Math.min(1.12, (icEff + exhEff) * 0.5);
    const spoolFactor = Math.max(0, (this.rpm - eng.idleRpm * 1.30) / (effRedline * 0.40));
    const targetBoost = (this.engineRunning && throttle > 0.1) ? maxBoost * Math.min(1, spoolFactor) * throttle : 0;
    this.boostPsi += (targetBoost - this.boostPsi) * Math.min(1, dt * (targetBoost > this.boostPsi ? (2.6 + exhEff * 1.4) : 9.0));

    const out = this.engineRunning
      ? KK.computeEngineOutput(vs, this.rpm, throttle, this.boostPsi)
      : { torqueNm: 0, hp: 0, limiter: false };

    // Realistic Cooling, Balanced EGT & Gradual Multi-Part Wear (v13.995 Rebalance!)
    if (this.engineRunning) {
      const stockB = eng.stockTurbo ? (eng.stockBoostPsi || 12) : 0;
      const overBoost = Math.max(0, this.boostPsi - stockB);
      const rpmFrac = this.rpm / effRedline;
      const baseLoad = throttle * (0.30 + 0.70 * rpmFrac);
      const load = baseLoad * (1.0 + overBoost * 0.018);

      const radPerf = KK.getPartPerf(vs, "radiator");
      const pumpPerf = KK.getPartPerf(vs, "waterPump");
      const radEff = (radPerf * 0.6 + pumpPerf * 0.4) * (1.0 - hlth.mudClog * 0.0040);
      const fanAirflow = this.coolantTemp > 92 ? 1.28 : 0.72;
      const airflow = Math.max(fanAirflow, 0.78 + Math.min(1.45, this.speedKmh / 36));
      const heatIn = (0.35 + load * 4.4) * eng.heatRate;
      const heatOut = Math.max(0, this.coolantTemp - 76) * 0.34 * radEff * airflow;
      const targetFloor = this.coolantTemp < 80 ? (82 - this.coolantTemp) * 0.14 : 0;
      this.coolantTemp = Math.max(32, Math.min(130, this.coolantTemp + (heatIn - heatOut + targetFloor) * dt));

      // Balanced EGT: normal WOT stays ~570-760°C; only exceeds 940°C with extreme boost + damaged intercooler!
      const targetEgt = 255 + baseLoad * 315 + (overBoost * 7.8) / Math.max(0.72, icEff);
      this.egtTemp += (targetEgt - this.egtTemp) * Math.min(1, dt * 1.15);

      const driveWear = (0.0055 + load * 0.022) * dt;
      this._wearPart("sparkPlugs", driveWear * 1.15);
      this._wearPart("fuelInjectors", driveWear * 0.75);
      this._wearPart("fuelRails", driveWear * 0.40);
      this._wearPart("waterPump", driveWear * 0.60);
      this._wearPart("camshaft", driveWear * (0.45 + (rpmFrac > 0.88 ? 0.75 : 0)));
      this._wearPart("crankshaft", driveWear * (0.35 + (rpmFrac > 0.92 ? 0.90 : 0)));
      this._wearPart("pistons", driveWear * (0.40 + overBoost * 0.045));
      this._wearPart("exhaustManifold", driveWear * (0.45 + overBoost * 0.055));
      this._wearPart("intercooler", driveWear * (0.30 + overBoost * 0.035));
      this._wearPart("flywheel", driveWear * 0.45);
      this._wearPart("gearboxGears", driveWear * 0.55);
      this._wearPart("transferCase", driveWear * (this.driveMode === "4L" ? 0.95 : 0.48));
      this._wearPart("driveshaft", driveWear * 0.50);
      this._wearPart("wheelHubs", (this.speedKmh / 85) * 0.012 * dt);

      if (this.coolantTemp > 122) {
        this._wearPart("headGasket", (this.coolantTemp - 121) * 0.040 * dt);
        this._wearPart("pistons", (this.coolantTemp - 121) * 0.025 * dt);
      }
      if (this.egtTemp > 940) {
        this._wearPart("headGasket", (this.egtTemp - 935) * 0.008 * dt);
        this._wearPart("exhaustManifold", (this.egtTemp - 935) * 0.012 * dt);
      }
      if (throttle > 0.85 && this.speedKmh < 5 && this.gear > 0) {
        this._wearPart("clutchPack", 0.16 * dt);
      }
      if (brake > 0.3 && this.speedKmh > 12) {
        this._wearPart("brakeSystem", brake * (this.speedKmh / 55) * 0.075 * dt);
      }

      const fuelEff = Math.max(0.75, Math.min(1.25, KK.getPartPerf(vs, "fuelInjectors")));
      vs.fuel = Math.max(0, vs.fuel - ((0.0014 + load * 0.0082 + overBoost * 0.00028) * (spec.massKg / 2000) / fuelEff) * dt);
    } else {
      // Cools down gradually toward ambient (32°C) when ignition is OFF — dims engine thermal signature in FLIR!
      this.coolantTemp += (32 - this.coolantTemp) * dt * 0.12;
      this.egtTemp += (45 - this.egtTemp) * dt * 0.32;
    }

    const totalForce = new THREE.Vector3(0, -9.81 * mass, 0);
    const totalTorque = new THREE.Vector3(0, 0, 0);

    if (this.cargoCount > 0 && !this.cargoStrapped) {
      this.cargoTilt += (Math.max(-0.45, Math.min(0.45, -latSpeed * 0.055)) - this.cargoTilt) * Math.min(1, dt * 6);
    } else { this.cargoTilt *= 0.85; }

    const is4WD = (this.driveMode === "4H" || this.driveMode === "4L" || spec.driveType === "6WD_FULL" || spec.driveType === "8WD_FULL" || spec.driveType === "AWD_FULL");
    let drivenCount = 0;
    for (const w of this.wheels) { if (is4WD || w.def.axle !== "front") drivenCount++; }
    const driveSign = this.gear === -1 ? -1 : 1;

    // Transmission & Drivetrain mechanical efficiency from installed Gearbox/TransferCase/Driveshaft/Clutch!
    const transEff = (
      KK.getPartPerf(vs, "clutchPack") * 0.30 +
      KK.getPartPerf(vs, "gearboxGears") * 0.30 +
      KK.getPartPerf(vs, "transferCase") * 0.20 +
      KK.getPartPerf(vs, "driveshaft") * 0.20
    );
    const rawWheelTorqueTotal = out.torqueNm * totalRatio * (0.95 + 0.28 * transEff);

    const liftHeight = Math.max(-0.08, Math.min(upg.hdSuspension ? 0.28 : 0.16, tun.rideHeight));
    const effectiveRest = spec.restLength + liftHeight;
    const effectiveMaxTravel = spec.maxTravel + Math.max(0, liftHeight * 0.65);

    const springPartMult = KK.getPartPerf(vs, "coilSprings");
    const arbPartMult = KK.getPartPerf(vs, "antiRollBar");
    const hubPartMult = KK.getPartPerf(vs, "wheelHubs");
    const brakePartMult = KK.getPartPerf(vs, "brakeSystem");
    const shockPartIds = ["shockFL", "shockFR", "shockFL", "shockFR", "shockRL", "shockRR", "shockRL", "shockRR"];

    let maxWater = 0, topWaterY = -9999, maxPotholeImpact = 0, groundedWheels = 0;
    let onDirtySurface = false;
    let dominantSurface = "gravel";
    this.onBridgeId = null;

    const wheelForcesY = new Float32Array(this.wheels.length);
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      w.prevCompression = w.compression;
      const localMount = new THREE.Vector3(w.def.x, w.def.y, w.def.z);
      const worldMount = localMount.clone().applyQuaternion(this.quat).add(this.pos);
      const tInfo = world.getTerrainInfo(worldMount.x, worldMount.z, true, worldMount.y);
      w.surface = tInfo.surface; w.waterDepth = tInfo.waterDepth; w.mudDepth = tInfo.mudDepth;
      dominantSurface = tInfo.surface;
      if (tInfo.waterDepth > maxWater) { maxWater = tInfo.waterDepth; topWaterY = Math.max(topWaterY, tInfo.waterSurfaceY); }
      if (tInfo.surface === "mud" || tInfo.surface === "gravel" || tInfo.surface === "shale") onDirtySurface = true;

      if ((tInfo.mudDepth > 0.15 || tInfo.waterDepth > 0.25) && this.speedKmh > 6) {
        hlth.mudClog = Math.min(100, hlth.mudClog + (1.4 / Math.max(0.7, KK.getPartPerf(vs, "radiator"))) * dt);
      }
      if (tInfo.onBridge && tInfo.bridgeHit) {
        this.onBridgeId = tInfo.bridgeHit.bridge.id;
        if (world.stressBridgePlank(tInfo.bridgeHit.bridge.id, tInfo.bridgeHit.plankIdx, mass, Math.abs(fwdSpeed), dt)) {
          this.emit("plank_break", { bridgeId: tInfo.bridgeHit.bridge.id, plankIdx: tInfo.bridgeHit.plankIdx, bridgeName: tInfo.bridgeHit.bridge.name });
        }
      }

      const isBlown = !!(vs.blownTires && vs.blownTires[i]);
      const baseWRad = wheelRad * (w.def.radiusScale || 1.0);
      const effWheelRad = isBlown ? Math.max(0.20, baseWRad - 0.14) : baseWRad;
      const distToGround = worldMount.y - tInfo.height;
      const fullDrop = effectiveRest + effWheelRad;
      if (distToGround < fullDrop) {
        w.grounded = true; groundedWheels++;
        const rawComp = fullDrop - distToGround;
        w.compression = Math.min(effectiveMaxTravel + 0.18, rawComp);
        const compVel = (w.compression - w.prevCompression) / dt;
        w.visualOffsetY = -(effectiveRest - Math.min(effectiveMaxTravel, w.compression));
        w.worldContact.set(worldMount.x, tInfo.height, worldMount.z);

        const sId = shockPartIds[i] || "shockRL";
        const shockPerf = KK.getPartPerf(vs, sId);
        const kSpring = spec.baseSpringK * tun.springStiffness * (0.70 + 0.30 * springPartMult);
        const cDamper = spec.baseDamperC * tun.damperRebound * (0.28 + 0.72 * shockPerf);
        let fNormal = kSpring * w.compression + cDamper * compVel;

        if (rawComp > effectiveMaxTravel) {
          const excess = rawComp - effectiveMaxTravel;
          fNormal += kSpring * 3.8 * excess + Math.max(0, compVel) * cDamper * 1.5;
          const impactSeverity = (tInfo.potholeDepth * 2.5 + Math.max(0, compVel - 1.8) * 0.40) * (this.speedKmh / 42);
          if (impactSeverity > 0.42) {
            maxPotholeImpact = Math.max(maxPotholeImpact, impactSeverity);
            const dmg = Math.min(16, impactSeverity * 5.2);
            this._wearPart(sId, dmg);
            this._wearPart("coilSprings", dmg * 0.25);
            // Pothole pinch-flats (<16 PSI at speed) or overinflated blowouts (>38 PSI)!
            const wPsi = w.def.axle === "front" ? tun.frontPsi : tun.rearPsi;
            const psiRisk = (wPsi < 16 && this.speedKmh > 48) ? 2.1 : ((wPsi > 38 && this.speedKmh > 55) ? 1.85 : 1.0);
            if (impactSeverity > 0.62 && this.speedKmh > 42) {
              this._damageTire(i, impactSeverity * 12.5 * psiRisk, "pothole");
            }

            // Tie-rod bending ONLY on genuinely brutal high-speed slams (>55 km/h!) so it's realistic, not spammy!
            if (w.def.steer && this.speedKmh > 55 && impactSeverity > 0.92) {
              this._wearPart("tieRods", dmg * 0.9);
              const bendChance = 0.22 * KK.getPartWearMult(vs, "tieRods");
              if (Math.random() < bendChance) {
                const bendDir = (i === 0 ? -1 : 1) * (0.03 + Math.random() * 0.045);
                hlth.tieRodBias = Math.max(-0.18, Math.min(0.18, hlth.tieRodBias + bendDir));
                
              }
            }
          }
        }
        wheelForcesY[i] = Math.max(0, fNormal);
      } else {
        w.grounded = false; w.compression = 0;
        w.visualOffsetY += (-effectiveRest - w.visualOffsetY) * Math.min(1, dt * 14);
        wheelForcesY[i] = 0;
      }
    }

    // Dynamic Body & Tire Dirt Accumulation + Dusty Air Filter Wear + River Rinse!
    if (this.speedKmh > 4) {
      if (maxWater > 0.28) {
        // Driving through rivers washes mud off the body!
        vs.dirtLevel = Math.max(0.08, vs.dirtLevel - 0.085 * dt);
      } else if (onDirtySurface || weatherName === "rain" || weatherName === "storm") {
        const dirtRate = (dominantSurface === "mud" ? 0.055 : 0.016) * (weatherName === "rain" || weatherName === "storm" ? 1.8 : 1.0) * (this.speedKmh / 40);
        vs.dirtLevel = Math.min(1.0, vs.dirtLevel + dirtRate * dt);
        if (dominantSurface === "gravel" || dominantSurface === "shale") {
          this._wearPart("airFilter", 0.028 * (this.speedKmh / 50) * dt);
        }
      }
    }

    for (let i = 0; i < this.wheels.length; i += 2) {
      const wL = this.wheels[i], wR = this.wheels[i + 1];
      if (!wL || !wR) continue;
      const arbForce = (wL.compression - wR.compression) * spec.baseAntiRoll * tun.antiRoll * (0.65 + 0.35 * arbPartMult);
      if (wL.grounded) wheelForcesY[i] = Math.max(0, wheelForcesY[i] + arbForce);
      if (wR.grounded) wheelForcesY[i + 1] = Math.max(0, wheelForcesY[i + 1] - arbForce);
    }

    const groundedDriveCount = this.wheels.reduce((acc, ww, idx) => acc + ((ww.grounded && wheelForcesY[idx] > 0) ? 1 : 0), 0);
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i], fN = wheelForcesY[i];
      if (!w.grounded || fN <= 0) { w.spinAngle += (fwdSpeed / wheelRad) * dt; continue; }

      const localMount = new THREE.Vector3(w.def.x, w.def.y + w.visualOffsetY, w.def.z);
      const rWorld = localMount.clone().applyQuaternion(this.quat);
      const patchVel = this.vel.clone().add(new THREE.Vector3().crossVectors(this.angVel, rWorld));

      const sideSign = w.def.x < 0 ? -1 : 1;
      const stScale = w.def.steerScale !== undefined ? w.def.steerScale : 1.0;
      const wSteer = (w.def.steer ? this.steerAngle * stScale : 0) + sideSign * ((tun.toeDeg * Math.PI) / 180) * (w.def.steer ? 1 : 0.25);
      const cosS = Math.cos(wSteer), sinS = Math.sin(wSteer);
      const wFwd = forward.clone().multiplyScalar(cosS).add(right.clone().multiplyScalar(sinS)).normalize();
      const wRight = right.clone().multiplyScalar(cosS).sub(forward.clone().multiplyScalar(sinS)).normalize();

      const vLong = patchVel.dot(wFwd), vLat = patchVel.dot(wRight);
      const psi = w.def.axle === "front" ? tun.frontPsi : tun.rearPsi;
      let mu = 0.78, rollingDrag = (0.018 / Math.max(0.6, hubPartMult)) + Math.max(0, (28 - psi) * 0.0014);

      if (w.surface === "race_tarmac" || w.surface === "tarmac_line") {
        mu = 1.28 * (psi < 18 ? 0.88 : 1.0); // Glassy high-grip proving grounds tarmac!
        rollingDrag = 0.009;
      } else if (w.surface === "kerb") {
        mu = 1.12;
      } else if (w.surface === "bad_road") {
        mu = 0.44 + Math.max(0, (30 - psi) / 22) * 0.25 + (upg.mudTires ? 0.24 : 0);
        rollingDrag += 0.26;
      } else if (w.surface === "asphalt") mu = 1.08 * (psi < 18 ? 0.85 : 1.0);
      else if (w.surface === "wood") mu = 0.90;
      else if (w.surface === "gravel") mu = 0.86;
      else if (w.surface === "shale") mu = 0.68;
      else if (w.surface === "volcanic") {
        mu = 0.72 + Math.max(0, (32 - psi) / 22) * 0.22 + (upg.mudTires ? 0.14 : 0);
        rollingDrag += 0.05;
      } else if (w.surface === "sand") {
        mu = 0.62 + Math.max(0, (32 - psi) / 22) * 0.28 + (upg.mudTires ? 0.16 : 0);
        rollingDrag += 0.08 + (cMods ? cMods.quicksand * 0.45 : 0);
      } else if (w.surface === "mud") {
        // LETHAL MUD BOGS: High-PSI street tires & open diffs bog down hard!
        // Air down to 12 PSI, lock diffs [2]/[3], use 4L [V], Mud-Tires, or an 8x8 MAZ/BTR to conquer!
        const heavyBonus = (spec.driveType === "8WD_FULL" || spec.driveType === "6WD_FULL") ? 0.24 : 0.0;
        const lowPsiBonus = Math.max(0, (30 - psi) / 20) * 0.36;
        const mudTireBonus = upg.mudTires ? 0.42 : 0.0;
        mu = 0.17 + lowPsiBonus + mudTireBonus + heavyBonus;
        const sinkDrag = (upg.mudTires || heavyBonus > 0) ? 0.28 : 0.62;
        rollingDrag += sinkDrag + w.mudDepth * 0.78;
      } else if (w.surface === "rock") {
        mu = 0.74 + Math.max(0, (32 - psi) / 22) * 0.25 + (upg.mudTires ? 0.15 : 0);
      }

      // Rally AWD cars (WRX & Evo) get extra gravel/snow rally traction feel!
      if (spec.driveType === "AWD_FULL") mu *= 1.08;
      const iceFactor = cMods && cMods.ice > 0 ? (1.0 - cMods.ice * 0.72) : 1.0;
      const wBlown = !!(vs.blownTires && vs.blownTires[i]);
      const wTireHp = (vs.tiresHP && vs.tiresHP[i] !== undefined) ? vs.tiresHP[i] : 100;
      if (wBlown) {
        mu *= 0.34; // Bare metal rim skids violently!
        rollingDrag += 0.38;
        if (this.speedKmh > 14 && Math.random() < dt * 16) {
          this.emit("rim_spark", { x: w.worldContact.x, y: w.worldContact.y + 0.08, z: w.worldContact.z });
        }
      } else if (this.speedKmh > 12) {
        // Gentle realistic tire wear on rough rocky/volcanic/shale trails
        const surfWear = (w.surface === "volcanic" || w.surface === "rock") ? 0.055 : (w.surface === "shale" ? 0.028 : 0.010);
        this._damageTire(i, surfWear * (this.speedKmh / 50) * dt, "wear");
      }
      mu *= weatherGrip * iceFactor * (0.55 + 0.45 * (wTireHp / 100)) * (0.85 + 0.15 * hubPartMult);

      const tCompObj = KK.TIRE_COMPOUNDS[vs.tireCompound] || KK.TIRE_COMPOUNDS.all_terrain;
      const tBrndObj = KK.TIRE_BRANDS[vs.tireBrand] || KK.TIRE_BRANDS.volgaworks;
      const surfGripKey = (w.surface === "tarmac_line" || w.surface === "kerb") ? "race_tarmac" : (w.surface || "dirt");
      const compGripMult = (tCompObj.grip && tCompObj.grip[surfGripKey]) ? tCompObj.grip[surfGripKey] : 1.0;
      const tireCompTotal = compGripMult * (tBrndObj.gripMult || 1.0);
      rollingDrag *= (tCompObj.dragMult || 1.0);
      if (spec.isTracked) {
        // v14.1P REAL TANK STEEL GROUSER TRACTION: Continuous wide tracks bite mechanically into mud, snow, sand, gravel & rock!
        const tankWeather = 0.84 + 0.16 * weatherGrip;
        const grouserFloor = spec.isSchreckensfurst ? 1.88 : 1.56;
        mu = Math.max(mu * tireCompTotal * 1.48, grouserFloor * tankWeather * iceFactor);
        if (w.surface === "mud" || w.surface === "snow" || w.surface === "sand" || w.surface === "bad_road" || w.surface === "volcanic") {
          rollingDrag *= (spec.isSchreckensfurst ? 0.18 : 0.28);
        }
      } else {
        mu *= tireCompTotal;
      }

      const camberAbs = Math.abs(tun.camberDeg);
      const longMu = mu * Math.max(0.75, 1.0 - camberAbs * 0.025);
      const latMu = mu * (1.0 + Math.min(3.5, camberAbs) * 0.022);

      const isDriven = (is4WD || w.def.axle !== "front") && drivenCount > 0;
      let driveForce = 0;
      if (isDriven && this.engineRunning && this.gear !== 0) {
        const axleLocked = (w.def.axle === "front" && this.frontLock) || (w.def.axle !== "front" && this.rearLock) || spec.driveType === "AWD_FULL";
        const diffEff = (!axleLocked && w.surface === "mud") ? 0.44 : ((!axleLocked && weatherGrip < 0.65) ? 0.72 : 1.0);
        let axleSplit = spec.isTracked ? (1.0 / Math.max(2, groundedDriveCount)) : (1.0 / drivenCount);
        if (spec.driveType === "AWD_FULL" && this.wheels.length === 4) {
          axleSplit = (w.def.axle === "front") ? 0.21 : 0.29;
        }
        const thisRad = wheelRad * (w.def.radiusScale || 1.0);
        const trackTorqueBoost = spec.isSchreckensfurst ? 1.42 : (spec.isTracked ? 1.24 : 1.0);
        driveForce = (rawWheelTorqueTotal * trackTorqueBoost * axleSplit / thisRad) * driveSign * (spec.isTracked ? 1.0 : diffEff);
      }

      const maxBrakePerWheel = (spec.brakeForce / this.wheels.length) * brakePartMult;
      const isRear = (w.def.axle !== "front" && w.def.axle !== "front2");
      // When pulling handbrake, cut rear drive force & clamp hard!
      const effDrive = (handbrake && isRear) ? 0 : (handbrake ? driveForce * 0.25 : driveForce);
      let brakeF = (brake > 0.05 ? brake * maxBrakePerWheel * 1.35 : 0);
      if (handbrake) {
        // Strong rear lockup + assistive front hold at low speed so the car stops crisp and NEVER coasts!
        brakeF += isRear ? (maxBrakePerWheel * 3.4) : (Math.abs(vLong) < 4.5 ? maxBrakePerWheel * 1.8 : maxBrakePerWheel * 0.45);
      }
      const stopClamp = Math.abs(vLong) * mass * (handbrake ? 14.0 : 6.5);
      let fLong = effDrive - Math.sign(vLong) * Math.min(stopClamp, brakeF) - vLong * rollingDrag * (fN * 0.055);
      const maxLong = fN * longMu * (spec.isTracked ? (handbrake ? 2.1 : 1.85) : (handbrake ? 1.55 : 1.28));
      fLong = Math.max(-maxLong, Math.min(maxLong, fLong));

      const hbDriftScale = (handbrake && isRear && this.speedKmh > 18 && !spec.isTracked) ? 0.38 : 1.0;
      const isFrontAxle = (w.def.axle === "front" || w.def.axle === "front2");
      const isAeroSport = (spec.id === "gtr_r35" || spec.id === "wrx" || spec.id === "evo");
      const rearAeroGrip = (!isFrontAxle && isAeroSport) ? (1.0 + Math.min(0.42, (this.speedKmh * this.speedKmh) / 68000)) : 1.0;
      const frontBite = isFrontAxle
        ? (spec.driveType === "AWD_FULL" ? 1.15 : (spec.agileSteer ? 1.18 : 1.10))
        : (spec.driveType === "AWD_FULL" ? (1.13 * rearAeroGrip) : 1.04);
      const baseStiff = spec.isTracked ? 11.5 : ((w.surface === "race_tarmac" ? 9.0 : (w.surface === "asphalt" ? 7.6 : 5.2)) * (psi < 16 ? 0.80 : 1.0));
      const cornerStiff = baseStiff * frontBite;
      let fLat = -vLat * fN * 0.17 * cornerStiff * hbDriftScale;
      const maxLat = fN * latMu * (spec.isTracked ? 1.95 : 1.26) * frontBite * hbDriftScale;
      fLat = Math.max(-maxLat, Math.min(maxLat, fLat));

      const fWorld = up.clone().multiplyScalar(fN).add(wFwd.multiplyScalar(fLong)).add(wRight.multiplyScalar(fLat));
      totalForce.add(fWorld);

      const cogShift = new THREE.Vector3(this.cargoTilt * 0.45, spec.cogOffsetY + liftHeight * 0.65 + (this.cargoCount * 0.04), 0).applyQuaternion(this.quat);
      totalTorque.add(new THREE.Vector3().crossVectors(rWorld.clone().sub(cogShift), fWorld));
      w.spinAngle += (vLong / wheelRad) * dt;
    }

    this.inWaterDepth = maxWater;
    const speedSq = this.vel.lengthSq();
    if (speedSq > 0.01) {
      const aeroCd = (spec.id === "uaz452" || spec.id === "kamaz" || spec.id === "humvee") ? 0.78 : ((spec.id === "wrx" || spec.id === "evo" || spec.id === "gtr_r35") ? 0.34 : 0.55);
      const airDrag = aeroCd * (spec.bodyWidth * spec.bodyHeight);
      const waterDrag = maxWater > 0.1 ? (maxWater * (spec.isTracked ? 185 : 480)) : 0;
      totalForce.add(this.vel.clone().normalize().multiplyScalar(-(airDrag * speedSq + waterDrag * Math.sqrt(speedSq))));
    }

    // AMPHIBIOUS BUOYANCY & WATER-JET THRUST (BTR-80 8x8 floats & swims across Great Krasnaya River!)
    if (spec.amphibious && maxWater > 0.45 && topWaterY > -5000) {
      const floatTargetY = topWaterY - 0.12;
      const submerge = floatTargetY - this.pos.y;
      if (submerge > -0.35) {
        // Strong upward Archimedes buoyancy + vertical wave damping
        const buoyF = Math.max(0, (submerge + 0.35) * mass * 22.0) - this.vel.y * mass * 3.2;
        totalForce.y += buoyF;
        // Self-righting hull stability in water
        const targetUp = new THREE.Vector3(0, 1, 0);
        const tiltAxis = new THREE.Vector3().crossVectors(up, targetUp);
        totalTorque.addScaledVector(tiltAxis, mass * 16.0);
        // Twin Rear Water-Jet Propulsion + Rudder Steering!
        if (this.engineRunning) {
          const jetDir = this.gear === -1 ? -1 : 1;
          const jetThrust = throttle * mass * 6.8 * jetDir;
          totalForce.addScaledVector(forward, jetThrust);
          totalTorque.y += input.steer * mass * 7.5;
        }
        // Smooth hydrodynamic water drag
        totalForce.x -= this.vel.x * mass * 0.85;
        totalForce.z -= this.vel.z * mass * 0.85;
      }
    } else {
      const stw = vs.stowedUpgrades || {};
      const t72SnorkelAdd = (spec.isTracked && upg.t72Snorkel && !stw.t72Snorkel) ? 7.50 : 0;
      const intakeH = spec.intakeHeight + liftHeight + ((upg.snorkel && !stw.snorkel) ? 1.15 : 0) + t72SnorkelAdd;
      if (maxWater > intakeH && this.engineRunning && !this.hydrolocked) {
        this.hydrolocked = true; this.engineRunning = false;
        this._wearPart("headGasket", 20);
        this._wearPart("pistons", 15);
        this.emit("hydrolock", { depth: maxWater, intakeH });
      }
    }

    if (this.winch.active) {
      let anchor = this.winch.anchorPos;
      if (this.winch.targetPeerId && remotePlayersMap && remotePlayersMap.has(this.winch.targetPeerId)) {
        const rp = remotePlayersMap.get(this.winch.targetPeerId);
        anchor = new THREE.Vector3(rp.gx, rp.gy + 0.8, rp.gz);
        this.winch.anchorPos = anchor;
      }
      if (anchor) {
        const localAtt = this.winch.localAttach || new THREE.Vector3(0, 0.6, spec.bodyLen * 0.5);
        const winchOrigin = localAtt.clone().applyQuaternion(this.quat).add(this.pos);
        const diff = anchor.clone().sub(winchOrigin);
        const dist = diff.length();
        const maxReach = upg.hdWinch ? 120 : 55;
        if (dist > maxReach + 12) {
          this.winch.active = false; this.emit("toast", "Winch cable snapped (overstretched)!");
        } else {
          if (this.winch.reeling < 0) this.winch.length = Math.max(2.5, this.winch.length - (upg.hdWinch ? 7.5 : 4.5) * dt);
          else if (this.winch.reeling > 0) this.winch.length = Math.min(maxReach, this.winch.length + 7.0 * dt);
          if (dist > this.winch.length) {
            const stretch = dist - this.winch.length;
            const pullStrength = upg.hdWinch ? 54000 : 26000;
            const fMag = Math.min(pullStrength, stretch * 14000 + (this.winch.reeling < 0 ? pullStrength * 0.45 : 0));
            const fWinch = diff.normalize().multiplyScalar(fMag);
            totalForce.add(fWinch);
            totalTorque.add(new THREE.Vector3().crossVectors(winchOrigin.clone().sub(this.pos), fWinch).multiplyScalar(0.82));
          }
        }
      }
    }

    const prevVel = this.vel.clone();
    this.vel.addScaledVector(totalForce, dt / mass);

    // TRUE MECHANICAL HANDBRAKE STATIC HOLD (Stops coasting dead on hills & flats!)
    if (handbrake && groundedWheels >= 2) {
      const horizSpd = Math.hypot(this.vel.x, this.vel.z);
      if (horizSpd < 2.8 && throttle < 0.08) {
        const holdDamp = Math.exp(-18.0 * dt);
        this.vel.x *= holdDamp;
        this.vel.z *= holdDamp;
        if (horizSpd < 0.30) {
          this.vel.x = 0;
          this.vel.z = 0;
          this.angVel.y *= 0.5;
        }
      } else if (horizSpd >= 2.8 && throttle < 0.08) {
        // Extra crisp handbrake deceleration above 2.8 m/s
        const decel = Math.max(0, 1.0 - (4.8 * dt) / horizSpd);
        this.vel.x *= decel;
        this.vel.z *= decel;
      }
    }

    const invQuat = this.quat.clone().invert();
    const localTorque = totalTorque.clone().applyQuaternion(invQuat);
    const worldAngAccel = new THREE.Vector3(localTorque.x / Ix, localTorque.y / Iy, localTorque.z / Iz).applyQuaternion(this.quat);
    // REAL TRACKED TANK NEUTRAL-PIVOT SKID-STEERING (Rotate cleanly in place or at low speed!)
    if (spec.isTracked && groundedWheels >= 4 && this.engineRunning && Math.abs(input.steer || 0) > 0.05) {
      const steerIn = input.steer;
      const pivotRate = Math.abs(fwdSpeed) < 3.5 ? 1.05 : (0.85 / (1.0 + Math.abs(fwdSpeed) * 0.06));
      const targetYaw = steerIn * (fwdSpeed < -0.5 ? -pivotRate : pivotRate);
      this.angVel.y += (targetYaw - this.angVel.y) * Math.min(1, dt * 5.2);
      // Spin opposite tracks in opposite directions during neutral pivot!
      if (Math.abs(fwdSpeed) < 2.2) {
        for (const w of this.wheels) {
          w.spinAngle += (w.def.x < 0 ? -steerIn : steerIn) * 3.8 * dt;
        }
      }
    }

    if (groundedWheels >= 2 && Math.abs(fwdSpeed) > 2.0) {
      const steerInput = input.steer || 0;
      const isStraight = Math.abs(steerInput) < 0.05 && !handbrake;
      if (isStraight) {
        const gyroK = (spec.driveType === "AWD_FULL" ? 8.5 : (spec.agileSteer ? 5.8 : 4.2));
        this.angVel.y *= Math.exp(-gyroK * dt);
        if (Math.abs(latSpeed) > 0.15 && Math.abs(latSpeed) < 8.0) {
          const stabF = -latSpeed * mass * (spec.driveType === "AWD_FULL" ? 2.4 : 1.4);
          this.vel.addScaledVector(right, (stabF / mass) * dt);
        }
      } else if (Math.abs(steerInput) >= 0.05) {
        const tvGain = spec.driveType === "AWD_FULL" ? 1.45 : (spec.agileSteer ? 1.15 : 0.65);
        const dirSign = fwdSpeed >= 0 ? 1 : -1;
        const spdRamp = Math.min(1.0, Math.abs(fwdSpeed) / 14.0) / (1.0 + Math.abs(fwdSpeed) * 0.022);
        const targetYawBoost = this.steerAngle * dirSign * spdRamp * tvGain;
        this.angVel.y += (targetYawBoost - this.angVel.y) * Math.min(1, dt * 2.4);
      }
    }

    this.angVel.addScaledVector(worldAngAccel, dt);
    if (groundedWheels > 0) {
      const rpDamp = Math.exp(-3.6 * dt);
      const yawDamp = Math.exp(-(spec.driveType === "AWD_FULL" ? 2.75 : (spec.agileSteer ? 2.45 : 2.35)) * dt);
      this.angVel.x *= rpDamp; this.angVel.y *= yawDamp; this.angVel.z *= rpDamp;
    } else {
      this.angVel.multiplyScalar(Math.exp(-0.9 * dt));
    }
    if (this.angVel.length() > 5.5) this.angVel.setLength(5.5);

    const stepDist = this.vel.length() * dt;
    this.distanceMetersFrame += stepDist;
    this.pos.addScaledVector(this.vel, dt);

    const angSpeed = this.angVel.length();
    if (angSpeed > 0.0001) {
      const dq = new THREE.Quaternion().setFromAxisAngle(this.angVel.clone().divideScalar(angSpeed), angSpeed * dt);
      this.quat.premultiply(dq).normalize();
    }

    // 0. FORTIFIED BASE WALL COLLISIONS (Hammond's Mesa Perimeter Blast Walls!)
    if (world.staticColliders && world.staticColliders.length > 0) {
      const vehRadW = Math.max(spec.bodyWidth, spec.bodyLen * 0.44) * 0.52;
      const wCols = world.staticColliders;
      for (let wi = 0; wi < wCols.length; wi++) {
        const c = wCols[wi];
        const dx = this.pos.x - c.x, dz = this.pos.z - c.z;
        const sumR = vehRadW + c.r;
        if (Math.abs(dx) > sumR || Math.abs(dz) > sumR) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= sumR * sumR || d2 < 0.0001) continue;
        if (this.pos.y > c.y + c.h + 0.5 || this.pos.y < c.y - 2.0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const overlap = sumR - d;
        this.pos.x += nx * overlap;
        this.pos.z += nz * overlap;
        const vDotN = this.vel.x * nx + this.vel.z * nz;
        if (vDotN < 0) {
          this.vel.x -= nx * vDotN * 1.32;
          this.vel.z -= nz * vDotN * 1.32;
          if (-vDotN > 4.5) this.emit("impact", { speed: -vDotN, surface: "rock" });
        }
      }
    }

    // 1. DESTRUCTIBLE TREES & HEAVY HIGH-SPEED BOULDER COLLISIONS!
    if (world.activeColliders && world.activeColliders.length > 0) {
      const vehRad = Math.max(spec.bodyWidth, spec.bodyLen * 0.44) * 0.52;
      const cols = world.activeColliders;
      for (let ci = 0; ci < cols.length; ci++) {
        const c = cols[ci];
        if (c.broken) continue;
        const dx = this.pos.x - c.x;
        const dz = this.pos.z - c.z;
        const sumR = vehRad + c.r;
        if (Math.abs(dx) > sumR || Math.abs(dz) > sumR) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= sumR * sumR || d2 < 0.0001) continue;
        if (this.pos.y > c.y + c.h + 0.45) continue;

        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const vDotN = this.vel.x * nx + this.vel.z * nz;
        const impactSpd = vDotN < 0 ? -vDotN : 0;
        const bullShield = upg.bullbar ? 0.35 : 1.0;

        // DESTRUCTIBLE TREES: Hit a tree fast enough (or in a heavy truck / bullbar) and SMASH right through it!
        const smashSpd = (mass > 2500 || upg.bullbar) ? 8.2 : 13.0; // ~29 km/h heavy/bullbar, ~47 km/h normal car
        if (c.kind === "tree" && impactSpd >= smashSpd) {
          c.broken = true;
          // Slow car slightly + minor/moderate front-end damage depending on Bullbar
          this.vel.x *= 0.80;
          this.vel.z *= 0.80;
          const treeDmg = Math.min(18, impactSpd * 0.72 * bullShield);
          this._wearPart("radiator", treeDmg * 0.45);
          this._wearPart("intercooler", treeDmg * 0.30);
          hlth.body = Math.max(0, hlth.body - treeDmg * 0.65);
          this.damageHeadlights(treeDmg * 1.4, (forward.x * nz - forward.z * nx));
          this.emit("tree_break", { treeId: c.id, x: c.x, y: c.y, z: c.z, dirX: this.vel.x, dirZ: this.vel.z });
          this.emit("impact", Math.min(0.95, impactSpd / 16));
          this.emit("crash_burst", { x: c.x, y: c.y + 0.9, z: c.z, strength: 1.0, surface: "gravel" });
          continue;
        }

        // Solid bounce off boulders OR slow-speed tree impacts
        const pen = sumR - d;
        this.pos.x += nx * pen;
        this.pos.z += nz * pen;

        if (vDotN < 0) {
          const bounce = 1.40;
          this.vel.x -= bounce * vDotN * nx;
          this.vel.z -= bounce * vDotN * nz;
          this.vel.x *= 0.70;
          this.vel.z *= 0.70;

          const sideSign = (forward.x * nz - forward.z * nx);
          this.angVel.y += sideSign * Math.min(4.2, impactSpd * 0.25);

          if (impactSpd > 3.2 && this.treeHitCooldown <= 0) {
            this.treeHitCooldown = 0.45;
            const isRock = (c.kind === "rock");
            // High-speed boulder impacts deal REAL damage to radiator, front shocks, tie-rods & body!
            const hitDmg = Math.min(42, (impactSpd - 2.2) * (isRock ? 2.15 : 1.45) * bullShield);
            this._wearPart("radiator", hitDmg * 0.75);
            this._wearPart("intercooler", hitDmg * 0.55);
            if (impactSpd > 10.5) {
              this._wearPart("shockFL", hitDmg * 0.55);
              this._wearPart("shockFR", hitDmg * 0.55);
              this._wearPart("tieRods", hitDmg * 0.65);
              if (isRock && Math.random() < 0.45 * bullShield) {
                hlth.tieRodBias = Math.max(-0.18, Math.min(0.18, hlth.tieRodBias + (Math.random() - 0.5) * 0.08));
              }
              if (isRock && impactSpd > 13.5) {
                const hitCorner = sideSign >= 0 ? 1 : 0;
                this._damageTire(hitCorner, hitDmg * 2.2, "boulder");
              }
            }
            hlth.body = Math.max(0, hlth.body - hitDmg * 0.95);
            this.damageHeadlights(hitDmg * 1.6, sideSign);
            this.emit("impact", Math.min(1.0, impactSpd / 16));
            this.emit("crash_burst", { x: c.x, y: c.y + 0.6, z: c.z, strength: Math.min(1.5, impactSpd / 11), surface: isRock ? "rock" : "gravel" });
            if (impactSpd > 10.0) {
              this.emit("toast", isRock ? `BRUTAL BOULDER SLAM (-${Math.round(hitDmg)}% front-end)!` : "THUD! Hit a tree — hit it >48 km/h to smash through!");
            }
          }
        }
      }
    }

    // 1B. BREAKABLE ROADSIDE FENCES & GUARDRAILS!
    if (world.activeFences && world.activeFences.length > 0) {
      const fVehRad = Math.max(spec.bodyWidth, spec.bodyLen * 0.46) * 0.52;
      const fList = world.activeFences;
      for (let fi = 0; fi < fList.length; fi++) {
        const fn = fList[fi];
        if (fn.broken) continue;
        const dx = this.pos.x - fn.x, dz = this.pos.z - fn.z;
        const sumR = fVehRad + fn.r;
        if (Math.abs(dx) > sumR || Math.abs(dz) > sumR) continue;
        if (dx * dx + dz * dz >= sumR * sumR) continue;
        if (Math.abs(this.pos.y - fn.y) > 2.4) continue;

        const curSpd = Math.hypot(this.vel.x, this.vel.z);
        if (curSpd > 2.8) {
          // SMASH straight through the wooden ranch fence or metal guardrail!
          fn.broken = true;
          const dragKeep = fn.isMetal ? 0.86 : 0.93;
          this.vel.x *= dragKeep;
          this.vel.z *= dragKeep;
          const fDmg = (fn.isMetal ? 3.5 : 1.2) * (upg.bullbar ? 0.25 : 1.0);
          hlth.body = Math.max(0, hlth.body - fDmg);
          this.emit("fence_break", { fenceId: fn.id, isMetal: fn.isMetal, x: fn.x, y: fn.y, z: fn.z, dirX: this.vel.x, dirZ: this.vel.z });
          this.emit("crash_burst", { x: fn.x, y: fn.y + 0.7, z: fn.z, strength: 0.45, surface: "gravel" });
        } else {
          // Gentle slow bump nudges car back off intact fence
          const d = Math.hypot(dx, dz) || 1;
          const pen = (sumR - d) * 0.5;
          this.pos.x += (dx / d) * pen;
          this.pos.z += (dz / d) * pen;
          this.vel.x *= 0.6; this.vel.z *= 0.6;
        }
      }
    }

    // 2. MULTIPLAYER CAR-TO-CAR COLLISIONS (LAN RAMMING CHAOS!)
    if (remotePlayersMap && remotePlayersMap.size > 0) {
      const myRad = Math.max(spec.bodyWidth, spec.bodyLen * 0.56) * 0.50;
      for (const rp of remotePlayersMap.values()) {
        if (!rp || rp.onFoot) continue;
        const rSpec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
        const otherRad = Math.max(rSpec.bodyWidth, rSpec.bodyLen * 0.56) * 0.50;
        const dx = this.pos.x - rp.gx;
        const dy = this.pos.y - rp.gy;
        const dz = this.pos.z - rp.gz;
        const sumR = myRad + otherRad;
        if (Math.abs(dx) > sumR || Math.abs(dz) > sumR || Math.abs(dy) > 2.6) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= sumR * sumR || d2 < 0.001) continue;

        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const pen = sumR - d;
        this.pos.x += nx * pen * 0.55;
        this.pos.z += nz * pen * 0.55;

        const rvx = rp.vx || 0, rvz = rp.vz || 0;
        const relVx = this.vel.x - rvx;
        const relVz = this.vel.z - rvz;
        const relDotN = relVx * nx + relVz * nz;

        if (relDotN < 0) {
          const otherMass = rSpec.massKg || 2000;
          const totalM = mass + otherMass;
          const myShare = otherMass / totalM;
          const otherShare = mass / totalM;
          const impactMag = -relDotN;
          const e = 1.48; // Bouncy chaotic multiplayer metal crunch!

          this.vel.x += nx * impactMag * e * myShare;
          this.vel.z += nz * impactMag * e * myShare;
          this.vel.y += Math.min(4.5, impactMag * 0.14 * myShare);

          const sideSpin = (forward.x * nz - forward.z * nx);
          this.angVel.y += sideSpin * Math.min(4.5, impactMag * 0.24);

          if (impactMag > 2.2 && this.carHitCooldown <= 0) {
            this.carHitCooldown = 0.28;
            const bullShield = upg.bullbar ? 0.35 : 1.0;
            const dmg = Math.min(20, impactMag * 0.9 * bullShield);
            hlth.body = Math.max(0, hlth.body - dmg);
            this._wearPart("radiator", dmg * 0.35);
            this.damageHeadlights(dmg * 1.5, sideSpin);

            // Send opposing ram impulse straight to your friend's PC over LAN!
            this.emit("vehicle_ram", {
              targetPeerId: rp.peerId,
              callsign: rp.callsign,
              dvx: +(-nx * impactMag * e * otherShare * 1.15).toFixed(2),
              dvy: +Math.min(6.5, impactMag * 0.22 * otherShare).toFixed(2),
              dvz: +(-nz * impactMag * e * otherShare * 1.15).toFixed(2),
              spin: +(-sideSpin * Math.min(5.0, impactMag * 0.3)).toFixed(2)
            });
            this.emit("impact", Math.min(1.0, impactMag / 14));
            this.emit("crash_burst", { x: (this.pos.x + rp.gx) * 0.5, y: this.pos.y + 0.8, z: (this.pos.z + rp.gz) * 0.5, strength: Math.min(1.3, impactMag / 10), surface: "rock" });
            if (impactMag > 7.5) this.emit("toast", `CRASH!! You slammed into ${rp.callsign}!`);
          }
        }
      }
    }

    const bound = KK.HALF_WORLD - 150;
    this.pos.x = Math.max(-bound, Math.min(bound, this.pos.x));
    this.pos.z = Math.max(-bound, Math.min(bound, this.pos.z));

    // MULTI-POINT ANTI-UNDERGROUND FLOOR GUARD (Center + Front Bumper + Rear Bumper!)
    // Guarantees the chassis can NEVER clip into steep mountains or bridge edges!
    const halfLenG = spec.bodyLen * 0.44;
    const fPt = new THREE.Vector3(0, 0.22,  halfLenG).applyQuaternion(this.quat).add(this.pos);
    const rPt = new THREE.Vector3(0, 0.22, -halfLenG).applyQuaternion(this.quat).add(this.pos);
    const centerTerrain = world.getTerrainInfo(this.pos.x, this.pos.z, true, this.pos.y);
    const frontTerrain  = world.getTerrainInfo(fPt.x, fPt.z, true, fPt.y);
    const rearTerrain   = world.getTerrainInfo(rPt.x, rPt.z, true, rPt.y);

    let maxPen = (centerTerrain.height + 0.36) - this.pos.y;
    const penF = (frontTerrain.height + 0.22) - fPt.y;
    const penR = (rearTerrain.height  + 0.22) - rPt.y;
    if (penF > maxPen) maxPen = penF;
    if (penR > maxPen) maxPen = penR;

    if (maxPen > 0) {
      const slamVel = Math.max(0, -this.vel.y);
      this.pos.y += maxPen;
      if (this.vel.y < 0) this.vel.y *= -0.15;
      // Gentle pitch-up response if front bumper dug into a steep mountain incline!
      if (penF > 0.08 && penF > penR) {
        this.angVel.addScaledVector(right, -Math.min(2.2, penF * 3.5));
      } else if (penR > 0.08 && penR > penF) {
        this.angVel.addScaledVector(right, Math.min(2.2, penR * 3.5));
      }
      this.vel.x *= Math.exp(-2.8 * dt); this.vel.z *= Math.exp(-2.8 * dt);
      if (slamVel > 2.8) {
        maxPotholeImpact = Math.max(maxPotholeImpact, slamVel * 0.28);
        hlth.body = Math.max(0, hlth.body - slamVel * 1.4);
        if (this.lastImpactFx <= 0) {
          this.lastImpactFx = 0.25;
          this.emit("crash_burst", { x: this.pos.x, y: centerTerrain.height, z: this.pos.z, strength: Math.min(1.5, slamVel * 0.16), surface: centerTerrain.surface });
        }
      }
    }

    const deltaV = this.vel.clone().sub(prevVel).length() / dt;
    const gForce = Math.max(0, (deltaV / 9.81) - 1.0);
    this.lastGForce = this.lastGForce * 0.85 + gForce * 0.15;
    if (gForce > this.peakGForce) this.peakGForce = gForce;
    this.peakGForce = Math.max(0, this.peakGForce - dt * 1.2);
    if (maxPotholeImpact > 0.42) this.emit("impact", Math.min(1.0, maxPotholeImpact));

    if (this.cargoCount > 0) {
      const cDef = KK.CARGO_TYPES[this.cargoType] || KK.CARGO_TYPES.standard;
      // v13.8X: 2x more resilient cargo so hellish terrain & cryptids are fair!
      if (gForce > 2.85) {
        this.cargoIntegrity = Math.max(0, this.cargoIntegrity - (gForce - 2.85) * 0.95 * cDef.fragility * (this.cargoStrapped ? 1.0 : 2.1));
      }
      if (!this.cargoStrapped && !spec.enclosedCargo && (up.y < 0.62 || gForce > 4.2)) {
        this.cargoCount = Math.max(0, this.cargoCount - 1);
        this.emit("cargo_spill", { x: this.pos.x + (Math.random() - 0.5) * 3, y: this.pos.y + 1.8, z: this.pos.z + (Math.random() - 0.5) * 3, cargoType: this.cargoType });
      }
    }
  }
};
