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

export type ForecastMethod = "trend";

/**
 * Predict next N values using linear regression (trend).
 */
export function predictNext(values: number[], steps: number = 2): number[] {
  if (values.length === 0) return [];
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
  /**
   * Back-tested prediction for the current (last) bucket, fitted on the buckets
   * *before* it. Lets a chart plot a forecast point on the current month next to
   * its actual, so the actual and forecast lines meet instead of leaving a gap.
   * Null when there are fewer than 2 non-zero buckets before the current one.
   */
  currentPrediction: number | null;
  /** Lower bound for `currentPrediction` (1 residual std dev). */
  currentLow: number | null;
  /** Upper bound for `currentPrediction`. */
  currentHigh: number | null;
};

/** Std dev of residuals around the fitted trend line. */
function trendResidualStdDev(series: number[]): number {
  const { m, b } = linearRegression(series);
  const resVar = series.reduce((s, v, i) => s + (v - (m * i + b)) ** 2, 0) / series.length;
  return Math.sqrt(resVar);
}

/**
 * Slice to last `forecastWindow` points, require ≥2 non-zero samples to forecast.
 * Adds prediction bands (low/high) and CV for the confidence badge.
 *
 * Pass `forecastWindow + 1` values — one bucket of lead-in beyond the displayed
 * window — so `currentPrediction` can be back-tested on a full-size window. Only
 * the last `forecastWindow` values are used for the display series and the
 * forward forecast, so the extra leading value never shows up on a chart.
 */
export function buildForecastSeries(
  values: number[],
  forecastWindow: number,
  forecastHorizon: number
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

  // Back-test the current bucket: fit on the buckets before it, predict one step.
  // This is what the model would have said for "this month" knowing only the
  // completed months prior — so it can be compared against the live actual.
  //
  // The training set is a *full* `forecastWindow` shifted back one bucket, so a
  // 3-month window trains on the 3 months before the current one rather than on
  // a truncated 2. That needs `forecastWindow + 1` values from the caller; when
  // only `forecastWindow` are supplied it degrades to whatever history precedes
  // the current bucket.
  const priorSeries = values.slice(-(forecastWindow + 1), -1);
  let currentPrediction: number | null = null;
  let currentLow: number | null = null;
  let currentHigh: number | null = null;
  if (priorSeries.filter((v) => v > 0).length >= 2) {
    const [pred] = predictNext(priorSeries, 1);
    const priorResidual = trendResidualStdDev(priorSeries);
    currentPrediction = pred;
    currentLow = Math.max(0, Math.round((pred - priorResidual) * 10) / 10);
    currentHigh = Math.round((pred + priorResidual) * 10) / 10;
  }

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
      currentPrediction,
      currentLow,
      currentHigh,
    };
  }

  // Residual std dev on the training window
  const residualStdDev = trendResidualStdDev(series);

  const forecast = predictNext(series, forecastHorizon);

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
    currentPrediction,
    currentLow,
    currentHigh,
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
