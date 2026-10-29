"use client";

import { useState } from "react";
import { LocateFixed } from "lucide-react";

import { DeliveryMap } from "@/components/delivery-map";
import { saveCustomerAddressAction } from "@/lib/actions/delivery";

export function CustomerDeliveryLocationForm({
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
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState("");
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
    setMessage("Waiting for location permission…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(coords.latitude.toFixed(6));
        setLongitude(coords.longitude.toFixed(6));
        setMessage("Location selected. Confirm your delivery address, then save.");
        setIsLocating(false);
      },
      (error) => {
        const errors: Record<number, string> = {
          1: "Location permission was denied. Allow access or select a pin on the map.",
          2: "Your location is currently unavailable. Try again or select a pin on the map.",
          3: "Location lookup timed out. Try again or select a pin on the map.",
        };
        setMessage(errors[error.code] ?? "Could not get your location. Select a pin on the map.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  }

  return (
    <form action={saveCustomerAddressAction} className="mt-6 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <div className="grid content-start gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm md:col-span-2">
          <span className="font-medium text-slate-700">Delivery address</span>
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
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 disabled:cursor-wait disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" aria-hidden="true" />
            {isLocating ? "Finding location…" : "Use my current location"}
          </button>
          {message ? <p className="mt-2 text-sm text-slate-600" aria-live="polite">{message}</p> : null}
        </div>
        <input name="latitude" type="hidden" value={latitude} required />
        <input name="longitude" type="hidden" value={longitude} required />
        <p className="text-xs text-slate-500 md:col-span-2">Your exact coordinates are saved from the map pin and are not shown as editable fields.</p>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={!address.trim() || !hasCoordinates}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Save delivery location
          </button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <p className="border-b border-slate-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800">Click the map to choose your drop-off pin.</p>
        <DeliveryMap
          className="h-72"
          onLocationSelect={(selectedLatitude, selectedLongitude) => {
            setLatitude(String(selectedLatitude));
            setLongitude(String(selectedLongitude));
            setMessage("Drop-off location selected. Save it to use this pin for delivery.");
          }}
          points={[
            {
              label: address.trim() || "Your delivery location",
              latitude: hasCoordinates ? parsedLatitude : null,
              longitude: hasCoordinates ? parsedLongitude : null,
              kind: "customer",
            },
          ]}
        />
      </div>
    </form>
  );
}
