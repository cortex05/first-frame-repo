import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CaseScreen from './CaseScreen';
import { archiveCase } from '../../api/case';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/case', () => ({
  archiveCase: vi.fn(),
  saveCase: vi.fn(),
  setCaseOwners: vi.fn(),
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
        <Route path="/home" element={<p>Home screen</p>} />
        <Route path="/archive/:id" element={<p>Archived case screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

const complete = { 'q-1': { s1: { label: 'true' } }, 'q-2': { s2: { label: 'false' } } };

beforeEach(() => {
  vi.mocked(archiveCase).mockReset();
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

  it('drops the case and goes home when the server says it is gone', async () => {
    vi.mocked(archiveCase).mockRejectedValue({ response: { status: 404, data: {} } });
    useAuthStore.setState({ userInfo: session() });
    useCaseStore.setState({ cases: [makeCase({ answers: complete })] });

    renderCase();
    await userEvent.click(screen.getByRole('button', { name: 'Archive Case' }));
    await userEvent.click(screen.getByRole('button', { name: 'Archive' }));

    expect(await screen.findByText('Home screen')).toBeInTheDocument();
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
