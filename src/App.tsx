import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query as fsQuery,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from 'firebase/firestore';
import {
  Bell,
  BellRing,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileSpreadsheet,
  Grid3X3,
  List,
  LogIn,
  LogOut,
  Menu,
  MoreHorizontal,
  Search,
  Settings,
  Upload,
  X
} from 'lucide-react';
import { AuthModal } from './components/AuthModal';
import { DomainHunterLogo } from './components/DomainHunterLogo';
import { DomainRadarView } from './components/DomainRadarView';
import { DomainRow } from './components/DomainRow';
import { DomainToolsView } from './components/DomainToolsView';
import type { ToolsTab } from './components/DomainToolsView';
import { FooterCard } from './components/FooterCard';
import { InfoPages } from './components/InfoPages';
import { MarketHealthWidget } from './components/MarketHealthWidget';
import { BookmarksDrawer, ExtensionSettingsModal, NotifyAlertModal, WhoisModal } from './components/Modals';
import { RegistrarDropdown } from './components/RegistrarDropdown';
import { DOMAIN_HOWTO_GUIDES } from './data/guides';
import type { GuideStep } from './data/guides';
import { OperationType, auth, db, handleFirestoreError, signOutUser } from './firebase';
import { usePageSeo } from './hooks/usePageSeo';
import type {
  AlertChannel,
  AlertTrigger,
  BookmarkItem,
  CurrencyCode,
  DomainAlertItem,
  DomainResult,
  PricingFeedResponse,
  RdapScanSnapshot,
  SearchMode
} from './types/domain';
import {
  CORE_TLDS,
  EXTENDED_TLDS,
  checkDomainBatch,
  copyTextToClipboard,
  detectDomainHack,
  fetchAiBrandNames,
  fetchGlobalStats,
  fetchPricingFeed,
  formatDomainPrice,
  getPremiumShowcaseDomains,
  parseUsdPrice,
  sanitizeFullDomain,
  sanitizeLabel
} from './utils/rdap';

const BOOKMARK_STORAGE_KEY = 'dh_basari_bookmarks_v1';
const ALERT_STORAGE_KEY = 'dh_basari_alerts_v1';
const RDAP_HISTORY_STORAGE_KEY = 'dh_basari_rdap_history_v1';

const MODE_ROUTES: Record<string, SearchMode> = {
  '/': 'search',
  '/extensions': 'extensions',
  '/generator': 'generator',
  '/premium': 'premium',
  '/research': 'research'
};

const TOOLS_ROUTE_TABS: Record<string, ToolsTab> = {
  '/tools': 'research',
  '/appraisal': 'research',
  '/expired': 'expired',
  '/reverse-dictionary': 'reverse',
  '/trademark': 'trademark'
};

const INFO_ROUTES = new Set([
  '/faq',
  '/guides',
  '/contact',
  '/security',
  '/terms',
  '/privacy',
  ...DOMAIN_HOWTO_GUIDES.map((g) => g.path)
]);

const GUIDE_ROUTE_SEO: Record<
  string,
  { title: string; description: string; howToSteps?: readonly GuideStep[] }
> = Object.fromEntries(
  DOMAIN_HOWTO_GUIDES.map((g) => [
    g.path,
    {
      title: g.seoTitle,
      description: g.seoDescription,
      howToSteps: g.steps
    }
  ])
);

const ROUTE_SEO: Record<
  string,
  { title: string; description: string; howToSteps?: readonly GuideStep[] }
> = {
  '/': {
    title: 'Domain Hunter Basari 2026 – Instant Domain Search & Alerts',
    description:
      'Hunt available domains in milliseconds with Domain Hunter Basari 2026: live RDAP & DNS checks, Gemini AI brand naming, and alerts.'
  },
  '/extensions': {
    title: 'Extensions Explorer – Domain Hunter Basari 2026',
    description:
      'Check availability simultaneously across 20+ domain extensions including .com, .ai, .io, .app, .dev, and .in with Domain Hunter Basari 2026.'
  },
  '/generator': {
    title: 'AI Name Studio – Domain Hunter Basari 2026',
    description:
      'Generate brandable startup names with Gemini AI and verify live .com and .ai availability instantly on Domain Hunter Basari 2026.'
  },
  '/premium': {
    title: 'Aftermarket Picks – Domain Hunter Basari 2026',
    description:
      'Discover short brandable and aftermarket domains with direct marketplace pricing and RDAP inspection on Domain Hunter Basari 2026.'
  },
  '/research': {
    title: 'Bulk CSV Domain Scanner – Domain Hunter Basari 2026',
    description:
      'Import CSV or paste domain lists to verify RDAP and DNS availability across up to 50 domains in one batch with Domain Hunter Basari 2026.'
  },
  '/tools': {
    title: 'Domain Intelligence Suite – Domain Hunter Basari 2026',
    description:
      'Evaluate domain brandability, estimated market appraisal, trademark overlap, and live social handles on Domain Hunter Basari 2026.'
  },
  '/appraisal': {
    title: 'Domain Appraisal & Brand Score – Domain Hunter Basari 2026',
    description:
      'Calculate brandability, pronunciation clarity, length weight, and estimated USD valuation range on Domain Hunter Basari 2026.'
  },
  '/trademark': {
    title: 'Trademark & Social Handle Check – Domain Hunter Basari 2026',
    description:
      'Screen brand terms for trademark conflicts via USPTO & WIPO and verify social & developer handle availability on Domain Hunter Basari 2026.'
  },
  '/expired': {
    title: 'Expired & Dropping Domains Finder – Domain Hunter Basari 2026',
    description:
      'Filter expiring, pending-delete, and recently dropped domains with live RDAP verification and drop alerts on Domain Hunter Basari 2026.'
  },
  '/reverse-dictionary': {
    title: 'Reverse Dictionary Domain Combiner – Domain Hunter Basari 2026',
    description:
      'Turn concepts and meanings into brandable synonym domain combinations with instant RDAP checks on Domain Hunter Basari 2026.'
  },
  '/radar': {
    title: 'Registry Radar & D3 Telemetry – Domain Hunter Basari 2026',
    description:
      'Explore historical domain registration charts, availability distributions, and live RDAP scan telemetry on Domain Hunter Basari 2026.'
  },
  '/faq': {
    title: 'FAQ – Domain Hunter Basari 2026',
    description:
      'Frequently asked questions about live RDAP checks, Notify Me domain expiration alerts, and cloud watchlists on Domain Hunter Basari 2026.'
  },
  '/guides': {
    title: 'Domain Strategy & How-To Guides – Domain Hunter Basari 2026',
    description:
      'Step-by-step Domain Hunter Basari 2026 playbooks on .com vs .ai naming, domain hacks, aftermarket audits, and catching expiring domains.'
  },
  '/contact': {
    title: 'Contact Support – Domain Hunter Basari 2026',
    description:
      'Contact the Domain Hunter Basari 2026 team for support, registrar partnerships, or security questions.'
  },
  '/security': {
    title: 'Security Architecture – Domain Hunter Basari 2026',
    description:
      'Learn how Domain Hunter Basari 2026 secures lookups with TLS RDAP proxies, rate limiting, and zero-trust Firestore rules.'
  },
  '/terms': {
    title: 'Terms of Service – Domain Hunter Basari 2026',
    description: 'Terms of Service for Domain Hunter Basari 2026.'
  },
  '/privacy': {
    title: 'Privacy Policy – Domain Hunter Basari 2026',
    description:
      'Privacy Policy for Domain Hunter Basari 2026 detailing zero search front-running and account data ownership.'
  },
  ...GUIDE_ROUTE_SEO
};

