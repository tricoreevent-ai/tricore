import { SecurityAlert } from '../models/SecurityAlert.js';
import { sendEmail } from './emailService.js';
import { getEmailSettingsForSending } from './emailSettingsService.js';
import { recordActivity } from './activityLogService.js';

const requestBuckets = new Map();
const cleanupWindowMs = 15 * 60 * 1000;
const notificationCooldownMs = 15 * 60 * 1000;
const alertCategoryLabels = {
  security: 'Security',
  contact: 'Contact',
  registration: 'Registration',
  payment: 'Payment',
  system: 'System'
};

const suspiciousPathMatchers = [
  { pattern: /(^|\/)\.env/i, label: '.env probe' },
  { pattern: /(^|\/)\.git/i, label: '.git probe' },
  { pattern: /wp-admin|wp-login/i, label: 'WordPress probe' },
  { pattern: /phpmyadmin|mysqladmin/i, label: 'Database panel probe' },
  { pattern: /server-status|actuator|metrics/i, label: 'Server internals probe' },
  { pattern: /etc\/passwd|\/boaform|\/cgi-bin/i, label: 'Exploit scan probe' }
];

const trimWindow = (timestamps, windowMs, now) =>
  timestamps.filter((value) => now - value <= windowMs);

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const normalizePath = (path) => String(path || '').split('?')[0].trim() || '/';
const normalizeText = (value) => String(value || '').trim();
const normalizeAlertCategory = (value) =>
  Object.prototype.hasOwnProperty.call(alertCategoryLabels, value) ? value : 'security';
const formatMetadataLabel = (key) =>
  String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase())
    .trim();
const formatMetadataValue = (value) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ');
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value ?? '').trim();
};
const getAlertMetadataEntries = (alert) =>
  Object.entries(alert?.metadata || {})
    .map(([key, value]) => ({
      key,
      label: formatMetadataLabel(key),
      value: formatMetadataValue(value)
    }))
    .filter((entry) => entry.value);

export const buildPendingRegistrationPaymentAlertFingerprint = ({ userId, eventId }) =>
  `registration-pending:${normalizeText(userId)}:${normalizeText(eventId)}`;
export const buildManualPaymentReviewAlertFingerprint = ({ userId, eventId }) =>
  `payment-review:${normalizeText(userId)}:${normalizeText(eventId)}`;
export const buildFailedPaymentAlertFingerprint = ({ userId, eventId }) =>
  `payment-failed:${normalizeText(userId)}:${normalizeText(eventId)}`;
export const buildContactInquiryAlertFingerprint = ({ inquiryId }) =>
  `contact-inquiry:${normalizeText(inquiryId)}`;

const getBucket = (key) => {
  if (!requestBuckets.has(key)) {
    requestBuckets.set(key, []);
  }

  return requestBuckets.get(key);
};

const recordEventTimestamp = (key, windowMs, now) => {
  const nextBucket = trimWindow(getBucket(key), windowMs, now);
  nextBucket.push(now);
  requestBuckets.set(key, nextBucket);
  return nextBucket.length;
};

const cleanupBuckets = (now) => {
  for (const [key, values] of requestBuckets.entries()) {
    const nextValues = values.filter((value) => now - value <= cleanupWindowMs);

    if (!nextValues.length) {
      requestBuckets.delete(key);
      continue;
    }

    requestBuckets.set(key, nextValues);
  }
};

