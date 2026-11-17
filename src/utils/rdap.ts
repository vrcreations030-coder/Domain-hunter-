import type {
  CurrencyCode,
  DomainAnalysisResult,
  DomainResult,
  DomainStatus,
  ExpiredDomainCandidate,
  PremiumPriceTrend,
  PricingFeedResponse,
  RegistrarOption,
  RegistrarPriceQuote,
  SocialHandleResult,
  TldPricingEntry
} from '../types/domain';

export const CORE_TLDS = ['com', 'in', 'net', 'org', 'ai', 'io', 'xyz', 'app', 'online', 'info', 'co', 'store'];

export const EXTENDED_TLDS = [
  'com', 'ai', 'io', 'app', 'dev', 'co', 'xyz', 'net', 'org', 'in',
  'online', 'info', 'store', 'tech', 'cloud', 'design', 'studio', 'shop', 'me', 'us'
];

const envVars = (import.meta as { env?: Record<string, string | undefined> }).env || {};

export interface RegistrarAffiliateTemplate {
  refCode: string;
  checkoutTemplate: string;
  returnPathTemplate?: string;
  authDeepLinkTemplate?: string;
}

export const REGISTRAR_AFFILIATE_TEMPLATES: Record<string, RegistrarAffiliateTemplate> = {
  godaddy: {
    refCode: envVars.VITE_AFFILIATE_GODADDY_ID || 'dhbasari26',
    checkoutTemplate:
      'https://www.godaddy.com/domainsearch/find?domainToCheck={{domain}}&isc={{ref}}&tmskey=dh_affiliate',
    returnPathTemplate: '/domainsearch/find?domainToCheck={{domain}}&isc={{ref}}',
    authDeepLinkTemplate:
      'https://sso.godaddy.com/?realm=idp&app=cart&isc={{ref}}&path={{encodedReturnPath}}'
  },
  porkbun: {
    refCode: envVars.VITE_AFFILIATE_PORKBUN_ID || 'dhbasari26',
    checkoutTemplate:
      'https://porkbun.com/checkout/search?q={{domain}}&ref={{ref}}',
    returnPathTemplate: '/checkout/search?q={{domain}}&ref={{ref}}',
    authDeepLinkTemplate:
      'https://porkbun.com/account/login?redirect={{encodedReturnPath}}&ref={{ref}}'
  },
  namecheap: {
    refCode: envVars.VITE_AFFILIATE_NAMECHEAP_ID || 'dhbasari26',
    checkoutTemplate:
      'https://www.namecheap.com/domains/registration/results/?domain={{domain}}&aff={{ref}}&utm_source=domainhunter&utm_medium=affiliate',
    returnPathTemplate: '/domains/registration/results/?domain={{domain}}&aff={{ref}}',
    authDeepLinkTemplate:
      'https://www.namecheap.com/myaccount/login-only/?ReturnUrl={{encodedReturnPath}}&aff={{ref}}'
  },
  cloudflare: {
    refCode: envVars.VITE_AFFILIATE_CLOUDFLARE_ID || 'dhbasari26',
    checkoutTemplate:
      'https://dash.cloudflare.com/?to=/:account/domains/register&utm_source=domainhunter&utm_campaign={{ref}}',
    returnPathTemplate: '/?to=/:account/domains/register',
    authDeepLinkTemplate:
      'https://dash.cloudflare.com/login?redirect_to={{encodedReturnPath}}'
  }
};

export function interpolateAffiliateUrl(
  registrarId: string,
  domain: string,
  kind: 'checkout' | 'auth' = 'checkout'
): string | null {
  const tpl = REGISTRAR_AFFILIATE_TEMPLATES[registrarId];
  if (!tpl) return null;
  const encodedDomain = encodeURIComponent(domain);
  const encodedRef = encodeURIComponent(tpl.refCode);

  if (kind === 'checkout') {
    return tpl.checkoutTemplate
      .replace(/\{\{domain\}\}/g, encodedDomain)
      .replace(/\{\{ref\}\}/g, encodedRef);
  }

  if (!tpl.authDeepLinkTemplate) return null;
  const rawReturnPath = (tpl.returnPathTemplate || '/')
    .replace(/\{\{domain\}\}/g, encodedDomain)
    .replace(/\{\{ref\}\}/g, encodedRef);

  return tpl.authDeepLinkTemplate
    .replace(/\{\{domain\}\}/g, encodedDomain)
    .replace(/\{\{ref\}\}/g, encodedRef)
    .replace(/\{\{encodedReturnPath\}\}/g, encodeURIComponent(rawReturnPath));
}

