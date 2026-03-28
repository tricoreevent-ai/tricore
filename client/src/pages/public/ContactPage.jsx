import { useState } from 'react';

import { submitContactInquiry } from '../../api/contactApi.js';
import AppIcon from '../../components/common/AppIcon.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import PartnerHighlights from '../../components/common/PartnerHighlights.jsx';
import { contactContent, partnerHighlights } from '../../data/siteContent.js';
import { getWhatsAppHref, getTelephoneHref } from '../../utils/contactLinks.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';

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
  const primaryPhone =
    contactContent.whatsAppPhone ||
    contactContent.partners.flatMap((partner) => partner.phones || [])[0] ||
    '';
  const quickCallHref = primaryPhone ? getTelephoneHref(primaryPhone) : '';
  const whatsAppHref = getWhatsAppHref(primaryPhone, contactContent.whatsAppMessage);

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
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Reach out
              </p>
              <h1 className="mt-3 text-4xl font-bold">
                Start with a quick inquiry and we&apos;ll help shape the right event plan
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600">
                Have a tournament in mind, a corporate event to plan, or a community format to
                launch? TriCore is backed by partners with real delivery experience, and we&apos;re ready
                to turn your brief into a disciplined, high-energy event experience.
              </p>
            </div>

            <div className="panel space-y-5 p-6 sm:p-8">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-orange">
                  Quick contact
                </p>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Share your preferred dates, city, event type, and approximate audience size to
                  speed up the first conversation.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {whatsAppHref ? (
                  <a className="btn-whatsapp" href={whatsAppHref} rel="noreferrer" target="_blank">
                    <AppIcon className="h-4 w-4" name="whatsapp" />
                    Chat on WhatsApp
                  </a>
                ) : null}
                {quickCallHref ? (
                  <a className="btn-secondary" href={quickCallHref}>
                    Call TriCore
                  </a>
                ) : null}
                <a className="btn-secondary" href={`mailto:${contactContent.email}`}>
                  Email Us
                </a>
              </div>

              <div className="space-y-4 border-t border-slate-200 pt-5 text-sm text-slate-600">
                <div>
                  <p className="font-semibold text-slate-900">Email</p>
                  <a
                    className="mt-2 block text-base font-bold text-slate-950 hover:text-brand-blue"
                    href={`mailto:${contactContent.email}`}
                  >
                    {contactContent.email}
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Website</p>
                  <a
                    className="mt-2 block break-all text-base font-bold text-slate-950 hover:text-brand-blue"
                    href={contactContent.website}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {contactContent.website}
                  </a>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Leadership Contacts</p>
                  <div className="mt-3 space-y-4">
                    {contactContent.partners.map((partner) => (
                      <div key={partner.name}>
                        <p className="font-bold text-slate-950">{partner.name}</p>
                        {partner.phones.map((phone) => (
                          <a
                            className="mt-1 block text-base text-slate-600 transition hover:text-brand-blue"
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
            </div>
          </section>

          <form className="panel space-y-5 p-6 sm:p-8" onSubmit={handleSubmit}>
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
                placeholder="Tell us about the event type, expected dates, city, audience size, and any must-haves."
                required
                value={form.message}
              />
            </div>
            <FormAlert message={errorMessage} />
            <FormAlert message={successMessage} type="success" />
            <button className="btn-primary" disabled={submitting} type="submit">
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
            <p className="text-sm leading-7 text-slate-500">
              We use this form for tournament registrations support, corporate event inquiries,
              sponsorship conversations, and general planning requests.
            </p>
          </form>
        </div>
      </div>
      <PartnerHighlights
        description="Spark 7 Sports Arena and Sarva Horizon continue to shape the venue quality, presentation, and partner experience behind TriCore events."
        partners={partnerHighlights}
        title="Trusted Event Partners"
      />
    </div>
  );
}
