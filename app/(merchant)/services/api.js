import axios from 'axios';

const BASE_URL = 'https://offersclub.offerplant.com/opex/api.php';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendOTP = async (mobile) => {
  try {
    const response = await api.post('', {
      task: 'merchant_send_otp',
      mobile: mobile,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const verifyOTP = async (mobile, otp) => {
  try {
    const response = await api.post('', {
      task: 'merchant_login',
      mobile: mobile,
      otp: otp,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};