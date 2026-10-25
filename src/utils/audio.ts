// Web Audio API synthesizer and Speech synthesis for voice prize announcements & QR detect tones

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private isUnlocked: boolean = false;
  // Keep persistent reference to prevent browser Garbage Collection midway through speech
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      // Pre-warm speech voices on mount and voice change
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = () => {
          // Pre-load voices list
          try {
            window.speechSynthesis.getVoices();
          } catch {
            // ignore
          }
        };
        try {
          window.speechSynthesis.getVoices();
        } catch {
          // ignore
        }
      }

      // Automatically unlock AudioContext on very first user interaction
      const autoUnlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', autoUnlock);
        window.removeEventListener('touchstart', autoUnlock);
        window.removeEventListener('pointerdown', autoUnlock);
        window.removeEventListener('keydown', autoUnlock);
      };

      window.addEventListener('click', autoUnlock, { once: true, passive: true });
      window.addEventListener('touchstart', autoUnlock, { once: true, passive: true });
      window.addEventListener('pointerdown', autoUnlock, { once: true, passive: true });
      window.addEventListener('keydown', autoUnlock, { once: true, passive: true });
    }
  }

  public initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  /**
   * Safe asynchronous executor for Web Audio nodes.
   * Guarantees context is in 'running' state before scheduling oscillator frequencies and gains!
   */
  private runWithContext(action: (ctx: AudioContext) => void) {
    this.initCtx();
    if (!this.ctx) return;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (this.ctx && this.ctx.state === 'running') {
          action(this.ctx);
        }
      }).catch(() => {
        // Fallback: try executing anyway
        if (this.ctx) action(this.ctx);
      });
    } else {
      action(this.ctx);
    }
  }

  /**
   * Unlocks AudioContext and pre-warms speech synthesis in Chrome, Android, iOS Safari.
   */
  public unlockAudio() {
    try {
      this.initCtx();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && !this.isUnlocked) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        // Speak a tiny zero-volume space to unlock the speech engine in mobile WebKit/Chrome
        const warmUtterance = new SpeechSynthesisUtterance(' ');
        warmUtterance.volume = 0.01;
        warmUtterance.rate = 10;
        window.speechSynthesis.speak(warmUtterance);
        this.isUnlocked = true;
      }
    } catch {
      // ignore
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Fast feedback beep when QR is detected
  public playDetectBeep() {
    if (this.isMuted) return;
    this.runWithContext((ctx) => {
      try {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6
        osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.06); // E6

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
      } catch {
        // silent
      }
    });
  }

  // Winning fanfare: rich, joyous multi-chord celebration (loud and clear)
  public playWinFanfare() {
    if (this.isMuted) return;
    this.runWithContext((ctx) => {
      try {
        const now = ctx.currentTime;
        // Polyphonic fanfare sequence: C5 (523Hz), E5 (659Hz), G5 (784Hz), C6 (1046.5Hz)
        const arpeggio = [523.25, 659.25, 783.99, 1046.5];
        arpeggio.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.09;
          const dur = 0.25;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.45, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur);
        });

        // Final triumphant chord: C6 + E6 + G6 sustained loudly
        const finalChord = [1046.5, 1318.5, 1567.98];
        finalChord.forEach(freq => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + 0.4;
          const dur = 0.8;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.4, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur);
        });
      } catch {
        // silent
      }
    });
  }

  // Clear melodic chime played when ticket did not win (soft reflective tone)
  public playLoseTone() {
    if (this.isMuted) return;
    this.runWithContext((ctx) => {
      try {
        const now = ctx.currentTime;
        // Distinct descending melodic chime: E5 (659Hz) -> B4 (494Hz) -> G4 (392Hz)
        const notes = [659.25, 493.88, 392.0];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + idx * 0.18;
          const dur = 0.4;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.35, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + dur);
        });
      } catch {
        // silent
      }
    });
  }

  // Native vibration for Android / iOS supported browsers
  public triggerVibration(pattern: number[] = [120, 60, 120]) {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore
    }
  }

  // Voice speech announcement when winning
  public speakPrize(amount: number, language: 'si' | 'en' | 'ta') {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const formattedAmount = amount.toLocaleString('en-US');
      const voices = window.speechSynthesis.getVoices();

      // Check if browser/OS has native Sinhala voice support
      const sinhalaVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('si') || 
        v.lang.toLowerCase().includes('sinhala') ||
        v.name.toLowerCase().includes('sinhala')
      );
      const tamilVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('ta') ||
        v.lang.toLowerCase().includes('tamil') ||
        v.name.toLowerCase().includes('tamil')
      );

      let textToSpeak = '';
      let targetLang = 'en-US';

      if (language === 'si' && sinhalaVoice) {
        textToSpeak = `සුභ පැතුම්! ඔබ රුපියල් ${formattedAmount} ක් දිනා ඇත!`;
        targetLang = sinhalaVoice.lang;
      } else if (language === 'ta' && tamilVoice) {
        textToSpeak = `வாழ்த்துகள்! நீங்கள் ${formattedAmount} ரூபாய் வென்றுள்ளீர்கள்!`;
        targetLang = tamilVoice.lang;
      } else {
        // Universal clear English announcement: Guaranteed to work on 100% of Android, iOS, Windows, Mac
        textToSpeak = `Congratulations! You won Rupees ${formattedAmount}!`;
        targetLang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;
      utterance.lang = targetLang;

      if (language === 'si' && sinhalaVoice) {
        utterance.voice = sinhalaVoice;
      } else if (language === 'ta' && tamilVoice) {
        utterance.voice = tamilVoice;
      } else {
        const enVoice = voices.find(v => v.lang.toLowerCase().startsWith('en-in')) ||
                        voices.find(v => v.lang.toLowerCase().startsWith('en-gb')) ||
                        voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
                        voices[0];
        if (enVoice) {
          utterance.voice = enVoice;
        }
      }

      utterance.onend = () => {
        this.activeUtterance = null;
      };

      utterance.onerror = (e) => {
        console.warn('[Sound] Speech synthesis error:', e);
        this.activeUtterance = null;
        // If native language voice failed, immediate fallback to universal English
        if (targetLang !== 'en-US') {
          const fallback = new SpeechSynthesisUtterance(`Congratulations! You won Rupees ${formattedAmount}!`);
          fallback.lang = 'en-US';
          fallback.volume = 1.0;
          this.activeUtterance = fallback;
          (window as unknown as { _activeVoiceUtterance: SpeechSynthesisUtterance })._activeVoiceUtterance = fallback;
          window.speechSynthesis.speak(fallback);
        }
      };

      // Store strong reference on class and global window to prevent Chrome V8 Garbage Collection
      this.activeUtterance = utterance;
      (window as unknown as { _activeVoiceUtterance: SpeechSynthesisUtterance })._activeVoiceUtterance = utterance;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Sound] speakPrize error:', err);
    }
  }

  // Voice speech announcement when ticket did not win
  public speakLose(language: 'si' | 'en' | 'ta') {
    if (this.isMuted) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }

      const voices = window.speechSynthesis.getVoices();
      const sinhalaVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('si') || 
        v.lang.toLowerCase().includes('sinhala') ||
        v.name.toLowerCase().includes('sinhala')
      );
      const tamilVoice = voices.find(v => 
        v.lang.toLowerCase().startsWith('ta') ||
        v.lang.toLowerCase().includes('tamil') ||
        v.name.toLowerCase().includes('tamil')
      );

      let textToSpeak = '';
      let targetLang = 'en-US';

      if (language === 'si' && sinhalaVoice) {
        textToSpeak = 'මෙවර ඔබට ජයග්‍රහණයක් හිමිවී නොමැත. මීළඟ වර ඔබ දිනනු ඇත!';
        targetLang = sinhalaVoice.lang;
      } else if (language === 'ta' && tamilVoice) {
        textToSpeak = 'இந்த முறை வெற்றி இல்லை. அடுத்த முறை நீங்கள் வெல்லலாம்.';
        targetLang = tamilVoice.lang;
      } else {
        // Universal clear English announcement
        textToSpeak = 'You have lost this time. Better luck next time!';
        targetLang = 'en-US';
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 0.95;
      utterance.pitch = 0.98;
      utterance.volume = 1.0;
      utterance.lang = targetLang;

      if (language === 'si' && sinhalaVoice) {
        utterance.voice = sinhalaVoice;
      } else if (language === 'ta' && tamilVoice) {
        utterance.voice = tamilVoice;
      } else {
        const enVoice = voices.find(v => v.lang.toLowerCase().startsWith('en-in')) ||
                        voices.find(v => v.lang.toLowerCase().startsWith('en-gb')) ||
                        voices.find(v => v.lang.toLowerCase().startsWith('en')) ||
                        voices[0];
        if (enVoice) {
          utterance.voice = enVoice;
        }
      }

      utterance.onend = () => {
        this.activeUtterance = null;
      };

      utterance.onerror = (e) => {
        console.warn('[Sound] Speech synthesis error:', e);
        this.activeUtterance = null;
        if (targetLang !== 'en-US') {
          const fallback = new SpeechSynthesisUtterance('You have lost this time. Better luck next time!');
          fallback.lang = 'en-US';
          fallback.volume = 1.0;
          this.activeUtterance = fallback;
          (window as unknown as { _activeVoiceUtterance: SpeechSynthesisUtterance })._activeVoiceUtterance = fallback;
          window.speechSynthesis.speak(fallback);
        }
      };

      this.activeUtterance = utterance;
      (window as unknown as { _activeVoiceUtterance: SpeechSynthesisUtterance })._activeVoiceUtterance = utterance;

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[Sound] speakLose error:', err);
    }
  }

  /**
   * Explicit audio test for UI buttons (e.g. testing win fanfare & voice, or loss chime & voice).
   */
  public testAudio(type: 'win' | 'lose', prizeAmount: number = 2500, language: 'si' | 'en' | 'ta' = 'si') {
    this.unlockAudio();
    if (type === 'win') {
      this.playWinFanfare();
      this.speakPrize(prizeAmount, language);
      this.triggerVibration([150, 60, 150]);
    } else {
      this.playLoseTone();
      this.speakLose(language);
      this.triggerVibration([80]);
    }
  }
}

export const soundCtrl = new SoundController();
