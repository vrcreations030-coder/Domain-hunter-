import React from 'react';
import { Globe, Moon, ShieldCheck, Sun } from 'lucide-react';
import { DomainHunterLogo } from './DomainHunterLogo';

interface FooterCardProps {
  isDark: boolean;
  onToggleTheme: (dark: boolean) => void;
  language: string;
  onChangeLanguage: (lang: string) => void;
  domainsVerified: number;
  onNavigate: (path: string) => void;
  onOpenBookmarks: () => void;
}

export const FooterCard: React.FC<FooterCardProps> = ({
  isDark,
  onToggleTheme,
  language,
  onChangeLanguage,
  domainsVerified,
  onNavigate,
  onOpenBookmarks
}) => {
  const handleLink = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#09090b] mt-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-200 dark:border-white/[0.08]">
          {/* Brand Summary */}
          <div className="md:col-span-4 space-y-4">
            <a href="/" onClick={(e) => handleLink(e, '/')} className="inline-block">
              <DomainHunterLogo size="sm" />
            </a>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
              Real-time domain intelligence, RDAP/DNS ownership verification, Gemini AI brand naming, and cloud-synced watchlists.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>TLS Encrypted · Zero Search Logging</span>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Search Tools
              </h3>
              <a href="/" onClick={(e) => handleLink(e, '/')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Instant Search
              </a>
              <a href="/extensions" onClick={(e) => handleLink(e, '/extensions')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Extensions (20+ TLDs)
              </a>
              <a href="/generator" onClick={(e) => handleLink(e, '/generator')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                AI Name Studio
              </a>
              <a href="/expired" onClick={(e) => handleLink(e, '/expired')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Expired Domains
              </a>
              <a href="/research" onClick={(e) => handleLink(e, '/research')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Bulk CSV Scanner
              </a>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Intelligence &amp; Guides
              </h3>
              <a href="/tools" onClick={(e) => handleLink(e, '/tools')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Brand &amp; Social Research
              </a>
              <a href="/reverse-dictionary" onClick={(e) => handleLink(e, '/reverse-dictionary')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Reverse Dictionary
              </a>
              <a href="/radar" onClick={(e) => handleLink(e, '/radar')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Registry Radar
              </a>
              <a href="/guides" onClick={(e) => handleLink(e, '/guides')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Naming Guides
              </a>
              <a href="/faq" onClick={(e) => handleLink(e, '/faq')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                FAQ
              </a>
              <button
                type="button"
                onClick={onOpenBookmarks}
                className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
              >
                Saved Watchlist
              </button>
            </div>

            <div className="space-y-2.5 col-span-2 sm:col-span-1">
              <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                Company &amp; Legal
              </h3>
              <a href="/contact" onClick={(e) => handleLink(e, '/contact')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Contact Support
              </a>
              <a href="/security" onClick={(e) => handleLink(e, '/security')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Security Architecture
              </a>
              <a href="/terms" onClick={(e) => handleLink(e, '/terms')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="/privacy" onClick={(e) => handleLink(e, '/privacy')} className="block text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>

        {/* Telemetry + Controls Row */}
        <div className="py-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08]">
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600 dark:text-zinc-400">
            <span>
              Domains Verified:{' '}
              <strong className="text-slate-900 dark:text-white tabular-nums">
                {domainsVerified.toLocaleString()}
              </strong>
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-zinc-700">&middot;</span>
            <span>
              Registrars Connected: <strong className="text-slate-900 dark:text-white">20+ Accredited</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] p-1">
              <button
                type="button"
                onClick={() => onToggleTheme(true)}
                aria-label="Dark mode"
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white dark:bg-white/[0.12] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onToggleTheme(false)}
                aria-label="Light mode"
                className={`p-1.5 rounded-lg transition-colors ${
                  !isDark
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
              </button>
            </div>

            <label className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-[#141418] border border-slate-200 dark:border-white/[0.08] px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-zinc-200">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={language}
                onChange={(e) => onChangeLanguage(e.target.value)}
                aria-label="Language"
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="en" className="bg-white dark:bg-[#141418]">English</option>
                <option value="hi" className="bg-white dark:bg-[#141418]">हिन्दी</option>
                <option value="es" className="bg-white dark:bg-[#141418]">Español</option>
                <option value="fr" className="bg-white dark:bg-[#141418]">Français</option>
              </select>
            </label>
          </div>
        </div>

        {/* Copyright & Disclaimer: Domain Hunter Basari 2026 */}
        <div className="pt-6 space-y-2 text-xs text-slate-500 dark:text-zinc-500 leading-relaxed">
          <p className="font-semibold text-slate-700 dark:text-zinc-300">
            &copy; 2026 Domain Hunter Basari 2026. All rights reserved.
          </p>
          <p>
            <strong>Disclaimer (Domain Hunter Basari 2026):</strong> Domain availability indicators, registrar pricing estimates, and WHOIS/RDAP summaries are retrieved live from public registry and DNS endpoints for informational purposes only. Final domain availability, renewal terms, and aftermarket prices are set solely by accredited registrars at the time of purchase. Domain Hunter Basari 2026 never logs, warehouses, or front-runs searched domain names.
          </p>
        </div>
      </div>
    </footer>
  );
};
