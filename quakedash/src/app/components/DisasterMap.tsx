"use client";
import {MapPin, Activity, Link, Info, Siren, CalendarClock} from "lucide-react"
import { MapContainer, TileLayer, Popup, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import earthquakeImg from "@/app/assets/earthquake.png";
import wildfireImg from "@/app/assets/wildfire.png";
import explosionImg from "@/app/assets/explosion.png";
import glacierImg from "@/app/assets/glacier.png";
import floodImg from "@/app/assets/flood.png";
import "../styles/map.css";
import { Disaster } from "../types/disaster.type";
import { getColorForMagnitude } from "../lib/getColorForMagnitude";
import { MAX_BY_TYPE } from "../lib/getMaxByType";
interface Props {
  disasters: Disaster[];
  tileUrl: string;
}

export default function DisasterMap({ disasters, tileUrl }: Props) {
  return (
    <MapContainer
      center={[20, 0] as LatLngExpression}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={tileUrl} />
      {disasters.map((eq) => {
        const lat = eq.latitude;
        const lng = eq.longitude;
        const center = [lat, lng] as LatLngExpression;
        const maxMag = MAX_BY_TYPE[eq.type] ?? 10;
        const color = getColorForMagnitude(eq.magnitude_value ?? 0, maxMag);
        const iconUrl =
          eq.type === "Earthquake"
            ? earthquakeImg.src
            : eq.type === "Wildfires"
            ? wildfireImg.src
            : eq.type === "Sea and Lake Ice"
            ? glacierImg.src
            : eq.type === "Flood"
            ? floodImg.src
            : explosionImg.src;
        const html = `
          <div class="custom-pin" style="background:${color}">
            <img src="${iconUrl}" class="pin-image" alt=""/>
            <div class="custom-pin-triangle" style="border-top-color:${color}">
            </div>
          </div>`;
        const pinIcon = L.divIcon({
          className: "",
          html,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
        });
        return (
          <Marker key={eq._id} position={center} icon={pinIcon}>
            <Popup>{renderPopupContent(eq)}</Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
function renderPopupContent(eq: Disaster) {
  return (
      <>
          <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-5 h-5 text-blue-600" />
              <strong className="text-lg text-blue-800">{eq.place ?? "Unknown location"}</strong>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-bold">
              <Siren className="w-5 h-5 text-red-500" />
              <span className="font-medium"></span> {eq.type}
          </div>

          {eq.magnitude_value != null && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-bold">
                  <Activity className="w-5 h-5 text-yellow-500" />
                  <span>{eq.magnitude_value}</span>
                  {eq.magnitude_unit && <span>{` ${eq.magnitude_unit}`}</span>}
              </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-bold">
              <CalendarClock className="w-5 h-5 text-purple-500" />
              <span className="font-medium"></span> {new Date(eq.time).toLocaleString()}
          </div>

          {eq.source && (
              <div className="flex items-center gap-2 text-sm text-gray-700 mb-1 font-bold">
                  <Link className="w-5 h-5 text-green-600" />
                  <span className="font-medium"></span> {eq.source}
              </div>
          )}

          {eq.description && (
              <div className="flex items-center gap-2 text-sm text-gray-700 font-bold">
                  <Info className="w-5 h-5 text-cyan-600" />
                  <span className="font-medium"></span> {eq.description}
              </div>
          )}
      </>
  );
}
