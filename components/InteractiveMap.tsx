"use client";

import { useEffect, useRef, useState } from "react";
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
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);

const MapController = dynamic(
    () => import("./MapController"),
    { ssr: false }
);

interface MapMarker {
    lat: number;
    lng: number;
    label?: string;
}

interface InteractiveMapProps {
    onRegionSelect?: (regionCode: string) => void;
    height?: string;
    geoJsonUrl?: string;
    highlightFeatureName?: string;
    fitToFeatureName?: string;
    markers?: MapMarker[];
}

export default function InteractiveMap({
    onRegionSelect,
    height = "h-[500px]",
    geoJsonUrl = "/json/gh.json",
    highlightFeatureName,
    fitToFeatureName,
    markers,
}: InteractiveMapProps) {
    const [geoData, setGeoData] = useState<any>(null);
    const layerRefs = useRef<Record<string, any>>({});

    useEffect(() => {
        // Clear layer refs when geoData changes
        layerRefs.current = {};
    }, [geoData]);

    // Apply highlight styles when highlightFeatureName changes
    useEffect(() => {
        if (!geoData) return;
        Object.entries(layerRefs.current).forEach(([name, layer]) => {
            if (!layer || typeof layer.setStyle !== "function") return;
            const isHighlighted = name === highlightFeatureName;
            layer.setStyle({
                fillColor: isHighlighted ? "#2563eb" : "#3b82f6",
                weight: isHighlighted ? 3 : 2,
                fillOpacity: isHighlighted ? 0.4 : 0.1,
            });
        });
    }, [highlightFeatureName, geoData]);

    useEffect(() => {
        fetch(geoJsonUrl)
            .then((res) => res.json())
            .then((data) => setGeoData(data))
            .catch((err) => console.error("Error loading GeoJSON:", err));

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
    }, [geoJsonUrl]);

    if (!geoData) {
        return (
            <div
                className={`w-full ${height} bg-zinc-100 animate-pulse rounded-2xl flex items-center justify-center`}
            >
                <span className="text-zinc-400">Loading Map...</span>
            </div>
        );
    }

    const bounds: [[number, number], [number, number]] = [
        [4.63, -3.3],
        [11.17, 1.2],
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
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                />
                <GeoJSON
                    data={geoData}
                    style={(feature) => {
                        const name = feature?.properties?.name;
                        const isHighlighted = name === highlightFeatureName;
                        return {
                            fillColor: isHighlighted ? "#2563eb" : "#3b82f6",
                            weight: isHighlighted ? 3 : 2,
                            opacity: 1,
                            color: "white",
                            dashArray: "3",
                            fillOpacity: isHighlighted ? 0.4 : 0.1,
                        };
                    }}
                    onEachFeature={(feature, layer) => {
                        const regionName = feature.properties?.name || "Unknown Region";
                        if (regionName) {
                            layerRefs.current[regionName] = layer;
                        }
                        layer.bindTooltip(regionName, {
                            permanent: false,
                            direction: "center",
                            className: "bg-white/90 px-2 py-1 rounded shadow-sm text-sm font-medium",
                        });

                        layer.on({
                            mouseover: (e) => {
                                const target = e.target;
                                // Only apply hover if not the highlighted feature
                                if (regionName !== highlightFeatureName) {
                                    target.setStyle({
                                        fillOpacity: 0.3,
                                        weight: 3,
                                    });
                                    target.bringToFront();
                                }
                            },
                            mouseout: (e) => {
                                const target = e.target;
                                if (regionName !== highlightFeatureName) {
                                    target.setStyle({
                                        fillOpacity: 0.1,
                                        weight: 2,
                                    });
                                } else {
                                    target.setStyle({
                                        fillOpacity: 0.4,
                                        weight: 3,
                                    });
                                }
                            },
                            click: () => {
                                if (onRegionSelect) {
                                    onRegionSelect(feature.properties?.code || regionName);
                                }
                            },
                        });
                    }}
                />
                {markers?.map((m) => (
                    <Marker key={`${m.lat}-${m.lng}`} position={[m.lat, m.lng]}>
                        <Popup>{m.label || "Property"}</Popup>
                    </Marker>
                ))}
                <MapController
                    fitToFeatureName={fitToFeatureName}
                    layerRefs={layerRefs}
                />
            </MapContainer>
        </div>
    );
}
