import { useEffect, useMemo, useState } from 'react';

import {
  getContactForwardingSettings,
  getContactSubmissions,
  updateContactForwardingSettings
} from '../../api/contactApi.js';
import {
  downloadBackupNow as downloadBackupNowRequest,
  getBackupConfiguration,
  getEmailConfiguration,
  getHomeBannerConfiguration,
  getHomePageConfiguration,
  getInvoiceConfiguration,
  getPaymentConfiguration,
  getPublicSiteConfiguration,
  getTransactionOtpConfiguration,
  restoreBackupNow as restoreBackupNowRequest,
  sendBackupNow as sendBackupNowRequest,
  sendTestEmail as sendTestEmailRequest,
  updateBackupConfiguration,
  updateEmailConfiguration,
  updateHomeBannerConfiguration,
  updateHomePageConfiguration,
  updateInvoiceConfiguration,
  updatePaymentConfiguration,
  updatePublicSiteConfiguration,
  updateTransactionOtpConfiguration
} from '../../api/settingsApi.js';
import BackupSettingsPanel from '../../components/settings/BackupSettingsPanel.jsx';
import DataTable from '../../components/common/DataTable.jsx';
import FormAlert from '../../components/common/FormAlert.jsx';
import LoadingSpinner from '../../components/common/LoadingSpinner.jsx';
import EditableEmailList from '../../components/settings/EditableEmailList.jsx';
import GallerySettingsPanel from '../../components/settings/GallerySettingsPanel.jsx';
import HomeBannerSettingsPanel from '../../components/settings/HomeBannerSettingsPanel.jsx';
import HomePageContentSettingsPanel from '../../components/settings/HomePageContentSettingsPanel.jsx';
import InvoiceSettingsPanel from '../../components/settings/InvoiceSettingsPanel.jsx';
import AdminThemeSettingsPanel from '../../components/settings/AdminThemeSettingsPanel.jsx';
import AdminPageShell from '../../components/layout/AdminPageShell.jsx';
import TransactionOtpSettingsPanel from '../../components/settings/TransactionOtpSettingsPanel.jsx';
import WebsiteSettingsPanel from '../../components/settings/WebsiteSettingsPanel.jsx';
import useAdminTheme from '../../hooks/useAdminTheme.js';
import { getApiErrorMessage } from '../../utils/apiErrors.js';
import { formatDateTime } from '../../utils/formatters.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const statusTone = {
  sent: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-600',
  not_configured: 'bg-slate-100 text-slate-600'
};

const statusLabel = {
  sent: 'Forwarded',
  pending: 'Pending',
  failed: 'Failed',
  not_configured: 'Not Configured'
};

const getFileNameFromDisposition = (contentDisposition) => {
  const match = String(contentDisposition || '').match(/filename="?([^"]+)"?/i);
  return match?.[1] || `tricore-backup-${Date.now()}.json`;
};

