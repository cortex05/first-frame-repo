import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardScreen from './DashboardScreen';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/playlist', () => ({ getPlaylistById: vi.fn() }));

const seedSession = (role) => {
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-1',
      username: 'someone',
      accountId: 'acc-1',
      accountName: 'Firm',
      role,
      isAdmin: false,
      mustChangePassword: false,
    },
    playlists: [],
    fetchUserPlaylists: vi.fn(),
  });
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>,
  );

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark';
  useCaseStore.setState({ cases: [], fetchUserCases: vi.fn() });
});

describe('DashboardScreen theme toggle', () => {
  it.each(['member', 'admin'])('is shown to a %s', (role) => {
    seedSession(role);
    renderDashboard();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
