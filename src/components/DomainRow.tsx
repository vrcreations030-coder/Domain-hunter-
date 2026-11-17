import React from 'react';
import { Bell, BellRing, Bookmark, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react';
import type { CurrencyCode, DomainResult, TldPricingEntry } from '../types/domain';
import { formatDomainPrice } from '../utils/rdap';
import { RegistrarDropdown } from './RegistrarDropdown';

interface DomainRowProps {
  item: DomainResult;
  isBookmarked: boolean;
  hasAlert?: boolean;
  isDropdownOpen: boolean;
  currency?: CurrencyCode;
  usdToInr?: number;
  tldPricing?: Record<string, TldPricingEntry>;
  pricingSource?: 'live_porkbun' | 'catalog_benchmark';
  onToggleBookmark: (item: DomainResult) => void;
  onOpenNotify?: (item: DomainResult) => void;
  onToggleDropdown: (domain: string) => void;
  onCloseDropdown: () => void;
  onPrimaryAction: (item: DomainResult) => void;
  onInspectMore: (item: DomainResult) => void;
}

export const DomainRow: React.FC<DomainRowProps> = ({
  item,
  isBookmarked,
  hasAlert = false,
  isDropdownOpen,
  currency = 'USD',
  usdToInr = 85.5,
  tldPricing,
  pricingSource = 'catalog_benchmark',
  onToggleBookmark,
  onOpenNotify,
  onToggleDropdown,
  onCloseDropdown,
  onPrimaryAction,
  onInspectMore
}) => {
  const formattedPrice = formatDomainPrice(item.price, currency, usdToInr);
  const formattedRenewal = formatDomainPrice(item.renewalPrice, currency, usdToInr);

  const getVisuals = () => {
    switch (item.status) {
      case 'available':
        return {
          dotClass: 'bg-[#22c55e]',
          nameClass: 'text-zinc-900 dark:text-white',
          btnTextClass: 'text-[#16a34a] dark:text-[#22c55e]',
          btnLabel: formattedPrice || 'Continue'
        };
      case 'hack':
        return {
          dotClass: 'bg-[#f59e0b]',
          nameClass: 'text-zinc-900 dark:text-white',
          btnTextClass: 'text-[#d97706] dark:text-[#f59e0b]',
          btnLabel: formattedPrice || 'Continue'
        };
      case 'premium':
        return {
          dotClass: 'bg-[#2596ff]',
          nameClass: 'text-zinc-900 dark:text-white',
          btnTextClass: 'text-[#0284c7] dark:text-[#2596ff]',
          btnLabel: formattedPrice || 'Make offer'
        };
      case 'taken':
        return {
          dotClass: 'bg-[#ef4444]',
          nameClass: 'text-zinc-400 dark:text-zinc-400',
          btnTextClass: 'text-[#dc2626] dark:text-[#ef4444]',
          btnLabel: 'Lookup'
        };
      case 'loading':
        return {
          dotClass: 'bg-zinc-400 dark:bg-zinc-600 animate-pulse',
          nameClass: 'text-zinc-400 dark:text-zinc-500',
          btnTextClass: 'text-zinc-400 dark:text-zinc-500',
          btnLabel: 'Checking'
        };
      default:
        return {
          dotClass: 'bg-zinc-500',
          nameClass: 'text-zinc-500 dark:text-zinc-400',
          btnTextClass: 'text-zinc-500 dark:text-zinc-400',
          btnLabel: 'Check Manually'
        };
    }
  };

  const v = getVisuals();

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-100 dark:border-white/[0.04] last:border-b-0">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${v.dotClass}`} aria-hidden="true" />
        <button
          type="button"
          onClick={() => onPrimaryAction(item)}
          className={`font-serif-domain text-[17px] sm:text-lg tracking-tight truncate text-left hover:underline decoration-zinc-600 underline-offset-4 ${v.nameClass}`}
        >
          {item.domain}
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onToggleBookmark(item)}
            aria-label={isBookmarked ? `Remove bookmark for ${item.domain}` : `Bookmark ${item.domain}`}
            className={`p-1 rounded-md transition-colors ${
              isBookmarked
                ? 'text-purple-500'
                : 'text-zinc-400 dark:text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          {(item.status === 'taken' || item.status === 'premium') && onOpenNotify && (
            <button
              type="button"
              onClick={() => onOpenNotify(item)}
              title={
                hasAlert
                  ? 'Alert active — manage notification'
                  : item.status === 'premium'
                  ? 'Notify me when price drops within budget'
                  : 'Notify me when available or expiring'
              }
              aria-label={
                hasAlert
                  ? `Manage alert for ${item.domain}`
                  : item.status === 'premium'
                  ? `Set price alert for ${item.domain}`
                  : `Notify me when ${item.domain} expires or becomes available`
              }
              className={`p-1 rounded-md transition-colors ${
                hasAlert
                  ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-white/[0.06]'
              }`}
            >
              {hasAlert ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => onInspectMore(item)}
            aria-label={`Details for ${item.domain}`}
            className="p-1 rounded-md text-zinc-400 dark:text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative shrink-0 flex items-center gap-2.5">
        {(item.status === 'available' || item.status === 'hack') && formattedRenewal && (
          <span className="hidden md:inline text-[11px] font-mono-tech text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
            ren {formattedRenewal}
          </span>
        )}

        <div className="inline-flex items-stretch rounded-lg bg-zinc-100 dark:bg-[#161618] border border-zinc-200 dark:border-white/[0.06] overflow-hidden">
          <button
            type="button"
            disabled={item.status === 'loading'}
            onClick={() => onPrimaryAction(item)}
            title={
              formattedPrice
                ? `${item.domain} — ${formattedPrice}${formattedRenewal ? ` (renews ${formattedRenewal}/yr)` : ''}`
                : undefined
            }
            className={`px-3.5 sm:px-4 py-1.5 text-sm font-serif-domain font-medium whitespace-nowrap tabular-nums hover:bg-zinc-200/70 dark:hover:bg-white/[0.06] transition-colors ${v.btnTextClass}`}
          >
            {v.btnLabel}
          </button>
          <button
            type="button"
            disabled={item.status === 'loading'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDropdown(item.domain);
            }}
            aria-label={`Open registrars for ${item.domain}`}
            aria-expanded={isDropdownOpen}
            className="px-2 py-1.5 border-l border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/70 dark:hover:bg-white/[0.06] transition-colors flex items-center justify-center"
          >
            {isDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isDropdownOpen && (
          <RegistrarDropdown
            domain={item.domain}
            status={item.status}
            price={item.price}
            renewalPrice={item.renewalPrice}
            currency={currency}
            usdToInr={usdToInr}
            tldPricing={tldPricing}
            pricingSource={pricingSource}
            onClose={onCloseDropdown}
          />
        )}
      </div>
    </div>
  );
};
