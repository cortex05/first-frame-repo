import { act, render, screen, waitFor, within } from '@testing-library/react';
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
    await user.click(screen.getByRole('button', { name: '#1 — 6 · High' }));

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
    expect(before.map(([text]) => text)).toEqual(['#1 — 6 · High', '#2 — 3 · Medium', '#3 — 0 · Low']);
    expect(before.map(([, background]) => background)).toEqual([
      'var(--risk-high-bg)',
      'var(--risk-medium-bg)',
      'var(--risk-low-bg)',
    ]);

    await user.click(screen.getByRole('button', { name: '#3 — 0 · Low' }));
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
    await user.click(screen.getByRole('button', { name: '#2 — 3 · Medium' }));
    const report = within(screen.getByRole('dialog', { name: /Student Report - #2/ }));
    await user.click(report.getByRole('button', { name: 'Edit' }));
    await user.click(report.getByRole('button', { name: 'Save' }));

    expect(await report.findByRole('alert')).toHaveTextContent('Case not found');
  });
});

describe('QuestionsScreen keyboard access (spec 011)', () => {
  const SECOND = { id: 'q-2', text: 'Credible?', type: 'TRUE_FALSE', options: QUESTIONS[0].options };

  it('selects a question from the keyboard and moves focus to it', async () => {
    const user = userEvent.setup();
    renderQuestions();

    screen.getByRole('button', { name: /^Intent\?/ }).focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Save Answers' })).toBeInTheDocument();
    expect(screen.getByText('Intent?')).toHaveFocus();
  });

  it('drops the select button once a question is open, so nothing is nested', async () => {
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByRole('button', { name: /^Intent\?/ }));

    expect(screen.queryByRole('button', { name: /^Intent\?/ })).not.toBeInTheDocument();
    const save = screen.getByRole('button', { name: 'Save Answers' });
    expect(save.parentElement.closest('button')).toBeNull();
  });

  it('collapses the open question when another one is selected', async () => {
    useCaseStore.setState({ cases: [makeCase({ questions: [...QUESTIONS, SECOND] })] });
    const user = userEvent.setup();
    renderQuestions();

    await user.click(screen.getByRole('button', { name: /^Intent\?/ }));
    screen.getByRole('button', { name: /^Credible\?/ }).focus();
    await user.keyboard(' ');

    expect(screen.getByRole('button', { name: /^Intent\?/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Credible\?/ })).not.toBeInTheDocument();
    expect(screen.getByText('Credible?')).toHaveFocus();
  });
});

