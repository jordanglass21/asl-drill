"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import type { TrackedFrame } from "@/hooks/useHandTracking";
import { useLetterReading } from "@/hooks/useLetterReading";
import { usePractice, WORDS_PER_SESSION } from "@/hooks/usePractice";
import { trackingReadout } from "@/lib/hands/readout";
import { formatClock } from "@/lib/practice/stats";
import { parseWordList } from "@/lib/practice/words";
import { CameraStage } from "../CameraStage";
import { Departures } from "../board/Departures";
import { Flap } from "../board/Flap";
import { KeyHints } from "../board/KeyHints";
import { PlayPanel } from "./PlayPanel";

const READY_WORD = "READY";

export function Play() {
  const [handedness] = useHandednessSetting();
  const letters = useLetterReading();
  const canStartRef = useRef(false);
  const canStart = useCallback(() => canStartRef.current, []);
  const wordsParam = useSearchParams().get("words");
  const words = useMemo(() => parseWordList(wordsParam), [wordsParam]);
  const practice = usePractice({ model: letters.model, canStart, words });

  const { onFrame: lettersFrame } = letters;
  const { onFrame: practiceFrame } = practice;
  const onFrame = useCallback(
    (frame: TrackedFrame) => {
      lettersFrame(frame);
      practiceFrame(frame);
    },
    [lettersFrame, practiceFrame],
  );
  const { cameraState, videoRef, canvasRef, start: startCamera, tracking } = useHandCamera({ setting: handedness, onFrame });

  const startable = letters.status === "ready" && tracking.status === "ready";
  useEffect(() => {
    canStartRef.current = startable;
  }, [startable]);

  const view = practice.view;
  const playing = practice.phase === "playing" && view !== null;
  const summary = view?.summary;

  return (
    <>
      <Departures
        items={[
          {
            label: "Word",
            value: playing ? view.word : "—",
            unit: playing ? `${view.wordNumber} / ${view.wordCount}` : `${words?.length ?? WORDS_PER_SESSION} words`,
            span: 2.2,
          },
          { label: "Letters / min", value: summary ? summary.lettersPerMinute.toFixed(1) : "—", highlight: true },
          {
            label: "Accuracy",
            value: summary?.accuracy != null ? Math.round(summary.accuracy * 100) : "—",
            unit: summary?.accuracy != null ? "%" : undefined,
          },
          { label: "Streak", value: summary ? summary.streak : "—", highlight: true },
          { label: "Time", value: formatClock(summary?.activeMs ?? 0) },
        ]}
      />

      <div className="flex justify-center gap-2 pt-1.5 pb-2.5" aria-label={playing ? `Spell ${view.word}` : "Ready"}>
        {playing
          ? view.tiles.map((tile, i) => (
              <Flap
                key={`${view.wordNumber}-${view.word}-${i}`}
                char={tile.char}
                state={tile.state}
                caret={tile.state === "current"}
                caretWrong={tile.state === "current" && view.wrongReading !== null}
              />
            ))
          : [...READY_WORD].map((char, i) => <Flap key={i} char={char} state="pending" />)}
      </div>

      <div className="grid gap-2.5 sm:grid-cols-[1fr_200px]">
        <CameraStage
          cameraState={cameraState}
          tracking={tracking}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStart={startCamera}
          tag={trackingReadout(tracking, handedness)}
        />
        <PlayPanel
          reading={letters.reading}
          target={view?.target ?? null}
          mode={view?.mode ?? "hold"}
          wrongReading={view?.wrongReading ?? null}
          hold={view?.hold ?? 0}
          upcoming={view?.upcoming ?? []}
          canStart={startable}
          playing={playing}
          onStart={practice.start}
        />
      </div>

      <KeyHints
        hints={
          playing
            ? [{ text: "Hold the handshape to confirm" }, { keys: "esc", text: "skip letter" }, { keys: "tab", text: "new word" }]
            : [{ keys: "enter", text: "start" }, { text: "Trace J and Z" }, { text: "slide or bounce double letters" }]
        }
      />
    </>
  );
}
