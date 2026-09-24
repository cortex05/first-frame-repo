import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AppRoutes from './AppRoutes';
import useAuthStore from './store/useAuthStore';

// Stand-ins for every screen: the guards are what is under test, and the real
// screens would fetch data and draw Konva canvases.
// vi.hoisted: vi.mock calls are moved above everything else, helpers included.
const { stub } = vi.hoisted(() => ({
  stub: (name) => ({ default: () => <p>{name} screen</p> }),
}));
vi.mock('./screens/home/HomeScreen', () => stub('Home'));
vi.mock('./screens/start/StartScreen', () => stub('Start'));
vi.mock('./screens/create-case/CreateCaseScreen', () => stub('Create case'));
vi.mock('./screens/case/CaseScreen', () => stub('Case'));
vi.mock('./screens/questions/QuestionsScreen', () => stub('Questions'));
vi.mock('./screens/make-playlist/MakePlaylistScreen', () => stub('Make playlist'));
vi.mock('./screens/recommended/RecommendedScreen', () => stub('Recommended'));
vi.mock('./screens/create-recommended/CreateRecommendedScreen', () => stub('Create recommended'));
vi.mock('./screens/edit-recommended/EditRecommendedScreen', () => stub('Edit recommended'));
vi.mock('./screens/auth/login/LoginScreen', () => stub('Login'));
vi.mock('./screens/auth/register/RegisterScreen', () => stub('Register'));
vi.mock('./screens/auth/change-password/ChangePasswordScreen', () => stub('Change password'));
vi.mock('./screens/account/AccountScreen', () => stub('Account'));
vi.mock('./screens/archive/ArchiveScreen', () => stub('Archive'));
vi.mock('./screens/archive/ArchivedCaseScreen', () => stub('Archived case'));

const session = (overrides = {}) => ({
  token: 'token',
  userId: 'u-1',
  username: 'daniel',
  isAdmin: false,
  accountId: 'acc-1',
  accountName: 'Firm',
  role: 'member',
  mustChangePassword: false,
  ...overrides,
});

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

beforeEach(() => {
  useAuthStore.setState({ userInfo: null });
});

describe('AppRoutes guards', () => {
  it('sends a signed-out visitor to login', () => {
    renderAt('/archive');

    expect(screen.getByText('Login screen')).toBeInTheDocument();
  });

  it('keeps members out of account administration and case creation', () => {
    useAuthStore.setState({ userInfo: session() });

    renderAt('/account');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });

  it('keeps members out of case creation', () => {
    useAuthStore.setState({ userInfo: session() });

    renderAt('/create-case');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });

  it('lets an account admin into account administration and case creation', () => {
    useAuthStore.setState({ userInfo: session({ role: 'admin' }) });

    renderAt('/create-case');
    expect(screen.getByText('Create case screen')).toBeInTheDocument();
  });

  it('lets every signed-in user see the archive', () => {
    useAuthStore.setState({ userInfo: session() });

    renderAt('/archive/abc');
    expect(screen.getByText('Archived case screen')).toBeInTheDocument();
  });

  it('holds a user with a temporary password on the change-password page', () => {
    useAuthStore.setState({ userInfo: session({ mustChangePassword: true }) });

    renderAt('/home');
    expect(screen.getByText('Change password screen')).toBeInTheDocument();
  });

  it('keeps an account admin who is not a platform admin out of Recommended', () => {
    useAuthStore.setState({ userInfo: session({ role: 'admin', isAdmin: false }) });

    renderAt('/recommended');
    expect(screen.getByText('Home screen')).toBeInTheDocument();
  });

  it('lets a platform admin into Recommended whatever their account role', () => {
    useAuthStore.setState({ userInfo: session({ role: 'member', isAdmin: true }) });

    renderAt('/recommended');
    expect(screen.getByText('Recommended screen')).toBeInTheDocument();
  });
});
