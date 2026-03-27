import { adminApi, cleanParams, publicApi } from './http.js';

export const getUserDashboard = async () => {
  const response = await publicApi.get('/dashboard/me');
  return response.data.data;
};

export const getAdminDashboard = async () => {
  const response = await adminApi.get('/admin/dashboard');
  return response.data.data;
};

export const getAccountingReport = async (params = {}) => {
  const response = await adminApi.get('/admin/accounting', { params: cleanParams(params) });
  return response.data.data;
};

export const downloadAccountingReport = async (params = {}) => {
  const response = await adminApi.get('/admin/accounting', {
    params: { ...cleanParams(params), format: 'csv' },
    responseType: 'blob'
  });

  return response.data;
};

export const getReportsOverview = async (params = {}) => {
  const response = await adminApi.get('/admin/reports/overview', { params: cleanParams(params) });
  return response.data.data;
};

export const downloadReportsOverview = async () => {
  const response = await adminApi.get('/admin/reports/overview', {
    params: { format: 'csv' },
    responseType: 'blob'
  });

  return response.data;
};

export const createMatch = async (payload) => {
  const response = await adminApi.post('/matches', payload);
  return response.data.data;
};

export const generateKnockoutBracket = async (payload) => {
  const response = await adminApi.post('/matches/generate-knockout', payload);
  return response.data.data;
};

export const getConfirmedTeamsByEvent = async (eventId) => {
  const response = await adminApi.get(`/matches/event/${eventId}/confirmed-teams`);
  return response.data.data;
};

export const getAdminMatchesByEvent = async (eventId) => {
  const response = await adminApi.get(`/matches/${eventId}`);
  return response.data.data;
};

export const getMatchesByEvent = async (eventId) => {
  const response = await publicApi.get(`/matches/${eventId}`);
  return response.data.data;
};
