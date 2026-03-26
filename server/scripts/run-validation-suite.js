import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import { connectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { ensureDefaultAdmin } from '../src/services/authService.js';
import { Event } from '../src/models/Event.js';
import { Match } from '../src/models/Match.js';
import { Payment } from '../src/models/Payment.js';
import { Registration } from '../src/models/Registration.js';
import { Transaction } from '../src/models/Transaction.js';
import { User } from '../src/models/User.js';

const API_BASE = (process.env.VALIDATION_API_URL || `http://127.0.0.1:${env.port}/api`).replace(/\/+$/, '');
const SUITE_TAG = 'validation-suite-20260320';
const VALIDATION_EVENT_NAME = 'Validation Cup 2026';
const VALIDATION_DOC_PREFIX = 'VAL-20260320';
const RECEIPT_DATA_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7ZJkQAAAAASUVORK5CYII=';
const QR_DATA_URL = RECEIPT_DATA_URL;
const TEST_EMAIL = process.env.VALIDATION_TEST_EMAIL || env.smtpToRecipients[0] || env.smtpFromEmail || '';
const VALIDATION_NOTES = `[${SUITE_TAG}]`;

const validationTeams = [
  {
    ownerName: 'Validation Captain A',
    email: 'tricore.event+validation-team-a@gmail.com',
    teamName: 'Validation Strikers',
    captainName: 'Captain A',
    phone1: '9000000001',
    phone2: '9000000002',
    address: 'Validation Address Block A, Kochi',
    paymentMode: 'upi',
    manualReference: 'VAL-UPI-TEAM-A',
    payoutDetails: {
      upiId: 'captain.a@upi',
      accountHolderName: 'Validation Captain A',
      accountNumber: '1111222233334444',
      bankName: 'State Bank of India',
      ifscCode: 'SBIN0000123',
      branchName: 'Kochi Main',
      notes: 'Validation refund destination A'
    },
    players: [
      { name: 'Validation A One', phone: '9001000001', address: 'Validation Hostel A1, Kochi' },
      { name: 'Validation A Two', phone: '9001000002', address: 'Validation Hostel A2, Kochi' },
      { name: 'Validation A Three', phone: '9001000003', address: 'Validation Hostel A3, Kochi' }
    ]
  },
  {
    ownerName: 'Validation Captain B',
    email: 'tricore.event+validation-team-b@gmail.com',
    teamName: 'Validation Rangers',
    captainName: 'Captain B',
    phone1: '9000000011',
    phone2: '9000000012',
    address: 'Validation Address Block B, Kochi',
    paymentMode: 'bank',
    manualReference: 'VAL-BANK-TEAM-B',
    payoutDetails: {
      upiId: 'captain.b@upi',
      accountHolderName: 'Validation Captain B',
      accountNumber: '5555666677778888',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0000456',
      branchName: 'Infopark',
      notes: 'Validation refund destination B'
    },
    players: [
      { name: 'Validation B One', phone: '9002000001', address: 'Validation Hostel B1, Kochi' },
      { name: 'Validation B Two', phone: '9002000002', address: 'Validation Hostel B2, Kochi' },
      { name: 'Validation B Three', phone: '9002000003', address: 'Validation Hostel B3, Kochi' }
    ]
  }
];

const accountingSeed = [
  {
    scope: 'event',
    type: 'income',
    category: 'registration',
    amount: 3500,
    date: '2026-03-20',
    reference: 'Validation offline registrations batch',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-01`,
    paymentMode: 'cash',
    notes: `${VALIDATION_NOTES} Event-side registration collection.`
  },
  {
    scope: 'event',
    type: 'income',
    category: 'sponsorship',
    amount: 50000,
    date: '2026-03-20',
    reference: 'Apex title sponsorship',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-02`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Title sponsor installment.`
  },
  {
    scope: 'event',
    type: 'income',
    category: 'advertisement',
    amount: 12000,
    date: '2026-03-21',
    reference: 'Boundary board advertisement',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-03`,
    paymentMode: 'online',
    notes: `${VALIDATION_NOTES} Advertising revenue.`
  },
  {
    scope: 'common',
    type: 'income',
    category: 'donation',
    amount: 5000,
    date: '2026-03-21',
    reference: 'Supporter contribution',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-04`,
    paymentMode: 'upi',
    notes: `${VALIDATION_NOTES} General donation.`
  },
  {
    scope: 'common',
    type: 'income',
    category: 'partner_share',
    amount: 15000,
    date: '2026-03-22',
    reference: 'Partner revenue share received',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-05`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Partner remittance.`
  },
  {
    scope: 'common',
    type: 'income',
    category: 'other',
    amount: 3200,
    date: '2026-03-22',
    reference: 'Training clinic revenue',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-06`,
    paymentMode: 'cash',
    notes: `${VALIDATION_NOTES} Miscellaneous income bucket.`
  },
  {
    scope: 'common',
    type: 'income',
    category: 'other_income',
    amount: 2100,
    date: '2026-03-22',
    reference: 'Merchandise margin',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-07`,
    paymentMode: 'upi',
    notes: `${VALIDATION_NOTES} Other income category.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'venue',
    amount: 18000,
    date: '2026-03-23',
    reference: 'Ground booking advance',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-08`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Venue booking.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'equipment',
    amount: 6500,
    date: '2026-03-23',
    reference: 'Sports equipment purchase',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-09`,
    paymentMode: 'cash',
    notes: `${VALIDATION_NOTES} Balls, stumps, bibs.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'staff',
    amount: 7000,
    date: '2026-03-24',
    reference: 'Umpire and scorer fees',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-10`,
    paymentMode: 'upi',
    notes: `${VALIDATION_NOTES} Match officials.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'marketing',
    amount: 4000,
    date: '2026-03-24',
    reference: 'Social media promotion',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-11`,
    paymentMode: 'online',
    notes: `${VALIDATION_NOTES} Brand promotion.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'prize',
    amount: 9000,
    date: '2026-03-24',
    reference: 'Winner trophy and medals',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-12`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Prize distribution preparation.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'food',
    amount: 5000,
    date: '2026-03-25',
    reference: 'Refreshments for teams',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-13`,
    paymentMode: 'cash',
    notes: `${VALIDATION_NOTES} Hospitality costs.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'administrative',
    amount: 2300,
    date: '2026-03-25',
    reference: 'Office stationery and printing',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-14`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Admin expense.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'vendor_payment',
    amount: 7800,
    date: '2026-03-25',
    reference: 'Website support vendor payout',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-15`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Vendor settlement.`
  },
  {
    scope: 'event',
    type: 'expense',
    category: 'organizer_payout',
    amount: 6000,
    date: '2026-03-26',
    reference: 'Event organizer settlement',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-16`,
    paymentMode: 'upi',
    notes: `${VALIDATION_NOTES} Organizer payout.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'partner_distribution',
    amount: 4500,
    date: '2026-03-26',
    reference: 'Partner share distributed',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-17`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Partner distribution.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'miscellaneous',
    amount: 1600,
    date: '2026-03-26',
    reference: 'Emergency runner logistics',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-18`,
    paymentMode: 'cash',
    notes: `${VALIDATION_NOTES} Miscellaneous spend.`
  },
  {
    scope: 'common',
    type: 'expense',
    category: 'other_expense',
    amount: 1400,
    date: '2026-03-26',
    reference: 'Unexpected compliance filing',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-19`,
    paymentMode: 'online',
    notes: `${VALIDATION_NOTES} Other expense bucket.`
  },
  {
    scope: 'common',
    type: 'income',
    category: 'sponsorship',
    amount: 8000,
    date: '2026-03-27',
    reference: 'Local sponsor add-on support',
    referenceDocument: `${VALIDATION_DOC_PREFIX}-20`,
    paymentMode: 'bank',
    notes: `${VALIDATION_NOTES} Additional sponsorship to reach 20 validation entries.`
  }
];

const buildToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      authProvider: user.authProvider
    },
    env.jwtSecret,
    { expiresIn: '2h' }
  );

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const pickPaymentSettingsPayload = (settings) => ({
  manualPaymentEnabled: Boolean(settings?.manualPaymentEnabled),
  upiId: String(settings?.upiId || ''),
  payeeName: String(settings?.payeeName || ''),
  qrCodeDataUrl: String(settings?.qrCodeDataUrl || ''),
  bankAccountName: String(settings?.bankAccountName || ''),
  bankAccountNumber: String(settings?.bankAccountNumber || ''),
  bankIfscCode: String(settings?.bankIfscCode || ''),
  bankName: String(settings?.bankName || ''),
  bankBranch: String(settings?.bankBranch || ''),
  bankInstructions: String(settings?.bankInstructions || ''),
  paymentProofRecipientEmail: String(settings?.paymentProofRecipientEmail || '')
});

