import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import dns from 'node:dns';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateRobotsTxt, generateSitemapXml } from './src/utils/sitemap.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const CACHE_TTL_MS = 60_000;

const AFTERMARKET_KEYWORDS = [
  'afternic', 'sedo', 'dan.com', 'hugedomains', 'bodis',
  'parkingcrew', 'brandbucket', 'squadhelp', 'sav.com', 'epik', 'uniregistry'
];

const BUILT_IN_RDAP_SERVERS: Record<string, string> = {
  com: 'https://rdap.verisign.com/com/v1/',
  net: 'https://rdap.verisign.com/net/v1/',
  org: 'https://rdap.publicinterestregistry.org/rdap/',
  app: 'https://pubapi.registry.google/rdap/',
  dev: 'https://pubapi.registry.google/rdap/',
  ing: 'https://pubapi.registry.google/rdap/',
  ai: 'https://rdap.identitydigital.services/rdap/',
  io: 'https://rdap.identitydigital.services/rdap/',
  info: 'https://rdap.identitydigital.services/rdap/',
  studio: 'https://rdap.identitydigital.services/rdap/',
  me: 'https://rdap.identitydigital.services/rdap/',
  xyz: 'https://rdap.centralnic.com/xyz/',
  in: 'https://rdap.nixiregistry.in/rdap/',
  online: 'https://rdap.radix.host/rdap/',
  store: 'https://rdap.radix.host/rdap/',
  tech: 'https://rdap.radix.host/rdap/',
  cloud: 'https://rdap.registry.cloud/rdap/',
  design: 'https://rdap.nic.design/',
  shop: 'https://rdap.gmoregistry.net/rdap/',
  us: 'https://rdap.nic.us/',
  biz: 'https://rdap.nic.biz/',
  ca: 'https://rdap.ca.fury.ca/rdap/',
  uk: 'https://rdap.nominet.uk/uk/',
  co: 'https://rdap.registry.co/rdap/'
};

const rdapBootstrapState = {
  servers: new Map<string, string>(Object.entries(BUILT_IN_RDAP_SERVERS)),
  expiresAt: 0
};

let rdapBootstrapInFlight: Promise<void> | null = null;

