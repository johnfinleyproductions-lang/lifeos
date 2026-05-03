"use client";

/**
 * Browser Web Speech API helpers.
 *
 * SpeechRecognition (mic → text) is Chromium-only on desktop but works
 * in iOS Safari on iOS 14.5+. Mac Safari support is also good.
 *
 * SpeechSynthesis (text → audio) is universal across modern browsers.
 *
 * Both are no-ops if the API isn't available — the UI calling these
 * should hide voice controls when `isSpeechRecognitionSupported()` is
 * false.
 */

type RecognizerOpts = {
  onResult: (text: string, isFinal: boolean) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
  continuous?: boolean;
  lang?: string;
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "speechSynthesis" in window;
}

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionResultEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
};

type SpeechRecognitionResultEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
};

export function createRecognizer(
  opts: RecognizerOpts,
): SpeechRecognitionLike | null {
  if (!isSpeechRecognitionSupported()) return null;

  const SR =
    (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
      .SpeechRecognition ??
    (window as unknown as {
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    }).webkitSpeechRecognition;
  if (!SR) return null;

  const r = new SR();
  r.continuous = opts.continuous ?? false;
  r.interimResults = true;
  r.lang = opts.lang ?? "en-US";

  r.onresult = (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      transcript += result[0].transcript;
      if (result.isFinal) isFinal = true;
    }
    opts.onResult(transcript, isFinal);
  };
  r.onend = () => opts.onEnd?.();
  r.onerror = (event) => opts.onError?.(event.error ?? "unknown error");
  return r;
}

/**
 * Speak text aloud using the browser's TTS. Cancels any in-progress
 * speech first so calls don't queue up indefinitely.
 */
export function speak(
  text: string,
  opts?: { rate?: number; pitch?: number; voiceName?: string },
): void {
  if (!isSpeechSynthesisSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = opts?.rate ?? 1;
  utterance.pitch = opts?.pitch ?? 1;

  if (opts?.voiceName) {
    const voices = synth.getVoices();
    const found = voices.find((v) => v.name === opts.voiceName);
    if (found) utterance.voice = found;
  }
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}
