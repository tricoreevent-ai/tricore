import { publicApi } from './http.js';

export const getPublicHomeBanners = async () => {
  const response = await publicApi.get('/home-banners');
  return response.data.data.banners || [];
};

export const getPublicHomePageContent = async () => {
  const response = await publicApi.get('/home-page');
  return response.data.data;
};

export const getPublicPaymentSettings = async () => {
  const response = await publicApi.get('/payment-settings');
  return response.data.data;
};

export const getPublicSiteConfiguration = async () => {
  const response = await publicApi.get('/site-settings');
  return response.data.data;
};
