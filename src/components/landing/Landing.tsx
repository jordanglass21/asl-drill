"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { boardButtonClass } from "../board/BoardButton";
import { Flap } from "../board/Flap";
import { KeyHints } from "../board/KeyHints";
import { AlphabetReference } from "./AlphabetReference";

const HEADLINE = "ASL DRILL";
const FLIP_STAGGER_MS = 90;

/** The headline flaps settle into place one by one, like a board updating. */
function useSettledCount(total: number) {
  const [settled, setSettled] = useState(0);
  useEffect(() => {
    const timers = Array.from({ length: total }, (_, i) => setTimeout(() => setSettled(i + 1), 250 + i * FLIP_STAGGER_MS));
    return () => timers.forEach(clearTimeout);
  }, [total]);
  return settled;
}

export function Landing() {
  const router = useRouter();
  const settled = useSettledCount(HEADLINE.length);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "Enter") router.push("/play");
      else if (event.key.toLowerCase() === "c") router.push("/camera");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const headline = (size: "lg" | "sm") =>
    [...HEADLINE].map((ch, i) =>
      ch === " " ? (
        <span key={i} className={size === "lg" ? "w-6" : "w-3"} />
      ) : (
        <Flap key={i} char={ch} size={size} state={i < settled ? "confirmed" : "pending"} />
      ),
    );

  return (
    <>
      <section className="flex flex-1 flex-col items-center justify-center gap-7 py-6 text-center">
        <h1 className="sr-only">ASL Drill</h1>
        <div className="hidden gap-2 sm:flex" aria-hidden>
          {headline("lg")}
        </div>
        <div className="flex gap-1.5 sm:hidden" aria-hidden>
          {headline("sm")}
        </div>

        <div className="flex max-w-xl flex-col items-center gap-2.5">
          <p className="font-display text-3xl font-extrabold uppercase leading-tight tracking-[0.03em] sm:text-4xl">
            Fingerspelling practice with your webcam
          </p>
          <p className="font-prose text-[13px] leading-relaxed text-label">
            Hold each handshape until it’s recognized, then move to the next one. It all runs in your browser, so your
            video stays on your device.
          </p>
        </div>

        <div className="flex gap-2.5">
          <Link href="/play" className={`${boardButtonClass} !border-amber !text-amber hover:!text-cream`}>
            Play
          </Link>
          <Link href="/camera" className={boardButtonClass}>
            Camera check
          </Link>
        </div>
      </section>

      <AlphabetReference />

      <KeyHints hints={[{ keys: "enter", text: "play" }, { keys: "c", text: "camera check" }]} />
    </>
  );
}
