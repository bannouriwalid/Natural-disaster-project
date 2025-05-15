export interface Disaster {
  _id: string;
  magnitude_value: number;
  latitude: number;
  longitude: number;
  description: string | null;
  place: string;
  time: string;
  magnitude_unit: string | null;
  source: string;
  type: "Earthquake" | "Wildfires" | "Sea and Lake Ice"  | "explosion" | "Wildfire" | "Flood" |string;
}