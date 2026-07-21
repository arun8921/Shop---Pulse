import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  return null;
}

// A small inline map: click anywhere to drop/move the pin, which fills in
// latitude/longitude for the shop registration form. Falls back to a
// reasonable default center until the browser's geolocation resolves.
export default function LocationPicker({ latitude, longitude, onChange }) {
  const [center] = useState({ lat: 9.9312, lng: 76.2673 }); // default: Kochi
  const hasPin = latitude && longitude;

  function handlePick(lat, lng) {
    onChange(lat.toFixed(6), lng.toFixed(6));
  }

  function handleMarkerDrag(e) {
    const { lat, lng } = e.target.getLatLng();
    onChange(lat.toFixed(6), lng.toFixed(6));
  }

  const initialCenter = hasPin ? [parseFloat(latitude), parseFloat(longitude)] : [center.lat, center.lng];

  return (
    <div>
      <div className="map-picker-wrap">
        <span className="map-picker-hint">Click on the map to set your shop's location</span>
        <MapContainer center={initialCenter} zoom={hasPin ? 15 : 12} style={{ height: "100%", width: "100%" }}>
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickHandler onPick={handlePick} />
          {hasPin && (
            <>
              <Marker
                position={[parseFloat(latitude), parseFloat(longitude)]}
                icon={markerIcon}
                draggable={true}
                eventHandlers={{ dragend: handleMarkerDrag }}
              />
              <RecenterOnChange lat={parseFloat(latitude)} lng={parseFloat(longitude)} />
            </>
          )}
        </MapContainer>
      </div>
      {hasPin && (
        <p className="muted mono" style={{ marginTop: -8, marginBottom: 16 }}>
          Pinned at {parseFloat(latitude).toFixed(5)}, {parseFloat(longitude).toFixed(5)} — drag the marker to fine-tune
        </p>
      )}
    </div>
  );
}