const request = async ({ method = 'GET', path, token, body }) => {
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};

  if (!response.ok || payload.success === false) {
    throw new Error(`${method} ${path} failed with ${response.status}: ${payload.message || payload.error || text}`);
  }

  return payload;
};

const cleanupValidationData = async () => {
  const validationEventIds = (await Event.find({ name: VALIDATION_EVENT_NAME }).select('_id')).map((event) => event._id);

  if (validationEventIds.length) {
    await Match.deleteMany({ eventId: { $in: validationEventIds } });
    await Transaction.deleteMany({ eventId: { $in: validationEventIds } });
    await Registration.deleteMany({ eventId: { $in: validationEventIds } });
    await Payment.deleteMany({ eventId: { $in: validationEventIds } });
    await Event.deleteMany({ _id: { $in: validationEventIds } });
  }

  await Transaction.deleteMany({
    $or: [
      { referenceDocument: { $regex: `^${VALIDATION_DOC_PREFIX}` } },
      { notes: { $regex: SUITE_TAG } }
    ]
  });

  await User.deleteMany({
    email: {
      $in: validationTeams.map((team) => team.email)
    }
  });
};

const ensureValidationUsers = async () =>
  Promise.all(
    validationTeams.map((team, index) =>
      User.findOneAndUpdate(
        { email: team.email },
        {
          $set: {
            authProvider: 'google',
            googleId: `${SUITE_TAG}-google-${index + 1}`,
            name: team.ownerName,
            role: 'user',
            avatar: '',
            lastLoginAt: new Date()
          }
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true
        }
      )
    )
  );

