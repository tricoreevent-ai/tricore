const toTimestamp = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const getDayStartTimestamp = (referenceDate = new Date()) => {
  const nextDate = new Date(referenceDate);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate.getTime();
};

export const getEventStartTimestamp = (event) =>
  toTimestamp(event?.startDate) ?? toTimestamp(event?.endDate);

export const getEventEndTimestamp = (event) =>
  toTimestamp(event?.endDate) ?? toTimestamp(event?.startDate);

export const getRegistrationStartTimestamp = (event) =>
  toTimestamp(event?.registrationStartDate);

export const getRegistrationDeadlineCutoffTimestamp = (event) => {
  const timestamp = toTimestamp(event?.registrationDeadline);

  if (timestamp === null) {
    return null;
  }

  const deadline = new Date(event.registrationDeadline);
  deadline.setHours(23, 59, 59, 999);
  return deadline.getTime();
};

export const isDateOnOrAfterToday = (value, referenceDate = new Date()) => {
  const timestamp = toTimestamp(value);
  return timestamp !== null && timestamp >= getDayStartTimestamp(referenceDate);
};

// Event dates are managed as day-level schedule fields, so comparisons use the start of the day.
export const isUpcomingOrOngoingEvent = (event, referenceDate = new Date()) => {
  const timestamp = getEventEndTimestamp(event);
  return timestamp !== null && timestamp >= getDayStartTimestamp(referenceDate);
};

export const isPastEvent = (event, referenceDate = new Date()) => {
  const timestamp = getEventEndTimestamp(event);
  return timestamp !== null && timestamp < getDayStartTimestamp(referenceDate);
};

export const isVisiblePublicEvent = (event) =>
  Boolean(event) && !Boolean(event.isHidden) && !Boolean(event.isDeleted);

export const hasRegistrationStartedForEvent = (event, referenceDate = new Date()) => {
  const startTimestamp = getRegistrationStartTimestamp(event);

  if (startTimestamp !== null) {
    return startTimestamp <= referenceDate.getTime();
  }

  return getRegistrationDeadlineCutoffTimestamp(event) !== null;
};

export const isRegistrationComingSoonForEvent = (event, referenceDate = new Date()) =>
  isVisiblePublicEvent(event) &&
  Boolean(event.registrationEnabled) &&
  isUpcomingOrOngoingEvent(event, referenceDate) &&
  !hasRegistrationStartedForEvent(event, referenceDate) &&
  ((getRegistrationDeadlineCutoffTimestamp(event) ?? Number.MAX_SAFE_INTEGER) >=
    referenceDate.getTime());

export const isRegistrationOpenForEvent = (event, referenceDate = new Date()) =>
  isVisiblePublicEvent(event) &&
  Boolean(event.registrationEnabled) &&
  isUpcomingOrOngoingEvent(event, referenceDate) &&
  hasRegistrationStartedForEvent(event, referenceDate) &&
  ((getRegistrationDeadlineCutoffTimestamp(event) ?? Number.MAX_SAFE_INTEGER) >=
    referenceDate.getTime());

export const getPublicEventRegistrationStatus = (event, referenceDate = new Date()) => {
  if (isPastEvent(event, referenceDate)) {
    return 'completed';
  }

  if (isRegistrationOpenForEvent(event, referenceDate)) {
    return 'open';
  }

  if (isRegistrationComingSoonForEvent(event, referenceDate)) {
    return 'coming_soon';
  }

  return 'closed';
};

export const sortEventsByStartDate = (events = []) =>
  [...events].sort((left, right) => {
    const leftTimestamp = getEventStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTimestamp = getEventStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    return leftTimestamp - rightTimestamp;
  });

export const sortPublicUpcomingEvents = (events = [], referenceDate = new Date()) =>
  [...events].sort((left, right) => {
    const statusPriority = {
      open: 0,
      coming_soon: 1,
      closed: 2,
      completed: 3
    };
    const leftStatus = getPublicEventRegistrationStatus(left, referenceDate);
    const rightStatus = getPublicEventRegistrationStatus(right, referenceDate);

    if (leftStatus !== rightStatus) {
      return (statusPriority[leftStatus] ?? 99) - (statusPriority[rightStatus] ?? 99);
    }

    const leftTimestamp = getEventStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTimestamp = getEventStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    return leftTimestamp - rightTimestamp;
  });
