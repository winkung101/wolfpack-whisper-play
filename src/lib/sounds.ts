// Sound effects using Web Audio API
class SoundManager {
  private audioContext: AudioContext | null = null;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) {
    const ctx = this.getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }

  // Mysterious join sound
  playJoin() {
    this.playTone(220, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(330, 0.2, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(440, 0.3, 'sine', 0.2), 200);
  }

  // Ready click sound
  playReady() {
    this.playTone(523, 0.1, 'square', 0.15);
    setTimeout(() => this.playTone(659, 0.15, 'square', 0.2), 80);
    setTimeout(() => this.playTone(784, 0.2, 'square', 0.15), 160);
  }

  // Dramatic reveal sound
  playReveal() {
    // Deep mysterious chord
    this.playTone(130, 0.8, 'sine', 0.3);
    this.playTone(165, 0.8, 'sine', 0.25);
    this.playTone(196, 0.8, 'sine', 0.2);
    
    // Rising tension
    setTimeout(() => {
      this.playTone(262, 0.3, 'sine', 0.25);
      this.playTone(330, 0.3, 'sine', 0.2);
    }, 300);
    
    // Final reveal note
    setTimeout(() => {
      this.playTone(392, 0.5, 'triangle', 0.3);
      this.playTone(523, 0.5, 'triangle', 0.25);
    }, 500);
  }

  // Game start fanfare
  playGameStart() {
    const notes = [262, 330, 392, 523];
    notes.forEach((note, i) => {
      setTimeout(() => this.playTone(note, 0.2, 'triangle', 0.25), i * 100);
    });
    setTimeout(() => {
      this.playTone(523, 0.5, 'triangle', 0.3);
      this.playTone(659, 0.5, 'triangle', 0.25);
    }, 500);
  }

  // Click feedback
  playClick() {
    this.playTone(440, 0.05, 'square', 0.1);
  }

  // Vote sound
  playVote() {
    this.playTone(349, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(440, 0.15, 'sine', 0.25), 80);
  }
}

export const soundManager = new SoundManager();
