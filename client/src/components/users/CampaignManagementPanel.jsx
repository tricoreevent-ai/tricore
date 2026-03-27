import { useEffect, useMemo, useState } from 'react';

import {
  getAudienceCampaignConfig,
  getAudienceCampaigns,
  getAudienceUsers,
  sendAudienceCampaign,
  updateAudienceCampaignConfig
} from '../../api/audienceApi.js';
import AppIcon from '../common/AppIcon.jsx';
import FormAlert from '../common/FormAlert.jsx';
import StatCard from '../common/StatCard.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDateTime } from '../../utils/formatters.js';

const segmentOptions = [
  { value: 'all', label: 'All Contacts' },
  { value: 'registered', label: 'Registered Users' },
  { value: 'current', label: 'Current Participants' },
  { value: 'previous', label: 'Previous Participants' },
  { value: 'interested', label: 'Interested Users' }
];

const sortOptions = [
  { value: 'recent', label: 'Most Recent Activity' },
  { value: 'name', label: 'Name A-Z' }
];

const createInitialFilters = () => ({
  search: '',
  segment: 'all',
  eventId: '',
  sort: 'recent'
});

const createInitialCampaignForm = () => ({
  name: '',
  subject: '',
  previewText: '',
  message: '',
  ctaLabel: 'View Events',
  ctaUrl: '/events',
  channels: {
    email: true,
    sms: false,
    whatsapp: false
  }
});

