import { adminApi, cleanParams } from './http.js';

export const getSecurityAlerts = async (params = {}) => {
  const response = await adminApi.get('/security-alerts', {
    params: cleanParams(params)
  });

  return response.data.data;
};

export const acknowledgeSecurityAlert = async (alertId) => {
  const response = await adminApi.post(`/security-alerts/${alertId}/acknowledge`);
  return response.data.data;
};
