export const QuestionType = {
  TRUE_FALSE: 'TRUE_FALSE',
  MULTIPLE_CHOICE: 'MULTIPLE_CHOICE',
};

// Optional, viewer-only student details (spec 005). The limits must match the
// backend's src/types.js, which enforces them.
export const StudentGender = {
  MALE: 'male',
  FEMALE: 'female',
};

export const STUDENT_DETAIL_LIMITS = {
  AGE_MIN: 18,
  AGE_MAX: 120,
  OCCUPATION_MAX: 100,
  RACE_MAX: 50,
};

// Points one student can gain or lose in the individual round (spec 019), in
// either direction. Must match the backend's INDIVIDUAL_ROUND_MAX.
export const INDIVIDUAL_ROUND_LIMIT = 1000;

// Case classification lives in ./caseCategories.js -- import
// CASE_CATEGORIES_BY_AREA / caseCategoryLabel from there.