export const REGISTRARS: RegistrarOption[] = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Registrar',
    hasPromo: true,
    promoLabel: 'At-Cost',
    affiliateTag: REGISTRAR_AFFILIATE_TEMPLATES.cloudflare.refCode,
    hasAuthDeepLink: true,
    color: '#f38020',
    buildUrl: (d) =>
      interpolateAffiliateUrl('cloudflare', d, 'checkout') ||
      'https://dash.cloudflare.com/?to=/:account/domains/register',
    buildAuthUrl: (d) =>
      interpolateAffiliateUrl('cloudflare', d, 'auth') ||
      'https://dash.cloudflare.com/login'
  },
  {
    id: 'porkbun',
    name: 'Porkbun.com',
    hasPromo: true,
    promoLabel: 'Low Renewal',
    affiliateTag: REGISTRAR_AFFILIATE_TEMPLATES.porkbun.refCode,
    hasAuthDeepLink: true,
    color: '#ef6c83',
    buildUrl: (d) =>
      interpolateAffiliateUrl('porkbun', d, 'checkout') ||
      `https://porkbun.com/checkout/search?q=${encodeURIComponent(d)}`,
    buildAuthUrl: (d) =>
      interpolateAffiliateUrl('porkbun', d, 'auth') ||
      `https://porkbun.com/account/login?redirect=${encodeURIComponent(`/checkout/search?q=${encodeURIComponent(d)}`)}`
  },
  {
    id: 'spaceship',
    name: 'Spaceship.com',
    color: '#3b82f6',
    buildUrl: (d) => `https://www.spaceship.com/domain-search/?query=${encodeURIComponent(d)}`
  },
  {
    id: 'namecheap',
    name: 'Namecheap.com',
    affiliateTag: REGISTRAR_AFFILIATE_TEMPLATES.namecheap.refCode,
    hasAuthDeepLink: true,
    color: '#f97316',
    buildUrl: (d) =>
      interpolateAffiliateUrl('namecheap', d, 'checkout') ||
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(d)}`,
    buildAuthUrl: (d) =>
      interpolateAffiliateUrl('namecheap', d, 'auth') ||
      `https://www.namecheap.com/myaccount/login-only/?ReturnUrl=${encodeURIComponent(`/domains/registration/results/?domain=${encodeURIComponent(d)}`)}`
  },
  {
    id: 'hostinger',
    name: 'Hostinger.com',
    hasPromo: true,
    promoLabel: 'Deal',
    color: '#673de6',
    buildUrl: (d) => `https://www.hostinger.com/domain-name-search?domain=${encodeURIComponent(d)}`
  },
  {
    id: 'godaddy',
    name: 'GoDaddy.com',
    affiliateTag: REGISTRAR_AFFILIATE_TEMPLATES.godaddy.refCode,
    hasAuthDeepLink: true,
    color: '#1bdbdb',
    buildUrl: (d) =>
      interpolateAffiliateUrl('godaddy', d, 'checkout') ||
      `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`,
    buildAuthUrl: (d) =>
      interpolateAffiliateUrl('godaddy', d, 'auth') ||
      `https://sso.godaddy.com/?realm=idp&app=cart&path=${encodeURIComponent(`/domainsearch/find?domainToCheck=${encodeURIComponent(d)}`)}`
  },
  {
    id: 'domain',
    name: 'Domain.com',
    color: '#ef4444',
    buildUrl: (d) => `https://www.domain.com/registration/?flow=domainDFE&search=${encodeURIComponent(d)}`
  },
  {
    id: 'networksolutions',
    name: 'NetworkSolutions.com',
    hasPromo: true,
    promoLabel: 'Save',
    color: '#e4e4e7',
    buildUrl: (d) => `https://www.networksolutions.com/domain-name-registration/search?domain=${encodeURIComponent(d)}`
  }
];

export function sanitizeLabel(raw: string): string {
  let cleaned = String(raw || '').trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '').replace(/^www\./, '');
  cleaned = cleaned.split('/')[0].split('?')[0];
  if (cleaned.includes('.')) {
    cleaned = cleaned.split('.')[0];
  }
  return cleaned.replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
}

