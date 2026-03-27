import { AudiencePreference } from '../models/AudiencePreference.js';
import { EventInterest } from '../models/EventInterest.js';
import { Registration } from '../models/Registration.js';
import { User } from '../models/User.js';
import { normalizePaymentStatus } from './paymentStatusService.js';

const normalizeText = (value) => String(value || '').trim();
const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const toTimestamp = (value) => {
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const uniqueBy = (items = [], getKey = (item) => item) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = normalizeText(getKey(item));

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const sortEventsByDateDesc = (items = []) =>
  [...items].sort((left, right) => toTimestamp(right.endDate || right.startDate) - toTimestamp(left.endDate || left.startDate));

const buildEventSummary = ({ event, record, source }) => ({
  eventId: event?._id ? String(event._id) : '',
  eventName: normalizeText(event?.name),
  sportType: normalizeText(event?.sportType),
  venue: normalizeText(event?.venue),
  startDate: event?.startDate || null,
  endDate: event?.endDate || null,
  status: normalizeText(record?.status),
  source,
  teamName: normalizeText(record?.teamName || record?.name),
  interestRegisteredAt: record?.createdAt || null,
  confirmedAt: record?.confirmedAt || null
});

const buildAudienceKey = (email) => normalizeEmail(email);

const buildSearchText = (record) =>
  [
    record.name,
    record.email,
    record.contactNumber,
    record.location,
    record.engagementLevel,
    ...(record.tags || []),
    ...(record.paymentStatuses || []),
    ...record.currentEvents.map((item) => item.eventName),
    ...record.previousEvents.map((item) => item.eventName),
    ...record.interestedEvents.map((item) => item.eventName)
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(' ');

const recordMatchesSegment = (record, segment) => {
  switch (segment) {
    case 'registered':
      return record.currentEvents.length > 0 || record.previousEvents.length > 0;
    case 'current':
      return record.currentEvents.length > 0;
    case 'previous':
      return record.previousEvents.length > 0;
    case 'interested':
      return record.interestedEvents.length > 0;
    default:
      return true;
  }
};

const recordMatchesEvent = (record, eventId) => {
  if (!eventId) {
    return true;
  }

  return [...record.currentEvents, ...record.previousEvents, ...record.interestedEvents].some(
    (item) => String(item.eventId || '') === String(eventId)
  );
};

const recordMatchesPaymentStatus = (record, paymentStatus) => {
  if (!paymentStatus || paymentStatus === 'all') {
    return true;
  }

  return (record.paymentStatuses || []).some(
    (item) => String(item || '').trim().toLowerCase().replace(/\s+/g, '_') === paymentStatus
  );
};

const recordMatchesLocation = (record, location = '') => {
  const normalizedLocation = normalizeText(location).toLowerCase();

  if (!normalizedLocation) {
    return true;
  }

  return normalizeText(record.location).toLowerCase().includes(normalizedLocation);
};

const recordMatchesTag = (record, tag = '') => {
  const normalizedTag = normalizeText(tag).toLowerCase();

  if (!normalizedTag) {
    return true;
  }

  return (record.tags || []).some((item) => normalizeText(item).toLowerCase() === normalizedTag);
};

const recordMatchesEngagementLevel = (record, engagementLevel = 'all') => {
  if (!engagementLevel || engagementLevel === 'all') {
    return true;
  }

  return normalizeText(record.engagementLevel).toLowerCase() === normalizeText(engagementLevel).toLowerCase();
};

const applyAudienceFilters = (
  records = [],
  {
    eventId = '',
    search = '',
    segment = 'all',
    paymentStatus = 'all',
    location = '',
    tag = '',
    engagementLevel = 'all'
  } = {}
) => {
  const normalizedSearch = normalizeText(search).toLowerCase();

  return records.filter((record) => {
    if (!recordMatchesSegment(record, segment)) {
      return false;
    }

    if (!recordMatchesEvent(record, eventId)) {
      return false;
    }

    if (!recordMatchesPaymentStatus(record, paymentStatus)) {
      return false;
    }

    if (!recordMatchesLocation(record, location)) {
      return false;
    }

    if (!recordMatchesTag(record, tag)) {
      return false;
    }

    if (!recordMatchesEngagementLevel(record, engagementLevel)) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    return buildSearchText(record).includes(normalizedSearch);
  });
};

const sortAudienceRecords = (records = [], sort = 'recent') => {
  if (sort === 'name') {
    return [...records].sort((left, right) =>
      normalizeText(left.name || left.email).localeCompare(normalizeText(right.name || right.email), 'en', {
        sensitivity: 'base',
        numeric: true
      })
    );
  }

  return [...records].sort((left, right) => {
    const rightTimestamp = toTimestamp(right.lastEngagementAt || right.lastLoginAt || right.updatedAt);
    const leftTimestamp = toTimestamp(left.lastEngagementAt || left.lastLoginAt || left.updatedAt);

    if (rightTimestamp !== leftTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    return normalizeText(left.name || left.email).localeCompare(normalizeText(right.name || right.email), 'en', {
      sensitivity: 'base',
      numeric: true
    });
  });
};

const buildSummary = (records = []) => ({
  totalAudience: records.length,
  currentParticipants: records.filter((record) => record.currentEvents.length > 0).length,
  pastParticipants: records.filter((record) => record.previousEvents.length > 0).length,
  interestedContacts: records.filter((record) => record.interestedEvents.length > 0).length,
  emailOptOutCount: records.filter((record) => record.preferences?.emailOptOut).length,
  confirmedPayments: records.filter((record) => record.paymentStatuses.includes('Confirmed')).length,
  highEngagementContacts: records.filter((record) => record.engagementLevel === 'high').length
});

const serializeAudienceRecord = (record) => ({
  audienceKey: record.audienceKey,
  userId: record.userId || '',
  name: record.name || record.email || 'Unnamed contact',
  email: record.email,
  contactNumber: record.contactNumber,
  avatar: record.avatar,
  authProvider: record.authProvider,
  location: record.location || '',
  paymentStatuses: [...new Set(record.paymentStatuses || [])],
  registrationStatuses: [...new Set(record.registrationStatuses || [])],
  tags: [...new Set(record.tags || [])],
  engagementLevel: record.engagementLevel || 'low',
  lastLoginAt: record.lastLoginAt || null,
  lastEngagementAt: record.lastEngagementAt || null,
  currentEvents: sortEventsByDateDesc(uniqueBy(record.currentEvents, (item) => item.eventId || item.eventName)),
  previousEvents: sortEventsByDateDesc(uniqueBy(record.previousEvents, (item) => item.eventId || item.eventName)),
  interestedEvents: sortEventsByDateDesc(uniqueBy(record.interestedEvents, (item) => item.eventId || item.eventName)),
  preferences: {
    emailOptOut: Boolean(record.preferences?.emailOptOut),
    smsOptOut: Boolean(record.preferences?.smsOptOut),
    whatsappOptOut: Boolean(record.preferences?.whatsappOptOut),
    emailOptOutAt: record.preferences?.emailOptOutAt || null,
    lastCampaignAt: record.preferences?.lastCampaignAt || null,
    tags: [...new Set(record.preferences?.tags || [])]
  }
});

const deriveEngagementLevel = (record) => {
  const totalTouchpoints =
    (record.currentEvents?.length || 0) +
    (record.previousEvents?.length || 0) +
    (record.interestedEvents?.length || 0);

  if (totalTouchpoints >= 4) {
    return 'high';
  }

  if (totalTouchpoints >= 2) {
    return 'medium';
  }

  return 'low';
};

const buildFilterOptions = (records = []) => ({
  tags: [...new Set(records.flatMap((record) => record.tags || []))].sort((left, right) =>
    normalizeText(left).localeCompare(normalizeText(right), 'en', {
      sensitivity: 'base',
      numeric: true
    })
  ),
  locations: [...new Set(records.map((record) => normalizeText(record.location)).filter(Boolean))].sort(
    (left, right) =>
      normalizeText(left).localeCompare(normalizeText(right), 'en', {
        sensitivity: 'base',
        numeric: true
      })
  )
});

const buildAudienceRecords = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [registrations, interests] = await Promise.all([
    Registration.find({})
      .populate('eventId', 'name sportType venue startDate endDate')
      .populate('paymentId', 'status')
      .sort({ createdAt: -1 }),
    EventInterest.find({})
      .populate('eventId', 'name sportType venue startDate endDate')
      .sort({ createdAt: -1 })
  ]);

  const emailSet = new Set();
  const userIdSet = new Set();

  registrations.forEach((registration) => {
    const email = normalizeEmail(registration.email);
    if (email) {
      emailSet.add(email);
    }
    if (registration.userId) {
      userIdSet.add(String(registration.userId));
    }
  });

  interests.forEach((interest) => {
    const email = normalizeEmail(interest.email);
    if (email) {
      emailSet.add(email);
    }
    if (interest.userId) {
      userIdSet.add(String(interest.userId));
    }
  });

  const [users, preferences] = await Promise.all([
    User.find({
      $or: [{ role: 'user' }, { _id: { $in: [...userIdSet] } }, { email: { $in: [...emailSet] } }]
    }).select('name email avatar authProvider lastLoginAt'),
    AudiencePreference.find({})
  ]);

  const usersByEmail = new Map(users.map((user) => [normalizeEmail(user.email), user]));
  const preferencesByEmail = new Map(
    preferences.map((preference) => [normalizeEmail(preference.email), preference])
  );
  const recordsByEmail = new Map();

  const ensureRecord = (email) => {
    const audienceKey = buildAudienceKey(email);

    if (!recordsByEmail.has(audienceKey)) {
      recordsByEmail.set(audienceKey, {
        audienceKey,
        userId: '',
        name: '',
        email: audienceKey,
        contactNumber: '',
        avatar: '',
        authProvider: '',
        location: '',
        paymentStatuses: [],
        registrationStatuses: [],
        tags: preferencesByEmail.get(audienceKey)?.tags || [],
        engagementLevel: 'low',
        lastLoginAt: null,
        lastEngagementAt: null,
        currentEvents: [],
        previousEvents: [],
        interestedEvents: [],
        preferences: preferencesByEmail.get(audienceKey) || null
      });
    }

    return recordsByEmail.get(audienceKey);
  };

  registrations.forEach((registration) => {
    const email = normalizeEmail(registration.email || registration.userId?.email);

    if (!email) {
      return;
    }

    const event = registration.eventId;
    const record = ensureRecord(email);
    const eventSummary = buildEventSummary({
      event,
      record: registration,
      source: 'registration'
    });
    const isCurrent = event?.endDate ? new Date(event.endDate) >= today : true;

    record.userId = record.userId || String(registration.userId || '');
    record.name =
      record.name ||
      normalizeText(registration.name) ||
      normalizeText(registration.captainName) ||
      normalizeText(registration.teamName);
    record.contactNumber =
      record.contactNumber || normalizeText(registration.phone1) || normalizeText(registration.phone2);
    record.location = record.location || normalizeText(registration.address);
    record.registrationStatuses.push(normalizeText(registration.status || 'Registered'));
    record.paymentStatuses.push(normalizePaymentStatus(registration.paymentId?.status));
    record.lastEngagementAt =
      toTimestamp(registration.createdAt) > toTimestamp(record.lastEngagementAt)
        ? registration.createdAt
        : record.lastEngagementAt;

    if (isCurrent) {
      record.currentEvents.push(eventSummary);
    } else {
      record.previousEvents.push(eventSummary);
    }
  });

  interests.forEach((interest) => {
    const email = normalizeEmail(interest.email || interest.userId?.email);

    if (!email) {
      return;
    }

    const record = ensureRecord(email);
    record.userId = record.userId || String(interest.userId || '');
    record.name = record.name || normalizeText(interest.name);
    record.contactNumber = record.contactNumber || normalizeText(interest.phone);
    record.lastEngagementAt =
      toTimestamp(interest.createdAt) > toTimestamp(record.lastEngagementAt)
        ? interest.createdAt
        : record.lastEngagementAt;
    record.interestedEvents.push(
      buildEventSummary({
        event: interest.eventId,
        record: interest,
        source: 'interest'
      })
    );
  });

  users.forEach((user) => {
    const email = normalizeEmail(user.email);

    if (!email) {
      return;
    }

    const record = ensureRecord(email);
    record.userId = record.userId || String(user._id || '');
    record.name = record.name || normalizeText(user.name);
    record.avatar = record.avatar || normalizeText(user.avatar);
    record.authProvider = record.authProvider || normalizeText(user.authProvider);
    record.lastLoginAt = record.lastLoginAt || user.lastLoginAt || null;
  });

  return [...recordsByEmail.values()]
    .map((record) => {
      const user = usersByEmail.get(record.email);
      const preference = preferencesByEmail.get(record.email) || record.preferences;

      return serializeAudienceRecord({
        ...record,
        userId: record.userId || String(user?._id || preference?.userId || ''),
        name: normalizeText(user?.name) || record.name,
        contactNumber: record.contactNumber || normalizeText(preference?.phone),
        avatar: normalizeText(user?.avatar),
        authProvider: normalizeText(user?.authProvider),
        lastLoginAt: user?.lastLoginAt || null,
        tags: preference?.tags || record.tags,
        engagementLevel: deriveEngagementLevel(record),
        preferences: preference
      });
    })
    .filter(
      (record) =>
        Boolean(record.email) &&
        (
          record.currentEvents.length > 0 ||
          record.previousEvents.length > 0 ||
          record.interestedEvents.length > 0 ||
          record.userId
        )
    );
};

export const getAudienceUsersDataset = async ({
  eventId = '',
  search = '',
  segment = 'all',
  paymentStatus = 'all',
  location = '',
  tag = '',
  engagementLevel = 'all',
  sort = 'recent'
} = {}) => {
  const records = await buildAudienceRecords();
  return sortAudienceRecords(
    applyAudienceFilters(records, {
      eventId,
      search,
      segment,
      paymentStatus,
      location,
      tag,
      engagementLevel
    }),
    sort
  );
};

export const getAudienceUsersPage = async ({
  eventId = '',
  limit = 20,
  page = 1,
  search = '',
  segment = 'all',
  paymentStatus = 'all',
  location = '',
  tag = '',
  engagementLevel = 'all',
  sort = 'recent'
} = {}) => {
  const records = await getAudienceUsersDataset({
    eventId,
    search,
    segment,
    paymentStatus,
    location,
    tag,
    engagementLevel,
    sort
  });
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 100));
  const safePage = Math.max(1, Number(page) || 1);
  const totalCount = records.length;
  const startIndex = (safePage - 1) * safeLimit;

  return {
    items: records.slice(startIndex, startIndex + safeLimit),
    page: safePage,
    limit: safeLimit,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / safeLimit)),
    summary: buildSummary(records),
    filterOptions: buildFilterOptions(records)
  };
};