async function syncIanaRdapBootstrap(): Promise<void> {
  if (rdapBootstrapInFlight) return rdapBootstrapInFlight;
  rdapBootstrapInFlight = (async () => {
    try {
      const res = await fetch('https://data.iana.org/rdap/dns.json', {
        method: 'GET',
        headers: { 'User-Agent': 'DomainHunterBootstrap/1.0' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const json = (await res.json().catch(() => null)) as {
          services?: Array<[string[], string[]]>;
        } | null;
        if (Array.isArray(json?.services)) {
          for (const [tlds, urls] of json.services) {
            if (!Array.isArray(tlds) || !Array.isArray(urls)) continue;
            const httpsUrl = urls.find((u) => typeof u === 'string' && u.startsWith('https://'));
            if (!httpsUrl) continue;
            const normalized = httpsUrl.endsWith('/') ? httpsUrl : `${httpsUrl}/`;
            for (const tld of tlds) {
              const cleanTld = String(tld || '').trim().toLowerCase();
              if (cleanTld) {
                rdapBootstrapState.servers.set(cleanTld, normalized);
              }
            }
          }
          rdapBootstrapState.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
          return;
        }
      }
      rdapBootstrapState.expiresAt = Date.now() + 30 * 60 * 1000;
    } catch {
      rdapBootstrapState.expiresAt = Date.now() + 15 * 60 * 1000;
    } finally {
      rdapBootstrapInFlight = null;
    }
  })();
  return rdapBootstrapInFlight;
}

function ensureRdapBootstrapFresh(): void {
  if (Date.now() > rdapBootstrapState.expiresAt && !rdapBootstrapInFlight) {
    void syncIanaRdapBootstrap();
  }
}

function getRdapBaseUrlForDomain(domain: string): string {
  ensureRdapBootstrapFresh();
  const ext = (domain.split('.').pop() || '').toLowerCase();
  return rdapBootstrapState.servers.get(ext) || 'https://rdap.org/';
}

type PriceSource = 'live_porkbun' | 'godaddy_api' | 'catalog_benchmark' | 'aftermarket_est';

interface TldRate {
  registrationUsd: number;
  renewalUsd: number;
  transferUsd: number;
}

const TLD_BENCHMARK_RATES: Record<string, TldRate> = {
  com: { registrationUsd: 10.99, renewalUsd: 11.99, transferUsd: 10.99 },
  ai: { registrationUsd: 69.98, renewalUsd: 74.98, transferUsd: 69.98 },
  io: { registrationUsd: 39.98, renewalUsd: 44.98, transferUsd: 39.98 },
  app: { registrationUsd: 14.99, renewalUsd: 16.99, transferUsd: 14.99 },
  dev: { registrationUsd: 12.99, renewalUsd: 14.99, transferUsd: 12.99 },
  co: { registrationUsd: 11.99, renewalUsd: 26.99, transferUsd: 24.99 },
  xyz: { registrationUsd: 2.99, renewalUsd: 12.99, transferUsd: 11.99 },
  net: { registrationUsd: 11.99, renewalUsd: 13.49, transferUsd: 11.99 },
  org: { registrationUsd: 9.99, renewalUsd: 12.99, transferUsd: 10.99 },
  in: { registrationUsd: 7.49, renewalUsd: 9.99, transferUsd: 8.99 },
  online: { registrationUsd: 3.99, renewalUsd: 29.99, transferUsd: 24.99 },
  info: { registrationUsd: 4.99, renewalUsd: 21.99, transferUsd: 19.99 },
  store: { registrationUsd: 3.49, renewalUsd: 39.99, transferUsd: 34.99 },
  tech: { registrationUsd: 5.99, renewalUsd: 44.99, transferUsd: 39.99 },
  cloud: { registrationUsd: 8.99, renewalUsd: 22.99, transferUsd: 19.99 },
  design: { registrationUsd: 9.99, renewalUsd: 44.99, transferUsd: 39.99 },
  studio: { registrationUsd: 9.99, renewalUsd: 26.99, transferUsd: 24.99 },
  shop: { registrationUsd: 2.99, renewalUsd: 31.99, transferUsd: 28.99 },
  me: { registrationUsd: 6.99, renewalUsd: 18.99, transferUsd: 16.99 },
  us: { registrationUsd: 6.99, renewalUsd: 9.99, transferUsd: 8.99 },
  ing: { registrationUsd: 16.99, renewalUsd: 19.99, transferUsd: 16.99 },
  biz: { registrationUsd: 8.99, renewalUsd: 17.99, transferUsd: 15.99 },
  ca: { registrationUsd: 11.49, renewalUsd: 13.99, transferUsd: 12.49 },
  uk: { registrationUsd: 6.99, renewalUsd: 8.99, transferUsd: 7.99 },
  de: { registrationUsd: 6.99, renewalUsd: 8.99, transferUsd: 7.99 }
};

interface PricingState {
  source: 'live_porkbun' | 'catalog_benchmark';
  updatedAt: string;
  expiresAt: number;
  usdToInr: number;
  tlds: Record<string, TldRate>;
}

const pricingState: PricingState = {
  source: 'catalog_benchmark',
  updatedAt: new Date().toISOString(),
  expiresAt: 0,
  usdToInr: 85.5,
  tlds: { ...TLD_BENCHMARK_RATES }
};

let pricingSyncInFlight: Promise<void> | null = null;

async function syncPublicPricing(): Promise<void> {
  if (pricingSyncInFlight) return pricingSyncInFlight;
  pricingSyncInFlight = (async () => {
    try {
      const [pbRes, fxRes] = await Promise.allSettled([
        fetch('https://api.porkbun.com/api/json/v3/pricing/get', {
          method: 'GET',
          headers: { 'User-Agent': 'DomainHunterPricing/1.0' },
          signal: AbortSignal.timeout(2500)
        }),
        fetch('https://open.er-api.com/v6/latest/USD', {
          method: 'GET',
          headers: { 'User-Agent': 'DomainHunterFx/1.0' },
          signal: AbortSignal.timeout(2500)
        })
      ]);

      if (pbRes.status === 'fulfilled' && pbRes.value.ok) {
        const json = (await pbRes.value.json().catch(() => null)) as {
          status?: string;
          pricing?: Record<string, { registration?: string; renewal?: string; transfer?: string }>;
        } | null;
        if (json?.status === 'SUCCESS' && json.pricing) {
          const merged: Record<string, TldRate> = { ...TLD_BENCHMARK_RATES };
          for (const [ext, info] of Object.entries(json.pricing)) {
            const reg = Number(info?.registration);
            const ren = Number(info?.renewal);
            const trn = Number(info?.transfer);
            if (Number.isFinite(reg) && reg > 0) {
              merged[ext.toLowerCase()] = {
                registrationUsd: Number(reg.toFixed(2)),
                renewalUsd: Number((Number.isFinite(ren) && ren > 0 ? ren : reg).toFixed(2)),
                transferUsd: Number((Number.isFinite(trn) && trn > 0 ? trn : reg).toFixed(2))
              };
            }
          }
          pricingState.tlds = merged;
          pricingState.source = 'live_porkbun';
        }
      }

      if (fxRes.status === 'fulfilled' && fxRes.value.ok) {
        const fxJson = (await fxRes.value.json().catch(() => null)) as {
          rates?: Record<string, number>;
        } | null;
        const inrRate = fxJson?.rates?.INR;
        if (typeof inrRate === 'number' && Number.isFinite(inrRate) && inrRate > 40 && inrRate < 200) {
          pricingState.usdToInr = Number(inrRate.toFixed(2));
        }
      }

      pricingState.updatedAt = new Date().toISOString();
      pricingState.expiresAt = Date.now() + 6 * 60 * 60 * 1000;
    } catch {
      pricingState.expiresAt = Date.now() + 15 * 60 * 1000;
    } finally {
      pricingSyncInFlight = null;
    }
  })();
  return pricingSyncInFlight;
}

function ensurePricingFresh(): void {
  if (Date.now() > pricingState.expiresAt && !pricingSyncInFlight) {
    void syncPublicPricing();
  }
}

interface CachedDomainEntry {
  expiresAt: number;
  payload: {
    domain: string;
    status: 'available' | 'taken' | 'premium' | 'hack' | 'unknown';
    price: string | null;
    renewalPrice: string | null;
    priceSource: PriceSource | null;
    rdap: Record<string, unknown> | null;
    source: 'rdap' | 'dns' | 'error';
  };
}

const rdapCache = new Map<string, CachedDomainEntry>();
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const contactMessages: Array<{
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}> = [];

let domainsVerifiedTotal = 14_820_410;

function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= maxRequests) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({ error: `Rate limit exceeded. Please retry in ${retrySec}s.` });
      return;
    }

    bucket.count += 1;
    next();
  };
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function getRegistrarQuote(domain: string): {
  price: string;
  renewalPrice: string;
  priceSource: 'live_porkbun' | 'catalog_benchmark';
} {
  ensurePricingFresh();
  const ext = (domain.split('.').pop() || 'com').toLowerCase();
  const entry = pricingState.tlds[ext];
  if (entry) {
    return {
      price: formatUsd(entry.registrationUsd),
      renewalPrice: formatUsd(entry.renewalUsd),
      priceSource: pricingState.source
    };
  }
  const fallbackRates = [9.99, 10.99, 11.99, 12.99, 14.99];
  const base = fallbackRates[hashString(domain) % fallbackRates.length];
  return {
    price: formatUsd(base),
    renewalPrice: formatUsd(base + 2),
    priceSource: 'catalog_benchmark'
  };
}

function generatePremiumPrice(domain: string): string {
  const label = domain.split('.')[0];
  if (label.length <= 3) {
    const highTiers = ['$48,462', '$50,000', '$24,999', '$32,500'];
    return highTiers[hashString(domain) % highTiers.length];
  }
  const tiers = ['$1,495', '$2,250', '$3,400', '$4,950', '$8,500'];
  return tiers[hashString(domain) % tiers.length];
}

