import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TraineeReport, JammingZone, Participant } from '@degrade/shared';

export interface TacticalMapProps {
  center?: [number, number]; // [lon, lat]
  zoom?: number;
  reports?: TraineeReport[];
  jammingZones?: JammingZone[];
  participants?: Participant[];
  myPosition?: { lat: number; lon: number } | null;
  onMapClick?: (coords: { lat: number; lon: number }) => void;
  selectedReportId?: number | null;
  onSelectReport?: (report: TraineeReport) => void;
  isInstructor?: boolean;
  className?: string;
}

const CARTO_POSITRON = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
const CARTO_DARK_MATTER = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

export const TacticalMap: React.FC<TacticalMapProps> = ({
  center = [81.8463, 25.4358], // Default Prayagraj [lon, lat]
  zoom = 11,
  reports = [],
  jammingZones = [],
  participants = [],
  myPosition,
  onMapClick,
  selectedReportId,
  onSelectReport,
  isInstructor = false,
  className = '',
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<{ [key: string]: maplibregl.Marker }>({});
  const zoneLayersRef = useRef<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
  });

const FALLBACK_RASTER_STYLE: any = {
  version: 8,
  sources: {
    'osm-tiles': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap',
    },
  },
  layers: [
    {
      id: 'osm-tiles',
      type: 'raster',
      source: 'osm-tiles',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

  // Watch theme changes to swap map style
  useEffect(() => {
    const handleThemeChange = (e: any) => {
      const nextTheme = e.detail || (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') || 'light';
      setCurrentTheme(nextTheme);
      if (map.current) {
        try {
          map.current.setStyle(nextTheme === 'dark' ? CARTO_DARK_MATTER : CARTO_POSITRON);
        } catch (_) {}
      }
    };

    window.addEventListener('degrade-theme-changed', handleThemeChange);
    return () => window.removeEventListener('degrade-theme-changed', handleThemeChange);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initialStyle = currentTheme === 'dark' ? CARTO_DARK_MATTER : CARTO_POSITRON;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: initialStyle,
      center: center,
      zoom: zoom,
      attributionControl: false,
    });
    map.current = m;

    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    m.on('error', (e) => {
      if (e && e.error && (e.error.message?.includes('style') || (e.error as any).status >= 400)) {
        try {
          m.setStyle(FALLBACK_RASTER_STYLE);
        } catch (_) {}
      }
    });

    m.on('load', () => {
      m.resize();
    });

    m.on('click', (e) => {
      if (onMapClick) {
        onMapClick({ lat: Number(e.lngLat.lat.toFixed(5)), lon: Number(e.lngLat.lng.toFixed(5)) });
      }
    });

    // ResizeObserver ensures canvas always recalculates when flex layout sizes change
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
      resizeObserver = new ResizeObserver(() => {
        m.resize();
      });
      resizeObserver.observe(mapContainer.current);
    }

    const t1 = setTimeout(() => m.resize(), 150);
    const t2 = setTimeout(() => m.resize(), 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver?.disconnect();
      m.remove();
      map.current = null;
    };
  }, []);

  // Render/Update Jamming Zones
  useEffect(() => {
    if (!map.current) return;
    const m = map.current;

    const updateZones = () => {
      // Remove old zone layers/sources
      zoneLayersRef.current.forEach((id) => {
        if (m.getLayer(id)) m.removeLayer(id);
        if (m.getLayer(`${id}-outline`)) m.removeLayer(`${id}-outline`);
        if (m.getSource(id)) m.removeSource(id);
      });
      zoneLayersRef.current = [];

      jammingZones.filter(z => z.active).forEach((zone) => {
        const sourceId = `jam-zone-${zone.id}`;
        // Create circle polygon GeoJSON
        const points = 64;
        const coords = [];
        const km = zone.radius_m / 1000;
        const distanceX = km / (111.32 * Math.cos((zone.lat * Math.PI) / 180));
        const distanceY = km / 110.574;

        for (let i = 0; i < points; i++) {
          const theta = (i / points) * (2 * Math.PI);
          const x = distanceX * Math.cos(theta);
          const y = distanceY * Math.sin(theta);
          coords.push([zone.lon + x, zone.lat + y]);
        }
        coords.push(coords[0]);

        if (!m.getSource(sourceId)) {
          m.addSource(sourceId, {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: { type: 'Polygon', coordinates: [coords] },
              properties: { intensity: zone.intensity },
            },
          });

          m.addLayer({
            id: sourceId,
            type: 'fill',
            source: sourceId,
            paint: {
              'fill-color': '#C4574A',
              'fill-opacity': Math.min(0.35, 0.15 + zone.intensity * 0.2),
            },
          });

          m.addLayer({
            id: `${sourceId}-outline`,
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#C4574A',
              'line-width': 1.5,
              'line-dasharray': [3, 2],
            },
          });

          zoneLayersRef.current.push(sourceId);
        }
      });
    };

    if (m.isStyleLoaded()) {
      updateZones();
    } else {
      m.once('styledata', updateZones);
    }
  }, [jammingZones, currentTheme]);

  // Render/Update Report Markers with Ghosting & Confidence Styles
  useEffect(() => {
    if (!map.current) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.remove());
    markersRef.current = {};

    const now = Date.now();

    reports.forEach((report) => {
      const lat = report.payload.lat;
      const lon = report.payload.lon;
      if (lat === undefined || lon === undefined) return;

      // Age calculation for smooth ghosting:
      // Ghosting starts fading and after 180s (3min) is at 0.25 opacity
      const deliveredTime = report.delivered_at ? new Date(report.delivered_at).getTime() : now;
      const ageSec = Math.max(0, (now - deliveredTime) / 1000);
      const ghostOpacity = Math.max(0.25, 1.0 - (ageSec / 180) * 0.75);

      const el = document.createElement('div');
      el.className = 'tactical-marker cursor-pointer transition-all duration-300';
      el.style.opacity = String(ghostOpacity);

      // Marker shape based on confidence:
      // CONFIRMED = solid circle with solid border
      // PROBABLE = dashed border ring
      // UNVERIFIED = hollow with question mark
      let innerHtml = '';
      const isSelected = selectedReportId === report.id;
      const selectedRing = isSelected ? 'ring-4 ring-primary shadow-lg scale-110' : '';

      if (report.confidence === 'CONFIRMED') {
        innerHtml = `
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-success text-white shadow-md border-2 border-white dark:border-surface ${selectedRing}">
            <div class="w-2 h-2 rounded-full bg-white animate-ping opacity-60"></div>
          </div>
        `;
      } else if (report.confidence === 'PROBABLE') {
        innerHtml = `
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-warning/20 text-warning border-2 border-dashed border-warning shadow-md backdrop-blur-sm ${selectedRing}">
            <div class="w-2.5 h-2.5 rounded-full bg-warning"></div>
          </div>
        `;
      } else {
        // UNVERIFIED
        innerHtml = `
          <div class="relative flex items-center justify-center w-7 h-7 rounded-full bg-danger/15 text-danger border-2 border-danger shadow-md backdrop-blur-sm font-mono text-xs font-bold ${selectedRing}">
            ?
          </div>
        `;
      }

      el.innerHTML = innerHtml;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectReport?.(report);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map.current!);

      markersRef.current[`report-${report.id}`] = marker;
    });

    // Render my position marker if set
    if (myPosition) {
      const myEl = document.createElement('div');
      myEl.className = 'w-5 h-5 rounded-full bg-primary border-2 border-white dark:border-surface shadow-md ring-2 ring-primary/40';
      const myMarker = new maplibregl.Marker({ element: myEl })
        .setLngLat([myPosition.lon, myPosition.lat])
        .addTo(map.current);
      markersRef.current['my-position'] = myMarker;
    }

    // Render participants markers (for instructor)
    if (isInstructor) {
      participants.forEach((p) => {
        if (p.lat && p.lon) {
          const pEl = document.createElement('div');
          pEl.className = 'flex flex-col items-center cursor-pointer';
          pEl.innerHTML = `
            <div class="px-1.5 py-0.5 rounded-chip bg-surface border border-border text-[10px] font-mono text-fg shadow-sm">
              ${p.role}
            </div>
            <div class="w-3 h-3 rounded-full bg-accent border border-white -mt-0.5 shadow-sm"></div>
          `;
          const pMarker = new maplibregl.Marker({ element: pEl })
            .setLngLat([p.lon, p.lat])
            .addTo(map.current!);
          markersRef.current[`p-${p.id}`] = pMarker;
        }
      });
    }
  }, [reports, jammingZones, participants, myPosition, selectedReportId, currentTheme]);

  return (
    <div className={`relative w-full h-full min-h-[350px] overflow-hidden rounded-card border border-border ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      {/* Map legend strip */}
      <div className="absolute bottom-2 left-2 z-10 flex items-center gap-3 px-3 py-1.5 rounded-chip bg-surface/90 backdrop-blur-md border border-border text-[11px] font-mono shadow-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-success" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-dashed border-warning bg-warning/30" /> Probable
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-danger text-danger text-[9px] flex items-center justify-center font-bold">?</span> Unverified
        </span>
        {jammingZones.some(z => z.active) && (
          <span className="flex items-center gap-1.5 text-danger">
            <span className="w-2 h-2 rounded-full bg-danger/40 border border-danger" /> Jamming Active
          </span>
        )}
      </div>
    </div>
  );
};
