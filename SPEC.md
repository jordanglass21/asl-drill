# ASL Drill — Spec

## Pitch

Fingerspelling is where most ASL learners hit a wall: spelling quickly, and especially reading someone else's spelling. ASL Drill is Monkeytype for fingerspelling. The app shows a word, you fingerspell it to your webcam, and it grades each letter in real time, then gives you typing-test style stats. Everything runs in the browser, with no downloads and no special hardware.

Live at: **asldrill.jordanglass.dev**

## MVP scope

- Camera setup with a mirrored live preview and hand-tracking overlay
- Recognition of static letters (A–Y, excluding J)
- Recognition of motion letters J and Z, and of double letters (e.g. the "OO" in BOOK)
- Left- and right-handed signer support (a setting, defaulting to auto-detect)
- Word practice sessions: one word at a time, letters confirmed by holding the handshape, pass/fail per letter
- Session results: letters per minute, accuracy, most-missed letters
- Stats stored locally in the browser (no accounts in the MVP)

## Not in the MVP (Phase 2)

- **Read mode:** 3D hands (Three.js / React Three Fiber) fingerspell a word at a chosen speed and the user types what they saw. Animations are driven by recorded landmark data, not hand-posed.
- Handshape feedback (e.g. "tuck your thumb")
- Weak-letter drill sessions built from past mistakes
- Per-user calibration (record your own samples to fine-tune recognition)
- Accounts and saved history (Supabase)
- Training on Google's large ASL Fingerspelling dataset for robustness and realistic speed
- Record-and-share sign library

Do not build Phase 2 features yet, but avoid design choices that would block them (e.g. keep the landmark pipeline reusable for read mode).

## Stack

- **App:** Next.js (App Router), TypeScript (strict), Tailwind CSS
- **Hand tracking:** MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`), running in the browser
- **Inference:** plain TypeScript, running a small model trained offline (no ML runtime in the browser)
- **Training:** Python (in `/training`) with scikit-learn, exporting weights to a JSON model file
- **Testing:** Jest for logic; CI on GitHub Actions
- **Hosting:** Vercel via its GitHub integration, custom subdomain asldrill.jordanglass.dev
- **No backend or database in the MVP**

## Key technical decisions

**Privacy.** Video never leaves the user's device. Only landmark numbers are processed, and in the MVP nothing is uploaded anywhere.

**Landmark pipeline.** Every frame goes through the same steps:
1. MediaPipe returns 21 hand landmarks (x, y, z) plus handedness.
2. If the signing hand is the left hand, mirror the x coordinates so the classifier always sees a right hand.
3. Normalize: translate so the wrist is the origin, then scale by a stable hand measurement (e.g. wrist to middle-finger knuckle distance).
4. **Do not normalize away rotation.** Some letter pairs (K/P, G/Q, H/U) share a handshape and differ mainly in orientation.
5. Pass the resulting 63 numbers to the classifier.

The normalization must behave identically in Python (training) and TypeScript (the app). Keep a shared set of test fixtures (raw landmarks in, expected normalized output) and test both implementations against them.

**Static letter classifier.** A small neural network (MLP) over the 63 normalized values, trained in Python with scikit-learn and exported as a versioned JSON file of float32 weights. The app runs the forward pass in plain TypeScript: the model is small enough that an ML runtime would only add weight, and TensorFlow.js and its Python converter are no longer actively released. As with normalization, Python and TypeScript are tested against shared fixtures (feature vectors in, class probabilities out) so they produce matching probabilities. If a later model needs more than an MLP (e.g. a sequence model for motion), revisit this choice. Use a confidence threshold so low-confidence frames count as "no letter" rather than a wrong guess.

**Training data.** Start with the Hugging Face dataset `sid220/asl-now-fingerspelling` (MIT-licensed, captured with the same MediaPipe web hand landmarker; confirm license and format before use). Supplement it with our own recordings via a `/record` page. Raw datasets are not committed to git.

**Letter confirmation.** A letter counts once the same prediction stays above the confidence threshold for a short hold (start around 300 ms; keep this configurable). This logic should be a pure, well-tested state machine separate from the UI.

**Motion detector (J, Z, double letters).** Keep a rolling buffer of about one second of normalized landmarks. Recognize the starting handshape with the static classifier, then check the fingertip's path over the buffer:
- **J:** I-handshape, with the pinky tip tracing a hook
- **Z:** index finger pointing, with the tip tracing a Z
- **Double letters:** the same handshape held with a small sideways slide or bounce

Start with geometric trajectory checks and tune them against recorded samples. Upgrade to a learned model only if the heuristics are not good enough.

**Not an authority.** ASL also uses facial expression and body position, which this app does not assess. Treat it as a practice tool, not a dictionary.

## Milestones

Work one milestone at a time. Each ends with green tests and a ship.

**M0: Project setup**
Next.js + TypeScript + Tailwind scaffold, GitHub repo, a CI workflow that runs lint, typecheck, and Jest on every PR, Vercel connected, and the subdomain configured.
*Done when:* a PR with green CI merges to main and the deploy is live at asldrill.jordanglass.dev.

**M1: Camera and tracking**
Camera permission flow (including denied and no-camera states), mirrored preview, landmark overlay, and the handedness setting.
*Done when:* landmarks render live for both left and right hands, and permission errors show a clear message.

**M2: Landmark pipeline and recorder**
The normalization module (with shared fixtures) and a `/record` page: pick a letter, hold it, capture labeled samples, and export them as JSON.
*Done when:* normalization tests pass, and a recorded session exports a usable dataset file.

**M3: Static letter recognition**
Python training pipeline in `/training`, model export to JSON, and in-browser inference (plain TypeScript) showing the live predicted letter and confidence.
*Done when:* static letters are recognized live, and training reports per-letter accuracy on a held-out set, highlighting the most-confused pairs.

**M4: Visual identity and practice screen design**
Replace the placeholder look (currently close to Monkeytype's default theme and the template font) with ASL Drill's own identity: palette, typography, and spacing as design tokens in `globals.css`, then designs for the practice screen (word display, letter-by-letter progress, pass/fail feedback), the results screen, and the hand overlay. Keep the Monkeytype qualities (minimal, fast, keyboard-first, dark-mode first) without copying its look. Start by collecting 2–3 reference apps or sites from Jordan and agreeing on a direction before building.
*Done when:* the tokens are in place, the existing camera screen uses them, and the practice and results screens are designed and approved, ready to build in M5.

**M5: Practice loop**
Word list, letter-by-letter progress with hold-to-confirm, pass/fail per letter, results screen (letters per minute, accuracy, most-missed letters), and stats saved in localStorage.
*Done when:* a full session can be played start to finish and stats persist across reloads.

**M6: Motion letters and double letters**
The motion detector for J, Z, and double letters, wired into the practice loop.
*Done when:* words like JAZZ, BOOK, and JELLY can be completed reliably.

## Open questions

- **Word list:** start with a curated list of a few hundred common English words, deliberately including words with J, Z, and double letters. Phrases can come later.
- **Letters per minute:** define it as correctly confirmed letters per minute of active practice time, unless a better definition comes up.
