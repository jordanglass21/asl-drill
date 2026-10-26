"use client";

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
import { KeyHints } from "./board/KeyHints";
import { HandednessToggle } from "./HandednessToggle";

export function Recorder() {
  const [handedness, setHandedness] = useHandednessSetting();
  const { cameraState, videoRef, canvasRef, start: startCamera, tracking } = useHandCamera({
    setting: handedness,
    onFrame: (frame) => recorder.onFrame(frame),
  });
  const recorder = useRecorder({ handedness, enabled: tracking.status === "ready" });
  const { state } = recorder;
  const counts = countByLetter(state.takes);
  const overlay = phaseOverlay(state.phase, recorder.now);
  const totalFrames = state.takes.reduce((sum, take) => sum + take.frames.length, 0);

  return (
    <>
      <Departures
        items={[
          { label: "Signing hand", value: <HandednessToggle value={handedness} onChange={setHandedness} />, span: 1.6 },
          { label: "Letter", value: state.letter ?? "—", highlight: Boolean(state.letter) },
          { label: "Takes", value: state.takes.length },
          { label: "Frames", value: totalFrames },
          { label: "Export", value: state.unsaved ? "pending" : state.takes.length ? "saved" : "—", highlight: state.unsaved },
        ]}
      />

      <div className="grid gap-2.5 sm:grid-cols-[1fr_200px]">
        <CameraStage
          cameraState={cameraState}
          tracking={tracking}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStart={startCamera}
          tag={trackingReadout(tracking, handedness)}
        >
          {overlay && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-board/45">
              <Flap char={overlay.label === "●" ? (state.letter ?? "") : overlay.label} state="current" />
              <p className="label !text-cream">{overlay.detail}</p>
            </div>
          )}
        </CameraStage>

        <aside className="flex flex-col gap-3 self-start rounded bg-rail p-3.5">
          <p className="label">Status</p>
          <p aria-live="polite" className="text-xs leading-relaxed text-cream">
            {state.notice ?? (state.letter ? `Press space to record ${state.letter}.` : "Type a letter to choose it.")}
          </p>
          <BoardButton onClick={recorder.exportTakes} disabled={state.takes.length === 0}>
            Export JSON
          </BoardButton>
        </aside>
      </div>

      <div role="group" aria-label="Letter" className="flex flex-wrap justify-center gap-x-1.5 gap-y-2">
        {LETTERS.map((letter) => {
          const count = counts[letter]?.takes ?? 0;
          const selected = letter === state.letter;
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={selected}
              aria-label={`${letter}, ${count} takes`}
              onClick={() => recorder.selectLetter(letter)}
              className="flex flex-col items-center gap-1 rounded focus-visible:outline-2 focus-visible:outline-amber"
            >
              <Flap char={letter} size="sm" state={selected ? "current" : count > 0 ? "confirmed" : "pending"} />
              <span className="text-[10px] text-label tabular-nums">{count || "·"}</span>
            </button>
          );
        })}
      </div>

      <KeyHints
        hints={[
          { keys: "a–z", text: "letter" },
          { keys: "space", text: "record" },
          { keys: "esc", text: "cancel" },
          { keys: "⌫", text: "delete last" },
          { keys: "⌘S", text: "export" },
        ]}
      />
    </>
  );
}
