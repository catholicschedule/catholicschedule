"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

type Church = { id: string; name: string };

const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export default function AdminPage() {
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // auth form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");

  // data
  const [churches, setChurches] = useState<Church[]>([]);
  const [msg, setMsg] = useState("");

  // add church form
  const [cName, setCName] = useState("");
  const [cAddress, setCAddress] = useState("");
  const [cCity, setCCity] = useState("");
  const [cState, setCState] = useState("");
  const [cZip, setCZip] = useState("");
  const [cLat, setCLat] = useState("");
  const [cLng, setCLng] = useState("");

  // add mass time form
  const [massChurchId, setMassChurchId] = useState("");
  const [massDay, setMassDay] = useState(0);
  const [massTime, setMassTime] = useState("09:00");
  const [massNotes, setMassNotes] = useState("");

  // add confession time form
  const [confChurchId, setConfChurchId] = useState("");
  const [confDay, setConfDay] = useState(6);
  const [confStart, setConfStart] = useState("15:00");
  const [confEnd, setConfEnd] = useState("16:00");
  const [confNotes, setConfNotes] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSessionEmail(sess?.user.email ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function refreshChurches() {
    const { data, error } = await supabase.from("churches").select("id,name").order("name");
    if (error) {
      setMsg("Error loading churches: " + error.message);
      return;
    }
    const list = (data ?? []) as Church[];
    setChurches(list);
    if (!massChurchId && list[0]) setMassChurchId(list[0].id);
    if (!confChurchId && list[0]) setConfChurchId(list[0].id);
  }

  useEffect(() => {
    if (sessionEmail) refreshChurches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEmail]);

  const churchOptions = useMemo(
    () => churches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>),
    [churches]
  );

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setAuthMsg(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function addChurch(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const lat = parseFloat(cLat);
    const lng = parseFloat(cLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setMsg("Please enter valid latitude and longitude.");
      return;
    }

    const { error } = await supabase.from("churches").insert([{
      name: cName,
      address: cAddress,
      city: cCity,
      state: cState,
      zip: cZip,
      lat,
      lng
    }]);

    if (error) setMsg("Add church failed: " + error.message);
    else {
      setMsg("Church added.");
      setCName(""); setCAddress(""); setCCity(""); setCState(""); setCZip(""); setCLat(""); setCLng("");
      refreshChurches();
    }
  }

  async function addMass(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.from("mass_times").insert([{
      church_id: massChurchId,
      day_of_week: massDay,
      time: massTime,
      notes: massNotes || null,
    }]);

    if (error) setMsg("Add Mass time failed: " + error.message);
    else {
      setMsg("Mass time added.");
      setMassNotes("");
    }
  }

  async function addConfession(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    const { error } = await supabase.from("confession_times").insert([{
      church_id: confChurchId,
      day_of_week: confDay,
      start_time: confStart,
      end_time: confEnd,
      notes: confNotes || null,
    }]);

    if (error) setMsg("Add confession time failed: " + error.message);
    else {
      setMsg("Confession time added.");
      setConfNotes("");
    }
  }

  if (!sessionEmail) {
    return (
      <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
        <h1>Admin login</h1>
        <form onSubmit={signIn} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
          <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inp} />
          <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inp} />
          <button style={btn} type="submit">Sign in</button>
          {authMsg && <p style={{ color: "crimson" }}>{authMsg}</p>}
        </form>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
        <h1>Admin</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#555" }}>{sessionEmail}</span>
          <a href="/">Home</a>
          <a href="/confession">Confession</a>
          <button style={btn} onClick={signOut}>Sign out</button>
        </div>
      </header>

      {msg && <p style={{ marginTop: 10, color: msg.startsWith("Error") || msg.includes("failed") ? "crimson" : "green" }}>{msg}</p>}

      <section style={card}>
        <h2>Add church</h2>
        <p style={{ color: "#666" }}>
          Tip: get lat/lng by right-clicking the pin in Google Maps.
        </p>
        <form onSubmit={addChurch} style={{ display: "grid", gap: 10 }}>
          <input placeholder="Name" value={cName} onChange={(e) => setCName(e.target.value)} style={inp} required />
          <input placeholder="Address" value={cAddress} onChange={(e) => setCAddress(e.target.value)} style={inp} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: 10 }}>
            <input placeholder="City" value={cCity} onChange={(e) => setCCity(e.target.value)} style={inp} required />
            <input placeholder="State" value={cState} onChange={(e) => setCState(e.target.value)} style={inp} required />
            <input placeholder="ZIP" value={cZip} onChange={(e) => setCZip(e.target.value)} style={inp} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input placeholder="Latitude (e.g. 40.7501)" value={cLat} onChange={(e) => setCLat(e.target.value)} style={inp} required />
            <input placeholder="Longitude (e.g. -80.3202)" value={cLng} onChange={(e) => setCLng(e.target.value)} style={inp} required />
          </div>
          <button style={btn} type="submit">Add church</button>
        </form>
      </section>

      <section style={card}>
        <h2>Add Mass time</h2>
        <form onSubmit={addMass} style={{ display: "grid", gap: 10 }}>
          <label>
            Church
            <select value={massChurchId} onChange={(e) => setMassChurchId(e.target.value)} style={inp as any}>
              {churchOptions}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              Day
              <select value={massDay} onChange={(e) => setMassDay(parseInt(e.target.value, 10))} style={inp as any}>
                {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </label>

            <label>
              Time
              <input type="time" value={massTime} onChange={(e) => setMassTime(e.target.value)} style={inp} />
            </label>
          </div>

          <input placeholder="Notes (optional: Vigil, English, Spanish…)" value={massNotes} onChange={(e) => setMassNotes(e.target.value)} style={inp} />
          <button style={btn} type="submit">Add Mass time</button>
        </form>
      </section>

      <section style={card}>
        <h2>Add Confession time</h2>
        <form onSubmit={addConfession} style={{ display: "grid", gap: 10 }}>
          <label>
            Church
            <select value={confChurchId} onChange={(e) => setConfChurchId(e.target.value)} style={inp as any}>
              {churchOptions}
            </select>
          </label>

          <label>
            Day
            <select value={confDay} onChange={(e) => setConfDay(parseInt(e.target.value, 10))} style={inp as any}>
              {dayNames.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              Start
              <input type="time" value={confStart} onChange={(e) => setConfStart(e.target.value)} style={inp} />
            </label>
            <label>
              End
              <input type="time" value={confEnd} onChange={(e) => setConfEnd(e.target.value)} style={inp} />
            </label>
          </div>

          <input placeholder="Notes (optional)" value={confNotes} onChange={(e) => setConfNotes(e.target.value)} style={inp} />
          <button style={btn} type="submit">Add Confession time</button>
        </form>
      </section>
    </main>
  );
}

const inp: React.CSSProperties = {
  padding: 10,
  borderRadius: 10,
  border: "1px solid #ccc",
  width: "100%",
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #ccc",
  background: "white",
  cursor: "pointer",
};

const card: React.CSSProperties = {
  marginTop: 16,
  padding: 14,
  border: "1px solid #ddd",
  borderRadius: 12,
};
