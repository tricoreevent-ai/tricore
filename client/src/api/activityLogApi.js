import { adminApi, cleanParams } from './http.js';

export const getActivityLogs = async (params = {}) => {
  const response = await adminApi.get('/activity-logs', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const downloadActivityLogs = async (params = {}) => {
  const response = await adminApi.get('/activity-logs', {
    params: { ...cleanParams(params), format: 'csv' },
    responseType: 'blob'
  });

  return response.data;
};
