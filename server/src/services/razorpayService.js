import Razorpay from 'razorpay';

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const getRazorpayClient = () => {
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new ApiError(500, 'Razorpay is not configured on the server.');
  }

  return new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret
  });
};
