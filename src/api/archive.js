import axiosInstance from './axiosInstance';
import { ARCHIVE_API } from '../config/config';
import { normalizeCaseQuestionsPayload } from '../utils/questionNormalization';

export const getArchivedCases = async (token) => {
  const res = await axiosInstance.get(ARCHIVE_API.GET_ALL, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return Array.isArray(res.data?.data) ? res.data.data : [];
};

export const getArchivedCase = async (archivedCaseId, token) => {
  const res = await axiosInstance.get(ARCHIVE_API.GET_BY_ID(archivedCaseId), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};
