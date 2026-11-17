import React, { useEffect, useState } from 'react';
import { ArrowRight, KeyRound, Ticket } from 'lucide-react';
import type { CurrencyCode, DomainStatus, RegistrarPriceQuote, TldPricingEntry } from '../types/domain';
import { fetchRegistrarQuotes, formatDomainPrice, getRegistrarQuotes } from '../utils/rdap';

interface RegistrarDropdownProps {
  domain: string;
  onClose: () => void;
  status?: DomainStatus;
  price?: string | null;
  renewalPrice?: string | null;
  currency?: CurrencyCode;
  usdToInr?: number;
  tldPricing?: Record<string, TldPricingEntry>;
  pricingSource?: 'live_porkbun' | 'catalog_benchmark';
}

function RegistrarMark({ id }: { id: string }) {
  switch (id) {
    case 'cloudflare':
      return (
        <span className="w-5 h-5 rounded-full bg-[#f38020]/15 text-[#f38020] flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M18.6 15.8H6.1a3.1 3.1 0 0 1-.4-6.1A4.8 4.8 0 0 1 15 8.5a3.7 3.7 0 0 1 3.6 7.3z" />
          </svg>
        </span>
      );
    case 'porkbun':
      return (
        <span className="w-5 h-5 rounded-full bg-[#ef6c83]/15 text-[#ef6c83] text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
          P
        </span>
      );
    case 'godaddy':
      return (
        <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#1bdbdb]" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M12 20c-4.5-2.5-8-6-8-10.2C4 6.8 6.4 5 8.8 5c1.5 0 2.6.8 3.2 1.8C12.6 5.8 13.7 5 15.2 5 17.6 5 20 6.8 20 9.8 20 14 16.5 17.5 12 20z" />
          </svg>
        </span>
      );
    case 'hostinger':
      return (
        <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#7c5cff]" fill="currentColor">
            <path d="M5 3h4v7h6V3h4v18h-4v-7H9v7H5V3z" />
          </svg>
        </span>
      );
    case 'spaceship':
      return (
        <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#3b82f6]" fill="currentColor">
            <path d="M12 3l8 16-8-4-8 4 8-16z" />
          </svg>
        </span>
      );
    case 'domain':
      return (
        <span className="w-5 h-5 rounded-full border-2 border-[#ef4444] text-[#ef4444] text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
          D
        </span>
      );
    case 'networksolutions':
      return (
        <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-zinc-900 dark:text-zinc-100" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#f97316]" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l5-10 6 10 5-10" />
          </svg>
        </span>
      );
  }
}

