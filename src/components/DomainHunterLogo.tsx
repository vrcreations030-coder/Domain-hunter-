import React from 'react';

interface DomainHunterLogoProps {
  size?: 'sm' | 'md';
}

export const DomainHunterLogo: React.FC<DomainHunterLogoProps> = ({ size = 'md' }) => {
  const iconDim = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <span
        className={`${iconDim} rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-amber-500/15 border border-emerald-500/35 flex items-center justify-center shadow-[0_0_20px_-6px_rgba(16,185,129,0.5)] shrink-0`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none">
          <circle cx="16" cy="16" r="9.5" stroke="#10b981" strokeWidth="2.2" />
          <path
            d="M16 3v5M16 24v5M3 16h5M24 16h5"
            stroke="#10b981"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <circle cx="16" cy="16" r="2.8" fill="#f59e0b" />
        </svg>
      </span>
      <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        Domain Hunter
      </span>
    </span>
  );
};
