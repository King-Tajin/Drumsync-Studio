import {
  ensureAudio,
  getAudioContext,
  setMasterVolume,
  preloadInstruments,
  playDrumSound,
  playMelodic,
} from "./audio-engine.js";
import {
  resetMapping,
  zonesForNote,
  flashZone,
  renderMappingUI,
  wireMappingEvents,
} from "./zone-mapping.js";

/* global Midi */

/**
 * @typedef {Object} MidiNote
 * @property {number} time
 * @property {number} midi
 * @property {number} velocity
 * @property {number} duration
 */

/**
 * @typedef {Object} MidiInstrument
 * @property {number} number
 * @property {boolean} percussion
 */

/**
 * @typedef {Object} MidiTrack
 * @property {number} channel
 * @property {MidiInstrument} instrument
 * @property {MidiNote[]} notes
 */

/**
 * @typedef {Object} MidiTempo
 * @property {number} bpm
 */

/**
 * @typedef {Object} MidiHeader
 * @property {MidiTempo[]} tempos
 */

/**
 * @typedef {Object} MidiFile
 * @property {MidiTrack[]} tracks
 * @property {number} duration
 * @property {MidiHeader} header
 */

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
};

let audioMode = "all";
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

function scheduleTrigger(
  note,
  vel,
  delaySeconds,
  isDrum,
  noteDuration,
  program
) {
  const when = getAudioContext().currentTime + Math.max(0, delaySeconds);

  if (isDrum) {
    const zoneIds = zonesForNote(note);
    if (audioMode === "all" || zoneIds.length > 0) {
      playDrumSound(note, when, vel);
    }
    if (zoneIds.length > 0) {
      const ms = Math.max(0, delaySeconds) * 1000;
      scheduledTimeouts.push(setTimeout(() => zoneIds.forEach(flashZone), ms));
    }
  } else if (audioMode === "all") {
    playMelodic(note, when, vel, noteDuration, program);
  }
}

function loop() {
  if (!isPlaying) return;
  const elapsed = startOffset + (getAudioContext().currentTime - ctxStartTime);

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
  const audioCtx = ensureAudio();
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
    /** @type {MidiFile} */
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

    resetMapping(
      [...drumNoteSet].sort((a, b) => a - b),
      [...programSet].sort((a, b) => a - b)
    );

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
    setMasterVolume(parseFloat(els.volumeSlider.value));
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

  wireMappingEvents();
}

renderMappingUI();
wireEvents();
