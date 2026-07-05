import { categorize, familyPatchFor, GM_INSTRUMENT_NAMES } from "./gm-data.js";

const SOUNDFONT_KIT = "FluidR3_GM";

let audioCtx = null;
let masterGain = null;
let noiseBuffer = null;
let smplrModulePromise = null;
let percussionInstrument = null;
let percussionLoading = null;

const melodicInstruments = new Map();
const melodicInstrumentsLoading = new Map();

const volumeSlider = document.getElementById("volumeSlider");

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
    noiseBuffer = createNoiseBuffer(audioCtx);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

export function getAudioContext() {
  return audioCtx;
}

export function setMasterVolume(value) {
  if (masterGain) masterGain.gain.value = value;
}

function playKick(when, vel) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, when);
  osc.frequency.exponentialRampToValueAtTime(40, when + 0.25);
  gain.gain.setValueAtTime(vel, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.3);
  osc.connect(gain).connect(masterGain);
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
  noise.connect(bandpass).connect(noiseGain).connect(masterGain);
  noise.start(when);
  noise.stop(when + 0.2);

  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(190, when);
  oscGain.gain.setValueAtTime(vel * 0.6, when);
  oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);
  osc.connect(oscGain).connect(masterGain);
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
  osc.connect(gain).connect(masterGain);
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
  noise.connect(hp).connect(gain).connect(masterGain);
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
  noise.connect(hp).connect(gain).connect(masterGain);
  noise.start(when);
  noise.stop(when + 1.15);
}

function playClick(when, vel) {
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(vel * 0.5, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
  noise.connect(gain).connect(masterGain);
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
  if (percussionInstrument) {
    percussionInstrument.start({
      note,
      velocity: Math.max(1, Math.round(vel * 127)),
      time: when,
    });
    return;
  }
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
  gain.connect(filter).connect(masterGain);

  const stopAt = holdEnd + patch.release + 0.02;
  osc1.start(when);
  osc2.start(when);
  osc1.stop(stopAt);
  osc2.stop(stopAt);
}

/**
 * @returns {Promise<any>}
 */
function loadSmplrModule() {
  if (!smplrModulePromise) {
    smplrModulePromise =
      import("https://cdn.jsdelivr.net/npm/smplr/dist/index.mjs");
  }
  return smplrModulePromise;
}

function loadMelodicInstrument(program) {
  if (melodicInstruments.has(program)) {
    return Promise.resolve(melodicInstruments.get(program));
  }
  if (melodicInstrumentsLoading.has(program)) {
    return melodicInstrumentsLoading.get(program);
  }
  const name = GM_INSTRUMENT_NAMES[program] || "acoustic_grand_piano";
  const promise = loadSmplrModule()
    .then(
      ({ Soundfont }) =>
        new Soundfont(audioCtx, {
          instrument: name,
          kit: SOUNDFONT_KIT,
          destination: masterGain,
        }).load
    )
    .then((instrument) => {
      melodicInstruments.set(program, instrument);
      return instrument;
    })
    .catch((err) => {
      console.warn(
        `Falling back to synth for program ${program} (${name})`,
        err
      );
      return null;
    });
  melodicInstrumentsLoading.set(program, promise);
  return promise;
}

function loadPercussionInstrument() {
  if (percussionInstrument) return Promise.resolve(percussionInstrument);
  if (percussionLoading) return percussionLoading;
  percussionLoading = loadSmplrModule()
    .then(
      ({ Soundfont }) =>
        new Soundfont(audioCtx, {
          instrument: "percussion",
          kit: SOUNDFONT_KIT,
          destination: masterGain,
        }).load
    )
    .then((instrument) => {
      percussionInstrument = instrument;
      return instrument;
    })
    .catch((err) => {
      console.warn("Falling back to synthesized drums", err);
      return null;
    });
  return percussionLoading;
}

export function preloadInstruments(programs, needsPercussion) {
  ensureAudio();
  const tasks = [...programs].map(loadMelodicInstrument);
  if (needsPercussion) tasks.push(loadPercussionInstrument());
  return Promise.all(tasks);
}

export function playMelodic(note, when, vel, noteDuration, program) {
  const instrument = melodicInstruments.get(program || 0);
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
