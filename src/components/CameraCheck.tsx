"use client";

import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { trackingReadout } from "@/lib/hands/readout";
import { CameraStage } from "./CameraStage";
import { HandednessToggle } from "./HandednessToggle";

export function CameraCheck() {
  const [handedness, setHandedness] = useHandednessSetting();
  const { cameraState, videoRef, canvasRef, start, tracking } = useHandCamera({ setting: handedness });

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
      />
    </section>
  );
}
