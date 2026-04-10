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

export type BuildForecastSeriesResult = {
  actual: number[];
  forecast: number[] | null;
  /** Lower prediction bound per step (√h-scaled). Null when insufficient. */
  low: number[] | null;
  /** Upper prediction bound per step. Null when insufficient. */
  high: number[] | null;
  insufficient: boolean;
  /** Last value of the sliced series (before prediction). */
  lastActual: number;
  /** Std dev of residuals on the training window. */
  residualStdDev: number;
  /** Number of non-zero months in the training window, used for the confidence badge. */
  validDataMonthCount: number;
  /** Coefficient of variation = stdDev(window) / mean(window). */
  cv: number;
};

/**
 * Slice to last `forecastWindow` points, require ≥2 non-zero samples to forecast.
 * Adds prediction bands (low/high) and CV for the confidence badge.
 */
export function buildForecastSeries(
  values: number[],
  forecastWindow: number,
  forecastHorizon: number,
  forecastMethod: ForecastMethod
): BuildForecastSeriesResult {
  const series = values.slice(-forecastWindow);
  const validPoints = series.filter((v) => v > 0).length;
  const lastActual = series[series.length - 1] ?? 0;

  // Coefficient of variation over the training window
  const n = series.length;
  const mean = n > 0 ? series.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 0 ? series.reduce((s, v) => s + (v - mean) ** 2, 0) / n : 0;
  const stdDev = Math.sqrt(variance);
  const cv = mean > 0 ? stdDev / mean : stdDev > 0 ? Infinity : 0;

  if (validPoints < 2) {
    return {
      actual: series,
      forecast: null,
      low: null,
      high: null,
      insufficient: true,
      lastActual,
      residualStdDev: stdDev,
      validDataMonthCount: validPoints,
      cv,
    };
  }

  // Residual std dev on the training window
  let residualStdDev: number;
  if (forecastMethod === "average") {
    const resVar = series.reduce((s, v) => s + (v - mean) ** 2, 0) / series.length;
    residualStdDev = Math.sqrt(resVar);
  } else {
    const { m, b } = linearRegression(series);
    const resVar = series.reduce((s, v, i) => s + (v - (m * i + b)) ** 2, 0) / series.length;
    residualStdDev = Math.sqrt(resVar);
  }

  const forecast = predictNext(series, forecastHorizon, forecastMethod);

  // Prediction bands: step index i → step number h = i + 1 (1-indexed)
  const low = forecast.map((f, i) =>
    Math.max(0, Math.round((f - residualStdDev * Math.sqrt(i + 1)) * 10) / 10)
  );
  const high = forecast.map((f, i) =>
    Math.round((f + residualStdDev * Math.sqrt(i + 1)) * 10) / 10
  );

  return {
    actual: series,
    forecast,
    low,
    high,
    insufficient: false,
    lastActual,
    residualStdDev,
    validDataMonthCount: validPoints,
    cv,
  };
}

/**
 * Compute period-over-period percentage change.
 * (current - previous) / previous * 100
 */
export function periodChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Confidence badge based on data availability and variability (CV). */
export function confidenceBadge(
  validDataMonthCount: number,
  cv: number
): { color: "green" | "yellow" | "red"; label: string } {
  if (validDataMonthCount < 2) {
    return { color: "red", label: "Not enough data yet — needs 2+ months" };
  }
  if (validDataMonthCount >= 5 && cv < 0.5) {
    return { color: "green", label: "Based on 5+ months of data" };
  }
  if (validDataMonthCount >= 5) {
    return { color: "yellow", label: "Based on 5+ months (variable demand)" };
  }
  return { color: "yellow", label: `Based on ${validDataMonthCount} months of data` };
}
