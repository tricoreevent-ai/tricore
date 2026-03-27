import { useEffect } from 'react';

const upsertMetaTag = (attributes, content) => {
  const selector = Object.entries(attributes)
    .map(([key, value]) => `meta[${key}="${value}"]`)
    .join('');
  let tag = document.head.querySelector(selector);
  const wasCreated = !tag;

  if (!tag) {
    tag = document.createElement('meta');
    Object.entries(attributes).forEach(([key, value]) => tag.setAttribute(key, value));
    document.head.appendChild(tag);
  }

  const previousContent = tag.getAttribute('content');
  tag.setAttribute('content', content);

  return () => {
    if (wasCreated) {
      tag.remove();
      return;
    }

    if (previousContent === null) {
      tag.removeAttribute('content');
      return;
    }

    tag.setAttribute('content', previousContent);
  };
};

const upsertLinkTag = ({ href, rel }) => {
  let tag = document.head.querySelector(`link[rel="${rel}"]`);
  const wasCreated = !tag;

  if (!tag) {
    tag = document.createElement('link');
    tag.setAttribute('rel', rel);
    document.head.appendChild(tag);
  }

  const previousHref = tag.getAttribute('href');
  tag.setAttribute('href', href);

  return () => {
    if (wasCreated) {
      tag.remove();
      return;
    }

    if (previousHref === null) {
      tag.removeAttribute('href');
      return;
    }

    tag.setAttribute('href', previousHref);
  };
};

export default function SeoMetadata({
  canonicalUrl = '',
  description = '',
  image = '',
  keywords = '',
  robots = 'index,follow,max-image-preview:large',
  structuredData = [],
  title = '',
  type = 'website',
  url = ''
}) {
  useEffect(() => {
    const cleanups = [];
    const previousTitle = document.title;

    if (title) {
      document.title = title;
    }

    if (description) {
      cleanups.push(upsertMetaTag({ name: 'description' }, description));
      cleanups.push(upsertMetaTag({ property: 'og:description' }, description));
      cleanups.push(upsertMetaTag({ name: 'twitter:description' }, description));
    }

    if (keywords) {
      const normalizedKeywords = Array.isArray(keywords) ? keywords.join(', ') : String(keywords);
      cleanups.push(upsertMetaTag({ name: 'keywords' }, normalizedKeywords));
    }

    if (robots) {
      cleanups.push(upsertMetaTag({ name: 'robots' }, robots));
    }

    if (title) {
      cleanups.push(upsertMetaTag({ property: 'og:title' }, title));
      cleanups.push(upsertMetaTag({ name: 'twitter:title' }, title));
    }

    cleanups.push(upsertMetaTag({ property: 'og:type' }, type));
    cleanups.push(upsertMetaTag({ property: 'og:site_name' }, 'TriCore Events'));
    cleanups.push(upsertMetaTag({ name: 'twitter:card' }, image ? 'summary_large_image' : 'summary'));

    if (url) {
      cleanups.push(upsertMetaTag({ property: 'og:url' }, url));
    }

    if (canonicalUrl) {
      cleanups.push(upsertLinkTag({ rel: 'canonical', href: canonicalUrl }));
    }

    if (image) {
      cleanups.push(upsertMetaTag({ property: 'og:image' }, image));
      cleanups.push(upsertMetaTag({ name: 'twitter:image' }, image));
    }

    const normalizedStructuredData = Array.isArray(structuredData)
      ? structuredData.filter(Boolean)
      : structuredData
        ? [structuredData]
        : [];
    const structuredTags = normalizedStructuredData.map((entry, index) => {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo-structured-data', `seo-jsonld-${index}`);
      script.textContent = JSON.stringify(entry);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      document.title = previousTitle;
      structuredTags.forEach((tag) => tag.remove());
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, [canonicalUrl, description, image, keywords, robots, structuredData, title, type, url]);

  return null;
}
