/** Versioned like the model files: regenerate into a new folder, never overwrite. */
export const ALPHABET_REFERENCE_DIR = "/reference/alphabet-v1";

/** Letters drawn with their fingertip's path (see training/scripts/render_alphabet.py). */
const MOTION_PATHS: Record<string, string> = { J: "pinky", Z: "index finger" };

export interface ReferenceLetter {
  letter: string;
  src: string;
  alt: string;
}

export const ALPHABET_REFERENCE: readonly ReferenceLetter[] = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((letter) => {
  const tip = MOTION_PATHS[letter];
  return {
    letter,
    src: `${ALPHABET_REFERENCE_DIR}/${letter}.webp`,
    alt: tip
      ? `Hand drawing of the letter ${letter}, with a dashed line tracing the ${tip}'s movement`
      : `Hand drawing of the letter ${letter}`,
  };
});
