import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

describe('TopNavbar unsaved-changes warning (spec 022)', () => {
  const renderWarning = (props) =>
    render(
      <MemoryRouter initialEntries={['/edit']}>
        <Routes>
          <Route path="/edit" element={<TopNavbar warnOnHomeNavigation {...props} />} />
          <Route path="/dashboard" element={<p>dashboard page</p>} />
        </Routes>
      </MemoryRouter>,
    );

  it('shows the custom text, and Proceed navigates', async () => {
    const user = userEvent.setup();
    renderWarning({ navigationWarning: 'Unsaved changes will be lost. Do you wish to proceed?' });

    await user.click(screen.getByRole('link', { name: 'Home' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Leave This Page?' }));
    expect(dialog.getByText('Unsaved changes will be lost. Do you wish to proceed?')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Proceed' }));

    expect(await screen.findByText('dashboard page')).toBeInTheDocument();
  });

  it('stays on the page when Cancel is pressed', async () => {
    const user = userEvent.setup();
    renderWarning({ navigationWarning: 'Unsaved changes will be lost. Do you wish to proceed?' });

    await user.click(screen.getByRole('link', { name: 'Archive' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await act(async () => {});

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(screen.queryByText('dashboard page')).not.toBeInTheDocument();
  });

  it('keeps the default text and Confirm label without the prop', async () => {
    const user = userEvent.setup();
    renderWarning({});

    await user.click(screen.getByRole('link', { name: 'Home' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Leave This Page?' }));

    expect(dialog.getByText('Navigating away will discard unsaved changes.')).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
