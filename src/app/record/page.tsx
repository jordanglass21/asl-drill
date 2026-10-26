import type { Metadata } from "next";
import { Recorder } from "@/components/Recorder";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = {
  title: pageTitle("Record"),
  robots: { index: false, follow: false },
};

export default function RecordPage() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Record training samples</h1>
      <Recorder />
    </main>
  );
}
