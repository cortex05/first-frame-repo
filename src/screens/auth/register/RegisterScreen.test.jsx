import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterScreen from './RegisterScreen';
import { register } from '../../../api/auth';
import useAuthStore from '../../../store/useAuthStore';

vi.mock('../../../api/auth', () => ({ register: vi.fn() }));
vi.mock('../../../api/playlist', () => ({ getUserPlaylists: vi.fn(async () => []) }));
vi.mock('../../../api/case', () => ({ getUserCases: vi.fn(async () => []) }));

const SESSION = {
  token: 'token',
  userId: 'u-1',
  username: 'founder',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Cortes Law',
  role: 'admin',
  mustChangePassword: false,
};

const renderScreen = () =>
  render(
    <MemoryRouter>
      <RegisterScreen />
    </MemoryRouter>,
  );

const fillForm = async ({ password = 'founder-pass', confirm = password } = {}) => {
  await userEvent.type(screen.getByLabelText('Account Name'), 'Cortes Law');
  await userEvent.type(screen.getByLabelText('Username'), 'founder');
  await userEvent.type(screen.getByLabelText('Email'), 'founder@example.com');
  await userEvent.type(screen.getByLabelText('Password'), password);
  await userEvent.type(screen.getByLabelText('Confirm Password'), confirm);
};

beforeEach(() => {
  vi.mocked(register).mockReset();
  useAuthStore.setState({ userInfo: null });
});

describe('RegisterScreen', () => {
  it('tells the person creating the account that they will be its administrator', () => {
    renderScreen();

    expect(screen.getByText(/You will be the administrator of this account/)).toBeInTheDocument();
  });

  it('sends the account name with the user details and signs the new admin in', async () => {
    vi.mocked(register).mockResolvedValue(SESSION);
    renderScreen();

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(useAuthStore.getState().userInfo?.accountId).toBe('acc-1'));
    expect(register).toHaveBeenCalledWith({
      accountName: 'Cortes Law',
      username: 'founder',
      email: 'founder@example.com',
      password: 'founder-pass',
    });
  });

  it('refuses a short password before calling the API', async () => {
    renderScreen();

    await fillForm({ password: 'short' });
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('shows the server message when the email is taken', async () => {
    vi.mocked(register).mockRejectedValue({
      response: { data: { message: 'Email or username already in use' } },
    });
    renderScreen();

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Email or username already in use')).toBeInTheDocument();
  });
});
