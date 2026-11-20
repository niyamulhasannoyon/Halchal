'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Map as MapLibreMap, NavigationControl, AttributionControl, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

if (typeof window !== 'undefined') {
  try {
    setWorkerUrl('/maplibre-gl-worker.js');
  } catch {}
}
import * as h3 from 'h3-js';
import {
  DHAKA_SEED_ZONES,
  getZoneMetadata,
  getH3GeoJsonBoundary,
  SeedZone,
} from '@/lib/zones';
import { UtilityCategory, ZoneDisplayState } from '@/lib/theme';
import { StateBadge } from './StateBadge';
import Link from 'next/link';

interface MapLibreViewProps {
  initialCenterH3?: string;
  onZoneSelect?: (h3Index: string) => void;
}

// Tactical Dark Theme Tile Style (CartoDB Dark Matter GL - No tile.openstreetmap.org violation)
const DEFAULT_DARK_MAP_STYLE =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ||
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

const STATE_COLORS: Record<ZoneDisplayState, string> = {
  ok: '#10B981',
  low: '#F59E0B',
  out: '#EF4444',
  unverified: '#94A3B8',
  unknown: '#334155',
};

export default function MapLibreView({
  initialCenterH3 = DHAKA_SEED_ZONES[0].h3_index,
  onZoneSelect,
}: MapLibreViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  const [activeCategory, setActiveCategory] = useState<UtilityCategory>('electricity');
  const [selectedHex, setSelectedHex] = useState<{
    h3_index: string;
    area_name: string;
    state: ZoneDisplayState;
  } | null>(null);

  const [userCenterH3, setUserCenterH3] = useState<string>(initialCenterH3);

  // Initialize MapLibre
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const centerMeta = getZoneMetadata(userCenterH3) || DHAKA_SEED_ZONES[0];

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: DEFAULT_DARK_MAP_STYLE,
      center: [centerMeta.lng, centerMeta.lat],
      zoom: 12.8,
      minZoom: 10,
      maxZoom: 17,
      attributionControl: false,
    });

    map.addControl(
      new AttributionControl({ compact: true }),
      'bottom-right'
    );
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      // Generate gridDisk k=3 around center H3
      const diskCells = h3.gridDisk(userCenterH3, 3);

      const features: GeoJSON.Feature[] = diskCells.map((cell, idx) => {
        const meta = getZoneMetadata(cell);
        const name = meta?.area_name_bn || `জোন ${cell.slice(-4)}`;

        // Simulated distribution for visual verification across the 37 cells
        let state: ZoneDisplayState = 'ok';
        if (idx % 7 === 1) state = 'out';
        else if (idx % 5 === 2) state = 'low';
        else if (idx % 4 === 3) state = 'unverified';
        else if (idx % 6 === 0) state = 'unknown';

        const color = STATE_COLORS[state];
        const coordinates = [getH3GeoJsonBoundary(cell)];

        return {
          type: 'Feature',
          id: cell,
          properties: {
            h3_index: cell,
            name,
            state,
            color,
          },
          geometry: {
            type: 'Polygon',
            coordinates,
          },
        };
      });

      const geojsonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features,
      };

      map.addSource('h3-hexagons', {
        type: 'geojson',
        data: geojsonData,
      });

      // Fill Layer
      map.addLayer({
        id: 'h3-hex-fill',
        type: 'fill',
        source: 'h3-hexagons',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.45,
        },
      });

      // Border Outline Layer
      map.addLayer({
        id: 'h3-hex-line',
        type: 'line',
        source: 'h3-hexagons',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
        },
      });

      // Text Labels
      map.addLayer({
        id: 'h3-hex-labels',
        type: 'symbol',
        source: 'h3-hexagons',
        layout: {
          'text-field': ['get', 'name'],
          'text-size': 11,
          'text-font': ['Open Sans Semibold'],
          'text-anchor': 'center',
          'text-offset': [0, 0],
        },
        paint: {
          'text-color': '#F8FAFC',
          'text-halo-color': '#070A0F',
          'text-halo-width': 2,
        },
      });

      // Click on Hexagon
      map.on('click', 'h3-hex-fill', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const props = feature.properties as {
          h3_index: string;
          name: string;
          state: ZoneDisplayState;
        };

        setSelectedHex({
          h3_index: props.h3_index,
          area_name: props.name,
          state: props.state,
        });

        onZoneSelect?.(props.h3_index);
      });

      // Pointer Cursor on hover
      map.on('mouseenter', 'h3-hex-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'h3-hex-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [userCenterH3, onZoneSelect]);

  // Handle locate me button
  const handleLocateMe = () => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const newH3 = h3.latLngToCell(lat, lng, 8);
          setUserCenterH3(newH3);
          if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 13.5 });
          }
        },
        (err) => {
          console.warn('GPS locate error:', err);
        }
      );
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-65px)] bg-[#070A0F] overflow-hidden">
      {/* Category Filter Pills (Top) */}
      <div className="absolute top-4 left-4 right-4 z-20 max-w-md mx-auto flex items-center justify-between p-1 rounded-2xl bg-[var(--surface-bg)]/90 backdrop-blur-md border border-[var(--surface-border)] shadow-lg">
        <button
          type="button"
          onClick={() => setActiveCategory('electricity')}
          className={`flex-1 py-1.5 px-2 rounded-xl font-bengali font-bold text-xs transition-colors cursor-pointer text-center ${
            activeCategory === 'electricity'
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/40'
              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          ⚡ বিদ্যুৎ
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('gas')}
          className={`flex-1 py-1.5 px-2 rounded-xl font-bengali font-bold text-xs transition-colors cursor-pointer text-center ${
            activeCategory === 'gas'
              ? 'bg-orange-500/20 text-orange-500 border border-orange-500/40'
              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          🔥 গ্যাস
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('water')}
          className={`flex-1 py-1.5 px-2 rounded-xl font-bengali font-bold text-xs transition-colors cursor-pointer text-center ${
            activeCategory === 'water'
              ? 'bg-blue-500/20 text-blue-500 border border-blue-500/40'
              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          💧 পানি
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('lpg')}
          className={`flex-1 py-1.5 px-2 rounded-xl font-bengali font-bold text-xs transition-colors cursor-pointer text-center ${
            activeCategory === 'lpg'
              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/40'
              : 'text-[var(--text-sub)] hover:text-[var(--text-main)]'
          }`}
        >
          🛢️ এলপিজি
        </button>
      </div>

      {/* Locate Me Floating Button */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute top-20 right-4 z-20 p-3 rounded-2xl bg-[var(--surface-bg)]/95 border border-[var(--surface-border)] text-emerald-500 shadow-xl cursor-pointer hover:bg-[var(--surface-elevated)] transition-all"
        title="আমার অবস্থান শনাক্ত করুন"
        aria-label="আমার অবস্থান শনাক্ত করুন"
      >
        🎯
      </button>

      {/* MapLibre Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Selected Hex Bottom Drawer */}
      {selectedHex && (
        <div className="absolute bottom-6 left-4 right-4 z-20 max-w-md mx-auto p-4 rounded-3xl bg-[var(--surface-bg)] border border-[var(--surface-border)] shadow-2xl animate-in slide-in-from-bottom duration-150">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📍</span>
              <div>
                <h3 className="font-bengali font-bold text-lg text-[var(--text-main)] leading-tight">
                  {selectedHex.area_name}
                </h3>
                <p className="font-bengali text-xs text-[var(--text-sub)]">
                  H3 Res 8 জোন: {selectedHex.h3_index.slice(0, 10)}...
                </p>
              </div>
            </div>
            <StateBadge state={selectedHex.state} size="sm" />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[var(--surface-border)]/60">
            <Link
              href={`/z/${selectedHex.h3_index}`}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bengali font-bold text-sm text-center shadow-md transition-colors"
            >
              এই এলাকার বিস্তারিত হালচাল দেখুন ➜
            </Link>
            <button
              type="button"
              onClick={() => setSelectedHex(null)}
              className="p-2.5 rounded-xl text-[var(--text-sub)] hover:text-[var(--text-main)] hover:bg-[var(--surface-elevated)]"
              aria-label="বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
