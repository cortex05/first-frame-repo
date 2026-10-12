import { describe, expect, it } from 'vitest';

import { centerOn, isSeatInView, letterKeyIndex, optionLetter, rowSummary } from './seating';

const row = (...ids) => ({ assignedStudents: ids.map((id) => ({ id })) });

describe('rowSummary', () => {
  it('gives a range for consecutive students, in any seat order', () => {
    expect(rowSummary(row(3, 1, 2, 6, 5, 4))).toBe('students 1–6');
  });

  it('lists students that are not consecutive', () => {
    expect(rowSummary(row(9, 3, 5))).toBe('students 3, 5, 9');
  });

  it('handles one student and an empty row', () => {
    expect(rowSummary(row(4))).toBe('student 4');
    expect(rowSummary(row())).toBe('no students');
  });
});

describe('option letters and keys', () => {
  it('letters options A to D', () => {
    expect([0, 1, 2, 3].map(optionLetter)).toEqual(['A', 'B', 'C', 'D']);
  });

  it('maps A-D and 1-4 to option indexes', () => {
    expect(['a', 'D', '1', '3'].map(letterKeyIndex)).toEqual([0, 3, 0, 2]);
  });

  it('ignores other keys', () => {
    expect(['e', '5', '0', 'Enter', ' '].map(letterKeyIndex)).toEqual([null, null, null, null, null]);
  });
});

describe('isSeatInView / centerOn', () => {
  const view = { scale: 1, stagePos: { x: 0, y: 0 }, width: 400, height: 300, radius: 24 };

  it('is in view when the whole circle is inside the margins', () => {
    expect(isSeatInView({ x: 100, y: 100 }, view)).toBe(true);
  });

  it('is out of view past an edge, or behind a panned stage', () => {
    expect(isSeatInView({ x: 390, y: 100 }, view)).toBe(false);
    expect(isSeatInView({ x: 100, y: 100 }, { ...view, stagePos: { x: -200, y: 0 } })).toBe(false);
  });

  it('centers a seat at any scale', () => {
    expect(centerOn({ x: 500, y: 400 }, { scale: 1, width: 400, height: 300 })).toEqual({ x: -300, y: -250 });
    expect(centerOn({ x: 500, y: 400 }, { scale: 2, width: 400, height: 300 })).toEqual({ x: -800, y: -650 });
  });
});
