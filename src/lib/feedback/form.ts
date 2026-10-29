// The feedback page's answers and how they reach the Google Form. The page is
// our own; on send, the answers are posted to the form's response endpoint
// with the form's field ids, so they land in its Responses tab. Choice text
// must match the form's options exactly, or Google drops the answer.

export const FEEDBACK_EMAIL = "jordanglass421@gmail.com";

export const FEEDBACK_FORM_ACTION =
  "https://docs.google.com/forms/d/e/1FAIpQLSe0F1yxl-CVm4lMUjH9T3sNjXNp5tVOz-IBPOW8SylNWaMe-A/formResponse";

/** Field ids from the form's pre-filled link. */
const FIELDS = {
  letters: "entry.129497468",
  /** The two rows of the doubles grid. */
  slide: "entry.973102069",
  bounce: "entry.1391201748",
  speed: "entry.198617729",
  experience: "entry.186512009",
  notes: "entry.253944935",
} as const;

export const NONE = "None";
export const LETTER_CHOICES: readonly string[] = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
/** The doubles grid: rows are the two ways to double a letter. */
export const DOUBLE_METHODS = [
  { key: "slide", label: "Slide sideways" },
  { key: "bounce", label: "Bounce in place" },
] as const;
export const DOUBLE_RESULTS = ["Worked", "Didn't work", "Didn't try"] as const;
export type DoubleResult = (typeof DOUBLE_RESULTS)[number];
export const SPEED_CHOICES = ["Too slow", "About right", "Too fast"] as const;
export const EXPERIENCE_CHOICES = ["New to it", "Some", "Fluent"] as const;

export interface FeedbackAnswers {
  /** Trouble letters, or just NONE. */
  letters: string[];
  slide: DoubleResult | null;
  bounce: DoubleResult | null;
  speed: (typeof SPEED_CHOICES)[number] | null;
  experience: (typeof EXPERIENCE_CHOICES)[number] | null;
  notes: string;
}

export const emptyAnswers: FeedbackAnswers = { letters: [], slide: null, bounce: null, speed: null, experience: null, notes: "" };

/** Toggles a letter, or NONE; NONE and letters rule each other out. */
export function toggleLetter(letters: readonly string[], letter: string): string[] {
  if (letter === NONE) return letters.includes(NONE) ? [] : [NONE];
  const rest = letters.filter((l) => l !== NONE);
  return rest.includes(letter) ? rest.filter((l) => l !== letter) : [...rest, letter];
}

/** Whether there's anything worth sending. Every question is optional, but not all of them at once. */
export function hasAnswers(answers: FeedbackAnswers): boolean {
  return (
    answers.letters.length > 0 ||
    answers.slide !== null ||
    answers.bounce !== null ||
    answers.speed !== null ||
    answers.experience !== null ||
    answers.notes.trim() !== ""
  );
}

/** The form-encoded response body: one field per checked letter, in alphabetical order. */
export function toFormBody(answers: FeedbackAnswers): URLSearchParams {
  const body = new URLSearchParams();
  const order = [...LETTER_CHOICES, NONE];
  for (const letter of [...answers.letters].sort((a, b) => order.indexOf(a) - order.indexOf(b))) {
    body.append(FIELDS.letters, letter);
  }
  if (answers.slide) body.append(FIELDS.slide, answers.slide);
  if (answers.bounce) body.append(FIELDS.bounce, answers.bounce);
  if (answers.speed) body.append(FIELDS.speed, answers.speed);
  if (answers.experience) body.append(FIELDS.experience, answers.experience);
  const notes = answers.notes.trim();
  if (notes) body.append(FIELDS.notes, notes);
  return body;
}
