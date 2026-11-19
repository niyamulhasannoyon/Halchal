'use client';

import React, { useState, useEffect } from 'react';
import { toBengaliDigits } from '@/lib/bengali-utils';
import {
  Activity,
  ShieldCheck,
  AlertTriangle,
  Radio,
  Server,
  Zap,
  RefreshCw,
  Lock,
  CheckCircle,
  HelpCircle,
  Database,
  Bell,
  XCircle,
} from 'lucide-react';

interface AdminMetrics {
  timestamp: string;
  pilot_area: string;
  system_status: string;
  reports: {
    last_1_minute: number;
    last_5_minutes: number;
    last_1_hour: number;
    per_minute_avg: number;
  };
  zones_by_state: Record<string, number>;
  unverified_zones_count: number;
  total_zones_seeded: number;
  push_subscribers_active: number;
  notifications_sent_24h: number;
  rejection_reasons: Record<string, number>;
  redis: {
    status: string;
    hit_rate_pct: number;
    hits: number;
    misses: number;
  };
  edge_function_latency: {
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
    threshold_ms: number;
    status: string;
  };
  alert_thresholds: {
    error_rate_5xx_ceiling: string;
    edge_p95_latency_ceiling: string;
    redis_hit_rate_floor: string;
  };
}

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('halchal_admin_key');
    if (saved) {
      setAdminKey(saved);
      fetchMetrics(saved);
    }
  }, []);

  const fetchMetrics = async (keyToUse: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/metrics', {
        headers: {
          'x-admin-key': keyToUse,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMsg('অ্যাডমিন কী সঠিক নয় বা মেয়াদোত্তীর্ণ।');
          setIsAuthenticated(false);
        } else {
          setErrorMsg('মেট্রিক্স লোড করতে সমস্যা হয়েছে।');
        }
        return;
      }

      const data = await res.json();
      setMetrics(data);
      setIsAuthenticated(true);
      localStorage.setItem('halchal_admin_key', keyToUse);
    } catch {
      setErrorMsg('সার্ভারের সাথে সংযোগ স্থাপন করা যায়নি।');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey.trim()) return;
    fetchMetrics(adminKey.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem('halchal_admin_key');
    setAdminKey('');
    setIsAuthenticated(false);
    setMetrics(null);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-canvas text-text-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-surface border border-surface-border rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">হালচাল SRE ড্যাশবোর্ড</h1>
              <p className="text-xs text-text-muted">সার্ভিস রোল / অ্যাডমিন প্রবেশাধিকার প্রয়োজন</p>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="adminKey" className="block text-xs font-medium text-text-muted mb-1.5">
                অ্যাডমিন এপিআই কী (ADMIN_API_KEY)
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="গোপন কী প্রবেশ করান..."
                className="w-full px-3.5 py-2.5 bg-canvas border border-surface-border rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>যাচাই হচ্ছে...</span>
                </>
              ) : (
                <span>ড্যাশবোর্ডে প্রবেশ করুন</span>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas text-text-primary p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-surface-border">
          <div>
            <div className="flex items-center gap-2.5">
              <Activity className="w-6 h-6 text-emerald-500" />
              <h1 className="text-2xl font-bold">হালচাল পাইলট SRE অবজার্ভেবিলিটি ড্যাশবোর্ড</h1>
            </div>
            <p className="text-xs text-text-muted mt-1">
              পাইলট এলাকা: <strong className="text-emerald-400">{metrics?.pilot_area}</strong> •
              সিস্টেম স্ট্যাটাস: <span className="text-emerald-400 font-bold">{metrics?.system_status}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchMetrics(adminKey)}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-surface border border-surface-border text-xs font-medium hover:bg-surface/80 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>রিফ্রেশ</span>
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              লগআউট
            </button>
          </div>
        </header>

        {metrics && (
          <>
            {/* Top Stat Cards: Reports / Rate / Subscribers / Latency */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Reports Rate */}
              <div className="bg-surface border border-surface-border rounded-2xl p-4">
                <div className="flex items-center justify-between text-text-muted mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">রিপোর্ট রেট</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl font-bold">
                  {toBengaliDigits(metrics.reports.last_1_minute)}{' '}
                  <span className="text-xs font-normal text-text-muted">/ মিনিট</span>
                </div>
                <div className="text-xs text-text-muted mt-1">
                  ৫ মিনিটের গড়: {toBengaliDigits(metrics.reports.per_minute_avg)} / মিনিট
                </div>
              </div>

              {/* Redis Hit Rate */}
              <div className="bg-surface border border-surface-border rounded-2xl p-4">
                <div className="flex items-center justify-between text-text-muted mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Redis ক্যাশ হিট</span>
                  <Database className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-2xl font-bold text-emerald-400">
                  {toBengaliDigits(metrics.redis.hit_rate_pct)}%
                </div>
                <div className="text-xs text-text-muted mt-1">
                  টার্গেট ফ্লোর: {metrics.alert_thresholds.redis_hit_rate_floor}
                </div>
              </div>

              {/* Edge Latency */}
              <div className="bg-surface border border-surface-border rounded-2xl p-4">
                <div className="flex items-center justify-between text-text-muted mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">Edge ল্যাটেন্সি (p95)</span>
                  <Server className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">
                  {toBengaliDigits(metrics.edge_function_latency.p95_ms)}{' '}
                  <span className="text-xs font-normal text-text-muted">ms</span>
                </div>
                <div className="text-xs text-emerald-400 mt-1">
                  সতর্কতা সিলিং: {metrics.alert_thresholds.edge_p95_latency_ceiling}
                </div>
              </div>

              {/* Unverified Zones Alert */}
              <div className="bg-surface border border-surface-border rounded-2xl p-4">
                <div className="flex items-center justify-between text-text-muted mb-2">
                  <span className="text-xs font-medium uppercase tracking-wider">অনিশ্চিত এলাকা</span>
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-400">
                  {toBengaliDigits(metrics.unverified_zones_count)}
                </div>
                <div className="text-xs text-text-muted mt-1">
                  কনসেনসাস পেন্ডিং (distinct &lt; ৩)
                </div>
              </div>
            </div>

            {/* Grid 2: Zones by State & Rejection Reasons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Zones by State */}
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-500" />
                    <span>এলাকার কনসেনসাস অবস্থা (Zones by State)</span>
                  </h2>
                  <span className="text-xs text-text-muted">
                    মোট সিডেড হেক্সাগন: {toBengaliDigits(metrics.total_zones_seeded)}টি
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-emerald-500/20">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">স্বাভাবিক / সচল (ok)</span>
                    </div>
                    <span className="text-base font-bold text-emerald-400">
                      {toBengaliDigits(metrics.zones_by_state.ok || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-amber-500/20">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">স্বল্প / সমস্যা (low)</span>
                    </div>
                    <span className="text-base font-bold text-amber-400">
                      {toBengaliDigits(metrics.zones_by_state.low || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-red-500/20">
                    <div className="flex items-center gap-2.5">
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">সংযোগ বিচ্ছিন্ন / বন্ধ (out)</span>
                    </div>
                    <span className="text-base font-bold text-red-400">
                      {toBengaliDigits(metrics.zones_by_state.out || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-dashed border-zinc-600">
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium">অনিশ্চিত (unverified)</span>
                    </div>
                    <span className="text-base font-bold text-zinc-300">
                      {toBengaliDigits(metrics.zones_by_state.unverified || 0)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-dotted border-zinc-700">
                    <div className="flex items-center gap-2.5">
                      <span className="w-3 h-3 rounded-full border border-zinc-500" />
                      <span className="text-sm font-medium text-text-muted">তথ্য নেই (unknown)</span>
                    </div>
                    <span className="text-base font-bold text-text-muted">
                      {toBengaliDigits(metrics.zones_by_state.unknown || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rejection Reasons & Anti-Abuse */}
              <div className="bg-surface border border-surface-border rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <span>প্রতিরোধ ও প্রত্যাখ্যানের কারণ (Rejection Reasons)</span>
                  </h2>
                  <span className="text-xs text-text-muted">গত ২৪ ঘণ্টায়</span>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(metrics.rejection_reasons).map(([reason, count]) => (
                    <div
                      key={reason}
                      className="p-3 rounded-xl bg-canvas border border-surface-border flex items-center justify-between text-xs"
                    >
                      <span className="font-mono text-text-secondary">{reason}</span>
                      <span className="px-2.5 py-1 rounded-md bg-zinc-800 text-text-primary font-bold">
                        {toBengaliDigits(count)}টি
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-500" />
                    পুশ সতর্কতা প্রেরণ (২৪ ঘণ্টা):{' '}
                    <strong className="text-text-primary">
                      {toBengaliDigits(metrics.notifications_sent_24h)}
                    </strong>
                  </span>
                  <span>
                    গ্রাহক সংখ্যা:{' '}
                    <strong className="text-text-primary">
                      {toBengaliDigits(metrics.push_subscribers_active)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Alert Thresholds Card */}
            <div className="p-4 rounded-2xl bg-surface border border-surface-border text-xs text-text-muted flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <strong className="text-text-primary block font-medium">SRE এলার্ট থ্রেশহোল্ড রুলস:</strong>
                <span>
                  • 5xx এরর রেট &gt; ২.০% (৫ মিনিট উইন্ডো) • Edge ল্যাটেন্সি p95 &gt; ৮০০ms • Redis হিট রেট &lt; ৮০%
                </span>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium shrink-0">
                সব সূচক স্বাভাবিক
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
