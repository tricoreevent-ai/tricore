import { adminApi, cleanParams } from './http.js';

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
    filename:
      response.headers['content-disposition']
        ?.split('filename=')
        ?.pop()
        ?.replace(/"/g, '')
        ?.trim() || 'audience-users.csv'
  };
};

export const getAudienceCampaignConfig = async () => {
  const response = await adminApi.get('/audience/campaign-config');
  return response.data.data;
};

export const updateAudienceCampaignConfig = async (payload) => {
  const response = await adminApi.put('/audience/campaign-config', payload);
  return response.data.data;
};

export const getAudienceCampaigns = async (params = {}) => {
  const response = await adminApi.get('/audience/campaigns', {
    params: cleanParams(params)
  });
  return response.data.data;
};

export const sendAudienceCampaign = async (payload) => {
  const response = await adminApi.post('/audience/campaigns', payload);
  return response.data.data;
};
