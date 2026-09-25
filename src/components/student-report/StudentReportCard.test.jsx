import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StudentReportCard from './StudentReportCard';

const questions = [
  {
    id: 'q-1',
    text: 'Was there intent?',
    type: 'TRUE_FALSE',
    options: [
      { label: true, value: 5 },
      { label: false, value: 0 },
    ],
  },
  {
    id: 'q-2',
    text: 'Which motive?',
    type: 'MULTIPLE_CHOICE',
    options: [
      { label: 'Money', value: 7 },
      { label: 'Revenge', value: 0 },
    ],
  },
  { id: 'q-3', text: 'Credible witness?', type: 'TRUE_FALSE', options: [{ label: true, value: 3 }, { label: false, value: 0 }] },
];

const answers = {
  'q-1': { 3: { label: 'true', value: 5 } },
  'q-2': { 3: { label: 'Money', value: 7 } },
};

const renderCard = () =>
  render(
    <StudentReportCard studentNumber={3} risk="high" total={12} questions={questions} answers={answers} />,
  );

describe('StudentReportCard', () => {
  it('shows the student, their risk and their total', () => {
    renderCard();
    const card = screen.getByRole('region', { name: 'Student 3' });

    expect(within(card).getByText('Student #3')).toBeInTheDocument();
    expect(within(card).getByText('Risk: High')).toBeInTheDocument();
    expect(within(card).getByText('Total: 12 pts')).toBeInTheDocument();
  });

  it('lists every question in order with the answer and its points', () => {
    renderCard();
    const rows = screen.getAllByRole('listitem');

    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('1. Was there intent? — True');
    expect(rows[0]).toHaveTextContent('5 pts');
    expect(rows[1]).toHaveTextContent('2. Which motive? — Money');
    expect(rows[1]).toHaveTextContent('7 pts');
  });

  it('marks an unanswered question', () => {
    renderCard();
    const row = screen.getAllByRole('listitem')[2];

    expect(row).toHaveTextContent('3. Credible witness? — No answer');
    expect(within(row).getByText('—')).toBeInTheDocument();
  });

  it('colors the risk badge by tier', () => {
    renderCard();

    expect(screen.getByText('Risk: High').className).toMatch(/risk_high/);
  });
});