const createValidationEvent = async (adminToken) => {
  const payload = {
    name: VALIDATION_EVENT_NAME,
    description: 'Automated validation event for paid registration, accounting, and scheduling.',
    bannerImage: '',
    sportType: 'Cricket',
    venue: 'TriCore Validation Arena',
    startDate: '2026-04-15',
    endDate: '2026-04-16',
    maxParticipants: 8,
    entryFee: 1750,
    registrationDeadline: '2026-04-10',
    teamSize: 3,
    playerLimit: 5,
    registrationEnabled: true
  };

  return request({
    method: 'POST',
    path: '/events',
    token: adminToken,
    body: payload
  });
};

const createManualRegistrationPayload = (eventId, team) => ({
  eventId,
  name: team.ownerName,
  teamName: team.teamName,
  captainName: team.captainName,
  email: team.email,
  phone1: team.phone1,
  phone2: team.phone2,
  address: team.address,
  players: team.players,
  manualReference: team.manualReference,
  receiptDataUrl: RECEIPT_DATA_URL,
  receiptFilename: `${team.teamName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-proof.png`
});

const createTransactions = async ({ adminToken, eventId }) => {
  const created = [];

  for (const entry of accountingSeed) {
    const payload = {
      ...entry,
      ...(entry.scope === 'event' ? { eventId } : {})
    };

    const response = await request({
      method: 'POST',
      path: '/transactions',
      token: adminToken,
      body: payload
    });

    created.push(response.data);
  }

  return created;
};

