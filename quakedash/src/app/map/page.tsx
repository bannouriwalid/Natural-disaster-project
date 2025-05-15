"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Disaster } from "../types/disaster.type";

const DisasterMap = dynamic(() => import("../components/DisasterMap"), {
  ssr: false,
});

export default function MapPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [range, setRange] = useState<"hour" | "day" | "week">("hour");
  const [loading, setLoading] = useState(false);
  const [minMagnitudeInput, setMinMagnitudeInput] = useState<number>(0);
  const [minMagnitude, setMinMagnitude] = useState<number>(0);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [tileType, setTileType] = useState<"street" | "satellite">("satellite");
  const [total, setTotal] = useState(0);
  const [strongest, setStrongest] = useState<number | null>(null);
  const [weakest, setWeakest] = useState<number | null>(null);

  const tileUrls = {
    street: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    satellite:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  };
  useEffect(() => {
    const fetchAndDetect = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/disaster?range=${range}&minMag=${minMagnitude}`
        );
        if (response.ok) {
          const data = await response.json();
          const combined = [
            ...data.results_usgs,
            ...data.results_eonet,
            ...data.results_gdacs,
          ];
          setDisasters(combined);
          setTotal(combined.length);
        } else {
          console.error("Failed to fetch data:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching disasters:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAndDetect();
    // Set interval to fetch data every 1 minute
    const intervalId = setInterval(fetchAndDetect, 60000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, [minMagnitude, range]);
  useEffect(() => {
    if (selectedType !== "all") {
      const filtered = disasters.filter((d) => d.type === selectedType);
      const magnitudes = filtered
        .map((d) => d.magnitude_value)
        .filter((m) => m != null);
      setTotal(filtered.length);
      if (magnitudes.length > 0) {
        setStrongest(Math.max(...magnitudes));
        setWeakest(Math.min(...magnitudes));
      } else {
        setStrongest(null);
        setWeakest(null);
      }
    } else {
      setTotal(disasters.length);
      setStrongest(null);
      setWeakest(null);
    }
  }, [selectedType, disasters]);
  useEffect(() => {
    const delay = setTimeout(() => {
      setMinMagnitude(minMagnitudeInput);
    }, 1000); // 300ms delay

    return () => clearTimeout(delay);
  }, [minMagnitudeInput]);

  return (
      <div className="w-full h-[100%] relative">
        <div className="absolute right-0 top-[13px] z-[401] flex gap-x-2">
        {/* Magnitude Filter Input – conditionally shown and far left */}
        {(selectedType === "Earthquake" || selectedType === "explosion") && (
            <input
                type="number"
                value={minMagnitude}
                onChange={(e) => setMinMagnitudeInput(Number(e.target.value))}
                placeholder="Min Magnitude"
                className="top-[13px] z-[401] border rounded px-3 py-1 text-sm w-[60px] h-[36px] bg-gray-300 shadow-md"
                min={0}
            />
        )}

        {/* Map View Select */}
        <Select
            value={tileType}
            onValueChange={(value) => setTileType(value as "street" | "satellite")}
        >
          <SelectTrigger
              className="bg-gray-300 top-[13px] z-[401] border rounded px-3 py-1 text-sm w-[120px] cursor-pointer shadow-md">
            <SelectValue placeholder="Map View"/>
          </SelectTrigger>
          <SelectContent className="z-[401]">
            <SelectGroup>
              <SelectLabel>Map View</SelectLabel>
              <SelectItem value="satellite">Satellite</SelectItem>
              <SelectItem value="street">Street</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Type Selector */}
        <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value)}
        >
          <SelectTrigger
              className="bg-gray-300 top-[13px] z-[401] border rounded px-3 py-1 text-sm w-[120px] cursor-pointer shadow-md">
            <SelectValue placeholder="Select Type"/>
          </SelectTrigger>
          <SelectContent className="z-[401]">
            <SelectGroup>
              <SelectLabel>Filter by Type</SelectLabel>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Earthquake">Earthquake</SelectItem>
              <SelectItem value="Sea and Lake Ice">Iceburge</SelectItem>
              <SelectItem value="Wildfires">Wildfire</SelectItem>
              <SelectItem value="Flood">Flood</SelectItem>
              <SelectItem value="explosion">Explosion</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        {/* Time Range Selector – rightmost */}
        <Select
            value={range}
            onValueChange={(value) => setRange(value as "hour" | "day" | "week")}
        >
          <SelectTrigger
              className="bg-gray-300 top-[13px] z-[401] border rounded px-3 py-1 text-sm w-[120px] cursor-pointer shadow-md">
            <SelectValue placeholder="Select to Filter"/>
          </SelectTrigger>
          <SelectContent className="z-[401]">
            <SelectGroup>
              <SelectLabel>Filter by Time</SelectLabel>
              <SelectItem value="hour">Last Hour</SelectItem>
              <SelectItem value="day">Last Day</SelectItem>
              <SelectItem value="week">Last Week</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        </div>
  {/*<div className="absolute top-[377px] left-4 right-4 z-[401] grid grid-cols-1 gap-2 w-[270px]">*/}
  {/*  {loading ? (*/}
  {/*      <>*/}
  {/*        <Skeleton className="h-[60px] w-full rounded-xl"/>*/}
  {/*        <Skeleton className="h-[60px] w-full rounded-xl"/>*/}
  {/*        <Skeleton className="h-[60px] w-full rounded-xl"/>*/}
  {/*      </>*/}
  {/*  ) : (*/}
  {/*      <>*/}
  {/*        {selectedType !== "all" && total !== 0 && selectedType !== "Flood" ? (*/}
  {/*            <>*/}
  {/*              <Card className="h-[60px] p-2 bg-transparent">*/}
  {/*                <CardHeader className="flex-row items-center justify-between space-y-0 mt-2 mb-2">*/}
  {/*                  <CardTitle*/}
  {/*                      className={`text-base ${*/}
  {/*                          tileType === "satellite" ? "text-white" : "text-black"*/}
  {/*                      }`}*/}
  {/*                  >*/}
  {/*                    Strongest Magnitude : {strongest}*/}
  {/*                  </CardTitle>*/}
  {/*                </CardHeader>*/}
  {/*              </Card>*/}

  {/*              <Card className="h-[60px] p-2 bg-transparent">*/}
  {/*                <CardHeader className="flex-row items-center justify-between space-y-0 mt-2 mb-2">*/}
  {/*                  <CardTitle*/}
  {/*                      className={`text-base ${*/}
  {/*                          tileType === "satellite" ? "text-white" : "text-black"*/}
  {/*                      }`}*/}
  {/*                  >*/}
  {/*                    Weakest Magnitude : {weakest}*/}
  {/*                  </CardTitle>*/}
  {/*                </CardHeader>*/}
  {/*              </Card>*/}
  {/*            </>*/}
  {/*        ) : (*/}
  {/*            <>*/}
  {/*              <div className="h-[60px] p-2 bg-transparent"></div>*/}
  {/*              <div className="h-[60px] p-2 bg-transparent"></div>*/}
  {/*            </>*/}
  {/*        )}*/}

  {/*        <Card className="h-[60px] p-2 order-last bg-transparent">*/}
  {/*          <CardHeader className="flex-row items-center justify-between space-y-0 mt-2 mb-2">*/}
  {/*            <CardTitle*/}
  {/*                className={`text-base ${*/}
  {/*                    tileType === "satellite" ? "text-white" : "text-black"*/}
  {/*                }`}*/}
  {/*            >*/}
  {/*              Total Disasters : {total}*/}
  {/*            </CardTitle>*/}
  {/*          </CardHeader>*/}
  {/*        </Card>*/}
  {/*      </>*/}
  {/*  )}*/}
  {/*</div>*/}

  {/* Map or Loading */
  }
  {
    typeof window !== "undefined" && loading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-600 text-lg animate-pulse">
                Loading disasters...
              </div>
            </div>
        ) : (
            <DisasterMap
                disasters={disasters.filter(
                    (eq) =>
                        eq.magnitude_value >= minMagnitude &&
                        (selectedType === "all" || eq.type === selectedType)
                )}
                tileUrl={tileUrls[tileType]}
            />
        )}
      </div>
  );
}
