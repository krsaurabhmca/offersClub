import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  USER_DATA: 'userData',
  CUSTOMER_ID: 'customerId',
  MOBILE: 'mobile',
};

export const storage = {
  async setUserData(data: any) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  },

  async getUserData() {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async setCustomerId(id: string) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMER_ID, id);
    } catch (error) {
      console.error('Error saving customer ID:', error);
    }
  },

  async getCustomerId() {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMER_ID);
    } catch (error) {
      console.error('Error getting customer ID:', error);
      return null;
    }
  },

  async clearAll() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};