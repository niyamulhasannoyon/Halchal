import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DHAKA_SEED_ZONES,
  isValidH3Zone,
  getZoneMetadata,
  findNearestZone,
  createDefaultZoneStatus,
} from './zones';
import { latLngToH3, getH3GeoJsonBoundary } from './h3-spatial';

describe('Halchal Zones and H3 Spatial Unit Tests', () => {
  it('contains exactly 10 authentic Dhaka seed zones', () => {
    assert.strictEqual(DHAKA_SEED_ZONES.length, 10);
  });

  it('validates authentic H3 Resolution 8 cell indexes', () => {
    assert.strictEqual(isValidH3Zone('883cf10ca1fffff'), true); // Dhanmondi
    assert.strictEqual(isValidH3Zone('883cf10eb1fffff'), true); // Mirpur 10
    assert.strictEqual(isValidH3Zone('invalid-h3-string'), false);
    assert.strictEqual(isValidH3Zone(null), false);
    assert.strictEqual(isValidH3Zone(''), false);
  });

  it('correctly retrieves seed zone metadata', () => {
    const dhanmondi = getZoneMetadata('883cf10ca1fffff');
    assert.ok(dhanmondi);
    assert.strictEqual(dhanmondi?.area_name_bn, 'ধানমন্ডি');
    assert.strictEqual(dhanmondi?.city, 'ঢাকা');
  });

  it('converts latitude and longitude to H3 Res 8', () => {
    const h3Cell = latLngToH3(23.746177, 90.373828);
    assert.strictEqual(isValidH3Zone(h3Cell), true);
  });

  it('generates valid closed GeoJSON boundary coordinates [[lng, lat], ...]', () => {
    const boundary = getH3GeoJsonBoundary('883cf10ca1fffff');
    assert.ok(boundary.length >= 7, 'Hexagon boundary must have at least 7 vertices when closed');
    const first = boundary[0];
    const last = boundary[boundary.length - 1];
    assert.strictEqual(first[0], last[0]);
    assert.strictEqual(first[1], last[1]);
  });

  it('finds the nearest seed zone by coordinates', () => {
    // Near Dhanmondi Lake
    const nearest = findNearestZone(23.745, 90.375);
    assert.strictEqual(nearest.area_name_bn, 'ধানমন্ডি');
  });

  it('creates default status response with all 4 categories initialized to unknown', () => {
    const status = createDefaultZoneStatus('883cf10ca1fffff');
    assert.strictEqual(status.h3_index, '883cf10ca1fffff');
    assert.strictEqual(status.area_name_bn, 'ধানমন্ডি');
    assert.strictEqual(status.categories.electricity.state, 'unknown');
    assert.strictEqual(status.categories.gas.state, 'unknown');
    assert.strictEqual(status.categories.water.state, 'unknown');
    assert.strictEqual(status.categories.lpg.state, 'unknown');
    assert.strictEqual(status.cache_note, 'DB reads are cached');
  });
});