export const evaluateApiActivitySignals = (event, now = Date.now()) => {
  const ip = String(event.ip || 'unknown').trim() || 'unknown';
  const method = String(event.method || 'GET').toUpperCase();
  const path = normalizePath(event.path);
  const statusCode = Number(event.statusCode || 0);
  const durationMs = Number(event.durationMs || 0);
  const candidates = [];

  const burstCount = recordEventTimestamp(`burst:${ip}`, 60 * 1000, now);
  const errorCount =
    statusCode >= 400
      ? recordEventTimestamp(`error:${ip}:${path}`, 2 * 60 * 1000, now)
      : 0;
  const authFailureCount =
    path.includes('/api/auth/admin/login') && [401, 403].includes(statusCode)
      ? recordEventTimestamp(`auth-failure:${ip}`, 10 * 60 * 1000, now)
      : 0;
  const notFoundCount =
    statusCode === 404
      ? recordEventTimestamp(`not-found:${ip}`, 5 * 60 * 1000, now)
      : 0;

  if (burstCount >= 75) {
    candidates.push({
      fingerprint: `burst:${ip}`,
      type: 'request_burst',
      severity: burstCount >= 120 ? 'critical' : 'high',
      title: 'High API request burst detected',
      message: `${burstCount} API requests were received from ${ip} within the last minute.`,
      metadata: {
        burstCount,
        window: '60s'
      }
    });
  }

  if (errorCount >= 18) {
    candidates.push({
      fingerprint: `error:${ip}:${path}`,
      type: 'error_burst',
      severity: errorCount >= 30 ? 'critical' : 'high',
      title: 'Error-heavy API traffic detected',
      message: `${errorCount} failing requests hit ${path} from ${ip} within the last two minutes.`,
      metadata: {
        errorCount,
        window: '2m'
      }
    });
  }

  if (authFailureCount >= 6) {
    candidates.push({
      fingerprint: `auth-failure:${ip}`,
      type: 'auth_failures',
      severity: authFailureCount >= 12 ? 'critical' : 'high',
      title: 'Repeated admin login failures detected',
      message: `${authFailureCount} failed admin login attempts were received from ${ip} within ten minutes.`,
      metadata: {
        authFailureCount,
        window: '10m'
      }
    });
  }

  if (notFoundCount >= 20) {
    candidates.push({
      fingerprint: `not-found:${ip}`,
      type: 'not_found_scan',
      severity: notFoundCount >= 40 ? 'critical' : 'medium',
      title: 'Unusual 404 scan activity detected',
      message: `${notFoundCount} missing endpoints were requested from ${ip} within five minutes.`,
      metadata: {
        notFoundCount,
        window: '5m'
      }
    });
  }

  if (durationMs >= 6000) {
    candidates.push({
      fingerprint: `slow:${method}:${path}`,
      type: 'slow_api_call',
      severity: durationMs >= 12000 ? 'high' : 'medium',
      title: 'Slow API response detected',
      message: `${method} ${path} took ${Math.round(durationMs)} ms to respond.`,
      metadata: {
        durationMs
      }
    });
  }

  const suspiciousMatch = suspiciousPathMatchers.find(({ pattern }) => pattern.test(path));

  if (suspiciousMatch) {
    candidates.push({
      fingerprint: `probe:${ip}:${suspiciousMatch.label}`,
      type: 'suspicious_probe',
      severity: 'critical',
      title: 'Suspicious probe request detected',
      message: `${suspiciousMatch.label} was requested from ${ip} using ${method} ${path}.`,
      metadata: {
        probeLabel: suspiciousMatch.label
      }
    });
  }

  cleanupBuckets(now);

  return candidates.map((candidate) => ({
    ...candidate,
    category: 'security',
    method,
    path,
    ip,
    statusCode
  }));
};