export const RegistrarDropdown: React.FC<RegistrarDropdownProps> = ({
  domain,
  onClose,
  status = 'available',
  price,
  renewalPrice,
  currency = 'USD',
  usdToInr = 85.5,
  tldPricing,
  pricingSource = 'catalog_benchmark'
}) => {
  const showQuotes = status === 'available' || status === 'hack';
  const fallbackQuotes = getRegistrarQuotes(domain, status, price, renewalPrice, tldPricing);
  const [liveQuotes, setLiveQuotes] = useState<RegistrarPriceQuote[] | null>(null);
  const [effectiveFx, setEffectiveFx] = useState<number>(usdToInr);
  const [linkMode, setLinkMode] = useState<'checkout' | 'auth'>('checkout');

  useEffect(() => {
    setEffectiveFx(usdToInr);
  }, [usdToInr]);

  useEffect(() => {
    setLiveQuotes(null);
    if (!showQuotes) return;
    let active = true;
    fetchRegistrarQuotes(domain).then((res) => {
      if (!active || !res?.quotes?.length) return;
      const urlMap = new Map(fallbackQuotes.map((q) => [q.id, q]));
      setEffectiveFx(res.usdToInr || usdToInr);
      setLiveQuotes(
        res.quotes.map((q) => {
          const fallback = urlMap.get(q.id);
          return {
            id: q.id,
            name: q.name,
            firstYearUsd: q.firstYearUsd,
            renewalUsd: q.renewalUsd,
            hasPromo: q.hasPromo,
            promoLabel: q.promoLabel,
            affiliateTag: q.affiliateTag || fallback?.affiliateTag,
            hasAuthDeepLink: q.hasAuthDeepLink ?? fallback?.hasAuthDeepLink,
            buildUrl: () => q.checkoutUrl || (fallback ? fallback.buildUrl(domain) : '#'),
            buildAuthUrl: q.authDeepLinkUrl
              ? () => q.authDeepLinkUrl as string
              : fallback?.buildAuthUrl
          };
        })
      );
    });
    return () => {
      active = false;
    };
  }, [domain, showQuotes]);

  const quotes = liveQuotes || fallbackQuotes;

  return (
    <div
      role="menu"
      aria-label={`Registrars for ${domain}`}
      className="absolute right-0 top-full mt-2 w-80 sm:w-[348px] rounded-2xl bg-white dark:bg-[#141416] border border-zinc-200 dark:border-white/[0.12] shadow-2xl py-2 z-40"
    >
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-white/[0.06] space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          <span className="truncate">
            {showQuotes
              ? pricingSource === 'live_porkbun'
                ? 'Live TLD & Registrar Quotes'
                : '2026 Registrar Rate Comparison'
              : status === 'premium'
              ? 'Aftermarket Checkout Links'
              : 'Verify Ownership / Backorder'}
          </span>
          {showQuotes && <span className="font-mono-tech tabular-nums shrink-0">1st yr / ren</span>}
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-100 dark:bg-black/60 border border-zinc-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLinkMode('checkout');
            }}
            className={`flex-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500 ${
              linkMode === 'checkout'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Affiliate Checkout
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLinkMode('auth');
            }}
            className={`flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-emerald-500 ${
              linkMode === 'auth'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-3 h-3 shrink-0" />
            <span>Sign-in Deep Link</span>
          </button>
        </div>
      </div>

      {quotes.map((reg) => {
        const regLabel = formatDomainPrice(reg.firstYearUsd, currency, effectiveFx);
        const renLabel = formatDomainPrice(reg.renewalUsd, currency, effectiveFx);
        const checkoutHref = reg.buildUrl(domain);
        const authHref = reg.buildAuthUrl ? reg.buildAuthUrl(domain) : null;
        const primaryHref = linkMode === 'auth' && authHref ? authHref : checkoutHref;

        return (
          <div
            key={reg.id}
            className="flex items-center justify-between gap-2 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <a
              href={primaryHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              title={
                linkMode === 'auth' && authHref
                  ? `Sign in to ${reg.name} and continue directly to ${domain}`
                  : `Open ${domain} at ${reg.name}`
              }
              className="flex-1 flex items-center justify-between gap-3 min-w-0 py-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100 focus-visible:outline-2 focus-visible:outline-emerald-500 rounded-md"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <RegistrarMark id={reg.id} />
                <span className="truncate font-serif-domain">{reg.name}</span>
                {reg.hasPromo && (
                  <span className="inline-flex items-center text-emerald-500 shrink-0" title={reg.promoLabel || 'Promo available'}>
                    <Ticket className="w-3.5 h-3.5" />
                  </span>
                )}
              </span>

              {showQuotes && regLabel ? (
                <span className="flex items-center gap-1.5 shrink-0 font-mono-tech text-xs tabular-nums">
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{regLabel}</span>
                  {renLabel && <span className="text-zinc-400 dark:text-zinc-500">/ {renLabel}</span>}
                </span>
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />
              )}
            </a>

            {authHref && (
              <a
                href={authHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                aria-label={`Sign in via ${reg.name} deep link for ${domain}`}
                title={`Direct Sign-in Deep Link (${reg.name})`}
                className={`p-1.5 rounded-lg border transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-emerald-500 ${
                  linkMode === 'auth'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-zinc-200 dark:border-white/[0.1] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-300 dark:hover:border-white/[0.2]'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        );
      })}

      <div className="px-4 pt-2 mt-1 border-t border-zinc-100 dark:border-white/[0.06] text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between gap-2">
        <span className="truncate">Direct SSO auth deep links: GoDaddy · Porkbun · Namecheap</span>
        <span className="font-mono-tech tabular-nums shrink-0">ref</span>
      </div>
    </div>
  );
};
