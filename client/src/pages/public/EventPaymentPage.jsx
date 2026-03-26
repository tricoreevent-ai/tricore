import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { createManualRegistration } from '../../api/registrationApi.js';
import { getEventById } from '../../api/eventsApi.js';
import { getPublicPaymentSettings } from '../../api/publicSettingsApi.js';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatCurrency } from '../../utils/formatters.js';
import {
  clearRegistrationDraft,
  loadRegistrationDraft
} from '../../utils/paymentDraftStorage.js';

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });

export default function EventPaymentPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualReference, setManualReference] = useState('');
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptDataUrl, setReceiptDataUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);

      try {
        const savedDraft = loadRegistrationDraft(eventId);
        const [eventResponse, paymentResponse] = await Promise.all([
          getEventById(eventId),
          getPublicPaymentSettings()
        ]);

        setDraft(savedDraft);
        setEvent(eventResponse);
        setPaymentSettings(paymentResponse);
      } catch (requestError) {
        setError(getApiErrorMessage(requestError, 'Unable to load the payment screen.'));
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [eventId]);

  const paymentMethods = useMemo(() => {
    if (!paymentSettings) {
      return [];
    }

    const items = [];

    if (paymentSettings.qrCodeDataUrl) {
      items.push('qr');
    }

    if (paymentSettings.upiId) {
      items.push('upi');
    }

    if (
      paymentSettings.bankAccountName ||
      paymentSettings.bankAccountNumber ||
      paymentSettings.bankIfscCode ||
      paymentSettings.bankName
    ) {
      items.push('bank');
    }

    return items;
  }, [paymentSettings]);

  const handleReceiptChange = async (eventValue) => {
    const file = eventValue.target.files?.[0];

    if (!file) {
      setReceiptFileName('');
      setReceiptDataUrl('');
      return;
    }

    try {
      const fileDataUrl = await readFileAsDataUrl(file);
      setReceiptFileName(file.name);
      setReceiptDataUrl(fileDataUrl);
      setError('');
    } catch (fileError) {
      setError(fileError.message);
    }
  };

  const handleSubmit = async (submitEvent) => {
    submitEvent.preventDefault();

    if (!draft) {
      setError('Registration details are missing. Please return to the event page and submit the form again.');
      return;
    }

    if (!paymentSettings?.manualPaymentEnabled) {
      setError('Manual payment is not enabled for this application right now.');
      return;
    }

    if (!receiptDataUrl) {
      setError('Upload your payment screenshot before submitting for review.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await createManualRegistration({
        ...draft,
        eventId,
        manualReference,
        receiptDataUrl,
        receiptFilename: receiptFileName
      });

      clearRegistrationDraft(eventId);
      setSuccess('Payment proof submitted successfully. Your registration is now under review.');
      navigate('/dashboard');
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, 'Unable to submit payment proof.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading payment options..." />;
  }

  if (!event) {
    return (
      <div className="container-shell py-16">
        <div className="panel p-8 text-center">
          <h1 className="text-3xl font-bold">Payment screen unavailable</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="container-shell py-16">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="panel overflow-hidden">
          <div className="bg-gradient-to-br from-brand-blue via-brand-navy to-sky-500 p-8 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-100">
              Payment Workflow
            </p>
            <h1 className="mt-3 text-4xl font-bold">Complete Payment for {event.name}</h1>
            <p className="mt-4 max-w-3xl text-blue-100">
              Your registration details are saved. Use any configured payment method below,
              then upload the payment screenshot for admin confirmation.
            </p>
          </div>
          <div className="grid gap-4 p-8 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Team / Registrant</p>
              <p className="mt-2 text-lg font-bold text-slate-950">
                {draft?.teamName || draft?.name || 'Draft registration'}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Entry Fee</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{formatCurrency(event.entryFee)}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">Available Methods</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{paymentMethods.length}</p>
            </div>
          </div>
        </div>

        <FormAlert message={error} />
        <FormAlert message={success} type="success" />

        {!draft ? (
          <div className="panel p-6">
            <p className="text-sm text-slate-600">
              No registration draft was found for this event. Go back to the event page, add players,
              and continue again.
            </p>
            <Link className="btn-secondary mt-4 inline-flex" to={`/events/${eventId}`}>
              Back to Event
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="panel space-y-6 p-6">
              <div>
                <h2 className="text-2xl font-bold">Configured Payment Methods</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Only the methods enabled in admin settings are shown here.
                </p>
              </div>

              {paymentMethods.includes('qr') ? (
                <div className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-lg font-bold">QR Code</h3>
                  <p className="mt-2 text-sm text-slate-500">Scan this code and pay the registration fee.</p>
                  <img
                    alt="Payment QR code"
                    className="mt-4 max-h-80 w-full rounded-3xl object-contain"
                    src={paymentSettings.qrCodeDataUrl}
                  />
                </div>
              ) : null}

              {paymentMethods.includes('upi') ? (
                <div className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-lg font-bold">UPI</h3>
                  <p className="mt-2 text-sm text-slate-500">Send the amount to the configured UPI ID.</p>
                  <p className="mt-4 text-xl font-bold text-slate-950">{paymentSettings.upiId}</p>
                  {paymentSettings.payeeName ? (
                    <p className="mt-2 text-sm text-slate-500">Payee: {paymentSettings.payeeName}</p>
                  ) : null}
                </div>
              ) : null}

              {paymentMethods.includes('bank') ? (
                <div className="rounded-3xl bg-slate-50 p-5">
                  <h3 className="text-lg font-bold">Bank Transfer</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account Name</p>
                      <p className="mt-2 font-semibold text-slate-950">{paymentSettings.bankAccountName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Account Number</p>
                      <p className="mt-2 font-semibold text-slate-950">{paymentSettings.bankAccountNumber || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Bank</p>
                      <p className="mt-2 font-semibold text-slate-950">{paymentSettings.bankName || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">IFSC</p>
                      <p className="mt-2 font-semibold text-slate-950">{paymentSettings.bankIfscCode || '-'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Branch</p>
                      <p className="mt-2 font-semibold text-slate-950">{paymentSettings.bankBranch || '-'}</p>
                    </div>
                  </div>
                  {paymentSettings.bankInstructions ? (
                    <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600">
                      {paymentSettings.bankInstructions}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!paymentMethods.length ? (
                <p className="rounded-3xl bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  No offline payment methods are configured yet. Please contact the admin before submitting payment proof.
                </p>
              ) : null}

              {!paymentSettings?.manualPaymentEnabled ? (
                <p className="rounded-3xl bg-red-50 px-4 py-4 text-sm text-red-600">
                  Manual payment confirmation is currently disabled by the admin.
                </p>
              ) : null}
            </section>

            <form className="panel space-y-6 p-6" onSubmit={handleSubmit}>
              <div>
                <h2 className="text-2xl font-bold">Upload Payment Proof</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Upload the screenshot after payment. The image will be emailed to the admin-configured recipient for review.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="manualReference">
                  Transaction Reference
                </label>
                <input
                  className="input"
                  id="manualReference"
                  onChange={(eventValue) => setManualReference(eventValue.target.value)}
                  placeholder="UTR / UPI ref / bank transfer ref"
                  value={manualReference}
                />
              </div>

              <div>
                <label className="label" htmlFor="receiptUpload">
                  Payment Screenshot
                </label>
                <input
                  accept="image/*"
                  className="input"
                  id="receiptUpload"
                  onChange={handleReceiptChange}
                  type="file"
                />
                {receiptFileName ? (
                  <p className="mt-2 text-sm text-slate-500">Selected file: {receiptFileName}</p>
                ) : null}
              </div>

              {receiptDataUrl ? (
                <div className="rounded-3xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-700">Receipt Preview</p>
                  <img
                    alt="Payment proof preview"
                    className="mt-3 max-h-80 w-full rounded-3xl object-contain"
                    src={receiptDataUrl}
                  />
                </div>
              ) : null}

              <div className="rounded-3xl bg-brand-mist px-4 py-4 text-sm text-brand-blue">
                Payment status after submission: <strong>Under Review</strong>. Admin will confirm the payment and send the final confirmation email.
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  className="btn-primary"
                  disabled={submitting || !paymentMethods.length || !paymentSettings?.manualPaymentEnabled}
                  type="submit"
                >
                  {submitting ? 'Submitting...' : 'Submit Payment Proof'}
                </button>
                <Link className="btn-secondary" to={`/events/${eventId}`}>
                  Back to Event
                </Link>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
