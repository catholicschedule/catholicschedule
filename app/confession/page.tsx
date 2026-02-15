"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import Image from "next/image";


type Church = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const displayOrder = [6, 0, 1, 2, 3, 4, 5]; // Saturday first

export default function ConfessionPage() {
  const [zip, setZip] = useState("");
  const [radius, setRadius] = useState(25);
  const [churches, setChurches] = useState<(Church & { miles_away?: number })[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      const { data, error } = await supabase.rpc("nearby_churches", {
        lat,
        lng,
        miles: radius,
        limit_count: 20,
      });

      if (error) throw new Error(error.message);
      // nearby_churches returns church fields + miles_away
      setChurches((data ?? []) as any);
    } catch (err: any) {
      setError(err.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <nav className="nav">
        <div className="brand">
          <h1>Catholic Schedule</h1>
          <p>Find local Mass and Confession times</p>
        </div>
        <div className="navlinks">
          <a href="/">Mass</a>
          <a href="/admin">Admin</a>
        </div>
      </nav>

      <section className="hero">
        <h2>Search by ZIP code</h2>
        <p>Find nearby confession times</p>

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
                  {typeof (c as any).miles_away === "number" && (
                    <span className="badge">{(c as any).miles_away.toFixed(1)} mi</span>
                  )}
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

              <ConfessionTimes churchId={c.id} />
            </article>
          ))}
        </section>
      )}

<section style={{ marginTop: 60 }}>
  <h2 style={{ marginBottom: 20 }}>Sacrament of Reconciliation</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
      gap: 20,
    }}
  >
    <Image src="/A-Catholic-Confession-saint-Michael-Patch.jpg" alt="A-Catholic-Confession-saint-Michael-Patch" width={500} height={350} style={{ borderRadius: 16 }} />
    <Image src="/B-Catholic-Confession-Jesus.jpg" alt="B-Catholic-Confession-Jesus" width={500} height={350} style={{ borderRadius: 16 }} />
    <Image src="/2-Mass-Roasary-beads" alt="2-Mass-Roasary-beads" width={500} height={350} style={{ borderRadius: 16 }} />
  </div>
</section>

    </main>
  );
}

function ConfessionTimes({ churchId }: { churchId: string }) {
  const [rows, setRows] = useState<
    { day_of_week: number; start_time: string; end_time: string; notes: string | null }[]
  >([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("confession_times")
        .select("day_of_week, start_time, end_time, notes")
        .eq("church_id", churchId);

      if (cancelled) return;

      if (error) setErr(error.message);
      else setRows((data ?? []) as any);
    })();

    return () => {
      cancelled = true;
    };
  }, [churchId]);

  if (err) return <div className="error">Error loading confession times: {err}</div>;
  if (rows.length === 0) return <p className="addr" style={{ marginTop: 10 }}>No confession times currently listed.Please contact the parish for current confession times.</p>;

  const grouped = new Map<number, typeof rows>();
  rows.forEach((r) => {
    if (!grouped.has(r.day_of_week)) grouped.set(r.day_of_week, []);
    grouped.get(r.day_of_week)!.push(r);
  });
  grouped.forEach((arr) => arr.sort((a, b) => a.start_time.localeCompare(b.start_time)));

  return (
    <div style={{ marginTop: 12 }}>
      <div className="sectionTitle">Confession times</div>

      {displayOrder
        .filter((d) => grouped.has(d))
        .map((d) => (
          <div key={d} style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>{dayNames[d]}</div>
            <div className="pills" style={{ marginTop: 8 }}>
              {grouped.get(d)!.map((r, idx) => (
                <span className="pill" key={idx}>
                  {formatTime(r.start_time)}–{formatTime(r.end_time)}
                  {r.notes ? ` • ${r.notes}` : ""}
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

