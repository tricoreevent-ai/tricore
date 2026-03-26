import { publicApi } from './http.js';

export const createOrder = async (eventId) => {
  const response = await publicApi.post('/create-order', { eventId });
  return response.data.data;
};

export const verifyPayment = async (payload) => {
  const response = await publicApi.post('/verify-payment', payload);
  return response.data.data;
};
