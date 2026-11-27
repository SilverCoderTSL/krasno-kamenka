// ============================================================================
// js/main.js (v5) — Particles, Dirt, Backfire, CPM2 Branded Parts & Accounts!
// ============================================================================
window.KK = window.KK || {};

KK.Game = class Game {
  constructor() {
    this.money = 18000;
    this.ownedVehicles = { uaz452: KK.createDefaultVehicleState("uaz452") };
    this.activeVehicleId = "uaz452";
    this.stats = { deliveries: 0, distanceKm: 0.0 };
    this.claimedLandmarks = {};
    this.ownedTrailers = {};
    this.trailer = null;
    this.trailerRig = null;
    this.airTime = 0;
    this.xrayActive = false;
    this.flareCount = 6;
    this.account = null;
    this.activeContract = null;
    this.activeConvoyId = null;
    this.waypoint = { x: KK.TOWNS[1].x, z: KK.TOWNS[1].z, label: KK.TOWNS[1].name + " (Bridge Test!)" };
    this.armorViewerActive = false;
    this._armorRaycaster = new THREE.Raycaster();
    this._armorMouseNdc = new THREE.Vector2();
    this._armorMousePx = { x: 0, y: 0 };
    this.fcsLaserOn = false;
    this.lwrAlertTimer = 0;
    this.lwrAlertBearing = "";
    this.tankModules = { turretRing: 100, gunBreech: 100, gunBarrel: 100, lwsSensor: 100, secBarrel: 100 };
    this.ammoRackLIntact = true;
    this.ammoRackRIntact = true;
    this.cookoffJetTimer = 0;
    this.turretPopActive = false;
    this.turretPopY = 0;
    this.turretPopVy = 0;
    this.turretPopPitch = 0;
    this.turretPopRoll = 0;
    this._lastTurretYawForWhine = 0;
    this._turretWhineCd = 0;
    this.tutorialComplete = false;
    this._loadProgress();

    this.canvas = document.getElementById("game-canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.2, 2600);

    this.world = new KK.World(this.scene, 404911);
    this.weather = new KK.WeatherSystem(this.scene);
    this.audio = new KK.AudioEngine();
    this.particles = new KK.ParticleSystem(this.scene, this.world);

    const spawnY = this.world.getTerrainInfo(0, 0, true).height + 1.25;
    this.vehicle = new KK.VehiclePhysics(this.ownedVehicles[this.activeVehicleId], 0, spawnY, 0);
    this.vehicle.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * 0.5);

    this.vehicleRig = KK.VehicleBuilder.buildVehicle(this.activeVehicleId, this.vehicle.vState, true);
    this.scene.add(this.vehicleRig.root);

    this.onFoot = false;
    this.playerFoot = { x: 0, y: spawnY, z: 3, yaw: 0, walkPhase: 0, carryingCrate: null, repairingTimer: 0 };
    this.localAvatar = KK.VehicleBuilder.buildHumanAvatar("YOU", 0xe07a24);
    this.localAvatar.visible = false;
    this.scene.add(this.localAvatar);

    this.entities = new KK.EntityManager(this.scene, this.world);
    this.boats = new KK.BoatManager(this.scene, this.world);
    if (this.world) this.world.boatsRef = this.boats;
    this.ownedBoats = { patrol: false, strela: false, serna: false, zubr: false };
    this.activeHarborPort = null;
    this._winchPullNetCd = 0;
    this.walkingOnBoat = null;    // { boat, isRemote, ownerPeerId, lx, lz } — walkable moving deck!
    this.remoteBoatMount = null;  // { ownerPeerId, boatId, bayIdx, bx, bz, deckY } — car mounted on friend's ship!
    this._pendingCashTx = new Map();
    this.cryptids = new KK.CryptidManager(this.scene, this.world);
    this.oceanCryptids = KK.OceanCryptidManager ? new KK.OceanCryptidManager(this.scene, this.world) : null;
    this.savannaMechas = KK.SavannaMechaManager ? new KK.SavannaMechaManager(this.scene, this.world) : null;
    this.hazards = new KK.HazardManager(this.scene, this.world);
    this.clarksonFarm = new KK.ClarksonFarm(this.scene, this.world);
    this.jamesBar = new KK.JamesMayBar(this.scene, this.world);
    this.hammondMesa = new KK.HammondMesa(this.scene, this.world);
    this.milCamp = new KK.MilitaryCamp(this.scene, this.world);
    if (this.ownedVehicles && this.ownedVehicles.t72) this.milCamp.setRelicVisible(false);
    this.bm21Camp = new KK.SecretRelicSite(this.scene, this.world, "bm21");
    if (this.ownedVehicles && this.ownedVehicles.bm21) this.bm21Camp.setRelicVisible(false);
    this.shilkaCamp = new KK.SecretRelicSite(this.scene, this.world, "shilka");
    this.townNpcs = new KK.TownNPCManager(this.scene, this.world);
    this.skinwalker = new KK.SkinwalkerManager(this.scene, this.world);
    this.gasStations = new KK.GasStationManager(this.scene, this.world);
    this.guidedMissiles = [];
    this.apsFlashTimer = 0;
    this._eraCharges = { front: 2, left: 2, right: 2 };
    this._megaBridgeGhost = null;
    this._megaBridgeGhostCooldown = 0;
    this._megaBridgeGhostMsgIdx = 0;
    this._ghostEchoMessages = [
      "Hey… you really made it all the way out here. Don't forget to enjoy the drive, comrade. See you past the horizon. ✨",
      "200 km/h over the open sea — whatever you're chasing, you're already closer than you think. Keep going. ✨",
      "Same car, same road, different moment. Take a breath — you're doing great out here, comrade. ✨",
      "No cryptids, no storms — just open asphalt and salt air. Proud of how far you've come. Catch you at the city! ✨"
    ];
    if (this.ownedVehicles && this.ownedVehicles.shilka) this.shilkaCamp.setRelicVisible(false);

    this.photoMode = false;
    this._hudAccum = 0;
    this.gfxPreset = "high";
    try { const gp = localStorage.getItem("kk_gfx_preset"); if (gp && ["potato", "low", "med", "high"].includes(gp)) this.gfxPreset = gp; } catch (e) {}
    this.friendsList = {};
    try { this.friendsList = JSON.parse(localStorage.getItem("kk_friends_v1") || "{}") || {}; } catch (e) { this.friendsList = {}; }
    this.pendingScreenshot = false;
    this.turretFrozen = false;
    this.remoteDustEnabled = true;
    this.gradFireCd = 0;
    this.gradFlashTimer = 0;
    this.gradSalvoLeft = 0;
    this.gradSalvoCd = 0;
    this.rockets = [];
    this.shilkaFireCd = 0;
    this.shilkaFlashTimer = 0;
    this.shilkaActiveBarrel = 0;
    this.shilkaRadarOn = true;
    this.camZoom = 1.0;
    this.carriedByPeerId = null;
    this.btrTurretYaw = 0;
    this.p140RwsYaw = 0;
    this.p140RwsPitch = 0;
    this.turretSlewErrorDeg = 0;
    this.btrAimPitch = 0.0;
    this.btrFireCd = 0;
    this.btrFlashTimer = 0;
    this.mouseFireHeld = false;
    this.mouseAimHeld = false;
    this.coaxFireHeld = false;
    this.t72ReloadTimer = 0;
    this.t72ReloadTotal = 6.5;
    this.t72BarrelRecoil = 0;
    this.t72MainFlash = 0;
    this.barrelSmokeTimer = 0;
    this.barrelSmokeCd = 0;
    this.barrelHeat = 0;
    this.autoBarrelHeat = 0;
    this.t72CoaxCd = 0;
    this.t72CoaxFlash = 0;
    this.thermalMode = 0; // 0 = Day, 1 = FLIR White-Hot Thermal, 2 = 1PN51 Green IR Night Vision
    this.carCruiseOn = false;
    this.carCruiseKmh = 60;
    this.boatCruiseOn = false;
    this.boatCruiseKmh = 60;
    this.smokeClouds = [];
    this.lastLaserDist = "---";
    this.tracers = [];
    this.ridingWithPeerId = null;
    this.timedWork = null;
    this.wipersOn = false;
    this.gpLapStartMs = 0;
    this.gpLastLapSec = 0;
    this.tutorialStep = this.tutorialComplete ? 99 : 0;
    this.radarFlashTimer = 0;
    this._tutQueue = [];
    this._tutFullText = "";
    this._tutCharIdx = 0;
    this._tutTypeAccum = 0;
    this._tutOnDone = null;
    this._tutStarted = false;
    this._tutDmgTriggered = false;
    this._tutTipShown = false;
    this._tutArrow = this._createTutorialArrow();
    this._odoSaveAccum = 0;
    this._lastSavedOdoM = 0;
    window.addEventListener("beforeunload", () => { try { this._saveProgress(false); } catch (_) {} });
    window.addEventListener("pagehide", () => { try { this._saveProgress(false); } catch (_) {} });
    document.addEventListener("visibilitychange", () => { if (document.hidden) { try { this._saveProgress(false); } catch (_) {} } });
    this.gpInGate = false;
    try { this.gpBestLaps = JSON.parse(localStorage.getItem("kk_gp_best_laps_v1") || "{}"); } catch (_) { this.gpBestLaps = {}; }
    this.windshieldMud = 0;
    this.coopBoostTimer = 0;
    this.coopTargetPeerId = null;
    this.empGlitchTimer = 0;
    this.empKind = null;
    this.cameraShake = 0;
    this.pointerLocked = false;
    for (const lmId of Object.keys(this.claimedLandmarks)) this.world.hideLandmarkBeacon(lmId);
    this.wpBeacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 160, 8),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.35 })
    );
    this.scene.add(this.wpBeacon);

    this.camMode = 0;
    this.boatCamMode = 0;
    this._boatCamSmoothY = null; this.camOrbitYaw = 0; this.camOrbitPitch = 0.24;
    this.isDraggingMouse = false; this.camPosSmooth = new THREE.Vector3(-8, 6, 0);
    this._camOffsetSmooth = new THREE.Vector3(0, 3.2, -8.2);
    this._boatCamOffsetSmooth = new THREE.Vector3(0, 10, -24);

    // Pre-allocated scratch math objects & caches (avoid per-frame GC & DOM queries in _loop!)
    this._tmpCamFwd = new THREE.Vector3();
    this._tmpCamRight = new THREE.Vector3();
    this._tmpLRight = new THREE.Vector3();
    this._tmpCamDir = new THREE.Vector3();
    this._tmpCamOrig = new THREE.Vector3();
    this._tmpFocusLocal = new THREE.Vector3();
    this._tmpLocalAim = new THREE.Vector3();
    this._tmpVehFwd = new THREE.Vector3();
    this._tmpInvQuat = new THREE.Quaternion();
    this._cachedWpKey = "";
    this._cachedWpY = 0;
    this._cachedTutKey = "";
    this._cachedTutY = 0;
    this._lrfTimer = 0;
    this._lrfText = ">450m";
    this._autoShiftHintUntil = 0;
    this._elUnderwater = document.getElementById("underwater-overlay");
    this._elEmp = document.getElementById("emp-overlay");
    this._elSight = document.getElementById("gunner-sight-overlay");
    this._elAmmo = document.getElementById("gunner-ammo-readout");
    this._elContextPrompt = document.getElementById("context-prompt");
    this._elDeckBar = document.getElementById("boat-deck-bar");

    this.keys = {};
    this._bindInputs();
    this.ui = new KK.UIManager(this);
    this.startMenu = null;

    this.network = new KK.LanNetwork({
      onStatus: (txt, online) => {
        const el = document.getElementById("lan-status-pill");
        if (el) { el.textContent = txt; el.className = "lan-pill " + (online ? "online" : "offline"); }
        this._syncDevFlagshipAccess();
      if (this.startMenu && this.startMenu.isOpen) this.startMenu.renderTab();
        if (this.ui && this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
      },
      onWelcome: (msg) => {
        if (msg.isHost && msg.roomCode) {
          this.ui.addChatLine("ONLINE", `Hosting Room ${msg.roomCode}! Share link: ${this.network.getShareInviteUrl()}`, true);
          this.ui.toast(`Hosting Room ${msg.roomCode}! Click the green status pill to copy Invite Link!`);
        } else if (msg.roomCode) {
          this.ui.addChatLine("ONLINE", `Connected to Room ${msg.roomCode}!`, true);
        }
        if (this.startMenu && this.startMenu.isOpen) this.startMenu.renderTab();
      },
      onSnapshot: (snap) => {
        if (typeof snap.bridgeSeed === "number") this.world.applyBridgeSeed(snap.bridgeSeed);
        this.weather.setEnvironment(snap.timeOfDay, snap.weather, snap.timeScale);
        if (snap.brokenPlanks) {
          for (const [bid, arr] of Object.entries(snap.brokenPlanks)) for (const pidx of arr) this.world.breakPlank(bid, pidx);
        }
        if (Array.isArray(snap.brokenTrees)) {
          for (const tid of snap.brokenTrees) this.world.knockDownTree(tid, 1, 0);
        }
        if (Array.isArray(snap.brokenFences)) {
          for (const fid of snap.brokenFences) this.world.smashFence(fid, 1, 0);
        }
        if (snap.milCamp && this.milCamp) {
          this.milCamp.setLocation(snap.milCamp.x, snap.milCamp.z);
        }
        if (snap.bm21Camp && this.bm21Camp) this.bm21Camp.setLocation(snap.bm21Camp.x, snap.bm21Camp.z);
        if (Array.isArray(snap.winches) && this.entities && this.entities.setRemoteWinch) {
          for (const w of snap.winches) {
            if (w && w.ownerPeerId && w.ownerPeerId !== this.network.peerId) {
              this.entities.setRemoteWinch(w.ownerPeerId, Object.assign({ active: true }, w));
            }
          }
        }
        if (snap.shilkaCamp && this.shilkaCamp) this.shilkaCamp.setLocation(snap.shilkaCamp.x, snap.shilkaCamp.z);
        if (Array.isArray(snap.craters)) {
          for (const cr of snap.craters) this.world.addCrater(cr.x, cr.z, cr.r, cr.d);
        }
        if (snap.gasOutages && this.gasStations) this.gasStations.applyOutageSnapshot(snap.gasOutages);
        if (snap.cryptids && !this.network.isHost) {
          this.cryptids.applySyncState(snap.cryptids);
        }
        if ((snap.tornado || snap.hurricane !== undefined) && !this.network.isHost && this.hazards) {
          this.hazards.applySyncState(snap.tornado || null, snap.hurricane);
        }
      },
      onTreeBreak: (msg) => {
        if (msg.treeId) this.world.knockDownTree(msg.treeId, msg.dirX || 1, msg.dirZ || 0);
      },
      onCryptidSync: (msg) => {
        if (!this.network.isHost && msg.cryptids) this.cryptids.applySyncState(msg.cryptids);
      },
      onCryptidCounter: (msg) => {
        if (this.network.isHost && msg.kind) this.cryptids.applyRemoteCounter(msg.kind, msg.amt || 0.25);
      },
      onOceanCryptidSync: (msg) => {
        if (!this.network.isHost && msg.data && this.oceanCryptids) this.oceanCryptids.applySyncState(msg.data);
      },
      onOceanCryptidHit: (msg) => {
        if (this.network.isHost && this.oceanCryptids) this.oceanCryptids.applyRemoteHit(msg, this.audio, this.ui);
      },
      onFlareThrow: (msg) => {
        if (this.hazards) this.hazards.spawnFlare(msg.x, msg.y, msg.z, msg.vx, msg.vy, msg.vz, true);
      },
      onHazardSync: (msg) => {
        if (!this.network.isHost && this.hazards) this.hazards.applySyncState(msg.tornado, msg.hurricane);
      },
      onLwrPing: (msg) => {
        this._handleIncomingLwrPing(msg);
      },
      onCarBump: (msg) => {
        if (!msg) return;
        if (this.onFoot && !this.ridingWithPeerId) {
          this._footKnock = { vx: msg.vx || 0, vy: Math.max(3.5, msg.vy || 5.0), vz: msg.vz || 0, yOff: 0.12 };
          if (this.audio) this.audio.playImpact(0.75);
          if (this.ui) this.ui.toast(`💥 ${msg.callsign || "A friend"} sent you flying!`, true);
        } else if (!this.onFoot && this.vehicle && this.vehicle.applyExternalImpulse) {
          this.vehicle.applyExternalImpulse(msg.vx || 0, msg.vy || 1.5, msg.vz || 0, msg.torque || 2.0);
          if (this.audio) this.audio.playImpact(0.65);
        }
      },
      onHazardEvent: (msg) => {
        if (this.hazards) this.hazards.handleHazardEvent(msg, this.vehicle, this.ui, this.audio);
      },
      onFenceBreak: (msg) => {
        if (msg.fenceId) this.world.smashFence(msg.fenceId, msg.dirX || 1, msg.dirZ || 0);
      },
      onCashTransfer: (msg) => {
        const amt = Math.floor(Number(msg.amount) || 0);
        if (amt < 1000) return;
        this.money += amt;
        if (this.audio) this.audio.playCash();
        this._saveProgress(true);
        if (msg.txId && msg.peerId && this.network) {
          this.network.send({ type: "cash_ack", targetPeerId: msg.peerId, txId: msg.txId, receiverCallsign: this.network.callsign, amount: amt });
        }
        const from = msg.senderCallsign || "A comrade";
        this.ui.toast(`RECEIVED $${amt.toLocaleString()} from ${from}!`);
        this.ui.addChatLine("BANK", `${from} sent you $${amt.toLocaleString()}!`, true);
        if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
      },
      onCashAck: (msg) => {
        if (!msg || !msg.txId || !this._pendingCashTx) return;
        const tx = this._pendingCashTx.get(msg.txId);
        if (tx) {
          clearTimeout(tx.timer);
          this._pendingCashTx.delete(msg.txId);
          this.ui.toast(`✓ CONFIRMED: ${msg.receiverCallsign || tx.callsign} received $${tx.amt.toLocaleString()}!`);
        }
      },
      onFriendNotify: (msg) => {
        const from = msg.senderCallsign || "A comrade";
        this.ui.toast(`★ ${from} added you as a Friend! Press [TAB] to add them back.`);
        this.ui.addChatLine("SOCIAL", `${from} added you as a Friend!`, true);
      },
      onJamesEvent: (msg) => {
        if (this.jamesBar && this.jamesBar.applyRemoteEvent) this.jamesBar.applyRemoteEvent(msg, this);
      },
      onClarksonEvent: (msg) => {
        if (this.clarksonFarm && this.clarksonFarm.applyRemoteEvent) this.clarksonFarm.applyRemoteEvent(msg, this);
      },
      onSkinwalkerSync: (msg) => {
        if (this.skinwalker && this.skinwalker.syncRemote) this.skinwalker.syncRemote(msg.peerId, msg, this.audio, this.vehicle);
      },
      onSkinwalkerRepel: () => {
        if (this.skinwalker) {
          this.skinwalker.repel(this.audio);
          this.ui.toast("A comrade shot/flared the Skinwalker off your vehicle!!", false);
        }
      },
      onRemoteWinch: (msg) => {
        if (msg && msg.peerId && msg.peerId !== this.network.peerId && this.entities && this.entities.setRemoteWinch) {
          this.entities.setRemoteWinch(msg.peerId, msg);
        }
      },
      onWinchPull: (msg) => {
        if (!this.vehicle || this.onFoot) return;
        const dx = (msg.px || 0) - this.vehicle.pos.x;
        const dy = (msg.py || this.vehicle.pos.y) - this.vehicle.pos.y;
        const dz = (msg.pz || 0) - this.vehicle.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const st = Math.min(8.5, Number(msg.strength) || 2.5);
        this.vehicle.applyExternalImpulse((dx / d) * st, Math.max(0.25, Math.min(2.2, dy * 0.25 + 0.35)), (dz / d) * st, 0);
      },
      onCoopAssist: (msg) => {
        this._handleIncomingCoopAssist(msg);
      },
      onCarrierSync: (msg) => {
        if (msg.action === "load") {
          this.carriedByPeerId = msg.carrierPeerId || msg.peerId;
          this.onFoot = false; this.localAvatar.visible = false;
          this.vehicle.vel.set(0, 0, 0);
          this.ui.toast(`Loaded onto ${msg.sender || "a friend"}'s Car-Carrier Trailer! Press [5] or [F] to unload.`);
        } else if (msg.action === "unload") {
          this.carriedByPeerId = null;
          this.vehicle.pos.y += 0.6;
          this.vehicle.vel.set(0, 0, 0);
          this.ui.toast(`Unloaded off ${msg.sender || "friend"}'s Car-Carrier Trailer!`);
        }
      },
      onWeaponFire: (msg) => {
        if (msg.peerId && this.network && msg.peerId === this.network.peerId) return;
        const cal = msg.cal || 14.5;
        this._spawnTracerBeam(msg.x0, msg.y0, msg.z0, msg.x1, msg.y1, msg.z1, cal >= 35 ? 0xff9f1c : 0xffd166, cal >= 35 ? 0.11 : 0.05);
        const d = Math.hypot((msg.x0 || 0) - this.vehicle.pos.x, (msg.z0 || 0) - this.vehicle.pos.z);
        if (d < 420) {
          if (cal >= 35 && this.audio.play40mmAutoKanone) this.audio.play40mmAutoKanone();
          else if (cal >= 20 && this.audio.playShilka23mm) this.audio.playShilka23mm();
          else this.audio.playKPVTShot(cal);
        }
        const shellKind = cal >= 35 ? "auto40" : (cal >= 28 ? "auto30" : (cal >= 20 ? "auto23" : "mg"));
        const ox = msg.ox !== undefined ? msg.ox : msg.x0;
        const oy = msg.oy !== undefined ? msg.oy : msg.y0;
        const oz = msg.oz !== undefined ? msg.oz : msg.z0;
        this._applyIncomingOrdnanceDamage(msg.x1, msg.y1, msg.z1, shellKind, cal, false, ox, oy, oz, msg.peerId || null);
        if (this.network.isHost || this.network.mode === "offline") {
          this.cryptids.applyBulletHit(msg.x1, msg.y1, msg.z1, this.audio, cal >= 35, cal);
        }
      },
      onCannonFire: (msg) => {
        if (msg.peerId && this.network && msg.peerId === this.network.peerId) return;
        const sh = msg.shell || "he";
        const cal = msg.cal || ((sh === "ap140" || sh === "hesh140" || sh === "therm140" || sh === "rlg140") ? 140 : 125);
        const isAp = (sh === "ap" || sh === "ap140");
        const col = isAp ? 0x7df9ff : ((sh === "therm" || sh === "therm140") ? 0xff4500 : 0xff7b1c);
        this._spawnTracerBeam(msg.x0, msg.y0, msg.z0, msg.x1, msg.y1, msg.z1, col, cal >= 140 ? 0.22 : 0.14);
        const d = Math.hypot((msg.x0 || 0) - this.vehicle.pos.x, (msg.z0 || 0) - this.vehicle.pos.z);
        if (d < 720) {
          if (cal >= 140 && this.audio.play140mmEtcBlast) this.audio.play140mmEtcBlast();
          else this.audio.playTank125mmBlast(cal);
          const dImp = Math.hypot((msg.x1 || 0) - this.vehicle.pos.x, (msg.z1 || 0) - this.vehicle.pos.z);
          if (dImp < 120 && this.audio.playShellWhistle) this.audio.playShellWhistle(cal);
          this.cameraShake = Math.max(this.cameraShake, Math.max(0, 1 - d / 360) * 0.65);
        }
        this.particles.emitCrashBurst(msg.x1, msg.y1 + 0.8, msg.z1, isAp ? 0.75 : 2.2, "rock", this.weather.weather);
        if (d < 380) {
          const rDir = new THREE.Vector3((msg.x1 || 0) - (msg.x0 || 0), (msg.y1 || 0) - (msg.y0 || 0), (msg.z1 || 0) - (msg.z0 || 0)).normalize();
          this.particles.emitMuzzleShockwave(new THREE.Vector3(msg.x0 || 0, msg.y0 || 0, msg.z0 || 0), rDir, this.world, this.weather.weather, cal >= 140 ? 1.85 : 1.35, false);
        }
        const ox = msg.ox !== undefined ? msg.ox : msg.x0;
        const oy = msg.oy !== undefined ? msg.oy : msg.y0;
        const oz = msg.oz !== undefined ? msg.oz : msg.z0;
        this._applyIncomingOrdnanceDamage(msg.x1, msg.y1, msg.z1, sh, cal, false, ox, oy, oz, msg.peerId || null);
        if (this.network.isHost || this.network.mode === "offline") {
          this.cryptids.applyCannonHit(msg.x1, msg.y1, msg.z1, sh, this.audio, cal);
        }
      },
      onSmokePop: (msg) => {
        this._spawnSmokeScreenAt(msg.x, msg.y, msg.z, msg.yaw || 0);
        if (Math.hypot((msg.x || 0) - this.vehicle.pos.x, (msg.z || 0) - this.vehicle.pos.z) < 280) this.audio.playSmokePop();
      },
      onCraterAdd: (msg) => {
        this.world.addCrater(msg.x, msg.z, msg.r || 6.0, msg.d || 1.8);
      },
      onGasExplode: (msg) => {
        if (this.gasStations) this.gasStations.detonateStation(msg.townId, this, true);
      },
      onRocketFire: (msg) => {
        if (msg.peerId && this.network && msg.peerId === this.network.peerId) return;
        this._spawnBallisticRocket(msg.x, msg.y, msg.z, msg.vx, msg.vy, msg.vz, false, msg.peerId || null);
        if (Math.hypot((msg.x || 0) - this.vehicle.pos.x, (msg.z || 0) - this.vehicle.pos.z) < 420) this.audio.playKatyushaRocket();
        if (Math.hypot((msg.x || 0) - this.vehicle.pos.x, (msg.z || 0) - this.vehicle.pos.z) < 280) {
          const rkDir = new THREE.Vector3(msg.vx || 0, msg.vy || 0, msg.vz || 1).normalize();
          this.particles.emitMuzzleShockwave(new THREE.Vector3(msg.x || 0, msg.y || 0, msg.z || 0), rkDir, this.world, this.weather.weather, 0.95, true);
        }
      },
      onVehicleRam: (msg) => {
        this.vehicle.applyExternalImpulse(msg.dvx || 0, msg.dvy || 0, msg.dvz || 0, msg.spin || 0);
        this.audio.playImpact(0.95);
        this.particles.emitCrashBurst(this.vehicle.pos.x, this.vehicle.pos.y + 0.6, this.vehicle.pos.z, 1.0, "rock", this.weather.weather);
        this.ui.toast(`SMASH!! ${msg.callsign || "A LAN driver"} RAMMED YOUR RIG!`, true);
      },
      onRoster: (peers) => this.ui.updateRoster(peers),
      onEnvSync: (msg) => {
        this.weather.setEnvironment(msg.timeOfDay, msg.weather, msg.timeScale);
        if (msg.weatherChanged) this.ui.toast("Weather shifted to " + msg.weather.toUpperCase() + "!");
      },
      onPlankBreak: (msg) => {
        this.world.breakPlank(msg.bridgeId, msg.plankIdx);
        this.audio.playWoodSnap();
        this.ui.toast(`BRIDGE PLANK SNAPPED on ${msg.bridgeName || msg.bridgeId}!`, true);
      },
      onBridgeRepair: () => { this.world.repairAllBridges(); this.ui.toast("All snapped bridges have been rebuilt!"); },
      onChat: (msg) => this.ui.addChatLine(msg.sender || "DRIVER", msg.text || "", !!msg.system),
      onRemoteSpawn: (rp) => this._spawnRemoteVisuals(rp),
      onRemoteVehicleChange: (rp) => this._rebuildRemoteRig(rp),
      onPeerLeft: (pid, cs) => {
        const rp = this.network.remotePlayers.get(pid);
        if (rp) { if (rp.rig) this.scene.remove(rp.rig.root); if (rp.avatar) this.scene.remove(rp.avatar); if (rp.trailerRig) this.scene.remove(rp.trailerRig.root); }
        if (this.entities && this.entities.removeRemoteWinch) this.entities.removeRemoteWinch(pid);
        if (this.boats && this.boats.removeRemoteBoat) this.boats.removeRemoteBoat(pid);
        if (this.skinwalker && this.skinwalker.removeRemote) this.skinwalker.removeRemote(pid);
        this.ui.addChatLine("DISPATCH", `${cs || pid} left the Oblast.`, true);
      },
      onConvoys: (convoys, evMsg) => {
        if (evMsg && evMsg.type === "convoy_create") this.ui.toast(`LAN CONVOY LAUNCHED: ${evMsg.convoy.title}! Press [J] to join!`);
        if (this.ui.activeModal === "contracts") this.ui.renderContracts();
      }
    });

    // Hook armor_hit_ack LAN feedback without modifying network.js
    if (this.network && typeof this.network._handleMessage === "function") {
      const _origHandleNetMsg = this.network._handleMessage.bind(this.network);
      this.network._handleMessage = (msg) => {
        if (msg && msg.type === "armor_hit_ack" && msg.targetPeerId === this.network.peerId) {
          this._onArmorHitAck(msg);
          return;
        }
        return _origHandleNetMsg(msg);
      };
    }

    if (this.account && this.account.username) this.network.callsign = this.account.username;
    const hostInput = document.getElementById("lan-host-input"), csInput = document.getElementById("lan-callsign-input");
    if (csInput) csInput.value = this.network.callsign;

    // Auto-join if opened via shared Invite Link (?room=KK-XXXX), else start cleanly in Solo Mode!
    const urlRoom = new URLSearchParams(window.location.search).get("room");
    if (urlRoom && urlRoom.trim()) {
      const cleanRoom = urlRoom.trim().toUpperCase();
      if (hostInput) hostInput.value = cleanRoom;
      this.network.joinRoom(cleanRoom, this.network.callsign);
    } else {
      if (hostInput) hostInput.value = "";
      if (this.network.cb.onStatus) this.network.cb.onStatus("SOLO MODE — CLICK HOST OR JOIN", false);
    }

    // Immediately verify & hydrate any saved local browser account on boot (including Silver Dev unlock!)
    if (this.account && this.account.username) this._autoLoginSavedAccount();

    // Periodic server account cloud auto-save every 15s
    setInterval(() => {
      this._saveProgress(false);
    }, 15000);

    window.__GAME__ = this;
    this.startMenu = new KK.StartMenu(this);
    if (this.gfxPreset && this.gfxPreset !== 'high') this.setGraphicsPreset(this.gfxPreset, true);
    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    setTimeout(() => {
      this.ui.toast('Welcome to v18.1.1 ONLINE! 300 km/h Smooth Chunk Streaming, Opaque Wave Ocean, Pooled Searchlight, 4-Mode Boat Camera [C] & Museum-Grade Detailed Ships!');
    }, 650);
  }

  // ==========================================================================
  // v18.1.1 UNDERTALE-STYLE DEV TUTORIAL SYSTEM (HQ <-> KAMENKA OUTPOST EAST)
  // ==========================================================================
  _createTutorialArrow() {
    const grp = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xffbe0b });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.2, 8), mat);
    shaft.position.y = 3.2; grp.add(shaft);
    const head = new THREE.Mesh(new THREE.ConeGeometry(1.35, 2.4, 8), mat);
    head.rotation.x = Math.PI; head.position.y = 0.8; grp.add(head);
    grp.visible = false;
    this.scene.add(grp);
    return grp;
  }

  showTutorialDialog(lines, onDone = null) {
    this._tutQueue = Array.isArray(lines) ? lines.slice() : [String(lines)];
    this._tutOnDone = onDone;
    this._nextTutorialLine();
  }

  _ensureTutorialBox() {
    let box = document.getElementById("tutorial-box");
    if (!box) {
      box = document.createElement("div");
      box.id = "tutorial-box";
      box.innerHTML = `
        <div class="tut-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span class="tut-speaker" style="color:#c084fc;font-weight:900;font-size:12.5px;">📡 [DEV // DISPATCH]</span>
          <button id="tut-skip-btn" class="tut-skip" style="background:transparent;border:1px solid #475569;color:#94a3b8;border-radius:4px;font-family:monospace;font-size:10px;padding:2px 7px;cursor:pointer;" onclick="window.__GAME__ && window.__GAME__.skipTutorial()">SKIP</button>
        </div>
        <div id="tutorial-obj" class="tut-obj" style="background:rgba(168,85,247,0.18);border-left:3px solid #a855f7;color:#e9d5ff;font-size:11px;font-weight:800;padding:4px 8px;margin-bottom:8px;border-radius:3px;">STEP 1/4: Drive to HQ Warehouse &amp; press [F]</div>
        <div id="tutorial-text" class="tut-text" style="font-size:13px;line-height:1.48;min-height:48px;color:#f1f5f9;white-space:pre-wrap;"></div>
        <div class="tut-footer" style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;">
          <span class="tut-hint" style="font-size:10.5px;color:#94a3b8;">[ENTER] or NEXT</span>
          <button id="tut-next-btn" class="tut-next" style="background:#a855f7;color:#070a0f;border:none;border-radius:5px;font-family:monospace;font-weight:900;font-size:11.5px;padding:4px 11px;cursor:pointer;" onclick="window.__GAME__ && window.__GAME__.advanceTutorialDialog()">NEXT ▶</button>
        </div>`;
      document.body.appendChild(box);
    }
    // Enforce inline positioning so browser CSS cache can NEVER hide or misplace it!
    box.style.position = "fixed";
    box.style.left = "14px";
    box.style.top = "50%";
    box.style.transform = "translateY(-50%)";
    box.style.width = "min(350px, 88vw)";
    box.style.background = "rgba(7, 10, 16, 0.95)";
    box.style.border = "2px solid #c084fc";
    box.style.borderRadius = "10px";
    box.style.padding = "11px 14px";
    box.style.zIndex = "9999";
    box.style.fontFamily = "monospace";
    box.style.color = "#f8fafc";
    return box;
  }

  _nextTutorialLine() {
    const box = this._ensureTutorialBox();
    const txt = document.getElementById("tutorial-text");
    if (!box || !txt) return;
    if (!this._tutQueue.length) {
      box.classList.add("hidden");
      box.style.display = "none";
      const cb = this._tutOnDone; this._tutOnDone = null;
      if (cb) cb();
      return;
    }
    this._tutFullText = this._tutQueue.shift();
    this._tutCharIdx = 0;
    this._tutTypeAccum = 0;
    txt.textContent = "";
    box.classList.remove("hidden");
    box.style.display = "block";
  }

  advanceTutorialDialog() {
    const txt = document.getElementById("tutorial-text");
    if (!txt) return;
    if (this._tutCharIdx < this._tutFullText.length) {
      this._tutCharIdx = this._tutFullText.length;
      txt.textContent = this._tutFullText;
    } else {
      this._nextTutorialLine();
    }
  }

  skipTutorial() {
    this.tutorialComplete = true;
    this.tutorialStep = 99;
    this._tutQueue = [];
    if (this.vehicle) this.vehicle.tutorialSensitiveDmg = false;
    const box = document.getElementById("tutorial-box");
    if (box) { box.classList.add("hidden"); box.style.display = "none"; }
    if (this._tutArrow) this._tutArrow.visible = false;
    try { localStorage.setItem("kk_tutorial_skipped_v1", "1"); } catch (_) {}
    this._saveProgress(true);
    this.ui.toast("Tutorial skipped — all towns, contracts & dealerships unlocked!");
  }

  restartTutorial() {
    this.tutorialComplete = false;
    this.tutorialStep = 0;
    this._tutStarted = false;
    this._tutDmgTriggered = false;
    this._tutTipShown = false;
    this._tutQueue = [];
    try { localStorage.removeItem("kk_tutorial_skipped_v1"); } catch (_) {}
    this._saveProgress(false);
    this.ui.toast("HQ Tutorial restarted!");
  }

  _updateTutorial(dt) {
    if (this.radarFlashTimer > 0) this.radarFlashTimer = Math.max(0, this.radarFlashTimer - dt);
    const box = document.getElementById("tutorial-box");
    if (box && !box.classList.contains("hidden") && this._tutCharIdx < this._tutFullText.length) {
      this._tutTypeAccum += dt * 48;
      const nextIdx = Math.min(this._tutFullText.length, Math.floor(this._tutTypeAccum));
      if (nextIdx > this._tutCharIdx) {
        this._tutCharIdx = nextIdx;
        const txt = document.getElementById("tutorial-text");
        if (txt) txt.textContent = this._tutFullText.slice(0, this._tutCharIdx);
      }
    }
    if (this.tutorialComplete) {
      if (this._tutArrow) this._tutArrow.visible = false;
      return;
    }
    if (!this._tutStarted && (!this.startMenu || !this.startMenu.isOpen)) {
      this._tutStarted = true;
      this.tutorialStep = 1;
      if (this.vehicle) this.vehicle.tutorialSensitiveDmg = true;
      this.showTutorialDialog([
        "* Welcome to Krasno-Kamenka Oblast, rookie! I'm the guy who coded this place, so if a bridge eats your axle, legally it's a 'feature.'",
        "* First things first: your engine's already idling — use [WASD] to drive, [SPACE] for handbrake, [C] to swap cameras, and [I] anytime to kill/crank the ignition.",
        "* See that HQ Warehouse with the obnoxiously large bouncing arrow? Pull up and hit [F] — your main interact key — to grab your first job."
      ]);
    }
    if (this.tutorialStep === 2 && !this._tutTipShown && this.vehicle && Math.hypot(this.vehicle.pos.x, this.vehicle.pos.z) > 120) {
      this._tutTipShown = true;
      this.showTutorialDialog([
        "* Couple of road rules out here: mud will happily swallow stock tires, and old wooden bridges WILL snap if you're too heavy or too fast.",
        "* Drive smart, watch your temp gauge, and try not to kiss any boulders."
      ]);
    }
    if (this.tutorialStep === 2 && !this._tutDmgTriggered && this.vehicle && this.vehicle.pos.x > 650) {
      this._triggerTutorialHoodStep();
    }
    if (this._tutArrow) {
      let ax = null, az = null;
      const objEl = document.getElementById("tutorial-obj");
      if (this.tutorialStep === 1) {
        ax = -18; az = -16;
        if (objEl) objEl.textContent = "STEP 1/4: Drive to HQ Warehouse & press [F]";
      } else if (this.tutorialStep === 2) {
        ax = 1350; az = 180;
        if (objEl) objEl.textContent = "STEP 2/4: Follow PURPLE GPS to Outpost East";
      } else if (this.tutorialStep === 3) {
        ax = 1350; az = 180;
        if (objEl) objEl.textContent = "STEP 3/4: Exit [F] -> Front Hood [F] -> Deliver";
      } else if (this.tutorialStep === 4) {
        const tE = KK.TOWNS[1];
        ax = (tE && tE.garageX !== undefined) ? tE.garageX : 1325;
        az = (tE && tE.garageZ !== undefined) ? tE.garageZ : 165;
        if (objEl) objEl.textContent = "STEP 4/4: Open Garage [F] & Buy Mud Tires!";
      }
      if (ax !== null) {
        const tutKey = `${ax},${az}`;
        if (tutKey !== this._cachedTutKey) {
          this._cachedTutKey = tutKey;
          this._cachedTutY = this.world.getTerrainInfo(ax, az, false).height;
        }
        const gy = this._cachedTutY;
        const bob = Math.sin(performance.now() * 0.006) * 1.4;
        this.world.toLocal(ax, gy + 8.5 + bob, az, this._tutArrow.position);
        this._tutArrow.rotation.y += dt * 2.2;
        this._tutArrow.visible = true;
      } else {
        this._tutArrow.visible = false;
      }
    }
  }

  _triggerTutorialHoodStep() {
    if (this._tutDmgTriggered || this.tutorialComplete) return;
    this._tutDmgTriggered = true;
    this.tutorialStep = 3;
    if (this.vehicle) this.vehicle.tutorialSensitiveDmg = false;
    this.showTutorialDialog([
      "* Ouch! Hear that? Your engine bay actually simulates individual parts — radiator, shocks, pistons, the works.",
      "* Pull over, hit [F] to hop out, walk to the FRONT of your rig, and press [F] to pop the hood and patch it up.",
      "* (Pro tip: hold [X] anytime to see your car's live X-Ray skeleton. Pretty cool, right?)"
    ]);
  }

  _exportSavePayload() {
    return {
      money: Math.round(this.money),
      ownedVehicles: this.ownedVehicles,
      activeVehicleId: this.activeVehicleId,
      stats: this.stats,
      claimedLandmarks: this.claimedLandmarks,
      ownedTrailers: this.ownedTrailers,
      ownedBoats: this.ownedBoats,
      tutorialV17Done: !!this.tutorialComplete
    };
  }

  _applySavePayload(d) {
    if (!d || typeof d !== "object") return;
    if (typeof d.money === "number") this.money = d.money;
    if (typeof d.tutorialV17Done === "boolean") this.tutorialComplete = d.tutorialV17Done;
    try {
      if (localStorage.getItem("kk_tutorial_skipped_v1") === "1") this.tutorialComplete = true;
    } catch (_) {}
    if (d.stats && typeof d.stats === "object") {
      this.stats.deliveries = Number(d.stats.deliveries) || 0;
      this.stats.distanceKm = Number(d.stats.distanceKm) || 0;
    }
    if (d.claimedLandmarks && typeof d.claimedLandmarks === "object") {
      this.claimedLandmarks = Object.assign({}, d.claimedLandmarks);
      if (this.world) {
        for (const lmId of Object.keys(this.claimedLandmarks)) this.world.hideLandmarkBeacon(lmId);
      }
    }
    if (d.ownedTrailers && typeof d.ownedTrailers === "object") {
      this.ownedTrailers = Object.assign({}, d.ownedTrailers);
    }
    if (d.ownedBoats && typeof d.ownedBoats === "object") {
      this.ownedBoats = Object.assign({ patrol: false, strela: false, serna: false, zubr: false }, d.ownedBoats);
    }
    if (d.ownedVehicles && typeof d.ownedVehicles === "object") {
      const nextOwned = {};
      for (const vid of Object.keys(d.ownedVehicles)) {
        if (KK.VEHICLES[vid]) {
          const def = KK.createDefaultVehicleState(vid);
          const rawEntry = d.ownedVehicles[vid];
          const merged = (rawEntry && rawEntry.vehicleId === vid && KK.ENGINES[rawEntry.engineId]) ? Object.assign(def, rawEntry) : def;
          merged.upgrades = Object.assign(def.upgrades, d.ownedVehicles[vid].upgrades || {});
          merged.tuning = Object.assign(def.tuning, d.ownedVehicles[vid].tuning || {});
          merged.health = Object.assign(def.health, d.ownedVehicles[vid].health || {});
          merged.parts = Object.assign(def.parts, d.ownedVehicles[vid].parts || {});
          KK.ensurePartsInitialized(merged);
          nextOwned[vid] = merged;
        }
      }
      if (Object.keys(nextOwned).length > 0) this.ownedVehicles = nextOwned;
    }
    if (d.activeVehicleId && this.ownedVehicles[d.activeVehicleId]) {
      this.activeVehicleId = d.activeVehicleId;
    } else {
      this.activeVehicleId = Object.keys(this.ownedVehicles)[0] || "uaz452";
    }
    if (this.vehicle && this.vehicleRig) {
      this.switchVehicle(this.activeVehicleId, true);
    }
  }

  _saveProgress(alsoPushServer = true) {
    const payload = this._exportSavePayload();
    try {
      localStorage.setItem("kk_oblast_save_v5", JSON.stringify(payload));
      if (this.account) localStorage.setItem("kk_oblast_account_v5", JSON.stringify(this.account));
    } catch (e) {}
    if (alsoPushServer && this.account && this.account.username && this.network) {
      this.network.accountSave(this.account.username, this.account.pin, payload);
    }
  }

  _loadProgress() {
    try {
      const accRaw = localStorage.getItem("kk_oblast_account_v5");
      if (accRaw) {
        const parsedAcc = JSON.parse(accRaw);
        if (parsedAcc && parsedAcc.username && parsedAcc.pin) this.account = parsedAcc;
      }
      const raw = localStorage.getItem("kk_oblast_save_v5");
      if (raw) this._applySavePayload(JSON.parse(raw));
      if (localStorage.getItem("kk_tutorial_skipped_v1") === "1") this.tutorialComplete = true;
    } catch (e) {}
  }

  async _autoLoginSavedAccount() {
    if (!this.account || !this.account.username) return;
    const res = await this.network.accountLogin(this.account.username, this.account.pin, "login");
    if (res && res.ok) {
      this.account.isDev = !!res.isDev;
      if (res.saveData) this._applySavePayload(res.saveData);
      this._syncDevFlagshipAccess();
      this._saveProgress(true);
      this.ui.toast(`Loaded server account "${res.username}" ($${Math.floor(this.money).toLocaleString()})!`);
      if (this.startMenu && this.startMenu.isOpen) this.startMenu.renderTab();
    }
  }

  async submitAccountAuth(action, userOverride = null, pinOverride = null) {
    const uEl = document.getElementById("acc-user-in");
    const pEl = document.getElementById("acc-pin-in");
    const errEl = document.getElementById("acc-err-msg");
    const smErrEl = document.getElementById("sm-acc-err");
    const username = (userOverride !== null ? String(userOverride) : (uEl ? uEl.value : "")).trim();
    const pin = (pinOverride !== null ? String(pinOverride) : (pEl ? pEl.value : "")).trim();
    if (!username || !pin) {
      const msg = "Enter both username and PIN/password!";
      if (errEl) errEl.textContent = msg;
      if (smErrEl) smErrEl.textContent = msg;
      return;
    }
    const res = await this.network.accountLogin(username, pin, action, this._exportSavePayload());
    if (!res.ok) {
      const msg = res.error || "Login failed (check LAN server connection).";
      if (errEl) errEl.textContent = msg;
      if (smErrEl) smErrEl.textContent = msg;
      this.ui.toast(msg, true);
      return;
    }
    this.account = { username: res.username, pin, isDev: !!res.isDev };
    this.network.callsign = res.username;
    const csInput = document.getElementById("lan-callsign-input");
    if (csInput) csInput.value = res.username;
    this.network.send({ type: "join_hello", callsign: res.username });

    if (res.saveData && !res.isNew) {
      this._applySavePayload(res.saveData);
      this.ui.toast(`Welcome back, ${res.username}! Loaded $${Math.floor(this.money).toLocaleString()} & garage!`);
    } else {
      this._saveProgress(true);
      this.ui.toast(`Registered account "${res.username}"! Progress is now saved on server!`);
    }
    this._syncDevFlagshipAccess();
    this.ui.renderAccountModal();
    if (this.startMenu && this.startMenu.isOpen) this.startMenu.renderTab();
  }

  _syncDevFlagshipAccess() {
    const allowed = !!(this.account && this.account.isDev && this.account.username && this.account.username.toLowerCase() === "silver");
    if (allowed) {
      if (!this.ownedVehicles.pzkpfw_140a4 || this.ownedVehicles.pzkpfw_140a4.vehicleId !== "pzkpfw_140a4" || !KK.ENGINES[this.ownedVehicles.pzkpfw_140a4.engineId]) {
        this.ownedVehicles.pzkpfw_140a4 = KK.createDefaultVehicleState("pzkpfw_140a4");
      }
      // Dev testing grant: ensure verified Silver account has at least $2,000,000!
      if (this.money < 2000000) {
        this.money = 2000000;
      }
    } else if (this.ownedVehicles.pzkpfw_140a4) {
      delete this.ownedVehicles.pzkpfw_140a4;
      if (this.activeVehicleId === "pzkpfw_140a4") this.switchVehicle("uaz452", true);
    }
  }

  async claimDevAccount(devKey) {
    if (!this.account || !this.account.username) return { ok: false, error: "Login to Silver first." };
    const res = await this.network.accountClaimDev(this.account.username, this.account.pin, devKey);
    if (res.ok && res.isDev) {
      this.account.isDev = true;
      this._syncDevFlagshipAccess();
      this._saveProgress(true);
      this.ui.toast('VERIFIED DEV: PzKpfw 140A4 "Schreckensfürst" unlocked for Silver!');
    }
    return res;
  }

  grantDevTestFunds() {
    const allowed = !!(this.account && this.account.isDev && this.account.username && this.account.username.toLowerCase() === "silver");
    if (!allowed) return;
    this.money = Math.max(this.money, 0) + 2000000;
    if (this.audio) this.audio.playCash();
    this._saveProgress(true);
    this.ui.renderAccountModal();
    if (this.startMenu && this.startMenu.isOpen) this.startMenu.renderTab();
    this.ui.toast(`DEV TEST GRANT: +$2,000,000 (Balance: $${Math.floor(this.money).toLocaleString()})`);
  }

  async submitClaimDev() {
    const k = document.getElementById("acc-dev-key")?.value?.trim() || "";
    const msgEl = document.getElementById("acc-dev-msg");
    const res = await this.claimDevAccount(k);
    if (msgEl) { msgEl.style.color = res.ok ? "#2de08b" : "#ff5c77"; msgEl.textContent = res.ok ? 'PzKpfw 140A4 "Schreckensfürst" UNLOCKED!' : (res.error || "Denied."); }
    if (res.ok) this.ui.renderAccountModal();
  }

  async changeAccountPassword(oldPin, newPin) {
    if (!this.account || !this.account.username) return { ok: false, error: "Not logged in." };
    const res = await this.network.accountChangePassword(this.account.username, oldPin, newPin);
    if (res.ok) {
      this.account.pin = newPin;
      this._saveProgress(true);
      this.ui.toast("Account password updated!");
    }
    return res;
  }

  async submitChangePassword() {
    const o = document.getElementById("acc-old-pin")?.value?.trim() || "";
    const n = document.getElementById("acc-new-pin")?.value?.trim() || "";
    const msgEl = document.getElementById("acc-pw-msg");
    const res = await this.changeAccountPassword(o, n);
    if (msgEl) { msgEl.style.color = res.ok ? "#2de08b" : "#ff5c77"; msgEl.textContent = res.ok ? "Password changed!" : (res.error || "Failed."); }
  }

  async syncAccountSave(showToast = false) {
    if (!this.account || !this.account.username) return;
    const res = await this.network.accountSave(this.account.username, this.account.pin, this._exportSavePayload());
    if (showToast) {
      this.ui.toast(res.ok ? `Saved "${this.account.username}" to server accounts.json!` : "Server offline — saved locally in browser!", !res.ok);
    }
    if (this.ui.activeModal === "account") this.ui.renderAccountModal();
  }

  logoutAccount() {
    this.account = null;
    try { localStorage.removeItem("kk_oblast_account_v5"); } catch (e) {}
    this.ui.toast("Logged out — playing as Guest (local save).");
    this.ui.renderAccountModal();
  }

  _bindInputs() {
    window.addEventListener("resize", () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    this.canvas.addEventListener("mousedown", (e) => {
      this.audio.init();
      if (this.ui.activeModal || (this.startMenu && this.startMenu.isOpen)) return;
      const vid = this.vehicle ? this.vehicle.vState.vehicleId : "";
      const isP140 = (!this.onFoot && !this.ridingWithPeerId && vid === "pzkpfw_140a4");
      const isT72 = (!this.onFoot && !this.ridingWithPeerId && (vid === "t72" || vid === "harimau" || isP140));
      const isBm21 = (!this.onFoot && !this.ridingWithPeerId && vid === "bm21");
      const isShilka = (!this.onFoot && !this.ridingWithPeerId && vid === "shilka");
      const isArmedBtr = (!this.onFoot && !this.ridingWithPeerId && (vid === "komodo_turret" || vid === "komodo_std" || (vid === "btr80" && !!this.vehicle.vState.upgrades.btrTurret)));
      const isArmed = isT72 || isBm21 || isShilka || isArmedBtr;

      if (e.button === 0) {
        if (!this.pointerLocked && this.canvas.requestPointerLock) {
          try { const pl = this.canvas.requestPointerLock(); if (pl && typeof pl.catch === "function") pl.catch(() => {}); } catch (err) {}
          if (!isArmed) this.isDraggingMouse = true;
          return;
        }
        if (isT72) {
          this.fireT72MainCannon();
        } else if (isBm21) {
          this.mouseFireHeld = true;
          this.triggerBm21Fire();
        } else if (isShilka) {
          this.mouseFireHeld = true;
          this.fireShilka23mm();
        } else if (isArmedBtr) {
          this.mouseFireHeld = true;
          this.fireBtrTurret();
        } else {
          this.isDraggingMouse = true;
        }
      } else if (e.button === 1) {
        e.preventDefault();
        if (isArmed) this.toggleTurretFreeze();
      } else if (e.button === 2) {
        if (isArmed) {
          // v15.1 TOGGLE SCOPE: Click Right-Mouse once to aim, click again to exit!
          this.mouseAimHeld = !this.mouseAimHeld;
          if (this.mouseAimHeld && !this.pointerLocked && this.canvas.requestPointerLock) {
            try { const pl = this.canvas.requestPointerLock(); if (pl && typeof pl.catch === "function") pl.catch(() => {}); } catch (err) {}
          }
        } else {
          this.isDraggingMouse = true;
        }
      }
    });
    document.addEventListener("pointerlockchange", () => {
      this.pointerLocked = (document.pointerLockElement === this.canvas);
      if (!this.pointerLocked) { this.mouseFireHeld = false; this.mouseAimHeld = false; this.coaxFireHeld = false; }
      const ret = document.getElementById("aim-reticle");
      if (ret) ret.classList.toggle("hidden", !this.pointerLocked);
    });
    window.addEventListener("mouseup", (e) => {
      if (e.button === 0) this.mouseFireHeld = false;
      this.isDraggingMouse = false;
    });
    window.addEventListener("blur", () => { this.mouseFireHeld = false; this.mouseAimHeld = false; this.coaxFireHeld = false; this.isDraggingMouse = false; });
    this.canvas.addEventListener("wheel", (e) => {
      if (this.ui.activeModal || (this.startMenu && this.startMenu.isOpen)) return;
      if (this.mouseAimHeld || (this.camMode === 3 && !this.onFoot && !this.ridingWithPeerId)) return;
      e.preventDefault();
      this.camZoom = Math.max(0.55, Math.min(2.25, this.camZoom * (e.deltaY > 0 ? 1.12 : 0.89)));
    }, { passive: false });
    window.addEventListener("mousemove", (e) => {
      if (this.ui.activeModal || (this.startMenu && this.startMenu.isOpen)) return;
      if (!this.pointerLocked && !this.isDraggingMouse && !this.mouseAimHeld) return;
      const sens = this.mouseAimHeld ? 0.55 : 1.0;
      this.camOrbitYaw -= e.movementX * 0.0048 * sens;
      if (this.mouseAimHeld) {
        const mvId = this.vehicle ? this.vehicle.vState.vehicleId : "";
        const isTankLim = (mvId === "t72" || mvId === "harimau" || mvId === "pzkpfw_140a4");
        const minEl = isTankLim ? -0.12 : -0.14;
        const maxEl = (mvId === "bm21" || mvId === "shilka") ? 0.78 : (isTankLim ? 0.32 : 0.55);
        this.btrAimPitch = Math.max(minEl, Math.min(maxEl, this.btrAimPitch - e.movementY * 0.0036 * sens));
      } else {
        this.camOrbitPitch = Math.max(-0.85, Math.min(1.05, this.camOrbitPitch + e.movementY * 0.0042 * sens));
      }
    });

    window.addEventListener("mousemove", (e) => {
      this._armorMousePx.x = e.clientX;
      this._armorMousePx.y = e.clientY;
      this._armorMouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this._armorMouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Semicolon" && !this.ui.activeModal && !(this.startMenu && this.startMenu.isOpen)) {
        e.preventDefault(); this.toggleArmorViewer(); return;
      }
      if (e.code === "Backquote" && !this.ui.activeModal && !(this.startMenu && this.startMenu.isOpen)) {
        e.preventDefault(); this.toggleFcsLaser(); return;
      }
      if (e.code === "Enter") {
        const ae = document.activeElement;
        const isTyping = ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA");
        const tb = document.getElementById("tutorial-box");
        if (!isTyping && tb && !tb.classList.contains("hidden")) { e.preventDefault(); this.advanceTutorialDialog(); return; }
      }
      this.audio.init();
      if (this.startMenu && this.startMenu.isOpen) return;
      if (document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) return;
      const code = e.code; this.keys[code] = true;
      if (code === "Tab" || code === "AltLeft" || code === "AltRight") e.preventDefault();
      if (code === "Enter") {
        if (document.pointerLockElement && document.exitPointerLock) { try { document.exitPointerLock(); } catch (err) {} }
        const ci = document.getElementById("chat-input");
        if (ci) { ci.focus(); e.preventDefault(); }
        return;
      }
      if (code === "Escape") {
        if (this.timedWork) { this.timedWork = null; this.ui.toast("Repair / work cancelled.", true); return; }
        if (this.ui.activeModal) { this.ui.closeModal(); return; }
        if (this.photoMode) { this.togglePhotoMode(); return; }
        return;
      }
      if (this.ui.activeModal) { if (code === "KeyE" && this.ui.activeModal === "inventory") this.ui.closeModal(); else if (code === "Tab" && this.ui.activeModal === "players") { e.preventDefault(); this.ui.closeModal(); } return; }

      // 1. UNIVERSAL INTERACT [F] (Shift+F always force-exits/enters vehicle!)
      if (code === "KeyF") {
        if (e.shiftKey) { this.toggleOnFoot(); return; }
        const acted = this.handleContextInteract();
        if (!acted) this.toggleOnFoot();
      }
      // 2. ON-FOOT INVENTORY [E] | IN-CAR MANUAL GEAR UP [E] (ONLY when in Manual mode!)
      else if (code === "KeyE") {
        if (this.boats && this.boats.activeBoat) { this.stepOntoBoatDeckOrDisembark(); return; }
        if (this.onFoot) { this.ui.openModal("inventory"); return; }
        if (this.vehicle.autoShift) {
          const nowMs = performance.now();
          if (nowMs > (this._autoShiftHintUntil || 0)) {
            this._autoShiftHintUntil = nowMs + 8000;
            this.ui.toast("In AUTOMATIC mode — press [4] to toggle Manual shifting, or [F] to interact.");
          }
          return;
        }
        this.vehicle.gear = Math.min(this.vehicle.vState.tuning.gears.length, this.vehicle.gear + 1);
      }
      // 3. ALWAYS-AVAILABLE MENUS, PHOTO MODE & WINCH ([T]/[Y] WORK ON FOOT TOO!)
      else if (code === "KeyM") this.ui.openModal("map");
      else if (code === "KeyJ") this.ui.openModal("contracts");
      else if (code === "KeyO") this.ui.openModal("env");
      else if (code === "Tab") { e.preventDefault(); this.ui.openModal("players"); }
      else if (code === "F8") { e.preventDefault(); this.togglePhotoMode(); }
      else if (code === "F9" || code === "Digit9") { e.preventDefault(); this.captureScreenshot(); }
      else if (code === "KeyT") { if (!this.vehicle.winch.active) this.attachWinch(); }
      else if (code === "Space" && this.boats && (this.boats.activeBoat || this.walkingOnBoat || (this.onFoot && this.boats.findNearbyBoat(this.playerFoot.x, this.playerFoot.z, 22, true)))) {
        e.preventDefault();
        if (!e.repeat) this.toggleShipHelm();
      }
      else if (code === "KeyU" && this.boats && (this.boats.activeBoat || (this.walkingOnBoat && this.walkingOnBoat.boat))) {
        if (!e.repeat) {
          const targetB = this.boats.activeBoat || this.walkingOnBoat.boat;
          this.boats.toggleDeckLock(targetB, this.ui, this.audio);
        }
      }
      else if (code === "KeyL" && this.boats && this.boats.activeBoat) {
        if (!e.repeat) this.boats.toggleNavLights(this.boats.activeBoat, this.ui);
      }
      else if (code === "KeyK" && this.boats && this.boats.activeBoat) {
        if (!e.repeat) this.boats.toggleSpotlight(this.boats.activeBoat, this.ui);
      }
      else if (code === "KeyV" && this.boats && this.boats.activeBoat) {
        this.boats.toggleMountVehicle(this.boats.activeBoat, this.vehicle, this.ui, this.audio, this.network.remotePlayers);
      }
      else if (code === "KeyY") {
        if (this.vehicle.winch.active) {
          this.vehicle.winch.active = false; this.vehicle.winch.targetPeerId = null;
          this.network.send({ type: "winch_update", active: false }); this.ui.toast("Winch cable released!");
        }
      }
      else if (code === "Digit7") {
        if (!e.repeat) this.toggleCruiseControl();
      }
      else if (code === "Equal" || code === "NumpadAdd") {
        this.adjustCruiseSpeed(10);
      }
      else if (code === "Minus" || code === "NumpadSubtract") {
        this.adjustCruiseSpeed(-10);
      }
      else if (code === "KeyG") {
        // v18.1.1 Garage is strictly [F] only — [G] is exclusively military/flare!
        const vidG = this.vehicle.vState.vehicleId;
        if (!this.onFoot && (vidG === "t72" || vidG === "harimau")) this.launchT72Smoke();
        else if (!this.onFoot && vidG === "pzkpfw_140a4") this.triggerDonnerschildAps();
        else if (!this.onFoot && vidG === "shilka") {
          this.shilkaRadarOn = !this.shilkaRadarOn;
          this.audio.playThermalClick();
        } else {
          this.throwRoadFlare();
        }
      }
      // 4. ON-FOOT PLAYER ACTIONS [1-5] & STRICTLY IN-VEHICLE GATE!
      else if (this.onFoot) {
        if (code === "Digit1") {
          this.onFootEmote = "wave"; this.onFootEmoteTimer = 2.2;
          this.ui.toast("👋 Waving!");
        } else if (code === "Digit2") {
          this.onFootEmote = "kick"; this.onFootEmoteTimer = 0.75;
          let kickedName = null;
          if (this.network && this.network.remotePlayers) {
            for (const [pid, rp] of this.network.remotePlayers.entries()) {
              if (!rp.onFoot || rp.ridingWithPeerId) continue;
              const dK = Math.hypot((rp.gx || 0) - this.playerFoot.x, (rp.gz || 0) - this.playerFoot.z);
              if (dK < 2.8) {
                kickedName = rp.callsign || "a friend";
                const kx = ((rp.gx || 0) - this.playerFoot.x) / Math.max(0.2, dK);
                const kz = ((rp.gz || 0) - this.playerFoot.z) / Math.max(0.2, dK);
                if (this.network.sendCarBump) this.network.sendCarBump(pid, kx * 10.5, 5.5, kz * 10.5, 2.5);
                if (this.audio) this.audio.playImpact(0.45);
                break;
              }
            }
          }
          this.ui.toast(kickedName ? `🦵 Kicked ${kickedName}!` : "🦵 Kick!");
        } else if (code === "Digit3") {
          this.onFootEmote = (this.onFootEmote === "squat" && this.onFootEmoteTimer > 0) ? null : "squat";
          this.onFootEmoteTimer = this.onFootEmote ? 8.0 : 0;
          this.ui.toast(this.onFootEmote ? "🇷🇺 Slav Squat (Heels on Ground!)" : "Stood up.");
        } else if (code === "Digit4") {
          this.onFootEmote = "dance"; this.onFootEmoteTimer = 4.5;
          this.ui.toast("🕺 Oblast Dance!");
        } else if (code === "Digit5") {
          this.onFootEmote = "salute"; this.onFootEmoteTimer = 2.5;
          this.ui.toast("🫡 Military Salute!");
        }
        return;
      }
      else if (code === "KeyQ") {
        if (this.vehicle.autoShift) {
          const nowMs = performance.now();
          if (nowMs > (this._autoShiftHintUntil || 0)) {
            this._autoShiftHintUntil = nowMs + 8000;
            this.ui.toast("In AUTOMATIC mode — press [4] to toggle Manual shifting, or [F] to interact.");
          }
          return;
        }
        this.vehicle.gear = Math.max(-1, this.vehicle.gear - 1);
      }
      else if (code === "Digit4") {
        this.vehicle.autoShift = !this.vehicle.autoShift;
        this.ui.toast("Transmission [4]: " + (this.vehicle.autoShift ? "AUTOMATIC" : "MANUAL (Q=Down, E=Up)"));
      }
      else if (code === "Digit6") {
        this.toggleActiveSnorkel();
      }
      else if (code === "KeyZ") this.cycleThermalVision();
      else if (code === "KeyR") {
        const vidR = this.vehicle.vState.vehicleId;
        if (vidR === "t72" || vidR === "harimau" || vidR === "bm21" || vidR === "pzkpfw_140a4") this.toggleT72ShellType();
        else this.toggleStrapCargo();
      }
      else if (code === "KeyI") {
        if (!e.repeat) this.toggleVehicleIgnition();
      }
      else if (code === "KeyP") {
        if (this.boats && this.boats.activeBoat) {
          if (!e.repeat) this.boats.toggleAnchor(this.boats.activeBoat, this.ui, this.audio);
          return;
        }
        this.vehicle.parkingBrake = !this.vehicle.parkingBrake;
        this.audio.playWrench();
        if (this.boats && !this.boats.activeBoat && !this.onFoot) {
          if (this.vehicle.parkingBrake && !this.boats.findLocalMountedBoat() && !this.remoteBoatMount) {
            const underP = this.boats.findBoatUnderPoint(this.vehicle.pos.x, this.vehicle.pos.z, true);
            if (underP && underP.boat && this.boats.spawnedBoats.includes(underP.boat)) {
              if (this.boats.autoSnapAndStrapVehicle(underP.boat, this.vehicle, this.ui, this.audio, this.network.remotePlayers)) return;
            }
          } else if (!this.vehicle.parkingBrake) {
            const ownMP = this.boats.findLocalMountedBoat();
            if (ownMP) { this.boats.autoUnstrapVehicle(ownMP.boat, this.vehicle, this.ui, this.audio); return; }
          }
        }
        this.ui.toast(this.vehicle.parkingBrake ? "Parking Brake [P]: LOCKED" : "Parking Brake [P]: RELEASED");
      }
      else if (code === "Digit1") this.toggleTrailerHitch();
      else if (code === "Digit5") this.toggleCarCarrierLoad();
      else if (code === "KeyC") {
        if (this.boats && this.boats.activeBoat) {
          this.boatCamMode = (this.boatCamMode + 1) % 4;
          this.camOrbitYaw = 0; this.camOrbitPitch = 0;
          this.ui.toast("Naval Camera [C]: " + ["Wide Helm Chase Cam", "Bridge / First-Person Helm", "Cargo Deck / Loading Cam", "Low Waterline Cinematic Cam"][this.boatCamMode]);
          return;
        }
        this.camMode = (this.camMode + 1) % 4;
        this.camOrbitYaw = 0; this.camOrbitPitch = 0;
        this.ui.toast("Camera [C]: " + ["Chase Cam", "Hood / Bumper Cam", "Wide Convoy Cam", "First-Person Cockpit Cam"][this.camMode]);
      }
      else if (code === "KeyB") {
        this.wipersOn = !this.wipersOn;
        this.audio.playWrench();
      }
      else if (code === "KeyL") { this.vehicle.headlights = !this.vehicle.headlights; }
      else if (code === "KeyK") {
        const isTankSL = !!this.vehicle.spec.isTracked;
        if (!this.vehicle.vState.upgrades.ledLightbar) {
          this.ui.toast(isTankSL ? "Install Armored Turret Xenon Searchlight at a Town Garage!" : "Install Roof LED Lightbar at a Town Garage!", true);
        } else {
          this.vehicle.lightbar = !this.vehicle.lightbar;
        }
      }
      else if (code === "KeyH") { this.vehicle.hazards = !this.vehicle.hazards; }
      else if (code === "KeyV") {
        const modes = ["2H", "4H", "4L"];
        this.vehicle.driveMode = modes[(modes.indexOf(this.vehicle.driveMode) + 1) % modes.length];
        this.ui.toast("Transfer Case [V]: " + this.vehicle.driveMode);
      }
      else if (code === "Digit2") {
        if (!(this.vehicle.spec.hasFactoryFrontLock || this.vehicle.vState.upgrades.diffLocks)) this.ui.toast("Buy Air Diff Locks at a Town Garage!", true);
        else { this.vehicle.frontLock = !this.vehicle.frontLock; this.ui.toast("Front Diff Lock [2]: " + (this.vehicle.frontLock ? "LOCKED" : "OPEN")); }
      }
      else if (code === "Digit3") {
        if (!(this.vehicle.spec.hasFactoryRearLock || this.vehicle.vState.upgrades.diffLocks)) this.ui.toast("Buy Air Diff Locks at a Town Garage!", true);
        else { this.vehicle.rearLock = !this.vehicle.rearLock; this.ui.toast("Rear Diff Lock [3]: " + (this.vehicle.rearLock ? "LOCKED" : "OPEN")); }
      }
      else if (code === "KeyU") { this.vehicle.flipUpright(this.world); }
    });
    window.addEventListener("keyup", (e) => { this.keys[e.code] = false; });
  }

  findNearbyRemoteCar(gx, gz, maxDist = 6.8, requireDriverInside = false) {
    let best = null, bestD = maxDist;
    for (const rp of this.network.remotePlayers.values()) {
      if (requireDriverInside && rp.onFoot) continue;
      const d = Math.hypot(rp.gx - gx, rp.gz - gz);
      if (d < bestD) { bestD = d; best = rp; }
    }
    return best;
  }

  toggleOnFoot() {
    if (this.carriedByPeerId) {
      this.carriedByPeerId = null;
      this.vehicle.pos.y += 0.6;
      this.vehicle.vel.set(0, 0, 0);
      this.ui.toast("Unloaded off the Car-Carrier Trailer!");
      return;
    }
    if (this.ridingWithPeerId) {
      const rp = this.network.remotePlayers.get(this.ridingWithPeerId);
      if (rp) {
        this.playerFoot.x = rp.gx + 2.6;
        this.playerFoot.z = rp.gz + 2.6;
        this.playerFoot.y = this.world.getTerrainInfo(this.playerFoot.x, this.playerFoot.z, true).height;
      }
      this.ridingWithPeerId = null;
      this.onFoot = true;
      this.localAvatar.visible = true;
      this.ui.toast("Hopped out of passenger seat!");
      return;
    }

    if (!this.onFoot) {
      if (this.vehicle.speedKmh > 12) { this.ui.toast("Slow down under 12 km/h before jumping out!", true); return; }
      this.onFoot = true;
      const side = new THREE.Vector3(-1, 0, 0).applyQuaternion(this.vehicle.quat);
      this.playerFoot.x = this.vehicle.pos.x + side.x * (this.vehicle.spec.bodyWidth * 0.65 + 1.1);
      this.playerFoot.z = this.vehicle.pos.z + side.z * (this.vehicle.spec.bodyWidth * 0.65 + 1.1);
      this.playerFoot.y = this.world.getTerrainInfo(this.playerFoot.x, this.playerFoot.z, true).height;
      this.localAvatar.visible = true;
      this.ui.toast("On Foot! Press [F] near Hood, Flat Wheel, NPC, or Rig to interact.");
    } else {
      const dOwn = Math.hypot(this.playerFoot.x - this.vehicle.pos.x, this.playerFoot.z - this.vehicle.pos.z);
      const nearFriend = this.findNearbyRemoteCar(this.playerFoot.x, this.playerFoot.z, 6.8);
      if (nearFriend && (dOwn > 5.0 || Math.hypot(nearFriend.gx - this.playerFoot.x, nearFriend.gz - this.playerFoot.z) < dOwn)) {
        this.ridingWithPeerId = nearFriend.peerId;
        this.localAvatar.visible = false;
        this.ui.toast(`Riding Shotgun with ${nearFriend.callsign}! Throw Flares [G] or press [F] to hop out!`);
        return;
      }
      if (dOwn > 7.5) {
        this.ui.toast("Walk closer to your rig (or a LAN friend's car!) to climb in!", true); return;
      }
      this.onFoot = false; this.vehicle.hoodOpen = false; this.localAvatar.visible = false;
      this.ui.toast("Back in the driver's seat!");
    }
  }

  isInGarageZone() {
    const px = this.onFoot ? this.playerFoot.x : this.vehicle.pos.x;
    const pz = this.onFoot ? this.playerFoot.z : this.vehicle.pos.z;
    const near = this.world.getNearbyTownInteraction(px, pz);
    if (near && near.type === "garage") return true;
    for (const t of KK.TOWNS) {
      const gxT = (t.garageX !== undefined) ? t.garageX : t.x, gzT = (t.garageZ !== undefined) ? t.garageZ : t.z;
      if (t.hasGarage && Math.hypot(gxT - px, gzT - pz) < 34) return true;
    }
    if (this.clarksonFarm && this.clarksonFarm.isNearJeremy(px, pz)) return true;
    if (this.hammondMesa && this.hammondMesa.isNearHammond(px, pz)) return true;
    return false;
  }

  buyBoat(boatId) {
    const b = KK.BOATS[boatId];
    if (!b) return;
    if (this.ownedBoats[boatId]) { this.ui.toast("You already own this boat!"); return; }
    if (this.money < b.price) { this.ui.toast(`Need $${b.price.toLocaleString()} to unlock ${b.name}!`, true); return; }
    this.money -= b.price;
    this.ownedBoats[boatId] = true;
    this._saveProgress();
    if (this.audio) this.audio.playCash();
    this._saveProgress(true);
    this.ui.renderHarbor();
    this.ui.toast(`UNLOCKED ${b.name}! Click SUMMON TO WATER to launch it into the harbor!`);
  }

  summonAndOptionallyBoardBoat(boatId, autoBoard = false) {
    if (!this.ownedBoats[boatId]) { this.ui.toast("Unlock this boat first!", true); return; }
    const portInfo = this.activeHarborPort || (this.boats && this.boats.findNearbyPort(
      this.onFoot ? this.playerFoot.x : this.vehicle.pos.x,
      this.onFoot ? this.playerFoot.z : this.vehicle.pos.z, 90
    ));
    if (!portInfo || !portInfo.port) { this.ui.toast("You must be at an Ocean Port Boat Summon Pad!", true); return; }
    const boat = this.boats.summonBoatAtPort(boatId, portInfo.port);
    if (!boat) return;
    this.ui.toast(`${boat.spec.name} launched into ${portInfo.port.name} water! Your vehicle remains parked safely.`);
    if (autoBoard) {
      this.ui.closeModal();
      this.boardBoat(boat);
    } else {
      this.ui.renderHarbor();
    }
  }

  mountCurrentCarOnBoat(boatId) {
    const boat = this.boats && this.boats.spawnedBoats.find((x) => x.id === boatId);
    if (!boat) { this.ui.toast("Summon the boat into the harbor first!", true); return; }
    if (this.boats.mountLocalVehicle(boat, this.vehicle, this.ui, this.audio, this.network.remotePlayers)) {
      this.remoteBoatMount = null;
      this.ui.closeModal();
      this.boardBoat(boat);
    }
  }

  // v18.1.1 ULTRA-SIMPLE SHIP HELM [SPACE]: Enter or Exit Helm (ANYONE can drive!)
  toggleShipHelm() {
    if (!this.boats) return;
    if (this.boats.activeBoat) {
      this.stepOntoBoatDeckOrDisembark();
      return;
    }
    if (this.walkingOnBoat && this.walkingOnBoat.boat) {
      let b = this.walkingOnBoat.boat;
      if (this.walkingOnBoat.isRemote) {
        b = this.boats.claimRemoteBoatForHelm(b);
      }
      if (b) this.boardBoat(b);
      return;
    }
    if (this.onFoot) {
      const nb = this.boats.findNearbyBoat(this.playerFoot.x, this.playerFoot.z, 22, true);
      if (nb && nb.boat) {
        const b = nb.isRemote ? this.boats.claimRemoteBoatForHelm(nb.boat) : nb.boat;
        if (b) this.boardBoat(b);
      }
    }
  }

  // v18.1.1 SATISFYING IGNITION [I] AUTO-LOCK / AUTO-UNLOCK ON SHIP DECKS!
  toggleVehicleIgnition() {
    if (this.onFoot || this.ridingWithPeerId || (this.boats && this.boats.activeBoat)) return;
    this.vehicle.ignitionOn = !this.vehicle.ignitionOn;
    if (!this.vehicle.ignitionOn) {
      if (this.boats && !this.boats.findLocalMountedBoat() && !this.remoteBoatMount) {
        const under = this.boats.findBoatUnderPoint(this.vehicle.pos.x, this.vehicle.pos.z, true);
        if (under && under.boat) {
          if (this.boats.spawnedBoats.includes(under.boat)) {
            if (this.boats.autoSnapAndStrapVehicle(under.boat, this.vehicle, this.ui, this.audio, this.network.remotePlayers)) return;
          } else if (under.boat.ownerPeerId) {
            this._tryBoardRemoteBoatWithVehicle(under.boat, under.boat.ownerPeerId);
            return;
          }
        }
      }
      this.ui.toast("Engine Ignition [I]: OFF");
    } else {
      if (this.boats) {
        const ownM = this.boats.findLocalMountedBoat();
        if (ownM) {
          this.boats.autoUnstrapVehicle(ownM.boat, this.vehicle, this.ui, this.audio);
          return;
        }
        if (this.remoteBoatMount) {
          const rb = this.boats.remoteBoats.get(this.remoteBoatMount.ownerPeerId);
          this.remoteBoatMount = null;
          if (this.audio && this.audio.playWrench) this.audio.playWrench();
          this.ui.toast((rb && rb.deckLocked)
            ? "🔓 IGNITION ON — Car unlocked! (Ramp is CLOSED [U] — open ramp or you'll ram it!)"
            : "🔓 IGNITION ON — Car unlocked! Vroom off the ship!", !!(rb && rb.deckLocked));
          return;
        }
      }
      this.ui.toast("Engine Ignition [I]: ON");
    }
  }

  boardBoat(boat) {
    if (!boat || !this.boats) return;
    this.boats.activeBoat = boat;
    this.walkingOnBoat = null;
    this.onFoot = false;
    this.mouseAimHeld = false;
    if (this.localAvatar) this.localAvatar.visible = false;
    this.ui.toast(`⚓ AT THE HELM: ${boat.spec.name}! [WASD] Drive • [U] Open/Close Ramp • [L/K] Lights • [SPACE] Exit Helm`);
  }

  stepOntoBoatDeckOrDisembark() {
    if (!this.boats || !this.boats.activeBoat) return;
    const b = this.boats.activeBoat;
    if (b.spec && b.spec.walkBounds) {
      this.boats.activeBoat = null;
      const hl = b.spec.helmLocal || { x: 0, z: 0 };
      const clamped = this.boats.clampToWalkDeck(b, hl.x * 0.72, hl.z - 2.0);
      this.walkingOnBoat = { boat: b, isRemote: false, ownerPeerId: null, lx: clamped.x, lz: clamped.z };
      this.onFoot = true;
      if (this.localAvatar) this.localAvatar.visible = true;
      const wP = this.boats.boatLocalToWorld(b, clamped.x, b.spec.deckY + 0.12, clamped.z);
      this.playerFoot.x = wP.x; this.playerFoot.y = wP.y; this.playerFoot.z = wP.z;
      this.ui.toast(`Walking on ${b.spec.name} deck! [F] near Helm to retake bridge, [F] near car to board turret/cab, or [F] at ramp to step ashore.`);
      return;
    }
    this.disembarkBoat();
  }

  disembarkBoat() {
    if (!this.boats || !this.boats.activeBoat) return;
    const b = this.boats.activeBoat;
    this.boats.activeBoat = null;
    this.walkingOnBoat = null;
    if (this.boats.getLocalMountedEntry(b)) {
      if (!this.boats.unmountLocalVehicle(b, this.vehicle, this.ui, this.audio, !b.deckLocked)) {
        this.boats.activeBoat = b;
        return;
      }
    }
    this.ui.toast(`Disembarked ${b.spec.name}! Returned to ${this.vehicle.spec.name}.`);
  }

  _tryBoardRemoteBoatWithVehicle(rb, ownerPeerId) {
    if (!rb || !rb.spec || !rb.spec.maxPayloadKg) {
      this.ui.toast(`${rb ? rb.spec.name : "Boat"} cannot carry vehicles!`, true);
      return false;
    }
    if (rb.deckLocked) {
      this.ui.toast(`Shipmaster has the deck LOCKED! Ask them to press [U] to lower the ramp & unlock!`, true);
      return false;
    }
    const chk = this.boats.canMountVehicle(rb, this.vehicle, this.network.remotePlayers);
    if (!chk.ok) { this.ui.toast(chk.reason, true); return false; }
    this.remoteBoatMount = {
      ownerPeerId, boatId: rb.id, bayIdx: chk.bay.bayIdx,
      bx: chk.bay.x, bz: chk.bay.z, deckY: rb.spec.deckY, label: chk.bay.label
    };
    this.vehicle.hydrolocked = false;
    this.vehicle.inWaterDepth = 0;
    this.vehicle.vel.set(0, 0, 0);
    this.vehicle.angVel.set(0, 0, 0);
    if (this.audio && this.audio.playWrench) this.audio.playWrench();
    this.ui.toast(`BOARDED ${rb.spec.name} [${chk.bay.label}]! Stay inside to fire turrets or press [F] to walk the deck!`);
    return true;
  }

  handleContextInteract() {
    if (this.boats && this.boats.activeBoat) {
      this.stepOntoBoatDeckOrDisembark();
      return true;
    }

    // Walking on a moving boat deck: [F] near car boards car, [F] near shore steps ashore, [F] on own boat retakes helm!
    if (this.walkingOnBoat && this.onFoot) {
      const wb = this.walkingOnBoat;
      const b = wb.boat;
      const dCar = Math.hypot(this.playerFoot.x - this.vehicle.pos.x, this.playerFoot.z - this.vehicle.pos.z);
      if (dCar < 6.5) {
        this.walkingOnBoat = null;
        this.onFoot = false;
        if (this.localAvatar) this.localAvatar.visible = false;
        this.ui.toast(`Boarded ${this.vehicle.spec.name} on deck! Turrets live — if deck is UNLOCKED [U], drive [W] to roll off!`);
        return true;
      }
      // Step ashore if near bow ramp & land is close
      const shorePt = this.boats.boatLocalToWorld(b, 0, 0, b.spec.len * 0.56 + 3.0);
      const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
      const shoreH = this.world.getTerrainInfo(shorePt.x, shorePt.z, false).height;
      if (wb.lz > (b.spec.walkBounds.maxZ - 4.0) && shoreH >= seaL - 0.8) {
        this.walkingOnBoat = null;
        this.playerFoot.x = shorePt.x; this.playerFoot.z = shorePt.z; this.playerFoot.y = shoreH;
        this.ui.toast(`Stepped ashore off ${b.spec.name}!`);
        return true;
      }
      if (!wb.isRemote) {
        this.boardBoat(b);
        return true;
      }
      // On a remote friend's boat: jump off into water or shore
      const sidePt = this.boats.boatLocalToWorld(b, (wb.lx >= 0 ? 1 : -1) * (b.spec.width * 0.55 + 2.5), 0, wb.lz);
      this.walkingOnBoat = null;
      this.playerFoot.x = sidePt.x; this.playerFoot.z = sidePt.z;
      this.playerFoot.y = Math.max(seaL, this.world.getTerrainInfo(sidePt.x, sidePt.z, false).height);
      this.ui.toast(`Stepped off ${b.spec.name}!`);
      return true;
    }

    // Sitting inside a car on a boat deck (strapped OR just parked!): [F] hops out onto the walkable boat deck!
    if (!this.onFoot && this.boats) {
      const ownM = this.boats.findLocalMountedBoat();
      if (!ownM && !this.remoteBoatMount) {
        const underCar = this.boats.findBoatUnderPoint(this.vehicle.pos.x, this.vehicle.pos.z);
        if (underCar && underCar.boat && underCar.boat.spec && underCar.boat.spec.walkBounds) {
          const b = underCar.boat;
          const isRem = !this.boats.spawnedBoats.includes(b);
          const cl = this.boats.clampToWalkDeck(b, underCar.lx + 2.4, underCar.lz);
          this.walkingOnBoat = { boat: b, isRemote: isRem, ownerPeerId: isRem ? b.ownerPeerId : null, lx: cl.x, lz: cl.z };
          this.onFoot = true;
          if (this.localAvatar) this.localAvatar.visible = true;
          this.ui.toast(`Stepped onto ${b.spec.name} deck! Walk to the Bridge Helm & press [F] to take command (tip: strap car [R]/[V] before sailing!).`);
          return true;
        }
      }
      if (ownM) {
        const b = ownM.boat;
        if (b.spec.walkBounds) {
          const cl = this.boats.clampToWalkDeck(b, ownM.entry.x + 2.6, ownM.entry.z);
          this.walkingOnBoat = { boat: b, isRemote: false, ownerPeerId: null, lx: cl.x, lz: cl.z };
          this.onFoot = true;
          if (this.localAvatar) this.localAvatar.visible = true;
          this.ui.toast(`Stepped out onto ${b.spec.name} deck! Press [F] to take the helm or re-enter your car.`);
          return true;
        }
      }
      if (this.remoteBoatMount) {
        const rb = this.boats.remoteBoats.get(this.remoteBoatMount.ownerPeerId);
        if (rb && rb.spec && rb.spec.walkBounds) {
          const cl = this.boats.clampToWalkDeck(rb, this.remoteBoatMount.bx + 2.6, this.remoteBoatMount.bz);
          this.walkingOnBoat = { boat: rb, isRemote: true, ownerPeerId: this.remoteBoatMount.ownerPeerId, lx: cl.x, lz: cl.z };
          this.onFoot = true;
          if (this.localAvatar) this.localAvatar.visible = true;
          this.ui.toast(`Walking on ${rb.spec.name} deck! Press [F] near your car to hop back in.`);
          return true;
        }
      }
    }

    const ix = this.onFoot ? this.playerFoot.x : this.vehicle.pos.x;
    const iz = this.onFoot ? this.playerFoot.z : this.vehicle.pos.z;
    if (this.boats) {
      const nearBoat = this.boats.findNearbyBoat(ix, iz, 34, true);
      if (nearBoat) {
        if (!nearBoat.isRemote) {
          this.boardBoat(nearBoat.boat);
          return true;
        } else if (this.onFoot) {
          // Climb aboard friend's moving ship deck (also works as Man-Overboard boarding ladder!)
          if (nearBoat.boat.spec && nearBoat.boat.spec.walkBounds) {
            const loc = this.boats.worldToBoatLocal(nearBoat.boat, ix, iz);
            const cl = this.boats.clampToWalkDeck(nearBoat.boat, loc.x, loc.z);
            this.walkingOnBoat = { boat: nearBoat.boat, isRemote: true, ownerPeerId: nearBoat.ownerPeerId, lx: cl.x, lz: cl.z };
            this.ui.toast(`Climbed aboard ${nearBoat.boat.spec.name}!`);
            return true;
          }
        } else {
          // Driving a car near a friend's unlocked ship -> load into free bay!
          if (this._tryBoardRemoteBoatWithVehicle(nearBoat.boat, nearBoat.ownerPeerId)) return true;
        }
      }
      const nearPort = this.boats.findNearbyPort(ix, iz, 48);
      if (nearPort) {
        this.activeHarborPort = nearPort;
        this.ui.openModal("harbor");
        return true;
      }
    }
    if (!this.onFoot) {
      const px = this.vehicle.pos.x, pz = this.vehicle.pos.z;
      if (this.clarksonFarm && this.clarksonFarm.isNearJeremy(px, pz)) { this.clarksonFarm.repairPlayerVehicle(this); return true; }
      if (this.clarksonFarm && this.clarksonFarm.isNearLamboTractor(px, pz)) { this.clarksonFarm.borrowLamboTractor(this); return true; }
      if (this.jamesBar && this.jamesBar.isNearParkedSandero(px, pz)) { this.jamesBar.stealDaciaSandero(this); return true; }
      if (this.jamesBar && this.jamesBar.isNearPubDock(px, pz)) { this.jamesBar.interactWithJames(this); return true; }
      if (this.hammondMesa && this.hammondMesa.isNearHammond(px, pz)) { this.hammondMesa.interactWithHammond(this); return true; }

      const canHoist = !!(this.trailer && this.trailer.hitched && (this.trailer.spec.isCarCarrier || this.trailer.trailerId === "flatbed_trailer") && !this.trailer.carriedCar);
      if (canHoist && ((this.milCamp && this.milCamp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24)) ||
                       (this.bm21Camp && this.bm21Camp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24)) ||
                       (this.shilkaCamp && this.shilkaCamp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24)))) {
        this.toggleCarCarrierLoad(); return true;
      }
      if (this.milCamp && this.milCamp.isNearCamp(px, pz)) { this.milCamp.interact(this); return true; }
      if (this.bm21Camp && this.bm21Camp.isNearCamp(px, pz)) { this.bm21Camp.interact(this); return true; }
      if (this.shilkaCamp && this.shilkaCamp.isNearCamp(px, pz)) { this.shilkaCamp.interact(this); return true; }

      const nearSup = this.findNearbySupportTrailer(px, pz, 11.5);
      if (nearSup) { this.serviceAtSupportTrailer(nearSup.owner); return true; }
      const nearGas = this.gasStations ? this.gasStations.getNearbyStation(px, pz, 11.5) : null;
      if (nearGas) { this.gasStations.refuelAtStation(nearGas, this); return true; }
      const nearLm = this.world.getNearbyLandmark(px, pz);
      if (nearLm && !this.claimedLandmarks[nearLm.landmark.id]) { this.claimLandmarkCash(nearLm.landmark); return true; }

      const near = this.world.getNearbyTownInteraction(px, pz);
      if (near && near.type === "garage") { this.ui.openModal("garage"); return true; }
      if (near && near.type === "dock") {
        if (this.activeContract && !this.activeContract.pickedUp && near.town.id === this.activeContract.fromTown) {
          this.pickupContractCargo(); return true;
        }
        const loaded = this.vehicle.cargoCount + (this.trailer && this.trailer.hitched ? this.trailer.cargoCount : 0);
        if (this.activeContract && this.activeContract.pickedUp && !this.activeContract.toBar && near.town.id === this.activeContract.toTown && loaded > 0) {
          this.completeDelivery(); return true;
        }
        this.ui.openModal("contracts");
        return true;
      }
      return false;
    }

    const fx = this.playerFoot.x, fz = this.playerFoot.z;
    if (this.playerFoot.carryingCrate) {
      if (Math.hypot(fx - this.vehicle.pos.x, fz - this.vehicle.pos.z) < 5.5) {
        if (this.vehicle.cargoCount < this.vehicle.spec.cargoSlots) {
          this.vehicle.cargoCount++; this.vehicle.cargoType = this.playerFoot.carryingCrate.cargoType;
          this.vehicle.cargoStrapped = false;
          this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, false);
          this.playerFoot.carryingCrate = null; this.audio.playImpact(0.25);
          this.ui.toast("Loaded crate onto bed! Press [R] to STRAP IT DOWN before driving!");
        } else { this.ui.toast("Truck bed is FULL (" + this.vehicle.spec.cargoSlots + " max)!", true); }
      } else {
        this.entities.spawnLooseCrate(fx, fz, this.playerFoot.carryingCrate.cargoType);
        this.playerFoot.carryingCrate = null; this.ui.toast("Dropped crate on the ground.");
      }
      return true;
    }

    const nearCrate = this.entities.findNearestCrate(fx, fz, 3.2);
    if (nearCrate) {
      this.playerFoot.carryingCrate = { cargoType: nearCrate.cargoType };
      this.entities.removeCrate(nearCrate);
      this.ui.toast("Picked up crate! Walk to your truck bed & press [F] to load it.");
      return true;
    }

    const remFlat = this.findNearbyRemoteBlownWheel(fx, fz, 3.6);
    if (remFlat) { this.assistFriendTireSwapById(remFlat.rp.peerId, remFlat.wheelIdx); return true; }

    const blownIdx = this.findNearbyBlownWheel(fx, fz, 2.7);
    if (blownIdx >= 0) { this.swapTireAtWheel(blownIdx); return true; }

    if (this.clarksonFarm && this.clarksonFarm.isNearJeremy(fx, fz)) { this.clarksonFarm.repairPlayerVehicle(this); return true; }
    if (this.clarksonFarm && this.clarksonFarm.isNearLamboTractor(fx, fz)) { this.clarksonFarm.borrowLamboTractor(this); return true; }
    if (this.jamesBar && this.jamesBar.isNearParkedSandero(fx, fz)) { this.jamesBar.stealDaciaSandero(this); return true; }
    if (this.jamesBar && this.jamesBar.isNearPubDock(fx, fz)) { this.jamesBar.interactWithJames(this); return true; }
    if (this.hammondMesa && this.hammondMesa.isNearHammond(fx, fz)) { this.hammondMesa.interactWithHammond(this); return true; }
    if (this.milCamp && this.milCamp.isNearCamp(fx, fz)) { this.milCamp.interact(this); return true; }
    if (this.bm21Camp && this.bm21Camp.isNearCamp(fx, fz)) { this.bm21Camp.interact(this); return true; }
    if (this.shilkaCamp && this.shilkaCamp.isNearCamp(fx, fz)) { this.shilkaCamp.interact(this); return true; }

    const nearSupF = this.findNearbySupportTrailer(fx, fz, 9.5);
    if (nearSupF) { this.serviceAtSupportTrailer(nearSupF.owner); return true; }

    if (this._isAtEngineBay(fx, fz, this.vehicle)) {
      this.vehicle.hoodOpen = true; this.ui.openModal("field_repair");
        if (!this.tutorialComplete && this.tutorialStep === 3) {
          this.showTutorialDialog(["* Good as new. Patch up anything damaged, hop back in with [F], and finish that delivery to Outpost East!"]);
        }
        return true;
    }

    const nearGasF = this.gasStations ? this.gasStations.getNearbyStation(fx, fz, 11.5) : null;
    if (nearGasF) { this.gasStations.refuelAtStation(nearGasF, this); return true; }
    const nearLmFoot = this.world.getNearbyLandmark(fx, fz);
    if (nearLmFoot && !this.claimedLandmarks[nearLmFoot.landmark.id]) { this.claimLandmarkCash(nearLmFoot.landmark); return true; }

    const nearTown = this.world.getNearbyTownInteraction(fx, fz);
    if (nearTown && nearTown.type === "garage") { this.ui.openModal("garage"); return true; }
    if (nearTown && nearTown.type === "dock") {
      if (this.activeContract && !this.activeContract.pickedUp && nearTown.town.id === this.activeContract.fromTown) {
        this.pickupContractCargo(); return true;
      }
      if (this.activeContract && this.activeContract.pickedUp && !this.activeContract.toBar && nearTown.town.id === this.activeContract.toTown && this.vehicle.cargoCount > 0) {
        this.completeDelivery(); return true;
      }
      this.ui.openModal("contracts"); return true;
    }

    const remCarE = this.findNearbyRemoteCar(fx, fz, 5.2);
    if (remCarE && Math.hypot(fx - remCarE.gx, fz - remCarE.gz) < Math.hypot(fx - this.vehicle.pos.x, fz - this.vehicle.pos.z) && remCarE.onFoot) {
      this.coopTargetPeerId = remCarE.peerId; this.ui.openModal("coop_pit"); return true;
    }

    return false;
  }

  toggleStrapCargo() {
    if (this.vehicle.cargoCount <= 0) { this.ui.toast("No cargo in bed to strap down!"); return; }
    this.vehicle.cargoStrapped = !this.vehicle.cargoStrapped;
    this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, this.vehicle.cargoStrapped);
    this.audio.playWrench();
    this.ui.toast(this.vehicle.cargoStrapped ? "Cargo STRAPPED tight!" : "Cargo UNSTRAPPED — careful on turns!");
  }

  // Pick the optimal anchor socket on YOUR vehicle (Front / Rear / Left / Right / Roof) facing the aimed target!
  _pickOptimalVehicleAnchor(targetGlobal) {
    const spec = this.vehicle.spec;
    const hL = spec.bodyLen * 0.50, hW = spec.bodyWidth * 0.52;
    const candidates = [
      { label: "FRONT BUMPER", local: new THREE.Vector3(0, 0.58,  hL) },
      { label: "REAR HITCH",   local: new THREE.Vector3(0, 0.58, -hL) },
      { label: "LEFT SIDE",    local: new THREE.Vector3(-hW, 0.65, 0) },
      { label: "RIGHT SIDE",   local: new THREE.Vector3( hW, 0.65, 0) },
      { label: "ROOF RACK",    local: new THREE.Vector3(0, spec.bodyHeight + 0.15, 0) }
    ];
    let best = candidates[0], bestD = 999999;
    for (const c of candidates) {
      const worldPt = c.local.clone().applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
      const d = worldPt.distanceTo(targetGlobal);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // CURSOR-AIMED DIRECTIONAL WINCH / PULLEY ([T] fires along crosshair ray -> optimal vehicle anchor!)
  attachWinch() {
    const maxReach = this.vehicle.vState.upgrades.hdWinch ? 120 : 62;
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const camGlobal = new THREE.Vector3(
      this.camera.position.x + this.world.originX,
      this.camera.position.y,
      this.camera.position.z + this.world.originZ
    );

    // Helper: perpendicular distance of a global point from the center crosshair ray
    const scoreTarget = (gx, gy, gz, bonusCone = 1.0) => {
      const toT = new THREE.Vector3(gx - camGlobal.x, gy - camGlobal.y, gz - camGlobal.z);
      const along = toT.dot(camDir);
      if (along < 2.0 || along > maxReach + 18) return null;
      const distFromVeh = Math.hypot(gx - this.vehicle.pos.x, gz - this.vehicle.pos.z);
      if (distFromVeh < 2.5 || distFromVeh > maxReach) return null;
      const proj = camDir.clone().multiplyScalar(along);
      const perp = toT.sub(proj).length();
      const angleRad = Math.atan2(perp, along);
      if (angleRad > 0.24 * bonusCone) return null; // ~14 degree aim cone!
      return { angleRad, distFromVeh };
    };

    // Priority 1: Aimed LAN Friend Vehicle!
    let bestPeer = null, bestPeerScore = 99;
    for (const rp of this.network.remotePlayers.values()) {
      const sc = scoreTarget(rp.gx, rp.gy + 0.9, rp.gz, 1.35);
      if (sc && sc.angleRad < bestPeerScore) { bestPeerScore = sc.angleRad; bestPeer = { rp, dist: sc.distFromVeh }; }
    }
    if (bestPeer) {
      const targetVec = new THREE.Vector3(bestPeer.rp.gx, bestPeer.rp.gy + 0.9, bestPeer.rp.gz);
      const sock = this._pickOptimalVehicleAnchor(targetVec);
      this.vehicle.winch = {
        active: true, targetPeerId: bestPeer.rp.peerId, anchorPos: targetVec,
        localAttach: sock.local, attachLabel: sock.label, length: bestPeer.dist, reeling: 0
      };
      this.network.send({ type: "winch_update", active: true, targetPeerId: bestPeer.rp.peerId, length: bestPeer.dist });
      this.audio.playWrench();
      this.ui.toast(`RESCUE WINCH [${sock.label}] -> ${bestPeer.rp.callsign} (${Math.round(bestPeer.dist)}m)! Hold [T] to PULL THEM OUT (Hold [Space] to anchor brakes!) | [Y] Cut`);
      return;
    }

    // Priority 2: Aimed Tree or Boulder along crosshair!
    let bestObj = null, bestObjScore = 99;
    for (const c of this.world.activeColliders) {
      if (c.broken) continue;
      const sc = scoreTarget(c.x, c.y + 1.4, c.z, 1.15);
      if (sc && sc.angleRad < bestObjScore) { bestObjScore = sc.angleRad; bestObj = { x: c.x, y: c.y + 1.4, z: c.z, kind: c.kind, dist: sc.distFromVeh }; }
    }
    if (bestObj) {
      const targetVec = new THREE.Vector3(bestObj.x, bestObj.y, bestObj.z);
      const sock = this._pickOptimalVehicleAnchor(targetVec);
      this.vehicle.winch = {
        active: true, targetPeerId: null, anchorPos: targetVec,
        localAttach: sock.local, attachLabel: sock.label, length: bestObj.dist, reeling: 0
      };
      this.network.send({ type: "winch_update", active: true, anchorPos: { x: bestObj.x, y: bestObj.y, z: bestObj.z }, length: bestObj.dist });
      this.audio.playWrench();
      this.ui.toast(`WINCH [${sock.label}] -> ${bestObj.kind.toUpperCase()} (${Math.round(bestObj.dist)}m)! Hold [T] Reel, [Shift+T] Slack, [Y] Cut.`);
      return;
    }

    // Priority 3: Aimed Terrain Ground Anchor Stake! (Ray-march crosshair onto hillside/ground!)
    let hitGround = null;
    for (let step = 4; step <= maxReach + 12; step += 2.0) {
      const rx = camGlobal.x + camDir.x * step;
      const ry = camGlobal.y + camDir.y * step;
      const rz = camGlobal.z + camDir.z * step;
      const gh = this.world.getTerrainInfo(rx, rz, true).height;
      if (ry <= gh + 0.35) {
        const dVeh = Math.hypot(rx - this.vehicle.pos.x, rz - this.vehicle.pos.z);
        if (dVeh >= 3.5 && dVeh <= maxReach) {
          hitGround = new THREE.Vector3(rx, gh + 0.25, rz);
        }
        break;
      }
    }
    if (hitGround) {
      const dVeh = hitGround.distanceTo(this.vehicle.pos);
      const sock = this._pickOptimalVehicleAnchor(hitGround);
      this.vehicle.winch = {
        active: true, targetPeerId: null, anchorPos: hitGround,
        localAttach: sock.local, attachLabel: sock.label, length: dVeh, reeling: 0
      };
      this.network.send({ type: "winch_update", active: true, anchorPos: { x: hitGround.x, y: hitGround.y, z: hitGround.z }, length: dVeh });
      this.audio.playWrench();
      this.ui.toast(`GROUND ANCHOR WINCH [${sock.label}] (${Math.round(dVeh)}m)! Hold [T] Reel, [Shift+T] Slack, [Y] Cut.`);
      return;
    }

    this.ui.toast(`Aim crosshair at a tree, boulder, friend, or hillside within ${maxReach}m & press [T]!`, true);
  }

  // CAR-CARRIER TRAILER LOAD / UNLOAD ([5]) — Tow Broken Friends or Your Own Fleet Cars!
  toggleCarCarrierLoad() {
    if (this.carriedByPeerId) {
      this.carriedByPeerId = null;
      this.vehicle.pos.y += 0.6;
      this.vehicle.vel.set(0, 0, 0);
      this.audio.playWrench();
      this.ui.toast("Unloaded your vehicle off the Car-Carrier Trailer!");
      return;
    }
    const canHoistT72 = !!(this.trailer && (this.trailer.spec.isCarCarrier || this.trailer.trailerId === "flatbed_trailer"));
    // PRIORITY 0: Hoist the Secret Broken T-72 Relic onto your Car-Carrier or Flatbed Trailer!
    if (canHoistT72 && !this.trailer.carriedCar && this.milCamp && this.milCamp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24.0)) {
      if (this.ownedVehicles.t72) {
        this.ui.toast("You already restored the T-72B into your personal garage!", false);
        return;
      }
      this.startTimedWork("HOISTING 41.5T BROKEN T-72 RELIC ONTO TRAILER", [
        { label: "Rigging heavy steel tow chains to rusted T-72B hull...", dur: 2.6, sfx: "wrench" },
        { label: "Winching broken Soviet tank up hydraulic ramps...", dur: 3.2, sfx: "impact" },
        { label: "Locking heavy tie-downs — haul south to Richard Hammond's Desert Mesa!", dur: 2.2, sfx: "wrench" }
      ], () => {
        this.trailer.carriedCar = { vid: "t72", col: "#3b4832", peerId: null, isT72Relic: true, label: "Broken T-72B Relic Hull" };
        this.trailerRig.setCarriedCarVisual(this.trailer.carriedCar);
        this.milCamp.setRelicVisible(false);
        this.audio.playCash();
        this.setWaypoint(KK.HAMMOND_MESA.x, KK.HAMMOND_MESA.z, "Hammond's Desert Mesa (T-72 Restore)");
        this.ui.toast("BROKEN T-72 RELIC LOADED!! Haul it all the way south to Richard Hammond's Desert Mesa (Watch wooden bridges!)!");
      });
      return;
    }
    if (canHoistT72 && !this.trailer.carriedCar && this.bm21Camp && this.bm21Camp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24.0)) {
      if (this.ownedVehicles.bm21) { this.ui.toast("You already restored the BM-21 Grad into your garage!"); return; }
      this.startTimedWork('HOISTING BROKEN BM-21 "GRAD" RELIC ONTO TRAILER', [
        { label: "Rigging heavy chains to Ural-4320 rocket chassis...", dur: 2.4, sfx: "wrench" },
        { label: "Winching BM-21 Grad up trailer ramps...", dur: 2.8, sfx: "impact" }
      ], () => {
        this.trailer.carriedCar = { vid: "bm21", col: "#43533a", peerId: null, isBm21Relic: true, label: 'Broken BM-21 "Grad" Relic' };
        this.trailerRig.setCarriedCarVisual(this.trailer.carriedCar);
        this.bm21Camp.setRelicVisible(false);
        this.audio.playCash();
        this.setWaypoint(KK.HAMMOND_MESA.x, KK.HAMMOND_MESA.z, "Hammond's Desert Mesa (BM-21 Restore)");
        this.ui.toast('BM-21 "GRAD" RELIC LOADED!! Haul it to Richard Hammond\'s Desert Mesa ($65,000 restore)!');
      });
      return;
    }
    if (canHoistT72 && !this.trailer.carriedCar && this.shilkaCamp && this.shilkaCamp.isNearRelic(this.trailer.pos.x, this.trailer.pos.z, 24.0)) {
      if (this.ownedVehicles.shilka) { this.ui.toast("You already restored the ZSU-23-4 Shilka into your garage!"); return; }
      this.startTimedWork('HOISTING BROKEN ZSU-23-4 "SHILKA" RELIC ONTO TRAILER', [
        { label: "Chaining GM-575 tracked hull to heavy recovery winch...", dur: 2.4, sfx: "wrench" },
        { label: "Winching ZSU-23-4 Shilka onto trailer deck...", dur: 2.8, sfx: "impact" }
      ], () => {
        this.trailer.carriedCar = { vid: "shilka", col: "#4a5942", peerId: null, isShilkaRelic: true, label: 'Broken ZSU-23-4 "Shilka" Relic' };
        this.trailerRig.setCarriedCarVisual(this.trailer.carriedCar);
        this.shilkaCamp.setRelicVisible(false);
        this.audio.playCash();
        this.setWaypoint(KK.HAMMOND_MESA.x, KK.HAMMOND_MESA.z, "Hammond's Desert Mesa (Shilka Restore)");
        this.ui.toast('ZSU-23-4 "SHILKA" RELIC LOADED!! Haul it to Richard Hammond\'s Desert Mesa ($70,000 restore)!');
      });
      return;
    }
    if (!this.trailer || !this.trailer.spec.isCarCarrier) {
      this.ui.toast("Buy & hitch the Car-Carrier Recovery Trailer inside Contracts [J] first!", true);
      return;
    }
    if (this.trailer.carriedCar) {
      const prev = this.trailer.carriedCar;
      this.trailer.carriedCar = null;
      this.trailerRig.setCarriedCarVisual(null);
      if (prev.peerId) {
        this.network.send({ type: "carrier_sync", targetPeerId: prev.peerId, carrierPeerId: this.network.peerId, sender: this.network.callsign, action: "unload" });
      }
      if (prev.isT72Relic && this.milCamp && !this.ownedVehicles.t72) {
        this.milCamp.setRelicVisible(true);
      }
      if (prev.isBm21Relic && this.bm21Camp && !this.ownedVehicles.bm21) this.bm21Camp.setRelicVisible(true);
      if (prev.isShilkaRelic && this.shilkaCamp && !this.ownedVehicles.shilka) this.shilkaCamp.setRelicVisible(true);
      this.audio.playWrench();
      this.ui.toast(`Unloaded ${prev.label || "vehicle"} off the Car-Carrier Trailer!`);
      return;
    }
    let bestPeer = null, bestD = 15.0;
    for (const rp of this.network.remotePlayers.values()) {
      const d = Math.hypot(rp.gx - this.trailer.pos.x, rp.gz - this.trailer.pos.z);
      if (d < bestD) { bestD = d; bestPeer = rp; }
    }
    if (bestPeer) {
      this.trailer.carriedCar = { vid: bestPeer.vehicleId, col: bestPeer.paintColor, peerId: bestPeer.peerId, label: bestPeer.callsign + "'s " + KK.VEHICLES[bestPeer.vehicleId].name };
      this.trailerRig.setCarriedCarVisual(null);
      this.network.send({ type: "carrier_sync", targetPeerId: bestPeer.peerId, carrierPeerId: this.network.peerId, sender: this.network.callsign, action: "load" });
      this.audio.playWrench();
      this.ui.toast(`Locked ${this.trailer.carriedCar.label} onto Car-Carrier Deck (Zero Duplicates)! Press [5] to unload.`);
      return;
    }
    const otherOwned = Object.keys(this.ownedVehicles).find((vid) => vid !== this.activeVehicleId);
    const loadVid = otherOwned || "uaz452";
    const loadCol = otherOwned ? this.ownedVehicles[otherOwned].paintColor : "#6e4b3a";
    this.trailer.carriedCar = { vid: loadVid, col: loadCol, peerId: null, label: otherOwned ? KK.VEHICLES[loadVid].name : "Broken Salvage UAZ-452" };
    this.trailerRig.setCarriedCarVisual(this.trailer.carriedCar);
    this.audio.playWrench();
    this.ui.toast(`Loaded ${this.trailer.carriedCar.label} onto Car-Carrier Trailer! Press [5] to unload.`);
  }

  // ==========================================================================
  // CPM2 GARAGE, BRANDED PARTS, CAR WASH & FLEET ACTIONS
  // ==========================================================================
  _resetEraCharges() {
    this._eraCharges = { front: 2, left: 2, right: 2 };
  }

  switchVehicle(vid, silent = false) {
    if (!this.ownedVehicles[vid]) return;
    this.activeVehicleId = vid;
    this._resetEraCharges();
    this._resetTankCombatState(true);
    if (this._megaBridgeGhost) this._disposeMegaBridgeGhost();
    this.scene.remove(this.vehicleRig.root);
    this.vehicle.swapVehicleState(this.ownedVehicles[vid], true);
    this.vehicleRig = KK.VehicleBuilder.buildVehicle(vid, this.vehicle.vState, true);
    this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, this.vehicle.cargoStrapped);
    this.scene.add(this.vehicleRig.root);
    if (!silent) {
      this._saveProgress();
      this.ui.renderGarage();
      const swEng = KK.ENGINES[this.vehicle.vState.engineId];
      this.ui.toast(`Active Rig: ${KK.VEHICLES[vid].name} (${swEng.stockHp} HP ${swEng.layout})`);
    }
  }

  buyVehicle(vid) {
    const s = KK.VEHICLES[vid];
    if (!s || this.ownedVehicles[vid]) return;
    if (this.money < s.price) { this.ui.toast("Not enough cash! Deliver more freight!", true); return; }
    this.money -= s.price;
    this.ownedVehicles[vid] = KK.createDefaultVehicleState(vid);
    this.audio.playCash(); this.switchVehicle(vid);
  }

  washVehicle() {
    if ((this.vehicle.vState.dirtLevel || 0) < 0.02) { this.ui.toast("Your rig is already spotless!"); return; }
    if (this.money < 50) { this.ui.toast("Need $50 for Car Wash!", true); return; }
    this.money -= 50;
    this.vehicle.vState.dirtLevel = 0; this.vehicle.vState.snowLevel = 0;
    this.vehicle.vState.health.mudClog = 0;
    this.audio.playCash();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast("Pressure-washed body, tires & radiator spotless!");
  }

  installBrandedPart(partId, brandId) {
    const def = KK.PARTS_CATALOG[partId];
    const br = KK.BRANDS[brandId];
    if (!def || !br) return;
    const price = KK.getPartPrice(partId, brandId);
    if (this.money < price) { this.ui.toast(`Need $${price.toLocaleString()} for ${br.name} ${def.name}!`, true); return; }
    this.money -= price;
    this.vehicle.vState.parts[partId] = { brand: brandId, hp: 100 };
    if (partId === "tieRods") this.vehicle.vState.health.tieRodBias = 0;
    if (partId === "headGasket" || partId === "pistons" || partId === "crankshaft") {
      this.vehicle.hydrolocked = false;
      this.vehicle.engineRunning = true;
    }
    this.audio.playWrench();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast(`Installed ${br.name} ${def.name} (100% HP)!`);
  }

  repairSinglePart(partId, cost) {
    if (this.money < cost) { this.ui.toast("Not enough cash to repair part!", true); return; }
    this.money -= cost;
    this.vehicle.vState.parts[partId].hp = 100;
    if (partId === "tieRods") this.vehicle.vState.health.tieRodBias = 0;
    this.audio.playWrench();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast(`Repaired ${KK.PARTS_CATALOG[partId].name} to 100%!`);
  }

  // v18.1.1 GUNFIRE DAMAGE TO TIRES, HEADLIGHTS, GLASS & TANK TRACKS!
  applyGunfireHitToLocalVehicle(hx, hy, hz, caliber = 14) {
    if (!this.vehicle || !this.vehicle.vState) return;
    const d = Math.hypot(hx - this.vehicle.pos.x, hz - this.vehicle.pos.z);
    const hitRad = (this.vehicle.spec.bodyLen || 4.6) * 0.62 + (caliber >= 35 ? 3.2 : 0.8);
    if (d > hitRad) return;
    const vs = this.vehicle.vState;
    const hlth = vs.health;
    const dmg = caliber >= 100 ? 65 : (caliber >= 30 ? 32 : 16);
    hlth.body = Math.max(5, (hlth.body || 100) - dmg * 0.35);
    hlth.glass = Math.max(0, (hlth.glass !== undefined ? hlth.glass : 100) - dmg * 1.1);
    if (Math.random() < 0.55) {
      if (Math.random() < 0.5) hlth.headlightL = 0; else hlth.headlightR = 0;
    }
    if (this.vehicle.spec.isTracked) {
      if (Math.random() < 0.5) hlth.trackL = Math.max(0, (hlth.trackL !== undefined ? hlth.trackL : 100) - dmg * 1.3);
      else hlth.trackR = Math.max(0, (hlth.trackR !== undefined ? hlth.trackR : 100) - dmg * 1.3);
      if (hlth.trackL < 15 || hlth.trackR < 15) this.ui.toast("💥 TANK TRACK SNAPPED BY GUNFIRE! Repair with [X] Field Repair!", true);
    } else if (vs.blownTires && vs.blownTires.length > 0 && Math.random() < 0.65) {
      const wi = Math.floor(Math.random() * vs.blownTires.length);
      vs.blownTires[wi] = true;
      this.ui.toast("💥 TIRE SHOT OUT! Swap spare or Field Repair [X]!", true);
    }
    if (this.audio) this.audio.playImpact(0.75);
  }

  _rebuildActiveVehicleMesh() {
    if (this.vehicleRig) this.scene.remove(this.vehicleRig.root);
    this.vehicleRig = KK.VehicleBuilder.buildVehicle(this.activeVehicleId, this.vehicle.vState, true);
    this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, this.vehicle.cargoStrapped);
    this.scene.add(this.vehicleRig.root);
  }

  setRimColor(hex) {
    this.vehicle.vState.rimColor = hex;
    this._rebuildActiveVehicleMesh();
    this._saveProgress();
  }

  setCaliperColor(hex) {
    this.vehicle.vState.caliperColor = hex;
    this._rebuildActiveVehicleMesh();
    this._saveProgress();
  }

  setRimStyle(rimId) {
    if (!KK.RIM_STYLES || !KK.RIM_STYLES[rimId]) return;
    this.vehicle.vState.rimStyle = rimId;
    this._rebuildActiveVehicleMesh();
    this._saveProgress();
    this.ui.toast(`Installed Rims: ${KK.RIM_STYLES[rimId].name}!`);
  }

  setPaintColor(hex) { this.vehicle.vState.paintColor = hex; this.vehicleRig.applyUpgrades(this.vehicle.vState); this._saveProgress(); }

  setTune(key, val) {
    this.vehicle.vState.tuning[key] = val; this._saveProgress();
    const bEl = document.getElementById("val-boost"); if (bEl) bEl.textContent = this.vehicle.vState.tuning.boostPsi.toFixed(1) + " PSI";
    const fdEl = document.getElementById("val-fd"); if (fdEl) fdEl.textContent = this.vehicle.vState.tuning.finalDrive.toFixed(2) + " : 1";
    if (document.getElementById("dyno-canvas")) this.ui.drawDynoChart();
  }

  installCategoryBrand(cat, brandId) {
    const br = KK.BRANDS[brandId]; if (!br) return;
    const vs = this.vehicle.vState;
    const targets = Object.values(KK.PARTS_CATALOG).filter((p) => p.cat === cat && vs.parts[p.id].brand !== brandId);
    if (targets.length === 0) { this.ui.toast(`All ${cat} parts are already ${br.name}!`); return; }
    let totalCost = 0;
    for (const p of targets) totalCost += KK.getPartPrice(p.id, brandId);
    if (this.money < totalCost) { this.ui.toast(`Need $${totalCost.toLocaleString()} to batch-upgrade ${targets.length} ${cat} parts to ${br.short}!`, true); return; }
    this.money -= totalCost;
    for (const p of targets) {
      vs.parts[p.id] = { brand: brandId, hp: 100 };
      if (p.id === "tieRods") vs.health.tieRodBias = 0;
    }
    this.audio.playCash();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast(`Upgraded ${targets.length} ${cat.toUpperCase()} modules to ${br.name} (-$${totalCost.toLocaleString()})!`);
  }

  applyTuningPreset(preset) {
    const vs = this.vehicle.vState;
    const def = KK.createDefaultVehicleState(vs.vehicleId).tuning;
    const maxLift = vs.upgrades.hdSuspension ? 0.28 : 0.16;
    const eng = KK.ENGINES[vs.engineId];
    const maxBoost = vs.upgrades.twinTurboKit ? 30 : (vs.upgrades.turboKit ? 24 : (eng.stockTurbo ? (eng.stockBoostPsi || 14) : 0));

    if (preset === "stock") {
      Object.assign(vs.tuning, {
        rideHeight: 0, springStiffness: 1.0, damperRebound: 1.0, antiRoll: 1.0,
        camberDeg: -0.5, toeDeg: 0.0, frontPsi: 30, rearPsi: 30,
        finalDrive: def.finalDrive, gears: def.gears.slice()
      });
      this.ui.toast("Applied Factory Stock setup!");
    } else if (preset === "tarmac") {
      Object.assign(vs.tuning, {
        rideHeight: -0.06, springStiffness: 1.65, damperRebound: 1.55, antiRoll: 1.85,
        camberDeg: -3.5, toeDeg: 0.4, frontPsi: 34, rearPsi: 36,
        finalDrive: Math.max(2.90, +(def.finalDrive * 0.86).toFixed(2)),
        boostPsi: maxBoost
      });
      this.ui.toast("Applied Krasny-Ring Tarmac / Drift setup! (Low, stiff, high PSI, max boost)");
    } else if (preset === "mud") {
      Object.assign(vs.tuning, {
        rideHeight: maxLift, springStiffness: 0.82, damperRebound: 0.85, antiRoll: 0.55,
        camberDeg: 0.0, toeDeg: 0.0, frontPsi: 12, rearPsi: 12,
        finalDrive: Math.min(7.40, +(def.finalDrive * 1.24).toFixed(2))
      });
      this.ui.toast("Applied Deep Mud Crawler setup! (Max lift, soft articulation, 12 PSI, short gears)");
    } else if (preset === "dune") {
      Object.assign(vs.tuning, {
        rideHeight: Math.min(maxLift, 0.18), springStiffness: 1.15, damperRebound: 1.35, antiRoll: 0.90,
        camberDeg: -1.0, toeDeg: 0.0, frontPsi: 16, rearPsi: 16,
        finalDrive: def.finalDrive, boostPsi: maxBoost
      });
      this.ui.toast("Applied Desert Dune Raid setup! (High travel, 16 PSI sand bite, max boost)");
    }
    this.audio.playWrench();
    this._saveProgress();
    this.ui.renderGarage();
  }

  setGearRatio(idx, val) { this.vehicle.vState.tuning.gears[idx] = val; this._saveProgress(); this.ui.renderGarage(); }

  resetSuspensionDefaults() {
    const def = KK.createDefaultVehicleState(this.vehicle.vState.vehicleId).tuning;
    Object.assign(this.vehicle.vState.tuning, { rideHeight: def.rideHeight, springStiffness: def.springStiffness, damperRebound: def.damperRebound, antiRoll: def.antiRoll, camberDeg: def.camberDeg, toeDeg: def.toeDeg, frontPsi: def.frontPsi, rearPsi: def.rearPsi });
    this._saveProgress(); this.ui.renderGarage(); this.ui.toast("Suspension reset to factory spec.");
  }

  installEngine(eid) {
    const eng = KK.ENGINES[eid];
    const spec = KK.VEHICLES[this.vehicle.vState.vehicleId];
    const cost = (spec && spec.stockEngineId === eid) ? 0 : eng.price;
    if (!eng || this.money < cost) { this.ui.toast("Insufficient funds!", true); return; }
    this.money -= cost;
    this.vehicle.vState.engineId = eid;
    if (eng.stockTurbo) {
      this.vehicle.vState.upgrades.turboKit = true;
      this.vehicle.vState.tuning.boostPsi = eng.stockBoostPsi || 12;
    } else if (!this.vehicle.vState.upgrades.turboKit) {
      this.vehicle.vState.tuning.boostPsi = 0;
    }
    this.vehicle.rpm = eng.idleRpm;
    this.audio.playCash(); this._saveProgress(); this.ui.renderGarage();
    this.ui.toast(`Swapped engine to ${eng.name} (${eng.stockHp} HP)!`);
  }

  buyUpgrade(uid) {
    if (!this.tutorialComplete && this.tutorialStep === 4) {
      setTimeout(() => {
        if (!this.tutorialComplete && this.tutorialStep === 4) {
          this.tutorialComplete = true;
          this.tutorialStep = 99;
          if (this._tutArrow) this._tutArrow.visible = false;
          this._saveProgress(true);
          this.showTutorialDialog([
            "* Look at you — a certified Oblast courier. All towns, contracts, barges, and dealerships are now unlocked.",
            "* This map is massive. There's a mountain pass, a desert mesa, a racetrack, outer islands, and frozen northern wastes...",
            "* Oh, and one last thing. If the trees start making siren noises, or the snow starts shaking, or you see something way too big moving near the volcano...",
            "* ...don't stop to say hi. Good luck out there, driver."
          ]);
        }
      }, 120);
    }
    const u = KK.UPGRADES[uid];
    if (!u || this.vehicle.vState.upgrades[uid]) return;
    if (this.money < u.price) { this.ui.toast("Insufficient funds!", true); return; }
    this.money -= u.price; this.vehicle.vState.upgrades[uid] = true;
    if (uid === "turboKit" && this.vehicle.vState.tuning.boostPsi < 10) this.vehicle.vState.tuning.boostPsi = 14;
    if (uid === "twinTurboKit") {
      this.vehicle.vState.upgrades.turboKit = true;
      this.vehicle.vState.tuning.boostPsi = Math.max(20, this.vehicle.vState.tuning.boostPsi);
    }
    if (uid === "t72SeismicFcs") {
      this.vehicle.vState.t72ThermAmmo = 10;
      this.vehicle.vState.t72ShellType = "therm";
    }
    if (uid === "mudTires") {
      if (!this.tutorialComplete && this.tutorialStep === 4) {
        this.tutorialComplete = true;
        this.tutorialStep = 99;
        if (this._tutArrow) this._tutArrow.visible = false;
        this._saveProgress(true);
        this.showTutorialDialog([
          "* Look at you — a certified Oblast courier. All towns, contracts, barges, and dealerships are now unlocked.",
          "* This map is massive. There's a mountain pass, a desert mesa, a racetrack, outer islands, and frozen northern wastes...",
          "* Oh, and one last thing. If the trees start making siren noises, or the snow starts shaking, or you see something way too big moving near the volcano...",
          "* ...don't stop to say hi. Good luck out there, driver."
        ]);
      }
      this.scene.remove(this.vehicleRig.root);
      this.vehicleRig = KK.VehicleBuilder.buildVehicle(this.activeVehicleId, this.vehicle.vState, true);
      this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, this.vehicle.cargoStrapped);
      this.scene.add(this.vehicleRig.root);
    } else { this.vehicleRig.applyUpgrades(this.vehicle.vState); }
    this.audio.playCash(); this._saveProgress(); this.ui.renderGarage(); this.ui.toast("Installed: " + u.name);
  }

  garageFullRepair(cost) {
    if (this.money < cost) { this.ui.toast("Not enough cash!", true); return; }
    this.ui.closeModal();
    this.startTimedWork("GARAGE FULL MECHANICAL OVERHAUL", [
      { label: "Lifting rig on workshop hoist & draining fluids...", dur: 2.0, sfx: "wrench" },
      { label: "Rebuilding worn Engine, Gearbox & Suspension components...", dur: 2.4, sfx: "impact" },
      { label: "Laser-aligning tie-rods, headlights & fresh tires...", dur: 2.0, sfx: "impact" }
    ], () => {
      if (this.money < cost) return;
      this.money -= cost;
      const vs = this.vehicle.vState;
      for (const pid of Object.keys(KK.PARTS_CATALOG)) vs.parts[pid].hp = 100;
      vs.burnedOut = false; if ((vs.fuel || 0) < 25) vs.fuel = 100;
      vs.health.mudClog = 0; vs.health.tieRodBias = 0; vs.health.tires = 100; vs.health.body = 100;
      vs.health.headlightL = 100; vs.health.headlightR = 100; vs.health.trackL = 100; vs.health.trackR = 100; this._trkAlreadySnapped = {}; vs.health.glass = 100; vs.health.lightbar = 100; vs.health.taillightL = 100; vs.health.taillightR = 100;
      for (let i = 0; i < vs.blownTires.length; i++) { vs.blownTires[i] = false; vs.tiresHP[i] = 100; }
      vs.spareTires = this.vehicle.spec.wheels.length >= 6 ? 3 : 2;
      this.vehicle.hydrolocked = false; this.vehicle.engineRunning = this.vehicle.ignitionOn; this.vehicle.coolantTemp = 82;
      this._resetEraCharges();
      this._resetTankCombatState(true);
      this.audio.playCash(); this._saveProgress(true);
      this.ui.toast("Garage Overhaul Complete — Every part, light & ERA block restored to 100%!");
    });
  }

  garageRefuel(cost) {
    if (this.money < cost) { this.ui.toast("Not enough cash!", true); return; }
    this.money -= cost; this.vehicle.vState.fuel = this.vehicle.spec.fuelCapacity; this.vehicle.engineRunning = true;
    this.audio.playCash(); this._saveProgress(); this.ui.renderGarage(); this.ui.toast("Fuel tank topped off!");
  }

  doFieldRepair(part) {
    const vs = this.vehicle.vState, p = vs.parts;
    if (part === "tires") {
      const flatIdx = (vs.blownTires || []).findIndex(Boolean);
      if (flatIdx < 0) { this.ui.toast("All tires are already inflated!"); return; }
      this.ui.closeModal();
      this.swapTireAtWheel(flatIdx);
      return;
    }
    this.ui.closeModal();
    const steps = (part === "fuel")
      ? [{ label: "Unstrapping emergency jerrycan & funnel...", dur: 1.5, sfx: "wrench" }, { label: "Pouring +18L fuel into tank...", dur: 2.2, sfx: "wrench" }]
      : [
          { label: "Inspecting damaged components under hood...", dur: 2.0, sfx: "wrench" },
          { label: "Wrenching & applying roadside Soviet field patch...", dur: 2.6, sfx: "impact" },
          { label: "Tightening clamps & testing system...", dur: 1.8, sfx: "wrench" }
        ];
    this.startTimedWork("ROADSIDE FIELD REPAIR (" + part.toUpperCase() + ")", steps, () => {
      this._finishFieldRepair(part);
    });
  }

  _finishFieldRepair(part) {
    const vs = this.vehicle.vState, p = vs.parts;
    this.audio.playCash();
    if (part === "engine") {
      vs.health.trackL = 100; vs.health.trackR = 100; this._trkAlreadySnapped = {}; vs.health.glass = 100;
      this._resetEraCharges();
      this._resetTankCombatState(false);
      if (vs.burnedOut) { vs.burnedOut = false; vs.fuel = Math.max(vs.fuel || 0, 28); vs.health.body = Math.max(vs.health.body || 4, 45); }
      this.vehicle.hydrolocked = false; this.vehicle.engineRunning = true;
      for (const id of ["airFilter", "fuelRails", "fuelInjectors", "sparkPlugs", "pistons", "crankshaft", "camshaft", "headGasket"]) {
        p[id].hp = Math.max(p[id].hp, 65);
      }
      this.ui.toast("Drained water & roadside-patched Engine subsystems to 65%!");
    } else if (part === "radiator") {
      vs.health.mudClog = 0; vs.health.headlightL = Math.max(vs.health.headlightL ?? 0, 85); vs.health.headlightR = Math.max(vs.health.headlightR ?? 0, 85); p.radiator.hp = Math.max(p.radiator.hp, 72); p.waterPump.hp = Math.max(p.waterPump.hp, 72);
      p.intercooler.hp = Math.max(p.intercooler.hp, 72); p.exhaustManifold.hp = Math.max(p.exhaustManifold.hp, 72);
      this.vehicle.coolantTemp = 84;
      this.ui.toast("Scraped mud off radiator & patched cooling system!");
    } else if (part === "transmission") {
      for (const id of ["flywheel", "clutchPack", "gearboxGears", "transferCase", "driveshaft"]) {
        p[id].hp = Math.max(p[id].hp, 65);
      }
      this.ui.toast("Adjusted clutch & drivetrain linkages to 65%!");
    } else if (part === "suspension") {
      vs.health.tieRodBias = 0;
      for (const id of ["coilSprings", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods", "antiRollBar", "wheelHubs", "brakeSystem"]) {
        p[id].hp = Math.max(p[id].hp, 65);
      }
      this.ui.toast("Hammered tie-rod straight & patched shocks/brakes to 65%!");
    } else if (part === "tires") {
      let swapped = 0;
      for (let i = 0; i < vs.blownTires.length; i++) {
        if (vs.blownTires[i] && (vs.spareTires || 0) > 0) {
          vs.blownTires[i] = false; vs.tiresHP[i] = 100; vs.spareTires--; swapped++;
        }
      }
      if (swapped > 0) this.ui.toast(`Swapped ${swapped} blown tire(s) with Spares! (${vs.spareTires} left)`);
      else this.ui.toast(vs.blownTires.some(Boolean) ? "No spare tires left — visit a Support Trailer or Garage!" : "All tires are already inflated!", true);
    } else if (part === "fuel") {
      if (this.money < 120) { this.ui.toast("Need $120 for emergency jerrycan!", true); return; }
      this.money -= 120; vs.fuel = Math.min(this.vehicle.spec.fuelCapacity, vs.fuel + 18); this.vehicle.engineRunning = true;
      this.ui.toast("Poured +18L emergency fuel!");
    }
    this._saveProgress(); if (this.ui.activeModal === 'field_repair') this.ui.renderFieldRepair();
  }

  buyOrSpawnTrailer(trailerId) {
    const spec = KK.TRAILERS[trailerId];
    if (!spec) return;
    if (!this.ownedTrailers[trailerId]) {
      if (this.money < spec.price) { this.ui.toast(`Need $${spec.price.toLocaleString()} for ${spec.name}!`, true); return; }
      this.money -= spec.price;
      this.ownedTrailers[trailerId] = true;
      this.audio.playCash();
    }
    if (this.trailerRig) this.scene.remove(this.trailerRig.root);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
    const yaw = Math.atan2(fwd.x, fwd.z);
    const backDist = this.vehicle.spec.bodyLen * 0.5 + spec.hitchDist + 0.35;
    const tx = this.vehicle.pos.x - Math.sin(yaw) * backDist;
    const tz = this.vehicle.pos.z - Math.cos(yaw) * backDist;
    const ty = this.world.getTerrainInfo(tx, tz, true).height;
    this.trailer = new KK.TrailerPhysics(trailerId, tx, ty, tz, yaw);
    this.trailer.hitched = true;
    this.trailerRig = KK.TrailerBuilder.buildTrailer(trailerId);
    this.scene.add(this.trailerRig.root);
    this._saveProgress(true);
    this.ui.toast(`Spawned & Hitched ${spec.name}! Press [1] anytime to unhitch/hitch!`);
    if (this.ui.activeModal === "contracts") this.ui.renderContracts();
  }

  despawnTrailer() {
    if (this.trailerRig) this.scene.remove(this.trailerRig.root);
    this.trailer = null; this.trailerRig = null;
    this.ui.toast("Trailer stored back at depot.");
    if (this.ui.activeModal === "contracts") this.ui.renderContracts();
  }

  toggleTrailerHitch() {
    if (!this.trailer) {
      this.ui.toast("No trailer spawned! Buy/spawn a Log Trailer inside Contracts [J]!", true);
      return;
    }
    if (this.trailer.hitched) {
      this.trailer.hitched = false;
      this.audio.playWrench();
      this.ui.toast("Trailer UNHITCHED! Back up near its tongue and press [1] to re-hitch.");
    } else {
      const hPos = this.trailer.getRearHitchWorldPos(this.vehicle);
      const tTongueX = this.trailer.pos.x + Math.sin(this.trailer.yaw) * this.trailer.spec.hitchDist;
      const tTongueZ = this.trailer.pos.z + Math.cos(this.trailer.yaw) * this.trailer.spec.hitchDist;
      if (Math.hypot(hPos.x - tTongueX, hPos.z - tTongueZ) > 6.5) {
        this.ui.toast("Back your rear bumper closer (<6.5m) to the trailer hitch tongue!", true);
        return;
      }
      this.trailer.hitched = true;
      this.audio.playWrench();
      this.ui.toast("Trailer HITCHED tight!");
    }
  }

  acceptContract(contractId, asLanConvoy) {
    if (!this.tutorialComplete && this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.radarFlashTimer = 4.0;
      this.showTutorialDialog([
        "* Nice! Cargo's loaded. Keep an eye on that flashing PURPLE dot on your radar — that's Kamenka Outpost East.",
        "* Quick survival cheat-sheet while you roll out: [L] toggles headlights, [V] handles winch/straps, and [O] opens the full controls list anytime.",
        "* Go make your first ruble!"
      ]);
    }
    const c = this.ui.availableContracts.find((x) => x.id === contractId);
    if (!c) return;
    const cDef = KK.CARGO_TYPES[c.cargoType] || KK.CARGO_TYPES.standard;
    const hasLogTrailer = !!(this.trailer && this.trailer.hitched && this.trailer.spec.canCarryLogs);
    const canBedLogs = !!this.vehicle.spec.canCarryLogsInBed;

    if (cDef.requiresTrailerOrHeavy && !canBedLogs && !hasLogTrailer) {
      this.ui.toast("Giant Logs require a Hitched Log Trailer (buy above!) OR the KamAZ-4310 6x6!", true);
      return;
    }

    this.activeContract = Object.assign({}, c, { pickedUp: false });
    this.vehicle.cargoIntegrity = 100;
    this.vehicle.cargoCount = 0;
    this.vehicleRig.setCargoVisual(0, c.cargoType, true);
    if (this.trailer) { this.trailer.cargoCount = 0; this.trailerRig.setCargoVisual(0, c.cargoType, true); }

    const orig = KK.TOWNS[c.fromTown] || KK.TOWNS[0];
    this.setWaypoint(orig.x, orig.z, "PICKUP: " + orig.name);

    const distToOrig = Math.hypot(orig.x - this.vehicle.pos.x, orig.z - this.vehicle.pos.z);
    if (asLanConvoy) {
      const cid = "CONV-" + Math.floor(1000 + Math.random() * 9000);
      this.activeConvoyId = cid;
      this.network.send({ type: "convoy_create", convoyId: cid, title: c.title, fromTown: c.fromTown, toTown: c.toTown, toBar: !!c.toBar, reward: c.reward, cargoType: c.cargoType });
      this.ui.addChatLine("DISPATCH", `Created LAN Convoy "${c.title}" — Meet at ${orig.name} dock!`, true);
    }
    this.ui.closeModal();
    if (distToOrig < 58) {
      this.pickupContractCargo();
    } else {
      this.ui.toast(`Contract accepted: Drive to ${orig.name} dock (${(distToOrig / 1000).toFixed(1)} km) & press [F] to load cargo!`);
    }
  }

  pickupContractCargo() {
    if (!this.activeContract) return;
    const c = this.activeContract;
    const orig = KK.TOWNS[c.fromTown] || KK.TOWNS[0];
    if (Math.hypot(orig.x - this.vehicle.pos.x, orig.z - this.vehicle.pos.z) > 65) {
      this.ui.toast(`You must physically drive to ${orig.name} dock to load this cargo!`, true);
      return;
    }
    const cDef = KK.CARGO_TYPES[c.cargoType] || KK.CARGO_TYPES.standard;
    const hasLogTrailer = !!(this.trailer && this.trailer.hitched && this.trailer.spec.canCarryLogs);
    const canBedLogs = !!this.vehicle.spec.canCarryLogsInBed;
    if (cDef.requiresTrailerOrHeavy && !canBedLogs && !hasLogTrailer) {
      this.ui.toast("Giant Logs require a Hitched Log Trailer OR the KamAZ-4310 6x6!", true);
      return;
    }

    c.pickedUp = true;
    this.vehicle.cargoIntegrity = 100;
    this.vehicle.cargoType = c.cargoType;
    this.vehicle.cargoStrapped = true;

    if (hasLogTrailer && (cDef.requiresTrailerOrHeavy || c.units > this.vehicle.spec.cargoSlots)) {
      const trUnits = Math.min(c.units, this.trailer.spec.cargoSlots);
      this.trailer.cargoType = c.cargoType;
      this.trailer.cargoCount = trUnits;
      this.trailerRig.setCargoVisual(trUnits, c.cargoType, true);
      const rem = cDef.requiresTrailerOrHeavy ? 0 : Math.min(c.units - trUnits, this.vehicle.spec.cargoSlots);
      this.vehicle.cargoCount = rem;
      this.vehicleRig.setCargoVisual(rem, c.cargoType, true);
    } else {
      const units = Math.min(c.units, this.vehicle.spec.cargoSlots);
      this.vehicle.cargoCount = units;
      this.vehicleRig.setCargoVisual(units, c.cargoType, true);
      if (this.trailer) { this.trailer.cargoCount = 0; this.trailerRig.setCargoVisual(0, c.cargoType, true); }
    }

    const dest = c.toBar
      ? { name: KK.JAMES_MAY_BAR.name, x: KK.JAMES_MAY_BAR.dockX, z: KK.JAMES_MAY_BAR.dockZ }
      : (KK.TOWNS[c.toTown] || KK.TOWNS[1]);
    this.setWaypoint(dest.x, dest.z, dest.name);
    this.audio.playImpact(0.35);
    this.ui.toast(`CARGO LOADED at ${orig.name}! Haul it safely to ${dest.name} & press [F] at the dock!`);
  }

  joinLanConvoy(convoyId) {
    const cv = this.network.convoys.find((x) => x.id === convoyId);
    if (!cv) return;
    this.network.send({ type: "convoy_join", convoyId });
    this.activeConvoyId = convoyId;
    this.activeContract = { id: cv.id, title: cv.title, fromTown: cv.fromTown, toTown: cv.toTown, toBar: !!cv.toBar, cargoType: cv.cargoType, units: Math.min(4, this.vehicle.spec.cargoSlots), reward: cv.reward, pickedUp: false };
    const orig = KK.TOWNS[cv.fromTown] || KK.TOWNS[0];
    this.setWaypoint(orig.x, orig.z, "PICKUP: " + orig.name);
    this.ui.closeModal();
    if (Math.hypot(orig.x - this.vehicle.pos.x, orig.z - this.vehicle.pos.z) < 62) this.pickupContractCargo();
    else this.ui.toast(`Joined LAN Convoy "${cv.title}"! Meet at ${orig.name} dock & press [F] to load!`);
  }

  autoLoadAtDock() { this.pickupContractCargo(); }

  abandonContract() {
    this.activeContract = null; this.activeConvoyId = null; this.vehicle.cargoCount = 0;
    this.vehicleRig.setCargoVisual(0, "standard", true);
    if (this.trailer) { this.trailer.cargoCount = 0; this.trailerRig.setCargoVisual(0, "standard", true); }
    this.ui.renderContracts(); this.ui.toast("Contract abandoned.", true);
  }

  completeDelivery() {
    if (!this.activeContract) return;
    const c = this.activeContract;
    if (!c.pickedUp) {
      const orig = KK.TOWNS[c.fromTown] || KK.TOWNS[0];
      this.ui.toast(`You haven't picked up the cargo yet! Drive to ${orig.name} dock first!`, true);
      return;
    }
    const deliveredUnits = this.vehicle.cargoCount + (this.trailer && this.trailer.hitched ? this.trailer.cargoCount : 0);
    const intPct = Math.max(0, Math.min(100, this.vehicle.cargoIntegrity));
    const intScale = intPct <= 0.5 ? 0.05 : (0.05 + 0.95 * (intPct / 100));
    const payout = Math.round(c.reward * intScale * Math.min(1.0, deliveredUnits / Math.max(1, c.units)));
    this.money += payout;
    this.stats.deliveries += 1;
    this.audio.playCash();
    if (this.activeConvoyId) {
      this.network.send({ type: "convoy_complete", convoyId: this.activeConvoyId });
      this.network.send({ type: "chat_msg", sender: "DISPATCH", text: `${this.network.callsign} delivered Convoy "${c.title}" for $${payout.toLocaleString()}!`, system: true });
    }
    this.ui.toast(`DELIVERY COMPLETE! Earned $${payout.toLocaleString()} (Cargo ${this.vehicle.cargoIntegrity.toFixed(0)}% intact)!`);
    this.activeContract = null; this.activeConvoyId = null; this.vehicle.cargoCount = 0;
    this.vehicleRig.setCargoVisual(0, "standard", true); if (this.trailer && this.trailerRig) { this.trailer.cargoCount = 0; this.trailerRig.setCargoVisual(0, "logs", true); } this.waypoint = null;
    if (!this.tutorialComplete && this.tutorialStep >= 1 && this.tutorialStep < 4) {
      if (this.vehicle) this.vehicle.tutorialSensitiveDmg = false;
      this.tutorialStep = 4;
      this.radarFlashTimer = 4.0;
      const tEast = KK.TOWNS[1];
      const gxG = (tEast && tEast.garageX !== undefined) ? tEast.garageX : 1325;
      const gzG = (tEast && tEast.garageZ !== undefined) ? tEast.garageZ : 165;
      this.setWaypoint(gxG, gzG, "Outpost East Garage");
      this.showTutorialDialog([
        "* Boom — first paycheck! Now drive over to the GARAGE pad (follow the arrow) and hit [F] to open the shop.",
        "* Stock tires are basically butter in the mud. Click the glowing 👉 37\" OVERSIZE LIFT TIRES button to upgrade your rig!"
      ]);
    }
    this._saveProgress(true);
  }

  setWaypoint(gx, gz, label) { this.waypoint = { x: gx, z: gz, label }; this.ui.toast("GPS Waypoint set: " + label); }
  setServerEnv(patch) {
    if (patch && patch.weather === "hurricane") {
      const ab = this.boats ? this.boats.activeBoat : null;
      const px = ab ? ab.gx : (this.onFoot ? this.playerFoot.x : this.vehicle.pos.x);
      const pz = ab ? ab.gz : (this.onFoot ? this.playerFoot.z : this.vehicle.pos.z);
      if (!this._isPosInOpenSea || !this._isPosInOpenSea(px, pz)) {
        if (this.ui) this.ui.toast("❌ Hurricanes only form over open ocean!", true);
        return;
      }
    } this.weather.setEnvironment(patch.timeOfDay, patch.weather, patch.timeScale); this.network.send(Object.assign({ type: "env_control" }, patch)); if (this.ui.activeModal === "env") this.ui.renderEnvControls(); }
  repairAllBridgesLAN() { this.world.repairAllBridges(); this.network.send({ type: "bridge_repair", bridgeId: "__ALL__" }); this.ui.toast("Rebuilt all broken bridges across Krasno-Kamenka!"); }

  claimLandmarkCash(lm) {
    if (!lm || this.claimedLandmarks[lm.id]) return;
    this.claimedLandmarks[lm.id] = true;
    this.money += lm.rewardCash;
    this.world.hideLandmarkBeacon(lm.id);
    this.audio.playCash();
    this.particles.emitCrashBurst(lm.x, lm._baseH + 1.5, lm.z, 1.0, "sand", "clear");
    this._saveProgress(true);
    this.ui.toast(`TREASURE CLAIMED at ${lm.name}! +$${lm.rewardCash.toLocaleString()}!`);
    this.network.send({
      type: "chat_msg",
      sender: "DISPATCH",
      text: `${this.network.callsign} raided ${lm.name} for $${lm.rewardCash.toLocaleString()}!`,
      system: true
    });
  }

  setGraphicsPreset(preset, silent = false) {
    const p = ["potato", "low", "med", "high"].includes(preset) ? preset : "high";
    this.gfxPreset = p;
    try { localStorage.setItem("kk_gfx_preset", p); } catch (e) {}

    const dpr = window.devicePixelRatio || 1;
    if (p === "potato") {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      KK.CHUNK_RADIUS = 2;
      this.setParticleQuality("low");
    } else if (p === "low") {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      KK.CHUNK_RADIUS = 2;
      this.setParticleQuality("low");
    } else if (p === "med") {
      this.renderer.setPixelRatio(Math.min(dpr, 1.25));
      this.renderer.shadowMap.enabled = true;
      if (this.weather && this.weather.sunLight && this.weather.sunLight.shadow) {
        this.weather.sunLight.shadow.mapSize.set(1024, 1024);
        if (this.weather.sunLight.shadow.map) { this.weather.sunLight.shadow.map.dispose(); this.weather.sunLight.shadow.map = null; }
      }
      KK.CHUNK_RADIUS = 3;
      this.setParticleQuality("med");
    } else {
      this.renderer.setPixelRatio(Math.min(dpr, 1.5));
      this.renderer.shadowMap.enabled = true;
      if (this.weather && this.weather.sunLight && this.weather.sunLight.shadow) {
        this.weather.sunLight.shadow.mapSize.set(2048, 2048);
        if (this.weather.sunLight.shadow.map) { this.weather.sunLight.shadow.map.dispose(); this.weather.sunLight.shadow.map = null; }
      }
      KK.CHUNK_RADIUS = 3;
      this.setParticleQuality("high");
    }
    this.renderer.shadowMap.needsUpdate = true;
    if (this.world && this.vehicle) {
      const ab = this.boats ? this.boats.activeBoat : null;
      const fx = ab ? ab.gx : this.vehicle.pos.x;
      const fz = ab ? ab.gz : this.vehicle.pos.z;
      this.world.updateChunks(fx, fz, true);
    }
    if (!silent) {
      this.ui.toast(`Graphics Preset: ${p.toUpperCase()} (PixelRatio ${this.renderer.getPixelRatio().toFixed(2)} • Shadows ${this.renderer.shadowMap.enabled ? "ON" : "OFF"} • Radius ${KK.CHUNK_RADIUS})`);
      if (this.ui.activeModal === "env" && this.ui.renderEnvControls) this.ui.renderEnvControls();
    }
  }

  setParticleQuality(mode) {
    this.particles.setQuality(mode);
    this.ui.toast("Particle Quality set to " + mode.toUpperCase() + " (Max " + this.particles.budget + " active)");
    if (this.ui.activeModal === "env") this.ui.renderEnvControls();
  }

  setAudioVolume(val) {
    this.audio.setVolume(val);
  }

  toggleAudioMute() {
    this.audio.muted = !this.audio.muted;
    this.audio.setVolume(this.audio.volume);
    this.ui.toast(this.audio.muted ? "Audio Muted" : "Audio Unmuted");
    if (this.ui.activeModal === "env") this.ui.renderEnvControls();
  }

  throwRoadFlare() {
    if (this.flareCount <= 0) {
      this.ui.toast("Out of Road Flares! Drive through any Town to restock (6 flares)!", true);
      return;
    }
    this.flareCount--;
    let sx, sy, sz, vx, vy, vz;
    if (this.ridingWithPeerId) {
      const rp = this.network.remotePlayers.get(this.ridingWithPeerId);
      sx = rp ? rp.gx : this.playerFoot.x; sy = (rp ? rp.gy : this.playerFoot.y) + 1.6; sz = rp ? rp.gz : this.playerFoot.z;
      const cd = new THREE.Vector3(); this.camera.getWorldDirection(cd);
      vx = cd.x * 16 + (rp ? (rp.vx || 0) : 0); vy = 7.0; vz = cd.z * 16 + (rp ? (rp.vz || 0) : 0);
    } else if (this.onFoot) {
      sx = this.playerFoot.x; sy = this.playerFoot.y + 1.4; sz = this.playerFoot.z;
      vx = Math.sin(this.playerFoot.yaw) * 14; vy = 6.5; vz = Math.cos(this.playerFoot.yaw) * 14;
    } else {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.vehicle.quat);
      sx = this.vehicle.pos.x + right.x * 1.1; sy = this.vehicle.pos.y + 1.3; sz = this.vehicle.pos.z + right.z * 1.1;
      vx = this.vehicle.vel.x + (fwd.x * 11 + right.x * 7);
      vy = this.vehicle.vel.y + 6.8;
      vz = this.vehicle.vel.z + (fwd.z * 11 + right.z * 7);
    }
    this.hazards.spawnFlare(sx, sy, sz, vx, vy, vz, false);
    this.network.send({ type: "flare_throw", x: +sx.toFixed(2), y: +sy.toFixed(2), z: +sz.toFixed(2), vx: +vx.toFixed(2), vy: +vy.toFixed(2), vz: +vz.toFixed(2) });
    this.audio.playWrench();
    this.ui.toast(`Threw Road Flare! (${this.flareCount} left — lures T-Rex & lights fog!)`);
  }

  spawnTornadoNow() {
    const allP = this.hazards._collectAllPlayers(this.vehicle, this.network);
    const victim = allP[Math.floor(Math.random() * allP.length)];
    const ang = Math.random() * Math.PI * 2;
    const tx = victim.x + Math.cos(ang) * 165, tz = victim.z + Math.sin(ang) * 165;
    const drift = Math.atan2(victim.z - tz, victim.x - tx);
    if (this.network.mode !== "offline") {
      this.network.send({ type: "hazard_event", kind: "tornado", x: +tx.toFixed(1), z: +tz.toFixed(1), vx: +(Math.cos(drift) * 11.5).toFixed(2), vz: +(Math.sin(drift) * 11.5).toFixed(2), life: 72, target: victim.callsign });
    } else {
      this.hazards.spawnTornadoNear(victim.x, victim.z, this.ui, this.audio);
    }
    this.ui.closeModal();
  }

  triggerAvalancheNow() {
    this.hazards.triggerAvalancheNear(this.vehicle.pos.x, this.vehicle.pos.z, this.ui, this.audio);
    this.ui.closeModal();
  }

  findNearbySupportTrailer(gx, gz, maxDist = 11.5) {
    if (this.trailer && this.trailer.spec.isSupportTrailer) {
      if (Math.hypot(this.trailer.pos.x - gx, this.trailer.pos.z - gz) < maxDist) {
        return { owner: "YOUR", trailer: this.trailer };
      }
    }
    for (const rp of this.network.remotePlayers.values()) {
      if (rp.trailer && rp.trailer.id === "support_trailer") {
        if (Math.hypot(rp.trailer.x - gx, rp.trailer.z - gz) < maxDist) {
          return { owner: rp.callsign + "'s", trailer: rp.trailer };
        }
      }
    }
    return null;
  }

  serviceAtSupportTrailer(ownerLabel) {
    const vs = this.vehicle.vState, spec = this.vehicle.spec;
    vs.fuel = spec.fuelCapacity;
    this.flareCount = 6;
    vs.spareTires = spec.wheels.length >= 6 ? 3 : 2;
    for (let i = 0; i < vs.blownTires.length; i++) { vs.blownTires[i] = false; vs.tiresHP[i] = 100; }
    for (const pid of Object.keys(KK.PARTS_CATALOG)) vs.parts[pid].hp = Math.max(vs.parts[pid].hp, 90);
    vs.health.mudClog = 0; vs.health.tieRodBias = 0; vs.health.tires = 100; vs.health.body = Math.max(vs.health.body, 90);
    this.vehicle.hydrolocked = false;
    this.vehicle.engineRunning = this.vehicle.ignitionOn;
    this.vehicle.coolantTemp = 82;
    this.audio.playWrench();
    this._saveProgress(true);
    this.vehicle.vState.burnedOut = false;
    this._resetTankCombatState(true);
        this.ui.toast(`SERVICED AT ${ownerLabel} SUPPORT TRAILER! 100% Fuel, Fresh Tires, Spares, 6 Flares & 90% Field Repair!`);
  }

  findNearbyBlownWheel(gx, gz, maxDist = 2.6) {
    const vs = this.vehicle.vState;
    if (!vs.blownTires) return -1;
    let bestIdx = -1, bestD = maxDist;
    for (let i = 0; i < this.vehicle.spec.wheels.length; i++) {
      if (!vs.blownTires[i]) continue;
      const wDef = this.vehicle.spec.wheels[i];
      const wPos = new THREE.Vector3(wDef.x, 0, wDef.z).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
      const d = Math.hypot(gx - wPos.x, gz - wPos.z);
      if (d < bestD) { bestD = d; bestIdx = i; }
    }
    return bestIdx;
  }

  startTimedWork(title, steps, onComplete) {
    if (this.timedWork) {
      this.ui.toast("Already working on a repair — wait or press [ESC] to cancel!", true);
      return;
    }
    let totalDur = 0;
    for (const st of steps) totalDur += st.dur;
    this.timedWork = { title, steps, stepIdx: 0, stepElapsed: 0, elapsed: 0, totalDur, onComplete };
    if (steps[0] && steps[0].sfx === "impact") this.audio.playImpactWrench();
    else this.audio.playWrench();
  }

  _updateTimedWork(dt) {
    const tw = this.timedWork;
    if (!tw) return;
    const rate = this.coopBoostTimer > 0 ? 2.0 : 1.0;
    tw.elapsed += dt * rate;
    tw.stepElapsed += dt * rate;
    if (this.onFoot) this.playerFoot.repairingTimer = 0.4;

    const cur = tw.steps[tw.stepIdx];
    if (cur && tw.stepElapsed >= cur.dur) {
      tw.stepElapsed -= cur.dur;
      tw.stepIdx++;
      if (tw.stepIdx < tw.steps.length) {
        const nxt = tw.steps[tw.stepIdx];
        if (nxt.sfx === "impact") this.audio.playImpactWrench();
        else this.audio.playWrench();
      } else {
        const done = tw.onComplete;
        this.timedWork = null;
        if (done) done();
      }
    }
  }

  swapTireAtWheel(wheelIdx) {
    const vs = this.vehicle.vState;
    if (!vs.blownTires || !vs.blownTires[wheelIdx]) return;
    if ((vs.spareTires || 0) <= 0) {
      this.ui.toast("OUT OF SPARE TIRES! Pull up to a Support Trailer or Town Garage to restock!", true);
      return;
    }
    const lbl = this.vehicle.spec.wheels[wheelIdx].id;
    this.startTimedWork(`CHANGING BLOWN ${lbl} TIRE`, [
      { label: "Setting up Winch Rig & Hydraulic Jack under axle...", dur: 3.2, sfx: "wrench" },
      { label: "Impact-wrenching lug nuts & pulling shredded flat off...", dur: 3.4, sfx: "impact" },
      { label: "Mounting fresh Spare Tire, torquing lugs & lowering jack...", dur: 3.4, sfx: "impact" }
    ], () => {
      vs.spareTires = Math.max(0, (vs.spareTires || 1) - 1);
      vs.blownTires[wheelIdx] = false;
      vs.tiresHP[wheelIdx] = 100;
      this.audio.playCash();
      this._saveProgress();
      this.ui.toast(`${lbl} Spare Tire bolted on! (${vs.spareTires} spare(s) remaining)`);
    });
  }

  garageRestockTires() {
    if (this.money < 300) { this.ui.toast("Need $300 for fresh tire set & spares!", true); return; }
    this.money -= 300;
    const vs = this.vehicle.vState;
    for (let i = 0; i < vs.blownTires.length; i++) { vs.blownTires[i] = false; vs.tiresHP[i] = 100; }
    vs.health.tires = 100;
    vs.spareTires = this.vehicle.spec.wheels.length >= 6 ? 3 : 2;
    this.audio.playWrench();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast("Mounted fresh off-road tires & restocked spare tire rack!");
  }

  findNearbyRemoteBlownWheel(gx, gz, maxDist = 3.6) {
    for (const rp of this.network.remotePlayers.values()) {
      if (!rp.blownTires) continue;
      const rSpec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
      const q = new THREE.Quaternion(rp.qx, rp.qy, rp.qz, rp.qw);
      for (let i = 0; i < rSpec.wheels.length; i++) {
        if (!rp.blownTires[i]) continue;
        const wDef = rSpec.wheels[i];
        const wPos = new THREE.Vector3(wDef.x, 0, wDef.z).applyQuaternion(q).add(new THREE.Vector3(rp.gx, rp.gy, rp.gz));
        if (Math.hypot(gx - wPos.x, gz - wPos.z) < maxDist) {
          return { rp, wheelIdx: i, label: wDef.id };
        }
      }
    }
    return null;
  }

  assistFriendTireSwapById(peerId, wheelIdx) {
    const rp = this.network.remotePlayers.get(peerId);
    if (!rp) return;
    const rSpec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
    const lbl = (rSpec.wheels[wheelIdx] && rSpec.wheels[wheelIdx].id) || "TIRE";
    this.ui.closeModal();
    this.startTimedWork(`CO-OP TIRE SWAP (${rp.callsign} • ${lbl})`, [
      { label: `Jacking up ${rp.callsign}'s ${lbl} axle & pulling shredded flat...`, dur: 2.5, sfx: "impact" },
      { label: `Bolting fresh tire onto ${rp.callsign}'s hub...`, dur: 2.5, sfx: "impact" }
    ], () => {
      if (rp.blownTires && wheelIdx >= 0 && wheelIdx < rp.blownTires.length) rp.blownTires[wheelIdx] = 0;
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "tire_swap", wheelIdx });
      this.audio.playCash();
      this.ui.toast(`Co-op Pit Crew: Swapped ${rp.callsign}'s ${lbl} tire in 5 seconds!`);
    });
  }

  startCoopFieldRepair(peerId) {
    const rp = this.network.remotePlayers.get(peerId);
    if (!rp) return;
    this.ui.closeModal();
    this.startTimedWork(`CO-OP FIELD REPAIR (${rp.callsign})`, [
      { label: `Popping ${rp.callsign}'s hood & clearing mud/hydrolock...`, dur: 2.5, sfx: "wrench" },
      { label: `Patching engine, gearbox, shocks & headlights to 85%...`, dur: 2.5, sfx: "impact" }
    ], () => {
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "field_repair" });
      this.audio.playCash();
      this.ui.toast(`Co-op Pit Crew: Repaired ${rp.callsign}'s rig to 85%!`);
    });
  }

  sendCoopAssist(peerId, action) {
    const rp = this.network.remotePlayers.get(peerId);
    if (!rp) return;
    const vs = this.vehicle.vState;
    if (action === "fuel_share") {
      if (vs.fuel < 18) { this.ui.toast("Need at least 18L in your tank to share 15L fuel!", true); return; }
      vs.fuel -= 15;
      this.audio.playWrench();
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "fuel_share", amount: 20 });
      this.ui.toast(`Shared +20L fuel with ${rp.callsign}!`);
    } else if (action === "spare_give") {
      if ((vs.spareTires || 0) <= 0) { this.ui.toast("You have no spare tires left to give!", true); return; }
      vs.spareTires--;
      this.audio.playWrench();
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "spare_give" });
      this.ui.toast(`Handed 1 spare tire to ${rp.callsign}!`);
    } else if (action === "cash_wire") {
      if (this.money < 1000) { this.ui.toast("Need at least $1,000 to wire cash!", true); return; }
      this.money -= 1000;
      this.audio.playCash();
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "cash_wire", amount: 1000 });
      this.ui.toast(`Wired $1,000 to ${rp.callsign}!`);
    } else if (action === "repair_boost") {
      this.audio.playImpactWrench();
      this.network.send({ type: "coop_assist", targetPeerId: peerId, sender: this.network.callsign, action: "repair_boost" });
      this.ui.toast(`Helping ${rp.callsign} wrench — their repair speed is now 2x!`);
      this.ui.closeModal();
      return;
    }
    this._saveProgress();
    if (this.ui.activeModal === "coop_pit") this.ui.renderCoopPitCrew();
  }

  _handleIncomingCoopAssist(msg) {
    const who = msg.sender || "A LAN friend";
    const vs = this.vehicle.vState;
    if (msg.action === "tire_swap") {
      let idx = (typeof msg.wheelIdx === "number" && vs.blownTires && vs.blownTires[msg.wheelIdx])
        ? msg.wheelIdx
        : (vs.blownTires || []).findIndex(Boolean);
      if (idx >= 0 && vs.blownTires) {
        vs.blownTires[idx] = false; vs.tiresHP[idx] = 100;
        this.vehicle.vel.multiplyScalar(0.1);
        this.vehicle.pos.y += 0.12;
        this.audio.playImpactWrench();
        this.network.broadcastPlayerState(0, this.vehicle, this.playerFoot, this.onFoot, this.trailer, this.wipersOn, !!this.timedWork, this.btrTurretYaw, this.carriedByPeerId, true);
        this.ui.toast(`CO-OP PIT CREW: ${who} bolted a fresh tire onto your ${this.vehicle.spec.wheels[idx].id} wheel!`);
      }
    } else if (msg.action === "repair_boost") {
      this.coopBoostTimer = 14.0;
      this.audio.playImpactWrench();
      this.ui.toast(`CO-OP PIT CREW: ${who} jumped in to help — 2x repair speed!`);
    } else if (msg.action === "field_repair") {
      for (const pid of Object.keys(KK.PARTS_CATALOG)) vs.parts[pid].hp = Math.max(vs.parts[pid].hp, 85);
      vs.health.mudClog = 0; vs.health.tieRodBias = 0; vs.health.body = Math.max(vs.health.body, 85);
      vs.health.headlightL = Math.max(vs.health.headlightL ?? 0, 85);
      vs.health.headlightR = Math.max(vs.health.headlightR ?? 0, 85);
      this.vehicle.hydrolocked = false;
      this.vehicle.engineRunning = this.vehicle.ignitionOn;
      this.vehicle.coolantTemp = 82;
      this.audio.playWrench();
      this.network.broadcastPlayerState(0, this.vehicle, this.playerFoot, this.onFoot, this.trailer, this.wipersOn, !!this.timedWork, this.btrTurretYaw, this.carriedByPeerId, true);
      this.ui.toast(`CO-OP PIT CREW: ${who} wrenched your rig back to 85%!`);
    } else if (msg.action === "fuel_share") {
      vs.fuel = Math.min(this.vehicle.spec.fuelCapacity, vs.fuel + (msg.amount || 20));
      this.audio.playWrench();
      this.ui.toast(`CO-OP PIT CREW: ${who} poured +${msg.amount || 20}L fuel into your tank!`);
    } else if (msg.action === "spare_give") {
      vs.spareTires = (vs.spareTires || 0) + 1;
      this.audio.playWrench();
      this.ui.toast(`CO-OP PIT CREW: ${who} handed you a spare tire! (${vs.spareTires} total)`);
    } else if (msg.action === "cash_wire") {
      this.money += (msg.amount || 1000);
      this.audio.playCash();
      this.ui.toast(`CO-OP TRANSFER: ${who} wired you $${(msg.amount || 1000).toLocaleString()}!`);
    }
    this._saveProgress();
  }

  installTireCompound(compId) {
    const tc = KK.TIRE_COMPOUNDS[compId]; if (!tc) return;
    const vs = this.vehicle.vState;
    if (vs.tireCompound === compId) return;
    if (this.money < tc.price) { this.ui.toast(`Need $${tc.price.toLocaleString()} for ${tc.name}!`, true); return; }
    this.money -= tc.price;
    vs.tireCompound = compId;
    for (let i = 0; i < vs.tiresHP.length; i++) { vs.tiresHP[i] = 100; vs.blownTires[i] = false; }
    this.audio.playCash();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast(`Mounted ${tc.name}!`);
  }

  installTireBrand(brandId) {
    const tb = KK.TIRE_BRANDS[brandId]; if (!tb) return;
    const vs = this.vehicle.vState;
    if (vs.tireBrand === brandId) return;
    const price = Math.round(1150 * tb.priceMult);
    if (this.money < price) { this.ui.toast(`Need $${price.toLocaleString()} for ${tb.name}!`, true); return; }
    this.money -= price;
    vs.tireBrand = brandId;
    for (let i = 0; i < vs.tiresHP.length; i++) { vs.tiresHP[i] = 100; vs.blownTires[i] = false; }
    this.audio.playCash();
    this._saveProgress();
    this.ui.renderGarage();
    this.ui.toast(`Swapped tires to ${tb.name} (Puncture Resist ${Math.round(tb.punctureResist * 100)}%)!`);
  }

  _spawnTracerBeam(x0, y0, z0, x1, y1, z1, colorHex = 0xffbe0b, rad = 0.055) {
    const p0 = this.world.toLocal(x0, y0, z0, new THREE.Vector3());
    const p1 = this.world.toLocal(x1, y1, z1, new THREE.Vector3());
    const dir = p1.clone().sub(p0);
    const len = Math.max(1, dir.length());
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(rad, rad, len, 6),
      new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.94 })
    );
    mesh.position.copy(p0).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.scene.add(mesh);
    this.tracers.push({ mesh, life: rad > 0.1 ? 0.24 : 0.14 });
  }

  resupplyTankAmmo() {
    if (!this.ownedVehicles.t72 && !this.ownedVehicles.bm21 && !this.ownedVehicles.shilka && !this.ownedVehicles.pzkpfw_140a4 && !this.ownedVehicles.harimau && !this.ownedVehicles.komodo_std && !this.ownedVehicles.komodo_turret && !this.ownedVehicles.btr80) return;
    const cost = (this.vehicle.vState.vehicleId === "pzkpfw_140a4") ? 0 : 1800;
    if (this.money < cost) { this.ui.toast(`Need $${cost.toLocaleString()} to resupply Soviet armored ordnance!`, true); return; }
    this.money -= cost;
    if (this.ownedVehicles.t72) {
      const tSt = this.ownedVehicles.t72;
      tSt.t72HeAmmo = 18; tSt.t72ApAmmo = 14; tSt.t72CoaxAmmo = 300; tSt.t72SmokeCharges = 4;
      if (tSt.upgrades && tSt.upgrades.t72SeismicFcs) tSt.t72ThermAmmo = 10;
    }
    if (this.ownedVehicles.bm21) this.ownedVehicles.bm21.bm21Rockets = 40;
    if (this.ownedVehicles.shilka) this.ownedVehicles.shilka.shilkaAmmo = 800;
    if (this.ownedVehicles.btr80) this.ownedVehicles.btr80.btrAmmo = 300;
    if (this.ownedVehicles.komodo_std) this.ownedVehicles.komodo_std.btrAmmo = 400;
    if (this.ownedVehicles.komodo_turret) this.ownedVehicles.komodo_turret.btrAmmo = 180;
    if (this.ownedVehicles.harimau) { const h = this.ownedVehicles.harimau; h.t72HeAmmo = 16; h.t72ApAmmo = 16; h.t72CoaxAmmo = 400; }
    this.ammoRackLIntact = true; this.ammoRackRIntact = true;
    if (this.ownedVehicles.pzkpfw_140a4) { const p = this.ownedVehicles.pzkpfw_140a4; p.p140ApAmmo = 14; p.p140HeshAmmo = 10; p.p140ThermAmmo = 8; p.p140RlgAmmo = 8; p.p140AutoAmmo = 240; }
    const curVs = this.vehicle.vState;
    if (curVs.vehicleId === "komodo_turret") {
        curVs.btrAmmo = 180;
        this.ui.toast("RESUPPLIED KOMODO CPWS 30mm: 180 rds (-$1,800)!");
      } else if (curVs.vehicleId === "komodo_std") {
        curVs.btrAmmo = 300;
        this.ui.toast("RESUPPLIED KOMODO 12.7mm SMB-2 HMG: 300 rds (-$1,800)!");
      } else if (curVs.vehicleId === "t72" || curVs.vehicleId === "harimau") {
      curVs.t72HeAmmo = 18; curVs.t72ApAmmo = 14; curVs.t72CoaxAmmo = 300; curVs.t72SmokeCharges = 4;
      if (curVs.upgrades.t72SeismicFcs) curVs.t72ThermAmmo = 10;
    } else if (curVs.vehicleId === "bm21") { curVs.bm21Rockets = 40; }
    else if (curVs.vehicleId === "shilka") { curVs.shilkaAmmo = 800; }
    else if (curVs.vehicleId === "pzkpfw_140a4") { curVs.p140ApAmmo = 14; curVs.p140HeshAmmo = 10; curVs.p140ThermAmmo = 8; curVs.p140RlgAmmo = 8; curVs.p140AutoAmmo = 240; }
    this._resetEraCharges();
    this.audio.playCash(); this.audio.playWrench();
    this._saveProgress(true);
    if (this.ui.activeModal === "garage") this.ui.renderGarage();
    this.ui.toast("T-72B Carousel Reloaded: 18x HE-Frag, 14x APFSDS, 300x 14.5mm & 4x Smoke Salvos (-$1,800)!");
  }

  toggleT72ShellType() {
    if (this.onFoot) return;
    if (this.vehicle.vState.vehicleId === "bm21") {
      const vs = this.vehicle.vState;
      vs.bm21FireMode = (vs.bm21FireMode === "salvo") ? "single" : "salvo";
      this.audio.playWrench();
      this.ui.toast(vs.bm21FireMode === "salvo"
        ? "BM-21 GRAD FIRE MODE [R]: FULL KATYUSHA RIPPLE SALVO (10-Rocket Barrage!)"
        : "BM-21 GRAD FIRE MODE [R]: PRECISION SINGLE ROCKET");
      return;
    }
    if (this.vehicle.vState.vehicleId === "pzkpfw_140a4") {
      const vs = this.vehicle.vState;
      const ord = ["ap140", "hesh140", "therm140", "rlg140"];
      vs.p140ShellType = ord[(ord.indexOf(vs.p140ShellType) + 1) % ord.length];
      this.audio.playWrench();
      return;
    }
    if (this.vehicle.vState.vehicleId !== "t72" && this.vehicle.vState.vehicleId !== "harimau") return;
    const vs = this.vehicle.vState;
    const order = vs.upgrades.t72SeismicFcs ? ["he", "ap", "therm"] : ["he", "ap"];
    const nextIdx = (order.indexOf(vs.t72ShellType) + 1) % order.length;
    vs.t72ShellType = order[nextIdx];
    this.audio.playWrench();
    if (vs.t72ShellType === "therm") {
      this.ui.toast(`125mm Carousel Selected: 3BK-THERM THERMOBARIC (${vs.t72ThermAmmo || 0} rds — 12.5s Godzilla Stagger / 65s Monster Panic!)`);
    } else if (vs.t72ShellType === "ap") {
      this.ui.toast(`125mm Carousel Selected: 3BM42 APFSDS-T (${vs.t72ApAmmo || 0} rds — High-Velocity Stagger!)`);
    } else {
      this.ui.toast(`125mm Carousel Selected: 3OF26 HE-FRAG (${vs.t72HeAmmo || 0} rds — Wide Blast / Sandwyrm Thumper!)`);
    }
  }

  cycleThermalVision() {
    if (this.onFoot || this.ridingWithPeerId) return;
    const vs = this.vehicle.vState;
    const hasOptic = (vs.vehicleId === "t72" || vs.vehicleId === "harimau" || vs.vehicleId === "komodo_recon" || vs.vehicleId === "komodo_turret" || vs.vehicleId === "shilka" || vs.vehicleId === "pzkpfw_140a4") || (vs.vehicleId === "btr80" && !!vs.upgrades.btrTurret);
    if (!hasOptic) {
      this.ui.toast("Thermal / IR Optics [Z] are installed on the T-72B, Shilka, and rearmed BTR-80!", true);
      return;
    }
    this.thermalMode = (this.thermalMode + 1) % 3;
    this.audio.playThermalClick();
    this._applyThermalVisuals();
    const is140 = this.vehicle.vState.vehicleId === "pzkpfw_140a4";
    this.ui.toast(is140 ? ["Optics: DAYLIGHT", "Optics: TRI-BAND FLIR THERMAL", "Optics: CRIMSON RED NVD"][this.thermalMode] : ["Optics: DAYLIGHT", "Optics: FLIR WHITE-HOT THERMAL", "Optics: 1PN51 GREEN NIGHT-VISION"][this.thermalMode]);
  }

  _applyThermalVisuals() {
    const mode = this.thermalMode || 0;
    const isRedNvd = (mode === 2 && this.vehicle && this.vehicle.vState.vehicleId === "pzkpfw_140a4");
    const cv = document.getElementById("game-canvas");
    const ov = document.getElementById("thermal-overlay");
    if (cv) {
      cv.classList.toggle("flir-canvas", mode === 1);
      cv.classList.toggle("nvg-canvas", mode === 2 && !isRedNvd);
      cv.classList.toggle("red-nvd-canvas", isRedNvd);
    }
    if (ov) {
      ov.classList.toggle("active", mode > 0);
      ov.classList.toggle("flir", mode === 1);
      ov.classList.toggle("nvg", mode === 2 && !isRedNvd);
      ov.classList.toggle("red-nvd", isRedNvd);
    }
    if (this.weather) {
      this.weather.opticMode = mode === 0 ? 0 : (mode === 1 ? 1 : (isRedNvd ? 3 : 2));
    }
    if (this.cryptids && this.cryptids.setThermalMode) this.cryptids.setThermalMode(mode === 1);
    if (this.oceanCryptids && this.oceanCryptids.setThermalMode) this.oceanCryptids.setThermalMode(mode === 1);
    if (this.entities && this.entities.setThermalMode) this.entities.setThermalMode(mode === 1);
    if (this.townNpcs && this.townNpcs.setThermalMode) this.townNpcs.setThermalMode(mode === 1);
    if (this.skinwalker && this.skinwalker.setThermalMode) this.skinwalker.setThermalMode(mode === 1);
  }

  _spawnSmokeScreenAt(gx, gy, gz, yaw) {
    const matSmoke = new THREE.MeshStandardMaterial({ color: 0xdce4eb, transparent: true, opacity: 0.72, roughness: 1.0, depthWrite: false });
    const geo = new THREE.SphereGeometry(2.6, 8, 7);
    for (let i = -2; i <= 2; i++) {
      const ang = yaw + i * 0.24;
      const dist = 10 + Math.abs(i) * 2.5;
      const sx = gx + Math.sin(ang) * dist, sz = gz + Math.cos(ang) * dist;
      const sy = this.world.getTerrainInfo(sx, sz, false).height + 2.4;
      const m = new THREE.Mesh(geo, matSmoke.clone());
      this.scene.add(m);
      this.smokeClouds.push({ gx: sx, gy: sy, gz: sz, scale: 0.6, life: 16.0, maxLife: 16.0, mesh: m });
    }
  }

  launchT72Smoke() {
    if (this.onFoot || (this.vehicle.vState.vehicleId !== "t72" && this.vehicle.vState.vehicleId !== "harimau")) return;
    const vs = this.vehicle.vState;
    if ((vs.t72SmokeCharges || 0) <= 0) {
      this.ui.toast("Out of 81mm Tucha Smoke Grenades! Resupply at a Town Garage!", true); return;
    }
    vs.t72SmokeCharges--;
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
    const yaw = Math.atan2(fwd.x, fwd.z) + this.btrTurretYaw;
    this._spawnSmokeScreenAt(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, yaw);
    this.audio.playSmokePop();
    // Smoke screen masks you from Siren Head, Yeti & T-Rex!
    if (this.cryptids) {
      for (const k of ["sirenhead", "yeti", "trex"]) this.cryptids.applyRemoteCounter(k, 2.5);
      if (this.skinwalker) this.skinwalker.repel(this.audio);
    }
    this.network.send({ type: "smoke_pop", x: +this.vehicle.pos.x.toFixed(1), y: +this.vehicle.pos.y.toFixed(1), z: +this.vehicle.pos.z.toFixed(1), yaw: +yaw.toFixed(2) });
    this.ui.toast(`81mm TUCHA SMOKE DEPLOYED! (${vs.t72SmokeCharges} salvos left)`);
  }

  // PRIMARY: 125mm 2A46M SMOOTHBORE CANNON + 6.5s MECHANICAL CAROUSEL AUTOLOADER!
  // v13.995 HF: Exact Physical Gun Barrel Tip Position & World Direction!
  // Computed directly from live turret yaw (`btrTurretYaw`), gun pitch (`btrAimPitch`) & hull quat
  // so dirt shockwaves spawn DIRECTLY UNDER THE BARREL TIP and recoil matches gun angle 100%!
  // Returns the real world direction the traversed turret barrel is pointing (converges to crosshair once aligned!)
  _getBarrelAimWorldDir(yawOverride = null) {
    const yaw = (yawOverride !== null) ? yawOverride : (this.btrTurretYaw || 0);
    const vid = this.vehicle.vState.vehicleId;
    const isTankLim = (vid === "t72" || vid === "harimau" || vid === "pzkpfw_140a4");
    const minP = isTankLim ? -0.12 : -0.14;
    const maxP = (vid === "bm21" || vid === "shilka") ? 0.78 : (isTankLim ? 0.32 : 0.55);
    const pitch = Math.max(minP, Math.min(maxP, this.btrAimPitch || 0));
    const dirLocal = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).normalize();
    return dirLocal.applyQuaternion(this.vehicle.quat).normalize();
  }

  _getActiveMuzzleTransform() {
    const vid = this.vehicle.vState.vehicleId;
    const yaw = this.btrTurretYaw || 0;
    const isTankMz = (vid === "t72" || vid === "harimau" || vid === "pzkpfw_140a4");
    const maxP = (vid === "bm21" || vid === "shilka") ? 0.78 : (isTankMz ? 0.32 : 0.55);
    const pitch = Math.max(isTankMz ? -0.12 : -0.14, Math.min(maxP, this.btrAimPitch || 0));

    // Local barrel direction inside chassis space (+Z forward, +Y up)
    const dirLocal = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch)
    ).normalize();

    let pivotLocal, barrelLen, evacLen = 0;
    if (vid === "pzkpfw_140a4") {
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 2.08, 2.16, -0.38 + Math.cos(yaw) * 2.08);
      barrelLen = 6.35;
      evacLen = 3.08;
    } else if (vid === "harimau") {
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 1.56, 2.02, 0.14 + Math.cos(yaw) * 1.56);
      barrelLen = 5.50;
      evacLen = 2.42;
    } else if (vid === "komodo_turret") {
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 0.80, 2.53, -0.32 + Math.cos(yaw) * 0.80);
      barrelLen = 3.46;
    } else if (vid === "komodo_std") {
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 0.54, 2.69, -0.22 + Math.cos(yaw) * 0.54);
      barrelLen = 2.08;
    } else if (vid === "t72") {
      // Exact T-72B trunnion: turret(0,1.62,0.16) + gunPitch(0,0.44,1.56 rotated by yaw) -> tip +4.43m along barrel!
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 1.56, 2.06, 0.16 + Math.cos(yaw) * 1.56);
      barrelLen = 4.43;
      evacLen = 2.42;
    } else if (vid === "shilka") {
      pivotLocal = new THREE.Vector3(Math.sin(yaw) * 1.18, 1.90, -0.05 + Math.cos(yaw) * 1.18);
      barrelLen = 2.65;
    } else if (vid === "bm21") {
      pivotLocal = new THREE.Vector3(0, 2.36, -2.05);
      barrelLen = 1.95;
    } else {
      // BTR-80 KPVT 14.5mm
      pivotLocal = new THREE.Vector3(0, 2.34, 0.92);
      barrelLen = 3.25;
    }

    const tipLocal  = pivotLocal.clone().addScaledVector(dirLocal, barrelLen);
    const evacLocal = pivotLocal.clone().addScaledVector(dirLocal, evacLen);
    const dirWorld  = dirLocal.clone().applyQuaternion(this.vehicle.quat).normalize();
    const tipWorld  = tipLocal.applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
    const evacWorld = evacLocal.applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
    return { tipWorld, evacWorld, dirWorld };
  }

  // v18.1.1 DIRECTIONAL ARMOR ZONES, SLOPED RHA, KONTAKT-5 ERA, DONNERSCHILD APS & SHELL SPALL MODEL!
  _onArmorHitAck(msg) {
    if (!msg) return;
    const victim = msg.victimCallsign || "Target";
    const zone = msg.zone || "ARMOR";
    if (msg.outcome === "ricochet") {
      if (this.audio && this.audio.playArmorRicochet) this.audio.playArmorRicochet(0.55);
      const trackNote = msg.trackSnapped ? " (TRACK SNAPPED!)" : "";
      if (this.ui) this.ui.toast(`🛡 RICOCHET on ${victim}'s ${zone} (${msg.effArmorMm || "?"}mm eff vs ${msg.penMm || "?"}mm)${trackNote}`);
    } else if (msg.outcome === "aps") {
      if (this.audio && this.audio.playApsIntercept) this.audio.playApsIntercept();
      if (this.ui) this.ui.toast(`⚡ ${victim}'s DONNERSCHILD APS intercepted your ${msg.cal || ""}mm round!`);
    } else if (msg.outcome === "era") {
      if (this.audio && this.audio.playEraDetonation) this.audio.playEraDetonation();
      if (this.ui) this.ui.toast(`⚡ KONTAKT-5 ERA detonated on ${victim}'s ${zone} (-55% pen)!`);
    } else if (msg.outcome === "track_snap") {
      if (this.audio) this.audio.playImpact(0.75);
      if (this.ui) this.ui.toast(`🎯 TRACK SNAPPED on ${victim} (${zone})!`);
    } else {
      if (this.audio) this.audio.playImpact(0.8);
      const extra = msg.cookoff === "cosmonaut" ? " • 🚀 T-72 AMMO DETONATION!"
        : (msg.cookoff === "blowout" ? " • 🔥 BLOW-OUT RACK COOK-OFF!"
        : (msg.cookoff === "grad" ? " • 💥 GRAD ROCKET RACK DETONATED!"
        : (msg.breechShock ? " • BREECH SHOCK (+3.0s RELOAD!)" : (msg.trackSnapped ? " • TRACK SNAPPED!" : ""))));
      if (this.ui) this.ui.toast(`🎯 PENETRATED ${victim}'s ${zone} (${msg.penMm || "?"}mm vs ${msg.effArmorMm || "?"}mm eff)${extra}!`);
    }
  }

  _sendArmorHitAck(shooterPeerId, payload) {
    if (!shooterPeerId || !this.network || this.network.mode === "offline") return;
    if (shooterPeerId === this.network.peerId) return;
    this.network.send(Object.assign({
      type: "armor_hit_ack",
      targetPeerId: shooterPeerId,
      victimCallsign: this.network.callsign || "Target"
    }, payload));
  }

  // ==========================================================================
  // v18.1.1 PER-ZONE ARMOR PROFILES, SEMICOLON [;] ARMOR VIEWER & [`] FCS/LWR
  // ==========================================================================
  // ==========================================================================
  // v18.1.1 TANK COMBAT CORE: STATE RESET, EXACT RAY-vs-OBB HITBOXES & LWR/FCS
  // ==========================================================================
  _resetTankCombatState(resetAmmoRacks = true) {
    if (this.armorViewerActive) this.toggleArmorViewer();
    this.tankModules = { turretRing: 100, gunBreech: 100, gunBarrel: 100, lwsSensor: 100, secBarrel: 100 };
    this.turretPopActive = false;
    this.turretPopY = 0;
    this.turretPopVy = 0;
    this.turretPopPitch = 0;
    this.turretPopRoll = 0;
    this.cookoffJetTimer = 0;
    this._trkAlreadySnapped = {};
    this.fcsLaserOn = false;
    this.lwrAlertTimer = 0;
    this.fcsLockedTarget = null;
    if (resetAmmoRacks) {
      this.ammoRackLIntact = true;
      this.ammoRackRIntact = true;
    }
  }

  _handleIncomingLwrPing(msg) {
    if (!this.vehicle || this.onFoot || !msg) return;
    const vid = this.vehicle.vState ? this.vehicle.vState.vehicleId : "";
    const hasLwr = (vid === "pzkpfw_140a4" || vid === "harimau" || vid === "t72" || vid === "shilka" || vid === "btr80" || vid === "komodo_turret");
    if (!hasLwr) return;
    if (this.tankModules && this.tankModules.lwsSensor < 25) return;
    const dx = (msg.sx || 0) - this.vehicle.pos.x;
    const dz = (msg.sz || 0) - this.vehicle.pos.z;
    const invQ = this._tmpInvQuat.copy(this.vehicle.quat).invert();
    const loc = new THREE.Vector3(dx, 0, dz).applyQuaternion(invQ);
    let deg = Math.atan2(loc.x, loc.z) * (180 / Math.PI);
    if (deg < 0) deg += 360;
    const clock = Math.round(deg / 30) || 12;
    this.lwrAlertBearing = `${clock} O'CLOCK (${Math.round(Math.hypot(dx, dz))}m)`;
    this.lwrAlertTimer = 2.6;
    const nowMs = performance.now();
    if (!this._lastLwrBeepMs || nowMs - this._lastLwrBeepMs > 420) {
      this._lastLwrBeepMs = nowMs;
      if (this.audio && this.audio.playLwrBeep) this.audio.playLwrBeep();
    }
  }

  _isBeamBlockedBySmoke(ox, oy, oz, dx, dy, dz, maxDist) {
    if (!this.smokeClouds || !this.smokeClouds.length) return false;
    for (let i = 0; i < this.smokeClouds.length; i++) {
      const sc = this.smokeClouds[i];
      const rad = Math.max(4.5, (sc.scale || 1.0) * 6.5);
      const sx = sc.gx - ox, sy = (sc.gy + 2.2) - oy, sz = sc.gz - oz;
      const t = sx * dx + sy * dy + sz * dz;
      if (t < 0 || t > maxDist) continue;
      const px = ox + dx * t - sc.gx, py = oy + dy * t - (sc.gy + 2.2), pz = oz + dz * t - sc.gz;
      if (px * px + py * py + pz * pz <= rad * rad) return true;
    }
    return false;
  }

  // Exact Ray-vs-OBB (Hull Box + Turret Box in target's quaternion frame) — ZERO point-blank misses!
  _raycastRemotePlayersOBB(ox, oy, oz, dx, dy, dz, maxDist) {
    if (!this.network || !this.network.remotePlayers || this.network.remotePlayers.size === 0) return null;
    let bestHit = null;
    let bestT = maxDist;
    const rayBox = (roX, roY, roZ, rdX, rdY, rdZ, minX, minY, minZ, maxX, maxY, maxZ) => {
      let tmin = 0.4, tmax = bestT;
      const slab = (ro, rd, bmin, bmax) => {
        if (Math.abs(rd) < 1e-6) return (ro >= bmin && ro <= bmax);
        let t1 = (bmin - ro) / rd, t2 = (bmax - ro) / rd;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        return tmin <= tmax;
      };
      if (!slab(roX, rdX, minX, maxX)) return -1;
      if (!slab(roY, rdY, minY, maxY)) return -1;
      if (!slab(roZ, rdZ, minZ, maxZ)) return -1;
      return (tmin >= 0.4 && tmin < bestT) ? tmin : -1;
    };

    const invQ = new THREE.Quaternion();
    const roL = new THREE.Vector3();
    const rdL = new THREE.Vector3();
    for (const rp of this.network.remotePlayers.values()) {
      if (rp.onFoot) continue;
      const sp = (KK.VEHICLES && KK.VEHICLES[rp.vehicleId]) ? KK.VEHICLES[rp.vehicleId] : null;
      const hw = ((sp && sp.bodyWidth) || 2.8) * 0.56;
      const hl = ((sp && sp.bodyLen) || 5.8) * 0.54;
      const hullH = (sp && sp.isTracked) ? 1.55 : 1.75;
      invQ.set(rp.qx || 0, rp.qy || 0, rp.qz || 0, rp.qw || 1).normalize().invert();
      roL.set(ox - (rp.gx || 0), oy - (rp.gy || 0), oz - (rp.gz || 0)).applyQuaternion(invQ);
      rdL.set(dx, dy, dz).applyQuaternion(invQ).normalize();

      let tHit = rayBox(roL.x, roL.y, roL.z, rdL.x, rdL.y, rdL.z, -hw, 0.05, -hl, hw, hullH, hl);
      const isArm = !!(sp && (sp.isTracked || sp.id === "bm21" || sp.id === "btr80" || sp.id === "komodo_turret"));
      if (isArm) {
        const tw = hw * 0.72, tl = hl * 0.58;
        const tTur = rayBox(roL.x, roL.y, roL.z, rdL.x, rdL.y, rdL.z, -tw, hullH - 0.1, -tl, tw, hullH + 1.15, tl);
        if (tTur > 0 && (tHit < 0 || tTur < tHit)) tHit = tTur;
      }
      if (tHit > 0 && tHit < bestT) {
        bestT = tHit;
        bestHit = { rp, t: tHit, x: ox + dx * tHit, y: oy + dy * tHit, z: oz + dz * tHit };
      }
    }
    return bestHit;
  }

  _getArmorProfile(spec, vs) {
    const id = spec ? spec.id : "";
    const hasK5 = (id === "t72" && !!(vs && vs.upgrades && vs.upgrades.t72Kontakt5));
    if (spec && spec.isSchreckensfurst) {
      return { front: 900, turret: 950, sideFront: 500, sideRear: 200, rear: 200, roof: 85, belly: 65 };
    }
    if (id === "t72") {
      return { front: hasK5 ? 560 : 460, turret: hasK5 ? 640 : 540, sideFront: 140, sideRear: 80, rear: 50, roof: 45, belly: 35 };
    }
    if (id === "harimau") {
      return { front: 220, turret: 240, sideFront: 110, sideRear: 70, rear: 45, roof: 35, belly: 30 };
    }
    if (id === "shilka") {
      return { front: 28, turret: 24, sideFront: 18, sideRear: 16, rear: 15, roof: 12, belly: 10 };
    }
    if (id === "btr80" || id === "komodo_turret" || id === "komodo_std" || id === "komodo_recon") {
      return { front: 26, turret: 22, sideFront: 16, sideRear: 14, rear: 12, roof: 10, belly: 10 };
    }
    return { front: 6, turret: 6, sideFront: 6, sideRear: 6, rear: 6, roof: 5, belly: 5 };
  }

  toggleArmorViewer() {
    if (!this.vehicle || !this.vehicleRig || !this.vehicleRig.setArmorViewerMode) return;
    this.armorViewerActive = !this.armorViewerActive;
    const prof = this._getArmorProfile(this.vehicle.spec, this.vehicle.vState);
    this.vehicleRig.setArmorViewerMode(this.armorViewerActive, prof);
    const ban = document.getElementById("armor-viewer-banner");
    const tip = document.getElementById("armor-viewer-tooltip");
    if (ban) ban.classList.toggle("hidden", !this.armorViewerActive);
    if (tip && !this.armorViewerActive) tip.classList.add("hidden");
  }

  _updateArmorViewerTooltip() {
    const tip = document.getElementById("armor-viewer-tooltip");
    if (!tip || !this.armorViewerActive || !this.vehicleRig || !this.camera) return;
    this._armorRaycaster.setFromCamera(this._armorMouseNdc, this.camera);
    const rawHits = this._armorRaycaster.intersectObject(this.vehicleRig.root, true);
    const hit = rawHits.find((h) => {
      const o = h.object;
      if (!o || !o.visible || o.renderOrder >= 10) return false;
      const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
      return !!(m0 && !m0.transparent && m0.depthWrite !== false);
    });
    if (!hit) { tip.classList.add("hidden"); return; }
    const sp = this.vehicle.spec;
    const prof = this._getArmorProfile(sp, this.vehicle.vState);
    const localPt = this.vehicleRig.root.worldToLocal(hit.point.clone());
    const halfW = (sp.bodyWidth || 3.2) * 0.42;
    const halfL = (sp.bodyLen || 6.2) * 0.34;
    const turretY = sp.isSchreckensfurst ? 1.52 : (sp.isTracked ? 1.46 : 1.65);
    const roofY   = sp.isSchreckensfurst ? 2.48 : (sp.isTracked ? 2.28 : 2.30);
    let zoneName = "FRONT GLACIS", nominal = prof.front;
    if (localPt.y > roofY) { zoneName = "ROOF ARMOR"; nominal = prof.roof; }
    else if (localPt.y > turretY) { zoneName = "TURRET ARMOR"; nominal = prof.turret; }
    else if (localPt.y < 0.34) { zoneName = "BELLY PLATE"; nominal = prof.belly; }
    else if (Math.abs(localPt.x) > halfW) {
      zoneName = localPt.z >= 0 ? "FRONT-SIDE HULL" : "REAR-SIDE HULL";
      nominal = localPt.z >= 0 ? prof.sideFront : prof.sideRear;
    } else if (localPt.z < -halfL) { zoneName = "REAR HULL / ENGINE DECK"; nominal = prof.rear; }

    let angleDeg = 0;
    if (hit.face && hit.object) {
      const worldN = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      const viewDir = this.camera.position.clone().sub(hit.point).normalize();
      const cosT = Math.max(0.15, Math.min(1.0, Math.abs(worldN.dot(viewDir))));
      angleDeg = Math.acos(cosT) * (180 / Math.PI);
    }
    const effMm = Math.round(nominal / Math.max(0.28, Math.cos(angleDeg * Math.PI / 180)));
    tip.innerHTML = `<div style="color:#38bdf8;font-weight:900;">${zoneName}</div>`
      + `<div>Nominal: <b>${nominal} mm</b> RHA</div>`
      + `<div>Impact Angle: <b>${angleDeg.toFixed(1)}°</b></div>`
      + `<div style="color:#fde047;">Effective LOS: <b>${effMm} mm</b></div>`;
    tip.style.left = Math.min(window.innerWidth - 230, this._armorMousePx.x + 16) + "px";
    tip.style.top = Math.min(window.innerHeight - 110, this._armorMousePx.y + 16) + "px";
    tip.classList.remove("hidden");
  }

  toggleFcsLaser() {
    if (!this.vehicle || this.onFoot) return;
    const vid = this.vehicle.vState.vehicleId;
    if (vid !== "pzkpfw_140a4" && vid !== "harimau") {
      this.ui.toast("FCS Laser Rangefinder is equipped on PzKpfw 140A4 & Harimau only!", true);
      return;
    }
    this.fcsLaserOn = !this.fcsLaserOn;
    if (this.audio && this.audio.playThermalClick) this.audio.playThermalClick();
    this.ui.toast(this.fcsLaserOn ? "🎯 FCS LASER RANGEFINDER ACTIVE (Targets will receive LWR warning!)" : "🔇 FCS Laser OFF (Silent Ambush Mode)");
  }

  _applyIncomingOrdnanceDamage(hx, hy, hz, shell = "he", caliberMm = 125, fromSelf = false, ox = undefined, oy = undefined, oz = undefined, shooterPeerId = null) {
    if (!this.vehicle || this.onFoot) return;
    const vx = this.vehicle.pos.x, vy = this.vehicle.pos.y + 1.0, vz = this.vehicle.pos.z;
    const dist = Math.hypot(hx - vx, hz - vz);
    const dy = Math.abs(hy - vy);

    const isAp     = (shell === "ap" || shell === "ap140");
    const isHesh   = (shell === "hesh140" || shell === "hesh");
    const isTherm  = (shell === "therm" || shell === "therm140");
    const isRocket = (shell === "rocket122" || shell === "rlg140");
    const isHe     = (shell === "he" || isHesh || isRocket);
    const isAuto   = (shell === "auto40" || shell === "auto30" || shell === "auto23" || shell === "mg" || (!isAp && !isHe && !isTherm && caliberMm <= 45));

    // APFSDS has ZERO blast radius — strictly single-point direct hit only!
    if (isAp && fromSelf) return;
    const maxRad = isAp ? 3.2 : (isTherm ? 32.0 : (shell === "rocket122" ? 30.0 : (isHe ? 19.0 : (caliberMm >= 35 ? 5.5 : 3.6))));
    if (dist > maxRad || dy > (isAp ? 3.4 : 12.0)) return;

    const vs = this.vehicle.vState, spec = this.vehicle.spec;
    const is140 = !!spec.isSchreckensfurst;
    const isTank = !!spec.isTracked;
    const hasK5 = (spec.id === "t72" && !!(vs.upgrades && vs.upgrades.t72Kontakt5));
    const hasEra = is140 || hasK5;
    const isArmored = is140 || isTank || spec.id === "btr80" || spec.id === "komodo_turret" || spec.id === "komodo_std" || spec.id === "komodo_recon" || spec.id === "shilka" || spec.id === "harimau";

    // Fallback origin to impact point if sender didn't supply shooter coordinates
    const origX = (ox !== undefined && ox !== null && isFinite(ox)) ? ox : hx;
    const origY = (oy !== undefined && oy !== null && isFinite(oy)) ? oy : hy;
    const origZ = (oz !== undefined && oz !== null && isFinite(oz)) ? oz : hz;

    // 1. DONNERSCHILD APS ACTIVE INTERCEPT (PzKpfw 140A4 mid-air airburst intercept of HE/HESH/Thermobaric/122mm/RLG!)
    if (is140 && !fromSelf && this.apsFlashTimer > 0 && (isHe || isTherm || isRocket)) {
      const toSrc = new THREE.Vector3(origX - vx, origY - vy, origZ - vz);
      if (toSrc.lengthSq() < 0.25) toSrc.set(hx - vx, Math.max(1.5, hy - vy), hz - vz);
      if (toSrc.lengthSq() < 0.01) toSrc.set(0, 1, 1);
      toSrc.normalize();
      const ix = vx + toSrc.x * 6.5, iy = vy + 1.4 + Math.max(0.2, toSrc.y * 4.5), iz = vz + toSrc.z * 6.5;
      if (this.particles) {
        this.particles.emitCrashBurst(ix, iy, iz, 1.5, "rock", this.weather.weather);
        for (let k = 0; k < 14; k++) {
          this.particles.emitRGB(
            ix + (Math.random() - 0.5) * 1.4, iy + (Math.random() - 0.5) * 1.2, iz + (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 14, 1.5 + Math.random() * 6, (Math.random() - 0.5) * 14,
            0.38, 0.96, 1.0, 0.42 + Math.random() * 0.22, -4.0, 1.8
          );
        }
      }
      if (this.audio && this.audio.playApsIntercept) this.audio.playApsIntercept();
      this.cameraShake = Math.max(this.cameraShake, 0.28);
      if (this.ui) this.ui.toast(`🛡️ DONNERSCHILD APS INTERCEPTED ${Math.round(caliberMm)}mm ${shell.toUpperCase()} IN MID-AIR!`);
      this._sendArmorHitAck(shooterPeerId, { outcome: "aps", zone: "APS", shell, cal: Math.round(caliberMm) });
      return;
    }

    // 2. TRANSFORM INCOMING SHOT VECTOR INTO LOCAL VEHICLE FRAME (Directional Zones & Slope Angling!)
    const invQuat = this._tmpInvQuat.copy(this.vehicle.quat).invert();
    const toShooterW = new THREE.Vector3(origX - hx, origY - hy, origZ - hz);
    if (toShooterW.lengthSq() < 0.25) {
      // Backwards-compatible fallback when origin omitted: use vector from vehicle center to impact point
      toShooterW.set(hx - vx, hy - vy, hz - vz);
      if (toShooterW.lengthSq() < 0.04) toShooterW.set(0, 0.2, 1).applyQuaternion(this.vehicle.quat);
    }
    toShooterW.normalize();
    const shotDirW = toShooterW.clone().negate();
    const toShooterL = toShooterW.clone().applyQuaternion(invQuat).normalize();
    const hitH = hy - this.vehicle.pos.y;

    const ax = toShooterL.x, az = toShooterL.z;
    const isSideHit = Math.abs(ax) > Math.abs(az) * 0.92;
    const sideSign = ax < 0 ? -1 : 1;

    let zone = "FRONT";
    let zoneLabel = "FRONT GLACIS";
    let zoneMult = 1.0;
    let eraFace = "front";
    let zoneNormalL = new THREE.Vector3(0, 0.34, 0.94).normalize();

    if (isTank && isSideHit && hitH < 1.05) {
      zone = "TRACKS";
      zoneLabel = sideSign < 0 ? "LEFT TRACK" : "RIGHT TRACK";
      zoneMult = 0.35;
      eraFace = sideSign < 0 ? "left" : "right";
      zoneNormalL.set(sideSign, 0.04, 0).normalize();
    } else if (isArmored && hitH > 1.45) {
      zone = "TURRET";
      zoneLabel = "TURRET / UPPER MANTLET";
      zoneMult = 1.15;
      eraFace = isSideHit ? (sideSign < 0 ? "left" : "right") : (az >= 0 ? "front" : null);
      if (isSideHit) zoneNormalL.set(sideSign, 0.16, 0).normalize();
      else zoneNormalL.set(0, 0.22, az >= 0 ? 1 : -1).normalize();
    } else if (isSideHit) {
      zone = "SIDE";
      zoneLabel = sideSign < 0 ? "LEFT SIDE HULL" : "RIGHT SIDE HULL";
      zoneMult = 0.38;
      eraFace = sideSign < 0 ? "left" : "right";
      zoneNormalL.set(sideSign, 0.08, 0).normalize();
    } else if (az >= 0) {
      zone = "FRONT";
      zoneLabel = "FRONT GLACIS";
      zoneMult = 1.0;
      eraFace = "front";
      zoneNormalL.set(0, 0.34, 0.94).normalize();
    } else {
      zone = "REAR";
      zoneLabel = "REAR ENGINE DECK";
      zoneMult = 0.20;
      eraFace = null;
      zoneNormalL.set(0, 0.12, -0.99).normalize();
    }

    // 3. v18.1.1 EXACT QUATERNION LOCAL HIT COORDINATES + GROUND-SPLASH BELLY FIX + PROPER ROOF/BELLY NORMALS!
    const prof = this._getArmorProfile(spec, vs);
    const hitLocalPt = new THREE.Vector3(hx - vx, hy - this.vehicle.pos.y, hz - vz).applyQuaternion(invQuat);
    const hitLocalZ = hitLocalPt.z;
    const isDirectBelly = (dist < 2.8 && hitH < -0.10);
    let zoneRha = prof.front;
    if (hitH > 2.35 && dist < 3.6) {
      zone = "ROOF"; zoneLabel = "ROOF ARMOR"; zoneRha = prof.roof;
      zoneNormalL.set(0, 1, 0);
    } else if (isDirectBelly) {
      zone = "BELLY"; zoneLabel = "BELLY PLATE"; zoneRha = prof.belly;
      zoneNormalL.set(0, -1, 0);
    } else if (zone === "TURRET") {
      zoneRha = prof.turret;
    } else if (zone === "SIDE" || zone === "TRACKS") {
      zoneRha = (hitLocalZ >= 0) ? prof.sideFront : prof.sideRear;
      if (zone === "SIDE") zoneLabel = (sideSign < 0 ? "LEFT " : "RIGHT ") + (hitLocalZ >= 0 ? "FRONT-SIDE HULL" : "REAR-SIDE HULL");
    } else if (zone === "REAR") {
      zoneRha = prof.rear;
    } else {
      zoneRha = prof.front;
    }

    const cosTheta = Math.max(0.0, Math.min(1.0, Math.abs(toShooterL.dot(zoneNormalL))));
    const impactAngleDeg = Math.acos(Math.min(1.0, cosTheta)) * (180 / Math.PI);
    const fullSlopeFactor = 1.0 / Math.max(0.35, cosTheta);
    // HESH plastic explosive squashes onto angled steel — ignores HALF of the slope angling bonus!
    const effSlopeFactor = isHesh ? (1.0 + (fullSlopeFactor - 1.0) * 0.5) : fullSlopeFactor;
    const effArmorMm = zoneRha * effSlopeFactor;

    const weaponPenMm = (caliberMm >= 140) ? (isAp ? 880 : (isHesh ? 490 : 520))
      : (caliberMm >= 120 ? (isAp ? 620 : 380)
      : (caliberMm >= 100 ? (isAp ? 480 : 340)
      : (caliberMm >= 35 ? 110
      : (caliberMm >= 28 ? 68
      : (caliberMm >= 20 ? 42
      : (caliberMm >= 14 ? 30 : 20))))));

    // 4. KONTAKT-5 ERA PER-SIDE REACTIVE DETONATION (T-72B w/ Kontakt-5 or PzKpfw 140A4)
    let eraTriggered = false;
    let eraDmgMult = 1.0;
    if (!this._eraCharges) this._resetEraCharges();
    if (hasEra && !fromSelf && eraFace && this._eraCharges[eraFace] > 0 && (isHe || isHesh || isTherm || isRocket)) {
      this._eraCharges[eraFace]--;
      eraTriggered = true;
      eraDmgMult = 0.45; // Cuts penetration & damage by 55%!
      if (this.particles) {
        this.particles.emitCrashBurst(hx, hy + 0.4, hz, 1.35, "rock", this.weather.weather);
        for (let k = 0; k < 14; k++) {
          this.particles.emitRGB(
            hx + (Math.random() - 0.5) * 1.1, hy + 0.3 + Math.random() * 0.7, hz + (Math.random() - 0.5) * 1.1,
            toShooterW.x * (5 + Math.random() * 7) + (Math.random() - 0.5) * 7,
            2.2 + Math.random() * 5.2,
            toShooterW.z * (5 + Math.random() * 7) + (Math.random() - 0.5) * 7,
            1.0, 0.68 + Math.random() * 0.25, 0.16, 0.38 + Math.random() * 0.25, -7.5, 1.4
          );
        }
      }
      if (this.audio && this.audio.playEraDetonation) this.audio.playEraDetonation();
      if (this.ui) this.ui.toast(`⚡ KONTAKT-5 ERA DETONATED (${eraFace.toUpperCase()})! (${this._eraCharges[eraFace]} left)`);
    }

    const effPenMm = weaponPenMm * eraDmgMult;
    const hlth = vs.health;

    // 5. AUTO-RICOCHET & HEAVY MBT NON-PENETRATION (with exposed track/optic chip for autocannons!)
    // v18.1.1 STRICT PENETRATION CHECK: AP, HE, HESH & Autocannons MUST beat effective armor to penetrate!
    const apObliqueBounce = isAp && (impactAngleDeg > 72 || effPenMm < effArmorMm);
    const heNonPen = (isHe && !isTherm && isArmored) && (effPenMm < effArmorMm * 0.92);
    const autoBounce = isAuto && (effPenMm < effArmorMm * 0.92);
    if (apObliqueBounce || heNonPen || autoBounce) {
      let trackSnapped = false;
      // Autocannons & 14.5mm against heavy MBTs can still chew exposed tracks or chip optics/headlights!
      if (isAuto && isTank && (zone === "TRACKS" || (isSideHit && hitH < 1.15))) {
        const tKey = sideSign < 0 ? "trackL" : "trackR";
        const tDmg = caliberMm >= 35 ? 36 : (caliberMm >= 28 ? 26 : (caliberMm >= 20 ? 18 : 11));
        const prevT1 = (hlth[tKey] !== undefined ? hlth[tKey] : 100);
        hlth[tKey] = Math.max(0, prevT1 - tDmg);
        if (prevT1 >= 15 && hlth[tKey] < 15) {
          trackSnapped = true;
          if (this.ui) this.ui.toast(`💥 ${zoneLabel} SNAPPED BY ${Math.round(caliberMm)}mm FIRE! Repair with [X]!`, true);
        }
      } else if (isAuto && isArmored && (zone === "TURRET" || zone === "FRONT") && Math.random() < 0.35) {
        hlth.glass = Math.max(15, (hlth.glass !== undefined ? hlth.glass : 100) - (caliberMm >= 23 ? 12 : 6));
        if (this.vehicle.damageHeadlights) this.vehicle.damageHeadlights(16, 0);
      }

      // Compute physical reflected bounce trajectory & spawn visible bouncing ricochet tracer + sparks!
      const zoneNormalW = zoneNormalL.clone().applyQuaternion(this.vehicle.quat).normalize();
      const refl = shotDirW.clone().reflect(zoneNormalW).normalize();
      refl.y = Math.max(0.22, refl.y + 0.16);
      refl.normalize();
      const bounceDist = isAp ? 68 : 38;
      this._spawnTracerBeam(
        hx, hy, hz,
        hx + refl.x * bounceDist, hy + refl.y * bounceDist, hz + refl.z * bounceDist,
        isAp ? 0x7df9ff : 0xffe066,
        isAp ? 0.11 : 0.055
      );
      if (this.particles) {
        for (let k = 0; k < (isAp ? 14 : 8); k++) {
          this.particles.emitRGB(
            hx, hy + 0.15, hz,
            refl.x * (6 + Math.random() * 10) + (Math.random() - 0.5) * 6,
            2.2 + Math.random() * 5.0,
            refl.z * (6 + Math.random() * 10) + (Math.random() - 0.5) * 6,
            1.0, 0.85, 0.32, 0.32 + Math.random() * 0.2, -9.0, 1.2
          );
        }
      }
      if (this.audio && this.audio.playArmorRicochet) this.audio.playArmorRicochet(isAp ? 0.95 : 0.65);
      else if (this.audio) this.audio.playImpact(0.32);
      if (this.audio && this.audio.playArmorClang) this.audio.playArmorClang(caliberMm, true);
      if (!trackSnapped && this.ui) {
        this.ui.toast(`🛡 ${zoneLabel} RICOCHET! ${Math.round(effArmorMm)}mm eff vs ${Math.round(effPenMm)}mm ${shell.toUpperCase()}`);
      }
      if (!fromSelf) this._sendArmorHitAck(shooterPeerId, {
        outcome: "ricochet",
        zone: zoneLabel,
        shell,
        cal: Math.round(caliberMm),
        effArmorMm: Math.round(effArmorMm),
        penMm: Math.round(effPenMm),
        angleDeg: Math.round(impactAngleDeg),
        trackSnapped
      });
      return;
    }

    // 6. PENETRATION & DISTINCT SHELL / MODULE DAMAGE!
    const falloff = isAp ? 1.0 : Math.max(0.18, 1.0 - (dist / maxRad));
    const calMult = Math.pow(Math.max(14, caliberMm) / 125.0, 1.35);
    let armorMult = Math.max(0.10, Math.min(1.15, effPenMm / Math.max(10, effArmorMm)));
    if (is140) armorMult = Math.min(armorMult, isTherm ? 0.56 : (isHe ? 0.42 : 0.72));
    else if (isTank) armorMult = Math.min(armorMult, isTherm ? 0.72 : (isHe ? 0.58 : 0.88));
    armorMult *= eraDmgMult;

    const baseDmg = isTherm ? 78 : (isHesh ? 62 : (isHe ? 54 : (isAp ? 52 : (caliberMm >= 35 ? 20 : (caliberMm >= 28 ? 14 : (caliberMm >= 20 ? 11 : 7))))));
    const dmg = baseDmg * calMult * falloff * armorMult;

    if ((is140 || isTank || isArmored) && this.audio) {
      if (this.audio.playArmorClang) this.audio.playArmorClang(caliberMm, false);
      if (caliberMm >= 90 && this.audio.playConcussionMuffle) this.audio.playConcussionMuffle();
    }
    // v18.1.1 LOCATION-ACCURATE DAMAGEABLE MODULES & AMMO STOWAGE COOK-OFFS!
    let cookoffKind = null;
    if (isArmored && caliberMm >= 20) {
      if (zone === "TURRET" || zone === "ROOF") {
        this.tankModules.turretRing = Math.max(0, this.tankModules.turretRing - dmg * 0.90);
        this.tankModules.gunBreech  = Math.max(0, this.tankModules.gunBreech  - dmg * 0.72);
        if (Math.abs(hitLocalPt.x) < 0.75 && hitLocalPt.z > 0.2) {
          this.tankModules.gunBarrel = Math.max(0, this.tankModules.gunBarrel - dmg * 0.95);
        }
        if (Math.random() < 0.35) this.tankModules.lwsSensor = Math.max(0, this.tankModules.lwsSensor - 65);
        if (Math.random() < 0.32) this.tankModules.secBarrel = Math.max(0, this.tankModules.secBarrel - 70);
      }
      if (caliberMm >= 90 && dmg > 12) {
        if (spec.id === "t72" && !this.turretPopActive && Math.abs(hitLocalPt.z) < 1.65 && zone !== "REAR") {
          this.turretPopActive = true;
          this.turretPopVy = 19.5;
          vs.burnedOut = true;
          this.cookoffJetTimer = 3.6;
          cookoffKind = "cosmonaut";
          if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
          if (this.ui) this.ui.toast("🚀 T-72 CAROUSEL COOK-OFF!! Turret launched — exit [F] or recover to any Garage!", true);
        } else if (is140 && zone === "TURRET" && hitLocalPt.z < -0.10) {
          const hitLeft = (hitLocalPt.x < 0);
          const throughBoth = isAp && Math.abs(toShooterL.x) > 0.75;
          const halve140 = () => {
            vs.p140ApAmmo = Math.floor((vs.p140ApAmmo || 0) * 0.5);
            vs.p140HeshAmmo = Math.floor((vs.p140HeshAmmo || 0) * 0.5);
            vs.p140ThermAmmo = Math.floor((vs.p140ThermAmmo || 0) * 0.5);
            vs.p140RlgAmmo = Math.floor((vs.p140RlgAmmo || 0) * 0.5);
          };
          if (throughBoth && (this.ammoRackLIntact || this.ammoRackRIntact)) {
            this.ammoRackLIntact = false; this.ammoRackRIntact = false;
            vs.p140ApAmmo = 0; vs.p140HeshAmmo = 0; vs.p140ThermAmmo = 0; vs.p140RlgAmmo = 0;
            this.cookoffJetTimer = 3.8; cookoffKind = "blowout";
            if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
            if (this.ui) this.ui.toast("🔥 BOTH 140A4 BLOW-OUT RACKS COOKED OFF! Crew safe — 0 shells left!", true);
          } else if (hitLeft && this.ammoRackLIntact) {
            this.ammoRackLIntact = false; halve140();
            this.cookoffJetTimer = 3.5; cookoffKind = "blowout";
            if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
            if (this.ui) this.ui.toast("🔥 LEFT BLOW-OUT RACK COOK-OFF! 50% ammo lost — Right rack still operational!", true);
          } else if (!hitLeft && this.ammoRackRIntact) {
            this.ammoRackRIntact = false; halve140();
            this.cookoffJetTimer = 3.5; cookoffKind = "blowout";
            if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
            if (this.ui) this.ui.toast("🔥 RIGHT BLOW-OUT RACK COOK-OFF! 50% ammo lost — Left rack still operational!", true);
          }
        } else if (spec.id === "bm21" && (vs.bm21Rockets || 0) > 0 && hitLocalPt.z < 0.2 && hitLocalPt.y > 1.15) {
          vs.bm21Rockets = 0;
          vs.burnedOut = true;
          this.cookoffJetTimer = 4.5; cookoffKind = "grad";
          if (this.particles) this.particles.emitCrashBurst(vx, vy + 1.8, vz, 3.2, "rock", this.weather.weather);
          if (this.audio && this.audio.playTank125mmBlast) this.audio.playTank125mmBlast(155);
          if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
          if (this.ui) this.ui.toast("💥 BM-21 GRAD ROCKET RACK DETONATED!! MASSIVE SECONDARY EXPLOSION!", true);
        } else if ((spec.id === "harimau" && zone === "TURRET" && hitLocalPt.z < -0.1) || ((spec.id === "shilka" || spec.id === "komodo_turret") && zone === "TURRET")) {
          vs.t72HeAmmo = 0; vs.t72ApAmmo = 0; vs.shilkaAmmo = 0; vs.btrAmmo = 0;
          this.cookoffJetTimer = 3.5; cookoffKind = "blowout";
          if (this.audio && this.audio.playCookoffJet) this.audio.playCookoffJet();
          if (this.ui) this.ui.toast("🔥 AMMO RACK BLOW-OUT! Crew survived — all ammo cooked off!", true);
        }
      }
    }
    hlth.body = Math.max(4, (hlth.body !== undefined ? hlth.body : 100) - dmg * 0.85);
    const p = vs.parts;
    let trackSnapped = false;
    let breechShock = false;

    if (isAp) {
      // APFSDS: Pinpoint directional internal spall based on exact hit zone!
      let apTargets = ["radiator", "gearboxGears", "pistons", "tieRods"];
      if (zone === "REAR") {
        apTargets = ["radiator", "pistons", "headGasket", "crankshaft"];
        this.vehicle.coolantTemp = Math.min(132, (this.vehicle.coolantTemp || 85) + 24);
      } else if (zone === "SIDE") {
        apTargets = ["gearboxGears", "transferCase", "driveshaft"];
        vs.fuel = Math.max(0, (vs.fuel || 0) - Math.min(18, 8 + dmg * 0.22));
      } else if (zone === "TURRET") {
        apTargets = ["sparkPlugs", "radiator"];
        breechShock = true;
        this.t72ReloadTimer = Math.max(this.t72ReloadTimer || 0, 0) + 3.0;
        hlth.glass = Math.max(0, (hlth.glass !== undefined ? hlth.glass : 100) - 38);
      } else if (zone === "TRACKS") {
        apTargets = ["shockFL", "shockFR", "shockRL", "shockRR", "wheelHubs"];
      }
      if (p) {
        for (const id of apTargets) {
          if (p[id]) p[id].hp = Math.max(4, p[id].hp - dmg * 1.05);
        }
      }
      if (isTank && zone === "TRACKS") {
        const tKey = sideSign < 0 ? "trackL" : "trackR";
        hlth[tKey] = Math.max(0, (hlth[tKey] !== undefined ? hlth[tKey] : 100) - Math.max(48, dmg * 1.8));
        if ((hlth[tKey] !== undefined ? hlth[tKey] : 100) < 15 && !this._trkAlreadySnapped?.[tKey]) { trackSnapped = true; if (!this._trkAlreadySnapped) this._trkAlreadySnapped = {}; this._trkAlreadySnapped[tKey] = true; }
      }
    } else if (isHe || isTherm) {
      // HE / HESH / 122mm Rockets / Thermobaric: Overpressure shockwave, heavy track snapping & optic shatter!
      const blastTargets = isTherm
        ? ["pistons", "radiator", "intercooler", "sparkPlugs", "fuelInjectors", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods", "brakeSystem"]
        : ["radiator", "intercooler", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods"];
      if (p) {
        for (const id of blastTargets) {
          if (p[id]) p[id].hp = Math.max(4, p[id].hp - dmg * (isHesh ? 0.80 : 0.68));
        }
      }
      hlth.glass = Math.max(0, (hlth.glass !== undefined ? hlth.glass : 100) - Math.min(80, 28 + dmg * 1.1));
      if (this.vehicle.damageHeadlights) this.vehicle.damageHeadlights(55 * falloff, 0);
      if (isTherm) this.vehicle.coolantTemp = Math.min(132, (this.vehicle.coolantTemp || 85) + 24 * falloff);
      if (isTank) {
        const trackDmg = (zone === "TRACKS" ? 72 : (zone === "SIDE" ? 56 : 38)) * falloff * (isHesh ? 1.15 : 1.0) * eraDmgMult;
        const prevHL = hlth.trackL !== undefined ? hlth.trackL : 100;
        const prevHR = hlth.trackR !== undefined ? hlth.trackR : 100;
        if (sideSign < 0 || zone === "FRONT" || zone === "REAR") hlth.trackL = Math.max(0, prevHL - trackDmg);
        if (sideSign >= 0 || zone === "FRONT" || zone === "REAR") hlth.trackR = Math.max(0, prevHR - trackDmg);
        if (!this._trkAlreadySnapped) this._trkAlreadySnapped = {};
        if (prevHL >= 15 && hlth.trackL < 15 && !this._trkAlreadySnapped.trackL) { trackSnapped = true; this._trkAlreadySnapped.trackL = true; }
        if (prevHR >= 15 && hlth.trackR < 15 && !this._trkAlreadySnapped.trackR) { trackSnapped = true; this._trkAlreadySnapped.trackR = true; }
      } else if (this.vehicle._damageTire) {
        this.vehicle._damageTire(Math.floor(Math.random() * this.vehicle.wheels.length), 68 * falloff, "shrapnel");
      }
    } else {
      // Autocannons (23/30/40mm) & 14.5mm penetrating light armor (BTR/Komodo/Shilka/civilian)
      if (p) {
        const autoTargets = zone === "REAR"
          ? ["radiator", "pistons", "headGasket"]
          : (zone === "SIDE" ? ["gearboxGears", "transferCase", "fuelInjectors"] : ["radiator", "intercooler", "tieRods"]);
        for (const id of autoTargets) {
          if (p[id]) p[id].hp = Math.max(4, p[id].hp - dmg * 0.85);
        }
      }
      hlth.glass = Math.max(0, (hlth.glass !== undefined ? hlth.glass : 100) - Math.min(45, dmg * 1.4));
      if (Math.random() < 0.45 && this.vehicle.damageHeadlights) this.vehicle.damageHeadlights(35, 0);
      if (isTank) {
        const tKey = sideSign < 0 ? "trackL" : "trackR";
        hlth[tKey] = Math.max(0, (hlth[tKey] !== undefined ? hlth[tKey] : 100) - dmg * 1.6);
        if ((hlth[tKey] !== undefined ? hlth[tKey] : 100) < 15 && !this._trkAlreadySnapped?.[tKey]) { trackSnapped = true; if (!this._trkAlreadySnapped) this._trkAlreadySnapped = {}; this._trkAlreadySnapped[tKey] = true; }
      } else if (vs.blownTires && vs.blownTires.length > 0 && Math.random() < 0.55) {
        const wi = Math.floor(Math.random() * vs.blownTires.length);
        vs.blownTires[wi] = true;
        if (this.ui) this.ui.toast("💥 TIRE SHOT OUT! Swap spare or Field Repair [X]!", true);
      }
    }

    // Physical blast impulse (none on pinpoint APFSDS!)
    if (!isAp) {
      const ang = Math.atan2(vx - hx, vz - hz);
      const imp = (isTherm ? 28 : (isHe ? 18 : 5)) * falloff * eraDmgMult * (isTank ? 0.42 : 1.0);
      this.vehicle.applyExternalImpulse(Math.sin(ang) * imp, imp * 0.45, Math.cos(ang) * imp, (Math.random() - 0.5) * 3.2 * falloff);
    }
    this.cameraShake = Math.max(this.cameraShake, Math.min(1.1, 0.35 + falloff * 0.7));
    if (this.audio && this.audio.playImpact) this.audio.playImpact(Math.min(1.0, 0.45 + falloff * 0.55));

    if (this.ui && !fromSelf) {
      if (breechShock) {
        this.ui.toast(`💥 ${zoneLabel} PENETRATED! Breech shock (+3.0s reload delay)!`, true);
      } else if (trackSnapped) {
        this.ui.toast(`💥 ${zoneLabel} HIT — TANK TRACK SNAPPED! Repair with [X]!`, true);
      } else if (!eraTriggered) {
        this.ui.toast(`💥 ${zoneLabel} PENETRATED! ${Math.round(caliberMm)}mm ${shell.toUpperCase()} (${Math.round(effPenMm)}mm vs ${Math.round(effArmorMm)}mm eff)`, true);
      }
    }

    if (!fromSelf) {
      this._sendArmorHitAck(shooterPeerId, {
        outcome: eraTriggered ? "era" : (trackSnapped ? "track_snap" : "pen"),
        zone: zoneLabel,
        shell,
        cal: Math.round(caliberMm),
        effArmorMm: Math.round(effArmorMm),
        penMm: Math.round(effPenMm),
        breechShock,
        trackSnapped,
        cookoff: cookoffKind
      });
    }
  }

  _applyTreeBallistics(gx, gy, gz, dmg, blastRad = 0, dirX = 1, dirZ = 0) {
    if (!this.world || !this.world.damageTreesAt) return { hit: false, broken: [] };
    const tr = this.world.damageTreesAt(gx, gy, gz, dmg, blastRad, dirX, dirZ);
    if (tr.broken && tr.broken.length > 0) {
      if (this.audio && this.audio.playWoodSnap) this.audio.playWoodSnap();
      for (const b of tr.broken) {
        if (this.particles) this.particles.emitCrashBurst(b.x, b.y + 1.4, b.z, 1.2, "gravel", this.weather.weather);
        if (this.network) this.network.send({ type: "tree_break", treeId: b.treeId, x: +b.x.toFixed(1), y: +b.y.toFixed(1), z: +b.z.toFixed(1), dirX: +(b.dirX || 1).toFixed(2), dirZ: +(b.dirZ || 0).toFixed(2) });
      }
    } else if (tr.hit && blastRad <= 0.5 && this.particles) {
      this.particles.emitCrashBurst(gx, gy, gz, 0.45, "gravel", this.weather.weather);
    }
    return tr;
  }

  triggerDonnerschildAps() {
    this.apsFlashTimer = 0.65;
    if (this.audio.playApsIntercept) this.audio.playApsIntercept();
    if (this.cryptids && this.cryptids.projectiles) {
      for (let i = this.cryptids.projectiles.length - 1; i >= 0; i--) {
        const pr = this.cryptids.projectiles[i];
        if (Math.hypot(pr.gx - this.vehicle.pos.x, pr.gz - this.vehicle.pos.z) < 42) {
          this.particles.emitCrashBurst(pr.gx, pr.gy, pr.gz, 1.4, "rock", this.weather.weather);
          this.scene.remove(pr.mesh);
          this.cryptids.projectiles.splice(i, 1);
        }
      }
    }
    if (this.skinwalker) this.skinwalker.repel(this.audio);
  }

  _hitOceanCryptids(rx, ry, rz, dmg = 22) {
    if (!this.oceanCryptids) return { hit: false };
    const ab = this.boats ? this.boats.activeBoat : null;
    const ax = ab ? ab.gx : this.vehicle.pos.x;
    const az = ab ? ab.gz : this.vehicle.pos.z;
    return this.oceanCryptids.applyWeaponHit(rx, ry, rz, dmg, ax, az, this.network ? this.network.peerId : "__local__", this.audio, this.ui, this.network);
  }

  fireP140MainCannon() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "pzkpfw_140a4" || this.t72ReloadTimer > 0) return;
    if (this.tankModules && this.tankModules.gunBarrel < 15) { this.ui.toast("🚫 140mm BARREL DESTROYED! Repair at front hood [F] or Garage!", true); return; }
    if (this.tankModules && this.tankModules.gunBreech < 18 && Math.random() < 0.35) {
      if (this.audio && this.audio.playThermalClick) this.audio.playThermalClick();
      this.ui.toast("⚠ BREECH MISFIRE! Damaged breech failed to ignite — pull trigger again!", true);
      return;
    }
    const sh = vs.p140ShellType || "ap140";
    const keyMap = { ap140: "p140ApAmmo", hesh140: "p140HeshAmmo", therm140: "p140ThermAmmo", rlg140: "p140RlgAmmo" };
    const ammoKey = keyMap[sh] || "p140ApAmmo";
    if ((vs[ammoKey] || 0) <= 0) {
      this.ui.toast(`OUT OF ${sh.toUpperCase()} — Press [R] to switch shell or Resupply at any Garage!`, true);
      return;
    }
    vs[ammoKey]--;
    const brPen140 = this.tankModules ? (1.0 + Math.max(0, (100 - this.tankModules.gunBreech) / 100) * 0.85) : 1.0;
    this.t72ReloadTotal = +(4.8 * brPen140).toFixed(2);
    this.t72ReloadTimer = this.t72ReloadTotal;
    this.t72BarrelRecoil = 1.0;
    this.t72MainFlash = 0.18;

    const mz = this._getActiveMuzzleTransform();
    const aimDir = this._getBarrelAimWorldDir();
    this.vehicle.applyRecoilTorque(mz.dirWorld, 2.35, 1.15, 2.05);
    this.particles.emitMuzzleShockwave(mz.tipWorld, mz.dirWorld, this.world, this.weather.weather, 1.85, false);
    this.barrelSmokeTimer = Math.max(this.barrelSmokeTimer, 8.0);
    this.barrelHeat = Math.min(1.0, this.barrelHeat + 0.65);
    if (this.audio.play140mmEtcBlast) this.audio.play140mmEtcBlast();
    if (this.audio.playLinearAutoloader) this.audio.playLinearAutoloader();
    this.cameraShake = Math.max(this.cameraShake, 0.72);

    if (sh === "rlg140") {
      const mGrp = new THREE.Group();
      const mBody = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.10, 2.1, 8), new THREE.MeshBasicMaterial({ color: 0xe63946 }));
      mBody.rotation.x = Math.PI / 2; mGrp.add(mBody);
      const mPlume = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.8, 7), new THREE.MeshBasicMaterial({ color: 0x00f5ff, transparent: true, opacity: 0.92 }));
      mPlume.rotation.x = -Math.PI / 2; mPlume.position.z = -1.6; mGrp.add(mPlume);
      this.scene.add(mGrp);
      const spd = 165;
      this.guidedMissiles.push({
        gx: mz.tipWorld.x, gy: mz.tipWorld.y, gz: mz.tipWorld.z,
        vx: aimDir.x * spd, vy: aimDir.y * spd, vz: aimDir.z * spd,
        speed: spd, life: 6.5, mesh: mGrp
      });
      return;
    }

    const maxRange = sh === "ap140" ? 560 : 450;
    if (this.tankModules && this.tankModules.gunBarrel < 50) {
      const spr = (50 - this.tankModules.gunBarrel) * 0.0009;
      aimDir.x += (Math.random() - 0.5) * spr; aimDir.y += (Math.random() - 0.5) * spr; aimDir.z += (Math.random() - 0.5) * spr;
      aimDir.normalize();
    }
    const obbHit140 = this._raycastRemotePlayersOBB(mz.tipWorld.x, mz.tipWorld.y, mz.tipWorld.z, aimDir.x, aimDir.y, aimDir.z, maxRange);
    const effMax140 = obbHit140 ? obbHit140.t : maxRange;
    let endPt = obbHit140 ? new THREE.Vector3(obbHit140.x, obbHit140.y, obbHit140.z) : mz.tipWorld.clone().addScaledVector(aimDir, maxRange);
    const isAp140 = (sh === "ap140");
    for (let s = 6; s < effMax140; s += (isAp140 ? 4 : 6)) {
      const rx = mz.tipWorld.x + aimDir.x * s, ry = mz.tipWorld.y + aimDir.y * s, rz = mz.tipWorld.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop at effMax140
      let cHit = this.cryptids.applyCannonHit(rx, ry, rz, sh, this.audio, 140); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 65);
      if (cHit.hit) { endPt.set(rx, ry, rz); break; }
      if (this.skinwalker && this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network).hit) { endPt.set(rx, ry, rz); break; }
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, isAp140 ? 1.5 : 6.5, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 160, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) {
        endPt.set(rx, gh, rz);
        this.cryptids.applyCannonHit(rx, gh, rz, sh, this.audio, 140);
        if (this.gasStations) this.gasStations.checkProjectileHit(rx, gh, rz, isAp140 ? 1.5 : 7.5, this, false);
        if (sh === "hesh140" || sh === "therm140") {
          const cr = sh === "therm140" ? 8.2 : 5.8, cd = sh === "therm140" ? 2.4 : 1.6;
          if (this.world.addCrater(rx, rz, cr, cd)) {
            this.network.send({ type: "crater_add", x: +rx.toFixed(1), z: +rz.toFixed(1), r: cr, d: cd });
          }
        }
        break;
      }
    }
    const beamCol = sh === "ap140" ? 0x7df9ff : (sh === "therm140" ? 0xff4500 : 0xffbe0b);
    this._spawnTracerBeam(mz.tipWorld.x, mz.tipWorld.y, mz.tipWorld.z, endPt.x, endPt.y, endPt.z, beamCol, 0.22);
    this.particles.emitCrashBurst(endPt.x, endPt.y + 1.0, endPt.z, isAp140 ? 0.75 : 2.8, "rock", this.weather.weather);
    if (!isAp140) this._applyTreeBallistics(endPt.x, endPt.y, endPt.z, sh === "therm140" ? 220 : 160, sh === "therm140" ? 18.0 : 12.0, aimDir.x, aimDir.z);
    this._applyIncomingOrdnanceDamage(endPt.x, endPt.y, endPt.z, sh, 140, true, mz.tipWorld.x, mz.tipWorld.y, mz.tipWorld.z, this.network ? this.network.peerId : null);
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 32)) this.clarksonFarm.triggerRage(this.ui, this.audio);
    this.network.send({
      type: "cannon_fire", shell: sh, cal: 140,
      x0: +mz.tipWorld.x.toFixed(1), y0: +mz.tipWorld.y.toFixed(1), z0: +mz.tipWorld.z.toFixed(1),
      ox: +mz.tipWorld.x.toFixed(1), oy: +mz.tipWorld.y.toFixed(1), oz: +mz.tipWorld.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  fireP140AutoKanone40mm() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "pzkpfw_140a4" || this.t72CoaxCd > 0) return;
    if (this.tankModules && this.tankModules.secBarrel < 20) { this.ui.toast("🚫 40mm AUTOKANONE BARREL SILENCED! Repair [F]!", true); return; }
    if ((vs.p140AutoAmmo || 0) <= 0) return;
    this.t72CoaxCd = 0.22;
    this.t72CoaxFlash = 0.09;
    this.autoBarrelHeat = Math.min(1.0, this.autoBarrelHeat + 0.095);
    vs.p140AutoAmmo--;

    let muzzleG, aimDir;
    if (this.vehicleRig && this.vehicleRig.p140RwsMuzzleTip && this.vehicleRig.p140RwsGunPitch) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const tipLocalScene = new THREE.Vector3();
      this.vehicleRig.p140RwsMuzzleTip.getWorldPosition(tipLocalScene);
      muzzleG = new THREE.Vector3(tipLocalScene.x + this.world.originX, tipLocalScene.y, tipLocalScene.z + this.world.originZ);
      const qPitchW = new THREE.Quaternion();
      this.vehicleRig.p140RwsGunPitch.getWorldQuaternion(qPitchW);
      aimDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qPitchW).normalize();
    } else {
      const tYaw = this.btrTurretYaw || 0;
      const rYaw = this.p140RwsYaw || tYaw;
      const rPitch = Math.max(-0.175, Math.min(0.96, this.p140RwsPitch || 0));
      const pedX = Math.cos(tYaw) * 0.62 + Math.sin(tYaw) * 0.18;
      const pedZ = -0.38 - Math.sin(tYaw) * 0.62 + Math.cos(tYaw) * 0.18;
      muzzleG = new THREE.Vector3(pedX + Math.sin(rYaw) * 2.85, 3.06, pedZ + Math.cos(rYaw) * 2.85).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
      aimDir = new THREE.Vector3(Math.sin(rYaw) * Math.cos(rPitch), Math.sin(rPitch), Math.cos(rYaw) * Math.cos(rPitch)).applyQuaternion(this.vehicle.quat).normalize();
    }
    const obb40 = this._raycastRemotePlayersOBB(muzzleG.x, muzzleG.y, muzzleG.z, aimDir.x, aimDir.y, aimDir.z, 360);
    const lim40 = obb40 ? obb40.t : 360;
    let endPt = obb40 ? new THREE.Vector3(obb40.x, obb40.y, obb40.z) : muzzleG.clone().addScaledVector(aimDir, 360);
    for (let s = 6; s < lim40; s += 5) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop at lim40
      let cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, true, 40); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 28);
      if (cHit.hit) { endPt.set(rx, ry, rz); this.particles.emitCrashBurst(rx, ry, rz, 1.1, "rock", this.weather.weather); break; }
      if (this.skinwalker && this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network).hit) { endPt.set(rx, ry, rz); break; }
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.5, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 42, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) { endPt.set(rx, gh, rz); this.particles.emitCrashBurst(rx, gh + 0.3, rz, 0.9, "rock", this.weather.weather); break; }
    }
    this._spawnTracerBeam(muzzleG.x, muzzleG.y, muzzleG.z, endPt.x, endPt.y, endPt.z, 0xff9f1c, 0.11);
    if (this.audio.play40mmAutoKanone) this.audio.play40mmAutoKanone();
    this.cameraShake = Math.max(this.cameraShake, 0.12);
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 25)) this.clarksonFarm.triggerRage(this.ui, this.audio);
    this.network.send({
      type: "weapon_fire", cal: 40,
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
      ox: +muzzleG.x.toFixed(1), oy: +muzzleG.y.toFixed(1), oz: +muzzleG.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  fireT72MainCannon() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId === "pzkpfw_140a4") { this.fireP140MainCannon(); return; }
    if (vs.vehicleId !== "t72" && vs.vehicleId !== "harimau") return;
    if (this.tankModules && this.tankModules.gunBarrel < 15) { this.ui.toast("🚫 MAIN GUN BARREL DESTROYED! Field Repair [F] or Garage!", true); return; }
    if (this.tankModules && this.tankModules.gunBreech < 18 && Math.random() < 0.35) {
      if (this.audio && this.audio.playThermalClick) this.audio.playThermalClick();
      this.ui.toast("⚠ BREECH MISFIRE! Damaged breech failed to ignite!", true);
      return;
    }
    if (this.t72ReloadTimer > 0) {
      this.ui.toast(`Carousel Autoloader cycling... (${this.t72ReloadTimer.toFixed(1)}s)`);
      return;
    }
    const shell = (vs.t72ShellType === "therm" && vs.upgrades.t72SeismicFcs) ? "therm" : (vs.t72ShellType === "ap" ? "ap" : "he");
    const ammoKey = shell === "therm" ? "t72ThermAmmo" : (shell === "ap" ? "t72ApAmmo" : "t72HeAmmo");
    if ((vs[ammoKey] || 0) <= 0) {
      this.ui.toast(`OUT OF 125mm ${shell.toUpperCase()} SHELLS! Press [R] to switch shell or Resupply at a Town Garage!`, true);
      return;
    }
    vs[ammoKey]--;
    const brPenT = this.tankModules ? (1.0 + Math.max(0, (100 - this.tankModules.gunBreech) / 100) * 0.85) : 1.0;
    this.t72ReloadTotal = +(((vs.vehicleId === "harimau") ? 5.0 : (vs.upgrades.t72SeismicFcs ? 4.8 : 6.5)) * brPenT).toFixed(2);
    this.t72ReloadTimer = this.t72ReloadTotal;
    this.t72BarrelRecoil = 1.0;
    this.t72MainFlash = 0.16;

    const mzMain = this._getActiveMuzzleTransform();
    const muzzleG = mzMain.tipWorld.clone();
    let aimDir;
    if (this.vehicleRig && this.vehicleRig.tankGunPitch) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const qBarW = new THREE.Quaternion();
      this.vehicleRig.tankGunPitch.getWorldQuaternion(qBarW);
      aimDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qBarW).normalize();
    } else {
      aimDir = this._getBarrelAimWorldDir();
    }

    const maxRange = shell === "ap" ? 460 : 380;
    if (this.tankModules && this.tankModules.gunBarrel < 50) {
      const spr = (50 - this.tankModules.gunBarrel) * 0.0009;
      aimDir.x += (Math.random() - 0.5) * spr; aimDir.y += (Math.random() - 0.5) * spr; aimDir.z += (Math.random() - 0.5) * spr;
      aimDir.normalize();
    }
    const tankCalNow = (vs.vehicleId === "harimau") ? 105 : 125;
    const obbHitT = this._raycastRemotePlayersOBB(muzzleG.x, muzzleG.y, muzzleG.z, aimDir.x, aimDir.y, aimDir.z, maxRange);
    const effMaxT = obbHitT ? obbHitT.t : maxRange;
    let endPt = obbHitT ? new THREE.Vector3(obbHitT.x, obbHitT.y, obbHitT.z) : muzzleG.clone().addScaledVector(aimDir, maxRange);
    let hitRes = { hit: false };

    for (let s = 6; s < effMaxT; s += 6) {
      const rx = muzzleG.x + aimDir.x * s;
      const ry = muzzleG.y + aimDir.y * s;
      const rz = muzzleG.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop at effMaxT
      let cHit = this.cryptids.applyCannonHit(rx, ry, rz, shell, this.audio, tankCalNow); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 52);
      if (!cHit.hit && this.skinwalker) this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network);
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.2, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 20, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      if (cHit.hit) { endPt.set(rx, ry, rz); hitRes = cHit; break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) {
        endPt.set(rx, gh, rz);
        hitRes = this.cryptids.applyCannonHit(rx, gh, rz, shell, this.audio, tankCalNow);
        if (shell === "he" || shell === "therm") {
          const cr = shell === "therm" ? 6.8 : 4.6, cd = shell === "therm" ? 2.0 : 1.25;
          if (this.world.addCrater(rx, rz, cr, cd)) {
            this.network.send({ type: "crater_add", x: +rx.toFixed(1), z: +rz.toFixed(1), r: cr, d: cd });
          }
        }
        break;
      }
    }

    const mzBeam = this._getActiveMuzzleTransform();
    this._spawnTracerBeam(mzBeam.tipWorld.x, mzBeam.tipWorld.y, mzBeam.tipWorld.z, endPt.x, endPt.y, endPt.z, shell === "therm" ? 0xff4500 : (shell === "ap" ? 0x00f5ff : 0xffbe0b), shell === "therm" ? 0.24 : 0.15);
    this.particles.emitCrashBurst(endPt.x, endPt.y + 1.0, endPt.z, shell === "he" ? 2.4 : 1.5, "rock", this.weather.weather);

    // COLOSSAL 125mm BLAST + 6.5s MULTI-STAGE MECHANICAL CAROUSEL AUTOLOADER SOUND!
    this.audio.playTank125mmBlast(vs && vs.vehicleId === "harimau" ? 105 : 125);
    this.audio.playTankAutoloader();
    this.cameraShake = Math.max(this.cameraShake, 0.72);

    // v13.995 HF: Exact Physical Barrel-Based Suspension Recoil + Under-Barrel Terrain Shockwave!
    const mz = this._getActiveMuzzleTransform();
    this.vehicle.applyRecoilTorque(mz.dirWorld, 2.15, 1.28, 2.38);
    this.particles.emitMuzzleShockwave(mz.tipWorld, mz.dirWorld, this.world, this.weather.weather, 1.60, false);
    this.barrelSmokeTimer = Math.max(this.barrelSmokeTimer, 7.5);
    this.barrelHeat = Math.min(1.0, this.barrelHeat + 0.58);

    // Clarkson's Farm sheep clause: even 41.5 tons of Kontakt-1 armor won't save you!
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 35)) {
      this.clarksonFarm.triggerRage(this.ui, this.audio);
    }
    const tankCal = (vs.vehicleId === "harimau") ? 105 : 125;
    this._applyIncomingOrdnanceDamage(endPt.x, endPt.y, endPt.z, shell, tankCal, true, muzzleG.x, muzzleG.y, muzzleG.z, this.network ? this.network.peerId : null);

    this.network.send({
      type: "cannon_fire", shell, cal: tankCal,
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
      ox: +muzzleG.x.toFixed(1), oy: +muzzleG.y.toFixed(1), oz: +muzzleG.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  // SECONDARY: T-72B ROOF-MOUNTED 14.5mm HEAVY MACHINE GUN (Middle-Click OR Hold [Shift]!)
  fireT72Coax145() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId === "pzkpfw_140a4") { this.fireP140AutoKanone40mm(); return; }
    if ((vs.vehicleId !== "t72" && vs.vehicleId !== "harimau") || this.t72CoaxCd > 0) return;
    if (this.tankModules && this.tankModules.secBarrel < 20) { this.ui.toast("🚫 SECONDARY 14.5mm BARREL SILENCED! Repair [F]!", true); return; }
    if ((vs.t72CoaxAmmo || 0) <= 0) {
      this.ui.toast("OUT OF 14.5mm SECONDARY AMMO! Resupply at a Town Garage!", true); return;
    }
    this.t72CoaxCd = 0.16;
    this.t72CoaxFlash = 0.08;
    this.autoBarrelHeat = Math.min(1.0, this.autoBarrelHeat + 0.068);
    vs.t72CoaxAmmo--;

    let muzzleG, aimDir;
    if (this.vehicleRig && this.vehicleRig.p140RwsMuzzleTip && this.vehicleRig.p140RwsGunPitch) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const tipL = new THREE.Vector3();
      this.vehicleRig.p140RwsMuzzleTip.getWorldPosition(tipL);
      muzzleG = new THREE.Vector3(tipL.x + this.world.originX, tipL.y, tipL.z + this.world.originZ);
      const qW = new THREE.Quaternion();
      this.vehicleRig.p140RwsGunPitch.getWorldQuaternion(qW);
      aimDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qW).normalize();
    } else {
      muzzleG = new THREE.Vector3(0.58, 2.96, 0.18).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
      aimDir = this._getBarrelAimWorldDir(this.p140RwsYaw);
    }
    const obbCx = this._raycastRemotePlayersOBB(muzzleG.x, muzzleG.y, muzzleG.z, aimDir.x, aimDir.y, aimDir.z, 240);
    const limCx = obbCx ? obbCx.t : 240;
    let endPt = obbCx ? new THREE.Vector3(obbCx.x, obbCx.y, obbCx.z) : muzzleG.clone().addScaledVector(aimDir, 240);
    let hitRes = { hit: false };
    for (let s = 6; s < limCx; s += 5) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop
      let cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, !!(vs.upgrades && vs.upgrades.t72AcousticJammer)); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 14);
      if (!cHit.hit && this.skinwalker) this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network);
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.2, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 20, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      if (cHit.hit) { endPt.set(rx, ry, rz); hitRes = cHit; this.particles.emitCrashBurst(rx, ry, rz, 0.7, "rock", this.weather.weather); break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) { endPt.set(rx, gh, rz); this.particles.emitCrashBurst(rx, gh + 0.3, rz, 0.5, "rock", this.weather.weather); break; }
    }
    this._spawnTracerBeam(muzzleG.x, muzzleG.y, muzzleG.z, endPt.x, endPt.y, endPt.z, 0xffd166, 0.055);
    this.audio.playKPVTShot();
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 25)) this.clarksonFarm.triggerRage(this.ui, this.audio);

    const coaxCal = (vs.vehicleId === "harimau") ? 7.62 : 14.5;
    this.network.send({
      type: "weapon_fire", cal: coaxCal,
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
      ox: +muzzleG.x.toFixed(1), oy: +muzzleG.y.toFixed(1), oz: +muzzleG.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  fireBtrTurret() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    const isKomodo30 = (vs.vehicleId === "komodo_turret");
    const isKomodoMg = (vs.vehicleId === "komodo_std");
    if (!isKomodo30 && !isKomodoMg && (vs.vehicleId !== "btr80" || !vs.upgrades.btrTurret)) return;
    if (this.btrFireCd > 0) return;
    if ((vs.btrAmmo || 0) <= 0) {
      this.ui.toast(isKomodo30 ? "OUT OF 30mm AMMO! Resupply at any Town Garage!" : (isKomodoMg ? "OUT OF 12.7mm HMG AMMO! Resupply at any Town Garage!" : "OUT OF 14.5mm AMMO! Visit Richard Hammond on his Desert Mesa to reload ($600)!"), true);
      return;
    }
    this.btrFireCd = isKomodoMg ? 0.115 : (isKomodo30 ? 0.21 : 0.20);
    this.btrFlashTimer = isKomodoMg ? 0.065 : 0.095;
    vs.btrAmmo--;

    let muzzleLocal, aimDir;
    if (this.vehicleRig && this.vehicleRig.btrMuzzleTip && this.vehicleRig.btrGunGroup) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const tipL = new THREE.Vector3();
      this.vehicleRig.btrMuzzleTip.getWorldPosition(tipL);
      muzzleLocal = new THREE.Vector3(tipL.x + this.world.originX, tipL.y, tipL.z + this.world.originZ);
      const qBarW = new THREE.Quaternion();
      this.vehicleRig.btrGunGroup.getWorldQuaternion(qBarW);
      aimDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qBarW).normalize();
    } else {
      muzzleLocal = new THREE.Vector3(0, 2.48, (isKomodo30 || isKomodoMg) ? 0.20 : 0.92).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
      aimDir = this._getBarrelAimWorldDir();
    }

    const maxRange = 240;
    const obbBtr = this._raycastRemotePlayersOBB(muzzleLocal.x, muzzleLocal.y, muzzleLocal.z, aimDir.x, aimDir.y, aimDir.z, maxRange);
    const limBtr = obbBtr ? obbBtr.t : maxRange;
    let endPt = obbBtr ? new THREE.Vector3(obbBtr.x, obbBtr.y, obbBtr.z) : muzzleLocal.clone().addScaledVector(aimDir, maxRange);
    let hitRes = { hit: false };

    for (let s = 6; s < limBtr; s += 5) {
      const rx = muzzleLocal.x + aimDir.x * s;
      const ry = muzzleLocal.y + aimDir.y * s;
      const rz = muzzleLocal.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop
      if (this.aiEntities && this.aiEntities.hitAnimalAt) {
        const aHit = this.aiEntities.hitAnimalAt(rx, ry, rz, 3.6, 85, "gunfire");
        if (aHit) {
          endPt.set(rx, ry, rz);
          if (aHit.killed) this.ui.toast(`🎯 ${aHit.label} eliminated!`);
          break;
        }
      }
      let cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, !!(vs.upgrades && vs.upgrades.t72AcousticJammer)); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 14);
      if (!cHit.hit && this.skinwalker) this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network);
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.2, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 20, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      if (cHit.hit) {
        endPt.set(rx, ry, rz);
        hitRes = cHit;
        this.particles.emitCrashBurst(rx, ry, rz, 0.75, "rock", this.weather.weather);
        break;
      }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) {
        endPt.set(rx, gh, rz);
        this.particles.emitCrashBurst(rx, gh + 0.3, rz, 0.55, "rock", this.weather.weather);
        break;
      }
    }

    const btrCalAudio = isKomodo30 ? 30 : (isKomodoMg ? 12.7 : 14.5);
    this._spawnTracerBeam(muzzleLocal.x, muzzleLocal.y, muzzleLocal.z, endPt.x, endPt.y, endPt.z);
    this.audio.playKPVTShot(btrCalAudio);
    this.cameraShake = Math.max(this.cameraShake, 0.14);
    const mzBtr = this._getActiveMuzzleTransform();
    this.vehicle.applyRecoilTorque(mzBtr.dirWorld, 0.35, 0.18, 0.32);
    this.particles.emitMuzzleShockwave(mzBtr.tipWorld, mzBtr.dirWorld, this.world, this.weather.weather, 0.50, false);
    this.barrelSmokeTimer = Math.max(this.barrelSmokeTimer, 2.8);
    this.barrelHeat = Math.min(1.0, this.barrelHeat + (isKomodo30 ? 0.12 : 0.09));
    this.autoBarrelHeat = Math.min(1.0, this.autoBarrelHeat + (isKomodo30 ? 0.115 : (isKomodoMg ? 0.078 : 0.085)));

    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 25)) {
      this.clarksonFarm.triggerRage(this.ui, this.audio);
    }

    const btrCal = isKomodo30 ? 30 : (isKomodoMg ? 12.7 : 14.5);
    this.network.send({
      type: "weapon_fire", cal: btrCal,
      x0: +muzzleLocal.x.toFixed(1), y0: +muzzleLocal.y.toFixed(1), z0: +muzzleLocal.z.toFixed(1),
      ox: +muzzleLocal.x.toFixed(1), oy: +muzzleLocal.y.toFixed(1), oz: +muzzleLocal.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  _getEngineBayWorldPos(vehicle) {
    const zSign = vehicle.spec.rearEngine ? -0.46 : 0.52;
    return new THREE.Vector3(0, 0.5, vehicle.spec.bodyLen * zSign).applyQuaternion(vehicle.quat).add(vehicle.pos);
  }

  _isAtEngineBay(fx, fz, vehicle) {
    const rel = new THREE.Vector3(fx - vehicle.pos.x, 0, fz - vehicle.pos.z);
    rel.applyQuaternion(vehicle.quat.clone().invert());
    const halfL = vehicle.spec.bodyLen * 0.5;
    const halfW = vehicle.spec.bodyWidth * 0.5;
    if (Math.abs(rel.x) > halfW + 0.55) return false;
    if (vehicle.spec.rearEngine) {
      return rel.z < -(halfL - 0.55) && rel.z > -(halfL + 2.35);
    }
    return rel.z > (halfL - 0.55) && rel.z < (halfL + 2.35);
  }

  toggleFriend(peerId, callsign) {
    const label = String(callsign || peerId || "Driver").trim();
    const key = label.toLowerCase();
    if (this.friendsList[key]) {
      delete this.friendsList[key];
      this.ui.toast(`Removed ${label} from Friends.`);
    } else {
      this.friendsList[key] = { callsign: label, addedAt: Date.now() };
      this.ui.toast(`★ Added ${label} to your Friends list!`);
      if (peerId && this.network && this.network.mode !== "offline") {
        this.network.send({ type: "friend_notify", targetPeerId: peerId, senderCallsign: this.network.callsign });
      }
    }
    try { localStorage.setItem("kk_friends_v1", JSON.stringify(this.friendsList)); } catch (e) {}
    if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
  }

  sendCashToPeer(peerId, callsign, rawAmount) {
    const amt = Math.floor(Number(rawAmount) || 0);
    if (amt < 1000) {
      this.ui.toast("Minimum cash transfer is $1,000!", true);
      return;
    }
    if (this.money < amt) {
      this.ui.toast(`Not enough cash! You have $${Math.floor(this.money).toLocaleString()}.`, true);
      return;
    }
    if (!this.network || this.network.mode === "offline" || !this.network.mqtt || !this.network.mqtt.connected) {
      this.ui.toast("Relay offline — cannot wire cash right now!", true);
      return;
    }
    const txId = "TX-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 9999);
    this.money -= amt;
    if (this.audio) this.audio.playCash();
    this._saveProgress(true);
    const timer = setTimeout(() => {
      if (this._pendingCashTx && this._pendingCashTx.has(txId)) {
        this._pendingCashTx.delete(txId);
        this.money += amt;
        this._saveProgress(true);
        this.ui.toast(`Transfer to ${callsign || peerId} unconfirmed (older client or dropped relay) — refunded $${amt.toLocaleString()}!`, true);
        if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
      }
    }, 4500);
    this._pendingCashTx.set(txId, { amt, callsign: callsign || peerId, timer });
    this.network.send({
      type: "cash_transfer",
      txId,
      targetPeerId: peerId,
      senderCallsign: this.network.callsign,
      amount: amt
    });
    this.ui.toast(`Wiring $${amt.toLocaleString()} to ${callsign || peerId}...`);
    this.ui.addChatLine("BANK", `Wired $${amt.toLocaleString()} to ${callsign || peerId}.`, true);
    if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
  }

  toggleCruiseControl() {
    if (this.boats && this.boats.activeBoat) {
      const b = this.boats.activeBoat;
      if (b.cruiseOn || this.boatCruiseOn) {
        b.cruiseOn = false;
        this.boatCruiseOn = false;
        this.ui.toast("BOAT CRUISE CONTROL [7]: OFF");
      } else {
        if (b.anchored) {
          b.anchored = false;
          if (this.audio && this.audio.playAnchorClank) this.audio.playAnchorClank();
        }
        const cur = Math.round(b.speedKmh || 0);
        const defKmh = Math.round(b.spec.topSpeedKmh * 0.85);
        const tgt = Math.max(20, Math.min(Math.round(b.spec.topSpeedKmh * 1.15), cur >= 18 ? cur : defKmh));
        b.cruiseKmh = tgt;
        b.cruiseOn = true;
        this.boatCruiseKmh = tgt;
        this.boatCruiseOn = true;
        this.ui.toast(`⛵ SHIP AUTOPILOT CRUISE [7]: ON (${Math.round(tgt / 1.852)} kts / ${tgt} km/h) — Keeps sailing even if you leave the helm!`);
      }
      return;
    }
    if (this.onFoot || this.ridingWithPeerId || this.carriedByPeerId) return;
    if (this.carCruiseOn) {
      this.carCruiseOn = false;
      this.ui.toast("CAR CRUISE CONTROL [7]: OFF");
    } else {
      const cur = Math.round(this.vehicle.speedKmh || 0);
      this.carCruiseKmh = Math.max(20, Math.min(260, cur >= 18 ? cur : 60));
      this.carCruiseOn = true;
      this.ui.toast(`CAR CRUISE CONTROL [7]: ON (${this.carCruiseKmh} km/h) • [=]/[-] Adjust • [S]/[SPC] Cancel`);
    }
  }

  adjustCruiseSpeed(deltaKmh) {
    if (this.boats && this.boats.activeBoat && (this.boats.activeBoat.cruiseOn || this.boatCruiseOn)) {
      const b = this.boats.activeBoat;
      const maxKmh = Math.round(b.spec.topSpeedKmh * 1.15);
      const nextKmh = Math.max(15, Math.min(maxKmh, (b.cruiseKmh || this.boatCruiseKmh) + deltaKmh));
      b.cruiseKmh = nextKmh; this.boatCruiseKmh = nextKmh;
      this.ui.toast(`Boat Cruise Target: ${Math.round(nextKmh / 1.852)} kts (${nextKmh} km/h)`);
    } else if (!this.onFoot && this.carCruiseOn) {
      this.carCruiseKmh = Math.max(20, Math.min(260, this.carCruiseKmh + deltaKmh));
      this.ui.toast(`Car Cruise Target: ${this.carCruiseKmh} km/h`);
    }
  }

  // v18.1.1.1 ON-SCREEN BOAT DECK BUTTON HANDLER (Zero Keyboard Conflicts!)
  boatDeckAction(action) {
    if (!this.boats) return;
    if (action === "toggle_ignition") {
      this.toggleVehicleIgnition();
    } else if (action === "toggle_helm") {
      this.toggleShipHelm();
    } else if (action === "toggle_lock") {
      const targetB = this.boats.activeBoat || (this.walkingOnBoat && this.walkingOnBoat.boat);
      if (targetB) this.boats.toggleDeckLock(targetB, this.ui, this.audio);
    } else if (action === "step_deck") {
      if (this.boats.activeBoat) this.stepOntoBoatDeckOrDisembark();
      else this.handleContextInteract();
    } else if (action === "board_car") {
      if (this.walkingOnBoat) {
        this.walkingOnBoat = null;
        this.onFoot = false;
        if (this.localAvatar) this.localAvatar.visible = false;
        this.ui.toast(`Boarded ${this.vehicle.spec.name} on deck! Press [I] to start engine & auto-unlock!`);
      }
    }
  }

  togglePhotoMode() {
    this.photoMode = !this.photoMode;
    document.body.classList.toggle("photo-mode", this.photoMode);
    if (!this.photoMode) this.ui.toast("Photo Mode [F8]: OFF (HUD Restored)");
  }

  captureScreenshot() {
    this.pendingScreenshot = true;
    this.audio.playCameraShutter();
  }

  toggleTurretFreeze() {
    this.turretFrozen = !this.turretFrozen;
    this.audio.playWrench();
    this.ui.toast(this.turretFrozen
      ? "TURRET FROZEN [MMB]! Orbit & zoom camera freely for screenshots — press [0] again to unlock."
      : "Turret Tracking: UNLOCKED!");
  }

  toggleRemoteDust() {
    this.remoteDustEnabled = !this.remoteDustEnabled;
    this.ui.renderEnvControls();
    this.ui.toast("Other Players' Mud/Dust Particles: " + (this.remoteDustEnabled ? "ENABLED" : "DISABLED"));
  }

  toggleStowUpgrade(uid) {
    const vs = this.vehicle.vState;
    if (!vs.upgrades || !vs.upgrades[uid]) return;
    if (!vs.stowedUpgrades) vs.stowedUpgrades = {};
    vs.stowedUpgrades[uid] = !vs.stowedUpgrades[uid];
    this.vehicleRig.applyUpgrades(vs);
    this.audio.playWrench();
    this._saveProgress();
    if (this.ui.activeModal === "garage") this.ui.renderGarage();
    this.ui.toast(vs.stowedUpgrades[uid] ? `${KK.UPGRADES[uid].name}: REMOVED / STOWED (Free to remount anytime!)` : `${KK.UPGRADES[uid].name}: MOUNTED!`);
  }

  toggleActiveSnorkel() {
    const vs = this.vehicle.vState;
    const key = (vs.vehicleId === "t72" && vs.upgrades.t72Snorkel) ? "t72Snorkel" : (vs.upgrades.snorkel ? "snorkel" : null);
    if (!key) { this.ui.toast("You haven't bought a Snorkel for this vehicle yet!", true); return; }
    this.toggleStowUpgrade(key);
  }

  // BM-21 "GRAD" KATYUSHA 122mm BALLISTIC ROCKET SYSTEM (Permanent Terrain Deformation Craters!)
  triggerBm21Fire() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "bm21") return;
    if ((vs.bm21Rockets || 0) <= 0) {
      this.ui.toast("BM-21 GRAD EMPTY (0/40)! Resupply at any Town Garage or Hammond's Mesa ($1,800)!", true); return;
    }
    if (vs.bm21FireMode === "salvo") {
      if (this.gradSalvoLeft <= 0) {
        this.gradSalvoLeft = Math.min(10, vs.bm21Rockets);
        this.gradSalvoCd = 0;
        this.ui.toast(`KATYUSHA SALVO AWAY!! (${this.gradSalvoLeft}x 122mm Rockets Rippling!)`);
      }
    } else {
      this.launchSingleBm21Rocket();
    }
  }

  _spawnBallisticRocket(x, y, z, vx, vy, vz, isOwner = true, shooterPeerId = null) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 1.85, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd166 })
    );
    body.rotation.x = Math.PI / 2; grp.add(body);
    const plume = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.45, 6),
      new THREE.MeshBasicMaterial({ color: 0xff5a1f, transparent: true, opacity: 0.92 })
    );
    plume.rotation.x = -Math.PI / 2; plume.position.z = -1.45; grp.add(plume);
    this.scene.add(grp);
    this.rockets.push({ gx: x, gy: y, gz: z, ox: x, oy: y, oz: z, vx, vy, vz, life: 8.5, isOwner, shooterPeerId, mesh: grp });
  }

  launchSingleBm21Rocket() {
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "bm21" || this.gradFireCd > 0) return;
    if ((vs.bm21Rockets || 0) <= 0) { this.gradSalvoLeft = 0; return; }
    vs.bm21Rockets--;
    this.gradFireCd = 0.24;
    this.gradFlashTimer = 0.14;

    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
    const baseYaw = Math.atan2(fwd.x, fwd.z) + this.btrTurretYaw;
    const pitch = Math.max(0.04, Math.min(0.76, this.btrAimPitch + (this.mouseAimHeld ? 0 : 0.18)));
    // Slight artillery dispersion for authentic Katyusha saturation barrage!
    const spreadY = (Math.random() - 0.5) * 0.055;
    const spreadP = (Math.random() - 0.5) * 0.04;
    const spd = 112;
    const vx = Math.sin(baseYaw + spreadY) * Math.cos(pitch + spreadP) * spd;
    const vy = Math.sin(pitch + spreadP) * spd;
    const vz = Math.cos(baseYaw + spreadY) * Math.cos(pitch + spreadP) * spd;

    const orig = new THREE.Vector3((Math.random() - 0.5) * 1.4, 2.55, -1.85).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
    this._spawnBallisticRocket(orig.x, orig.y, orig.z, vx, vy, vz, true);
    this.audio.playKatyushaRocket();
    this.cameraShake = Math.max(this.cameraShake, 0.24);
    const rkAimDir = new THREE.Vector3(vx, vy, vz).normalize();
    this.vehicle.applyRecoilTorque(rkAimDir, 0.55, 0.36, 0.58);
    const backVentG = orig.clone().addScaledVector(rkAimDir, -2.4);
    this.particles.emitMuzzleShockwave(backVentG, rkAimDir, this.world, this.weather.weather, 1.10, true);
    this.barrelSmokeTimer = Math.max(this.barrelSmokeTimer, 5.5);
    this.barrelHeat = Math.min(1.0, this.barrelHeat + 0.22);

    this.network.send({
      type: "rocket_fire",
      x: +orig.x.toFixed(1), y: +orig.y.toFixed(1), z: +orig.z.toFixed(1),
      vx: +vx.toFixed(1), vy: +vy.toFixed(1), vz: +vz.toFixed(1)
    });
  }

  // ZSU-23-4 "SHILKA" QUAD-23mm CRYPTID SHREDDER!
  fireShilka23mm() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "shilka" || this.shilkaFireCd > 0) return;
    if ((vs.shilkaAmmo || 0) <= 0) {
      this.ui.toast("ZSU-23-4 SHILKA OUT OF 23mm AMMO! Resupply at any Town Garage ($1,800)!", true); return;
    }
    this.shilkaFireCd = 0.085; // Blistering ~12 rounds/sec alternating quad autocannon!
    this.shilkaFlashTimer = 0.075;
    this.shilkaActiveBarrel = (this.shilkaActiveBarrel + 1) % 4;
    vs.shilkaAmmo--;

    let muzzleG;
    if (this.vehicleRig && this.vehicleRig.shilkaMuzzleTips && this.vehicleRig.shilkaMuzzleTips[this.shilkaActiveBarrel]) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const tipW = new THREE.Vector3();
      this.vehicleRig.shilkaMuzzleTips[this.shilkaActiveBarrel].getWorldPosition(tipW);
      muzzleG = new THREE.Vector3(tipW.x + this.world.originX, tipW.y, tipW.z + this.world.originZ);
    } else {
      const bOff = [[-0.34, 0.12], [0.34, 0.12], [-0.34, -0.12], [0.34, -0.12]][this.shilkaActiveBarrel];
      muzzleG = new THREE.Vector3(bOff[0], 1.92 + bOff[1], 3.80).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
    }
    let aimDir;
    if (this.vehicleRig && this.vehicleRig.shilkaGunPitch) {
      this.vehicleRig.root.updateMatrixWorld(true);
      const qShW = new THREE.Quaternion();
      this.vehicleRig.shilkaGunPitch.getWorldQuaternion(qShW);
      aimDir = new THREE.Vector3(0, 0, 1).applyQuaternion(qShW).normalize();
    } else {
      aimDir = this._getBarrelAimWorldDir();
    }
    aimDir.x += (Math.random() - 0.5) * 0.016;
    aimDir.y += (Math.random() - 0.5) * 0.016;
    aimDir.z += (Math.random() - 0.5) * 0.016;
    aimDir.normalize();

    const obbSh = this._raycastRemotePlayersOBB(muzzleG.x, muzzleG.y, muzzleG.z, aimDir.x, aimDir.y, aimDir.z, 300);
    const limSh = obbSh ? obbSh.t : 300;
    let endPt = obbSh ? new THREE.Vector3(obbSh.x, obbSh.y, obbSh.z) : muzzleG.clone().addScaledVector(aimDir, 300);
    let hitRes = { hit: false };
    for (let s = 6; s < limSh; s += 5) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      // Exact Ray-vs-OBB already capped loop
      let cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, true, 23); if (!cHit.hit) cHit = this._hitOceanCryptids(rx, ry, rz, 18);
      if (!cHit.hit && this.skinwalker) this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network);
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.2, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 20, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      if (cHit.hit) { endPt.set(rx, ry, rz); hitRes = cHit; this.particles.emitCrashBurst(rx, ry, rz, 0.85, "rock", this.weather.weather); break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) { endPt.set(rx, gh, rz); this.particles.emitCrashBurst(rx, gh + 0.25, rz, 0.55, "rock", this.weather.weather); break; }
    }

    this._spawnTracerBeam(muzzleG.x, muzzleG.y, muzzleG.z, endPt.x, endPt.y, endPt.z, 0xffd166, 0.068);
    this.audio.playShilka23mm();
    this.cameraShake = Math.max(this.cameraShake, 0.08);
    const mzSh = this._getActiveMuzzleTransform();
    this.vehicle.applyRecoilTorque(mzSh.dirWorld, 0.20, 0.12, 0.22);
    if (this.shilkaActiveBarrel % 2 === 0) {
      this.particles.emitMuzzleShockwave(mzSh.tipWorld, mzSh.dirWorld, this.world, this.weather.weather, 0.38, false);
    }
    this.barrelSmokeTimer = Math.max(this.barrelSmokeTimer, 3.4);
    this.barrelHeat = Math.min(1.0, this.barrelHeat + 0.055);
    this.autoBarrelHeat = Math.min(1.0, this.autoBarrelHeat + 0.048);
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 25)) this.clarksonFarm.triggerRage(this.ui, this.audio);

    this.network.send({
      type: "weapon_fire", cal: 23,
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
      ox: +muzzleG.x.toFixed(1), oy: +muzzleG.y.toFixed(1), oz: +muzzleG.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  clearParticlesNow() {
    this.particles.clearAll();
    this.ui.toast("Purged all dirt & dust particles from memory!");
    if (this.ui.activeModal === "env") this.ui.renderEnvControls();
  }

  emergencyTowNearestTown() {
    let best = KK.TOWNS[0], bestD = 9999999;
    for (const tw of KK.TOWNS) { const d = Math.hypot(tw.x - this.vehicle.pos.x, tw.z - this.vehicle.pos.z); if (d < bestD) { bestD = d; best = tw; } }
    this.money = Math.max(0, this.money - 350);
    const ty = this.world.getTerrainInfo(best.garageX, best.garageZ, true).height;
    if (this.boats) this.boats.activeBoat = null;
    this.walkingOnBoat = null;
    this.vehicle.pos.set(best.garageX, ty + 1.5, best.garageZ); this.vehicle.vel.set(0, 0, 0); this.vehicle.angVel.set(0, 0, 0); this.vehicle.quat.identity();
    this.onFoot = false; this.localAvatar.visible = false; this.ui.closeModal(); this.ui.toast("Towed to " + best.name + " Garage (-$350)!");
  }

  teleportToFriend() {
    const first = this.network.remotePlayers.values().next().value;
    if (!first) { this.ui.toast("No LAN friends currently online!", true); return; }
    const ty = this.world.getTerrainInfo(first.gx + 6, first.gz + 6, true).height;
    this.vehicle.pos.set(first.gx + 6, ty + 1.8, first.gz + 6); this.vehicle.vel.set(0, 0, 0); this.vehicle.angVel.set(0, 0, 0);
    this.onFoot = false; this.localAvatar.visible = false; this.ui.closeModal(); this.ui.toast("Teleported next to " + first.callsign + "!");
  }

  _isPosInOpenSea(gx, gz) {
    const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
    if (this.world && this.world.getBaseHeight) {
      return this.world.getBaseHeight(gx, gz) < seaL - 1.2;
    }
    if (this.oceanCryptids && this.oceanCryptids._isOpenOcean) {
      return this.oceanCryptids._isOpenOcean(gx, gz, 120);
    }
    return this.world.getTerrainInfo(gx, gz, false).height < seaL - 2.0;
  }

  triggerTestHurricane(cat = 5) {
    if (this.audio) this.audio.init();
    const catNum = Math.max(1, Math.min(5, Math.round(Number(cat) || 5)));
    const ab = this.boats ? this.boats.activeBoat : null;
    const px = ab ? ab.gx : (this.onFoot ? this.playerFoot.x : this.vehicle.pos.x);
    const pz = ab ? ab.gz : (this.onFoot ? this.playerFoot.z : this.vehicle.pos.z);

    // Strictly prohibit hurricanes on land!
    if (!this._isPosInOpenSea(px, pz)) {
      if (this.ui) this.ui.toast("❌ Failed to summon hurricane — hurricanes only form over open ocean!", true);
      return;
    }

    if (this.hazards && this.hazards.spawnHurricaneNear) {
      const h = this.hazards.spawnHurricaneNear(px, pz, catNum, this.ui, this.audio, this.network);
      if (!h) return;
    } else if (this.ui) {
      this.ui.toast(`🌀 Category ${catNum} Hurricane weather activated!`, true);
    }
    if (this.weather && this.weather.setEnvironment) {
      this.weather.setEnvironment(this.weather.timeOfDay, "hurricane", this.weather.timeScale);
      if (this.network && this.network.isHost) {
        this.network.send({ type: "env_control", timeOfDay: this.weather.timeOfDay, weather: "hurricane", timeScale: this.weather.timeScale });
      }
    }
    if (this.audio && this.audio.playSeaDreadPulse) {
      this.audio.playSeaDreadPulse(0.9, "hurricane");
    }
    if (this.ui && this.ui.activeModal === "env") this.ui.closeModal();
  }

  triggerTestOceanCryptid(kind = "kraken") {
    if (this.audio) this.audio.init();
    const k = String(kind || "kraken").toLowerCase();
    const labels = { kraken: "THE BLOOP (Abyssal Kraken)", megalodon: "EL GRAN MAJA (34m Megalodon)", yamato: "POSSESSED YAMATO (Ghost Battleship)" };
    const label = labels[k] || k.toUpperCase();

    const ab = this.boats ? this.boats.activeBoat : null;
    const px = ab ? ab.gx : (this.onFoot ? this.playerFoot.x : this.vehicle.pos.x);
    const pz = ab ? ab.gz : (this.onFoot ? this.playerFoot.z : this.vehicle.pos.z);
    const atSea = this._isPosInOpenSea(px, pz);

    // Never teleport player to a ship — strictly require being out at open sea!
    if (!atSea) {
      if (this.ui) this.ui.toast(`❌ Failed to summon ${label} — you must be out in the open sea!`, true);
      return;
    }

    if (this.oceanCryptids && this.oceanCryptids.forceSpawnNear) {
      this.oceanCryptids.forceSpawnNear(k, px, pz, this.audio, this.ui);
    } else if (this.ui) {
      this.ui.toast(`Ocean cryptid manager unavailable for ${label}.`, true);
    }
    if (this.audio && this.audio.playSeaDreadPulse) {
      this.audio.playSeaDreadPulse(0.85, k === "kraken" ? "bloop" : k);
    }
    if (this.ui && this.ui.activeModal === "env") this.ui.closeModal();
  }

  // ==========================================================================
  // QUICK-WARP HELPERS & SURREAL WHOLESOME 200+ KM/H "GHOST SELF" MEGA-BRIDGE EASTER EGG!
  // ==========================================================================
  _prepareVehicleForWarp(gx, gy, gz, yaw, initSpeedMs = 0) {
    if (this.boats && this.boats.activeBoat) this.boats.activeBoat = null;
    this.walkingOnBoat = null;
    this.remoteBoatMount = null;
    this.ridingWithPeerId = null;
    this.carriedByPeerId = null;
    this.onFoot = false;
    if (this.localAvatar) this.localAvatar.visible = false;
    this.boatCruiseOn = false;
    this.carCruiseOn = false;
    this.timedWork = null;

    const vs = this.vehicle.vState;
    this.vehicle.hydrolocked = false;
    this.vehicle.ignitionOn = true;
    this.vehicle.engineRunning = true;
    if (vs && (vs.fuel || 0) < 20) vs.fuel = Math.max(20, (this.vehicle.spec.fuelCapacity || 80) * 0.5);

    this.world.updateChunks(gx, gz, true);
    if (this.world.updateMegaBridgeStream) this.world.updateMegaBridgeStream(gx, gz);
    this.vehicle.pos.set(gx, gy, gz);
    this.vehicle.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.vehicle.angVel.set(0, 0, 0);
    this.vehicle.vel.set(Math.sin(yaw) * initSpeedMs, 0, Math.cos(yaw) * initSpeedMs);
    this.vehicle.speedKmh = Math.abs(initSpeedMs) * 3.6;
    if (initSpeedMs > 20) {
      this.vehicle.gear = Math.max(4, this.vehicle.gear || 4);
      this.vehicle.rpm = Math.max(3600, this.vehicle.rpm || 4200);
    }
    this.camOrbitYaw = 0;
    this.camOrbitPitch = 0.20;
    if (this.ui && this.ui.activeModal) this.ui.closeModal();
  }

  triggerTestMegaBridgeGhost() {
    if (this.audio) this.audio.init();
    const mbDef = (this.world && this.world.megaBridge) || KK.MEGA_BRIDGE;
    if (!mbDef) {
      if (this.ui) this.ui.toast("6-Lane Savanna Mega-Bridge is not available in this build.", true);
      return;
    }
    const dx = (mbDef.endX - mbDef.startX);
    const dz = (mbDef.endZ - mbDef.startZ);
    const totalLen = mbDef.totalLen || Math.hypot(dx, dz) || 1;
    const dirX = mbDef.dirX !== undefined ? mbDef.dirX : (dx / totalLen);
    const dirZ = mbDef.dirZ !== undefined ? mbDef.dirZ : (dz / totalLen);
    const rightX = mbDef.rightX !== undefined ? mbDef.rightX : (-dirZ);
    const rightZ = mbDef.rightZ !== undefined ? mbDef.rightZ : dirX;

    const along = totalLen * 0.35;
    const laneLat = 5.5;
    const wx = mbDef.startX + dirX * along + rightX * laneLat;
    const wz = mbDef.startZ + dirZ * along + rightZ * laneLat;
    const yaw = Math.atan2(dirX, dirZ);

    this.world.updateChunks(wx, wz, true);
    if (this.world.updateMegaBridgeStream) this.world.updateMegaBridgeStream(wx, wz);
    const mbInfo = (this.world.getMegaBridgeInfo) ? this.world.getMegaBridgeInfo(wx, wz) : null;
    const deckY = (mbInfo && mbInfo.deckY !== undefined) ? mbInfo.deckY : ((mbDef.deckY !== undefined ? mbDef.deckY : ((KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32) + 16.0)));

    this._prepareVehicleForWarp(wx, deckY + 0.95, wz, yaw, 212 / 3.6);
    this.carCruiseOn = true;
    this.carCruiseKmh = 215;

    if (this._megaBridgeGhost) this._disposeMegaBridgeGhost();
    this._megaBridgeGhostCooldown = 0;

    const liveMb = (this.world.getMegaBridgeInfo && this.world.getMegaBridgeInfo(wx, wz)) || mbInfo || {
      onDeck: true, onApproach: false, deckY, alongDist: along, totalLen, latOffset: laneLat, halfWidth: 16,
      dirX, dirZ, rightX, rightZ, startX: mbDef.startX, startZ: mbDef.startZ, endX: mbDef.endX, endZ: mbDef.endZ,
      midX: mbDef.midX, midZ: mbDef.midZ, yaw
    };
    this._startMegaBridgeGhost(liveMb, true);
    if (this.ui) this.ui.toast("🌉 6-Lane Savanna Mega-Bridge @ 212 km/h — check your mirrors! ✨");
  }

  warpToZolotoyCity() {
    if (this.audio) this.audio.init();
    const zc = KK.ZOLOTOY_CITY || { cx: -68000, cz: 61000, blockPitch: 120 };
    const gx = zc.cx;
    const gz = zc.cz - 135;
    this.world.updateChunks(gx, gz, true);
    const ty = this.world.getTerrainInfo(gx, gz, true).height;
    this._prepareVehicleForWarp(gx, ty + 1.15, gz, 0, 0);
    if (this.ui) this.ui.toast("🏙 Warped to Zolotoy City Metropolis — Monument Plaza & Tram Loop ahead!");
  }

  warpToRaceTrack() {
    if (this.audio) this.audio.init();
    const zones = KK.SMOOTH_TARMAC_ZONES || [];
    const tz = zones.find((z) => z.isGpCircuit) || zones[0];
    let gx = -62099, gz = 63132, yaw = Math.PI * 0.5;
    if (tz) {
      if (tz.startX !== undefined && tz.startZ !== undefined) {
        gx = tz.startX; gz = tz.startZ;
        yaw = tz.startYaw !== undefined ? tz.startYaw : (-tz.yaw + Math.PI * 0.5);
      } else {
        const c = Math.cos(tz.yaw || 0), s = Math.sin(tz.yaw || 0);
        const lxG = tz.isGpCircuit ? -240 : (tz.rx || 0);
        const lzG = tz.isGpCircuit ? -500 : 0;
        gx = tz.cx + lxG * c + lzG * s;
        gz = tz.cz - lxG * s + lzG * c;
        // Face down the main pit straight along +lx
        yaw = Math.atan2(c, -s);
      }
    }
    this.world.updateChunks(gx, gz, true);
    const ty = this.world.getTerrainInfo(gx, gz, true).height;
    this._prepareVehicleForWarp(gx, ty + 1.15, gz, yaw, 0);
    this.gpLapStartMs = 0;
    this.gpInGate = false;
    if (this.ui) this.ui.toast(`🏁 Warped to ${tz ? tz.name : "Krasny-Ring GP"} Start/Finish Grid!`);
  }

  _startMegaBridgeGhost(mb, forcedTest = false) {
    if (!mb || !this.vehicle || !KK.VehicleBuilder) return;
    if (this._megaBridgeGhost) this._disposeMegaBridgeGhost();

    // Clone the player's EXACT active vehicle!
    const cloneRig = KK.VehicleBuilder.buildVehicle(this.activeVehicleId, this.vehicle.vState, false);
    if (cloneRig.chassis) {
      cloneRig.chassis.position.y = ((this.vehicle.vState && this.vehicle.vState.tuning && this.vehicle.vState.tuning.rideHeight) || 0) - 0.34;
    }
    if (cloneRig.remoteHeadLight) cloneRig.remoteHeadLight.visible = false;
    const ghostMats = [];
    const ghostGeos = [];
    let meshIdx = 0;
    cloneRig.root.traverse((obj) => {
      if (obj.isLight) obj.visible = false;
      if (obj.isMesh) {
        meshIdx++;
        obj.castShadow = false;
        obj.receiveShadow = false;
        const tTint = (meshIdx % 5) / 4;
        // Iridescent cyan-to-warm-gold ethereal glass/aura shader tint
        const baseCol = new THREE.Color(0x3cf5ff).lerp(new THREE.Color(0xffd26a), tTint * 0.65);
        const emCol = new THREE.Color(0x28e8ff).lerp(new THREE.Color(0xffb84d), tTint * 0.72);
        const gMat = new THREE.MeshStandardMaterial({
          color: baseCol,
          emissive: emCol,
          emissiveIntensity: 0.92,
          roughness: 0.16,
          metalness: 0.35,
          transparent: true,
          opacity: 0.0,
          depthWrite: false
        });
        obj.material = gMat;
        ghostMats.push(gMat);
      }
    });

    // Twin golden-white headlight halos + forward soft light beams (for Stage 2 Double High-Beam Flash!)
    const spec = this.vehicle.spec || { bodyWidth: 2.0, bodyLen: 4.6, bodyHeight: 1.8 };
    const halfW = (spec.bodyWidth || 2.0) * 0.36;
    const frontZ = (spec.bodyLen || 4.6) * 0.50;
    const rearZ = -(spec.bodyLen || 4.6) * 0.50;
    const lightY = Math.min(1.25, (spec.bodyHeight || 1.8) * 0.48);

    const haloGeo = new THREE.SphereGeometry(0.36, 12, 10);
    const beamGeo = new THREE.ConeGeometry(1.65, 11.5, 12, 1, true);
    beamGeo.translate(0, -5.75, 0);
    beamGeo.rotateX(-Math.PI * 0.5);
    ghostGeos.push(haloGeo, beamGeo);

    const haloMeshes = [];
    const haloMats = [];
    const beamMeshes = [];
    const beamMats = [];
    for (const sx of [-halfW, halfW]) {
      const hMat = new THREE.MeshBasicMaterial({
        color: 0xfff5d6, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const hMesh = new THREE.Mesh(haloGeo, hMat);
      hMesh.position.set(sx, lightY, frontZ + 0.08);
      cloneRig.root.add(hMesh);
      haloMeshes.push(hMesh); haloMats.push(hMat);

      const bMat = new THREE.MeshBasicMaterial({
        color: 0xffe49e, transparent: true, opacity: 0.0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
      const bMesh = new THREE.Mesh(beamGeo, bMat);
      bMesh.position.set(sx, lightY, frontZ + 0.14);
      cloneRig.root.add(bMesh);
      beamMeshes.push(bMesh); beamMats.push(bMat);
    }

    // Twin luminous starlight aurora ribbon trails behind taillights!
    const ribbonSamples = 28;
    const makeRibbon = () => {
      const posArr = new Float32Array(ribbonSamples * 2 * 3);
      const colArr = new Float32Array(ribbonSamples * 2 * 3);
      const idxArr = [];
      for (let i = 0; i < ribbonSamples - 1; i++) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idxArr.push(a, b, c, b, d, c);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(colArr, 3));
      geo.setIndex(idxArr);
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.72,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      ghostGeos.push(geo);
      return { mesh, geo, mat, posArr, colArr, pts: [] };
    };
    const ribbonL = makeRibbon();
    const ribbonR = makeRibbon();

    this.scene.add(cloneRig.root);

    // Determine player travel direction along the Mega-Bridge (+1 toward Savanna, -1 toward Mainland)
    const vehFwd = this._tmpVehFwd.set(0, 0, 1).applyQuaternion(this.vehicle.quat);
    const dotDir = vehFwd.x * mb.dirX + vehFwd.z * mb.dirZ;
    const travelSign = dotDir >= 0 ? 1 : -1;

    // Pick adjacent open lane within the 6 lanes (±3.8m, cleanly avoiding center median |lat|<1.9 and guardrails!)
    const curLat = mb.latOffset || 0;
    const halfWBridge = (mb.halfWidth || 16) - 2.6;
    let targetLat;
    if (curLat >= 0) {
      targetLat = (curLat + 3.8 <= halfWBridge) ? (curLat + 3.8) : Math.max(2.6, curLat - 3.8);
      if (Math.abs(targetLat - curLat) < 2.4) targetLat = curLat - 3.8;
    } else {
      targetLat = (curLat - 3.8 >= -halfWBridge) ? (curLat - 3.8) : Math.min(-2.6, curLat + 3.8);
      if (Math.abs(targetLat - curLat) < 2.4) targetLat = curLat + 3.8;
    }
    if (Math.abs(targetLat) < 1.9) targetLat = (targetLat >= 0 ? 3.8 : -3.8);
    targetLat = Math.max(-halfWBridge, Math.min(halfWBridge, targetLat));

    this._megaBridgeGhost = {
      rig: cloneRig,
      ghostMats,
      ghostGeos,
      haloMeshes,
      haloMats,
      beamMeshes,
      beamMats,
      ribbonL,
      ribbonR,
      tailHalfW: halfW,
      tailY: lightY,
      tailZ: rearZ,
      travelSign,
      stage: 1,
      stageTimer: 0,
      totalTimer: 0,
      alongOffset: -65.0,
      latOffset: curLat,
      overtakeTargetLat: targetLat,
      ascendY: 0,
      opacity: 0.0,
      flash1Done: false,
      flash2Done: false,
      echoShown: false,
      overtakeSfxDone: false,
      fadingOut: false,
      forcedTest: !!forcedTest,
      wheelSpin: 0,
      stardustCd: 0
    };

    if (this.audio && this.audio.playGhostEasterEgg) {
      this.audio.playGhostEasterEgg("appear");
    }
  }

  _updateGhostRibbon(ribbon, gx, gy, gz, opacityScale) {
    const N = 28;
    ribbon.pts.unshift({ x: gx, y: gy, z: gz });
    if (ribbon.pts.length > N) ribbon.pts.pop();
    const ox = this.world.originX, oz = this.world.originZ;
    const count = ribbon.pts.length;
    const halfH = 0.24;
    for (let i = 0; i < N; i++) {
      const pt = ribbon.pts[Math.min(i, count - 1)] || { x: gx, y: gy, z: gz };
      const frac = 1.0 - (i / Math.max(1, N - 1));
      const wH = halfH * (0.35 + frac * 0.85);
      const lx = pt.x - ox, ly = pt.y, lz = pt.z - oz;
      const vi = i * 6;
      ribbon.posArr[vi]     = lx; ribbon.posArr[vi + 1] = ly + wH; ribbon.posArr[vi + 2] = lz;
      ribbon.posArr[vi + 3] = lx; ribbon.posArr[vi + 4] = ly - wH; ribbon.posArr[vi + 5] = lz;

      // Blend warm golden starlight at taillight -> shimmering cyan aurora -> transparent fade
      const fade = frac * frac * opacityScale;
      const r = (1.0 * frac + 0.22 * (1 - frac)) * fade;
      const g = (0.86 * frac + 0.96 * (1 - frac)) * fade;
      const b = (0.48 * frac + 1.0 * (1 - frac)) * fade;
      ribbon.colArr[vi]     = r; ribbon.colArr[vi + 1] = g; ribbon.colArr[vi + 2] = b;
      ribbon.colArr[vi + 3] = r; ribbon.colArr[vi + 4] = g; ribbon.colArr[vi + 5] = b;
    }
    ribbon.geo.attributes.position.needsUpdate = true;
    ribbon.geo.attributes.color.needsUpdate = true;
  }

  _disposeMegaBridgeGhost() {
    const g = this._megaBridgeGhost;
    if (!g) return;
    if (g.rig && g.rig.root) {
      this.scene.remove(g.rig.root);
      const disposedGeos = new Set();
      g.rig.root.traverse((obj) => {
        if (obj.isMesh && obj.geometry && !disposedGeos.has(obj.geometry)) {
          obj.geometry.dispose();
          disposedGeos.add(obj.geometry);
        }
      });
    }
    if (g.ribbonL && g.ribbonL.mesh) { this.scene.remove(g.ribbonL.mesh); g.ribbonL.mat.dispose(); }
    if (g.ribbonR && g.ribbonR.mesh) { this.scene.remove(g.ribbonR.mesh); g.ribbonR.mat.dispose(); }
    for (const m of g.ghostMats) { if (m && m.dispose) m.dispose(); }
    for (const m of g.haloMats) { if (m && m.dispose) m.dispose(); }
    for (const m of g.beamMats) { if (m && m.dispose) m.dispose(); }
    for (const geo of g.ghostGeos) { if (geo && geo.dispose) geo.dispose(); }
    this._megaBridgeGhost = null;
  }

  _updateMegaBridgeGhost(dt) {
    if (this._megaBridgeGhostCooldown > 0) {
      this._megaBridgeGhostCooldown = Math.max(0, this._megaBridgeGhostCooldown - dt);
    }
    if (!this.world || !this.world.getMegaBridgeInfo || !this.vehicle) return;

    const inBoat = !!(this.boats && this.boats.activeBoat);
    const driving = !this.onFoot && !this.ridingWithPeerId && !this.carriedByPeerId && !inBoat;
    const mb = this.world.getMegaBridgeInfo(this.vehicle.pos.x, this.vehicle.pos.z);

    if (!this._megaBridgeGhost) {
      if (driving && mb && mb.onDeck && (this.vehicle.speedKmh || 0) >= 200 && this._megaBridgeGhostCooldown <= 0) {
        this._startMegaBridgeGhost(mb, false);
      }
      return;
    }

    const g = this._megaBridgeGhost;
    g.totalTimer += dt;
    g.stageTimer += dt;

    // Gracefully fade out if player leaves the bridge, gets out, or crashes below 90 km/h (55 km/h during 1-click test)
    const minSpd = g.forcedTest ? 55 : 90;
    if (!driving || !mb || (!mb.onDeck && !mb.onApproach) || ((this.vehicle.speedKmh || 0) < minSpd && g.stage < 3)) {
      g.fadingOut = true;
    }

    // Safe fallback reference so leaving the bridge while fading out NEVER throws on null `mb`!
    const mbRef = mb || g.mbRef || (this.world && this.world.megaBridge);
    if (!mbRef) {
      this._disposeMegaBridgeGhost();
      return;
    }
    if (mb) {
      g.mbRef = mb;
      g.lastAlong = mb.alongDist || 0;
      g.lastLat = mb.latOffset || 0;
    }
    const curLatOffset = mb ? (mb.latOffset || 0) : (g.lastLat || 0);
    const curAlongDist = mb ? (mb.alongDist || 0) : (g.lastAlong || 0);

    let flashBoost = 0.0;
    let steerVisualYaw = 0.0;
    let nosePitch = 0.0;
    const playerAlongSpd = Math.max(0, (this.vehicle.vel.x * mbRef.dirX + this.vehicle.vel.z * mbRef.dirZ) * g.travelSign);
    let ghostSpdMs = Math.max(55, playerAlongSpd);

    if (g.fadingOut) {
      g.opacity = Math.max(0, g.opacity - dt * 0.72);
      g.ascendY += dt * 3.2;
      g.alongOffset += 18 * dt;
      if (g.opacity <= 0.01) {
        this._disposeMegaBridgeGhost();
        this._megaBridgeGhostCooldown = 90.0;
        return;
      }
    } else if (g.stage === 1) {
      // STAGE 1 — MATERIALIZE & TAILGATE (~4.5s)
      g.opacity = Math.min(0.62, g.opacity + dt * 0.55);
      const tNorm = Math.min(1, g.stageTimer / 4.5);
      const eased = 1.0 - Math.pow(1.0 - tNorm, 2.4);
      g.alongOffset = -65.0 + (65.0 - 13.0) * eased;
      const weave = Math.sin(g.totalTimer * 2.1) * 0.45 * (1.0 - tNorm * 0.5);
      const targetLat = curLatOffset + weave;
      const prevLat = g.latOffset;
      g.latOffset += (targetLat - g.latOffset) * Math.min(1, dt * 4.5);
      steerVisualYaw = Math.max(-0.12, Math.min(0.12, (g.latOffset - prevLat) / Math.max(0.01, dt * 28)));

      if (g.stageTimer >= 4.5) {
        g.stage = 2;
        g.stageTimer = 0;
      }
    } else if (g.stage === 2) {
      // STAGE 2 — DOUBLE HIGH-BEAM FLASH (~1.8s: FLASH... pause... FLASH!)
      g.opacity = 0.62;
      g.alongOffset += (-12.5 - g.alongOffset) * Math.min(1, dt * 4.0);
      const prevLat = g.latOffset;
      g.latOffset += (curLatOffset - g.latOffset) * Math.min(1, dt * 5.0);
      steerVisualYaw = Math.max(-0.10, Math.min(0.10, (g.latOffset - prevLat) / Math.max(0.01, dt * 28)));

      if (g.stageTimer >= 0.15 && g.stageTimer <= 0.50) {
        flashBoost = Math.sin(((g.stageTimer - 0.15) / 0.35) * Math.PI);
        if (!g.flash1Done) {
          g.flash1Done = true;
          if (this.audio && this.audio.playGhostEasterEgg) this.audio.playGhostEasterEgg("flash");
        }
      } else if (g.stageTimer >= 0.90 && g.stageTimer <= 1.32) {
        flashBoost = Math.sin(((g.stageTimer - 0.90) / 0.42) * Math.PI) * 1.15;
        if (!g.flash2Done) {
          g.flash2Done = true;
          if (this.audio && this.audio.playGhostEasterEgg) this.audio.playGhostEasterEgg("flash");
        }
      }

      if (g.stageTimer >= 1.8) {
        g.stage = 3;
        g.stageTimer = 0;
        // Re-lock clean adjacent open lane right before overtaking
        const curL = curLatOffset;
        const hWB = (mbRef.halfWidth || 16) - 2.6;
        let tL = curL >= 0 ? (curL + 3.8 <= hWB ? curL + 3.8 : curL - 3.8) : (curL - 3.8 >= -hWB ? curL - 3.8 : curL + 3.8);
        if (Math.abs(tL) < 1.9) tL = (curL >= 0 ? Math.min(hWB, curL + 3.8) : Math.max(-hWB, curL - 3.8));
        g.overtakeTargetLat = Math.max(-hWB, Math.min(hWB, tL));
      }
    } else if (g.stage === 3) {
      // STAGE 3 — SURREAL WHOLESOME OVERTAKE (~6.2s)
      const prevLat = g.latOffset;
      g.latOffset += (g.overtakeTargetLat - g.latOffset) * Math.min(1, dt * 3.4);
      steerVisualYaw = Math.max(-0.18, Math.min(0.18, (g.latOffset - prevLat) / Math.max(0.01, dt * 24)));

      if (g.stageTimer >= 1.25 && !g.echoShown) {
        g.echoShown = true;
        const msg = this._ghostEchoMessages[this._megaBridgeGhostMsgIdx % this._ghostEchoMessages.length];
        this._megaBridgeGhostMsgIdx++;
        if (this.ui && this.ui.showSurrealEcho) {
          this.ui.showSurrealEcho(msg, "✨ ECHO // 200+ KM/H");
        } else if (this.ui) {
          this.ui.toast(`✨ ECHO // 200+ KM/H — ${msg}`);
        }
      }

      if (g.stageTimer < 1.35) {
        // Pull smoothly alongside the player
        const tPull = g.stageTimer / 1.35;
        g.alongOffset = -12.5 + 14.5 * (tPull * tPull * (3 - 2 * tPull));
      } else if (g.stageTimer < 2.30) {
        // Brief surreal heartbeat right beside your window!
        g.alongOffset += 2.6 * dt;
      } else {
        // Rocket past at +50% your speed (1.5x current speed, min 300 km/h!)
        ghostSpdMs = Math.max(300 / 3.6, ((this.vehicle.speedKmh || 200) / 3.6) * 1.5);
        const relSpd = Math.max(28.0, ghostSpdMs - playerAlongSpd);
        g.alongOffset += relSpd * dt;

        if (!g.overtakeSfxDone) {
          g.overtakeSfxDone = true;
          if (this.audio && this.audio.playGhostEasterEgg) this.audio.playGhostEasterEgg("overtake");
          // Joyful golden-cyan slipstream particle burst!
          if (this.particles) {
            for (let k = 0; k < 22; k++) {
              const isGold = (k % 2 === 0);
              this.particles.emitRGB(
                this.vehicle.pos.x + (Math.random() - 0.5) * 4.5,
                this.vehicle.pos.y + 0.6 + Math.random() * 1.8,
                this.vehicle.pos.z + (Math.random() - 0.5) * 4.5,
                (Math.random() - 0.5) * 8 + mbRef.dirX * g.travelSign * 14,
                1.8 + Math.random() * 4.2,
                (Math.random() - 0.5) * 8 + mbRef.dirZ * g.travelSign * 14,
                isGold ? 1.0 : 0.30, isGold ? 0.86 : 0.96, isGold ? 0.42 : 1.0,
                0.85 + Math.random() * 0.55, 0.6, 1.4
              );
            }
          }
        }

        // Gently ascend & dissolve into golden stardust over the ocean during final 2.0s!
        if (g.stageTimer > 4.2) {
          const fadeT = Math.min(1, (g.stageTimer - 4.2) / 2.0);
          g.ascendY += dt * (4.5 + fadeT * 10.5);
          nosePitch = -0.14 * fadeT;
          g.opacity = 0.62 * (1.0 - fadeT);
        }
      }

      if (g.stageTimer >= 6.2) {
        this._disposeMegaBridgeGhost();
        this._megaBridgeGhostCooldown = 90.0;
        return;
      }
    }

    // Position ghost cleanly on the 6-lane Mega-Bridge deck
    const targetAlong = curAlongDist + g.alongOffset * g.travelSign;
    const gx = mbRef.startX + mbRef.dirX * targetAlong + mbRef.rightX * g.latOffset;
    const gz = mbRef.startZ + mbRef.dirZ * targetAlong + mbRef.rightZ * g.latOffset;
    const baseDeckY = mbRef.deckY !== undefined ? mbRef.deckY : (this.vehicle.pos.y - 0.8);
    const rideOffY = Math.max(0.45, Math.min(1.6, this.vehicle.pos.y - baseDeckY));
    const gy = baseDeckY + rideOffY + g.ascendY;

    const bridgeYaw = Math.atan2(mbRef.dirX * g.travelSign, mbRef.dirZ * g.travelSign);
    this.world.toLocal(gx, gy, gz, g.rig.root.position);
    g.rig.root.rotation.set(nosePitch, bridgeYaw + steerVisualYaw * g.travelSign, -steerVisualYaw * 0.35, "YXZ");

    // Pulse iridescent ghost materials & headlight halos
    const shimmer = 0.82 + 0.22 * Math.sin(g.totalTimer * 4.5);
    const opNorm = Math.max(0, Math.min(1, g.opacity / 0.62));
    for (let i = 0; i < g.ghostMats.length; i++) {
      const m = g.ghostMats[i];
      m.opacity = g.opacity;
      m.emissiveIntensity = (0.85 + flashBoost * 0.75) * shimmer;
    }
    const haloScale = 1.0 + flashBoost * 2.4;
    for (let i = 0; i < g.haloMeshes.length; i++) {
      g.haloMeshes[i].scale.setScalar(haloScale);
      g.haloMats[i].opacity = Math.min(1.0, (0.58 + flashBoost * 0.42) * opNorm);
      g.beamMeshes[i].scale.set(1.0 + flashBoost * 1.4, 1.0 + flashBoost * 1.4, 1.0 + flashBoost * 1.6);
      g.beamMats[i].opacity = Math.min(0.85, (0.16 + flashBoost * 0.65) * opNorm);
    }

    // Spin cloned wheels smoothly without invoking smoke/dirt/thermal side-effects
    g.wheelSpin += (ghostSpdMs / 0.42) * dt;
    if (g.rig.wheelAssemblies) {
      for (let wi = 0; wi < g.rig.wheelAssemblies.length; wi++) {
        const wa = g.rig.wheelAssemblies[wi];
        if (wa.spinGroup) wa.spinGroup.rotation.x = g.wheelSpin;
        if (wa.steerPivot && wa.def && wa.def.steer) wa.steerPivot.rotation.y = steerVisualYaw * 0.55;
      }
    }

    // Update twin starlight aurora ribbon trails behind taillights
    const fwdX = Math.sin(bridgeYaw), fwdZ = Math.cos(bridgeYaw);
    const rgtX = Math.cos(bridgeYaw), rgtZ = -Math.sin(bridgeYaw);
    const tlX = gx + fwdX * g.tailZ - rgtX * g.tailHalfW;
    const tlZ = gz + fwdZ * g.tailZ - rgtZ * g.tailHalfW;
    const trX = gx + fwdX * g.tailZ + rgtX * g.tailHalfW;
    const trZ = gz + fwdZ * g.tailZ + rgtZ * g.tailHalfW;
    this._updateGhostRibbon(g.ribbonL, tlX, gy + g.tailY, tlZ, opNorm);
    this._updateGhostRibbon(g.ribbonR, trX, gy + g.tailY, trZ, opNorm);

    // Emit gentle golden-cyan stardust particles behind ghost!
    g.stardustCd -= dt;
    if (g.stardustCd <= 0 && this.particles) {
      g.stardustCd = g.stage === 3 ? 0.04 : 0.075;
      const isGold = Math.random() < 0.52;
      this.particles.emitRGB(
        gx + fwdX * (g.tailZ - 0.6) + (Math.random() - 0.5) * 1.8,
        gy + 0.5 + Math.random() * 0.9,
        gz + fwdZ * (g.tailZ - 0.6) + (Math.random() - 0.5) * 1.8,
        -fwdX * 3.5 + (Math.random() - 0.5) * 2.2,
        0.9 + Math.random() * 1.8,
        -fwdZ * 3.5 + (Math.random() - 0.5) * 2.2,
        isGold ? 1.0 : 0.32, isGold ? 0.88 : 0.96, isGold ? 0.44 : 1.0,
        0.72 + Math.random() * 0.45, 0.35, 1.5
      );
    }
  }

  _spawnRemoteVisuals(rp) {
    const fakeState = KK.createDefaultVehicleState(rp.vehicleId); fakeState.paintColor = rp.paintColor; if (rp.rimStyle) fakeState.rimStyle = rp.rimStyle;
    rp.rig = KK.VehicleBuilder.buildVehicle(rp.vehicleId, fakeState, false);
    const tag = KK.VehicleBuilder.createNameSprite(rp.callsign, "#00f5d4"); tag.position.set(0, 3.1, 0); rp.rig.root.add(tag);
    this.scene.add(rp.rig.root);
    rp.avatar = KK.VehicleBuilder.buildHumanAvatar(rp.callsign, 0x3a86ff); rp.avatar.visible = rp.onFoot; this.scene.add(rp.avatar);
  }

  _rebuildRemoteRig(rp) {
    if (rp.rig) this.scene.remove(rp.rig.root);
    const fakeState = KK.createDefaultVehicleState(rp.vehicleId); fakeState.paintColor = rp.paintColor; if (rp.rimStyle) fakeState.rimStyle = rp.rimStyle;
    rp.rig = KK.VehicleBuilder.buildVehicle(rp.vehicleId, fakeState, false);
    const tag = KK.VehicleBuilder.createNameSprite(rp.callsign, "#00f5d4"); tag.position.set(0, 3.1, 0); rp.rig.root.add(tag);
    this.scene.add(rp.rig.root);
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const activeBoatNow = this.boats ? this.boats.activeBoat : null;
    const modalOpen = !!this.ui.activeModal || !!(this.startMenu && this.startMenu.isOpen);
    const inBoatHelm = !!activeBoatNow;
    const localOwnBoatMount = this.boats ? this.boats.findLocalMountedBoat() : null;
    const isCarOnAnyBoat = !!(localOwnBoatMount || this.remoteBoatMount);
    this.xrayActive = (!modalOpen && !inBoatHelm && !!this.keys.KeyX);
    this._updateTimedWork(dt);
    if (this.coopBoostTimer > 0) this.coopBoostTimer = Math.max(0, this.coopBoostTimer - dt);

    // Windshield mud splatter & wiper clearing logic!
    if (!this.onFoot) {
      const dirtySurf = this.vehicle.wheels.some((w) => w.grounded && (w.surface === "mud" || w.surface === "bad_road" || w.waterDepth > 0.15));
      if (dirtySurf && this.vehicle.speedKmh > 14) {
        this.windshieldMud = Math.min(1.0, this.windshieldMud + dt * 0.045 * (this.vehicle.speedKmh / 45));
      }
      if (this.wipersOn) {
        this.windshieldMud = Math.max(0, this.windshieldMud - dt * 0.34);
      }
    }
    const driveInput = {
      throttle: (!this.onFoot && !modalOpen && !inBoatHelm && (this.keys.KeyW || this.keys.ArrowUp)) ? 1 : 0,
      brake: (!this.onFoot && !modalOpen && !inBoatHelm && (this.keys.KeyS || this.keys.ArrowDown)) ? 1 : 0,
      steer: (!this.onFoot && !modalOpen && !inBoatHelm && !(this.skinwalker && this.skinwalker.isGrabbing)) ? ((this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) - (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0)) : 0,
      handbrake: (!this.onFoot && !modalOpen && !inBoatHelm && !!this.keys.Space)
    };
    // v15.2.1 CAR CRUISE CONTROL [7]: Smooth proportional throttle, cancels cleanly on brake/handbrake!
    if (this.carCruiseOn) {
      if (this.onFoot || inBoatHelm || isCarOnAnyBoat || this.carriedByPeerId || driveInput.brake > 0.1 || driveInput.handbrake || !this.vehicle.engineRunning) {
        this.carCruiseOn = false;
      } else if (driveInput.throttle < 0.05) {
        const err = this.carCruiseKmh - (this.vehicle.speedKmh || 0);
        if (err > 0.5) driveInput.throttle = Math.max(0.10, Math.min(1.0, err * 0.075));
      }
    }
    if (this.vehicle.winch.active) { const shiftHeld = !!(this.keys.ShiftLeft || this.keys.ShiftRight); this.vehicle.winch.reeling = (!modalOpen && !inBoatHelm && this.keys.KeyT) ? (shiftHeld ? 1 : -1) : 0; }
    const horn = !this.onFoot && !modalOpen && !inBoatHelm && !!this.keys.KeyN;
    const boatHorn = inBoatHelm && !modalOpen && !!this.keys.KeyN;
    this.vehicle.hornActive = horn;
    const is140Horn = !!this.vehicle.spec.isSchreckensfurst;
    this.audio.setHorn(horn, this.vehicle.spec.id === "kamaz", is140Horn);
    if (this.audio.setNavalHorn) this.audio.setNavalHorn(boatHorn, activeBoatNow && (activeBoatNow.id === "zubr" || activeBoatNow.id === "serna"));
    if (horn && is140Horn && this.townNpcs && Math.random() < dt * 2.5) {
      this.townNpcs.triggerTownPanic(this.vehicle.pos.x, this.vehicle.pos.z, 75);
    }

    // If sitting inside a mounted car and the Shipmaster UNLOCKED the deck, pressing [W] rolls you cleanly off the ramp!
    if (isCarOnAnyBoat && !inBoatHelm && !this.onFoot && !modalOpen && driveInput.throttle > 0.5) {
      if (localOwnBoatMount && !localOwnBoatMount.boat.deckLocked) {
        this.boats.unmountLocalVehicle(localOwnBoatMount.boat, this.vehicle, this.ui, this.audio, true);
      } else if (this.remoteBoatMount) {
        const rb = this.boats.remoteBoats.get(this.remoteBoatMount.ownerPeerId);
        if (rb && !rb.deckLocked) {
          const fwdX = Math.sin(rb.yaw), fwdZ = Math.cos(rb.yaw);
          const dropX = rb.gx + fwdX * (rb.spec.len * 0.54 + 4.5);
          const dropZ = rb.gz + fwdZ * (rb.spec.len * 0.54 + 4.5);
          const tiD = this.world.getTerrainInfo(dropX, dropZ, false);
          this.vehicle.pos.set(dropX, Math.max(tiD.height, KK.SEA_LEVEL || -32) + 1.15, dropZ);
          this.vehicle.vel.set(fwdX * 5.0, 0, fwdZ * 5.0);
          this.remoteBoatMount = null;
          this.ui.toast(`Rolled off ${rb.spec.name} ramp!`);
        } else if (rb && rb.deckLocked && (!this._deckLockToastCd || this._deckLockToastCd <= 0)) {
          this._deckLockToastCd = 2.5;
          this.ui.toast("DECK LOCKED by Shipmaster! You can still aim/fire turrets or press [F] to walk the deck!", true);
        }
      }
    }
    if (this._deckLockToastCd > 0) this._deckLockToastCd -= dt;

    // v15.2 COMPLETE PHYSICS ISOLATION: Skip car physics when mounted on a boat deck OR carried on a trailer (Zero hydrolock & zero jitter!)
    if (!isCarOnAnyBoat && !this.carriedByPeerId) {
      this.vehicle.step(
        dt,
        (this.onFoot || this.ridingWithPeerId || inBoatHelm || this.timedWork) ? { throttle: 0, brake: 0, steer: 0, handbrake: true } : driveInput,
        this.world,
        this.weather.getGripModifier(),
        this.network.remotePlayers,
        this.weather.weather,
        { ice: this.cryptids.iceAuraStrength, quicksand: this.cryptids.quicksandDrag }
      );
    } else {
      this.vehicle.inWaterDepth = 0;
      this.vehicle.hydrolocked = false;
      this.vehicle.distanceMetersFrame = 0;
      this.vehicle.speedKmh = 0;
    }
    this.stats.distanceKm += this.vehicle.distanceMetersFrame / 1000.0;

    // Air-Time Stunt Cash Bonus for epic ramp & cliff jumps!
    const anyGrounded = this.vehicle.wheels.some((w) => w.grounded);
    if (!anyGrounded && this.vehicle.vel.length() > 8) {
      this.airTime += dt;
    } else if (anyGrounded) {
      if (this.airTime > 1.65) {
        const bonus = Math.min(320, Math.round(this.airTime * 75));
        this.money += bonus;
        this.audio.playCash();
        this.particles.emitCrashBurst(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, Math.min(1.5, this.airTime * 0.6), "gravel", this.weather.weather);
        this.ui.toast(`SICK AIR-TIME STUNT (${this.airTime.toFixed(1)}s)! +$${bonus}!`);
      }
      this.airTime = 0;
    }

    // Throttled zero-allocation 3D wheel dust / mud / sand / snow spray!
    this.particles.emitWheelSpray(this.vehicle.wheels, this.vehicle, this.weather.weather, dt);

    for (const ev of this.vehicle.consumeEvents()) {
      if (ev.kind === "toast") this.ui.toast(ev.data, true);
      else if (ev.kind === "tutorial_first_dmg") this._triggerTutorialHoodStep();
      else if (ev.kind === "impact") this.audio.playImpact(ev.data);
      else if (ev.kind === "crash_burst") {
        this.particles.emitCrashBurst(ev.data.x, ev.data.y, ev.data.z, ev.data.strength, ev.data.surface, this.weather.weather);
      }
      else if (ev.kind === "backfire") {
        this.audio.playBackfire();
        this.particles.emitBackfire(ev.data.pos.x, ev.data.pos.y, ev.data.pos.z, ev.data.backDir);
      }
      else if (ev.kind === "fence_break") {
        if (ev.data.isMetal) this.audio.playImpact(0.55); else this.audio.playWoodSnap();
        this.world.smashFence(ev.data.fenceId, ev.data.dirX, ev.data.dirZ);
        this.network.send({ type: "fence_break", fenceId: ev.data.fenceId, dirX: +ev.data.dirX.toFixed(2), dirZ: +ev.data.dirZ.toFixed(2) });
      }
      else if (ev.kind === "winch_pull_peer") {
        const d = ev.data;
        if (d && this._winchPullNetCd <= 0 && this.network && this.network.mode !== "offline") {
          this._winchPullNetCd = 0.08;
          this.network.send({
            type: "winch_pull",
            targetPeerId: d.targetPeerId,
            px: +d.px.toFixed(2), py: +d.py.toFixed(2), pz: +d.pz.toFixed(2),
            strength: +Math.min(6.5, (d.strength || 0.4) * 4.5).toFixed(2)
          });
        }
      } else if (ev.kind === "tree_break") {
        this.audio.playWoodSnap();
        this.world.knockDownTree(ev.data.treeId, ev.data.dirX, ev.data.dirZ);
        this.network.send({ type: "tree_break", treeId: ev.data.treeId, dirX: +ev.data.dirX.toFixed(2), dirZ: +ev.data.dirZ.toFixed(2) });
      }
      else if (ev.kind === "vehicle_ram") {
        this.network.send({
          type: "vehicle_ram",
          targetPeerId: ev.data.targetPeerId,
          callsign: this.network.callsign,
          dvx: ev.data.dvx, dvy: ev.data.dvy, dvz: ev.data.dvz, spin: ev.data.spin
        });
      }
      else if (ev.kind === "armor_ram") {
        const d = ev.data || {};
        const imp = Math.min(1.0, (d.impactMag || 8) / 14);
        if (this.audio) {
          this.audio.playImpact(Math.max(0.65, imp));
          if (this.audio.playArmorRicochet) this.audio.playArmorRicochet(0.45 + imp * 0.45);
        }
        this.cameraShake = Math.max(this.cameraShake, 0.24 + imp * 0.55);
        for (let s = 0; s < 10; s++) {
          this.particles.emitRGB(
            this.vehicle.pos.x + (Math.random() - 0.5) * 2.2,
            this.vehicle.pos.y + 0.65 + Math.random() * 0.85,
            this.vehicle.pos.z + (Math.random() - 0.5) * 2.2,
            (Math.random() - 0.5) * 9, 2.0 + Math.random() * 4.5, (Math.random() - 0.5) * 9,
            1.0, 0.78, 0.28, 0.36 + Math.random() * 0.2, -9.0, 1.3
          );
        }
        const tgt = d.targetCallsign || "Armored Rig";
        if ((d.myTier || 1) >= 3 && (d.otherTier || 1) >= 3) {
          this.ui.toast(`⚙️ HEAVY ARMOR GRIND vs ${tgt}! Steel on steel!`, true);
        } else if ((d.myTier || 1) > (d.otherTier || 1)) {
          this.ui.toast(`💥 ARMORED RAM! Shoved ${tgt} aside!`);
        } else {
          this.ui.toast(`💥 CRUNCHED BY HEAVY ARMOR (${tgt})!`, true);
        }
      }
      else if (ev.kind === "glass_shatter") {
        this.audio.playGlassShatter();
        this.ui.toast(`CRACK! ${ev.data.side === "headlightL" ? "Left" : "Right"} headlight shattered!`, true);
      }
      else if (ev.kind === "tire_blowout") {
        this.audio.playTireBlowout();
        this.particles.emitCrashBurst(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, 0.9, "rock", this.weather.weather);
        this.ui.toast(`BANG!! ${ev.data.label} TIRE BLEW OUT (${ev.data.reason})! ${ev.data.label} TIRE BLOWN OUT!`, true);
      }
      else if (ev.kind === "rim_spark") {
        this.particles.emitRGB(ev.data.x, ev.data.y, ev.data.z, (Math.random() - 0.5) * 4, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 4, 1.0, 0.78, 0.22, 0.28, -9.0, 1.2);
      }
      else if (ev.kind === "hydrolock") {
        this.audio.playImpact(0.8);
        this.ui.toast("ENGINE HYDROLOCKED!", true);
      }
      else if (ev.kind === "plank_break") {
        this.audio.playWoodSnap();
        this.network.send({ type: "plank_break", bridgeId: ev.data.bridgeId, plankIdx: ev.data.plankIdx, bridgeName: ev.data.bridgeName });
        this.ui.toast(`CRACK!! Plank snapped beneath you on ${ev.data.bridgeName}!`, true);
      }
      else if (ev.kind === "cargo_spill") {
        this.entities.spawnLooseCrate(ev.data.x, ev.data.z, ev.data.cargoType);
        this.vehicleRig.setCargoVisual(this.vehicle.cargoCount, this.vehicle.cargoType, this.vehicle.cargoStrapped);
        this.ui.toast("WHOA! Unstrapped crate flew out of your flatbed!! Get out [F] to pick it up!", true);
      }
    }

    if (this.onFoot && !this.ridingWithPeerId && !this.timedWork && !modalOpen) {
      const moveF = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
      const moveS = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
      const spd = (this.keys.ShiftLeft || this.keys.ShiftRight) ? 7.6 : 4.2;
      const isMoving = Math.abs(moveF) > 0.05 || Math.abs(moveS) > 0.05;

      if (this.walkingOnBoat && this.boats) {
        // Walk freely in boat-local coordinates on a moving ship deck!
        const wb = this.walkingOnBoat;
        const b = wb.isRemote ? this.boats.remoteBoats.get(wb.ownerPeerId) : wb.boat;
        if (!b || !b.spec || !b.spec.walkBounds) {
          this.walkingOnBoat = null;
        } else {
          if (isMoving) {
            const camFwd = this._tmpCamFwd; this.camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
            const camRight = this._tmpCamRight.set(-camFwd.z, 0, camFwd.x);
            const dir = camFwd.multiplyScalar(moveF).add(camRight.multiplyScalar(moveS)).normalize();
            // Rotate world movement into boat-local frame
            const c = Math.cos(-(b.yaw || 0)), s = Math.sin(-(b.yaw || 0));
            const dlx = dir.x * c + dir.z * s;
            const dlz = -dir.x * s + dir.z * c;
            const cl = this.boats.clampToWalkDeck(b, wb.lx + dlx * spd * dt, wb.lz + dlz * spd * dt);
            wb.lx = cl.x; wb.lz = cl.z;
            this.playerFoot.yaw = Math.atan2(dir.x, dir.z);
            this.playerFoot.walkPhase += dt * spd * 2.2;
          }
          const wPos = this.boats.boatLocalToWorld(b, wb.lx, b.spec.deckY + 0.06, wb.lz);
          this.playerFoot.x = wPos.x; this.playerFoot.y = wPos.y; this.playerFoot.z = wPos.z;
        }
      } else {
        if (isMoving) {
          const camFwd = this._tmpCamFwd; this.camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
          const camRight = this._tmpCamRight.set(-camFwd.z, 0, camFwd.x);
          const dir = camFwd.multiplyScalar(moveF).add(camRight.multiplyScalar(moveS)).normalize();
          this.playerFoot.x += dir.x * spd * dt; this.playerFoot.z += dir.z * spd * dt;
        // v18.1.1 Solid Person-to-Car OBB Collision (never phase into your own car!)
        if (this.vehicle && this.vehicle.spec) {
          const spC = this.vehicle.spec;
          const dxC = this.playerFoot.x - this.vehicle.pos.x;
          const dzC = this.playerFoot.z - this.vehicle.pos.z;
          const fwdC = this._tmpVehFwd.set(0, 0, 1).applyQuaternion(this.vehicle.quat);
          const yawC = Math.atan2(fwdC.x, fwdC.z);
          const cC = Math.cos(-yawC), sC = Math.sin(-yawC);
          let lxC = dxC * cC + dzC * sC;
          let lzC = -dxC * sC + dzC * cC;
          const hW = (spC.bodyWidth || 2.0) * 0.5 + 0.38;
          const hL = (spC.bodyLen || 4.6) * 0.5 + 0.38;
          if (Math.abs(lxC) < hW && Math.abs(lzC) < hL) {
            const penX = hW - Math.abs(lxC), penZ = hL - Math.abs(lzC);
            if (penX < penZ) lxC = (lxC >= 0 ? hW : -hW);
            else lzC = (lzC >= 0 ? hL : -hL);
            const cB = Math.cos(yawC), sB = Math.sin(yawC);
            this.playerFoot.x = this.vehicle.pos.x + lxC * cB + lzC * sB;
            this.playerFoot.z = this.vehicle.pos.z - lxC * sB + lzC * cB;
          }
        }
          this.playerFoot.yaw = Math.atan2(dir.x, dir.z); this.playerFoot.walkPhase += dt * spd * 2.2;
        }
        const seaL = KK.SEA_LEVEL !== undefined ? KK.SEA_LEVEL : -32.0;
        if (this._footKnock) {
          const fk = this._footKnock;
          this.playerFoot.x += fk.vx * dt;
          this.playerFoot.z += fk.vz * dt;
          fk.yOff += fk.vy * dt;
          fk.vy -= 22.0 * dt;
          const damp = Math.exp(-3.2 * dt);
          fk.vx *= damp; fk.vz *= damp;
          if (fk.yOff <= 0) {
            fk.yOff = 0; fk.vy = 0;
            if (Math.hypot(fk.vx, fk.vz) < 0.25) this._footKnock = null;
          }
        }
        this.playerFoot.y = Math.max(seaL - 0.35, this.world.getTerrainInfo(this.playerFoot.x, this.playerFoot.z, true).height) + (this._footKnock ? this._footKnock.yOff : 0);
      }
      if (this.playerFoot.repairingTimer > 0) this.playerFoot.repairingTimer -= dt;
      this.localAvatar.userData.animate(this.playerFoot.walkPhase, isMoving, !!this.playerFoot.carryingCrate, this.playerFoot.repairingTimer > 0);
    }

    let ridingPeer = this.ridingWithPeerId ? this.network.remotePlayers.get(this.ridingWithPeerId) : null;
    if (this.ridingWithPeerId && !ridingPeer) { this.ridingWithPeerId = null; this.onFoot = true; this.localAvatar.visible = true; }
    if (ridingPeer) { this.playerFoot.x = ridingPeer.gx; this.playerFoot.y = ridingPeer.gy; this.playerFoot.z = ridingPeer.gz; }
    const focusGx = activeBoatNow ? activeBoatNow.gx : (ridingPeer ? ridingPeer.gx : (this.onFoot ? this.playerFoot.x : this.vehicle.pos.x));
    const focusGz = activeBoatNow ? activeBoatNow.gz : (ridingPeer ? ridingPeer.gz : (this.onFoot ? this.playerFoot.z : this.vehicle.pos.z));
    const focusGy = activeBoatNow ? (activeBoatNow.gy + (activeBoatNow.spec.deckY || 2.0)) : (ridingPeer ? ridingPeer.gy : (this.onFoot ? this.playerFoot.y : this.vehicle.pos.y));
    const hEff = (this.hazards && this.hazards.getHurricaneEffectAt) ? this.hazards.getHurricaneEffectAt(focusGx, focusGz) : null;
    const seaDread = (this.oceanCryptids && this.oceanCryptids.seaDreadLevel) || 0;
    const shift = this.world.checkFloatingOrigin(focusGx, focusGz);
    if (shift) { this.camPosSmooth.x += shift.dx; this.camPosSmooth.z += shift.dz; }
    const focusVx = activeBoatNow ? activeBoatNow.vx : (this.onFoot ? 0 : this.vehicle.vel.x);
    const focusVz = activeBoatNow ? activeBoatNow.vz : (this.onFoot ? 0 : this.vehicle.vel.z);
    this.world.updateChunks(focusGx, focusGz, false, focusVx, focusVz);
    if (this.world && this.world.updateMegaBridgeStream) this.world.updateMegaBridgeStream(focusGx, focusGz);
    if (this.world && this.world.updateZolotoyCity) this.world.updateZolotoyCity(dt, this.vehicle, this.audio, horn);
    this._updateMegaBridgeGhost(dt);

    if (this.vehicle._hitClosedRampFlag) {
      this.vehicle._hitClosedRampFlag = false;
      if (this.audio) this.audio.playImpact(0.85);
      this.ui.toast("💥 RAMP IS CLOSED! Press [U] at the helm to lower the ramp before driving off!", true);
    }
    this.world.updateFallingTrees(dt);
    if (this._winchPullNetCd > 0) this._winchPullNetCd = Math.max(0, this._winchPullNetCd - dt);
    if (this.entities && this.entities.updateWinchLine) {
      this.entities.updateWinchLine(this.vehicle, this.network.remotePlayers);
      if (this.entities.updateRemoteWinches) this.entities.updateRemoteWinches(this.vehicle, this.network.peerId, this.network.remotePlayers);
    }
    if (this.boats) {
      let boatIn = (this.boats.activeBoat && !this.ui.activeModal && !(this.startMenu && this.startMenu.isOpen)) ? {
        throttle: (this.keys.KeyW || this.keys.ArrowUp) ? 1 : 0,
        brake: (this.keys.KeyS || this.keys.ArrowDown) ? 1 : 0,
        steer: (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) - (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0),
        boost: !!(this.keys.ShiftLeft || this.keys.ShiftRight)
      } : null;
      // v18.1.1 HANDS-OFF SHIP AUTOPILOT CRUISE: Handled per-boat inside boats.update() even when unpiloted!
      if (this.boats.activeBoat) {
        this.boatCruiseOn = !!this.boats.activeBoat.cruiseOn;
        if (this.boats.activeBoat.cruiseKmh) this.boatCruiseKmh = this.boats.activeBoat.cruiseKmh;
      } else {
        this.boatCruiseOn = false;
      }
      this.boats.update(dt, boatIn, this.vehicle, this.particles, this.audio, this.ui, this.network.remotePlayers, this.network.peerId, {
        hurricaneEffect: hEff,
        seaDread,
        weather: this.weather ? this.weather.weather : "clear"
      });
      if (this.boats.updateRemoteBoats) this.boats.updateRemoteBoats(dt, this.network.remotePlayers, this.particles);
      // Weld local car onto remote friend's boat deck at 60 FPS!
      if (this.remoteBoatMount) {
        const rb = this.boats.remoteBoats.get(this.remoteBoatMount.ownerPeerId);
        if (rb) {
          const wP = this.boats.boatLocalToWorld(rb, this.remoteBoatMount.bx, this.remoteBoatMount.deckY + 0.06, this.remoteBoatMount.bz);
          this.vehicle.pos.copy(wP);
          this.vehicle.vel.set(rb.vx || 0, 0, rb.vz || 0);
          this.vehicle.angVel.set(0, 0, 0);
          this.vehicle.quat.setFromEuler(new THREE.Euler(rb.pitch || 0, rb.yaw || 0, rb.roll || 0, "YXZ"));
          this.vehicle.inWaterDepth = 0; this.vehicle.hydrolocked = false;
        } else {
          this.remoteBoatMount = null;
        }
      }
      // Update dedicated Marine Audio & mute parked car engine when piloting!
      if (this.audio && this.audio.updateBoatAudio) {
        this.audio.updateBoatAudio(activeBoatNow, boatIn ? (boatIn.throttle - boatIn.brake) : 0, boatIn ? boatIn.boost : false);
      }
    }
    if (this.world.updateTram) this.world.updateTram(dt, this.vehicle, this.audio);

    // v15.0.1 SITE-140 BLACK ROCK RADIOACTIVE EXCLUSION ZONE (Geiger Crackle + Slow Radiation Wear!)
    const dSite140 = Math.hypot(this.vehicle.pos.x - 68065, this.vehicle.pos.z + 68048);
    if (dSite140 < 1800) {
      const radInt = Math.max(0, 1.0 - dSite140 / 1800);
      this._geigerCd = (this._geigerCd || 0) - dt;
      if (this._geigerCd <= 0) {
        if (this.audio && this.audio.playGeigerClick) this.audio.playGeigerClick(0.35 + radInt * 0.65);
        this._geigerCd = Math.max(0.055, 0.55 - radInt * 0.48) * (0.6 + Math.random() * 0.8);
      }
      if (dSite140 < 450 && !this.onFoot) {
        const vsR = this.vehicle.vState;
        const shielded = !!this.vehicle.spec.isSchreckensfurst || !!(vsR.upgrades && vsR.upgrades.t72EmpShield);
        if (!shielded && vsR.parts && vsR.parts.sparkPlugs) {
          vsR.parts.sparkPlugs.hp = Math.max(12, vsR.parts.sparkPlugs.hp - dt * 0.65 * radInt);
        }
      }
    }
    // Kholodnyy Arctic Peak bitter cold soak when engine is OFF!
    if (this.vehicle.pos.x < -55000 && this.vehicle.pos.z < -58000 && !this.vehicle.engineRunning) {
      this.vehicle.coolantTemp = Math.max(5, this.vehicle.coolantTemp - dt * 2.2);
    }
    this.world.updateFallingFences(dt);
    this.world.updateSettlements(dt, this.weather.isNight);
    if (this.trailer && this.trailerRig) {
      this.trailer.step(dt, this.vehicle, this.world);
      this.world.toLocal(this.trailer.pos.x, this.trailer.pos.y, this.trailer.pos.z, this.trailerRig.root.position);
      this.trailerRig.root.rotation.set(this.trailer.pitch, this.trailer.yaw, this.trailer.roll, "YXZ");
      this.trailerRig.updateVisuals(this.trailer.spinAngle, this.vehicle.braking);
    }
    this.particles.update(dt);

    this.world.toLocal(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, this.vehicleRig.root.position);
    this.vehicleRig.root.quaternion.copy(this.vehicle.quat);
    const engHp = KK.getEngineOverallHealth(this.vehicle.vState);
    const smokeLvl = this.vehicle.vState.burnedOut ? 1.0 : Math.max(0, (this.vehicle.coolantTemp - 112) / 18, (38 - engHp) / 38);
    // v18.1.1 Zolotoy International GP Circuit Lap Timer & Saved Personal Best (uses exact spline Start/Finish coords!)
    if (!this.onFoot && !(this.boats && this.boats.activeBoat)) {
      const gx = this.vehicle.pos.x, gz = this.vehicle.pos.z;
      const gpZone = (KK.SMOOTH_TARMAC_ZONES || []).find((z) => z.isGpCircuit);
      const gateX = (gpZone && gpZone.startX !== undefined) ? gpZone.startX : -62099;
      const gateZ = (gpZone && gpZone.startZ !== undefined) ? gpZone.startZ : 63132;
      this.gpNearTrack = !!(gpZone && Math.hypot(gx - gpZone.cx, gz - gpZone.cz) < 1650);
      if (!this.gpNearTrack && this.gpLapStartMs > 0) this.gpLapStartMs = 0;
      const dGate = Math.hypot(gx - gateX, gz - gateZ);
      if (dGate < 18) {
        if (!this.gpInGate) {
          this.gpInGate = true;
          const nowMs = performance.now();
          if (this.gpLapStartMs > 0 && (nowMs - this.gpLapStartMs) > 25000) {
            const lapSec = (nowMs - this.gpLapStartMs) / 1000;
            this.gpLastLapSec = lapSec;
            const vid = this.vehicle.vState.vehicleId;
            const prevBest = this.gpBestLaps[vid];
            const isPB = (!prevBest || lapSec < prevBest);
            if (isPB) {
              this.gpBestLaps[vid] = +lapSec.toFixed(2);
              try { localStorage.setItem("kk_gp_best_laps_v1", JSON.stringify(this.gpBestLaps)); } catch (_) {}
            }
            const mm = Math.floor(lapSec / 60), ss = (lapSec % 60).toFixed(2).padStart(5, "0");
            this.ui.toast(`🏁 ZOLOTOY GP LAP: ${mm}:${ss}${isPB ? " — NEW PERSONAL BEST!" : ""}`, isPB);
          } else {
            this.ui.toast("🏁 ZOLOTOY GP TIMED LAP STARTED! Push flat out!");
          }
          this.gpLapStartMs = nowMs;
        }
      } else if (dGate > 32) {
        this.gpInGate = false;
      }
      if (this.audio && this.audio.updateTireSlip) {
        const slipVal = Math.max(this.vehicle.driftIntensity || 0, (this.vehicle.braking && this.vehicle.speedKmh > 35) ? 0.55 : 0);
        this.audio.updateTireSlip(slipVal, this.vehicle.speedKmh || 0, this.vehicle.currentSurface || "tarmac");
      }
    } else if (this.audio && this.audio.updateTireSlip) {
      this.audio.updateTireSlip(0, 0, "tarmac");
    }

    // v18.1.1 Auto-save persistent vehicle odometer every 10s when driving!
    this._odoSaveAccum = (this._odoSaveAccum || 0) + dt;
    if (this._odoSaveAccum >= 10.0) {
      this._odoSaveAccum = 0;
      this._saveProgress(false);
    }

    this._updateTutorial(dt);
    // v18.1.1 Armor Viewer tooltip, T-72 Cosmonaut turret launch, 3.5s blow-out flame jet & subtle turret whine!
    if (this.armorViewerActive) this._updateArmorViewerTooltip();
    if (this.lwrAlertTimer > 0) {
      this.lwrAlertTimer = Math.max(0, this.lwrAlertTimer - dt);
      const lwrEl = document.getElementById("lwr-fcs-banner");
      if (lwrEl) {
        lwrEl.textContent = `🚨 LASER WARNING RECEIVER — LOCK DETECTED AT ${this.lwrAlertBearing}! POP SMOKE [G]!`;
        lwrEl.classList.toggle("hidden", this.lwrAlertTimer <= 0);
      }
    }
    if (this.turretPopActive) {
      this.turretPopY += this.turretPopVy * dt;
      this.turretPopVy -= 14.5 * dt;
      this.turretPopPitch += 2.2 * dt;
      this.turretPopRoll += 1.6 * dt;
      if (this.turretPopY < 0.2 && this.turretPopVy < 0) {
        this.turretPopY = 0.2; this.turretPopVy = 0; this.turretPopActive = false;
      }
    }
    if (this.cookoffJetTimer > 0 && this.vehicle && this.particles) {
      this.cookoffJetTimer = Math.max(0, this.cookoffJetTimer - dt);
      const vp = this.vehicle.pos;
      this.particles.emitRGB(
        vp.x + (Math.random() - 0.5) * 0.8, vp.y + 2.3, vp.z + (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 2.5, 11.0 + Math.random() * 6.0, (Math.random() - 0.5) * 2.5,
        1.0, 0.72, 0.18, 0.55, 1.5, 1.4
      );
    }
    if (this.vehicle && this.vehicle.spec && this.vehicle.spec.isTracked && !this.onFoot) {
      const curYaw = this.btrTurretYaw || 0;
      const yawRate = Math.abs(curYaw - this._lastTurretYawForWhine) / Math.max(0.01, dt);
      this._lastTurretYawForWhine = curYaw;
      if (this._turretWhineCd > 0) this._turretWhineCd -= dt;
      if (yawRate > 0.12 && this._turretWhineCd <= 0 && this.audio && this.audio.playTurretWhineTick) {
        this.audio.playTurretWhineTick(this.tankModules.turretRing < 60);
        this._turretWhineCd = 0.095;
      }
    }
    // v18.1.1 Animate On-Foot Player Actions [1-5] on localAvatar!
    if (this.onFoot && this.localAvatar && this.onFootEmoteTimer > 0) {
      this.onFootEmoteTimer = Math.max(0, this.onFootEmoteTimer - dt);
      const tE = performance.now() * 0.012;
      const ud = this.localAvatar.userData || {};
      if (this.onFootEmote === "wave" && ud.armR) {
        ud.armR.rotation.x = -2.6; ud.armR.rotation.z = Math.sin(tE * 1.4) * 0.45;
      } else if (this.onFootEmote === "kick" && ud.legR) {
        ud.legR.rotation.x = -Math.sin(Math.min(1, (0.75 - this.onFootEmoteTimer) / 0.35) * Math.PI) * 1.45;
      } else if (this.onFootEmote === "squat") {
        this.localAvatar.position.y -= 0.42;
        if (ud.legL) ud.legL.rotation.x = -1.1; if (ud.legR) ud.legR.rotation.x = -1.1;
      } else if (this.onFootEmote === "dance") {
        this.localAvatar.position.y += Math.abs(Math.sin(tE * 0.9)) * 0.24;
        if (ud.armL) ud.armL.rotation.x = -1.6 + Math.sin(tE) * 0.9;
        if (ud.armR) ud.armR.rotation.x = -1.6 - Math.sin(tE) * 0.9;
      } else if (this.onFootEmote === "salute" && ud.armR) {
        ud.armR.rotation.x = -2.45; ud.armR.rotation.z = -0.35;
      }
      if (this.onFootEmoteTimer <= 0) {
        if (ud.armL) { ud.armL.rotation.set(0, 0, 0); }
        if (ud.armR) { ud.armR.rotation.set(0, 0, 0); }
        if (ud.legL) { ud.legL.rotation.set(0, 0, 0); }
        if (ud.legR) { ud.legR.rotation.set(0, 0, 0); }
      }
    }
    // v18.1.1 PURGE DISCONNECTED / STALE REMOTE PLAYERS (>9s) & RUN-OVER ON-FOOT FRIENDS!
    if (this.network && this.network.remotePlayers) {
      const nowMs = performance.now();
      for (const [pid, rp] of this.network.remotePlayers.entries()) {
        if (rp.lastSeen && (nowMs - rp.lastSeen) > 9000) {
          if (rp.rig && rp.rig.root) this.scene.remove(rp.rig.root);
          if (rp.avatar) this.scene.remove(rp.avatar);
          this.network.remotePlayers.delete(pid);
          continue;
        }
        // Run over on-foot friends if we slam into them at >12 km/h!
        if (!this.onFoot && rp.onFoot && this.vehicle && this.vehicle.speedKmh > 12) {
          const dP = Math.hypot((rp.gx || 0) - this.vehicle.pos.x, (rp.gz || 0) - this.vehicle.pos.z);
          if (dP < 2.4 && (!rp._runOverCd || nowMs > rp._runOverCd)) {
            rp._runOverCd = nowMs + 2200;
            if (this.audio) this.audio.playImpact(0.75);
            if (this.ui) this.ui.toast(`💥 You ran over ${rp.callsign || "a friend"}!`);
            if (this.network.sendCarBump) {
              const fwdV = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
              this.network.sendCarBump(pid, fwdV.x * 16, 8.5, fwdV.z * 16, 4.0);
            }
          }
        }
      }
    }
    let hasLocalPassenger = false;
    if (this.network && this.network.remotePlayers) {
      for (const r of this.network.remotePlayers.values()) {
        if (this.network.peerId && r.ridingWithPeerId && r.ridingWithPeerId === this.network.peerId) { hasLocalPassenger = true; break; }
      }
    }
    this.vehicleRig.updateVisuals(dt, {
      ammoRackLIntact: this.ammoRackLIntact, ammoRackRIntact: this.ammoRackRIntact, tankModules: this.tankModules, bm21Rockets: this.vehicle.vState.bm21Rockets, turretPopY: this.turretPopY, turretPopPitch: this.turretPopPitch, turretPopRoll: this.turretPopRoll, brakeHeat: this.vehicle.brakeHeat || 0, windshieldMud: this.windshieldMud || 0, timeOfDay: this.weather ? this.weather.timeOfDay : 12, engineRunning: this.vehicle.engineRunning, rpm: this.vehicle.rpm, gear: this.vehicle.gear, hasPassenger: hasLocalPassenger, glassHp: this.vehicle.vState.health.glass !== undefined ? this.vehicle.vState.health.glass : 100, trackL: this.vehicle.vState.health.trackL !== undefined ? this.vehicle.vState.health.trackL : 100, trackR: this.vehicle.vState.health.trackR !== undefined ? this.vehicle.vState.health.trackR : 100,
      wheelOffsets: this.vehicle.wheels.map((w) => w.visualOffsetY),
      wheelSpins: this.vehicle.wheels.map((w) => w.spinAngle),
      blownTires: this.vehicle.vState.blownTires,
      steerAngle: this.vehicle.steerAngle, camberDeg: this.vehicle.vState.tuning.camberDeg, toeDeg: this.vehicle.vState.tuning.toeDeg,
      headlights: this.vehicle.headlights, lightbar: this.vehicle.lightbar, hasLightbar: !!this.vehicle.vState.upgrades.ledLightbar, headlightL: this.vehicle.vState.health.headlightL, headlightR: this.vehicle.vState.health.headlightR, lightbarHp: this.vehicle.vState.health.lightbar, taillightL: this.vehicle.vState.health.taillightL, taillightR: this.vehicle.vState.health.taillightR, apsFlashTimer: this.apsFlashTimer, isSchreckensfurst: !!this.vehicle.spec.isSchreckensfurst, braking: this.vehicle.braking,
      reversing: this.vehicle.reversing, hazards: this.vehicle.hazards, hoodOpen: this.vehicle.hoodOpen,
      smokeLevel: Math.max(0, smokeLvl), dirtLevel: this.vehicle.vState.dirtLevel, snowLevel: this.vehicle.vState.snowLevel || 0,
      backfireTimer: this.vehicle.backfireTimer, cargoTilt: this.vehicle.cargoTilt, rideHeight: this.vehicle.vState.tuning.rideHeight,
      xrayActive: this.xrayActive,
      inCockpitCam: (!this.onFoot && !this.ridingWithPeerId && this.camMode === 3),
      isEmpty: this.onFoot || !!this.ridingWithPeerId,
      hasBtrTurret: (this.vehicle.vState.vehicleId === "komodo_turret" || this.vehicle.vState.vehicleId === "komodo_std" || !!this.vehicle.vState.upgrades.btrTurret),
      turretYaw: this.btrTurretYaw,
      rwsYaw: this.p140RwsYaw,
      rwsPitch: this.p140RwsPitch,
      gunPitch: this.btrAimPitch,
      barrelRecoil: this.t72BarrelRecoil,
      tankFlashTimer: this.t72MainFlash,
      coaxFlashTimer: this.t72CoaxFlash,
      t72ReloadTimer: this.t72ReloadTimer,
      t72ReloadTotal: this.t72ReloadTotal,
      t72TotalShells: this.vehicle.spec.isSchreckensfurst ? ((this.vehicle.vState.p140ApAmmo || 0) + (this.vehicle.vState.p140HeshAmmo || 0) + (this.vehicle.vState.p140ThermAmmo || 0) + (this.vehicle.vState.p140RlgAmmo || 0)) : ((this.vehicle.vState.t72HeAmmo || 0) + (this.vehicle.vState.t72ApAmmo || 0) + (this.vehicle.vState.t72ThermAmmo || 0)),
      t72ShellType: this.vehicle.vState.t72ShellType,
      t72CoaxAmmo: this.vehicle.vState.t72CoaxAmmo || 0,
      thermalMode: this.thermalMode || 0,
      barrelHeat: this.barrelHeat || 0, autoBarrelHeat: this.autoBarrelHeat || 0,
      egtTemp: this.vehicle.egtTemp || 320,
      waterDepth: this.vehicle.inWaterDepth || 0,
      hasT72Snorkel: !!this.vehicle.vState.upgrades.t72Snorkel,
      t72Upgrades: this.vehicle.vState.upgrades,
      stowedUpgrades: this.vehicle.vState.stowedUpgrades,
      gradFlashTimer: this.gradFlashTimer,
      shilkaRadarOn: this.shilkaRadarOn,
      shilkaActiveBarrel: this.shilkaActiveBarrel,
      shilkaFlashTimer: this.shilkaFlashTimer,
      btrFlashTimer: this.btrFlashTimer,
      wipersOn: this.wipersOn,
      rpm: this.vehicle.rpm,
      redlineRpm: (KK.ENGINES[this.vehicle.vState.engineId] || KK.ENGINES.umz_24).redlineRpm,
      speedKmh: this.vehicle.speedKmh,
      gear: this.vehicle.gear,
      boostPsi: this.vehicle.boostPsi,
      coolantTemp: this.vehicle.coolantTemp,
      fuelFrac: this.vehicle.vState.fuel / Math.max(1, this.vehicle.spec.fuelCapacity),
      driveMode: this.vehicle.driveMode,
      frontLock: this.vehicle.frontLock,
      rearLock: this.vehicle.rearLock,
      hasBlown: !!(this.vehicle.vState.blownTires && this.vehicle.vState.blownTires.some(Boolean)),
      empGlitch: this.empGlitchTimer,
      empKind: this.empKind,
      xrayHealth: {
        engine: (this.vehicle.vState.parts.pistons.hp + this.vehicle.vState.parts.headGasket.hp + this.vehicle.vState.parts.crankshaft.hp) / 3,
        radiator: this.vehicle.vState.parts.radiator.hp,
        intercooler: this.vehicle.vState.parts.intercooler.hp,
        gearbox: (this.vehicle.vState.parts.gearboxGears.hp + this.vehicle.vState.parts.clutchPack.hp) / 2,
        transfer: this.vehicle.vState.parts.transferCase.hp,
        driveshaft: this.vehicle.vState.parts.driveshaft.hp,
        tieRods: this.vehicle.vState.parts.tieRods.hp,
        shockFL: this.vehicle.vState.parts.shockFL ? this.vehicle.vState.parts.shockFL.hp : 100,
        shockFR: this.vehicle.vState.parts.shockFR ? this.vehicle.vState.parts.shockFR.hp : 100,
        shockRL: this.vehicle.vState.parts.shockRL ? this.vehicle.vState.parts.shockRL.hp : 100,
        shockRR: this.vehicle.vState.parts.shockRR ? this.vehicle.vState.parts.shockRR.hp : 100,
        brakePads: this.vehicle.vState.parts.brakePads ? this.vehicle.vState.parts.brakePads.hp : 100,
        shocksAvg: (this.vehicle.vState.parts.shockFL.hp + this.vehicle.vState.parts.shockFR.hp + this.vehicle.vState.parts.shockRL.hp + this.vehicle.vState.parts.shockRR.hp) / 4
      }
    });

    if (this.onFoot) {
      this.world.toLocal(this.playerFoot.x, this.playerFoot.y, this.playerFoot.z, this.localAvatar.position);
      this.localAvatar.rotation.y = this.playerFoot.yaw;
    }

    this.entities.update(dt, this.vehicle, this.weather, (kind, hitKmh, dgx, dgz) => {
      if (kind === "deer" && this.skinwalker) this.skinwalker.recordDeerKill(dgx || this.vehicle.pos.x, dgz || this.vehicle.pos.z, this.vehicle);
      const isTank = !!this.vehicle.spec.isTracked;
      const is140  = !!this.vehicle.spec.isSchreckensfurst;
      const animalName = kind === "camel" ? "camel" : "deer";
      if (isTank) {
        // Armored tracked tanks crush wildlife with zero headlight damage & minimal radiator/hull scratch!
        const scratch = is140 ? 0.5 : Math.min(3.5, hitKmh * 0.04);
        this.vehicle.vState.parts.radiator.hp = Math.max(0, this.vehicle.vState.parts.radiator.hp - scratch);
        this.vehicle.vState.health.body = Math.max(0, this.vehicle.vState.health.body - scratch * 0.6);
        this.particles.emitCrashBurst(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, 0.65, "gravel", this.weather.weather);
        this.audio.playImpact(0.45);
        this.ui.toast(`THUD! Rolled over a ${animalName} at ${Math.round(hitKmh)} km/h (Armor held!)`);
      } else {
        const dmg = Math.min(38, hitKmh * 0.42 * (this.vehicle.vState.upgrades.bullbar ? 0.35 : 1.0));
        this.vehicle.vState.parts.radiator.hp = Math.max(0, this.vehicle.vState.parts.radiator.hp - dmg);
        this.vehicle.vState.parts.intercooler.hp = Math.max(0, this.vehicle.vState.parts.intercooler.hp - dmg * 0.6);
        this.vehicle.vState.health.body = Math.max(0, this.vehicle.vState.health.body - dmg * 0.7);
        this.vehicle.damageHeadlights(dmg * 1.6, 0);
        this.vehicle.peakGForce = Math.max(this.vehicle.peakGForce, 2.8);
        if (this.vehicle.cargoCount > 0) this.vehicle.cargoIntegrity = Math.max(0, this.vehicle.cargoIntegrity - dmg * 0.4);
        this.particles.emitCrashBurst(this.vehicle.pos.x, this.vehicle.pos.y, this.vehicle.pos.z, 0.85, "gravel", this.weather.weather);
        this.audio.playImpact(0.9);
        this.ui.toast(`SMASH!! You hit a ${animalName} at ${Math.round(hitKmh)} km/h! Radiator -${Math.round(dmg)}%!`, true);
      }
    }, { x: this.cryptids.sirenhead.gx, z: this.cryptids.sirenhead.gz }, activeBoatNow ? { x: activeBoatNow.gx, z: activeBoatNow.gz } : null);

    const focusLocal = this.world.toLocal(focusGx, focusGy, focusGz, this._tmpFocusLocal);
    const stormMods = {
      hurricaneIntensity: hEff ? (hEff.intensity || 0) : 0,
      inEye: !!(hEff && hEff.inEye),
      seaDread,
      windX: hEff ? (hEff.windX || 0) : 0,
      windZ: hEff ? (hEff.windZ || 0) : 0
    };
    this.weather.update(dt, focusLocal, this.audio, stormMods);
    this.hazards.update(dt, this.vehicle, this.weather, this.particles, this.audio, this.ui, this.network, this.boats);
    this.cryptids.update(dt, this.vehicle, this.weather, this.particles, this.audio, this.ui, this.network, this.hazards);
    if (this.oceanCryptids) this.oceanCryptids.update(dt, this.vehicle, this.boats, this.particles, this.audio, this.ui, this.network, this.hazards);
    if (this.savannaMechas) {
      this.savannaMechas.update(dt, focusGx, focusGz, this.oceanCryptids, this.particles, this.audio);
      if (this.savannaMechas.cameraShakeOut > 0) this.cameraShake = Math.max(this.cameraShake, this.savannaMechas.cameraShakeOut);
    }
    if (this.audio && this.audio.updateCityAmbience && KK.ZOLOTOY_CITY) {
      const zc = KK.ZOLOTOY_CITY;
      const dCity = Math.hypot(focusGx - zc.cx, focusGz - zc.cz);
      const cityProx = dCity < 950 ? Math.max(0, Math.min(1, 1.0 - (dCity - 380) / 570)) : 0;
      if (cityProx > 0.02) this.audio.updateCityAmbience(dt, cityProx);
    }
    this.clarksonFarm.update(dt, this.vehicle, this.particles, this.audio, this.ui, this);
    this.jamesBar.update(dt, this.vehicle, this);
    this.hammondMesa.update(dt, this.vehicle, this.particles);
    this.milCamp.update(dt, this.vehicle, this.particles, this.ui, this.weather);
    if (this.milCamp && !this.ownedVehicles.t72 && this.audio.updateMilitaryBuzzer) {
      const dCamp = Math.hypot(this.milCamp.gx - this.vehicle.pos.x, this.milCamp.gz - this.vehicle.pos.z);
      this.audio.updateMilitaryBuzzer(dt, dCamp, this.vehicle.engineRunning && !this.onFoot, this.weather.weather);
    }
    if (this.bm21Camp) this.bm21Camp.update(dt, this.vehicle, this.particles, this.ui, this.weather);
    if (this.shilkaCamp) this.shilkaCamp.update(dt, this.vehicle, this.particles, this.ui, this.weather);
    if (this.townNpcs) this.townNpcs.update(dt, this.vehicle, this.particles, this.audio, this.ui, this);
    if (this.skinwalker) this.skinwalker.update(dt, this.vehicle, this.particles, this.audio, this.hazards, this);
    if (this.gasStations) this.gasStations.update(dt, this.vehicle, this.particles);
    if (this.apsFlashTimer > 0) this.apsFlashTimer = Math.max(0, this.apsFlashTimer - dt);

    if (this.vehicle.vState.vehicleId === "pzkpfw_140a4" && this.cryptids && this.cryptids.projectiles) {
      for (let i = this.cryptids.projectiles.length - 1; i >= 0; i--) {
        const pr = this.cryptids.projectiles[i];
        if (Math.hypot(pr.gx - this.vehicle.pos.x, pr.gz - this.vehicle.pos.z) < 26) {
          this.apsFlashTimer = 0.45;
          if (this.audio.playApsIntercept) this.audio.playApsIntercept();
          this.particles.emitCrashBurst(pr.gx, pr.gy, pr.gz, 1.3, "rock", this.weather.weather);
          this.scene.remove(pr.mesh);
          this.cryptids.projectiles.splice(i, 1);
        }
      }
    }

    for (let i = this.guidedMissiles.length - 1; i >= 0; i--) {
      const gm = this.guidedMissiles[i];
      gm.life -= dt;
      const aimD = new THREE.Vector3(); this.camera.getWorldDirection(aimD);
      const curV = new THREE.Vector3(gm.vx, gm.vy, gm.vz).normalize();
      curV.lerp(aimD, Math.min(1, dt * 3.8)).normalize();
      gm.vx = curV.x * gm.speed; gm.vy = curV.y * gm.speed; gm.vz = curV.z * gm.speed;
      gm.gx += gm.vx * dt; gm.gy += gm.vy * dt; gm.gz += gm.vz * dt;
      this.world.toLocal(gm.gx, gm.gy, gm.gz, gm.mesh.position);
      gm.mesh.lookAt(gm.mesh.position.x + gm.vx, gm.mesh.position.y + gm.vy, gm.mesh.position.z + gm.vz);
      if (Math.random() < 0.7) this.particles.emitBarrelSmoke(gm.gx, gm.gy, gm.gz, -curV.x, -curV.y, -curV.z, 0.9);

      const gh = this.world.getTerrainInfo(gm.gx, gm.gz, false).height;
      let cHit = this.cryptids.applyCannonHit(gm.gx, gm.gy, gm.gz, "rlg140", this.audio, 140); if (!cHit.hit) cHit = this._hitOceanCryptids(gm.gx, gm.gy, gm.gz, 80);
      const gHit = this.gasStations ? this.gasStations.checkProjectileHit(gm.gx, gm.gy, gm.gz, 7.0, this, false) : null;
      if (gm.gy <= gh || cHit.hit || gHit || gm.life <= 0) {
        const hitY = Math.max(gh, gm.gy);
        this.particles.emitCrashBurst(gm.gx, hitY + 1.4, gm.gz, 3.0, "rock", this.weather.weather);
        if (this.audio.playArtilleryExplosion) this.audio.playArtilleryExplosion(0.9);
        if (this.world.addCrater(gm.gx, gm.gz, 6.4, 1.9)) {
          this.network.send({ type: "crater_add", x: +gm.gx.toFixed(1), z: +gm.gz.toFixed(1), r: 6.4, d: 1.9 });
        }
        this.scene.remove(gm.mesh);
        gm.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.guidedMissiles.splice(i, 1);
      }
    }

    if (this.carriedByPeerId) {
      const crp = this.network.remotePlayers.get(this.carriedByPeerId);
      if (crp && crp.trailer) {
        const tx = crp._trX !== undefined ? crp._trX : crp.trailer.x;
        const ty = crp._trY !== undefined ? crp._trY : crp.trailer.y;
        const tz = crp._trZ !== undefined ? crp._trZ : crp.trailer.z;
        const tyaw = crp._trYaw !== undefined ? crp._trYaw : (crp.trailer.yaw || 0);
        const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(crp.trailer.p || 0, tyaw, crp.trailer.r || 0, "YXZ"));
        const deckOff = new THREE.Vector3(0, 1.18, -0.15).applyQuaternion(tq);
        this.vehicle.pos.set(tx + deckOff.x, ty + deckOff.y, tz + deckOff.z);
        this.vehicle.quat.copy(tq);
        this.vehicle.vel.set(0, 0, 0);
        this.vehicle.angVel.set(0, 0, 0);
      } else {
        this.carriedByPeerId = null;
      }
    }

    if (this.btrFireCd > 0) this.btrFireCd = Math.max(0, this.btrFireCd - dt);
    if (this.btrFlashTimer > 0) this.btrFlashTimer = Math.max(0, this.btrFlashTimer - dt);
    const curVid = this.vehicle.vState.vehicleId;
    const isT72 = (!this.onFoot && !this.ridingWithPeerId && !modalOpen && (curVid === "t72" || curVid === "harimau" || curVid === "pzkpfw_140a4"));
    const isBm21 = (!this.onFoot && !this.ridingWithPeerId && !modalOpen && curVid === "bm21");
    const isShilka = (!this.onFoot && !this.ridingWithPeerId && !modalOpen && curVid === "shilka");
    const isArmedBtr = (!this.onFoot && !this.ridingWithPeerId && !modalOpen && (curVid === "komodo_turret" || curVid === "komodo_std" || (curVid === "btr80" && !!this.vehicle.vState.upgrades.btrTurret)));
    const isArmed = isT72 || isBm21 || isShilka || isArmedBtr;
    if (!isArmed) {
      this.mouseAimHeld = false; this.mouseFireHeld = false; this.coaxFireHeld = false;
    }
    const hasOpticNow = !this.onFoot && !this.ridingWithPeerId && !inBoatHelm && (
      curVid === "t72" || curVid === "harimau" || curVid === "komodo_recon" || curVid === "komodo_turret" ||
      curVid === "shilka" || curVid === "pzkpfw_140a4" ||
      (curVid === "btr80" && !!this.vehicle.vState.upgrades.btrTurret)
    );
    if (!hasOpticNow && this.thermalMode !== 0) {
      this.thermalMode = 0; this._applyThermalVisuals();
    }
    if (this.t72ReloadTimer > 0) this.t72ReloadTimer = Math.max(0, this.t72ReloadTimer - dt);
    if (this.t72BarrelRecoil > 0) this.t72BarrelRecoil = Math.max(0, this.t72BarrelRecoil - dt * 1.45);
    if (this.t72MainFlash > 0) this.t72MainFlash = Math.max(0, this.t72MainFlash - dt);
    if (this.t72CoaxCd > 0) this.t72CoaxCd = Math.max(0, this.t72CoaxCd - dt);
    if (this.t72CoaxFlash > 0) this.t72CoaxFlash = Math.max(0, this.t72CoaxFlash - dt);

    if (this.gradFireCd > 0) this.gradFireCd = Math.max(0, this.gradFireCd - dt);
    if (this.gradFlashTimer > 0) this.gradFlashTimer = Math.max(0, this.gradFlashTimer - dt);
    if (this.shilkaFireCd > 0) this.shilkaFireCd = Math.max(0, this.shilkaFireCd - dt);
    if (this.shilkaFlashTimer > 0) this.shilkaFlashTimer = Math.max(0, this.shilkaFlashTimer - dt);
    if (this.barrelHeat > 0) this.barrelHeat = Math.max(0, this.barrelHeat - dt * 0.046);
    if (this.autoBarrelHeat > 0) this.autoBarrelHeat = Math.max(0, this.autoBarrelHeat - dt * 0.095);
    if (this.barrelSmokeTimer > 0) {
      this.barrelSmokeTimer = Math.max(0, this.barrelSmokeTimer - dt);
      this.barrelSmokeCd -= dt;
      if (this.barrelSmokeCd <= 0) {
        this.barrelSmokeCd = 0.085;
        const vidS = this.vehicle.vState.vehicleId;
        const smkInt = Math.min(1.0, this.barrelSmokeTimer / 3.5);
        if (vidS === "t72" || vidS === "harimau" || vidS === "komodo_turret" || vidS === "komodo_std" || vidS === "pzkpfw_140a4" || vidS === "bm21" || vidS === "shilka" || (vidS === "btr80" && this.vehicle.vState.upgrades.btrTurret)) {
          const mzS = this._getActiveMuzzleTransform();
          const dW = mzS.dirWorld;
          this.particles.emitBarrelSmoke(mzS.tipWorld.x, mzS.tipWorld.y, mzS.tipWorld.z, dW.x, dW.y, dW.z, smkInt);
          if ((vidS === "t72" || vidS === "harimau" || vidS === "pzkpfw_140a4") && Math.random() < 0.65) {
            this.particles.emitBarrelSmoke(mzS.evacWorld.x, mzS.evacWorld.y, mzS.evacWorld.z, dW.x * 0.25, 0.65, dW.z * 0.25, smkInt * 0.85);
          }
        }
      }
    }

    if (isArmed) {
      if (!this.turretFrozen) {
        const camDir = this._tmpCamDir; this.camera.getWorldDirection(camDir);
        const localAim = this._tmpLocalAim.copy(camDir).applyQuaternion(this._tmpInvQuat.copy(this.vehicle.quat).invert());
        const targetYaw = Math.atan2(localAim.x, localAim.z);
        let dy = targetYaw - this.btrTurretYaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        this.turretSlewErrorDeg = Math.abs(dy * 180 / Math.PI);

        // v14.1S REALISTIC TURRET ROTATION SPEEDS (rad/s — heavy turrets traverse physically instead of snapping!)
        const is140T = (curVid === "pzkpfw_140a4");
        const fcsMult = (curVid === "t72" && this.vehicle.vState.upgrades.t72SeismicFcs) ? 1.42 : 1.0;
        const ringHp = (this.tankModules && this.tankModules.turretRing !== undefined) ? this.tankModules.turretRing : 100;
        const ringMult = ringHp <= 5 ? 0.14 : (0.28 + 0.72 * (ringHp / 100));
        const maxYawRate = (is140T ? 0.70 : (curVid === "t72" ? (0.42 * fcsMult) : (isShilka ? 1.15 : (isBm21 ? 0.36 : 0.88)))) * ringMult;
        const maxStep = maxYawRate * dt;
        if (Math.abs(dy) <= maxStep) this.btrTurretYaw = targetYaw;
        else this.btrTurretYaw += Math.sign(dy) * maxStep;

        // Remote 40mm AutoKanone Turret on PzKpfw 140A4: Independent 2-Axis Tracking!
        // Azimuth: 125°/s (2.18 rad/s, 3.1x faster than 140mm turret) | Elevation: -10° depression to +55° anti-air/Kaiju at 78°/s!
        if (is140T || curVid === "t72" || curVid === "harimau") {
          let dyRws = targetYaw - (this.p140RwsYaw || 0);
          while (dyRws > Math.PI) dyRws -= Math.PI * 2; while (dyRws < -Math.PI) dyRws += Math.PI * 2;
          const maxRwsStep = 2.18 * dt;
          if (Math.abs(dyRws) <= maxRwsStep) this.p140RwsYaw = targetYaw;
          else this.p140RwsYaw = (this.p140RwsYaw || 0) + Math.sign(dyRws) * maxRwsStep;

          const desiredRwsP = Math.max(-0.175, Math.min(0.96, Math.asin(Math.max(-0.98, Math.min(0.98, localAim.y)))));
          const dpRws = desiredRwsP - (this.p140RwsPitch || 0);
          const maxRwsPStep = 1.36 * dt;
          if (Math.abs(dpRws) <= maxRwsPStep) this.p140RwsPitch = desiredRwsP;
          else this.p140RwsPitch = (this.p140RwsPitch || 0) + Math.sign(dpRws) * maxRwsPStep;
        } else {
          this.p140RwsYaw = this.btrTurretYaw;
          this.p140RwsPitch = this.btrAimPitch;
        }

        // Rate-limited vertical barrel elevation in 3rd-person Chase Cam
        if (!this.mouseAimHeld) {
          const minP = isT72 ? -0.12 : (isBm21 ? -0.06 : -0.14);
          const maxP = isT72 ? 0.32 : (isBm21 ? 0.76 : (isShilka ? 0.80 : 0.55));
          const targetPitch = Math.max(minP, Math.min(maxP, Math.asin(Math.max(-0.95, Math.min(0.95, localAim.y)))));
          const dp = targetPitch - this.btrAimPitch;
          const maxPitchRate = is140T ? 0.40 : (curVid === "t72" ? 0.25 * fcsMult : 0.65);
          const maxPStep = maxPitchRate * dt;
          if (Math.abs(dp) <= maxPStep) this.btrAimPitch = targetPitch;
          else this.btrAimPitch += Math.sign(dp) * maxPStep;
        }
      } else {
        this.turretSlewErrorDeg = 0;
      }
      if (isArmedBtr && this.mouseFireHeld) this.fireBtrTurret();
      if (isShilka && this.mouseFireHeld) this.fireShilka23mm();
      if (isBm21 && this.mouseFireHeld && this.vehicle.vState.bm21FireMode === "single") this.launchSingleBm21Rocket();
      if (isBm21 && this.gradSalvoLeft > 0) {
        this.gradSalvoCd -= dt;
        if (this.gradSalvoCd <= 0) {
          this.gradSalvoCd = 0.28;
          this.gradSalvoLeft--;
          this.launchSingleBm21Rocket();
        }
      }
      if (isT72 && !modalOpen && !!(this.keys.ShiftLeft || this.keys.ShiftRight) && !this.keys.KeyT) this.fireT72Coax145();
    }

    // STEP IN-FLIGHT BM-21 122mm KATYUSHA ROCKETS -> PERMANENT TERRAIN CRATER DEFORMATION!
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const rk = this.rockets[i];
      rk.life -= dt;
      rk.vy -= 26.0 * dt; // realistic artillery arc gravity!
      rk.gx += rk.vx * dt; rk.gy += rk.vy * dt; rk.gz += rk.vz * dt;
      this.world.toLocal(rk.gx, rk.gy, rk.gz, rk.mesh.position);
      rk.mesh.lookAt(rk.mesh.position.x + rk.vx, rk.mesh.position.y + rk.vy, rk.mesh.position.z + rk.vz);
      if (Math.random() < 0.65) this.particles.emitCrashBurst(rk.gx, rk.gy, rk.gz, 0.25, "rock", this.weather.weather);

      const gh = this.world.getTerrainInfo(rk.gx, rk.gz, false).height;
      let cHit = rk.isOwner ? this.cryptids.applyCannonHit(rk.gx, rk.gy, rk.gz, "rocket122", this.audio, 122) : { hit: false }; if (rk.isOwner && !cHit.hit) cHit = this._hitOceanCryptids(rk.gx, rk.gy, rk.gz, 48);
      if (rk.gy <= gh || cHit.hit || rk.life <= 0) {
        const hitY = Math.max(gh, rk.gy);
        const dPlayer = Math.hypot(rk.gx - this.vehicle.pos.x, rk.gz - this.vehicle.pos.z);
        this.particles.emitCrashBurst(rk.gx, hitY + 1.8, rk.gz, 4.2, "rock", this.weather.weather);
        this.particles.emitCrashBurst(rk.gx, hitY + 4.5, rk.gz, 3.2, "sand", this.weather.weather);
        if (rk.isOwner && this.gasStations) this.gasStations.checkProjectileHit(rk.gx, hitY, rk.gz, 16.0, this, false);
        if (rk.isOwner) this._applyTreeBallistics(rk.gx, hitY, rk.gz, 180, 15.0, rk.vx, rk.vz);
        if (dPlayer < 950) {
          this.audio.playArtilleryExplosion(Math.max(0.16, 1.0 - dPlayer / 950));
          this.cameraShake = Math.max(this.cameraShake, Math.max(0, 1.0 - dPlayer / 360) * 1.15);
        }
        this._applyIncomingOrdnanceDamage(rk.gx, hitY, rk.gz, "rocket122", 122, rk.isOwner, rk.ox, rk.oy, rk.oz, rk.shooterPeerId || null);
        if (rk.isOwner) {
          if (!cHit.hit) {
            const splash = this.cryptids.applyCannonHit(rk.gx, hitY, rk.gz, "rocket122", this.audio, 122);
            
          } 
          // CARVE PERMANENT TERRAIN CRATER & SYNC OVER LAN!
          const cr = 5.8 + Math.random() * 1.8, cd = 1.65 + Math.random() * 0.65;
          if (this.world.addCrater(rk.gx, rk.gz, cr, cd)) {
            this.network.send({ type: "crater_add", x: +rk.gx.toFixed(1), z: +rk.gz.toFixed(1), r: +cr.toFixed(1), d: +cd.toFixed(2) });
          }
          if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(rk.gx, rk.gz, 35)) {
            this.clarksonFarm.triggerRage(this.ui, this.audio);
          }
        }
        this.scene.remove(rk.mesh);
        rk.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.rockets.splice(i, 1);
      }
    }

    // Update 81mm Tucha Smoke Screen clouds!
    for (let i = this.smokeClouds.length - 1; i >= 0; i--) {
      const sc = this.smokeClouds[i];
      sc.life -= dt;
      sc.scale = Math.min(3.4, sc.scale + dt * 1.25);
      sc.gy += dt * 0.32;
      this.world.toLocal(sc.gx, sc.gy, sc.gz, sc.mesh.position);
      sc.mesh.scale.set(sc.scale, sc.scale * 0.85, sc.scale);
      sc.mesh.material.opacity = Math.max(0, (sc.life / sc.maxLife) * 0.72);
      if (sc.life <= 0) { this.scene.remove(sc.mesh); if (sc.mesh.material) sc.mesh.material.dispose(); this.smokeClouds.splice(i, 1); }
    }

    const sightEl = this._elSight || (this._elSight = document.getElementById("gunner-sight-overlay"));
    if (sightEl) {
      const showSight = isArmed && this.mouseAimHeld;
      sightEl.classList.toggle("hidden", !showSight);
      if (showSight) {
        // Compute Live Laser Rangefinder distance (throttled to 10 Hz + 18m steps!)
        this._lrfTimer -= dt;
        if (this._lrfTimer <= 0) {
          this._lrfTimer = 0.1;
          const cDir = this._tmpCamDir; this.camera.getWorldDirection(cDir);
          const cOrig = this._tmpCamOrig.set(this.camera.position.x + this.world.originX, this.camera.position.y, this.camera.position.z + this.world.originZ);
          let lrfRes = ">450m";
          for (let s = 14; s <= 450; s += 18) {
            const rx = cOrig.x + cDir.x * s, ry = cOrig.y + cDir.y * s, rz = cOrig.z + cDir.z * s;
            if (ry <= this.world.getTerrainInfo(rx, rz, false).height + 0.5) { lrfRes = s + "m"; break; }
          }
          this._lrfText = lrfRes;
          this.lastLaserDist = lrfRes;
        }
        const rngTxt = this._lrfText || ">450m";
        const isDigFcs = (curVid === "pzkpfw_140a4" || curVid === "harimau");
        const elAn = document.getElementById("reticle-analog-soviet");
        const elDg = document.getElementById("reticle-digital-fcs");
        if (elAn) elAn.classList.toggle("hidden", isDigFcs);
        if (elDg) elDg.classList.toggle("hidden", !isDigFcs);

        const pipEl = document.getElementById("fcs-lead-pip");
        const fcsModeTxt = document.getElementById("fcs-hud-mode");
        const fcsTgtTxt = document.getElementById("fcs-hud-target");
        const fcsLwrTxt = document.getElementById("fcs-hud-lwr");
        if (fcsModeTxt) fcsModeTxt.textContent = this.fcsLaserOn ? `FCS: LASER ACTIVE [${rngTxt}]` : "FCS: STANDBY [`]";
        if (fcsLwrTxt) fcsLwrTxt.textContent = (this.lwrAlertTimer > 0) ? `⚠ LWR: ${this.lwrAlertBearing}` : "";

        let leadShown = false;
        if (isDigFcs && this.fcsLaserOn && this.camera) {
          const cDirF = this._tmpCamDir; this.camera.getWorldDirection(cDirF);
          const cOrigF = this._tmpCamOrig.set(this.camera.position.x + this.world.originX, this.camera.position.y, this.camera.position.z + this.world.originZ);
          const obbL = this._raycastRemotePlayersOBB(cOrigF.x, cOrigF.y, cOrigF.z, cDirF.x, cDirF.y, cDirF.z, 900);
          if (obbL && !this._isBeamBlockedBySmoke(cOrigF.x, cOrigF.y, cOrigF.z, cDirF.x, cDirF.y, cDirF.z, obbL.t)) {
            const rpL = obbL.rp;
            const spdKmh = Math.hypot(rpL.vx || 0, rpL.vz || 0) * 3.6;
            const shellSpd = curVid === "pzkpfw_140a4" ? 1850 : 1450;
            const tof = obbL.t / shellSpd;
            const leadW = new THREE.Vector3(
              (rpL.gx + (rpL.vx || 0) * tof) - this.world.originX,
              (rpL.gy + 1.4),
              (rpL.gz + (rpL.vz || 0) * tof) - this.world.originZ
            );
            leadW.project(this.camera);
            if (leadW.z < 1 && pipEl) {
              pipEl.style.left = ((leadW.x * 0.5 + 0.5) * window.innerWidth) + "px";
              pipEl.style.top = ((-leadW.y * 0.5 + 0.5) * window.innerHeight) + "px";
              pipEl.classList.remove("hidden");
              leadShown = true;
            }
            if (fcsTgtTxt) fcsTgtTxt.textContent = `LOCK: ${rpL.callsign || "TARGET"} • ${Math.round(obbL.t)}m • ${Math.round(spdKmh)} km/h`;
            const nowMsL = performance.now();
            if (this.network && this.network.mode !== "offline" && (!this._lastLwrSendMs || nowMsL - this._lastLwrSendMs > 500)) {
              this._lastLwrSendMs = nowMsL;
              this.network.send({ type: "lwr_ping", targetPeerId: rpL.peerId, sx: +this.vehicle.pos.x.toFixed(1), sz: +this.vehicle.pos.z.toFixed(1) });
            }
          } else if (fcsTgtTxt) {
            fcsTgtTxt.textContent = obbL ? "LOCK BROKEN (SMOKE)" : `RANGE: ${rngTxt}`;
          }
        } else if (fcsTgtTxt) {
          fcsTgtTxt.textContent = "TGT: MANUAL AIM";
        }
        if (pipEl && !leadShown) pipEl.classList.add("hidden");

        const mStrip = document.getElementById("gunner-mod-strip");
        if (mStrip && this.tankModules) {
          const mCol = (v) => v >= 70 ? "#34d399" : (v >= 35 ? "#facc15" : "#f87171");
          const tm = this.tankModules;
          mStrip.innerHTML = `<span style="color:${mCol(tm.turretRing)}">RING ${Math.round(tm.turretRing)}%</span>`
            + `<span style="color:${mCol(tm.gunBreech)}">BRCH ${Math.round(tm.gunBreech)}%</span>`
            + `<span style="color:${mCol(tm.gunBarrel)}">BARL ${Math.round(tm.gunBarrel)}%</span>`
            + `<span style="color:${mCol(tm.lwsSensor)}">LWS ${Math.round(tm.lwsSensor)}%</span>`
            + `<span style="color:${mCol(tm.secBarrel)}">SEC ${Math.round(tm.secBarrel)}%</span>`;
        }
        const ammoEl = this._elAmmo || (this._elAmmo = document.getElementById("gunner-ammo-readout"));
        if (ammoEl) {
          if (curVid === "pzkpfw_140a4") {
            const vs = this.vehicle.vState;
            const shMap = { ap140: `PzFz-140 APFSDS (${vs.p140ApAmmo || 0})`, hesh140: `HESH-140 (${vs.p140HeshAmmo || 0})`, therm140: `THERMO-140 (${vs.p140ThermAmmo || 0})`, rlg140: `RLG-140K GUIDED (${vs.p140RlgAmmo || 0})` };
            const rld = this.t72ReloadTimer > 0 ? `LINEAR RAM ${this.t72ReloadTimer.toFixed(1)}s` : "BREECH READY";
            const thLbl = ["DAY", "TRI-FLIR", "RED NVD"][this.thermalMode || 0];
            const slewTag = (this.turretSlewErrorDeg || 0) > 2.2 ? `SLEW ${Math.round(this.turretSlewErrorDeg)}°` : "ON TARGET";
            ammoEl.textContent = `ZIELFALKEN-IV • ${slewTag} • LRF ${rngTxt}  |  ${shMap[vs.p140ShellType] || ""} [${rld}]  |  40mm: ${vs.p140AutoAmmo || 0}  |  ${thLbl}`;
          } else if (curVid === "harimau") {
            const vs = this.vehicle.vState;
            const shLbl = vs.t72ShellType === "ap" ? `105mm M1060 APFSDS (${vs.t72ApAmmo || 0})` : `105mm M393 HE-FRAG (${vs.t72HeAmmo || 0})`;
            const rld = this.t72ReloadTimer > 0 ? `BUSTLE LOAD: ${this.t72ReloadTimer.toFixed(1)}s` : "105mm READY";
            const thLbl = ["DAY", "FLIR THERMAL", "GREEN NVG"][this.thermalMode || 0];
            ammoEl.textContent = `COCKERILL 3105 • LRF: ${rngTxt}  |  ${shLbl} [${rld}]  |  7.62mm: ${vs.t72CoaxAmmo || 0}  |  ${thLbl} [Z]`;
          } else if (curVid === "komodo_turret") {
            const vs = this.vehicle.vState;
            const thLbl = ["DAY", "FLIR THERMAL", "GREEN NVG"][this.thermalMode || 0];
            ammoEl.textContent = `CPWS GEN 2 • LRF: ${rngTxt}  |  30mm AUTOCANNON: ${vs.btrAmmo || 0} rds  |  ${thLbl} [Z]`;
          } else if (curVid === "komodo_std") {
            const vs = this.vehicle.vState;
            ammoEl.textContent = `KOMODO CUPOLA • LRF: ${rngTxt}  |  12.7mm SMB-2 HMG: ${vs.btrAmmo || 0} rds`;
          } else if (isT72) {
            const vs = this.vehicle.vState;
            const shLbl = vs.t72ShellType === "therm" ? `3BK-THERM (${vs.t72ThermAmmo || 0})` : (vs.t72ShellType === "ap" ? `3BM42 APFSDS (${vs.t72ApAmmo || 0})` : `3OF26 HE-FRAG (${vs.t72HeAmmo || 0})`);
            const rld = this.t72ReloadTimer > 0 ? `AUTOLOADER: ${this.t72ReloadTimer.toFixed(1)}s` : "125mm READY";
            const thLbl = ["DAY", "FLIR THERMAL", "1PN51 NVG"][this.thermalMode || 0];
            ammoEl.textContent = `1A40 LRF: ${rngTxt}  |  ${shLbl} [${rld}]  |  14.5mm: ${vs.t72CoaxAmmo || 0}  |  ${thLbl} [Z]`;
          } else {
            if (isBm21) {
            const pitchDeg = Math.round(Math.max(0, this.btrAimPitch) * 57.3);
            const estRng = Math.round((112 * 112 * Math.sin(2 * Math.max(0.05, this.btrAimPitch))) / 26.0);
            ammoEl.textContent = `BM-21 GRAD • ELEV ${pitchDeg}° • EST RANGE ~${estRng}m  |  ${this.vehicle.vState.bm21Rockets || 0}/40 ROCKETS [${(this.vehicle.vState.bm21FireMode || "single").toUpperCase()}]`;
          } else if (isShilka) {
            const thLbl = ["DAY", "FLIR THERMAL", "1PN51 NVG"][this.thermalMode || 0];
            ammoEl.textContent = `ZSU-23-4 SHILKA • LRF ${rngTxt}  |  QUAD-23mm: ${this.vehicle.vState.shilkaAmmo || 0}/800 RDS  |  ${thLbl} [Z]`;
          } else {
            ammoEl.textContent = `BPU-1 LRF: ${rngTxt}  |  KPVT 14.5mm • ${this.vehicle.vState.btrAmmo || 0}/120 RDS`;
          }
          }
        }
      }
    }
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      this.tracers[i].life -= dt;
      if (this.tracers[i].life <= 0) { const tm = this.tracers[i].mesh; this.scene.remove(tm); if (tm.geometry) tm.geometry.dispose(); if (tm.material) tm.material.dispose(); this.tracers.splice(i, 1); }
    }
    const hurrShake = (hEff && hEff.active && !hEff.inEye && hEff.intensity > 0.35) ? (hEff.intensity - 0.35) * 0.24 : 0;
    this.cameraShake = Math.max(this.cameraShake * Math.exp(-5.0 * dt), this.cryptids.cameraShakeOut || 0, (this.oceanCryptids && this.oceanCryptids.cameraShakeOut) || 0, hurrShake);
    if (this.cryptids.empTrigger) {
      this.empGlitchTimer = Math.max(this.empGlitchTimer, this.cryptids.empTrigger.dur || 6.5);
      this.empKind = this.cryptids.empTrigger.kind || "sonic";
    }
    if (this.empGlitchTimer > 0) {
      this.empGlitchTimer = Math.max(0, this.empGlitchTimer - dt);
      if (this.empKind === "sonic") this.cameraShake = Math.max(this.cameraShake, Math.min(0.45, this.empGlitchTimer * 0.08));
    }
    const empEl = this._elEmp || (this._elEmp = document.getElementById("emp-overlay"));
    if (empEl) {
      empEl.classList.toggle("active", this.empGlitchTimer > 0);
      empEl.classList.toggle("rad", this.empKind === "radiation");
      empEl.classList.toggle("sonic", this.empKind === "sonic");
    }
    if (this.flareCount < 6 && this.world.getNearbyTownInteraction(this.vehicle.pos.x, this.vehicle.pos.z)) this.flareCount = 6;
    this.audio.updateEngine(this.vehicle.rpm, driveInput.throttle, this.vehicle.boostPsi, KK.ENGINES[this.vehicle.vState.engineId], this.vehicle.engineRunning && !inBoatHelm, this.onFoot, this.weather.weather, !!this.vehicle.vState.upgrades.twinTurboKit, !!this.vehicle.spec.isTracked, this.vehicle.speedKmh, dt);
    const lPos = this.onFoot ? { x: this.playerFoot.x, y: this.playerFoot.y, z: this.playerFoot.z } : this.vehicle.pos;
    const lRight = this._tmpLRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.audio.updateRemoteEngines(this.network.remotePlayers, lPos, lRight);

    if (this.waypoint) {
      const wpKey = `${Math.round(this.waypoint.x)},${Math.round(this.waypoint.z)}`;
      if (wpKey !== this._cachedWpKey) {
        this._cachedWpKey = wpKey;
        this._cachedWpY = this.world.getTerrainInfo(this.waypoint.x, this.waypoint.z, false).height;
      }
      this.world.toLocal(this.waypoint.x, this._cachedWpY + 75, this.waypoint.z, this.wpBeacon.position);
      this.wpBeacon.visible = true;
    } else { this.wpBeacon.visible = false; }

    const myBoatMount = this.remoteBoatMount
      ? { ownerPeerId: this.remoteBoatMount.ownerPeerId, boatId: this.remoteBoatMount.boatId, bayIdx: this.remoteBoatMount.bayIdx, bx: this.remoteBoatMount.bx, bz: this.remoteBoatMount.bz, deckY: this.remoteBoatMount.deckY }
      : (localOwnBoatMount ? { ownerPeerId: this.network.peerId, boatId: localOwnBoatMount.boat.id, bayIdx: localOwnBoatMount.entry.bayIdx, bx: localOwnBoatMount.entry.x, bz: localOwnBoatMount.entry.z, deckY: localOwnBoatMount.boat.spec.deckY } : null);
    const rFracNet = (this.t72ReloadTimer > 0 && this.t72ReloadTotal > 0) ? Math.max(0, Math.min(1, 1.0 - this.t72ReloadTimer / this.t72ReloadTotal)) : 0;
    this.network.broadcastPlayerState(dt, this.vehicle, this.playerFoot, this.onFoot, this.trailer, this.wipersOn, !!this.timedWork, this.btrTurretYaw, this.carriedByPeerId, false, this.barrelHeat, this.p140RwsYaw, this.p140RwsPitch, this.btrAimPitch, this.autoBarrelHeat, this.boats ? this.boats.activeBoat : null, myBoatMount, {
      turretPopY: this.turretPopY, turretPopPitch: this.turretPopPitch, turretPopRoll: this.turretPopRoll,
      cookoff: this.cookoffJetTimer > 0, reloadFrac: rFracNet
    });
    const lerpF = Math.min(1, dt * 12);
    for (const rp of this.network.remotePlayers.values()) {
      // 1. Velocity dead-reckoning + smooth lerp for normal remote driving
      rp.gx += (rp.vx || 0) * dt * 0.65 + (rp.tx - rp.gx) * lerpF;
      rp.gy += (rp.ty - rp.gy) * lerpF;
      rp.gz += (rp.vz || 0) * dt * 0.65 + (rp.tz - rp.gz) * lerpF;
      let weldedQuat = null;

      // 2. ZERO-LAG 60 FPS LOCAL PARENT-LOCK: If this comrade's car is loaded on OUR trailer, glue it directly to our 60 FPS trailer deck!
      if (rp.carriedByPeerId === this.network.peerId && this.trailer) {
        const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.trailer.pitch || 0, this.trailer.yaw || 0, this.trailer.roll || 0, "YXZ"));
        const dOff = new THREE.Vector3(0, 1.18, -0.15).applyQuaternion(tq);
        rp.gx = this.trailer.pos.x + dOff.x;
        rp.gy = this.trailer.pos.y + dOff.y;
        rp.gz = this.trailer.pos.z + dOff.z;
        weldedQuat = tq;
      } else if (rp.boatMount && this.boats) {
        // ZERO-LAG 60 FPS DECK WELD: If this comrade's car is mounted on our boat OR another remote boat, weld it directly to its bay!
        const hostBoat = (rp.boatMount.ownerPeerId === this.network.peerId)
          ? this.boats.spawnedBoats.find((b) => b.id === rp.boatMount.boatId)
          : this.boats.remoteBoats.get(rp.boatMount.ownerPeerId);
        if (hostBoat) {
          const wP = this.boats.boatLocalToWorld(hostBoat, rp.boatMount.bx || 0, (rp.boatMount.deckY || hostBoat.spec.deckY) + 0.06, rp.boatMount.bz || 0);
          rp.gx = wP.x; rp.gy = wP.y; rp.gz = wP.z;
          weldedQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(hostBoat.pitch || 0, hostBoat.yaw || 0, hostBoat.roll || 0, "YXZ"));
        }
      }

      if (rp.rig) {
        this.world.toLocal(rp.gx, rp.gy, rp.gz, rp.rig.root.position);
        const qCur = new THREE.Quaternion(rp.qx, rp.qy, rp.qz, rp.qw);
        if (weldedQuat) {
          qCur.copy(weldedQuat);
        } else {
          qCur.slerp(new THREE.Quaternion(rp.tqx, rp.tqy, rp.tqz, rp.tqw), lerpF);
        }
        rp.qx = qCur.x; rp.qy = qCur.y; rp.qz = qCur.z; rp.qw = qCur.w;
        rp.rig.root.quaternion.copy(qCur);
        rp.rig.baseColor.set(rp.paintColor || "#5b6d5b");
        rp.rig.updateVisuals(dt, {
          wheelOffsets: rp.wheelOffsets, wheelSpins: rp.wheelSpins, blownTires: rp.blownTires, steerAngle: rp.steerAngle,
          camberDeg: rp.camberDeg, toeDeg: 0, headlights: rp.headlights, glassHp: rp.glassHp !== undefined ? rp.glassHp : 100, lightbar: rp.lightbar, hasLightbar: rp.hasLightbar, headlightL: rp.headlightL, headlightR: rp.headlightR, wipersOn: rp.wipersOn, inCockpitCam: false, isEmpty: !!rp.onFoot, hasBtrTurret: !!rp.hasBtrTurret, turretYaw: rp.turretYaw || 0, gunPitch: rp.gunPitch || 0, rwsYaw: rp.rwsYaw !== undefined ? rp.rwsYaw : (rp.turretYaw || 0), rwsPitch: rp.rwsPitch || 0, autoBarrelHeat: rp.autoBarrelHeat || 0, t72Upgrades: { sturmKit: false }, isSchreckensfurst: rp.vehicleId === "pzkpfw_140a4",
          braking: rp.braking, reversing: false, hazards: rp.hazards, hoodOpen: false,
          trackL: rp.trackL !== undefined ? rp.trackL : 100, trackR: rp.trackR !== undefined ? rp.trackR : 100, turretPopY: rp.turretPopY || 0, turretPopPitch: rp.turretPopPitch || 0, turretPopRoll: rp.turretPopRoll || 0, reloadFrac: rp.reloadFrac || 0, smokeLevel: (rp.smokeLevel && rp.smokeLevel > 0.15) ? rp.smokeLevel : 0, dirtLevel: rp.dirtLevel, snowLevel: rp.snowLevel || 0, backfireTimer: rp.backfireTimer,
          cargoTilt: 0, rideHeight: rp.rideHeight, thermalMode: this.thermalMode || 0, coolantTemp: rp.coolantTemp !== undefined ? rp.coolantTemp : 82, egtTemp: rp.egtTemp !== undefined ? rp.egtTemp : 320, barrelHeat: rp.barrelHeat || 0, speedKmh: Math.hypot(rp.vx || 0, rp.vz || 0) * 3.6
        });
      }
      if (rp.cookoff && this.particles && Math.hypot(rp.gx - this.vehicle.pos.x, rp.gz - this.vehicle.pos.z) < 420) {
        this.particles.emitRGB(
          rp.gx + (Math.random() - 0.5) * 0.8, (rp.gy || 0) + 2.3, rp.gz + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 2.4, 11.0 + Math.random() * 6.0, (Math.random() - 0.5) * 2.4,
          1.0, 0.72, 0.18, 0.55, 1.5, 1.4
        );
      }
      if (this.remoteDustEnabled && !rp.onFoot && Math.hypot(rp.gx - this.vehicle.pos.x, rp.gz - this.vehicle.pos.z) < 260) {
        this.particles.emitRemoteWheelSpray(rp, this.world, this.weather.weather, dt);
      }
      if (rp.avatar) {
        rp.avatar.visible = rp.onFoot;
        if (rp.onFoot) { this.world.toLocal(rp.footX, rp.footY, rp.footZ, rp.avatar.position); rp.avatar.rotation.y = rp.footYaw; }
      }
      if (rp.trailer) {
        if (!rp.trailerRig || rp.trailerRig.spec.id !== rp.trailer.id) {
          if (rp.trailerRig) this.scene.remove(rp.trailerRig.root);
          rp.trailerRig = KK.TrailerBuilder.buildTrailer(rp.trailer.id);
          rp.trailerRig._lastCc = -1;
          this.scene.add(rp.trailerRig.root);
        }
        if (rp._trX === undefined) { rp._trX = rp.trailer.x; rp._trY = rp.trailer.y; rp._trZ = rp.trailer.z; rp._trYaw = rp.trailer.yaw || 0; }
        rp._trX += (rp.vx || 0) * dt * 0.65 + (rp.trailer.x - rp._trX) * lerpF;
        rp._trY += (rp.trailer.y - rp._trY) * lerpF;
        rp._trZ += (rp.vz || 0) * dt * 0.65 + (rp.trailer.z - rp._trZ) * lerpF;
        let dTrY = (rp.trailer.yaw || 0) - rp._trYaw;
        while (dTrY > Math.PI) dTrY -= Math.PI * 2; while (dTrY < -Math.PI) dTrY += Math.PI * 2;
        rp._trYaw += dTrY * lerpF;
        this.world.toLocal(rp._trX, rp._trY, rp._trZ, rp.trailerRig.root.position);
        rp.trailerRig.root.rotation.set(rp.trailer.p || 0, rp._trYaw, rp.trailer.r || 0, "YXZ");
        if (rp.trailerRig._lastCc !== rp.trailer.cc) {
          rp.trailerRig._lastCc = rp.trailer.cc;
          rp.trailerRig.setCargoVisual(rp.trailer.cc || 0, rp.trailer.ct || "logs", true);
        }
        const carSig = rp.trailer.car ? (rp.trailer.car.vid + "_" + rp.trailer.car.col) : "";
        if (rp.trailerRig._lastCarSig !== carSig) {
          rp.trailerRig._lastCarSig = carSig;
          rp.trailerRig.setCarriedCarVisual(rp.trailer.car || null);
        }
      } else if (rp.trailerRig) {
        this.scene.remove(rp.trailerRig.root);
        rp.trailerRig = null;
      }
    }

    this._updateContextPrompt();
    this._updateCamera(dt, focusLocal);

    // Underwater Blue Screen Tint + Muffled Aquatic Audio + Dynamic Wind/Biome Ambience!
    const camGx = this.camera.position.x + this.world.originX;
    const camGz = this.camera.position.z + this.world.originZ;
    const waterSurfCam = this.world.getWaterSurfaceAt(camGx, camGz);
    const camUnderwater = (waterSurfCam > -5000 && this.camera.position.y < waterSurfCam + 0.08);
    const vehUnderwater = (!this.onFoot && !inBoatHelm && !isCarOnAnyBoat && !this.vehicle.spec.amphibious && this.vehicle.inWaterDepth > 1.35);
    const isUnderwater = camUnderwater || vehUnderwater;
    if (this.vehicle.spec.isTracked && this.vehicle.vState.upgrades.t72Snorkel && this.vehicle.inWaterDepth > 1.2 && Math.random() < 0.45) {
      this.particles.emitFrostOrSand(this.vehicle.pos.x, this.vehicle.pos.y + 1.8, this.vehicle.pos.z, true, 2);
    }

    const uwEl = this._elUnderwater || (this._elUnderwater = document.getElementById("underwater-overlay"));
    if (uwEl) {
      uwEl.classList.toggle("active", isUnderwater);
    }

    const rcAud = this.world.getRiverChannel(focusGx, focusGz);
    this.audio.updateEnvironment(dt, {
      underwater: isUnderwater,
      altitude: focusGy,
      speedKmh: this.vehicle.speedKmh,
      weather: this.weather.weather,
      isNight: this.weather.isNight,
      biomes: this.world.getBiomeWeights(focusGx, focusGz),
      riverDist: rcAud.seg ? rcAud.dist : 999,
      inSanctuary: this.clarksonFarm.isInsideSanctuary(focusGx, focusGz) || this.hammondMesa.isInsideSanctuary(focusGx, focusGz),
      threatNear: this.cryptids.anyThreatNear,
      sandwormDist: this.cryptids.sandwormDist,
      sandwormActive: this.cryptids.sandwormActive,
      hurricaneIntensity: hEff ? (hEff.intensity || 0) : 0,
      inEye: !!(hEff && hEff.inEye),
      seaDread,
      hurricaneEffect: hEff
    });

    this.ui.updateWindshieldOverlay(dt, this);
    this._hudAccum += dt;
    if (this._hudAccum >= 0.05) { this._hudAccum = 0; this.ui.updateHUD(this); }
    this.renderer.render(this.scene, this.camera);
    if (this.pendingScreenshot) {
      this.pendingScreenshot = false;
      try {
        const outCv = document.createElement("canvas");
        outCv.width = this.canvas.width;
        outCv.height = this.canvas.height;
        const ctx2 = outCv.getContext("2d");
        ctx2.drawImage(this.canvas, 0, 0);

        // Stamp clean version watermark in bottom-right corner of every screenshot!
        const verStr = `KRASNO-KAMENKA OBLAST • ${KK.VERSION || "v18.1.1"}`;
        const fontSize = Math.max(14, Math.round(outCv.height * 0.020));
        ctx2.font = `bold ${fontSize}px monospace`;
        const padX = Math.round(fontSize * 0.72);
        const padY = Math.round(fontSize * 0.42);
        const tw = ctx2.measureText(verStr).width;
        const boxW = tw + padX * 2;
        const boxH = fontSize + padY * 2;
        const margin = Math.max(14, Math.round(outCv.height * 0.022));
        const bx = outCv.width - boxW - margin;
        const by = outCv.height - boxH - margin;

        ctx2.fillStyle = "rgba(8, 13, 20, 0.72)";
        ctx2.fillRect(bx, by, boxW, boxH);
        ctx2.strokeStyle = "rgba(255, 190, 60, 0.65)";
        ctx2.lineWidth = Math.max(1.5, fontSize * 0.09);
        ctx2.strokeRect(bx, by, boxW, boxH);
        ctx2.fillStyle = "#eef6ff";
        ctx2.textAlign = "right";
        ctx2.textBaseline = "middle";
        ctx2.fillText(verStr, bx + boxW - padX, by + boxH * 0.52);

        const dataUrl = outCv.toDataURL("image/png");
        const a = document.createElement("a");
        const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = dataUrl;
        a.download = `krasno_kamenka_${KK.VERSION || "v18.1.1"}_${ts}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (!this.photoMode) this.ui.toast(`Screenshot saved (${KK.VERSION || "v18.1.1"})!`);
      } catch (err) {
        this.ui.toast("Screenshot failed: " + err.message, true);
      }
    }
  }

  _updateContextPrompt() {
    const el = this._elContextPrompt || (this._elContextPrompt = document.getElementById("context-prompt"));
    if (!el) return;
    const deckBar = this._elDeckBar || (this._elDeckBar = document.getElementById("boat-deck-bar"));
    const setDeckBar = (sig, html) => {
      if (!deckBar) return;
      if (!sig) {
        if (this._lastDeckBarSig !== "") { this._lastDeckBarSig = ""; deckBar.classList.add("hidden"); deckBar.innerHTML = ""; }
        return;
      }
      if (sig !== this._lastDeckBarSig) {
        this._lastDeckBarSig = sig;
        deckBar.innerHTML = html;
        deckBar.classList.remove("hidden");
      }
    };
    let prompt = "";
    if (this.boats && this.boats.activeBoat) {
      const b = this.boats.activeBoat;
      const hasDeck = (b.spec.maxPayloadKg || 0) > 0;
      const mounted = !!this.boats.getLocalMountedEntry(b);
      const ancTxt = b.anchored ? "[SPACE] Lift/Weigh" : "[SPACE] Anchor/Dump";
      const deckTxt = hasDeck ? ` • [U] ${b.deckLocked ? "Unlock Deck" : "Lock Deck"} • [V] ${mounted ? "Unload Car" : "Load Car"}` : "";
      const walkTxt = b.spec.walkBounds ? " • [E] Walk Deck" : " • [E] Disembark";
      const lkBtn = hasDeck ? `<button class="btn ${b.deckLocked ? 'warn' : 'primary'}" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_lock')">${b.deckLocked ? '⬇ OPEN RAMP [U]' : '⬆ CLOSE RAMP [U]'}</button>` : '';
      const exBtn = `<button class="btn" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_helm')">🚶 EXIT HELM [SPACE]</button>`;
      setDeckBar(`helm_${b.id}_${b.deckLocked}`, lkBtn + exBtn);
      el.textContent = `⚓ ${b.spec.name} • [WASD] Drive • [P] Anchor • [U] Ramp • [L/K] Lights • [C] Cam • [SPACE] Exit Helm`;
      el.classList.remove("hidden");
      return;
    }
    if (this.walkingOnBoat && this.onFoot) {
      const wb = this.walkingOnBoat;
      const dCar = Math.hypot(this.playerFoot.x - this.vehicle.pos.x, this.playerFoot.z - this.vehicle.pos.z);
      const helmBtn = `<button class="btn primary" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_helm')">⚓ DRIVE SHIP [SPACE]</button>`;
      const carBtn = (dCar < 36) ? `<button class="btn accent" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('board_car')">🚗 GET IN CAR [F]</button>` : '';
      const rBtn = (wb.boat.spec && wb.boat.spec.maxPayloadKg > 0) ? `<button class="btn" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_lock')">${wb.boat.deckLocked ? '⬇ OPEN RAMP [U]' : '⬆ CLOSE RAMP [U]'}</button>` : '';
      setDeckBar(`walk_${wb.boat.id}_${wb.boat.deckLocked}_${dCar < 36}`, helmBtn + carBtn + rBtn);
      el.textContent = `🚶 On ${wb.boat.spec.name} Deck • [SPACE] Drive Ship • [F] Get in Car • [U] Ramp`;
      el.classList.remove("hidden");
      return;
    }
    if (this.boats) {
      const ownM = !this.onFoot ? this.boats.findLocalMountedBoat() : null;
      if (ownM) {
        const startBtn = `<button class="btn accent" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_ignition')">🔑 START ENGINE [I] (Unlock &amp; Go)</button>`;
        const outBtn   = `<button class="btn primary" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('step_deck')">🚶 STEP OUT [F]</button>`;
        setDeckBar(`ownm_${ownM.boat.id}_${ownM.boat.deckLocked}`, startBtn + outBtn);
        el.textContent = `🔒 CAR LOCKED in [${ownM.entry.label}] • [F] Step Out • [I] Start Engine to Unlock`;
        el.classList.remove("hidden");
        return;
      }
      if (!this.onFoot && !this.remoteBoatMount) {
        const underNow = this.boats.findBoatUnderPoint(this.vehicle.pos.x, this.vehicle.pos.z, true);
        if (underNow && underNow.boat) {
          const lockBtn = `<button class="btn accent" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_ignition')">🔑 ENGINE OFF [I] (Auto-Lock to Bay)</button>`;
          const outBtn  = `<button class="btn" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('step_deck')">🚶 STEP OUT [F]</button>`;
          setDeckBar(`park_${underNow.boat.id}`, lockBtn + outBtn);
          el.textContent = `⚓ ON ${underNow.boat.spec.name} DECK • Turn OFF Ignition [I] to Auto-Lock Car!`;
          el.classList.remove("hidden");
          return;
        }
      }
      if (!this.onFoot && this.remoteBoatMount) {
        const startBtn = `<button class="btn accent" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('toggle_ignition')">🔑 START ENGINE [I] (Unlock &amp; Go)</button>`;
        const outBtn   = `<button class="btn primary" onmousedown="event.stopPropagation()" onclick="window.__GAME__.boatDeckAction('step_deck')">🚶 STEP OUT [F]</button>`;
        setDeckBar(`remm_locked`, startBtn + outBtn);
        el.textContent = `🔒 CAR LOCKED on Ship • [F] Step Out • [I] Start Engine to Unlock`;
        el.classList.remove("hidden");
        return;
      }
      setDeckBar("", "");
      const pxC = this.onFoot ? this.playerFoot.x : this.vehicle.pos.x;
      const pzC = this.onFoot ? this.playerFoot.z : this.vehicle.pos.z;
      const nb = this.boats.findNearbyBoat(pxC, pzC, 34, true);
      if (nb) {
        el.textContent = nb.isRemote
          ? (this.onFoot ? `[F] Climb Aboard ${nb.boat.spec.name}` : `[F] Load ${this.vehicle.spec.name} onto ${nb.boat.spec.name}`)
          : `[F] Board Helm of ${nb.boat.spec.name}`;
        el.classList.remove("hidden");
        return;
      }
      const np = this.boats.findNearbyPort(pxC, pzC, 48);
      if (np) {
        el.textContent = `[F] Open ${np.port.name} — Unlock & Summon Boats`;
        el.classList.remove("hidden");
        return;
      }
    }
    if (this.onFoot) {
      if (this.playerFoot.carryingCrate) {
        prompt = Math.hypot(this.playerFoot.x - this.vehicle.pos.x, this.playerFoot.z - this.vehicle.pos.z) < 5.5
          ? "[F] Load Crate into Flatbed" : "[E] Drop Crate on Ground";
      } else {
        const nearC = this.entities.findNearestCrate(this.playerFoot.x, this.playerFoot.z, 3.2);
        const atEngineBay = this._isAtEngineBay(this.playerFoot.x, this.playerFoot.z, this.vehicle);
        const dTruck = Math.hypot(this.playerFoot.x - this.vehicle.pos.x, this.playerFoot.z - this.vehicle.pos.z);
        const bIdxP = this.findNearbyBlownWheel(this.playerFoot.x, this.playerFoot.z, 2.7);
        const supFP = this.findNearbySupportTrailer(this.playerFoot.x, this.playerFoot.z, 9.5);
        const nearFrCar = this.findNearbyRemoteCar(this.playerFoot.x, this.playerFoot.z, 6.8);
        if (this.ridingWithPeerId) prompt = "[F] Hop Out of Friend's Car  |  [4] Throw Road Flare";
        else if (this.clarksonFarm && this.clarksonFarm.isNearJeremy(this.playerFoot.x, this.playerFoot.z)) prompt = "[E] Ask Jeremy Clarkson to Fix Your Car (FREE!)";
        else if (this.clarksonFarm && this.clarksonFarm.isNearLamboTractor(this.playerFoot.x, this.playerFoot.z)) prompt = "[F] Hop Into Clarkson's Lamborghini Tractor!";
        else if (this.jamesBar && this.jamesBar.isNearParkedSandero(this.playerFoot.x, this.playerFoot.z)) prompt = "[F] Steal James May's Dacia Sandero!";
        else if (this.jamesBar && this.jamesBar.isNearPubDock(this.playerFoot.x, this.playerFoot.z)) prompt = "[F] Talk to James May / Deliver Beer Kegs!";
        else if (this.hammondMesa && this.hammondMesa.isNearHammond(this.playerFoot.x, this.playerFoot.z)) prompt = "[F] Talk to Richard Hammond (BTR-80 KPVT Rearm!)";
        else if (this.milCamp && this.milCamp.isNearCamp(this.playerFoot.x, this.playerFoot.z)) prompt = "[F] Inspect Broken T-72 Relic & Claim Stash!";
        else if (this.findNearbyRemoteBlownWheel(this.playerFoot.x, this.playerFoot.z, 3.1)) {
          const rf = this.findNearbyRemoteBlownWheel(this.playerFoot.x, this.playerFoot.z, 3.1);
          prompt = `[F] Co-op Swap ${rf.rp.callsign}'s Blown ${rf.label} Tire (5s)!`;
        } else if (nearFrCar) prompt = `[F] Ride Shotgun with ${nearFrCar.callsign}  |  [E] Co-op Pit Crew${nearFrCar.repairing ? " (2x Boost!)" : ""}`;
        else if (bIdxP >= 0) prompt = `[F] Swap Blown ${this.vehicle.spec.wheels[bIdxP].id} Tire with Spare (${this.vehicle.vState.spareTires || 0} left)`;
        else if (supFP) prompt = `[F] FULL REFUEL, TIRE SWAP & REPAIR AT ${supFP.owner} SUPPORT TRAILER!`;
        else if (nearC) prompt = "[E] Pick Up Loose Cargo Crate";
        else if (atEngineBay) prompt = this.vehicle.spec.rearEngine ? "[F] Open Rear Engine Deck & Field Repair  |  [F] Enter" : "[F] Open Hood & Field Repair  |  [F] Enter Vehicle";
        else if (dTruck < 6.0) prompt = "[F] Climb Into Driver Seat  |  [R] Strap/Unstrap Cargo  |  [T] Hook Winch";
      }
      const nearLmF = this.world.getNearbyLandmark(this.playerFoot.x, this.playerFoot.z);
      if (!prompt && nearLmF && !this.claimedLandmarks[nearLmF.landmark.id]) {
        prompt = `[E] CLAIM $${nearLmF.landmark.rewardCash.toLocaleString()} TREASURE AT ${nearLmF.landmark.name.toUpperCase()}!`;
      }
    } else {
      const nearGasP = this.gasStations ? this.gasStations.getNearbyStation(this.vehicle.pos.x, this.vehicle.pos.z, 11.5) : null;
      if (nearGasP) prompt = nearGasP.outageTimer > 0 ? `AZS GAS STATION DESTROYED (OFFLINE ${Math.ceil(nearGasP.outageTimer)}s)` : `[F] Refuel at ${nearGasP.townName} AZS Gas Station`;
      const nearLm = this.world.getNearbyLandmark(this.vehicle.pos.x, this.vehicle.pos.z);
      if (nearLm && !this.claimedLandmarks[nearLm.landmark.id]) {
        prompt = `[E] CLAIM $${nearLm.landmark.rewardCash.toLocaleString()} STASH AT ${nearLm.landmark.name.toUpperCase()}!`;
      }
      const near = this.world.getNearbyTownInteraction(this.vehicle.pos.x, this.vehicle.pos.z);
      if (near) {
        if (near.type === "garage") prompt = `[F] Open CPM2 Garage & Parts Shop (${near.town.name})`;
        else if (near.type === "dock") {
          const loadedCntP = this.vehicle.cargoCount + (this.trailer && this.trailer.hitched ? this.trailer.cargoCount : 0);
          if (this.activeContract && !this.activeContract.pickedUp && near.town.id === this.activeContract.fromTown) {
            prompt = `[F] LOAD CONTRACT CARGO AT ${near.town.name.toUpperCase()} DOCK!`;
          } else if (this.activeContract && this.activeContract.pickedUp && !this.activeContract.toBar && near.town.id === this.activeContract.toTown && loadedCntP > 0) {
            prompt = `[F] COMPLETE DELIVERY AT ${near.town.name.toUpperCase()} DOCK!`;
          } else {
            prompt = `[F] or [J] Open Delivery Contracts (${near.town.name})`;
          }
        }
      }
    }
    if (prompt) { el.textContent = prompt; el.classList.remove("hidden"); } else { el.classList.add("hidden"); }
  }

  _updateCamera(dt, focusLocal) {
    if (this.boats && this.boats.activeBoat) {
      const b = this.boats.activeBoat;
      // Smooth vertical target independently of wave bob so sailing feels buttery-smooth!
      const rawY = focusLocal.y;
      if (this._boatCamSmoothY === null || Math.abs(rawY - this._boatCamSmoothY) > 12) this._boatCamSmoothY = rawY;
      this._boatCamSmoothY += (rawY - this._boatCamSmoothY) * (1.0 - Math.exp(-5.0 * dt));
      const baseY = this._boatCamSmoothY;
      const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw);

      const bAlpha = 1.0 - Math.exp(-10.5 * dt);
      if (this.boatCamMode === 1) {
        // MODE 1: BRIDGE / FIRST-PERSON HELM VIEW (Locked directly to bridge — ZERO lag!)
        const hl = (b.id === "zubr") ? { x: 7.8, y: 9.85, z: 8.6 }
          : (b.id === "serna" ? { x: 0, y: 4.90, z: -10.4 }
          : (b.id === "patrol" ? { x: 0, y: 3.22, z: 2.8 }
          : { x: 0, y: 1.55, z: -0.5 }));
        const eyeW = this.boats.boatLocalToWorld(b, hl.x, hl.y, hl.z);
        const eyeL = this.world.toLocal(eyeW.x, eyeW.y, eyeW.z, new THREE.Vector3());
        const lookYaw = b.yaw + this.camOrbitYaw;
        const lookP = Math.max(-0.45, Math.min(0.45, -0.08 - this.camOrbitPitch * 0.6));
        this.camera.position.copy(eyeL);
        this.camera.lookAt(
          eyeL.x + Math.sin(lookYaw) * 45 * Math.cos(lookP),
          eyeL.y + Math.sin(lookP) * 45,
          eyeL.z + Math.cos(lookYaw) * 45 * Math.cos(lookP)
        );
        return;
      }

      let offX, offY, offZ, lookX = focusLocal.x, lookY = baseY + 2.0, lookZ = focusLocal.z;
      if (this.boatCamMode === 2) {
        // MODE 2: CARGO DECK / LOADING CAM
        const dOff = Math.max(14, b.spec.len * 0.42) * this.camZoom;
        offX = cy * (b.spec.width * 0.55 + 6.0) - sy * dOff * 0.35;
        offY = Math.max(12, b.spec.len * 0.36) * this.camZoom;
        offZ = -sy * (b.spec.width * 0.55 + 6.0) - cy * dOff * 0.35;
        lookX = focusLocal.x + sy * (b.spec.len * 0.14);
        lookY = baseY + 1.2;
        lookZ = focusLocal.z + cy * (b.spec.len * 0.14);
      } else if (this.boatCamMode === 3) {
        // MODE 3: LOW WATERLINE CINEMATIC CAM
        const sideD = (b.spec.width * 0.95 + 10.0) * this.camZoom;
        const backD = (b.spec.len * 0.52 + 6.0) * this.camZoom;
        offX = cy * sideD - sy * backD;
        offY = 2.2;
        offZ = -sy * sideD - cy * backD;
        lookX = focusLocal.x + sy * (b.spec.len * 0.15);
        lookY = baseY + 2.6;
        lookZ = focusLocal.z + cy * (b.spec.len * 0.15);
      } else {
        // MODE 0: WIDE HELM CHASE CAM
        const dist = (Math.min(46, b.spec.len * 0.90) + 9.0) * this.camZoom;
        const yaw = b.yaw + this.camOrbitYaw;
        offX = -Math.sin(yaw) * dist;
        offY = (Math.min(17, b.spec.len * 0.28) + 5.2) * this.camZoom + Math.sin(this.camOrbitPitch) * dist * 0.50;
        offZ = -Math.cos(yaw) * dist;
      }

      this._boatCamOffsetSmooth.x += (offX - this._boatCamOffsetSmooth.x) * bAlpha;
      this._boatCamOffsetSmooth.y += (offY - this._boatCamOffsetSmooth.y) * bAlpha;
      this._boatCamOffsetSmooth.z += (offZ - this._boatCamOffsetSmooth.z) * bAlpha;
      this.camera.position.set(
        focusLocal.x + this._boatCamOffsetSmooth.x,
        baseY + this._boatCamOffsetSmooth.y,
        focusLocal.z + this._boatCamOffsetSmooth.z
      );
      this.camera.lookAt(lookX, lookY, lookZ);
      return;
    }
    if (this.camMode !== 3 || this.onFoot || this.ridingWithPeerId) this.camera.up.set(0, 1, 0);

    if ((this.onFoot || this.ridingWithPeerId) && Math.abs(this.camera.fov - 62) > 0.15) {
      this.camera.fov += (62 - this.camera.fov) * Math.min(1, dt * 14);
      this.camera.updateProjectionMatrix();
    }

    // 1. Passenger Seat View (with zoom + look-up!)
    if (this.ridingWithPeerId) {
      const rp = this.network.remotePlayers.get(this.ridingWithPeerId);
      if (rp) {
        const r = 8.4 * this.camZoom;
        const elev = this.camOrbitPitch;
        const horiz = Math.cos(elev) * r;
        const pAlpha = 1.0 - Math.exp(-10.5 * dt);
        this._camOffsetSmooth.x += (-Math.sin(this.camOrbitYaw) * horiz - this._camOffsetSmooth.x) * pAlpha;
        this._camOffsetSmooth.y += ((1.6 + Math.sin(elev) * r) - this._camOffsetSmooth.y) * pAlpha;
        this._camOffsetSmooth.z += (-Math.cos(this.camOrbitYaw) * horiz - this._camOffsetSmooth.z) * pAlpha;
        let pX = focusLocal.x + this._camOffsetSmooth.x, pY = focusLocal.y + this._camOffsetSmooth.y, pZ = focusLocal.z + this._camOffsetSmooth.z;
        const gY = this.world.getTerrainInfo(pX + this.world.originX, pZ + this.world.originZ, false).height + 0.65;
        if (pY < gY) pY = gY;
        this.camPosSmooth.set(pX, pY, pZ);
        this.camera.position.copy(this.camPosSmooth);
        const lookUpBias = elev < -0.05 ? ((-elev - 0.05) * 14.0) : 0;
        this.camera.lookAt(focusLocal.x, focusLocal.y + 1.5 + lookUpBias, focusLocal.z);
        return;
      }
    }

    // 2. On-Foot View (with zoom + full upward look!)
    if (this.onFoot) {
      const r = 5.4 * this.camZoom;
      const elev = this.camOrbitPitch;
      const horiz = Math.cos(elev) * r;
      const fAlpha = 1.0 - Math.exp(-10.5 * dt);
      this._camOffsetSmooth.x += (-Math.sin(this.camOrbitYaw) * horiz - this._camOffsetSmooth.x) * fAlpha;
      this._camOffsetSmooth.y += ((1.55 + Math.sin(elev) * r) - this._camOffsetSmooth.y) * fAlpha;
      this._camOffsetSmooth.z += (-Math.cos(this.camOrbitYaw) * horiz - this._camOffsetSmooth.z) * fAlpha;
      let fX = focusLocal.x + this._camOffsetSmooth.x, fY = focusLocal.y + this._camOffsetSmooth.y, fZ = focusLocal.z + this._camOffsetSmooth.z;
      const gY = this.world.getTerrainInfo(fX + this.world.originX, fZ + this.world.originZ, false).height + 0.45;
      if (fY < gY) fY = gY;
      this.camPosSmooth.set(fX, fY, fZ);
      this.camera.position.copy(this.camPosSmooth);
      const lookUpBias = elev < -0.05 ? ((-elev - 0.05) * 11.0) : 0;
      this.camera.lookAt(focusLocal.x, focusLocal.y + 1.45 + lookUpBias, focusLocal.z);
      return;
    }

    // Smooth FOV zoom when holding Right-Click Gunner Aim in rearmed BTR-80!
    const aVid = this.vehicle.vState.vehicleId;
    const isTankAim = (aVid === "t72" || aVid === "harimau" || aVid === "pzkpfw_140a4");
    const isBm21Aim = (aVid === "bm21");
    const isShilkaAim = (aVid === "shilka");
    const aimingGunner = (!this.onFoot && !this.ridingWithPeerId && !this.ui.activeModal && this.mouseAimHeld &&
                          (isTankAim || isBm21Aim || isShilkaAim || aVid === "komodo_turret" || aVid === "komodo_std" || (aVid === "btr80" && !!this.vehicle.vState.upgrades.btrTurret)));
    const speedFovBoost = Math.min(14, Math.max(0, ((this.vehicle.speedKmh || 0) - 85) / 11));
    const targetFov = aimingGunner ? (isTankAim ? 28 : (isBm21Aim ? 46 : 32)) : (62 + speedFovBoost);
    if (Math.abs(this.camera.fov - targetFov) > 0.15) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 14);
      this.camera.updateProjectionMatrix();
    }

    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.vehicle.quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.vehicle.quat);

    // 2B. TURRET-MOUNTED UNOBSTRUCTED GUNNER OPTIC AIM VIEW (Moves WITH rotating turret 360° — ZERO self-blocking!)
    if (aimingGunner) {
      const chassisLiftY = (this.vehicle.vState.tuning.rideHeight || 0) - 0.34;
      const tYaw = this.btrTurretYaw || 0;
      const sinY = Math.sin(tYaw), cosY = Math.cos(tYaw);
      const rotTur = (cx, cy, cz, ox, oy, oz) => new THREE.Vector3(
        cx + ox * cosY + oz * sinY,
        cy + oy + chassisLiftY,
        cz - ox * sinY + oz * cosY
      );
      let opticLocal;
      if (aVid === "pzkpfw_140a4") opticLocal = rotTur(0, 1.80, -0.45, -0.58, 1.06, 2.25);
      else if (isTankAim)          opticLocal = rotTur(0, 1.62,  0.16, -0.46, 0.96, 1.82); // Clears T-72B turret front cheek 360°!
      else if (isShilkaAim) opticLocal = rotTur(0, 1.50, -0.05,  0.00, 0.96, 1.52); // Clears Shilka turret & radar 360°!
      else if (isBm21Aim)   opticLocal = rotTur(0, 2.36, -2.05,  0.00, 1.24, 1.70); // Clears BM-21 cab & 40-tube rack!
      else if (aVid === "komodo_turret") opticLocal = rotTur(0, 2.15, -0.32,  0.42, 0.92, 0.85);
      else if (aVid === "komodo_std")    opticLocal = rotTur(0, 2.15, -0.22,  0.00, 0.82, 0.62);
      else                  opticLocal = rotTur(0, 2.02,  0.92,  0.30, 0.76, 1.22); // Clears BTR-80 turret 360°!
      const opticPos = opticLocal.applyQuaternion(this.vehicle.quat).add(focusLocal);

      const baseYaw = Math.atan2(fwd.x, fwd.z) + (this.turretFrozen ? tYaw : this.camOrbitYaw);
      const aimDir = new THREE.Vector3(
        Math.sin(baseYaw) * Math.cos(this.btrAimPitch),
        Math.sin(this.btrAimPitch),
        Math.cos(baseYaw) * Math.cos(this.btrAimPitch)
      );
      this.camera.position.copy(opticPos);
      if (this.cameraShake > 0.008) {
        const sh = this.cameraShake * 0.18;
        this.camera.position.x += (Math.random() - 0.5) * sh;
        this.camera.position.y += (Math.random() - 0.5) * sh;
        this.camera.position.z += (Math.random() - 0.5) * sh;
      }
      this.camera.up.set(0, 1, 0);
      this.camera.lookAt(opticPos.clone().addScaledVector(aimDir, 40));
      return;
    }

    // 3. Hood / Bumper Cam
    if (this.camMode === 1) {
      const hoodCam = new THREE.Vector3(0, this.vehicle.spec.bodyHeight * 0.72, this.vehicle.spec.bodyLen * 0.16).applyQuaternion(this.vehicle.quat).add(focusLocal);
      this.camera.position.copy(hoodCam);
      this.camera.lookAt(hoodCam.clone().add(fwd.clone().multiplyScalar(25)));
      return;
    }

    // 4. First-Person Cockpit Cam
    if (this.camMode === 3) {
      const chassisLiftY = (this.vehicle.vState.tuning.rideHeight || 0) - 0.34;
      const eyeBase = (this.vehicleRig && this.vehicleRig.cockpit && this.vehicleRig.cockpit.eyeLocal)
        ? this.vehicleRig.cockpit.eyeLocal.clone()
        : new THREE.Vector3(0, this.vehicle.spec.bodyHeight * 0.72, 0.1);
      eyeBase.y += chassisLiftY;
      const eyePos = eyeBase.applyQuaternion(this.vehicle.quat).add(focusLocal);

      this.camOrbitYaw = Math.max(-1.40, Math.min(1.40, this.camOrbitYaw));
      this.camOrbitPitch = Math.max(-0.52, Math.min(0.58, this.camOrbitPitch));
      const lookLocal = new THREE.Vector3(
        Math.sin(this.camOrbitYaw) * Math.cos(this.camOrbitPitch),
        -Math.sin(this.camOrbitPitch) * 0.85,
        Math.cos(this.camOrbitYaw) * Math.cos(this.camOrbitPitch)
      ).applyQuaternion(this.vehicle.quat);

      this.camera.position.copy(eyePos);
      if (this.cameraShake > 0.008) {
        const sh = this.cameraShake * 0.24;
        this.camera.position.x += (Math.random() - 0.5) * sh;
        this.camera.position.y += (Math.random() - 0.5) * sh;
        this.camera.position.z += (Math.random() - 0.5) * sh;
      }
      this.camera.up.copy(up);
      this.camera.lookAt(eyePos.clone().addScaledVector(lookLocal, 24));
      return;
    }

    // 5. Outside Chase / Wide Convoy Cam (360° Orbit + Mouse-Wheel Zoom + Full Upward Look!)
    this.camera.up.set(0, 1, 0);
    const isGiant = (this.vehicle.spec.id === "kamaz" || this.vehicle.spec.id === "btr80" || this.vehicle.spec.id === "maz537" || this.vehicle.spec.id === "lambo_tractor" || this.vehicle.spec.id === "t72" || this.vehicle.spec.id === "bm21" || this.vehicle.spec.id === "shilka");
    const baseRadius = (this.camMode === 2 ? 15.5 : (this.vehicle.spec.id === "pzkpfw_140a4" ? 12.6 : (this.vehicle.spec.id === "toyota_coaster" ? 10.8 : (this.vehicle.spec.id === "t72" ? 10.6 : (isGiant ? 12.2 : 8.2))))) * this.camZoom;
    const baseYaw = Math.atan2(fwd.x, fwd.z) + this.camOrbitYaw;
    const elev = this.camOrbitPitch;
    const horizDist = Math.cos(elev) * baseRadius;
    const desiredOffX = -Math.sin(baseYaw) * horizDist;
    const desiredOffY = 1.75 + Math.sin(elev) * baseRadius;
    const desiredOffZ = -Math.cos(baseYaw) * horizDist;
    const smoothAlpha = 1.0 - Math.exp(-10.5 * dt);
    this._camOffsetSmooth.x += (desiredOffX - this._camOffsetSmooth.x) * smoothAlpha;
    this._camOffsetSmooth.y += (desiredOffY - this._camOffsetSmooth.y) * smoothAlpha;
    this._camOffsetSmooth.z += (desiredOffZ - this._camOffsetSmooth.z) * smoothAlpha;

    let camX = focusLocal.x + this._camOffsetSmooth.x;
    let camY = focusLocal.y + this._camOffsetSmooth.y;
    let camZ = focusLocal.z + this._camOffsetSmooth.z;
    const groundY = this.world.getTerrainInfo(camX + this.world.originX, camZ + this.world.originZ, false).height + 0.65;
    if (camY < groundY) camY = groundY;
    this.camPosSmooth.set(camX, camY, camZ);
    this.camera.position.copy(this.camPosSmooth);
    if (this.cameraShake > 0.008) {
      const sh = this.cameraShake * 0.42;
      this.camera.position.x += (Math.random() - 0.5) * sh;
      this.camera.position.y += (Math.random() - 0.5) * sh;
      this.camera.position.z += (Math.random() - 0.5) * sh;
    }
    const skyTiltY = elev < -0.05 ? ((-elev - 0.05) * 16.5) : 0;
    this.camera.lookAt(focusLocal.x, focusLocal.y + 1.35 + up.y * 0.2 + skyTiltY, focusLocal.z);
  }
};

window.addEventListener("DOMContentLoaded", () => { new KK.Game(); });
