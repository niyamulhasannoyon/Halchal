/**
 * Halchal (হালচাল) - Home-Zone Gate Module
 * Replaces weak "within 750m" radius checks with Uber H3 Res 8 GridDisk(k=1).
 *
 * Rules:
 * 1. A citizen may report ONLY for their designated home cell or its 6 immediate neighbors (gridDisk k=1).
 * 2. If the user profile has no home_h3, set it to this cell.
 * 3. Changing home zone is permitted AT MOST once every 7 days (move house / travel is rare).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { isWithinHomeZone } from './h3.ts';
import { Errors } from './errors.ts';

export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface HomeZoneCheckResult {
  allowed: boolean;
  homeH3: string;
  isNewHome?: boolean;
  homeChanged?: boolean;
}

export interface IProfileStore {
  getProfile(userId: string): Promise<{ home_h3: string | null; home_h3_changed_at: string | null } | null>;
  setHomeZone(userId: string, homeH3: string, changedAt: string): Promise<void>;
}

export class SupabaseProfileStore implements IProfileStore {
  constructor(private supabase: SupabaseClient) {}

  async getProfile(userId: string): Promise<{ home_h3: string | null; home_h3_changed_at: string | null } | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('home_h3, home_h3_changed_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user profile:', error);
      throw Errors.INTERNAL_ERROR('প্রোফাইল লোড করতে সমস্যা হয়েছে');
    }

    return data;
  }

  async setHomeZone(userId: string, homeH3: string, changedAt: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .upsert({
        id: userId,
        home_h3: homeH3,
        home_h3_changed_at: changedAt,
        updated_at: changedAt,
      }, { onConflict: 'id' });

    if (error) {
      console.error('Error updating user home zone:', error);
      throw Errors.INTERNAL_ERROR('এলাকা সংরক্ষণ করতে সমস্যা হয়েছে');
    }
  }
}

/**
 * In-Memory Profile Store for Unit and Abuse Tests
 */
export class InMemoryProfileStore implements IProfileStore {
  private profiles = new Map<string, { home_h3: string | null; home_h3_changed_at: string | null }>();

  async getProfile(userId: string): Promise<{ home_h3: string | null; home_h3_changed_at: string | null } | null> {
    return this.profiles.get(userId) || null;
  }

  async setHomeZone(userId: string, homeH3: string, changedAt: string): Promise<void> {
    const existing = this.profiles.get(userId) || { home_h3: null, home_h3_changed_at: null };
    this.profiles.set(userId, {
      ...existing,
      home_h3: homeH3,
      home_h3_changed_at: changedAt,
    });
  }

  setInitialProfile(userId: string, homeH3: string | null, changedAt: string | null): void {
    this.profiles.set(userId, { home_h3: homeH3, home_h3_changed_at: changedAt });
  }
}

/**
 * Enforces the Home-Zone Gate
 */
export async function enforceHomeZoneGate(
  store: IProfileStore,
  userId: string,
  reportedH3: string,
  updateHomeRequested = false,
  now = new Date()
): Promise<HomeZoneCheckResult> {
  const profile = await store.getProfile(userId);
  const nowIso = now.toISOString();

  // Case 1: First time reporting or profile has no home_h3
  if (!profile || !profile.home_h3) {
    await store.setHomeZone(userId, reportedH3, nowIso);
    return {
      allowed: true,
      homeH3: reportedH3,
      isNewHome: true,
    };
  }

  const currentHome = profile.home_h3;

  // Case 2: Reported cell is home cell or one of the 6 adjacent ring-1 neighbors
  if (isWithinHomeZone(currentHome, reportedH3)) {
    return {
      allowed: true,
      homeH3: currentHome,
    };
  }

  // Case 3: Reported cell is outside the home zone cluster
  const lastChanged = profile.home_h3_changed_at ? new Date(profile.home_h3_changed_at).getTime() : 0;
  const elapsedMs = now.getTime() - lastChanged;

  if (elapsedMs >= SEVEN_DAYS_MS) {
    // 7 days have passed: allow changing home zone
    await store.setHomeZone(userId, reportedH3, nowIso);
    return {
      allowed: true,
      homeH3: reportedH3,
      homeChanged: true,
    };
  }

  // Less than 7 days have passed: reject with 403 HOME_ZONE_LOCKED
  const daysRemaining = Math.max(1, Math.ceil((SEVEN_DAYS_MS - elapsedMs) / (24 * 60 * 60 * 1000)));

  throw Errors.HOME_ZONE_LOCKED({
    home_h3: currentHome,
    reported_h3: reportedH3,
    days_remaining: daysRemaining,
  });
}
