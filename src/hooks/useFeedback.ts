"use client";

import { useCallback, useState } from "react";
import { emptyAnswers, FEEDBACK_FORM_ACTION, hasAnswers, toFormBody, type FeedbackAnswers } from "@/lib/feedback/form";

export type FeedbackStatus = "idle" | "sending" | "sent" | "error";

/** The feedback page's answers, and sending them to the Google Form. */
export function useFeedback() {
  const [answers, setAnswers] = useState<FeedbackAnswers>(emptyAnswers);
  const [status, setStatus] = useState<FeedbackStatus>("idle");

  const update = useCallback((change: Partial<FeedbackAnswers>) => setAnswers((a) => ({ ...a, ...change })), []);

  const send = useCallback(async () => {
    if (!hasAnswers(answers)) return;
    setStatus("sending");
    try {
      // Google doesn't allow cross-origin reads, so the response is opaque:
      // a resolved request means it was delivered, not that it was accepted.
      await fetch(FEEDBACK_FORM_ACTION, { method: "POST", mode: "no-cors", body: toFormBody(answers) });
      setStatus("sent");
      setAnswers(emptyAnswers);
    } catch {
      setStatus("error");
    }
  }, [answers]);

  const reset = useCallback(() => setStatus("idle"), []);

  return { answers, update, status, send, reset, canSend: hasAnswers(answers) && status !== "sending" };
}
