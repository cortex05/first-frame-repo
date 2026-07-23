import axiosInstance from './axiosInstance';
import { AUTH_API } from '../config/config';

export const login = async (credentials) => {
  const res = await axiosInstance.post(AUTH_API.LOGIN, credentials);
  return res.data.data;
};

export const register = async (credentials) => {
  const res = await axiosInstance.post(AUTH_API.REGISTER, credentials);
  return res.data.data;
};
