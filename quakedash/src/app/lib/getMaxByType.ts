export const MAX_BY_TYPE: Record<string, number> = {
  // earthquakes on a 0–10 Richter scale
  Earthquake: 10,

  // wildfires in acres (EONET sample max ~24 100)
  Wildfires: 25000,

  // GDACS “Wildfire” in hectares (~9 726 ha sample → scale to 10000 as full red)
  Wildfire: 10000,

  // iceberg surface area in NM² (EONET sample up to ~1 056)
  "Sea and Lake Ice": 1200,

  // floods—choose a reasonable max affected‐area or depth you expect
  Flood: 1000,

  // explosions, treat as Richter‐style
  Explosion: 10,
};