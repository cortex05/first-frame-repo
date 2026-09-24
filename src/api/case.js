import axiosInstance from './axiosInstance';
import { CASE_API } from '../config/config';
import { normalizeCaseQuestionsPayload } from '../utils/questionNormalization';

export const getUserCases = async (token) => {
  const res = await axiosInstance.get(CASE_API.GET_ALL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const rawCases =
    res.data?.data?.cases ??
    res.data?.data ??
    res.data?.cases ??
    [];

  if (!Array.isArray(rawCases)) {
    return [];
  }

  return rawCases.map((singleCase) => normalizeCaseQuestionsPayload(singleCase));
};

export const createCase = async (casePayload, token) => {
  const normalizedPayload = normalizeCaseQuestionsPayload(casePayload);

  const res = await axiosInstance.post(CASE_API.CREATE, normalizedPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};

export const saveCase = async (caseId, casePayload, token) => {
  const normalizedPayload = normalizeCaseQuestionsPayload(casePayload);

  const res = await axiosInstance.put(CASE_API.UPDATE(caseId), normalizedPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};

// Account admins only. Replaces the whole owner list.
export const setCaseOwners = async (caseId, owners, token) => {
  const res = await axiosInstance.put(CASE_API.OWNERS(caseId), { owners }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};

// Moves a complete case into the archive. Returns the archived snapshot.
export const archiveCase = async (caseId, token) => {
  const res = await axiosInstance.post(CASE_API.ARCHIVE(caseId), null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};
