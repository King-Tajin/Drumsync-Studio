const GM_MAP = [
  [35, "Acoustic Bass Drum"],
  [36, "Bass Drum 1"],
  [37, "Side Stick"],
  [38, "Acoustic Snare"],
  [39, "Hand Clap"],
  [40, "Electric Snare"],
  [41, "Low Floor Tom"],
  [42, "Closed Hi-Hat"],
  [43, "High Floor Tom"],
  [44, "Pedal Hi-Hat"],
  [45, "Low Tom"],
  [46, "Open Hi-Hat"],
  [47, "Low-Mid Tom"],
  [48, "Hi-Mid Tom"],
  [49, "Crash Cymbal 1"],
  [50, "High Tom"],
  [51, "Ride Cymbal 1"],
  [52, "Chinese Cymbal"],
  [53, "Ride Bell"],
  [54, "Tambourine"],
  [55, "Splash Cymbal"],
  [56, "Cowbell"],
  [57, "Crash Cymbal 2"],
  [58, "Vibraslap"],
  [59, "Ride Cymbal 2"],
  [60, "Hi Bongo"],
  [61, "Low Bongo"],
  [62, "Mute Hi Conga"],
  [63, "Open Hi Conga"],
  [64, "Low Conga"],
  [65, "High Timbale"],
  [66, "Low Timbale"],
  [67, "High Agogo"],
  [68, "Low Agogo"],
  [69, "Cabasa"],
  [70, "Maracas"],
  [71, "Short Whistle"],
  [72, "Long Whistle"],
  [73, "Short Guiro"],
  [74, "Long Guiro"],
  [75, "Claves"],
  [76, "Hi Wood Block"],
  [77, "Low Wood Block"],
  [78, "Mute Cuica"],
  [79, "Open Cuica"],
  [80, "Mute Triangle"],
  [81, "Open Triangle"],
];

const GM_NAME_BY_NOTE = new Map(GM_MAP);

const GM_INSTRUMENT_NAMES = [
  "acoustic_grand_piano",
  "bright_acoustic_piano",
  "electric_grand_piano",
  "honkytonk_piano",
  "electric_piano_1",
  "electric_piano_2",
  "harpsichord",
  "clavinet",
  "celesta",
  "glockenspiel",
  "music_box",
  "vibraphone",
  "marimba",
  "xylophone",
  "tubular_bells",
  "dulcimer",
  "drawbar_organ",
  "percussive_organ",
  "rock_organ",
  "church_organ",
  "reed_organ",
  "accordion",
  "harmonica",
  "tango_accordion",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel",
  "electric_guitar_jazz",
  "electric_guitar_clean",
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar",
  "guitar_harmonics",
  "acoustic_bass",
  "electric_bass_finger",
  "electric_bass_pick",
  "fretless_bass",
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",
  "synth_bass_2",
  "violin",
  "viola",
  "cello",
  "contrabass",
  "tremolo_strings",
  "pizzicato_strings",
  "orchestral_harp",
  "timpani",
  "string_ensemble_1",
  "string_ensemble_2",
  "synth_strings_1",
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "orchestra_hit",
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn",
  "brass_section",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax",
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon",
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute",
  "blown_bottle",
  "shakuhachi",
  "whistle",
  "ocarina",
  "lead_1_square",
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice",
  "lead_7_fifths",
  "lead_8_bass_lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth",
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep",
  "fx_1_rain",
  "fx_2_soundtrack",
  "fx_3_crystal",
  "fx_4_atmosphere",
  "fx_5_brightness",
  "fx_6_goblins",
  "fx_7_echoes",
  "fx_8_scifi",
  "sitar",
  "banjo",
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle",
  "shanai",
  "tinkle_bell",
  "agogo",
  "steel_drums",
  "woodblock",
  "taiko_drum",
  "melodic_tom",
  "synth_drum",
  "reverse_cymbal",
  "guitar_fret_noise",
  "breath_noise",
  "seashore",
  "bird_tweet",
  "telephone_ring",
  "helicopter",
  "applause",
  "gunshot",
];

