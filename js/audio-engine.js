import { categorize, familyPatchFor, GM_INSTRUMENT_NAMES } from "./gm-data.js";

const SOUNDFONT_KIT_STORAGE_KEY = "drumsyncSoundfontKit";
const DEFAULT_SOUNDFONT_KIT = "FluidR3_GM";

export const SOUNDFONT_KITS = [
  { id: "FluidR3_GM", label: "FluidR3 GM (default)" },
  { id: "MusyngKite", label: "Musyng Kite (more realistic)" },
];

export const MAIN_INSTRUMENT_COUNT = 120;
const SAMPLE_BASE_URL = "https://gleitz.github.io/midi-js-soundfonts";
const CACHE_CONCURRENCY = 4;
const SMPLR_URL = "https://cdn.jsdelivr.net/npm/smplr@1.1.0/dist/index.mjs";
const SAMPLE_CACHE_NAME = "smplr";
const SAMPLE_CACHE_TTL_MS = 365 * 24 * 60 * 60 * 1000;
const SAMPLE_CACHE_STAMP_KEY = "smplrCacheCreatedAt";

let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;
let voiceBus = null;
let smplrModulePromise = null;
let smplrAttempts = 0;
let legacySampleCacheCleared = null;
const sampleCachesReady = new Map();

function readStoredKit() {
  try {
    const stored = localStorage.getItem(SOUNDFONT_KIT_STORAGE_KEY);
    if (SOUNDFONT_KITS.some((kit) => kit.id === stored)) return stored;
  } catch {}
  return DEFAULT_SOUNDFONT_KIT;
}

let soundfontKit = readStoredKit();

const melodicInstruments = new Map();
const melodicInstrumentsLoading = new Map();

const volumeSlider = document.getElementById("volumeSlider");

function createVoiceBus() {
  const bus = audioCtx.createGain();
  bus.connect(masterGain);
  return bus;
}

function createNoiseBuffer(ctx) {
  const len = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function ensureAudio() {
  if (!audioCtx) {
    /** @type {any} */
    const win = window;
    audioCtx = new (win.AudioContext || win.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(volumeSlider.value);
    masterGain.connect(audioCtx.destination);
    voiceBus = createVoiceBus();
    noiseBuffer = createNoiseBuffer(audioCtx);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function getAudioContext() {
  return audioCtx;
}

export function setMasterVolume(value) {
  if (!masterGain) return;
  masterGain.gain.setTargetAtTime(value, audioCtx.currentTime, 0.02);
}

export function stopAllSounds() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  const oldBus = voiceBus;
  voiceBus = createVoiceBus();
  oldBus.gain.cancelScheduledValues(now);
  oldBus.gain.setTargetAtTime(0, now, 0.01);
  setTimeout(() => oldBus.disconnect(), 300);
  melodicInstruments.forEach((instrument) => {
    if (instrument.scheduler) instrument.scheduler.stop();
    instrument.stop();
  });
}

function playKick(when, vel) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.25);
  gain.gain.setValueAtTime(vel, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
  osc.connect(gain).connect(voiceBus);
  osc.start(when);
  osc.stop(when + 0.32);
}

function playSnare(when, vel) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const bandpass = audioCtx.createBiquadFilter();
  bandpass.type = "bandpass";
  bandpass.frequency.value = 1800;
  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(vel, when);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  noise.connect(bandpass).connect(noiseGain).connect(voiceBus);
  noise.start(when);
  noise.stop(when + 0.2);

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(190, when);
  oscGain.gain.setValueAtTime(vel * 0.6, when);
  oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  osc.connect(oscGain).connect(voiceBus);
  osc.start(when);
  osc.stop(when + 0.14);
}

function playTom(when, vel, note) {
  const freqMap = {
    41: 90,
    43: 110,
    45: 130,
    47: 150,
    48: 170,
    50: 200,
    60: 210,
    61: 160,
    62: 190,
    63: 175,
    64: 125,
    65: 220,
    66: 145,
  };
  const freq = freqMap[note] || 140;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, when + 0.35);
  gain.gain.setValueAtTime(vel, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.38);
  osc.connect(gain).connect(voiceBus);
  osc.start(when);
  osc.stop(when + 0.4);
}

function playHihat(when, vel, open) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 7000;
  const gain = audioCtx.createGain();
  const decay = open ? 0.5 : 0.07;
  gain.gain.setValueAtTime(vel * 0.7, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + decay);
  noise.connect(hp).connect(gain).connect(voiceBus);
  noise.start(when);
  noise.stop(when + decay + 0.02);
}

