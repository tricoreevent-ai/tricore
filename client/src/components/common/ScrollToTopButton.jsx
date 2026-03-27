import { useEffect, useState } from 'react';

import AppIcon from './AppIcon.jsx';

const VISIBILITY_OFFSET = 280;

const getScrollTop = () =>
  Math.max(
    window.pageYOffset || 0,
    document.documentElement?.scrollTop || 0,
    document.body?.scrollTop || 0
  );

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function ScrollToTopButton({ focusTargetId = 'app-top-anchor' }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => {
      setIsVisible(getScrollTop() > VISIBILITY_OFFSET);
    };

    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });

    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);

  const handleClick = () => {
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    });

    window.setTimeout(() => {
      const target = document.getElementById(focusTargetId);
      target?.focus({ preventScroll: true });
    }, prefersReducedMotion() ? 0 : 250);
  };

  return (
    <button
      aria-label="Scroll to top"
      className={`fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-blue text-white shadow-soft transition duration-300 hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-brand-blue/40 focus:ring-offset-2 sm:bottom-8 sm:right-8 ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0'
      }`.trim()}
      onClick={handleClick}
      type="button"
    >
      <AppIcon className="h-5 w-5" name="chevronUp" />
    </button>
  );
}