const AUTO_ZONE_BY_NOTE = new Map([
  [35, "bass"],
  [36, "bass"],
  [37, "tom3"],
  [38, "tom3"],
  [39, "tom3"],
  [40, "tom3"],
  [41, "tom1"],
  [42, "cymbalRod"],
  [43, "tom5"],
  [44, "cymbalRod"],
  [45, "tom2"],
  [46, "cymbalRod"],
  [47, "tom4"],
  [48, "tom4"],
  [49, "cymbalRod"],
  [50, "tom3"],
  [51, "cymbalRod"],
  [52, "cymbalRod"],
  [53, "cymbalRod"],
  [54, "cymbalRod"],
  [55, "cymbalRod"],
  [56, "cymbalRod"],
  [57, "cymbalRod"],
  [58, "cymbalRod"],
  [59, "cymbalRod"],
  [60, "tom3"],
  [61, "tom1"],
  [62, "tom4"],
  [63, "tom4"],
  [64, "tom2"],
  [65, "tom3"],
  [66, "tom5"],
  [67, "tom4"],
  [68, "tom2"],
  [69, "cymbalRod"],
  [70, "cymbalRod"],
  [71, "cymbalRod"],
  [72, "cymbalRod"],
  [73, "cymbalRod"],
  [74, "cymbalRod"],
  [75, "tom3"],
  [76, "tom3"],
  [77, "tom1"],
  [78, "tom5"],
  [79, "tom1"],
  [80, "cymbalRod"],
  [81, "cymbalRod"],
]);

const ZONES = [
  { id: "tom1", label: "Tom 1" },
  { id: "tom2", label: "Tom 2" },
  { id: "tom3", label: "Tom 3" },
  { id: "tom4", label: "Tom 4" },
  { id: "tom5", label: "Tom 5" },
  { id: "cymbalRod", label: "Cymbal" },
  { id: "bass", label: "Bass Drum" },
];

const mapping = {};
ZONES.forEach((z) => {
  mapping[z.id] = [];
});

let songDrumNotes = [];
let fileLoaded = false;

let audioCtx = null;
let noiseBuffer = null;
let masterGain = null;

let notesFlat = [];
let duration = 0;
let bpm = 120;
let isPlaying = false;
let nextNoteIndex = 0;
let ctxStartTime = 0;
let startOffset = 0;
let scheduledTimeouts = [];
let rafId = null;
let isScrubbing = false;

const els = {
  fileStatus: document.getElementById("fileStatus"),
  dropZone: document.getElementById("dropZone"),
  fileInput: document.getElementById("fileInput"),
  dropLabel: document.getElementById("dropLabel"),
  fileMeta: document.getElementById("fileMeta"),
  playBtn: document.getElementById("playBtn"),
  stopBtn: document.getElementById("stopBtn"),
  seekBar: document.getElementById("seekBar"),
  timeDisplay: document.getElementById("timeDisplay"),
  volumeSlider: document.getElementById("volumeSlider"),
  audioModeToggle: document.getElementById("audioModeToggle"),
  palette: document.getElementById("palette"),
  rigSvg: document.getElementById("rigSvg"),
};

let audioMode = "all";

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = parseFloat(els.volumeSlider.value);
    masterGain.connect(audioCtx.destination);
    noiseBuffer = createNoiseBuffer(audioCtx);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
}

