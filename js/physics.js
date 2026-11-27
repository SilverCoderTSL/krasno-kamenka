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
    this.tramHitCooldown = 0;
    this.hydrolocked = false;
    this.steerAngle = 0; this.lastGroundedWheels = 4;
    this.wheelSlipRatio = 0;
    this.driftIntensity = 0;
    this.currentSurface = "gravel";
    this.brakeHeat = 0;

    // Pre-allocated scratch objects to eliminate per-substep GC churn (120Hz)
    this._vFwd = new THREE.Vector3();
    this._vRight = new THREE.Vector3();
    this._vUp = new THREE.Vector3();
    this._totalForce = new THREE.Vector3();
    this._totalTorque = new THREE.Vector3();
    this._localMount = new THREE.Vector3();
    this._worldMount = new THREE.Vector3();
    this._rWorld = new THREE.Vector3();
    this._patchVel = new THREE.Vector3();
    this._wFwd = new THREE.Vector3();
    this._wRight = new THREE.Vector3();
    this._fWorld = new THREE.Vector3();
    this._cogShift = new THREE.Vector3();
    this._tmpV1 = new THREE.Vector3();
    this._tmpV2 = new THREE.Vector3();
    this._tmpV3 = new THREE.Vector3();
    this._prevVel = new THREE.Vector3();
    this._invQuat = new THREE.Quaternion();
    this._dq = new THREE.Quaternion();
    this._fPt = new THREE.Vector3();
    this._rPt = new THREE.Vector3();
    this._upAxis = new THREE.Vector3(0, 1, 0);
    this._shockPartIds = ["shockFL", "shockFR", "shockFL", "shockFR", "shockRL", "shockRR", "shockRL", "shockRR"];
    this._defaultCryptidMods = { ice: 0, quicksand: 0 };

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
    this._wheelForcesY = new Float32Array(this.wheels.length);

    this.speedKmh = 0; this.onBridgeId = null; this.inWaterDepth = 0; this.events = [];
    this.distanceMetersFrame = 0;
  }

  swapVehicleState(newVState, preservePosition = true) {
    KK.ensurePartsInitialized(newVState);
    this._tmpV1.copy(this.pos);
    this._invQuat.copy(this.quat);
    this.vState = newVState;
    this.spec = KK.VEHICLES[newVState.vehicleId];
    const eng = KK.ENGINES[newVState.engineId] || KK.ENGINES.umz_24;

    this.wheels = this.spec.wheels.map((wDef) => ({
      def: wDef, compression: 0, prevCompression: 0, visualOffsetY: -this.spec.restLength * 0.4,
      spinAngle: 0, grounded: false, surface: "gravel", waterDepth: 0, mudDepth: 0,
      worldContact: new THREE.Vector3()
    }));
    if (!this._wheelForcesY || this._wheelForcesY.length !== this.wheels.length) {
      this._wheelForcesY = new Float32Array(this.wheels.length);
    }
    if (preservePosition) {
      this.pos.copy(this._tmpV1); this.pos.y += 1.0; this.quat.copy(this._invQuat);
    }
    this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0);
    this.gear = 1; this.driveMode = this.spec.defaultDriveMode || "4H";
    this.rearLock = false; this.frontLock = false;
    this.rpm = eng.idleRpm; this.boostPsi = 0; this.smoothThrottle = 0;
    this.wheelSlipRatio = 0; this.driftIntensity = 0; this.currentSurface = "gravel"; this.brakeHeat = 0;
    this.hydrolocked = false;
    this.engineRunning = newVState.parts.headGasket.hp > 4 && newVState.fuel > 0.05;
    this.coolantTemp = 82; this.egtTemp = 340; this.steerAngle = 0;
    if (this.cargoCount > this.spec.cargoSlots) this.cargoCount = this.spec.cargoSlots;
  }

  getTotalMassKg() {
    const cDef = KK.CARGO_TYPES[this.cargoType] || KK.CARGO_TYPES.standard;
    return this.spec.massKg + this.cargoCount * cDef.massPerUnitKg;
  }

  getArmorTier(spec) {
    if (!spec) return 1;
    const id = spec.id;
    if (spec.isSchreckensfurst || id === "t72" || id === "harimau") return 3;
    if (id === "shilka" || id === "btr80" || id === "komodo_turret" || id === "komodo_std" || id === "komodo_recon" || id === "maz537") return 2;
    return 1;
  }

  emit(kind, data) { this.events.push({ kind, data }); }
  consumeEvents() { const out = this.events; this.events = []; return out; }

  flipUpright(world) {
    const fwd = this._vFwd.set(0, 0, 1).applyQuaternion(this.quat);
    const yaw = Math.atan2(fwd.x, fwd.z);
    this.quat.setFromAxisAngle(this._upAxis, yaw);
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
    const recoilWorld = this._tmpV1.copy(gunDirWorld).normalize().negate();
    // 1. Linear pushback strictly along the recoil line (horizontal component so hull doesn't uniformly squat!)
    this.vel.x += recoilWorld.x * linearKick;
    this.vel.z += recoilWorld.z * linearKick;

    // 2. Transform recoil into vehicle local frame to compute exact directional pitch & roll torque!
    const invQ = this._invQuat.copy(this.quat).invert();
    const recLocal = this._tmpV2.copy(recoilWorld).applyQuaternion(invQ);
    // Right-hand rule with lever = (0, +1, 0): lever x (rx, ry, rz) = (rz, 0, -rx)
    //   • Fire forward (+Z -> rz = -1): localAng.x = -pitchKick -> nose lifts (+Y), rear squishes (-Y)!
    //   • Fire to +X side (rx = -1):    localAng.z = +rollKick  -> +X lifts (+Y), -X squishes (-Y)!
    const localAngKick = this._tmpV3.set(
      recLocal.z * pitchKick,
      0,
      -recLocal.x * rollKick
    ).applyQuaternion(this.quat);
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
    const bull = (this.vState.upgrades.bullbar && !(this.vState.stowedUpgrades && this.vState.stowedUpgrades.bullbar)) ? 0.35 : 1.0;
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
    if (this.tramHitCooldown > 0) this.tramHitCooldown = Math.max(0, this.tramHitCooldown - clampedDt);
    const cMods = cryptidMods || this._defaultCryptidMods;
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

    const right = this._vRight.set(1, 0, 0).applyQuaternion(this.quat);
    const up = this._vUp.set(0, 1, 0).applyQuaternion(this.quat);
    const forward = this._vFwd.set(0, 0, 1).applyQuaternion(this.quat);

    const fwdSpeed = this.vel.dot(forward), latSpeed = this.vel.dot(right);
    this.speedKmh = Math.abs(fwdSpeed) * 3.6;

    const effMaxDeg = Math.max(spec.maxSteerDeg || 34, 34);
    const maxSteerRad = (effMaxDeg * Math.PI) / 180;
    const absSpd = Math.abs(fwdSpeed);
    const isGtrAttesa = (spec.id === "gtr_r35");
    const speedSteerFactor = isGtrAttesa
      ? (1.0 / (1.0 + absSpd * 0.0055 + absSpd * absSpd * 0.00008))
      : (1.0 / (1.0 + absSpd * (spec.agileSteer ? 0.014 : 0.018) + absSpd * absSpd * (spec.agileSteer ? 0.00058 : 0.00048)));
    let flatPull = 0;
    if (vs.blownTires) {
      for (let wi = 0; wi < this.wheels.length; wi++) {
        if (vs.blownTires[wi]) flatPull += (this.wheels[wi].def.x < 0 ? 0.095 : -0.095) * (this.wheels[wi].def.steer ? 1.0 : 0.45);
      }
    }
    let counterSteer = 0;
    if (Math.abs(input.steer) < 0.04 && !spec.isTracked && this.lastGroundedWheels >= 2 && fwdSpeed > 4.5 && Math.abs(latSpeed) > 1.2) {
      // Gentle self-aligning castor counter-steer assist during a slide for crisp keyboard driving
      const driftAngle = Math.atan2(latSpeed, fwdSpeed);
      counterSteer = Math.max(-maxSteerRad * 0.48, Math.min(maxSteerRad * 0.48, driftAngle * 0.52));
    }
    if (Math.abs(hlth.tieRodBias || 0) < 0.008) hlth.tieRodBias = 0;
    const targetSteer = input.steer * maxSteerRad * speedSteerFactor + counterSteer + hlth.tieRodBias + flatPull;
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
    // v16.3 Launch Control / Brake+Throttle Standstill Rev (works in both Auto & Manual!)
    const launchHeld = this.engineRunning && (input.brake > 0.35 || input.handbrake) && input.throttle > 0.65 && this.speedKmh < 8;
    if (launchHeld) {
      if (this.gear <= 0) this.gear = 1;
      rawThrottle = input.throttle;
      brake = 1.0;
    } else if (this.autoShift) {
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
    if (this.brakeHeat === undefined) this.brakeHeat = 0;
    if (this.braking && this.speedKmh > 22 && this.lastGroundedWheels > 0) {
      const heatRate = (0.28 + Math.min(1.5, this.speedKmh / 140)) * (handbrake ? 1.25 : 1.0);
      this.brakeHeat = Math.min(1.0, this.brakeHeat + dt * heatRate * 0.55);
    } else {
      const coolRate = 0.14 + Math.min(0.35, this.speedKmh / 240);
      this.brakeHeat = Math.max(0.0, this.brakeHeat - dt * coolRate);
    }
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

    // Clutch slip based on clutchPack health + wheelspin / torque-converter slip model!
    const clutchSlip = 1.0 + (100 - parts.clutchPack.hp) * 0.0055;
    const wheelRpm = (Math.abs(fwdSpeed) / (2 * Math.PI * wheelRad)) * 60;
    let targetRpm = 0;
    if (this.engineRunning) {
      if (this.gear === 0) {
        targetRpm = eng.idleRpm + throttle * (effRedline - eng.idleRpm) * 0.92;
      } else if (this.lastGroundedWheels === 0) {
        targetRpm = eng.idleRpm + throttle * (effRedline - eng.idleRpm) * 0.86;
      } else {
        const isLowGear = (this.gear === 1 || this.gear === -1 || this.driveMode === "4L");
        const stallBoost = (isLowGear && absSpd < 8.0)
          ? Math.max(850, (eng.peakTorqueRpm - eng.idleRpm) * 0.55) * Math.max(0.25, 1.0 - absSpd / 10.0)
          : 850;
        const stallFloor = eng.idleRpm + throttle * stallBoost;
        const wheelSpinRpm = (this.wheelSlipRatio > 0.015 && throttle > 0.08)
          ? (eng.idleRpm + (effRedline - eng.idleRpm) * Math.min(0.87, 0.30 + 0.57 * this.wheelSlipRatio) * Math.pow(throttle, 0.75))
          : 0;
        targetRpm = Math.max(stallFloor, wheelRpm * totalRatio * clutchSlip, wheelSpinRpm);
      }
      targetRpm = Math.min(effRedline * 1.025, targetRpm);
    }
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * (7.5 + flywheelPerf * 4.0));

    if (this.autoShift && this.gear > 0 && this.engineRunning) {
      // v16.3 Antilag Launch Control (Brake + Throttle at standstill — fires multi-tip flames & pops!)
      if (launchHeld) {
        const lcTarget = effRedline * 0.68;
        this.rpm = lcTarget + Math.sin(performance.now() * 0.09) * 320;
        this.boostPsi = Math.min(eng.maxBoost || 18, (this.boostPsi || 0) + dt * 26);
        if (Math.random() < dt * 10.5) {
          this.backfireTimer = 0.16;
          this.justBackfired = true;
          this.emit("backfire", { pos: this.pos.clone(), backDir: forward.clone().negate() });
        }
      }
      // v16.0 Sharp Rev-Limiter Bounce at Redline!
      if (this.rpm >= effRedline * 0.985 && throttle > 0.4) {
        this.rpm = effRedline * (0.94 + Math.random() * 0.045);
        if (this.backfireTimer <= 0 && Math.random() < dt * 11.0) { this.backfireTimer = 0.12; this.justBackfired = true; }
      }
      if (this.rpm > effRedline * 0.91 && this.gear < gears.length && throttle > 0.2 && (this.wheelSlipRatio < 0.55 || wheelRpm * totalRatio > effRedline * 0.82)) {
        this.gear++;
        this.angVel.x -= 0.22 * throttle;
        if (throttle > 0.65) { this.backfireTimer = 0.14; this.justBackfired = true; }
      }
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

      const radHpFrac = (parts.radiator ? parts.radiator.hp : 100) / 100;
      const icHpFrac  = (parts.intercooler ? parts.intercooler.hp : 100) / 100;
      const pumpHpFrac = (parts.waterPump ? parts.waterPump.hp : 100) / 100;
      // v16.7 REAL MULTIPLICATIVE COOLING: Dead radiator (0%) or dead water pump collapses cooling to < 4%!
      const radPerf = KK.getPartPerf(vs, "radiator") * (radHpFrac < 0.40 ? Math.max(0.03, radHpFrac / 0.40) : 1.0);
      const pumpPerf = KK.getPartPerf(vs, "waterPump") * (pumpHpFrac < 0.35 ? Math.max(0.04, pumpHpFrac / 0.35) : 1.0);
      const radEff = Math.max(0.015, radPerf * pumpPerf) * (1.0 - hlth.mudClog * 0.006);
      const fanAirflow = this.coolantTemp > 92 ? 1.25 : 0.72;
      const airflow = Math.max(fanAirflow, 0.78 + Math.min(1.45, this.speedKmh / 36));
      const heatIn = (0.55 + load * 6.0 + (radHpFrac < 0.20 ? (3.5 + load * 4.5) : 0)) * eng.heatRate;
      const heatOut = Math.max(0, this.coolantTemp - 74) * 0.34 * radEff * airflow;
      const targetFloor = this.coolantTemp < 80 ? (82 - this.coolantTemp) * 0.14 : 0;
      this.coolantTemp = Math.max(32, Math.min(148, this.coolantTemp + (heatIn - heatOut + targetFloor) * dt));

      const realIcEff = icEff * (icHpFrac < 0.35 ? Math.max(0.18, icHpFrac / 0.35) : 1.0);
      const targetEgt = 255 + baseLoad * 335 + (overBoost * 9.5) / Math.max(0.18, realIcEff) + (icHpFrac < 0.15 ? 160 * baseLoad : 0);
      this.egtTemp += (targetEgt - this.egtTemp) * Math.min(1, dt * 1.25);

      // Toned-down passive normal-cruising wear (~40% gentler) while keeping abuse damage impactful
      const driveWear = (0.0033 + load * 0.0132) * dt;
      this._wearPart("sparkPlugs", driveWear * 1.15);
      this._wearPart("fuelInjectors", driveWear * 0.75);
      this._wearPart("fuelRails", driveWear * 0.40);
      this._wearPart("waterPump", driveWear * 0.60);
      this._wearPart("camshaft", driveWear * (0.45 + (rpmFrac > 0.88 ? 1.25 : 0)));
      this._wearPart("crankshaft", driveWear * (0.35 + (rpmFrac > 0.92 ? 1.50 : 0)));
      this._wearPart("pistons", driveWear * (0.40 + overBoost * 0.075));
      this._wearPart("exhaustManifold", driveWear * (0.45 + overBoost * 0.092));
      this._wearPart("intercooler", driveWear * (0.30 + overBoost * 0.058));
      this._wearPart("flywheel", driveWear * 0.45);
      this._wearPart("gearboxGears", driveWear * 0.55);
      this._wearPart("transferCase", driveWear * (this.driveMode === "4L" ? 0.95 : 0.48));
      this._wearPart("driveshaft", driveWear * 0.50);
      this._wearPart("wheelHubs", (this.speedKmh / 85) * 0.0072 * dt);

      if (this.coolantTemp > 110) {
        const ohSev = (this.coolantTemp - 110) * dt;
        this._wearPart("headGasket",      ohSev * 0.12);
        this._wearPart("pistons",         ohSev * 0.085);
        this._wearPart("crankshaft",      ohSev * 0.060);
        this._wearPart("camshaft",        ohSev * 0.055);
        this._wearPart("sparkPlugs",      ohSev * 0.075);
        this._wearPart("waterPump",       ohSev * 0.065);
        this._wearPart("radiator",        ohSev * 0.045);
        this._wearPart("fuelRails",       ohSev * 0.045);
        this._wearPart("fuelInjectors",   ohSev * 0.050);
        this._wearPart("intercooler",     ohSev * 0.055);
        this._wearPart("exhaustManifold", ohSev * (hasTurbo || eng.stockTurbo ? 0.085 : 0.050));
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

    const totalForce = this._totalForce.set(0, -9.81 * mass, 0);
    const totalTorque = this._totalTorque.set(0, 0, 0);

    if (this.cargoCount > 0 && !this.cargoStrapped) {
      this.cargoTilt += (Math.max(-0.45, Math.min(0.45, -latSpeed * 0.055)) - this.cargoTilt) * Math.min(1, dt * 6);
    } else { this.cargoTilt *= 0.85; }

    const is4WD = (this.driveMode === "4H" || this.driveMode === "4L" || spec.driveType === "6WD_FULL" || spec.driveType === "8WD_FULL" || spec.driveType === "AWD_FULL");
    let drivenCount = 0;
    for (let i = 0; i < this.wheels.length; i++) { if (is4WD || this.wheels[i].def.axle !== "front") drivenCount++; }
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
    const shockPartIds = this._shockPartIds;

    let maxWater = 0, topWaterY = -9999, maxPotholeImpact = 0, groundedWheels = 0;
    let onDirtySurface = false;
    let dominantSurface = "gravel";
    this.onBridgeId = null;

    if (!this._wheelForcesY || this._wheelForcesY.length !== this.wheels.length) {
      this._wheelForcesY = new Float32Array(this.wheels.length);
    }
    const wheelForcesY = this._wheelForcesY;
    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i];
      w.prevCompression = w.compression;
      const localMount = this._localMount.set(w.def.x, w.def.y, w.def.z);
      const worldMount = this._worldMount.copy(localMount).applyQuaternion(this.quat).add(this.pos);
      const tInfo = world.getTerrainInfo(worldMount.x, worldMount.z, true, worldMount.y);
      w.surface = tInfo.surface; w.waterDepth = tInfo.waterDepth; w.mudDepth = tInfo.mudDepth;
      dominantSurface = tInfo.surface;
      // v16.3 True Altitude-Aware Submersion: Compare water surface Y against actual chassis altitude!
      const actualSub = (tInfo.waterDepth > 0.05 && tInfo.waterSurfaceY > -5000) ? Math.max(0, tInfo.waterSurfaceY - (this.pos.y - spec.wheelRadius)) : 0;
      if (actualSub > maxWater) { maxWater = actualSub; topWaterY = Math.max(topWaterY, tInfo.waterSurfaceY); }
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
      const trackGone = spec.isTracked && ((w.def.x < 0 && (hlth.trackL !== undefined ? hlth.trackL : 100) < 15) || (w.def.x >= 0 && (hlth.trackR !== undefined ? hlth.trackR : 100) < 15));
      const effWheelRad = isBlown ? Math.max(0.20, baseWRad - 0.14) : (trackGone ? Math.max(0.20, baseWRad - 0.08) : baseWRad);
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
              if (impactSeverity > 1.25) {
                const prevGl2 = hlth.glass !== undefined ? hlth.glass : 100;
                hlth.glass = Math.max(0, prevGl2 - impactSeverity * 18);
                if (!this.spec.isTracked && prevGl2 >= 55 && hlth.glass < 55) this.emit("toast", "💥 WINDSHIELD CRACKED FROM HARD LANDING!");
              }
              const shockId = i === 0 ? "shockFL" : (i === 1 ? "shockFR" : (i === 2 ? "shockRL" : "shockRR"));
              const shockHp = (parts[shockId] ? parts[shockId].hp : 100);
              if (shockHp < 28) { this._wearPart("tieRods", 1.8); this._wearPart("wheelHubs", 1.5); vs.health.body = Math.max(5, vs.health.body - 0.6); }
              const bendChance = (shockHp < 28 ? 0.45 : 0.22) * KK.getPartWearMult(vs, "tieRods");
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
        vs.dirtLevel = Math.max(0.08, vs.dirtLevel - 0.085 * dt);
        vs.snowLevel = Math.max(0, (vs.snowLevel || 0) - 0.14 * dt);
      } else if (weatherName === "snow" || dominantSurface === "snow" || dominantSurface === "ice") {
        const snowRate = (dominantSurface === "snow" ? 0.042 : 0.024) * Math.min(2.2, this.speedKmh / 32);
        vs.snowLevel = Math.min(1.0, (vs.snowLevel || 0) + snowRate * dt);
        vs.dirtLevel = Math.max(0, (vs.dirtLevel || 0) - 0.014 * dt);
      } else if (onDirtySurface || weatherName === "rain" || weatherName === "storm") {
        const dirtRate = (dominantSurface === "mud" ? 0.055 : 0.016) * (weatherName === "rain" || weatherName === "storm" ? 1.8 : 1.0) * (this.speedKmh / 40);
        vs.dirtLevel = Math.min(1.0, vs.dirtLevel + dirtRate * dt);
        vs.snowLevel = Math.max(0, (vs.snowLevel || 0) - 0.022 * dt);
        if (dominantSurface === "gravel" || dominantSurface === "shale") {
          this._wearPart("airFilter", 0.028 * (this.speedKmh / 50) * dt);
        }
      } else if ((vs.snowLevel || 0) > 0) {
        vs.snowLevel = Math.max(0, vs.snowLevel - 0.004 * dt);
      }
    }

    for (let i = 0; i < this.wheels.length; i += 2) {
      const wL = this.wheels[i], wR = this.wheels[i + 1];
      if (!wL || !wR) continue;
      const arbForce = (wL.compression - wR.compression) * spec.baseAntiRoll * tun.antiRoll * (0.65 + 0.35 * arbPartMult);
      if (wL.grounded) wheelForcesY[i] = Math.max(0, wheelForcesY[i] + arbForce);
      if (wR.grounded) wheelForcesY[i + 1] = Math.max(0, wheelForcesY[i + 1] - arbForce);
    }

    let groundedDriveCount = 0;
    for (let i = 0; i < this.wheels.length; i++) {
      if (this.wheels[i].grounded && wheelForcesY[i] > 0) groundedDriveCount++;
    }
    const cogShift = this._cogShift.set(
      this.cargoTilt * 0.45,
      spec.cogOffsetY + liftHeight * 0.65 + (this.cargoCount * 0.04),
      0
    ).applyQuaternion(this.quat);
    const engineWheelOmega = (this.rpm / Math.max(1.0, totalRatio)) * 0.10471976; // rad/s
    let drivenSlipSum = 0, drivenGroundedCnt = 0;

    for (let i = 0; i < this.wheels.length; i++) {
      const w = this.wheels[i], fN = wheelForcesY[i];
      const isDriven = (is4WD || w.def.axle !== "front") && drivenCount > 0;
      if (!w.grounded || fN <= 0) {
        if (isDriven && this.engineRunning && this.gear !== 0 && throttle > 0.08 && !launchHeld) {
          w.spinAngle += driveSign * engineWheelOmega * dt;
        } else {
          w.spinAngle += (fwdSpeed / wheelRad) * dt;
        }
        continue;
      }

      const localMount = this._localMount.set(w.def.x, w.def.y + w.visualOffsetY, w.def.z);
      const rWorld = this._rWorld.copy(localMount).applyQuaternion(this.quat);
      const patchVel = this._patchVel.crossVectors(this.angVel, rWorld).add(this.vel);

      const sideSign = w.def.x < 0 ? -1 : 1;
      const stScale = w.def.steerScale !== undefined ? w.def.steerScale : 1.0;
      const wSteer = (w.def.steer ? this.steerAngle * stScale : 0) + sideSign * ((tun.toeDeg * Math.PI) / 180) * (w.def.steer ? 1 : 0.25);
      const cosS = Math.cos(wSteer), sinS = Math.sin(wSteer);
      const wFwd = this._wFwd.copy(forward).multiplyScalar(cosS).addScaledVector(right, sinS).normalize();
      const wRight = this._wRight.copy(right).multiplyScalar(cosS).addScaledVector(forward, -sinS).normalize();

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

      let driveForce = 0;
      if (isDriven && this.engineRunning && this.gear !== 0) {
        const axleLocked = (w.def.axle === "front" && this.frontLock) || (w.def.axle !== "front" && this.rearLock) || spec.driveType === "AWD_FULL";
        const diffEff = (!axleLocked && w.surface === "mud") ? 0.44 : ((!axleLocked && weatherGrip < 0.65) ? 0.72 : 1.0);
        let axleSplit = spec.isTracked ? (1.0 / Math.max(2, groundedDriveCount)) : (1.0 / drivenCount);
        if (spec.driveType === "AWD_FULL" && this.wheels.length === 4) {
          if (isGtrAttesa) {
            // v16.9 ATTESA E-TS PRO: Rear-biased (20:80) on turn-in for razor front bite,
            // dynamically shifts up to 50:50 under heavy throttle exit!
            const cornerFactor = Math.min(1.0, Math.abs(this.steerAngle) / 0.22);
            const frontPerWheel = 0.12 + (1.0 - cornerFactor) * 0.13 * throttle;
            axleSplit = (w.def.axle === "front") ? frontPerWheel : (0.5 - frontPerWheel);
          } else {
            axleSplit = (w.def.axle === "front") ? 0.21 : 0.29;
          }
        }
        const thisRad = wheelRad * (w.def.radiusScale || 1.0);
        const trackTorqueBoost = spec.isSchreckensfurst ? 1.42 : (spec.isTracked ? 1.24 : 1.0);
        driveForce = (rawWheelTorqueTotal * trackTorqueBoost * axleSplit / thisRad) * driveSign * (spec.isTracked ? 1.0 : diffEff);
      }

      const maxBrakePerWheel = (spec.brakeForce / this.wheels.length) * brakePartMult;
      const isRear = (w.def.axle !== "front" && w.def.axle !== "front2");
      // When pulling handbrake, cut rear drive force & clamp hard!
      // v15.9 Destroyable Tank Tracks: Snapped track (<15% HP) kills drive & drags that side!
      const trackBrokenSide = spec.isTracked && ((w.def.x < 0 && (hlth.trackL !== undefined ? hlth.trackL : 100) < 15) || (w.def.x >= 0 && (hlth.trackR !== undefined ? hlth.trackR : 100) < 15));
      const effDrive = trackBrokenSide ? 0 : ((handbrake && isRear) ? 0 : (handbrake ? driveForce * 0.25 : driveForce));
      let brakeF = (brake > 0.05 ? brake * maxBrakePerWheel * 1.35 : 0);
      if (handbrake || trackBrokenSide) {
        // Strong rear lockup + assistive front hold at low speed so the car stops crisp and NEVER coasts!
        brakeF += isRear ? (maxBrakePerWheel * 3.4) : (Math.abs(vLong) < 4.5 ? maxBrakePerWheel * 1.8 : maxBrakePerWheel * 0.45);
      }
      const brakeFade = (this.brakeHeat > 0.85) ? (1.0 - (this.brakeHeat - 0.85) * 2.2) : 1.0;
      const stopClamp = Math.abs(vLong) * mass * (handbrake ? 14.0 : 6.5) * brakeFade;
      let fLong = effDrive - Math.sign(vLong) * Math.min(stopClamp, brakeF) - vLong * rollingDrag * (fN * 0.055);
      const maxLong = fN * longMu * (spec.isTracked ? (handbrake ? 2.1 : 1.85) : (handbrake ? 1.55 : 1.28));

      // Lightweight wheelspin & torque-converter slip detection for mud roosting & natural turbo spool!
      let wSlip = 0;
      if (isDriven) {
        drivenGroundedCnt++;
        if (this.engineRunning && this.gear !== 0 && !launchHeld && !handbrake && throttle > 0.08 && brake < 0.2) {
          const absDrive = Math.abs(effDrive);
          let gripSlip = 0;
          if (maxLong > 1.0 && absDrive > maxLong * 0.92) {
            gripSlip = Math.min(1.0, (absDrive - maxLong * 0.92) / Math.max(maxLong * 0.65, 250));
          }
          let launchSlip = 0;
          const isLowG = (this.gear === 1 || this.gear === -1 || this.driveMode === "4L");
          if (isLowG && throttle > 0.35 && absSpd < 6.0) {
            launchSlip = throttle * (1.0 - absSpd / 6.0) * (mu < 0.55 ? 0.55 : 0.26);
          }
          wSlip = Math.min(1.0, Math.max(gripSlip, launchSlip));
        }
        drivenSlipSum += wSlip;
      }

      fLong = Math.max(-maxLong, Math.min(maxLong, fLong));

      const isPowerSlide = (isRear && throttle > 0.72 && Math.abs(this.steerAngle) > 0.16 && this.speedKmh > 28 && !spec.isTracked && (this.driveMode === "2H" || spec.agileSteer));
      const dmDriftBias = (this.driveMode === "2H" && isRear && throttle > 0.55 && Math.abs(this.steerAngle) > 0.12) ? 0.78 : (this.driveMode === "4H" ? 1.06 : 1.0);
      const hbDriftScale = ((handbrake && isRear && this.speedKmh > 16 && !spec.isTracked) ? 0.28 : (isPowerSlide ? 0.66 : 1.0)) * dmDriftBias;
      const isFrontAxle = (w.def.axle === "front" || w.def.axle === "front2");
      const isAeroSport = (spec.id === "gtr_r35" || spec.id === "wrx" || spec.id === "evo");
      const aeroRamp = isAeroSport ? Math.min(0.46, (this.speedKmh * this.speedKmh) / 62000) : 0;
      const frontAeroGrip = (isFrontAxle && isGtrAttesa) ? (1.0 + aeroRamp * 1.12) : 1.0;
      const rearAeroGrip  = (!isFrontAxle && isAeroSport) ? (1.0 + aeroRamp * (isGtrAttesa ? 0.96 : 0.92)) : 1.0;
      const frontBite = isFrontAxle
        ? (isGtrAttesa ? (1.36 * frontAeroGrip) : (spec.driveType === "AWD_FULL" ? 1.18 : (spec.agileSteer ? 1.18 : 1.10)))
        : (spec.driveType === "AWD_FULL" ? (1.13 * rearAeroGrip) : 1.04);
      const baseStiff = spec.isTracked ? 11.5 : ((w.surface === "race_tarmac" ? 9.0 : (w.surface === "asphalt" ? 7.6 : 5.2)) * (psi < 16 ? 0.80 : 1.0));
      const cornerStiff = baseStiff * frontBite;

      // Pacejka-style slip-angle lateral force curve + Euler-safe low-speed velocity clamp
      const slipDenom = Math.max(Math.abs(vLong), 1.2);
      const slipAngle = Math.atan2(vLat, slipDenom);
      const pacejkaC = spec.isTracked ? 1.25 : 1.45;
      const pacejkaB = Math.max(3.8, Math.min(13.5, cornerStiff * 0.92));
      const maxLat = fN * latMu * (spec.isTracked ? 1.95 : 1.26) * frontBite * hbDriftScale;
      const rawPacejkaLat = -maxLat * Math.sin(pacejkaC * Math.atan(pacejkaB * slipAngle));
      const maxStopLat = (Math.abs(vLat) * (fN / 9.81) / Math.max(dt, 0.004)) * 0.65;
      let fLat = Math.abs(rawPacejkaLat) > maxStopLat ? Math.sign(rawPacejkaLat) * maxStopLat : rawPacejkaLat;

      // Combined Kamm friction circle clamp so braking+turning & trail-braking feel natural
      if (maxLong > 0.01 && maxLat > 0.01) {
        const combined = Math.hypot(fLong / maxLong, fLat / maxLat);
        if (combined > 1.0) {
          const invComb = 1.0 / combined;
          fLong *= invComb;
          fLat *= invComb;
        }
      }

      const fWorld = this._fWorld.copy(up).multiplyScalar(fN)
        .addScaledVector(wFwd, fLong)
        .addScaledVector(wRight, fLat);
      totalForce.add(fWorld);

      const leverArm = this._tmpV1.copy(rWorld).sub(cogShift);
      const wheelTorque = this._tmpV2.crossVectors(leverArm, fWorld);
      totalTorque.add(wheelTorque);

      const rollOmega = vLong / wheelRad;
      if (isDriven && wSlip > 0.02 && this.engineRunning && this.gear !== 0 && !launchHeld) {
        const slipOmega = driveSign * Math.max(Math.abs(rollOmega) * (1.0 + wSlip * 0.75), engineWheelOmega);
        w.spinAngle += (rollOmega + (slipOmega - rollOmega) * wSlip) * dt;
      } else if (handbrake && isRear) {
        w.spinAngle += rollOmega * 0.08 * dt;
      } else {
        w.spinAngle += rollOmega * dt;
      }
    }

    const rawSlip = (drivenGroundedCnt > 0 && this.engineRunning && this.gear !== 0 && !launchHeld && throttle > 0.08)
      ? (drivenSlipSum / drivenGroundedCnt)
      : 0;
    this.wheelSlipRatio += (rawSlip - this.wheelSlipRatio) * Math.min(1, dt * (rawSlip > this.wheelSlipRatio ? 7.5 : 5.5));
    if (this.wheelSlipRatio < 0.001) this.wheelSlipRatio = 0;

    this.currentSurface = dominantSurface;
    const latDrift = (groundedWheels > 0 && this.speedKmh > 14)
      ? Math.min(1.0, Math.max(0, (Math.abs(latSpeed) - 1.4) / 6.5))
      : 0;
    const targetDrift = Math.min(1.0, Math.max(latDrift, this.wheelSlipRatio * 0.85));
    this.driftIntensity += (targetDrift - this.driftIntensity) * Math.min(1, dt * 8.0);

    this.inWaterDepth = maxWater;
    const speedSq = this.vel.lengthSq();
    if (speedSq > 0.01) {
      const aeroCd = (spec.id === "uaz452" || spec.id === "kamaz" || spec.id === "humvee") ? 0.78 : ((spec.id === "wrx" || spec.id === "evo" || spec.id === "gtr_r35") ? 0.34 : 0.55);
      const airDrag = aeroCd * (spec.bodyWidth * spec.bodyHeight);
      const waterDrag = maxWater > 0.1 ? (maxWater * (spec.isTracked ? 185 : 480)) : 0;
      const spd = Math.sqrt(speedSq);
      const dragMag = -(airDrag * speedSq + waterDrag * spd);
      totalForce.addScaledVector(this.vel, dragMag / spd);
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
        const tiltAxis = this._tmpV1.crossVectors(up, this._upAxis);
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
        if (anchor && typeof anchor.set === "function") {
          anchor.set(rp.gx, rp.gy + 0.8, rp.gz);
        } else {
          anchor = new THREE.Vector3(rp.gx, rp.gy + 0.8, rp.gz);
          this.winch.anchorPos = anchor;
        }
      }
      if (anchor) {
        const localAtt = this.winch.localAttach || this._tmpV3.set(0, 0.6, spec.bodyLen * 0.5);
        const winchOrigin = this._tmpV1.copy(localAtt).applyQuaternion(this.quat).add(this.pos);
        const diff = this._tmpV2.copy(anchor).sub(winchOrigin);
        const dist = diff.length();
        const maxReach = upg.hdWinch ? 120 : 55;
        if (dist > maxReach + 12) {
          this.winch.active = false; this.emit("toast", "Winch cable snapped (overstretched)!");
        } else {
          if (this.winch.reeling < 0) this.winch.length = Math.max(2.2, this.winch.length - (upg.hdWinch ? 28.0 : 18.0) * dt);
          else if (this.winch.reeling > 0) this.winch.length = Math.min(maxReach, this.winch.length + 14.0 * dt);
          const isComradeWinch = !!this.winch.targetPeerId;
          if (isComradeWinch) {
            // SMART COMRADE RECOVERY: Reeling [T] pulls your COMRADE toward YOU!
            if (this.winch.reeling < 0 || dist > this.winch.length + 0.6) {
              const pullForce = upg.hdWinch ? 52.0 : 35.0;
              this.emit("winch_pull_peer", {
                targetPeerId: this.winch.targetPeerId,
                px: this.pos.x, py: this.pos.y + 0.8, pz: this.pos.z,
                strength: pullForce * dt
              });
              if (!handbrake && this.speedKmh < 8) {
                this.vel.x *= Math.max(0.5, 1.0 - dt * 5.0);
                this.vel.z *= Math.max(0.5, 1.0 - dt * 5.0);
              } else if (!handbrake && dist > this.winch.length && dist > 0.001) {
                const gentleMag = Math.min(6500, (dist - this.winch.length) * 2400);
                totalForce.addScaledVector(diff, gentleMag / dist);
              }
            }
          } else if (dist > this.winch.length && dist > 0.001) {
            const stretch = dist - this.winch.length;
            const pullStrength = upg.hdWinch ? 180000 : 98000;
            const fMag = Math.min(pullStrength, stretch * 36000 + (this.winch.reeling < 0 ? pullStrength * 0.80 : 0));
            const fWinch = this._tmpV3.copy(diff).multiplyScalar(fMag / dist);
            totalForce.add(fWinch);
            const wArm = this._tmpV1.sub(this.pos);
            const wTrq = this._tmpV2.crossVectors(wArm, fWinch);
            totalTorque.addScaledVector(wTrq, 0.82);
          }
        }
      }
    }

    const prevVel = this._prevVel.copy(this.vel);
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

    const invQuat = this._invQuat.copy(this.quat).invert();
    const localTorque = this._tmpV1.copy(totalTorque).applyQuaternion(invQuat);
    const worldAngAccel = this._tmpV2.set(localTorque.x / Ix, localTorque.y / Iy, localTorque.z / Iz).applyQuaternion(this.quat);
    // REAL TRACKED TANK NEUTRAL-PIVOT SKID-STEERING (Rotate cleanly in place or at low speed!)
    if (spec.isTracked && groundedWheels >= 4 && this.engineRunning && Math.abs(input.steer || 0) > 0.05) {
      const steerIn = input.steer;
      const pivotRate = Math.abs(fwdSpeed) < 3.5 ? 1.05 : (0.85 / (1.0 + Math.abs(fwdSpeed) * 0.06));
      const targetYaw = steerIn * (fwdSpeed < -0.5 ? -pivotRate : pivotRate);
      this.angVel.y += (targetYaw - this.angVel.y) * Math.min(1, dt * 5.2);
      // Spin opposite tracks in opposite directions during neutral pivot!
      if (Math.abs(fwdSpeed) < 2.2) {
        for (let i = 0; i < this.wheels.length; i++) {
          const w = this.wheels[i];
          w.spinAngle += (w.def.x < 0 ? -steerIn : steerIn) * 3.8 * dt;
        }
      }
    }

    if (groundedWheels >= 2 && Math.abs(fwdSpeed) > 2.0) {
      const steerInput = input.steer || 0;
      const isStraight = Math.abs(steerInput) < 0.05 && !handbrake;
      if (isStraight) {
        const gyroK = (spec.driveType === "AWD_FULL" ? 6.2 : (spec.agileSteer ? 4.4 : 3.4));
        this.angVel.y *= Math.exp(-gyroK * dt);
        if (Math.abs(latSpeed) > 0.15 && Math.abs(latSpeed) < 6.0) {
          const stabF = -latSpeed * mass * (spec.driveType === "AWD_FULL" ? 1.5 : 0.9);
          this.vel.addScaledVector(right, (stabF / mass) * dt);
        }
      } else if (Math.abs(steerInput) >= 0.05) {
        // Gently dialed back yaw boost now that Pacejka slip-angle tires bite naturally
        const tvGain = spec.driveType === "AWD_FULL" ? 0.95 : (spec.agileSteer ? 0.75 : 0.42);
        const dirSign = fwdSpeed >= 0 ? 1 : -1;
        const spdRamp = Math.min(1.0, Math.abs(fwdSpeed) / 14.0) / (1.0 + Math.abs(fwdSpeed) * 0.022);
        const targetYawBoost = this.steerAngle * dirSign * spdRamp * tvGain;
        this.angVel.y += (targetYawBoost - this.angVel.y) * Math.min(1, dt * 1.65);
      }
    }

    this.angVel.addScaledVector(worldAngAccel, dt);
    this.lastGroundedWheels = groundedWheels;
    if (groundedWheels > 0) {
      vs.odometerM = (vs.odometerM || 0) + Math.abs(fwdSpeed) * dt;
      // v16.9 GT-R R35 ATTESA E-TS PRO Active Yaw Torque Vectoring (dialed back to complement natural tire grip)
      if (isGtrAttesa && Math.abs(this.steerAngle) > 0.02 && this.speedKmh > 20) {
        const dirSignA = fwdSpeed >= 0 ? 1 : -1;
        const steerNorm = Math.max(-1.0, Math.min(1.0, this.steerAngle / 0.32));
        const spdCurve = Math.min(1.0, (this.speedKmh - 18) / 45);
        const targetAttesaYaw = steerNorm * dirSignA * (1.05 + Math.min(0.85, this.speedKmh / 155)) * spdCurve;
        this.angVel.y += (targetAttesaYaw - this.angVel.y) * Math.min(1, dt * 4.2);
        const apexPull = -steerNorm * Math.min(8.5, this.speedKmh * 0.040) * spdCurve;
        this.vel.addScaledVector(right, apexPull * dt);
      }
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
      const axis = this._tmpV1.copy(this.angVel).divideScalar(angSpeed);
      this._dq.setFromAxisAngle(axis, angSpeed * dt);
      this.quat.premultiply(this._dq).normalize();
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
        const tankArmor = spec.isSchreckensfurst ? 0.14 : (spec.isTracked ? 0.24 : 1.0);
        const bullShield = ((upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.35 : 1.0) * tankArmor;

        // DESTRUCTIBLE TREES: Tanks crush straight through trees at 16 km/h with near-zero damage!
        const smashSpd = spec.isTracked ? 4.5 : ((mass > 2500 || (upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar))) ? 8.2 : 13.0);
        if (c.kind === "tree" && impactSpd >= smashSpd) {
          c.broken = true;
          this.vel.x *= spec.isTracked ? 0.94 : 0.80;
          this.vel.z *= spec.isTracked ? 0.94 : 0.80;
          const treeDmg = Math.min(18, impactSpd * 0.72 * bullShield);
          this._wearPart("radiator", treeDmg * (spec.isTracked ? 0.15 : 0.45));
          this._wearPart("intercooler", treeDmg * (spec.isTracked ? 0.15 : 0.30));
          hlth.body = Math.max(0, hlth.body - treeDmg * 0.65);
          if (!spec.isTracked) this.damageHeadlights(treeDmg * 1.4, (forward.x * nz - forward.z * nx));
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
            if (impactSpd > 8.5) {
              const prevGl = hlth.glass !== undefined ? hlth.glass : 100;
              hlth.glass = Math.max(0, prevGl - hitDmg * 1.45);
              if (!this.spec.isTracked && prevGl >= 55 && hlth.glass < 55) this.emit("toast", "💥 WINDSHIELD CRACKED ON IMPACT!");
            }
            if (impactSpd > 10.5) {
              this._wearPart("shockFL", hitDmg * 0.55);
              this._wearPart("shockFR", hitDmg * 0.55);
              this._wearPart("tieRods", hitDmg * (spec.isTracked ? 0.25 : 0.65));
              if (isRock && !spec.isTracked && Math.random() < 0.45 * bullShield) {
                hlth.tieRodBias = Math.max(-0.18, Math.min(0.18, hlth.tieRodBias + (Math.random() - 0.5) * 0.08));
              }
              if (isRock && impactSpd > 13.5) {
                const hitCorner = sideSign >= 0 ? 1 : 0;
                this._damageTire(hitCorner, hitDmg * 2.2, "boulder");
              }
            }
            hlth.body = Math.max(0, hlth.body - hitDmg * 0.95);
            if (!spec.isTracked || impactSpd > 14.0) this.damageHeadlights(hitDmg * (spec.isTracked ? 0.45 : 1.6), sideSign);
            this.emit("impact", Math.min(1.0, impactSpd / 16));
            if (this.tutorialSensitiveDmg && impactSpd > 2.8) { this._wearPart("radiator", 16); this.emit("tutorial_first_dmg"); }
            this.emit("crash_burst", { x: c.x, y: c.y + 0.6, z: c.z, strength: Math.min(1.5, impactSpd / 11), surface: isRock ? "rock" : "gravel" });
            if (impactSpd > 10.0 && !spec.isTracked) {
              this.emit("toast", isRock ? `BRUTAL BOULDER SLAM (-${Math.round(hitDmg)}% front-end)!` : "THUD! Hit a tree — hit it >48 km/h to smash through!");
            }
          }
        }
      }
    }

    // 1B. BREAKABLE ROADSIDE FENCES & GUARDRAILS (v15.1.8 Exact Thin OBB Hitbox!)
    if (world.activeFences && world.activeFences.length > 0) {
      const fVehRad = spec.bodyWidth * 0.44;
      const fList = world.activeFences;
      for (let fi = 0; fi < fList.length; fi++) {
        const fn = fList[fi];
        if (fn.broken) continue;
        const dx = this.pos.x - fn.x, dz = this.pos.z - fn.z;
        const broad = fVehRad + (fn.halfLen || 2.65) + 0.5;
        if (Math.abs(dx) > broad || Math.abs(dz) > broad) continue;
        if (Math.abs(this.pos.y - fn.y) > 2.2) continue;

        // Transform vehicle offset into fence's local (along-rail, perpendicular) coordinates!
        const ux = fn.ux !== undefined ? fn.ux : 1;
        const uz = fn.uz !== undefined ? fn.uz : 0;
        const hLen = fn.halfLen || 2.65;
        const hThk = fn.halfThick || 0.16;
        const along = dx * ux + dz * uz;
        const perp  = -dx * uz + dz * ux;
        const clA = Math.max(-hLen, Math.min(hLen, along));
        const clP = Math.max(-hThk, Math.min(hThk, perp));
        const offA = along - clA, offP = perp - clP;
        const d2 = offA * offA + offP * offP;
        if (d2 >= fVehRad * fVehRad) continue;

        const curSpd = Math.hypot(this.vel.x, this.vel.z);
        if (curSpd > 2.8) {
          // SMASH straight through the wooden ranch fence or metal guardrail!
          fn.broken = true;
          const dragKeep = fn.isMetal ? 0.88 : 0.94;
          this.vel.x *= dragKeep;
          this.vel.z *= dragKeep;
          const fDmg = (fn.isMetal ? 3.5 : 1.2) * ((upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.25 : 1.0);
          hlth.body = Math.max(0, hlth.body - fDmg);
          this.emit("fence_break", { fenceId: fn.id, isMetal: fn.isMetal, x: fn.x, y: fn.y, z: fn.z, dirX: this.vel.x, dirZ: this.vel.z });
          this.emit("crash_burst", { x: fn.x, y: fn.y + 0.7, z: fn.z, strength: 0.45, surface: "gravel" });
        } else {
          // Gentle slow bump pushes car cleanly off the thin rail normal!
          const d = Math.sqrt(d2);
          let nxW = -uz * (perp >= 0 ? 1 : -1), nzW = ux * (perp >= 0 ? 1 : -1);
          if (d > 0.001) {
            const locNx = offA / d, locNp = offP / d;
            nxW = locNx * ux - locNp * uz;
            nzW = locNx * uz + locNp * ux;
          }
          const pen = Math.max(0.05, (fVehRad - d) * 0.55);
          this.pos.x += nxW * pen;
          this.pos.z += nzW * pen;
          this.vel.x *= 0.65; this.vel.z *= 0.65;
        }
      }
    }

    // 1B. v15.4.3 SOLID CLOSED SHIP RAMP & CARGO BULWARK COLLISIONS!
    if (world.boatsRef && world.boatsRef.resolveDeckWallCollisions) {
      const dHit = world.boatsRef.resolveDeckWallCollisions(this);
      if (dHit && dHit.hitWall && this.lastImpactFx <= 0) {
        this.lastImpactFx = 0.45;
        this._hitClosedRampFlag = !!dHit.hitRamp;
      }
    }

    // 1C. v15.0.1 SOLID BUILDING, HOUSE, SKYSCRAPER, PORT & REACTOR COLLISIONS!
    const bList = world.getNearbyBuildingColliders
      ? world.getNearbyBuildingColliders(this.pos.x, this.pos.z)
      : world.buildingColliders;
    if (bList && bList.length > 0) {
      const bRad = Math.max(spec.bodyWidth, spec.bodyLen * 0.45) * 0.50;
      const tankArmB = spec.isSchreckensfurst ? 0.16 : (spec.isTracked ? 0.28 : 1.0);
      for (let bi = 0; bi < bList.length; bi++) {
        const b = bList[bi];
        if (this.pos.x + bRad < b.minX || this.pos.x - bRad > b.maxX) continue;
        if (this.pos.z + bRad < b.minZ || this.pos.z - bRad > b.maxZ) continue;
        if (this.pos.y + 1.8 < b.yMin || this.pos.y > b.yMax) continue;

        const cx = Math.max(b.minX, Math.min(this.pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(this.pos.z, b.maxZ));
        const dx = this.pos.x - cx;
        const dz = this.pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= bRad * bRad) continue;

        let nx = 0, nz = 1, pen = 0;
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          nx = dx / d; nz = dz / d;
          pen = bRad - d;
        } else {
          const dl = Math.abs(this.pos.x - b.minX), dr = Math.abs(b.maxX - this.pos.x);
          const df = Math.abs(this.pos.z - b.minZ), db = Math.abs(b.maxZ - this.pos.z);
          const m = Math.min(dl, dr, df, db);
          if (m === dl) { nx = -1; nz = 0; pen = dl + bRad; }
          else if (m === dr) { nx = 1; nz = 0; pen = dr + bRad; }
          else if (m === df) { nx = 0; nz = -1; pen = df + bRad; }
          else { nx = 0; nz = 1; pen = db + bRad; }
        }

        this.pos.x += nx * (pen + 0.02);
        this.pos.z += nz * (pen + 0.02);
        const vDotN = this.vel.x * nx + this.vel.z * nz;
        if (vDotN < 0) {
          const impactSpd = -vDotN;
          this.vel.x -= 1.32 * vDotN * nx;
          this.vel.z -= 1.32 * vDotN * nz;
          this.vel.x *= 0.72;
          this.vel.z *= 0.72;
          if (impactSpd > 3.8 && this.treeHitCooldown <= 0) {
            this.treeHitCooldown = 0.45;
            const bDmg = Math.min(34, (impactSpd - 2.5) * 1.75 * ((upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.45 : 1.0) * tankArmB);
            hlth.body = Math.max(0, hlth.body - bDmg * 0.85);
            this._wearPart("radiator", bDmg * 0.55);
            if (!spec.isTracked) this.damageHeadlights(bDmg * 1.4, 0);
            this.emit("impact", Math.min(1.0, impactSpd / 15));
            this.emit("crash_burst", { x: cx, y: this.pos.y + 0.8, z: cz, strength: Math.min(1.4, impactSpd / 12), surface: "rock" });
          }
        }
      }
    }

    // 2. MULTIPLAYER CAR-TO-CAR & ARMORED VEHICLE RAMMING COLLISIONS!
    if (remotePlayersMap && remotePlayersMap.size > 0) {
      const myRad = Math.max(spec.bodyWidth, spec.bodyLen * 0.56) * 0.50;
      const myTier = this.getArmorTier(spec);
      for (const rp of remotePlayersMap.values()) {
        if (!rp || rp.onFoot) continue;
        const rSpec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
        const otherRad = Math.max(rSpec.bodyWidth, rSpec.bodyLen * 0.56) * 0.50;
        const dx = this.pos.x - rp.gx;
        const dy = this.pos.y - rp.gy;
        const dz = this.pos.z - rp.gz;
        const sumR = myRad + otherRad;
        if (Math.abs(dx) > sumR || Math.abs(dz) > sumR || Math.abs(dy) > 2.8) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= sumR * sumR || d2 < 0.001) continue;

        const d = Math.sqrt(d2);
        const nx = dx / d, nz = dz / d;
        const pen = sumR - d;
        const otherTier = this.getArmorTier(rSpec);
        const otherMass = rSpec.massKg || 2000;
        const totalM = mass + otherMass;
        const myShare = otherMass / totalM;
        const otherShare = mass / totalM;
        const isArmoredClash = (myTier >= 2 || otherTier >= 2);
        const penShare = isArmoredClash ? Math.max(0.10, Math.min(0.92, myShare * 1.12)) : 0.55;
        this.pos.x += nx * pen * penShare;
        this.pos.z += nz * pen * penShare;

        const rvx = rp.vx || 0, rvz = rp.vz || 0;
        const relVx = this.vel.x - rvx;
        const relVz = this.vel.z - rvz;
        const relDotN = relVx * nx + relVz * nz;
        const tx = -nz, tz = nx;
        const relDotT = relVx * tx + relVz * tz;

        // Continuous metallic grind sparks when armored hulls rub together at speed
        if (isArmoredClash && Math.abs(relDotT) > 4.2 && this.lastImpactFx <= 0) {
          this.lastImpactFx = 0.14;
          const midX = (this.pos.x + rp.gx) * 0.5;
          const midZ = (this.pos.z + rp.gz) * 0.5;
          this.emit("rim_spark", { x: midX, y: this.pos.y + 0.85, z: midZ });
          this.emit("rim_spark", { x: midX + tx * 0.35, y: this.pos.y + 0.65, z: midZ + tz * 0.35 });
        }

        if (relDotN < 0) {
          const impactMag = -relDotN;
          const sideSpin = (forward.x * nz - forward.z * nx);
          const dotFwdN = forward.x * nx + forward.z * nz;
          const rightDotN = right.x * nx + right.z * nz;
          const sideHitFactor = 1.0 - Math.abs(dotFwdN);

          let e = 1.38;
          let localImpulseMult = 1.0;
          let remoteShoveMult = 1.15;
          let localHop = Math.min(4.5, impactMag * 0.14 * myShare);
          let remoteHop = Math.min(6.5, impactMag * 0.22 * otherShare);
          let localYawKick = sideSpin * Math.min(4.5, impactMag * 0.24);
          let remoteYawKick = -sideSpin * Math.min(5.0, impactMag * 0.30);

          if (myTier >= 2 && otherTier === 1) {
            // Tank/APC plowing through a light civilian car: low restitution, minimal recoil, violent shove to lighter car!
            e = 1.08;
            localImpulseMult = (myTier === 3) ? 0.85 : 0.95;
            remoteShoveMult = (myTier === 3) ? 1.55 : 1.35;
            localHop = Math.min(myTier === 3 ? 0.55 : 1.1, impactMag * 0.03 * myShare);
            remoteHop = Math.min(7.5, impactMag * 0.30 * otherShare);
            localYawKick = sideSpin * Math.min(1.1, impactMag * 0.07 * Math.max(0.25, myShare * 2.0));
            remoteYawKick = -sideSpin * Math.min(7.2, impactMag * 0.46 * Math.max(0.6, otherShare));
          } else if (myTier === 1 && otherTier >= 2) {
            // Light civilian car hit by or slamming into a Tank/APC: violent crunch & spin!
            e = 1.08;
            localImpulseMult = (otherTier === 3) ? 1.24 : 1.14;
            remoteShoveMult = 0.90;
            localHop = Math.min(6.2, impactMag * 0.25 * myShare);
            remoteHop = Math.min(0.8, impactMag * 0.04 * otherShare);
            localYawKick = sideSpin * Math.min(6.4, impactMag * 0.40);
            remoteYawKick = -sideSpin * Math.min(1.4, impactMag * 0.10 * Math.max(0.2, otherShare));
          } else if (myTier >= 2 && otherTier >= 2) {
            // Tank vs Tank / Armored vs Armored: realistic heavy low-bounce metallic grind & mass-weighted momentum!
            e = 1.12;
            localImpulseMult = 1.0;
            remoteShoveMult = 1.02;
            localHop = Math.min(1.4, impactMag * 0.045 * myShare);
            remoteHop = Math.min(1.4, impactMag * 0.045 * otherShare);
            // Tangential metallic grind damping
            const scrapeImp = Math.sign(relDotT) * Math.min(Math.abs(relDotT) * 0.28, impactMag * 0.22) * myShare;
            this.vel.x -= tx * scrapeImp;
            this.vel.z -= tz * scrapeImp;
            const glanceYaw = (sideSpin * Math.min(2.6, impactMag * 0.16) + Math.max(-1.6, Math.min(1.6, relDotT * 0.08))) * Math.max(0.35, myShare * 1.45);
            localYawKick = glanceYaw;
            remoteYawKick = -sideSpin * Math.min(2.8, impactMag * 0.18) * Math.max(0.35, otherShare * 1.45);
          }

          this.vel.x += nx * impactMag * e * myShare * localImpulseMult;
          this.vel.z += nz * impactMag * e * myShare * localImpulseMult;
          this.vel.y += localHop;
          this.angVel.y += localYawKick;

          if (impactMag > 2.2 && this.carHitCooldown <= 0) {
            this.carHitCooldown = 0.28;
            const bullShield = (upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.35 : 1.0;
            const midX = (this.pos.x + rp.gx) * 0.5;
            const midY = this.pos.y + 0.85;
            const midZ = (this.pos.z + rp.gz) * 0.5;

            if (myTier >= 2 && otherTier === 1) {
              // Armored rig vs civilian car: tiny armor scratch (* 0.08 for Heavy MBT)
              const scratchScale = (myTier === 3) ? 0.08 : 0.14;
              const dmg = Math.min(8, impactMag * 0.9 * scratchScale * bullShield);
              hlth.body = Math.max(0, hlth.body - dmg);
              this._wearPart("radiator", dmg * 0.12);
              if (!spec.isTracked && impactMag > 12.0) this.damageHeadlights(dmg * 0.8, sideSpin);
            } else if (myTier === 1 && otherTier >= 2) {
              // Light civilian car crunched by Tank/APC: heavy body, radiator, headlight & tire pinch damage!
              const dmg = Math.min(44, impactMag * (otherTier === 3 ? 2.35 : 1.75) * bullShield);
              hlth.body = Math.max(0, hlth.body - dmg);
              this._wearPart("radiator", dmg * 0.55);
              this._wearPart("intercooler", dmg * 0.35);
              this.damageHeadlights(dmg * 2.0, sideSpin);
              if (impactMag > 8.0) {
                const prevGlR = hlth.glass !== undefined ? hlth.glass : 100;
                hlth.glass = Math.max(0, prevGlR - dmg * 0.95);
                if (!this.spec.isTracked && prevGlR >= 55 && hlth.glass < 55) this.emit("toast", "💥 WINDSHIELD SHATTERED BY ARMORED COLLISION!");
              }
              if (impactMag > 6.5 && this.wheels.length > 0) {
                const isFrontImpact = dotFwdN < 0.15;
                const isLeftSide = rightDotN >= 0;
                let wIdx = isFrontImpact ? (isLeftSide ? 0 : 1) : (isLeftSide ? Math.max(0, this.wheels.length - 2) : this.wheels.length - 1);
                if (wIdx >= this.wheels.length) wIdx = 0;
                this._damageTire(wIdx, dmg * 1.45, "armor_ram");
              }
            } else if (myTier >= 2 && otherTier >= 2) {
              // Tank vs Tank / Armored vs Armored: steel crunch + side/high-speed track stress!
              const tierDmgMult = (myTier === 3 && otherTier === 2) ? 0.28 : ((myTier === 2 && otherTier === 3) ? 1.15 : 0.58);
              const sturmBladeMult = (spec.isSchreckensfurst && upg.sturmKit && dotFwdN < -0.35) ? 0.45 : 1.0;
              const eraRamMult = upg.t72Kontakt5 ? 0.78 : 1.0;
              const dmg = Math.min(28, impactMag * 0.88 * tierDmgMult * sturmBladeMult * eraRamMult);
              hlth.body = Math.max(0, hlth.body - dmg);
              this._wearPart("radiator", dmg * 0.24);
              this._wearPart("gearboxGears", dmg * 0.20);
              if (!spec.isTracked) {
                this.damageHeadlights(dmg * 0.85, sideSpin);
                if (otherTier === 3 && impactMag > 8.5 && this.wheels.length > 0) {
                  const isLeftSide = rightDotN >= 0;
                  const wIdx = (dotFwdN < 0.15) ? (isLeftSide ? 0 : 1) : (isLeftSide ? Math.max(0, this.wheels.length - 2) : this.wheels.length - 1);
                  this._damageTire(Math.min(this.wheels.length - 1, wIdx), dmg * 1.1, "armor_ram");
                }
              } else if (sideHitFactor > 0.35 || impactMag > 9.0) {
                // Hard side-ram or high-speed armored collision wears exposed tank tracks!
                const massRatio = Math.max(0.45, Math.min(2.2, otherMass / Math.max(1000, mass)));
                const trackDmg = Math.min(34, (impactMag - 1.8) * (sideHitFactor > 0.35 ? 1.85 : 0.95) * massRatio * (spec.isSchreckensfurst ? 0.55 : 1.0));
                if (trackDmg > 1.0) {
                  const prevL = hlth.trackL !== undefined ? hlth.trackL : 100;
                  const prevR = hlth.trackR !== undefined ? hlth.trackR : 100;
                  if (rightDotN > 0.15) {
                    hlth.trackL = Math.max(0, prevL - trackDmg);
                    if (prevL >= 15 && hlth.trackL < 15) this.emit("toast", "💥 LEFT TRACK SNAPPED IN ARMORED RAM! Field Repair [X]!");
                  } else if (rightDotN < -0.15) {
                    hlth.trackR = Math.max(0, prevR - trackDmg);
                    if (prevR >= 15 && hlth.trackR < 15) this.emit("toast", "💥 RIGHT TRACK SNAPPED IN ARMORED RAM! Field Repair [X]!");
                  } else {
                    hlth.trackL = Math.max(0, prevL - trackDmg * 0.55);
                    hlth.trackR = Math.max(0, prevR - trackDmg * 0.55);
                    if ((prevL >= 15 && hlth.trackL < 15) || (prevR >= 15 && hlth.trackR < 15)) {
                      this.emit("toast", "💥 TRACK SNAPPED IN HIGH-SPEED ARMORED RAM! Field Repair [X]!");
                    }
                  }
                }
              }
            } else {
              // Civilian vs Civilian: classic multiplayer metal crunch!
              const dmg = Math.min(20, impactMag * 0.9 * bullShield);
              hlth.body = Math.max(0, hlth.body - dmg);
              this._wearPart("radiator", dmg * 0.35);
              this.damageHeadlights(dmg * 1.5, sideSpin);
            }

            // Send opposing ram impulse straight to your friend's PC over LAN!
            this.emit("vehicle_ram", {
              targetPeerId: rp.peerId,
              callsign: rp.callsign,
              dvx: +(-nx * impactMag * e * otherShare * remoteShoveMult).toFixed(2),
              dvy: +remoteHop.toFixed(2),
              dvz: +(-nz * impactMag * e * otherShare * remoteShoveMult).toFixed(2),
              spin: +remoteYawKick.toFixed(2)
            });
            this.emit("impact", Math.min(1.0, impactMag / (isArmoredClash ? 12 : 14)));
            this.emit("crash_burst", { x: midX, y: midY, z: midZ, strength: Math.min(1.5, impactMag / (isArmoredClash ? 8.5 : 10)), surface: "rock" });
            if (isArmoredClash) {
              const sparkCnt = Math.min(6, Math.max(2, Math.round(impactMag * 0.45)));
              for (let si = 0; si < sparkCnt; si++) {
                this.emit("rim_spark", {
                  x: midX + (Math.random() - 0.5) * 0.9,
                  y: midY + (Math.random() - 0.3) * 0.6,
                  z: midZ + (Math.random() - 0.5) * 0.9
                });
              }
              this.emit("armor_ram", {
                impactMag: +impactMag.toFixed(2),
                myTier,
                otherTier,
                targetCallsign: rp.callsign
              });
            } else if (impactMag > 7.5) {
              this.emit("toast", `CRASH!! You slammed into ${rp.callsign}!`);
            }
          }
        }
      }
    }

    // 2B. ZOLOTOY CITY ARTICULATED ELECTRIC TRAM PHYSICS COLLISION (36-Ton Steel Railcar!)
    if (world.tramState && world.tramState.mesh) {
      const tr = world.tramState;
      const dx = this.pos.x - tr.gx;
      const dz = this.pos.z - tr.gz;
      if (Math.abs(dx) < 18.0 && Math.abs(dz) < 18.0 && Math.abs(this.pos.y - tr.gy) < 4.5) {
        const yaw = tr.yaw || 0;
        const tFwdX = Math.sin(yaw), tFwdZ = Math.cos(yaw);
        const tRgtX = Math.cos(yaw), tRgtZ = -Math.sin(yaw);
        const relX = dx * tRgtX + dz * tRgtZ;
        const relZ = dx * tFwdX + dz * tFwdZ;
        const vehRadT = Math.max(spec.bodyWidth, spec.bodyLen * 0.46) * 0.48;
        const hx = (tr.halfWidth || 1.45) + vehRadT;
        const hz = (tr.halfLen || 11.8) + vehRadT;
        if (Math.abs(relX) < hx && Math.abs(relZ) < hz) {
          const penX = hx - Math.abs(relX);
          const penZ = hz - Math.abs(relZ);
          let locNx = 0, locNz = 0, pen = 0;
          if (penX < penZ) {
            locNx = relX >= 0 ? 1 : -1;
            pen = penX + 0.08;
          } else {
            locNz = relZ >= 0 ? 1 : -1;
            pen = penZ + 0.08;
          }
          const nx = locNx * tRgtX + locNz * tFwdX;
          const nz = locNx * tRgtZ + locNz * tFwdZ;
          this.pos.x += nx * pen;
          this.pos.z += nz * pen;

          const tramSpd = (tr.curSpeed !== undefined) ? tr.curSpeed : (tr.speed || 0);
          const tvx = tFwdX * tramSpd;
          const tvz = tFwdZ * tramSpd;
          const relVx = this.vel.x - tvx;
          const relVz = this.vel.z - tvz;
          const relDotN = relVx * nx + relVz * nz;
          if (relDotN < 0) {
            const tramMass = 36000;
            const myShare = tramMass / (mass + tramMass);
            const impactMag = -relDotN;
            const myTier = this.getArmorTier(spec);
            const eTram = (myTier >= 2) ? 1.12 : 1.18;
            this.vel.x += nx * impactMag * eTram * myShare;
            this.vel.z += nz * impactMag * eTram * myShare;
            this.vel.y += Math.min(myTier >= 2 ? 1.2 : 3.6, impactMag * (myTier >= 2 ? 0.05 : 0.16) * myShare);
            const sideSpinT = (forward.x * nz - forward.z * nx);
            this.angVel.y += sideSpinT * Math.min(myTier >= 2 ? 2.2 : 4.8, impactMag * (myTier >= 2 ? 0.14 : 0.28) * myShare);

            if (impactMag > 2.4 && this.tramHitCooldown <= 0) {
              this.tramHitCooldown = 0.40;
              const bullShield = (upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.40 : 1.0;
              const armorScale = (myTier === 3) ? 0.25 : ((myTier === 2) ? 0.55 : 1.35);
              const tDmg = Math.min(34, impactMag * 1.15 * armorScale * bullShield);
              hlth.body = Math.max(0, hlth.body - tDmg);
              this._wearPart("radiator", tDmg * 0.35);
              if (!spec.isTracked) this.damageHeadlights(tDmg * 1.4, sideSpinT);
              const hitX = this.pos.x - nx * vehRadT;
              const hitZ = this.pos.z - nz * vehRadT;
              this.emit("impact", Math.min(1.0, impactMag / 13));
              this.emit("crash_burst", { x: hitX, y: this.pos.y + 0.85, z: hitZ, strength: Math.min(1.4, impactMag / 10), surface: "rock" });
              for (let si = 0; si < 3; si++) {
                this.emit("rim_spark", { x: hitX + (Math.random() - 0.5) * 0.6, y: this.pos.y + 0.8, z: hitZ + (Math.random() - 0.5) * 0.6 });
              }
              if (myTier >= 2) {
                this.emit("armor_ram", { impactMag: +impactMag.toFixed(2), myTier, otherTier: 2, targetCallsign: "Zolotoy Electric Tram" });
              } else if (impactMag > 5.0) {
                this.emit("toast", "🚊 CRUNCH! Clear the rails — Zolotoy Electric Tram coming through!");
              }
            }
          }
        }
      }
    }

    // 2C. 6-LANE SAVANNA MEGA-BRIDGE STEEL GUARDRAIL SAFETY CLAMP (Safe 250+ km/h Crossing!)
    if (world.getMegaBridgeInfo) {
      const mb = world.getMegaBridgeInfo(this.pos.x, this.pos.z);
      if (mb && (mb.onDeck || mb.onApproach)) {
        const halfW = mb.halfWidth || 16.0;
        const maxLat = Math.max(2.0, halfW - spec.bodyWidth * 0.55);
        if (Math.abs(mb.latOffset) > maxLat && this.pos.y >= mb.deckY - 2.0 && this.pos.y <= mb.deckY + 4.0) {
          const rx = (mb.rightX !== undefined) ? mb.rightX : (-mb.dirZ || 0);
          const rz = (mb.rightZ !== undefined) ? mb.rightZ : (mb.dirX || 0);
          if (rx * rx + rz * rz > 0.01) {
            const sideSign = mb.latOffset >= 0 ? 1 : -1;
            const excess = Math.abs(mb.latOffset) - maxLat;
            this.pos.x -= sideSign * rx * (excess + 0.04);
            this.pos.z -= sideSign * rz * (excess + 0.04);

            const vOut = (this.vel.x * rx + this.vel.z * rz) * sideSign;
            if (vOut > 0) {
              // Smooth low-bounce deflection off the steel outer guardrail
              const deflect = vOut * 1.14;
              this.vel.x -= sideSign * rx * deflect;
              this.vel.z -= sideSign * rz * deflect;
              // Gentle tangential rail scrape drag so 250+ km/h momentum survives a light brush
              const railDrag = Math.max(0.92, 1.0 - Math.min(0.06, vOut * 0.008));
              this.vel.x *= railDrag;
              this.vel.z *= railDrag;
            }

            // Gently self-straighten nose parallel to the bridge span if grinding into the rail at speed
            const dirX = mb.dirX || 0, dirZ = mb.dirZ || 0;
            const alongSpd = Math.abs(this.vel.x * dirX + this.vel.z * dirZ);
            if (alongSpd > 8.0 && (dirX * dirX + dirZ * dirZ) > 0.01) {
              const travelSign = (forward.x * dirX + forward.z * dirZ) >= 0 ? 1 : -1;
              const tDirX = dirX * travelSign;
              const tDirZ = dirZ * travelSign;
              const alignCrossY = forward.z * tDirX - forward.x * tDirZ;
              this.angVel.y += Math.max(-2.2, Math.min(2.2, alignCrossY * 3.0)) * Math.min(1.0, dt * 10.0);
            }

            const sparkX = this.pos.x + sideSign * rx * (spec.bodyWidth * 0.48);
            const sparkY = this.pos.y + 0.55;
            const sparkZ = this.pos.z + sideSign * rz * (spec.bodyWidth * 0.48);
            if (vOut > 4.5 && this.lastImpactFx <= 0) {
              this.lastImpactFx = 0.22;
              const railDmg = Math.min(10, (vOut - 3.0) * 0.52 * (spec.isTracked ? 0.22 : ((upg.bullbar && !(vs.stowedUpgrades && vs.stowedUpgrades.bullbar)) ? 0.45 : 1.0)));
              hlth.body = Math.max(0, hlth.body - railDmg);
              this.emit("impact", Math.min(0.85, vOut / 16));
              this.emit("crash_burst", { x: sparkX, y: sparkY, z: sparkZ, strength: Math.min(0.9, vOut / 12), surface: "rock" });
              for (let si = 0; si < 3; si++) {
                this.emit("rim_spark", { x: sparkX, y: sparkY + (Math.random() - 0.3) * 0.35, z: sparkZ });
              }
            } else if (this.speedKmh > 45 && Math.random() < dt * 28) {
              this.emit("rim_spark", { x: sparkX, y: sparkY, z: sparkZ });
            }
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
    const fPt = this._fPt.set(0, 0.22,  halfLenG).applyQuaternion(this.quat).add(this.pos);
    const rPt = this._rPt.set(0, 0.22, -halfLenG).applyQuaternion(this.quat).add(this.pos);
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

    const deltaV = this._tmpV1.copy(this.vel).sub(prevVel).length() / dt;
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
