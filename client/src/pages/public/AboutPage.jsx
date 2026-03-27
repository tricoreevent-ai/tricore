import { useEffect, useState } from 'react';

import ImageGallerySection from '../../components/common/ImageGallerySection.jsx';
import PartnerHighlights from '../../components/common/PartnerHighlights.jsx';
import { getPublicHomePageContent } from '../../api/publicSettingsApi.js';
import {
  aboutHighlights,
  partnerHighlights
} from '../../data/siteContent.js';

export default function AboutPage() {
  const [galleryConfig, setGalleryConfig] = useState(null);

  useEffect(() => {
    const loadGalleryConfig = async () => {
      try {
        const response = await getPublicHomePageContent();
        setGalleryConfig(response || null);
      } catch {
        setGalleryConfig(null);
      }
    };

    loadGalleryConfig();
  }, []);

  return (
    <div className="pb-20">
      <div className="container-shell py-16">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            About TriCore
          </p>
          <h1 className="mt-3 text-4xl font-bold">Built on Experience, Driven by Passion</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">{aboutHighlights.intro}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <section className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Vision
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-700">{aboutHighlights.vision}</p>
          </section>

          <section className="panel p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Why Sports Matter
            </p>
            <p className="mt-4 text-lg leading-8 text-slate-700">{aboutHighlights.sportsBelief}</p>
          </section>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <section className="panel p-8">
            <h2 className="text-2xl font-bold">Our Mission</h2>
            <div className="mt-6 space-y-4">
              {aboutHighlights.mission.map((item) => (
                <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-8">
            <h2 className="text-2xl font-bold">Our Commitment to Community</h2>
            <div className="mt-6 space-y-4">
              {aboutHighlights.csr.map((item) => (
                <div className="rounded-3xl bg-slate-50 p-5" key={item}>
                  <p className="text-sm leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="panel mt-10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Experience Network
          </p>
          <h2 className="mt-4 text-3xl font-bold text-slate-950">
            Twenty years of event learning, backed by experienced vendors and crews
          </h2>
          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-600">
            TriCore works with trusted venues, match officials, logistics teams, production vendors,
            hospitality partners, and support crews who understand what it takes to deliver clean,
            safe, high-energy events. That network lets us scale without losing operational clarity
            or the warm, people-first experience participants remember.
          </p>
        </section>

        <section className="panel mt-10 p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            {aboutHighlights.organizersTitle}
          </p>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-600">
            {aboutHighlights.organizersDescription}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {aboutHighlights.organizers.map((organizer) => (
              <div className="rounded-3xl bg-slate-50 p-6" key={organizer.name}>
                <h3 className="text-xl font-bold text-slate-950">{organizer.name}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{organizer.role}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-base leading-8 text-slate-700">
            {aboutHighlights.organizersClosing}
          </p>
        </section>
      </div>

      {galleryConfig?.galleryEnabledAbout ? (
        <ImageGallerySection
          description={galleryConfig.aboutGalleryDescription}
          images={galleryConfig.aboutGalleryImages}
          title={galleryConfig.aboutGalleryTitle}
        />
      ) : null}

      <PartnerHighlights
        description="TriCore collaborations help us deliver stronger venues, better visibility, and a more complete event experience."
        partners={partnerHighlights}
        title="Featured Partners"
      />
    </div>
  );
}
