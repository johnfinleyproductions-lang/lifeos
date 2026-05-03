"use client";

import { useEffect, useRef, useState } from "react";
import {
  createRecognizer,
  isSpeechRecognitionSupported,
} from "@/lib/voice/speech";

/**
 * Reusable mic button with visible error feedback.
 *
 * Common failure modes we want to surface (not swallow):
 * - Browser doesn't support SpeechRecognition → button hides itself
 * - User denied mic permission → red error tooltip
 * - "no-speech" / network errors → reset to idle, log to console
 *
 * On iOS Safari, the mic only works on HTTPS pages with explicit user
 * gesture. The first tap should trigger the system permission prompt.
 */
export function VoiceButton({
  onTranscript,
  disabled = false,
  size = "md",
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<{ stop(): void; start(): void } | null>(
    null,
  );

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      try {
        recognizerRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  if (!supported) return null;

  function toggle() {
    setError(null);
    if (listening) {
      try {
        recognizerRef.current?.stop();
      } catch (e) {
        console.warn("recognizer stop failed:", e);
      }
      setListening(false);
      return;
    }
    const r = createRecognizer({
      continuous: false,
      onResult: (text, isFinal) => {
        if (isFinal && text.trim().length > 0) {
          onTranscript(text.trim());
        }
      },
      onEnd: () => {
        setListening(false);
      },
      onError: (errMsg) => {
        console.warn("speech recognition error:", errMsg);
        setListening(false);
        if (errMsg === "not-allowed" || errMsg === "permission-denied") {
          setError("Mic permission denied — enable in browser settings.");
        } else if (errMsg === "no-speech") {
          setError("Didn't hear anything — try again.");
        } else if (errMsg === "network") {
          setError("Network error — voice needs internet.");
        } else if (errMsg === "audio-capture") {
          setError("Mic not available on this device.");
        } else {
          setError(`Voice error: ${errMsg}`);
        }
      },
    });
    if (!r) {
      setError("Voice recognition unavailable in this browser.");
      return;
    }
    try {
      recognizerRef.current = r;
      r.start();
      setListening(true);
    } catch (e) {
      console.error("recognizer start failed:", e);
      setError(
        e instanceof Error ? e.message : "Failed to start microphone",
      );
      setListening(false);
    }
  }

  const sizeClass = size === "sm" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base";

  return (
    <div className="relative inline-block">
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
      {error && (
        <div className="absolute right-0 top-full mt-1 z-10 whitespace-nowrap text-[10px] text-accent-rose bg-ink-900 border border-accent-rose/30 rounded px-2 py-1 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
