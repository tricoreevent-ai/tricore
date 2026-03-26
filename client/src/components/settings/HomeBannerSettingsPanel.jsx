import { useEffect, useMemo, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';

const createBannerId = () =>
  globalThis.crypto?.randomUUID?.() || `banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createEmptyBanner = () => ({
  id: createBannerId(),
  badge: '',
  title: '',
  description: '',
  imageUrl: '',
  imageAlt: '',
  primaryActionLabel: '',
  primaryActionHref: '',
  secondaryActionLabel: '',
  secondaryActionHref: '',
  isActive: true
});

const sanitizeBanner = (banner) => ({
  id: String(banner.id || '').trim() || createBannerId(),
  badge: String(banner.badge || '').trim(),
  title: String(banner.title || '').trim(),
  description: String(banner.description || '').trim(),
  imageUrl: String(banner.imageUrl || '').trim(),
  imageAlt: String(banner.imageAlt || '').trim(),
  primaryActionLabel: String(banner.primaryActionLabel || '').trim(),
  primaryActionHref: String(banner.primaryActionHref || '').trim(),
  secondaryActionLabel: String(banner.secondaryActionLabel || '').trim(),
  secondaryActionHref: String(banner.secondaryActionHref || '').trim(),
  isActive: Boolean(banner.isActive)
});

export default function HomeBannerSettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [banners, setBanners] = useState([]);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    setBanners(Array.isArray(config?.banners) ? config.banners.map(sanitizeBanner) : []);
    setLocalError('');
  }, [config]);

  const summary = useMemo(
    () => ({
      total: banners.length,
      active: banners.filter((banner) => banner.isActive).length,
      withImages: banners.filter((banner) => banner.imageUrl).length
    }),
    [banners]
  );

  const handleAddBanner = () => {
    setBanners((current) => [...current, createEmptyBanner()]);
    setLocalError('');
  };

  const handleBannerFieldChange = (bannerId, field, value) => {
    setBanners((current) =>
      current.map((banner) =>
        banner.id === bannerId ? { ...banner, [field]: field === 'isActive' ? Boolean(value) : value } : banner
      )
    );
    setLocalError('');
  };

  const handleBannerImageUpload = (bannerId, file) => {
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      handleBannerFieldChange(bannerId, 'imageUrl', String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveBanner = (bannerId) => {
    setBanners((current) => current.filter((banner) => banner.id !== bannerId));
    setLocalError('');
  };

  const handleMoveBanner = (bannerId, direction) => {
    setBanners((current) => {
      const index = current.findIndex((banner) => banner.id === bannerId);

      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [banner] = next.splice(index, 1);
      next.splice(targetIndex, 0, banner);
      return next;
    });
    setLocalError('');
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (banners.length > 10) {
      setLocalError('A maximum of 10 banners is allowed.');
      return;
    }

    const sanitized = banners.map(sanitizeBanner);
    const missingTitle = sanitized.find((banner) => !banner.title);

    if (missingTitle) {
      setLocalError('Every banner needs a title before it can be saved.');
      return;
    }

    const hasPrimaryMismatch = sanitized.find(
      (banner) => Boolean(banner.primaryActionLabel) !== Boolean(banner.primaryActionHref)
    );

    if (hasPrimaryMismatch) {
      setLocalError('Each primary button needs both a label and a link.');
      return;
    }

    const hasSecondaryMismatch = sanitized.find(
      (banner) => Boolean(banner.secondaryActionLabel) !== Boolean(banner.secondaryActionHref)
    );

    if (hasSecondaryMismatch) {
      setLocalError('Each secondary button needs both a label and a link.');
      return;
    }

    await onSave(sanitized);
  };

  return (
    <>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Total Banners</p>
          <p className="mt-3 text-3xl font-bold">{summary.total}</p>
          <p className="mt-2 text-sm text-slate-500">Add multiple homepage slides and control their order.</p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Visible Now</p>
          <p className="mt-3 text-3xl font-bold">{summary.active}</p>
          <p className="mt-2 text-sm text-slate-500">Only active banners are shown to visitors on the homepage.</p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">With Images</p>
          <p className="mt-3 text-3xl font-bold">{summary.withImages}</p>
          <p className="mt-2 text-sm text-slate-500">Upload banner artwork directly to this server or paste an image URL.</p>
        </div>
      </div>

      <form className="panel space-y-6 p-6" onSubmit={handleSave}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Homepage Banners</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add, edit, remove, and reorder homepage hero banners much like a lightweight WordPress slider manager.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={onRefresh} type="button">
              Refresh
            </button>
            <button className="btn-secondary" onClick={handleAddBanner} type="button">
              Add Banner
            </button>
          </div>
        </div>

        <FormAlert message={error || localError} />
        <FormAlert message={message} type="success" />

        {banners.length ? (
          <div className="space-y-6">
            {banners.map((banner, index) => (
              <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5" key={banner.id}>
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                      Banner {index + 1}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-slate-950">
                      {banner.title || 'Untitled banner'}
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-slate-700">
                      <input
                        checked={banner.isActive}
                        onChange={(event) =>
                          handleBannerFieldChange(banner.id, 'isActive', event.target.checked)
                        }
                        type="checkbox"
                      />
                      Active
                    </label>
                    <button
                      className="btn-secondary px-4 py-2"
                      disabled={index === 0}
                      onClick={() => handleMoveBanner(banner.id, 'up')}
                      type="button"
                    >
                      Move Up
                    </button>
                    <button
                      className="btn-secondary px-4 py-2"
                      disabled={index === banners.length - 1}
                      onClick={() => handleMoveBanner(banner.id, 'down')}
                      type="button"
                    >
                      Move Down
                    </button>
                    <button
                      className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                      onClick={() => handleRemoveBanner(banner.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="label" htmlFor={`banner-badge-${banner.id}`}>
                      Badge / Eyebrow
                    </label>
                    <input
                      className="input"
                      id={`banner-badge-${banner.id}`}
                      onChange={(event) => handleBannerFieldChange(banner.id, 'badge', event.target.value)}
                      placeholder="Summer Championship 2026"
                      value={banner.badge}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor={`banner-image-alt-${banner.id}`}>
                      Image Alt Text
                    </label>
                    <input
                      className="input"
                      id={`banner-image-alt-${banner.id}`}
                      onChange={(event) => handleBannerFieldChange(banner.id, 'imageAlt', event.target.value)}
                      placeholder="Describe the banner image"
                      value={banner.imageAlt}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor={`banner-title-${banner.id}`}>
                      Title
                    </label>
                    <input
                      className="input"
                      id={`banner-title-${banner.id}`}
                      onChange={(event) => handleBannerFieldChange(banner.id, 'title', event.target.value)}
                      placeholder="Build stronger teams through unforgettable events"
                      value={banner.title}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor={`banner-description-${banner.id}`}>
                      Description
                    </label>
                    <textarea
                      className="input min-h-28"
                      id={`banner-description-${banner.id}`}
                      onChange={(event) => handleBannerFieldChange(banner.id, 'description', event.target.value)}
                      placeholder="Add supporting copy for this homepage banner."
                      value={banner.description}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor={`banner-image-url-${banner.id}`}>
                      Image URL
                    </label>
                    <input
                      className="input"
                      id={`banner-image-url-${banner.id}`}
                      onChange={(event) => handleBannerFieldChange(banner.id, 'imageUrl', event.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      value={banner.imageUrl}
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      You can paste an image URL or upload a file below.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="label" htmlFor={`banner-upload-${banner.id}`}>
                      Upload Banner Image
                    </label>
                    <input
                      accept="image/*"
                      className="input"
                      id={`banner-upload-${banner.id}`}
                      onChange={(event) => handleBannerImageUpload(banner.id, event.target.files?.[0])}
                      type="file"
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor={`banner-primary-label-${banner.id}`}>
                      Primary Button Label
                    </label>
                    <input
                      className="input"
                      id={`banner-primary-label-${banner.id}`}
                      onChange={(event) =>
                        handleBannerFieldChange(banner.id, 'primaryActionLabel', event.target.value)
                      }
                      placeholder="Explore Events"
                      value={banner.primaryActionLabel}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor={`banner-primary-link-${banner.id}`}>
                      Primary Button Link
                    </label>
                    <input
                      className="input"
                      id={`banner-primary-link-${banner.id}`}
                      onChange={(event) =>
                        handleBannerFieldChange(banner.id, 'primaryActionHref', event.target.value)
                      }
                      placeholder="/events or https://example.com"
                      value={banner.primaryActionHref}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor={`banner-secondary-label-${banner.id}`}>
                      Secondary Button Label
                    </label>
                    <input
                      className="input"
                      id={`banner-secondary-label-${banner.id}`}
                      onChange={(event) =>
                        handleBannerFieldChange(banner.id, 'secondaryActionLabel', event.target.value)
                      }
                      placeholder="Learn More"
                      value={banner.secondaryActionLabel}
                    />
                  </div>

                  <div>
                    <label className="label" htmlFor={`banner-secondary-link-${banner.id}`}>
                      Secondary Button Link
                    </label>
                    <input
                      className="input"
                      id={`banner-secondary-link-${banner.id}`}
                      onChange={(event) =>
                        handleBannerFieldChange(banner.id, 'secondaryActionHref', event.target.value)
                      }
                      placeholder="/about or https://example.com"
                      value={banner.secondaryActionHref}
                    />
                  </div>

                  {banner.imageUrl ? (
                    <div className="md:col-span-2">
                      <div className="rounded-3xl bg-white p-4 shadow-sm">
                        <p className="text-sm font-semibold text-slate-700">Preview</p>
                        <img
                          alt={banner.imageAlt || banner.title || `Banner ${index + 1}`}
                          className="mt-4 max-h-80 w-full rounded-3xl object-cover"
                          src={banner.imageUrl}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <h3 className="text-xl font-bold text-slate-950">No homepage banners yet</h3>
            <p className="mt-3 text-sm text-slate-500">
              Create your first homepage slide to feature campaigns, tournaments, or brand messaging.
            </p>
            <button className="btn-primary mt-6" onClick={handleAddBanner} type="button">
              Create First Banner
            </button>
          </div>
        )}

        <button className="btn-primary" disabled={savePending} type="submit">
          {savePending ? 'Saving...' : 'Save Home Banners'}
        </button>
      </form>
    </>
  );
}
