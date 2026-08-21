import axiosInstance from './axiosInstance';
import { RECOMMENDED_API } from '../config/config';

const authHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

/**
 * Every recommended set, without question bodies. Readable by any signed-in
 * user; only admins are shown the list today.
 */
export const getAllRecommended = async (token) => {
  const res = await axiosInstance.get(RECOMMENDED_API.GET_ALL, authHeaders(token));

  return res.data?.recommended ?? [];
};

/**
 * Just the charges, which are what identifies a recommended set -- there is no
 * title, and the backend keeps charges unique so these double as names.
 */
export const getRecommendedNames = async (token) => {
  const recommended = await getAllRecommended(token);

  return recommended.map((item) => item?.charge).filter(Boolean);
};
