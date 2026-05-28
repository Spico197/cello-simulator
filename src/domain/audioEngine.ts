import { BowDirection, KeyBinding } from "./types";

interface ActiveVoice {
  noteId: string;
  oscillator: OscillatorNode;
  bodyOscillator: OscillatorNode;
  gain: GainNode;
  filter: BiquadFilterNode;
  vibratoOscillator: OscillatorNode;
  vibratoGain: GainNode;
}

export interface BowMotion {
  intensity: number;
  bowDirection: BowDirection;
}

export class AudioEngine {
  private audioContext?: AudioContext;
  private outputGain?: GainNode;
  private activeVoice?: ActiveVoice;
  private volume = 0.7;
  private vibratoActive = false;

  startNote(note: KeyBinding, bowDirection: BowDirection, initialIntensity = 0): void {
    if (this.activeVoice?.noteId === note.id) {
      this.updateBow({ intensity: initialIntensity, bowDirection });
      return;
    }

    const audioContext = this.getAudioContext();
    this.stopNote(0.015);

    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const bodyOscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const vibratoOscillator = audioContext.createOscillator();
    const vibratoGain = audioContext.createGain();

    oscillator.type = "sawtooth";
    bodyOscillator.type = "triangle";
    oscillator.frequency.value = note.frequency;
    bodyOscillator.frequency.value = note.frequency * 0.5;
    filter.type = "lowpass";
    filter.frequency.value = bowDirection === "down" ? 1500 : 1250;
    filter.Q.value = 1.1;

    gain.gain.setValueAtTime(0.0001, now);

    vibratoOscillator.type = "sine";
    vibratoOscillator.frequency.value = 5.6;
    vibratoGain.gain.value = this.vibratoActive ? this.vibratoDepthFor(note) : 0;

    vibratoOscillator.connect(vibratoGain);
    vibratoGain.connect(oscillator.detune);
    vibratoGain.connect(bodyOscillator.detune);
    oscillator.connect(filter);
    bodyOscillator.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputGain!);

    oscillator.start();
    bodyOscillator.start();
    vibratoOscillator.start();

    this.activeVoice = {
      noteId: note.id,
      oscillator,
      bodyOscillator,
      gain,
      filter,
      vibratoOscillator,
      vibratoGain,
    };

    this.updateBow({ intensity: initialIntensity, bowDirection });
  }

  updateBow({ intensity, bowDirection }: BowMotion): void {
    if (!this.audioContext || !this.activeVoice) {
      return;
    }

    const normalizedIntensity = Math.min(Math.max(intensity, 0), 1);
    const now = this.audioContext.currentTime;
    const targetGain = Math.max(0.0001, this.volume * normalizedIntensity);
    const filterFrequency =
      (bowDirection === "down" ? 900 : 760) + normalizedIntensity * 1300;

    this.activeVoice.gain.gain.cancelScheduledValues(now);
    this.activeVoice.gain.gain.setTargetAtTime(targetGain, now, 0.018);
    this.activeVoice.filter.frequency.setTargetAtTime(filterFrequency, now, 0.025);
    this.activeVoice.filter.Q.setTargetAtTime(
      0.9 + normalizedIntensity * 1.3,
      now,
      0.025,
    );
  }

  stopNote(releaseSeconds = 0.08): void {
    if (!this.audioContext || !this.activeVoice) {
      return;
    }

    const voice = this.activeVoice;
    const now = this.audioContext.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(Math.max(voice.gain.gain.value, 0.0001), now);
    voice.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseSeconds);

    const stopAt = now + releaseSeconds + 0.02;
    voice.oscillator.stop(stopAt);
    voice.bodyOscillator.stop(stopAt);
    voice.vibratoOscillator.stop(stopAt);
    this.activeVoice = undefined;
  }

  setVibrato(active: boolean): void {
    this.vibratoActive = active;
    if (!this.audioContext || !this.activeVoice) {
      return;
    }

    const now = this.audioContext.currentTime;
    this.activeVoice.vibratoGain.gain.cancelScheduledValues(now);
    this.activeVoice.vibratoGain.gain.linearRampToValueAtTime(
      active ? 14 : 0,
      now + 0.04,
    );
  }

  setVolume(value: number): void {
    this.volume = Math.min(Math.max(value, 0), 1);
    if (!this.audioContext || !this.outputGain) {
      return;
    }

    this.outputGain.gain.setTargetAtTime(
      this.volume,
      this.audioContext.currentTime,
      0.02,
    );
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
      this.outputGain = this.audioContext.createGain();
      this.outputGain.gain.value = this.volume;
      this.outputGain.connect(this.audioContext.destination);
    }

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }

    return this.audioContext;
  }

  private vibratoDepthFor(note: KeyBinding): number {
    return note.positionLabel === "空弦" ? 0 : 14;
  }
}
