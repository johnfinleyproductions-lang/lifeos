"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRecognizer,
  isSpeechRecognitionSupported,
} from "@/lib/voice/speech";

/**
 * Reusable mic button that streams transcribed text to a callback.
 *
 * - Click to start listening, click again to stop
 * - Shows a red pulsing state while active
 * - Hides itself entirely on browsers that don't support SpeechRecognition
 * - `mode="append"` (default): each utterance triggers `onTranscript`
 *   with the new chunk — caller appends to existing text
 * - `mode="replace"`: each utterance replaces, useful for short prompts
 */
export function VoiceButton({
  onTranscript,
  disabled = false,
  mode = "append",
  size = "md",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  mode?: "append" | "replace";
  size?: "sm" | "md";
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<{ stop(): void; start(): void } | null>(
    null,
  );

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      recognizerRef.current?.stop();
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognizerRef.current?.stop();
      return;
    }
    const r = createRecognizer({
      continuous: false,
      onResult: (text, isFinal) => {
        if (isFinal && text.trim().length > 0) {
          onTranscript(text.trim());
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (!r) return;
    recognizerRef.current = r;
    r.start();
    setListening(true);
  }

  const sizeClass = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled}
      title={listening ? "Stop listening" : "Talk"}
      aria-label={listening ? "Stop listening" : "Talk"}
      className={`${sizeClass} shrink-0 rounded-lg grid place-items-center transition border ${
        listening
          ? "bg-accent-rose/15 text-accent-rose border-accent-rose/40 animate-pulse"
          : "bg-ink-700 text-ink-300 border-white/5 hover:bg-ink-600 hover:text-ink-100"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {listening ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      )}
      <span className="sr-only">
        {listening ? "Stop listening" : "Talk"}
      </span>
    </button>
  );
}
