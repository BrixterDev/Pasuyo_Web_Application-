"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DeliveryMap, type DeliveryMapPoint } from "@/components/delivery-map";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  rider_assigned: "Rider assigned",
  picked_up: "Picked up",
  in_transit: "In transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

type Coordinates = { latitude: number; longitude: number } | null;
type DrivingRoute = {
  key: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinates: Array<[number, number]>;
  instructions: string[];
};

const routerServiceUrl = process.env.NEXT_PUBLIC_OSRM_ROUTER_URL || "https://router.project-osrm.org";

function formatRouteStep(type: string, modifier: string | undefined, roadName: string) {
  const road = roadName || "the road";
  if (type === "arrive") return `Arrive at ${road}`;
  if (type === "depart") return `Start toward ${road}`;
  if (type === "roundabout" || type === "rotary") return `Enter the roundabout${modifier ? `, ${modifier}` : ""}${roadName ? ` onto ${roadName}` : ""}`;
  if (type === "merge") return `Merge${modifier ? ` ${modifier}` : ""}${roadName ? ` onto ${roadName}` : ""}`;
  if (type === "fork") return `Keep${modifier ? ` ${modifier}` : ""} at the fork${roadName ? ` onto ${roadName}` : ""}`;
  if (type === "turn" || type === "end of road") return `Turn${modifier ? ` ${modifier}` : ""} onto ${road}`;
  if (type === "new name" || type === "continue") return `Continue${roadName ? ` on ${roadName}` : " straight"}`;
  return `${type.replaceAll("_", " ")}${modifier ? ` ${modifier}` : ""}${roadName ? ` onto ${roadName}` : ""}`;
}

