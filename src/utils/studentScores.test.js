import { describe, expect, it } from 'vitest';

import {
  answerPoints,
  bandTier,
  formatAnswerLabel,
  getAnswerTier,
  getReportStudentNumbers,
  getRiskTiers,
  getSeatedStudentNumbers,
  getStudentTotal,
} from './studentScores';

const TF = (id, trueValue) => ({
  id,
  type: 'TRUE_FALSE',
  options: [
    { label: true, value: trueValue },
    { label: false, value: 0 },
  ],
});
const MC = (id, values) => ({
  id,
  type: 'MULTIPLE_CHOICE',
  options: values.map((value, i) => ({ label: `Option ${i + 1}`, value })),
});
const seat = (...numbers) => ({ rects: [{ assignedStudents: numbers.map((id) => ({ id })) }] });

// Answers keyed by student number as strings, the way they come back from the API.
const caseWith = (questions, answersByStudent, chartData) => ({
  questions,
  chartData,
  answers: Object.fromEntries(
    questions.map((q) => [
      q.id,
      Object.fromEntries(
        Object.entries(answersByStudent)
          .filter(([, perQuestion]) => perQuestion[q.id] !== undefined)
          .map(([student, perQuestion]) => [String(student), { value: perQuestion[q.id] }]),
      ),
    ]),
  ),
});

describe('getStudentTotal', () => {
  it('sums the values across the case questions', () => {
    const c = caseWith([TF('q-1', 5), TF('q-2', 3)], { 1: { 'q-1': 5, 'q-2': 3 } });

    expect(getStudentTotal(c, 1)).toBe(8);
  });

  it('counts missing and non-numeric answers as 0', () => {
    const c = {
      questions: [TF('q-1', 5), TF('q-2', 3)],
      answers: { 'q-1': { 1: { value: 'abc' } } },
    };

    expect(getStudentTotal(c, 1)).toBe(0);
    expect(answerPoints(undefined)).toBe(0);
  });

  it('ignores answers for questions no longer on the case', () => {
    const c = {
      questions: [TF('q-1', 5)],
      answers: { 'q-1': { 1: { value: 5 } }, 'q-gone': { 1: { value: 100 } } },
    };

    expect(getStudentTotal(c, 1)).toBe(5);
  });

  it('matches numeric student numbers to string answer keys', () => {
    const c = { questions: [TF('q-1', 5)], answers: { 'q-1': { 3: { value: 5 } } } };

    expect(getStudentTotal(c, 3)).toBe(5);
    expect(getStudentTotal(c, '3')).toBe(5);
  });
});

describe('getRiskTiers', () => {
  const tiersFor = (totals) => {
    const q = MC('q-1', totals);
    const answers = Object.fromEntries(totals.map((value, i) => [i + 1, { 'q-1': value }]));
    const c = caseWith([q], answers);
    return [...getRiskTiers(c, totals.map((_, i) => i + 1)).values()];
  };

  it('bands the score RANGE into thirds, not the students', () => {
    expect(tiersFor([0, 1, 2, 10])).toEqual(['low', 'low', 'low', 'high']);
  });

  it('spreads an even range across all three tiers', () => {
    expect(tiersFor([0, 5, 10])).toEqual(['low', 'medium', 'high']);
  });

  it('puts totals exactly on a boundary in the lower band', () => {
    // range 12: boundaries at 4 and 8
    expect(tiersFor([0, 4, 8, 12])).toEqual(['low', 'low', 'medium', 'high']);
  });

  it('makes everyone low when all totals are equal or there is one student', () => {
    expect(tiersFor([3, 3, 3])).toEqual(['low', 'low', 'low']);
    expect(tiersFor([7])).toEqual(['low']);
    expect(getRiskTiers({ questions: [], answers: {} }, []).size).toBe(0);
  });
});

describe('getAnswerTier', () => {
  const q = TF('q-1', 5);

  it('bands an answer between the question option values', () => {
    expect(getAnswerTier(q, { value: 0 })).toBe('low');
    expect(getAnswerTier(q, { value: 5 })).toBe('high');
    expect(getAnswerTier(MC('q-2', [0, 3, 6]), { value: 3 })).toBe('medium');
  });

  it('is low when options cannot be banded, and null when unanswered', () => {
    expect(getAnswerTier(MC('q-3', [2]), { value: 2 })).toBe('low');
    expect(getAnswerTier({ id: 'q-4', options: [] }, { value: 1 })).toBe('low');
    expect(getAnswerTier(q, undefined)).toBeNull();
  });
});

