import axios from 'axios';

const BASE_URL = 'https://offersclub.offerplant.com/opex/api.php';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authAPI = {
  async sendOTP(mobile: string) {
    try {
      const response = await api.post(`${BASE_URL}?task=send_otp`, {
        mobile,
      });
      return response.data;
    } catch (error) {
      console.error('Send OTP error:', error);
      throw error;
    }
  },

  async verifyOTP(mobile: string, otp: number) {
    try {
      const response = await api.post(`${BASE_URL}?task=login`, {
        mobile,
        otp,
      });
      return response.data;
    } catch (error) {
      console.error('Verify OTP error:', error);
      throw error;
    }
  },
};

export const profileAPI = {
  async getCustomerProfile(customerId: string) {
    try {
      const response = await api.get(`${BASE_URL}?task=get_customer_profile`, {
        params: { customer_id: customerId }
      });
      return response.data;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  },

  async updateCustomerProfile(profileData: any) {
    try {
      const response = await api.post(`${BASE_URL}?task=update_customer_profile`, profileData);
      return response.data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },
};