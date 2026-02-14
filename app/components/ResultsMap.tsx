"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type ChurchForMap = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
};

function FitBounds({ churches }: { churches: ChurchForMap[] }) {
  const map = useMap();

  useEffect(() => {
    if (!churches.length) return;

    const valid = churches.filter(
      (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng)
    );

    if (valid.length === 1) {
      map.setView([valid[0].lat, valid[0].lng], 13);
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(
        valid.map((c) => [c.lat, c.lng] as [number, number])
      );
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [churches, map]);

  return null;
}

export default function ResultsMap({
  center,
  churches,
}: {
  center: { lat: number; lng: number };
  churches: ChurchForMap[];
}) {
  return (
    <div style={{ height: 360, width: "100%", borderRadius: 18, overflow: "hidden" }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="© OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds churches={churches} />

        {churches
          .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
          .map((c) => (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={DefaultIcon}>
              <Popup>
                <div>
                  <strong>{c.name}</strong>
                </div>
                <div>
                  {c.address}, {c.city}, {c.state} {c.zip}
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
