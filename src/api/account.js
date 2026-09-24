import axiosInstance from './axiosInstance';
import { ACCOUNT_API } from '../config/config';

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const getAccount = async (token) => {
  const res = await axiosInstance.get(ACCOUNT_API.GET, authHeaders(token));
  return res.data?.account ?? null;
};

export const updateAccount = async ({ name }, token) => {
  const res = await axiosInstance.patch(ACCOUNT_API.UPDATE, { name }, authHeaders(token));
  return res.data?.account ?? null;
};

export const getAccountUsers = async (token) => {
  const res = await axiosInstance.get(ACCOUNT_API.USERS, authHeaders(token));
  return Array.isArray(res.data?.users) ? res.data.users : [];
};

export const createAccountUser = async ({ username, email, password, role }, token) => {
  const res = await axiosInstance.post(
    ACCOUNT_API.USERS,
    { username, email, password, role },
    authHeaders(token),
  );
  return res.data?.user ?? null;
};

export const updateAccountUser = async (userId, { role, status }, token) => {
  const res = await axiosInstance.patch(
    ACCOUNT_API.USER(userId),
    { role, status },
    authHeaders(token),
  );
  return res.data?.user ?? null;
};
