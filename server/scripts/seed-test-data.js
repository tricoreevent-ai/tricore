import mongoose from 'mongoose';

import { connectDB, getDbStatus } from '../src/config/db.js';
import { adminRoles } from '../src/constants/adminAccess.js';
import { Event } from '../src/models/Event.js';
import { CalendarSportsEvent } from '../src/models/CalendarSportsEvent.js';
import { Payment } from '../src/models/Payment.js';
import { Registration } from '../src/models/Registration.js';
import { User } from '../src/models/User.js';
import { hashPassword, ensureDefaultAdmin } from '../src/services/authService.js';

const TEST_EVENT_NAME = 'TriCore Calendar Test Cup 2026';
const COMING_SOON_EVENT_NAME = 'TriCore Coming Soon Invitational 2026';

const testUsers = [
  { username: 'vinod', name: 'Vinod Nair', role: adminRoles.accountingAdmin },
  { username: 'kenny', name: 'Kenny Joseph', role: adminRoles.operationsAdmin },
  { username: 'reena', name: 'Reena Thomas', role: adminRoles.registrationsAdmin },
  { username: 'suraj', name: 'Suraj Menon', role: adminRoles.reportsAdmin },
  { username: 'pooja', name: 'Pooja Sreedhar', role: adminRoles.settingsAdmin },
  { username: 'aman', name: 'Aman Kapoor', role: adminRoles.operationsAdmin },
  { username: 'jerry', name: 'Jerry Mathew', role: adminRoles.registrationsAdmin },
  { username: 'kavya', name: 'Kavya Nambiar', role: adminRoles.accountingAdmin },
  { username: 'manoj', name: 'Manoj Pillai', role: adminRoles.reportsAdmin },
  { username: 'nisha', name: 'Nisha Varghese', role: adminRoles.settingsAdmin },
  { username: 'arav', name: 'Arav Iyer', role: adminRoles.operationsAdmin },
  { username: 'bhavna', name: 'Bhavna Krishnan', role: adminRoles.registrationsAdmin },
  { username: 'chetan', name: 'Chetan Rao', role: adminRoles.accountingAdmin },
  { username: 'deepa', name: 'Deepa Rajan', role: adminRoles.reportsAdmin },
  { username: 'farhan', name: 'Farhan Ali', role: adminRoles.settingsAdmin },
  { username: 'gauri', name: 'Gauri Nair', role: adminRoles.operationsAdmin },
  { username: 'harsh', name: 'Harsh Bhat', role: adminRoles.registrationsAdmin },
  { username: 'ishita', name: 'Ishita Sen', role: adminRoles.accountingAdmin },
  { username: 'jatin', name: 'Jatin Kumar', role: adminRoles.reportsAdmin },
  { username: 'komal', name: 'Komal George', role: adminRoles.settingsAdmin }
];

const sportsFixtures = [
  {
    name: 'IPL 2026 Season',
    description: 'A seeded major cricket fixture block for calendar planning and dashboard validation.',
    sportType: 'Cricket',
    startDate: '2026-03-22',
    endDate: '2026-05-31',
    location: 'India'
  },
  {
    name: 'FIFA World Cup 2026',
    description: 'A seeded global football fixture for the shared calendar feed.',
    sportType: 'Football',
    startDate: '2026-06-11',
    endDate: '2026-07-19',
    location: 'USA / Canada / Mexico'
  },
  {
    name: 'India Open 2026',
    description: 'A seeded badminton fixture for the admin calendar and dashboard view.',
    sportType: 'Badminton',
    startDate: '2026-01-13',
    endDate: '2026-01-18',
    location: 'New Delhi'
  },
  {
    name: 'Corporate Games India 2026',
    description: 'A seeded multi-sport fixture that helps validate large calendar windows.',
    sportType: 'Multi-Sport',
    startDate: '2026-08-14',
    endDate: '2026-08-16',
    location: 'Bengaluru'
  }
];

const buildPlayers = (teamIndex) =>
  Array.from({ length: 8 }, (_, playerIndex) => ({
    name: `Team ${teamIndex + 1} Player ${playerIndex + 1}`,
    phone: `900000${String(teamIndex).padStart(2, '0')}${String(playerIndex + 1).padStart(2, '0')}`,
    address: `Sports Residency Block ${teamIndex + 1}, Kochi`
  }));

const buildConfirmedRegistrationPayload = ({ event, user, teamIndex, confirmedBy }) => {
  const players = buildPlayers(teamIndex);
  const captainName = players[0].name;
  const teamNumber = String(teamIndex + 1).padStart(2, '0');

  return {
    payment: {
      userId: user._id,
      eventId: event._id,
      amount: event.entryFee,
      currency: 'INR',
      status: 'Confirmed',
      method: 'manual',
      paymentId: `seed-payment-${teamNumber}`,
      manualReference: `SEED-APR26-${teamNumber}`,
      orderId: `seed-calendar-test-cup-2026-${teamNumber}`,
      receipt: '',
      receiptFilename: '',
      proofSubmittedAt: new Date('2026-03-26T08:00:00.000Z'),
      proofEmailRecipients: [],
      razorpaySignature: '',
      confirmedBy,
      confirmedAt: new Date('2026-03-26T10:30:00.000Z')
    },
    registration: {
      userId: user._id,
      eventId: event._id,
      status: 'Confirmed',
      confirmedAt: new Date('2026-03-26T10:30:00.000Z'),
      name: user.name,
      teamName: `Calendar Test Team ${teamNumber}`,
      captainName,
      email: user.email,
      phone1: players[0].phone,
      phone2: players[1].phone,
      address: `Team Camp ${teamNumber}, Kochi`,
      players
    }
  };
};

