import { useEffect, useMemo, useState } from 'react';

import {
  createAudienceCampaign,
  createAudienceCampaignTemplate,
  deleteAudienceCampaignTemplate,
  exportAudienceCampaigns,
  getAudienceCampaignConfig,
  getAudienceCampaignDashboard,
  getAudienceCampaigns,
  getAudienceCampaignTemplates,
  getAudienceUnsubscribedUsers,
  getAudienceUsers,
  reviewAudienceCampaign,
  sendAudienceCampaignTest,
  updateAudienceCampaignConfig,
  updateAudienceCampaignTemplate
} from '../../api/audienceApi.js';
import { downloadBlob } from '../../utils/download.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDateTime } from '../../utils/formatters.js';
import AppIcon from '../common/AppIcon.jsx';
import FormAlert from '../common/FormAlert.jsx';
import StatCard from '../common/StatCard.jsx';
import TypeaheadSelect from '../common/TypeaheadSelect.jsx';

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

const paymentStatusOptions = [
  { value: 'all', label: 'All Payment States' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'failed', label: 'Failed' }
];

const engagementLevelOptions = [
  { value: 'all', label: 'All Engagement Levels' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const campaignTypeOptions = [
  { value: 'bulk_email', label: 'Bulk Email' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'workflow', label: 'Workflow Draft' }
];

const launchActionOptions = [
  { value: 'send_now', label: 'Send Now' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'submit_for_approval', label: 'Submit for Approval' },
  { value: 'save_draft', label: 'Save Draft' }
];

const fallbackOptions = [
  { value: 'none', label: 'No Fallback' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' }
];

const channelTemplateOptions = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'push', label: 'Push' }
];

const wizardSteps = [
  {
    key: 'audience',
    label: 'Audience',
    icon: 'users',
    description: 'Filter recipients by event activity, payment state, engagement, location, and tags.'
  },
  {
    key: 'content',
    label: 'Content',
    icon: 'mail',
    description: 'Pick a template, personalize message content, and enable extra channels.'
  },
  {
    key: 'delivery',
    label: 'Delivery',
    icon: 'clock',
    description: 'Choose immediate send, approval, or scheduled delivery with provider settings.'
  },
  {
    key: 'review',
    label: 'Review',
    icon: 'check',
    description: 'Run a test send, confirm audience size, and launch or save the campaign.'
  }
];

const createInitialFilters = () => ({
  search: '',
  segment: 'all',
  eventId: '',
  paymentStatus: 'all',
  location: '',
  tag: '',
  engagementLevel: 'all',
  sort: 'recent'
});

const createInitialCampaignForm = () => ({
  name: '',
  campaignType: 'bulk_email',
  subject: '',
  previewText: '',
  message: '',
  ctaLabel: 'View Events',
  ctaUrl: '/events',
  targetMode: 'filtered',
  selectedEmailsText: '',
  filters: createInitialFilters(),
  channels: {
    email: true,
    sms: false,
    whatsapp: false,
    push: false
  },
  launchAction: 'send_now',
  templateId: '',
  fallbackChannel: 'none',
  requiresApproval: false,
  scheduledAt: '',
  timezone: 'Asia/Calcutta',
  notes: ''
});

const createInitialTemplateForm = () => ({
  name: '',
  description: '',
  channel: 'email',
  subject: '',
  previewText: '',
  message: '',
  ctaLabel: 'View Events',
  ctaUrl: '/events',
  isActive: true
});

const createDefaultDashboard = () => ({
  metrics: {
    totalCampaigns: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalOpened: 0,
    totalClicked: 0,
    totalScheduled: 0,
    totalPendingApproval: 0,
    totalTemplates: 0,
    unsubscribedCount: 0,
    openRate: 0,
    clickRate: 0
  },
  statusChart: [],
  upcomingScheduled: [],
  deviceStats: [],
  browserStats: []
});

const createDefaultConfig = () => ({
  enableEmail: true,
  emailProvider: 'smtp',
  enableSms: false,
  smsProviderName: '',
  enableWhatsApp: false,
  whatsappProviderName: '',
  enablePush: false,
  pushProviderName: '',
  fallbackChannel: 'none',
  defaultReplyTo: '',
  deliveryNotes: '',
  requireApproval: false,
  sendThrottlePerMinute: 180,
  smsCostPerMessage: 0,
  whatsappCostPerMessage: 0,
  costCurrency: 'INR',
  smtpReady: false,
  smtpFromEmail: '',
  smtpFromName: ''
});

const normalizeStatusLabel = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const parseSelectedEmails = (value) =>
  [...new Set(String(value || '').split(/[\n,;]/).map((item) => item.trim()).filter(Boolean))];

const buildStatusBadgeClassName = (status) => {
  switch (status) {
    case 'sent':
      return 'bg-emerald-50 text-emerald-700';
    case 'scheduled':
      return 'bg-sky-50 text-sky-700';
    case 'pending_approval':
      return 'bg-amber-50 text-amber-700';
    case 'partial':
      return 'bg-orange-50 text-orange-700';
    case 'failed':
      return 'bg-rose-50 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

function ChannelToggle({ checked, description, disabled = false, icon, label, onChange }) {
  return (
    <label
      className={`flex items-start gap-3 rounded-3xl border px-4 py-4 ${
        checked ? 'border-brand-blue/25 bg-brand-mist' : 'border-slate-200 bg-white'
      } ${disabled ? 'opacity-70' : ''}`.trim()}
    >
      <input checked={checked} disabled={disabled} onChange={onChange} type="checkbox" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <AppIcon className="h-4 w-4 text-brand-blue" name={icon} />
          <p className="text-sm font-semibold text-slate-900">{label}</p>
        </div>
        <p className="mt-2 text-xs leading-6 text-slate-500">{description}</p>
      </div>
    </label>
  );
}

function WizardStepButton({ active, description, icon, label, onClick }) {
  return (
    <button
      className={`rounded-3xl border px-4 py-4 text-left transition ${
        active
          ? 'border-brand-blue bg-brand-mist text-brand-blue'
          : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/30 hover:bg-slate-50'
      }`.trim()}
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-2">
        <AppIcon className="h-4 w-4" name={icon} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-xs leading-6">{description}</p>
    </button>
  );
}

function MetricBarList({ emptyLabel = 'No metrics yet.', items, title }) {
  const maxValue = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</p>
      {items.length ? (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${title}-${item.label}`}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-semibold text-slate-900">{item.value}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-brand-blue"
                  style={{
                    width: `${Math.max(10, (Number(item.value || 0) / maxValue) * 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function DeliverabilityChecklist({ config }) {
  const checklist = [
    `SMTP status: ${config.smtpReady ? 'ready' : 'not configured'}`,
    `From address: ${config.smtpFromEmail || 'Not configured yet'}`,
    `Primary email provider: ${config.emailProvider || 'smtp'}`,
    'Use SPF, DKIM, and DMARC on the sending domain.',
    'Personalize content and keep one-click unsubscribe enabled.',
    `Throttle limit: ${config.sendThrottlePerMinute || 0} messages per minute.`,
    'Use reputable providers for optional SMS or WhatsApp delivery.'
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

function CampaignHistoryCard({ item, onReview }) {
  const pendingApproval = item.status === 'pending_approval';

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-slate-950">{item.name}</p>
            <span className={`badge ${buildStatusBadgeClassName(item.status)}`}>
              {normalizeStatusLabel(item.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">{item.subject}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right text-sm text-slate-500">
          <p>Audience {item.audienceCount || 0}</p>
          <p className="mt-1 font-semibold text-slate-900">
            {item.analytics?.openRate ? formatPercent(item.analytics.openRate) : '0.0%'} open
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Delivered</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{item.deliveredCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Opened</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{item.openCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Clicked</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{item.clickCount || 0}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Scheduled</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {item.scheduledAt ? formatDateTime(item.scheduledAt) : 'Not scheduled'}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
          Created {item.createdAt ? formatDateTime(item.createdAt) : 'recently'}
        </p>
        {pendingApproval ? (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary gap-2 px-4 py-2" onClick={() => onReview(item, 'reject')} type="button">
              <AppIcon className="h-4 w-4" name="close" />
              Reject
            </button>
            <button className="btn-primary gap-2 px-4 py-2" onClick={() => onReview(item, 'approve')} type="button">
              <AppIcon className="h-4 w-4" name="check" />
              Approve
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CampaignManagementPanel() {
  const [campaignForm, setCampaignForm] = useState(createInitialCampaignForm);
  const [wizardStep, setWizardStep] = useState('audience');
  const [dashboard, setDashboard] = useState(createDefaultDashboard);
  const [config, setConfig] = useState(createDefaultConfig);
  const [templates, setTemplates] = useState([]);
  const [templateForm, setTemplateForm] = useState(createInitialTemplateForm);
  const [editingTemplateId, setEditingTemplateId] = useState('');
  const [preview, setPreview] = useState({
    totalCount: 0,
    summary: {
      totalAudience: 0,
      currentParticipants: 0,
      pastParticipants: 0,
      interestedContacts: 0,
      emailOptOutCount: 0,
      confirmedPayments: 0,
      highEngagementContacts: 0
    },
    eventOptions: [],
    filterOptions: {
      tags: [],
      locations: []
    }
  });
  const [previewLoading, setPreviewLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(8);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [unsubscribedItems, setUnsubscribedItems] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [launchingCampaign, setLaunchingCampaign] = useState(false);
  const [reviewLoadingId, setReviewLoadingId] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [configMessage, setConfigMessage] = useState('');
  const [configError, setConfigError] = useState('');
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignError, setCampaignError] = useState('');
  const [templateMessage, setTemplateMessage] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [historyError, setHistoryError] = useState('');

  const eventOptions = useMemo(
    () => [{ value: '', label: 'All Events' }, ...(preview.eventOptions || [])],
    [preview.eventOptions]
  );

  const locationOptions = useMemo(
    () => [
      { value: '', label: 'All Locations' },
      ...(preview.filterOptions?.locations || []).map((item) => ({
        value: item,
        label: item
      }))
    ],
    [preview.filterOptions?.locations]
  );

  const tagOptions = useMemo(
    () => [
      { value: '', label: 'All Tags' },
      ...(preview.filterOptions?.tags || []).map((item) => ({
        value: item,
        label: item
      }))
    ],
    [preview.filterOptions?.tags]
  );

  const templateOptions = useMemo(
    () => [
      { value: '', label: 'No Template' },
      ...templates.map((template) => ({
        value: template._id,
        label: `${template.name}${template.isActive ? '' : ' (Inactive)'}`
      }))
    ],
    [templates]
  );

  const selectedTemplate = useMemo(
    () => templates.find((item) => item._id === campaignForm.templateId) || null,
    [campaignForm.templateId, templates]
  );

  const selectedRecipients = useMemo(
    () => parseSelectedEmails(campaignForm.selectedEmailsText),
    [campaignForm.selectedEmailsText]
  );

  const refreshCampaignData = async () => {
    const [dashboardData, configData, templateData, unsubscribedData] = await Promise.all([
      getAudienceCampaignDashboard(),
      getAudienceCampaignConfig(),
      getAudienceCampaignTemplates(),
      getAudienceUnsubscribedUsers({ page: 1, limit: 6 })
    ]);

    setDashboard(dashboardData || createDefaultDashboard());
    setConfig(configData || createDefaultConfig());
    setTemplates(templateData || []);
    setUnsubscribedItems(unsubscribedData.items || []);
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setDashboardLoading(true);

      try {
        const [dashboardData, configData, templateData, unsubscribedData] = await Promise.all([
          getAudienceCampaignDashboard(),
          getAudienceCampaignConfig(),
          getAudienceCampaignTemplates(),
          getAudienceUnsubscribedUsers({ page: 1, limit: 6 })
        ]);

        if (cancelled) {
          return;
        }

        setDashboard(dashboardData || createDefaultDashboard());
        setConfig(configData || createDefaultConfig());
        setTemplates(templateData || []);
        setUnsubscribedItems(unsubscribedData.items || []);
        setConfigError('');
      } catch (error) {
        if (!cancelled) {
          setConfigError(getApiErrorMessage(error, 'Unable to load campaign workspace.'));
        }
      } finally {
        if (!cancelled) {
          setDashboardLoading(false);
        }
      }
    };

    void load();

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
          ...campaignForm.filters,
          page: 1,
          limit: 5
        });

        if (cancelled) {
          return;
        }

        setPreview({
          totalCount: response.totalCount || 0,
          summary: response.summary || {},
          eventOptions: response.filters?.eventOptions || [],
          filterOptions: response.filterOptions || response.filters || { tags: [], locations: [] }
        });
        setCampaignError('');
      } catch (error) {
        if (!cancelled) {
          setCampaignError(getApiErrorMessage(error, 'Unable to load campaign audience preview.'));
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [campaignForm.filters]);

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
        setHistoryError('');
      } catch (error) {
        if (!cancelled) {
          setHistoryError(getApiErrorMessage(error, 'Unable to load campaign archives.'));
        }
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [historyLimit, historyPage]);

  const handleFilterChange = (field, value) => {
    setCampaignForm((current) => ({
      ...current,
      filters: {
        ...current.filters,
        [field]: value
      }
    }));
  };

  const handleCampaignFieldChange = (field, value) => {
    setCampaignForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleChannelChange = (field, checked) => {
    setCampaignForm((current) => ({
      ...current,
      channels: {
        ...current.channels,
        [field]: checked
      }
    }));
  };

  const handleApplyTemplate = (templateId) => {
    const template = templates.find((item) => item._id === templateId);

    setCampaignForm((current) => ({
      ...current,
      templateId,
      subject: template?.subject || current.subject,
      previewText: template?.previewText || current.previewText,
      message: template?.message || current.message,
      ctaLabel: template?.ctaLabel || current.ctaLabel,
      ctaUrl: template?.ctaUrl || current.ctaUrl
    }));
  };

  const handleConfigSave = async (event) => {
    event.preventDefault();
    setConfigSaving(true);
    setConfigMessage('');
    setConfigError('');

    try {
      const response = await updateAudienceCampaignConfig(config);
      setConfig(response);
      setConfigMessage('Campaign delivery settings saved successfully.');
    } catch (error) {
      setConfigError(getApiErrorMessage(error, 'Unable to save campaign settings.'));
    } finally {
      setConfigSaving(false);
    }
  };

  const handleTemplateSave = async (event) => {
    event.preventDefault();
    setTemplateSaving(true);
    setTemplateMessage('');
    setTemplateError('');

    try {
      const saved = editingTemplateId
        ? await updateAudienceCampaignTemplate(editingTemplateId, templateForm)
        : await createAudienceCampaignTemplate(templateForm);

      setTemplateMessage(
        editingTemplateId
          ? `Updated template "${saved.name}" successfully.`
          : `Created template "${saved.name}" successfully.`
      );
      setTemplateForm(createInitialTemplateForm());
      setEditingTemplateId('');
      await refreshCampaignData();
    } catch (error) {
      setTemplateError(getApiErrorMessage(error, 'Unable to save campaign template.'));
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleTemplateDelete = async (templateId) => {
    setTemplateError('');
    setTemplateMessage('');

    try {
      await deleteAudienceCampaignTemplate(templateId);
      if (editingTemplateId === templateId) {
        setEditingTemplateId('');
        setTemplateForm(createInitialTemplateForm());
      }
      await refreshCampaignData();
      setTemplateMessage('Campaign template deleted successfully.');
    } catch (error) {
      setTemplateError(getApiErrorMessage(error, 'Unable to delete template.'));
    }
  };

  const handleExportCampaignArchive = async () => {
    try {
      const response = await exportAudienceCampaigns();
      downloadBlob(response.blob, response.filename);
    } catch (error) {
      setHistoryError(getApiErrorMessage(error, 'Unable to export campaign archives.'));
    }
  };

  const handleTestSend = async () => {
    setTestSending(true);
    setCampaignMessage('');
    setCampaignError('');

    try {
      await sendAudienceCampaignTest({
        ...campaignForm,
        selectedEmails: selectedRecipients,
        targetEmail: testEmail
      });
      setCampaignMessage(`Test email sent successfully to ${testEmail}.`);
    } catch (error) {
      setCampaignError(getApiErrorMessage(error, 'Unable to send test campaign email.'));
    } finally {
      setTestSending(false);
    }
  };

  const handleLaunchCampaign = async (event) => {
    event.preventDefault();
    setLaunchingCampaign(true);
    setCampaignError('');
    setCampaignMessage('');

    try {
      const result = await createAudienceCampaign({
        ...campaignForm,
        selectedEmails: selectedRecipients
      });
      const status = result.campaign?.status || 'draft';
      const successMessageMap = {
        sent: `Sent ${result.sentCount || 0} email(s) successfully.`,
        partial: `Sent ${result.sentCount || 0} email(s). ${result.failedCount || 0} email(s) failed.`,
        scheduled: 'Campaign scheduled successfully.',
        pending_approval: 'Campaign submitted for approval successfully.',
        draft: 'Campaign saved as a draft.'
      };

      setCampaignMessage(successMessageMap[status] || 'Campaign saved successfully.');
      setCampaignForm(createInitialCampaignForm());
      setWizardStep('audience');
      setHistoryPage(1);
      await refreshCampaignData();
    } catch (error) {
      setCampaignError(getApiErrorMessage(error, 'Unable to launch audience campaign.'));
    } finally {
      setLaunchingCampaign(false);
    }
  };

  const handleReviewAction = async (campaign, action) => {
    setReviewLoadingId(campaign._id);
    setHistoryError('');

    try {
      await reviewAudienceCampaign(campaign._id, {
        action,
        note:
          action === 'approve'
            ? 'Approved from admin campaign archive.'
            : 'Returned to draft from admin campaign archive.'
      });
      await refreshCampaignData();
      const refreshed = await getAudienceCampaigns({
        page: historyPage,
        limit: historyLimit
      });
      setHistoryItems(refreshed.items || []);
      setHistoryTotalPages(refreshed.totalPages || 1);
    } catch (error) {
      setHistoryError(getApiErrorMessage(error, 'Unable to review campaign.'));
    } finally {
      setReviewLoadingId('');
    }
  };

  const populateTemplateForm = (template) => {
    setEditingTemplateId(template._id);
    setTemplateForm({
      name: template.name || '',
      description: template.description || '',
      channel: template.channel || 'email',
      subject: template.subject || '',
      previewText: template.previewText || '',
      message: template.message || '',
      ctaLabel: template.ctaLabel || '',
      ctaUrl: template.ctaUrl || '',
      isActive: template.isActive !== false
    });
  };

  const previewSummary = preview.summary || {};
  const estimatedSmsCost = (preview.totalCount || 0) * Number(config.smsCostPerMessage || 0);
  const estimatedWhatsAppCost =
    (preview.totalCount || 0) * Number(config.whatsappCostPerMessage || 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" data-slot="top-metrics">
        <StatCard
          helper="All campaigns"
          icon="chart"
          subtitle="Total campaign records stored for delivery, approval, and archives."
          title="Campaigns Created"
          value={dashboardLoading ? 'Loading...' : dashboard.metrics.totalCampaigns || 0}
        />
        <StatCard
          helper="Delivered"
          icon="send"
          subtitle="Emails delivered across completed campaigns."
          title="Messages Delivered"
          tone="emerald"
          value={dashboardLoading ? 'Loading...' : dashboard.metrics.totalDelivered || 0}
        />
        <StatCard
          helper="Open rate"
          icon="mail"
          subtitle="Campaign email opens tracked through the built-in tracking pixel."
          title="Open Performance"
          tone="orange"
          value={dashboardLoading ? 'Loading...' : formatPercent(dashboard.metrics.openRate || 0)}
        />
        <StatCard
          helper="Approvals"
          icon="security"
          subtitle="Campaigns waiting for senior admin approval."
          title="Pending Approval"
          tone="slate"
          value={dashboardLoading ? 'Loading...' : dashboard.metrics.totalPendingApproval || 0}
        />
        <StatCard
          helper="Suppression"
          icon="mailOff"
          subtitle="Users who opted out and are automatically skipped."
          title="Unsubscribed Users"
          tone="rose"
          value={dashboardLoading ? 'Loading...' : dashboard.metrics.unsubscribedCount || 0}
        />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]" data-slot="builder-config">
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Campaign Builder
              </p>
              <h2 className="mt-3 text-2xl font-bold">Step-based audience campaign wizard</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
                Create targeted campaigns with reusable templates, approval-aware delivery, built-in personalization,
                test sends, and configurable optional channels for SMS, WhatsApp, and push.
              </p>
            </div>
            <button className="btn-secondary gap-2" onClick={handleExportCampaignArchive} type="button">
              <AppIcon className="h-4 w-4" name="export" />
              Export Archive
            </button>
          </div>

          <FormAlert message={campaignError} />
          <FormAlert message={campaignMessage} type="success" />

          <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {wizardSteps.map((step) => (
              <WizardStepButton
                active={wizardStep === step.key}
                description={step.description}
                icon={step.icon}
                key={step.key}
                label={step.label}
                onClick={() => setWizardStep(step.key)}
              />
            ))}
          </div>

          <form className="mt-6 space-y-6" onSubmit={handleLaunchCampaign}>
            {wizardStep === 'audience' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-4">
                  <div>
                    <label className="label" htmlFor="campaign-search">
                      Search Audience
                    </label>
                    <input
                      className="input"
                      id="campaign-search"
                      onChange={(event) => handleFilterChange('search', event.target.value)}
                      placeholder="Name, email, contact, event"
                      value={campaignForm.filters.search}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-segment">
                      Segment
                    </label>
                    <TypeaheadSelect
                      id="campaign-segment"
                      onChange={(event) => handleFilterChange('segment', event.target.value)}
                      options={segmentOptions}
                      placeholder="Select segment"
                      searchPlaceholder="Search segments"
                      value={campaignForm.filters.segment}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-event">
                      Event
                    </label>
                    <TypeaheadSelect
                      id="campaign-event"
                      onChange={(event) => handleFilterChange('eventId', event.target.value)}
                      options={eventOptions}
                      placeholder="Select event"
                      searchPlaceholder="Search events"
                      value={campaignForm.filters.eventId}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-payment-status">
                      Payment Status
                    </label>
                    <TypeaheadSelect
                      id="campaign-payment-status"
                      onChange={(event) => handleFilterChange('paymentStatus', event.target.value)}
                      options={paymentStatusOptions}
                      placeholder="Select payment state"
                      searchPlaceholder="Search payment states"
                      value={campaignForm.filters.paymentStatus}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-location">
                      Location
                    </label>
                    <TypeaheadSelect
                      id="campaign-location"
                      onChange={(event) => handleFilterChange('location', event.target.value)}
                      options={locationOptions}
                      placeholder="Select location"
                      searchPlaceholder="Search locations"
                      value={campaignForm.filters.location}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-tag">
                      Tag
                    </label>
                    <TypeaheadSelect
                      id="campaign-tag"
                      onChange={(event) => handleFilterChange('tag', event.target.value)}
                      options={tagOptions}
                      placeholder="Select tag"
                      searchPlaceholder="Search tags"
                      value={campaignForm.filters.tag}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-engagement">
                      Engagement
                    </label>
                    <TypeaheadSelect
                      id="campaign-engagement"
                      onChange={(event) => handleFilterChange('engagementLevel', event.target.value)}
                      options={engagementLevelOptions}
                      placeholder="Select engagement"
                      searchPlaceholder="Search engagement levels"
                      value={campaignForm.filters.engagementLevel}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-sort">
                      Sort
                    </label>
                    <TypeaheadSelect
                      id="campaign-sort"
                      onChange={(event) => handleFilterChange('sort', event.target.value)}
                      options={sortOptions}
                      placeholder="Select sort"
                      searchPlaceholder="Search sort order"
                      value={campaignForm.filters.sort}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    helper="Matched"
                    icon="users"
                    subtitle="Contacts matching the current audience rules."
                    title="Audience Preview"
                    value={previewLoading ? 'Loading...' : preview.totalCount || 0}
                  />
                  <StatCard
                    helper="Current"
                    icon="calendar"
                    subtitle="Participants currently in active events."
                    title="Current Participants"
                    tone="emerald"
                    value={previewLoading ? 'Loading...' : previewSummary.currentParticipants || 0}
                  />
                  <StatCard
                    helper="Confirmed"
                    icon="check"
                    subtitle="Contacts with confirmed payments in the current segment."
                    title="Confirmed Payments"
                    tone="orange"
                    value={previewLoading ? 'Loading...' : previewSummary.confirmedPayments || 0}
                  />
                  <StatCard
                    helper="High engagement"
                    icon="sparkle"
                    subtitle="Users with repeated activity across events or interests."
                    title="Highly Engaged"
                    tone="slate"
                    value={previewLoading ? 'Loading...' : previewSummary.highEngagementContacts || 0}
                  />
                </div>
              </>
            ) : null}

            {wizardStep === 'content' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="campaign-name">
                      Campaign Name
                    </label>
                    <input
                      className="input"
                      id="campaign-name"
                      onChange={(event) => handleCampaignFieldChange('name', event.target.value)}
                      placeholder="Example: April registration reminder"
                      value={campaignForm.name}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-type">
                      Campaign Type
                    </label>
                    <TypeaheadSelect
                      id="campaign-type"
                      onChange={(event) => handleCampaignFieldChange('campaignType', event.target.value)}
                      options={campaignTypeOptions}
                      placeholder="Select campaign type"
                      searchPlaceholder="Search campaign types"
                      value={campaignForm.campaignType}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-template">
                      Template
                    </label>
                    <TypeaheadSelect
                      id="campaign-template"
                      onChange={(event) => handleApplyTemplate(event.target.value)}
                      options={templateOptions}
                      placeholder="Choose template"
                      searchPlaceholder="Search templates"
                      value={campaignForm.templateId}
                    />
                  </div>
                </div>

                {selectedTemplate ? (
                  <div className="rounded-[2rem] border border-brand-blue/20 bg-brand-mist p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-brand-blue">{selectedTemplate.name}</p>
                        <p className="mt-2 text-sm text-slate-600">
                          {selectedTemplate.description || 'Reusable campaign template.'}
                        </p>
                      </div>
                      <span className="badge bg-white text-brand-blue">{selectedTemplate.channel}</span>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="campaign-subject">
                      Subject
                    </label>
                    <input
                      className="input"
                      id="campaign-subject"
                      onChange={(event) => handleCampaignFieldChange('subject', event.target.value)}
                      value={campaignForm.subject}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-preview-text">
                      Preview Text
                    </label>
                    <input
                      className="input"
                      id="campaign-preview-text"
                      onChange={(event) => handleCampaignFieldChange('previewText', event.target.value)}
                      value={campaignForm.previewText}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="label" htmlFor="campaign-message">
                      Message
                    </label>
                    <textarea
                      className="input min-h-48"
                      id="campaign-message"
                      onChange={(event) => handleCampaignFieldChange('message', event.target.value)}
                      placeholder="Use placeholders like {{firstName}}, {{primaryEventName}}, {{ctaUrl}}, or {{unsubscribeUrl}}."
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
                      onChange={(event) => handleCampaignFieldChange('ctaLabel', event.target.value)}
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
                      onChange={(event) => handleCampaignFieldChange('ctaUrl', event.target.value)}
                      value={campaignForm.ctaUrl}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChannelToggle
                    checked
                    description="Email remains the primary required channel and uses the built-in SMTP delivery flow."
                    disabled
                    icon="mail"
                    label="Email"
                    onChange={() => {}}
                  />
                  <ChannelToggle
                    checked={campaignForm.channels.sms}
                    description="Optional planning channel. Use provider settings to record the SMS route and message cost."
                    icon="bell"
                    label="SMS"
                    onChange={(event) => handleChannelChange('sms', event.target.checked)}
                  />
                  <ChannelToggle
                    checked={campaignForm.channels.whatsapp}
                    description="Optional WhatsApp Business channel configuration. Delivery provider wiring can be added later."
                    icon="send"
                    label="WhatsApp"
                    onChange={(event) => handleChannelChange('whatsapp', event.target.checked)}
                  />
                  <ChannelToggle
                    checked={campaignForm.channels.push}
                    description="Optional push notification planning channel for future web or mobile notification providers."
                    icon="sparkle"
                    label="Push"
                    onChange={(event) => handleChannelChange('push', event.target.checked)}
                  />
                </div>
              </>
            ) : null}
            {wizardStep === 'delivery' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-3">
                  <div>
                    <label className="label" htmlFor="campaign-launch-action">
                      Launch Mode
                    </label>
                    <TypeaheadSelect
                      id="campaign-launch-action"
                      onChange={(event) => handleCampaignFieldChange('launchAction', event.target.value)}
                      options={launchActionOptions}
                      placeholder="Select launch mode"
                      searchPlaceholder="Search launch modes"
                      value={campaignForm.launchAction}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-fallback">
                      Fallback Channel
                    </label>
                    <TypeaheadSelect
                      id="campaign-fallback"
                      onChange={(event) => handleCampaignFieldChange('fallbackChannel', event.target.value)}
                      options={fallbackOptions}
                      placeholder="Select fallback"
                      searchPlaceholder="Search fallback"
                      value={campaignForm.fallbackChannel}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="campaign-scheduled-at">
                      Scheduled Time
                    </label>
                    <input
                      className="input"
                      id="campaign-scheduled-at"
                      onChange={(event) => handleCampaignFieldChange('scheduledAt', event.target.value)}
                      type="datetime-local"
                      value={campaignForm.scheduledAt}
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="campaign-timezone">
                      Timezone
                    </label>
                    <input
                      className="input"
                      id="campaign-timezone"
                      onChange={(event) => handleCampaignFieldChange('timezone', event.target.value)}
                      value={campaignForm.timezone}
                    />
                  </div>
                  <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      checked={campaignForm.requiresApproval}
                      onChange={(event) => handleCampaignFieldChange('requiresApproval', event.target.checked)}
                      type="checkbox"
                    />
                    Require senior admin approval before send
                  </label>
                </div>

                <div>
                  <label className="label" htmlFor="campaign-notes">
                    Internal Notes
                  </label>
                  <textarea
                    className="input min-h-28"
                    id="campaign-notes"
                    onChange={(event) => handleCampaignFieldChange('notes', event.target.value)}
                    placeholder="Add delivery notes, provider info, or approval context."
                    value={campaignForm.notes}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Estimated Optional Channel Costs
                    </p>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-600">SMS estimate</span>
                        <span className="font-semibold text-slate-900">
                          {config.costCurrency} {estimatedSmsCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-600">WhatsApp estimate</span>
                        <span className="font-semibold text-slate-900">
                          {config.costCurrency} {estimatedWhatsAppCost.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-xs leading-6 text-slate-500">
                      These costs use the admin-configured per-message rates and help plan optional channels. Actual provider billing is not executed in-app yet.
                    </p>
                  </div>

                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Multi-Channel Notes
                    </p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <p>Email is the live delivery channel from our side using SMTP.</p>
                      <p>SMS, WhatsApp, and push are configurable planning channels using free-form provider details.</p>
                      <p>Fallback order is recorded on the campaign so future provider integrations can reuse the same admin workflow.</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
            {wizardStep === 'review' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <StatCard
                    helper="Matched"
                    icon="users"
                    subtitle="Audience size based on the current segment rules."
                    title="Recipients"
                    value={previewLoading ? 'Loading...' : preview.totalCount || 0}
                  />
                  <StatCard
                    helper="Templates"
                    icon="mail"
                    subtitle="Reusable campaign templates currently saved in the library."
                    title="Template Library"
                    tone="slate"
                    value={templates.length}
                  />
                  <StatCard
                    helper="Scheduled"
                    icon="clock"
                    subtitle="Campaigns already queued for a future send."
                    title="Scheduled Campaigns"
                    tone="orange"
                    value={dashboard.metrics.totalScheduled || 0}
                  />
                  <StatCard
                    helper="Pending"
                    icon="security"
                    subtitle="Campaigns waiting for approval before they can send."
                    title="Approval Queue"
                    tone="emerald"
                    value={dashboard.metrics.totalPendingApproval || 0}
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label" htmlFor="campaign-test-email">
                      Test Email
                    </label>
                    <input
                      className="input"
                      id="campaign-test-email"
                      onChange={(event) => setTestEmail(event.target.value)}
                      placeholder="team@tricoreevents.online"
                      value={testEmail}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      className="btn-secondary gap-2"
                      disabled={testSending || !testEmail}
                      onClick={handleTestSend}
                      type="button"
                    >
                      <AppIcon className="h-4 w-4" name="send" />
                      {testSending ? 'Sending Test...' : 'Send Test'}
                    </button>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Campaign Summary</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        This campaign will use the email channel with built-in unsubscribe and analytics. Optional channels are configuration-only until external providers are added.
                      </p>
                    </div>
                    <span className="badge bg-white text-brand-blue">
                      {normalizeStatusLabel(campaignForm.launchAction)}
                    </span>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Campaign</p>
                      <p className="mt-2 font-semibold text-slate-900">{campaignForm.name || 'Untitled campaign'}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Type</p>
                      <p className="mt-2 font-semibold text-slate-900">{normalizeStatusLabel(campaignForm.campaignType)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Recipients</p>
                      <p className="mt-2 font-semibold text-slate-900">{preview.totalCount || 0}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Template</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedTemplate?.name || 'Custom message'}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap gap-2">
                {wizardSteps.map((step, index) => (
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${
                      wizardStep === step.key
                        ? 'bg-brand-blue text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`.trim()}
                    key={step.key}
                    onClick={() => setWizardStep(step.key)}
                    type="button"
                  >
                    {index + 1}. {step.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-secondary gap-2"
                  onClick={() => {
                    setCampaignForm(createInitialCampaignForm());
                    setWizardStep('audience');
                    setCampaignError('');
                    setCampaignMessage('');
                  }}
                  type="button"
                >
                  <AppIcon className="h-4 w-4" name="refresh" />
                  Reset
                </button>
                <button className="btn-primary gap-2" disabled={launchingCampaign} type="submit">
                  <AppIcon className="h-4 w-4" name="send" />
                  {launchingCampaign ? 'Processing...' : 'Save Campaign'}
                </button>
              </div>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <form className="panel p-6" onSubmit={handleConfigSave}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                  Delivery Settings
                </p>
                <h3 className="mt-3 text-xl font-bold">Configurable communication channels</h3>
              </div>
              <span className={`badge ${config.smtpReady ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {config.smtpReady ? 'SMTP Ready' : 'SMTP Not Ready'}
              </span>
            </div>

            <FormAlert message={configError} />
            <FormAlert message={configMessage} type="success" />

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-700">
                  <input checked disabled type="checkbox" />
                  Email primary channel
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    checked={config.requireApproval}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        requireApproval: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  Approval required by default
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
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
                  Enable SMS planning channel
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
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
                  Enable WhatsApp planning channel
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700 md:col-span-2">
                  <input
                    checked={config.enablePush}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        enablePush: event.target.checked
                      }))
                    }
                    type="checkbox"
                  />
                  Enable push notification planning channel
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="email-provider">
                    Email Provider
                  </label>
                  <input
                    className="input"
                    id="email-provider"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        emailProvider: event.target.value
                      }))
                    }
                    value={config.emailProvider}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="default-reply-to">
                    Default Reply-To
                  </label>
                  <input
                    className="input"
                    id="default-reply-to"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        defaultReplyTo: event.target.value
                      }))
                    }
                    value={config.defaultReplyTo}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="sms-provider">
                    SMS Provider
                  </label>
                  <input
                    className="input"
                    id="sms-provider"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        smsProviderName: event.target.value
                      }))
                    }
                    placeholder="Example: Twilio trial"
                    value={config.smsProviderName}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="whatsapp-provider">
                    WhatsApp Provider
                  </label>
                  <input
                    className="input"
                    id="whatsapp-provider"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        whatsappProviderName: event.target.value
                      }))
                    }
                    placeholder="Example: Meta Cloud API"
                    value={config.whatsappProviderName}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="push-provider">
                    Push Provider
                  </label>
                  <input
                    className="input"
                    id="push-provider"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        pushProviderName: event.target.value
                      }))
                    }
                    placeholder="Example: Firebase"
                    value={config.pushProviderName}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="config-fallback">
                    Default Fallback
                  </label>
                  <TypeaheadSelect
                    id="config-fallback"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        fallbackChannel: event.target.value
                      }))
                    }
                    options={fallbackOptions}
                    placeholder="Select fallback"
                    searchPlaceholder="Search fallback channels"
                    value={config.fallbackChannel}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="config-throttle">
                    Send Throttle Per Minute
                  </label>
                  <input
                    className="input"
                    id="config-throttle"
                    min="0"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        sendThrottlePerMinute: event.target.value
                      }))
                    }
                    type="number"
                    value={config.sendThrottlePerMinute}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="config-currency">
                    Cost Currency
                  </label>
                  <input
                    className="input"
                    id="config-currency"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        costCurrency: event.target.value
                      }))
                    }
                    value={config.costCurrency}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="sms-cost">
                    SMS Cost Per Message
                  </label>
                  <input
                    className="input"
                    id="sms-cost"
                    min="0"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        smsCostPerMessage: event.target.value
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={config.smsCostPerMessage}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="whatsapp-cost">
                    WhatsApp Cost Per Message
                  </label>
                  <input
                    className="input"
                    id="whatsapp-cost"
                    min="0"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        whatsappCostPerMessage: event.target.value
                      }))
                    }
                    step="0.01"
                    type="number"
                    value={config.whatsappCostPerMessage}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="label" htmlFor="delivery-notes">
                    Delivery Notes
                  </label>
                  <textarea
                    className="input min-h-28"
                    id="delivery-notes"
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        deliveryNotes: event.target.value
                      }))
                    }
                    placeholder="Record SMTP guidance, SPF/DKIM/DMARC notes, SMS route details, or WhatsApp setup references."
                    value={config.deliveryNotes}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button className="btn-primary gap-2" disabled={configSaving} type="submit">
                <AppIcon className="h-4 w-4" name="check" />
                {configSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>

          <DeliverabilityChecklist config={config} />

          <div className="grid gap-4 md:grid-cols-2">
            <MetricBarList items={dashboard.statusChart || []} title="Campaign Status Mix" />
            <MetricBarList items={dashboard.deviceStats || []} title="Open Device Mix" />
          </div>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1fr_0.8fr]" data-slot="templates-suppression">
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
                Template Library
              </p>
              <h3 className="mt-3 text-2xl font-bold">Reusable content blocks</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                Store reusable email, SMS, WhatsApp, or push templates with placeholders so campaigns can be launched faster without reauthoring content.
              </p>
            </div>
            {editingTemplateId ? (
              <button
                className="btn-secondary gap-2"
                onClick={() => {
                  setEditingTemplateId('');
                  setTemplateForm(createInitialTemplateForm());
                }}
                type="button"
              >
                <AppIcon className="h-4 w-4" name="refresh" />
                New Template
              </button>
            ) : null}
          </div>

          <FormAlert message={templateError} />
          <FormAlert message={templateMessage} type="success" />

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="space-y-4 rounded-[2rem] border border-slate-200 bg-slate-50 p-5" onSubmit={handleTemplateSave}>
              <div>
                <label className="label" htmlFor="template-name">
                  Template Name
                </label>
                <input
                  className="input"
                  id="template-name"
                  onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))}
                  value={templateForm.name}
                />
              </div>
              <div>
                <label className="label" htmlFor="template-channel">
                  Channel
                </label>
                <TypeaheadSelect
                  id="template-channel"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      channel: event.target.value
                    }))
                  }
                  options={channelTemplateOptions}
                  placeholder="Select channel"
                  searchPlaceholder="Search channels"
                  value={templateForm.channel}
                />
              </div>
              <div>
                <label className="label" htmlFor="template-description">
                  Description
                </label>
                <textarea
                  className="input min-h-24"
                  id="template-description"
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  value={templateForm.description}
                />
              </div>
              <div>
                <label className="label" htmlFor="template-subject">
                  Subject
                </label>
                <input
                  className="input"
                  id="template-subject"
                  onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))}
                  value={templateForm.subject}
                />
              </div>
              <div>
                <label className="label" htmlFor="template-preview">
                  Preview Text
                </label>
                <input
                  className="input"
                  id="template-preview"
                  onChange={(event) => setTemplateForm((current) => ({ ...current, previewText: event.target.value }))}
                  value={templateForm.previewText}
                />
              </div>
              <div>
                <label className="label" htmlFor="template-message">
                  Message
                </label>
                <textarea
                  className="input min-h-36"
                  id="template-message"
                  onChange={(event) => setTemplateForm((current) => ({ ...current, message: event.target.value }))}
                  value={templateForm.message}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="template-cta-label">
                    CTA Label
                  </label>
                  <input
                    className="input"
                    id="template-cta-label"
                    onChange={(event) => setTemplateForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                    value={templateForm.ctaLabel}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="template-cta-url">
                    CTA URL
                  </label>
                  <input
                    className="input"
                    id="template-cta-url"
                    onChange={(event) => setTemplateForm((current) => ({ ...current, ctaUrl: event.target.value }))}
                    value={templateForm.ctaUrl}
                  />
                </div>
              </div>
              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                <input
                  checked={templateForm.isActive}
                  onChange={(event) =>
                    setTemplateForm((current) => ({
                      ...current,
                      isActive: event.target.checked
                    }))
                  }
                  type="checkbox"
                />
                Template active and available in the wizard
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button className="btn-primary gap-2" disabled={templateSaving} type="submit">
                  <AppIcon className="h-4 w-4" name="check" />
                  {templateSaving ? 'Saving...' : editingTemplateId ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>

            <div className="space-y-4">
              {templates.length ? (
                templates.map((template) => (
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-5" key={template._id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-slate-950">{template.name}</p>
                          <span className={`badge ${template.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {template.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="badge bg-brand-mist text-brand-blue">{template.channel}</span>
                        </div>
                        <p className="mt-2 text-sm leading-7 text-slate-500">{template.description || 'Reusable campaign template.'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button className="btn-secondary gap-2 px-4 py-2" onClick={() => populateTemplateForm(template)} type="button">
                          <AppIcon className="h-4 w-4" name="edit" />
                          Edit
                        </button>
                        <button className="btn-secondary gap-2 px-4 py-2 text-rose-600" onClick={() => handleTemplateDelete(template._id)} type="button">
                          <AppIcon className="h-4 w-4" name="trash" />
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Subject</p>
                        <p className="mt-2 text-sm text-slate-700">{template.subject || 'No subject configured'}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">CTA</p>
                        <p className="mt-2 text-sm text-slate-700">
                          {template.ctaLabel || 'No CTA label'} {template.ctaUrl ? `• ${template.ctaUrl}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                  No templates saved yet.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="panel p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
            Unsubscribe Archive
          </p>
          <h3 className="mt-3 text-2xl font-bold">Suppression and compliance view</h3>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            Anyone listed here will be automatically excluded from future campaign sends while still allowing operational event communications when needed.
          </p>

          <div className="mt-6 space-y-4">
            {unsubscribedItems.length ? (
              unsubscribedItems.map((item) => (
                <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-4" key={item._id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name || 'Unnamed contact'}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                    </div>
                    <span className="badge bg-rose-50 text-rose-700">Email opt-out</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(item.tags || []).map((tag) => (
                      <span className="badge bg-white text-slate-600" key={`${item._id}-${tag}`}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">
                    Opted out {item.emailOptOutAt ? formatDateTime(item.emailOptOutAt) : 'recently'}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                No unsubscribed users found.
              </div>
            )}
          </div>
        </section>
      </section>
      <section className="panel p-6" data-slot="archive">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">
              Campaign Archive
            </p>
            <h3 className="mt-3 text-2xl font-bold">Analytics, approvals, and scheduled sends</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              Review sent campaigns, monitor engagement, and approve pending campaigns without leaving the admin portal.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Page {historyPage} of {historyTotalPages}
          </div>
        </div>

        <FormAlert message={historyError} />

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <MetricBarList
            items={
              dashboard.upcomingScheduled?.map((item) => ({
                label: item.name,
                value: item.audienceCount || 0
              })) || []
            }
            title="Upcoming Scheduled Campaigns"
          />
          <MetricBarList items={dashboard.browserStats || []} title="Open Browser Mix" />
          <MetricBarList
            items={[
              { label: 'Open Rate', value: Number(dashboard.metrics.openRate || 0) },
              { label: 'Click Rate', value: Number(dashboard.metrics.clickRate || 0) }
            ]}
            title="Engagement Rates"
          />
        </div>

        <div className="mt-6 space-y-4">
          {historyLoading ? (
            <div className="rounded-[2rem] border border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              Loading campaign archive...
            </div>
          ) : historyItems.length ? (
            historyItems.map((item) => (
              <div className={reviewLoadingId === item._id ? 'opacity-70' : ''} key={item._id}>
                <CampaignHistoryCard item={item} onReview={handleReviewAction} />
              </div>
            ))
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
              No campaigns have been created yet.
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            className="btn-secondary gap-2"
            disabled={historyPage <= 1}
            onClick={() => setHistoryPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <AppIcon className="h-4 w-4" name="chevronLeft" />
            Previous
          </button>
          <button
            className="btn-secondary gap-2"
            disabled={historyPage >= historyTotalPages}
            onClick={() => setHistoryPage((current) => Math.min(historyTotalPages, current + 1))}
            type="button"
          >
            Next
            <AppIcon className="h-4 w-4" name="chevronRight" />
          </button>
        </div>
      </section>
    </div>
  );
}
