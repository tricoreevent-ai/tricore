import { EventInterest } from '../models/EventInterest.js';
import {
  markEventInterestNotifications
} from './eventInterestService.js';
import { sendRegistrationOpeningInterestEmails } from './eventInterestNotificationService.js';
import {
  hasRegistrationDeadlinePassed,
  hasRegistrationStarted
} from './registrationService.js';

const SCHEDULER_INTERVAL_MS = 60 * 1000;

let schedulerStarted = false;
let schedulerBusy = false;
let schedulerTimer = null;

const eventAllowsAutomaticOpeningNotification = (event) =>
  Boolean(event) &&
  !event.isDeleted &&
  !event.isHidden &&
  Boolean(event.registrationEnabled) &&
  hasRegistrationStarted(event) &&
  !hasRegistrationDeadlinePassed(event);

const runInterestOpeningNotifications = async () => {
  if (schedulerBusy) {
    return;
  }

  schedulerBusy = true;

  try {
    const pendingInterests = await EventInterest.find({
      registrationOpenedNotifiedAt: null
    })
      .populate('eventId')
      .sort({ createdAt: 1 });

    const groupedByEvent = pendingInterests.reduce((collection, interest) => {
      const event = interest.eventId;

      if (!eventAllowsAutomaticOpeningNotification(event)) {
        return collection;
      }

      const eventId = String(event._id);

      if (!collection.has(eventId)) {
        collection.set(eventId, {
          event,
          interests: []
        });
      }

      collection.get(eventId).interests.push(interest);
      return collection;
    }, new Map());

    for (const { event, interests } of groupedByEvent.values()) {
      const result = await sendRegistrationOpeningInterestEmails({
        event,
        interests
      });

      await markEventInterestNotifications({
        interests,
        sentIds: result.sentIds.map((id) => String(id)),
        mode: 'automatic'
      });
    }
  } catch (error) {
    console.warn('Event interest scheduler warning:', error);
  } finally {
    schedulerBusy = false;
  }
};

export const startEventInterestScheduler = () => {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  schedulerTimer = setInterval(() => {
    void runInterestOpeningNotifications();
  }, SCHEDULER_INTERVAL_MS);

  if (typeof schedulerTimer.unref === 'function') {
    schedulerTimer.unref();
  }

  void runInterestOpeningNotifications();
};
