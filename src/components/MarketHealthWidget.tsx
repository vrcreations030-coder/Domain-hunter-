import React, { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { RdapScanSnapshot } from '../types/domain';

export interface TldHealthMetric {
  tld: string;
  taken: number;
  available: number;
  premium: number;
  total: number;
  ratioDisplay: string;
  popularityIndex: number; // 0 to 100 based on taken / (taken + available)
}

interface MarketHealthWidgetProps {
  scanHistory: RdapScanSnapshot[];
  variant?: 'compact' | 'full';
  onOpenRadar?: () => void;
  onScanBaseline?: () => void;
  onSelectTldQuery?: (tld: string) => void;
}

type SortBy = 'index_desc' | 'index_asc' | 'volume';

function classifyMarketHealth(index: number | null): {
  label: string;
  toneClass: string;
  barClass: string;
  summary: string;
} {
  if (index === null) {
    return {
      label: 'Awaiting Scans',
      toneClass: 'text-slate-500 dark:text-zinc-400',
      barClass: 'bg-slate-400',
      summary: 'Run a domain lookup to compute live taken-to-available market ratios.'
    };
  }
  if (index >= 70) {
    return {
      label: 'High Demand · Scarce',
      toneClass: 'text-rose-600 dark:text-rose-400',
      barClass: 'bg-rose-500',
      summary: 'Most checked domains are already registered. Consider alternative TLDs or coined brand names.'
    };
  }
  if (index >= 40) {
    return {
      label: 'Healthy Balance',
      toneClass: 'text-amber-600 dark:text-amber-400',
      barClass: 'bg-amber-500',
      summary: 'Moderate competition with viable unregistered opportunities alongside established extensions.'
    };
  }
  return {
    label: 'Open Supply',
    toneClass: 'text-emerald-600 dark:text-emerald-400',
    barClass: 'bg-emerald-500',
    summary: 'Favorable buyer conditions — majority of scanned domains are open for instant registration.'
  };
}

function formatTakenAvailableRatio(taken: number, available: number): string {
  if (taken === 0 && available === 0) return '0 : 0';
  if (available === 0) return `${taken} : 0`;
  if (taken === 0) return `0 : ${available}`;
  const ratio = taken / available;
  if (ratio >= 10) return `${Math.round(ratio)} : 1`;
  return `${ratio.toFixed(1).replace(/\.0$/, '')} : 1`;
}

export const MarketHealthWidget: React.FC<MarketHealthWidgetProps> = ({
  scanHistory,
  variant = 'full',
  onOpenRadar,
  onScanBaseline,
  onSelectTldQuery
}) => {
  const [scope, setScope] = useState<'all' | 'latest'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('index_desc');

  const activeSnapshots = useMemo(() => {
    if (scanHistory.length === 0) return [];
    return scope === 'latest' ? [scanHistory[0]] : scanHistory;
  }, [scanHistory, scope]);

  const analytics = useMemo(() => {
    const tldMap = new Map<
      string,
      { taken: number; available: number; premium: number; total: number }
    >();

    let totalTaken = 0;
    let totalAvailable = 0;
    let totalPremium = 0;
    let totalEvaluated = 0;

    for (const snap of activeSnapshots) {
      for (const d of snap.domains) {
        const ext = (d.tld || d.domain.split('.').pop() || '').toLowerCase();
        if (!ext) continue;

        const curr = tldMap.get(ext) || {
          taken: 0,
          available: 0,
          premium: 0,
          total: 0
        };

        if (d.status === 'taken') {
          curr.taken += 1;
          totalTaken += 1;
        } else if (d.status === 'available' || d.status === 'hack') {
          curr.available += 1;
          totalAvailable += 1;
        } else if (d.status === 'premium') {
          curr.premium += 1;
          totalPremium += 1;
        }

        if (d.status !== 'loading' && d.status !== 'unknown') {
          curr.total += 1;
          totalEvaluated += 1;
        }

        tldMap.set(ext, curr);
      }
    }

    const strictTotal = totalTaken + totalAvailable;
    const compositeIndex =
      strictTotal > 0 ? Math.round((totalTaken / strictTotal) * 100) : null;
    const overallRatio = formatTakenAvailableRatio(totalTaken, totalAvailable);

    const tlds: TldHealthMetric[] = Array.from(tldMap.entries())
      .filter(([, counts]) => counts.taken + counts.available > 0)
      .map(([tld, counts]) => {
        const denom = counts.taken + counts.available;
        const popularityIndex = denom > 0 ? Math.round((counts.taken / denom) * 100) : 0;
        return {
          tld,
          taken: counts.taken,
          available: counts.available,
          premium: counts.premium,
          total: counts.total,
          ratioDisplay: formatTakenAvailableRatio(counts.taken, counts.available),
          popularityIndex
        };
      });

    const sorted = [...tlds].sort((a, b) => {
      if (sortBy === 'index_asc') {
        return a.popularityIndex - b.popularityIndex || b.total - a.total;
      }
      if (sortBy === 'volume') {
        return b.total - a.total || b.popularityIndex - a.popularityIndex;
      }
      return b.popularityIndex - a.popularityIndex || b.total - a.total;
    });

    const mostPopularTld =
      [...tlds].sort((a, b) => b.popularityIndex - a.popularityIndex || b.taken - a.taken)[0] ||
      null;
    const mostOpenTld =
      [...tlds].sort((a, b) => a.popularityIndex - b.popularityIndex || b.available - a.available)[0] ||
      null;

    return {
      totalTaken,
      totalAvailable,
      totalPremium,
      totalEvaluated,
      compositeIndex,
      overallRatio,
      tlds: sorted,
      mostPopularTld,
      mostOpenTld
    };
  }, [activeSnapshots, sortBy]);

  const healthMeta = classifyMarketHealth(analytics.compositeIndex);
  const displayedTlds = variant === 'compact' ? analytics.tlds.slice(0, 6) : analytics.tlds.slice(0, 14);

  return (
    <section
      aria-label="Market Health and TLD Popularity Index"
      className={
        variant === 'compact'
          ? 'max-w-3xl mx-auto mt-6 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5'
          : 'rounded-2xl bg-slate-50 dark:bg-black/45 border border-slate-200 dark:border-white/[0.07] p-5 sm:p-6'
      }
    >
      {/* Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Market Health</span>
            <span aria-hidden="true">&middot;</span>
            <span>{activeSnapshots.length} recent {activeSnapshots.length === 1 ? 'scan' : 'scans'}</span>
            <span aria-hidden="true">&middot;</span>
            <span className={`font-medium ${healthMeta.toneClass}`}>{healthMeta.label}</span>
          </div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
            TLD Popularity Index
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 max-w-xl">
            {healthMeta.summary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Scope Selector */}
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                scope === 'all'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Scans
            </button>
            <button
              type="button"
              onClick={() => setScope('latest')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                scope === 'latest'
                  ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Latest Scan
            </button>
          </div>

          {onOpenRadar && (
            <button
              type="button"
              onClick={onOpenRadar}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs font-medium text-slate-700 dark:text-zinc-200 whitespace-nowrap transition-colors"
            >
              <span>Full Telemetry</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {analytics.tlds.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 max-w-md">
            No taken or available RDAP scan history recorded yet. Run a domain search to compute the TLD Popularity Index.
          </p>
          {onScanBaseline && (
            <button
              type="button"
              onClick={onScanBaseline}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Run Baseline Scan</span>
            </button>
          )}
        </div>
      ) : (
        <div className="pt-4 space-y-5">
          {/* KPI Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200 dark:border-white/[0.07]">
            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Composite Index</p>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold font-mono-tech text-slate-900 dark:text-white tabular-nums">
                  {analytics.compositeIndex ?? '—'}
                </span>
                <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono-tech">/ 100</span>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Taken : Available</p>
              <p className="text-2xl font-bold font-mono-tech text-slate-900 dark:text-white tabular-nums mt-1">
                {analytics.overallRatio}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Scan Breakdown</p>
              <p className="text-sm font-mono-tech font-semibold text-slate-900 dark:text-white tabular-nums mt-2">
                <span className="text-rose-600 dark:text-rose-400">{analytics.totalTaken} taken</span>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-emerald-600 dark:text-emerald-400">{analytics.totalAvailable} open</span>
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Most Contested</p>
              <p className="text-sm font-mono-tech font-semibold text-slate-900 dark:text-white tabular-nums mt-2">
                {analytics.mostPopularTld
                  ? `.${analytics.mostPopularTld.tld} (${analytics.mostPopularTld.popularityIndex}%)`
                  : '—'}
              </p>
            </div>
          </div>

          {/* Sort Controls + Breakdown Heading */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Extension saturation = taken &divide; (taken + available) across recent history
            </p>
            <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
              {(
                [
                  { id: 'index_desc', label: 'Highest Demand' },
                  { id: 'index_asc', label: 'Most Open' },
                  { id: 'volume', label: 'Most Scanned' }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                    sortBy === opt.id
                      ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Per-TLD Popularity Index Table Rows */}
          <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
            {displayedTlds.map((row) => {
              const barColor =
                row.popularityIndex >= 70
                  ? 'bg-rose-500'
                  : row.popularityIndex >= 40
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';
              return (
                <div
                  key={row.tld}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-3 min-w-[140px]">
                    {onSelectTldQuery ? (
                      <button
                        type="button"
                        onClick={() => onSelectTldQuery(row.tld)}
                        className="font-mono-tech text-sm font-semibold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-left"
                        title={`Explore .${row.tld} availability`}
                      >
                        .{row.tld}
                      </button>
                    ) : (
                      <span className="font-mono-tech text-sm font-semibold text-slate-900 dark:text-white">
                        .{row.tld}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono-tech tabular-nums">
                      {row.taken}T &middot; {row.available}A
                      {row.premium > 0 ? ` · ${row.premium}P` : ''}
                    </span>
                  </div>

                  {/* Proportional Popularity Meter */}
                  <div className="flex-1 flex items-center gap-3 min-w-0">
                    <div
                      className="flex-1 h-2 rounded-full bg-emerald-500/20 dark:bg-emerald-500/15 overflow-hidden"
                      title={`${row.popularityIndex}% taken (${row.taken} taken vs ${row.available} available)`}
                    >
                      <div
                        className={`h-full ${barColor} transition-all duration-300`}
                        style={{ width: `${row.popularityIndex}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 text-xs font-mono-tech tabular-nums">
                    <span className="text-slate-500 dark:text-zinc-400">
                      Ratio {row.ratioDisplay}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white w-14 text-right">
                      {row.popularityIndex} / 100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {variant === 'compact' && analytics.tlds.length > 6 && onOpenRadar && (
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={onOpenRadar}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline underline-offset-4"
              >
                View all {analytics.tlds.length} extensions in Registry Radar
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
