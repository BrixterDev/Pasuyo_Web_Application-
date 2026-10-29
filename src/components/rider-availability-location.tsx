"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function RiderAvailabilityLocation({
  riderId,
  isOnline,
}: {
  riderId: string;
  isOnline: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("Automatic location detection is waiting for your status.");
  const sending = useRef(false);
  const lastSentAt = useRef(0);
  const lastRefreshedAt = useRef(0);

  useEffect(() => {
    if (!isOnline) return;
    if (!navigator.geolocation) {
      setMessage("This browser does not support automatic location detection.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const watchId = navigator.geolocation.watchPosition(async (position) => {
      const now = Date.now();
      if (sending.current || now - lastSentAt.current < 15000) return;

      sending.current = true;
      lastSentAt.current = now;
      const { latitude, longitude } = position.coords;
      const { error: profileError } = await supabase
        .from("rider_profiles")
        .update({
          latitude,
          longitude,
          location_updated_at: new Date(position.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("rider_id", riderId);

      setMessage(profileError ? "Could not save your location. Check your connection and try again." : "Sharing your live location for nearby requests.");
      if (!profileError && Date.now() - lastRefreshedAt.current >= 30000) {
        lastRefreshedAt.current = Date.now();
        router.refresh();
      }
      sending.current = false;
    }, (error) => {
      setMessage(error.code === 1
        ? "Location permission was denied. Allow access to see nearby requests."
        : "Could not get your location. Try again when GPS is available.");
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [isOnline, riderId, router]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600" aria-live="polite">{isOnline ? message : "Set your availability online to enable automatic location detection."}</p>
    </div>
  );
}
