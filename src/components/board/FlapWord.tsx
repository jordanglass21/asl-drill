import { toFlapChars, type FlapState } from "@/lib/board/flap";
import { Flap } from "./Flap";

interface Props {
  text: string;
  state?: FlapState;
  size?: "lg" | "md" | "sm";
}

/** A short word spelled in flaps, e.g. a status code on an error screen. */
export function FlapWord({ text, state = "current", size = "md" }: Props) {
  return (
    <div className="flex justify-center gap-1.5" role="img" aria-label={text}>
      {toFlapChars(text).map((ch, i) => (
        <Flap key={i} char={ch} state={ch ? state : "pending"} size={size} />
      ))}
    </div>
  );
}
