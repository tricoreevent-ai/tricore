import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const AUTO_ADVANCE_MS = 6000;

const defaultTheme = {
  primaryColor: '#0F5FDB',
  secondaryColor: '#0A2C66',
  highlightColor: '#0EA5E9'
};

const hexToRgba = (hex, alpha) => {
  const value = String(hex || '').replace('#', '');

  if (value.length !== 6) {
    return `rgba(15, 95, 219, ${alpha})`;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const isExternalHref = (href) => /^https?:\/\//i.test(String(href || '').trim());
const isActionProtocolHref = (href) =>
  /^(?:https?:\/\/|mailto:|tel:|\/\/)/i.test(String(href || '').trim());
const looksLikeDomainWithoutProtocol = (href) =>
  /^(?:www\.)[^\s/]+\.[^\s]+/i.test(String(href || '').trim());
const normalizeInternalPathname = (pathname) => {
  const normalizedPathname = `/${String(pathname || '').replace(/^\.?\/*/, '')}`.replace(/\/{2,}/g, '/');
  return normalizedPathname.replace(/^\/event(?=\/|$)/i, '/events');
};

const normalizeActionHref = (href) => {
  const value = String(href || '').trim();

  if (!value) {
    return '';
  }

  if (looksLikeDomainWithoutProtocol(value)) {
    return `https://${value}`;
  }

  if (typeof window !== 'undefined') {
    try {
      const resolvedUrl = new URL(value, window.location.origin);

      if (resolvedUrl.origin === window.location.origin) {
        return `${normalizeInternalPathname(resolvedUrl.pathname)}${resolvedUrl.search}${resolvedUrl.hash}`;
      }

      if (isActionProtocolHref(value)) {
        return resolvedUrl.toString();
      }
    } catch {
      // Fall back to local path normalization below.
    }
  }

  if (isActionProtocolHref(value) || value.startsWith('#')) {
    return value;
  }

  if (value.startsWith('/')) {
    return normalizeInternalPathname(value);
  }

  return normalizeInternalPathname(value);
};

const ActionLink = ({ className, href, label }) => {
  const normalizedHref = normalizeActionHref(href);

  if (!normalizedHref || !label) {
    return null;
  }

  if (isExternalHref(normalizedHref) || /^(?:mailto:|tel:|\/\/)/i.test(normalizedHref)) {
    return (
      <a
        className={className}
        href={normalizedHref}
        rel={/^https?:\/\//i.test(normalizedHref) ? 'noreferrer' : undefined}
        target={/^https?:\/\//i.test(normalizedHref) ? '_blank' : undefined}
      >
        {label}
      </a>
    );
  }

  return (
    <Link className={className} to={normalizedHref}>
      {label}
    </Link>
  );
};

export default function HomeBannerCarousel({ banners, expertiseItems, theme }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentBanner = banners[currentIndex] || banners[0] || null;
  const hasMultipleBanners = banners.length > 1;
  const activeTheme = theme || defaultTheme;
  const heroGradient = {
    backgroundImage: `linear-gradient(135deg, ${activeTheme.secondaryColor}, ${activeTheme.primaryColor}, ${activeTheme.highlightColor})`
  };

  useEffect(() => {
    setCurrentIndex(0);
  }, [banners]);

  useEffect(() => {
    if (!hasMultipleBanners) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((current) => (current + 1) % banners.length);
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [banners.length, hasMultipleBanners]);

  useEffect(() => {
    if (!banners.length) {
      return;
    }

    const nextBanner = banners[(currentIndex + 1) % banners.length];

    if (!nextBanner?.imageUrl) {
      return;
    }

    const preloadImage = new Image();
    preloadImage.src = nextBanner.imageUrl;
  }, [banners, currentIndex]);

  if (!currentBanner) {
    return null;
  }

  return (
    <section className="relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0" style={heroGradient} />
      {currentBanner?.imageUrl ? (
        <img
          alt={currentBanner.imageAlt || currentBanner.title || 'TriCore banner'}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
          decoding="async"
          fetchPriority="high"
          loading="eager"
          sizes="100vw"
          src={currentBanner.imageUrl}
        />
      ) : null}
      <div className="pointer-events-none absolute inset-0 bg-slate-950/20" />
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ backgroundColor: hexToRgba(activeTheme.highlightColor, 0.26) }}
      />
      <div
        className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full blur-3xl"
        style={{ backgroundColor: hexToRgba(activeTheme.primaryColor, 0.24) }}
      />

      <div className="container-shell relative z-10 grid gap-10 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            {currentBanner.badge ? (
              <span className="badge bg-white/15 text-white">{currentBanner.badge}</span>
            ) : null}
            {hasMultipleBanners ? (
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-50">
                Slide {currentIndex + 1} / {banners.length}
              </span>
            ) : null}
          </div>

          <h1 className="mt-6 max-w-3xl text-5xl font-bold text-white sm:text-6xl">
            {currentBanner.title}
          </h1>
          {currentBanner.description ? (
            <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-50">{currentBanner.description}</p>
          ) : null}

          <div className="relative z-10 mt-8 flex flex-wrap gap-4">
            <ActionLink
              className="btn-primary"
              href={currentBanner.primaryActionHref}
              label={currentBanner.primaryActionLabel}
            />
            <ActionLink
              className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20"
              href={currentBanner.secondaryActionHref}
              label={currentBanner.secondaryActionLabel}
            />
          </div>

          {hasMultipleBanners ? (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <button
                aria-label="Show previous banner"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-bold text-white transition hover:bg-white/20"
                onClick={() => setCurrentIndex((current) => (current - 1 + banners.length) % banners.length)}
                type="button"
              >
                ‹
              </button>
              <button
                aria-label="Show next banner"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-lg font-bold text-white transition hover:bg-white/20"
                onClick={() => setCurrentIndex((current) => (current + 1) % banners.length)}
                type="button"
              >
                ›
              </button>
              <div className="flex items-center gap-2">
                {banners.map((banner, index) => (
                  <button
                    aria-label={`Show banner ${index + 1}: ${banner.title}`}
                    className={`h-3 rounded-full transition ${
                      index === currentIndex ? 'w-10 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'
                    }`}
                    key={banner.id}
                    onClick={() => setCurrentIndex(index)}
                    type="button"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="panel overflow-hidden bg-white/95 text-slate-900">
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2">
            {expertiseItems.map((benefit) => (
              <div className="bg-white p-6" key={benefit.title}>
                <h2 className="text-xl font-bold">{benefit.title}</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">{benefit.description}</p>
              </div>
            ))}
            <div className="bg-brand-orange p-6 text-white sm:col-span-2">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-100">Our core belief</p>
              <p className="mt-3 text-2xl font-bold text-white">
                We believe sport builds character, camaraderie, and healthy communities. Every
                TriCore event is designed to inspire participation and connection.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
