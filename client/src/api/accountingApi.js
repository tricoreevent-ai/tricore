import { adminApi, cleanParams } from './http.js';

export const getAccountingDashboard = async (params = {}) => {
  const response = await adminApi.get('/transactions/dashboard', {
    params: cleanParams(params)
  });

  return response.data.data;
};

export const getAccountingReports = async (params = {}) => {
  const response = await adminApi.get('/transactions/reports', {
    params: cleanParams(params)
  });

  return response.data.data;
};

export const downloadAccountingReports = async (params = {}) => {
  const response = await adminApi.get('/transactions/reports', {
    params: { ...cleanParams(params), format: 'csv' },
    responseType: 'blob'
  });

  return response.data;
};

// Fetch paginated transactions. Pass { page, limit, ...filters } as params.
export const getTransactions = async (params = {}) => {
  const response = await adminApi.get('/transactions', {
    params: cleanParams(params)
  });
  // Response includes: { transactions, summary, totalCount, page, limit }
  return response.data.data;
};

export const downloadTransactions = async (params = {}) => {
  const response = await adminApi.get('/transactions', {
    params: { ...cleanParams(params), format: 'csv' },
    responseType: 'blob'
  });

  return response.data;
};

export const getAccountingCategories = async (params = {}) => {
  const response = await adminApi.get('/transactions/categories', {
    params: cleanParams(params)
  });

  return response.data.data;
};

export const createAccountingCategory = async (payload) => {
  const response = await adminApi.post('/transactions/categories', payload);
  return response.data.data;
};

export const updateAccountingCategory = async (categoryKey, payload) => {
  const response = await adminApi.put(`/transactions/categories/${categoryKey}`, payload);
  return response.data.data;
};

export const deleteAccountingCategory = async (categoryKey) => {
  const response = await adminApi.delete(`/transactions/categories/${categoryKey}`);
  return response.data.data;
};

export const createTransaction = async (payload) => {
  const response = await adminApi.post('/transactions', payload);
  return response.data.data;
};

export const updateTransaction = async (transactionId, payload) => {
  const response = await adminApi.put(`/transactions/${transactionId}`, payload);
  return response.data.data;
};

export const requestTransactionOtp = async (transactionId, payload) => {
  const response = await adminApi.post(`/transactions/${transactionId}/request-otp`, payload);
  return response.data.data;
};

export const deleteTransaction = async (transactionId, payload) => {
  const response = await adminApi.delete(`/transactions/${transactionId}`, {
    data: payload
  });
  return response.data;
};
