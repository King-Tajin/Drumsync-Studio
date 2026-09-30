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

export const PARSER_MISSING_MESSAGE =
  "The MIDI parser failed to load. Check your connection and reload the page.";

export class MidiLoadError extends Error {}

export function isParserAvailable() {
  return typeof Midi !== "undefined";
}

export function isMidiFile(file) {
  return /\.midi?$/i.test(file.name);
}

export function pickMidiFile(fileList) {
  const files = Array.from(fileList);
  return files.find(isMidiFile) || files[0] || null;
}

export function parseMidiBuffer(buffer) {
  if (!isParserAvailable()) {
    throw new MidiLoadError(PARSER_MISSING_MESSAGE);
  }
  /** @type {MidiFile} */
  const midi = new Midi(buffer);
  const notes = [];
  const drumNoteSet = new Set();
  const programSet = new Set();

  midi.tracks.forEach((track) => {
    const isDrum =
      track.channel === 9 || (track.instrument && track.instrument.percussion);
    const program = track.instrument ? track.instrument.number : 0;
    track.notes.forEach((n) => {
      notes.push({
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

  if (notes.length === 0) {
    throw new MidiLoadError("This MIDI file doesn't contain any notes.");
  }
  notes.sort((a, b) => a.time - b.time);

  const lastEnd = notes.reduce(
    (max, n) => Math.max(max, n.time + n.duration),
    0
  );
  const tempo = midi.header.tempos[0];
  return {
    notes,
    drumNoteSet,
    programSet,
    duration:
      Number.isFinite(midi.duration) && midi.duration > 0
        ? midi.duration
        : lastEnd,
    bpm: (tempo && tempo.bpm) || 120,
  };
}
