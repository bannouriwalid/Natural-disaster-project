import { NextRequest, NextResponse } from "next/server";
import { getStreamingDb } from "../../lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const minMag = parseFloat(url.searchParams.get("minMag") ?? "0");
    const range = (url.searchParams.get("range") ?? "hour") as
      | "hour"
      | "day"
      | "week"
      | "month";

    // 1) Compute fromDate based on range
    // bigdata_to_change_later to :
    const now = new Date();
    // and comment or delete the next line 
    // const now = new Date("2025-05-07T09:30:00Z"); // use real now in production
    const fromDate = new Date(now);
    switch (range) {
      case "hour":
        fromDate.setHours(now.getHours() - 1);
        break;
      case "day":
        fromDate.setDate(now.getDate() - 1);
        break;
      case "week":
        fromDate.setDate(now.getDate() - 7);
        break;
      case "month":
        fromDate.setMonth(now.getMonth() - 1);
        break;
    }

    const db = await getStreamingDb();

    // 2) Fetch only by magnitude threshold
    const [rawUsgs, rawEonet, rawGdacs] = await Promise.all([
      db
        .collection("usgs")
        .find({ magnitude: { $gte: minMag } })
        .toArray(),
      db
        .collection("eonet")
        .find({ magnitude_value: { $gte: minMag } })
        .toArray(),
      db
        .collection("gdacs")
        .find({})
        .toArray(),
    ]);
    // 3) Helper to parse each timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function parseTime(doc: any, source: "usgs" | "eonet" | "gdacs"): Date {
      if (source === "usgs") {
        // USGS: "YYYY-MM-DD HH:mm:ss.SS"
        // Replace first space → 'T', append 'Z' for UTC
        return new Date(doc.time.replace(" ", "T") + "Z");
      }
      if (source === "gdacs") {
        // GDACS: "Thu, 08 May 2025 22:33:39 GMT"
        return new Date(doc.date_time);
      }
      // EONET: already ISO string "2025-05-02T00:00:00Z"
      return new Date(doc.time);
    }

    // 4) Parse + filter by fromDate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Raw = any;
    const usgs = rawUsgs
      .map((d: Raw) => ({ ...d, parsedTime: parseTime(d, "usgs") }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((d: any) => d.parsedTime >= fromDate);

    const eonet = rawEonet
      .map((d: Raw) => ({ ...d, parsedTime: parseTime(d, "eonet") }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((d: any) => d.parsedTime >= fromDate);

    const gdacs = rawGdacs
      .map((d: Raw) => ({ ...d, parsedTime: parseTime(d, "gdacs") }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((d: any) => d.parsedTime >= fromDate);

    // 5) Shape and strip parsedTime before returning
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function normalizeUsgs(arr: any[]) {
      return arr.map((d) => ({
        _id: d._id,
        magnitude_value: d.magnitude,
        latitude: d.latitude,
        longitude: d.longitude,
        description: d.description ?? null,
        place: d.place,
        time: d.parsedTime.toISOString(),
        magnitude_unit: d.magnitude_unit ?? "Richter",
        source: d.source,
        type: "Earthquake",
      }));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function normalizeEonet(arr: any[]) {
      return arr.map((d) => ({
        _id: d._id,
        magnitude_value: d.magnitude_value,
        latitude: d.latitude,
        longitude: d.longitude,
        description: d.description ?? null,
        place: d.place,
        time: d.parsedTime.toISOString(),
        magnitude_unit: d.magnitude_unit ?? null,
        source: d.source,
        type: d.type,
      }));
    } // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function normalizeGdacs(arr: any[]) {
      return arr.map((d) => ({
        _id: d._id,
        // magnitude_value: d.type === "Flood" ? 0 : d.type === "Wildfire" ? d.magnitude_value_in_ha :  parseFloat(d.magnitude),
        magnitude_value: parseFloat(d.magnitude),
        latitude: parseFloat(d.latitude),
        longitude: parseFloat(d.longitude),
        description: d.description ?? null,
        place: d.place,
        time: d.parsedTime.toISOString(),
        magnitude_unit: d.magnitude_unit  ?? null,
        source: d.source,
        type: d.type === "Wildfire" ? "Wildfires" : d.type,
      }));
    }
    const results_usgs = normalizeUsgs(usgs);
    const results_eonet = normalizeEonet(eonet);
    const results_gdacs = normalizeGdacs(gdacs);

    return NextResponse.json(
      { results_usgs, results_eonet, results_gdacs },
      { status: 200 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message: "Error", error: msg }, { status: 500 });
  }
}