const main = async () => {
  let adminToken = '';
  let originalPaymentSettings = null;

  try {
    await connectDB();

    const health = await request({ path: '/health' });
    assert(health.success, 'Health endpoint did not return success.');

    const adminUser = await ensureDefaultAdmin();
    adminToken = buildToken(adminUser);

    originalPaymentSettings = pickPaymentSettingsPayload((await request({
      path: '/settings/payment',
      token: adminToken
    })).data);

    await cleanupValidationData();

    const users = await ensureValidationUsers();
    const userTokens = users.map((user) => buildToken(user));

    const validationPaymentSettings = {
      manualPaymentEnabled: true,
      upiId: 'tricore.validation@okhdfcbank',
      payeeName: 'Tricore',
      qrCodeDataUrl: QR_DATA_URL,
      bankAccountName: 'TriCore Events Validation',
      bankAccountNumber: '1234567890123456',
      bankIfscCode: 'SBIN0004321',
      bankName: 'State Bank of India',
      bankBranch: 'Kochi Validation Branch',
      bankInstructions: 'Validation setup: pay the fee and upload the screenshot for admin review.',
      paymentProofRecipientEmail: env.smtpToRecipients[0] || env.smtpFromEmail || 'divakdi@gmail.com'
    };

    await request({
      method: 'PUT',
      path: '/settings/payment',
      token: adminToken,
      body: validationPaymentSettings
    });

    const publicPaymentSettings = (await request({ path: '/payment-settings' })).data;
    assert(publicPaymentSettings.manualPaymentEnabled, 'Manual payment should be enabled for validation.');
    assert(publicPaymentSettings.upiId, 'UPI ID should be visible in public payment settings.');
    assert(publicPaymentSettings.bankAccountNumber, 'Bank details should be visible in public payment settings.');
    assert(publicPaymentSettings.qrCodeDataUrl, 'QR code should be visible in public payment settings.');

    const createdEvent = (await createValidationEvent(adminToken)).data;
    const eventId = createdEvent._id;

    const payoutUpdate = await request({
      method: 'PUT',
      path: '/auth/me/payout-details',
      token: userTokens[0],
      body: validationTeams[0].payoutDetails
    });
    assert(payoutUpdate.data.payoutDetails.upiId === validationTeams[0].payoutDetails.upiId, 'User payout details update failed.');

    const beforeRegistration = await request({
      path: `/registrations/me/event/${eventId}`,
      token: userTokens[0]
    });
    assert(beforeRegistration.data === null, 'Validation event should not have a prior registration.');

    const registrationResults = [];

    for (const [index, team] of validationTeams.entries()) {
      const token = userTokens[index];
      const registrationResponse = await request({
        method: 'POST',
        path: '/registrations/manual',
        token,
        body: createManualRegistrationPayload(eventId, team)
      });

      assert(registrationResponse.data.registration.status === 'Registered', 'New paid registration should start as Registered.');
      assert(registrationResponse.data.payment.status === 'Under Review', 'Payment proof should move payment to Under Review.');

      const myRegistration = await request({
        path: `/registrations/me/event/${eventId}`,
        token
      });

      assert(myRegistration.data.players.length === team.players.length, 'Existing registration lookup should return saved players.');
      assert(myRegistration.data.paymentId.status === 'Under Review', 'Saved registration should expose Under Review payment status.');

      registrationResults.push(registrationResponse.data.registration);
    }

    const adminRegistrations = (await request({
      path: `/registrations?eventId=${eventId}`,
      token: adminToken
    })).data;
    assert(adminRegistrations.length === validationTeams.length, 'Admin should see all validation registrations.');

    for (const registration of adminRegistrations) {
      const matchingTeam = validationTeams.find((team) => team.teamName === registration.teamName);
      await request({
        method: 'POST',
        path: `/registrations/${registration._id}/confirm-payment`,
        token: adminToken,
        body: {
          manualReference: `${matchingTeam.manualReference}-CONFIRMED`,
          paymentMode: matchingTeam.paymentMode
        }
      });
    }

    const confirmedRegistrations = (await request({
      path: `/registrations?eventId=${eventId}&status=Confirmed`,
      token: adminToken
    })).data;
    assert(confirmedRegistrations.length === validationTeams.length, 'All validation registrations should be confirmed by admin.');

    const confirmedTeams = (await request({
      path: `/matches/event/${eventId}/confirmed-teams`,
      token: adminToken
    })).data;
    assert(confirmedTeams.length === validationTeams.length, 'Confirmed team list should match confirmed registrations.');

    await request({
      method: 'POST',
      path: '/matches/generate-knockout',
      token: adminToken,
      body: {
        eventId,
        date: '2026-04-15',
        time: '09:30',
        venue: createdEvent.venue,
        replaceExisting: true
      }
    });

    const matches = (await request({ path: `/matches/${eventId}` })).data;
    assert(matches.length >= 1, 'Knockout generation should create at least one match.');

    const userDashboard = (await request({
      path: '/dashboard/me',
      token: userTokens[0]
    })).data;
    assert(userDashboard.registrations.some((registration) => registration.eventId?._id === eventId), 'User dashboard should include the validation registration.');
    assert(userDashboard.matches.length >= 1, 'User dashboard should include at least one scheduled match after bracket generation.');

    const manualTransactions = await createTransactions({ adminToken, eventId });
    assert(manualTransactions.length === 20, 'Exactly 20 manual validation transactions should be created.');

    const updatedTransaction = await request({
      method: 'PUT',
      path: `/transactions/${manualTransactions[0]._id}`,
      token: adminToken,
      body: {
        amount: 3750,
        notes: `${VALIDATION_NOTES} Updated during validation edit check.`
      }
    });
    assert(updatedTransaction.data.amount === 3750, 'Manual transaction update failed.');

    const tempTransaction = (await request({
      method: 'POST',
      path: '/transactions',
      token: adminToken,
      body: {
        scope: 'common',
        type: 'expense',
        category: 'miscellaneous',
        amount: 999,
        date: '2026-03-27',
        reference: 'Validation delete check',
        referenceDocument: `${VALIDATION_DOC_PREFIX}-TEMP`,
        paymentMode: 'cash',
        notes: `${VALIDATION_NOTES} Temporary delete validation.`
      }
    })).data;

    await request({
      method: 'DELETE',
      path: `/transactions/${tempTransaction._id}`,
      token: adminToken
    });

    const allTransactionsResponse = await request({
      path: '/transactions',
      token: adminToken
    });
    const allTransactions = allTransactionsResponse.data.transactions;
    const validationManualTransactions = allTransactions.filter(
      (transaction) =>
        transaction.source === 'manual' &&
        String(transaction.referenceDocument || '').startsWith(VALIDATION_DOC_PREFIX)
    );
    const validationPaymentTransactions = allTransactions.filter(
      (transaction) =>
        transaction.source === 'payment' &&
        transaction.eventId?._id === eventId
    );

    assert(validationManualTransactions.length === 20, 'Final manual validation transaction count should remain 20.');
    assert(validationPaymentTransactions.length === validationTeams.length, 'Confirmed registrations should create payment-source income rows.');

    const accountingDashboard = (await request({
      path: '/transactions/dashboard',
      token: adminToken
    })).data;
    const accountingReports = (await request({
      path: '/transactions/reports',
      token: adminToken
    })).data;
    const paymentReport = (await request({
      path: `/admin/accounting?eventId=${eventId}`,
      token: adminToken
    })).data;
    const overviewReport = (await request({
      path: '/admin/reports/overview',
      token: adminToken
    })).data;

    assert(accountingDashboard.totalIncome > 0, 'Accounting dashboard should report income.');
    assert(accountingDashboard.totalExpenses > 0, 'Accounting dashboard should report expenses.');
    assert(accountingReports.incomeReport.breakdown.length >= 1, 'Accounting report should include income breakdown.');
    assert(accountingReports.expenseReport.breakdown.length >= 1, 'Accounting report should include expense breakdown.');
    assert(paymentReport.summary.counts.Confirmed >= validationTeams.length, 'Admin accounting report should include confirmed payments.');
    assert(overviewReport.eventMetrics.some((item) => item.eventId === eventId || item.eventId?._id === eventId || item.name === VALIDATION_EVENT_NAME), 'Reports overview should include the validation event.');

    let testEmailResult = 'skipped';
    if (TEST_EMAIL) {
      const emailResponse = await request({
        method: 'POST',
        path: '/settings/email/test',
        token: adminToken,
        body: { to: TEST_EMAIL }
      });
      testEmailResult = emailResponse.message;
    }

    const summary = {
      apiBase: API_BASE,
      event: {
        id: eventId,
        name: createdEvent.name,
        entryFee: createdEvent.entryFee
      },
      registrations: confirmedRegistrations.map((registration) => ({
        teamName: registration.teamName,
        registrationStatus: registration.status,
        paymentStatus: registration.paymentId?.status,
        playerCount: Array.isArray(registration.players) ? registration.players.length : 0
      })),
      matchesCreated: matches.length,
      accounting: {
        manualValidationTransactions: validationManualTransactions.length,
        autoPaymentTransactions: validationPaymentTransactions.length,
        totalIncome: accountingDashboard.totalIncome,
        totalExpenses: accountingDashboard.totalExpenses,
        netProfit: accountingDashboard.netProfit,
        bankBalance: accountingDashboard.bankBalance,
        cashBalance: accountingDashboard.cashBalance,
        partnerBalance: accountingDashboard.partnerBalance
      },
      reports: {
        incomeBreakdownCount: accountingReports.incomeReport.breakdown.length,
        expenseBreakdownCount: accountingReports.expenseReport.breakdown.length,
        timelinePoints: accountingReports.dateWiseReport.timeline.length,
        confirmedPayments: paymentReport.summary.counts.Confirmed || 0
      },
      email: {
        testEmail: testEmailResult,
        recipient: TEST_EMAIL || ''
      }
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (adminToken && originalPaymentSettings) {
      try {
        await request({
          method: 'PUT',
          path: '/settings/payment',
          token: adminToken,
          body: originalPaymentSettings
        });
      } catch (restoreError) {
        console.error('Payment settings restore failed:', restoreError.message);
      }
    }

    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
