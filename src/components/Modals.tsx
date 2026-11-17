import React, { useEffect, useState } from 'react';
import {
  Bell,
  BellRing,
  Calendar,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  HardDrive,
  Mail,
  Monitor,
  Trash2,
  X
} from 'lucide-react';
import type {
  AlertChannel,
  AlertTrigger,
  BookmarkItem,
  CurrencyCode,
  DomainAlertItem,
  DomainResult,
  TldPricingEntry
} from '../types/domain';
import {
  EXTENDED_TLDS,
  formatDomainPrice,
  getRegistrarQuotes,
  parseUsdPrice,
  REGISTRARS
} from '../utils/rdap';

interface WhoisModalProps {
  item: DomainResult | null;
  currency?: CurrencyCode;
  usdToInr?: number;
  tldPricing?: Record<string, TldPricingEntry>;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export const WhoisModal: React.FC<WhoisModalProps> = ({
  item,
  currency = 'USD',
  usdToInr = 85.5,
  tldPricing,
  onClose,
  onCopy
}) => {
  if (!item) return null;

  const rdap = item.rdap;
  const events = rdap?.events || [];
  const regEvent = events.find((e) => e.eventAction === 'registration');
  const expEvent = events.find((e) => e.eventAction === 'expiration');

  let registrarName = 'Not disclosed';
  const registrarEntity = (rdap?.entities || []).find((e) => (e.roles || []).includes('registrar'));
  if (registrarEntity?.vcardArray?.[1]) {
    const fnField = registrarEntity.vcardArray[1].find((f) => f[0] === 'fn');
    if (fnField?.[3]) registrarName = String(fnField[3]);
  }

  const nameservers = (rdap?.nameservers || []).map((n) => n.ldhName).filter(Boolean) as string[];
  const statuses = (rdap?.status || []).slice(0, 4);
  const formattedPrice = formatDomainPrice(item.price, currency, usdToInr);
  const formattedRenewal = formatDomainPrice(item.renewalPrice, currency, usdToInr);
  const quotes = getRegistrarQuotes(item.domain, item.status, item.price, item.renewalPrice, tldPricing);

  const fmtDate = (iso?: string) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-serif-domain text-lg font-bold text-slate-900 dark:text-white truncate">
              {item.domain}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {item.status === 'available' || item.status === 'hack'
                ? `Available for registration${formattedPrice ? ` · ${formattedPrice}/yr` : ''}${formattedRenewal ? ` · Renews ${formattedRenewal}/yr` : ''}`
                : item.status === 'premium'
                ? `Aftermarket Listing (${formattedPrice || 'Make offer'})`
                : item.status === 'taken'
                ? 'Live RDAP / WHOIS Record'
                : 'Check Manually'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm">
          {rdap ? (
            <>
              <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08] p-4 text-xs">
                <div>
                  <span className="text-slate-500 block">Registrar</span>
                  <span className="font-medium text-slate-900 dark:text-white mt-0.5 block truncate">{registrarName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Handle</span>
                  <span className="font-medium text-slate-900 dark:text-white mt-0.5 block truncate">{rdap.handle || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Registered</span>
                  <span className="font-medium text-slate-900 dark:text-white mt-0.5 block tabular-nums">{fmtDate(regEvent?.eventDate)}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Expires</span>
                  <span className="font-medium text-slate-900 dark:text-white mt-0.5 block tabular-nums">{fmtDate(expEvent?.eventDate)}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1.5">Nameservers</p>
                <div className="rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08] p-3 font-mono-tech text-xs text-slate-700 dark:text-zinc-300 space-y-1">
                  {nameservers.length ? nameservers.map((ns) => <div key={ns}>{ns}</div>) : <div>None listed</div>}
                </div>
              </div>

              {statuses.length > 0 && (
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  EPP Status: {statuses.join(' · ')}
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-zinc-400">
                {item.status === 'available' || item.status === 'hack'
                  ? `Verified unregistered via RDAP & DNS (${formattedPrice || '$11.99'}/yr). Compare 1st-year & renewal quotes:`
                  : 'No RDAP payload was returned. Verify availability directly at a registrar:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {quotes.slice(0, 6).map((reg) => {
                  const regPrice = formatDomainPrice(reg.firstYearUsd, currency, usdToInr);
                  return (
                    <a
                      key={reg.id}
                      href={reg.buildUrl(item.domain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-xs font-medium text-slate-900 dark:text-white transition-colors"
                    >
                      <span className="truncate">{reg.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0 font-mono-tech tabular-nums text-emerald-600 dark:text-emerald-400">
                        {(item.status === 'available' || item.status === 'hack') && regPrice ? regPrice : null}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onCopy(item.domain)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.07] hover:bg-slate-200 dark:hover:bg-white/[0.12] text-xs font-medium text-slate-900 dark:text-white"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy domain</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotifyAlertModalProps {
  item: DomainResult | null;
  existingAlert: DomainAlertItem | null;
  isSignedIn: boolean;
  userEmail: string | null;
  onPromptLogin: () => void;
  onSaveAlert: (payload: {
    domain: string;
    channel: AlertChannel;
    trigger: AlertTrigger;
    expiresAt: string | null;
    maxPriceUsd: number | null;
  }) => Promise<void> | void;
  onRemoveAlert: (domain: string) => Promise<void> | void;
  onClose: () => void;
}

export const NotifyAlertModal: React.FC<NotifyAlertModalProps> = ({
  item,
  existingAlert,
  isSignedIn,
  userEmail,
  onPromptLogin,
  onSaveAlert,
  onRemoveAlert,
  onClose
}) => {
  const [channel, setChannel] = useState<AlertChannel>('browser');
  const [trigger, setTrigger] = useState<AlertTrigger>('expires_or_available');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<string>('default');

  useEffect(() => {
    if (!item) return;
    setStatusError(null);
    const currentUsd = parseUsdPrice(item.price);
    const suggestedBudget = currentUsd
      ? String(Math.max(50, Math.round(currentUsd * 0.8)))
      : item.status === 'premium'
      ? '2500'
      : '';

    if (existingAlert) {
      setChannel(existingAlert.channel);
      setTrigger(existingAlert.trigger);
      setMaxPriceInput(
        existingAlert.maxPriceUsd != null
          ? String(existingAlert.maxPriceUsd)
          : suggestedBudget
      );
    } else {
      setChannel(isSignedIn && userEmail ? 'email' : 'browser');
      setTrigger(item.status === 'premium' ? 'price_below_budget' : 'expires_or_available');
      setMaxPriceInput(suggestedBudget);
    }

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState('unsupported');
    }
  }, [item, existingAlert, isSignedIn, userEmail]);

  if (!item) return null;

  const isPremiumDomain = item.status === 'premium';
  const currentUsdPrice = parseUsdPrice(item.price);
  const parsedBudgetInput = (() => {
    const cleaned = maxPriceInput.replace(/[,$\s]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? Math.round(n) : null;
  })();

  const expEvent = (item.rdap?.events || []).find((e) => e.eventAction === 'expiration');
  const rawExpiresAt = expEvent?.eventDate || existingAlert?.expiresAt || null;

  const formattedExpires = (() => {
    if (!rawExpiresAt) return null;
    try {
      return new Date(rawExpiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return rawExpiresAt;
    }
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusError(null);

    let resolvedMaxPrice: number | null = null;
    if (trigger === 'price_below_budget') {
      if (parsedBudgetInput === null || parsedBudgetInput < 1 || parsedBudgetInput > 10_000_000) {
        setStatusError('Enter a valid maximum budget between $1 and $10,000,000 USD.');
        return;
      }
      resolvedMaxPrice = parsedBudgetInput;
    } else if (parsedBudgetInput !== null && parsedBudgetInput >= 1 && parsedBudgetInput <= 10_000_000) {
      resolvedMaxPrice = null;
    }

    if ((channel === 'email' || channel === 'both') && (!isSignedIn || !userEmail)) {
      setStatusError('Sign in with Google to receive email alerts, or switch to Local Browser Notification.');
      return;
    }

    if (channel === 'browser' || channel === 'both') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            const perm = await Notification.requestPermission();
            setPermissionState(perm);
            if (perm === 'denied') {
              setStatusError('Browser notification permission was denied. Allow notifications in site settings or sign in for Email alerts.');
              return;
            }
          } catch {
            // fallback gracefully if iframe blocks prompt
          }
        } else if (Notification.permission === 'denied') {
          setStatusError('Browser notifications are blocked in your browser settings. Enable them or use Email alerts.');
          return;
        }
      }
    }

    setSaving(true);
    try {
      await onSaveAlert({
        domain: item.domain,
        channel,
        trigger,
        expiresAt: rawExpiresAt ? String(rawExpiresAt).slice(0, 64) : null,
        maxPriceUsd: resolvedMaxPrice
      });
      onClose();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Could not save alert.');
    } finally {
      setSaving(false);
    }
  };

  const triggerOptions: Array<{ id: AlertTrigger; label: string; desc: string }> = isPremiumDomain
    ? [
        {
          id: 'price_below_budget',
          label: 'Price drops within my budget',
          desc: 'Only notifies when aftermarket pricing is at or below your max USD threshold'
        },
        {
          id: 'available',
          label: 'Drops back to standard registration',
          desc: 'Notifies if the premium listing expires and becomes freely available'
        },
        {
          id: 'expires_or_available',
          label: 'Expires or changes status',
          desc: 'Notifies on expiration window or registry status transitions'
        }
      ]
    : [
        {
          id: 'expires_or_available',
          label: 'Expires or becomes available',
          desc: 'Notifies on expiration window and drop/availability'
        },
        {
          id: 'available',
          label: 'Becomes available to register',
          desc: 'Notifies as soon as RDAP & DNS show unregistered'
        },
        {
          id: 'expiring',
          label: 'Enters expiration window',
          desc: 'Notifies when registry expiration approaches'
        },
        {
          id: 'price_below_budget',
          label: 'Listed at or below my budget',
          desc: 'Only notifies if listed in the aftermarket within your max USD price'
        }
      ];

  const budgetPresets = currentUsdPrice
    ? [
        { label: '-15%', value: Math.max(50, Math.round(currentUsdPrice * 0.85)) },
        { label: '-30%', value: Math.max(50, Math.round(currentUsdPrice * 0.7)) },
        { label: '-50%', value: Math.max(50, Math.round(currentUsdPrice * 0.5)) }
      ]
    : [
        { label: '$500', value: 500 },
        { label: '$1,500', value: 1500 },
        { label: '$5,000', value: 5000 }
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              {existingAlert ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
                Notify Me
              </h3>
              <p className="font-serif-domain text-xs text-slate-500 dark:text-zinc-400 truncate">
                {item.domain}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notification dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-sm overflow-y-auto">
          {/* Expiration / Listing Price Info */}
          <div className="rounded-xl bg-slate-50 dark:bg-black/60 border border-slate-200 dark:border-white/[0.08] px-4 py-3 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-400">
              <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                {isPremiumDomain
                  ? 'Current Listing'
                  : formattedExpires
                  ? 'Registry Expiration'
                  : 'Status Monitor'}
              </span>
            </div>
            <span className="font-medium text-slate-900 dark:text-white tabular-nums">
              {isPremiumDomain
                ? item.price || 'Make offer'
                : formattedExpires || 'Live RDAP & DNS'}
            </span>
          </div>

          {/* Alert Trigger Selection */}
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">
              Alert me when this domain:
            </p>
            <div className="grid grid-cols-1 gap-2">
              {triggerOptions.map((opt) => {
                const selected = trigger === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTrigger(opt.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors ${
                      selected
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{opt.label}</span>
                      {selected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-500 mt-0.5">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Maximum Price Threshold Input */}
          {trigger === 'price_below_budget' && (
            <div className="rounded-xl bg-sky-500/[0.06] border border-sky-500/25 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="maxPriceThresholdInput"
                  className="text-xs font-semibold text-slate-900 dark:text-white"
                >
                  Maximum Price Threshold (USD)
                </label>
                <div className="flex items-center gap-1.5">
                  {budgetPresets.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setMaxPriceInput(String(preset.value))}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono-tech border transition-colors ${
                        parsedBudgetInput === preset.value
                          ? 'bg-sky-500 text-white border-sky-500'
                          : 'bg-white dark:bg-black/60 border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-zinc-300 hover:border-sky-500/50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-mono-tech font-semibold text-slate-500 dark:text-zinc-400">
                  $
                </span>
                <input
                  id="maxPriceThresholdInput"
                  type="number"
                  min={1}
                  max={10000000}
                  step={1}
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full rounded-xl bg-white dark:bg-black border border-slate-200 dark:border-white/[0.12] pl-7 pr-14 py-2 text-sm font-mono-tech text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
                />
                <span className="absolute right-3.5 text-[11px] font-mono-tech text-slate-400">
                  USD
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                {parsedBudgetInput && parsedBudgetInput >= 1 ? (
                  currentUsdPrice ? (
                    parsedBudgetInput >= currentUsdPrice ? (
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Current price (${currentUsdPrice.toLocaleString()}) is already within your ${parsedBudgetInput.toLocaleString()} budget.
                      </span>
                    ) : (
                      <span>
                        Only notifies if price drops by{' '}
                        <strong className="text-slate-900 dark:text-white">
                          ${(currentUsdPrice - parsedBudgetInput).toLocaleString()}
                        </strong>{' '}
                        to <strong className="text-sky-500">${parsedBudgetInput.toLocaleString()}</strong> or less.
                      </span>
                    )
                  ) : (
                    <span>
                      Only notifies when a verified price of{' '}
                      <strong className="text-sky-500">${parsedBudgetInput.toLocaleString()}</strong> or less is detected.
                    </span>
                  )
                ) : (
                  'Set the maximum amount you are willing to pay for this domain.'
                )}
              </p>
            </div>
          )}

          {/* Delivery Channel Selection */}
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-zinc-400 mb-2">
              Notification method:
            </p>
            <div className="space-y-2">
              {isSignedIn && userEmail ? (
                <>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-start gap-3 ${
                      channel === 'email'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    <Mail className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Email Alert</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                        Send alert to {userEmail}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChannel('both')}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-start gap-3 ${
                      channel === 'both'
                        ? 'bg-emerald-500/10 border-emerald-500/50'
                        : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/[0.08]'
                    }`}
                  >
                    <BellRing className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">
                        Email + Local Browser Notification
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Cloud email alert &amp; instant browser desktop push
                      </div>
                    </div>
                  </button>
                </>
              ) : (
                <div className="rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/[0.08] p-3 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <Mail className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-white">Email Alert</div>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                        Log in with Google to receive email alerts.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onPromptLogin();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap shrink-0"
                  >
                    Log In
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setChannel('browser')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-colors flex items-start gap-3 ${
                  channel === 'browser'
                    ? 'bg-emerald-500/10 border-emerald-500/50'
                    : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/[0.08]'
                }`}
              >
                <Monitor className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white">
                    Local Browser Notification
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {permissionState === 'granted'
                      ? 'Browser notifications enabled'
                      : permissionState === 'denied'
                      ? 'Permission blocked in browser settings'
                      : permissionState === 'unsupported'
                      ? 'In-app alert monitoring active'
                      : 'Prompts browser permission when saved'}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {statusError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/25 px-3.5 py-2.5 text-xs text-rose-500">
              {statusError}
            </div>
          )}

          <div className="pt-1 flex items-center justify-between gap-2">
            {existingAlert ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await onRemoveAlert(item.domain);
                    onClose();
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-3.5 py-2 rounded-xl border border-rose-500/30 text-xs font-medium text-rose-500 hover:bg-rose-500/10 disabled:opacity-50"
              >
                Remove Alert
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs sm:text-sm font-semibold text-white transition-colors"
            >
              {saving ? 'Saving...' : existingAlert ? 'Update Alert' : 'Set Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface BookmarksDrawerProps {
  open: boolean;
  bookmarks: BookmarkItem[];
  alerts?: DomainAlertItem[];
  isSignedIn: boolean;
  onPromptLogin: () => void;
  onClose: () => void;
  onRemove: (domain: string) => void;
  onRemoveAlert?: (domain: string) => void;
  onClearAll: () => void;
  onCopyAll: () => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  open,
  bookmarks,
  alerts = [],
  isSignedIn,
  onPromptLogin,
  onClose,
  onRemove,
  onRemoveAlert,
  onClearAll,
  onCopyAll
}) => {
  const [tab, setTab] = useState<'bookmarks' | 'alerts'>('bookmarks');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#111114] border-l border-slate-200 dark:border-white/[0.1] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Saved Watchlist &amp; Alerts</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1.5">
              {isSignedIn ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Synced to your encrypted cloud account</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  <span>Stored locally in browser</span>
                </>
              )}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close drawer" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-3 flex items-center gap-2 border-b border-slate-200 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={() => setTab('bookmarks')}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors ${
              tab === 'bookmarks'
                ? 'border-emerald-500 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
            }`}
          >
            Watchlist ({bookmarks.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('alerts')}
            className={`pb-2.5 px-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              tab === 'alerts'
                ? 'border-amber-500 text-slate-900 dark:text-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-zinc-300'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>Alerts ({alerts.length})</span>
          </button>
        </div>

        {!isSignedIn && (
          <div className="mx-5 mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-700 dark:text-zinc-300">
              Sign in to sync saved domains and email alerts across devices.
            </p>
            <button
              type="button"
              onClick={onPromptLogin}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white whitespace-nowrap shrink-0"
            >
              Log In
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {tab === 'bookmarks' ? (
            bookmarks.length === 0 ? (
              <div className="text-center py-14">
                <p className="text-sm font-medium text-slate-900 dark:text-white">Your watchlist is empty</p>
                <p className="text-xs text-slate-500 mt-1">Click the bookmark icon on any domain row to save it here.</p>
              </div>
            ) : (
              bookmarks.map((b) => (
                <div key={b.domain} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/[0.08] px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-serif-domain text-base font-semibold text-slate-900 dark:text-white truncate">{b.domain}</div>
                    <div className="text-xs text-slate-500 capitalize">{b.status}{b.price ? ` · ${b.price}` : ''}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(b.domain)}
                    aria-label={`Remove ${b.domain}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )
          ) : alerts.length === 0 ? (
            <div className="text-center py-14">
              <p className="text-sm font-medium text-slate-900 dark:text-white">No active alerts</p>
              <p className="text-xs text-slate-500 mt-1">
                Click the bell icon on any taken or premium domain result to set an email or browser notification.
              </p>
            </div>
          ) : (
            alerts.map((a) => (
              <div key={a.domain} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/[0.08] px-4 py-3">
                <div className="min-w-0">
                  <div className="font-serif-domain text-base font-semibold text-slate-900 dark:text-white truncate">{a.domain}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {a.channel === 'both' ? 'Email + Browser' : a.channel} · {a.trigger.replace(/_/g, ' ')}
                    {a.maxPriceUsd != null ? ` (Max $${a.maxPriceUsd.toLocaleString()})` : ''}
                  </div>
                </div>
                {onRemoveAlert && (
                  <button
                    type="button"
                    onClick={() => onRemoveAlert(a.domain)}
                    aria-label={`Remove alert for ${a.domain}`}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-white/[0.08] flex items-center gap-3">
          <button
            type="button"
            onClick={onCopyAll}
            disabled={bookmarks.length === 0}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-medium text-white transition-colors"
          >
            Copy All ({bookmarks.length})
          </button>
          <button
            type="button"
            onClick={onClearAll}
            disabled={bookmarks.length === 0}
            className="py-2.5 px-4 rounded-xl border border-slate-200 dark:border-white/[0.1] text-sm font-medium text-slate-600 dark:text-zinc-400 hover:text-red-500 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExtensionSettingsModalProps {
  open: boolean;
  selectedTlds: string[];
  onToggleTld: (tld: string) => void;
  onClose: () => void;
}

export const ExtensionSettingsModal: React.FC<ExtensionSettingsModalProps> = ({
  open,
  selectedTlds,
  onToggleTld,
  onClose
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#141416] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Configure Extensions</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
            Select which TLD extensions Domain Hunter checks in parallel during Instant Search:
          </p>
          <div className="grid grid-cols-4 gap-2">
            {EXTENDED_TLDS.map((tld) => {
              const active = selectedTlds.includes(tld);
              return (
                <button
                  key={tld}
                  type="button"
                  onClick={() => onToggleTld(tld)}
                  className={`py-2 px-2 rounded-lg text-xs font-mono-tech font-medium border transition-colors ${
                    active
                      ? 'bg-emerald-600/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  .{tld}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
