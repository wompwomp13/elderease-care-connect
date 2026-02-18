/**
 * Forecasting utilities for admin dashboard analytics.
 * Linear regression: y = mx + b
 */

/**
 * Compute linear regression slope (m) and intercept (b) for y = mx + b.
 * x values are assumed to be 0, 1, 2, ..., n-1.
 */
export function linearRegression(values: number[]): { m: number; b: number } {
  const n = values.length;
  if (n < 2) return { m: 0, b: values[0] ?? 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  const m = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const b = (sumY - m * sumX) / n;

  return { m, b };
}

export type ForecastMethod = "trend" | "average";

/**
 * Predict next N values using linear regression (trend) or simple average.
 */
export function predictNext(
  values: number[],
  steps: number = 2,
  method: ForecastMethod = "trend"
): number[] {
  if (values.length === 0) return [];
  if (method === "average") {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return Array.from({ length: steps }, () => Math.max(0, Math.round(avg * 10) / 10));
  }
  const { m, b } = linearRegression(values);
  const n = values.length;
  const forecast: number[] = [];
  for (let i = 0; i < steps; i++) {
    const pred = m * (n + i) + b;
    forecast.push(Math.max(0, Math.round(pred * 10) / 10));
  }
  return forecast;
}

/**
 * Compute period-over-period percentage change.
 * (current - previous) / previous * 100
 */
export function periodChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
