import type { Confirmation } from "@/lib/practice/session";
import { formatClock, formatSeconds, type SessionSummary } from "@/lib/practice/stats";
import { Flap } from "../board/Flap";

/** Badges on the second letter of a double, by how it was confirmed. */
export const DOUBLE_MARKS: Partial<Record<Confirmation, { mark: string; meaning: string }>> = {
  slide: { mark: "↔", meaning: "slide" },
  bounce: { mark: "↕", meaning: "bounce" },
  hold: { mark: "↻", meaning: "released and formed again" },
};

const BAR_MAX_PX = 19;

/** Each word's tiles with a bar for the time spent on every letter, its slowest letter, time, and status. */
export function WordTable({ summary }: { summary: SessionSummary }) {
  const longest = Math.max(1, ...summary.words.flatMap((w) => w.letters.map((l) => l.activeMs)));
  const showLegend = summary.doubles.some((d) => d.confirmedBy && DOUBLE_MARKS[d.confirmedBy]);

  const rows = summary.words.map((word, i) => (
    <tr key={i} className="border-t border-board">
      <td className="pt-2.5 pb-1 pr-2">
        <div className="flex gap-[3px]" aria-label={word.word}>
          {word.letters.map((letter, j) => {
            const missed = letter.result === "miss";
            const isDouble = j > 0 && word.word[j] === word.word[j - 1];
            const double = isDouble && letter.confirmedBy ? DOUBLE_MARKS[letter.confirmedBy] : undefined;
            const share = letter.activeMs / longest;
            return (
              <span key={j} className="relative flex flex-col items-center gap-[3px]">
                {double && (
                  <span
                    className={`absolute -top-2 -right-1.5 z-10 rounded-[2px] px-[3px] py-px font-display text-[10px] leading-none font-extrabold ${letter.confirmedBy === "hold" ? "bg-edge text-label" : "bg-amber text-board"}`}
                    title={`Double letter: ${double.meaning}`}
                  >
                    {double.mark}
                  </span>
                )}
                <Flap char={letter.letter} size="xs" state={missed ? "missed" : "confirmed"} animate={false} />
                <span
                  className={`h-[3px] rounded-full ${missed ? "bg-miss" : "bg-amber"}`}
                  style={{ width: Math.max(3, BAR_MAX_PX * share), opacity: 0.35 + 0.65 * share }}
                  title={formatSeconds(letter.activeMs)}
                />
              </span>
            );
          })}
        </div>
      </td>
      <td className="pr-2 text-right text-xs text-label">
        {word.slowest && (
          <>
            <b className="font-medium text-cream">{word.slowest.letter}</b> {formatSeconds(word.slowest.activeMs)}
          </>
        )}
      </td>
      <td className="pr-2 text-right text-sm">{formatClock(word.activeMs)}</td>
      <td className={`text-right signage text-[15px] ${word.misses ? "text-miss" : "text-amber"}`}>
        {word.misses ? `${word.misses} missed` : "Clean"}
      </td>
    </tr>
  ));

  return (
    <section className="overflow-x-auto rounded bg-rail px-3.5 py-3">
      <table className="w-full border-collapse tabular-nums">
        <thead>
          <tr>
            <th className="label pr-2 pb-1.5 text-left font-normal">
              Word <span className="text-cream-dim">/ bar = time on each letter</span>
            </th>
            <th className="label pr-2 pb-1.5 text-right font-normal">Slowest</th>
            <th className="label pr-2 pb-1.5 text-right font-normal">Time</th>
            <th className="label pb-1.5 text-right font-normal">Status</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
      {showLegend && (
        <p className="label mt-2.5 border-t border-board pt-2 text-cream-dim">
          Double letters:
          {Object.entries(DOUBLE_MARKS).map(([kind, d]) => (
            <span key={kind} className="ml-3">
              <span className={kind === "hold" ? "text-label" : "text-amber"}>{d.mark}</span> {d.meaning}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
