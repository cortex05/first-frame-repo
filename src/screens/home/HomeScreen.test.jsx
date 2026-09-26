import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomeScreen from './HomeScreen';
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

const renderHome = () =>
  render(
    <MemoryRouter>
      <HomeScreen />
    </MemoryRouter>,
  );

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark';
  useCaseStore.setState({ cases: [], fetchUserCases: vi.fn() });
});

describe('HomeScreen theme toggle', () => {
  it.each(['member', 'admin'])('is shown to a %s', (role) => {
    seedSession(role);
    renderHome();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});