describe('student lists', () => {
  it('lists seated students once each, in numeric order', () => {
    const chart = { rects: [{ assignedStudents: [{ id: 10 }, { id: 9 }] }, { assignedStudents: [{ id: 1 }, { id: 9 }] }] };

    expect(getSeatedStudentNumbers(chart)).toEqual([1, 9, 10]);
    expect(getSeatedStudentNumbers(undefined)).toEqual([]);
  });

  it('falls back to answered students when nobody is seated', () => {
    const c = { answers: { 'q-1': { 5: { value: 1 } }, 'q-2': { 2: { value: 0 }, 10: {} } } };

    expect(getReportStudentNumbers(c)).toEqual([2, 5, 10]);
    expect(getReportStudentNumbers({ ...c, chartData: seat(3) })).toEqual([3]);
  });
});

describe('formatAnswerLabel', () => {
  it('formats true/false however it was stored, and MC labels as given', () => {
    const tf = TF('q-1', 5);

    expect(formatAnswerLabel(tf, { label: true })).toBe('True');
    expect(formatAnswerLabel(tf, { label: 'false' })).toBe('False');
    expect(formatAnswerLabel(MC('q-2', [0, 1]), { label: 'Option 2' })).toBe('Option 2');
    expect(formatAnswerLabel(tf, undefined)).toBe('No answer');
  });
});

describe('regression: same colors as the Scores view before the refactor', () => {
  // Verbatim copy of QuestionsScreen's scoring before spec 002, kept here only
  // to prove the shared helpers did not move any student to another color.
  const legacyScoreColors = (activeCase, studentIds) => {
    const getStudentScore = (studentId) => {
      const answers = activeCase.answers || {};
      return Object.values(answers).reduce((sum, qAnswers) => {
        return sum + ((qAnswers[studentId] || {}).value || 0);
      }, 0);
    };
    const allScores = studentIds.map((id) => getStudentScore(id));
    const _minScore = allScores.length ? Math.min(...allScores) : 0;
    const _maxScore = allScores.length ? Math.max(...allScores) : 0;
    return studentIds.map((studentId) => {
      const score = getStudentScore(studentId);
      if (_maxScore === _minScore) return '#5BF527';
      const range = _maxScore - _minScore;
      if (score <= _minScore + range / 3) return '#5BF527';
      if (score <= _minScore + (2 * range) / 3) return '#F7F46D';
      return '#F54927';
    });
  };
  const COLOR = { low: '#5BF527', medium: '#F7F46D', high: '#F54927' };

  const questions = [TF('q-1', 5), TF('q-2', 3), MC('q-3', [0, 2, 4])];
  const fixture = caseWith(questions, {
    1: { 'q-1': 5, 'q-2': 3, 'q-3': 4 }, // 12
    2: { 'q-1': 0, 'q-2': 0, 'q-3': 0 }, // 0
    3: { 'q-1': 5, 'q-2': 0, 'q-3': 2 }, // 7
    4: { 'q-1': 0, 'q-2': 3 }, //          3 (q-3 unanswered)
    5: { 'q-1': 5, 'q-2': 3, 'q-3': 2 }, // 10
    6: { 'q-3': 4 }, //                    4 (on the low/medium boundary)
  });
  const students = [1, 2, 3, 4, 5, 6];

  it('assigns the tiers worked out by hand', () => {
    const tiers = getRiskTiers(fixture, students);

    expect(students.map((n) => tiers.get(n))).toEqual(['high', 'low', 'medium', 'low', 'high', 'low']);
  });

  it('matches the pre-refactor color for every student', () => {
    const tiers = getRiskTiers(fixture, students);

    expect(students.map((n) => COLOR[tiers.get(n)])).toEqual(legacyScoreColors(fixture, students));
  });

  it('keeps the per-answer badge banding of the old getAnswerColor', () => {
    const legacyAnswerColor = (question, value) => {
      if (value === null || value === undefined) return 'var(--light-text)';
      const vals = question.options.map((o) => o.value);
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);
      if (maxVal === minVal) return '#5BF527';
      const range = maxVal - minVal;
      if (value <= minVal + range / 3) return '#5BF527';
      if (value <= minVal + (2 * range) / 3) return '#F7F46D';
      return '#F54927';
    };

    for (const question of questions) {
      for (const { value } of question.options) {
        expect(COLOR[getAnswerTier(question, { value })]).toBe(legacyAnswerColor(question, value));
      }
    }
    expect(bandTier(1, 1, 1)).toBe('low');
  });
});
