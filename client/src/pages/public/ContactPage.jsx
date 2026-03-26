import { useState } from 'react';

import { submitContactInquiry } from '../../api/contactApi.js';
import FormAlert from '../../components/common/FormAlert.jsx';
import PartnerHighlights from '../../components/common/PartnerHighlights.jsx';
import { contactContent, partnerHighlights } from '../../data/siteContent.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

const getTelephoneHref = (phone) => `tel:${String(phone || '').replace(/[^\d+]/g, '')}`;

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSubmitting(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      await submitContactInquiry(form);
      setSuccessMessage('Thanks. Your message was sent to the TriCore team.');
      setForm({
        name: '',
        email: '',
        phone: '',
        message: ''
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, 'Unable to send your message right now.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-20 pt-16">
      <div className="container-shell">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Reach out</p>
            <h1 className="mt-3 text-4xl font-bold">Let&apos;s create something unforgettable</h1>
            <p className="mt-4 text-slate-600">
              Have a tournament in mind, a corporate event to plan, or a team that needs connecting? We are ready to listen and turn the idea into a disciplined, high-energy event experience.
            </p>
          </div>
          <div className="panel space-y-4 p-6">
            <div>
              <p className="text-sm font-semibold text-slate-500">Email</p>
              <a className="mt-2 block text-lg font-bold text-slate-950" href={`mailto:${contactContent.email}`}>
                {contactContent.email}
              </a>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Website</p>
              <a className="mt-2 block text-lg font-bold text-slate-950" href={contactContent.website} rel="noreferrer" target="_blank">
                {contactContent.website}
              </a>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Founding Partners</p>
              <div className="mt-3 space-y-4">
                {contactContent.partners.map((partner) => (
                  <div key={partner.name}>
                    <p className="font-bold text-slate-950">{partner.name}</p>
                    {partner.phones.map((phone) => (
                      <a
                        className="mt-1 block text-sm text-slate-600 transition hover:text-brand-blue"
                        href={getTelephoneHref(phone)}
                        key={phone}
                      >
                        {phone}
                      </a>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <form className="panel space-y-5 p-6" onSubmit={handleSubmit}>
          <div>
            <label className="label" htmlFor="contact-name">
              Name
            </label>
            <input
              className="input"
              id="contact-name"
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              required
              value={form.name}
            />
          </div>
          <div>
            <label className="label" htmlFor="contact-email">
              Email
            </label>
            <input
              className="input"
              id="contact-email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
              type="email"
              value={form.email}
            />
          </div>
          <div>
            <label className="label" htmlFor="contact-phone">
              Phone Number <span className="text-slate-400">(optional)</span>
            </label>
            <input
              className="input"
              id="contact-phone"
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="+91 90000 00000"
              type="tel"
              value={form.phone}
            />
          </div>
          <div>
            <label className="label" htmlFor="contact-message">
              Message
            </label>
            <textarea
              className="input min-h-40"
              id="contact-message"
              onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
              required
              value={form.message}
            />
          </div>
          <FormAlert message={errorMessage} />
          <FormAlert message={successMessage} type="success" />
          <button className="btn-primary" disabled={submitting} type="submit">
            {submitting ? 'Sending...' : 'Send Message'}
          </button>
          <p className="text-sm text-slate-500">Stay connected for upcoming events, announcements, and news.</p>
        </form>
        </div>
      </div>
      <PartnerHighlights
        description="Spark 7 Sports Arena and Sarva Horizon continue to shape the venue quality, presentation, and partner experience behind TriCore events."
        partners={partnerHighlights}
        title="Proud Event Partners"
      />
    </div>
  );
}
