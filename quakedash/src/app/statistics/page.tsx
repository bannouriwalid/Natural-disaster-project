"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  Legend,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Disaster } from "../types/disaster.type";
import CollectionDialog from "../components/CollectionDialog";
import { MAX_BY_TYPE } from "../lib/getMaxByType";
import { getColorForMagnitude } from "../lib/getColorForMagnitude";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas-pro";
import { FileUp } from "lucide-react";

export default function StatisticsPage() {
  const [disasters, setDisasters] = useState<Disaster[]>([]);
  const [range, setRange] = useState<"hour" | "day" | "week" | "month">("month");
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);
  const [collections, setCollections] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>("");


  useEffect(() => {
    fetch("/api/collections")
        .then((res) => res.json())
        .then((data) => {
          setCollections(data);
          if (data.length > 0) {
            setSelected(data[0]);
          }
        })
        .catch((error) => {
          console.error("Error fetching collections:", error);
        });
  }, []);


  useEffect(() => {
    const storedSeenIds = localStorage.getItem("seenIds");
    if (storedSeenIds) {
      setSeenIds(new Set(JSON.parse(storedSeenIds)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("seenIds", JSON.stringify(Array.from(seenIds)));
  }, [seenIds]);

  useEffect(() => {
    const fetchAndDetect = async () => {
      setLoading(true);
      try {
        // 1) fetch from your new batchDisaster endpoint, hardcode usgs for disasters
        const response = await fetch(
          `/api/batchDisaster?collection=${selected}&range=${range}`
        );
        if (response.ok) {
          const data = await response.json();
          const combined = [...data.data];
          setDisasters(combined);
        } else {
          console.error("Failed to fetch data:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching disasters:", error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch when the component mounts
    fetchAndDetect();

    // // Set interval to fetch data every 1 minute
    // const intervalId = setInterval(fetchAndDetect, 60000);

    // // Cleanup interval on component unmount
    // return () => clearInterval(intervalId);
  }, [range, selected]);
  // Derive list of types
  const types = useMemo(() => {
    const set = new Set(disasters.map((d) => d.type));
    return ["all", ...Array.from(set)];
  }, [disasters]);

  // Partition disasters by type
  const disastersByType = useMemo(() => {
    const map: Record<string, Disaster[]> = {};
    disasters.forEach((d) => {
      (map[d.type] ||= []).push(d);
    });
    return map;
  }, [disasters]);
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    disasters.forEach((d) => {
      counts[d.type] = (counts[d.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, value]) => ({ type, value }));
  }, [disasters]);

  const regionCount: Record<string, number> = {};
  disasters.forEach((d) => {
    const region = d.place.split(", ").pop() || "Unknown";
    regionCount[region] = (regionCount[region] || 0) + 1;
  });

  const timeGrouped: Record<string, number> = {};
  disasters.forEach((d) => {
    const date = new Date(d.time);
    let label = "";

    if (range === "hour") {
      label = `${date.getMinutes()} min`;
    } else if (range === "day") {
      label = `${date.getHours()}:00`;
    } else if (range === "week") {
      label = date.toDateString();
    } else if (range === "month") {
      const week = Math.ceil(date.getDate() / 7);
      label = `Week ${week} - ${date.toLocaleString("default", {
        month: "short",
      })}`;
    }

    timeGrouped[label] = (timeGrouped[label] || 0) + 1;
  });
  const PIE_COLORS = [
    "#8f565bff",
    "#f2c4a0ff",
    "#f35f75ff",
    "#312a31ff",
    "#b0aeb9ff",
  ];

  // const handleSelectCollection = async (selected: string) => {
  //   setSelected(selected);
  // };
async function handleExportImage() {
  if (!printRef.current) return;

  // 1) snapshot the DOM node to a canvas
  const canvas = await html2canvas(printRef.current, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  // 2) convert to a data‐URL
  const dataURL = canvas.toDataURL("image/png");

  // 3) trigger a download in the browser
  const link = document.createElement("a");
  link.href = dataURL;
  link.download = `disasters-stats-${new Date().toISOString()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

  return (
      <div className="pt-6 pl-6 pr-6 mb-0">
        {/* Centered title */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Disaster Analytics Report
          </h1>
        </div>

        {/* First row: Dropdown filters */}
        <div className="flex flex-row justify-center items-center gap-2 mb-4">
          {/* File selector */}
          <div className="flex flex-col items-start space-y-1">
            <label className="text-sm font-semibold text-gray-800">Select File</label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="px-3 py-1 w-[350px] bg-white text-black rounded-md font-bold">
                <SelectValue placeholder="Select a file"/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Files</SelectLabel>
                  {collections.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Type filter */}
          <div className="flex flex-col items-start space-y-1">
            <label className="text-sm font-semibold text-gray-800">Type Filter</label>
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v)}>
              <SelectTrigger className="px-3 py-1 w-[160px] bg-white text-black rounded-md font-bold">
                <SelectValue placeholder="Type Filter"/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Disaster Type</SelectLabel>
                  {types.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t === "all" ? "All" : t}
                      </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Time filter */}
          <div className="flex flex-col items-start space-y-1">
            <label className="text-sm font-semibold text-gray-800">Time Filter</label>
            <Select value={range} onValueChange={(value) => setRange(value as "hour" | "day" | "week" | "month")}>
              <SelectTrigger className="px-3 py-1 w-[180px] bg-white text-black rounded-md font-bold">
                <SelectValue placeholder="Time Filter"/>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filter by Time</SelectLabel>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="day">Last Day</SelectItem>
                  <SelectItem value="hour">Last Hour</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        {/* Filters & actions in a row layout */}
        <div className="flex justify-center mb-4">
          <div className="flex flex-row w-[690px] gap-2">
            {/*/!* CollectionDialog button *!/*/}
            {/*<div className="flex flex-col flex-1">*/}
            {/*  <CollectionDialog onSelect={handleSelectCollection} />*/}
            {/*</div>*/}

            {/* Download button */}
            <div className="flex  flex-1">
              <Button
                  onClick={handleExportImage}
                  className="w-full bg-raisin-black text-white rounded-md cursor-pointer hoverBtn"
                  variant="outline"
              >
                <FileUp size={16} />
                Download Report
              </Button>
            </div>
          </div>
        </div>

        {/* PER-TYPE SECTIONS */}
        <div ref={printRef} className="pl-6 pr-6 pb-6">
          {types
              .filter((t) => (selectedType === "all" ? true : t === selectedType))
              .filter((t) => t === "all" || (disastersByType[t]?.length ?? 0) > 0)
              .map((type) => {
                const list = type === "all" ? disasters : disastersByType[type];
                const mags = list.map((d) => d.magnitude_value);
                const total = list.length;
                const strongest = total ? Math.max(...mags) : 0;

                // Find the object with the strongest magnitude to get its unit
                const strongestObj = total ? list.find(d => d.magnitude_value === strongest) : null;
                const unit = strongestObj?.magnitude_unit ?? "";

                const weakest = total ? Math.min(...mags) : 0;
                const average = total
                    ? mags.reduce((sum, m) => sum + m, 0) / total
                    : 0;
                const averageRounded = Math.round(average * 10) / 10;

                // dynamic bins
                const maxScale = MAX_BY_TYPE[type] ?? Math.max(...mags, 1);
                const BIN_COUNT = 8;
                const binSize = maxScale / BIN_COUNT;
                const magDistribution = Array.from(
                    {length: BIN_COUNT},
                    (_, i) => {
                      const start = i * binSize;
                      const end = start + binSize;
                      const count = mags.filter((m) => m >= start && m < end).length;
                      return {
                        range: `${start.toFixed(0)}–${end.toFixed(0)}`,
                        count,
                      };
                    }
                );
                // top three
                const topFour = [...list]
                    .sort((a, b) => b.magnitude_value - a.magnitude_value)
                    .slice(0, 4);
                // over-time
                const timeCount: Record<string, number> = {};
                list.forEach((d) => {
                  const dt = new Date(d.time);
                  const key =
                      range === "hour"
                          ? `${dt.getMinutes()}m`
                          : range === "day"
                              ? `${dt.getHours()}h`
                              : range === "week"
                                  ? dt.toDateString()
                                  : `W${Math.ceil(dt.getDate() / 7)}`;
                  timeCount[key] = (timeCount[key] || 0) + 1;
                });
                const timeData = Object.entries(timeCount)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([time, count]) => ({time, count}));
                return (
                    <div key={type}>
                      <Separator className="bg-gray-400 mt-6"/>
                      <div key={type} className="space-y-4">
                        <div className="text-center mb-6">
                          <h2 className="text-2xl font-bold mt-6">
                            {type === "all" ? "All Disasters" : type}
                          </h2>
                        </div>

                        <div   className={`grid gap-4 ${
                            loading ? "grid-cols-1 md:grid-cols-4" :
                                type === "Volcanoes" || type === "all" ? "grid-cols-1" : "grid-cols-1 md:grid-cols-4"
                        }`}>
                          {loading ? (
                              <>
                                <Skeleton className="h-[120px] w-full rounded-xl"/>
                                <Skeleton className="h-[120px] w-full rounded-xl"/>
                                <Skeleton className="h-[120px] w-full rounded-xl"/>
                                <Skeleton className="h-[120px] w-full rounded-xl"/>
                              </>
                          ) : type === "Volcanoes" || type === "all" ? (
                              <>
                                <Card className="text-center">
                                  <CardHeader className="flex flex-col items-center justify-center">
                                    <CardTitle className="font-bold text-lg">Total counts</CardTitle>
                                  </CardHeader>
                                  <CardContent
                                      className="flex flex-col items-center justify-center text-xl font-medium">
                                    {total}
                                  </CardContent>
                                </Card>
                              </>

                          ) : (
                              <>
                                  <Card className="text-center flex-1">
                                    <CardHeader className="flex flex-col items-center justify-center">
                                      <CardTitle className="font-bold text-lg">Total Counts</CardTitle>
                                    </CardHeader>
                                    <CardContent
                                        className="flex flex-col items-center justify-center text-xl font-medium">
                                      {total}
                                    </CardContent>
                                  </Card>

                                  <Card className="text-center flex-1">
                                    <CardHeader className="flex flex-col items-center justify-center">
                                      <CardTitle className="font-bold text-lg">Strongest Event</CardTitle>
                                    </CardHeader>
                                    <CardContent
                                        className="flex flex-col items-center justify-center text-xl font-medium">
                                      {strongest} {unit}
                                    </CardContent>
                                  </Card>

                                  <Card className="text-center flex-1">
                                    <CardHeader className="flex flex-col items-center justify-center">
                                      <CardTitle className="font-bold text-lg">Weakest Event</CardTitle>
                                    </CardHeader>
                                    <CardContent
                                        className="flex flex-col items-center justify-center text-xl font-medium">
                                      {weakest} {unit}
                                    </CardContent>
                                  </Card>

                                  <Card className="text-center flex-1">
                                    <CardHeader className="flex flex-col items-center justify-center">
                                      <CardTitle className="font-bold text-lg">Average Magnitude</CardTitle>
                                    </CardHeader>
                                    <CardContent
                                        className="flex flex-col items-center justify-center text-xl font-medium">
                                      {averageRounded} {unit}
                                    </CardContent>
                                  </Card>

                              </>
                          )}
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {/* Over Time */}
                          {loading ? (
                              <>
                                <Skeleton className="h-[360px] w-full rounded-xl"/>
                                <Skeleton className="h-[360px] w-full rounded-xl"/>
                              </>
                          ) : (
                              <>
                                {/* Top 4 Dangerous Events Card */}
                                {type !== "all" ? (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle>Top 4 {type} Events</CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-2">
                                        <div className="grid gap-2">
                                          {topFour.map((d) => (
                                              <Card key={d._id} className="px-4 py-2">
                                                <div className="flex justify-between items-start w-full">
                                                  <div className="w-full">
                                                    <h4 className="text-sm font-medium">
                                                      {d.place}
                                                    </h4>
                                                    <div className="flex justify-between items-start">
                                                      <p className="text-xs text-muted-foreground capitalize">
                                                        {`${d.type} | ${new Date(
                                                            d.time
                                                        ).toLocaleDateString(undefined, {
                                                          year: "numeric",
                                                          month: "short",
                                                          day: "numeric",
                                                        })}`}
                                                      </p>
                                                      {d.type === "Volcanoes" ? (
                                                          <p className="text-xs text-muted-foreground">
                                                            –
                                                          </p>
                                                      ) : (
                                                          <p className="text-sm font-semibold">
                                                            {d.magnitude_value.toFixed(1)}{" "}
                                                            {d.magnitude_unit ?? ""}
                                                          </p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              </Card>
                                          ))}
                                          {topFour.length === 0 && (
                                              <p className="text-sm text-muted-foreground">
                                                No data
                                              </p>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="h-[360px]">
                                      <CardHeader>
                                        <CardTitle>By Type (%)</CardTitle>
                                      </CardHeader>
                                      <CardContent className="h-[280px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                          <PieChart>
                                            <Pie
                                                data={typeCounts}
                                                dataKey="value"
                                                nameKey="type"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                label={({percent}) =>
                                                    `${(percent! * 100).toFixed(0)}%`
                                                }
                                            >
                                              {typeCounts.map((_, idx) => (
                                                  <Cell
                                                      key={idx}
                                                      fill={
                                                        PIE_COLORS[idx % PIE_COLORS.length]
                                                      }
                                                  />
                                              ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(
                                                    value: number,
                                                    name: string
                                                ) => [`${value}`, name]}
                                            />
                                            <Legend
                                                verticalAlign="bottom"
                                                formatter={(value) => (
                                                    <span className="text-sm">{value}</span>
                                                )}
                                            />
                                          </PieChart>
                                        </ResponsiveContainer>
                                      </CardContent>
                                    </Card>
                                )}
                                <Card className="h-[360px]">
                                  <CardHeader>
                                    <CardTitle>Over Time</CardTitle>
                                  </CardHeader>
                                  <CardContent className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={timeData}>
                                        <CartesianGrid strokeDasharray="3 3"/>
                                        <XAxis dataKey="time"/>
                                        <YAxis allowDecimals={false}/>
                                        <Tooltip/>
                                        <Line
                                            type="monotone"
                                            dataKey="count"
                                            stroke="#10b981"
                                            strokeWidth={2}
                                            dot={{r: 3}}
                                            activeDot={{r: 6}}
                                        />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </CardContent>
                                </Card>
                              </>
                          )}

                          {/* Distribution */}
                          {loading ? (
                              <Skeleton className="h-[240px] w-full rounded-xl col-span-1 md:col-span-2"/>
                          ) : type === "all" || type === "Volcanoes" ? (
                              ""
                          ) : (
                              <Card className="col-span-1 md:col-span-2">
                                <CardHeader>
                                  <CardTitle>Scale Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[240px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={magDistribution}>
                                      <CartesianGrid strokeDasharray="3 3"/>
                                      <XAxis dataKey="range"/>
                                      <YAxis/>
                                      <Tooltip/>
                                      <Bar dataKey="count">
                                        {magDistribution.map((d, i) => {
                                          // parse the bin’s midpoint back to number
                                          const [start, end] = d.range
                                              .split("–")
                                              .map(Number);
                                          const midpoint = (start + end) / 2;
                                          // lookup the max for this type
                                          const maxScale = MAX_BY_TYPE[type] ?? 10;
                                          const fill = getColorForMagnitude(
                                              midpoint,
                                              maxScale
                                          );
                                          return <Cell key={i} fill={fill}/>;
                                        })}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </CardContent>
                              </Card>
                          )}
                        </div>
                      </div>
                    </div>
                );
              })}
        </div>
      </div>
  );
}
