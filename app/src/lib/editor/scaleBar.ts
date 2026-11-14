// Phase 30: scale bar for the plate (DESIGN3-03). Picks a round length (1, 2 or 5 times a
// power of ten) whose drawn width is close to a target, so the bar stays a handy size at
// every zoom.

export interface ScaleBar {
  lengthM: number;
  widthPx: number;
  /** German label, e.g. "2 m" or "50 cm". */
  label: string;
}

export function scaleBar(scalePxPerM: number, targetPx = 90): ScaleBar {
  const safeScale = scalePxPerM > 0 ? scalePxPerM : 1;
  const ideal = targetPx / safeScale;
  const pow = Math.pow(10, Math.floor(Math.log10(ideal)));
  const candidates = [1, 2, 5, 10].map((m) => m * pow);
  let best = candidates[0];
  for (const cnd of candidates) {
    if (Math.abs(cnd - ideal) < Math.abs(best - ideal)) best = cnd;
  }
  const lengthM = Math.round(best * 1000) / 1000;
  const label =
    lengthM >= 1
      ? `${String(lengthM).replace('.', ',')} m`
      : `${Math.round(lengthM * 100)} cm`;
  return { lengthM, widthPx: lengthM * safeScale, label };
}
