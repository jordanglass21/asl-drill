"use client";

import { useCallback, useRef, useState } from "react";
import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useRecorder } from "@/hooks/useRecorder";
import { trackingReadout } from "@/lib/hands/readout";
import { phaseOverlay } from "@/lib/recording/display";
import { countByLetter, LETTERS } from "@/lib/recording/recorder";
import { CameraStage } from "./CameraStage";
import { BoardButton } from "./board/BoardButton";
import { Departures } from "./board/Departures";
import { Flap } from "./board/Flap";
import { FlapWord } from "./board/FlapWord";
import { KeyHints } from "./board/KeyHints";
import { HandednessToggle } from "./HandednessToggle";

export function Recorder() {
  const [handedness, setHandedness] = useHandednessSetting();
  const wordInput = useRef<HTMLInputElement | null>(null);
  const [wordDraft, setWordDraft] = useState("");
  const focusWord = useCallback(() => wordInput.current?.focus(), []);
  const { cameraState, videoRef, canvasRef, start: startCamera, tracking } = useHandCamera({
    setting: handedness,
    onFrame: (frame) => recorder.onFrame(frame),
  });
  const recorder = useRecorder({ handedness, enabled: tracking.status === "ready", onWordKey: focusWord });
  const { state } = recorder;
  const singles = countByLetter(state.takes.filter((t) => (t.kind ?? "letter") === "letter"));
  const extras = Object.entries(countByLetter(state.takes.filter((t) => t.kind === "double" || t.kind === "word")));
  const overlay = phaseOverlay(state.phase, recorder.now);
  const totalFrames = state.takes.reduce((sum, take) => sum + take.frames.length, 0);
  const kindLabel = state.kind === "double" ? "double" : state.kind === "word" ? "word" : "letter";

  return (
    <>
      <Departures
        items={[
          { label: "Signing hand", value: <HandednessToggle value={handedness} onChange={setHandedness} />, span: 1.6 },
          { label: `Recording ${kindLabel}`, value: state.letter ?? "—", highlight: Boolean(state.letter), span: 1.3 },
          { label: "Takes", value: state.takes.length },
          { label: "Frames", value: totalFrames },
          { label: "Export", value: state.unsaved ? "pending" : state.takes.length ? "saved" : "—", highlight: state.unsaved },
        ]}
      />

      <div className="grid gap-2.5 sm:grid-cols-[1fr_220px]">
        <CameraStage
          cameraState={cameraState}
          tracking={tracking}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStart={startCamera}
          tag={trackingReadout(tracking, handedness)}
          compact
        >
          {overlay && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-board/45">
              {overlay.label === "●" && state.letter && state.letter.length > 1 ? (
                <FlapWord text={state.letter} size="md" />
              ) : (
                <Flap char={overlay.label === "●" ? (state.letter ?? "") : overlay.label} state="current" />
              )}
              <p className="label !text-cream">{overlay.detail}</p>
            </div>
          )}
        </CameraStage>

        <aside className="flex flex-col gap-2.5 self-start rounded bg-rail p-3.5">
          <p className="label">Status</p>
          <p aria-live="polite" className="font-prose text-[13px] leading-relaxed text-cream">
            {state.notice ??
              (state.letter
                ? `Press space to record ${state.kind === "word" ? `"${state.letter}"` : state.letter}.`
                : "Type a letter to choose it.")}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              recorder.selectWord(wordDraft);
              setWordDraft("");
              wordInput.current?.blur();
            }}
          >
            <label className="label mb-1 block" htmlFor="record-word">
              Word mode
            </label>
            <input
              id="record-word"
              ref={wordInput}
              value={wordDraft}
              onChange={(event) => setWordDraft(event.target.value.replace(/[^a-z]/gi, "").slice(0, 8))}
              onKeyDown={(event) => {
                if (event.key === "Escape") event.currentTarget.blur();
              }}
              placeholder="press / then type"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-[3px] border border-edge bg-board px-2 py-1 font-mono text-sm uppercase tracking-[0.12em] text-cream placeholder:normal-case placeholder:tracking-normal placeholder:text-cream-dim focus-visible:outline-2 focus-visible:outline-amber"
            />
          </form>
          {extras.length > 0 && (
            <div>
              <p className="label mb-1">Doubles and words</p>
              <p className="text-xs leading-relaxed text-cream">
                {extras.map(([label, count]) => `${label} ${count.takes}`).join(", ")}
              </p>
            </div>
          )}
          <BoardButton onClick={recorder.exportTakes} disabled={state.takes.length === 0}>
            Export JSON
          </BoardButton>
        </aside>
      </div>

      <div role="group" aria-label="Letter" className="flex flex-wrap justify-center gap-x-1.5 gap-y-1.5">
        {LETTERS.map((letter) => {
          const count = singles[letter]?.takes ?? 0;
          const selected = state.kind === "letter" && letter === state.letter;
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={selected}
              aria-label={`${letter}, ${count} takes`}
              onClick={(event) => recorder.selectLetter(letter, event.shiftKey)}
              className="flex flex-col items-center gap-0.5 rounded focus-visible:outline-2 focus-visible:outline-amber"
            >
              <Flap char={letter} size="sm" state={selected ? "current" : count > 0 ? "confirmed" : "pending"} />
              <span className="text-[10px] leading-none text-label tabular-nums">{count || "·"}</span>
            </button>
          );
        })}
      </div>

      <KeyHints
        hints={[
          { keys: "a–z", text: "letter" },
          { keys: "⇧ a–z", text: "double" },
          { keys: "/", text: "word" },
          { keys: "space", text: "record" },
          { keys: "esc", text: "cancel" },
          { keys: "⌫", text: "delete last" },
          { keys: "⌘S", text: "export" },
        ]}
      />
    </>
  );
}
