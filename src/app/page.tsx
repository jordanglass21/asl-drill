import { CameraCheck } from "@/components/CameraCheck";
import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center gap-8 px-4 py-8">
      <header className="flex w-full max-w-4xl items-baseline gap-3">
        <h1 className="text-2xl text-accent">{SITE_NAME}</h1>
        <p className="text-sm text-muted">fingerspelling practice</p>
      </header>
      <CameraCheck />
    </main>
  );
}