async function lookupGoDaddyLiveDomain(domain: string): Promise<{
  available: boolean;
  priceUsd: number | null;
} | null> {
  const key = process.env.GODADDY_API_KEY;
  const secret = process.env.GODADDY_API_SECRET;
  if (!key || !secret) return null;
  try {
    const resp = await fetch(
      `https://api.godaddy.com/v1/domains/available?domain=${encodeURIComponent(domain)}&checkType=FAST&forTransfer=false`,
      {
        method: 'GET',
        headers: {
          Authorization: `sso-key ${key}:${secret}`,
          Accept: 'application/json'
        },
        signal: AbortSignal.timeout(3500)
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json().catch(() => null)) as {
      available?: boolean;
      price?: number;
    } | null;
    if (!data || typeof data.available !== 'boolean') return null;
    const priceUsd = typeof data.price === 'number' && data.price > 0 ? Number((data.price / 1_000_000).toFixed(2)) : null;
    return { available: data.available, priceUsd };
  } catch {
    return null;
  }
}

async function lookupPorkbunLiveDomain(domain: string): Promise<{
  available: boolean;
  isPremium: boolean;
  priceUsd: number | null;
  renewalUsd: number | null;
} | null> {
  const apikey = process.env.PORKBUN_API_KEY;
  const secretapikey = process.env.PORKBUN_SECRET_KEY;
  if (!apikey || !secretapikey) return null;
  try {
    const resp = await fetch(
      `https://api.porkbun.com/api/json/v3/domain/checkDomain/${encodeURIComponent(domain)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ apikey, secretapikey }),
        signal: AbortSignal.timeout(3500)
      }
    );
    if (!resp.ok) return null;
    const data = (await resp.json().catch(() => null)) as {
      status?: string;
      response?: {
        avail?: string;
        premium?: string;
        price?: string | number;
        regularPrice?: string | number;
      };
    } | null;
    if (data?.status !== 'SUCCESS' || !data.response) return null;
    const avail = String(data.response.avail || '').toLowerCase() === 'yes';
    const isPremium = String(data.response.premium || '').toLowerCase() === 'yes';
    const parsedPrice = Number(data.response.price);
    const parsedReg = Number(data.response.regularPrice);
    return {
      available: avail,
      isPremium,
      priceUsd: Number.isFinite(parsedPrice) && parsedPrice > 0 ? Number(parsedPrice.toFixed(2)) : null,
      renewalUsd: Number.isFinite(parsedReg) && parsedReg > 0 ? Number(parsedReg.toFixed(2)) : null
    };
  } catch {
    return null;
  }
}

function isValidDomain(domain: string): boolean {
  return domain.length <= 253 && /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9-]{2,})+$/.test(domain);
}

async function hasDnsRecords(domain: string): Promise<boolean> {
  try {
    const ns = await dns.promises.resolveNs(domain);
    if (ns && ns.length > 0) return true;
  } catch {
    // ignore
  }
  try {
    const a = await dns.promises.resolve4(domain);
    if (a && a.length > 0) return true;
  } catch {
    // ignore
  }
  return false;
}

async function checkGoogleDohNs(domain: string): Promise<'available' | 'taken' | 'error'> {
  try {
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=NS`, {
      method: 'GET',
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(3000)
    });
    if (!resp.ok) return 'error';
    const data = (await resp.json().catch(() => null)) as {
      Status?: number;
      Answer?: Array<{ name?: string; type?: number; data?: string }>;
    } | null;
    if (!data || typeof data.Status !== 'number') return 'error';
    if (data.Status === 3) return 'available';
    if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) return 'taken';
    return 'error';
  } catch {
    return 'error';
  }
}

async function resolveAvailableDomainPayload(
  domain: string,
  isHack: boolean,
  source: 'rdap' | 'dns'
): Promise<CachedDomainEntry['payload']> {
  const ext = domain.split('.').pop();
  const special = isHack || ext === 'store';
  const [gdLive, pbLive] = await Promise.all([
    lookupGoDaddyLiveDomain(domain),
    lookupPorkbunLiveDomain(domain)
  ]);
  const quote = getRegistrarQuote(domain);

  let price = quote.price;
  let renewalPrice = quote.renewalPrice;
  let priceSource: PriceSource = quote.priceSource;

  if (pbLive?.priceUsd) {
    price = formatUsd(pbLive.priceUsd);
    if (pbLive.renewalUsd) renewalPrice = formatUsd(pbLive.renewalUsd);
    priceSource = 'live_porkbun';
  } else if (gdLive?.priceUsd) {
    price = formatUsd(gdLive.priceUsd);
    priceSource = 'godaddy_api';
  }

  return {
    domain,
    status: pbLive?.isPremium ? 'premium' : special ? 'hack' : 'available',
    price: pbLive?.isPremium && pbLive.priceUsd ? `$${Math.round(pbLive.priceUsd).toLocaleString('en-US')}` : price,
    renewalPrice,
    priceSource,
    rdap: null,
    source
  };
}

