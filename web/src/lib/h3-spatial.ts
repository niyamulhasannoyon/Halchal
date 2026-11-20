/**
 * Halchal - H3 Spatial Calculations & Boundary Generation
 * Architecture: Isolated to avoid pulling h3-js into initial home/area client bundles.
 * Resolution: Uber H3 Res 8 (~0.74 km² area, ~460m edge length)
 */

import * as h3 from 'h3-js';

/**
 * Validates whether a string is a valid H3 Resolution 8 index
 */
export function isValidH3Zone(h3Index: string | null | undefined): boolean {
  if (!h3Index || typeof h3Index !== 'string') return false;
  try {
    return h3.isValidCell(h3Index) && h3.getResolution(h3Index) === 8;
  } catch {
    return false;
  }
}

/**
 * Converts GPS coordinates into H3 Resolution 8 cell index
 */
export function latLngToH3(lat: number, lng: number): string {
  return h3.latLngToCell(lat, lng, 8);
}

/**
 * Computes boundary coordinates in GeoJSON format `[[lng, lat], ...]`
 */
export function getH3GeoJsonBoundary(h3Index: string): [number, number][] {
  const boundary = h3.cellToBoundary(h3Index);
  // cellToBoundary returns [[lat, lng], ...], GeoJSON expects [[lng, lat], ...]
  const geoJsonCoords = boundary.map(([lat, lng]) => [lng, lat] as [number, number]);
  // Close the polygon ring if not closed
  if (geoJsonCoords.length > 0) {
    const first = geoJsonCoords[0];
    const last = geoJsonCoords[geoJsonCoords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      geoJsonCoords.push([...first]);
    }
  }
  return geoJsonCoords;
}
