import axiosInstance from './axiosInstance';
import { AUTH_API } from '../config/config';

export const login = async (credentials) => {
  const res = await axiosInstance.post(AUTH_API.LOGIN, credentials);
  return res.data.data;
};

// Creates an account and its first user (the account admin), and signs them in.
export const register = async ({ accountName, username, email, password }) => {
  const res = await axiosInstance.post(AUTH_API.REGISTER, {
    accountName,
    username,
    email,
    password,
  });
  return res.data.data;
};

// Returns a fresh session with mustChangePassword cleared.
export const changePassword = async ({ currentPassword, newPassword }, token) => {
  const res = await axiosInstance.post(
    AUTH_API.CHANGE_PASSWORD,
    { currentPassword, newPassword },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  return res.data.data;
};
