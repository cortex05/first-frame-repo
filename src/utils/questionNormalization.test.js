import { describe, expect, it } from 'vitest';

import { normalizeCaseQuestionsPayload, normalizeQuestion } from './questionNormalization';

describe('normalizeQuestion', () => {
  it('keeps only id, text, type and options (spec 010)', () => {
    expect(
      normalizeQuestion({
        id: 'q-1',
        text: '  Intent?  ',
        type: 'TRUE_FALSE',
        options: [{ label: 'true', value: '6' }],
        answers: { 1: 'true' },
        firstPoll: true,
        caseId: 'case-1',
        somethingElse: 1,
      }),
    ).toEqual({
      id: 'q-1',
      text: 'Intent?',
      type: 'TRUE_FALSE',
      options: [{ label: true, value: 6 }],
    });
  });

  it('coerces true/false labels to booleans and option values to numbers', () => {
    expect(
      normalizeQuestion({
        id: 'q-1',
        text: 'Intent?',
        type: 'TRUE_FALSE',
        options: [
          { label: 'true', value: '6' },
          { label: false, value: 'x' },
        ],
      }).options,
    ).toEqual([
      { label: true, value: 6 },
      { label: false, value: 0 },
    ]);
  });

  it('trims multiple-choice labels as strings', () => {
    expect(
      normalizeQuestion({
        id: 'q-2',
        text: 'Credible?',
        type: 'MULTIPLE_CHOICE',
        options: [{ label: '  Very  ', value: 3 }],
      }).options,
    ).toEqual([{ label: 'Very', value: 3 }]);
  });

  it('passes non-objects through', () => {
    expect(normalizeQuestion(null)).toBeNull();
  });
});

describe('normalizeCaseQuestionsPayload', () => {
  it('slims the questions and leaves case.answers alone', () => {
    const answers = { 'q-1': { 1: { label: 'true', value: 6 } } };

    const normalized = normalizeCaseQuestionsPayload({
      _id: 'case-1',
      answers,
      questions: [{ id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [], firstPoll: true }],
    });

    expect(normalized.answers).toBe(answers);
    expect(normalized.questions).toEqual([{ id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [] }]);
  });
});
