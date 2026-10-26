// The recording file exported by /record and read by training/asl_drill/recordings.py.
// Raw (un-normalized) landmarks are stored so recordings stay valid if
// normalization changes. Bump RECORDING_VERSION on any breaking change.

import type { HandednessSetting, HandSide, Landmark } from "@/lib/hands/handedness";

export const RECORDING_FORMAT = "asl-drill-recording";
export const RECORDING_VERSION = 1;

export interface RecordedFrame {
  /** Milliseconds since the start of the capture. */
  t: number;
  /** The signer's physical hand for this frame. */
  side: HandSide;
  /** MediaPipe's raw handedness label and score. */
  handednessLabel: string;
  handednessScore: number;
  /** 21 normalized image landmarks (x by width, y by height). */
  landmarks: Landmark[];
  /** 21 metric 3D landmarks centered on the hand. */
  worldLandmarks: Landmark[];
}

/** What a take records: one letter, a double letter ("OO"), or a whole word. */
export type TakeKind = "letter" | "double" | "word";

export interface Take {
  id: string;
  /** The label: a letter ("B"), a double ("OO"), or a word ("IT"). */
  letter: string;
  /** Absent in older files, which only recorded single letters. */
  kind?: TakeKind;
  /** ISO timestamp of when the capture started. */
  startedAt: string;
  handednessSetting: HandednessSetting;
  /** Camera frame size, for aspect-ratio correction. */
  camera: { width: number; height: number };
  frames: RecordedFrame[];
}

export interface RecordingFile {
  format: typeof RECORDING_FORMAT;
  version: typeof RECORDING_VERSION;
  createdAt: string;
  takes: Take[];
}

const round = (value: number) => Math.round(value * 1e6) / 1e6;
const roundLandmark = ({ x, y, z }: Landmark): Landmark => ({ x: round(x), y: round(y), z: round(z) });

/** Builds the export file. Coordinates are rounded to 6 decimals to keep files small. */
export function buildRecordingFile(takes: readonly Take[], createdAt: string): RecordingFile {
  return {
    format: RECORDING_FORMAT,
    version: RECORDING_VERSION,
    createdAt,
    takes: takes.map((take) => ({
      ...take,
      frames: take.frames.map((frame) => ({
        ...frame,
        t: Math.round(frame.t),
        handednessScore: round(frame.handednessScore),
        landmarks: frame.landmarks.map(roundLandmark),
        worldLandmarks: frame.worldLandmarks.map(roundLandmark),
      })),
    })),
  };
}

export function recordingFileName(createdAt: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${createdAt.getFullYear()}-${pad(createdAt.getMonth() + 1)}-${pad(createdAt.getDate())}`;
  const time = `${pad(createdAt.getHours())}${pad(createdAt.getMinutes())}${pad(createdAt.getSeconds())}`;
  return `asl-drill-recording-${date}-${time}.json`;
}
