import Image from "next/image";
import { ALPHABET_REFERENCE } from "@/lib/reference/alphabet";

/** Rendered at 330px square by training/scripts/render_alphabet.py. */
const IMAGE_SIZE = 330;

export function AlphabetReference() {
  return (
    <section aria-labelledby="alphabet-reference" className="flex flex-col gap-3 pb-2">
      <div className="flex max-w-2xl flex-col gap-1.5">
        <h2 id="alphabet-reference" className="label">
          How I sign them
        </h2>
        <p className="text-xs leading-relaxed text-label">
          These hands are drawn from my own recordings, the same data the model learned from. I&apos;m not fluent in
          ASL. If a letter won&apos;t register, compare your hand to mine and adjust. For proper technique, learn from a
          fluent signer or an ASL teacher.
        </p>
      </div>

      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-2.5">
        {ALPHABET_REFERENCE.map(({ letter, src, alt }) => (
          <li key={letter} className="flex flex-col items-center gap-1">
            <div className="relative aspect-square w-full overflow-hidden rounded bg-flap">
              <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--split)]" aria-hidden />
              <Image
                src={src}
                alt={alt}
                width={IMAGE_SIZE}
                height={IMAGE_SIZE}
                unoptimized
                className="relative h-full w-full"
              />
            </div>
            <span className="font-display text-2xl font-extrabold leading-none text-cream" aria-hidden>
              {letter}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
