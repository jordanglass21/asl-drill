import type { Metadata } from "next";
import { CameraCheck } from "@/components/CameraCheck";
import { pageTitle } from "@/lib/site";

export const metadata: Metadata = { title: pageTitle("Camera") };

export default function CameraPage() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Camera check</h1>
      <CameraCheck />
    </main>
  );
}