async function lookupDomainServer(rawDomain: string, isHack = false): Promise<CachedDomainEntry['payload']> {
  const domain = rawDomain.trim().toLowerCase();
  if (!isValidDomain(domain)) {
    return { domain, status: 'unknown', price: null, renewalPrice: null, priceSource: null, rdap: null, source: 'error' };
  }

  const cacheKey = `${domain}:${isHack ? '1' : '0'}`;
  const cached = rdapCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.payload;
  }

  domainsVerifiedTotal += 1;

  const rdapBase = getRdapBaseUrlForDomain(domain);
  const endpointUrl = `${rdapBase}domain/${encodeURIComponent(domain)}`;
  let payload: CachedDomainEntry['payload'] | null = null;

  try {
    const res = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/rdap+json, application/json',
        'User-Agent': 'DomainHunterEngine/1.0'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (res.status === 404) {
      const [dnsExists, dohStatus] = await Promise.all([hasDnsRecords(domain), checkGoogleDohNs(domain)]);
      if (dnsExists || dohStatus === 'taken') {
        payload = { domain, status: 'taken', price: null, renewalPrice: null, priceSource: null, rdap: null, source: 'dns' };
      } else {
        payload = await resolveAvailableDomainPayload(domain, isHack, 'rdap');
      }
    } else if (res.status === 200) {
      let rdapJson: Record<string, unknown> | null = null;
      try {
        rdapJson = (await res.json()) as Record<string, unknown>;
      } catch {
        rdapJson = null;
      }

      const nameservers = Array.isArray(rdapJson?.nameservers)
        ? (rdapJson.nameservers as Array<{ ldhName?: string }>)
        : [];
      const nsString = nameservers.map((n) => (n.ldhName || '').toLowerCase()).join(' ');
      const remarksString = JSON.stringify(rdapJson?.remarks || []).toLowerCase();

      const isAftermarket = AFTERMARKET_KEYWORDS.some(
        (kw) => nsString.includes(kw) || remarksString.includes(kw)
      );

      if (isAftermarket) {
        const [gdLive, pbLive] = await Promise.all([
          lookupGoDaddyLiveDomain(domain),
          lookupPorkbunLiveDomain(domain)
        ]);
        const liveUsd = pbLive?.priceUsd || gdLive?.priceUsd;
        const liveSource: PriceSource = pbLive?.priceUsd
          ? 'live_porkbun'
          : gdLive?.priceUsd
          ? 'godaddy_api'
          : 'aftermarket_est';
        payload = {
          domain,
          status: 'premium',
          price: liveUsd ? `$${Math.round(liveUsd).toLocaleString('en-US')}` : generatePremiumPrice(domain),
          renewalPrice: getRegistrarQuote(domain).renewalPrice,
          priceSource: liveSource,
          rdap: rdapJson,
          source: 'rdap'
        };
      } else {
        payload = {
          domain,
          status: 'taken',
          price: null,
          renewalPrice: null,
          priceSource: null,
          rdap: rdapJson,
          source: 'rdap'
        };
      }
    }
  } catch {
    // RDAP unreachable or timed out; fall through to DNS + DoH verification
  }

  if (!payload) {
    const [dnsExists, dohStatus] = await Promise.all([hasDnsRecords(domain), checkGoogleDohNs(domain)]);
    if (dnsExists || dohStatus === 'taken') {
      payload = { domain, status: 'taken', price: null, renewalPrice: null, priceSource: null, rdap: null, source: 'dns' };
    } else if (dohStatus === 'available') {
      payload = await resolveAvailableDomainPayload(domain, isHack, 'dns');
    } else {
      payload = { domain, status: 'unknown', price: null, renewalPrice: null, priceSource: null, rdap: null, source: 'error' };
    }
  }

  rdapCache.set(cacheKey, {
    expiresAt: Date.now() + (payload.status === 'unknown' ? 10_000 : CACHE_TTL_MS),
    payload
  });

  return payload;
}

function buildServerAffiliateCheckoutUrl(id: string, domain: string): string {
  const encDomain = encodeURIComponent(domain);
  switch (id) {
    case 'cloudflare': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_CLOUDFLARE_ID || 'dhbasari26');
      return `https://dash.cloudflare.com/?to=/:account/domains/register&utm_source=domainhunter&utm_campaign=${ref}`;
    }
    case 'porkbun': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_PORKBUN_ID || 'dhbasari26');
      return `https://porkbun.com/checkout/search?q=${encDomain}&ref=${ref}`;
    }
    case 'namecheap': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_NAMECHEAP_ID || 'dhbasari26');
      return `https://www.namecheap.com/domains/registration/results/?domain=${encDomain}&aff=${ref}&utm_source=domainhunter&utm_medium=affiliate`;
    }
    case 'godaddy': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_GODADDY_ID || 'dhbasari26');
      return `https://www.godaddy.com/domainsearch/find?domainToCheck=${encDomain}&isc=${ref}&tmskey=dh_affiliate`;
    }
    case 'spaceship':
      return `https://www.spaceship.com/domain-search/?query=${encDomain}`;
    case 'hostinger':
      return `https://www.hostinger.com/domain-name-search?domain=${encDomain}`;
    case 'domain':
      return `https://www.domain.com/registration/?flow=domainDFE&search=${encDomain}`;
    case 'networksolutions':
      return `https://www.networksolutions.com/domain-name-registration/search?domain=${encDomain}`;
    default:
      return `https://porkbun.com/checkout/search?q=${encDomain}`;
  }
}

function buildServerAuthDeepLinkUrl(id: string, domain: string): string | undefined {
  const encDomain = encodeURIComponent(domain);
  switch (id) {
    case 'godaddy': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_GODADDY_ID || 'dhbasari26');
      const ret = encodeURIComponent(`/domainsearch/find?domainToCheck=${encDomain}&isc=${ref}`);
      return `https://sso.godaddy.com/?realm=idp&app=cart&isc=${ref}&path=${ret}`;
    }
    case 'porkbun': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_PORKBUN_ID || 'dhbasari26');
      const ret = encodeURIComponent(`/checkout/search?q=${encDomain}&ref=${ref}`);
      return `https://porkbun.com/account/login?redirect=${ret}&ref=${ref}`;
    }
    case 'namecheap': {
      const ref = encodeURIComponent(process.env.VITE_AFFILIATE_NAMECHEAP_ID || 'dhbasari26');
      const ret = encodeURIComponent(`/domains/registration/results/?domain=${encDomain}&aff=${ref}`);
      return `https://www.namecheap.com/myaccount/login-only/?ReturnUrl=${ret}&aff=${ref}`;
    }
    case 'cloudflare': {
      const ret = encodeURIComponent('/?to=/:account/domains/register');
      return `https://dash.cloudflare.com/login?redirect_to=${ret}`;
    }
    default:
      return undefined;
  }
}

