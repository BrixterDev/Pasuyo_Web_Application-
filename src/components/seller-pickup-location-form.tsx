"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

import { DeliveryMap } from "@/components/delivery-map";
import { saveSellerLocationAction } from "@/lib/actions/seller";

export function SellerPickupLocationForm({
  initialAddress,
  initialLatitude,
  initialLongitude,
}: {
  initialAddress: string;
  initialLatitude: number | null;
  initialLongitude: number | null;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [latitude, setLatitude] = useState(initialLatitude === null ? "" : String(initialLatitude));
  const [longitude, setLongitude] = useState(initialLongitude === null ? "" : String(initialLongitude));
  const [message, setMessage] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const parsedLatitude = latitude.trim() ? Number(latitude) : null;
  const parsedLongitude = longitude.trim() ? Number(longitude) : null;
  const hasCoordinates = parsedLatitude !== null && parsedLongitude !== null
    && Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)
    && parsedLatitude >= -90 && parsedLatitude <= 90
    && parsedLongitude >= -180 && parsedLongitude <= 180;

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("This browser does not support location access.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLatitude(coords.latitude.toFixed(6));
      setLongitude(coords.longitude.toFixed(6));
      setMessage("Pickup location selected. Confirm the store address, then save.");
      setIsLocating(false);
    }, (error) => {
      setMessage(error.code === 1
        ? "Location permission was denied. Enter the store coordinates manually."
        : "Could not get your location. Try again or enter the coordinates manually.");
      setIsLocating(false);
    }, { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 });
  }

  return (
    <form action={saveSellerLocationAction} className="grid gap-4 md:grid-cols-2">
      <label className="space-y-2 text-sm md:col-span-2">
        <span className="font-medium text-slate-700">Store pickup address</span>
        <input
          name="address"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="Street, barangay, city"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500"
        />
      </label>
      <div className="md:col-span-2">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:opacity-60"
        >
          <LocateFixed className="h-4 w-4" aria-hidden="true" />
          {isLocating ? "Finding location…" : "Use current store location"}
        </button>
        {message ? <p className="mt-2 text-sm text-slate-600" aria-live="polite">{message}</p> : null}
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-700">Latitude</span>
        <input name="latitude" type="number" min="-90" max="90" step="any" required value={latitude} onChange={(event) => setLatitude(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-700">Longitude</span>
        <input name="longitude" type="number" min="-180" max="180" step="any" required value={longitude} onChange={(event) => setLongitude(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-emerald-500" />
      </label>
      <div className="md:col-span-2">
        <button type="submit" disabled={!address.trim() || !hasCoordinates} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Save pickup location</button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 md:col-span-2">
        <DeliveryMap
          className="h-64"
          points={[{ label: address.trim() || "Store pickup", latitude: hasCoordinates ? parsedLatitude : null, longitude: hasCoordinates ? parsedLongitude : null, kind: "seller" }]}
        />
      </div>
    </form>
  );
}