export function LiveDeliveryMap({
  orderId,
  initialStatus,
  sellerName,
  sellerLatitude,
  sellerLongitude,
  customerLatitude,
  customerLongitude,
  riderName,
  initialRiderLatitude,
  initialRiderLongitude,
  initialRiderLocationUpdatedAt,
}: {
  orderId: string;
  initialStatus: string;
  sellerName: string;
  sellerLatitude: number | null;
  sellerLongitude: number | null;
  customerLatitude: number | null;
  customerLongitude: number | null;
  riderName: string | null;
  initialRiderLatitude: number | null;
  initialRiderLongitude: number | null;
  initialRiderLocationUpdatedAt: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [connection, setConnection] = useState("Connecting to live updates");
  const [riderLocation, setRiderLocation] = useState<Coordinates>(
    initialRiderLatitude !== null && initialRiderLongitude !== null
      ? { latitude: initialRiderLatitude, longitude: initialRiderLongitude }
      : null,
  );
  const [lastRiderUpdateAt, setLastRiderUpdateAt] = useState<Date | null>(
    initialRiderLocationUpdatedAt ? new Date(initialRiderLocationUpdatedAt) : null,
  );
  const pickupLeg = status === "rider_assigned" || status === "ready_for_pickup";
  const destinationLatitude = pickupLeg ? sellerLatitude : customerLatitude;
  const destinationLongitude = pickupLeg ? sellerLongitude : customerLongitude;
  const originLatitude = riderLocation?.latitude ?? null;
  const originLongitude = riderLocation?.longitude ?? null;
  const routeKey = originLatitude !== null && originLongitude !== null
    && destinationLatitude !== null && destinationLongitude !== null
    ? [originLatitude, originLongitude, destinationLatitude, destinationLongitude].map((value) => value.toFixed(5)).join(",")
    : null;
  const [route, setRoute] = useState<DrivingRoute | null>(null);
  const [routeErrorKey, setRouteErrorKey] = useState<string | null>(null);

  useEffect(() => {
    if (
      !routeKey
      || originLatitude === null
      || originLongitude === null
      || destinationLatitude === null
      || destinationLongitude === null
    ) return;

    const controller = new AbortController();
    const requestKey = routeKey;
    const url = `${routerServiceUrl}/route/v1/driving/${originLongitude},${originLatitude};${destinationLongitude},${destinationLatitude}?overview=full&geometries=geojson&steps=true`;

    void fetch(url, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Street routing service unavailable.");
        return response.json() as Promise<{
          code: string;
          routes?: Array<{
            distance: number;
            duration: number;
            geometry: { coordinates: Array<[number, number]> };
            legs: Array<{ steps: Array<{ name: string; maneuver: { type: string; modifier?: string } }> }>;
          }>;
        }>;
      })
      .then((result) => {
        const selectedRoute = result.routes?.[0];
        if (result.code !== "Ok" || !selectedRoute) throw new Error("No driving route found.");
        const instructions = selectedRoute.legs.flatMap((leg) => leg.steps)
          .map((step) => formatRouteStep(step.maneuver.type, step.maneuver.modifier, step.name))
          .filter(Boolean);

        setRoute({
          key: requestKey,
          distanceMeters: selectedRoute.distance,
          durationSeconds: selectedRoute.duration,
          coordinates: selectedRoute.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
          instructions,
        });
        setRouteErrorKey(null);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setRouteErrorKey(requestKey);
      });

    return () => controller.abort();
  }, [destinationLatitude, destinationLongitude, originLatitude, originLongitude, routeKey]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;

    const refreshRiderLocation = async () => {
      const { data, error } = await supabase
        .from("rider_locations")
        .select("latitude, longitude, recorded_at")
        .eq("order_id", orderId)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active || error || !data) return;
      const latitude = Number(data.latitude);
      const longitude = Number(data.longitude);
      if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
        setRiderLocation({ latitude, longitude });
        setLastRiderUpdateAt(new Date(String(data.recorded_at ?? Date.now())));
      }
    };

    // Realtime is preferred, but polling keeps tracking working when a
    // browser/network does not receive a Postgres change event.
    void refreshRiderLocation();
    const locationPoll = window.setInterval(() => void refreshRiderLocation(), 5000);

    const channel = supabase
      .channel(`delivery-tracking-${orderId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        if (typeof payload.new.status === "string") {
          setStatus(payload.new.status);
          router.refresh();
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "rider_locations",
        filter: `order_id=eq.${orderId}`,
      }, (payload) => {
        const latitude = Number(payload.new.latitude);
        const longitude = Number(payload.new.longitude);
        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setRiderLocation({ latitude, longitude });
          setLastRiderUpdateAt(new Date(String(payload.new.recorded_at ?? Date.now())));
        }
      })
      .subscribe((channelStatus) => {
        setConnection(channelStatus === "SUBSCRIBED" ? "Live updates connected" : "Reconnecting to live updates");
      });

    return () => {
      active = false;
      window.clearInterval(locationPoll);
      void supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  const points: DeliveryMapPoint[] = [
    { label: sellerName || "Seller", latitude: sellerLatitude, longitude: sellerLongitude, kind: "seller" },
    { label: "Delivery address", latitude: customerLatitude, longitude: customerLongitude, kind: "customer" },
    { label: riderName ? `Rider ${riderName}` : "Rider location", latitude: riderLocation?.latitude ?? null, longitude: riderLocation?.longitude ?? null, kind: "rider" },
  ];
  const currentRoute = route?.key === routeKey ? route : null;
  const navigationUrl = originLatitude !== null && originLongitude !== null
    && destinationLatitude !== null && destinationLongitude !== null
    ? `https://www.google.com/maps/dir/?api=1&origin=${originLatitude},${originLongitude}&destination=${destinationLatitude},${destinationLongitude}&travelmode=driving`
    : null;
  const riderLocationLabel = riderLocation
    ? lastRiderUpdateAt
      ? `Rider location updated ${lastRiderUpdateAt.toLocaleTimeString()}`
      : "Rider location available"
    : ["rider_assigned", "picked_up", "in_transit"].includes(status)
      ? "Waiting for rider GPS location"
      : "Waiting for rider assignment";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <DeliveryMap points={points} routeCoordinates={currentRoute?.coordinates} />
      <div className="border-t border-slate-200 px-5 py-4">
        {currentRoute ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800">
                {pickupLeg ? "Route to seller" : "Route to customer"} · {(currentRoute.distanceMeters / 1000).toFixed(1)} km · {Math.max(1, Math.round(currentRoute.durationSeconds / 60))} min
              </p>
              {navigationUrl ? <Link href={navigationUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-emerald-700">Open navigation app</Link> : null}
            </div>
            {currentRoute.instructions.length ? (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">Turn-by-turn directions</summary>
                <ol className="mt-3 max-h-48 space-y-2 overflow-y-auto pl-5 text-slate-600">
                  {currentRoute.instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}
                </ol>
              </details>
            ) : null}
            <p className="mt-2 text-xs text-slate-500">Road route provided by OSRM using the displayed locations.</p>
          </>
        ) : routeKey && routeErrorKey === routeKey ? (
          <p className="text-sm text-amber-800">No street route is available right now. Use the map pins or open your navigation app.</p>
        ) : routeKey ? (
          <p className="text-sm text-slate-500">Loading street route…</p>
        ) : (
          <p className="text-sm text-slate-500">Street navigation becomes available when your current location and next stop are known.</p>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Delivery status</p>
          <p className="mt-1 font-semibold">{statusLabels[status] ?? status}</p>
          <p className="mt-1 text-xs text-slate-500">{riderLocationLabel}</p>
        </div>
        <p className="text-sm text-slate-500" aria-live="polite">{connection}</p>
      </div>
    </section>
  );
}
