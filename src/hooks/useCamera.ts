"use client";

import { useCallback, useLayoutEffect, useReducer, useRef } from "react";
import { cameraReducer, classifyCameraError, initialCameraState } from "@/lib/camera/status";

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: "user",
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/** Requests the webcam and streams it into `videoRef`. The video stays on-device. */
export function useCamera() {
  const [state, dispatch] = useReducer(cameraReducer, initialCameraState);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Incremented on every start/stop so a slow, superseded request is discarded.
  const requestIdRef = useRef(0);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    dispatch({ type: "request" });
    if (!navigator.mediaDevices?.getUserMedia) {
      dispatch({ type: "failed", reason: "unsupported" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      releaseStream();
      streamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (streamRef.current === stream) dispatch({ type: "failed", reason: "in-use" });
      });
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => {
          // Autoplay of a muted inline video is allowed; ignore spurious interruptions.
        });
      }
      dispatch({ type: "granted" });
    } catch (error) {
      if (requestId === requestIdRef.current) dispatch({ type: "failed", reason: classifyCameraError(error) });
    }
  }, [releaseStream]);

  /** Abandons any pending request and turns the camera off. */
  const stop = useCallback(() => {
    requestIdRef.current++;
    releaseStream();
    dispatch({ type: "stopped" });
  }, [releaseStream]);

  // Next keeps a visited page mounted but hidden (Activity), running this
  // cleanup on hide and the effect again on show. Release the camera while
  // hidden and say so, or the page would come back claiming a camera that's
  // off; then turn it back on if it was live, since permission is granted.
  const resumeRef = useRef(false);
  useLayoutEffect(() => {
    if (resumeRef.current) {
      resumeRef.current = false;
      void start();
    }
    return () => {
      resumeRef.current = streamRef.current !== null;
      stop();
    };
  }, [start, stop]);

  return { state, videoRef, start, stop };
}
