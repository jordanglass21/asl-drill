import type { Metadata } from "next";
import { Suspense } from "react";
import { Results } from "@/components/results/Results";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = { title: pageTitle("Results") };

export default function ResultsPage() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Results</h1>
      {/* The session id comes from the query string, read on the client. */}
      <Suspense>
        <Results />
      </Suspense>
    </main>
  );
}
