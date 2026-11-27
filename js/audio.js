// ============================================================================
// js/audio.js (v7) — Warm, Headphone-Safe 13-Engine Synth, Low-Pitch Turbine
// Breath, Crisp "STUTUTUTU" BOV Flutter & Master Safety Limiter!
// ============================================================================
window.KK = window.KK || {};

KK.AudioEngine = class AudioEngine {
  constructor() {
    this.ctx = null;
    this.started = false;
    this.remoteVoices = new Map();
    this.muted = false;
    this.volume = 0.55;
    this.prevThrottle = 0;
    this.prevBoost = 0;
    this.lastEngId = null;
    this.flutterCooldown = 0;
    this.birdTimer = 3.5;
    this.eerieTimer = 14.0;
    this.windPhase = 0;
    this.dreadPhase = 0;
    this.isUnderwater = false;
  }

  _makeWarmSaturation(amount = 6) {
    const n = 256, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      // Soft analog tanh saturation — adds warm harmonics without harsh digital buzzing!
      curve[i] = Math.tanh(x * (1.0 + amount * 0.14));
    }
    return curve;
  }

  init() {
    if (this.started) {
      if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.started = true;

    // ------------------------------------------------------------------------
    // HEADPHONE-SAFE MASTER BUS (Harshness Scoop + Warm Ceiling + Limiter)
    // Guarantees NOTHING is ever ear-splitting or fatiguing on headphones!
    // ------------------------------------------------------------------------
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume * 0.58;

    // Scoop out the fatiguing 2.8kHz–4.5kHz ear-piercing band
    this.masterNotch = this.ctx.createBiquadFilter();
    this.masterNotch.type = "peaking";
    this.masterNotch.frequency.value = 3400;
    this.masterNotch.Q.value = 1.0;
    this.masterNotch.gain.value = -7.5;

    // Warm smooth high-cut ceiling so high-frequency whine is impossible
    this.masterLP = this.ctx.createBiquadFilter();
    this.masterLP.type = "lowpass";
    this.masterLP.frequency.value = 3200;
    this.masterLP.Q.value = 0.65;

    // Soft dynamics compressor / limiter
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -16;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.008;
    this.compressor.release.value = 0.16;

    this.master.connect(this.masterNotch);
    this.masterNotch.connect(this.masterLP);
    this.masterLP.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    // v18.0 DEDICATED SATURATED WEAPON FX BUS (Bypasses muffled 3.2kHz engine LP so cannons & autocannons ROAR!)
    this.weaponBus = this.ctx.createGain();
    this.weaponBus.gain.value = this.volume * 0.92;
    this.weaponSat = this.ctx.createWaveShaper();
    {
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = Math.tanh(x * 2.4);
      }
      this.weaponSat.curve = curve;
      this.weaponSat.oversample = "2x";
    }
    this.weaponLP = this.ctx.createBiquadFilter();
    this.weaponLP.type = "lowpass";
    this.weaponLP.frequency.value = 7800;
    this.weaponLP.Q.value = 0.55;
    this.weaponBus.connect(this.weaponSat);
    this.weaponSat.connect(this.weaponLP);
    this.weaponLP.connect(this.compressor);

    // Pre-generate smooth white noise buffer (2s)
    const bufLen = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, bufLen, this.ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

    // ------------------------------------------------------------------------
    // WARM MULTI-LAYER ENGINE SYNTH (Sub Bass + Exhaust Body + Harmonic + Air)
    // ------------------------------------------------------------------------
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = "sine";      // Pure warm chesty bass fundamental
    this.bodyOsc = this.ctx.createOscillator();
    this.bodyOsc.type = "triangle"; // Warm rounded cylinder pulse
    this.growlOsc = this.ctx.createOscillator();
    this.growlOsc.type = "sawtooth"; // Exhaust overtone (heavily lowpass filtered!)

    this.subGain = this.ctx.createGain(); this.subGain.gain.value = 0.52;
    this.bodyGain = this.ctx.createGain(); this.bodyGain.gain.value = 0.42;
    this.growlGain = this.ctx.createGain(); this.growlGain.gain.value = 0.28;

    this.engShaper = this.ctx.createWaveShaper();
    this.engShaper.curve = this._makeWarmSaturation(5);

    this.engFilter = this.ctx.createBiquadFilter();
    this.engFilter.type = "lowpass";
    this.engFilter.frequency.value = 280;
    this.engFilter.Q.value = 1.2;

    // Gentle amplitude chop LFO for Boxer uneven rumble / V8 burble / Diesel chug
    this.pulseNode = this.ctx.createGain();
    this.pulseNode.gain.value = 1.0;
    this.wobbleOsc = this.ctx.createOscillator();
    this.wobbleOsc.type = "sine";
    this.wobbleOsc.frequency.value = 10;
    this.wobbleDepth = this.ctx.createGain();
    this.wobbleDepth.gain.value = 0.0;
    this.wobbleOsc.connect(this.wobbleDepth);
    this.wobbleDepth.connect(this.pulseNode.gain);
    this.wobbleOsc.start();

    this.engGain = this.ctx.createGain();
    this.engGain.gain.value = 0.0;

    this.subOsc.connect(this.subGain); this.subGain.connect(this.engShaper);
    this.bodyOsc.connect(this.bodyGain); this.bodyGain.connect(this.engShaper);
    this.growlOsc.connect(this.growlGain); this.growlGain.connect(this.engShaper);
    this.engShaper.connect(this.engFilter);
    this.engFilter.connect(this.pulseNode);
    this.pulseNode.connect(this.engGain);
    this.engGain.connect(this.master);

    this.subOsc.start();
    this.bodyOsc.start();
    this.growlOsc.start();

    // Mechanical Intake & Exhaust Air Rasp (replaces harsh buzz with organic engine breath!)
    this.intakeSrc = this.ctx.createBufferSource();
    this.intakeSrc.buffer = this.noiseBuf;
    this.intakeSrc.loop = true;
    this.intakeFilter = this.ctx.createBiquadFilter();
    this.intakeFilter.type = "bandpass";
    this.intakeFilter.frequency.value = 420;
    this.intakeFilter.Q.value = 1.4;
    this.intakeGain = this.ctx.createGain();
    this.intakeGain.gain.value = 0.0;
    this.intakeSrc.connect(this.intakeFilter);
    this.intakeFilter.connect(this.intakeGain);
    this.intakeGain.connect(this.master);
    this.intakeSrc.start();

    // ------------------------------------------------------------------------
    // LOW-FATIGUE TURBO SPOOL (Air-Rush Whoosh + Subtle Low-Mid Turbine Breath!)
    // NO piercing 3000-5000 Hz tinnitus sine tones!
    // ------------------------------------------------------------------------
    this.turboAirSrc = this.ctx.createBufferSource();
    this.turboAirSrc.buffer = this.noiseBuf;
    this.turboAirSrc.loop = true;
    this.turboAirFilter = this.ctx.createBiquadFilter();
    this.turboAirFilter.type = "bandpass";
    this.turboAirFilter.frequency.value = 780;
    this.turboAirFilter.Q.value = 2.4;
    this.turboAirGain = this.ctx.createGain();
    this.turboAirGain.gain.value = 0.0;
    this.turboAirSrc.connect(this.turboAirFilter);
    this.turboAirFilter.connect(this.turboAirGain);
    this.turboAirGain.connect(this.master);
    this.turboAirSrc.start();

    // Very soft, low-pitched turbine hum (420–920 Hz max, ultra-low volume so it NEVER whines!)
    this.turboHumOsc = this.ctx.createOscillator();
    this.turboHumOsc.type = "sine";
    this.turboHumOsc.frequency.value = 520;
    this.turboHumGain = this.ctx.createGain();
    this.turboHumGain.gain.value = 0.0;
    this.turboHumOsc.connect(this.turboHumGain);
    this.turboHumGain.connect(this.master);
    this.turboHumOsc.start();

    // Horn (warm dual-tone)
    this.hornOsc1 = this.ctx.createOscillator(); this.hornOsc2 = this.ctx.createOscillator();
    this.hornOsc1.type = "sawtooth"; this.hornOsc2.type = "sawtooth";
    this.hornOsc1.frequency.value = 310; this.hornOsc2.frequency.value = 388;
    this.hornFilter = this.ctx.createBiquadFilter(); this.hornFilter.type = "lowpass"; this.hornFilter.frequency.value = 950;
    this.hornGain = this.ctx.createGain(); this.hornGain.gain.value = 0.0;
    this.hornOsc1.connect(this.hornFilter); this.hornOsc2.connect(this.hornFilter);
    this.hornFilter.connect(this.hornGain); this.hornGain.connect(this.master);
    this.hornOsc1.start(); this.hornOsc2.start();

    // ------------------------------------------------------------------------
    // v15.2 DEDICATED PROCEDURAL MARINE ENGINE, HOVERCRAFT FAN & NAVAL FOGHORN SYNTH!
    this.boatOsc1 = this.ctx.createOscillator(); this.boatOsc1.type = "sawtooth"; this.boatOsc1.frequency.value = 65;
    this.boatOsc2 = this.ctx.createOscillator(); this.boatOsc2.type = "triangle"; this.boatOsc2.frequency.value = 130;
    this.boatFilt = this.ctx.createBiquadFilter(); this.boatFilt.type = "lowpass"; this.boatFilt.frequency.value = 340;
    this.boatGain = this.ctx.createGain(); this.boatGain.gain.value = 0.0;
    this.boatOsc1.connect(this.boatFilt); this.boatOsc2.connect(this.boatFilt);
    this.boatFilt.connect(this.boatGain); this.boatGain.connect(this.master);
    this.boatOsc1.start(); this.boatOsc2.start();

    this.boatNoiseSrc = this.ctx.createBufferSource(); this.boatNoiseSrc.buffer = this.noiseBuf; this.boatNoiseSrc.loop = true;
    this.boatNoiseFilt = this.ctx.createBiquadFilter(); this.boatNoiseFilt.type = "bandpass"; this.boatNoiseFilt.frequency.value = 260; this.boatNoiseFilt.Q.value = 0.85;
    this.boatNoiseGain = this.ctx.createGain(); this.boatNoiseGain.gain.value = 0.0;
    this.boatNoiseSrc.connect(this.boatNoiseFilt); this.boatNoiseFilt.connect(this.boatNoiseGain); this.boatNoiseGain.connect(this.master);
    this.boatNoiseSrc.start();

    this.fogOsc1 = this.ctx.createOscillator(); this.fogOsc1.type = "sawtooth"; this.fogOsc1.frequency.value = 78;
    this.fogOsc2 = this.ctx.createOscillator(); this.fogOsc2.type = "triangle"; this.fogOsc2.frequency.value = 117;
    this.fogFilt = this.ctx.createBiquadFilter(); this.fogFilt.type = "lowpass"; this.fogFilt.frequency.value = 360;
    this.fogGain = this.ctx.createGain(); this.fogGain.gain.value = 0.0;
    this.fogOsc1.connect(this.fogFilt); this.fogOsc2.connect(this.fogFilt);
    this.fogFilt.connect(this.fogGain); this.fogGain.connect(this.master);
    this.fogOsc1.start(); this.fogOsc2.start();

    // v14.1P DEDICATED DEEP V16 TANK DIESEL MONSTER SYNTH (MDV-16 1,600 HP!)
    // ------------------------------------------------------------------------
    this.v16Sub = this.ctx.createOscillator(); this.v16Sub.type = "sine"; this.v16Sub.frequency.value = 30;
    this.v16Growl = this.ctx.createOscillator(); this.v16Growl.type = "sawtooth"; this.v16Growl.frequency.value = 60;
    this.v16Harm = this.ctx.createOscillator(); this.v16Harm.type = "triangle"; this.v16Harm.frequency.value = 90;

    this.v16SubG = this.ctx.createGain(); this.v16SubG.gain.value = 1.05;
    this.v16GrowlG = this.ctx.createGain(); this.v16GrowlG.gain.value = 0.68;
    this.v16HarmG = this.ctx.createGain(); this.v16HarmG.gain.value = 0.36;

    this.v16Shaper = this.ctx.createWaveShaper();
    this.v16Shaper.curve = this._makeWarmSaturation(14);
    this.v16LP = this.ctx.createBiquadFilter();
    this.v16LP.type = "lowpass"; this.v16LP.frequency.value = 210; this.v16LP.Q.value = 2.2;

    this.v16MasterG = this.ctx.createGain(); this.v16MasterG.gain.value = 0.0;
    this.v16Sub.connect(this.v16SubG); this.v16SubG.connect(this.v16MasterG);
    this.v16Growl.connect(this.v16GrowlG); this.v16GrowlG.connect(this.v16Shaper);
    this.v16Harm.connect(this.v16HarmG); this.v16HarmG.connect(this.v16Shaper);
    this.v16Shaper.connect(this.v16LP); this.v16LP.connect(this.v16MasterG);
    this.v16MasterG.connect(this.master);
    this.v16Sub.start(); this.v16Growl.start(); this.v16Harm.start();

    this.v16Noise = this.ctx.createBufferSource(); this.v16Noise.buffer = this.noiseBuf; this.v16Noise.loop = true;
    this.v16NoiseBP = this.ctx.createBiquadFilter(); this.v16NoiseBP.type = "bandpass"; this.v16NoiseBP.frequency.value = 175; this.v16NoiseBP.Q.value = 0.9;
    this.v16NoiseG = this.ctx.createGain(); this.v16NoiseG.gain.value = 0.0;
    this.v16Noise.connect(this.v16NoiseBP); this.v16NoiseBP.connect(this.v16NoiseG); this.v16NoiseG.connect(this.master);
    this.v16Noise.start();

    // ------------------------------------------------------------------------
    // v14.3.1 ROARING IMPERIUM DREADNOUGHT WAR-HORN (Aggressive Snarling Brass
    // + 26Hz Gravelly Growl LFO + Throaty Roar Formant + Pressurized Blast!)
    // ------------------------------------------------------------------------
    this.dhSub   = this.ctx.createOscillator(); this.dhSub.type   = "sine";     this.dhSub.frequency.value   = 55.00;  // A1 tectonic sub
    this.dhRoot  = this.ctx.createOscillator(); this.dhRoot.type  = "sawtooth"; this.dhRoot.frequency.value  = 110.00; // A2 snarling brass root
    this.dhGrowl = this.ctx.createOscillator(); this.dhGrowl.type = "sawtooth"; this.dhGrowl.frequency.value = 108.15; // Detuned twin for roaring chorus
    this.dhFifth = this.ctx.createOscillator(); this.dhFifth.type = "sawtooth"; this.dhFifth.frequency.value = 164.81; // E3 power fifth
    this.dhDark  = this.ctx.createOscillator(); this.dhDark.type  = "sawtooth"; this.dhDark.frequency.value  = 233.08; // Bb3 menacing tension

    // 26 Hz gravelly roar LFO modulating brass bell cutoff for an angry roaring snarl!
    this.dhRoarLfo = this.ctx.createOscillator(); this.dhRoarLfo.type = "sine"; this.dhRoarLfo.frequency.value = 26.0;
    this.dhRoarDepth = this.ctx.createGain(); this.dhRoarDepth.gain.value = 240;

    this.dhBrassBus = this.ctx.createGain(); this.dhBrassBus.gain.value = 0.62;
    this.dhShaper = this.ctx.createWaveShaper(); this.dhShaper.curve = this._makeWarmSaturation(16);
    this.dhBell = this.ctx.createBiquadFilter(); this.dhBell.type = "lowpass"; this.dhBell.frequency.value = 980; this.dhBell.Q.value = 3.2;
    this.dhFormant = this.ctx.createBiquadFilter(); this.dhFormant.type = "peaking"; this.dhFormant.frequency.value = 420; this.dhFormant.Q.value = 1.8; this.dhFormant.gain.value = 8.5;

    // Throaty pressurized roar noise layer
    this.dhAir = this.ctx.createBufferSource(); this.dhAir.buffer = this.noiseBuf; this.dhAir.loop = true;
    this.dhAirBP = this.ctx.createBiquadFilter(); this.dhAirBP.type = "bandpass"; this.dhAirBP.frequency.value = 460; this.dhAirBP.Q.value = 1.25;
    this.dhAirG = this.ctx.createGain(); this.dhAirG.gain.value = 0.44;

    this.dhMasterG = this.ctx.createGain(); this.dhMasterG.gain.value = 0.0;

    const dhSubG = this.ctx.createGain(); dhSubG.gain.value = 0.82;
    const dhRootG = this.ctx.createGain(); dhRootG.gain.value = 0.62;
    const dhGrowlG = this.ctx.createGain(); dhGrowlG.gain.value = 0.56;
    const dhFifthG = this.ctx.createGain(); dhFifthG.gain.value = 0.46;
    const dhDarkG = this.ctx.createGain(); dhDarkG.gain.value = 0.34;

    this.dhSub.connect(dhSubG); dhSubG.connect(this.dhMasterG);
    this.dhRoot.connect(dhRootG); dhRootG.connect(this.dhBrassBus);
    this.dhGrowl.connect(dhGrowlG); dhGrowlG.connect(this.dhBrassBus);
    this.dhFifth.connect(dhFifthG); dhFifthG.connect(this.dhBrassBus);
    this.dhDark.connect(dhDarkG); dhDarkG.connect(this.dhBrassBus);
    this.dhRoarLfo.connect(this.dhRoarDepth); this.dhRoarDepth.connect(this.dhBell.frequency);

    this.dhBrassBus.connect(this.dhShaper);
    this.dhShaper.connect(this.dhBell);
    this.dhBell.connect(this.dhFormant);
    this.dhFormant.connect(this.dhMasterG);
    this.dhAir.connect(this.dhAirBP); this.dhAirBP.connect(this.dhAirG); this.dhAirG.connect(this.dhMasterG);
    this.dhMasterG.connect(this.master);

    this.dhSub.start(); this.dhRoot.start(); this.dhGrowl.start(); this.dhFifth.start(); this.dhDark.start(); this.dhRoarLfo.start(); this.dhAir.start();

    // Ambient Rain
    this.rainSrc = this.ctx.createBufferSource();
    this.rainSrc.buffer = this.noiseBuf;
    this.rainSrc.loop = true;
    this.rainFilter = this.ctx.createBiquadFilter();
    this.rainFilter.type = "bandpass";
    this.rainFilter.frequency.value = 900;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0.0;
    this.rainSrc.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    this.rainSrc.start();

    // v11.5 AMBIENT WIND, RIVER WATER BABBLE, VOLCANIC HUM & UNDERWATER!
    this.windSrc = this.ctx.createBufferSource();
    this.windSrc.buffer = this.noiseBuf; this.windSrc.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass"; this.windFilter.frequency.value = 340; this.windFilter.Q.value = 1.8;
    this.windGain = this.ctx.createGain(); this.windGain.gain.value = 0.0;
    this.windSrc.connect(this.windFilter); this.windFilter.connect(this.windGain); this.windGain.connect(this.master);
    this.windSrc.start();

    this.riverSrc = this.ctx.createBufferSource();
    this.riverSrc.buffer = this.noiseBuf; this.riverSrc.loop = true;
    this.riverFilter = this.ctx.createBiquadFilter();
    this.riverFilter.type = "bandpass"; this.riverFilter.frequency.value = 680; this.riverFilter.Q.value = 0.9;
    this.riverGain = this.ctx.createGain(); this.riverGain.gain.value = 0.0;
    this.riverSrc.connect(this.riverFilter); this.riverFilter.connect(this.riverGain); this.riverGain.connect(this.master);
    this.riverSrc.start();

    this.envSubOsc = this.ctx.createOscillator();
    this.envSubOsc.type = "sine"; this.envSubOsc.frequency.value = 54;
    this.envSubGain = this.ctx.createGain(); this.envSubGain.gain.value = 0.0;
    this.envSubOsc.connect(this.envSubGain); this.envSubGain.connect(this.master);
    this.envSubOsc.start();

    this.sandSrc = this.ctx.createBufferSource();
    this.sandSrc.buffer = this.noiseBuf; this.sandSrc.loop = true;
    this.sandFilter = this.ctx.createBiquadFilter();
    this.sandFilter.type = "bandpass"; this.sandFilter.frequency.value = 1150; this.sandFilter.Q.value = 1.1;
    this.sandGain = this.ctx.createGain(); this.sandGain.gain.value = 0.0;
    this.sandSrc.connect(this.sandFilter); this.sandFilter.connect(this.sandGain); this.sandGain.connect(this.master);
    this.sandSrc.start();

    // HURRICANE HOWL & SUB-BASS PRESSURE RUMBLE
    this.hurrWindSrc = this.ctx.createBufferSource();
    this.hurrWindSrc.buffer = this.noiseBuf; this.hurrWindSrc.loop = true;
    this.hurrWindBP = this.ctx.createBiquadFilter();
    this.hurrWindBP.type = "bandpass"; this.hurrWindBP.frequency.value = 380; this.hurrWindBP.Q.value = 2.4;
    this.hurrWindGain = this.ctx.createGain(); this.hurrWindGain.gain.value = 0.0;
    this.hurrWindSrc.connect(this.hurrWindBP); this.hurrWindBP.connect(this.hurrWindGain); this.hurrWindGain.connect(this.master);
    this.hurrWindSrc.start();

    this.hurrSubSrc = this.ctx.createBufferSource();
    this.hurrSubSrc.buffer = this.noiseBuf; this.hurrSubSrc.loop = true;
    this.hurrSubLP = this.ctx.createBiquadFilter();
    this.hurrSubLP.type = "lowpass"; this.hurrSubLP.frequency.value = 110; this.hurrSubLP.Q.value = 1.4;
    this.hurrSubGain = this.ctx.createGain(); this.hurrSubGain.gain.value = 0.0;
    this.hurrSubSrc.connect(this.hurrSubLP); this.hurrSubLP.connect(this.hurrSubGain); this.hurrSubGain.connect(this.master);
    this.hurrSubSrc.start();

    // ABYSSAL SEA DREAD DRONE (38-54 Hz beating thalassophobia sub-oscillators)
    this.dreadOsc1 = this.ctx.createOscillator();
    this.dreadOsc1.type = "sine"; this.dreadOsc1.frequency.value = 41.0;
    this.dreadOsc2 = this.ctx.createOscillator();
    this.dreadOsc2.type = "triangle"; this.dreadOsc2.frequency.value = 42.3;
    this.dreadLP = this.ctx.createBiquadFilter();
    this.dreadLP.type = "lowpass"; this.dreadLP.frequency.value = 115; this.dreadLP.Q.value = 1.2;
    this.dreadGain = this.ctx.createGain(); this.dreadGain.gain.value = 0.0;
    this.dreadOsc1.connect(this.dreadLP);
    this.dreadOsc2.connect(this.dreadLP);
    this.dreadLP.connect(this.dreadGain);
    this.dreadGain.connect(this.master);
    this.dreadOsc1.start();
    this.dreadOsc2.start();

    // 5. CONTINUOUS SIREN HEAD DUAL-HORN VOICE (Unbroken eerie air-raid wail morphing by mood!)
    this.shPhase = 0;
    this.shOscA = this.ctx.createOscillator(); this.shOscA.type = "sawtooth"; this.shOscA.frequency.value = 340;
    this.shOscB = this.ctx.createOscillator(); this.shOscB.type = "sawtooth"; this.shOscB.frequency.value = 415;
    this.shSub  = this.ctx.createOscillator(); this.shSub.type  = "triangle"; this.shSub.frequency.value  = 110;
    this.shStatic = this.ctx.createBufferSource(); this.shStatic.buffer = this.noiseBuf; this.shStatic.loop = true;

    this.shShaper = this.ctx.createWaveShaper();
    const shCurve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; shCurve[i] = Math.tanh(x * 3.4); }
    this.shShaper.curve = shCurve;

    this.shBand = this.ctx.createBiquadFilter();
    this.shBand.type = "bandpass"; this.shBand.frequency.value = 740; this.shBand.Q.value = 1.6;
    this.shLow = this.ctx.createBiquadFilter();
    this.shLow.type = "lowpass"; this.shLow.frequency.value = 1600;

    this.shGain = this.ctx.createGain(); this.shGain.gain.value = 0.0;
    this.shStatGain = this.ctx.createGain(); this.shStatGain.gain.value = 0.0;
    this.shStatFlt = this.ctx.createBiquadFilter(); this.shStatFlt.type = "bandpass"; this.shStatFlt.frequency.value = 1250; this.shStatFlt.Q.value = 2.4;

    this.shOscA.connect(this.shShaper);
    this.shOscB.connect(this.shShaper);
    this.shSub.connect(this.shShaper);
    this.shShaper.connect(this.shBand);
    this.shBand.connect(this.shLow);
    this.shLow.connect(this.shGain);
    this.shGain.connect(this.master);

    this.shStatic.connect(this.shStatFlt);
    this.shStatFlt.connect(this.shStatGain);
    this.shStatGain.connect(this.master);

    this.shOscA.start(); this.shOscB.start(); this.shSub.start(); this.shStatic.start();
  }

  updateSirenHeadContinuous(dt, state, dist) {
    if (!this.started || !this.shGain) return;
    const t = this.ctx.currentTime;
    if (this.muted || !state || state === "dormant" || dist > 560) {
      this.shGain.gain.setTargetAtTime(0.0, t, 0.25);
      this.shStatGain.gain.setTargetAtTime(0.0, t, 0.25);
      return;
    }

    const prox = Math.pow(Math.max(0, 1.0 - dist / 560), 1.35);
    let freqA = 340, freqB = 415, gainTarget = 0, statTarget = 0, lowCut = 900 + prox * 1700;

    if (state === "distant_broadcast") {
      // MOOD 1 — EERIE DISTANT CIVIL-DEFENSE DRONE (slow ghostly swell + haunting pitch drift!)
      this.shPhase += dt * 0.48;
      const swell = 0.5 + 0.5 * Math.sin(this.shPhase);
      const drift = Math.sin(this.shPhase * 3.1) * 14 + Math.sin(this.shPhase * 7.3) * 5;
      freqA = 270 + swell * 135 + drift;
      freqB = freqA * 1.19 + Math.cos(this.shPhase * 2.2) * 8;
      gainTarget = (0.15 + swell * 0.15) * Math.max(0.28, prox);
      statTarget = (0.08 + (1 - swell) * 0.06) * Math.max(0.28, prox);
    } else if (state === "stalk") {
      // MOOD 2 — CREEPY ALTERNATING TWO-TONE WARBLE (warped Soviet emergency broadcast!)
      this.shPhase += dt * 1.65;
      const hiLo = Math.tanh(Math.sin(this.shPhase) * 3.5);
      const warp = Math.sin(this.shPhase * 5.7) * 11;
      freqA = 395 + hiLo * 105 + warp;
      freqB = freqA * 1.24 - warp * 0.6;
      gainTarget = (0.30 + 0.08 * Math.abs(hiLo)) * Math.max(0.35, prox);
      statTarget = 0.14 * Math.max(0.35, prox);
    } else if (state === "strike") {
      // MOOD 3 — FRANTIC SCREAMING AIR-RAID TORNADO SIREN (Dominates rain & engines!)
      this.shPhase += dt * 2.45;
      const wail = 0.5 + 0.5 * Math.sin(this.shPhase);
      const trem = Math.sin(this.shPhase * 11.0) * 18;
      freqA = 285 + wail * 430 + trem;
      freqB = freqA * 1.18 + Math.sin(this.shPhase * 4.3) * 26;
      gainTarget = (0.46 + wail * 0.16) * Math.max(0.45, prox);
      statTarget = 0.22 * Math.max(0.45, prox);
      lowCut = 1500 + prox * 1500;
    } else {
      // Fleeing — dying descending power-down siren groan!
      this.shPhase += dt * 0.8;
      freqA = 240 + Math.sin(this.shPhase) * 45;
      freqB = freqA * 1.14;
      gainTarget = 0.18 * prox;
      statTarget = 0.08 * prox;
    }

    this.shOscA.frequency.setTargetAtTime(Math.max(120, freqA), t, 0.045);
    this.shOscB.frequency.setTargetAtTime(Math.max(140, freqB), t, 0.045);
    this.shSub.frequency.setTargetAtTime(Math.max(55, freqA * 0.35), t, 0.06);
    this.shBand.frequency.setTargetAtTime(Math.max(380, freqA * 1.45), t, 0.06);
    this.shLow.frequency.setTargetAtTime(lowCut, t, 0.08);
    this.shGain.gain.setTargetAtTime(Math.min(0.60, gainTarget), t, 0.08);
    this.shStatGain.gain.setTargetAtTime(Math.min(0.26, statTarget), t, 0.08);
  }

  // v18.0.1 White-noise buffer helper for all cannon, autocannon, clang, whistle & cook-off synths!
  _noiseBuffer(dur = 0.5) {
    if (!this.ctx) return null;
    const len = Math.max(256, Math.floor(this.ctx.sampleRate * Math.max(0.05, dur)));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  // v18.0 TERRIFYING SATURATED MG / AUTOCANNON SYNTH (12.7mm / 14.5mm / 30mm / 40mm)
  playKPVTShot(caliberMm = 14.5) {
    if (!this.ctx || !this.master || this.muted) return;
    const out = this.weaponBus || this.master;
    const now = this.ctx.currentTime;
    const cal = Math.max(12, Math.min(45, caliberMm || 14.5));
    const scale = Math.pow(cal / 14.5, 0.45);
    const vol = Math.min(1.45, 0.78 * scale);

    // 1. Violent supersonic crack / propellant bark
    const nBuf = this._noiseBuffer(0.18 * scale);
    const nSrc = this.ctx.createBufferSource(); nSrc.buffer = nBuf;
    const nBp = this.ctx.createBiquadFilter(); nBp.type = "bandpass";
    nBp.frequency.setValueAtTime(Math.max(950, 2600 - cal * 32), now);
    nBp.frequency.exponentialRampToValueAtTime(340, now + 0.14 * scale);
    nBp.Q.value = 0.65;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol * 1.15, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16 * scale);
    nSrc.connect(nBp); nBp.connect(nGain); nGain.connect(out);
    nSrc.start(now);

    // 2. Heavy receiver chest-punch
    const thump = this.ctx.createOscillator(); thump.type = "sawtooth";
    thump.frequency.setValueAtTime(Math.max(125, 240 - cal * 2.4), now);
    thump.frequency.exponentialRampToValueAtTime(32, now + 0.14 * scale);
    const tLp = this.ctx.createBiquadFilter(); tLp.type = "lowpass"; tLp.frequency.value = 460;
    const tGain = this.ctx.createGain();
    tGain.gain.setValueAtTime(vol * 1.10, now);
    tGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15 * scale);
    thump.connect(tLp); tLp.connect(tGain); tGain.connect(out);
    thump.start(now); thump.stop(now + 0.16 * scale);

    // 3. Outdoor field slap-echo tail
    const echoBuf = this._noiseBuffer(0.28 * scale);
    const echoSrc = this.ctx.createBufferSource(); echoSrc.buffer = echoBuf;
    const eLp = this.ctx.createBiquadFilter(); eLp.type = "lowpass"; eLp.frequency.value = 620;
    const eGain = this.ctx.createGain();
    eGain.gain.setValueAtTime(0.001, now + 0.05);
    eGain.gain.linearRampToValueAtTime(vol * 0.34, now + 0.08);
    eGain.gain.exponentialRampToValueAtTime(0.001, now + 0.30 * scale);
    echoSrc.connect(eLp); eLp.connect(eGain); eGain.connect(out);
    echoSrc.start(now + 0.05);
  }

  // v18.0 APOCALYPTIC REALISTIC "KRAK-THOOM!" TANK CANNON BLAST (Caliber-scaled 105mm / 125mm / 140mm / 155mm!)
  playTank125mmBlast(caliberMm = 125) {
    if (!this.ctx || !this.master || this.muted) return;
    const out = this.weaponBus || this.master;
    const now = this.ctx.currentTime;
    const cal = Math.max(90, Math.min(160, caliberMm || 125));
    const cScale = Math.pow(cal / 125.0, 0.85);
    const peak = Math.min(1.65, 1.15 * cScale);

    // 1. STAGE 1 ("KRAK!"): Violent saturated supersonic muzzle shockwave (0–95ms)
    const crackBuf = this._noiseBuffer(0.18);
    const crackSrc = this.ctx.createBufferSource(); crackSrc.buffer = crackBuf;
    const crackBp = this.ctx.createBiquadFilter(); crackBp.type = "bandpass";
    crackBp.frequency.setValueAtTime(2800 / Math.sqrt(cScale), now);
    crackBp.frequency.exponentialRampToValueAtTime(420, now + 0.12);
    crackBp.Q.value = 0.55;
    const crackGain = this.ctx.createGain();
    crackGain.gain.setValueAtTime(peak * 1.45, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    crackSrc.connect(crackBp); crackBp.connect(crackGain); crackGain.connect(out);
    crackSrc.start(now);

    // 2. STAGE 2 ("THOOM!"): Chest-crushing dual-oscillator sub-bass pressure wave (12ms–950ms)
    const sub1 = this.ctx.createOscillator(); sub1.type = "sine";
    sub1.frequency.setValueAtTime(145 / Math.sqrt(cScale), now + 0.01);
    sub1.frequency.exponentialRampToValueAtTime(24, now + 0.78 * cScale);
    const s1Gain = this.ctx.createGain();
    s1Gain.gain.setValueAtTime(0.001, now);
    s1Gain.gain.linearRampToValueAtTime(peak * 1.45, now + 0.022);
    s1Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.92 * cScale);
    sub1.connect(s1Gain); s1Gain.connect(out);
    sub1.start(now); sub1.stop(now + 0.96 * cScale);

    const sub2 = this.ctx.createOscillator(); sub2.type = "triangle";
    sub2.frequency.setValueAtTime(92 / Math.sqrt(cScale), now + 0.015);
    sub2.frequency.exponentialRampToValueAtTime(28, now + 0.52 * cScale);
    const s2Gain = this.ctx.createGain();
    s2Gain.gain.setValueAtTime(peak * 0.95, now + 0.015);
    s2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.56 * cScale);
    sub2.connect(s2Gain); s2Gain.connect(out);
    sub2.start(now + 0.015); sub2.stop(now + 0.60 * cScale);

    // 3. STAGE 3: Massive roaring blast body + twin rolling mountain slap-echoes!
    const roarBuf = this._noiseBuffer(1.75 * cScale);
    const roarSrc = this.ctx.createBufferSource(); roarSrc.buffer = roarBuf;
    const roarLp = this.ctx.createBiquadFilter(); roarLp.type = "lowpass";
    roarLp.frequency.setValueAtTime(880, now + 0.015);
    roarLp.frequency.exponentialRampToValueAtTime(82, now + 1.45 * cScale);
    const roarGain = this.ctx.createGain();
    roarGain.gain.setValueAtTime(0.001, now);
    roarGain.gain.linearRampToValueAtTime(peak * 1.35, now + 0.024);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.65 * cScale);
    roarSrc.connect(roarLp); roarLp.connect(roarGain); roarGain.connect(out);
    roarSrc.start(now);

    for (const [delay, amp, cut] of [[0.16, 0.48, 360], [0.40, 0.26, 220]]) {
      const eBuf = this._noiseBuffer(0.95 * cScale);
      const eSrc = this.ctx.createBufferSource(); eSrc.buffer = eBuf;
      const eLp = this.ctx.createBiquadFilter(); eLp.type = "lowpass"; eLp.frequency.value = cut;
      const eG = this.ctx.createGain();
      eG.gain.setValueAtTime(0.001, now + delay);
      eG.gain.linearRampToValueAtTime(peak * amp, now + delay + 0.045);
      eG.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.88 * cScale);
      eSrc.connect(eLp); eLp.connect(eG); eG.connect(out);
      eSrc.start(now + delay);
    }

    // 4. Heavy steel breech slam / recoil ring
    const ring = this.ctx.createOscillator(); ring.type = "triangle";
    ring.frequency.setValueAtTime(460 / cScale, now + 0.015);
    ring.frequency.exponentialRampToValueAtTime(210 / cScale, now + 0.30);
    const ringG = this.ctx.createGain();
    ringG.gain.setValueAtTime(peak * 0.28, now + 0.015);
    ringG.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    ring.connect(ringG); ringG.connect(out);
    ring.start(now + 0.015); ring.stop(now + 0.34);
  }

  playTankAutoloader() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;

    const clank = (offset, f0, f1, dur, vol = 0.22) => {
      const st = t + offset;
      const osc = this.ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(f0, st); osc.frequency.exponentialRampToValueAtTime(f1, st + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + dur + 0.02);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + dur + 0.03);

      const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = f0 * 2.1; f.Q.value = 4.0;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.75, st); ng.gain.exponentialRampToValueAtTime(0.001, st + dur * 0.8);
      n.connect(f); f.connect(ng); ng.connect(this.master); n.start(st); n.stop(st + dur);
    };

    const motorWhir = (offset, dur, fStart, fEnd, vol = 0.11) => {
      const st = t + offset;
      const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(fStart, st); osc.frequency.linearRampToValueAtTime(fEnd, st + dur);
      const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = fStart * 2.6; flt.Q.value = 2.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(vol, st + 0.12);
      g.gain.setValueAtTime(vol, st + dur - 0.14); g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      osc.connect(flt); flt.connect(g); g.connect(this.master); osc.start(st); osc.stop(st + dur + 0.04);
    };

    // Stage 1 (0.45s): Breech slides open + steel stub baseplate ejects out rear hatch (*CLANG-PING!*)
    clank(0.45, 580, 190, 0.18, 0.26);
    clank(0.72, 920, 480, 0.14, 0.16);

    // Stage 2 (1.25s - 2.65s): Rotary Carousel Electric Hydraulic Drive rotates next cassette!
    motorWhir(1.25, 1.40, 145, 225, 0.13);
    clank(2.65, 340, 140, 0.14, 0.22); // Cassette index lock!

    // Stage 3 (2.85s - 4.15s): Vertical Lifting Arm hoists 2-piece 125mm shell to breech!
    motorWhir(2.85, 1.25, 220, 310, 0.11);
    clank(4.15, 420, 165, 0.15, 0.24); // Lifting tray locks into alignment!

    // Stage 4 (4.40s - 5.45s): Chain Rammer drives projectile + propellant charge into chamber!
    motorWhir(4.40, 0.45, 280, 360, 0.10);
    clank(4.85, 310, 95,  0.18, 0.30); // Projectile seated (*THUNK!*)
    motorWhir(5.05, 0.42, 260, 330, 0.10);
    clank(5.48, 280, 88,  0.20, 0.32); // Propellant charge rammed home!

    // Stage 5 (5.95s): Heavy steel breech wedge slams shut + READY electronic beep!
    clank(5.95, 520, 140, 0.22, 0.34);
    const beep = this.ctx.createOscillator(); beep.type = "sine";
    beep.frequency.setValueAtTime(1040, t + 6.32);
    const bg = this.ctx.createGain();
    bg.gain.setValueAtTime(0.001, t + 6.32); bg.gain.linearRampToValueAtTime(0.11, t + 6.34);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 6.52);
    beep.connect(bg); bg.connect(this.master); beep.start(t + 6.32); beep.stop(t + 6.55);
  }

  playSmokePop() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // 4 rapid 81mm Tucha mortar pops!
    for (let i = 0; i < 4; i++) {
      const st = t + i * 0.11;
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(165 + i * 12, st); osc.frequency.exponentialRampToValueAtTime(48, st + 0.18);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.20);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + 0.22);
    }
  }

  playThermalClick() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // Crisp military FLIR / NVG optic power-on whine!
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(620, t); osc.frequency.exponentialRampToValueAtTime(2150, t + 0.28);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.30);
    osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 0.32);
  }

  // UVB-76 "THE BUZZER" — Faint Soviet Military Shortwave Numbers-Station Signal (< 3,000 m of Secret Camp!)
  // Mostly masked by a running engine; kill ignition [I] to triangulate hot/cold by ear!
  // ICONIC SOVIET BM-21 "GRAD" / KATYUSHA SCREECHING 122mm ROCKET LAUNCH!
  // v14.3.2 LOUD, SCARY, NATURAL BM-21 GRAD 122mm ROCKET LAUNCH ("Stalin's Organ" Tearing Roar + Tube Ignition!)
  playKatyushaRocket() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const jit = (Math.random() - 0.5) * 0.14;

    // 1. Violent steel launch-tube ignition pressure THUMP!
    const thump = this.ctx.createOscillator(); thump.type = "sine";
    thump.frequency.setValueAtTime(112 * (1 + jit), t);
    thump.frequency.exponentialRampToValueAtTime(24, t + 0.24);
    const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.85, t); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    thump.connect(tg); tg.connect(this.master); thump.start(t); thump.stop(t + 0.30);

    // 2. Massive tearing solid-fuel rocket exhaust roar (heavy saturated noise sweeping through metallic tube resonance!)
    const roar = this.ctx.createBufferSource(); roar.buffer = this.noiseBuf; roar.loop = true;
    const rShaper = this.ctx.createWaveShaper(); rShaper.curve = this._makeWarmSaturation(10);
    const rBand = this.ctx.createBiquadFilter(); rBand.type = "bandpass"; rBand.Q.value = 0.72;
    rBand.frequency.setValueAtTime(420, t);
    rBand.frequency.exponentialRampToValueAtTime(1850 * (1 + jit), t + 0.16);
    rBand.frequency.exponentialRampToValueAtTime(340, t + 1.55);
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.02, t);
    rg.gain.linearRampToValueAtTime(0.95, t + 0.045);
    rg.gain.setValueAtTime(0.82, t + 0.38);
    rg.gain.exponentialRampToValueAtTime(0.001, t + 1.62);
    roar.connect(rBand); rBand.connect(rShaper); rShaper.connect(rg); rg.connect(this.master);
    roar.start(t); roar.stop(t + 1.68);

    // 3. Signature eerie BM-21 / Katyusha metallic rail-shriek (organic dual-formant air scream, NOT a laser!)
    const scream = this.ctx.createBufferSource(); scream.buffer = this.noiseBuf; scream.loop = true;
    const sBP = this.ctx.createBiquadFilter(); sBP.type = "bandpass"; sBP.Q.value = 5.2;
    sBP.frequency.setValueAtTime(780 * (1 + jit), t);
    sBP.frequency.exponentialRampToValueAtTime(1380 * (1 + jit), t + 0.20);
    sBP.frequency.exponentialRampToValueAtTime(520, t + 1.25);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.01, t);
    sg.gain.linearRampToValueAtTime(0.62, t + 0.07);
    sg.gain.exponentialRampToValueAtTime(0.001, t + 1.32);
    scream.connect(sBP); sBP.connect(sg); sg.connect(this.master);
    scream.start(t); scream.stop(t + 1.36);

    // 4. Low supersonic air-rip body wave
    const lowAir = this.ctx.createBufferSource(); lowAir.buffer = this.noiseBuf; lowAir.loop = true;
    const lLP = this.ctx.createBiquadFilter(); lLP.type = "lowpass"; lLP.frequency.value = 260;
    const lg = this.ctx.createGain();
    lg.gain.setValueAtTime(0.74, t); lg.gain.exponentialRampToValueAtTime(0.001, t + 1.45);
    lowAir.connect(lLP); lLP.connect(lg); lg.connect(this.master);
    lowAir.start(t); lowAir.stop(t + 1.50);
  }

  // v14.3.2 DEVASTATING 122mm GRAD ARTILLERY DETONATION + ROLLING VALLEY THUNDER ECHO!
  playArtilleryExplosion(distFactor = 1.0) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const v = Math.max(0.14, Math.min(1.0, distFactor));

    // Supersonic detonation whip-crack
    const cr = this.ctx.createBufferSource(); cr.buffer = this.noiseBuf;
    const cf = this.ctx.createBiquadFilter(); cf.type = "highpass"; cf.frequency.value = 1100;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.85 * v, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    cr.connect(cf); cf.connect(cg); cg.connect(this.master); cr.start(t); cr.stop(t + 0.18);

    // Tectonic 122mm HE sub-bass shockwave
    const sub = this.ctx.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(88, t); sub.frequency.exponentialRampToValueAtTime(15, t + 1.35);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.96 * v, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
    sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t + 1.60);

    // Primary blast roar + delayed rolling mountain echo
    for (const [del, f0, f1, dur, vol] of [[0.0, 2200, 120, 1.95, 0.92 * v], [0.42, 620, 80, 2.25, 0.42 * v]]) {
      const st = t + del;
      const roar = this.ctx.createBufferSource(); roar.buffer = this.noiseBuf;
      const rf = this.ctx.createBiquadFilter(); rf.type = "lowpass";
      rf.frequency.setValueAtTime(f0, st); rf.frequency.exponentialRampToValueAtTime(f1, st + dur);
      const rg = this.ctx.createGain();
      rg.gain.setValueAtTime(0.01, st); rg.gain.linearRampToValueAtTime(vol, st + 0.03);
      rg.gain.exponentialRampToValueAtTime(0.001, st + dur + 0.08);
      roar.connect(rf); rf.connect(rg); rg.connect(this.master); roar.start(st); roar.stop(st + dur + 0.12);
    }
  }

  // v18.0 TERRIFYING QUAD-23mm SHILKA AUTOCANNON ROAR!
  playShilka23mm() {
    this.playKPVTShot(25);
  }

  // v17.8.4 THUNDEROUS 140mm SCHRECKENSFURST KRAK-THOOM!
  play140mmEtcBlast() {
    this.playTank125mmBlast(148);
  }

  playLinearAutoloader() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const stepClank = (off, f0, f1, dur, vol = 0.28) => {
      const st = t + off;
      const o = this.ctx.createOscillator(); o.type = "triangle";
      o.frequency.setValueAtTime(f0, st); o.frequency.exponentialRampToValueAtTime(f1, st + dur);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, st); g.gain.exponentialRampToValueAtTime(0.001, st + dur + 0.03);
      o.connect(g); g.connect(this.master); o.start(st); o.stop(st + dur + 0.04);
    };
    const servo = (off, dur, f0, f1, vol = 0.14) => {
      const st = t + off;
      const o = this.ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(f0, st); o.frequency.linearRampToValueAtTime(f1, st + dur);
      const fl = this.ctx.createBiquadFilter(); fl.type = "bandpass"; fl.frequency.value = f0 * 2.2; fl.Q.value = 3.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(vol, st + 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, st + dur);
      o.connect(fl); fl.connect(g); g.connect(this.master); o.start(st); o.stop(st + dur + 0.03);
    };
    // 1. Pneumatic breech unlock hiss + spent 140mm stub ejection clatter
    const hiss = this.ctx.createBufferSource(); hiss.buffer = this.noiseBuf;
    const hf = this.ctx.createBiquadFilter(); hf.type = "bandpass"; hf.frequency.value = 2100; hf.Q.value = 2.0;
    const hg = this.ctx.createGain();
    hg.gain.setValueAtTime(0.24, t + 0.22); hg.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    hiss.connect(hf); hf.connect(hg); hg.connect(this.master); hiss.start(t + 0.22); hiss.stop(t + 0.60);
    stepClank(0.32, 720, 195, 0.18, 0.32);

    // 2. Bustle ready-rack linear magazine index servo
    servo(0.85, 1.15, 220, 410, 0.15);
    stepClank(2.02, 460, 155, 0.15, 0.26);

    // 3. High-pressure hydraulic linear rammer drives 140mm round into chamber
    servo(2.25, 1.32, 290, 560, 0.17);

    // 4. Colossal steel vertical sliding wedge breech slam-lock
    stepClank(3.62, 360, 78, 0.26, 0.42);

    // 5. ETC electro-thermal capacitor charge hum + dual German tactical ready tones
    servo(4.05, 0.55, 420, 880, 0.10);
    for (const [dtC, freq] of [[4.38, 1240], [4.58, 1660]]) {
      const b = this.ctx.createOscillator(); b.type = "sine"; b.frequency.value = freq;
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.001, t + dtC); bg.gain.linearRampToValueAtTime(0.13, t + dtC + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.001, t + dtC + 0.17);
      b.connect(bg); bg.connect(this.master); b.start(t + dtC); b.stop(t + dtC + 0.19);
    }
  }

  // v14.2 SCARY VISCERAL 40mm AUTOKANONE (Heavy Bofors/Rheinmetall Boom-Crack + Iron Receiver Slam + Echo!)
  // v17.8.4 HEAVY 40mm AUTOKANONE THUNDER!
  play40mmAutoKanone() {
    this.playKPVTShot(40);
  }

  // v17.8.4 CALIBER-SCALED METALLIC ARMOR CLANG / RICOCHET WHINE!
  playArmorClang(caliberMm = 125, isRicochet = false) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const cal = Math.max(12, Math.min(155, caliberMm || 125));
    const scale = Math.pow(cal / 75.0, 0.45);
    const vol = Math.min(1.25, 0.48 * scale);

    // Metallic bell/plate resonance harmonics (lower & heavier for bigger calibers!)
    const baseHz = Math.max(260, 1150 - cal * 5.2);
    for (const mult of [1.0, 1.47, 2.13]) {
      const osc = this.ctx.createOscillator();
      osc.type = isRicochet ? "sawtooth" : "triangle";
      osc.frequency.setValueAtTime(baseHz * mult, now);
      osc.frequency.exponentialRampToValueAtTime(baseHz * mult * (isRicochet ? 0.55 : 0.88), now + (isRicochet ? 0.42 : 0.34) * scale);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol * (mult === 1.0 ? 0.72 : 0.34), now);
      g.gain.exponentialRampToValueAtTime(0.001, now + (isRicochet ? 0.44 : 0.36) * scale);
      osc.connect(g); g.connect(this.weaponBus || this.master);
      osc.start(now); osc.stop(now + 0.46 * scale);
    }
    // Sharp steel impact crunch
    const nBuf = this._noiseBuffer(0.14 * scale);
    const nSrc = this.ctx.createBufferSource(); nSrc.buffer = nBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = baseHz * 1.8; hp.Q.value = 1.6;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(vol * 0.85, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.13 * scale);
    nSrc.connect(hp); hp.connect(ng); ng.connect(this.weaponBus || this.master);
    nSrc.start(now);
  }

  // v17.9 LASER WARNING RECEIVER (LWR) SHRILL BEEP!
  playLwrBeep() {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    for (let k = 0; k < 2; k++) {
      const osc = this.ctx.createOscillator(); osc.type = "square";
      osc.frequency.setValueAtTime(2480, now + k * 0.11);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.16, now + k * 0.11);
      g.gain.exponentialRampToValueAtTime(0.001, now + k * 0.11 + 0.075);
      osc.connect(g); g.connect(this.weaponBus || this.master);
      osc.start(now + k * 0.11); osc.stop(now + k * 0.11 + 0.08);
    }
  }

  // v17.9 2-SECOND CONCUSSION EAR-RINGING (NO SCREEN FLASH — 100% EPILEPSY-SAFE!)
  playConcussionMuffle() {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    // Real 2-second muffled-hearing lowpass sweep on masterLP (zero screen flash — epilepsy-safe!)
    if (this.masterLP) {
      this.masterLP.frequency.cancelScheduledValues(now);
      this.masterLP.frequency.setValueAtTime(3200, now);
      this.masterLP.frequency.exponentialRampToValueAtTime(380, now + 0.08);
      this.masterLP.frequency.exponentialRampToValueAtTime(3200, now + 2.05);
    }
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(3850, now);
    osc.frequency.exponentialRampToValueAtTime(3420, now + 2.0);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.15, now + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, now + 2.0);
    osc.connect(g); g.connect(this.weaponBus || this.master);
    osc.start(now); osc.stop(now + 2.05);
  }

  // v17.9 SUBTLE TURRET TRAVERSE HYDRAULIC/ELECTRIC WHINE (GRINDS IF RING DAMAGED!)
  playTurretWhineTick(damaged = false) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = damaged ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(damaged ? 195 : 420, now);
    osc.frequency.linearRampToValueAtTime(damaged ? 155 : 460, now + 0.09);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(damaged ? 0.065 : 0.028, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.10);
    osc.connect(g); g.connect(this.weaponBus || this.master);
    osc.start(now); osc.stop(now + 0.11);
  }

  // v17.9 BLOW-OUT PANEL / AMMO COOK-OFF VERTICAL FLAME JET ROAR (3.5s)
  playCookoffJet() {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const buf = this._noiseBuffer(3.2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 620; bp.Q.value = 0.65;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.68, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.001, now + 3.15);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(now);
  }

  // v17.8.4 INCOMING ARTILLERY / TANK SHELL DOPPLER WHISTLE!
  playShellWhistle(caliberMm = 125) {
    if (!this.ctx || !this.master || this.muted) return;
    const now = this.ctx.currentTime;
    const cal = Math.max(75, Math.min(460, caliberMm || 125));
    const dur = Math.min(0.95, 0.48 + (cal / 460) * 0.38);
    const startHz = Math.max(900, 1950 - cal * 2.2);
    const endHz = Math.max(240, startHz * 0.28);

    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(endHz, now + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.28, now + dur * 0.72);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(this.weaponBus || this.master);
    osc.start(now); osc.stop(now + dur + 0.02);

    const nBuf = this._noiseBuffer(dur);
    const nSrc = this.ctx.createBufferSource(); nSrc.buffer = nBuf;
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass";
    bp.frequency.setValueAtTime(startHz * 1.1, now);
    bp.frequency.exponentialRampToValueAtTime(endHz * 1.1, now + dur);
    bp.Q.value = 4.5;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.001, now);
    ng.gain.linearRampToValueAtTime(0.22, now + dur * 0.75);
    ng.gain.exponentialRampToValueAtTime(0.001, now + dur);
    nSrc.connect(bp); bp.connect(ng); ng.connect(this.master);
    nSrc.start(now);
  }


  playGeigerClick(intensity = 0.6) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const hp = this.ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 3400 + Math.random() * 1800; hp.Q.value = 2.5;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28 * Math.max(0.2, Math.min(1.0, intensity)), t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.014);
    src.connect(hp); hp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.018);
  }

  updateBoatAudio(boat, throttle = 0, boost = false) {
    if (!this.started || this.muted || !this.boatGain) return;
    const t = this.ctx.currentTime;
    if (!boat) {
      this.boatGain.gain.setTargetAtTime(0.0, t, 0.12);
      this.boatNoiseGain.gain.setTargetAtTime(0.0, t, 0.12);
      return;
    }
    const id = boat.id;
    const spdNorm = Math.min(1.2, (boat.speedKmh || 0) / Math.max(20, boat.spec.topSpeedKmh || 90));
    const thr = Math.min(1.2, Math.abs(throttle) * (boost ? 1.25 : 1.0));
    const anchored = !!boat.anchored;

    if (id === "zubr") {
      const idleScale = anchored ? 0.35 : 1.0;
      const f1 = (88 + spdNorm * 115 + thr * 68) * idleScale;
      this.boatOsc1.type = "sawtooth";
      this.boatOsc1.frequency.setTargetAtTime(f1, t, 0.08);
      this.boatOsc2.frequency.setTargetAtTime(f1 * 2.02, t, 0.08);
      this.boatFilt.frequency.setTargetAtTime(anchored ? 220 : (360 + thr * 420 + spdNorm * 300), t, 0.08);
      this.boatGain.gain.setTargetAtTime(anchored ? 0.055 : (0.11 + thr * 0.07), t, 0.08);
      this.boatNoiseFilt.frequency.setTargetAtTime(anchored ? 140 : (210 + spdNorm * 280 + thr * 180), t, 0.08);
      this.boatNoiseGain.gain.setTargetAtTime(anchored ? 0.04 : (0.18 + spdNorm * 0.14 + thr * 0.08), t, 0.08);
    } else if (id === "serna") {
      const f1 = 42 + spdNorm * 58 + thr * 34;
      this.boatOsc1.type = "sawtooth";
      this.boatOsc1.frequency.setTargetAtTime(f1, t, 0.08);
      this.boatOsc2.frequency.setTargetAtTime(f1 * 1.5, t, 0.08);
      this.boatFilt.frequency.setTargetAtTime(210 + thr * 280 + spdNorm * 160, t, 0.08);
      this.boatGain.gain.setTargetAtTime(0.14 + thr * 0.07, t, 0.08);
      this.boatNoiseFilt.frequency.setTargetAtTime(320 + spdNorm * 350, t, 0.08);
      this.boatNoiseGain.gain.setTargetAtTime(0.03 + spdNorm * 0.12, t, 0.08);
    } else {
      const hi = (id === "strela") ? 1.55 : 1.0;
      const f1 = (78 + spdNorm * 165 + thr * 85) * hi;
      this.boatOsc1.type = "sawtooth";
      this.boatOsc1.frequency.setTargetAtTime(f1, t, 0.06);
      this.boatOsc2.frequency.setTargetAtTime(f1 * 1.98, t, 0.06);
      this.boatFilt.frequency.setTargetAtTime(420 + thr * 720 + spdNorm * 580, t, 0.06);
      this.boatGain.gain.setTargetAtTime(0.085 + thr * 0.065, t, 0.06);
      this.boatNoiseFilt.frequency.setTargetAtTime(480 + spdNorm * 750, t, 0.08);
      this.boatNoiseGain.gain.setTargetAtTime(0.025 + spdNorm * 0.16, t, 0.08);
    }
  }

  setNavalHorn(active, isBigShip = true) {
    if (!this.started || this.muted || !this.fogGain) return;
    const t = this.ctx.currentTime;
    this.fogOsc1.frequency.setTargetAtTime(isBigShip ? 76 : 278, t, 0.03);
    this.fogOsc2.frequency.setTargetAtTime(isBigShip ? 114 : 348, t, 0.03);
    this.fogFilt.frequency.setTargetAtTime(isBigShip ? 320 : 980, t, 0.04);
    this.fogGain.gain.setTargetAtTime(active ? (isBigShip ? 0.34 : 0.20) : 0.0, t, active ? 0.06 : 0.24);
  }

  playAnchorClank() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 4; k++) {
      const st = t + k * 0.085;
      const o = this.ctx.createOscillator(); o.type = "square"; o.frequency.value = 185 + (k % 2) * 65;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.07);
      o.connect(g); g.connect(this.master); o.start(st); o.stop(st + 0.08);
    }
  }

  playRampHydraulics() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.setValueAtTime(1400, t); bp.frequency.exponentialRampToValueAtTime(420, t + 0.55); bp.Q.value = 2.0;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.58);
    src.connect(bp); bp.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.60);
  }

  playYamatoLament() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [freq, det] of [[52, 0], [78, -6], [104, 4]]) {
      const o = this.ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(freq, t);
      o.frequency.exponentialRampToValueAtTime(freq * 0.88, t + 4.2);
      o.detune.value = det;
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 260;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.001, t + 4.4);
      o.connect(lp); lp.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + 4.5);
    }
  }

  playYamatoKlaxon() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let k = 0; k < 4; k++) {
      const st = t + k * 0.42;
      const o = this.ctx.createOscillator(); o.type = "sawtooth";
      o.frequency.setValueAtTime(420, st);
      o.frequency.linearRampToValueAtTime(290, st + 0.32);
      const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 640; bp.Q.value = 1.8;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.26, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.36);
      o.connect(bp); bp.connect(g); g.connect(this.master);
      o.start(st); o.stop(st + 0.38);
    }
  }

  playYamatoSalvo() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // 3 staggered colossal 460mm triple-turret thunder detonations!
    for (let k = 0; k < 3; k++) {
      const st = t + k * 0.14;
      const sub = this.ctx.createOscillator(); sub.type = "sine";
      sub.frequency.setValueAtTime(72, st); sub.frequency.exponentialRampToValueAtTime(22, st + 1.35);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.68, st); sg.gain.exponentialRampToValueAtTime(0.001, st + 1.45);
      sub.connect(sg); sg.connect(this.master); sub.start(st); sub.stop(st + 1.5);

      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(620, st); lp.frequency.exponentialRampToValueAtTime(110, st + 1.4);
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.55, st); ng.gain.exponentialRampToValueAtTime(0.001, st + 1.5);
      src.connect(lp); lp.connect(ng); ng.connect(this.master); src.start(st); src.stop(st + 1.55);
    }
  }

  playBloopSonar() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // Authentic rising-then-echoing deep-sea abyssal "Bloop" frequency sweep!
    const o = this.ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(34, t);
    o.frequency.exponentialRampToValueAtTime(148, t + 1.15);
    o.frequency.exponentialRampToValueAtTime(52, t + 2.8);
    const o2 = this.ctx.createOscillator(); o2.type = "triangle";
    o2.frequency.setValueAtTime(68, t);
    o2.frequency.exponentialRampToValueAtTime(296, t + 1.15);
    o2.frequency.exponentialRampToValueAtTime(98, t + 2.8);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 340;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.46, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.001, t + 3.1);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
    o.start(t); o2.start(t); o.stop(t + 3.2); o2.stop(t + 3.2);
  }

  // Procedural Foreboding Sea Terror & Hurricane Signature Cues ("bloop", "yamato", "megalodon", "hurricane")
  playSeaDreadPulse(intensity = 0.8, kind = "bloop") {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const v = Math.max(0.12, Math.min(1.0, Number(intensity) || 0.8));
    const k = String(kind || "bloop").toLowerCase();

    if (k === "bloop" || k === "kraken") {
      // 1997 NOAA Bloop: haunting ultra-low organic rising underwater sweep + cavernous deep-sea reverb echoes
      for (const [delay, gainScale, lpCut] of [[0.0, 1.0, 310], [0.68, 0.42, 220], [1.42, 0.20, 165]]) {
        const st = t + delay;
        const o1 = this.ctx.createOscillator(); o1.type = "sine";
        o1.frequency.setValueAtTime(28, st);
        o1.frequency.exponentialRampToValueAtTime(162, st + 1.32);
        o1.frequency.exponentialRampToValueAtTime(44, st + 3.10);

        const o2 = this.ctx.createOscillator(); o2.type = "triangle";
        o2.frequency.setValueAtTime(56, st);
        o2.frequency.exponentialRampToValueAtTime(248, st + 1.28);
        o2.frequency.exponentialRampToValueAtTime(76, st + 3.05);

        const lfo = this.ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 4.6;
        const lfoG = this.ctx.createGain(); lfoG.gain.value = 3.2;
        lfo.connect(lfoG); lfoG.connect(o1.frequency);

        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpCut; lp.Q.value = 2.2;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, st);
        g.gain.linearRampToValueAtTime(0.46 * v * gainScale, st + 0.92);
        g.gain.exponentialRampToValueAtTime(0.001, st + 3.35);

        o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master);
        o1.start(st); o2.start(st); lfo.start(st);
        o1.stop(st + 3.45); o2.stop(st + 3.45); lfo.stop(st + 3.45);
      }
      // Subtle abyssal pressure swell underneath
      const sub = this.ctx.createBufferSource(); sub.buffer = this.noiseBuf;
      const slp = this.ctx.createBiquadFilter(); slp.type = "lowpass"; slp.frequency.value = 95;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, t);
      sg.gain.linearRampToValueAtTime(0.24 * v, t + 1.1);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 3.6);
      sub.connect(slp); slp.connect(sg); sg.connect(this.master);
      sub.start(t); sub.stop(t + 3.7);

    } else if (k === "yamato") {
      // Cavernous rusted-steel ghost battleship foghorn (layered detuned ~55/82/110 Hz brassy sub-harmonics + mist echo)
      const harmonics = [[55.0, 0, "sawtooth", 0.34], [54.2, -5, "triangle", 0.24], [82.4, -7, "sawtooth", 0.26], [110.0, 5, "sawtooth", 0.20], [108.9, -4, "triangle", 0.16]];
      for (const [delay, gScale, lpCut] of [[0.0, 1.0, 290], [0.92, 0.38, 195]]) {
        const st = t + delay;
        const bus = this.ctx.createGain(); bus.gain.value = 1.0;
        const shaper = this.ctx.createWaveShaper(); shaper.curve = this._makeWarmSaturation(9);
        const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = lpCut; lp.Q.value = 1.8;
        const envG = this.ctx.createGain();
        envG.gain.setValueAtTime(0.001, st);
        envG.gain.linearRampToValueAtTime(0.42 * v * gScale, st + 0.65);
        envG.gain.setValueAtTime(0.36 * v * gScale, st + 2.45);
        envG.gain.exponentialRampToValueAtTime(0.001, st + 4.4);
        bus.connect(shaper); shaper.connect(lp); lp.connect(envG); envG.connect(this.master);

        for (const [freq, det, type, amp] of harmonics) {
          const o = this.ctx.createOscillator(); o.type = type;
          o.frequency.setValueAtTime(freq, st);
          o.frequency.exponentialRampToValueAtTime(freq * 0.91, st + 4.2);
          o.detune.value = det;
          const og = this.ctx.createGain(); og.gain.value = amp;
          o.connect(og); og.connect(bus);
          o.start(st); o.stop(st + 4.5);
        }
      }

    } else if (k === "megalodon") {
      // Deep underwater concussion thump + breaching water-crash explosion + visceral low-end abyssal growl
      const thump = this.ctx.createOscillator(); thump.type = "sine";
      thump.frequency.setValueAtTime(84, t);
      thump.frequency.exponentialRampToValueAtTime(21, t + 0.72);
      const tg = this.ctx.createGain();
      tg.gain.setValueAtTime(0.68 * v, t);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      thump.connect(tg); tg.connect(this.master); thump.start(t); thump.stop(t + 0.90);

      // Heavy breaching water-crash noise burst
      const splash = this.ctx.createBufferSource(); splash.buffer = this.noiseBuf; splash.loop = true;
      const sf = this.ctx.createBiquadFilter(); sf.type = "lowpass";
      sf.frequency.setValueAtTime(1650, t + 0.04);
      sf.frequency.exponentialRampToValueAtTime(210, t + 1.85);
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.001, t + 0.04);
      sg.gain.linearRampToValueAtTime(0.58 * v, t + 0.14);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 1.95);
      splash.connect(sf); sf.connect(sg); sg.connect(this.master);
      splash.start(t + 0.04); splash.stop(t + 2.05);

      // Visceral low-end guttural growl
      const growl = this.ctx.createOscillator(); growl.type = "sawtooth";
      growl.frequency.setValueAtTime(94, t + 0.08);
      growl.frequency.exponentialRampToValueAtTime(36, t + 1.55);
      const gLfo = this.ctx.createOscillator(); gLfo.type = "sine"; gLfo.frequency.value = 19;
      const gLfoG = this.ctx.createGain(); gLfoG.gain.value = 12;
      gLfo.connect(gLfoG); gLfoG.connect(growl.frequency);
      const glp = this.ctx.createBiquadFilter(); glp.type = "lowpass"; glp.frequency.value = 250; glp.Q.value = 1.6;
      const gg = this.ctx.createGain();
      gg.gain.setValueAtTime(0.001, t + 0.08);
      gg.gain.linearRampToValueAtTime(0.42 * v, t + 0.24);
      gg.gain.exponentialRampToValueAtTime(0.001, t + 1.65);
      growl.connect(glp); glp.connect(gg); gg.connect(this.master);
      growl.start(t + 0.08); gLfo.start(t + 0.08); growl.stop(t + 1.72); gLfo.stop(t + 1.72);

    } else if (k === "hurricane") {
      // Violent hurricane thunderclap + sweeping cyclonic squall gust
      const crack = this.ctx.createBufferSource(); crack.buffer = this.noiseBuf;
      const cf = this.ctx.createBiquadFilter(); cf.type = "bandpass"; cf.frequency.value = 1250; cf.Q.value = 0.9;
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.62 * v, t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      crack.connect(cf); cf.connect(cg); cg.connect(this.master); crack.start(t); crack.stop(t + 0.28);

      const boom = this.ctx.createOscillator(); boom.type = "sine";
      boom.frequency.setValueAtTime(92, t);
      boom.frequency.exponentialRampToValueAtTime(20, t + 1.35);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.68 * v, t);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
      boom.connect(bg); bg.connect(this.master); boom.start(t); boom.stop(t + 1.60);

      const thunder = this.ctx.createBufferSource(); thunder.buffer = this.noiseBuf; thunder.loop = true;
      const tf = this.ctx.createBiquadFilter(); tf.type = "lowpass";
      tf.frequency.setValueAtTime(280, t + 0.06); tf.frequency.exponentialRampToValueAtTime(58, t + 2.45);
      const tg = this.ctx.createGain();
      tg.gain.setValueAtTime(0.01, t + 0.06);
      tg.gain.linearRampToValueAtTime(0.54 * v, t + 0.22);
      tg.gain.exponentialRampToValueAtTime(0.001, t + 2.65);
      thunder.connect(tf); tf.connect(tg); tg.connect(this.master); thunder.start(t + 0.06); thunder.stop(t + 2.72);

      // Rushing squall wind gust
      const squall = this.ctx.createBufferSource(); squall.buffer = this.noiseBuf; squall.loop = true;
      const sqf = this.ctx.createBiquadFilter(); sqf.type = "bandpass"; sqf.Q.value = 2.2;
      sqf.frequency.setValueAtTime(260, t);
      sqf.frequency.exponentialRampToValueAtTime(860, t + 0.55);
      sqf.frequency.exponentialRampToValueAtTime(280, t + 2.3);
      const sqg = this.ctx.createGain();
      sqg.gain.setValueAtTime(0.005, t);
      sqg.gain.linearRampToValueAtTime(0.42 * v, t + 0.35);
      sqg.gain.exponentialRampToValueAtTime(0.001, t + 2.45);
      squall.connect(sqf); sqf.connect(sqg); sqg.connect(this.master); squall.start(t); squall.stop(t + 2.52);
    }
  }

  playTramBell() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (const [del, freq] of [[0.0, 920], [0.16, 920]]) {
      const st = t + del;
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
      const o2 = this.ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq * 2.02;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.24, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.35);
      o.connect(g); o2.connect(g); g.connect(this.master);
      o.start(st); o2.start(st); o.stop(st + 0.38); o2.stop(st + 0.38);
    }
  }

  playMolotovIgnite() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // Glass bottle smash
    const gl = this.ctx.createBufferSource(); gl.buffer = this.noiseBuf;
    const gf = this.ctx.createBiquadFilter(); gf.type = "highpass"; gf.frequency.value = 2200;
    const gg = this.ctx.createGain();
    gg.gain.setValueAtTime(0.45, t); gg.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    gl.connect(gf); gf.connect(gg); gg.connect(this.master); gl.start(t); gl.stop(t + 0.20);
    // Petrol fire ignition WHOOSH!
    const fw = this.ctx.createBufferSource(); fw.buffer = this.noiseBuf;
    const ff = this.ctx.createBiquadFilter(); ff.type = "bandpass";
    ff.frequency.setValueAtTime(240, t + 0.03); ff.frequency.exponentialRampToValueAtTime(780, t + 0.35);
    ff.frequency.exponentialRampToValueAtTime(180, t + 1.15); ff.Q.value = 0.85;
    const fg = this.ctx.createGain();
    fg.gain.setValueAtTime(0.01, t + 0.03); fg.gain.linearRampToValueAtTime(0.62, t + 0.16);
    fg.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    fw.connect(ff); ff.connect(fg); fg.connect(this.master); fw.start(t + 0.03); fw.stop(t + 1.30);
  }

  playGasStationExplosion() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const sub = this.ctx.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(78, t); sub.frequency.exponentialRampToValueAtTime(16, t + 1.85);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.88, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
    sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t + 2.15);

    const roar = this.ctx.createBufferSource(); roar.buffer = this.noiseBuf;
    const rf = this.ctx.createBiquadFilter(); rf.type = "lowpass";
    rf.frequency.setValueAtTime(1950, t); rf.frequency.exponentialRampToValueAtTime(120, t + 2.4);
    const rg = this.ctx.createGain();
    rg.gain.setValueAtTime(0.82, t); rg.gain.exponentialRampToValueAtTime(0.001, t + 2.55);
    roar.connect(rf); rf.connect(rg); rg.connect(this.master); roar.start(t); roar.stop(t + 2.60);
  }

  playApsIntercept() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = "square";
    o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.15);

    // Crisp airburst counter-charge snap
    const snap = this.ctx.createBufferSource(); snap.buffer = this.noiseBuf;
    const sf = this.ctx.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 1850; sf.Q.value = 1.4;
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.38, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    snap.connect(sf); sf.connect(sg); sg.connect(this.master); snap.start(t); snap.stop(t + 0.18);
  }

  playArmorRicochet(intensity = 0.8) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const s = Math.max(0.2, Math.min(1.0, Number(intensity) || 0.8));

    // 1. High-velocity metallic PING! transient (bell-like armor plate ring)
    const baseF = 2450 + Math.random() * 520;
    const ping1 = this.ctx.createOscillator(); ping1.type = "sine";
    ping1.frequency.setValueAtTime(baseF, t);
    ping1.frequency.exponentialRampToValueAtTime(baseF * 0.78, t + 0.24);
    const ping2 = this.ctx.createOscillator(); ping2.type = "triangle";
    ping2.frequency.setValueAtTime(baseF * 1.54, t);
    ping2.frequency.exponentialRampToValueAtTime(baseF * 1.18, t + 0.18);
    const pg = this.ctx.createGain();
    pg.gain.setValueAtTime(0.001, t);
    pg.gain.linearRampToValueAtTime(0.34 * s, t + 0.006);
    pg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    ping1.connect(pg); ping2.connect(pg); pg.connect(this.master);
    ping1.start(t); ping2.start(t); ping1.stop(t + 0.30); ping2.stop(t + 0.30);

    // 2. Descending Doppler spinning-shell whine ("pcheeeew!")
    const whine = this.ctx.createOscillator(); whine.type = "sawtooth";
    whine.frequency.setValueAtTime(2200 + Math.random() * 380, t + 0.012);
    whine.frequency.exponentialRampToValueAtTime(360 + Math.random() * 90, t + 0.46);
    const lfo = this.ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 32 + Math.random() * 14;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 75;
    lfo.connect(lfoG); lfoG.connect(whine.frequency);

    const wf = this.ctx.createBiquadFilter(); wf.type = "bandpass";
    wf.frequency.setValueAtTime(2100, t + 0.012);
    wf.frequency.exponentialRampToValueAtTime(480, t + 0.46);
    wf.Q.value = 4.2;
    const wg = this.ctx.createGain();
    wg.gain.setValueAtTime(0.001, t + 0.01);
    wg.gain.linearRampToValueAtTime(0.28 * s, t + 0.045);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.50);
    whine.connect(wf); wf.connect(wg); wg.connect(this.master);
    whine.start(t + 0.01); lfo.start(t + 0.01);
    whine.stop(t + 0.52); lfo.stop(t + 0.52);

    // 3. Sharp spark graze snap
    const sp = this.ctx.createBufferSource(); sp.buffer = this.noiseBuf;
    const spf = this.ctx.createBiquadFilter(); spf.type = "highpass"; spf.frequency.value = 3100;
    const spg = this.ctx.createGain();
    spg.gain.setValueAtTime(0.26 * s, t); spg.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    sp.connect(spf); spf.connect(spg); spg.connect(this.master); sp.start(t); sp.stop(t + 0.10);
  }

  playEraDetonation() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;

    // 1. Sharp snappy reactive explosive CRACK!
    const crack = this.ctx.createBufferSource(); crack.buffer = this.noiseBuf;
    const cf = this.ctx.createBiquadFilter(); cf.type = "bandpass";
    cf.frequency.setValueAtTime(2100, t); cf.frequency.exponentialRampToValueAtTime(290, t + 0.25);
    cf.Q.value = 0.9;
    const cg = this.ctx.createGain();
    cg.gain.setValueAtTime(0.01, t);
    cg.gain.linearRampToValueAtTime(0.76, t + 0.005);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    crack.connect(cf); cf.connect(cg); cg.connect(this.master); crack.start(t); crack.stop(t + 0.30);

    // 2. Concussive punchy low-mid blast thump
    const sub = this.ctx.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(195, t); sub.frequency.exponentialRampToValueAtTime(36, t + 0.24);
    const sg = this.ctx.createGain();
    sg.gain.setValueAtTime(0.62, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    sub.connect(sg); sg.connect(this.master); sub.start(t); sub.stop(t + 0.28);

    // 3. Flyer-plate heavy metallic CLANG!
    for (const [f0, f1, amp] of [[760, 690, 0.26], [1215, 1120, 0.18]]) {
      const m = this.ctx.createOscillator(); m.type = "triangle";
      m.frequency.setValueAtTime(f0, t + 0.008); m.frequency.exponentialRampToValueAtTime(f1, t + 0.36);
      const mf = this.ctx.createBiquadFilter(); mf.type = "bandpass"; mf.frequency.value = f0; mf.Q.value = 3.2;
      const mg = this.ctx.createGain();
      mg.gain.setValueAtTime(0.001, t + 0.006);
      mg.gain.linearRampToValueAtTime(amp, t + 0.018);
      mg.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
      m.connect(mf); mf.connect(mg); mg.connect(this.master);
      m.start(t + 0.006); m.stop(t + 0.42);
    }
  }

  playGhostEasterEgg(phase = "appear") {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;

    if (phase === "appear") {
      // Warm lush major-9th dreamy synth swell (Cmaj9: C4, E4, G4, B4, D5)
      const notes = [261.63, 329.63, 392.00, 493.88, 587.33];
      const padLp = this.ctx.createBiquadFilter(); padLp.type = "lowpass";
      padLp.frequency.setValueAtTime(420, t);
      padLp.frequency.exponentialRampToValueAtTime(2400, t + 1.4);
      padLp.frequency.exponentialRampToValueAtTime(980, t + 3.8);
      const padG = this.ctx.createGain();
      padG.gain.setValueAtTime(0.001, t);
      padG.gain.linearRampToValueAtTime(0.18, t + 1.15);
      padG.gain.setValueAtTime(0.16, t + 2.3);
      padG.gain.exponentialRampToValueAtTime(0.001, t + 4.1);
      padLp.connect(padG); padG.connect(this.master);

      notes.forEach((freq, idx) => {
        const o1 = this.ctx.createOscillator(); o1.type = "sine";
        o1.frequency.setValueAtTime(freq, t);
        const o2 = this.ctx.createOscillator(); o2.type = "triangle";
        o2.frequency.setValueAtTime(freq * (1.003 + idx * 0.0004), t);
        const og = this.ctx.createGain();
        og.gain.value = idx === 0 ? 0.34 : 0.22;
        o1.connect(og); o2.connect(og); og.connect(padLp);
        o1.start(t + idx * 0.06); o2.start(t + idx * 0.06);
        o1.stop(t + 4.2); o2.stop(t + 4.2);
      });
    } else if (phase === "flash") {
      // Bright crystalline fifth chime (G5 + D6 + octave sparkle G6)
      const chimeNotes = [[783.99, 0.16, 0.65], [1174.66, 0.13, 0.72], [1567.98, 0.07, 0.55]];
      chimeNotes.forEach(([freq, vol, dur], idx) => {
        const o = this.ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(freq, t + idx * 0.015);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, t + idx * 0.015);
        g.gain.linearRampToValueAtTime(vol, t + idx * 0.015 + 0.009);
        g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.015 + dur);
        o.connect(g); g.connect(this.master);
        o.start(t + idx * 0.015); o.stop(t + idx * 0.015 + dur + 0.03);
      });
    } else if (phase === "overtake") {
      // Uplifting ethereal harmonic shimmer + sweeping stereo slipstream whoosh!
      const whoosh = this.ctx.createBufferSource(); whoosh.buffer = this.noiseBuf;
      const wf = this.ctx.createBiquadFilter(); wf.type = "bandpass";
      wf.frequency.setValueAtTime(280, t);
      wf.frequency.exponentialRampToValueAtTime(1950, t + 0.55);
      wf.frequency.exponentialRampToValueAtTime(420, t + 1.85);
      wf.Q.value = 1.6;
      const wg = this.ctx.createGain();
      wg.gain.setValueAtTime(0.001, t);
      wg.gain.linearRampToValueAtTime(0.32, t + 0.42);
      wg.gain.exponentialRampToValueAtTime(0.001, t + 1.95);
      whoosh.connect(wf); wf.connect(wg);
      if (this.ctx.createStereoPanner) {
        const pan = this.ctx.createStereoPanner();
        pan.pan.setValueAtTime(-0.85, t);
        pan.pan.linearRampToValueAtTime(0.85, t + 1.55);
        wg.connect(pan); pan.connect(this.master);
      } else {
        wg.connect(this.master);
      }
      whoosh.start(t); whoosh.stop(t + 2.0);

      // Ascending crystalline major-9th harmonic shimmer arpeggio
      const arp = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
      arp.forEach((freq, idx) => {
        const st = t + idx * 0.065;
        const o = this.ctx.createOscillator(); o.type = "sine";
        o.frequency.setValueAtTime(freq, st);
        const o2 = this.ctx.createOscillator(); o2.type = "triangle";
        o2.frequency.setValueAtTime(freq * 2.0, st);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, st);
        g.gain.linearRampToValueAtTime(0.11, st + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, st + 1.65);
        const g2 = this.ctx.createGain(); g2.gain.value = 0.25;
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(this.master);
        o.start(st); o2.start(st); o.stop(st + 1.70); o2.stop(st + 1.70);
      });
    }
  }

  playCameraShutter() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const n = this.ctx.createBufferSource(); n.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 2.0;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
    n.connect(f); f.connect(g); g.connect(this.master); n.start(t); n.stop(t + 0.06);
  }

  updateMilitaryBuzzer(dt, dist, engineRunning, weather) {
    if (!this.started || this.muted) return;
    if (dist > 3000) { this._uvbCd = 0.5; return; }
    this._uvbCd = (this._uvbCd || 0) - dt;
    if (this._uvbCd > 0) return;
    this._uvbCd = 1.62; // Classic UVB-76 rhythmic 1.6s buzz cadence!

    const prox = Math.pow(Math.max(0, 1.0 - dist / 3000), 1.45);
    // Engine-off clarity boost: running engine masks 80% of the signal unless very close!
    const stealthMult = engineRunning ? (dist < 750 ? 0.34 : 0.16) : 1.0;
    const rainMask = (weather === "storm") ? 0.55 : (weather === "rain" ? 0.72 : 1.0);
    const vol = (0.025 + prox * 0.18) * stealthMult * rainMask;
    if (vol < 0.004) return;

    const t = this.ctx.currentTime;
    // Gritty Soviet AM shortwave buzzer (112 Hz fundamental + 225 Hz harmonic through narrow AM bandpass!)
    const osc1 = this.ctx.createOscillator(); osc1.type = "sawtooth"; osc1.frequency.value = 112;
    const osc2 = this.ctx.createOscillator(); osc2.type = "square";   osc2.frequency.value = 225;
    const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 920 + prox * 380; flt.Q.value = 3.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.setValueAtTime(vol * 0.92, t + 0.78);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.88);
    osc1.connect(flt); osc2.connect(flt); flt.connect(g); g.connect(this.master);
    osc1.start(t); osc2.start(t); osc1.stop(t + 0.90); osc2.stop(t + 0.90);

    // Subtle AM shortwave carrier static hiss
    const nsrc = this.ctx.createBufferSource(); nsrc.buffer = this.noiseBuf;
    const nf = this.ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 1650; nf.Q.value = 2.6;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.001, t);
    ng.gain.linearRampToValueAtTime(vol * 0.42, t + 0.06);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 1.15);
    nsrc.connect(nf); nf.connect(ng); ng.connect(this.master);
    nsrc.start(t); nsrc.stop(t + 1.18);
  }

  updateEnvironment(dt, info) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    this.windPhase += dt * 0.45;
    const gust = 0.72 + 0.28 * Math.sin(this.windPhase) + 0.16 * Math.sin(this.windPhase * 2.3);

    const underwater = !!(info && info.underwater);
    this.isUnderwater = underwater;
    this.masterLP.frequency.setTargetAtTime(underwater ? 420 : 3200, t, 0.12);

    const alt = Math.max(0, (info && info.altitude) || 0);
    const spdKmh = (info && info.speedKmh) || 0;
    const weather = (info && info.weather) || "clear";
    const biomes = (info && info.biomes) || { mountains: 0, taiga: 0, desert: 0, volcanic: 0, rust: 1 };
    const riverDist = (info && typeof info.riverDist === "number") ? info.riverDist : 999;

    let windBase = 0.022 + Math.min(0.06, alt / 3200) + Math.min(0.045, spdKmh / 2200);
    if (weather === "hurricane") windBase += 0.105;
    else if (weather === "storm") windBase += 0.075;
    else if (weather === "snow" || weather === "rain") windBase += 0.032;
    if (biomes.desert > 0.45) windBase += 0.024;
    const hurrEff = info && info.hurricaneEffect;
    const hurrInt = Math.max(0, Math.min(1, (info && typeof info.hurricaneIntensity === "number")
      ? info.hurricaneIntensity : ((hurrEff && hurrEff.active) ? (hurrEff.intensity || 0) : 0)));
    const inEye = !!((info && info.inEye) || (hurrEff && hurrEff.active && hurrEff.inEye));
    const seaDread = Math.max(0, Math.min(1, (info && typeof info.seaDread === "number") ? info.seaDread : 0));

    if (inEye) windBase = 0.012;
    if (underwater) windBase = 0.008;

    const windFreq = 240 + Math.min(340, alt * 0.8 + spdKmh * 1.4) + Math.sin(this.windPhase * 1.3) * 65;
    this.windFilter.frequency.setTargetAtTime(windFreq, t, 0.15);
    this.windGain.gain.setTargetAtTime(Math.min(0.16, windBase * gust), t, 0.18);

    // Layer 1: Hurricane Roar (howling cyclonic wind + sub-bass eyewall pressure rumble; eerie hush inside Eye!)
    if (this.hurrWindGain && this.hurrSubGain) {
      if (inEye) {
        this.hurrWindBP.frequency.setTargetAtTime(195, t, 0.25);
        this.hurrWindBP.Q.setTargetAtTime(1.4, t, 0.25);
        this.hurrWindGain.gain.setTargetAtTime(0.018, t, 0.28);
        this.hurrSubLP.frequency.setTargetAtTime(75, t, 0.25);
        this.hurrSubGain.gain.setTargetAtTime(0.032, t, 0.28);
        if (this.rainGain) this.rainGain.gain.setTargetAtTime(0.012, t, 0.30);
      } else if (hurrInt > 0.01 || weather === "hurricane") {
        const hLvl = Math.max(hurrInt, weather === "hurricane" ? 0.55 : 0);
        const howlFreq = 250 + hLvl * 430 + Math.sin(this.windPhase * 2.15) * (88 * hLvl) + Math.sin(this.windPhase * 5.2) * (34 * hLvl);
        this.hurrWindBP.frequency.setTargetAtTime(underwater ? 155 : howlFreq, t, 0.14);
        this.hurrWindBP.Q.setTargetAtTime(1.8 + hLvl * 2.1, t, 0.18);
        this.hurrWindGain.gain.setTargetAtTime((underwater ? 0.04 : 0.23) * hLvl * (0.78 + 0.22 * gust), t, 0.18);
        this.hurrSubLP.frequency.setTargetAtTime(82 + hLvl * 92, t, 0.18);
        this.hurrSubGain.gain.setTargetAtTime((underwater ? 0.09 : 0.22) * hLvl, t, 0.20);
      } else {
        this.hurrWindGain.gain.setTargetAtTime(0.0, t, 0.25);
        this.hurrSubGain.gain.setTargetAtTime(0.0, t, 0.25);
      }
    }

    // Layer 2: Abyssal Sea Dread Drone (~38-54 Hz beating thalassophobia oscillators)
    if (this.dreadGain && this.dreadOsc1 && this.dreadOsc2) {
      this.dreadPhase = (this.dreadPhase || 0) + dt * (0.34 + seaDread * 0.58);
      if (seaDread > 0.15) {
        const dNorm = Math.min(1.0, (seaDread - 0.15) / 0.85);
        const fBase = 39.5 + dNorm * 9.5 + Math.sin(this.dreadPhase) * 3.4;
        const beatHz = 0.72 + dNorm * 1.48;
        this.dreadOsc1.frequency.setTargetAtTime(fBase, t, 0.20);
        this.dreadOsc2.frequency.setTargetAtTime(fBase + beatHz, t, 0.20);
        this.dreadLP.frequency.setTargetAtTime(92 + dNorm * 86, t, 0.22);
        this.dreadGain.gain.setTargetAtTime(dNorm * (underwater ? 0.24 : 0.18), t, 0.24);
      } else {
        this.dreadGain.gain.setTargetAtTime(0.0, t, 0.30);
      }
    }

    const riverProx = Math.max(0, 1.0 - riverDist / 120.0);
    const riverVol = underwater ? 0.11 : (riverProx * riverProx * 0.085);
    this.riverFilter.frequency.setTargetAtTime(underwater ? 320 : (620 + Math.sin(this.windPhase * 3.1) * 140), t, 0.12);
    this.riverGain.gain.setTargetAtTime(riverVol, t, 0.16);

    const inDesert = (biomes.desert > 0.30) && !underwater;
    const wyrmDist = (info && typeof info.sandwormDist === "number") ? info.sandwormDist : 9999;
    const wyrmActive = !!(info && info.sandwormActive);
    const wyrmProx = (wyrmActive && wyrmDist < 380) ? Math.pow(Math.max(0, 1.0 - wyrmDist / 380), 1.45) : 0;

    const sandVol = (inDesert ? (0.022 + biomes.desert * 0.028 * gust) : 0) + wyrmProx * 0.24;
    const sandFreq = 1350 - wyrmProx * 780 + Math.sin(this.windPhase * 5.2) * (90 + wyrmProx * 140);
    this.sandFilter.frequency.setTargetAtTime(Math.max(360, sandFreq), t, 0.12);
    this.sandGain.gain.setTargetAtTime(Math.min(0.28, sandVol), t, 0.14);

    const volcVol = biomes.volcanic > 0.30 ? (biomes.volcanic * 0.075) : 0;
    const wyrmBass = wyrmProx * 0.18;
    const subVol = underwater ? 0.095 : Math.max(volcVol, wyrmBass);
    const subFreq = underwater ? 64 : (wyrmBass > volcVol ? (34 + wyrmProx * 18) : (42 + Math.sin(this.windPhase * 1.8) * 6));
    this.envSubOsc.frequency.setTargetAtTime(subFreq, t, 0.16);
    this.envSubGain.gain.setTargetAtTime(subVol, t, 0.16);

    const inSanctuary = !!(info && info.inSanctuary);
    const threatNear = !!(info && info.threatNear);
    // Birds go DEAD SILENT when a cryptid is stalking nearby or a hurricane/abyssal threat looms!
    if (!underwater && !threatNear && hurrInt < 0.1 && seaDread < 0.2 && !(info && info.isNight) && (weather === "clear" || weather === "overcast") && (biomes.taiga > 0.28 || biomes.rust > 0.45 || inSanctuary)) {
      this.birdTimer -= dt;
      if (this.birdTimer <= 0) {
        this.birdTimer = 6.5 + Math.random() * 11.0;
        this._playForestChirp();
      }
    }

    // Random atmospheric eerie cave / hollow metal / distant forest / wind-chime ambience!
    // (Never plays inside Clarkson's peaceful farm sanctuary!)
    if (!underwater && !inSanctuary) {
      this.eerieTimer -= dt * ((info && info.isNight) ? 1.5 : 0.85);
      if (this.eerieTimer <= 0) {
        this.eerieTimer = 20.0 + Math.random() * 28.0;
        this.playRandomAtmosphericCue(biomes, !!(info && info.isNight));
      }
    }
  }

  // Random eerie Minecraft-cave-style ambient cues (some random spooks, some biome atmosphere!)
  playRandomAtmosphericCue(biomes, isNight) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const roll = Math.random();

    if (roll < 0.28) {
      // 1. Hollow Cavernous Metallic Resonance (classic eerie cave sound!)
      const base = 110 + Math.random() * 90;
      const freqs = [base, base * 1.414, base * 1.89];
      freqs.forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = idx === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.exponentialRampToValueAtTime(f * 0.82, t + 3.4);
        const flt = this.ctx.createBiquadFilter();
        flt.type = "bandpass"; flt.frequency.value = f * 1.2; flt.Q.value = 6.0;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.0005, t);
        g.gain.linearRampToValueAtTime(0.032 / (idx + 1), t + 0.85);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 3.5);
        osc.connect(flt); flt.connect(g); g.connect(this.master);
        osc.start(t); osc.stop(t + 3.6);
      });
    } else if (roll < 0.54) {
      // 2. Distant Forest Wood-Knock / Hollow Branch Snap
      const knocks = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < knocks; i++) {
        const st = t + i * (0.28 + Math.random() * 0.25);
        const osc = this.ctx.createOscillator(); osc.type = "triangle";
        osc.frequency.setValueAtTime(240 + Math.random() * 120, st);
        osc.frequency.exponentialRampToValueAtTime(68, st + 0.14);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.065, st); g.gain.exponentialRampToValueAtTime(0.0008, st + 0.16);
        osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + 0.18);
      }
    } else if (roll < 0.78) {
      // 3. Ghostly Blowing Canyon Wind-Flute / Whisper
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter();
      flt.type = "bandpass"; flt.Q.value = 11.0;
      const f0 = 380 + Math.random() * 340;
      flt.frequency.setValueAtTime(f0, t);
      flt.frequency.linearRampToValueAtTime(f0 * (Math.random() < 0.5 ? 0.72 : 1.28), t + 2.6);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(0.048, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 2.8);
      src.connect(flt); flt.connect(g); g.connect(this.master);
      src.start(t); src.stop(t + 2.9);
    } else {
      // 4. Deep Distant Subterranean Groan / Settling Earth
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(58, t); osc.frequency.exponentialRampToValueAtTime(34, t + 2.5);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(isNight ? 0.09 : 0.055, t + 0.6);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 2.7);
    }
  }

  // PURPOSEFUL STAGED CRYPTID CUES (Players learn to recognize these without HUD text!)
  playStagedCue(cueType, intensity = 0.5) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const vol = Math.max(0.05, Math.min(1.0, intensity));

    if (cueType === "siren_static") {
      // Noticeably louder haunting broken radio static + twin warbling siren horns cutting through rain & engines!
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 1080; flt.Q.value = 2.4;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.24 * vol, t + 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.55);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t); src.stop(t + 1.6);

      // Dual dissonant air-raid siren warble!
      for (const detuneRatio of [1.0, 1.185]) {
        const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
        osc.frequency.setValueAtTime(340 * detuneRatio, t + 0.08);
        osc.frequency.linearRampToValueAtTime(560 * detuneRatio, t + 0.95);
        osc.frequency.linearRampToValueAtTime(300 * detuneRatio, t + 1.95);
        const oflt = this.ctx.createBiquadFilter(); oflt.type = "bandpass"; oflt.frequency.value = 780; oflt.Q.value = 1.6;
        const og = this.ctx.createGain();
        og.gain.setValueAtTime(0.001, t + 0.08);
        og.gain.linearRampToValueAtTime(0.22 * vol, t + 0.55);
        og.gain.exponentialRampToValueAtTime(0.001, t + 2.05);
        osc.connect(oflt); oflt.connect(og); og.connect(this.master);
        osc.start(t + 0.08); osc.stop(t + 2.10);
      }
    } else if (cueType === "sand_tremor") {
      // Faint subterranean rhythmic bass pulse + shifting sand hiss (Sandwyrm closing in!)
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(44, t); osc.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.28 * vol, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 1.3);
    } else if (cueType === "trex_stomp") {
      // Heavy rhythmic Jurassic ground-shaking thud!
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(76, t); osc.frequency.exponentialRampToValueAtTime(24, t + 0.34);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.32 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 0.40);
    } else if (cueType === "frost_chime") {
      // Brittle crystalline ice crackle (Abominable Snowman stalking!)
      [1180, 1480, 960].forEach((f, idx) => {
        const st = t + idx * 0.14;
        const osc = this.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = f;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.04 * vol, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, st + 0.45);
        osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + 0.48);
      });
    } else if (cueType === "godzilla_stomp") {
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(58, t); osc.frequency.exponentialRampToValueAtTime(20, t + 0.65);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.45 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.72);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 0.75);
    } else if (cueType === "godzilla_hum") {
      const osc = this.ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(140, t); osc.frequency.exponentialRampToValueAtTime(340, t + 1.5);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.14 * vol, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 1.65);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 1.7);
    } else if (cueType === "yeti_breath") {
      // Deep heavy guttural forest snort/branch crack
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 340;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.16 * vol, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t); src.stop(t + 0.9);
    }
  }

  playGlassShatter() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const st = t + i * 0.028;
      const osc = this.ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(1400 + Math.random() * 1100, st);
      osc.frequency.exponentialRampToValueAtTime(520, st + 0.08);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.09);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + 0.10);
    }
  }

  playSheepBleat() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320 + Math.random() * 70, t);
    osc.frequency.linearRampToValueAtTime(255, t + 0.42);
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 24;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 26;
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 880; flt.Q.value = 2.4;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
    osc.connect(flt); flt.connect(g); g.connect(this.master);
    osc.start(t); lfo.start(t); osc.stop(t + 0.50); lfo.stop(t + 0.50);
  }

  playClarksonRage() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    // Colossal booming bass thunder + angry horn bellow!
    const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
    osc.frequency.setValueAtTime(135, t); osc.frequency.exponentialRampToValueAtTime(48, t + 1.3);
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 480;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.42, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
    osc.connect(flt); flt.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 1.4);
  }

  _playForestChirp() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const base = 1450 + Math.random() * 650;
    const notes = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < notes; i++) {
      const st = t + i * 0.11;
      const osc = this.ctx.createOscillator(); osc.type = "sine";
      osc.frequency.setValueAtTime(base, st);
      osc.frequency.exponentialRampToValueAtTime(base * (i % 2 === 0 ? 1.24 : 0.88), st + 0.075);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0005, st);
      g.gain.linearRampToValueAtTime(0.022, st + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0005, st + 0.085);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(st); osc.stop(st + 0.09);
    }
  }

  playTireBlowout() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator(); osc.type = "triangle";
    osc.frequency.setValueAtTime(165, t); osc.frequency.exponentialRampToValueAtTime(34, t + 0.16);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.46, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(og); og.connect(this.master); osc.start(t); osc.stop(t + 0.20);

    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass";
    flt.frequency.setValueAtTime(1400, t); flt.frequency.exponentialRampToValueAtTime(750, t + 0.85); flt.Q.value = 1.6;
    const ng = this.ctx.createGain();
    ng.gain.setValueAtTime(0.38, t); ng.gain.exponentialRampToValueAtTime(0.14, t + 0.18);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.92);
    src.connect(flt); flt.connect(ng); ng.connect(this.master); src.start(t); src.stop(t + 0.95);
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1.0, val));
    if (this.started && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume * 0.58, this.ctx.currentTime, 0.05);
    }
  }

  _applyEngineVoice(engSpec) {
    if (!engSpec || !this.started) return;
    if (this.lastEngId === engSpec.id) return;
    this.lastEngId = engSpec.id;
    const p = engSpec.soundProfile || {};
    this.subOsc.type = p.subWave || "sine";
    this.bodyOsc.type = p.bodyWave || "triangle";
    this.growlOsc.type = p.growlWave || "sawtooth";
    this.subGain.gain.value = p.subLvl !== undefined ? p.subLvl : 0.54;
    this.bodyGain.gain.value = p.bodyLvl !== undefined ? p.bodyLvl : 0.42;
    this.growlGain.gain.value = p.growlLvl !== undefined ? p.growlLvl : 0.26;
    this.engShaper.curve = this._makeWarmSaturation(p.warmth !== undefined ? p.warmth : 5);
  }

  updateEngine(rpm, throttle, boostPsi, engSpec, running, onFoot, weather, hasTwinTurboUpgrade = false, isTracked = false, speedKmh = 0, dt = 0.016) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const volScale = onFoot ? 0.24 : 1.0;

    if (this.flutterCooldown > 0) this.flutterCooldown = Math.max(0, this.flutterCooldown - 0.016);

    if (running && engSpec) {
      this._applyEngineVoice(engSpec);
      const sp = engSpec.soundProfile || {
        subMult: 0.5, bodyMult: 1.0, growlMult: 1.5,
        filterBase: 160, filterMax: 920, wobbleHz: 0, wobbleAmt: 0, airLvl: 0.04
      };

      // Warm realistic firing frequency (deep bass fundamental, NEVER squeaky!)
      const baseHz = Math.max(24, Math.min(265, (rpm / 60) * 1.22 * (engSpec.basePitch || 0.85)));
      const rpmNorm = Math.min(1.08, Math.max(0, (rpm - engSpec.idleRpm) / Math.max(1500, engSpec.redlineRpm - engSpec.idleRpm)));

      this.subOsc.frequency.setTargetAtTime(baseHz * (sp.subMult || 0.5), t, 0.035);
      this.bodyOsc.frequency.setTargetAtTime(baseHz * (sp.bodyMult || 1.0), t, 0.035);
      this.growlOsc.frequency.setTargetAtTime(baseHz * (sp.growlMult || 1.5), t, 0.035);

      // Keep filter cutoff warm & natural (never piercing!)
      const fBase = sp.filterBase || 160;
      const fMax = sp.filterMax || 950;
      const cutFreq = fBase + rpmNorm * (fMax - fBase) * 0.72 + throttle * (fMax - fBase) * 0.32;
      this.engFilter.frequency.setTargetAtTime(Math.min(1350, cutFreq), t, 0.05);
      this.engGain.gain.setTargetAtTime((0.16 + throttle * 0.14 + rpmNorm * 0.05) * volScale, t, 0.05);

      // Gentle rhythmic exhaust pulse (Boxer rumble / V8 lope / Diesel chug)
      if (sp.wobbleHz > 0) {
        this.wobbleOsc.frequency.setTargetAtTime(sp.wobbleHz * (0.6 + rpmNorm * 1.35), t, 0.06);
        this.wobbleDepth.gain.setTargetAtTime((sp.wobbleAmt || 0.14) * (1.0 - rpmNorm * 0.35), t, 0.06);
      } else {
        this.wobbleDepth.gain.setTargetAtTime(0.0, t, 0.08);
      }

      // Natural intake / exhaust air texture
      const airFreq = 260 + rpmNorm * 580 + throttle * 220;
      this.intakeFilter.frequency.setTargetAtTime(airFreq, t, 0.05);
      this.intakeGain.gain.setTargetAtTime((sp.airLvl || 0.045) * (0.25 + throttle * 0.85) * (0.4 + rpmNorm * 0.6) * volScale, t, 0.05);

      // ----------------------------------------------------------------------
      // REWORKED TURBO / SUPERCHARGER: Low, Mellow Air-Whoosh (ZERO Ear Fatigue!)
      // ----------------------------------------------------------------------
      const isTT = !!(engSpec.isTwinTurbo || hasTwinTurboUpgrade);
      if (engSpec.id === "mdv16_diesel" && this.v16MasterG) {
        // v14.1P THUNDEROUS 1,600 HP V16 TANK DIESEL (Deep 26-82 Hz sub-rumble + saturated iron V16 roar + industrial turbine!)
        const v16Fund = 26 + rpmNorm * 56;
        this.v16Sub.frequency.setTargetAtTime(v16Fund, t, 0.04);
        this.v16Growl.frequency.setTargetAtTime(v16Fund * 2.0, t, 0.04);
        this.v16Harm.frequency.setTargetAtTime(v16Fund * 3.01, t, 0.04);
        this.v16LP.frequency.setTargetAtTime(155 + rpmNorm * 265 + throttle * 185, t, 0.05);
        this.v16MasterG.gain.setTargetAtTime((0.30 + throttle * 0.24 + rpmNorm * 0.12) * volScale, t, 0.05);

        this.v16NoiseBP.frequency.setTargetAtTime(135 + rpmNorm * 270 + throttle * 150, t, 0.05);
        this.v16NoiseG.gain.setTargetAtTime((0.10 + throttle * 0.18 + rpmNorm * 0.08) * volScale, t, 0.05);

        this.engGain.gain.setTargetAtTime((0.07 + throttle * 0.06) * volScale, t, 0.05);
        this.turboHumOsc.frequency.setTargetAtTime(220 + rpmNorm * 280 + Math.max(0, boostPsi) * 5, t, 0.05);
        this.turboHumGain.gain.setTargetAtTime((0.012 + throttle * 0.034 * rpmNorm) * volScale, t, 0.06);
        this.turboAirFilter.frequency.setTargetAtTime(340 + rpmNorm * 400, t, 0.05);
        this.turboAirGain.gain.setTargetAtTime((0.032 + throttle * 0.075) * volScale, t, 0.05);
      } else {
        if (this.v16MasterG) {
          this.v16MasterG.gain.setTargetAtTime(0.0, t, 0.08);
          this.v16NoiseG.gain.setTargetAtTime(0.0, t, 0.08);
        }
      }
      if (engSpec.id === "mdv16_diesel") {
        // Driven by dedicated V16 tank diesel bank above
      } else if (engSpec.isSupercharged) {
        const scHz = 520 + rpmNorm * 520;
        this.turboHumOsc.frequency.setTargetAtTime(scHz, t, 0.05);
        this.turboHumGain.gain.setTargetAtTime((0.008 + throttle * 0.028 * rpmNorm) * volScale, t, 0.06);
        this.turboAirGain.gain.setTargetAtTime(0.015 * throttle * volScale, t, 0.06);
      } else if (boostPsi > 1.5) {
        const bNorm = Math.min(1.0, boostPsi / 24);
        // Smooth rushing air intake whoosh (620 - 1180 Hz bandpass)
        this.turboAirFilter.frequency.setTargetAtTime(620 + bNorm * 540, t, 0.06);
        this.turboAirGain.gain.setTargetAtTime(bNorm * (isTT ? 0.075 : 0.052) * volScale, t, 0.06);
        // Very quiet, low-pitched warm turbine hum (420 - 820 Hz MAX — never shrill!)
        this.turboHumOsc.frequency.setTargetAtTime(420 + bNorm * 390, t, 0.06);
        this.turboHumGain.gain.setTargetAtTime(bNorm * (isTT ? 0.026 : 0.016) * volScale, t, 0.06);
      } else {
        this.turboAirGain.gain.setTargetAtTime(0.0, t, 0.08);
        this.turboHumGain.gain.setTargetAtTime(0.0, t, 0.08);
      }

      // AWESOME STUTUTUTU BOV FLUTTER ON LIFT-OFF!
      if (this.prevThrottle > 0.45 && throttle < 0.16 && this.prevBoost > 5.5 && this.flutterCooldown <= 0) {
        this.playTurboFlutter(isTT, this.prevBoost);
        this.flutterCooldown = 0.45;
      }
      // Steel Tank Track Clatter & Sprocket Hum when driving the T-72B!
    if (isTracked && speedKmh > 2.5 && Math.random() < Math.min(0.45, dt * (speedKmh * 0.45))) {
      const cl = this.ctx.createOscillator(); cl.type = "triangle";
      cl.frequency.setValueAtTime(140 + Math.random() * 110 + speedKmh * 2.2, t);
      cl.frequency.exponentialRampToValueAtTime(58, t + 0.045);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(Math.min(0.11, 0.03 + speedKmh * 0.0014), t);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      cl.connect(cg); cg.connect(this.master); cl.start(t); cl.stop(t + 0.055);
    }
    this.prevThrottle = throttle;
      this.prevBoost = boostPsi;
    } else {
      this.engGain.gain.setTargetAtTime(0, t, 0.10);
      if (this.v16MasterG) { this.v16MasterG.gain.setTargetAtTime(0, t, 0.10); this.v16NoiseG.gain.setTargetAtTime(0, t, 0.10); }
      this.intakeGain.gain.setTargetAtTime(0, t, 0.10);
      this.turboAirGain.gain.setTargetAtTime(0, t, 0.10);
      this.turboHumGain.gain.setTargetAtTime(0, t, 0.10);
    }

    const rainVol = (weather === "hurricane") ? 0.18 : ((weather === "storm") ? 0.13 : (weather === "rain" ? 0.07 : 0.0));
    this.rainGain.gain.setTargetAtTime(rainVol, t, 0.35);
  }

  setHorn(active, isHeavyTruck = false, isSchreckensfurst = false) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    if (isSchreckensfurst && this.dhMasterG) {
      this.hornGain.gain.setTargetAtTime(0.0, t, 0.02);
      // Aggressive roaring brass bell swell & crisp roar attack!
      this.dhBell.frequency.setTargetAtTime(active ? 1220 : 340, t, active ? 0.09 : 0.34);
      this.dhMasterG.gain.setTargetAtTime(active ? 0.64 : 0.0, t, active ? 0.07 : 0.32);
    } else {
      if (this.dhMasterG) this.dhMasterG.gain.setTargetAtTime(0.0, t, 0.15);
      this.hornOsc1.frequency.setTargetAtTime(isHeavyTruck ? 148 : 310, t, 0.02);
      this.hornOsc2.frequency.setTargetAtTime(isHeavyTruck ? 186 : 388, t, 0.02);
      this.hornFilter.frequency.setTargetAtTime(950, t, 0.03);
      this.hornGain.gain.setTargetAtTime(active ? 0.22 : 0.0, t, 0.02);
    }
  }

  // ==========================================================================
  // v14.1P 3D STEREO PROXIMITY ENGINE & HORN AUDIO FOR ALL ONLINE LAN PLAYERS!
  // ==========================================================================
  _createRemoteVoice() {
    const sub = this.ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = 40;
    const body = this.ctx.createOscillator(); body.type = "sawtooth"; body.frequency.value = 80;
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 260; flt.Q.value = 1.4;
    const g = this.ctx.createGain(); g.gain.value = 0.0;

    const h1 = this.ctx.createOscillator(); h1.type = "triangle"; h1.frequency.value = 116.54;
    const h2 = this.ctx.createOscillator(); h2.type = "sawtooth"; h2.frequency.value = 174.61;
    const hFlt = this.ctx.createBiquadFilter(); hFlt.type = "lowpass"; hFlt.frequency.value = 620;
    const hG = this.ctx.createGain(); hG.gain.value = 0.0;

    let panner = null;
    if (typeof this.ctx.createStereoPanner === "function") {
      panner = this.ctx.createStereoPanner();
      panner.pan.value = 0;
      g.connect(panner);
      hG.connect(panner);
      panner.connect(this.master);
    } else {
      g.connect(this.master);
      hG.connect(this.master);
    }

    const subG = this.ctx.createGain(); subG.gain.value = 0.68;
    const bodyG = this.ctx.createGain(); bodyG.gain.value = 0.44;
    sub.connect(subG); subG.connect(flt);
    body.connect(bodyG); bodyG.connect(flt);
    flt.connect(g);

    h1.connect(hFlt); h2.connect(hFlt); hFlt.connect(hG);
    sub.start(); body.start(); h1.start(); h2.start();
    return { sub, body, flt, g, h1, h2, hFlt, hG, panner };
  }

  _disposeRemoteVoice(v) {
    try {
      v.sub.stop(); v.body.stop(); v.h1.stop(); v.h2.stop();
      v.g.disconnect(); v.hG.disconnect();
      if (v.panner) v.panner.disconnect();
    } catch (e) {}
  }

  updateRemoteEngines(remotePlayersMap, listenerPos, listenerRight) {
    if (!this.started || !remotePlayersMap) return;
    const t = this.ctx.currentTime;
    const activePeers = new Set();

    if (!this.muted) {
      for (const [pid, rp] of remotePlayersMap.entries()) {
        const dx = (rp.gx || 0) - listenerPos.x;
        const dy = (rp.gy || 0) - listenerPos.y;
        const dz = (rp.gz || 0) - listenerPos.z;
        const dist = Math.hypot(dx, dy, dz);
        const isTank = (rp.vehicleId === "pzkpfw_140a4" || rp.vehicleId === "t72" || rp.vehicleId === "shilka" || rp.vehicleId === "bm21");
        const maxDist = isTank ? 190 : 135;

        if (dist > maxDist || (!rp.engOn && !rp.hornActive)) continue;
        activePeers.add(pid);

        let v = this.remoteVoices.get(pid);
        if (!v && this.remoteVoices.size < 8) {
          v = this._createRemoteVoice();
          this.remoteVoices.set(pid, v);
        }
        if (!v) continue;

        if (v.panner && listenerRight && dist > 0.5) {
          const pan = Math.max(-0.92, Math.min(0.92, (dx * listenerRight.x + dz * listenerRight.z) / dist));
          v.panner.pan.setTargetAtTime(pan, t, 0.08);
        }

        const atten = Math.pow(Math.max(0, 1.0 - dist / maxDist), 1.80);
        const spec = KK.VEHICLES[rp.vehicleId] || KK.VEHICLES.uaz452;
        const eng = KK.ENGINES[rp.engineId || spec.stockEngineId] || KK.ENGINES.umz_24;
        const rpm = Math.max(eng.idleRpm || 700, rp.rpm || (eng.idleRpm + Math.hypot(rp.vx || 0, rp.vz || 0) * 140));
        const rpmNorm = Math.min(1.05, Math.max(0, (rpm - eng.idleRpm) / Math.max(1200, eng.redlineRpm - eng.idleRpm)));
        const thr = rp.throttle || 0;

        if (rp.engOn) {
          const is140 = (rp.vehicleId === "pzkpfw_140a4");
          const baseHz = is140 ? (26 + rpmNorm * 56) : Math.max(26, Math.min(220, (rpm / 60) * 1.15 * (eng.basePitch || 0.85)));
          v.sub.frequency.setTargetAtTime(is140 ? baseHz : baseHz * 0.5, t, 0.06);
          v.body.frequency.setTargetAtTime(is140 ? baseHz * 2.0 : baseHz, t, 0.06);
          v.flt.frequency.setTargetAtTime((is140 ? 175 : 240) + rpmNorm * 420 + thr * 180, t, 0.08);
          const volBase = is140 ? 0.36 : (isTank ? 0.28 : 0.20);
          v.g.gain.setTargetAtTime(atten * volBase * (0.62 + thr * 0.45 + rpmNorm * 0.25), t, 0.08);
        } else {
          v.g.gain.setTargetAtTime(0.0, t, 0.12);
        }

        if (rp.hornActive) {
          const is140 = (rp.vehicleId === "pzkpfw_140a4");
          const isHvy = (rp.vehicleId === "kamaz" || isTank);
          v.h1.frequency.setTargetAtTime(is140 ? 116.54 : (isHvy ? 148 : 310), t, 0.04);
          v.h2.frequency.setTargetAtTime(is140 ? 174.61 : (isHvy ? 186 : 388), t, 0.04);
          v.hFlt.frequency.setTargetAtTime(is140 ? 580 : 920, t, 0.05);
          v.hG.gain.setTargetAtTime(atten * (is140 ? 0.44 : 0.24), t, 0.08);
        } else {
          v.hG.gain.setTargetAtTime(0.0, t, 0.18);
        }
      }
    }

    for (const [pid, v] of this.remoteVoices.entries()) {
      if (!activePeers.has(pid)) {
        if (!remotePlayersMap.has(pid)) {
          this._disposeRemoteVoice(v);
          this.remoteVoices.delete(pid);
        } else {
          v.g.gain.setTargetAtTime(0.0, t, 0.12);
          v.hG.gain.setTargetAtTime(0.0, t, 0.12);
        }
      }
    }
  }

  // Crisp, warm, super-satisfying STUTUTUTU compressor surge flutter!
  playTurboFlutter(isTT = false, boostPsi = 14) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const pulses = isTT ? 7 : 5;
    const intensity = Math.min(1.2, 0.65 + (boostPsi / 24) * 0.55);
    const baseVol = (isTT ? 0.26 : 0.20) * intensity;

    for (let i = 0; i < pulses; i++) {
      const st = t + i * (isTT ? 0.062 : 0.072);
      const decay = Math.pow(0.84, i);

      // Warm mid-range air chop ("stu-tu-tu-tu") — tuned around 950–1550 Hz so it's punchy & NEVER harsh!
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter();
      flt.type = "bandpass";
      flt.frequency.setValueAtTime((isTT ? 1520 : 1320) - i * 95, st);
      flt.Q.value = 3.6;

      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(baseVol * decay, st + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.056);

      src.connect(flt);
      flt.connect(g);
      g.connect(this.master);
      src.start(st);
      src.stop(st + 0.062);

      // Subtle low-mid air valve pop body underneath the first 4 chops
      if (i < 4) {
        const pop = this.ctx.createOscillator();
        pop.type = "triangle";
        pop.frequency.setValueAtTime(360 - i * 32, st);
        pop.frequency.exponentialRampToValueAtTime(140, st + 0.045);
        const pg = this.ctx.createGain();
        pg.gain.setValueAtTime(0.065 * decay, st);
        pg.gain.exponentialRampToValueAtTime(0.001, st + 0.048);
        pop.connect(pg);
        pg.connect(this.master);
        pop.start(st);
        pop.stop(st + 0.052);
      }
    }
  }

  // v16.1 Surface-Aware Tire Slip Audio (1 Pooled Bandpass Filter — 0 GC!)
  updateTireSlip(slip, speedKmh, surface = "tarmac") {
    if (!this.ctx || !this.master || !this.noiseBuf) return;
    if (!this._slipGain) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const flt = this.ctx.createBiquadFilter();
      flt.type = "bandpass"; flt.frequency.value = 1350; flt.Q.value = 3.2;
      const gn = this.ctx.createGain();
      gn.gain.value = 0.0;
      src.connect(flt); flt.connect(gn); gn.connect(this.master);
      src.start();
      this._slipFilter = flt; this._slipGain = gn;
    }
    const now = this.ctx.currentTime;
    if (speedKmh < 6) {
      this._slipGain.gain.setTargetAtTime(0.0, now, 0.06);
      return;
    }
    const surf = surface || "asphalt";
    const isHard = (surf === "asphalt" || surf === "race_tarmac" || surf === "tarmac" || surf === "concrete");
    const isSlipping = (slip >= 0.20 && speedKmh >= 12);
    let freq, qVal, vol;
    if (isSlipping) {
      freq = surf === "mud" ? 310 : (surf === "gravel" || surf === "shale" || surf === "dirt" ? 680 : (surf === "snow" ? 460 : 1520));
      qVal = isHard ? 5.2 : 1.6;
      vol  = Math.min(0.24, (slip - 0.16) * 0.28 * Math.min(1.0, speedKmh / 48));
    } else {
      const spdFrac = Math.min(1.0, speedKmh / 75);
      if (surf === "mud") { freq = 260; qVal = 1.2; vol = 0.12 * spdFrac; }
      else if (surf === "gravel" || surf === "shale" || surf === "dirt" || surf === "sand") { freq = 620; qVal = 1.1; vol = 0.11 * spdFrac; }
      else if (surf === "snow") { freq = 390; qVal = 1.4; vol = 0.08 * spdFrac; }
      else { freq = 190; qVal = 0.9; vol = 0.032 * spdFrac; }
    }
    this._slipFilter.frequency.setTargetAtTime(freq, now, 0.05);
    this._slipFilter.Q.setTargetAtTime(qVal, now, 0.05);
    this._slipGain.gain.setTargetAtTime(vol, now, 0.04);
  }

  playBackfire() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const pops = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < pops; i++) {
      const st = t + i * (0.065 + Math.random() * 0.05);
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 520 + Math.random() * 240;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.36, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.09);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(st); src.stop(st + 0.10);
    }
  }

  playCryptidSound(kind) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    if (kind === "yeti") {
      const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
      osc.frequency.setValueAtTime(130, t); osc.frequency.exponentialRampToValueAtTime(54, t + 0.9);
      const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 420;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.30, t + 0.12); g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
      osc.connect(flt); flt.connect(g); g.connect(this.master); osc.start(t); osc.stop(t + 1.0);
    } else if (kind === "snowman") {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.Q.value = 4.5;
      flt.frequency.setValueAtTime(740, t); flt.frequency.exponentialRampToValueAtTime(280, t + 1.2);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.28, t + 0.2); g.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t); src.stop(t + 1.3);
    } else if (kind === "sandworm") {
      // Colossal subterranean bass seismic roar!
      const osc = this.ctx.createOscillator(); osc.type = "triangle";
      osc.frequency.setValueAtTime(52, t); osc.frequency.linearRampToValueAtTime(24, t + 1.8);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.55, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + 1.85);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 1.9);
    } else if (kind === "sirenhead") {
      // DOMINANT dual-horn air-raid siren wail — clearly louder than rain & twin-turbo engines (master limiter keeps it headphone-safe!)
      for (const [ratio, fPeak] of [[1.0, 640], [1.22, 760]]) {
        const osc = this.ctx.createOscillator(); osc.type = "sawtooth";
        osc.frequency.setValueAtTime(280 * ratio, t);
        osc.frequency.linearRampToValueAtTime(fPeak, t + 1.05);
        osc.frequency.linearRampToValueAtTime(310 * ratio, t + 2.25);
        const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 760; flt.Q.value = 1.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.01, t);
        g.gain.linearRampToValueAtTime(0.56, t + 0.24);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.35);
        osc.connect(flt); flt.connect(g); g.connect(this.master);
        osc.start(t); osc.stop(t + 2.40);
      }
      const stat = this.ctx.createBufferSource(); stat.buffer = this.noiseBuf;
      const sf = this.ctx.createBiquadFilter(); sf.type = "bandpass"; sf.frequency.value = 1150; sf.Q.value = 1.8;
      const sg = this.ctx.createGain();
      sg.gain.setValueAtTime(0.22, t); sg.gain.exponentialRampToValueAtTime(0.001, t + 2.1);
      stat.connect(sf); sf.connect(sg); sg.connect(this.master); stat.start(t); stat.stop(t + 2.15);

    } else if (kind === "siren_sonic_blast") {
      // SIREN HEAD SONIC BLAST ATTACK: Massive shuddering distorted megaphone shockwave!
      for (const [f0, f1] of [[240, 820], [310, 980], [95, 48]]) {
        const osc = this.ctx.createOscillator(); osc.type = f0 < 120 ? "triangle" : "sawtooth";
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(f1, t + 0.45);
        osc.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + 2.45);
        const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 1180;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.01, t);
        g.gain.linearRampToValueAtTime(0.68, t + 0.12);
        g.gain.linearRampToValueAtTime(0.45, t + 1.4);
        g.gain.exponentialRampToValueAtTime(0.001, t + 2.55);
        osc.connect(flt); flt.connect(g); g.connect(this.master);
        osc.start(t); osc.stop(t + 2.60);
      }
      const nsrc = this.ctx.createBufferSource(); nsrc.buffer = this.noiseBuf;
      const nf = this.ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 920; nf.Q.value = 1.2;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.45, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      nsrc.connect(nf); nf.connect(ng); ng.connect(this.master); nsrc.start(t); nsrc.stop(t + 2.25);

    } else if (kind === "godzilla_atomic_boom") {
      // GODZILLA ATOMIC RADIATION EMP BOOM: Charging whine -> colossal sub-bass detonation + Geiger crackle!
      const chg = this.ctx.createOscillator(); chg.type = "triangle";
      chg.frequency.setValueAtTime(140, t);
      chg.frequency.exponentialRampToValueAtTime(640, t + 0.48);
      chg.frequency.exponentialRampToValueAtTime(32, t + 2.4);
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.01, t); cg.gain.linearRampToValueAtTime(0.42, t + 0.45);
      cg.gain.exponentialRampToValueAtTime(0.001, t + 2.45);
      chg.connect(cg); cg.connect(this.master); chg.start(t); chg.stop(t + 2.5);

      // Massive atomic shockwave sub-boom at t + 0.45s
      const boom = this.ctx.createOscillator(); boom.type = "sine";
      boom.frequency.setValueAtTime(92, t + 0.44);
      boom.frequency.exponentialRampToValueAtTime(22, t + 2.35);
      const bg = this.ctx.createGain();
      bg.gain.setValueAtTime(0.001, t + 0.44);
      bg.gain.linearRampToValueAtTime(0.75, t + 0.50);
      bg.gain.exponentialRampToValueAtTime(0.001, t + 2.45);
      boom.connect(bg); bg.connect(this.master); boom.start(t + 0.44); boom.stop(t + 2.50);

      // Radio/Geiger EMP static crackle burst
      const emp = this.ctx.createBufferSource(); emp.buffer = this.noiseBuf;
      const ef = this.ctx.createBiquadFilter(); ef.type = "bandpass"; ef.frequency.value = 1450; ef.Q.value = 1.5;
      const eg = this.ctx.createGain();
      eg.gain.setValueAtTime(0.001, t + 0.45);
      eg.gain.linearRampToValueAtTime(0.38, t + 0.52);
      eg.gain.exponentialRampToValueAtTime(0.001, t + 2.15);
      emp.connect(ef); ef.connect(eg); eg.connect(this.master); emp.start(t + 0.45); emp.stop(t + 2.2);
    } else if (kind === "trex") {
      // Deep Jurassic T-Rex bellow!
      const osc1 = this.ctx.createOscillator(); osc1.type = "sawtooth";
      osc1.frequency.setValueAtTime(165, t); osc1.frequency.exponentialRampToValueAtTime(52, t + 1.35);
      const osc2 = this.ctx.createOscillator(); osc2.type = "triangle";
      osc2.frequency.setValueAtTime(84, t); osc2.frequency.exponentialRampToValueAtTime(34, t + 1.35);
      const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 460;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.38, t + 0.14); g.gain.exponentialRampToValueAtTime(0.001, t + 1.40);
      osc1.connect(flt); osc2.connect(flt); flt.connect(g); g.connect(this.master);
      osc1.start(t); osc2.start(t); osc1.stop(t + 1.45); osc2.stop(t + 1.45);
    } else if (kind === "godzilla") {
      // v14.2 ORGANIC BIOLOGICAL KAIJU ROAR (Zero robotic synth buzz! Formant-sculpted vocal breath + guttural sub-bass + mountain echo!)
      // 1. Primary roaring breath throat (noise shaped through sweeping dual biological vocal-tract formants!)
      for (const [f0, f1, f2, qVal, vol, delay] of [
        [680, 310, 145, 3.8, 0.56, 0.00], // Upper pharyngeal raspy roar formant
        [240, 135,  62, 2.6, 0.68, 0.08], // Deep cavernous chest resonance formant
        [440, 210,  95, 2.2, 0.28, 0.65]  // Delayed alpine valley mountain echo!
      ]) {
        const st = t + delay;
        const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
        const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = qVal;
        bp.frequency.setValueAtTime(f0, st);
        bp.frequency.exponentialRampToValueAtTime(f1, st + 1.15);
        bp.frequency.exponentialRampToValueAtTime(f2, st + 3.25);

        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.004, st);
        g.gain.linearRampToValueAtTime(vol, st + 0.26);
        g.gain.setValueAtTime(vol * 0.88, st + 1.65);
        g.gain.exponentialRampToValueAtTime(0.001, st + 3.45);
        src.connect(bp); bp.connect(g); g.connect(this.master);
        src.start(st); src.stop(st + 3.55);
      }

      // 2. Organic guttural vocal-cord vibration (heavily lowpass-filtered & organically fluttered, zero synth harshness!)
      const cord = this.ctx.createOscillator(); cord.type = "triangle";
      cord.frequency.setValueAtTime(118, t + 0.06);
      cord.frequency.exponentialRampToValueAtTime(58, t + 1.55);
      cord.frequency.exponentialRampToValueAtTime(32, t + 3.40);
      const flut = this.ctx.createOscillator(); flut.type = "sine"; flut.frequency.value = 17.5;
      const flutG = this.ctx.createGain(); flutG.gain.value = 14;
      flut.connect(flutG); flutG.connect(cord.frequency);

      const cordLP = this.ctx.createBiquadFilter(); cordLP.type = "lowpass"; cordLP.frequency.value = 185;
      const cordG = this.ctx.createGain();
      cordG.gain.setValueAtTime(0.005, t + 0.06);
      cordG.gain.linearRampToValueAtTime(0.55, t + 0.35);
      cordG.gain.exponentialRampToValueAtTime(0.001, t + 3.45);
      cord.connect(cordLP); cordLP.connect(cordG); cordG.connect(this.master);
      cord.start(t + 0.06); flut.start(t + 0.06); cord.stop(t + 3.50); flut.stop(t + 3.50);
    } else if (kind === "godzilla_beam_charge") {
      const ch = this.ctx.createOscillator(); ch.type = "sawtooth";
      ch.frequency.setValueAtTime(90, t); ch.frequency.exponentialRampToValueAtTime(960, t + 2.1);
      const sub = this.ctx.createOscillator(); sub.type = "sine";
      sub.frequency.setValueAtTime(48, t); sub.frequency.linearRampToValueAtTime(124, t + 2.1);
      const cf = this.ctx.createBiquadFilter(); cf.type = "bandpass"; cf.frequency.setValueAtTime(300, t); cf.frequency.exponentialRampToValueAtTime(1900, t + 2.1); cf.Q.value = 3.6;
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.01, t); cg.gain.linearRampToValueAtTime(0.36, t + 1.85); cg.gain.exponentialRampToValueAtTime(0.001, t + 2.2);
      ch.connect(cf); cf.connect(cg); sub.connect(cg); cg.connect(this.master);
      ch.start(t); sub.start(t); ch.stop(t + 2.25); sub.stop(t + 2.25);
    } else if (kind === "godzilla_beam_fire") {
      const nsrc = this.ctx.createBufferSource(); nsrc.buffer = this.noiseBuf;
      const nf = this.ctx.createBiquadFilter(); nf.type = "bandpass"; nf.frequency.value = 540; nf.Q.value = 0.85;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.01, t); ng.gain.linearRampToValueAtTime(0.68, t + 0.12);
      ng.gain.setValueAtTime(0.60, t + 2.3); ng.gain.exponentialRampToValueAtTime(0.001, t + 2.9);
      nsrc.connect(nf); nf.connect(ng); ng.connect(this.master); nsrc.start(t); nsrc.stop(t + 2.95);

      const hum = this.ctx.createOscillator(); hum.type = "sawtooth";
      hum.frequency.setValueAtTime(168, t); hum.frequency.linearRampToValueAtTime(112, t + 2.8);
      const sub = this.ctx.createOscillator(); sub.type = "sine"; sub.frequency.setValueAtTime(52, t);
      const hg = this.ctx.createGain();
      hg.gain.setValueAtTime(0.45, t); hg.gain.exponentialRampToValueAtTime(0.001, t + 2.85);
      hum.connect(hg); sub.connect(hg); hg.connect(this.master);
      hum.start(t); sub.start(t); hum.stop(t + 2.9); sub.stop(t + 2.9);
    } else if (kind === "skinwalker_shriek") {
      for (let v = 0; v < 3; v++) {
        const osc = this.ctx.createOscillator();
        osc.type = v === 0 ? "sawtooth" : "square";
        const fBase = [740, 1180, 1690][v];
        osc.frequency.setValueAtTime(fBase, t);
        osc.frequency.linearRampToValueAtTime(fBase * 1.48, t + 0.35);
        osc.frequency.linearRampToValueAtTime(fBase * 0.62, t + 1.45);
        osc.frequency.linearRampToValueAtTime(fBase * 1.32, t + 2.15);
        osc.frequency.exponentialRampToValueAtTime(fBase * 0.45, t + 2.95);
        const lfo = this.ctx.createOscillator(); lfo.frequency.value = 34 + v * 11;
        const lfoG = this.ctx.createGain(); lfoG.gain.value = 95;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = fBase * 1.1; flt.Q.value = 2.4;
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.32, t + 0.08);
        g.gain.setValueAtTime(0.28, t + 2.4); g.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
        osc.connect(flt); flt.connect(g); g.connect(this.master);
        osc.start(t); lfo.start(t); osc.stop(t + 3.02); lfo.stop(t + 3.02);
      }
      const cr = this.ctx.createBufferSource(); cr.buffer = this.noiseBuf;
      const cf = this.ctx.createBiquadFilter(); cf.type = "highpass"; cf.frequency.value = 1800;
      const cg = this.ctx.createGain();
      cg.gain.setValueAtTime(0.55, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      cr.connect(cf); cf.connect(cg); cg.connect(this.master); cr.start(t); cr.stop(t + 0.40);
    }
  }

  playImpact(strength = 0.5) {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime, s = Math.max(0.1, Math.min(1.0, strength));
    const osc = this.ctx.createOscillator(); osc.type = "sine";
    osc.frequency.setValueAtTime(110 * (0.7 + s * 0.45), t); osc.frequency.exponentialRampToValueAtTime(28, t + 0.22);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.38 * s, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t); osc.stop(t + 0.25);

    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = 520 + s * 650;
    const ng = this.ctx.createGain(); ng.gain.setValueAtTime(0.24 * s, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
    src.connect(flt); flt.connect(ng); ng.connect(this.master); src.start(t); src.stop(t + 0.19);
  }

  playWoodSnap() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 780 + i * 320; flt.Q.value = 2.0;
      const g = this.ctx.createGain(); const st = t + i * 0.06;
      g.gain.setValueAtTime(0.38, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.14);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(st); src.stop(st + 0.16);
    }
  }

  playImpactWrench() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const st = t + i * 0.085;
      const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
      const flt = this.ctx.createBiquadFilter(); flt.type = "bandpass"; flt.frequency.value = 1150 + i * 80; flt.Q.value = 2.8;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.18, st); g.gain.exponentialRampToValueAtTime(0.001, st + 0.065);
      src.connect(flt); flt.connect(g); g.connect(this.master); src.start(st); src.stop(st + 0.07);
    }
  }

  playWrench() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator(); osc.type = "triangle"; osc.frequency.setValueAtTime(1100 + i * 160, t + i * 0.09);
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.14, t + i * 0.09); g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.07);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t + i * 0.09); osc.stop(t + i * 0.09 + 0.08);
    }
  }

  playThunder() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const flt = this.ctx.createBiquadFilter(); flt.type = "lowpass";
    flt.frequency.setValueAtTime(150, t); flt.frequency.exponentialRampToValueAtTime(42, t + 1.8);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.40, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 1.9);
    src.connect(flt); flt.connect(g); g.connect(this.master); src.start(t); src.stop(t + 1.95);
  }

  playCash() {
    if (!this.started || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
      const g = this.ctx.createGain(); g.gain.setValueAtTime(0.15, t + idx * 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.25);
      osc.connect(g); g.connect(this.weaponBus || this.master); osc.start(t + idx * 0.08); osc.stop(t + idx * 0.08 + 0.27);
    });
  }
};