describe('QuestionsScreen dialogs (spec 012)', () => {
  // Focus is restored in a microtask once a dialog unmounts.
  const flushFocus = () => act(async () => {});

  it('opens the sort list as a named dialog that Escape closes, returning focus', async () => {
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));

    const sort = screen.getByRole('dialog', { name: 'High to Low' });
    expect(within(sort).getByRole('button', { name: 'Close' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'High to Low' })).toHaveFocus();
  });

  it('closes only the report on Escape when it is open over the sort list', async () => {
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));
    await user.click(screen.getByRole('button', { name: '#1 — 6 · High' }));

    await user.keyboard('{Escape}');
    await flushFocus();

    expect(screen.queryByRole('dialog', { name: /Student Report/ })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'High to Low' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#1 — 6 · High' })).toHaveFocus();
  });

  it('still closes the sort list from its backdrop', async () => {
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: 'Scores' }));
    await user.click(screen.getByRole('button', { name: 'High to Low' }));

    await user.click(screen.getByRole('dialog', { name: 'High to Low' }).parentElement);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the leave warning with Escape', async () => {
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getAllByRole('button', { name: 'Back to Case' })[0]);
    expect(screen.getByRole('dialog', { name: 'Are you sure?' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('QuestionsScreen seat buttons (spec 014)', () => {
  const MC = {
    id: 'q-mc',
    text: 'Motive?',
    type: 'MULTIPLE_CHOICE',
    options: [
      { label: 'Money', value: 2 },
      { label: 'Revenge', value: 1 },
    ],
  };
  const seat = (name) => screen.getByRole('button', { name });
  const announcer = () => screen.getByTestId('seat-announcer');

  it('keeps the seats out of reach until a question is selected', () => {
    renderQuestions();

    const first = seat('Student 1');
    expect(first).toHaveAttribute('aria-disabled', 'true');
    expect(first).toHaveAccessibleDescription('Select a question first');
  });

  it('puts the seats in row groups outside the hidden canvas', () => {
    renderQuestions();

    const row = screen.getByRole('group', { name: 'Row 1' });
    expect(within(row).getAllByRole('button')).toHaveLength(3);
    expect(row.closest('[aria-hidden="true"]')).toBeNull();
    expect(document.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it('toggles a true/false answer from the keyboard, announces it and saves it', async () => {
    vi.mocked(saveQuestionAnswers).mockResolvedValue(makeCase());
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: /^Intent\?/ }));

    const student2 = seat('Student 2');
    expect(student2).toHaveAttribute('aria-pressed', 'false');
    student2.focus();
    await user.keyboard(' ');

    expect(student2).toHaveAttribute('aria-pressed', 'true');
    expect(announcer()).toHaveTextContent('Student 2: True');

    await user.click(screen.getByRole('button', { name: 'Save Answers' }));
    const payload = vi.mocked(saveQuestionAnswers).mock.calls[0][2];
    expect(payload[2]).toEqual({ label: true, value: 6 });
  });

  it('answers multiple choice with the chosen option or a letter key', async () => {
    useCaseStore.setState({ cases: [makeCase({ questions: [...QUESTIONS, MC] })] });
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: /^Motive\?/ }));

    expect(seat('Student 1, no answer')).toHaveAccessibleDescription('Select an option first');

    await user.click(screen.getByRole('button', { name: 'Option B, Revenge, 1 points' }));
    seat('Student 1, no answer').focus();
    await user.keyboard('{Enter}');

    expect(seat('Student 1, Option B: Revenge')).toBeInTheDocument();
    expect(announcer()).toHaveTextContent('Student 1: Option B, Revenge');

    seat('Student 3, no answer').focus();
    await user.keyboard('a');
    expect(seat('Student 3, Option A: Money')).toHaveFocus();
    expect(announcer()).toHaveTextContent('Student 3: Option A, Money');

    await user.keyboard('e');
    expect(seat('Student 3, Option A: Money')).toBeInTheDocument();
  });

  it('letters the multiple-choice options and names the zoom buttons', async () => {
    useCaseStore.setState({ cases: [makeCase({ questions: [...QUESTIONS, MC] })] });
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: /^Motive\?/ }));

    expect(screen.getByRole('button', { name: 'Option A, Money, 2 points' })).toHaveTextContent(/^AMoney2$/);
    for (const name of ['Zoom in', 'Zoom out', 'Reset zoom']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
  });

  it('opens a student report from a seat in Scores mode', async () => {
    const user = userEvent.setup();
    renderQuestions();
    await user.click(screen.getByRole('button', { name: 'Scores' }));

    seat('Student 1, 6 points, High risk').focus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog', { name: /Student Report - #1/ })).toBeInTheDocument();
  });
});

describe('QuestionsScreen contrast (spec 015)', () => {
  it('draws the no-seating message in the page text color', () => {
    useCaseStore.setState({ cases: [makeCase({ chartData: undefined })] });
    renderQuestions();

    const message = screen.getByText(/No seating chart saved yet/);
    expect(message.style.color).toBe('var(--page-text)');
  });
});

describe('QuestionsScreen meaning and title (spec 016)', () => {
  const SECOND = { id: 'q-2', text: 'Credible?', type: 'TRUE_FALSE', options: QUESTIONS[0].options };

  it('tags answered questions with text, not just a darker card', () => {
    useCaseStore.setState({ cases: [makeCase({ questions: [...QUESTIONS, SECOND] })] });
    renderQuestions();

    expect(screen.getByRole('button', { name: /^Intent\?/ })).toHaveAccessibleName(/Answered/);
    expect(screen.getByRole('button', { name: /^Credible\?/ })).not.toHaveAccessibleName(/Answered/);
  });

  it('names the tab after the client and has a top-level heading', () => {
    renderQuestions();

    expect(document.title).toBe('Questions: Jane Client – First Frame');
    expect(screen.getByRole('heading', { level: 1, name: 'Questions' })).toBeInTheDocument();
  });
});
