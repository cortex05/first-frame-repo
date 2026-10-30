import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountScreen from './AccountScreen';
import { getAccountUsers, updateAccountUser } from '../../api/account';
import useAccountStore from '../../store/useAccountStore';
import useAuthStore from '../../store/useAuthStore';

vi.mock('../../api/account', () => ({
  getAccount: vi.fn(async () => ({ _id: 'acc-1', name: 'Firm' })),
  updateAccount: vi.fn(),
  getAccountUsers: vi.fn(),
  createAccountUser: vi.fn(),
  updateAccountUser: vi.fn(),
}));

const session = {
  token: 'token',
  userId: 'u-admin',
  username: 'me',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'admin',
  mustChangePassword: false,
  mustAcceptTerms: false,
};

const user = (id, username, role) => ({
  _id: id,
  username,
  email: `${username}@example.com`,
  role,
  status: 'active',
  mustChangePassword: false,
});

const SELF = user('u-admin', 'me', 'admin');
const OTHER_ADMIN = user('u-2', 'colleague', 'admin');
const MEMBER = user('u-3', 'associate', 'member');

const LAST_ADMIN_MESSAGE =
  'An account must keep at least one active administrator who has finished setting up their password';

const renderAccount = async () => {
  render(
    <MemoryRouter initialEntries={['/account']}>
      <Routes>
        <Route path="/account" element={<AccountScreen />} />
        <Route path="/dashboard" element={<p>Dashboard</p>} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByText('colleague');
};

const rowOf = (username) =>
  screen.getByRole('combobox', { name: `Role for ${username}` }).closest('li');

const chooseOwnRole = (role) =>
  userEvent.selectOptions(screen.getByRole('combobox', { name: 'Role for me' }), role);

beforeEach(() => {
  vi.mocked(updateAccountUser).mockReset();
  vi.mocked(getAccountUsers).mockResolvedValue([SELF, OTHER_ADMIN, MEMBER]);
  useAuthStore.setState({ userInfo: session });
  useAccountStore.getState().reset();
});

describe('AccountScreen admin handoff', () => {
  it('asks before you give up your own admin role, without saving', async () => {
    await renderAccount();
    await chooseOwnRole('member');

    expect(screen.getByRole('dialog', { name: 'Give up admin access?' })).toBeInTheDocument();
    expect(updateAccountUser).not.toHaveBeenCalled();
  });

  it('keeps you an admin when you cancel', async () => {
    await renderAccount();
    await chooseOwnRole('member');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateAccountUser).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: 'Role for me' })).toHaveValue('admin');
  });

  it('demotes you and leaves the page when you confirm', async () => {
    vi.mocked(updateAccountUser).mockResolvedValue({ ...SELF, role: 'member' });
    await renderAccount();
    await chooseOwnRole('member');
    await userEvent.click(screen.getByRole('button', { name: 'Make me a member' }));

    expect(updateAccountUser).toHaveBeenCalledWith('u-admin', { role: 'member' }, 'token');
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    expect(useAuthStore.getState().userInfo.role).toBe('member');
  });

  it('shows the refusal on your row and keeps you here when the server says no', async () => {
    vi.mocked(updateAccountUser).mockRejectedValue({
      response: { status: 409, data: { message: LAST_ADMIN_MESSAGE, code: 'LAST_ACCOUNT_ADMIN' } },
    });
    await renderAccount();
    await chooseOwnRole('member');
    await userEvent.click(screen.getByRole('button', { name: 'Make me a member' }));

    expect(await within(rowOf('me')).findByRole('alert')).toHaveTextContent(LAST_ADMIN_MESSAGE);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
    expect(useAuthStore.getState().userInfo.role).toBe('admin');
  });

  it("saves another user's role right away", async () => {
    vi.mocked(updateAccountUser).mockResolvedValue({ ...OTHER_ADMIN, role: 'member' });
    await renderAccount();
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Role for colleague' }), 'member');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(updateAccountUser).toHaveBeenCalledWith('u-2', { role: 'member' }, 'token');
  });

  it('offers Disable on other rows but not your own', async () => {
    await renderAccount();

    expect(within(rowOf('me')).queryByRole('button', { name: 'Disable' })).not.toBeInTheDocument();
    expect(within(rowOf('colleague')).getByRole('button', { name: 'Disable' })).toBeInTheDocument();
    expect(within(rowOf('associate')).getByRole('button', { name: 'Disable' })).toBeInTheDocument();
  });

  it('explains how to hand the account over', async () => {
    await renderAccount();

    expect(
      screen.getByText(/To hand over the account, make another user an Admin\./),
    ).toBeInTheDocument();
  });
});
