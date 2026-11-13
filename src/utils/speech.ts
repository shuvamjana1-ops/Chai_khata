/**
 * Browser SpeechSynthesis ("hi-IN") and SpeechRecognition helpers
 */

export function speakHindi(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) setTimeout(onEnd, 300);
    return;
  }

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const hindiVoice =
      voices.find((v) => v.lang.toLowerCase().includes('hi-in')) ||
      voices.find((v) => v.lang.toLowerCase().startsWith('hi')) ||
      voices.find((v) => v.lang.toLowerCase().includes('en-in'));

    if (hindiVoice) {
      utterance.voice = hindiVoice;
    }

    let finished = false;
    const finishOnce = () => {
      if (!finished) {
        finished = true;
        onEnd?.();
      }
    };

    utterance.onend = finishOnce;
    utterance.onerror = finishOnce;

    window.speechSynthesis.speak(utterance);
    // Safety fallback timer in case headless browser doesn't fire onend
    setTimeout(finishOnce, Math.min(6000, Math.max(1500, text.length * 65)));
  } catch {
    if (onEnd) setTimeout(onEnd, 300);
  }
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

export function triggerHaptic(pattern: number | number[] = 60): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch {
      // ignore on unsupported devices
    }
  }
}

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/**
 * Listens briefly for "haan" / "हाँ" / "yes" / "sahi" or "nahi" / "नहीं" / "cancel"
 */
export function listenForYesNoReply(callbacks: {
  onYes: () => void;
  onNo: () => void;
  onStatusChange?: (listening: boolean) => void;
}): () => void {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    callbacks.onStatusChange?.(false);
    return () => {};
  }

  let recognition: SpeechRecognitionInstance | null = null;
  let active = true;

  try {
    recognition = new Ctor();
    recognition.lang = 'hi-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      if (!active) return;
      const results = event?.results?.[0];
      if (!results) return;
      const transcripts: string[] = [];
      for (let i = 0; i < results.length; i++) {
        transcripts.push(String(results[i].transcript || '').toLowerCase());
      }
      const combined = transcripts.join(' ');
      if (/(?:\bhaan\b|\bha\b|हाँ|हां|सही|ठीक|yes|ok|save)/i.test(combined)) {
        active = false;
        callbacks.onStatusChange?.(false);
        callbacks.onYes();
      } else if (/(?:\bnahi\b|\bna\b|नहीं|ना|गलत|रद्द|no|cancel)/i.test(combined)) {
        active = false;
        callbacks.onStatusChange?.(false);
        callbacks.onNo();
      }
    };

    recognition.onerror = () => {
      callbacks.onStatusChange?.(false);
    };

    recognition.onend = () => {
      callbacks.onStatusChange?.(false);
    };

    callbacks.onStatusChange?.(true);
    recognition.start();
  } catch {
    callbacks.onStatusChange?.(false);
  }

  return () => {
    active = false;
    callbacks.onStatusChange?.(false);
    try {
      recognition?.abort();
    } catch {
      // ignore
    }
  };
}
