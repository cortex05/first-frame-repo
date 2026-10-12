import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ChangePasswordScreen from './ChangePasswordScreen';
import { changePassword } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';

vi.mock('../../../api/auth', () => ({ changePassword: vi.fn() }));

const session = (overrides = {}) => ({
  token: 'token',
  userId: 'u-1',
  username: 'daniel',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'member',
  mustChangePassword: false,
  mustAcceptTerms: false,
  ...overrides,
});

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/change-password']}>
      <Routes>
        <Route path="/change-password" element={<ChangePasswordScreen />} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(changePassword).mockReset();
});

describe('ChangePasswordScreen labels (spec 013)', () => {
  it('names its three fields by their labels', () => {
    useAuthStore.getState().setUserInfo(session());
    renderScreen();

    expect(screen.getByLabelText('Current Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('New Password')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Confirm New Password')).toHaveAttribute('type', 'password');
  });

  it('calls the first field Temporary Password when the change is forced', () => {
    useAuthStore.getState().setUserInfo(session({ mustChangePassword: true }));
    renderScreen();

    expect(screen.getByLabelText('Temporary Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current Password')).not.toBeInTheDocument();
  });

  it('submits what was typed into the labelled fields', async () => {
    useAuthStore.getState().setUserInfo(session());
    vi.mocked(changePassword).mockResolvedValue(session());
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText('Current Password'), 'old-secret');
    await user.type(screen.getByLabelText('New Password'), 'new-secret');
    await user.type(screen.getByLabelText('Confirm New Password'), 'new-secret');
    await user.click(screen.getByRole('button', { name: 'Change Password' }));

    expect(changePassword).toHaveBeenCalledWith(
      { currentPassword: 'old-secret', newPassword: 'new-secret' },
      'token',
    );
    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
  });
});
