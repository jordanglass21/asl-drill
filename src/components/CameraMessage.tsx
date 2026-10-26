interface Props {
  title: string;
  detail: string;
  action?: { label: string; onClick: () => void };
}

/** Centered message shown in place of the camera preview. */
export function CameraMessage({ title, detail, action }: Props) {
  return (
    <div role="status" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg text-foreground">{title}</p>
      <p className="max-w-md text-sm text-muted">{detail}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          autoFocus
          className="mt-2 rounded bg-surface px-4 py-2 text-sm text-foreground transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
