import type { Metadata } from "next";
import { Recorder } from "@/components/Recorder";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Record"),
  robots: { index: false, follow: false },
};

export default function RecordPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-8">
      <header className="flex w-full max-w-4xl items-baseline gap-3">
        <h1 className="text-2xl text-accent">record</h1>
        <p className="text-sm text-muted">capture labeled landmark samples for training</p>
      </header>
      <Recorder />
    </main>
  );
}
