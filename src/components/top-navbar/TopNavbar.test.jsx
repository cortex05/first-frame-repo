import { act, render, screen, within } from '@testing-library/react';
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

describe('TopNavbar landmarks (spec 017)', () => {
  it('puts the links in a Main navigation, and the greeting outside it', () => {
    render(
      <MemoryRouter>
        <TopNavbar />
      </MemoryRouter>,
    );

    const nav = within(screen.getByRole('navigation', { name: 'Main' }));
    expect(nav.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(nav.getByRole('link', { name: 'Archive' })).toBeInTheDocument();
    expect(nav.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).not.toHaveTextContent('Firm- someone');
    expect(screen.getByRole('banner')).toHaveTextContent('Firm- someone');
  });
});

describe('TopNavbar Home link destination', () => {
  it('points authenticated users to the dashboard', () => {
    render(
      <MemoryRouter>
        <TopNavbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/dashboard');
  });

  it('points logged-out users to the landing page', () => {
    useAuthStore.setState({ userInfo: null });

    render(
      <MemoryRouter>
        <TopNavbar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  });
});
