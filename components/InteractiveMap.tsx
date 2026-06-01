"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const GeoJSON = dynamic(
    () => import("react-leaflet").then((mod) => mod.GeoJSON),
    { ssr: false }
);

interface InteractiveMapProps {
    onRegionSelect?: (regionCode: string) => void;
    height?: string;
}

export default function InteractiveMap({
    onRegionSelect,
    height = "h-[500px]",
}: InteractiveMapProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [geoData, setGeoData] = useState<any>(null);

    useEffect(() => {
        // Load GeoJSON data
        fetch("/json/gh.json")
            .then((res) => res.json())
            .then((data) => setGeoData(data))
            .catch((err) => console.error("Error loading GeoJSON:", err));

        // Fix missing marker icons for Leaflet in Next.js
        if (typeof window !== "undefined") {
            import("leaflet").then((L) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete (L.Icon.Default.prototype as any)._getIconUrl;

                L.Icon.Default.mergeOptions({
                    iconRetinaUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                    iconUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                    shadowUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                });
            });
        }
    }, []);

    if (!geoData) {
        return (
            <div
                className={`w-full ${height} bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center`}
            >
                <span className="text-zinc-400">Loading Map...</span>
            </div>
        );
    }

    // Define bounds for Ghana
    const bounds: [[number, number], [number, number]] = [
        [4.63, -3.3], // Southwest
        [11.17, 1.2], // Northeast
    ];

    return (
        <div className={`w-full ${height} bg-zinc-100 rounded-2xl overflow-hidden`}>
            <MapContainer
                bounds={bounds}
                zoomControl={false}
                scrollWheelZoom={false}
                className="h-full w-full"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" // Clean, modern basemap
                />
                <GeoJSON
                    data={geoData}
                    style={() => ({
                        fillColor: "#3b82f6", // tailwind blue-500
                        weight: 2,
                        opacity: 1,
                        color: "white",
                        dashArray: "3",
                        fillOpacity: 0.1,
                    })}
                    onEachFeature={(feature, layer) => {
                        const regionName = feature.properties?.name || "Unknown Region";
                        layer.bindTooltip(regionName, {
                            permanent: false,
                            direction: "center",
                            className: "bg-white/90 px-2 py-1 rounded shadow-sm text-sm font-medium",
                        });

                        layer.on({
                            mouseover: (e) => {
                                const target = e.target;
                                target.setStyle({
                                    fillOpacity: 0.3,
                                    weight: 3,
                                });
                                target.bringToFront();
                            },
                            mouseout: (e) => {
                                const target = e.target;
                                target.setStyle({
                                    fillOpacity: 0.1,
                                    weight: 2,
                                });
                            },
                            click: () => {
                                if (onRegionSelect) {
                                    onRegionSelect(feature.properties?.code || regionName);
                                }
                            },
                        });
                    }}
                />
            </MapContainer>
        </div>
    );
}