function playCymbal(when, vel) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const hp = audioCtx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 4000;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel * 0.8, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 1.1);
  noise.connect(hp).connect(gain).connect(voiceBus);
  noise.start(when);
  noise.stop(when + 1.15);
}

function playClick(when, vel) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel * 0.5, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  noise.connect(gain).connect(voiceBus);
  noise.start(when);
  noise.stop(when + 0.06);
}

function playDrumSoundSynth(note, when, vel) {
  const type = categorize(note);
  if (type === "kick") playKick(when, vel);
  else if (type === "snare") playSnare(when, vel);
  else if (type === "tom") playTom(when, vel, note);
  else if (type === "hihat") playHihat(when, vel, note === 46);
  else if (type === "cymbal") playCymbal(when, vel);
  else playClick(when, vel);
}

export function playDrumSound(note, when, vel) {
  playDrumSoundSynth(note, when, vel);
}

function playMelodicSynth(note, when, vel, noteDuration, program) {
  const patch = familyPatchFor(program);
  const freq = 440 * Math.pow(2, (note - 69) / 12);
  const dur = Math.max(noteDuration || 0.3, 0.05);

  const osc1 = audioCtx.createOscillator();
  osc1.type = patch.wave;
  osc1.frequency.value = freq;

  const osc2 = audioCtx.createOscillator();
  osc2.type = patch.sub;
  osc2.frequency.value = freq / 2;
  const osc2Gain = audioCtx.createGain();
  osc2Gain.gain.value = patch.subRatio;

  const filter = audioCtx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = patch.filter;

  const gain = audioCtx.createGain();
  const peak = vel * 0.5;
  const sustain = peak * patch.sustainRatio;
  const decayEnd = when + patch.attack + patch.decay;
  const holdEnd = Math.max(decayEnd, when + dur);

  gain.gain.setValueAtTime(0, when);
  gain.gain.linearRampToValueAtTime(peak, when + patch.attack);
  gain.gain.linearRampToValueAtTime(sustain, decayEnd);
  gain.gain.setValueAtTime(sustain, holdEnd);
  gain.gain.linearRampToValueAtTime(0.0001, holdEnd + patch.release);

  osc1.connect(gain);
  osc2.connect(osc2Gain).connect(gain);
  gain.connect(filter).connect(voiceBus);

  const stopAt = holdEnd + patch.release + 0.02;
  osc1.start(when);
  osc2.start(when);
  osc1.stop(stopAt);
  osc2.stop(stopAt);
}

function sampleCacheName(kit) {
  return `${SAMPLE_CACHE_NAME}-${kit}`;
}

function sampleCacheStampKey(kit) {
  return `${SAMPLE_CACHE_STAMP_KEY}-${kit}`;
}

function clearLegacySampleCache() {
  if (!legacySampleCacheCleared) {
    legacySampleCacheCleared = (async () => {
      try {
        await caches.delete(SAMPLE_CACHE_NAME);
        localStorage.removeItem(SAMPLE_CACHE_STAMP_KEY);
      } catch {}
    })();
  }
  return legacySampleCacheCleared;
}

function expireSampleCache(kit) {
  if (!sampleCachesReady.has(kit)) {
    sampleCachesReady.set(
      kit,
      (async () => {
        await clearLegacySampleCache();
        try {
          const stampKey = sampleCacheStampKey(kit);
          const createdAt = Number(localStorage.getItem(stampKey));
          if (createdAt && Date.now() - createdAt < SAMPLE_CACHE_TTL_MS) return;
          await caches.delete(sampleCacheName(kit));
          localStorage.setItem(stampKey, String(Date.now()));
        } catch {}
      })()
    );
  }
  return sampleCachesReady.get(kit);
}

/**
 * @returns {Promise<any>}
 */
function loadSmplrModule() {
  if (!smplrModulePromise) {
    const suffix = smplrAttempts === 0 ? "" : `#retry-${smplrAttempts}`;
    smplrAttempts++;
    smplrModulePromise = import(`${SMPLR_URL}${suffix}`).catch((err) => {
      smplrModulePromise = null;
      throw err;
    });
  }
  return smplrModulePromise;
}

function isSafari() {
  const ua = navigator.userAgent;
  return (
    ua.includes("Safari") && !ua.includes("Chrome") && !ua.includes("Chromium")
  );
}

function sampleFormat() {
  const audio = document.createElement("audio");
  const formats = isSafari() ? ["mp3"] : ["ogg", "mp3"];
  const supported = formats.find((format) => {
    const canPlay = audio.canPlayType(`audio/${format}`);
    return canPlay === "probably" || canPlay === "maybe";
  });
  return supported || "mp3";
}

