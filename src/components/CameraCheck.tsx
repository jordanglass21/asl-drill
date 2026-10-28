"use client";

import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useCallback } from "react";
import type { TrackedFrame } from "@/hooks/useHandTracking";
import { useLetterReading } from "@/hooks/useLetterReading";
import { useMotion } from "@/hooks/useMotion";
import { useDoubleCheck } from "@/hooks/useDoubleCheck";
import { trackingReadout } from "@/lib/hands/readout";
import { CameraStage } from "./CameraStage";
import { Departures } from "./board/Departures";
import { DoublePanel } from "./DoublePanel";
import { KeyHints } from "./board/KeyHints";
import { HandednessToggle } from "./HandednessToggle";
import { ReadingPanel } from "./ReadingPanel";

export function CameraCheck() {
  const [handedness, setHandedness] = useHandednessSetting();
  const letters = useLetterReading();
  const motion = useMotion();
  const doubles = useDoubleCheck();
  const { onFrame: lettersFrame } = letters;
  const { onFrame: motionFrame } = motion;
  const { onFrame: doublesFrame } = doubles;
  const onFrame = useCallback(
    (frame: TrackedFrame) => {
      const reading = lettersFrame(frame);
      const events = motionFrame(frame);
      doublesFrame(frame.now, reading?.letter ?? null, events);
    },
    [lettersFrame, motionFrame, doublesFrame],
  );
  const { cameraState, videoRef, canvasRef, start, tracking } = useHandCamera({ setting: handedness, onFrame });
  const reading = letters.reading;
  const tracked = tracking.status === "ready" && tracking.signingSide;

  return (
    <>
      <Departures
        items={[
          { label: "Signing hand", value: <HandednessToggle value={handedness} onChange={setHandedness} />, span: 1.6 },
          { label: "Tracking", value: tracked ? `${tracking.signingSide}` : "—", highlight: Boolean(tracked) },
          { label: "Reading", value: reading?.letter ?? "—", highlight: Boolean(reading?.letter) },
          {
            label: "Confidence",
            value: reading ? Math.round(reading.confidence * 100) : "—",
            unit: reading ? "%" : undefined,
          },
        ]}
      />
      <div className="grid gap-2.5 sm:grid-cols-[1fr_200px]">
        <CameraStage
          cameraState={cameraState}
          tracking={tracking}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onStart={start}
          tag={trackingReadout(tracking, handedness)}
        />
        <div className="flex flex-col gap-2.5">
          <ReadingPanel status={letters.status} reading={reading} threshold={letters.threshold} motion={motion.last} />
          <DoublePanel double={doubles.double} />
        </div>
      </div>
      {/* The recorder stays at /record but isn't linked, so testers don't wander into it. */}
      <KeyHints hints={[{ text: "Hold up a handshape to read it" }, { text: "Readings aren't saved" }]} />
    </>
  );
}