export default function AdminSettingsPage() {
  const { theme: adminTheme, setTheme: setAdminTheme } = useAdminTheme();
  const [activeTab, setActiveTab] = useState('contact');
  const [settings, setSettings] = useState(null);
  const [recipientEmails, setRecipientEmails] = useState([]);
  const [registrationCompletedEmails, setRegistrationCompletedEmails] = useState([]);
  const [registrationFollowUpEmails, setRegistrationFollowUpEmails] = useState([]);
  const [submissionData, setSubmissionData] = useState({
    items: [],
    totalCount: 0,
    page: 1,
    limit: 10
  });
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsLimit, setSubmissionsLimit] = useState(10);
  const [emailConfig, setEmailConfig] = useState(null);
  const [invoiceConfig, setInvoiceConfig] = useState(null);
  const [smtpForm, setSmtpForm] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    smtpFromEmail: '',
    smtpFromName: 'TriCore Events'
  });
  const [notificationRecipientInput, setNotificationRecipientInput] = useState('');
  const [notificationRecipients, setNotificationRecipients] = useState([]);
  const [initializing, setInitializing] = useState(true);
  const [tabLoading, setTabLoading] = useState({});
  const [loadedTabs, setLoadedTabs] = useState({});
  const [settingsError, setSettingsError] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  const [savePending, setSavePending] = useState(false);
  const [smtpSavePending, setSmtpSavePending] = useState(false);
  const [smtpError, setSmtpError] = useState('');
  const [smtpMessage, setSmtpMessage] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testPending, setTestPending] = useState(false);
  const [testError, setTestError] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [bannerConfig, setBannerConfig] = useState(null);
  const [bannerSavePending, setBannerSavePending] = useState(false);
  const [bannerError, setBannerError] = useState('');
  const [bannerMessage, setBannerMessage] = useState('');
  const [homePageConfig, setHomePageConfig] = useState(null);
  const [publicSiteConfig, setPublicSiteConfig] = useState(null);
  const [homePageSavePending, setHomePageSavePending] = useState(false);
  const [homePageError, setHomePageError] = useState('');
  const [homePageMessage, setHomePageMessage] = useState('');
  const [websiteSavePending, setWebsiteSavePending] = useState(false);
  const [websiteError, setWebsiteError] = useState('');
  const [websiteMessage, setWebsiteMessage] = useState('');
  const [gallerySavePending, setGallerySavePending] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [galleryMessage, setGalleryMessage] = useState('');
  const [backupConfig, setBackupConfig] = useState(null);
  const [backupSavePending, setBackupSavePending] = useState(false);
  const [backupSendPending, setBackupSendPending] = useState(false);
  const [backupDownloadPending, setBackupDownloadPending] = useState(false);
  const [backupRestorePending, setBackupRestorePending] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [transactionOtpConfig, setTransactionOtpConfig] = useState(null);
  const [transactionOtpSavePending, setTransactionOtpSavePending] = useState(false);
  const [transactionOtpError, setTransactionOtpError] = useState('');
  const [transactionOtpMessage, setTransactionOtpMessage] = useState('');
  const [paymentConfig, setPaymentConfig] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    manualPaymentEnabled: false,
    upiId: '',
    payeeName: '',
    qrCodeDataUrl: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankName: '',
    bankBranch: '',
    bankInstructions: '',
    paymentProofRecipientEmail: ''
  });
  const [paymentSavePending, setPaymentSavePending] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentMessage, setPaymentMessage] = useState('');
  const [invoiceSavePending, setInvoiceSavePending] = useState(false);
  const [invoiceError, setInvoiceError] = useState('');
  const [invoiceMessage, setInvoiceMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const activeTabLoading = Boolean(tabLoading[activeTab]);
  const hasLoadedActiveTab = Boolean(loadedTabs[activeTab]);

  const setTabLoadingState = (tab, value) => {
    setTabLoading((current) => ({
      ...current,
      [tab]: value
    }));
  };

  const markTabLoaded = (tab) => {
    setLoadedTabs((current) => ({
      ...current,
      [tab]: true
    }));
  };

  const loadContactTab = async (
    nextSubmissionsPage = submissionsPage,
    nextSubmissionsLimit = submissionsLimit
  ) => {
    setTabLoadingState('contact', true);

    try {
      const [settingsResponse, submissionsResponse] = await Promise.all([
        getContactForwardingSettings(),
        getContactSubmissions({ page: nextSubmissionsPage, limit: nextSubmissionsLimit })
      ]);

      setSettings(settingsResponse);
      setRecipientEmails(settingsResponse.contactInquiryEmails || settingsResponse.emails || []);
      setRegistrationCompletedEmails(settingsResponse.registrationCompletedEmails || []);
      setRegistrationFollowUpEmails(settingsResponse.registrationFollowUpEmails || []);
      setSubmissionData(submissionsResponse);
      markTabLoaded('contact');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load contact forwarding settings.'));
    } finally {
      setTabLoadingState('contact', false);
      setInitializing(false);
    }
  };

  const loadEmailTab = async () => {
    setTabLoadingState('email', true);

    try {
      const emailResponse = await getEmailConfiguration();
      setEmailConfig(emailResponse);
      setNotificationRecipients(emailResponse.toRecipients || []);
      setSmtpForm({
        smtpHost: emailResponse.smtpHost || '',
        smtpPort: emailResponse.smtpPort || 587,
        smtpSecure: Boolean(emailResponse.smtpSecure),
        smtpUser: emailResponse.smtpUser || '',
        smtpPass: '',
        smtpFromEmail: emailResponse.smtpFromEmail || '',
        smtpFromName: emailResponse.smtpFromName || 'TriCore Events'
      });
      setTestTo(emailResponse.toRecipients?.[0] || emailResponse.smtpFromEmail || '');
      markTabLoaded('email');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load email settings.'));
    } finally {
      setTabLoadingState('email', false);
      setInitializing(false);
    }
  };

  const loadInvoiceTab = async () => {
    setTabLoadingState('invoice', true);

    try {
      const invoiceResponse = await getInvoiceConfiguration();
      setInvoiceConfig(invoiceResponse);
      markTabLoaded('invoice');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load invoice settings.'));
    } finally {
      setTabLoadingState('invoice', false);
      setInitializing(false);
    }
  };

  const loadBannersTab = async () => {
    setTabLoadingState('banners', true);

    try {
      const bannerResponse = await getHomeBannerConfiguration();
      setBannerConfig(bannerResponse);
      markTabLoaded('banners');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load homepage settings.'));
    } finally {
      setTabLoadingState('banners', false);
      setInitializing(false);
    }
  };

  const loadGalleryTab = async () => {
    setTabLoadingState('gallery', true);

    try {
      const homePageResponse = await getHomePageConfiguration();
      setHomePageConfig(homePageResponse);
      markTabLoaded('gallery');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load gallery settings.'));
    } finally {
      setTabLoadingState('gallery', false);
      setInitializing(false);
    }
  };

  const loadWebsiteTab = async () => {
    setTabLoadingState('website', true);

    try {
      const websiteResponse = await getPublicSiteConfiguration();
      setPublicSiteConfig(websiteResponse);
      markTabLoaded('website');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load website settings.'));
    } finally {
      setTabLoadingState('website', false);
      setInitializing(false);
    }
  };

  const loadBackupsTab = async () => {
    setTabLoadingState('backups', true);

    try {
      const backupResponse = await getBackupConfiguration();
      setBackupConfig(backupResponse);
      markTabLoaded('backups');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load backup settings.'));
    } finally {
      setTabLoadingState('backups', false);
      setInitializing(false);
    }
  };

  const loadSecurityTab = async () => {
    setTabLoadingState('security', true);

    try {
      const transactionOtpResponse = await getTransactionOtpConfiguration();
      setTransactionOtpConfig(transactionOtpResponse);
      markTabLoaded('security');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load security settings.'));
    } finally {
      setTabLoadingState('security', false);
      setInitializing(false);
    }
  };

  const loadPaymentsTab = async () => {
    setTabLoadingState('payments', true);

    try {
      const paymentResponse = await getPaymentConfiguration();
      setPaymentConfig(paymentResponse);
      setPaymentForm({
        manualPaymentEnabled: Boolean(paymentResponse.manualPaymentEnabled),
        upiId: paymentResponse.upiId || '',
        payeeName: paymentResponse.payeeName || '',
        qrCodeDataUrl: paymentResponse.qrCodeDataUrl || '',
        bankAccountName: paymentResponse.bankAccountName || '',
        bankAccountNumber: paymentResponse.bankAccountNumber || '',
        bankIfscCode: paymentResponse.bankIfscCode || '',
        bankName: paymentResponse.bankName || '',
        bankBranch: paymentResponse.bankBranch || '',
        bankInstructions: paymentResponse.bankInstructions || '',
        paymentProofRecipientEmail: paymentResponse.paymentProofRecipientEmail || ''
      });
      markTabLoaded('payments');
      setLoadError('');
    } catch (error) {
      setLoadError(getApiErrorMessage(error, 'Unable to load payment settings.'));
    } finally {
      setTabLoadingState('payments', false);
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'contact') {
      loadContactTab(submissionsPage, submissionsLimit);
      return;
    }

    if (!loadedTabs[activeTab]) {
      if (activeTab === 'email') {
        loadEmailTab();
      } else if (activeTab === 'invoice') {
        loadInvoiceTab();
      } else if (activeTab === 'banners') {
        loadBannersTab();
      } else if (activeTab === 'gallery') {
        loadGalleryTab();
      } else if (activeTab === 'website') {
        loadWebsiteTab();
      } else if (activeTab === 'backups') {
        loadBackupsTab();
      } else if (activeTab === 'security') {
        loadSecurityTab();
      } else if (activeTab === 'payments') {
        loadPaymentsTab();
      }
    }
  }, [activeTab, loadedTabs, submissionsLimit, submissionsPage]);

  const deliverySummary = useMemo(() => {
    const deliveredCount = submissionData.items.filter(
      (submission) => submission.forwardingStatus === 'sent'
    ).length;
    return {
      total: submissionData.items.length,
      delivered: deliveredCount,
      pending: submissionData.items.length - deliveredCount
    };
  }, [submissionData.items]);

  const contactSubmissionColumns = useMemo(
    () => [
      {
        key: 'contact',
        header: 'Contact',
        accessor: (submission) => `${submission.name} ${submission.email} ${submission.phone || ''}`,
        cell: (submission) => (
          <div>
            <p className="font-semibold text-slate-900">{submission.name}</p>
            <p className="text-slate-500">{submission.email}</p>
            {submission.phone ? <p className="text-slate-500">{submission.phone}</p> : null}
          </div>
        )
      },
      {
        key: 'message',
        header: 'Message',
        accessor: (submission) => submission.message,
        cell: (submission) => (
          <p className="max-w-md whitespace-pre-wrap break-words text-slate-600">
            {submission.message}
          </p>
        )
      },
      {
        key: 'delivery',
        header: 'Delivery',
        accessor: (submission) => submission.forwardingStatus,
        exportValue: (submission) =>
          `${statusLabel[submission.forwardingStatus] || submission.forwardingStatus || ''} ${
            submission.forwardedTo?.length ? `(${submission.forwardedTo.join(', ')})` : ''
          }`.trim(),
        cell: (submission) => (
          <div>
            <span className={`badge ${statusTone[submission.forwardingStatus] || statusTone.pending}`}>
              {statusLabel[submission.forwardingStatus] || submission.forwardingStatus}
            </span>
            <p className="mt-2 text-xs text-slate-500">
              {submission.forwardedTo?.length
                ? submission.forwardedTo.join(', ')
                : 'No recipients configured'}
            </p>
            {submission.forwardingError ? (
              <p className="mt-2 text-xs text-red-600">{submission.forwardingError}</p>
            ) : null}
          </div>
        )
      },
      {
        key: 'submitted',
        header: 'Submitted',
        accessor: (submission) => submission.createdAt,
        sortValue: (submission) => new Date(submission.createdAt).getTime(),
        exportValue: (submission) => formatDateTime(submission.createdAt),
        cell: (submission) => (
          <span className="text-slate-600">{formatDateTime(submission.createdAt)}</span>
        )
      }
    ],
    []
  );

  const sanitizeForwardingList = (emails, label) => {
    const normalized = emails
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean);

    if (normalized.some((email) => !emailPattern.test(email))) {
      throw new Error(`Enter valid email addresses in the ${label} list.`);
    }

    if (new Set(normalized).size !== normalized.length) {
      throw new Error(`Remove duplicate email addresses from the ${label} list.`);
    }

    return normalized;
  };

  const handleSaveSettings = async (event) => {
    event.preventDefault();
    setSavePending(true);
    setSettingsError('');
    setSettingsMessage('');

    try {
      const contactInquiryEmails = sanitizeForwardingList(recipientEmails, 'Contact Us');
      const completedRecipients = sanitizeForwardingList(
        registrationCompletedEmails,
        'Completed Registrations'
      );
      const followUpRecipients = sanitizeForwardingList(
        registrationFollowUpEmails,
        'Pending / Follow-up Registrations'
      );
      const response = await updateContactForwardingSettings({
        contactInquiryEmails,
        registrationCompletedEmails: completedRecipients,
        registrationFollowUpEmails: followUpRecipients
      });

      setSettings(response);
      setRecipientEmails(response.contactInquiryEmails || response.emails || []);
      setRegistrationCompletedEmails(response.registrationCompletedEmails || []);
      setRegistrationFollowUpEmails(response.registrationFollowUpEmails || []);
      setSettingsMessage(
        response.contactInquiryEmails.length ||
        response.registrationCompletedEmails.length ||
        response.registrationFollowUpEmails.length
          ? 'Forwarding recipients updated successfully.'
          : 'Forwarding recipients cleared. System notifications will stay in-app only until email lists are added again.'
      );
      await loadContactTab(submissionsPage, submissionsLimit);
    } catch (error) {
      setSettingsError(
        getApiErrorMessage(error, error?.message || 'Unable to save contact forwarding settings.')
      );
    } finally {
      setSavePending(false);
    }
  };

  const handleSmtpFieldChange = (event) => {
    const { checked, name, type, value } = event.target;

    setSmtpForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
    setSmtpError('');
    setSmtpMessage('');
  };

  const handleAddNotificationRecipient = () => {
    const normalized = notificationRecipientInput.trim().toLowerCase();

    if (!normalized) {
      setSmtpError('Enter an email address to add a notification recipient.');
      return;
    }

    if (!emailPattern.test(normalized)) {
      setSmtpError('Enter a valid email address.');
      return;
    }

    if (notificationRecipients.includes(normalized)) {
      setSmtpError('This recipient email has already been added.');
      return;
    }

    setNotificationRecipients((current) => [...current, normalized]);
    setNotificationRecipientInput('');
    setSmtpError('');
    setSmtpMessage('');
  };

  const handleRemoveNotificationRecipient = (email) => {
    setNotificationRecipients((current) => current.filter((recipient) => recipient !== email));
    setSmtpError('');
    setSmtpMessage('');
  };

  const handleSaveEmailConfiguration = async (event) => {
    event.preventDefault();
    setSmtpSavePending(true);
    setSmtpError('');
    setSmtpMessage('');
    setTestError('');
    setTestMessage('');

    const smtpHost = smtpForm.smtpHost.trim();
    const smtpFromEmail = smtpForm.smtpFromEmail.trim().toLowerCase();
    const smtpUser = smtpForm.smtpUser.trim();
    const smtpPass = String(smtpForm.smtpPass || '');
    const smtpPort = Number(smtpForm.smtpPort || 587);

    const hasExistingPass = Boolean(emailConfig?.hasSmtpPass);

    if (smtpHost) {
      if (!smtpFromEmail) {
        setSmtpError('From email address is required.');
        setSmtpSavePending(false);
        return;
      }

      if (!emailPattern.test(smtpFromEmail)) {
        setSmtpError('Enter a valid From email address.');
        setSmtpSavePending(false);
        return;
      }

      if (smtpUser && !smtpPass.trim() && !hasExistingPass) {
        setSmtpError('SMTP password is required when username is provided.');
        setSmtpSavePending(false);
        return;
      }

      if (!smtpUser && smtpPass.trim()) {
        setSmtpError('SMTP username is required when password is provided.');
        setSmtpSavePending(false);
        return;
      }
    }

    try {
      const payload = {
        smtpHost,
        smtpPort,
        smtpSecure: Boolean(smtpForm.smtpSecure),
        smtpUser,
        smtpFromEmail,
        smtpFromName: smtpForm.smtpFromName.trim(),
        toRecipients: notificationRecipients
      };

      if (smtpPass !== '') {
        payload.smtpPass = smtpPass;
      }

      const response = await updateEmailConfiguration(payload);
      setEmailConfig(response);
      setNotificationRecipients(response.toRecipients || []);
      setSmtpForm({
        smtpHost: response.smtpHost || '',
        smtpPort: response.smtpPort || 587,
        smtpSecure: Boolean(response.smtpSecure),
        smtpUser: response.smtpUser || '',
        smtpPass: '',
        smtpFromEmail: response.smtpFromEmail || '',
        smtpFromName: response.smtpFromName || 'TriCore Events'
      });
      setTestTo(response.toRecipients?.[0] || response.smtpFromEmail || '');
      setSmtpMessage('Email settings updated successfully.');
    } catch (error) {
      setSmtpError(getApiErrorMessage(error, 'Unable to save email settings.'));
    } finally {
      setSmtpSavePending(false);
    }
  };

  const handleSendTestEmail = async (event) => {
    event.preventDefault();
    const normalized = testTo.trim().toLowerCase();

    if (!normalized) {
      setTestError('Enter an email address to send the test message.');
      return;
    }

    if (!emailPattern.test(normalized)) {
      setTestError('Enter a valid email address.');
      return;
    }

    setTestPending(true);
    setTestError('');
    setTestMessage('');

    try {
      const response = await sendTestEmailRequest({ to: normalized });
      setTestMessage(response.message || `Test email sent to ${normalized}.`);
    } catch (error) {
      setTestError(getApiErrorMessage(error, 'Unable to send test email.'));
    } finally {
      setTestPending(false);
    }
  };

  const handlePaymentFieldChange = (event) => {
    const { checked, name, type, value } = event.target;

    setPaymentForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
    setPaymentError('');
    setPaymentMessage('');
  };

  const handleQrFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPaymentForm((current) => ({
        ...current,
        qrCodeDataUrl: String(reader.result || '')
      }));
      setPaymentError('');
      setPaymentMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleSavePaymentConfiguration = async (event) => {
    event.preventDefault();
    setPaymentSavePending(true);
    setPaymentError('');
    setPaymentMessage('');

    const payload = {
      manualPaymentEnabled: Boolean(paymentForm.manualPaymentEnabled),
      upiId: paymentForm.upiId.trim(),
      payeeName: paymentForm.payeeName.trim(),
      qrCodeDataUrl: paymentForm.qrCodeDataUrl.trim(),
      bankAccountName: paymentForm.bankAccountName.trim(),
      bankAccountNumber: paymentForm.bankAccountNumber.trim(),
      bankIfscCode: paymentForm.bankIfscCode.trim(),
      bankName: paymentForm.bankName.trim(),
      bankBranch: paymentForm.bankBranch.trim(),
      bankInstructions: paymentForm.bankInstructions.trim(),
      paymentProofRecipientEmail: paymentForm.paymentProofRecipientEmail.trim()
    };

    if (
      payload.manualPaymentEnabled &&
      !payload.qrCodeDataUrl &&
      !payload.upiId &&
      !payload.bankAccountNumber
    ) {
      setPaymentError('Configure at least one payment method: QR code, UPI, or bank details.');
      setPaymentSavePending(false);
      return;
    }

    if (payload.manualPaymentEnabled && !payload.paymentProofRecipientEmail) {
      setPaymentError('Payment proof recipient email is required when manual payments are enabled.');
      setPaymentSavePending(false);
      return;
    }

    try {
      const response = await updatePaymentConfiguration(payload);
      setPaymentConfig(response);
      setPaymentForm({
        manualPaymentEnabled: Boolean(response.manualPaymentEnabled),
        upiId: response.upiId || '',
        payeeName: response.payeeName || '',
        qrCodeDataUrl: response.qrCodeDataUrl || '',
        bankAccountName: response.bankAccountName || '',
        bankAccountNumber: response.bankAccountNumber || '',
        bankIfscCode: response.bankIfscCode || '',
        bankName: response.bankName || '',
        bankBranch: response.bankBranch || '',
        bankInstructions: response.bankInstructions || '',
        paymentProofRecipientEmail: response.paymentProofRecipientEmail || ''
      });
      setPaymentMessage('Payment settings updated successfully.');
    } catch (error) {
      setPaymentError(getApiErrorMessage(error, 'Unable to save payment settings.'));
    } finally {
      setPaymentSavePending(false);
    }
  };

  const handleSaveHomeBannerConfiguration = async (banners) => {
    setBannerSavePending(true);
    setBannerError('');
    setBannerMessage('');

    try {
      const response = await updateHomeBannerConfiguration({ banners });
      setBannerConfig(response);
      setBannerMessage('Homepage banners updated successfully.');
    } catch (error) {
      setBannerError(getApiErrorMessage(error, 'Unable to save homepage banners.'));
    } finally {
      setBannerSavePending(false);
    }
  };

  const handleSaveHomePageConfiguration = async (payload) => {
    setHomePageSavePending(true);
    setHomePageError('');
    setHomePageMessage('');

    try {
      // Merge partial edits with the full stored public-content document before saving.
      const response = await updateHomePageConfiguration({
        ...(homePageConfig || {}),
        ...payload
      });
      setHomePageConfig(response);
      setHomePageMessage('Homepage theme settings updated successfully.');
    } catch (error) {
      setHomePageError(getApiErrorMessage(error, 'Unable to save homepage theme.'));
    } finally {
      setHomePageSavePending(false);
    }
  };

  const handleSaveGalleryConfiguration = async (payload) => {
    setGallerySavePending(true);
    setGalleryError('');
    setGalleryMessage('');

    try {
      // Reuse the same content document for gallery settings, while preserving all other sections.
      const response = await updateHomePageConfiguration({
        ...(homePageConfig || {}),
        ...payload
      });
      setHomePageConfig(response);
      setGalleryMessage('Gallery settings updated successfully.');
    } catch (error) {
      setGalleryError(getApiErrorMessage(error, 'Unable to save gallery settings.'));
    } finally {
      setGallerySavePending(false);
    }
  };

  const handleSaveWebsiteConfiguration = async (payload) => {
    setWebsiteSavePending(true);
    setWebsiteError('');
    setWebsiteMessage('');

    try {
      const response = await updatePublicSiteConfiguration(payload);
      setPublicSiteConfig(response);
      setWebsiteMessage('Website link settings updated successfully.');
    } catch (error) {
      setWebsiteError(getApiErrorMessage(error, 'Unable to save website settings.'));
    } finally {
      setWebsiteSavePending(false);
    }
  };

  const handleSaveInvoiceConfiguration = async (payload) => {
    setInvoiceSavePending(true);
    setInvoiceError('');
    setInvoiceMessage('');

    try {
      const response = await updateInvoiceConfiguration(payload);
      setInvoiceConfig(response);
      setInvoiceMessage('Invoice settings updated successfully.');
    } catch (error) {
      setInvoiceError(getApiErrorMessage(error, 'Unable to save invoice settings.'));
    } finally {
      setInvoiceSavePending(false);
    }
  };

  const handleSaveBackupConfiguration = async (payload) => {
    setBackupSavePending(true);
    setBackupError('');
    setBackupMessage('');

    try {
      const response = await updateBackupConfiguration(payload);
      setBackupConfig(response);
      setBackupMessage('Backup settings updated successfully.');
    } catch (error) {
      setBackupError(getApiErrorMessage(error, 'Unable to save backup settings.'));
    } finally {
      setBackupSavePending(false);
    }
  };

  const handleSendBackupNow = async (email) => {
    setBackupSendPending(true);
    setBackupError('');
    setBackupMessage('');

    try {
      const response = await sendBackupNowRequest({ email });
      setBackupConfig(response.data);
      setBackupMessage(response.message || `Backup emailed to ${email}.`);
    } catch (error) {
      setBackupError(getApiErrorMessage(error, 'Unable to send the backup email.'));
    } finally {
      setBackupSendPending(false);
    }
  };

  const handleDownloadBackupNow = async () => {
    setBackupDownloadPending(true);
    setBackupError('');
    setBackupMessage('');

    try {
      const response = await downloadBackupNowRequest();
      const fileName = getFileNameFromDisposition(response.headers['content-disposition']);
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');

      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);

      const refreshedConfig = await getBackupConfiguration();
      setBackupConfig(refreshedConfig);
      setBackupMessage(`Backup downloaded as ${fileName}.`);
    } catch (error) {
      setBackupError(getApiErrorMessage(error, 'Unable to download the backup file.'));
    } finally {
      setBackupDownloadPending(false);
    }
  };

  const handleRestoreBackupNow = async (payload) => {
    setBackupRestorePending(true);
    setBackupError('');
    setBackupMessage('');

    try {
      const response = await restoreBackupNowRequest(payload);
      setBackupConfig(response.data);
      setBackupMessage(response.message || 'Backup restored successfully.');
    } catch (error) {
      setBackupError(getApiErrorMessage(error, 'Unable to restore the backup file.'));
    } finally {
      setBackupRestorePending(false);
    }
  };

  const handleSaveTransactionOtpConfiguration = async (payload) => {
    setTransactionOtpSavePending(true);
    setTransactionOtpError('');
    setTransactionOtpMessage('');

    try {
      const response = await updateTransactionOtpConfiguration(payload);
      setTransactionOtpConfig(response);
      setTransactionOtpMessage('Transaction OTP settings updated successfully.');
    } catch (error) {
      setTransactionOtpError(getApiErrorMessage(error, 'Unable to save transaction OTP settings.'));
    } finally {
      setTransactionOtpSavePending(false);
    }
  };

  if (initializing && !hasLoadedActiveTab) {
    return (
      <AdminPageShell
        description="Configure contact routing, invoices, public content, and other application settings."
        title="Settings"
      >
        <LoadingSpinner label="Loading settings..." />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      description="Configure contact routing, invoice defaults, public content, and other application settings."
      title="Settings"
    >
      <FormAlert message={loadError} />

      <div className="mb-8 flex flex-wrap gap-2 rounded-full bg-slate-100 p-2">
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'contact' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('contact')}
          type="button"
        >
          Contact Forwarding
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'email' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('email')}
          type="button"
        >
          Email (SMTP)
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'invoice' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('invoice')}
          type="button"
        >
          Invoice
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'appearance' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('appearance')}
          type="button"
        >
          Appearance
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'banners' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('banners')}
          type="button"
        >
          Home Page
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'gallery' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('gallery')}
          type="button"
        >
          Gallery
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'website' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('website')}
          type="button"
        >
          Website
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'backups' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('backups')}
          type="button"
        >
          Backups
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'security' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('security')}
          type="button"
        >
          Security
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'payments' ? 'bg-white text-slate-900 shadow-soft' : 'text-slate-600 hover:bg-white/70'
          }`}
          onClick={() => setActiveTab('payments')}
          type="button"
        >
          Payments
        </button>
      </div>

      {activeTab === 'contact' ? (
        activeTabLoading && !loadedTabs.contact ? (
          <LoadingSpinner compact label="Loading contact settings..." />
        ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Forwarding</p>
              <p className="mt-3 text-3xl font-bold">
                {settings?.forwardingEnabled ? 'Active' : 'Attention'}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {settings?.forwardingEnabled
                  ? 'Contact form emails are being forwarded immediately.'
                  : 'Forwarding needs SMTP setup and at least one recipient email.'}
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Contact Us</p>
              <p className="mt-3 text-3xl font-bold">{recipientEmails.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                Recipient inboxes for public contact submissions from the website.
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Completed</p>
              <p className="mt-3 text-3xl font-bold">{registrationCompletedEmails.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                Registration confirmation and completed-payment updates go here.
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Follow-up</p>
              <p className="mt-3 text-3xl font-bold">{registrationFollowUpEmails.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                Pending registrations and follow-up payment cases are sent here.
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Recent Delivery</p>
              <p className="mt-3 text-3xl font-bold">
                {deliverySummary.delivered}/{deliverySummary.total}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Recent enquiries successfully forwarded to the configured recipients.
              </p>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
            <form className="panel space-y-6 p-6" onSubmit={handleSaveSettings}>
              <div>
                <h2 className="text-2xl font-bold">Forwarding Recipient Groups</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Configure separate email groups for public enquiries, completed registrations,
                  and pending follow-up workflows.
                </p>
              </div>

              <EditableEmailList
                addLabel="Add Contact Email"
                description="Every Contact Us submission is forwarded to these inboxes."
                emails={recipientEmails}
                onChange={setRecipientEmails}
                title="Contact Us Recipients"
              />

              <EditableEmailList
                addLabel="Add Completed Email"
                description="Completed registration and payment-confirmed notifications are sent to this list."
                emails={registrationCompletedEmails}
                onChange={setRegistrationCompletedEmails}
                title="Completed Registration Recipients"
              />

              <EditableEmailList
                addLabel="Add Follow-up Email"
                description="Pending payments, under-review registrations, and follow-up cases are sent to this list."
                emails={registrationFollowUpEmails}
                onChange={setRegistrationFollowUpEmails}
                title="Pending / Follow-up Recipients"
              />

              <div className="space-y-4">
                <FormAlert message={settingsError} />
                <FormAlert message={settingsMessage} type="success" />

                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  <p>
                    SMTP status:{' '}
                    <span className="font-semibold text-slate-900">
                      {settings?.smtpReady ? 'Configured' : 'Not configured'}
                    </span>
                  </p>
                  <p className="mt-2">
                    Sender:{' '}
                    <span className="font-semibold text-slate-900">
                      {settings?.smtpFromEmail || 'Set SMTP_FROM_EMAIL in server/.env'}
                    </span>
                  </p>
                  <p className="mt-2">
                    Source:{' '}
                    <span className="font-semibold text-slate-900">
                      {settings?.usesEnvDefaults ? 'Env default recipients' : 'Saved admin settings'}
                    </span>
                  </p>
                </div>
              </div>

              <button className="btn-primary" disabled={savePending} type="submit">
                {savePending ? 'Saving...' : 'Save Contact Settings'}
              </button>
            </form>

            <section className="panel p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Recent Contact Enquiries</h2>
                  <p className="mt-3 text-sm text-slate-500">
                    Review recent reach-outs and confirm whether they were forwarded successfully.
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={() => loadContactTab(submissionsPage, submissionsLimit)}
                  type="button"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-6">
                <DataTable
                  columns={contactSubmissionColumns}
                  emptyMessage="No contact enquiries have been submitted yet."
                  exportFileName="contact-enquiries.csv"
                  loading={Boolean(tabLoading.contact)}
                  loadingLabel="Loading contact enquiries..."
                  rowKey="_id"
                  rows={submissionData.items}
                  searchPlaceholder="Search contact enquiries"
                  serverPagination={{
                    page: submissionData.page || submissionsPage,
                    pageSize: submissionData.limit || submissionsLimit,
                    totalCount: submissionData.totalCount || 0,
                    onPageChange: setSubmissionsPage,
                    onPageSizeChange: (nextLimit) => {
                      setSubmissionsLimit(nextLimit);
                      setSubmissionsPage(1);
                    }
                  }}
                />
              </div>
            </section>
          </div>
        </>
        )
      ) : null}

      {activeTab === 'email' ? (
        activeTabLoading && !loadedTabs.email ? (
          <LoadingSpinner compact label="Loading email settings..." />
        ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">SMTP</p>
              <p className="mt-3 text-3xl font-bold">{emailConfig?.smtpReady ? 'Ready' : 'Not Ready'}</p>
              <p className="mt-2 text-sm text-slate-500">
                {emailConfig?.smtpReady ? 'Outgoing mail is configured.' : 'Complete SMTP details to enable emails.'}
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">From</p>
              <p className="mt-3 text-xl font-bold text-slate-950">{emailConfig?.smtpFromEmail || '-'}</p>
              <p className="mt-2 text-sm text-slate-500">{emailConfig?.smtpFromName || 'TriCore Events'}</p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Recipients</p>
              <p className="mt-3 text-3xl font-bold">{notificationRecipients.length}</p>
              <p className="mt-2 text-sm text-slate-500">
                Admin notification inboxes for registrations, payments, and accounting.
              </p>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
            <form className="panel space-y-6 p-6" onSubmit={handleSaveEmailConfiguration}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Email Configuration</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Configure SMTP details. These settings are used to send registration, payment, and transaction emails.
                  </p>
                </div>
                <button className="btn-secondary" onClick={loadEmailTab} type="button">
                  Refresh
                </button>
              </div>

              <FormAlert message={smtpError} />
              <FormAlert message={smtpMessage} type="success" />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="label" htmlFor="smtpHost">
                    SMTP Host
                  </label>
                  <input
                    className="input"
                    id="smtpHost"
                    name="smtpHost"
                    onChange={handleSmtpFieldChange}
                    placeholder="smtp.gmail.com"
                    value={smtpForm.smtpHost}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="smtpPort">
                    SMTP Port
                  </label>
                  <input
                    className="input"
                    id="smtpPort"
                    name="smtpPort"
                    onChange={handleSmtpFieldChange}
                    type="number"
                    value={smtpForm.smtpPort}
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 md:col-span-2">
                  <input
                    checked={smtpForm.smtpSecure}
                    name="smtpSecure"
                    onChange={handleSmtpFieldChange}
                    type="checkbox"
                  />
                  Use secure connection (SSL/TLS)
                </label>

                <div>
                  <label className="label" htmlFor="smtpUser">
                    SMTP User (optional)
                  </label>
                  <input
                    className="input"
                    id="smtpUser"
                    name="smtpUser"
                    onChange={handleSmtpFieldChange}
                    placeholder="tricore.event@gmail.com"
                    value={smtpForm.smtpUser}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="smtpPass">
                    SMTP Password
                  </label>
                  <input
                    className="input"
                    id="smtpPass"
                    name="smtpPass"
                    onChange={handleSmtpFieldChange}
                    placeholder={emailConfig?.hasSmtpPass ? 'Leave blank to keep saved password' : 'App password / SMTP password'}
                    type="password"
                    value={smtpForm.smtpPass}
                  />
                  {emailConfig?.hasSmtpPass ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Password already saved. Leave this field empty to keep the existing password.
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="label" htmlFor="smtpFromEmail">
                    From Email
                  </label>
                  <input
                    className="input"
                    id="smtpFromEmail"
                    name="smtpFromEmail"
                    onChange={handleSmtpFieldChange}
                    placeholder="tricore.event@gmail.com"
                    type="email"
                    value={smtpForm.smtpFromEmail}
                  />
                </div>

                <div>
                  <label className="label" htmlFor="smtpFromName">
                    From Name
                  </label>
                  <input
                    className="input"
                    id="smtpFromName"
                    name="smtpFromName"
                    onChange={handleSmtpFieldChange}
                    placeholder="TriCore Events"
                    value={smtpForm.smtpFromName}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold">Admin Notification Recipients</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Registration and payment alerts are sent to these recipients.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    onChange={(event) => setNotificationRecipientInput(event.target.value)}
                    placeholder="admin@tricoreevents.online"
                    type="email"
                    value={notificationRecipientInput}
                  />
                  <button className="btn-secondary" onClick={handleAddNotificationRecipient} type="button">
                    Add Recipient
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {notificationRecipients.length ? (
                    notificationRecipients.map((email) => (
                      <div className="flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2" key={email}>
                        <span className="text-sm font-medium text-slate-700">{email}</span>
                        <button
                          className="text-sm font-semibold text-brand-orange"
                          onClick={() => handleRemoveNotificationRecipient(email)}
                          type="button"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                      No notification recipients are configured yet.
                    </p>
                  )}
                </div>
              </div>

              <button className="btn-primary" disabled={smtpSavePending} type="submit">
                {smtpSavePending ? 'Saving...' : 'Save Email Settings'}
              </button>
            </form>

            <section className="panel p-6">
              <div>
                <h2 className="text-2xl font-bold">Send Test Email</h2>
                <p className="mt-3 text-sm text-slate-500">
                  Send a sample email to verify SMTP configuration.
                </p>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSendTestEmail}>
                <FormAlert message={testError} />
                <FormAlert message={testMessage} type="success" />

                <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                  <input
                    className="input"
                    onChange={(event) => setTestTo(event.target.value)}
                    placeholder="your@email.com"
                    type="email"
                    value={testTo}
                  />
                  <button className="btn-primary" disabled={testPending} type="submit">
                    {testPending ? 'Sending...' : 'Send Test'}
                  </button>
                </div>

                <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-600">
                  Gmail tip: enable 2FA and use an App Password as `SMTP_PASS`.
                </p>
              </form>
            </section>
          </div>
        </>
        )
      ) : null}

      {activeTab === 'invoice' ? (
        activeTabLoading && !loadedTabs.invoice ? (
          <LoadingSpinner compact label="Loading invoice settings..." />
        ) : (
        <InvoiceSettingsPanel
          config={invoiceConfig}
          error={invoiceError}
          message={invoiceMessage}
          onRefresh={loadInvoiceTab}
          onSave={handleSaveInvoiceConfiguration}
          savePending={invoiceSavePending}
        />
        )
      ) : null}

      {activeTab === 'appearance' ? (
        <AdminThemeSettingsPanel
          onThemeChange={setAdminTheme}
          theme={adminTheme}
        />
      ) : null}

      {activeTab === 'banners' ? (
        activeTabLoading && !loadedTabs.banners ? (
          <LoadingSpinner compact label="Loading homepage settings..." />
        ) : (
        <>
          <HomeBannerSettingsPanel
            config={bannerConfig}
            error={bannerError}
            message={bannerMessage}
            onRefresh={loadBannersTab}
            onSave={handleSaveHomeBannerConfiguration}
            savePending={bannerSavePending}
          />
        </>
        )
      ) : null}

      {activeTab === 'gallery' ? (
        activeTabLoading && !loadedTabs.gallery ? (
          <LoadingSpinner compact label="Loading gallery settings..." />
        ) : (
        <>
          <HomePageContentSettingsPanel
            config={homePageConfig}
            error={homePageError}
            message={homePageMessage}
            onRefresh={loadGalleryTab}
            onSave={handleSaveHomePageConfiguration}
            savePending={homePageSavePending}
          />
          <GallerySettingsPanel
            config={homePageConfig}
            error={galleryError}
            message={galleryMessage}
            onRefresh={loadGalleryTab}
            onSave={handleSaveGalleryConfiguration}
            savePending={gallerySavePending}
          />
        </>
        )
      ) : null}

      {activeTab === 'website' ? (
        activeTabLoading && !loadedTabs.website ? (
          <LoadingSpinner compact label="Loading website settings..." />
        ) : (
        <WebsiteSettingsPanel
          config={publicSiteConfig}
          error={websiteError}
          message={websiteMessage}
          onRefresh={loadWebsiteTab}
          onSave={handleSaveWebsiteConfiguration}
          savePending={websiteSavePending}
        />
        )
      ) : null}

      {activeTab === 'backups' ? (
        activeTabLoading && !loadedTabs.backups ? (
          <LoadingSpinner compact label="Loading backup settings..." />
        ) : (
        <BackupSettingsPanel
          config={backupConfig}
          downloadPending={backupDownloadPending}
          error={backupError}
          message={backupMessage}
          onDownloadNow={handleDownloadBackupNow}
          onRefresh={loadBackupsTab}
          onRestoreNow={handleRestoreBackupNow}
          onSave={handleSaveBackupConfiguration}
          onSendNow={handleSendBackupNow}
          restorePending={backupRestorePending}
          savePending={backupSavePending}
          sendPending={backupSendPending}
        />
        )
      ) : null}

      {activeTab === 'security' ? (
        activeTabLoading && !loadedTabs.security ? (
          <LoadingSpinner compact label="Loading security settings..." />
        ) : (
        <TransactionOtpSettingsPanel
          config={transactionOtpConfig}
          error={transactionOtpError}
          message={transactionOtpMessage}
          onRefresh={loadSecurityTab}
          onSave={handleSaveTransactionOtpConfiguration}
          savePending={transactionOtpSavePending}
        />
        )
      ) : null}

      {activeTab === 'payments' ? (
        activeTabLoading && !loadedTabs.payments ? (
          <LoadingSpinner compact label="Loading payment settings..." />
        ) : (
        <>
          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Manual Payment</p>
              <p className="mt-3 text-3xl font-bold">{paymentForm.manualPaymentEnabled ? 'Enabled' : 'Disabled'}</p>
              <p className="mt-2 text-sm text-slate-500">
                Allow teams to submit offline payment proof for admin confirmation.
              </p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Bank / UPI</p>
              <p className="mt-3 text-xl font-bold text-slate-950">{paymentForm.upiId || paymentForm.bankAccountNumber || '-'}</p>
              <p className="mt-2 text-sm text-slate-500">{paymentForm.bankName || paymentForm.payeeName || 'No bank or UPI details set'}</p>
            </div>
            <div className="panel p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-orange">Proof Inbox</p>
              <p className="mt-3 text-xl font-bold text-slate-950">{paymentForm.paymentProofRecipientEmail || '-'}</p>
              <p className="mt-2 text-sm text-slate-500">Payment screenshots are emailed here for review.</p>
            </div>
          </div>

          <form className="panel space-y-6 p-6" onSubmit={handleSavePaymentConfiguration}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Payment Settings</h2>
                <p className="mt-2 text-sm text-slate-500">
                  Configure the organization payment methods shown to users after registration. Payment screenshots are routed to the proof inbox below.
                </p>
              </div>
              <button className="btn-secondary" onClick={loadPaymentsTab} type="button">
                Refresh
              </button>
            </div>

            <FormAlert message={paymentError} />
            <FormAlert message={paymentMessage} type="success" />

            <label className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                checked={paymentForm.manualPaymentEnabled}
                name="manualPaymentEnabled"
                onChange={handlePaymentFieldChange}
                type="checkbox"
              />
              Enable manual payment confirmation
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="label" htmlFor="upiId">
                  UPI ID (optional)
                </label>
                <input
                  className="input"
                  id="upiId"
                  name="upiId"
                  onChange={handlePaymentFieldChange}
                  placeholder="tricore.event@upi"
                  value={paymentForm.upiId}
                />
              </div>

              <div>
                <label className="label" htmlFor="payeeName">
                  Payee Name (optional)
                </label>
                <input
                  className="input"
                  id="payeeName"
                  name="payeeName"
                  onChange={handlePaymentFieldChange}
                  placeholder="TriCore Events"
                  value={paymentForm.payeeName}
                />
              </div>

              <div>
                <label className="label" htmlFor="paymentProofRecipientEmail">
                  Payment Proof Recipient Email
                </label>
                <input
                  className="input"
                  id="paymentProofRecipientEmail"
                  name="paymentProofRecipientEmail"
                  onChange={handlePaymentFieldChange}
                  placeholder="payments@tricoreevents.online"
                  type="email"
                  value={paymentForm.paymentProofRecipientEmail}
                />
              </div>

              <div>
                <label className="label" htmlFor="bankAccountName">
                  Bank Account Name
                </label>
                <input
                  className="input"
                  id="bankAccountName"
                  name="bankAccountName"
                  onChange={handlePaymentFieldChange}
                  placeholder="TriCore Events"
                  value={paymentForm.bankAccountName}
                />
              </div>

              <div>
                <label className="label" htmlFor="bankAccountNumber">
                  Bank Account Number
                </label>
                <input
                  className="input"
                  id="bankAccountNumber"
                  name="bankAccountNumber"
                  onChange={handlePaymentFieldChange}
                  placeholder="1234567890"
                  value={paymentForm.bankAccountNumber}
                />
              </div>

              <div>
                <label className="label" htmlFor="bankIfscCode">
                  IFSC Code
                </label>
                <input
                  className="input"
                  id="bankIfscCode"
                  name="bankIfscCode"
                  onChange={handlePaymentFieldChange}
                  placeholder="SBIN0001234"
                  value={paymentForm.bankIfscCode}
                />
              </div>

              <div>
                <label className="label" htmlFor="bankName">
                  Bank Name
                </label>
                <input
                  className="input"
                  id="bankName"
                  name="bankName"
                  onChange={handlePaymentFieldChange}
                  placeholder="State Bank of India"
                  value={paymentForm.bankName}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="bankBranch">
                  Branch
                </label>
                <input
                  className="input"
                  id="bankBranch"
                  name="bankBranch"
                  onChange={handlePaymentFieldChange}
                  placeholder="Main Branch"
                  value={paymentForm.bankBranch}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="bankInstructions">
                  Bank / Transfer Instructions
                </label>
                <textarea
                  className="input min-h-24"
                  id="bankInstructions"
                  name="bankInstructions"
                  onChange={handlePaymentFieldChange}
                  placeholder="Share bank transfer notes, required remarks, or payment steps."
                  value={paymentForm.bankInstructions}
                />
              </div>

              <div className="md:col-span-2">
                <label className="label" htmlFor="qrUpload">
                  QR Code Image
                </label>
                <input
                  className="input"
                  id="qrUpload"
                  onChange={handleQrFileChange}
                  type="file"
                  accept="image/*"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Uploaded QR images are stored on this server and reused in the public payment page.
                </p>
                {paymentForm.qrCodeDataUrl ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-700">Preview</p>
                    <img
                      alt="UPI QR code"
                      className="mt-3 max-h-72 w-full rounded-2xl object-contain"
                      src={paymentForm.qrCodeDataUrl}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <button className="btn-primary" disabled={paymentSavePending} type="submit">
              {paymentSavePending ? 'Saving...' : 'Save Payment Settings'}
            </button>
          </form>
        </>
        )
      ) : null}
    </AdminPageShell>
  );
}
