/**
 * Minimal sparkline for trend visualization in stat cards.
 */
interface SparklineProps {
  data: number[];
  className?: string;
  stroke?: string;
  /** Height in pixels */
  height?: number;
  /** Width in pixels */
  width?: number;
}

export function Sparkline({ data, className = "", stroke = "currentColor", height = 24, width = 56 }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padd = 2;
  const w = width - padd * 2;
  const h = height - padd * 2;
  const stepX = (data.length - 1) > 0 ? w / (data.length - 1) : 0;

  const points = data
    .map((v, i) => {
      const x = padd + i * stepX;
      const y = padd + h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
