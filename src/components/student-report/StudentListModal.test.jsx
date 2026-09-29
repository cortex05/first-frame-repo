import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StudentListModal from './StudentListModal';
import { getRiskTiers } from '../../utils/studentScores';

const questions = [
  { id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [{ label: true, value: 6 }, { label: false, value: 0 }] },
];

// Students 1-3 seated with 6 / 3 / 0 points (high / medium / low); 4 and 5 unseated.
const seatedCase = {
  _id: 'case-1',
  studentNumber: 5,
  questions,
  answers: {
    'q-1': { 1: { label: 'true', value: 6 }, 2: { label: 'x', value: 3 }, 3: { label: 'false', value: 0 } },
  },
  chartData: {
    rects: [{ id: 'r1', assignedStudents: [{ id: 3 }, { id: 1 }, { id: 2 }] }],
  },
};

const renderList = (activeCase) => {
  const onSelectStudent = vi.fn();
  const onClose = vi.fn();
  render(<StudentListModal activeCase={activeCase} onSelectStudent={onSelectStudent} onClose={onClose} />);
  return { onSelectStudent, onClose };
};

const rows = () => screen.getAllByRole('button').filter((b) => b.textContent.startsWith('#'));

describe('StudentListModal', () => {
  it('lists every student in numeric order with their points', () => {
    renderList(seatedCase);

    expect(rows().map((r) => r.textContent)).toEqual(['#1 — 6', '#2 — 3', '#3 — 0', '#4 — 0', '#5 — 0']);
  });

  it('colors seated students by tier, the same way as the Questions screen', () => {
    renderList(seatedCase);

    const expected = getRiskTiers(seatedCase, [1, 2, 3]);
    expect(rows().map((r) => r.dataset.tier)).toEqual([
      expected.get(1),
      expected.get(2),
      expected.get(3),
      'none',
      'none',
    ]);
    expect(rows().slice(0, 3).map((r) => r.dataset.tier)).toEqual(['high', 'medium', 'low']);
  });

  it('shows everyone as neutral before seating', () => {
    renderList({ _id: 'case-1', studentNumber: 3, questions, answers: {} });

    expect(rows().map((r) => r.dataset.tier)).toEqual(['none', 'none', 'none']);
  });

  it('opens a student and closes with ×', async () => {
    const user = userEvent.setup();
    const { onSelectStudent, onClose } = renderList(seatedCase);

    await user.click(screen.getByRole('button', { name: '#4 — 0' }));
    expect(onSelectStudent).toHaveBeenCalledWith(4);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });
});
