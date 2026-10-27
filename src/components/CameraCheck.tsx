"use client";

import Link from "next/link";
import { useHandCamera } from "@/hooks/useHandCamera";
import { useHandednessSetting } from "@/hooks/useHandednessSetting";
import { useCallback } from "react";
import type { TrackedFrame } from "@/hooks/useHandTracking";
import { useLetterReading } from "@/hooks/useLetterReading";
import { useMotion } from "@/hooks/useMotion";
import { trackingReadout } from "@/lib/hands/readout";
import { CameraStage } from "./CameraStage";
import { Departures } from "./board/Departures";
import { KeyHints } from "./board/KeyHints";
import { HandednessToggle } from "./HandednessToggle";
import { ReadingPanel } from "./ReadingPanel";

export function CameraCheck() {
  const [handedness, setHandedness] = useHandednessSetting();
  const letters = useLetterReading();
  const motion = useMotion();
  const { onFrame: lettersFrame } = letters;
  const { onFrame: motionFrame } = motion;
  const onFrame = useCallback(
    (frame: TrackedFrame) => {
      lettersFrame(frame);
      motionFrame(frame);
    },
    [lettersFrame, motionFrame],
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
        <ReadingPanel status={letters.status} reading={reading} threshold={letters.threshold} motion={motion.last} />
      </div>
      <KeyHints hints={[{ text: "Hold up a handshape to read it" }, { text: "Readings aren't saved" }]}>
        <Link href="/record" className="label !text-[11px] hover:!text-amber">
          Record training samples →
        </Link>
      </KeyHints>
    </>
  );
}