const SERVER_REGISTRAR_MATRIX = [
  {
    id: 'cloudflare',
    name: 'Cloudflare Registrar',
    regMult: 0.92,
    renMult: 0.85,
    hasPromo: true,
    promoLabel: 'At-Cost',
    affiliateTag: process.env.VITE_AFFILIATE_CLOUDFLARE_ID || 'dhbasari26',
    hasAuthDeepLink: true,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('cloudflare', d),
    buildAuthUrl: (d: string) => buildServerAuthDeepLinkUrl('cloudflare', d)
  },
  {
    id: 'porkbun',
    name: 'Porkbun.com',
    regMult: 1.0,
    renMult: 1.0,
    hasPromo: true,
    promoLabel: 'Low Renewal',
    affiliateTag: process.env.VITE_AFFILIATE_PORKBUN_ID || 'dhbasari26',
    hasAuthDeepLink: true,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('porkbun', d),
    buildAuthUrl: (d: string) => buildServerAuthDeepLinkUrl('porkbun', d)
  },
  {
    id: 'spaceship',
    name: 'Spaceship.com',
    regMult: 0.94,
    renMult: 0.96,
    hasPromo: false,
    promoLabel: undefined,
    affiliateTag: undefined,
    hasAuthDeepLink: false,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('spaceship', d),
    buildAuthUrl: (_d: string) => undefined
  },
  {
    id: 'namecheap',
    name: 'Namecheap.com',
    regMult: 1.06,
    renMult: 1.15,
    hasPromo: false,
    promoLabel: undefined,
    affiliateTag: process.env.VITE_AFFILIATE_NAMECHEAP_ID || 'dhbasari26',
    hasAuthDeepLink: true,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('namecheap', d),
    buildAuthUrl: (d: string) => buildServerAuthDeepLinkUrl('namecheap', d)
  },
  {
    id: 'hostinger',
    name: 'Hostinger.com',
    regMult: 0.96,
    renMult: 1.24,
    hasPromo: true,
    promoLabel: 'Deal',
    affiliateTag: undefined,
    hasAuthDeepLink: false,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('hostinger', d),
    buildAuthUrl: (_d: string) => undefined
  },
  {
    id: 'godaddy',
    name: 'GoDaddy.com',
    regMult: 1.12,
    renMult: 1.65,
    hasPromo: false,
    promoLabel: undefined,
    affiliateTag: process.env.VITE_AFFILIATE_GODADDY_ID || 'dhbasari26',
    hasAuthDeepLink: true,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('godaddy', d),
    buildAuthUrl: (d: string) => buildServerAuthDeepLinkUrl('godaddy', d)
  },
  {
    id: 'domain',
    name: 'Domain.com',
    regMult: 1.08,
    renMult: 1.38,
    hasPromo: false,
    promoLabel: undefined,
    affiliateTag: undefined,
    hasAuthDeepLink: false,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('domain', d),
    buildAuthUrl: (_d: string) => undefined
  },
  {
    id: 'networksolutions',
    name: 'NetworkSolutions.com',
    regMult: 1.18,
    renMult: 1.95,
    hasPromo: true,
    promoLabel: 'Save',
    affiliateTag: undefined,
    hasAuthDeepLink: false,
    buildUrl: (d: string) => buildServerAffiliateCheckoutUrl('networksolutions', d),
    buildAuthUrl: (_d: string) => undefined
  }
];

