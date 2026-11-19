/**
 * Halchal (হালচাল) - H3 Res 8 Spatial Computation & Strict Coordinate Scrubbing
 * Architecture: ADR-0001 (Uber H3 Res 8), ADR-0005 (Zero Raw GPS Storage)
 */

import { latLngToCell, gridDisk, areNeighborCells } from 'h3-js';
import { SubmitReportRequest, SanitizedReportPayload } from './types.ts';

export const H3_RESOLUTION = 8;

/**
 * Computes the Uber H3 Resolution 8 cell index from latitude and longitude.
 */
export function computeH3Cell(lat: number, lng: number): string {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Retrieves the neighborhood of cells for home-zone gating.
 * k=1 returns 7 cells (center cell + 6 adjacent ring-1 neighbors).
 */
export function getHomeZoneCluster(homeH3: string): string[] {
  return gridDisk(homeH3, 1);
}

/**
 * Checks if a candidate cell is within the home zone cluster (home cell or ring-1 neighbor).
 */
export function isWithinHomeZone(homeH3: string, candidateH3: string): boolean {
  if (homeH3 === candidateH3) return true;
  const cluster = getHomeZoneCluster(homeH3);
  return cluster.includes(candidateH3);
}

/**
 * STRICT PRIVACY GATEWAY:
 * Converts raw coordinates to an H3 index and completely SCRUBS lat/lng from memory.
 * Under no circumstances should lat or lng ever be logged or stored.
 */
export function scrubCoordinatesAndIndex(payload: SubmitReportRequest): {
  h3_index: string;
  sanitized: SanitizedReportPayload;
} {
  const h3_index = computeH3Cell(payload.lat, payload.lng);

  const sanitized: SanitizedReportPayload = {
    h3_index,
    category: payload.category,
    state: payload.state,
    price_bdt: payload.category === 'lpg' ? (payload.price_bdt ?? null) : null,
    client_ts: payload.client_ts,
    device_id: payload.device_id,
    update_home: payload.update_home,
  };

  // Explicitly do not return or retain lat, lng, or accuracy_m
  return { h3_index, sanitized };
}
