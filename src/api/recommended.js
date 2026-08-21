import axiosInstance from './axiosInstance';
import { RECOMMENDED_API } from '../config/config';
import { normalizeQuestions } from '../utils/questionNormalization';

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

/**
 * Creates a recommended playlist. `createdBy` is not sent -- the backend sets it
 * from the authenticated admin's token, so it cannot be spoofed by the client.
 */
export const createRecommended = async (recommendedPayload, token) => {
  const normalizedPayload = {
    charge: recommendedPayload.charge,
    questions: normalizeQuestions(recommendedPayload.questions),
  };

  const res = await axiosInstance.post(
    RECOMMENDED_API.CREATE,
    normalizedPayload,
    authHeaders(token),
  );

  const recommended = res.data?.recommended ?? null;
  if (!recommended) return null;

  return {
    ...recommended,
    questions: normalizeQuestions(recommended.questions),
  };
};
