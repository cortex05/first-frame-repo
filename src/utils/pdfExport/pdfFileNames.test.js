import { describe, expect, it } from 'vitest';

import { answersFileName, questionsFileName, sanitizeClientName } from './pdfFileNames';

describe('sanitizeClientName', () => {
  it.each([
    ['Jane Doe', 'Jane_Doe'],
    ["O'Neil & Sons", 'ONeil_Sons'],
    ['  Jane   Doe  ', 'Jane_Doe'],
    ['José', 'Jos'],
    ['A--B', 'A--B'],
    ['already_clean', 'already_clean'],
    ['  ', 'case'],
    ['&&!', 'case'],
    ['', 'case'],
    [undefined, 'case'],
    [null, 'case'],
  ])('%j -> %j', (input, expected) => {
    expect(sanitizeClientName(input)).toBe(expected);
  });
});

describe('file names', () => {
  it('builds the questions and answers names from the same client name', () => {
    expect(questionsFileName('Jane Doe')).toBe('client_Jane_Doe_questions.pdf');
    expect(answersFileName('Jane Doe')).toBe('client_Jane_Doe_answers.pdf');
  });

  it('falls back to "case" when nothing usable is left', () => {
    expect(questionsFileName('  ')).toBe('client_case_questions.pdf');
    expect(answersFileName('  ')).toBe('client_case_answers.pdf');
  });
});
