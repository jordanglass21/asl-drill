"use client";

import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useLetterReading } from "@/hooks/useLetterReading";
import { trackingReadout } from "@/lib/hands/readout";
import { CameraStage } from "./CameraStage";
import { HandednessToggle } from "./HandednessToggle";
import { LetterReadout } from "./LetterReadout";

export function CameraCheck() {
  const [handedness, setHandedness] = useHandednessSetting();
  const letters = useLetterReading();
  const { cameraState, videoRef, canvasRef, start, tracking } = useHandCamera({
    setting: handedness,
    onFrame: letters.onFrame,
  });

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
        onStart={start}
      >
        {tracking.status === "ready" && <LetterReadout status={letters.status} reading={letters.reading} />}
      </CameraStage>
      <p className="text-xs text-muted">
        Static letters only (J and Z come later). Below the confidence threshold the best guess is shown in lowercase.
      </p>
    </section>
  );
}
