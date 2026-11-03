"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/* ============================================================
   VoiceSearchButton — Persian voice input via Web Speech API.
   When speech is recognized, calls onResult(text) and the
   parent should fill the search box + auto-submit.
   ============================================================ */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

export default function VoiceSearchButton({
  onResult,
}: {
  onResult: (text: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    const rec = new Ctor();
    rec.lang = "fa-IR";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: any) => {
      try {
        const transcript = e.results?.[0]?.[0]?.transcript ?? "";
        if (transcript) {
          onResult(transcript);
        }
      } catch {}
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
    };
  }, [onResult]);

  const toggle = () => {
    if (!recRef.current) return;
    if (listening) {
      try {
        recRef.current.stop();
      } catch {}
      setListening(false);
      return;
    }
    try {
      recRef.current.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? "در حال شنیدن — برای توقف کلیک کنید" : "جستجوی صوتی فارسی"}
      className={`flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-bold transition ${
        listening
          ? "bg-red-500 text-white animate-pulse"
          : "bg-white/5 text-white/50 hover:bg-[#F58220]/15 hover:text-[#F58220]"
      }`}
      aria-label="جستجوی صوتی"
    >
      {listening ? (
        <Square className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Mic className="h-3.5 w-3.5" />
      )}
    </button>
  );
}
