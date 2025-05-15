export function getColor(value: number, max: number) {
  const pct = Math.min(1, Math.max(0, value / max));
  // green → red
  const r = Math.round(255 * pct);
  const g = Math.round(255 * (1 - pct));
  return `rgb(${r},${g},0)`;
}