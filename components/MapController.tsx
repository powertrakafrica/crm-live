"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";

interface MapControllerProps {
    fitToFeatureName?: string;
    layerRefs: React.MutableRefObject<Record<string, any>>;
}

export default function MapController({ fitToFeatureName, layerRefs }: MapControllerProps) {
    const map = useMap();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!fitToFeatureName) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const tryFit = () => {
            const layer = layerRefs.current[fitToFeatureName];
            if (layer && typeof layer.getBounds === "function") {
                map.fitBounds(layer.getBounds(), { padding: [40, 40], animate: true });
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                    timerRef.current = null;
                }
            } else {
                timerRef.current = setTimeout(tryFit, 150);
            }
        };

        tryFit();

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [fitToFeatureName, map, layerRefs]);

    return null;
}
