export type DomainStatus = 'available' | 'taken' | 'premium' | 'hack' | 'loading' | 'unknown';

export type SearchMode = 'search' | 'extensions' | 'generator' | 'premium' | 'research';

export type ViewScreen = 'time-machine' | 'workspace';

export interface RdapPayload {
  handle?: string;
  ldhName?: string;
  status?: string[];
  events?: Array<{
    eventAction?: string;
    eventDate?: string;
  }>;
  nameservers?: Array<{
    ldhName?: string;
  }>;
  entities?: Array<{
    roles?: string[];
    vcardArray?: [string, Array<[string, Record<string, unknown>, string, string]>];
  }>;
  remarks?: Array<{
    title?: string;
    description?: string[];
  }>;
}

export type CurrencyCode = 'USD' | 'INR';

export type PriceSource = 'live_porkbun' | 'godaddy_api' | 'catalog_benchmark' | 'aftermarket_est';

export interface TldPricingEntry {
  registrationUsd: number;
  renewalUsd: number;
  transferUsd: number;
}

export interface PricingFeedResponse {
  source: 'live_porkbun' | 'catalog_benchmark';
  updatedAt: string;
  usdToInr: number;
  tlds: Record<string, TldPricingEntry>;
}

export interface RegistrarPriceQuote {
  id: string;
  name: string;
  firstYearUsd: number;
  renewalUsd: number;
  hasPromo?: boolean;
  promoLabel?: string;
  affiliateTag?: string;
  hasAuthDeepLink?: boolean;
  buildUrl: (domain: string) => string;
  buildAuthUrl?: (domain: string) => string;
}

export interface DomainResult {
  domain: string;
  status: DomainStatus;
  price?: string | null;
  renewalPrice?: string | null;
  priceSource?: PriceSource | null;
  rdap?: RdapPayload | null;
  note?: string;
}

export interface BookmarkItem {
  domain: string;
  status: DomainStatus;
  price?: string | null;
}

export type AlertChannel = 'email' | 'browser' | 'both';
export type AlertTrigger = 'expires_or_available' | 'available' | 'expiring' | 'price_below_budget';

export interface DomainAlertItem {
  id: string;
  domain: string;
  channel: AlertChannel;
  trigger: AlertTrigger;
  email?: string | null;
  expiresAt?: string | null;
  maxPriceUsd?: number | null;
  active: boolean;
}

export interface RdapDomainPoint {
  domain: string;
  tld: string;
  status: DomainStatus;
  price?: string | null;
  registeredYear: number | null;
}

export interface PriceHistoryPoint {
  month: string;
  isoMonth: string;
  priceUsd: number;
}

export interface PremiumPriceTrend {
  domain: string;
  currentPriceUsd: number;
  changePct: number;
  history: PriceHistoryPoint[];
}

export interface RdapScanSnapshot {
  id: string;
  query: string;
  mode: SearchMode;
  timestamp: string;
  total: number;
  available: number;
  taken: number;
  premium: number;
  unknown: number;
  domains: RdapDomainPoint[];
}

export interface RegistrarOption {
  id: string;
  name: string;
  hasPromo?: boolean;
  promoLabel?: string;
  affiliateTag?: string;
  hasAuthDeepLink?: boolean;
  color: string;
  buildUrl: (domain: string) => string;
  buildAuthUrl?: (domain: string) => string;
}

export interface SocialHandleResult {
  platform: string;
  handle: string;
  status: 'available' | 'taken' | 'manual_verify';
  profileUrl: string;
  source: 'live_api' | 'direct_link';
}

export interface DomainAnalysisResult {
  domain: string;
  label: string;
  tld: string;
  brandableScore: number;
  pronunciationScore: number;
  lengthScore: number;
  overallGrade: 'Strong' | 'Good' | 'Fair';
  estimatedValueRange: {
    lowUsd: number;
    highUsd: number;
  };
  trademarkRisk: {
    level: 'Low' | 'Moderate' | 'Elevated';
    note: string;
    usptoUrl: string;
    wipoUrl: string;
  };
  appraisalFactors: string[];
}

export interface ExpiredDomainCandidate {
  domain: string;
  tld: string;
  length: number;
  stage: 'Expiring Soon' | 'Pending Delete' | 'Recent Drop';
  dropWindow: string;
  backlinks: number;
  estValueUsd: number;
  category: string;
}

