const toTimestamp = (value) => {
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

export const isRegistrationOpenForEvent = (event, referenceDate = new Date()) =>
  isVisiblePublicEvent(event) &&
  Boolean(event.registrationEnabled) &&
  isUpcomingOrOngoingEvent(event, referenceDate) &&
  isDateOnOrAfterToday(event.registrationDeadline, referenceDate);

export const sortEventsByStartDate = (events = []) =>
  [...events].sort((left, right) => {
    const leftTimestamp = getEventStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTimestamp = getEventStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    return leftTimestamp - rightTimestamp;
  });

export const sortPublicUpcomingEvents = (events = [], referenceDate = new Date()) =>
  [...events].sort((left, right) => {
    const leftOpen = isRegistrationOpenForEvent(left, referenceDate);
    const rightOpen = isRegistrationOpenForEvent(right, referenceDate);

    if (leftOpen !== rightOpen) {
      return leftOpen ? -1 : 1;
    }

    const leftTimestamp = getEventStartTimestamp(left) ?? Number.MAX_SAFE_INTEGER;
    const rightTimestamp = getEventStartTimestamp(right) ?? Number.MAX_SAFE_INTEGER;
    return leftTimestamp - rightTimestamp;
  });
