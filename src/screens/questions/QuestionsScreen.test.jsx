import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import QuestionsScreen from './QuestionsScreen';
import { saveStudentDetails } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

// jsdom has no canvas: render the Konva tree as plain elements.
vi.mock('react-konva', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    Stage: Passthrough,
    Layer: Passthrough,
    Group: Passthrough,
    Rect: () => null,
    Circle: () => null,
    Text: () => null,
  };
});

vi.mock('../../api/case', () => ({
  saveCase: vi.fn(),
  saveStudentDetails: vi.fn(),
}));

const QUESTIONS = [
  { id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [{ label: true, value: 6 }, { label: false, value: 0 }] },
];

// Seated students 1-3 with 6 / 3 / 0 points.
const makeCase = (overrides = {}) => ({
  _id: 'case-1',
  clientName: 'Jane Client',
  studentNumber: 3,
  owners: ['u-owner'],
  questions: QUESTIONS,
  answers: {
    'q-1': { 1: { label: 'true', value: 6 }, 2: { label: 'x', value: 3 }, 3: { label: 'false', value: 0 } },
  },
  chartData: {
    rects: [{ id: 'r1', x: 0, y: 0, width: 200, height: 80, assignedStudents: [{ id: 1, x: 10, y: 10 }, { id: 2, x: 60, y: 10 }, { id: 3, x: 110, y: 10 }] }],
  },
  seated: true,
  studentDetails: {},
  ...overrides,
});

const renderQuestions = () =>
  render(
    <MemoryRouter initialEntries={['/questions/case-1']}>
      <Routes>
        <Route path="/questions/:caseId" element={<QuestionsScreen />} />
      </Routes>
    </MemoryRouter>,
  );

const sortRows = () =>
  screen
    .getAllByRole('button')
    .filter((b) => /^#\d+ — /.test(b.textContent))
    .map((b) => [b.textContent, b.style.background]);

beforeEach(() => {
  vi.mocked(saveStudentDetails).mockReset();
  useAuthStore.setState({ userInfo: { token: 'token', userId: 'u-owner', role: 'member' } });
  useCaseStore.setState({ cases: [makeCase()] });
});

describe('QuestionsScreen student report', () => {
  it('opens the shared report, with points and details, from High to Low', async () => {
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));
    await user.click(screen.getByRole('button', { name: '#1 — 6' }));

    const report = within(screen.getByRole('dialog', { name: 'Student Report - #1 = 6 Points' }));
    for (const label of ['Age', 'Occupation', 'Gender', 'Race']) {
      expect(report.getByText(label, { selector: 'dt' }).nextElementSibling).toHaveTextContent('?');
    }
    expect(report.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('saving details leaves the sort order and colors alone', async () => {
    vi.mocked(saveStudentDetails).mockResolvedValue({
      caseId: 'case-1',
      studentNumber: 3,
      studentDetails: { 3: { occupation: 'Teacher' } },
    });
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));
    const before = sortRows();
    expect(before.map(([text]) => text)).toEqual(['#1 — 6', '#2 — 3', '#3 — 0']);
    expect(before.map(([, background]) => background)).toEqual([
      'var(--risk-high-bg)',
      'var(--risk-medium-bg)',
      'var(--risk-low-bg)',
    ]);

    await user.click(screen.getByRole('button', { name: '#3 — 0' }));
    const report = within(screen.getByRole('dialog', { name: /Student Report - #3/ }));
    await user.click(report.getByRole('button', { name: 'Edit' }));
    await user.type(report.getByLabelText('Occupation'), 'Teacher');
    await user.click(report.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(report.getByText('Occupation', { selector: 'dt' }).nextElementSibling).toHaveTextContent('Teacher'),
    );
    expect(saveStudentDetails).toHaveBeenCalledWith(
      'case-1',
      3,
      { age: null, occupation: 'Teacher', gender: null, race: null },
      'token',
    );
    expect(useCaseStore.getState().cases[0].answers).toEqual(makeCase().answers);
    expect(sortRows()).toEqual(before);
  });

  it('shows the error in the report when the save fails', async () => {
    vi.mocked(saveStudentDetails).mockRejectedValue({ response: { status: 404, data: { message: 'Case not found' } } });
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));
    await user.click(screen.getByRole('button', { name: '#2 — 3' }));
    const report = within(screen.getByRole('dialog', { name: /Student Report - #2/ }));
    await user.click(report.getByRole('button', { name: 'Edit' }));
    await user.click(report.getByRole('button', { name: 'Save' }));

    expect(await report.findByRole('alert')).toHaveTextContent('Case not found');
  });
});