const WORKSPACE_TABS: Array<{ id: SearchMode; path: string; label: string }> = [
  { id: 'search', path: '/', label: 'Instant Search' },
  { id: 'extensions', path: '/extensions', label: 'Extensions' },
  { id: 'generator', path: '/generator', label: 'AI Studio' },
  { id: 'premium', path: '/premium', label: 'Aftermarket' },
  { id: 'research', path: '/research', label: 'Bulk Scanner' }
];

function normalizePath(p: string): string {
  const clean = p.replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

function domainToDocId(domain: string): string {
  return domain.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
}

export default function App() {
  const [route, setRoute] = useState<string>(() => normalizePath(window.location.pathname));
  const [mode, setMode] = useState<SearchMode>(() => MODE_ROUTES[normalizePath(window.location.pathname)] || 'search');
  const [query, setQuery] = useState('velorapay');
  const [results, setResults] = useState<DomainResult[]>([]);
  const [selectedTlds, setSelectedTlds] = useState<string[]>(CORE_TLDS);
  const [domainsVerified, setDomainsVerified] = useState(14_820_410);

  const [isDark, setIsDark] = useState(true);
  const [language, setLanguage] = useState('en');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<'finding' | 'tools' | 'resources' | 'company'>('finding');

  const [openDropdownDomain, setOpenDropdownDomain] = useState<string | null>(null);
  const [bannerDropdownOpen, setBannerDropdownOpen] = useState(false);

  const [aiIdea, setAiIdea] = useState('AI workflow for clinics');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTaglines, setAiTaglines] = useState<Array<{ name: string; tagline: string }>>([]);

  const [bulkText, setBulkText] = useState('velorapay.com\nnexora.ai\npingila.com\nama.com\norbitlabs.dev');
  const [csvFilename, setCsvFilename] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'premium' | 'taken'>('all');
  const [extensionsLayout, setExtensionsLayout] = useState<'list' | 'grid'>('list');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [pricingFeed, setPricingFeed] = useState<PricingFeedResponse>({
    source: 'catalog_benchmark',
    updatedAt: '',
    usdToInr: 85.5,
    tlds: {}
  });

  const [whoisItem, setWhoisItem] = useState<DomainResult | null>(null);
  const [notifyItem, setNotifyItem] = useState<DomainResult | null>(null);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARK_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as BookmarkItem[]) : [];
    } catch {
      return [];
    }
  });

  const [alerts, setAlerts] = useState<DomainAlertItem[]>(() => {
    try {
      const raw = localStorage.getItem(ALERT_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as DomainAlertItem[]) : [];
    } catch {
      return [];
    }
  });

  const [scanHistory, setScanHistory] = useState<RdapScanSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(RDAP_HISTORY_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as RdapScanSnapshot[]) : [];
    } catch {
      return [];
    }
  });

  const searchSeqRef = useRef(0);
  const debounceRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const notifiedDomainsRef = useRef<Set<string>>(new Set());

  const seoMeta = ROUTE_SEO[route] || {
    title: 'Page Not Found – Domain Hunter',
    description: 'The requested page could not be found on Domain Hunter.'
  };
  usePageSeo({ ...seoMeta, path: route });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Persist guest bookmarks & alerts locally
  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
      } catch {
        // ignore storage errors
      }
    }
  }, [bookmarks, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      try {
        localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
      } catch {
        // ignore storage errors
      }
    }
  }, [alerts, currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(RDAP_HISTORY_STORAGE_KEY, JSON.stringify(scanHistory));
    } catch {
      // ignore storage errors
    }
  }, [scanHistory]);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // Firebase Auth + Firestore Profile Bootstrap & Live Watchlist/Alerts Listeners
  useEffect(() => {
    let unsubBookmarks: (() => void) | null = null;
    let unsubAlerts: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubBookmarks) {
        unsubBookmarks();
        unsubBookmarks = null;
      }
      if (unsubAlerts) {
        unsubAlerts();
        unsubAlerts = null;
      }

      setCurrentUser(user);
      setAuthReady(true);

      if (!user) {
        try {
          const rawBm = localStorage.getItem(BOOKMARK_STORAGE_KEY);
          setBookmarks(rawBm ? (JSON.parse(rawBm) as BookmarkItem[]) : []);
          const rawAlerts = localStorage.getItem(ALERT_STORAGE_KEY);
          setAlerts(rawAlerts ? (JSON.parse(rawAlerts) as DomainAlertItem[]) : []);
        } catch {
          setBookmarks([]);
          setAlerts([]);
        }
        return;
      }

      // Ensure user profile document exists in /users/{uid}
      const userPath = `users/${user.uid}`;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        const safeName = (user.displayName || user.email?.split('@')[0] || 'Domain Hunter User').slice(0, 100);
        const safeEmail = (user.email || '').slice(0, 160);
        const safePhoto = user.photoURL ? user.photoURL.slice(0, 500) : undefined;

        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            displayName: safeName,
            email: safeEmail,
            ...(safePhoto ? { photoURL: safePhoto } : {}),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          await updateDoc(userRef, {
            displayName: safeName,
            email: safeEmail,
            ...(safePhoto ? { photoURL: safePhoto } : {}),
            updatedAt: serverTimestamp()
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, userPath);
      }

      // Subscribe to user's private bookmarks subcollection
      const bmPath = `users/${user.uid}/bookmarks`;
      const q = fsQuery(collection(db, 'users', user.uid, 'bookmarks'), orderBy('createdAt', 'desc'));
      unsubBookmarks = onSnapshot(
        q,
        (snapshot) => {
          const items: BookmarkItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              domain: String(data.domain || ''),
              status: (data.status as BookmarkItem['status']) || 'unknown',
              price: data.price ? String(data.price) : null
            };
          });
          setBookmarks(items);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, bmPath);
        }
      );

      // Subscribe to user's private domainAlerts subcollection
      const alertsPath = `users/${user.uid}/domainAlerts`;
      const alertsQ = fsQuery(collection(db, 'users', user.uid, 'domainAlerts'), orderBy('createdAt', 'desc'));
      unsubAlerts = onSnapshot(
        alertsQ,
        (snapshot) => {
          const items: DomainAlertItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: String(data.id || d.id),
              domain: String(data.domain || ''),
              channel: (data.channel as AlertChannel) || 'email',
              trigger: (data.trigger as AlertTrigger) || 'expires_or_available',
              email: data.email ? String(data.email) : null,
              expiresAt: data.expiresAt ? String(data.expiresAt) : null,
              maxPriceUsd: typeof data.maxPriceUsd === 'number' ? data.maxPriceUsd : null,
              active: Boolean(data.active ?? true)
            };
          });
          setAlerts(items);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, alertsPath);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubBookmarks) unsubBookmarks();
      if (unsubAlerts) unsubAlerts();
    };
  }, []);

  const refreshGlobalStats = useCallback(() => {
    fetchGlobalStats().then((stats) => {
      if (stats?.domainsVerified) {
        setDomainsVerified(stats.domainsVerified);
      }
    });
  }, []);

  useEffect(() => {
    refreshGlobalStats();
    fetchPricingFeed().then((feed) => {
      if (feed) setPricingFeed(feed);
    });
  }, [refreshGlobalStats]);

  const recordRdapSnapshot = useCallback(
    (rawQuery: string, searchMode: SearchMode, settled: DomainResult[]) => {
      if (!settled || settled.length === 0) return;
      const cleanQ = rawQuery.trim().slice(0, 60) || 'custom';

      let available = 0;
      let taken = 0;
      let premium = 0;
      let unknown = 0;

      const domains = settled.map((item) => {
        if (item.status === 'available' || item.status === 'hack') available += 1;
        else if (item.status === 'premium') premium += 1;
        else if (item.status === 'taken') taken += 1;
        else unknown += 1;

        const regEvent = item.rdap?.events?.find((e) => e.eventAction === 'registration');
        let registeredYear: number | null = null;
        if (regEvent?.eventDate) {
          const yr = new Date(regEvent.eventDate).getUTCFullYear();
          if (Number.isFinite(yr) && yr >= 1985 && yr <= 2030) {
            registeredYear = yr;
          }
        }

        return {
          domain: item.domain,
          tld: item.domain.split('.').pop() || '',
          status: item.status,
          price: item.price ?? null,
          registeredYear
        };
      });

      const snapshot: RdapScanSnapshot = {
        id: `${Date.now()}_${cleanQ.replace(/[^a-zA-Z0-9_-]/g, '')}`,
        query: cleanQ,
        mode: searchMode,
        timestamp: new Date().toISOString(),
        total: settled.length,
        available,
        taken,
        premium,
        unknown,
        domains
      };

      setScanHistory((prev) => {
        if (prev[0] && prev[0].query === snapshot.query && prev[0].mode === snapshot.mode) {
          return [snapshot, ...prev.slice(1)].slice(0, 25);
        }
        return [snapshot, ...prev].slice(0, 25);
      });
    },
    []
  );

  const runInstantSearch = useCallback(
    async (rawInput: string, activeMode: SearchMode = mode, tldOverride?: string[]) => {
      const label = sanitizeLabel(rawInput);
      if (!label) {
        setResults([]);
        return;
      }

      const seq = ++searchSeqRef.current;

      if (activeMode === 'premium') {
        const premiumList = getPremiumShowcaseDomains(label);
        setResults(premiumList);
        recordRdapSnapshot(label, 'premium', premiumList);
        return;
      }

      const tldsToQuery = activeMode === 'extensions' ? EXTENDED_TLDS : (tldOverride || selectedTlds);
      const domainHack = activeMode === 'search' ? detectDomainHack(label) : null;

      const domainsToCheck: Array<{ domain: string; isHack: boolean }> = [];
      if (domainHack) {
        domainsToCheck.push({ domain: domainHack, isHack: true });
      }
      for (const tld of tldsToQuery) {
        const d = `${label}.${tld}`;
        if (!domainsToCheck.some((x) => x.domain === d)) {
          domainsToCheck.push({ domain: d, isHack: false });
        }
      }

      setResults(domainsToCheck.map((d) => ({ domain: d.domain, status: 'loading' })));

      const settled = await checkDomainBatch(domainsToCheck);
      if (seq !== searchSeqRef.current) return;
      setResults(settled);
      recordRdapSnapshot(label, activeMode, settled);
      refreshGlobalStats();
    },
    [mode, selectedTlds, refreshGlobalStats, recordRdapSnapshot]
  );

  const runGeneratorSearch = useCallback(
    async (ideaText: string) => {
      setAiError(null);
      setAiLoading(true);
      try {
        const suggestions = await fetchAiBrandNames(ideaText);
        setAiTaglines(suggestions);
        const domains = suggestions.flatMap((s) => [
          { domain: `${s.name.toLowerCase()}.com`, isHack: false },
          { domain: `${s.name.toLowerCase()}.ai`, isHack: false }
        ]);

        const seq = ++searchSeqRef.current;
        setResults(domains.map((d) => ({ domain: d.domain, status: 'loading' })));

        const settled = await checkDomainBatch(domains);
        if (seq !== searchSeqRef.current) return;
        setResults(settled);
        recordRdapSnapshot(ideaText, 'generator', settled);
        refreshGlobalStats();
      } catch (err) {
        setAiError(err instanceof Error ? err.message : 'Unable to generate AI domain ideas.');
      } finally {
        setAiLoading(false);
      }
    },
    [refreshGlobalStats, recordRdapSnapshot]
  );

  const runBulkResearch = useCallback(
    async (rawText: string) => {
      const lines = rawText
        .split(/\r?\n/)
        .map(sanitizeFullDomain)
        .filter(Boolean);
      const unique = Array.from(new Set(lines)).slice(0, 50);
      if (unique.length === 0) {
        showToast('Paste at least one domain name');
        return;
      }

      const seq = ++searchSeqRef.current;
      const entries = unique.map((d) => ({ domain: d, isHack: false }));
      setResults(unique.map((d) => ({ domain: d, status: 'loading' })));

      const settled = await checkDomainBatch(entries);
      if (seq !== searchSeqRef.current) return;
      setResults(settled);
      recordRdapSnapshot(`bulk (${unique.length})`, 'research', settled);
      refreshGlobalStats();
    },
    [showToast, refreshGlobalStats, recordRdapSnapshot]
  );

  const runRadarProbe = useCallback(
    async (rawInput: string) => {
      const label = sanitizeLabel(rawInput);
      if (!label) return;
      const entries = CORE_TLDS.map((tld) => ({ domain: `${label}.${tld}`, isHack: false }));
      const settled = await checkDomainBatch(entries);
      recordRdapSnapshot(label, 'search', settled);
      refreshGlobalStats();
    },
    [recordRdapSnapshot, refreshGlobalStats]
  );

  const runAftermarketRadarProbe = useCallback(
    (rawInput: string) => {
      const label = sanitizeLabel(rawInput) || sanitizeLabel(query) || 'brand';
      const premiumList = getPremiumShowcaseDomains(label);
      recordRdapSnapshot(label, 'premium', premiumList);
      showToast(`Loaded aftermarket pricing for "${label}"`);
    },
    [query, recordRdapSnapshot, showToast]
  );

  useEffect(() => {
    if (route === '/radar' && scanHistory.length === 0) {
      runRadarProbe('ama');
    }
  }, [route, scanHistory.length, runRadarProbe]);

  const navigateTo = useCallback(
    (targetPath: string) => {
      const next = normalizePath(targetPath);
      if (window.location.pathname !== next) {
        window.history.pushState({}, '', next);
      }
      setRoute(next);
      setMobileNavOpen(false);
      setOpenDropdownDomain(null);
      setBannerDropdownOpen(false);

      const mappedMode = MODE_ROUTES[next];
      if (mappedMode) {
        setMode(mappedMode);
        if (mappedMode === 'research') {
          runBulkResearch(bulkText);
        } else if (mappedMode !== 'generator') {
          runInstantSearch(query, mappedMode);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [bulkText, query, runBulkResearch, runInstantSearch]
  );

  useEffect(() => {
    const mappedMode = MODE_ROUTES[route];
    if (mappedMode && mappedMode !== 'generator' && mappedMode !== 'research' && results.length === 0) {
      runInstantSearch(query, mappedMode);
    } else if (mappedMode === 'research' && results.length === 0) {
      runBulkResearch(bulkText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const next = normalizePath(window.location.pathname);
      setRoute(next);
      const mappedMode = MODE_ROUTES[next];
      if (mappedMode) setMode(mappedMode);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const handleDocClick = () => {
      setOpenDropdownDomain(null);
      setBannerDropdownOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownDomain(null);
        setBannerDropdownOpen(false);
        setWhoisItem(null);
        setNotifyItem(null);
        setBookmarksOpen(false);
        setSettingsOpen(false);
        setAuthModalOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSearchInputChange = (val: string) => {
    setQuery(val);
    if (!MODE_ROUTES[route] || mode === 'generator' || mode === 'research') {
      window.history.pushState({}, '', '/');
      setRoute('/');
      setMode('search');
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      const activeMode = mode === 'generator' || mode === 'research' ? 'search' : mode;
      runInstantSearch(val, activeMode);
    }, 300);
  };

  const handleSelectTab = (tab: (typeof WORKSPACE_TABS)[number]) => {
    setMode(tab.id);
    if (window.location.pathname !== tab.path) {
      window.history.pushState({}, '', tab.path);
    }
    setRoute(tab.path);

    if (tab.id === 'generator') {
      runGeneratorSearch(aiIdea);
    } else if (tab.id === 'research') {
      runBulkResearch(bulkText);
    } else {
      runInstantSearch(query, tab.id);
    }
  };

  const handleTrySearch = (preset: string) => {
    setQuery(preset);
    setMode('search');
    window.history.pushState({}, '', '/');
    setRoute('/');
    runInstantSearch(preset, 'search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleBookmark = async (item: DomainResult) => {
    const exists = bookmarks.some((b) => b.domain === item.domain);

    if (currentUser) {
      const docId = domainToDocId(item.domain);
      const bmPath = `users/${currentUser.uid}/bookmarks/${docId}`;
      const ref = doc(db, 'users', currentUser.uid, 'bookmarks', docId);
      try {
        if (exists) {
          await deleteDoc(ref);
          showToast(`Removed ${item.domain} from cloud watchlist`);
        } else {
          await setDoc(ref, {
            id: docId,
            domain: item.domain.toLowerCase().slice(0, 253),
            status: item.status,
            price: item.price ? String(item.price).slice(0, 32) : null,
            userId: currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          showToast(`Saved ${item.domain} to cloud watchlist`);
        }
      } catch (err) {
        handleFirestoreError(err, exists ? OperationType.DELETE : OperationType.CREATE, bmPath);
      }
      return;
    }

    setBookmarks((prev) => {
      if (exists) {
        showToast(`Removed ${item.domain}`);
        return prev.filter((b) => b.domain !== item.domain);
      }
      showToast(`Saved ${item.domain}`);
      return [{ domain: item.domain, status: item.status, price: item.price }, ...prev];
    });
  };

  const removeBookmarkByDomain = async (domain: string) => {
    if (currentUser) {
      const docId = domainToDocId(domain);
      const bmPath = `users/${currentUser.uid}/bookmarks/${docId}`;
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'bookmarks', docId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, bmPath);
      }
      return;
    }
    setBookmarks((prev) => prev.filter((b) => b.domain !== domain));
  };

  const clearAllBookmarks = async () => {
    if (currentUser) {
      const bmPath = `users/${currentUser.uid}/bookmarks`;
      try {
        const batch = writeBatch(db);
        bookmarks.forEach((b) => {
          batch.delete(doc(db, 'users', currentUser.uid, 'bookmarks', domainToDocId(b.domain)));
        });
        await batch.commit();
        showToast('Cleared cloud watchlist');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, bmPath);
      }
      return;
    }
    setBookmarks([]);
    showToast('Cleared watchlist');
  };

  const saveDomainAlert = async (payload: {
    domain: string;
    channel: AlertChannel;
    trigger: AlertTrigger;
    expiresAt: string | null;
    maxPriceUsd: number | null;
  }) => {
    const cleanDomain = payload.domain.toLowerCase().slice(0, 253);
    const docId = domainToDocId(cleanDomain);
    const safeExpires = payload.expiresAt ? payload.expiresAt.slice(0, 64) : null;
    const safeMaxPrice =
      typeof payload.maxPriceUsd === 'number' &&
      Number.isFinite(payload.maxPriceUsd) &&
      payload.maxPriceUsd >= 1 &&
      payload.maxPriceUsd <= 10_000_000
        ? Math.round(payload.maxPriceUsd)
        : null;

    // Allow re-evaluation when user edits an alert's budget or trigger
    notifiedDomainsRef.current.forEach((key) => {
      if (key === cleanDomain || key.startsWith(`${cleanDomain}:`)) {
        notifiedDomainsRef.current.delete(key);
      }
    });

    const budgetSuffix = safeMaxPrice != null ? ` (max $${safeMaxPrice.toLocaleString()})` : '';

    if (currentUser && currentUser.email) {
      const alertPath = `users/${currentUser.uid}/domainAlerts/${docId}`;
      const ref = doc(db, 'users', currentUser.uid, 'domainAlerts', docId);
      try {
        const existingSnap = await getDoc(ref);
        if (existingSnap.exists()) {
          await updateDoc(ref, {
            channel: payload.channel,
            trigger: payload.trigger,
            expiresAt: safeExpires,
            maxPriceUsd: safeMaxPrice,
            active: true,
            updatedAt: serverTimestamp()
          });
        } else {
          await setDoc(ref, {
            id: docId,
            domain: cleanDomain,
            userId: currentUser.uid,
            email: currentUser.email.slice(0, 160),
            channel: payload.channel,
            trigger: payload.trigger,
            expiresAt: safeExpires,
            maxPriceUsd: safeMaxPrice,
            active: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        showToast(`Alert active for ${cleanDomain}${budgetSuffix} (${payload.channel})`);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, alertPath);
      }
    } else {
      setAlerts((prev) => {
        const filtered = prev.filter((a) => a.domain !== cleanDomain);
        return [
          {
            id: docId,
            domain: cleanDomain,
            channel: 'browser',
            trigger: payload.trigger,
            email: null,
            expiresAt: safeExpires,
            maxPriceUsd: safeMaxPrice,
            active: true
          },
          ...filtered
        ];
      });
      showToast(`Browser alert set for ${cleanDomain}${budgetSuffix}`);
    }

    if (
      (payload.channel === 'browser' || payload.channel === 'both') &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification('Domain Hunter Alert Set', {
          body: safeMaxPrice != null
            ? `Monitoring ${cleanDomain} — notifies only if available or priced at $${safeMaxPrice.toLocaleString()} or less.`
            : `Monitoring ${cleanDomain} for availability & expiration.`
        });
      } catch {
        // ignore notification errors in constrained iframes
      }
    }
  };

  const removeDomainAlert = async (domain: string) => {
    const cleanDomain = domain.toLowerCase().slice(0, 253);
    if (currentUser) {
      const docId = domainToDocId(cleanDomain);
      const alertPath = `users/${currentUser.uid}/domainAlerts/${docId}`;
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'domainAlerts', docId));
        showToast(`Removed alert for ${cleanDomain}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, alertPath);
      }
      return;
    }

    setAlerts((prev) => prev.filter((a) => a.domain !== cleanDomain));
    showToast(`Removed alert for ${cleanDomain}`);
  };

  // Trigger browser notifications when an alerted domain becomes available or meets its budget threshold
  useEffect(() => {
    const watched = alerts.filter(
      (a) => a.active && (a.channel === 'browser' || a.channel === 'both')
    );
    if (watched.length === 0) return;

    const triggerLocalAlert = (alert: DomainAlertItem, matchedPriceUsd?: number | null) => {
      const key = `${alert.domain}:${alert.trigger}:${alert.maxPriceUsd ?? 'none'}`;
      if (notifiedDomainsRef.current.has(key)) return;
      notifiedDomainsRef.current.add(key);

      const message =
        matchedPriceUsd != null && alert.maxPriceUsd != null
          ? `${alert.domain} is $${matchedPriceUsd.toLocaleString()} (within your $${alert.maxPriceUsd.toLocaleString()} budget)!`
          : `${alert.domain} is now available!`;

      showToast(message);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(
            matchedPriceUsd != null ? 'Domain Price Within Budget' : 'Domain Available Now',
            { body: message }
          );
        } catch {
          // ignore notification error
        }
      }
    };

    const evaluateResultAgainstAlert = (item: DomainResult) => {
      const alert = watched.find((a) => a.domain === item.domain);
      if (!alert) return;

      if (item.status === 'available' || item.status === 'hack') {
        triggerLocalAlert(alert, null);
        return;
      }

      if (item.status === 'premium' && alert.trigger === 'price_below_budget' && alert.maxPriceUsd != null) {
        const currentUsd = parseUsdPrice(item.price);
        if (currentUsd !== null && currentUsd <= alert.maxPriceUsd) {
          triggerLocalAlert(alert, currentUsd);
        }
      }
    };

    for (const r of results) {
      evaluateResultAgainstAlert(r);
    }

    const timer = window.setInterval(async () => {
      const subset = watched.slice(0, 10).map((a) => ({ domain: a.domain, isHack: false }));
      if (subset.length === 0) return;
      const checked = await checkDomainBatch(subset);
      for (const item of checked) {
        evaluateResultAgainstAlert(item);
      }
    }, 300_000);

    return () => window.clearInterval(timer);
  }, [alerts, results, showToast]);

  const handleCopy = async (text: string, label?: string) => {
    const ok = await copyTextToClipboard(text);
    showToast(ok ? label || `Copied ${text}` : 'Clipboard unavailable');
  };

  const handleCopyAllAvailable = async () => {
    const avail = results
      .filter((r) => r.status === 'available' || r.status === 'hack')
      .map((r) => r.domain);
    if (avail.length === 0) {
      showToast('No available domains to copy');
      return;
    }
    await handleCopy(avail.join('\n'), `Copied ${avail.length} available domains`);
  };

  const handleCsvUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const content = await file.text();
      const tokens = content
        .split(/[\r\n,;\t\s]+/)
        .map((t) => sanitizeFullDomain(t.replace(/^["']|["']$/g, '')))
        .filter((d) => Boolean(d) && /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d));
      const unique = Array.from(new Set(tokens)).slice(0, 50);
      if (unique.length === 0) {
        showToast('No valid domain names found in uploaded file');
        return;
      }
      const nextText = unique.join('\n');
      setCsvFilename(`${file.name} (${unique.length} domains)`);
      setBulkText(nextText);
      runBulkResearch(nextText);
      showToast(`Imported ${unique.length} domains from ${file.name}`);
    } catch {
      showToast('Unable to read uploaded file');
    }
  };

  const handleExportResultsCsv = () => {
    if (results.length === 0) {
      showToast('No scanned domains to export');
      return;
    }
    const header = 'domain,status,price';
    const rows = results.map(
      (r) => `"${r.domain.replace(/"/g, '')}","${r.status}","${(r.price || '').replace(/"/g, '')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `domain-hunter-results.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${results.length} domains to CSV`);
  };

  const toggleTld = (tld: string) => {
    setSelectedTlds((prev) => {
      const next = prev.includes(tld)
        ? prev.length > 1
          ? prev.filter((t) => t !== tld)
          : prev
        : [...prev, tld];
      if (MODE_ROUTES[route] === 'search') {
        runInstantSearch(query, 'search', next);
      }
      return next;
    });
  };

  const handleSignOut = async () => {
    await signOutUser();
    showToast('Signed out');
  };

  const filteredResults = useMemo(() => {
    if (statusFilter === 'all') return results;
    if (statusFilter === 'available') {
      return results.filter((r) => r.status === 'available' || r.status === 'hack');
    }
    return results.filter((r) => r.status === statusFilter);
  }, [results, statusFilter]);

  const primaryResult = useMemo<DomainResult>(() => {
    return (
      results.find((r) => r.domain.endsWith('.com')) ||
      results[0] || {
        domain: `${sanitizeLabel(query) || 'velorapay'}.com`,
        status: 'loading'
      }
    );
  }, [results, query]);

  const stats = useMemo(() => {
    const total = results.length || 1;
    const avail = results.filter((r) => r.status === 'available' || r.status === 'hack').length;
    const premium = results.filter((r) => r.status === 'premium').length;
    const taken = results.filter((r) => r.status === 'taken').length;
    return {
      availPct: (avail / total) * 100,
      premPct: (premium / total) * 100,
      takenPct: (taken / total) * 100,
      availCount: avail,
      takenCount: taken
    };
  }, [results]);

  const getHeroColors = (status: DomainResult['status']) => {
    switch (status) {
      case 'available':
      case 'hack':
        return {
          title: 'text-emerald-600 dark:text-emerald-400',
          badge: 'Available',
          buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-white',
          divider: 'border-white/25',
          label: 'Continue'
        };
      case 'premium':
        return {
          title: 'text-sky-600 dark:text-sky-400',
          badge: 'Aftermarket',
          buttonBg: 'bg-sky-600 hover:bg-sky-500 text-white',
          divider: 'border-white/25',
          label: 'Make offer'
        };
      case 'taken':
        return {
          title: 'text-rose-600 dark:text-rose-400',
          badge: 'Registered',
          buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white',
          divider: 'border-white/25',
          label: 'Lookup'
        };
      default:
        return {
          title: 'text-slate-500 dark:text-zinc-400',
          badge: status === 'loading' ? 'Checking' : 'Unknown',
          buttonBg: 'bg-slate-700 hover:bg-slate-600 text-white',
          divider: 'border-white/20',
          label: status === 'loading' ? 'Checking...' : 'Check Manually'
        };
    }
  };

  const heroColors = getHeroColors(primaryResult.status);
  const isWorkspaceRoute = Boolean(MODE_ROUTES[route]);

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
      active
        ? 'text-slate-900 dark:text-white border-emerald-500'
        : 'text-slate-600 dark:text-zinc-400 border-transparent hover:text-slate-900 dark:hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-[#09090b] text-slate-900 dark:text-zinc-100 transition-colors">
      {/* 3-Zone Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/85 dark:bg-[#09090b]/85 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Brand Logo */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('/');
            }}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg"
          >
            <DomainHunterLogo />
          </a>

          {/* Zone 2: Concise 5-Link Primary Navigation */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-6">
            <a href="/" onClick={(e) => { e.preventDefault(); navigateTo('/'); }} className={navLinkClass(route === '/')}>
              Search
            </a>
            <a href="/extensions" onClick={(e) => { e.preventDefault(); navigateTo('/extensions'); }} className={navLinkClass(route === '/extensions')}>
              Extensions
            </a>
            <a href="/generator" onClick={(e) => { e.preventDefault(); navigateTo('/generator'); }} className={navLinkClass(route === '/generator')}>
              AI Studio
            </a>
            <a href="/tools" onClick={(e) => { e.preventDefault(); navigateTo('/tools'); }} className={navLinkClass(Boolean(TOOLS_ROUTE_TABS[route]))}>
              Tools
            </a>
            <a href="/radar" onClick={(e) => { e.preventDefault(); navigateTo('/radar'); }} className={navLinkClass(route === '/radar')}>
              Radar
            </a>
          </nav>

          {/* Zone 3: Watchlist + Account / Log In */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setBookmarksOpen(true)}
              aria-label="Open saved watchlist"
              className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] text-xs font-medium text-slate-700 dark:text-zinc-200 hover:border-emerald-500/40 transition-colors whitespace-nowrap shrink-0"
            >
              <Bookmark className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">Watchlist</span>
              <span className="tabular-nums text-slate-500 dark:text-zinc-400">{bookmarks.length}</span>
            </button>

            {authReady && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08]">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center justify-center">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs font-medium text-slate-800 dark:text-zinc-200 max-w-[110px] truncate">
                    {currentUser.displayName || currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="p-2 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-300 hover:text-rose-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileNavOpen((o) => !o)}
              aria-label="Toggle navigation menu"
              className="p-2 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-zinc-300 hover:border-emerald-500/40 transition-colors"
            >
              {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Accordion Navigation Drawer */}
        {mobileNavOpen && (
          <div className="border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#09090b]">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 divide-y divide-slate-200 dark:divide-white/[0.08]">
              {(
                [
                  {
                    id: 'finding' as const,
                    title: 'Finding domains',
                    links: [
                      { path: '/', label: 'Domain name search' },
                      { path: '/extensions', label: 'Domain extensions (20+ TLDs)' },
                      { path: '/generator', label: 'AI Domain generator' },
                      { path: '/premium', label: 'Aftermarket & premium domains' },
                      { path: '/expired', label: 'Expired domains finder' },
                      { path: '/research', label: 'Bulk CSV domain search' }
                    ]
                  },
                  {
                    id: 'tools' as const,
                    title: 'Domain tools',
                    links: [
                      { path: '/tools', label: 'Domain research & brand score' },
                      { path: '/appraisal', label: 'Domain appraisal calculator' },
                      { path: '/trademark', label: 'Trademark & social handle check' },
                      { path: '/reverse-dictionary', label: 'Reverse dictionary combiner' },
                      { path: '/radar', label: 'Registry Radar & D3 analytics' }
                    ]
                  },
                  {
                    id: 'resources' as const,
                    title: 'Resources',
                    links: [
                      { path: '/guides', label: 'Strategy & How-To guides' },
                      { path: '/faq', label: 'FAQs' },
                      { path: '/security', label: 'Security architecture' }
                    ]
                  },
                  {
                    id: 'company' as const,
                    title: 'Company',
                    links: [
                      { path: '/contact', label: 'Contact support' },
                      { path: '/terms', label: 'Terms of Service' },
                      { path: '/privacy', label: 'Privacy Policy' }
                    ]
                  }
                ] as const
              ).map((group) => {
                const isOpen = openNavGroup === group.id;
                return (
                  <div key={group.id} className="py-2.5">
                    <button
                      type="button"
                      onClick={() => setOpenNavGroup(group.id)}
                      className="w-full flex items-center justify-between py-1.5 text-sm font-semibold text-slate-900 dark:text-white"
                    >
                      <span>{group.title}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    {isOpen && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-2 pb-1">
                        {group.links.map((item) => (
                          <a
                            key={item.path}
                            href={item.path}
                            onClick={(e) => {
                              e.preventDefault();
                              navigateTo(item.path);
                            }}
                            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                              route === item.path
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                            }`}
                          >
                            {item.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        {route === '/radar' ? (
          <DomainRadarView
            scanHistory={scanHistory}
            isDark={isDark}
            onRunRadarProbe={runRadarProbe}
            onRunAftermarketProbe={runAftermarketRadarProbe}
            onClearHistory={() => {
              setScanHistory([]);
              showToast('Cleared RDAP radar history');
            }}
            onTryQuery={handleTrySearch}
          />
        ) : TOOLS_ROUTE_TABS[route] ? (
          <DomainToolsView
            initialTab={TOOLS_ROUTE_TABS[route]}
            initialDomain={primaryResult.domain}
            onNavigate={navigateTo}
            onTrySearch={handleTrySearch}
            onToggleBookmark={toggleBookmark}
            onOpenNotify={(selected) => setNotifyItem(selected)}
            onInspectWhois={(selected) => setWhoisItem(selected)}
            bookmarkedDomains={bookmarks.map((b) => b.domain)}
            alertDomains={alerts.filter((a) => a.active).map((a) => a.domain)}
          />
        ) : INFO_ROUTES.has(route) || !isWorkspaceRoute ? (
          <InfoPages route={route} onNavigate={navigateTo} onTrySearch={handleTrySearch} />
        ) : (
          <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-8">
            {/* Original Domain Hunter Hero Copy */}
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h1
                className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-3"
                style={{ textWrap: 'balance' }}
              >
                Hunt the right domain <span className="font-serif-domain italic text-emerald-500">before</span> it&apos;s gone.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
                Real-time registry verification via RDAP &amp; DNS, Gemini-powered brand naming, and cloud-synced watchlists across 20+ extensions.
              </p>
            </div>

            {/* Search Input Bar */}
            <div className="max-w-3xl mx-auto mb-5">
              <div className="flex items-center rounded-2xl bg-white dark:bg-[#111114] border border-slate-300 dark:border-white/[0.12] focus-within:border-emerald-500 p-1.5 shadow-lg">
                <div className="pl-3 pr-2 text-slate-400 shrink-0" aria-hidden="true">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (debounceRef.current) window.clearTimeout(debounceRef.current);
                      const activeMode = mode === 'generator' || mode === 'research' ? 'search' : mode;
                      runInstantSearch(query, activeMode);
                    }
                  }}
                  placeholder="Enter a brand or domain name (e.g. velorapay, nexora, pingila)..."
                  aria-label="Search domains"
                  className="w-full bg-transparent px-2 py-2.5 text-base text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (debounceRef.current) window.clearTimeout(debounceRef.current);
                    const activeMode = mode === 'generator' || mode === 'research' ? 'search' : mode;
                    runInstantSearch(query, activeMode);
                  }}
                  className="px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
                >
                  Hunt
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-zinc-400 px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span>Try:</span>
                  {['velorapay', 'nexora', 'pingila', 'ama'].map((preset, idx) => (
                    <React.Fragment key={preset}>
                      {idx > 0 && <span aria-hidden="true">&middot;</span>}
                      <button
                        type="button"
                        onClick={() => handleTrySearch(preset)}
                        className="hover:text-slate-900 dark:hover:text-white underline decoration-slate-300 dark:decoration-zinc-700 underline-offset-4"
                      >
                        {preset}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                <div className="flex items-center gap-3.5">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>Available</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#2596ff]"></span>Aftermarket</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>Taken</span>
                </div>
              </div>
            </div>

            {/* Workspace Mode Tabs */}
            <div className="max-w-3xl mx-auto mb-7 flex items-center justify-center">
              <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] overflow-x-auto max-w-full">
                {WORKSPACE_TABS.map((tab) => {
                  const active = mode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleSelectTab(tab)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                        active
                          ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mode Panels: AI Studio & Bulk Scanner */}
            {mode === 'generator' && (
              <div className="max-w-3xl mx-auto mb-6 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-3">
                <label htmlFor="aiIdeaInput" className="block text-xs font-medium text-slate-500 dark:text-zinc-400">
                  Gemini AI Studio — describe your startup or niche to synthesize 6 brandable names &amp; verify .com / .ai availability
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="aiIdeaInput"
                    type="text"
                    value={aiIdea}
                    onChange={(e) => setAiIdea(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && runGeneratorSearch(aiIdea)}
                    placeholder="e.g. AI workflow for clinics"
                    className="flex-1 rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => runGeneratorSearch(aiIdea)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white whitespace-nowrap"
                  >
                    {aiLoading ? 'Generating...' : 'Generate Names'}
                  </button>
                </div>
                {aiError && (
                  <p className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3.5 py-2.5">
                    {aiError}
                  </p>
                )}
                {aiTaglines.length > 0 && !aiError && (
                  <div className="text-xs text-slate-600 dark:text-zinc-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    {aiTaglines.map((t) => (
                      <span key={t.name}>
                        <strong className="text-slate-900 dark:text-zinc-200">{t.name}</strong>: {t.tagline}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'research' && (
              <div className="max-w-3xl mx-auto mb-6 rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="bulkDomainsInput" className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                    Bulk CSV &amp; Batch Domain Scanner (up to 50 domains per live RDAP batch)
                  </label>
                  <div className="flex items-center gap-3 text-xs font-mono-tech text-slate-500 tabular-nums">
                    {csvFilename && (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>{csvFilename}</span>
                      </span>
                    )}
                    <span>
                      {Math.min(bulkText.split(/\r?\n/).filter((l) => l.trim()).length, 50)} / 50
                    </span>
                  </div>
                </div>

                {/* CSV Upload / Drop Zone */}
                <label className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 dark:border-white/[0.15] bg-slate-50/70 dark:bg-black/40 px-4 py-3 cursor-pointer hover:border-emerald-500/60 transition-colors">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-zinc-300">
                    <Upload className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Import domain shortlist from <strong>.csv</strong> or <strong>.txt</strong> file</span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-white dark:bg-[#18181b] border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-800 dark:text-zinc-200">
                    Choose File
                  </span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      handleCsvUpload(f);
                      e.target.value = '';
                    }}
                  />
                </label>

                <textarea
                  id="bulkDomainsInput"
                  rows={4}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] p-3 text-xs font-mono-tech text-slate-900 dark:text-zinc-200 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sample = 'velorapay.com\nnexora.ai\npingila.com\nama.ai\naethercloud.io\nsentinelvault.app\nmintledger.com\nlucidflow.dev';
                      setCsvFilename('Sample_Shortlist.csv (8 domains)');
                      setBulkText(sample);
                      runBulkResearch(sample);
                    }}
                    className="text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white underline underline-offset-4"
                  >
                    Load 8-domain sample CSV
                  </button>

                  <button
                    type="button"
                    onClick={() => runBulkResearch(bulkText)}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold text-white whitespace-nowrap"
                  >
                    Scan All Domains
                  </button>
                </div>
              </div>
            )}

            {/* Primary .com Result Card */}
            <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 sm:p-6 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1">
                    Primary Extension · {heroColors.badge}
                    {primaryResult.price
                      ? ` · ${formatDomainPrice(primaryResult.price, currency, pricingFeed.usdToInr) || primaryResult.price}/yr`
                      : ''}
                    {primaryResult.renewalPrice && (primaryResult.status === 'available' || primaryResult.status === 'hack')
                      ? ` · Renews ${formatDomainPrice(primaryResult.renewalPrice, currency, pricingFeed.usdToInr) || primaryResult.renewalPrice}/yr`
                      : ''}
                  </div>
                  <h2 className={`font-serif-domain text-2xl sm:text-3xl font-bold tracking-tight break-all ${heroColors.title}`}>
                    {primaryResult.domain}
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <div className={`inline-flex items-stretch rounded-xl overflow-hidden ${heroColors.buttonBg} transition-colors`}>
                      <button
                        type="button"
                        disabled={primaryResult.status === 'loading'}
                        onClick={() => setWhoisItem(primaryResult)}
                        className="px-4 py-2 text-sm font-semibold whitespace-nowrap tabular-nums"
                      >
                        {(primaryResult.status === 'available' || primaryResult.status === 'hack') && primaryResult.price
                          ? formatDomainPrice(primaryResult.price, currency, pricingFeed.usdToInr) || heroColors.label
                          : heroColors.label}
                      </button>
                      <button
                        type="button"
                        disabled={primaryResult.status === 'loading'}
                        onClick={() => setBannerDropdownOpen((o) => !o)}
                        aria-label={`Registrars for ${primaryResult.domain}`}
                        className={`px-2.5 py-2 border-l ${heroColors.divider} flex items-center justify-center`}
                      >
                        {bannerDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>

                    {bannerDropdownOpen && (
                      <RegistrarDropdown
                        domain={primaryResult.domain}
                        status={primaryResult.status}
                        price={primaryResult.price}
                        renewalPrice={primaryResult.renewalPrice}
                        currency={currency}
                        usdToInr={pricingFeed.usdToInr}
                        tldPricing={pricingFeed.tlds}
                        pricingSource={pricingFeed.source}
                        onClose={() => setBannerDropdownOpen(false)}
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setWhoisItem(primaryResult)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs sm:text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    WHOIS
                  </button>

                  {(primaryResult.status === 'taken' || primaryResult.status === 'premium') && (
                    <button
                      type="button"
                      onClick={() => setNotifyItem(primaryResult)}
                      aria-label={
                        primaryResult.status === 'premium'
                          ? `Set budget alert for ${primaryResult.domain}`
                          : `Notify me when ${primaryResult.domain} expires or becomes available`
                      }
                      title={
                        primaryResult.status === 'premium'
                          ? 'Notify me when price drops within budget'
                          : 'Notify me when available or expiring'
                      }
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                        alerts.some((a) => a.domain === primaryResult.domain && a.active)
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : 'bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-700 dark:text-zinc-200 hover:text-amber-500'
                      }`}
                    >
                      {alerts.some((a) => a.domain === primaryResult.domain && a.active) ? (
                        <BellRing className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      <span>Notify me</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleBookmark(primaryResult)}
                    aria-label="Save primary domain"
                    className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-slate-600 dark:text-zinc-300"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Results List / Extensions Matrix Container */}
            <div className="max-w-3xl mx-auto rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-2 border-b border-slate-200 dark:border-white/[0.08]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-20 sm:w-28 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-800 overflow-hidden flex shrink-0">
                    <div className="h-full bg-[#22c55e] transition-all duration-300" style={{ width: `${stats.availPct}%` }} />
                    <div className="h-full bg-[#2596ff] transition-all duration-300" style={{ width: `${stats.premPct}%` }} />
                    <div className="h-full bg-[#ef4444] transition-all duration-300" style={{ width: `${stats.takenPct}%` }} />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                    {stats.availCount} available &middot; {stats.takenCount} taken
                  </span>
                </div>

                {/* Filter + Currency + Layout + Export Controls */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
                    {(['USD', 'INR'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setCurrency(curr)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono-tech font-medium transition-colors ${
                          currency === curr
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {curr === 'USD' ? '$ USD' : '₹ INR'}
                      </button>
                    ))}
                  </div>

                  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
                    {(['all', 'available', 'premium', 'taken'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setStatusFilter(f)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium capitalize transition-colors ${
                          statusFilter === f
                            ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {mode === 'extensions' && (
                    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08]">
                      <button
                        type="button"
                        onClick={() => setExtensionsLayout('list')}
                        aria-label="List view"
                        className={`p-1 rounded-md ${extensionsLayout === 'list' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white' : 'text-slate-500'}`}
                      >
                        <List className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExtensionsLayout('grid')}
                        aria-label="Matrix grid view"
                        className={`p-1 rounded-md ${extensionsLayout === 'grid' ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white' : 'text-slate-500'}`}
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {mode === 'research' && (
                    <button
                      type="button"
                      onClick={handleExportResultsCsv}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyAllAvailable}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Copy available</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Extension settings"
                    className="p-1.5 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                {filteredResults.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    {results.length === 0
                      ? 'Type a name above or click Generate Names to check live availability.'
                      : 'No domains match the selected status filter.'}
                  </div>
                ) : mode === 'extensions' && extensionsLayout === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-2">
                    {filteredResults.map((item) => {
                      const ext = `.${item.domain.split('.').slice(1).join('.')}`;
                      const isAvail = item.status === 'available' || item.status === 'hack';
                      const gridPrice = formatDomainPrice(item.price, currency, pricingFeed.usdToInr);
                      const cardStyle = isAvail
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                        : item.status === 'premium'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-700 dark:text-sky-300'
                        : 'bg-rose-500/12 border-rose-500/35 text-rose-700 dark:text-rose-300';
                      return (
                        <button
                          key={item.domain}
                          type="button"
                          onClick={() => setWhoisItem(item)}
                          className={`p-3 rounded-xl border text-left transition-colors hover:brightness-110 ${cardStyle}`}
                        >
                          <div className="font-mono-tech text-sm font-bold truncate">{ext}</div>
                          <div className="text-[11px] opacity-85 mt-0.5 capitalize truncate tabular-nums">
                            {item.status}{gridPrice ? ` · ${gridPrice}` : ''}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  filteredResults.map((item) => (
                    <DomainRow
                      key={item.domain}
                      item={item}
                      isBookmarked={bookmarks.some((b) => b.domain === item.domain)}
                      hasAlert={alerts.some((a) => a.domain === item.domain && a.active)}
                      isDropdownOpen={openDropdownDomain === item.domain}
                      currency={currency}
                      usdToInr={pricingFeed.usdToInr}
                      tldPricing={pricingFeed.tlds}
                      pricingSource={pricingFeed.source}
                      onToggleBookmark={toggleBookmark}
                      onOpenNotify={(selected) => setNotifyItem(selected)}
                      onToggleDropdown={(domain) =>
                        setOpenDropdownDomain((prev) => (prev === domain ? null : domain))
                      }
                      onCloseDropdown={() => setOpenDropdownDomain(null)}
                      onPrimaryAction={(selected) => setWhoisItem(selected)}
                      onInspectMore={(selected) => setWhoisItem(selected)}
                    />
                  ))
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 dark:text-zinc-500">
                <span>
                  {pricingFeed.source === 'live_porkbun'
                    ? 'Pricing: Live Porkbun TLD rates + registrar comparisons'
                    : 'Pricing: 2026 registrar benchmark TLD rates (auto-syncs live feed when reachable)'}
                </span>
                <span className="font-mono-tech tabular-nums">
                  1 USD = ₹{pricingFeed.usdToInr.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Market Health & TLD Popularity Index Widget */}
            <MarketHealthWidget
              scanHistory={scanHistory}
              variant="compact"
              onOpenRadar={() => navigateTo('/radar')}
              onScanBaseline={() => runInstantSearch(query || 'velorapay', 'search')}
              onSelectTldQuery={(tld) => {
                setSelectedTlds((prev) => (prev.includes(tld) ? prev : [tld, ...prev]));
                navigateTo('/extensions');
              }}
            />

            {/* Domain Hunter Capabilities Overview on Home Search */}
            {route === '/' && (
              <div className="max-w-3xl mx-auto mt-10 pt-8 border-t border-slate-200 dark:border-white/[0.08]">
                <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                      Explore Domain Hunter Tools
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
                      Private RDAP lookups, CSV batch scanning, brandability scoring, and expiring domain monitoring
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    {
                      path: '/tools',
                      title: 'Brand Score, Appraisal & Socials',
                      desc: 'Check brandability, pronunciation score, USPTO/WIPO trademark overlap, and live developer/social handles.'
                    },
                    {
                      path: '/expired',
                      title: 'Expired & Dropping Domains',
                      desc: 'Filter pending-delete and recently dropped domains with one-click live RDAP verification and drop alerts.'
                    },
                    {
                      path: '/research',
                      title: 'Bulk CSV Scanner & Exporter',
                      desc: 'Upload a .csv shortlist, run 50 parallel RDAP checks, filter available picks, and export clean results.'
                    },
                    {
                      path: '/reverse-dictionary',
                      title: 'Reverse Dictionary Combiner',
                      desc: 'Turn product concepts like "fast", "secure", or "cloud" into synonym domain ideas verified in real time.'
                    }
                  ].map((card) => (
                    <button
                      key={card.path}
                      type="button"
                      onClick={() => navigateTo(card.path)}
                      className="text-left rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/50 p-5 transition-colors"
                    >
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {card.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
                        {card.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <FooterCard
        isDark={isDark}
        onToggleTheme={setIsDark}
        language={language}
        onChangeLanguage={(lang) => {
          setLanguage(lang);
          showToast('Language preference updated');
        }}
        domainsVerified={domainsVerified}
        onNavigate={navigateTo}
        onOpenBookmarks={() => setBookmarksOpen(true)}
      />

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(email) => showToast(`Signed in as ${email || 'Google user'}`)}
      />

      <WhoisModal
        item={whoisItem}
        currency={currency}
        usdToInr={pricingFeed.usdToInr}
        tldPricing={pricingFeed.tlds}
        onClose={() => setWhoisItem(null)}
        onCopy={(txt) => handleCopy(txt)}
      />

      <NotifyAlertModal
        item={notifyItem}
        existingAlert={
          notifyItem ? alerts.find((a) => a.domain === notifyItem.domain) || null : null
        }
        isSignedIn={Boolean(currentUser)}
        userEmail={currentUser?.email || null}
        onPromptLogin={() => setAuthModalOpen(true)}
        onSaveAlert={saveDomainAlert}
        onRemoveAlert={removeDomainAlert}
        onClose={() => setNotifyItem(null)}
      />

      <BookmarksDrawer
        open={bookmarksOpen}
        bookmarks={bookmarks}
        alerts={alerts}
        isSignedIn={Boolean(currentUser)}
        onPromptLogin={() => {
          setBookmarksOpen(false);
          setAuthModalOpen(true);
        }}
        onClose={() => setBookmarksOpen(false)}
        onRemove={removeBookmarkByDomain}
        onRemoveAlert={removeDomainAlert}
        onClearAll={clearAllBookmarks}
        onCopyAll={() =>
          handleCopy(
            bookmarks.map((b) => b.domain).join('\n'),
            `Copied ${bookmarks.length} saved domains`
          )
        }
      />

      <ExtensionSettingsModal
        open={settingsOpen}
        selectedTlds={selectedTlds}
        onToggleTld={toggleTld}
        onClose={() => setSettingsOpen(false)}
      />

      {toastMsg && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl bg-slate-900 dark:bg-[#18181b] border border-slate-700 dark:border-white/[0.12] px-4 py-2.5 text-xs font-medium text-white shadow-2xl">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
