import { adminApi, publicApi } from './http.js';

export const loginWithGoogleToken = async (credential) => {
  const response = await publicApi.post('/auth/google', { credential });
  return response.data.data;
};

export const getCurrentUser = async () => {
  const response = await publicApi.get('/auth/me');
  return response.data.data;
};

export const updatePayoutDetails = async (payload) => {
  const response = await publicApi.put('/auth/me/payout-details', payload);
  return response.data.data;
};

export const loginAdmin = async (credentials) => {
  const response = await adminApi.post('/auth/admin/login', credentials);
  return response.data.data;
};

export const getCurrentAdmin = async () => {
  const response = await adminApi.get('/auth/me');
  return response.data.data;
};

export const getCurrentAdminPermissions = async () => {
  const response = await adminApi.get('/auth/admin/permissions');
  return response.data.data.permissions || [];
};

export const getAdminUsers = async () => {
  const response = await adminApi.get('/auth/admin/users');
  return response.data.data;
};

export const createAdminUser = async (payload) => {
  const response = await adminApi.post('/auth/admin/users', payload);
  return response.data.data;
};

export const updateAdminUser = async (userId, payload) => {
  const response = await adminApi.put(`/auth/admin/users/${userId}`, payload);
  return response.data.data;
};

export const updateAdminUserAccess = async (userId, payload) => {
  const response = await adminApi.put(`/auth/admin/users/${userId}/access`, payload);
  return response.data.data;
};

export const resetAdminUserPassword = async (userId, payload) => {
  const response = await adminApi.post(`/auth/admin/users/${userId}/password`, payload);
  return response.data.data;
};

export const deleteAdminUser = async (userId) => {
  const response = await adminApi.delete(`/auth/admin/users/${userId}`);
  return response.data.data;
};

export const getAdminRoleTemplates = async () => {
  const response = await adminApi.get('/auth/admin/role-templates');
  return response.data.data;
};

export const createAdminRoleTemplate = async (payload) => {
  const response = await adminApi.post('/auth/admin/role-templates', payload);
  return response.data.data;
};

export const updateAdminRoleTemplate = async (roleKey, payload) => {
  const response = await adminApi.put(`/auth/admin/role-templates/${roleKey}`, payload);
  return response.data.data;
};

export const updateAdminRoleTemplateStatus = async (roleKey, payload) => {
  const response = await adminApi.patch(`/auth/admin/role-templates/${roleKey}/status`, payload);
  return response.data.data;
};

export const deleteAdminRoleTemplate = async (roleKey) => {
  const response = await adminApi.delete(`/auth/admin/role-templates/${roleKey}`);
  return response.data.data;
};

export const changeAdminPassword = async (payload) => {
  const response = await adminApi.post('/auth/admin/change-password', payload);
  return response.data.data;
};
