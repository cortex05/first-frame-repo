import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CaseScreen from './CaseScreen';
import { archiveCase, saveCase, saveStudentDetails, startCase } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/case', () => ({
  archiveCase: vi.fn(),
  saveCase: vi.fn(),
  saveStudentDetails: vi.fn(),
  setCaseOwners: vi.fn(),
  startCase: vi.fn(),
  getUserCases: vi.fn(async () => []),
}));
vi.mock('../../api/account', () => ({
  getAccountUsers: vi.fn(async () => []),
}));
vi.mock('../../api/playlist', () => ({
  getPlaylistById: vi.fn(),
  getUserPlaylists: vi.fn(async () => []),
}));
vi.mock('../../hooks/useRecommendedPlaylist', () => ({
  default: () => ({ recommended: null, isLoading: false, error: '', load: () => {} }),
}));
// The Export PDF button preloads jsPDF on mount; never let it load the real one.
vi.mock('../../utils/pdfExport/loadJsPdf', () => ({
  loadJsPdf: vi.fn(() => new Promise(() => {})),
}));
// Stub the export modal so these tests don't depend on jsPDF; it echoes what
// CaseScreen hands it.
vi.mock('../../components/pdf-export/PdfExportModal', () => ({
  default: ({ isOpen, activeCase }) =>
    isOpen ? (
      <div data-testid="pdf-export-modal">
        {activeCase.questions.map((q) => (
          <span key={q.id}>{`export: ${q.text}`}</span>
        ))}
      </div>
    ) : null,
}));

const QUESTIONS = [
  { id: 'q-1', text: 'Intent?', type: 'TRUE_FALSE', options: [] },
  { id: 'q-2', text: 'Credible?', type: 'TRUE_FALSE', options: [] },
];

const makeCase = (overrides = {}) => ({
  _id: 'case-1',
  clientName: 'Jane Client',
  attorney: 'Alex Attorney',
  category: 'criminal.theft',
  studentNumber: 2,
  owners: ['u-owner'],
  questions: QUESTIONS,
  answers: {},
  seated: true,
  ...overrides,
});

const session = (overrides = {}) => ({
  token: 'token',
  userId: 'u-owner',
  username: 'owner',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'member',
  mustChangePassword: false,
  ...overrides,
});

const renderCase = () =>
  render(
    <MemoryRouter initialEntries={['/case/case-1']}>
      <Routes>
        <Route path="/case/:id" element={<CaseScreen />} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
        <Route path="/archive/:id" element={<p>Archived case screen</p>} />
        <Route path="/start/:caseId" element={<p>Start screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

const complete = { 'q-1': { s1: { label: 'true' } }, 'q-2': { s2: { label: 'false' } } };

beforeEach(() => {
  vi.mocked(archiveCase).mockReset();
  vi.mocked(saveCase).mockReset();
  vi.mocked(startCase).mockReset();
  vi.mocked(saveStudentDetails).mockReset();
  window.scrollTo = vi.fn();
});

describe('CaseScreen archiving', () => {
  it('disables archiving until every question has answers', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ answers: { 'q-1': { s1: { label: 'true' } } } })] });

    renderCase();

    expect(screen.getByRole('button', { name: 'Archive Case' })).toBeDisabled();
    expect(screen.getByText('Answer every question to archive.')).toBeInTheDocument();
  });

  it('lets an owner archive a complete case and opens the archived copy', async () => {
    vi.mocked(archiveCase).mockResolvedValue({ _id: 'archived-1' });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ answers: complete })] });

    renderCase();
    await userEvent.click(screen.getByRole('button', { name: 'Archive Case' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));

    expect(await screen.findByText('Archived case screen')).toBeInTheDocument();
    expect(archiveCase).toHaveBeenCalledWith('case-1', 'token');
    expect(useCaseStore.getState().cases).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem('cases'))).toEqual([]);
  });

  it('hides archiving and owner management from a member who does not own the case', () => {
    useAuthStore.setState({ userInfo: session({ userId: 'u-someone-else' }) });
    useCaseStore.setState({ cases: [makeCase({ answers: complete })] });

    renderCase();

    expect(screen.queryByRole('button', { name: 'Archive Case' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Owners' })).not.toBeInTheDocument();
  });

  it('shows owner management to an account admin', () => {
    useAuthStore.setState({ userInfo: session({ userId: 'u-admin', role: 'admin' }) });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();

    expect(screen.getByRole('button', { name: 'Manage Owners' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Archive Case' })).toBeInTheDocument();
  });

  it('drops the case and goes to the dashboard when the server says it is gone', async () => {
    vi.mocked(archiveCase).mockRejectedValue({ response: { status: 404, data: {} } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ answers: complete })] });

    renderCase();
    await userEvent.click(screen.getByRole('button', { name: 'Archive Case' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));

    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
    await waitFor(() => expect(useCaseStore.getState().cases).toEqual([]));
  });

  it('shows the server message when the case is not complete', async () => {
    vi.mocked(archiveCase).mockRejectedValue({
      response: { status: 409, data: { message: 'Case is not complete: every question must have answers' } },
    });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ answers: complete })] });

    renderCase();
    await userEvent.click(screen.getByRole('button', { name: 'Archive Case' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));

    expect(
      await screen.findByText('Case is not complete: every question must have answers'),
    ).toBeInTheDocument();
    expect(useCaseStore.getState().cases).toHaveLength(1);
  });
});

