import { describe, expect, it } from 'vitest';

import { caseHeaderLines, questionBlocks, studentNumbers } from './pdfContent';

const tf = (text, options) => ({ id: text, type: 'TRUE_FALSE', text, options });
const mc = (text, options) => ({ id: text, type: 'MULTIPLE_CHOICE', text, options });

describe('caseHeaderLines', () => {
  it('lists client, attorney, category and student count', () => {
    expect(
      caseHeaderLines({
        clientName: 'Jane Client',
        attorney: 'Alex Attorney',
        category: 'criminal.theft',
        studentNumber: 12,
      }),
    ).toEqual([
      'Client: Jane Client',
      'Attorney: Alex Attorney',
      'Case Category: Criminal — Theft',
      'Number of Students: 12',
    ]);
  });

  it('shows a dash for an empty attorney and an unknown category', () => {
    const [, attorney, category] = caseHeaderLines({
      clientName: 'X',
      attorney: '',
      category: 'not.a.category',
      studentNumber: 1,
    });
    expect(attorney).toBe('Attorney: —');
    expect(category).toBe('Case Category: —');
  });
});

describe('questionBlocks', () => {
  it('formats a true/false question with boolean labels', () => {
    const [block] = questionBlocks([
      tf('Intent?', [
        { label: true, value: 3 },
        { label: false, value: 1 },
      ]),
    ]);
    expect(block).toEqual({
      number: 1,
      text: '"Intent?"',
      pointsLine: 'Points: True: 3 - False: 1',
      tallyLabels: ['Students Answered True:'],
    });
  });

  it('accepts string true/false labels', () => {
    const [block] = questionBlocks([
      tf('Intent?', [
        { label: 'false', value: '2' },
        { label: 'true', value: '5' },
      ]),
    ]);
    expect(block.pointsLine).toBe('Points: True: 5 - False: 2');
  });

  it('prints 0 for a missing true/false option and keeps the tally line', () => {
    const [block] = questionBlocks([tf('Intent?', [{ label: true, value: 3 }])]);
    expect(block.pointsLine).toBe('Points: True: 3 - False: 0');
    expect(block.tallyLabels).toEqual(['Students Answered True:']);
  });

  it('lists every labelled multiple-choice option with a tally line each', () => {
    const [block] = questionBlocks([
      mc('Rate the officer', [
        { label: 'Trustworthy', value: 3 },
        { label: '  ', value: 9 },
        { label: 'Neutral', value: 'x' },
        { label: 'Untrustworthy', value: 0 },
      ]),
    ]);
    expect(block.pointsLine).toBe('Points: Trustworthy: 3 - Neutral: 0 - Untrustworthy: 0');
    expect(block.tallyLabels).toEqual([
      'Students Answered Trustworthy:',
      'Students Answered Neutral:',
      'Students Answered Untrustworthy:',
    ]);
  });

  it('numbers questions from 1 in array order', () => {
    const blocks = questionBlocks([tf('A', []), mc('B', []), tf('C', [])]);
    expect(blocks.map((b) => [b.number, b.text])).toEqual([
      [1, '"A"'],
      [2, '"B"'],
      [3, '"C"'],
    ]);
  });

  it('returns no blocks without questions', () => {
    expect(questionBlocks(undefined)).toEqual([]);
  });
});

describe('studentNumbers', () => {
  it('lists 1..N', () => {
    expect(studentNumbers(5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('is empty for zero or a missing count', () => {
    expect(studentNumbers(0)).toEqual([]);
    expect(studentNumbers(undefined)).toEqual([]);
  });
});
