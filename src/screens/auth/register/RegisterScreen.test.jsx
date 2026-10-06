import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RegisterScreen from './RegisterScreen';
import { register } from '../../../api/auth';
import { getCurrentAgreement } from '../../../api/agreement';
import useAuthStore from '../../../store/useAuthStore';

vi.mock('../../../api/auth', () => ({ register: vi.fn() }));
vi.mock('../../../api/agreement', () => ({ getCurrentAgreement: vi.fn() }));
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
  mustAcceptTerms: false,
};

const AGREEMENT = { termsVersion: '11-20-2026', agreementText: 'Be nice. Pay on time.' };
const AGREE = 'I have read and agree to the Terms of Service.';

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

// Fills the form, clicks Create Account and waits for the terms.
const openTerms = async (options) => {
  await fillForm(options);
  await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  await screen.findByRole('dialog');
};

const acceptTerms = async () => {
  await userEvent.click(screen.getByLabelText(AGREE));
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
};

beforeEach(() => {
  vi.mocked(register).mockReset();
  vi.mocked(getCurrentAgreement).mockReset();
  vi.mocked(getCurrentAgreement).mockResolvedValue(AGREEMENT);
  useAuthStore.setState({ userInfo: null });
});

describe('RegisterScreen', () => {
  it('tells the person creating the account that they will be its administrator', () => {
    renderScreen();

    expect(screen.getByText(/You will be the administrator of this account/)).toBeInTheDocument();
  });

  it('shows the terms before creating anything', async () => {
    renderScreen();

    await openTerms();

    expect(screen.getByText('Agreement: 11-20-2026')).toBeInTheDocument();
    expect(screen.getByLabelText(AGREE)).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    expect(register).not.toHaveBeenCalled();
  });

  it('sends the account details and the accepted terms version, and signs the new admin in', async () => {
    vi.mocked(register).mockResolvedValue(SESSION);
    renderScreen();

    await openTerms();
    await acceptTerms();

    await waitFor(() => expect(useAuthStore.getState().userInfo?.accountId).toBe('acc-1'));
    expect(register).toHaveBeenCalledWith({
      accountName: 'Cortes Law',
      username: 'founder',
      email: 'founder@example.com',
      password: 'founder-pass',
      termsVersion: '11-20-2026',
    });
  });

  it('goes back to the filled form on Cancel without creating the account', async () => {
    renderScreen();

    await openTerms();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Account Name')).toHaveValue('Cortes Law');
    expect(register).not.toHaveBeenCalled();
  });

  it('shows the new terms, unchecked, when they changed while the modal was open', async () => {
    vi.mocked(register).mockRejectedValue({ response: { data: { code: 'TERMS_OUTDATED' } } });
    vi.mocked(getCurrentAgreement)
      .mockResolvedValueOnce(AGREEMENT)
      .mockResolvedValueOnce({ termsVersion: '12-01-2026', agreementText: 'New terms.' });
    renderScreen();

    await openTerms();
    await acceptTerms();

    expect(await screen.findByText('Agreement: 12-01-2026')).toBeInTheDocument();
    expect(screen.getByText('The terms were just updated. Please review them again.')).toBeInTheDocument();
    expect(screen.getByLabelText(AGREE)).not.toBeChecked();
  });

  it('says so when the terms cannot be loaded', async () => {
    vi.mocked(getCurrentAgreement).mockRejectedValue({ response: { status: 404 } });
    renderScreen();

    await fillForm();
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(
      await screen.findByText('Terms of Service are unavailable right now. Please try again later.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('refuses a short password before calling the API', async () => {
    renderScreen();

    await fillForm({ password: 'short' });
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(getCurrentAgreement).not.toHaveBeenCalled();
    expect(register).not.toHaveBeenCalled();
  });

  it('shows the server message when the email is taken', async () => {
    vi.mocked(register).mockRejectedValue({
      response: { data: { message: 'Email or username already in use' } },
    });
    renderScreen();

    await openTerms();
    await acceptTerms();

    expect(await screen.findByText('Email or username already in use')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
