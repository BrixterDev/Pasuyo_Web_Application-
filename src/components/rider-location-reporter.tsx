"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RiderLocationReporter({ orderId, riderId }: { orderId: string; riderId: string }) {
  const [message, setMessage] = useState("Detecting your delivery location…");
  const sending = useRef(false);
  const lastSentAt = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMessage("This browser does not support automatic location detection.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (sending.current || now - lastSentAt.current < 8000) return;

      sending.current = true;
      lastSentAt.current = now;
      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const { error: locationError } = await supabase.from("rider_locations").insert({
        order_id: orderId,
        rider_id: riderId,
        latitude,
        longitude,
        accuracy,
        heading,
        speed,
        recorded_at: new Date(position.timestamp).toISOString(),
      });

      if (locationError) {
        setMessage("Automatic location update failed. Check your connection.");
        sending.current = false;
        return;
      }

      const { error: profileError } = await supabase
        .from("rider_profiles")
        .update({ latitude, longitude, location_updated_at: new Date(position.timestamp).toISOString(), updated_at: new Date().toISOString() })
        .eq("rider_id", riderId);

      setMessage(profileError ? "Delivery location sent; profile location could not be refreshed." : `Location updated at ${new Date().toLocaleTimeString()}.`);
      sending.current = false;
    }, () => {
      setMessage("Location permission is unavailable. Allow access so customers can follow the delivery.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [orderId, riderId]);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4">
      <p className="text-sm text-slate-600" aria-live="polite">{message}</p>
    </div>
  );
}
