export interface GuideStep {
  title: string;
  detail: string;
}

export interface DomainHowToGuide {
  slug: string;
  path: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  category: string;
  readTime: string;
  exampleQuery: string;
  summary: string;
  steps: GuideStep[];
}

export const DOMAIN_HOWTO_GUIDES: readonly DomainHowToGuide[] = [
  {
    slug: 'how-to-choose-com-vs-ai-domain',
    path: '/guides/how-to-choose-com-vs-ai-domain',
    title: 'How to Choose Between .com, .ai, and .io for Startups',
    seoTitle: 'How to Choose .com vs .ai Domains – Domain Hunter Basari 2026',
    seoDescription:
      'Step-by-step Domain Hunter Basari 2026 guide to picking .com, .ai, or .io extensions based on brand trust, renewal cost, and direct traffic.',
    category: 'Extension Strategy',
    readTime: '4 min read',
    exampleQuery: 'velorapay',
    summary:
      'Evaluate brand credibility, long-term renewal pricing, and global type-in traffic before locking in your primary startup domain.',
    steps: [
      {
        title: 'Benchmark your core .com first',
        detail:
          'Even if you launch on .ai or .io, inspect the .com via Instant Search to confirm no active trademark competitor owns the exact name.'
      },
      {
        title: 'Compare 5-year renewal economics',
        detail:
          'Standard .com registrations renew near $10-$15/year, whereas registry rates for .ai typically carry higher two-year minimums.'
      },
      {
        title: 'Match extension to buyer expectations',
        detail:
          'Enterprise fintech and consumer brands convert higher on .com, while developer tooling and applied AI teams thrive on .ai or .dev.'
      },
      {
        title: 'Reserve core defensive variants',
        detail:
          'Bookmark or acquire your secondary extension inside your Domain Hunter cloud watchlist before public launch announcements.'
      }
    ]
  },
  {
    slug: 'how-to-create-domain-hacks',
    path: '/guides/how-to-create-domain-hacks',
    title: 'How to Craft Memorable Domain Hacks & Short URLs',
    seoTitle: 'How to Create Domain Hacks – Domain Hunter Basari 2026',
    seoDescription:
      'Learn the Domain Hunter Basari 2026 playbook for turning .ing, .io, and .ai country extensions into crisp single-word brand domains.',
    category: 'Creative Naming',
    readTime: '3 min read',
    exampleQuery: 'pingila',
    summary:
      'Turn country-code endings like .ing, .io, .ai, and .me into short, memorable single-word domain hacks.',
    steps: [
      {
        title: 'Split action verbs at the suffix',
        detail:
          'Look for natural suffix boundaries—verbs ending in "-ing" or nouns ending in "-io" or "-ai" split cleanly across the dot.'
      },
      {
        title: 'Test radio-spell clarity',
        detail:
          'Read the full URL out loud. Strong domain hacks require no awkward hyphenation or extra clarification over voice calls.'
      },
      {
        title: 'Verify live RDAP & DNS records',
        detail:
          'Country-code registries follow distinct RDAP rules; run a live check on Domain Hunter to confirm whether the hack is unregistered.'
      },
      {
        title: 'Pair with a fallback .com redirect',
        detail:
          'Consider holding a descriptive .com companion (e.g. getbrand.com) that forwards directly to your domain hack.'
      }
    ]
  },
  {
    slug: 'how-to-audit-aftermarket-domains',
    path: '/guides/how-to-audit-aftermarket-domains',
    title: 'How to Audit Aftermarket & Premium Domains via RDAP',
    seoTitle: 'How to Audit Aftermarket Domains – Domain Hunter Basari 2026',
    seoDescription:
      'Domain Hunter Basari 2026 guide on checking RDAP registration age, nameservers, and EPP transfer locks before buying an aftermarket domain.',
    category: 'Due Diligence',
    readTime: '5 min read',
    exampleQuery: 'ama',
    summary:
      'Inspect live RDAP nameservers, registration age, and EPP transfer locks before making an offer on a premium domain.',
    steps: [
      {
        title: 'Inspect WHOIS/RDAP nameservers',
        detail:
          'Parking nameservers from Afternic, Sedo, Dan.com, or HugeDomains signal an aftermarket listing rather than an active operating company.'
      },
      {
        title: 'Check registration & expiration dates',
        detail:
          'Review the RDAP registration and expiration events in the Domain Hunter WHOIS modal to confirm domain history and renewal runway.'
      },
      {
        title: 'Verify EPP status codes',
        detail:
          'Confirm there are no pendingDelete, redemptionPeriod, or dispute hold flags before wiring escrow funds.'
      },
      {
        title: 'Use accredited escrow & registrars',
        detail:
          'Complete transfer via established registrar marketplaces with verified auth-code handoffs and automated DNS cutover.'
      }
    ]
  },
  {
    slug: 'how-to-build-defensive-domain-portfolio',
    path: '/guides/how-to-build-defensive-domain-portfolio',
    title: 'How to Build a Defensive Brand Domain Portfolio',
    seoTitle: 'How to Protect Brand Domains – Domain Hunter Basari 2026',
    seoDescription:
      'Discover the Domain Hunter Basari 2026 checklist for securing core .com, .ai, .app, and country extensions to prevent brand impersonation.',
    category: 'Brand Security',
    readTime: '4 min read',
    exampleQuery: 'nexora',
    summary:
      'Lock down core global and regional TLDs in parallel using Extensions Explorer and cloud-synced Watchlists.',
    steps: [
      {
        title: 'Scan 20+ extensions simultaneously',
        detail:
          'Switch to the Extensions tab on Domain Hunter to audit .com, .ai, .io, .app, .dev, .co, and .in in one parallel pass.'
      },
      {
        title: 'Prioritize high-phishing risk TLDs',
        detail:
          'Secure exact-match .com, .co, and your primary market ccTLD first so customers cannot confuse lookalike sites.'
      },
      {
        title: 'Bookmark candidate sets to cloud Watchlist',
        detail:
          'Sign in with Google to store your target portfolio securely in your private cloud Watchlist across team reviews.'
      },
      {
        title: 'Monitor taken lookalikes with Notify Me',
        detail:
          'Attach availability alerts to any already-registered variant so you are notified if the holder lets it drop.'
      }
    ]
  },
  {
    slug: 'how-to-snipe-expiring-domains',
    path: '/guides/how-to-snipe-expiring-domains',
    title: 'How to Track & Catch Expiring Domains Responsibly',
    seoTitle: 'How to Catch Expiring Domains – Domain Hunter Basari 2026',
    seoDescription:
      'Follow the Domain Hunter Basari 2026 workflow to track RDAP expiration dates, set Notify Me alerts, and catch high-value drops.',
    category: 'Drop Catching',
    readTime: '4 min read',
    exampleQuery: 'ama',
    summary:
      'Track RDAP expiration windows and set instant email or browser alerts when a taken domain enters drop availability.',
    steps: [
      {
        title: 'Identify the RDAP expiration window',
        detail:
          'Open the WHOIS modal on any taken result to inspect its exact registry expiration timestamp and current registrar.'
      },
      {
        title: 'Understand grace & redemption periods',
        detail:
          'Most gTLDs stay renewable by the owner during a 30-to-45 day grace period followed by a 30-day redemption window before pendingDelete.'
      },
      {
        title: 'Click the Notify Me bell icon',
        detail:
          'Set an Email Alert (when logged in) or Local Browser Notification directly on the taken domain row inside Domain Hunter.'
      },
      {
        title: 'Prepare instant registrar checkout',
        detail:
          'Keep your preferred accredited registrar ready via the split-button dropdown so you can register immediately on release.'
      }
    ]
  },
  {
    slug: 'how-to-generate-brandable-ai-names',
    path: '/guides/how-to-generate-brandable-ai-names',
    title: 'How to Generate Brandable Startup Domains with Gemini AI',
    seoTitle: 'How to Generate AI Brand Domains – Domain Hunter Basari 2026',
    seoDescription:
      'Use the Domain Hunter Basari 2026 AI Name Studio playbook to turn product ideas into available .com and .ai startup domains.',
    category: 'AI Naming',
    readTime: '3 min read',
    exampleQuery: 'velorapay',
    summary:
      'Combine structured AI brand synthesis with real-time RDAP checks to skip taken clichés and find clean domains fast.',
    steps: [
      {
        title: 'Write a focused 4-8 word niche brief',
        detail:
          'Describe your customer and core outcome clearly inside AI Studio (e.g. "automated invoice factoring for freelancers").'
      },
      {
        title: 'Synthesize pronounceable 5-12 char roots',
        detail:
          'Domain Hunter generates 6 clean brandable root words without hyphens or filler numbers, tailored for modern startups.'
      },
      {
        title: 'Verify live .com and .ai pairs instantly',
        detail:
          'Every AI-generated name runs directly through live RDAP & DNS verification rather than guessing availability.'
      },
      {
        title: 'Analyze availability patterns in Registry Radar',
        detail:
          'Open /radar to compare availability ratios across your AI naming sessions using interactive D3.js telemetry charts.'
      }
    ]
  }
];
