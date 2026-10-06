import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginScreen from './LoginScreen';
import { login } from '../../../api/auth';
import { getUserPlaylists } from '../../../api/playlist';
import { getUserCases } from '../../../api/case';
import useAuthStore from '../../../store/useAuthStore';

vi.mock('../../../api/auth', () => ({ login: vi.fn() }));
vi.mock('../../../api/playlist', () => ({ getUserPlaylists: vi.fn(async () => []) }));
vi.mock('../../../api/case', () => ({ getUserCases: vi.fn(async () => []) }));
vi.mock('../../../api/recommended', () => ({ getRecommendedNames: vi.fn(async () => []) }));

const session = (overrides = {}) => ({
  token: 'token',
  userId: 'u-1',
  username: 'daniel',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'admin',
  mustChangePassword: false,
  mustAcceptTerms: false,
  ...overrides,
});

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
        <Route path="/accept-terms" element={<p>Accept terms screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

const logIn = async () => {
  await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'daniel@example.com');
  await userEvent.type(screen.getByPlaceholderText('Enter password'), 'secret123');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ userInfo: null });
});

describe('LoginScreen', () => {
  it('sends an account with pending terms to the accept-terms page without loading data', async () => {
    vi.mocked(login).mockResolvedValue(session({ mustAcceptTerms: true }));
    renderScreen();

    await logIn();

    expect(await screen.findByText('Accept terms screen')).toBeInTheDocument();
    expect(getUserCases).not.toHaveBeenCalled();
    expect(getUserPlaylists).not.toHaveBeenCalled();
  });

  it('loads data and goes to the dashboard otherwise', async () => {
    vi.mocked(login).mockResolvedValue(session());
    renderScreen();

    await logIn();

    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
    expect(getUserCases).toHaveBeenCalledWith('token');
  });
});
