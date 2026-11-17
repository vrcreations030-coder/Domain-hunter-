import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';
import { DOMAIN_HOWTO_GUIDES } from '../data/guides';
import { submitContactForm } from '../utils/rdap';

interface InfoPageProps {
  route: string;
  onNavigate: (path: string) => void;
  onTrySearch: (query: string) => void;
}

const FAQS = [
  {
    q: 'How does Domain Hunter verify domain availability?',
    a: 'Every query runs through our server-side RDAP (Registration Data Access Protocol) and authoritative DNS resolver pipeline. Unregistered names return immediate availability with registrar pricing estimates, while registered domains include live WHOIS/RDAP metadata.'
  },
  {
    q: 'Are searched domain names kept private?',
    a: 'Yes. Domain Hunter Basari 2026 never logs searches for front-running or domain warehousing. If you sign in with Google, your saved watchlist is isolated strictly to your authenticated UID via Firestore Security Rules.'
  },
  {
    q: 'What do the Green, Blue, Amber, and Red indicators mean?',
    a: 'Green (Continue) means the domain is available at standard registrar rates. Blue (Make offer / Price) marks aftermarket domains listed for sale. Amber marks special extensions or domain hacks. Red (Lookup) shows an active registration with full RDAP inspection.'
  },
  {
    q: 'How does the AI Name Studio work?',
    a: 'Our backend connects to Gemini AI to synthesize pronounceable, brandable startup names tailored to your prompt, then checks live .com and .ai availability immediately.'
  },
  {
    q: 'Can I scan a list of domains at once?',
    a: 'Yes. Open Bulk Scanner from the top menu or mode selector and paste up to 50 domains (one per line) to run parallel RDAP and DNS checks.'
  }
];