function instrumentUrl(kit, name) {
  return `${SAMPLE_BASE_URL}/${kit}/${name}-${sampleFormat()}.js`;
}

async function openKitCache(kit) {
  await expireSampleCache(kit);
  return caches.open(sampleCacheName(kit));
}

export async function listUncachedPrograms() {
  const kit = soundfontKit;
  try {
    const cache = await openKitCache(kit);
    const pattern = new RegExp(`/${kit}/([a-z0-9_]+)-[a-z0-9]+\\.js$`);
    const cachedNames = new Set();
    (await cache.keys()).forEach((request) => {
      const match = pattern.exec(request.url);
      if (match) cachedNames.add(match[1]);
    });
    const missing = [];
    for (let program = 0; program < MAIN_INSTRUMENT_COUNT; program++) {
      if (!cachedNames.has(GM_INSTRUMENT_NAMES[program])) missing.push(program);
    }
    return missing;
  } catch {
    return null;
  }
}

export async function cacheMissingInstruments(
  programs,
  onProgress,
  isCancelled
) {
  const kit = soundfontKit;
  const cache = await openKitCache(kit);
  const queue = [...programs];
  let done = 0;
  let failed = 0;

  async function worker() {
    while (queue.length > 0 && !isCancelled()) {
      const program = queue.shift();
      const name = GM_INSTRUMENT_NAMES[program];
      const url = instrumentUrl(kit, name);
      let failure = null;
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
        else failure = `HTTP ${response.status}`;
      } catch (err) {
        failure = err;
      }
      if (failure) {
        failed++;
        console.warn(`Failed to cache ${name} (${kit})`, failure);
      }
      done++;
      onProgress(done, programs.length);
    }
  }

  await Promise.all(Array.from({ length: CACHE_CONCURRENCY }, worker));
  return { done, failed };
}

function instrumentKey(kit, program) {
  return `${kit}:${program}`;
}

function releaseMelodicInstruments() {
  melodicInstruments.forEach((instrument) => {
    if (instrument.scheduler) instrument.scheduler.stop();
    instrument.stop();
  });
  melodicInstruments.clear();
  melodicInstrumentsLoading.clear();
}

export function getSoundfontKit() {
  return soundfontKit;
}

export function setSoundfontKit(kitId) {
  if (kitId === soundfontKit) return;
  if (!SOUNDFONT_KITS.some((kit) => kit.id === kitId)) return;
  releaseMelodicInstruments();
  soundfontKit = kitId;
  try {
    localStorage.setItem(SOUNDFONT_KIT_STORAGE_KEY, kitId);
  } catch {}
}

function loadMelodicInstrument(program) {
  const kit = soundfontKit;
  const key = instrumentKey(kit, program);
  if (melodicInstruments.has(key)) {
    return Promise.resolve(melodicInstruments.get(key));
  }
  if (melodicInstrumentsLoading.has(key)) {
    return melodicInstrumentsLoading.get(key);
  }
  const name = GM_INSTRUMENT_NAMES[program] || "acoustic_grand_piano";
  const promise = Promise.all([loadSmplrModule(), expireSampleCache(kit)])
    .then(
      ([{ Soundfont, CacheStorage }]) =>
        new Soundfont(audioCtx, {
          instrument: name,
          kit,
          destination: masterGain,
          storage: CacheStorage(sampleCacheName(kit)),
        }).load
    )
    .then((instrument) => {
      if (kit !== soundfontKit) {
        instrument.stop();
        return null;
      }
      melodicInstruments.set(key, instrument);
      return instrument;
    })
    .catch((err) => {
      console.warn(
        `Falling back to synth for program ${program} (${name}, ${kit})`,
        err
      );
      melodicInstrumentsLoading.delete(key);
      return null;
    });
  melodicInstrumentsLoading.set(key, promise);
  return promise;
}

export function preloadInstruments(programs) {
  ensureAudio();
  return Promise.all([...programs].map(loadMelodicInstrument));
}

export function playMelodic(note, when, vel, noteDuration, program) {
  const instrument = melodicInstruments.get(
    instrumentKey(soundfontKit, program || 0)
  );
  if (instrument) {
    instrument.start({
      note,
      velocity: Math.max(1, Math.round(vel * 127)),
      time: when,
      duration: Math.max(noteDuration || 0.3, 0.05),
    });
    return;
  }
  playMelodicSynth(note, when, vel, noteDuration, program);
}
