import { adminApi } from './http.js';

export const getEmailConfiguration = async () => {
  const response = await adminApi.get('/settings/email');
  return response.data.data;
};

export const getInvoiceConfiguration = async () => {
  const response = await adminApi.get('/settings/invoice');
  return response.data.data;
};

export const updateInvoiceConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/invoice', payload);
  return response.data.data;
};

export const updateEmailConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/email', payload);
  return response.data.data;
};

export const sendTestEmail = async (payload) => {
  const response = await adminApi.post('/settings/email/test', payload);
  return response.data;
};

export const getBackupConfiguration = async () => {
  const response = await adminApi.get('/settings/backup');
  return response.data.data;
};

export const updateBackupConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/backup', payload);
  return response.data.data;
};

export const downloadBackupNow = async () =>
  adminApi.get('/settings/backup/download', {
    params: { _ts: Date.now() },
    responseType: 'blob'
  });

export const getBackupDatabaseInfo = async () => {
  const response = await adminApi.get('/settings/backup/database-info', {
    params: { _ts: Date.now() }
  });
  return response.data.data;
};

export const getTransactionOtpConfiguration = async () => {
  const response = await adminApi.get('/settings/transaction-otp');
  return response.data.data;
};

export const updateTransactionOtpConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/transaction-otp', payload);
  return response.data.data;
};

export const sendBackupNow = async (payload) => {
  const response = await adminApi.post('/settings/backup/send', payload);
  return response.data;
};

export const restoreBackupNow = async (payload) => {
  const response = await adminApi.post('/settings/backup/restore', payload);
  return response.data;
};

export const getPaymentConfiguration = async () => {
  const response = await adminApi.get('/settings/payment');
  return response.data.data;
};

export const updatePaymentConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/payment', payload);
  return response.data.data;
};

export const getHomeBannerConfiguration = async () => {
  const response = await adminApi.get('/settings/home-banners');
  return response.data.data;
};

export const updateHomeBannerConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/home-banners', payload);
  return response.data.data;
};

export const getHomePageConfiguration = async () => {
  const response = await adminApi.get('/settings/home-page');
  return response.data.data;
};

export const updateHomePageConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/home-page', payload);
  return response.data.data;
};

export const getPublicSiteConfiguration = async () => {
  const response = await adminApi.get('/settings/public-site');
  return response.data.data;
};

export const updatePublicSiteConfiguration = async (payload) => {
  const response = await adminApi.put('/settings/public-site', payload);
  return response.data.data;
};
