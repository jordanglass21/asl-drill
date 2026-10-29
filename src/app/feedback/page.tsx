import type { Metadata } from "next";
import { Feedback } from "@/components/feedback/Feedback";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = { title: pageTitle("Feedback") };

export default function FeedbackPage() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Feedback</h1>
      <Feedback />
    </main>
  );
}
