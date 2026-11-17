import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Bookmark,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  TrendingUp,
  XCircle
} from 'lucide-react';
import type {
  DomainAnalysisResult,
  DomainResult,
  ExpiredDomainCandidate,
  SocialHandleResult
} from '../types/domain';
import {
  checkDomainBatch,
  fetchDomainAnalysis,
  fetchExpiredDomains,
  fetchSocialHandles,
  generateReverseDictionaryLabels,
  sanitizeFullDomain
} from '../utils/rdap';

export type ToolsTab = 'research' | 'expired' | 'reverse' | 'trademark';

interface DomainToolsViewProps {
  initialTab?: ToolsTab;
  initialDomain?: string;
  onNavigate: (path: string) => void;
  onTrySearch: (query: string) => void;
  onToggleBookmark: (item: DomainResult) => void;
  onOpenNotify: (item: DomainResult) => void;
  onInspectWhois: (item: DomainResult) => void;
  bookmarkedDomains: string[];
  alertDomains: string[];
}

export const DomainToolsView: React.FC<DomainToolsViewProps> = ({
  initialTab = 'research',
  initialDomain = 'velorapay.com',
  onNavigate,
  onTrySearch,
  onToggleBookmark,
  onOpenNotify,
  onInspectWhois,
  bookmarkedDomains,
  alertDomains
}) => {
  const [activeTab, setActiveTab] = useState<ToolsTab>(initialTab);

  // 1. Research / Appraisal / Trademark / Social state
  const [domainInput, setDomainInput] = useState(() => sanitizeFullDomain(initialDomain) || 'velorapay.com');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DomainAnalysisResult | null>(null);
  const [socialHandles, setSocialHandles] = useState<SocialHandleResult[]>([]);
  const [liveRdap, setLiveRdap] = useState<DomainResult | null>(null);

  // 2. Expired Domains state
  const [expKeyword, setExpKeyword] = useState('');
  const [expTld, setExpTld] = useState('all');
  const [expStage, setExpStage] = useState('all');
  const [expMaxLen, setExpMaxLen] = useState(20);
  const [expItems, setExpItems] = useState<ExpiredDomainCandidate[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, DomainResult>>({});
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  // 3. Reverse Dictionary state
  const [conceptInput, setConceptInput] = useState('fast');
  const [modifierInput, setModifierInput] = useState('');
  const [reverseTld, setReverseTld] = useState('com');
  const [reverseResults, setReverseResults] = useState<DomainResult[]>([]);
  const [reverseLoading, setReverseLoading] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const runFullDomainAnalysis = useCallback(async (raw: string) => {
    const clean = sanitizeFullDomain(raw);
    if (!clean) {
      setAnalysisError('Enter a valid domain name such as velorapay.com or nexora.ai.');
      return;
    }
    setDomainInput(clean);
    setAnalyzing(true);
    setAnalysisError(null);
    const label = clean.split('.')[0] || clean;

    try {
      const [analysisRes, socialRes, rdapBatch] = await Promise.all([
        fetchDomainAnalysis(clean),
        fetchSocialHandles(label).catch(() => []),
        checkDomainBatch([{ domain: clean, isHack: false }]).catch(() => [])
      ]);
      setAnalysis(analysisRes);
      setSocialHandles(socialRes);
      setLiveRdap(rdapBatch[0] || null);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Unable to analyze domain.');
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const loadExpiredList = useCallback(async () => {
    setExpLoading(true);
    try {
      const items = await fetchExpiredDomains({
        q: expKeyword,
        tld: expTld,
        stage: expStage,
        maxLen: expMaxLen
      });
      setExpItems(items);
    } finally {
      setExpLoading(false);
    }
  }, [expKeyword, expTld, expStage, expMaxLen]);

  const runReverseSearch = useCallback(async (concept: string, modifier: string, tld: string) => {
    setReverseLoading(true);
    try {
      const labels = generateReverseDictionaryLabels(concept, modifier);
      const entries = labels.map((lbl) => ({ domain: `${lbl}.${tld}`, isHack: false }));
      const checked = await checkDomainBatch(entries);
      setReverseResults(checked);
    } finally {
      setReverseLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!analysis && (activeTab === 'research' || activeTab === 'trademark')) {
      runFullDomainAnalysis(domainInput);
    }
  }, [activeTab, analysis, domainInput, runFullDomainAnalysis]);

  useEffect(() => {
    if (activeTab === 'expired') {
      loadExpiredList();
    }
  }, [activeTab, loadExpiredList]);

  useEffect(() => {
    if (activeTab === 'reverse' && reverseResults.length === 0) {
      runReverseSearch(conceptInput, modifierInput, reverseTld);
    }
  }, [activeTab, reverseResults.length, conceptInput, modifierInput, reverseTld, runReverseSearch]);

  const handleVerifyExpiredRow = async (candidate: ExpiredDomainCandidate) => {
    setVerifyingDomain(candidate.domain);
    try {
      const res = await checkDomainBatch([{ domain: candidate.domain, isHack: false }]);
      if (res[0]) {
        setVerifiedMap((prev) => ({ ...prev, [candidate.domain]: res[0] }));
      }
    } finally {
      setVerifyingDomain(null);
    }
  };

  const handleSelectTab = (tab: ToolsTab) => {
    setActiveTab(tab);
    const routeMap: Record<ToolsTab, string> = {
      research: '/tools',
      expired: '/expired',
      reverse: '/reverse-dictionary',
      trademark: '/trademark'
    };
    onNavigate(routeMap[tab]);
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-8">
      {/* Header + Tool Switcher */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              Domain Intelligence Suite
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 mt-1.5">
              Analyze brandability, appraisal value, trademark conflicts, live social handles, expiring drops, and reverse-dictionary combinations.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/radar')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:border-emerald-500/50 transition-colors whitespace-nowrap shrink-0"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Open Registry Radar</span>
          </button>
        </div>

        {/* Segmented Workspace Tabs */}
        <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08]">
          {[
            { id: 'research' as ToolsTab, label: 'Research & Appraisal' },
            { id: 'trademark' as ToolsTab, label: 'Trademark & Socials' },
            { id: 'expired' as ToolsTab, label: 'Expired Domains' },
            { id: 'reverse' as ToolsTab, label: 'Reverse Dictionary' }
          ].map((t) => {
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectTab(t.id)}
                className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1 & TAB 4: Brand Research, Appraisal, Trademark & Social Check */}
      {(activeTab === 'research' || activeTab === 'trademark') && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runFullDomainAnalysis(domainInput);
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="flex-1 flex items-center rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3.5 focus-within:border-emerald-500">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="Enter domain (e.g. velorapay.com, nexora.ai)"
                  aria-label="Domain to analyze"
                  className="w-full bg-transparent px-2.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={analyzing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Domain'}
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span>Quick samples:</span>
              {['velorapay.com', 'nexora.ai', 'ama.ai', 'pingila.com'].map((sample, i) => (
                <React.Fragment key={sample}>
                  {i > 0 && <span aria-hidden="true">&middot;</span>}
                  <button
                    type="button"
                    onClick={() => runFullDomainAnalysis(sample)}
                    className="hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
                  >
                    {sample}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {analysisError && (
              <p className="mt-4 text-xs text-rose-500">{analysisError}</p>
            )}
          </div>

          {analysis && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Domain Score & Appraisal Valuation */}
              <div className="lg:col-span-7 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-white/[0.08]">
                  <div>
                    <div className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                      <span>Domain Evaluation</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>Rating: {analysis.overallGrade}</span>
                      {liveRdap && (
                        <>
                          <span aria-hidden="true">&middot;</span>
                          <span className="capitalize">Status: {liveRdap.status}</span>
                        </>
                      )}
                    </div>
                    <h2 className="font-serif-domain text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-1">
                      {analysis.domain}
                    </h2>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-xs text-slate-500 dark:text-zinc-400">Estimated Appraisal Range</div>
                    <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-tech tabular-nums mt-0.5">
                      ${analysis.estimatedValueRange.lowUsd.toLocaleString()} – ${analysis.estimatedValueRange.highUsd.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Score Bars */}
                <div className="space-y-4">
                  {[
                    { label: 'Brandability', score: analysis.brandableScore, color: 'bg-emerald-500' },
                    { label: 'Pronunciation & Phonetic Flow', score: analysis.pronunciationScore, color: 'bg-sky-500' },
                    { label: 'Length & Conciseness', score: analysis.lengthScore, color: 'bg-amber-500' }
                  ].map((metric) => (
                    <div key={metric.label} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium text-slate-700 dark:text-zinc-300">{metric.label}</span>
                        <span className="font-mono-tech font-semibold text-slate-900 dark:text-white tabular-nums">
                          {metric.score}/100
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.color} transition-all duration-300`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Appraisal Signals */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/[0.08] space-y-2">
                  <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                    Valuation Breakdown
                  </h3>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                    {analysis.appraisalFactors.map((factor) => (
                      <li key={factor} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                        <span>{factor}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  {liveRdap && (
                    <button
                      type="button"
                      onClick={() => onInspectWhois(liveRdap)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0"
                    >
                      View Live RDAP Record
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onTrySearch(analysis.label)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs font-semibold text-slate-900 dark:text-white transition-colors whitespace-nowrap shrink-0"
                  >
                    Search Extensions for &ldquo;{analysis.label}&rdquo;
                  </button>
                </div>
              </div>

              {/* Right Column: Trademark Screen + Social Handle Availability */}
              <div className="lg:col-span-5 space-y-6">
                {/* Trademark Screening */}
                <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-6 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="w-4 h-4 text-sky-500" />
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Trademark Pre-Screen
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        analysis.trademarkRisk.level === 'Low'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : analysis.trademarkRisk.level === 'Moderate'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-rose-500'
                      }`}
                    >
                      {analysis.trademarkRisk.level} Overlap Risk
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                    {analysis.trademarkRisk.note}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={analysis.trademarkRisk.usptoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-medium text-slate-800 dark:text-zinc-200"
                    >
                      <span>Search USPTO</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href={analysis.trademarkRisk.wipoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-medium text-slate-800 dark:text-zinc-200"
                    >
                      <span>Search WIPO Global</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Social & Package Handle Availability */}
                <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-6 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Social &amp; Developer Handles (@{analysis.label})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      Live HTTP availability checks for public APIs and direct verification links
                    </p>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                    {socialHandles.map((s) => (
                      <div key={s.platform} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-slate-800 dark:text-zinc-200">{s.platform}</span>
                        <a
                          href={s.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium hover:underline"
                        >
                          {s.status === 'available' ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                            </>
                          ) : s.status === 'taken' ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-500" />
                              <span className="text-rose-500">Taken</span>
                            </>
                          ) : (
                            <>
                              <span className="text-slate-500 dark:text-zinc-400">Verify handle</span>
                              <ExternalLink className="w-3 h-3 text-slate-400" />
                            </>
                          )}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Expired & Dropping Domains Finder */}
      {activeTab === 'expired' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label htmlFor="expKeyword" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Keyword or Niche
                </label>
                <input
                  id="expKeyword"
                  type="text"
                  value={expKeyword}
                  onChange={(e) => setExpKeyword(e.target.value)}
                  placeholder="e.g. pay, ai, cloud..."
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label htmlFor="expTld" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Extension
                </label>
                <select
                  id="expTld"
                  value={expTld}
                  onChange={(e) => setExpTld(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All TLDs</option>
                  <option value="com">.com</option>
                  <option value="ai">.ai</option>
                  <option value="io">.io</option>
                  <option value="app">.app</option>
                  <option value="co">.co</option>
                  <option value="net">.net</option>
                  <option value="org">.org</option>
                </select>
              </div>

              <div>
                <label htmlFor="expStage" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Drop Stage
                </label>
                <select
                  id="expStage"
                  value={expStage}
                  onChange={(e) => setExpStage(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="all">All Stages</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Pending Delete">Pending Delete</option>
                  <option value="Recent Drop">Recent Drop</option>
                </select>
              </div>

              <div>
                <label htmlFor="expMaxLen" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Max Root Length ({expMaxLen} chars)
                </label>
                <input
                  id="expMaxLen"
                  type="range"
                  min={5}
                  max={20}
                  value={expMaxLen}
                  onChange={(e) => setExpMaxLen(Number(e.target.value))}
                  className="w-full accent-emerald-500 mt-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] overflow-hidden">
            {expLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">Loading expiring domain watchlist...</div>
            ) : expItems.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <p className="text-sm font-medium text-slate-900 dark:text-white">No expiring domains match your filter</p>
                <button
                  type="button"
                  onClick={() => {
                    setExpKeyword('');
                    setExpTld('all');
                    setExpStage('all');
                    setExpMaxLen(20);
                  }}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {expItems.map((item) => {
                  const verified = verifiedMap[item.domain];
                  const isBookmarked = bookmarkedDomains.includes(item.domain);
                  const hasAlert = alertDomains.includes(item.domain);
                  const rowResult: DomainResult = verified || {
                    domain: item.domain,
                    status: 'taken',
                    price: `$${item.estValueUsd.toLocaleString()}`
                  };

                  return (
                    <div
                      key={item.domain}
                      className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-serif-domain text-lg font-bold text-slate-900 dark:text-white">
                            {item.domain}
                          </span>
                          {verified && (
                            <span
                              className={`text-xs font-semibold ${
                                verified.status === 'available'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : verified.status === 'premium'
                                  ? 'text-sky-500'
                                  : 'text-rose-500'
                              }`}
                            >
                              Live RDAP: {verified.status}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{item.stage} ({item.dropWindow})</span>
                          </span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{item.category}</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>{item.backlinks} ref links</span>
                          <span aria-hidden="true">&middot;</span>
                          <span>Est. ${item.estValueUsd.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleVerifyExpiredRow(item)}
                          disabled={verifyingDomain === item.domain}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs font-medium text-slate-800 dark:text-zinc-200 whitespace-nowrap"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomain === item.domain ? 'animate-spin' : ''}`} />
                          <span>{verifyingDomain === item.domain ? 'Checking...' : 'Verify RDAP'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenNotify(rowResult)}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap ${
                            hasAlert
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-500'
                              : 'border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-300 hover:border-amber-500/50 hover:text-amber-500'
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5" />
                          <span>{hasAlert ? 'Alert Set' : 'Drop Alert'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onToggleBookmark(rowResult)}
                          aria-label={`Save ${item.domain}`}
                          className={`p-2 rounded-lg border transition-colors ${
                            isBookmarked
                              ? 'border-purple-500/50 text-purple-500 bg-purple-500/10'
                              : 'border-slate-200 dark:border-white/[0.1] text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Reverse Dictionary & Brand Combiner */}
      {activeTab === 'reverse' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runReverseSearch(conceptInput, modifierInput, reverseTld);
              }}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3"
            >
              <div className="sm:col-span-5">
                <label htmlFor="conceptInput" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Concept or Meaning
                </label>
                <input
                  id="conceptInput"
                  type="text"
                  value={conceptInput}
                  onChange={(e) => setConceptInput(e.target.value)}
                  placeholder="e.g. fast, secure, cloud, pay, smart"
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="modifierInput" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Optional Root Word
                </label>
                <input
                  id="modifierInput"
                  type="text"
                  value={modifierInput}
                  onChange={(e) => setModifierInput(e.target.value)}
                  placeholder="e.g. pay, ai, flow"
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="reverseTldSelect" className="block text-xs text-slate-500 dark:text-zinc-400 mb-1">
                  Extension
                </label>
                <select
                  id="reverseTldSelect"
                  value={reverseTld}
                  onChange={(e) => setReverseTld(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="com">.com</option>
                  <option value="ai">.ai</option>
                  <option value="io">.io</option>
                  <option value="app">.app</option>
                  <option value="dev">.dev</option>
                </select>
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={reverseLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white whitespace-nowrap transition-colors"
                >
                  {reverseLoading ? 'Checking...' : 'Synthesize'}
                </button>
              </div>
            </form>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
              <span>Popular concepts:</span>
              {['fast', 'secure', 'cloud', 'finance', 'health', 'smart', 'global'].map((c, idx) => (
                <React.Fragment key={c}>
                  {idx > 0 && <span aria-hidden="true">&middot;</span>}
                  <button
                    type="button"
                    onClick={() => {
                      setConceptInput(c);
                      runReverseSearch(c, modifierInput, reverseTld);
                    }}
                    className="hover:text-slate-900 dark:hover:text-white underline underline-offset-4 capitalize"
                  >
                    {c}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] divide-y divide-slate-100 dark:divide-white/[0.06]">
            {reverseLoading ? (
              <div className="p-10 text-center text-sm text-slate-500">
                Generating synonym combinations &amp; verifying live RDAP availability...
              </div>
            ) : (
              reverseResults.map((res) => {
                const isAvailable = res.status === 'available' || res.status === 'hack';
                return (
                  <div
                    key={res.domain}
                    className="p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Sparkles className={`w-4 h-4 shrink-0 ${isAvailable ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="font-serif-domain text-lg font-semibold text-slate-900 dark:text-white truncate">
                        {res.domain}
                      </span>
                      <span
                        className={`text-xs font-medium capitalize ${
                          isAvailable
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : res.status === 'premium'
                            ? 'text-sky-500'
                            : 'text-rose-500'
                        }`}
                      >
                        {res.status}
                        {res.price ? ` · ${res.price}` : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('research');
                          runFullDomainAnalysis(res.domain);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs font-medium text-slate-800 dark:text-zinc-200"
                      >
                        Score &amp; Appraise
                      </button>
                      <button
                        type="button"
                        onClick={() => onInspectWhois(res)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/20 text-xs font-semibold"
                      >
                        <span>{isAvailable ? 'Register' : 'WHOIS'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </section>
  );
};
