import { adminApi, cleanParams, publicApi } from './http.js';

const freshRequestConfig = (params = {}) => ({
  params: {
    ...cleanParams(params),
    _ts: Date.now()
  },
  headers: {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0'
  }
});

export const getEvents = async (params = {}) => {
  const response = await publicApi.get('/events', freshRequestConfig(params));
  return response.data.data;
};

export const getAdminEvents = async (params = {}) => {
  const response = await adminApi.get(
    '/events',
    freshRequestConfig({ ...params, includeHidden: true })
  );
  return response.data.data;
};

export const getAdminEventCatalog = async (params = {}) => {
  const response = await adminApi.get('/events/catalog', freshRequestConfig(params));
  return response.data.data;
};

export const getAdminCalendarFeed = async (params = {}) => {
  const response = await adminApi.get('/events/calendar-feed', freshRequestConfig(params));
  return response.data.data;
};

export const getEventById = async (eventId) => {
  const response = await publicApi.get(`/events/${eventId}`, freshRequestConfig());
  return response.data.data;
};

export const createEvent = async (payload) => {
  const response = await adminApi.post('/events', payload);
  return response.data.data;
};

export const updateEvent = async (eventId, payload) => {
  const response = await adminApi.put(`/events/${eventId}`, payload);
  return response.data.data;
};

export const deleteEvent = async (eventId) => {
  const response = await adminApi.delete(`/events/${eventId}`);
  return response.data;
};

export const expressInterestInEvent = async (eventId, payload) => {
  const response = await publicApi.post(`/events/${eventId}/interests`, payload);
  return response.data;
};

export const getEventInterests = async (eventId) => {
  const response = await adminApi.get(`/events/${eventId}/interests`);
  return response.data.data;
};

export const sendEventInterestEmail = async (eventId, payload) => {
  const response = await adminApi.post(`/events/${eventId}/interests/send-email`, payload);
  return response.data;
};
