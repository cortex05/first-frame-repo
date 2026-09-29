import { describe, expect, it } from 'vitest';

import {
  applyLocalStudentDetails,
  formatDetail,
  getStudentDetails,
  mergeStudentDetails,
  toDetailsPayload,
  toDraft,
  validateStudentDetails,
} from './studentDetails';

describe('getStudentDetails', () => {
  it('looks the student up by String(number)', () => {
    expect(getStudentDetails({ studentDetails: { 3: { age: 30 } } }, 3)).toEqual({ age: 30 });
  });

  it('defaults to an empty object', () => {
    expect(getStudentDetails(undefined, 1)).toEqual({});
    expect(getStudentDetails({}, 1)).toEqual({});
    expect(getStudentDetails({ studentDetails: { 2: { age: 30 } } }, 1)).toEqual({});
  });
});

describe('formatDetail', () => {
  it('shows ? for anything empty', () => {
    expect(formatDetail('age', undefined)).toBe('?');
    expect(formatDetail('race', null)).toBe('?');
    expect(formatDetail('occupation', '  ')).toBe('?');
  });

  it('capitalizes gender and passes the rest through', () => {
    expect(formatDetail('gender', 'male')).toBe('Male');
    expect(formatDetail('gender', 'female')).toBe('Female');
    expect(formatDetail('age', 34)).toBe('34');
    expect(formatDetail('occupation', 'Teacher')).toBe('Teacher');
  });
});

describe('toDraft', () => {
  it('turns every field into a string for the inputs', () => {
    expect(toDraft({ age: 34, gender: 'male' })).toEqual({ age: '34', occupation: '', gender: 'male', race: '' });
    expect(toDraft()).toEqual({ age: '', occupation: '', gender: '', race: '' });
  });
});

describe('validateStudentDetails', () => {
  it.each([['18'], ['120'], ['45'], [''], ['  ']])('accepts age %j', (age) => {
    expect(validateStudentDetails({ age })).toBeNull();
  });

  it.each([['17'], ['121'], ['30.5'], ['-20'], ['abc'], ['1e2']])('rejects age %j', (age) => {
    expect(validateStudentDetails({ age })).toBe('Age must be a whole number from 18 to 120.');
  });
});

describe('toDetailsPayload', () => {
  it('trims, sends null for empty and a number for age', () => {
    expect(toDetailsPayload({ age: ' 34 ', occupation: '  Teacher ', gender: '', race: '   ' })).toEqual({
      age: 34,
      occupation: 'Teacher',
      gender: null,
      race: null,
    });
  });
});

describe('mergeStudentDetails', () => {
  it('replaces only studentDetails', () => {
    const caseLike = { _id: 'c', chartData: { rects: [1] }, answers: { q: {} }, studentDetails: { 1: { age: 20 } } };

    const merged = mergeStudentDetails(caseLike, { 2: { age: 40 } });

    expect(merged).toEqual({ _id: 'c', chartData: { rects: [1] }, answers: { q: {} }, studentDetails: { 2: { age: 40 } } });
  });
});

describe('applyLocalStudentDetails', () => {
  it('stores only the set fields', () => {
    const result = applyLocalStudentDetails({ studentDetails: {} }, 2, { age: 30, occupation: null, gender: 'male', race: null });

    expect(result.studentDetails).toEqual({ 2: { age: 30, gender: 'male' } });
  });

  it('removes an entry whose fields are all empty', () => {
    const result = applyLocalStudentDetails(
      { studentDetails: { 1: { age: 20 }, 2: { age: 30 } } },
      2,
      { age: null, occupation: null, gender: null, race: null },
    );

    expect(result.studentDetails).toEqual({ 1: { age: 20 } });
  });

  it('works on a case without studentDetails', () => {
    expect(applyLocalStudentDetails({}, 1, { race: 'Asian' }).studentDetails).toEqual({ 1: { race: 'Asian' } });
  });
});