export const InfoPages: React.FC<InfoPageProps> = ({ route, onNavigate, onTrySearch }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [contactState, setContactState] = useState({ name: '', email: '', subject: 'General Inquiry', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);
    setSubmitting(true);
    try {
      const res = await submitContactForm(contactState);
      setTicketId(res.ticketId);
      setContactState({ name: '', email: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      setContactError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  const BackLink = () => (
    <button
      type="button"
      onClick={() => onNavigate('/')}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back to Domain Search</span>
    </button>
  );

  if (route === '/faq') {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="font-serif-domain text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Everything you need to know about Domain Hunter live RDAP lookups, security, and cloud watchlists.
        </p>
        <div className="space-y-3">
          {FAQS.map((item, idx) => {
            const open = openFaq === idx;
            return (
              <div key={item.q} className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : idx)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left"
                >
                  <span className="font-serif-domain text-base font-semibold text-slate-900 dark:text-white">
                    {item.q}
                  </span>
                  {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.06] pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  const activeGuide = DOMAIN_HOWTO_GUIDES.find((g) => g.path === route);

  if (activeGuide) {
    const relatedGuides = DOMAIN_HOWTO_GUIDES.filter((g) => g.slug !== activeGuide.slug).slice(0, 3);
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <button
          type="button"
          onClick={() => onNavigate('/guides')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Domain Guides</span>
        </button>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tech text-emerald-600 dark:text-emerald-400 mb-3">
          <span>{activeGuide.category.toUpperCase()}</span>
          <span>&middot;</span>
          <span>{activeGuide.readTime}</span>
          <span>&middot;</span>
          <span>Domain Hunter Basari 2026</span>
        </div>

        <h1 className="font-serif-domain text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight mb-3">
          {activeGuide.title}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed mb-8">
          {activeGuide.summary}
        </p>

        <div className="space-y-4 mb-8">
          {activeGuide.steps.map((step, idx) => (
            <div
              key={step.title}
              className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5 flex items-start gap-4"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono-tech text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                0{idx + 1}
              </span>
              <div>
                <h2 className="font-serif-domain text-lg font-semibold text-slate-900 dark:text-white mb-1">
                  {step.title}
                </h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Put this strategy into practice now
            </p>
            <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
              Run a live RDAP &amp; DNS check on &ldquo;{activeGuide.exampleQuery}&rdquo; across 20+ extensions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTrySearch(activeGuide.exampleQuery)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs sm:text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors"
          >
            <span>Scan &ldquo;{activeGuide.exampleQuery}&rdquo;</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
            More Guides from Domain Hunter Basari 2026
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {relatedGuides.map((rel) => (
              <a
                key={rel.slug}
                href={rel.path}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(rel.path);
                }}
                className="rounded-xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/40 p-4 transition-colors block"
              >
                <span className="text-[11px] font-mono-tech text-emerald-600 dark:text-emerald-400 block mb-1">
                  {rel.category}
                </span>
                <span className="font-serif-domain text-sm font-semibold text-slate-900 dark:text-white leading-snug block">
                  {rel.title}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (route === '/guides') {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="font-serif-domain text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Domain Strategy &amp; How-To Guides
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Practical playbooks from Domain Hunter Basari 2026 for choosing extensions, auditing aftermarket domains, and catching drops.
        </p>
        <div className="grid grid-cols-1 gap-4">
          {DOMAIN_HOWTO_GUIDES.map((g) => (
            <article key={g.slug} className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-5">
              <div className="flex items-center gap-2 text-[11px] font-mono-tech text-emerald-600 dark:text-emerald-400 mb-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>{g.category}</span>
                <span>&middot;</span>
                <span>{g.readTime}</span>
              </div>
              <a
                href={g.path}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(g.path);
                }}
                className="block group"
              >
                <h2 className="font-serif-domain text-xl font-semibold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors mb-2">
                  {g.title}
                </h2>
              </a>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mb-4">
                {g.summary}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href={g.path}
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate(g.path);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <span>Read How-To Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => onTrySearch(g.exampleQuery)}
                  className="text-xs font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Scan &ldquo;{g.exampleQuery}&rdquo; now
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (route === '/contact') {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <h1 className="font-serif-domain text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Contact Domain Hunter
        </h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
          Reach out to the Domain Hunter Basari 2026 team for support, registrar partnerships, or security inquiries.
        </p>

        {ticketId ? (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-6">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Support Ticket Created ({ticketId})</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-zinc-300 mb-4">
              Thank you for contacting Domain Hunter Basari 2026. We will respond to your email shortly.
            </p>
            <button
              type="button"
              onClick={() => setTicketId(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black text-xs font-semibold"
            >
              Send Another Message
            </button>
          </div>
        ) : (
          <form onSubmit={handleContactSubmit} className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-6 space-y-4">
            {contactError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-xs text-red-500">
                {contactError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cName" className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Name</label>
                <input
                  id="cName"
                  type="text"
                  required
                  value={contactState.name}
                  onChange={(e) => setContactState({ ...contactState, name: e.target.value })}
                  placeholder="Alex Rivera"
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="cEmail" className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Email</label>
                <input
                  id="cEmail"
                  type="email"
                  required
                  value={contactState.email}
                  onChange={(e) => setContactState({ ...contactState, email: e.target.value })}
                  placeholder="alex@company.com"
                  className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cSubject" className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Topic</label>
              <select
                id="cSubject"
                value={contactState.subject}
                onChange={(e) => setContactState({ ...contactState, subject: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] px-3.5 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="General Inquiry">General Inquiry</option>
                <option value="Registrar Integration">Registrar Integration</option>
                <option value="Aftermarket Brokerage">Aftermarket Brokerage</option>
                <option value="Security & Abuse">Security &amp; Abuse</option>
              </select>
            </div>
            <div>
              <label htmlFor="cMsg" className="block text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">Message</label>
              <textarea
                id="cMsg"
                rows={4}
                required
                value={contactState.message}
                onChange={(e) => setContactState({ ...contactState, message: e.target.value })}
                placeholder="How can we help?"
                className="w-full rounded-xl bg-slate-50 dark:bg-black border border-slate-200 dark:border-white/[0.1] p-3.5 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-sm font-semibold text-white transition-colors"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </section>
    );
  }

  if (route === '/security' || route === '/privacy' || route === '/terms') {
    const title =
      route === '/security'
        ? 'Security Architecture'
        : route === '/privacy'
        ? 'Privacy Policy'
        : 'Terms of Service';

    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <BackLink />
        <div className="flex items-center gap-2.5 mb-2">
          {route === '/security' && <ShieldCheck className="w-6 h-6 text-emerald-500" />}
          <h1 className="font-serif-domain text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        <p className="text-xs font-mono-tech text-slate-500 mb-8">Domain Hunter Basari 2026 · Updated November 2026</p>

        <div className="rounded-2xl bg-white dark:bg-[#111114] border border-slate-200 dark:border-white/[0.08] p-6 space-y-5 text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
          {route === '/security' && (
            <>
              <p>
                <strong>1. Encrypted Registry Verification:</strong> Domain Hunter executes all RDAP and DNS probes server-side over TLS, shielding your browser from third-party registry tracking and CORS leaks.
              </p>
              <p>
                <strong>2. Zero-Trust Account &amp; Watchlist Isolation:</strong> User accounts authenticate via verified Google OAuth, and Firestore Security Rules strictly enforce owner-only access, schema validation, and server-side timestamps.
              </p>
              <p>
                <strong>3. Rate Limiting &amp; API Hardening:</strong> Every API endpoint enforces sliding-window IP rate limits, strict input regex validation, and hardened HTTP security headers.
              </p>
            </>
          )}
          {route === '/privacy' && (
            <>
              <p>
                Domain Hunter Basari 2026 respects your naming privacy. Search queries are never logged for domain front-running or broker resale.
              </p>
              <p>
                When signed in with Google, your display name, verified email, saved domain watchlist, and recent search history are stored securely in your private Firestore user document and can be removed at any time. Guest bookmarks remain strictly inside your browser&apos;s local storage.
              </p>
              <p>
                When following external links to accredited registrars, each registrar&apos;s independent privacy policy governs checkout.
              </p>
            </>
          )}
          {route === '/terms' && (
            <>
              <p>
                Domain Hunter provides real-time availability indicators based on live RDAP and DNS responses for informational purposes. Domain registration contracts, pricing, and transfer eligibility are governed exclusively by the chosen registrar at checkout.
              </p>
              <p>
                Automated scraping, abusive API flooding, or bypassing rate limits on Domain Hunter Basari 2026 services is prohibited.
              </p>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <p className="font-mono-tech text-xs text-emerald-500 mb-2">404</p>
      <h1 className="font-serif-domain text-3xl font-bold text-slate-900 dark:text-white mb-3">
        Page not found
      </h1>
      <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
        The requested route does not exist on Domain Hunter.
      </p>
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-medium text-white"
        >
          Back to Search
        </button>
        <button
          type="button"
          onClick={() => onNavigate('/radar')}
          className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#16161a] border border-slate-200 dark:border-white/[0.1] text-sm font-medium"
        >
          Registry Radar
        </button>
      </div>
    </section>
  );
};
