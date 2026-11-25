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
    this._loadProgress();

    this.canvas = document.getElementById("game-canvas");
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
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
    this.ownedBoats = { patrol: false, strela: false, serna: false, zubr: false };
    this.activeHarborPort = null;
    this._winchPullNetCd = 0;
    this.cryptids = new KK.CryptidManager(this.scene, this.world);
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
    if (this.ownedVehicles && this.ownedVehicles.shilka) this.shilkaCamp.setRelicVisible(false);

    this.photoMode = false;
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
    this.smokeClouds = [];
    this.lastLaserDist = "---";
    this.tracers = [];
    this.ridingWithPeerId = null;
    this.timedWork = null;
    this.wipersOn = false;
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

    this.camMode = 0; this.camOrbitYaw = 0; this.camOrbitPitch = 0.24;
    this.isDraggingMouse = false; this.camPosSmooth = new THREE.Vector3(-8, 6, 0);
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
        if (snap.tornado && !this.network.isHost && this.hazards) {
          this.hazards.applySyncState(snap.tornado);
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
      onFlareThrow: (msg) => {
        if (this.hazards) this.hazards.spawnFlare(msg.x, msg.y, msg.z, msg.vx, msg.vy, msg.vz, true);
      },
      onHazardSync: (msg) => {
        if (!this.network.isHost && this.hazards) this.hazards.applySyncState(msg.tornado);
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
        const from = msg.senderCallsign || "A comrade";
        this.ui.toast(`RECEIVED $${amt.toLocaleString()} from ${from}!`);
        this.ui.addChatLine("BANK", `${from} sent you $${amt.toLocaleString()}!`, true);
        if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
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
        const cal = msg.cal || 14.5;
        this._spawnTracerBeam(msg.x0, msg.y0, msg.z0, msg.x1, msg.y1, msg.z1, cal >= 35 ? 0xff9f1c : 0xffd166, cal >= 35 ? 0.11 : 0.05);
        const d = Math.hypot((msg.x0 || 0) - this.vehicle.pos.x, (msg.z0 || 0) - this.vehicle.pos.z);
        if (d < 420) {
          if (cal >= 35 && this.audio.play40mmAutoKanone) this.audio.play40mmAutoKanone();
          else if (cal >= 20 && this.audio.playShilka23mm) this.audio.playShilka23mm();
          else this.audio.playKPVTShot();
        }
        this._applyIncomingOrdnanceDamage(msg.x1, msg.y1, msg.z1, cal >= 35 ? "auto40" : "mg", cal, false);
        if (this.network.isHost || this.network.mode === "offline") {
          this.cryptids.applyBulletHit(msg.x1, msg.y1, msg.z1, this.audio, cal >= 35, cal);
        }
      },
      onCannonFire: (msg) => {
        const sh = msg.shell || "he";
        const cal = msg.cal || ((sh === "ap140" || sh === "hesh140" || sh === "therm140" || sh === "rlg140") ? 140 : 125);
        const isAp = (sh === "ap" || sh === "ap140");
        const col = isAp ? 0x7df9ff : ((sh === "therm" || sh === "therm140") ? 0xff4500 : 0xff7b1c);
        this._spawnTracerBeam(msg.x0, msg.y0, msg.z0, msg.x1, msg.y1, msg.z1, col, cal >= 140 ? 0.22 : 0.14);
        const d = Math.hypot((msg.x0 || 0) - this.vehicle.pos.x, (msg.z0 || 0) - this.vehicle.pos.z);
        if (d < 720) {
          if (cal >= 140 && this.audio.play140mmEtcBlast) this.audio.play140mmEtcBlast();
          else this.audio.playTank125mmBlast();
          this.cameraShake = Math.max(this.cameraShake, Math.max(0, 1 - d / 360) * 0.65);
        }
        this.particles.emitCrashBurst(msg.x1, msg.y1 + 0.8, msg.z1, isAp ? 0.75 : 2.2, "rock", this.weather.weather);
        if (d < 380) {
          const rDir = new THREE.Vector3((msg.x1 || 0) - (msg.x0 || 0), (msg.y1 || 0) - (msg.y0 || 0), (msg.z1 || 0) - (msg.z0 || 0)).normalize();
          this.particles.emitMuzzleShockwave(new THREE.Vector3(msg.x0 || 0, msg.y0 || 0, msg.z0 || 0), rDir, this.world, this.weather.weather, cal >= 140 ? 1.85 : 1.35, false);
        }
        this._applyIncomingOrdnanceDamage(msg.x1, msg.y1, msg.z1, sh, cal, false);
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
        this._spawnBallisticRocket(msg.x, msg.y, msg.z, msg.vx, msg.vy, msg.vz, false);
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
    this.lastTime = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);

    setTimeout(() => {
      this.ui.toast('Welcome to v15.1.8 ONLINE! Press [TAB] for Online Players (Add Friends & Send Cash, $1,000 min) + Razor-Accurate Roadside Fence Hitboxes!');
    }, 650);
  }

  _exportSavePayload() {
    return {
      money: Math.round(this.money),
      ownedVehicles: this.ownedVehicles,
      activeVehicleId: this.activeVehicleId,
      stats: this.stats,
      claimedLandmarks: this.claimedLandmarks,
      ownedTrailers: this.ownedTrailers,
      ownedBoats: this.ownedBoats
    };
  }

  _applySavePayload(d) {
    if (!d || typeof d !== "object") return;
    if (typeof d.money === "number") this.money = d.money;
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
          try { this.canvas.requestPointerLock(); } catch (err) {}
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
            try { this.canvas.requestPointerLock(); } catch (err) {}
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

    window.addEventListener("keydown", (e) => {
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
      // 2. ON-FOOT INVENTORY [E] | IN-CAR MANUAL GEAR UP [E]
      else if (code === "KeyE") {
        if (this.boats && this.boats.activeBoat) { this.disembarkBoat(); return; }
        if (this.onFoot) { this.ui.openModal("inventory"); return; }
        if (this.vehicle.autoShift) { this.vehicle.autoShift = false; this.ui.toast("Switched to MANUAL Transmission (Q=Down, E=Up, [4]=Auto)"); }
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
      else if (code === "KeyV" && this.boats && this.boats.activeBoat) {
        this.boats.toggleMountVehicle(this.boats.activeBoat, this.vehicle, this.ui);
      }
      else if (code === "KeyY") {
        if (this.vehicle.winch.active) {
          this.vehicle.winch.active = false; this.vehicle.winch.targetPeerId = null;
          this.network.send({ type: "winch_update", active: false }); this.ui.toast("Winch cable released!");
        }
      }
      else if (code === "KeyG") {
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
      // 4. STRICTLY IN-VEHICLE CONTROLS (DISABLED COMPLETELY WHEN ON FOOT!)
      else if (this.onFoot) {
        return;
      }
      else if (code === "KeyQ") {
        if (this.vehicle.autoShift) { this.vehicle.autoShift = false; this.ui.toast("Switched to MANUAL Transmission (Q=Down, E=Up, [4]=Auto)"); }
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
        this.vehicle.ignitionOn = !this.vehicle.ignitionOn;
        this.ui.toast(this.vehicle.ignitionOn ? "Engine Ignition [I]: ON" : "Engine Ignition [I]: OFF");
      }
      else if (code === "KeyP") {
        this.vehicle.parkingBrake = !this.vehicle.parkingBrake;
        this.audio.playWrench();
        this.ui.toast(this.vehicle.parkingBrake ? "Parking Brake [P]: LOCKED" : "Parking Brake [P]: RELEASED");
      }
      else if (code === "Digit1") this.toggleTrailerHitch();
      else if (code === "Digit5") this.toggleCarCarrierLoad();
      else if (code === "KeyC") {
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
      if (t.hasGarage && Math.hypot(t.x - px, t.z - pz) < 42) return true;
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
    if (this.boats.toggleMountVehicle(boat, this.vehicle, this.ui)) {
      this.ui.closeModal();
      this.boardBoat(boat);
    }
  }

  boardBoat(boat) {
    if (!boat || !this.boats) return;
    this.boats.activeBoat = boat;
    this.onFoot = false;
    this.mouseAimHeld = false;
    if (this.localAvatar) this.localAvatar.visible = false;
    this.ui.toast(`BOARDED ${boat.spec.name}! [W/S] Throttle, [A/D] Rudder, [Shift] Boost, [V] Load/Unload Car, [E] Disembark.`);
  }

  disembarkBoat() {
    if (!this.boats || !this.boats.activeBoat) return;
    const b = this.boats.activeBoat;
    this.boats.activeBoat = null;
    if (b.mountedCar) {
      if (!this.boats.toggleMountVehicle(b, this.vehicle, this.ui)) {
        this.boats.activeBoat = b;
        return;
      }
    }
    this.ui.toast(`Disembarked ${b.spec.name}! Returned to ${this.vehicle.spec.name}.`);
  }

  handleContextInteract() {
    if (this.boats && this.boats.activeBoat) {
      this.disembarkBoat();
      return true;
    }
    const ix = this.onFoot ? this.playerFoot.x : this.vehicle.pos.x;
    const iz = this.onFoot ? this.playerFoot.z : this.vehicle.pos.z;
    if (this.boats) {
      const nearBoat = this.boats.findNearbyBoat(ix, iz, 28);
      if (nearBoat) { this.boardBoat(nearBoat.boat); return true; }
      const nearPort = this.boats.findNearbyPort(ix, iz, 44);
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
      this.vehicle.hoodOpen = true; this.ui.openModal("field_repair"); return true;
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
  switchVehicle(vid, silent = false) {
    if (!this.ownedVehicles[vid]) return;
    this.activeVehicleId = vid;
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
    this.vehicle.vState.dirtLevel = 0;
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
      vs.health.mudClog = 0; vs.health.tieRodBias = 0; vs.health.tires = 100; vs.health.body = 100;
      vs.health.headlightL = 100; vs.health.headlightR = 100; vs.health.lightbar = 100; vs.health.taillightL = 100; vs.health.taillightR = 100;
      for (let i = 0; i < vs.blownTires.length; i++) { vs.blownTires[i] = false; vs.tiresHP[i] = 100; }
      vs.spareTires = this.vehicle.spec.wheels.length >= 6 ? 3 : 2;
      this.vehicle.hydrolocked = false; this.vehicle.engineRunning = this.vehicle.ignitionOn; this.vehicle.coolantTemp = 82;
      this.audio.playCash(); this._saveProgress(true);
      this.ui.toast("Garage Overhaul Complete — Every part & light restored to 100%!");
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
      vs.health.tieRodBias *= 0.10;
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
    this._saveProgress(true);
  }

  setWaypoint(gx, gz, label) { this.waypoint = { x: gx, z: gz, label }; this.ui.toast("GPS Waypoint set: " + label); }
  setServerEnv(patch) { this.weather.setEnvironment(patch.timeOfDay, patch.weather, patch.timeScale); this.network.send(Object.assign({ type: "env_control" }, patch)); if (this.ui.activeModal === "env") this.ui.renderEnvControls(); }
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
    if (!this.ownedVehicles.t72 && !this.ownedVehicles.bm21 && !this.ownedVehicles.shilka && !this.ownedVehicles.pzkpfw_140a4) return;
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

  // v14.2 TANK-VS-TANK & VEHICLE ORDNANCE DAMAGE (HE & Thermobaric heavy splash; APFSDS = single pinpoint hit only!)
  _applyIncomingOrdnanceDamage(hx, hy, hz, shell = "he", caliberMm = 125, fromSelf = false) {
    if (!this.vehicle || this.onFoot) return;
    const vx = this.vehicle.pos.x, vy = this.vehicle.pos.y + 1.0, vz = this.vehicle.pos.z;
    const dist = Math.hypot(hx - vx, hz - vz);
    const dy = Math.abs(hy - vy);

    const isAp    = (shell === "ap" || shell === "ap140");
    const isTherm = (shell === "therm" || shell === "therm140");
    const isHe    = (shell === "he" || shell === "hesh140" || shell === "rlg140" || shell === "rocket122");
    const isAuto  = (shell === "auto40" || shell === "mg");

    // APFSDS has ZERO blast radius — strictly single-point direct hit only!
    if (isAp && fromSelf) return;
    const maxRad = isAp ? 2.8 : (isTherm ? 32.0 : (shell === "rocket122" ? 30.0 : (isHe ? 19.0 : (shell === "auto40" ? 5.5 : 3.4))));
    if (dist > maxRad || dy > (isAp ? 3.2 : 12.0)) return;

    const falloff = isAp ? 1.0 : Math.max(0.18, 1.0 - (dist / maxRad));
    const vs = this.vehicle.vState, spec = this.vehicle.spec;
    const is140 = !!spec.isSchreckensfurst;
    const isTank = !!spec.isTracked;
    const hasK5 = (spec.id === "t72" && !!vs.upgrades.t72Kontakt5);
    const calMult = Math.pow(Math.max(14, caliberMm) / 125.0, 1.4);

    // Armor mitigation: heavy tanks withstand far more than cars, but HE & Thermobaric still deal severe external/internal damage!
    let armorMult = 1.0;
    if (is140) armorMult = isTherm ? 0.56 : (isHe ? 0.44 : (isAp ? 0.42 : 0.14));
    else if (isTank) armorMult = isTherm ? 0.72 : (isHe ? 0.58 : (isAp ? 0.62 : (hasK5 ? 0.20 : 0.28)));

    const baseDmg = isTherm ? 78 : (isHe ? 54 : (isAp ? 48 : (shell === "auto40" ? 16 : 6)));
    const dmg = baseDmg * calMult * falloff * armorMult;

    vs.health.body = Math.max(4, vs.health.body - dmg * 0.85);
    const p = vs.parts;
    if (p) {
      const targets = isAp
        ? ["pistons", "crankshaft", "headGasket", "gearboxGears", "radiator"] // Pinpoint internal penetration!
        : (isTherm
          ? ["pistons", "radiator", "intercooler", "sparkPlugs", "fuelInjectors", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods", "brakeSystem"]
          : ["radiator", "intercooler", "shockFL", "shockFR", "shockRL", "shockRR", "tieRods"]);
      for (const id of targets) {
        if (p[id]) p[id].hp = Math.max(4, p[id].hp - dmg * (isAp ? 0.95 : 0.65));
      }
    }
    if (isTherm) this.vehicle.coolantTemp = Math.min(130, this.vehicle.coolantTemp + 22 * falloff);
    if (!isTank && this.vehicle._damageTire && (isHe || isTherm)) {
      this.vehicle._damageTire(Math.floor(Math.random() * this.vehicle.wheels.length), 65 * falloff, "shrapnel");
    }
    if (this.vehicle.damageHeadlights && (isHe || isTherm)) this.vehicle.damageHeadlights(45 * falloff, 0);

    // Physical blast impulse (none on pinpoint APFSDS!)
    if (!isAp) {
      const ang = Math.atan2(vx - hx, vz - hz);
      const imp = (isTherm ? 28 : (isHe ? 18 : 5)) * falloff * (isTank ? 0.42 : 1.0);
      this.vehicle.applyExternalImpulse(Math.sin(ang) * imp, imp * 0.45, Math.cos(ang) * imp, (Math.random() - 0.5) * 3.2 * falloff);
    }
    this.cameraShake = Math.max(this.cameraShake, Math.min(1.1, 0.35 + falloff * 0.7));
    if (this.audio && this.audio.playImpact) this.audio.playImpact(Math.min(1.0, 0.4 + falloff * 0.6));
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

  fireP140MainCannon() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "pzkpfw_140a4" || this.t72ReloadTimer > 0) return;
    const sh = vs.p140ShellType || "ap140";
    const keyMap = { ap140: "p140ApAmmo", hesh140: "p140HeshAmmo", therm140: "p140ThermAmmo", rlg140: "p140RlgAmmo" };
    const ammoKey = keyMap[sh] || "p140ApAmmo";
    if ((vs[ammoKey] || 0) <= 0) {
      this.ui.toast(`OUT OF ${sh.toUpperCase()} — Press [R] to switch shell or Resupply at any Garage!`, true);
      return;
    }
    vs[ammoKey]--;
    this.t72ReloadTotal = 4.8;
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
    let endPt = mz.tipWorld.clone().addScaledVector(aimDir, maxRange);
    const isAp140 = (sh === "ap140");
    for (let s = 6; s <= maxRange; s += (isAp140 ? 4 : 6)) {
      const rx = mz.tipWorld.x + aimDir.x * s, ry = mz.tipWorld.y + aimDir.y * s, rz = mz.tipWorld.z + aimDir.z * s;
      // Direct hit check on LAN friend vehicles/tanks (crucial for pinpoint APFSDS!)
      let hitPeer = false;
      if (this.network && this.network.remotePlayers) {
        for (const rp of this.network.remotePlayers.values()) {
          if (Math.hypot((rp.gx || 0) - rx, (rp.gz || 0) - rz) < 3.4 && Math.abs((rp.gy || 0) + 1.2 - ry) < 2.8) {
            endPt.set(rx, ry, rz); hitPeer = true; break;
          }
        }
      }
      if (hitPeer) break;
      const cHit = this.cryptids.applyCannonHit(rx, ry, rz, sh, this.audio, 140);
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
    this._applyIncomingOrdnanceDamage(endPt.x, endPt.y, endPt.z, sh, 140, true);
    if (this.clarksonFarm && this.clarksonFarm.isInsideSanctuary(endPt.x, endPt.z, 32)) this.clarksonFarm.triggerRage(this.ui, this.audio);
    this.network.send({
      type: "cannon_fire", shell: sh, cal: 140,
      x0: +mz.tipWorld.x.toFixed(1), y0: +mz.tipWorld.y.toFixed(1), z0: +mz.tipWorld.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  fireP140AutoKanone40mm() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId !== "pzkpfw_140a4" || this.t72CoaxCd > 0) return;
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
    let endPt = muzzleG.clone().addScaledVector(aimDir, 360);
    for (let s = 8; s <= 360; s += 6) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      const cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, true, 40);
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
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  fireT72MainCannon() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId === "pzkpfw_140a4") { this.fireP140MainCannon(); return; }
    if (vs.vehicleId !== "t72" && vs.vehicleId !== "harimau") return;
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
    this.t72ReloadTotal = (vs.vehicleId === "harimau") ? 5.0 : (vs.upgrades.t72SeismicFcs ? 4.8 : 6.5);
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
    let endPt = muzzleG.clone().addScaledVector(aimDir, maxRange);
    let hitRes = { hit: false };

    for (let s = 8; s <= maxRange; s += 6) {
      const rx = muzzleG.x + aimDir.x * s;
      const ry = muzzleG.y + aimDir.y * s;
      const rz = muzzleG.z + aimDir.z * s;
      let hitP = false; if (this.network && this.network.remotePlayers) { for (const rp of this.network.remotePlayers.values()) { if (Math.hypot((rp.gx || 0) - rx, (rp.gz || 0) - rz) < 3.4 && Math.abs((rp.gy || 0) + 1.2 - ry) < 2.8) { endPt.set(rx, ry, rz); hitP = true; break; } } } if (hitP) break;
      const cHit = this.cryptids.applyCannonHit(rx, ry, rz, shell, this.audio, 125);
      if (!cHit.hit && this.skinwalker) this.skinwalker.applyHit(rx, ry, rz, this.audio, this.network);
      if (this.gasStations && this.gasStations.checkProjectileHit(rx, ry, rz, 4.2, this, false)) { endPt.set(rx, ry, rz); break; }
      if (this._applyTreeBallistics(rx, ry, rz, 20, 0, aimDir.x, aimDir.z).hit) { endPt.set(rx, ry, rz); break; }
      if (cHit.hit) { endPt.set(rx, ry, rz); hitRes = cHit; break; }
      const gh = this.world.getTerrainInfo(rx, rz, false).height;
      if (ry <= gh) {
        endPt.set(rx, gh, rz);
        hitRes = this.cryptids.applyCannonHit(rx, gh, rz, shell, this.audio, 125);
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
    this.audio.playTank125mmBlast();
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
    

    this.network.send({
      type: "cannon_fire", shell,
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
      x1: +endPt.x.toFixed(1), y1: +endPt.y.toFixed(1), z1: +endPt.z.toFixed(1)
    });
  }

  // SECONDARY: T-72B ROOF-MOUNTED 14.5mm HEAVY MACHINE GUN (Middle-Click OR Hold [Shift]!)
  fireT72Coax145() {
    if (this.onFoot || this.ridingWithPeerId || this.ui.activeModal) return;
    const vs = this.vehicle.vState;
    if (vs.vehicleId === "pzkpfw_140a4") { this.fireP140AutoKanone40mm(); return; }
    if ((vs.vehicleId !== "t72" && vs.vehicleId !== "harimau") || this.t72CoaxCd > 0) return;
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
    let endPt = muzzleG.clone().addScaledVector(aimDir, 240);
    let hitRes = { hit: false };
    for (let s = 8; s <= 240; s += 6) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      const cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, !!(vs.upgrades && vs.upgrades.t72AcousticJammer));
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
    
    this.network.send({
      type: "weapon_fire",
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
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
    let endPt = muzzleLocal.clone().addScaledVector(aimDir, maxRange);
    let hitRes = { hit: false };

    for (let s = 8; s <= maxRange; s += 6) {
      const rx = muzzleLocal.x + aimDir.x * s;
      const ry = muzzleLocal.y + aimDir.y * s;
      const rz = muzzleLocal.z + aimDir.z * s;
      const cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, !!(vs.upgrades && vs.upgrades.t72AcousticJammer));
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

    this._spawnTracerBeam(muzzleLocal.x, muzzleLocal.y, muzzleLocal.z, endPt.x, endPt.y, endPt.z);
    this.audio.playKPVTShot();
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
    

    this.network.send({
      type: "weapon_fire",
      x0: +muzzleLocal.x.toFixed(1), y0: +muzzleLocal.y.toFixed(1), z0: +muzzleLocal.z.toFixed(1),
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
    if (!this.network || this.network.mode === "offline") {
      this.ui.toast("Must be online to send cash!", true);
      return;
    }
    this.money -= amt;
    if (this.audio) this.audio.playCash();
    this._saveProgress(true);
    this.network.send({
      type: "cash_transfer",
      targetPeerId: peerId,
      senderCallsign: this.network.callsign,
      amount: amt
    });
    this.ui.toast(`Sent $${amt.toLocaleString()} to ${callsign || peerId}!`);
    this.ui.addChatLine("BANK", `Sent $${amt.toLocaleString()} to ${callsign || peerId}.`, true);
    if (this.ui.activeModal === "players") this.ui.renderOnlinePlayers();
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

  _spawnBallisticRocket(x, y, z, vx, vy, vz, isOwner = true) {
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
    this.rockets.push({ gx: x, gy: y, gz: z, vx, vy, vz, life: 8.5, isOwner, mesh: grp });
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

    const bOff = [[-0.32, 0.11], [0.32, 0.11], [-0.32, -0.11], [0.32, -0.11]][this.shilkaActiveBarrel];
    const muzzleG = new THREE.Vector3(bOff[0], 1.92 + bOff[1], 0.05).applyQuaternion(this.vehicle.quat).add(this.vehicle.pos);
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

    let endPt = muzzleG.clone().addScaledVector(aimDir, 300);
    let hitRes = { hit: false };
    for (let s = 8; s <= 300; s += 6) {
      const rx = muzzleG.x + aimDir.x * s, ry = muzzleG.y + aimDir.y * s, rz = muzzleG.z + aimDir.z * s;
      const cHit = this.cryptids.applyBulletHit(rx, ry, rz, this.audio, true, 23);
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
      type: "weapon_fire",
      x0: +muzzleG.x.toFixed(1), y0: +muzzleG.y.toFixed(1), z0: +muzzleG.z.toFixed(1),
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

  _spawnRemoteVisuals(rp) {
    const fakeState = KK.createDefaultVehicleState(rp.vehicleId); fakeState.paintColor = rp.paintColor;
    rp.rig = KK.VehicleBuilder.buildVehicle(rp.vehicleId, fakeState, false);
    const tag = KK.VehicleBuilder.createNameSprite(rp.callsign, "#00f5d4"); tag.position.set(0, 3.1, 0); rp.rig.root.add(tag);
    this.scene.add(rp.rig.root);
    rp.avatar = KK.VehicleBuilder.buildHumanAvatar(rp.callsign, 0x3a86ff); rp.avatar.visible = rp.onFoot; this.scene.add(rp.avatar);
  }

  _rebuildRemoteRig(rp) {
    if (rp.rig) this.scene.remove(rp.rig.root);
    const fakeState = KK.createDefaultVehicleState(rp.vehicleId); fakeState.paintColor = rp.paintColor;
    rp.rig = KK.VehicleBuilder.buildVehicle(rp.vehicleId, fakeState, false);
    const tag = KK.VehicleBuilder.createNameSprite(rp.callsign, "#00f5d4"); tag.position.set(0, 3.1, 0); rp.rig.root.add(tag);
    this.scene.add(rp.rig.root);
  }

  _loop(now) {
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const modalOpen = !!this.ui.activeModal;
    this.xrayActive = (!modalOpen && !!this.keys.KeyX);
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
      throttle: (!this.onFoot && !modalOpen && (this.keys.KeyW || this.keys.ArrowUp)) ? 1 : 0,
      brake: (!this.onFoot && !modalOpen && (this.keys.KeyS || this.keys.ArrowDown)) ? 1 : 0,
      steer: (!this.onFoot && !modalOpen && !(this.skinwalker && this.skinwalker.isGrabbing)) ? ((this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) - (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0)) : 0,
      handbrake: (!this.onFoot && !modalOpen && !!this.keys.Space)
    };
    if (this.vehicle.winch.active) { const shiftHeld = !!(this.keys.ShiftLeft || this.keys.ShiftRight); this.vehicle.winch.reeling = (!modalOpen && this.keys.KeyT) ? (shiftHeld ? 1 : -1) : 0; }
    const horn = !this.onFoot && !modalOpen && !!this.keys.KeyN;
    this.vehicle.hornActive = horn;
    const is140Horn = !!this.vehicle.spec.isSchreckensfurst;
    this.audio.setHorn(horn, this.vehicle.spec.id === "kamaz", is140Horn);
    if (horn && is140Horn && this.townNpcs && Math.random() < dt * 2.5) {
      this.townNpcs.triggerTownPanic(this.vehicle.pos.x, this.vehicle.pos.z, 75);
    }

    this.vehicle.step(
      dt,
      (this.onFoot || this.ridingWithPeerId || this.carriedByPeerId || this.timedWork) ? { throttle: 0, brake: 0, steer: 0, handbrake: true } : driveInput,
      this.world,
      this.weather.getGripModifier(),
      this.network.remotePlayers,
      this.weather.weather,
      { ice: this.cryptids.iceAuraStrength, quicksand: this.cryptids.quicksandDrag }
    );
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
      if (isMoving) {
        const camFwd = new THREE.Vector3(); this.camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
        const camRight = new THREE.Vector3(-camFwd.z, 0, camFwd.x);
        const dir = camFwd.multiplyScalar(moveF).add(camRight.multiplyScalar(moveS)).normalize();
        this.playerFoot.x += dir.x * spd * dt; this.playerFoot.z += dir.z * spd * dt;
        this.playerFoot.yaw = Math.atan2(dir.x, dir.z); this.playerFoot.walkPhase += dt * spd * 2.2;
      }
      this.playerFoot.y = this.world.getTerrainInfo(this.playerFoot.x, this.playerFoot.z, true).height;
      if (this.playerFoot.repairingTimer > 0) this.playerFoot.repairingTimer -= dt;
      this.localAvatar.userData.animate(this.playerFoot.walkPhase, isMoving, !!this.playerFoot.carryingCrate, this.playerFoot.repairingTimer > 0);
    }

    let ridingPeer = this.ridingWithPeerId ? this.network.remotePlayers.get(this.ridingWithPeerId) : null;
    if (this.ridingWithPeerId && !ridingPeer) { this.ridingWithPeerId = null; this.onFoot = true; this.localAvatar.visible = true; }
    if (ridingPeer) { this.playerFoot.x = ridingPeer.gx; this.playerFoot.y = ridingPeer.gy; this.playerFoot.z = ridingPeer.gz; }
    const focusGx = ridingPeer ? ridingPeer.gx : (this.onFoot ? this.playerFoot.x : this.vehicle.pos.x);
    const focusGz = ridingPeer ? ridingPeer.gz : (this.onFoot ? this.playerFoot.z : this.vehicle.pos.z);
    const focusGy = ridingPeer ? ridingPeer.gy : (this.onFoot ? this.playerFoot.y : this.vehicle.pos.y);
    const shift = this.world.checkFloatingOrigin(focusGx, focusGz);
    if (shift) { this.camPosSmooth.x += shift.dx; this.camPosSmooth.z += shift.dz; }
    this.world.updateChunks(focusGx, focusGz);

    this.world.updateFallingTrees(dt);
    if (this._winchPullNetCd > 0) this._winchPullNetCd = Math.max(0, this._winchPullNetCd - dt);
    if (this.entities && this.entities.updateWinchLine) {
      this.entities.updateWinchLine(this.vehicle, this.network.remotePlayers);
      if (this.entities.updateRemoteWinches) this.entities.updateRemoteWinches(this.vehicle, this.network.peerId, this.network.remotePlayers);
    }
    if (this.boats) {
      const boatIn = (this.boats.activeBoat && !this.ui.activeModal && !(this.startMenu && this.startMenu.isOpen)) ? {
        throttle: (this.keys.KeyW || this.keys.ArrowUp) ? 1 : 0,
        brake: (this.keys.KeyS || this.keys.ArrowDown) ? 1 : 0,
        steer: (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) - (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0),
        boost: !!(this.keys.ShiftLeft || this.keys.ShiftRight)
      } : null;
      this.boats.update(dt, boatIn, this.vehicle, this.particles, this.audio);
      if (this.boats.updateRemoteBoats) this.boats.updateRemoteBoats(dt, this.network.remotePlayers, this.particles);
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
    const smokeLvl = Math.max(0, (this.vehicle.coolantTemp - 112) / 18, (55 - engHp) / 55);
    this.vehicleRig.updateVisuals(dt, {
      wheelOffsets: this.vehicle.wheels.map((w) => w.visualOffsetY),
      wheelSpins: this.vehicle.wheels.map((w) => w.spinAngle),
      blownTires: this.vehicle.vState.blownTires,
      steerAngle: this.vehicle.steerAngle, camberDeg: this.vehicle.vState.tuning.camberDeg, toeDeg: this.vehicle.vState.tuning.toeDeg,
      headlights: this.vehicle.headlights, lightbar: this.vehicle.lightbar, hasLightbar: !!this.vehicle.vState.upgrades.ledLightbar, headlightL: this.vehicle.vState.health.headlightL, headlightR: this.vehicle.vState.health.headlightR, lightbarHp: this.vehicle.vState.health.lightbar, taillightL: this.vehicle.vState.health.taillightL, taillightR: this.vehicle.vState.health.taillightR, apsFlashTimer: this.apsFlashTimer, isSchreckensfurst: !!this.vehicle.spec.isSchreckensfurst, braking: this.vehicle.braking,
      reversing: this.vehicle.reversing, hazards: this.vehicle.hazards, hoodOpen: this.vehicle.hoodOpen,
      smokeLevel: Math.max(0, smokeLvl), dirtLevel: this.vehicle.vState.dirtLevel,
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
    }, { x: this.cryptids.sirenhead.gx, z: this.cryptids.sirenhead.gz });

    const focusLocal = this.world.toLocal(focusGx, focusGy, focusGz, new THREE.Vector3());
    this.weather.update(dt, focusLocal, this.audio);
    this.hazards.update(dt, this.vehicle, this.weather, this.particles, this.audio, this.ui, this.network);
    this.cryptids.update(dt, this.vehicle, this.weather, this.particles, this.audio, this.ui, this.network, this.hazards);
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
      const cHit = this.cryptids.applyCannonHit(gm.gx, gm.gy, gm.gz, "rlg140", this.audio, 140);
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
        const tq = new THREE.Quaternion().setFromEuler(new THREE.Euler(crp.trailer.p || 0, crp.trailer.yaw || 0, crp.trailer.r || 0, "YXZ"));
        const deckOff = new THREE.Vector3(0, 1.18, -0.15).applyQuaternion(tq);
        this.vehicle.pos.set(crp.trailer.x + deckOff.x, crp.trailer.y + deckOff.y, crp.trailer.z + deckOff.z);
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
      if (this.thermalMode !== 0) { this.thermalMode = 0; this._applyThermalVisuals(); }
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
        const camDir = new THREE.Vector3(); this.camera.getWorldDirection(camDir);
        const localAim = camDir.clone().applyQuaternion(this.vehicle.quat.clone().invert());
        const targetYaw = Math.atan2(localAim.x, localAim.z);
        let dy = targetYaw - this.btrTurretYaw;
        while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        this.turretSlewErrorDeg = Math.abs(dy * 180 / Math.PI);

        // v14.1S REALISTIC TURRET ROTATION SPEEDS (rad/s — heavy turrets traverse physically instead of snapping!)
        const is140T = (curVid === "pzkpfw_140a4");
        const fcsMult = (curVid === "t72" && this.vehicle.vState.upgrades.t72SeismicFcs) ? 1.42 : 1.0;
        const maxYawRate = is140T ? 0.70 : (curVid === "t72" ? (0.42 * fcsMult) : (isShilka ? 1.15 : (isBm21 ? 0.36 : 0.88)));
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
      const cHit = rk.isOwner ? this.cryptids.applyCannonHit(rk.gx, rk.gy, rk.gz, "rocket122", this.audio, 122) : { hit: false };
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

    const sightEl = document.getElementById("gunner-sight-overlay");
    if (sightEl) {
      const showSight = isArmed && this.mouseAimHeld;
      sightEl.classList.toggle("hidden", !showSight);
      if (showSight) {
        // Compute Live Laser Rangefinder distance!
        const cDir = new THREE.Vector3(); this.camera.getWorldDirection(cDir);
        const cOrig = new THREE.Vector3(this.camera.position.x + this.world.originX, this.camera.position.y, this.camera.position.z + this.world.originZ);
        let rngTxt = ">450m";
        for (let s = 12; s <= 450; s += 10) {
          const rx = cOrig.x + cDir.x * s, ry = cOrig.y + cDir.y * s, rz = cOrig.z + cDir.z * s;
          if (ry <= this.world.getTerrainInfo(rx, rz, false).height + 0.5) { rngTxt = s + "m"; break; }
        }
        const ammoEl = document.getElementById("gunner-ammo-readout");
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
            ammoEl.textContent = `COCKERILL 3105 • LRF: ${rngTxt}  |  ${shLbl} [${rld}]  |  7.62mm: ${vs.t72CoaxAmmo || 0}  |  ${thLbl} [6]`;
          } else if (curVid === "komodo_turret") {
            const vs = this.vehicle.vState;
            const thLbl = ["DAY", "FLIR THERMAL", "GREEN NVG"][this.thermalMode || 0];
            ammoEl.textContent = `CPWS GEN 2 • LRF: ${rngTxt}  |  30mm AUTOCANNON: ${vs.btrAmmo || 0} rds  |  ${thLbl} [6]`;
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
    this.cameraShake = Math.max(this.cameraShake * Math.exp(-5.0 * dt), this.cryptids.cameraShakeOut || 0);
    if (this.cryptids.empTrigger) {
      this.empGlitchTimer = Math.max(this.empGlitchTimer, this.cryptids.empTrigger.dur || 6.5);
      this.empKind = this.cryptids.empTrigger.kind || "sonic";
    }
    if (this.empGlitchTimer > 0) {
      this.empGlitchTimer = Math.max(0, this.empGlitchTimer - dt);
      if (this.empKind === "sonic") this.cameraShake = Math.max(this.cameraShake, Math.min(0.45, this.empGlitchTimer * 0.08));
    }
    const empEl = document.getElementById("emp-overlay");
    if (empEl) {
      empEl.classList.toggle("active", this.empGlitchTimer > 0);
      empEl.classList.toggle("rad", this.empKind === "radiation");
      empEl.classList.toggle("sonic", this.empKind === "sonic");
    }
    if (this.flareCount < 6 && this.world.getNearbyTownInteraction(this.vehicle.pos.x, this.vehicle.pos.z)) this.flareCount = 6;
    this.audio.updateEngine(this.vehicle.rpm, driveInput.throttle, this.vehicle.boostPsi, KK.ENGINES[this.vehicle.vState.engineId], this.vehicle.engineRunning, this.onFoot, this.weather.weather, !!this.vehicle.vState.upgrades.twinTurboKit, !!this.vehicle.spec.isTracked, this.vehicle.speedKmh, dt);
    const lPos = this.onFoot ? { x: this.playerFoot.x, y: this.playerFoot.y, z: this.playerFoot.z } : this.vehicle.pos;
    const lRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    this.audio.updateRemoteEngines(this.network.remotePlayers, lPos, lRight);

    if (this.waypoint) {
      const wy = this.world.getTerrainInfo(this.waypoint.x, this.waypoint.z, false).height;
      this.world.toLocal(this.waypoint.x, wy + 75, this.waypoint.z, this.wpBeacon.position);
      this.wpBeacon.visible = true;
    } else { this.wpBeacon.visible = false; }

    this.network.broadcastPlayerState(dt, this.vehicle, this.playerFoot, this.onFoot, this.trailer, this.wipersOn, !!this.timedWork, this.btrTurretYaw, this.carriedByPeerId, false, this.barrelHeat, this.p140RwsYaw, this.p140RwsPitch, this.btrAimPitch, this.autoBarrelHeat, this.boats ? this.boats.activeBoat : null);
    const lerpF = Math.min(1, dt * 12);
    for (const rp of this.network.remotePlayers.values()) {
      rp.gx += (rp.tx - rp.gx) * lerpF; rp.gy += (rp.ty - rp.gy) * lerpF; rp.gz += (rp.tz - rp.gz) * lerpF;
      if (rp.rig) {
        this.world.toLocal(rp.gx, rp.gy, rp.gz, rp.rig.root.position);
        const qCur = new THREE.Quaternion(rp.qx, rp.qy, rp.qz, rp.qw);
        qCur.slerp(new THREE.Quaternion(rp.tqx, rp.tqy, rp.tqz, rp.tqw), lerpF);
        rp.qx = qCur.x; rp.qy = qCur.y; rp.qz = qCur.z; rp.qw = qCur.w;
        rp.rig.root.quaternion.copy(qCur);
        rp.rig.baseColor.set(rp.paintColor || "#5b6d5b");
        rp.rig.updateVisuals(dt, {
          wheelOffsets: rp.wheelOffsets, wheelSpins: rp.wheelSpins, blownTires: rp.blownTires, steerAngle: rp.steerAngle,
          camberDeg: rp.camberDeg, toeDeg: 0, headlights: rp.headlights, lightbar: rp.lightbar, hasLightbar: rp.hasLightbar, headlightL: rp.headlightL, headlightR: rp.headlightR, wipersOn: rp.wipersOn, inCockpitCam: false, isEmpty: !!rp.onFoot, hasBtrTurret: !!rp.hasBtrTurret, turretYaw: rp.turretYaw || 0, gunPitch: rp.gunPitch || 0, rwsYaw: rp.rwsYaw !== undefined ? rp.rwsYaw : (rp.turretYaw || 0), rwsPitch: rp.rwsPitch || 0, autoBarrelHeat: rp.autoBarrelHeat || 0, t72Upgrades: { sturmKit: false }, isSchreckensfurst: rp.vehicleId === "pzkpfw_140a4",
          braking: rp.braking, reversing: false, hazards: rp.hazards, hoodOpen: false,
          smokeLevel: rp.smokeLevel, dirtLevel: rp.dirtLevel, backfireTimer: rp.backfireTimer,
          cargoTilt: 0, rideHeight: rp.rideHeight, thermalMode: this.thermalMode || 0, coolantTemp: rp.coolantTemp !== undefined ? rp.coolantTemp : 82, egtTemp: rp.egtTemp !== undefined ? rp.egtTemp : 320, barrelHeat: rp.barrelHeat || 0, speedKmh: Math.hypot(rp.vx || 0, rp.vz || 0) * 3.6
        });
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
        this.world.toLocal(rp.trailer.x, rp.trailer.y, rp.trailer.z, rp.trailerRig.root.position);
        rp.trailerRig.root.rotation.set(rp.trailer.p || 0, rp.trailer.yaw || 0, rp.trailer.r || 0, "YXZ");
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
    const vehUnderwater = (!this.onFoot && !this.vehicle.spec.amphibious && this.vehicle.inWaterDepth > 1.35);
    const isUnderwater = camUnderwater || vehUnderwater;
    if (this.vehicle.spec.isTracked && this.vehicle.vState.upgrades.t72Snorkel && this.vehicle.inWaterDepth > 1.2 && Math.random() < 0.45) {
      this.particles.emitFrostOrSand(this.vehicle.pos.x, this.vehicle.pos.y + 1.8, this.vehicle.pos.z, true, 2);
    }

    const uwEl = document.getElementById("underwater-overlay");
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
      sandwormActive: this.cryptids.sandwormActive
    });

    this.ui.updateWindshieldOverlay(dt, this);
    this.ui.updateHUD(this);
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
        const verStr = `KRASNO-KAMENKA OBLAST • ${KK.VERSION || "v14.3"}`;
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
        a.download = `krasno_kamenka_${KK.VERSION || "v14.3"}_${ts}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (!this.photoMode) this.ui.toast(`Screenshot saved (${KK.VERSION || "v14.3"})!`);
      } catch (err) {
        this.ui.toast("Screenshot failed: " + err.message, true);
      }
    }
  }

  _updateContextPrompt() {
    const el = document.getElementById("context-prompt");
    if (!el) return;
    let prompt = "";
    if (this.boats && this.boats.activeBoat) {
      const b = this.boats.activeBoat;
      const deckTxt = b.spec.maxCarMassKg > 0 ? (b.mountedCar ? " | [V] Unload Vehicle" : " | [V] Load Vehicle on Deck") : "";
      el.textContent = `⚓ ${b.spec.name} (${Math.round(b.speedKmh)} km/h) • [W/S] Throttle • [A/D] Rudder • [Shift] Boost${deckTxt} • [E] Disembark`;
      el.classList.remove("hidden");
      return;
    }
    if (this.boats) {
      const pxC = this.onFoot ? this.playerFoot.x : this.vehicle.pos.x;
      const pzC = this.onFoot ? this.playerFoot.z : this.vehicle.pos.z;
      const nb = this.boats.findNearbyBoat(pxC, pzC, 28);
      if (nb) {
        el.textContent = `[F] Board ${nb.boat.spec.name}`;
        el.classList.remove("hidden");
        return;
      }
      const np = this.boats.findNearbyPort(pxC, pzC, 44);
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
          prompt = `[E] Co-op Swap ${rf.rp.callsign}'s Blown ${rf.label} Tire (5s)!`;
        } else if (nearFrCar) prompt = `[F] Ride Shotgun with ${nearFrCar.callsign}  |  [E] Co-op Pit Crew${nearFrCar.repairing ? " (2x Boost!)" : ""}`;
        else if (bIdxP >= 0) prompt = `[E] Swap Blown ${this.vehicle.spec.wheels[bIdxP].id} Tire with Spare (${this.vehicle.vState.spareTires || 0} left)`;
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
        if (near.type === "garage") prompt = `[G] or [F] Open CPM2 Garage & Parts Shop (${near.town.name})`;
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
      const dist = (b.spec.len * 1.15 + 7.5) * this.camZoom;
      const yaw = b.yaw + this.camOrbitYaw;
      const h = (b.spec.len * 0.32 + 4.5) * this.camZoom;
      const camPos = new THREE.Vector3(
        focusLocal.x - Math.sin(yaw) * dist,
        focusLocal.y + h + Math.sin(this.camOrbitPitch) * dist * 0.55,
        focusLocal.z - Math.cos(yaw) * dist
      );
      this.camera.position.lerp(camPos, Math.min(1, dt * 7.5));
      this.camera.lookAt(focusLocal.x, focusLocal.y + 1.8, focusLocal.z);
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
        const targetPos = new THREE.Vector3(
          focusLocal.x - Math.sin(this.camOrbitYaw) * horiz,
          focusLocal.y + 1.6 + Math.sin(elev) * r,
          focusLocal.z - Math.cos(this.camOrbitYaw) * horiz
        );
        const gY = this.world.getTerrainInfo(targetPos.x + this.world.originX, targetPos.z + this.world.originZ, false).height + 0.65;
        if (targetPos.y < gY) targetPos.y = gY;
        this.camPosSmooth.lerp(targetPos, Math.min(1, dt * 10));
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
      const targetPos = new THREE.Vector3(
        focusLocal.x - Math.sin(this.camOrbitYaw) * horiz,
        focusLocal.y + 1.55 + Math.sin(elev) * r,
        focusLocal.z - Math.cos(this.camOrbitYaw) * horiz
      );
      const gY = this.world.getTerrainInfo(targetPos.x + this.world.originX, targetPos.z + this.world.originZ, false).height + 0.45;
      if (targetPos.y < gY) targetPos.y = gY;
      this.camPosSmooth.lerp(targetPos, Math.min(1, dt * 10));
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
    const targetFov = aimingGunner ? (isTankAim ? 28 : (isBm21Aim ? 46 : 32)) : 62;
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
    const desired = new THREE.Vector3(
      focusLocal.x - Math.sin(baseYaw) * horizDist,
      focusLocal.y + 1.75 + Math.sin(elev) * baseRadius,
      focusLocal.z - Math.cos(baseYaw) * horizDist
    );
    const groundY = this.world.getTerrainInfo(desired.x + this.world.originX, desired.z + this.world.originZ, false).height + 0.65;
    if (desired.y < groundY) desired.y = groundY;
    this.camPosSmooth.lerp(desired, Math.min(1, dt * 8.5));
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
