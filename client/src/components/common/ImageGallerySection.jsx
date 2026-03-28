import { useEffect, useMemo, useState } from 'react';

const DEFAULT_PAGE_SIZE = 8;

export default function ImageGallerySection({ description, images, pageSize = DEFAULT_PAGE_SIZE, title }) {
  const visibleImages = useMemo(
    () => (Array.isArray(images) ? images.filter((image) => image.imageUrl) : []),
    [images]
  );
  const [visibleCount, setVisibleCount] = useState(pageSize);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize, title, visibleImages.length]);

  if (!visibleImages.length) {
    return null;
  }

  const pagedImages = visibleImages.slice(0, visibleCount);
  const hasMore = visibleCount < visibleImages.length;

  return (
    <section className="container-shell mt-24">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Gallery</p>
          <h2 className="mt-3 text-3xl font-bold text-slate-950">{title}</h2>
          {description ? (
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{description}</p>
          ) : null}
        </div>
        <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
          {visibleImages.length} image{visibleImages.length === 1 ? '' : 's'}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:auto-rows-[260px] sm:grid-cols-2 xl:auto-rows-[240px] xl:grid-cols-4">
        {pagedImages.map((image, index) => (
          <div
            className={`panel group overflow-hidden ${
              index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2' : ''
            }`}
            key={image.id || `${image.imageUrl}-${index}`}
          >
            <div className="relative aspect-[4/3] h-full sm:aspect-auto">
              <img
                alt={image.imageAlt || `TriCore gallery image ${index + 1}`}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                decoding="async"
                loading="lazy"
                src={image.imageUrl}
              />
              {image.caption ? (
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(15,23,42,0.88))] px-5 pb-5 pt-14 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-100">
                    TriCore Moments
                  </p>
                  <p className="mt-2 text-base font-bold sm:text-lg">{image.caption}</p>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {hasMore ? (
        <div className="mt-8 flex justify-center">
          <button
            className="btn-secondary"
            onClick={() => setVisibleCount((current) => current + pageSize)}
            type="button"
          >
            Load More Images
          </button>
        </div>
      ) : null}
    </section>
  );
}
