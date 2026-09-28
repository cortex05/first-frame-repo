import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CaseScreen from './CaseScreen';
import { archiveCase, saveCase, startCase } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/case', () => ({
  archiveCase: vi.fn(),
  saveCase: vi.fn(),
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
