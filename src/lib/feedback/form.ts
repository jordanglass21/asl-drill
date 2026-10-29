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
  doubles: "entry.204783588",
  speed: "entry.198617729",
  experience: "entry.186512009",
  notes: "entry.253944935",
} as const;

export const NONE = "None";
export const LETTER_CHOICES: readonly string[] = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
export const DOUBLES_CHOICES = ["Usually", "Sometimes", "Rarely"] as const;
export const SPEED_CHOICES = ["Too slow", "About right", "Too fast"] as const;
export const EXPERIENCE_CHOICES = ["New to it", "Some", "Fluent"] as const;

export interface FeedbackAnswers {
  /** Trouble letters, or just NONE. */
  letters: string[];
  doubles: (typeof DOUBLES_CHOICES)[number] | null;
  speed: (typeof SPEED_CHOICES)[number] | null;
  experience: (typeof EXPERIENCE_CHOICES)[number] | null;
  notes: string;
}

export const emptyAnswers: FeedbackAnswers = { letters: [], doubles: null, speed: null, experience: null, notes: "" };

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
    answers.doubles !== null ||
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
  if (answers.doubles) body.append(FIELDS.doubles, answers.doubles);
  if (answers.speed) body.append(FIELDS.speed, answers.speed);
  if (answers.experience) body.append(FIELDS.experience, answers.experience);
  const notes = answers.notes.trim();
  if (notes) body.append(FIELDS.notes, notes);
  return body;
}
