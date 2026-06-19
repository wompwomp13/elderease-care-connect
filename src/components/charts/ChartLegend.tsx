import { cn } from "@/lib/utils";

/**
 * One entry in a {@link ChartLegend}. The `variant` controls the key marker so it
 * mirrors how the series is actually drawn in the chart:
 *  - `solid`  → a solid line with a center node (line series)
 *  - `dashed` → a dashed line with a center node (forecast continuation)
 *  - `bar`    → a filled rounded square (bar / area series)
 *  - `dot`    → a filled circle (categorical point series)
 */
export type ChartLegendItem = {
  label: string;
  color: string;
  variant?: "solid" | "dashed" | "bar" | "dot";
  /** Optional value shown right-aligned after the label. */
  value?: string | number | null;
  /** When set together with `onToggle`, the row becomes a clickable toggle that dims when false. */
  active?: boolean;
  onToggle?: () => void;
};

type ChartLegendProps = {
  items: (ChartLegendItem | null | undefined | false)[];
  className?: string;
  /** "vertical" → boxed key beside the chart; "horizontal" → wrapped row below it. */
  orientation?: "vertical" | "horizontal";
  /** Render inside a bordered card (the boxed legend from the design references). */
  boxed?: boolean;
  /** Optional heading shown above the keys (vertical/boxed only). */
  title?: string;
};

/**
 * Shared chart legend: a boxed, color-keyed legend placed beside the chart (or a
 * wrapped row beneath it). Each row pairs a shape-accurate marker — solid vs dashed
 * line, bar, or dot — with the series label, so the colours on the plot map to names
 * at a glance. One consistent legend vocabulary across every admin-dashboard chart.
 */
export function ChartLegend({
  items,
  className,
  orientation = "vertical",
  boxed = true,
  title,
}: ChartLegendProps) {
  const visible = items.filter(Boolean) as ChartLegendItem[];
  if (!visible.length) return null;

  const vertical = orientation === "vertical";

  return (
    <div
      className={cn(
        boxed && "rounded-lg border border-border bg-card px-3.5 py-3 shadow-sm",
        className,
      )}
    >
      {title && (
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <ul
        className={cn(
          "text-sm",
          vertical ? "flex flex-col gap-2.5" : "flex flex-wrap items-center gap-x-5 gap-y-2",
        )}
      >
        {visible.map((item, i) => {
          const hasValue = item.value != null && item.value !== "";
          const toggleable = typeof item.onToggle === "function";
          const inactive = toggleable && item.active === false;
          const inner = (
            <>
              <LegendMarker color={item.color} variant={item.variant ?? "solid"} />
              <span className="truncate text-foreground/90">{item.label}</span>
              {hasValue && (
                <span
                  className={cn(
                    "font-semibold tabular-nums text-foreground",
                    vertical && "ml-auto pl-3",
                  )}
                >
                  {item.value}
                </span>
              )}
            </>
          );
          return (
            <li key={`${item.label}-${i}`}>
              {toggleable ? (
                <button
                  type="button"
                  onClick={item.onToggle}
                  aria-pressed={item.active !== false}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-1.5 py-1 text-left transition-opacity hover:bg-muted/60",
                    inactive && "opacity-40",
                  )}
                >
                  {inner}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 px-1.5 py-1">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function LegendMarker({
  color,
  variant,
}: {
  color: string;
  variant: NonNullable<ChartLegendItem["variant"]>;
}) {
  if (variant === "bar") {
    return (
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-[3px]"
        style={{ background: color }}
      />
    );
  }

  if (variant === "dot") {
    return (
      <span
        aria-hidden
        className="h-3 w-3 shrink-0 rounded-full ring-2 ring-background"
        style={{ background: color }}
      />
    );
  }

  // solid / dashed line — drawn as SVG for crisp dashes and a center node
  return (
    <svg
      aria-hidden
      width="26"
      height="12"
      viewBox="0 0 26 12"
      className="shrink-0 overflow-visible"
    >
      <line
        x1="1"
        y1="6"
        x2="25"
        y2="6"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={variant === "dashed" ? "5 4" : undefined}
      />
      <circle cx="13" cy="6" r="3" fill={color} />
    </svg>
  );
}

export default ChartLegend;
