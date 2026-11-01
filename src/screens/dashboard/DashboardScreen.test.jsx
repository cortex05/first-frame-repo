import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DashboardScreen from './DashboardScreen';
import { deletePlaylist, getPlaylistById } from '../../api/playlist';
import { __resetPageTitleForTests } from '../../hooks/usePageTitle';
import useAuthStore from '../../store/useAuthStore';
import useCaseStore from '../../store/useCaseStore';

vi.mock('../../api/playlist', () => ({ getPlaylistById: vi.fn(), deletePlaylist: vi.fn() }));

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

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardScreen />
    </MemoryRouter>,
  );

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark';
  useCaseStore.setState({ cases: [], fetchUserCases: vi.fn() });
});

describe('DashboardScreen theme toggle', () => {
  it.each(['member', 'admin'])('is shown to a %s', (role) => {
    seedSession(role);
    renderDashboard();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });
});

describe('DashboardScreen keyboard access (spec 011)', () => {
  const CASES = [
    { _id: 'case-1', clientName: 'Jane Client', attorney: 'Alex Attorney' },
    { _id: 'case-2', clientName: 'John Client', attorney: 'Sam Attorney' },
  ];

  const renderWithRoutes = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/case/:id" element={<p>case page</p>} />
        </Routes>
      </MemoryRouter>,
    );

  // Tabs forward until `element` has focus.
  const tabTo = async (user, element) => {
    for (let i = 0; i < 30 && document.activeElement !== element; i += 1) {
      await user.tab();
    }
    expect(element).toHaveFocus();
  };

  it('opens Access Existing Case from the keyboard', async () => {
    seedSession('member');
    const user = userEvent.setup();
    renderWithRoutes();

    await tabTo(user, screen.getByRole('button', { name: 'Access Existing Case' }));
    await user.keyboard('{Enter}');

    expect(screen.getByRole('heading', { name: 'Access Existing Case' })).toBeInTheDocument();
  });

  it('lists cases as buttons and opens one with Space', async () => {
    seedSession('member');
    const setActiveCase = vi.fn();
    useCaseStore.setState({ cases: CASES, setActiveCase });
    const user = userEvent.setup();
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: 'Access Existing Case' }));
    const caseButtons = within(screen.getByRole('list')).getAllByRole('button');
    expect(caseButtons.map((b) => b.textContent)).toEqual([
      'Jane Client by Alex Attorney',
      'John Client by Sam Attorney',
    ]);

    caseButtons[1].focus();
    await user.keyboard(' ');

    expect(setActiveCase).toHaveBeenCalledWith('case-2');
    expect(await screen.findByText('case page')).toBeInTheDocument();
  });

  it('shows the empty state instead of a list when there are no cases', async () => {
    seedSession('member');
    const user = userEvent.setup();
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: 'Access Existing Case' }));

    expect(screen.getByText('No cases have been assigned to you yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('fetches a playlist once and marks the list busy while it loads', async () => {
    seedSession('member');
    useAuthStore.setState({ playlists: [{ _id: 'p-1', title: 'Mine' }] });
    vi.mocked(getPlaylistById).mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderWithRoutes();

    await user.click(screen.getByRole('button', { name: 'Personal Playlists' }));
    const playlist = screen.getByRole('button', { name: 'Mine' });
    playlist.focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{Enter}');

    expect(getPlaylistById).toHaveBeenCalledTimes(1);
    expect(playlist).toHaveAttribute('aria-disabled', 'true');
    expect(playlist).toHaveFocus();
  });
});

