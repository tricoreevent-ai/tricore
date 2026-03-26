import { useEffect, useMemo, useRef, useState } from 'react';

import FormAlert from '../common/FormAlert.jsx';
import { sampleGalleryImages } from '../../data/sampleGalleryImages.js';

const PAGE_SIZE = 12;
const gallerySections = {
  home: {
    toggleField: 'galleryEnabledHome',
    titleField: 'homeGalleryTitle',
    descriptionField: 'homeGalleryDescription',
    imagesField: 'homeGalleryImages',
    label: 'Home Page',
    helperText: 'Use the home gallery for high-energy visuals near the public landing flow.'
  },
  about: {
    toggleField: 'galleryEnabledAbout',
    titleField: 'aboutGalleryTitle',
    descriptionField: 'aboutGalleryDescription',
    imagesField: 'aboutGalleryImages',
    label: 'About Page',
    helperText: 'Use the about gallery for culture, crew, venue, and delivery-story visuals.'
  }
};

const createImageId = () =>
  globalThis.crypto?.randomUUID?.() || `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const sanitizeImage = (image = {}, index = 0) => ({
  id: String(image.id || '').trim() || createImageId(),
  imageUrl: String(image.imageUrl || '').trim(),
  imageAlt: String(image.imageAlt || '').trim(),
  caption: String(image.caption || '').trim() || `Gallery image ${index + 1}`
});

const sanitizeImages = (images = []) =>
  (Array.isArray(images) ? images : []).map((image, index) => sanitizeImage(image, index));

const sanitizeForm = (form = {}) => ({
  galleryEnabledHome: Boolean(form.galleryEnabledHome),
  galleryEnabledAbout: Boolean(form.galleryEnabledAbout),
  homeGalleryTitle: String(form.homeGalleryTitle || '').trim(),
  homeGalleryDescription: String(form.homeGalleryDescription || '').trim(),
  homeGalleryImages: sanitizeImages(form.homeGalleryImages),
  aboutGalleryTitle: String(form.aboutGalleryTitle || '').trim(),
  aboutGalleryDescription: String(form.aboutGalleryDescription || '').trim(),
  aboutGalleryImages: sanitizeImages(form.aboutGalleryImages)
});

const getGalleryImages = (form, galleryKey) => form[gallerySections[galleryKey].imagesField] || [];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });

const buildImagesFromFiles = async (files) =>
  Promise.all(
    [...files].map(async (file, index) => {
      const imageUrl = await readFileAsDataUrl(file);
      const nameWithoutExtension = file.name.replace(/\.[^.]+$/, '');

      return sanitizeImage(
        {
          id: createImageId(),
          imageUrl,
          imageAlt: nameWithoutExtension.replace(/[-_]+/g, ' ').trim(),
          caption: nameWithoutExtension.replace(/[-_]+/g, ' ').trim()
        },
        index
      );
    })
  );

const reorderImages = (images, sourceId, destinationId) => {
  const sourceIndex = images.findIndex((image) => image.id === sourceId);
  const destinationIndex = images.findIndex((image) => image.id === destinationId);

  if (sourceIndex < 0 || destinationIndex < 0 || sourceIndex === destinationIndex) {
    return images;
  }

  const nextImages = [...images];
  const [movedImage] = nextImages.splice(sourceIndex, 1);
  nextImages.splice(destinationIndex, 0, movedImage);
  return nextImages;
};

export default function GallerySettingsPanel({
  config,
  error,
  message,
  onRefresh,
  onSave,
  savePending
}) {
  const [form, setForm] = useState(null);
  const [activeGallery, setActiveGallery] = useState('home');
  const [localError, setLocalError] = useState('');
  const [dragState, setDragState] = useState(null);
  const [pageByGallery, setPageByGallery] = useState({ home: 1, about: 1 });
  const [uploadPending, setUploadPending] = useState(false);
  const homeUploadRef = useRef(null);
  const aboutUploadRef = useRef(null);

  useEffect(() => {
    setForm(config ? sanitizeForm(config) : null);
    setLocalError('');
    setPageByGallery({ home: 1, about: 1 });
  }, [config]);

  useEffect(() => {
    if (!form) {
      return;
    }

    setPageByGallery((current) => ({
      home: Math.min(
        current.home || 1,
        Math.max(1, Math.ceil(getGalleryImages(form, 'home').length / PAGE_SIZE))
      ),
      about: Math.min(
        current.about || 1,
        Math.max(1, Math.ceil(getGalleryImages(form, 'about').length / PAGE_SIZE))
      )
    }));
  }, [form]);

  const gallerySummary = useMemo(
    () => ({
      home: getGalleryImages(form || sanitizeForm(), 'home').length,
      about: getGalleryImages(form || sanitizeForm(), 'about').length
    }),
    [form]
  );

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
    setLocalError('');
  };

  const updateGalleryImage = (galleryKey, imageId, field, value) => {
    const section = gallerySections[galleryKey];

    setForm((current) => ({
      ...current,
      [section.imagesField]: getGalleryImages(current, galleryKey).map((image) =>
        image.id === imageId ? { ...image, [field]: value } : image
      )
    }));
    setLocalError('');
  };

  const handleBulkUpload = async (galleryKey, files) => {
    if (!files?.length) {
      return;
    }

    try {
      setUploadPending(true);
      const uploadedImages = await buildImagesFromFiles(files);
      const section = gallerySections[galleryKey];
      const nextImageCount =
        getGalleryImages(form || sanitizeForm(), galleryKey).length + uploadedImages.length;

      setForm((current) => ({
        ...current,
        [section.imagesField]: [...getGalleryImages(current, galleryKey), ...uploadedImages]
      }));
      setPageByGallery((current) => ({
        ...current,
        [galleryKey]: Math.max(1, Math.ceil(nextImageCount / PAGE_SIZE))
      }));
      setLocalError('');
    } catch (uploadError) {
      setLocalError(uploadError.message || 'Unable to upload gallery images.');
    } finally {
      setUploadPending(false);
    }
  };

  const handleDeleteImage = (galleryKey, imageId) => {
    const section = gallerySections[galleryKey];

    setForm((current) => ({
      ...current,
      [section.imagesField]: getGalleryImages(current, galleryKey).filter((image) => image.id !== imageId)
    }));
    setLocalError('');
  };

  const handleLoadSampleGallery = (galleryKey) => {
    const section = gallerySections[galleryKey];
    const seededImages = sampleGalleryImages.map((image, index) =>
      sanitizeImage(
        {
          ...image,
          id: `${galleryKey}-${image.id}-${index}`
        },
        index
      )
    );

    setForm((current) => ({
      ...current,
      [section.imagesField]: seededImages
    }));
    setPageByGallery((current) => ({
      ...current,
      [galleryKey]: 1
    }));
    setLocalError('');
  };

  const handleDragStart = (galleryKey, imageId) => {
    setDragState({ galleryKey, imageId });
  };

  const handleDrop = (galleryKey, destinationId) => {
    if (!dragState || dragState.galleryKey !== galleryKey) {
      return;
    }

    const section = gallerySections[galleryKey];

    // Keep reordering local to a single gallery so Home and About stay independent.
    setForm((current) => ({
      ...current,
      [section.imagesField]: reorderImages(
        getGalleryImages(current, galleryKey),
        dragState.imageId,
        destinationId
      )
    }));
    setDragState(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const payload = sanitizeForm(form || {});

    for (const [galleryKey, section] of Object.entries(gallerySections)) {
      const title = payload[section.titleField];
      const images = payload[section.imagesField];
      const enabled = payload[section.toggleField];

      if (enabled && !images.length) {
        setLocalError(`Add at least one image before enabling the ${section.label} gallery.`);
        return;
      }

      if (images.length && !title) {
        setLocalError(`${section.label} gallery title is required when images are present.`);
        return;
      }
    }

    await onSave(payload);
  };

  if (!form) {
    return null;
  }

  const activeSection = gallerySections[activeGallery];
  const activeImages = getGalleryImages(form, activeGallery);
  const currentPage = pageByGallery[activeGallery] || 1;
  const pageCount = Math.max(1, Math.ceil(activeImages.length / PAGE_SIZE));
  const pagedImages = activeImages.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const uploadRef = activeGallery === 'home' ? homeUploadRef : aboutUploadRef;

  return (
    <form className="space-y-8" onSubmit={handleSave}>
      <div className="grid gap-4 lg:grid-cols-4">
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Home Gallery</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{gallerySummary.home}</p>
          <p className="mt-2 text-sm text-slate-500">
            {form.galleryEnabledHome ? 'Visible on the website home page.' : 'Hidden from the website home page.'}
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">About Gallery</p>
          <p className="mt-3 text-3xl font-bold text-slate-950">{gallerySummary.about}</p>
          <p className="mt-2 text-sm text-slate-500">
            {form.galleryEnabledAbout ? 'Visible on the public About page.' : 'Hidden from the public About page.'}
          </p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Active Editor</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">{activeSection.label}</p>
          <p className="mt-2 text-sm text-slate-500">{activeSection.helperText}</p>
        </div>
        <div className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Scale Support</p>
          <p className="mt-3 text-2xl font-bold text-slate-950">Bulk + Drag</p>
          <p className="mt-2 text-sm text-slate-500">
            Multi-image uploads, drag-and-drop ordering, and paged management for large galleries.
          </p>
        </div>
      </div>

      <section className="panel space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gallery Configuration</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Manage Home and About galleries separately. Upload hundreds of images in batches,
              drag cards to reorder, and disable either gallery without deleting its image library.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={onRefresh} type="button">
              Refresh
            </button>
            <button
              className="btn-secondary"
              onClick={() => handleLoadSampleGallery(activeGallery)}
              type="button"
            >
              Load Samples
            </button>
            <button
              className="btn-secondary"
              onClick={() => uploadRef.current?.click()}
              type="button"
            >
              {uploadPending ? 'Uploading...' : 'Bulk Upload'}
            </button>
          </div>
        </div>

        <FormAlert message={error || localError} />
        <FormAlert message={message} type="success" />

        <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-2">
          {Object.entries(gallerySections).map(([galleryKey, section]) => (
            <button
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeGallery === galleryKey
                  ? 'bg-white text-slate-900 shadow-soft'
                  : 'text-slate-600 hover:bg-white/70'
              }`}
              key={galleryKey}
              onClick={() => setActiveGallery(galleryKey)}
              type="button"
            >
              {section.label}
            </button>
          ))}
        </div>

        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            void handleBulkUpload('home', event.target.files);
            event.target.value = '';
          }}
          ref={homeUploadRef}
          type="file"
        />
        <input
          accept="image/*"
          className="hidden"
          multiple
          onChange={(event) => {
            void handleBulkUpload('about', event.target.files);
            event.target.value = '';
          }}
          ref={aboutUploadRef}
          type="file"
        />

        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <div className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <label className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
              <input
                checked={Boolean(form[activeSection.toggleField])}
                onChange={(event) => updateField(activeSection.toggleField, event.target.checked)}
                type="checkbox"
              />
              Enable {activeSection.label} gallery
            </label>

            <div>
              <label className="label" htmlFor={`${activeGallery}-gallery-title`}>
                Gallery Title
              </label>
              <input
                className="input"
                id={`${activeGallery}-gallery-title`}
                onChange={(event) => updateField(activeSection.titleField, event.target.value)}
                value={form[activeSection.titleField]}
              />
            </div>

            <div>
              <label className="label" htmlFor={`${activeGallery}-gallery-description`}>
                Gallery Description
              </label>
              <textarea
                className="input min-h-28"
                id={`${activeGallery}-gallery-description`}
                onChange={(event) => updateField(activeSection.descriptionField, event.target.value)}
                value={form[activeSection.descriptionField]}
              />
            </div>

            <div className="rounded-[1.5rem] bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                Library Status
              </p>
              <p className="mt-3 text-2xl font-bold text-slate-950">{activeImages.length} images</p>
              <p className="mt-2 text-sm text-slate-500">
                Drag image cards to reorder. Only the visible page is rendered here for speed.
              </p>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
            {activeImages.length ? (
              <>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                      {activeSection.label} Library
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      Page {currentPage} of {pageCount}. Drag cards to reorder within the full gallery.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      disabled={currentPage === 1}
                      onClick={() =>
                        setPageByGallery((current) => ({
                          ...current,
                          [activeGallery]: Math.max(1, currentPage - 1)
                        }))
                      }
                      type="button"
                    >
                      Previous
                    </button>
                    <button
                      className="btn-secondary"
                      disabled={currentPage >= pageCount}
                      onClick={() =>
                        setPageByGallery((current) => ({
                          ...current,
                          [activeGallery]: Math.min(pageCount, currentPage + 1)
                        }))
                      }
                      type="button"
                    >
                      Next
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {pagedImages.map((image, index) => (
                    <article
                      className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-50 shadow-sm"
                      draggable
                      key={image.id}
                      onDragEnd={() => setDragState(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => handleDragStart(activeGallery, image.id)}
                      onDrop={() => handleDrop(activeGallery, image.id)}
                    >
                      <div className="relative aspect-[4/3] bg-[linear-gradient(135deg,#0a2c66,#0f5fdb,#38bdf8)]">
                        {image.imageUrl ? (
                          <img
                            alt={image.imageAlt || image.caption || `Gallery image ${index + 1}`}
                            className="h-full w-full object-cover"
                            src={image.imageUrl}
                          />
                        ) : null}
                        <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                          Drag
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        <div>
                          <label className="label" htmlFor={`${activeGallery}-caption-${image.id}`}>
                            Caption
                          </label>
                          <input
                            className="input"
                            id={`${activeGallery}-caption-${image.id}`}
                            onChange={(event) =>
                              updateGalleryImage(activeGallery, image.id, 'caption', event.target.value)
                            }
                            value={image.caption}
                          />
                        </div>

                        <div>
                          <label className="label" htmlFor={`${activeGallery}-alt-${image.id}`}>
                            Alt Text
                          </label>
                          <input
                            className="input"
                            id={`${activeGallery}-alt-${image.id}`}
                            onChange={(event) =>
                              updateGalleryImage(activeGallery, image.id, 'imageAlt', event.target.value)
                            }
                            value={image.imageAlt}
                          />
                        </div>

                        <div className="flex justify-between gap-3">
                          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            #{(currentPage - 1) * PAGE_SIZE + index + 1}
                          </span>
                          <button
                            className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                            onClick={() => handleDeleteImage(activeGallery, image.id)}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc,#e0f2fe)] p-10 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  {activeSection.label}
                </p>
                <h3 className="mt-3 text-2xl font-bold text-slate-950">No images yet</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  Use bulk upload to add one or many sports images at once. This editor is built to
                  handle larger galleries without forcing a long scrolling list.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button className="btn-primary" disabled={savePending || uploadPending} type="submit">
            {savePending ? 'Saving...' : 'Save Gallery Settings'}
          </button>
        </div>
      </section>
    </form>
  );
}