export function sanitizeFullDomain(raw: string): string {
  let cleaned = String(raw || '').trim().toLowerCase();
  cleaned = cleaned.replace(/^https?:\/\//, '').replace(/^www\./, '');
  cleaned = cleaned.split('/')[0].split('?')[0].replace(/[^a-z0-9.-]/g, '');
  if (!cleaned) return '';
  if (!cleaned.includes('.')) {
    cleaned = `${cleaned}.com`;
  }
  const parts = cleaned.split('.').filter(Boolean);
  if (parts.length < 2) return '';
  return parts.join('.');
}

export function detectDomainHack(label: string): string | null {
  const clean = sanitizeLabel(label);
  if (clean.length >= 5 && clean.endsWith('ing')) {
    const prefix = clean.slice(0, -3);
    if (prefix.length >= 1) return `${prefix}.ing`;
  }
  if (clean.length >= 5 && clean.endsWith('ai')) {
    const prefix = clean.slice(0, -2);
    if (prefix.length >= 2) return `${prefix}.ai`;
  }
  if (clean.length >= 5 && clean.endsWith('io')) {
    const prefix = clean.slice(0, -2);
    if (prefix.length >= 2) return `${prefix}.io`;
  }
  return null;
}

export async function checkDomainBatch(
  entries: Array<{ domain: string; isHack?: boolean }>
): Promise<DomainResult[]> {
  try {
    const res = await fetch('/api/rdap/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domains: entries })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = (await res.json()) as { results?: DomainResult[] };
    return data.results || [];
  } catch {
    return entries.map((e) => ({
      domain: e.domain,
      status: 'unknown',
      price: null,
      rdap: null
    }));
  }
}

export interface AiBrandSuggestion {
  name: string;
  tagline: string;
}

export async function fetchAiBrandNames(idea: string): Promise<AiBrandSuggestion[]> {
  const res = await fetch('/api/ai-names', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idea })
  });

  const data = (await res.json().catch(() => ({}))) as {
    suggestions?: AiBrandSuggestion[];
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error || `AI service returned status ${res.status}`);
  }

  return data.suggestions || [];
}

export async function fetchGlobalStats(): Promise<{
  domainsVerified: number;
  registrarsConnected: number;
  medianLatencyMs: number;
} | null> {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function submitContactForm(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ ok: boolean; ticketId: string }> {
  const res = await fetch('/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    ticketId?: string;
    error?: string;
  };

  if (!res.ok || !data.ticketId) {
    throw new Error(data.error || 'Could not submit contact message.');
  }

  return { ok: true, ticketId: data.ticketId };
}

export async function fetchPremiumPriceHistory(
  domain: string,
  currentPrice?: string | null
): Promise<PremiumPriceTrend> {
  const params = new URLSearchParams({ domain });
  if (currentPrice) {
    params.set('currentPrice', currentPrice);
  }
  const res = await fetch(`/api/premium/price-history?${params.toString()}`);
  const data = (await res.json().catch(() => ({}))) as Partial<PremiumPriceTrend> & { error?: string };
  if (!res.ok || !Array.isArray(data.history)) {
    throw new Error(data.error || 'Unable to load price trend history.');
  }
  return {
    domain: String(data.domain || domain),
    currentPriceUsd: Number(data.currentPriceUsd || 0),
    changePct: Number(data.changePct || 0),
    history: data.history
  };
}

export function parseUsdPrice(raw?: string | null): number | null {
  if (!raw) return null;
  const cleaned = String(raw).replace(/,/g, '');
  const match = cleaned.match(/\$\s*(\d+(?:\.\d{1,2})?)/) || cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Math.round(Number(match[1]));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 10_000_000) return null;
  return parsed;
}

