"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline } from "leaflet";

export type DeliveryMapPoint = {
  label: string;
  latitude: number | null;
  longitude: number | null;
  kind: "seller" | "customer" | "rider";
};

export function DeliveryMap({
  points,
  routeCoordinates = [],
  className = "h-80",
  onLocationSelect,
}: {
  points: DeliveryMapPoint[];
  routeCoordinates?: Array<[number, number]>;
  className?: string;
  onLocationSelect?: (latitude: number, longitude: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const routeRef = useRef<LeafletPolyline | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mappedPoints = points.filter((point): point is DeliveryMapPoint & { latitude: number; longitude: number } =>
    typeof point.latitude === "number" && Number.isFinite(point.latitude)
    && typeof point.longitude === "number" && Number.isFinite(point.longitude),
  );

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    void import("leaflet").then((leaflet) => {
      if (cancelled || !containerRef.current) return;

      leafletRef.current = leaflet;
      map = leaflet.map(containerRef.current, { scrollWheelZoom: false });
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
      markersRef.current = [];
      routeRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onLocationSelect) return;

    const handleMapClick = (event: { latlng: { lat: number; lng: number } }) => {
      onLocationSelect(Number(event.latlng.lat.toFixed(6)), Number(event.latlng.lng.toFixed(6)));
    };
    map.on("click", handleMapClick);
    return () => {
      map.off("click", handleMapClick);
    };
  }, [mapReady, onLocationSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!mapReady || !map || !leaflet) return;

    markersRef.current.forEach((marker) => marker.remove());
    routeRef.current?.remove();
    markersRef.current = mappedPoints.map((point) => {
      const letter = point.kind === "seller" ? "S" : point.kind === "customer" ? "D" : "R";
      const icon = leaflet.divIcon({
        className: "pasuyo-map-icon",
        html: `<span class="pasuyo-map-pin pasuyo-map-pin--${point.kind}"><span>${letter}</span></span>`,
        iconSize: [34, 42],
        iconAnchor: [17, 40],
      });
      const marker = leaflet.marker([point.latitude, point.longitude], { icon }).addTo(map);
      const popup = document.createElement("span");
      popup.textContent = point.label;
      marker.bindPopup(popup);
      return marker;
    });

    if (routeCoordinates.length > 1) {
      routeRef.current = leaflet.polyline(
        routeCoordinates,
        { color: "#15803d", weight: 5, opacity: 0.9 },
      ).addTo(map);
    }

    const visibleCoordinates = [
      ...mappedPoints.map((point) => [point.latitude, point.longitude] as [number, number]),
      ...routeCoordinates,
    ];

    if (visibleCoordinates.length > 1) {
      map.fitBounds(leaflet.latLngBounds(visibleCoordinates), { padding: [36, 36], maxZoom: 15 });
    } else if (mappedPoints.length === 1) {
      map.setView([mappedPoints[0].latitude, mappedPoints[0].longitude], 14);
    }
  }, [mapReady, mappedPoints, routeCoordinates]);

  return (
    <div ref={containerRef} className={`${className} relative w-full`} aria-label="Delivery route map">
      {mappedPoints.length === 0 ? (
        <div className="absolute inset-0 z-400 grid place-items-center bg-slate-100 px-6 text-center text-sm text-slate-500">
          Map locations will appear when delivery coordinates are available.
        </div>
      ) : null}
    </div>
  );
}