describe('DashboardScreen title, focus and notice (spec 016)', () => {
  // Arriving as the second history entry is what in-app navigation looks like.
  const renderArrived = (state) =>
    render(
      <MemoryRouter
        initialEntries={['/case/case-1', { pathname: '/dashboard', state }]}
        initialIndex={1}
      >
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
        </Routes>
      </MemoryRouter>,
    );

  beforeEach(() => {
    __resetPageTitleForTests();
  });

  it('names the tab and focuses its heading after navigating here', () => {
    seedSession('member');
    renderArrived();

    expect(document.title).toBe('Dashboard – First Frame');
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it('announces a redirect notice as a status message', () => {
    seedSession('member');
    renderArrived({ message: 'You no longer have access to that case.' });

    expect(screen.getByRole('status')).toHaveTextContent('You no longer have access to that case.');
  });
});

describe('DashboardScreen structure (spec 017)', () => {
  it('renders its content in a main landmark, apart from the navbar', () => {
    seedSession('member');
    renderDashboard();

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(main).not.toContainElement(screen.getByRole('banner'));
  });
});

describe('DashboardScreen playlist edit and delete (spec 022)', () => {
  const PLAYLIST = {
    _id: 'p-1',
    title: 'Opening',
    questions: [{ id: 'q-1', text: 'Was there intent?', type: 'TRUE_FALSE', options: [] }],
  };

  const renderWithRoutes = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/edit-playlist/:playlistId" element={<p>edit page</p>} />
        </Routes>
      </MemoryRouter>,
    );

  const openPlaylist = async (user) => {
    await user.click(screen.getByRole('button', { name: 'Personal Playlists' }));
    await user.click(screen.getByRole('button', { name: 'Opening' }));
    await screen.findByText('Was there intent?');
  };

  beforeEach(() => {
    vi.mocked(getPlaylistById).mockReset().mockResolvedValue(PLAYLIST);
    vi.mocked(deletePlaylist).mockReset();
  });

  const seedWithPlaylist = (role) => {
    seedSession(role);
    useAuthStore.setState({ playlists: [{ _id: 'p-1', title: 'Opening' }] });
  };

  it('shows a member the questions without Edit or Delete', async () => {
    seedWithPlaylist('member');
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);

    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('sends an admin to the edit page', async () => {
    seedWithPlaylist('admin');
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByText('edit page')).toBeInTheDocument();
  });

  it('warns before deleting, and Cancel restores the playlist view', async () => {
    seedWithPlaylist('admin');
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Warning' }));
    expect(
      dialog.getByText('This will delete the selected playlist permanently for all users in this account.'),
    ).toBeInTheDocument();
    expect(dialog.getByRole('separator')).toBeInTheDocument();
    expect(dialog.getByText('Do you wish to proceed?')).toBeInTheDocument();

    await user.click(dialog.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog', { name: 'Warning' })).not.toBeInTheDocument();
    expect(await screen.findByText('Was there intent?')).toBeInTheDocument();
    expect(deletePlaylist).not.toHaveBeenCalled();
    expect(getPlaylistById).toHaveBeenCalledTimes(1);
  });

  it('deletes on Confirm, refetches and shows the list again', async () => {
    seedWithPlaylist('admin');
    let resolveDelete;
    vi.mocked(deletePlaylist).mockReturnValue(
      new Promise((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const fetchUserPlaylists = vi.fn();
    useAuthStore.setState({ fetchUserPlaylists });
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);
    // The refetch after the delete returns the list without the playlist.
    fetchUserPlaylists.mockClear().mockImplementation(async () => {
      useAuthStore.setState({ playlists: [] });
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(screen.getByRole('button', { name: 'Deleting...' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    resolveDelete();

    expect(await screen.findByText('No playlists found.')).toBeInTheDocument();
    expect(deletePlaylist).toHaveBeenCalledWith('p-1', 'token');
    expect(fetchUserPlaylists).toHaveBeenCalledWith('token');
    expect(screen.queryByRole('dialog', { name: 'Warning' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Access Playlists' })).toBeInTheDocument();
  });

  it('keeps the warning open with the server message when the delete fails', async () => {
    seedWithPlaylist('admin');
    vi.mocked(deletePlaylist).mockRejectedValue({
      response: { status: 403, data: { message: 'Only an account admin can change a playlist.' } },
    });
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Warning' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Only an account admin can change a playlist.',
    );
    expect(dialog.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });

  it('returns to the refreshed list with a notice on a 404', async () => {
    seedWithPlaylist('admin');
    vi.mocked(deletePlaylist).mockRejectedValue({
      response: { status: 404, data: { message: 'Playlist not found.' } },
    });
    const fetchUserPlaylists = vi.fn();
    useAuthStore.setState({ fetchUserPlaylists });
    const user = userEvent.setup();
    renderWithRoutes();

    await openPlaylist(user);
    fetchUserPlaylists.mockClear();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await user.click(screen.getByRole('button', { name: 'Confirm' }));

    const list = within(await screen.findByRole('dialog', { name: 'Access Playlists' }));
    expect(list.getByRole('status')).toHaveTextContent('Playlist not found.');
    expect(fetchUserPlaylists).toHaveBeenCalledWith('token');
  });
});
