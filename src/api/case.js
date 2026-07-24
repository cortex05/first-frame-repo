import axiosInstance from './axiosInstance';
import { CASE_API } from '../config/config';

export const createCase = async (casePayload, token) => {
  const res = await axiosInstance.post(CASE_API.CREATE, casePayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.data;
}; 
