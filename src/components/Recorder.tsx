"use client";

import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useRecorder } from "@/hooks/useRecorder";
import { trackingReadout } from "@/lib/hands/readout";
import { phaseOverlay } from "@/lib/recording/display";
import { countByLetter, LETTERS } from "@/lib/recording/recorder";
import { CameraStage } from "./CameraStage";
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
    <section className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <HandednessToggle value={handedness} onChange={setHandedness} />
        <p aria-live="polite" className="text-sm text-muted">
          {trackingReadout(tracking, handedness)}
        </p>
      </div>

      <CameraStage
        cameraState={cameraState}
        tracking={tracking}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onStart={startCamera}
      >
        {overlay && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-background/40">
            <p className="text-7xl text-accent">{overlay.label}</p>
            <p className="text-sm text-foreground">{overlay.detail}</p>
          </div>
        )}
      </CameraStage>

      <div role="group" aria-label="Letter" className="grid grid-cols-9 gap-1 sm:grid-cols-13">
        {LETTERS.map((letter) => {
          const selected = letter === state.letter;
          const count = counts[letter];
          return (
            <button
              key={letter}
              type="button"
              aria-pressed={selected}
              onClick={() => recorder.selectLetter(letter)}
              className={`flex flex-col items-center rounded py-1 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
                selected ? "bg-surface text-accent" : "text-foreground hover:bg-surface"
              }`}
            >
              <span className="text-lg">{letter}</span>
              <span className="text-xs text-muted">{count ? count.takes : "·"}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p aria-live="polite" className="text-muted">
          {state.notice ?? (state.letter ? `press space to record ${state.letter}` : "type a letter to choose it")}
        </p>
        <div className="flex items-center gap-4">
          <span className="text-muted">
            {state.takes.length} takes · {totalFrames} frames
          </span>
          <button
            type="button"
            onClick={recorder.exportTakes}
            disabled={state.takes.length === 0}
            className="rounded bg-surface px-3 py-1 text-foreground transition-colors hover:text-accent disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent"
          >
            export json
          </button>
        </div>
      </div>

      <p className="text-xs text-muted">
        letter keys choose · space records · esc cancels · backspace deletes last take · ⌘/ctrl+s exports
      </p>
    </section>
  );
}
