const GM_MAP = [
  [35, "Acoustic Bass Drum"], [36, "Bass Drum 1"], [37, "Side Stick"],
  [38, "Acoustic Snare"], [39, "Hand Clap"], [40, "Electric Snare"],
  [41, "Low Floor Tom"], [42, "Closed Hi-Hat"], [43, "High Floor Tom"],
  [44, "Pedal Hi-Hat"], [45, "Low Tom"], [46, "Open Hi-Hat"],
  [47, "Low-Mid Tom"], [48, "Hi-Mid Tom"], [49, "Crash Cymbal 1"],
  [50, "High Tom"], [51, "Ride Cymbal 1"], [52, "Chinese Cymbal"],
  [53, "Ride Bell"], [54, "Tambourine"], [55, "Splash Cymbal"],
  [56, "Cowbell"], [57, "Crash Cymbal 2"], [58, "Vibraslap"],
  [59, "Ride Cymbal 2"], [60, "Hi Bongo"], [61, "Low Bongo"],
  [62, "Mute Hi Conga"], [63, "Open Hi Conga"], [64, "Low Conga"],
  [65, "High Timbale"], [66, "Low Timbale"], [67, "High Agogo"],
  [68, "Low Agogo"], [69, "Cabasa"], [70, "Maracas"],
  [71, "Short Whistle"], [72, "Long Whistle"], [73, "Short Guiro"],
  [74, "Long Guiro"], [75, "Claves"], [76, "Hi Wood Block"],
  [77, "Low Wood Block"], [78, "Mute Cuica"], [79, "Open Cuica"],
  [80, "Mute Triangle"], [81, "Open Triangle"]
];

const GM_NAME_BY_NOTE = new Map(GM_MAP);

const ZONES = [
  { id: "tom1", label: "Tom 1", note: 41 },
  { id: "tom2", label: "Tom 2", note: 45 },
  { id: "tom3", label: "Tom 3", note: 50 },
  { id: "tom4", label: "Tom 4", note: 48 },
  { id: "tom5", label: "Tom 5", note: 43 },
  { id: "cymbalRod", label: "Cymbal", note: 49 },
  { id: "bass", label: "Bass Drum", note: 36 }
];

const mapping = {};
ZONES.forEach(z => { mapping[z.id] = z.note; });

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
  mappingList: document.getElementById("mappingList"),
  rigSvg: document.getElementById("rigSvg")
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
  if ([41, 43, 45, 47, 48, 50].includes(note)) return "tom";
  if ([42, 44, 46].includes(note)) return "hihat";
  if ([49, 51, 52, 55, 57, 59].includes(note)) return "cymbal";
  return "click";
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
  const freqMap = { 41: 90, 43: 110, 45: 130, 47: 150, 48: 170, 50: 200 };
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

function playDrumSound(note, when, vel) {
  const type = categorize(note);
  if (type === "kick") playKick(when, vel);
  else if (type === "snare") playSnare(when, vel);
  else if (type === "tom") playTom(when, vel, note);
  else if (type === "hihat") playHihat(when, vel, note === 46);
  else if (type === "cymbal") playCymbal(when, vel);
  else playClick(when, vel);
}

function zonesForNote(note) {
  return ZONES.filter(z => mapping[z.id] === note).map(z => z.id);
}

function flashZone(zoneId) {
  const el = els.rigSvg.querySelector(`[data-zone="${zoneId}"]`);
  if (!el) return;
  el.classList.add("lit");
  setTimeout(() => el.classList.remove("lit"), 200);
}

function scheduleTrigger(note, vel, delaySeconds) {
  const zoneIds = zonesForNote(note);
  const when = audioCtx.currentTime + Math.max(0, delaySeconds);

  if (audioMode === "all" || zoneIds.length > 0) {
    playDrumSound(note, when, vel);
  }

  if (zoneIds.length > 0) {
    const ms = Math.max(0, delaySeconds) * 1000;
    const t = setTimeout(() => zoneIds.forEach(flashZone), ms);
    scheduledTimeouts.push(t);
  }
}