function createNoiseBuffer(ctx) {
  const len = ctx.sampleRate * 1.5;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function categorize(note) {
  if ([35, 36].includes(note)) return "kick";
  if ([37, 38, 39, 40].includes(note)) return "snare";
  if ([41, 43, 45, 47, 48, 50, 60, 61, 62, 63, 64, 65, 66].includes(note))
    return "tom";
  if ([42, 44, 46].includes(note)) return "hihat";
  if ([49, 51, 52, 55, 57, 59].includes(note)) return "cymbal";
  return "click";
}

function autoZoneForNote(note) {
  if (AUTO_ZONE_BY_NOTE.has(note)) return AUTO_ZONE_BY_NOTE.get(note);
  const type = categorize(note);
  if (type === "kick") return "bass";
  if (type === "snare") return "tom3";
  if (type === "tom") return "tom3";
  return "cymbalRod";
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

function playDrumSound(note, when, vel) {
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

const FAMILY_PATCHES = {
  piano: {
    wave: "triangle",
    sub: "sine",
    subRatio: 0.3,
    attack: 0.006,
    decay: 0.08,
    sustainRatio: 0.4,
    release: 0.2,
    filter: 3400,
  },
  chromatic: {
    wave: "triangle",
    sub: "sine",
    subRatio: 0.35,
    attack: 0.004,
    decay: 0.05,
    sustainRatio: 0.3,
    release: 0.15,
    filter: 4200,
  },
  organ: {
    wave: "square",
    sub: "sine",
    subRatio: 0.45,
    attack: 0.012,
    decay: 0.02,
    sustainRatio: 0.95,
    release: 0.04,
    filter: 3800,
  },
  guitar: {
    wave: "sawtooth",
    sub: "triangle",
    subRatio: 0.2,
    attack: 0.004,
    decay: 0.1,
    sustainRatio: 0.3,
    release: 0.15,
    filter: 2600,
  },
  bass: {
    wave: "sine",
    sub: "triangle",
    subRatio: 0.55,
    attack: 0.005,
    decay: 0.05,
    sustainRatio: 0.8,
    release: 0.2,
    filter: 1100,
  },
  strings: {
    wave: "sawtooth",
    sub: "sawtooth",
    subRatio: 0.5,
    attack: 0.09,
    decay: 0.15,
    sustainRatio: 0.85,
    release: 0.35,
    filter: 2800,
  },
  ensemble: {
    wave: "sawtooth",
    sub: "square",
    subRatio: 0.4,
    attack: 0.11,
    decay: 0.15,
    sustainRatio: 0.85,
    release: 0.35,
    filter: 2600,
  },
  brass: {
    wave: "sawtooth",
    sub: "square",
    subRatio: 0.3,
    attack: 0.045,
    decay: 0.1,
    sustainRatio: 0.8,
    release: 0.15,
    filter: 3600,
  },
  reed: {
    wave: "sawtooth",
    sub: "sine",
    subRatio: 0.3,
    attack: 0.035,
    decay: 0.08,
    sustainRatio: 0.78,
    release: 0.15,
    filter: 2400,
  },
  pipe: {
    wave: "sine",
    sub: "triangle",
    subRatio: 0.25,
    attack: 0.03,
    decay: 0.05,
    sustainRatio: 0.75,
    release: 0.2,
    filter: 4200,
  },
  lead: {
    wave: "square",
    sub: "sawtooth",
    subRatio: 0.25,
    attack: 0.005,
    decay: 0.04,
    sustainRatio: 0.7,
    release: 0.12,
    filter: 4600,
  },
  pad: {
    wave: "sawtooth",
    sub: "sine",
    subRatio: 0.4,
    attack: 0.18,
    decay: 0.2,
    sustainRatio: 0.9,
    release: 0.45,
    filter: 2200,
  },
  other: {
    wave: "triangle",
    sub: "sine",
    subRatio: 0.3,
    attack: 0.008,
    decay: 0.06,
    sustainRatio: 0.55,
    release: 0.15,
    filter: 3200,
  },
};

function melodicFamily(program) {
  const p = program || 0;
  if (p <= 7) return "piano";
  if (p <= 15) return "chromatic";
  if (p <= 23) return "organ";
  if (p <= 31) return "guitar";
  if (p <= 39) return "bass";
  if (p <= 47) return "strings";
  if (p <= 55) return "ensemble";
  if (p <= 63) return "brass";
  if (p <= 71) return "reed";
  if (p <= 79) return "pipe";
  if (p <= 87) return "lead";
  if (p <= 95) return "pad";
  return "other";
}

function playMelodicSynth(note, when, vel, noteDuration, program) {
  const patch = FAMILY_PATCHES[melodicFamily(program)] || FAMILY_PATCHES.other;
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

let smplrModulePromise = null;
function loadSmplrModule() {
  if (!smplrModulePromise) {
    smplrModulePromise =
      import("https://cdn.jsdelivr.net/npm/smplr/dist/index.mjs");
  }
  return smplrModulePromise;
}

const SOUNDFONT_KIT = "FluidR3_GM";

const melodicInstruments = new Map();
const melodicInstrumentsLoading = new Map();
let percussionInstrument = null;
let percussionLoading = null;

function loadMelodicInstrument(program) {
  if (melodicInstruments.has(program))
    return Promise.resolve(melodicInstruments.get(program));
  if (melodicInstrumentsLoading.has(program))
    return melodicInstrumentsLoading.get(program);
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

function preloadInstruments(programs, needsPercussion) {
  ensureAudio();
  const tasks = [...programs].map(loadMelodicInstrument);
  if (needsPercussion) tasks.push(loadPercussionInstrument());
  return Promise.all(tasks);
}

function playMelodic(note, when, vel, noteDuration, program) {
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

function zonesForNote(note) {
  return ZONES.filter((z) => mapping[z.id].includes(note)).map((z) => z.id);
}

function flashZone(zoneId) {
  const el = els.rigSvg.querySelector(`[data-zone="${zoneId}"]`);
  if (!el) return;
  el.classList.add("lit");
  setTimeout(() => el.classList.remove("lit"), 200);
}

function scheduleTrigger(
  note,
  vel,
  delaySeconds,
  isDrum,
  noteDuration,
  program
) {
  const when = audioCtx.currentTime + Math.max(0, delaySeconds);

  if (isDrum) {
    const zoneIds = zonesForNote(note);
    if (audioMode === "all" || zoneIds.length > 0) {
      playDrumSound(note, when, vel);
    }
    if (zoneIds.length > 0) {
      const ms = Math.max(0, delaySeconds) * 1000;
      const t = setTimeout(() => zoneIds.forEach(flashZone), ms);
      scheduledTimeouts.push(t);
    }
  } else if (audioMode === "all") {
    playMelodic(note, when, vel, noteDuration, program);
  }
}

function previewZone(zoneId) {
  ensureAudio();
  const notes = mapping[zoneId];
  flashZone(zoneId);
  notes.forEach((note) => playDrumSound(note, audioCtx.currentTime, 0.9));
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function updateTimeDisplay(elapsed) {
  els.timeDisplay.textContent = `${formatTime(elapsed)} / ${formatTime(duration)}`;
  if (!isScrubbing && duration > 0) {
    els.seekBar.value = Math.floor((elapsed / duration) * 1000);
  }
}

function clearScheduled() {
  scheduledTimeouts.forEach((t) => clearTimeout(t));
  scheduledTimeouts = [];
}

function stopPlayback(resetPosition) {
  isPlaying = false;
  if (rafId) cancelAnimationFrame(rafId);
  clearScheduled();
  els.playBtn.textContent = "Play";
  if (resetPosition) {
    startOffset = 0;
    nextNoteIndex = 0;
    updateTimeDisplay(0);
  }
}

function loop() {
  if (!isPlaying) return;
  const elapsed = startOffset + (audioCtx.currentTime - ctxStartTime);

  const lookahead = 0.15;
  while (
    nextNoteIndex < notesFlat.length &&
    notesFlat[nextNoteIndex].time <= elapsed + lookahead
  ) {
    const n = notesFlat[nextNoteIndex];
    scheduleTrigger(
      n.midi,
      n.velocity || 0.8,
      n.time - elapsed,
      n.isDrum,
      n.duration,
      n.program
    );
    nextNoteIndex++;
  }

  updateTimeDisplay(elapsed);

  if (elapsed >= duration) {
    stopPlayback(true);
    return;
  }

  rafId = requestAnimationFrame(loop);
}

function startPlayback() {
  ensureAudio();
  ctxStartTime = audioCtx.currentTime;
  isPlaying = true;
  els.playBtn.textContent = "Pause";
  rafId = requestAnimationFrame(loop);
}

function seekTo(fraction) {
  const wasPlaying = isPlaying;
  stopPlayback(false);
  startOffset = fraction * duration;
  nextNoteIndex = notesFlat.findIndex((n) => n.time >= startOffset);
  if (nextNoteIndex === -1) nextNoteIndex = notesFlat.length;
  updateTimeDisplay(startOffset);
  if (wasPlaying) startPlayback();
}

function baseFileMeta() {
  return `Duration ${formatTime(duration)}\nTempo ${Math.round(bpm)} BPM\nNotes ${notesFlat.length}`;
}

function loadMidiFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const midi = new Midi(reader.result);
    notesFlat = [];
    const drumNoteSet = new Set();
    const programSet = new Set();

    midi.tracks.forEach((track) => {
      const isDrum =
        track.channel === 9 ||
        (track.instrument && track.instrument.percussion);
      const program = track.instrument ? track.instrument.number : 0;
      track.notes.forEach((n) => {
        notesFlat.push({
          time: n.time,
          midi: n.midi,
          velocity: n.velocity,
          duration: n.duration,
          isDrum,
          program,
        });
        if (isDrum) drumNoteSet.add(n.midi);
        else programSet.add(program);
      });
    });
    notesFlat.sort((a, b) => a.time - b.time);
    duration = midi.duration;
    bpm = (midi.header.tempos[0] && midi.header.tempos[0].bpm) || 120;

    songDrumNotes = [...drumNoteSet].sort((a, b) => a - b);
    fileLoaded = true;

    ZONES.forEach((z) => {
      mapping[z.id] = [];
    });
    songDrumNotes.forEach((note) => {
      const zoneId = autoZoneForNote(note);
      if (mapping[zoneId] && !mapping[zoneId].includes(note))
        mapping[zoneId].push(note);
    });

    stopPlayback(true);
    els.fileStatus.textContent = file.name;
    els.dropLabel.textContent = file.name;
    els.fileMeta.textContent = baseFileMeta();
    els.playBtn.disabled = true;
    els.stopBtn.disabled = false;
    els.seekBar.disabled = false;

    renderMappingUI();

    const needsPercussion = drumNoteSet.size > 0;
    if (programSet.size > 0 || needsPercussion) {
      els.fileMeta.textContent = `${baseFileMeta()}\nLoading instrument sounds...`;
      preloadInstruments(programSet, needsPercussion).finally(() => {
        els.playBtn.disabled = false;
        els.fileMeta.textContent = baseFileMeta();
      });
    } else {
      els.playBtn.disabled = false;
    }
  };
  reader.readAsArrayBuffer(file);
}

function makeChip(note, label, zoneId) {
  const chip = document.createElement("div");
  chip.className = "chip";
  chip.draggable = true;
  chip.dataset.note = note;

  const span = document.createElement("span");
  span.textContent = `${note} ${label}`;
  chip.appendChild(span);

  if (zoneId) {
    const rm = document.createElement("button");
    rm.className = "chip-remove";
    rm.textContent = "×";
    rm.addEventListener("click", (e) => {
      e.stopPropagation();
      moveNoteToZone(note, null);
    });
    chip.appendChild(rm);
  }

  chip.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData(
      "text/plain",
      JSON.stringify({ note, from: zoneId || "" })
    );
    chip.classList.add("dragging");
  });
  chip.addEventListener("dragend", () => chip.classList.remove("dragging"));

  return chip;
}

function wireDropTarget(el, targetZoneId) {
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    el.classList.add("drag-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("drag-over"));
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drag-over");
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    moveNoteToZone(data.note, targetZoneId);
  });
}

function moveNoteToZone(note, targetZoneId) {
  ZONES.forEach((z) => {
    const idx = mapping[z.id].indexOf(note);
    if (idx !== -1) mapping[z.id].splice(idx, 1);
  });
  if (targetZoneId) {
    if (!mapping[targetZoneId].includes(note)) mapping[targetZoneId].push(note);
  }
  renderMappingUI();
}

function noteLabel(note) {
  return GM_NAME_BY_NOTE.get(note) || `Percussion ${note}`;
}

function renderPalette() {
  els.palette.innerHTML = "";
  if (!fileLoaded) return;
  const assigned = new Set();
  ZONES.forEach((z) => mapping[z.id].forEach((n) => assigned.add(n)));
  songDrumNotes.forEach((note) => {
    if (assigned.has(note)) return;
    els.palette.appendChild(makeChip(note, noteLabel(note), null));
  });
}

function renderZoneLists() {
  ZONES.forEach((zone) => {
    const list = document.querySelector(`.chip-list[data-zone="${zone.id}"]`);
    if (!list) return;
    list.innerHTML = "";
    mapping[zone.id].forEach((note) => {
      list.appendChild(makeChip(note, noteLabel(note), zone.id));
    });
  });
}

function renderMappingUI() {
  renderPalette();
  renderZoneLists();
}

function wireZoneDropTargets() {
  document.querySelectorAll(".chip-list[data-zone]").forEach((list) => {
    wireDropTarget(list, list.dataset.zone);
  });
}

function wireEvents() {
  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files[0]) loadMidiFile(els.fileInput.files[0]);
  });
  ["dragover", "dragleave", "drop"].forEach((evt) => {
    els.dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === "dragover") els.dropZone.classList.add("drag-over");
      else els.dropZone.classList.remove("drag-over");
      if (evt === "drop" && e.dataTransfer.files[0])
        loadMidiFile(e.dataTransfer.files[0]);
    });
  });

  els.playBtn.addEventListener("click", () => {
    ensureAudio();
    if (isPlaying) stopPlayback(false);
    else startPlayback();
  });

  els.stopBtn.addEventListener("click", () => stopPlayback(true));

  els.seekBar.addEventListener("input", () => {
    isScrubbing = true;
  });
  els.seekBar.addEventListener("change", () => {
    isScrubbing = false;
    seekTo(parseInt(els.seekBar.value, 10) / 1000);
  });

  els.volumeSlider.addEventListener("input", () => {
    if (masterGain) masterGain.gain.value = parseFloat(els.volumeSlider.value);
  });

  els.audioModeToggle.querySelectorAll(".segment").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.audioModeToggle
        .querySelectorAll(".segment")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      audioMode = btn.dataset.mode;
    });
  });

  els.rigSvg.querySelectorAll(".drum").forEach((el) => {
    el.addEventListener("click", () => previewZone(el.dataset.zone));
  });

  wireZoneDropTargets();

  els.palette.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.palette.classList.add("drag-over");
  });
  els.palette.addEventListener("dragleave", () =>
    els.palette.classList.remove("drag-over")
  );
  els.palette.addEventListener("drop", (e) => {
    e.preventDefault();
    els.palette.classList.remove("drag-over");
    const data = JSON.parse(e.dataTransfer.getData("text/plain"));
    moveNoteToZone(data.note, null);
  });
}

renderMappingUI();
wireEvents();
