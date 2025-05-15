export function getColorForMagnitude(mag: number, maxMag = 10) {
  // Clamp between 0 and maxMag
  const pct = Math.min(Math.max(mag / maxMag, 0), 1);
  // Hue from 120° (green) to 0° (red)
  const hue = (1 - pct) * 120;
  return `hsl(${hue}, 70%, 50%)`;
}