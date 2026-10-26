import { CameraCheck } from "@/components/CameraCheck";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-3.5">
      <h1 className="sr-only">Camera check</h1>
      <CameraCheck />
    </main>
  );
}