function previewZone(zoneId) {
  ensureAudio();
  const note = mapping[zoneId];
  flashZone(zoneId);
  if (note != null) playDrumSound(note, audioCtx.currentTime, 0.9);
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
  scheduledTimeouts.forEach(t => clearTimeout(t));
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
  while (nextNoteIndex < notesFlat.length && notesFlat[nextNoteIndex].time <= elapsed + lookahead) {
    const n = notesFlat[nextNoteIndex];
    scheduleTrigger(n.midi, n.velocity || 0.8, n.time - elapsed);
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
  nextNoteIndex = notesFlat.findIndex(n => n.time >= startOffset);
  if (nextNoteIndex === -1) nextNoteIndex = notesFlat.length;
  updateTimeDisplay(startOffset);
  if (wasPlaying) startPlayback();
}

function loadMidiFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const midi = new Midi(reader.result);
    notesFlat = [];
    midi.tracks.forEach(track => {
      track.notes.forEach(n => {
        notesFlat.push({ time: n.time, midi: n.midi, velocity: n.velocity, duration: n.duration });
      });
    });
    notesFlat.sort((a, b) => a.time - b.time);
    duration = midi.duration;
    bpm = (midi.header.tempos[0] && midi.header.tempos[0].bpm) || 120;

    stopPlayback(true);
    els.fileStatus.textContent = file.name;
    els.dropLabel.textContent = file.name;
    els.fileMeta.textContent = `Duration ${formatTime(duration)}\nTempo ${Math.round(bpm)} BPM\nNotes ${notesFlat.length}`;
    els.playBtn.disabled = false;
    els.stopBtn.disabled = false;
    els.seekBar.disabled = false;
  };
  reader.readAsArrayBuffer(file);
}

function buildMappingRows() {
  els.mappingList.innerHTML = "";
  ZONES.forEach(zone => {
    const row = document.createElement("div");
    row.className = "mapping-row";

    const name = document.createElement("span");
    name.className = "zone-name";
    name.textContent = zone.label;

    const select = document.createElement("select");
    GM_MAP.forEach(([note, label]) => {
      const opt = document.createElement("option");
      opt.value = note;
      opt.textContent = `${note} — ${label}`;
      if (mapping[zone.id] === note) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      mapping[zone.id] = parseInt(select.value, 10);
      renderZoneSubLabels();
    });

    row.appendChild(name);
    row.appendChild(select);
    els.mappingList.appendChild(row);
  });
}

function renderZoneSubLabels() {
  ZONES.forEach(zone => {
    const el = document.getElementById(`sub-${zone.id}`);
    if (!el) return;
    const note = mapping[zone.id];
    el.textContent = note != null ? `${note} ${GM_NAME_BY_NOTE.get(note) || ""}` : "unmapped";
  });
}

function wireEvents() {
  els.dropZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", () => {
    if (els.fileInput.files[0]) loadMidiFile(els.fileInput.files[0]);
  });
  ["dragover", "dragleave", "drop"].forEach(evt => {
    els.dropZone.addEventListener(evt, e => {
      e.preventDefault();
      if (evt === "dragover") els.dropZone.classList.add("drag-over");
      else els.dropZone.classList.remove("drag-over");
      if (evt === "drop" && e.dataTransfer.files[0]) loadMidiFile(e.dataTransfer.files[0]);
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

  els.audioModeToggle.querySelectorAll(".segment").forEach(btn => {
    btn.addEventListener("click", () => {
      els.audioModeToggle.querySelectorAll(".segment").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      audioMode = btn.dataset.mode;
    });
  });

  els.rigSvg.querySelectorAll(".drum").forEach(el => {
    el.addEventListener("click", () => previewZone(el.dataset.zone));
  });
}

buildMappingRows();
renderZoneSubLabels();
wireEvents();
