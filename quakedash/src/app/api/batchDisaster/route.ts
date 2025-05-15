import { NextRequest, NextResponse } from "next/server";
import { getBatchDb } from "../../lib/mongodb";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);

    // 1) read & validate query params
    const collection = url.searchParams.get("collection") as string;
    if (!collection) {
      return NextResponse.json(
          { error: "Missing collection parameter" },
          { status: 400 }
      );
    }

    const range = (url.searchParams.get("range") ?? "month") as
      | "hour"
      | "day"
      | "week"
      | "month";
      // | "all";

    // 2) compute threshold date
    // bigdata_to_change_later to :
    // const now = new Date();
    // and comment or delete the next line


    // 3) fetch raw docs
    const db = await getBatchDb();
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (!collectionNames.includes(collection)) {
      return NextResponse.json(
          { error: `Collection "${collection}" does not exist in the database.` },
          { status: 400 }
      );
    }

    const source = collection as string;
    const raw = await db.collection(source).find().toArray();

      const latestDoc = await db.collection(source)
          .find()
          .sort({ time: -1 }) // descending order by time
          .limit(1)
          .toArray();

      if (latestDoc.length === 0 || !latestDoc[0].time) {
          return NextResponse.json(
              { error: "No documents found or missing 'time' field in the latest document." },
              { status: 400 }
          );
      }

      const now = new Date(latestDoc[0].time);

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
      //     case "all":
      //         const oldestDoc = await db.collection(source)
      //             .find()
      //             .sort({ time: 1 }) // descending order by time
      //             .limit(1)
      //             .toArray();
      //         fromDate.setTime(new Date(oldestDoc[0].time).getTime());
      }

    // 4) parseTime helper
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function parseTime(doc: any): Date {
      // 1) If the driver already gave us a Date, use it:
      if (doc.time instanceof Date) return doc.time;
      if (doc.date_time instanceof Date) return doc.date_time;

      // 2) Grab whichever string field exists
      const rawStr: string =
        typeof doc.time === "string"
          ? doc.time
          : typeof doc.date_time === "string"
          ? doc.date_time
          : "";

      let str = rawStr.trim();

      // 3) If it looks like "YYYY-MM-DD HH:mm:ss(.SSS)", convert to ISO:
      //    i.e. insert a "T" between date and time, and ensure a trailing "Z" for UTC
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(str)) {
        str = str.replace(" ", "T") + "Z";
      }

      // 4) Delegate to Date.parse for ISO, RFC-1123, etc.
      return new Date(str);
    }

    // 5) normalize + filter in one pipeline
    const normalized = raw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((d: any) => {
          const parsed = parseTime(d);

          // Determine magnitude_value
          let magnitude_value = 0;
          if (typeof d.magnitude_value === "number") {
            magnitude_value = d.magnitude_value;
          } else if (typeof d.magnitude === "string") {
            magnitude_value = parseFloat(d.magnitude);
          }

          // Determine magnitude_unit
          let magnitude_unit = d.magnitude_unit ?? "";
          if (!magnitude_unit && d.type === "Wildfire") {
            magnitude_unit = "acres";
          } else if (!magnitude_unit && d.magnitude_value !== undefined) {
            magnitude_unit = "Richter"; // fallback for typical earthquake data
          }

          // Determine type
          let type = d.type ?? "Unknown";
          if (type === "Wildfire") type = "Wildfires";

          // Normalize latitude and longitude
          const latitude = typeof d.latitude === "string" ? parseFloat(d.latitude) : d.latitude;
          const longitude = typeof d.longitude === "string" ? parseFloat(d.longitude) : d.longitude;

          return {
            _id: d._id,
            magnitude_value,
            latitude,
            longitude,
            place: d.place,
            description: d.description ?? null,
            time: parsed.toISOString(),
            magnitude_unit,
            source: (d.source ?? "").toString().toUpperCase(),
            type,
            parsed,
          };
        })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((item: any) => new Date(item.time) >= fromDate);
    return NextResponse.json({ data: normalized }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
