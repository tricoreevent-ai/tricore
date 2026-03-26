import { adminApi, publicApi } from './http.js';

export const submitContactInquiry = async (payload) => {
  const response = await publicApi.post('/contact', payload);
  return response.data.data;
};

export const getContactForwardingSettings = async () => {
  const response = await adminApi.get('/settings/contact-forwarding');
  return response.data.data;
};

export const updateContactForwardingSettings = async (payload) => {
  const response = await adminApi.put('/settings/contact-forwarding', payload);
  return response.data.data;
};

export const getContactSubmissions = async (params = {}) => {
  const response = await adminApi.get('/contact/submissions', { params });
  return response.data.data;
};
