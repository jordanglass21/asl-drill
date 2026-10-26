import { SITE_NAME } from "@/lib/site";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl text-accent">{SITE_NAME}</h1>
      <p className="text-muted">fingerspelling practice — coming soon</p>
    </main>
  );
}
