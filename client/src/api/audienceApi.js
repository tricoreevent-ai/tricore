import { adminApi, cleanParams } from './http.js';

const extractFilename = (headers, fallback) =>
  headers['content-disposition']?.split('filename=')?.pop()?.replace(/"/g, '')?.trim() || fallback;

export const getAudienceUsers = async (params = {}) => {
  const response = await adminApi.get('/audience/users', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const exportAudienceUsers = async (params = {}) => {
  const response = await adminApi.get('/audience/users/export', {
    params: cleanParams(params),
    responseType: 'blob'
  });

  return {
    blob: response.data,
    filename: extractFilename(response.headers, 'audience-users.csv')
  };
};

export const getAudienceUserCampaignHistory = async (params = {}) => {
  const response = await adminApi.get('/audience/users/history', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const getAudienceUnsubscribedUsers = async (params = {}) => {
  const response = await adminApi.get('/audience/users/unsubscribed', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const updateAudienceUserPreference = async (email, payload) => {
  const response = await adminApi.put(`/audience/users/${encodeURIComponent(email)}/preferences`, payload);
  return response.data.data;
};

export const getAudienceCampaignConfig = async () => {
  const response = await adminApi.get('/audience/campaign-config');
  return response.data.data;
};

export const updateAudienceCampaignConfig = async (payload) => {
  const response = await adminApi.put('/audience/campaign-config', payload);
  return response.data.data;
};

export const getAudienceCampaignDashboard = async () => {
  const response = await adminApi.get('/audience/campaign-dashboard');
  return response.data.data;
};

export const getAudienceCampaigns = async (params = {}) => {
  const response = await adminApi.get('/audience/campaigns', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const exportAudienceCampaigns = async () => {
  const response = await adminApi.get('/audience/campaigns/export', {
    responseType: 'blob'
  });

  return {
    blob: response.data,
    filename: extractFilename(response.headers, 'audience-campaigns.csv')
  };
};

export const createAudienceCampaign = async (payload) => {
  const response = await adminApi.post('/audience/campaigns', payload);
  return response.data.data;
};

export const reviewAudienceCampaign = async (campaignId, payload) => {
  const response = await adminApi.post(`/audience/campaigns/${campaignId}/review`, payload);
  return response.data.data;
};

export const sendAudienceCampaignTest = async (payload) => {
  const response = await adminApi.post('/audience/campaigns/test', payload);
  return response.data.data;
};

export const getAudienceCampaignTemplates = async () => {
  const response = await adminApi.get('/audience/campaign-templates');
  return response.data.data;
};

export const createAudienceCampaignTemplate = async (payload) => {
  const response = await adminApi.post('/audience/campaign-templates', payload);
  return response.data.data;
};

export const updateAudienceCampaignTemplate = async (templateId, payload) => {
  const response = await adminApi.put(`/audience/campaign-templates/${templateId}`, payload);
  return response.data.data;
};

export const deleteAudienceCampaignTemplate = async (templateId) => {
  const response = await adminApi.delete(`/audience/campaign-templates/${templateId}`);
  return response.data.data;
};
