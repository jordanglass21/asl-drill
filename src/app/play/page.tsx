import type { Metadata } from "next";
import { Suspense } from "react";
import { Play } from "@/components/play/Play";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = { title: pageTitle("Play") };

export default function PlayPage() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Play</h1>
      {/* Optional ?words= list is read on the client. */}
      <Suspense>
        <Play />
      </Suspense>
    </main>
  );
}
