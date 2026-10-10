import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import QuestionsScreen from './QuestionsScreen';
import { getUserCases, saveQuestionAnswers, saveSeating, saveStudentDetails } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

// jsdom has no canvas: render the Konva tree as plain elements.
vi.mock('react-konva', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    Stage: Passthrough,
    Layer: Passthrough,
    Line: ({ points }) => <div data-testid="canvas-grid-line" data-points={points.join(',')} />,
    Group: Passthrough,
    Rect: () => null,
    Circle: () => null,
    Text: () => null,
  };
});

vi.mock('../../api/case', () => ({
  getUserCases: vi.fn(),
  isCaseConflict: (error) =>
    error?.response?.status === 409 && error?.response?.data?.code === 'CASE_CONFLICT',
  saveQuestionAnswers: vi.fn(),
  saveSeating: vi.fn(),
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
  document.documentElement.dataset.theme = 'dark';
  vi.mocked(getUserCases).mockReset();
  vi.mocked(saveQuestionAnswers).mockReset();
  vi.mocked(saveSeating).mockReset();
  vi.mocked(saveStudentDetails).mockReset();
  useAuthStore.setState({ userInfo: { token: 'token', userId: 'u-owner', role: 'member' } });
  useCaseStore.setState({ cases: [makeCase()] });
});

describe('QuestionsScreen canvas grid', () => {
  it('renders the grid in light mode only', () => {
    document.documentElement.dataset.theme = 'light';
    const { unmount } = renderQuestions();

    expect(screen.getAllByTestId('canvas-grid-line').length).toBeGreaterThan(0);

    unmount();
    document.documentElement.dataset.theme = 'dark';
    renderQuestions();
    expect(screen.queryByTestId('canvas-grid-line')).not.toBeInTheDocument();
  });
});

describe('QuestionsScreen save-answer toasts', () => {
  const openSaveAnswers = async (user) => {
    await user.click(screen.getByText('Intent?'));
    return screen.getByRole('button', { name: 'Save Answers' });
  };

  it('shows the missing-login message as an error toast', async () => {
    useAuthStore.setState({ userInfo: { userId: 'u-owner', role: 'member' } });
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    expect(screen.getByRole('alert')).toHaveTextContent('You must be logged in to save answers.');
  });

  it('shows a successful save as a success toast', async () => {
    vi.mocked(saveQuestionAnswers).mockResolvedValue(makeCase());
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    expect(await screen.findByRole('status')).toHaveTextContent('Answers saved!');
  });

  it('sends only the selected question and takes the server copy of the case', async () => {
    const fromServer = makeCase({ clientName: 'Saved by someone else', revision: 4 });
    vi.mocked(saveQuestionAnswers).mockResolvedValue(fromServer);
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    await screen.findByRole('status');
    expect(saveQuestionAnswers).toHaveBeenCalledWith('case-1', 'q-1', expect.any(Object), 'token');
    expect(saveSeating).not.toHaveBeenCalled();
    expect(useCaseStore.getState().cases[0]).toEqual(fromServer);
    expect(JSON.parse(localStorage.getItem('cases'))[0].revision).toBe(4);
  });

  it('sends seating kept only in this browser once, so the server copy keeps it', async () => {
    vi.mocked(saveQuestionAnswers).mockResolvedValue(makeCase({ seated: false, chartData: {} }));
    vi.mocked(saveSeating).mockResolvedValue(makeCase({ revision: 2 }));
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    await screen.findByRole('status');
    expect(saveSeating).toHaveBeenCalledWith(
      'case-1',
      expect.objectContaining({ chartData: makeCase().chartData }),
      'token',
    );
    expect(useCaseStore.getState().cases[0]).toMatchObject({ seated: true, revision: 2 });
  });

  it('shows save failures as error toasts', async () => {
    vi.mocked(saveQuestionAnswers).mockRejectedValue({ response: { data: { message: 'Unable to save this case.' } } });
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to save this case.');
    expect(getUserCases).not.toHaveBeenCalled();
  });

  it('reloads the cases when the question was removed by someone else', async () => {
    vi.mocked(saveQuestionAnswers).mockRejectedValue({
      response: { status: 409, data: { code: 'CASE_CONFLICT', message: 'Someone else changed this case.' } },
    });
    vi.mocked(getUserCases).mockResolvedValue([makeCase({ questions: [], revision: 9 })]);
    const user = userEvent.setup();
    renderQuestions();

    await user.click(await openSaveAnswers(user));

    expect(await screen.findByRole('alert')).toHaveTextContent('Someone else changed this case.');
    expect(getUserCases).toHaveBeenCalledWith('token');
    expect(useCaseStore.getState().cases[0].revision).toBe(9);
  });
});

describe('QuestionsScreen polled questions (spec 010)', () => {
  const FALSE = { label: false, value: 0 };
  const SECOND = { id: 'q-2', text: 'Credible?', type: 'TRUE_FALSE', options: QUESTIONS[0].options };
  const card = (text) => screen.getByText(text).closest('div');

  // What the screen has in currentAnswers, read off the save request.
  const savedPayload = async (user) => {
    vi.mocked(saveQuestionAnswers).mockResolvedValue(makeCase());
    await user.click(screen.getByRole('button', { name: 'Save Answers' }));
    await screen.findByRole('status');
    return vi.mocked(saveQuestionAnswers).mock.calls[0][2];
  };

  it('marks a question with saved answers as polled, and one without as not', () => {
    useCaseStore.setState({ cases: [makeCase({ questions: [...QUESTIONS, SECOND] })] });
    renderQuestions();

    expect(card('Intent?').className).toMatch(/inactiveAfterFirstPoll/);
    expect(card('Credible?').className).not.toMatch(/inactiveAfterFirstPoll/);
  });

  it('starts an unpolled true/false question on false for everyone, without storing a flag', async () => {
    useCaseStore.setState({ cases: [makeCase({ answers: {} })] });
    localStorage.clear();
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByText('Intent?'));

    expect(useCaseStore.getState().cases[0].questions[0]).not.toHaveProperty('firstPoll');
    expect(localStorage.getItem('cases')).toBeNull();
    expect(await savedPayload(user)).toEqual({ 1: FALSE, 2: FALSE, 3: FALSE });
  });

  it('reopens a polled true/false question with its saved answers', async () => {
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByText('Intent?'));

    expect(await savedPayload(user)).toEqual(makeCase().answers['q-1']);
  });

  it('shows a question as polled once its answers are saved', async () => {
    useCaseStore.setState({ cases: [makeCase({ answers: {}, questions: [...QUESTIONS, SECOND] })] });
    vi.mocked(saveQuestionAnswers).mockResolvedValue(
      makeCase({ answers: { 'q-1': { 1: FALSE } }, questions: [...QUESTIONS, SECOND] }),
    );
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByText('Intent?'));
    await user.click(screen.getByRole('button', { name: 'Save Answers' }));
    await screen.findByRole('status');
    await user.click(screen.getByText('Credible?'));

    expect(card('Intent?').className).toMatch(/inactiveAfterFirstPoll/);
  });
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
