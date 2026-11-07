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
  const recognizerRef = useRef<{ stop(): void; start(): void } | null>(null);

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
      setError(e instanceof Error ? e.message : "Failed to start microphone");
      setListening(false);
    }
  }

  // Sized to sit beside .inp (sm) or .ta (md). A hard square in ink that
  // takes the spot ink while the mic is open.
  const sizeClass = size === "sm" ? "w-[38px] h-[38px]" : "w-[46px] h-[46px]";

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        title={listening ? "Stop listening" : "Talk"}
        aria-label={listening ? "Stop listening" : "Talk"}
        className={`${sizeClass} shrink-0 grid place-items-center border-[1.5px] ${
          listening
            ? "bg-accent-spot text-white border-accent-spot animate-pulse"
            : "bg-ink-700 text-ink-100 border-ink-50 hover:bg-ink-50 hover:text-ink-900"
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
        <span className="sr-only">{listening ? "Stop listening" : "Talk"}</span>
      </button>
      {error && (
        <div
          role="alert"
          className="alert absolute right-0 top-full mt-1.5 z-10 whitespace-nowrap bg-ink-800 text-[11.5px] px-2.5 py-1.5"
        >
          {error}
        </div>
      )}
    </div>
  );
}
