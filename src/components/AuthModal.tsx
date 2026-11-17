import React, { useState } from 'react';
import { Lock, ShieldCheck, X } from 'lucide-react';
import { DomainHunterLogo } from './DomainHunterLogo';
import { signInWithGoogle } from '../firebase';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (email: string | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithGoogle();
      onSuccess(cred.user.email);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in with Google.';
      if (msg.includes('popup-closed-by-user')) {
        setError('Sign-in popup was closed before completing.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.12] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
          <DomainHunterLogo size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close login dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Sign in to Domain Hunter
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">
              Sync your saved domain watchlist and recent searches securely across all your devices.
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-500">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-slate-900 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{loading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          <div className="rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/[0.08] p-4 space-y-2 text-xs text-slate-600 dark:text-zinc-400">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Zero-Trust Account Security</span>
            </div>
            <p className="flex items-start gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>
                Your saved watchlist and search history are strictly isolated to your verified account ID using server-enforced Firestore rules.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