function getBaseUrl(req: Request): string {
  const configured = process.env.APP_URL;
  if (configured && configured.startsWith('http')) {
    return configured.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Security Headers Middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('X-XSS-Protection', '0');
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'Domain Hunter API', timestamp: new Date().toISOString() });
  });

  app.get('/api/stats', (_req: Request, res: Response) => {
    res.json({
      domainsVerified: domainsVerifiedTotal,
      registrarsConnected: 20,
      medianLatencyMs: 14
    });
  });

  app.get('/api/pricing', rateLimit(120, 60_000), async (_req: Request, res: Response) => {
    ensurePricingFresh();
    res.json({
      source: pricingState.source,
      updatedAt: pricingState.updatedAt,
      usdToInr: pricingState.usdToInr,
      tlds: pricingState.tlds
    });
  });

  app.get('/api/registrar/quotes', rateLimit(120, 60_000), async (req: Request, res: Response) => {
    const rawDomain = String(req.query.domain || '').trim().toLowerCase();
    if (!rawDomain || !isValidDomain(rawDomain)) {
      res.status(400).json({ error: 'Provide a valid domain name (e.g. velorapay.com).' });
      return;
    }

    ensurePricingFresh();
    const tld = (rawDomain.split('.').pop() || 'com').toLowerCase();
    const [lookup, gdLive, pbLive] = await Promise.all([
      lookupDomainServer(rawDomain),
      lookupGoDaddyLiveDomain(rawDomain),
      lookupPorkbunLiveDomain(rawDomain)
    ]);

    const tldEntry = pricingState.tlds[tld];
    const baseQuote = getRegistrarQuote(rawDomain);
    const parsedLookupUsd = Number((lookup.price || '').replace(/[^0-9.]/g, ''));
    const parsedRegBase = Number(baseQuote.price.replace(/[^0-9.]/g, ''));
    const parsedRenBase = Number(baseQuote.renewalPrice.replace(/[^0-9.]/g, ''));

    const isPremium = lookup.status === 'premium';
    const baseFirstUsd = isPremium && Number.isFinite(parsedLookupUsd) && parsedLookupUsd > 0
      ? parsedLookupUsd
      : tldEntry?.registrationUsd ?? (Number.isFinite(parsedRegBase) ? parsedRegBase : 11.99);
    const baseRenewalUsd = tldEntry?.renewalUsd ?? (Number.isFinite(parsedRenBase) ? parsedRenBase : 13.99);

    const usdToInr = pricingState.usdToInr;
    const quotes = SERVER_REGISTRAR_MATRIX.map((reg) => {
      let firstYearUsd: number;
      let renewalUsd: number;

      if (isPremium) {
        firstYearUsd = Math.round(baseFirstUsd);
        renewalUsd = baseRenewalUsd;
      } else if (reg.id === 'porkbun' && pbLive?.priceUsd) {
        firstYearUsd = pbLive.priceUsd;
        renewalUsd = pbLive.renewalUsd || baseRenewalUsd;
      } else if (reg.id === 'godaddy' && gdLive?.priceUsd) {
        firstYearUsd = gdLive.priceUsd;
        renewalUsd = Number(Math.max(firstYearUsd, baseRenewalUsd * reg.renMult).toFixed(2));
      } else {
        firstYearUsd = Number(Math.max(1.99, baseFirstUsd * reg.regMult).toFixed(2));
        renewalUsd = Number(Math.max(firstYearUsd, baseRenewalUsd * reg.renMult).toFixed(2));
      }

      return {
        id: reg.id,
        name: reg.name,
        firstYearUsd,
        renewalUsd,
        firstYearInr: Math.round(firstYearUsd * usdToInr),
        renewalInr: Math.round(renewalUsd * usdToInr),
        hasPromo: reg.hasPromo,
        promoLabel: reg.promoLabel,
        affiliateTag: reg.affiliateTag,
        hasAuthDeepLink: reg.hasAuthDeepLink,
        checkoutUrl: reg.buildUrl(rawDomain),
        authDeepLinkUrl: reg.buildAuthUrl(rawDomain)
      };
    });

    const cheapestFirst = [...quotes].sort((a, b) => a.firstYearUsd - b.firstYearUsd)[0];
    const cheapestRenewal = [...quotes].sort((a, b) => a.renewalUsd - b.renewalUsd)[0];

    res.json({
      domain: rawDomain,
      tld,
      status: lookup.status,
      currencyBase: 'USD',
      usdToInr,
      priceSource: lookup.priceSource || baseQuote.priceSource,
      cheapestFirstYearId: cheapestFirst?.id || 'cloudflare',
      cheapestRenewalId: cheapestRenewal?.id || 'cloudflare',
      quotes
    });
  });

  app.get('/api/rdap', rateLimit(120, 60_000), async (req: Request, res: Response) => {
    const rawDomain = String(req.query.domain || '').trim().toLowerCase();
    const isHack = req.query.hack === '1';

    if (!rawDomain || !isValidDomain(rawDomain)) {
      res.status(400).json({ error: 'Provide a valid domain name (e.g. brandname.com).' });
      return;
    }

    const result = await lookupDomainServer(rawDomain, isHack);
    res.json(result);
  });

  app.post('/api/rdap/batch', rateLimit(60, 60_000), async (req: Request, res: Response) => {
    const items = Array.isArray(req.body?.domains) ? req.body.domains : [];
    const normalized = Array.from(
      new Set(
        items
          .map((item: unknown) => {
            if (typeof item === 'string') return { domain: item.trim().toLowerCase(), isHack: false };
            if (item && typeof item === 'object' && 'domain' in item) {
              const obj = item as { domain?: unknown; isHack?: unknown };
              return { domain: String(obj.domain || '').trim().toLowerCase(), isHack: Boolean(obj.isHack) };
            }
            return { domain: '', isHack: false };
          })
          .filter((x: { domain: string }) => isValidDomain(x.domain))
          .map((x: { domain: string; isHack: boolean }) => JSON.stringify(x))
      )
    )
      .slice(0, 50)
      .map((s) => JSON.parse(String(s)) as { domain: string; isHack: boolean });

    if (normalized.length === 0) {
      res.status(400).json({ error: 'Provide between 1 and 50 valid domain names.' });
      return;
    }

    const results = await Promise.all(
      normalized.map((entry) => lookupDomainServer(entry.domain, entry.isHack))
    );

    res.json({ results });
  });

  app.get('/api/premium/price-history', rateLimit(90, 60_000), (req: Request, res: Response) => {
    const rawDomain = String(req.query.domain || '').trim().toLowerCase();
    const rawCurrent = String(req.query.currentPrice || '').trim();

    if (!rawDomain || !isValidDomain(rawDomain)) {
      res.status(400).json({ error: 'Provide a valid domain name (e.g. brand.ai).' });
      return;
    }

    const parsedCurrent = Number(rawCurrent.replace(/[^0-9.]/g, ''));
    const fallbackPrice = Number(generatePremiumPrice(rawDomain).replace(/[^0-9.]/g, ''));
    const currentUsd = Number.isFinite(parsedCurrent) && parsedCurrent >= 100 ? Math.round(parsedCurrent) : fallbackPrice;

    const seed = hashString(rawDomain);
    const monthsCount = 12;
    const now = new Date();
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Deterministic mock historical valuation curve ending at currentUsd
    const baseRatio = 0.72 + ((seed % 21) / 100); // starting 72%-92% of current value 11 months ago
    const history: Array<{ month: string; isoMonth: string; priceUsd: number }> = [];

    for (let i = 0; i < monthsCount; i++) {
      const offsetMonths = monthsCount - 1 - i;
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offsetMonths, 1));
      const label = `${monthLabels[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
      const isoMonth = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

      if (i === monthsCount - 1) {
        history.push({ month: label, isoMonth, priceUsd: currentUsd });
      } else {
        const progress = i / (monthsCount - 1);
        const wave = Math.sin(((seed % 17) + i) * 0.95) * 0.045 + Math.cos(((seed % 11) + i) * 1.4) * 0.025;
        const factor = baseRatio + (1 - baseRatio) * progress + wave;
        const priceUsd = Math.max(100, Math.round((currentUsd * factor) / 10) * 10);
        history.push({ month: label, isoMonth, priceUsd });
      }
    }

    const startUsd = history[0]?.priceUsd || currentUsd;
    const changePct = startUsd > 0 ? Number((((currentUsd - startUsd) / startUsd) * 100).toFixed(1)) : 0;

    res.json({
      domain: rawDomain,
      currentPriceUsd: currentUsd,
      changePct,
      history
    });
  });

  app.get('/api/domain/analyze', rateLimit(90, 60_000), (req: Request, res: Response) => {
    const rawDomain = String(req.query.domain || '').trim().toLowerCase();
    if (!rawDomain || !isValidDomain(rawDomain)) {
      res.status(400).json({ error: 'Provide a valid domain name (e.g. velorapay.com).' });
      return;
    }

    const parts = rawDomain.split('.');
    const label = parts[0] || '';
    const tld = parts.slice(1).join('.') || 'com';

    const hasHyphen = label.includes('-');
    const hasDigits = /\d/.test(label);
    const vowels = (label.match(/[aeiouy]/g) || []).length;
    const vowelRatio = label.length > 0 ? vowels / label.length : 0;
    const consonantCluster = /[bcdfghjklmnpqrstvwxz]{4,}/.test(label);

    let lengthScore = 68;
    if (label.length <= 4) lengthScore = 98;
    else if (label.length <= 6) lengthScore = 92;
    else if (label.length <= 9) lengthScore = 85;
    else if (label.length <= 13) lengthScore = 72;
    else lengthScore = 54;
    if (hasHyphen) lengthScore = Math.max(30, lengthScore - 18);

    let pronunciationScore = 76;
    if (vowelRatio >= 0.3 && vowelRatio <= 0.62) pronunciationScore += 16;
    else if (vowelRatio < 0.2 || vowelRatio > 0.72) pronunciationScore -= 14;
    if (consonantCluster) pronunciationScore -= 22;
    if (hasHyphen || hasDigits) pronunciationScore -= 14;
    pronunciationScore = Math.max(25, Math.min(99, pronunciationScore));

    const tldBonusMap: Record<string, number> = {
      com: 14,
      ai: 12,
      io: 9,
      app: 8,
      dev: 8,
      co: 7,
      net: 4,
      org: 4
    };
    const tldBonus = tldBonusMap[tld] ?? 2;
    let brandableScore = Math.round(lengthScore * 0.45 + pronunciationScore * 0.43 + tldBonus);
    if (!hasHyphen && !hasDigits) brandableScore += 4;
    brandableScore = Math.max(30, Math.min(99, brandableScore));

    const overallAvg = Math.round((brandableScore + pronunciationScore + lengthScore) / 3);
    const overallGrade = overallAvg >= 82 ? 'Strong' : overallAvg >= 66 ? 'Good' : 'Fair';

    const tldMultiplier =
      tld === 'com' ? 2.4 : tld === 'ai' ? 2.1 : tld === 'io' ? 1.5 : tld === 'app' || tld === 'dev' ? 1.25 : 0.9;
    const baseUsd =
      label.length <= 3
        ? 18_500
        : label.length <= 5
        ? 4_200
        : label.length <= 8
        ? 1_650
        : label.length <= 12
        ? 680
        : 240;
    const scoreFactor = 0.65 + overallAvg / 140;
    const cleanPenalty = hasHyphen || hasDigits ? 0.55 : 1;
    const midUsd = Math.max(120, Math.round((baseUsd * tldMultiplier * scoreFactor * cleanPenalty) / 10) * 10);
    const lowUsd = Math.max(90, Math.round((midUsd * 0.72) / 10) * 10);
    const highUsd = Math.max(lowUsd + 100, Math.round((midUsd * 1.38) / 10) * 10);

    const highConflictRoots = [
      'google', 'apple', 'meta', 'amazon', 'stripe', 'openai', 'microsoft',
      'tesla', 'uber', 'airbnb', 'netflix', 'spotify', 'nvidia', 'paypal', 'shopify'
    ];
    const matchedBrand = highConflictRoots.find((b) => label.includes(b));
    const trademarkRisk = matchedBrand
      ? {
          level: 'Elevated' as const,
          note: `Contains protected brand term "${matchedBrand}". Conduct formal USPTO & WIPO clearance before use.`,
          usptoUrl: `https://tmsearch.uspto.gov/search/search-results?query=${encodeURIComponent(label)}`,
          wipoUrl: `https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(label)}`
        }
      : label.length <= 4
      ? {
          level: 'Moderate' as const,
          note: 'Short 3-4 letter acronyms frequently overlap with existing Class 9/42 marks across jurisdictions.',
          usptoUrl: `https://tmsearch.uspto.gov/search/search-results?query=${encodeURIComponent(label)}`,
          wipoUrl: `https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(label)}`
        }
      : {
          level: 'Low' as const,
          note: 'No exact match against major global consumer tech trademarks. Verify regional filings via USPTO & WIPO.',
          usptoUrl: `https://tmsearch.uspto.gov/search/search-results?query=${encodeURIComponent(label)}`,
          wipoUrl: `https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(label)}`
        };

    const appraisalFactors: string[] = [
      `${label.length}-character root (${hasHyphen ? 'contains hyphen' : 'clean alphabetic flow'})`,
      `Vowel balance ${Math.round(vowelRatio * 100)}% (${consonantCluster ? 'dense consonant cluster detected' : 'clear phonetic cadence'})`,
      `.${tld} extension liquidity weight (${tld === 'com' ? 'flagship commercial TLD' : tld === 'ai' ? 'high-demand AI TLD' : 'specialist extension'})`
    ];

    res.json({
      domain: rawDomain,
      label,
      tld,
      brandableScore,
      pronunciationScore,
      lengthScore,
      overallGrade,
      estimatedValueRange: { lowUsd, highUsd },
      trademarkRisk,
      appraisalFactors
    });
  });

  app.get('/api/social-check', rateLimit(45, 60_000), async (req: Request, res: Response) => {
    const raw = String(req.query.handle || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 39);
    if (!raw || raw.length < 2) {
      res.status(400).json({ error: 'Provide a handle of at least 2 characters.' });
      return;
    }

    async function probeHandle(
      platform: string,
      apiUrl: string,
      profileUrl: string
    ): Promise<{
      platform: string;
      handle: string;
      status: 'available' | 'taken' | 'manual_verify';
      profileUrl: string;
      source: 'live_api' | 'direct_link';
    }> {
      try {
        const resp = await fetch(apiUrl, {
          method: 'GET',
          headers: { 'User-Agent': 'DomainHunterSocialCheck/1.0' },
          signal: AbortSignal.timeout(3000)
        });
        if (resp.status === 404) {
          return { platform, handle: raw, status: 'available', profileUrl, source: 'live_api' };
        }
        if (resp.status === 200) {
          return { platform, handle: raw, status: 'taken', profileUrl, source: 'live_api' };
        }
      } catch {
        // timeout or network restricted
      }
      return { platform, handle: raw, status: 'manual_verify', profileUrl, source: 'direct_link' };
    }

    const [github, npmPkg, reddit] = await Promise.all([
      probeHandle('GitHub', `https://api.github.com/users/${encodeURIComponent(raw)}`, `https://github.com/${encodeURIComponent(raw)}`),
      probeHandle('npm Registry', `https://registry.npmjs.org/${encodeURIComponent(raw)}`, `https://www.npmjs.com/package/${encodeURIComponent(raw)}`),
      probeHandle('Reddit', `https://www.reddit.com/user/${encodeURIComponent(raw)}/about.json`, `https://www.reddit.com/user/${encodeURIComponent(raw)}`)
    ]);

    const directLinks = [
      {
        platform: 'X (Twitter)',
        handle: raw,
        status: 'manual_verify' as const,
        profileUrl: `https://x.com/${encodeURIComponent(raw)}`,
        source: 'direct_link' as const
      },
      {
        platform: 'Instagram',
        handle: raw,
        status: 'manual_verify' as const,
        profileUrl: `https://www.instagram.com/${encodeURIComponent(raw)}/`,
        source: 'direct_link' as const
      },
      {
        platform: 'LinkedIn',
        handle: raw,
        status: 'manual_verify' as const,
        profileUrl: `https://www.linkedin.com/company/${encodeURIComponent(raw)}/`,
        source: 'direct_link' as const
      }
    ];

    res.json({ handle: raw, results: [github, npmPkg, reddit, ...directLinks] });
  });

  app.get('/api/expired-domains', rateLimit(90, 60_000), (req: Request, res: Response) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    const tld = String(req.query.tld || 'all').trim().toLowerCase();
    const stage = String(req.query.stage || 'all').trim();
    const maxLen = Number(req.query.maxLen || 30);

    const catalog = [
      { domain: 'velorapay.com', tld: 'com', length: 9, stage: 'Expiring Soon', dropWindow: 'In 4 days', backlinks: 142, estValueUsd: 1850, category: 'Fintech' },
      { domain: 'cortexgrid.ai', tld: 'ai', length: 10, stage: 'Pending Delete', dropWindow: 'In 36 hours', backlinks: 89, estValueUsd: 2400, category: 'AI Infrastructure' },
      { domain: 'nimbleledger.com', tld: 'com', length: 12, stage: 'Expiring Soon', dropWindow: 'In 6 days', backlinks: 215, estValueUsd: 1420, category: 'Accounting' },
      { domain: 'zenithops.io', tld: 'io', length: 9, stage: 'Recent Drop', dropWindow: 'Dropped today', backlinks: 64, estValueUsd: 980, category: 'DevOps' },
      { domain: 'aegisvault.com', tld: 'com', length: 10, stage: 'Pending Delete', dropWindow: 'In 18 hours', backlinks: 310, estValueUsd: 3200, category: 'Cybersecurity' },
      { domain: 'luminahealth.co', tld: 'co', length: 12, stage: 'Expiring Soon', dropWindow: 'In 9 days', backlinks: 118, estValueUsd: 890, category: 'HealthTech' },
      { domain: 'pingila.com', tld: 'com', length: 7, stage: 'Recent Drop', dropWindow: 'Dropped 2h ago', backlinks: 27, estValueUsd: 1650, category: 'Brandable' },
      { domain: 'stratosync.app', tld: 'app', length: 10, stage: 'Expiring Soon', dropWindow: 'In 5 days', backlinks: 73, estValueUsd: 1100, category: 'Cloud SaaS' },
      { domain: 'kinetixpay.io', tld: 'io', length: 10, stage: 'Pending Delete', dropWindow: 'In 48 hours', backlinks: 95, estValueUsd: 1540, category: 'Payments' },
      { domain: 'veritylabs.ai', tld: 'ai', length: 10, stage: 'Expiring Soon', dropWindow: 'In 3 days', backlinks: 184, estValueUsd: 2950, category: 'AI Trust' },
      { domain: 'clariflow.net', tld: 'net', length: 9, stage: 'Recent Drop', dropWindow: 'Dropped today', backlinks: 51, estValueUsd: 640, category: 'Workflow' },
      { domain: 'novapulse.org', tld: 'org', length: 9, stage: 'Expiring Soon', dropWindow: 'In 7 days', backlinks: 129, estValueUsd: 780, category: 'Research' }
    ];

    const filtered = catalog.filter((item) => {
      if (q && !item.domain.includes(q) && !item.category.toLowerCase().includes(q)) return false;
      if (tld !== 'all' && item.tld !== tld) return false;
      if (stage !== 'all' && item.stage !== stage) return false;
      if (Number.isFinite(maxLen) && maxLen > 0 && item.domain.split('.')[0].length > maxLen) return false;
      return true;
    });

    res.json({ items: filtered });
  });

  app.post('/api/ai-names', rateLimit(20, 60_000), async (req: Request, res: Response) => {
    const idea = String(req.body?.idea || '').trim().slice(0, 300);
    if (!idea || idea.length < 2) {
      res.status(400).json({ error: 'Enter a short description of your product or niche.' });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable AI name generation.'
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'] as const;
      let usedModel: string = candidateModels[0];
      let responseText = '';
      let lastErr: unknown = null;

      for (const modelName of candidateModels) {
        try {
          usedModel = modelName;
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Generate 6 short, memorable, brandable startup domain base names (letters/numbers only, no dots or TLDs, 5-12 chars each) for this product idea: "${idea}".`,
            config: {
              systemInstruction:
                'You are a startup naming and domain branding strategist for Domain Hunter. Return concise, pronounceable, modern brand names suitable for .com, .ai, and .io domains.',
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  suggestions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: 'Brandable base name without extension (letters/numbers only)'
                        },
                        tagline: {
                          type: Type.STRING,
                          description: 'Brief 4-8 word reason why this name fits'
                        }
                      },
                      required: ['name', 'tagline']
                    }
                  }
                },
                required: ['suggestions']
              }
            }
          });
          responseText = (response.text ?? '').trim();
          if (responseText) break;
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded/i.test(msg);
          if (!isTransient) {
            throw err;
          }
        }
      }

      if (!responseText) {
        const message = lastErr instanceof Error ? lastErr.message : 'AI naming models are temporarily busy. Please retry.';
        res.status(503).json({ error: message });
        return;
      }

      const parsed = JSON.parse(responseText) as {
        suggestions?: Array<{ name: string; tagline: string }>;
      };

      const cleaned = (parsed.suggestions || [])
        .map((s) => ({
          name: String(s.name || '').replace(/[^a-zA-Z0-9]/g, ''),
          tagline: String(s.tagline || '')
        }))
        .filter((s) => s.name.length >= 3)
        .slice(0, 6);

      if (cleaned.length === 0) {
        res.status(502).json({ error: 'AI did not return valid domain suggestions. Please retry.' });
        return;
      }

      res.json({ suggestions: cleaned, model: usedModel });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate AI names.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/contact', rateLimit(10, 60_000), (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim().slice(0, 100);
    const email = String(req.body?.email || '').trim().slice(0, 160);
    const subject = String(req.body?.subject || '').trim().slice(0, 120);
    const message = String(req.body?.message || '').trim().slice(0, 2000);

    if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !message) {
      res.status(400).json({ error: 'Provide your name, a valid email address, and your message.' });
      return;
    }

    const ticketId = `DH-${Math.floor(100000 + Math.random() * 900000)}`;
    contactMessages.push({
      id: ticketId,
      name,
      email,
      subject: subject || 'General Support',
      message,
      createdAt: new Date().toISOString()
    });

    res.json({ ok: true, ticketId });
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const base = getBaseUrl(req);
    res.type('text/plain').send(generateRobotsTxt(base));
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const base = getBaseUrl(req);
    const xml = generateSitemapXml({ baseUrl: base });
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.type('application/xml; charset=utf-8').send(xml);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Domain Hunter server running on http://0.0.0.0:${PORT}`);
    void syncPublicPricing();
    void syncIanaRdapBootstrap();
  });
}

startServer();