export const getAudienceUsersExportRows = async (filters = {}) => {
  const records = await getAudienceUsersDataset(filters);

  return records.map((record) => ({
    name: record.name,
    email: record.email,
    contactNumber: record.contactNumber,
    location: record.location,
    currentEvents: record.currentEvents.map((item) => item.eventName).join(' | '),
    previousEvents: record.previousEvents.map((item) => item.eventName).join(' | '),
    interestedEvents: record.interestedEvents.map((item) => item.eventName).join(' | '),
    paymentStatuses: record.paymentStatuses.join(' | '),
    tags: record.tags.join(' | '),
    engagementLevel: record.engagementLevel,
    emailOptOut: record.preferences.emailOptOut ? 'Yes' : 'No',
    lastEngagementAt: record.lastEngagementAt || '',
    lastLoginAt: record.lastLoginAt || ''
  }));
};

export const resolveAudienceRecipients = async ({
  filters = {},
  selectedEmails = []
} = {}) => {
  const dataset = await getAudienceUsersDataset(filters);
  const normalizedSelectedEmails = selectedEmails.map((email) => normalizeEmail(email)).filter(Boolean);

  if (!normalizedSelectedEmails.length) {
    return dataset;
  }

  const selectedSet = new Set(normalizedSelectedEmails);
  return dataset.filter((record) => selectedSet.has(normalizeEmail(record.email)));
};
