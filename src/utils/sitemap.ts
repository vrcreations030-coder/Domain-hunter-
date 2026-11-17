import { DOMAIN_HOWTO_GUIDES } from '../data/guides.ts';

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface SitemapRouteEntry {
  path: string;
  priority: string;
  changefreq: ChangeFreq;
  lastmod?: string;
}

const CORE_PUBLIC_ROUTES: readonly SitemapRouteEntry[] = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/extensions', priority: '0.9', changefreq: 'weekly' },
  { path: '/generator', priority: '0.9', changefreq: 'weekly' },
  { path: '/premium', priority: '0.8', changefreq: 'daily' },
  { path: '/research', priority: '0.8', changefreq: 'weekly' },
  { path: '/tools', priority: '0.9', changefreq: 'weekly' },
  { path: '/expired', priority: '0.85', changefreq: 'daily' },
  { path: '/appraisal', priority: '0.8', changefreq: 'weekly' },
  { path: '/trademark', priority: '0.8', changefreq: 'weekly' },
  { path: '/reverse-dictionary', priority: '0.8', changefreq: 'weekly' },
  { path: '/radar', priority: '0.8', changefreq: 'weekly' },
  { path: '/guides', priority: '0.85', changefreq: 'weekly' },
  { path: '/faq', priority: '0.8', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/security', priority: '0.5', changefreq: 'monthly' },
  { path: '/terms', priority: '0.4', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.4', changefreq: 'yearly' }
];

const GUIDE_SITEMAP_ROUTES: readonly SitemapRouteEntry[] = DOMAIN_HOWTO_GUIDES.map((g) => ({
  path: g.path,
  priority: '0.75',
  changefreq: 'monthly' as ChangeFreq
}));

export const PUBLIC_SITEMAP_ROUTES: readonly SitemapRouteEntry[] = [
  ...CORE_PUBLIC_ROUTES,
  ...GUIDE_SITEMAP_ROUTES
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeBaseUrl(rawUrl?: string): string {
  const candidate = (rawUrl || '').trim().replace(/\/+$/, '');
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) {
    return candidate;
  }
  return 'https://domainhunter.app';
}

function normalizeRoutePath(routePath: string): string {
  const trimmed = routePath.trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : `/${trimmed.replace(/\/+$/, '')}`;
}

export interface GenerateSitemapOptions {
  baseUrl?: string;
  lastmod?: string;
  routes?: readonly SitemapRouteEntry[];
}

/**
 * Dynamically generates a standards-compliant XML sitemap listing all
 * public-facing routes for search engine crawlers.
 */
export function generateSitemapXml(options: GenerateSitemapOptions = {}): string {
  const baseUrl = normalizeBaseUrl(options.baseUrl);
  const defaultLastmod = (options.lastmod || new Date().toISOString().split('T')[0]).trim();
  const routes = options.routes ?? PUBLIC_SITEMAP_ROUTES;

  const seen = new Set<string>();
  const urlNodes: string[] = [];

  for (const entry of routes) {
    const cleanPath = normalizeRoutePath(entry.path);
    if (seen.has(cleanPath)) continue;
    seen.add(cleanPath);

    const loc = cleanPath === '/' ? `${baseUrl}/` : `${baseUrl}${cleanPath}`;
    const lastmod = (entry.lastmod || defaultLastmod).trim();

    urlNodes.push(
      [
        '  <url>',
        `    <loc>${escapeXml(loc)}</loc>`,
        `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
        `    <changefreq>${escapeXml(entry.changefreq)}</changefreq>`,
        `    <priority>${escapeXml(entry.priority)}</priority>`,
        '  </url>'
      ].join('\n')
    );
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urlNodes,
    '</urlset>',
    ''
  ].join('\n');
}

export function generateRobotsTxt(baseUrl?: string): string {
  const cleanBase = normalizeBaseUrl(baseUrl);
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    '',
    `Sitemap: ${cleanBase}/sitemap.xml`,
    ''
  ].join('\n');
}
