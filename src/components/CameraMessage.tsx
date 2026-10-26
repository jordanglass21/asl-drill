import type { BoardMessage } from "@/lib/camera/status";
import { BoardButton } from "./board/BoardButton";
import { FlapWord } from "./board/FlapWord";

interface Props extends BoardMessage {
  action?: { label: string; onClick: () => void };
}

/** A board-style status screen shown in place of the camera preview. */
export function CameraMessage({ code, title, detail, action }: Props) {
  return (
    <div role="status" className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <FlapWord text={code} size="sm" />
      <div className="flex flex-col items-center gap-1.5">
        <p className="font-display text-2xl font-extrabold uppercase tracking-[0.04em] text-cream">{title}</p>
        <p className="max-w-md text-xs leading-relaxed text-label">{detail}</p>
      </div>
      {action && (
        <BoardButton onClick={action.onClick} autoFocus>
          {action.label}
        </BoardButton>
      )}
    </div>
  );
}
