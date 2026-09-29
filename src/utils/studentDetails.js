import { STUDENT_DETAIL_LIMITS, StudentGender } from '../types/ENUMS';

/**
 * Optional, viewer-only details about a student (spec 005). They never affect
 * scores or risk tiers, and the backend never archives them.
 *
 * `case.studentDetails` is keyed by String(student number), like
 * `answers[questionId]`, and each entry holds only the fields that are set.
 */

export const DETAIL_FIELDS = [
  { key: 'age', label: 'Age' },
  { key: 'occupation', label: 'Occupation' },
  { key: 'gender', label: 'Gender' },
  { key: 'race', label: 'Race' },
];

const GENDER_LABELS = {
  [StudentGender.MALE]: 'Male',
  [StudentGender.FEMALE]: 'Female',
};

const isEmpty = (value) =>
  value === undefined || value === null || String(value).trim() === '';

export const getStudentDetails = (caseLike, studentNumber) =>
  caseLike?.studentDetails?.[String(studentNumber)] ?? {};

/** Display text for one detail: '?' when it isn't set. */
export const formatDetail = (field, value) => {
  if (isEmpty(value)) return '?';
  if (field === 'gender') return GENDER_LABELS[value] ?? String(value);
  return String(value);
};

/** Input values for the edit form; every field is a string. */
export const toDraft = (details = {}) =>
  Object.fromEntries(
    DETAIL_FIELDS.map(({ key }) => [key, isEmpty(details[key]) ? '' : String(details[key])]),
  );

const AGE_ERROR = `Age must be a whole number from ${STUDENT_DETAIL_LIMITS.AGE_MIN} to ${STUDENT_DETAIL_LIMITS.AGE_MAX}.`;

/** Returns an error message for the draft, or null when it can be saved. */
export const validateStudentDetails = (draft) => {
  const age = String(draft?.age ?? '').trim();
  if (age === '') return null;

  const parsed = Number(age);
  if (
    !/^\d+$/.test(age) ||
    parsed < STUDENT_DETAIL_LIMITS.AGE_MIN ||
    parsed > STUDENT_DETAIL_LIMITS.AGE_MAX
  ) {
    return AGE_ERROR;
  }
  return null;
};

/** The request body: trimmed values, `null` for empty, age as a number. */
export const toDetailsPayload = (draft) =>
  Object.fromEntries(
    DETAIL_FIELDS.map(({ key }) => {
      const value = String(draft?.[key] ?? '').trim();
      if (value === '') return [key, null];
      return [key, key === 'age' ? Number(value) : value];
    }),
  );

/** Only `studentDetails` changes, so unsaved seating or answers survive. */
export const mergeStudentDetails = (caseLike, studentDetails) => ({
  ...caseLike,
  studentDetails: studentDetails ?? {},
});

/**
 * Local-only save (no token): the same rules as the backend, where an entry
 * with every field empty is removed rather than stored.
 */
export const applyLocalStudentDetails = (caseLike, studentNumber, payload) => {
  const entry = Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => !isEmpty(value)),
  );
  const studentDetails = { ...(caseLike?.studentDetails || {}) };
  if (Object.keys(entry).length) {
    studentDetails[String(studentNumber)] = entry;
  } else {
    delete studentDetails[String(studentNumber)];
  }

  return mergeStudentDetails(caseLike, studentDetails);
};
