import { adminApi, cleanParams, publicApi } from './http.js';

export const createFreeRegistration = async (payload) => {
  const response = await publicApi.post('/register', payload);
  return response.data.data;
};

export const createManualRegistration = async (payload) => {
  const response = await publicApi.post('/register/manual', payload);
  return response.data.data;
};

export const getMyRegistrations = async () => {
  const response = await publicApi.get('/registrations/me');
  return response.data.data;
};

export const getMyRegistrationForEvent = async (eventId) => {
  const response = await publicApi.get(`/registrations/me/event/${eventId}`);
  return response.data.data;
};

export const getAdminRegistrations = async (params = {}) => {
  const response = await adminApi.get('/registrations', { params: cleanParams(params) });
  return response.data.data;
};

export const downloadAdminRegistrations = async (params = {}) => {
  const response = await adminApi.get('/registrations', {
    params: { ...cleanParams(params), format: 'csv' },
    responseType: 'blob'
  });
  return response.data;
};

export const updateAdminRegistration = async (registrationId, payload) => {
  const response = await adminApi.put(`/registrations/${registrationId}`, payload);
  return response.data.data;
};

export const confirmRegistrationPayment = async (registrationId, payload) => {
  const response = await adminApi.post(`/registrations/${registrationId}/confirm-payment`, payload);
  return response.data.data;
};
