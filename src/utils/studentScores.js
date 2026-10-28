import { INDIVIDUAL_ROUND_LIMIT, QuestionType } from '../types/ENUMS';

/**
 * Student totals and risk tiers. The single source for both the live Scores
 * view (QuestionsScreen circle colors, sort and report modals) and the
 * archive report -- changing `bandTier` changes both, which is the point: a
 * student's archived risk must equal the color they had in the session.
 *
 * Students are identified by their student number: `assignedStudents[].id` in
 * `chartData.rects` is a number, while the keys of `answers[questionId]` (and
 * of `individualRound`) are strings once the case has been through JSON. Look
 * them up by String().
 *
 * A student's total is their answer points plus their individual-round points
 * (spec 019), and risk is banded over those totals.
 */

export const RISK_TIERS = ['low', 'medium', 'high'];

export const RISK_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };
// One-letter tier for tight spots (the Scores circles), so the tier never relies
// on color alone (spec 016).
export const RISK_LETTERS = { high: 'H', medium: 'M', low: 'L' };

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

/**
 * Whether the case has saved answers for this question -- even an empty set.
 * It replaces the stored `firstPoll` flag (spec 010): a polled true/false
 * question reopens with its saved answers instead of the false defaults.
 */
export const isPolled = (caseLike, questionId) =>
  Object.hasOwn(caseLike?.answers ?? {}, questionId);

export const getAnswer = (caseLike, questionId, studentNumber) =>
  caseLike?.answers?.[questionId]?.[String(studentNumber)];

// A missing answer, or one without a numeric value, is worth nothing.
export const answerPoints = (answer) => {
  const points = Number(answer?.value);
  return Number.isFinite(points) ? points : 0;
};

/**
 * Points given to or taken from the student outside any question (spec 019).
 * A student with no entry, or a case from before the field, has 0.
 */
export const getIndividualPoints = (caseLike, studentNumber) => {
  const points = Number(caseLike?.individualRound?.[String(studentNumber)]);
  return Number.isFinite(points) ? points : 0;
};

/** Keeps a tapped-up value within what the server accepts. */
export const clampIndividualPoints = (points) =>
  Math.min(INDIVIDUAL_ROUND_LIMIT, Math.max(-INDIVIDUAL_ROUND_LIMIT, points));

/**
 * The color tier of a seat in the Individual view, from that student's own
 * individual-round points alone (not banded over the class): none at 0, low
 * below 0, medium for 1-3, high from 4.
 */
export const individualPointsTier = (points) => {
  if (points === 0) return null;
  if (points < 0) return 'low';
  return points <= 3 ? 'medium' : 'high';
};

/**
 * The sign always shows: '+2', '-1', '0' -- or '+ 2' / '- 1' with `spaced`,
 * as the Individual view's seat circles show it.
 */
export const formatIndividualPoints = (points, { spaced = false } = {}) => {
  if (points === 0) return '0';
  const sign = points > 0 ? '+' : '-';
  return `${sign}${spaced ? ' ' : ''}${Math.abs(points)}`;
};

/**
 * Sum over the case's current questions (answers for removed questions don't
 * count), plus the individual round.
 */
export const getStudentTotal = (caseLike, studentNumber) =>
  (caseLike?.questions || []).reduce(
    (sum, question) => sum + answerPoints(getAnswer(caseLike, question.id, studentNumber)),
    0,
  ) + getIndividualPoints(caseLike, studentNumber);

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
