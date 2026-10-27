import type { ButtonHTMLAttributes } from "react";

/** The board's one button style: small caps on a rail, amber on hover. */
export const boardButtonClass =
  "inline-block rounded-[3px] border border-edge bg-rail px-3 py-1.5 signage text-[15px] text-cream transition-colors hover:text-amber focus-visible:outline-2 focus-visible:outline-amber";

export function BoardButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-[3px] border border-edge bg-rail px-3 py-1.5 signage text-[15px] text-cream transition-colors hover:text-amber focus-visible:outline-2 focus-visible:outline-amber disabled:opacity-40 disabled:hover:text-cream ${className}`}
    />
  );
}