function DeliverabilityChecklist({ config }) {
  const checklist = [
    `SMTP status: ${config.smtpReady ? 'ready' : 'not configured'}`,
    `From address: ${config.smtpFromEmail || 'Not configured yet'}`,
    'Use SPF, DKIM, and DMARC on the sending domain.',
    'Send one email per recipient with personalization and unsubscribe.',
    'Avoid misleading subjects or oversized attachments.',
    'Warm up sender reputation and monitor bounce/complaint rates.'
  ];

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
        Deliverability Checklist
      </p>
      <div className="mt-4 space-y-3">
        {checklist.map((item) => (
          <div className="flex items-start gap-3" key={item}>
            <span className="mt-1 rounded-full bg-white p-1 text-brand-blue">
              <AppIcon className="h-3.5 w-3.5" name="check" />
            </span>
            <p className="text-sm text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CampaignManagementPanel() {
  const [filters, setFilters] = useState(createInitialFilters);
  const [campaignForm, setCampaignForm] = useState(createInitialCampaignForm);
  const [config, setConfig] = useState({
    enableEmail: true,
    enableSms: false,
    enableWhatsApp: false,
    smsProviderName: '',
    whatsappProviderName: '',
    defaultReplyTo: '',
    deliveryNotes: '',
    smtpReady: false,
    smtpFromEmail: '',
    smtpFromName: ''
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(8);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [sendingCampaign, setSendingCampaign] = useState(false);
  const [preview, setPreview] = useState({
    totalCount: 0,
    summary: {
      totalAudience: 0,
      currentParticipants: 0,
      pastParticipants: 0,
      interestedContacts: 0,
      emailOptOutCount: 0
    },
    eventOptions: []
  });
  const [previewLoading, setPreviewLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await getAudienceCampaignConfig();

        if (!cancelled) {
          setConfig(response);
        }
      } catch (requestError) {
        if (!cancelled) {
          setConfigError(getApiErrorMessage(requestError, 'Unable to load campaign configuration.'));
        }
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      setPreviewLoading(true);

      try {
        const response = await getAudienceUsers({
          ...filters,
          page: 1,
          limit: 5
        });

        if (cancelled) {
          return;
        }

        setPreview({
          totalCount: response.totalCount || 0,
          summary: response.summary || {},
          eventOptions: response.filters?.eventOptions || []
        });
      } catch (requestError) {
        if (!cancelled) {
          setCampaignError(getApiErrorMessage(requestError, 'Unable to load campaign audience preview.'));
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);

      try {
        const response = await getAudienceCampaigns({
          page: historyPage,
          limit: historyLimit
        });

        if (cancelled) {
          return;
        }

        setHistoryItems(response.items || []);
        setHistoryTotalPages(response.totalPages || 1);
      } catch (requestError) {
        if (!cancelled) {
          setCampaignError(getApiErrorMessage(requestError, 'Unable to load campaign history.'));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyLimit, historyPage]);

  const eventOptions = useMemo(
    () => [{ value: '', label: 'All Events' }, ...(preview.eventOptions || [])],
    [preview.eventOptions]
  );

  const handleConfigSave = async (event) => {
    event.preventDefault();
    setConfigSaving(true);
    setConfigMessage('');
    setConfigError('');

    try {
      const response = await updateAudienceCampaignConfig(config);
      setConfig(response);
      setConfigMessage('Campaign settings saved successfully.');
    } catch (requestError) {
      setConfigError(getApiErrorMessage(requestError, 'Unable to save campaign configuration.'));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSendCampaign = async (event) => {
    event.preventDefault();
    setSendingCampaign(true);
    setCampaignMessage('');
    setCampaignError('');

    try {
      const response = await sendAudienceCampaign({
        ...campaignForm,
        name: campaignForm.name || `Audience Campaign ${new Date().toISOString().slice(0, 10)}`,
        targetMode: 'filtered',
        filters
      });

      setCampaignMessage(
        response.failedCount
          ? `Sent ${response.sentCount} email(s). ${response.failedCount} failed.`
          : `Sent ${response.sentCount} campaign email(s) successfully.`
      );
      setCampaignForm(createInitialCampaignForm());
      setHistoryPage(1);
      const refreshedHistory = await getAudienceCampaigns({
        page: 1,
        limit: historyLimit
      });
      setHistoryItems(refreshedHistory.items || []);
      setHistoryTotalPages(refreshedHistory.totalPages || 1);
    } catch (requestError) {
      setCampaignError(getApiErrorMessage(requestError, 'Unable to send campaign.'));
    } finally {
      setSendingCampaign(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          helper="Audience"
          icon="users"
          subtitle="Users who match the current filters and can be targeted by this campaign."
          title="Matched Contacts"
          value={previewLoading ? 'Loading...' : preview.totalCount || 0}
        />
        <StatCard
          helper="Current"
          icon="calendar"
          subtitle="Active participants inside the current campaign segment."
          title="Current Participants"
          tone="emerald"
          value={previewLoading ? 'Loading...' : preview.summary.currentParticipants || 0}
        />
        <StatCard
          helper="Interest"
          icon="sparkle"
          subtitle="Users who asked to be notified when events open."
          title="Interested Contacts"
          tone="orange"
          value={previewLoading ? 'Loading...' : preview.summary.interestedContacts || 0}
        />
        <StatCard
          helper="Opt-out"
          icon="mailOff"
          subtitle="Contacts that will be skipped automatically during campaign sends."
          title="Email Opt Outs"
          tone="rose"
          value={previewLoading ? 'Loading...' : preview.summary.emailOptOutCount || 0}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
        <form className="panel p-6" onSubmit={handleSendCampaign}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Campaign Builder
              </p>
              <h2 className="mt-3 text-2xl font-bold">Targeted audience campaigns</h2>
              <p className="mt-2 text-sm text-slate-500">
                Build a filtered campaign, preview the reachable audience, and send it through the configured email channel.
              </p>
            </div>
            <div className="rounded-3xl bg-brand-mist px-4 py-3 text-sm font-semibold text-brand-blue">
              Email primary
            </div>
          </div>

          <FormAlert message={campaignError} />
          <FormAlert message={campaignMessage} type="success" />

          <div className="mt-6 grid gap-4 lg:grid-cols-4">
            <div>
              <label className="label" htmlFor="campaign-search">
                Search Audience
              </label>
              <input
                className="input"
                id="campaign-search"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value
                  }))
                }
                placeholder="Search user or event"
                value={filters.search}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-segment">
                Segment
              </label>
              <TypeaheadSelect
                id="campaign-segment"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    segment: event.target.value
                  }))
                }
                options={segmentOptions}
                placeholder="Select segment"
                searchPlaceholder="Search segments"
                value={filters.segment}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-event">
                Event
              </label>
              <TypeaheadSelect
                id="campaign-event"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    eventId: event.target.value
                  }))
                }
                options={eventOptions}
                placeholder="Select event"
                searchPlaceholder="Search events"
                value={filters.eventId}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-sort">
                Sort
              </label>
              <TypeaheadSelect
                id="campaign-sort"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    sort: event.target.value
                  }))
                }
                options={sortOptions}
                placeholder="Select sort"
                searchPlaceholder="Search sort"
                value={filters.sort}
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-2">
            <div>
              <label className="label" htmlFor="campaign-name">
                Campaign Name
              </label>
              <input
                className="input"
                id="campaign-name"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
                placeholder="Example: April registration reminder"
                value={campaignForm.name}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-subject">
                Email Subject
              </label>
              <input
                className="input"
                id="campaign-subject"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    subject: event.target.value
                  }))
                }
                required
                value={campaignForm.subject}
              />
            </div>
            <div className="xl:col-span-2">
              <label className="label" htmlFor="campaign-preview-text">
                Preview Text
              </label>
              <input
                className="input"
                id="campaign-preview-text"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    previewText: event.target.value
                  }))
                }
                placeholder="Short inbox preview shown beside the subject."
                value={campaignForm.previewText}
              />
            </div>
            <div className="xl:col-span-2">
              <label className="label" htmlFor="campaign-message">
                Email Message
              </label>
              <textarea
                className="input min-h-44"
                id="campaign-message"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    message: event.target.value
                  }))
                }
                required
                value={campaignForm.message}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-cta-label">
                CTA Label
              </label>
              <input
                className="input"
                id="campaign-cta-label"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    ctaLabel: event.target.value
                  }))
                }
                value={campaignForm.ctaLabel}
              />
            </div>
            <div>
              <label className="label" htmlFor="campaign-cta-url">
                CTA URL
              </label>
              <input
                className="input"
                id="campaign-cta-url"
                onChange={(event) =>
                  setCampaignForm((current) => ({
                    ...current,
                    ctaUrl: event.target.value
                  }))
                }
                placeholder="/events"
                value={campaignForm.ctaUrl}
              />
            </div>
          </div>

          <div className="mt-6 rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">
                  Campaign Channels
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Email is the live delivery path. SMS and WhatsApp can be configured now and activated later when providers are integrated.
                </p>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input checked disabled type="checkbox" />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    checked={campaignForm.channels.sms}
                    onChange={(event) =>
                      setCampaignForm((current) => ({
                        ...current,
                        channels: {
                          ...current.channels,
                          sms: event.target.checked
                        }
                      }))
                    }
                    type="checkbox"
                  />
                  SMS
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    checked={campaignForm.channels.whatsapp}
                    onChange={(event) =>
                      setCampaignForm((current) => ({
                        ...current,
                        channels: {
                          ...current.channels,
                          whatsapp: event.target.checked
                        }
                      }))
                    }
                    type="checkbox"
                  />
                  WhatsApp
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button className="btn-primary gap-2" disabled={sendingCampaign || previewLoading || !preview.totalCount} type="submit">
              <AppIcon className="h-4 w-4" name="send" />
              {sendingCampaign ? 'Sending Campaign...' : 'Launch Campaign'}
            </button>
            <button
              className="btn-secondary gap-2"
              onClick={() => {
                setCampaignForm(createInitialCampaignForm());
                setFilters(createInitialFilters());
              }}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="refresh" />
              Reset Campaign
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <form className="panel p-6" onSubmit={handleConfigSave}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Campaign Settings
                </p>
                <h2 className="mt-3 text-2xl font-bold">Delivery configuration</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Email stays primary. SMS and WhatsApp remain optional configuration switches until provider delivery is added.
                </p>
              </div>
              <div className="rounded-3xl bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                {config.smtpReady ? 'SMTP Ready' : 'SMTP Needed'}
              </div>
            </div>

            <FormAlert message={configError} />
            <FormAlert message={configMessage} type="success" />

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <input checked disabled type="checkbox" />
                  Email campaigns enabled
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  Sender: {config.smtpFromName || 'TriCore Events'} {config.smtpFromEmail ? `(${config.smtpFromEmail})` : ''}
                </p>
              </div>
              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  checked={config.enableSms}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      enableSms: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Enable SMS add-on planning
              </label>
              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <input
                  checked={config.enableWhatsApp}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      enableWhatsApp: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Enable WhatsApp add-on planning
              </label>
              <div>
                <label className="label" htmlFor="campaign-reply-to">
                  Default Reply-To
                </label>
                <input
                  className="input"
                  id="campaign-reply-to"
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      defaultReplyTo: event.target.value
                    }))
                  }
                  placeholder="events@tricoreevents.online"
                  value={config.defaultReplyTo}
                />
              </div>
              <div>
                <label className="label" htmlFor="campaign-sms-provider">
                  SMS Provider Label
                </label>
                <input
                  className="input"
                  id="campaign-sms-provider"
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      smsProviderName: event.target.value
                    }))
                  }
                  placeholder="Optional provider name"
                  value={config.smsProviderName}
                />
              </div>
              <div>
                <label className="label" htmlFor="campaign-whatsapp-provider">
                  WhatsApp Provider Label
                </label>
                <input
                  className="input"
                  id="campaign-whatsapp-provider"
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      whatsappProviderName: event.target.value
                    }))
                  }
                  placeholder="Optional provider name"
                  value={config.whatsappProviderName}
                />
              </div>
              <div>
                <label className="label" htmlFor="campaign-delivery-notes">
                  Delivery Notes
                </label>
                <textarea
                  className="input min-h-24"
                  id="campaign-delivery-notes"
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      deliveryNotes: event.target.value
                    }))
                  }
                  placeholder="Internal notes for campaign delivery practices or provider setup."
                  value={config.deliveryNotes}
                />
              </div>
            </div>

            <button className="btn-primary mt-6 gap-2" disabled={configSaving} type="submit">
              <AppIcon className="h-4 w-4" name="check" />
              {configSaving ? 'Saving...' : 'Save Campaign Settings'}
            </button>
          </form>

          <DeliverabilityChecklist config={config} />
        </div>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Campaign History
            </p>
            <h2 className="mt-3 text-2xl font-bold">Recent launches</h2>
            <p className="mt-2 text-sm text-slate-500">
              Review sent counts, skipped opt-outs, and failed deliveries from previous campaigns.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className="btn-secondary gap-2 px-4 py-2"
              disabled={historyPage <= 1}
              onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
              type="button"
            >
              <AppIcon className="h-4 w-4" name="chevronLeft" />
              Previous
            </button>
            <button
              className="btn-secondary gap-2 px-4 py-2"
              disabled={historyPage >= historyTotalPages}
              onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))}
              type="button"
            >
              Next
              <AppIcon className="h-4 w-4" name="chevronRight" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {historyLoading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 xl:col-span-2">
              Loading campaign history...
            </div>
          ) : historyItems.length ? (
            historyItems.map((item) => (
              <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5" key={item._id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold">{item.name}</h3>
                    <p className="mt-2 text-sm text-slate-500">{item.subject}</p>
                  </div>
                  <span
                    className={`badge ${
                      item.status === 'sent'
                        ? 'bg-emerald-50 text-emerald-700'
                        : item.status === 'partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Audience
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{item.audienceCount || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Sent
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">{item.emailSentCount || 0}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Skipped / Failed
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {(item.skippedOptOutCount || 0) + (item.failedEmailCount || 0)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  <p>Launched {item.launchedAt ? formatDateTime(item.launchedAt) : 'Not launched yet'}</p>
                  <p className="mt-1">
                    By {item.createdBy?.name || item.createdBy?.username || 'Unknown admin'}
                  </p>
                  {item.notes ? <p className="mt-2">{item.notes}</p> : null}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500 xl:col-span-2">
              No audience campaigns have been sent yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
