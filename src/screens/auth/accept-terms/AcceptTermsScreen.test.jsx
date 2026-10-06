import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AcceptTermsScreen, { MEMBER_NOTICE } from './AcceptTermsScreen';
import { acceptAgreement, getCurrentAgreement } from '../../../api/agreement';
import useAuthStore from '../../../store/useAuthStore';

vi.mock('../../../api/agreement', () => ({
  getCurrentAgreement: vi.fn(),
  acceptAgreement: vi.fn(),
}));
vi.mock('../../../api/playlist', () => ({ getUserPlaylists: vi.fn(async () => []) }));
vi.mock('../../../api/case', () => ({ getUserCases: vi.fn(async () => []) }));
vi.mock('../../../api/recommended', () => ({ getRecommendedNames: vi.fn(async () => []) }));

const AGREEMENT = { termsVersion: '12-01-2026', agreementText: 'Updated terms.' };
const AGREE = 'I have read and agree to the Terms of Service.';

const session = (overrides = {}) => ({
  token: 'token',
  userId: 'u-1',
  username: 'daniel',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'admin',
  mustChangePassword: false,
  mustAcceptTerms: true,
  ...overrides,
});

const renderScreen = () =>
  render(
    <MemoryRouter initialEntries={['/accept-terms']}>
      <Routes>
        <Route path="/accept-terms" element={<AcceptTermsScreen />} />
        <Route path="/dashboard" element={<p>Dashboard screen</p>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.mocked(getCurrentAgreement).mockReset();
  vi.mocked(acceptAgreement).mockReset();
  vi.mocked(getCurrentAgreement).mockResolvedValue(AGREEMENT);
});

describe('AcceptTermsScreen', () => {
  it('lets an account admin accept the new terms and continue to the dashboard', async () => {
    useAuthStore.getState().setUserInfo(session());
    vi.mocked(acceptAgreement).mockResolvedValue(session({ mustAcceptTerms: false }));
    renderScreen();

    expect(await screen.findByText('Agreement: 12-01-2026')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText(AGREE));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Dashboard screen')).toBeInTheDocument();
    expect(acceptAgreement).toHaveBeenCalledWith({ termsVersion: '12-01-2026' }, 'token');
    expect(useAuthStore.getState().userInfo.mustAcceptTerms).toBe(false);
  });

  it('logs the admin out from the modal', async () => {
    useAuthStore.getState().setUserInfo(session());
    renderScreen();

    await userEvent.click(await screen.findByRole('button', { name: 'Log out' }));

    expect(useAuthStore.getState().userInfo).toBeNull();
    expect(acceptAgreement).not.toHaveBeenCalled();
  });

  it('shows the server message when accepting fails', async () => {
    useAuthStore.getState().setUserInfo(session());
    vi.mocked(acceptAgreement).mockRejectedValue({ response: { data: { message: 'Nope' } } });
    renderScreen();

    await userEvent.click(await screen.findByLabelText(AGREE));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Nope');
  });

  it('tells a member to wait for an administrator, without fetching the terms', async () => {
    useAuthStore.getState().setUserInfo(session({ role: 'member' }));
    renderScreen();

    expect(screen.getByText(MEMBER_NOTICE)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(getCurrentAgreement).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    await waitFor(() => expect(useAuthStore.getState().userInfo).toBeNull());
  });
});