const upsertTestUsers = async () => {
  const createdUsers = [];

  for (const definition of testUsers) {
    const passwordHash = await hashPassword(definition.username);
    const user = await User.findOneAndUpdate(
      { authProvider: 'local', username: definition.username },
      {
        authProvider: 'local',
        username: definition.username,
        name: definition.name,
        email: `${definition.username}@tricoreevents.online`,
        role: definition.role,
        roleName: '',
        permissions: [],
        passwordHash
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );

    createdUsers.push(user);
  }

  return createdUsers;
};

const upsertSportsFixtures = async (adminUserId) => {
  for (const fixture of sportsFixtures) {
    await CalendarSportsEvent.findOneAndUpdate(
      { name: fixture.name },
      {
        ...fixture,
        startDate: new Date(fixture.startDate),
        endDate: new Date(fixture.endDate),
        createdBy: adminUserId,
        updatedBy: adminUserId
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true
      }
    );
  }
};

const upsertEvents = async () => {
  const testEvent = await Event.findOneAndUpdate(
    { name: TEST_EVENT_NAME },
    {
      name: TEST_EVENT_NAME,
      description:
        'A seeded April event used to validate calendar views, dense event catalogs, and registration reporting.',
      bannerImage: '',
      sportType: 'Cricket',
      venue: 'Spark 7 Sports Arena',
      startDate: new Date('2026-04-24T00:00:00.000Z'),
      endDate: new Date('2026-04-26T23:59:59.999Z'),
      maxParticipants: 10,
      entryFee: 2500,
      registrationStartDate: new Date('2026-03-26T03:30:00.000Z'),
      registrationDeadline: new Date('2026-04-18T00:00:00.000Z'),
      teamSize: 8,
      playerLimit: 12,
      registrationEnabled: true,
      isHidden: false,
      isDeleted: false
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  const comingSoonEvent = await Event.findOneAndUpdate(
    { name: COMING_SOON_EVENT_NAME },
    {
      name: COMING_SOON_EVENT_NAME,
      description:
        'A seeded coming-soon event with Notify Later enabled and no registration window configured yet.',
      bannerImage: '',
      sportType: 'Cricket',
      venue: 'Sarva Horizon Community Grounds',
      startDate: new Date('2026-05-12T00:00:00.000Z'),
      endDate: new Date('2026-05-14T23:59:59.999Z'),
      maxParticipants: 12,
      entryFee: 1800,
      registrationStartDate: null,
      registrationDeadline: null,
      teamSize: 8,
      playerLimit: 12,
      registrationEnabled: true,
      isHidden: false,
      isDeleted: false
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true
    }
  );

  return { testEvent, comingSoonEvent };
};

const reseedTestRegistrations = async ({ event, users, confirmedBy }) => {
  await Registration.deleteMany({ eventId: event._id });
  await Payment.deleteMany({ eventId: event._id });

  let seededTeams = 0;

  for (const [teamIndex, user] of users.slice(0, 10).entries()) {
    const payload = buildConfirmedRegistrationPayload({
      event,
      user,
      teamIndex,
      confirmedBy
    });

    const payment = await Payment.create(payload.payment);
    await Registration.create({
      ...payload.registration,
      paymentId: payment._id
    });
    seededTeams += 1;
  }

  return seededTeams;
};

const main = async () => {
  await connectDB();

  const dbStatus = getDbStatus();

  if (dbStatus.mode !== 'primary') {
    throw new Error(
      `Seed data must run against the primary database, but the current mode is "${dbStatus.mode}".`
    );
  }

  const defaultAdmin = await ensureDefaultAdmin();
  const users = await upsertTestUsers();
  const { testEvent, comingSoonEvent } = await upsertEvents();
  await upsertSportsFixtures(defaultAdmin._id);
  const seededTeams = await reseedTestRegistrations({
    event: testEvent,
    users,
    confirmedBy: defaultAdmin._id
  });

  console.log(
    JSON.stringify(
      {
        success: true,
        database: dbStatus,
        usersSeeded: users.length,
        testEvent: {
          id: testEvent._id.toString(),
          name: testEvent.name,
          startDate: testEvent.startDate,
          endDate: testEvent.endDate,
          seededTeams
        },
        comingSoonEvent: {
          id: comingSoonEvent._id.toString(),
          name: comingSoonEvent.name
        },
        fixturesSeeded: sportsFixtures.length
      },
      null,
      2
    )
  );
};

try {
  await main();
} catch (error) {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