describe('CaseScreen start session', () => {
  const startSession = async () => {
    await userEvent.click(screen.getByRole('button', { name: 'Start Session' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }));
  };

  it('saves the case, records the start, then opens seating', async () => {
    vi.mocked(saveCase).mockImplementation(async (_id, payload) => payload);
    vi.mocked(startCase).mockResolvedValue({ caseId: 'case-1', transactionStatus: 'in_progress' });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    await startSession();

    expect(await screen.findByText('Start screen')).toBeInTheDocument();
    expect(saveCase).toHaveBeenCalledWith('case-1', expect.objectContaining({ _id: 'case-1' }), 'token');
    expect(startCase).toHaveBeenCalledWith('case-1', 'token');
    expect(vi.mocked(saveCase).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(startCase).mock.invocationCallOrder[0],
    );
  });

  it('drops the case and goes to the dashboard when the start returns 404', async () => {
    vi.mocked(saveCase).mockImplementation(async (_id, payload) => payload);
    vi.mocked(startCase).mockRejectedValue({ response: { status: 404, data: {} } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    await startSession();

    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
    await waitFor(() => expect(useCaseStore.getState().cases).toEqual([]));
  });

  it('keeps the modal open with an error when the start fails', async () => {
    vi.mocked(saveCase).mockImplementation(async (_id, payload) => payload);
    vi.mocked(startCase).mockRejectedValue({ response: { status: 500, data: {} } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    await startSession();

    expect(await screen.findByText('Unable to start the session.')).toBeInTheDocument();
    expect(screen.queryByText('Start screen')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeEnabled();
  });

  it('does not record the start when saving the case fails', async () => {
    vi.mocked(saveCase).mockRejectedValue({ response: { status: 500, data: { message: 'Save failed' } } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    await startSession();

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    expect(startCase).not.toHaveBeenCalled();
  });
});

describe('CaseScreen student details', () => {
  const openStudent = async (number) => {
    await userEvent.click(screen.getByRole('button', { name: 'View Students' }));
    await userEvent.click(screen.getByRole('button', { name: new RegExp(`^#${number} — `) }));
  };

  const report = () => within(screen.getByRole('dialog', { name: /Student Report/ }));

  const editAge = async (age) => {
    await userEvent.click(report().getByRole('button', { name: 'Edit' }));
    await userEvent.type(report().getByLabelText('Age'), age);
    await userEvent.click(report().getByRole('button', { name: 'Save' }));
  };

  it('opens the list under the student count, then a report, and × goes back to the list', async () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    const viewStudents = screen.getByRole('button', { name: 'View Students' });
    const infoSection = screen.getByText(/Number of Students:/).parentElement;
    // The button sits in the panel section, after the info section and its divider.
    expect(infoSection.nextElementSibling.tagName).toBe('HR');
    expect(infoSection.nextElementSibling.nextElementSibling).toBe(viewStudents.parentElement);

    await openStudent(2);

    expect(screen.getByRole('dialog', { name: 'Students' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Student Report - #2 = 0 Points' })).toBeInTheDocument();

    const [, reportClose] = screen.getAllByRole('button', { name: 'Close' });
    await userEvent.click(reportClose);

    expect(screen.queryByRole('heading', { name: /Student Report/ })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Students' })).toBeInTheDocument();
  });

  it('saves details and merges only studentDetails into the stored case', async () => {
    vi.mocked(saveStudentDetails).mockResolvedValue({
      caseId: 'case-1',
      studentNumber: 2,
      studentDetails: { 2: { age: 30 } },
    });
    useAuthStore.setState({ userInfo: session() });
    // Seating the server hasn't seen yet: it must survive the save.
    const localChart = { rects: [{ id: 'r1', assignedStudents: [{ id: 1 }, { id: 2 }] }] };
    useCaseStore.setState({ cases: [makeCase({ chartData: localChart })] });

    renderCase();
    await openStudent(2);
    await editAge('30');

    await waitFor(() => expect(report().getByRole('button', { name: 'Edit' })).toBeInTheDocument());
    expect(saveStudentDetails).toHaveBeenCalledWith(
      'case-1',
      2,
      { age: 30, occupation: null, gender: null, race: null },
      'token',
    );
    const [stored] = useCaseStore.getState().cases;
    expect(stored.studentDetails).toEqual({ 2: { age: 30 } });
    expect(stored.chartData).toEqual(localChart);
    expect(JSON.parse(localStorage.getItem('cases'))[0].studentDetails).toEqual({ 2: { age: 30 } });
    expect(screen.getByText('Age', { selector: 'dt' }).nextElementSibling).toHaveTextContent('30');
  });

  it('drops the case and goes to the dashboard when the save returns 404', async () => {
    vi.mocked(saveStudentDetails).mockRejectedValue({ response: { status: 404, data: {} } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();
    await openStudent(1);
    await editAge('30');

    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
    await waitFor(() => expect(useCaseStore.getState().cases).toEqual([]));
  });

  it('saves locally without a request when signed out', async () => {
    useAuthStore.setState({ userInfo: null });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();
    await openStudent(1);
    await editAge('45');

    await waitFor(() =>
      expect(useCaseStore.getState().cases[0].studentDetails).toEqual({ 1: { age: 45 } }),
    );
    expect(saveStudentDetails).not.toHaveBeenCalled();
  });
});

describe('CaseScreen offline PDF export', () => {
  const offlineButton = () => screen.getByRole('button', { name: 'For offline use' });

  it('sits under the Add Question / Access Playlists row, in the same container', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();

    const playlists = screen.getByRole('button', { name: 'Access Playlists' });
    const addQuestion = screen.getByRole('button', { name: '+ Add Question' });
    expect(playlists.compareDocumentPosition(offlineButton())).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // The offline button sits in its own wrapper inside the same action container.
    expect(addQuestion.parentElement).toBe(offlineButton().parentElement.parentElement);
  });

  it('is disabled with a hint when the case has no questions', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ questions: [] })] });

    renderCase();

    expect(offlineButton()).toBeDisabled();
    expect(offlineButton().nextElementSibling).toHaveTextContent('Add a question to export.');
  });

  it('is enabled with questions, before and after seating', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    const { unmount } = renderCase();
    expect(offlineButton()).toBeEnabled();
    expect(screen.queryByText('Add a question to export.')).not.toBeInTheDocument();
    unmount();

    useCaseStore.setState({ cases: [makeCase({ seated: true })] });
    renderCase();
    expect(offlineButton()).toBeEnabled();
  });

  it('opens the export modal without calling the API', async () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();
    expect(screen.queryByTestId('pdf-export-modal')).not.toBeInTheDocument();
    await userEvent.click(offlineButton());

    expect(screen.getByTestId('pdf-export-modal')).toBeInTheDocument();
    expect(saveCase).not.toHaveBeenCalled();
    expect(startCase).not.toHaveBeenCalled();
  });

  it('exports the questions as they are after an edit', async () => {
    vi.mocked(saveCase).mockImplementation(async (_id, updatedCase) => updatedCase);
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase()] });

    renderCase();
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const text = screen.getByPlaceholderText('Enter question...');
    await userEvent.clear(text);
    await userEvent.type(text, 'Did they intend it?');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(screen.queryByPlaceholderText('Enter question...')).not.toBeInTheDocument(),
    );

    await userEvent.click(offlineButton());

    const modal = within(screen.getByTestId('pdf-export-modal'));
    expect(modal.getByText('export: Did they intend it?')).toBeInTheDocument();
    expect(modal.queryByText('export: Intent?')).not.toBeInTheDocument();
    expect(modal.getByText('export: Credible?')).toBeInTheDocument();
  });
});

