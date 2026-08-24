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

/**
 * The single recommended set covering a charge, or null when nothing has been
 * curated for it yet. The backend keeps charges unique, so the charge is a
 * stable identifier and the response carries the `_id` needed to edit or delete.
 */
export const getRecommendedForCharge = async (charge, token) => {
  const res = await axiosInstance.get(RECOMMENDED_API.LOOKUP, {
    ...authHeaders(token),
    params: { charge },
  });

  const recommended = res.data?.recommended ?? null;
  if (!recommended) return null;

  return {
    ...recommended,
    questions: normalizeQuestions(recommended.questions),
  };
};

/**
 * Replaces the questions on a recommended set. Any administrator may edit any
 * set -- these are shared content, so they are not scoped to their author.
 */
export const updateRecommended = async (recommendedId, updates, token) => {
  const payload = {};

  if (updates?.charge !== undefined) payload.charge = updates.charge;
  if (updates?.questions !== undefined) {
    payload.questions = normalizeQuestions(updates.questions);
  }

  const res = await axiosInstance.patch(
    RECOMMENDED_API.UPDATE(recommendedId),
    payload,
    authHeaders(token),
  );

  const recommended = res.data?.recommended ?? null;
  if (!recommended) return null;

  return {
    ...recommended,
    questions: normalizeQuestions(recommended.questions),
  };
};

/** Deletes a recommended set, freeing its charge for a new one. */
export const deleteRecommended = async (recommendedId, token) => {
  const res = await axiosInstance.delete(
    RECOMMENDED_API.DELETE(recommendedId),
    authHeaders(token),
  );

  return res.data ?? null;
};