export function parseUsdFloat(raw?: string | number | null): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  const cleaned = String(raw).replace(/,/g, '');
  const match = cleaned.match(/\$\s*(\d+(?:\.\d{1,2})?)/) || cleaned.match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function formatDomainPrice(
  usdInput: string | number | null | undefined,
  currency: CurrencyCode = 'USD',
  usdToInr = 85.5
): string | null {
  const amount = parseUsdFloat(usdInput);
  if (amount === null) return null;

  if (currency === 'INR') {
    const inr = Math.round(amount * usdToInr);
    return `₹${inr.toLocaleString('en-IN')}`;
  }

  if (amount >= 100) {
    return `$${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `$${amount.toFixed(2)}`;
}

export async function fetchPricingFeed(): Promise<PricingFeedResponse | null> {
  try {
    const res = await fetch('/api/pricing');
    if (!res.ok) return null;
    return (await res.json()) as PricingFeedResponse;
  } catch {
    return null;
  }
}

const REGISTRAR_RATE_FACTOR: Record<string, { regMult: number; renMult: number }> = {
  cloudflare: { regMult: 0.92, renMult: 0.85 },
  porkbun: { regMult: 1.0, renMult: 1.0 },
  spaceship: { regMult: 0.94, renMult: 0.96 },
  namecheap: { regMult: 1.06, renMult: 1.15 },
  hostinger: { regMult: 0.96, renMult: 1.24 },
  godaddy: { regMult: 1.12, renMult: 1.65 },
  domain: { regMult: 1.08, renMult: 1.38 },
  networksolutions: { regMult: 1.18, renMult: 1.95 }
};

export async function fetchRegistrarQuotes(domain: string): Promise<{
  domain: string;
  usdToInr: number;
  priceSource: string;
  cheapestFirstYearId: string;
  cheapestRenewalId: string;
  quotes: Array<{
    id: string;
    name: string;
    firstYearUsd: number;
    renewalUsd: number;
    firstYearInr: number;
    renewalInr: number;
    hasPromo?: boolean;
    promoLabel?: string;
    affiliateTag?: string;
    hasAuthDeepLink?: boolean;
    checkoutUrl: string;
    authDeepLinkUrl?: string;
  }>;
} | null> {
  try {
    const res = await fetch(`/api/registrar/quotes?domain=${encodeURIComponent(domain)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function getRegistrarQuotes(
  domain: string,
  status: DomainStatus,
  priceStr?: string | null,
  renewalPriceStr?: string | null,
  tldPricing?: Record<string, TldPricingEntry>
): RegistrarPriceQuote[] {
  const ext = (domain.split('.').pop() || 'com').toLowerCase();
  const catalog = tldPricing?.[ext];
  const baseFirstUsd = parseUsdFloat(priceStr) ?? catalog?.registrationUsd ?? 11.99;
  const baseRenewalUsd = parseUsdFloat(renewalPriceStr) ?? catalog?.renewalUsd ?? Math.max(12.99, baseFirstUsd + 2);

  if (status === 'premium') {
    return REGISTRARS.map((reg) => ({
      id: reg.id,
      name: reg.name,
      firstYearUsd: Math.round(baseFirstUsd),
      renewalUsd: baseRenewalUsd,
      hasPromo: reg.hasPromo,
      promoLabel: reg.promoLabel,
      affiliateTag: reg.affiliateTag,
      hasAuthDeepLink: reg.hasAuthDeepLink,
      buildUrl: reg.buildUrl,
      buildAuthUrl: reg.buildAuthUrl
    }));
  }

  return REGISTRARS.map((reg) => {
    const factor = REGISTRAR_RATE_FACTOR[reg.id] || { regMult: 1, renMult: 1 };
    const firstYearUsd = Number(Math.max(1.99, baseFirstUsd * factor.regMult).toFixed(2));
    const renewalUsd = Number(Math.max(firstYearUsd, baseRenewalUsd * factor.renMult).toFixed(2));
    return {
      id: reg.id,
      name: reg.name,
      firstYearUsd,
      renewalUsd,
      hasPromo: reg.hasPromo,
      promoLabel: reg.promoLabel,
      affiliateTag: reg.affiliateTag,
      hasAuthDeepLink: reg.hasAuthDeepLink,
      buildUrl: reg.buildUrl,
      buildAuthUrl: reg.buildAuthUrl
    };
  });
}

export function getPremiumShowcaseDomains(query: string): DomainResult[] {
  const seed = sanitizeLabel(query) || 'brand';
  const capitalized = seed.charAt(0).toLowerCase() + seed.slice(1);
  return [
    { domain: `${capitalized}.ai`, status: 'premium', price: '$48,462', renewalPrice: '$74.98', priceSource: 'aftermarket_est' },
    { domain: `${capitalized}.xyz`, status: 'premium', price: '$50,000', renewalPrice: '$12.99', priceSource: 'aftermarket_est' },
    { domain: `${capitalized}.app`, status: 'premium', price: '$24,999', renewalPrice: '$16.99', priceSource: 'aftermarket_est' },
    { domain: `${capitalized}hq.com`, status: 'premium', price: '$3,495', renewalPrice: '$11.99', priceSource: 'aftermarket_est' },
    { domain: `get${capitalized}.com`, status: 'premium', price: '$2,850', renewalPrice: '$11.99', priceSource: 'aftermarket_est' },
    { domain: `${capitalized}labs.com`, status: 'premium', price: '$4,200', renewalPrice: '$11.99', priceSource: 'aftermarket_est' }
  ];
}

export async function fetchDomainAnalysis(domain: string): Promise<DomainAnalysisResult> {
  const res = await fetch(`/api/domain/analyze?domain=${encodeURIComponent(domain)}`);
  const data = (await res.json().catch(() => ({}))) as DomainAnalysisResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not analyze domain.');
  }
  return data;
}

export async function fetchSocialHandles(handle: string): Promise<SocialHandleResult[]> {
  const res = await fetch(`/api/social-check?handle=${encodeURIComponent(handle)}`);
  const data = (await res.json().catch(() => ({}))) as { results?: SocialHandleResult[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not verify social handles.');
  }
  return data.results || [];
}

export async function fetchExpiredDomains(params: {
  q?: string;
  tld?: string;
  stage?: string;
  maxLen?: number;
}): Promise<ExpiredDomainCandidate[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set('q', params.q);
  if (params.tld && params.tld !== 'all') qs.set('tld', params.tld);
  if (params.stage && params.stage !== 'all') qs.set('stage', params.stage);
  if (params.maxLen) qs.set('maxLen', String(params.maxLen));
  const res = await fetch(`/api/expired-domains?${qs.toString()}`);
  const data = (await res.json().catch(() => ({}))) as { items?: ExpiredDomainCandidate[]; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Could not load expired domain feed.');
  }
  return data.items || [];
}

const CONCEPT_SYNONYMS: Record<string, string[]> = {
  fast: ['swift', 'velo', 'bolt', 'flash', 'glide', 'dash'],
  speed: ['swift', 'velo', 'pulse', 'zip', 'sprint', 'turbo'],
  secure: ['aegis', 'vault', 'guard', 'bastion', 'shield', 'citadel'],
  security: ['aegis', 'vault', 'sentinel', 'cipher', 'armor', 'knox'],
  trust: ['verity', 'anchor', 'pact', 'loyal', 'certa', 'stead'],
  cloud: ['nimbus', 'strato', 'aether', 'cirrus', 'sky', 'nebula'],
  ai: ['synapse', 'cortex', 'neural', 'synth', 'cogni', 'oracle'],
  smart: ['sage', 'lumen', 'lucid', 'keen', 'neuron', 'prism'],
  pay: ['mint', 'ledger', 'remit', 'clear', 'settle', 'flow'],
  finance: ['treasury', 'mint', 'yield', 'capital', 'ledger', 'folio'],
  health: ['vital', 'mend', 'thera', 'well', 'pulse', 'aura'],
  shop: ['bazaar', 'cart', 'shelf', 'market', 'goods', 'atelier'],
  growth: ['scale', 'apex', 'crest', 'bloom', 'surge', 'summit'],
  global: ['atlas', 'terra', 'orbit', 'meridian', 'sphere', 'omni']
};

export function generateReverseDictionaryLabels(conceptRaw: string, modifierRaw = ''): string[] {
  const concept = sanitizeLabel(conceptRaw);
  const mod = sanitizeLabel(modifierRaw);
  const baseWords = CONCEPT_SYNONYMS[concept] || [
    concept || 'nova',
    `${concept || 'nova'}ly`,
    `${concept || 'nova'}hq`,
    `try${concept || 'nova'}`,
    `${concept || 'nova'}hub`,
    `${concept || 'nova'}flow`
  ];

  const suffixes = ['hq', 'labs', 'io', 'ai', 'ly', 'hub'];
  const out = new Set<string>();

  for (const w of baseWords) {
    if (mod) {
      out.add(`${w}${mod}`.slice(0, 20));
      out.add(`${mod}${w}`.slice(0, 20));
    } else {
      out.add(w);
      out.add(`${w}${suffixes[out.size % suffixes.length]}`.slice(0, 20));
    }
  }

  return Array.from(out).filter((x) => x.length >= 3).slice(0, 10);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
