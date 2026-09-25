import { QuestionType } from '../types/ENUMS';

/**
 * Student totals and risk tiers. The single source for both the live Scores
 * view (QuestionsScreen circle colors, sort and report modals) and the
 * archive report -- changing `bandTier` changes both, which is the point: a
 * student's archived risk must equal the color they had in the session.
 *
 * Students are identified by their student number: `assignedStudents[].id` in
 * `chartData.rects` is a number, while the keys of `answers[questionId]` are
 * strings once the case has been through JSON. Look answers up by String().
 */

export const RISK_TIERS = ['low', 'medium', 'high'];

export const RISK_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

/**
 * Splits the RANGE between `min` and `max` into three equal bands -- not the
 * students into rank-thirds. A value exactly on a boundary falls in the lower
 * band. When everything is equal, everything is low.
 */
export const bandTier = (value, min, max) => {
  if (max === min) return 'low';
  const range = max - min;
  if (value <= min + range / 3) return 'low';
  if (value <= min + (2 * range) / 3) return 'medium';
  return 'high';
};

export const getAnswer = (caseLike, questionId, studentNumber) =>
  caseLike?.answers?.[questionId]?.[String(studentNumber)];

// A missing answer, or one without a numeric value, is worth nothing.
export const answerPoints = (answer) => {
  const points = Number(answer?.value);
  return Number.isFinite(points) ? points : 0;
};

/** Sum over the case's current questions; answers for removed questions don't count. */
export const getStudentTotal = (caseLike, studentNumber) =>
  (caseLike?.questions || []).reduce(
    (sum, question) => sum + answerPoints(getAnswer(caseLike, question.id, studentNumber)),
    0,
  );

const toSortedNumbers = (values) =>
  [...new Set(values.map(Number).filter(Number.isFinite))].sort((a, b) => a - b);

export const getSeatedStudentNumbers = (chartData) =>
  toSortedNumbers(
    (chartData?.rects || []).flatMap((rect) =>
      (rect.assignedStudents || []).map((student) => student.id),
    ),
  );

// Fallback for a case with no seating chart: whoever has a saved answer.
export const getAnsweredStudentNumbers = (answers) =>
  toSortedNumbers(
    Object.values(answers || {}).flatMap((questionAnswers) =>
      questionAnswers && typeof questionAnswers === 'object' ? Object.keys(questionAnswers) : [],
    ),
  );

export const getReportStudentNumbers = (caseLike) => {
  const seated = getSeatedStudentNumbers(caseLike?.chartData);
  return seated.length > 0 ? seated : getAnsweredStudentNumbers(caseLike?.answers);
};

/**
 * Risk tier per student, banded over the totals of the given students only.
 * Returns Map<studentNumber, 'low' | 'medium' | 'high'>.
 */
export const getRiskTiers = (caseLike, studentNumbers) => {
  const totals = studentNumbers.map((number) => [number, getStudentTotal(caseLike, number)]);
  if (totals.length === 0) return new Map();

  const values = totals.map(([, total]) => total);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return new Map(totals.map(([number, total]) => [number, bandTier(total, min, max)]));
};

/**
 * How costly one answer was relative to that question's options: its value
 * banded between the lowest and highest option value. Null when unanswered.
 */
export const getAnswerTier = (question, answer) => {
  if (answer === undefined || answer === null) return null;

  const optionValues = (question?.options || [])
    .map((option) => Number(option.value))
    .filter(Number.isFinite);
  if (optionValues.length === 0) return 'low';

  return bandTier(answerPoints(answer), Math.min(...optionValues), Math.max(...optionValues));
};

const isTrue = (label) => label === true || label === 'true';
const isFalse = (label) => label === false || label === 'false';

export const formatAnswerLabel = (question, answer) => {
  if (answer === undefined || answer === null) return 'No answer';

  const { label } = answer;
  if (question?.type === QuestionType.TRUE_FALSE) {
    if (isTrue(label)) return 'True';
    if (isFalse(label)) return 'False';
  }
  return label === undefined || label === null ? '—' : String(label);
};
