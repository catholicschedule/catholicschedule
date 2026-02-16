"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import Image from "next/image";

type Church = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  miles_away: number;
lat: number;
lng: number;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const displayOrder = [6, 0, 1, 2, 3, 4, 5]; // Saturday vigil first
const ResultsMap = dynamic(() => import("./components/ResultsMap"), { ssr: false });

export default function Home() {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [churches, setChurches] = useState<Church[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);


  async function zipToLatLng(usZip: string) {
    const res = await fetch(`https://api.zippopotam.us/us/${encodeURIComponent(usZip)}`);
    if (!res.ok) throw new Error("Could not find that ZIP code.");
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) throw new Error("Could not find that ZIP code.");
    return { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setChurches([]);

    try {
      const cleaned = zip.trim();
      if (!/^\d{5}$/.test(cleaned)) throw new Error("Please enter a valid 5-digit ZIP code.");

      const { lat, lng } = await zipToLatLng(cleaned);
      setCenter({ lat, lng });

      const { data, error } = await supabase.rpc("nearby_churches", {
        lat,
        lng,
        miles: radius,
        limit_count: 20,
      });

      if (error) throw new Error(error.message);
      setChurches((data ?? []) as Church[]);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container" style={{ position: "relative" }}>
      <nav className="nav">
        <div className="brand">
          <h1>Catholic Schedule</h1>
          <p>Find local Mass and Confession times</p>
        </div>
<div className="navlinks">
  <a href="/confession">Confession</a>
</div>

      </nav>

      <section className="hero" style={{ position: "relative", overflow: "hidden" }}>
  {/* subtle background image behind the hero */}
  <div
    style={{
      position: "absolute",
      inset: 0,
      opacity: 0.14,
      pointerEvents: "none",
    }}
  >
    <Image
      src="/1-Mass-cathedral.jpg"
      alt="Background"
      fill
      style={{ objectFit: "cover" }}
      priority
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35), rgba(255,255,255,0.10))",
      }}
    />
  </div>

        <h2>Search by ZIP code</h2>
        <p>We’ll show nearby parishes and their schedules. Vigil Masses display first</p>

        <form className="controls" onSubmit={onSearch}>
          <input
            className="input"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            placeholder="ZIP (e.g., 15010)"
            inputMode="numeric"
            style={{ width: 220 }}
          />


          <select className="select" value={radius} onChange={(e) => setRadius(parseInt(e.target.value, 10))}>
            <option value={5}>Within 5 miles</option>
            <option value={10}>Within 10 miles</option>
            <option value={25}>Within 25 miles</option>
            <option value={50}>Within 50 miles</option>
          </select>

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && <div className="error">{error}</div>}
      </section>

<div style={{ marginTop: 16 }}>
  <ResultsMap
    center={center ?? { lat: 40.76622, lng: -80.35586 }} // default (St. Monica Catholic Parish) until you search
    churches={churches}
  />
</div>


      {churches.length > 0 && (
        <section className="grid">
          {churches.map((c) => (
            <article key={c.id} className="card">
              <div className="row">
                <div>
                  <h3 className="title">{c.name}</h3>
                  <p className="addr">
                    {c.address}, {c.city}, {c.state} {c.zip}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge">{c.miles_away.toFixed(1)} mi</span>
                  <a
                    className="btn"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${c.address}, ${c.city}, ${c.state} ${c.zip}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Directions
                  </a>
                </div>
              </div>

              <MassTimes churchId={c.id} />
            </article>
          ))}
        </section>
      )}

    </main>
  );
}

function MassTimes({ churchId }: { churchId: string }) {
  const [rows, setRows] = useState<{ day_of_week: number; time: string; notes: string | null }[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("mass_times")
        .select("day_of_week, time, notes")
        .eq("church_id", churchId);

      if (cancelled) return;

      if (error) setErr(error.message);
      else setRows((data ?? []) as any);
    })();

    return () => {
      cancelled = true;
    };
  }, [churchId]);

  if (err) return <div className="error">Error loading Mass times: {err}</div>;
  if (rows.length === 0) return <p className="addr" style={{ marginTop: 10 }}>No Mass times listed.</p>;

  const grouped = new Map<number, typeof rows>();
  rows.forEach((r) => {
    if (!grouped.has(r.day_of_week)) grouped.set(r.day_of_week, []);
    grouped.get(r.day_of_week)!.push(r);
  });
  grouped.forEach((arr) => arr.sort((a, b) => a.time.localeCompare(b.time)));

  return (
    <div style={{ marginTop: 12 }}>
      <div className="sectionTitle">Mass times</div>

      {displayOrder
        .filter((d) => grouped.has(d))
        .map((d) => (
          <div key={d} style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>{dayNames[d]}</div>
            <div className="pills" style={{ marginTop: 8 }}>
              {grouped.get(d)!.map((r, idx) => (
                <span className="pill" key={idx}>
                  {formatTime(r.time)}{r.notes ? ` • ${r.notes}` : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}


function formatTime(t: string) {
  const [hhS, mmS] = t.split(":");
  const hh = parseInt(hhS, 10);
  const mm = parseInt(mmS, 10);
  const ampm = hh >= 12 ? "PM" : "AM";
  const hour12 = ((hh + 11) % 12) + 1;
  return `${hour12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function UniformTile({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        height: 280,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={900}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain", // ✅ uniform boxes, NO cutting off portrait images
          display: "block",
        }}
      />
    </div>
  );
}


function LetterboxImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        overflow: "hidden",
        padding: 10,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(0,0,0,0.25)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={1400}
          height={1400}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}