describe('CaseScreen export slides PDF', () => {
  const exportButton = () => screen.getByRole('button', { name: /Export PDF|Preparing/ });

  it('comes before Start Session in the same row when the case is not seated', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();

    const start = screen.getByRole('button', { name: 'Start Session' });
    expect(exportButton().compareDocumentPosition(start)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // The button sits in its own wrapper inside the session row.
    expect(exportButton().parentElement.parentElement).toBe(start.parentElement);
  });

  it('comes before Access Questions, which still links to the questions screen', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: true })] });

    renderCase();

    const access = screen.getByRole('button', { name: 'Access Questions' });
    expect(exportButton().compareDocumentPosition(access)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(access.closest('a')).toHaveAttribute('href', '/questions/case-1');
    expect(exportButton().parentElement.parentElement).toBe(access.closest('a').parentElement);
  });

  it('is disabled with a hint when the case has no questions', () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ questions: [] })] });

    renderCase();

    expect(exportButton()).toBeDisabled();
    // One hint under For offline use, one under Export PDF.
    expect(screen.getAllByText('Add a question to export.')).toHaveLength(2);
  });

  it('leaves Start Session opening its modal', async () => {
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ seated: false })] });

    renderCase();
    await userEvent.click(screen.getByRole('button', { name: 'Start Session' }));

    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(saveCase).not.toHaveBeenCalled();
    expect(startCase).not.toHaveBeenCalled();
  });
});
