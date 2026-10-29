"use client";

import { useId, useState } from "react";
import { useFeedback } from "@/hooks/useFeedback";
import {
  DOUBLES_CHOICES,
  EXPERIENCE_CHOICES,
  FEEDBACK_EMAIL,
  LETTER_CHOICES,
  NONE,
  SPEED_CHOICES,
  toggleLetter,
} from "@/lib/feedback/form";
import { BoardButton } from "../board/BoardButton";
import { Flap } from "../board/Flap";
import { FlapWord } from "../board/FlapWord";
import { KeyHints } from "../board/KeyHints";

function Question({ n, title, note, wide = false, children }: { n: number; title: string; note?: string; wide?: boolean; children: React.ReactNode }) {
  const id = useId();
  return (
    <section className={`flex min-w-0 flex-col gap-2.5 rounded bg-rail p-3.5 ${wide ? "sm:col-span-2" : ""}`} aria-labelledby={id}>
      <div className="flex justify-between gap-3">
        <h2 id={id} className="font-prose text-[15px] font-medium text-cream">
          {title}
        </h2>
        <span className="text-xs text-amber-dim tabular-nums">{n} / 5</span>
      </div>
      {note && <p className="-mt-1.5 font-prose text-[13px] text-label">{note}</p>}
      {children}
    </section>
  );
}

function Choices<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          // A second click clears it, since every question is optional.
          onClick={() => onChange(value === option ? null : option)}
          className={`rounded-[3px] border bg-board px-3 py-1.5 signage text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-amber ${value === option ? "border-amber text-amber" : "border-edge text-label hover:text-cream"}`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  return (
    <p className="flex flex-wrap items-center gap-2">
      <span className="font-prose text-[13px] text-label">Rather write an email?</span>
      <span className="select-all text-[13px] text-cream">{FEEDBACK_EMAIL}</span>
      <BoardButton
        className="!px-2 !py-0.5 !text-[13px]"
        onClick={() =>
          navigator.clipboard?.writeText(FEEDBACK_EMAIL).then(
            () => setCopied(true),
            () => setCopied(false),
          )
        }
      >
        {copied ? "Copied" : "Copy"}
      </BoardButton>
    </p>
  );
}

/** Five optional questions, sent to the feedback Google Form, with the email as a fallback. */
export function Feedback() {
  const { answers, update, status, send, reset, canSend } = useFeedback();

  return (
    <>
      <div className="flex flex-col items-center gap-2.5 pt-4 pb-1 text-center">
        <FlapWord text="FEEDBACK" state="confirmed" size="sm" />
        <p className="max-w-md font-prose text-[13px] leading-relaxed text-label">
          Five quick questions, about 30 seconds. Answers are anonymous and go to a Google Form, so I can see what to fix next.
        </p>
      </div>

      {status === "sent" ? (
        <section className="flex flex-col items-center gap-3 rounded bg-rail p-6 text-center" aria-live="polite">
          <p className="signage text-2xl text-amber">Thanks, that helps</p>
          <p className="font-prose text-[13px] text-label">Your answers were sent.</p>
          <BoardButton onClick={reset}>Send more</BoardButton>
        </section>
      ) : (
        <form
          className="flex flex-col gap-2.5"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Question n={1} wide title="Which letters gave you trouble?" note="Tap any that often didn't register or read as the wrong letter.">
              <div className="flex flex-wrap gap-[5px]">
                {LETTER_CHOICES.map((letter) => {
                  const on = answers.letters.includes(letter);
                  return (
                    <button
                      key={letter}
                      type="button"
                      aria-pressed={on}
                      aria-label={letter}
                      onClick={() => update({ letters: toggleLetter(answers.letters, letter) })}
                      className="rounded-[4px] focus-visible:outline-2 focus-visible:outline-amber"
                    >
                      <Flap char={letter} state={on ? "missed" : "pending"} size="sm" />
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-pressed={answers.letters.includes(NONE)}
                  onClick={() => update({ letters: toggleLetter(answers.letters, NONE) })}
                  className={`h-12 rounded-[4px] border bg-board px-3 signage text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-amber ${answers.letters.includes(NONE) ? "border-amber text-amber" : "border-edge text-label hover:text-cream"}`}
                >
                  None
                </button>
              </div>
            </Question>
            <Question n={2} title="Did double letters register? (the OO in BOOK)">
              <Choices options={DOUBLES_CHOICES} value={answers.doubles} onChange={(doubles) => update({ doubles })} />
            </Question>
            <Question n={3} title="How did the time to accept a letter feel?">
              <Choices options={SPEED_CHOICES} value={answers.speed} onChange={(speed) => update({ speed })} />
            </Question>
            <Question n={4} title="How much ASL do you know?">
              <Choices options={EXPERIENCE_CHOICES} value={answers.experience} onChange={(experience) => update({ experience })} />
            </Question>
            <Question n={5} title="Anything that didn't work well, or that you'd add?">
              <textarea
                aria-label="Anything that didn't work well, or that you'd add?"
                value={answers.notes}
                onChange={(event) => update({ notes: event.target.value })}
                placeholder="Optional"
                rows={3}
                className="w-full resize-y rounded-[3px] border border-edge bg-board p-2.5 font-prose text-sm text-cream placeholder:text-cream-dim focus-visible:outline-2 focus-visible:outline-amber"
              />
            </Question>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded bg-rail p-3.5">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-[3px] border border-amber bg-rail px-4 py-2 signage text-base text-amber transition-colors hover:text-cream focus-visible:outline-2 focus-visible:outline-amber disabled:border-edge disabled:text-cream-dim disabled:hover:text-cream-dim"
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
              {status === "error" && (
                <p className="font-prose text-[13px] text-miss" role="alert">
                  Couldn&apos;t send. Check your connection and try again, or email instead.
                </p>
              )}
            </div>
            <CopyEmail />
          </div>
        </form>
      )}

      <KeyHints hints={[{ text: "Every question is optional" }]} />
    </>
  );
}
