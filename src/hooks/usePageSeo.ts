import { useEffect } from 'react';
import type { GuideStep } from '../data/guides';

export interface RouteSeoMeta {
  title: string;
  description: string;
  path: string;
  howToSteps?: readonly GuideStep[];
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageSeo({ title, description, path, howToSteps }: RouteSeoMeta) {
  useEffect(() => {
    document.title = title;
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${path}`;

    upsertMeta('name', 'description', description);
    upsertMeta('property', 'og:title', title);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', canonicalUrl);
    upsertMeta('name', 'twitter:title', title);
    upsertMeta('name', 'twitter:description', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    const existingJsonLd = document.getElementById('dh-howto-jsonld');
    if (howToSteps && howToSteps.length > 0) {
      const schemaEl = existingJsonLd || document.createElement('script');
      schemaEl.id = 'dh-howto-jsonld';
      schemaEl.setAttribute('type', 'application/ld+json');
      schemaEl.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: title,
        description,
        url: canonicalUrl,
        publisher: {
          '@type': 'Organization',
          name: 'Domain Hunter Basari 2026'
        },
        step: howToSteps.map((s, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: s.title,
          text: s.detail
        }))
      });
      if (!existingJsonLd) {
        document.head.appendChild(schemaEl);
      }
    } else if (existingJsonLd) {
      existingJsonLd.remove();
    }
  }, [title, description, path, howToSteps]);
}
