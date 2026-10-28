export interface DepartureItem {
  label: string;
  value: React.ReactNode;
  unit?: string;
  /** Amber for highlighted values. */
  highlight?: boolean;
  /** A small line under the value. */
  sub?: React.ReactNode;
  /** Relative column width (default 1). */
  span?: number;
}

/** A departures-board row: small-caps labels over aligned monospace values. */
export function Departures({ items }: { items: DepartureItem[] }) {
  const columns = items.map((item) => `${item.span ?? 1}fr`).join(" ");
  return (
    <dl
      className="grid overflow-hidden rounded bg-rail max-sm:!grid-cols-2"
      style={{ gridTemplateColumns: columns }}
    >
      {items.map((item) => (
        <div key={item.label} className="border-board px-3.5 py-[7px] sm:border-r sm:last:border-r-0">
          <dt className="label mb-1">{item.label}</dt>
          <dd className={`text-lg font-medium tabular-nums ${item.highlight ? "text-amber" : "text-cream"}`}>
            {item.value}
            {item.unit && <small className="ml-1 text-xs text-label">{item.unit}</small>}
          </dd>
          {item.sub && <dd className="mt-0.5 text-xs text-label">{item.sub}</dd>}
        </div>
      ))}
    </dl>
  );
}
