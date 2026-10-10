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

// The server's answer to a whole-case save carrying an outdated `revision`:
// someone else changed the case first, and nothing was written.
export const isCaseConflict = (requestError) =>
  requestError?.response?.status === 409 &&
  requestError?.response?.data?.code === 'CASE_CONFLICT';

// Whole-case save. The payload's `revision` (from the last server copy) makes
// the server refuse it with 409 CASE_CONFLICT if the case changed meanwhile.
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

// Records the start of the session on the case's purchase transaction (only the
// first start counts). Returns { caseId, transactionStatus }.
export const startCase = async (caseId, token) => {
  const res = await axiosInstance.post(CASE_API.START(caseId), null, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.data;
};

// Replaces one student's optional details. Returns
// { caseId, studentNumber, studentDetails } with the case's whole details map.
export const saveStudentDetails = async (caseId, studentNumber, details, token) => {
  const res = await axiosInstance.put(CASE_API.STUDENT_DETAILS(caseId, studentNumber), details, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data.data;
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

// Replaces the answers to one question only, so people answering different
// questions of the same case don't overwrite each other. `answers` is
// { [studentNumber]: option }. Returns the whole updated case.
export const saveQuestionAnswers = async (caseId, questionId, answers, token) => {
  const res = await axiosInstance.put(CASE_API.ANSWERS(caseId, questionId), { answers }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};

// Saves the seating chart and seated students and marks the case seated,
// without touching answers or questions. Returns the whole updated case.
export const saveSeating = async (caseId, { chartData, students }, token) => {
  const res = await axiosInstance.put(CASE_API.SEATING(caseId), { chartData, students }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return normalizeCaseQuestionsPayload(res.data.data);
};