const notifySecurityAlert = async (alert) => {
  try {
    const emailSettings = await getEmailSettingsForSending();
    const recipients = Array.isArray(emailSettings.toRecipients)
      ? emailSettings.toRecipients.filter(Boolean)
      : [];

    if (!recipients.length) {
      return false;
    }

    const metadataEntries = getAlertMetadataEntries(alert);

    await sendEmail({
      to: recipients,
      subject: `TriCore Events Admin Alert: ${alert.title}`,
      text: [
        alert.title,
        '',
        alert.message,
        '',
        `Category: ${alertCategoryLabels[alert.category] || alert.category}`,
        `Severity: ${alert.severity}`,
        `Path: ${alert.path || '-'}`,
        `Method: ${alert.method || '-'}`,
        `IP: ${alert.ip || '-'}`,
        `Status: ${alert.statusCode || '-'}`,
        `Count: ${alert.count}`,
        ...metadataEntries.map((entry) => `${entry.label}: ${entry.value}`)
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a;">
          <h2 style="margin: 0 0 16px;">${alert.title}</h2>
          <p style="margin: 0 0 16px;">${alert.message}</p>
          <table style="border-collapse: collapse;">
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Category</td><td>${escapeHtml(alertCategoryLabels[alert.category] || alert.category)}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Severity</td><td>${alert.severity}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Path</td><td>${alert.path || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Method</td><td>${alert.method || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">IP</td><td>${alert.ip || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">HTTP Status</td><td>${alert.statusCode || '-'}</td></tr>
            <tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">Occurrences</td><td>${alert.count}</td></tr>
            ${metadataEntries
              .map(
                (entry) =>
                  `<tr><td style="padding: 6px 12px 6px 0; font-weight: 700;">${escapeHtml(entry.label)}</td><td>${escapeHtml(entry.value)}</td></tr>`
              )
              .join('')}
          </table>
        </div>
      `
    });

    return true;
  } catch {
    return false;
  }
};

export const persistSecurityAlert = async (candidate) => {
  const now = new Date();
  const existing = await SecurityAlert.findOne({ fingerprint: candidate.fingerprint });
  const shouldNotify =
    !existing?.lastNotifiedAt ||
    now.getTime() - new Date(existing.lastNotifiedAt).getTime() >= notificationCooldownMs;

  const nextValues = {
    type: candidate.type,
    category: normalizeAlertCategory(candidate.category),
    severity: candidate.severity,
    title: candidate.title,
    message: candidate.message,
    method: candidate.method,
    path: candidate.path,
    ip: candidate.ip,
    statusCode: candidate.statusCode,
    metadata: candidate.metadata || {},
    subjectType: normalizeText(candidate.subjectType),
    subjectId: normalizeText(candidate.subjectId),
    lastSeenAt: now,
    status: 'open',
    acknowledgedAt: null,
    acknowledgedBy: null,
    ...(existing
      ? { count: Number(existing.count || 0) + 1 }
      : {
          count: 1,
          firstSeenAt: now
        })
  };

  const alert = await SecurityAlert.findOneAndUpdate(
    { fingerprint: candidate.fingerprint },
    {
      $set: nextValues
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  if (shouldNotify && candidate.notifyByEmail !== false) {
    const notified = await notifySecurityAlert(alert);

    if (notified) {
      alert.lastNotifiedAt = now;
      await alert.save();
    }
  }

  if (!existing) {
    await recordActivity({
      action: 'create',
      category: alert.category === 'security' ? 'security_alert' : 'admin_alert',
      details: alert.message,
      summary: `Alert created: ${alert.title}.`,
      subjectId: alert._id.toString(),
      subjectType: 'security_alert'
    });
  }

  return alert;
};

export const emitAdminAlert = async (candidate) => {
  try {
    return await persistSecurityAlert(candidate);
  } catch (error) {
    console.warn('Alert warning:', error.message);
    return null;
  }
};

export const observeApiRequest = async (event) => {
  const candidates = evaluateApiActivitySignals(event);

  for (const candidate of candidates) {
    await emitAdminAlert(candidate);
  }
};

export const getSecurityAlerts = async ({
  limit = 10,
  page = 1,
  status = '',
  severity = '',
  category = ''
} = {}) => {
  const filters = {};

  if (status) {
    filters.status = status;
  }

  if (severity) {
    filters.severity = severity;
  }

  if (category) {
    const normalizedCategory = normalizeAlertCategory(category);
    filters.category =
      normalizedCategory === 'security'
        ? { $in: ['security', null] }
        : normalizedCategory;
  }

  const normalizedLimit = Math.max(1, Math.min(100, Number(limit) || 10));
  const normalizedPage = Math.max(1, Number(page) || 1);
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [totalCount, items, openCount] = await Promise.all([
    SecurityAlert.countDocuments(filters),
    SecurityAlert.find(filters)
      .populate('acknowledgedBy', 'name username email')
      .sort({ status: 1, lastSeenAt: -1 })
      .skip(skip)
      .limit(normalizedLimit),
    SecurityAlert.countDocuments({ status: 'open' })
  ]);

  return {
    items,
    totalCount,
    page: normalizedPage,
    limit: normalizedLimit,
    openCount
  };
};

export const acknowledgeSecurityAlertByFingerprint = async ({ fingerprint, userId = null }) => {
  const normalizedFingerprint = normalizeText(fingerprint);

  if (!normalizedFingerprint) {
    return null;
  }

  return SecurityAlert.findOneAndUpdate(
    { fingerprint: normalizedFingerprint, status: 'open' },
    {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId || null
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('acknowledgedBy', 'name username email');
};

export const acknowledgeSecurityAlert = async ({ alertId, userId }) => {
  const alert = await SecurityAlert.findByIdAndUpdate(
    alertId,
    {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId
      }
    },
    {
      new: true,
      runValidators: true
    }
  ).populate('acknowledgedBy', 'name username email');

  return alert;
};
