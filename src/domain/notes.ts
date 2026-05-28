const NOTE_OFFSETS: Record<string, number> = {
  C: -9,
  "C#": -8,
  Db: -8,
  D: -7,
  "D#": -6,
  Eb: -6,
  E: -5,
  F: -4,
  "F#": -3,
  Gb: -3,
  G: -2,
  "G#": -1,
  Ab: -1,
  A: 0,
  "A#": 1,
  Bb: 1,
  B: 2,
};

export function noteToFrequency(note: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d)$/.exec(note.trim());

  if (!match) {
    throw new Error(`Invalid note: ${note}`);
  }

  const [, pitchClass, octaveText] = match;
  const octave = Number(octaveText);
  const offset = NOTE_OFFSETS[pitchClass];

  if (offset === undefined) {
    throw new Error(`Invalid pitch class: ${pitchClass}`);
  }

  const semitoneDistanceFromA4 = offset + (octave - 4) * 12;
  return Number((440 * 2 ** (semitoneDistanceFromA4 / 12)).toFixed(3));
}
