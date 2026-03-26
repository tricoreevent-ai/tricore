const buildKey = (eventId) => `tricore-registration-draft:${eventId}`;

export const saveRegistrationDraft = (eventId, payload) => {
  if (!eventId || typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(buildKey(eventId), JSON.stringify(payload));
};

export const loadRegistrationDraft = (eventId) => {
  if (!eventId || typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(buildKey(eventId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const clearRegistrationDraft = (eventId) => {
  if (!eventId || typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(buildKey(eventId));
};
