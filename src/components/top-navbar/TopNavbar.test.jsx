import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import TopNavbar from './TopNavbar';
import useAuthStore from '../../store/useAuthStore';

beforeEach(() => {
  useAuthStore.setState({
    userInfo: {
      token: 'token',
      userId: 'u-1',
      username: 'someone',
      accountId: 'acc-1',
      accountName: 'Firm',
      role: 'member',
      isAdmin: false,
      mustChangePassword: false,
    },
  });
});

describe('TopNavbar log out warning (spec 012)', () => {
  it('closes on Escape without logging out, and returns focus to Log out', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <TopNavbar />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByRole('dialog', { name: 'Are you sure?' })).toHaveFocus();

    await user.keyboard('{Escape}');
    await act(async () => {});

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(useAuthStore.getState().userInfo).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Log out' })).toHaveFocus();
  });
});
